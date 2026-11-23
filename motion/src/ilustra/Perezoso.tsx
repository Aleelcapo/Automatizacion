import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/perezoso.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, cil, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, ventana} from './kit';
import {Confeti, Halo, ICONOS, Ic, Ranura, Sello, Sprite, Tio, crearSubtitulo, texCopo} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_PEREZOSO = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  costa: T('costa'),
  peluche: T('peluche'),
  lenta: T('lenta'),
  sonrisa: T('sonrisa'),
  unas: T('uñas'),
  felicidades: T('felicidades'),
  perezoso: T('perezoso', 1),
  pones: T('pones'),
  sillon: T('sillón', 1),
  platano: T('plátano', 1),
  listo: T('listo'),
  pero1: T('pero', 1),
  panza: T('panza', 1),
  es1: T('es', 1),
  hojas: T('hojas', 1),
  vaca: T('vaca:'),
  partes: T('partes'),
  semanas: T('semanas'),
  fermenta: T('fermenta'),
  enferma: T('enferma'),
  comida: T('comida:'),
  pero2: T('pero', 2),
  cuelga: T('cuelga'),
  abajo: T('abajo'),
  colgado: T('colgado'),
  organos: T('órganos'),
  pulmones: T('pulmones'),
  ramas: T('ramas'),
  casa: T('casa', 1),
  pero3: T('pero', 3),
  semana: T('semana', 1),
  bano: T('baño'),
  popo: T('popó'),
  baja: T('baja'),
  suelo: T('suelo'),
  pero4: T('pero', 4),
  temblando: T('temblando'),
  frio: T('frío'),
  calor: T('calor'),
  ahora: T('ahora'),
  perezoso2: T('perezoso', 2),
  ilegal: T('ilegal'),
  mueren: T('mueren'),
  camino: T('camino'),
  lugar: T('lugar…'),
  selva2: T('selva', 2),
};

const PELO = '#a08a6a';
const PELO_OSC = '#7e6a50';
const CARA = '#efe1c4';

// ---------- perezoso ----------
const Garra: React.FC<{s: number}> = ({s}) => (
  <group>
    {[-1, 0, 1].map((k) => (
      <P key={k} geo={G('garra', () => new THREE.ConeGeometry(0.018, 0.14, 6).translate(0, -0.07, 0))} color="#2a241c" position={[0, 0, k * 0.025 * s]} rotation={[0, 0, 0.5]} linea={0} silueta={1} />
    ))}
  </group>
);
// Brazo: de hombro (origen) hacia "dir" en el plano (rotación z), con garra al final.
const Brazo: React.FC<{largo: number; rz: number; rx?: number; s: number}> = ({largo, rz, rx = 0, s}) => (
  <group rotation={[rx, 0, rz]}>
    <P geo={cil(0.06, 0.05, largo, 10)} color={PELO} position={[0, -largo / 2, 0]} linea={0} silueta={1.6} />
    <group position={[0, -largo, 0]}>
      <Garra s={s} />
    </group>
  </group>
);
const Perezoso: React.FC<{t: number; colgado?: number; panza?: number; tiembla?: number; sonrisa?: number; agarra?: number}> = ({t, colgado = 0, panza = 0, tiembla = 0}) => {
  const sh = tiembla * Math.sin(t * 60) * 0.015;
  const brazoRz = lerp(0.35, Math.PI - 0.25, colgado);
  return (
    <group position={[sh, 0, 0]}>
      {/* cuerpo */}
      <P geo={esf(0.3, 24)} color={PELO} position={[0, 0, 0]} scale={[0.9 + panza * 0.25, 1.15, 0.85 + panza * 0.3]} linea={0} silueta={2} />
      <P geo={esf(0.22, 18)} color={PELO_OSC} position={[-0.03, 0.05, -0.12]} scale={[1, 1.1, 0.6]} linea={0} silueta={0} />
      {/* cabeza */}
      <group position={[0, 0.36, 0.05]}>
        <P geo={esf(0.18, 22)} color={PELO} linea={0} silueta={1.8} />
        <P geo={esf(0.14, 20)} color={CARA} position={[0, -0.01, 0.07]} scale={[1, 0.85, 0.75]} linea={0} silueta={0} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <P geo={esf(0.05, 12)} color="#3a2e22" position={[s * 0.065, 0.02, 0.15]} scale={[1.6, 0.7, 0.5]} rotation={[0, 0, s * -0.3]} linea={0} silueta={0} />
            <P geo={esf(0.02, 8)} color="#111" position={[s * 0.06, 0.02, 0.18]} linea={0} silueta={0} />
            <P geo={esf(0.007, 6)} color="#fff" position={[s * 0.055, 0.03, 0.195]} linea={0} silueta={0} sombra={false} />
          </group>
        ))}
        <P geo={esf(0.028, 10)} color="#2a201a" position={[0, -0.04, 0.2]} scale={[1.3, 0.8, 0.8]} linea={0} silueta={0} />
        <P geo={G('sonrisa', () => new THREE.TorusGeometry(0.045, 0.006, 6, 20, Math.PI))} color="#2a201a" position={[0, -0.07, 0.19]} rotation={[0, 0, Math.PI]} linea={0} silueta={0} />
      </group>
      {/* brazos (delanteros largos) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, 0.18, 0.02]}>
          <Brazo largo={0.5} rz={s * brazoRz} rx={colgado ? 0 : 0.5} s={s} />
        </group>
      ))}
      {/* patas traseras */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.16, -0.25, 0.05]}>
          <Brazo largo={0.32} rz={s * lerp(0.4, Math.PI - 0.5, colgado)} rx={colgado ? 0 : 1.2} s={s} />
        </group>
      ))}
    </group>
  );
};

// ---------- sala ----------
const Sala: React.FC<{cortina: boolean; rama: number}> = ({rama}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#c4a27a" />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#e8e0c8" position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    {/* ventana + cortina + barra */}
    <P geo={caja(1.5, 1.4, 0.08)} color="#f4f1ea" position={[1.4, 1.75, -1.48]} />
    <P geo={caja(1.3, 1.2, 0.1)} color="#bfe3f7" position={[1.4, 1.75, -1.46]} />
    <P geo={cil(0.025, 0.025, 2.4, 10)} color="#5a3e2a" position={[1.4, 2.62, -1.3]} rotation={[0, 0, Math.PI / 2]} />
    <P geo={caja(0.5, 1.95, 0.06)} color="#e0453a" position={[0.45, 1.62, -1.3]} />
    <P geo={caja(0.5, 1.95, 0.06)} color="#e0453a" position={[2.35, 1.62, -1.3]} />
    {/* sillón */}
    <group position={[-0.6, 0, -0.6]}>
      <P geo={caja(1.8, 0.42, 0.8)} color="#4f7fd0" position={[0, 0.21, 0]} />
      <P geo={caja(1.8, 0.55, 0.2)} color="#4f7fd0" position={[0, 0.65, -0.32]} />
      <P geo={caja(0.2, 0.3, 0.8)} color="#3f6fc0" position={[-0.9, 0.55, 0]} />
      <P geo={caja(0.2, 0.3, 0.8)} color="#3f6fc0" position={[0.9, 0.55, 0]} />
      <P geo={caja(0.8, 0.12, 0.62)} color="#6a96e0" position={[-0.4, 0.48, 0.05]} />
      <P geo={caja(0.8, 0.12, 0.62)} color="#6a96e0" position={[0.4, 0.48, 0.05]} />
    </group>
    {/* mesita */}
    <P geo={caja(0.6, 0.35, 0.4)} color="#8a6a4a" position={[0.75, 0.175, 0.1]} />
    {/* árbol de interior / ramas */}
    {rama > 0.01 && (
      <group position={[-1.9, 0, -0.8]} scale={[1, rama, 1]}>
        <P geo={cil(0.08, 0.1, 2.5, 10)} color="#7a5232" position={[0, 1.25, 0]} />
        <P geo={cil(0.05, 0.06, 1.4, 10)} color="#7a5232" position={[0.6, 2.1, 0.1]} rotation={[0, 0, Math.PI / 2 - 0.1]} />
        {[0, 1, 2].map((k) => (
          <P key={k} geo={esf(0.35, 12)} color="#3fa548" position={[-0.2 + k * 0.5, 2.55 + (k % 2) * 0.15, -0.1]} scale={[1.2, 0.7, 1]} linea={0} />
        ))}
      </group>
    )}
  </group>
);

const Selva: React.FC = () => (
  <group position={[30, 0, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 20]} />
      <meshToonMaterial color="#4f9a3a" />
    </mesh>
    {[[-2.5, -3], [2.6, -3.4], [-1, -5], [1.2, -4.6], [3.8, -1.5], [-3.8, -1.5]].map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <P geo={cil(0.18, 0.26, 4.4, 10)} color="#6b4a2b" position={[0, 2.2, 0]} />
        <P geo={esf(1.2, 14)} color={i % 2 ? '#2f8a3a' : '#3fa548'} position={[0, 4.6, 0]} scale={[1.3, 0.8, 1.1]} linea={0} />
      </group>
    ))}
    <P geo={cil(0.08, 0.1, 3.2, 10)} color="#7a5232" position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]} />
  </group>
);

// ---------- escena ----------
const MESA_TIO = -1.0;
const SP = 0.45;
const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.pones - 0.35;
  const enSelva = t > ev.lugar - 0.3;
  const camina = r(t, 0, 2.6);
  const tioX = lerp(-3.4, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.25, r(t, 2.6, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.pones - 0.35, 0.3);
  const brazo = V(tioX + 0.36 * Math.cos(giro) + 0.6 * Math.sin(giro), 1.36, 0.15 - 0.36 * Math.sin(giro) + 0.6 * Math.cos(giro));
  // dónde está el perezoso
  const sofa: [number, number, number] = [-0.9, 0.72, -0.55];
  const cortina: [number, number, number] = [0.85, 2.62 - 0.7 * SP * 1.6, -1.3];
  const rama: [number, number, number] = [-1.4, 2.1 - 0.7 * SP * 1.6, -0.7];
  const colgado = t > ev.cuelga - 0.6 && t < ev.pero4 - 0.1 ? 1 : 0;
  let pos: [number, number, number] = sofa;
  if (t > ev.cuelga - 0.6 && t < ev.ramas - 0.3) pos = cortina;
  if (t > ev.ramas - 0.3 && t < ev.pero4 - 0.1) {
    pos = rama;
    // baja al suelo
    const k = r(t, ev.baja - 0.2, 2.4);
    if (t > ev.baja - 0.2) pos = [rama[0] - 0.42 + 0.0, lerp(rama[1], 0.45, k), rama[2] + 0.05];
  }
  if (t > ev.pero4 - 0.1) pos = sofa;
  const panza = ventana(t, ev.panza - 0.4, ev.comida, 0.5);
  const tiembla = ventana(t, ev.temblando - 0.3, ev.calor, 0.3);

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.4], [-1.4, 1.3, 0], 42],
      [ev.peluche - 0.4, [brazo.x + 0.35, brazo.y - 0.1, brazo.z + 1.5], [brazo.x, brazo.y - 0.35, brazo.z], 34],
      [ev.sonrisa - 0.3, [brazo.x + 0.2, brazo.y - 0.15, brazo.z + 0.95], [brazo.x, brazo.y - 0.25, brazo.z], 30],
      [ev.felicidades - 0.25, [-0.8, 1.75, 4.4], [-0.8, 1.25, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (enSelva) {
    cam = {pos: V(30.4, 2.3, 3.4 - (t - ev.lugar) * 0.1), obj: V(30, 2.0, 0), fov: 40};
  } else {
    const p = V(...pos);
    const cerca = ventana(t, ev.pero1 - 0.1, ev.es1 + 0.3, 0.4) + ventana(t, ev.pero2 - 0.1, ev.ramas - 0.4, 0.4) + ventana(t, ev.pero4 - 0.1, ev.ahora, 0.4);
    const ancho = ventana(t, ev.ramas - 0.4, ev.pero4 - 0.1, 0.4);
    cam = {
      pos: V(lerp(lerp(-0.3, p.x + 0.25, cerca), p.x + 0.6, ancho), lerp(lerp(1.6, p.y + 0.35, cerca), p.y + 0.4, ancho), lerp(lerp(3.2, p.z + 1.5, cerca), p.z + 2.8, ancho)),
      obj: V(lerp(lerp(-0.5, p.x, cerca), p.x + 0.3, ancho), lerp(lerp(0.9, p.y + 0.1, cerca), p.y - 0.2, ancho), lerp(-0.5, p.z, cerca)),
      fov: 38,
    };
  }

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[-0.4, 1, 0.65]} area={enSelva ? 8 : 5} centro={[enSelva ? 30 : 0, 0.8, 0]} amb={1.0} sol={0.6} />
      {!enSelva && <Sala cortina rama={r(t, ev.ramas - 0.4, 0.4)} />}
      {enSelva && <Selva />}
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.6 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={[brazo.x, brazo.y - 0.7 * SP * 1.0, brazo.z]} rotation={[0, giro, 0]} scale={SP * 0.8}>
            <Perezoso t={t} colgado={1} />
          </group>
        </>
      )}
      {!conTio && !enSelva && (
        <group position={pos} rotation={[0, colgado ? 0 : 0.15, 0]} scale={SP}>
          <Perezoso t={t} colgado={colgado} panza={panza} tiembla={tiembla} />
        </group>
      )}
      {enSelva && (
        <group position={[30, 2.4 - 0.7 * SP * 1.6, 0.05]} scale={SP * 1.0}>
          <Perezoso t={t} colgado={1} />
        </group>
      )}
      {/* plátano */}
      {!conTio && t < ev.es1 && (
        <group position={[0.75, 0.37, 0.1]}>
          <P geo={cil(0.14, 0.12, 0.03, 18)} color="#f4f1ea" position={[0, 0.015, 0]} />
          <P geo={G('platano', () => new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI * 0.8))} color="#ffd23a" position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0.6]} />
        </group>
      )}
      {/* calefactor */}
      {t > ev.calor - 0.6 && t < ev.ahora + 0.2 && (
        <group position={[-0.35, 0, 0.05]}>
          <P geo={caja(0.35, 0.5, 0.15)} color="#e0453a" position={[0, 0.25, 0]} />
          <P geo={caja(0.28, 0.35, 0.02)} color="#ff9a3a" position={[0, 0.27, 0.08]} linea={0} />
          <Halo pos={[0, 0.3, 0.25]} o={0.45} escala={0.5} color="#ff8a3a" />
        </group>
      )}
      {tiembla > 0.01 &&
        Array.from({length: 12}, (_, i) => {
          const y = 1.8 - (((t - ev.temblando) * 0.15 + rnd(i)) % 1) * 1.1;
          return <Sprite key={i} tex={texCopo()} pos={[pos[0] - 0.5 + rnd(i + 2) * 1.0, y, pos[2] + 0.4 + rnd(i + 4) * 0.4]} escala={[0.05, 0.05]} o={tiembla} rot={t + i} />;
        })}
    </>
  );
};

// ---------- capa 2D ----------
const Estomago: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.vaca - 0.3, ev.comida - 0.3, 0.3);
  if (o <= 0) return null;
  const cams = [
    [-120, -40, 80],
    [40, -70, 70],
    [110, 40, 65],
    [-20, 80, 75],
  ];
  const fer = r(t, ev.fermenta - 0.3, 0.4);
  return (
    <div style={{position: 'absolute', left: 540 - 260, top: 560, opacity: o}}>
      <svg width={520} height={420} viewBox="-260 -210 520 420">
        <path d="M-200 -40 C-200 -170 200 -170 200 0 C200 150 -40 190 -120 140 C-180 100 -200 60 -200 -40Z" fill="#f2a39b" stroke="#16171c" strokeWidth={10} />
        {cams.map(([x, y, rr], i) => (
          <circle key={i} cx={x} cy={y} r={rr * (i < (t - ev.partes + 0.5) * 3 ? 1 : 0.0001)} fill={fer > 0 && i === 3 ? '#c8d46a' : '#e98b84'} stroke="#16171c" strokeWidth={6} />
        ))}
        {Array.from({length: 8}, (_, i) => {
          const u = ((t - ev.hojas) * 0.12 + i / 8) % 1;
          const k = Math.floor(u * 4);
          const [x, y] = cams[Math.min(3, k)];
          return <ellipse key={i} cx={x + Math.sin(i * 2) * 25} cy={y + Math.cos(i * 3) * 20} rx={14} ry={7} fill="#3fa548" stroke="#16171c" strokeWidth={3} transform={`rotate(${i * 40} ${x} ${y})`} />;
        })}
        {fer > 0 &&
          Array.from({length: 6}, (_, i) => {
            const ph = (t * 0.8 + i / 6) % 1;
            return <circle key={'b' + i} cx={-40 + i * 25} cy={60 - ph * 120} r={8 + (i % 3) * 3} fill="#fff8c4" stroke="#16171c" strokeWidth={3} opacity={1 - ph} />;
          })}
      </svg>
      <div style={{textAlign: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 50, color: '#16171c', WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill', marginTop: -20}}>estómago de 4 partes</div>
    </div>
  );
};

Object.assign(ICONOS, {
  perezoso: (
    <g>
      <circle cx={50} cy={50} r={30} fill={PELO} stroke="#16171c" strokeWidth={4} />
      <ellipse cx={50} cy={54} rx={22} ry={18} fill={CARA} />
      <ellipse cx={40} cy={50} rx={8} ry={4} fill="#3a2e22" transform="rotate(20 40 50)" />
      <ellipse cx={60} cy={50} rx={8} ry={4} fill="#3a2e22" transform="rotate(-20 60 50)" />
      <path d="M42 62 C46 66 54 66 58 62" fill="none" stroke="#16171c" strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  lento: (
    <g>
      <circle cx={50} cy={50} r={30} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <path d="M50 50 L50 30 M50 50 L60 56" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
      <text x={50} y={92} textAnchor="middle" fontSize={14} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        x0.1
      </text>
    </g>
  ),
  garras: (
    <g>
      {[30, 50, 70].map((x) => (
        <path key={x} d={`M${x} 20 C${x + 6} 40 ${x + 6} 60 ${x - 8} 82`} fill="none" stroke="#2a241c" strokeWidth={8} strokeLinecap="round" />
      ))}
    </g>
  ),
  sillon: (
    <g>
      <rect x={14} y={44} width={72} height={24} rx={4} fill="#4f7fd0" stroke="#16171c" strokeWidth={4} />
      <rect x={14} y={28} width={72} height={18} rx={4} fill="#3f6fc0" stroke="#16171c" strokeWidth={4} />
      <path d="M20 68 L20 78 M80 68 L80 78" stroke="#16171c" strokeWidth={5} />
    </g>
  ),
  platano: <path d="M20 40 C30 74 70 82 86 56 C70 66 40 62 28 36Z" fill="#ffd23a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />,
  vaca: (
    <g>
      <rect x={18} y={34} width={58} height={34} rx={12} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <circle cx={36} cy={46} r={7} fill="#16171c" />
      <circle cx={60} cy={56} r={6} fill="#16171c" />
      <rect x={72} y={30} width={18} height={20} rx={6} fill="#f2b48c" stroke="#16171c" strokeWidth={3} />
      <path d="M26 68 L26 80 M66 68 L66 80" stroke="#16171c" strokeWidth={5} />
    </g>
  ),
  colgado: (
    <g>
      <path d="M10 20 L90 20" stroke="#7a5232" strokeWidth={8} strokeLinecap="round" />
      <path d="M36 20 L40 46 M64 20 L60 46" stroke={PELO} strokeWidth={8} strokeLinecap="round" />
      <ellipse cx={50} cy={60} rx={18} ry={20} fill={PELO} stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  pulmones: (
    <g>
      <path d="M46 26 C30 24 18 50 22 72 C26 82 40 80 46 72Z" fill="#f2a3b5" stroke="#16171c" strokeWidth={4} />
      <path d="M54 26 C70 24 82 50 78 72 C74 82 60 80 54 72Z" fill="#f2a3b5" stroke="#16171c" strokeWidth={4} />
      <path d="M50 14 L50 40" stroke="#16171c" strokeWidth={5} />
    </g>
  ),
  ilegal: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#fff" stroke="#e0453a" strokeWidth={8} />
      <path d="M28 28 L72 72" stroke="#e0453a" strokeWidth={8} />
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.costa - 0.05, 'hoja', 'Costa Rica'],
  [ev.lenta - 0.1, 'lento', 'cámara lenta'],
  [ev.unas - 0.05, 'garras', 'uñas larguísimas'],
  [ev.perezoso - 0.05, 'perezoso', 'perezoso', 'ok', ev.perezoso + 0.2],
  [ev.sillon - 0.05, 'sillon', 'el sillón'],
  [ev.panza - 0.05, 'enfermo', 'panza hinchada', 'no', ev.panza + 0.3],
  [ev.vaca - 0.05, 'vaca', 'como una vaca'],
  [ev.fermenta - 0.05, 'platano', 'el plátano fermenta', 'no', ev.enferma],
  [ev.cuelga - 0.05, 'colgado', 'se cuelga'],
  [ev.organos - 0.05, 'pulmones', 'órganos pegados'],
  [ev.ramas - 0.05, 'rama', 'ramas', 'ok', ev.casa],
  [ev.semana - 0.05, 'calendario', 'una semana'],
  [ev.baja - 0.05, 'popo', 'baja al suelo'],
  [ev.temblando - 0.05, 'copo', 'tiembla'],
  [ev.calor - 0.05, 'sol', 'calor siempre', 'ok', ev.calor + 0.3],
  [ev.ilegal - 0.05, 'ilegal', 'ilegal', 'no', ev.ilegal + 0.2],
  [ev.lugar - 0.05, 'hoja', 'la selva', 'ok', ev.selva2],
];
const DER: Ic[] = [
  [ev.peluche - 0.05, 'perezoso', 'peluche'],
  [ev.sonrisa - 0.05, 'feliz', 'sonrisa eterna'],
  [ev.felicidades + 0.3, '', ''],
  [ev.platano - 0.05, 'platano', 'plátano', 'ok', ev.listo],
  [ev.hojas - 0.05, 'hoja', 'come hojas'],
  [ev.semanas - 0.05, 'calendario', 'semanas en digerir'],
  [ev.comida - 0.1, 'hoja', 'hojas de su selva', 'ok', ev.comida + 0.3],
  [ev.abajo - 0.05, 'colgado', 'boca abajo'],
  [ev.pulmones - 0.05, 'pulmones', 'no aplasta pulmones', 'ok', ev.pulmones + 0.2],
  [ev.bano - 0.05, 'popo', 'no va al baño'],
  [ev.popo - 0.05, 'popo', '1 vez por semana'],
  [ev.frio - 0.05, 'termometro', 'cuerpo más frío'],
  [ev.mueren - 0.05, 'calavera', 'mueren en el camino', 'no', ev.camino],
];

const ROJAS = new Set(['costa', 'rica', 'peluche', 'lenta', 'sonrisa', 'eterna', 'uñas', 'larguísimas', 'felicidades', 'perezoso', 'sillón', 'plátano', 'listo', 'panza', 'hinchada', 'hojas', 'estómago', 'vaca', 'partes', 'semanas', 'fermenta', 'enferma', 'selva', 'cortina', 'abajo', 'colgado', 'órganos', 'costillas', 'pulmones', 'ramas', 'casa', 'semana', 'baño', 'popó', 'suelo', 'temblando', 'frío', 'calor', 'ilegal', 'mueren', 'camino']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const PerezosoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const enSelva = t > ev.lugar - 0.3;
  return (
    <AbsoluteFill style={{background: enSelva ? 'linear-gradient(#bfe3c7, #eef6e8 60%)' : '#e8e0c8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.03, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#7fb6ff', mixBlendMode: 'multiply', opacity: 0.25 * ventana(t, ev.temblando - 0.3, ev.calor, 0.4)}} />
      <div style={{position: 'absolute', inset: 0, background: '#ff9a3a', mixBlendMode: 'multiply', opacity: 0.18 * ventana(t, ev.calor - 0.3, ev.ahora, 0.4)}} />
      <Estomago t={t} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="1 vez por semana" o={ventana(t, ev.popo - 0.2, ev.baja - 0.2, 0.25)} y={420} size={92} fuente={FUENTE} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.ilegal - 0.1} texto="ILEGAL" sub="en casi todo el mundo" />
      <Audio src={staticFile('perezoso/voz.wav')} />
      <Audio src={staticFile('perezoso/musica.wav')} />
    </AbsoluteFill>
  );
};
