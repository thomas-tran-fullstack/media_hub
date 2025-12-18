const http = require('http');
const fs = require('fs');

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ res, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const cookie = fs.readFileSync('JS/scripts/sessionCookie.txt', 'utf8').trim();
    console.log('Using cookie:', cookie);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { 'Cookie': cookie }
    };
    const r = await httpRequest(opts);
    console.log('Status:', r.res.statusCode);
    console.log('Body:', r.data);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
