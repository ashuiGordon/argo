# Argo 借鉴 Yuxi 架构优化指南

> 本文档为 AI Agent 编写，提供从 Yuxi 项目借鉴设计模式到 Argo 项目的完整实施指南。
> 实施 Agent 可直接查看引用的文件路径获取详细源码。

---

## 核心差异说明

| 维度 | Yuxi | Argo |
|------|------|------|
| Agent 执行 | 直接调用 LLM API（LangGraph 编排） | 调用本地 CLI 工具（Claude Code SDK / Codex） |
| 后端语言 | Python (FastAPI) | TypeScript (Hono) |
| 数据库 | PostgreSQL + Redis + Milvus + Neo4j | SQLite (better-sqlite3) |
| 前端 | Vue 3 | React |
| 通信 | SSE 单向流 | WebSocket 双向 |
| 多租户 | 支持部门/角色权限 | 单用户 |

**关键约束**：Argo 的 Agent 执行不是直接请求 LLM API，而是启动本地 CLI 进程（如 `claude` 命令），通过 SDK 的 async generator 获取事件流。所有借鉴方案必须适配这个"CLI 进程管理"模式，而非 Yuxi 的"HTTP API 调用"模式。

---

## 一、分层架构重构

### 目标
将当前混合在 Router 中的业务逻辑抽离为独立 Service 层。

### Yuxi 参考

```
/Users/caozhi/Yuxi/backend/server/routers/     → 薄路由层（参数校验 + 调用 Service）
/Users/caozhi/Yuxi/backend/package/yuxi/services/  → 业务逻辑层
/Users/caozhi/Yuxi/backend/package/yuxi/repositories/  → 数据访问层
```

关键文件：
- `/Users/caozhi/Yuxi/backend/server/routers/chat_router.py` — 路由只做解析和调用
- `/Users/caozhi/Yuxi/backend/package/yuxi/services/chat_service.py` — 核心聊天逻辑
- `/Users/caozhi/Yuxi/backend/package/yuxi/services/conversation_service.py` — 会话管理

### Argo 当前问题

- `/Users/caozhi/Desktop/Argo/packages/daemon/src/api/messages.ts` — 路由中混合了 DB 操作、title 更新、session 调度
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/api/conversations.ts` — 路由中直接操作数据库
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/session/session-manager.ts` — 承担了太多职责（会话查找 + Agent 启动 + 回调注册）

### 实施方案

**创建 Service 层**（`packages/daemon/src/services/`）：

```
packages/daemon/src/services/
├── message-service.ts       # 消息发送、title 自动生成
├── conversation-service.ts  # 会话 CRUD、代理人查找
├── agent-run-service.ts     # Run 创建、状态管理、事件流
└── deploy-service.ts        # 部署逻辑
```

**重构原则**：
1. Router 只做：参数校验 → 调用 Service → 返回响应
2. Service 做：业务逻辑、跨实体协调、事件发布
3. 现有 `session-manager.ts` 拆分为：`agent-run-service.ts`（生命周期）+ `session-store.ts`（状态存储，已存在）

**示例重构 — `messages.ts`**：

```typescript
// BEFORE: api/messages.ts 做了太多事
messageRoutes.post("/", async (c) => {
  // 参数校验 + DB 查询 + title 更新 + session 调度 全在这里
});

// AFTER: api/messages.ts 只做路由
messageRoutes.post("/", async (c) => {
  const { content } = parsed.data;
  const conversationId = c.req.param("id")!;
  const result = await messageService.send(conversationId, content);
  return c.json(result, 202);
});

// services/message-service.ts 承担逻辑
export class MessageService {
  async send(conversationId: string, content: string) {
    const conv = this.conversationService.get(conversationId);
    this.conversationService.autoUpdateTitle(conversationId, content);
    const sessionId = await this.agentRunService.dispatch(conversationId, content);
    return { accepted: true, sessionId };
  }
}
```

---

## 二、Run 状态机

### 目标
为 Agent 执行引入正式的状态机，支持恢复、取消、超时、重试。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/storage/postgres/models_business.py` — `agent_runs` 表定义
- `/Users/caozhi/Yuxi/backend/package/yuxi/services/agent_run_service.py` — Run 生命周期管理
- `/Users/caozhi/Yuxi/backend/package/yuxi/services/run_worker.py` — Worker 执行逻辑

Yuxi 的 Run 状态：`queued → running → completed | failed | cancelled | timeout`

### Argo 适配方案

由于 Argo 的 Agent 是 CLI 进程（不是 API 调用），Run 状态机需要适配进程生命周期：

```
queued → starting → running → completed
                            → failed (进程异常退出)
                            → cancelled (用户主动终止)
                            → timeout (超时 kill)
```

**DB 变更 — 扩展 `sessions` 表或新建 `agent_runs` 表**：

```sql
CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  status TEXT NOT NULL CHECK(status IN ('queued','starting','running','completed','failed','cancelled','timeout')) DEFAULT 'queued',
  input TEXT,            -- 用户消息
  output TEXT,           -- 最终回复摘要
  error TEXT,            -- 错误信息
  provider TEXT NOT NULL, -- claude_code / codex
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/session/session-manager.ts` — 当前的 session 调度逻辑
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/claude/sdk-launcher.ts` — CLI 进程管理

**关键区别于 Yuxi**：
- Yuxi 用 Redis 队列 + ARQ Worker 模式（因为 LLM API 调用可以排队）
- Argo 的 CLI 进程一旦启动就持续运行，不需要 Worker 模式
- 但 Run 状态机仍然有价值：追踪生命周期、支持取消、超时保护

---

## 三、Middleware 组合模式

### 目标
将 Agent 能力（MCP、Skills、System Prompt、Context Preamble 等）从 `sdk-launcher.ts` 硬编码中解耦，变为可插拔中间件。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/agents/middlewares/` — 中间件目录
- `/Users/caozhi/Yuxi/backend/package/yuxi/agents/middlewares/knowledge_base.py` — KB 中间件示例
- `/Users/caozhi/Yuxi/backend/package/yuxi/agents/middlewares/skills.py` — Skills 中间件

Yuxi 模式：每个中间件在 Agent 执行前/后注入能力（修改 prompt、添加工具、处理结果）。

### Argo 适配方案

由于 Argo 是通过 SDK `query()` 的配置选项注入能力（`appendSystemPrompt`、`mcpServers` 等），中间件的形式是**配置组装器**：

```typescript
// packages/daemon/src/adapters/middleware.ts

interface AdapterMiddleware {
  name: string;
  // 在 query() 调用前修改配置
  beforeQuery(config: AdapterConfig, opts: Record<string, unknown>): void;
  // 在事件流中可选地拦截/增强事件
  onEvent?(event: NormalizedEvent, config: AdapterConfig): NormalizedEvent | null;
}

// 示例：MCP 中间件
class McpMiddleware implements AdapterMiddleware {
  name = "mcp";
  beforeQuery(config, opts) {
    if (config.mcpServers?.length) {
      opts.mcpServers = buildMcpConfig(config.mcpServers);
    }
  }
}

// 示例：Skills 中间件
class SkillsMiddleware implements AdapterMiddleware {
  name = "skills";
  beforeQuery(config, opts) {
    if (config.skills?.length) {
      const block = config.skills.map(s => `## /${s.name}\n${s.prompt}`).join("\n---\n");
      opts.appendSystemPrompt = (opts.appendSystemPrompt || "") + "\n\n# Skills\n" + block;
    }
  }
}

// 示例：Context Preamble 中间件
class ContextMiddleware implements AdapterMiddleware {
  name = "context";
  beforeQuery(config, opts) {
    if (config.contextPreamble) {
      opts.appendSystemPrompt = (opts.appendSystemPrompt || "") + "\n\n" + config.contextPreamble;
    }
  }
}
```

**重构 `sdk-launcher.ts`**：

```typescript
// BEFORE: 所有逻辑在一个函数里
function buildAppendSystemPrompt(config) { ... }
// MCP 处理写在 runQuery 里
// Skills 处理写在 buildAppendSystemPrompt 里

// AFTER: 中间件管道
const middlewares = [
  new ContextMiddleware(),
  new SkillsMiddleware(),
  new McpMiddleware(),
  new ArtifactScanMiddleware(),  // 产物扫描
];

for (const mw of middlewares) {
  mw.beforeQuery(config, opts);
}
const q = query({ prompt: message, options: opts });
```

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/claude/sdk-launcher.ts` — 行 111-176，当前的配置组装逻辑
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/types.ts` — AdapterConfig 类型定义

---

## 四、后台任务管理

### 目标
统一管理长时间异步操作（部署、文件处理、知识库索引等）的进度和状态。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/storage/postgres/models_business.py` — `tasks` 表（搜索 `class Task`）
- `/Users/caozhi/Yuxi/backend/package/yuxi/services/task_service.py` — 任务管理服务
- `/Users/caozhi/Yuxi/backend/server/routers/system_task_router.py` — 任务 API

### Argo 实施方案

**DB 表**：

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'deploy' | 'file_index' | 'export'
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
  progress INTEGER DEFAULT 0,  -- 0-100
  payload TEXT,                 -- JSON: 输入参数
  result TEXT,                  -- JSON: 执行结果
  error TEXT,
  conversation_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**前端对接**：Argo 已有 `useSessionsStore`，可扩展为通用 task store，通过 WebSocket 实时推送进度。

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/deploy/` — 部署逻辑（可改为走 Task 系统）
- `/Users/caozhi/Desktop/Argo/packages/ui/src/stores/sessions.ts` — 现有会话状态管理

---

## 五、轻量 RAG（Workspace 语义搜索）

### 目标
让 Agent 能基于 workspace 文件内容进行语义搜索，回答"这个项目哪里实现了 XXX"类问题。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/knowledge/manager.py` — KB 管理器
- `/Users/caozhi/Yuxi/backend/package/yuxi/knowledge/chunking/` — 文档分块策略
- `/Users/caozhi/Yuxi/backend/package/yuxi/knowledge/implementations/milvus.py` — 向量检索实现

### Argo 轻量适配方案

**不引入 Milvus/重量依赖**，使用轻量方案：

```
方案 A: 本地 SQLite FTS5 全文搜索（零依赖）
方案 B: 嵌入式向量库如 vectra/hnswlib（轻量向量搜索）
方案 C: 直接调 Agent 的 Grep/Read 工具（现有能力，零开发）
```

**推荐方案 A（FTS5）**：

```sql
-- Workspace 文件索引表
CREATE VIRTUAL TABLE IF NOT EXISTS workspace_search USING fts5(
  workspace,
  file_path,
  content,
  tokenize='porter unicode61'
);
```

**流程**：
1. 对话创建时 / 用户主动触发 → 扫描 workspace 文本文件 → 分块索引到 FTS5
2. Agent 执行前 → 从用户消息提取关键词 → FTS5 搜索相关代码片段
3. 搜索结果注入到 `contextPreamble`（通过 Context Middleware）

**适配 Argo 的关键点**：
- Argo Agent 已经有 `Read`/`Grep` 工具可以搜索文件，所以 RAG 不是刚需
- 但 FTS5 可以让 Argo 在发送消息前主动提供上下文，减少 Agent 的工具调用轮次
- 这是**性能优化**，不是新功能

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/api/system.ts` — `listFiles`/`readFile` 已有文件访问
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/memory/context-builder.ts` — 现有 context 构建逻辑

---

## 六、模型/供应商统一管理

### 目标
支持多个 Agent CLI 后端（Claude Code、Codex、未来可能的 Gemini CLI 等），统一配置管理。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/storage/postgres/models_business.py` — `model_providers` 表
- `/Users/caozhi/Yuxi/backend/server/routers/model_provider_router.py` — 供应商 CRUD API
- `/Users/caozhi/Yuxi/backend/package/yuxi/models/` — 模型适配器层

### Argo 适配方案

Argo 的"模型供应商"概念等价于"Agent CLI 后端"：

```sql
CREATE TABLE IF NOT EXISTS agent_backends (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,             -- 'Claude Code' | 'Codex' | 'Gemini CLI'
  provider TEXT NOT NULL,         -- 'claude_code' | 'codex'
  executable_path TEXT,           -- 可执行文件路径（可选，auto-detect）
  default_model TEXT,             -- 默认模型 ID
  config TEXT,                    -- JSON: 额外配置
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/` — 现有适配器目录
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/types.ts` — Adapter 接口定义
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/db/schema.ts` — 现有 agents 表

---

## 七、操作审计日志

### 目标
记录关键用户操作，便于问题排查和安全审计。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/services/operation_log_service.py`
- `/Users/caozhi/Yuxi/backend/package/yuxi/storage/postgres/models_business.py` — `operation_logs` 表

### Argo 实施方案

```sql
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,           -- 'message_send' | 'agent_create' | 'deploy' | 'conversation_delete'
  actor TEXT,                     -- user ID
  target_type TEXT,               -- 'conversation' | 'agent' | 'deployment'
  target_id TEXT,
  detail TEXT,                    -- JSON: 操作详情
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

在 Service 层的关键操作中插入日志：
```typescript
// services/message-service.ts
async send(conversationId, content) {
  // ... 业务逻辑
  this.auditLog.record('message_send', { conversationId, contentLength: content.length });
}
```

---

## 八、前端 Composable / Hook 模式

### 目标
从 Yuxi 的 Vue Composables 模式借鉴，优化 Argo React 前端的状态管理和流处理。

### Yuxi 参考

- `/Users/caozhi/Yuxi/web/src/composables/useAgentRunStream.js` — SSE 事件流消费
- `/Users/caozhi/Yuxi/web/src/composables/useAgentStreamHandler.js` — 流事件处理
- `/Users/caozhi/Yuxi/web/src/composables/useApproval.js` — 人工审批流程
- `/Users/caozhi/Yuxi/web/src/composables/useStreamSmoother.js` — 流式文本平滑

### Argo 对应 React Hooks

当前 Argo 的流处理逻辑散落在 `ws-handler.ts` 和各 store 中。建议提取为独立 hooks：

```
packages/ui/src/hooks/
├── useAgentStream.ts      # WebSocket 事件流消费 + 状态管理
├── useStreamText.ts       # 流式文本平滑渲染（防闪烁）
├── useApproval.ts         # tool approval 弹窗逻辑
└── useWorkspaceFiles.ts   # workspace 文件操作
```

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/ui/src/services/ws-handler.ts` — 当前 WS 事件处理
- `/Users/caozhi/Desktop/Argo/packages/ui/src/stores/conversations.ts` — 会话状态

---

## 九、MCP 服务器管理优化

### 目标
MCP 服务器配置从 Agent 定义中解耦，支持独立 CRUD 管理和复用。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/package/yuxi/storage/postgres/models_business.py` — `mcp_servers` 表
- `/Users/caozhi/Yuxi/backend/server/routers/mcp_router.py` — MCP CRUD API
- `/Users/caozhi/Yuxi/backend/package/yuxi/agents/mcp/` — MCP 集成逻辑

### Argo 现状 vs 改进

当前 Argo 的 MCP 配置嵌在 Agent 的 `config` JSON 里。Yuxi 将 MCP 作为独立实体管理，Agent 通过关联关系引用。

**建议**：保持现有 `agents.mcp_config` 字段不变（简单），但在"智能体 & 工具"面板增加 MCP 服务器的独立管理视图（列表/添加/测试连接）。

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/api/agents.ts` — Agent CRUD 含 MCP 配置
- `/Users/caozhi/Desktop/Argo/packages/ui/src/components/agents-tools/mcp-marketplace-tab.tsx` — MCP 市场

---

## 十、会话恢复与 Human-in-the-loop

### 目标
支持中断后恢复（进程崩溃恢复、网络断开重连）和人工审批工作流。

### Yuxi 参考

- `/Users/caozhi/Yuxi/backend/server/routers/chat_router.py` — `resume` 端点
- `/Users/caozhi/Yuxi/web/src/composables/useApproval.js` — 前端审批 UI

### Argo 现状

- 已有 `provider_session_id` 用于 Claude Code SDK 的 resume
- 已有 `approval-card` 组件和 `dual-channel.ts` 审批逻辑
- 但进程崩溃后的恢复不够健壮

**改进方向**：
1. 在 `agent_runs` 表记录最后的 `claudeSessionId`
2. 启动时扫描 `status = 'running'` 的 runs → 尝试 resume
3. resume 失败则标记为 `failed` 并通知用户

**参考 Argo 现有代码**：
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/claude/sdk-launcher.ts` — 行 161-163，resume 逻辑
- `/Users/caozhi/Desktop/Argo/packages/daemon/src/session/session-manager.ts` — 行 114-122，resumeSessionId 查找

---

## 实施优先级总览

| 阶段 | 任务 | 复杂度 | 依赖 |
|------|------|--------|------|
| **Phase 1** | 分层架构重构（Service 层抽离） | 中 | 无 |
| **Phase 1** | 操作审计日志 | 低 | 无 |
| **Phase 2** | Run 状态机 + DB 表 | 中 | Phase 1 |
| **Phase 2** | 后台任务管理 | 中 | Phase 1 |
| **Phase 2** | Middleware 组合模式 | 中 | Phase 1 |
| **Phase 3** | 前端 Hook 提取 | 中 | 无 |
| **Phase 3** | MCP 独立管理 | 低 | 无 |
| **Phase 3** | 模型/后端统一管理 | 低 | Phase 1 |
| **Phase 4** | 轻量 RAG（FTS5） | 高 | Phase 2 |
| **Phase 4** | 会话恢复增强 | 中 | Phase 2 |

---

## 文件路径速查

### Yuxi（参考源）

| 模块 | 路径 |
|------|------|
| 路由层 | `/Users/caozhi/Yuxi/backend/server/routers/` |
| 服务层 | `/Users/caozhi/Yuxi/backend/package/yuxi/services/` |
| 数据模型 | `/Users/caozhi/Yuxi/backend/package/yuxi/storage/postgres/models_business.py` |
| Agent 系统 | `/Users/caozhi/Yuxi/backend/package/yuxi/agents/` |
| 中间件 | `/Users/caozhi/Yuxi/backend/package/yuxi/agents/middlewares/` |
| 知识库 | `/Users/caozhi/Yuxi/backend/package/yuxi/knowledge/` |
| MCP | `/Users/caozhi/Yuxi/backend/package/yuxi/agents/mcp/` |
| 任务管理 | `/Users/caozhi/Yuxi/backend/package/yuxi/services/task_service.py` |
| 审计日志 | `/Users/caozhi/Yuxi/backend/package/yuxi/services/operation_log_service.py` |
| 前端 Composables | `/Users/caozhi/Yuxi/web/src/composables/` |
| 前端 Stores | `/Users/caozhi/Yuxi/web/src/stores/` |

### Argo（待修改）

| 模块 | 路径 |
|------|------|
| API 路由 | `/Users/caozhi/Desktop/Argo/packages/daemon/src/api/` |
| Session 管理 | `/Users/caozhi/Desktop/Argo/packages/daemon/src/session/` |
| Agent 适配器 | `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/` |
| Claude SDK 启动器 | `/Users/caozhi/Desktop/Argo/packages/daemon/src/adapters/claude/sdk-launcher.ts` |
| 数据库 Schema | `/Users/caozhi/Desktop/Argo/packages/daemon/src/db/schema.ts` |
| 数据库 Queries | `/Users/caozhi/Desktop/Argo/packages/daemon/src/db/queries.ts` |
| 事件总线 | `/Users/caozhi/Desktop/Argo/packages/daemon/src/event-bus/` |
| WebSocket | `/Users/caozhi/Desktop/Argo/packages/daemon/src/ws/` |
| 前端 Stores | `/Users/caozhi/Desktop/Argo/packages/ui/src/stores/` |
| 前端 Services | `/Users/caozhi/Desktop/Argo/packages/ui/src/services/` |
| 共享类型 | `/Users/caozhi/Desktop/Argo/packages/shared/src/schemas/events.ts` |

---

## 注意事项

1. **不要引入 Python 依赖** — Argo 是纯 TypeScript 项目，所有借鉴需用 TS 实现
2. **保持 SQLite** — 不引入 PostgreSQL/Redis，除非明确需要多实例部署
3. **CLI 进程 ≠ API 调用** — Agent 执行是长时间运行的子进程，不是 HTTP 请求，状态管理模式不同
4. **WebSocket 保持** — 不改为 SSE，Argo 的双向 WS 已经稳定，且需要双向通信（approval）
5. **渐进式重构** — 不要一次性重写，每个 Phase 独立可交付，保持向后兼容
