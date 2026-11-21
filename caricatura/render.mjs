// node render.mjs WORKDIR stills 100,400,900   -> WORKDIR/still_<f>.jpg
// node render.mjs WORKDIR video OUT.mp4        -> vídeo final (con WORKDIR/mix.wav)
import { chromium } from "playwright";
import { build } from "esbuild";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [work, mode, arg] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(path.join(work, "timeline.json"), "utf8"));

const out = await build({ entryPoints: [path.join(HERE, "src/main.ts")], bundle: true, write: false, format: "iife", target: "es2020" });
const js = out.outputFiles[0].text;
const html = `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="1080" height="1920"></canvas>
<script>window.TL=${JSON.stringify(tl)};</script><script>${js}</script></body></html>`;
fs.writeFileSync(path.join(work, "page.html"), html);

const browser = await chromium.launch();
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto("file://" + path.join(work, "page.html"));
  await page.evaluate(() => document.fonts.load("900 40px Inter"));
  await page.evaluate(() => document.fonts.load("800 40px Inter"));
  return page;
}
async function grab(page, f) {
  const url = await page.evaluate((f) => { window.render(f); return document.getElementById("c").toDataURL("image/jpeg", 0.92); }, f);
  return Buffer.from(url.split(",")[1], "base64");
}

if (mode === "stills") {
  const page = await newPage();
  for (const f of arg.split(",").map(Number)) fs.writeFileSync(path.join(work, `still_${String(f).padStart(4, "0")}.jpg`), await grab(page, f));
} else {
  const N = tl.frames, K = 4, segs = [];
  await Promise.all(Array.from({ length: K }, async (_, k) => {
    const f0 = Math.floor((k * N) / K), f1 = Math.floor(((k + 1) * N) / K);
    const seg = path.join(work, `seg${k}.mp4`); segs[k] = seg;
    const page = await newPage();
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", seg], { stdio: ["pipe", "inherit", "inherit"] });
    for (let f = f0; f < f1; f++) {
      const buf = await grab(page, f);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (k === 0 && f % 150 === 0) console.log("frame", f, "/", f1);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
  }));
  fs.writeFileSync(path.join(work, "segs.txt"), segs.map((s) => `file '${s}'\n`).join(""));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(work, "segs.txt"), "-i", path.join(work, "mix.wav"),
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", arg]);
  console.log("listo", arg);
}
await browser.close();
