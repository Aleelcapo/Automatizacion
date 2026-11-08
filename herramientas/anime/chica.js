// Personaje anime de busto, dibujado en SVG con sombreado cel de 2 tonos.
const O = '#3a2230';
const f = n => (+n).toFixed(1);
export const P = { skin: '#ffe1cf', skinS: '#f2b9a2', skinD: '#e59a86', hair: '#6b3a2a', hairS: '#4a2418', hairH: '#a8603e', iris1: '#2a3a8a', iris2: '#4f7fe0', iris3: '#a9d8ff', cloth: '#f4f1ec', clothS: '#cfc8d6', tie: '#d8455a' };
const line = (d, w, c = O, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const shape = (d, fill, w = 5) => `<path d="${d}" fill="${fill}" stroke="${O}" stroke-width="${w}" stroke-linejoin="round"/>`;

function eye(side, e, t) {
  // side: -1 izquierda pantalla, 1 derecha
  const cx = side * 100, cy = 40, open = e.open ?? 1, wide = e.wide ?? 1, sm = e.small ?? 0; // sm: pupila chica (susto)
  const h = 62 * wide * open, w = 74;
  if (open < .12) return line(`M${cx - 70} ${cy + 6} Q${cx} ${cy + 26} ${cx + 70} ${cy + 4}`, 7) + line(`M${cx + side * 62} ${cy} l${side * 16} -8`, 5);
  const lx = (e.look?.[0] || 0) * 18, ly = (e.look?.[1] || 0) * 12;
  const id = 'e' + (side > 0 ? 'r' : 'l');
  const shapeD = `M${cx - w} ${cy + 4} Q${cx - w * .7} ${cy - h * 1.05} ${cx} ${cy - h} Q${cx + w * .8} ${cy - h * .95} ${cx + w} ${cy - h * .25} Q${cx + w * .9} ${cy + h * .8} ${cx} ${cy + h * .9} Q${cx - w * .85} ${cy + h * .75} ${cx - w} ${cy + 4} Z`;
  const ir = 46, irh = 58 * Math.min(1.05, wide);
  let s = `<clipPath id="${id}"><path d="${shapeD}"/></clipPath><path d="${shapeD}" fill="#fff"/>`;
  s += `<g clip-path="url(#${id})"><rect x="${cx - w}" y="${cy - h - 10}" width="${2 * w}" height="${h * .55}" fill="#d8dcef"/>`;
  s += `<ellipse cx="${f(cx + lx)}" cy="${f(cy + 8 + ly)}" rx="${ir}" ry="${f(irh)}" fill="url(#irisG)" stroke="#1a1f4a" stroke-width="4"/>`;
  s += `<ellipse cx="${f(cx + lx)}" cy="${f(cy + 8 + ly)}" rx="${ir * .78}" ry="${f(irh * .8)}" fill="none" stroke="#7fb3ff" stroke-width="3" opacity=".6"/>`;
  s += `<ellipse cx="${f(cx + lx)}" cy="${f(cy + 14 + ly)}" rx="${f(ir * (.42 - sm * .25))}" ry="${f(irh * (.5 - sm * .28))}" fill="#10123a"/>`;
  s += `<path d="M${f(cx + lx - ir * .8)} ${f(cy + 8 + ly + irh * .35)} Q${f(cx + lx)} ${f(cy + 8 + ly + irh * .95)} ${f(cx + lx + ir * .8)} ${f(cy + 8 + ly + irh * .35)}" fill="#bfe6ff" opacity=".55"/>`;
  s += `<ellipse cx="${f(cx + lx - 16)}" cy="${f(cy - 22 + ly)}" rx="17" ry="13" fill="#fff"/><circle cx="${f(cx + lx + 20)}" cy="${f(cy + 36 + ly)}" r="7" fill="#fff" opacity=".95"/>`;
  s += `<circle cx="${f(cx + lx + 24)}" cy="${f(cy - 14 + ly)}" r="${3 + 1.5 * Math.abs(Math.sin(t * 3))}" fill="#fff"/></g>`;
  // pestañas superiores gruesas + aleta
  s += `<path d="M${cx - w - 6} ${cy + 8} Q${cx - w * .7} ${cy - h * 1.12} ${cx} ${cy - h * 1.06} Q${cx + w * .8} ${cy - h} ${cx + w + 10} ${cy - h * .2} L${cx + w + 22} ${cy - h * .4} Q${cx + w * .9} ${cy - h * 1.25} ${cx} ${cy - h * 1.2} Q${cx - w * .8} ${cy - h * 1.22} ${cx - w - 6} ${cy + 8} Z" fill="${O}"/>`.replace(/(\d+\.\d{3,})/g, m => (+m).toFixed(1));
  s += line(`M${cx - w * .6} ${cy + h * .86} Q${cx} ${cy + h * 1.02} ${cx + w * .55} ${cy + h * .82}`, 3.5, '#8a4a52');
  s += line(`M${cx - w * .7} ${cy - h * 1.32} Q${cx} ${cy - h * 1.48} ${cx + w * .7} ${cy - h * 1.3}`, 3, '#c98a86');
  return s;
}
function mouth(e) {
  const m = e.mouth || 0, mood = e.mood || 'smile';
  if (m < .05) {
    if (mood === 'smile') return line('M-28 226 Q0 244 30 224', 5.5);
    if (mood === 'flat') return line('M-20 230 L22 230', 5);
    return line('M-24 232 Q0 222 24 232', 5);
  }
  const h = 10 + m * 46, w = 26 + m * 10;
  return `<path d="M${-w} 222 Q0 ${216 + (mood === 'o' ? -6 : 4)} ${w} 222 Q${w * .8} ${222 + h} 0 ${222 + h} Q${-w * .8} ${222 + h} ${-w} 222 Z" fill="#8a2a3a" stroke="${O}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M${-w * .5} ${222 + h * .78} Q0 ${222 + h * .45} ${w * .5} ${222 + h * .78} Q0 ${222 + h} ${-w * .5} ${222 + h * .78} Z" fill="#e07a8a"/>` + (mood !== 'o' ? `<path d="M${-w * .75} 224 L${w * .75} 224 L${w * .62} 232 L${-w * .62} 232 Z" fill="#fff"/>` : '');
}
export function chica(e = {}, t = 0) {
  const sway = Math.sin(t * 1.6) * 3 + (e.hairKick || 0) * 10;
  const sw = a => `rotate(${f(sway * a)} 0 -260)`;
  let s = `<defs><linearGradient id="irisG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.iris1}"/><stop offset=".55" stop-color="${P.iris2}"/><stop offset="1" stop-color="${P.iris3}"/></linearGradient>
    <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.hair}"/><stop offset="1" stop-color="#7e4430"/></linearGradient>
    <radialGradient id="blushG"><stop offset="0" stop-color="#ff8a9a" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a9a" stop-opacity="0"/></radialGradient></defs>`;
  // pelo de atrás
  s += `<g transform="${sw(.6)}">` + shape('M-250 -120 Q-310 120 -300 360 Q-300 480 -250 560 Q-220 540 -200 580 Q-170 520 -150 300 L150 300 Q170 520 200 580 Q220 540 250 560 Q300 480 300 360 Q310 120 250 -120 Q0 -330 -250 -120 Z', 'url(#hairG)', 6) + shape('M-150 300 Q-150 420 -120 560 L-180 600 Q-220 440 -205 300 Z M150 300 Q150 420 120 560 L180 600 Q220 440 205 300 Z', P.hairS, 0) + `</g>`;
  // torso: camisa escolar con cuello marinero simple
  s += shape('M-360 1400 Q-340 545 -150 495 L-70 465 L70 465 L150 495 Q340 545 360 1400 Z', P.cloth, 6);
  s += `<path d="M150 495 Q340 545 360 1400 L240 1400 Q240 665 120 545 Z" fill="${P.clothS}"/>`;
  s += shape('M-150 495 L0 665 L150 495 L110 480 L0 595 L-110 480 Z', '#2c3e7a', 5) + line('M-120 505 L0 640 L120 600', 3, '#fff');
  s += shape('M-34 605 L34 605 L60 705 L0 765 L-60 705 Z', P.tie, 5) + shape('M-26 595 L26 595 L18 629 L-18 629 Z', '#b83448', 4);
  // cuello
  s += shape('M-70 260 L-80 495 Q0 545 80 495 L70 260 Z', P.skin, 6) + `<path d="M-74 270 Q0 420 74 270 L74 330 Q0 375 -74 330 Z" fill="${P.skinS}"/>`;
  // orejas
  s += shape('M-208 10 Q-250 -6 -248 50 Q-244 110 -196 112 Z', P.skin, 5) + shape('M208 10 Q250 -6 248 50 Q244 110 196 112 Z', P.skin, 5);
  // cara
  const faceD = 'M-214 -170 C-222 40 -178 172 -96 266 C-56 306 -20 332 0 336 C24 332 60 306 100 262 C176 170 220 40 214 -170 Z';
  s += shape(faceD, P.skin, 6);
  s += `<clipPath id="fc"><path d="${faceD}"/></clipPath><g clip-path="url(#fc)"><path d="M140 -180 Q230 40 150 200 Q110 260 60 300 L240 320 L240 -180 Z" fill="${P.skinS}"/><path d="M-230 -90 Q-110 -40 0 -60 Q110 -40 230 -90 L230 -40 Q110 0 0 -12 Q-110 0 -230 -40 Z" fill="${P.skinS}"/></g>`;
  s += `<ellipse cx="-118" cy="150" rx="70" ry="38" fill="url(#blushG)"/><ellipse cx="118" cy="150" rx="70" ry="38" fill="url(#blushG)"/>` + [-1, 1].map(sd => line(`M${sd * 118 - 30} 162 l14 -22 M${sd * 118 - 8} 162 l14 -22 M${sd * 118 + 14} 162 l14 -22`, 3, '#e66a7a', `opacity="${.5 + .5 * (e.blush || 0)}"`)).join('');
  // cejas
  const bU = e.browUp || 0, bA = e.browAng || 0;
  s += [-1, 1].map(sd => `<g transform="rotate(${-sd * bA} ${sd * 100} ${-62 - bU})">${line(`M${sd * 40} ${-58 - bU} Q${sd * 100} ${-80 - bU} ${sd * 160} ${-62 - bU}`, 6, '#5a2a22')}</g>`).join('');
  s += eye(-1, e, t) + eye(1, e, t);
  s += line('M10 140 Q2 158 -4 164', 4, '#c47a6a') + `<path d="M-2 166 q8 4 14 -2" fill="none" stroke="#c47a6a" stroke-width="3"/>`;
  s += mouth(e);
  if (e.sweat) s += `<path d="M196 -60 q22 40 0 58 q-22 -18 0 -58 Z" fill="#bfe8ff" stroke="#4a8fc0" stroke-width="4"/>`;
  // flequillo en mechones (cel shading: base + sombra + brillo)
  s += `<g transform="${sw(1)}">`;
  const bangs = 'M-250 -60 Q-270 -260 -120 -330 Q0 -380 120 -330 Q270 -260 250 -60 Q236 40 226 120 Q206 20 196 -50 Q186 0 160 40 Q170 -40 150 -100 Q120 -20 76 24 Q100 -60 90 -120 Q50 -40 6 0 Q30 -70 20 -140 Q-20 -60 -70 -10 Q-46 -80 -60 -130 Q-100 -50 -150 30 Q-140 -50 -150 -100 Q-180 -30 -196 -40 Q-206 30 -226 120 Q-236 40 -250 -60 Z';
  s += shape(bangs, 'url(#hairG)', 6);
  s += `<path d="M-230 -110 Q0 -230 230 -110 L226 -60 Q0 -180 -226 -60 Z" fill="${P.hairS}" opacity=".0"/>`;
  s += `<path d="M196 -50 Q206 20 226 120 Q240 40 236 -40 Z M-196 -40 Q-206 30 -226 120 Q-240 40 -236 -40 Z M90 -120 Q100 -60 76 24 Q120 -40 120 -110 Z" fill="${P.hairS}"/>`;
  s += `<path d="M-180 -238 Q-60 -292 70 -280 Q150 -270 190 -230 Q140 -248 70 -252 Q-50 -258 -180 -210 Z" fill="${P.hairH}" opacity=".9"/><path d="M-120 -250 l10 30 M-40 -262 l8 34 M40 -266 l6 34 M110 -256 l4 30" stroke="${P.hairH}" stroke-width="8" stroke-linecap="round" opacity=".9"/>`;
  s += line('M-120 -300 Q-160 -200 -170 -60 M40 -320 Q70 -200 60 -110 M150 -290 Q190 -180 200 -60', 3, P.hairS, 'opacity=".8"');
  s += `<g transform="rotate(${f(Math.sin(t * 2.4) * 8)} 30 -340)">` + shape('M10 -336 Q30 -420 90 -440 Q50 -400 56 -336 Z', 'url(#hairG)', 5) + `</g>`; // ahoge
  s += `</g>`;
  // mechones laterales delante de la cara
  s += `<g transform="${sw(1.3)}">` + shape('M-232 -40 Q-250 120 -224 300 Q-236 380 -210 440 Q-190 360 -196 260 Q-176 120 -196 -20 Z', 'url(#hairG)', 5) + shape('M232 -40 Q250 120 224 300 Q236 380 210 440 Q190 360 196 260 Q176 120 196 -20 Z', 'url(#hairG)', 5) + `</g>`;
  return s;
}
