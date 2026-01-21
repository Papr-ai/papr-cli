#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');

const Papr = require('@papr/memory').default;

// Log file for debugging
const LOG_FILE = path.join(process.env.HOME || '/tmp', '.papr-mcp-debug.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
  console.error(logLine.trim()); // Also log to stderr for immediate visibility
}

class PaprMemoryServer {
  constructor() {
    log(`[INIT] Starting PaprMemoryServer`);
    log(`[INIT] PAPR_MEMORY_API_KEY: ${process.env.PAPR_MEMORY_API_KEY ? 'SET (' + process.env.PAPR_MEMORY_API_KEY.substring(0, 8) + '...)' : 'NOT SET'}`);
    log(`[INIT] PAPR_API_KEY: ${process.env.PAPR_API_KEY ? 'SET (' + process.env.PAPR_API_KEY.substring(0, 8) + '...)' : 'NOT SET'}`);
    log(`[INIT] NEXT_PUBLIC_MEMORY_SERVER_URL: ${process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'NOT SET'}`);

    this.server = new Server(
      {
        name: 'papr-memory',
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
    log(`[INIT] Server setup complete`);
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      log(`[MCP Error] ${error}`);
      console.error('[MCP Error]', error);
    };
    process.on('SIGINT', async () => {
      log(`[SHUTDOWN] Received SIGINT`);
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // Tool definitions matching Python MCP server API exactly
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_memory',
          description: 'Search through memories with authentication required. Returns matching memories and knowledge graph nodes.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Detailed search query describing what you\'re looking for'
              },
              max_memories: {
                type: 'integer',
                description: 'Maximum number of memories to return (recommended: 15-20)',
                default: 20
              },
              max_nodes: {
                type: 'integer',
                description: 'Maximum number of neo nodes to return (recommended: 10-15)',
                default: 15
              },
              rank_results: {
                type: 'boolean',
                description: 'Whether to enable additional ranking of search results',
                default: false
              },
              enable_agentic_graph: {
                type: 'boolean',
                description: 'Enable agentic graph search for intelligent results',
                default: false
              },
              user_id: {
                type: 'string',
                description: 'Optional internal user ID to filter search results'
              },
              external_user_id: {
                type: 'string',
                description: 'Optional external user ID to filter search results'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata filter'
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'add_memory',
          description: 'Add a new memory item to Papr Memory API.',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The content of the memory item'
              },
              type: {
                type: 'string',
                description: 'Type of memory (text, code_snippet, document)',
                default: 'text'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata for the memory item'
              },
              context: {
                type: 'array',
                items: { type: 'object' },
                description: 'Optional context for the memory item'
              },
              relationships_json: {
                type: 'array',
                items: { type: 'object' },
                description: 'Optional relationships for Graph DB'
              },
              skip_background_processing: {
                type: 'boolean',
                description: 'Skip background processing if True',
                default: false
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['content']
          }
        },
        {
          name: 'get_memory',
          description: 'Retrieve a memory item by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              memory_id: {
                type: 'string',
                description: 'The ID of the memory item to retrieve'
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['memory_id']
          }
        },
        {
          name: 'update_memory',
          description: 'Update an existing memory item.',
          inputSchema: {
            type: 'object',
            properties: {
              memory_id: {
                type: 'string',
                description: 'The ID of the memory item to update'
              },
              content: {
                type: 'string',
                description: 'New content for the memory item'
              },
              type: {
                type: 'string',
                description: 'New type for the memory item'
              },
              metadata: {
                type: 'object',
                description: 'Updated metadata for the memory item'
              },
              context: {
                type: 'array',
                items: { type: 'object' },
                description: 'Updated context for the memory item'
              },
              relationships_json: {
                type: 'array',
                items: { type: 'object' },
                description: 'Updated relationships for Graph DB'
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['memory_id']
          }
        },
        {
          name: 'delete_memory',
          description: 'Delete a memory item by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              memory_id: {
                type: 'string',
                description: 'The ID of the memory item to delete'
              },
              skip_parse: {
                type: 'boolean',
                description: 'Skip Parse Server deletion if True',
                default: false
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['memory_id']
          }
        },
        {
          name: 'add_memory_batch',
          description: 'Add multiple memory items in a batch with size validation and background processing.',
          inputSchema: {
            type: 'object',
            properties: {
              memories: {
                type: 'array',
                items: { type: 'object' },
                description: 'List of memory items to add in batch (max 50)'
              },
              user_id: {
                type: 'string',
                description: 'Internal user ID for all memories in the batch'
              },
              external_user_id: {
                type: 'string',
                description: 'External user ID for all memories in the batch'
              },
              batch_size: {
                type: 'integer',
                description: 'Number of items to process in parallel (default: 10)',
                default: 10
              },
              skip_background_processing: {
                type: 'boolean',
                description: 'Skip background processing if True',
                default: false
              },
              webhook_url: {
                type: 'string',
                description: 'Optional webhook URL to notify when batch processing is complete'
              },
              webhook_secret: {
                type: 'string',
                description: 'Optional secret key for webhook authentication'
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['memories']
          }
        },
        {
          name: 'submit_feedback',
          description: 'Submit feedback on search results to help improve model performance.',
          inputSchema: {
            type: 'object',
            properties: {
              search_id: {
                type: 'string',
                description: 'The search_id from SearchResponse that this feedback relates to'
              },
              feedback_type: {
                type: 'string',
                description: 'Type of feedback (thumbs_up, thumbs_down, rating, etc.)'
              },
              feedback_source: {
                type: 'string',
                description: 'Source of feedback (inline, external, etc.)',
                default: 'inline'
              },
              feedback_text: {
                type: 'string',
                description: 'Optional text feedback'
              },
              feedback_score: {
                type: 'number',
                description: 'Optional numerical score'
              },
              cited_memory_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of cited memory IDs'
              },
              cited_node_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of cited node IDs'
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['search_id', 'feedback_type']
          }
        },
        {
          name: 'submit_batch_feedback',
          description: 'Submit multiple feedback items in a single request.',
          inputSchema: {
            type: 'object',
            properties: {
              feedback_items: {
                type: 'array',
                items: { type: 'object' },
                description: 'List of feedback items to submit (max 100)'
              },
              session_context: {
                type: 'object',
                description: 'Optional session-level context for batch feedback'
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['feedback_items']
          }
        },
        {
          name: 'query_code_graphql',
          description: 'Execute GraphQL queries against indexed code in PAPR Memory. Use introspection to discover schema and query code structure, relationships, and dependencies.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'GraphQL query to execute. Use introspection query to discover schema first.'
              },
              variables: {
                type: 'object',
                description: 'Variables for the GraphQL query (optional)',
                default: {}
              },
              introspect: {
                type: 'boolean',
                description: 'If true, returns the GraphQL schema for indexed code',
                default: false
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'index_codebase',
          description: 'Index a local codebase directory into PAPR Memory for semantic search and GraphQL queries.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Absolute path to the codebase directory to index'
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
              },
              api_key: {
                type: 'string',
                description: 'Optional API key. If not provided, uses PAPR_MEMORY_API_KEY environment variable.'
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
        log(`[TOOL CALL] Tool: ${name}, Args: ${JSON.stringify(args)}`);

        let result;
        switch (name) {
          case 'search_memory':
            result = await this.handleSearchMemory(args);
            log(`[TOOL RESULT] search_memory returned ${result.content?.length || 0} content items`);
            return result;
          case 'add_memory':
            result = await this.handleAddMemory(args);
            log(`[TOOL RESULT] add_memory completed`);
            return result;
          case 'get_memory':
            result = await this.handleGetMemory(args);
            log(`[TOOL RESULT] get_memory completed`);
            return result;
          case 'update_memory':
            result = await this.handleUpdateMemory(args);
            log(`[TOOL RESULT] update_memory completed`);
            return result;
          case 'delete_memory':
            result = await this.handleDeleteMemory(args);
            log(`[TOOL RESULT] delete_memory completed`);
            return result;
          case 'add_memory_batch':
            result = await this.handleAddMemoryBatch(args);
            log(`[TOOL RESULT] add_memory_batch completed`);
            return result;
          case 'submit_feedback':
            result = await this.handleSubmitFeedback(args);
            log(`[TOOL RESULT] submit_feedback completed`);
            return result;
          case 'submit_batch_feedback':
            result = await this.handleSubmitBatchFeedback(args);
            log(`[TOOL RESULT] submit_batch_feedback completed`);
            return result;
          case 'query_code_graphql':
            result = await this.handleGraphQLQuery(args);
            log(`[TOOL RESULT] query_code_graphql completed`);
            return result;
          case 'index_codebase':
            result = await this.handleIndexCodebase(args);
            log(`[TOOL RESULT] index_codebase completed`);
            return result;
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        log(`[TOOL ERROR] ${error.message}`);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  createPaprClient(apiKeyFromArgs = null) {
    // Priority: 1. api_key from tool args, 2. PAPR_MEMORY_API_KEY env, 3. PAPR_API_KEY env
    const apiKey = apiKeyFromArgs || process.env.PAPR_MEMORY_API_KEY || process.env.PAPR_API_KEY;
    if (!apiKey) {
      throw new Error('API key is required. Pass api_key parameter or set PAPR_MEMORY_API_KEY environment variable.');
    }

    return new Papr({
      baseURL: process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai',
      timeout: 30000,
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
    const {
      query,
      max_memories = 20,
      max_nodes = 15,
      rank_results = false,
      enable_agentic_graph = false,
      user_id,
      external_user_id,
      metadata,
      api_key
    } = args;

    const client = this.createPaprClient(api_key);

    log(`[DEBUG] Searching with query: "${query}"`);
    log(`[DEBUG] Search params: max_memories=${max_memories}, max_nodes=${max_nodes}, rank_results=${rank_results}, enable_agentic_graph=${enable_agentic_graph}`);

    const searchParams = {
      query,
      max_memories,
      max_nodes,
      rank_results,
      enable_agentic_graph
    };

    if (user_id) searchParams.user_id = user_id;
    if (external_user_id) searchParams.external_user_id = external_user_id;
    if (metadata) searchParams.metadata = metadata;

    const result = await client.memory.search(searchParams);

    log(`[DEBUG] API Response status: ${result.status}`);
    log(`[DEBUG] Found memories: ${result.data?.memories?.length || 0}`);
    log(`[DEBUG] Found nodes: ${result.data?.nodes?.length || 0}`);

    // Return raw data for the caller to process
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: result.status,
          search_id: result.data?.search_id,
          memories: result.data?.memories || [],
          nodes: result.data?.nodes || [],
          total_memories: result.data?.memories?.length || 0,
          total_nodes: result.data?.nodes?.length || 0
        }, null, 2)
      }]
    };
  }

  async handleAddMemory(args) {
    const {
      content,
      type = 'text',
      metadata,
      context,
      relationships_json,
      skip_background_processing = false,
      api_key
    } = args;

    const client = this.createPaprClient(api_key);

    const addParams = {
      content,
      type,
      skip_background_processing
    };

    if (metadata) addParams.metadata = metadata;
    if (context) addParams.context = context;
    if (relationships_json) addParams.relationships_json = relationships_json;

    const result = await client.memory.add(addParams);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          memory_id: result.data?.[0]?.memoryId,
          data: result.data
        }, null, 2)
      }]
    };
  }

  async handleGetMemory(args) {
    const { memory_id, api_key } = args;
    const client = this.createPaprClient(api_key);

    const result = await client.memory.get(memory_id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  async handleUpdateMemory(args) {
    const {
      memory_id,
      content,
      type,
      metadata,
      context,
      relationships_json,
      api_key
    } = args;

    const client = this.createPaprClient(api_key);

    const updateParams = { memory_id };
    if (content) updateParams.content = content;
    if (type) updateParams.type = type;
    if (metadata) updateParams.metadata = metadata;
    if (context) updateParams.context = context;
    if (relationships_json) updateParams.relationships_json = relationships_json;

    const result = await client.memory.update(updateParams);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  async handleDeleteMemory(args) {
    const { memory_id, skip_parse = false, api_key } = args;
    const client = this.createPaprClient(api_key);

    const result = await client.memory.delete(memory_id, { skip_parse });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  async handleAddMemoryBatch(args) {
    const {
      memories,
      user_id,
      external_user_id,
      batch_size = 10,
      skip_background_processing = false,
      webhook_url,
      webhook_secret,
      api_key
    } = args;

    const client = this.createPaprClient(api_key);

    const batchParams = {
      memories,
      batch_size,
      skip_background_processing
    };

    if (user_id) batchParams.user_id = user_id;
    if (external_user_id) batchParams.external_user_id = external_user_id;
    if (webhook_url) batchParams.webhook_url = webhook_url;
    if (webhook_secret) batchParams.webhook_secret = webhook_secret;

    const result = await client.memory.addBatch(batchParams);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  async handleSubmitFeedback(args) {
    const {
      search_id,
      feedback_type,
      feedback_source = 'inline',
      feedback_text,
      feedback_score,
      cited_memory_ids,
      cited_node_ids,
      api_key
    } = args;

    const client = this.createPaprClient(api_key);

    const feedbackParams = {
      search_id,
      feedback_type,
      feedback_source
    };

    if (feedback_text) feedbackParams.feedback_text = feedback_text;
    if (feedback_score !== undefined) feedbackParams.feedback_score = feedback_score;
    if (cited_memory_ids) feedbackParams.cited_memory_ids = cited_memory_ids;
    if (cited_node_ids) feedbackParams.cited_node_ids = cited_node_ids;

    const result = await client.feedback.submit(feedbackParams);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  async handleSubmitBatchFeedback(args) {
    const { feedback_items, session_context, api_key } = args;
    const client = this.createPaprClient(api_key);

    const batchParams = { feedback_items };
    if (session_context) batchParams.session_context = session_context;

    const result = await client.feedback.submitBatch(batchParams);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  async handleGraphQLQuery(args) {
    const { query, variables = {}, introspect = false, api_key } = args;
    const client = this.createPaprClient(api_key);

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
            text: JSON.stringify(result, null, 2)
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
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            hint: 'Use introspect: true to discover the schema first, or check query syntax.'
          }, null, 2)
        }]
      };
    }
  }

  async handleIndexCodebase(args) {
    const { directory, includeTests = false, includeGenerated = false, api_key } = args;

    // If api_key provided, set it in environment for code indexer
    if (api_key) {
      process.env.PAPR_MEMORY_API_KEY = api_key;
      process.env.PAPR_API_KEY = api_key;
    }

    // Validate directory exists
    if (!fs.existsSync(directory)) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Directory not found: ${directory}`,
            hint: 'Please provide an absolute path to an existing directory.'
          }, null, 2)
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

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            directory,
            success_count: result.success,
            skipped_count: result.skipped,
            failed_count: result.failed,
            indexed_files: result.indexed?.slice(0, 20).map(f => ({
              path: f.path,
              functions: f.stats.functions,
              classes: f.stats.classes
            })),
            errors: result.errors?.slice(0, 10)
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            stack: error.stack
          }, null, 2)
        }]
      };
    }
  }

  async run() {
    log(`[RUN] Starting MCP server transport`);
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log(`[RUN] MCP server connected and ready`);
    console.error('Papr Memory MCP server running on stdio');
  }
}

log(`[STARTUP] Creating PaprMemoryServer instance`);
const server = new PaprMemoryServer();
server.run().catch((err) => {
  log(`[ERROR] Server run failed: ${err.message}`);
  console.error(err);
});
