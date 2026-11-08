import React from 'react';
import {C} from './tema';

// Íconos planos en un lienzo de 100x100 centrado en (0,0). c = color principal, c2 = secundario.
type P = {c: string; c2: string};
const B = '#0b1430';

const I: Record<string, React.FC<P>> = {
  // ---- deporte / bowling ----
  bolo: ({c}) => (
    <g>
      <path d="M-8,-46 Q8,-46 8,-30 Q8,-18 4,-12 Q20,8 18,28 Q16,46 0,46 Q-16,46 -18,28 Q-20,8 -4,-12 Q-8,-18 -8,-30 Q-8,-46 0,-46 Z" fill="#f4f6fb" />
      <rect x={-7} y={-22} width={14} height={4} fill={c} />
      <rect x={-7} y={-15} width={14} height={4} fill={c} />
    </g>
  ),
  bola: ({c}) => (
    <g>
      <circle r={44} fill={c} />
      <circle cx={-12} cy={-14} r={6} fill={B} />
      <circle cx={6} cy={-20} r={6} fill={B} />
      <circle cx={-2} cy={0} r={7} fill={B} />
      <ellipse cx={-20} cy={-26} rx={10} ry={5} fill="#fff" opacity={0.25} transform="rotate(-35 -20 -26)" />
    </g>
  ),
  trofeo: ({c}) => (
    <g>
      <path d="M-30,-42 L30,-42 L26,-6 Q20,16 0,20 Q-20,16 -26,-6 Z" fill={c} />
      <path d="M-30,-34 Q-50,-34 -46,-12 Q-42,2 -24,4" stroke={c} strokeWidth={7} fill="none" />
      <path d="M30,-34 Q50,-34 46,-12 Q42,2 24,4" stroke={c} strokeWidth={7} fill="none" />
      <rect x={-6} y={18} width={12} height={16} fill={c} />
      <rect x={-24} y={34} width={48} height={12} rx={4} fill={c} />
    </g>
  ),
  // ---- cuerpo ----
  mano: ({c}) => (
    <path
      d="M-26,46 L-30,4 Q-34,-6 -40,-14 Q-44,-22 -36,-24 Q-28,-26 -20,-12 L-20,-36 Q-20,-44 -13,-44 Q-6,-44 -6,-36 L-6,-42 Q-6,-48 1,-48 Q8,-48 8,-41 L8,-36 Q8,-42 15,-42 Q22,-42 22,-34 L22,-26 Q22,-32 29,-32 Q36,-32 36,-24 L36,8 Q36,30 22,46 Z"
      fill={c}
    />
  ),
  cerebro: ({c, c2}) => (
    <g>
      <path d="M-4,-40 Q-30,-46 -38,-24 Q-50,-14 -42,4 Q-46,24 -26,30 Q-16,44 -4,36 Z" fill={c} />
      <path d="M4,-40 Q30,-46 38,-24 Q50,-14 42,4 Q46,24 26,30 Q16,44 4,36 Z" fill={c} />
      <path d="M-30,-20 Q-18,-16 -22,-4 M-34,12 Q-20,8 -16,20 M30,-20 Q18,-16 22,-4 M34,12 Q20,8 16,20" stroke={c2} strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={22} cy={34} rx={14} ry={8} fill={c2} />
    </g>
  ),
  ojo: ({c, c2}) => (
    <g>
      <path d="M-46,0 Q0,-40 46,0 Q0,40 -46,0 Z" fill="#f4f6fb" />
      <circle r={20} fill={c} />
      <circle r={9} fill={B} />
      <circle cx={-6} cy={-7} r={4} fill="#fff" />
      <circle r={20} fill="none" stroke={c2} strokeWidth={3} opacity={0.6} />
    </g>
  ),
  persona: ({c}) => (
    <g>
      <circle cy={-26} r={16} fill={c} />
      <path d="M-30,44 Q-30,0 0,0 Q30,0 30,44 Z" fill={c} />
    </g>
  ),
  grupo: ({c, c2}) => (
    <g>
      <circle cx={-24} cy={-16} r={11} fill={c2} />
      <path d="M-44,30 Q-44,0 -24,0 Q-4,0 -4,30 Z" fill={c2} />
      <circle cx={24} cy={-16} r={11} fill={c2} />
      <path d="M4,30 Q4,0 24,0 Q44,0 44,30 Z" fill={c2} />
      <circle cy={-22} r={14} fill={c} />
      <path d="M-24,40 Q-24,0 0,0 Q24,0 24,40 Z" fill={c} />
    </g>
  ),
  adn: ({c, c2}) => (
    <g>
      <path d="M-20,-46 Q20,-23 -20,0 Q-60,23 -20,46" stroke={c} strokeWidth={7} fill="none" transform="translate(20 0)" />
      <path d="M20,-46 Q-20,-23 20,0 Q60,23 20,46" stroke={c2} strokeWidth={7} fill="none" transform="translate(-20 0)" />
      {[-34, -18, 18, 34].map((y) => (
        <line key={y} x1={-14} y1={y} x2={14} y2={y} stroke="#fff" strokeOpacity={0.6} strokeWidth={4} />
      ))}
    </g>
  ),
  pluma: ({c}) => (
    <g>
      <path d="M30,-44 L44,-30 L-20,34 L-36,38 L-32,22 Z" fill={c} />
      <path d="M-32,22 L-20,34" stroke={B} strokeWidth={4} />
      <path d="M-46,46 Q-20,30 0,44 Q20,56 46,40" stroke={c} strokeWidth={4} fill="none" opacity={0.6} />
    </g>
  ),
  mouse: ({c}) => (
    <g>
      <rect x={-26} y={-40} width={52} height={84} rx={26} fill={c} />
      <line x1={0} y1={-40} x2={0} y2={-6} stroke={B} strokeWidth={4} />
      <line x1={-26} y1={-6} x2={26} y2={-6} stroke={B} strokeWidth={4} />
    </g>
  ),
  calendario: ({c}) => (
    <g>
      <rect x={-40} y={-34} width={80} height={76} rx={10} fill="#f4f6fb" />
      <rect x={-40} y={-34} width={80} height={22} rx={10} fill={c} />
      <rect x={-26} y={-44} width={8} height={18} rx={3} fill="#c9d3e3" />
      <rect x={18} y={-44} width={8} height={18} rx={3} fill="#c9d3e3" />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((k) => <rect key={`${r}${k}`} x={-30 + k * 16} y={-4 + r * 14} width={10} height={9} rx={2} fill="#9fb0c8" />))}
    </g>
  ),
  reloj: ({c}) => (
    <g>
      <circle r={44} fill="#f4f6fb" />
      <circle r={38} fill="none" stroke={c} strokeWidth={6} />
      <line x1={0} y1={0} x2={0} y2={-26} stroke={B} strokeWidth={6} strokeLinecap="round" />
      <line x1={0} y1={0} x2={18} y2={8} stroke={c} strokeWidth={5} strokeLinecap="round" />
      <circle r={5} fill={B} />
    </g>
  ),
  // ---- dinero ----
  billete: ({c}) => (
    <g>
      <rect x={-46} y={-26} width={92} height={52} rx={6} fill={c} />
      <rect x={-40} y={-20} width={80} height={40} rx={4} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} />
      <circle r={13} fill="#fff" opacity={0.35} />
      <text y={8} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fff" fontFamily="Inter">$</text>
    </g>
  ),
  bolsa: ({c}) => (
    <g>
      <path d="M-14,-30 L-22,-44 L22,-44 L14,-30 Q44,-10 40,22 Q36,46 0,46 Q-36,46 -40,22 Q-44,-10 -14,-30 Z" fill={c} />
      <text y={22} textAnchor="middle" fontSize={44} fontWeight={900} fill={B} fontFamily="Inter">$</text>
    </g>
  ),
  moneda: ({c}) => (
    <g>
      <circle r={44} fill={c} />
      <circle r={34} fill="none" stroke="#000" strokeOpacity={0.2} strokeWidth={5} />
      <text y={16} textAnchor="middle" fontSize={44} fontWeight={900} fill="#000" fillOpacity={0.35} fontFamily="Inter">$</text>
    </g>
  ),
  bimetalica: ({c}) => (
    <g>
      <circle r={44} fill="#d9b44a" />
      <circle r={28} fill="#dfe6ee" />
      <circle r={28} fill="none" stroke="#9aa6b4" strokeWidth={3} />
      <text y={12} textAnchor="middle" fontSize={30} fontWeight={900} fill="#5d6b7a" fontFamily="Inter">10</text>
      <circle r={44} fill="none" stroke={c} strokeWidth={0} />
    </g>
  ),
  centro_plata: () => (
    <g>
      <circle r={30} fill="#e6edf5" />
      <circle r={30} fill="none" stroke="#9aa6b4" strokeWidth={4} />
      <text y={10} textAnchor="middle" fontSize={22} fontWeight={900} fill="#5d6b7a" fontFamily="Inter">.925</text>
    </g>
  ),
  lupa: ({c}) => (
    <g>
      <circle cx={-8} cy={-8} r={28} fill="none" stroke={c} strokeWidth={9} />
      <circle cx={-8} cy={-8} r={22} fill="#fff" opacity={0.12} />
      <line x1={14} y1={14} x2={40} y2={40} stroke={c} strokeWidth={12} strokeLinecap="round" />
    </g>
  ),
  casa: ({c}) => (
    <g>
      <path d="M-40,-2 L0,-40 L40,-2 Z" fill={c} />
      <rect x={-30} y={-6} width={60} height={46} fill="#f4f6fb" />
      <rect x={-8} y={14} width={16} height={26} fill={c} />
    </g>
  ),
  fabrica: ({c}) => (
    <g>
      <path d="M-44,40 L-44,-4 L-20,-18 L-20,-4 L4,-18 L4,-4 L28,-18 L28,-40 L42,-40 L42,40 Z" fill={c} />
      {[-34, -12, 10].map((x) => <rect key={x} x={x} y={10} width={12} height={12} fill="#f4f6fb" opacity={0.7} />)}
    </g>
  ),
  avion: ({c}) => (
    <path d="M44,-4 L8,-6 L-12,-40 L-22,-40 L-8,-6 L-30,-4 L-40,-16 L-46,-16 L-40,4 L-46,24 L-40,24 L-30,12 L-8,14 L-22,48 L-12,48 L8,14 L44,12 Q50,4 44,-4 Z" fill={c} transform="scale(0.9)" />
  ),
  candado: ({c}) => (
    <g>
      <path d="M-22,-6 L-22,-22 Q-22,-44 0,-44 Q22,-44 22,-22 L22,-6" stroke={c} strokeWidth={9} fill="none" />
      <rect x={-34} y={-8} width={68} height={52} rx={8} fill={c} />
      <circle cy={12} r={7} fill={B} />
      <rect x={-3} y={14} width={6} height={14} fill={B} />
    </g>
  ),
  balanza: ({c, c2}) => (
    <g>
      <rect x={-3} y={-40} width={6} height={80} fill="#c9d3e3" />
      <rect x={-24} y={36} width={48} height={8} rx={3} fill="#c9d3e3" />
      <line x1={-40} y1={-28} x2={40} y2={-28} stroke="#c9d3e3" strokeWidth={6} strokeLinecap="round" />
      <path d="M-46,4 L-34,-26 L-22,4 Z" fill="none" stroke="#c9d3e3" strokeWidth={2} />
      <path d="M22,4 L34,-26 L46,4 Z" fill="none" stroke="#c9d3e3" strokeWidth={2} />
      <path d="M-50,4 Q-34,20 -18,4 Z" fill={c} />
      <path d="M18,4 Q34,20 50,4 Z" fill={c2} />
    </g>
  ),
  grafico_baja: ({c}) => (
    <g>
      <path d="M-44,-30 L-14,-6 L6,-18 L40,26" stroke={c} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44,8 L44,32 L22,32 Z" fill={c} />
    </g>
  ),
  grafico_sube: ({c}) => (
    <g>
      <path d="M-44,30 L-14,6 L6,18 L40,-26" stroke={c} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44,-8 L44,-32 L22,-32 Z" fill={c} />
    </g>
  ),
  pistola_no: ({c}) => (
    <g>
      <circle r={42} fill="none" stroke={c} strokeWidth={7} />
      <line x1={-30} y1={30} x2={30} y2={-30} stroke={c} strokeWidth={7} />
    </g>
  ),
  // ---- animales / naturaleza ----
  elefante: ({c}) => (
    <g>
      <path d="M-40,20 Q-44,-24 -6,-28 Q26,-30 34,-8 Q46,-6 46,10 L46,40 L38,40 L38,14 Q34,12 32,18 L30,40 L18,40 L18,20 L-8,20 L-8,40 L-20,40 L-20,22 L-28,40 L-40,40 Z" fill={c} />
      <path d="M-4,-20 Q-26,-22 -24,2 Q-22,14 -6,10 Z" fill="#000" opacity={0.15} />
      <circle cx={22} cy={-12} r={3} fill={B} />
    </g>
  ),
  jaula: ({c}) => (
    <g>
      <rect x={-40} y={-40} width={80} height={10} rx={4} fill={c} />
      <rect x={-40} y={34} width={80} height={10} rx={4} fill={c} />
      {[-32, -16, 0, 16, 32].map((x) => <rect key={x} x={x - 3} y={-32} width={6} height={68} fill={c} />)}
    </g>
  ),
  hoja: ({c}) => (
    <g>
      <path d="M-34,34 Q-40,-30 36,-40 Q40,30 -34,34 Z" fill={c} />
      <path d="M-34,34 Q0,0 26,-28" stroke="#fff" strokeOpacity={0.5} strokeWidth={4} fill="none" />
    </g>
  ),
  corazon: ({c}) => <path d="M0,40 Q-46,8 -40,-18 Q-34,-42 -10,-36 Q0,-32 0,-20 Q0,-32 10,-36 Q34,-42 40,-18 Q46,8 0,40 Z" fill={c} />,
  mapa: ({c, c2}) => (
    <g>
      <path d="M-44,-30 L-16,-40 L16,-30 L44,-40 L44,32 L16,42 L-16,32 L-44,42 Z" fill={c2} />
      <path d="M-16,-40 L-16,32 M16,-30 L16,42" stroke="#000" strokeOpacity={0.2} strokeWidth={3} />
      <path d="M8,-4 Q8,-24 22,-24 Q36,-24 36,-4 Q36,8 22,24 Q8,8 8,-4 Z" fill={c} />
      <circle cx={22} cy={-6} r={5} fill="#fff" />
    </g>
  ),
  sol: ({c}) => (
    <g>
      {Array.from({length: 8}, (_, i) => (
        <line key={i} x1={0} y1={-30} x2={0} y2={-46} stroke={c} strokeWidth={7} strokeLinecap="round" transform={`rotate(${i * 45})`} />
      ))}
      <circle r={22} fill={c} />
    </g>
  ),
  nube: ({c}) => <path d="M-36,22 Q-48,22 -46,8 Q-44,-4 -30,-4 Q-28,-26 -6,-26 Q12,-26 18,-12 Q40,-14 42,6 Q44,22 28,22 Z" fill={c} />,
  bicho: ({c}) => (
    <g>
      <ellipse cx={0} cy={6} rx={16} ry={24} fill={c} />
      <circle cy={-24} r={10} fill={c} />
      {[-10, 4, 18].map((y) => (
        <g key={y}>
          <line x1={-14} y1={y} x2={-34} y2={y - 8} stroke={c} strokeWidth={4} />
          <line x1={14} y1={y} x2={34} y2={y - 8} stroke={c} strokeWidth={4} />
        </g>
      ))}
      <path d="M-4,-32 Q-10,-46 -18,-44 M4,-32 Q10,-46 18,-44" stroke={c} strokeWidth={3} fill="none" />
    </g>
  ),
  // ---- objetos ----
  palomitas: ({c}) => (
    <g>
      {[-26, -12, 2, 16, 28, -18, 8, 22, -4].map((x, i) => (
        <circle key={i} cx={x} cy={i < 5 ? -26 : -38} r={13} fill="#fff7dc" />
      ))}
      <path d="M-36,-20 L36,-20 L26,46 L-26,46 Z" fill="#f4f6fb" />
      {[-24, -8, 8, 24].map((x, i) => (
        <path key={x} d={`M${x - 6},-20 L${x + 6},-20 L${x + 4},46 L${x - 4},46 Z`} fill={i % 2 ? c : '#f4f6fb'} />
      ))}
    </g>
  ),
  boleto: ({c}) => (
    <g>
      <path d="M-46,-24 L46,-24 L46,-8 Q36,-8 36,0 Q36,8 46,8 L46,24 L-46,24 L-46,8 Q-36,8 -36,0 Q-36,-8 -46,-8 Z" fill={c} />
      <line x1={18} y1={-20} x2={18} y2={20} stroke="#fff" strokeOpacity={0.6} strokeWidth={3} strokeDasharray="5 5" />
      <text x={-12} y={8} textAnchor="middle" fontSize={20} fontWeight={900} fill="#fff" fontFamily="Inter">TICKET</text>
    </g>
  ),
  claqueta: ({c}) => (
    <g>
      <rect x={-40} y={-10} width={80} height={52} rx={6} fill="#1d2433" />
      <path d="M-40,-14 L36,-34 L40,-20 L-36,0 Z" fill={c} />
      {[-26, -6, 14].map((x) => <path key={x} d={`M${x},-17 L${x + 10},-20 L${x + 18},-6 L${x + 8},-3 Z`} fill="#fff" />)}
    </g>
  ),
  celular: ({c}) => (
    <g>
      <rect x={-26} y={-46} width={52} height={92} rx={10} fill="#1d2433" stroke={c} strokeWidth={4} />
      <rect x={-20} y={-36} width={40} height={68} rx={4} fill={c} opacity={0.35} />
      <rect x={-8} y={36} width={16} height={4} rx={2} fill={c} />
    </g>
  ),
  gota: ({c}) => <path d="M0,-44 Q30,-6 30,14 Q30,44 0,44 Q-30,44 -30,14 Q-30,-6 0,-44 Z" fill={c} />,
  arroz: ({c}) => (
    <g>
      {Array.from({length: 14}, (_, i) => (
        <ellipse key={i} cx={-30 + (i % 7) * 10} cy={-10 - Math.floor(i / 7) * 9} rx={4} ry={7} fill="#fffaf0" transform={`rotate(${(i * 37) % 90 - 45} ${-30 + (i % 7) * 10} ${-10 - Math.floor(i / 7) * 9})`} />
      ))}
      <path d="M-46,-6 L46,-6 Q44,40 0,42 Q-44,40 -46,-6 Z" fill={c} />
    </g>
  ),
  secador: ({c}) => (
    <g>
      <path d="M-40,-30 L20,-30 Q40,-30 40,-10 Q40,10 20,10 L-40,10 Z" fill={c} />
      <rect x={-6} y={8} width={18} height={38} rx={6} fill={c} />
      <path d="M-46,-24 Q-52,-10 -46,4" stroke="#fff" strokeOpacity={0.6} strokeWidth={4} fill="none" />
    </g>
  ),
  silica: ({c}) => (
    <g>
      <rect x={-34} y={-40} width={68} height={80} rx={8} fill="#f4f6fb" />
      <path d="M-34,-28 L34,-28 M-34,28 L34,28" stroke="#c9d3e3" strokeWidth={3} strokeDasharray="4 4" />
      <text y={-2} textAnchor="middle" fontSize={15} fontWeight={900} fill={c} fontFamily="Inter">SILICA</text>
      <text y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill="#8090a8" fontFamily="Inter">GEL</text>
    </g>
  ),
  rayo: ({c}) => <path d="M10,-48 L-26,6 L-2,6 L-12,48 L26,-8 L2,-8 Z" fill={c} />,
  auto: ({c}) => (
    <g>
      <path d="M-46,14 L-46,-4 Q-44,-12 -34,-14 L-22,-32 Q-18,-36 -10,-36 L18,-36 Q26,-36 30,-30 L40,-14 Q48,-12 48,-2 L48,14 Z" fill={c} />
      <path d="M-18,-28 L-8,-28 L-8,-14 L-28,-14 Z M0,-28 L18,-28 L28,-14 L0,-14 Z" fill="#bfe3ff" opacity={0.8} />
      <circle cx={-26} cy={16} r={12} fill="#1d2433" />
      <circle cx={28} cy={16} r={12} fill="#1d2433" />
      <circle cx={-26} cy={16} r={5} fill="#9aa6b4" />
      <circle cx={28} cy={16} r={5} fill="#9aa6b4" />
    </g>
  ),
  llanta: () => (
    <g>
      <circle r={44} fill="#1d2433" />
      <circle r={24} fill="#9aa6b4" />
      <circle r={8} fill="#5d6b7a" />
      {Array.from({length: 10}, (_, i) => <rect key={i} x={-4} y={-44} width={8} height={10} fill="#2c3547" transform={`rotate(${i * 36})`} />)}
    </g>
  ),
  escudo: ({c}) => (
    <g>
      <path d="M0,-46 L38,-32 Q38,20 0,46 Q-38,20 -38,-32 Z" fill={c} />
      <path d="M-16,0 L-4,12 L18,-14" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  edificio: ({c}) => (
    <g>
      <rect x={-30} y={-44} width={60} height={88} fill={c} />
      {[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((k) => <rect key={`${r}${k}`} x={-22 + k * 17} y={-36 + r * 15} width={10} height={9} fill="#ffe28a" opacity={0.8} />))}
    </g>
  ),
  robot: ({c}) => (
    <g>
      <rect x={-40} y={30} width={40} height={14} rx={4} fill={c} />
      <path d="M-20,30 L-20,0 L14,-24" stroke={c} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={-20} cy={0} r={9} fill="#fff" />
      <circle cx={14} cy={-24} r={9} fill="#fff" />
      <path d="M20,-30 L40,-40 M22,-20 L44,-22" stroke={c} strokeWidth={6} strokeLinecap="round" />
    </g>
  ),
  pluma_cosquilla: ({c}) => (
    <g transform="rotate(-30)">
      <path d="M0,-46 Q24,-20 10,30 L0,46 L-10,30 Q-24,-20 0,-46 Z" fill={c} />
      <line x1={0} y1={-40} x2={0} y2={46} stroke="#fff" strokeOpacity={0.7} strokeWidth={3} />
    </g>
  ),
  banco: ({c}) => (
    <g>
      <path d="M-46,-18 L0,-44 L46,-18 Z" fill={c} />
      {[-32, -12, 8, 28].map((x) => <rect key={x} x={x} y={-12} width={8} height={40} fill={c} />)}
      <rect x={-46} y={30} width={92} height={10} fill={c} />
    </g>
  ),
  // ---- símbolos ----
  check: ({c}) => (
    <g>
      <circle r={44} fill={c} />
      <path d="M-20,0 L-6,16 L22,-16" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  equis: ({c}) => (
    <g>
      <circle r={44} fill={c} />
      <path d="M-16,-16 L16,16 M16,-16 L-16,16" stroke="#fff" strokeWidth={10} strokeLinecap="round" />
    </g>
  ),
  alerta: ({c}) => (
    <g>
      <path d="M0,-44 L46,40 L-46,40 Z" fill={c} strokeLinejoin="round" />
      <rect x={-5} y={-14} width={10} height={32} rx={4} fill={B} />
      <circle cy={28} r={6} fill={B} />
    </g>
  ),
  pregunta: ({c}) => (
    <g>
      <circle r={44} fill={c} />
      <text y={20} textAnchor="middle" fontSize={60} fontWeight={900} fill={B} fontFamily="Inter">?</text>
    </g>
  ),
  estrella: ({c}) => <path d="M0,-46 L12,-14 L46,-14 L18,6 L28,40 L0,20 L-28,40 L-18,6 L-46,-14 L-12,-14 Z" fill={c} />,
  flecha: ({c}) => <path d="M-40,-12 L10,-12 L10,-32 L44,0 L10,32 L10,12 L-40,12 Z" fill={c} />,
  comentario: ({c}) => <path d="M-40,-36 L40,-36 Q46,-36 46,-30 L46,16 Q46,22 40,22 L-8,22 L-28,42 L-26,22 L-40,22 Q-46,22 -46,16 L-46,-30 Q-46,-36 -40,-36 Z" fill={c} />,
  fuego: ({c}) => <path d="M0,46 Q-34,46 -34,14 Q-34,-10 -10,-30 Q-12,-10 0,-6 Q-4,-30 14,-46 Q12,-22 26,-6 Q36,6 34,20 Q30,46 0,46 Z" fill={c} />,
  cinta: ({c}) => (
    <g>
      <rect x={-46} y={-14} width={92} height={28} rx={3} fill={c} opacity={0.85} transform="rotate(-12)" />
    </g>
  ),
};

export const ICONOS = Object.keys(I);

export const Icono: React.FC<{nombre: string; size?: number; color?: string; color2?: string}> = ({nombre, size = 160, color = C.oro, color2 = C.cian}) => {
  const Comp = I[nombre] ?? I.pregunta;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{overflow: 'visible'}}>
      <Comp c={color} c2={color2} />
    </svg>
  );
};

/** Ícono como grupo SVG (para usar dentro de otro SVG), centrado en (0,0), tamaño s. */
export const IconoG: React.FC<{nombre: string; s: number; color?: string; color2?: string}> = ({nombre, s, color = C.oro, color2 = C.cian}) => {
  const Comp = I[nombre] ?? I.pregunta;
  return (
    <g transform={`scale(${s / 100})`}>
      <Comp c={color} c2={color2} />
    </g>
  );
};
