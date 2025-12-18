const http = require('http');

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
    // 1) Login
    const loginBody = JSON.stringify({ email: 'test@example.com', password: 'password123' });
    const loginOpts = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody)
      }
    };

    const loginResp = await httpRequest(loginOpts, loginBody);
    console.log('Login status:', loginResp.res.statusCode);
    console.log('Login response:', loginResp.data);

    const setCookie = loginResp.res.headers['set-cookie'];
    console.log('Set-Cookie header:', setCookie);

    if (!setCookie) {
      console.error('No set-cookie received; session not set by server');
      process.exit(1);
    }

    // Use cookie for next request
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');

    // 2) Fetch stats
    const statsOpts = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: {
        'Cookie': cookieHeader
      }
    };

    const statsResp = await httpRequest(statsOpts);
    console.log('Stats status:', statsResp.res.statusCode);
    console.log('Stats response:', statsResp.data);

    // 3) Create a content while authenticated
    const newContent = JSON.stringify({ title: 'api-test', description: 'created via script', content_type: 'article', status: 'published' });
    const createOpts = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contents',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(newContent),
        'Cookie': cookieHeader
      }
    };

    const createResp = await httpRequest(createOpts, newContent);
    console.log('Create status:', createResp.res.statusCode);
    console.log('Create response:', createResp.data);

    // 4) Fetch stats again
    const statsResp2 = await httpRequest(statsOpts);
    console.log('Stats2 status:', statsResp2.res.statusCode);
    console.log('Stats2 response:', statsResp2.data);

    process.exit(0);
  } catch (err) {
    console.error('Error during API session test:', err);
    process.exit(1);
  }
})();
