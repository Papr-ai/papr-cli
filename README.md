# @papr/cli

PAPR Memory-Enhanced Claude CLI - An AI assistant with persistent memory that learns and remembers your conversations, preferences, and context.

## Features

🧠 **Persistent Memory** - Remembers your conversations, preferences, and project context
🎯 **Targeted Context** - Automatically loads relevant memories at session start
🔧 **Vercel AI SDK Support** - Specialized migration guidance for v4→v5 tool calling
⚙️ **Zero Configuration** - One-command setup with sensible defaults
🎨 **Enhanced Interface** - Beautiful ASCII art and organized context display

## Quick Start

```bash
# Install globally
npm install -g @papr/cli

# Initialize PAPR with your API key (get it from dashboard.papr.ai)
papr init

# Start Claude with memory context
papr start
```

## Commands

### `papr init`
Initialize PAPR with Claude CLI and memory hooks. Prompts for:
- PAPR Memory API key (get yours at [dashboard.papr.ai](https://dashboard.papr.ai))

Options:
- `-k, --api-key <key>` - Provide API key directly
- `-w, --workspace <id>` - Set workspace ID

### `papr start`
Launch Claude CLI with PAPR memory context loaded.

Options:
- `--no-memory` - Start in clean mode without memory hooks

### `papr status`
Check PAPR CLI configuration and dependencies.

### `papr update-hooks`
Update memory hooks to the latest version.

### `papr uninstall`
Remove PAPR hooks and restore clean Claude CLI.

## AI Workflow Orchestration

PAPR CLI v1.1.0+ includes a comprehensive workflow orchestration system with 4 specialized agents that coordinate feature development:

### 🧠 Memory Agent
- **Purpose**: Manages conversation context and memory operations
- **Capabilities**: Searches previous conversations, saves important information, provides relevant context
- **Automatic**: Activates when conversations need historical context

### 📋 PRD Agent
- **Purpose**: Creates comprehensive Product Requirements Documents
- **Capabilities**: Researches memory for context, structures requirements, defines success metrics
- **Usage**: Automatically invoked for new feature requests, or manually with complex planning needs

### 🏗️ Architect Agent
- **Purpose**: Technical design and implementation planning
- **Capabilities**: Analyzes codebase patterns, creates technical architecture, breaks down features into tasks
- **Repository Access**: Full access to analyze local repositories with Read, Glob, and Grep tools

### 🔄 Workflow Orchestrator
- **Purpose**: Coordinates multi-agent feature development workflows
- **Capabilities**: Detects workflow needs, manages agent handoffs, tracks progress in memory
- **Intelligence**: Distinguishes between new feature work and continuing existing projects

## Automatic Workflow Process

### For New Features:
```
User Request → Workflow Orchestrator detects "new feature"
     ↓
1. PRD Agent creates requirements (searches memory for context)
     ↓
2. Architect Agent analyzes codebase & creates technical plan + tasks
     ↓
3. Implementation follows task list (updates progress in memory)
```

### For Continuing Work:
```
User Request → Workflow Orchestrator detects "continue work"
     ↓
1. Memory Agent finds existing PRD, architecture, and task progress
     ↓
2. Resume implementation from current task status
     ↓
3. Update progress in memory as work continues
```

### Workflow Triggers

**New Feature Development**:
- "implement", "create feature", "build", "add functionality"
- Complex requirements spanning multiple components
- Features requiring architectural decisions

**Continuing Work**:
- "continue", "keep working on", "update", "modify existing"
- References to specific features or components
- Bug fixes or enhancements to existing functionality

## What You Get

When you run `papr start`, you'll see:

```
██████╗  █████╗ ██████╗ ██████╗
██╔══██╗██╔══██╗██╔══██╗██╔══██╗
██████╔╝███████║██████╔╝██████╔╝
██╔═══╝ ██╔══██║██╔═══╝ ██╔══██╗
██║     ██║  ██║██║     ██║  ██║
╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝
        Memory-Enhanced Claude CLI

🧠 Session Context:
1. Memory: Your coding preferences and recent decisions...
2. Memory: Project priorities and workflow patterns...

🔧 Vercel AI SDK v5 Tool Calling Migration:
1. Migration Guide: Breaking changes in tool definitions...
2. Code Examples: Updated function calling patterns...

---
```

## Memory Context

PAPR CLI automatically searches your memory for:

1. **General Context**
   - User preferences and coding goals
   - Project priorities and workflow preferences
   - Recent decisions and important context
   - Settings, configurations, and patterns

2. **Vercel AI SDK v5 Migration**
   - Tool calling migration guides
   - Breaking changes in tool definitions
   - API updates from v4 to v5
   - Code examples and migration steps

## Requirements

- Node.js 16+
- Claude CLI (automatically installed)
- PAPR Memory API key

## Configuration

PAPR CLI creates/modifies `~/.claude/settings.json` with:

```json
{
  "hooks": {
    "SessionStart": [/* memory hooks */]
  },
  "env": {
    "PAPR_MEMORY_API_KEY": "your-api-key",
    "NEXT_PUBLIC_MEMORY_SERVER_URL": "https://memory.papr.ai",
    "PAPR_WORKSPACE_ID": "your-workspace-id"
  }
}
```

## Troubleshooting

**Memory not loading?**
```bash
papr status  # Check configuration
papr init    # Reconfigure if needed
```

**Claude CLI not found?**
```bash
npm install -g @anthropics/claude
```

**Clean start without memory?**
```bash
papr start --no-memory
```

## API

Get your PAPR Memory API key at [dashboard.papr.ai](https://dashboard.papr.ai)

## Support

- 📖 Documentation: [platform.papr.ai/docs](https://platform.papr.ai/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/papr-ai/papr-cli/issues)
- 💬 Community: [Discord](https://discord.gg/rd4BKfSD)

---

Made with ❤️ by the PAPR team