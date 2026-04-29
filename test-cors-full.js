// Test script to verify CORS is working for /admin/me endpoint
const BASE_URL = 'http://localhost:5172';

async function testCorsFull() {
  console.log('Testing CORS for /admin/me endpoint (Full Response)...\n');

  // Test GET without auth
  console.log('Testing GET request without token...');
  try {
    const getResponse = await fetch(`${BASE_URL}/admin/me`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8080',
      },
    });
    
    console.log('Status:', getResponse.status);
    console.log('Status Text:', getResponse.statusText);
    console.log('\nResponse Headers:');
    for (const [name, value] of getResponse.headers) {
      console.log(`  ${name}: ${value}`);
    }
    
    try {
      const body = await getResponse.text();
      console.log('\nResponse Body:', body);
    } catch {
      console.log('\nCould not read response body');
    }
  } catch (err) {
    console.error('Request error:', err);
  }

  console.log('\n---\n');
}

testCorsFull();
