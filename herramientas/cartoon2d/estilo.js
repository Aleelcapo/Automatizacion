// Personajes 2D estilo 'historias animadas' (SVG). Contorno por doble pasada + sombras cel.
export const O = '#221c26';
const LW = 1.25;               // grosor de contorno (por lado)
const R = Math.PI / 180;
const f = n => (+n).toFixed(1);
let UID = 0;

class G {
  constructor() { this.o = ''; this.f = ''; this.d = ''; }
  poly(d, fill, round = 0, join = 'round') {
    this.o += `<path d="${d}" fill="${O}" stroke="${O}" stroke-width="${2 * LW + round}" stroke-linejoin="${join}" stroke-miterlimit="3"/>`;
    this.f += `<path d="${d}" fill="${fill}"${round ? ` stroke="${fill}" stroke-width="${round}" stroke-linejoin="${join}" stroke-miterlimit="3"` : ''}/>`;
  }
  seg(pts, w, fill) {
    const d = 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L');
    this.o += `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + 2 * LW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    this.f += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  sh(svg) { this.f += svg; }
  det(svg) { this.d += svg; }
  toString() { return this.o + this.f + this.d; }
}
const K = .55;
const line = (d, w = 3, col = O, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w * K}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const pl = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L');

// miembro con grosor variable + sombra cel del lado derecho
function taper(g, pts, ws, fill, shade) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const wa = ws[i] / 2, wb = ws[i + 1] / 2;
    g.poly(`M${f(a[0] + nx * wa)} ${f(a[1] + ny * wa)} L${f(b[0] + nx * wb)} ${f(b[1] + ny * wb)} L${f(b[0] - nx * wb)} ${f(b[1] - ny * wb)} L${f(a[0] - nx * wa)} ${f(a[1] - ny * wa)} Z`, fill);
  }
  for (let i = 1; i < pts.length - 1; i++) g.poly(circ(pts[i][0], pts[i][1], ws[i] / 2), fill);
  if (shade) {
    const sp = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      let nx = -dy / L, ny = dx / L; if (nx < 0) { nx = -nx; ny = -ny; }
      return [p[0] + nx * ws[i] * .3, p[1] + ny * ws[i] * .3];
    });
    const w = Math.min(...ws) * .38;
    g.sh(line(pl(sp.slice(0, -1).concat([[(sp.at(-1)[0] + sp.at(-2)[0] * 0.25) / 1.25, (sp.at(-1)[1] + sp.at(-2)[1] * .25) / 1.25]])), w, shade));
  }
}
const circ = (x, y, r) => `M${f(x - r)} ${f(y)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;
function chain(x, y, a1, a2, L1, L2) {
  const ex = x + Math.sin(a1 * R) * L1, ey = y + Math.cos(a1 * R) * L1, a = a1 + a2;
  return [[x, y], [ex, ey], [ex + Math.sin(a * R) * L2, ey + Math.cos(a * R) * L2]];
}

// ---------------- MANOS ----------------
// Mano derecha del personaje (lado izquierdo de pantalla): muñeca en 0,0, apunta a +y, pulgar hacia +x.
const PALM = [[-11, 0], [11, 0], [17, 28], [16, 36], [-16, 36], [-17, 27]];
const HANDS = {
  relax: { palm: PALM, fingers: [[[13, 33], [15, 50], [14, 64], 8], [[4, 35], [5, 54], [4, 70], 8.4], [[-5, 35], [-6, 53], [-7, 66], 8], [[-13.5, 32], [-16, 46], [-17, 56], 7.2]], thumb: [[13, 8], [21, 22], [23, 37], 9.5] },
  open: { palm: PALM, fingers: [[[13, 33], [18, 52], [22, 66], 8], [[4, 35], [6, 56], [7, 72], 8.4], [[-5, 35], [-8, 54], [-10, 68], 8], [[-13.5, 32], [-20, 46], [-24, 56], 7.2]], thumb: [[13, 10], [27, 19], [38, 24], 9.5] },
  point: { palm: PALM, fingers: [[[13, 33], [15, 54], [16, 76], 8], [[4, 35], [4.5, 45], [1.5, 42], 8.6], [[-5, 35], [-5.5, 44], [-8, 41], 8.2], [[-13.5, 32], [-14, 40], [-16, 38], 7.4]], thumb: [[13, 12], [12, 30], [4, 37], 9.5] },
  fist: { palm: PALM, fingers: [[[13, 33], [13.5, 44], [10, 41], 8.4], [[4, 35], [4.5, 46], [1.5, 43], 8.6], [[-5, 35], [-5.5, 45], [-8, 42], 8.2], [[-13.5, 32], [-14, 41], [-16, 39], 7.4]], thumb: [[14, 12], [14, 31], [2, 39], 9.8] },
  grip: { palm: PALM, fingers: [[[13, 33], [15, 45], [9, 49], 8.4], [[4, 35], [6, 47], [0, 51], 8.6], [[-5, 35], [-3, 46], [-9, 50], 8.2], [[-13.5, 32], [-12, 42], [-17, 45], 7.4]], thumb: [[14, 10], [19, 28], [10, 40], 9.8] },
};
function drawHand(c, kind, wrist, dir, mirror, scale = 1.22) {
  const h = HANDS[kind] || HANDS.relax;
  const g = new G();
  const k = mirror ? -1 : 1;
  // pulgar detrás de la palma en "relax/open", delante en fist/grip/point
  const thumbFront = ['fist', 'grip', 'point'].includes(kind);
  const P = p => [p[0] * k, p[1]];
  const fing = () => h.fingers.forEach(fi => g.seg([P(fi[0]), P(fi[1]), P(fi[2])], fi[3], c.skin));
  if (!thumbFront) g.seg([P(h.thumb[0]), P(h.thumb[1]), P(h.thumb[2])], h.thumb[3], c.skin);
  fing();
  g.poly(pl(h.palm.map(P)) + 'Z', c.skin, 6);
  if (thumbFront) g.seg([P(h.thumb[0]), P(h.thumb[1]), P(h.thumb[2])], h.thumb[3], c.skin);
  // nudillos / sombra
  g.det(`<path d="${pl([P([-11, 2]), P([-17, 27]), P([-16, 36]), P([-9, 36]), P([-9, 4])])}Z" fill="${c.skinS}" opacity=".6"/>`);
  g.det(line(`M${P([-8, 30])[0]} 30 Q${P([0, 33])[0]} 32 ${P([9, 30])[0]} 29`, 2.2, c.skinS));
  const ang = Math.atan2(-dir[0], dir[1]) / R;
  return `<g transform="translate(${f(wrist[0])} ${f(wrist[1])}) rotate(${f(ang)}) scale(${scale})">${g}</g>`;
}

// ---------------- CARAS ----------------
function eyesR(c, e, id) {
  const open = e.open ?? 1, lid = Math.max(e.lid ?? c.lid ?? 0, 0);
  let s = '';
  for (const side of [-1, 1]) {
    const x = side * c.ex, y = c.ey, w = c.ew, h = c.eh;
    const X = q => f(x + side * q);
    if (open < 0.15) {
      s += line(`M${X(-w)} ${f(y + 1)} Q${X(0)} ${f(y + h * .9)} ${X(w)} ${f(y - 1)}`, 4.6, O);
    } else {
      const topY = y - h * 1.55 + lid * h * 1.9 + (1 - open) * h * 1.2;
      const almond = `M${X(-w)} ${f(y + 1)} Q${X(-w * .1)} ${f(topY)} ${X(w)} ${f(y - 1.5)} Q${X(w * .05)} ${f(y + h * 1.25)} ${X(-w)} ${f(y + 1)} Z`;
      const cid = `e${id}${side}`;
      s += `<clipPath id="${cid}"><path d="${almond}"/></clipPath><path d="${almond}" fill="#f6f2ec"/>`;
      const lx = (e.look?.[0] ?? e.look ?? 0) * w * .45, ly = (e.look?.[1] ?? 0) * h * .35;
      s += `<g clip-path="url(#${cid})"><path d="M${X(-w)} ${f(y - h * 2)} H${X(w)} V${f(y - h * .3)} Q${X(0)} ${f(y - h * .6)} ${X(-w)} ${f(y - h * .3)} Z" fill="#d9cfc6"/>` +
        `<circle cx="${f(x + lx)}" cy="${f(y + 1 + ly)}" r="${f(h * c.pupil)}" fill="${c.irisCol || O}"/>` +
        (c.irisCol ? `<circle cx="${f(x + lx)}" cy="${f(y + 1 + ly)}" r="${f(h * c.pupil * .5)}" fill="${O}"/>` : '') +
        `<circle cx="${f(x + lx - 1.6)}" cy="${f(y - 1 + ly)}" r="1.3" fill="#fff"/></g>`;
      s += `<path d="${almond}" fill="none" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += line(`M${X(-w - 1)} ${f(y + 1)} Q${X(-w * .1)} ${f(topY)} ${X(w + 1.5)} ${f(y - 1.5)}`, 5, O);
      s += line(`M${X(-w * .6)} ${f(y - h * 1.95)} Q${X(0)} ${f(y - h * 2.35)} ${X(w * .8)} ${f(y - h * 1.6)}`, 3, c.skinS);
      if (c.bags) s += line(`M${X(-w * .6)} ${f(y + h * 1.5)} Q${X(0)} ${f(y + h * 1.95)} ${X(w * .8)} ${f(y + h * 1.2)}`, 3, c.skinS);
    }
    const b = side < 0 ? (e.browL ?? 0) : (e.browR ?? 0);
    const up = e.browUp ? e.browUp[side < 0 ? 0 : 1] : 0;
    const by = y - h * 2.6 - up, bw = c.browW;
    s += `<g transform="rotate(${f(-side * b)} ${f(x)} ${f(by)})"><path d="M${X(-w - 3)} ${f(by + bw * .6)} Q${X(0)} ${f(by - bw * .9)} ${X(w + 5)} ${f(by + bw * .4)} Q${X(0)} ${f(by + bw * .3)} ${X(-w - 3)} ${f(by + bw * 1.4)} Z" fill="${c.brow}"/></g>`;
  }
  return s;
}
function mouthR(c, e) {
  const y = c.my, m = e.mouth ?? 0, mood = e.mood ?? 'neutral', lipC = c.lipCol || '#5b3a33';
  let s = '';
  if (m <= 0.05) {
    const d = { smirk: `M-14 ${y + 1} Q2 ${y + 3} 16 ${y - 5}`, smile: `M-15 ${y - 2} Q0 ${y + 7} 15 ${y - 2}`, frown: `M-13 ${y + 3} Q0 ${y - 3} 13 ${y + 3}`, sad: `M-13 ${y + 4} Q0 ${y - 2} 13 ${y + 4}` }[mood] || `M-14 ${y} Q0 ${y + 1.5} 14 ${y}`;
    s += line(d, 4.6, lipC);
  } else {
    const h = 3 + m * 13, w = 10 + m * 3 + (mood === 'smile' ? 4 : 0), t = mood === 'smirk' ? -4 : 0;
    s += `<path d="M${-w} ${y} Q0 ${y - 2 + (mood === 'smile' ? 3 : 0)} ${w} ${y + t} Q${f(w * .55)} ${f(y + h)} 0 ${f(y + h)} Q${f(-w * .55)} ${f(y + h)} ${-w} ${y} Z" fill="#7a1820" stroke="${lipC}" stroke-width="1.8" stroke-linejoin="round"/>`;
    if (m > .35) s += `<path d="M${f(-w * .4)} ${f(y + h - 1)} Q0 ${f(y + h - 6)} ${f(w * .4)} ${f(y + h - 1)} Z" fill="#c8484f"/>`;
  }
  s += line(`M-7 ${y + 11 + m * 13} Q0 ${y + 13 + m * 13} 7 ${y + 11 + m * 13}`, 3, c.skinS);
  return s;
}

function face(c, e, id) {
  let s = '';
  if (c.hairBack) { const hb = new G(); hb.poly(c.hairBack, c.hair); hb.sh(c.hairBackShade || ''); s += hb; }
  const nk = new G(); nk.poly(`M-${c.neckW} 40 L-${c.neckW + 2} 150 L${c.neckW + 2} 150 L${c.neckW} 40 Z`, c.skin);
  nk.sh(`<path d="M-${c.neckW + 1} 56 Q0 108 ${c.neckW + 1} 56 L${c.neckW + 1} 40 L-${c.neckW + 1} 40 Z" fill="${c.skinS}"/>`); s += nk;
  const fg = new G();
  fg.poly(`M-56 -14 Q-72 -22 -71 2 Q-70 26 -53 28 Z`, c.skin);
  fg.poly(`M56 -14 Q72 -22 71 2 Q70 26 53 28 Z`, c.skin);
  fg.poly(c.jaw, c.skin);
  fg.sh(`<path d="M42 -60 Q60 0 52 40 Q38 72 10 ${c.chin - 1} Q44 76 56 30 Q62 -14 58 -60 Z" fill="${c.skinS}"/>`);
  fg.sh(line('M-66 -6 Q-61 4 -60 16', 3, c.skinS) + line('M66 -6 Q61 4 60 16', 3, c.skinS));
  s += fg;
  if (c.stubble) s += `<path d="${c.stubble}" fill="${c.stubbleCol}" opacity=".55"/>` + Array.from({ length: 70 }, (_, i) => { const x = ((i * 37) % 100) - 50, y = 30 + ((i * 53) % 60); return (y > 44 || Math.abs(x) > 34) && Math.abs(x) < 50 - (y - 30) * .45 ? `<circle cx="${f(x)}" cy="${f(y)}" r=".9" fill="#5a4a40" opacity=".5"/>` : ''; }).join('');
  if (c.bangShade) s += `<path d="${c.bangShade}" fill="${c.skinS}"/>`;
  if (c.lines) s += line(c.lines, 2.6, c.skinS);
  if (e.drunk) s += `<ellipse cx="-36" cy="34" rx="18" ry="10" fill="#e0505a" opacity="${.45 * e.drunk}"/><ellipse cx="36" cy="34" rx="18" ry="10" fill="#e0505a" opacity="${.45 * e.drunk}"/><ellipse cx="2" cy="32" rx="11" ry="8" fill="#e0505a" opacity="${.55 * e.drunk}"/>`;
  if (e.hives) s += [[-38, 30, 14], [34, 22, 11], [-14, -40, 9], [44, -20, 8], [-46, -8, 10], [10, 70, 9], [24, 44, 7]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.4}" ry="${r}" fill="#e2485a" opacity="${.55 * e.hives}"/>`).join('');
  if (e.scars) s += line('M-44 10 l18 14 M30 -30 l14 22 M-20 60 l22 -6', 3.4, '#a8604a');
  if (e.tears) s += [-1, 1].map(sd => `<path d="M${sd * c.ex - 4} ${c.ey + 8} q-4 ${30 * e.tears} 2 ${60 * e.tears} q8 -2 6 -${60 * e.tears} Z" fill="#9fd8ff" opacity=".85" stroke="#4a8fc0" stroke-width="1.5"/>`).join('');
  if (e.sweat) s += `<path d="M58 -40 q8 14 0 20 q-8 -6 0 -20 Z" fill="#bfe3ff" stroke="${O}" stroke-width="1.5"/>`;
  s += eyesR(c, e, id);
  s += line(c.nose, 3.6, c.noseCol || '#9b6550');
  if (c.mustache) { const mg = new G(); mg.poly(c.mustache, c.mustacheCol); s += mg; }
  s += mouthR(c, e);
  const hf = new G(); hf.poly(c.hairFront, c.hair); hf.sh(c.hairShade || ''); s += hf;
  s += c.hairHi || '';
  if (c.glasses) s += `<g fill="#ffffff14" stroke="#2b2b30" stroke-width="2.4"><rect x="-50" y="${c.ey - 16}" width="40" height="30" rx="7"/><rect x="10" y="${c.ey - 16}" width="40" height="30" rx="7"/></g>` + line(`M-10 ${c.ey - 4} Q0 ${c.ey - 9} 10 ${c.ey - 4} M-50 ${c.ey - 8} L-64 ${c.ey - 12} M50 ${c.ey - 8} L64 ${c.ey - 12}`, 4.4, '#2b2b30');
  return s;
}
// cabeza de espaldas (para planos sobre el hombro)
function backHead(c) {
  let s = '';
  const nk = new G(); nk.poly(`M-${c.neckW + 4} 30 L-${c.neckW + 8} 110 L${c.neckW + 8} 110 L${c.neckW + 4} 30 Z`, c.skinS); s += nk;
  const fg = new G();
  fg.poly(`M-60 -20 Q-76 -28 -74 0 Q-72 26 -56 30 Z`, c.skin); fg.poly(`M60 -20 Q76 -28 74 0 Q72 26 56 30 Z`, c.skin);
  fg.poly(`M-60 -60 Q-64 30 -40 64 Q0 80 40 64 Q64 30 60 -60 Z`, c.skinS); s += fg;
  s += line('M-68 -8 Q-62 2 -64 16 M68 -8 Q62 2 64 16', 3, '#b07a60');
  const hb = new G(); hb.poly(c.hairBackView, c.hair); hb.sh(c.hairBackViewShade || ''); s += hb;
  return s;
}

export const CAST = {
  house: {
    id: 'house', scale: 1, skin: '#eec3a2', skinS: '#cf9c7f', hair: '#5f5048', hairS: '#46392f',
    ex: 26, ey: -4, ew: 15, eh: 6.5, pupil: .8, irisCol: '#3d6f9e', lid: .42, browW: 6, brow: '#4a3c33', my: 62, bags: true, neckW: 30,
    jacket: '#5a5d65', jacketS: '#45474e', shirt: '#2c2c34', shirtS: '#1e1e25', pants: '#4b6994', pantsS: '#3a5276', shoe: '#e06a2c', shoeS: '#b34f1f', sole: '#efeeea',
    shoulderW: 86, waistW: 64, hipY: -470, shoulderY: -715, headY: -808, headS: .9, armW: [44, 38, 30],
    jaw: 'M-58 -60 L-58 6 Q-58 38 -48 56 L-22 86 Q0 98 22 86 L48 56 Q58 38 58 6 L58 -60 Z', chin: 96,
    stubble: 'M-57 18 Q-55 44 -46 58 L-22 86 Q0 98 22 86 L46 58 Q55 44 57 18 Q48 40 28 44 Q12 40 0 42 Q-12 40 -28 44 Q-48 40 -57 18 Z', stubbleCol: '#a88a76',
    nose: 'M3 -2 Q0 22 -7 32 Q-3 38 5 36 M10 36 Q14 35 14 31', lines: 'M-30 40 Q-34 52 -30 62 M30 40 Q34 52 30 62 M-22 -44 Q0 -48 22 -44',
    hairFront: 'M-60 -6 Q-70 -50 -60 -74 Q-66 -92 -48 -98 Q-44 -118 -26 -114 Q-20 -132 -2 -122 Q10 -136 26 -122 Q44 -128 50 -110 Q68 -106 64 -88 Q76 -66 66 -36 L62 -6 Q58 -32 52 -46 Q46 -40 40 -54 Q30 -46 22 -62 Q10 -52 0 -64 Q-10 -52 -22 -60 Q-32 -48 -42 -56 Q-50 -42 -56 -30 Z',
    hairShade: '<path d="M50 -110 Q68 -106 64 -88 Q76 -66 66 -36 L62 -6 Q58 -32 52 -46 Q46 -40 40 -54 Q50 -80 50 -110 Z" fill="#46392f"/><path d="M-60 -6 Q-62 -26 -60 -40 L-55 -32 Q-57 -20 -58 -6 Z M62 -6 Q63 -26 62 -40 L57 -32 Q58 -20 59 -6 Z" fill="#9c918a"/>',
    hairHi: '<path d="M-26 -96 Q-10 -106 8 -102 Q-8 -98 -22 -90 Z M14 -108 Q26 -112 36 -104 Q26 -104 18 -100 Z" fill="#7a6a60"/><path d="M-44 -70 Q-36 -84 -22 -88 M-6 -90 Q6 -100 20 -98 M24 -84 Q36 -88 46 -80 M-30 -60 Q-20 -74 -6 -76" fill="none" stroke="#3f332b" stroke-width="1.6" stroke-linecap="round"/>',
    hairBackView: 'M-62 -40 Q-70 -110 0 -122 Q70 -110 62 -40 Q66 20 54 54 Q40 62 30 56 Q20 66 8 58 Q-4 68 -16 58 Q-28 66 -40 56 Q-52 62 -56 50 Q-66 20 -62 -40 Z',
    hairBackViewShade: '<path d="M20 -110 Q66 -92 62 -40 Q64 0 56 26 Q40 34 30 26 Q50 -30 20 -110 Z" fill="#46392f"/>',
  },
  ana: {
    id: 'ana', scale: .93, skin: '#e8b996', skinS: '#c99273', hair: '#1f2a2c', hairS: '#121a1b',
    ex: 25, ey: -2, ew: 15, eh: 7.5, pupil: .72, irisCol: '#4a2f22', lid: .1, browW: 4, brow: '#1f2a2c', my: 60, neckW: 23, lipCol: '#8a3a3e',
    coat: '#f3f4f5', coatS: '#c9d1da', shirt: '#e58c8a', shirtS: '#c46f6e', pants: '#3a3c48', pantsS: '#2a2c36', shoe: '#2c2a30', shoeS: '#18171b', sole: '#57545c',
    shoulderW: 72, waistW: 54, hipY: -470, shoulderY: -715, headY: -808, headS: .9, armW: [38, 33, 27],
    jaw: 'M-55 -60 L-56 4 Q-55 34 -45 52 Q-26 80 -6 91 Q0 94 6 91 Q26 80 45 52 Q55 34 56 4 L55 -60 Z', chin: 93,
    nose: 'M2 4 Q0 22 -5 30 Q-1 35 5 33', noseCol: '#b0745a',
    hairBack: 'M-64 -40 Q-90 40 -80 120 Q-92 170 -70 196 Q-50 170 -52 150 L52 150 Q60 180 76 186 Q86 150 80 120 Q90 40 64 -40 Z',
    hairBackShade: '<path d="M-52 150 L-56 70 L56 70 L52 150 Z" fill="#121a1b"/>',
    hairFront: 'M-62 16 Q-72 -66 -32 -102 Q0 -122 32 -102 Q72 -70 62 16 Q66 50 58 80 Q52 56 54 30 Q56 -10 46 -40 Q30 -66 4 -82 Q0 -70 -4 -82 Q-30 -66 -46 -40 Q-56 -10 -54 30 Q-52 56 -58 80 Q-66 50 -62 16 Z',
    hairShade: '<path d="M46 -40 Q56 -10 54 30 Q52 56 58 80 Q66 50 62 16 Q66 -30 52 -60 Z M-46 -40 Q-56 -10 -54 30 Q-58 0 -56 -30 Z" fill="#121a1b"/>',
    hairHi: '<path d="M-30 -92 Q-14 -104 -4 -96 Q-18 -94 -28 -84 Z M14 -96 Q28 -100 40 -88 Q28 -90 18 -90 Z" fill="#3c4c4f"/>',
    bangShade: 'M-54 -30 Q-30 -66 -4 -76 L4 -76 Q30 -66 54 -30 L54 -20 Q30 -54 4 -66 L-4 -66 Q-30 -54 -54 -20 Z',
    hairBackView: 'M-64 -40 Q-70 -114 0 -122 Q70 -114 64 -40 Q80 60 70 140 L-70 140 Q-80 60 -64 -40 Z',
    hairBackViewShade: '<path d="M10 -120 Q70 -100 64 -40 Q80 60 70 140 L40 140 Q60 20 10 -120 Z" fill="#121a1b"/>',
  },
  leo: {
    id: 'leo', scale: .97, skin: '#f3cfb1', skinS: '#d6a787', hair: '#6b4a32', hairS: '#4e3523',
    ex: 25, ey: -4, ew: 15, eh: 7.5, pupil: .72, irisCol: '#3e5f3a', lid: 0, browW: 4.5, brow: '#5a3d28', my: 60, neckW: 27, glasses: true,
    coat: '#f3f4f5', coatS: '#c9d1da', shirt: '#a9c6e2', shirtS: '#82a3c4', tie: '#2c4f8a', pants: '#545660', pantsS: '#41434b', shoe: '#5b3b27', shoeS: '#3e2718', sole: '#2a1d16',
    shoulderW: 80, waistW: 60, hipY: -470, shoulderY: -715, headY: -808, headS: .9, armW: [42, 36, 29],
    jaw: 'M-57 -60 L-57 4 Q-57 36 -47 54 Q-28 82 -6 93 Q0 96 6 93 Q28 82 47 54 Q57 36 57 4 L57 -60 Z', chin: 95,
    nose: 'M2 0 Q0 22 -6 30 Q-2 36 5 34',
    hairFront: 'M-60 -6 Q-68 -72 -30 -102 Q10 -124 46 -102 Q70 -78 62 -6 Q58 -40 50 -54 Q20 -48 -8 -66 Q-30 -54 -48 -52 Q-56 -32 -60 -6 Z',
    hairShade: '<path d="M46 -102 Q70 -78 62 -6 Q58 -40 50 -54 Q20 -48 -8 -66 Q30 -66 46 -102 Z" fill="#4e3523"/>',
    hairHi: '<path d="M-24 -94 Q0 -108 22 -102 Q0 -98 -20 -86 Z" fill="#8a6446"/>',
    bangShade: 'M-56 -44 Q-30 -46 -8 -58 Q20 -42 50 -46 L56 -36 Q20 -32 -8 -46 Q-30 -36 -56 -32 Z',
    hairBackView: 'M-62 -40 Q-70 -114 0 -124 Q70 -114 62 -40 Q66 20 54 56 Q40 64 28 60 Q14 72 0 66 Q-14 72 -28 60 Q-40 64 -54 56 Q-66 20 -62 -40 Z',
    hairBackViewShade: '<path d="M20 -116 Q66 -98 62 -40 Q66 20 54 56 Q40 64 28 60 Q56 -20 20 -116 Z" fill="#4e3523"/>',
  },
paciente: {
    id: 'paciente', scale: .96, skin: '#e8b593', skinS: '#c98f6f', hair: '#b9b4ae', hairS: '#8f8a84',
    ex: 26, ey: -2, ew: 14, eh: 6.5, pupil: .72, irisCol: '#4a3a2c', lid: .3, browW: 6, brow: '#9c958d', my: 66, bags: true, neckW: 29,
    outfit: 'shirt', top: '#5f7fa8', topS: '#4a6587', plaid: '#2f3f5a', pants: '#6a5a48', pantsS: '#54463a', shoe: '#3b2f28', shoeS: '#241c18', sole: '#1c1714',
    shoulderW: 90, waistW: 76, hipY: -470, shoulderY: -705, headY: -800, headS: .9, armW: [46, 40, 32],
    jaw: 'M-61 10 L-61 -46 Q-60 -116 0 -120 Q60 -116 61 -46 L61 10 Q60 44 48 62 L20 90 Q0 99 -20 90 L-48 62 Q-60 44 -61 10 Z', chin: 97,
    nose: 'M4 -2 Q0 22 -10 34 Q-4 42 8 40 M12 40 Q17 38 16 33', lines: 'M-34 36 Q-40 52 -34 66 M34 36 Q40 52 34 66 M-26 -40 Q0 -45 26 -40 M-20 -30 Q0 -34 20 -30',
    mustache: 'M-26 52 Q-14 42 0 48 Q14 42 26 52 Q30 60 22 58 Q10 54 0 56 Q-10 54 -22 58 Q-30 60 -26 52 Z', mustacheCol: '#a8a29a',
    hairFront: 'M-62 10 Q-66 -30 -58 -50 Q-54 -34 -52 -14 Q-52 0 -56 14 Z M62 10 Q66 -30 58 -50 Q54 -34 52 -14 Q52 0 56 14 Z',
    hairShade: '', hairHi: '<path d="M-30 -84 Q-10 -96 14 -92" fill="none" stroke="#fff" stroke-width="4" opacity=".35" stroke-linecap="round"/>',
    hairBackView: 'M-62 -20 Q-66 30 -50 60 Q0 76 50 60 Q66 30 62 -20 Q50 10 0 14 Q-50 10 -62 -20 Z',
  },
  esposa: {
    id: 'esposa', scale: .9, skin: '#efc3a2', skinS: '#d29c7c', hair: '#8a6a58', hairS: '#6a4f40',
    ex: 25, ey: -2, ew: 14, eh: 7, pupil: .72, irisCol: '#3e5a7a', lid: .05, browW: 4, brow: '#6a4f40', my: 60, neckW: 22, lipCol: '#9a4a52', bags: true,
    outfit: 'shirt', top: '#8a5a8e', topS: '#6c4570', necklace: '#f2e2b8', pants: '#3e4250', pantsS: '#30333e', shoe: '#2c2a30', shoeS: '#18171b', sole: '#57545c',
    shoulderW: 74, waistW: 62, hipY: -470, shoulderY: -712, headY: -808, headS: .9, armW: [38, 33, 27],
    jaw: 'M-55 -60 L-56 4 Q-55 34 -45 52 Q-26 80 -6 91 Q0 94 6 91 Q26 80 45 52 Q55 34 56 4 L55 -60 Z', chin: 93,
    nose: 'M2 4 Q0 22 -5 30 Q-1 35 5 33', noseCol: '#b0745a', lines: 'M-30 40 Q-34 50 -30 58 M30 40 Q34 50 30 58',
    hairBack: 'M-66 -40 Q-84 30 -74 90 Q-50 104 -40 90 L40 90 Q50 104 74 90 Q84 30 66 -40 Z',
    hairFront: 'M-66 40 Q-76 -66 -20 -106 Q30 -124 62 -80 Q76 -50 68 40 Q60 10 56 -20 Q40 -50 10 -62 Q-14 -40 -46 -44 Q-56 -10 -58 30 Z',
    hairShade: '<path d="M56 -20 Q60 10 68 40 Q74 -10 66 -50 Z" fill="#6a4f40"/>',
    hairHi: '<path d="M-30 -92 Q-10 -104 10 -100 Q-8 -96 -26 -84 Z" fill="#a8887a"/>',
    bangShade: 'M-54 -36 Q-30 -34 -10 -50 Q20 -40 54 -16 L54 -6 Q20 -30 -10 -40 Q-30 -26 -54 -26 Z',
    hairBackView: 'M-66 -40 Q-70 -114 0 -122 Q70 -114 66 -40 Q80 30 70 90 L-70 90 Q-80 30 -66 -40 Z',
  },
mujer: {
    id: 'mujer', scale: .93, skin: '#f1c6a6', skinS: '#d49d7e', hair: '#8a3b22', hairS: '#5e2614',
    ex: 25, ey: -2, ew: 15, eh: 7.5, pupil: .72, irisCol: '#3f6a3a', lid: .05, browW: 4, brow: '#6a2c18', my: 60, neckW: 22, lipCol: '#a24a50',
    outfit: 'shirt', top: '#3f8a6e', topS: '#2f6a54', pants: '#3a3c48', pantsS: '#2a2c36', shoe: '#2c2a30', shoeS: '#18171b', sole: '#57545c',
    shoulderW: 72, waistW: 56, hipY: -470, shoulderY: -715, headY: -808, headS: .9, armW: [38, 33, 27],
    jaw: 'M-55 -60 L-56 4 Q-55 34 -45 52 Q-26 80 -6 91 Q0 94 6 91 Q26 80 45 52 Q55 34 56 4 L55 -60 Z', chin: 93,
    nose: 'M2 4 Q0 22 -5 30 Q-1 35 5 33', noseCol: '#b0745a',
    hairBack: 'M-64 -40 Q-96 40 -86 130 Q-96 180 -66 200 Q-60 170 -52 150 L52 150 Q60 180 70 200 Q96 180 86 130 Q96 40 64 -40 Z',
    hairBackShade: '<path d="M-52 150 L-56 70 L56 70 L52 150 Z" fill="#5e2614"/>',
    hairFront: 'M-64 30 Q-74 -70 -20 -106 Q30 -122 62 -84 Q76 -54 66 30 Q70 70 60 96 Q52 64 54 30 Q56 -10 44 -40 Q20 -64 -12 -70 Q-40 -50 -50 -20 Q-56 20 -54 50 Q-56 80 -62 100 Q-70 64 -64 30 Z',
    hairShade: '<path d="M44 -40 Q56 -10 54 30 Q52 64 60 96 Q70 50 66 0 Z" fill="#5e2614"/>',
    hairHi: '<path d="M-30 -92 Q-10 -104 10 -100 Q-8 -96 -26 -84 Z" fill="#b25a3a"/>',
    bangShade: 'M-50 -20 Q-40 -50 -12 -62 Q20 -56 44 -32 L44 -24 Q20 -48 -12 -54 Q-40 -42 -50 -12 Z',
    hairBackView: 'M-64 -40 Q-70 -114 0 -122 Q70 -114 64 -40 Q90 60 76 150 L-76 150 Q-90 60 -64 -40 Z',
  },
  madre: {
    id: 'madre', scale: .92, skin: '#e2a982', skinS: '#c48a65', hair: '#3a2a22', hairS: '#22180f',
    ex: 25, ey: -2, ew: 15, eh: 7.5, pupil: .72, irisCol: '#4a2f22', lid: .05, browW: 4, brow: '#2e2018', my: 60, neckW: 22, lipCol: '#a24a50',
    outfit: 'shirt', top: '#c0607a', topS: '#9a4a60', pants: '#2f4a6e', pantsS: '#243a58', shoe: '#2c2a30', shoeS: '#18171b', sole: '#57545c',
    shoulderW: 72, waistW: 56, hipY: -470, shoulderY: -715, headY: -808, headS: .9, armW: [38, 33, 27],
    jaw: 'M-55 -60 L-56 4 Q-55 34 -45 52 Q-26 80 -6 91 Q0 94 6 91 Q26 80 45 52 Q55 34 56 4 L55 -60 Z', chin: 93,
    nose: 'M2 4 Q0 22 -5 30 Q-1 35 5 33', noseCol: '#a8684a',
    hairBack: 'M-66 -40 Q-84 30 -74 90 Q-50 104 -40 90 L40 90 Q50 104 74 90 Q84 30 66 -40 Z',
    hairFront: 'M-66 40 Q-76 -66 -20 -106 Q30 -124 62 -80 Q76 -50 68 40 Q60 10 56 -20 Q40 -50 10 -62 Q-14 -40 -46 -44 Q-56 -10 -58 30 Z',
    hairShade: '<path d="M56 -20 Q60 10 68 40 Q74 -10 66 -50 Z" fill="#22180f"/>',
    hairHi: '<path d="M-30 -92 Q-10 -104 10 -100 Q-8 -96 -26 -84 Z" fill="#5a4436"/>',
    bangShade: 'M-54 -36 Q-30 -34 -10 -50 Q20 -40 54 -16 L54 -6 Q20 -30 -10 -40 Q-30 -26 -54 -26 Z',
    hairBackView: 'M-66 -40 Q-70 -114 0 -122 Q70 -114 66 -40 Q80 30 70 90 L-70 90 Q-80 30 -66 -40 Z',
  },
  nino: {
    id: 'nino', scale: .6, skin: '#f3cdae', skinS: '#d9a888', hair: '#5a3a24', hairS: '#3e2716',
    ex: 26, ey: 2, ew: 16, eh: 9, pupil: .78, irisCol: '#3a5a7a', lid: 0, browW: 4.5, brow: '#4a3020', my: 58, neckW: 22,
    outfit: 'shirt', top: '#e8b13a', topS: '#c08f22', pants: '#4f6f9c', pantsS: '#3c5579', shoe: '#d64a3a', shoeS: '#a8382a', sole: '#f2f2ee',
    shoulderW: 78, waistW: 66, hipY: -470, shoulderY: -705, headY: -846, headS: 1.18, armW: [44, 40, 34],
    jaw: 'M-58 -60 L-59 6 Q-58 40 -46 58 Q-26 84 0 88 Q26 84 46 58 Q58 40 59 6 L58 -60 Z', chin: 88,
    nose: 'M2 14 Q0 26 -5 30 Q-1 34 5 32',
    hairFront: 'M-62 -2 Q-70 -70 -30 -100 L-24 -116 L-10 -104 Q10 -124 46 -102 L58 -110 L56 -90 Q72 -70 64 -2 Q58 -36 50 -50 Q36 -40 24 -58 Q10 -44 -4 -60 Q-20 -44 -34 -56 Q-50 -40 -56 -26 Z',
    hairShade: '<path d="M46 -102 Q72 -70 64 -2 Q58 -36 50 -50 Q60 -80 46 -102 Z" fill="#3e2716"/>',
    hairHi: '<path d="M-24 -90 Q0 -104 22 -98 Q0 -94 -20 -82 Z" fill="#7a5638"/>',
    bangShade: 'M-56 -30 Q-44 -46 -34 -48 Q-20 -36 -4 -52 Q10 -36 24 -50 Q36 -32 50 -42 L56 -30 Q36 -22 24 -38 Q10 -24 -4 -40 Q-20 -24 -34 -36 Q-46 -32 -56 -20 Z',
    hairBackView: 'M-62 -40 Q-70 -114 0 -124 Q70 -114 62 -40 Q64 0 58 22 Q30 32 0 30 Q-30 32 -58 22 Q-64 0 -62 -40 Z',
  },
};

const V = (base, o) => ({ ...CAST[base], ...o });
Object.assign(CAST, {
  hombre: V('leo', { id: 'hombre', scale: .98, glasses: false, coat: undefined, tie: undefined, outfit: 'shirt', top: '#dfe6ee', topS: '#b9c4d0', hair: '#2e2a28', hairS: '#1c1a19', brow: '#2e2a28', skin: '#e3b08c', skinS: '#c48e6c', irisCol: '#4a3426', lines: 'M-30 40 Q-34 52 -30 62 M30 40 Q34 52 30 62', mustache: 'M-24 50 Q-12 42 0 47 Q12 42 24 50 Q26 57 18 55 Q8 52 0 54 Q-8 52 -18 55 Q-26 57 -24 50 Z', mustacheCol: '#2e2a28', pants: '#4a4a52', pantsS: '#38383f' }),
  muerto: V('leo', { id: 'muerto', scale: .98, glasses: false, coat: undefined, tie: undefined, outfit: 'shirt', top: '#3c3f48', topS: '#2c2f36', hair: '#3a3a3a', hairS: '#262626', brow: '#3a3a3a', skin: '#d8d0c8', skinS: '#b5aba2', bags: true, lid: .4, irisCol: '#4a4a4a', pants: '#2c2c32', pantsS: '#202024' }),
  chica: V('ana', { id: 'chica', scale: .86, coat: undefined, outfit: 'shirt', top: '#6aa8e0', topS: '#4f88c0', hair: '#c9893a', hairS: '#9a6522', brow: '#9a6522', skin: '#f3cfb4', skinS: '#d8aa8c', irisCol: '#3e6a8a', pants: '#3a4a6e', pantsS: '#2c3a58',
    hairBackShade: '<path d="M-52 150 L-56 70 L56 70 L52 150 Z" fill="#9a6522"/>', hairShade: '<path d="M46 -40 Q56 -10 54 30 Q52 56 58 80 Q66 50 62 16 Q66 -30 52 -60 Z M-46 -40 Q-56 -10 -54 30 Q-58 0 -56 -30 Z" fill="#9a6522"/>', hairHi: '<path d="M-30 -92 Q-14 -104 -4 -96 Q-18 -94 -28 -84 Z M14 -96 Q28 -100 40 -88 Q28 -90 18 -90 Z" fill="#e8b46a"/>' }),
  nino2: V('nino', { id: 'nino2', skin: '#b5815a', skinS: '#94653f', hair: '#1e1712', hairS: '#0f0b08', brow: '#1e1712', top: '#d84a3a', topS: '#a8382a', irisCol: '#3a2618', pants: '#5a4a3a', pantsS: '#463a2c' }),
  hombre8: V('paciente', { id: 'hombre8', scale: .97, top: '#7a8a5a', topS: '#5e6c44', plaid: undefined, hair: '#4a3a30', mustacheCol: '#4a3a30', brow: '#4a3a30', skin: '#e9be98', skinS: '#cc9a76',
    hairFront: 'M-62 10 Q-70 -60 -40 -96 Q0 -118 40 -96 Q70 -60 62 10 Q58 -30 48 -50 Q20 -58 -10 -70 Q-36 -56 -52 -40 Q-58 -20 -62 10 Z', lines: 'M-30 40 Q-34 52 -30 62 M30 40 Q34 52 30 62' }),
});
// figura de espaldas (cabeza + hombros) para planos sobre el hombro
export function drawBack(id, opts = {}) {
  const c = CAST[id], sh = c.shoulderY, sw = c.shoulderW + 6, ww = c.waistW;
  const coat = !!c.coat, top = coat ? c.coat : c.jacket, topS = coat ? c.coatS : c.jacketS;
  const g = new G();
  const torso = `M${-sw} ${sh} Q${-sw - 10} ${sh + 120} ${-ww - 6} ${sh + 420} L${ww + 6} ${sh + 420} Q${sw + 10} ${sh + 120} ${sw} ${sh} Q${sw * .5} ${sh - 26} 0 ${sh - 24} Q${-sw * .5} ${sh - 26} ${-sw} ${sh} Z`;
  g.poly(torso, top);
  g.sh(`<path d="M${sw * .3} ${sh - 22} Q${sw + 14} ${sh + 100} ${ww + 6} ${sh + 420} L${sw + 20} ${sh + 420} L${sw + 20} ${sh - 30} Z" fill="${topS}"/>`);
  g.det(line(`M-30 ${sh - 18} Q0 ${sh - 4} 30 ${sh - 18}`, 3) + line(`M0 ${sh + 160} L0 ${sh + 420}`, 3, topS));
  const tw = taper.bind(null);
  taper(g, [[-sw + 10, sh + 20], [-sw - 6, sh + 200], [-sw + 2, sh + 380]], c.armW, top, topS);
  taper(g, [[sw - 10, sh + 20], [sw + 6, sh + 200], [sw - 2, sh + 380]], c.armW, top, topS);
  return `<g transform="scale(${c.scale})">${g}<g transform="translate(${opts.dx || 0} ${c.headY + 34}) rotate(${opts.tilt || 0} 0 120) scale(${c.headS})">${backHead(c)}</g></g>`;
}

// ---------------- CUERPO ----------------
function shoe(c, x, dir) {
  const g = new G();
  g.poly(`M${x - 26 * dir} -44 Q${x - 32 * dir} -10 ${x - 26 * dir} 0 L${x + 50 * dir} 0 Q${x + 60 * dir} -6 ${x + 50 * dir} -20 Q${x + 30 * dir} -26 ${x + 18 * dir} -46 Z`, c.shoe);
  g.sh(`<path d="M${x - 28 * dir} -12 L${x + 56 * dir} -12 L${x + 54 * dir} 0 L${x - 26 * dir} 0 Z" fill="${c.sole}"/><path d="M${x - 24 * dir} -40 Q${x - 28 * dir} -20 ${x - 24 * dir} -12 L${x - 8 * dir} -12 Q${x - 12 * dir} -30 ${x - 6 * dir} -44 Z" fill="${c.shoeS}"/>`);
  g.det(line(`M${x - 28 * dir} -12 L${x + 56 * dir} -12`, 2.6) + (c.id === 'house' ? line(`M${x + 2 * dir} -40 l${12 * dir} 10 M${x + 10 * dir} -44 l${12 * dir} 10`, 2.6, '#fff') : ''));
  return g;
}

// pose: {armL:[a1,a2], armR:[a1,a2], handL, handR, pocketL, prop, face, head:{tilt,dx,dy}, legs}
export function drawCharacter(id, pose = {}) {
  const c = CAST[id], uid = `${id}${UID++}`;
  const sh = c.shoulderY, hp = c.hipY, sw = c.shoulderW, ww = c.waistW;
  const shirtOnly = c.outfit === 'shirt';
  const coat = !!c.coat, top = coat ? c.coat : shirtOnly ? c.top : c.jacket, topS = coat ? c.coatS : shirtOnly ? c.topS : c.jacketS;
  let s = '';
  // piernas (walk: fase de caminata)
  const st = pose.legs === 'wide' ? 14 : 0;
  const wk = pose.walk == null ? 0 : Math.sin(pose.walk), wk2 = pose.walk == null ? 0 : Math.max(0, -Math.cos(pose.walk));
  const legR = [[30, hp + 10], [36 + st + wk * 14, -245 - Math.max(0, wk) * 30], [40 + st + wk * 30, -44 - Math.max(0, wk) * 40]], legL = [[-30, hp + 10], [-36 - st - wk * 14, -245 - Math.max(0, -wk) * 30], [-40 - st - wk * 30, -44 - Math.max(0, -wk) * 40]];
  const lg = new G();
  taper(lg, legR, [62, 52, 40], c.pants, c.pantsS);
  taper(lg, legL, [62, 52, 40], c.pants, c.pantsS);
  lg.poly(`M${-ww - 2} ${hp - 20} L${ww + 2} ${hp - 20} L${ww + 2} ${hp + 30} L4 ${hp + 70} L-4 ${hp + 70} L${-ww - 2} ${hp + 30} Z`, c.pants);
  lg.det(line(`M0 ${hp + 20} L0 ${hp + 66}`, 2.6) + line(`M-22 -300 l4 40 M24 -310 l-3 36`, 2, c.pantsS));
  s += lg + shoe(c, legR[2][0], 1) + shoe(c, legL[2][0], -1);
  // torso
  const bot = coat ? -300 : shirtOnly ? hp + 20 : hp + 34, flare = coat ? 18 : 2;
  const tg = new G();
  const torso = `M${-sw} ${sh} Q${-sw - 6} ${sh + 80} ${-ww} ${hp - 40} L${-ww - flare} ${bot} L${ww + flare} ${bot} L${ww} ${hp - 40} Q${sw + 6} ${sh + 80} ${sw} ${sh} Q${sw * .5} ${sh - 22} 0 ${sh - 20} Q${-sw * .5} ${sh - 22} ${-sw} ${sh} Z`;
  tg.poly(torso, top);
  tg.sh(`<clipPath id="tc${uid}"><path d="${torso}"/></clipPath><g clip-path="url(#tc${uid})"><path d="M${ww * .55} ${sh - 30} Q${sw * .9} ${sh + 120} ${ww * .7} ${bot + 10} L${sw + 40} ${bot + 10} L${sw + 40} ${sh - 30} Z" fill="${topS}"/></g>`);
  if (shirtOnly && c.plaid) tg.sh(`<clipPath id="pc${uid}"><path d="${torso}"/></clipPath><g clip-path="url(#pc${uid})" opacity=".55">${Array.from({ length: 9 }, (_, i) => `<rect x="${-sw - 20 + i * 28}" y="${sh - 30}" width="10" height="${hp - sh + 80}" fill="${c.plaid}"/><rect x="${-sw - 20}" y="${sh - 10 + i * 34}" width="${2 * sw + 40}" height="10" fill="${c.plaid}"/>`).join('')}</g>`);
  // camisa
  const vB = coat ? sh + 210 : sh + 140;
  if (!shirtOnly) tg.poly(`M-30 ${sh - 18} L0 ${vB} L30 ${sh - 18} Z`, c.shirt);
  if (coat) tg.poly(`M-30 ${sh - 18} L-26 ${hp + 40} L26 ${hp + 40} L30 ${sh - 18} Z`, c.shirt);
  if (!shirtOnly) tg.sh(`<path d="M12 ${sh - 14} L28 ${sh - 14} L24 ${coat ? hp + 40 : vB - 30} L8 ${coat ? hp + 40 : vB - 60} Z" fill="${c.shirtS}"/>`);
  else tg.det(`<path d="M-34 ${sh - 18} L-6 ${sh + 30} L0 ${sh - 6} L6 ${sh + 30} L34 ${sh - 18} L0 ${sh - 14} Z" fill="${top}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>` + line(`M0 ${sh} L0 ${hp + 20}`, 3) + [0, 1, 2, 3].map(i => `<circle cx="7" cy="${sh + 40 + i * 62}" r="4" fill="#f4f0e6" stroke="${O}" stroke-width="1.6"/>`).join('') + (c.necklace ? line(`M-24 ${sh - 8} Q0 ${sh + 40} 24 ${sh - 8}`, 3, c.necklace) : ''));
  if (c.tie) { tg.poly(`M-8 ${sh - 6} L8 ${sh - 6} L13 ${sh + 150} L0 ${sh + 170} L-13 ${sh + 150} Z`, c.tie); tg.det(line(`M-6 ${sh + 40} L9 ${sh + 30} M-9 ${sh + 90} L11 ${sh + 80} M-11 ${sh + 140} L12 ${sh + 130}`, 4, '#ffffff40')); }
  if (id === 'house') tg.det(`<path d="M-28 ${sh - 16} L-10 ${sh + 22} L-2 ${sh - 10} M28 ${sh - 16} L10 ${sh + 22} L2 ${sh - 10}" fill="${c.shirt}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`);
  if (id === 'ana') tg.det(line(`M-22 ${sh + 8} Q0 ${sh + 34} 22 ${sh + 8}`, 2, '#f0c860') + `<circle cx="0" cy="${sh + 33}" r="4" fill="#f0c860" stroke="${O}" stroke-width="2"/>`);
  s += tg;
  // solapas
  const lp = new G();
  if (shirtOnly) {
  } else if (coat) {
    lp.poly(`M-32 ${sh - 20} L-56 ${sh + 70} L-36 ${sh + 86} L-8 ${vB + 6} L-24 ${bot} L${-ww - flare} ${bot} L${-ww} ${hp - 40} Q${-sw - 2} ${sh + 70} -54 ${sh + 8} Z`, top);
    lp.poly(`M32 ${sh - 20} L56 ${sh + 70} L36 ${sh + 86} L8 ${vB + 6} L24 ${bot} L${ww + flare} ${bot} L${ww} ${hp - 40} Q${sw + 2} ${sh + 70} 54 ${sh + 8} Z`, top);
    lp.sh(`<path d="M${ww * .55} ${sh + 60} Q${sw * .85} ${sh + 140} ${ww * .7} ${bot} L${ww + flare} ${bot} L${ww} ${hp - 40} Q${sw} ${sh + 70} ${sw * .7} ${sh + 30} Z" fill="${topS}"/><path d="M8 ${vB + 6} L24 ${bot} L32 ${bot} L16 ${vB} Z" fill="${topS}"/>`);
    lp.det(`<rect x="-62" y="${hp + 20}" width="40" height="34" rx="3" fill="none" stroke="${O}" stroke-width="2.6"/><rect x="24" y="${hp + 20}" width="40" height="34" rx="3" fill="none" stroke="${O}" stroke-width="2.6"/>`);
    lp.det(`<rect x="28" y="${sh + 84}" width="34" height="44" rx="4" fill="#fff" stroke="${O}" stroke-width="2.8"/><rect x="33" y="${sh + 90}" width="12" height="15" rx="2" fill="#8fb3d9"/>` + line(`M49 ${sh + 94} h9 M49 ${sh + 101} h9 M34 ${sh + 114} h22`, 2.4) + line(`M-50 ${sh + 70} q8 -6 14 0 l0 22`, 4, '#4f74b8'));
  } else {
    lp.poly(`M-30 ${sh - 20} L-60 ${sh + 62} L-40 ${sh + 70} L-2 ${vB + 6} L-6 ${bot} L${-ww - flare} ${bot} L${-ww} ${hp - 40} Q${-sw - 2} ${sh + 70} -60 ${sh + 6} Z`, top);
    lp.poly(`M30 ${sh - 20} L60 ${sh + 62} L40 ${sh + 70} L2 ${vB + 6} L6 ${bot} L${ww + flare} ${bot} L${ww} ${hp - 40} Q${sw + 2} ${sh + 70} 60 ${sh + 6} Z`, top);
    lp.sh(`<path d="M${ww * .5} ${sh + 70} Q${sw * .85} ${sh + 140} ${ww * .7} ${bot} L${ww + flare} ${bot} L${ww} ${hp - 40} Q${sw} ${sh + 70} ${sw * .7} ${sh + 30} Z" fill="${topS}"/>`);
    lp.det(`<circle cx="-10" cy="${vB + 36}" r="5" fill="${topS}" stroke="${O}" stroke-width="2.4"/><circle cx="-10" cy="${vB + 84}" r="5" fill="${topS}" stroke="${O}" stroke-width="2.4"/>` + line(`M-60 ${hp - 20} h34 M28 ${hp - 20} h34`, 3, topS));
  }
  s += lp;
  // cabeza
  const hd = pose.head || {};
  s += `<g transform="translate(${hd.dx || 0} ${c.headY + (hd.dy || 0)}) rotate(${hd.tilt || 0} 0 120) scale(${c.headS})">${face(c, pose.face || {}, uid)}</g>`;
  // brazos
  const [L1, L2] = [158, 138];
  const arm = (side, ang, handKind, pocket, prop, reach) => {
    const sx = side * (sw - 14), sy = sh + 20;
    const a = ang || [6, -8];
    let pts = chain(sx, sy, side * a[0], side * a[1], L1, L2);
    if (reach) {
      let dx = reach[0] - sx, dy = reach[1] - sy, d = Math.hypot(dx, dy); const md = L1 + L2 - 2;
      if (d > md) { dx *= md / d; dy *= md / d; d = md; }
      const th = Math.atan2(dx, dy), al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const cand = [th + al, th - al].map(u => [sx + Math.sin(u) * L1, sy + Math.cos(u) * L1]);
      const el = cand[0][0] * side > cand[1][0] * side ? cand[0] : cand[1];
      pts = [[sx, sy], el, [sx + dx, sy + dy]];
    }
    const ag = new G();
    let out = '';
    if (pocket) { pts[2] = [pts[1][0] + (pts[2][0] - pts[1][0]) * .78, pts[1][1] + (pts[2][1] - pts[1][1]) * .78]; }
    taper(ag, pts, c.armW, top, topS);
    const dir = [pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]], dl = Math.hypot(...dir);
    const cx = pts[2][0] - dir[0] / dl * 14, cy = pts[2][1] - dir[1] / dl * 14, nx = -dir[1] / dl, ny = dir[0] / dl;
    ag.det(line(`M${f(cx + nx * 15)} ${f(cy + ny * 15)} L${f(cx - nx * 15)} ${f(cy - ny * 15)}`, 2.6));
    { const [e0, e1] = [pts[1][0], pts[1][1]]; ag.det(line(`M${f(e0 - 10)} ${f(e1 - 8)} q8 6 16 2 M${f(e0 - 6)} ${f(e1 + 6)} q8 4 14 -2`, 3, topS)); }
    if (pocket) ag.det(line(`M${f(pts[2][0] - 26)} ${f(pts[2][1] + 4)} L${f(pts[2][0] + 26)} ${f(pts[2][1] + 4)}`, 3));
    out += ag;
    if (!pocket) {
      const wrist = pts[2];
      if (prop === 'cane') {
        const tipX = wrist[0] - side * 20, gx = wrist[0], gy = wrist[1] + 48;
        const cg = new G();
        cg.seg([[gx, gy - 8], [tipX, -4]], 12, '#7a4a2a');
        cg.seg([[gx, gy - 8], [gx + 2, gy - 30], [gx + side * 18, gy - 44], [gx + side * 36, gy - 34]], 13, '#7a4a2a');
        cg.sh(line(`M${f(gx + 3)} ${f(gy)} L${f(tipX + 3)} -10`, 3, '#5a341c'));
        cg.poly(`M${f(tipX - 9)} -16 L${f(tipX + 9)} -16 L${f(tipX + 8)} 0 L${f(tipX - 8)} 0 Z`, '#26222a');
        out += cg;
        out += drawHand(c, 'grip', wrist, [dir[0], dir[1]], side > 0);
      } else if (prop === 'clipboard' || prop === 'notebook' || prop === 'file') {
        const col = prop === 'clipboard' ? '#a8784c' : prop === 'file' ? '#e8c35a' : '#d44a3a';
        const bx = wrist[0] + side * 4, by = wrist[1] + 30;
        const bg = new G();
        bg.poly(`M${f(bx - 58)} ${f(by - 110)} h116 v150 h-116 Z`, col);
        if (prop === 'clipboard') { bg.poly(`M${f(bx - 46)} ${f(by - 96)} h92 v124 h-92 Z`, '#fdfdfb'); bg.poly(`M${f(bx - 18)} ${f(by - 120)} h36 v18 h-36 Z`, '#b9bcc4'); bg.det(line(`M${f(bx - 34)} ${f(by - 70)} h60 M${f(bx - 34)} ${f(by - 52)} h60 M${f(bx - 34)} ${f(by - 34)} h40`, 4, '#9fb0c0')); }
        else bg.det(line(`M${f(bx - 46)} ${f(by - 108)} v146`, 3) + `<rect x="${f(bx - 30)}" y="${f(by - 86)}" width="60" height="26" rx="3" fill="#ffffffaa"/>`);
        out += `<g transform="rotate(${-side * 10} ${f(bx)} ${f(by)})">${bg}</g>`;
        out += drawHand(c, 'grip', wrist, [dir[0], dir[1]], side > 0);
      } else {
        out += drawHand(c, handKind || 'relax', wrist, [dir[0], dir[1]], side > 0, 1.22 * (pose.handScale || 1));
      }
    }
    return out;
  };
  s += arm(1, pose.armL, pose.handL, pose.pocketL, pose.propL, pose.reachL);   // brazo izquierdo del personaje (derecha de pantalla)
  s += arm(-1, pose.armR, pose.handR, pose.pocketR, pose.propR, pose.reachR);
  return `<g transform="scale(${c.scale})">${s}</g>`;
}
export { drawHand };
