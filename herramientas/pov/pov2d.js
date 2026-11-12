import { drawCharacter, drawHand, CAST } from './estilo.js';
import { EXPR } from './expr.js';
const W = 1080, H = 1920;
const G = await (await fetch('/guion.json')).json();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const sm = (a, b, t) => ease(clamp((t - a) / (b - a), 0, 1));
CAST.enfermera = { ...CAST.ana, id: 'enfermera', coat: undefined, outfit: 'shirt', top: '#5fb8a8', topS: '#4a9a8b', hair: '#5a3a2a', hairS: '#3e2718', brow: '#4a3020', irisCol: '#4a3a2c', skin: '#f0c6a4', skinS: '#d39f80' };
const O = '#26222a';
// ---------- techo del pasillo visto desde la camilla (perspectiva de un punto)
function ceiling(t, travel) {
  const VX = 540, VY = 250, F = 1650, HW = 1.55;          // HW: medio ancho del pasillo
  const P = (x, d) => [VX + x * F * .62 / d, VY + F / d];
  let s = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdd9da"/><stop offset="1" stop-color="#eef3f3"/></linearGradient>
    <linearGradient id="wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fc2b6"/><stop offset="1" stop-color="#b8ddd4"/></linearGradient>
    <linearGradient id="wr" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#86b9ad"/><stop offset="1" stop-color="#b2d8cf"/></linearGradient>
    <radialGradient id="lg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#cg)"/>`;
  const [l0x, l0y] = P(-HW, 1), [r0x] = P(HW, 1), [lfx, lfy] = P(-HW, 60), [rfx] = P(HW, 60);
  s += `<path d="M0 0 L${lfx} ${lfy} L${l0x} ${l0y} L0 ${H} Z" fill="url(#wl)"/><path d="M${W} 0 L${rfx} ${lfy} L${r0x} ${l0y} L${W} ${H} Z" fill="url(#wr)"/>`;
  s += `<path d="M${lfx} ${lfy} L${l0x} ${l0y} M${rfx} ${lfy} L${r0x} ${l0y}" stroke="${O}" stroke-width="4"/>`;
  // líneas longitudinales de las placas del techo
  for (const x of [-.9, -.3, .3, .9]) { const [ax, ay] = P(x, 60), [bx, by] = P(x, .6); s += `<path d="M${ax} ${ay} L${bx} ${by}" stroke="#a9b6b8" stroke-width="3"/>`; }
  // líneas transversales que avanzan (movimiento de la camilla)
  const step = 1.2;
  for (let k = 0; k < 40; k++) { const d = .7 + ((k * step - travel) % (40 * step) + 40 * step) % (40 * step); if (d > 50) continue; const [ax, ay] = P(-HW, d), [bx] = P(HW, d); s += `<path d="M${ax} ${ay} L${bx} ${ay}" stroke="#a9b6b8" stroke-width="${Math.min(5, 6 / d + 1)}"/>`; }
  // paneles de luz
  for (let k = 0; k < 14; k++) { const d0 = .9 + ((k * 3.6 - travel) % (14 * 3.6) + 14 * 3.6) % (14 * 3.6); if (d0 > 45) continue; const d1 = d0 + .7;
    const [a, b] = P(-.42, d1), [c] = P(.42, d1), [e, g] = P(-.42, d0), [h] = P(.42, d0);
    s += `<ellipse cx="${(a + c) / 2}" cy="${(b + g) / 2}" rx="${(h - e) * .9}" ry="${(g - b) * 1.2 + 10}" fill="url(#lg)" opacity=".6"/><path d="M${a} ${b} L${c} ${b} L${h} ${g} L${e} ${g} Z" fill="#ffffff" stroke="${O}" stroke-width="${Math.min(4, 4 / d0 + 1.5)}"/>`; }
  // puertas en las paredes
  for (let k = 0; k < 8; k++) { const d0 = 1.2 + ((k * 4.4 + 2 - travel) % (8 * 4.4) + 8 * 4.4) % (8 * 4.4); if (d0 > 40) continue; const d1 = d0 + 1.1;
    for (const sd of [-1, 1]) { if ((k + (sd > 0 ? 1 : 0)) % 2) continue; const xa = sd * HW, [ax, ay] = P(xa, d0), [bx, by] = P(xa, d1); const ext = sd * 900;
      const ox = q => ax + (bx - ax) * q;
      s += `<path d="M${ax} ${ay} L${bx} ${by} L${bx + ext / d1} ${by - 30 / d1} L${ax + ext / d0} ${ay - 30 / d0} Z" fill="#7fb8d6" stroke="${O}" stroke-width="${Math.min(4, 5 / d0 + 1)}"/>`; } }
  return s;
}
// ---------- personaje inclinado sobre la cámara (busto que entra desde el borde)
function lean(id, pose, hx, hy, ang, sc) {
  const c = CAST[id], hyLocal = c.headY * c.scale * sc, r = ang * Math.PI / 180;
  const tx = hx + Math.sin(r) * hyLocal * -1 * -1, ty = hy - Math.cos(r) * hyLocal;
  return `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${ang}) scale(${sc})">${drawCharacter(id, pose)}</g>`;
}
const talking = (who, t) => G.lines.some(l => l.who === who && t >= l.t0 && t < l.t1);
const mouth = (who, t) => talking(who, t) ? .12 + .7 * Math.abs(Math.sin(t * 13 + (who === 'doc' ? 1 : 0))) * (.6 + .4 * Math.abs(Math.sin(t * 3.1))) : 0;
const blink = (t, seed) => { const ph = ((t + seed) % 3.4) / 3.4; return ph > .955 ? .05 : 1; };
const OUT = document.createElement('canvas'); OUT.width = W; OUT.height = H; const OX = OUT.getContext('2d');
async function svgImg(svg) { const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await new Promise(r => { img.onload = r; img.src = u; }); URL.revokeObjectURL(u); return img; }
window.renderFrame = async (i) => {
  const t = i / 30, T = G.total;
  const travel = Math.min(t, 24) * 1.25;
  const L = G.lines.find(l => t >= l.t0 - .3 && t < l.t1 + .45), who = L ? L.who : null;
  // giro de "cabeza" del paciente hacia quien habla (desplaza y rota todo un poco)
  const look = who === 'enf' ? -1 : who === 'doc' ? 1 : 0;
  const lx = Math.sin(t * .8) * 10 + look * 40, rot = Math.sin(t * .6) * 1.2 + look * 2.5;
  let svg = `<g transform="translate(${540 + lx} 960) rotate(${rot}) scale(1.06) translate(-540 -960)">${ceiling(t, travel)}`;
  // enfermera: entra desde la derecha y se inclina
  const nIn = sm(.8, 2.4, t);
  if (nIn > 0) svg += lean('enfermera', { face: { ...EXPR.worried, mouth: mouth('enf', t), look: [-.5, .85], open: blink(t, .3) }, head: { tilt: 0 }, armL: [10, -16], armR: [8, -10] }, lerp(1300, 760, nIn) + Math.sin(t * 2) * 6, 860 + Math.sin(t * 1.7) * 8, -32, 2.35);
  // doctor: entra desde la izquierda
  const dIn = sm(11.0, 12.6, t), dClose = sm(24.8, 26.2, t);
  if (dIn > 0) svg += lean('house', { face: { ...(t > 30.5 ? EXPR.smug : EXPR.smirk), mouth: mouth('doc', t), look: [.45, .85], open: blink(t, 1.7) }, propL: 'cane', armL: [8, -6], armR: [40, 90], handR: 'open' }, lerp(-260, 330 + dClose * 60, dIn), lerp(820, 760, dClose) + Math.sin(t * 1.5) * 6, 30 - dClose * 6, 2.4 + dClose * .35);
  svg += `</g>`;
  // mano del paciente con pulsera
  const hp = sm(2.0, 3.2, t) * (1 - sm(8.5, 9.6, t));
  if (hp > 0) { const c = CAST.mujer; svg += `<g transform="translate(${260 + Math.sin(t * 2) * 8} ${2150 - hp * 420}) rotate(${-12 + Math.sin(t * 1.5) * 3})"><rect x="-70" y="40" width="140" height="420" rx="60" fill="#eac3a2" stroke="${O}" stroke-width="5"/><rect x="-74" y="60" width="148" height="46" rx="10" fill="#f6f6f2" stroke="${O}" stroke-width="4"/><rect x="-30" y="70" width="60" height="24" rx="4" fill="#9fc8e0"/>${drawHand({ ...c, skin: '#eac3a2', skinS: '#cfa284' }, 'open', [0, 50], [0, -1], true, 3.2)}</g>`; }
  const img = await svgImg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`);
  OX.save(); const blur = t < 3 ? (3 - t) * 4 : (t > T - 2.6 ? (t - (T - 2.6)) * 3 : 0); OX.filter = blur > .2 ? `blur(${blur.toFixed(1)}px)` : 'none'; OX.drawImage(img, 0, 0); OX.restore();
  const v = OX.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,20,30,.5)'); OX.fillStyle = v; OX.fillRect(0, 0, W, H);
  let lid = 1 - sm(.2, 1.4, t); if (t > 1.6 && t < 2.2) lid = Math.max(lid, Math.sin((t - 1.6) / .6 * Math.PI) * .8); lid = Math.max(lid, sm(T - 2.4, T - 1.4, t));
  if (lid > 0) { OX.fillStyle = '#05070a'; const hh = lid * H * .52; OX.beginPath(); OX.moveTo(0, 0); OX.lineTo(W, 0); OX.lineTo(W, hh); OX.quadraticCurveTo(W / 2, hh + 140 * lid, 0, hh); OX.fill(); OX.beginPath(); OX.moveTo(0, H); OX.lineTo(W, H); OX.lineTo(W, H - hh); OX.quadraticCurveTo(W / 2, H - hh - 140 * lid, 0, H - hh); OX.fill(); }
  OX.font = '400 52px Anton'; OX.textAlign = 'left'; OX.fillStyle = 'rgba(255,255,255,.92)'; if (t > 1.4 && t < 6) OX.fillText('PARTE 1', 48, 120);
  if (t > T - 1.6) { const k = sm(T - 1.6, T - 1.1, t); OX.save(); OX.globalAlpha = k; OX.textAlign = 'center'; OX.font = '400 130px Anton'; OX.lineWidth = 14; OX.strokeStyle = '#000'; OX.strokeText('CONTINUARÁ...', W / 2, H / 2); OX.fillStyle = '#ffd34d'; OX.fillText('CONTINUARÁ...', W / 2, H / 2); OX.restore(); }
  return OUT.toDataURL('image/jpeg', .9);
};
await document.fonts.load('400 60px Anton');
window.ready = true;
