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

// Tool for Claude to search memory with detailed queries
async function searchMemory({ detailedQuery, maxResults = 15 }) {
  try {
    const client = createPaprClient();

    const result = await client.memory.search({
      query: detailedQuery,
      max_memories: Math.max(maxResults, 15),
      rank_results: true
    });

    if (!result.data?.memories?.length) {
      return `No memories found for the search query. Try searching for related topics or broader terms.`;
    }

    const memories = result.data.memories.map((m, i) => {
      const title = m.title || 'Memory';
      const content = m.content.length > 300 ? m.content.substring(0, 300) + '...' : m.content;
      const topics = m.topics && m.topics.length > 0 ? ` (Topics: ${m.topics.join(', ')})` : '';
      return `${i + 1}. **${title}**${topics}\n   ${content}`;
    });

    return `Found ${memories.length} relevant memories:\n\n${memories.join('\n\n')}`;

  } catch (error) {
    return `Failed to search memories: ${error.message}`;
  }
}

// Tool for Claude to add memory
async function addMemory({
  content,
  title,
  memoryType = 'general',
  topics = [],
  importance = 'medium'
}) {
  try {
    const client = createPaprClient();

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
      sourceType: 'claude_cli_auto',
      sourceUrl: null,
      location: null,
      customMetadata: {
        memory_type: memoryType,
        importance,
        created_by: 'claude_assistant',
        auto_saved: true,
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

    return `✅ Memory saved successfully!\n**Title:** ${finalTitle}\n**Type:** ${memoryType}\n**Topics:** ${topics.join(', ') || 'none'}`;

  } catch (error) {
    return `Failed to save memory: ${error.message}`;
  }
}

// Tool for Claude to get recent memories
async function getRecentMemories({ detailedQuery, limit = 15 }) {
  try {
    const client = createPaprClient();

    // Use provided detailed query or default
    const query = detailedQuery || 'Find recent conversations, decisions, preferences, and important context from Claude CLI sessions. Look for any patterns, solutions, or insights that were discussed recently and might be relevant to current work.';

    const result = await client.memory.search({
      query,
      max_memories: Math.max(limit, 15),
      rank_results: true
    });

    if (!result.data?.memories?.length) {
      return 'No recent memories found matching the search criteria.';
    }

    const memories = result.data.memories.map((m, i) => {
      const title = m.title || 'Recent Memory';
      const content = m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content;
      const topics = m.topics && m.topics.length > 0 ? ` (${m.topics.join(', ')})` : '';
      return `${i + 1}. **${title}**${topics}\n   ${content}`;
    });

    return `Recent memories (${memories.length}):\n\n${memories.join('\n\n')}`;

  } catch (error) {
    return `Failed to retrieve recent memories: ${error.message}`;
  }
}

module.exports = {
  searchMemory,
  addMemory,
  getRecentMemories
};