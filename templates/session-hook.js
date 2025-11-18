const Papr = require('@papr/memory').default;

async function loadSessionContext() {
  try {
    // Check if memory is enabled
    if (process.env.PAPR_MEMORY_ENABLED === 'false') {
      return; // Skip memory context in clean mode
    }

    const apiKey = process.env.PAPR_MEMORY_API_KEY;

    if (!apiKey) {
      console.log('⚠️ PAPR Memory API key not found.');
      console.log('💡 Run: papr init (get your API key from dashboard.papr.ai)');
      console.log('---');
      return;
    }

    const client = new Papr({
      baseURL: process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai',
      timeout: 10000,
      maxRetries: 1,
      logLevel: 'error',
      xAPIKey: apiKey,
      defaultHeaders: {
        'X-Client-Type': 'papr_cli',
        'Accept-Encoding': 'gzip'
      }
    });

    // Parallel searches for comprehensive context
    const [generalResult, vercelResult] = await Promise.all([
      // General context search
      client.memory.search({
        query: 'Find user preferences, coding goals, project priorities, workflow preferences, recent decisions, and important context about current work. Include any settings, configurations, or patterns I should remember.',
        max_memories: 20,
        rank_results: true
      }),

      // Vercel AI SDK v5 tool calling migration search
      client.memory.search({
        query: 'Find information about Vercel AI SDK v5 migration guide specifically for tool calling. Look for breaking changes in tool definitions, function calling patterns, API updates from v4 to v5, tool schema changes, and migration steps for implementing tools and function calling in Vercel AI SDK v5.',
        max_memories: 20,
        rank_results: true
      })
    ]);

    // Display PAPR banner
    console.log('');
    console.log('');
    console.log('██████╗  █████╗ ██████╗ ██████╗ ');
    console.log('██╔══██╗██╔══██╗██╔══██╗██╔══██╗');
    console.log('██████╔╝███████║██████╔╝██████╔╝');
    console.log('██╔═══╝ ██╔══██║██╔═══╝ ██╔══██╗');
    console.log('██║     ██║  ██║██║     ██║  ██║');
    console.log('╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝');
    console.log('        Memory-Enhanced Claude CLI');
    console.log('');
    console.log('🧠 **Session Context:**');

    // Display general memories
    if (generalResult.data?.memories?.length > 0) {
      generalResult.data.memories.forEach((m, i) => {
        const title = m.title || 'Memory';
        const content = m.content.substring(0, 200).replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
        console.log(`${i+1}. ${title}: ${content}...`);
      });
    }

    // Display Vercel AI SDK v5 migration memories
    if (vercelResult.data?.memories?.length > 0) {
      console.log('');
      console.log('🔧 **Vercel AI SDK v5 Tool Calling Migration:**');
      vercelResult.data.memories.forEach((m, i) => {
        const title = m.title || 'Vercel AI SDK Memory';
        const content = m.content.substring(0, 200).replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
        console.log(`${i+1}. ${title}: ${content}...`);
      });
    }

    if (!generalResult.data?.memories?.length && !vercelResult.data?.memories?.length) {
      console.log('📝 Starting fresh session - no relevant memories found');
    }

    console.log('');
    console.log('---');

  } catch (error) {
    console.log('⚠️ Memory service unavailable');
    console.log('---');
  }
}

// Only run if called directly (not in test environment)
if (require.main === module) {
  loadSessionContext();
}

module.exports = { loadSessionContext };