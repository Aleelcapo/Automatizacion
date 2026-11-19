// Captura cuadro por cuadro: node frames.mjs <www> <out> [lista de segundos para pruebas]
import { chromium } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [www, out, only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf" };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(www, u === "/" ? "index.html" : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); r.end(b); } }); }).listen(0);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell" });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
const n = await page.evaluate(() => window.__n);
const list = only ? only.split(",").map((s) => Math.round(Number(s) * 30)) : [...Array(n).keys()];
const t0 = Date.now();
for (const i of list) {
  await page.evaluate((k) => window.__frame(k), i);
  await page.screenshot({ path: path.join(out, `${String(i).padStart(4, "0")}.png`) });
}
console.log("cuadros", list.length, ((Date.now() - t0) / 1000).toFixed(0), "s");
await browser.close(); srv.close();
