import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/huron.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, cil, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Confeti, Halo, ICONOS, Ic, Ranura, Sello, Sprite, Tio, crearSubtitulo, texEstrella, texOndas} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_HURON = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  espana: T('españa'),
  largo: T('largo'),
  media: T('media'),
  antifaz: T('antifaz'),
  moverse: T('moverse…'),
  felicidades: T('felicidades'),
  huron: T('hurón', 1),
  dejas: T('dejas'),
  croquetas: T('croquetas', 1),
  listo: T('listo'),
  pero1: T('pero', 1),
  llaves: T('llaves'),
  calcetin: T('calcetín'),
  control: T('control'),
  es1: T('es', 1),
  esconden: T('esconden'),
  rincon: T('rincón'),
  escondite: T('escondite'),
  busca: T('busca'),
  tesoro: T('tesoro'),
  pero2: T('pero', 2),
  oler: T('oler'),
  glandulas: T('glándulas'),
  almizcle: T('almizcle'),
  cama: T('cama'),
  banas: T('bañas'),
  huele: T('huele'),
  pero4: T('pero', 4),
  saltando: T('saltando'),
  chocando: T('chocando'),
  loco: T('loco:'),
  baile: T('baile'),
  feliz1: T('feliz', 1),
  pero5: T('pero', 5),
  mal: T('mal'),
  carne: T('carne'),
  intestino: T('intestino'),
  horas1: T('horas', 1),
  veces: T('veces'),
  comida: T('comida', 2),
  pero6: T('pero', 6),
  duerme: T('duerme…'),
  despierta: T('despierta'),
  d18: T('18'),
  calor: T('calor:'),
  suda: T('suda'),
  morir: T('morir'),
  ahora: T('ahora'),
  feliz2: T('feliz', 2),
  ladron: T('ladrón'),
  oloroso: T('oloroso'),
  bailarin: T('bailarín'),
};

const PELAJE = '#8a6a4a';
const CREMA = '#f3e6cc';
const MASCARA = '#3a2a20';

// ---------- hurón ----------
const geoCuerpo = (onda: number) =>
  G(`hurC|${onda.toFixed(2)}`, () => {
    const pts = Array.from({length: 8}, (_, i) => {
      const x = lerp(0.55, -0.7, i / 7);
      return new THREE.Vector3(x, Math.sin(i * 0.9) * 0.03 * (1 + onda * 3) + 0.0, Math.sin(i * 1.1 + onda * 3) * 0.04 * onda);
    });
    const g = tuboAhusado(pts, (u) => 0.13 * Math.sin(Math.PI * (0.12 + u * 0.82)) + 0.02, 50, 16);
    const p = g.getAttribute('position');
    const col: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const x = p.getX(i);
      c.set(y < -0.04 ? CREMA : x > 0.35 ? '#a7896a' : PELAJE);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  });
const Huron: React.FC<{t: number; onda?: number; boca?: number; anda?: number; duerme?: number; carga?: string | null; colgando?: number}> = ({t, onda = 0, boca = 0, anda = 0, duerme = 0, carga = null}) => {
  const o = Math.round(onda * 10) / 10;
  return (
    <group>
      <P geo={geoCuerpo(o)} vc color="#ffffff" linea={0} silueta={2} />
      {/* cola */}
      <P geo={G('hurCola', () => tuboAhusado([new THREE.Vector3(-0.66, 0.0, 0), new THREE.Vector3(-0.85, 0.04, 0), new THREE.Vector3(-1.05, 0.02, 0)], (u) => lerp(0.05, 0.02, u), 20, 10))} color={MASCARA} position={[0, 0, 0]} rotation={[0, Math.sin(t * 4) * 0.2, 0]} linea={0} silueta={1.4} />
      {/* cabeza */}
      <group position={[0.68, 0.04, 0]} rotation={[0, 0, duerme ? -0.2 : 0]}>
        <P geo={esf(0.13, 22)} color={CREMA} scale={[1.25, 0.95, 1]} linea={0} silueta={1.8} />
        <P geo={esf(0.1, 16)} color={MASCARA} position={[0.04, 0.03, 0]} scale={[0.7, 0.45, 1.15]} linea={0} silueta={0} />
        <P geo={G('hurHocico', () => new THREE.ConeGeometry(0.07, 0.14, 12))} color={CREMA} position={[0.17, -0.01, 0]} rotation={[0, 0, -Math.PI / 2]} linea={0} silueta={1.4} />
        <P geo={esf(0.025, 8)} color="#e88a9a" position={[0.245, -0.01, 0]} linea={0} silueta={0.8} />
        {[-1, 1].map((s) => (
          <group key={s}>
            {duerme > 0.5 ? (
              <P geo={caja(0.04, 0.008, 0.01)} color="#111" position={[0.08, 0.04, s * 0.11]} linea={0} silueta={0} />
            ) : (
              <>
                <P geo={esf(0.024, 10)} color="#111" position={[0.08, 0.04, s * 0.1]} linea={0} silueta={0.8} />
                <P geo={esf(0.008, 6)} color="#fff" position={[0.09, 0.05, s * 0.115]} linea={0} silueta={0} sombra={false} />
              </>
            )}
            <P geo={esf(0.04, 10)} color={CREMA} position={[-0.04, 0.1, s * 0.08]} scale={[0.6, 1, 1]} linea={0} silueta={1} />
          </group>
        ))}
        {boca > 0.05 && <P geo={esf(0.04, 10)} color="#7a2c3c" position={[0.19, -0.06, 0]} scale={[1, boca, 1]} linea={0} silueta={0} />}
        {carga && (
          <group position={[0.24, -0.06, 0]}>
            {carga === 'llaves' && (
              <>
                <P geo={G('llaveAro', () => new THREE.TorusGeometry(0.03, 0.008, 6, 14))} color="#c9a53a" linea={0} silueta={1} />
                <P geo={caja(0.08, 0.02, 0.01)} color="#c9a53a" position={[0.05, -0.02, 0]} linea={0} silueta={1} />
              </>
            )}
            {carga === 'calcetin' && <P geo={cil(0.03, 0.03, 0.18, 10)} color="#e0453a" position={[0, -0.08, 0]} linea={0} silueta={1.2} />}
            {carga === 'control' && <P geo={caja(0.05, 0.02, 0.15)} color="#2a2b31" linea={0} silueta={1.2} />}
          </group>
        )}
      </group>
      {/* patas */}
      {[[0.38, 1, 0], [0.38, -1, Math.PI], [-0.45, 1, Math.PI], [-0.45, -1, 0]].map(([x, s, f], i) => (
        <P key={i} geo={cil(0.035, 0.03, 0.12, 8)} color={MASCARA} position={[x + Math.sin(t * 14 + f) * 0.04 * anda, -0.12, s * 0.08]} linea={0} silueta={1.2} />
      ))}
    </group>
  );
};

// ---------- sala ----------
const Sala: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#c99462" />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#dde8c8" position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    <P geo={caja(20, 0.14, 0.24)} color="#f4f1ea" position={[0, 0.07, -1.48]} linea={0} />
    {/* sillón con hueco abajo */}
    <group position={[-0.4, 0, -0.9]}>
      {[-0.82, 0.82].map((x) => [-0.3, 0.3].map((z) => <P key={`${x}${z}`} geo={cil(0.03, 0.03, 0.14, 8)} color="#3a2a20" position={[x, 0.07, z]} linea={0} />))}
      <P geo={caja(1.8, 0.3, 0.8)} color="#e07a3a" position={[0, 0.29, 0]} />
      <P geo={caja(1.8, 0.55, 0.2)} color="#e07a3a" position={[0, 0.7, -0.32]} />
      <P geo={caja(0.2, 0.3, 0.8)} color="#c8642a" position={[-0.9, 0.55, 0]} />
      <P geo={caja(0.2, 0.3, 0.8)} color="#c8642a" position={[0.9, 0.55, 0]} />
      <P geo={caja(1.6, 0.12, 0.62)} color="#f09a5a" position={[0, 0.5, 0.05]} />
    </group>
    {/* mesa de tele */}
    <P geo={caja(1.0, 0.45, 0.4)} color="#8a6a4a" position={[1.5, 0.225, -1.2]} />
    <P geo={caja(0.9, 0.55, 0.06)} color="#2a2b31" position={[1.5, 0.75, -1.25]} />
  </group>
);

const Tesoro: React.FC<{n: number}> = ({n}) => (
  <group>
    {n > 0 && (
      <group position={[0, 0.01, 0]}>
        <P geo={G('llaveAro', () => new THREE.TorusGeometry(0.03, 0.008, 6, 14))} color="#c9a53a" rotation={[Math.PI / 2, 0, 0]} linea={0} silueta={1} />
        <P geo={caja(0.08, 0.01, 0.02)} color="#c9a53a" position={[0.05, 0, 0]} linea={0} silueta={1} />
      </group>
    )}
    {n > 1 && <P geo={cil(0.03, 0.03, 0.18, 10)} color="#e0453a" position={[-0.15, 0.03, 0.05]} rotation={[0, 0.5, Math.PI / 2]} linea={0} silueta={1.2} />}
    {n > 2 && <P geo={caja(0.05, 0.02, 0.15)} color="#2a2b31" position={[0.12, 0.012, 0.1]} rotation={[0, 0.8, 0]} linea={0} silueta={1.2} />}
    {n > 3 && (
      <>
        <P geo={esf(0.05, 12)} color="#3fae4a" position={[-0.05, 0.05, -0.12]} linea={0} silueta={1.2} />
        <P geo={caja(0.1, 0.03, 0.06)} color="#2f6fe0" position={[0.18, 0.015, -0.08]} rotation={[0, 0.4, 0]} linea={0} silueta={1.2} />
        <P geo={cil(0.02, 0.02, 0.12, 8)} color="#ffd23a" position={[0.0, 0.02, 0.18]} rotation={[0, 1.2, Math.PI / 2]} linea={0} silueta={1} />
      </>
    )}
  </group>
);

const Hamaca: React.FC = () => (
  <group>
    <P geo={caja(0.04, 0.9, 0.04)} color="#2a2b31" position={[-0.35, 0.45, 0]} />
    <P geo={caja(0.04, 0.9, 0.04)} color="#2a2b31" position={[0.35, 0.45, 0]} />
    <P geo={G('hamaca', () => new THREE.CylinderGeometry(0.3, 0.3, 0.7, 20, 1, true, Math.PI, Math.PI))} color="#7fb6ff" position={[0, 0.98, 0]} rotation={[0, 0, Math.PI / 2]} doble linea={1.2} silueta={0} umbral={10} />
  </group>
);

// ---------- escena ----------
const MESA_TIO = -1.3;
const SH = 0.42;
const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.dejas - 0.35;
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.2, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.2, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.dejas - 0.35, 0.3);
  const mano = V(tioX + 0.62 * Math.sin(giro), 1.3, 0.15 + 0.62 * Math.cos(giro));
  // recorrido por el piso
  const sofaFrente: [number, number, number] = [-0.4, 0.13 * SH + 0.06, -0.2];
  let pos: [number, number, number] = [0.3, 0.06, 0.4];
  let ry = 0.6;
  let anda = 0;
  let carga: string | null = null;
  if (t > ev.pero1 - 0.2 && t < ev.busca - 0.3) {
    // lleva cosas de la mesa de tele al sillón
    const ciclo = ((t - ev.pero1 + 0.2) / 2.2) % 1;
    const ida = ciclo < 0.5;
    const u = ida ? ciclo * 2 : (ciclo - 0.5) * 2;
    const A = new THREE.Vector3(1.2, 0.06, -0.6);
    const B = new THREE.Vector3(-0.4, 0.06, -0.35);
    const p = ida ? A.clone().lerp(B, u) : B.clone().lerp(A, u);
    pos = [p.x, p.y, p.z];
    ry = ida ? Math.PI - 0.15 : -0.15;
    anda = 1;
    const k = Math.floor((t - ev.pero1 + 0.2) / 2.2);
    carga = ida ? ['llaves', 'calcetin', 'control', 'llaves', 'calcetin'][k % 5] : null;
  }
  if (t >= ev.busca - 0.3 && t < ev.pero2) pos = [0.3, 0.06, 0.3];
  const baila = t > ev.saltando - 0.3 && t < ev.pero5 - 0.1;
  if (baila) {
    const u = (t - ev.saltando) * 1.6;
    pos = [0.2 + Math.sin(u) * 0.6, 0.06 + Math.abs(Math.sin(u * 4)) * 0.12, 0.3 + Math.cos(u * 0.7) * 0.2];
    ry = Math.PI / 2 + Math.sin(u * 4) * 0.5;
    anda = 1;
  }
  const duerme = t > ev.pero6 && t < ev.calor - 0.3;
  const HAM: [number, number, number] = [1.55, 0, -0.55];
  if (duerme) {
    pos = [HAM[0], 0.76, HAM[2]];
    ry = 0;
  }
  const onda = conTio ? 0.6 + 0.4 * Math.sin(t * 6) : baila ? 1 : anda ? 0.4 : 0.1;
  const boca = baila ? 0.8 : t > ev.carne - 0.2 && t < ev.comida ? Math.max(0, Math.sin(t * 8)) : 0;
  const stash = t < ev.busca - 0.3 ? 0 : 4;

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.2], [-1.4, 1.2, 0], 42],
      [ev.largo - 0.4, [mano.x + 0.25, mano.y - 0.2, mano.z + 1.6], [mano.x, mano.y - 0.35, mano.z], 36],
      [ev.antifaz - 0.3, [mano.x + 0.12, mano.y - 0.05, mano.z + 0.85], [mano.x, mano.y - 0.12, mano.z], 32],
      [ev.felicidades - 0.25, [-0.9, 1.75, 4.2], [-0.9, 1.2, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (t >= ev.busca - 0.3 && t < ev.pero2) {
    cam = {pos: V(-0.1, 0.22, 0.9), obj: V(-0.4, 0.08, -0.9), fov: 40};
  } else if (duerme) {
    cam = {pos: V(HAM[0] + 0.35, 1.95, HAM[2] + 1.55), obj: V(HAM[0], 0.82, HAM[2]), fov: 38};
  } else {
    const p = V(...pos);
    const cerca = ventana(t, ev.pero2 - 0.1, ev.pero4 - 0.1, 0.4) + ventana(t, ev.pero5 - 0.1, ev.pero6, 0.4) + ventana(t, ev.pero6, ev.ahora, 0.4);
    cam = {pos: V(lerp(0.7, p.x + 0.35, cerca), lerp(1.7, p.y + 0.6, cerca), lerp(3.6, p.z + 1.9, cerca)), obj: V(lerp(0.3, p.x, cerca), lerp(0.25, p.y + 0.05, cerca), lerp(-0.3, p.z, cerca)), fov: 40};
  }

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[-0.4, 1, 0.65]} area={5} centro={[0, 0.5, 0]} amb={1.0} sol={0.6} />
      <Sala />
      {!conTio && (
        <group position={HAM}>
          <Hamaca />
        </group>
      )}
      <group position={[-0.5, 0.0, -0.9]}>
        <Tesoro n={stash} />
      </group>
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={[mano.x, mano.y - 0.05, mano.z]} rotation={[0, giro + 0.4, -Math.PI / 2 + Math.sin(t * 5) * 0.15]} scale={SH * 0.75}>
            <group position={[-0.7, 0, 0]}>
              <Huron t={t} onda={onda} />
            </group>
          </group>
        </>
      )}
      {!conTio && (
        <group position={pos} rotation={[0, ry, 0]} scale={SH}>
          <group position={[0, 0.12, 0]}>
            <Huron t={t} onda={onda} anda={anda} boca={boca} duerme={duerme ? 1 : 0} carga={carga} />
          </group>
        </group>
      )}
      {/* platos */}
      {!conTio && (
        <group position={[0.75, 0, 0.55]}>
          <P geo={cil(0.12, 0.09, 0.05, 18)} color="#2f6fe0" position={[0, 0.025, 0]} />
          {Array.from({length: 7}, (_, i) =>
            t < ev.carne - 0.3 ? (
              <P key={i} geo={esf(0.02, 8)} color="#a26b35" position={[(rnd(i) - 0.5) * 0.12, 0.06, (rnd(i + 2) - 0.5) * 0.12]} linea={0} silueta={0.8} />
            ) : (
              <P key={i} geo={caja(0.035, 0.03, 0.035)} color="#d8535a" position={[(rnd(i) - 0.5) * 0.12, 0.065, (rnd(i + 2) - 0.5) * 0.12]} rotation={[i, i, 0]} linea={0} silueta={0.9} />
            ),
          )}
        </group>
      )}
      {/* olor */}
      {ventana(t, ev.oler - 0.4, ev.pero4 - 0.1, 0.3) > 0.01 &&
        [0, 1, 2].map((i) => {
          const ph = (t * 0.4 + i / 3) % 1;
          return <Sprite key={i} tex={texOndas()} pos={[pos[0] - 0.15 + i * 0.15, pos[1] + 0.3 + ph * 0.35, pos[2]]} escala={[0.09, 0.18]} o={Math.sin(ph * Math.PI)} />;
        })}
      {/* choques del baile */}
      {baila && t > ev.chocando - 0.2 && Math.sin((t - ev.saltando) * 6.4) > 0.85 && <Sprite tex={texEstrella()} pos={[pos[0] + 0.2, pos[1] + 0.2, pos[2]]} escala={[0.14, 0.14]} o={1} rot={t * 5} />}
      {/* calor */}
      {ventana(t, ev.calor - 0.3, ev.ahora, 0.3) > 0.01 && <Halo pos={[pos[0], pos[1] + 0.3, pos[2]]} o={0.4 * ventana(t, ev.calor - 0.3, ev.ahora, 0.3)} escala={0.8} color="#ff6a2a" />}
    </>
  );
};

// ---------- capa 2D ----------
const Intestino: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.intestino - 0.3, ev.comida - 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 140, top: 560, opacity: o, fontFamily: FUENTE}}>
      <svg width={800} height={300} viewBox="0 0 800 300">
        <rect x={10} y={10} width={780} height={280} rx={30} fill="#fff" stroke="#16171c" strokeWidth={8} />
        <text x={40} y={90} fontSize={42} fontWeight={900} fill="#16171c">
          hurón
        </text>
        <path d="M220 72 L430 72" stroke="#f2a39b" strokeWidth={30} strokeLinecap="round" />
        <text x={460} y={86} fontSize={40} fontWeight={900} fill="#e0453a">
          3–4 h
        </text>
        <text x={40} y={210} fontSize={42} fontWeight={900} fill="#16171c">
          perro
        </text>
        <path d="M220 196 C300 150 340 250 420 196 C500 150 540 250 620 196 L700 196" fill="none" stroke="#c9b08a" strokeWidth={30} strokeLinecap="round" />
      </svg>
    </div>
  );
};

Object.assign(ICONOS, {
  huron: (
    <g>
      <path d="M10 60 C20 46 50 44 70 50" stroke="#8a6a4a" strokeWidth={18} strokeLinecap="round" fill="none" />
      <circle cx={78} cy={50} r={13} fill="#f3e6cc" stroke="#16171c" strokeWidth={3} />
      <rect x={68} y={44} width={20} height={7} rx={3} fill="#3a2a20" />
      <circle cx={90} cy={52} r={3} fill="#e88a9a" />
    </g>
  ),
  antifaz: (
    <g>
      <path d="M12 46 C22 34 40 40 50 46 C60 40 78 34 88 46 C80 62 62 60 50 54 C38 60 20 62 12 46Z" fill="#3a2a20" stroke="#16171c" strokeWidth={3} />
      <circle cx={32} cy={48} r={5} fill="#fff" />
      <circle cx={68} cy={48} r={5} fill="#fff" />
    </g>
  ),
  llaves: (
    <g>
      <circle cx={36} cy={40} r={14} fill="none" stroke="#c9a53a" strokeWidth={7} />
      <path d="M46 50 L80 80 M66 66 L74 58 M72 72 L80 64" stroke="#c9a53a" strokeWidth={7} strokeLinecap="round" />
    </g>
  ),
  control: (
    <g>
      <rect x={36} y={14} width={28} height={72} rx={8} fill="#2a2b31" stroke="#16171c" strokeWidth={3} />
      <circle cx={50} cy={30} r={6} fill="#e0453a" />
      {[46, 58, 70].map((y) => (
        <rect key={y} x={42} y={y} width={16} height={6} rx={2} fill="#7b7f88" />
      ))}
    </g>
  ),
  tesoro: (
    <g>
      <path d="M16 46 L84 46 L80 84 L20 84Z" fill="#a26b35" stroke="#16171c" strokeWidth={4} />
      <path d="M16 46 C16 24 84 24 84 46Z" fill="#c98a4a" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={58} r={6} fill="#ffd23a" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  olor: (
    <g>
      {[30, 50, 70].map((x) => (
        <path key={x} d={`M${x} 84 C${x - 10} 70 ${x + 10} 56 ${x} 42 C${x - 10} 30 ${x + 6} 22 ${x} 14`} fill="none" stroke="#7fb84a" strokeWidth={6} strokeLinecap="round" />
      ))}
    </g>
  ),
  bano: (
    <g>
      <path d="M12 46 L88 46 L82 76 L18 76Z" fill="#fff" stroke="#16171c" strokeWidth={4} />
      {[[30, 40], [48, 34], [64, 40]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={8} fill="#cdeffa" stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  cama: (
    <g>
      <rect x={10} y={46} width={80} height={22} rx={6} fill="#7fb6ff" stroke="#16171c" strokeWidth={4} />
      <rect x={14} y={38} width={24} height={14} rx={5} fill="#fff" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  baile: (
    <g>
      <path d="M14 70 C24 40 34 40 44 70 C54 40 64 40 74 70" fill="none" stroke="#16171c" strokeWidth={5} strokeDasharray="6 6" />
      <path d="M70 30 L80 20 M80 34 L90 30" stroke="#e0453a" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  intestino: (
    <g>
      <path d="M20 40 L80 40" stroke="#f2a39b" strokeWidth={14} strokeLinecap="round" />
      <path d="M20 66 C36 56 46 76 60 66 C70 58 76 70 82 66" fill="none" stroke="#c9b08a" strokeWidth={10} strokeLinecap="round" />
    </g>
  ),
  reloj3: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <path d="M50 50 L50 28 M50 50 L66 50" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
      <text x={50} y={92} textAnchor="middle" fontSize={14} fontWeight={900} fontFamily={FUENTE} fill="#e0453a">
        3–4 h
      </text>
    </g>
  ),
  d18: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#2f6fe0" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={60} textAnchor="middle" fontSize={28} fontWeight={900} fontFamily={FUENTE} fill="#fff">
        18h
      </text>
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.espana - 0.05, 'hoja', 'España'],
  [ev.antifaz - 0.05, 'antifaz', 'antifaz'],
  [ev.huron - 0.05, 'huron', 'hurón', 'ok', ev.huron + 0.2],
  [ev.dejas - 0.05, 'casa', 'suelto en casa'],
  [ev.llaves - 0.05, 'llaves', 'las llaves', 'no', ev.llaves + 0.2],
  [ev.control - 0.05, 'control', 'el control', 'no', ev.control + 0.2],
  [ev.esconden - 0.05, 'tesoro', 'esconden comida'],
  [ev.tesoro - 0.15, 'tesoro', 'su tesoro', 'ok', ev.tesoro + 0.1],
  [ev.glandulas - 0.05, 'olor', 'glándulas'],
  [ev.cama - 0.05, 'cama', 'lavar su cama', 'ok', ev.cama + 0.3],
  [ev.saltando - 0.05, 'baile', 'salta de lado'],
  [ev.baile - 0.05, 'baile', 'baile de guerra', 'ok', ev.feliz1],
  [ev.carne - 0.05, 'carne', 'solo carne', 'ok', ev.carne + 0.3],
  [ev.horas1 - 0.3, 'reloj3', '3 a 4 horas'],
  [ev.duerme - 0.05, 'zzz', 'se duerme'],
  [ev.calor - 0.05, 'sol', 'cuidado con el calor'],
  [ev.morir - 0.15, 'termometro', '+30°: peligro', 'no', ev.morir],
  [ev.ladron - 0.05, 'llaves', 'ladrón'],
  [ev.bailarin - 0.05, 'baile', 'bailarín', 'ok', ev.bailarin + 0.2],
];
const DER: Ic[] = [
  [ev.largo - 0.05, 'huron', 'largo como media'],
  [ev.moverse - 0.05, 'baile', 'no para de moverse'],
  [ev.felicidades + 0.3, '', ''],
  [ev.croquetas - 0.05, 'plato', 'croquetas de perro', 'ok', ev.listo],
  [ev.calcetin - 0.05, 'calcetin', 'un calcetín', 'no', ev.calcetin + 0.2],
  [ev.escondite - 0.05, 'tesoro', 'su escondite'],
  [ev.oler - 0.05, 'olor', 'huele raro', 'no', ev.oler + 0.3],
  [ev.almizcle - 0.05, 'olor', 'almizcle'],
  [ev.banas - 0.05, 'bano', 'bañarlo mucho', 'no', ev.huele],
  [ev.chocando - 0.05, 'golpe', 'choca con todo'],
  [ev.feliz1 - 0.15, 'feliz', 'está feliz', 'ok', ev.feliz1 + 0.1],
  [ev.mal - 0.05, 'plato', 'croquetas de perro', 'no', ev.mal],
  [ev.intestino - 0.05, 'intestino', 'intestino cortito'],
  [ev.veces - 0.05, 'plato', 'muchas veces al día', 'ok', ev.comida],
  [ev.d18 - 0.05, 'd18', '18 horas'],
  [ev.suda - 0.05, 'baba', 'no suda', 'no', ev.suda + 0.2],
  [ev.oloroso - 0.05, 'olor', 'oloroso'],
];

const ROJAS = new Set(['españa', 'largo', 'media', 'antifaz', 'cara', 'moverse', 'felicidades', 'hurón', 'suelto', 'croquetas', 'perro', 'listo', 'llaves', 'calcetín', 'control', 'tele', 'esconden', 'comida', 'rincón', 'escondite', 'sillón', 'tesoro', 'oler', 'raro', 'glándulas', 'almizcle', 'cama', 'bañas', 'huele', 'saltando', 'lado', 'abierta', 'chocando', 'loco', 'baile', 'guerra', 'feliz', 'mal', 'carne', 'intestino', 'cortito', 'horas', 'veces', 'duerme', 'despierta', '18', 'calor', 'suda', '30', 'morir', 'ladrón', 'oloroso', 'bailarín']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const HuronVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: '#dde8c8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.02, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#9ab84a', mixBlendMode: 'multiply', opacity: 0.14 * ventana(t, ev.oler - 0.3, ev.pero4 - 0.1, 0.4)}} />
      <div style={{position: 'absolute', inset: 0, background: '#1f2f70', mixBlendMode: 'multiply', opacity: 0.35 * ventana(t, ev.duerme - 0.3, ev.calor - 0.3, 0.4)}} />
      <div style={{position: 'absolute', inset: 0, background: '#ff9a3a', mixBlendMode: 'multiply', opacity: 0.2 * ventana(t, ev.calor - 0.3, ev.ahora, 0.4)}} />
      <Intestino t={t} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="18 horas" color="#2f6fe0" o={ventana(t, ev.d18 - 0.2, ev.calor - 0.3, 0.25)} y={420} size={140} fuente={FUENTE} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.bailarin - 0.1} texto="LADRÓN" sub="oloroso y bailarín" color="#2f6fe0" />
      <Audio src={staticFile('huron/voz.wav')} />
      <Audio src={staticFile('huron/musica.wav')} />
    </AbsoluteFill>
  );
};
