import React from 'react';
import {C} from '../serie/tema';

/** Atún rojo de perfil mirando a la derecha. Caja aprox. x -60..610, y -170..170 */
export const Atun: React.FC<{ancho?: number; rojo?: number; id?: string}> = ({ancho = 600, rojo = 0, id = 'a'}) => {
  const top: [number, number][] = [[210, -95], [175, -82], [142, -67], [112, -51], [85, -36]];
  return (
    <svg width={ancho} height={(ancho * 380) / 690} viewBox="-70 -190 690 380" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id={`cuerpo-${id}`} x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#0f2560" />
          <stop offset="0.42" stopColor="#2f63b0" />
          <stop offset="0.55" stopColor="#9fb8d8" />
          <stop offset="1" stopColor="#eef3fa" />
        </linearGradient>
      </defs>
      {/* aletas dorsales y anal */}
      <path d="M362,-104 Q318,-150 278,-107 Z" fill="#14306f" />
      <path d="M222,-97 Q196,-120 168,-168 Q178,-118 168,-86 Z" fill="#1c3d85" />
      <path d="M222,97 Q196,120 168,168 Q178,118 168,86 Z" fill="#c7d3e4" />
      {/* cola */}
      <path d="M48,-12 L-48,-150 Q-30,-60 -12,0 Q-30,60 -48,150 L48,12 Z" fill="#14306f" />
      {/* cuerpo */}
      <path
        d="M605,4 C588,-48 470,-110 300,-110 C190,-110 112,-64 44,-14 L44,14 C112,64 190,110 300,110 C470,110 588,48 605,4 Z"
        fill={`url(#cuerpo-${id})`}
      />
      {/* tinte rojo (golpe / calor) */}
      <path
        d="M605,4 C588,-48 470,-110 300,-110 C190,-110 112,-64 44,-14 L44,14 C112,64 190,110 300,110 C470,110 588,48 605,4 Z"
        fill={C.rojo}
        opacity={rojo * 0.6}
      />
      {/* línea lateral y brillo */}
      <path d="M560,-8 C460,-30 300,-34 70,-4" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={6} fill="none" />
      {/* pínulas amarillas */}
      {top.map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x},${y} L${x - 24},${y - 17} L${x - 15},${y + 3} Z`} fill="#ffcf3d" />
          <path d={`M${x},${-y} L${x - 24},${-y + 17} L${x - 15},${-y - 3} Z`} fill="#ffcf3d" />
        </g>
      ))}
      {/* aleta pectoral */}
      <path d="M440,18 Q370,30 300,62 Q380,48 446,30 Z" fill="#183a80" />
      {/* opérculo, boca y ojo */}
      <path d="M488,-62 Q458,0 488,62" stroke="#0b1d4d" strokeOpacity={0.5} strokeWidth={5} fill="none" />
      <path d="M604,6 L566,14" stroke="#0b1d4d" strokeWidth={4} strokeLinecap="round" />
      <circle cx={540} cy={-20} r={15} fill="#eef3fa" />
      <circle cx={543} cy={-20} r={9} fill="#0a0f1f" />
      <circle cx={546} cy={-24} r={3} fill="#fff" />
    </svg>
  );
};

/** Barco pesquero. Origen en la línea de flotación, centro. */
export const Barco: React.FC<{escala?: number}> = ({escala = 1}) => (
  <svg width={560 * escala} height={360 * escala} viewBox="-260 -300 560 360" style={{overflow: 'visible'}}>
    <line x1={60} y1={-50} x2={60} y2={-280} stroke="#c9d3e3" strokeWidth={8} />
    <line x1={60} y1={-260} x2={-150} y2={-60} stroke="#c9d3e3" strokeWidth={3} />
    <rect x={-150} y={-160} width={170} height={115} rx={10} fill="#d8e0ee" />
    <rect x={-130} y={-140} width={40} height={34} rx={5} fill="#3b6fb6" />
    <rect x={-75} y={-140} width={40} height={34} rx={5} fill="#3b6fb6" />
    <rect x={-20} y={-140} width={25} height={34} rx={5} fill="#3b6fb6" />
    <path d="M-250,-50 L270,-50 L215,40 L-215,40 Z" fill="#eef3fa" />
    <path d="M-238,-30 L258,-30 L248,-14 L-228,-14 Z" fill={C.rojo} />
    {/* caña */}
    <path d="M180,-50 Q240,-170 290,-250" stroke="#2a2a2a" strokeWidth={6} fill="none" strokeLinecap="round" />
  </svg>
);

/** Capa de olas animada (dibuja desde y hacia abajo). */
export const Olas: React.FC<{y: number; f: number; amp?: number; color: string; vel?: number; fase?: number; alto?: number}> = ({
  y,
  f,
  amp = 18,
  color,
  vel = 1,
  fase = 0,
  alto = 1920,
}) => {
  const pts: string[] = [];
  for (let x = -20; x <= 1100; x += 20) {
    const yy = y + Math.sin(x / 90 + (f * vel) / 12 + fase) * amp + Math.sin(x / 37 + (f * vel) / 7) * amp * 0.3;
    pts.push(`${x},${yy.toFixed(1)}`);
  }
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={`M-20,${alto} L${pts.join(' L')} L1100,${alto} Z`} fill={color} />
    </svg>
  );
};

export const Trebol: React.FC<{s?: number}> = ({s = 120}) => (
  <svg width={s} height={s} viewBox="-60 -60 120 120">
    {[0, 90, 180, 270].map((r) => (
      <g key={r} transform={`rotate(${r + 45})`}>
        <path d="M0,0 C-30,-20 -30,-52 -10,-52 C0,-52 0,-42 0,-38 C0,-42 0,-52 10,-52 C30,-52 30,-20 0,0 Z" fill={C.verde} />
      </g>
    ))}
    <path d="M0,0 Q12,30 4,56" stroke={C.verde} strokeWidth={7} fill="none" strokeLinecap="round" />
  </svg>
);

export const Trofeo: React.FC<{s?: number}> = ({s = 120}) => (
  <svg width={s} height={s} viewBox="-60 -60 120 120">
    <path d="M-34,-48 L34,-48 L30,-8 Q24,18 0,22 Q-24,18 -30,-8 Z" fill={C.oro} />
    <path d="M-34,-40 Q-58,-40 -54,-16 Q-50,2 -28,4" stroke={C.oro} strokeWidth={8} fill="none" />
    <path d="M34,-40 Q58,-40 54,-16 Q50,2 28,4" stroke={C.oro} strokeWidth={8} fill="none" />
    <rect x={-7} y={20} width={14} height={18} fill={C.oro} />
    <rect x={-28} y={38} width={56} height={14} rx={4} fill={C.oro} />
  </svg>
);

export const Megafono: React.FC<{s?: number}> = ({s = 120}) => (
  <svg width={s} height={s} viewBox="-60 -60 120 120">
    <path d="M-40,-14 L10,-40 L10,40 L-40,14 Z" fill={C.cian} />
    <rect x={-52} y={-14} width={14} height={28} rx={4} fill={C.cian} />
    <path d="M-34,14 L-26,44 L-12,44 L-18,18" fill={C.cian} />
    {[22, 36, 50].map((r, i) => (
      <path key={i} d={`M${r - 6},${-r * 0.5} Q${r + 4},0 ${r - 6},${r * 0.5}`} stroke={C.cian} strokeWidth={6} fill="none" strokeLinecap="round" opacity={1 - i * 0.25} />
    ))}
  </svg>
);

export const Mazo: React.FC<{s?: number}> = ({s = 220}) => (
  <svg width={s} height={s} viewBox="-110 -110 220 220" style={{overflow: 'visible'}}>
    <rect x={-8} y={-20} width={16} height={130} rx={6} fill="#8b5a2b" />
    <rect x={-62} y={-62} width={124} height={50} rx={14} fill="#a8703a" />
    <rect x={-70} y={-58} width={14} height={42} rx={4} fill={C.oro} />
    <rect x={56} y={-58} width={14} height={42} rx={4} fill={C.oro} />
  </svg>
);

export const Bandera: React.FC = () => (
  <svg width={60} height={40} viewBox="0 0 60 40" style={{borderRadius: 6}}>
    <rect width={60} height={40} fill="#fff" />
    <circle cx={30} cy={20} r={11} fill="#bc002d" />
  </svg>
);

/** Bloque de lomo de atún (sashimi). */
export const Lomo: React.FC<{s?: number}> = ({s = 360}) => (
  <svg width={s} height={s * 0.6} viewBox="-150 -90 300 180">
    <path d="M-130,-30 L90,-60 L140,-20 L140,40 L-80,70 L-130,30 Z" fill="#c2213a" />
    <path d="M-130,-30 L90,-60 L140,-20 L-80,10 Z" fill="#e8475f" />
    {[-90, -40, 10, 60].map((x, i) => (
      <path key={i} d={`M${x},${-40 + i * -5} Q${x + 30},${-20} ${x + 10},${0 - i * 3}`} stroke="#ffd1d8" strokeWidth={5} fill="none" opacity={0.7} />
    ))}
    <path d="M-80,10 L140,-20 L140,40 L-80,70 Z" fill="#a51a30" />
  </svg>
);
