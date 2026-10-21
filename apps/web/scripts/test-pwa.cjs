const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const publicDir = path.resolve(__dirname, '../public');
const handlers = {};
vm.runInNewContext(fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8'), {
  self: {
    location: { origin: 'https://example.test' },
    addEventListener: (type, handler) => { handlers[type] = handler; },
  },
  fetch: async () => { throw new Error('offline'); },
  caches: { match: async () => 'offline-fallback' },
  URL,
  Response,
});

async function main() {
  for (const [url, method] of [
    ['https://example.test/api/auth', 'GET'],
    ['https://example.test/', 'POST'],
    ['https://example.test/?_rsc=123', 'GET'],
    ['https://example.test/icons/icon-192.png?private=1', 'GET'],
    ['https://project.supabase.co/rest/v1/questions', 'GET'],
  ]) {
    let handled = false;
    handlers.fetch({ request: { url, method, mode: 'cors' }, respondWith: () => { handled = true; } });
    assert.equal(handled, false, url);
  }
  let result;
  handlers.fetch({
    request: { url: 'https://example.test/', method: 'GET', mode: 'navigate' },
    respondWith: promise => { result = promise; },
  });
  assert.equal(await result, 'offline-fallback');
  const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(publicDir, icon.src)));
  console.log('PASS: private/API/RSC/Supabase requests bypass cache; offline fallback; manifest icons exist.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
