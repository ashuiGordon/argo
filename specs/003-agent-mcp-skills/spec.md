# Feature Specification: Agent MCP and Skill Configuration

**Feature Branch**: `003-agent-mcp-skills`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "Add the ability to configure MCP servers and skills/slash commands for each agent in Argo, passing them to CLI on launch"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure MCP Servers for an Agent (Priority: P1)

A platform administrator wants to equip a specific agent with external tool access by adding MCP server configurations. They open the agent settings form, add one or more MCP server entries (each with a server name, launch command, arguments, and optional environment variables), and save. The next time that agent is launched in a conversation, it automatically connects to the configured MCP servers and can use the tools they expose.

**Why this priority**: MCP servers are the primary extensibility mechanism for Claude Code — without them, agents cannot access project-specific tools (databases, APIs, file systems, custom commands). This is the core capability enabling real-world workflows.

**Independent Test**: Can be tested by configuring an MCP server on an agent, starting a conversation, and verifying the agent has access to tools provided by that MCP server.

**Acceptance Scenarios**:

1. **Given** an agent with no MCP servers configured, **When** the user adds an MCP server with name "filesystem", command "npx", args ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], **Then** the configuration is saved and displayed in the agent settings.
2. **Given** an agent with one MCP server configured, **When** the user starts a conversation with that agent, **Then** the agent process is launched with the MCP server accessible and the agent can invoke tools from that server.
3. **Given** an agent with multiple MCP servers configured, **When** one MCP server has an invalid command, **Then** the agent still launches successfully with the valid servers, and the user is notified about the failed server.
4. **Given** an agent with MCP servers, **When** the user removes one MCP server entry and saves, **Then** subsequent conversations no longer include that server.

---

### User Story 2 - Configure Custom Skills for an Agent (Priority: P2)

A platform administrator wants to give an agent custom slash commands/skills that provide domain-specific instructions. They open the agent settings, navigate to the skills section, and add a skill entry with a name, description, and prompt body (the instruction text that will be injected when the skill is invoked). On save, the agent will have these skills available during conversations.

**Why this priority**: Skills allow tailoring agent behavior for specific workflows (e.g., "/deploy", "/review-code", "/run-tests") without modifying the system prompt. This enhances agent specialization but is secondary to MCP server access which provides actual tool capabilities.

**Independent Test**: Can be tested by adding a skill to an agent, launching a conversation, and verifying the agent recognizes and can execute the custom skill.

**Acceptance Scenarios**:

1. **Given** an agent with no skills configured, **When** the user adds a skill with name "deploy", description "Deploy the current branch", and a prompt body, **Then** the skill is saved and visible in agent settings.
2. **Given** an agent with a configured skill, **When** the agent is launched in a conversation, **Then** the skill is available to the agent and can be triggered.
3. **Given** an agent with skills configured, **When** the user edits a skill's prompt body and saves, **Then** subsequent conversations use the updated prompt.

---

### User Story 3 - Manage Configurations via Agent Form UI (Priority: P3)

A user interacts with the agent creation/editing form to visually manage MCP servers and skills. The form provides intuitive controls for adding/removing entries, with proper validation (required fields highlighted, format guidance for args arrays).

**Why this priority**: A polished UI experience makes the configuration accessible to non-technical users, but the underlying capability (P1, P2) can function with minimal UI initially.

**Independent Test**: Can be tested by opening the agent form, adding/editing/removing MCP and skill entries, and verifying form validation and persistence.

**Acceptance Scenarios**:

1. **Given** the agent creation form is open, **When** the user clicks "Add MCP Server", **Then** a new entry form appears with fields for name, command, args, and env.
2. **Given** an MCP server entry with missing required fields (name, command), **When** the user attempts to save, **Then** validation errors are shown on the empty required fields.
3. **Given** an existing agent with 3 MCP servers and 2 skills, **When** the user opens the edit form, **Then** all existing configurations are displayed and editable.
4. **Given** a skill entry, **When** the user clicks the remove button, **Then** the skill is removed from the list (pending save confirmation).

---

### Edge Cases

- What happens when an MCP server command path does not exist on the host system? The agent should still launch; the unavailable server is reported as a warning event.
- What happens when a skill name conflicts with a built-in slash command? The system should reject the save with a validation error indicating the name is reserved.
- How does the system handle very long skill prompt bodies (>10,000 characters)? A maximum length is enforced with user feedback.
- What happens if the same MCP server name is used twice on one agent? Duplicate names are rejected at validation time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add zero or more MCP server configurations to any agent.
- **FR-002**: Each MCP server configuration MUST include: name (unique per agent), command (binary path or executable name), and args (ordered list of string arguments).
- **FR-003**: Each MCP server configuration MAY include: environment variables (key-value pairs) passed to the server process.
- **FR-004**: System MUST allow users to add zero or more skill configurations to any agent.
- **FR-005**: Each skill configuration MUST include: name (unique per agent, no spaces, lowercase with hyphens), description (short human-readable summary), and prompt body (instruction text).
- **FR-006**: System MUST pass configured MCP servers to the agent CLI when launching a session so the agent can use the exposed tools.
- **FR-007**: System MUST pass configured skills to the agent CLI or inject them via settings/configuration so the agent recognizes them as available commands.
- **FR-008**: System MUST validate MCP server names are unique within a single agent's configuration.
- **FR-009**: System MUST validate skill names are unique within a single agent and do not conflict with reserved/built-in names.
- **FR-010**: System MUST persist MCP and skill configurations durably so they survive daemon restarts.
- **FR-011**: System MUST display existing MCP and skill configurations when editing an agent.
- **FR-012**: System MUST allow removal of individual MCP server or skill entries.
- **FR-013**: Skill prompt body MUST be limited to 10,000 characters maximum.
- **FR-014**: System MUST gracefully handle MCP server launch failures without preventing the agent session from starting.

### Key Entities

- **McpServerConfig**: Represents a configured MCP server for an agent — has name, command, args list, and optional env map. Belongs to one Agent.
- **SkillConfig**: Represents a custom skill/slash command for an agent — has name, description, and prompt body. Belongs to one Agent.
- **Agent**: Extended to contain collections of McpServerConfig and SkillConfig.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure an MCP server on an agent and verify tool access in under 2 minutes.
- **SC-002**: Users can create a custom skill and trigger it in a conversation within 1 minute of saving.
- **SC-003**: 100% of configured MCP servers are passed to the agent CLI on every session launch (when the server binary is available).
- **SC-004**: Agent launch time increases by no more than 500ms when 5 MCP servers are configured.
- **SC-005**: All configuration changes persist across daemon restarts with zero data loss.

## Assumptions

- Users have the MCP server binaries installed on the host system (Argo does not manage MCP server installation).
- Claude Code supports `--mcp-config` flag or settings-based MCP configuration for passing server definitions.
- Codex either supports MCP natively or skills/MCP will be injected via system prompt augmentation.
- The existing agent form UI can be extended with additional sections without a full redesign.
- Reserved skill names (built-in Claude Code slash commands) are a known, finite list that can be hardcoded for validation.
