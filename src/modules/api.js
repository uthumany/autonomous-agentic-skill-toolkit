const axios = require('axios');

async function runApiTest(url, method = 'GET', data = {}) {
  console.log(`Running API test for: ${url} (${method})`);
  try {
    const response = await axios({ method, url, data });
    console.log('API test successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('API test failed:', error.message);
    throw error;
  }
}

module.exports = { runApiTest };
