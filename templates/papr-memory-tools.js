#!/usr/bin/env node

const Papr = require('@papr/memory').default;

// Initialize PAPR client
function createPaprClient() {
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
      'X-Client-Type': 'claude_cli_tools',
      'Accept-Encoding': 'gzip'
    }
  });
}

// Tool implementations
const tools = {
  searchMemory: async ({ query, maxResults = 15, enableAgenticGraph = true }) => {
    try {
      const client = createPaprClient();

      const result = await client.memory.search({
        query,
        max_memories: Math.max(maxResults, 15), // Ensure minimum 15
        max_nodes: 15, // Recommended for graph entity relationships
        enable_agentic_graph: enableAgenticGraph,
        rank_results: true
      });

      if (!result.data?.memories?.length) {
        return {
          success: true,
          results: [],
          message: `No memories found for: "${query}"`
        };
      }

      const memories = result.data.memories.map(m => ({
        title: m.title || 'Memory',
        content: m.content.substring(0, 300) + (m.content.length > 300 ? '...' : ''),
        topics: m.topics || [],
        created: m.created_at,
        type: m.type
      }));

      return {
        success: true,
        results: memories,
        total: memories.length,
        message: `Found ${memories.length} relevant memories`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to search memories'
      };
    }
  },

  addMemory: async ({ content, title, topics = [], type = 'text', memoryType = 'general', importance = 'medium' }) => {
    try {
      const client = createPaprClient();

      // Auto-generate title if not provided
      if (!title) {
        title = content.substring(0, 60) + (content.length > 60 ? '...' : '');
      }

      // Add emoji tags based on memory type and content
      const emojiTags = ['💬'];
      if (importance === 'high') emojiTags.push('⭐');
      if (memoryType === 'preference') emojiTags.push('⚙️');
      if (memoryType === 'goal') emojiTags.push('🎯');
      if (memoryType === 'task') emojiTags.push('📋');
      if (memoryType === 'solution') emojiTags.push('✅');
      if (memoryType === 'insight') emojiTags.push('💡');
      if (topics.includes('bug') || topics.includes('error')) emojiTags.push('🐛');

      // Use proper PAPR SDK types
      const metadata = {
        topics: topics.length > 0 ? topics : null,
        'emoji tags': emojiTags,
        'emotion tags': null,
        hierarchical_structures: `Claude CLI > ${memoryType.charAt(0).toUpperCase() + memoryType.slice(1)}`,
        sourceType: 'claude_cli_manual',
        sourceUrl: null,
        location: null,
        customMetadata: {
          memory_type: memoryType,      // preference, goal, task, general, solution, insight
          importance,                   // high, medium, low
          created_by: 'claude_assistant',
          auto_saved: false,
          timestamp: new Date().toISOString()
        }
      };

      const addParams = {
        content: `${title}\n\n${content}`,
        type: type,
        metadata,
        context: null,
        relationships_json: null
      };

      const result = await client.memory.add(addParams);

      return {
        success: true,
        memoryId: result.data?.[0]?.memoryId,
        title,
        message: `Memory saved: "${title}"`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to save memory'
      };
    }
  },

  getRecentMemories: async ({ limit = 5, topics = [] }) => {
    try {
      const client = createPaprClient();

      let query = 'Recent conversations, decisions, and important context from Claude CLI sessions';
      if (topics.length > 0) {
        query += ` related to: ${topics.join(', ')}`;
      }

      const result = await client.memory.search({
        query,
        max_memories: limit,
        max_nodes: 15,
        enable_agentic_graph: true,
        rank_results: true
      });

      if (!result.data?.memories?.length) {
        return {
          success: true,
          results: [],
          message: 'No recent memories found'
        };
      }

      const memories = result.data.memories.map(m => ({
        title: m.title || 'Recent Memory',
        content: m.content.substring(0, 200) + (m.content.length > 200 ? '...' : ''),
        topics: m.topics || [],
        created: m.created_at
      }));

      return {
        success: true,
        results: memories,
        total: memories.length,
        message: `Found ${memories.length} recent memories`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve recent memories'
      };
    }
  },

  graphqlQuery: async ({ query, variables = {}, operationName = null, introspect = false }) => {
    try {
      const client = createPaprClient();

      // Handle introspection query to discover schema
      if (introspect) {
        const introspectionQuery = `
          query IntrospectionQuery {
            __schema {
              queryType { name }
              mutationType { name }
              types {
                name
                kind
                description
                fields {
                  name
                  description
                  args {
                    name
                    type { name kind ofType { name kind } }
                  }
                  type {
                    name
                    kind
                    ofType { name kind }
                  }
                }
              }
            }
          }
        `;

        const result = await client.graphql.query({
          body: {
            query: introspectionQuery,
            operationName: 'IntrospectionQuery'
          }
        });

        return {
          success: true,
          data: result,
          message: 'GraphQL schema introspection successful'
        };
      }

      // Execute regular GraphQL query
      const body = {
        query,
        variables
      };

      if (operationName) {
        body.operationName = operationName;
      }

      const result = await client.graphql.query({ body });

      return {
        success: true,
        data: result,
        message: 'GraphQL query executed successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'GraphQL query failed',
        hint: 'Try using introspect: true to discover the available schema first'
      };
    }
  }
};

// Handle tool execution
async function executeTool() {
  try {
    const input = process.stdin.read();
    if (!input) {
      // Wait for input if none available
      process.stdin.on('data', async (data) => {
        await processInput(data.toString());
      });
      return;
    }

    await processInput(input.toString());
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function processInput(input) {
  try {
    const { tool, parameters } = JSON.parse(input);

    if (!tools[tool]) {
      throw new Error(`Unknown tool: ${tool}`);
    }

    const result = await tools[tool](parameters || {});
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

// Run if called directly
if (require.main === module) {
  executeTool();
}

module.exports = { tools };