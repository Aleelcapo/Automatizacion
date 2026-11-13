import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/chapa.json';
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
const ventana = (t: number, a: number, b: number, f = 0.4) => r(t, a, f) * (1 - r(t, b - f, f));
type V3 = [number, number, number];

const ev = {
  cilindro1: T('cilindro', 1),
  gira1: T('gira', 1),
  tubo1: T('tubo', 1),
  pestillo: T('pestillo'),
  chapa: T('chapa'),
  girar: T('girar'),
  asi1: T('así', 1),
  hoyos: T('hoyos'),
  perno1: T('perno', 1),
  resorte: T('resorte'),
  traba: T('traba'),
  pernos1: T('pernos', 1),
  abrirla1: T('abrirla', 1),
  asi3: T('así', 3),
  cortas: T('cortas'),
  largo: T('largo'),
  levantas: T('levantas'),
  exacta1: T('exacta', 1),
  orilla: T('orilla'),
  gira2: T('gira', 2),
  linea: T('línea'),
  pero2: T('pero', 3),
  cinco1: T('cinco', 1),
  tiempo: T('tiempo'),
  asi4: T('así', 4),
  lamina1: T('lámina', 1),
  dientes1: T('dientes', 1),
  llave1: T('llave', 1),
  pero3: T('pero', 4),
  lamina2: T('lámina', 2),
  entrar: T('entrar'),
  asi5: T('así', 5),
  ojo: T('ojo'),
  retorcida: T('retorcida'),
  entra1: T('entra', 1),
  ranuras: T('ranuras'),
  perfil: T('perfil'),
  pero4: T('pero', 5),
  ladron: T('ladrón'),
  alambre: T('alambre'),
  asi6: T('así', 6),
  carrete: T('carrete'),
  atoran: T('atoran'),
  seguridad: T('seguridad'),
  azar: T('azar'),
  cada3: T('cada', 5),
  exacto: T('exacto'),
  si3: T('si', 3),
  fuerces: T('fuerces'),
  copia: T('copia'),
  alto: T('alto'),
};

// ---------- geometría ----------
const PX = [-0.12, -0.06, 0, 0.06, 0.12];
const B = [0.035, 0.012, 0.028, 0.006, 0.022];
const B_MAL = [0.035, 0.012, 0.028, 0.017, 0.022];
const PLUG_Y = 0.1;
const PLUG_R = 0.07;
const CORTE_Y = PLUG_Y + PLUG_R; // 0.17
const BASE = 0.085; // donde apoya el diente cero
const REPOSO = 0.062;
const DRIVER = 0.055;
const TECHO = 0.31;
const PR = 0.0105;
const LARGO = B.map((b) => CORTE_Y - (BASE + b));
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

/** altura de los dientes de una llave, en coordenadas de la llave */
const perfilLlave = (b: number[], xk: number) => {
  const pts: [number, number][] = [[-0.165, -0.004], [-0.15, 0.0]];
  PX.forEach((x, i) => {
    pts.push([x - 0.009, b[i]]);
    pts.push([x + 0.009, b[i]]);
  });
  pts.push([0.165, b[4]]);
  pts.push([0.18, 0.04]);
  if (xk < pts[0][0] || xk > 0.3) return -1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (xk >= x0 && xk <= x1) return y0 + ((xk - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0.04;
};

// ---------- estados ----------
type Llave = {off: number; b: number[]; plana: boolean; on: number};
const llave = (t: number): Llave => {
  if (t < 0.75) return {off: 0, b: B, plana: false, on: 1};
  // la llave buena
  if (entre(t, ev.lamina1 - 0.3, ev.pero3 - 0.1)) {
    const entra = r(t, ev.dientes1 + 0.6, 1.4);
    return {off: 0.42 * (1 - entra), b: B.map((b) => b * r(t, ev.dientes1 - 0.2, 0.6)), plana: false, on: r(t, ev.lamina1 - 0.3, 0.4) * (1 - r(t, ev.pero3 - 0.4, 0.3))};
  }
  // cualquier lámina (plana)
  if (entre(t, ev.lamina2 - 0.3, ev.ojo)) {
    const entra = r(t, ev.lamina2, 1.0);
    return {off: 0.42 * (1 - entra), b: [0.02, 0.02, 0.02, 0.02, 0.02], plana: true, on: r(t, ev.lamina2 - 0.3, 0.3) * (1 - r(t, ev.ojo - 0.3, 0.3))};
  }
  // la lámina plana choca con el ojo y la llave buena sí entra
  if (entre(t, ev.ojo, ev.pero4)) {
    const buena = t > ev.entra1 - 0.3;
    if (!buena) {
      const golpe = r(t, ev.retorcida - 0.6, 0.5);
      return {off: 0.42 - 0.2 * golpe + 0.03 * Math.abs(Math.sin((t - ev.retorcida) * 12)) * (t > ev.retorcida - 0.1 ? 1 : 0), b: [0.02, 0.02, 0.02, 0.02, 0.02], plana: true, on: 1 - r(t, ev.entra1 - 0.6, 0.3)};
    }
    return {off: 0.42 * (1 - r(t, ev.entra1 - 0.3, 1.2)), b: B, plana: false, on: r(t, ev.entra1 - 0.3, 0.3) * (1 - r(t, ev.pero4 - 0.3, 0.3))};
  }
  // los dientes no son al azar
  if (entre(t, ev.azar - 0.6, ev.si3 - 0.1)) return {off: 0.42 * (1 - r(t, ev.azar - 0.6, 1.0)), b: B, plana: false, on: r(t, ev.azar - 0.6, 0.3) * (1 - r(t, ev.si3 - 0.4, 0.3))};
  // copia mal hecha
  if (t >= ev.si3 - 0.1) return {off: 0.42 * (1 - r(t, ev.si3, 0.8)), b: B_MAL, plana: false, on: r(t, ev.si3 - 0.1, 0.3)};
  return {off: 1, b: B, plana: false, on: 0};
};
const hayPernos = (t: number) => visible(t, ev.perno1 - 0.2);
const cortados = (t: number) => (t < 0.75 ? 1 : r(t, ev.cortas, 0.4));
const carretes = (t: number) => t < 0.75 || t > ev.carrete - 0.2;
/** levantar a mano (t4) y con alambre (t9) */
const levantaMano = (t: number, i: number) => {
  if (t < 0.75) return 0;
  const a = ev.levantas + i * 0.35;
  let k = r(t, a, 0.3) * (1 - r(t, ev.pero2 + 0.2, 0.4));
  // problema: uno por uno y se vuelven a caer
  if (entre(t, ev.pero2 + 0.2, ev.asi4)) {
    const c = ev.cinco1 - 0.5 + i * 0.5;
    k = ventana(t, c, c + 0.7, 0.15);
  }
  return k;
};
const alambre = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.alambre - 0.6, ev.seguridad + 0.4, 0.3));
const levantaAlambre = (t: number, i: number) => {
  const on = alambre(t);
  if (on <= 0.01) return 0;
  const a = ev.alambre - 0.2 + i * 0.4;
  // con carretes: el perno 2 se atora
  if (t > ev.atoran - 0.4 && i >= 2) return 0;
  return r(t, a, 0.25) * on;
};
/** giro del cilindro */
const giro = (t: number, bajos: number[], drivers: number[]) => {
  if (t < 0.75) return 0;
  // sin pernos: gira con la mano
  if (!hayPernos(t)) return ventana(t, ev.girar - 0.2, ev.asi1 + 0.3, 0.4) * 1.2;
  // ¿están alineados?
  const libre = bajos.every((y, i) => Math.abs(y + LARGO[i] * cortados(t) + (1 - cortados(t)) * 0 - CORTE_Y) < 0.003);
  void drivers;
  const intento = Math.max(ventana(t, ev.traba - 0.1, ev.pernos1 - 0.4, 0.15), ventana(t, ev.abrirla1 - 0.6, ev.asi3, 0.15), ventana(t, ev.si3 + 1.0, 99, 0.15));
  const tiembla = intento * 0.05 * Math.sin(t * 30);
  if (libre && cortados(t) > 0.9) {
    const gira = Math.max(ventana(t, ev.gira2 - 0.2, ev.pero2, 0.4), ventana(t, ev.llave1 - 0.4, ev.pero3 - 0.4, 0.4), ventana(t, ev.perfil - 0.2, ev.pero4 - 0.3, 0.3));
    return gira * 1.3;
  }
  const falsoSet = t > ev.atoran - 0.4 && alambre(t) > 0.5 ? 0.07 : 0;
  return tiembla + falsoSet;
};

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 2.0, 0.5, 0.3, [0, 0.15, 0]],
  [1.0, 1.25, 0.35, 0.15, [0.0, 0.16, 0]],
  [8.4, 1.05, 0.2, 0.08, [0, 0.18, 0]],
  [16.2, 0.72, 0.15, 0.05, [0, 0.17, 0]],
  [23.0, 1.0, 0.15, 0.05, [0, 0.17, 0]],
  [35.2, 1.05, 0.2, 0.08, [0, 0.16, 0]],
  [40.0, 1.4, 0.3, 0.1, [0.1, 0.14, 0]],
  [49.3, 0.85, 1.25, 0.15, [0.2, 0.1, 0]],
  [57.4, 0.95, 0.2, 0.05, [0.02, 0.16, 0]],
  [63.4, 0.62, 0.2, 0.05, [0, 0.18, 0]],
  [70.6, 1.2, 0.25, 0.1, [0.05, 0.15, 0]],
  [75.3, 0.95, 0.3, 0.1, [0.03, 0.15, 0]],
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
const Panel: React.FC<{p: V3; s: V3; color: string; o?: number; brillo?: number}> = ({p, s, color, o = 1, brillo = 0}) => {
  if (o <= 0.01) return null;
  const tr = o < 0.98;
  return (
    <group position={p}>
      <mesh castShadow={!tr} receiveShadow>
        <boxGeometry args={s} />
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} emissive={color} emissiveIntensity={brillo} />
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
const Plano: React.FC<{p: V3; w: number; h: number; color: string; o?: number}> = ({p, w, h, color, o = 1}) => (
  <mesh position={p}>
    <planeGeometry args={[w, h]} />
    <meshBasicMaterial color={color} transparent={o < 1} opacity={o} />
  </mesh>
);

// ---------- escenario: entrada de la casa ----------
const Entrada: React.FC = () => (
  <group>
    <mesh position={[0, 1.2, -0.5]} receiveShadow>
      <planeGeometry args={[7, 3]} />
      <meshToonMaterial color="#f6d6a8" gradientMap={gradiente()} />
    </mesh>
    {/* puerta */}
    <group position={[0.05, 0.6, -0.48]}>
      <Redondeada w={0.95} h={1.9} d={0.05} radio={0.015} color="#3f8f86" />
      {[
        [-0.2, 0.35],
        [0.2, 0.35],
        [-0.2, -0.25],
        [0.2, -0.25],
      ].map(([x, y], i) => (
        <Redondeada key={i} w={0.32} h={0.5} d={0.02} radio={0.01} position={[x, y, 0.03]} color="#4aa49a" />
      ))}
      <Esfera r={0.04} position={[0.38, -0.05, 0.06]} color="#e8b04a" />
    </group>
    {/* marco */}
    <Redondeada w={1.1} h={0.05} d={0.08} radio={0.01} position={[0.05, 1.57, -0.46]} color="#ffffff" />
    {/* maceta y tapete */}
    <group position={[-0.65, -0.35, -0.3]}>
      <Torno perfil={[[0, 0], [0.09, 0], [0.11, 0.2], [0, 0.2]]} color="#e07a4f" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Esfera key={i} r={0.06} escala={[0.5, 1.4, 0.3]} position={[Math.sin(i * 1.3) * 0.04, 0.3 + (i % 2) * 0.04, Math.cos(i * 1.3) * 0.04]} color="#4fae6a" />
      ))}
    </group>
    {/* mesita donde está la chapa en corte */}
    <Redondeada w={1.6} h={0.04} d={0.7} radio={0.012} position={[0, -0.02, -0.05]} color="#c99a6b" />
    <Caja w={1.6} h={0.4} d={0.6} position={[0, -0.24, -0.08]} color="#b9834c" contorno={false} />
  </group>
);

// ---------- la chapa en corte ----------
const PERNO_COLOR = '#d9a441';
const DRIVER_COLOR = '#c3cbd5';
const Chapa: React.FC<{t: number}> = ({t}) => {
  const ll = llave(t);
  const pernos = hayPernos(t);
  const corte = cortados(t);
  // posición del fondo de cada perno de abajo
  const bajos = PX.map((x, i) => {
    let y = REPOSO;
    if (ll.on > 0.05) {
      const h = perfilLlave(ll.b, x - ll.off);
      if (h >= 0) y = Math.max(y, BASE + h);
    }
    const mano = levantaMano(t, i);
    if (mano > 0) y = Math.max(y, REPOSO + (BASE + B[i] - REPOSO) * mano);
    const alam = levantaAlambre(t, i);
    if (alam > 0) y = Math.max(y, REPOSO + (BASE + B[i] - REPOSO) * alam);
    // el que se atora con el carrete
    if (t > ev.atoran - 0.4 && i === 2 && alambre(t) > 0.3) y = REPOSO + (BASE + B[i] - REPOSO) * 0.6 * r(t, ev.atoran - 0.4, 0.3);
    return y;
  });
  const g = giro(t, bajos, []);
  const marcaCorte = ventana(t, ev.orilla - 0.3, ev.linea + 1.4, 0.3);
  const resortes = visible(t, ev.resorte - 0.2);
  const hoyos = visible(t, ev.hoyos - 0.2) ? (t < 0.75 ? 1 : r(t, ev.hoyos - 0.2, 0.4)) : 0;
  const pestilloK = cl(g / 1.2);
  const traba = Math.max(ventana(t, ev.traba - 0.1, ev.pernos1, 0.15), ventana(t, ev.si3 + 1.0, 99, 0.2));
  const malo = t > ev.si3 + 0.6 ? 3 : -1;
  const marcaDiente = (i: number) => ventana(t, ev.cada3 + i * 0.3, ev.cada3 + i * 0.3 + 0.5, 0.1);
  return (
    <group>
      {/* tubo (mitad de atrás) */}
      <Panel p={[0, 0.16, -0.045]} s={[0.44, 0.32, 0.09]} color="#c9973d" />
      <Plano p={[0, 0.16, 0.0005]} w={0.44} h={0.32} color="#e8c27a" />
      {/* hueco donde va el cilindro */}
      <Plano p={[0, PLUG_Y, 0.001]} w={0.44} h={PLUG_R * 2 + 0.004} color="#5a4422" />
      {/* hoyos para los pernos */}
      {hoyos > 0.01 &&
        PX.map((x) => <Plano key={x} p={[x, (CORTE_Y + TECHO) / 2 + 0.005, 0.0015]} w={PR * 2 + 0.004} h={(TECHO - CORTE_Y) * hoyos} color="#3a2a14" />)}
      {/* cilindro (gira sobre el eje x) */}
      <group position={[0, PLUG_Y, 0]} rotation={[g, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[PLUG_R, PLUG_R, 0.44, 48, 1, false, Math.PI, Math.PI]} />
          <meshToonMaterial color="#e2b65c" gradientMap={gradiente()} side={THREE.DoubleSide} />
        </mesh>
        <Plano p={[0, 0, 0.0015]} w={0.44} h={PLUG_R * 2} color="#f2d08a" />
        {/* ojo de la cerradura (ranura) */}
        <Plano p={[0, -0.035, 0.002]} w={0.44} h={0.05} color="#6a4c1e" />
        {/* hoyos en el cilindro */}
        {hoyos > 0.01 && PX.map((x) => <Plano key={x} p={[x, 0.035, 0.0022]} w={PR * 2 + 0.004} h={0.07 * hoyos} color="#3a2a14" />)}
        {/* pernos de abajo (giran con el cilindro) */}
        {pernos &&
          PX.map((x, i) => {
            const largo = LARGO[i] * corte + (LARGO[i] + DRIVER) * (1 - corte);
            const y0 = bajos[i] - PLUG_Y;
            const malo2 = i === malo;
            return (
              <group key={x}>
                <Cilindro r={PR} h={largo} position={[x, y0 + largo / 2, 0.0]} color={malo2 ? '#e5333b' : marcaDiente(i) > 0.2 ? '#ffd34d' : PERNO_COLOR} />
                <mesh position={[x, y0 - 0.002, 0]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[PR, 0.008, 20]} />
                  <meshToonMaterial color={PERNO_COLOR} gradientMap={gradiente()} />
                </mesh>
              </group>
            );
          })}
        {/* llave dentro del cilindro */}
        {ll.on > 0.02 && <LlaveMalla t={t} ll={ll} marcaDiente={marcaDiente} />}
        {/* alambre del ladrón */}
        <Alambre t={t} />
      </group>
      {/* pernos de arriba (no giran) y resortes */}
      {pernos &&
        corte > 0.02 &&
        PX.map((x, i) => {
          const y0 = bajos[i] + LARGO[i];
          const giroOk = g > 0.2;
          const yd = giroOk ? CORTE_Y : y0;
          const top = yd + DRIVER;
          const carrete = carretes(t) && (i === 1 || i === 2 || i === 4);
          return (
            <group key={x}>
              {carrete ? (
                <group>
                  <Cilindro r={PR} h={0.014} position={[x, yd + 0.007, 0]} color={DRIVER_COLOR} />
                  <Cilindro r={PR * 0.55} h={DRIVER - 0.028} position={[x, yd + DRIVER / 2, 0]} color={DRIVER_COLOR} />
                  <Cilindro r={PR} h={0.014} position={[x, top - 0.007, 0]} color={DRIVER_COLOR} />
                </group>
              ) : (
                <Cilindro r={PR} h={DRIVER} position={[x, yd + DRIVER / 2, 0]} color={traba > 0.2 && yd < CORTE_Y ? '#ff8a7a' : DRIVER_COLOR} />
              )}
              {resortes &&
                Array.from({length: 9}, (_, k) => (
                  <Toro key={k} r={PR * 0.8} tubo={0.0018} rotation={[Math.PI / 2 + 0.25, 0, 0]} position={[x, top + 0.004 + ((TECHO - top - 0.006) * k) / 8, 0]} color="#9aa4b0" contorno={false} />
                ))}
            </group>
          );
        })}
      {/* resortes sobre los pernos enteros (antes de cortarlos) */}
      {pernos &&
        corte <= 0.02 &&
        visible(t, ev.resorte - 0.2) &&
        PX.map((x, i) => {
          const top = bajos[i] + LARGO[i] + DRIVER;
          return (
            <group key={x}>
              {Array.from({length: 9}, (_, k) => (
                <Toro key={k} r={PR * 0.8} tubo={0.0018} rotation={[Math.PI / 2 + 0.25, 0, 0]} position={[x, top + 0.004 + ((TECHO - top - 0.006) * k) / 8, 0]} color="#9aa4b0" contorno={false} />
              ))}
            </group>
          );
        })}
      {/* línea de corte */}
      {marcaCorte > 0.01 && (
        <group>
          {Array.from({length: 22}, (_, k) => (
            <Plano key={k} p={[-0.21 + k * 0.02, CORTE_Y, 0.02]} w={0.012} h={0.004} color="#ffd34d" o={marcaCorte} />
          ))}
        </group>
      )}
      {/* cara del frente (ojo de la cerradura) */}
      <CaraFrente t={t} g={g} />
      {/* pestillo */}
      <group position={[-0.22, PLUG_Y, 0]}>
        <group rotation={[g, 0, 0]}>
          <Redondeada w={0.02} h={0.08} d={0.02} radio={0.006} position={[0, -0.04, 0]} color="#9aa4b0" />
        </group>
        <Redondeada w={0.16} h={0.04} d={0.05} radio={0.008} position={[-0.09 - pestilloK * 0.06, -0.06, 0]} color="#c3cbd5" />
      </group>
      {/* flecha de girar con la mano */}
      <FlechaGiro t={t} />
    </group>
  );
};

const LlaveMalla: React.FC<{t: number; ll: Llave; marcaDiente: (i: number) => number}> = ({ll, marcaDiente}) => {
  // forma de la llave en coordenadas del cilindro
  const forma = useMemo(() => {
    const s = new THREE.Shape();
    const y0 = 0.04 - PLUG_Y;
    s.moveTo(-0.165, y0 + 0.01);
    for (let x = -0.165; x <= 0.18; x += 0.004) s.lineTo(x, BASE - PLUG_Y + perfilLlave(ll.b, x));
    s.lineTo(0.2, BASE - PLUG_Y + 0.045);
    s.lineTo(0.2, y0);
    s.lineTo(-0.15, y0);
    return s;
  }, [ll.b.join(',')]);
  const geo = useMemo(() => new THREE.ExtrudeGeometry(forma, {depth: 0.012, bevelEnabled: false}), [forma]);
  const tinta = useMemo(() => new THREE.ExtrudeGeometry(forma, {depth: 0.016, bevelEnabled: true, bevelSize: 0.0018, bevelThickness: 0.001, bevelSegments: 1}), [forma]);
  const o = ll.on;
  return (
    <group position={[ll.off, 0, -0.006]}>
      <mesh geometry={geo}>
        <meshToonMaterial color={ll.plana ? '#aeb7c2' : '#d9dee5'} gradientMap={gradiente()} transparent={o < 0.98} opacity={o} />
      </mesh>
      <mesh geometry={tinta} position={[0, 0, -0.002]}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent={o < 0.98} opacity={o} />
      </mesh>
      {/* ranuras del perfil */}
      {!ll.plana && [0.0, -0.022].map((y) => <Plano key={y} p={[0.02, y - 0.012, 0.0125]} w={0.36} h={0.004} color="#8f99a6" o={o} />)}
      {/* marcas de los dientes */}
      {PX.map((x, i) => (marcaDiente(i) > 0.05 ? <Esfera key={x} r={0.009} position={[x, BASE - PLUG_Y + ll.b[i] + 0.004, 0.013]} color="#ffd34d" contorno={false} /> : null))}
      {/* cabeza de la llave */}
      <group position={[0.27, -0.02, 0.006]}>
        <Redondeada w={0.13} h={0.12} d={0.014} radio={0.03} color={ll.plana ? '#aeb7c2' : '#d9a441'} opacity={o} />
        <mesh position={[0.03, 0.0, 0.008]}>
          <circleGeometry args={[0.014, 24]} />
          <meshBasicMaterial color="#f6d6a8" transparent opacity={o} />
        </mesh>
      </group>
    </group>
  );
};

const Alambre: React.FC<{t: number}> = ({t}) => {
  const on = alambre(t);
  if (on <= 0.01) return null;
  // el alambre apunta al perno que está levantando
  const idx = Math.min(4, Math.max(0, Math.floor((t - ev.alambre + 0.2) / 0.4)));
  const x = PX[idx];
  const pts = [new THREE.Vector3(0.45, -0.05, 0.004), new THREE.Vector3(x + 0.03, -0.05, 0.004), new THREE.Vector3(x, REPOSO - PLUG_Y - 0.004, 0.004)];
  const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
  return (
    <group>
      <mesh geometry={new THREE.TubeGeometry(c, 30, 0.0025, 8, false)}>
        <meshToonMaterial color="#5a6170" gradientMap={gradiente()} transparent opacity={on} />
      </mesh>
      <mesh geometry={new THREE.TubeGeometry(c, 30, 0.004, 8, false)}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} transparent opacity={on} />
      </mesh>
    </group>
  );
};

/** cara del frente: ojo con forma retorcida */
const CaraFrente: React.FC<{t: number; g: number}> = ({t, g}) => {
  const forma = useMemo(() => {
    const s = new THREE.Shape();
    const z = [0.0, 0.006, -0.004, 0.005, -0.003];
    s.moveTo(-0.004, -0.06);
    z.forEach((dz, i) => s.lineTo(dz - 0.005, -0.06 + i * 0.012));
    s.lineTo(0.0, 0.0);
    z
      .slice()
      .reverse()
      .forEach((dz, i) => s.lineTo(dz + 0.005, -0.012 * i));
    s.lineTo(0.004, -0.06);
    return s;
  }, []);
  const marca = ventana(t, ev.retorcida - 0.4, ev.perfil + 1.2, 0.3);
  return (
    <group position={[0.221, PLUG_Y, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <ringGeometry args={[PLUG_R, PLUG_R + 0.05, 48]} />
        <meshToonMaterial color="#c9973d" gradientMap={gradiente()} side={THREE.DoubleSide} />
      </mesh>
      <group rotation={[0, 0, g]}>
        <mesh position={[0, 0, 0.0005]}>
          <circleGeometry args={[PLUG_R, 48]} />
          <meshToonMaterial color="#e2b65c" gradientMap={gradiente()} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.0, 0.001]} scale={[1.6, 1.0, 1]}>
          <shapeGeometry args={[forma]} />
          <meshBasicMaterial color={marca > 0.2 ? '#e5333b' : '#15161c'} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0, 0, -0.001]}>
        <ringGeometry args={[PLUG_R + 0.05, PLUG_R + 0.054, 48]} />
        <meshBasicMaterial color="#15161c" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/** flecha curva (girar con la mano) */
const FlechaGiro: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.girar - 0.4, ev.asi1 + 0.3, 0.3);
  if (on <= 0.01) return null;
  return (
    <group position={[0.26, PLUG_Y, 0]} rotation={[0, Math.PI / 2, 0]} scale={on}>
      <mesh rotation={[0, 0, t * 2]}>
        <torusGeometry args={[0.1, 0.008, 10, 40, Math.PI * 1.3]} />
        <meshBasicMaterial color="#3fa9f5" />
      </mesh>
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => (
  <>
    <Camara t={t} />
    <hemisphereLight args={['#fff6e6', '#b9a99a', 0.85]} />
    <ambientLight intensity={0.4} />
    <directionalLight
      position={[1.0, 2.4, 2.4]}
      intensity={1.6}
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
    <Entrada />
    <Pieza t={t} desde={ev.cilindro1 - 0.2} dir={[0.4, 0.6, 1]} caida={0.3}>
      <group position={[0, 0.02, 0]}>
        <Chapa t={t} />
      </group>
    </Pieza>
    <SombraContacto position={[0, 0.001, 0]} w={0.7} d={0.3} o={0.3} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.cilindro1 - 0.2, 'un cilindro que gira', false],
  [ev.tubo1 - 0.2, 'dentro de un tubo', false],
  [ev.pestillo - 0.3, 'mueve un pestillo', false],
  [ev.chapa - 0.3, 'ya tienes una chapa', false],
  [ev.girar - 0.6, 'cualquiera la gira', true],
  [ev.hoyos - 0.3, 'unos hoyos', false],
  [ev.perno1 - 0.2, 'un perno con resorte', false],
  [ev.traba - 0.3, 'traba el cilindro', false],
  [ev.pernos1 - 0.4, 'los pernos', false],
  [ev.abrirla1 - 0.9, 'ni tú puedes abrirla', true],
  [ev.cortas - 0.2, 'cortas cada perno en dos', false],
  [ev.largo - 0.5, 'de diferente largo', false],
  [ev.levantas - 0.2, 'a la altura exacta…', false],
  [ev.gira2 - 0.5, '¡el cilindro gira!', false],
  [ev.linea - 0.4, 'la línea de corte', false],
  [ev.cinco1 - 0.4, 'los cinco al mismo tiempo', true],
  [ev.lamina1 - 0.3, 'una lámina con dientes', false],
  [ev.llave1 - 0.4, 'la llave', false],
  [ev.lamina2 - 0.3, 'cualquier lámina podría entrar', true],
  [ev.retorcida - 0.4, 'ojo con forma retorcida', false],
  [ev.ranuras - 0.4, 'mismas ranuras', false],
  [ev.perfil - 0.3, 'el perfil', false],
  [ev.ladron - 0.2, 'un ladrón…', true],
  [ev.alambre - 0.5, 'uno por uno con un alambre', true],
  [ev.carrete - 0.4, 'forma de carrete', false],
  [ev.atoran - 0.2, 'se atoran a la mitad', false],
  [ev.seguridad - 0.6, 'pernos de seguridad', false],
  [ev.azar - 0.5, 'los dientes no son al azar', false],
  [ev.exacto - 0.8, 'cada uno, un perno exacto', false],
  [ev.si3 + 0.3, 'entra pero no gira', true],
  [ev.fuerces - 0.3, '¡no la fuerces!', true],
  [ev.copia - 0.2, 'copia mal hecha', true],
  [ev.alto - 0.6, 'un diente más alto', true],
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

/** indicador: ¿abre? (candado) */
const Candado: React.FC<{t: number}> = ({t}) => {
  if (t < ev.perno1) return null;
  const ll = llave(t);
  void ll;
  return null;
};

export const ChapaVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#f6d6a8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(60,40,25,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Candado t={t} />
      <Audio src={staticFile('chapa/voz.wav')} />
      <Audio src={staticFile('chapa/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_CHAPA = (datos as any).duration as number;
void Caja;
