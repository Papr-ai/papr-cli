import Papr from '@papr/memory';

const apiKey = process.env.PAPR_MEMORY_API_KEY;
const serverUrl = process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai';

const client = new Papr({
  baseURL: serverUrl,
  timeout: 30000, // Increase timeout
  maxRetries: 2,
  xAPIKey: apiKey,
  defaultHeaders: {
    'X-Client-Type': 'test_client',
    'Accept-Encoding': 'gzip'
  }
});

async function searchCustomers() {
  console.log('Searching for customer/sales data WITHOUT agentic graph...\n');

  const result = await client.memory.search({
    query: 'customers sales pipeline Attio CRM',
    max_memories: 50,
    enable_agentic_graph: false, // Disable for now
    rank_results: true
  });

  console.log('Status:', result.status);
  console.log('Memories found:', result.data?.memories?.length || 0);
  console.log('');

  if (result.data?.memories?.length > 0) {
    console.log('Found memories:');
    result.data.memories.forEach((m, i) => {
      console.log(`\n${i + 1}. ${m.title || 'No title'}`);
      console.log('   Topics:', m.topics?.join(', ') || 'none');
      console.log('   Content:', m.content.substring(0, 200) + '...');
    });
  } else {
    console.log('No customer/sales memories found.');
    console.log('\nThis means your 29 memories dont contain customer or sales pipeline data.');
    console.log('They appear to be about:', result.data?.memories?.[0]?.topics || 'meeting, tasks, progress');
  }
}

searchCustomers().catch(err => {
  console.error('ERROR:', err.message);
});
