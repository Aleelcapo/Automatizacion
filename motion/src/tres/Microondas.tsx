import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/microondas.json';
import {Caja, Cilindro, Esfera, gradiente, Papel, Redondeada, SombraContacto, texturaAzulejo, Torno, Toro} from './toon';
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
  comida: T('comida', 1),
  caja1: T('caja', 1),
  disparas: T('disparas'),
  microondas: T('microondas'),
  girar1: T('girar', 1),
  calor: T('calor'),
  salen: T('salen'),
  tubo1: T('tubo', 1),
  magnetron1: T('magnetrón', 1),
  pero1: T('pero', 1),
  mandas: T('mandas'),
  rectangular: T('rectangular'),
  manguera: T('manguera'),
  guia2: T('guía', 2),
  pero2: T('pero', 2),
  calienta: T('calienta'),
  ventilador: T('ventilador'),
  sopla: T('sopla'),
  pero3: T('pero', 3),
  rebotan: T('rebotan'),
  forman: T('forman'),
  asi3: T('así', 3),
  girar2: T('girar', 2),
  giratorio: T('giratorio'),
  pero4: T('pero', 4),
  abres1: T('abres', 1),
  ti: T('ti'),
  asi4: T('así', 4),
  seguros: T('seguros'),
  apagan: T('apagan'),
  abres2: T('abres', 2),
  interruptores: T('interruptores'),
  pero5: T('pero', 5),
  vidrio1: T('vidrio', 1),
  escapan: T('escapan'),
  asi5: T('así', 5),
  pegas: T('pegas'),
  lamina: T('lámina'),
  hoyitos2: T('hoyitos', 2),
  caben: T('caben'),
  luz: T('luz'),
  pasa: T('pasa'),
  rejilla1: T('rejilla', 1),
  si2: T('si', 3),
  rota: T('rota'),
  uses: T('uses'),
};

// ---------- geometría ----------
const HW = 0.25; // medio ancho de la carcasa
const Y0 = 0.012;
const Y1 = 0.31;
const Z0 = -0.19;
const Z1 = 0.19;
const CAV = {x0: -0.23, x1: 0.075, y0: 0.03, y1: 0.29, z0: -0.17, z1: 0.185};
const CX = (CAV.x0 + CAV.x1) / 2;
const MAG: V3 = [0.165, 0.17, -0.06];
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
/** puerta: ángulo de apertura (0 cerrada) */
const puerta = (t: number) => {
  if (t < 0.75) return 0;
  const a1 = ventana(t, ev.abres1 - 0.15, ev.asi4 + 0.1, 0.35) * 1.1;
  const a2 = ventana(t, ev.abres2 - 0.15, ev.interruptores + 0.6, 0.3) * 0.5;
  const mal = ventana(t, ev.si2 + 1.2, 99, 0.4) * 0.06 * (0.6 + 0.4 * Math.sin(t * 3));
  return Math.max(a1, a2, mal);
};
/** encendido (ondas activas) */
const encendido = (t: number) => {
  if (t < 0.75) return 1;
  if (t < ev.disparas - 0.1) return 0;
  const apagado = ventana(t, ev.abres2 - 0.15, ev.interruptores + 0.5, 0.08);
  return 1 - apagado;
};
const hayRejilla = (t: number) => visible(t, ev.lamina - 0.2);
const xray = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.salen - 0.5, ev.pero3 + 0.2, 0.5));
const temperatura = (t: number) => {
  if (t < ev.disparas) return 20;
  return 20 + 55 * r(t, ev.disparas, 40) + 10 * r(t, ev.girar2, 4);
};
const calorMag = (t: number) => (t < 0.75 ? 0 : r(t, ev.calienta - 0.3, 1) * (1 - r(t, ev.sopla, 1.5)));

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 2.3, 0.45, 0.3, [0, 0.16, 0]],
  [1.0, 1.5, 0.4, 0.2, [0, 0.16, 0]],
  [6.7, 0.62, 0.3, 0.4, [CX, 0.08, 0.0]],
  [13.5, 0.75, 0.95, 0.35, [0.13, 0.19, -0.05]],
  [17.6, 0.95, 0.7, 0.55, [0.04, 0.24, -0.04]],
  [28.2, 0.75, 1.3, 0.3, [0.17, 0.17, -0.06]],
  [34.2, 1.05, 0.3, 0.45, [CX, 0.12, 0]],
  [46.9, 1.75, 0.5, 0.18, [0, 0.16, 0.12]],
  [50.5, 0.95, 0.5, 0.15, [-0.03, 0.16, 0.2]],
  [57.5, 1.25, 0.2, 0.15, [0, 0.16, 0.1]],
  [62.0, 0.62, 0.22, 0.1, [-0.06, 0.16, 0.19]],
  [69.3, 1.0, 0.25, 0.12, [0, 0.16, 0.15]],
  [74.0, 1.6, 0.45, 0.2, [0, 0.16, 0.05]],
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
/** panel plano con contorno, opacidad variable */
const Panel: React.FC<{p: V3; s: V3; color: string; o?: number; brillo?: number; emis?: string}> = ({p, s, color, o = 1, brillo = 0, emis}) => {
  if (o <= 0.01) return null;
  const tr = o < 0.98;
  return (
    <group position={p}>
      <mesh castShadow={!tr} receiveShadow>
        <boxGeometry args={s} />
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} emissive={emis ?? color} emissiveIntensity={brillo} />
      </mesh>
      {!tr && (
        <mesh>
          <boxGeometry args={[s[0] + 0.004, s[1] + 0.004, s[2] + 0.004]} />
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

/** onda: tubo ondulado que avanza por un camino */
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
const largoCamino = (cam: V3[]) => cam.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - cam[i][0], p[1] - cam[i][1], p[2] - cam[i][2]), 0);
const Onda: React.FC<{cam: V3[]; u: number; largo?: number; amp?: number; lambda?: number; color?: string; g?: number; o?: number}> = ({cam, u, largo = 0.3, amp = 0.008, lambda = 0.03, color = '#ff3d7a', g = 0.0025, o = 1}) => {
  if (u <= 0.005 || o <= 0.02) return null;
  const L = largoCamino(cam);
  const n = 40;
  const u0 = Math.max(0, u - largo);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const uu = u0 + ((u - u0) * i) / n;
    const p = puntoCamino(cam, uu);
    const w = amp * Math.sin(((uu * L) / lambda) * Math.PI * 2);
    pts.push(new THREE.Vector3(p[0], p[1] + w, p[2]));
  }
  const curva = new THREE.CatmullRomCurve3(pts);
  const tr = o < 0.98;
  return (
    <group>
      <mesh geometry={new THREE.TubeGeometry(curva, 80, g, 6, false)}>
        <meshBasicMaterial color={color} transparent={tr} opacity={o} />
      </mesh>
      <mesh geometry={new THREE.TubeGeometry(curva, 80, g + 0.0013, 6, false)}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={tr} opacity={o} />
      </mesh>
    </group>
  );
};
/** varias ondas en ciclo por varios caminos */
const Ondas: React.FC<{t: number; on: number; caminos: V3[][]; vel?: number; largo?: number; amp?: number; lambda?: number; color?: string; g?: number}> = ({t, on, caminos, vel = 0.5, largo = 0.35, ...resto}) => {
  if (on <= 0.01) return null;
  return (
    <group>
      {caminos.map((cam, i) => {
        const u = ((t * vel + rnd(i) + i * 0.29) % 1) * (1 + largo);
        const o = on * (1 - suave((u - 1.0) / largo));
        return <Onda key={i} cam={cam} u={u} largo={largo} o={o} {...resto} />;
      })}
    </group>
  );
};

// ---------- cocina ----------
const Cocina: React.FC = () => {
  const azulejo = useMemo(() => {
    const t = texturaAzulejo('#fdf3e4', '#e3cfae');
    t.repeat.set(6, 2);
    return t;
  }, []);
  return (
    <group>
      <mesh position={[0, 1.3, -0.4]} receiveShadow>
        <planeGeometry args={[7, 3]} />
        <meshToonMaterial color="#ffe0b8" gradientMap={gradiente()} />
      </mesh>
      <mesh position={[0, 0.35, -0.399]} receiveShadow>
        <planeGeometry args={[7, 0.7]} />
        <meshToonMaterial map={azulejo} gradientMap={gradiente()} />
      </mesh>
      <Redondeada w={4} h={0.05} d={0.7} radio={0.012} position={[0, -0.025, -0.05]} color="#5f7f9e" />
      <Caja w={4} h={0.86} d={0.64} position={[0, -0.48, -0.08]} color="#f2efe6" contorno={false} />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
        <group key={x}>
          <Redondeada w={0.56} h={0.7} d={0.03} radio={0.012} position={[x, -0.45, 0.25]} color="#fbf8f1" />
          <Redondeada w={0.16} h={0.025} d={0.03} radio={0.01} position={[x, -0.16, 0.28]} color="#c99a6b" />
        </group>
      ))}
      {/* alacena */}
      <group position={[0, 1.15, -0.28]}>
        <Redondeada w={1.5} h={0.5} d={0.26} radio={0.015} color="#7cb6a8" />
        {[-0.37, 0.37].map((x) => (
          <Redondeada key={x} w={0.7} h={0.46} d={0.02} radio={0.01} position={[x, 0, 0.135]} color="#8cc6b8" />
        ))}
      </group>
      {/* frutero y tostador */}
      <group position={[-0.52, 0, -0.1]}>
        <Cilindro r={0.11} r2={0.07} h={0.05} position={[0, 0.025, 0]} color="#e07a4f" />
        <Esfera r={0.04} position={[-0.03, 0.07, 0]} color="#e5333b" />
        <Esfera r={0.038} position={[0.04, 0.07, 0.01]} color="#f2c14e" />
        <Esfera r={0.035} position={[0.0, 0.075, -0.04]} color="#7cc26b" />
      </group>
      <group position={[0.5, 0, -0.15]}>
        <Redondeada w={0.22} h={0.15} d={0.13} radio={0.03} position={[0, 0.075, 0]} color="#e5333b" />
        <Caja w={0.14} h={0.01} d={0.03} position={[0, 0.151, 0.02]} color="#15161c" contorno={false} />
        <Caja w={0.14} h={0.01} d={0.03} position={[0, 0.151, -0.025]} color="#15161c" contorno={false} />
      </group>
    </group>
  );
};

// ---------- microondas ----------
const Carcasa: React.FC<{t: number}> = ({t}) => {
  const x = xray(t);
  const o = 1 - x * 0.82;
  const luz = encendido(t) * (t > ev.disparas || t < 0.75 ? 1 : 0);
  const paredes = '#e9edf1';
  return (
    <group>
      {/* base, fondo, lado izquierdo */}
      <Panel p={[0, Y0 + 0.006, 0]} s={[2 * HW, 0.012, Z1 - Z0]} color="#cfd6de" />
      <Panel p={[0, (Y0 + Y1) / 2, Z0 + 0.005]} s={[2 * HW, Y1 - Y0, 0.01]} color="#cfd6de" />
      <Panel p={[-HW + 0.005, (Y0 + Y1) / 2, 0]} s={[0.01, Y1 - Y0, Z1 - Z0]} color="#2f6f8f" />
      {/* techo y lado derecho (se transparentan para ver adentro) */}
      <Panel p={[0, Y1 - 0.005, 0]} s={[2 * HW, 0.01, Z1 - Z0]} color="#2f6f8f" o={o} />
      <Panel p={[HW - 0.005, (Y0 + Y1) / 2, 0]} s={[0.01, Y1 - Y0, Z1 - Z0]} color="#2f6f8f" o={o} />
      {/* cavidad interior (paredes claras, se iluminan cuando está prendido) */}
      <Panel p={[CX, CAV.y0, 0]} s={[CAV.x1 - CAV.x0, 0.004, CAV.z1 - CAV.z0]} color={paredes} brillo={luz * 0.25} emis="#ffe9a8" />
      <Panel p={[CX, (CAV.y0 + CAV.y1) / 2, CAV.z0]} s={[CAV.x1 - CAV.x0, CAV.y1 - CAV.y0, 0.004]} color={paredes} brillo={luz * 0.25} emis="#ffe9a8" />
      <Panel p={[CAV.x0, (CAV.y0 + CAV.y1) / 2, 0]} s={[0.004, CAV.y1 - CAV.y0, CAV.z1 - CAV.z0]} color={paredes} brillo={luz * 0.25} emis="#ffe9a8" />
      <Panel p={[CAV.x1, (CAV.y0 + CAV.y1) / 2, 0]} s={[0.004, CAV.y1 - CAV.y0, CAV.z1 - CAV.z0]} color={paredes} o={1 - x * 0.7} brillo={luz * 0.25} emis="#ffe9a8" />
      <Panel p={[CX, CAV.y1, 0]} s={[CAV.x1 - CAV.x0, 0.004, CAV.z1 - CAV.z0]} color={paredes} o={1 - x * 0.7} brillo={luz * 0.25} emis="#ffe9a8" />
      {/* tablero de control */}
      <group position={[0.165, 0.16, Z1 + 0.004]}>
        <Panel p={[0, 0, 0]} s={[0.15, 0.28, 0.008]} color="#2b2d33" />
        <Panel p={[0, 0.09, 0.006]} s={[0.11, 0.045, 0.004]} color={luz > 0.5 ? '#7cff9a' : '#1d3a2a'} />
        {Array.from({length: 9}, (_, i) => (
          <Redondeada key={i} w={0.026} h={0.018} d={0.006} radio={0.004} position={[-0.033 + (i % 3) * 0.033, 0.035 - Math.floor(i / 3) * 0.028, 0.006]} color="#d6dbe2" />
        ))}
        <Redondeada w={0.08} h={0.03} d={0.006} radio={0.008} position={[0, -0.1, 0.006]} color="#e5333b" />
      </group>
      {/* patitas */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cilindro key={`${sx}${sz}`} r={0.012} h={0.012} position={[sx * (HW - 0.03), 0.006, sz * 0.15]} color="#2b2d33" />))}
      <SombraContacto position={[0, 0.001, 0]} w={0.65} d={0.5} o={0.3} />
    </group>
  );
};

/** puerta con vidrio (y rejilla) — bisagra a la izquierda */
const texturaRejilla = () => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = 'rgba(40,46,56,0.88)';
  g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      g.beginPath();
      g.arc(8 + x * 16 + (y % 2) * 8, 8 + y * 16, 5.2, 0, Math.PI * 2);
      g.fill();
    }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 4);
  return t;
};
let _rej: THREE.CanvasTexture | null = null;
const Puerta: React.FC<{t: number}> = ({t}) => {
  const ang = puerta(t);
  const rej = hayRejilla(t) ? (t < 0.75 ? 1 : r(t, ev.lamina - 0.2, 0.5)) : 0;
  const rota = t > 0.75 && t > ev.rota - 0.2;
  const seguro = ventana(t, ev.seguros - 0.2, ev.seguros + 1.4, 0.2);
  if (!_rej) _rej = texturaRejilla();
  const W = 0.33;
  const H = 0.28;
  return (
    <group position={[-HW, 0.16, Z1 + 0.012]} rotation={[0, -ang, 0]}>
      <group position={[W / 2, 0, 0]}>
        {/* marco */}
        <Panel p={[0, H / 2 - 0.02, 0]} s={[W, 0.04, 0.02]} color="#2f6f8f" />
        <Panel p={[0, -H / 2 + 0.02, 0]} s={[W, 0.04, 0.02]} color="#2f6f8f" />
        <Panel p={[-W / 2 + 0.02, 0, 0]} s={[0.04, H, 0.02]} color="#2f6f8f" />
        <Panel p={[W / 2 - 0.02, 0, 0]} s={[0.04, H, 0.02]} color="#2f6f8f" />
        {/* jaladera */}
        <Redondeada w={0.016} h={0.18} d={0.02} radio={0.006} position={[W / 2 - 0.02, 0, 0.018]} color="#d6dbe2" />
        {/* vidrio */}
        <mesh>
          <planeGeometry args={[W - 0.08, H - 0.08]} />
          <meshBasicMaterial color="#bfe6ff" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* rejilla */}
        {rej > 0.01 && (
          <mesh position={[0, 0, -0.002]} scale={[1, rej, 1]}>
            <planeGeometry args={[W - 0.08, H - 0.08]} />
            <meshBasicMaterial map={_rej} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}
        {rota && (
          <mesh position={[0.04, -0.03, 0.001]} rotation={[0, 0, 0.4]}>
            <circleGeometry args={[0.03, 7]} />
            <meshBasicMaterial color="#bfe6ff" transparent opacity={0.6} />
          </mesh>
        )}
        {/* seguros (ganchos) */}
        {[0.08, -0.08].map((y) => (
          <group key={y} position={[W / 2 - 0.01, y, -0.016]}>
            <Caja w={0.02} h={0.012} d={0.02} color={seguro > 0.2 ? '#ffd34d' : '#9aa4b0'} />
          </group>
        ))}
      </group>
    </group>
  );
};

/** interruptores dentro del marco (se iluminan) */
const Interruptores: React.FC<{t: number}> = ({t}) => {
  const on = ventana(t, ev.seguros - 0.2, ev.interruptores + 1.4, 0.2);
  const apaga = ventana(t, ev.abres2 - 0.15, ev.interruptores + 0.6, 0.1);
  return (
    <group>
      {[0.24, 0.08].map((y) => (
        <group key={y} position={[0.09, y, Z1 - 0.01]}>
          <Caja w={0.018} h={0.02} d={0.02} color={on > 0.2 ? (apaga > 0.3 ? '#e5333b' : '#ffd34d') : '#4a4f5b'} />
        </group>
      ))}
    </group>
  );
};

/** magnetrón, guía de ondas y ventilador (en el compartimiento derecho) */
const Magnetron: React.FC<{t: number}> = ({t}) => {
  const h = calorMag(t);
  const marca = ventana(t, ev.tubo1, ev.magnetron1 + 1.3, 0.3);
  const brillo = h * (0.5 + 0.2 * Math.sin(t * 12)) + marca * 0.3 * (0.5 + 0.5 * Math.sin(t * 9));
  return (
    <group position={MAG}>
      <Panel p={[0, 0, 0]} s={[0.07, 0.07, 0.06]} color="#c3cbd5" brillo={brillo} emis={h > 0.2 ? '#ff4a2b' : '#ffd34d'} />
      {[-0.024, -0.008, 0.008, 0.024].map((y) => (
        <Panel key={y} p={[0, y, 0]} s={[0.085, 0.004, 0.075]} color="#aeb7c2" brillo={brillo * 0.8} emis={h > 0.2 ? '#ff4a2b' : '#ffd34d'} />
      ))}
      <Cilindro r={0.016} h={0.03} position={[0, 0.05, 0]} color="#d9823b" />
      <Esfera r={0.012} position={[0, 0.068, 0]} color="#c9ced8" />
      <Toro r={0.03} tubo={0.005} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.042, 0]} color="#d9823b" />
    </group>
  );
};
/** tramos de la guía de ondas: sube del magnetrón, cruza por arriba, baja a la caja */
const CAMINO_GUIA: V3[] = [
  [MAG[0], MAG[1] + 0.07, MAG[2]],
  [MAG[0], 0.3, MAG[2]],
  [-0.06, 0.3, MAG[2]],
  [-0.06, CAV.y1 - 0.01, MAG[2]],
];
const Guia: React.FC<{t: number}> = ({t}) => {
  if (!visible(t, ev.mandas - 0.2)) return null;
  const k = t < 0.75 ? 1 : r(t, ev.mandas - 0.2, ev.rectangular - ev.mandas + 0.5);
  const marca = ventana(t, ev.guia2 - 0.3, ev.guia2 + 1.2, 0.2);
  const color = marca > 0.2 ? '#ffd34d' : '#9aa4b0';
  const a = CAMINO_GUIA;
  const seg1 = Math.min(1, k * 3);
  const seg2 = cl(k * 3 - 1);
  const seg3 = cl(k * 3 - 2);
  const o = 1 - (1 - xray(t)) * 0.0;
  return (
    <group>
      {seg1 > 0.01 && <Panel p={[a[0][0], a[0][1] + ((a[1][1] - a[0][1]) * seg1) / 2, a[0][2]]} s={[0.05, (a[1][1] - a[0][1]) * seg1 + 0.001, 0.03]} color={color} o={o} />}
      {seg2 > 0.01 && <Panel p={[a[1][0] + ((a[2][0] - a[1][0]) * seg2) / 2, a[1][1], a[1][2]]} s={[Math.abs(a[2][0] - a[1][0]) * seg2 + 0.05, 0.03, 0.05]} color={color} o={o} />}
      {seg3 > 0.01 && <Panel p={[a[2][0], a[2][1] - 0.006 * seg3, a[2][2]]} s={[0.05, 0.02 * seg3, 0.03]} color={color} o={o} />}
    </group>
  );
};
const Ventilador: React.FC<{t: number}> = ({t}) => {
  if (!visible(t, ev.ventilador - 0.2)) return null;
  const gira = t * 18;
  return (
    <Brota t={t} desde={ev.ventilador - 0.2} position={[0.228, MAG[1], MAG[2]]}>
      <group rotation={[0, Math.PI / 2, 0]}>
      <Cilindro r={0.045} h={0.012} rotation={[Math.PI / 2, 0, 0]} color="#3a3e48" />
      <group rotation={[0, 0, gira]} position={[0, 0, 0.012]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 5]}>
            <Redondeada w={0.016} h={0.036} d={0.004} radio={0.003} position={[0, 0.02, 0]} rotation={[0, 0.5, 0]} color="#7fc6ff" />
          </group>
        ))}
        <Cilindro r={0.01} h={0.012} rotation={[Math.PI / 2, 0, 0]} color="#2b2d33" />
      </group>
      </group>
    </Brota>
  );
};
/** aire del ventilador hacia el magnetrón */
const Aire: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.sopla - 0.3, ev.pero3 + 0.4, 0.4);
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: 9}, (_, i) => {
        const k = (t * 1.2 + i / 9) % 1;
        const y = MAG[1] - 0.02 + (rnd(i + 4) - 0.5) * 0.06;
        return (
          <mesh key={i} position={[0.215 - k * 0.09, y, MAG[2] + (rnd(i) - 0.5) * 0.06]} scale={[3, 1, 1]}>
            <sphereGeometry args={[0.004, 8, 6]} />
            <meshBasicMaterial color="#7fc6ff" transparent opacity={on * (1 - k)} />
          </mesh>
        );
      })}
    </group>
  );
};

/** plato giratorio + tazón de comida */
const anguloPlato = (t: number) => {
  if (t < 0.75) return t * 2;
  const a = ev.girar2 - 0.3;
  return t > a ? (t - a) * 0.9 : 0;
};
const Plato: React.FC<{t: number}> = ({t}) => {
  const ang = anguloPlato(t);
  const temp = temperatura(t);
  const calorK = cl((temp - 20) / 60);
  const marca = ventana(t, ev.giratorio - 0.3, ev.giratorio + 1.2, 0.2);
  return (
    <group position={[CX, CAV.y0 + 0.006, 0]} rotation={[0, ang, 0]}>
      <Cilindro r={0.14} h={0.006} color={marca > 0.2 ? '#ffe680' : '#d9f2ff'} opacity={0.85} />
      <Toro r={0.09} tubo={0.004} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} color="#3a3e48" contorno={false} />
      <Pieza t={t} desde={ev.comida - 0.1} dir={[0, 1, 0.3]} caida={0.25}>
        <group position={[0.03, 0.004, 0.0]}>
          <Torno perfil={[[0, 0], [0.035, 0], [0.055, 0.012], [0.068, 0.05], [0.064, 0.052], [0.05, 0.016], [0, 0.008]]} color="#f2efe6" />
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.062, 40]} />
            <meshToonMaterial color={new THREE.Color('#f2a33a').lerp(new THREE.Color('#ff5a2b'), calorK * 0.6).getStyle()} gradientMap={gradiente()} />
          </mesh>
          {/* tropezones */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Esfera key={i} r={0.008} escala={[1, 0.5, 1]} position={[Math.sin(i * 2.3) * 0.035, 0.041, Math.cos(i * 2.3) * 0.035]} color={['#7cc26b', '#e5333b', '#f7e3c8'][i % 3]} contorno={false} />
          ))}
        </group>
      </Pieza>
    </group>
  );
};
/** vapor del tazón cuando ya está caliente */
const Vapor: React.FC<{t: number}> = ({t}) => {
  const k = cl((temperatura(t) - 45) / 25);
  if (k <= 0.01) return null;
  const ang = anguloPlato(t);
  const bx = CX + Math.cos(ang) * 0.03;
  const bz = -Math.sin(ang) * 0.03;
  return (
    <group>
      {Array.from({length: 6}, (_, i) => {
        const u = (t * 0.5 + i / 6) % 1;
        return (
          <mesh key={i} position={[bx + Math.sin(t * 2 + i) * 0.01, CAV.y0 + 0.06 + u * 0.15, bz + (rnd(i) - 0.5) * 0.04]}>
            <sphereGeometry args={[0.01 + u * 0.02, 14, 10]} />
            <meshToonMaterial color="#ffffff" gradientMap={gradiente()} transparent opacity={k * Math.sin(u * Math.PI) * 0.6} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** zonas calientes y frías en el piso de la cavidad */
const Zonas: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.forman - 0.3, ev.pero4, 0.5);
  if (on <= 0.01) return null;
  return (
    <group position={[CX, CAV.y0 + 0.016, 0]}>
      {Array.from({length: 12}, (_, i) => {
        const x = -0.12 + (i % 4) * 0.08;
        const z = -0.1 + Math.floor(i / 4) * 0.1;
        const caliente = (i + Math.floor(i / 4)) % 2 === 0;
        const pul = 0.8 + 0.2 * Math.sin(t * 6 + i);
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.032 * pul, 28]} />
            <meshBasicMaterial color={caliente ? '#ff4a2b' : '#3fa9f5'} transparent opacity={on * 0.5} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** todas las ondas */
const OndasTodas: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75) return null;
  const on = encendido(t);
  const dentro = on * (t > ev.disparas ? 1 : 0) * (1 - ventana(t, ev.salen - 0.2, ev.pero3 - 0.2, 0.3) * 0.7);
  const salida: V3 = [-0.06, CAV.y1 - 0.01, MAG[2]];
  const cavidad: V3[][] = [
    [salida, [CX + 0.02, 0.07, 0.02]],
    [salida, [-0.2, 0.18, 0.1], [-0.05, 0.06, 0.12]],
    [salida, [-0.22, 0.25, -0.12], [-0.1, 0.05, -0.05]],
    [salida, [0.05, 0.15, 0.12], [-0.15, 0.08, 0.0]],
  ];
  const rebote = ventana(t, ev.rebotan - 0.3, ev.pero4, 0.4);
  // del magnetrón por la guía
  const guiaOn = ventana(t, ev.salen - 0.2, ev.pero2 + 0.3, 0.3);
  const magOn = ventana(t, ev.salen - 0.2, ev.pero1 - 0.2, 0.3);
  // puerta abierta: salen hacia ti
  const abierta = ventana(t, ev.abres1, ev.asi4, 0.2);
  // vidrio normal: se escapan; con rejilla: rebotan
  const escapan = ventana(t, ev.vidrio1 - 0.2, ev.asi5 + 0.6, 0.3);
  const rebotan = ventana(t, ev.hoyitos2 - 0.3, ev.luz - 0.2, 0.3);
  const luz = ventana(t, ev.luz - 0.2, ev.rejilla1 + 1, 0.3);
  const fuga = ventana(t, ev.rota, 99, 0.3);
  const haciaFuera = (z: number): V3[][] => [
    [[CX, 0.12, 0.0], [CX - 0.03, 0.14, z]],
    [[CX + 0.05, 0.2, -0.05], [CX + 0.03, 0.22, z]],
    [[CX - 0.08, 0.08, 0.0], [CX - 0.1, 0.09, z]],
  ];
  return (
    <group>
      <Ondas t={t} on={dentro * (1 - rebote * 0.3)} caminos={cavidad} vel={0.8} largo={0.4} />
      <Ondas
        t={t}
        on={rebote * on}
        caminos={[
          [salida, [CX - 0.05, 0.04, 0.05], [CAV.x0 + 0.01, 0.2, 0.0], [0.0, 0.27, 0.1], [CAV.x1 - 0.01, 0.1, -0.1]],
          [salida, [CAV.x0 + 0.01, 0.1, -0.12], [-0.02, 0.04, 0.15], [CAV.x1 - 0.01, 0.2, 0.05]],
        ]}
        vel={0.35}
        largo={0.25}
      />
      <Ondas t={t} on={magOn} caminos={[[[MAG[0], MAG[1] + 0.07, MAG[2]], [MAG[0], MAG[1] + 0.22, MAG[2]]], [[MAG[0] + 0.02, MAG[1] + 0.07, MAG[2]], [MAG[0] + 0.1, MAG[1] + 0.2, MAG[2]]]]} vel={0.9} largo={0.6} />
      <Ondas t={t} on={guiaOn} caminos={[CAMINO_GUIA, CAMINO_GUIA]} vel={0.6} largo={0.3} amp={0.006} lambda={0.025} />
      <Ondas t={t} on={abierta} caminos={haciaFuera(0.75)} vel={0.9} largo={0.4} amp={0.012} />
      <Ondas t={t} on={escapan} caminos={haciaFuera(0.6)} vel={0.7} largo={0.4} amp={0.01} />
      <Ondas t={t} on={rebotan} caminos={haciaFuera(0.19).map((c) => [...c, [c[0][0] + 0.03, c[0][1] + 0.03, -0.1] as V3])} vel={0.6} largo={0.4} amp={0.01} />
      <Ondas t={t} on={luz} caminos={haciaFuera(0.7)} vel={1.0} largo={0.25} amp={0.002} lambda={0.006} color="#ffe14d" g={0.0018} />
      <Ondas t={t} on={fuga} caminos={[[[CX + 0.04, 0.13, 0.0], [CX + 0.06, 0.12, 0.65]], [[CX - 0.18, 0.2, 0.05], [CX - 0.35, 0.22, 0.6]]]} vel={0.8} largo={0.4} amp={0.01} />
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
      shadow-camera-left={-1.2}
      shadow-camera-right={1.2}
      shadow-camera-top={1.2}
      shadow-camera-bottom={-1.2}
      shadow-bias={-0.0004}
      shadow-radius={4}
    />
    <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
    <Cocina />
    <Pieza t={t} desde={0.8} dir={[0.6, 0.3, 1]} caida={0.3}>
      <Carcasa t={t} />
      <Puerta t={t} />
      <Interruptores t={t} />
      <Magnetron t={t} />
      <Guia t={t} />
      <Ventilador t={t} />
    </Pieza>
    <Plato t={t} />
    <Zonas t={t} />
    <Vapor t={t} />
    <Aire t={t} />
    <OndasTodas t={t} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.comida - 0.1, 'comida', false],
  [ev.caja1 - 0.1, 'caja de metal', false],
  [ev.disparas - 0.1, 'ondas de radio', false],
  [ev.microondas - 0.3, 'ya tienes un microondas', false],
  [ev.girar1 - 0.3, 'el agua gira', false],
  [T('millones') - 0.3, '¡miles de millones de veces por segundo!', false],
  [ev.calor - 0.6, 'movimiento = calor', false],
  [ev.tubo1 - 0.3, 'un tubo especial', false],
  [ev.magnetron1 - 0.3, 'el magnetrón', false],
  [ev.mandas - 0.3, 'un tubo rectangular', false],
  [ev.manguera - 0.4, 'manguera de ondas', false],
  [ev.guia2 - 0.6, 'la guía de ondas', false],
  [ev.calienta - 0.3, '¡se calienta muchísimo!', true],
  [ev.ventilador - 0.2, 'un ventilador', false],
  [ev.rebotan - 0.3, 'las ondas rebotan', false],
  [ev.forman, 'zonas calientes y frías', true],
  [ev.girar2 - 0.4, 'el plato gira', false],
  [ev.giratorio - 0.5, 'el plato giratorio', false],
  [ev.abres1 - 0.2, 'si abres la puerta…', true],
  [ev.ti - 0.6, '¡te calientan a ti!', true],
  [ev.seguros - 0.3, 'unos seguros', false],
  [ev.apagan - 0.2, 'apagan todo al abrir', false],
  [ev.interruptores - 0.3, 'interruptores de seguridad', false],
  [ev.vidrio1 - 0.3, 'vidrio normal', true],
  [ev.escapan - 0.6, '¡las ondas se escapan!', true],
  [ev.lamina - 0.3, 'lámina con hoyitos', false],
  [ev.caben - 0.8, 'las ondas no caben', false],
  [ev.luz - 0.3, 'la luz sí pasa', false],
  [ev.rejilla1 - 0.3, 'la rejilla', false],
  [ev.rota - 0.5, '¿rejilla rota?', true],
  [ev.uses - 0.8, '¡no lo uses!', true],
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
  if (t < ev.disparas) return null;
  const c = temperatura(t);
  const m = calorMag(t);
  return (
    <>
      <Termometro x={950} valor={(c - 10) / 85} color="#ff6b3d" arriba={`${Math.round(c)}°`} nombre="comida" />
      {entre(t, ev.pero2 - 0.3, ev.pero3 + 0.3) && <Termometro x={830} valor={0.25 + m * 0.7} color={m > 0.6 ? '#e5333b' : '#ff9f43'} arriba={m > 0.6 ? '¡!' : ''} colorArriba="#e5333b" nombre="magnetrón" />}
    </>
  );
};

/** molécula de agua girando (recuadro) */
const Molecula: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.girar1 - 0.5;
  const b = ev.salen - 0.3;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const giro = (t - a) * 1400 * r(t, a + 0.3, 1.2);
  const desenfoque = r(t, T('millones') - 0.3, 0.8);
  const atomo = (x: number, y: number, rr: number, c: string, txt: string) => (
    <div style={{position: 'absolute', left: x - rr, top: y - rr, width: rr * 2, height: rr * 2, borderRadius: rr, background: c, border: '6px solid #15161c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: rr * 0.8, color: '#15161c'}}>{txt}</div>
  );
  return (
    <div style={{position: 'absolute', left: 230, top: 1110, width: 620, height: 380, borderRadius: 40, background: '#fff7ea', border: '6px solid #15161c', opacity: o, transform: `scale(${0.85 + 0.15 * s})`, overflow: 'hidden'}}>
      <svg style={{position: 'absolute', left: 0, top: 0}} width={620} height={380}>
        {[0, 1, 2].map((i) => (
          <path key={i} d={Array.from({length: 63}, (_, j) => `${j === 0 ? 'M' : 'L'}${j * 10},${60 + i * 130 + Math.sin((j * 10 - (t - a) * 300) / 30) * 22}`).join(' ')} stroke="#ff3d7a" strokeWidth={5} fill="none" opacity={0.35} />
        ))}
      </svg>
      <div style={{position: 'absolute', left: 310, top: 190, width: 0, height: 0, transform: `rotate(${giro}deg)`, filter: `blur(${desenfoque * 2}px)`}}>
        {atomo(-72, 55, 42, '#ffffff', 'H')}
        {atomo(72, 55, 42, '#ffffff', 'H')}
        {atomo(0, 0, 72, '#e5333b', 'O')}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 16, textAlign: 'center', fontFamily: FUENTE, fontWeight: 800, fontSize: 34, color: '#15161c'}}>agua</div>
    </div>
  );
};

/** hoyitos vs ondas (recuadro) */
const Hoyitos: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.hoyitos2 - 0.4;
  const b = ev.rejilla1 - 0.1;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fase = (t - a) * 260;
  const conLuz = t > ev.luz - 0.2;
  const ancho = 640;
  const pared = 300;
  // onda grande: llega a la pared y rebota
  const grande = Array.from({length: 31}, (_, j) => {
    const x = j * 10;
    return `${j === 0 ? 'M' : 'L'}${x},${120 + Math.sin((x - fase) / 26) * 50}`;
  }).join(' ');
  const chica = Array.from({length: 64}, (_, j) => {
    const x = j * 10;
    return `${j === 0 ? 'M' : 'L'}${x},${270 + Math.sin((x - fase * 1.4) / 4) * 8}`;
  }).join(' ');
  return (
    <div style={{position: 'absolute', left: 220, top: 1100, width: ancho, height: 380, borderRadius: 40, background: '#fff7ea', border: '6px solid #15161c', opacity: o, transform: `scale(${0.85 + 0.15 * s})`, overflow: 'hidden'}}>
      <svg style={{position: 'absolute', left: 0, top: 0}} width={ancho} height={380}>
        <rect x={pared} y={0} width={34} height={380} fill="#3a3e48" />
        {Array.from({length: 9}, (_, i) => (
          <rect key={i} x={pared} y={20 + i * 42} width={34} height={18} fill="#fff7ea" />
        ))}
        <path d={grande} stroke="#ff3d7a" strokeWidth={9} fill="none" strokeLinecap="round" />
        {conLuz && <path d={chica} stroke="#ffc400" strokeWidth={6} fill="none" strokeLinecap="round" />}
      </svg>
      <div style={{position: 'absolute', left: 20, top: 16, fontFamily: FUENTE, fontWeight: 800, fontSize: 30, color: '#e5333b'}}>onda</div>
      {conLuz && <div style={{position: 'absolute', right: 24, top: 300, fontFamily: FUENTE, fontWeight: 800, fontSize: 30, color: '#d99a00'}}>luz</div>}
    </div>
  );
};

export const Microondas: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#ffe0b8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(60,40,25,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Molecula t={t} />
      <Hoyitos t={t} />
      <Audio src={staticFile('microondas/voz.wav')} />
      <Audio src={staticFile('microondas/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_MICROONDAS = (datos as any).duration as number;
