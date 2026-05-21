# PRD: Argo - 多 Agent 协作平台

## Introduction

Argo 是一个以 IM 聊天为核心交互范式的多 Agent 协作平台。命名取自古希腊神话中的阿尔戈号（Argo）——一群各怀绝技的英雄登上同一条船，协作完成不可能的任务。正如阿尔戈英雄们各司其职，Argo 平台让多个 AI Agent 各展所长、协同工作。

用户像使用飞书/微信一样，通过新建对话、发送消息的方式与不同 AI Agent 进行交互。平台接入主流 Agent 平台（Claude Code、Codex），通过统一事件归一化层屏蔽协议差异。支持单聊、群聊协作、任务拆解与调度、操作审批，Agent 产出（代码、网页等）支持内联预览与编辑。

---

## Goals

- 提供流畅的 IM 聊天体验，支持多会话并行管理
- 通过 Claude Code Hook 机制和 Codex JSON-RPC 协议接入两大 Agent 平台
- 实现统一事件归一化层（NormalizedEvent），所有 Agent 产出转换为标准事件流
- 实现 Orchestrator 协调器，支持群聊模式下的自动任务拆解与多 Agent 并行调度
- 实现操作审批队列，对 Agent 的危险操作进行风险分级和用户确认
- 支持双视图模式：聊天气泡视图 + 终端原始输出视图
- 支持 Agent 产出的内联预览（代码高亮 + 网页 iframe）
- 支持用户自建 Agent（设定 System Prompt + 工具集）
- 支持发现并接入已在外部运行的 Agent Session

---

## User Stories

### US-001: 对话列表管理

**Description:** As a user, I want to manage my conversations in a sidebar list so that I can quickly switch between different Agent chats.

**Acceptance Criteria:**
- [ ] 左侧展示对话列表，按最近活跃时间排序
- [ ] 支持新建对话（选择单聊/群聊模式）
- [ ] 支持对话置顶、归档、删除操作
- [ ] 支持按对话名称/Agent 名称搜索
- [ ] 每个对话条目显示 Agent 头像、名称、最后一条消息摘要、时间戳
- [ ] 未读消息数量角标显示
- [ ] 外部发现的 Session 在列表中以特殊标记展示（仅可观察，不可控制）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-002: 单聊模式 - 创建与 Agent 的 1v1 对话

**Description:** As a user, I want to create a one-on-one chat with a specific Agent so that I can assign it a focused task.

**Acceptance Criteria:**
- [ ] 点击"新建对话"按钮弹出 Agent 选择面板
- [ ] Agent 选择面板展示所有可用 Agent（带头像、名称、能力标签）
- [ ] 选择 Agent 后创建新对话并自动跳转到聊天窗口
- [ ] 对话标题默认为 Agent 名称，可编辑
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-003: 消息发送与展示

**Description:** As a user, I want to send messages and see Agent responses in a chat-like interface so that the interaction feels natural and familiar.

**Acceptance Criteria:**
- [ ] 底部输入框支持多行文本输入（Shift+Enter 换行，Enter 发送）
- [ ] 支持发送文本消息、代码片段（用 ``` 包裹自动识别）
- [ ] 用户消息右侧气泡展示，Agent 消息左侧气泡展示
- [ ] Agent 消息支持 Markdown 渲染（标题、列表、粗体、链接等）
- [ ] 消息展示发送时间戳
- [ ] Agent 回复时显示"正在输入..."状态指示器
- [ ] 支持流式输出（Agent 回复逐字/逐块显示）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-004: 消息操作

**Description:** As a user, I want to perform actions on messages (copy, regenerate, quote) so that I can efficiently work with Agent outputs.

**Acceptance Criteria:**
- [ ] 悬停消息显示操作栏（复制、引用、重新生成）
- [ ] "复制"按钮一键复制消息全文或代码块内容
- [ ] "重新生成"按钮重新请求 Agent 回复（仅对 Agent 消息）
- [ ] "引用"操作将消息作为引用插入输入框
- [ ] 代码块右上角显示独立的"复制代码"按钮
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: 上下文管理

**Description:** As a user, I want the chat history to be automatically passed as context to the Agent, and I want to pin important messages so that the Agent always considers them.

**Acceptance Criteria:**
- [ ] 对话历史自动作为上下文传递给 Agent（最近 N 条消息）
- [ ] 支持手动 Pin 关键消息，Pin 的消息始终作为上下文传递
- [ ] Pin 的消息在聊天流中有视觉标记（图钉图标）
- [ ] 支持取消 Pin
- [ ] 对话顶部显示当前 Pin 消息数量指示
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-006: Claude Code CLI 适配器（Hook 机制）

**Description:** As a developer, I need to integrate Claude Code CLI via its Hook system so that we receive structured lifecycle events and can intercept tool executions for approval.

**Acceptance Criteria:**
- [ ] 启动本地 Hook Server（HTTP，监听 127.0.0.1:端口）
- [ ] 生成临时 settings.json，配置 Hook 脚本指向 Argo Hook Server
- [ ] 支持 Claude Code 的 stream-json 模式启动（`--output-format=stream-json`）
- [ ] 解析 Hook 事件：SessionStart、SessionEnd、PreToolUse、PostToolUse、Stop
- [ ] 对需要审批的 Hook 事件（PreToolUse 危险操作），HTTP 响应挂起直到用户决策
- [ ] 支持 PTY 模式启动（node-pty），用于终端视图展示原始 CLI 输出
- [ ] 实现 Session ID 映射（Claude 内部 ID ↔ Argo Session UUID）
- [ ] 错误处理：CLI 崩溃时返回友好错误消息并尝试重启
- [ ] 支持配置 Claude Code 的工作目录
- [ ] Typecheck/lint passes

---

### US-007: Codex CLI 适配器（JSON-RPC）

**Description:** As a developer, I need to integrate Codex CLI via its JSON-RPC over stdio protocol so that users can leverage Codex capabilities.

**Acceptance Criteria:**
- [ ] 启动 `codex` 子进程，通过 stdin/stdout 进行 JSON-RPC 通信
- [ ] 实现 LSP 风格握手：initialize → initialized → thread/start
- [ ] 通过 `turn/start` 发送用户消息，解析 Codex 响应事件
- [ ] 处理 server-initiated requests（审批请求），持有 pending response 直到用户决策
- [ ] 支持 PTY 模式启动，用于终端视图展示
- [ ] 解析 Codex 事件并归一化为平台 NormalizedEvent 格式
- [ ] 错误处理：进程崩溃时返回友好错误消息
- [ ] Typecheck/lint passes

---

### US-008: 统一事件归一化层

**Description:** As a developer, I need a unified event normalization layer so that all Agent outputs are represented as a standard event stream regardless of the underlying provider.

**Acceptance Criteria:**
- [ ] 定义 NormalizedEvent discriminated union（Zod schema 校验），包含事件类型：session_start、session_end、message、tool_use、tool_result、approval_request、approval_resolved、task_status、error、usage
- [ ] Claude Code 适配器将 Hook 事件转换为 NormalizedEvent
- [ ] Codex 适配器将 JSON-RPC 通知转换为 NormalizedEvent
- [ ] EventBus（typed EventEmitter）接收所有 NormalizedEvent 并广播
- [ ] 事件持久化到数据库（append-only，含单调递增 sequence_number）
- [ ] 事件通过 WebSocket 实时广播给前端
- [ ] 支持事件去重（避免重复持久化和广播）
- [ ] Typecheck/lint passes

---

### US-009: 操作审批队列

**Description:** As a user, I want to review and approve/deny risky operations that Agents attempt to perform, so that I maintain control over destructive actions.

**Acceptance Criteria:**
- [ ] 实现审批队列管理器（register → pending → decide → resolved）
- [ ] Agent 的危险操作（如 Bash 命令、文件删除）触发审批请求
- [ ] 审批请求在聊天流中以卡片形式展示（显示操作内容、风险等级、影响文件）
- [ ] 用户可点击"批准"或"拒绝"按钮进行决策
- [ ] 支持风险分级：Critical（红）/ High（橙）/ Medium（黄）/ Low（自动通过）
- [ ] 低风险操作（Read、Glob、Grep 等只读工具）自动批准，无需用户干预
- [ ] 审批超时（60 秒）自动拒绝并通知用户
- [ ] 支持"始终允许"规则：用户可对某类操作设置永久自动批准
- [ ] 审批记录持久化到数据库
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-010: 双视图模式（聊天 + 终端）

**Description:** As a user, I want to switch between a structured chat view and a raw terminal view so that I can choose the level of detail I want to see.

**Acceptance Criteria:**
- [ ] 每个对话支持"聊天视图"和"终端视图"两种展示模式
- [ ] 聊天视图：解析后的消息气泡、代码卡片、Diff 卡片（默认）
- [ ] 终端视图：xterm.js 渲染 Agent CLI 的原始终端输出
- [ ] 顶部 Tab 切换两种视图，切换时保持各自滚动位置
- [ ] 终端视图支持用户直接输入命令（透传到 CLI stdin）
- [ ] PTY 数据流路径：Daemon PTY → WebSocket pty_output → xterm.write()
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-011: 群聊模式 - 创建多 Agent 对话

**Description:** As a user, I want to create a group chat with multiple Agents so that they can collaborate on complex tasks.

**Acceptance Criteria:**
- [ ] 新建对话时可选择"群聊"模式
- [ ] 群聊模式下可选择 2+ 个 Agent 加入对话
- [ ] 群聊对话在列表中有群聊图标标识
- [ ] 群聊顶部显示参与的 Agent 列表
- [ ] 支持在对话中通过 @AgentName 指定对话对象
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-012: Orchestrator - 任务 DAG 拆解

**Description:** As a user, I want the Orchestrator to automatically break down my complex request into a task DAG (directed acyclic graph) with dependency relationships, and assign each task to the appropriate Agent.

**Acceptance Criteria:**
- [ ] 用户在群聊中发送消息时，Orchestrator 自动分析意图
- [ ] 简单目标短路：复杂度检测（< 200 字符且无协作关键词）直接路由到最匹配 Agent，跳过拆解
- [ ] 复杂目标：Coordinator（LLM）接收目标 + Agent 名册（名称、能力描述），输出 JSON 任务数组
- [ ] 任务数组格式：`[{ title, description, assignee, dependsOn: [title] }]`
- [ ] 依赖解析：两轮处理——第一轮创建所有任务获得 ID，第二轮将 title 引用解析为实际 ID
- [ ] 在聊天流中展示任务 DAG（可折叠的任务卡片，含依赖关系连线/缩进）
- [ ] 执行前用户确认门控（Plan Approval Gate）：用户可批准/修改/拒绝执行计划
- [ ] 拆解失败时 fallback：为每个 Agent 创建一个任务，内容为原始目标
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: Orchestrator - 并行调度与结果聚合

**Description:** As a user, I want the Orchestrator to execute sub-tasks in parallel where possible, handle failures gracefully, and synthesize all results into a coherent response.

**Acceptance Criteria:**
- [ ] Round-based 调度循环：每轮找出所有 ready 任务（依赖已完成）→ Promise.all 并行执行 → 完成后解锁后继任务
- [ ] Semaphore 并发控制：池级别限制最大并行数（默认 5），Agent 级别互斥锁防止同一 Agent 并发
- [ ] 依赖结果注入：子任务 prompt 仅包含其直接依赖任务的产出结果（非全部任务结果）
- [ ] 级联失败：任务失败时立即标记所有传递依赖的后继任务为 failed，不阻塞无关分支
- [ ] 单任务重试：支持 exponential backoff 重试（可配置 maxRetries、retryDelay）
- [ ] 实时展示各子任务的执行状态（pending/blocked/in_progress/completed/failed/skipped）
- [ ] 所有任务完成后，Coordinator 接收全部结果（按 completed/failed/skipped 分组）生成综合汇总消息
- [ ] 任务结果自动写入 SharedMemory（key: `agent:taskId:result`），后续任务可读取
- [ ] 支持用户中途取消：标记剩余任务为 skipped，已运行任务发送 abort 信号
- [ ] 通过 OrchestratorEvent 实时推送进度事件到前端（task_start、task_complete、task_failed、synthesis_start）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: Orchestrator - 冲突处理

**Description:** As a developer, I need the Orchestrator to handle conflicts when multiple Agents produce overlapping outputs (e.g., code editing the same file).

**Acceptance Criteria:**
- [ ] 检测多个 Agent 产出是否存在冲突（如修改同一文件）
- [ ] 冲突时在聊天流中展示冲突详情（Diff 对比视图）
- [ ] 提供解决选项：选择 Agent A 的版本 / Agent B 的版本 / 手动合并
- [ ] 用户选择后更新最终产出
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-015: 代码高亮与 Diff 展示

**Description:** As a user, I want code in Agent responses to be syntax-highlighted and file changes to be shown as diffs so that I can quickly understand the output.

**Acceptance Criteria:**
- [ ] Agent 回复中的代码块自动语法高亮（支持 JS/TS/Python/Go 等主流语言）
- [ ] 代码块顶部显示语言标签和文件名（如有）
- [ ] 文件修改以 Diff 视图卡片展示（绿色新增、红色删除）
- [ ] Diff 卡片支持折叠/展开
- [ ] 代码块支持一键复制
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-016: 网页 iframe 预览

**Description:** As a user, I want to preview web pages generated by Agents inline in the chat so that I can see the result without leaving the conversation.

**Acceptance Criteria:**
- [ ] Agent 生成的 HTML/网页产出以预览卡片形式内联展示
- [ ] 预览卡片内嵌 iframe 渲染实际网页效果
- [ ] 卡片显示预览标题和尺寸信息
- [ ] 支持点击卡片展开全屏预览
- [ ] 全屏预览支持切换设备尺寸（桌面/平板/手机）
- [ ] 支持在预览中交互（点击、滚动）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-017: 外部 Session 发现与接入

**Description:** As a user, I want Argo to discover Agent sessions already running outside the platform so that I can monitor their activity without restarting them.

**Acceptance Criteria:**
- [ ] 轮询 Claude Code 本地 session 文件（`~/.claude/sessions/`），探测 PID 判断存活
- [ ] 轮询 Codex 外部 session 数据
- [ ] 发现的外部 Session 自动出现在对话列表中（标记为"外部"）
- [ ] 外部 Session 仅支持观察和审批，不支持发送消息或终止
- [ ] 用户可手动从列表中移除已结束的外部 Session
- [ ] 轮询间隔可配置（默认 5 秒）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-018: 自建 Agent

**Description:** As a user, I want to create custom Agents with my own System Prompt and tool configuration so that I can tailor the platform to my needs.

**Acceptance Criteria:**
- [ ] 提供"创建 Agent"入口（设置页面或对话方式创建）
- [ ] 配置项：Agent 名称、头像、System Prompt、工具集选择、模型选择
- [ ] 自建 Agent 出现在 Agent 列表中，与内置 Agent 并列
- [ ] 支持编辑和删除自建 Agent
- [ ] 自建 Agent 可在单聊和群聊中使用
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-019: 用户认证与会话持久化

**Description:** As a user, I want to log in and have my conversations persisted so that I can continue my work across sessions.

**Acceptance Criteria:**
- [ ] 支持用户注册和登录（邮箱 + 密码）
- [ ] 登录后加载用户的所有历史对话
- [ ] 对话消息持久化到数据库
- [ ] 支持登出操作
- [ ] 未登录用户重定向到登录页
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-020: 实时通信基础设施（WebSocket + 序列号重放）

**Description:** As a developer, I need WebSocket infrastructure with sequence-based catch-up so that the UI never misses events even after reconnection.

**Acceptance Criteria:**
- [ ] 建立 WebSocket 连接管理（连接、断开、重连）
- [ ] 每个事件携带单调递增的 sequence_number
- [ ] 客户端重连时发送 lastSeenSequence，服务端从该点 replay 所有缺失事件
- [ ] Replay 完成后发送 `catchup_complete` 信号，UI 批量应用缓冲事件
- [ ] 心跳检测保活机制
- [ ] 断线自动重连（指数退避策略）
- [ ] 支持多对话 WebSocket 复用（单连接多 channel）
- [ ] Typecheck/lint passes

---

### US-021: 数据库设计与 API

**Description:** As a developer, I need to design the SQLite database schema and REST API endpoints to support all platform features.

**Acceptance Criteria:**
- [ ] 使用 SQLite（better-sqlite3，WAL 模式）作为唯一数据存储
- [ ] 设计核心表结构：users, agents, conversations, events (append-only), approvals, always_allow_rules, pinned_messages
- [ ] events 表作为唯一真相源（append-only），支持 sequence_number 主键
- [ ] 实现 RESTful API：CRUD for conversations, agents；事件查询与重放
- [ ] API 支持分页查询（对话列表、事件历史）
- [ ] API 输入验证和错误处理（Zod schema）
- [ ] 数据库初始化脚本（建表 + 索引）可运行
- [ ] Typecheck/lint passes

---

## Functional Requirements

- **FR-1:** 系统必须提供左侧对话列表，支持按最近活跃时间排序展示所有会话
- **FR-2:** 用户可创建单聊对话（选择一个 Agent）或群聊对话（选择多个 Agent）
- **FR-3:** 消息输入框支持纯文本和代码片段，Enter 发送，Shift+Enter 换行
- **FR-4:** Agent 回复必须支持流式输出（逐 token 渲染）
- **FR-5:** 系统必须通过 Claude Code Hook 机制接入 Claude Code CLI，接收结构化生命周期事件
- **FR-6:** 系统必须通过 JSON-RPC over stdio 接入 Codex CLI，实现双向通信
- **FR-7:** 所有 Agent 事件必须归一化为 NormalizedEvent 标准格式（Zod schema 校验）
- **FR-8:** 事件必须以 append-only 方式持久化到 SQLite，携带单调递增 sequence_number
- **FR-9:** Agent 的危险操作必须经过审批队列，按风险等级分类（Critical/High/Medium/Low）
- **FR-10:** 低风险操作（Read、Glob、Grep 等只读工具）自动通过审批
- **FR-11:** 审批请求通过挂起 HTTP 响应（Claude Hook）或持有 JSON-RPC response（Codex）实现阻塞
- **FR-12:** 每个对话支持聊天视图和终端视图（xterm.js）双模式切换
- **FR-13:** 群聊模式下，Orchestrator 通过 LLM 将用户目标拆解为任务 DAG（JSON 格式，含 dependsOn 依赖声明）
- **FR-14:** Orchestrator 采用 Round-based 调度循环：每轮并行执行所有 ready 任务，完成后解锁后继
- **FR-15:** Orchestrator 使用 Semaphore 并发控制（池级别 + Agent 级别双锁）
- **FR-16:** 简单目标（< 200 字符无协作关键词）短路跳过拆解，直接路由到最匹配 Agent
- **FR-17:** 任务失败时级联标记所有传递依赖的后继任务为 failed，不阻塞无关分支
- **FR-18:** 所有任务完成后，Coordinator 接收分组结果并生成综合汇总消息
- **FR-19:** 当多个 Agent 产出冲突时，系统必须检测并提示用户选择解决方案
- **FR-20:** Agent 回复中的代码块必须自动语法高亮
- **FR-21:** Agent 生成的网页产出必须以 iframe 卡片形式内联预览
- **FR-22:** 用户可 Pin 消息作为长期上下文，Pin 的消息始终传递给 Agent
- **FR-23:** 前后端通过 WebSocket 实现实时通信，支持序列号重放和断线重连
- **FR-24:** 系统必须轮询本地文件系统发现外部运行的 Agent Session
- **FR-25:** 用户可创建自定义 Agent，配置 System Prompt 和工具集
- **FR-26:** 所有消息操作（复制、引用、重新生成）通过悬停工具栏触发

---

## Non-Goals (Out of Scope)

- 不实现部署发布功能（P2 功能，后续迭代）
- 不实现移动端和桌面端（本期仅 Web 端）
- 不实现 PPT 预览
- 不实现版本历史和 Diff 对比编辑
- 不实现对话式局部代码修改
- 不实现优先级通知和自动提醒
- 不实现 Agent marketplace / 商店
- 不实现计费和使用量限制
- 不实现多用户协作（同一对话多人参与）
- 不实现文件上传附件功能（本期仅文本和代码）
- 不实现 Agent 能力的自动检测（本期手动配置）

---

## Design Considerations

### UI/UX
- 整体布局参考飞书/Slack：左侧对话列表（240px）+ 右侧聊天区域
- 聊天区域顶部 Tab 切换"聊天"/"终端"双视图
- 深色/浅色主题支持（默认浅色）
- 响应式设计，最小支持 1024px 宽度
- Agent 头像使用品牌色圆形图标（Claude = 橙色，Codex = 绿色）
- 消息气泡：用户消息右对齐蓝色背景，Agent 消息左对齐灰色背景
- 审批卡片使用风险等级对应色彩（红/橙/黄）+ 批准/拒绝按钮
- 代码块使用 VS Code 风格暗色主题
- 加载状态：骨架屏 + 打字动画
- 外部 Session 使用虚线边框 + "外部" badge 标识

### 组件复用
- 消息气泡组件（支持多种消息类型）
- 代码块组件（语法高亮 + 复制按钮）
- Diff 视图卡片组件（折叠/展开 + 文件名标题）
- 预览卡片组件（iframe + 全屏切换）
- 审批卡片组件（操作详情 + 风险 badge + 决策按钮）
- Agent 选择面板组件（头像 + 名称 + 标签）
- 任务状态卡片组件（进度条 + 状态图标）
- 终端组件（xterm.js 封装）

---

## Technical Considerations

### 技术栈
| 层级 | 技术选择 | 选型理由 |
|------|----------|----------|
| 项目结构 | pnpm monorepo（daemon / ui / shared） | 前后端共享类型定义，独立构建部署 |
| 前端框架 | React 18 + Vite 6（纯 SPA） | 无需 SSR，构建快、HMR 快，与 Daemon 解耦 |
| UI 组件 | Tailwind CSS 4 + shadcn/ui + Radix UI | 可定制 + 无障碍 |
| 状态管理 | Zustand v5（单 store + slice 模式） | 轻量、支持 subscribeWithSelector |
| 路由 | React Router v7 | 客户端路由，SPA 标配 |
| 终端渲染 | xterm.js + @xterm/addon-fit | Agent 原始输出展示 |
| 后端框架 | 独立 TypeScript Daemon（原生 HTTP + ws） | 长驻进程，支持子进程管理、多端口监听、WebSocket 一等公民 |
| API 路由 | Hono（轻量 HTTP 框架） | 类型安全、零依赖、支持中间件，比手写 handler 更规范 |
| 实时通信 | 原生 ws 库（非 socket.io） | 轻量、无额外协议开销，配合序列号 replay |
| 后端运行时 | Node.js 22 + TypeScript + ESM | 原生 ESM + 最新 API |
| 进程管理 | node-pty（PTY 模式）+ child_process（stream-json 模式） | 双模式支持终端输出和结构化 JSON |
| Schema 验证 | Zod v4 | 事件 discriminated union + API 输入校验 + 前后端共享 |
| 数据库 | SQLite（better-sqlite3，WAL 模式） | 同步 API、零外部依赖、单文件部署、Local-first 架构 |
| 数据访问 | better-sqlite3 直接 SQL + 类型封装 | 保持简单直接，无 ORM 抽象开销 |
| 认证 | 自实现 JWT（jsonwebtoken + bcrypt） | Daemon 独立进程无法用 NextAuth，JWT 无状态适合分离架构 |
| 代码高亮 | Shiki | VS Code 级别高亮 |
| Diff 渲染 | react-diff-viewer | 统一 Diff 展示 |

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (UI)                          │
│  React + Vite + Zustand + xterm.js                          │
│  聊天视图 / 终端视图 / 审批 Inbox / 任务面板                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket (ws) + REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Argo Daemon (Node.js)                    │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ WS Server│  │ Hook Server  │  │ REST API (Hono)   │     │
│  │ :54321   │  │ :54322       │  │                   │     │
│  └────┬─────┘  └──────┬───────┘  └─────────┬─────────┘     │
│       │               │                    │               │
│       ▼               ▼                    ▼               │
│  ┌─────────────────────────────────────────────────┐       │
│  │              EventBus (typed EventEmitter)       │       │
│  └────────┬──────────────┬──────────────┬──────────┘       │
│           │              │              │                   │
│           ▼              ▼              ▼                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │  Persist   │  │  Broadcast  │  │  Approval    │        │
│  │  (SQLite)  │  │ (WebSocket) │  │   Queue      │        │
│  └────────────┘  └─────────────┘  └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │           Provider Adapters (归一化层)            │       │
│  │                                                 │       │
│  │  ┌─────────────────┐  ┌─────────────────────┐  │       │
│  │  │ Claude Adapter  │  │   Codex Adapter     │  │       │
│  │  │ - Hook 解析     │  │ - JSON-RPC 协议     │  │       │
│  │  │ - PTY 管理      │  │ - PTY 管理          │  │       │
│  │  │ - 风险分类      │  │ - 风险分类          │  │       │
│  │  └────────┬────────┘  └──────────┬──────────┘  │       │
│  └───────────┼──────────────────────┼──────────────┘       │
│              │                      │                       │
└──────────────┼──────────────────────┼───────────────────────┘
               │                      │
               ▼                      ▼
     Claude Code CLI             Codex CLI
     (Hook callbacks)         (stdio JSON-RPC)
```

### 核心架构模式（实现参考，非需求约束）

> 以下内容为实现层面的参考设计，来自 Agent Cockpit 和 open-multi-agent 的验证模式。具体实现可根据实际情况调整，不作为验收标准。

#### 1. Provider Adapter 归一化
每个 Agent CLI 有独立适配器，输出统一为 NormalizedEvent（Zod discriminated union）：
```typescript
// 参考类型定义，实际字段可按需扩展
type NormalizedEvent =
  | { type: "session_start"; sessionId: string; provider: "claude" | "codex"; workspace: string }
  | { type: "session_end"; sessionId: string; exitCode: number }
  | { type: "message"; sessionId: string; role: "assistant"; content: string; streaming: boolean }
  | { type: "tool_use"; sessionId: string; tool: string; input: unknown }
  | { type: "tool_result"; sessionId: string; tool: string; output: unknown }
  | { type: "approval_request"; approvalId: string; sessionId: string; action: string; riskLevel: RiskLevel }
  | { type: "approval_resolved"; approvalId: string; decision: "approve" | "deny" }
  | { type: "task_status"; sessionId: string; taskId: string; status: "pending" | "running" | "done" | "failed" }
  | { type: "error"; sessionId: string; message: string }
  | { type: "usage"; sessionId: string; inputTokens: number; outputTokens: number }
```

#### 2. Claude Code Hook 集成
- Daemon 启动时生成临时 Hook relay 脚本（CJS），指向本地 Hook Server
- Hook 事件通过 HTTP POST 到达，解析为 NormalizedEvent
- 需审批的操作：HTTP 响应挂起，用户决策后才返回（approve → 允许继续，deny → 中止操作）
- 自动通过的工具白名单：Read, Glob, Grep, Write, Edit（可配置）

#### 3. Codex JSON-RPC 集成
- 通过 stdin/stdout 的 newline-delimited JSON-RPC 通信
- 握手流程：initialize → initialized → thread/start → turn/start
- 审批作为 server-initiated request（含 id + method），Daemon 持有 response 直到用户决策

#### 4. WebSocket 序列号重放
- 每个持久化事件分配全局递增 sequence_number
- 客户端重连时携带 lastSeenSequence
- 服务端从该 sequence 之后 replay 所有事件，发送 `catchup_complete` 后切换为实时推送
- 前端 catch-up 期间缓冲事件，收到 complete 后批量 apply（避免 UI 闪烁）

#### 5. 进程管理双模式
- **stream-json 模式：** 结构化输出，用于聊天视图解析
- **PTY 模式：** node-pty 伪终端，用于 xterm.js 终端视图展示原始 CLI 界面
- 两种模式可同时运行：stream-json 提供事件流，PTY 提供终端输出

#### 6. Orchestrator 实现（参考 open-multi-agent 框架）

**整体模式：Coordinator Agent + TaskQueue + AgentPool**

**a) 任务拆解（Decomposition Phase）**
- Coordinator（临时 Agent，不在团队名册中）接收：用户目标 + Agent 名册（名称、模型、能力描述）
- Prompt 模板要求输出 JSON 任务数组：`[{ title, description, assignee, dependsOn }]`
- 两轮依赖解析：第一轮创建所有 Task 得到 UUID + title→id 映射，第二轮将 dependsOn 中的 title 引用解析为 ID
- Plan Approval Gate：拆解完成后展示给用户，用户确认后才开始执行
- 简单目标短路：正则复杂度检测 + 关键词亲和度评分，简单任务直接路由

**b) 并行调度（Round-based Execution）**
```typescript
// 参考伪代码
while (queue.hasRunnable()) {
  const ready = queue.getByStatus('pending')
  const batch = ready.map(task => {
    queue.update(task.id, { status: 'in_progress' })
    return pool.run(task.assignee, buildTaskPrompt(task, dependencyResults))
  })
  const results = await Promise.allSettled(batch)
}
```

**c) 并发控制（Semaphore + AgentPool）**
- 池级别 Semaphore（maxConcurrency = 5）：限制全局并行任务数
- Agent 级别 Mutex（Semaphore(1)）：同一 Agent 串行执行，防止状态竞争
- FIFO Promise 队列实现公平调度

**d) 依赖结果注入**
- `buildTaskPrompt(task)` 仅注入 task.dependsOn 中已完成任务的 output
- SharedMemory 可选全局访问（key: `agentName:taskId:result`）

**e) 结果合成（Synthesis Phase）**
- 所有任务完成后，Coordinator 接收结构化汇总 prompt
- 按 Completed / Failed / Skipped 分组展示
- Coordinator 生成综合回答作为最终聊天消息

**f) 参考数据结构**
```typescript
// 以下接口为参考设计，实际实现可调整字段
interface Task {
  id: string
  title: string
  description: string
  assignee: string
  dependsOn: string[]
  status: 'pending' | 'blocked' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  result?: { output: string; tokensUsed: number }
  retryCount: number
  maxRetries: number
}

interface TaskQueue {
  add(task: Task): void
  complete(id: string, result: TaskResult): void
  fail(id: string, error: string): void
  skip(id: string): void
  getByStatus(status: TaskStatus): Task[]
  on(event: 'task:ready' | 'task:complete' | 'task:failed', handler): void
}

type OrchestratorEvent =
  | { type: 'decomposition_start'; goal: string }
  | { type: 'decomposition_complete'; tasks: Task[] }
  | { type: 'plan_approved' }
  | { type: 'task_start'; taskId: string; assignee: string }
  | { type: 'task_complete'; taskId: string; output: string }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'synthesis_start' }
  | { type: 'synthesis_complete'; summary: string }
```

### 参考数据模型（实现参考，非需求约束）

> 以下 SQL schema 为参考设计，实际表结构和字段可根据实现需要调整。

```sql
-- 事件存储（核心，append-only）
events (
  sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSON NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- 审批记录
approvals (
  approval_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | approved | denied | timeout
  action_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,       -- critical | high | medium | low
  proposed_action JSON NOT NULL,
  affected_paths JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME
)

-- 自动通过规则
always_allow_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  pattern TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- 会话（对话）
conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  mode TEXT DEFAULT 'single',  -- single | group
  pinned BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  created_at DATETIME,
  updated_at DATETIME
)

-- 会话参与的 Agent
conversation_agents (
  conversation_id TEXT,
  agent_id TEXT,
  PRIMARY KEY (conversation_id, agent_id)
)

-- Agent 定义
agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- claude_code | codex | custom
  avatar_color TEXT,
  system_prompt TEXT,
  capabilities JSON,
  config JSON,                  -- 适配器配置（工作目录、模型等）
  created_at DATETIME
)

-- Pin 的消息
pinned_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  event_sequence_number INTEGER NOT NULL,
  pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Session ID 映射
claude_sessions (
  session_id TEXT PRIMARY KEY,  -- Argo UUID
  claude_id TEXT UNIQUE,        -- Claude 内部 ID
  workspace TEXT,
  created_at DATETIME
)

-- 用户
users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME
)
```

### 性能要求
- 消息列表虚拟滚动，支持 10000+ 条消息
- 流式输出延迟 < 100ms（CLI stdout → 前端渲染）
- 对话列表加载 < 500ms
- WebSocket 重连 + catch-up < 3s
- 事件 replay 吞吐 > 1000 events/s
- 审批响应挂起不超过 60s

### 端口规划
| 服务 | 端口 | 用途 |
|------|------|------|
| Argo Daemon（REST + WS） | 54321 | REST API + WebSocket 连接 + UI 静态文件托管 |
| Hook Server | 54322 | 接收 Claude Code Hook 回调 |
| Vite Dev Server | 5173 | 开发阶段前端 HMR |

### 依赖条件
- 用户本地需安装 Claude Code CLI（支持 Hook 机制的版本）
- 用户本地需安装 Codex CLI（支持 app-server JSON-RPC 的版本）
- 需要有效的 API Key 配置（Claude API 用于 Orchestrator）
- Node.js >= 22
- 无需额外数据库服务（SQLite 随应用自动创建）

---

## Success Metrics

- 用户创建对话到收到第一条 Agent 回复 < 3 秒
- 群聊模式下任务拆解展示 < 5 秒
- 支持同时运行 5+ 个并行对话不卡顿
- 审批请求从 Agent 触发到前端展示 < 500ms
- 代码高亮渲染无明显闪烁
- iframe 预览加载 < 2 秒
- Orchestrator 任务分配准确率 > 80%（人工评估）
- 消息流式输出感知延迟 < 200ms
- WebSocket 断线重连 + 事件追赶 < 3 秒
- 外部 Session 发现延迟 < 10 秒

---

## Open Questions

1. Orchestrator 使用哪个模型做任务拆解？直接用 Claude API 还是可配置？
2. CLI 子进程的并发数量上限如何设置？是否需要队列管理？
3. 自建 Agent 的工具集具体包含哪些预置工具？
4. 对话上下文窗口大小如何确定？（传递最近多少条消息给 Agent）
5. 是否需要支持对话导出（JSON/Markdown）？
6. Claude Code Hook relay 脚本的安全性如何保障？（防止外部请求伪造）
7. 审批自动通过的工具白名单是否应该用户可配置？
8. Orchestrator 拆解失败的 fallback 策略是否需要用户确认？
9. SharedMemory 的 TTL 策略和内存上限如何设置？
10. SQLite 数据文件的存储位置和备份策略？

---

## References

| 参考项目 | 借鉴内容 |
|----------|----------|
| [Agent Cockpit](https://github.com/agent-cockpit/agent-cockpit) | 系统架构（Daemon + EventBus + Provider Adapter）、Claude Hook 集成机制、Codex JSON-RPC 协议、审批队列模式、序列号重放 WebSocket、PTY 双模式、外部 Session 发现、SQLite 本地存储 |
| [open-multi-agent](https://github.com/open-multi-agent/open-multi-agent) | Orchestrator 任务 DAG 拆解、Round-based 并行调度、Semaphore 并发控制、级联失败、依赖结果注入、Coordinator 合成模式、简单目标短路、Plan Approval Gate |
