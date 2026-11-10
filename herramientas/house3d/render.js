const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const { spawn } = require('child_process');
const [out, n, at, w0, w1] = process.argv.slice(2); const root = __dirname;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 400, height: 400 } }); pg.on('pageerror', e => console.log('ERR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('[c]', m.text()); });
  await pg.goto(`http://localhost:${srv.address().port}/`); await pg.waitForFunction('window.ready', null, { timeout: 60000 });
  if (at && at !== '-') { for (const [k, s] of at.split(',').entries()) { const d = await pg.evaluate(i => window.renderFrame(i), Math.round(+s * 30)); fs.writeFileSync(`${out}_${k}.jpg`, Buffer.from(d.split(',')[1], 'base64')); } await b.close(); srv.close(); return; }
  const a = +(w0 || 0), z = +(w1 || n);
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = a; i < z; i++) { const d = await pg.evaluate(i => window.renderFrame(i), i); if (!enc.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => enc.stdin.once('drain', r)); if (i % 60 === 0) console.log(i, ((Date.now() - t0) / (i - a + 1)).toFixed(0), 'ms/f'); }
  enc.stdin.end(); await new Promise(r => enc.on('close', r)); await b.close(); srv.close(); });
