import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/olla.json';
import {Caja, Cilindro, Esfera, GROSOR, gradiente, MatToon, Papel, Redondeada, SombraContacto, texturaAzulejo, Torno, Toro} from './toon';
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
/** número pseudoaleatorio estable */
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const ev = {
  agua: T('agua'),
  frijoles: T('frijoles'),
  tapa1: T('tapa', 1),
  tienes: T('tienes'),
  expres: T('exprés'),
  vapor1: T('vapor', 1),
  volando: T('volando'),
  tapa3: T('tapa', 3),
  pestanas: T('pestañas'),
  giran: T('giran'),
  traban: T('traban'),
  cierre: T('cierre'),
  vapor2: T('vapor', 2),
  escapa: T('escapa'),
  anillo: T('anillo'),
  aprieta: T('aprieta'),
  empaque: T('empaque'),
  revienta: T('revienta'),
  hoyito: T('hoyito'),
  tubito: T('tubito', 1),
  pesa: T('pesa', 1),
  levanta: T('levanta'),
  caer: T('caer'),
  baila: T('baila'),
  frijol: T('frijol'),
  control: T('control'),
  tapon: T('tapón'),
  bota: T('bota'),
  seguridad: T('seguridad'),
  abres: T('abres'),
  quema: T('quema'),
  seguro: T('seguro'),
  girar: T('girar'),
  tanto: T('tanto'),
  cien: T('cien'),
  c120: T('120'),
  cuecen: T('cuecen'),
  tercera: T('tercera'),
  bailar: T('bailar'),
  apaga: T('apaga'),
  tapo: T('tapó'),
};

// ---------- geometría (metros). Cubierta de la estufa en y=0 ----------
const R = 0.2; // radio de la olla
const BASE = 0.07; // fondo de la olla (sobre la parrilla)
const H = 0.19; // alto de la olla
const BORDE = BASE + H + 0.008; // donde apoya la tapa
const CORTE0 = 1.15; // ángulo donde empieza la olla (lo demás está "cortado" para ver adentro)
const CORTE_L = Math.PI * 2 - 1.6;
const ALTO_AGUA = 0.105;
const PERFIL_TAPA: [number, number][] = [
  [0, 0.062],
  [0.05, 0.059],
  [0.12, 0.047],
  [0.18, 0.029],
  [0.212, 0.013],
  [0.224, 0.004],
  [0.226, -0.018],
  [0.218, -0.018],
  [0.216, 0.0],
  [0, 0.0],
];
/** altura del domo de la tapa a un radio dado */
const altoTapa = (rr: number) => {
  for (let i = 0; i < 5; i++) {
    const [r0, y0] = PERFIL_TAPA[i];
    const [r1, y1] = PERFIL_TAPA[i + 1];
    if (rr <= r1) return y0 + ((rr - r0) / (r1 - r0)) * (y1 - y0);
  }
  return 0;
};
const POS_TAPON: [number, number, number] = [-0.055, altoTapa(0.1), 0.083];
const POS_SEGURO: [number, number, number] = [0.165, altoTapa(0.165), 0.036];

// ---------- estado físico ----------
const presion = (t: number): number => {
  if (t < 0.75) return 0.6;
  if (t < ev.vapor1) return 0;
  if (t < ev.volando) return 0.88 * r(t, ev.vapor1, ev.volando - ev.vapor1 - 0.2);
  if (t < ev.tapa3) return 0.88 * (1 - r(t, ev.volando, 0.4));
  if (t < ev.aprieta) return 0.25 * r(t, ev.cierre - 0.5, 1.2);
  if (t < ev.revienta) return 0.25 + 0.75 * r(t, ev.aprieta + 0.4, ev.revienta - ev.aprieta - 0.6);
  if (t < ev.hoyito) return 1 - r(t, ev.revienta, 0.7);
  if (t < ev.frijol) return 0.68 * r(t, ev.hoyito, ev.levanta - ev.hoyito) + (t > ev.caer ? 0.025 * Math.sin(t * 9) : 0);
  if (t < ev.bota) return 0.68 + 0.3 * r(t, ev.frijol + 0.4, ev.control - ev.frijol);
  const base = 0.98 - 0.3 * r(t, ev.bota, 0.8) + 0.02 * Math.sin(t * 9) * r(t, ev.bota + 1, 1);
  return base * (1 - 0.65 * r(t, ev.apaga, 1.8));
};
const fuego = (t: number) => (t < 0.75 ? 1 : r(t, ev.tienes - 0.2, 0.5) * (1 - r(t, ev.apaga, 0.7)));
/** la pesa baila (sube y baja soltando vapor) */
const bailando = (t: number) => entre(t, ev.caer + 0.5, ev.frijol + 0.4) || entre(t, ev.seguridad - 0.8, ev.bailar - 0.2);
const subePesa = (t: number) => {
  const una = r(t, ev.levanta, 0.25) * (1 - r(t, ev.caer - 0.25, 0.25));
  const baile = bailando(t) ? Math.max(0, Math.sin(t * Math.PI * 2 * 2.1)) : 0;
  return Math.max(una, baile);
};
const giroTapa = (t: number) => {
  if (t < 0.75) return 0;
  let g = t < ev.giran ? -0.55 + 0.55 * r(t, ev.giran, 0.5) : 0;
  if (entre(t, ev.girar - 0.3, ev.girar + 1.0)) g += 0.045 * Math.sin((t - ev.girar) * 28) * (1 - r(t, ev.girar + 0.5, 0.5));
  return g;
};
const alzaTapa = (t: number, fps: number) => {
  if (t < 0.75) return 0;
  let y = 0;
  // cae al ponerla
  if (t < ev.volando) y += (1 - spring({frame: (t - ev.tapa1) * fps, fps, config: {damping: 10, stiffness: 170, mass: 0.7}})) * 0.3;
  // tiembla con el vapor y sale volando
  if (entre(t, ev.vapor1 + 1.2, ev.volando)) y += 0.004 * Math.abs(Math.sin(t * 47)) * r(t, ev.vapor1 + 1.2, ev.volando - ev.vapor1 - 1.2);
  if (entre(t, ev.volando - 0.1, ev.tapa3)) y += Math.pow(t - (ev.volando - 0.1), 1.6) * 3.2;
  if (entre(t, ev.tapa3, ev.anillo)) y += (1 - spring({frame: (t - ev.tapa3) * fps, fps, config: {damping: 10, stiffness: 170, mass: 0.7}})) * 0.35;
  // se levanta para meter el empaque
  y += 0.17 * r(t, ev.anillo - 0.7, 0.4) * (1 - r(t, ev.aprieta - 0.25, 0.35));
  // tiembla por la presión
  if (entre(t, ev.aprieta + 2, ev.revienta + 0.2)) y += 0.006 * Math.abs(Math.sin(t * 53)) * r(t, ev.aprieta + 2, ev.revienta - ev.aprieta - 2);
  if (entre(t, ev.frijol + 1, ev.bota)) y += 0.004 * Math.abs(Math.sin(t * 51)) * r(t, ev.frijol + 1, 2);
  return y;
};
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- cámara ----------
type K = [number, [number, number, number], [number, number, number]];
const CAMARA: K[] = [
  [0.0, [1.25, 1.15, 2.3], [0, 0.18, 0]],
  [2.2, [0.85, 0.82, 1.65], [0, 0.17, 0]],
  [5.6, [0.75, 0.7, 1.45], [0, 0.17, 0]],
  [8.6, [0.95, 0.95, 1.85], [0, 0.32, 0]],
  [11.8, [0.62, 0.72, 1.18], [0.05, 0.26, 0]],
  [15.0, [0.9, 0.8, 1.35], [0.12, 0.26, 0]],
  [17.2, [-0.6, 0.66, 1.15], [0, 0.26, 0]],
  [20.8, [0.45, 0.82, 1.05], [0, 0.28, 0]],
  [25.5, [0.95, 0.72, 1.65], [0, 0.18, 0]],
  [30.2, [0.48, 0.92, 1.0], [0, 0.32, 0]],
  [34.0, [0.34, 0.8, 0.82], [0, 0.36, 0]],
  [41.0, [0.5, 0.58, 1.7], [0, 0.21, 0]],
  [45.8, [-0.45, 0.82, 0.92], [-0.05, 0.33, 0.04]],
  [52.8, [0.95, 0.85, 1.7], [0.22, 0.3, 0.05]],
  [57.0, [0.8, 0.8, 1.25], [0.18, 0.3, 0.03]],
  [61.4, [0.45, 0.5, 1.3], [0, 0.17, 0]],
  [66.0, [0.32, 0.42, 1.12], [0, 0.16, 0]],
  [70.3, [0.42, 0.82, 0.95], [0, 0.34, 0]],
  [73.6, [1.3, 1.1, 2.3], [0, 0.2, 0]],
];
const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
const camara = (t: number) => {
  let i = 0;
  while (i < CAMARA.length - 1 && CAMARA[i + 1][0] <= t) i++;
  const a = CAMARA[i];
  const b = CAMARA[Math.min(i + 1, CAMARA.length - 1)];
  const k = b[0] > a[0] ? suave((t - a[0]) / Math.min(1.4, b[0] - a[0])) : 0;
  const pos0 = lerp3(a[1], b[1], k);
  const obj = lerp3(a[2], b[2], k);
  const pos = [...pos0] as [number, number, number];
  pos[0] += Math.sin(t * 0.45) * 0.035;
  pos[1] += Math.sin(t * 0.33) * 0.018;
  // sacudida al reventar
  const s = r(t, ev.revienta - 0.05, 0.05) * (1 - r(t, ev.revienta + 0.2, 0.5));
  pos[0] += Math.sin(t * 71) * 0.03 * s;
  pos[1] += Math.cos(t * 63) * 0.03 * s;
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
const Pieza: React.FC<{t: number; desde: number; dir?: [number, number, number]; caida?: number; children: React.ReactNode}> = ({t, desde, dir = [0, 1, 0], caida = 0.3, children}) => {
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
    <group position={[0, (1 - s) * caida, 0]} scale={0.6 + 0.4 * s}>
      {children}
    </group>
  );
};
/** pieza pequeña que "brota" (escala con rebote) */
const Brota: React.FC<{t: number; desde: number; position?: [number, number, number]; children: React.ReactNode}> = ({t, desde, position, children}) => {
  const {fps} = useVideoConfig();
  if (!visible(t, desde)) return null;
  const s = t < 0.75 ? 1 : spring({frame: (t - desde) * fps, fps, config: {damping: 9, stiffness: 190, mass: 0.6}});
  return (
    <group position={position} scale={Math.max(0.001, s)}>
      {children}
    </group>
  );
};

// ---------- pieza de revolución cortada (para ver adentro) ----------
const MatTinta: React.FC = () => <meshBasicMaterial color="#15161c" side={THREE.BackSide} />;
const Cortada: React.FC<{perfil: [number, number][]; color: string; colorCorte: string; opacity?: number; contorno?: boolean; position?: [number, number, number]}> = ({
  perfil,
  color,
  colorCorte,
  opacity = 1,
  contorno = true,
  position,
}) => {
  const g = useMemo(() => {
    const pts = perfil.map(([x, y]) => new THREE.Vector2(x, y));
    const cuerpo = new THREE.LatheGeometry(pts, 72, CORTE0, CORTE_L);
    const tinta = new THREE.LatheGeometry(
      perfil.map(([x, y]) => new THREE.Vector2(x > 0 ? x + GROSOR : 0, y)),
      72,
      CORTE0 - 0.004,
      CORTE_L + 0.008,
    );
    const cara = new THREE.ShapeGeometry(new THREE.Shape(pts));
    // borde de tinta de la cara del corte: misma figura un poquito más grande, detrás
    const cx = perfil.reduce((s, p) => s + p[0], 0) / perfil.length;
    const cy = perfil.reduce((s, p) => s + p[1], 0) / perfil.length;
    const borde = new THREE.ShapeGeometry(
      new THREE.Shape(
        perfil.map(([x, y]) => {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.hypot(dx, dy) || 1;
          return new THREE.Vector2(x + (dx / d) * 0.0035, y + (dy / d) * 0.0035);
        }),
      ),
    );
    return {cuerpo, tinta, cara, borde};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(perfil)]);
  const transp = opacity < 1;
  return (
    <group position={position}>
      <mesh geometry={g.cuerpo} castShadow={!transp} receiveShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={transp} opacity={opacity} depthWrite={!transp} />
      </mesh>
      {contorno && (
        <mesh geometry={g.tinta}>
          <MatTinta />
        </mesh>
      )}
      {[CORTE0, CORTE0 + CORTE_L].map((a, i) => (
        <group key={i} rotation={[0, a - Math.PI / 2, 0]}>
          <mesh geometry={g.cara}>
            <meshToonMaterial color={colorCorte} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={transp} opacity={opacity} depthWrite={!transp} />
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

/** nubecita de vapor */
const Nube: React.FC<{p: [number, number, number]; r: number; o: number}> = ({p, r: rr, o}) =>
  o <= 0.01 ? null : (
    <mesh position={p}>
      <sphereGeometry args={[rr, 20, 14]} />
      <meshToonMaterial color="#f7fbff" gradientMap={gradiente()} transparent opacity={o} depthWrite={false} />
    </mesh>
  );

/** chorro de vapor: nubecitas que salen de `p` hacia `dir` */
const Chorro: React.FC<{t: number; on: number; p: [number, number, number]; dir?: [number, number, number]; largo?: number; n?: number; r0?: number; r1?: number; vel?: number; semilla?: number; abre?: number}> = ({
  t,
  on,
  p,
  dir = [0, 1, 0],
  largo = 0.3,
  n = 10,
  r0 = 0.01,
  r1 = 0.05,
  vel = 1.6,
  semilla = 0,
  abre = 0.25,
}) => {
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const k = (t * vel + i / n + rnd(i + semilla) * 0.3) % 1;
        const j = (rnd(i * 3 + semilla) - 0.5) * abre * k;
        const j2 = (rnd(i * 7 + semilla) - 0.5) * abre * k;
        return (
          <Nube
            key={i}
            p={[p[0] + dir[0] * k * largo + j, p[1] + dir[1] * k * largo + Math.abs(j2) * 0.5, p[2] + dir[2] * k * largo + j2]}
            r={r0 + (r1 - r0) * k}
            o={on * (1 - k) * 0.85}
          />
        );
      })}
    </group>
  );
};

// ---------- cocina ----------
const Cocina: React.FC = () => {
  const azulejo = useMemo(() => {
    const t = texturaAzulejo('#fbf8f1', '#dccfb9');
    t.repeat.set(5, 1.6);
    return t;
  }, []);
  return (
    <group>
      {/* pared */}
      <mesh position={[0, 1.6, -0.55]} receiveShadow>
        <planeGeometry args={[7, 3]} />
        <meshToonMaterial color="#f6dfb4" gradientMap={gradiente()} />
      </mesh>
      <mesh position={[0, 0.3, -0.549]} receiveShadow>
        <planeGeometry args={[7, 0.7]} />
        <meshToonMaterial map={azulejo} gradientMap={gradiente()} />
      </mesh>
      <Redondeada w={7} h={0.03} d={0.03} radio={0.01} position={[0, 0.66, -0.535]} color="#ffffff" contorno={false} />
      {/* barra / encimera */}
      <Redondeada w={4} h={0.05} d={0.72} radio={0.012} position={[0, -0.025, -0.17]} color="#e9dcc3" />
      <Caja w={4} h={0.86} d={0.66} position={[0, -0.48, -0.2]} color="#7fa8c9" contorno={false} />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
        <group key={x}>
          <Redondeada w={0.56} h={0.7} d={0.03} radio={0.012} position={[x, -0.45, 0.14]} color="#8db5d6" />
          <Redondeada w={0.16} h={0.025} d={0.03} radio={0.01} position={[x, -0.16, 0.17]} color="#e8e2d6" />
        </group>
      ))}
      {/* estufa empotrada */}
      <Redondeada w={0.9} h={0.03} d={0.56} radio={0.01} position={[-0.12, 0.012, -0.12]} color="#2b2e36" />
      <Redondeada w={0.88} h={0.008} d={0.05} radio={0.003} position={[-0.12, 0.03, 0.13]} color="#3a3e48" contorno={false} />
      {[-0.42, -0.28, 0.04, 0.18].map((x, i) => (
        <group key={x} position={[x, 0.035, 0.13]}>
          <Cilindro r={0.022} h={0.02} color="#d8dde3" />
          <Caja w={0.006} h={0.008} d={0.026} position={[0, 0.012, 0]} rotation={[0, i * 0.5, 0]} color="#2b2e36" contorno={false} />
        </group>
      ))}
      {/* quemador de atrás apagado */}
      <group position={[-0.4, 0.03, -0.24]}>
        <Cilindro r={0.05} h={0.012} color="#4a4f5b" />
        <Toro r={0.1} tubo={0.006} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} color="#1c1d22" />
      </group>
      {/* repisa con frascos */}
      <group position={[0.15, 1.05, -0.47]}>
        <Redondeada w={1.1} h={0.03} d={0.16} radio={0.008} color="#c99a6b" />
        {[
          [-0.4, '#f2c14e', 0.17],
          [-0.22, '#e5333b', 0.13],
          [-0.05, '#7cc26b', 0.19],
          [0.3, '#f08a4b', 0.15],
        ].map(([x, c, h], i) => (
          <group key={i} position={[x as number, 0.015, 0]}>
            <Torno perfil={[[0, 0], [0.045, 0], [0.05, 0.02], [0.05, (h as number) - 0.02], [0.035, h as number], [0, h as number]]} color="#e9f4f6" opacity={0.95} />
            <Cilindro r={0.042} h={(h as number) * 0.55} position={[0, (h as number) * 0.3, 0]} color={c as string} contorno={false} />
            <Cilindro r={0.038} h={0.025} position={[0, (h as number) + 0.012, 0]} color="#c9845a" />
          </group>
        ))}
      </group>
      {/* barra con cucharones */}
      <group position={[-0.65, 0.9, -0.5]}>
        <Cilindro r={0.008} h={0.6} rotation={[0, 0, Math.PI / 2]} color="#c9ced8" />
        {[-0.18, 0.0, 0.18].map((x, i) => (
          <group key={x} position={[x, -0.02, 0.02]}>
            <Cilindro r={0.006} h={0.26} position={[0, -0.13, 0]} color={['#e07a4f', '#4fae6a', '#6a92d4'][i]} />
            {i === 1 ? (
              <Esfera r={0.04} escala={[1, 0.45, 1]} position={[0, -0.28, 0.0]} color="#4fae6a" />
            ) : (
              <Redondeada w={0.06} h={0.08} d={0.012} radio={0.005} position={[0, -0.29, 0]} color={['#e07a4f', '', '#6a92d4'][i]} />
            )}
          </group>
        ))}
      </group>
      {/* ventana */}
      <group position={[1.15, 1.25, -0.54]}>
        <Redondeada w={0.75} h={0.7} d={0.04} radio={0.01} color="#ffffff" />
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.66, 0.61]} />
          <meshBasicMaterial color="#cdeeff" />
        </mesh>
        <Caja w={0.02} h={0.61} d={0.02} position={[0, 0, 0.035]} color="#ffffff" />
        <Caja w={0.66} h={0.02} d={0.02} position={[0, 0, 0.035]} color="#ffffff" />
      </group>
      {/* tabla y salero en la barra */}
      <Redondeada w={0.42} h={0.02} d={0.28} radio={0.008} position={[0.6, 0.01, -0.15]} rotation={[0, 0.2, 0]} color="#d9a66b" />
      <group position={[-0.75, 0, 0.05]}>
        <Torno perfil={[[0, 0], [0.025, 0], [0.028, 0.06], [0.02, 0.075], [0, 0.078]]} color="#ffffff" />
        <SombraContacto position={[0, 0.001, 0]} w={0.12} d={0.12} o={0.3} />
      </group>
      {/* cebolla y chiles */}
      <Esfera r={0.045} escala={[1, 0.9, 1]} position={[0.52, 0.06, -0.12]} color="#c97a9c" />
      <Esfera r={0.022} escala={[2.6, 0.7, 0.8]} position={[0.66, 0.035, -0.06]} color="#4fae6a" />
    </group>
  );
};

// ---------- estufa: parrilla y llama ----------
const Parrilla: React.FC = () => (
  <group>
    <Cilindro r={0.06} h={0.014} position={[0, 0.032, 0]} color="#4a4f5b" />
    <Cilindro r={0.035} h={0.012} position={[0, 0.044, 0]} color="#2b2e36" />
    <Toro r={0.13} tubo={0.006} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} color="#1c1d22" />
    {[0, 1, 2, 3].map((i) => (
      <Caja key={i} w={0.26} h={0.01} d={0.01} position={[0, 0.064, 0]} rotation={[0, (i * Math.PI) / 4 + Math.PI / 8, 0]} color="#1c1d22" />
    ))}
  </group>
);
const Llama: React.FC<{t: number}> = ({t}) => {
  const f = fuego(t);
  if (f <= 0.01) return null;
  return (
    <group position={[0, 0.045, 0]}>
      {Array.from({length: 16}, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const h = (0.028 + 0.01 * Math.sin(t * 19 + i * 2.3)) * f;
        return (
          <group key={i} position={[Math.sin(a) * 0.05, h / 2, Math.cos(a) * 0.05]} rotation={[Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4]}>
            <mesh>
              <coneGeometry args={[0.009, h, 8]} />
              <meshBasicMaterial color="#3d7dff" transparent opacity={0.9} />
            </mesh>
            <mesh position={[0, -h * 0.15, 0]}>
              <coneGeometry args={[0.005, h * 0.6, 8]} />
              <meshBasicMaterial color="#bfe0ff" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- la olla ----------
const PERFIL_OLLA: [number, number][] = [
  [0, 0],
  [R - 0.016, 0],
  [R, 0.016],
  [R, H],
  [R + 0.007, H + 0.002],
  [R + 0.007, H + 0.008],
  [R - 0.008, H + 0.008],
  [R - 0.008, 0.014],
  [0, 0.014],
];
const colorMezcla = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), cl(k)).getStyle();

const Olla: React.FC<{t: number}> = ({t}) => {
  // se hincha antes de reventar
  const hincha = t > 0.75 && entre(t, ev.aprieta + 2, ev.revienta + 0.15) ? r(t, ev.aprieta + 2, ev.revienta - ev.aprieta - 2) : 0;
  const tiembla = hincha * 0.004 * Math.sin(t * 61);
  const color = colorMezcla('#cfd6de', '#ff8f80', hincha * 0.55);
  return (
    <group position={[tiembla, BASE, 0]} scale={[1 + hincha * 0.06, 1 + hincha * 0.03, 1 + hincha * 0.06]}>
      <Cortada perfil={PERFIL_OLLA} color={color} colorCorte="#8b95a2" />
      {/* banda decorativa */}
      <mesh position={[0, H * 0.72, 0]}>
        <cylinderGeometry args={[R + 0.0015, R + 0.0015, 0.01, 72, 1, true, CORTE0, CORTE_L]} />
        <meshToonMaterial color="#aeb7c2" gradientMap={gradiente()} side={THREE.DoubleSide} />
      </mesh>
      {/* mango largo */}
      <Redondeada w={0.06} h={0.016} d={0.045} radio={0.006} position={[R + 0.022, H - 0.014, 0]} color="#aeb7c2" />
      <Redondeada w={0.25} h={0.028} d={0.05} radio={0.012} position={[R + 0.15, H - 0.014, 0]} color="#2b2d33" />
      {/* asa corta del otro lado */}
      <Redondeada w={0.075} h={0.024} d={0.06} radio={0.01} position={[-R - 0.035, H - 0.03, 0]} color="#2b2d33" />
    </group>
  );
};

const Agua: React.FC<{t: number}> = ({t}) => {
  const lleno = t < 0.75 ? 1 : r(t, 0.85, 1.0);
  if (lleno <= 0.01) return null;
  const h = ALTO_AGUA * lleno + 0.002 * Math.sin(t * 7) * fuego(t);
  const perfil: [number, number][] = [
    [0, 0.0145],
    [R - 0.009, 0.0145],
    [R - 0.009, 0.0145 + h],
    [0, 0.0145 + h],
  ];
  return (
    <group position={[0, BASE, 0]}>
      <Cortada perfil={perfil} color="#58aef5" colorCorte="#3d94e6" opacity={0.62} contorno={false} />
      {/* brillo de la superficie */}
      <mesh position={[0, 0.0155 + h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.075, 48, 1, CORTE0 + 0.3, 2.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
};

/** posiciones fijas de los frijoles (solo en la parte que no está cortada) */
const FRIJOLES = Array.from({length: 26}, (_, i) => {
  const a = CORTE0 + 0.15 + rnd(i) * (CORTE_L - 0.3);
  const rr = 0.03 + Math.sqrt(rnd(i + 50)) * 0.15;
  return {x: Math.sin(a) * rr, z: Math.cos(a) * rr, y: 0.024 + (i % 3) * 0.012, rot: rnd(i + 9) * 3};
});
const Frijoles: React.FC<{t: number}> = ({t}) => {
  if (t >= 0.75 && t < ev.frijoles) return null;
  const hierve = fuego(t) * (t > ev.tienes + 1 ? 1 : 0);
  const crece = 1 + 0.18 * r(t, ev.cuecen - 0.3, 2.5);
  return (
    <group position={[0, BASE, 0]}>
      {FRIJOLES.map((f, i) => {
        const cae = t < 0.75 ? 1 : r(t, ev.frijoles + i * 0.035, 0.45);
        const y = f.y + (1 - cae) * 0.4 + hierve * 0.008 * Math.sin(t * 6 + i);
        return (
          <group key={i} position={[f.x, y, f.z]} rotation={[0, f.rot + hierve * 0.3 * Math.sin(t * 2 + i), 0.3]}>
            <Esfera r={0.0135 * crece} escala={[1.55, 0.85, 1]} color="#8a3b2b" />
            <Esfera r={0.004} position={[0.004, 0.009, 0.004]} color="#f3d9c0" contorno={false} />
          </group>
        );
      })}
    </group>
  );
};

/** burbujas del hervor y vapor dentro de la olla */
const Hervor: React.FC<{t: number}> = ({t}) => {
  const f = fuego(t) * (t > ev.tienes + 0.8 || t < 0.75 ? 1 : 0);
  const p = presion(t);
  const vaporDentro = t < 0.75 ? 0.6 : p;
  return (
    <group position={[0, BASE, 0]}>
      {f > 0.01 &&
        Array.from({length: 14}, (_, i) => {
          const a = CORTE0 + 0.2 + rnd(i + 80) * (CORTE_L - 0.4);
          const rr = 0.03 + rnd(i + 90) * 0.14;
          const k = (t * 0.9 + rnd(i + 70)) % 1;
          return <Esfera key={i} r={0.006 + k * 0.004} position={[Math.sin(a) * rr, 0.02 + k * (ALTO_AGUA - 0.01), Math.cos(a) * rr]} color="#e9f6ff" opacity={0.9 * f} contorno={false} sombra={false} />;
        })}
      {/* vapor en el espacio de arriba */}
      {vaporDentro > 0.02 &&
        Array.from({length: 12}, (_, i) => {
          const a = CORTE0 + 0.2 + rnd(i + 30) * (CORTE_L - 0.4);
          const rr = 0.04 + rnd(i + 40) * 0.12;
          const y = 0.0145 + ALTO_AGUA + 0.02 + rnd(i + 20) * 0.045 + 0.006 * Math.sin(t * 3 + i);
          return <Nube key={i} p={[Math.sin(a + t * 0.3) * rr, y, Math.cos(a + t * 0.3) * rr]} r={0.022 + 0.012 * vaporDentro} o={0.55 * vaporDentro} />;
        })}
    </group>
  );
};

/** frijol que sube y tapa el tubito */
const FrijolTapon: React.FC<{t: number}> = ({t}) => {
  if (!entre(t, ev.frijol - 0.2, ev.abres)) return null;
  const k = r(t, ev.frijol - 0.1, 0.7);
  const a = CORTE0 + 0.4;
  const desde: [number, number, number] = [Math.sin(a) * 0.09, BASE + 0.04, Math.cos(a) * 0.09];
  const hasta: [number, number, number] = [0, BORDE - 0.01, 0];
  const p = lerp3(desde, hasta, k);
  p[1] += Math.sin(k * Math.PI) * 0.04;
  const brillo = r(t, ev.frijol + 0.5, 0.3);
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2 * k]}>
      <Esfera r={0.016} escala={[1.55, 0.85, 1]} color={colorMezcla('#8a3b2b', '#c4462f', brillo * 0.4)} />
    </group>
  );
};

// ---------- tapa ----------
const PERFIL_TAPA_TINTA: [number, number][] = [
  [0, 0.0668],
  [0.05, 0.0638],
  [0.12, 0.0512],
  [0.18, 0.0332],
  [0.2155, 0.0168],
  [0.2285, 0.006],
  [0.2305, -0.0222],
  [0.214, -0.0222],
  [0.212, 0.0],
  [0, 0.0],
];
const TintaTapa: React.FC = () => {
  const g = useMemo(() => new THREE.LatheGeometry([...PERFIL_TAPA_TINTA].reverse().map(([x, y]) => new THREE.Vector2(x, y)), 72), []);
  return (
    <mesh geometry={g}>
      <MatTinta />
    </mesh>
  );
};
const Tapa: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  if (t >= 0.75 && t < ev.tapa1) return null;
  const vuela = entre(t, ev.volando - 0.1, ev.tapa3);
  if (vuela && t > ev.volando + 1.0) return null;
  const y = alzaTapa(t, fps);
  const giro = giroTapa(t);
  const vueltas = vuela ? (t - ev.volando + 0.1) * 9 : 0;
  const pesa = subePesa(t);
  const taponFuera = entre(t, ev.bota, ev.abres - 0.3);
  const kT = r(t, ev.bota, 0.9);
  const segArriba = t < 0.75 || (t >= ev.seguro && presion(t) > 0.3);
  return (
    <group position={[0, BORDE + y, 0]} rotation={[vueltas * 0.5, giro + vueltas, vueltas * 0.2]}>
      <Torno perfil={[...PERFIL_TAPA].reverse()} color="#c3cbd5" contorno={false} />
      <TintaTapa />
      <Toro r={0.12} tubo={0.003} rotation={[Math.PI / 2, 0, 0]} position={[0, altoTapa(0.12) + 0.001, 0]} color="#aeb7c2" contorno={false} />
      {/* mango de la tapa */}
      <Redondeada w={0.06} h={0.014} d={0.04} radio={0.006} position={[0.215, 0.016, 0]} color="#aeb7c2" />
      <Redondeada w={0.24} h={0.026} d={0.05} radio={0.012} position={[0.34, 0.022, 0]} color="#2b2d33" />
      {/* pestañas del cierre */}
      <Brota t={t} desde={ev.pestanas}>
        {[0, 1, 2, 3].map((k) => {
          const a = Math.PI / 4 + (k * Math.PI) / 2;
          return <Redondeada key={k} w={0.065} h={0.014} d={0.014} radio={0.005} position={[Math.sin(a) * 0.231, -0.012, Math.cos(a) * 0.231]} rotation={[0, a, 0]} color={t > ev.traban && t < ev.traban + 0.6 ? '#ffd34d' : '#9aa4b0'} />;
        })}
      </Brota>
      {/* tubito + pesa */}
      <Brota t={t} desde={ev.tubito} position={[0, altoTapa(0), 0]}>
        <Cilindro r={0.0075} h={0.03} position={[0, 0.015, 0]} color="#9aa4b0" />
      </Brota>
      <Brota t={t} desde={ev.pesa} position={[0, altoTapa(0) + 0.022 + pesa * 0.016, 0]}>
        <group rotation={[0.18 * pesa * Math.sin(t * 9), 0, 0.18 * pesa * Math.cos(t * 7)]}>
          <Cilindro r={0.026} r2={0.022} h={0.024} position={[0, 0.012, 0]} color="#5d6572" />
          <Cilindro r={0.012} h={0.012} position={[0, 0.03, 0]} color="#5d6572" />
          <Esfera r={0.011} position={[0, 0.042, 0]} color="#5d6572" />
        </group>
      </Brota>
      {/* tapón de seguridad (hule rojo) */}
      {!taponFuera && (
        <Brota t={t} desde={ev.tapon} position={POS_TAPON}>
          <Cilindro r={0.012} h={0.016} position={[0, 0.006, 0]} color="#e5333b" />
          <Cilindro r={0.016} h={0.004} position={[0, 0.0, 0]} color="#c4262e" />
        </Brota>
      )}
      {taponFuera && kT < 0.99 && (
        <group position={[POS_TAPON[0] - kT * 0.1, POS_TAPON[1] + Math.sin(kT * Math.PI * 0.9) * 0.35 + kT * 0.05, POS_TAPON[2] + kT * 0.25]} rotation={[kT * 12, 0, kT * 8]}>
          <Cilindro r={0.012} h={0.016} color="#e5333b" />
        </group>
      )}
      {/* seguro (perno que sube con la presión) */}
      <Brota t={t} desde={ev.seguro} position={POS_SEGURO}>
        <Cilindro r={0.007} h={0.01} position={[0, 0.002, 0]} color="#9aa4b0" />
        <Cilindro r={0.0055} h={0.02} position={[0, segArriba ? 0.014 : 0.0, 0]} color="#ffb020" />
      </Brota>
    </group>
  );
};

/** empaque de hule */
const Empaque: React.FC<{t: number}> = ({t}) => {
  if (!visible(t, ev.anillo)) return null;
  const k = t < 0.75 ? 1 : r(t, ev.anillo, 0.6);
  const brillo = t > ev.aprieta - 0.1 && t < ev.aprieta + 0.6;
  return (
    <group position={[0, BORDE + 0.002 + (1 - k) * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <Toro r={R - 0.002} tubo={0.0065} color={brillo ? '#ffb070' : '#e8743b'} />
    </group>
  );
};

// ---------- vapor y efectos ----------
const Vapores: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const p = presion(t);
  const yTapa = BORDE + alzaTapa(t, fps);
  const top = yTapa + altoTapa(0) + 0.06;
  // fuga por la orilla
  const fuga = t > 0.75 ? r(t, ev.vapor2, 0.4) * (1 - r(t, ev.anillo - 0.8, 0.4)) : 0;
  // pesa que baila
  const pesaOn = t > ev.pesa ? subePesa(t) * cl(p * 1.4) : 0;
  // tapón que se bota
  const seg = r(t, ev.bota, 0.05) * (1 - r(t, ev.bota + 1.2, 1.2));
  // vapor que quema
  const quema = r(t, ev.quema - 0.5, 0.25) * (1 - r(t, ev.quema + 0.9, 0.6));
  // reventón
  const boom = r(t, ev.revienta, 0.05) * (1 - r(t, ev.revienta + 0.4, 0.9));
  // empuja la tapa antes de volar
  const empuja = entre(t, ev.vapor1 + 1.5, ev.volando + 1.0) ? r(t, ev.vapor1 + 1.5, 1) : 0;
  return (
    <group>
      {fuga > 0.01 &&
        [0.4, 1.3, 2.2, 3.1, 4.0, 4.9, 5.7].map((a, i) => (
          <Chorro key={i} t={t} on={fuga} p={[Math.sin(a) * 0.23, BORDE + 0.005, Math.cos(a) * 0.23]} dir={[Math.sin(a) * 0.6, 0.8, Math.cos(a) * 0.6]} largo={0.18} n={5} r0={0.008} r1={0.03} vel={1.4} semilla={i * 13} />
        ))}
      <Chorro t={t} on={pesaOn} p={[0, top - 0.02, 0]} largo={0.3} n={9} r0={0.01} r1={0.045} vel={1.8} semilla={3} />
      <Chorro t={t} on={seg} p={[POS_TAPON[0], yTapa + POS_TAPON[1] + 0.01, POS_TAPON[2]]} dir={[-0.1, 1, 0.15]} largo={0.5} n={14} r0={0.012} r1={0.07} vel={2.4} semilla={7} abre={0.15} />
      <Chorro t={t} on={quema} p={[0.15, BORDE + 0.02, 0.12]} dir={[0.45, 0.45, 0.8]} largo={0.55} n={16} r0={0.03} r1={0.14} vel={1.3} semilla={11} abre={0.35} />
      <Chorro t={t} on={empuja * 0.7} p={[0.2, BORDE, 0.08]} dir={[0.5, 0.6, 0.3]} largo={0.15} n={5} r0={0.006} r1={0.025} vel={2} semilla={5} />
      {boom > 0.01 &&
        Array.from({length: 22}, (_, i) => {
          const a = rnd(i + 100) * Math.PI * 2;
          const e = rnd(i + 200);
          const k = cl((t - ev.revienta) / 1.3);
          const d = 0.08 + k * (0.35 + e * 0.25);
          return <Nube key={i} p={[Math.sin(a) * d, 0.2 + e * 0.25 + k * 0.15, Math.cos(a) * d]} r={0.05 + k * 0.12} o={boom * 0.95} />;
        })}
    </group>
  );
};

/** mano que intenta abrir la olla */
const Mano: React.FC<{t: number}> = ({t}) => {
  const llega = r(t, ev.abres - 0.5, 0.5) * (1 - r(t, ev.tanto - 0.6, 0.5));
  if (llega <= 0.01) return null;
  const quita = r(t, ev.quema - 0.2, 0.2) * (1 - r(t, ev.seguro - 0.8, 0.6));
  const sep = (1 - llega) * 0.6 + quita * 0.18;
  const giro = giroTapa(t);
  return (
    <group position={[0.42 + sep * 0.5, BORDE + 0.03 + sep * 0.5, sep * 0.7]} rotation={[0.25, giro, -0.75]}>
      <Cilindro r={0.032} r2={0.03} h={0.2} position={[0, 0.13, 0]} color="#f0c09a" />
      <Cilindro r={0.046} r2={0.042} h={0.3} position={[0, 0.38, 0]} color="#5b84c9" />
      <Toro r={0.042} tubo={0.008} position={[0, 0.235, 0]} rotation={[Math.PI / 2, 0, 0]} color="#4a72b5" />
      <Redondeada w={0.07} h={0.075} d={0.034} radio={0.015} position={[0, 0.0, 0]} color="#f0c09a" />
      {[-0.024, -0.008, 0.008, 0.024].map((x) => (
        <Redondeada key={x} w={0.014} h={0.046} d={0.017} radio={0.0065} position={[x, -0.055, 0.008]} rotation={[0.5, 0, 0]} color="#f0c09a" />
      ))}
      <Redondeada w={0.014} h={0.038} d={0.017} radio={0.0065} position={[0.042, -0.008, 0.008]} rotation={[0, 0, -0.6]} color="#f0c09a" />
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => (
  <>
    <Camara t={t} />
    <hemisphereLight args={['#fff6e6', '#b9a99a', 0.85]} />
    <ambientLight intensity={0.35} />
    <directionalLight
      position={[1.4, 2.6, 1.8]}
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
    <directionalLight position={[-2.2, 1.2, 0.5]} intensity={0.35} color="#dff1ff" />
    <Cocina />
    <Parrilla />
    <Llama t={t} />
    <Pieza t={t} desde={0.8} dir={[0.3, 0.4, 1]}>
      <Olla t={t} />
      <Agua t={t} />
      <SombraContacto position={[0, 0.071, 0]} w={0.5} d={0.5} o={0.25} />
    </Pieza>
    <Frijoles t={t} />
    <Hervor t={t} />
    <FrijolTapon t={t} />
    <Empaque t={t} />
    <Pieza t={t} desde={0} dir={[0, 1, 0.2]} caida={0}>
      <Tapa t={t} />
    </Pieza>
    <Vapores t={t} />
    <Mano t={t} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.expres - 0.2, 'ya tienes una olla exprés', false],
  [ev.volando - 0.3, '¡sale volando!', true],
  [ev.cierre - 0.3, 'el cierre', false],
  [ev.escapa - 0.1, 'se escapa por la orilla', true],
  [T('empaque') - 0.3, 'el empaque', false],
  [ev.revienta - 0.3, '¡revienta!', true],
  [ev.baila - 0.5, 'la válvula que baila', false],
  [ev.frijol - 0.1, 'un frijol tapa el tubito', true],
  [ev.seguridad - 0.6, 'válvula de seguridad', false],
  [ev.quema - 0.3, 'te quema la cara', true],
  [ev.seguro - 0.2, 'el seguro', false],
  [ev.c120 - 0.2, '¡120 °C!', false],
  [ev.tercera - 0.3, 'en 1/3 del tiempo', false],
  [ev.bailar - 0.4, 'si no baila…', true],
  [ev.apaga - 0.1, '¡apágala!', true],
  [ev.tapo - 0.5, 'el tubito se tapó', true],
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
    <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 24, color: '#15161c'}}>{nombre}</div>
  </div>
);

const Medidores: React.FC<{t: number}> = ({t}) => {
  if (t < ev.vapor1) return null;
  const p = presion(t);
  const alta = p > 0.84;
  const temp = 100 + 20 * r(t, ev.c120 - 0.3, 1.2);
  return (
    <>
      <Termometro x={950} valor={p} color={alta ? '#e5333b' : '#ff9f43'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="presión" />
      {t > ev.tanto + 0.5 && <Termometro x={830} valor={(temp - 20) / 110} color="#ff6b3d" arriba={`${Math.round(temp)}°`} nombre="°C" />}
    </>
  );
};

/** comparación de tiempos de cocción */
const Tiempos: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  if (!entre(t, ev.tercera - 0.4, ev.bailar - 0.3)) return null;
  const s = spring({frame: (t - ev.tercera + 0.4) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [ev.bailar - 0.6, ev.bailar - 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const k = r(t, ev.tercera - 0.2, 0.9);
  const barra = (txt: string, frac: number, color: string) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div style={{width: 250, fontFamily: FUENTE, fontWeight: 800, fontSize: 34, color: '#15161c', textAlign: 'right'}}>{txt}</div>
      <div style={{width: 520, height: 44, borderRadius: 22, border: '5px solid #15161c', background: '#ffffff', overflow: 'hidden'}}>
        <div style={{width: `${frac * k * 100}%`, height: '100%', background: color}} />
      </div>
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: 1180, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', padding: '26px 0', borderRadius: 30, background: 'rgba(255,255,255,0.85)', opacity: o, transform: `scale(${0.85 + 0.15 * s})`}}>
      {barra('olla normal', 1, '#9aa4b0')}
      {barra('olla exprés', 1 / 3, '#ff9f43')}
    </div>
  );
};

const Destello: React.FC<{t: number}> = ({t}) => {
  const o = r(t, ev.revienta - 0.02, 0.04) * (1 - r(t, ev.revienta + 0.05, 0.4));
  if (o <= 0.01) return null;
  return <AbsoluteFill style={{background: '#ffffff', opacity: o * 0.75}} />;
};

export const OllaExpres: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#f6dfb4'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.03, far: 40, position: [1.25, 1.15, 2.3]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(60,45,30,0.22) 100%)'}} />
      <Destello t={t} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Tiempos t={t} />
      <Audio src={staticFile('olla/voz.wav')} />
      <Audio src={staticFile('olla/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_OLLA = (datos as any).duration as number;
void MatToon;
