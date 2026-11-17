// "Elegí la puerta": mundo 3D con acabado de dibujo (cel shading + contorno) y personajes 2D.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { drawCharacter } from './estilo.js';
import { EXPR, POSE } from './expr.js';
import { houseFull } from './housefull.js';
const W = 1080, H = 1920, Q = new URLSearchParams(location.search), REVEAL = !!Q.get('reveal'), VIDEO = !!Q.get('video');
const V2 = Q.get('video') === '2';
const TL = VIDEO ? await (await fetch(V2 ? '/puertas2_tl.json' : '/puertas_tl.json')).json() : null;
await document.fonts.load('800 40px Montserrat');
const INK = '#1b1820';
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
const S = new THREE.Scene(); S.background = new THREE.Color('#e9ecea');
const cam = new THREE.PerspectiveCamera(64, W / H, .05, 100);
const grad = (() => { const c = document.createElement('canvas'); c.width = 3; c.height = 1; const x = c.getContext('2d'); ['#a3a3a3', '#dcdcdc', '#ffffff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i, 0, 1, 1); }); const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
const toon = (c, map, ex = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: 0, map: map || null, ...ex });
const HULL = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
// caja redondeada con contorno de tinta (casco invertido)
function box(w, h, d, c, x, y, z, o = {}) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(o.r ?? .025, w / 2.1, h / 2.1, d / 2.1));
  const m = new THREE.Mesh(g, o.mat || toon(c, o.map)); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry;
  if (o.line !== false) { const t = (o.t ?? .018) * 1.5; const hl = new THREE.Mesh(g, HULL); hl.scale.set((w + 2 * t) / w, (h + 2 * t) / h, (d + 2 * t) / d); m.add(hl); }
  (o.parent || S).add(m); return m;
}
function plane(w, h, c, x, y, z, rx = 0, ry = 0, map) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon(c, map)); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); S.add(m); return m; }
const ln = (pts, w = 3) => { const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p))); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: INK })); S.add(l); return l; };
// ---------- sala de espera / fondo del pasillo
const WX = 4.2, ZB = -5, HG = 3.2;
const tiles = tex(512, 512, (x, w, h) => { x.fillStyle = '#d9e3e3'; x.fillRect(0, 0, w, h); let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 900; k++) { x.fillStyle = rnd() > .5 ? '#c6d2d3' : '#eef3f2'; x.fillRect(rnd() * w, rnd() * h, 3, 3); } x.strokeStyle = '#aebcbd'; x.lineWidth = 4; x.strokeRect(0, 0, w, h); }, [8, 12]);
plane(WX * 2, 12, '#ffffff', 0, 0, ZB + 6, -Math.PI / 2, 0, tiles);
const ceilT = tex(256, 256, (x, w, h) => { x.fillStyle = '#f6f8f7'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9d3d1'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); }, [8, 12]);
plane(WX * 2, 12, '#ffffff', 0, HG, ZB + 6, Math.PI / 2, 0, ceilT);
// pared del fondo con huecos de puertas (3 paños + dintel)
const DW = 1.2, DH = 2.25, DX = 1.42;
const wallC = '#ffffff';
const subway = (w, h) => tex(512, 512, (x, W2, H2) => { x.fillStyle = '#f4f3ee'; x.fillRect(0, 0, W2, H2); x.strokeStyle = '#cfcec7'; x.lineWidth = 5; for (let r = 0; r < 8; r++) { const y = r * 64; x.beginPath(); x.moveTo(0, y); x.lineTo(W2, y); x.stroke(); for (let c = 0; c < 5; c++) { const xx = c * 128 + (r % 2) * 64; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 64); x.stroke(); } } }, [w / 1.0, h / .5]);
const seg = (x0, x1) => { box(x1 - x0, HG, .2, wallC, (x0 + x1) / 2, HG / 2, ZB, { line: false, map: subway(x1 - x0, HG) }); box(x1 - x0, 1.0, .06, '#9ccfc2', (x0 + x1) / 2, .5, ZB + .12, { t: .01 }); };
seg(-WX, -DX - DW / 2); seg(-DX + DW / 2, DX - DW / 2); seg(DX + DW / 2, WX);
for (const s of [-1, 1]) box(DW, HG - DH, .2, wallC, s * DX, DH + (HG - DH) / 2, ZB, { line: false, map: subway(DW, HG - DH) });
box(WX * 2, .26, .26, '#5fa592', 0, .13, ZB + .12, { t: .012 });                       // zócalo

for (const s of [-1, 1]) {                                                             // paredes laterales
  plane(12, HG, '#ffffff', s * WX, HG / 2, ZB + 6, 0, -s * Math.PI / 2, subway(12, HG));
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
  const RZ = ZB - .1, RD = 3.2, RW = 3.0, inside = toon('#e6f3f4', null, REVEAL ? { emissive: n === 2 ? '#ff2a1a' : '#000000', emissiveIntensity: n === 2 ? .45 : 0, color: n === 1 ? '#7f8c8e' : '#e6f3f4' } : {});
  const rm = new THREE.Group(); S.add(rm);
  const rp = (w, h, x, y, z, rx, ry, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), c ? toon(c) : inside); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); rm.add(m); return m; };
  rp(RW, HG, cx, HG / 2, RZ - RD, 0, 0);                                   // fondo
  rp(RD, HG, cx - RW / 2, HG / 2, RZ - RD / 2, 0, Math.PI / 2);             // lados
  rp(RD, HG, cx + RW / 2, HG / 2, RZ - RD / 2, 0, -Math.PI / 2);
  rp(RW, RD, cx, 0, RZ - RD / 2, -Math.PI / 2, 0, '#c9dcdc');               // piso
  rp(RW, RD, cx, HG, RZ - RD / 2, Math.PI / 2, 0, '#f6fbfb');
  box(RW, .14, .05, '#7fb3b8', cx, .07, RZ - RD + .03, { line: false });
  // panel de cabecera con tomas de oxígeno
  const BX = cx + s * .7, BZ = RZ - 2.0;
  box(1.3, .22, .1, '#cfd9de', BX, 1.45, RZ - RD + .06, { t: .012 });
  for (const [k, c] of [[-.4, '#3fa66a'], [-.15, '#f2f2f2'], [.1, '#3a7bd5'], [.35, '#e2453a']]) box(.09, .09, .05, c, BX + k, 1.45, RZ - RD + .13, { t: .008, r: .02 });
  // monitor de signos vitales en brazo de pared
  const ecg = tex(512, 384, (x, w, h) => { x.fillStyle = '#0f1d22'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2dff8a'; x.lineWidth = 6; x.beginPath(); let px = 10; x.moveTo(px, 120); for (let k = 0; k < 4; k++) { x.lineTo(px + 40, 120); x.lineTo(px + 52, 60); x.lineTo(px + 64, 170); x.lineTo(px + 76, 120); px += 120; x.lineTo(px, 120); } x.stroke();
    x.strokeStyle = '#4fd3ff'; x.beginPath(); x.moveTo(10, 250); for (let k = 0; k < 480; k += 8) x.lineTo(10 + k, 250 - Math.abs(Math.sin(k / 25)) * 40); x.stroke();
    x.font = '800 70px Montserrat'; x.fillStyle = '#2dff8a'; x.fillText(n === 2 ? '118' : '96', 330, 345); x.fillStyle = '#ffd23f'; x.font = '800 44px Montserrat'; x.fillText('SpO2 ' + (n === 2 ? '91' : '98'), 20, 350); });
  const MX = cx + s * .3, MZ = RZ - RD + .32;
  box(.04, .04, .28, '#9aa5ab', MX, 2.0, RZ - RD + .17, { t: .006 });
  box(.6, .45, .1, '#e7ebee', MX, 2.0, MZ, { t: .014 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.5, .36), new THREE.MeshBasicMaterial({ map: ecg, color: REVEAL && n === 1 ? '#777777' : '#ffffff' })); scr.position.set(MX, 2.0, MZ + .052); rm.add(scr);
  // gabinete con cruz roja
  const cross = tex(256, 256, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#e2453a'; x.fillRect(98, 40, 60, 176); x.fillRect(40, 98, 176, 60); });
  box(.55, .7, .25, '#f4f7f8', cx + s * 1.1, 2.0, RZ - RD + .14, { t: .014 });
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), new THREE.MeshBasicMaterial({ map: cross })); cr.position.set(cx + s * 1.1, 2.0, RZ - RD + .27); rm.add(cr);
  // soporte de suero
  const IX = cx + s * .15, IZ = RZ - 2.3;
  box(.035, 1.9, .035, '#aeb8be', IX, .95, IZ, { t: .008 }); box(.4, .03, .03, '#aeb8be', IX, 1.9, IZ, { t: .006 });
  box(.16, .26, .06, '#cfeaff', IX + .12, 1.72, IZ, { t: .01, r: .04, mat: toon('#cfeaff', null, { transparent: true, opacity: .9 }) });
  box(.3, .03, .3, '#7b858c', IX, .02, IZ, { t: .008 });
  // cortina de box
  box(.04, .04, 2.6, '#c3ccd1', cx - s * 1.4, 2.6, RZ - 1.6, { t: .006 });
  for (let k = 0; k < 6; k++) box(.08, 1.9, .3, k % 2 ? '#9fd3c4' : '#b6e0d3', cx - s * (1.38 - (k % 2) * .05), 1.6, RZ - 2.8 + k * .26, { t: .01, r: .03 });
  // camilla
  box(.9, .12, 1.9, '#ffffff', cx + s * .75, .7, RZ - 2.0, { t: .014 }); box(.88, .14, .5, '#d6ecf7', cx + s * .75, .82, RZ - 2.75, { t: .012 });
  box(.04, .22, 1.0, '#c9d2d7', cx + s * .75 - s * .47, .9, RZ - 2.0, { t: .008 });
  for (const [ax, az] of [[-.38, -.85], [.38, -.85], [-.38, .85], [.38, .85]]) box(.05, .62, .05, '#9aa5ab', cx + s * .75 + ax, .32, RZ - 2.0 + az, { t: .008 });
  // cartel con número arriba de la puerta
  const sign = tex(256, 256, (x, w, h) => { x.fillStyle = REVEAL ? (n === 2 ? '#e2453a' : '#8a9496') : '#2f7fd0'; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill(); x.lineWidth = 12; x.strokeStyle = INK; x.stroke(); x.fillStyle = '#fff'; x.font = '800 170px Montserrat'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 128, 140); });
  const sg = new THREE.Mesh(new THREE.CircleGeometry(.36, 48), new THREE.MeshBasicMaterial({ map: sign, transparent: true })); sg.position.set(cx, DH + .58, ZB + .13); S.add(sg);
  const signHL = tex(256, 256, (x) => { x.fillStyle = '#ffc928'; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill(); x.lineWidth = 12; x.strokeStyle = INK; x.stroke(); x.fillStyle = INK; x.font = '800 170px Montserrat'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 128, 140); });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(.36, 48), new THREE.MeshBasicMaterial({ map: signHL, transparent: true, opacity: 0 })); glow.position.set(cx, DH + .58, ZB + .135); S.add(glow);
  const signR = tex(256, 256, (x) => { x.fillStyle = '#e2453a'; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill(); x.lineWidth = 12; x.strokeStyle = INK; x.stroke(); x.fillStyle = '#fff'; x.font = '800 170px Montserrat'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 128, 140); });
  const red = new THREE.Mesh(new THREE.CircleGeometry(.36, 48), new THREE.MeshBasicMaterial({ map: signR, transparent: true, opacity: 0 })); red.position.set(cx, DH + .58, ZB + .14); S.add(red);
  rooms.push({ cx, n, rm, inside, sg, glow, red });
}
// detalles de la sala: banco, planta, dispenser, reloj, luces de techo
box(.38, .45, .38, '#d97a4a', WX - .45, .23, ZB + .5, { t: .014 });
for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const lf = box(.12, .7, .03, '#4fae6c', WX - .45 + Math.cos(a) * .1, .75, ZB + .5 + Math.sin(a) * .1, { t: .01, r: .05 }); lf.rotation.set(Math.sin(a) * .5, a, Math.cos(a) * .5); }
const clock = tex(256, 256, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill(); x.lineWidth = 14; x.strokeStyle = INK; x.stroke(); x.lineCap = 'round'; x.lineWidth = 12; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 50); x.moveTo(128, 128); x.lineTo(185, 150); x.stroke(); });
const ck = new THREE.Mesh(new THREE.CircleGeometry(.28, 40), new THREE.MeshBasicMaterial({ map: clock, transparent: true })); ck.position.set(0, 2.55, ZB + .12); S.add(ck);
for (const z of [ZB + 1.5, ZB + 4, ZB + 6.5]) for (const x of [-1.6, 1.6]) box(1.1, .04, .5, '#ffffff', x, HG - .02, z, { t: .012, mat: new THREE.MeshBasicMaterial({ color: '#ffffff' }) });
S.add(new THREE.HemisphereLight('#ffffff', '#c9d2cf', 1.9));
const sun = new THREE.DirectionalLight('#fff6ea', 1.6); sun.position.set(-3, 6, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -.0008;
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 30 }); sun.target.position.set(0, 0, ZB); S.add(sun, sun.target);
const roomLamp = []; for (const s2 of [-1, 1]) { const l = new THREE.PointLight('#ffffff', 2.2, 5, 1.2); l.position.set(s2 * DX, 2.6, ZB - 1.6); S.add(l); }
S.traverse(o => { if (o.isMesh) { const hull = o.material === HULL; o.castShadow = !hull && !(o.material.isMeshBasicMaterial); o.receiveShadow = !hull; } });
// ---------- personajes 2D como carteles dentro del mundo
async function svgTex(svg, w, h) { const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await new Promise(r => { img.onload = r; img.src = u; }); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(u); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
async function person(svgInner, vb, upm, x, z, opts = {}) {
  const [vx, vy, vw, vh] = vb, pw = vw / upm, ph = vh / upm, px = 900, py = Math.round(px * vh / vw);
  const c = document.createElement('canvas'); c.width = px; c.height = py; const cx2 = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .4, color: opts.tint || '#ffffff' }));
  const base = new THREE.Vector3(x + (vx + vw / 2) / upm, -(vy + vh / 2) / upm, z); m.position.copy(base); S.add(m);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.36, 32), new THREE.MeshBasicMaterial({ color: '#0d2420', transparent: true, opacity: .22 })); sh.rotation.x = -Math.PI / 2; sh.scale.set(1, .45, 1); sh.position.set(x, .005, z); S.add(sh);
  const cache = new Map(); let cur = null;
  const set = async (inner) => { if (inner === cur) return; cur = inner; let img = cache.get(inner);
    if (!img) { img = new Image(); const u = URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="${vb.join(' ')}">${inner}</svg>`], { type: 'image/svg+xml' })); await new Promise(r => { img.onload = r; img.src = u; }); if (cache.size < 60) cache.set(inner, img); }
    cx2.clearRect(0, 0, px, py); cx2.drawImage(img, 0, 0, px, py); t.needsUpdate = true; };
  await set(svgInner);
  return { m, set, base, sh, foot: new THREE.Vector3(x, 0, z) };
}
const dim = REVEAL ? '#7d8790' : '#ffffff';
const P1 = await person(drawCharacter(VIDEO ? 'madre' : 'hombre', { face: { ...EXPR.shock, tears: .7, sweat: 1 }, ...POSE.headhold }), [-300, -1000, 600, 1010], 540, -DX - .05, ZB - .85, { tint: dim });
const P2 = await person(drawCharacter(VIDEO ? 'hombre' : 'madre', { face: { ...EXPR.worried, sweat: 1 }, ...POSE.chin }), [-300, -1000, 600, 1010], 540, DX + .05, ZB - .85);
// House: cuerpo entero sin la sombra dibujada (la pone el piso)
const HO = await person(houseFull().replace(/<ellipse[^>]*\/>/, ''), [-330, -1700, 640, 1712], 880, 0, ZB + 1.5);
cam.fov = 60; cam.updateProjectionMatrix(); cam.position.set(.45, 2.0, ZB + 6.7); cam.lookAt(.05, 1.3, ZB);
// ---------- capa 2D encima: título, síntomas, cuenta regresiva
const OUT = document.createElement('canvas'); OUT.width = W; OUT.height = H; const X = OUT.getContext('2d');
const toScr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
function pill(x, y, w, h, fill, r, lw = 6) { X.beginPath(); X.roundRect(x, y, w, h, r); X.fillStyle = fill; X.fill(); X.lineWidth = lw; X.strokeStyle = INK; X.stroke(); }
function text(s, x, y, size, col = INK, align = 'center', stroke = 0) { X.font = `800 ${size}px Montserrat`; X.textAlign = align; X.textBaseline = 'middle'; if (stroke) { X.lineJoin = 'round'; X.lineWidth = stroke; X.strokeStyle = '#ffffff'; X.strokeText(s, x, y); } X.fillStyle = col; X.fillText(s, x, y); }
const chips = VIDEO ? { 1: ['brazo fracturado'], 2: ['le duele la mandíbula'] } : { 1: ['brazo fracturado', 'grita de dolor', 'sangra mucho'], 2: ['"es acidez"', 'le duele la mandíbula', 'sudor frío'] };

// ---------- modo video
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const sm = (a, b, t) => ease(clamp((t - a) / (b - a), 0, 1));
const pop = (t, t0) => { const k = clamp((t - t0) / .35, 0, 1); return k <= 0 ? 0 : 1 + Math.sin(k * Math.PI) * .25 * (1 - k) - (1 - k) * (1 - Math.min(1, k * 4)); };
const line = (who, t) => TL && TL.lines.find(l => l.who === who && t >= l.t0 && t < l.t1);
const mouthOf = (who, t) => { const l = line(who, t); if (!l) return 0; const v = Math.abs(Math.sin(t * 14.5 + who.length)) * (.55 + .45 * Math.abs(Math.sin(t * 3.3))); return Math.round(v * 4) / 4; };
const blinkAt = (t, seed) => ((t + seed) % 3.7) / 3.7 > .955;
const shots = [];
async function renderVideo(i) {
  const t = i / 30, L = Object.fromEntries(TL.lines.map(l => [l.key, l]));
  // resaltado de puertas
  const k1 = Math.max(sm(TL.hl1, TL.hl1 + .25, t) * (1 - sm(TL.hl2, TL.hl2 + .25, t)), line('p1', t) ? 1 : 0, sm(L.f1.t0 + .9, L.f1.t0 + 1.3, t));
  const k2 = Math.max(sm(TL.hl2, TL.hl2 + .25, t) * (1 - sm(TL.cd0, TL.cd0 + .3, t)), line('p2', t) ? 1 : 0);
  for (const [r, k] of [[rooms[0], k1], [rooms[1], k2]]) { r.glow.material.opacity = k > .5 ? 1 : 0; }
  // personajes
  const m1 = mouthOf('p1', t), m2 = mouthOf('p2', t), md = mouthOf('doc', t);
  await P1.set(drawCharacter(VIDEO ? 'madre' : 'hombre', { face: { ...EXPR.shock, mouth: line('p1', t) ? .35 + m1 * .65 : .5, tears: .7, sweat: 1, open: blinkAt(t, .4) ? .05 : 1 }, ...POSE.headhold }));
  await P2.set(drawCharacter(VIDEO ? 'hombre' : 'madre', { face: { ...EXPR.worried, mouth: line('p2', t) ? m2 * .8 : 0, sweat: 1, open: blinkAt(t, 1.9) ? .05 : 1 }, ...POSE.chin }));
  await HO.set(houseFull({ mouth: md, blink: blinkAt(t, 2.6) }).replace(/<ellipse[^>]*\/>/, ''));
  const j1 = line('p1', t) ? Math.abs(Math.sin(t * 9)) * .02 : 0; P1.m.position.set(P1.base.x + Math.sin(t * 23) * (line('p1', t) ? .012 : 0), P1.base.y + j1, P1.base.z);
  const hop = sm(L.q2.t0 + .45, L.q2.t0 + .6, t) * (1 - sm(L.q2.t0 + .6, L.q2.t0 + .85, t)) * .08; HO.m.position.set(HO.base.x, HO.base.y + hop + Math.sin(t * 1.6) * .006, HO.base.z);
  // cámara
  const look = new THREE.Vector3(.05, 1.3, ZB), pos = new THREE.Vector3(.45, 2.0, ZB + 6.7);
  const intro = 1 - sm(0, 1.4, t); pos.z -= intro * 1.4; pos.y -= intro * .2; look.y += intro * .1;
  const toward = sm(TL.hl1, TL.hl1 + .5, t) * -1 * (1 - sm(TL.hl2, TL.hl2 + .5, t)) + sm(TL.hl2, TL.hl2 + .5, t) * (1 - sm(TL.cd0, TL.cd0 + .8, t));
  const spk = (line('p1', t) ? -.5 : 0) + (line('p2', t) ? .5 : 0); window._spk = lerp(window._spk ?? 0, spk, .08); if (window._last !== i - 1) window._spk = spk; window._last = i;
  look.x += toward * .75 + window._spk; pos.x += toward * .3 + window._spk * .3;
  const q = sm(L.q1.t0 - .2, L.q1.t0 + .8, t) * (1 - sm(L.f1.t0, L.f1.t0 + .8, t)); pos.lerp(new THREE.Vector3(.2, 1.75, ZB + 3.8), q); look.lerp(new THREE.Vector3(0, 1.45, ZB + 1.5), q);
  const f = sm(L.f1.t0 + .3, L.f1.t1 + .6, t); pos.lerp(new THREE.Vector3(-DX + .15, 1.45, ZB + 1.6), f); look.lerp(new THREE.Vector3(-DX - .1, 1.15, ZB - 1.2), f);
  cam.position.copy(pos); cam.lookAt(look); cam.rotateZ(Math.sin(t * .8) * .006);
  R.render(S, cam);
  X.drawImage(R.domElement, 0, 0);
  const v = X.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,40,30,.18)'); X.fillStyle = v; X.fillRect(0, 0, W, H);
  // título
  const tp = pop(t, .1), fadeT = 1 - sm(L.f1.t0, L.f1.t0 + .4, t);
  if (tp > 0 && fadeT > 0) { X.save(); X.globalAlpha = fadeT; X.translate(540, 190); X.scale(tp, tp); text('¿qué paciente', 0, -40, 68, INK, 'center', 16); text('eliges?', 0, 38, 68, '#e2453a', 'center', 16); X.restore(); }
  // síntomas: aparecen al resaltar cada puerta
  for (const { cx, n } of rooms) {
    const ln2 = L[n === 1 ? 'p1' : 'p2'], [sx, sy] = toScr(cx, 0, ZB + .5), t0 = ln2.t0, fadeS = 1 - sm(ln2.t1 + .15, ln2.t1 + .45, t);
    chips[n].forEach((c, k) => { const p = pop(t, t0 + k * Math.min(.6, (ln2.t1 - ln2.t0) / 4)); if (p <= 0 || fadeS <= 0) return; X.font = '800 34px Montserrat'; const w = X.measureText(c).width + 30, y = sy + 60 + k * 52, x = Math.min(Math.max(sx, w / 2 + 10), W - w / 2 - 10);
      X.save(); X.globalAlpha = fadeS; X.translate(x, y); X.scale(p, p); text(c, 0, 0, 34, INK, 'center', 11); X.restore(); });
  }
  // cuenta regresiva 5..1
  if (t >= TL.cd0 - .1 && t < TL.cd1 + .5) {
    const step = (TL.cd1 - TL.cd0) / 5, k = Math.min(4, Math.floor((t - TL.cd0) / step)), num = t >= TL.cd1 ? 0 : 5 - Math.max(0, k);
    const p = pop(t, TL.cd0 - .1) * (1 + .12 * Math.max(0, 1 - ((t - TL.cd0) % step) / .2)), out = 1 - sm(TL.cd1 + .2, TL.cd1 + .5, t);
    const cy = 1640, prog = clamp((t - TL.cd0) / (TL.cd1 - TL.cd0), 0, 1);
    X.save(); X.globalAlpha = out; X.translate(540, cy); X.scale(p, p);
    X.beginPath(); X.arc(0, 0, 105, 0, 7); X.fillStyle = num === 0 ? '#e2453a' : '#ffd23f'; X.fill(); X.lineWidth = 9; X.strokeStyle = INK; X.stroke();
    X.beginPath(); X.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - prog)); X.lineWidth = 16; X.lineCap = 'round'; X.strokeStyle = num === 0 ? '#ffffff' : '#e2453a'; X.stroke();
    text(String(num), 0, 8, 110, num === 0 ? '#ffffff' : INK); X.restore();
  }
  // final: fundido a blanco
  const end = sm(TL.total - .5, TL.total, t); if (end > 0) { X.fillStyle = `rgba(255,255,255,${end})`; X.fillRect(0, 0, W, H); }
  return OUT.toDataURL('image/jpeg', .9);
}

// ---------- modo video 2: dentro del cuarto 1
const OPTS = [['A', 'le acomodas el hueso'], ['B', 'le inmovilizas el brazo'], ['C', 'le das agua']];
function card(y, letter, label, state, p, alpha) {
  if (p <= 0) return; X.save(); X.globalAlpha = alpha * (state === 'bad' ? .75 : 1); X.translate(540, y); X.scale(p, p);
  X.shadowColor = 'rgba(0,0,0,.25)'; X.shadowOffsetY = 6; X.shadowBlur = 10;
  X.beginPath(); X.roundRect(-420, -56, 840, 112, 30); X.fillStyle = state === 'good' ? '#dff7e8' : '#ffffff'; X.fill(); X.shadowColor = 'transparent';
  X.lineWidth = state === 'good' ? 10 : 6; X.strokeStyle = state === 'good' ? '#2fbf71' : INK; X.stroke();
  X.beginPath(); X.arc(-350, 0, 40, 0, 7); X.fillStyle = state === 'good' ? '#2fbf71' : state === 'bad' ? '#e2453a' : '#2f7fd0'; X.fill(); X.lineWidth = 6; X.strokeStyle = INK; X.stroke();
  text(state === 'good' ? '✓' : state === 'bad' ? '✕' : letter, -350, 4, 50, '#fff');
  text(label, -285, 2, 44, state === 'bad' ? '#8a9496' : INK, 'left');
  if (state === 'bad') { X.beginPath(); X.moveTo(-285, 2); X.lineTo(-285 + X.measureText(label).width, 2); X.lineWidth = 6; X.strokeStyle = '#e2453a'; X.stroke(); }
  X.restore();
}
async function renderVideo2(i) {
  const t = i / 30, L = Object.fromEntries(TL.lines.map(l => [l.key, l])), alarm = t >= TL.alarm;
  // personajes: la paciente del brazo y House dentro del cuarto 1; el de la mandíbula en el cuarto 2
  const m1 = mouthOf('p1', t), md = mouthOf('doc', t), m2 = mouthOf('p2', t);
  await P1.set(drawCharacter('madre', { face: { ...EXPR.shock, mouth: line('p1', t) ? .35 + m1 * .65 : .45, tears: .6, sweat: 1, open: blinkAt(t, .4) ? .05 : 1 }, ...POSE.headhold }));
  await P2.set(drawCharacter('hombre', { face: { ...(alarm ? EXPR.shock : EXPR.worried), mouth: line('p2', t) ? .4 + m2 * .6 : (alarm ? .5 : 0), sweat: 1, open: blinkAt(t, 1.9) ? .05 : 1 }, ...POSE.chin }));
  await HO.set(houseFull({ mouth: md, blink: blinkAt(t, 2.6) }).replace(/<ellipse[^>]*\/>/, ''));
  P1.m.position.set(-1.5, P1.base.y + (line('p1', t) ? Math.abs(Math.sin(t * 9)) * .015 : 0), ZB - 1.6); P1.sh.position.set(-1.5, .005, ZB - 1.6);
  HO.m.position.set(-.72, HO.base.y, ZB - 1.95); HO.sh.position.set(-.72, .005, ZB - 1.95);
  P2.m.position.set(P2.base.x + (alarm ? Math.sin(t * 31) * .015 : 0), P2.base.y, P2.base.z);
  // alarma: cuarto 2 en rojo intermitente
  const blinkR = alarm && Math.floor((t - TL.alarm) / .25) % 2 === 0;
  rooms[1].inside.emissive.set('#ff2a1a'); rooms[1].inside.emissiveIntensity = blinkR ? .55 : alarm ? .2 : 0; rooms[1].red.material.opacity = alarm ? 1 : 0;
  rooms[0].glow.material.opacity = 0;
  // cámara
  let pos, look, fov;
  if (!alarm) {
    pos = new THREE.Vector3(-.15, 1.62, ZB - .3); look = new THREE.Vector3(-1.1, 1.15, ZB - 2.05); fov = 80;
    const k0 = 1 - sm(0, 1.6, t); pos.lerp(new THREE.Vector3(-1.2, 1.5, ZB + 1.6), k0); look.lerp(new THREE.Vector3(-1.6, 1.15, ZB - 1.6), k0);
    const pz = sm(TL.cd0, TL.cd1, t) * (1 - sm(L.r1.t0, L.r1.t0 + .6, t)); pos.lerp(new THREE.Vector3(-.75, 1.55, ZB - .55), pz * .6); look.lerp(new THREE.Vector3(-1.7, 1.25, ZB - 1.6), pz * .6);
    const tp = line('p1', t) ? -.1 : line('doc', t) ? .1 : 0; window._lk = lerp(window._lk ?? 0, tp, .06); if (window._last2 !== i - 1) window._lk = tp; window._last2 = i; look.x += window._lk;
    for (const o of [P1.m, HO.m]) o.rotation.y = Math.atan2(pos.x - o.position.x, pos.z - o.position.z);
  } else {
    const k = sm(TL.alarm, TL.alarm + 1.2, t), k2 = sm(L.f1.t0, TL.total, t);
    pos = new THREE.Vector3(.45, 2.0, ZB + 6.7).lerp(new THREE.Vector3(1.0, 1.7, ZB + 4.2), k).lerp(new THREE.Vector3(DX - .1, 1.5, ZB + 2.0), k2);
    look = new THREE.Vector3(.05, 1.3, ZB).lerp(new THREE.Vector3(DX, 1.4, ZB), k).lerp(new THREE.Vector3(DX + .05, 1.2, ZB - 1.2), k2); fov = 60;
    for (const o of [P1.m, HO.m]) o.rotation.y = 0;
  }
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(look); cam.rotateZ(Math.sin(t * .8) * .006 + (alarm ? Math.sin(t * 40) * .004 : 0));
  R.render(S, cam);
  X.drawImage(R.domElement, 0, 0);
  const v = X.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, alarm ? `rgba(160,0,0,${blinkR ? .35 : .15})` : 'rgba(40,40,30,.18)'); X.fillStyle = v; X.fillRect(0, 0, W, H);
  // títulos
  const pa = pop(t, .2) * (1 - sm(L.d2.t0 - .3, L.d2.t0, t));
  if (pa > 0) { X.save(); X.translate(540, 180); X.scale(pa, pa); text('puerta', -50, 4, 72, INK, 'center', 16); X.beginPath(); X.arc(150, 0, 62, 0, 7); X.fillStyle = '#ffc928'; X.fill(); X.lineWidth = 8; X.strokeStyle = INK; X.stroke(); text('1', 150, 6, 80); X.restore(); }
  const pt = pop(t, L.d2.t0 + .9) * (1 - sm(TL.alarm - .3, TL.alarm, t));
  if (pt > 0) { X.save(); X.translate(540, 190); X.scale(pt, pt); text('¿qué haces', 0, -40, 68, INK, 'center', 16); text('primero?', 0, 38, 68, '#e2453a', 'center', 16); X.restore(); }
  // opciones
  const fadeC = 1 - sm(TL.alarm - .3, TL.alarm, t);
  OPTS.forEach(([l, lab], k) => {
    const key = 'o' + l, st = t < L.r1.t0 ? '' : l === 'B' ? 'good' : (l === 'A' && t >= L.r2.t0) || (l === 'C' && t >= L.r3.t0 + 2.1) ? 'bad' : '';
    const bump = st && (t - (l === 'B' ? L.r1.t0 : l === 'A' ? L.r2.t0 : L.r3.t0 + 2.1)) < .3 ? 1.08 : 1;
    card(1200 + k * 145, l, lab, st, pop(t, L[key].t0 - .05) * bump, fadeC);
  });
  // conteo
  if (t >= TL.cd0 - .1 && t < TL.cd1 + .5) {
    const k = Math.min(4, Math.floor(t - TL.cd0)), num = t >= TL.cd1 ? 0 : 5 - Math.max(0, k);
    const p = pop(t, TL.cd0 - .1) * (1 + .12 * Math.max(0, 1 - ((t - TL.cd0) % 1) / .2)), out = 1 - sm(TL.cd1 + .2, TL.cd1 + .5, t), prog = clamp(t - TL.cd0, 0, 5) / 5;
    X.save(); X.globalAlpha = out; X.translate(540, 1700); X.scale(p * .85, p * .85);
    X.beginPath(); X.arc(0, 0, 105, 0, 7); X.fillStyle = num === 0 ? '#e2453a' : '#ffd23f'; X.fill(); X.lineWidth = 9; X.strokeStyle = INK; X.stroke();
    X.beginPath(); X.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - prog)); X.lineWidth = 16; X.lineCap = 'round'; X.strokeStyle = num === 0 ? '#ffffff' : '#e2453a'; X.stroke();
    text(String(num), 0, 8, 110, num === 0 ? '#ffffff' : INK); X.restore();
  }
  // alarma
  if (alarm) { const pa2 = pop(t, TL.alarm + .1); X.save(); X.translate(540, 130); X.rotate(-.04); X.scale(pa2, pa2); text('¡alarma en la', 0, -42, 70, INK, 'center', 16); text('puerta 2!', 0, 40, 76, '#e2453a', 'center', 18); X.restore(); }
  const end = sm(TL.total - .5, TL.total, t); if (end > 0) { X.fillStyle = `rgba(255,255,255,${end})`; X.fillRect(0, 0, W, H); }
  return OUT.toDataURL('image/jpeg', .9);
}
window.renderFrame = async (i) => { if (V2) return renderVideo2(i); if (VIDEO) return renderVideo(i);
  R.render(S, cam);
  X.drawImage(R.domElement, 0, 0);
  // grano de papel suave + viñeta
  const v = X.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,40,30,.18)'); X.fillStyle = v; X.fillRect(0, 0, W, H);
  // título
  text('¿a quién atendés', 540, 150, 66, INK, 'center', 16); text('primero?', 540, 228, 66, '#e2453a', 'center', 16);
  // síntomas sobre cada puerta (anclados a la posición 3D)
  for (const { cx, n } of rooms) {
    const [sx, sy] = toScr(cx, 0, ZB + .5);
    chips[n].forEach((c, i) => { X.font = '800 34px Montserrat'; const w = X.measureText(c).width + 30, y = sy + 60 + i * 52; const x = Math.min(Math.max(sx, w / 2 + 10), W - w / 2 - 10);
      text(c.toLowerCase(), x, y, 34, REVEAL && n === 1 ? '#8a9496' : INK, 'center', 11); });
  }
  if (REVEAL) { const [sx, sy] = toScr(DX, 1.0, ZB - .2); X.save(); X.translate(sx, sy); X.rotate(-.1); X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowOffsetY = 8; X.shadowBlur = 12; X.restore(); X.save(); X.translate(sx, sy); X.rotate(-.06); text('¡infarto!', 0, 4, 76, '#e2453a', 'center', 18); X.restore(); }
  // banda inferior
  if (REVEAL && !Q.get('nodato')) { X.save(); X.shadowColor = 'rgba(0,0,0,.3)'; X.shadowOffsetY = -6; X.shadowBlur = 16; pill(-10, 1690, 1100, 260, '#ffffff', 0, 8); X.restore(); }
  if (!REVEAL && Q.get('cta')) {
    text('COMENTÁ', 320, 1775, 58); text('1  o  2', 320, 1850, 70, '#2f7fd0');
    X.beginPath(); X.arc(820, 1700, 120, 0, 7); X.fillStyle = '#ffd23f'; X.fill(); X.lineWidth = 9; X.strokeStyle = INK; X.stroke();
    X.beginPath(); X.arc(820, 1700, 98, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .8); X.lineWidth = 18; X.lineCap = 'round'; X.strokeStyle = '#e2453a'; X.stroke(); text('5', 820, 1708, 120);
  } else if (REVEAL && !Q.get('nodato')) { text('En mujeres, el infarto', 540, 1760, 50); text('puede parecer ACIDEZ', 540, 1840, 58, '#e2453a'); }
  return OUT.toDataURL('image/jpeg', .93);
};
await document.fonts.load('800 40px Montserrat'); window.ready = true;
