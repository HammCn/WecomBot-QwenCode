import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import AiBot from '@wecom/aibot-node-sdk';
import { generateReqId } from '@wecom/aibot-node-sdk';
import { spawn } from 'child_process';
import * as z from 'zod';
import 'dotenv/config';


// 企业微信机器人配置（从环境变量读取）
const CONFIG = {
  botId: process.env.WECOM_BOT_ID,
  secret: process.env.WECOM_BOT_SECRET,
  qwen: process.env.QWEN_PATH,
  workspace: process.env.WORKSPACE,
};

// 工作空间缓存
const CACHE_DIR = CONFIG.qwen + "/projects/" + CONFIG.workspace.replaceAll("/.", "--").replaceAll("/", "-")

// ==================== 日志工具封装 ====================

const LOG_EMOJIS = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  debug: '🐛',
  connect: '🔌',
  disconnect: '🔌',
  message: '💬',
  file: '📁',
  server: '🚀',
  session: '🔄',
  auth: '🔐',
  clean: '🧹',
};

/**
 * 格式化日志消息
 */
function formatMessage(emoji, prefix, ...args) {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  return `[${timestamp}] ${emoji} [${prefix}] ${args.join(' ')}`;
}

/**
 * 日志工具对象
 */
const logger = {
  info: (...args) => console.log(formatMessage(LOG_EMOJIS.info, '信息', ...args)),
  success: (...args) => console.log(formatMessage(LOG_EMOJIS.success, '成功', ...args)),
  error: (...args) => console.error(formatMessage(LOG_EMOJIS.error, '错误', ...args)),
  warn: (...args) => console.warn(formatMessage(LOG_EMOJIS.warning, '警告', ...args)),
  debug: (...args) => console.log(formatMessage(LOG_EMOJIS.debug, '调试', ...args)),
  connect: (...args) => console.log(formatMessage(LOG_EMOJIS.connect, '连接', ...args)),
  disconnect: (...args) => console.log(formatMessage(LOG_EMOJIS.disconnect, '断开', ...args)),
  message: (...args) => console.log(formatMessage(LOG_EMOJIS.message, '消息', ...args)),
  file: (...args) => console.log(formatMessage(LOG_EMOJIS.file, '文件', ...args)),
  server: (...args) => console.log(formatMessage(LOG_EMOJIS.server, '服务', ...args)),
  session: (...args) => console.log(formatMessage(LOG_EMOJIS.session, '会话', ...args)),
  auth: (...args) => console.log(formatMessage(LOG_EMOJIS.auth, '认证', ...args)),
  clean: (...args) => console.log(formatMessage(LOG_EMOJIS.clean, '清理', ...args)),
};


// 创建 WS 客户端（用于上传文件和发送消息）
const wsClient = new AiBot.WSClient({
  botId: CONFIG.botId,
  secret: CONFIG.secret,
});

// 连接状态
let isConnected = false;
let currentFrame = null;

// ==================== WebSocket 连接管理 ====================

/**
 * 连接 WebSocket
 */
async function connectWebSocket() {
  if (isConnected) {
    return;
  }

  return new Promise((resolve, reject) => {
    wsClient.connect();

    wsClient.once('authenticated', () => {
      logger.connect('WebSocket 已连接');
      isConnected = true;
      resolve();
    });

    wsClient.once('error', (error) => {
      logger.error('WebSocket 错误:', error.message);
      reject(error);
    });

    setTimeout(() => {
      if (!isConnected) {
        reject(new Error('WebSocket 连接超时'));
      }
    }, 10000);
  });
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ==================== 文件处理业务 ====================

/**
 * 验证文件是否存在且可访问
 */
async function validateFile(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  try {
    await fs.access(absolutePath);
    return { success: true, path: absolutePath };
  } catch (error) {
    logger.error('文件不存在:', error.message);
    return { success: false, error: error.message, path: absolutePath };
  }
}

/**
 * 检查文件大小是否超过限制
 */
function checkFileSize(fileSize, maxSize = 50 * 1024 * 1024) {
  if (fileSize > maxSize) {
    return {
      success: false,
      error: '文件大小超过限制',
      fileSize,
      maxSize,
    };
  }
  return { success: true };
}

/**
 * 上传文件到企业微信
 */
async function uploadFileToWecom(fileBuffer, fileName) {
  try {
    const result = await wsClient.uploadMedia(fileBuffer, {
      type: 'file',
      filename: fileName,
    });
    logger.success('文件上传成功:', fileName);
    return { success: true, mediaId: result.media_id };
  } catch (error) {
    logger.error('文件上传失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 发送文件消息到当前会话
 */
async function sendFileMessage(mediaId) {
  if (!currentFrame) {
    logger.warn('无活跃会话');
    return {
      success: false,
      error: '无活跃会话',
      message: '当前没有活跃的会话上下文，无法发送文件消息',
    };
  }

  try {
    await wsClient.replyMedia(currentFrame, 'file', mediaId);
    logger.success('文件已发送');
    return { success: true };
  } catch (error) {
    logger.error('文件发送失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 处理文件发送的完整流程
 */
async function handleSendFile(filePath) {
  logger.file('处理文件发送:', filePath);

  // 1. 验证文件
  const validation = await validateFile(filePath);
  if (!validation.success) {
    return {
      success: false,
      message: '文件不存在或无法访问',
      filePath: validation.path,
      error: validation.error,
    };
  }

  // 2. 获取文件信息
  const stats = await fs.stat(validation.path);
  const fileName = path.basename(validation.path);
  const ext = path.extname(validation.path).toLowerCase();

  // 3. 检查文件大小
  const sizeCheck = checkFileSize(stats.size);
  if (!sizeCheck.success) {
    return {
      success: false,
      message: sizeCheck.error,
      fileSize: stats.size,
      maxFileSize: sizeCheck.maxSize,
    };
  }

  // 4. 读取文件
  const fileBuffer = await fs.readFile(validation.path);

  // 5. 连接 WebSocket
  try {
    await connectWebSocket();
  } catch (error) {
    logger.error('WebSocket 连接失败:', error.message);
    return {
      success: false,
      message: 'WebSocket 连接失败',
      error: error.message,
    };
  }

  // 6. 上传文件
  const uploadResult = await uploadFileToWecom(fileBuffer, fileName);
  if (!uploadResult.success) {
    return {
      success: false,
      message: '文件上传失败',
      error: uploadResult.error,
    };
  }

  // 7. 发送文件
  const sendResult = await sendFileMessage(uploadResult.mediaId);
  if (!sendResult.success) {
    return {
      success: false,
      message: sendResult.message,
      error: sendResult.error,
    };
  }

  return {
    success: true,
    message: '文件上传并发送成功',
    data: {
      fileName,
      filePath: validation.path,
      fileSize: stats.size,
      fileType: ext,
    },
  };
}

// ==================== MCP Server 管理 ====================

const transports = {};

/**
 * 创建 MCP Server 实例
 */
function createMcpServer() {
  const server = new McpServer(
    {
      name: 'wecom-bot-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool(
    'sendFileToWecomBot',
    {
      description: '发送文件到，支持各种文件类型。当用户说把文件发给他的时候，会自动调用此工具。',
      inputSchema: {
        path: z.string().describe('要发送的文件路径（绝对路径或相对路径）'),
      },
    },
    async ({ path: filePath }) => {
      try {
        const result = await handleSendFile(filePath);

        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        logger.error('工具调用失败:', error);
        throw error;
      }
    },
  );

  return server;
}

/**
 * 创建新的会话传输
 */
function createSessionTransport() {
  const mcpServer = createMcpServer();
  const sessionId = randomUUID();

  const transportInstance = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    onsessioninitialized: (sid) => {
      logger.session('新建:', sid);
      transports[sid] = {
        transport: transportInstance,
        server: mcpServer,
      };
    },
  });

  transportInstance.onclose = () => {
    const sid = transportInstance.sessionId;
    if (sid && transports[sid]) {
      closeSession(sid);
    }
  };

  mcpServer.connect(transportInstance);
  logger.connect('MCP 连接已建立');

  return { transport: transportInstance, server: mcpServer, sessionId };
}

/**
 * 关闭指定会话
 */
function closeSession(sessionId) {
  if (!transports[sessionId]) return;

  logger.session('关闭:', sessionId);
  const { server, transport } = transports[sessionId];

  // 先删除引用，防止 onclose 回调再次调用 closeSession 导致递归
  delete transports[sessionId];

  // 移除 onclose 回调，避免递归调用
  transport.onclose = null;

  server.close().catch((err) => {
    logger.error('关闭 server 失败:', sessionId, err);
  });
}

/**
 * 关闭所有会话
 */
async function closeAllSessions() {
  const sessionIds = Object.keys(transports);
  if (sessionIds.length === 0) return;

  logger.server('发现', sessionIds.length, '个活跃会话');

  const closePromises = sessionIds.map(async (sessionId) => {
    try {
      closeSession(sessionId);
    } catch (error) {
      logger.error('关闭会话失败:', sessionId, error);
    }
  });

  await Promise.all(closePromises);
  logger.server('所有会话已关闭');
}

// ==================== HTTP 请求处理 ====================

/**
 * 处理 HTTP 请求
 */
const serverRequestHandler = async (req, res) => {
  let body = '';

  try {
    for await (const chunk of req) {
      body += chunk;
    }

    if (body) {
      try {
        req.body = JSON.parse(body);
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }

    const sessionId = req.headers['mcp-session-id']?.toString();
    let session;

    // 复用已有会话或创建新会话
    if (sessionId && transports[sessionId]) {
      session = transports[sessionId];
    } else {
      session = createSessionTransport();
      res.setHeader('mcp-session-id', session.sessionId);
    }

    await session.transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('请求失败:', error.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error.message || 'Internal server error',
          },
          id: null,
        }),
      );
    }
  }
};

// ==================== 消息处理业务 ====================

/**
 * 处理命令消息
 */
async function handleCommandMessage(content, frame, streamId) {
  // 清理命令
  if (content === '/clear') {
    const clearPath = CACHE_DIR;
    try {
      await fs.rmdir(clearPath, { recursive: true });
      logger.clean('已完成:', clearPath);
      wsClient.replyStream(frame, streamId, `会话重开啦`, true);
    } catch (error) {
      logger.error('清理失败:', error);
      wsClient.replyStream(frame, streamId, `清理失败：${error.message}`, true);
    }
    return true;
  }
  return false;
}

/**
 * 处理 Qwen 命令执行
 */
function executeQwenCommand(content, frame, streamId) {
  let responseText = '';

  const child = spawn(
    'sh',
    ['-c', `cd ${CONFIG.workspace} && qwen --continue -y -p "$1"`, '_', content],
    {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    responseText += text;
    wsClient.replyStream(frame, streamId, `${text}`, false);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    wsClient.replyStream(frame, streamId, `执行错误：${text}`, true);
  });

  child.on('close', () => {
    wsClient.replyStream(frame, streamId, responseText, true);
  });
}

/**
 * 处理文本消息
 */
async function handleTextMessage(frame) {
  const content = frame.body.text?.content;
  logger.message('收到文本:', content);

  currentFrame = frame;

  const streamId = generateReqId('stream');
  wsClient.replyStream(frame, streamId, '<think></think>', false);

  // 优先处理命令
  const isCommand = await handleCommandMessage(content, frame, streamId);
  if (isCommand) return;

  // 执行 Qwen 命令
  executeQwenCommand(content, frame, streamId);
}

/**
 * 处理进入聊天事件
 */
function handleEnterChat(frame) {
  currentFrame = frame;

  wsClient.replyWelcome(frame, {
    msgtype: 'text',
    text: { content: '你好，我是 Mac 智能助手，有什么可以帮你的吗？' },
  });
}

// ==================== 服务关闭管理 ====================

/**
 * 优雅关闭服务
 */
async function gracefulShutdown() {
  logger.info('正在关闭...');

  try {
    // 1. 关闭所有会话
    await closeAllSessions();

    // 2. 断开 WebSocket
    if (wsClient) {
      logger.disconnect('断开 WebSocket...');
      await wsClient.disconnect();
    }

    // 3. 关闭 HTTP 服务器
    httpServer.close(() => {
      logger.server('已关闭');
      process.exit(0);
    });

    // 4. 超时强制退出
    setTimeout(() => {
      logger.server('强制退出');
      process.exit(0);
    }, 5000);
  } catch (error) {
    logger.error('关闭失败:', error);
    process.exit(1);
  }
}

// ==================== 服务启动 ====================

const httpServer = http.createServer(serverRequestHandler);
const PORT = 12580;

httpServer.listen(PORT, async () => {
  logger.server('已启动');
  logger.server('端口:', PORT);

  try {
    await connectWebSocket();
    logger.success('WebSocket 已就绪');
  } catch (error) {
    logger.info('WebSocket 将在首次使用时连接');
  }
});

// ==================== 事件监听 ====================

wsClient.on('authenticated', () => {
  logger.auth('成功');
});

wsClient.on('message.text', handleTextMessage);

wsClient.on('event.enter_chat', handleEnterChat);

// 优雅关闭
process.on('SIGINT', gracefulShutdown);
