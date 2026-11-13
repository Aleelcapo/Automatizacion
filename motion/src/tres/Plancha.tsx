import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/plancha.json';
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
type V3 = [number, number, number];

const ev = {
  placa1: T('placa', 1),
  resistencia: T('resistencia'),
  plancha1: T('plancha', 1),
  pero1: T('pero', 1),
  quema: T('quema'),
  asi1: T('así', 1),
  metales: T('metales'),
  doblan: T('doblan'),
  cortan: T('cortan'),
  temperatura: T('temperatura'),
  termostato: T('termostato'),
  pero2: T('pero', 2),
  raspa: T('raspa'),
  pega: T('pega'),
  asi2: T('así', 2),
  capa: T('capa'),
  ceramica: T('cerámica'),
  suela: T('suela'),
  pero3: T('pero', 3),
  arrugas: T('arrugas'),
  asi3: T('así', 3),
  deposito: T('depósito'),
  tanque: T('tanque'),
  pero4: T('pero', 4),
  poquito2: T('poquito', 2),
  asi4: T('así', 4),
  valvula: T('válvula'),
  gotas: T('gotas'),
  camara1: T('cámara', 1),
  vapor1: T('vapor', 1),
  camara2: T('cámara', 2),
  pero5: T('pero', 5),
  atrapado: T('atrapado'),
  asi5: T('así', 5),
  hoyitos1: T('hoyitos', 1),
  salga: T('salga'),
  afloje: T('afloje'),
  hoyitos2: T('hoyitos', 2),
  pero6: T('pero', 6),
  fria: T('fría'),
  mancha: T('mancha'),
  asi6: T('así', 6),
  seguro: T('seguro'),
  caliente3: T('caliente', 3),
  pero7: T('pero', 7),
  olvida: T('olvida'),
  prendida: T('prendida'),
  asi7: T('así', 7),
  apagan: T('apagan'),
  minutos: T('minutos'),
  si5: T('si', 5),
  sucia: T('sucia'),
  sarro: T('sarro'),
  filtrada: T('filtrada'),
};

// ---------- geometría de la plancha (punta hacia +x) ----------
const formaSuela = (s = 1) => {
  const f = new THREE.Shape();
  f.moveTo(-0.12 * s, -0.062 * s);
  f.lineTo(0.0, -0.062 * s);
  f.quadraticCurveTo(0.1 * s, -0.055 * s, 0.145 * s, 0);
  f.quadraticCurveTo(0.1 * s, 0.055 * s, 0.0, 0.062 * s);
  f.lineTo(-0.12 * s, 0.062 * s);
  f.quadraticCurveTo(-0.13 * s, 0.062 * s, -0.13 * s, 0.05 * s);
  f.lineTo(-0.13 * s, -0.05 * s);
  f.quadraticCurveTo(-0.13 * s, -0.062 * s, -0.12 * s, -0.062 * s);
  return f;
};
const HOYOS: [number, number][] = Array.from({length: 14}, (_, i) => {
  const fila = i % 2;
  const k = Math.floor(i / 2);
  return [-0.08 + k * 0.025, (fila ? 1 : -1) * (0.018 + (k % 2) * 0.012)];
});
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
const hayTermostato = (t: number) => visible(t, ev.metales - 0.2);
const hayTanque = (t: number) => visible(t, ev.deposito - 0.2);
const hayValvula = (t: number) => visible(t, ev.valvula - 0.2);
const hayHoyos = (t: number) => visible(t, ev.hoyitos1 - 0.2);
const suelaLisa = (t: number) => (t < 0.75 ? 1 : r(t, ev.capa - 0.2, 0.8));
/** temperatura de la placa 0..1 (0.62 = la que eliges) */
const temperatura = (t: number) => {
  if (t < 0.75) return 0.62;
  let v = r(t, ev.resistencia - 0.3, 3.0) * 0.7;
  v += r(t, ev.pero1 + 0.3, 2.5) * 0.3; // sin parar
  if (t > ev.cortan - 0.2) v = 0.62 + 0.03 * Math.sin(t * 2) + (1 - r(t, ev.cortan - 0.2, 1.0)) * 0.38;
  if (entre(t, ev.pero6, ev.seguro + 0.4)) v = 0.15 + 0.47 * r(t, ev.seguro - 0.4, 1.4);
  if (t > ev.apagan - 0.3 && t < ev.si5) v = 0.62 * (1 - r(t, ev.apagan - 0.3, 2.5));
  return v;
};
/** resistencia encendida (0..1) */
const resistencia = (t: number) => {
  if (t < 0.75) return 1;
  if (t < ev.resistencia - 0.2) return 0;
  if (t > ev.cortan - 0.2 && t < ev.termostato + 1.2) return Math.sin(t * 3) > 0 ? 0.25 : 1;
  if (t > ev.apagan - 0.3 && t < ev.si5) return 0;
  return 1;
};
const xray = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.resistencia - 0.4, ev.pero1, 0.4), ventana(t, ev.metales - 0.4, ev.pero2, 0.4), ventana(t, ev.pero4, ev.asi5, 0.4), ventana(t, ev.seguro - 0.6, ev.pero7, 0.4)));
/** movimiento: x de la plancha sobre la tabla */
const vaiven = (t: number) => {
  const on = t < 0.75 ? 0 : Math.max(ventana(t, ev.raspa - 0.4, ev.asi2, 0.4), ventana(t, ev.pero3, ev.asi3, 0.4), ventana(t, ev.salga, ev.hoyitos2 + 0.6, 0.4), ventana(t, ev.mancha - 0.6, ev.asi6, 0.4));
  return Math.sin(t * 2.4) * 0.12 * on;
};
/** inclinada sobre el talón (para ver los hoyitos) */
const inclinada = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.hoyitos1 - 0.4, ev.salga - 0.2, 0.4), ventana(t, ev.si5 - 0.2, 99, 0.4)));
const vaporSale = (t: number) => (t < 0.75 ? 0.6 : Math.max(ventana(t, ev.salga - 0.3, ev.pero6, 0.4), ventana(t, ev.caliente3 - 0.4, ev.pero7, 0.4)));
const arrugas = (t: number) => {
  if (t < 0.75) return 0.15;
  let a = 1;
  a -= 0.25 * r(t, ev.salga, 3) + 0.6 * r(t, ev.afloje - 0.3, 1.5);
  return Math.max(0.12, a);
};

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 1.5, 0.6, 0.35, [0, 0.06, 0]],
  [1.0, 0.85, 0.5, 0.3, [0, 0.05, 0]],
  [5.0, 0.95, 0.5, 0.5, [0, 0.03, 0]],
  [8.6, 0.6, 0.7, 0.25, [-0.03, 0.06, 0]],
  [14.0, 0.55, 0.25, 0.45, [0.05, 0.11, 0]],
  [17.4, 0.65, 1.2, 0.12, [0, 0.03, 0]],
  [25.7, 1.15, 0.5, 0.5, [0, 0.03, 0]],
  [30.0, 0.65, 0.6, 0.3, [0.03, 0.09, 0]],
  [37.4, 0.55, 0.8, 0.2, [0.02, 0.06, 0]],
  [45.9, 0.65, 0.7, 0.15, [0, 0.05, 0]],
  [48.9, 0.75, 0.25, 0.2, [-0.05, 0.12, 0]],
  [50.6, 0.95, 0.5, 0.35, [0, 0.04, 0]],
  [56.6, 0.95, 0.5, 0.45, [0, 0.03, 0]],
  [61.4, 0.55, 0.7, 0.25, [0.02, 0.07, 0]],
  [66.8, 1.05, 0.4, 0.35, [0, 0.05, 0]],
  [73.6, 0.7, 0.3, 0.2, [-0.05, 0.12, 0]],
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
/** extrusión de la forma de la suela (acostada en el plano xz) */
const Extruida: React.FC<{s: number; alto: number; y: number; color: string; o?: number; brillo?: number; emis?: string; contorno?: boolean}> = ({s, alto, y, color, o = 1, brillo = 0, emis, contorno = true}) => {
  const geo = useMemo(() => new THREE.ExtrudeGeometry(formaSuela(s), {depth: alto, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3, curveSegments: 24}), [s, alto]);
  const tinta = useMemo(() => new THREE.ExtrudeGeometry(formaSuela(s * 1.025), {depth: alto + 0.003, bevelEnabled: true, bevelSize: 0.0055, bevelThickness: 0.0055, bevelSegments: 3, curveSegments: 24}), [s, alto]);
  const tr = o < 0.98;
  return (
    <group position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geo} castShadow={!tr} receiveShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} emissive={emis ?? color} emissiveIntensity={brillo} />
      </mesh>
      {contorno && !tr && (
        <mesh geometry={tinta} position={[0, 0, -0.0015]}>
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

// ---------- tabla y tela ----------
const Tabla: React.FC = () => (
  <group>
    <mesh position={[0, 1.2, -0.7]}>
      <planeGeometry args={[7, 3]} />
      <meshToonMaterial color="#e3d4f5" gradientMap={gradiente()} />
    </mesh>
    {/* tabla de planchar */}
    <Redondeada w={1.4} h={0.03} d={0.42} radio={0.012} position={[0.0, -0.015, 0]} color="#f2c14e" />
    {Array.from({length: 7}, (_, i) => (
      <mesh key={i} position={[-0.6 + i * 0.2, 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
    ))}
    <Cilindro r={0.012} h={0.9} position={[-0.3, -0.45, 0.0]} rotation={[0, 0, 0.5]} color="#9aa4b0" />
    <Cilindro r={0.012} h={0.9} position={[0.3, -0.45, 0.0]} rotation={[0, 0, -0.5]} color="#9aa4b0" />
    {/* canasta con ropa y jarra de agua */}
    <group position={[-0.65, -0.5, -0.35]}>
      <Torno perfil={[[0, 0], [0.18, 0], [0.22, 0.3], [0, 0.3]]} color="#e8c27a" />
      <Esfera r={0.18} escala={[1.1, 0.4, 1.1]} position={[0, 0.3, 0]} color="#7fc6ff" />
    </group>
  </group>
);
/** camisa con arrugas */
const Tela: React.FC<{t: number}> = ({t}) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(0.95, 0.36, 90, 36), []);
  const a = arrugas(t);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const w = Math.sin(x * 38 + Math.sin(y * 14) * 2) * 0.5 + Math.sin(x * 17 - y * 23) * 0.5;
    pos.setZ(i, Math.max(0, w) * 0.026 * a + 0.002);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0.0, 0.0, 0]} receiveShadow>
      <meshToonMaterial color="#5aa0e0" gradientMap={gradiente()} />
    </mesh>
  );
};
/** marca quemada y mancha de agua */
const Marcas: React.FC<{t: number}> = ({t}) => {
  const quemada = t < 0.75 ? 0 : r(t, ev.quema - 0.4, 0.8) * (1 - r(t, ev.asi1 + 0.4, 0.5));
  const mancha = t < 0.75 ? 0 : r(t, ev.mancha - 0.4, 0.6) * (1 - r(t, ev.asi6 + 1.0, 0.5));
  const sarro = t < 0.75 ? 0 : r(t, ev.sucia - 0.2, 0.6);
  const forma = useMemo(() => formaSuela(1.05), []);
  return (
    <group>
      {quemada > 0.01 && (
        <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[forma]} />
          <meshBasicMaterial color="#5a3018" transparent opacity={0.75 * quemada} />
        </mesh>
      )}
      {mancha > 0.01 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.05 + i * 0.07, 0.017, (rnd(i) - 0.5) * 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.03 + rnd(i + 3) * 0.02, 24]} />
            <meshBasicMaterial color="#2f63ad" transparent opacity={0.6 * mancha} />
          </mesh>
        ))}
      {sarro > 0.01 &&
        [0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.22 + (rnd(i) - 0.5) * 0.08, 0.017, (rnd(i + 4) - 0.5) * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.015 + rnd(i + 3) * 0.015, 16]} />
            <meshBasicMaterial color="#8a6a3a" transparent opacity={0.7 * sarro} />
          </mesh>
        ))}
    </group>
  );
};

// ---------- la plancha ----------
const Plancha: React.FC<{t: number}> = ({t}) => {
  const x = xray(t);
  const temp = temperatura(t);
  const res = resistencia(t);
  const lisa = suelaLisa(t);
  const marcaSuela = ventana(t, ev.suela - 0.4, ev.suela + 1.2, 0.2);
  const colorSuela = marcaSuela > 0.2 ? '#ffe680' : new THREE.Color('#9aa4b0').lerp(new THREE.Color(t > ev.ceramica - 0.3 || t < 0.75 ? '#f4f1ea' : '#3a3e48'), lisa).getStyle();
  const cuerpoO = 1 - x * 0.75;
  const dobla = hayTermostato(t) ? (temp > 0.6 ? 0.5 : 0) : 0;
  const marcaTermo = ventana(t, ev.termostato - 0.4, ev.termostato + 1.2, 0.2);
  const dial = ventana(t, ev.temperatura - 0.4, ev.termostato, 0.2);
  const tanqueNivel = hayTanque(t) ? (t < 0.75 ? 0.7 : 0.75 * r(t, ev.deposito, 1.0) - 0.1 * r(t, ev.gotas, 10)) : 0;
  const gota = ventana(t, ev.gotas - 0.3, ev.camara2 + 1.2, 0.2) + ventana(t, ev.caliente3 - 0.3, ev.pero7, 0.2);
  const marcaCamara = ventana(t, ev.camara1 - 0.3, ev.camara2 + 1.2, 0.2);
  const seguro = ventana(t, ev.seguro - 0.3, ev.pero7, 0.2);
  const autoApaga = ventana(t, ev.apagan - 0.3, ev.si5, 0.2);
  return (
    <group>
      {/* suela */}
      <Extruida s={1} alto={0.012} y={0.0} color={colorSuela} brillo={temp * 0.25} emis="#ff6a3d" />
      {/* hoyitos */}
      {hayHoyos(t) &&
        HOYOS.map(([hx, hz], i) => (
          <mesh key={i} position={[hx, -0.0045, hz]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.0042 * (t < 0.75 ? 1 : r(t, ev.hoyitos1 - 0.2 + i * 0.03, 0.2)), 12]} />
            <meshBasicMaterial color={t > ev.sucia - 0.2 ? '#8a6a3a' : '#15161c'} side={THREE.DoubleSide} />
          </mesh>
        ))}
      {/* resistencia (dentro de la placa) */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.004, 8, 48, Math.PI * 1.7]} />
        <meshBasicMaterial color={res > 0.5 ? new THREE.Color('#ff7a1f').lerp(new THREE.Color('#ffe14d'), temp).getStyle() : '#7a2a1a'} />
      </mesh>
      {/* cuerpo */}
      <Extruida s={0.9} alto={0.045} y={0.016} color="#a05cd6" o={cuerpoO} />
      {/* asa */}
      <group position={[-0.02, 0.11, 0]}>
        <Redondeada w={0.16} h={0.022} d={0.035} radio={0.01} color="#3a2a5a" opacity={Math.max(0.5, cuerpoO)} />
        <Redondeada w={0.02} h={0.06} d={0.03} radio={0.008} position={[-0.075, -0.03, 0]} color="#3a2a5a" opacity={Math.max(0.5, cuerpoO)} />
        <Redondeada w={0.025} h={0.05} d={0.03} radio={0.008} position={[0.075, -0.03, 0]} rotation={[0, 0, -0.4]} color="#3a2a5a" opacity={Math.max(0.5, cuerpoO)} />
      </group>
      {/* perilla de temperatura */}
      <group position={[0.07, 0.075, 0]}>
        <Cilindro r={0.018} h={0.01} color={dial > 0.2 ? '#ffd34d' : '#f2efe6'} />
        <Caja w={0.02} h={0.004} d={0.004} position={[0.005, 0.006, 0]} rotation={[0, dial * 1.2, 0]} color="#e5333b" contorno={false} />
      </group>
      {/* termostato (dos metales) */}
      {hayTermostato(t) && (
        <Brota t={t} desde={ev.metales - 0.2} position={[-0.05, 0.03, 0]}>
          <group rotation={[0, 0, dobla * 0.5]}>
            <Caja w={0.05} h={0.004} d={0.012} position={[0.025, 0.002, 0]} color={marcaTermo > 0.2 ? '#ffd34d' : '#d9823b'} />
            <Caja w={0.05} h={0.004} d={0.012} position={[0.025, -0.002, 0]} color={marcaTermo > 0.2 ? '#ffd34d' : '#aeb7c2'} />
          </group>
          <Esfera r={0.005} position={[0.055, 0.008, 0]} color={dobla > 0.2 ? '#e5333b' : '#7cff9a'} contorno={false} />
        </Brota>
      )}
      {/* tanque de agua */}
      {hayTanque(t) && (
        <Brota t={t} desde={ev.deposito - 0.2} position={[0.03, 0.065, 0]}>
          <Redondeada w={0.08} h={0.04} d={0.07} radio={0.01} color="#bfe6ff" opacity={0.45} contorno={false} />
          <mesh position={[0, -0.02 + tanqueNivel * 0.02, 0]}>
            <boxGeometry args={[0.07, tanqueNivel * 0.035, 0.06]} />
            <meshBasicMaterial color="#3fa9f5" transparent opacity={0.6} />
          </mesh>
          {/* tapita para llenar */}
          <Cilindro r={0.01} h={0.006} position={[0.03, 0.022, 0]} color="#3fa9f5" />
        </Brota>
      )}
      {/* válvula y cámara de vapor */}
      {hayValvula(t) && (
        <Brota t={t} desde={ev.valvula - 0.2} position={[0.03, 0.04, 0]}>
          <Cilindro r={0.006} h={0.012} color={seguro > 0.2 ? '#e5333b' : '#c9ced8'} />
          {seguro > 0.2 && temperatura(t) < 0.55 && <Caja w={0.02} h={0.004} d={0.02} position={[0, -0.008, 0]} color="#e5333b" contorno={false} />}
        </Brota>
      )}
      {visible(t, ev.camara1 - 0.3) && (
        <Brota t={t} desde={ev.camara1 - 0.3} position={[0.0, 0.019, 0]}>
          <Redondeada w={0.11} h={0.008} d={0.06} radio={0.003} color={marcaCamara > 0.2 ? '#ffd34d' : '#d9823b'} opacity={0.8} contorno={false} />
        </Brota>
      )}
      {/* gotas */}
      {gota > 0.02 &&
        [0, 1].map((i) => {
          const u = (t * 1.6 + i * 0.5) % 1;
          return <Esfera key={i} r={0.0035} escala={[1, 1.4, 1]} position={[0.03, 0.034 - u * 0.012, 0]} color="#3fa9f5" contorno={false} />;
        })}
      {/* vapor atrapado dentro */}
      {ventana(t, ev.vapor1 - 0.2, ev.asi5, 0.3) > 0.05 &&
        Array.from({length: 6}, (_, i) => {
          const u = (t * 1.5 + i / 6) % 1;
          return (
            <mesh key={i} position={[-0.05 + u * 0.1, 0.03 + Math.sin(u * 9 + i) * 0.006, (rnd(i) - 0.5) * 0.05]}>
              <sphereGeometry args={[0.008, 10, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
          );
        })}
      {/* luz de apagado automático */}
      <Esfera r={0.006} position={[-0.09, 0.075, 0.03]} color={autoApaga > 0.3 ? '#e5333b' : res > 0.5 ? '#ffb020' : '#4a4f5b'} contorno={false} />
    </group>
  );
};

/** vapor que sale por los hoyitos */
const Vapor: React.FC<{t: number; px: number}> = ({t, px}) => {
  const on = vaporSale(t);
  if (on <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 14}, (_, i) => {
        const u = (t * 0.9 + i / 14) % 1;
        const lado = i % 2 ? 1 : -1;
        return (
          <mesh key={i} position={[px - 0.08 + (i % 7) * 0.03, 0.012 + u * 0.08, lado * (0.07 + u * 0.06)]}>
            <sphereGeometry args={[0.01 + u * 0.022, 12, 8]} />
            <meshToonMaterial color="#ffffff" gradientMap={gradiente()} transparent opacity={on * Math.sin(u * Math.PI) * 0.6} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};
/** humito de la tela quemada */
const Humo: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.quema - 0.3, ev.asi1 + 0.5, 0.3);
  if (on <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 7}, (_, i) => {
        const u = (t * 0.6 + i / 7) % 1;
        return (
          <mesh key={i} position={[0.1 + Math.sin(t + i) * 0.03, 0.04 + u * 0.25, 0.05]}>
            <sphereGeometry args={[0.015 + u * 0.03, 12, 8]} />
            <meshToonMaterial color="#6f7480" gradientMap={gradiente()} transparent opacity={on * Math.sin(u * Math.PI) * 0.6} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};
/** agua líquida / sucia que escupe */
const Escupe: React.FC<{t: number}> = ({t}) => {
  const fria = t < 0.75 ? 0 : ventana(t, ev.fria, ev.asi6, 0.3);
  const sucia = t < 0.75 ? 0 : ventana(t, ev.sucia - 0.4, ev.filtrada - 0.3, 0.3);
  const on = Math.max(fria, sucia);
  if (on <= 0.02) return null;
  const color = sucia > fria ? '#8a6a3a' : '#3fa9f5';
  return (
    <group>
      {Array.from({length: 10}, (_, i) => {
        const u = (t * 1.4 + i / 10) % 1;
        const h = HOYOS[i % HOYOS.length];
        return <Esfera key={i} r={0.004} escala={[1, 1.3, 1]} position={[h[0] + (sucia > fria ? -0.03 : 0), -0.006 - u * 0.05 * (sucia > fria ? 0.4 : 0.15), h[1] + (sucia > fria ? u * 0.05 * Math.sign(h[1]) : 0)]} color={color} contorno={false} />;
      })}
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const px = vaiven(t);
  const inc = inclinada(t);
  return (
    <>
      <Camara t={t} />
      <hemisphereLight args={['#fff6e6', '#b9a99a', 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[1.2, 2.4, 2.2]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-1.0}
        shadow-camera-right={1.0}
        shadow-camera-top={1.0}
        shadow-camera-bottom={-1.0}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
      <Tabla />
      <Tela t={t} />
      <Marcas t={t} />
      <SombraContacto position={[px, 0.016, 0]} w={0.32} d={0.16} o={0.3 * (1 - inc * 0.5)} />
      {/* talón en x=-0.13: la plancha se inclina sobre él */}
      <group position={[px - 0.13, 0.019, 0]} rotation={[0, 0, inc * 1.25]}>
        <group position={[0.13, 0, 0]}>
          <Pieza t={t} desde={ev.placa1 - 0.2} dir={[0.4, 0.6, 1]} caida={0.3}>
            <Plancha t={t} />
            <Escupe t={t} />
          </Pieza>
        </group>
      </group>
      <Vapor t={t} px={px} />
      <Humo t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.placa1 - 0.2, 'placa de metal', false],
  [ev.resistencia - 0.2, 'una resistencia', false],
  [ev.plancha1 - 0.4, 'ya tienes una plancha', false],
  [ev.pero1 + 0.4, 'se calienta sin parar', true],
  [ev.quema - 0.2, '¡quema la ropa!', true],
  [ev.metales - 0.4, 'dos metales pegados', false],
  [ev.doblan - 0.2, 'se doblan con el calor', false],
  [ev.cortan - 0.2, 'cortan la corriente', false],
  [ev.termostato - 0.5, 'el termostato', false],
  [ev.raspa - 0.4, 'raspa y se pega', true],
  [ev.capa - 0.3, 'una capa lisa', false],
  [ev.suela - 0.4, 'la suela', false],
  [ev.arrugas - 1.0, 'no quita las arrugas', true],
  [ev.deposito - 0.3, 'un depósito de agua', false],
  [ev.tanque - 0.4, 'el tanque', false],
  [ev.poquito2 - 1.0, 'poquito a poquito', false],
  [ev.valvula - 0.3, 'una válvula', false],
  [ev.gotas - 0.2, 'caen gotas…', false],
  [ev.vapor1 - 0.4, '¡vapor al instante!', false],
  [ev.camara2 - 0.4, 'la cámara de vapor', false],
  [ev.atrapado - 0.5, 'se queda atrapado', true],
  [ev.hoyitos1 - 0.3, 'hoyitos en la placa', false],
  [ev.afloje - 0.6, 'afloja las fibras', false],
  [ev.hoyitos2 - 0.5, 'los hoyitos', false],
  [ev.fria - 0.6, 'si la placa está fría…', true],
  [ev.mancha - 0.3, '¡mancha la ropa!', true],
  [ev.seguro - 0.3, 'un seguro', false],
  [ev.olvida - 0.4, '¿se te olvida?', true],
  [ev.apagan - 0.4, 'se apagan solas', false],
  [ev.sucia - 0.5, '¿escupe agua sucia?', true],
  [ev.sarro - 0.3, 'es el sarro', true],
  [ev.filtrada - 0.6, 'usa agua filtrada', false],
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

const Termometro: React.FC<{x: number; valor: number; color: string; arriba: string; nombre: string; colorArriba?: string; marca?: number}> = ({x, valor, color, arriba, nombre, colorArriba = '#15161c', marca}) => (
  <div style={{position: 'absolute', left: x - 14, top: 1450, width: 104, padding: '12px 0', borderRadius: 24, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
    <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 30, color: colorArriba, height: 36}}>{arriba}</div>
    <div style={{width: 46, height: 240, borderRadius: 23, border: '5px solid #15161c', background: 'rgba(255,255,255,0.85)', position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: `${cl(valor) * 100}%`, background: color, borderTop: '4px solid rgba(255,255,255,0.7)'}} />
      <div style={{position: 'absolute', top: 10, bottom: 10, left: 8, width: 7, borderRadius: 4, background: 'rgba(255,255,255,0.55)'}} />
      {marca !== undefined && <div style={{position: 'absolute', left: 0, right: 0, height: 5, background: '#15161c', bottom: `${marca * 100}%`}} />}
    </div>
    <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 24, color: '#15161c', textAlign: 'center', lineHeight: 1.0}}>{nombre}</div>
  </div>
);
const Medidores: React.FC<{t: number}> = ({t}) => {
  if (t < ev.resistencia) return null;
  const v = temperatura(t);
  const alta = v > 0.8;
  return (
    <>
      <Termometro x={950} valor={v} color={alta ? '#e5333b' : '#ff9f43'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="placa" marca={hayTermostato(t) ? 0.62 : undefined} />
      {t > ev.pero3 - 0.3 && <Termometro x={830} valor={arrugas(t)} color="#a05cd6" arriba="" nombre="arrugas" />}
    </>
  );
};
/** reloj de apagado automático */
const Reloj: React.FC<{t: number}> = ({t}) => {
  const a = ev.olvida - 0.3;
  const b = ev.si5 - 0.1;
  if (!entre(t, a, b)) return null;
  const o = interpolate(t, [a, a + 0.3, b - 0.3, b], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ang = r(t, a, b - a - 0.5) * 360;
  return (
    <div style={{position: 'absolute', left: 390, top: 1180, width: 300, height: 300, borderRadius: 150, background: '#fff7ea', border: '10px solid #15161c', opacity: o}}>
      <div style={{position: 'absolute', inset: 30, borderRadius: 120, background: `conic-gradient(#ffcf3d ${ang}deg, transparent ${ang}deg)`}} />
      <div style={{position: 'absolute', left: 140, top: 40, width: 10, height: 110, background: '#15161c', borderRadius: 5, transformOrigin: '5px 110px', transform: `rotate(${ang}deg)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 34, color: '#15161c'}}>{t > ev.apagan - 0.3 ? 'apagada' : 'quieta…'}</div>
    </div>
  );
};

export const PlanchaVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#e3d4f5'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(40,30,60,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Reloj t={t} />
      <Audio src={staticFile('plancha/voz.wav')} />
      <Audio src={staticFile('plancha/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_PLANCHA = (datos as any).duration as number;
void Toro;
