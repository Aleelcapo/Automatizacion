import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/guacamayo.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, canvasTex, cil, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Casa, Confeti, Halo, ICONOS, Ic, MADERA, Mesa, Pasto, Ranura, Sello, Sprite, Tio, crearSubtitulo, texEstrella, texOndas, texPasto} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_GUACAMAYO = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  brasil: T('brasil'),
  pajaro: T('pájaro'),
  enorme: T('enorme'),
  rojo: T('rojo'),
  azul: T('azul'),
  amarillo: T('amarillo'),
  cola: T('cola'),
  pico: T('pico', 1),
  abrelatas: T('abrelatas…'),
  felicidades: T('felicidades'),
  guacamayo: T('guacamayo', 1),
  metes: T('metes'),
  jaula: T('jaula', 1),
  semillas: T('semillas', 1),
  listo: T('listo'),
  pero1: T('pero', 1),
  seis: T('6'),
  despierta: T('despierta'),
  gritando: T('gritando'),
  es1: T('es', 1),
  selva: T('selva', 1),
  bandadas: T('bandadas'),
  amanecer: T('amanecer'),
  gritan: T('gritan'),
  solo: T('solo', 1),
  buscando: T('buscando'),
  hablarte: T('hablarte'),
  pero2: T('pero', 2),
  muerde: T('muerde'),
  jaula2: T('jaula', 2),
  cables: T('cables'),
  mesa: T('mesa'),
  pico2: T('pico', 2),
  crecer: T('crecer'),
  unas: T('uñas'),
  romper: T('romper'),
  madera: T('madera'),
  juguetes: T('juguetes'),
  pero3: T('pero', 3),
  semillas2: T('semillas', 2),
  grasa: T('grasa'),
  selva2: T('selva', 2),
  frutas: T('frutas', 1),
  nueces: T('nueces'),
  lame: T('lame'),
  tierra: T('tierra', 1),
  venenos: T('venenos'),
  frutas2: T('frutas', 2),
  verduras: T('verduras'),
  especial: T('especial'),
  aguacate: T('aguacate'),
  chocolate: T('chocolate:'),
  matar: T('matar'),
  pero4: T('pero', 4),
  importante: T('importante'),
  guacamayo2: T('guacamayo', 2),
  sesenta: T('60'),
  tio2: T('tío', 2),
  tu: T('tú'),
  ahora: T('ahora'),
  feliz: T('feliz'),
  hereden: T('hereden'),
  nietos: T('nietos'),
};

const ROJO = '#d8262a';
const AMARILLO = '#ffc51a';
const AZUL = '#1f6fd6';

// ---------- guacamayo ----------
const geoPicoSup = () =>
  G('guaPicoSup', () =>
    tuboAhusado([new THREE.Vector3(0.18, 0.02, 0), new THREE.Vector3(0.3, 0.03, 0), new THREE.Vector3(0.39, -0.04, 0), new THREE.Vector3(0.38, -0.13, 0), new THREE.Vector3(0.33, -0.17, 0)], (u) => lerp(0.085, 0.012, u), 30, 14),
  );
const Guacamayo: React.FC<{t: number; escala?: number; cola?: number; boca?: number; pico?: number; ojos?: number}> = ({t, escala = 1, cola = 1, boca = 0, pico = 1}) => {
  const resp = Math.sin(t * 2.2) * 0.012;
  return (
    <group scale={escala}>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.02, 0, s * 0.09]}>
          <P geo={cil(0.025, 0.025, 0.2, 8)} color="#5b5d66" position={[0, 0.1, 0]} linea={0} silueta={1.6} />
          <P geo={caja(0.14, 0.03, 0.06)} color="#5b5d66" position={[0.02, 0.015, 0]} linea={0} silueta={1.6} />
        </group>
      ))}
      <group position={[0, resp, 0]}>
        {/* cola */}
        <group position={[-0.22, 0.32, 0]} rotation={[0, 0, 1.15]} scale={[1, cola, 1]}>
          <P geo={caja(0.05, 0.75, 0.15)} color={ROJO} position={[0, -0.37, 0]} umbral={40} />
          <P geo={caja(0.055, 0.32, 0.13)} color={AZUL} position={[0, -0.86, 0]} umbral={40} />
          <P geo={caja(0.045, 0.6, 0.1)} color={AZUL} position={[0.02, -0.3, 0.09]} rotation={[0.12, 0, 0]} umbral={40} />
          <P geo={caja(0.045, 0.6, 0.1)} color={AZUL} position={[0.02, -0.3, -0.09]} rotation={[-0.12, 0, 0]} umbral={40} />
        </group>
        {/* cuerpo */}
        <P geo={esf(0.28, 28)} color={ROJO} position={[-0.02, 0.5, 0]} scale={[1, 1.4, 1]} rotation={[0, 0, -0.3]} linea={0} />
        {/* alas: rojo, amarillo, azul */}
        {[-1, 1].map((s) => (
          <group key={s} position={[-0.1, 0.5, s * 0.24]} rotation={[0, 0, -0.5]}>
            <P geo={esf(0.26, 20)} color={ROJO} scale={[1.15, 1.25, 0.28]} linea={0} />
            <P geo={esf(0.2, 18)} color={AMARILLO} position={[-0.06, -0.1, s * 0.02]} scale={[1.0, 0.9, 0.28]} linea={0} />
            <P geo={esf(0.2, 18)} color={AZUL} position={[-0.12, -0.26, s * 0.03]} scale={[0.95, 0.9, 0.28]} linea={0} />
          </group>
        ))}
        {/* cabeza */}
        <group position={[0.1, 0.92, 0]}>
          <P geo={esf(0.19, 28)} color={ROJO} linea={0} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <P geo={esf(0.12, 18)} color="#f6f1e8" position={[0.08, -0.02, s * 0.1]} scale={[1, 0.85, 0.5]} linea={0} silueta={1.2} />
              <P geo={esf(0.035, 12)} color="#f4d23a" position={[0.06, 0.03, s * 0.165]} linea={0} silueta={1.2} />
              <P geo={esf(0.02, 10)} color="#141418" position={[0.065, 0.03, s * 0.185]} linea={0} silueta={0} />
            </group>
          ))}
          <group scale={pico} rotation={[0, 0, boca * 0.18]}>
            <P geo={geoPicoSup()} color="#efe6d2" linea={0} silueta={2} />
          </group>
          <group position={[0.2, -0.08, 0]} rotation={[0, 0, -boca * 0.55]}>
            <P geo={esf(0.07, 16)} color="#2b2b30" position={[0.04, -0.02, 0]} scale={[1.2, 0.8, 0.9]} linea={0} silueta={1.6} />
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------- jaula de domo ----------
const JR = 0.5;
const JH = 0.8;
const Jaula: React.FC = () => {
  const barras = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(0.008, 0.008, JH, 5);
      g.translate(Math.cos(a) * JR, JH / 2, Math.sin(a) * JR);
      gs.push(g);
    }
    for (let i = 0; i < 7; i++) {
      const g = new THREE.TorusGeometry(JR, 0.008, 5, 40, Math.PI);
      g.rotateY((i / 7) * Math.PI);
      g.translate(0, JH, 0);
      gs.push(g);
    }
    for (const y of [0.02, JH * 0.5, JH]) {
      const g = new THREE.TorusGeometry(JR, 0.012, 6, 48);
      g.rotateX(Math.PI / 2);
      g.translate(0, y, 0);
      gs.push(g);
    }
    return mergeGeometries(gs);
  }, []);
  return (
    <group>
      <P geo={cil(JR + 0.06, JR + 0.05, 0.1, 40)} color="#2f6fe0" position={[0, -0.05, 0]} />
      <P geo={cil(JR, JR, 0.02, 40)} color="#f3f0e6" position={[0, 0.005, 0]} linea={0} silueta={0} />
      <P geo={barras} color="#c3c7cf" linea={0} silueta={1.1} />
      <P geo={cil(0.022, 0.022, JR * 2, 8)} color={MADERA} position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} linea={0} silueta={1.4} />
    </group>
  );
};

// ---------- selva ----------
let _barro: THREE.CanvasTexture | null = null;
const texBarro = () => {
  if (_barro) return _barro;
  _barro = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#d07a3c';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${rnd(i) > 0.5 ? '150,70,30' : '240,160,90'},0.4)`;
        g.fillRect(0, rnd(i + 1) * 256, 256, 3 + rnd(i + 2) * 8);
      }
    },
    [2, 1],
  );
  return _barro;
};
const SELVA_X = -30;
const Arbol: React.FC<{x: number; z: number; h: number; k: number}> = ({x, z, h, k}) => (
  <group position={[x, 0, z]}>
    <P geo={cil(0.18, 0.28, h, 12)} color="#6b4a2b" position={[0, h / 2, 0]} umbral={40} />
    {[0, 1, 2, 3].map((i) => (
      <P key={i} geo={esf(0.9, 16)} color={i % 2 ? '#2f8a3a' : '#3fa548'} position={[Math.cos(i * 1.7 + k) * 0.7, h + Math.sin(i * 2 + k) * 0.25, Math.sin(i * 1.7 + k) * 0.5]} scale={[1.2, 0.75, 1]} linea={0} />
    ))}
  </group>
);
const RAMA_Y = 2.2;
const Selva: React.FC<{barro: boolean}> = ({barro}) => (
  <group position={[SELVA_X, 0, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 20]} />
      <meshToonMaterial color="#5aa83a" />
    </mesh>
    {[[-3, -3, 4.2, 0], [3.2, -3.5, 4.6, 1], [-1.2, -5, 5, 2], [1.4, -4.4, 3.8, 3], [-4.5, -1, 3.6, 4], [4.6, -1.5, 4, 5]].map(([x, z, h, k], i) => (
      <Arbol key={i} x={x} z={z} h={h} k={k} />
    ))}
    {/* rama */}
    <P geo={cil(0.07, 0.09, 3.2, 12)} color="#7a5232" position={[0, RAMA_Y, 0]} rotation={[0, 0, Math.PI / 2 + 0.04]} />
    <P geo={cil(0.12, 0.16, RAMA_Y, 12)} color="#6b4a2b" position={[1.6, RAMA_Y / 2, -0.1]} />
    {/* frutas en la rama */}
    {[-0.9, 0.2, 1.0].map((x, i) => (
      <P key={i} geo={esf(0.08, 14)} color={['#ff8a1c', '#e0453a', '#ffd23a'][i]} position={[x, RAMA_Y - 0.14, 0.05]} linea={0} />
    ))}
    {barro && (
      <>
        <P geo={caja(8, 2.4, 1.2)} color="#ffffff" mapa={texBarro()} position={[0, 1.2, -1.2]} linea={1.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.8]}>
          <planeGeometry args={[10, 1.6]} />
          <meshToonMaterial color="#4fa7d8" />
        </mesh>
      </>
    )}
  </group>
);

// ---------- objetos ----------
const Plato: React.FC<{tipo: 'girasol' | 'mix'; quedan?: number}> = ({tipo, quedan = 12}) => (
  <group>
    <P geo={cil(0.13, 0.09, 0.07, 24)} color="#f4f1ea" position={[0, 0.035, 0]} />
    {Array.from({length: 12}, (_, i) => {
      if (i >= quedan) return null;
      const a = rnd(i + 2) * Math.PI * 2;
      const d = rnd(i + 4) * 0.08;
      const p: [number, number, number] = [Math.cos(a) * d, 0.08 + rnd(i) * 0.015, Math.sin(a) * d];
      if (tipo === 'girasol') return <P key={i} geo={esf(0.02, 8)} color={i % 2 ? '#2b2b30' : '#e8e2d0'} position={p} scale={[1.6, 0.6, 0.9]} rotation={[0, a, 0]} linea={0} silueta={0.9} />;
      return <P key={i} geo={caja(0.04, 0.04, 0.04)} color={['#ffa62b', '#9bd36a', '#c98a4a', '#e0453a'][i % 4]} position={p} rotation={[a, a, 0]} linea={0} silueta={1} />;
    })}
  </group>
);
const Juguete: React.FC<{t: number; roto: number}> = ({t, roto}) => (
  <group rotation={[0, 0, Math.sin(t * 2) * 0.1]}>
    <P geo={cil(0.006, 0.006, 0.2, 5)} color="#777" position={[0, -0.1, 0]} linea={0} silueta={0.8} />
    {['#e0453a', '#ffd23a', '#2f6fe0', '#3cb54a'].map((c, i) =>
      i < 4 - Math.floor(roto * 3) ? <P key={i} geo={caja(0.07, 0.06, 0.07)} color={c} position={[0, -0.23 - i * 0.07, 0]} rotation={[0, i * 0.4, 0]} /> : null,
    )}
  </group>
);

// ---------- escena ----------
const MESA_X = 0.2;
const JAULA_P: [number, number, number] = [MESA_X, 0.99 + 0.1, 0];
const GUA_J: [number, number, number] = [MESA_X - 0.05, JAULA_P[1] + 0.245, 0];
const TIRO = {
  jaula: ev.metes - 0.35,
  selva: ev.selva - 0.3,
  solo: ev.solo - 0.35,
  muerde: ev.pero2 - 0.1,
  pico: ev.pico2 - 0.35,
  semillas: ev.pero3 - 0.1,
  selva2: ev.selva2 - 0.35,
  barro: ev.lame - 0.4,
  comida: T('por') - 0.3,
  anos: ev.pero4 - 0.1,
  final: ev.ahora - 0.15,
};

const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // tío con el guacamayo al hombro
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.4, -0.9, camina);
  const giro = lerp(Math.PI / 2, 0.2, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, TIRO.jaula, 0.3);
  const hombro = V(tioX + 0.3 * Math.cos(giro) + 0.55 * Math.sin(giro), 1.44, 0.15 - 0.3 * Math.sin(giro) + 0.55 * Math.cos(giro));
  const escala = 0.5 + 0.12 * ventana(t, ev.enorme - 0.1, ev.rojo, 0.2);
  const cola = 1 + 0.35 * ventana(t, ev.cola - 0.1, ev.pico - 0.2, 0.3);
  const snap = t > ev.abrelatas - 0.4 && t < ev.felicidades ? Math.max(0, Math.sin((t - ev.abrelatas + 0.4) * 14)) : 0;

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (t < TIRO.jaula) {
    const poses: Pose[] = [
      [0, [-1.2, 2.2, 6.4], [-1.4, 1.4, 0], 44],
      [ev.pajaro - 0.4, [hombro.x + 0.35, hombro.y + 0.35, hombro.z + 2.0], [hombro.x + 0.1, hombro.y + 0.3, hombro.z], 36],
      [ev.cola - 0.3, [hombro.x + 0.1, hombro.y + 0.1, hombro.z + 2.5], [hombro.x - 0.15, hombro.y + 0.05, hombro.z], 38],
      [ev.pico - 0.3, [hombro.x + 0.35, hombro.y + 0.55, hombro.z + 1.2], [hombro.x + 0.2, hombro.y + 0.48, hombro.z], 32],
      [ev.felicidades - 0.25, [-0.7, 1.95, 4.6], [-0.8, 1.45, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (t < TIRO.selva) {
    const k = r(t, ev.pero1 - 0.1, 0.8);
    cam = {pos: V(MESA_X + 0.3, 1.75, lerp(3.0, 2.1, k)), obj: V(MESA_X, 1.45, 0), fov: 38};
  } else if (t < TIRO.solo) {
    cam = {pos: V(SELVA_X + 0.3, RAMA_Y + 0.35, 4.2 - (t - TIRO.selva) * 0.08), obj: V(SELVA_X, RAMA_Y + 0.15, 0), fov: 40};
  } else if (t < TIRO.pico) {
    cam = {pos: V(MESA_X + 0.35, 1.72, 2.2), obj: V(MESA_X, 1.48, 0), fov: 38};
  } else if (t < TIRO.semillas) {
    cam = {pos: V(GUA_J[0] + 0.75, GUA_J[1] + 0.6, 1.45), obj: V(GUA_J[0] + 0.15, GUA_J[1] + 0.45, 0), fov: 32};
  } else if (t < TIRO.selva2) {
    cam = {pos: V(MESA_X + 0.35, 1.7, 2.0), obj: V(MESA_X, 1.45, 0), fov: 38};
  } else if (t < TIRO.barro) {
    cam = {pos: V(SELVA_X - 0.6, RAMA_Y + 0.3, 2.6), obj: V(SELVA_X - 0.6, RAMA_Y + 0.05, 0), fov: 38};
  } else if (t < TIRO.comida) {
    cam = {pos: V(SELVA_X, 1.5, 4.6 - (t - TIRO.barro) * 0.08), obj: V(SELVA_X, 1.0, -0.4), fov: 42};
  } else if (t < TIRO.anos) {
    cam = {pos: V(MESA_X + 0.3, 1.72, 2.1), obj: V(MESA_X, 1.42, 0), fov: 38};
  } else if (t < TIRO.final) {
    cam = {pos: V(-0.5, 1.9, 4.6), obj: V(-0.4, 1.4, 0), fov: 40};
  } else {
    cam = {pos: V(MESA_X + 0.3, 1.75, 2.4 - (t - TIRO.final) * 0.05), obj: V(MESA_X, 1.45, 0), fov: 38};
  }

  const enPatio = !(t >= TIRO.selva && t < TIRO.solo) && !(t >= TIRO.selva2 && t < TIRO.comida);
  const enJaula = t >= TIRO.jaula && enPatio && !(t >= TIRO.anos && t < TIRO.final);
  // animaciones en la jaula
  const grita =
    (t > ev.gritando - 0.3 && t < ev.es1) || (t > ev.buscando - 0.4 && t < ev.hablarte + 0.3) ? Math.max(0, Math.sin(t * 9)) : 0;
  const muerde = t > ev.muerde - 0.2 && t < TIRO.pico ? Math.max(0, Math.sin(t * 7)) : 0;
  const romperO = t > ev.romper - 0.2 && t < TIRO.semillas ? Math.max(0, Math.sin(t * 8)) : 0;
  const picoCrece = t >= TIRO.pico && t < TIRO.semillas ? 1 + 0.25 * ventana(t, ev.crecer - 0.3, ev.romper - 0.2, 0.4) : 1;
  const come = t >= TIRO.comida && t < TIRO.anos ? Math.max(0, Math.sin(t * 3)) ** 3 : 0;
  const amanecer = ventana(t, ev.pero1 - 0.1, TIRO.selva, 0.3);

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[-0.55, 1, 0.55]} area={7} centro={[enPatio ? 0 : SELVA_X, 0, 0]} amb={1.0 - amanecer * 0.25} sol={0.62} />
      {enPatio ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[40, 30]} />
            <meshToonMaterial color="#ffffff" map={texPasto()} />
          </mesh>
          <Pasto />
          <Casa />
          <group position={[MESA_X, 0, 0]}>
            <Mesa />
          </group>
        </>
      ) : (
        <Selva barro={t >= TIRO.barro} />
      )}
      {/* gancho: tío + guacamayo */}
      {t < TIRO.jaula && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={hombro.toArray() as [number, number, number]} rotation={[0, giro, 0]}>
            <Guacamayo t={t} escala={escala} cola={cola} boca={snap} />
          </group>
        </>
      )}
      {/* jaula en la mesa */}
      {enJaula && (
        <>
          <group position={JAULA_P}>
            <Jaula />
          </group>
          <group position={[GUA_J[0] + muerde * 0.06, GUA_J[1], GUA_J[2]]} rotation={[0, -0.4, 0]} scale={0.5}>
            <Guacamayo t={t} boca={Math.max(grita, muerde, romperO, come)} pico={picoCrece} />
          </group>
          {t > ev.semillas - 0.2 && t < TIRO.comida && (
            <group position={[MESA_X + 0.25, JAULA_P[1] + 0.01, 0.2]} scale={r(t, ev.semillas - 0.2, 0.3)}>
              <Plato tipo="girasol" />
            </group>
          )}
          {t >= TIRO.comida && t < TIRO.anos && (
            <group position={[MESA_X + 0.25, JAULA_P[1] + 0.01, 0.2]}>
              <Plato tipo="mix" />
            </group>
          )}
          {t > ev.madera - 1.5 && (
            <group position={[MESA_X + 0.25, JAULA_P[1] + JH - 0.02, -0.1]} scale={r(t, ev.madera - 1.5, 0.3)}>
              <Juguete t={t} roto={r(t, ev.madera, 2.2)} />
            </group>
          )}
          {/* cable mordido */}
          {t > ev.cables - 0.8 && t < TIRO.pico && (
            <>
              <P
                geo={G('cable', () => tuboAhusado([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 0.02, 0.1), new THREE.Vector3(0.6, 0, 0.0), new THREE.Vector3(0.9, 0.01, 0.15)], () => 0.012, 30, 6))}
                color="#1c1c22"
                position={[MESA_X - 0.6, 1.0, 0.32]}
                linea={0}
                silueta={1}
              />
              <Sprite tex={texEstrella()} pos={[MESA_X - 0.25, 1.06, 0.38]} escala={[0.12, 0.12]} o={t > ev.cables ? (Math.sin(t * 20) > 0 ? 1 : 0.3) : 0} rot={t * 4} />
            </>
          )}
          {/* ondas del grito */}
          {grita > 0.1 &&
            [0, 1, 2].map((i) => (
              <Sprite key={i} tex={texOndas()} pos={[GUA_J[0] + 0.32 + i * 0.12, GUA_J[1] + 0.5 + i * 0.05, 0.12]} escala={[0.1, 0.2]} o={grita} rot={-1.2 + i * 0.2} />
            ))}
          {romperO > 0.6 &&
            Array.from({length: 6}, (_, i) => (
              <P key={i} geo={caja(0.02, 0.01, 0.01)} color="#c49a62" position={[MESA_X + 0.25 + (rnd(i + Math.floor(t * 8)) - 0.5) * 0.3, JAULA_P[1] + 0.5 - rnd(i * 3 + Math.floor(t * 8)) * 0.3, -0.05]} rotation={[i, t * 5, i]} linea={0} silueta={0.8} />
            ))}
        </>
      )}
      {/* bandada en la selva */}
      {!enPatio && t < TIRO.solo &&
        [-1.2, -0.4, 0.4, 1.1].map((x, i) => (
          <group key={i} position={[SELVA_X + x, RAMA_Y + 0.07, 0]} rotation={[0, i % 2 ? -0.5 : -0.2, 0]} scale={0.42}>
            <Guacamayo t={t + i} boca={t > ev.gritan - 0.3 ? Math.max(0, Math.sin(t * 9 + i * 1.7)) : 0} />
          </group>
        ))}
      {!enPatio && t >= TIRO.selva2 && t < TIRO.barro &&
        [-1.2, -0.4, 0.4].map((x, i) => (
          <group key={i} position={[SELVA_X + x, RAMA_Y + 0.07, 0]} rotation={[0, -0.3, 0]} scale={0.42}>
            <Guacamayo t={t + i} boca={Math.max(0, Math.sin(t * 4 + i)) ** 3} />
          </group>
        ))}
      {!enPatio && t >= TIRO.barro &&
        [-1.6, -0.6, 0.5, 1.5].map((x, i) => (
          <group key={i}>
            <P geo={caja(0.55, 0.07, 0.35)} color="#b5612c" position={[SELVA_X + x, 0.77 + (i % 2) * 0.6, -0.45]} />
            <group position={[SELVA_X + x, 0.8 + (i % 2) * 0.6, -0.45]} rotation={[0, Math.PI / 2 - 0.75 + (i % 2) * 0.2, 0]} scale={0.42}>
              <Guacamayo t={t + i} boca={Math.max(0, Math.sin(t * 5 + i)) ** 2} />
            </group>
          </group>
        ))}
      {/* 60 años: tío y guacamayo */}
      {t >= TIRO.anos && t < TIRO.final && (
        <>
          <group position={[-1.2, 0, 0.2]} rotation={[0, 0.4, 0]}>
            <Tio t={t} anda={0} brazos={0} saluda={0} />
          </group>
          <group position={[0.3, 0.99, 0]} rotation={[0, -0.6, 0]} scale={0.55}>
            <Guacamayo t={t} boca={t > ev.tu - 0.2 ? Math.max(0, Math.sin(t * 9)) : 0} />
          </group>
          {t > ev.tio2 - 0.3 && <P geo={esf(0.22, 16)} color="#f4f1ea" position={[-1.05, 1.84, 0.42]} scale={[1, 0.7, 0.6]} linea={0} silueta={1.6} />}
          {t > ev.tio2 - 0.3 && <P geo={cil(0.025, 0.025, 1.0, 8)} color="#6b4a2b" position={[-0.75, 0.5, 0.5]} rotation={[0, 0, 0.1]} linea={0} silueta={1.4} />}
        </>
      )}
      <Halo pos={[MESA_X + 0.5, 2.6, -0.5]} o={amanecer * 0.8} escala={2.5} color="#ffb070" />
    </>
  );
};

// ---------- capa 2D ----------
Object.assign(ICONOS, {
  guacamayo: (
    <g>
      <circle cx={40} cy={52} r={24} fill={ROJO} stroke="#16171c" strokeWidth={4} />
      <ellipse cx={46} cy={50} rx={10} ry={8} fill="#f6f1e8" />
      <circle cx={46} cy={48} r={4} fill="#16171c" />
      <path d="M60 40 C78 40 84 56 74 68 C70 60 64 58 60 58Z" fill="#efe6d2" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  rojo: <circle cx={50} cy={50} r={30} fill={ROJO} stroke="#16171c" strokeWidth={4} />,
  azul: <circle cx={50} cy={50} r={30} fill={AZUL} stroke="#16171c" strokeWidth={4} />,
  amarillo: <circle cx={50} cy={50} r={30} fill={AMARILLO} stroke="#16171c" strokeWidth={4} />,
  cola: (
    <g>
      <path d="M20 20 L72 76 L60 84 L14 28Z" fill={ROJO} stroke="#16171c" strokeWidth={3} />
      <path d="M58 62 L72 76 L60 84 L48 70Z" fill={AZUL} stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  abrelatas: <path d="M24 36 C50 20 82 36 78 62 C74 74 62 76 58 66 C64 58 60 48 48 48 L24 50Z" fill="#efe6d2" stroke="#16171c" strokeWidth={4} />,
  reloj: (
    <g>
      <circle cx={50} cy={54} r={30} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <path d="M50 54 L50 36 M50 54 L62 60" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
      <circle cx={28} cy={24} r={8} fill="#e0453a" stroke="#16171c" strokeWidth={3} />
      <circle cx={72} cy={24} r={8} fill="#e0453a" stroke="#16171c" strokeWidth={3} />
      <text x={50} y={78} textAnchor="middle" fontSize={14} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        6:00
      </text>
    </g>
  ),
  grito: (
    <g>
      <path d="M20 40 L40 40 L60 22 L60 78 L40 60 L20 60Z" fill="#ffd23a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <path d="M70 36 C78 44 78 56 70 64 M78 28 C90 42 90 58 78 72" fill="none" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  bandada: (
    <g>
      {[[26, 56], [50, 40], [74, 56]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={11} fill={ROJO} stroke="#16171c" strokeWidth={3} />
          <path d={`M${x + 8} ${y - 4} L${x + 16} ${y} L${x + 8} ${y + 4}Z`} fill="#efe6d2" stroke="#16171c" strokeWidth={2} />
        </g>
      ))}
    </g>
  ),
  cable: (
    <g>
      <path d="M10 70 C30 70 40 40 60 40" fill="none" stroke="#16171c" strokeWidth={8} strokeLinecap="round" />
      <rect x={58} y={30} width={22} height={20} rx={3} fill="#c3c7cf" stroke="#16171c" strokeWidth={3} />
      <path d="M80 34 L90 34 M80 46 L90 46" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  unas: (
    <g>
      <rect x={30} y={30} width={40} height={50} rx={18} fill="#f2b48c" stroke="#16171c" strokeWidth={4} />
      <path d="M36 34 C36 20 64 20 64 34 L64 44 L36 44Z" fill="#fde9e0" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  madera: (
    <g>
      {['#e0453a', '#ffd23a', '#2f6fe0'].map((c, i) => (
        <rect key={i} x={30} y={22 + i * 20} width={40} height={18} fill={c} stroke="#16171c" strokeWidth={3} />
      ))}
      <path d="M50 10 L50 22" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  grasa: (
    <g>
      <path d="M50 16 C62 36 74 50 74 64 C74 80 62 88 50 88 C38 88 26 80 26 64 C26 50 38 36 50 16Z" fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={42} cy={60} rx={6} ry={10} fill="#fff6c4" />
    </g>
  ),
  nuez: (
    <g>
      <ellipse cx={50} cy={52} rx={28} ry={24} fill="#a26b35" stroke="#16171c" strokeWidth={4} />
      <path d="M50 30 C44 44 56 60 50 76" fill="none" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  tierra: (
    <g>
      <rect x={14} y={24} width={72} height={52} fill="#d07a3c" stroke="#16171c" strokeWidth={4} />
      <path d="M14 40 L86 40 M14 58 L86 58" stroke="#a5552a" strokeWidth={4} />
    </g>
  ),
  aguacate: (
    <g>
      <path d="M50 14 C66 14 80 46 76 66 C72 84 28 84 24 66 C20 46 34 14 50 14Z" fill="#6fae3a" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={62} r={12} fill="#8a5634" />
    </g>
  ),
  chocolate: (
    <g>
      <rect x={22} y={22} width={56} height={60} rx={4} fill="#6b3a1f" stroke="#16171c" strokeWidth={4} />
      <path d="M22 42 L78 42 M22 62 L78 62 M50 22 L50 82" stroke="#4a2410" strokeWidth={3} />
    </g>
  ),
  sesenta: (
    <g>
      <circle cx={50} cy={50} r={34} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={62} textAnchor="middle" fontSize={34} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        60
      </text>
    </g>
  ),
  abuelo: (
    <g>
      <circle cx={50} cy={40} r={20} fill="#f2b48c" stroke="#16171c" strokeWidth={4} />
      <path d="M32 52 C36 74 64 74 68 52Z" fill="#f4f1ea" stroke="#16171c" strokeWidth={3} />
      <path d="M30 34 C34 18 66 18 70 34" fill="#d8d8d8" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  familia: (
    <g>
      {[[30, 60, 14], [50, 50, 18], [72, 64, 11]].map(([x, y, rr], i) => (
        <g key={i}>
          <circle cx={x} cy={y - rr} r={rr * 0.55} fill="#f2b48c" stroke="#16171c" strokeWidth={3} />
          <rect x={x - rr * 0.6} y={y - rr * 0.4} width={rr * 1.2} height={rr * 1.6} rx={4} fill={['#2f6fe0', '#e0453a', '#3cb54a'][i]} stroke="#16171c" strokeWidth={3} />
        </g>
      ))}
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.brasil - 0.05, 'hoja', 'Brasil'],
  [ev.rojo - 0.05, 'rojo', 'rojo'],
  [ev.amarillo - 0.05, 'amarillo', 'amarillo'],
  [ev.pico - 0.05, 'abrelatas', 'pico abrelatas'],
  [ev.guacamayo - 0.05, 'guacamayo', 'guacamayo', 'ok', ev.guacamayo + 0.2],
  [ev.jaula - 0.05, 'jaula', 'jaula'],
  [ev.seis - 0.05, 'reloj', '6 de la mañana'],
  [ev.bandadas - 0.05, 'bandada', 'en bandada'],
  [ev.solo - 0.05, 'guacamayo', 'si está solo'],
  [ev.muerde - 0.05, 'golpe', 'muerde todo'],
  [ev.pico2 - 0.05, 'abrelatas', 'el pico crece'],
  [ev.romper - 0.05, 'madera', 'romper madera'],
  [ev.semillas2 - 0.05, 'grasa', 'girasol: grasa', 'no', ev.grasa],
  [ev.frutas - 0.05, 'fruta', 'frutas'],
  [ev.lame - 0.05, 'tierra', 'lame tierra'],
  [ev.frutas2 - 0.05, 'fruta', 'frutas', 'ok', ev.frutas2 + 0.3],
  [ev.aguacate - 0.05, 'aguacate', 'aguacate', 'no', ev.aguacate + 0.3],
  [ev.sesenta - 0.1, 'sesenta', '60 años'],
  [ev.feliz - 0.15, 'guacamayo', 'guacamayo feliz', 'ok', ev.feliz + 0.1],
];
const DER: Ic[] = [
  [ev.pajaro - 0.05, 'alas', 'pájaro enorme'],
  [ev.azul - 0.05, 'azul', 'azul'],
  [ev.cola - 0.05, 'cola', 'cola larguísima'],
  [ev.felicidades + 0.3, '', ''],
  [ev.semillas - 0.05, 'semillas', 'girasol', 'ok', ev.listo],
  [ev.gritando - 0.05, 'grito', 'grita', 'no', ev.gritando + 0.3],
  [ev.amanecer - 0.05, 'sol', 'amanecer'],
  [ev.buscando - 0.05, 'corazon', 'te busca'],
  [ev.hablarte - 0.15, 'grito', 'te habla', 'ok', ev.hablarte + 0.1],
  [ev.cables - 0.05, 'cable', 'cables', 'no', ev.cables + 0.3],
  [ev.unas - 0.05, 'unas', 'como tus uñas'],
  [ev.juguetes - 0.15, 'madera', 'sus juguetes', 'ok', ev.juguetes + 0.1],
  [ev.nueces - 0.05, 'nuez', 'nueces y semillas'],
  [ev.venenos - 0.05, 'calavera', 'quita venenos'],
  [ev.especial - 0.1, 'pellet', 'comida especial', 'ok', ev.especial + 0.2],
  [ev.chocolate - 0.05, 'chocolate', 'chocolate', 'no', ev.chocolate + 0.3],
  [ev.tio2 - 0.2, 'abuelo', 'más que tu tío'],
  [ev.hereden - 0.1, 'familia', 'tus nietos'],
];

const ROJAS = new Set(['brasil', 'enorme', 'rojo', 'azul', 'amarillo', 'cola', 'larguísima', 'abrelatas', 'felicidades', 'guacamayo', 'jaula', 'girasol', 'listo', '6', 'mañana', 'gritando', 'alarma', 'selva', 'bandadas', 'amanecer', 'atardecer', 'solo', 'ti', 'hablarte', 'muerde', 'cables', 'mesa', 'crecer', 'uñas', 'madera', 'juguetes', 'grasa', 'frutas', 'nueces', 'tierra', 'ríos', 'venenos', 'verduras', 'especial', 'aguacate', 'chocolate', 'matar', 'importante', '60', 'años', 'tío', 'tú', 'feliz', 'nietos']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const GuacamayoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const amanecer = ventana(t, ev.pero1 - 0.1, TIRO.selva + 2.6, 0.3);
  const selva = (t >= TIRO.selva && t < TIRO.solo) || (t >= TIRO.selva2 && t < TIRO.comida);
  return (
    <AbsoluteFill style={{background: selva ? 'linear-gradient(#ffb98a, #ffe7c2 60%)' : 'linear-gradient(#cfd8de, #eef1f2 60%)'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.05, far: 200, position: [0, 2, 7]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#ff8a5a', mixBlendMode: 'multiply', opacity: 0.22 * amanecer}} />
      <div style={{position: 'absolute', inset: 0, background: '#ff2a1a', mixBlendMode: 'multiply', opacity: ventana(t, ev.matar - 0.1, ev.pero4, 0.15) * 0.18}} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="¡AAAAA!" color="#e0453a" o={ventana(t, ev.gritando - 0.1, ev.es1 - 0.1, 0.2)} y={430} size={130} fuente={FUENTE} />
      <Titulo texto="60+ años" o={ventana(t, ev.sesenta - 0.1, ev.tio2 - 0.3, 0.25)} y={420} size={150} fuente={FUENTE} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.nietos - 0.1} texto="HERENCIA" sub="vive más de 60 años" color="#2f6fe0" />
      <Audio src={staticFile('guacamayo/voz.wav')} />
      <Audio src={staticFile('guacamayo/musica.wav')} />
    </AbsoluteFill>
  );
};
