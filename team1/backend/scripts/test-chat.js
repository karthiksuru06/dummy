const axios = require('axios');

async function run() {
  const base = process.env.BASE || 'http://localhost:5000/api';
  const userId = 'test_user_' + Date.now();
  const messages = [
    'iam suffering with headace',
    'from yesterday',
    'Since yesterday evening.'
  ];

  for (const msg of messages) {
    try {
      console.log('\n--> Sending:', msg);
      const res = await axios.post(`${base}/chat`, { userId, message: msg });
      console.log('<-- Response:', res.data);
    } catch (err) {
      console.error('Request failed:', err.message);
      if (err.response) console.error('Status:', err.response.status, 'Body:', err.response.data);
    }
  }
}

run().catch(e => console.error(e));
