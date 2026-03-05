# Yuque MCP Server 语雀个人助手

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Supported-green.svg)](https://modelcontextprotocol.io/)

这是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的语雀服务代理，旨在让具备 MCP Client 能力的大型语言模型（如 Claude Desktop、Cursor、Cline、Windsurf 等）能够无缝读取、检索和管理您的 [语雀 (Yuque)](https://www.yuque.com/) 知识库内容。

## 🌟 核心功能

通过将本服务挂载到您的 AI 助手上，AI 即可免密直接访问您的语雀进行以下操作：
- **空间感知与跨域路由 (`list_yuque_spaces`, `switch_yuque_space`)**: 漫游并切换您加入的组织或团队子命名空间 (Subdomains)，支持无缝读取团队文档。
- **知识库探索 (`list_yuque_repos`)**: 获取您当前上下文空间下的所有团队与个人知识库目录。
- **文档深度读取 (`read_yuque_doc`)**: 给出 Repo ID 与文章 URL Slug，即可直接获取无干扰的全量 **Markdown 原文**输入给模型，可用于后续的参考理解或重构研判。
- **内容发布 (`create_yuque_note`)**: 在指定的文档库中，根据 AI 生成的内容自动排版并原样发布新文档到您的语雀。

## 📦 环境要求

- Node.js (建议 v18+ )
- 一枚有效的个人语雀 **网页登录 Cookie**

> **关于 YUQUE_COOKIE**:
> - 登录 `www.yuque.com`，按 `F12` 打开开发者工具。
> - 在 Network (网络) 或 Application (存储) 面板中找到名为 `Cookie` 的请求头串值。你需要将这段极其长的完整字符串复制下来（里面包含关键的 `x-csrf-token` 所需的 `ctoken` 等鉴权位）。
> - **注意保密**：Cookie 代表您的最高权限，**绝对不要**将其泄露或提交到任何公开仓库中！

## 🚀 部署与使用

### 1. 克隆代码库并编译

在您电脑的任意位置运行以下命令来准备服务端环境：
```bash
git clone https://github.com/oliverzzz66/yuque-mcp-server.git
cd yuque-mcp-server

# 安装依赖
npm install

# 编译 TypeScript 源码到 dist/
npm run build
```

### 2. 挂载到您的 AI 助手 (MCP Clients)

多数支持 MCP 的 IDE 或软件，配置非常相似，只需要在其 JSON 配置项中添加本服务即可。

#### 👉 对于 Claude Desktop
修改 `%APPDATA%\Claude\claude_desktop_config.json` (Windows) 或 `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)。把大括号内的内容合入：

```json
{
  "mcpServers": {
    "yuque-assistant": {
      "command": "node",
      "args": [
        "E:/绝对路径/您的存放位置/yuque-mcp-server/dist/index.js"
      ],
      "env": {
        "YUQUE_COOKIE": "复制的大段Cookie字符串粘贴在此"
      }
    }
  }
}
```

#### 👉 对于 Cursor / Windsurf
1. 进入软件的 Settings (设置) 面板，搜索或定位到 **MCP** 选项卡。
2. 点击 **+ Add New MCP Server**。
3. **Name**: `yuque-assistant`
4. **Type**: 选择 `command`
5. **Command**: 输入 `node E:/绝对路径/.../dist/index.js` (请按自身情况替换具体路径)
6. 添加一个环境变量，**Key** 为 `YUQUE_COOKIE`，**Value** 为刚才取到的长 Cookie 字符串。
7. 保存并刷新状态，看到绿灯亮起即刻享用！

---

## 🛠 开发协议

*本项目脱胎于完全开源的基于 SpecKit 开发法和 Antigravity 助手的实践。去除了所有的中间产物状态追踪文件，仅保留了标准的 Node.js 源码部分，任何人都可以基于此进行二次开发和补充更多的工具接入。*

如果有 BUG 或更多工具诉求，欢迎 PR。
