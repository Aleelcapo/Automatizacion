import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/lata.json';
import {Caja, Cilindro, Esfera, GROSOR, gradiente, Papel, Redondeada, SombraContacto, Torno, Toro} from './toon';
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
  tubo: T('tubo'),
  arriba: T('arriba'),
  abajo: T('abajo'),
  lata1: T('lata', 1),
  pero1: T('pero', 1),
  refresco: T('refresco'),
  gas1: T('gas', 1),
  empuja1: T('empuja', 1),
  infla: T('infla'),
  derecha: T('derecha'),
  asi1: T('así', 1),
  hundes: T('hundes'),
  domo1: T('domo', 1),
  arco: T('arco'),
  domo2: T('domo', 2),
  pero2: T('pero', 2),
  papel: T('papel'),
  aplastan: T('aplastan'),
  gruesas: T('gruesas'),
  gas2: T('gas', 2),
  empujarlas: T('empujarlas'),
  duras: T('duras'),
  cerrada: T('cerrada'),
  aguanta2: T('aguanta', 2),
  vacia: T('vacía'),
  pero3: T('pero', 3),
  gruesa: T('gruesa'),
  caro: T('caro'),
  asi3: T('así', 3),
  angosta: T('angosta'),
  chiquita: T('chiquita'),
  cuello: T('cuello'),
  pero4: T('pero', 4),
  abrelatas: T('abrelatas'),
  marcas: T('marcas'),
  palanca: T('palanca'),
  remachada1: T('remachada', 1),
  levantarla: T('levantarla'),
  rompe: T('rompe'),
  lengueta1: T('lengüeta', 1),
  aro: T('aro'),
  apilen: T('apilen'),
  resbalar: T('resbalar'),
  pero5: T('pero', 5),
  suelta: T('suelta'),
  basura: T('basura'),
  animales: T('animales'),
  remachada2: T('remachada', 2),
  dobla: T('dobla'),
  separa: T('separa'),
  si2: T('si', 2),
  inflado: T('inflado'),
  tomes: T('tomes'),
  bien: T('bien'),
};

// ---------- geometría ----------
const R = 0.08;
const ALTO = 0.3;
const ARO = 0.062;
const PHI_C = 0.4; // centro de la cuña cortada (hacia la cámara)
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

/** cuánto está cortada la lata (0 = entera) */
const corte = (t: number) => {
  if (t < 0.75) return 0;
  return Math.max(ventana(t, ev.pero1 - 0.1, ev.pero2 + 0.1, 0.5), ventana(t, ev.gas2 - 0.6, ev.cerrada - 0.2, 0.5), ventana(t, ev.pero3 - 0.1, ev.pero4 + 0.1, 0.5), ventana(t, ev.si2 - 0.3, 99, 0.5));
};
/** altura del centro del fondo: <0 inflado hacia afuera, >0 domo hacia adentro */
const centroFondo = (t: number) => {
  if (t < 0.75) return 0.045;
  if (t < ev.infla - 0.4) return 0;
  if (t < ev.hundes) return -0.03 * r(t, ev.infla - 0.4, 0.8);
  if (t < ev.inflado - 0.6) return -0.03 + 0.075 * r(t, ev.hundes, 0.5);
  return 0.045 - 0.075 * r(t, ev.inflado - 0.6, 0.8);
};
const radioCuello = (t: number) => (t < 0.75 || t > ev.angosta + 0.6 ? 0.066 : 0.078 - 0.012 * r(t, ev.angosta - 0.2, 0.7));
const grosorTapa = (t: number) => (t < 0.75 ? 1 : 1 + 2.2 * ventana(t, ev.gruesa - 0.3, ev.asi3 + 0.2, 0.4));
const presion = (t: number) => {
  if (t < ev.gas1 - 0.2) return 0;
  const p = r(t, ev.gas1 - 0.2, 1.5) * 0.9;
  const vacio = ventana(t, ev.pero2, ev.gas2, 0.3); // mientras hablamos de la lata vacía, baja
  const abierta = t > ev.rompe ? r(t, ev.rompe, 0.5) * (1 - r(t, ev.si2 - 0.5, 0.8)) : 0;
  const malo = r(t, ev.inflado - 0.6, 1) * 0.1;
  return cl(p - vacio * 0.6 - abierta * 0.8 + malo);
};

const perfilCuerpo = (yc: number, rc: number): [number, number][] => {
  const pts: [number, number][] = [];
  // fondo (de eje hacia afuera)
  for (let i = 0; i <= 8; i++) {
    const rr = (ARO * i) / 8;
    pts.push([rr, yc * (1 - (rr / ARO) ** 2)]);
  }
  pts.push([ARO + 0.006, -Math.max(0, -yc) * 0]);
  pts.push([R, 0.022]);
  pts.push([R, ALTO - 0.04]);
  pts.push([(R + rc) / 2 + 0.001, ALTO - 0.018]);
  pts.push([rc, ALTO - 0.006]);
  pts.push([rc + 0.003, ALTO + 0.003]);
  pts.push([rc - 0.001, ALTO + 0.005]);
  // de regreso por dentro
  pts.push([rc - 0.003, ALTO - 0.006]);
  pts.push([(R + rc) / 2 - 0.002, ALTO - 0.02]);
  pts.push([R - 0.003, ALTO - 0.041]);
  pts.push([R - 0.003, 0.023]);
  pts.push([ARO + 0.003, 0.004]);
  for (let i = 8; i >= 0; i--) {
    const rr = ((ARO - 0.001) * i) / 8;
    pts.push([rr, yc * (1 - (rr / ARO) ** 2) + 0.003]);
  }
  return pts;
};

// ---------- cámara ----------
type K = [number, number, number, number, [number, number, number]];
const CAMARA: K[] = [
  [0.0, 1.45, 0.5, 0.35, [0, 0.16, 0]],
  [1.0, 0.95, 0.45, 0.25, [0, 0.16, 0]],
  [5.9, 0.85, 0.42, 0.15, [0, 0.15, 0]],
  [10.0, 0.9, 0.35, 0.05, [0, 0.1, 0]],
  [14.2, 0.78, 0.42, 0.04, [0, 0.08, 0]],
  [17.3, 0.82, 0.42, 0.12, [0, 0.11, 0]],
  [22.0, 1.15, 0.15, 0.2, [-0.12, 0.15, 0]],
  [28.6, 0.88, 0.42, 0.15, [0, 0.15, 0]],
  [32.6, 1.35, 0.15, 0.22, [-0.12, 0.2, 0]],
  [36.8, 0.68, 0.42, 0.45, [0, 0.27, 0]],
  [40.8, 0.8, 0.42, 0.28, [0, 0.24, 0]],
  [46.4, 0.55, 0.45, 0.95, [0, 0.29, 0.01]],
  [59.3, 1.35, 0.45, 0.2, [0, 0.3, 0]],
  [64.8, 1.0, 0.75, 0.35, [0.12, 0.08, 0.1]],
  [69.2, 0.55, 0.45, 0.95, [0, 0.29, 0.01]],
  [74.1, 0.9, 0.38, 0.06, [0, 0.12, 0]],
  [78.0, 1.2, 0.45, 0.25, [0, 0.15, 0]],
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
  const golpe = Math.max(r(t, ev.vacia - 0.02, 0.04) * (1 - r(t, ev.vacia + 0.15, 0.4)), r(t, ev.aplastan, 0.04) * (1 - r(t, ev.aplastan + 0.15, 0.4)) * 0.5);
  pos[0] += Math.sin(t * 71) * 0.02 * golpe;
  pos[1] += Math.cos(t * 63) * 0.02 * golpe;
  return {pos, obj};
};
const Camara: React.FC<{t: number}> = ({t}) => {
  const cam = useThree((s) => s.camera);
  const {pos, obj} = camara(t);
  cam.position.set(...pos);
  cam.lookAt(...obj);
  return null;
};

// ---------- piezas ----------
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
const MatTinta: React.FC = () => <meshBasicMaterial color="#15161c" side={THREE.BackSide} />;

/** pieza de revolución con cuña cortada variable */
const Corte: React.FC<{perfil: [number, number][]; k: number; color: string; colorCorte: string; opacity?: number; contorno?: boolean; brillo?: number; seg?: number}> = ({
  perfil,
  k,
  color,
  colorCorte,
  opacity = 1,
  contorno = true,
  brillo = 0,
  seg = 96,
}) => {
  const ancho = 1.7 * k;
  const ini = PHI_C + ancho / 2;
  const largo = Math.PI * 2 - ancho;
  const clave = JSON.stringify(perfil.map(([a, b]) => [Math.round(a * 2000), Math.round(b * 2000)])) + Math.round(k * 60);
  const g = useMemo(() => {
    const pts = perfil.map(([x, y]) => new THREE.Vector2(x, y));
    const cuerpo = new THREE.LatheGeometry(pts, seg, ini, largo);
    const tinta = new THREE.LatheGeometry(
      perfil.map(([x, y]) => new THREE.Vector2(x > 0 ? x + GROSOR * 0.7 : 0, y)),
      seg,
      ini - (k > 0.01 ? 0.004 : 0),
      largo + (k > 0.01 ? 0.008 : 0),
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
          return new THREE.Vector2(x + (dx / d) * 0.002, y + (dy / d) * 0.002);
        }),
      ),
    );
    return {cuerpo, tinta, cara, borde};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
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
      {k > 0.01 &&
        [ini, ini + largo].map((a, i) => (
          <group key={i} rotation={[0, a - Math.PI / 2, 0]}>
            <mesh geometry={g.cara}>
              <meshToonMaterial color={colorCorte} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={transp} opacity={opacity} depthWrite={!transp} emissive={colorCorte} emissiveIntensity={brillo} />
            </mesh>
            {contorno && (
              <mesh geometry={g.borde} position={[0, 0, i === 0 ? 0.001 : -0.001]}>
                <meshBasicMaterial color="#15161c" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        ))}
    </group>
  );
};

type V3 = [number, number, number];
const enPlano = (phi: number, rr: number, y: number): V3 => [Math.sin(phi) * rr, y, Math.cos(phi) * rr];

/** flecha recta (cuerpo + punta) de `a` hacia `b` */
const Flecha: React.FC<{a: V3; b: V3; color?: string; g?: number; o?: number}> = ({a, b, color = '#ff6a2b', g = 0.004, o = 1}) => {
  if (o <= 0.02) return null;
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const L = dir.length();
  if (L < 0.003) return null;
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const cuerpo = Math.max(0.001, L - g * 5);
  const transp = o < 0.98;
  return (
    <group position={va} quaternion={q}>
      <mesh position={[0, cuerpo / 2, 0]}>
        <cylinderGeometry args={[g, g, cuerpo, 10]} />
        <meshBasicMaterial color={color} transparent={transp} opacity={o} />
      </mesh>
      <mesh position={[0, cuerpo / 2, 0]}>
        <cylinderGeometry args={[g + 0.0016, g + 0.0016, cuerpo, 10]} />
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={transp} opacity={o} />
      </mesh>
      <mesh position={[0, cuerpo + g * 2.5, 0]}>
        <coneGeometry args={[g * 2.6, g * 5, 14]} />
        <meshBasicMaterial color={color} transparent={transp} opacity={o} />
      </mesh>
      <mesh position={[0, cuerpo + g * 2.5, 0]}>
        <coneGeometry args={[g * 2.6 + 0.0018, g * 5 + 0.003, 14]} />
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={transp} opacity={o} />
      </mesh>
    </group>
  );
};

// ---------- escenario: mesa de picnic / barra ----------
const Fondo: React.FC = () => (
  <group>
    <mesh position={[0, 1.4, -0.6]} receiveShadow>
      <planeGeometry args={[7, 3]} />
      <meshToonMaterial color="#ffd9a8" gradientMap={gradiente()} />
    </mesh>
    {/* franjas de la pared */}
    {[-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5].map((x) => (
      <mesh key={x} position={[x, 1.4, -0.599]}>
        <planeGeometry args={[0.22, 3]} />
        <meshToonMaterial color="#ffcf94" gradientMap={gradiente()} />
      </mesh>
    ))}
    {/* repisa con latas de colores */}
    <group position={[0.1, 0.62, -0.5]}>
      <Redondeada w={1.2} h={0.03} d={0.16} radio={0.008} color="#c99a6b" />
      {[
        [-0.45, '#3b7dd8'],
        [-0.3, '#4fae6a'],
        [0.25, '#f2c14e'],
        [0.4, '#a05cd6'],
      ].map(([x, c], i) => (
        <group key={i} position={[x as number, 0.015, 0]} scale={0.55}>
          <Torno perfil={[[0, 0], [0.07, 0], [0.08, 0.02], [0.08, 0.26], [0.066, 0.3], [0, 0.3]]} color={c as string} />
          <Cilindro r={0.0805} h={0.05} position={[0, 0.13, 0]} color="#ffffff" contorno={false} />
        </group>
      ))}
    </group>
    {/* ventana redonda */}
    <group position={[-0.62, 0.95, -0.59]}>
      <mesh>
        <circleGeometry args={[0.22, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[0.185, 48]} />
        <meshBasicMaterial color="#bfe6ff" />
      </mesh>
      <Esfera r={0.06} escala={[1.8, 0.6, 0.3]} position={[0.03, 0.05, 0.01]} color="#ffffff" contorno={false} />
    </group>
    {/* barra */}
    <Redondeada w={3} h={0.05} d={1.0} radio={0.015} position={[0, -0.025, -0.1]} color="#f2f0e6" />
    <Caja w={3} h={0.9} d={0.9} position={[0, -0.5, -0.12]} color="#e5333b" contorno={false} />
    {/* posavasos */}
    <Cilindro r={0.12} h={0.006} position={[0, 0.003, 0]} color="#8fd0e8" contorno={false} />
    {/* vaso con hielo */}
    <group position={[0.34, 0, -0.18]}>
      <Torno perfil={[[0, 0], [0.05, 0], [0.058, 0.15], [0.054, 0.15], [0.047, 0.006], [0, 0.006]]} color="#e9f4f6" opacity={0.85} />
      <Cilindro r={0.05} h={0.08} position={[0, 0.045, 0]} color="#ff9a2e" contorno={false} />
      <Caja w={0.03} h={0.03} d={0.03} position={[0.01, 0.09, 0]} rotation={[0.3, 0.4, 0]} color="#e8fbff" />
    </group>
    {/* papitas */}
    <group position={[-0.36, 0, 0.12]}>
      <Cilindro r={0.09} r2={0.07} h={0.04} position={[0, 0.02, 0]} color="#3b7dd8" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Esfera key={i} r={0.03} escala={[1.3, 0.25, 1]} position={[Math.sin(i * 1.7) * 0.04, 0.045 + (i % 2) * 0.008, Math.cos(i * 1.7) * 0.04]} color="#f7c64a" />
      ))}
    </group>
  </group>
);

// ---------- la lata ----------
const ROJO = '#e8343c';
const Etiq: React.FC<{k: number; yc: number}> = ({k}) => {
  const ancho = 1.7 * k;
  const ini = PHI_C + ancho / 2;
  const largo = Math.PI * 2 - ancho;
  return (
    <group>
      {/* banda blanca con ola */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[R + 0.0012, R + 0.0012, 0.05, 96, 1, true, ini, largo]} />
        <meshToonMaterial color="#ffffff" gradientMap={gradiente()} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[R + 0.0013, R + 0.0013, 0.012, 96, 1, true, ini, largo]} />
        <meshToonMaterial color="#ffd34d" gradientMap={gradiente()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Cuerpo: React.FC<{t: number; yc: number; rc: number; k: number; brillo?: number}> = ({yc, rc, k, brillo = 0}) => {
  const perfil = useMemo(() => perfilCuerpo(yc, rc), [Math.round(yc * 2000), Math.round(rc * 2000)]);
  return (
    <group>
      <Corte perfil={perfil} k={k} color={ROJO} colorCorte="#c3cbd5" brillo={brillo} />
      <Etiq k={k} yc={yc} />
    </group>
  );
};

/** tapa (con espesor variable) */
const Tapa: React.FC<{t: number; rc: number; k: number}> = ({t, rc, k}) => {
  const g = grosorTapa(t);
  const e = 0.0025 * g;
  const y = ALTO - 0.004;
  const rr = rc - 0.003;
  const marca = ventana(t, ev.gruesa - 0.3, ev.asi3 + 0.2, 0.3);
  return <Corte perfil={[[0, y - e], [rr, y - e], [rr, y + 0.004], [rr - 0.003, y + 0.004], [rr - 0.005, y], [0, y]]} k={k} color="#d3d9e0" colorCorte={marca > 0.3 ? '#ffd34d' : '#aeb7c2'} />;
};

/** refresco con burbujas (solo se ve con el corte) */
const Refresco: React.FC<{t: number; yc: number; k: number}> = ({t, yc, k}) => {
  const lleno = t < 0.75 ? 1 : r(t, ev.refresco - 0.2, 1.0);
  if (k <= 0.02 || lleno <= 0.01) return null;
  const vacia = entre(t, ev.pero2, ev.gas2) ? 1 : 0;
  if (vacia) return null;
  const h = 0.03 + (ALTO - 0.06) * lleno;
  const perfil: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const rr = ((ARO - 0.002) * i) / 8;
    perfil.push([rr, yc * (1 - (rr / ARO) ** 2) + 0.004]);
  }
  perfil.push([R - 0.0035, 0.024]);
  perfil.push([R - 0.0035, h]);
  perfil.push([0, h]);
  const p = presion(t);
  return (
    <group>
      <Corte perfil={perfil} k={k * 0.98} color="#6a2a17" colorCorte="#8a3a1f" contorno={false} opacity={0.93} />
      {Array.from({length: 22}, (_, i) => {
        const phi = PHI_C + (rnd(i) - 0.5) * 1.6 * k * 0.9;
        const rr = 0.012 + rnd(i + 5) * 0.06;
        const u = (t * (0.25 + rnd(i + 9) * 0.25) + rnd(i + 2)) % 1;
        const y = 0.03 + u * (h - 0.04);
        const s = (0.0025 + 0.003 * u) * (0.4 + p);
        return <Esfera key={i} r={s} position={[Math.sin(phi) * rr * 0.9, y, Math.cos(phi) * rr * 0.9 - 0.004]} color="#ffe2c4" contorno={false} sombra={false} />;
      })}
    </group>
  );
};

/** flechas de presión del gas (desde adentro hacia las paredes y el fondo) */
const Empuje: React.FC<{t: number; yc: number}> = ({t, yc}) => {
  const on = t < 0.75 ? 0 : Math.max(ventana(t, ev.empuja1 - 0.3, ev.asi1 + 0.4, 0.4), ventana(t, ev.empujarlas - 0.3, ev.cerrada - 0.2, 0.4), ventana(t, ev.inflado, 99, 0.4));
  if (on <= 0.01) return null;
  const pul = 0.5 + 0.5 * Math.sin(t * 7);
  const arr: [V3, V3][] = [];
  [PHI_C - 0.55, PHI_C + 0.55].forEach((phi) => {
    [0.08, 0.15, 0.22].forEach((y) => arr.push([enPlano(phi, 0.035, y), enPlano(phi, 0.068 + pul * 0.006, y)]));
  });
  arr.push([[0, 0.12, 0.01], [0, 0.04 + Math.min(0, yc) - pul * 0.004, 0.01]]);
  arr.push([[0, 0.18, 0.01], [0, ALTO - 0.03 + pul * 0.004, 0.01]]);
  return (
    <group>
      {arr.map(([a, b], i) => (
        <Flecha key={i} a={a} b={b} o={on} color="#3fa9f5" g={0.0035} />
      ))}
    </group>
  );
};

/** arcos del domo: flechas que muestran cómo se reparte el empuje */
const ArcoDomo: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.arco - 0.3, ev.pero2 - 0.2, 0.4);
  if (on <= 0.01) return null;
  const pts: V3[] = Array.from({length: 13}, (_, i) => {
    const x = -ARO + (2 * ARO * i) / 12;
    return [x, 0.045 * (1 - (x / ARO) ** 2) + 0.012, 0.02];
  });
  return (
    <group>
      {pts.map((p, i) => (i % 3 === 1 ? <Flecha key={i} a={[p[0] * 0.8, p[1] + 0.05, p[2]]} b={[p[0], p[1] + 0.004, p[2]]} o={on} color="#3fa9f5" g={0.003} /> : null))}
      <Flecha a={[-0.02, 0.03, 0.02]} b={[-ARO, 0.006, 0.02]} o={on * r(t, ev.arco + 0.3, 0.4)} color="#ffb020" g={0.0035} />
      <Flecha a={[0.02, 0.03, 0.02]} b={[ARO, 0.006, 0.02]} o={on * r(t, ev.arco + 0.3, 0.4)} color="#ffb020" g={0.0035} />
    </group>
  );
};

/** línea marcada + lengüeta remachada + panel que se abre */
const Lengueta: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const y = ALTO + 0.0005;
  const linea = t < 0.75 ? 1 : r(t, ev.marcas, 1.2);
  const abierta = t < 0.75 ? 0 : r(t, ev.rompe - 0.1, 0.35) * (1 - r(t, ev.si2 - 0.6, 0.4));
  // palanca: sube al levantar, regresa y se dobla
  let alza = 0;
  if (t > 0.75) {
    alza = r(t, ev.levantarla, 0.6) * 1.0 + r(t, ev.rompe - 0.1, 0.4) * 0.35;
    alza *= 1 - r(t, ev.lengueta1 + 0.2, 0.6);
    alza += ventana(t, ev.dobla - 0.3, ev.separa + 0.3, 0.4) * 0.9;
    if (t > ev.si2 - 0.6) alza = 0;
  }
  const suelta = t > 0.75 && entre(t, ev.suelta - 0.1, ev.remachada2 - 0.2);
  const vuelve = t > 0.75 && entre(t, ev.remachada2 - 0.2, ev.remachada2 + 0.6);
  const sPal = visible(t, ev.palanca) ? (t < 0.75 ? 1 : spring({frame: (t - ev.palanca) * fps, fps, config: {damping: 10, stiffness: 180, mass: 0.6}})) : 0;
  const remache = ventana(t, ev.remachada1 - 0.1, ev.remachada1 + 0.9, 0.2) + ventana(t, ev.remachada2 - 0.1, ev.remachada2 + 0.9, 0.2);
  // vuelo de la lengüeta suelta hasta la barra
  const kv = suelta ? r(t, ev.suelta - 0.1, 0.8) : 0;
  const posSuelta: V3 = [0.17 * kv, y + Math.sin(kv * Math.PI) * 0.12 - (y - 0.004) * kv, 0.13 * kv];
  const palanca = (
    <group>
      <Redondeada w={0.032} h={0.004} d={0.062} radio={0.0018} position={[0, 0.001, -0.016]} color="#8f99a6" />
      <mesh position={[0, 0.0027, -0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.009, 24]} />
        <meshBasicMaterial color="#5a6170" />
      </mesh>
    </group>
  );
  // panel de abrir (gota)
  const gota = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.006);
    s.bezierCurveTo(0.02, 0.006, 0.026, 0.03, 0.0, 0.042);
    s.bezierCurveTo(-0.026, 0.03, -0.02, 0.006, 0, 0.006);
    return s;
  }, []);
  const puntos = useMemo(() => gota.getPoints(40).map((p) => new THREE.Vector3(p.x, 0, p.y)), [gota]);
  const lineaGeo = useMemo(() => {
    const n = Math.max(2, Math.round(puntos.length * linea));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos.slice(0, n)), 60, 0.0011, 6, false);
  }, [puntos, Math.round(linea * 40)]);
  return (
    <group position={[0, y, 0]}>
      {/* hoyo */}
      {abierta > 0.01 && (
        <mesh position={[0, 0.0009, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[gota]} />
          <meshBasicMaterial color="#1c0f0a" side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* panel que se hunde */}
      <group position={[0, -0.0005 - abierta * 0.004, 0.006]} rotation={[abierta * 1.2, 0, 0]}>
        <mesh position={[0, 0.001, -0.006]} rotation={[Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[gota]} />
          <meshToonMaterial color="#c3cbd5" gradientMap={gradiente()} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* línea marcada */}
      {linea > 0.02 && (
        <mesh geometry={lineaGeo} position={[0, 0.0012, 0]}>
          <meshBasicMaterial color={t < ev.palanca && t > 0.75 ? '#e5333b' : '#5a6170'} />
        </mesh>
      )}
      {/* remache */}
      {sPal > 0.01 && (
        <group>
          <mesh position={[0, 0.003, 0]}>
            <cylinderGeometry args={[0.004, 0.0045, 0.004, 16]} />
            <meshToonMaterial color={remache > 0.2 ? '#ffd34d' : '#9aa4b0'} gradientMap={gradiente()} />
          </mesh>
          {remache > 0.2 && (
            <mesh position={[0, 0.003, 0]} scale={1 + remache * 0.6}>
              <torusGeometry args={[0.009, 0.0012, 8, 32]} />
              <meshBasicMaterial color="#ffd34d" transparent opacity={remache} />
            </mesh>
          )}
        </group>
      )}
      {sPal > 0.01 && !suelta && (
        <group position={[0, 0.004, 0]} rotation={[-alza * 0.9, 0, 0]} scale={sPal * (vuelve ? r(t, ev.remachada2 - 0.2, 0.3) : 1)}>
          {palanca}
        </group>
      )}
      {suelta && (
        <group position={posSuelta.map((v, i) => v - (i === 1 ? y : 0)) as V3} rotation={[kv * 8, kv * 3, 0]}>
          {palanca}
        </group>
      )}
    </group>
  );
};

/** aro del fondo resaltado */
const AroBrillo: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.aro - 0.2, ev.resbalar + 0.8, 0.3);
  if (on <= 0.01) return null;
  return (
    <mesh position={[0, 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[ARO + 0.002, 0.004 + 0.0015 * Math.sin(t * 9), 12, 64]} />
      <meshBasicMaterial color="#ffd34d" transparent opacity={on} />
    </mesh>
  );
};

/** lata completa cerrada (para apilar, y la vacía) */
const LataSimple: React.FC<{color?: string; yc?: number}> = ({color = ROJO, yc = 0.045}) => {
  const perfil = useMemo(() => perfilCuerpo(yc, 0.066), [yc]);
  return (
    <group>
      <Corte perfil={perfil} k={0} color={color} colorCorte="#c3cbd5" />
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[R + 0.0012, R + 0.0012, 0.05, 64, 1, true]} />
        <meshToonMaterial color="#ffffff" gradientMap={gradiente()} />
      </mesh>
      <mesh position={[0, ALTO - 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.063, 48]} />
        <meshToonMaterial color="#d3d9e0" gradientMap={gradiente()} />
      </mesh>
    </group>
  );
};

/** segunda lata (vacía) que se aplasta con la mano y con el peso */
const LataVacia: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.pero2 + 0.2, ev.pero3 - 0.2, 0.4);
  if (on <= 0.01) return null;
  const mano = r(t, ev.aplastan - 0.1, 0.25) * (1 - r(t, ev.gruesas - 0.4, 0.5));
  const peso = r(t, ev.vacia + 0.05, 0.2);
  const sx = 1 - mano * 0.35 + peso * 0.25;
  const sy = 1 - peso * 0.62;
  return (
    <group position={[-0.24, 0, 0]} scale={[sx * on, sy * on, (1 + mano * 0.15 + peso * 0.25) * on]}>
      <LataSimple color="#3b7dd8" />
      {/* hoyo abierto */}
      <mesh position={[0, ALTO + 0.0012, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.014, 24]} />
        <meshBasicMaterial color="#15161c" />
      </mesh>
      {/* arrugas */}
      {(mano > 0.3 || peso > 0.3) &&
        [0.08, 0.15, 0.22].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[0, 0, (i - 1) * 0.15]}>
            <torusGeometry args={[R + 0.001, 0.0015, 6, 48]} />
            <meshBasicMaterial color="#15161c" />
          </mesh>
        ))}
    </group>
  );
};

/** mano que aprieta la lata vacía */
const Mano: React.FC<{t: number}> = ({t}) => {
  const llega = t < 0.75 ? 0 : r(t, ev.papel - 0.3, 0.5) * (1 - r(t, ev.gruesas - 0.2, 0.5));
  if (llega <= 0.01) return null;
  const aprieta = r(t, ev.aplastan - 0.1, 0.25);
  const sep = (1 - llega) * 0.5 - aprieta * 0.03;
  return (
    <group position={[-0.24 + 0.095 + sep * 0.6, 0.17 + sep * 0.4, 0.03 + sep * 0.4]} rotation={[0, -0.25, -0.95]}>
      <Cilindro r={0.032} r2={0.03} h={0.2} position={[0, 0.13, 0]} color="#f0c09a" />
      <Cilindro r={0.046} r2={0.042} h={0.3} position={[0, 0.38, 0]} color="#4fae6a" />
      <Toro r={0.042} tubo={0.008} position={[0, 0.235, 0]} rotation={[Math.PI / 2, 0, 0]} color="#3d9558" />
      <Redondeada w={0.07} h={0.075} d={0.034} radio={0.015} position={[0, 0.0, 0]} color="#f0c09a" />
      {[-0.024, -0.008, 0.008, 0.024].map((x) => (
        <Redondeada key={x} w={0.014} h={0.046} d={0.017} radio={0.0065} position={[x, -0.055, 0.008]} rotation={[0.2 + aprieta * 0.4, 0, 0]} color="#f0c09a" />
      ))}
      <Redondeada w={0.014} h={0.038} d={0.017} radio={0.0065} position={[0.042, -0.008, 0.008]} rotation={[0, 0, -0.6]} color="#f0c09a" />
    </group>
  );
};

/** pesas que caen sobre las dos latas */
const Pesa: React.FC<{t: number; x: number; cae: number; hasta: number; dy: number}> = ({t, x, cae, hasta, dy}) => {
  const {fps} = useVideoConfig();
  if (t < 0.75 || !entre(t, cae - 0.5, hasta)) return null;
  const k = cl((t - (cae - 0.5)) / 0.5);
  const s = t > cae ? spring({frame: (t - cae) * fps, fps, config: {damping: 9, stiffness: 220, mass: 0.6}}) : 0;
  const y0 = ALTO + 0.006 + 0.5 * (1 - k * k);
  const y = t > cae ? ALTO + 0.006 - dy * s : y0;
  const o = 1 - r(t, hasta - 0.3, 0.3);
  return (
    <group position={[x, y, 0]} scale={o}>
      <Redondeada w={0.2} h={0.08} d={0.16} radio={0.012} position={[0, 0.04, 0]} color="#4a4f5b" />
      <Redondeada w={0.08} h={0.03} d={0.03} radio={0.012} position={[0, 0.095, 0]} color="#2b2d33" />
      <Redondeada w={0.12} h={0.03} d={0.004} radio={0.004} position={[0, 0.04, 0.081]} color="#ffd34d" contorno={false} />
    </group>
  );
};

/** pajarito que se acerca a la lengüeta suelta */
const Pajaro: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.basura + 0.4, ev.remachada2 - 0.1, 0.4);
  if (on <= 0.01) return null;
  const llega = r(t, ev.basura + 0.4, 0.9);
  const pica = entre(t, ev.animales - 0.4, ev.remachada2) ? Math.max(0, Math.sin(t * 14)) * 0.4 : 0;
  const x = 0.45 - 0.2 * llega;
  const salto = Math.abs(Math.sin(t * 9)) * 0.02 * (1 - llega);
  return (
    <group position={[x, salto, 0.16]} rotation={[0, -Math.PI / 2 + 0.3, 0]} scale={on}>
      <Esfera r={0.035} escala={[1, 0.9, 1.3]} position={[0, 0.05, 0]} color="#5aa0e0" />
      <group rotation={[pica, 0, 0]} position={[0, 0.07, 0.03]}>
        <Esfera r={0.024} position={[0, 0.02, 0.02]} color="#5aa0e0" />
        <Esfera r={0.005} position={[0.012, 0.028, 0.035]} color="#15161c" contorno={false} />
        <Esfera r={0.005} position={[-0.012, 0.028, 0.035]} color="#15161c" contorno={false} />
        <mesh position={[0, 0.015, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.008, 0.025, 12]} />
          <meshToonMaterial color="#ffb020" gradientMap={gradiente()} />
        </mesh>
      </group>
      <Esfera r={0.02} escala={[0.4, 0.6, 1.3]} position={[0.03, 0.055, -0.005]} color="#3f82c4" />
      <Esfera r={0.02} escala={[0.4, 0.6, 1.3]} position={[-0.03, 0.055, -0.005]} color="#3f82c4" />
      <Cilindro r={0.003} h={0.02} position={[0.012, 0.01, 0]} color="#ffb020" contorno={false} />
      <Cilindro r={0.003} h={0.02} position={[-0.012, 0.01, 0]} color="#ffb020" contorno={false} />
    </group>
  );
};

/** lata que se apila encima */
const Apilada: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  if (t < 0.75 || !entre(t, ev.apilen - 0.6, ev.pero5 + 0.1)) return null;
  const k = cl((t - (ev.apilen - 0.6)) / 0.6);
  const s = t > ev.apilen ? spring({frame: (t - ev.apilen) * fps, fps, config: {damping: 10, stiffness: 200, mass: 0.6}}) : 0;
  const y = t > ev.apilen ? ALTO + 0.004 + (1 - s) * 0.02 : ALTO + 0.004 + 0.45 * (1 - k * k);
  const o = 1 - r(t, ev.pero5 - 0.3, 0.3);
  return (
    <group position={[0, y, 0]} scale={o}>
      <LataSimple color="#4fae6a" />
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const k = corte(t);
  const yc = centroFondo(t);
  const rc = radioCuello(t);
  // si el fondo está inflado la lata se apoya en la panza y se mece
  const panza = Math.max(0, -yc);
  const mece = panza * 6 * Math.sin(t * 3.2) * (t > ev.derecha - 1.2 || t > ev.inflado ? 1 : 0.2);
  const duras = ventana(t, ev.duras - 0.2, ev.duras + 0.8, 0.2);
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
      <Fondo />
      <SombraContacto position={[0, 0.007, 0]} w={0.24} d={0.24} o={0.3} />
      <group position={[Math.sin(mece) * panza, panza, 0]} rotation={[0, 0, mece]}>
        <Pieza t={t} desde={ev.tubo - 0.2} dir={[0.4, 0.3, 1]}>
          <Cuerpo t={t} yc={yc} rc={rc} k={k} brillo={duras * 0.3} />
        </Pieza>
        <Pieza t={t} desde={ev.arriba - 0.15} dir={[0, 1, 0.3]} caida={0.35}>
          <Tapa t={t} rc={rc} k={k} />
          {k < 0.05 && <Lengueta t={t} />}
        </Pieza>
        <Refresco t={t} yc={yc} k={k} />
        <Empuje t={t} yc={yc} />
        <ArcoDomo t={t} />
        <AroBrillo t={t} />
      </group>
      <LataVacia t={t} />
      <Mano t={t} />
      <Pesa t={t} x={0} cae={ev.aguanta2} hasta={ev.pero3 + 0.2} dy={0} />
      <Pesa t={t} x={-0.24} cae={ev.vacia + 0.05} hasta={ev.pero3 + 0.2} dy={0.186} />
      <Apilada t={t} />
      <Pajaro t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.lata1 - 0.2, 'ya tienes una lata', false],
  [ev.gas1 - 0.2, 'gas a presión', true],
  [ev.infla - 0.2, 'se infla como globo', true],
  [ev.derecha - 0.5, '¡no se para derecha!', true],
  [ev.domo1 - 0.3, 'fondo hacia adentro', false],
  [ev.arco - 0.2, 'un arco aguanta más', false],
  [ev.domo2 - 0.3, 'el domo', false],
  [ev.papel - 0.6, 'delgadas como papel', true],
  [ev.aplastan - 0.1, '¡se aplastan!', true],
  [ev.gruesas - 0.4, 'no más gruesas', false],
  [ev.duras - 0.6, 'el gas las pone duras', false],
  [ev.aguanta2 - 0.2, 'cerrada: aguanta', false],
  [ev.vacia - 0.1, 'vacía: no', true],
  [ev.gruesa - 0.3, 'la tapa, más gruesa', false],
  [ev.caro - 0.4, 'grueso = caro $$$', true],
  [ev.angosta - 0.4, 'boca más angosta', false],
  [ev.cuello - 0.3, 'el cuello', false],
  [ev.abrelatas - 0.6, '¿un abrelatas?', true],
  [ev.marcas, 'una línea más delgada', false],
  [ev.palanca - 0.2, 'palanca remachada', false],
  [ev.rompe - 0.2, '¡rompe por la línea!', false],
  [ev.lengueta1 - 0.3, 'la lengüeta', false],
  [ev.aro - 0.2, 'el aro de abajo', false],
  [ev.apilen - 0.4, 'se apilan sin resbalar', false],
  [ev.suelta - 0.3, 'lengüeta suelta', true],
  [ev.basura - 0.1, '= basura', true],
  [ev.animales - 0.6, 'se la tragan los animales', true],
  [ev.remachada2 - 0.3, 'se queda remachada', false],
  [ev.dobla - 0.2, 'se dobla y no se separa', false],
  [ev.inflado - 0.4, '¿fondo inflado?', true],
  [ev.tomes - 0.4, '¡no te la tomes!', true],
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
const Medidores: React.FC<{t: number}> = ({t}) => {
  if (t < ev.gas1 - 0.2) return null;
  const p = presion(t);
  const alta = t > ev.inflado - 0.4 || entre(t, ev.infla - 0.3, ev.hundes);
  return <Termometro x={950} valor={p} color={alta ? '#e5333b' : '#3fa9f5'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="presión" />;
};

export const Lata: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#ffd9a8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(60,40,25,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Audio src={staticFile('lata/voz.wav')} />
      <Audio src={staticFile('lata/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_LATA = (datos as any).duration as number;
void Caja;
