// "Elegí la puerta": mundo 3D con acabado de dibujo (cel shading + contorno) y personajes 2D.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { drawCharacter } from './estilo.js';
import { EXPR, POSE } from './expr.js';
import { houseFull } from './housefull.js';
const W = 1080, H = 1920, Q = new URLSearchParams(location.search), REVEAL = !!Q.get('reveal');
const INK = '#1b1820';
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace;
const S = new THREE.Scene(); S.background = new THREE.Color('#cfe6e0');
const cam = new THREE.PerspectiveCamera(64, W / H, .05, 100);
const grad = (() => { const c = document.createElement('canvas'); c.width = 3; c.height = 1; const x = c.getContext('2d'); ['#a3a3a3', '#dcdcdc', '#ffffff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i, 0, 1, 1); }); const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
const toon = (c, map, ex = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, map: map || null, ...ex });
const HULL = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
// caja redondeada con contorno de tinta (casco invertido)
function box(w, h, d, c, x, y, z, o = {}) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(o.r ?? .025, w / 2.1, h / 2.1, d / 2.1));
  const m = new THREE.Mesh(g, o.mat || toon(c, o.map)); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry;
  if (o.line !== false) { const t = o.t ?? .018; const hl = new THREE.Mesh(g, HULL); hl.scale.set((w + 2 * t) / w, (h + 2 * t) / h, (d + 2 * t) / d); m.add(hl); }
  (o.parent || S).add(m); return m;
}
function plane(w, h, c, x, y, z, rx = 0, ry = 0, map) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon(c, map)); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); S.add(m); return m; }
const ln = (pts, w = 3) => { const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p))); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: INK })); S.add(l); return l; };
// ---------- sala de espera / fondo del pasillo
const WX = 4.2, ZB = -5, HG = 3.2;
const tiles = tex(512, 512, (x, w, h) => { x.fillStyle = '#e9efec'; x.fillRect(0, 0, w, h); x.fillStyle = '#dbe5e2'; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); x.strokeStyle = '#b4c3c0'; x.lineWidth = 4; x.strokeRect(0, 0, w / 2, h / 2); x.strokeRect(w / 2, h / 2, w / 2, h / 2); }, [5, 6]);
plane(WX * 2, 12, '#ffffff', 0, 0, ZB + 6, -Math.PI / 2, 0, tiles);
const ceilT = tex(256, 256, (x, w, h) => { x.fillStyle = '#f6f8f7'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9d3d1'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); }, [8, 12]);
plane(WX * 2, 12, '#ffffff', 0, HG, ZB + 6, Math.PI / 2, 0, ceilT);
// pared del fondo con huecos de puertas (3 paños + dintel)
const DW = 1.2, DH = 2.25, DX = 1.42;
const wallC = '#a9d9cb';
const seg = (x0, x1) => box(x1 - x0, HG, .2, wallC, (x0 + x1) / 2, HG / 2, ZB, { line: false });
seg(-WX, -DX - DW / 2); seg(-DX + DW / 2, DX - DW / 2); seg(DX + DW / 2, WX);
for (const s of [-1, 1]) box(DW, HG - DH, .2, wallC, s * DX, DH + (HG - DH) / 2, ZB, { line: false });
box(WX * 2, .26, .26, '#5fa592', 0, .13, ZB + .12, { t: .012 });                       // zócalo

for (const s of [-1, 1]) {                                                             // paredes laterales
  plane(12, HG, '#b9e2d6', s * WX, HG / 2, ZB + 6, 0, -s * Math.PI / 2);
  box(.26, .26, 12, '#5fa592', s * (WX - .12), .13, ZB + 6, { t: .012 });
}
// puertas: marco, hoja abierta, cuarto detrás con camilla y ventana
const rooms = [];
for (const [s, n] of [[-1, 1], [1, 2]]) {
  const cx = s * DX;
  box(.14, DH + .1, .32, '#f7f9f8', cx - DW / 2 - .02, DH / 2, ZB, { t: .016 });
  box(.14, DH + .1, .32, '#f7f9f8', cx + DW / 2 + .02, DH / 2, ZB, { t: .016 });
  box(DW + .32, .16, .32, '#f7f9f8', cx, DH + .05, ZB, { t: .016 });
  // hoja de la puerta abierta hacia adentro del cuarto (bisagra del lado externo)
  const hinge = new THREE.Group(); hinge.position.set(cx + s * DW / 2, 0, ZB - .1); hinge.rotation.y = s * 1.15; S.add(hinge);
  box(DW - .06, DH - .04, .07, '#6fa8d6', -s * (DW - .06) / 2, DH / 2, 0, { parent: hinge, t: .014 });
  box(.4, .55, .08, '#d9eef8', -s * (DW - .06) / 2, 1.55, 0, { parent: hinge, t: .01 });
  box(.05, .2, .1, '#c9cfd4', -s * (DW - .2), 1.05, .05, { parent: hinge, t: .008 });
  // cuarto
  const RZ = ZB - .1, RD = 3.2, RW = 3.0, inside = toon('#fbeed0', null, REVEAL ? { emissive: n === 2 ? '#ff2a1a' : '#000000', emissiveIntensity: n === 2 ? .45 : 0, color: n === 1 ? '#8c8778' : '#fbeed0' } : {});
  const rm = new THREE.Group(); S.add(rm);
  const rp = (w, h, x, y, z, rx, ry, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), c ? toon(c) : inside); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); rm.add(m); return m; };
  rp(RW, HG, cx, HG / 2, RZ - RD, 0, 0);                                   // fondo
  rp(RD, HG, cx - RW / 2, HG / 2, RZ - RD / 2, 0, Math.PI / 2);             // lados
  rp(RD, HG, cx + RW / 2, HG / 2, RZ - RD / 2, 0, -Math.PI / 2);
  rp(RW, RD, cx, 0, RZ - RD / 2, -Math.PI / 2, 0, '#e8dcc0');               // piso
  rp(RW, RD, cx, HG, RZ - RD / 2, Math.PI / 2, 0, '#fff7e6');
  box(RW, .9, .05, '#f1e0b8', cx, .45, RZ - RD + .03, { line: false });     // zócalo del cuarto
  box(1.0, .7, .06, '#bfe3f5', cx + s * .55, 1.7, RZ - RD + .05, { t: .014 }); // ventana
  box(1.1, .1, .1, '#f7f9f8', cx + s * .55, 1.3, RZ - RD + .1, { t: .012 });
  // camilla
  box(.9, .12, 1.9, '#ffffff', cx + s * .75, .7, RZ - 2.0, { t: .014 }); box(.88, .14, .5, '#d6ecf7', cx + s * .75, .82, RZ - 2.75, { t: .012 });
  for (const [ax, az] of [[-.38, -.85], [.38, -.85], [-.38, .85], [.38, .85]]) box(.05, .62, .05, '#9aa5ab', cx + s * .75 + ax, .32, RZ - 2.0 + az, { t: .008 });
  // cartel con número arriba de la puerta
  const sign = tex(256, 256, (x, w, h) => { x.fillStyle = REVEAL ? (n === 2 ? '#e2453a' : '#8a9496') : '#2f7fd0'; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill(); x.lineWidth = 12; x.strokeStyle = INK; x.stroke(); x.fillStyle = '#fff'; x.font = '800 170px Montserrat'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 128, 140); });
  const sg = new THREE.Mesh(new THREE.CircleGeometry(.36, 48), new THREE.MeshBasicMaterial({ map: sign, transparent: true })); sg.position.set(cx, DH + .58, ZB + .13); S.add(sg);
  rooms.push({ cx, n, rm });
}
// detalles de la sala: banco, planta, dispenser, reloj, luces de techo
box(.38, .45, .38, '#d97a4a', WX - .45, .23, ZB + .5, { t: .014 });
for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const lf = box(.12, .7, .03, '#4fae6c', WX - .45 + Math.cos(a) * .1, .75, ZB + .5 + Math.sin(a) * .1, { t: .01, r: .05 }); lf.rotation.set(Math.sin(a) * .5, a, Math.cos(a) * .5); }
const clock = tex(256, 256, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill(); x.lineWidth = 14; x.strokeStyle = INK; x.stroke(); x.lineCap = 'round'; x.lineWidth = 12; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 50); x.moveTo(128, 128); x.lineTo(185, 150); x.stroke(); });
const ck = new THREE.Mesh(new THREE.CircleGeometry(.28, 40), new THREE.MeshBasicMaterial({ map: clock, transparent: true })); ck.position.set(0, 2.55, ZB + .12); S.add(ck);
for (const z of [ZB + 1.5, ZB + 4, ZB + 6.5]) for (const x of [-1.6, 1.6]) box(1.1, .04, .5, '#ffffff', x, HG - .02, z, { t: .012, mat: new THREE.MeshBasicMaterial({ color: '#ffffff' }) });
S.add(new THREE.HemisphereLight('#ffffff', '#b9cfc9', 1.7));
const sun = new THREE.DirectionalLight('#ffffff', 1.3); sun.position.set(-2, 5, 4); S.add(sun);
// ---------- personajes 2D como carteles dentro del mundo
async function svgTex(svg, w, h) { const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await new Promise(r => { img.onload = r; img.src = u; }); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(u); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
async function person(svgInner, vb, upm, x, z, opts = {}) {
  const [vx, vy, vw, vh] = vb, pw = vw / upm, ph = vh / upm, px = 900, py = Math.round(px * vh / vw);
  const t = await svgTex(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="${vb.join(' ')}">${svgInner}</svg>`, px, py);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .4, color: opts.tint || '#ffffff' }));
  m.position.set(x + (vx + vw / 2) / upm, -(vy + vh / 2) / upm, z); S.add(m);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.36, 32), new THREE.MeshBasicMaterial({ color: '#0d2420', transparent: true, opacity: .22 })); sh.rotation.x = -Math.PI / 2; sh.scale.set(1, .45, 1); sh.position.set(x, .005, z); S.add(sh);
  return m;
}
const dim = REVEAL ? '#7d8790' : '#ffffff';
await person(drawCharacter('hombre', { face: { ...EXPR.shock, tears: .7, sweat: 1 }, ...POSE.headhold }), [-300, -1000, 600, 1010], 540, -DX - .05, ZB - .85, { tint: dim });
await person(drawCharacter('madre', { face: { ...EXPR.worried, sweat: 1 }, ...POSE.chin }), [-300, -1000, 600, 1010], 540, DX + .05, ZB - .85);
// House: cuerpo entero sin la sombra dibujada (la pone el piso)
await person(houseFull().replace(/<ellipse[^>]*\/>/, ''), [-330, -1700, 640, 1712], 880, 0, ZB + 1.5);
cam.position.set(0, 1.45, ZB + 6.2); cam.lookAt(0, 1.38, ZB);
// ---------- capa 2D encima: título, síntomas, cuenta regresiva
const OUT = document.createElement('canvas'); OUT.width = W; OUT.height = H; const X = OUT.getContext('2d');
const toScr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
function pill(x, y, w, h, fill, r, lw = 6) { X.beginPath(); X.roundRect(x, y, w, h, r); X.fillStyle = fill; X.fill(); X.lineWidth = lw; X.strokeStyle = INK; X.stroke(); }
function text(s, x, y, size, col = INK, align = 'center') { X.font = `800 ${size}px Montserrat`; X.textAlign = align; X.textBaseline = 'middle'; X.fillStyle = col; X.fillText(s, x, y); }
const chips = { 1: ['Brazo fracturado', 'Grita de dolor', 'Sangra mucho'], 2: ['"Es acidez"', 'Le duele la mandíbula', 'Sudor frío'] };
window.renderFrame = async () => {
  R.render(S, cam);
  X.drawImage(R.domElement, 0, 0);
  // grano de papel suave + viñeta
  const v = X.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,30,30,.35)'); X.fillStyle = v; X.fillRect(0, 0, W, H);
  // título
  X.save(); X.shadowColor = 'rgba(0,0,0,.3)'; X.shadowOffsetY = 8; X.shadowBlur = 14; pill(70, 50, 940, 160, '#ffffff', 34, 8); X.restore();
  text('¿A QUIÉN ATENDÉS', 540, 105, 58); text('PRIMERO?', 540, 168, 62, '#e2453a');
  // síntomas sobre cada puerta (anclados a la posición 3D)
  for (const { cx, n } of rooms) {
    const [sx, sy] = toScr(cx, DH + .95, ZB + .1);
    chips[n].forEach((c, i) => { X.font = '800 30px Montserrat'; const w = X.measureText(c).width + 44, y = 245 + i * 62; const x = Math.min(Math.max(sx, w / 2 + 12), W - w / 2 - 12);
      X.save(); X.shadowColor = 'rgba(0,0,0,.25)'; X.shadowOffsetY = 5; X.shadowBlur = 8; pill(x - w / 2, y, w, 52, REVEAL && n === 1 ? '#d6dadc' : '#ffffff', 26, 5); X.restore(); text(c, x, y + 27, 30); });
  }
  if (REVEAL) { const [sx, sy] = toScr(DX, 1.0, ZB - .2); X.save(); X.translate(sx, sy); X.rotate(-.1); X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowOffsetY = 8; X.shadowBlur = 12; pill(-200, -55, 400, 110, '#e2453a', 18, 8); X.restore(); X.save(); X.translate(sx, sy); X.rotate(-.1); text('¡INFARTO!', 0, 4, 62, '#fff'); X.restore(); }
  // banda inferior
  if (REVEAL) { X.save(); X.shadowColor = 'rgba(0,0,0,.3)'; X.shadowOffsetY = -6; X.shadowBlur = 16; pill(-10, 1690, 1100, 260, '#ffffff', 0, 8); X.restore(); }
  if (!REVEAL && Q.get('cta')) {
    text('COMENTÁ', 320, 1775, 58); text('1  o  2', 320, 1850, 70, '#2f7fd0');
    X.beginPath(); X.arc(820, 1700, 120, 0, 7); X.fillStyle = '#ffd23f'; X.fill(); X.lineWidth = 9; X.strokeStyle = INK; X.stroke();
    X.beginPath(); X.arc(820, 1700, 98, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .8); X.lineWidth = 18; X.lineCap = 'round'; X.strokeStyle = '#e2453a'; X.stroke(); text('5', 820, 1708, 120);
  } else if (REVEAL) { text('En mujeres, el infarto', 540, 1760, 50); text('puede parecer ACIDEZ', 540, 1840, 58, '#e2453a'); }
  return OUT.toDataURL('image/jpeg', .93);
};
await document.fonts.load('800 40px Montserrat'); window.ready = true;
