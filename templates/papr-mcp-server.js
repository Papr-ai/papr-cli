#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');

const Papr = require('@papr/memory').default;

class PaprMemoryServer {
  constructor() {
    this.server = new Server(
      {
        name: 'papr-memory-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_memory',
          description: 'Search through your PAPR memory for relevant information, context, preferences, or past conversations',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Detailed search query describing what you\'re looking for (e.g., "user preferences for coding style", "solutions to API timeout issues")'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of memories to return (default: 15, minimum: 15)',
                default: 15
              }
            },
            required: ['query']
          }
        },
        {
          name: 'add_memory',
          description: 'Save important information to PAPR memory for future reference',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The content to save to memory'
              },
              title: {
                type: 'string',
                description: 'Short descriptive title (auto-generated if not provided)'
              },
              memoryType: {
                type: 'string',
                enum: ['preference', 'goal', 'task', 'general', 'solution', 'insight'],
                description: 'Type of memory: preference (user settings/choices), goal (objectives), task (todo items), general (misc info), solution (problem fixes), insight (learnings)',
                default: 'general'
              },
              topics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Related topics or tags (e.g., ["javascript", "debugging", "api"])'
              },
              importance: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Importance level of this memory',
                default: 'medium'
              }
            },
            required: ['content']
          }
        },
        {
          name: 'get_recent_memories',
          description: 'Get recently saved memories, optionally filtered by topics',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of recent memories to retrieve (default: 15, minimum: 15)',
                default: 15
              },
              topics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by specific topics (optional)'
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'search_memory':
            return await this.handleSearchMemory(args);
          case 'add_memory':
            return await this.handleAddMemory(args);
          case 'get_recent_memories':
            return await this.handleGetRecentMemories(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  createPaprClient() {
    const apiKey = process.env.PAPR_MEMORY_API_KEY;
    if (!apiKey) {
      throw new Error('PAPR_MEMORY_API_KEY environment variable is required');
    }

    return new Papr({
      baseURL: process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai',
      timeout: 15000,
      maxRetries: 2,
      logLevel: 'warn',
      xAPIKey: apiKey,
      defaultHeaders: {
        'X-Client-Type': 'claude_cli_mcp',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  async handleSearchMemory(args) {
    const { query, maxResults = 15 } = args;
    const client = this.createPaprClient();

    const result = await client.memory.search({
      query,
      max_memories: Math.max(maxResults, 15),
      rank_results: true
    });

    if (!result.data?.memories?.length) {
      return {
        content: [{
          type: 'text',
          text: `No memories found for: "${query}"\n\nTip: Try broader search terms or check if memories have been saved on this topic.`
        }]
      };
    }

    const memories = result.data.memories.map(m => ({
      title: m.title || 'Memory',
      content: m.content,
      topics: m.topics || [],
      created: m.created_at,
      type: m.type
    }));

    const formattedResults = memories.map((m, i) =>
      `**${i + 1}. ${m.title}**\n${m.content}\n*Topics: ${m.topics.join(', ') || 'none'}*\n`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${memories.length} relevant memories:\n\n${formattedResults}`
      }]
    };
  }

  async handleAddMemory(args) {
    const {
      content,
      title,
      topics = [],
      memoryType = 'general',
      importance = 'medium'
    } = args;

    const client = this.createPaprClient();

    // Auto-generate title if not provided
    const finalTitle = title || (content.substring(0, 60) + (content.length > 60 ? '...' : ''));

    // Add emoji tags based on memory type
    const emojiTags = ['💬'];
    if (importance === 'high') emojiTags.push('⭐');
    if (memoryType === 'preference') emojiTags.push('⚙️');
    if (memoryType === 'goal') emojiTags.push('🎯');
    if (memoryType === 'task') emojiTags.push('📋');
    if (memoryType === 'solution') emojiTags.push('✅');
    if (memoryType === 'insight') emojiTags.push('💡');

    const metadata = {
      topics: topics.length > 0 ? topics : null,
      'emoji tags': emojiTags,
      'emotion tags': null,
      hierarchical_structures: `Claude CLI > ${memoryType.charAt(0).toUpperCase() + memoryType.slice(1)}`,
      sourceType: 'claude_cli_manual',
      sourceUrl: null,
      location: null,
      customMetadata: {
        memory_type: memoryType,
        importance,
        created_by: 'claude_assistant',
        auto_saved: false,
        timestamp: new Date().toISOString()
      }
    };

    const addParams = {
      content: `${finalTitle}\n\n${content}`,
      type: 'text',
      metadata,
      context: null,
      relationships_json: null
    };

    const result = await client.memory.add(addParams);

    return {
      content: [{
        type: 'text',
        text: `✅ Memory saved successfully!\n\n**Title:** ${finalTitle}\n**Type:** ${memoryType}\n**Topics:** ${topics.join(', ') || 'none'}\n**Memory ID:** ${result.data?.[0]?.memoryId}`
      }]
    };
  }

  async handleGetRecentMemories(args) {
    const { limit = 15, topics = [] } = args;
    const client = this.createPaprClient();

    let query = 'Recent conversations, decisions, and important context from Claude CLI sessions';
    if (topics.length > 0) {
      query += ` related to: ${topics.join(', ')}`;
    }

    const result = await client.memory.search({
      query,
      max_memories: Math.max(limit, 15),
      rank_results: true
    });

    if (!result.data?.memories?.length) {
      return {
        content: [{
          type: 'text',
          text: 'No recent memories found.'
        }]
      };
    }

    const memories = result.data.memories.map(m => ({
      title: m.title || 'Recent Memory',
      content: m.content.substring(0, 200) + (m.content.length > 200 ? '...' : ''),
      topics: m.topics || [],
      created: m.created_at
    }));

    const formattedResults = memories.map((m, i) =>
      `**${i + 1}. ${m.title}**\n${m.content}\n*Topics: ${m.topics.join(', ') || 'none'}*\n`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Recent memories (${memories.length}):\n\n${formattedResults}`
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Papr Memory MCP server running on stdio');
  }
}

const server = new PaprMemoryServer();
server.run().catch(console.error);