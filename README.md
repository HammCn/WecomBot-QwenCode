# WecomBot-QwenCode


基于 MCP (Model Context Protocol) 协议的企业微信机器人服务器，实现通过企业微信与 QwenCode 智能助手交互。

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.27.1-blue.svg)](https://github.com/modelcontextprotocol)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


---

## New!

基于微信 BOT 的方案已开源，https://github.com/HammCn/weixin-bot-qwen-mcp

---

## 📖 项目简介

本项目是一个基于 **MCP (Model Context Protocol)** 协议的企业微信机器人 MCP 服务器。它允许用户通过企业微信客户端与 QwenCode 智能助手进行交互，支持文本对话、文件传输、命令执行等功能。


## 📦 技术栈

| 类别             | 技术                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| **运行时**       | Node.js 20.x (ES Modules)                                                    |
| **MCP 框架**     | [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol)         |
| **企业微信 SDK** | [@wecom/aibot-node-sdk](https://www.npmjs.com/package/@wecom/aibot-node-sdk) |

---

## 🔧 安装步骤

### 1. 环境要求

- Node.js >= 20.x
- npm >= 10.x
- 企业微信机器人配置（Bot ID 和 Secret）

### 2. 克隆项目

```bash
git clone https://github.com/HammCn/WecomBot-QwenCode.git
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

# MCP 端口
MCP_PORT=12580
```

---

## 🚀 运行方式

推荐使用 `pm2` 守护运行 `pm2 start wecom-bot.js`

启动成功后，服务将监听在 **`http://localhost:12580`**

---

## 🛠️ 功能说明

| 功能         | 描述                               |
| ------------ | ---------------------------------- |
| **文本消息** | 接收用户文本，转发给 QwenCode 处理 |
| **流式响应** | 支持实时流式输出，提升用户体验     |
| **命令消息** | 支持 `/clear` 等内置命令           |


## ⚙️ 配置说明

### 环境变量

| 变量名             | 必填 | 说明                | 示例                  |
| ------------------ | ---- | ------------------- | --------------------- |
| `WECOM_BOT_ID`     | ✅    | 企业微信机器人 ID   | `ww1234567890`        |
| `WECOM_BOT_SECRET` | ✅    | 企业微信机器人密钥  | `abcdef123456`        |
| `QWEN_PATH`        | ✅    | Qwen 配置文件夹路径 | `/Users/hamm/.qwen`   |
| `WORKSPACE`        | ✅    | Qwen 工作目录       | `/Users/hamm/Desktop` |
| `MCP_PORT`         |      | MCP 服务的端口      | 默认 12580            |

### MCP 服务

```json
{
  "mcpServers": {
    "WecomBot-SendFile": {
      "httpUrl": "http://localhost:12580/mcp",
      "description": "通过企业微信发送指定的文件",
      "trust": true
    }
  }
}
```


<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star 支持！**

</div>
