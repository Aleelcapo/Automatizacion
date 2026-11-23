import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {G, P, caja, canvasTex, cil, cl, esf, lerp, rnd, texNube} from './kit';
import {FUENTE} from '../serie/tema';

// Piezas compartidas de la serie "Felicidades, tienes un…"
export const MADERA = '#b87a45';


let _pasto: THREE.CanvasTexture | null = null;

export const texPasto = () => {
  if (_pasto) return _pasto;
  _pasto = canvasTex(
    512,
    512,
    (g) => {
      g.fillStyle = '#8fd24e';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 900; i++) {
        g.strokeStyle = rnd(i) > 0.5 ? 'rgba(70,140,40,0.35)' : 'rgba(200,240,140,0.35)';
        g.lineWidth = 2;
        const x = rnd(i + 1) * 512;
        const y = rnd(i + 2) * 512;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd(i + 3) - 0.5) * 6, y - 8 - rnd(i + 4) * 10);
        g.stroke();
      }
    },
    [10, 8],
  );
  return _pasto;
};

let _pared: THREE.CanvasTexture | null = null;

export const texPared = () => {
  if (_pared) return _pared;
  _pared = canvasTex(
    512,
    512,
    (g) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(120,100,80,${0.04 + rnd(i) * 0.05})`;
        g.beginPath();
        g.ellipse(rnd(i + 1) * 512, rnd(i + 2) * 512, 10 + rnd(i + 3) * 40, 6 + rnd(i + 4) * 20, 0, 0, Math.PI * 2);
        g.fill();
      }
    },
    [6, 2],
  );
  return _pared;
};

export const Tio: React.FC<{t: number; anda: number; brazos: number; saluda: number}> = ({t, anda, brazos, saluda}) => {
  const paso = Math.sin(t * 9) * 0.55 * anda;
  const PIEL = '#f2b48c';
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.15, 0.95, 0]} rotation={[s * paso, 0, 0]}>
          <P geo={cil(0.1, 0.09, 0.85, 14)} color="#6b5a45" position={[0, -0.43, 0]} umbral={40} />
          <P geo={caja(0.2, 0.12, 0.32)} color="#3a2a22" position={[0, -0.9, 0.06]} />
        </group>
      ))}
      <P geo={cil(0.3, 0.33, 0.78, 18)} color="#d2ad6f" position={[0, 1.33, 0]} umbral={40} />
      <P geo={caja(0.62, 0.06, 0.62)} color="#5a3e2a" position={[0, 0.98, 0]} linea={0} />
      {/* bolsillos */}
      {[-1, 1].map((s) => (
        <P key={s} geo={caja(0.14, 0.14, 0.02)} color="#c49d60" position={[s * 0.14, 1.5, 0.31]} />
      ))}
      {/* brazos */}
      {[-1, 1].map((s) => {
        const ox = s > 0 && saluda > 0 ? -2.6 * saluda : -1.25 * brazos;
        const oz = s > 0 && saluda > 0 ? -0.35 * saluda + Math.sin(t * 10) * 0.25 * saluda : s * paso * 0.4 * (1 - brazos);
        return (
          <group key={s} position={[s * 0.36, 1.62, 0]} rotation={[ox, 0, s * 0.12 + oz * s]}>
            <P geo={cil(0.085, 0.075, 0.42, 12)} color="#d2ad6f" position={[0, -0.2, 0]} umbral={40} />
            <P geo={cil(0.065, 0.06, 0.32, 12)} color={PIEL} position={[0, -0.55, 0]} umbral={40} />
            <P geo={esf(0.08, 12)} color={PIEL} position={[0, -0.74, 0]} linea={0} />
          </group>
        );
      })}
      {/* cabeza */}
      <group position={[0, 2.02, 0]}>
        <P geo={esf(0.3, 28)} color={PIEL} linea={0} />
        <P geo={esf(0.07, 12)} color="#e89a74" position={[0, -0.02, 0.29]} linea={0} />
        <P geo={caja(0.26, 0.06, 0.06)} color="#4b3326" position={[0, -0.1, 0.27]} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <P geo={esf(0.045, 12)} color="#ffffff" position={[s * 0.1, 0.07, 0.26]} linea={0} silueta={1.4} />
            <P geo={esf(0.022, 8)} color="#141418" position={[s * 0.1, 0.07, 0.3]} linea={0} silueta={0} />
          </group>
        ))}
        <P geo={cil(0.5, 0.5, 0.03, 28)} color="#dcc28c" position={[0, 0.18, 0]} />
        <P geo={cil(0.24, 0.28, 0.22, 24)} color="#dcc28c" position={[0, 0.3, 0]} />
        <P geo={cil(0.285, 0.285, 0.05, 24)} color="#6b4a2b" position={[0, 0.22, 0]} linea={0} silueta={0} />
      </group>
    </group>
  );
};

export const Cajon: React.FC<{tapa: number}> = ({tapa}) => (
  <group>
    <P geo={caja(0.62, 0.4, 0.46)} color="#c98d52" position={[0, 0.2, 0]} />
    {[0.1, 0.2, 0.3].map((y) => (
      <P key={y} geo={caja(0.63, 0.012, 0.47)} color="#9a6232" position={[0, y, 0]} linea={0} silueta={0} />
    ))}
    {[-0.18, 0, 0.18].map((x) => (
      <P key={x} geo={cil(0.03, 0.03, 0.02, 12)} color="#2a1c12" position={[x, 0.25, 0.232]} rotation={[Math.PI / 2, 0, 0]} linea={0} silueta={0} sombra={false} />
    ))}
    {tapa < 0.98 && (
      <group position={[tapa * 0.5, 0.4 + Math.sin(tapa * Math.PI) * 0.5 - tapa * 0.4, -0.23 - tapa * 0.5]} rotation={[-tapa * 1.4, 0, -tapa * 0.8]}>
        <P geo={caja(0.64, 0.04, 0.48)} color="#b57a42" position={[0, 0.02, 0.24]} />
      </group>
    )}
  </group>
);

export const Pasto: React.FC = () => {
  const mata = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 170; i++) {
      const x = (rnd(i * 3) - 0.5) * 16;
      const z = -2.4 + rnd(i * 3 + 1) * 9;
      for (let k = 0; k < 3; k++) {
        const h = 0.13 + rnd(i * 7 + k) * 0.12;
        const g = new THREE.ConeGeometry(0.025, h, 3);
        g.translate(0, h / 2, 0);
        g.rotateZ((k - 1) * 0.35 + (rnd(i + k) - 0.5) * 0.2);
        g.translate(x + (k - 1) * 0.03, 0, z);
        gs.push(g);
      }
    }
    return mergeGeometries(gs);
  }, []);
  return <P geo={mata} color="#5aa83a" linea={0} silueta={1.2} sombra={false} />;
};

export const Casa: React.FC = () => (
  <group>
    <P geo={caja(30, 4.4, 0.3)} color="#d6c6a6" mapa={texPared()} position={[0, 2.2, -3]} linea={0} silueta={0} />
    <P geo={caja(30, 0.25, 0.32)} color="#a89474" position={[0, 0.12, -2.98]} linea={0} silueta={0} />
    <P geo={caja(30, 0.3, 1.2)} color="#e2bf82" position={[0, 4.15, -2.4]} />
    <P geo={caja(30, 0.7, 1.5)} color="#b8473a" position={[0, 4.6, -2.3]} />
    {/* puerta */}
    <P geo={caja(1.2, 2.4, 0.08)} color="#6d4630" position={[-2.6, 1.2, -2.84]} />
    {/* ventana */}
    <P geo={caja(1.7, 1.3, 0.08)} color="#f2ece0" position={[1.4, 2.2, -2.84]} />
    <P geo={caja(1.45, 1.05, 0.1)} color="#8fb6cf" position={[1.4, 2.2, -2.82]} />
    <P geo={caja(0.05, 1.05, 0.12)} color="#f2ece0" position={[1.4, 2.2, -2.8]} linea={0} />
    <P geo={caja(1.9, 0.1, 0.3)} color="#f2ece0" position={[1.4, 1.5, -2.75]} />
  </group>
);

export const Mesa: React.FC = () => (
  <group>
    <P geo={caja(1.5, 0.08, 0.95)} color={MADERA} position={[0, 0.95, 0]} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <P key={`${sx}${sz}`} geo={caja(0.08, 0.92, 0.08)} color="#9b6236" position={[sx * 0.66, 0.46, sz * 0.4]} />))}
  </group>
);

export const Halo: React.FC<{pos: [number, number, number]; o: number; escala: number; color?: string}> = ({pos, o, escala, color = '#ffd27a'}) => {
  if (o <= 0.01) return null;
  return (
    <sprite position={pos} scale={[escala, escala, 1]}>
      <spriteMaterial map={texNube()} color={color} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

let _ondas: THREE.CanvasTexture | null = null;

export const texOndas = () => {
  if (_ondas) return _ondas;
  _ondas = canvasTex(128, 256, (g) => {
    g.clearRect(0, 0, 128, 256);
    g.lineWidth = 9;
    g.lineCap = 'round';
    for (const x0 of [30, 64, 98]) {
      g.strokeStyle = '#16171c';
      g.lineWidth = 14;
      g.beginPath();
      for (let y = 230; y > 30; y -= 4) g.lineTo(x0 + Math.sin(y / 22) * 10, y);
      g.stroke();
      g.strokeStyle = '#ff8a2a';
      g.lineWidth = 8;
      g.beginPath();
      for (let y = 230; y > 30; y -= 4) g.lineTo(x0 + Math.sin(y / 22) * 10, y);
      g.stroke();
    }
  });
  _ondas.wrapS = _ondas.wrapT = THREE.ClampToEdgeWrapping;
  return _ondas;
};

let _copo: THREE.CanvasTexture | null = null;

export const texCopo = () => {
  if (_copo) return _copo;
  _copo = canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.translate(32, 32);
    for (let k = 0; k < 6; k++) {
      g.rotate(Math.PI / 3);
      g.strokeStyle = '#16171c';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 26);
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 25);
      g.stroke();
    }
  });
  _copo.wrapS = _copo.wrapT = THREE.ClampToEdgeWrapping;
  return _copo;
};

let _estrella: THREE.CanvasTexture | null = null;

export const texEstrella = () => {
  if (_estrella) return _estrella;
  _estrella = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const rr = k % 2 ? 26 : 58;
      g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = '#ffe14d';
    g.fill();
    g.strokeStyle = '#16171c';
    g.lineWidth = 6;
    g.stroke();
  });
  _estrella.wrapS = _estrella.wrapT = THREE.ClampToEdgeWrapping;
  return _estrella;
};

export const Sprite: React.FC<{tex: THREE.Texture; pos: [number, number, number]; escala: [number, number]; o: number; rot?: number}> = ({tex, pos, escala, o, rot = 0}) =>
  o <= 0.01 ? null : (
    <sprite position={pos} scale={[escala[0], escala[1], 1]}>
      <spriteMaterial map={tex} transparent opacity={o} depthWrite={false} rotation={rot} />
    </sprite>
  );

export const Mano: React.FC<{desde: THREE.Vector3; hasta: THREE.Vector3}> = ({desde, hasta}) => {
  const dir = hasta.clone().sub(desde);
  const L = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = desde.clone().add(hasta).multiplyScalar(0.5);
  return (
    <group>
      <group position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
        <P geo={cil(0.04, 0.05, L, 14)} color="#f2b48c" umbral={40} />
      </group>
      <P geo={esf(0.055, 14)} color="#f2b48c" position={[hasta.x, hasta.y, hasta.z]} scale={[1, 0.8, 1.1]} linea={0} />
    </group>
  );
};

export const ICONOS: Record<string, React.ReactNode> = {
  fruta: (
    <g>
      <path d="M50 22 C74 22 84 44 78 66 C72 86 28 86 22 66 C16 44 26 22 50 22Z" fill="#ff9a2e" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={50} cy={56} rx={10} ry={18} fill="#2b2b2b" />
      <path d="M50 22 C52 14 58 10 64 10" fill="none" stroke="#3fae4a" strokeWidth={5} />
    </g>
  ),
  arriba: (
    <g>
      <rect x={38} y={56} width={24} height={24} rx={4} fill="#ffa62b" stroke="#16171c" strokeWidth={4} />
      <path d="M50 48 L50 14 M36 28 L50 14 L64 28" fill="none" stroke="#16171c" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  naranja: (
    <g>
      <circle cx={50} cy={52} r={32} fill="#ff9a1a" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={52} r={22} fill="#ffc15a" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <path key={k} d={`M50 52 L${50 + Math.cos((k / 6) * Math.PI * 2) * 22} ${52 + Math.sin((k / 6) * Math.PI * 2) * 22}`} stroke="#ff9a1a" strokeWidth={3} />
      ))}
    </g>
  ),
  enfermo: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#b9e07a" stroke="#16171c" strokeWidth={4} />
      <path d="M34 42 L44 42 M56 42 L66 42" stroke="#16171c" strokeWidth={5} strokeLinecap="round" />
      <path d="M36 66 C44 58 56 58 64 66" fill="none" stroke="#16171c" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  hierro: (
    <g>
      <rect x={20} y={30} width={60} height={44} rx={8} fill="#9aa2ad" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={62} textAnchor="middle" fontSize={30} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        Fe
      </text>
    </g>
  ),
  higado: <path d="M16 46 C20 24 60 20 84 30 C90 44 74 70 52 74 C36 76 26 70 22 62 C14 58 14 52 16 46Z" fill="#8a2f2a" stroke="#16171c" strokeWidth={4} />,
  calavera: (
    <g>
      <path d="M50 16 C30 16 20 30 20 46 C20 58 28 62 32 64 L32 78 L68 78 L68 64 C72 62 80 58 80 46 C80 30 70 16 50 16Z" fill="#fff" stroke="#16171c" strokeWidth={4} />
      <circle cx={38} cy={46} r={8} fill="#16171c" />
      <circle cx={62} cy={46} r={8} fill="#16171c" />
      <path d="M44 78 L44 70 M56 78 L56 70" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  melon: (
    <g>
      <path d="M14 50 A36 36 0 0 0 86 50Z" fill="#9bd36a" stroke="#16171c" strokeWidth={4} />
      <path d="M22 50 A28 28 0 0 0 78 50Z" fill="#f6c27a" />
    </g>
  ),
  pellet: (
    <g>
      {[[34, 40], [58, 36], [46, 58], [68, 60], [30, 64]].map(([x, y], i) => (
        <rect key={i} x={x - 8} y={y - 6} width={16} height={12} rx={5} fill={['#c98a4a', '#e05a3a', '#7fb84a'][i % 3]} stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  golpe: (
    <g>
      <path d="M50 10 L58 38 L88 30 L64 52 L84 78 L54 66 L44 92 L38 64 L10 70 L32 50 L14 26 L42 36Z" fill="#ffe14d" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  alas: (
    <g>
      <path d="M50 60 C36 36 20 30 8 32 C16 48 30 62 50 64Z" fill="#23242c" stroke="#16171c" strokeWidth={3} />
      <path d="M50 60 C64 36 80 30 92 32 C84 48 70 62 50 64Z" fill="#23242c" stroke="#16171c" strokeWidth={3} />
      <ellipse cx={50} cy={62} rx={8} ry={14} fill="#ffe066" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  saltar: (
    <g>
      <path d="M14 76 C24 30 46 30 50 60 C56 30 78 30 86 76" fill="none" stroke="#16171c" strokeWidth={5} strokeDasharray="7 6" strokeLinecap="round" />
      <rect x={6} y={76} width={22} height={6} fill="#b87a45" />
      <rect x={40} y={60} width={22} height={6} fill="#b87a45" />
      <rect x={74} y={76} width={22} height={6} fill="#b87a45" />
    </g>
  ),
  jaulaLarga: (
    <g fill="none" stroke="#2a2b31" strokeWidth={4}>
      <rect x={10} y={26} width={80} height={52} />
      {[22, 34, 46, 58, 70, 82].map((x) => (
        <path key={x} d={`M${x} 26 L${x} 78`} strokeWidth={2} />
      ))}
      <path d="M10 84 L10 90 M90 84 L90 90" />
    </g>
  ),
  palos: (
    <g>
      {[[20, 30], [50, 56], [30, 76], [62, 38]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={28} height={7} rx={3} fill="#b87a45" stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  casa: (
    <g>
      <path d="M16 48 L50 18 L84 48" fill="#e0453a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <rect x={26} y={46} width={48} height={36} fill="#f6e3b4" stroke="#16171c" strokeWidth={4} />
      <rect x={43} y={60} width={14} height={22} fill="#8a5634" />
    </g>
  ),
  sol: (
    <g>
      {Array.from({length: 8}, (_, k) => (
        <path key={k} d={`M${50 + Math.cos((k / 8) * Math.PI * 2) * 30} ${50 + Math.sin((k / 8) * Math.PI * 2) * 30} L${50 + Math.cos((k / 8) * Math.PI * 2) * 42} ${50 + Math.sin((k / 8) * Math.PI * 2) * 42}`} stroke="#ff9a1a" strokeWidth={6} strokeLinecap="round" />
      ))}
      <circle cx={50} cy={50} r={22} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  mano: (
    <g>
      <path d="M30 86 L30 50 C30 44 38 44 38 50 L38 26 C38 20 46 20 46 26 L46 22 C46 16 54 16 54 22 L54 28 C54 22 62 22 62 28 L62 40 C62 34 70 34 70 40 L70 66 C70 78 62 86 52 86Z" fill="#f2b48c" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
    </g>
  ),
  termometro: (
    <g>
      <rect x={42} y={12} width={16} height={56} rx={8} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <rect x={46} y={26} width={8} height={44} fill="#e0453a" />
      <circle cx={50} cy={74} r={14} fill="#e0453a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  aire: (
    <g>
      <rect x={12} y={28} width={76} height={30} rx={6} fill="#f4f6f8" stroke="#16171c" strokeWidth={4} />
      <path d="M20 50 L80 50" stroke="#16171c" strokeWidth={3} />
      <path d="M30 66 C26 72 34 76 30 84 M50 66 C46 72 54 76 50 84 M70 66 C66 72 74 76 70 84" fill="none" stroke="#4fb7e6" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  copo: (
    <g stroke="#4fb7e6" strokeWidth={6} strokeLinecap="round">
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M${50 + Math.cos((k / 3) * Math.PI) * 34} ${50 + Math.sin((k / 3) * Math.PI) * 34} L${50 - Math.cos((k / 3) * Math.PI) * 34} ${50 - Math.sin((k / 3) * Math.PI) * 34}`} />
      ))}
    </g>
  ),
  sangre: <path d="M50 14 C62 34 76 48 76 64 C76 80 64 88 50 88 C36 88 24 80 24 64 C24 48 38 34 50 14Z" fill="#e0302a" stroke="#16171c" strokeWidth={4} />,
  radiador: (
    <g>
      <rect x={14} y={24} width={72} height={52} rx={4} fill="#c3c7cf" stroke="#16171c" strokeWidth={4} />
      {[24, 34, 44, 54, 64, 74].map((x) => (
        <path key={x} d={`M${x} 30 L${x} 70`} stroke="#5d6068" strokeWidth={4} />
      ))}
    </g>
  ),
  corazon: <path d="M50 84 C20 62 12 46 18 34 C24 22 42 20 50 36 C58 20 76 22 82 34 C88 46 80 62 50 84Z" fill="#e0453a" stroke="#16171c" strokeWidth={4} />,
  maleta: (
    <g>
      <rect x={14} y={34} width={72} height={46} rx={6} fill="#8a5634" stroke="#16171c" strokeWidth={4} />
      <path d="M38 34 L38 24 L62 24 L62 34" fill="none" stroke="#16171c" strokeWidth={5} />
      <rect x={22} y={46} width={18} height={12} fill="#e0453a" />
      <rect x={58} y={56} width={16} height={12} fill="#3fae4a" />
    </g>
  ),

  hoja: (
    <g>
      <path d="M50 12 C80 25 84 62 50 88 C16 62 20 25 50 12Z" fill="#3fae4a" stroke="#16171c" strokeWidth={4} />
      <path d="M50 22 L50 84" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  pluma: <path d="M70 12 C40 20 26 50 30 82 L36 86 C50 60 66 40 70 12Z" fill="#23242c" stroke="#16171c" strokeWidth={3} />,
  pecho: (
    <g>
      <circle cx={50} cy={50} r={34} fill="#23242c" />
      <ellipse cx={56} cy={52} rx={16} ry={26} fill="#ffe066" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  pico: (
    <g>
      <path d="M14 38 C40 26 70 32 90 58 C66 56 40 60 14 66Z" fill="#ff8a1c" stroke="#16171c" strokeWidth={4} />
      <path d="M76 44 C82 49 87 54 90 58 C84 57 80 57 74 57Z" fill="#1d1d22" />
    </g>
  ),
  juguete: (
    <g>
      <ellipse cx={46} cy={62} rx={30} ry={20} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <circle cx={58} cy={36} r={16} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <path d="M72 36 L88 40 L72 44Z" fill="#ff8a1c" stroke="#16171c" strokeWidth={3} />
      <circle cx={62} cy={32} r={3} fill="#16171c" />
    </g>
  ),
  tucan: (
    <g>
      <circle cx={34} cy={52} r={24} fill="#23242c" />
      <circle cx={34} cy={60} r={12} fill="#ffe066" />
      <circle cx={38} cy={44} r={6} fill="#4fb7e6" />
      <path d="M48 40 C66 34 82 40 92 56 C76 54 62 58 48 60Z" fill="#ff8a1c" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  jaula: (
    <g fill="none" stroke="#7b7f88" strokeWidth={4}>
      <path d="M24 82 L24 42 C24 22 76 22 76 42 L76 82" />
      {[36, 50, 64].map((x) => (
        <path key={x} d={`M${x} 82 L${x} 30`} />
      ))}
      <rect x={18} y={80} width={64} height={8} rx={3} fill="#d6393a" stroke="#16171c" />
      <circle cx={50} cy={20} r={5} />
    </g>
  ),
  semillas: (
    <g>
      {[
        [34, 40],
        [54, 34],
        [66, 54],
        [42, 60],
        [56, 70],
        [30, 64],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={9} ry={6} transform={`rotate(${i * 35} ${x} ${y})`} fill="#a26b35" stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  calendario: (
    <g>
      <rect x={18} y={22} width={64} height={60} rx={8} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <rect x={18} y={22} width={64} height={16} rx={6} fill="#e0453a" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={74} textAnchor="middle" fontSize={32} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        7
      </text>
    </g>
  ),
  plato: (
    <g>
      <ellipse cx={50} cy={58} rx={34} ry={16} fill="#e0453a" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={50} cy={52} rx={26} ry={9} fill="#a26b35" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  tirar: (
    <g>
      {[
        [30, 70],
        [50, 46],
        [70, 30],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={8} ry={5} fill="#a26b35" stroke="#16171c" strokeWidth={3} />
      ))}
      <path d="M22 84 C40 60 58 40 84 20" fill="none" stroke="#16171c" strokeWidth={3} strokeDasharray="6 6" />
    </g>
  ),
  panal: (
    <g>
      {[
        [38, 38],
        [62, 38],
        [26, 58],
        [50, 58],
        [74, 58],
        [38, 78],
        [62, 78],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={Array.from({length: 6}, (_, k) => `${k ? 'L' : 'M'}${x + Math.cos((k / 6) * Math.PI * 2 + Math.PI / 6) * 12} ${y + Math.sin((k / 6) * Math.PI * 2 + Math.PI / 6) * 12}`).join(' ') + 'Z'}
          fill="#fbe9c2"
          stroke="#8a4f1c"
          strokeWidth={3}
        />
      ))}
    </g>
  ),
};

export type Ic = [number, string, string, ('ok' | 'no')?, number?];

export const Marca: React.FC<{tipo: 'ok' | 'no'; o: number}> = ({tipo, o}) => (
  <svg width={64} height={64} viewBox="0 0 64 64" style={{position: 'absolute', right: -8, top: -8, transform: `scale(${o})`}}>
    <circle cx={32} cy={32} r={28} fill={tipo === 'ok' ? '#3cb54a' : '#e0453a'} stroke="#ffffff" strokeWidth={5} />
    {tipo === 'ok' ? <path d="M18 33 L28 43 L46 22" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" /> : <path d="M21 21 L43 43 M43 21 L21 43" stroke="#fff" strokeWidth={7} strokeLinecap="round" />}
  </svg>
);

export const Ranura: React.FC<{t: number; lista: Ic[]; x: number}> = ({t, lista, x}) => {
  let i = -1;
  for (let k = 0; k < lista.length; k++) if (lista[k][0] <= t) i = k;
  if (i < 0 || !lista[i][1]) return null;
  const [t0, ic, lab, marca, tm] = lista[i];
  const a = cl((t - t0) / 0.22);
  const pop = a < 1 ? 0.6 + 0.4 * a + Math.sin(a * Math.PI) * 0.15 : 1;
  const om = marca && tm !== undefined ? cl((t - tm) / 0.2) : 0;
  return (
    <div style={{position: 'absolute', left: x - 110, top: 1430, width: 220, textAlign: 'center', opacity: a}}>
      <div style={{position: 'relative', width: 170, height: 170, margin: '0 auto', transform: `scale(${pop})`}}>
        <div style={{width: 170, height: 170, borderRadius: 85, background: '#ffffff', boxShadow: '0 8px 20px rgba(0,0,0,0.22)', border: '5px solid #16171c', boxSizing: 'border-box'}}>
          <svg width={160} height={160} viewBox="0 0 100 100">
            {ICONOS[ic]}
          </svg>
        </div>
        {marca && om > 0 && <Marca tipo={marca} o={om} />}
      </div>
      <div style={{marginTop: 10, fontFamily: FUENTE, fontWeight: 900, fontSize: 40, color: '#16171c', WebkitTextStroke: '9px #fff', paintOrder: 'stroke fill', lineHeight: 1.05}}>{lab}</div>
    </div>
  );
};

const limpia = (w: string) => w.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');
type Pal = {t: number; e: number; w: string};
export const crearSubtitulo = (datos: any, ROJAS: Set<string>) => {
  const PALABRAS: Pal[] = datos.beats.flatMap((b: any) => b.words);
  const TROZOS: Pal[][] = [];
  let cur: Pal[] = [];
  for (const p of PALABRAS) {
    cur.push(p);
    if (/[,.…:;?!]$/.test(p.w) || cur.length >= 3) {
      TROZOS.push(cur);
      cur = [];
    }
  }
  if (cur.length) TROZOS.push(cur);
  const Subtitulo: React.FC<{t: number}> = ({t}) => {
  let i = -1;
  for (let k = 0; k < TROZOS.length; k++) if (TROZOS[k][0].t - 0.05 <= t) i = k;
  if (i < 0) return null;
  const tr = TROZOS[i];
  if (t > tr[tr.length - 1].e + 0.8) return null;
  return (
    <div style={{position: 'absolute', top: 200, left: 50, right: 50, textAlign: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 76, lineHeight: 1.1}}>
      {tr.map((p, k) => {
        const a = cl((t - p.t + 0.05) / 0.12);
        const roja = ROJAS.has(limpia(p.w));
        return (
          <span
            key={k}
            style={{
              display: 'inline-block',
              margin: '0 12px',
              opacity: a,
              transform: `scale(${0.7 + 0.3 * a})`,
              color: roja ? '#e3352b' : '#16171c',
              WebkitTextStroke: '13px #ffffff',
              paintOrder: 'stroke fill',
            }}
          >
            {p.w.replace(/[,.…:;]$/, '')}
          </span>
        );
      })}
    </div>
  );
  };
  return Subtitulo;
};


export const Confeti: React.FC<{t: number; t0: number}> = ({t, t0}) => {
  const dt = t - t0 + 0.1;
  if (dt < 0 || dt > 2.6) return null;
  const cols = ['#e0453a', '#ffd23a', '#3cb54a', '#2f6fe0', '#ff8a1c'];
  return (
    <>
      {Array.from({length: 46}, (_, i) => {
        const x = 540 + (rnd(i) - 0.5) * 300 + (rnd(i + 1) - 0.5) * 900 * Math.min(1, dt * 2.5);
        const y = 900 - (500 + rnd(i + 2) * 500) * dt + 900 * dt * dt;
        return (
          <div
            key={i}
            style={{position: 'absolute', left: x, top: y, width: 22, height: 12, background: cols[i % 5], transform: `rotate(${dt * 600 * (rnd(i + 3) - 0.5) + i * 40}deg)`, border: '2px solid #16171c', opacity: 1 - cl((dt - 2) / 0.6)}}
          />
        );
      })}
    </>
  );
};

export const Sello: React.FC<{t: number; t0: number; texto: string; sub?: string; color?: string}> = ({t, t0, texto, sub, color = '#e0302a'}) => {
  const a = cl((t - t0 + 0.1) / 0.25);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, a * 1.5)}}>
      <div style={{transform: `rotate(-9deg) scale(${lerp(2.2, 1, a)})`, border: `12px solid ${color}`, borderRadius: 26, padding: '18px 40px', background: 'rgba(255,255,255,0.88)', fontFamily: FUENTE, fontWeight: 900, fontSize: 96, lineHeight: 1, color, textAlign: 'center', letterSpacing: -2}}>
        {texto}
        {sub && <div style={{fontSize: 56, letterSpacing: 0}}>{sub}</div>}
      </div>
    </div>
  );
};
