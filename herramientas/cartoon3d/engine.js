// Motor de caricaturas 3D: personajes, sets, utilería, cámara y subtítulos.
// Se ejecuta dentro de Chromium (render.js). El estado de cada fotograma depende
// solo del tiempo t, así cada worker puede renderizar cualquier tramo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const easeInOut = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeOutBack = (p, s = 1.9) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function rng(seed) { let s = Math.floor(hash(seed) * 2 ** 31) || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------------------------------------------------------------- materiales
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
function toon(color, opts = {}) {
  const key = JSON.stringify([color, opts.emissive || 0, opts.opacity || 1]);
  if (!opts.map && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: GRAD });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
  if (opts.opacity && opts.opacity < 1) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = false; }
  if (opts.map) { m.map = opts.map; return m; }
  matCache.set(key, m); return m;
}
const basicCache = new Map();
function basic(color) {
  if (!basicCache.has(color)) basicCache.set(color, new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
  return basicCache.get(color);
}
const OUTLINE = new THREE.ShaderMaterial({
  uniforms: { thick: { value: 0.008 } },
  vertexShader: `uniform float thick; void main(){ vec3 p = position + normal * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.09, 0.07, 0.07, 1.0); }`,
  side: THREE.BackSide,
});
const outlineMats = new Map();
function outlineMat(th) {
  const k = th.toFixed(4);
  if (!outlineMats.has(k)) { const m = OUTLINE.clone(); m.uniforms.thick.value = th; outlineMats.set(k, m); }
  return outlineMats.get(k);
}
// Malla con contorno negro (casco invertido): la firma del estilo.
function mesh(geom, mat, o = {}) {
  const m = new THREE.Mesh(geom, typeof mat === 'string' || typeof mat === 'number' ? toon(mat) : mat);
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  if (o.outline !== false) {
    const ol = new THREE.Mesh(geom, outlineMat(o.thick ?? 0.008));
    ol.castShadow = false; ol.receiveShadow = false; m.add(ol);
  }
  return m;
}
const gcache = new Map();
function G(key, make) { if (!gcache.has(key)) gcache.set(key, make()); return gcache.get(key); }
function box(w, h, d, color, o = {}) {
  const r = Math.min(o.r ?? 0.02, w / 2.01, h / 2.01, d / 2.01);
  const g = G(`box${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
  return mesh(g, o.mat || color, o);
}
function cyl(rt, rb, h, color, o = {}) {
  const g = G(`cyl${rt},${rb},${h},${o.seg || 24}`, () => new THREE.CylinderGeometry(rt, rb, h, o.seg || 24));
  return mesh(g, o.mat || color, o);
}
function sph(r, color, o = {}) {
  const g = G(`sph${r}`, () => new THREE.SphereGeometry(r, 32, 20));
  return mesh(g, o.mat || color, o);
}
function at(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry * D2R; return obj; }

// ---------------------------------------------------------------- texto en canvas
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function fitText(ctx, text, maxW, size, weight = 900) {
  let s = size;
  do { ctx.font = `${weight} ${s}px Montserrat`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10);
}
function drawLines(ctx, lines, w, h, color, size, weight = 900) {
  const n = lines.length, lh = Math.min(size, (h * .86) / n);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    const sz = ln.size ? ln.size * lh : lh;
    fitText(ctx, ln.text ?? ln, w * .9, sz, weight);
    if (ln.color) ctx.fillStyle = ln.color; else ctx.fillStyle = color;
    ctx.fillText(ln.text ?? ln, w / 2, h / 2 + (i - (n - 1) / 2) * lh * 1.02);
  });
}
// Panel plano con textura (cara frontal de letreros, pantallas, papeles)
function panel(w, h, tex, o = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  const m = o.unlit ? new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent }) : toon(0xffffff, { map: tex });
  if (o.transparent && !o.unlit) { m.transparent = true; }
  const p = new THREE.Mesh(g, m); p.receiveShadow = !o.unlit; return p;
}

// ---------------------------------------------------------------- caras
const SKIN = { white: '#f3f0ea', light: '#f2c8a2', tan: '#d9a27a', brown: '#a8714a', dark: '#6e4a33' };
const EXPR = {
  neutral: { mouth: 'line' },
  smile: { brow: [-3, 4], mouth: 'smile', lid: .12 },
  happy: { brow: [-4, 8], mouth: 'grin', lid: 0 },
  smug: { lid: .5, brow: [-10, 0], browR: [12, 10], mouth: 'smirk' },
  surprised: { eye: 1.2, pupil: .6, brow: [0, 16], mouth: 'o', lid: 0 },
  shock: { eye: 1.3, pupil: .38, brow: [6, 20], mouth: 'obig', lid: 0 },
  panic: { eye: 1.25, pupil: .42, brow: [20, 14], mouth: 'scream', sweat: 1, lid: 0 },
  worried: { brow: [18, 6], mouth: 'wavy', sweat: 1, pupil: .9 },
  sad: { lid: .3, brow: [18, 2], mouth: 'frown', look: [0, .5] },
  angry: { lid: .28, brow: [-24, -4], mouth: 'grit', vein: 1 },
  determined: { lid: .3, brow: [-14, -2], mouth: 'flat' },
  confused: { brow: [8, 14], browR: [-12, -2], mouth: 'side', look: [.5, -.3] },
  dizzy: { eyes: 'spiral', mouth: 'wavy' },
  starstruck: { eyes: 'star', mouth: 'grin', brow: [0, 12] },
  cry: { eyes: 'shut', tears: 1, mouth: 'wail', brow: [20, 6] },
  joy: { eyes: 'arc', mouth: 'grin', brow: [0, 10], blush: 1 },
  sleepy: { lid: .62, brow: [6, 0], mouth: 'line' },
  talk: { mouth: 'open' },
  nervous: { brow: [16, 6], mouth: 'grit', sweat: 1, pupil: .8 },
  skeptical: { lid: .35, brow: [-6, 0], browR: [6, 14], mouth: 'side' },
};
function drawFace(ctx, o) {
  const E = Object.assign({ eye: 1, pupil: 1, lid: .14, brow: [0, 0], mouth: 'line' }, EXPR[o.expr] || EXPR.neutral);
  const ink = '#1d1515';
  ctx.fillStyle = o.skin; ctx.fillRect(0, 0, 1024, 512);
  const cx = 512, eyY = 226, sep = 66;
  const look = [(o.eyes?.[0] ?? 0) + (E.look?.[0] ?? 0), (o.eyes?.[1] ?? 0) + (E.look?.[1] ?? 0)];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (E.blush || o.blush) { ctx.fillStyle = 'rgba(240,110,120,.35)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 100, 286, 30, 15, 0, 0, 7); ctx.fill(); } }
  for (const s of [-1, 1]) {
    const x = cx + s * sep, rx = 27 * E.eye, ry = 37 * E.eye;
    ctx.strokeStyle = ink; ctx.lineWidth = 6;
    const kind = o.blink ? 'shut' : (E.eyes || 'normal');
    if (kind === 'shut') { ctx.beginPath(); ctx.arc(x, eyY - 4, 22, .15 * Math.PI, .85 * Math.PI); ctx.lineWidth = 8; ctx.stroke(); }
    else if (kind === 'arc') { ctx.beginPath(); ctx.arc(x, eyY + 14, 22, 1.15 * Math.PI, 1.85 * Math.PI); ctx.lineWidth = 8; ctx.stroke(); }
    else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, eyY, rx, ry, 0, 0, 7); ctx.fill();
      if (kind === 'spiral') {
        ctx.beginPath(); for (let a = 0; a < 16; a += .2) { const r = a * 1.6; ctx.lineTo(x + Math.cos(a) * r, eyY + Math.sin(a) * r); } ctx.lineWidth = 4; ctx.stroke();
      } else if (kind === 'star') {
        ctx.fillStyle = '#f5b800'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 26, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * r, eyY + Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      } else {
        const pr = 14 * E.pupil * E.eye;
        const px = x + clamp(look[0], -1, 1) * (rx - pr - 4), py = eyY + clamp(look[1], -1, 1) * (ry - pr - 4);
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr * .35, py - pr * .4, pr * .3, 0, 7); ctx.fill();
      }
      const lid = E.lid;
      if (lid > 0) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(x, eyY, rx + 1, ry + 1, 0, 0, 7); ctx.clip();
        ctx.fillStyle = o.skin; ctx.fillRect(x - rx - 4, eyY - ry - 4, rx * 2 + 8, (ry * 2 + 8) * lid); ctx.restore();
        ctx.beginPath(); const ly = eyY - ry + ry * 2 * lid;
        ctx.moveTo(x - rx * Math.sqrt(1 - Math.pow((ly - eyY) / ry, 2)), ly); ctx.lineTo(x + rx * Math.sqrt(1 - Math.pow((ly - eyY) / ry, 2)), ly);
        ctx.lineWidth = 6; ctx.stroke();
      }
      ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, eyY, rx, ry, 0, 0, 7); ctx.stroke();
    }
    // cejas: [ángulo del extremo interior, altura]
    const B = (s > 0 && E.browR) ? E.browR : E.brow;
    const by = eyY - 37 * E.eye - 24 - B[1];
    const ang = B[0] * D2R;
    const ix = x - s * 26, ox = x + s * 26;
    ctx.beginPath(); ctx.moveTo(ix, by - Math.sin(ang) * 26); ctx.lineTo(ox, by + Math.sin(ang) * 26);
    ctx.lineWidth = 11; ctx.strokeStyle = o.browColor || ink; ctx.stroke(); ctx.strokeStyle = ink;
    if (o.glasses) { ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, eyY, 44, 0, 7); ctx.stroke(); }
  }
  if (o.glasses) { ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx - 22, eyY - 6); ctx.quadraticCurveTo(cx, eyY - 16, cx + 22, eyY - 6); ctx.stroke(); }
  if (o.mustache) {
    ctx.fillStyle = o.hairColor || '#3b2a20'; ctx.beginPath();
    ctx.ellipse(cx - 24, 298, 28, 11, -.2, 0, 7); ctx.ellipse(cx + 24, 298, 28, 11, .2, 0, 7); ctx.fill();
  }
  const my = 322;
  ctx.lineWidth = 7; ctx.strokeStyle = ink;
  const dark = '#5a1f22', tongue = '#e0717a';
  switch (E.mouth) {
    case 'line': ctx.beginPath(); ctx.moveTo(cx - 24, my); ctx.lineTo(cx + 24, my); ctx.stroke(); break;
    case 'flat': ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx - 20, my); ctx.lineTo(cx + 20, my); ctx.stroke(); break;
    case 'smile': ctx.beginPath(); ctx.arc(cx, my - 26, 34, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); break;
    case 'frown': ctx.beginPath(); ctx.arc(cx, my + 30, 30, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); break;
    case 'smirk': ctx.beginPath(); ctx.moveTo(cx - 26, my + 4); ctx.quadraticCurveTo(cx + 6, my + 10, cx + 30, my - 10); ctx.stroke(); break;
    case 'side': ctx.beginPath(); ctx.moveTo(cx - 6, my + 4); ctx.lineTo(cx + 30, my - 4); ctx.stroke(); break;
    case 'wavy': ctx.beginPath(); for (let i = 0; i <= 20; i++) ctx.lineTo(cx - 30 + i * 3, my + Math.sin(i * .95) * 5); ctx.stroke(); break;
    case 'o': case 'obig': case 'open': {
      const r = E.mouth === 'obig' ? [22, 30] : E.mouth === 'o' ? [15, 20] : [20, 13];
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(cx, my + 4, r[0], r[1], 0, 0, 7); ctx.fill(); ctx.stroke(); break;
    }
    case 'grin': {
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(cx - 40, my - 10); ctx.lineTo(cx + 40, my - 10);
      ctx.quadraticCurveTo(cx + 38, my + 34, cx, my + 36); ctx.quadraticCurveTo(cx - 38, my + 34, cx - 40, my - 10); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 44, my - 12, 88, 12);
      ctx.fillStyle = tongue; ctx.beginPath(); ctx.ellipse(cx, my + 34, 22, 14, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.stroke(); break;
    }
    case 'scream': case 'wail': {
      ctx.fillStyle = dark; ctx.beginPath();
      if (E.mouth === 'scream') ctx.roundRect(cx - 28, my - 16, 56, 56, 22); else { ctx.moveTo(cx - 36, my + 26); ctx.quadraticCurveTo(cx, my - 30, cx + 36, my + 26); ctx.closePath(); }
      ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 40, my - 20, 80, 12);
      ctx.fillStyle = tongue; ctx.beginPath(); ctx.ellipse(cx, my + 40, 20, 13, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.stroke(); break;
    }
    case 'grit': {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(cx - 36, my - 14, 72, 30, 9); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 34, my + 1); ctx.lineTo(cx + 34, my + 1);
      for (const k of [-18, 0, 18]) { ctx.moveTo(cx + k, my - 13); ctx.lineTo(cx + k, my + 15); } ctx.stroke(); break;
    }
  }
  if (E.sweat) {
    ctx.fillStyle = '#8fd3ff'; ctx.strokeStyle = ink; ctx.lineWidth = 4; const x = cx + 128, y = 150;
    ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.quadraticCurveTo(x + 18, y, x, y + 12); ctx.quadraticCurveTo(x - 18, y, x, y - 26); ctx.fill(); ctx.stroke();
  }
  if (E.tears) {
    ctx.fillStyle = 'rgba(110,190,255,.9)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + s * sep - 9, eyY + 10, 18, 150, 9); ctx.fill(); }
  }
  if (E.vein) {
    ctx.strokeStyle = '#d22'; ctx.lineWidth = 7; const x = cx + 120, y = 140;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + a * 12, y + b * 12, 10, 0, 7); ctx.stroke(); }
  }
}

// ---------------------------------------------------------------- personajes
const BODY = {
  average: { leg: .30, torso: .30, r: .12, head: .21, s: 1 },
  tall: { leg: .38, torso: .33, r: .115, head: .21, s: 1 },
  short: { leg: .24, torso: .27, r: .12, head: .21, s: .9 },
  wide: { leg: .28, torso: .31, r: .155, head: .215, s: 1 },
  kid: { leg: .22, torso: .23, r: .1, head: .2, s: .82 },
  old: { leg: .28, torso: .29, r: .125, head: .205, s: .95 },
};
const POSES = {
  idle: { L: [.15, .02, .02] },
  hips: { L: [.135, .05, -.02], poleL: [1, .3, -.8] },
  cross: { L: [-.05, .14, .15], R: [.05, .12, .16], poleL: [.5, -1, -.2], poleR: [-.5, -1, -.2] },
  shrug: { L: [.23, .12, .12], poleL: [1, -1, 0], sh: .025, tilt: 8 },
  up: { L: [.2, .46, .02], poleL: [1, 0, 0], jump: 0 },
  headhold: { L: [.2, .44, .07], poleL: [1, -.3, 0] },
  point: { R: [-.07, .27, .23], L: [.15, .02, .02], poleR: [-1, -.5, 0] },
  pointside: { R: [-.34, .26, .06], L: [.15, .02, .02], poleR: [0, -1, -.3] },
  wave: { R: [-.22, .43, .03], L: [.15, .02, .02], poleR: [-1, -.2, 0], wave: 1 },
  think: { R: [-.03, .26, .15], L: [-.06, .12, .13], poleR: [-.4, -1, 0], poleL: [.6, -1, 0], tilt: -6 },
  drive: { L: [.1, .16, .21], poleL: [1, -1, 0] },
  hold: { L: [.09, .1, .18], poleL: [1, -1, 0] },
  thumbs: { R: [-.13, .22, .2], L: [.15, .02, .02], poleR: [-1, -1, 0] },
  present: { R: [-.26, .12, .15], L: [.15, .02, .02], poleR: [-.4, -1, 0] },
  stop: { R: [-.09, .3, .23], L: [.15, .02, .02], poleR: [-1, -1, 0] },
  fist: { R: [-.15, .45, .06], L: [.15, .02, .02], poleR: [-1, 0, 0] },
  facepalm: { R: [-.06, .42, .19], L: [.15, .02, .02], poleR: [-1, -1, 0], tilt: 10, nod: 12 },
  scratch: { R: [-.17, .46, .02], L: [.15, .02, .02], poleR: [-1, 0, -.2], tilt: -8 },
  cheer: { L: [.24, .44, .05], poleL: [1, -.2, 0] },
};
function poseHands(name) {
  const P = POSES[name] || POSES.idle;
  const L = P.L || [.15, .02, .02];
  const R = P.R || [-L[0], L[1], L[2]];
  const pl = P.poleL || [1, -.2, -.3];
  const pr = P.poleR || [-pl[0], pl[1], pl[2]];
  return { L, R, pl, pr, sh: P.sh || 0, tilt: P.tilt || 0, nod: P.nod || 0, wave: P.wave || 0 };
}
const DOWN = new THREE.Vector3(0, -1, 0);
function solveArm(S, T, a, b, pole) {
  const d = new THREE.Vector3().subVectors(T, S);
  let len = clamp(d.length(), .02, a + b - .002);
  const u = d.clone().normalize();
  const w = v3(pole).sub(u.clone().multiplyScalar(v3(pole).dot(u))).normalize();
  const cosA = clamp((a * a + len * len - b * b) / (2 * a * len), -1, 1);
  const E = S.clone().add(u.clone().multiplyScalar(a * cosA)).add(w.multiplyScalar(a * Math.sqrt(1 - cosA * cosA)));
  const Tc = S.clone().add(u.multiplyScalar(len));
  return { E, T: Tc };
}

class Character {
  constructor(spec, story) {
    const look = Object.assign({}, story.look || {}, spec.look || {});
    this.spec = spec; this.look = look;
    const B = BODY[look.body || 'average'];
    this.B = B;
    const skin = SKIN[look.skin] || look.skin || SKIN[story.look?.skin] || SKIN.white;
    this.skin = skin;
    const shirt = look.shirt || '#3f7fd0', pants = look.pants || '#3b3f4f';
    this.root = new THREE.Group();
    this.scaleG = new THREE.Group(); this.scaleG.scale.setScalar(B.s * (look.scale || 1)); this.root.add(this.scaleG);
    this.hips = new THREE.Group(); this.hips.position.y = B.leg; this.scaleG.add(this.hips);
    // piernas
    this.legs = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(s * B.r * .48, 0, 0);
      const leg = cyl(.034, .034, B.leg - .02, pants); leg.position.y = -(B.leg - .02) / 2; g.add(leg);
      const shoe = sph(.05, look.shoes || '#2a2424'); shoe.scale.set(1, .62, 1.55); shoe.position.set(0, -B.leg + .03, .03); g.add(shoe);
      this.hips.add(g); this.legs.push(g);
    }
    // torso
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    const cap = G(`cap${B.r},${B.torso}`, () => new THREE.CapsuleGeometry(B.r, Math.max(.01, B.torso - 2 * B.r), 8, 24));
    const t = mesh(cap, shirt); t.position.y = B.torso / 2; t.scale.z = .9; this.torso.add(t);
    const pg = G(`pants${B.r}`, () => new THREE.CylinderGeometry(B.r * 1.03, B.r * .9, .1, 24));
    const p = mesh(pg, pants); p.position.y = .045; p.scale.z = .92; this.torso.add(p);
    if (look.vest) { const v = mesh(G(`vest${B.r},${B.torso}`, () => new THREE.CylinderGeometry(B.r * 1.04, B.r * 1.06, B.torso * .5, 24)), look.vest); v.position.y = B.torso * .5; v.scale.z = .92; this.torso.add(v); }
    if (look.tie) { const tie = box(.04, .13, .02, look.tie, { r: .008, thick: .004 }); tie.position.set(0, B.torso * .62, B.r * .88); tie.rotation.x = -.18; this.torso.add(tie); }
    if (look.coat) { const c = mesh(G(`coat${B.r},${B.torso}`, () => new THREE.CylinderGeometry(B.r * 1.06, B.r * 1.25, B.torso * .9, 24, 1, true)), look.coat); c.position.y = B.torso * .42; c.scale.z = .92; this.torso.add(c); }
    // cabeza
    this.headG = new THREE.Group(); this.headG.position.y = B.torso + B.head * .78; this.torso.add(this.headG);
    this.faceCanvas = document.createElement('canvas'); this.faceCanvas.width = 1024; this.faceCanvas.height = 512;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas); this.faceTex.colorSpace = THREE.SRGBColorSpace; this.faceTex.anisotropy = 8;
    const hg = G(`head${B.head}`, () => { const g = new THREE.SphereGeometry(B.head, 48, 32); g.rotateY(-Math.PI / 2); return g; });
    const head = mesh(hg, toon(0xffffff, { map: this.faceTex }), { thick: .008 });
    this.headG.add(head);
    this.addHair(look, B);
    // brazos (IK de dos huesos)
    this.arms = {};
    const a = .115 * (B.torso / .3) ** .5, bl = .115 * (B.torso / .3) ** .5;
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      const up = new THREE.Group(), fo = new THREE.Group(), hand = sph(.037, skin);
      const ug = G(`arm${a}`, () => { const g = new THREE.CapsuleGeometry(.028, a, 4, 12); g.translate(0, -a / 2, 0); return g; });
      const fg = G(`arm${bl}`, () => { const g = new THREE.CapsuleGeometry(.026, bl, 4, 12); g.translate(0, -bl / 2, 0); return g; });
      up.add(mesh(ug, look.sleeves === 'short' ? skin : shirt, { thick: .006 }));
      fo.add(mesh(fg, look.sleeves === 'long' || !look.sleeves ? shirt : skin, { thick: .006 }));
      this.torso.add(up, fo, hand);
      const S = new THREE.Vector3(s * B.r * .95, B.torso * .8, 0);
      this.arms[side] = { up, fo, hand, S, a, b: bl };
    }
    this.lastFace = '';
    this.seed = hash(spec.id);
  }
  addHair(look, B) {
    const hc = look.hairColor || '#3b2a20', r = B.head;
    const H = look.hair || 'none';
    const capGeom = (k, tl) => G(`hcap${r},${k},${tl}`, () => new THREE.SphereGeometry(r * k, 40, 16, 0, Math.PI * 2, 0, tl));
    if (H === 'short' || H === 'bun' || H === 'long' || H === 'part') {
      const m = mesh(capGeom(1.04, Math.PI * .36), hc); m.rotation.x = -.38; this.headG.add(m);
      if (H === 'bun') { const b = sph(.085, hc); b.position.set(0, r * .95, -r * .45); this.headG.add(b); }
      if (H === 'long') { const l = mesh(G(`hl${r}`, () => new THREE.CylinderGeometry(r * .95, r * 1.02, r * 1.1, 32, 1, false, Math.PI * .6, Math.PI * .8)), hc); l.position.set(0, -r * .1, 0); this.headG.add(l); }
    } else if (H === 'curly') {
      const rr = rng(this.spec?.id || 'c');
      for (let i = 0; i < 22; i++) { const th = rr() * Math.PI * .42, ph = rr() * Math.PI * 2; if (Math.cos(ph) > .7 && th > .2) continue; const b = sph(.055, hc, { thick: .005 }); b.position.setFromSphericalCoords(r * 1.0, th, ph); this.headG.add(b); }
    } else if (H === 'cap' || H === 'hardhat' || H === 'police') {
      const col = look.hatColor || (H === 'hardhat' ? '#f2c230' : H === 'police' ? '#1f2c55' : '#c63b3b');
      const m = mesh(capGeom(1.06, Math.PI * .31), col); m.rotation.x = -.12; this.headG.add(m);
      const brim = cyl(r * .62, r * .62, .015, col); brim.scale.z = .55; brim.position.set(0, r * .6, r * .68); brim.rotation.x = .25; if (H !== 'hardhat') this.headG.add(brim);
      if (H === 'hardhat') { const rim = cyl(r * 1.12, r * 1.12, .014, col); rim.position.y = r * .55; this.headG.add(rim); }
    } else if (H === 'hat') {
      const col = look.hatColor || '#3a3030';
      const top = cyl(r * .72, r * .8, r * .5, col); top.position.y = r * 1.0; this.headG.add(top);
      const brim = cyl(r * 1.3, r * 1.3, .016, col); brim.position.y = r * .78; this.headG.add(brim);
    } else if (H === 'helmet') {
      const gl = new THREE.Mesh(G(`helm${r}`, () => new THREE.SphereGeometry(r * 1.4, 40, 24)), toon('#cfe8ff', { opacity: .28 }));
      this.headG.add(gl);
    } else if (H === 'bald') {
      for (const s of [-1, 1]) { const b = sph(.05, look.hairColor || '#ddd'); b.scale.set(.6, 1, 1); b.position.set(s * r * .95, r * .05, -r * .1); this.headG.add(b); }
    }
  }
  setFace(expr, eyes, blink) {
    const key = `${expr}|${eyes[0].toFixed(2)}|${eyes[1].toFixed(2)}|${blink}`;
    if (key === this.lastFace) return;
    this.lastFace = key;
    drawFace(this.faceCanvas.getContext('2d'), { skin: this.skin, expr, eyes, blink, glasses: this.look.glasses, mustache: this.look.mustache, hairColor: this.look.hairColor, blush: this.look.blush });
    this.faceTex.needsUpdate = true;
  }
  applyArms(H) {
    const B = this.B;
    for (const side of ['L', 'R']) {
      const A = this.arms[side];
      const T = v3(side === 'L' ? H.L : H.R);
      T.y *= B.torso / .3;
      const S = A.S.clone(); S.y += H.sh;
      const { E, T: Tc } = solveArm(S, T, A.a, A.b, side === 'L' ? H.pl : H.pr);
      A.up.position.copy(S); A.up.quaternion.setFromUnitVectors(DOWN, E.clone().sub(S).normalize());
      A.fo.position.copy(E); A.fo.quaternion.setFromUnitVectors(DOWN, Tc.clone().sub(E).normalize());
      A.hand.position.copy(Tc);
    }
  }
  height() { return ((this.sitting ? .05 : this.B.leg) + this.B.torso + this.B.head * 1.75) * this.B.s * (this.look.scale || 1); }
  headY() { return ((this.sitting ? .05 : this.B.leg) + this.B.torso + this.B.head * .78) * this.B.s * (this.look.scale || 1); }
}

// ---------------------------------------------------------------- pistas de animación (todo es función de t)
function lastBefore(list, t) { let r = null; for (const a of list) { if (a.t <= t) r = a; else break; } return r; }
function blendHands(a, b, p) {
  const m = (x, y) => x.map((v, i) => lerp(v, y[i], p));
  return { L: m(a.L, b.L), R: m(a.R, b.R), pl: m(a.pl, b.pl), pr: m(a.pr, b.pr), sh: lerp(a.sh, b.sh, p), tilt: lerp(a.tilt, b.tilt, p), nod: lerp(a.nod, b.nod, p), wave: lerp(a.wave, b.wave, p) };
}
function updateCharacter(ch, acts, t, cam) {
  const spec = ch.spec;
  // posición / giro: cada "move" parte de donde terminó el anterior
  let pos = [spec.pos?.[0] ?? 0, spec.pos?.[1] ?? 0, spec.pos?.[2] ?? 0], ry = spec.rot ?? 0;
  let walking = 0, sitting = spec.sit ? 1 : 0;
  for (const a of acts) {
    if (a.t > t) break;
    if (a.move) {
      const d = a.dur ?? .8, p = clamp((t - a.t) / d, 0, 1), to = [a.move[0], a.move.length > 2 ? a.move[1] : pos[1], a.move[a.move.length - 1]];
      const e = a.ease === 'linear' ? p : easeInOut(p);
      if (p < 1 && a.walk !== false) walking = 1;
      pos = pos.map((v, i) => lerp(v, to[i], e));
    }
    if (a.turn != null) { const p = clamp((t - a.t) / (a.dur ?? .25), 0, 1); ry = lerp(ry, a.turn, easeOutBack(p, 1.2)); }
    if (a.sit != null) sitting = a.sit ? 1 : 0;
  }
  ch.sitting = !!sitting;
  ch.root.position.set(pos[0], pos[1], pos[2]);
  ch.root.rotation.y = ry * D2R;
  // pose con sobreimpulso (el gesto llega antes que la palabra; la cabeza sigue 2-4 fotogramas después)
  const poseActs = acts.filter(a => a.pose);
  const cur = lastBefore(poseActs, t);
  const prevIdx = cur ? poseActs.indexOf(cur) - 1 : -1;
  const from = poseHands(prevIdx >= 0 ? poseActs[prevIdx].pose : (spec.pose || 'idle'));
  const to = poseHands(cur ? cur.pose : (spec.pose || 'idle'));
  const pp = cur ? clamp((t - cur.t) / .2, 0, 1) : 1;
  let H = blendHands(from, to, easeOutBack(pp, 1.4));
  if (H.wave > .01) { const w = Math.sin(t * 15) * .06 * H.wave; H.R = [H.R[0] + w, H.R[1], H.R[2]]; }
  if (walking) { const sw = Math.sin(t * 13); H.L = [H.L[0], H.L[1], H.L[2] + sw * .07]; H.R = [H.R[0], H.R[1], H.R[2] - sw * .07]; }
  ch.applyArms(H);
  const hp = cur ? clamp((t - cur.t - .08) / .22, 0, 1) : 1;
  const tilt = lerp(from.tilt, to.tilt, easeOutBack(hp, 1.2)), nod = lerp(from.nod, to.nod, easeOutBack(hp, 1.2));
  // piernas
  const sw = walking ? Math.sin(t * 13) * .5 : 0;
  ch.legs[0].rotation.x = sitting ? -1.45 : sw; ch.legs[1].rotation.x = sitting ? -1.45 : -sw;
  // rebote / sacudida
  let by = walking ? Math.abs(Math.sin(t * 13)) * .02 : 0, sq = 1;
  for (const a of acts) {
    if (a.t > t) break;
    if (a.jolt || a.jump) {
      const d = a.jump ? .55 : .3, p = (t - a.t) / d;
      if (p >= 0 && p <= 1) { by += Math.sin(p * Math.PI) * (a.jump ? .22 : .07); sq = 1 + Math.sin(p * Math.PI * 2) * .05; }
    }
  }
  ch.hips.position.y = (sitting ? .05 : ch.B.leg) + by; ch.scaleG.scale.y = ch.B.s * (ch.look.scale || 1) * sq;
  // inclinación del cuerpo
  const lean = lastBefore(acts.filter(a => a.lean != null), t);
  ch.torso.rotation.x = (lean ? lean.lean : (spec.lean || 0)) * D2R + (ch.look.body === 'old' ? .12 : 0);
  // cabeza: mirar a cámara / a un punto / ángulos fijos
  const ha = lastBefore(acts.filter(a => a.head || a.lookAt), t);
  let yaw = 0, pitch = 0, htilt = tilt;
  const lookAt = ha ? ha.lookAt : spec.lookAt;
  const target = lookAt === 'cam' ? cam.position : (Array.isArray(lookAt) ? v3(lookAt) : null);
  if (target) {
    const hw = new THREE.Vector3(); ch.headG.getWorldPosition(hw);
    const dir = target.clone().sub(hw);
    yaw = Math.atan2(dir.x, dir.z) / D2R - ry; pitch = -Math.atan2(dir.y, Math.hypot(dir.x, dir.z)) / D2R;
    yaw = ((yaw + 540) % 360) - 180; yaw = clamp(yaw, -70, 70); pitch = clamp(pitch, -25, 25);
  } else if (ha && ha.head) { [yaw, pitch, htilt] = [ha.head[0] || 0, ha.head[1] || 0, (ha.head[2] || 0) + tilt]; }
  else if (spec.head) { [yaw, pitch] = spec.head; }
  const hp2 = ha ? clamp((t - ha.t - .06) / .25, 0, 1) : 1;
  const k = easeOutBack(hp2, 1.1);
  ch.headG.rotation.set((pitch + nod) * D2R * k, yaw * D2R * k, -htilt * D2R);
  // cara
  const ea = lastBefore(acts.filter(a => a.expr), t);
  const expr = ea ? ea.expr : (spec.expr || 'neutral');
  const eyeA = lastBefore(acts.filter(a => a.eyes), t);
  const eyes = eyeA ? eyeA.eyes : (spec.eyes || [0, 0]);
  const period = 2.6 + ch.seed * 2, ph = (t + ch.seed * 10) % period;
  const blink = ph < .1 && !['cry', 'joy', 'dizzy', 'starstruck'].includes(expr);
  ch.setFace(expr, eyes, blink);
}

// ---------------------------------------------------------------- utilería
const PROPS = {};
function propTextPlane(g, w, h, z, draw, res = 512, o = {}) {
  const tex = canvasTex(Math.round(res * w / h), res, draw);
  const p = panel(w, h, tex, o); p.position.z = z; g.add(p); return { plane: p, tex };
}
PROPS.sign = (o) => {
  const g = new THREE.Group(), w = o.w || 1.2, h = o.h || .6, y = o.post === false ? (o.y0 ?? 0) : (o.postH ?? 1.1);
  const bg = o.bg || '#2f7d4a', fg = o.fg || '#fff';
  const board = box(w, h, .05, bg, { r: .03 }); board.position.y = y + h / 2; g.add(board);
  const lines = Array.isArray(o.text) ? o.text : String(o.text || '').split('\n');
  const tp = propTextPlane(g, w * .94, h * .9, .027, (ctx, W, H) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = fg; ctx.lineWidth = H * .03; ctx.strokeRect(H * .04, H * .04, W - H * .08, H - H * .08); drawLines(ctx, lines, W * .92, H * .8, fg, H * .42); });
  tp.plane.position.y = y + h / 2;
  if (o.post !== false) { for (const s of (w > 1.4 ? [-1, 1] : [0])) { const p = cyl(.03, .03, y + .02, '#8a8f98'); p.position.set(s * w * .38, y / 2, -.04); g.add(p); } }
  g.userData.focus = y + h / 2; g.userData.size = Math.max(w, h + y * .3);
  return g;
};
PROPS.billboard = (o) => PROPS.sign(Object.assign({ w: 3, h: 1.5, postH: 1.6, bg: '#f4efe4', fg: '#c62b2b' }, o));
PROPS.led = (o) => {
  const g = new THREE.Group(), w = o.w || 1.4, h = o.h || .55, y = o.y ?? 1.2;
  const housing = box(w + .12, h + .12, .14, o.frame || '#2b2b2f', { r: .04 }); housing.position.y = y; g.add(housing);
  if (o.label) { const lb = PROPS.sign({ text: o.label, w: w + .12, h: .22, post: false, bg: o.labelBg || '#efe7d6', fg: o.labelFg || '#b8322b' }); lb.position.set(0, y + h / 2 + .06, .0); g.add(lb); }
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); p.position.set(0, y, .072); g.add(p);
  g.userData = { focus: y, size: w * 1.2, led: { c, tex, o, last: null } };
  return g;
};
function fmtNum(v, o) {
  const dec = o.decimals || 0;
  let s = Math.abs(v).toFixed(dec);
  if (o.sep !== false) { const [i, d] = s.split('.'); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, o.sep || '.') + (d ? ',' + d : ''); }
  return (v < 0 ? '-' : '') + (o.prefix || '') + s + (o.suffix || '');
}
function drawLed(L, v) {
  const s = fmtNum(v, L.o); if (s === L.last) return; L.last = s;
  const ctx = L.c.getContext('2d'), W = L.c.width, H = L.c.height;
  ctx.fillStyle = '#120b08'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,140,40,.07)'; for (let x = 0; x < W; x += 14) for (let y = 0; y < H; y += 14) ctx.fillRect(x + 4, y + 4, 6, 6);
  fitText(ctx, s, W * .9, H * .78, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = L.o.color || '#ffae2a'; ctx.shadowBlur = 30; ctx.fillStyle = L.o.color || '#ffb53a';
  ctx.fillText(s, W / 2, H / 2 + H * .04); ctx.shadowBlur = 0;
  L.tex.needsUpdate = true;
}
PROPS.gauge = (o) => {
  const g = new THREE.Group(), r = o.r || .45, y = o.y ?? 1.2;
  const body = cyl(r * 1.1, r * 1.1, .12, o.frame || '#b08a4a', { seg: 40 }); body.rotation.x = Math.PI / 2; body.position.y = y; g.add(body);
  const tp = propTextPlane(g, r * 2, r * 2, .062, (ctx, W, H) => {
    ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, 7); ctx.fill();
    for (let i = 0; i <= 10; i++) { const a = (-225 + i * 27) * D2R; ctx.strokeStyle = i >= 8 ? '#c33' : '#222'; ctx.lineWidth = i % 5 ? 6 : 12; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * W * .36, H / 2 + Math.sin(a) * H * .36); ctx.lineTo(W / 2 + Math.cos(a) * W * .45, H / 2 + Math.sin(a) * H * .45); ctx.stroke(); }
    if (o.label) { ctx.fillStyle = '#333'; fitText(ctx, o.label, W * .5, H * .1); ctx.textAlign = 'center'; ctx.fillText(o.label, W / 2, H * .72); }
  }, 512, { transparent: true });
  tp.plane.position.y = y;
  const needle = new THREE.Group(); needle.position.set(0, y, .08);
  const nd = box(.025, r * .8, .015, '#c62b2b', { r: .006, thick: .003 }); nd.position.y = r * .35; needle.add(nd); g.add(needle);
  const hub = sph(.045, '#333'); hub.position.set(0, y, .08); g.add(hub);
  if (o.post !== false) { const p = cyl(.04, .05, y - r, '#6b6f78'); p.position.y = (y - r) / 2; g.add(p); }
  g.userData = { focus: y, size: r * 2.6, needle };
  return g;
};
PROPS.clock = (o) => {
  const g = new THREE.Group(), r = o.r || .4, y = o.y ?? 2.0;
  const body = cyl(r * 1.08, r * 1.08, .1, o.frame || '#2d3a4a', { seg: 48 }); body.rotation.x = Math.PI / 2; body.position.y = y; g.add(body);
  const tp = propTextPlane(g, r * 2, r * 2, .052, (ctx, W, H) => {
    ctx.fillStyle = '#fbf7ec'; ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${H * .1}px Montserrat`;
    for (let i = 1; i <= 12; i++) { const a = (i * 30 - 90) * D2R; ctx.fillText(i, W / 2 + Math.cos(a) * W * .39, H / 2 + Math.sin(a) * H * .39); }
  }, 512, { transparent: true });
  tp.plane.position.y = y;
  const mk = (len, wd, col) => { const h = new THREE.Group(); h.position.set(0, y, .07); const m = box(wd, len, .012, col, { r: wd / 2.2, thick: .003, outline: false }); m.position.y = len / 2 - .03; h.add(m); g.add(h); return h; };
  const hh = mk(r * .5, .045, '#1d1d1d'), mh = mk(r * .78, .03, '#1d1d1d');
  if (o.post) { const p = cyl(.05, .07, y - r, o.frame || '#2d3a4a'); p.position.y = (y - r) / 2; g.add(p); }
  g.userData = { focus: y, size: r * 2.6, clock: { hh, mh } };
  return g;
};
function parseHM(s) { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); }
PROPS.calendar = (o) => {
  const g = new THREE.Group(), w = o.w || .7, h = o.h || .85, y = o.y ?? 1.4;
  const pad = box(w, h, .08, '#f7f3ea', { r: .02 }); pad.position.y = y; g.add(pad);
  const tp = propTextPlane(g, w * .96, h * .96, .042, (ctx, W, H) => {
    ctx.fillStyle = '#fbf8f1'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = o.color || '#c62b2b'; ctx.fillRect(0, 0, W, H * .24);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; fitText(ctx, o.month || 'SEPTIEMBRE', W * .86, H * .13); ctx.fillText(o.month || 'SEPTIEMBRE', W / 2, H * .125);
    ctx.fillStyle = '#1f1a17'; fitText(ctx, String(o.day ?? 1), W * .8, H * .5); ctx.fillText(String(o.day ?? 1), W / 2, H * .55);
    if (o.year) { ctx.fillStyle = '#555'; fitText(ctx, String(o.year), W * .6, H * .13, 800); ctx.fillText(String(o.year), W / 2, H * .86); }
  });
  tp.plane.position.y = y;
  for (const s of [-1, 1]) { const ring = cyl(.025, .025, .06, '#888'); ring.position.set(s * w * .3, y + h / 2, .0); ring.rotation.x = Math.PI / 2; g.add(ring); }
  if (o.post) { const p = cyl(.03, .03, y - h / 2, '#6b6f78'); p.position.y = (y - h / 2) / 2; g.add(p); }
  g.userData.focus = y; g.userData.size = h * 1.4;
  return g;
};
const FLAGS = {
  sweden: (ctx, W, H) => { ctx.fillStyle = '#006aa7'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fecc00'; ctx.fillRect(W * 5 / 16, 0, W * 2 / 16, H); ctx.fillRect(0, H * 4 / 10, W, H * 2 / 10); },
  norway: (ctx, W, H) => { ctx.fillStyle = '#ba0c2f'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(W * 6 / 22, 0, W * 4 / 22, H); ctx.fillRect(0, H * 6 / 16, W, H * 4 / 16); ctx.fillStyle = '#00205b'; ctx.fillRect(W * 7 / 22, 0, W * 2 / 22, H); ctx.fillRect(0, H * 7 / 16, W, H * 2 / 16); },
  finland: (ctx, W, H) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#002f6c'; ctx.fillRect(W * 5 / 18, 0, W * 3 / 18, H); ctx.fillRect(0, H * 4 / 11, W, H * 3 / 11); },
  mexico: (ctx, W, H) => { ['#006847', '#fff', '#ce1126'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * W / 3, 0, W / 3, H); }); },
  uk: (ctx, W, H) => { ctx.fillStyle = '#012169'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#fff'; ctx.lineWidth = H * .2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke(); ctx.strokeStyle = '#c8102e'; ctx.lineWidth = H * .07; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(W * .42, 0, W * .16, H); ctx.fillRect(0, H * .35, W, H * .3); ctx.fillStyle = '#c8102e'; ctx.fillRect(W * .45, 0, W * .1, H); ctx.fillRect(0, H * .4, W, H * .2); },
};
PROPS.flag = (o) => {
  const g = new THREE.Group(), w = o.w || .9, h = o.h || .56, ph = o.poleH || 2.2;
  const pole = cyl(.025, .025, ph, '#d8d8d8'); pole.position.y = ph / 2; g.add(pole);
  const knob = sph(.04, '#e0b84a'); knob.position.y = ph; g.add(knob);
  const geom = new THREE.PlaneGeometry(w, h, 16, 6); geom.translate(w / 2, 0, 0);
  const tex = canvasTex(512, Math.round(512 * h / w), FLAGS[o.country] || FLAGS.sweden);
  const m = new THREE.Mesh(geom, toon(0xffffff, { map: tex })); m.material.side = THREE.DoubleSide; m.castShadow = true;
  m.position.set(.025, ph - h / 2 - .05, 0); g.add(m);
  g.userData = { focus: ph - h / 2, size: ph * .8, flag: { geom, base: geom.attributes.position.array.slice() } };
  return g;
};
PROPS.paper = (o) => {
  const g = new THREE.Group(), w = o.w || .5, h = o.h || .66;
  const lines = Array.isArray(o.text) ? o.text : String(o.text || '').split('\n');
  const sheet = box(w, h, .01, '#fbfaf5', { r: .004, thick: .004 }); g.add(sheet);
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const p = panel(w * .96, h * .96, tex); p.position.z = .006; g.add(p);
  const draw = (stamped) => {
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.fillStyle = '#fbfaf5'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => { fitText(ctx, ln, W * .82, i === 0 ? H * .09 : H * .065, i === 0 ? 900 : 800); ctx.fillText(ln, W / 2, H * (.14 + i * .1)); });
    ctx.fillStyle = '#c9c4b8'; for (let i = 0; i < 5; i++) ctx.fillRect(W * .14, H * (.42 + i * .07), W * (.72 - (i % 2) * .2), H * .022);
    if (o.big) { ctx.fillStyle = o.bigColor || '#1f1a17'; fitText(ctx, o.big, W * .7, H * .2); ctx.fillText(o.big, W / 2, H * .8); }
    if (stamped) {
      ctx.save(); ctx.translate(W / 2, H * .62); ctx.rotate(-.25); ctx.strokeStyle = ctx.fillStyle = o.stampColor || '#d02a2a'; ctx.lineWidth = 12;
      fitText(ctx, o.stamp, W * .72, H * .13); const tw = ctx.measureText(o.stamp).width;
      ctx.strokeRect(-tw / 2 - 20, -H * .09, tw + 40, H * .18); ctx.fillText(o.stamp, 0, 4); ctx.restore();
    }
    tex.needsUpdate = true;
  };
  draw(false);
  g.userData = { focus: 0, size: h * 1.3, paper: { draw, stamped: false } };
  return g;
};
PROPS.car = (o) => {
  const g = new THREE.Group(), col = o.color || '#d23a3a';
  const body = box(2.0, .42, .98, col, { r: .14 }); body.position.y = .38; g.add(body);
  const cab = box(1.1, .56, .86, o.glass || '#bfe3f2', { r: .12, mat: toon(o.glass || '#bfe3f2', { opacity: .45 }) }); cab.position.set(-.12, .87, 0); g.add(cab);
  const roof = box(1.04, .07, .88, col, { r: .03 }); roof.position.set(-.12, 1.17, 0); g.add(roof);
  for (const x of [.4, -.64]) for (const z of [-.42, .42]) { const pil = box(.05, .56, .04, col, { r: .015, thick: .004 }); pil.position.set(x, .87, z); g.add(pil); }
  for (const [x, z] of [[.62, .46], [-.66, .46], [.62, -.46], [-.66, -.46]]) {
    const wh = cyl(.19, .19, .15, '#1f1f22'); wh.rotation.x = Math.PI / 2; wh.position.set(x, .19, z); g.add(wh);
    const hub = cyl(.08, .08, .155, '#c9cdd3', { outline: false }); hub.rotation.x = Math.PI / 2; hub.position.set(x, .19, z); g.add(hub);
  }
  for (const z of [-.3, .3]) {
    const hl = sph(.07, '#fff6c8', { mat: toon('#fff6c8', { emissive: o.lights ? '#fff2b0' : 0, ei: 1.2 }) }); hl.scale.z = .7; hl.scale.x = .5; hl.position.set(1.0, .42, z); g.add(hl);
    const tl = box(.04, .08, .16, '#a01818'); tl.position.set(-1.0, .42, z); g.add(tl);
  }
  const bump = box(.08, .1, 1.0, '#c9cdd3', { r: .03 }); bump.position.set(1.02, .25, 0); g.add(bump);
  const bump2 = bump.clone(); bump2.position.x = -1.02; g.add(bump2);
  if (o.plate) { const pl = PROPS.sign({ text: o.plate, w: .32, h: .1, post: false, bg: '#fff', fg: '#111' }); pl.rotation.y = Math.PI / 2; pl.position.set(1.07, .16, 0); g.add(pl); }
  // volante del lado izquierdo (o derecho)
  const wz = (o.wheel === 'right' ? 1 : -1) * .22;
  const sw = mesh(G('torus', () => new THREE.TorusGeometry(.09, .016, 8, 24)), '#222', { thick: .003 }); sw.position.set(.2, .78, wz); sw.rotation.order = 'YXZ'; sw.rotation.y = Math.PI / 2; sw.rotation.x = -.5; g.add(sw);
  g.userData = { focus: .6, size: 2.3, driverPos: [-.12, .42, wz] };
  return g;
};
PROPS.tree = (o) => {
  const g = new THREE.Group(), s = o.s || 1;
  const tr = cyl(.07 * s, .09 * s, .7 * s, '#7a5232'); tr.position.y = .35 * s; g.add(tr);
  const col = o.color || '#4f9a4a';
  for (const [x, y, z, r] of [[0, 1.0, 0, .42], [.22, .85, .08, .3], [-.2, .9, -.05, .32], [0, 1.28, .02, .3]]) { const b = sph(r * s, col); b.position.set(x * s, y * s, z * s); g.add(b); }
  g.userData = { focus: .9 * s, size: 1.6 * s }; return g;
};
PROPS.pine = (o) => {
  const g = new THREE.Group(), s = o.s || 1;
  const tr = cyl(.06 * s, .08 * s, .4 * s, '#6e4a2c'); tr.position.y = .2 * s; g.add(tr);
  [[.5, .55], [.4, .95], [.28, 1.3]].forEach(([r, y]) => { const c = mesh(G(`cone${r * s}`, () => new THREE.ConeGeometry(r * s, .6 * s, 18)), o.color || '#2f6e45'); c.position.y = y * s; g.add(c); });
  g.userData = { focus: .8 * s, size: 1.8 * s }; return g;
};
PROPS.cone = () => { const g = new THREE.Group(); const c = mesh(G('tcone', () => new THREE.ConeGeometry(.13, .38, 20)), '#f07a22'); c.position.y = .2; g.add(c); const st = cyl(.1, .115, .07, '#fff', { outline: false }); st.position.y = .17; g.add(st); const b = box(.3, .03, .3, '#f07a22'); b.position.y = .015; g.add(b); g.userData = { focus: .2, size: .6 }; return g; };
PROPS.lamp = (o) => {
  const g = new THREE.Group(), h = o.h || 2.4;
  const p = cyl(.035, .05, h, '#3b4048'); p.position.y = h / 2; g.add(p);
  const arm = box(.5, .04, .04, '#3b4048'); arm.position.set(.22, h, 0); g.add(arm);
  const shade = mesh(G('lshade', () => new THREE.ConeGeometry(.14, .14, 20, 1, true)), '#3b4048'); shade.position.set(.45, h - .04, 0); g.add(shade);
  const bulb = sph(.07, '#fff3c4', { mat: toon('#fff3c4', { emissive: o.on ? '#ffe9a0' : 0, ei: 1.5 }), outline: false }); bulb.position.set(.45, h - .1, 0); g.add(bulb);
  g.userData = { focus: h * .7, size: h }; return g;
};
PROPS.trafficlight = (o) => {
  const g = new THREE.Group();
  const p = cyl(.04, .05, 1.8, '#3b4048'); p.position.y = .9; g.add(p);
  const b = box(.26, .7, .2, '#2a2d33', { r: .05 }); b.position.y = 2.1; g.add(b);
  const on = o.on || 'red';
  [['red', '#e33b2e', .22], ['yellow', '#f2c230', 0], ['green', '#3fbf5a', -.22]].forEach(([k, c, y]) => {
    const l = sph(.075, c, { mat: toon(k === on ? c : '#3a3a3a', { emissive: k === on ? c : 0, ei: 1.3 }), outline: false }); l.position.set(0, 2.1 + y, .1); l.scale.z = .5; g.add(l);
  });
  g.userData = { focus: 1.9, size: 2.4 }; return g;
};
PROPS.arrow = (o) => {
  const g = new THREE.Group(), L = o.len || 1.2, col = o.color || '#f2c230';
  const sh = new THREE.Shape(); const w = .13, hw = .3, hl = .4;
  sh.moveTo(0, -w); sh.lineTo(L - hl, -w); sh.lineTo(L - hl, -hw); sh.lineTo(L, 0); sh.lineTo(L - hl, hw); sh.lineTo(L - hl, w); sh.lineTo(0, w); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 });
  geo.translate(-L / 2, 0, -.04);
  const m = mesh(geo, col, { thick: .012 }); g.add(m);
  if (o.flat) { m.rotation.x = -Math.PI / 2; m.position.y = .06; } else m.position.y = o.y ?? 1;
  g.userData = { focus: o.flat ? .1 : (o.y ?? 1), size: L * 1.2 }; return g;
};
PROPS.table = (o) => {
  const g = new THREE.Group(), w = o.w || 1.4, d = o.d || .7, h = o.h || .5;
  const top = box(w, .06, d, o.color || '#9a6a42'); top.position.y = h; g.add(top);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const l = box(.06, h, .06, o.color || '#9a6a42'); l.position.set(x * (w / 2 - .07), h / 2, z * (d / 2 - .07)); g.add(l); }
  g.userData = { focus: h, size: w }; return g;
};
PROPS.podium = (o) => {
  const g = new THREE.Group(); const b = box(.7, .62, .45, o.color || '#7a4b2e', { r: .03 }); b.position.y = .31; g.add(b);
  const t = box(.78, .06, .5, o.top || '#5e3920'); t.position.y = .64; t.rotation.x = -.15; g.add(t);
  if (o.text) { const s = PROPS.sign({ text: o.text, w: .5, h: .25, post: false, bg: o.signBg || '#f2c230', fg: '#1f1a17' }); s.position.set(0, .2, .23); g.add(s); }
  g.userData = { focus: .5, size: 1 }; return g;
};
PROPS.ballot = (o) => {
  const g = new THREE.Group(); const b = box(.6, .5, .45, o.color || '#2f5fa8', { r: .03 }); b.position.y = .25; g.add(b);
  const slot = box(.3, .02, .04, '#111', { outline: false }); slot.position.y = .5; g.add(slot);
  if (o.text) { const s = PROPS.sign({ text: o.text, w: .46, h: .2, post: false, bg: '#fff', fg: o.color || '#2f5fa8' }); s.position.set(0, .14, .225); g.add(s); }
  g.userData = { focus: .3, size: .9 }; return g;
};
PROPS.stamp = (o) => {
  const g = new THREE.Group(); const base = box(.2, .06, .12, '#3a2a22'); base.position.y = .03; g.add(base);
  const pad = box(.19, .015, .11, o.color || '#c62b2b', { outline: false }); pad.position.y = -.002; g.add(pad);
  const h = cyl(.025, .03, .14, '#6b4a33'); h.position.y = .12; g.add(h); const k = sph(.05, '#6b4a33'); k.position.y = .22; g.add(k);
  g.userData = { focus: .1, size: .4 }; return g;
};
PROPS.globe = (o) => {
  const g = new THREE.Group(), r = o.r || .5;
  const tex = canvasTex(1024, 512, (ctx, W, H) => {
    ctx.fillStyle = '#3a8fd0'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#5bb05a'; const R = rng('globe');
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(R() * W, H * (.2 + R() * .6), 30 + R() * 90, 20 + R() * 60, R() * 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#f2f6fa'; ctx.fillRect(0, 0, W, H * .06); ctx.fillRect(0, H * .94, W, H * .06);
  });
  const s = mesh(G(`globe${r}`, () => new THREE.SphereGeometry(r, 48, 32)), toon(0xffffff, { map: tex })); s.position.y = o.y ?? r; g.add(s);
  g.userData = { focus: o.y ?? r, size: r * 2.6, spin: s }; return g;
};
PROPS.text = (o) => { // letras flotantes (para títulos dentro de la escena)
  const g = new THREE.Group(), w = o.w || 2, h = o.h || .6;
  const lines = Array.isArray(o.text) ? o.text : String(o.text).split('\n');
  const tex = canvasTex(Math.round(512 * w / h), 512, (ctx, W, H) => {
    ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => { fitText(ctx, ln, W * .94, H / lines.length * .82); const y = H / lines.length * (i + .5); ctx.lineWidth = H * .07 / lines.length; ctx.strokeStyle = '#1d1515'; ctx.strokeText(ln, W / 2, y); ctx.fillStyle = o.color || '#fff'; ctx.fillText(ln, W / 2, y); });
  });
  const p = panel(w, h, tex, { unlit: true, transparent: true }); p.position.y = o.y ?? 1; g.add(p);
  g.userData = { focus: o.y ?? 1, size: w }; return g;
};
PROPS.crate = (o) => { const g = new THREE.Group(); const s = o.s || .5; const b = box(s, s, s, o.color || '#b8864f', { r: .02 }); b.position.y = s / 2; g.add(b); g.userData = { focus: s / 2, size: s * 1.5 }; return g; };
PROPS.bench = (o) => {
  const g = new THREE.Group(), w = o.w || 1.4, col = o.color || '#8a5a36';
  const seat = box(w, .05, .4, col); seat.position.y = .3; g.add(seat);
  const back = box(w, .3, .05, col); back.position.set(0, .5, -.19); g.add(back);
  for (const s of [-1, 1]) { const l = box(.05, .3, .38, '#3b4048'); l.position.set(s * (w / 2 - .1), .15, 0); g.add(l); }
  g.userData = { focus: .4, size: w }; return g;
};
PROPS.phone = (o) => {
  const g = new THREE.Group(); const b = box(.16, .3, .025, '#222', { r: .02, thick: .004 }); b.position.y = o.y ?? 0; g.add(b);
  const tp = propTextPlane(g, .14, .26, .014, (ctx, W, H) => { ctx.fillStyle = o.bg || '#2a7de1'; ctx.fillRect(0, 0, W, H); if (o.text) { ctx.fillStyle = '#fff'; drawLines(ctx, String(o.text).split('\n'), W * .9, H * .8, '#fff', H * .16); } }, 512, { unlit: true });
  tp.plane.position.y = o.y ?? 0; g.userData = { focus: o.y ?? 0, size: .5 }; return g;
};
PROPS.tv = (o) => {
  const g = new THREE.Group(); const b = box(.9, .62, .5, '#5a4a3e', { r: .05 }); b.position.y = (o.y ?? .4) + .31; g.add(b);
  const tp = propTextPlane(g, .7, .48, .26, (ctx, W, H) => { ctx.fillStyle = o.bg || '#7fd0ff'; ctx.fillRect(0, 0, W, H); if (o.text) drawLines(ctx, String(o.text).split('\n'), W * .9, H * .8, o.fg || '#1f1a17', H * .3); }, 512, { unlit: true });
  tp.plane.position.y = (o.y ?? .4) + .31; tp.plane.position.x = -.06;
  g.userData = { focus: (o.y ?? .4) + .3, size: 1.2 }; return g;
};

// ---------------------------------------------------------------- sets
function skyTexture(top, bottom) {
  return canvasTex(16, 512, (ctx, W, H) => { const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); });
}
const TIMES = {
  day: { sky: ['#7fc0ee', '#d7ecf7'], hemi: ['#d6ecff', '#8a7a62', 1.5], sun: ['#fff1dc', 2.6, [4, 8, 5]], fog: '#cfe4f0', win: '#9fc8e6', lit: false },
  dawn: { sky: ['#2b3a78', '#f2a07a'], hemi: ['#8c9be0', '#5a4058', 1.25], sun: ['#ffb27a', 2.2, [-6, 3, 4]], fog: '#b98d9a', win: '#ffd27a', lit: true },
  night: { sky: ['#0d1430', '#2c3a6a'], hemi: ['#5468a8', '#2a2440', 1.0], sun: ['#a8b8ff', 1.1, [3, 8, 4]], fog: '#26305a', win: '#ffd27a', lit: true },
  indoor: { sky: ['#cfe8f6', '#eef6fb'], hemi: ['#fff4e4', '#8a7060', 1.4], sun: ['#ffe8c8', 2.3, [3, 6, 6]], fog: null, win: '#bfe3f7', lit: false },
};
function addLights(scene, T, o = {}) {
  const hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]); scene.add(hemi);
  const sun = new THREE.DirectionalLight(T.sun[0], T.sun[1]);
  sun.position.set(...T.sun[2]); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const ext = o.shadowExt || 9; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .5, far: 40 });
  sun.shadow.bias = -.0015; sun.shadow.normalBias = .045; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target); scene.userData.sun = sun;
  if (T.fog) scene.fog = new THREE.Fog(T.fog, o.fogNear || 14, o.fogFar || 38);
  scene.background = skyTexture(...T.sky);
}
function building(w, h, d, col, T, R) {
  const g = new THREE.Group();
  const b = box(w, h, d, col, { r: .04 }); b.position.y = h / 2; g.add(b);
  const top = box(w + .1, .12, d + .1, '#e8e0d0', { r: .03 }); top.position.y = h; g.add(top);
  const cols = Math.max(1, Math.floor(w / .7)), rows = Math.max(1, Math.floor((h - 1) / .9));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const lit = T.lit && R() < .45;
    const wm = toon(lit ? T.win : '#3c4e66', { emissive: lit ? T.win : 0, ei: .9 });
    const win = box(.34, .46, .04, null, { mat: wm, r: .02, thick: .005 });
    win.position.set((i - (cols - 1) / 2) * (w / cols), 1.2 + j * .9, d / 2 + .01); g.add(win);
  }
  const door = box(.44, .8, .04, '#5a3b2a', { r: .02 }); door.position.set(0, .4, d / 2 + .01); g.add(door);
  return g;
}
const SETS = {};
SETS.street = (o, scene) => {
  const T = TIMES[o.time || 'day']; addLights(scene, T, o); const R = rng(o.seed || 'street');
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon(o.ground || '#9aa0a6')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = box(60, .02, 3.2, '#4a4d55', { outline: false, r: .005 }); road.position.y = .01; scene.add(road);
  for (let x = -30; x < 30; x += 1.6) { const m = box(.8, .012, .1, o.center || '#f2f2f2', { outline: false, r: .004 }); m.position.set(x, .025, 0); scene.add(m); }
  for (const z of [-1.5, 1.5]) { const e = box(60, .012, .07, '#f2f2f2', { outline: false, r: .004 }); e.position.set(0, .025, z); scene.add(e); }
  for (const z of [-2.3, 2.3]) { const sw = box(60, .1, 1.4, '#c9c6bf', { outline: false, r: .01 }); sw.position.set(0, .05, z); scene.add(sw); }
  const pal = o.palette || ['#c2654c', '#e2c290', '#6aa3a0', '#d98c5f', '#8fa7c9', '#b9b07a', '#d6a2a8'];
  let x = -22;
  while (x < 22) { const w = 2 + R() * 1.6, h = 2.6 + R() * 3.2; const bd = building(w, h, 2, pal[Math.floor(R() * pal.length)], T, R); bd.position.set(x + w / 2, 0, -4.2); scene.add(bd); x += w + .05; }
  if (o.both) { x = -22; while (x < 22) { const w = 2 + R() * 1.6, h = 2.6 + R() * 3.2; const bd = building(w, h, 2, pal[Math.floor(R() * pal.length)], T, R); bd.position.set(x + w / 2, 0, 4.2); bd.rotation.y = Math.PI; scene.add(bd); x += w + .05; } }
  for (let lx = -18; lx <= 18; lx += 4.5) { const l = PROPS.lamp({ on: T.lit, h: 2.3 }); l.position.set(lx, 0, -2.75); l.rotation.y = -Math.PI / 2; scene.add(l); }
  return { floor: 0 };
};
SETS.road = (o, scene) => { // carretera en el campo
  const T = TIMES[o.time || 'day']; addLights(scene, T, o); const R = rng(o.seed || 'road');
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), toon(o.grass || '#8cc06a')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = box(70, .02, 3.2, '#4a4d55', { outline: false, r: .005 }); road.position.y = .01; scene.add(road);
  for (let x = -35; x < 35; x += 1.6) { const m = box(.8, .012, .1, '#f2f2f2', { outline: false, r: .004 }); m.position.set(x, .025, 0); scene.add(m); }
  for (const z of [-1.5, 1.5]) { const e = box(70, .012, .07, '#f2f2f2', { outline: false, r: .004 }); e.position.set(0, .025, z); scene.add(e); }
  for (let i = 0; i < 46; i++) { const z = -(3 + R() * 14), x = -24 + R() * 48; const t = (R() < .5 ? PROPS.pine : PROPS.tree)({ s: .9 + R() * .7 }); t.position.set(x, 0, z); scene.add(t); }
  for (let i = 0; i < 6; i++) { const h = mesh(G(`hill${i}`, () => new THREE.SphereGeometry(6 + i, 32, 16)), '#76ad5a', { outline: false }); h.scale.y = .35; h.position.set(-30 + i * 12, -1, -22 - (i % 2) * 4); scene.add(h); }
  return { floor: 0 };
};
SETS.room = (o, scene) => {
  const T = TIMES.indoor; addLights(scene, T, { shadowExt: 6 });
  const wall = o.wall || '#e9d8b8', floor = o.floor || '#b0784c';
  const f = box(9, .1, 7, floor, { outline: false, r: .01 }); f.position.y = -.05; scene.add(f);
  const bw = box(9, 3.6, .14, wall, { outline: false, r: .01 }); bw.position.set(0, 1.8, -2.6); scene.add(bw);
  const sw = box(.14, 3.6, 7, o.wall2 || wall, { outline: false, r: .01 }); sw.position.set(-3.6, 1.8, .9); scene.add(sw);
  const base = box(9, .14, .05, '#f4efe4', { r: .01 }); base.position.set(0, .07, -2.52); scene.add(base);
  const win = new THREE.Group(); const fr = box(1.4, 1.2, .08, '#f4efe4', { r: .03 }); win.add(fr);
  const gl = box(1.2, 1.0, .02, null, { mat: toon(o.windowColor || T.win, { emissive: o.windowColor || T.win, ei: .5 }), outline: false }); gl.position.z = .04; win.add(gl);
  const mu = box(.05, 1.0, .03, '#f4efe4', { outline: false }); mu.position.z = .06; win.add(mu); const mu2 = box(1.2, .05, .03, '#f4efe4', { outline: false }); mu2.position.z = .06; win.add(mu2);
  win.position.set(1.6, 1.85, -2.5); scene.add(win);
  if (o.sofa !== false) {
    const s = new THREE.Group(), sc = o.sofaColor || '#4f8a6b';
    const seat = box(2.0, .32, .8, sc, { r: .08 }); seat.position.y = .26; s.add(seat);
    const back = box(2.0, .6, .22, sc, { r: .08 }); back.position.set(0, .6, -.32); s.add(back);
    for (const k of [-1, 1]) { const arm = box(.22, .48, .8, sc, { r: .08 }); arm.position.set(k * 1.0, .4, 0); s.add(arm); }
    s.position.set(-1.0, 0, -1.9); scene.add(s);
  }
  const rug = mesh(G('rug', () => new THREE.CylinderGeometry(1.6, 1.6, .02, 40)), o.rug || '#c9604a', { outline: false }); rug.scale.z = .6; rug.position.set(0, .01, -.4); scene.add(rug);
  const pic = new THREE.Group(); const pf = box(.8, .6, .05, '#6b4a33', { r: .02 }); pic.add(pf);
  const pp = box(.66, .46, .02, '#7fb0d8', { outline: false }); pp.position.z = .025; pic.add(pp); pic.position.set(-1.0, 2.0, -2.5); scene.add(pic);
  const plant = new THREE.Group(); const pot = cyl(.17, .13, .32, '#c46a3b'); pot.position.y = .16; plant.add(pot);
  for (const [x, y, z] of [[0, .5, 0], [.1, .62, .05], [-.1, .58, -.03]]) { const b = sph(.17, '#4f9a4a'); b.position.set(x, y, z); plant.add(b); }
  plant.position.set(2.8, 0, -2.0); scene.add(plant);
  if (o.lamp !== false) { const l = new THREE.Group(); const p = cyl(.025, .04, 1.5, '#3b3030'); p.position.y = .75; l.add(p); const sh = mesh(G('fshade', () => new THREE.CylinderGeometry(.16, .26, .3, 24, 1, true)), '#f0d9a8', { outline: true }); sh.material = toon('#f0d9a8', { emissive: '#ffd98a', ei: .5 }); sh.position.y = 1.55; l.add(sh); l.position.set(.6, 0, -2.1); scene.add(l); }
  return { floor: 0 };
};
SETS.office = (o, scene) => {
  const r = SETS.room(Object.assign({ wall: '#cfd9e0', floor: '#8e7f72', sofa: false, rug: '#5a6e8a', lamp: false }, o), scene);
  const desk = PROPS.table({ w: 1.8, d: .8, h: .45, color: '#6b4a33' }); desk.position.set(0, 0, -.9); scene.add(desk);
  const shelf = new THREE.Group(); const sb = box(1.2, 2.0, .35, '#7a5a40', { r: .02 }); sb.position.y = 1.0; shelf.add(sb);
  const R = rng('books'); const pal = ['#c64b3b', '#3f6fb5', '#e0b84a', '#4f9a6a', '#7d4fa0'];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) { const bk = box(.11, .32 + R() * .06, .25, pal[Math.floor(R() * 5)], { r: .01, thick: .004 }); bk.position.set(-.45 + i * .15, .25 + j * .47, .06); shelf.add(bk); }
  shelf.position.set(-2.6, 0, -2.3); scene.add(shelf);
  return r;
};
SETS.studio = (o, scene) => { // ciclorama de un color, para números y objetos héroe
  const T = TIMES.indoor; addLights(scene, Object.assign({}, T, { fog: null }), { shadowExt: 6 });
  const col = o.color || '#e8d9c2';
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon(col)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  const c = new THREE.Color(col); const top = '#' + c.clone().multiplyScalar(.82).getHexString();
  scene.background = skyTexture(o.back || top, col); scene.fog = new THREE.Fog(col, 7, 22);
  return { floor: 0 };
};
SETS.space = (o, scene) => {
  addLights(scene, { hemi: ['#8090c0', '#202030', .9], sun: ['#fff', 2.6, [5, 3, 6]], sky: ['#05060f', '#141a3a'] });
  const stars = new THREE.BufferGeometry(); const R = rng('stars'), pts = [];
  for (let i = 0; i < 1500; i++) { const v = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(60); pts.push(v.x, v.y, v.z); }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: .25 })));
  if (o.earth !== false) { const e = PROPS.globe({ r: 8, y: -9 }); e.position.set(0, 0, -6); scene.add(e); }
  return { floor: null };
};

// ---------------------------------------------------------------- escenas, cámara y fotograma
let R3, CAM, OUT, OUTCTX, TL, STORY;
const SCENES = new Map();
function buildScene(id) {
  const spec = STORY.scenes[id];
  const scene = new THREE.Scene();
  SETS[spec.set?.type || 'studio'](spec.set || {}, scene);
  const objs = {};
  for (const a of spec.actors || []) {
    const ch = new Character(a, STORY); objs[a.id] = { kind: 'char', obj: ch, spec: a };
    scene.add(ch.root);
  }
  for (const p of spec.props || []) {
    const g = PROPS[p.type](p);
    g.position.set(...(p.pos || [0, 0, 0])); g.rotation.y = (p.rot || 0) * D2R; if (p.rx) g.rotation.x = p.rx * D2R; if (p.rz) g.rotation.z = p.rz * D2R;
    if (p.scale) g.scale.setScalar(p.scale);
    g.userData.baseScale = p.scale || 1;
    objs[p.id] = { kind: 'prop', obj: g, spec: p };
    scene.add(g);
  }
  // personajes dentro de coches
  for (const a of spec.actors || []) if (a.in) { const car = objs[a.in].obj; const ch = objs[a.id].obj; car.add(ch.root); ch.spec = Object.assign({}, a, { pos: car.userData.driverPos, sit: true, rot: a.rot ?? 90 }); }
  return { scene, objs, spec };
}
function getScene(id) { if (!SCENES.has(id)) SCENES.set(id, buildScene(id)); return SCENES.get(id); }

function updateProp(P, acts, t) {
  const g = P.obj, spec = P.spec, u = g.userData;
  let pos = (spec.pos || [0, 0, 0]).slice(), ry = spec.rot || 0, vis = !spec.hidden, sc = 1;
  for (const a of acts) {
    if (a.t > t) break;
    if (a.move) { const p = clamp((t - a.t) / (a.dur ?? 1), 0, 1); const e = a.ease === 'linear' ? p : a.ease === 'out' ? easeOut(p) : easeInOut(p); const to = a.move.length === 2 ? [a.move[0], pos[1], a.move[1]] : a.move; pos = pos.map((v, i) => lerp(v, to[i], e)); }
    if (a.turn != null) { const p = clamp((t - a.t) / (a.dur ?? .4), 0, 1); ry = lerp(ry, a.turn, easeInOut(p)); }
    if (a.pop) { vis = true; const p = clamp((t - a.t) / .3, 0, 1); sc = easeOutBack(p, 2.2); }
    if (a.hide) vis = false;
    if (a.show) { vis = true; sc = 1; }
  }
  g.visible = vis; g.position.set(...pos); g.rotation.y = ry * D2R; g.scale.setScalar(Math.max(.001, sc) * u.baseScale);
  // valores animados
  const va = acts.filter(a => a.value != null);
  const valAt = (from) => { let v = from; for (const a of va) { if (a.t > t) break; const p = clamp((t - a.t) / (a.dur ?? 1), 0, 1); v = lerp(v, a.value, a.ease === 'back' ? easeOutBack(p, 1.6) : easeOut(p)); } return v; };
  if (u.led) { let v = valAt(spec.value ?? 0); if (va.length && t >= va[va.length - 1].t + (va[va.length - 1].dur ?? 1)) v = va[va.length - 1].value; drawLed(u.led, v); }
  if (u.needle) { const v = valAt(spec.value ?? 0); u.needle.rotation.z = -((-225 + clamp(v, 0, 100) * 2.7) * D2R + Math.PI / 2); }
  if (u.clock) {
    let m = parseHM(spec.time || '12:00');
    for (const a of acts) { if (a.t > t || !a.time) continue; const p = clamp((t - a.t) / (a.dur ?? 1), 0, 1); m = lerp(m, parseHM(a.time), easeInOut(p)); }
    u.clock.mh.rotation.z = -(m % 60) / 60 * Math.PI * 2; u.clock.hh.rotation.z = -((m / 60) % 12) / 12 * Math.PI * 2;
  }
  if (u.paper) { const st = acts.some(a => a.stamp && a.t <= t); if (st !== u.paper.stamped) { u.paper.stamped = st; u.paper.draw(st); } }
  if (u.flag) {
    const pa = u.flag.geom.attributes.position, b = u.flag.base;
    for (let i = 0; i < pa.count; i++) { const x = b[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 6 - t * 7) * .06 * x; }
    pa.needsUpdate = true; u.flag.geom.computeVertexNormals();
  }
  if (u.spin && spec.spin) u.spin.rotation.y = t * spec.spin;
  for (const a of acts) { if (a.spin && a.t <= t) g.rotation.y = ry * D2R + (t - a.t) * a.spin; }
}

function objFocus(S, id) {
  const o = S.objs[id]; if (!o) throw new Error('no existe ' + id);
  const wp = new THREE.Vector3(); o.obj.root ? o.obj.root.getWorldPosition(wp) : o.obj.getWorldPosition(wp);
  if (o.kind === 'char') return { p: wp, h: o.obj.height(), head: o.obj.headY(), char: true };
  return { p: wp, h: (o.obj.userData.focus || .5) * (o.obj.userData.baseScale || 1), size: (o.obj.userData.size || 1) * (o.obj.userData.baseScale || 1) };
}
const SHOTS = { face: [1.35, 'head'], close: [1.8, 'head'], medium: [2.8, 'chest'], full: [3.8, 'mid'], wide: [6.5, 'mid'], xwide: [11, 'mid'] };
function camState(S, c, p) {
  // c: {on, shot, yaw, pitch, dist, fov, dx, dy, move, target, pos}
  const lerpField = (k, def) => { const a = c[k] ?? def; const b = c.to?.[k] ?? a; return lerp(a, b, p); };
  let target, dist;
  if (c.target) target = v3(c.target).lerp(v3(c.to?.target || c.target), p);
  else {
    const ids = Array.isArray(c.on) ? c.on : [c.on];
    const fs = ids.map(id => objFocus(S, id));
    const cen = fs.reduce((a, f) => a.add(f.p), new THREE.Vector3()).multiplyScalar(1 / fs.length);
    const f0 = fs[0], kind = SHOTS[c.shot || 'medium'];
    let y;
    if (f0.char) { y = kind[1] === 'head' ? f0.head : kind[1] === 'chest' ? f0.head * .8 : f0.h * .55; dist = kind[0] * Math.max(1, f0.h); }
    else { y = f0.h; dist = f0.size / .344 * ({ face: .75, close: 1.0, medium: 1.3, full: 1.7, wide: 2.5, xwide: 4 }[c.shot || 'medium'] ?? 1.3); }
    if (fs.length > 1) { const spread = Math.max(...fs.map(f => f.p.distanceTo(cen))); dist = Math.max(dist, (spread * 2 + 1.2) / .344); }
    target = new THREE.Vector3(cen.x, cen.y + y, cen.z);
  }
  dist = lerpField('dist', dist ?? 3) * (c.distMul ?? 1);
  const mv = c.move || 'drift';
  const mk = { drift: [.92, 4, 0, 0], push: [.78, 0, 0, 0], pull: [1.22, 0, 0, 0], orbitL: [.96, -14, 0, 0], orbitR: [.96, 14, 0, 0], rise: [.95, 0, 9, .15], fall: [1.0, 0, -8, -.1], pan: [1, 10, 0, 0], hold: [.985, 0, 0, 0], crash: [.55, 0, 0, 0] }[mv] || [.92, 4, 0, 0];
  const e = mv === 'crash' ? easeOut(p) : easeInOut(p);
  dist *= lerp(1, mk[0], e);
  const yaw = (c.yaw ?? 0) + mk[1] * e + (c.to?.yaw != null ? (c.to.yaw - (c.yaw ?? 0)) * p : 0);
  const pitch = (c.pitch ?? 8) + mk[2] * e + (c.to?.pitch != null ? (c.to.pitch - (c.pitch ?? 8)) * p : 0);
  target.x += lerpField('dx', 0); target.y += lerpField('dy', 0) + mk[3] * e; target.z += lerpField('dz', 0);
  const pos = c.pos ? v3(c.pos).lerp(v3(c.to?.pos || c.pos), e) : new THREE.Vector3(
    target.x + dist * Math.sin(yaw * D2R) * Math.cos(pitch * D2R),
    target.y + dist * Math.sin(pitch * D2R),
    target.z + dist * Math.cos(yaw * D2R) * Math.cos(pitch * D2R));
  return { pos, target, fov: lerpField('fov', 34), roll: lerpField('roll', 0) };
}

function drawCaption(t) {
  const W = OUT.width, H = OUT.height;
  const cap = TL.captions.find(c => t >= c.t0 && t < c.t1);
  if (!cap) return;
  const p = clamp((t - cap.t0) / .12, 0, 1), s = lerp(.82, 1, easeOutBack(p, 2.5));
  const ctx = OUTCTX; const size = Math.round(H * .045);
  ctx.save(); ctx.translate(W / 2, H * (TL.captionY || .7)); ctx.scale(s, s);
  ctx.font = `900 ${size}px Montserrat`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let txt = cap.text; while (ctx.measureText(txt).width > W * .86 && ctx.font) { ctx.font = `900 ${Math.round(size * .9)}px Montserrat`; break; }
  ctx.lineJoin = 'round'; ctx.lineWidth = size * .26; ctx.strokeStyle = '#141010'; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = cap.hl ? '#ffd43b' : '#ffffff'; ctx.fillText(txt, 0, 0);
  ctx.restore();
}
function grade() {
  const W = OUT.width, H = OUT.height, ctx = OUTCTX;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,5,15,.32)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

window.init = async (timeline) => {
  TL = timeline; STORY = timeline.story;
  await document.fonts.load('900 40px Montserrat'); await document.fonts.load('800 40px Montserrat');
  const W = timeline.width, H = timeline.height;
  R3 = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  R3.setSize(W, H); R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
  R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.05;
  CAM = new THREE.PerspectiveCamera(34, W / H, .05, 200);
  OUT = document.createElement('canvas'); OUT.width = W; OUT.height = H; OUTCTX = OUT.getContext('2d');
  document.body.appendChild(OUT);
  // agrupa acciones por objetivo
  TL.byTarget = {};
  for (const a of TL.actions) (TL.byTarget[a.target] ||= []).push(a);
  for (const k in TL.byTarget) TL.byTarget[k].sort((a, b) => a.t - b.t);
  return 'ok';
};
window.renderFrame = (i, quality = .9) => {
  const t = i / TL.fps;
  let shot = TL.shots.find(s => t >= s.t0 && t < s.t1) || TL.shots[TL.shots.length - 1];
  const S = getScene(shot.scene);
  const p = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1);
  // la cámara se calcula antes que los personajes para que puedan mirarla
  for (const [id, o] of Object.entries(S.objs)) if (o.kind === 'prop') updateProp(o, TL.byTarget[`${shot.scene}.${id}`] || [], t);
  const c = camState(S, shot.cam, p);
  CAM.position.copy(c.pos); CAM.fov = c.fov; CAM.updateProjectionMatrix(); CAM.lookAt(c.target); CAM.rotation.z += c.roll * D2R;
  for (const [id, o] of Object.entries(S.objs)) if (o.kind === 'char') updateCharacter(o.obj, TL.byTarget[`${shot.scene}.${id}`] || [], t, CAM);
  const sun = S.scene.userData.sun; if (sun) { const off = v3(sun.position.toArray()).sub(sun.target.position); sun.target.position.copy(c.target); sun.position.copy(c.target).add(off); }
  R3.render(S.scene, CAM);
  OUTCTX.drawImage(R3.domElement, 0, 0);
  grade();
  drawCaption(t);
  return OUT.toDataURL('image/jpeg', quality);
};
window.engineReady = true;
