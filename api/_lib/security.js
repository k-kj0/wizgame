const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { rateLimited } = require('../api/_lib/security');

const req = (ip) => ({ headers: { 'x-forwarded-for': ip } });

test('in-memory limiter blocks after the limit', async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  const ip = 'mem-' + Math.random();
  for (let i = 0; i < 3; i++) assert.strictEqual(await rateLimited(req(ip), 3), false);
  assert.strictEqual(await rateLimited(req(ip), 3), true);
});

test('shared limiter uses the Redis REST counter when configured', async () => {
  const counts = {};
  const server = http.createServer((rq, rs) => {
    let body = '';
    rq.on('data', (d) => (body += d));
    rq.on('end', () => {
      const cmds = JSON.parse(body);
      const key = cmds[0][1];
      counts[key] = (counts[key] || 0) + 1;
      rs.setHeader('Content-Type', 'application/json');
      rs.end(JSON.stringify([{ result: counts[key] }, { result: 1 }]));
    });
  });
  await new Promise((r) => server.listen(0, r));
  process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:' + server.address().port;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
  const ip = 'shared-' + Math.random();
  assert.strictEqual(await rateLimited(req(ip), 2), false);
  assert.strictEqual(await rateLimited(req(ip), 2), false);
  assert.strictEqual(await rateLimited(req(ip), 2), true);
  server.close();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

test('falls back to memory (and does not block users) when the shared store is down', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:1';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
  const ip = 'down-' + Math.random();
  assert.strictEqual(await rateLimited(req(ip), 5), false);
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
