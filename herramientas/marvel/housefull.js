// House de cuerpo entero, estilo serie animada. Origen: entre los pies (y=0), mide ~1600 unidades.
import { houseSVG } from './house_draw.js';
const L = '#15121a';
const C = { blz: '#3b3d46', blzS: '#26272d', blzR: '#6a6f7c', shirt: '#86a4d2', shirtS: '#5a77a6', jean: '#4d6286', jeanS: '#36465f', skin: '#e2aa86', skinS: '#b97c5f', cane: '#6b4128', caneS: '#462818', shoe: '#3a3d44', sole: '#f1f1ee' };
const P = (d, fill, w = 7, ex = '') => `<path d="${d}" fill="${fill}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${ex}/>`;
const F = (d, fill, ex = '') => `<path d="${d}" fill="${fill}" ${ex}/>`;
const S = (d, w, col, ex = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
const limb = (d, w, fill) => S(d, w + 14, L) + S(d, w, fill);
const shoe = (x, dir) => P(`M${x - 62 * dir} 0 L${x + 38 * dir} 0 C${x + 44 * dir} -30 ${x + 34 * dir} -62 ${x + 12 * dir} -72 L${x - 26 * dir} -72 C${x - 40 * dir} -46 ${x - 62 * dir} -42 ${x - 68 * dir} -20 Z`, C.shoe, 6) + P(`M${x - 66 * dir} -14 L${x + 40 * dir} -14 L${x + 38 * dir} 0 L${x - 62 * dir} 0 Z`, C.sole, 5);
const hand = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})">${P('M-26 -30 C-34 -5 -30 30 -10 42 C8 50 28 40 30 18 C32 -2 26 -22 18 -32 Z', C.skin, 6)}${F('M12 -30 C26 -18 30 6 26 24 C20 38 10 44 0 44 C14 30 18 0 12 -30 Z', C.skinS)}${S('M-14 18 L-4 30 M-4 10 L8 24', 3.5, L)}</g>`;
export function houseFull() {
  let s = '';
  s += `<ellipse cx="10" cy="4" rx="230" ry="34" fill="#0b1a1e" opacity=".22"/>`;
  // piernas (jean) y pelvis
  s += limb('M58 -830 L74 -430 L84 -78', 96, C.jeanS);
  s += limb('M-52 -830 L-62 -430 L-66 -78', 96, C.jean);
  s += S('M-20 -800 L-26 -430 L-30 -90', 26, C.jeanS, 'opacity=".9"');
  s += P('M-110 -860 L122 -860 L118 -760 C70 -730 -60 -730 -104 -760 Z', C.jean, 7);
  s += S('M8 -850 L10 -740', 4, C.jeanS);
  s += shoe(-66, -1) + shoe(86, 1);
  // brazos (mangas)
  s += limb('M158 -1280 L182 -1050 L180 -860', 64, C.blzS);
  s += limb('M-112 -1280 L-170 -1060 L-200 -868', 66, C.blz);
  s += S('M-150 -1240 L-188 -1060', 10, C.blzR);
  // torso: saco
  const torso = 'M-20 -1368 C-62 -1356 -104 -1340 -126 -1306 C-148 -1250 -152 -1150 -142 -1050 L-142 -812 C-60 -792 100 -792 172 -810 L174 -1050 C182 -1150 184 -1250 166 -1304 C140 -1340 104 -1356 70 -1368 Z';
  s += `<clipPath id="trsC"><path d="${torso}"/></clipPath>` + P(torso, C.blz, 7);
  s += `<g clip-path="url(#trsC)">${F('M95 -1370 C120 -1250 125 -1000 110 -790 L200 -790 L200 -1370 Z', C.blzS)}${F('M-150 -1300 C-165 -1150 -160 -950 -146 -800 L-170 -800 L-170 -1300 Z', C.blzR)}</g>`;
  // camisa visible (V y abajo del botón)
  s += P('M-20 -1368 L70 -1368 L28 -1100 L16 -1100 Z', C.shirt, 5) + F('M38 -1368 L70 -1368 L28 -1100 Z', C.shirtS);
  s += P('M16 -1100 L28 -1100 L62 -808 L-28 -808 Z', C.shirt, 5) + F('M28 -1100 L62 -808 L30 -808 Z', C.shirtS);
  s += P('M-20 -1368 L-48 -1318 L2 -1326 Z', '#9db8e0', 4) + P('M70 -1368 L92 -1316 L46 -1324 Z', '#7f9cc8', 4);
  // solapas y botón
  s += S('M-20 -1366 L-66 -1262 L16 -1100 L-28 -808', 6, L) + S('M70 -1366 L116 -1262 L28 -1100 L62 -808', 6, L);
  s += `<circle cx="20" cy="-1080" r="7" fill="${L}"/>` + S('M-110 -980 L-90 -950 M130 -990 L110 -955', 4, C.blzS);
  // cuello
  s += P('M-18 -1420 L56 -1420 L64 -1352 C40 -1340 0 -1340 -22 -1352 Z', C.skin, 6) + F('M28 -1420 L56 -1420 L64 -1352 C55 -1346 42 -1344 34 -1344 Z', C.skinS);
  // cabeza (la misma del retrato)
  s += `<g transform="translate(0 -1385) scale(.58) translate(-560 -914)">${houseSVG({ head: true })}</g>`;
  // bastón + manos
  s += S('M-208 -830 L-252 -8', 28, L) + S('M-208 -830 L-252 -8', 16, C.cane) + S('M-202 -830 L-244 -20', 4, C.caneS);
  s += S('M-208 -830 C-212 -880 -170 -905 -140 -872', 28, L) + S('M-208 -830 C-212 -880 -170 -905 -140 -872', 16, C.cane);
  s += P('M-266 -16 L-238 -16 L-238 4 L-266 4 Z', '#222', 4);
  s += hand(-204, -838, 8) + hand(182, -846, -6);
  return s;
}
