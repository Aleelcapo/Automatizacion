// Fondos 2D (SVG) para la miniserie médica. Lienzo vertical 1080x1920.
const O = '#26222a';
const st = (w = 3) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round"`;
export const DEFS = `<defs>
 <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3c8bf"/><stop offset="1" stop-color="#959c92"/></linearGradient>
 <linearGradient id="wallW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2c6b4"/><stop offset="1" stop-color="#a59a88"/></linearGradient>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c6f9e"/><stop offset=".6" stop-color="#e6a77a"/><stop offset="1" stop-color="#f3cf94"/></linearGradient>
 <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfeeee" stop-opacity=".55"/><stop offset="1" stop-color="#a8c4c6" stop-opacity=".35"/></linearGradient>
 <linearGradient id="xray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f3ff"/><stop offset="1" stop-color="#bcd6f2"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d9690"/><stop offset="1" stop-color="#6c746f"/></linearGradient>
 <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".6"/><stop offset=".55" stop-color="#ffcf8a" stop-opacity="0"/></linearGradient>
 <linearGradient id="cool" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#22345e" stop-opacity="0"/><stop offset="1" stop-color="#22345e" stop-opacity=".6"/></linearGradient>
 <radialGradient id="vig" cx=".5" cy=".45" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
 <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
 <filter id="b1"><feGaussianBlur stdDeviation="1.6"/></filter><filter id="b2"><feGaussianBlur stdDeviation="3.5"/></filter><filter id="b3"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;
export const LIGHT = (warm = .9, cool = .9) => `<rect width="1080" height="1920" fill="url(#warm)" opacity="${warm}" style="mix-blend-mode:soft-light"/><rect width="1080" height="1920" fill="url(#cool)" opacity="${cool}" style="mix-blend-mode:multiply"/><rect width="1080" height="1920" fill="url(#vig)"/>`;

const blinds = (x, y, w, h, open = 0) => { let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)" ${st()}/>`; s += skyline(x, y + h * .55, w, h * .45); for (let yy = y + 10; yy < y + h; yy += 24) s += `<rect x="${x + 3}" y="${yy}" width="${w - 6}" height="${open ? 8 : 14}" fill="#f2eee2" opacity=".95"/><line x1="${x + 3}" y1="${yy + (open ? 8 : 14)}" x2="${x + w - 3}" y2="${yy + (open ? 8 : 14)}" stroke="#a9a49a" stroke-width="2"/>`; s += `<line x1="${x + w * .3}" y1="${y}" x2="${x + w * .3}" y2="${y + h}" stroke="#bdb6a8" stroke-width="2"/><line x1="${x + w * .7}" y1="${y}" x2="${x + w * .7}" y2="${y + h}" stroke="#bdb6a8" stroke-width="2"/>`; return s; };
function skyline(x, y, w, h) { let s = `<g opacity=".85">`; let xx = x; let k = 7; while (xx < x + w) { const bw = 40 + (k * 37 % 50), bh = h * (.35 + (k * 53 % 60) / 100); s += `<rect x="${xx}" y="${y + h - bh}" width="${Math.min(bw, x + w - xx)}" height="${bh}" fill="#4a5578"/>`; for (let wy = y + h - bh + 10; wy < y + h - 8; wy += 18) for (let wx = xx + 8; wx < xx + bw - 8 && wx < x + w - 8; wx += 14) if ((wx * 7 + wy * 3) % 5 < 2) s += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="#ffd98a"/>`; xx += bw + 4; k++; } return s + `</g>`; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const whiteboard = (x, y, w, h, o = {}) => { const lines = o.lines || ['- mareos', '- habla arrastrada', '- alcohol: 0.37'], title = o.title || 'SÍNTOMAS', q = o.q ?? '¿NO BEBE?';
 return `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="6" fill="#b5bac0" ${st()}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f9fbfa" ${st(2)}/>
 <path d="M${x + w * .55} ${y} L${x + w * .75} ${y} L${x + w * .35} ${y + h} L${x + w * .15} ${y + h} Z" fill="#fff" opacity=".7"/>
 <g font-family="Montserrat" font-weight="800" fill="#1f3f8a" transform="rotate(-1.5 ${x} ${y})">
 <text x="${x + 40}" y="${y + 80}" font-size="54">${esc(title)}</text><path d="M${x + 40} ${y + 96} q150 -6 300 -2" stroke="#1f3f8a" stroke-width="5" fill="none"/>
 ${lines.slice(0, 3).map((l, i) => `<text x="${x + 40}" y="${y + 170 + i * 66}" font-size="${l.length > 20 ? 34 : 40}">${esc(l)}</text>`).join('')}
 ${q ? `<text x="${x + 40}" y="${y + 380}" font-size="${q.length > 14 ? 40 : 50}" fill="#b3261e">${esc(q)}</text><ellipse cx="${x + 40 + Math.min(560, q.length * 30) / 2}" cy="${y + 364}" rx="${Math.min(300, q.length * 16 + 30)}" ry="44" fill="none" stroke="#b3261e" stroke-width="5" transform="rotate(-3 ${x + 190} ${y + 364})"/>` : ''}
 <path d="M${x + 470} ${y + 160} q40 60 0 140" stroke="#1f3f8a" stroke-width="5" fill="none"/><text x="${x + 490}" y="${y + 246}" font-size="56">?</text></g>
 <rect x="${x + w - 200}" y="${y + h + 6}" width="190" height="16" rx="4" fill="#9aa0a6" ${st(2)}/><rect x="${x + w - 180}" y="${y + h - 4}" width="54" height="12" rx="4" fill="#1f3f8a"/><rect x="${x + w - 110}" y="${y + h - 4}" width="54" height="12" rx="4" fill="#b3261e"/>`; };
const xrayBox = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#d8dde2" ${st()}/><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="url(#xray)"/><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * .6}" ry="${h * .6}" fill="url(#glow)" opacity=".5"/>
 <g fill="none" stroke="#5d7088" stroke-width="5" opacity=".85"><path d="M${x + w / 2} ${y + 30} v${h - 60}"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${x + w / 2} ${y + 50 + i * 26} q-${w * .32} 6 -${w * .36} 30 M${x + w / 2} ${y + 50 + i * 26} q${w * .32} 6 ${w * .36} 30"/>`).join('')}</g>
 <path d="M${x + w * .38} ${y + h * .62} q${w * .2} -30 ${w * .3} 10 q-10 40 -${w * .3} 30 z" fill="#f2c063" opacity=".7"/>`;
const plant = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 0 L40 0 L32 80 L-32 80 Z" fill="#c9764a" ${st()}/>${[[-60, -150, -10], [-20, -190, 0], [30, -170, 15], [70, -120, 25], [-80, -90, -25], [10, -120, 5]].map(([lx, ly, r]) => `<path d="M0 0 Q${lx * .4} ${ly * .5} ${lx} ${ly} Q${lx * .5 + 20} ${ly * .5} 0 0 Z" fill="#4f8a4a" ${st(2.5)} transform="rotate(${r})"/>`).join('')}</g>`;
const ceilingLight = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="4" fill="#f6f4ea" ${st(2)}/><rect x="${x - 60}" y="${y + 26}" width="${w + 120}" height="160" fill="url(#glow)" opacity=".35"/>`;

export const wallPlain = () => `<rect width="1080" height="1920" fill="url(#wall)"/><rect y="1500" width="1080" height="420" fill="url(#floor)"/>`;
export function officeA(o = {}) {
  return `<g filter="url(#b1)"><rect width="1080" height="1920" fill="url(#wall)"/>${ceilingLight(140, 20, 520)}
  <rect x="770" y="80" width="330" height="1440" fill="#b3c2c2"/>
  <g filter="url(#b3)">${[860, 980].map((px, i) => `<ellipse cx="${px}" cy="${520 + i * 30}" rx="40" ry="46" fill="#7e6a5c"/><rect x="${px - 70}" y="${570 + i * 30}" width="140" height="420" rx="40" fill="${i ? '#7fa7b0' : '#e9ecee'}"/>`).join('')}<rect x="770" y="1050" width="330" height="460" fill="#8c9a99"/></g>
  <rect x="770" y="80" width="330" height="1440" fill="url(#glass)"/><path d="M820 80 L900 80 L800 700 L770 700 Z" fill="#fff" opacity=".25"/>
  <rect x="756" y="70" width="26" height="1460" fill="#c9d0cd" ${st()}/><rect x="760" y="760" width="340" height="18" fill="#c9d0cd" ${st(2)}/>
  ${whiteboard(40, 230, 640, 560, o)}
  ${xrayBox(150, 980, 300, 380)}
  <rect y="1500" width="1080" height="420" fill="url(#floor)"/><rect y="1490" width="1080" height="16" fill="#5d6762"/></g>`;
}
export function officeB() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="url(#wallW)"/>${ceilingLight(560, 10, 400)}
  <rect x="60" y="150" width="560" height="760" fill="#e9e3d4" ${st()}/>${blinds(80, 170, 520, 720, 1)}
  <g transform="translate(700 200)"><rect width="330" height="760" fill="#6b4a33" ${st()}/>${[0, 1, 2, 3].map(r => `<rect x="14" y="${20 + r * 185}" width="302" height="160" fill="#4d3424"/>` + Array.from({ length: 9 }, (_, b) => `<rect x="${22 + b * 32}" y="${20 + r * 185 + 160 - (100 + (b * 37 + r * 13) % 50)}" width="26" height="${100 + (b * 37 + r * 13) % 50}" fill="${['#b3463c', '#3c6e9e', '#d9b25a', '#5e8a5a', '#e9e1cf', '#7a4f8a'][(b + r) % 6]}" ${st(2)}/>`).join('') + `<rect x="10" y="${180 + r * 185}" width="310" height="10" fill="#7d5940"/>`).join('')}</g>
  <rect y="1180" width="1080" height="740" fill="url(#floor)"/>
  <path d="M-20 1170 L1100 1130 L1100 1250 L-20 1300 Z" fill="#7a5640" ${st()}/><path d="M-20 1300 L1100 1250 L1100 1300 L-20 1352 Z" fill="#5a3e2c" ${st(2)}/>
  <rect x="160" y="1010" width="230" height="140" rx="8" fill="#2e3138" ${st()}/><rect x="172" y="1022" width="206" height="112" fill="#7fb0d8"/><path d="M130 1160 L420 1150 L400 1170 L150 1180 Z" fill="#c4c8ce" ${st(2)}/>
  <path d="M520 1150 L540 980 L600 940" fill="none" stroke="${O}" stroke-width="10"/><path d="M570 920 L660 930 L640 970 Z" fill="#2f6e5a" ${st()}/><ellipse cx="620" cy="1000" rx="70" ry="40" fill="url(#glow)" opacity=".6"/>
  <circle cx="870" cy="1080" r="66" fill="#e2e6dc" ${st()}/><path d="M816 1050 Q870 1080 924 1050 M816 1110 Q870 1080 924 1110" fill="none" stroke="#9aa08f" stroke-width="5"/>
  ${plant(990, 1100, 1.3)}</g>`;
}
export function corridor() {
  const vx = 540, vy = 760;
  let s = `<g filter="url(#b3)"><rect width="1080" height="1920" fill="#c9cfc9"/>
  <path d="M0 0 L1080 0 L${vx + 160} ${vy - 200} L${vx - 160} ${vy - 200} Z" fill="#e4e6e0"/>
  <path d="M0 1920 L1080 1920 L${vx + 160} ${vy + 160} L${vx - 160} ${vy + 160} Z" fill="#9aa7a2"/>
  <path d="M0 0 L${vx - 160} ${vy - 200} L${vx - 160} ${vy + 160} L0 1920 Z" fill="#b8c4bf"/><path d="M1080 0 L${vx + 160} ${vy - 200} L${vx + 160} ${vy + 160} L1080 1920 Z" fill="#aab7b2"/>
  <rect x="${vx - 160}" y="${vy - 200}" width="320" height="360" fill="#d7dcd6"/><rect x="${vx - 60}" y="${vy - 60}" width="120" height="220" fill="#7b9cad"/>`;
  for (let i = 0; i < 5; i++) { const t = i / 5, y = vy - 200 - (1 - t) * (vy - 200) * .1; const k = 1 - t * .8; s += `<rect x="${vx - 120 * k - 30}" y="${(vy - 200) * (1 - k) + 40 * k}" width="${240 * k + 60}" height="${22 * k}" fill="#fffbe8"/>`; }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const k = [.95, .62, .4][i], x = side < 0 ? 60 + (1 - k) * 400 : 1020 - (1 - k) * 400 - 140 * k; s += `<rect x="${x}" y="${vy - 200 - 200 * k + 300}" width="${140 * k}" height="${420 * k}" fill="#6e8f9c"/>`; }
  s += `<rect x="760" y="900" width="320" height="300" fill="#e7e1d2"/><rect x="740" y="880" width="340" height="40" fill="#bfb6a2"/>
  <rect x="80" y="1100" width="360" height="60" rx="10" fill="#e4eaec"/><rect x="100" y="1160" width="20" height="300" fill="#8a9296"/><rect x="400" y="1160" width="20" height="300" fill="#8a9296"/>
  <ellipse cx="300" cy="900" rx="44" ry="52" fill="#6e5848"/><rect x="230" y="950" width="140" height="460" rx="40" fill="#7fb0b5"/></g>`;
  return s;
}

export function er() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#c7d6d6"/>${ceilingLight(120, 10, 360)}${ceilingLight(620, 10, 360)}
  <rect x="0" y="120" width="1080" height="40" fill="#9fb3b6"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${i * 140} 160 q35 30 70 0 q35 30 70 0 L${i * 140 + 140} 1300 L${i * 140} 1300 Z" fill="${i % 2 ? '#7fb0b3' : '#8cbcbf'}"/>`).join('')}
  <rect x="680" y="420" width="300" height="220" rx="12" fill="#2b2f36" ${st()}/><rect x="696" y="436" width="268" height="170" fill="#0d1a14"/><path d="M700 520 l60 0 l14 -50 l14 90 l14 -40 l170 0" fill="none" stroke="#3ef08a" stroke-width="5"/>
  <rect x="980" y="300" width="14" height="900" fill="#9aa3a8"/><path d="M940 300 h90 v120 q-45 30 -90 0 Z" fill="#dff0f6" ${st(2)}/>
  <rect y="1300" width="1080" height="620" fill="#a9b6b4"/><path d="M0 1300 L1080 1300" stroke="#8a9795" stroke-width="10"/></g>`;
}
export function kitchen() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#e6d6b8"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${i * 160 - 20}" y="1000" width="150" height="40" fill="#f1e8d6"/>`).join('')}
  ${[0, 1, 2].map(i => `<rect x="${60 + i * 330}" y="180" width="300" height="420" fill="#b98b5e" ${st()}/><rect x="${80 + i * 330}" y="200" width="125" height="380" fill="#c99b6c" ${st(2)}/><rect x="${215 + i * 330}" y="200" width="125" height="380" fill="#c99b6c" ${st(2)}/>`).join('')}
  <rect x="0" y="1040" width="1080" height="60" fill="#d9d2c2" ${st()}/><rect x="0" y="1100" width="1080" height="500" fill="#a87a52" ${st()}/>${[0, 1, 2].map(i => `<rect x="${40 + i * 350}" y="1140" width="320" height="420" fill="#b98b5e" ${st(2)}/><rect x="${180 + i * 350}" y="1180" width="50" height="12" rx="5" fill="#e6d3a0"/>`).join('')}
  <rect x="740" y="760" width="200" height="280" fill="#cfd8dc" ${st()}/><circle cx="840" cy="900" r="50" fill="#9fb6c2"/><rect y="1600" width="1080" height="320" fill="#8a6a4e"/></g>`;
}
export function isoroom() {
  return `<g filter="url(#b1)"><rect width="1080" height="1920" fill="#d7dfdc"/>${ceilingLight(300, 10, 480)}
  <rect x="80" y="300" width="300" height="360" fill="#a9c7d6" ${st()}/><path d="M80 480 h300 M230 300 v360" stroke="#26222a" stroke-width="6"/>
  <rect x="700" y="260" width="320" height="320" fill="#f2efe6" ${st()}/><text x="860" y="420" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="44" fill="#c0201a">0%</text><text x="860" y="470" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="30" fill="#555">ALCOHOL</text><path d="M760 500 l200 -200" stroke="#c0201a" stroke-width="10"/>
  <rect y="1380" width="1080" height="540" fill="#b5c0bd"/></g>`;
}
export function bedFront() { return ''; }
export function diagram(o = {}) {
  return `<rect width="1080" height="1920" fill="#1d2b44"/><radialGradient id="dg" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="${o.c1 || '#3b5d8f'}"/><stop offset="1" stop-color="${o.c2 || '#14203a'}"/></radialGradient><rect width="1080" height="1920" fill="url(#dg)"/>${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 40} 0 V1920 M0 ${i * 70} H1080" stroke="#ffffff" stroke-opacity=".05" stroke-width="2"/>`).join('')}`;
}
export function desk() {
  return `<g filter="url(#b1)"><rect width="1080" height="1920" fill="#6b4a33"/>${Array.from({ length: 14 }, (_, i) => `<path d="M0 ${i * 140 + 40} Q540 ${i * 140 + (i % 2 ? 80 : 0)} 1080 ${i * 140 + 40}" stroke="#5a3d29" stroke-width="6" fill="none"/>`).join('')}
  <rect x="700" y="200" width="300" height="200" rx="10" fill="#2e3138" transform="rotate(12 850 300)"/><circle cx="180" cy="1600" r="110" fill="#e2e6dc" ${st()}/><rect x="80" y="300" width="60" height="320" rx="10" fill="#c94f3d" transform="rotate(-30 110 460)" ${st(2)}/></g>`;
}

export function bedroom(o = {}) {
  const night = !!o.night;
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="${night ? '#2c3354' : '#e9d9c4'}"/>
  <rect x="80" y="240" width="380" height="520" fill="${night ? '#0f1630' : '#bfe0f6'}" ${st()}/>${night ? '<circle cx="330" cy="380" r="60" fill="#f6efc8"/><circle cx="350" cy="370" r="56" fill="#0f1630"/>' + [[150, 300], [220, 560], [400, 640], [180, 450]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`).join('') : '<circle cx="360" cy="360" r="70" fill="#ffe7a0"/>'}
  <path d="M80 500 h380 M270 240 v520" stroke="#26222a" stroke-width="8"/><path d="M60 230 q100 300 0 560 L40 790 L40 220 Z M480 230 q-100 300 0 560 L500 790 L500 220 Z" fill="${night ? '#5a3a6a' : '#c96a6a'}"/>
  <rect x="640" y="380" width="300" height="220" fill="${night ? '#55607a' : '#d9c39a'}" ${st()}/><path d="M660 560 l80 -100 l60 60 l40 -40 l80 80 Z" fill="${night ? '#3a4560' : '#8fb070'}"/>
  <rect y="1250" width="1080" height="670" fill="${night ? '#3a3048' : '#b08a64'}"/>
  <rect x="0" y="1050" width="760" height="300" rx="30" fill="${night ? '#6a7cae' : '#f2f2ee'}" ${st()}/><rect x="0" y="980" width="260" height="110" rx="40" fill="#fff" ${st()}/><rect x="0" y="1300" width="760" height="120" fill="${night ? '#4a3a5a' : '#9a6a44'}" ${st()}/></g>${night ? '<rect width="1080" height="1920" fill="#101a40" opacity=".25"/>' : ''}`;
}
export function kidroom(o = {}) {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#bfe3d4"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 100}" y="0" width="50" height="1250" fill="#acd8c6"/>`).join('')}
  <rect x="120" y="260" width="320" height="380" fill="#d8f0ff" ${st()}/><path d="M120 450 h320 M280 260 v380" stroke="#26222a" stroke-width="8"/><circle cx="350" cy="340" r="44" fill="#ffe08a"/>
  <rect x="600" y="300" width="360" height="460" fill="#ffb84a" ${st()}/>${[0, 1, 2].map(r => `<rect x="620" y="${330 + r * 145}" width="320" height="16" fill="#c8852a"/>` + [0, 1, 2, 3].map(k => `<rect x="${640 + k * 70}" y="${355 + r * 145}" width="50" height="90" fill="${['#ff5a5a', '#4a8af0', '#7ad06a', '#b06af0'][(k + r) % 4]}" ${st(2)}/>`).join('')).join('')}
  <path d="M700 260 l40 -80 l40 80 Z" fill="#ff5a8a" ${st()}/><circle cx="520" cy="200" r="40" fill="#ffe08a" ${st()}/>
  <rect y="1250" width="1080" height="670" fill="#e0b880"/>${Array.from({ length: 8 }, (_, i) => `<path d="M0 ${1290 + i * 80} H1080" stroke="#c99a60" stroke-width="5"/>`).join('')}
  <ellipse cx="540" cy="1560" rx="380" ry="110" fill="#ff8aa8" opacity=".8"/></g>`;
}
export function mriroom() {
  return `<g filter="url(#b1)"><rect width="1080" height="1920" fill="#d9e2e6"/>${ceilingLight(300, 10, 480)}
  <rect y="1300" width="1080" height="620" fill="#b9c4c8"/><rect x="60" y="500" width="960" height="800" rx="120" fill="#eef2f4" ${st(5)}/><circle cx="540" cy="900" r="250" fill="#2a3240" ${st(5)}/><circle cx="540" cy="900" r="215" fill="#3d4a5e"/><circle cx="540" cy="900" r="320" fill="none" stroke="#9fb6c8" stroke-width="18"/>
  <rect x="240" y="1060" width="600" height="60" rx="20" fill="#f6f6f2" ${st(4)}/><rect x="320" y="1120" width="440" height="200" fill="#c9d1d6" ${st(4)}/><circle cx="540" cy="900" r="230" fill="url(#glow)" opacity=".35"/>
  <rect x="820" y="560" width="140" height="80" rx="10" fill="#2b2f36" ${st(3)}/><circle cx="850" cy="600" r="12" fill="#3ef08a"/></g>`;
}

export function cemetery() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#3a4258"/><circle cx="820" cy="300" r="110" fill="#e9e6d4"/><circle cx="790" cy="290" r="100" fill="#3a4258" opacity=".0"/>
  <path d="M0 1050 Q300 980 540 1030 Q800 1080 1080 1000 L1080 1920 L0 1920 Z" fill="#3e5a3e"/>${[[120, 1000, .9], [380, 980, .8], [700, 1010, .85], [940, 990, .75], [250, 1180, 1.1], [820, 1200, 1.15]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-70 60 L-70 -80 Q-70 -150 0 -150 Q70 -150 70 -80 L70 60 Z" fill="#8a929e" ${st()}/><path d="M-30 -60 h60 M0 -90 v70" stroke="#6a727e" stroke-width="10"/></g>`).join('')}
  <path d="M60 760 q20 -140 -10 -260 M60 600 q60 -60 120 -70 M50 540 q-60 -40 -90 -40" stroke="#2a2a30" stroke-width="16" fill="none"/></g><rect width="1080" height="1920" fill="#1a2040" opacity=".2"/>`;
}
export function bathroom() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#dff0f2"/>${Array.from({ length: 11 }, (_, i) => `<path d="M${i * 100} 0 V1300" stroke="#c4dde0" stroke-width="4"/>`).join('')}${Array.from({ length: 13 }, (_, i) => `<path d="M0 ${i * 100} H1080" stroke="#c4dde0" stroke-width="4"/>`).join('')}
  <path d="M700 200 L700 320 L860 320" fill="none" stroke="#9aa6b8" stroke-width="20"/><path d="M800 320 L920 320 L890 370 L830 370 Z" fill="#c9d3e2" ${st()}/><rect x="560" y="160" width="20" height="1150" fill="#9aa6b8"/><path d="M560 170 q-60 300 0 560 q-60 300 0 580 L360 1310 L360 170 Z" fill="#9fd0e0" opacity=".8"/>
  <rect x="80" y="520" width="220" height="300" rx="20" fill="#cfe7ff" ${st()}/><rect y="1300" width="1080" height="620" fill="#b9d4d8"/></g>`;
}
export function street() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#f2c48a"/><rect y="0" width="1080" height="700" fill="#f7d6a0"/>${[[0, 300, 260, '#c96a4a'], [270, 220, 240, '#d9a05a'], [520, 340, 230, '#b8784e'], [760, 260, 320, '#c98a5a']].map(([x, y, w, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${1300 - y}" fill="${c}" ${st()}/>` + [0, 1, 2].map(r => [0, 1].map(k => `<rect x="${x + 40 + k * (w / 2)}" y="${y + 60 + r * 220}" width="${w / 4}" height="120" fill="#5a3a2a" opacity=".6"/>`).join('')).join('')).join('')}
  <path d="M0 1080 h1080" stroke="#7a4a2a" stroke-width="14"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 150} 1040 l60 -60 l60 60" fill="${['#e94e3a', '#3a8ae9', '#f2c23a', '#4ac06a'][i % 4]}"/>`).join('')}
  <rect y="1300" width="1080" height="620" fill="#c9a57a"/><ellipse cx="540" cy="1560" rx="420" ry="90" fill="#a8805a" opacity=".6"/></g>`;
}
export function surgery() {
  return `<g filter="url(#b1)"><rect width="1080" height="1920" fill="#5e8f8a"/><radialGradient id="orl" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#d9f2ee"/><stop offset="1" stop-color="#3e6a66"/></radialGradient><rect width="1080" height="1920" fill="url(#orl)"/>
  <path d="M540 0 V160" stroke="#9aa6b8" stroke-width="22"/><ellipse cx="540" cy="220" rx="260" ry="90" fill="#e6eef0" ${st()}/><ellipse cx="540" cy="240" rx="200" ry="50" fill="#fffbe0"/><path d="M340 280 L740 280 L900 1300 L180 1300 Z" fill="#fffbe0" opacity=".18"/>
  <rect x="140" y="1100" width="800" height="90" rx="20" fill="#e6eef0" ${st()}/><rect x="220" y="1190" width="80" height="300" fill="#9aa6b8"/><rect x="780" y="1190" width="80" height="300" fill="#9aa6b8"/><path d="M200 1100 Q540 1000 880 1100 Z" fill="#6aa0c0" ${st()}/>
  <rect x="820" y="620" width="200" height="140" rx="12" fill="#2b2f36" ${st(3)}/><path d="M840 690 l40 0 l10 -30 l10 50 l10 -20 l90 0" fill="none" stroke="#3ef08a" stroke-width="5"/><rect y="1500" width="1080" height="420" fill="#4a6e6a"/></g>`;
}

export function railroad() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#e8d2a8"/><path d="M0 900 L200 600 L380 820 L560 520 L780 800 L960 580 L1080 700 L1080 1300 L0 1300 Z" fill="#a88a64"/><path d="M0 1050 L300 860 L560 1000 L820 840 L1080 980 L1080 1300 L0 1300 Z" fill="#8a7050"/>
  <rect y="1250" width="1080" height="670" fill="#b89a70"/><path d="M380 1250 L-200 1920 M700 1250 L1280 1920" stroke="#5a4a3a" stroke-width="22"/>${Array.from({ length: 9 }, (_, i) => { const y = 1270 + i * i * 9 + i * 20, w = 340 + i * 150; return `<rect x="${540 - w / 2}" y="${y}" width="${w}" height="${12 + i * 3}" fill="#6a4a2a"/>`; }).join('')}
  <rect x="80" y="980" width="80" height="300" fill="#7a5a3a" ${st()}/><circle cx="880" cy="1050" r="70" fill="#9a8a7a" opacity=".6"/></g>`;
}
export function party() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#2e2448"/><path d="M0 200 Q270 320 540 200 Q810 320 1080 200" fill="none" stroke="#1a1430" stroke-width="5"/>${Array.from({ length: 11 }, (_, i) => { const x = i * 108, y = 200 + Math.sin(i / 10 * Math.PI * 2) * 0 + (i % 5 === 0 ? 0 : 60 * Math.sin((i % 5) / 5 * Math.PI)); return `<circle cx="${x}" cy="${y + 20}" r="18" fill="${['#ffcf3a', '#ff7ab6', '#4fd1ff', '#3ddc84'][i % 4]}"/><circle cx="${x}" cy="${y + 20}" r="40" fill="${['#ffcf3a', '#ff7ab6', '#4fd1ff', '#3ddc84'][i % 4]}" opacity=".25"/>`; }).join('')}
  ${[[150, 900, '#4a3a6a'], [380, 860, '#5a4a7a'], [760, 880, '#4a3a6a'], [960, 900, '#5a4a7a']].map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="44" ry="52" fill="${c}"/><rect x="${x - 70}" y="${y + 50}" width="140" height="420" rx="40" fill="${c}"/>`).join('')}
  <rect y="1300" width="1080" height="620" fill="#3a2e58"/>${Array.from({ length: 40 }, (_, i) => `<rect x="${(i * 211) % 1080}" y="${(i * 397) % 1300}" width="12" height="20" fill="${['#ffcf3a', '#ff7ab6', '#4fd1ff'][i % 3]}" transform="rotate(${i * 37} ${(i * 211) % 1080} ${(i * 397) % 1300})"/>`).join('')}</g>`;
}

export function patientroom(o = {}) {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="${o.wall || '#d6e4e0'}"/>${ceilingLight(300, 10, 480)}
  <rect x="640" y="260" width="360" height="460" fill="#bfe0f6" ${st()}/><path d="M640 490 h360 M820 260 v460" stroke="#26222a" stroke-width="8"/><path d="M620 250 q60 250 0 480 L600 730 L600 240 Z" fill="#8fb8a8"/>
  <rect x="120" y="420" width="220" height="150" rx="12" fill="#2b2f36" ${st(3)}/><path d="M140 500 l40 0 l12 -40 l12 60 l12 -30 l120 0" fill="none" stroke="#3ef08a" stroke-width="6"/>
  <rect x="90" y="300" width="14" height="1000" fill="#9aa3a8"/><path d="M60 300 h80 v110 q-40 26 -80 0 Z" fill="#dff0f6" ${st(2)}/>
  <rect x="180" y="760" width="720" height="260" rx="40" fill="#c9d3dc" ${st()}/><rect y="1300" width="1080" height="620" fill="#aebcb8"/></g>`;
}
export function lab() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#e2ecef"/>${ceilingLight(200, 10, 680)}
  ${[0, 1, 2].map(r => `<rect x="60" y="${300 + r * 190}" width="960" height="14" fill="#9aa6b8"/>` + Array.from({ length: 9 }, (_, i) => `<rect x="${90 + i * 100}" y="${300 + r * 190 - 90 - (i * 17 + r * 11) % 50}" width="44" height="${90 + (i * 17 + r * 11) % 50}" rx="8" fill="${['#4fd1ff', '#3ddc84', '#ff7ab6', '#ffcf3a'][(i + r) % 4]}" opacity=".75" ${st(2)}/>`).join('')).join('')}
  <rect y="1040" width="1080" height="80" fill="#3a4a5a" ${st()}/><rect y="1120" width="1080" height="800" fill="#c4ced4"/>
  <g transform="translate(780 860)"><rect x="-30" y="100" width="160" height="80" fill="#2b2f36" ${st()}/><path d="M20 100 L60 -40 L110 -40" stroke="#2b2f36" stroke-width="26" fill="none"/><rect x="80" y="-80" width="40" height="90" rx="8" fill="#9aa6b8" ${st()}/><circle cx="60" cy="60" r="30" fill="#9aa6b8" ${st()}/></g>
  ${[0, 1, 2, 3].map(i => `<rect x="${140 + i * 50}" y="900" width="30" height="140" rx="15" fill="#fff" fill-opacity=".6" ${st(3)}/><rect x="${143 + i * 50}" y="${960 + i * 10}" width="24" height="${76 - i * 10}" rx="10" fill="${['#ff4d5e', '#3ddc84', '#4fd1ff', '#ffcf3a'][i]}"/>`).join('')}</g>`;
}
export function cafeteria() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#f0dfc4"/><rect x="60" y="200" width="960" height="300" rx="16" fill="#3a3030" ${st()}/>${['CAFÉ', 'SÁNDWICH', 'SOPA', 'POSTRES'].map((t, i) => `<text x="${110 + (i % 2) * 470}" y="${300 + Math.floor(i / 2) * 120}" font-family="Montserrat" font-weight="800" font-size="52" fill="#f6e7c1">${t}</text>`).join('')}
  <rect x="0" y="760" width="1080" height="80" fill="#a8784c" ${st()}/><rect x="0" y="840" width="1080" height="380" fill="#c9966a"/>${[0, 1, 2, 3].map(i => `<rect x="${60 + i * 260}" y="660" width="140" height="100" rx="14" fill="#fff" ${st(3)}/><ellipse cx="${130 + i * 260}" cy="660" rx="60" ry="16" fill="#d6c7a1"/>`).join('')}
  <rect y="1220" width="1080" height="700" fill="#b8a080"/>${[0, 1, 2].map(i => `<ellipse cx="${200 + i * 340}" cy="1500" rx="140" ry="40" fill="#7a5a3a" ${st()}/><rect x="${190 + i * 340}" y="1500" width="20" height="200" fill="#5a4030"/>`).join('')}</g>`;
}
export function waiting() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#dfe6e8"/>${ceilingLight(260, 10, 560)}
  <rect x="640" y="300" width="360" height="220" rx="12" fill="#2b2f36" ${st()}/><rect x="660" y="320" width="320" height="180" fill="#5a7ab0"/><text x="820" y="430" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="#fff">N° 117</text>
  <rect x="60" y="560" width="480" height="300" fill="#9fb6c2" ${st()}/><text x="300" y="640" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="46" fill="#fff">RECEPCIÓN</text>
  <rect y="1150" width="1080" height="770" fill="#b9c4c8"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${40 + i * 175}" y="1000" width="150" height="150" rx="16" fill="#4f82ea" ${st()}/><rect x="${40 + i * 175}" y="1130" width="150" height="40" fill="#3c6ed6" ${st(3)}/>`).join('')}</g>`;
}
export function hospitalExt() {
  return `<g filter="url(#b2)"><rect width="1080" height="1920" fill="#9fd0f0"/><circle cx="880" cy="260" r="90" fill="#fff4c0"/>
  <rect x="120" y="420" width="840" height="900" fill="#e8ecef" ${st()}/>${Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<rect x="${170 + c * 160}" y="${560 + r * 160}" width="100" height="100" fill="#8fbfe0" ${st(3)}/>`).join('')).join('')}
  <rect x="380" y="360" width="320" height="120" rx="12" fill="#c0201a" ${st()}/><path d="M540 380 v80 M500 420 h80" stroke="#fff" stroke-width="24"/><text x="540" y="1250" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="70" fill="#2c4f8a">HOSPITAL</text>
  <rect y="1320" width="1080" height="600" fill="#8a949a"/><g transform="translate(700 1460)"><rect x="-240" y="-140" width="420" height="200" rx="20" fill="#fff" ${st()}/><rect x="-240" y="-60" width="420" height="30" fill="#c0201a"/><rect x="180" y="-90" width="110" height="150" rx="16" fill="#fff" ${st()}/><circle cx="-150" cy="70" r="46" fill="#2b2f36" ${st()}/><circle cx="200" cy="70" r="46" fill="#2b2f36" ${st()}/><rect x="-60" y="-170" width="80" height="34" rx="8" fill="#4f82ea" ${st(3)}/></g></g>`;
}
