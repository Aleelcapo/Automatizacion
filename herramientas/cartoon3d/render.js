// Renderiza un timeline.json (generado por build.py) a MP4 sin audio.
// Uso: node render.js timeline.json salida.mp4 [--workers 3] [--stills dir] [--from s --to s]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [tlPath, outPath] = args;
const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
const ROOT = __dirname;

function serve() {
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json' };
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
    }).listen(0, () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction('window.engineReady === true', null, { timeout: 60000 });
  await page.evaluate(t => window.init(t), tl);
  return page;
}

async function renderRange(browser, port, f0, f1, out) {
  const page = await openPage(browser, port);
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(tl.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(tl.fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = f0; i < f1; i++) {
    const d = await page.evaluate(i => window.renderFrame(i), i);
    const buf = Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if ((i - f0) % 150 === 0) console.log(`  [${f0}-${f1}] ${i - f0}/${f1 - f0} ${((Date.now() - t0) / Math.max(1, i - f0)).toFixed(0)} ms/f`);
  }
  enc.stdin.end();
  await new Promise(r => enc.on('close', r));
  await page.close();
}

(async () => {
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const total = Math.round(tl.duration * tl.fps);
  const stills = opt('stills');
  if (stills) {
    // un fotograma por plano (inicio, medio y final) para revisar antes del render completo
    fs.mkdirSync(stills, { recursive: true });
    const page = await openPage(browser, port);
    const at = opt('at');
    const list = at ? at.split(',').map((x, k) => [k, 't', Number(x)]) : tl.shots.flatMap((s, k) => [[k, 'a', s.t0 + .05], [k, 'b', (s.t0 + s.t1) / 2], [k, 'c', s.t1 - .06]]);
    for (const it of list) {
      const [k, tag, t] = Array.isArray(it) ? it : [0, 't', it];
      const d = await page.evaluate(i => window.renderFrame(i, .85), Math.round(t * tl.fps));
      fs.writeFileSync(path.join(stills, `s${String(k).padStart(2, '0')}${tag}.jpg`), Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
    }
    await browser.close(); srv.close(); return;
  }
  const from = Math.round(Number(opt('from', 0)) * tl.fps), to = opt('to') ? Math.round(Number(opt('to')) * tl.fps) : total;
  const nw = Number(opt('workers', 3));
  const step = Math.ceil((to - from) / nw);
  const parts = [];
  const jobs = [];
  for (let k = 0; k < nw; k++) {
    const a = from + k * step, b = Math.min(to, a + step);
    if (a >= b) break;
    const part = `${outPath}.part${k}.mp4`; parts.push(part);
    jobs.push(renderRange(browser, port, a, b, part));
  }
  const t0 = Date.now();
  await Promise.all(jobs);
  const list = `${outPath}.parts.txt`;
  fs.writeFileSync(list, parts.map(p => `file '${path.resolve(p)}'`).join('\n'));
  await new Promise(r => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outPath], { stdio: 'inherit' }).on('close', r));
  for (const p of parts) fs.unlinkSync(p); fs.unlinkSync(list);
  console.log(`render ${to - from} frames en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await browser.close(); srv.close();
})();
