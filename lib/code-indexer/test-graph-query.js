const Papr = require('@papr/memory').default;

const client = new Papr({
  baseURL: 'https://memory.papr.ai',
  xAPIKey: process.env.PAPR_MEMORY_API_KEY
});

async function checkGraphNodes() {
  try {
    // Search for the indexed code
    const result = await client.memory.search({
      query: "authentication functions python",
      max_memories: 15,
      max_nodes: 20,
      enable_agentic_graph: true
    });

    console.log('=== SEARCH RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('=== END ===\n');

    // Check if graph nodes were returned
    if (result.data?.nodes && result.data.nodes.length > 0) {
      console.log(`✅ Graph nodes found: ${result.data.nodes.length}`);
      console.log('\nSample nodes:');
      result.data.nodes.slice(0, 5).forEach(node => {
        console.log(`  - ${node.label}`);
        console.log(`    Properties:`, Object.keys(node.properties));
        if (node.label === 'Function') {
          console.log(`    Name: ${node.properties.name}`);
        }
      });
    } else {
      console.log('❌ No graph nodes returned in search');
    }

    // Check memories
    if (result.data?.memories && result.data.memories.length > 0) {
      console.log(`\n✅ Memories found: ${result.data.memories.length}`);
      console.log('First memory content preview:');
      console.log(result.data.memories[0].content.substring(0, 500));
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

checkGraphNodes();
