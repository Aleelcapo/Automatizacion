import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/petauro.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, cil, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Confeti, ICONOS, Ic, Ranura, Sello, Sprite, Tio, crearSubtitulo, texOndas} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_PETAURO = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  australia: T('australia'),
  ratoncito: T('ratoncito'),
  ojos: T('ojos'),
  raya: T('raya'),
  piel: T('piel', 1),
  capa: T('capa…'),
  felicidades: T('felicidades'),
  petauro: T('petauro', 1),
  metes: T('metes'),
  jaula: T('jaula', 1),
  semillas: T('semillas', 1),
  listo: T('listo'),
  pero1: T('pero', 1),
  noche: T('noche'),
  ladrar: T('ladrar'),
  es1: T('es', 1),
  grupo: T('grupo'),
  ladrido: T('ladrido'),
  solo: T('solo'),
  deprime: T('deprime'),
  pelo: T('pelo'),
  otro: T('otro'),
  familia: T('familia'),
  pero2: T('pero', 2),
  sacas: T('sacas'),
  lanza: T('lanza'),
  volando: T('volando'),
  paracaidas: T('paracaídas'),
  planea: T('planea', 1),
  arbol: T('árbol', 1),
  cincuenta: T('50'),
  alta: T('alta'),
  cielo: T('cielo'),
  pero3: T('pero', 3),
  savia: T('savia'),
  nectar: T('néctar'),
  insectos: T('insectos'),
  azucar2: T('azúcar', 2),
  comida: T('comida'),
  pero4: T('pero', 4),
  panza: T('panza', 1),
  marsupial: T('marsupial'),
  canguro: T('canguro:'),
  bolsita: T('bolsita'),
  ahora: T('ahora'),
  feliz: T('feliz'),
  bebes: T('bebés'),
};

const GRIS = '#9aa0aa';
const CREMA = '#f1ece2';
const OSC = '#3a3a42';

// ---------- petauro ----------
const geoMembrana = (abre: number) =>
  G(`petMem|${abre.toFixed(2)}`, () => {
    const s = new THREE.Shape();
    const w = 0.1 + 0.22 * abre;
    s.moveTo(0.22, 0.06);
    s.quadraticCurveTo(0.05, w + 0.02, -0.2, w);
    s.lineTo(-0.24, 0.06);
    s.lineTo(0.22, 0.06);
    return new THREE.ShapeGeometry(s, 12);
  });
const Petauro: React.FC<{t: number; abre?: number; triste?: number; ladra?: number; bebe?: number; boca?: number}> = ({t, abre = 0, triste = 0, ladra = 0, bebe = 0}) => {
  const a = Math.round(abre * 10) / 10;
  return (
    <group>
      {/* cuerpo */}
      <P geo={esf(0.2, 22)} color={GRIS} scale={[1.35, 0.75, 0.85]} linea={0} silueta={1.8} />
      <P geo={esf(0.17, 18)} color={CREMA} position={[0.02, -0.06, 0]} scale={[1.3, 0.5, 0.8]} linea={0} silueta={0} />
      <P geo={caja(0.5, 0.02, 0.04)} color={OSC} position={[0, 0.15, 0]} linea={0} silueta={0} />
      {/* membranas (capa) */}
      {[-1, 1].map((s) => (
        <group key={s} rotation={[s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
          <P geo={geoMembrana(a)} color="#e2d6c4" doble linea={1.3} silueta={0} umbral={5} sombra={false} />
        </group>
      ))}
      {/* patas en las esquinas de la capa */}
      {[[0.22, 1], [0.22, -1], [-0.22, 1], [-0.22, -1]].map(([x, s], i) => (
        <P key={i} geo={cil(0.022, 0.018, 0.08, 8)} color="#e8c0c4" position={[x, -0.06 + abre * 0.03, s * (0.08 + 0.2 * abre)]} rotation={[0, 0, abre * 1.2]} linea={0} silueta={1} />
      ))}
      {/* cola esponjada */}
      <P geo={G('petCola', () => tuboAhusado([new THREE.Vector3(-0.24, 0, 0), new THREE.Vector3(-0.45, 0.02, 0), new THREE.Vector3(-0.65, 0.05, 0)], (u) => 0.05 + 0.02 * Math.sin(u * Math.PI), 20, 10))} color={OSC} rotation={[0, Math.sin(t * 3) * 0.2, 0]} linea={0} silueta={1.4} />
      {/* cabeza */}
      <group position={[0.28, 0.07, 0]} rotation={[0, 0, triste * -0.4]}>
        <P geo={esf(0.13, 20)} color={GRIS} linea={0} silueta={1.8} />
        <P geo={caja(0.16, 0.02, 0.03)} color={OSC} position={[0.02, 0.12, 0]} rotation={[0, 0, -0.3]} linea={0} silueta={0} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <P geo={esf(0.05, 14)} color="#0e0e12" position={[0.08, 0.03, s * 0.08]} linea={0} silueta={1.2} />
            <P geo={esf(0.014, 6)} color="#fff" position={[0.11, 0.05, s * 0.1]} linea={0} silueta={0} sombra={false} />
            <P geo={esf(0.06, 12)} color="#c9ccd4" position={[-0.03, 0.12, s * 0.09]} scale={[0.4, 1, 0.9]} linea={0} silueta={1.2} />
          </group>
        ))}
        <P geo={esf(0.02, 8)} color="#e88a9a" position={[0.14, -0.02, 0]} linea={0} silueta={0.6} />
        {ladra > 0.05 && <P geo={esf(0.03, 8)} color="#7a2c3c" position={[0.12, -0.05, 0]} scale={[1, ladra * 1.4, 1]} linea={0} silueta={0} />}
      </group>
      {/* cría en la bolsa */}
      {bebe > 0.01 && (
        <group position={[0.02, -0.1, 0.12]} scale={bebe}>
          <P geo={esf(0.06, 12)} color={CREMA} scale={[1.4, 0.8, 1]} linea={0} silueta={1.2} />
          <P geo={esf(0.04, 12)} color={GRIS} position={[0.02, 0.03 + Math.sin(t * 4) * 0.01, 0.03]} linea={0} silueta={1.2} />
          <P geo={esf(0.012, 6)} color="#0e0e12" position={[0.04, 0.04, 0.06]} linea={0} silueta={0} />
        </group>
      )}
    </group>
  );
};

// ---------- sala y bosque ----------
const Sala: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#b98a5e" />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#d9d2ea" position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    <P geo={caja(1.5, 1.4, 0.08)} color="#f4f1ea" position={[-1.3, 1.75, -1.48]} />
    <P geo={caja(1.3, 1.2, 0.1)} color="#2a3a70" position={[-1.3, 1.75, -1.46]} />
    <P geo={cil(0.025, 0.025, 2.4, 10)} color="#5a3e2a" position={[-1.3, 2.62, -1.3]} rotation={[0, 0, Math.PI / 2]} />
    <P geo={caja(0.5, 1.95, 0.06)} color="#3fae7a" position={[-2.25, 1.62, -1.3]} />
    <P geo={caja(0.5, 1.95, 0.06)} color="#3fae7a" position={[-0.35, 1.62, -1.3]} />
    <P geo={caja(1.8, 0.8, 0.7)} color="#8a6a4a" position={[0.6, 0.4, -0.9]} />
    <group position={[2.0, 0, -0.6]}>
      <P geo={caja(1.6, 0.42, 0.8)} color="#e0453a" position={[0, 0.21, 0]} />
      <P geo={caja(1.6, 0.55, 0.2)} color="#e0453a" position={[0, 0.65, -0.32]} />
    </group>
  </group>
);
const JW = 0.5;
const JaulaCaja: React.FC<{h: number}> = ({h}) => (
  <group>
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <P key={`${sx}${sz}`} geo={caja(0.02, h, 0.02)} color="#c3c7cf" position={[(sx * JW) / 2, h / 2, (sz * JW) / 2]} linea={0} silueta={1} />))}
    {Array.from({length: 9}, (_, i) => (
      <group key={i}>
        <P geo={caja(0.006, h, 0.006)} color="#c3c7cf" position={[-JW / 2 + (i * JW) / 8, h / 2, JW / 2]} linea={0} silueta={0.8} sombra={false} />
        <P geo={caja(0.006, h, 0.006)} color="#c3c7cf" position={[-JW / 2 + (i * JW) / 8, h / 2, -JW / 2]} linea={0} silueta={0.8} sombra={false} />
      </group>
    ))}
    <P geo={caja(JW + 0.04, 0.03, JW + 0.04)} color="#7b5ad6" position={[0, 0.015, 0]} />
    <P geo={caja(JW + 0.04, 0.02, JW + 0.04)} color="#7b5ad6" position={[0, h, 0]} />
    {h > 0.8 && [0.35, 0.75, 1.1].map((y, i) => <P key={i} geo={cil(0.015, 0.015, JW, 8)} color="#7a5232" position={[0, y, 0]} rotation={[0, i * 0.8, Math.PI / 2]} linea={0} silueta={1} />)}
  </group>
);
const BOSQUE = 30;
const Bosque: React.FC = () => (
  <group position={[BOSQUE, 0, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 30]} />
      <meshToonMaterial color="#3f7a3a" />
    </mesh>
    {[-4, 0, 4, -2, 2, 6, -6].map((x, i) => (
      <group key={i} position={[x, 0, i < 3 ? 0 : -3 - (i % 2)]}>
        <P geo={cil(0.2, 0.3, 6, 10)} color="#6b4a2b" position={[0, 3, 0]} />
        <P geo={esf(1.3, 14)} color={i % 2 ? '#2f6a3a' : '#3a8a48'} position={[0, 6.2, 0]} scale={[1.2, 0.8, 1.1]} linea={0} />
      </group>
    ))}
  </group>
);

// ---------- escena ----------
const MESA_TIO = -1.3;
const SPT = 0.32;
const JAULA: [number, number, number] = [0.6, 0.8, -0.9];
const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.metes - 0.35;
  const enBosque = t > ev.planea - 0.4 && t < ev.alta - 0.6;
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.2, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.15, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.metes - 0.35, 0.3);
  const mano = V(tioX + 0.62 * Math.sin(giro), 1.32, 0.15 + 0.62 * Math.cos(giro));
  const abreHook = ventana(t, ev.piel - 0.2, ev.felicidades, 0.3);
  const altaJ = t > ev.alta - 0.6 ? 1.3 : 0.45;
  // posición en jaula / vuelo
  const enJ: [number, number, number] = [JAULA[0] - 0.05, JAULA[1] + 0.07, JAULA[2] + 0.05];
  let pos: [number, number, number] = enJ;
  let ry = -0.5;
  let rz = 0;
  let abre = 0;
  if (t > ev.sacas - 0.2 && t < ev.planea - 0.4) {
    // desde la cortina hasta el sillón
    const A = V(-0.35, 2.4, -1.2);
    const B = V(1.25, 0.86, -0.6);
    const u = r(t, ev.lanza - 0.1, 1.6);
    const p = A.clone().lerp(B, u);
    p.y += Math.sin(u * Math.PI) * 0.25;
    pos = [p.x, p.y, p.z];
    ry = -0.15;
    rz = -0.25 * (u > 0 && u < 1 ? 1 : 0);
    abre = u > 0 && u < 1 ? 1 : u >= 1 ? ventana(t, ev.paracaidas - 0.5, ev.planea - 0.4, 0.3) : 0;
    if (u >= 1) pos = [B.x, B.y + 0.05, B.z];
  }
  if (enBosque) {
    const u = r(t, ev.planea - 0.3, ev.cincuenta + 0.6 - ev.planea);
    pos = [BOSQUE - 3.7 + u * 7.4, 4.8 - u * 2.6, 0.3];
    ry = 0;
    rz = -0.3;
    abre = 1;
  }
  if (t > ev.alta - 0.6) pos = [JAULA[0] - 0.05, JAULA[1] + 0.35 + 0.03, JAULA[2] + 0.05];
  if (t > ev.ahora - 0.2) pos = [JAULA[0] - 0.12, JAULA[1] + 0.75 + 0.03, JAULA[2] + 0.05];
  const triste = ventana(t, ev.solo - 0.2, ev.otro - 0.1, 0.3);
  const ladra = (t > ev.ladrar - 0.2 && t < ev.es1) || (t > ev.ladrido - 0.2 && t < ev.ladrido + 1.4) ? Math.max(0, Math.sin(t * 14)) : 0;
  const bebe = r(t, ev.panza - 0.5, 0.6);
  const amigo = t > ev.otro - 0.3 && (t < ev.pero2 || t > ev.ahora - 0.2);

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.2], [-1.4, 1.3, 0], 42],
      [ev.ratoncito - 0.4, [mano.x + 0.2, mano.y + 0.18, mano.z + 0.9], [mano.x, mano.y + 0.1, mano.z], 32],
      [ev.piel - 0.4, [mano.x + 0.05, mano.y + 0.6, mano.z + 0.75], [mano.x, mano.y + 0.08, mano.z], 34],
      [ev.felicidades - 0.25, [-0.9, 1.75, 4.2], [-0.9, 1.3, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (enBosque) {
    cam = {pos: V(pos[0] - 0.5, pos[1] + 1.5, 2.6), obj: V(pos[0] + 0.3, pos[1] - 0.1, 0.3), fov: 42};
  } else if (t > ev.sacas - 0.2 && t < ev.planea - 0.4) {
    cam = {pos: V(lerp(-0.2, 0.9, r(t, ev.lanza, 1.6)), 1.75, 2.4), obj: V(lerp(-0.3, 1.0, r(t, ev.lanza, 1.6)), lerp(2.0, 1.1, r(t, ev.lanza, 1.6)), -0.9), fov: 44};
  } else {
    const p = V(...pos);
    const ancho = t > ev.alta - 0.6 && t < ev.pero3 ? 1 : 0;
    cam = {pos: V(p.x + 0.3, p.y + 0.3 + ancho * 0.4, p.z + 1.3 + ancho * 1.0), obj: V(p.x, p.y + 0.05 + ancho * 0.25, p.z), fov: 38};
  }

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[-0.4, 1, 0.65]} area={enBosque ? 10 : 5} centro={[enBosque ? BOSQUE : 0, 0.8, 0]} amb={1.0} sol={0.6} />
      {!enBosque && <Sala />}
      {enBosque && <Bosque />}
      {!conTio && !enBosque && (
        <group position={JAULA}>
          <JaulaCaja h={altaJ} />
        </group>
      )}
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={[mano.x, mano.y + 0.05, mano.z]} rotation={[0, giro - Math.PI / 2 + 0.6, 0]} scale={SPT * 0.9}>
            <Petauro t={t} abre={abreHook} />
          </group>
        </>
      )}
      {!conTio && (
        <group position={pos} rotation={[0, ry, rz]} scale={enBosque ? 0.9 : t > ev.sacas - 0.2 && t < ev.planea - 0.4 ? SPT * 1.4 : SPT}>
          <Petauro t={t} abre={abre} triste={triste} ladra={ladra} bebe={bebe} />
        </group>
      )}
      {!conTio && !enBosque && amigo && (
        <group position={[pos[0] + 0.22, pos[1], pos[2] - 0.1]} rotation={[0, Math.PI + 0.4, 0]} scale={SPT * 0.95}>
          <Petauro t={t + 1} />
        </group>
      )}
      {/* semillas en la jaula */}
      {!conTio && t < ev.savia - 0.3 && (
        <group position={[JAULA[0] + 0.12, JAULA[1] + 0.03, JAULA[2] + 0.1]}>
          <P geo={cil(0.06, 0.05, 0.03, 14)} color="#f4f1ea" position={[0, 0.015, 0]} />
          {[0, 1, 2, 3].map((i) => (
            <P key={i} geo={esf(0.012, 6)} color="#c9a86a" position={[(rnd(i) - 0.5) * 0.06, 0.035, (rnd(i + 2) - 0.5) * 0.06]} linea={0} silueta={0.6} />
          ))}
        </group>
      )}
      {/* comida buena */}
      {!conTio && t > ev.savia - 0.3 && t < ev.pero4 && (
        <group position={[JAULA[0] + 0.12, JAULA[1] + 0.38, JAULA[2] + 0.1]}>
          <P geo={cil(0.06, 0.05, 0.03, 14)} color="#f4f1ea" position={[0, 0.015, 0]} />
          <P geo={esf(0.03, 10)} color="#ff6fa3" position={[-0.02, 0.05, 0]} linea={0} silueta={1} />
          <P geo={esf(0.025, 10)} color="#ffd23a" position={[0.025, 0.045, 0.01]} linea={0} silueta={1} />
          <P geo={cil(0.006, 0.006, 0.04, 6)} color="#e0c070" position={[0.0, 0.04, 0.03]} rotation={[0, 0, Math.PI / 2]} linea={0} silueta={0.8} />
        </group>
      )}
      {ladra > 0.1 && [0, 1].map((i) => <Sprite key={i} tex={texOndas()} pos={[pos[0] + 0.15 + i * 0.07, pos[1] + 0.12, pos[2] + 0.05]} escala={[0.05, 0.1]} o={ladra} rot={-1.2} />)}
      {/* pelo que se cae */}
      {ventana(t, ev.pelo - 0.4, ev.otro, 0.2) > 0.01 &&
        Array.from({length: 6}, (_, i) => <P key={i} geo={esf(0.008, 6)} color={GRIS} position={[pos[0] + (rnd(i) - 0.5) * 0.15, pos[1] - (((t - ev.pelo) * 0.2 + rnd(i + 3)) % 0.15), pos[2] + 0.05]} linea={0} silueta={0.6} sombra={false} />)}
    </>
  );
};

// ---------- capa 2D ----------
Object.assign(ICONOS, {
  petauro: (
    <g>
      <path d="M14 56 L50 40 L86 56 L50 66Z" fill="#b7bcc6" stroke="#16171c" strokeWidth={3} />
      <ellipse cx={50} cy={52} rx={12} ry={16} fill="#9aa0aa" stroke="#16171c" strokeWidth={3} />
      <circle cx={44} cy={40} r={4} fill="#0e0e12" />
      <circle cx={56} cy={40} r={4} fill="#0e0e12" />
      <path d="M50 30 L50 66" stroke="#3a3a42" strokeWidth={3} />
    </g>
  ),
  ojosGrandes: (
    <g>
      <circle cx={34} cy={50} r={18} fill="#0e0e12" stroke="#16171c" strokeWidth={3} />
      <circle cx={66} cy={50} r={18} fill="#0e0e12" stroke="#16171c" strokeWidth={3} />
      <circle cx={40} cy={44} r={5} fill="#fff" />
      <circle cx={72} cy={44} r={5} fill="#fff" />
    </g>
  ),
  capa: <path d="M10 40 L50 30 L90 40 L80 70 L50 60 L20 70Z" fill="#b7bcc6" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />,
  perrito: (
    <g>
      <ellipse cx={48} cy={56} rx={22} ry={18} fill="#c98a4a" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={30} cy={44} rx={8} ry={14} fill="#8a5634" stroke="#16171c" strokeWidth={3} />
      <circle cx={56} cy={52} r={4} fill="#16171c" />
      <path d="M74 40 C82 44 82 52 74 56 M80 34 C92 42 92 54 80 62" fill="none" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  grupo: (
    <g>
      {[[30, 56], [50, 46], [70, 56]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={12} fill="#9aa0aa" stroke="#16171c" strokeWidth={3} />
          <circle cx={x - 4} cy={y - 2} r={2.5} fill="#0e0e12" />
          <circle cx={x + 4} cy={y - 2} r={2.5} fill="#0e0e12" />
        </g>
      ))}
    </g>
  ),
  triste: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#9aa0aa" stroke="#16171c" strokeWidth={4} />
      <circle cx={40} cy={44} r={4} fill="#16171c" />
      <circle cx={60} cy={44} r={4} fill="#16171c" />
      <path d="M38 66 C44 58 56 58 62 66" fill="none" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
      <path d="M40 50 L38 58" stroke="#5fc1ff" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  paracaidas: (
    <g>
      <path d="M14 46 C14 18 86 18 86 46Z" fill="#e0453a" stroke="#16171c" strokeWidth={4} />
      <path d="M14 46 L46 76 M86 46 L54 76 M50 46 L50 76" stroke="#16171c" strokeWidth={2} />
      <rect x={42} y={74} width={16} height={12} fill="#9aa0aa" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  arbol: (
    <g>
      <rect x={44} y={46} width={12} height={40} fill="#6b4a2b" stroke="#16171c" strokeWidth={3} />
      <circle cx={50} cy={36} r={24} fill="#3a8a48" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  savia: (
    <g>
      <rect x={20} y={10} width={30} height={80} fill="#6b4a2b" stroke="#16171c" strokeWidth={3} />
      <path d="M50 40 C60 44 62 56 56 64 C52 70 46 66 48 60Z" fill="#ffb020" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  flor: (
    <g>
      {Array.from({length: 6}, (_, k) => {
        const a = (k / 6) * Math.PI * 2;
        return <circle key={k} cx={50 + Math.cos(a) * 18} cy={50 + Math.sin(a) * 18} r={12} fill="#ff6fa3" stroke="#16171c" strokeWidth={3} />;
      })}
      <circle cx={50} cy={50} r={10} fill="#ffd23a" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  azucar: (
    <g>
      <rect x={26} y={30} width={48} height={48} rx={6} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <path d="M26 46 L74 46 M50 30 L50 78" stroke="#d8d8e0" strokeWidth={3} />
    </g>
  ),
  canguro: (
    <g>
      <path d="M30 86 C24 60 32 36 50 30 C60 24 70 28 70 36 C66 40 60 40 58 44 C66 54 66 72 56 86Z" fill="#c98a4a" stroke="#16171c" strokeWidth={4} />
      <path d="M44 62 C50 70 58 70 60 60" fill="#f3e6cc" stroke="#16171c" strokeWidth={3} />
      <circle cx={52} cy={60} r={5} fill="#c98a4a" stroke="#16171c" strokeWidth={2} />
    </g>
  ),
  bolsa: (
    <g>
      <path d="M22 40 C22 80 78 80 78 40" fill="#f3e6cc" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={40} r={12} fill="#9aa0aa" stroke="#16171c" strokeWidth={3} />
      <circle cx={46} cy={38} r={2.5} fill="#0e0e12" />
      <circle cx={54} cy={38} r={2.5} fill="#0e0e12" />
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.australia - 0.05, 'hoja', 'Australia'],
  [ev.ojos - 0.05, 'ojosGrandes', 'ojos enormes'],
  [ev.piel - 0.05, 'capa', 'piel como capa'],
  [ev.petauro - 0.05, 'petauro', 'petauro', 'ok', ev.petauro + 0.2],
  [ev.jaula - 0.05, 'jaula', 'jaula chiquita'],
  [ev.noche - 0.05, 'luna', 'de noche'],
  [ev.grupo - 0.05, 'grupo', 'vive en grupo'],
  [ev.solo - 0.05, 'triste', 'si está solo', 'no', ev.deprime],
  [ev.otro - 0.05, 'grupo', 'otro petauro', 'ok', ev.familia],
  [ev.lanza - 0.05, 'capa', 'se lanza'],
  [ev.planea - 0.05, 'arbol', 'de árbol en árbol'],
  [ev.alta - 0.05, 'jaulaLarga', 'jaula alta', 'ok', ev.alta + 0.3],
  [ev.savia - 0.05, 'savia', 'savia dulce'],
  [ev.insectos - 0.05, 'grillo', 'insectos'],
  [ev.panza - 0.05, 'bolsa', 'algo en la panza'],
  [ev.canguro - 0.05, 'canguro', 'como el canguro'],
  [ev.feliz - 0.15, 'petauro', 'petauro feliz', 'ok', ev.feliz + 0.1],
];
const DER: Ic[] = [
  [ev.raya - 0.05, 'antifaz', 'raya negra'],
  [ev.felicidades + 0.3, '', ''],
  [ev.semillas - 0.05, 'semillas', 'semillas', 'ok', ev.listo],
  [ev.ladrar - 0.05, 'perrito', 'ladra como perrito'],
  [ev.ladrido - 0.05, 'grito', 'llama a los suyos'],
  [ev.pelo - 0.05, 'triste', 'se arranca el pelo', 'no', ev.pelo + 0.2],
  [ev.familia - 0.15, 'corazon', 'su familia', 'ok', ev.familia + 0.1],
  [ev.volando - 0.1, 'paracaidas', 'volando'],
  [ev.cincuenta - 0.1, 'regla', 'hasta 50 metros'],
  [ev.cielo - 0.15, 'nube', 'su cielo', 'ok', ev.cielo + 0.1],
  [ev.pero3 + 0.2, 'semillas', 'no come semillas', 'no', ev.pero3 + 0.6],
  [ev.nectar - 0.05, 'flor', 'néctar'],
  [ev.azucar2 - 0.2, 'azucar', 'del azúcar', 'ok', ev.comida],
  [ev.marsupial - 0.05, 'bolsa', 'marsupial'],
  [ev.bolsita - 0.05, 'bolsa', 'bolsita en la panza', 'ok', ev.bolsita + 0.3],
  [ev.bebes - 0.15, 'bolsa', 'sus bebés'],
];
Object.assign(ICONOS, {
  nube: <path d="M24 70 C10 70 10 50 24 48 C22 34 42 28 50 38 C56 26 80 30 76 48 C90 48 90 70 76 70Z" fill="#bfe3f7" stroke="#16171c" strokeWidth={4} />,
});

const ROJAS = new Set(['australia', 'ratoncito', 'ojos', 'enormes', 'raya', 'negra', 'piel', 'capa', 'felicidades', 'petauro', 'azúcar', 'jaula', 'chiquita', 'semillas', 'listo', 'noche', 'ladrar', 'perrito', 'nocturno', 'grupo', 'ladrido', 'solo', 'deprime', 'pelo', 'familia', 'lanza', 'cortina', 'volando', 'paracaídas', 'planea', 'árbol', '50', 'metros', 'alta', 'espacio', 'cielo', 'savia', 'dulce', 'néctar', 'insectos', 'comida', 'panza', 'marsupial', 'canguro', 'crías', 'bolsita', 'feliz', 'bebés', 'bolsa']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const PetauroVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const enBosque = t > ev.planea - 0.4 && t < ev.alta - 0.6;
  const noche = ventana(t, ev.pero1 - 0.1, ev.otro, 0.3) + ventana(t, ev.sacas - 0.3, ev.planea - 0.4, 0.3);
  return (
    <AbsoluteFill style={{background: enBosque ? 'linear-gradient(#24305e, #4a5a8a 70%)' : '#d9d2ea'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.02, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#1f2f70', mixBlendMode: 'multiply', opacity: 0.45 * Math.min(1, noche)}} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="¡GUAU!" color="#e0453a" o={ventana(t, ev.ladrar - 0.1, ev.es1 - 0.1, 0.2)} y={430} size={140} fuente={FUENTE} />
      <Titulo texto="50 metros" o={ventana(t, ev.cincuenta - 0.1, ev.alta - 0.6, 0.25)} y={420} size={130} fuente={FUENTE} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.bebes - 0.1} texto="MARSUPIAL" sub="que planea" color="#7b5ad6" />
      <Audio src={staticFile('petauro/voz.wav')} />
      <Audio src={staticFile('petauro/musica.wav')} />
    </AbsoluteFill>
  );
};
