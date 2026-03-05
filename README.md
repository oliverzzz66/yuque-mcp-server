# Yuque MCP Assistant

这是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的语雀服务代理，提供通过网页 Cookie 访问个人知识库能力的助手。

同时，本项目内置了修改版的 **SpecKit (规约编程)** 流程，用来规范后续所有 AI 开发和迭代工作。

## 简介
**Yuque MCP Assistant** 支持：
- 快速查询指定用户的语雀所有的个人 Knowledge Base (`list_yuque_repos`)
- 使用 `POST` 创建并发布带 Markdown 正文结构的文章 (`create_yuque_note`)

## 开发和启动
```bash
npm install
npm run build
```
然后在您的 `mcp.json` 或 AI 工具设置里配置：
```json
{
  "mcpServers": {
    "yuque-assistant": {
      "command": "node",
      "args": ["<你的目录绝对路径>/dist/index.js"],
      "env": {
        "YUQUE_COOKIE": "网页抓取的 Cookie 值"
      }
    }
  }
}
```

---

## 规范化开发流程 (SpecKit 10 步法)

本项目配备了一套 AI 开发 Workflow（存放于 `.agents/workflows/`）。在 IDE 内（如 Windsurf / Antigravity / Cursor）使用 `/` 唤起以下命令来进行结构化的新功能开发。

### 核心 10 步

| 命令 | 步骤 | 说明 | 产出物归档 |
|------|------|------|----------|
| `/speckit.demand` | ① | 需求分析 | `docs/demand/` |
| `/speckit.product` | ② | 产品设计 | `docs/product/` |
| `/speckit.architecture` | ③ | 架构设计 | `docs/architecture/` |
| `/speckit.plan` | ④ | 开发计划 | `docs/plan/` |
| `/speckit.tasks` | ⑤ | 任务分配 | `docs/plan/` |
| `/speckit.implement` | ⑥ | 执行开发开发 | \- |
| `/speckit.unittest` | ⑦ | 单元测试 | `tests/` |
| `/speckit.testcase` | ⑧ | 测试用例生成 | `docs/test/` |
| `/speckit.testreport` | ⑨ | 测试报告和验证 | `docs/test/` |
| `/speckit.report` | ⑩ | 交付总结报告 | `docs/report/` |

### 辅助工具

| 命令 | 说明 |
|------|------|
| `/speckit.clarify` | 澄清需求中的不明确点 |
| `/speckit.constitution`| 创建或更新项目规约 |
| `/speckit.update` | 🔄 需求变更时智能增量更新受影响文档 |
| `/speckit.archive` | 📦 迭代完成后归档文档快照 |
| `/speckit.functest` | ⑧.5 功能测试（如果有需要使用浏览器的情况） |

> **提示**：完整的项目开发规约和内存信息请参阅 `.specify/memory/constitution.md` 和 `index.md`。
