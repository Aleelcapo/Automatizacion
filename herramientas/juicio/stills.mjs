// Renderiza cuadros fijos de la sala: node stills.mjs <www_dir> <out_dir> 1,2,3,4
import { chromium } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [www, out, list] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf" };
const srv = http.createServer((q, r) => { const f = path.join(www, decodeURIComponent(q.url.split("?")[0]) === "/" ? "index.html" : decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); r.end(b); } }); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
for (const s of list.split(",")) {
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/index.html?shot=${s}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 180000 });
  await page.screenshot({ path: path.join(out, `toma_${s}.png`) });
  console.log("toma", s, ((Date.now() - t0) / 1000).toFixed(1), "s");
}
await browser.close(); srv.close();
