import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/pluma.json';
import {Caja, Cilindro, Esfera, gradiente, Papel, Redondeada, Torno} from './toon';
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
type V3 = [number, number, number];

const ev = {
  tinta1: T('tinta', 1),
  tubito1: T('tubito', 1),
  punta1: T('punta', 1),
  pluma1: T('pluma', 1),
  pero1: T('pero', 1),
  golpe: T('golpe'),
  asi1: T('así', 1),
  bolita1: T('bolita', 1),
  rodar: T('rodar'),
  finita: T('finita'),
  bolita2: T('bolita', 2),
  pero2: T('pero', 2),
  gastas: T('gastas'),
  vacio: T('vacío'),
  atras: T('atrás'),
  pintar: T('pintar'),
  asi2: T('así', 2),
  abierto: T('abierto'),
  aire1: T('aire', 1),
  pero3: T('pero', 3),
  derrama: T('derrama'),
  asi3: T('así', 3),
  espesa: T('espesa'),
  escurra: T('escurra'),
  pero4: T('pero', 4),
  cuerpo1: T('cuerpo', 1),
  llega1: T('llega', 1),
  asi4: T('así', 4),
  ojito1: T('ojito', 1),
  entra: T('entra'),
  iguala: T('iguala'),
  cuerpo3: T('cuerpo', 3),
  pero5: T('pero', 5),
  seca: T('seca'),
  destapada: T('destapada'),
  asi5: T('así', 5),
  tapa1: T('tapa', 1),
  seque: T('seque'),
  ojito3: T('ojito', 3),
  tragan: T('tragan'),
  garganta: T('garganta'),
  pasar: T('pasar'),
  seguridad: T('seguridad'),
  si3: T('si', 4),
  calienta: T('calienta'),
  mano: T('mano'),
  raya: T('raya'),
  circulos: T('círculos'),
};

// ---------- geometría (punta en el origen local, eje +x) ----------
const L = 0.45;
const RT = 0.008; // tubito
const RB = 0.021; // cuerpo
const X_OJO = 0.25;
const PUNTA_EXPLICA: V3 = [-0.2, 0.2, 0];
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
/** pose: 0 explicando (horizontal), 1 escribiendo */
const escribe = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.rodar - 0.5, ev.bolita2 + 0.3, 0.5), ventana(t, ev.gastas - 0.4, ev.pintar + 0.5, 0.5), ventana(t, ev.aire1 - 0.6, ev.pero3 + 0.2, 0.4), ventana(t, ev.raya - 0.5, 99, 0.5)));
/** punto donde escribe sobre el papel */
const trazo = (t: number): [number, number] => {
  if (t > ev.raya - 0.6) {
    const a = (t - ev.raya) * 9;
    const rr = 0.03 + 0.004 * a;
    return [0.02 + Math.cos(a) * rr, 0.05 + Math.sin(a) * rr];
  }
  let u = 0;
  if (t < ev.pero2) u = (t - ev.rodar) * 0.06;
  else if (t < ev.asi2) u = 0.3 + (t - ev.gastas) * 0.05;
  else u = 0.55 + (t - ev.aire1) * 0.06;
  return [-0.22 + u, -0.05 + Math.sin(u * 30) * 0.015 + (t > ev.pero2 ? 0.06 : 0) + (t > ev.asi2 ? 0.05 : 0)];
};
const nivelTinta = (t: number) => (t < 0.75 ? 0.75 : 0.85 - 0.25 * r(t, ev.gastas, 6) - 0.1 * r(t, ev.raya, 4));
const retroceso = (t: number) => (t < 0.75 ? 0 : r(t, ev.atras - 0.6, 1.0) * (1 - r(t, ev.aire1 - 0.3, 0.6)));
const abiertoArriba = (t: number) => visible(t, ev.abierto - 0.2);
const espesa = (t: number) => (t < 0.75 ? 1 : r(t, ev.espesa - 0.2, 0.8));
const hayCuerpo = (t: number) => visible(t, ev.cuerpo1 - 0.3);
const hayOjito = (t: number) => visible(t, ev.ojito1 - 0.2);
const hayBolita = (t: number) => visible(t, ev.bolita1 - 0.2);
const tapada = (t: number) => (t < 0.75 ? 1 : r(t, ev.tapa1 - 0.3, 0.6) * (1 - r(t, ev.si3 - 0.3, 0.5)));
const seca = (t: number) => (t < 0.75 ? 0 : r(t, ev.seca - 0.2, 1.2) * (1 - r(t, ev.tapa1, 0.6)) + ventana(t, ev.si3, ev.calienta + 0.8, 0.4));
const calor = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.calienta - 0.2, ev.raya + 0.4, 0.4));

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 1.5, 0.4, 0.35, [0.0, 0.18, 0]],
  [1.0, 1.05, 0.3, 0.2, [0.02, 0.2, 0]],
  [4.9, 0.75, 0.4, 0.45, [-0.18, 0.08, 0]],
  [7.3, 0.32, 0.5, 0.2, [-0.19, 0.2, 0]],
  [10.4, 0.75, 0.45, 0.5, [-0.12, 0.05, 0]],
  [16.3, 0.95, 0.35, 0.3, [0.2, 0.13, 0.05]],
  [22.5, 0.75, 0.5, 0.2, [0.05, 0.2, 0]],
  [24.8, 0.8, 0.45, 0.45, [-0.05, 0.1, 0]],
  [25.6, 0.75, 0.5, 0.2, [0.05, 0.2, 0]],
  [32.4, 1.05, 0.3, 0.2, [0.03, 0.2, 0]],
  [38.0, 0.45, 0.5, 0.15, [0.05, 0.2, 0]],
  [45.2, 0.38, 0.5, 0.2, [-0.18, 0.2, 0]],
  [51.8, 0.4, -0.6, 0.15, [-0.22, 0.2, 0]],
  [62.3, 0.85, 0.4, 0.5, [-0.05, 0.08, 0]],
];
const camara = (t: number) => {
  let i = 0;
  while (i < CAMARA.length - 1 && CAMARA[i + 1][0] <= t) i++;
  const a = CAMARA[Math.max(0, i - 1)];
  const b = CAMARA[i];
  const k = i === 0 ? 0 : suave((t - b[0]) / 1.4);
  const Lr = (x: number, y: number) => x + (y - x) * k;
  const d = Lr(a[1], b[1]);
  const az = Lr(a[2], b[2]) + Math.sin(t * 0.4) * 0.03;
  const el = Lr(a[3], b[3]) + Math.sin(t * 0.31) * 0.015;
  const obj = a[4].map((v, j) => Lr(v, b[4][j])) as V3;
  const pos: V3 = [obj[0] + d * Math.sin(az) * Math.cos(el), obj[1] + d * Math.sin(el), obj[2] + d * Math.cos(az) * Math.cos(el)];
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
/** cilindro a lo largo del eje x (de x0 a x1) */
const Barra: React.FC<{x0: number; x1: number; r: number; color: string; o?: number; seg?: number; contorno?: boolean; brillo?: number; emis?: string}> = ({x0, x1, r: rr, color, o = 1, seg = 24, contorno = true, brillo = 0, emis}) => {
  if (x1 - x0 <= 0.0005) return null;
  const tr = o < 0.98;
  return (
    <group position={[(x0 + x1) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow={!tr}>
        <cylinderGeometry args={[rr, rr, x1 - x0, seg]} />
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} emissive={emis ?? color} emissiveIntensity={brillo} />
      </mesh>
      {contorno && (
        <mesh>
          <cylinderGeometry args={[rr + 0.0018, rr + 0.0018, x1 - x0 + 0.002, seg]} />
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={tr} opacity={tr ? o : 1} />
        </mesh>
      )}
    </group>
  );
};

// ---------- escritorio ----------
const Escritorio: React.FC<{t: number}> = ({t}) => {
  const charco = t < 0.75 ? 0 : r(t, ev.golpe - 0.6, 0.8) * (1 - r(t, ev.asi1 + 0.5, 0.5));
  return (
    <group>
      <mesh position={[0, 1.2, -0.6]}>
        <planeGeometry args={[7, 3]} />
        <meshToonMaterial color="#cfe7df" gradientMap={gradiente()} />
      </mesh>
      <Redondeada w={2.2} h={0.04} d={1.0} radio={0.012} position={[0, -0.02, -0.1]} color="#c99a6b" />
      {/* cuaderno */}
      <Redondeada w={0.62} h={0.012} d={0.42} radio={0.006} position={[-0.02, 0.006, 0.0]} color="#3b7dd8" />
      <mesh position={[-0.02, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.58, 0.38]} />
        <meshToonMaterial color="#fffdf5" gradientMap={gradiente()} />
      </mesh>
      {Array.from({length: 9}, (_, i) => (
        <mesh key={i} position={[-0.02, 0.013, -0.16 + i * 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.58, 0.002]} />
          <meshBasicMaterial color="#9fcbe8" />
        </mesh>
      ))}
      <mesh position={[-0.24, 0.0131, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.002, 0.38]} />
        <meshBasicMaterial color="#ff8fa3" />
      </mesh>
      {/* charco de tinta */}
      {charco > 0.01 && (
        <mesh position={[-0.2, 0.0135, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 1, 1]}>
          <circleGeometry args={[0.06 * charco, 30]} />
          <meshBasicMaterial color="#1f3fa8" />
        </mesh>
      )}
      {/* lápices y goma */}
      <group position={[0.42, 0.01, -0.2]} rotation={[0, 0.4, 0]}>
        <Barra x0={-0.1} x1={0.1} r={0.008} color="#f2c14e" seg={6} />
      </group>
      <Redondeada w={0.06} h={0.02} d={0.03} radio={0.006} position={[0.38, 0.01, 0.1]} color="#ff8fa3" />
    </group>
  );
};

/** líneas dibujadas en el papel */
const Lineas: React.FC<{t: number}> = ({t}) => {
  const tramos: [number, number, boolean][] = [
    [ev.rodar, ev.bolita2, false],
    [ev.gastas, ev.pintar, true],
    [ev.aire1 - 0.2, ev.pero3, false],
    [ev.raya, 99, false],
  ];
  return (
    <group>
      {tramos.map(([a, b, falla], k) => {
        if (t < a + 0.05) return null;
        const fin = Math.min(t, b);
        const n = Math.max(2, Math.round((fin - a) * 20));
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= n; i++) {
          const tt = a + ((fin - a) * i) / n;
          // si falla, deja de pintar al final
          if (falla && tt > ev.atras) break;
          const [x, z] = trazo(tt);
          pts.push(new THREE.Vector3(x, 0.0142, z));
        }
        if (pts.length < 2) return null;
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.0018, 6, false);
        return (
          <mesh key={k} geometry={geo} scale={[1, 0.3, 1]} position={[0, 0.01, 0]}>
            <meshBasicMaterial color="#1f3fa8" />
          </mesh>
        );
      })}
    </group>
  );
};

/** la pluma (en coordenadas locales: punta en el origen, eje +x) */
const Pluma: React.FC<{t: number}> = ({t}) => {
  const niv = nivelTinta(t);
  const ret = retroceso(t);
  const esp = espesa(t);
  const colorTinta = new THREE.Color('#3f6dff').lerp(new THREE.Color('#1b35a0'), esp).getStyle();
  const xTintaIni = 0.045 + ret * 0.06;
  const xTintaFin = 0.045 + (0.37 - 0.045) * niv;
  const bol = hayBolita(t);
  const sec = seca(t);
  const cal = calor(t);
  const marcaBolita = ventana(t, ev.bolita2 - 0.4, ev.bolita2 + 1.2, 0.2);
  const cuerpo = hayCuerpo(t) ? (t < 0.75 ? 1 : r(t, ev.cuerpo1 - 0.3, 0.5)) : 0;
  const marcaOjo = ventana(t, ev.cuerpo3 - 0.6, ev.cuerpo3 + 1.0, 0.2);
  const tap = tapada(t);
  const marcaTapa = ventana(t, ev.seguridad - 0.6, ev.seguridad + 1.2, 0.2);
  const vacioMarca = ventana(t, ev.vacio - 0.3, ev.asi2 + 0.3, 0.3);
  const abierto = abiertoArriba(t);
  return (
    <group>
      {/* punta */}
      <Pieza t={t} desde={ev.punta1 - 0.2} dir={[-1, 0.3, 0.3]} caida={0.1}>
        <mesh position={[0.022, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.0035, RT + 0.002, 0.04, 20]} />
          <meshToonMaterial color={cal > 0.2 ? '#ffb070' : '#d9a441'} gradientMap={gradiente()} emissive="#ff6a1f" emissiveIntensity={cal * 0.4} />
        </mesh>
        <mesh position={[0.022, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.0035 + 0.0016, RT + 0.0036, 0.042, 20]} />
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} />
        </mesh>
        {bol && (
          <Brota t={t} desde={ev.bolita1 - 0.2} position={[0.001, 0, 0]}>
            <group rotation={[0, 0, t * 6 * (escribe(t) > 0.5 ? 1 : 0)]}>
              <Esfera r={0.0042} color={marcaBolita > 0.2 ? '#ffd34d' : sec > 0.3 ? '#5a5f69' : '#e8edf2'} />
              {sec < 0.3 && <Esfera r={0.0043} escala={[0.4, 1, 1]} position={[0.001, 0, 0]} color={colorTinta} contorno={false} />}
            </group>
          </Brota>
        )}
      </Pieza>
      {/* tubito transparente con tinta */}
      <Pieza t={t} desde={ev.tubito1 - 0.2} dir={[0.3, 1, 0.3]} caida={0.15}>
        <Barra x0={0.04} x1={0.37} r={RT} color="#e9f4f6" o={0.5} />
        <Barra x0={xTintaIni} x1={xTintaFin} r={RT - 0.0012} color={colorTinta} contorno={false} />
        {/* vacío arriba */}
        {vacioMarca > 0.05 && <Barra x0={xTintaFin} x1={0.37} r={RT - 0.0012} color="#15161c" o={0.6 * vacioMarca} contorno={false} />}
        {/* tapón del tubito (cerrado al principio) */}
        {!abierto && <Barra x0={0.37} x1={0.375} r={RT + 0.001} color="#2b2d33" />}
      </Pieza>
      {/* cuerpo hexagonal transparente */}
      {cuerpo > 0.01 && (
        <group scale={[1, cuerpo, cuerpo]}>
          <Barra x0={0.035} x1={0.43} r={RB} color="#dff4ff" o={0.28} seg={6} contorno={false} />
          <Barra x0={0.43} x1={0.45} r={RB - 0.002} color="#3b7dd8" seg={6} />
          <Barra x0={0.03} x1={0.05} r={RB - 0.006} color="#3b7dd8" seg={24} />
          {/* aristas del hexágono */}
          {Array.from({length: 6}, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[0.232, Math.cos(a) * RB, Math.sin(a) * RB]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0009, 0.0009, 0.395, 4]} />
                <meshBasicMaterial color="#15161c" />
              </mesh>
            );
          })}
          {hayOjito(t) && (
            <mesh position={[X_OJO, 0, RB * 0.87]}>
              <circleGeometry args={[0.0035, 16]} />
              <meshBasicMaterial color={marcaOjo > 0.2 ? '#e5333b' : '#15161c'} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}
      {/* tapa */}
      {tap > 0.01 && (
        <group position={[-0.06 * (1 - tap), 0, 0]}>
          <Barra x0={-0.012} x1={0.1} r={RB + 0.003} color={marcaTapa > 0.2 ? '#ffd34d' : '#3b7dd8'} o={0.85} seg={24} />
          <Redondeada w={0.08} h={0.006} d={0.01} radio={0.003} position={[0.06, RB + 0.008, 0]} color="#3b7dd8" />
          {/* ojito de la tapa */}
          <mesh position={[-0.0125, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[0.005, 16]} />
            <meshBasicMaterial color="#15161c" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** aire entrando (por arriba del tubito, por el ojito del cuerpo, por la tapa) */
const Aire: React.FC<{t: number; base: (p: V3) => V3}> = ({t, base}) => {
  const arriba = t < 0.75 ? 0 : ventana(t, ev.aire1 - 0.6, ev.pero3, 0.3);
  const bloqueado = t < 0.75 ? 0 : ventana(t, T('aire', 2) - 0.3, ev.asi4 + 0.2, 0.3);
  const ojo = t < 0.75 ? 0 : ventana(t, ev.entra - 0.5, ev.cuerpo3 + 0.6, 0.3);
  const tapa = t < 0.75 ? 0 : ventana(t, ev.pasar - 0.6, ev.seguridad + 0.6, 0.3);
  const parts: React.ReactNode[] = [];
  const puntos = (on: number, de: V3, a: V3, key: string, n = 5) => {
    if (on <= 0.02) return;
    for (let i = 0; i < n; i++) {
      const u = (t * 1.1 + i / n) % 1;
      const p: V3 = [de[0] + (a[0] - de[0]) * u, de[1] + (a[1] - de[1]) * u, de[2] + (a[2] - de[2]) * u];
      parts.push(
        <mesh key={`${key}${i}`} position={base(p)}>
          <sphereGeometry args={[0.004, 8, 6]} />
          <meshBasicMaterial color="#7fc6ff" transparent opacity={on * Math.sin(u * Math.PI)} />
        </mesh>,
      );
    }
  };
  puntos(arriba, [0.45, 0.01, 0], [0.37, 0, 0], 'a');
  puntos(bloqueado, [0.5, 0.0, 0.05], [0.44, 0, 0.03], 'b');
  puntos(ojo, [X_OJO, 0, 0.08], [X_OJO, 0, RB], 'c');
  puntos(tapa, [-0.08, 0, 0], [0.0, 0, 0], 'd');
  return <group>{parts}</group>;
};
/** tinta que se derrama por arriba (líquida) */
const Derrame: React.FC<{t: number; base: (p: V3) => V3}> = ({t, base}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.derrama - 0.4, ev.espesa + 0.2, 0.3);
  if (on <= 0.02) return null;
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const u = (t * 1.2 + i / 3) % 1;
        return <Esfera key={i} r={0.005} escala={[1, 1.4, 1]} position={base([0.38, -0.01 - u * 0.15, 0])} color="#5a8bff" contorno={false} />;
      })}
    </group>
  );
};
/** chorro de tinta (sin bolita) */
const Chorro: React.FC<{t: number; base: (p: V3) => V3}> = ({t, base}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.golpe - 1.0, ev.asi1 + 0.2, 0.2);
  if (on <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 6}, (_, i) => {
        const u = (t * 1.5 + i / 6) % 1;
        return <Esfera key={i} r={0.006} escala={[1, 1.5, 1]} position={base([-0.005, -u * 0.19, 0])} color="#1f3fa8" contorno={false} />;
      })}
    </group>
  );
};
/** mano que calienta la punta */
const Mano: React.FC<{t: number}> = ({t}) => {
  const on = calor(t);
  if (on <= 0.02) return null;
  return (
    <group position={[-0.12, 0.2 + (1 - on) * 0.2, 0.0]} rotation={[0, 0, 0.2]}>
      <Redondeada w={0.11} h={0.05} d={0.1} radio={0.024} position={[0, 0.03, 0]} color="#f0c09a" />
      {[-0.03, -0.01, 0.01, 0.03].map((z) => (
        <Redondeada key={z} w={0.05} h={0.018} d={0.018} radio={0.008} position={[-0.06, 0.015, z]} rotation={[0, 0, -0.6]} color="#f0c09a" />
      ))}
      <Cilindro r={0.04} h={0.25} position={[0.15, 0.08, 0]} rotation={[0, 0, Math.PI / 2 - 0.3]} color="#e5a13a" />
      {/* calorcito */}
      {[0, 1, 2].map((i) => {
        const u = (t * 0.8 + i / 3) % 1;
        return (
          <mesh key={i} position={[-0.06 + i * 0.03, -0.01 - u * 0.03, 0.06]}>
            <torusGeometry args={[0.008, 0.002, 6, 16, Math.PI]} />
            <meshBasicMaterial color="#ff8a3d" transparent opacity={on * (1 - u)} />
          </mesh>
        );
      })}
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const w = escribe(t);
  const [px, pz] = trazo(t);
  const puntaE: V3 = [px, 0.0145, pz];
  // pose interpolada
  const punta: V3 = PUNTA_EXPLICA.map((v, i) => v + (puntaE[i] - v) * w) as V3;
  const rotZ = 0.95 * w;
  const rotY = -0.35 * w;
  const flota = (1 - w) * Math.sin(t * 0.8) * 0.01;
  const giroEje = (1 - w) * Math.sin(t * 0.5) * 0.3;
  const base = (p: V3): V3 => {
    const v = new THREE.Vector3(...p);
    v.applyEuler(new THREE.Euler(giroEje, rotY, rotZ, 'YZX'));
    return [v.x + punta[0], v.y + punta[1] + flota, v.z + punta[2]];
  };
  return (
    <>
      <Camara t={t} />
      <hemisphereLight args={['#fff6e6', '#b9a99a', 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[1.0, 2.4, 2.2]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
      <Escritorio t={t} />
      <Lineas t={t} />
      <group position={[punta[0], punta[1] + flota, punta[2]]} rotation={new THREE.Euler(giroEje, rotY, rotZ, 'YZX')}>
        <Pluma t={t} />
      </group>
      <Aire t={t} base={base} />
      <Derrame t={t} base={base} />
      <Chorro t={t} base={(p) => [p[0] + punta[0], p[1] + punta[1], p[2] + punta[2]]} />
      <Mano t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.tinta1 - 0.1, 'tinta', false],
  [ev.tubito1 - 0.2, 'un tubito de plástico', false],
  [ev.punta1 - 0.2, 'una punta', false],
  [ev.pluma1 - 0.3, 'ya tienes una pluma', false],
  [ev.golpe - 1.2, 'se sale toda de golpe', true],
  [ev.bolita1 - 0.3, 'una bolita de metal', false],
  [ev.rodar - 0.2, 'rueda sobre el papel', false],
  [ev.finita - 0.6, 'una línea finita', false],
  [ev.bolita2 - 0.4, 'la bolita', false],
  [ev.vacio - 0.4, 'arriba se hace un vacío', true],
  [ev.pintar - 0.8, 'deja de pintar', true],
  [ev.abierto - 0.4, 'tubito abierto arriba', false],
  [ev.aire1 - 0.3, 'entra aire', false],
  [ev.derrama - 0.8, 'tinta líquida se derrama', true],
  [ev.espesa - 0.3, 'tinta espesa como pasta', false],
  [ev.cuerpo1 - 0.3, 'el cuerpo está cerrado', true],
  [ev.llega1 - 0.6, 'el aire no llega', true],
  [ev.ojito1 - 0.3, 'un ojito a un lado', false],
  [ev.iguala - 0.6, 'la presión se iguala', false],
  [ev.cuerpo3 - 0.7, 'el ojito del cuerpo', false],
  [ev.seca - 0.3, 'el aire seca la bolita', true],
  [ev.tapa1 - 0.3, 'la tapa la cubre', false],
  [ev.ojito3 - 0.3, '¿y el ojito de la tapa?', false],
  [ev.tragan - 0.3, 'niños se tragan tapas', true],
  [ev.pasar - 0.4, 'deja pasar aire', false],
  [ev.seguridad - 0.7, 'tapa de seguridad', false],
  [ev.si3 - 0.1, '¿dejó de escribir?', true],
  [ev.calienta - 0.2, 'calienta la punta', false],
  [ev.raya - 0.3, 'raya en círculos', false],
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
  if (t < ev.tinta1 + 0.3) return null;
  return <Termometro x={950} valor={nivelTinta(t)} color="#3b5fd8" arriba="" nombre="tinta" />;
};

export const PlumaVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#cfe7df'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.01, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(30,45,40,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Audio src={staticFile('pluma/voz.wav')} />
      <Audio src={staticFile('pluma/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_PLUMA = (datos as any).duration as number;
void Caja;
void Torno;
