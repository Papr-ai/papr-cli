import Papr from '@papr/memory';

const apiKey = process.env.PAPR_MEMORY_API_KEY;
const serverUrl = process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai';

console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
console.log('Server URL:', serverUrl);
console.log('');

const client = new Papr({
  baseURL: serverUrl,
  timeout: 15000,
  maxRetries: 2,
  xAPIKey: apiKey,
  defaultHeaders: {
    'X-Client-Type': 'test_client',
    'Accept-Encoding': 'gzip'
  }
});

async function testSearch() {
  console.log('Testing PAPR Memory API connection...\n');

  // Test 1: Very broad search to see if ANY memories exist
  console.log('1. Searching for ANY memories with broad query...');
  const broadResult = await client.memory.search({
    query: 'any data information memories',
    max_memories: 50,
    enable_agentic_graph: false,
    rank_results: true
  });

  const memCount = broadResult.data && broadResult.data.memories ? broadResult.data.memories.length : 0;
  const nodeCount = broadResult.data && broadResult.data.nodes ? broadResult.data.nodes.length : 0;

  console.log('   Status:', broadResult.status);
  console.log('   Total memories found:', memCount);
  console.log('   Total nodes found:', nodeCount);

  if (memCount > 0) {
    console.log('\n   Sample memories:');
    broadResult.data.memories.slice(0, 3).forEach((m, i) => {
      const title = m.title || 'No title';
      const topics = m.topics ? m.topics.join(', ') : 'none';
      const preview = m.content.substring(0, 100);
      console.log(`   ${i + 1}. Title: ${title}`);
      console.log(`      Topics: ${topics}`);
      console.log(`      Content preview: ${preview}...`);
    });
  }

  // Test 2: Search for customer-specific terms
  console.log('\n2. Searching for customer/sales data with agentic graph...');
  const customerResult = await client.memory.search({
    query: 'customers sales pipeline Attio CRM deals opportunities',
    max_memories: 50,
    max_nodes: 15,
    enable_agentic_graph: true,
    rank_results: true
  });

  const custMemCount = customerResult.data && customerResult.data.memories ? customerResult.data.memories.length : 0;
  const custNodeCount = customerResult.data && customerResult.data.nodes ? customerResult.data.nodes.length : 0;

  console.log('   Status:', customerResult.status);
  console.log('   Total memories found:', custMemCount);
  console.log('   Total nodes found:', custNodeCount);

  if (custMemCount > 0) {
    console.log('\n   Customer-related memories:');
    customerResult.data.memories.forEach((m, i) => {
      const title = m.title || 'No title';
      console.log(`   ${i + 1}. ${title}`);
    });
  }

  if (custNodeCount > 0) {
    console.log('\n   Graph nodes found:');
    customerResult.data.nodes.forEach((n, i) => {
      const preview = JSON.stringify(n.properties).substring(0, 100);
      console.log(`   ${i + 1}. ${n.label}: ${preview}...`);
    });
  }
}

testSearch().catch(err => {
  console.error('ERROR:', err.message);
  console.error('Full error:', err);
});
