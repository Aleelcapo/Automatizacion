import React from 'react';
import {random} from 'remotion';
import {C, FUENTE} from './tema';
import {IconoG} from './iconos';

/*
 Ilustraciones animadas (lienzo 600x600). Cada una recibe:
  f = frames desde que aparece, m = marcas (frames relativos) de palabras del guion, p = propiedades.
 Se usan desde el guion con {t: 'ilus', nombre, marcas: {clave: 'palabra'}, ...props}.
*/
type Props = {f: number; m: Record<string, number>; p: Record<string, any>};

const cl = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - cl(x), 3);
const prog = (f: number, a: number, dur: number) => ease((f - a) / dur);
const rebote = (f: number, a: number) => (f < a ? 0 : 1 - Math.exp(-(f - a) / 4) * Math.cos((f - a) / 2.6));
const mk = (m: Record<string, number>, k: string, def: number) => (m[k] !== undefined ? m[k] : def);
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Ícono de la biblioteca dentro de un SVG: centrado en (x, y) con tamaño s. */
const Ico: React.FC<{n: string; x: number; y: number; s: number; c?: string; c2?: string; r?: number; o?: number}> = ({n, x, y, s, c = C.oro, c2 = C.cian, r = 0, o = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`} opacity={o}>
    <IconoG nombre={n} s={s} color={c} color2={c2} />
  </g>
);

const Etq: React.FC<{x: number; y: number; t: string; c?: string; fondo?: string; s?: number; o?: number}> = ({x, y, t, c = C.texto, fondo = 'rgba(0,0,0,0.55)', s = 30, o = 1}) => {
  const w = t.length * s * 0.62 + s * 1.2;
  return (
    <g opacity={o}>
      <rect x={x - w / 2} y={y - s * 0.85} width={w} height={s * 1.7} rx={s * 0.85} fill={fondo} />
      <text x={x} y={y + s * 0.36} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={s} fill={c}>
        {t}
      </text>
    </g>
  );
};

const Brillos: React.FC<{f: number; x: number; y: number; r: number; n?: number; c?: string; desde?: number}> = ({f, x, y, r, n = 8, c = '#fff6c8', desde = 0}) => {
  if (f < desde) return null;
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + f / 30;
        const k = (Math.sin(f / 6 + i * 1.7) + 1) / 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        const s = 6 + k * 10;
        return <path key={i} d={`M${px},${py - s} L${px + s * 0.3},${py} L${px},${py + s} L${px - s * 0.3},${py} Z M${px - s},${py} L${px},${py - s * 0.3} L${px + s},${py} L${px},${py + s * 0.3} Z`} fill={c} opacity={0.4 + k * 0.6} />;
      })}
    </g>
  );
};

// ======================= BOWLING =======================
const PINOS: [number, number][] = [[300, 235], [278, 200], [322, 200], [256, 165], [300, 165], [344, 165], [234, 130], [278, 130], [322, 130], [366, 130]];
const Pino: React.FC<{x: number; y: number; r?: number; o?: number}> = ({x, y, r = 0, o = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(0.95)`} opacity={o}>
    <path d="M-6,-40 Q6,-40 6,-28 Q6,-20 3,-15 Q16,0 14,16 Q12,30 0,30 Q-12,30 -14,16 Q-16,0 -3,-15 Q-6,-20 -6,-28 Q-6,-40 0,-40 Z" fill="#f7f8fc" stroke="#c9d3e3" strokeWidth={2} />
    <rect x={-5} y={-22} width={10} height={3} fill={C.rojo} />
    <rect x={-5} y={-17} width={10} height={3} fill={C.rojo} />
  </g>
);
const Bolera: React.FC<Props> = ({f, m, p}) => {
  const modo = p.modo ?? 'strike';
  const t1 = mk(m, 'tiro', 6);
  const t2 = mk(m, 'segunda', t1 + 50);
  const viaje = 22;
  const bola = (t0: number, xFin: number) => {
    const k = cl((f - t0) / viaje);
    if (f < t0 || f > t0 + viaje + 2) return null;
    const y = 560 - (560 - 225) * ease(k * 0.9 + k * 0.1);
    const x = 300 + (xFin - 300) * k;
    const r = 62 - 38 * k;
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={p.color ?? '#ff8a3d'} />
        <circle cx={x - r * 0.25} cy={y - r * 0.3} r={r * 0.14} fill="#3a1a00" />
        <circle cx={x + r * 0.1} cy={y - r * 0.4} r={r * 0.14} fill="#3a1a00" />
        <circle cx={x} cy={y - r * 0.05} r={r * 0.16} fill="#3a1a00" />
      </g>
    );
  };
  const golpe1 = t1 + viaje;
  const golpe2 = t2 + viaje;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <linearGradient id="madera" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a30" />
          <stop offset="1" stopColor="#e7b273" />
        </linearGradient>
      </defs>
      <polygon points="50,600 550,600 400,70 200,70" fill="url(#madera)" />
      {[0.2, 0.4, 0.6, 0.8].map((k) => (
        <line key={k} x1={50 + 500 * k} y1={600} x2={200 + 200 * k} y2={70} stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
      ))}
      <polygon points="0,600 50,600 200,70 185,70" fill="#1d2433" />
      <polygon points="600,600 550,600 400,70 415,70" fill="#1d2433" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${290 + i * 10},470 l5,-14 l5,14 z`} fill="#fff" opacity={0.5} />)}
      {PINOS.map(([x, y], i) => {
        const queda = (modo === 'nueve' || modo === 'spare') && i === 9;
        const tg = queda ? (modo === 'spare' ? golpe2 : 99999) : golpe1;
        if (f < tg) return <Pino key={i} x={x} y={y} />;
        const t = f - tg;
        const dx = (x - 300) * 0.25 + (random(`px${i}`) - 0.5) * 14;
        return <Pino key={i} x={x + dx * t} y={y - 6 * t + 0.6 * t * t} r={(random(`pr${i}`) - 0.5) * 40 * t} o={cl(1 - t / 20)} />;
      })}
      {bola(t1, 300)}
      {modo === 'spare' && bola(t2, 366)}
      {f >= golpe1 && f < golpe1 + 12 && <circle cx={300} cy={190} r={50 + (f - golpe1) * 10} fill="none" stroke="#fff" strokeWidth={6} opacity={1 - (f - golpe1) / 12} />}
      {p.etiqueta && <Etq x={300} y={45} t={p.etiqueta} o={cl((f - (modo === 'spare' ? golpe2 : golpe1)) / 8)} fondo={p.color ?? '#ff8a3d'} c="#1a0d00" s={34} />}
    </svg>
  );
};

const TrofeoBrillo: React.FC<Props> = ({f, p}) => {
  const s = rebote(f, 0);
  const barra = ((f % 50) / 50) * 600 - 150;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <clipPath id="trofeoClip">
          <rect x={150} y={100} width={300} height={400} />
        </clipPath>
      </defs>
      <circle cx={300} cy={290} r={230} fill={p.color ?? C.oro} opacity={0.12} />
      <g transform={`translate(300 300) scale(${s})`}>
        <Ico n="trofeo" x={0} y={0} s={420} c={p.color ?? C.oro} />
      </g>
      <g clipPath="url(#trofeoClip)">
        <rect x={barra} y={80} width={40} height={460} fill="#fff" opacity={0.35} transform={`skewX(-20)`} />
      </g>
      <Brillos f={f} x={300} y={290} r={250} n={10} />
    </svg>
  );
};

// ======================= MANO IZQUIERDA =======================
const ManoFirma: React.FC<Props> = ({f, p}) => {
  const tem = p.temblor ?? 1;
  const dur = p.dur ?? 55;
  const N = 90;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = 110 + (i / N) * 380;
    const base = 330 + 45 * Math.sin(i * 0.33) * Math.sin(i * 0.07 + 1) + 22 * Math.sin(i * 0.9);
    const ruido = (random(`r${i}`) - 0.5) * 34 * tem + Math.sin(i * 2.3) * 9 * tem;
    pts.push([x, base + ruido]);
  }
  const k = Math.floor(prog(f, 4, dur) * N);
  const vis = pts.slice(0, k + 1);
  const [px, py] = vis[vis.length - 1];
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={60} y={180} width={480} height={300} rx={18} fill="#f4f1e8" transform="rotate(-3 300 330)" />
      <line x1={100} y1={420} x2={500} y2={400} stroke="#b9b2a0" strokeWidth={3} strokeDasharray="10 8" />
      <polyline points={vis.map((q) => q.join(',')).join(' ')} fill="none" stroke="#1a2a6c" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`translate(${px + 70} ${py - 70}) rotate(${Math.sin(f / 3) * 4 * tem})`}>
        <Ico n="pluma" x={0} y={0} s={190} c={p.color ?? '#a78bfa'} />
      </g>
      {p.etiqueta && <Etq x={300} y={130} t={p.etiqueta} fondo={p.color ?? '#a78bfa'} c="#120a2a" />}
    </svg>
  );
};

const CerebroPuente: React.FC<Props> = ({f, m, p}) => {
  const c1 = p.c1 ?? '#a78bfa';
  const c2 = p.c2 ?? C.verde;
  const cruza = mk(m, 'cruza', p.cruzar === false ? 99999 : 15);
  const der = prog(f, cruza + 10, 30);
  const pliegues = (cx: number, lado: number) =>
    [0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${cx - lado * 20},${150 + i * 65} q${lado * 60},${-25} ${lado * 110},${10}`} stroke="#000" strokeOpacity={0.18} strokeWidth={8} fill="none" strokeLinecap="round" />
    ));
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <ellipse cx={190} cy={300} rx={150} ry={210} fill={c1} />
      {pliegues(190, -1)}
      <ellipse cx={410} cy={300} rx={150} ry={210} fill="#5d6b7a" />
      <ellipse cx={410} cy={300} rx={150} ry={210} fill={c2} opacity={der} />
      {pliegues(410, 1)}
      <rect x={270} y={270} width={60} height={60} rx={12} fill="#fff" opacity={0.25} />
      {f > cruza &&
        [0, 1, 2].map((i) => {
          const t = ((f - cruza) / 18 + i / 3) % 1;
          return <circle key={i} cx={190 + 220 * t} cy={300 + Math.sin(t * Math.PI) * -30} r={16} fill="#fff" opacity={1 - Math.abs(t - 0.5)} />;
        })}
      <Etq x={160} y={560} t={p.izq ?? 'IZQUIERDA'} fondo={c1} c="#120a2a" s={28} />
      <Etq x={440} y={560} t={p.der ?? 'DERECHA'} fondo={der > 0.5 ? c2 : '#5d6b7a'} c={der > 0.5 ? '#062012' : '#e3e8f2'} s={28} />
    </svg>
  );
};

const CalendarioHojas: React.FC<Props> = ({f, p}) => {
  const desde = p.desde ?? 1;
  const hasta = p.hasta ?? 10;
  const dur = p.dur ?? 40;
  const n = Math.round(desde + (hasta - desde) * prog(f, 4, dur));
  const flip = ((f - 4) * (hasta - desde)) / dur;
  const fase = flip - Math.floor(flip);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={110} y={110} width={380} height={400} rx={36} fill="#f4f6fb" />
      <rect x={110} y={110} width={380} height={110} rx={36} fill={p.color ?? '#a78bfa'} />
      <rect x={110} y={180} width={380} height={40} fill={p.color ?? '#a78bfa'} />
      <rect x={180} y={80} width={26} height={70} rx={10} fill="#c9d3e3" />
      <rect x={394} y={80} width={26} height={70} rx={10} fill="#c9d3e3" />
      <text x={300} y={190} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={54} fill="#fff">
        {p.titulo ?? 'DÍA'}
      </text>
      <text x={300} y={430} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={200} fill="#1d2433" transform={`translate(0 ${f < dur + 4 ? (1 - fase) * -8 : 0})`}>
        {n}
      </text>
      {f < dur + 4 && <rect x={110} y={220} width={380} height={290 * (1 - fase)} fill="#e3e8f2" opacity={0.5} />}
    </svg>
  );
};

const RelojVueltas: React.FC<Props> = ({f, p}) => {
  const v = p.velocidad ?? 1;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <circle cx={300} cy={300} r={230} fill="#f4f6fb" />
      <circle cx={300} cy={300} r={210} fill="none" stroke={p.color ?? '#a78bfa'} strokeWidth={18} />
      {Array.from({length: 12}, (_, i) => (
        <line key={i} x1={300} y1={110} x2={300} y2={i % 3 ? 130 : 145} stroke="#1d2433" strokeWidth={i % 3 ? 5 : 10} transform={`rotate(${i * 30} 300 300)`} />
      ))}
      <line x1={300} y1={300} x2={300} y2={140} stroke={p.color ?? '#a78bfa'} strokeWidth={12} strokeLinecap="round" transform={`rotate(${f * 12 * v} 300 300)`} />
      <line x1={300} y1={300} x2={300} y2={200} stroke="#1d2433" strokeWidth={18} strokeLinecap="round" transform={`rotate(${f * v} 300 300)`} />
      <circle cx={300} cy={300} r={18} fill="#1d2433" />
      {p.etiqueta && <Etq x={300} y={570} t={p.etiqueta} fondo={p.color ?? '#a78bfa'} c="#120a2a" />}
    </svg>
  );
};

// ======================= DINERO / CIUDAD =======================
const LluviaBilletes: React.FC<Props> = ({f, p}) => {
  const pila = Math.min(1, f / 60);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      {Array.from({length: 7}, (_, i) => (
        <rect key={i} x={140 + i * 6} y={540 - i * 16 * pila} width={320} height={22} rx={4} fill={i % 2 ? '#2fa865' : '#3ddc84'} opacity={pila > i / 7 ? 1 : 0} />
      ))}
      {Array.from({length: 16}, (_, i) => {
        const x = 40 + random(`bx${i}`) * 520;
        const vel = 6 + random(`bv${i}`) * 5;
        const y = ((random(`by${i}`) * 700 + f * vel) % 700) - 100;
        const r = Math.sin(f / 8 + i) * 35;
        return (
          <g key={i} transform={`translate(${x + Math.sin(f / 10 + i) * 30} ${y}) rotate(${r})`}>
            <rect x={-45} y={-24} width={90} height={48} rx={5} fill="#3ddc84" />
            <rect x={-38} y={-17} width={76} height={34} rx={3} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} />
            <text x={0} y={9} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={24} fill="#fff">$</text>
          </g>
        );
      })}
    </svg>
  );
};

const CiudadCrece: React.FC<Props> = ({f, m}) => {
  const tC = mk(m, 'casas', 4);
  const tN = mk(m, 'negocios', 20);
  const tA = mk(m, 'autos', 36);
  const crece = (t0: number) => ease((f - t0) / 14);
  const autoX = -150 + 800 * cl((f - tA) / 50);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={0} y={470} width={600} height={130} fill="#2a3346" />
      <line x1={0} y1={530} x2={600} y2={530} stroke="#ffe28a" strokeWidth={6} strokeDasharray="30 24" />
      {[60, 170].map((x, i) => (
        <g key={x} transform={`translate(${x} 470) scale(1 ${crece(tC + i * 5)})`}>
          <rect x={0} y={-120} width={90} height={120} fill="#f4f6fb" />
          <path d="M-12,-118 L45,-175 L102,-118 Z" fill={C.oro} />
          <rect x={33} y={-60} width={24} height={60} fill="#8b5a2b" />
        </g>
      ))}
      {[300, 420].map((x, i) => (
        <g key={x} transform={`translate(${x} 470) scale(1 ${crece(tN + i * 5)})`}>
          <rect x={0} y={-230 + i * 50} width={100} height={230 - i * 50} fill={i ? '#6b8bd6' : '#7c5cff'} />
          {Array.from({length: 6}, (_, r) => [0, 1].map((k) => <rect key={`${r}${k}`} x={16 + k * 42} y={-210 + i * 50 + r * 32} width={26} height={18} fill="#ffe28a" opacity={0.8} />))}
        </g>
      ))}
      <g transform={`translate(${autoX} 505)`}>
        <Ico n="auto" x={0} y={0} s={150} c={C.rojo} />
      </g>
    </svg>
  );
};

const BalanzaInclina: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'inclina', 18);
  const ang = (p.angulo ?? 18) * rebote(f, t) + Math.sin(f / 10) * 2;
  const rad = (ang * Math.PI) / 180;
  const L = 210;
  const lx = 300 - L * Math.cos(rad);
  const ly = 170 - L * Math.sin(rad);
  const rx = 300 + L * Math.cos(rad);
  const ry = 170 + L * Math.sin(rad);
  const plato = (x: number, y: number, ico: string, col: string, lab: string, n: number) => (
    <g>
      <line x1={x} y1={y} x2={x - 70} y2={y + 140} stroke="#c9d3e3" strokeWidth={3} />
      <line x1={x} y1={y} x2={x + 70} y2={y + 140} stroke="#c9d3e3" strokeWidth={3} />
      {Array.from({length: n}, (_, i) => (
        <Ico key={i} n={ico} x={x - (n - 1) * 22 + i * 44} y={y + 110 - (i % 2) * 20} s={90} c={col} />
      ))}
      <path d={`M${x - 95},${y + 140} Q${x},${y + 200} ${x + 95},${y + 140} Z`} fill={col} />
      <Etq x={x} y={y + 245} t={lab} fondo={col} c="#140a0a" s={26} />
    </g>
  );
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%" style={{overflow: 'visible'}}>
      <rect x={290} y={170} width={20} height={330} fill="#c9d3e3" />
      <rect x={200} y={490} width={200} height={26} rx={8} fill="#c9d3e3" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#e3e8f2" strokeWidth={16} strokeLinecap="round" />
      <circle cx={300} cy={170} r={18} fill={C.oro} />
      {plato(lx, ly, p.izq ?? 'bolsa', p.cizq ?? C.verde, p.tizq ?? 'ENTRA', p.nizq ?? 1)}
      {plato(rx, ry, p.der ?? 'alerta', p.cder ?? C.rojo, p.tder ?? 'SE PIERDE', p.nder ?? 3)}
    </svg>
  );
};

const Grafico: React.FC<Props> = ({f, p}) => {
  const forma = p.forma ?? 'baja';
  const col = p.color ?? (forma === 'sube' ? C.verde : C.rojo);
  const N = 30;
  const ys = Array.from({length: N + 1}, (_, i) => {
    const x = i / N;
    const ruido = Math.sin(i * 1.7) * 0.04;
    if (forma === 'sube') return 0.2 + 0.65 * Math.pow(x, 1.5) + ruido;
    if (forma === 'cae_y_sube') return x < 0.7 ? 0.85 - 0.7 * Math.pow(x / 0.7, 1.2) + ruido : 0.15 + 0.3 * ((x - 0.7) / 0.3) + ruido;
    return 0.85 - 0.7 * Math.pow(x, 1.3) + ruido;
  });
  const k = Math.max(1, Math.round(prog(f, 3, p.dur ?? 40) * N));
  const pts = ys.slice(0, k + 1).map((y, i) => [60 + (i / N) * 480, 520 - y * 400]);
  const area = `M60,520 L${pts.map((q) => q.join(',')).join(' L')} L${pts[pts.length - 1][0]},520 Z`;
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <linearGradient id={`area-${forma}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity={0.5} />
          <stop offset="1" stopColor={col} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={30} y={60} width={540} height={500} rx={30} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={60} y1={520 - g * 400} x2={540} y2={520 - g * 400} stroke="#fff" strokeOpacity={0.08} strokeWidth={2} />)}
      <path d={area} fill={`url(#area-${forma})`} />
      <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r={16} fill={col} />
      <circle cx={ex} cy={ey} r={16 + (f % 20) * 1.5} fill="none" stroke={col} strokeWidth={4} opacity={1 - (f % 20) / 20} />
      {p.etiqueta && <Etq x={300} y={110} t={p.etiqueta} fondo={col} c="#140a0a" s={28} />}
    </svg>
  );
};

const TiendaCerrada: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'cierra', 12);
  const baja = prog(f, t, 16);
  const candado = rebote(f, t + 16);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={90} y={160} width={420} height={380} fill="#3a4258" />
      <path d="M70,160 L530,160 L510,230 L90,230 Z" fill={C.rojo} />
      {Array.from({length: 7}, (_, i) => <path key={i} d={`M${90 + i * 60},230 l30,0 l0,20 q-15,12 -30,0 z`} fill={i % 2 ? '#fff' : C.rojo} />)}
      <rect x={130} y={280} width={340} height={240} fill="#9fd0ff" opacity={0.35} />
      <rect x={130} y={280} width={340} height={240 * baja} fill="#8d96a8" />
      {Array.from({length: Math.floor(12 * baja)}, (_, i) => <line key={i} x1={130} y1={290 + i * 20} x2={470} y2={290 + i * 20} stroke="#6b7486" strokeWidth={4} />)}
      {candado > 0 && <Ico n="candado" x={300} y={470 - (1 - Math.min(1, candado)) * 120} s={130} c={C.rojo} />}
      <text x={300} y={205} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={40} fill="#fff">
        NEGOCIO
      </text>
    </svg>
  );
};

const CasaPrecio: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'sube', 10);
  const k = prog(f, t, 40);
  const v = (p.desde ?? 50000) + ((p.hasta ?? 250000) - (p.desde ?? 50000)) * k;
  const col = k > 0.5 ? C.rojo : C.oro;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="casa" x={230} y={340} s={380} c={C.oro} />
      <g transform={`translate(430 170) rotate(${Math.sin(f / 9) * 8})`}>
        <line x1={0} y1={-60} x2={-60} y2={40} stroke="#c9d3e3" strokeWidth={4} />
        <path d="M-40,20 L120,20 L150,70 L120,120 L-40,120 Z" fill={col} />
        <circle cx={-20} cy={70} r={10} fill="#1d2433" />
        <text x={50} y={84} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={36} fill="#1d2433">
          ${fmt(v / 1000)}k
        </text>
      </g>
      <g opacity={k}>
        <Ico n="grafico_sube" x={470} y={420} s={150} c={C.rojo} />
      </g>
    </svg>
  );
};

const Piramide: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'riesgo', 25);
  const al = rebote(f, t);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <path d="M300,80 L540,520 L60,520 Z" fill="#2a3346" stroke="#4a5470" strokeWidth={4} />
      <line x1={200} y1={260} x2={400} y2={260} stroke="#4a5470" strokeWidth={4} />
      <circle cx={300} cy={170} r={70} fill={C.oro} opacity={0.2 + 0.1 * Math.sin(f / 6)} />
      <Ico n="persona" x={270} y={180} s={90} c={C.oro} />
      <Ico n="bolsa" x={335} y={195} s={80} c={C.oro} />
      <Brillos f={f} x={300} y={175} r={90} n={6} />
      {Array.from({length: 7}, (_, i) => (
        <g key={i}>
          <Ico n="persona" x={130 + i * 57} y={470} s={60} c="#9fb0c8" />
          {al > 0 && <Ico n="alerta" x={130 + i * 57} y={400 - Math.sin(f / 4 + i) * 6} s={46 * Math.min(1.1, al)} c={C.rojo} />}
        </g>
      ))}
      <Etq x={300} y={45} t="LA GANANCIA" fondo={C.oro} c="#2a1c00" s={26} />
      <Etq x={300} y={570} t="EL RIESGO" fondo={C.rojo} c="#2a0008" s={26} o={cl(al)} />
    </svg>
  );
};

// ======================= ANIMALES / LUGARES =======================
const JaulaAbre: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'abre', 15);
  const puerta = prog(f, t, 14);
  const sale = prog(f, t + 12, 50);
  const ex = 220 + sale * 260;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={0} y={470} width={600} height={130} fill="#2b6b4a" />
      {[470, 540].map((x, i) => (
        <g key={x} opacity={sale}>
          <Ico n="hoja" x={x} y={390 - i * 30} s={120 + i * 20} c={C.verde} />
        </g>
      ))}
      <g transform={`translate(${ex} ${420 + Math.abs(Math.sin(f / 5)) * -8 * (sale > 0 && sale < 1 ? 1 : 0)})`}>
        <Ico n="elefante" x={0} y={0} s={190} c="#9aa6b4" />
      </g>
      <rect x={90} y={250} width={260} height={16} rx={6} fill="#c9d3e3" />
      <rect x={90} y={466} width={260} height={16} rx={6} fill="#c9d3e3" />
      {[100, 140, 180, 220, 260].map((x) => <rect key={x} x={x} y={266} width={10} height={200} fill="#c9d3e3" />)}
      <g transform={`translate(340 0) scale(${1 - puerta * 0.85} 1)`}>
        {[0, 1].map((k) => <rect key={k} x={-40 + k * 30} y={266} width={10} height={200} fill="#c9d3e3" />)}
      </g>
      {sale > 0.6 && <Ico n="corazon" x={ex + 40} y={300 - (sale - 0.6) * 100} s={60} c={C.rojo} o={cl((sale - 0.6) * 4)} />}
    </svg>
  );
};

const MapaPin: React.FC<Props> = ({f, p}) => {
  const caida = rebote(f, 6);
  const x = p.x ?? 330;
  const y = p.y ?? 330;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <path
        d="M230,70 Q330,60 380,120 Q440,170 430,240 Q470,300 420,360 Q400,430 340,470 Q300,540 260,560 Q250,500 240,440 Q200,380 210,320 Q160,270 180,200 Q170,120 230,70 Z"
        fill={p.tierra ?? '#2b6b4a'}
        stroke="#4ea47a"
        strokeWidth={4}
      />
      {[0, 1, 2].map((i) => {
        const r = ((f + i * 15) % 45) * 3;
        return <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={p.color ?? C.rojo} strokeWidth={4} opacity={(1 - r / 135) * (f > 14 ? 1 : 0)} />;
      })}
      <g transform={`translate(${x} ${y - 60 - (1 - Math.min(1, caida)) * 200})`}>
        <path d="M0,60 Q-50,0 -50,-20 Q-50,-70 0,-70 Q50,-70 50,-20 Q50,0 0,60 Z" fill={p.color ?? C.rojo} />
        <circle cx={0} cy={-22} r={18} fill="#fff" />
      </g>
      {p.etiqueta && <Etq x={300} y={560} t={p.etiqueta} fondo={p.color ?? C.rojo} c="#fff" s={30} o={cl((f - 14) / 8)} />}
    </svg>
  );
};

const Camion: React.FC<Props> = ({f}) => {
  const x = -260 + 340 * prog(f, 2, 40);
  const giro = f * 12;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={0} y={420} width={600} height={180} fill="#2a3346" />
      <line x1={0} y1={480} x2={600} y2={480} stroke="#ffe28a" strokeWidth={6} strokeDasharray="30 24" strokeDashoffset={f * 6} />
      <g transform={`translate(${x} 0)`}>
        <rect x={60} y={250} width={260} height={150} rx={10} fill="#f4f6fb" />
        <rect x={320} y={300} width={110} height={100} rx={14} fill={C.verde} />
        <rect x={340} y={315} width={60} height={40} rx={6} fill="#bfe3ff" />
        <Ico n="corazon" x={190} y={325} s={90} c={C.rojo} />
        {[120, 370].map((wx) => (
          <g key={wx} transform={`translate(${wx} 410) rotate(${giro})`}>
            <circle r={34} fill="#1d2433" />
            <circle r={14} fill="#9aa6b4" />
            <rect x={-3} y={-30} width={6} height={20} fill="#5d6b7a" />
          </g>
        ))}
      </g>
      <g opacity={prog(f, 30, 10)}>
        <rect x={296} y={110} width={8} height={130} fill="#c9d3e3" />
        <rect x={190} y={60} width={220} height={70} rx={10} fill={C.verde} />
        <text x={300} y={108} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={34} fill="#032312">
          RESCATE
        </text>
      </g>
    </svg>
  );
};

const ElefanteCamina: React.FC<Props> = ({f, p}) => {
  const paso = Math.sin(f / 4);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <ellipse cx={300} cy={470} rx={260} ry={30} fill="#000" opacity={0.25} />
      <g transform={`translate(300 ${330 + Math.abs(paso) * -8}) rotate(${paso * 2})`}>
        <Ico n="elefante" x={0} y={0} s={420} c={p.color ?? '#9aa6b4'} />
      </g>
      {p.etiqueta && <Etq x={300} y={560} t={p.etiqueta} fondo={p.color ?? '#9aa6b4'} c="#0b1430" s={32} />}
    </svg>
  );
};

// ======================= OJOS / CIENCIA =======================
const OjoGrande: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'cambia', 9999);
  const k = prog(f, t, 20);
  const c1 = p.color ?? '#4aa3ff';
  const c2 = p.color2 ?? c1;
  const parp = f % 90;
  const cierre = parp > 80 ? Math.sin(((parp - 80) / 10) * Math.PI) : 0;
  const pupila = 46 + Math.sin(f / 20) * 6 + (p.dilata ? prog(f, 10, 20) * 20 : 0);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <radialGradient id={`iris-${c1}`}>
          <stop offset="0.3" stopColor="#000" stopOpacity={0.4} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <clipPath id="ojoClip">
          <path d="M40,300 Q300,40 560,300 Q300,560 40,300 Z" />
        </clipPath>
      </defs>
      <path d="M40,300 Q300,40 560,300 Q300,560 40,300 Z" fill="#f7f4ee" />
      <g clipPath="url(#ojoClip)">
        <circle cx={300} cy={300} r={140} fill={c1} />
        <circle cx={300} cy={300} r={140} fill={c2} opacity={k} />
        {Array.from({length: 48}, (_, i) => (
          <line key={i} x1={300} y1={300} x2={300 + Math.cos((i / 48) * Math.PI * 2) * 138} y2={300 + Math.sin((i / 48) * Math.PI * 2) * 138} stroke="#fff" strokeOpacity={0.18} strokeWidth={3} />
        ))}
        <circle cx={300} cy={300} r={140} fill={`url(#iris-${c1})`} />
        <circle cx={300} cy={300} r={140} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={8} />
        <circle cx={300} cy={300} r={pupila} fill="#0a0a12" />
        <circle cx={262} cy={258} r={22} fill="#fff" opacity={0.9} />
        <rect x={0} y={0} width={600} height={300 * cierre} fill="#d9a77a" />
        <rect x={0} y={600 - 300 * cierre} width={600} height={300 * cierre} fill="#d9a77a" />
      </g>
      <path d="M40,300 Q300,40 560,300" fill="none" stroke="#3a2a20" strokeWidth={10} strokeLinecap="round" />
      {p.etiqueta && <Etq x={300} y={560} t={p.etiqueta} fondo={k > 0.5 ? c2 : c1} c="#0b1430" s={32} />}
    </svg>
  );
};

const LuzIris: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'rebota', 15);
  const entra = prog(f, 3, 12);
  const dispersa = prog(f, t, 20);
  const tc = mk(m, 'cielo', 40);
  const cielo = prog(f, tc, 15);
  const rayos = (cx: number, cy: number, k: number, r0: number) =>
    Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * (r0 + 90 * k)} y2={cy + Math.sin(a) * (r0 + 90 * k)} stroke="#5ac8ff" strokeWidth={8} strokeLinecap="round" opacity={k} />;
    });
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <circle cx={210} cy={360} r={130} fill="#4aa3ff" />
      <circle cx={210} cy={360} r={50} fill="#0a0a12" />
      <line x1={0} y1={120} x2={0 + 210 * entra} y2={120 + 240 * entra} stroke="#fff8d0" strokeWidth={14} strokeLinecap="round" />
      {rayos(210, 360, dispersa, 140)}
      <g opacity={cielo}>
        <circle cx={470} cy={170} r={100} fill="#5ac8ff" />
        <Ico n="sol" x={510} y={120} s={90} c={C.oro} />
        <Ico n="nube" x={440} y={200} s={110} c="#ffffff" />
        <text x={470} y={320} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={36} fill="#fff">
          = CIELO
        </text>
      </g>
      <text x={210} y={560} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={36} fill="#fff" opacity={dispersa}>
        IRIS
      </text>
    </svg>
  );
};

const AdnHelice: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'marca', 15);
  const marca = prog(f, t, 10);
  const items: React.ReactNode[] = [];
  for (let y = 60; y <= 540; y += 24) {
    const a = y / 45 + f / 9;
    const x1 = 300 + 140 * Math.sin(a);
    const x2 = 300 - 140 * Math.sin(a);
    const centro = Math.abs(y - 300) < 12;
    items.push(<line key={`r${y}`} x1={x1} y1={y} x2={x2} y2={y} stroke={centro && marca > 0 ? C.oro : '#ffffff'} strokeOpacity={centro && marca > 0 ? 1 : 0.35} strokeWidth={centro && marca > 0 ? 12 : 6} />);
    items.push(<circle key={`a${y}`} cx={x1} cy={y} r={11} fill={p.c1 ?? '#4aa3ff'} opacity={0.6 + 0.4 * Math.cos(a)} />);
    items.push(<circle key={`b${y}`} cx={x2} cy={y} r={11} fill={p.c2 ?? '#a78bfa'} opacity={0.6 - 0.4 * Math.cos(a)} />);
  }
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      {items}
      {marca > 0 && <circle cx={300} cy={300} r={60 + 20 * Math.sin(f / 5)} fill="none" stroke={C.oro} strokeWidth={6} opacity={marca} />}
      {p.etiqueta && <Etq x={300} y={300} t={p.etiqueta} fondo={C.oro} c="#2a1c00" s={30} o={marca} />}
    </svg>
  );
};

const ArbolFamilia: React.FC<Props> = ({f, p}) => {
  const gens = [1, 2, 4, 8];
  const ys = [90, 230, 370, 510];
  const xs = (n: number) => Array.from({length: n}, (_, i) => 300 + (i - (n - 1) / 2) * (520 / Math.max(n, 2)) * (n === 1 ? 0 : 1));
  const el: React.ReactNode[] = [];
  gens.forEach((n, g) => {
    const aparece = prog(f, g * 12, 10);
    xs(n).forEach((x, i) => {
      if (g > 0) {
        const px = xs(gens[g - 1])[Math.floor(i / 2)];
        el.push(<line key={`l${g}${i}`} x1={px} y1={ys[g - 1] + 40} x2={px + (x - px) * aparece} y2={ys[g - 1] + 40 + (ys[g] - 50 - ys[g - 1] - 40) * aparece} stroke="#5ac8ff" strokeOpacity={0.6} strokeWidth={4} />);
      }
      el.push(
        <g key={`p${g}${i}`} opacity={aparece} transform={`translate(${x} ${ys[g]}) scale(${(g === 0 ? 1.4 : 1 - g * 0.12) * aparece})`}>
          <circle cy={-14} r={22} fill={g === 0 ? (p.color ?? '#4aa3ff') : '#9fb0c8'} />
          <path d="M-32,36 Q-32,6 0,6 Q32,6 32,36 Z" fill={g === 0 ? (p.color ?? '#4aa3ff') : '#9fb0c8'} />
          <circle cx={-7} cy={-16} r={4} fill="#4aa3ff" />
          <circle cx={7} cy={-16} r={4} fill="#4aa3ff" />
        </g>,
      );
    });
  });
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      {el}
    </svg>
  );
};

const SolMapa: React.FC<Props> = ({f}) => {
  const rayos = Array.from({length: 7}, (_, i) => {
    const y = 120 + i * 60;
    const k = 1 - i / 7;
    return <line key={i} x1={600} y1={560} x2={600 - 520 * (0.5 + 0.5 * Math.sin(f / 15 + i))} y2={y} stroke="#ffe28a" strokeWidth={6 + k * 8} opacity={0.15 + (1 - k) * 0.5} />;
  });
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <linearGradient id="luzLat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a52" />
          <stop offset="1" stopColor="#ffb648" />
        </linearGradient>
      </defs>
      <circle cx={300} cy={300} r={240} fill="url(#luzLat)" />
      {rayos}
      <path d="M220,120 Q280,90 330,120 Q370,150 350,190 Q300,200 260,180 Q200,170 220,120 Z" fill="#2b6b4a" />
      <path d="M260,250 Q330,240 360,300 Q370,380 320,440 Q280,420 270,350 Q240,300 260,250 Z" fill="#2b6b4a" />
      <Ico n="sol" x={500} y={480} s={150} c={C.oro} />
      <Etq x={300} y={60} t="NORTE: MENOS LUZ" fondo="#1b2a52" c="#9fd0ff" s={26} />
      <Etq x={300} y={575} t="ECUADOR: MÁS LUZ" fondo="#ffb648" c="#2a1c00" s={26} />
    </svg>
  );
};

// ======================= COSQUILLAS =======================
const PlumaMano: React.FC<Props> = ({f, p}) => {
  const siente = p.siente ?? true;
  const x = 300 + Math.sin(f / 3) * 70;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <g transform={`translate(300 360) ${siente ? `rotate(${Math.sin(f * 1.3) * 3})` : ''}`}>
        <Ico n="mano" x={0} y={0} s={380} c="#f2c9a0" />
      </g>
      <g transform={`translate(${x} ${300 + Math.cos(f / 3) * 20}) rotate(${-30 + Math.sin(f / 3) * 20})`}>
        <Ico n="pluma_cosquilla" x={0} y={0} s={200} c={p.color ?? '#ff7ab6'} />
      </g>
      {siente &&
        [0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${120 + i * 120},${160 + (i % 2) * 30} q12,-14 24,0 t24,0 t24,0`} stroke="#fff" strokeWidth={6} fill="none" opacity={0.5 + 0.5 * Math.sin(f / 3 + i)} />
        ))}
      {siente && (
        <text x={300} y={120} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={56} fill={p.color ?? '#ff7ab6'} transform={`rotate(${Math.sin(f / 4) * 4} 300 100)`}>
          ¡JA JA JA!
        </text>
      )}
      {!siente && <Etq x={300} y={110} t="NADA…" fondo="#5d6b7a" s={34} />}
    </svg>
  );
};

const SenalCerebro: React.FC<Props> = ({f, m, p}) => {
  const tc = mk(m, 'copia', 20);
  const copia = prog(f, tc, 25);
  const brillo = prog(f, tc + 22, 8);
  const curva = (t: number) => {
    const x = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 120 + t * t * 330;
    const y = (1 - t) * (1 - t) * 480 + 2 * (1 - t) * t * 250 + t * t * 220;
    return [x, y];
  };
  const pulsos = [0, 1, 2].map((i) => curva(((f / 25 + i / 3) % 1)));
  const [cx, cy] = curva(copia);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="mano" x={140} y={480} s={200} c="#f2c9a0" />
      <Ico n="cerebro" x={360} y={190} s={330} c={p.color ?? '#ff7ab6'} c2={brillo > 0 ? C.oro : '#c95a92'} />
      {brillo > 0 && <circle cx={442} cy={300} r={50 + 10 * Math.sin(f / 4)} fill="none" stroke={C.oro} strokeWidth={6} opacity={brillo} />}
      <path d="M150,480 Q120,250 330,220" stroke="#fff" strokeOpacity={0.25} strokeWidth={6} fill="none" strokeDasharray="12 10" />
      {pulsos.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={10} fill="#fff" />)}
      {f > tc && copia < 1 && (
        <g transform={`translate(${cx + (442 - 330) * copia} ${cy + (300 - 220) * copia})`}>
          <rect x={-55} y={-30} width={110} height={60} rx={8} fill={C.oro} />
          <path d="M-55,-30 L0,8 L55,-30" stroke="#2a1c00" strokeWidth={4} fill="none" />
        </g>
      )}
      {brillo > 0 && <Etq x={440} y={410} t="CEREBELO" fondo={C.oro} c="#2a1c00" s={28} o={brillo} />}
    </svg>
  );
};

const Volumen: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'baja', 15);
  const nivel = 1 - (1 - (p.nivel ?? 0.12)) * prog(f, t, 20);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <path d="M90,240 L170,240 L270,150 L270,450 L170,360 L90,360 Z" fill="#e3e8f2" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${310 + i * 50},${230 - i * 30} Q${350 + i * 60},300 ${310 + i * 50},${370 + i * 30}`} stroke={p.color ?? '#ff7ab6'} strokeWidth={14} fill="none" strokeLinecap="round" opacity={nivel > (i + 0.5) / 3 ? 1 : 0.12} />
      ))}
      <rect x={500} y={120} width={40} height={360} rx={20} fill="rgba(255,255,255,0.12)" />
      <rect x={500} y={120 + 360 * (1 - nivel)} width={40} height={360 * nivel} rx={20} fill={nivel < 0.4 ? C.rojo : C.verde} />
      <circle cx={520} cy={120 + 360 * (1 - nivel)} r={30} fill="#fff" />
      <Etq x={300} y={550} t={p.etiqueta ?? 'VOLUMEN'} fondo={nivel < 0.4 ? C.rojo : C.verde} c="#120a0a" s={30} />
    </svg>
  );
};

const RobotCosquillas: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'retraso', 30);
  const vuelve = f > t + 10;
  const a1 = -40 + Math.sin(f / 6) * 10;
  const a2 = 60 + Math.sin(f / 4) * 25;
  const x1 = 120 + Math.cos((a1 * Math.PI) / 180) * 180;
  const y1 = 470 + Math.sin((a1 * Math.PI) / 180) * 180;
  const x2 = x1 + Math.cos(((a1 + a2) * Math.PI) / 180) * 160;
  const y2 = y1 + Math.sin(((a1 + a2) * Math.PI) / 180) * 160;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="mano" x={470} y={460} s={240} c="#f2c9a0" r={-20} />
      <rect x={60} y={480} width={120} height={50} rx={10} fill="#8d96a8" />
      <line x1={120} y1={470} x2={x1} y2={y1} stroke="#c9d3e3" strokeWidth={30} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9d3e3" strokeWidth={22} strokeLinecap="round" />
      <circle cx={120} cy={470} r={22} fill="#5d6b7a" />
      <circle cx={x1} cy={y1} r={18} fill="#5d6b7a" />
      <g transform={`translate(${x2} ${y2}) rotate(${a1 + a2 + 90})`}>
        <Ico n="pluma_cosquilla" x={0} y={30} s={110} c={p.color ?? '#ff7ab6'} />
      </g>
      <g opacity={prog(f, t, 8)}>
        <Ico n="reloj" x={480} y={130} s={120} c={C.oro} />
        <Etq x={480} y={230} t="+ RETRASO" fondo={C.oro} c="#2a1c00" s={26} />
      </g>
      {vuelve && [0, 1, 2].map((i) => <path key={i} d={`M${400 + i * 50},${330 - (i % 2) * 20} q10,-12 20,0 t20,0`} stroke="#fff" strokeWidth={5} fill="none" opacity={0.5 + 0.5 * Math.sin(f / 3 + i)} />)}
    </svg>
  );
};

const InsectoBrazo: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'detecta', 25);
  const x = 80 + ((f * 4) % 420);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <rect x={20} y={300} width={500} height={130} rx={65} fill="#f2c9a0" />
      <Ico n="mano" x={530} y={350} s={190} c="#f2c9a0" r={90} />
      {Array.from({length: 18}, (_, i) => <line key={i} x1={50 + i * 26} y1={318 + (i % 3) * 8} x2={58 + i * 26} y2={306 + (i % 3) * 8} stroke="#c9946a" strokeWidth={3} />)}
      <g transform={`translate(${x} 300) rotate(90)`}>
        <g transform={`rotate(${Math.sin(f) * 6})`}>
          <Ico n="bicho" x={0} y={0} s={110} c="#7bd34e" />
        </g>
      </g>
      {f > t && (
        <g opacity={prog(f, t, 6)}>
          <circle cx={x} cy={200} r={44} fill={C.rojo} />
          <text x={x} y={222} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={64} fill="#fff">
            !
          </text>
        </g>
      )}
    </svg>
  );
};

// ======================= MONEDAS =======================
const MonedaBimetalica: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'separa', 9999);
  const sep = prog(f, t, 18);
  const giro = sep > 0 ? 1 : Math.abs(Math.cos(f / 25)) * 0.25 + 0.75;
  const anillo = 1 + sep * 0.6;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <radialGradient id="oroAnillo" cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#ffe9a6" />
          <stop offset="1" stopColor="#b8862b" />
        </radialGradient>
        <radialGradient id="plata" cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9aa6b4" />
        </radialGradient>
      </defs>
      <g transform={`translate(300 300) scale(${giro * anillo} ${anillo})`} opacity={1 - sep}>
        <circle r={180} fill="none" stroke="url(#oroAnillo)" strokeWidth={80} />
        <circle r={205} fill="none" stroke="#8a6420" strokeWidth={4} strokeDasharray="6 6" />
      </g>
      <g transform={`translate(300 ${300 - sep * 20}) scale(${giro} 1)`}>
        <circle r={135} fill="url(#plata)" />
        <circle r={120} fill="none" stroke="#7d8896" strokeWidth={4} />
        <text y={40} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={120} fill="#6b7685">
          {sep > 0.6 ? '' : '10'}
        </text>
        {sep > 0.6 && (
          <text y={30} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={86} fill="#5d6b7a" opacity={cl((sep - 0.6) * 3)}>
            .925
          </text>
        )}
      </g>
      {sep > 0.3 && <Brillos f={f} x={300} y={290} r={180} n={10} c="#ffffff" />}
      {p.etiqueta && sep > 0.8 && <Etq x={300} y={560} t={p.etiqueta} fondo="#dfe6ee" c="#1d2433" s={32} />}
    </svg>
  );
};

const Bascula: React.FC<Props> = ({f, p}) => {
  const cae = rebote(f, 4);
  const v = (p.valor ?? 5) * prog(f, 14, 24);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <g transform={`translate(300 ${270 - (1 - Math.min(1, cae)) * 200})`}>
        <ellipse rx={90} ry={30} fill="#dfe6ee" />
        <ellipse rx={90} ry={30} fill="none" stroke="#9aa6b4" strokeWidth={4} />
        <rect x={-90} y={0} width={180} height={18} fill="#9aa6b4" />
      </g>
      <ellipse cx={300} cy={310} rx={220} ry={40} fill="#c9d3e3" />
      <path d="M90,320 L510,320 L480,480 L120,480 Z" fill="#e3e8f2" />
      <rect x={200} y={370} width={200} height={80} rx={12} fill="#0f1a12" />
      <text x={300} y={430} textAnchor="middle" fontFamily="monospace" fontWeight={900} fontSize={56} fill={C.verde}>
        {v.toFixed(1)}
        {p.sufijo ?? ' g'}
      </text>
    </svg>
  );
};

const LupaMoneda: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'encuentra', 35);
  const enc = f > t;
  const a = enc ? 0.8 : f / 10;
  const lx = 300 + Math.cos(a) * 90;
  const ly = 300 + Math.sin(a) * 90;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <circle cx={300} cy={300} r={200} fill="#d9b44a" />
      <circle cx={300} cy={300} r={180} fill="none" stroke="#a07c20" strokeWidth={6} />
      <text x={300} y={340} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={120} fill="#a07c20">
        1995
      </text>
      {enc && <circle cx={lx} cy={ly} r={40 + 6 * Math.sin(f / 3)} fill="none" stroke={C.rojo} strokeWidth={8} />}
      <g transform={`translate(${lx + 70} ${ly + 70})`}>
        <circle cx={-70} cy={-70} r={80} fill="#fff" opacity={0.15} />
        <circle cx={-70} cy={-70} r={80} fill="none" stroke="#e3e8f2" strokeWidth={16} />
        <line x1={-12} y1={-12} x2={70} y2={70} stroke="#e3e8f2" strokeWidth={26} strokeLinecap="round" />
      </g>
      {enc && <Etq x={300} y={560} t="¡ERROR DE FÁBRICA!" fondo={C.rojo} c="#fff" s={30} />}
    </svg>
  );
};

// ======================= CINE =======================
const PalomitasMaquina: React.FC<Props> = ({f}) => {
  const n = Math.min(40, Math.floor(f / 1.5));
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <path d="M170,330 L430,330 L400,560 L200,560 Z" fill="#f4f6fb" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${170 + i * 52},330 L${196 + i * 52},330 L${190 + i * 42},560 L${178 + i * 42},560 Z`} fill={C.rojo} />)}
      <text x={300} y={470} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={44} fill="#fff" stroke={C.rojo} strokeWidth={2}>
        POP
      </text>
      {Array.from({length: n}, (_, i) => {
        const t = f - i * 1.5;
        const x0 = 220 + random(`px${i}`) * 160;
        const salto = Math.min(1, t / 14);
        const destY = 320 - Math.floor(i / 8) * 26 - random(`py${i}`) * 20;
        const y = 330 - Math.sin(salto * Math.PI) * 160 + (destY - 330) * salto;
        const x = x0 + (random(`dx${i}`) - 0.5) * 120 * salto;
        const s = 0.6 + 0.4 * Math.min(1, t / 4);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <circle cx={-8} cy={0} r={16} fill="#fff7dc" />
            <circle cx={8} cy={-4} r={15} fill="#fff7dc" />
            <circle cx={0} cy={-14} r={13} fill="#fffbea" />
            <circle cx={2} cy={2} r={5} fill="#f2c45a" />
          </g>
        );
      })}
    </svg>
  );
};

const BoletoReparte: React.FC<Props> = ({f, m, p}) => {
  const t = mk(m, 'corta', 15);
  const k = prog(f, t, 20);
  const pe = p.estudio ?? 70;
  const anchoE = 460 * (pe / 100);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <g opacity={k}>
        <Ico n="claqueta" x={130} y={130} s={160} c="#7c5cff" />
        <Etq x={130} y={235} t="ESTUDIO" fondo="#7c5cff" s={26} />
        <Ico n="palomitas" x={470} y={130} s={160} c={C.rojo} />
        <Etq x={470} y={235} t="CINE" fondo={C.rojo} s={26} />
      </g>
      <g transform={`translate(${-60 * k} ${-40 * k})`}>
        <rect x={70} y={330} width={anchoE} height={170} rx={16} fill="#7c5cff" />
        <text x={70 + anchoE / 2} y={440} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={72} fill="#fff" opacity={k}>
          {pe}%
        </text>
      </g>
      <g transform={`translate(${60 * k} ${-40 * k})`}>
        <rect x={70 + anchoE} y={330} width={460 - anchoE} height={170} rx={16} fill={C.rojo} />
        <text x={70 + anchoE + (460 - anchoE) / 2} y={440} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={52} fill="#fff" opacity={k}>
          {100 - pe}%
        </text>
      </g>
      {k < 0.2 && (
        <text x={300} y={440} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={70} fill="#fff">
          BOLETO
        </text>
      )}
      <line x1={70 + anchoE} y1={310} x2={70 + anchoE} y2={520} stroke="#fff" strokeWidth={5} strokeDasharray="12 10" opacity={1 - k} />
    </svg>
  );
};

const Dulceria: React.FC<Props> = ({f, p}) => {
  const n = Math.min(p.monedas ?? 9, Math.floor(f / 4));
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="palomitas" x={180} y={380} s={300} c={C.rojo} />
      {Array.from({length: n}, (_, i) => (
        <g key={i} transform={`translate(440 ${520 - i * 34})`}>
          <ellipse rx={80} ry={24} fill="#b8862b" />
          <ellipse cy={-8} rx={80} ry={24} fill={C.oro} />
          <text y={2} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={26} fill="#8a6420">
            $
          </text>
        </g>
      ))}
      <Brillos f={f} x={440} y={520 - n * 34} r={70} n={6} desde={10} />
    </svg>
  );
};

// ======================= CELULAR =======================
const Telefono: React.FC<{x: number; y: number; r?: number; s?: number}> = ({x, y, r = 0, s = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x={-70} y={-140} width={140} height={280} rx={24} fill="#1d2433" stroke="#9aa6b4" strokeWidth={6} />
    <rect x={-58} y={-120} width={116} height={230} rx={10} fill="#3a7bd5" />
    <rect x={-20} y={-132} width={40} height={6} rx={3} fill="#5d6b7a" />
    <rect x={-18} y={132} width={36} height={6} rx={3} fill="#0b0f18" />
  </g>
);

const CelularAgua: React.FC<Props> = ({f}) => {
  const t = 16;
  const k = cl(f / t);
  const y = -150 + 520 * k * k;
  const hund = f > t ? Math.min(60, (f - t) * 2) : 0;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <clipPath id="sobreAgua">
          <rect x={0} y={0} width={600} height={400} />
        </clipPath>
      </defs>
      <g clipPath="url(#sobreAgua)">
        <Telefono x={300} y={y + hund} r={k * 25} />
      </g>
      <path d={`M0,400 ${Array.from({length: 13}, (_, i) => `Q${i * 50 + 25},${400 + Math.sin(f / 4 + i) * 10} ${(i + 1) * 50},400`).join(' ')} L600,600 L0,600 Z`} fill="#3a8fd0" opacity={0.85} />
      <g opacity={0.5}>
        <Telefono x={300} y={y + hund} r={k * 25} />
      </g>
      {f > t &&
        Array.from({length: 12}, (_, i) => {
          const tt = f - t;
          const a = Math.PI + (i / 11) * Math.PI;
          const v = 9 + random(`sv${i}`) * 6;
          return <circle key={i} cx={300 + Math.cos(a) * v * tt} cy={400 + Math.sin(a) * v * tt + 0.7 * tt * tt} r={10} fill="#9fd0ff" opacity={cl(1 - tt / 25)} />;
        })}
    </svg>
  );
};

const CelularArroz: React.FC<Props> = ({f, m}) => {
  const baja = prog(f, 2, 18);
  const t = mk(m, 'particulas', 25);
  const zoom = prog(f, t, 10);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Telefono x={220} y={150 + baja * 170} r={-8} s={0.9} />
      <path d="M40,380 L400,380 Q390,560 220,570 Q50,560 40,380 Z" fill="#e7ecf3" />
      {Array.from({length: 60}, (_, i) => (
        <ellipse key={i} cx={60 + random(`gx${i}`) * 320} cy={375 - random(`gy${i}`) * 25} rx={5} ry={10} fill="#fffaf0" stroke="#d8d2c2" strokeWidth={1} transform={`rotate(${random(`gr${i}`) * 180} ${60 + random(`gx${i}`) * 320} ${375 - random(`gy${i}`) * 25})`} />
      ))}
      <g opacity={zoom} transform={`translate(460 230) scale(${0.5 + 0.5 * zoom})`}>
        <circle r={130} fill="#0b1430" stroke="#fff" strokeWidth={8} />
        <rect x={-70} y={-24} width={140} height={48} rx={24} fill="#1d2433" stroke="#9aa6b4" strokeWidth={6} />
        {Array.from({length: 16}, (_, i) => {
          const tt = ((f + i * 4) % 40) / 40;
          const a = (i / 16) * Math.PI * 2;
          return <circle key={i} cx={Math.cos(a) * 120 * (1 - tt)} cy={Math.sin(a) * 120 * (1 - tt)} r={6} fill={i % 2 ? '#fffaf0' : '#e8d9b0'} />;
        })}
        <text y={110} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={24} fill={C.rojo}>
          POLVO + ALMIDÓN
        </text>
      </g>
      <line x1={260} y1={420} x2={360} y2={310} stroke="#fff" strokeWidth={4} strokeDasharray="8 8" opacity={zoom} />
    </svg>
  );
};

const CelularGolpes: React.FC<Props> = ({f}) => {
  const tap = Math.abs(Math.sin(f / 4));
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="mano" x={300} y={470} s={300} c="#f2c9a0" r={180} />
      <Telefono x={300} y={180 + tap * 60} r={180} s={0.8} />
      {Array.from({length: 6}, (_, i) => {
        const t = ((f + i * 7) % 40) / 40;
        return <path key={i} d={`M${290 + (i % 3) * 10},${300 + t * 220} q-12,20 0,26 q12,-6 0,-26 z`} fill="#5ac8ff" opacity={1 - t} />;
      })}
    </svg>
  );
};

const CelularAire: React.FC<Props> = ({f}) => (
  <svg viewBox="0 0 600 600" width="100%" height="100%">
    <rect x={0} y={420} width={600} height={180} fill="#3a4258" />
    <g transform="translate(300 390) rotate(90) scale(0.8)">
      <rect x={-70} y={-140} width={140} height={280} rx={24} fill="#1d2433" stroke="#9aa6b4" strokeWidth={6} />
    </g>
    {Array.from({length: 5}, (_, i) => {
      const x = ((f * 5 + i * 130) % 750) - 100;
      return <path key={i} d={`M${x},${180 + i * 40} q40,-20 80,0 t80,0`} stroke="#9fd0ff" strokeWidth={6} fill="none" opacity={0.6} strokeLinecap="round" />;
    })}
    {Array.from({length: 5}, (_, i) => {
      const t = ((f + i * 10) % 50) / 50;
      return <circle key={`g${i}`} cx={230 + i * 35} cy={360 - t * 160} r={8 * (1 - t)} fill="#5ac8ff" opacity={1 - t} />;
    })}
    <Ico n="reloj" x={500} y={110} s={120} c={C.cian} />
    <text x={500} y={225} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={40} fill="#fff">
      24 h
    </text>
  </svg>
);

// ======================= RAYO =======================
const RayoAuto: React.FC<Props> = ({f, m}) => {
  const t = mk(m, 'impacto', 8);
  const golpe = f >= t && f < t + 6;
  const corriente = prog(f, t + 2, 22);
  const largo = 1400;
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="nube" x={300} y={70} s={300} c="#4a5470" />
      {golpe && <path d="M300,110 L270,190 L310,190 L260,290 L330,200 L290,200 L320,130 Z" fill="#fff8b0" transform="translate(0 0)" />}
      {golpe && <rect x={0} y={0} width={600} height={600} fill="#fff" opacity={0.25} />}
      <rect x={0} y={500} width={600} height={100} fill="#2a3346" />
      <g transform="translate(300 400)">
        <Ico n="auto" x={0} y={0} s={420} c="#c9d3e3" />
      </g>
      <g opacity={cl((f - t) / 6)}>
        <circle cx={320} cy={385} r={34} fill={C.verde} opacity={0.3 + 0.1 * Math.sin(f / 4)} />
        <Ico n="persona" x={320} y={385} s={60} c="#1d2433" />
      </g>
      <path
        d="M300,295 L230,300 L190,335 L120,340 L110,420 L135,470 L130,520 M300,295 L380,300 L420,335 L490,345 L500,420 L470,470 L475,520"
        fill="none"
        stroke="#ffe14d"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={largo}
        strokeDashoffset={largo * (1 - corriente)}
        style={{filter: 'drop-shadow(0 0 12px #ffe14d)'}}
      />
      {corriente > 0.95 &&
        [130, 475].map((x) => (
          <g key={x}>
            {Array.from({length: 6}, (_, i) => {
              const a = Math.PI + (i / 5) * Math.PI;
              const r = 20 + ((f * 3 + i * 7) % 30);
              return <line key={i} x1={x} y1={525} x2={x + Math.cos(a) * r} y2={525 + Math.sin(a) * r * 0.5} stroke="#ffe14d" strokeWidth={4} opacity={0.8} />;
            })}
          </g>
        ))}
    </svg>
  );
};

const EdificioRayo: React.FC<Props> = ({f}) => {
  const t = 10;
  const golpe = f >= t && f < t + 6;
  const baja = prog(f, t + 2, 16);
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%">
      <Ico n="nube" x={200} y={60} s={260} c="#4a5470" />
      {Array.from({length: 30}, (_, i) => {
        const x = (random(`lx${i}`) * 700 + f * 4) % 700 - 50;
        const y = (random(`ly${i}`) * 600 + f * 20) % 600;
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 26} stroke="#9fc3ff" strokeOpacity={0.4} strokeWidth={3} />;
      })}
      <rect x={220} y={160} width={180} height={400} fill="#3a4a7a" />
      {Array.from({length: 7}, (_, r) => [0, 1, 2].map((k) => <rect key={`${r}${k}`} x={238 + k * 55} y={190 + r * 52} width={34} height={28} fill="#ffe28a" opacity={0.7} />))}
      <line x1={310} y1={160} x2={310} y2={100} stroke="#c9d3e3" strokeWidth={6} />
      {golpe && <path d="M200,110 L260,90 L250,110 L312,100" stroke="#fff8b0" strokeWidth={10} fill="none" />}
      <line x1={404} y1={110} x2={404} y2={110 + 450 * baja} stroke="#ffe14d" strokeWidth={6} style={{filter: 'drop-shadow(0 0 8px #ffe14d)'}} />
      <rect x={0} y={560} width={600} height={40} fill="#2a3346" />
      <g opacity={prog(f, 26, 10)}>
        <Ico n="escudo" x={500} y={380} s={130} c={C.verde} />
      </g>
    </svg>
  );
};

export const ILUSTRACIONES: Record<string, React.FC<Props>> = {
  bolera: Bolera,
  trofeo_brillo: TrofeoBrillo,
  mano_firma: ManoFirma,
  cerebro_puente: CerebroPuente,
  calendario_hojas: CalendarioHojas,
  reloj_vueltas: RelojVueltas,
  lluvia_billetes: LluviaBilletes,
  ciudad_crece: CiudadCrece,
  balanza_inclina: BalanzaInclina,
  grafico: Grafico,
  tienda_cerrada: TiendaCerrada,
  casa_precio: CasaPrecio,
  piramide: Piramide,
  jaula_abre: JaulaAbre,
  mapa_pin: MapaPin,
  camion: Camion,
  elefante_camina: ElefanteCamina,
  ojo_grande: OjoGrande,
  luz_iris: LuzIris,
  adn_helice: AdnHelice,
  arbol_familia: ArbolFamilia,
  sol_mapa: SolMapa,
  pluma_mano: PlumaMano,
  senal_cerebro: SenalCerebro,
  volumen: Volumen,
  robot_cosquillas: RobotCosquillas,
  insecto_brazo: InsectoBrazo,
  moneda_bimetalica: MonedaBimetalica,
  bascula: Bascula,
  lupa_moneda: LupaMoneda,
  palomitas_maquina: PalomitasMaquina,
  boleto_reparte: BoletoReparte,
  dulceria: Dulceria,
  celular_agua: CelularAgua,
  celular_arroz: CelularArroz,
  celular_golpes: CelularGolpes,
  celular_aire: CelularAire,
  rayo_auto: RayoAuto,
  edificio_rayo: EdificioRayo,
};
