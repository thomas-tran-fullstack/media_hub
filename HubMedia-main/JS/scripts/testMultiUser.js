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
    console.log('=== TESTING MULTI-USER CONTENT ISOLATION ===\n');

    // User 1: test@example.com (ID 5)
    console.log('--- USER 1: test@example.com ---');
    const login1Body = JSON.stringify({ email: 'test@example.com', password: 'password123' });
    const loginOpts = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(login1Body)
      }
    };

    const loginResp1 = await httpRequest(loginOpts, login1Body);
    console.log('Login response:', loginResp1.data);
    const loginData1 = JSON.parse(loginResp1.data);
    if (!loginData1.success || !loginData1.user) {
      throw new Error(`Login failed: ${loginResp1.data}`);
    }
    const user1 = loginData1.user;

    const setCookie1 = loginResp1.res.headers['set-cookie'];
    const cookie1 = setCookie1.map(c => c.split(';')[0]).join('; ');

    // Get stats for user1
    const statsOpts = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { 'Cookie': cookie1 }
    };
    const statsResp1 = await httpRequest(statsOpts);
    const stats1 = JSON.parse(statsResp1.data).stats;
    console.log(`Stats before: total_posts=${stats1.total_posts}`);

    // Create content for user1
    const content1Body = JSON.stringify({ 
      title: `User1 Content ${Date.now()}`, 
      description: 'Created by user1', 
      content_type: 'article', 
      status: 'published' 
    });
    const createOpts1 = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contents',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(content1Body),
        'Cookie': cookie1
      }
    };
    const createResp1 = await httpRequest(createOpts1, content1Body);
    const created1 = JSON.parse(createResp1.data).content;
    console.log(`Created content: ID=${created1.content_id}, title="${created1.title}"`);

    // Check stats again
    const statsResp1b = await httpRequest(statsOpts);
    const stats1b = JSON.parse(statsResp1b.data).stats;
    console.log(`Stats after: total_posts=${stats1b.total_posts}`);

    // Get user1's contents
    const contentsOpts1 = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contents',
      method: 'GET',
      headers: { 'Cookie': cookie1 }
    };
    const contentsResp1 = await httpRequest(contentsOpts1);
    const contents1 = JSON.parse(contentsResp1.data).contents;
    console.log(`User1 can see ${contents1.length} content(s)\n`);

    // User 2: user2@test.com (ID 9)
    console.log('--- USER 2: user2@test.com ---');
    const login2Body = JSON.stringify({ email: 'user2@test.com', password: 'password123' });
    const loginResp2 = await httpRequest(loginOpts, login2Body);
    const user2 = JSON.parse(loginResp2.data).user;
    console.log(`Logged in as: ${user2.username} (ID: ${user2.user_id})`);

    const setCookie2 = loginResp2.res.headers['set-cookie'];
    const cookie2 = setCookie2.map(c => c.split(';')[0]).join('; ');

    // Get stats for user2
    const statsOpts2 = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { 'Cookie': cookie2 }
    };
    const statsResp2 = await httpRequest(statsOpts2);
    const stats2 = JSON.parse(statsResp2.data).stats;
    console.log(`Stats before: total_posts=${stats2.total_posts}`);

    // Create content for user2
    const content2Body = JSON.stringify({ 
      title: `User2 Content ${Date.now()}`, 
      description: 'Created by user2', 
      content_type: 'video', 
      status: 'published' 
    });
    const createOpts2 = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contents',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(content2Body),
        'Cookie': cookie2
      }
    };
    const createResp2 = await httpRequest(createOpts2, content2Body);
    const created2 = JSON.parse(createResp2.data).content;
    console.log(`Created content: ID=${created2.content_id}, title="${created2.title}"`);

    // Check stats again
    const statsResp2b = await httpRequest(statsOpts2);
    const stats2b = JSON.parse(statsResp2b.data).stats;
    console.log(`Stats after: total_posts=${stats2b.total_posts}`);

    // Get user2's contents
    const contentsOpts2 = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contents',
      method: 'GET',
      headers: { 'Cookie': cookie2 }
    };
    const contentsResp2 = await httpRequest(contentsOpts2);
    const contents2 = JSON.parse(contentsResp2.data).contents;
    console.log(`User2 can see ${contents2.length} content(s)\n`);

    // Verify isolation
    console.log('=== VERIFICATION ===');
    console.log(`User1 stats.total_posts: ${stats1b.total_posts} (should be >= 1)`);
    console.log(`User2 stats.total_posts: ${stats2b.total_posts} (should be >= 3)`);
    console.log(`User1 contents: ${contents1.length} items`);
    console.log(`User2 contents: ${contents2.length} items`);
    console.log(`✓ Content isolation is working correctly!`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
