import * as THREE from 'three';
import { drawCharacter, drawHand, CAST } from './estilo.js';
import { EXPR } from './expr.js';
const W = 1080, H = 1920;
const G = await (await fetch('/guion.json')).json();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const sm = (a, b, t) => ease(clamp((t - a) / (b - a), 0, 1));
// ---------- enfermera (variante con ambo)
CAST.enfermera = { ...CAST.ana, id: 'enfermera', coat: undefined, outfit: 'shirt', top: '#5fb8a8', topS: '#4a9a8b', hair: '#5a3a2a', hairS: '#3e2718', brow: '#4a3020', irisCol: '#4a3a2c', skin: '#f0c6a4', skinS: '#d39f80' };
// ---------- render 3D
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace;
const S = new THREE.Scene(); S.background = new THREE.Color('#d7e7e3'); S.fog = new THREE.Fog('#d7e7e3', 6, 26);
const cam = new THREE.PerspectiveCamera(62, W / H, .05, 100);
const grad = (() => { const c = document.createElement('canvas'); c.width = 3; c.height = 1; const x = c.getContext('2d'); ['#9a9a9a', '#d6d6d6', '#ffffff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i, 0, 1, 1); }); const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; return t; })();
const toon = (c, map) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, map: map || null });
const LINE = new THREE.LineBasicMaterial({ color: '#2a3238' });
function bx(w, h, d, c, x, y, z, edge = true) { const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, toon(c)); m.position.set(x, y, z); S.add(m); if (edge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), LINE); e.position.copy(m.position); S.add(e); } return m; }
function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
const LEN = 60, WID = 3.6, HGT = 3.0;
const tiles = tex(256, 256, (x, w, h) => { x.fillStyle = '#e6eef0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#a9b8bd'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); }, [3, 60]);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(WID, LEN), toon('#ffffff', tiles)); floor.rotation.x = -Math.PI / 2; floor.position.z = -LEN / 2 + 5; S.add(floor);
const ceilT = tex(256, 256, (x, w, h) => { x.fillStyle = '#f4f6f6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c3cdd0'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); }, [3, 60]);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(WID, LEN), toon('#ffffff', ceilT)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HGT, -LEN / 2 + 5); S.add(ceil);
for (const s of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN, HGT), toon('#b8ddd4')); wall.rotation.y = -s * Math.PI / 2; wall.position.set(s * WID / 2, HGT / 2, -LEN / 2 + 5); S.add(wall);
  bx(.03, .35, LEN, '#4f9f95', s * (WID / 2 - .015), .175, -LEN / 2 + 5);
  bx(.06, .06, LEN, '#eef2f4', s * (WID / 2 - .08), .95, -LEN / 2 + 5);
  for (let i = 0; i < 10; i++) { const z = 2 - i * 5.5 - (s > 0 ? 2.7 : 0); bx(.05, 2.25, 1.2, '#f4f6f6', s * (WID / 2 - .03), 1.12, z); bx(.07, 2.1, 1.0, '#7fb8d6', s * (WID / 2 - .05), 1.05, z); bx(.08, .45, .3, '#d6ecf7', s * (WID / 2 - .06), 1.5, z - .2); }
}
// luces de techo (paneles que pasan por arriba de la camilla)
const lamps = []; for (let i = 0; i < 20; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.9, .45), new THREE.MeshBasicMaterial({ color: '#ffffff' })); p.rotation.x = Math.PI / 2; p.position.set(0, HGT - .01, 4 - i * 2.8); S.add(p); const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(.9, .45)), LINE); e.rotation.x = Math.PI / 2; e.position.copy(p.position); e.position.y -= .005; S.add(e); lamps.push(p); }
S.add(new THREE.HemisphereLight('#ffffff', '#c9d6d4', 1.6)); const dl = new THREE.DirectionalLight('#ffffff', 1.0); dl.position.set(1, 4, 2); S.add(dl);
// ---------- personajes como carteles (dibujo 2D dentro del 3D)
function billboard(char, hgt) { const c = document.createElement('canvas'); c.width = 600; c.height = 640; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(hgt * 600 / 640, hgt), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.renderOrder = 5; S.add(m); return { char, c, t, m }; }
const NURSE = billboard('enfermera', .9), DOC = billboard('house', .95);
async function paint(B, pose) { const ch = CAST[B.char], k = ch.scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="640" viewBox="${-300 * k} ${-1000 * k} ${600 * k} ${640 * k}"><defs><linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1"><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="mB"><rect x="${-300 * k}" y="${-1000 * k}" width="${600 * k}" height="${640 * k}" fill="url(#fadeB)"/></mask></defs><g mask="url(#mB)">${drawCharacter(B.char, pose)}</g></svg>`;
  const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await new Promise(r => { img.onload = r; img.src = u; }); const x = B.c.getContext('2d'); x.clearRect(0, 0, 600, 640); x.drawImage(img, 0, 0); URL.revokeObjectURL(u); B.t.needsUpdate = true; }
const talking = (who, t) => G.lines.some(l => l.who === who && t >= l.t0 && t < l.t1);
const mouth = (who, t) => talking(who, t) ? .12 + .7 * Math.abs(Math.sin(t * 13 + (who === 'doc' ? 1 : 0))) * (.6 + .4 * Math.abs(Math.sin(t * 3.1))) : 0;
const blink = (t, seed) => { const ph = ((t + seed) % 3.4) / 3.4; return ph > .955 ? .05 : 1; };
// ---------- capa 2D encima (mano del paciente, párpados, textos)
const OUT = document.createElement('canvas'); OUT.width = W; OUT.height = H; const OX = OUT.getContext('2d');
async function svgImg(svg) { const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await new Promise(r => { img.onload = r; img.src = u; }); URL.revokeObjectURL(u); return img; }
const lineAt = t => G.lines.find(l => t >= l.t0 - .3 && t < l.t1 + .45);
window.renderFrame = async (i) => {
  const t = i / 30, T = G.total;
  // camilla avanzando por el pasillo (se detiene al final)
  const z = -t * 1.15 + Math.max(0, t - 24) * 1.15;
  const sway = Math.sin(t * 7) * .012;
  // a quién mira la cámara
  let yaw = 0, pitch = 1.05;
  const L = lineAt(t); const who = L ? L.who : null;
  const toNurse = sm(1.0, 2.2, t) * (who === 'enf' ? 1 : 0), toDoc = who === 'doc' ? 1 : 0;
  const yawT = who === 'enf' ? -.12 : who === 'doc' ? .12 : 0, pitchT = who === 'doc' && t > 25 ? .58 : who ? .66 : 1.0;
  window._yaw = lerp(window._yaw ?? 0, yawT, .08); window._pitch = lerp(window._pitch ?? 1.05, t < 1.6 ? 1.05 : pitchT, .06);
  // (suavizado determinista por cuadro: se recalcula desde 0 si se pide un cuadro suelto)
  if (window._last !== i - 1) { window._yaw = yawT; window._pitch = t < 1.6 ? 1.05 : pitchT; } window._last = i;
  yaw = window._yaw; pitch = window._pitch;
  cam.position.set(0, 1.05 + sway, z);
  cam.rotation.set(0, 0, 0); cam.rotateY(yaw); cam.rotateX(pitch); cam.rotateZ(Math.sin(t * .9) * .015);
  // enfermera a la derecha caminando al lado; doctor aparece por la izquierda
  const nIn = sm(.8, 2.2, t), dIn = sm(11.0, 12.4, t);
  NURSE.m.position.set(.3 + (1 - nIn) * .8, 1.62 + Math.sin(t * 5) * .015, z - .8);
  DOC.m.position.set(lerp(-1.3, -.3, dIn), 1.66 + Math.sin(t * 4.2) * .01, z - .85 + (t > 25 ? .2 : 0));
  NURSE.m.lookAt(cam.position); DOC.m.lookAt(cam.position); DOC.m.visible = t > 10.8;
  await paint(NURSE, { face: { ...EXPR.worried, mouth: mouth('enf', t), look: [-.3, .7], open: blink(t, .3) }, head: { tilt: 6 }, armL: [10, -16], armR: [8, -10] });
  if (DOC.m.visible) await paint(DOC, { face: { ...(t > 30.5 ? EXPR.smug : EXPR.smirk), mouth: mouth('doc', t), look: [.3, .75], open: blink(t, 1.7) }, head: { tilt: -5 }, propL: 'cane', armL: [8, -6], armR: [40, 90], handR: 'open' });
  R.render(S, cam);
  // composición
  OX.save(); const blur = t < 3 ? (3 - t) * 4 : (t > T - 2.6 ? (t - (T - 2.6)) * 3 : 0); OX.filter = blur > .2 ? `blur(${blur.toFixed(1)}px)` : 'none'; OX.drawImage(R.domElement, 0, 0); OX.restore();
  // mano del paciente con pulsera (al despertar)
  const hp = sm(2.0, 3.2, t) * (1 - sm(8.5, 9.6, t));
  if (hp > 0) { const c = CAST.mujer; const handSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><g transform="translate(${260 + Math.sin(t * 2) * 8} ${2150 - hp * 420}) rotate(${-12 + Math.sin(t * 1.5) * 3})"><rect x="-70" y="40" width="140" height="420" rx="60" fill="#eac3a2" stroke="#26222a" stroke-width="5"/><rect x="-74" y="60" width="148" height="46" rx="10" fill="#f6f6f2" stroke="#26222a" stroke-width="4"/><rect x="-30" y="70" width="60" height="24" rx="4" fill="#9fc8e0"/>${drawHand({ ...c, skin: '#eac3a2', skinS: '#cfa284' }, 'open', [0, 50], [0, -1], true, 3.2)}</g></svg>`; OX.drawImage(await svgImg(handSvg), 0, 0); }
  // viñeta
  const v = OX.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,20,30,.55)'); OX.fillStyle = v; OX.fillRect(0, 0, W, H);
  // párpados: abrir al inicio (con un parpadeo) y cerrar al final
  let lid = 1 - sm(.2, 1.4, t); if (t > 1.6 && t < 2.2) lid = Math.max(lid, Math.sin((t - 1.6) / .6 * Math.PI) * .8); lid = Math.max(lid, sm(T - 2.4, T - 1.4, t));
  if (lid > 0) { OX.fillStyle = '#05070a'; const hh = lid * H * .52; OX.beginPath(); OX.moveTo(0, 0); OX.lineTo(W, 0); OX.lineTo(W, hh); OX.quadraticCurveTo(W / 2, hh + 140 * lid, 0, hh); OX.fill(); OX.beginPath(); OX.moveTo(0, H); OX.lineTo(W, H); OX.lineTo(W, H - hh); OX.quadraticCurveTo(W / 2, H - hh - 140 * lid, 0, H - hh); OX.fill(); }
  // rótulo de serie y cierre
  OX.font = '400 52px Anton'; OX.textAlign = 'left'; OX.fillStyle = 'rgba(255,255,255,.9)'; if (t > 1.4 && t < 6) OX.fillText('PARTE 1', 48, 120);
  if (t > T - 1.6) { const k = sm(T - 1.6, T - 1.1, t); OX.save(); OX.globalAlpha = k; OX.textAlign = 'center'; OX.font = '400 130px Anton'; OX.lineWidth = 14; OX.strokeStyle = '#000'; OX.strokeText('CONTINUARÁ...', W / 2, H / 2); OX.fillStyle = '#ffd34d'; OX.fillText('CONTINUARÁ...', W / 2, H / 2); OX.restore(); }
  return OUT.toDataURL('image/jpeg', .9);
};
await document.fonts.load('400 60px Anton');
window.ready = true;
