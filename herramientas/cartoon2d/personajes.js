// Personajes 2D (SVG) – trazo grueso, colores planos.
export const O = '#17171c';
const R = Math.PI / 180;
const f = n => n.toFixed(1);

export function limb(pts, w, color, out = 11) {
  const d = 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L');
  return `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + out}" stroke-linecap="round" stroke-linejoin="round"/>` +
         `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
export function chain(x, y, a1, a2, L1, L2) {
  const ex = x + Math.sin(a1 * R) * L1, ey = y + Math.cos(a1 * R) * L1;
  const a = a1 + a2;
  return [[x, y], [ex, ey], [ex + Math.sin(a * R) * L2, ey + Math.cos(a * R) * L2]];
}
const P = (d, fill, sw = 6, extra = '') => `<path d="${d}" fill="${fill}" stroke="${O}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;

// ---------- CABEZAS ----------
function eyes(c, e) {
  // e: {open 0..1, look [-1..1], browL, browR (deg), lid}
  const open = e.open ?? 1, lx = (e.look ?? 0) * 5;
  let s = '';
  for (const side of [-1, 1]) {
    const x = side * c.eyeX, y = c.eyeY;
    const h = c.eyeH * open;
    if (open < 0.15) {
      s += `<path d="M${f(x - 15)} ${f(y + 2)} Q${f(x)} ${f(y + 8)} ${f(x + 15)} ${f(y + 2)}" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${c.eyeW}" ry="${f(h)}" fill="#fff" stroke="${O}" stroke-width="4"/>`;
      s += `<clipPath id="ec${c.id}${side}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${c.eyeW}" ry="${f(h)}"/></clipPath>`;
      s += `<g clip-path="url(#ec${c.id}${side})"><circle cx="${f(x + lx)}" cy="${f(y + 1)}" r="${c.iris}" fill="${c.irisCol}"/><circle cx="${f(x + lx)}" cy="${f(y + 1)}" r="${c.iris * .5}" fill="${O}"/><circle cx="${f(x + lx + 3)}" cy="${f(y - 3)}" r="2.6" fill="#fff"/>`;
      // párpado superior (mirada cansada)
      const lid = e.lid ?? c.lid ?? 0;
      if (lid > 0) s += `<rect x="${f(x - c.eyeW - 2)}" y="${f(y - h - 2)}" width="${c.eyeW * 2 + 4}" height="${f(h * 2 * lid + 2)}" fill="${c.skinD}"/><line x1="${f(x - c.eyeW)}" y1="${f(y - h + h * 2 * lid)}" x2="${f(x + c.eyeW)}" y2="${f(y - h + h * 2 * lid)}" stroke="${O}" stroke-width="4"/>`;
      s += `</g>`;
    }
    const b = side < 0 ? (e.browL ?? 0) : (e.browR ?? 0);
    const by = y - c.eyeH - 12 - (e.browUp?.[side < 0 ? 0 : 1] ?? 0);
    s += `<g transform="rotate(${side * b} ${f(x)} ${f(by)})"><path d="M${f(x - 20)} ${f(by + 3)} Q${f(x)} ${f(by - 6)} ${f(x + 20)} ${f(by + 1)}" fill="none" stroke="${c.brow}" stroke-width="${c.browW}" stroke-linecap="round"/></g>`;
  }
  return s;
}
function mouth(c, m, mood) {
  const y = c.mouthY, w = c.mouthW;
  const curve = { neutral: 0, smirk: 0, frown: -6, smile: 8, sad: -9 }[mood] ?? 0;
  if (m <= 0.05) {
    if (mood === 'smirk') return `<path d="M${-w} ${y + 2} Q${-2} ${y + 3} ${w + 4} ${y - 7}" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>`;
    return `<path d="M${-w} ${y} Q0 ${y + curve * 1.4} ${w} ${y}" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>`;
  }
  const h = 6 + m * 24, ww = w * (0.85 + m * 0.2);
  return `<path d="M${f(-ww)} ${y} Q0 ${f(y - 4 + curve)} ${f(ww)} ${y} Q${f(ww * .7)} ${f(y + h)} 0 ${f(y + h)} Q${f(-ww * .7)} ${f(y + h)} ${f(-ww)} ${y} Z" fill="#5b1f22" stroke="${O}" stroke-width="5" stroke-linejoin="round"/>` +
         (m > .35 ? `<path d="M${f(-ww * .5)} ${f(y + h - 3)} Q0 ${f(y + h - 12)} ${f(ww * .5)} ${f(y + h - 3)}" fill="#d9666a"/>` : '');
}

export const CAST = {
  house: {
    id: 'house', scale: 1, skin: '#e9b993', skinD: '#d9a27c', hairCol: '#7d6651', hairHi: '#9a836c', brow: '#4e3d30', browW: 7,
    irisCol: '#3f7fc4', eyeX: 30, eyeY: -12, eyeW: 15, eyeH: 9, iris: 8, lid: .38, mouthY: 62, mouthW: 22,
    jacket: '#62666e', jacketD: '#4c4f56', shirt: '#2a2c35', pants: '#4d6b93', pantsD: '#3e5a7e', shoe: '#e0661f', shoeD: '#f1f1ee',
    hips: -395, shoulders: -652, headY: -772, leg: 58, arm: 46, torsoW: 98,
  },
  ana: {
    id: 'ana', scale: .93, skin: '#c98d68', skinD: '#b67a57', hairCol: '#2a1c18', hairHi: '#4a3229', brow: '#2a1c18', browW: 6,
    irisCol: '#5a3a22', eyeX: 29, eyeY: -8, eyeW: 15, eyeH: 11, iris: 8.5, lid: 0, mouthY: 60, mouthW: 18,
    coat: '#f4f4f1', coatD: '#d9dde0', shirt: '#e98fae', pants: '#3b3d46', pantsD: '#2e3038', shoe: '#2b2b30', shoeD: '#444',
    hips: -395, shoulders: -650, headY: -770, leg: 52, arm: 42, torsoW: 86, lips: '#a24a54',
  },
  leo: {
    id: 'leo', scale: .97, skin: '#f0c7a6', skinD: '#ddb08e', hairCol: '#c48a45', hairHi: '#dca765', brow: '#8b5e2c', browW: 6,
    irisCol: '#4f8a55', eyeX: 29, eyeY: -8, eyeW: 15, eyeH: 11, iris: 8.5, lid: 0, mouthY: 60, mouthW: 20,
    coat: '#f4f4f1', coatD: '#d9dde0', shirt: '#9fc3e6', tie: '#2f4a7c', pants: '#55575f', pantsD: '#45474e', shoe: '#5a3a26', shoeD: '#6e4a33',
    hips: -395, shoulders: -652, headY: -772, leg: 56, arm: 44, torsoW: 94, glasses: true,
  },
};

function headHouse(c, e) {
  let s = '';
  s += `<path d="M-30 50 L-28 110 L28 110 L30 50 Z" fill="${c.skinD}" stroke="${O}" stroke-width="6"/>`; // cuello
  s += P('M-80 -10 Q-96 -14 -94 10 Q-92 32 -74 30 Z', c.skin) + P('M80 -10 Q96 -14 94 10 Q92 32 74 30 Z', c.skin);
  // cara alargada, mandíbula marcada
  s += P('M-78 -60 Q-84 10 -70 52 Q-52 98 -14 108 Q0 111 14 108 Q52 98 70 52 Q84 10 78 -60 Q0 -96 -78 -60 Z', c.skin);
  // barba de pocos días
  s += `<path d="M-72 40 Q-66 64 -50 82 Q-28 104 0 107 Q28 104 50 82 Q66 64 72 40 Q60 58 36 52 Q18 44 0 46 Q-18 44 -36 52 Q-60 58 -72 40 Z" fill="#7d6a5a" opacity=".38"/>`;
  s += `<path d="M-26 50 Q0 40 26 50 Q14 47 0 49 Q-14 47 -26 50 Z" fill="#6c5a4b" opacity=".45"/>`;
  // ojeras
  s += `<path d="M-46 4 Q-30 12 -14 4" fill="none" stroke="#b9876a" stroke-width="3" opacity=".7"/><path d="M14 4 Q30 12 46 4" fill="none" stroke="#b9876a" stroke-width="3" opacity=".7"/>`;
  // arrugas frente
  s += `<path d="M-30 -52 Q0 -58 30 -52" fill="none" stroke="#c48e6e" stroke-width="3"/><path d="M-24 -42 Q0 -47 24 -42" fill="none" stroke="#c48e6e" stroke-width="3"/>`;
  s += eyes(c, e);
  // nariz larga
  s += `<path d="M2 0 Q-4 26 -10 34 Q-2 40 10 36" fill="none" stroke="${O}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += mouth(c, e.mouth ?? 0, e.mood ?? 'neutral');
  // pelo corto despeinado, entradas
  s += P('M-84 -18 Q-92 -70 -64 -96 Q-58 -112 -34 -110 Q-24 -126 0 -118 Q18 -132 38 -116 Q62 -120 70 -98 Q94 -84 86 -22 Q80 -46 72 -58 Q66 -78 52 -80 Q40 -66 22 -84 Q10 -70 -6 -84 Q-22 -70 -36 -80 Q-56 -76 -70 -56 Q-78 -40 -84 -18 Z', c.hairCol);
  s += `<path d="M-50 -96 Q-30 -104 -14 -98 M10 -106 Q30 -112 48 -100" fill="none" stroke="${c.hairHi}" stroke-width="5" stroke-linecap="round"/>`;
  // patillas canosas
  s += `<path d="M-84 -18 L-80 8 L-76 -20 Z M84 -18 L80 8 L76 -20 Z" fill="#9b8b7c" stroke="${O}" stroke-width="3"/>`;
  return s;
}
function headAna(c, e) {
  let s = '';
  // pelo de atrás, rizado largo
  s += P('M-96 -30 Q-120 40 -104 110 Q-118 150 -80 170 Q-50 182 -40 150 L40 150 Q50 182 80 170 Q118 150 104 110 Q120 40 96 -30 Q80 -110 0 -112 Q-80 -110 -96 -30 Z', c.hairCol);
  s += `<path d="M-28 50 L-26 108 L26 108 L28 50 Z" fill="${c.skinD}" stroke="${O}" stroke-width="6"/>`;
  s += P('M-74 -50 Q-80 20 -62 60 Q-40 100 0 104 Q40 100 62 60 Q80 20 74 -50 Q0 -88 -74 -50 Z', c.skin);
  s += `<ellipse cx="-50" cy="32" rx="13" ry="7" fill="#d9776e" opacity=".45"/><ellipse cx="50" cy="32" rx="13" ry="7" fill="#d9776e" opacity=".45"/>`;
  s += eyes(c, e);
  for (const side of [-1, 1]) s += `<path d="M${side * 30 + side * 14} ${c.eyeY - 9} l${side * 7} -5" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`;
  s += `<path d="M0 6 Q-6 24 -8 30 Q0 34 8 30" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += mouth(c, e.mouth ?? 0, e.mood ?? 'neutral');
  // flequillo / volumen
  s += P('M-90 -10 Q-104 -96 -30 -110 Q20 -124 70 -98 Q104 -70 92 0 Q84 -40 60 -62 Q30 -50 6 -78 Q-20 -54 -60 -58 Q-80 -40 -90 -10 Z', c.hairCol);
  s += `<path d="M-60 -92 Q-30 -104 0 -100 M30 -104 Q56 -96 74 -78" fill="none" stroke="${c.hairHi}" stroke-width="5" stroke-linecap="round"/>`;
  s += `<circle cx="-78" cy="40" r="5" fill="#e8c35a" stroke="${O}" stroke-width="3"/><circle cx="78" cy="40" r="5" fill="#e8c35a" stroke="${O}" stroke-width="3"/>`;
  return s;
}
function headLeo(c, e) {
  let s = '';
  s += `<path d="M-30 50 L-28 108 L28 108 L30 50 Z" fill="${c.skinD}" stroke="${O}" stroke-width="6"/>`;
  s += P('M-80 -6 Q-96 -10 -94 12 Q-92 32 -74 30 Z', c.skin) + P('M80 -6 Q96 -10 94 12 Q92 32 74 30 Z', c.skin);
  s += P('M-78 -56 Q-84 20 -66 62 Q-42 104 0 106 Q42 104 66 62 Q84 20 78 -56 Q0 -92 -78 -56 Z', c.skin);
  s += `<ellipse cx="-52" cy="34" rx="12" ry="6" fill="#e48d7a" opacity=".35"/><ellipse cx="52" cy="34" rx="12" ry="6" fill="#e48d7a" opacity=".35"/>`;
  s += eyes(c, e);
  s += `<path d="M2 4 Q-5 24 -9 30 Q-1 35 9 31" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += mouth(c, e.mouth ?? 0, e.mood ?? 'neutral');
  // lentes
  if (c.glasses) s += `<g fill="#ffffff22" stroke="${O}" stroke-width="5"><rect x="-56" y="${c.eyeY - 20}" width="48" height="38" rx="12"/><rect x="8" y="${c.eyeY - 20}" width="48" height="38" rx="12"/><path d="M-8 ${c.eyeY - 4} Q0 ${c.eyeY - 10} 8 ${c.eyeY - 4}" fill="none"/></g>`;
  // pelo peinado con jopo
  s += P('M-84 -4 Q-94 -80 -50 -104 Q-10 -128 40 -116 Q90 -104 88 -4 Q80 -50 62 -64 Q20 -58 -10 -76 Q-30 -62 -60 -60 Q-78 -40 -84 -4 Z', c.hairCol);
  s += `<path d="M-40 -104 Q0 -118 40 -108" fill="none" stroke="${c.hairHi}" stroke-width="6" stroke-linecap="round"/>`;
  return s;
}
const HEADS = { house: headHouse, ana: headAna, leo: headLeo };

// ---------- CUERPO ----------
function shoe(c, x, dir) {
  return P(`M${x - 30 * dir} -38 Q${x - 34 * dir} -6 ${x - 26 * dir} 0 L${x + 44 * dir} 0 Q${x + 54 * dir} -4 ${x + 46 * dir} -18 Q${x + 30 * dir} -26 ${x + 18 * dir} -40 Z`, c.shoe, 6) +
    `<path d="M${x - 28 * dir} -6 L${x + 50 * dir} -6" stroke="${c.shoeD}" stroke-width="7"/>` +
    `<path d="M${x - 26 * dir} 0 L${x + 44 * dir} 0" stroke="${O}" stroke-width="6" stroke-linecap="round"/>`;
}
function hand(c, p, open = false) {
  return `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${c.id === 'ana' ? 19 : 21}" fill="${c.skin}" stroke="${O}" stroke-width="6"/>` +
    (open ? '' : `<path d="M${f(p[0] - 8)} ${f(p[1] - 4)} q4 6 0 12 M${f(p[0] + 2)} ${f(p[1] - 6)} q4 7 0 14" fill="none" stroke="${O}" stroke-width="3" opacity=".6"/>`);
}

// pose: {armL:[a1,a2], armR:[a1,a2], legs:'stand'|'cross', head:{tilt, dx}, face:{...}, prop:'cane'|'clipboard'|'notebook'}
export function drawCharacter(id, pose = {}) {
  const c = CAST[id];
  const face = pose.face || {};
  const sh = c.shoulders, hp = c.hips, tw = c.torsoW;
  const isCoat = !!c.coat;
  const top = isCoat ? c.coat : c.jacket, topD = isCoat ? c.coatD : c.jacketD;
  let s = '';
  // piernas
  const legL = pose.legs === 'cross' ? [[-34, hp], [-20, hp + 190], [24, -40]] : [[-36, hp], [-40, hp + 185], [-44, -40]];
  const legR = pose.legs === 'cross' ? [[34, hp], [30, hp + 190], [-18, -40]] : [[36, hp], [40, hp + 185], [44, -40]];
  s += limb(legR, c.leg, c.pants) + limb(legL, c.leg, c.pants);
  s += `<path d="M${legL[1][0] - 10} ${legL[1][1] - 40} l6 40 M${legR[1][0] + 8} ${legR[1][1] - 30} l-4 34" stroke="${c.pantsD}" stroke-width="4" stroke-linecap="round"/>`;
  s += shoe(c, legR[2][0], 1) + shoe(c, legL[2][0], -1);
  // brazo de atrás (derecho de pantalla)
  const shR = [tw - 12, sh + 26], shL = [-tw + 12, sh + 26];
  const armR = chain(shR[0], shR[1], ...(pose.armR || [-8, 10]), 150, 140);
  const armL = chain(shL[0], shL[1], ...(pose.armL || [8, -10]), 150, 140);
  // torso
  const bot = isCoat ? -250 : hp + 30;
  s += P(`M${-tw} ${sh + 4} Q${-tw - 14} ${sh + 120} ${-tw + 6} ${bot} L${tw - 6} ${bot} Q${tw + 14} ${sh + 120} ${tw} ${sh + 4} Q0 ${sh - 26} ${-tw} ${sh + 4} Z`, top);
  // camisa en V
  const vB = isCoat ? sh + 230 : sh + 130;
  s += P(`M-38 ${sh - 8} L0 ${vB} L38 ${sh - 8} Z`, c.shirt, 5);
  if (isCoat) s += P(`M-38 ${sh - 8} L-30 ${hp + 40} L30 ${hp + 40} L38 ${sh - 8} Z`, c.shirt, 5);
  if (c.tie) s += P(`M-9 ${sh + 2} L9 ${sh + 2} L14 ${sh + 150} L0 ${sh + 172} L-14 ${sh + 150} Z`, c.tie, 4) + `<path d="M-6 ${sh + 40} L10 ${sh + 30} M-10 ${sh + 90} L12 ${sh + 80}" stroke="#ffffff55" stroke-width="5"/>`;
  if (id === 'house') s += `<path d="M-30 ${sh - 2} L-12 ${sh + 30} L-4 ${sh} M30 ${sh - 2} L12 ${sh + 30} L4 ${sh}" fill="${c.shirt}" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>`;
  if (id === 'ana') s += `<path d="M-26 ${sh + 16} Q0 ${sh + 44} 26 ${sh + 16}" fill="none" stroke="#e8c35a" stroke-width="3"/>`;
  // solapas
  if (isCoat) {
    s += P(`M-40 ${sh - 10} L-62 ${sh + 70} L-38 ${sh + 90} L-8 ${vB + 10} L-26 ${bot} L${-tw + 6} ${bot} Q${-tw - 8} ${sh + 120} -60 ${sh + 20} Z`, top, 5);
    s += P(`M40 ${sh - 10} L62 ${sh + 70} L38 ${sh + 90} L8 ${vB + 10} L26 ${bot} L${tw - 6} ${bot} Q${tw + 8} ${sh + 120} 60 ${sh + 20} Z`, top, 5);
    s += P(`M-70 ${hp + 10} h44 v34 h-44 Z`, topD, 4) + P(`M30 ${hp + 10} h44 v34 h-44 Z`, topD, 4);
    s += `<rect x="38" y="${sh + 80}" width="34" height="42" rx="4" fill="#fff" stroke="${O}" stroke-width="4"/><rect x="43" y="${sh + 86}" width="12" height="14" fill="#8fb3d9"/><path d="M58 ${sh + 90} h10 M58 ${sh + 98} h10 M44 ${sh + 108} h24" stroke="${O}" stroke-width="3"/>`;
    s += `<path d="M-60 ${sh + 70} q8 -6 14 0 M52 ${sh + 20} l4 30" stroke="#5a7fc0" stroke-width="5" stroke-linecap="round"/>`;
  } else {
    s += P(`M-38 ${sh - 10} L-70 ${sh + 64} L-46 ${sh + 70} L-2 ${vB + 6} L-8 ${bot} L${-tw + 6} ${bot} Q${-tw - 8} ${sh + 120} -66 ${sh + 14} Z`, top, 5);
    s += P(`M38 ${sh - 10} L70 ${sh + 64} L46 ${sh + 70} L2 ${vB + 6} L8 ${bot} L${tw - 6} ${bot} Q${tw + 8} ${sh + 120} 66 ${sh + 14} Z`, top, 5);
    s += `<circle cx="-14" cy="${vB + 40}" r="6" fill="${topD}" stroke="${O}" stroke-width="3"/><circle cx="-14" cy="${vB + 90}" r="6" fill="${topD}" stroke="${O}" stroke-width="3"/>`;
    s += `<path d="M-80 ${hp - 30} h40 M40 ${hp - 30} h40" stroke="${topD}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<path d="M-60 ${sh + 150} q-10 40 -4 90 M58 ${sh + 160} q8 40 2 80" fill="none" stroke="${topD}" stroke-width="4" stroke-linecap="round"/>`;
  }
  // cabeza
  const hd = pose.head || {};
  s += `<g transform="translate(${hd.dx || 0} ${c.headY + (hd.dy || 0)}) rotate(${hd.tilt || 0} 0 100)">${HEADS[id](c, face)}</g>`;
  // brazos y props
  const prop = pose.prop;
  if (prop === 'cane') {
    const hnd = armL[2];
    s += limb(armL, c.arm, top);
    s += `<path d="M${f(hnd[0] - 6)} ${f(hnd[1] + 10)} L${f(hnd[0] - 40)} -2" stroke="${O}" stroke-width="20" stroke-linecap="round"/><path d="M${f(hnd[0] - 6)} ${f(hnd[1] + 10)} L${f(hnd[0] - 40)} -2" stroke="#6e4127" stroke-width="10" stroke-linecap="round"/>`;
    s += `<path d="M${f(hnd[0] - 6)} ${f(hnd[1] + 10)} Q${f(hnd[0] - 4)} ${f(hnd[1] - 36)} ${f(hnd[0] + 30)} ${f(hnd[1] - 26)}" fill="none" stroke="${O}" stroke-width="20" stroke-linecap="round"/><path d="M${f(hnd[0] - 6)} ${f(hnd[1] + 10)} Q${f(hnd[0] - 4)} ${f(hnd[1] - 36)} ${f(hnd[0] + 30)} ${f(hnd[1] - 26)}" fill="none" stroke="#6e4127" stroke-width="10" stroke-linecap="round"/>`;
    s += `<rect x="${f(hnd[0] - 50)}" y="-14" width="20" height="14" rx="3" fill="${O}"/>`;
    s += hand(c, hnd);
  } else {
    s += limb(armL, c.arm, top) + hand(c, armL[2], true);
  }
  if (pose.pocketR) {
    s += limb(armR, c.arm, top);
    s += `<path d="M${f(armR[2][0] - 24)} ${f(armR[2][1] - 6)} h46" stroke="${O}" stroke-width="6" stroke-linecap="round"/>`;
  } else if (prop === 'clipboard' || prop === 'notebook') {
    const hp2 = armR[2];
    const col = prop === 'clipboard' ? '#a8784c' : '#d44a3a';
    s += limb(armR, c.arm, top);
    s += `<g transform="rotate(-12 ${f(hp2[0])} ${f(hp2[1])})"><rect x="${f(hp2[0] - 52)}" y="${f(hp2[1] - 92)}" width="92" height="120" rx="6" fill="${col}" stroke="${O}" stroke-width="6"/>` +
      (prop === 'clipboard' ? `<rect x="${f(hp2[0] - 42)}" y="${f(hp2[1] - 80)}" width="72" height="96" fill="#fff" stroke="${O}" stroke-width="3"/><rect x="${f(hp2[0] - 20)}" y="${f(hp2[1] - 98)}" width="28" height="14" rx="3" fill="#bbb" stroke="${O}" stroke-width="4"/><path d="M${f(hp2[0] - 32)} ${f(hp2[1] - 60)} h50 M${f(hp2[0] - 32)} ${f(hp2[1] - 44)} h50 M${f(hp2[0] - 32)} ${f(hp2[1] - 28)} h36" stroke="#9aa" stroke-width="4"/>` : `<path d="M${f(hp2[0] - 40)} ${f(hp2[1] - 92)} v120" stroke="${O}" stroke-width="4"/>`) + `</g>`;
    s += hand(c, hp2);
  } else {
    s += limb(armR, c.arm, top) + hand(c, armR[2], true);
  }
  return `<g transform="scale(${c.scale})">${s}</g>`;
}
