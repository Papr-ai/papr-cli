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
        },
        {
          name: 'query_code_graphql',
          description: 'Execute GraphQL queries against indexed code in PAPR Memory. Use introspection to discover schema and query code structure, relationships, and dependencies. This complements search_memory for structured code queries.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'GraphQL query to execute. Use introspection query to discover schema first: "{ __schema { types { name fields { name type { name } } } } }"'
              },
              variables: {
                type: 'object',
                description: 'Variables for the GraphQL query (optional)',
                default: {}
              },
              introspect: {
                type: 'boolean',
                description: 'If true, returns the GraphQL schema for indexed code (shows available types, fields, relationships)',
                default: false
              }
            },
            required: ['query']
          }
        },
        {
          name: 'index_codebase',
          description: 'Index a local codebase directory into PAPR Memory for semantic search and GraphQL queries. Currently supports Python codebases. Creates a knowledge graph of files, functions, classes, and their relationships.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Absolute path to the codebase directory to index (e.g., "/Users/username/projects/my-app")'
              },
              includeTests: {
                type: 'boolean',
                description: 'Include test files in indexing (default: false)',
                default: false
              },
              includeGenerated: {
                type: 'boolean',
                description: 'Include generated files (default: false)',
                default: false
              }
            },
            required: ['directory']
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
          case 'query_code_graphql':
            return await this.handleGraphQLQuery(args);
          case 'index_codebase':
            return await this.handleIndexCodebase(args);
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

    console.error(`[DEBUG] Searching with query: "${query}"`);
    console.error(`[DEBUG] Search params:`, { max_memories: Math.max(maxResults, 15), max_nodes: 15, enable_agentic_graph: true, rank_results: true });

    const result = await client.memory.search({
      query,
      max_memories: Math.max(maxResults, 15),
      max_nodes: 15,
      enable_agentic_graph: true,
      rank_results: true
    });

    console.error(`[DEBUG] API Response status:`, result.status);
    console.error(`[DEBUG] Found memories:`, result.data?.memories?.length || 0);
    console.error(`[DEBUG] Found nodes:`, result.data?.nodes?.length || 0);

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
      max_nodes: 15,
      enable_agentic_graph: true,
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

  async handleGraphQLQuery(args) {
    const { query, variables = {}, introspect = false } = args;
    const client = this.createPaprClient();

    try {
      // Handle introspection query
      if (introspect) {
        const introspectionQuery = `
          {
            __schema {
              types {
                name
                kind
                description
                fields {
                  name
                  type {
                    name
                    kind
                  }
                }
              }
              queryType {
                name
                fields {
                  name
                  description
                  args {
                    name
                    type {
                      name
                    }
                  }
                }
              }
            }
          }
        `;

        const result = await client.graphql.query({
          body: { query: introspectionQuery }
        });

        return {
          content: [{
            type: 'text',
            text: `**GraphQL Schema Introspection**\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
          }]
        };
      }

      // Execute regular GraphQL query
      const result = await client.graphql.query({
        body: { query, variables }
      });

      return {
        content: [{
          type: 'text',
          text: `**GraphQL Query Results**\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ GraphQL query failed: ${error.message}\n\nTip: Use introspect: true to discover the schema first, or check query syntax.`
        }]
      };
    }
  }

  async handleIndexCodebase(args) {
    const { directory, includeTests = false, includeGenerated = false } = args;
    const path = require('path');
    const fs = require('fs');

    // Validate directory exists
    if (!fs.existsSync(directory)) {
      return {
        content: [{
          type: 'text',
          text: `❌ Directory not found: ${directory}\n\nPlease provide an absolute path to an existing directory.`
        }]
      };
    }

    try {
      // Import code indexer (dynamically to avoid issues if not installed)
      const { getCodeIndexer } = require(path.join(__dirname, '..', 'lib', 'code-indexer', 'index.js'));
      const indexer = getCodeIndexer();

      // Initialize schema (creates once per API key if needed)
      const initResult = await indexer.initialize();
      if (!initResult.success) {
        throw new Error(`Initialization failed: ${initResult.error}`);
      }

      // Index the directory
      const result = await indexer.indexDirectory(directory, {
        includeTests,
        includeGenerated
      });

      const summary = `
**Code Indexing Complete**

📂 **Directory:** ${directory}
✅ **Successfully indexed:** ${result.success} files
⏭️ **Skipped:** ${result.skipped} files
❌ **Failed:** ${result.failed} files

${result.success > 0 ? `
**Indexed Files:**
${result.indexed.slice(0, 10).map(f => `- ${path.basename(f.path)} (${f.stats.functions} functions, ${f.stats.classes} classes)`).join('\n')}
${result.indexed.length > 10 ? `\n...and ${result.indexed.length - 10} more files` : ''}
` : ''}

${result.failed > 0 ? `
**Errors:**
${result.errors.slice(0, 5).map(e => `- ${path.basename(e.path)}: ${e.error}`).join('\n')}
${result.errors.length > 5 ? `\n...and ${result.errors.length - 5} more errors` : ''}
` : ''}

💡 **Next steps:**
1. Use \`search_memory\` with queries like "authentication functions" to find code
2. Use \`query_code_graphql\` with introspection to discover the code graph schema
3. Query relationships like "functions that call login_user" using GraphQL
`;

      return {
        content: [{
          type: 'text',
          text: summary
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Code indexing failed: ${error.message}\n\n${error.stack || ''}`
        }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Papr Memory MCP server running on stdio');
  }
}

const server = new PaprMemoryServer();
server.run().catch(console.error);