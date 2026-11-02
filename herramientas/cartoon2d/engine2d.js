// Motor 2D: escenas SVG + cámara + acciones en el tiempo -> fotogramas JPEG.
import { drawCharacter, drawBack, CAST } from './estilo.js';
import { EXPR, POSE } from './expr.js';
import * as BG from './fondos.js';
import { PROPS } from './props.js';

let TL, CV, CTX, FONTCSS = '';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function noise(t, seed) { const i = Math.floor(t), f = t - i, a = hash(seed + ':' + i), b = hash(seed + ':' + (i + 1)); return lerp(a, b, f * f * (3 - 2 * f)); }

// mezcla profunda con interpolación numérica
function blend(a, b, p) {
  if (typeof b === 'number' && typeof a === 'number') return lerp(a, b, p);
  if (Array.isArray(b)) return b.map((v, i) => blend(Array.isArray(a) ? a[i] : undefined, v, p));
  if (b && typeof b === 'object') { const o = { ...(a && typeof a === 'object' ? a : {}) }; for (const k in b) o[k] = blend(o[k], b[k], p); return o; }
  if (typeof b === 'number' && a == null) return b;
  return p < .5 && a !== undefined ? a : b;
}
const expandPose = p => typeof p === 'string' ? (POSE[p] || {}) : p || {};
const expandFace = f => typeof f === 'string' ? (EXPR[f] || {}) : f || {};
const FACE0 = { mouth: 0, browL: 0, browR: 0, browUp: [0, 0], look: [0, 0], lid: undefined, drunk: 0 };
const POSE0 = { armR: [6, -8], armL: [6, -8] };

// ---------------------------------------------------------------- actores
function actorState(sc, a, t) {
  let st = { x: a.x, y: a.y, s: a.s || 1, flip: a.flip ? -1 : 1, rot: a.rot || 0, alpha: 1,
    pose: { ...POSE0, ...expandPose(a.pose) }, face: { ...FACE0, ...expandFace(a.expr), ...(a.face || {}) }, talk: [], walk: null, sway: a.sway || 0, head: { tilt: 0, dx: 0, dy: 0 } };
  const key = `${sc}.${a.id}`;
  for (const ac of TL.actions) {
    if (ac.target !== key || ac.t > t) continue;
    const d = ac.dur ?? .3, p = ease(clamp((t - ac.t) / Math.max(.001, d), 0, 1));
    if (ac.pose) st.pose = blend(st.pose, { ...POSE0, ...expandPose(ac.pose), ...(ac.keepArms ? {} : {}) }, p);
    if (ac.arms) st.pose = blend(st.pose, expandPose(ac.arms), p);
    if (ac.expr || ac.face) st.face = blend(st.face, { ...FACE0, ...expandFace(ac.expr), ...(ac.face || {}) }, p);
    if (ac.look != null) st.face = blend(st.face, { look: ac.look }, p);
    if (ac.move) {
      const md = ac.move.dur ?? 1, mp = clamp((t - ac.t) / md, 0, 1), e = ac.move.linear ? mp : ease(mp);
      const from = { x: st.x, y: st.y, s: st.s };
      st.x = lerp(from.x, ac.move.x ?? from.x, e); st.y = lerp(from.y, ac.move.y ?? from.y, e); st.s = lerp(from.s, ac.move.s ?? from.s, e);
      if (ac.move.walk !== false && mp < 1) st.walk = (t - ac.t) * 9;
    }
    if (ac.flip != null && t >= ac.t) st.flip = ac.flip ? -1 : 1;
    if (ac.talk) st.talk.push([ac.t, ac.t + ac.talk]);
    if (ac.sway != null) st.sway = lerp(st.sway, ac.sway, p);
    if (ac.hide) st.alpha = 1 - p; if (ac.show) st.alpha = p;
    if (ac.jolt) { const k = t - ac.t; if (k < .5) st.head.dy -= Math.sin(k / .5 * Math.PI) * 18 * (ac.jolt === true ? 1 : ac.jolt); }
    if (ac.nod) { const k = t - ac.t; if (k < .6) st.head.tilt += Math.sin(k / .6 * Math.PI * 2) * 4; }
    if (ac.rot != null) st.rot = lerp(st.rot, ac.rot, p);
  }
  // vida: respiración, parpadeo, habla, mareo
  const seed = key;
  const talking = st.talk.some(([a0, a1]) => t >= a0 && t < a1);
  if (talking) {
    const m = .12 + .75 * Math.abs(Math.sin(t * 13 + hash(seed) * 6)) * (.55 + .45 * noise(t * 5, seed));
    st.face.mouth = Math.max(st.face.mouth || 0, m);
    st.head.tilt += Math.sin(t * 3.1 + hash(seed) * 9) * 2.2; st.head.dy += Math.sin(t * 6.3) * 2;
  }
  const bp = hash(seed + 'b') * 4, cyc = 3.2 + hash(seed + 'c') * 1.6, ph = ((t + bp) % cyc) / cyc;
  if (ph > .955) st.face.open = Math.min(st.face.open ?? 1, Math.abs(ph - .9775) / .0225);
  st.head.tilt += (noise(t * .7, seed + 'h') - .5) * 3;
  st.head.dx += (noise(t * .5, seed + 'x') - .5) * 3;
  if (st.sway) { st.rot += Math.sin(t * 2.2) * 3.2 * st.sway; st.head.tilt += Math.sin(t * 2.2 + 1) * 6 * st.sway; st.x += Math.sin(t * 1.1) * 14 * st.sway; }
  st.breath = Math.sin(t * 2.4 + hash(seed) * 6) * 3;
  if (st.walk != null) st.bob = Math.abs(Math.sin(st.walk)) * -10; else st.bob = 0;
  return st;
}
function drawActor(sc, a, t) {
  const st = actorState(sc, a, t);
  if (st.alpha <= 0.01) return '';
  const pose = { ...st.pose, head: { ...(st.pose.head || {}), tilt: (st.pose.head?.tilt || 0) + st.head.tilt, dx: (st.pose.head?.dx || 0) + st.head.dx, dy: (st.pose.head?.dy || 0) + st.head.dy }, face: st.face, walk: st.walk };
  const body = a.back ? drawBack(a.char, { tilt: st.head.tilt * .5 }) : drawCharacter(a.char, pose);
  return `<g opacity="${st.alpha.toFixed(3)}" transform="translate(${st.x.toFixed(1)} ${(st.y + st.bob).toFixed(1)}) rotate(${st.rot.toFixed(2)} 0 -300) scale(${(st.s * st.flip).toFixed(4)} ${(st.s * (1 + st.breath / 1200)).toFixed(4)})">${body}</g>`;
}

// ---------------------------------------------------------------- props
function propState(sc, p, t) {
  let st = { x: p.x, y: p.y, s: p.s ?? 1, rot: p.rot || 0, alpha: p.hidden ? 0 : 1, value: p.value, pop: 1, par: {} };
  const RES = new Set(['t', 'target', 'dur', 'value', 'pop', 'show', 'hide', 'drop', 'move', 'spin', 'shake', 'step', 'linear', 'vol', 'x', 'y', 's']);
  const key = `${sc}.${p.id}`;
  for (const ac of TL.actions) {
    if (ac.target !== key || ac.t > t) continue;
    const k = t - ac.t, d = ac.dur ?? .35, p_ = clamp(k / d, 0, 1);
    if (ac.pop) { st.alpha = 1; st.pop = easeOutBack(p_, 2.6); }
    if (ac.show) st.alpha = ease(p_);
    if (ac.hide) st.alpha = 1 - ease(p_);
    if (ac.drop) { st.alpha = 1; const h = ac.drop === true ? 700 : ac.drop; const pp = clamp(k / (ac.dur ?? .45), 0, 1); st.y = p.y - h * (1 - pp * pp) + (pp >= 1 ? -Math.max(0, Math.sin((k - (ac.dur ?? .45)) * 18) * 30 * Math.exp(-(k - (ac.dur ?? .45)) * 7)) : 0); }
    const pe = ac.linear ? p_ : ease(p_);
    if (ac.value != null) st.value = lerp(st.value ?? 0, ac.value, ac.step ? (p_ >= 1 ? 1 : 0) : pe);
    for (const k in ac) if (!RES.has(k) && typeof ac[k] === 'number') st.par[k] = lerp(st.par[k] ?? p[k] ?? 0, ac[k], pe);
    if (ac.move) { const e = ease(clamp(k / (ac.move.dur ?? 1), 0, 1)); st.x = lerp(st.x, ac.move.x ?? st.x, e); st.y = lerp(st.y, ac.move.y ?? st.y, e); st.s = lerp(st.s, ac.move.s ?? st.s, e); }
    if (ac.spin) st.rot += k * ac.spin;
    if (ac.shake) { if (k < .5) st.rot += Math.sin(k * 60) * 6 * (1 - k / .5); }
  }
  return st;
}
function drawProp(sc, p, t) {
  const st = propState(sc, p, t);
  if (st.alpha <= .01) return '';
  const fn = PROPS[p.type]; if (!fn) return '';
  return `<g opacity="${st.alpha.toFixed(3)}" transform="translate(${st.x} ${st.y}) rotate(${st.rot}) scale(${(st.s * st.pop).toFixed(4)})">${fn({ ...p, ...st.par, value: st.value, t })}</g>`;
}

// ---------------------------------------------------------------- cámara
const SHOTZ = { face: 3.3, close: 2.5, medium: 1.85, full: 1.12, wide: 1 };
function actorAnchor(scName, id, t) {
  const sc = TL.story.scenes[scName], a = sc.actors.find(x => x.id === id);
  const st = actorState(scName, a, t);
  const c = CAST[a.char];
  return { x: st.x, y: st.y + (c.headY * c.scale) * st.s, s: st.s * c.scale };
}
function camBase(shot, t) {
  const c = shot.cam || {};
  let x = c.x ?? 540, y = c.y ?? 960, z = c.z ?? 1;
  if (c.on) {
    const ids = [].concat(c.on);
    const an = ids.map(id => actorAnchor(shot.scene, id, c.track ? t : shot.t0 + .01));
    const ax = an.reduce((s, a) => s + a.x, 0) / an.length, ay = an.reduce((s, a) => s + a.y, 0) / an.length, as = an[0].s;
    z = (SHOTZ[c.shot || 'close'] || 2) / as * (c.zk || 1);
    if (an.length > 1) { const span = Math.max(...an.map(a => a.x)) - Math.min(...an.map(a => a.x)); z = Math.max(1, Math.min(z, 1080 * .78 / (span + 260 * as))); }
    const faceFrac = { face: .42, close: .38, medium: .33, full: .26, wide: .3 }[c.shot || 'close'];
    x = ax + (c.dx || 0); y = ay + (0.5 - faceFrac) * 1920 / z + (c.dy || 0);
  }
  z = Math.max(z, 1);
  return { x, y, z };
}
function camState(shot, t) {
  const c = shot.cam || {}, d = shot.t1 - shot.t0, p = clamp((t - shot.t0) / d, 0, 1), e = ease(p);
  let { x, y, z } = camBase(shot, t);
  const mv = c.move || 'drift', amt = c.amt ?? 1;
  const k = { push: [0, 0, .12], pull: [0, 0, -.1], drift: [22, -10, .04], panL: [-70, 0, .02], panR: [70, 0, .02], rise: [0, -60, .02], fall: [0, 60, .02], hold: [0, 0, 0], crash: [0, 0, .3] }[mv] || [0, 0, 0];
  if (mv === 'crash') { const q = easeOut(clamp(p * 4, 0, 1)); z *= 1 + k[2] * q * amt; }
  else { x += k[0] * amt * (e - .5) / z * 2; y += k[1] * amt * (e - .5) / z * 2; z *= 1 + k[2] * amt * (mv === 'pull' ? (1 - e) : e); }
  if (c.to) { x = lerp(x, c.to.x ?? x, e); y = lerp(y, c.to.y ?? y, e); z = lerp(z, c.to.z ?? z, e); }
  // golpe de zoom al inicio de cada plano
  const punch = c.punch ?? .035; z *= 1 + punch * Math.exp(-(t - shot.t0) * 9);
  // sacudida
  let sx = 0, sy = 0;
  for (const s of TL.shakes || []) { const k2 = t - s.t; if (k2 >= 0 && k2 < (s.dur || .45)) { const a = (s.amp || 14) * (1 - k2 / (s.dur || .45)); sx += Math.sin(k2 * 71) * a; sy += Math.cos(k2 * 59) * a; } }
  if (c.handheld !== false) { sx += (noise(t * .8, 'hx') - .5) * 6; sy += (noise(t * .8, 'hy') - .5) * 6; }
  return { x, y, z, sx, sy };
}

// ---------------------------------------------------------------- escena
function sceneParts(shot, t) {
  const sc = TL.story.scenes[shot.scene];
  const cam = camState(shot, t);
  const par = sc.parallax ?? .55;
  const bz = Math.max(1.03, 1 + (cam.z - 1) * par);
  const hw = 540 / bz, hh = 960 / bz;
  const bx = clamp(540 + (cam.x - 540) * par, hw, 1080 - hw), by = clamp(960 + (cam.y - 960) * par, hh, 1920 - hh);
  const fgT = `translate(${540 + cam.sx} ${960 + cam.sy}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`;
  let items = [...(sc.actors || []).map(a => ({ z: a.z ?? 0, draw: () => drawActor(shot.scene, a, t) })), ...(sc.props || []).map(p => ({ z: p.z ?? 1, draw: () => drawProp(shot.scene, p, t) }))];
  items.sort((a, b) => a.z - b.z);
  const back = items.filter(i => i.z < 50).map(i => i.draw()).join('');
  const front = items.filter(i => i.z >= 50).map(i => i.draw()).join('');
  const filt = sc.sepia ? ' filter="url(#sepia)"' : '';
  const fg = `<g${filt}><g transform="${fgT}">${back}</g><g transform="${fgT}"${front ? ' filter="url(#b2)"' : ''}>${front}</g></g>`;
  return { sc, fg, bz, bx, by, sx: cam.sx, sy: cam.sy };
}
const BGCACHE = {};
const bgKey = sc => sc.bg + JSON.stringify(sc.bgOpts || {});
async function svgToCanvas(svg, w, h) {
  const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); return c;
}
async function prepBackgrounds() {
  for (const sc of Object.values(TL.story.scenes)) {
    const k = bgKey(sc); if (BGCACHE[k]) continue;
    const body = BG[sc.bg] ? BG[sc.bg](sc.bgOpts || {}, 0) : `<rect width="1080" height="1920" fill="${sc.bgColor || '#333'}"/>`;
    BGCACHE[k] = await svgToCanvas(`<svg xmlns="http://www.w3.org/2000/svg" width="1620" height="2880" viewBox="0 0 1080 1920">${FONTCSS}${BG.DEFS}${body}</svg>`, 1620, 2880);
  }
}
function canvasLight(sc) {
  const W = 1080, H = 1920, warm = sc.warm ?? .9, cool = sc.cool ?? .9;
  CTX.save(); CTX.globalCompositeOperation = 'soft-light';
  let g = CTX.createLinearGradient(0, 0, W, H); g.addColorStop(0, `rgba(255,207,138,${.6 * warm})`); g.addColorStop(.55, 'rgba(255,207,138,0)');
  CTX.fillStyle = g; CTX.fillRect(0, 0, W, H);
  CTX.globalCompositeOperation = 'multiply';
  g = CTX.createLinearGradient(0, 0, W, H); g.addColorStop(.45, 'rgba(34,52,94,0)'); g.addColorStop(1, `rgba(34,52,94,${.6 * cool})`);
  CTX.fillStyle = g; CTX.fillRect(0, 0, W, H);
  CTX.globalCompositeOperation = 'source-over';
  g = CTX.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.hypot(W, H) * .5 * .78 * 1.4);
  g.addColorStop(.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); CTX.fillStyle = g; CTX.fillRect(0, 0, W, H);
  CTX.restore();
}

function drawCaption(t) {
  const W = 1080, H = 1920, cap = TL.captions.find(c => t >= c.t0 && t < c.t1);
  if (!cap) return;
  const txt = cap.text.toLowerCase().replace(/^[.,;:…"«»¿¡!?]+|[.,;:…"«»]+$/g, '');
  if (!txt) return;
  const p = clamp((t - cap.t0) / .1, 0, 1), s = lerp(.85, 1, easeOutBack(p, 2.5));
  let size = Math.round(H * .072);
  CTX.save(); CTX.translate(W / 2, H * (TL.captionY || .7)); CTX.scale(s, s);
  CTX.font = `400 ${size}px Anton`;
  while (CTX.measureText(txt).width > W * .86 && size > 20) { size -= 4; CTX.font = `400 ${size}px Anton`; }
  CTX.textAlign = 'center'; CTX.textBaseline = 'middle'; CTX.lineJoin = 'round';
  CTX.lineWidth = size * .16; CTX.strokeStyle = '#141010'; CTX.strokeText(txt, 0, 0);
  CTX.fillStyle = '#fff'; CTX.fillText(txt, 0, 0);
  CTX.restore();
}
let NOISE;
function grain(frame) {
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256; const nc = NOISE.getContext('2d'), id = nc.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = hash('g' + i) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } nc.putImageData(id, 0, 0); }
  CTX.save(); CTX.globalCompositeOperation = 'overlay'; CTX.globalAlpha = .035; CTX.translate(-((frame * 37) % 256), -((frame * 91) % 256)); CTX.fillStyle = CTX.createPattern(NOISE, 'repeat'); CTX.fillRect(0, 0, 1080 + 256, 1920 + 256); CTX.restore();
}

async function b64(url) { const b = await (await fetch(url)).arrayBuffer(); let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); }
window.init = async (tl) => {
  TL = tl;
  CV = document.createElement('canvas'); CV.width = 1080; CV.height = 1920; CTX = CV.getContext('2d');
  document.body.appendChild(CV);
  const m = await b64('/node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2');
  const an = await b64('/node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2');
  FONTCSS = `<style>@font-face{font-family:'Montserrat';font-weight:800;src:url(data:font/woff2;base64,${m}) format('woff2');}@font-face{font-family:'Anton';font-weight:400;src:url(data:font/woff2;base64,${an}) format('woff2');}</style>`;
  await document.fonts.load('400 40px Anton');
  await prepBackgrounds();
};
function shotAt(t) { let s = TL.shots[0]; for (const x of TL.shots) if (t >= x.t0) s = x; return s; }
window.renderFrame = async (i, quality = .9) => {
  const t = i / TL.fps;
  const shot = shotAt(t);
  const P = sceneParts(shot, t);
  CTX.setTransform(1, 0, 0, 1, 0, 0); CTX.fillStyle = '#000'; CTX.fillRect(0, 0, 1080, 1920);
  CTX.save(); if (P.sc.sepia) CTX.filter = 'sepia(.85) saturate(.8)';
  CTX.translate(540 + P.sx, 960 + P.sy); CTX.scale(P.bz, P.bz); CTX.translate(-P.bx, -P.by);
  CTX.drawImage(BGCACHE[bgKey(P.sc)], 0, 0, 1080, 1920); CTX.restore();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${FONTCSS}${BG.DEFS}<defs><filter id="sepia"><feColorMatrix type="matrix" values=".45 .55 .2 0 0  .38 .5 .17 0 0  .3 .38 .14 0 0  0 0 0 1 0"/></filter></defs>${P.fg}</svg>`;
  const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  CTX.drawImage(img, 0, 0); URL.revokeObjectURL(url);
  if (P.sc.wobble) { const w = P.sc.wobble, k1 = Math.sin(t * 2.3) * w, k2 = Math.cos(t * 1.7) * w; if (!window._TMP) { window._TMP = document.createElement('canvas'); _TMP.width = 1080; _TMP.height = 1920; } const tc = _TMP.getContext('2d'); tc.clearRect(0, 0, 1080, 1920); tc.drawImage(CV, 0, 0); CTX.save(); CTX.translate(540, 960); CTX.transform(1 + k1, k2 * .3, -k2 * .3, 1 - k1, 0, 0); CTX.translate(-540, -960); CTX.drawImage(_TMP, -40, -60, 1160, 2040); CTX.restore(); }
  if (P.sc.tint) { CTX.save(); CTX.globalCompositeOperation = 'color'; CTX.globalAlpha = P.sc.tintA ?? .28; CTX.fillStyle = P.sc.tint; CTX.fillRect(0, 0, 1080, 1920); CTX.restore(); }
  canvasLight(P.sc);
  for (const f of TL.flashes || []) { const k = t - f; if (k >= 0 && k < .18) { CTX.fillStyle = `rgba(255,255,255,${(1 - k / .18) * .85})`; CTX.fillRect(0, 0, 1080, 1920); } }
  grain(i);
  drawCaption(t);
  return CV.toDataURL('image/jpeg', quality);
};
window.engineReady = true;
