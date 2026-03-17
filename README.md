# WecomBot-QwenCode

<div align="center">

**企业微信机器人 × QwenCode 智能助手**

基于 MCP (Model Context Protocol) 协议的企业微信机器人服务器，实现通过企业微信与 QwenCode 智能助手交互。

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.27.1-blue.svg)](https://github.com/modelcontextprotocol)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📖 项目简介

本项目是一个基于 **MCP (Model Context Protocol)** 协议的企业微信机器人 MCP 服务器。它允许用户通过企业微信客户端与 QwenCode 智能助手进行交互，支持文本对话、文件传输、命令执行等功能。

### 核心特性

- 🚀 **MCP 协议支持** - 基于官方 MCP SDK，标准化的模型上下文协议实现
- 💬 **实时消息处理** - WebSocket 连接，支持流式响应
- 📁 **文件传输能力** - 支持多种文件格式的上传和发送
- 🔧 **命令执行** - 可直接执行 Qwen 命令，实现智能代码辅助
- 🛡️ **优雅关闭** - 完善的会话管理和资源清理机制
- 📊 **日志系统** - 结构化的日志输出，便于调试和监控

---


## 📦 技术栈

| 类别             | 技术                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| **运行时**       | Node.js 20.x (ES Modules)                                                    |
| **MCP 框架**     | [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol)         |
| **企业微信 SDK** | [@wecom/aibot-node-sdk](https://www.npmjs.com/package/@wecom/aibot-node-sdk) |
| **Web 框架**     | Express 5.x                                                                  |
| **配置管理**     | dotenv                                                                       |
| **数据验证**     | Zod                                                                          |
| **跨域处理**     | CORS                                                                         |

---

## 🔧 安装步骤

### 1. 环境要求

- Node.js >= 20.x
- npm >= 10.x
- 企业微信机器人配置（Bot ID 和 Secret）

### 2. 克隆项目

```bash
git clone <repository-url>
cd WecomBot-QwenCode
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

复制环境变量配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```bash
# 企业微信机器人 ID
WECOM_BOT_ID=your_bot_id

# 企业微信机器人密钥
WECOM_BOT_SECRET=your_bot_secret

# Qwen 配置文件夹路径
QWEN_PATH=/Users/hamm/.qwen

# 工作目录（Qwen 执行命令的工作空间）
WORKSPACE=/Users/hamm/Desktop
```

---

## 🚀 运行方式

### 开发模式（支持热重载）

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

启动成功后，服务将监听在 **`http://localhost:12580`**

---

## 🛠️ 功能说明

### 1. 消息处理

| 功能         | 描述                               |
| ------------ | ---------------------------------- |
| **文本消息** | 接收用户文本，转发给 QwenCode 处理 |
| **流式响应** | 支持实时流式输出，提升用户体验     |
| **命令消息** | 支持 `/clear` 等内置命令           |

### 2. 文件传输

调用 `sendFileToWecomBot` 工具发送文件：

- 支持任意文件格式
- 文件大小限制：50MB
- 自动验证文件存在性
- 完整的错误处理机制

### 3. 会话管理

- 基于 UUID 的会话标识
- 自动复用已有会话
- 优雅关闭时会话清理

---

## 📋 API 接口

### MCP Endpoint

**URL:** `http://localhost:12580`

**方法:** `POST`

**Headers:**
```
Content-Type: application/json
mcp-session-id: <session_id>  // 可选，用于复用会话
```

**请求体:** JSON-RPC 2.0 格式

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "sendFileToWecomBot",
    "arguments": {
      "path": "/path/to/file.txt"
    }
  },
  "id": 1
}
```

---

## 🔍 日志系统

项目内置了结构化的日志系统，支持多种日志类型：

| 类型      | Emoji | 说明     |
| --------- | ----- | -------- |
| `info`    | ℹ️     | 一般信息 |
| `success` | ✅     | 成功操作 |
| `error`   | ❌     | 错误信息 |
| `warning` | ⚠️     | 警告信息 |
| `debug`   | 🐛     | 调试信息 |
| `connect` | 🔌     | 连接事件 |
| `message` | 💬     | 消息事件 |
| `file`    | 📁     | 文件操作 |
| `session` | 🔄     | 会话事件 |

**日志输出示例:**
```
[14:30:25] 🚀 [服务] 已启动
[14:30:25] 🔌 [连接] WebSocket 已连接
[14:30:30] 💬 [消息] 收到文本：你好
```

---

## ⚙️ 配置说明

### 环境变量

| 变量名             | 必填 | 说明                | 示例                  |
| ------------------ | ---- | ------------------- | --------------------- |
| `WECOM_BOT_ID`     | ✅    | 企业微信机器人 ID   | `ww1234567890`        |
| `WECOM_BOT_SECRET` | ✅    | 企业微信机器人密钥  | `abcdef123456`        |
| `QWEN_PATH`        | ✅    | Qwen 配置文件夹路径 | `/Users/hamm/.qwen`   |
| `WORKSPACE`        | ✅    | Qwen 工作目录       | `/Users/hamm/Desktop` |

### 端口配置

默认监听端口：**12580**

如需修改，请编辑 `wecom-bot.js` 中的 `PORT` 常量。

---

## 🔐 安全建议

1. **保护环境变量**: 不要将 `.env` 文件提交到版本控制
2. **限制访问**: 建议在生产环境配置防火墙规则
3. **定期更新**: 及时更新依赖包以修复安全漏洞
4. **日志审计**: 定期检查日志文件，监控异常行为

---

## 🐛 故障排查

### WebSocket 连接失败

```
错误：WebSocket 连接超时
```

**解决方案:**
- 检查 `WECOM_BOT_ID` 和 `WECOM_BOT_SECRET` 是否正确
- 确认网络连接正常
- 检查企业微信机器人配置

### 文件发送失败

```
错误：文件不存在或无法访问
```

**解决方案:**
- 确认文件路径正确（支持绝对路径和相对路径）
- 检查文件权限
- 确认文件大小不超过 50MB 限制

### MCP 会话错误

```
错误：无活跃会话
```

**解决方案:**
- 重启服务
- 清除浏览器缓存
- 检查客户端 MCP 配置

---

## 📝 开发指南

### 添加新工具

在 `createMcpServer()` 函数中注册新工具：

```javascript
server.registerTool(
  'yourToolName',
  {
    description: '工具描述',
    inputSchema: {
      // Zod schema 定义
    },
  },
  async (args) => {
    // 工具实现
    return {
      content: [{ type: 'text', text: '结果' }],
    };
  },
);
```

### 扩展消息处理

添加新的事件处理器：

```javascript
wsClient.on('event.your_event', (frame) => {
  // 事件处理逻辑
});
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 开源协议

MIT License

---

## 👨‍💻 维护者

**Hamm**

---

## 🔗 相关链接

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [企业微信机器人 SDK](https://www.npmjs.com/package/@wecom/aibot-node-sdk)
- [QwenCode 项目](https://github.com/anthropics/qwen)

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star 支持！**

</div>
