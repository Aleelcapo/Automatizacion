const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const [page_, out, w, h] = process.argv.slice(2);
const root = __dirname; const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json', '.png':'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: +w || 1920, height: +h || 1080 } });
  pg.on('console', m => console.log(m.text())); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/${page_}`); await pg.waitForFunction('window.ready', null, { timeout: 20000 });
  await pg.screenshot({ path: out }); await b.close(); srv.close(); });
