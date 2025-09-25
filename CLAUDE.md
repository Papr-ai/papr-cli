# Claude Code Configuration for PAPR CLI

## Environment Variables

The following environment variables are required for Papr Memory tools:

- `PAPR_MEMORY_API_KEY`: Your PAPR Memory API key (get it from dashboard.papr.ai)
- `NEXT_PUBLIC_MEMORY_SERVER_URL`: https://memory.papr.ai

## PAPR Workflow Orchestration System

### System Prompt Instructions

When users have PAPR CLI installed, you have access to 4 specialized agents for systematic feature development. Follow these guidelines:

#### Automatic Workflow Detection

**For New Feature Requests:**
When users request new features (keywords: "implement", "create", "build", "add feature"), automatically use this workflow:

1. **Start with Workflow Orchestrator**: Use the `workflow-orchestrator` agent to coordinate the process
2. **PRD Creation**: The orchestrator will invoke the `prd-agent` to research memory and create requirements
3. **Technical Design**: Next, the `architect-agent` will analyze the codebase and create implementation plans
4. **Structured Implementation**: Follow the detailed task breakdown with progress tracking

**For Continuing Work:**
When users want to continue existing work (keywords: "continue", "update", "modify", "keep working"):

1. **Context Recovery**: Use the `papr-memory-agent` to find existing PRDs, architecture, and task progress
2. **Resume Implementation**: Pick up from the current task status
3. **Progress Updates**: Update task completion in memory as work progresses

#### Agent Usage Guidelines

**Use the Workflow Orchestrator when:**
- User requests involve complex, multi-step feature development
- New features require architectural planning
- You need to coordinate between multiple agents
- User asks to "implement a new feature" or similar

**Use the PRD Agent when:**
- Planning new features or major enhancements
- Need to document requirements before implementation
- User asks for "product requirements" or "feature specification"
- Complex features need structured planning

**Use the Architect Agent when:**
- Need to analyze existing codebase patterns
- Design technical architecture for new features
- Break down features into implementable tasks
- User asks about "technical design" or "implementation plan"

**Use the Memory Agent when:**
- Need to search for relevant context or previous decisions
- User references past conversations or work
- Looking for existing patterns or solutions
- User asks "do you remember" or similar

#### Workflow Examples

**Example 1: New Feature Request**
```
User: "I want to implement user authentication in my app"

Response:
1. Use workflow-orchestrator agent to coordinate
2. Agent will invoke prd-agent to create requirements
3. Agent will invoke architect-agent to design technical solution
4. Follow the resulting task breakdown for implementation
```

**Example 2: Continuing Work**
```
User: "Continue working on the authentication feature"

Response:
1. Use papr-memory-agent to search for existing work
2. Find PRD, architecture, and current task status
3. Resume implementation from current progress
4. Update task completion in memory
```

#### Best Practices

1. **Always Research First**: Use memory search before starting new work
2. **Follow the Workflow**: Don't skip PRD or architecture steps for complex features
3. **Track Progress**: Update task status in memory as work progresses
4. **Maintain Context**: Cross-reference PRDs, architecture, and tasks
5. **Repository Analysis**: Use architect agent's codebase analysis for consistency

#### Integration with Memory Tools

The workflow agents complement your existing PAPR Memory capabilities:
- **Agents coordinate high-level workflows**
- **Memory tools handle specific operations**
- **Both save context to memory for continuity**

### Manual Agent Invocation

You can also manually invoke agents using the Task tool:

```typescript
// For workflow coordination
await Task({
  description: "Coordinate feature development",
  prompt: "Manage the development of [feature] following the systematic workflow",
  subagent_type: "workflow-orchestrator"
});

// For PRD creation
await Task({
  description: "Create product requirements",
  prompt: "Research memory and create comprehensive PRD for [feature]",
  subagent_type: "prd-agent"
});

// For technical design
await Task({
  description: "Design architecture and tasks",
  prompt: "Analyze codebase and create implementation plan for [feature]",
  subagent_type: "architect-agent"
});

// For memory operations
await Task({
  description: "Search project context",
  prompt: "Find relevant context and previous work for [topic]",
  subagent_type: "papr-memory-agent"
});
```

## Setup Instructions

1. Install PAPR CLI globally:
   ```bash
   npm install -g @papr/cli
   ```

2. Initialize with your API key:
   ```bash
   papr init
   ```

3. Start Claude Code with PAPR workflow orchestration:
   ```bash
   papr start
   ```

The workflow agents will be automatically installed to `~/.claude/agents/` and available for use in Claude Code sessions.

## Available Agents

- **papr-memory-agent** - Context and memory management
- **prd-agent** - Product Requirements Document creation
- **architect-agent** - Technical architecture and task planning
- **workflow-orchestrator** - Multi-agent workflow coordination

These agents work together to provide systematic, well-documented feature development with proper task tracking and architectural consistency.