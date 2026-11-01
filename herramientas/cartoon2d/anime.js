// Personajes 2D estilo anime (SVG). Contorno por doble pasada + sombras cel.
export const O = '#221c26';
const LW = 3.4;               // grosor de contorno (por lado)
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
const line = (d, w = 3, col = O, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
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
const HANDS = {
  relax: { palm: [[-14, 0], [14, 0], [21, 38], [-20, 40]], fingers: [[[14, 36], [16, 58], [13, 74], 10], [[2, 38], [3, 64], [0, 80], 10.5], [[-10, 38], [-11, 61], [-13, 75], 10], [[-21, 34], [-23, 52], [-24, 64], 9]], thumb: [[17, 10], [28, 28], [27, 48], 11.5] },
  open: { palm: [[-14, 0], [14, 0], [21, 38], [-20, 40]], fingers: [[[14, 36], [20, 60], [24, 78], 10], [[3, 38], [5, 64], [6, 84], 10.5], [[-9, 38], [-12, 62], [-14, 78], 10], [[-20, 34], [-27, 52], [-31, 64], 9]], thumb: [[17, 12], [34, 24], [46, 32], 11.5] },
  point: { palm: [[-14, 0], [14, 0], [21, 38], [-20, 40]], fingers: [[[14, 36], [16, 62], [17, 88], 10], [[2, 38], [3, 50], [6, 54], 10.5], [[-10, 38], [-10, 50], [-7, 53], 10], [[-21, 34], [-21, 45], [-18, 48], 9]], thumb: [[17, 12], [16, 34], [6, 46], 11.5] },
  fist: { palm: [[-19, 0], [19, 0], [22, 38], [-21, 40]], fingers: [[[14, 36], [15, 52], [11, 56], 11], [[2, 38], [3, 54], [-1, 58], 11.5], [[-10, 38], [-10, 53], [-13, 56], 11], [[-20, 34], [-20, 48], [-22, 50], 10]], thumb: [[18, 14], [18, 38], [6, 48], 12] },
  grip: { palm: [[-19, 0], [19, 0], [22, 36], [-21, 38]], fingers: [[[15, 34], [18, 46], [10, 56], 11], [[3, 36], [6, 50], [-2, 59], 11.5], [[-9, 36], [-6, 50], [-14, 57], 11], [[-19, 32], [-16, 45], [-23, 50], 10]], thumb: [[18, 12], [26, 32], [16, 46], 12] },
};
function drawHand(c, kind, wrist, dir, mirror, scale = .98) {
  const h = HANDS[kind] || HANDS.relax;
  const g = new G();
  const k = mirror ? -1 : 1;
  // pulgar detrás de la palma en "relax/open", delante en fist/grip/point
  const thumbFront = ['fist', 'grip', 'point'].includes(kind);
  const P = p => [p[0] * k, p[1]];
  const fing = () => h.fingers.forEach(fi => g.seg([P(fi[0]), P(fi[1]), P(fi[2])], fi[3], c.skin));
  if (!thumbFront) g.seg([P(h.thumb[0]), P(h.thumb[1]), P(h.thumb[2])], h.thumb[3], c.skin);
  fing();
  g.poly(pl(h.palm.map(P)) + 'Z', c.skin, 12);
  if (thumbFront) g.seg([P(h.thumb[0]), P(h.thumb[1]), P(h.thumb[2])], h.thumb[3], c.skin);
  // nudillos / sombra
  g.det(line(pl([P([-14, 30]), P([12, 30])]), 2, c.skinS, 'opacity=".9"'));
  g.det(`<path d="${pl([P([20, 4]), P([24, 38]), P([10, 40])])}" fill="${c.skinS}" opacity=".55"/>`);
  const ang = Math.atan2(-dir[0], dir[1]) / R;
  return `<g transform="translate(${f(wrist[0])} ${f(wrist[1])}) rotate(${f(ang)}) scale(${scale})">${g}</g>`;
}

// ---------------- CARAS ----------------
function animeEyes(c, e, id) {
  const open = e.open ?? 1;
  let s = '';
  for (const side of [-1, 1]) {
    const x = side * c.ex, y = c.ey, w = c.ew, h = c.eh;
    const o = q => [x + side * q[0], y + q[1]];  // q[0] hacia afuera
    const lidT = Math.min(.95, Math.max(e.lid ?? c.lid ?? 0, 1 - open));
    const lidY = y - h + 2 * h * lidT;
    if (open < 0.12) {
      s += line(`M${f(o([-w, 2])[0])} ${f(y + 2)} Q${f(x)} ${f(y + 9)} ${f(o([w + 2, 0])[0])} ${f(y)}`, 5);
    } else {
      const cid = `e${id}${side}`;
      s += `<clipPath id="${cid}"><path d="M${f(x - w - 4)} ${f(lidY)} H${f(x + w + 4)} V${f(y + h + 4)} H${f(x - w - 4)} Z"/></clipPath>`;
      s += `<clipPath id="${cid}b"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${w}" ry="${h}"/></clipPath>`;
      const lx = (e.look?.[0] ?? e.look ?? 0) * w * .35, ly = (e.look?.[1] ?? 0) * h * .25;
      s += `<g clip-path="url(#${cid})"><g clip-path="url(#${cid}b)">`;
      s += `<rect x="${f(x - w)}" y="${f(y - h)}" width="${2 * w}" height="${2 * h}" fill="#fff"/>`;
      s += `<rect x="${f(x - w)}" y="${f(y - h)}" width="${2 * w}" height="${f(h * .45)}" fill="#c9d3e6"/>`;
      const ix = x + lx, iy = y + 2 + ly, irx = w * .62, iry = h * .92;
      s += `<ellipse cx="${f(ix)}" cy="${f(iy)}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#ig_${c.id})" stroke="${c.irisD}" stroke-width="2.5"/>`;
      s += `<ellipse cx="${f(ix)}" cy="${f(iy + 1)}" rx="${f(irx * .42)}" ry="${f(iry * .5)}" fill="${O}"/>`;
      s += `<ellipse cx="${f(ix - irx * .38)}" cy="${f(iy - iry * .42)}" rx="${f(irx * .32)}" ry="${f(iry * .26)}" fill="#fff"/>`;
      s += `<circle cx="${f(ix + irx * .42)}" cy="${f(iy + iry * .42)}" r="${f(irx * .16)}" fill="#fff" opacity=".9"/>`;
      s += `</g></g>`;
      // pestañas
      const top = lidT > 0.08
        ? `M${f(o([-w - 2, 0])[0])} ${f(lidY + 3)} Q${f(x)} ${f(lidY - 4)} ${f(o([w + 3, 0])[0])} ${f(lidY + 1)}`
        : `M${f(o([-w - 2, 2])[0])} ${f(y + 2)} Q${f(o([-w * .4, 0])[0])} ${f(y - h - 6)} ${f(o([w * .55, 0])[0])} ${f(y - h - 1)} Q${f(o([w + 3, 0])[0])} ${f(y - h * .6)} ${f(o([w + 5, 0])[0])} ${f(y - h * .05)}`;
      s += line(top, c.lash, O);
      if (c.flick) s += line(`M${f(o([w + 1, 0])[0])} ${f(y - h * .45)} L${f(o([w + 11, 0])[0])} ${f(y - h * .8)}`, 4);
      s += line(`M${f(o([-w * .55, 0])[0])} ${f(y + h * .9)} Q${f(o([w * .2, 0])[0])} ${f(y + h * 1.08)} ${f(o([w * .85, 0])[0])} ${f(y + h * .62)}`, 2.4, c.lower || O);
      if (c.bags) s += line(`M${f(o([-w * .7, 0])[0])} ${f(y + h + 7)} Q${f(o([0, 0])[0])} ${f(y + h + 12)} ${f(o([w * .8, 0])[0])} ${f(y + h + 4)}`, 2, c.skinS);
    }
    // ceja
    const b = side < 0 ? (e.browL ?? 0) : (e.browR ?? 0);
    const up = e.browUp ? e.browUp[side < 0 ? 0 : 1] : 0;
    const by = y - h - c.browGap - up;
    s += `<g transform="rotate(${f(-side * b)} ${f(x)} ${f(by)})"><path d="M${f(o([-w - 2, 0])[0])} ${f(by + 3)} Q${f(o([0, 0])[0])} ${f(by - 5)} ${f(o([w + 4, 0])[0])} ${f(by + 1)} Q${f(o([0, 0])[0])} ${f(by - 1)} ${f(o([-w - 2, 0])[0])} ${f(by + 3)} Z" fill="${c.brow}" stroke="${c.brow}" stroke-width="${c.browW}" stroke-linejoin="round"/></g>`;
  }
  return s;
}
function animeMouth(c, e) {
  const y = c.my, m = e.mouth ?? 0, mood = e.mood ?? 'neutral';
  if (m <= 0.05) {
    if (mood === 'smirk') return line(`M-13 ${y + 2} Q2 ${y + 4} 17 ${y - 6}`, 3.2);
    if (mood === 'smile') return line(`M-15 ${y - 2} Q0 ${y + 9} 15 ${y - 2}`, 3.2);
    if (mood === 'frown') return line(`M-12 ${y + 3} Q0 ${y - 3} 12 ${y + 3}`, 3.2);
    return line(`M-11 ${y} Q0 ${y + 2} 11 ${y}`, 3);
  }
  const h = 5 + m * 16, w = 11 + m * 4 + (mood === 'smile' ? 4 : 0);
  const tilt = mood === 'smirk' ? -5 : 0;
  return `<path d="M${-w} ${y} Q0 ${y - 3 + (mood === 'smile' ? 4 : 0)} ${w} ${y + tilt} Q${f(w * .6)} ${f(y + h)} 0 ${f(y + h)} Q${f(-w * .6)} ${f(y + h)} ${-w} ${y} Z" fill="#6a2430" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>` +
    (m > .3 ? `<path d="M${f(-w * .45)} ${f(y + h - 2)} Q0 ${f(y + h - 9)} ${f(w * .45)} ${f(y + h - 2)} Z" fill="#e0707a"/>` : '') +
    `<path d="M${f(-w * .7)} ${y + 1} L${f(w * .7)} ${y + 1 + tilt * .5} L${f(w * .6)} ${y + 4} L${f(-w * .6)} ${y + 4} Z" fill="#fff"/>`;
}
const defs = c => `<defs><linearGradient id="ig_${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.irisD}"/><stop offset=".55" stop-color="${c.iris}"/><stop offset="1" stop-color="${c.irisL}"/></linearGradient></defs>`;

function face(c, e, id, hairBack, hairFront, extras = '') {
  const g = new G();
  let s = defs(c);
  if (hairBack) { const hb = new G(); hb.poly(hairBack, c.hair, 0, 'miter'); hb.sh(c.hairBackShade || ''); s += hb; }
  // cuello
  const nk = new G(); nk.poly(`M-20 40 L-22 150 L22 150 L20 40 Z`, c.skin);
  nk.sh(`<path d="M-21 60 Q0 104 21 60 L21 40 L-21 40 Z" fill="${c.skinS}"/>`); s += nk;
  // orejas + cara
  const fg = new G();
  fg.poly(`M-56 -6 Q-74 -16 -72 8 Q-70 30 -52 34 Z`, c.skin);
  fg.poly(`M56 -6 Q74 -16 72 8 Q70 30 52 34 Z`, c.skin);
  fg.poly(c.jaw, c.skin);
  fg.sh(`<path d="M44 -40 Q60 10 50 46 Q34 72 8 ${c.chin - 2} Q40 70 54 28 Q60 -10 56 -40 Z" fill="${c.skinS}"/>`);
  fg.sh(line('M-66 4 Q-62 14 -58 22', 2.4, c.skinS) + line('M66 4 Q62 14 58 22', 2.4, c.skinS));
  s += fg;
  if (c.stubble) s += `<path d="${c.stubble}" fill="${c.stubbleCol}" opacity=".5"/>` + Array.from({ length: 46 }, (_, i) => { const a = (i * 137.5) % 360 * R, r = 30 + (i * 7919 % 26); const x = Math.cos(a) * r * .95, y = 52 + Math.abs(Math.sin(a)) * r * .7 - 14; return y > 40 && Math.abs(x) < 52 ? `<circle cx="${f(x)}" cy="${f(y)}" r="1.1" fill="#5a4a40" opacity=".55"/>` : ''; }).join('');
  if (c.blush) s += [-1, 1].map(sd => line(`M${sd * 42 - 9} 38 l6 -8 M${sd * 42 - 2} 38 l6 -8 M${sd * 42 + 5} 38 l6 -8`, 2.2, '#e5707a', 'opacity=".75"')).join('');
  // sombra del flequillo
  if (c.bangShade) s += `<path d="${c.bangShade}" fill="${c.skinS}"/>`;
  s += animeEyes(c, e, id);
  s += line(c.nose, 2.6, c.noseCol || '#9a6a55');
  s += animeMouth(c, e);
  s += extras;
  const hf = new G(); hf.poly(hairFront, c.hair, 0, 'miter'); hf.sh(c.hairShade || ''); s += hf;
  s += c.hairHi || '';
  if (c.glasses) s += `<g fill="#ffffff18" stroke="${O}" stroke-width="3.5"><rect x="-54" y="${c.ey - 22}" width="46" height="38" rx="9"/><rect x="8" y="${c.ey - 22}" width="46" height="38" rx="9"/></g>` + line(`M-8 ${c.ey - 8} Q0 ${c.ey - 13} 8 ${c.ey - 8} M-54 ${c.ey - 10} L-66 ${c.ey - 14} M54 ${c.ey - 10} L66 ${c.ey - 14}`, 3.5) + line(`M-46 ${c.ey - 14} l10 -4 M16 ${c.ey - 14} l10 -4`, 3, '#fff', 'opacity=".8"');
  return s;
}

export const CAST = {
  house: {
    id: 'house', scale: 1, skin: '#f2c9a8', skinS: '#d9a283', hair: '#6d5a4c', hairS: '#4c3e35',
    iris: '#4f8fd6', irisD: '#1f3f78', irisL: '#9cd0ff', ex: 27, ey: 4, ew: 17, eh: 13, lid: .42, lash: 5, browGap: 9, brow: '#3f322b', browW: 4, my: 64, bags: true,
    jacket: '#5d6068', jacketS: '#45474e', shirt: '#2a2a33', shirtS: '#1c1c22', pants: '#4f6f9c', pantsS: '#3c5579', shoe: '#e8692a', shoeS: '#b74d1c', sole: '#f2f2ee',
    shoulderW: 84, waistW: 64, hipY: -470, shoulderY: -715, headY: -826, headS: .9, armW: [44, 38, 30],
    jaw: 'M-58 -50 L-58 10 Q-58 40 -48 56 L-18 88 Q0 98 18 88 L48 56 Q58 40 58 10 L58 -50 Z', chin: 96,
    stubble: 'M-56 22 Q-54 46 -44 58 L-18 88 Q0 98 18 88 L44 58 Q54 46 56 22 Q46 46 26 48 Q10 44 0 46 Q-10 44 -26 48 Q-46 46 -56 22 Z', stubbleCol: '#b49582',
    nose: 'M4 12 L-2 42 L6 44',
    hairFront: 'M-62 -2 L-64 -40 L-74 -52 L-64 -64 L-70 -84 L-50 -90 L-44 -108 L-24 -102 L-10 -116 L4 -104 L22 -114 L32 -98 L52 -102 L52 -86 L72 -76 L62 -62 L72 -46 L62 -40 L62 -2 L54 -30 L46 -48 L38 -34 L28 -54 L16 -40 L4 -58 L-8 -38 L-20 -54 L-30 -36 L-42 -50 L-52 -30 Z',
    hairShade: '<path d="M-62 -2 L-64 -36 L-56 -40 L-52 -30 Z M62 -2 L64 -36 L56 -40 L54 -30 Z M46 -48 L56 -66 L62 -62 L72 -46 L62 -40 L62 -2 L54 -30 Z" fill="#4c3e35"/><path d="M-66 -42 L-62 -2 L-58 -24 L-60 -40 Z M66 -42 L62 -2 L58 -24 L60 -40 Z" fill="#a39385"/>',
    hairHi: '<path d="M-38 -86 L-26 -92 L-16 -84 L-4 -94 L6 -86 L18 -96 L30 -88 L24 -78 L14 -84 L4 -74 L-6 -84 L-18 -74 L-28 -82 Z" fill="#8f7a6a"/>',
    bangShade: 'M-58 -30 L-52 -24 L-42 -46 L-30 -30 L-20 -50 L-8 -32 L4 -54 L16 -34 L28 -50 L38 -28 L46 -42 L54 -22 L58 -26 L58 -40 L-58 -40 Z',
  },
  ana: {
    id: 'ana', scale: .93, skin: '#e9b48e', skinS: '#cc8d68', hair: '#2b1e26', hairS: '#160f14',
    iris: '#a0602e', irisD: '#4a2410', irisL: '#e3a25a', ex: 27, ey: 8, ew: 19, eh: 17, lid: 0, lash: 6.5, flick: true, browGap: 11, brow: '#2b1e26', browW: 3, my: 64, blush: true,
    coat: '#f6f7f8', coatS: '#cdd5de', shirt: '#ee8fb0', shirtS: '#c96d8e', pants: '#3a3c48', pantsS: '#2a2c36', shoe: '#2c2a30', shoeS: '#18171b', sole: '#57545c',
    shoulderW: 72, waistW: 54, hipY: -470, shoulderY: -715, headY: -826, headS: .9, armW: [38, 33, 27],
    jaw: 'M-56 -50 L-57 8 Q-56 36 -46 52 Q-26 80 -6 92 Q0 95 6 92 Q26 80 46 52 Q56 36 57 8 L56 -50 Z', chin: 94,
    nose: 'M3 30 L-1 40 L4 41', noseCol: '#b8775a',
    hairBack: 'M-64 -60 Q-96 20 -92 120 L-106 214 L-80 192 L-70 226 L-52 182 L52 182 L70 226 L80 192 L106 214 L92 120 Q96 20 64 -60 Z',
    hairBackShade: '<path d="M-52 182 L-60 100 L-40 60 L40 60 L60 100 L52 182 Z" fill="#160f14"/>',
    hairFront: 'M-66 -20 Q-76 -100 -6 -110 Q66 -114 74 -40 L72 20 L66 88 L58 34 L54 -18 L46 -34 L40 -2 L30 -42 L16 -16 L8 -48 L-6 -12 L-18 -44 L-32 -8 L-42 -38 L-50 -16 L-56 34 L-64 90 L-70 20 Z',
    hairShade: '<path d="M54 -18 L58 34 L66 88 L70 30 L66 -10 Z M-56 34 L-64 90 L-68 30 L-64 -4 L-50 -16 Z" fill="#160f14"/>',
    hairHi: '<path d="M-44 -84 L-30 -92 L-20 -82 L-6 -94 L6 -82 L20 -94 L32 -84 L44 -90 L36 -74 L22 -80 L8 -70 L-6 -80 L-20 -70 L-32 -78 Z" fill="#5a4252"/>',
    bangShade: 'M-56 -14 L-50 -6 L-42 -30 L-32 4 L-18 -30 L-6 2 L8 -34 L16 -2 L30 -28 L40 10 L46 -20 L54 -4 L56 -40 L-56 -40 Z',
  },
  leo: {
    id: 'leo', scale: .97, skin: '#f6d2b4', skinS: '#dcaa88', hair: '#c98b46', hairS: '#9a6430',
    iris: '#3f9a63', irisD: '#174a2c', irisL: '#8fe0a8', ex: 27, ey: 6, ew: 18, eh: 16, lid: 0, lash: 5, browGap: 12, brow: '#8a5a2c', browW: 3.5, my: 64, glasses: true,
    coat: '#f6f7f8', coatS: '#cdd5de', shirt: '#a9cdee', shirtS: '#7fa8d0', tie: '#2c4f8a', pants: '#545660', pantsS: '#41434b', shoe: '#5b3b27', shoeS: '#3e2718', sole: '#2a1d16',
    shoulderW: 80, waistW: 60, hipY: -470, shoulderY: -715, headY: -826, headS: .9, armW: [42, 36, 29],
    jaw: 'M-58 -50 L-58 8 Q-58 38 -48 54 Q-28 82 -6 93 Q0 96 6 93 Q28 82 48 54 Q58 38 58 8 L58 -50 Z', chin: 95,
    nose: 'M3 28 L-1 40 L5 41',
    hairFront: 'M-64 -6 L-70 -54 Q-62 -102 -14 -110 L4 -132 L18 -110 Q66 -106 72 -54 L66 -6 L58 -38 L48 -22 L44 -50 L30 -26 L22 -54 L8 -28 L-2 -56 L-14 -28 L-24 -54 L-36 -24 L-44 -48 L-56 -20 Z',
    hairShade: '<path d="M58 -38 L66 -6 L70 -48 L62 -60 Z M-56 -20 L-64 -6 L-68 -50 L-60 -58 Z" fill="#9a6430"/>',
    hairHi: '<path d="M-40 -88 L-26 -96 L-16 -86 L-2 -98 L10 -86 L24 -98 L36 -86 L26 -76 L12 -82 L0 -72 L-12 -82 L-26 -72 Z" fill="#eab273"/>',
    bangShade: 'M-56 -16 L-44 -42 L-36 -18 L-24 -48 L-14 -22 L-2 -50 L8 -22 L22 -48 L30 -20 L44 -44 L48 -16 L58 -32 L58 -40 L-58 -40 Z',
  },
};

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
  const coat = !!c.coat, top = coat ? c.coat : c.jacket, topS = coat ? c.coatS : c.jacketS;
  let s = '';
  // piernas
  const st = pose.legs === 'wide' ? 14 : 0;
  const legR = [[30, hp + 10], [36 + st, -245], [40 + st, -44]], legL = [[-30, hp + 10], [-36 - st, -245], [-40 - st, -44]];
  const lg = new G();
  taper(lg, legR, [62, 52, 40], c.pants, c.pantsS);
  taper(lg, legL, [62, 52, 40], c.pants, c.pantsS);
  lg.poly(`M${-ww - 2} ${hp - 20} L${ww + 2} ${hp - 20} L${ww + 2} ${hp + 30} L4 ${hp + 70} L-4 ${hp + 70} L${-ww - 2} ${hp + 30} Z`, c.pants);
  lg.det(line(`M0 ${hp + 20} L0 ${hp + 66}`, 2.6) + line(`M-22 -300 l4 40 M24 -310 l-3 36`, 2, c.pantsS));
  s += lg + shoe(c, legR[2][0], 1) + shoe(c, legL[2][0], -1);
  // torso
  const bot = coat ? -300 : hp + 34, flare = coat ? 18 : 2;
  const tg = new G();
  const torso = `M${-sw} ${sh} Q${-sw - 6} ${sh + 80} ${-ww} ${hp - 40} L${-ww - flare} ${bot} L${ww + flare} ${bot} L${ww} ${hp - 40} Q${sw + 6} ${sh + 80} ${sw} ${sh} Q${sw * .5} ${sh - 22} 0 ${sh - 20} Q${-sw * .5} ${sh - 22} ${-sw} ${sh} Z`;
  tg.poly(torso, top);
  tg.sh(`<clipPath id="tc${uid}"><path d="${torso}"/></clipPath><g clip-path="url(#tc${uid})"><path d="M${ww * .55} ${sh - 30} Q${sw * .9} ${sh + 120} ${ww * .7} ${bot + 10} L${sw + 40} ${bot + 10} L${sw + 40} ${sh - 30} Z" fill="${topS}"/></g>`);
  // camisa
  const vB = coat ? sh + 210 : sh + 140;
  tg.poly(`M-30 ${sh - 18} L0 ${vB} L30 ${sh - 18} Z`, c.shirt);
  if (coat) tg.poly(`M-30 ${sh - 18} L-26 ${hp + 40} L26 ${hp + 40} L30 ${sh - 18} Z`, c.shirt);
  tg.sh(`<path d="M12 ${sh - 14} L28 ${sh - 14} L24 ${coat ? hp + 40 : vB - 30} L8 ${coat ? hp + 40 : vB - 60} Z" fill="${c.shirtS}"/>`);
  if (c.tie) { tg.poly(`M-8 ${sh - 6} L8 ${sh - 6} L13 ${sh + 150} L0 ${sh + 170} L-13 ${sh + 150} Z`, c.tie); tg.det(line(`M-6 ${sh + 40} L9 ${sh + 30} M-9 ${sh + 90} L11 ${sh + 80} M-11 ${sh + 140} L12 ${sh + 130}`, 4, '#ffffff40')); }
  if (id === 'house') tg.det(`<path d="M-28 ${sh - 16} L-10 ${sh + 22} L-2 ${sh - 10} M28 ${sh - 16} L10 ${sh + 22} L2 ${sh - 10}" fill="${c.shirt}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`);
  if (id === 'ana') tg.det(line(`M-22 ${sh + 8} Q0 ${sh + 34} 22 ${sh + 8}`, 2, '#f0c860') + `<circle cx="0" cy="${sh + 33}" r="4" fill="#f0c860" stroke="${O}" stroke-width="2"/>`);
  s += tg;
  // solapas
  const lp = new G();
  if (coat) {
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
  s += `<g transform="translate(${hd.dx || 0} ${c.headY + (hd.dy || 0)}) rotate(${hd.tilt || 0} 0 120) scale(${c.headS})">${face(c, pose.face || {}, uid, c.hairBack, c.hairFront)}</g>`;
  // brazos
  const [L1, L2] = [158, 138];
  const arm = (side, ang, handKind, pocket, prop) => {
    const sx = side * (sw - 14), sy = sh + 20;
    const a = ang || [6, -8];
    const pts = chain(sx, sy, side * a[0], side * a[1], L1, L2);
    const ag = new G();
    let out = '';
    if (pocket) { pts[2] = [pts[1][0] + (pts[2][0] - pts[1][0]) * .78, pts[1][1] + (pts[2][1] - pts[1][1]) * .78]; }
    taper(ag, pts, c.armW, top, topS);
    const dir = [pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]], dl = Math.hypot(...dir);
    const cx = pts[2][0] - dir[0] / dl * 14, cy = pts[2][1] - dir[1] / dl * 14, nx = -dir[1] / dl, ny = dir[0] / dl;
    ag.det(line(`M${f(cx + nx * 15)} ${f(cy + ny * 15)} L${f(cx - nx * 15)} ${f(cy - ny * 15)}`, 2.6));
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
        out += drawHand(c, handKind || 'relax', wrist, [dir[0], dir[1]], side > 0);
      }
    }
    return out;
  };
  s += arm(1, pose.armL, pose.handL, pose.pocketL, pose.propL);   // brazo izquierdo del personaje (derecha de pantalla)
  s += arm(-1, pose.armR, pose.handR, pose.pocketR, pose.propR);
  return `<g transform="scale(${c.scale})">${s}</g>`;
}
export { drawHand };
