import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/termo.json';
import {Caja, Cilindro, Esfera, GROSOR, gradiente, Papel, Redondeada, SombraContacto, Torno, Toro} from './toon';
import {FUENTE} from '../serie/tema';

// ---------- tiempos de palabras ----------
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
  cafe: Math.max(1.3, T('café', 1)),
  botella: T('botella', 1),
  termo: T('termo', 1),
  pero1: T('pero', 1),
  tibio: T('tibio'),
  quema: T('quema'),
  segunda: T('segunda'),
  adentro: T('adentro', 1),
  espacio: T('espacio', 1),
  doble: T('doble'),
  pero2: T('pero', 2),
  calienta: T('calienta'),
  sacas: T('sacas'),
  sinAire: T('sin'),
  cruzar: T('cruzar'),
  vacio1: T('vacío', 1),
  pero3: T('pero', 3),
  invisible: T('invisible'),
  igual: T('igual'),
  sol: T('sol'),
  asi4: T('así', 3),
  pintas: T('pintas'),
  brillante: T('brillante'),
  rebota: T('rebota'),
  recubrimiento: T('recubrimiento'),
  pero4: T('pero', 4),
  boca: T('boca'),
  tapon1: T('tapón', 1),
  hule: T('hule'),
  tapon2: T('tapón', 2),
  pero5: T('pero', 5),
  unirse: T('unirse'),
  fuga: T('fuga'),
  unen: T('unen'),
  cuello1: T('cuello', 1),
  angosta: T('angosta'),
  delgado: T('delgado'),
  pero6: T('pero', 6),
  cae: T('cae'),
  choca: T('choca'),
  asi9: T('así', 6),
  soportes: T('soportes'),
  nada: T('nada'),
  dia: T('día'),
  caliente2: T('caliente', 2),
  aire: T('aire', 4),
  vacio3: T('vacío', 3),
  arreglo: T('arreglo'),
};

// ---------- geometría (metros). Mesa en y=0 ----------
const CORTE0 = 1.15;
const CORTE_L = Math.PI * 2 - 1.6;
const PLANOS = [CORTE0 - 0.035, CORTE0 + CORTE_L - Math.PI * 2 + 0.035]; // un poquito dentro del hueco del corte
const PERFIL_EXT: [number, number][] = [
  [0, 0],
  [0.095, 0],
  [0.105, 0.012],
  [0.105, 0.33],
  [0.09, 0.37],
  [0.062, 0.395],
  [0.058, 0.43],
  [0.052, 0.43],
  [0.052, 0.397],
  [0.084, 0.368],
  [0.099, 0.332],
  [0.099, 0.012],
  [0.09, 0.006],
  [0, 0.006],
];
const PERFIL_INT: [number, number][] = [
  [0, 0.035],
  [0.062, 0.035],
  [0.07, 0.045],
  [0.07, 0.315],
  [0.06, 0.35],
  [0.052, 0.375],
  [0.052, 0.43],
  [0.046, 0.43],
  [0.046, 0.377],
  [0.054, 0.352],
  [0.064, 0.317],
  [0.064, 0.047],
  [0.058, 0.041],
  [0, 0.041],
];
const PERFIL_HUECO: [number, number][] = [
  [0, 0.006],
  [0.09, 0.006],
  [0.099, 0.012],
  [0.099, 0.332],
  [0.084, 0.368],
  [0.0525, 0.396],
  [0.052, 0.375],
  [0.06, 0.35],
  [0.07, 0.315],
  [0.07, 0.045],
  [0.062, 0.035],
  [0, 0.035],
];
const capa = (r0: number, r1: number, y0: number, y1: number): [number, number][] => [
  [r0, y0],
  [r1, y0],
  [r1, y1],
  [r0, y1],
];
const ALTO_CAFE = 0.3;
const BOCA = 0.43;

// ---------- estados ----------
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;
const hayInterior = (t: number) => visible(t, ev.adentro - 0.3);
/** aire en la doble pared (0..1) */
const aireHueco = (t: number) => {
  if (t < 0.75) return 0;
  if (t < ev.vacio3 - 1.2) return t > ev.espacio ? 1 - r(t, ev.sacas, 2.2) : 0;
  return r(t, ev.aire - 0.3, 1.2);
};
/** qué tanto calor se escapa (medidor) */
const fugaCalor = (t: number): number => {
  if (t < 0.75) return 0.08;
  const tramos: [number, number][] = [
    [0, 0.0],
    [ev.cafe + 0.4, 0.25],
    [ev.pero1 + 0.4, 0.95],
    [ev.adentro + 0.2, 0.62],
    [ev.calienta, 0.74],
    [ev.sacas + 0.6, 0.36],
    [ev.invisible, 0.52],
    [ev.rebota, 0.18],
    [ev.boca - 0.6, 0.46],
    [ev.tapon1 + 0.3, 0.1],
    [ev.fuga - 0.4, 0.42],
    [ev.unen, 0.07],
    [ev.caliente2 - 0.4, 0.95],
  ];
  let v = 0;
  for (let i = 0; i < tramos.length; i++) {
    const [a, val] = tramos[i];
    const prev = i === 0 ? 0 : tramos[i - 1][1];
    if (t >= a) v = prev + (val - prev) * r(t, a, 0.8);
  }
  return v;
};
/** caída del termo: altura del termo y hundimiento de la botella de adentro */
const caida = (t: number) => {
  if (!entre(t, ev.pero6 + 0.2, ev.asi9 + 0.8)) return {y: 0, gira: 0, hunde: 0};
  const sube = r(t, ev.pero6 + 0.3, 0.5);
  const t0 = ev.choca - 0.75;
  let y = 0.24 * sube;
  if (t > t0) {
    const k = cl((t - t0) / 0.75);
    y = 0.24 * (1 - k * k);
  }
  if (t > ev.choca) y = Math.abs(Math.sin((t - ev.choca) * 9)) * 0.03 * Math.exp(-(t - ev.choca) * 5);
  y *= 1 - r(t, ev.asi9, 0.6);
  const gira = 0.5 * Math.sin((t - ev.pero6) * 2.2) * sube * (1 - r(t, ev.choca - 0.05, 0.1));
  const hunde = r(t, ev.choca - 0.02, 0.06) * (1 - r(t, ev.asi9 + 0.1, 0.5));
  return {y, gira, hunde};
};

// ---------- cámara ----------
type K = [number, number, number, number, [number, number, number]]; // t, distancia, azimut, elevación, objetivo
const CAMARA: K[] = [
  [0.0, 2.1, 0.5, 0.35, [0, 0.25, 0]],
  [1.2, 1.05, 0.48, 0.26, [0, 0.23, 0]],
  [4.0, 0.98, 0.58, 0.2, [0.02, 0.22, 0]],
  [8.5, 1.15, 0.95, 0.18, [0.06, 0.24, 0]],
  [10.1, 1.02, 0.45, 0.3, [0, 0.26, 0]],
  [14.0, 0.82, 0.48, 0.22, [0.02, 0.22, 0]],
  [16.7, 0.6, 0.48, 0.14, [0.04, 0.2, 0.03]],
  [22.0, 1.15, 0.85, 0.24, [0.13, 0.17, 0.03]],
  [25.4, 0.7, 0.45, 0.12, [0.02, 0.2, 0.02]],
  [29.0, 0.62, 0.52, 0.1, [0.03, 0.19, 0.02]],
  [36.2, 0.78, 0.4, 0.22, [0.02, 0.21, 0.02]],
  [44.6, 0.66, 0.5, 0.48, [0, 0.38, 0]],
  [47.8, 0.85, 0.5, 0.32, [0, 0.36, 0]],
  [52.4, 0.82, 0.5, 0.18, [0.02, 0.21, 0.02]],
  [56.9, 0.6, 0.5, 0.25, [0, 0.37, 0]],
  [60.5, 1.0, 0.45, 0.18, [0, 0.27, 0]],
  [63.4, 1.35, 0.5, 0.15, [0, 0.33, 0]],
  [67.4, 0.72, 0.5, 0.24, [0.02, 0.1, 0.02]],
  [72.8, 1.12, 0.78, 0.2, [0.06, 0.24, 0]],
  [77.0, 0.82, 0.5, 0.18, [0.02, 0.21, 0.02]],
  [79.0, 1.3, 0.55, 0.28, [0, 0.25, 0]],
];
const camara = (t: number) => {
  let i = 0;
  while (i < CAMARA.length - 1 && CAMARA[i + 1][0] <= t) i++;
  const a = CAMARA[Math.max(0, i - 1)];
  const b = CAMARA[i];
  const k = i === 0 ? 0 : suave((t - b[0]) / 1.4);
  const L = (x: number, y: number) => x + (y - x) * k;
  const d = L(a[1], b[1]);
  const az = L(a[2], b[2]) + Math.sin(t * 0.4) * 0.035;
  const el = L(a[3], b[3]) + Math.sin(t * 0.31) * 0.015;
  const obj = a[4].map((v, j) => L(v, b[4][j])) as [number, number, number];
  const pos: [number, number, number] = [obj[0] + d * Math.sin(az) * Math.cos(el), obj[1] + d * Math.sin(el), obj[2] + d * Math.cos(az) * Math.cos(el)];
  // sacudida al chocar
  const s = r(t, ev.choca - 0.03, 0.04) * (1 - r(t, ev.choca + 0.15, 0.45));
  pos[0] += Math.sin(t * 71) * 0.02 * s;
  pos[1] += Math.cos(t * 63) * 0.02 * s;
  return {pos, obj};
};
const Camara: React.FC<{t: number}> = ({t}) => {
  const cam = useThree((s) => s.camera);
  const {pos, obj} = camara(t);
  cam.position.set(...pos);
  cam.lookAt(...obj);
  return null;
};

// ---------- piezas animadas ----------
const Pieza: React.FC<{t: number; desde: number; dir?: [number, number, number]; caida?: number; children: React.ReactNode}> = ({t, desde, dir = [0, 1, 0], caida: alto = 0.3, children}) => {
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
const Brota: React.FC<{t: number; desde: number; hasta?: number; position?: [number, number, number]; children: React.ReactNode}> = ({t, desde, hasta = 999, position, children}) => {
  const {fps} = useVideoConfig();
  if (!visible(t, desde)) return null;
  let s = t < 0.75 ? 1 : spring({frame: (t - desde) * fps, fps, config: {damping: 9, stiffness: 190, mass: 0.6}});
  if (t > hasta) s *= 1 - r(t, hasta, 0.3);
  if (s <= 0.002) return null;
  return (
    <group position={position} scale={s}>
      {children}
    </group>
  );
};

// ---------- pieza de revolución cortada ----------
const MatTinta: React.FC = () => <meshBasicMaterial color="#15161c" side={THREE.BackSide} />;
const Cortada: React.FC<{perfil: [number, number][]; color: string; colorCorte: string; opacity?: number; contorno?: boolean; brillo?: number}> = ({perfil, color, colorCorte, opacity = 1, contorno = true, brillo = 0}) => {
  const g = useMemo(() => {
    const pts = perfil.map(([x, y]) => new THREE.Vector2(x, y));
    const cuerpo = new THREE.LatheGeometry(pts, 96, CORTE0, CORTE_L);
    const tinta = new THREE.LatheGeometry(
      perfil.map(([x, y]) => new THREE.Vector2(x > 0 ? x + GROSOR * 0.8 : 0, y)),
      96,
      CORTE0 - 0.004,
      CORTE_L + 0.008,
    );
    const cara = new THREE.ShapeGeometry(new THREE.Shape(pts));
    const cx = perfil.reduce((s, p) => s + p[0], 0) / perfil.length;
    const cy = perfil.reduce((s, p) => s + p[1], 0) / perfil.length;
    const borde = new THREE.ShapeGeometry(
      new THREE.Shape(
        perfil.map(([x, y]) => {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.hypot(dx, dy) || 1;
          return new THREE.Vector2(x + (dx / d) * 0.0022, y + (dy / d) * 0.0022);
        }),
      ),
    );
    return {cuerpo, tinta, cara, borde};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(perfil)]);
  const transp = opacity < 1;
  return (
    <group>
      <mesh geometry={g.cuerpo} castShadow={!transp} receiveShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={transp} opacity={opacity} depthWrite={!transp} emissive={color} emissiveIntensity={brillo} />
      </mesh>
      {contorno && (
        <mesh geometry={g.tinta}>
          <MatTinta />
        </mesh>
      )}
      {[CORTE0, CORTE0 + CORTE_L].map((a, i) => (
        <group key={i} rotation={[0, a - Math.PI / 2, 0]}>
          <mesh geometry={g.cara}>
            <meshToonMaterial color={colorCorte} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={transp} opacity={opacity} depthWrite={!transp} emissive={colorCorte} emissiveIntensity={brillo} />
          </mesh>
          {contorno && (
            <mesh geometry={g.borde} position={[0, 0, i === 0 ? 0.0012 : -0.0012]}>
              <meshBasicMaterial color="#15161c" side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

const Nube: React.FC<{p: [number, number, number]; r: number; o: number}> = ({p, r: rr, o}) =>
  o <= 0.01 ? null : (
    <mesh position={p}>
      <sphereGeometry args={[rr, 18, 12]} />
      <meshToonMaterial color="#f7fbff" gradientMap={gradiente()} transparent opacity={o} depthWrite={false} />
    </mesh>
  );
const Chorro: React.FC<{t: number; on: number; p: [number, number, number]; largo?: number; n?: number; r0?: number; r1?: number; vel?: number; abre?: number}> = ({t, on, p, largo = 0.25, n = 9, r0 = 0.008, r1 = 0.04, vel = 0.7, abre = 0.12}) => {
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const k = (t * vel + i / n + rnd(i) * 0.3) % 1;
        const j = (rnd(i * 3) - 0.5) * abre * k + Math.sin(t * 2 + i) * 0.01 * k;
        const j2 = (rnd(i * 7) - 0.5) * abre * k;
        return <Nube key={i} p={[p[0] + j, p[1] + k * largo, p[2] + j2]} r={r0 + (r1 - r0) * k} o={on * Math.sin(k * Math.PI) * 0.7} />;
      })}
    </group>
  );
};

/** rayo / flecha de calor que viaja por un camino (polilínea) */
type V3 = [number, number, number];
const enPlano = (phi: number, rr: number, y: number): V3 => [Math.sin(phi) * rr, y, Math.cos(phi) * rr];
const puntoCamino = (cam: V3[], u: number): V3 => {
  const lens = cam.slice(1).map((p, i) => Math.hypot(p[0] - cam[i][0], p[1] - cam[i][1], p[2] - cam[i][2]));
  const tot = lens.reduce((a, b) => a + b, 0);
  let d = cl(u) * tot;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return cam[i].map((v, j) => v + (cam[i + 1][j] - v) * k) as V3;
    }
    d -= lens[i];
  }
  return cam[cam.length - 1];
};
const Rayo: React.FC<{cam: V3[]; u: number; largo?: number; onda?: number; color?: string; grueso?: number; o?: number}> = ({cam, u, largo = 0.35, onda = 0, color = '#ff6a2b', grueso = 0.0035, o = 1}) => {
  const n = 18;
  const u0 = Math.max(0, u - largo);
  if (u <= 0.005 || o <= 0.02) return null;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const uu = u0 + ((u - u0) * i) / n;
    const p = puntoCamino(cam, uu);
    const w = onda * Math.sin(uu * 45) * Math.min(1, i / 3);
    pts.push(new THREE.Vector3(p[0], p[1] + w, p[2]));
  }
  const curva = new THREE.CatmullRomCurve3(pts);
  const cuerpo = new THREE.TubeGeometry(curva, 40, grueso, 8, false);
  const tinta = new THREE.TubeGeometry(curva, 40, grueso + 0.0016, 8, false);
  const fin = pts[n];
  const dir = fin.clone().sub(pts[n - 1]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const transp = o < 0.98;
  return (
    <group>
      <mesh geometry={cuerpo}>
        <meshBasicMaterial color={color} transparent={transp} opacity={o} />
      </mesh>
      <mesh geometry={tinta}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={transp} opacity={o} />
      </mesh>
      <group position={fin} quaternion={q}>
        <mesh>
          <coneGeometry args={[grueso * 2.6, grueso * 6, 14]} />
          <meshBasicMaterial color={color} transparent={transp} opacity={o} />
        </mesh>
        <mesh>
          <coneGeometry args={[grueso * 2.6 + 0.0018, grueso * 6 + 0.003, 14]} />
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={transp} opacity={o} />
        </mesh>
      </group>
    </group>
  );
};
/** varios rayos que salen en los dos planos del corte, en ciclo */
const Rayos: React.FC<{t: number; on: number; camino: (phi: number, y: number) => V3[]; alturas: number[]; vel?: number; largo?: number; onda?: number; color?: string; grueso?: number; desvanece?: boolean}> = ({
  t,
  on,
  camino,
  alturas,
  vel = 0.55,
  largo = 0.35,
  onda = 0,
  color,
  grueso,
  desvanece = false,
}) => {
  if (on <= 0.01) return null;
  return (
    <group>
      {PLANOS.flatMap((phi, pi) =>
        alturas.map((y, i) => {
          const u = (t * vel + rnd(i + pi * 9) + i * 0.37) % 1;
          const uu = u * (1 + largo);
          const o = on * (desvanece ? 1 - suave((uu - 0.75) / 0.25) : 1 - suave((uu - 1.05) / 0.3));
          return <Rayo key={`${pi}-${i}`} cam={camino(phi, y)} u={uu} largo={largo} onda={onda} color={color} grueso={grueso} o={o} />;
        }),
      )}
    </group>
  );
};

// ---------- escenario: mesa del desayuno ----------
const Mesa: React.FC = () => (
  <group>
    {/* pared */}
    <mesh position={[0, 1.4, -0.6]} receiveShadow>
      <planeGeometry args={[7, 3]} />
      <meshToonMaterial color="#cfe7df" gradientMap={gradiente()} />
    </mesh>
    <mesh position={[0, 0.12, -0.598]} receiveShadow>
      <planeGeometry args={[7, 0.5]} />
      <meshToonMaterial color="#9fcbbf" gradientMap={gradiente()} />
    </mesh>
    <Redondeada w={7} h={0.03} d={0.03} radio={0.01} position={[0, 0.38, -0.585]} color="#ffffff" contorno={false} />
    {/* ventana con cortinas */}
    <group position={[0.55, 0.95, -0.59]}>
      <Redondeada w={0.8} h={0.72} d={0.04} radio={0.012} color="#ffffff" />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.7, 0.62]} />
        <meshBasicMaterial color="#bfe6ff" />
      </mesh>
      <Esfera r={0.07} position={[0.18, 0.14, 0.03]} color="#ffe27a" contorno={false} />
      <Esfera r={0.09} escala={[1.8, 0.6, 0.4]} position={[-0.15, 0.17, 0.03]} color="#ffffff" contorno={false} />
      <Caja w={0.02} h={0.62} d={0.02} position={[0, 0, 0.035]} color="#ffffff" />
      <Caja w={0.7} h={0.02} d={0.02} position={[0, 0, 0.035]} color="#ffffff" />
      <Redondeada w={0.2} h={0.8} d={0.04} radio={0.02} position={[-0.47, -0.02, 0.06]} color="#f28c6b" />
      <Redondeada w={0.2} h={0.8} d={0.04} radio={0.02} position={[0.47, -0.02, 0.06]} color="#f28c6b" />
      <Cilindro r={0.012} h={1.25} position={[0, 0.42, 0.07]} rotation={[0, 0, Math.PI / 2]} color="#c99a6b" />
    </group>
    {/* cuadro */}
    <group position={[-0.62, 0.92, -0.59]}>
      <Redondeada w={0.34} h={0.42} d={0.03} radio={0.01} color="#f2c14e" />
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.27, 0.35]} />
        <meshBasicMaterial color="#fff6e3" />
      </mesh>
      <Esfera r={0.06} escala={[1, 1, 0.3]} position={[0, 0.03, 0.025]} color="#e5333b" contorno={false} />
      <Caja w={0.012} h={0.12} d={0.01} position={[0, -0.07, 0.025]} color="#4fae6a" contorno={false} />
    </group>
    {/* mesa de madera */}
    <Redondeada w={3} h={0.05} d={1.0} radio={0.015} position={[0, -0.025, -0.1]} color="#d9a66b" />
    {[-0.3, -0.1, 0.1, 0.3].map((z) => (
      <mesh key={z} position={[0, 0.0005, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.004]} />
        <meshBasicMaterial color="#c08d55" />
      </mesh>
    ))}
    <Caja w={3} h={0.9} d={0.9} position={[0, -0.5, -0.12]} color="#b9834c" contorno={false} />
    {/* mantel individual */}
    <Redondeada w={0.62} h={0.006} d={0.42} radio={0.003} position={[0.05, 0.003, 0.0]} color="#f6efe2" contorno={false} />
    {/* taza */}
    <group position={[-0.32, 0, -0.12]}>
      <Torno perfil={[[0, 0], [0.045, 0], [0.05, 0.01], [0.052, 0.09], [0.047, 0.09], [0.044, 0.012], [0, 0.012]]} color="#ffffff" />
      <Cilindro r={0.044} h={0.004} position={[0, 0.075, 0]} color="#7a4523" contorno={false} />
      <Toro r={0.025} tubo={0.007} position={[-0.055, 0.05, 0]} color="#ffffff" />
      <SombraContacto position={[0, 0.001, 0]} w={0.16} d={0.16} o={0.3} />
    </group>
    {/* plato con pan dulce */}
    <group position={[-0.3, 0, 0.12]}>
      <Cilindro r={0.09} r2={0.07} h={0.012} position={[0, 0.006, 0]} color="#e9f4f6" />
      <Esfera r={0.055} escala={[1, 0.55, 1]} position={[0, 0.025, 0]} color="#e9b46a" />
      <Esfera r={0.05} escala={[1, 0.35, 1]} position={[0, 0.042, 0]} color="#f7e3c8" />
    </group>
    {/* maceta */}
    <group position={[0.42, 0, -0.35]}>
      <Torno perfil={[[0, 0], [0.05, 0], [0.065, 0.11], [0, 0.11]]} color="#e07a4f" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Esfera key={i} r={0.04} escala={[0.6, 1.4, 0.3]} position={[Math.sin(i * 1.3) * 0.03, 0.17 + (i % 2) * 0.03, Math.cos(i * 1.3) * 0.03]} color="#4fae6a" />
      ))}
    </group>
  </group>
);

// ---------- el termo ----------
const colorMezcla = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), cl(k)).getStyle();
const calorExterior = (t: number) => (t < 0.75 ? 0 : r(t, ev.pero1 + 1.5, 3) * (1 - r(t, ev.segunda, 0.8)) + r(t, ev.caliente2 - 0.8, 1.5));

const BotellaExt: React.FC<{t: number}> = ({t}) => {
  const k = calorExterior(t);
  const color = colorMezcla('#3fb0a6', '#ff6b4a', k * 0.75);
  return (
    <group>
      <Cortada perfil={PERFIL_EXT} color={color} colorCorte="#8b95a2" />
      <mesh position={[0, 0.0065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0985, 64, CORTE0 + Math.PI / 2, CORTE_L]} />
        <meshToonMaterial color={color} gradientMap={gradiente()} />
      </mesh>
      {/* franjas decorativas */}
      {[0.06, 0.29].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.1065, 0.1065, 0.012, 96, 1, true, CORTE0, CORTE_L]} />
          <meshToonMaterial color="#f2f0e6" gradientMap={gradiente()} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const BotellaInt: React.FC<{t: number}> = ({t}) => {
  const espejo = r(t, ev.brillante - 0.3, 0.6) + (t < 0.75 ? 1 : 0);
  const flash = ventana(t, ev.brillante - 0.2, ev.brillante + 0.9, 0.3);
  return <Cortada perfil={PERFIL_INT} color={colorMezcla('#c3cbd5', '#e8eef4', espejo)} colorCorte="#8b95a2" brillo={flash * 0.25} />;
};

/** recubrimiento espejo en las dos caras del hueco */
const Recubrimiento: React.FC<{t: number}> = ({t}) => {
  if (!visible(t, ev.brillante - 0.2)) return null;
  const k = t < 0.75 ? 1 : r(t, ev.brillante - 0.2, 0.7);
  const flash = ventana(t, ev.brillante - 0.2, ev.brillante + 0.9, 0.3);
  const h0 = 0.045;
  const h1 = 0.045 + (0.315 - 0.045) * k;
  return (
    <group>
      <Cortada perfil={capa(0.0702, 0.0735, h0, h1)} color="#f4fbff" colorCorte="#ffffff" brillo={0.35 + flash * 0.5} contorno={false} />
      <Cortada perfil={capa(0.0955, 0.0988, h0 - 0.03, h1)} color="#f4fbff" colorCorte="#ffffff" brillo={0.35 + flash * 0.5} contorno={false} />
    </group>
  );
};

/** estrellitas de brillo */
const Destellos: React.FC<{t: number; desde: number; puntos: V3[]; dur?: number}> = ({t, desde, puntos, dur = 1.6}) => {
  if (!entre(t, desde, desde + dur)) return null;
  return (
    <group>
      {puntos.map((p, i) => {
        const k = cl((t - desde - i * 0.12) / 0.7);
        const s = Math.sin(k * Math.PI) * 0.022;
        if (s <= 0.001) return null;
        return (
          <group key={i} position={p} rotation={[0, 0, k * 1.5]}>
            <Caja w={s * 0.25} h={s * 2} d={0.002} color="#ffffff" contorno={false} sombra={false} />
            <Caja w={s * 2} h={s * 0.25} d={0.002} color="#ffffff" contorno={false} sombra={false} />
          </group>
        );
      })}
    </group>
  );
};

const Cafe: React.FC<{t: number}> = ({t}) => {
  const interior = hayInterior(t) && (t < 0.75 || t > ev.adentro + 0.1);
  if (interior) {
    return (
      <group>
        <Cortada perfil={[[0, 0.041], [0.0632, 0.041], [0.0632, ALTO_CAFE], [0, ALTO_CAFE]]} color="#8a5027" colorCorte="#a2622f" contorno={false} />
        <mesh position={[0, ALTO_CAFE + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.063, 48, CORTE0 + Math.PI / 2, CORTE_L]} />
          <meshToonMaterial color="#c58b4f" gradientMap={gradiente()} />
        </mesh>
      </group>
    );
  }
  const lleno = r(t, ev.cafe, 1.3) * (1 - r(t, ev.adentro - 0.25, 0.3));
  if (lleno <= 0.01) return null;
  const h = 0.006 + (ALTO_CAFE - 0.006) * lleno;
  return (
    <group>
      <Cortada perfil={[[0, 0.006], [0.0985, 0.006], [0.0985, h], [0, h]]} color="#8a5027" colorCorte="#a2622f" contorno={false} />
      <mesh position={[0, h + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.098, 48, CORTE0 + Math.PI / 2, CORTE_L]} />
        <meshToonMaterial color="#c58b4f" gradientMap={gradiente()} />
      </mesh>
    </group>
  );
};

/** chorrito de café que cae al servir */
const Servir: React.FC<{t: number}> = ({t}) => {
  const on = t > 0.75 ? ventana(t, ev.cafe - 0.15, ev.cafe + 1.5, 0.15) : 0;
  if (on <= 0.01) return null;
  const nivel = 0.006 + (ALTO_CAFE - 0.006) * r(t, ev.cafe, 1.3);
  const top = 0.75;
  const fin = top - (top - nivel) * r(t, ev.cafe - 0.15, 0.2);
  const ini = top - (top - nivel) * r(t, ev.cafe + 1.2, 0.3);
  return (
    <group>
      <Cilindro r={0.011 * on} h={ini - fin} position={[0, (ini + fin) / 2, 0]} color="#7a4523" />
      {/* jarra */}
      <group position={[0.06, top + 0.06, 0]} rotation={[0, 0, 1.0]}>
        <Torno perfil={[[0, 0], [0.06, 0], [0.065, 0.13], [0.035, 0.17], [0, 0.17]]} color="#e5333b" />
      </group>
    </group>
  );
};

/** aire en la doble pared: moléculas que circulan llevando el calor */
const MOLECULAS = Array.from({length: 28}, (_, i) => ({plano: i % 2, fase: rnd(i + 3), vel: 0.12 + rnd(i + 40) * 0.08, sal: rnd(i + 70)}));
const lazo = (s: number): [number, number] => {
  // rectángulo dentro del hueco: sube junto a la pared caliente, baja junto a la fría
  const ri = 0.0745;
  const re = 0.0945;
  const y0 = 0.05;
  const y1 = 0.31;
  const H = y1 - y0;
  const Wd = re - ri;
  const tot = 2 * H + 2 * Wd;
  let d = (((s % 1) + 1) % 1) * tot;
  if (d < H) return [ri, y0 + d];
  d -= H;
  if (d < Wd) return [ri + d, y1];
  d -= Wd;
  if (d < H) return [re, y1 - d];
  d -= H;
  return [re - d, y0];
};
const Aire: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75 || t < ev.espacio + 0.3) return null;
  const mueve = r(t, ev.pero2 + 0.6, 0.8);
  const salida = (m: (typeof MOLECULAS)[0]) => ev.sacas + 0.2 + m.sal * 2.4;
  const entrada = (m: (typeof MOLECULAS)[0]) => ev.aire - 0.2 + m.sal * 1.4;
  const finVacio = ev.vacio3 - 1.2;
  return (
    <group>
      {MOLECULAS.map((m, i) => {
        const phi = PLANOS[m.plano];
        const s = m.fase + (t - ev.pero2) * m.vel * mueve;
        let [rr, y] = lazo(s);
        let esc = t < ev.espacio + 0.9 ? r(t, ev.espacio + 0.3 + m.sal * 0.4, 0.4) : 1;
        if (t < finVacio) {
          // la bomba las saca por abajo
          const k = r(t, salida(m), 0.55);
          if (k >= 0.99) return null;
          rr = rr + (0.102 - rr) * k;
          y = y + (0.02 - y) * k;
          esc *= 1 - k * 0.6;
        } else {
          // se mete aire por una fisura
          if (t < entrada(m)) return null;
          const k = r(t, entrada(m), 0.7);
          rr = 0.104 + (rr - 0.104) * k;
          y = 0.02 + (y - 0.02) * k;
        }
        const calor = cl((0.0945 - rr) / 0.02) * mueve;
        const color = colorMezcla('#7fc6ff', '#ff8a3d', t > finVacio ? 0.8 : calor);
        return <Esfera key={i} r={0.0055 * esc} position={enPlano(phi, rr, y)} color={color} />;
      })}
    </group>
  );
};

/** relleno del hueco: amarillo cuando lo presentamos, azulito con aire */
const Hueco: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75) return null;
  const marca = ventana(t, ev.espacio - 0.1, ev.doble + 1.2, 0.3) * (0.5 + 0.25 * Math.sin(t * 9));
  const aire = aireHueco(t) * 0.25;
  const vacioMarca = ventana(t, ev.vacio1 - 0.3, ev.vacio1 + 1.4, 0.3) * 0.35;
  const o = Math.max(marca, aire, vacioMarca);
  if (o <= 0.02 || !hayInterior(t)) return null;
  const color = marca >= aire && marca >= vacioMarca ? '#ffe066' : vacioMarca > aire ? '#283a5e' : '#a8dcff';
  return <Cortada perfil={PERFIL_HUECO} color={color} colorCorte={color} opacity={o} contorno={false} />;
};

/** bomba que saca el aire */
const Bomba: React.FC<{t: number}> = ({t}) => {
  const on = t > 0.75 ? ventana(t, ev.sacas - 0.4, ev.vacio1 - 0.5, 0.4) : 0;
  if (on <= 0.01) return null;
  const palanca = entre(t, ev.sacas, ev.cruzar) ? 0.04 * Math.abs(Math.sin((t - ev.sacas) * 5)) : 0;
  const nip = enPlano(1.3, 0.106, 0.03);
  return (
    <group>
      <group position={[0.3, 0, 0.14]} scale={on}>
        <Cilindro r={0.032} h={0.15} position={[0, 0.075, 0]} color="#e5333b" />
        <Redondeada w={0.12} h={0.012} d={0.06} radio={0.005} position={[0, 0.006, 0]} color="#2b2d33" />
        <Cilindro r={0.006} h={0.08} position={[0, 0.15 + 0.04 - palanca, 0]} color="#c9ced8" />
        <Redondeada w={0.13} h={0.02} d={0.024} radio={0.008} position={[0, 0.19 + 0.04 - palanca, 0]} color="#2b2d33" />
      </group>
      <Tubo3 puntos={[[nip[0] + 0.005, nip[1], nip[2]], [0.16, 0.012, 0.07], [0.24, 0.012, 0.13], [0.3 - 0.03, 0.03, 0.14]]} r={0.006 * on} color="#2b2d33" />
      <Cilindro r={0.008} h={0.02} position={nip} rotation={[0, 0, Math.PI / 2]} color="#9aa4b0" />
    </group>
  );
};
const Tubo3: React.FC<{puntos: V3[]; r: number; color: string}> = ({puntos, r: rr, color}) => {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
    return {a: new THREE.TubeGeometry(c, 40, rr, 10, false), b: new THREE.TubeGeometry(c, 40, rr + 0.002, 10, false)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos), rr]);
  if (rr <= 0.0005) return null;
  return (
    <group>
      <mesh geometry={geo.a} castShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} />
      </mesh>
      <mesh geometry={geo.b}>
        <MatTinta />
      </mesh>
    </group>
  );
};

/** tapón grueso con empaque de hule */
const Tapon: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  if (!visible(t, ev.tapon1 - 0.1)) return null;
  const s = t < 0.75 ? 1 : spring({frame: (t - ev.tapon1 + 0.1) * fps, fps, config: {damping: 12, stiffness: 150, mass: 0.8}});
  const empaque = visible(t, ev.hule - 0.1);
  const brilla = ventana(t, ev.hule - 0.1, ev.hule + 0.9, 0.2);
  return (
    <group position={[0, (1 - s) * 0.3, 0]}>
      <Cortada
        perfil={[
          [0, 0.395],
          [0.044, 0.395],
          [0.046, 0.402],
          [0.046, 0.445],
          [0.064, 0.445],
          [0.066, 0.452],
          [0.066, 0.49],
          [0.06, 0.497],
          [0, 0.497],
        ]}
        color="#3d4450"
        colorCorte="#5b6372"
      />
      {/* asa del tapón */}
      <Redondeada w={0.075} h={0.02} d={0.016} radio={0.007} position={[0, 0.505, 0]} color="#3d4450" />
      {empaque && (
        <Brota t={t} desde={ev.hule - 0.1} position={[0, 0.433, 0]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Toro r={0.048} tubo={0.0055} color={brilla > 0.1 ? '#ffb070' : '#e8743b'} />
          </group>
        </Brota>
      )}
    </group>
  );
};

/** puente (unión) entre las dos paredes por donde se fuga el calor */
const Puentes: React.FC<{t: number}> = ({t}) => {
  const on = t > 0.75 ? ventana(t, ev.unirse - 0.3, ev.unen + 0.2, 0.3) : 0;
  if (on <= 0.01) return null;
  const rojo = r(t, ev.fuga - 0.6, 0.5);
  return (
    <group>
      {[CORTE0 + 0.04, CORTE0 + CORTE_L - 0.04].map((phi, i) => (
        <group key={i} position={enPlano(phi, 0.085, 0.17)} rotation={[0, phi - Math.PI / 2, 0]} scale={on}>
          <Caja w={0.032} h={0.02} d={0.02} color={colorMezcla('#9aa4b0', '#ff5a3c', rojo)} />
        </group>
      ))}
    </group>
  );
};

/** anillo que marca la unión en el cuello */
const UnionCuello: React.FC<{t: number}> = ({t}) => {
  const on = t > 0.75 ? ventana(t, ev.unen - 0.1, ev.delgado + 1.0, 0.3) : 0;
  if (on <= 0.01) return null;
  const pulso = 0.5 + 0.5 * Math.sin(t * 8);
  return (
    <group position={[0, 0.405, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.9 + 0.1 * on}>
      <mesh>
        <torusGeometry args={[0.056, 0.006 + 0.002 * pulso, 14, 64, CORTE_L]} />
        <meshBasicMaterial color="#ffd34d" transparent opacity={on} />
      </mesh>
    </group>
  );
};

/** soportes chiquitos en el fondo */
const Soportes: React.FC<{t: number}> = ({t}) => {
  const marca = ventana(t, ev.nada - 0.6, ev.nada + 0.9, 0.2);
  return (
    <group>
      {[CORTE0 + 0.12, CORTE0 + CORTE_L - 0.12, 3.4].map((phi, i) => (
        <Brota key={i} t={t} desde={ev.soportes + i * 0.12} position={enPlano(phi, 0.045, 0.006)}>
          <mesh position={[0, 0.0145, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.01, 0.029, 20]} />
            <meshToonMaterial color={marca > 0.3 ? '#ffe680' : '#ffb020'} gradientMap={gradiente()} />
          </mesh>
          <mesh position={[0, 0.0145, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.0118, 0.0325, 20]} />
            <MatTinta />
          </mesh>
        </Brota>
      ))}
    </group>
  );
};

/** estrella de golpe al chocar */
const Golpe: React.FC<{t: number}> = ({t}) => {
  const k = cl((t - ev.choca) / 0.5);
  if (t < ev.choca || k >= 1) return null;
  const s = Math.sin(k * Math.PI) * 0.06;
  return (
    <group>
      {PLANOS.map((phi, i) => (
        <group key={i} position={enPlano(phi, 0.045, 0.02)} rotation={[0, phi, k * 2]}>
          {[0, 1, 2, 3].map((j) => (
            <Caja key={j} w={s * 0.2} h={s * 1.8} d={0.002} rotation={[0, 0, (j * Math.PI) / 4]} color={j % 2 ? '#ffd34d' : '#ff4d3d'} contorno={false} sombra={false} />
          ))}
        </group>
      ))}
    </group>
  );
};

/** grietita en el fondo (por donde entra el aire al final) */
const Grieta: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75 || t < ev.aire - 0.5) return null;
  const p = enPlano(1.3, 0.106, 0.02);
  return (
    <group position={p} rotation={[0, 1.3, 0]}>
      <Caja w={0.002} h={0.025} d={0.004} rotation={[0, 0, 0.5]} color="#15161c" contorno={false} />
      <Caja w={0.002} h={0.018} d={0.004} position={[0, 0.012, 0]} rotation={[0, 0, -0.6]} color="#15161c" contorno={false} />
    </group>
  );
};

// ---------- flujos de calor ----------
const Calor: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75) return null;
  const directo = ventana(t, ev.pero1 + 0.3, ev.segunda - 0.2, 0.4);
  const conv = ventana(t, ev.calienta - 0.4, ev.sacas, 0.4);
  const bloq = ventana(t, ev.sinAire - 0.2, ev.vacio1 + 0.6, 0.4);
  const luz = ventana(t, ev.pero3 + 0.4, ev.asi4 + 1.6, 0.4);
  const rebota = ventana(t, ev.rebota - 0.4, ev.pero4 - 0.1, 0.4);
  const arriba = ventana(t, ev.pero4 + 0.3, ev.tapon1 + 0.2, 0.3);
  const tapado = ventana(t, ev.tapon1 + 0.4, ev.tapon2 + 0.4, 0.3);
  const puente = ventana(t, ev.fuga - 0.7, ev.unen - 0.1, 0.3);
  const cuello = ventana(t, ev.unen + 0.6, ev.angosta + 1.2, 0.3);
  const final = ventana(t, ev.caliente2 - 0.4, 99, 0.4);
  const fuera = (phi: number, y: number): V3[] => [enPlano(phi, 0.03, y), enPlano(phi, 0.2, y)];
  return (
    <group>
      <Rayos t={t} on={directo} alturas={[0.08, 0.17, 0.26]} camino={fuera} />
      <Rayos t={t} on={conv} alturas={[0.12, 0.24]} camino={(phi, y) => [enPlano(phi, 0.106, y), enPlano(phi, 0.2, y)]} largo={0.5} grueso={0.003} />
      <Rayos t={t} on={bloq} alturas={[0.1, 0.2, 0.28]} camino={(phi, y) => [enPlano(phi, 0.025, y), enPlano(phi, 0.072, y)]} largo={0.45} desvanece />
      <Rayos t={t} on={luz} alturas={[0.1, 0.19, 0.27]} camino={fuera} onda={0.008} color="#ff3d7a" grueso={0.0028} />
      <Rayos t={t} on={rebota} alturas={[0.11, 0.24]} camino={(phi, y) => [enPlano(phi, 0.025, y), enPlano(phi, 0.096, y + 0.025), enPlano(phi, 0.025, y + 0.05)]} onda={0.005} color="#ff3d7a" grueso={0.0028} largo={0.3} />
      <Rayos t={t} on={arriba} alturas={[-0.025, 0.0, 0.025]} camino={(phi, y) => [[y * 0.4 + Math.sin(phi) * 0.02, ALTO_CAFE + 0.01, y + Math.cos(phi) * 0.02], [y * 0.6 + Math.sin(phi) * 0.02, 0.62, y + Math.cos(phi) * 0.02]]} vel={0.5} />
      <Rayos t={t} on={tapado} alturas={[-0.02, 0.02]} camino={(phi, y) => [[y + Math.sin(phi) * 0.01, ALTO_CAFE + 0.01, Math.cos(phi) * 0.01], [y + Math.sin(phi) * 0.01, 0.395, Math.cos(phi) * 0.01]]} desvanece largo={0.5} />
      <Rayos t={t} on={puente} alturas={[0.17]} camino={(phi, y) => [enPlano(phi + (phi > 0.5 ? 0.04 : 0.04), 0.03, y), enPlano(phi + 0.04, 0.2, y)]} vel={0.8} grueso={0.0045} />
      <Rayos t={t} on={cuello} alturas={[0.2]} camino={(phi, y) => [enPlano(phi, 0.0605, y), enPlano(phi, 0.0605, 0.315), enPlano(phi, 0.049, 0.38), enPlano(phi, 0.049, 0.405), enPlano(phi, 0.08, 0.405)]} vel={0.35} grueso={0.0025} largo={0.25} desvanece />
      <Rayos t={t} on={final} alturas={[0.08, 0.17, 0.26]} camino={fuera} />
    </group>
  );
};

/** mano que toca la botella */
const Mano: React.FC<{t: number}> = ({t}) => {
  const toque = (a: number, b: number) => r(t, a, 0.45) * (1 - r(t, b, 0.4));
  const llega = t > 0.75 ? Math.max(toque(ev.tibio - 0.2, ev.segunda - 0.5), toque(ev.dia, ev.aire - 0.4)) : 0;
  if (llega <= 0.01) return null;
  const quita = r(t, ev.quema - 0.05, 0.15) * (t < ev.segunda ? 1 : 0) + (t > ev.dia ? r(t, ev.caliente2 + 0.1, 0.15) : 0);
  const sep = (1 - llega) * 0.5 + cl(quita) * 0.08;
  const tiembla = cl(quita) * 0.006 * Math.sin(t * 50);
  return (
    <group position={[0.15 + sep * 0.7 + tiembla, 0.2 + sep * 0.4, 0.03 + sep * 0.4]} rotation={[0, -0.25, -0.95]}>
      <Cilindro r={0.032} r2={0.03} h={0.2} position={[0, 0.13, 0]} color="#f0c09a" />
      <Cilindro r={0.046} r2={0.042} h={0.3} position={[0, 0.38, 0]} color="#e5a13a" />
      <Toro r={0.042} tubo={0.008} position={[0, 0.235, 0]} rotation={[Math.PI / 2, 0, 0]} color="#c98420" />
      <Redondeada w={0.07} h={0.075} d={0.034} radio={0.015} position={[0, 0.0, 0]} color="#f0c09a" />
      {[-0.024, -0.008, 0.008, 0.024].map((x) => (
        <Redondeada key={x} w={0.014} h={0.046} d={0.017} radio={0.0065} position={[x, -0.055, 0.008]} rotation={[0.2, 0, 0]} color="#f0c09a" />
      ))}
      <Redondeada w={0.014} h={0.038} d={0.017} radio={0.0065} position={[0.042, -0.008, 0.008]} rotation={[0, 0, -0.6]} color="#f0c09a" />
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const c = caida(t);
  const vapor = t < 0.75 ? 0 : r(t, ev.cafe + 0.8, 0.8) * (1 - r(t, ev.tapon1, 0.3)) * (entre(t, ev.adentro - 0.4, ev.adentro + 0.6) ? 0.2 : 1) * (0.55 + 0.45 * ventana(t, ev.pero4, ev.tapon1, 0.3));
  return (
    <>
      <Camara t={t} />
      <hemisphereLight args={['#fff6e6', '#b9a99a', 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[1.2, 2.4, 1.9]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-1.2}
        shadow-camera-right={1.2}
        shadow-camera-top={1.2}
        shadow-camera-bottom={-1.2}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <directionalLight position={[-2.2, 1.2, 0.5]} intensity={0.35} color="#dff1ff" />
      <Mesa />
      <SombraContacto position={[0, 0.002, 0]} w={0.32 - c.y * 0.4} d={0.32 - c.y * 0.4} o={0.3} />
      <group position={[0, c.y, 0]} rotation={[0, 0, c.gira * 0.4]}>
        <Pieza t={t} desde={0.8} dir={[0.4, 0.3, 1]}>
          <BotellaExt t={t} />
        </Pieza>
        <Hueco t={t} />
        <Pieza t={t} desde={ev.adentro - 0.3} dir={[-0.5, 0.6, 0.8]} caida={0.45}>
          <group position={[0, -0.027 * c.hunde, 0]}>
            <BotellaInt t={t} />
            <Recubrimiento t={t} />
          </group>
        </Pieza>
        <group position={[0, hayInterior(t) ? -0.027 * c.hunde : 0, 0]}>
          <Cafe t={t} />
        </group>
        <Aire t={t} />
        <Puentes t={t} />
        <UnionCuello t={t} />
        <Soportes t={t} />
        <Golpe t={t} />
        <Grieta t={t} />
        <Tapon t={t} />
        <Calor t={t} />
        <Destellos t={t} desde={ev.brillante - 0.1} puntos={[enPlano(PLANOS[0], 0.072, 0.12), enPlano(PLANOS[1], 0.097, 0.22), enPlano(PLANOS[0], 0.097, 0.27), enPlano(PLANOS[1], 0.072, 0.08), [0.0, 0.2, 0.05]]} />
        <Chorro t={t} on={vapor} p={[0, BOCA + 0.01, 0]} largo={0.22} r1={0.035} />
      </group>
      <Servir t={t} />
      <Bomba t={t} />
      <Mano t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.termo - 0.2, 'ya tienes un termo', false],
  [ev.tibio - 0.3, 'en media hora: tibio', true],
  [ev.quema - 0.1, '¡y la botella quema!', true],
  [ev.doble - 0.3, 'la doble pared', false],
  [ev.calienta - 0.3, 'el aire lleva el calor', true],
  [ev.sacas - 0.2, 'le sacas el aire', false],
  [ev.vacio1 - 0.3, 'el vacío', false],
  [ev.invisible - 0.4, 'luz invisible', true],
  [ev.brillante - 0.3, 'brillante, como espejo', false],
  [ev.recubrimiento - 0.3, 'el recubrimiento', false],
  [ev.boca - 0.6, 'se escapa por la boca', true],
  [ev.hule - 0.4, 'empaque de hule', false],
  [ev.tapon2 - 0.2, 'el tapón', false],
  [ev.fuga - 0.3, 'se fuga por la unión', true],
  [ev.cuello1 - 0.3, 'solo en el cuello', false],
  [ev.delgado - 0.5, 'por eso es delgado', false],
  [ev.choca - 0.1, '¡choca!', true],
  [ev.soportes - 0.2, 'soportes chiquitos', false],
  [ev.caliente2 - 0.3, '¿caliente por fuera?', true],
  [ev.vacio3 - 0.4, 'entró aire al vacío', true],
  [ev.arreglo - 0.3, 'ya no tiene arreglo', true],
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
        fontSize: 76,
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

/** temperatura del café */
const tempCafe = (t: number) => {
  if (t < ev.cafe + 0.4) return 85;
  if (t < ev.segunda) return 85 - 43 * r(t, ev.pero1 + 1.8, ev.tibio - ev.pero1 - 1.6);
  if (t < ev.caliente2 - 0.5) return 85;
  return 85 - 35 * r(t, ev.caliente2 - 0.4, 3);
};
const Medidores: React.FC<{t: number}> = ({t}) => {
  if (t < ev.cafe + 0.4) return null;
  const f = fugaCalor(t);
  const alta = f > 0.8;
  const c = tempCafe(t);
  return (
    <>
      <Termometro x={950} valor={f} color={alta ? '#e5333b' : '#ff9f43'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="fuga" />
      <Termometro x={830} valor={(c - 10) / 85} color={c < 55 ? '#7fc6ff' : '#ff6b3d'} arriba={`${Math.round(c)}°`} nombre="café" />
    </>
  );
};

/** como la luz del sol cruza el espacio */
const SolTierra: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.igual - 0.2;
  const b = ev.asi4 - 0.1;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fase = (t - a) * 220;
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: 1200, height: 230, borderRadius: 34, background: '#1d2440', border: '6px solid #15161c', overflow: 'hidden', opacity: o, transform: `scale(${0.85 + 0.15 * s})`}}>
      {Array.from({length: 22}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: `${rnd(i) * 100}%`, top: `${rnd(i + 30) * 100}%`, width: 5, height: 5, borderRadius: 3, background: '#ffffff', opacity: 0.7}} />
      ))}
      <div style={{position: 'absolute', left: 30, top: 45, width: 140, height: 140, borderRadius: 70, background: '#ffd34d', border: '6px solid #15161c', boxShadow: '0 0 40px #ffcf3d'}} />
      <svg style={{position: 'absolute', left: 175, top: 70, width: 540, height: 90}} viewBox="0 0 540 90">
        {[20, 45, 70].map((y, i) => (
          <path
            key={i}
            d={Array.from({length: 55}, (_, j) => `${j === 0 ? 'M' : 'L'}${j * 10},${y + Math.sin((j * 10 - fase + i * 30) / 14) * 9}`).join(' ')}
            stroke="#ff3d7a"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="540"
            strokeDashoffset={540 * (1 - cl((t - a - 0.2) / 0.9))}
          />
        ))}
      </svg>
      <div style={{position: 'absolute', right: 30, top: 70, width: 90, height: 90, borderRadius: 45, background: 'radial-gradient(circle at 35% 35%, #7fd0ff, #2f7fd6)', border: '6px solid #15161c', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 14, top: 18, width: 40, height: 28, borderRadius: 14, background: '#4fae6a'}} />
        <div style={{position: 'absolute', left: 46, top: 52, width: 30, height: 20, borderRadius: 10, background: '#4fae6a'}} />
      </div>
    </div>
  );
};

export const Termo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#cfe7df'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(40,55,50,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <SolTierra t={t} />
      <Audio src={staticFile('termo/voz.wav')} />
      <Audio src={staticFile('termo/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_TERMO = (datos as any).duration as number;
