import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/camaleon.json';
import {Camara, G, Luces, P, Papel, Pose, caja, canvasTex, cil, cl, cuerpoSecciones, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Confeti, ICONOS, Ic, Mano, Ranura, Sello, Sprite, Tio, crearSubtitulo, texEstrella} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_CAMALEON = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  madagascar: T('madagascar'),
  lagartija: T('lagartija'),
  cambia: T('cambia'),
  ojos: T('ojos', 1),
  cola: T('cola'),
  resorte: T('resorte…'),
  felicidades: T('felicidades'),
  camaleon: T('camaleón', 1),
  pones: T('pones', 1),
  pecera: T('pecera', 1),
  platito: T('platito'),
  listo: T('listo'),
  pero1: T('pero', 1),
  hundidos: T('hundidos'),
  tomar: T('tomar', 1),
  es1: T('es', 1),
  plato: T('plato:'),
  quieta: T('quieta'),
  gotas: T('gotas'),
  hojas: T('hojas'),
  rocies: T('rocíes'),
  goteo: T('goteo'),
  lloviera: T('lloviera'),
  agua3: T('agua', 4),
  pero2: T('pero', 2),
  agarras: T('agarras'),
  oscuro: T('oscuro'),
  esconderse: T('esconderse:'),
  hablar: T('hablar'),
  cristales: T('cristales'),
  junta: T('junta'),
  separa: T('separa'),
  colores: T('colores'),
  oscuro2: T('oscuro', 2),
  estres: T('estrés'),
  mira: T('mira'),
  toca: T('toca'),
  pero4: T('pero', 4),
  peleando: T('peleando'),
  reflejo: T('reflejo'),
  arboles: T('árboles'),
  rival: T('rival'),
  jaula: T('jaula'),
  malla: T('malla'),
  ramas: T('ramas'),
  casa: T('casa'),
  pero5: T('pero', 5),
  grillo: T('grillo'),
  desaparece: T('desaparece'),
  lengua: T('lengua'),
  disparada: T('disparada'),
  doble: T('doble'),
  rapido: T('rápido'),
  ahora: T('ahora'),
  feliz: T('feliz'),
  verde: T('verde'),
  tranquilo: T('tranquilo'),
};

// ---------- color ----------
const cRuta = ['#3fbf5a', '#2fa3c9', '#e0603a', '#f2c63a', '#3fbf5a'];
const colorCam = (t: number) => {
  // cambia de color en el gancho, oscuro con estrés, verde brillante al final
  const base = new THREE.Color('#4cb84a');
  const ciclo = ventana(t, ev.cambia - 0.1, ev.ojos, 0.15);
  if (ciclo > 0) {
    const u = cl((t - ev.cambia + 0.1) / 1.3) * (cRuta.length - 1);
    const i = Math.min(cRuta.length - 2, Math.floor(u));
    base.lerp(new THREE.Color(cRuta[i]).lerp(new THREE.Color(cRuta[i + 1]), u - i), ciclo);
  }
  const oscuro = ventana(t, ev.agarras - 0.2, ev.hablar, 0.5) + ventana(t, ev.oscuro2 - 0.2, ev.mira + 0.3, 0.4) + ventana(t, ev.peleando - 0.3, ev.arboles, 0.4);
  base.lerp(new THREE.Color('#2a3a2a'), Math.min(1, oscuro) * 0.85);
  const brillante = r(t, ev.verde - 0.2, 0.5);
  base.lerp(new THREE.Color('#5cf05a'), brillante);
  const h = {h: 0, s: 0, l: 0};
  base.getHSL(h);
  return new THREE.Color().setHSL(Math.round(h.h * 60) / 60, Math.round(h.s * 20) / 20, Math.round(h.l * 30) / 30).getStyle();
};

// ---------- camaleón ----------
const SEC: [number, number, number, number, number][] = [
  [-0.5, 0.03, 0.06, 0.05, 2.2],
  [-0.35, 0.08, 0.2, 0.14, 2.2],
  [-0.05, 0.11, 0.27, 0.19, 2.3],
  [0.25, 0.1, 0.24, 0.16, 2.3],
  [0.42, 0.075, 0.17, 0.1, 2.2],
  [0.52, 0.085, 0.22, 0.1, 2.3],
  [0.66, 0.08, 0.2, 0.08, 2.3],
  [0.8, 0.055, 0.11, 0.05, 2.2],
  [0.88, 0.012, 0.02, 0.01, 2.2],
];
const geoCuerpo = () =>
  G('camCuerpo', () => {
    const g = cuerpoSecciones(SEC, {segX: 90, segA: 32});
    const p = g.getAttribute('position');
    const col: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      let v = 1;
      if (x < 0.4 && Math.sin(x * 22) > 0.6) v = 0.78;
      if (y < -0.08 && x < 0.4) v = 1.18;
      if (x > 0.5 && y > -0.02 && y < 0.04) v = 1.25;
      col.push(v, v, v);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  });
const geoCresta = () =>
  G('camCresta', () => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 14; i++) {
      const x = lerp(0.35, -0.4, i / 13);
      const up = 0.27 - Math.abs(x + 0.05) * 0.45;
      const g = new THREE.ConeGeometry(0.014, 0.04, 4);
      g.translate(x, up + 0.01, 0);
      gs.push(g);
    }
    const casco = new THREE.ConeGeometry(0.07, 0.16, 4);
    casco.rotateZ(0.7);
    casco.translate(0.5, 0.24, 0);
    gs.push(casco);
    return mergeGeometries(gs);
  });
const geoColaCam = (enrollar: number) =>
  G(`camCola|${enrollar.toFixed(2)}`, () => {
    const N = 40;
    const pts: THREE.Vector3[] = [];
    let p = new THREE.Vector2(-0.45, -0.02);
    let th = Math.PI + 0.25;
    const paso = 0.62 / N;
    for (let i = 0; i <= N; i++) {
      pts.push(new THREE.Vector3(p.x, p.y, 0));
      const u = i / N;
      th += enrollar * (0.04 + u * 0.38);
      p = p.clone().add(new THREE.Vector2(Math.cos(th), Math.sin(th)).multiplyScalar(paso * (1 - u * 0.4)));
    }
    return tuboAhusado(pts, (u) => lerp(0.05, 0.008, u), 60, 10);
  });

const Ojo: React.FC<{s: number; mira: number; hundido: number}> = ({s, mira, hundido}) => (
  <group position={[0.64, 0.11, s * 0.07]} rotation={[0, mira, 0]} scale={1 - 0.3 * hundido}>
    <P geo={esf(0.055, 16)} color="#ffffff" position={[0, 0, s * 0.01]} scale={[1, 1, 0.8]} linea={0} silueta={1.2} />
    <P geo={esf(0.02, 10)} color="#141418" position={[0.03, 0, s * 0.045]} linea={0} silueta={0} />
  </group>
);

const PataC: React.FC<{x: number; s: number; color: string; t: number; fase: number; anda: number}> = ({x, s, color, t, fase, anda}) => {
  const paso = Math.sin(t * 3 + fase) * 0.4 * anda;
  return (
    <group position={[x, -0.1, s * 0.07]} rotation={[s * 0.35, 0, paso]}>
      <P geo={cil(0.022, 0.02, 0.14, 8)} color={color} position={[0, -0.07, 0]} linea={0} silueta={1.4} />
      <group position={[0, -0.14, 0]} rotation={[-s * 0.6, 0, 0]}>
        <P geo={cil(0.02, 0.016, 0.12, 8)} color={color} position={[0, -0.06, 0]} linea={0} silueta={1.4} />
        <P geo={esf(0.022, 8)} color={color} position={[0.015, -0.12, 0]} scale={[1.4, 0.6, 1]} linea={0} silueta={1.2} />
        <P geo={esf(0.022, 8)} color={color} position={[-0.015, -0.12, 0]} scale={[1.4, 0.6, 1]} linea={0} silueta={1.2} />
      </group>
    </group>
  );
};

const Camaleon: React.FC<{t: number; color: string; enrollar?: number; ojoA?: number; ojoB?: number; hundido?: number; lengua?: number; anda?: number; opacity?: number; inflar?: number}> = ({
  t,
  color,
  enrollar = 1,
  ojoA = 0,
  ojoB = 0,
  hundido = 0,
  lengua = 0,
  anda = 0,
  inflar = 0,
}) => {
  const e = Math.round(enrollar * 20) / 20;
  return (
    <group>
      <group scale={[1, 1 + inflar * 0.15, 1 + inflar * 0.25]}>
        <P geo={geoCuerpo()} vc color={color} linea={0} silueta={2} />
        <P geo={geoCresta()} color={color} linea={0} silueta={1.4} sombra={false} />
      </group>
      <P geo={geoColaCam(e)} color={color} linea={0} silueta={1.8} />
      <Ojo s={1} mira={ojoA} hundido={hundido} />
      <Ojo s={-1} mira={ojoB} hundido={hundido} />
      <P geo={caja(0.2, 0.008, 0.1)} color="#2a3a2a" position={[0.76, -0.035, 0]} rotation={[0, 0, -0.25]} linea={0} silueta={0} />
      {lengua > 0.01 && (
        <group position={[0.86, -0.04, 0]}>
          <P geo={cil(0.012, 0.012, lengua, 8)} color="#f08aa0" position={[lengua / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} linea={0} silueta={1} sombra={false} />
          <P geo={esf(0.035, 12)} color="#f08aa0" position={[lengua, 0, 0]} linea={0} silueta={1.2} sombra={false} />
        </group>
      )}
      <PataC x={0.3} s={1} color={color} t={t} fase={0} anda={anda} />
      <PataC x={0.3} s={-1} color={color} t={t} fase={Math.PI} anda={anda} />
      <PataC x={-0.22} s={1} color={color} t={t} fase={Math.PI} anda={anda} />
      <PataC x={-0.22} s={-1} color={color} t={t} fase={0} anda={anda} />
    </group>
  );
};

// ---------- cuarto, pecera, jaula de malla ----------
let _piso: THREE.CanvasTexture | null = null;
const texPiso = () => {
  if (_piso) return _piso;
  _piso = canvasTex(
    512,
    512,
    (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#b9875a' : '#c69462';
        g.fillRect(0, i * 64, 512, 64);
        g.fillStyle = 'rgba(80,40,10,0.5)';
        g.fillRect(0, i * 64, 512, 3);
        g.fillRect(((i * 197) % 512) | 0, i * 64, 3, 64);
      }
    },
    [6, 6],
  );
  return _piso;
};
const MUEBLE_H = 0.85;
const TW = 0.9;
const TH = 0.6;
const TD = 0.5;
const TER: [number, number, number] = [0.15, MUEBLE_H + 0.03, -0.25];
const MALLA: [number, number, number] = [-0.65, MUEBLE_H + 0.03, -0.3];
const MW = 0.6;
const MH = 1.05;
const MD = 0.5;

const Cuarto: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#ffffff" map={texPiso()} />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#d8e4f2" position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    <P geo={caja(20, 0.14, 0.24)} color="#f4f1ea" position={[0, 0.07, -1.48]} linea={0} />
    <P geo={caja(1.4, 1.3, 0.08)} color="#f4f1ea" position={[1.3, 1.95, -1.48]} />
    <P geo={caja(1.2, 1.1, 0.1)} color="#bfe3f7" position={[1.3, 1.95, -1.46]} />
    <P geo={caja(2.4, MUEBLE_H, 0.75)} color="#6f86a8" position={[-0.1, MUEBLE_H / 2, -0.3]} />
    <P geo={caja(1.1, 0.6, 0.02)} color="#5f7698" position={[-0.65, 0.43, 0.08]} />
    <P geo={caja(1.1, 0.6, 0.02)} color="#5f7698" position={[0.45, 0.43, 0.08]} />
  </group>
);

const Planta: React.FC<{t: number; escala?: number; gotas?: number}> = ({t, escala = 1, gotas = 0}) => (
  <group scale={escala}>
    <P geo={cil(0.06, 0.05, 0.08, 12)} color="#c4562c" position={[0, 0.04, 0]} />
    {[0, 1, 2, 3, 4].map((k) => (
      <group key={k} position={[0, 0.08, 0]} rotation={[Math.sin(k * 2) * 0.5, k * 1.25, 0.6 + Math.sin(t + k) * 0.03]}>
        <P geo={esf(0.08, 12)} color={k % 2 ? '#3f9a46' : '#56b552'} position={[0.09, 0.12, 0]} scale={[1.3, 0.25, 0.6]} linea={0} silueta={1.2} />
        {gotas > 0 &&
          [0, 1].map((g) => {
            const ph = (t * 0.7 + k * 0.37 + g * 0.5) % 1;
            return <P key={g} geo={esf(0.014, 8)} color="#5fc1ff" position={[0.12 + g * 0.03, 0.13 - (ph > 0.6 ? (ph - 0.6) * 0.5 : 0), 0]} scale={[1, 1.3, 1]} linea={0} silueta={0.9} sombra={false} />;
          })}
      </group>
    ))}
  </group>
);

const Pecera: React.FC<{t: number; gotas: number}> = ({t, gotas}) => (
  <group position={TER}>
    <P geo={caja(TW + 0.06, 0.04, TD + 0.06)} color="#2a2b31" position={[0, -0.02, 0]} />
    <P geo={caja(TW - 0.02, 0.04, TD - 0.02)} color="#8a6a45" position={[0, 0.02, 0]} linea={0} silueta={0} />
    <P geo={caja(TW + 0.06, 0.03, TD + 0.06)} color="#2a2b31" position={[0, TH + 0.015, 0]} linea={0} />
    <P geo={caja(TW, TH, TD)} color="#dff4fb" position={[0, TH / 2, 0]} opacity={0.08} linea={1.6} silueta={0} umbral={10} sombra={false} />
    <P geo={cil(0.025, 0.03, 0.75, 10)} color="#7a5232" position={[-0.05, 0.25, 0]} rotation={[0, 0, 1.25]} />
    <group position={[0.3, 0.04, -0.12]}>
      <Planta t={t} gotas={gotas} />
    </group>
    <group position={[-0.32, 0.04, -0.15]}>
      <Planta t={t + 2} escala={0.85} gotas={gotas} />
    </group>
    {/* platito de agua */}
    <group position={[0.22, 0.04, 0.12]}>
      <P geo={cil(0.07, 0.06, 0.03, 18)} color="#f4f1ea" position={[0, 0.015, 0]} />
      <P geo={cil(0.058, 0.058, 0.005, 18)} color="#7fc6e8" position={[0, 0.03, 0]} linea={0} silueta={0} />
    </group>
  </group>
);

const JaulaMalla: React.FC<{t: number}> = ({t}) => {
  const malla = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    const lado = (w: number, d: number, eje: 'x' | 'z', off: number) => {
      for (let k = 0; k <= 12; k++) {
        const v = new THREE.CylinderGeometry(0.003, 0.003, MH, 3);
        const u = lerp(-w / 2, w / 2, k / 12);
        if (eje === 'x') v.translate(u, MH / 2, off);
        else v.translate(off, MH / 2, u);
        gs.push(v);
      }
      for (let k = 0; k <= 18; k++) {
        const h = new THREE.CylinderGeometry(0.003, 0.003, eje === 'x' ? w : d, 3);
        h.rotateZ(Math.PI / 2);
        if (eje === 'z') h.rotateY(Math.PI / 2);
        h.translate(eje === 'x' ? 0 : off, (k / 18) * MH, eje === 'x' ? off : 0);
        gs.push(h);
      }
    };
    lado(MW, MD, 'x', -MD / 2);
    lado(MW, MD, 'z', -MW / 2);
    lado(MW, MD, 'z', MW / 2);
    return mergeGeometries(gs);
  }, []);
  return (
    <group position={MALLA}>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <P key={`${sx}${sz}`} geo={caja(0.03, MH, 0.03)} color="#2a2b31" position={[(sx * MW) / 2, MH / 2, (sz * MD) / 2]} />))}
      <P geo={caja(MW + 0.04, 0.04, MD + 0.04)} color="#2a2b31" position={[0, MH, 0]} />
      <P geo={caja(MW + 0.04, 0.05, MD + 0.04)} color="#2a2b31" position={[0, 0.02, 0]} />
      <P geo={malla} color="#3a3b42" linea={0} silueta={0} sombra={false} />
      <P geo={cil(0.022, 0.026, 0.7, 10)} color="#7a5232" position={[-0.05, 0.42, 0.02]} rotation={[0, 0.7, 1.45]} />
      <P geo={cil(0.02, 0.024, 0.55, 10)} color="#7a5232" position={[0.02, 0.78, -0.05]} rotation={[0.2, 0, -1.2]} />
      <group position={[0.2, 0.05, -0.18]}>
        <Planta t={t} escala={1.1} />
      </group>
      <group position={[-0.2, 0.05, -0.2]}>
        <Planta t={t + 1} escala={0.9} />
      </group>
    </group>
  );
};

const Grillo: React.FC<{p: [number, number, number]; t: number}> = ({p, t}) => (
  <group position={[p[0], p[1] + Math.max(0, Math.sin(t * 2.5)) ** 6 * 0.03, p[2]]}>
    <P geo={esf(0.025, 8)} color="#5a3a1c" scale={[1.6, 0.7, 0.8]} linea={0} silueta={1} />
    <P geo={cil(0.004, 0.004, 0.06, 4)} color="#3a2410" position={[-0.03, 0.02, 0.02]} rotation={[0.5, 0, 1.1]} linea={0} silueta={0.6} />
  </group>
);

const Rociador: React.FC = () => (
  <group>
    <P geo={cil(0.06, 0.065, 0.2, 16)} color="#4fb7e6" position={[0, 0.1, 0]} />
    <P geo={caja(0.08, 0.06, 0.06)} color="#f4f1ea" position={[0.02, 0.23, 0]} />
    <P geo={caja(0.06, 0.02, 0.02)} color="#f4f1ea" position={[0.08, 0.24, 0]} linea={0} />
  </group>
);

// ---------- escena ----------
const MESA_TIO = -1.6;
const SC = 0.3;
const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.pones - 0.35;
  const enMalla = t > ev.jaula - 0.4;
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.2, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.15, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.pones - 0.35, 0.3);
  const palo = V(tioX + 0.7 * Math.sin(giro), 1.42, 0.15 + 0.7 * Math.cos(giro));
  const color = colorCam(t);
  // ojos independientes
  const ojoA = ventana(t, ev.ojos - 0.1, ev.felicidades, 0.2) * Math.sin(t * 2.3) * 0.9 + Math.sin(t * 0.7) * 0.15;
  const ojoB = ventana(t, ev.ojos - 0.1, ev.felicidades, 0.2) * Math.sin(t * 1.4 + 2) * 0.9 + Math.sin(t * 0.5 + 1) * 0.15;
  const enrollar = 1 - 0.6 * ventana(t, ev.cola - 0.4, ev.cola + 0.2, 0.3) + 0.3 * ventana(t, ev.resorte - 0.3, ev.felicidades, 0.2);
  const hundido = ventana(t, ev.hundidos - 0.4, ev.lloviera, 0.5);
  // posición del camaleón
  const enPecera: [number, number, number] = [TER[0] - 0.02, TER[1] + 0.33, TER[2]];
  const enMallaP: [number, number, number] = [MALLA[0] - 0.2, MALLA[1] + 0.5, MALLA[2] + 0.02];
  const pelea = t > ev.peleando - 0.4 && t < ev.arboles;
  const camP = enMalla ? enMallaP : pelea ? ([TER[0] + 0.05, TER[1] + 0.06, TER[2] + 0.12] as [number, number, number]) : enPecera;
  const camRy = enMalla ? -0.7 : pelea ? -Math.PI / 2 + 0.25 : -0.2;
  // lengua
  const disparo1 = t > ev.desaparece - 0.35 && t < ev.desaparece + 0.05 ? Math.sin(((t - ev.desaparece + 0.35) / 0.4) * Math.PI) : 0;
  const disparo2 = t > ev.disparada - 0.2 && t < ev.rapido ? Math.sin(cl((t - ev.disparada + 0.2) / (ev.rapido - ev.disparada + 0.2)) * Math.PI) : 0;
  const lengua = Math.max(disparo1, disparo2) * 1.5;
  const lamida = t > ev.gotas && t < ev.agua3 + 0.3 ? Math.max(0, Math.sin(t * 3)) ** 8 * 0.15 : 0;
  const grilloVisible = t > ev.grillo - 0.4 && (t < ev.desaparece - 0.12 || (t > ev.disparada - 0.4 && t < ev.disparada + 0.1));
  // mano
  const manoO = ventana(t, ev.agarras - 0.6, ev.esconderse - 0.3, 0.35) + ventana(t, ev.toca - 0.8, ev.toca + 0.3, 0.25) * 0.6;
  const manoHasta = V(camP[0], camP[1] + 0.08, camP[2] + 0.05);
  const manoDesde = V(camP[0] + 0.8, camP[1] + 1.1, camP[2] + 0.9);
  // rociador
  const rocia = ventana(t, ev.rocies - 0.4, ev.agua3, 0.3);

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.2], [-1.4, 1.3, 0], 42],
      [ev.lagartija - 0.4, [palo.x + 0.2, palo.y + 0.35, palo.z + 1.9], [palo.x, palo.y + 0.1, palo.z], 34],
      [ev.ojos - 0.3, [palo.x + 0.3, palo.y + 0.3, palo.z + 1.15], [palo.x + 0.1, palo.y + 0.15, palo.z], 32],
      [ev.cola - 0.3, [palo.x - 0.15, palo.y + 0.25, palo.z + 1.3], [palo.x - 0.2, palo.y + 0.06, palo.z], 32],
      [ev.felicidades - 0.25, [-1.2, 1.75, 4.2], [-1.2, 1.3, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (enMalla) {
    const k = ventana(t, ev.pero5 - 0.1, ev.ahora, 0.4);
    cam = {pos: V(MALLA[0] + 0.1 + k * 0.15, MALLA[1] + 0.75 - k * 0.15, lerp(2.1, 1.25, k)), obj: V(MALLA[0] + k * 0.15, MALLA[1] + 0.52, MALLA[2]), fov: 38};
  } else {
    const cerca = ventana(t, ev.pero1 - 0.1, ev.es1, 0.4) + ventana(t, ev.pero2 - 0.1, ev.cristales - 0.3, 0.4) + ventana(t, ev.oscuro2 - 0.3, ev.pero4 - 0.1, 0.4);
    const pel = ventana(t, ev.pero4 - 0.1, ev.arboles, 0.3);
    const zG = TER[2] + TD / 2;
    if (pelea) {
      cam = {pos: V(camP[0] + 0.55, camP[1] + 0.45, zG + 1.25), obj: V(camP[0], camP[1] + 0.05, zG), fov: 36};
    } else cam = {
      pos: V(lerp(TER[0] + 0.15, camP[0] + 0.2, cerca) + pel * 0.55, lerp(TER[1] + 0.75, camP[1] + 0.12, cerca) - pel * 0.35, lerp(1.9, camP[2] + 0.8, cerca) + pel * 0.1),
      obj: V(lerp(TER[0], camP[0] + 0.05, cerca), lerp(TER[1] + 0.3, camP[1] + 0.03, cerca) - pel * 0.15, TER[2] + pel * 0.2),
      fov: 36,
    };
  }

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[0.4, 1, 0.65]} area={4} centro={[0, 0.8, 0]} amb={1.0} sol={0.6} />
      <Cuarto />
      {!enMalla && <Pecera t={t} gotas={ventana(t, ev.gotas - 0.4, ev.pero2, 0.3) + (rocia > 0 ? 1 : 0)} />}
      {enMalla && <JaulaMalla t={t} />}
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={palo.toArray() as [number, number, number]} rotation={[0, giro, 0]}>
            <P geo={cil(0.025, 0.03, 1.1, 10)} color="#7a5232" rotation={[0, 0, Math.PI / 2]} />
            <group position={[0, 0.03 + 0.2 * SC * 1.25, 0]} scale={SC * 1.25}>
              <Camaleon t={t} color={color} enrollar={enrollar} ojoA={ojoA} ojoB={ojoB} />
            </group>
          </group>
        </>
      )}
      {!conTio && (
        <group position={camP} rotation={[0, camRy, enMalla ? 0.0 : pelea ? 0 : 0.3]} scale={SC}>
          <Camaleon t={t} color={color} enrollar={1} ojoA={ojoA * 0.5} ojoB={ojoB * 0.5} hundido={hundido} lengua={Math.max(lengua, lamida)} inflar={pelea ? 0.6 + 0.4 * Math.sin(t * 6) : 0} />
        </group>
      )}
      {/* reflejo en el vidrio */}
      {pelea && (
        <group position={[camP[0], camP[1], TER[2] + TD / 2 + (TER[2] + TD / 2 - camP[2])]} rotation={[0, Math.PI / 2 + 0.25, 0]} scale={[SC, SC, -SC]}>
          <Camaleon t={t + 0.3} color={color} enrollar={1} inflar={0.6 + 0.4 * Math.sin(t * 6)} />
        </group>
      )}
      {pelea && <Sprite tex={texEstrella()} pos={[camP[0], camP[1] + 0.1, TER[2] + TD / 2]} escala={[0.1, 0.1]} o={Math.sin(t * 6) > 0.6 ? 1 : 0} rot={t * 4} />}
      {/* grillo */}
      {grilloVisible && <Grillo p={[enMallaP[0] + 0.765 * 0.71, enMallaP[1] - 0.03, enMallaP[2] + 0.644 * 0.71]} t={t} />}
      {/* rociador */}
      {rocia > 0.01 && (
        <>
          <group position={[TER[0] + 0.6 - rocia * 0.15, TER[1] + TH + 0.15, TER[2] + 0.2]} rotation={[0, Math.PI, 0.3]}>
            <Rociador />
          </group>
          {Array.from({length: 10}, (_, i) => {
            const ph = (t * 1.5 + i / 10) % 1;
            return <P key={i} geo={esf(0.01, 6)} color="#7fd0ff" position={[TER[0] + 0.4 - ph * 0.5, TER[1] + TH + 0.35 - ph * 0.45 + (rnd(i) - 0.5) * 0.1, TER[2] + 0.15 + (rnd(i + 2) - 0.5) * 0.15]} linea={0} silueta={0.8} sombra={false} />;
          })}
        </>
      )}
      {manoO > 0.01 && <Mano desde={manoDesde} hasta={manoDesde.clone().lerp(manoHasta, manoO)} />}
    </>
  );
};

// ---------- capa 2D ----------
const Cristales: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.cristales - 0.3, ev.oscuro2 - 0.3, 0.3);
  if (o <= 0) return null;
  const sep = 1 + 0.6 * Math.sin((t - ev.junta) * 2.2) * r(t, ev.junta - 0.2, 0.4);
  const hue = 120 + (sep - 1) * 220;
  return (
    <div style={{position: 'absolute', left: 540 - 250, top: 560, opacity: o, transform: `scale(${0.85 + 0.15 * o})`}}>
      <svg width={500} height={500} viewBox="-250 -250 500 500">
        <defs>
          <clipPath id="circC">
            <circle r={230} />
          </clipPath>
        </defs>
        <circle r={236} fill={`hsl(${hue}, 70%, 55%)`} stroke="#16171c" strokeWidth={12} />
        <g clipPath="url(#circC)">
          {Array.from({length: 13}, (_, i) =>
            Array.from({length: 13}, (_, j) => {
              const x = (i - 6) * 34 * sep + (j % 2 ? 17 * sep : 0);
              const y = (j - 6) * 30 * sep;
              return <circle key={`${i}-${j}`} cx={x} cy={y} r={11} fill="#ffffff" stroke="#16171c" strokeWidth={3} opacity={0.85} />;
            }),
          )}
        </g>
      </svg>
      <div style={{textAlign: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 52, color: '#16171c', WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill', marginTop: -10}}>cristales en la piel</div>
    </div>
  );
};

Object.assign(ICONOS, {
  camaleon: (
    <g>
      <path d="M20 58 C26 36 54 30 70 40 C80 46 86 52 88 58 C70 62 40 66 20 58Z" fill="#4cb84a" stroke="#16171c" strokeWidth={4} />
      <path d="M26 60 C14 66 14 80 26 80 C34 80 34 70 28 70" fill="none" stroke="#4cb84a" strokeWidth={7} strokeLinecap="round" />
      <circle cx={70} cy={48} r={7} fill="#fff" stroke="#16171c" strokeWidth={3} />
      <circle cx={72} cy={48} r={3} fill="#16171c" />
    </g>
  ),
  arcoiris: (
    <g>
      {['#e0453a', '#ff9a1a', '#ffd23a', '#3cb54a', '#2f6fe0'].map((c, i) => (
        <path key={i} d={`M${16 + i * 7} 72 A${34 - i * 7} ${34 - i * 7} 0 0 1 ${84 - i * 7} 72`} fill="none" stroke={c} strokeWidth={7} />
      ))}
    </g>
  ),
  ojos2: (
    <g>
      <circle cx={34} cy={50} r={18} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <circle cx={66} cy={50} r={18} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <circle cx={26} cy={44} r={6} fill="#16171c" />
      <circle cx={74} cy={58} r={6} fill="#16171c" />
    </g>
  ),
  espiral: <path d="M50 50 C50 44 58 44 58 50 C58 60 42 60 42 50 C42 36 66 36 66 50 C66 68 34 68 34 50 C34 28 76 28 76 50" fill="none" stroke="#4cb84a" strokeWidth={7} strokeLinecap="round" />,
  gota: <path d="M50 14 C62 34 76 48 76 64 C76 80 64 88 50 88 C36 88 24 80 24 64 C24 48 38 34 50 14Z" fill="#5fc1ff" stroke="#16171c" strokeWidth={4} />,
  rociador: (
    <g>
      <rect x={30} y={40} width={34} height={46} rx={8} fill="#4fb7e6" stroke="#16171c" strokeWidth={4} />
      <rect x={34} y={24} width={28} height={16} fill="#f4f1ea" stroke="#16171c" strokeWidth={4} />
      <path d="M66 28 L74 24 M66 32 L78 32 M66 36 L74 40" stroke="#5fc1ff" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  estres: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#2a3a2a" stroke="#16171c" strokeWidth={4} />
      <path d="M36 40 L46 46 M64 40 L54 46" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <path d="M38 66 C44 58 56 58 62 66" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  espejo: (
    <g>
      <rect x={24} y={14} width={52} height={72} rx={6} fill="#cfeefa" stroke="#16171c" strokeWidth={4} />
      <path d="M34 30 L50 22 M34 46 L62 32" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  malla: (
    <g>
      <rect x={20} y={10} width={60} height={80} fill="#e6eef2" stroke="#16171c" strokeWidth={4} />
      {[30, 40, 50, 60, 70].map((x) => (
        <path key={x} d={`M${x} 10 L${x} 90`} stroke="#7b7f88" strokeWidth={2} />
      ))}
      {[20, 30, 40, 50, 60, 70, 80].map((y) => (
        <path key={y} d={`M20 ${y} L80 ${y}`} stroke="#7b7f88" strokeWidth={2} />
      ))}
      <path d="M26 70 L74 40" stroke="#7a5232" strokeWidth={6} strokeLinecap="round" />
    </g>
  ),
  lengua: (
    <g>
      <path d="M14 50 L74 50" stroke="#f08aa0" strokeWidth={8} strokeLinecap="round" />
      <circle cx={80} cy={50} r={10} fill="#f08aa0" stroke="#16171c" strokeWidth={3} />
      <path d="M20 34 L40 34 M20 66 L40 66" stroke="#16171c" strokeWidth={3} strokeDasharray="4 4" />
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.madagascar - 0.05, 'hoja', 'Madagascar'],
  [ev.ojos - 0.05, 'ojos2', 'ojos por separado'],
  [ev.camaleon - 0.05, 'camaleon', 'camaleón', 'ok', ev.camaleon + 0.2],
  [ev.pecera - 0.05, 'pecera', 'pecera de vidrio'],
  [ev.hundidos - 0.1, 'enfermo', 'ojos hundidos', 'no', ev.hundidos + 0.2],
  [ev.plato - 0.1, 'plato', 'agua del plato', 'no', ev.plato + 0.1],
  [ev.gotas - 0.05, 'gota', 'gotas en las hojas'],
  [ev.agua3 - 0.15, 'gota', 'su agua', 'ok', ev.agua3 + 0.1],
  [ev.esconderse - 0.1, 'hoja', 'esconderse'],
  [ev.cristales - 0.1, 'panal', 'cristales'],
  [ev.oscuro2 - 0.05, 'estres', 'oscuro = estrés'],
  [ev.peleando - 0.05, 'espejo', 'su reflejo'],
  [ev.jaula - 0.05, 'malla', 'jaula de malla'],
  [ev.grillo - 0.05, 'grillo', 'un grillo'],
  [ev.lengua - 0.05, 'lengua', 'lengua disparada'],
  [ev.feliz - 0.15, 'camaleon', 'camaleón feliz', 'ok', ev.feliz + 0.1],
];
const DER: Ic[] = [
  [ev.cambia - 0.05, 'arcoiris', 'cambia de color'],
  [ev.cola - 0.05, 'espiral', 'cola de resorte'],
  [ev.felicidades + 0.3, '', ''],
  [ev.platito - 0.05, 'plato', 'platito de agua', 'ok', ev.listo],
  [ev.tomar - 0.05, 'gota', 'no toma agua', 'no', ev.tomar + 0.3],
  [ev.quieta - 0.05, 'plato', 'agua quieta', 'no', ev.quieta + 0.3],
  [ev.rocies - 0.05, 'rociador', 'rociar'],
  [ev.agarras - 0.05, 'mano', 'lo agarras', 'no', ev.oscuro],
  [ev.hablar - 0.1, 'grito', 'es para hablar'],
  [ev.separa - 0.1, 'arcoiris', 'rebotan colores'],
  [ev.mira - 0.05, 'ojo', 'se mira', 'ok', ev.mira + 0.15],
  [ev.toca - 0.05, 'mano', 'no se toca', 'no', ev.toca + 0.1],
  [ev.rival - 0.05, 'golpe', 'cree que es un rival'],
  [ev.casa - 0.15, 'casa', 'su casa', 'ok', ev.casa + 0.1],
  [ev.desaparece - 0.05, 'grillo', 'desaparece'],
  [ev.doble - 0.05, 'metro', '2 veces su cuerpo'],
  [ev.verde - 0.05, 'camaleon', 'verde brillante'],
  [ev.tranquilo - 0.15, 'feliz', 'tranquilo', 'ok', ev.tranquilo + 0.1],
];

const ROJAS = new Set(['madagascar', 'cambia', 'color', 'ojos', 'lado', 'cola', 'resorte', 'felicidades', 'camaleón', 'vidrio', 'agua', 'listo', 'hundidos', 'tomar', 'plato', 'quieta', 'existe', 'gotas', 'hojas', 'rocíes', 'goteo', 'lloviera', 'oscuro', 'esconderse', 'hablar', 'cristales', 'colores', 'estrés', 'mira', 'toca', 'peleando', 'reflejo', 'árboles', 'rival', 'malla', 'ramas', 'casa', 'grillo', 'desaparece', 'lengua', 'disparada', 'doble', 'rápido', 'feliz', 'verde', 'brillante', 'tranquilo']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const CamaleonVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: '#d8e4f2'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.03, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#ffffff', opacity: disparoFlash(t)}} />
      <Confeti t={t} t0={ev.felicidades} />
      <Cristales t={t} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.tranquilo - 0.1} texto="VERDE" sub="= tranquilo" color="#2f9e44" />
      <Audio src={staticFile('camaleon/voz.wav')} />
      <Audio src={staticFile('camaleon/musica.wav')} />
    </AbsoluteFill>
  );
};
const disparoFlash = (t: number) => (t > ev.desaparece - 0.2 && t < ev.desaparece ? 0.35 : 0);
