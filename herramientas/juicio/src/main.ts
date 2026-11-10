// Sala de juicio en 3D estilo dibujo (colores planos + contorno tinta) con personajes caricatura 2D en tarjetas.
// Render de cuadros fijos: la página lee ?shot=N, arma la escena, renderiza una vez y marca window.__done.
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode, BloomEffect } from "postprocessing";
import { InkPass, NOINK, noInkFallback } from "./ink";
import { Pen, bodyFront, INK, SKINS, type Outfit, type Expr, type FrontOpts } from "./toon";

const W = 1080, H = 1920;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const params = new URLSearchParams(location.search);
const SHOT = Number(params.get("shot") ?? 1);

// ------------------------------------------------------------------ texturas pintadas (Canvas2D)
const ctex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  return t;
};
const rng = (s: number) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const planks = (base: string, seam: string, n = 6, seed = 3) => ctex(512, 512, (g) => {
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const h = 512 / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.06})`; g.fillRect(0, i * h, 512, h);
    g.fillStyle = seam; g.fillRect(0, i * h, 512, 3);
    const x = r() * 512; g.fillRect(x, i * h, 3, h);
    g.strokeStyle = "rgba(60,30,10,0.10)"; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const y = i * h + 10 + r() * (h - 20); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 6, 340, y - 6, 512, y + 3); g.stroke(); }
  }
});
const paint = (base: string, seed = 7) => ctex(256, 256, (g) => {
  const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) { const v = r() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},0.022)`; g.beginPath(); g.arc(r() * 256, r() * 256, 10 + r() * 30, 0, 7); g.fill(); }
});
const panels = (base: string, line: string) => ctex(512, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = line; g.lineWidth = 6; g.strokeRect(i * 128 + 18, 26, 92, 204);
    g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(i * 128 + 24, 32, 80, 192);
  }
});
// emblema genérico de la justicia: balanza dentro de un círculo (sin escudos de ningún país)
const emblem = () => ctex(512, 512, (g) => {
  g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.fillStyle = "#e9d38e"; g.beginPath(); g.arc(256, 256, 212, 0, 7); g.fill();
  g.strokeStyle = "#2a1f12"; g.lineWidth = 14; g.lineCap = "round";
  g.beginPath(); g.moveTo(256, 120); g.lineTo(256, 380); g.moveTo(140, 170); g.lineTo(372, 170); g.moveTo(196, 390); g.lineTo(316, 390); g.stroke();
  for (const x of [140, 372]) {
    g.lineWidth = 6; g.beginPath(); g.moveTo(x, 170); g.lineTo(x - 50, 280); g.moveTo(x, 170); g.lineTo(x + 50, 280); g.stroke();
    g.fillStyle = "#8a6a2a"; g.beginPath(); g.ellipse(x, 284, 62, 18, 0, 0, Math.PI); g.fill(); g.lineWidth = 8; g.stroke();
  }
  g.fillStyle = "#2a1f12"; g.beginPath(); g.arc(256, 116, 16, 0, 7); g.fill();
}, [1, 1]);

// ------------------------------------------------------------------ materiales y piezas
const mats = new Map<string, THREE.Material>();
const lam = (key: string, p: THREE.MeshLambertMaterialParameters) => {
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial(p));
  return mats.get(key)!;
};
const WOOD = () => lam("wood", { map: planks("#a8683a", "#3b200f", 5, 11) });
const WOOD_DK = () => lam("woodDk", { map: planks("#7a4426", "#2a140a", 4, 5) });
const PANEL = () => lam("panel", { map: panels("#8f532d", "#5c3018") });
const WALL = () => lam("wall", { map: paint("#bfdccb", 9) });   // verde menta claro: contrasta con la madera
const FLOOR = () => { const t = planks("#b98352", "#4a2a14", 8, 21); t.repeat.set(5, 6); return lam("floor", { map: t }); };
const CARPET = () => lam("carpet", { map: paint("#8a2f2f", 4) });
const GREEN = () => lam("green", { color: "#3f6b4f" });

const box = (root: THREE.Object3D, min: THREE.Vector3, max: THREE.Vector3, m: THREE.Material, shadow = true) => {
  const s = max.clone().sub(min), g = new THREE.BoxGeometry(s.x, s.y, s.z);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(min.clone().add(max).multiplyScalar(0.5));
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  root.add(mesh); return mesh;
};
const rail = (root: THREE.Object3D, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, step = 0.32) => {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), n = Math.max(1, Math.round(L / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (dx * i) / n, z = z0 + (dz * i) / n;
    box(root, V(x - 0.035, y0, z - 0.035), V(x + 0.035, y0 + h, z + 0.035), WOOD_DK());
  }
  // pasamanos
  const top = new THREE.Mesh(new THREE.BoxGeometry(Math.max(Math.abs(dx), 0.12), 0.08, Math.max(Math.abs(dz), 0.12)), WOOD_DK());
  top.position.set((x0 + x1) / 2, y0 + h, (z0 + z1) / 2); top.castShadow = true; root.add(top);
};
const chair = (root: THREE.Object3D, x: number, z: number, yaw: number, col = "#3d2a20") => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g);
  const m = lam("chair" + col, { color: col });
  box(g, V(-0.25, 0.45, -0.25), V(0.25, 0.55, 0.25), m);
  box(g, V(-0.25, 0.55, 0.2), V(0.25, 1.15, 0.27), m);
  for (const [a, b] of [[-0.22, -0.22], [0.18, -0.22], [-0.22, 0.18], [0.18, 0.18]]) box(g, V(a, 0, b), V(a + 0.05, 0.45, b + 0.05), m);
};

// ------------------------------------------------------------------ sala
const buildRoom = (root: THREE.Object3D) => {
  const RW = 9, RZ0 = -8.5, RZ1 = 9, HT = 6.2;
  box(root, V(-RW, -0.1, RZ0), V(RW, 0, RZ1), FLOOR(), false);
  box(root, V(-1.1, 0, -4.8), V(1.1, 0.012, 2.6), CARPET(), false);
  // paredes con zócalo de madera
  box(root, V(-RW, 0, RZ0 - 0.2), V(RW, HT, RZ0), WALL(), false);
  box(root, V(-RW, 0, RZ0), V(RW, 1.3, RZ0 + 0.05), PANEL(), false);
  for (const s of [-1, 1]) {
    box(root, V(s * RW - (s > 0 ? 0 : 0.2), 0, RZ0), V(s * RW + (s > 0 ? 0.2 : 0), HT, RZ1), WALL(), false);
    box(root, V(s * RW - (s > 0 ? 0.05 : 0), 0, RZ0), V(s * RW + (s > 0 ? 0 : 0.05), 1.3, RZ1), PANEL(), false);
  }
  // ventanas altas en la pared izquierda (marco + vidrio claro)
  for (const z of [-5.5, -1, 3.5]) {
    box(root, V(-RW + 0.02, 2.2, z - 0.9), V(-RW + 0.08, 5.2, z + 0.9), lam("glass", { color: "#cfe3ef", emissive: "#9fc3dc", emissiveIntensity: 0.6 }), false);
    box(root, V(-RW + 0.05, 2.1, z - 1.0), V(-RW + 0.14, 2.2, z + 1.0), WOOD_DK(), false);
    box(root, V(-RW + 0.05, 5.2, z - 1.0), V(-RW + 0.14, 5.3, z + 1.0), WOOD_DK(), false);
    box(root, V(-RW + 0.05, 2.1, z - 0.05), V(-RW + 0.14, 5.3, z + 0.05), WOOD_DK(), false);
  }
  // cielo raso con vigas
  box(root, V(-RW, HT, RZ0), V(RW, HT + 0.1, RZ1), lam("ceil", { color: "#f4f1e8" }), false);
  for (let z = RZ0 + 2; z < RZ1; z += 3) box(root, V(-RW, HT - 0.35, z), V(RW, HT, z + 0.35), WOOD_DK(), false);

  // estrado del juez: tarima + mueble alto con paneles + emblema en la pared
  box(root, V(-3.2, 0, -8.3), V(3.2, 0.7, -5.4), WOOD_DK());
  box(root, V(-2.4, 0.7, -6.2), V(2.4, 1.75, -5.6), PANEL());
  box(root, V(-2.5, 1.75, -6.3), V(2.5, 1.85, -5.5), WOOD_DK());
  { const jc = new THREE.Group(); jc.position.y = 0.7; root.add(jc); chair(jc, 0, -7.0, 0, "#5a1f1f"); }
  box(root, V(-0.42, 0.7, -7.45), V(0.42, 2.75, -7.28), lam("chairBack", { color: "#7a2b2b" })); // respaldo alto
  const em = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), lam("emblem", { map: emblem() }));
  em.position.set(0, 3.9, RZ0 + 0.02); root.add(em);
  // banderines laterales (colores neutros, sin país)
  for (const s of [-1, 1]) {
    box(root, V(s * 2.6 - 0.03, 0.45, -8.1), V(s * 2.6 + 0.03, 3.6, -8.04), lam("pole", { color: "#c9a24a" }));
    box(root, V(s * 2.6 + (s > 0 ? -0.9 : 0.03), 2.2, -8.08), V(s * 2.6 + (s > 0 ? -0.03 : 0.9), 3.5, -8.06), lam("banner", { color: "#2f4a7a" }));
  }
  // estrado del testigo (izquierda del juez)
  box(root, V(-4.6, 0, -6.0), V(-3.2, 0.3, -4.6), WOOD_DK());
  box(root, V(-4.6, 0.3, -4.75), V(-3.2, 1.35, -4.6), PANEL());
  box(root, V(-4.65, 1.35, -4.8), V(-3.15, 1.42, -4.55), WOOD_DK());
  chair(root, -3.9, -5.4, 0);
  // banco del jurado (derecha), dos gradas con baranda
  box(root, V(4.3, 0, -5.6), V(8.9, 0.25, 0.6), WOOD_DK());
  box(root, V(6.4, 0.25, -5.6), V(8.9, 0.6, 0.6), WOOD_DK());
  box(root, V(4.1, 0, -5.6), V(4.3, 1.15, 0.6), PANEL());
  box(root, V(4.0, 1.15, -5.7), V(4.4, 1.22, 0.7), WOOD_DK());
  for (let i = 0; i < 4; i++) { chair(root, 5.3, -4.8 + i * 1.5, Math.PI / 2, "#3f2f26"); }
  for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.y = 0.35; root.add(c); chair(c, 7.4, -4.8 + i * 1.5, Math.PI / 2, "#3f2f26"); }
  // mesas de las partes
  for (const x of [-2.6, 2.4]) {
    box(root, V(x - 1.2, 0.74, -1.0), V(x + 1.2, 0.8, 0.0), WOOD());
    box(root, V(x - 1.15, 0, -0.95), V(x + 1.15, 0.74, -0.85), PANEL());
    for (const s of [-1, 1]) box(root, V(x + s * 1.1 - 0.04, 0, -0.95), V(x + s * 1.1 + 0.04, 0.74, -0.05), WOOD_DK());
    chair(root, x - 0.5, 0.45, Math.PI); chair(root, x + 0.5, 0.45, Math.PI);
  }
  // papeles y martillo sobre las mesas / estrado
  box(root, V(-3.0, 0.8, -0.7), V(-2.5, 0.81, -0.35), lam("paper", { color: "#f4f1e8" }));
  box(root, V(1.9, 0.8, -0.75), V(2.6, 0.82, -0.3), lam("paper", { color: "#f4f1e8" }));
  box(root, V(0.5, 1.85, -6.0), V(0.75, 1.9, -5.8), WOOD_DK());
  // baranda que separa al público + bancos del público
  rail(root, -RW + 0.3, -1.2, 2.0, 2.0, 0, 1.0); rail(root, 1.2, RW - 0.3, 2.0, 2.0, 0, 1.0);
  for (let r = 0; r < 3; r++) for (const s of [-1, 1]) {
    const z = 3.4 + r * 1.6, x0 = s > 0 ? 1.4 : -RW + 0.6, x1 = s > 0 ? RW - 0.6 : -1.4;
    box(root, V(x0, 0.45, z), V(x1, 0.52, z + 0.5), WOOD());
    box(root, V(x0, 0.52, z + 0.45), V(x1, 1.05, z + 0.52), WOOD());
    box(root, V(x0, 0, z + 0.05), V(x0 + 0.08, 0.45, z + 0.45), WOOD_DK()); box(root, V(x1 - 0.08, 0, z + 0.05), V(x1, 0.45, z + 0.45), WOOD_DK());
  }
  // planta en la esquina (detalle)
  const pot = box(root, V(7.8, 0, -8.0), V(8.5, 0.6, -7.3), lam("pot", { color: "#b5653f" }));
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), GREEN()); leaf.position.set(8.15, 1.2, -7.65); leaf.castShadow = true; root.add(leaf);
  void pot;
};

// ------------------------------------------------------------------ personajes (tarjetas que miran a la cámara)
const SU = 0.00216; // metros por unidad de diseño (1000 = 2,16 m)
type Who = { o: Outfit; opts: FrontOpts; at: THREE.Vector3; scale?: number };
const cards: THREE.Mesh[] = [];
const contactTex = ctex(128, 64, (g) => { const r = g.createRadialGradient(64, 32, 2, 64, 32, 62); r.addColorStop(0, "rgba(30,15,10,0.55)"); r.addColorStop(1, "rgba(30,15,10,0)"); g.fillStyle = r; g.save(); g.scale(1, 0.5); g.fillRect(0, 0, 128, 128); g.restore(); });
type Live = { m: THREE.Mesh; base: THREE.Vector3; set: (o: FrontOpts) => void };
const live: Live[] = [];
const addChar = (root: THREE.Object3D, w: Who): Live => {
  const cw = 600, ch = 1000, k = 1.6;
  const c = document.createElement("canvas"); c.width = cw * k; c.height = ch * k;
  const g = c.getContext("2d")!;
  let last = "";
  const draw = (o: FrontOpts) => {
    const key = JSON.stringify(o); if (key === last) return false; last = key;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, 0, 0);
    bodyFront(new Pen(g), w.o, o); return true;
  };
  draw(w.opts);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const s = (w.scale ?? 1) * SU;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(cw * s, ch * s), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }));
  m.geometry.translate(0, (ch / 2 - 975) * s * -1 + 0, 0); // suela en y = 0 del grupo
  m.position.copy(w.at); m.layers.set(NOINK); m.userData.sit = w.opts.mode === "sit";
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  m.castShadow = true;
  root.add(m); cards.push(m);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * (w.scale ?? 1), 0.45 * (w.scale ?? 1)), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(w.at.x, w.at.y + 0.015, w.at.z); sh.layers.set(NOINK); root.add(sh);
  const L: Live = { m, base: w.at.clone(), set: (o) => { if (draw(o)) t.needsUpdate = true; } };
  live.push(L); return L;
};
const hair = (col: string, extra: Partial<Outfit> = {}): Outfit => ({ jacket: "#3f6fb5", pants: "#3b3f52", boots: "#2a1f1a", hat: "hair", hair: col, ...extra });
const JUDGE: Outfit = { jacket: "#1f1d24", pants: "#1f1d24", boots: INK, hat: "hair", hair: "#d9d4cc", dress: "#1f1d24", skin: SKINS[1], moustache: "#d9d4cc", build: "stout" };
const PROSECUTOR: Outfit = hair("#2a201a", { jacket: "#2d3c5c", pants: "#2a2f3c", skin: SKINS[0] });
const DEFENSE: Outfit = hair("#6b3f22", { jacket: "#6a4b8a", pants: "#2f2a3a", skin: SKINS[3] });
const ACCUSED: Outfit = hair("#1c1414", { jacket: "#e07a2e", pants: "#e07a2e", boots: "#3a2a20", skin: SKINS[2] });
const JURORS: Outfit[] = [
  hair("#5a3b2a", { jacket: "#5d7a3a", skin: SKINS[0] }), hair("#c7a25a", { jacket: "#8c3b4a", dress: "#8c3b4a", skin: SKINS[1] }),
  hair("#2a201a", { jacket: "#2f5f6a", skin: SKINS[3] }), hair("#9a9a9a", { jacket: "#b5653f", skin: SKINS[0], moustache: "#9a9a9a" }),
  hair("#3a2418", { jacket: "#3f6fb5", dress: "#3f6fb5", skin: SKINS[2] }), hair("#6b3f22", { jacket: "#7b5ac9", skin: SKINS[1] }),
  hair("#1c1414", { jacket: "#c25a7a", dress: "#c25a7a", skin: SKINS[3] }), hair("#d9a441", { jacket: "#4a6a8a", skin: SKINS[0] }),
];
const GALLERY: Outfit[] = [0, 1, 2, 3, 4, 5].map((v) => hair(["#2a201a", "#6b3f22", "#c7a25a", "#1c1414", "#9a9a9a", "#5a3b2a"][v], { jacket: ["#566", "#8a6", "#a55", "#468", "#975", "#6a6"].map((c) => "#" + c.slice(1).split("").map((d) => d + d).join(""))[v], skin: SKINS[v % 4], ...(v % 2 ? { dress: ["#a55a6a", "#5a7aa5", "#7a5aa5"][v % 3] } : {}) }));

const cast = (root: THREE.Object3D, shot: number) => {
  const gavel = shot === 2 ? 0.95 : 0;
  addChar(root, { o: JUDGE, opts: { mode: "sit", expr: shot === 2 ? "stern" : "neutral", prop: ["hammer", gavel], seed: 4, facing: 0 }, at: V(0, 1.0, -6.75), scale: 1.2 });
  const jex: Expr[] = shot === 3 ? ["shock", "nervous", "stern", "shock", "pained", "neutral", "shock", "nervous"] : ["neutral", "stern", "neutral", "nervous", "neutral", "stern", "neutral", "neutral"];
  JURORS.forEach((o, i) => addChar(root, { o, opts: { mode: "sit", expr: jex[i], seed: 10 + i, facing: -1, look: -0.4 }, at: V(i < 4 ? 5.35 : 7.45, i < 4 ? 0.25 : 0.6, -4.8 + (i % 4) * 1.5) }));
  addChar(root, { o: PROSECUTOR, opts: { mode: "stand", expr: shot === 4 ? "shock" : "stern", seed: 31, facing: 0, wave: shot === 4 ? 1 : undefined }, at: V(1.9, 0, 0.55) });
  addChar(root, { o: DEFENSE, opts: { mode: "stand", expr: shot === 4 ? "grin" : "neutral", seed: 32, facing: 0, wave: shot === 4 ? 1 : undefined }, at: V(-2.1, 0, 0.55) });
  addChar(root, { o: ACCUSED, opts: { mode: "sit", expr: shot === 4 ? "nervous" : "nervous", seed: 33, facing: 0 }, at: V(-3.1, 0.0, 0.5) });
  GALLERY.forEach((o, i) => addChar(root, { o, opts: { mode: "sit", expr: i % 3 === 0 ? "shock" : "neutral", seed: 50 + i, facing: 0 }, at: V([-6.5, -4.5, -2.8, 2.8, 4.6, 6.6][i], 0.1, 3.6 + (i % 2) * 1.6) }));
};

// ------------------------------------------------------------------ tarjetas 2D sobre la escena (pruebas, rótulos)
const evidenceCard = (root: THREE.Object3D, at: THREE.Vector3, size: number, title: string, draw: (g: CanvasRenderingContext2D) => void, rot = 0) => {
  const t = ctex(600, 760, (g) => {
    g.fillStyle = "#f6efdc"; g.strokeStyle = "#241726"; g.lineWidth = 14;
    g.beginPath(); g.roundRect(10, 10, 580, 740, 28); g.fill(); g.stroke();
    g.fillStyle = "#241726"; g.fillRect(10, 10, 580, 110);
    g.fillStyle = "#f6efdc"; g.font = "bold 58px 'Archivo Black', sans-serif"; g.textAlign = "center"; g.fillText(title, 300, 88);
    draw(g);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 760 / 600), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  m.position.copy(at); m.rotation.z = rot; m.layers.set(NOINK); root.add(m); cards.push(m);
  return m;
};
const fingerprint = (g: CanvasRenderingContext2D) => {
  g.strokeStyle = "#3a5a9a"; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 11; i++) { g.beginPath(); g.ellipse(300, 440, 40 + i * 20, 60 + i * 23, 0.15, Math.PI * (0.05 + (i % 3) * 0.04), Math.PI * (1.85 - (i % 2) * 0.1)); g.stroke(); }
  g.fillStyle = "#c0353a"; g.font = "bold 44px 'IBM Plex Mono', monospace"; g.textAlign = "center"; g.fillText("PRUEBA N.º 3", 300, 720);
};

// ------------------------------------------------------------------ cámara por toma
type Cam = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll?: number };
const CAMS: Record<number, Cam> = {
  1: { pos: V(-3.2, 4.6, 8.6), look: V(1.9, 1.3, -3.6), fov: 56, roll: -2 },
  2: { pos: V(0.8, 2.7, -3.4), look: V(-0.1, 2.5, -6.9), fov: 36, roll: 3 },
  3: { pos: V(1.4, 2.6, -1.0), look: V(6.3, 1.45, -2.3), fov: 50, roll: -3 },
  4: { pos: V(-1.7, 1.8, 3.9), look: V(-2.5, 1.35, 0.3), fov: 52, roll: 2 },
};
const CAPTION: Record<number, [string, string?]> = { 1: ["¿culpable", "o inocente?"], 2: ["orden en la sala"], 3: ["el jurado"], 4: ["¡objeción!"] };

// ------------------------------------------------------------------ render
const run = async () => {
  await document.fonts.ready;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f2efe6");
  const root = new THREE.Group(); scene.add(root);
  buildRoom(root);
  cast(root, SHOT);
  if (SHOT === 4) evidenceCard(root, V(-1.75, 2.15, 0.9), 0.62, "HUELLA", fingerprint, -0.08);

  // luz: cielo cálido + sol que entra por las ventanas (izquierda) + relleno frío
  scene.add(new THREE.HemisphereLight("#f4f6ff", "#6d5a50", 1.5));
  const sun = new THREE.DirectionalLight("#fff0d6", 3.0);
  sun.position.set(-14, 11, 4); sun.target.position.set(1, 0, -2); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera as THREE.OrthographicCamera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 50;
  const fill = new THREE.DirectionalLight("#bcd2ff", 0.35); fill.position.set(8, 6, 10); scene.add(fill);

  const c = CAMS[SHOT] ?? CAMS[1];
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.1, 200);
  cam.position.copy(c.pos); cam.lookAt(c.look);
  if (c.roll) cam.rotateZ((c.roll * Math.PI) / 180);
  // tarjetas: giran sobre su eje vertical para mirar a la cámara
  for (const m of cards) {
    const d = cam.position.clone().sub(m.position); d.y = 0;
    if (m.userData.sit) m.position.addScaledVector(d.normalize(), 0.3);
    const e = cam.position.clone().sub(m.position);
    m.rotation.y = Math.atan2(e.x, e.z);
  }
  noInkFallback(root);

  const composer = new EffectComposer(renderer, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new InkPass(scene, cam, {}));
  composer.addPass(new EffectPass(cam, new BloomEffect({ luminanceThreshold: 1.0, intensity: 0.4 }), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));
  composer.setSize(W, H);
  composer.render();

  // rótulo con palabras clave, como en la referencia (texto 2D encima del 3D)
  const cap = CAPTION[SHOT];
  if (cap) {
    const d = document.createElement("div"); d.className = "cap";
    d.innerHTML = cap.map((l, i) => `<div class="${i === 0 && SHOT === 1 ? "" : ""}">${l.replace("culpable", '<span class="red">culpable</span>').replace("¡objeción!", '<span class="red">¡objeción!</span>')}</div>`).join("");
    document.body.appendChild(d);
  }
  (window as unknown as { __done: boolean }).__done = true;
};

// ------------------------------------------------------------------ animación de prueba (10 s, 30 fps)
// La página arma la escena una vez y expone window.__frame(i): posa todo para el cuadro i y lo renderiza.
const FPS = 30;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sstep = (x: number) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const backOut = (x: number) => { x = clamp01(x) - 1; return 1 + x * x * (2.7 * x + 1.7); };
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
type Shot = { a: number; b: number; p0: THREE.Vector3; p1: THREE.Vector3; l0: THREE.Vector3; l1: THREE.Vector3; fov: number; roll: number; cap: string; capAt: number };
const SHOTS_A: Shot[] = [
  { a: 0, b: 3.0, p0: V(-3.4, 4.8, 9.0), p1: V(-2.6, 4.0, 7.2), l0: V(1.6, 1.4, -3.8), l1: V(1.6, 1.4, -4.2), fov: 56, roll: -2, cap: '¿<span class="red">culpable</span><br>o inocente?', capAt: 0.25 },
  { a: 3.0, b: 5.5, p0: V(0.9, 2.75, -3.2), p1: V(0.7, 2.65, -3.9), l0: V(-0.1, 2.45, -6.9), l1: V(-0.1, 2.45, -6.9), fov: 36, roll: 3, cap: "orden en la sala", capAt: 3.75 },
  { a: 5.5, b: 8.0, p0: V(-1.6, 1.85, 4.2), p1: V(-1.8, 1.75, 3.6), l0: V(-2.5, 1.35, 0.3), l1: V(-2.5, 1.35, 0.3), fov: 52, roll: 2, cap: '<span class="red">¡objeción!</span>', capAt: 6.6 },
  { a: 8.0, b: 10.0, p0: V(1.2, 2.7, -0.7), p1: V(1.9, 2.45, -1.4), l0: V(6.3, 1.45, -2.3), l1: V(6.3, 1.45, -2.3), fov: 50, roll: -3, cap: "el jurado decide…", capAt: 8.45 },
];
const STRIKES = [3.8, 4.45];
const blinkAt = (t: number, seed: number) => { const per = 1.4 + (seed % 5) * 0.23, ph = (seed * 0.37) % per; return ((t + ph) % per) < 4 / FPS; };

const anim = async () => {
  await document.fonts.ready;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#f2efe6");
  const root = new THREE.Group(); scene.add(root);
  buildRoom(root);
  const judge = addChar(root, { o: JUDGE, opts: { mode: "sit", expr: "neutral", seed: 4 }, at: V(0, 1.0, -6.75), scale: 1.2 });
  const jur = JURORS.map((o, i) => addChar(root, { o, opts: { mode: "sit", expr: "neutral", seed: 10 + i, facing: -1, look: -0.4 }, at: V(i < 4 ? 5.35 : 7.45, i < 4 ? 0.25 : 0.6, -4.8 + (i % 4) * 1.5) }));
  const pros = addChar(root, { o: PROSECUTOR, opts: { mode: "stand", expr: "stern", seed: 31 }, at: V(1.9, 0, 0.55) });
  const def = addChar(root, { o: DEFENSE, opts: { mode: "stand", expr: "neutral", seed: 32 }, at: V(-2.1, 0, 0.55) });
  const acc = addChar(root, { o: ACCUSED, opts: { mode: "sit", expr: "nervous", seed: 33 }, at: V(-3.1, 0, 0.5) });
  const gal = GALLERY.map((o, i) => addChar(root, { o, opts: { mode: "sit", expr: "neutral", seed: 50 + i }, at: V([-6.5, -4.5, -2.8, 2.8, 4.6, 6.6][i], 0.1, 3.6 + (i % 2) * 1.6) }));
  const card = evidenceCard(root, V(-1.75, 2.15, 0.9), 0.62, "HUELLA", fingerprint, -0.08);
  scene.add(new THREE.HemisphereLight("#f4f6ff", "#6d5a50", 1.5));
  const sun = new THREE.DirectionalLight("#fff0d6", 3.0);
  sun.position.set(-14, 11, 4); sun.target.position.set(1, 0, -2); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera as THREE.OrthographicCamera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 50;
  const fill = new THREE.DirectionalLight("#bcd2ff", 0.35); fill.position.set(8, 6, 10); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
  noInkFallback(root);
  const composer = new EffectComposer(renderer, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new InkPass(scene, cam, {}));
  composer.addPass(new EffectPass(cam, new BloomEffect({ luminanceThreshold: 1.0, intensity: 0.4 }), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));
  composer.setSize(W, H);
  const capEl = document.createElement("div"); capEl.className = "cap"; document.body.appendChild(capEl);

  (window as unknown as { __frame: (i: number) => void }).__frame = (i: number) => {
    const t = i / FPS;
    const sh = SHOTS_A.find((s) => t >= s.a && t < s.b) ?? SHOTS_A[SHOTS_A.length - 1];
    const k = sstep((t - sh.a) / (sh.b - sh.a));
    // sacudida al golpe del martillo: cambia de signo cada cuadro y se apaga en 7 cuadros
    let shake = 0;
    for (const s of STRIKES) { const f = Math.round((t - s) * FPS); if (f >= 0 && f < 7 && sh.a === 3.0) shake += (f % 2 ? -1 : 1) * 0.03 * (1 - f / 7); }
    const evK = backOut((t - 5.9) / 0.35);
    if (sh.a === 5.5) { const f = Math.round((t - 6.6) * FPS); if (f >= 0 && f < 7) shake += (f % 2 ? -1 : 1) * 0.025 * (1 - f / 7); }
    cam.fov = sh.fov; cam.updateProjectionMatrix();
    cam.position.copy(lerpV(sh.p0, sh.p1, k)); cam.position.y += shake;
    cam.up.set(0, 1, 0); cam.lookAt(lerpV(sh.l0, sh.l1, k)); cam.rotateZ((sh.roll * Math.PI) / 180);
    // poses y caras según el tiempo
    const strike = Math.max(0, ...STRIKES.map((s) => (t >= s - 0.12 && t < s ? (t - (s - 0.12)) / 0.12 : t >= s && t < s + 0.25 ? 1 - (t - s) / 0.25 : 0)));
    judge.set({ mode: "sit", expr: t >= 3.6 ? "stern" : "neutral", seed: 4, prop: t >= 3.0 ? ["hammer", Math.round(strike * 10) / 10] : null, blink: blinkAt(t, 4) && strike === 0 });
    jur.forEach((L, j) => {
      const react = t >= 8.4 + j * 0.12;
      const ex: Expr[] = ["shock", "nervous", "stern", "shock", "pained", "shock", "nervous", "shock"];
      L.set({ mode: "sit", expr: react ? ex[j] : "neutral", seed: 10 + j, facing: -1, look: -0.4, blink: blinkAt(t, 10 + j) && !react });
    });
    const obj = t >= 6.6;
    def.set({ mode: "stand", expr: obj ? "grin" : "neutral", seed: 32, wave: obj ? 1 : undefined, blink: blinkAt(t, 32) });
    pros.set({ mode: "stand", expr: t >= 6.75 ? "shock" : "stern", seed: 31, blink: blinkAt(t, 31) });
    acc.set({ mode: "sit", expr: "nervous", seed: 33, blink: blinkAt(t, 33), look: Math.sin(t * 5) > 0.6 ? 0.4 : 0 });
    gal.forEach((L, j) => L.set({ mode: "sit", expr: t >= 6.7 && j % 2 === 0 ? "shock" : "neutral", seed: 50 + j, blink: blinkAt(t, 50 + j) }));
    // tarjeta de prueba: entra girando con rebote
    card.visible = t >= 5.9 && sh.a === 5.5;
    card.scale.setScalar(Math.max(0.001, evK)); card.rotation.z = -0.08 + (1 - clamp01((t - 5.9) / 0.35)) * 0.6;
    // tarjetas de personajes: miran a la cámara; las sentadas se adelantan para no quedar tras respaldos
    for (const L of live) {
      const d = cam.position.clone().sub(L.base); d.y = 0; d.normalize();
      L.m.position.copy(L.base); if (L.m.userData.sit) L.m.position.addScaledVector(d, 0.3);
      const e = cam.position.clone().sub(L.m.position); L.m.rotation.y = Math.atan2(e.x, e.z);
    }
    { const e = cam.position.clone().sub(card.position); card.rotation.y = Math.atan2(e.x, e.z); }
    composer.render();
    // rótulo: aparece con un pequeño rebote
    const ck = t >= sh.capAt ? backOut((t - sh.capAt) / 0.22) : 0;
    capEl.innerHTML = ck > 0 ? `<div>${sh.cap}</div>` : "";
    capEl.style.transform = `scale(${0.7 + 0.3 * ck})`; capEl.style.opacity = String(clamp01(ck * 1.4));
  };
  (window as unknown as { __done: boolean }).__done = true;
};

if (params.get("anim")) anim(); else run();
