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
    const body = JSON.stringify({ email: 'test@example.com', password: 'password123' });
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const r = await httpRequest(opts, body);
    console.log('Login status:', r.res.statusCode);
    console.log('Login body:', r.data);
    const setCookie = r.res.headers['set-cookie'];
    if (!setCookie) {
      console.error('No set-cookie returned');
      process.exit(1);
    }
    const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    fs.writeFileSync('JS/scripts/sessionCookie.txt', cookie, 'utf8');
    console.log('Saved cookie to JS/scripts/sessionCookie.txt');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
