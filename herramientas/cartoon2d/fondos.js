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
const whiteboard = (x, y, w, h) => `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="6" fill="#b5bac0" ${st()}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f9fbfa" ${st(2)}/>
 <path d="M${x + w * .55} ${y} L${x + w * .75} ${y} L${x + w * .35} ${y + h} L${x + w * .15} ${y + h} Z" fill="#fff" opacity=".7"/>
 <g font-family="Marker,Montserrat" font-weight="800" fill="#1f3f8a" transform="rotate(-1.5 ${x} ${y})">
 <text x="${x + 40}" y="${y + 80}" font-size="54">SÍNTOMAS</text><path d="M${x + 40} ${y + 96} q150 -6 300 -2" stroke="#1f3f8a" stroke-width="5" fill="none"/>
 <text x="${x + 40}" y="${y + 170}" font-size="40">- mareos</text><text x="${x + 40}" y="${y + 236}" font-size="40">- habla arrastrada</text><text x="${x + 40}" y="${y + 302}" font-size="40">- alcohol: 0.37</text>
 <text x="${x + 40}" y="${y + 380}" font-size="50" fill="#b3261e">¿NO BEBE?</text>
 <ellipse cx="${x + 190}" cy="${y + 364}" rx="190" ry="44" fill="none" stroke="#b3261e" stroke-width="5" transform="rotate(-3 ${x + 190} ${y + 364})"/>
 <path d="M${x + 420} ${y + 160} q40 60 0 140" stroke="#1f3f8a" stroke-width="5" fill="none"/><text x="${x + 440}" y="${y + 246}" font-size="56">?</text></g>
 <rect x="${x + w - 200}" y="${y + h + 6}" width="190" height="16" rx="4" fill="#9aa0a6" ${st(2)}/><rect x="${x + w - 180}" y="${y + h - 4}" width="54" height="12" rx="4" fill="#1f3f8a"/><rect x="${x + w - 110}" y="${y + h - 4}" width="54" height="12" rx="4" fill="#b3261e"/>`;
const xrayBox = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#d8dde2" ${st()}/><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="url(#xray)"/><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * .6}" ry="${h * .6}" fill="url(#glow)" opacity=".5"/>
 <g fill="none" stroke="#5d7088" stroke-width="5" opacity=".85"><path d="M${x + w / 2} ${y + 30} v${h - 60}"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${x + w / 2} ${y + 50 + i * 26} q-${w * .32} 6 -${w * .36} 30 M${x + w / 2} ${y + 50 + i * 26} q${w * .32} 6 ${w * .36} 30"/>`).join('')}</g>
 <path d="M${x + w * .38} ${y + h * .62} q${w * .2} -30 ${w * .3} 10 q-10 40 -${w * .3} 30 z" fill="#f2c063" opacity=".7"/>`;
const plant = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 0 L40 0 L32 80 L-32 80 Z" fill="#c9764a" ${st()}/>${[[-60, -150, -10], [-20, -190, 0], [30, -170, 15], [70, -120, 25], [-80, -90, -25], [10, -120, 5]].map(([lx, ly, r]) => `<path d="M0 0 Q${lx * .4} ${ly * .5} ${lx} ${ly} Q${lx * .5 + 20} ${ly * .5} 0 0 Z" fill="#4f8a4a" ${st(2.5)} transform="rotate(${r})"/>`).join('')}</g>`;
const ceilingLight = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="4" fill="#f6f4ea" ${st(2)}/><rect x="${x - 60}" y="${y + 26}" width="${w + 120}" height="160" fill="url(#glow)" opacity=".35"/>`;

export function officeA() {
  return `<g filter="url(#b1)"><rect width="1080" height="1920" fill="url(#wall)"/>${ceilingLight(140, 20, 520)}
  <rect x="770" y="80" width="330" height="1440" fill="#b3c2c2"/>
  <g filter="url(#b3)">${[860, 980].map((px, i) => `<ellipse cx="${px}" cy="${520 + i * 30}" rx="40" ry="46" fill="#7e6a5c"/><rect x="${px - 70}" y="${570 + i * 30}" width="140" height="420" rx="40" fill="${i ? '#7fa7b0' : '#e9ecee'}"/>`).join('')}<rect x="770" y="1050" width="330" height="460" fill="#8c9a99"/></g>
  <rect x="770" y="80" width="330" height="1440" fill="url(#glass)"/><path d="M820 80 L900 80 L800 700 L770 700 Z" fill="#fff" opacity=".25"/>
  <rect x="756" y="70" width="26" height="1460" fill="#c9d0cd" ${st()}/><rect x="760" y="760" width="340" height="18" fill="#c9d0cd" ${st(2)}/>
  ${whiteboard(40, 230, 640, 560)}
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
