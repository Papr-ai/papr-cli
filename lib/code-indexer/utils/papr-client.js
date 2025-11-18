/**
 * PAPR Memory API Client for Code Indexing
 * Handles schema creation, memory addition with graph_override, and GraphQL queries
 */

const Papr = require('@papr/memory').default;

class PaprCodeIndexer {
  constructor() {
    this.client = null;
    this.schemaId = null;
  }

  /**
   * Initialize PAPR client
   * @returns {Papr} - PAPR client instance
   */
  getClient() {
    if (!this.client) {
      const apiKey = process.env.PAPR_MEMORY_API_KEY;

      if (!apiKey) {
        throw new Error('PAPR_MEMORY_API_KEY environment variable is required');
      }

      this.client = new Papr({
        baseURL: process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai',
        timeout: 30000,  // 30 seconds for large graph uploads
        maxRetries: 3,
        logLevel: 'warn',
        xAPIKey: apiKey,
        defaultHeaders: {
          'X-Client-Type': 'papr_cli_code_indexer',
          'Accept-Encoding': 'gzip'
        }
      });
    }

    return this.client;
  }

  /**
   * Create or update code graph schema via direct HTTP API
   * @param {Object} schema - Schema definition
   * @returns {Promise<Object>} - Schema creation result
   */
  async createSchema(schema) {
    try {
      const apiKey = process.env.PAPR_MEMORY_API_KEY;
      const baseURL = process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai';

      const fetch = require('node-fetch');

      // Try to create schema via HTTP POST
      const response = await fetch(`${baseURL}/v1/schemas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(schema)
      });

      const result = await response.json();

      if (response.ok && result.success && result.data?.id) {
        this.schemaId = result.data.id;
        console.log(`✓ Schema created: ${this.schemaId}`);
        return { success: true, schemaId: this.schemaId };
      }

      // Handle error
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
      }

      throw new Error('Failed to create schema');
    } catch (error) {
      // If schema already exists, try to fetch it
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        const schemas = await this.listSchemas();
        const existingSchema = schemas.find(s => s.name === schema.name);

        if (existingSchema) {
          this.schemaId = existingSchema.id;
          console.log(`✓ Using existing schema: ${this.schemaId}`);
          return { success: true, schemaId: this.schemaId, existing: true };
        }
      }

      throw error;
    }
  }

  /**
   * List available schemas via direct HTTP API
   * @returns {Promise<Array>} - List of schemas
   */
  async listSchemas() {
    try {
      const apiKey = process.env.PAPR_MEMORY_API_KEY;
      const baseURL = process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai';

      const fetch = require('node-fetch');

      const response = await fetch(`${baseURL}/v1/schemas`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return result.data || [];
      }

      return [];
    } catch (error) {
      console.warn('Failed to list schemas:', error.message);
      return [];
    }
  }

  /**
   * Add code to memory with graph generation (using SDK)
   * @param {Object} params - Memory parameters
   * @param {string} params.content - Memory content (rich text with code context)
   * @param {Object} params.metadata - Metadata (file path, language, topics)
   * @param {Object} params.graphOverride - Graph nodes and relationships
   * @returns {Promise<Object>} - Memory addition result
   */
  async addCodeMemory({ content, metadata, graphOverride }) {
    try {
      const client = this.getClient();

      // Prepare memory parameters with graph_generation (not graph_override)
      const memoryParams = {
        content,
        type: 'text',
        metadata: {
          topics: metadata.topics || [],
          'emoji tags': metadata.emojiTags || ['💻'],
          sourceType: 'code_indexer',
          sourceUrl: null,
          location: null,
          customMetadata: {
            file_path: metadata.filePath,
            language: metadata.language,
            node_count: graphOverride?.nodes?.length || 0,
            relationship_count: graphOverride?.relationships?.length || 0,
            indexed_at: new Date().toISOString()
          }
        },
        context: [],
        relationships_json: []
      };

      // Add graph_generation with manual mode if graphOverride is provided
      if (graphOverride && graphOverride.nodes && graphOverride.nodes.length > 0) {
        memoryParams.graph_generation = {
          mode: 'manual',
          manual: {
            nodes: graphOverride.nodes,
            relationships: graphOverride.relationships || []
          }
        };

        // Log what we're sending
        console.log('\n=== GRAPH GENERATION REQUEST ===');
        console.log(`Mode: ${memoryParams.graph_generation.mode}`);
        console.log(`Schema: ${this.schemaId} (inferred from node labels)`);
        console.log(`Nodes: ${memoryParams.graph_generation.manual.nodes.length}`);
        console.log(`Relationships: ${memoryParams.graph_generation.manual.relationships.length}`);
        console.log('Sample node:', JSON.stringify(memoryParams.graph_generation.manual.nodes[0], null, 2));
        console.log('Sample relationship:', JSON.stringify(memoryParams.graph_generation.manual.relationships[0], null, 2));
        console.log('=== END REQUEST ===\n');
      }

      // Use SDK to add memory
      const result = await client.memory.add(memoryParams);

      // Log the full response to see what graph_generation returns
      console.log('\n=== FULL SDK RESPONSE ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('=== END RESPONSE ===\n');

      if (result.status === 'success' && result.data) {
        // Check if graph nodes were created
        const hasGraphData = result.data[0]?.graph_nodes || result.data[0]?.relationships;
        console.log(`Graph nodes created: ${!!hasGraphData}`);

        return {
          success: true,
          memoryId: result.data[0]?.memoryId || result.data?.memoryId,
          nodeCount: graphOverride?.nodes?.length || 0,
          relationshipCount: graphOverride?.relationships?.length || 0,
          rawResponse: result.data[0] // Include full response for debugging
        };
      }

      throw new Error(`Failed to add memory: ${result.error || 'Unknown error'}`);
    } catch (error) {
      console.error('Failed to add code memory:', error.message);
      console.error('Full error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch add multiple code memories
   * @param {Array} memories - Array of memory objects
   * @param {number} batchSize - Batch size (default: 10)
   * @returns {Promise<Object>} - Batch result
   */
  async batchAddCodeMemories(memories, batchSize = 10) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process in batches
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);

      // Add memories in parallel within batch
      const batchResults = await Promise.allSettled(
        batch.map(memory => this.addCodeMemory(memory))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(result.reason || result.value.error);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < memories.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Search code in memory
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {number} params.maxResults - Maximum results (default: 30)
   * @param {boolean} params.enableAgenticGraph - Enable graph traversal (default: true)
   * @returns {Promise<Object>} - Search results
   */
  async searchCode({ query, maxResults = 30, enableAgenticGraph = true }) {
    try {
      const client = this.getClient();

      const result = await client.memory.search({
        query,
        max_memories: maxResults,
        rank_results: true,
        enable_agentic_graph: enableAgenticGraph
      });

      if (!result.data?.memories?.length) {
        return {
          success: true,
          results: [],
          message: `No code found for: "${query}"`
        };
      }

      return {
        success: true,
        results: result.data.memories,
        total: result.data.memories.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to search code'
      };
    }
  }

  /**
   * Execute GraphQL query
   * @param {string} query - GraphQL query
   * @param {Object} variables - Query variables
   * @returns {Promise<Object>} - Query result
   */
  async executeGraphQLQuery(query, variables = {}) {
    try {
      const client = this.getClient();

      // Note: This assumes the SDK has a graphql method
      // If not, we'll need to make a direct HTTP request
      const result = await client.graphql.query({ query, variables });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to execute GraphQL query'
      };
    }
  }

  /**
   * Delete memory by ID
   * @param {string} memoryId - Memory ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteMemory(memoryId) {
    try {
      const client = this.getClient();
      await client.memory.delete(memoryId);

      return {
        success: true,
        message: `Memory deleted: ${memoryId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update memory
   * @param {string} memoryId - Memory ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Update result
   */
  async updateMemory(memoryId, updates) {
    try {
      const client = this.getClient();
      const result = await client.memory.update(memoryId, updates);

      return {
        success: true,
        memoryId: result.data?.memoryId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get PaprCodeIndexer singleton instance
 * @returns {PaprCodeIndexer}
 */
function getPaprClient() {
  if (!instance) {
    instance = new PaprCodeIndexer();
  }
  return instance;
}

module.exports = {
  PaprCodeIndexer,
  getPaprClient
};
