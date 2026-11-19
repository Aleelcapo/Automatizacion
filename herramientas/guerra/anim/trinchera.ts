// Gancho animado: dos trincheras enemigas se disparan… nieva, aparece un arbolito de Navidad, se dejan de disparar,
// salen, se dan la mano y terminan jugando al fútbol (la Tregua de Navidad de 1914). Canvas 2D, cuadro por cuadro:
// la página expone window.__frame(i) y Playwright saca una captura de cada cuadro.
import { Pen, bodySide, INK, type Outfit, type Expr } from "./toon";

const W = 1080, H = 1920, FPS = 30;
export const DUR = 21;
const cv = document.createElement("canvas"); cv.width = W; cv.height = H; document.body.appendChild(cv);
const g = cv.getContext("2d")!;

// ------------------------------------------------------------------ tiempo y curvas
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t: number, t0: number, d: number) => clamp((t - t0) / d);
const sstep = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const ease = (x: number) => 1 - (1 - clamp(x)) ** 3;
const back = (x: number) => { x = clamp(x) - 1; return 1 + x * x * (2.7 * x + 1.7); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ personajes
const BRIT: Outfit = { jacket: "#7d7448", pants: "#6c6643", boots: "#3a2a1c", hat: "brodie", belt: "#a08f5c", buttons: "#c9b56a", rifle: true };
const GERM: Outfit = { jacket: "#6e7366", pants: "#5a5e55", boots: INK, hat: "pickel", belt: "#2f2a22", buttons: "#c9ccd2", rifle: true };
const SKINS = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#e8b98f"];
type Sold = { side: "B" | "G"; x0: number; seed: number; mous?: string };
const SOLD: Sold[] = [
  { side: "B", x0: 780, seed: 3 }, { side: "B", x0: 610, seed: 5, mous: "#5a3b22" }, { side: "B", x0: 440, seed: 9 },
  { side: "G", x0: 2620, seed: 4, mous: "#3a2a1a" }, { side: "G", x0: 2790, seed: 6 }, { side: "G", x0: 2960, seed: 8, mous: "#7a5a3a" },
];
const card = document.createElement("canvas"); card.width = 600; card.height = 1000;
const cg = card.getContext("2d")!;
const SC = 0.43; // escala de la tarjeta de diseño (1000 unidades) en px de mundo: soldado ≈ 380 px

const drawSoldier = (s: Sold, x: number, footY: number, facing: 1 | -1, opts: { mode: "march" | "stand" | "push"; phase?: number; expr: Expr; blink?: boolean; pose?: number; rifle?: boolean; stride?: number }) => {
  const o: Outfit = { ...(s.side === "B" ? BRIT : GERM), skin: SKINS[s.seed % 4], moustache: s.mous, rifle: opts.rifle ?? true };
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, 600, 1000);
  bodySide(new Pen(cg), o, { mode: opts.mode, phase: opts.phase ?? 0, expr: opts.expr, blink: opts.blink, pose: opts.pose ?? 0, seed: s.seed, stride: opts.stride ?? 0.8 });
  g.save(); g.translate(x, footY); g.scale(facing * SC, SC); g.drawImage(card, -300, -975); g.restore();
};

// ------------------------------------------------------------------ mundo (coordenadas de mundo, px)
const GROUND = 1300, FLOOR = 1520;
const BTR = [180, 900], GTR = [2500, 3220];   // trincheras: británica (izq.) y alemana (der.)

const sky = (t: number, camx: number, snow: number) => {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#0b1222"); gr.addColorStop(0.55, "#1f2a45"); gr.addColorStop(1, "#38415e");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { // estrellas con paralaje mínimo y titileo
    const x = ((rnd(i) * 3000 - camx * 0.05) % W + W) % W, y = rnd(i + 99) * 900;
    g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + i); g.fillStyle = "#e6ecff"; g.fillRect(x, y, 2.4, 2.4);
  }
  g.globalAlpha = 1;
  // luna
  const mx = 820 - camx * 0.04, my = 360;
  const mg = g.createRadialGradient(mx, my, 10, mx, my, 220); mg.addColorStop(0, "rgba(255,248,220,0.35)"); mg.addColorStop(1, "rgba(255,248,220,0)");
  g.fillStyle = mg; g.fillRect(mx - 220, my - 220, 440, 440);
  g.fillStyle = "#f7efd2"; g.beginPath(); g.arc(mx, my, 62, 0, 7); g.fill();
  g.fillStyle = "#e3d6ae"; g.beginPath(); g.arc(mx - 18, my - 10, 12, 0, 7); g.arc(mx + 20, my + 16, 9, 0, 7); g.fill();
  void snow;
};

const ink = (w = 6) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };
const sandbag = (x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c; ink(5); g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = "rgba(36,23,38,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - w * 0.25, y - h * 0.1); g.lineTo(x - w * 0.15, y + h * 0.2); g.stroke();
};

const world = (t: number, snow: number) => {
  // árboles quemados lejanos
  g.fillStyle = "#2a2f3f";
  for (let i = 0; i < 9; i++) {
    const x = 200 + i * 390 + rnd(i) * 120, h = 260 + rnd(i + 5) * 200;
    g.fillRect(x, GROUND - h, 18, h);
    g.beginPath(); g.moveTo(x + 9, GROUND - h * 0.7); g.lineTo(x + 70, GROUND - h * 0.95); g.lineTo(x + 74, GROUND - h * 0.92); g.lineTo(x + 12, GROUND - h * 0.62); g.fill();
  }
  // suelo: barro con cráteres
  g.fillStyle = "#5a4836"; g.fillRect(-500, GROUND, 4400, 1400);
  for (let i = 0; i < 14; i++) {
    const x = 950 + i * 115 + rnd(i * 3) * 60, w = 70 + rnd(i) * 90;
    g.fillStyle = "#47382a"; g.beginPath(); g.ellipse(x, GROUND + 26, w, 18, 0, 0, 7); g.fill();
  }
  // nieve que se va acumulando
  if (snow > 0) {
    g.fillStyle = `rgba(240,244,255,${0.85 * snow})`; g.fillRect(-500, GROUND - 4, 4400, 14 * snow + 4);
    for (let i = 0; i < 60; i++) { const x = rnd(i + 7) * 3600 - 200; g.beginPath(); g.ellipse(x, GROUND + 10 + rnd(i) * 40, 30 + rnd(i + 1) * 60, 6, 0, 0, 7); g.fill(); }
  }
  ink(6); g.beginPath(); g.moveTo(-500, GROUND); g.lineTo(3900, GROUND); g.stroke();
  // trincheras en corte
  for (const [a, b] of [BTR, GTR]) {
    g.fillStyle = "#3a2c20"; g.fillRect(a, GROUND, b - a, FLOOR - GROUND + 40);
    g.fillStyle = "#4b3a2a"; for (let k = 0; k < 8; k++) g.fillRect(a + 10, GROUND + 30 + k * 26, b - a - 20, 3);
    g.fillStyle = "#6b5236"; for (let x = a + 10; x < b - 40; x += 90) { g.fillRect(x, FLOOR - 6, 80, 14); }
    ink(6); g.strokeRect(a, GROUND, b - a, FLOOR - GROUND + 40);
  }
  // parapetos de bolsas de arena del lado que mira al enemigo
  for (const [x0, dir] of [[BTR[1] - 40, 1], [GTR[0] + 40, -1]] as const) {
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) sandbag(x0 + dir * (-k * 66 - r * 33), GROUND - 18 - r * 34, 74, 38, r % 2 ? "#b7a375" : "#c8b588");
  }
  // alambre de púas
  for (let x = 1150; x < 2300; x += 210) {
    ink(5); g.beginPath(); g.moveTo(x - 30, GROUND); g.lineTo(x + 30, GROUND - 110); g.moveTo(x + 30, GROUND); g.lineTo(x - 30, GROUND - 110); g.stroke();
  }
  g.strokeStyle = "#8a8f96"; g.lineWidth = 3;
  for (let x = 1130; x < 2290; x += 18) { g.beginPath(); g.ellipse(x, GROUND - 60, 16, 44, 0.3, 0, 7); g.stroke(); }
};

// ------------------------------------------------------------------ efectos
const flash = (x: number, y: number, dir: number, k: number) => {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = `rgba(255,214,110,${k})`; g.beginPath();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, r = i % 2 ? 22 : 62 * k; g.lineTo(Math.cos(a) * r + 30, Math.sin(a) * r * 0.6); }
  g.fill(); g.restore();
};
const rifle = (x: number, footY: number, dir: number, k: number) => {
  // fusil apoyado al hombro y apuntando al frente
  g.save(); g.globalAlpha = clamp(k * 2); g.translate(x, footY); g.scale(dir, 1);
  ink(14); g.beginPath(); g.moveTo(-20, -262); g.lineTo(205, -268); g.stroke();
  g.strokeStyle = "#7a4b2a"; g.lineWidth = 9; g.beginPath(); g.moveTo(-20, -262); g.lineTo(110, -266); g.stroke();
  g.strokeStyle = "#8d949c"; g.lineWidth = 5; g.beginPath(); g.moveTo(110, -266); g.lineTo(203, -268); g.stroke();
  g.restore();
};
const tracer = (x0: number, y0: number, x1: number, y1: number, k: number) => {
  if (k <= 0 || k >= 1) return;
  const x = lerp(x0, x1, k), y = lerp(y0, y1, k), dx = (x1 - x0) * 0.06, dy = (y1 - y0) * 0.06;
  const gr = g.createLinearGradient(x - dx, y - dy, x, y); gr.addColorStop(0, "rgba(255,230,140,0)"); gr.addColorStop(1, "rgba(255,240,170,1)");
  g.strokeStyle = gr; g.lineWidth = 5; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x, y); g.stroke();
};
const flare = (x: number, y: number, k: number) => {
  const r = 380;
  const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, `rgba(255,236,170,${0.55 * k})`); gr.addColorStop(1, "rgba(255,236,170,0)");
  g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.fillStyle = "#fff6d0"; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
};
const tree = (x: number, y: number, k: number, t: number) => {
  if (k <= 0) return;
  g.save(); g.translate(x, y + (1 - back(k)) * 140);
  g.fillStyle = "#4a2f1a"; g.fillRect(-8, -30, 16, 34);
  const tiers = [[0, 110], [-60, 90], [-110, 66]];
  for (const [yy, w] of tiers) { g.fillStyle = "#2f6b3e"; ink(5); g.beginPath(); g.moveTo(-w, yy - 30); g.lineTo(w, yy - 30); g.lineTo(0, yy - 120); g.closePath(); g.fill(); g.stroke(); }
  for (let i = 0; i < 7; i++) { // velitas que titilan
    const cx = (rnd(i) - 0.5) * 140, cy = -60 - rnd(i + 3) * 120 + 40;
    const fl = 0.7 + 0.3 * Math.sin(t * 12 + i * 2);
    const gr = g.createRadialGradient(cx, cy, 1, cx, cy, 36); gr.addColorStop(0, `rgba(255,220,120,${0.8 * fl})`); gr.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = gr; g.fillRect(cx - 36, cy - 36, 72, 72); g.fillStyle = "#fff2c0"; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
  }
  g.fillStyle = "#f2c94c"; ink(4); g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 9 : 22; g.lineTo(Math.cos(a) * r, -170 + Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke(); g.restore();
};
const note = (x: number, y: number, k: number, s = 1) => {
  if (k <= 0 || k >= 1) return;
  g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.translate(x + Math.sin(k * 8) * 20, y - k * 220); g.scale(s, s);
  g.fillStyle = "#fff4cf"; ink(4); g.beginPath(); g.ellipse(0, 0, 16, 12, -0.4, 0, 7); g.fill(); g.stroke();
  g.fillRect(12, -60, 6, 60); g.beginPath(); g.moveTo(18, -60); g.quadraticCurveTo(40, -48, 34, -24); g.lineWidth = 6; g.strokeStyle = "#fff4cf"; g.stroke();
  g.restore();
};
const ball = (x: number, y: number, rot: number) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = "#f4f1e8"; ink(5); g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.stroke();
  g.fillStyle = INK; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 17, Math.sin(a) * 17, 6, 0, 7); g.fill(); }
  g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.restore();
};

// ------------------------------------------------------------------ texto estilo TikTok (blanco con borde negro, clave en amarillo)
const caption = (t: number) => {
  const C: [number, number, string, string[]][] = [
    [0.2, 3.4, "DICIEMBRE DE 1914", ["1914"]], [3.6, 6.2, "DOS TRINCHERAS ENEMIGAS…", ["ENEMIGAS…"]],
    [6.4, 8.6, "…Y DE REPENTE", ["REPENTE"]], [8.8, 10.8, "¿UN ARBOLITO DE NAVIDAD?", ["NAVIDAD?"]],
    [11.0, 14.6, "SE DEJARON DE DISPARAR", ["DISPARAR"]], [14.8, 18.8, "¡Y JUGARON AL FÚTBOL!", ["FÚTBOL!"]],
    [19.0, DUR, "LA TREGUA DE NAVIDAD", ["NAVIDAD"]],
  ];
  const c = C.find(([a, b]) => t >= a && t < b); if (!c) return;
  const [a, , txt, keys] = c, k = back(prog(t, a, 0.25));
  g.save(); g.translate(W / 2, 330); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); g.globalAlpha = clamp(k * 2);
  g.font = "84px 'Archivo Black'"; g.textBaseline = "middle"; g.lineJoin = "round";
  const words = txt.split(" "), sp = g.measureText(" ").width;
  // partir en dos renglones si no entra
  const lines: string[][] = [[]]; let lw = 0;
  for (const w of words) { const ww = g.measureText(w).width; if (lw + ww > 920 && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(w); lw += ww + sp; }
  lines.forEach((ln, li) => {
    const tw = ln.reduce((s, w) => s + g.measureText(w).width, 0) + sp * (ln.length - 1);
    let x = -tw / 2; const y = (li - (lines.length - 1) / 2) * 100;
    for (const w of ln) {
      g.lineWidth = 16; g.strokeStyle = "#0d0b10"; g.strokeText(w, x, y);
      g.fillStyle = keys.includes(w) ? "#ffd23f" : "#ffffff"; g.fillText(w, x, y); x += g.measureText(w).width + sp;
    }
  });
  g.restore();
};

// ------------------------------------------------------------------ cámara (centro de mundo x, y y zoom) por tramos
type Key = { t: number; x: number; y: number; z: number };
const KEYS: Key[] = [
  { t: 0, x: 600, y: 1190, z: 2.0 }, { t: 3.3, x: 660, y: 1180, z: 2.15 },
  { t: 3.75, x: 2860, y: 1180, z: 2.05 }, { t: 6.3, x: 2800, y: 1160, z: 2.2 },
  { t: 8.6, x: 2760, y: 1150, z: 2.1 }, { t: 9.1, x: 640, y: 1180, z: 2.1 }, { t: 10.7, x: 660, y: 1170, z: 2.25 },
  { t: 11.6, x: 1150, y: 1070, z: 1.5 }, { t: 14.4, x: 1710, y: 1060, z: 1.55 },
  { t: 15.0, x: 1720, y: 1060, z: 1.4 }, { t: 18.8, x: 1730, y: 1060, z: 1.45 }, { t: DUR, x: 1700, y: 1000, z: 0.62 },
];
const camAt = (t: number) => {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1], k = sstep((t - a.t) / (b.t - a.t));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
};

// ------------------------------------------------------------------ disparos: ráfagas de cada lado mientras dura el tiroteo
const SHOTS: { t: number; s: number }[] = [];
for (let i = 0; i < 26; i++) SHOTS.push({ t: 0.3 + i * 0.27 + rnd(i) * 0.1, s: i % 6 });
const firing = (t: number) => t < 6.9;

const frame = (i: number) => {
  const t = i / FPS, snow = ease(prog(t, 6.0, 4));
  const cam = camAt(t);
  // sacudida en cada disparo cercano a cámara
  let shx = 0, shy = 0;
  for (const s of SHOTS) { const d = t - s.t; if (d >= 0 && d < 0.2 && firing(s.t)) { const f = Math.round(d * FPS); shx += (f % 2 ? -1 : 1) * 7 * (1 - d / 0.2); shy += (f % 3 ? 1 : -1) * 4 * (1 - d / 0.2); } }
  g.setTransform(1, 0, 0, 1, 0, 0);
  sky(t, cam.x, snow);
  g.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z + shx, H / 2 - cam.y * cam.z + shy);
  // bengala que cae lentamente (luz cálida sobre todo)
  if (t < 8) flare(1700 + Math.sin(t) * 60, 500 + t * 60, 1 - prog(t, 6.5, 1.5));
  world(t, snow);
  // ---- soldados
  const outB = (k: number, s: Sold) => ({ x: s.x0 + k * (1640 - 780 - (780 - s.x0) * 0.4), y: lerp(FLOOR, GROUND, clamp(k * 4)) });
  const climb = (s: Sold, idx: number) => s.side === "B" ? prog(t, 11.0 + idx * 0.5, 3.2) : prog(t, 11.2 + idx * 0.5, 3.2);
  SOLD.forEach((s, idx) => {
    const facing: 1 | -1 = s.side === "B" ? 1 : -1, j = idx % 3;
    const blink = ((t + s.seed * 0.37) % (1.6 + j * 0.3)) < 0.12;
    const k = climb(s, j);
    // reacciones por tramo
    let expr: Expr = firing(t) ? "stern" : "neutral";
    if (t > 6.9 && t < 8.6) expr = "shock";
    if (t > 8.6) expr = s.side === "G" ? "smile" : t > 9.6 ? "grin" : "shock";
    if (t > 14.8) expr = j === 0 ? "laugh" : "grin";
    if (k <= 0) {
      // en la trinchera: asomados con el fusil
      const aim = firing(t) ? 1 : 1 - ease(prog(t, 6.9, 0.6));
      drawSoldier(s, s.x0, FLOOR, facing, { mode: aim > 0.05 ? "push" : "stand", pose: 0.55 * aim, expr, blink, rifle: aim <= 0.05 });
      if (aim > 0.05) rifle(s.x0, FLOOR, facing, aim);
      if (firing(t)) for (const sh of SHOTS) if (sh.s === idx) {
        const d = t - sh.t; const mx = s.x0 + facing * 205, my = FLOOR - 268;
        if (d >= 0 && d < 0.09) flash(mx, my, facing, 1 - d / 0.09);
        tracer(mx, my, s.side === "B" ? 2560 : 860, my + (rnd(sh.t) - 0.5) * 120, d / 0.5);
      }
    } else {
      // salen y caminan hacia el centro (sin fusil); se dan la mano; después corren detrás de la pelota
      const target = s.side === "B" ? 1640 - j * 150 : 1780 + j * 150;
      const x = lerp(s.x0, target, ease(k)), y = lerp(FLOOR, GROUND, clamp(k * 3));
      const walking = k < 1, play = t > 15.0;
      let mode: "march" | "stand" | "push" = walking ? "march" : "stand", pose = 0, phase = t * 1.8 + j * 0.3;
      let px = x;
      if (!walking && t > 13.2 && t < 15.0 && j === 0) { mode = "push"; pose = ease(prog(t, 13.2, 0.4)); } // apretón de manos
      if (play) { mode = "march"; phase = t * 3.2 + j * 0.37; px = x + Math.sin(t * 2.2 + j * 1.7 + (s.side === "G" ? 1 : 0)) * 90; }
      const face: 1 | -1 = play ? (Math.cos(t * 2.2 + j * 1.7 + (s.side === "G" ? 1 : 0)) > 0 ? 1 : -1) : facing;
      drawSoldier(s, px, y, face, { mode, phase, expr, blink, pose, rifle: false, stride: play ? 0.9 : 0.7 });
    }
  });
  // arbolito en el parapeto alemán + canto (notas musicales)
  tree(GTR[0] + 120, GROUND - 120, prog(t, 6.6, 0.6), t);
  for (let n = 0; n < 8; n++) note(GTR[0] + 260 + (n % 3) * 90, GROUND - 330, prog(t, 7.2 + n * 0.45, 1.6), 1.2);
  // pelota que rebota entre los jugadores
  if (t > 14.6) {
    const bt = t - 14.6, bx = 1710 + Math.sin(bt * 2.4) * 260, by = GROUND - 30 - Math.abs(Math.sin(bt * 4.8)) * 220;
    ball(bx, by, bt * 9);
  }
  // nieve cayendo (pantalla)
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (snow > 0) for (let n = 0; n < 220; n++) {
    const x = ((rnd(n) * W + Math.sin(t * 1.3 + n) * 30) % W + W) % W, y = ((rnd(n + 50) * H + t * (90 + rnd(n + 9) * 120)) % H);
    g.globalAlpha = snow * (0.4 + rnd(n + 3) * 0.6); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, 2 + rnd(n + 1) * 4, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  // viñeta + grano suave de película
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  caption(t);
};

(window as unknown as { __frame: (i: number) => void; __n: number; __done: boolean }).__frame = frame;
(window as unknown as { __n: number }).__n = Math.round(DUR * FPS);
document.fonts.load("84px 'Archivo Black'").then(() => { (window as unknown as { __done: boolean }).__done = true; });
