// Test script to verify CORS is working for /admin/me endpoint
const BASE_URL = 'http://localhost:5172';

async function testCors() {
  console.log('Testing CORS for /admin/me endpoint...\n');

  // First, test preflight (OPTIONS)
  console.log('1. Testing OPTIONS (preflight) request...');
  try {
    const optionsResponse = await fetch(`${BASE_URL}/admin/me`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization',
      },
    });
    
    console.log('OPTIONS Status:', optionsResponse.status);
    console.log('Access-Control-Allow-Origin:', optionsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('Access-Control-Allow-Methods:', optionsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('Access-Control-Allow-Headers:', optionsResponse.headers.get('Access-Control-Allow-Headers'));
    console.log('');
  } catch (err) {
    console.error('OPTIONS request failed:', err.message);
  }

  // Test GET without auth (should get 401 Unauthorized, but CORS should still work)
  console.log('2. Testing GET request without token (should get CORS + 401)...');
  try {
    const getResponse = await fetch(`${BASE_URL}/admin/me`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8080',
      },
    });
    
    console.log('GET Status:', getResponse.status);
    console.log('Access-Control-Allow-Origin:', getResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('');
  } catch (err) {
    console.error('GET request failed:', err.message);
  }

  // Test health endpoint (no auth required)
  console.log('3. Testing /health endpoint (no auth, should always work)...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8080',
      },
    });
    
    console.log('Health Status:', healthResponse.status);
    console.log('Access-Control-Allow-Origin:', healthResponse.headers.get('Access-Control-Allow-Origin'));
    const data = await healthResponse.json();
    console.log('Data:', data);
  } catch (err) {
    console.error('Health request failed:', err.message);
  }
}

testCors();
