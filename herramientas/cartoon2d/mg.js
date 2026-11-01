// Motion graphics: iconos planos, colores fuertes, todo animado por value/t.
const O = '#141a2e';
const st = (w = 4) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const H = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const eob = t => { t = clamp(t, 0, 1); const s = 2.2; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
export const GREEN = '#3ddc84', YEL = '#ffcf3a', RED = '#ff4d5e', CYAN = '#4fd1ff';

export const bact = (x, y, r = 0, s = 1, t = 0) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s})"><path d="M-46 -6 q-16 -10 -26 4 M46 6 q16 10 26 -4" stroke="${GREEN}" stroke-width="5" fill="none" stroke-linecap="round" transform="rotate(${Math.sin(t * 8) * 10})"/><rect x="-46" y="-22" width="92" height="44" rx="22" fill="${GREEN}" ${st()}/><circle cx="-12" cy="-4" r="4.5" fill="${O}"/><circle cx="12" cy="-4" r="4.5" fill="${O}"/><path d="M-9 7 q9 8 18 0" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>`;
export const yeastI = (x, y, r = 0, s = 1) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s})"><circle cx="30" cy="-28" r="17" fill="${YEL}" ${st()}/><circle r="38" fill="${YEL}" ${st()}/><path d="M-20 -16 l12 6 M20 -16 l-12 6" stroke="${O}" stroke-width="4" stroke-linecap="round"/><circle cx="-12" cy="-2" r="4.5" fill="${O}"/><circle cx="12" cy="-2" r="4.5" fill="${O}"/><path d="M-14 12 q14 12 28 0" stroke="${O}" stroke-width="4" fill="#fff" stroke-linecap="round"/></g>`;
const bread = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-80 30 L-80 -10 Q-90 -60 -40 -60 L40 -60 Q90 -60 80 -10 L80 30 Z" fill="#e3a050" ${st()}/><path d="M-60 -40 q12 10 0 22 M-10 -44 q12 10 0 22 M40 -40 q12 10 0 22" stroke="#a8692a" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
const sugar = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 -20 L0 -44 L40 -20 L0 4 Z" fill="#ffffff" ${st()}/><path d="M-40 -20 L0 4 L0 50 L-40 26 Z" fill="#dfe6f2" ${st()}/><path d="M40 -20 L0 4 L0 50 L40 26 Z" fill="#c4cfe2" ${st()}/></g>`;
const pill = (x, y, r = 0, s = 1) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r}) scale(${s})"><path d="M0 -26 L-50 -26 A26 26 0 0 0 -50 26 L0 26 Z" fill="${RED}" ${st()}/><path d="M0 -26 L50 -26 A26 26 0 0 1 50 26 L0 26 Z" fill="#fff" ${st()}/><path d="M-50 -12 h30" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/></g>`;
const arrow = (x1, y1, x2, y2, p = 1, col = '#fff') => { const x = x1 + (x2 - x1) * p, y = y1 + (y2 - y1) * p, a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI; return p <= 0 ? '' : `<path d="M${x1} ${y1} L${x} ${y}" stroke="${col}" stroke-width="12" stroke-linecap="round"/><path d="M-26 -22 L6 0 L-26 22" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" transform="translate(${x} ${y}) rotate(${a})"/>`; };
const txt = (x, y, s, size, col = '#fff', anchor = 'middle', font = 'Montserrat', w = 800) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-weight="${w}" font-size="${size}" fill="${col}" stroke="${O}" stroke-width="${size * .14}" paint-order="stroke" stroke-linejoin="round">${s}</text>`;

export const MG = {
  // corte del intestino con microbios; good: 0..1 visibles, yeast: cantidad de hongos, sweep: 0..1 barrido
  gut: p => { const t = p.t, R = 420; let s = `<circle r="${R + 60}" fill="#c9506a" ${st(6)}/>`;
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; s += `<circle cx="${(Math.cos(a) * (R + 4)).toFixed(1)}" cy="${(Math.sin(a) * (R + 4)).toFixed(1)}" r="38" fill="#e2738a" ${st(4)}/>`; }
    s += `<circle r="${R - 20}" fill="#3a1830"/><circle r="${R - 20}" fill="url(#gutg)"/>`;
    s += `<radialGradient id="gutg"><stop offset="0" stop-color="#5a2848"/><stop offset="1" stop-color="#2a1022"/></radialGradient>`;
    const ng = 22, nGood = Math.round(ng * (p.good ?? 1)), sw = p.sweep || 0;
    for (let i = 0; i < nGood; i++) { const a = H('g' + i) * 6.283, r = 60 + H('gr' + i) * 280; let x = Math.cos(a) * r + Math.sin(t * 1.3 + i) * 12, y = Math.sin(a) * r + Math.cos(t * 1.1 + i) * 12; x -= sw * (900 + H('gs' + i) * 300); if (x < -R + 30) continue; s += bact(x, y, H('ga' + i) * 360 + Math.sin(t + i) * 15, .8, t + i); }
    const ny = Math.floor(p.yeast ?? 0);
    for (let i = 0; i < ny; i++) { const a = H('y' + i) * 6.283, r = 40 + H('yr' + i) * 300; const x = Math.cos(a) * r + Math.sin(t * 1.7 + i) * 10, y = Math.sin(a) * r + Math.cos(t * 1.5 + i) * 10; const k = clamp((p.yeast - i) * 2, 0, 1); s += yeastI(x, y, Math.sin(t * 2 + i) * 12, .75 * eob(k)); }
    return s; },
  balance: p => { const a = (p.value || 0) * 22 + Math.sin(p.t * 3) * 1.5, r = a * Math.PI / 180, L = 330;
    const lx = -Math.cos(r) * L, ly = -Math.sin(r) * L, rx = Math.cos(r) * L, ry = Math.sin(r) * L;
    const pan = (x, y, inner) => `<path d="M${x} ${y} L${x - 110} ${y + 170} M${x} ${y} L${x + 110} ${y + 170}" stroke="#cfd8ea" stroke-width="5"/><path d="M${x - 140} ${y + 170} Q${x} ${y + 250} ${x + 140} ${y + 170} Z" fill="#9fb0d0" ${st(5)}/>${inner(x, y + 150)}`;
    return `<path d="M0 0 L0 520 M-160 520 L160 520" stroke="#cfd8ea" stroke-width="22" stroke-linecap="round"/><path d="M0 0 L0 520 M-160 520 L160 520" stroke="${O}" stroke-width="30" stroke-linecap="round" opacity=".0"/><circle r="24" fill="#cfd8ea" ${st(5)}/>
      <path d="M${lx} ${ly} L${rx} ${ry}" stroke="${O}" stroke-width="30" stroke-linecap="round"/><path d="M${lx} ${ly} L${rx} ${ry}" stroke="#cfd8ea" stroke-width="20" stroke-linecap="round"/>
      ${pan(lx, ly, (x, y) => bact(x - 40, y - 10, -10, .8, p.t) + bact(x + 40, y - 30, 15, .8, p.t))}
      ${pan(rx, ry, (x, y) => yeastI(x - 50, y - 20, 0, .8) + yeastI(x + 40, y - 40, 10, .9) + yeastI(x - 5, y - 70, -8, .85))}
      ${txt(lx, ly + 310, 'BACTERIAS', 44, GREEN)}${txt(rx, ry + 310, 'HONGOS', 44, YEL)}`; },
  counter: p => { const v = Math.round(1 + (p.target - 1) * Math.pow(clamp(p.value, 0, 1), 3)); return `<rect x="-330" y="-90" width="660" height="150" rx="30" fill="#0e1528" stroke="${YEL}" stroke-width="6"/>` + txt(0, 30, 'x ' + v.toLocaleString('es-ES'), 96, YEL); },
  label: p => { const n = Math.round((p.text || '').length * clamp(p.value, 0, 1)), lp = clamp(p.value * 3, 0, 1); const [dx, dy] = p.to || [0, -300];
    return `<circle r="16" fill="${CYAN}"/><path d="M0 0 L${dx * lp} ${dy * lp}" stroke="${CYAN}" stroke-width="7"/>` + (lp >= 1 ? `<g transform="translate(${dx} ${dy})"><rect x="-440" y="-110" width="880" height="${p.sub ? 200 : 130}" rx="18" fill="#0e1528" stroke="${CYAN}" stroke-width="6"/>${txt(0, -26, (p.text || '').slice(0, n) + (n < (p.text || '').length ? '|' : ''), 54, '#fff', 'middle', 'Montserrat', 800).replace('font-weight="800"', 'font-weight="800" font-style="italic"')}${p.sub && p.value >= 1 ? txt(0, 56, p.sub, 40, CYAN) : ''}</g>` : ''); },
  formula: p => { const v = p.value || 0, t = p.t; let s = '';
    if (v > 0) s += `<g transform="scale(${eob(v * 2)})" >${bread(-130, -560, 1.25)}${sugar(140, -560, 1.25)}</g>` + (v > .3 ? txt(0, -400, 'HARINAS + AZÚCAR', 50, '#fff') : '');
    if (v > 1) s += arrow(0, -360, 0, -200, clamp((v - 1) * 2, 0, 1), '#fff');
    if (v > 1.3) { const k = clamp((v - 1.3) * 2, 0, 1); s += yeastI(0, -60, Math.sin(t * 6) * 10, 1.9 * eob(k)); s += txt(0, 110, 'FERMENTACIÓN', 46, YEL); }
    if (v > 2) s += arrow(0, 150, 0, 300, clamp((v - 2) * 2, 0, 1), '#fff');
    if (v > 2.3) { const k = clamp((v - 2.3) * 2, 0, 1); s += `<g transform="translate(0 440) scale(${eob(k)})"><rect x="-300" y="-80" width="600" height="150" rx="75" fill="${RED}" ${st(6)}/>${txt(0, 28, 'ALCOHOL', 92, '#fff')}</g>`;
      for (let i = 0; i < 10; i++) { const q = (t * .7 + i * .1) % 1; s += `<circle cx="${-260 + i * 58 + Math.sin(q * 8 + i) * 14}" cy="${360 - q * 260}" r="${8 + (i % 3) * 5}" fill="#fff" opacity="${(1 - q) * .8 * k}"/>`; } }
    return s; },
  body: p => { const v = clamp(p.value || 0, 0, 1), t = p.t, blink = v > .85 ? (Math.sin(t * 14) > 0 ? 1 : .55) : 1; const col = v > .7 ? RED : v > .4 ? YEL : GREEN;
    return `<g opacity=".95"><circle cx="-90" cy="-480" r="110" fill="none" stroke="${CYAN}" stroke-width="10"/><path d="M-260 520 L-260 -160 Q-260 -300 -90 -320 Q80 -300 80 -160 L80 520" fill="none" stroke="${CYAN}" stroke-width="10" stroke-linejoin="round"/>
      <ellipse cx="-110" cy="-20" rx="110" ry="90" fill="${YEL}" opacity="${.35 + .5 * v}"/><ellipse cx="-110" cy="-20" rx="160" ry="140" fill="${YEL}" opacity="${.15 * v}"/>${yeastI(-110, -20, Math.sin(t * 5) * 10, .9)}</g>
      <g transform="translate(270 0)"><rect x="-55" y="-420" width="110" height="840" rx="55" fill="#0e1528" stroke="#fff" stroke-width="8"/><rect x="-38" y="${400 - 800 * v}" width="76" height="${800 * v}" rx="38" fill="${col}" opacity="${blink}"/>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M60 ${-400 + i * 200} h30" stroke="#fff" stroke-width="6"/>`).join('')}${txt(0, -460, 'ALCOHOL', 46, '#fff')}${txt(0, 500, Math.round(v * 100) / 100 * .37 === 0 ? '0.00' : (v * .37).toFixed(2), 60, col)}</g>`; },
  title: p => { const v = clamp(p.value || 0, 0, 1); return `<g transform="scale(${eob(v)})"><rect x="-500" y="-220" width="1000" height="400" rx="40" fill="#0e1528" stroke="${YEL}" stroke-width="10"/>${txt(0, -90, 'SÍNDROME DE', 80, '#fff', 'middle', 'Anton', 400)}${txt(0, 90, 'AUTOCERVECERÍA', 132, YEL, 'middle', 'Anton', 400)}</g>`; },
  doctors: p => { const v = p.value || 0, hl = p.hl || 0; let s = '';
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const i = r * 10 + c, k = clamp(v * 12 - (r + c) * .5, 0, 1); if (k <= 0) continue; const x = -405 + c * 90, y = -405 + r * 90, me = i === 67;
      const col = me && hl ? YEL : '#7f8db0', a = me && hl ? 1 : 1 - hl * .55;
      s += `<g transform="translate(${x} ${y}) scale(${eob(k) * (me ? 1 + hl * .5 : 1)})" opacity="${a}"><circle cy="-14" r="15" fill="${col}"/><path d="M-26 34 Q-26 6 0 6 Q26 6 26 34 Z" fill="${col}"/></g>`;
      if (me && hl) s += `<circle cx="${x}" cy="${y}" r="${60 + Math.sin(p.t * 6) * 6}" fill="none" stroke="${YEL}" stroke-width="6" opacity="${hl}"/>`; }
    return s + (hl > .5 ? txt(0, 560, 'MUY POCOS LO VEN', 64, YEL) : ''); },
  pills: p => { const v = p.value || 0; let s = ''; for (let i = 0; i < 9; i++) { const x = 900 - v * 2400 + (i % 3) * 170 + H('px' + i) * 80, y = -360 + Math.floor(i / 3) * 330 + H('py' + i) * 90; s += pill(x, y, -15 + H('pr' + i) * 30 + v * 200, 1.25); } return s; },
  bigyeast: p => yeastI(0, 0, Math.sin(p.t * 3) * 6, p.k || 4),
  kicker: p => txt(0, 0, p.text, p.size || 72, p.color || '#fff', 'middle', 'Anton', 400),
};
