import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/contacto.json';
import {Caja, Cilindro, Esfera, gradiente, Papel, Redondeada, SombraContacto, Torno, Toro} from './toon';
import {FUENTE} from '../serie/tema';

// ---------- tiempos ----------
type W = {t: number; e: number; w: string; a?: string[]};
const PALABRAS: W[] = (datos as any).beats.flatMap((b: any) => b.words);
const lim = (x: string) => x.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');
const T = (w: string, n = 1): number => {
  const o = lim(w);
  const hits = PALABRAS.filter((p) => lim(p.w) === o || (p.a ?? []).some((x) => lim(x) === o));
  return (hits[n - 1] ?? hits[hits.length - 1])?.t ?? 0;
};
const cl = (x: number) => Math.max(0, Math.min(1, x));
const suave = (x: number) => {
  const k = cl(x);
  return k * k * (3 - 2 * k);
};
const r = (t: number, a: number, dur: number) => suave((t - a) / dur);
const entre = (t: number, a: number, b: number) => t >= a && t < b;
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ventana = (t: number, a: number, b: number, f = 0.4) => r(t, a, f) * (1 - r(t, b - f, f));

const ev = {
  cables: T('cables', 1),
  corriente1: T('corriente', 1),
  regreso: T('regreso'),
  contacto1: T('contacto', 1),
  pero1: T('pero', 1),
  tocas1: T('tocas', 1),
  cuerpo: T('cuerpo'),
  asi1: T('así', 1),
  caja: T('caja'),
  ranuritas: T('ranuritas'),
  clavija1: T('clavija', 1),
  contacto2: T('contacto', 2),
  pero2: T('pero', 2),
  reves: T('revés'),
  aparatos: T('aparatos'),
  apagados: T('apagados'),
  asi2: T('así', 2),
  grande: T('grande'),
  solo2: T('sólo', 2),
  lado: T('lado'),
  polaridad: T('polaridad'),
  pero3: T('pero', 3),
  pela: T('pela'),
  toca1: T('toca', 1),
  metal1: T('metal', 1),
  ahora: T('ahora'),
  tocas2: T('tocas', 2),
  descalzo: T('descalzo'),
  asi3: T('así', 3),
  tercer1: T('tercer', 1),
  conecta: T('conecta'),
  tierra1: T('tierra', 1),
  enterrada: T('enterrada'),
  si3: T('si', 4),
  camino: T('camino'),
  ti: T('ti'),
  pastilla: T('pastilla'),
  bota: T('bota'),
  tercer2: T('tercer', 2),
  fisica1: T('física', 1),
  pero4: T('pero', 4),
  flojas: T('flojas'),
  chispa: T('chispa'),
  asi4: T('así', 4),
  laminitas: T('laminitas'),
  aprietan: T('aprietan'),
  presion: T('presión'),
  pero5: T('pero', 5),
  hoyo2: T('hoyo', 2),
  atras: T('atrás'),
  adaptadores: T('adaptadores'),
  proteccion: T('protección'),
  refri: T('refri'),
  toques: T('toques'),
  quites: T('quites'),
  falta: T('falta'),
  conectas: T('conectas'),
  cable2: T('cable', 2),
  varilla: T('varilla'),
  corriente2: T('corriente', 2),
};

// ---------- posiciones ----------
const O: [number, number, number] = [0, 0.4, 0]; // centro del contacto en la pared (z=0)
const ZP = 0.006; // frente de la placa
const LAV: [number, number, number] = [0.72, 0, 0.27]; // lavadora (centro de la base)
const LW = 0.55;
const LH = 0.78;
const LD = 0.5;
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;
type V3 = [number, number, number];

// ---------- estados ----------
const hayPlaca = (t: number) => visible(t, ev.caja - 0.1);
const anchoNeutro = (t: number) => (t < 0.75 ? 0.013 : 0.0085 + 0.0045 * r(t, ev.grande - 0.3, 0.5));
const hayTierra = (t: number) => visible(t, ev.tercer1);
/** transparencia de la placa (para ver adentro) */
const verAdentro = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.asi4 - 0.2, ev.pero5 + 0.2, 0.5), ventana(t, ev.hoyo2 - 0.5, ev.adaptadores - 0.2, 0.4)));
/** la clavija: z (0 = metida), giro (0 = derecha, π = al revés), y si tiene adaptador */
const clavija = (t: number) => {
  if (t < 0.75) return {z: 0, giro: 0, on: 1, adapt: 0};
  if (t < ev.clavija1 - 0.6) return {z: 0.3, giro: 0, on: 0, adapt: 0};
  let z = 0.25 * (1 - r(t, ev.clavija1 - 0.6, 0.8));
  let giro = 0;
  // al revés
  z += 0.06 * ventana(t, ev.conectas - 0.4, ev.reves + 0.1, 0.25);
  if (t > ev.reves - 0.3 && t < ev.grande) giro = Math.PI * r(t, ev.reves - 0.4, 0.35);
  // polaridad: sale, intenta al revés (rebota), gira y entra
  if (entre(t, ev.asi2, ev.lado + 0.4)) {
    z = 0.06 * r(t, ev.asi2, 0.4);
    giro = Math.PI;
    const intento = ventana(t, ev.solo2 - 0.5, ev.solo2 + 0.4, 0.25);
    z -= 0.045 * intento;
    if (t > ev.solo2) z += 0.012 * Math.abs(Math.sin((t - ev.solo2) * 25)) * (1 - r(t, ev.solo2 + 0.2, 0.3));
    giro = Math.PI * (1 - r(t, ev.solo2 + 0.5, 0.4));
    z *= 1 - r(t, ev.lado - 0.3, 0.4);
  }
  // sale para ponerle la tercera patita
  z += 0.07 * ventana(t, ev.asi3 - 0.1, ev.cable2 + 0.6, 0.4);
  // floja: se mueve
  const floja = ventana(t, ev.flojas - 0.3, ev.asi4 + 0.2, 0.3);
  z += floja * (0.004 + 0.003 * Math.sin(t * 23));
  // adaptador
  const adapt = r(t, ev.adaptadores - 0.2, 0.5) * (1 - r(t, ev.refri - 0.3, 0.4));
  z += adapt * 0.028;
  return {z, giro, on: 1, adapt};
};
// ayudantes que dependen de varias palabras
/** la lavadora tiene corriente en la carcasa */
const carcasaViva = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.toca1, ev.asi3 + 0.2, 0.3), ventana(t, ev.si3, ev.bota + 0.05, 0.1), ventana(t, ev.refri, 99, 0.3)));
const apagadoConCorriente = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.aparatos - 0.3, ev.asi2 + 0.2, 0.4));
const peligro = (t: number) => {
  if (t < ev.pero1) return 0.1;
  const v = Math.max(
    0.1,
    ventana(t, ev.pero1 + 0.3, ev.asi1 + 0.3, 0.4) * 0.95,
    apagadoConCorriente(t) * 0.7,
    ventana(t, ev.ahora - 0.5, ev.asi3 + 0.3, 0.4) * 0.97,
    ventana(t, ev.flojas, ev.asi4 + 0.3, 0.3) * 0.75,
    ventana(t, ev.adaptadores, ev.proteccion + 1.2, 0.4) * 0.8,
    ventana(t, ev.toques - 0.3, 99, 0.4) * 0.95,
  );
  return v;
};

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 1.6, 0.35, 0.25, [0.2, 0.4, 0.1]],
  [1.0, 0.42, 0.35, 0.1, [0, 0.4, 0.04]],
  [6.1, 0.58, 0.5, 0.15, [0.04, 0.41, 0.06]],
  [9.4, 0.36, 0.3, 0.08, [0, 0.4, 0.02]],
  [16.5, 0.5, 0.4, 0.12, [0.03, 0.39, 0.05]],
  [18.8, 1.75, 0.22, 0.15, [0.35, 0.38, 0.2]],
  [21.9, 0.34, 0.45, 0.1, [0, 0.4, 0.04]],
  [28.9, 2.0, 0.3, 0.18, [0.5, 0.4, 0.25]],
  [33.7, 2.0, 0.15, 0.15, [0.5, 0.42, 0.35]],
  [37.8, 2.5, 0.2, 0.12, [0.28, 0.16, 0.3]],
  [49.6, 0.75, 0.15, 0.06, [-0.45, 0.88, 0.05]],
  [51.2, 0.36, 0.3, 0.08, [0, 0.39, 0.03]],
  [54.4, 0.3, 0.55, 0.12, [0, 0.4, 0.03]],
  [58.3, 0.24, 0.85, 0.25, [0, 0.4, -0.01]],
  [65.3, 0.38, 0.3, 0.1, [0, 0.4, 0.0]],
  [68.8, 0.42, 0.55, 0.12, [0, 0.4, 0.06]],
  [72.2, 2.0, 0.15, 0.18, [0.5, 0.42, 0.35]],
  [75.0, 0.42, 0.4, 0.12, [0.0, 0.39, 0.07]],
];
const camara = (t: number) => {
  let i = 0;
  while (i < CAMARA.length - 1 && CAMARA[i + 1][0] <= t) i++;
  const a = CAMARA[Math.max(0, i - 1)];
  const b = CAMARA[i];
  const k = i === 0 ? 0 : suave((t - b[0]) / 1.4);
  const L = (x: number, y: number) => x + (y - x) * k;
  const d = L(a[1], b[1]);
  const az = L(a[2], b[2]) + Math.sin(t * 0.4) * 0.03;
  const el = L(a[3], b[3]) + Math.sin(t * 0.31) * 0.015;
  const obj = a[4].map((v, j) => L(v, b[4][j])) as V3;
  const pos: V3 = [obj[0] + d * Math.sin(az) * Math.cos(el), obj[1] + d * Math.sin(el), obj[2] + d * Math.cos(az) * Math.cos(el)];
  const zap = Math.max(ventana(t, ev.corriente2, ev.cuerpo + 0.6, 0.1), ventana(t, ev.tocas2, ev.descalzo + 0.6, 0.1), ventana(t, ev.toques, ev.toques + 0.8, 0.1)) * (t > 6 ? 1 : 0);
  pos[0] += Math.sin(t * 71) * 0.006 * zap * d;
  pos[1] += Math.cos(t * 63) * 0.006 * zap * d;
  return {pos, obj};
};
const Camara: React.FC<{t: number}> = ({t}) => {
  const cam = useThree((s) => s.camera);
  const {pos, obj} = camara(t);
  cam.position.set(...pos);
  cam.lookAt(...obj);
  return null;
};

// ---------- ayudas ----------
const Pieza: React.FC<{t: number; desde: number; dir?: V3; caida?: number; children: React.ReactNode}> = ({t, desde, dir = [0, 1, 0], caida: alto = 0.3, children}) => {
  const {fps} = useVideoConfig();
  if (t < 0.75) {
    const e = r(t, 0.18, 0.5);
    if (e >= 0.99) return null;
    return (
      <group position={[dir[0] * e * 1.4, dir[1] * e * 1.4, dir[2] * e * 1.4]} rotation={[e * dir[2] * 2, e * dir[0], e * dir[1]]} scale={1 - e * 0.6}>
        {children}
      </group>
    );
  }
  if (t < desde) return null;
  const s = spring({frame: (t - desde) * fps, fps, config: {damping: 11, stiffness: 160, mass: 0.7}});
  return (
    <group position={[0, (1 - s) * alto, 0]} scale={0.6 + 0.4 * s}>
      {children}
    </group>
  );
};
const Brota: React.FC<{t: number; desde: number; position?: V3; children: React.ReactNode}> = ({t, desde, position, children}) => {
  const {fps} = useVideoConfig();
  if (!visible(t, desde)) return null;
  const s = t < 0.75 ? 1 : spring({frame: (t - desde) * fps, fps, config: {damping: 9, stiffness: 190, mass: 0.6}});
  return (
    <group position={position} scale={Math.max(0.001, s)}>
      {children}
    </group>
  );
};
const MatTinta: React.FC = () => <meshBasicMaterial color="#15161c" side={THREE.BackSide} />;

/** cable (tubo con contorno) */
const Cable: React.FC<{puntos: V3[]; r: number; color: string; hasta?: number; o?: number; brillo?: number}> = ({puntos, r: rr, color, hasta = 1, o = 1, brillo = 0}) => {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
    const n = 80;
    const pts = c.getSpacedPoints(n).slice(0, Math.max(2, Math.round(n * cl(hasta)) + 1));
    const c2 = new THREE.CatmullRomCurve3(pts);
    return {a: new THREE.TubeGeometry(c2, Math.max(8, pts.length * 2), rr, 10, false), b: new THREE.TubeGeometry(c2, Math.max(8, pts.length * 2), rr + 0.0012, 10, false)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos), rr, Math.round(cl(hasta) * 80)]);
  if (hasta <= 0.01 || o <= 0.01) return null;
  const tr = o < 0.98;
  return (
    <group>
      <mesh geometry={geo.a} castShadow={!tr}>
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} emissive={color} emissiveIntensity={brillo} />
      </mesh>
      <mesh geometry={geo.b}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={tr} opacity={o} />
      </mesh>
    </group>
  );
};

/** puntitos de corriente que viajan por un camino */
const Corriente: React.FC<{t: number; puntos: V3[]; on: number; vel?: number; n?: number; color?: string; tam?: number; reversa?: boolean}> = ({t, puntos, on, vel = 0.7, n = 12, color = '#ffe14d', tam = 0.0035, reversa = false}) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p))), [JSON.stringify(puntos)]);
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        let u = (t * vel + i / n) % 1;
        if (reversa) u = 1 - u;
        const p = curva.getPointAt(u);
        return (
          <mesh key={i} position={p} scale={on}>
            <sphereGeometry args={[tam, 10, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
};

/** rayito en zigzag entre dos puntos */
const Zap: React.FC<{a: V3; b: V3; t: number; on: number; semilla?: number; g?: number}> = ({a, b, t, on, semilla = 0, g = 0.0018}) => {
  if (on <= 0.05) return null;
  const n = 7;
  const f = Math.floor(t * 18);
  const pts = Array.from({length: n + 1}, (_, i) => {
    const k = i / n;
    const j = i === 0 || i === n ? 0 : 1;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.18;
    return new THREE.Vector3(
      a[0] + (b[0] - a[0]) * k + (rnd(f * 7 + i + semilla) - 0.5) * d * j,
      a[1] + (b[1] - a[1]) * k + (rnd(f * 11 + i + semilla) - 0.5) * d * j,
      a[2] + (b[2] - a[2]) * k + (rnd(f * 13 + i + semilla) - 0.5) * d * j,
    );
  });
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 40, g, 6, false);
  const geo2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 40, g * 2.4, 6, false);
  return (
    <group>
      <mesh geometry={geo2}>
        <meshBasicMaterial color="#ffb020" transparent opacity={0.45 * on} depthWrite={false} />
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#fffbe0" transparent opacity={on} />
      </mesh>
    </group>
  );
};

// ---------- cuarto de lavado (diorama) ----------
const HUECO = {x0: -0.032, x1: 0.032, y0: 0.345, y1: 0.455};
const Cuarto: React.FC = () => (
  <group>
    {/* pared con hueco para la chalupa */}
    {[
      [-3, HUECO.x0, 0, 3],
      [HUECO.x1, 3, 0, 3],
      [HUECO.x0, HUECO.x1, 0, HUECO.y0],
      [HUECO.x0, HUECO.x1, HUECO.y1, 3],
    ].map(([x0, x1, y0, y1], i) => (
      <mesh key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.02]} receiveShadow>
        <boxGeometry args={[x1 - x0, y1 - y0, 0.04]} />
        <meshToonMaterial color="#bfe0f2" gradientMap={gradiente()} />
      </mesh>
    ))}
    {/* zoclo */}
    <Redondeada w={6} h={0.06} d={0.015} radio={0.005} position={[0, 0.03, 0.007]} color="#ffffff" />
    {/* chalupa (caja dentro de la pared) */}
    <group position={[0, O[1], -0.035]}>
      <Caja w={0.064} h={0.11} d={0.003} position={[0, 0, -0.024]} color="#8a8f99" contorno={false} />
      <Caja w={0.003} h={0.11} d={0.05} position={[-0.0315, 0, 0]} color="#7a7f88" contorno={false} />
      <Caja w={0.003} h={0.11} d={0.05} position={[0.0315, 0, 0]} color="#7a7f88" contorno={false} />
      <Caja w={0.064} h={0.003} d={0.05} position={[0, 0.0545, 0]} color="#7a7f88" contorno={false} />
      <Caja w={0.064} h={0.003} d={0.05} position={[0, -0.0545, 0]} color="#7a7f88" contorno={false} />
    </group>
    {/* piso: losa con corte de tierra al frente */}
    <mesh position={[0.3, -0.015, 0.34]} receiveShadow>
      <boxGeometry args={[3.2, 0.03, 0.72]} />
      <meshToonMaterial color="#f2e6d0" gradientMap={gradiente()} />
    </mesh>
    {[-0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2].map((x) => (
      <mesh key={x} position={[x, 0.0005, 0.34]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.004, 0.72]} />
        <meshBasicMaterial color="#d9c9ad" />
      </mesh>
    ))}
    <mesh position={[0.3, -0.27, 0.34]}>
      <boxGeometry args={[3.2, 0.48, 0.72]} />
      <meshToonMaterial color="#9a6a45" gradientMap={gradiente()} />
    </mesh>
    {Array.from({length: 26}, (_, i) => (
      <Esfera key={i} r={0.008 + rnd(i) * 0.01} escala={[1.4, 0.8, 0.3]} position={[-1.2 + rnd(i + 3) * 3.0, -0.08 - rnd(i + 7) * 0.4, 0.701]} color="#7d5233" contorno={false} sombra={false} />
    ))}
    {/* repisa con detergentes */}
    <group position={[0.62, 1.05, -0.12]}>
      <Redondeada w={0.7} h={0.025} d={0.2} radio={0.006} color="#ffffff" />
      {[
        [-0.22, '#ff8a3d', 0.16],
        [-0.06, '#4fae6a', 0.12],
        [0.12, '#a05cd6', 0.18],
      ].map(([x, c, h], i) => (
        <Redondeada key={i} w={0.1} h={h as number} d={0.07} radio={0.02} position={[x as number, 0.012 + (h as number) / 2, 0]} color={c as string} />
      ))}
    </group>
    {/* canasta de ropa */}
    <group position={[-0.42, 0, 0.32]}>
      <Torno perfil={[[0, 0], [0.11, 0], [0.13, 0.17], [0.125, 0.17], [0.105, 0.008], [0, 0.008]]} color="#e8c27a" />
      <Esfera r={0.1} escala={[1.1, 0.45, 1.1]} position={[0, 0.17, 0]} color="#f28c6b" />
      <Esfera r={0.06} escala={[1.2, 0.5, 1]} position={[0.04, 0.2, 0.03]} color="#7fc6ff" />
    </group>
  </group>
);

/** tablero de pastillas */
const Tablero: React.FC<{t: number}> = ({t}) => {
  const bota = t > 0.75 && t > ev.bota - 0.05 && t < ev.pero4 ? r(t, ev.bota - 0.05, 0.12) : 0;
  const flash = ventana(t, ev.bota - 0.05, ev.bota + 0.5, 0.1);
  return (
    <group position={[-0.45, 0.88, 0.0]}>
      <Redondeada w={0.2} h={0.27} d={0.05} radio={0.01} position={[0, 0, 0.025]} color="#c9ced8" />
      <Caja w={0.16} h={0.22} d={0.004} position={[0, 0, 0.051]} color="#3a3e48" contorno={false} />
      {[0.07, 0.025, -0.02, -0.065].map((y, i) =>
        [-0.035, 0.035].map((x, j) => {
          const esta = i === 1 && j === 1;
          return (
            <group key={`${i}${j}`} position={[x, y, 0.055]}>
              <Redondeada w={0.055} h={0.035} d={0.01} radio={0.004} color="#ffffff" />
              <Redondeada w={0.012} h={0.02} d={0.012} radio={0.004} position={[0, 0, 0.008]} rotation={[esta ? -0.7 + bota * 1.4 : -0.7, 0, 0]} color={esta && flash > 0.1 ? '#ffd34d' : '#e5333b'} />
            </group>
          );
        }),
      )}
    </group>
  );
};

// ---------- contacto ----------
const Cables: React.FC<{t: number}> = ({t}) => {
  const placa = hayPlaca(t);
  const sale = t < 0.75 ? 0 : r(t, ev.cables - 0.3, 0.6);
  if (!placa && sale <= 0.01) return null;
  // sin placa: los cables salen de la pared; con placa: van a los tornillos del contacto (adentro)
  const k = placa ? 1 : 0;
  const fase: V3[] = k
    ? [[0.01, O[1] + 0.06, -0.05], [0.012, O[1] + 0.03, -0.045], [0.018, O[1] + 0.006, -0.02], [0.01, O[1] + 0.006, -0.004]]
    : [[0.01, O[1] + 0.06, -0.05], [0.01, O[1] + 0.02, -0.03], [0.012, O[1] + 0.0, 0.03 * sale], [0.02, O[1] - 0.012, 0.08 * sale]];
  const neutro: V3[] = k
    ? [[-0.01, O[1] + 0.06, -0.05], [-0.012, O[1] + 0.03, -0.045], [-0.018, O[1] + 0.006, -0.02], [-0.01, O[1] + 0.006, -0.004]]
    : [[-0.01, O[1] + 0.06, -0.05], [-0.01, O[1] + 0.02, -0.03], [-0.014, O[1] + 0.0, 0.03 * sale], [-0.024, O[1] - 0.01, 0.075 * sale]];
  const tierra: V3[] = [[0.0, O[1] - 0.06, -0.05], [0.0, O[1] - 0.04, -0.04], [0.0, O[1] - 0.012, -0.02], [0.0, O[1] - 0.012, -0.004]];
  const conTierra = hayTierra(t) && !(t > ev.hoyo2 - 0.6 && t < ev.refri);
  const fasOn = t < 0.75 ? 0 : Math.max(ventana(t, ev.corriente1 - 0.2, ev.pero1 + 0.4, 0.3), ventana(t, ev.tocas1, ev.asi1 + 0.3, 0.2));
  const neuOn = t < 0.75 ? 0 : Math.max(ventana(t, ev.regreso - 0.2, ev.pero1 + 0.4, 0.3), ventana(t, ev.tocas1 + 0.2, ev.asi1 + 0.3, 0.2));
  return (
    <group>
      <Cable puntos={fase} r={0.0028} color="#d8343c" />
      <Cable puntos={neutro} r={0.0028} color="#f4f4ef" />
      {!placa && (
        <>
          <Cilindro r={0.0016} h={0.014} position={fase[3]} rotation={[1.2, 0, 0]} color="#e08a4f" contorno={false} />
          <Cilindro r={0.0016} h={0.014} position={neutro[3]} rotation={[1.2, 0, 0]} color="#e08a4f" contorno={false} />
        </>
      )}
      {conTierra && <Cable puntos={tierra} r={0.0026} color="#3fae5a" />}
      <Corriente t={t} puntos={fase} on={fasOn} n={6} />
      <Corriente t={t} puntos={neutro} on={neuOn} n={6} reversa />
    </group>
  );
};

/** placa y cara del contacto */
const Placa: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  if (!hayPlaca(t)) return null;
  const s = t < 0.75 ? 1 : spring({frame: (t - ev.caja + 0.1) * fps, fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
  const ver = verAdentro(t);
  const o = 1 - ver * 0.72;
  const tr = o < 0.98;
  const neutro = anchoNeutro(t);
  const ranuras = visible(t, ev.ranuritas - 0.1) ? (t < 0.75 ? 1 : r(t, ev.ranuritas - 0.1, 0.3)) : 0;
  const tierra = hayTierra(t) ? (t < 0.75 ? 1 : r(t, ev.tercer1, 0.3)) : 0;
  const falso = (t > 0.75 ? 1 : 0) * ventana(t, ev.hoyo2 - 0.3, ev.adaptadores, 0.3);
  const marcaNeutro = ventana(t, ev.grande - 0.3, ev.grande + 1.2, 0.2);
  const mat = (c: string) => <meshToonMaterial color={c} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} />;
  return (
    <group position={[O[0], O[1], (1 - s) * 0.15]}>
      {/* placa */}
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[0.072, 0.118, 0.004]} />
        {mat('#fbfaf5')}
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[0.0745, 0.1205, 0.0042]} />
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={tr} opacity={o} />
      </mesh>
      {/* cara del contacto */}
      <mesh position={[0, 0, 0.0055]} scale={[1, 1.55, 1]}>
        <cylinderGeometry args={[0.021, 0.022, 0.003, 40]} />
        {mat('#f2efe6')}
      </mesh>
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.0055]} scale={[1, 1, 1.55]}>
        <mesh>
          <cylinderGeometry args={[0.0225, 0.0235, 0.0031, 40]} />
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={tr} opacity={o} />
        </mesh>
      </group>
      {/* ranuras */}
      {ranuras > 0.01 && (
        <group scale={[1, ranuras, 1]}>
          <mesh position={[0.0063, 0.006, 0.0072]}>
            <boxGeometry args={[0.0022, 0.0085, 0.001]} />
            <meshBasicMaterial color="#15161c" />
          </mesh>
          <mesh position={[-0.0063, 0.006, 0.0072]}>
            <boxGeometry args={[0.0022, neutro, 0.001]} />
            <meshBasicMaterial color={marcaNeutro > 0.2 ? '#ff8a00' : '#15161c'} />
          </mesh>
        </group>
      )}
      {tierra > 0.01 && (
        <group position={[0, -0.013, 0.0072]} scale={tierra}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0034, 0.0034, 0.001, 24]} />
            <meshBasicMaterial color="#15161c" />
          </mesh>
          {falso > 0.05 && (
            <mesh>
              <torusGeometry args={[0.0058, 0.0009, 8, 32]} />
              <meshBasicMaterial color="#e5333b" transparent opacity={falso} />
            </mesh>
          )}
        </group>
      )}
      {/* tornillos */}
      {[0.046, -0.046].map((y) => (
        <mesh key={y} position={[0, y, 0.0045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.001, 16]} />
          <meshToonMaterial color="#c9ced8" gradientMap={gradiente()} transparent={tr} opacity={o} />
        </mesh>
      ))}
    </group>
  );
};

/** laminitas de cobre que aprietan las patitas */
const Pinzas: React.FC<{t: number}> = ({t}) => {
  if (!hayPlaca(t)) return null;
  const ver = verAdentro(t);
  const nace = t < 0.75 ? 1 : r(t, ev.laminitas - 0.1, 0.5);
  if (nace <= 0.01 && ver <= 0.01) return null;
  const aprieta = t < 0.75 ? 1 : r(t, ev.aprietan - 0.2, 0.4);
  const brillo = ventana(t, ev.aprietan - 0.2, ev.aprietan + 0.8, 0.2);
  const color = brillo > 0.2 ? '#ffb070' : '#d9823b';
  return (
    <group position={[O[0], O[1] + 0.006, -0.012]} scale={Math.max(0.001, nace)}>
      {[0.0063, -0.0063].map((x) =>
        [-1, 1].map((lado) => (
          <group key={`${x}${lado}`} position={[x + lado * (0.0028 - aprieta * 0.0012), 0, 0]} rotation={[0, lado * (0.35 - aprieta * 0.25), 0]}>
            <Caja w={0.0012} h={0.011} d={0.018} color={color} />
          </group>
        )),
      )}
    </group>
  );
};

/** clavija con cordón hacia la lavadora */
const Clavija: React.FC<{t: number}> = ({t}) => {
  const c = clavija(t);
  if (c.on <= 0.01 || !visible(t, ev.clavija1 - 0.6)) return null;
  const neutro = anchoNeutro(t);
  const tierra = hayTierra(t) ? (t < 0.75 ? 1 : r(t, ev.tercer1 - 0.2, 0.3)) : 0;
  const base = ZP + 0.0155 + c.z; // centro del cuerpo
  const cuerpo: V3 = [O[0], O[1], base];
  const cordon: V3[] = [
    [O[0], O[1], base + 0.02],
    [O[0] + 0.01, O[1] - 0.01, base + 0.06],
    [0.08, 0.22, 0.12],
    [0.2, 0.05, 0.1],
    [LAV[0] - LW / 2 - 0.01, 0.12, LAV[2] - 0.08],
  ];
  return (
    <group>
      <group position={cuerpo} rotation={[0, 0, c.giro]}>
        <Redondeada w={0.034} h={0.042} d={0.026} radio={0.008} color="#2b2d33" opacity={1 - verAdentro(t) * 0.7} contorno={verAdentro(t) < 0.3} />
        <Redondeada w={0.03} h={0.008} d={0.022} radio={0.003} position={[0, 0.0, 0.014]} color="#3a3e48" contorno={false} />
        {/* patitas */}
        <mesh position={[0.0063, 0.006, -0.021]}>
          <boxGeometry args={[0.0013, 0.0082, 0.018]} />
          <meshToonMaterial color="#d9dee5" gradientMap={gradiente()} />
        </mesh>
        <mesh position={[-0.0063, 0.006, -0.021]}>
          <boxGeometry args={[0.0013, neutro - 0.0004, 0.018]} />
          <meshToonMaterial color="#d9dee5" gradientMap={gradiente()} />
        </mesh>
        {tierra > 0.01 && (
          <mesh position={[0, -0.013, -0.022]} rotation={[Math.PI / 2, 0, 0]} scale={tierra}>
            <cylinderGeometry args={[0.0026, 0.0026, 0.02, 16]} />
            <meshToonMaterial color={ventana(t, ev.quites - 0.2, ev.falta + 1.5, 0.2) > 0.2 ? '#7cff9a' : '#c9a24b'} gradientMap={gradiente()} />
          </mesh>
        )}
      </group>
      {/* adaptador */}
      {c.adapt > 0.01 && (
        <group position={[O[0], O[1], ZP + 0.014]} scale={c.adapt}>
          <Redondeada w={0.04} h={0.05} d={0.028} radio={0.005} color="#f2efe6" />
          <Redondeada w={0.024} h={0.006} d={0.006} radio={0.002} position={[0.022, -0.02, -0.006]} color="#9ccf5a" />
        </group>
      )}
      <Cable puntos={cordon} r={0.0035} color="#2b2d33" />
    </group>
  );
};

/** lavadora (con modo rayos X para ver el cable pelado) */
const Lavadora: React.FC<{t: number}> = ({t}) => {
  const xr = t < 0.75 ? 0 : ventana(t, ev.pela - 0.4, ev.ahora + 0.3, 0.4);
  const viva = carcasaViva(t);
  const fantasma = apagadoConCorriente(t);
  const pulso = 0.5 + 0.5 * Math.sin(t * 16);
  const o = 1 - xr * 0.6;
  const tr = o < 0.98;
  const color = '#f4f6f8';
  const brillo = viva * (0.25 + 0.25 * pulso) + fantasma * 0.18 * pulso;
  const pelado = t < 0.75 ? 0 : r(t, ev.pela - 0.1, 0.4);
  const tocaK = t < 0.75 ? 0 : r(t, ev.toca1 - 0.2, 0.3);
  return (
    <group position={LAV}>
      {/* cuerpo */}
      <mesh position={[0, LH / 2, 0]} castShadow={!tr} receiveShadow>
        <boxGeometry args={[LW, LH, LD]} />
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} emissive="#ffd34d" emissiveIntensity={brillo} />
      </mesh>
      <mesh position={[0, LH / 2, 0]} visible={xr < 0.05}>
        <boxGeometry args={[LW + 0.006, LH + 0.006, LD + 0.006]} />
        <meshBasicMaterial color={viva > 0.3 && pulso > 0.5 ? '#ffb020' : '#15161c'} side={THREE.BackSide} transparent={tr} opacity={o} />
      </mesh>
      {/* tablero de control */}
      <Caja w={LW - 0.04} h={0.09} d={0.01} position={[0, LH - 0.06, LD / 2 + 0.004]} color="#d6dbe2" />
      <Cilindro r={0.025} h={0.012} position={[0.17, LH - 0.06, LD / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]} color="#9aa4b0" />
      <Redondeada w={0.12} h={0.04} d={0.008} radio={0.004} position={[-0.12, LH - 0.06, LD / 2 + 0.01]} color="#3a3e48" contorno={false} />
      {/* foquito de encendido (apagado) */}
      <Esfera r={0.007} position={[0.08, LH - 0.06, LD / 2 + 0.01]} color={fantasma > 0.2 ? '#4a4f5b' : '#7cff9a'} contorno={false} />
      {/* puerta */}
      <group position={[0, 0.36, LD / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <Cilindro r={0.19} h={0.03} color="#c9ced8" />
        <Cilindro r={0.145} h={0.034} color="#7fb8d9" contorno={false} />
        <Esfera r={0.11} escala={[1, 0.3, 1]} position={[0, 0.01, 0]} color="#bfe6ff" contorno={false} />
      </group>
      {/* cable interno */}
      {xr > 0.02 && (
        <group>
          <Cable puntos={[[-LW / 2 + 0.02, 0.12, -LD / 2 + 0.08], [-0.1, 0.2, -0.05], [0.05, 0.45, 0.0], [0.15, LH - 0.1, 0.1]]} r={0.005} color="#2b2d33" o={xr} />
          {/* tramo pelado que toca la carcasa */}
          {pelado > 0.02 && (
            <group>
              <Cable puntos={[[0.05, 0.45, 0.0], [0.15 + 0.1 * tocaK, 0.4, 0.0], [0.2 + 0.07 * tocaK, 0.36, 0.0]]} r={0.0035} color="#e08a4f" o={xr} brillo={0.3} />
              <Zap a={[0.27, 0.36, 0.0]} b={[LW / 2, 0.37, 0.02]} t={t} on={xr * ventana(t, ev.toca1 - 0.1, ev.ahora, 0.1)} />
            </group>
          )}
        </group>
      )}
      {/* rayitos alrededor cuando la carcasa tiene corriente */}
      {viva > 0.2 &&
        [0, 1, 2].map((i) => (
          <Zap key={i} a={[-LW / 2 - 0.01, 0.2 + i * 0.2, LD / 2 + 0.01]} b={[-LW / 2 - 0.06, 0.25 + i * 0.2, LD / 2 + 0.05]} t={t + i} on={viva * (pulso > 0.4 ? 1 : 0.3)} semilla={i * 10} />
        ))}
      <SombraContacto position={[0, 0.002, 0]} w={LW + 0.15} d={LD + 0.15} o={0.3} />
    </group>
  );
};

/** cable de tierra: del contacto a la varilla enterrada */
const CAMINO_TIERRA: V3[] = [
  [0.0, O[1] - 0.06, 0.004],
  [-0.06, 0.25, 0.004],
  [-0.12, 0.08, 0.004],
  [-0.14, 0.006, 0.02],
  [-0.15, 0.006, 0.4],
  [-0.15, 0.004, 0.703],
  [-0.15, -0.06, 0.708],
];
const VARILLA_Y: [number, number] = [-0.05, -0.42];
const Tierra: React.FC<{t: number}> = ({t}) => {
  if (!hayTierra(t)) return null;
  const crece = t < 0.75 ? 1 : r(t, ev.conecta - 0.2, ev.enterrada - ev.conecta);
  const quita = t > 0.75 && entre(t, ev.hoyo2 - 0.6, ev.refri) ? r(t, ev.hoyo2 - 0.6, 0.6) : 0;
  const quitaFinal = t > 0.75 ? r(t, ev.refri - 0.2, 0.6) * (1 - r(t, ev.falta + 0.5, 0.5)) : 0;
  const o = 1 - Math.max(quita, quitaFinal) * 0.9;
  const varilla = t < 0.75 ? 1 : r(t, ev.varilla - 0.2, 0.6);
  const fuga = t < 0.75 ? 0 : ventana(t, ev.camino - 0.8, ev.bota + 0.05, 0.2);
  const tierraBrillo = ventana(t, ev.tercer2, ev.fisica1 + 1.2, 0.3);
  return (
    <group>
      <Cable puntos={CAMINO_TIERRA} r={0.004} color="#3fae5a" hasta={crece} o={o} brillo={tierraBrillo * 0.3} />
      {varilla > 0.01 && (
        <group position={[-0.15, (VARILLA_Y[0] + VARILLA_Y[1]) / 2 + (1 - varilla) * 0.3, 0.712]}>
          <Cilindro r={0.008} h={VARILLA_Y[0] - VARILLA_Y[1]} color="#d9823b" />
          <mesh position={[0, (VARILLA_Y[1] - VARILLA_Y[0]) / 2 - 0.01, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.008, 0.025, 16]} />
            <meshToonMaterial color="#d9823b" gradientMap={gradiente()} />
          </mesh>
        </group>
      )}
      {/* la corriente se va por la tierra */}
      <Corriente t={t} puntos={[[LAV[0] - LW / 2, 0.3, LAV[2]], [0.2, 0.05, 0.1], [0.08, 0.22, 0.12], [0, O[1], 0.03]]} on={fuga} n={10} vel={1.1} tam={0.006} />
      <Corriente t={t} puntos={[...CAMINO_TIERRA, [-0.15, VARILLA_Y[1], 0.718]]} on={fuga} n={18} vel={0.8} tam={0.006} />
      {fuga > 0.05 &&
        [0, 1, 2, 3, 4].map((i) => {
          const k = (t * 1.2 + i / 5) % 1;
          return (
            <mesh key={i} position={[-0.15, VARILLA_Y[1] + 0.05, 0.71]} rotation={[0, 0, 0]} scale={[0.02 + k * 0.25, 0.02 + k * 0.12, 0.01]}>
              <ringGeometry args={[0.9, 1, 40]} />
              <meshBasicMaterial color="#ffe14d" transparent opacity={fuga * (1 - k) * 0.8} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/** chispas por la clavija floja */
const Chispas: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.chispa - 0.3, ev.asi4 + 0.1, 0.1);
  if (on <= 0.01) return null;
  return (
    <group position={[O[0], O[1] + 0.006, ZP + 0.004]}>
      {Array.from({length: 14}, (_, i) => {
        const k = (t * 2.5 + rnd(i)) % 1;
        const a = rnd(i + 3) * Math.PI * 2;
        const d = 0.005 + k * 0.03;
        return (
          <mesh key={i} position={[Math.cos(a) * d * (i % 2 ? 1 : -1) + (i % 2 ? 0.0063 : -0.0063), Math.sin(a) * d, k * 0.015]}>
            <sphereGeometry args={[0.0016 * (1 - k) + 0.0005, 8, 6]} />
            <meshBasicMaterial color={k < 0.4 ? '#fffbe0' : '#ffb020'} />
          </mesh>
        );
      })}
      <Zap a={[0.0063, 0, 0]} b={[0.0063, 0.0, 0.012]} t={t} on={on} g={0.0012} />
    </group>
  );
};

/** brazo con mano */
const Brazo: React.FC<{llega: number; objetivo: V3; desde: V3; tiembla: number; t: number; manga?: string}> = ({llega, objetivo, desde, tiembla, t, manga = '#5b84c9'}) => {
  if (llega <= 0.01) return null;
  const sep = 1 - llega;
  const tb = tiembla * 0.004 * Math.sin(t * 60);
  const pos: V3 = [objetivo[0] + desde[0] * sep + tb, objetivo[1] + desde[1] * sep + tb * 0.6, objetivo[2] + desde[2] * sep];
  return (
    <group position={pos} rotation={[0.6, 0.25, 0.95]}>
      <group position={[0, 0.06, 0]}>
        <Cilindro r={0.032} r2={0.03} h={0.2} position={[0, 0.13, 0]} color="#f0c09a" />
        <Cilindro r={0.046} r2={0.042} h={0.4} position={[0, 0.43, 0]} color={manga} />
        <Toro r={0.042} tubo={0.008} position={[0, 0.235, 0]} rotation={[Math.PI / 2, 0, 0]} color={manga} />
        <Redondeada w={0.07} h={0.075} d={0.034} radio={0.015} position={[0, 0.0, 0]} color="#f0c09a" />
        {[-0.024, -0.008, 0.008, 0.024].map((x) => (
          <Redondeada key={x} w={0.014} h={0.046} d={0.017} radio={0.0065} position={[x, -0.055, 0.008]} rotation={[0.2, 0, 0]} color="#f0c09a" />
        ))}
        <Redondeada w={0.014} h={0.038} d={0.017} radio={0.0065} position={[0.042, -0.008, 0.008]} rotation={[0, 0, -0.6]} color="#f0c09a" />
      </group>
    </group>
  );
};

/** pie descalzo */
const Pie: React.FC<{on: number}> = ({on}) => {
  if (on <= 0.01) return null;
  return (
    <group position={[0.36, 0, 0.64]} scale={on} rotation={[0, 0.3, 0]}>
      <Redondeada w={0.09} h={0.045} d={0.2} radio={0.02} position={[0, 0.022, 0]} color="#f0c09a" />
      {[-0.03, -0.012, 0.005, 0.02, 0.034].map((x, i) => (
        <Esfera key={i} r={0.011 - i * 0.001} position={[x, 0.016, 0.1]} color="#f0c09a" />
      ))}
      <Cilindro r={0.035} h={0.3} position={[0, 0.19, -0.06]} color="#f0c09a" />
      <Cilindro r={0.05} h={1.3} position={[0, 0.92, -0.06]} color="#3b5fa8" />
    </group>
  );
};

/** personas que reciben la descarga */
const Personas: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75) return null;
  // 1) toca los cables pelones
  const l1 = r(t, ev.tocas1 - 0.5, 0.5) * (1 - r(t, ev.asi1 + 0.1, 0.4));
  const z1 = ventana(t, ev.corriente2, ev.asi1 + 0.1, 0.1);
  // 2) toca la lavadora
  const l2 = Math.max(r(t, ev.tocas2 - 0.6, 0.5) * (1 - r(t, ev.asi3 + 0.3, 0.4)), r(t, ev.toques - 0.6, 0.5) * (1 - r(t, ev.quites, 0.4)), ventana(t, ev.si3 + 0.2, ev.camino + 1.4, 0.4));
  const z2 = Math.max(ventana(t, ev.tocas2, ev.asi3 + 0.2, 0.1), ventana(t, ev.toques - 0.1, ev.quites, 0.1));
  const pie = Math.max(r(t, ev.descalzo - 0.5, 0.4) * (1 - r(t, ev.asi3 + 0.3, 0.4)), ventana(t, ev.toques - 0.6, ev.quites, 0.4));
  const tocaLav: V3 = [LAV[0] - 0.12, LH + 0.0, LAV[2] + LD / 2 - 0.04];
  return (
    <group>
      <Brazo t={t} llega={l1} objetivo={[0.006, O[1] - 0.004, 0.105]} desde={[-0.3, 0.2, 0.15]} tiembla={z1} />
      <Zap a={[0.02, O[1] - 0.012, 0.08]} b={[0.01, O[1] - 0.004, 0.1]} t={t} on={z1} />
      <Zap a={[-0.024, O[1] - 0.01, 0.075]} b={[-0.005, O[1] - 0.004, 0.1]} t={t + 3} on={z1} semilla={5} />
      <Corriente t={t} puntos={[[0.02, O[1] - 0.012, 0.08], [-0.03, O[1] + 0.03, 0.12], [-0.14, O[1] + 0.12, 0.15], [-0.3, O[1] + 0.25, 0.2]]} on={z1} n={10} vel={1.4} tam={0.004} />
      <Brazo t={t} llega={l2} objetivo={tocaLav} desde={[-0.3, 0.25, 0.2]} tiembla={z2} manga="#e5a13a" />
      <Corriente t={t} puntos={[tocaLav, [tocaLav[0] - 0.15, tocaLav[1] + 0.1, tocaLav[2] + 0.12], [0.36, 0.5, 0.66], [0.36, 0.02, 0.68]]} on={z2} n={14} vel={1.3} tam={0.007} />
      <Pie on={pie} />
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => (
  <>
    <Camara t={t} />
    <hemisphereLight args={['#fff6e6', '#b9a99a', 0.85]} />
    <ambientLight intensity={0.35} />
    <directionalLight
      position={[1.2, 2.4, 2.2]}
      intensity={1.7}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-1.5}
      shadow-camera-right={1.5}
      shadow-camera-top={1.5}
      shadow-camera-bottom={-1.5}
      shadow-bias={-0.0004}
      shadow-radius={4}
    />
    <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
    <Cuarto />
    <Tablero t={t} />
    <Cables t={t} />
    <Placa t={t} />
    <Pinzas t={t} />
    <Clavija t={t} />
    <Chispas t={t} />
    <Pieza t={t} desde={ev.clavija1 - 0.4} dir={[1, 0.3, 0.6]} caida={0.4}>
      <Lavadora t={t} />
    </Pieza>
    <Tierra t={t} />
    <Personas t={t} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.corriente1 - 0.2, 'uno con corriente', false],
  [ev.regreso - 0.3, 'otro de regreso', false],
  [ev.contacto1 - 0.2, 'ya tienes un contacto', false],
  [ev.corriente2, '¡pasa por tu cuerpo!', true],
  [ev.caja - 0.3, 'caja de plástico', false],
  [ev.ranuritas - 0.2, 'dos ranuritas', false],
  [ev.contacto2 - 0.3, 'el contacto', false],
  [ev.reves - 0.4, 'clavija al revés', true],
  [ev.apagados - 0.9, '¡corriente aunque esté apagado!', true],
  [ev.grande - 0.3, 'una ranura más grande', false],
  [ev.solo2 - 0.2, 'sólo entra de un lado', false],
  [ev.polaridad - 0.3, 'la polaridad', false],
  [ev.pela - 0.2, 'un cable se pela', true],
  [ev.toca1 - 0.1, 'toca la carcasa', true],
  [ev.ahora + 0.2, '¡toda la lavadora tiene corriente!', true],
  [ev.descalzo - 0.4, '¡y tú descalzo!', true],
  [ev.tercer1 - 0.2, 'un tercer cable', false],
  [ev.tierra1 - 0.3, 'a la tierra', false],
  [ev.enterrada - 0.5, 'varilla enterrada', false],
  [ev.camino - 0.6, 'se va por ese camino', false],
  [ev.ti - 0.4, 'y no por ti', false],
  [ev.pastilla - 0.4, '¡la pastilla se bota!', false],
  [ev.tercer2 - 0.3, 'el tercer hoyo', false],
  [ev.fisica1 - 0.6, 'la tierra física', false],
  [ev.flojas - 0.3, 'patitas flojas', true],
  [ev.chispa - 0.3, '¡chispa!', true],
  [ev.laminitas - 0.2, 'laminitas de cobre', false],
  [ev.aprietan - 0.2, 'aprietan como pinzas', false],
  [ev.presion - 0.8, 'contactos de presión', false],
  [ev.hoyo2 - 0.3, 'hoyo sin cable atrás', true],
  [ev.adaptadores - 0.3, 'adaptadores', true],
  [ev.proteccion - 0.7, 'pierdes la protección', true],
  [ev.toques - 0.5, '¿te da toques?', true],
  [ev.quites - 0.3, 'no le quites la tercera patita', true],
  [ev.falta - 0.2, 'le falta la tierra física', true],
];
const Etiqueta: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const idx = ETIQUETAS.map((e, i) => [e, i] as const).filter(([e]) => t >= e[0]).pop();
  if (!idx) return null;
  const [[ini, texto, rojo], i] = idx;
  const sig = ETIQUETAS[i + 1]?.[0] ?? 999;
  const fin = Math.min(sig, ini + 2.6);
  if (t > fin) return null;
  const s = spring({frame: (t - ini) * fps, fps, config: {damping: 12, stiffness: 200}});
  const o = interpolate(t, [fin - 0.25, fin], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        top: 250,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontFamily: FUENTE,
        fontWeight: 900,
        fontSize: texto.length > 24 ? 64 : 76,
        lineHeight: 1.05,
        letterSpacing: -1,
        color: rojo ? '#e5333b' : '#15161c',
        opacity: o * Math.min(1, s * 1.5),
        transform: `scale(${0.8 + 0.2 * s})`,
        WebkitTextStroke: '10px #ffffff',
        paintOrder: 'stroke fill',
        filter: 'drop-shadow(0 6px 10px rgba(30,40,50,0.25))',
      }}
    >
      {texto}
    </div>
  );
};

const Termometro: React.FC<{x: number; valor: number; color: string; arriba: string; nombre: string; colorArriba?: string}> = ({x, valor, color, arriba, nombre, colorArriba = '#15161c'}) => (
  <div style={{position: 'absolute', left: x - 14, top: 1450, width: 104, padding: '12px 0', borderRadius: 24, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
    <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 30, color: colorArriba, height: 36}}>{arriba}</div>
    <div style={{width: 46, height: 240, borderRadius: 23, border: '5px solid #15161c', background: 'rgba(255,255,255,0.85)', position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: `${cl(valor) * 100}%`, background: color, borderTop: '4px solid rgba(255,255,255,0.7)'}} />
      <div style={{position: 'absolute', top: 10, bottom: 10, left: 8, width: 7, borderRadius: 4, background: 'rgba(255,255,255,0.55)'}} />
      {[0.25, 0.5, 0.75].map((k) => (
        <div key={k} style={{position: 'absolute', right: 0, width: 14, height: 4, background: '#15161c', bottom: `${k * 100}%`}} />
      ))}
    </div>
    <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 24, color: '#15161c', textAlign: 'center', lineHeight: 1.0}}>{nombre}</div>
  </div>
);
const Medidores: React.FC<{t: number}> = ({t}) => {
  if (t < ev.pero1 - 0.2) return null;
  const p = peligro(t);
  const alto = p > 0.7;
  return <Termometro x={950} valor={p} color={alto ? '#e5333b' : '#4fae6a'} arriba={alto ? '¡!' : ''} colorArriba="#e5333b" nombre="peligro" />;
};

const Destello: React.FC<{t: number}> = ({t}) => {
  const o = Math.max(ventana(t, ev.corriente2, ev.corriente1 + 5.4, 0.05), ventana(t, ev.tocas2, ev.tocas2 + 0.4, 0.05), ventana(t, ev.toques - 0.1, ev.toques + 0.3, 0.05), ventana(t, ev.bota - 0.05, ev.bota + 0.3, 0.05) * 0.6);
  if (o <= 0.01) return null;
  return <AbsoluteFill style={{background: '#fff6c8', opacity: o * 0.6}} />;
};

export const Contacto: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#f3e3c7'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.01, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(40,45,60,0.22) 100%)'}} />
      <Destello t={t} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Audio src={staticFile('contacto/voz.wav')} />
      <Audio src={staticFile('contacto/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_CONTACTO = (datos as any).duration as number;
