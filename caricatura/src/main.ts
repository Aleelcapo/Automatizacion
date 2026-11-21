// Motor de escenas caricatura 2D (canvas) para "Los 3 errores que hicieron perder a Hitler".
// Cada escena = un tramo de voz (timeline.json). render(f) dibuja el fotograma f a 1080x1920.
import { Pen, INK, bodyFront, bodySide, Outfit, SKINS, mix, shade } from "./toon";

declare const TL: { fps: number; total: number; beats: { id: string; start: number; dur: number; words: [number, number, string][] }[] };

const W = 1080, H = 1920;
const cv = document.getElementById("c") as HTMLCanvasElement;
const g = cv.getContext("2d")!;
const P = new Pen(g);
P.ol = 6;

// ------------------------------------------------------------------ util
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const eout = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ramp = (t: number, a: number, d = 0.35) => ease((t - a) / d);
const popS = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : eout(x) * (1 + 0.22 * Math.sin(Math.PI * x)));
const rnd = (i: number, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
type P2 = [number, number];

let T = 0; // tiempo global (s)
let F = 0; // fotograma

// ------------------------------------------------------------------ vestuario
const GER = (v = 0, x: Partial<Outfit> = {}): Outfit => ({ jacket: "#6f7867", pants: "#545a50", boots: INK, hat: "stahl", rifle: true, buttons: "#c9ccd2", skin: SKINS[v % 3], ...x });
const BRIT = (v = 0, x: Partial<Outfit> = {}): Outfit => ({ jacket: "#a08c5c", pants: "#8c7a50", boots: "#3a2a20", hat: "brodie", rifle: true, belt: null, buttons: "#c8b47a", skin: SKINS[v % 4], ...x });
const SOV = (v = 0, x: Partial<Outfit> = {}): Outfit => ({ jacket: "#7d7b4b", pants: "#5e5c3a", boots: INK, hat: "ushanka", star: true, rifle: true, skin: SKINS[v % 3], ...x });
const SKI: Outfit = { jacket: "#eef2f6", pants: "#dde4ea", boots: "#c9d2da", hat: "ushanka", cap: "#e6ebf0", hair: "#d0d8df", star: true, rifle: true, skin: SKINS[1] };
const USA: Outfit = { jacket: "#7a7448", pants: "#6a6440", boots: "#4a3426", hat: "m1", rifle: true, skin: SKINS[2] };
const HIT: Outfit = { jacket: "#8a7b58", pants: "#3b3a36", boots: INK, hat: "hair", hair: "#221b18", fringe: true, moustache: "brush:#221b18", buttons: "#c9a24a", skin: "#ffe0c4" };
const PAULUS: Outfit = { jacket: "#6f7867", pants: "#545a50", boots: INK, hat: "peaked", buttons: "#d8b45a", skin: SKINS[0], build: "stout" };
const FRIEND: Outfit = { jacket: "#4f7fc9", pants: "#36518a", boots: "#e8e2d6", hat: "hair", hair: "#5a3b2a", skin: SKINS[1] };

const blinkOf = (seed: number) => { const per = 50 + Math.floor(rnd(seed, 3) * 40); return (F + Math.floor(rnd(seed, 4) * per)) % per < 4; };

/** personaje de frente: x,y = suelo, h = altura en px */
function front(o: Outfit, x: number, y: number, h: number, opts: any = {}, flip = false, shadow = true) {
  const s = h / 1000;
  if (shadow) { g.save(); g.globalAlpha = 0.28; g.fillStyle = "#1a1022"; g.beginPath(); g.ellipse(x, y, h * 0.19, h * 0.03, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  const br = opts.mode === "stand" || opts.mode === "sit" ? 1 + 0.012 * Math.sin(T * 2.4 + (opts.seed ?? 1)) : 1;
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s * br); g.translate(-300, -975);
  const p = new Pen(g);
  bodyFront(p, o, { blink: blinkOf(opts.seed ?? 1), ...opts, facing: flip ? -(opts.facing ?? 0) : opts.facing ?? 0 });
  g.restore();
}
/** personaje de perfil mirando a la derecha (flip = izquierda) */
function sidev(o: Outfit, x: number, y: number, h: number, opts: any = {}, flip = false) {
  const s = h / 1000;
  g.save(); g.globalAlpha = 0.25; g.fillStyle = "#1a1022"; g.beginPath(); g.ellipse(x, y, h * 0.2, h * 0.028, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s); g.translate(-300, -975);
  bodySide(new Pen(g), o, { blink: blinkOf(opts.seed ?? 1), ...opts });
  g.restore();
}

// ------------------------------------------------------------------ pinceles de escenario
const poly = (pts: P2[], fill: string | CanvasGradient, lw = 6) => {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = fill as any; g.fill();
  if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
};
const rect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient, lw = 6, r = 0) => {
  g.beginPath(); (g as any).roundRect(x, y, w, h, r); g.fillStyle = fill as any; g.fill();
  if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
};
const ell = (x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, lw = 6, rot = 0) => {
  g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); g.fillStyle = fill as any; g.fill();
  if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
};
const line = (pts: P2[], w: number, col = INK) => {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
};
const vgrad = (y0: number, y1: number, stops: string[]) => {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
};
const sky = (stops: string[], y1 = H) => { g.fillStyle = vgrad(-200, y1, stops); g.fillRect(-400, -400, W + 800, y1 + 400); };
const ground = (y: number, stops: string[], lw = 6) => { g.fillStyle = vgrad(y, H + 300, stops); g.fillRect(-400, y, W + 800, H + 700 - y); if (lw) line([[-400, y], [W + 400, y]], lw); };

function cloud(x: number, y: number, s: number, col = "#ffffff") {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath();
  for (const [cx, cy, r] of [[-60, 10, 45], [-10, -15, 60], [50, 5, 48], [90, 20, 32], [-100, 25, 28]] as const) g.moveTo(cx + r, cy), g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = col; g.fill();
  g.restore();
}
function sunDisc(x: number, y: number, r: number, col = "#fff1b8") {
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r * 3);
  gr.addColorStop(0, "rgba(255,240,190,0.9)"); gr.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = gr; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  ell(x, y, r, r, col, 0);
}
function snow(n: number, amt: number, seed = 1, wind = 40) {
  if (amt <= 0) return;
  g.save(); g.globalAlpha = amt; g.fillStyle = "#ffffff";
  for (let i = 0; i < n; i++) {
    const sp = 90 + rnd(i, seed) * 200, r = 3 + rnd(i, seed + 1) * 7;
    const x = ((rnd(i, seed + 2) * (W + 200) + T * wind + 30 * Math.sin(T * 1.5 + i)) % (W + 200)) - 100;
    const y = ((rnd(i, seed + 3) * (H + 200) + T * sp) % (H + 200)) - 100;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
function smoke(x: number, y: number, s: number, col = "#5b5560", seed = 1) {
  g.save();
  for (let i = 0; i < 7; i++) {
    const k = (T * 0.25 + i / 7) % 1;
    g.globalAlpha = 0.55 * (1 - k);
    ell(x + Math.sin(i * 2 + seed) * 30 * s + k * 120 * s, y - k * 520 * s, (40 + k * 110) * s, (35 + k * 90) * s, col, 0);
  }
  g.restore();
}
function spotlights(col = "rgba(255,240,210,0.13)") {
  g.save();
  for (const cx of [W * 0.2, W * 0.8, W * 0.5]) {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.85);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,240,210,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 40, 0); g.lineTo(cx + 40, 0); g.lineTo(cx + 360, H * 0.85); g.lineTo(cx - 360, H * 0.85); g.fill();
  }
  g.restore();
}
function stage(c1 = "#1c1630", c2 = "#2a1f3e") {
  sky([c1, c2, "#120e1e"]);
  spotlights();
  ground(1450, ["#3a2c46", "#1d1626"]);
  g.save(); g.globalAlpha = 0.35; ell(W / 2, 1480, 420, 60, "#ffe8b0", 0); g.restore();
}

/** número gigante dorado con relieve (como los rankings) */
function bigNum(txt: string, x: number, y: number, size: number, k: number) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); const s = popS(k); g.scale(s, s);
  g.font = `900 ${size}px Inter`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 18; i > 0; i--) { g.fillStyle = i > 14 ? INK : "#8a5a14"; g.fillText(txt, i * 1.2, i * 1.6); }
  const gr = g.createLinearGradient(0, -size / 2, 0, size / 2);
  gr.addColorStop(0, "#fff3b0"); gr.addColorStop(0.45, "#ffc93c"); gr.addColorStop(1, "#d98a1c");
  g.fillStyle = gr; g.fillText(txt, 0, 0);
  g.lineWidth = 10; g.strokeStyle = INK; g.strokeText(txt, 0, 0);
  g.restore();
}
function bubble(txt: string, x: number, y: number, size: number, k: number, tail: P2, col = "#ffffff", tc = "#c0262a") {
  if (k <= 0) return;
  g.save(); g.translate(x, y); const s = popS(k); g.scale(s, s);
  g.font = `900 ${size}px Inter`; const w = g.measureText(txt).width + size * 0.9, h = size * 1.5;
  poly([[-w * 0.15, h / 2 - 4], [tail[0] - x, tail[1] - y], [w * 0.12, h / 2 - 4]], col, 7);
  rect(-w / 2, -h / 2, w, h, col, 7, h * 0.45);
  g.fillStyle = col; g.fillRect(-w * 0.15 + 6, h / 2 - 12, w * 0.27 - 12, 14);
  g.fillStyle = tc; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 4);
  g.restore();
}
function sign(txt: string, x: number, y: number, size: number, k: number, bg = "#f4ecd8", fg = INK) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.rotate(-0.04); const s = popS(k); g.scale(s, s);
  g.font = `900 ${size}px Inter`; const w = g.measureText(txt).width + size * 0.8, h = size * 1.35;
  rect(-w / 2, -h / 2, w, h, bg, 7, 14);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 4);
  g.restore();
}

// ------------------------------------------------------------------ objetos
function eiffel(x: number, y: number, s: number) {
  const c = "#7a5a46";
  g.save(); g.translate(x, y); g.scale(s, s);
  poly([[-260, 0], [-120, -420], [-70, -900], [-25, -1400], [25, -1400], [70, -900], [120, -420], [260, 0], [170, 0], [100, -200], [0, -260], [-100, -200], [-170, 0]], c, 8);
  for (const [yy, ww] of [[-420, 150], [-900, 85]] as const) rect(-ww, yy - 22, ww * 2, 44, shade(c, 0.85), 7, 4);
  line([[0, -1400], [0, -1560]], 10);
  g.restore();
}
function building(x: number, y: number, w: number, h: number, col: string, roof: string, rows = 4, broken = 0, seed = 1) {
  if (!broken) {
    poly([[x - 12, y - h], [x + w + 12, y - h], [x + w - 10, y - h - 70], [x + 10, y - h - 70]], roof, 6);
    rect(x, y - h, w, h, col, 6);
  } else {
    const pts: P2[] = [[x, y], [x, y - h * (0.7 + 0.3 * rnd(seed))]];
    const n = 6;
    for (let i = 1; i < n; i++) pts.push([x + (w * i) / n, y - h * (0.35 + 0.6 * rnd(seed, i))]);
    pts.push([x + w, y - h * (0.5 + 0.4 * rnd(seed, 9))], [x + w, y]);
    poly(pts, col, 6);
  }
  const cols = Math.max(2, Math.floor(w / 70));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = x + 22 + c * ((w - 44) / cols), wy = y - h + 40 + r * ((h - 80) / rows);
    if (broken && wy < y - h * (0.4 + 0.5 * rnd(seed, c + 1))) continue;
    rect(wx, wy, (w - 44) / cols - 18, (h - 80) / rows - 26, broken ? "#1d1820" : "#3d4f6e", 4, 3);
  }
}
function tank(x: number, y: number, s: number, opts: { wheel?: number; cmdr?: any; dust?: number } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const body = "#6a7062", dark = "#4a4f45";
  // orugas
  rect(-300, -110, 600, 110, "#3a3b36", 7, 55);
  for (let i = 0; i < 6; i++) {
    const wx = -240 + i * 96; ell(wx, -55, 38, 38, "#7a7f74", 6);
    const a = (opts.wheel ?? 0) + i;
    line([[wx - 25 * Math.cos(a), -55 - 25 * Math.sin(a)], [wx + 25 * Math.cos(a), -55 + 25 * Math.sin(a)]], 6);
  }
  poly([[-320, -110], [330, -110], [290, -200], [-300, -200]], body, 7);
  // torreta
  poly([[-150, -200], [170, -200], [140, -310], [-120, -310]], shade(body, 1.05), 7);
  rect(140, -280, 330, 34, dark, 7, 10);
  if (opts.cmdr) {
    g.save(); g.beginPath(); g.rect(-200, -900, 400, 600); g.clip();
    front(GER(1, { rifle: false }), -10, -120, 330, { mode: "stand", ...opts.cmdr }, false, false);
    g.restore();
    rect(-90, -330, 170, 30, dark, 6, 10);
  }
  // cruz de balanceo: sólo marcas neutras (sin insignias)
  rect(-60, -175, 120, 40, shade(body, 0.9), 5, 6);
  g.restore();
  if (opts.dust) for (let i = 0; i < 5; i++) {
    const k = (T * 1.6 + i / 5) % 1;
    g.save(); g.globalAlpha = 0.5 * (1 - k) * opts.dust;
    ell(x - 300 * s - k * 260 * s, y - 30 * s - k * 90 * s, (40 + 90 * k) * s, (30 + 60 * k) * s, "#c9b48a", 0);
    g.restore();
  }
}
function boat(kind: number, x: number, y: number, s: number, flip = false, load = 0) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const bob = Math.sin(T * 2 + kind * 1.7) * 6; g.translate(0, bob); g.rotate(Math.sin(T * 1.6 + kind) * 0.03);
  if (kind === 0) { // pesquero
    poly([[-220, -80], [230, -90], [180, 20], [-180, 20]], "#c4453a", 7);
    rect(-40, -200, 140, 120, "#f1e7d0", 7, 6); rect(-10, -175, 40, 40, "#3d4f6e", 5, 4);
    line([[-120, -80], [-120, -330]], 9); line([[-120, -320], [60, -200]], 4);
  } else if (kind === 1) { // yate de vela
    poly([[-200, -70], [220, -70], [170, 15], [-160, 15]], "#f4f0e6", 7);
    line([[0, -70], [0, -480]], 9);
    poly([[10, -470], [10, -90], [190, -90]], "#ffffff", 6);
    poly([[-10, -430], [-10, -90], [-150, -90]], "#e8d7b0", 6);
    rect(-200, -84, 420, 14, "#2f6fb5", 0);
  } else if (kind === 2) { // ferri / vapor
    poly([[-340, -100], [360, -110], [300, 25], [-300, 25]], "#2d2b33", 7);
    rect(-250, -200, 470, 100, "#f2efe8", 7, 6);
    for (let i = 0; i < 6; i++) ell(-200 + i * 75, -150, 18, 18, "#3d4f6e", 4);
    rect(40, -340, 70, 145, "#d8a23a", 7, 6); rect(40, -340, 70, 30, INK, 0);
    if (!flip || true) smoke(75, -360, 0.5, "#8d8791", kind);
  } else { // bote de remos
    poly([[-140, -40], [150, -40], [110, 10], [-100, 10]], "#9a6a3c", 6);
  }
  if (load > 0) { // cabezas con casco a bordo
    const n = kind === 2 ? 10 : kind === 3 ? 3 : 6, x0 = kind === 2 ? -240 : -150, dx = kind === 2 ? 50 : 52, yy = kind === 2 ? -205 : -85;
    for (let i = 0; i < Math.round(n * load); i++) {
      const hx = x0 + i * dx, hy = yy - Math.abs(Math.sin(T * 6 + i)) * 4;
      ell(hx, hy - 14, 18, 18, SKINS[i % 4], 4);
      ell(hx, hy - 30, 30, 7, "#6e7048", 4); ell(hx, hy - 34, 15, 10, "#6e7048", 4);
    }
  }
  g.restore();
}
function waterBand(y: number, top = "#3f86b8", bot = "#1f4f7a", lw = 6) {
  g.fillStyle = vgrad(y, H + 200, [top, bot]); g.fillRect(-400, y, W + 800, H + 600 - y);
  if (lw) line([[-400, y], [W + 400, y]], lw);
  g.save(); g.globalAlpha = 0.5;
  for (let r = 0; r < 14; r++) {
    const yy = y + 30 + r * r * 9, off = (T * 40 * (1 + r * 0.2) + r * 77) % 240;
    for (let x = -240 + off; x < W + 240; x += 240) line([[x, yy], [x + 50 + r * 4, yy]], 3 + r * 0.4, "#cfe8f5");
  }
  g.restore();
}
function onionDome(x: number, y: number, s: number, col: string, stripe: string) {
  g.save(); g.translate(x, y); g.scale(s, s);
  rect(-70, -260, 140, 260, "#e9d9c0", 6);
  poly([[0, -560], [40, -480], [95, -400], [80, -300], [-80, -300], [-95, -400], [-40, -480]], col, 6);
  g.save(); g.beginPath(); g.moveTo(0, -560); g.lineTo(95, -400); g.lineTo(80, -300); g.lineTo(-80, -300); g.lineTo(-95, -400); g.closePath(); g.clip();
  for (let i = -4; i < 5; i++) line([[i * 40 - 60, -300], [i * 40 + 60, -560]], 14, stripe);
  g.restore();
  poly([[0, -560], [40, -480], [95, -400], [80, -300], [-80, -300], [-95, -400], [-40, -480]], "rgba(0,0,0,0)", 6);
  line([[0, -560], [0, -620]], 6); ell(0, -628, 10, 10, "#f1c84a", 4);
  g.restore();
}
function thermo(x: number, y: number, s: number, lvl: number) {
  g.save(); g.translate(x, y); g.scale(s, s);
  rect(-60, -560, 120, 600, "#f4ecd8", 7, 30);
  rect(-16, -520, 32, 470, "#ffffff", 5, 16);
  const top = -60 - 440 * lvl;
  rect(-10, top, 20, -60 - top + 10, "#d8322e", 0, 8);
  ell(0, -20, 34, 34, "#d8322e", 6);
  for (let i = 0; i < 9; i++) line([[24, -100 - i * 48], [40, -100 - i * 48]], 4);
  g.restore();
}
function helmetOnRifle(x: number, y: number, s: number, k: number) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s * popS(k));
  rect(-16, -330, 32, 340, "#8a5a34", 6, 4);
  rect(-110, -250, 220, 30, "#8a5a34", 6, 4);
  const dome: P2[] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI + (Math.PI * i) / 20; dome.push([92 * Math.cos(a), -330 + 95 * Math.sin(a)]); }
  poly([[-112, -296], ...dome, [112, -296], [96, -292], [82, -322], [-82, -322], [-96, -292]], "#5f6858", 6);
  g.restore();
}
function phoneDesk(y: number) {
  rect(-100, y, W + 200, 600, "#6b4428", 7);
  line([[-100, y + 26], [W + 100, y + 26]], 4, "#4c2e1a");
}
function scaleBeam(cx: number, cy: number, L: number, ang: number, left: () => void, right: () => void) {
  const gold = "#e2b24a";
  poly([[cx - 16, cy], [cx + 16, cy], [cx + 26, cy + 620], [cx - 26, cy + 620]], gold, 6);
  ell(cx, cy + 625, 190, 34, gold, 6);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const ends: P2[] = [[cx - L * ca, cy - L * sa], [cx + L * ca, cy + L * sa]];
  line([ends[0], ends[1]], 26, INK); line([ends[0], ends[1]], 14, gold);
  ell(cx, cy, 26, 26, gold, 6);
  ends.forEach(([ex, ey], i) => {
    const py = ey + 260;
    line([[ex, ey], [ex - 150, py]], 4); line([[ex, ey], [ex + 150, py]], 4);
    g.save(); g.translate(ex, py); (i ? right : left)(); g.restore();
    g.beginPath(); g.ellipse(ex, py, 190, 46, 0, 0, Math.PI); g.closePath(); g.fillStyle = gold; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    ell(ex, py, 190, 16, "#f4cf72", 6);
  });
}
function flag(x: number, y: number, kind: "us" | "uk" | "su", s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  line([[0, 0], [0, -230]], 8);
  const wv = (k: number) => Math.sin(T * 5 + k) * 6;
  const fw = 130, fh = 86, y0 = -228;
  const pts: P2[] = [[0, y0], [fw, y0 + wv(1)], [fw, y0 + fh + wv(1)], [0, y0 + fh]];
  g.save(); g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.clip();
  if (kind === "su") {
    g.fillStyle = "#d8322e"; g.fillRect(0, y0 - 10, fw, fh + 20);
    g.strokeStyle = "#f1c84a"; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.arc(30, y0 + 34, 14, -0.3, Math.PI * 1.15); g.stroke();
    g.beginPath(); g.moveTo(22, y0 + 24); g.lineTo(42, y0 + 48); g.stroke();
    g.beginPath(); g.moveTo(16, y0 + 30); g.lineTo(28, y0 + 18); g.stroke();
  }
  else if (kind === "us") {
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#c8323a"; g.fillRect(0, y0 + i * fh / 7, fw, fh / 7 + 1); }
    g.fillStyle = "#2c3f7a"; g.fillRect(0, y0, 58, 46);
  } else {
    g.fillStyle = "#24407a"; g.fillRect(0, y0, fw, fh);
    g.strokeStyle = "#ffffff"; g.lineWidth = 18; g.beginPath(); g.moveTo(0, y0); g.lineTo(fw, y0 + fh); g.moveTo(fw, y0); g.lineTo(0, y0 + fh); g.stroke();
    g.strokeStyle = "#c8323a"; g.lineWidth = 7; g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(fw / 2 - 16, y0, 32, fh); g.fillRect(0, y0 + fh / 2 - 16, fw, 32);
    g.fillStyle = "#c8323a"; g.fillRect(fw / 2 - 9, y0, 18, fh); g.fillRect(0, y0 + fh / 2 - 9, fw, 18);
  }
  g.restore();
  g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ cámara
type Cam = { z0: number; z1: number; x?: number; y?: number; px?: number; py?: number };
let kickAt: number[] = [];
function applyCam(c: Cam, t: number, d: number) {
  const k = ease(t / d);
  const z = lerp(c.z0, c.z1, k);
  const fx = c.x ?? W / 2, fy = c.y ?? H * 0.55;
  let sx = (c.px ?? 0) * k, sy = (c.py ?? 0) * k;
  for (const ka of kickAt) { const df = (t - ka) * 30; if (df >= 0 && df < 8) { const a = 18 * (1 - df / 8) * (Math.floor(df) % 2 ? -1 : 1); sx += a; sy += a * 0.6; } }
  g.translate(fx + sx, fy + sy); g.scale(z, z); g.translate(-fx, -fy);
}

// ------------------------------------------------------------------ escenas
type Beat = (typeof TL.beats)[number];
let B: Beat;
const m = (w: string, n = 1, def?: number) => {
  let c = 0;
  const nw = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  for (const [s, , tok] of B.words) if (nw(tok).includes(nw(w)) && ++c === n) return s;
  return def ?? B.dur * 0.5;
};

const SC: Record<string, (t: number, d: number) => void> = {
  paris(t, d) {
    applyCam({ z0: 1.0, z1: 1.08, y: 1300, px: -30 }, t, d);
    sky(["#7fb3e6", "#cfe3f2", "#f6e7cf"], 1500);
    cloud(240, 420, 1.2); cloud(860, 300, 0.9);
    for (let i = 0; i < 6; i++) building(-120 + i * 230, 1260, 210, 330 + (i % 3) * 40, ["#efe2c6", "#e6d3b0", "#f1e8d6"][i % 3], "#7f8fa6", 3);
    eiffel(760, 1260, 0.62);
    ground(1260, ["#d9c49a", "#bfa576"]);
    for (let i = 0; i < 7; i++) { line([[i * 180, 1260], [i * 180 - 400, H]], 3, "rgba(80,60,40,0.25)"); }
    sidev(GER(0), 170, 1500, 430, { mode: "stand", seed: 4 });
    sidev(GER(2), 300, 1470, 390, { mode: "stand", seed: 5 });
    front(HIT, 600 + 40 * Math.sin(t * 0.6), 1640, 820, { mode: "stroll", phase: t * 0.9, expr: t < m("Paris") ? "smile" : "grin", seed: 9 });
  },
  bunker(t, d) {
    applyCam({ z0: 1.12, z1: 1.2, y: 1100 }, t, d);
    sky(["#3d3f44", "#2e3034"]);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) rect(-60 + c * 320 + (r % 2) * 160, 200 + r * 160, 300, 150, r % 2 ? "#5f625f" : "#575a57", 4, 6);
    ground(1350, ["#3a3c3a", "#26282a"]);
    const sw = Math.sin(t * 2.2) * 0.25, bx = W / 2 + Math.sin(sw) * 420, by = 120 + Math.cos(sw) * 420;
    const gr = g.createRadialGradient(bx, by, 10, bx, by + 600, 900);
    gr.addColorStop(0, "rgba(255,230,160,0.55)"); gr.addColorStop(1, "rgba(255,230,160,0)");
    g.fillStyle = gr; g.fillRect(-200, -200, W + 400, H + 400);
    line([[W / 2, -100], [bx, by]], 5); ell(bx, by + 18, 26, 30, "#fff2b0", 5);
    front(HIT, W / 2, 1640, 900, { mode: "stand", expr: t < d * 0.5 ? "worried" : "nervous", seed: 9, headTilt: -4 });
    phoneDesk(1380);
    rect(250, 1330, 260, 60, "#efe3c3", 5, 4); rect(560, 1320, 90, 70, "#e8e2d8", 5, 8);
  },
  hook(t, d) {
    applyCam({ z0: 1.0, z1: 1.06, y: 1100 }, t, d);
    stage();
    const m3 = m("tres", 1, d * 0.6);
    bigNum("3", 250, 820, 420, (t - m3) / 0.35);
    bigNum("2", 540, 700, 420, (t - m3 - 0.2) / 0.35);
    bigNum("1", 830, 820, 420, (t - m3 - 0.4) / 0.35);
    front(HIT, W / 2, 1560, 840, { mode: "stand", expr: t < m3 ? "worried" : "shock", seed: 9 });
  },
  dunkRank(t, d) {
    applyCam({ z0: 1.0, z1: 1.07, y: 1200 }, t, d);
    beachBg(t);
    bigNum("3", W / 2, 900, 760, t / 0.4);
    front(BRIT(1), W / 2, 1700, 900, { mode: "stand", expr: "nervous", seed: 3 });
  },
  beach(t, d) {
    applyCam({ z0: 1.0, z1: 1.1, y: 1250, px: 0 }, t, d);
    beachBg(t);
    // multitud: filas de atrás hacia adelante
    let k = 0;
    for (let r = 0; r < 4; r++) {
      const y = 1330 + r * 150, h = 300 + r * 140, n = 7 - r;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (W / n) + (r % 2) * 40 - 20 + (rnd(k, 1) - 0.5) * 60;
        front(BRIT(k), x, y, h, { mode: "stand", expr: ["nervous", "worried", "shock"][k % 3], seed: 20 + k, look: Math.sin(T + k) * 0.5 }, rnd(k, 2) < 0.5);
        k++;
      }
    }
  },
  tank(t, d) {
    applyCam({ z0: 1.0, z1: 1.05, y: 1200 }, t, d);
    fieldsBg(false);
    const x = lerp(-200, 520, ease(t / d));
    tank(x, 1500, 1.05, { wheel: -T * 6, cmdr: { expr: "grin", seed: 30 }, dust: 1 });
    tank(x - 520, 1330, 0.6, { wheel: -T * 6, dust: 1 });
  },
  halt(t, d) {
    const mA = m("alto", 1, d * 0.7);
    if (t < mA - 0.05) {
      applyCam({ z0: 1.12, z1: 1.2, y: 1000 }, t, mA);
      officeBg();
      front(HIT, W / 2 + 40, 1900, 1250, { mode: "stand", expr: "stern", seed: 9, phone: true });
      phoneDesk(1520);
    } else {
      kickAt = [mA];
      applyCam({ z0: 1.05, z1: 1.1, y: 1200 }, t - mA, d - mA);
      fieldsBg(false);
      const tt = t - mA;
      const x = 560 + 60 * eout(tt / 0.4);
      tank(x, 1520, 1.1, { wheel: -eout(tt / 0.4) * 4, cmdr: { expr: "shock", seed: 30 }, dust: 1 - clamp(tt / 0.6) });
      for (let i = 0; i < 3; i++) line([[x - 340 - i * 30, 1530 + i * 8], [x - 600 - i * 60, 1530 + i * 8]], 8, "rgba(40,30,20,0.6)");
      bubble("¡ALTO!", 560, 640, 150, tt / 0.25, [500, 900]);
    }
  },
  boats(t, d) {
    applyCam({ z0: 1.0, z1: 1.08, y: 1200 }, t, d);
    sky(["#8ab4d8", "#dfe9ee"], 1100);
    cloud(260, 380, 1.1, "#f4f6f8"); cloud(820, 470, 0.8, "#f4f6f8");
    waterBand(1050);
    const kinds = [0, 1, 2, 0, 3, 1];
    kinds.forEach((kd, i) => {
      const enter = clamp((t - i * 0.45) / 2.5);
      const x = lerp(W + 400, 160 + (i % 3) * 330, eout(enter)), y = 1180 + Math.floor(i / 3) * 260;
      boat(kd, x, y, 0.55 + Math.floor(i / 3) * 0.25, true);
    });
    // soldados esperando con el agua a la cintura
    for (let i = 0; i < 4; i++) {
      g.save(); g.beginPath(); g.rect(-100, 0, W + 200, 1720); g.clip();
      front(BRIT(i + 2), 140 + i * 260, 1900, 600, { mode: "stand", expr: "relief", seed: 50 + i, wave: 0.5 + 0.5 * Math.sin(T * 6 + i) });
      g.restore();
    }
    g.save(); g.globalAlpha = 0.85; waterBand(1720, "#3f86b8", "#1f4f7a", 0); g.restore();
  },
  escape(t, d) {
    applyCam({ z0: 1.05, z1: 1.12, y: 1300 }, t, d);
    sky(["#f3b27a", "#f8d9a8", "#e9e3cf"], 1100);
    sunDisc(820, 900, 80);
    waterBand(1050, "#5a8fb5", "#29557c");
    for (let i = 0; i < 5; i++) boat(i % 3, 200 + i * 220 - t * 30, 1120 + (i % 2) * 40, 0.32, true, 1);
    boat(2, 560 - t * 25, 1650, 1.3, true, 0);
    for (let i = 0; i < 5; i++) front(BRIT(i), 230 + i * 150 - t * 25 * 1.0, 1400, 300, { mode: "stand", expr: "relief_open", seed: 60 + i, wave: 0.5 + 0.5 * Math.sin(T * 7 + i) }, false, false);
    rect(-400, 1405, W + 800, 1, INK, 0);
  },
  barbRank(t, d) {
    applyCam({ z0: 1.0, z1: 1.07, y: 1200 }, t, d);
    fieldsBg(true);
    bigNum("2", W / 2, 900, 760, t / 0.4);
    front(GER(0), W / 2, 1720, 900, { mode: "stand", expr: "grin", seed: 70 });
  },
  march(t, d) {
    applyCam({ z0: 1.0, z1: 1.05, y: 1200 }, t, d);
    const scroll = T * 160;
    sky(["#5f9be0", "#bcd8f0"], 1300); sunDisc(830, 330, 70);
    cloud(((300 - scroll * 0.2) % 1400 + 1400) % 1400 - 200, 420, 1.0); cloud(((900 - scroll * 0.2) % 1400 + 1400) % 1400 - 200, 260, 0.7);
    ground(1150, ["#e3be5a", "#c99a38"]);
    for (let i = 0; i < 40; i++) { const x = ((i * 97 - scroll * 0.6) % 1400 + 1400) % 1400 - 200; line([[x, 1170 + (i % 5) * 30], [x + 6, 1140 + (i % 5) * 30]], 4, "#a87c26"); }
    for (let i = 0; i < 6; i++) sidev(GER(i), 1000 - i * 190, 1320, 360, { mode: "march", phase: T * 1.6 + i * 0.13, seed: 80 + i, expr: "grin", stride: 0.8 });
    for (let i = 0; i < 4; i++) sidev(GER(i + 2), 980 - i * 290, 1700, 640, { mode: "march", phase: T * 1.6 + i * 0.29, seed: 90 + i, expr: i % 2 ? "smile" : "grin", stride: 0.8 });
  },
  moscow(t, d) {
    applyCam({ z0: 1.0, z1: 1.1, y: 1200 }, t, d);
    const mi = m("invierno", 1, d * 0.6), w = ramp(t, mi - 0.3, 0.8);
    sky([mix("#7aa6d8", "#4c5868", w), mix("#c8dcf0", "#9aa6b4", w)], 1300);
    onionDome(300, 1130, 0.75, "#2f8f5a", "#f1c84a"); onionDome(560, 1100, 1.0, "#c8323a", "#f4ecd8"); onionDome(800, 1140, 0.7, "#2c5fa8", "#f1c84a");
    ground(1120, [mix("#b9c48a", "#eef3f8", w), mix("#9aa86a", "#d5dde6", w)]);
    for (let i = 0; i < 3; i++) front(GER(i), 220 + i * 320, 1700 + (i % 2) * 40, 700, { mode: "stand", expr: w > 0.4 ? "shock" : "grin", seed: 100 + i, look: -0.6 }, i === 2);
    snow(160, w, 3);
  },
  cold(t, d) {
    applyCam({ z0: 1.05, z1: 1.12, y: 1150 }, t, d);
    sky(["#6f7c8e", "#a9b6c6"], 1250);
    for (let i = 0; i < 7; i++) { const x = i * 170 + 40; line([[x, 1240], [x, 700 + (i % 3) * 60]], 18, "#f2f4f6"); line([[x, 1240], [x, 700 + (i % 3) * 60]], 4, INK); }
    ground(1220, ["#eef3f8", "#cdd6e0"]);
    const mr = m("ropa", 1, d * 0.6);
    // esquiador soviético que pasa feliz
    if (t > mr - 0.6) {
      const k = (t - mr + 0.6) / 2.2;
      const x = lerp(W + 300, -300, k);
      line([[x - 170, 1395], [x + 170, 1395]], 10, "#8a5a34");
      sidev(SKI, x, 1390, 420, { mode: "stand", expr: "grin", seed: 111 }, true);
    }
    const jit = Math.sin(T * 60) * 5;
    front(GER(0, { skin: "#d8e8f2" }), W / 2 - 80 + jit, 1780, 1050, { mode: "stand", expr: "cold", seed: 110, headTilt: 3 });
    thermo(890, 1520, 1.0, 1 - ease((t - m("Cuarenta", 1, 0.3)) / 1.2) * 0.9);
    snow(220, 1, 5, 160);
  },
  helmets(t, d) {
    applyCam({ z0: 1.0, z1: 1.06, y: 1200 }, t, d);
    sky(["#5c6b80", "#9aa7b8"], 1300);
    for (let i = 0; i < 9; i++) { const x = i * 130; line([[x, 1180], [x + 10, 600 + rnd(i) * 200]], 14, "#eef0f2"); line([[x, 1180], [x + 10, 600 + rnd(i) * 200]], 3, INK); }
    g.fillStyle = vgrad(1150, H, ["#f1f5f9", "#d3dce6"]); g.fillRect(-400, 1150, 1100 + 400, 900);
    g.fillStyle = vgrad(1150, H, ["#8fbf5a", "#6d9a3e"]); g.fillRect(800, 1150, 700, 900);
    line([[-400, 1150], [W + 400, 1150]], 6); line([[800, 1150], [800, H]], 5, "rgba(36,23,38,0.5)");
    const m4 = m("cuatro", 1, 0.5);
    for (let i = 0; i < 4; i++) helmetOnRifle(130 + i * 175, 1500 + (i % 2) * 60, 0.95, (t - m4 - i * 0.18) / 0.3);
    helmetOnRifle(930, 1500, 0.95, (t - m4 - 0.9) / 0.3);
    snow(120, 0.8, 7, 30);
  },
  stalRank(t, d) {
    applyCam({ z0: 1.0, z1: 1.07, y: 1200 }, t, d);
    ruinsBg();
    bigNum("1", W / 2, 900, 760, t / 0.4);
    front(GER(1), W / 2, 1720, 900, { mode: "stand", expr: "worried", seed: 120 });
  },
  ring(t, d) {
    applyCam({ z0: 1.0, z1: 1.12, y: 1350 }, t, d);
    ruinsBg();
    const mr = m("rodearon", 1, 0.8), k = eout((t - mr + 0.2) / 1.6);
    // soviéticos al fondo
    for (let i = 0; i < 7; i++) front(SOV(i), 80 + i * 155, 1300, 330, { mode: "stand", expr: "stern", seed: 140 + i }, false);
    // alemanes en el centro
    for (let i = 0; i < 5; i++) front(GER(i), 300 + i * 120, 1480 + (i % 2) * 30, 520, { mode: "stand", expr: ["nervous", "worried", "shock"][i % 3], seed: 130 + i, look: Math.sin(T * 2 + i) }, i > 2);
    // soviéticos cerrando por los lados
    for (let i = 0; i < 3; i++) {
      front(SOV(i + 3), lerp(-300, 60 + i * 70, k), 1760 - i * 90, 760 - i * 90, { mode: "stand", expr: "stern", seed: 150 + i, facing: 1 }, false);
      front(SOV(i + 5), lerp(W + 300, W - 60 - i * 70, k), 1760 - i * 90, 760 - i * 90, { mode: "stand", expr: "stern", seed: 160 + i, facing: 1 }, true);
    }
  },
  paulus(t, d) {
    applyCam({ z0: 1.1, z1: 1.18, y: 1050 }, t, d);
    sky(["#3a2a26", "#2a1e1c"]);
    for (let r = 0; r < 14; r++) for (let c = 0; c < 7; c++) rect(-60 + c * 180 + (r % 2) * 90, 100 + r * 90, 170, 80, ["#6e3b2c", "#7a4432", "#653426"][(r + c) % 3], 4, 4);
    const cx = 830, cy = 1260, fl = 1 + 0.08 * Math.sin(T * 13) + 0.05 * Math.sin(T * 7);
    const gr = g.createRadialGradient(cx, cy, 5, cx, cy, 900 * fl); gr.addColorStop(0, "rgba(255,200,120,0.5)"); gr.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = gr; g.fillRect(-200, -200, W + 400, H + 400);
    front(PAULUS, W / 2 - 60, 1900, 1250, { mode: "stand", expr: "worried", seed: 170, phone: true });
    phoneDesk(1520);
    rect(cx - 18, cy + 120, 36, 130, "#f4ecd8", 5, 6); ell(cx, cy + 105 - 8 * fl, 12, 24 * fl, "#ffd36a", 0);
  },
  no(t, d) {
    const mn = m("no", 1, 0.5);
    kickAt = [mn];
    applyCam({ z0: 1.12, z1: 1.22, y: 1000 }, t, d);
    officeBg();
    front(HIT, W / 2 + 40, 1900, 1250, { mode: "stand", expr: t > mn - 0.1 ? "yell" : "stern", seed: 9, phone: true, headTilt: t > mn - 0.1 ? 4 * Math.sin(T * 18) : 0 });
    phoneDesk(1520);
    bubble("¡NO!", 640, 600, 190, (t - mn + 0.05) / 0.25, [560, 860]);
  },
  prisoners(t, d) {
    applyCam({ z0: 1.0, z1: 1.06, y: 1200 }, t, d);
    sky(["#7d8796", "#b8c1cc"], 1250);
    ground(1150, ["#eef2f6", "#cfd8e2"]);
    for (let i = 0; i < 14; i++) sidev(GER(i, { rifle: false }), (((i * 120 - T * 40) % 1680) + 1680) % 1680 - 300, 1250, 210, { mode: "march", phase: T * 0.9 + i * 0.21, seed: 180 + i, expr: "pained", stride: 0.6, stomp: 0.6 }, true);
    for (let i = 0; i < 6; i++) sidev(GER(i + 3, { rifle: false }), (((i * 260 - T * 60) % 1560) + 1560) % 1560 - 300, 1720, 600, { mode: "march", phase: T * 0.9 + i * 0.33, seed: 190 + i, expr: "pained", stride: 0.6, stomp: 0.6 }, true);
    sidev(SOV(1), 900, 1470, 430, { mode: "stand", expr: "stern", seed: 199 }, true);
    snow(200, 1, 9, -80);
  },
  scale(t, d) { scaleScene(t, d, false); },
  verdict(t, d) { scaleScene(t, d, true); },
  cta(t, d) {
    applyCam({ z0: 1.0, z1: 1.08, y: 1150 }, t, d);
    sky(["#1b1d33", "#2a2640"]);
    rect(90, 300, 300, 380, "#0f1a35", 7, 8); ell(300, 400, 40, 40, "#f4ecc0", 0);
    line([[240, 300], [240, 680]], 6); line([[90, 490], [390, 490]], 6);
    ell(820, 380, 95, 95, "#f4ecd8", 7); line([[820, 380], [820, 322]], 6); line([[820, 380], [866, 380]], 9);
    g.save(); g.font = "900 34px Inter"; g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("12", 820, 312); g.fillText("3", 892, 382); g.fillText("6", 820, 452); g.fillText("9", 748, 382); g.restore();
    ground(1200, ["#3b2f45", "#241c2c"]);
    // tele
    rect(620, 900, 380, 270, "#2a2a30", 8, 14);
    const tv = g.createLinearGradient(640, 920, 980, 1150); tv.addColorStop(0, "#7fc8ff"); tv.addColorStop(1, "#3a6fd0");
    rect(645, 925, 330, 220, tv, 0, 8);
    g.save(); g.translate(810 + Math.sin(T) * 30, 1100); g.scale(0.22, 0.22); tank(0, 0, 1, { wheel: -T * 6 }); g.restore();
    const glow = g.createRadialGradient(810, 1030, 20, 810, 1030, 900); glow.addColorStop(0, "rgba(120,190,255,0.35)"); glow.addColorStop(1, "rgba(120,190,255,0)");
    g.fillStyle = glow; g.fillRect(-200, 0, W + 400, H);
    // sofá + amigo (más grande)
    g.save(); g.translate(330, 1700); g.scale(1.45, 1.45); g.translate(-330, -1600);
    rect(20, 1250, 620, 260, "#8a3a4a", 8, 40);
    front(FRIEND, 330, 1610, 720, { mode: "sit", expr: "shock", seed: 210, look: 0.8 });
    rect(-10, 1450, 680, 230, "#9a4455", 8, 40);
    // palomitas
    const px = 470, py = 1420;
    poly([[px - 60, py - 110], [px + 60, py - 110], [px + 45, py + 30], [px - 45, py + 30]], "#ffffff", 6);
    for (let i = 0; i < 3; i++) rect(px - 50 + i * 36, py - 108, 18, 136, "#d8322e", 0);
    for (let i = 0; i < 7; i++) ell(px - 50 + i * 17, py - 118 - (i % 2) * 14, 16, 14, "#fff4c8", 4);
    g.restore();
  },
};

function beachBg(t: number) {
  sky(["#9db8cc", "#e6dcc4"], 1250);
  smoke(180, 1000, 1.2, "#4d4752", 1); smoke(860, 1030, 0.9, "#4d4752", 2);
  waterBand(1040, "#4f8fb0", "#2b5f84");
  for (let i = 0; i < 3; i++) boat(i, 200 + i * 340, 1080, 0.18, false);
  g.fillStyle = vgrad(1200, H, ["#e8d29a", "#cfb27a"]);
  g.beginPath(); g.moveTo(-400, 1220); for (let x = -400; x <= W + 400; x += 40) g.lineTo(x, 1200 + Math.sin(x * 0.01 + T) * 10); g.lineTo(W + 400, H + 400); g.lineTo(-400, H + 400); g.fill();
  line([[-400, 1205], [W + 400, 1205]], 5);
}
function fieldsBg(summer: boolean) {
  sky(summer ? ["#5f9be0", "#cde2f2"] : ["#8fb2d0", "#e3e6dc"], 1250);
  cloud(260, 420, 1.1); cloud(800, 300, 0.8);
  if (summer) sunDisc(830, 330, 70);
  for (let i = 0; i < 9; i++) { const x = i * 140 - 40; ell(x, 1080, 40, 120, "#4f7a3a", 5); line([[x, 1200], [x, 1150]], 10); }
  ground(1180, summer ? ["#e3be5a", "#c99a38"] : ["#8fb05a", "#6f8f42"]);
  poly([[300, 1180], [780, 1180], [W + 600, H + 200], [-500, H + 200]], "#b99f72", 5);
}
function ruinsBg() {
  sky(["#9a7468", "#d2a47e", "#e6c59c"], 1300);
  smoke(260, 1000, 1.4, "#4a4048", 3); smoke(820, 950, 1.1, "#4a4048", 4);
  for (let i = 0; i < 6; i++) building(-80 + i * 210, 1250, 190, 420 + (i % 3) * 90, ["#9b8f86", "#8a7c74", "#a89a8c"][i % 3], "#6a5a50", 4, 1, i + 1);
  ground(1240, ["#8c7c6c", "#6a5c50"]);
  for (let i = 0; i < 14; i++) ell((i * 173) % W, 1300 + (i % 4) * 140, 70 + (i % 3) * 30, 26, ["#7a6c60", "#9a8a7a"][i % 2], 5);
}
function officeBg() {
  sky(["#3a2b22", "#4a3628"]);
  for (let i = 0; i < 8; i++) rect(-20 + i * 150, 0, 145, H, i % 2 ? "#5a3e2c" : "#523826", 3);
  rect(150, 240, 780, 520, "#efe2c0", 8, 6);
  g.save(); g.beginPath(); g.rect(150, 240, 780, 520); g.clip();
  g.fillStyle = "#9ec3dc"; g.fillRect(150, 240, 780, 520);
  poly([[260, 760], [300, 520], [420, 420], [560, 380], [700, 300], [900, 330], [930, 760]], "#e4d2a0", 4);
  for (const [x1, y1, x2, y2] of [[380, 560, 700, 520], [480, 640, 820, 640], [560, 420, 820, 380]]) { line([[x1, y1], [x2 - 40, y2]], 14, "#c8323a"); poly([[x2, y2], [x2 - 45, y2 - 22], [x2 - 45, y2 + 22]], "#c8323a", 0); }
  g.restore();
}
function scaleScene(t: number, d: number, verdict: boolean) {
  applyCam({ z0: 1.0, z1: 1.06, y: 1150 }, t, d);
  stage();
  let ang: number;
  if (!verdict) ang = 0.12 * Math.sin(t * 3) * (1 - ramp(t, d - 0.8, 0.8)) + 0.05 * ramp(t, d - 0.8, 0.8);
  else { const mp = m("Pero", 1, d * 0.6); ang = 0.05 + 0.2 * eout((t - 0.3) / 1.0) + 0.05 * ramp(t, mp, 0.5); }
  ang += 0.015 * Math.sin(T * 2);
  scaleBeam(W / 2, 820, 330,
    ang,
    () => { front(HIT, 0, -10, 360, { mode: "stand", expr: verdict ? "shock" : "worried", seed: 9 }, false, false); },
    () => {
      front(USA, -110, -10, 330, { mode: "stand", expr: "smile", seed: 220 }, false, false);
      front(BRIT(2), 0, -10, 340, { mode: "stand", expr: "smile", seed: 221 }, false, false);
      front(SOV(0), 110, -10, 330, { mode: "stand", expr: "smile", seed: 222 }, true, false);
      flag(-150, -300, "us", 0.7); flag(10, -320, "uk", 0.7); flag(150, -300, "su", 0.7);
    });
}

// ------------------------------------------------------------------ subtítulos (palabra resaltada, arriba)
function subs() {
  const all: [number, number, string][] = [];
  for (const b of TL.beats) for (const [s, e, w] of b.words) all.push([b.start + s, b.start + e, w]);
  const cues: [number, number, string][][] = [];
  let cur: [number, number, string][] = [];
  for (const w of all) {
    cur.push(w);
    const txt = cur.map((c) => c[2]).join(" ");
    if (cur.length >= 4 || txt.length >= 24 || /[.,?:!…]$/.test(w[2])) { cues.push(cur); cur = []; }
  }
  if (cur.length) cues.push(cur);
  return cues;
}
let CUES: [number, number, string][][] | null = null;
function drawSubs() {
  CUES = CUES ?? subs();
  let cue: [number, number, string][] | null = null;
  for (let i = 0; i < CUES.length; i++) {
    const s = CUES[i][0][0], e = i + 1 < CUES.length ? CUES[i + 1][0][0] : CUES[i][CUES[i].length - 1][1] + 0.4;
    if (T >= s - 0.05 && T < e) { cue = CUES[i]; break; }
  }
  if (!cue) return;
  let size = 66;
  g.font = `800 ${size}px Inter`;
  const sp = g.measureText(" ").width;
  let ws = cue.map((c) => g.measureText(c[2]).width);
  let tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  if (tot > W - 110) { size = Math.floor((size * (W - 110)) / tot); g.font = `800 ${size}px Inter`; ws = cue.map((c) => g.measureText(c[2]).width); tot = ws.reduce((a, b) => a + b, 0) + g.measureText(" ").width * (ws.length - 1); }
  let x = (W - tot) / 2; const y = 330;
  g.textBaseline = "middle"; g.textAlign = "left"; g.lineJoin = "round";
  cue.forEach(([s, e, w], i) => {
    const active = T >= s - 0.03 && T < e + 0.08;
    if (active) {
      rect(x - 14, y - size * 0.66, ws[i] + 28, size * 1.3, "#ffffff", 0, 14);
      g.fillStyle = "#16121e"; g.fillText(w, x, y + 2);
    } else {
      g.lineWidth = 12; g.strokeStyle = "rgba(20,14,28,0.9)"; g.strokeText(w, x, y + 2);
      g.fillStyle = T >= s ? "#ffffff" : "#e6e2ea"; g.fillText(w, x, y + 2);
    }
    x += ws[i] + g.measureText(" ").width;
  });
}

// ------------------------------------------------------------------ fotograma
(window as any).render = (f: number) => {
  F = f; T = f / TL.fps;
  let i = 0;
  for (let k = 0; k < TL.beats.length; k++) if (TL.beats[k].start <= T + 1e-6) i = k;
  B = TL.beats[i];
  const t = T - B.start;
  kickAt = [];
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.save();
  SC[B.id](t, B.dur);
  g.restore();
  // viñeta suave
  const v = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(10,6,20,0.45)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // flash blanco corto en cada corte de capítulo
  if (["dunkRank", "barbRank", "stalRank"].includes(B.id) && t < 0.15) { g.fillStyle = `rgba(255,255,255,${0.8 * (1 - t / 0.15)})`; g.fillRect(0, 0, W, H); }
  drawSubs();
  return true;
};
(window as any).ready = true;
