import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/pastilla.json';
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
  switch1: T('switch', 1),
  cortar: T('cortar'),
  quieras: T('quieras'),
  pero1: T('pero', 1),
  aparatos1: T('aparatos', 1),
  corriente1: T('corriente', 1),
  calienta: T('calienta'),
  derrite: T('derrite'),
  incendia: T('incendia'),
  asi1: T('así', 1),
  tira1: T('tira', 1),
  calentarse1: T('calentarse', 1),
  estira: T('estira'),
  dobla: T('dobla'),
  apagarlo: T('apagarlo'),
  bimetalica: T('bimetálica'),
  pero2: T('pero', 2),
  tocan: T('tocan'),
  golpe: T('golpe'),
  tarda: T('tarda'),
  asi2: T('así', 2),
  bobina: T('bobina'),
  enorme: T('enorme'),
  iman: T('imán'),
  jala: T('jala'),
  instante: T('instante'),
  magnetico: T('magnético'),
  pero3: T('pero', 3),
  separarse: T('separarse'),
  arco1: T('arco', 1),
  asi3: T('así', 3),
  laminitas: T('laminitas'),
  atrapan: T('atrapan'),
  pedacitos: T('pedacitos'),
  apagan: T('apagan'),
  arqueo: T('arqueo'),
  palanca: T('palanca'),
  salta2: T('salta', 2),
  bota1: T('bota', 1),
  pastilla1: T('pastilla', 1),
  pero4: T('pero', 4),
  persona: T('persona'),
  pastillas2: T('pastillas'),
  boton: T('botón'),
  fuga: T('fuga'),
  cortan2: T('cortan', 2),
  tierra: T('tierra'),
  si3: T('si', 4),
  grande: T('grande'),
  aguantaria: T('aguantaría'),
  desconecta: T('desconecta'),
  linea: T('línea'),
};

// ---------- geometría de la pastilla (corte) ----------
const BX = 0;
const BY0 = 0.11;
const BY1 = 0.53;
const BW = 0.26;
const TERM_IN: V3 = [0.0, 0.5, 0.0];
const FIJO: V3 = [-0.04, 0.44, 0.0];
const PIVOTE: V3 = [0.035, 0.37, 0.0];
const BIMET_Y: [number, number] = [0.2, 0.33];
const BIMET_X = 0.085;
const BOBINA: V3 = [-0.05, 0.24, 0.0];
const TERM_OUT: V3 = [0.0, 0.14, 0.0];
const REGLETA: V3 = [0.42, 0.0, 0.12];
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
/** posición de la palanca: 1 encendido, 0 apagado, 0.5 botada (en medio) */
const palanca = (t: number) => {
  if (t < 0.75) return 1;
  // apagar/encender a mano
  let p = 1 - ventana(t, ev.cortar - 0.1, ev.quieras + 0.5, 0.2);
  // disparos: térmico, magnético, botada final
  const disparo = (a: number, vuelve: number) => (entre(t, a, vuelve) ? 1 - r(t, a, 0.08) * 0.5 : 1);
  p = Math.min(p, disparo(ev.apagarlo - 0.1, ev.pero2 - 0.2), disparo(ev.instante - 0.3, ev.asi3 - 0.2), disparo(ev.bota1 - 0.1, ev.pastilla1 + 0.4));
  // el arco: los contactos se separan
  if (entre(t, ev.separarse - 0.1, ev.laminitas + 1.0)) p = 1 - r(t, ev.separarse - 0.1, 0.3) * 0.5;
  if (entre(t, ev.atrapan - 0.4, ev.palanca)) p = 1 - r(t, ev.atrapan - 0.4, 0.3) * 0.5;
  return p;
};
const abierto = (t: number) => 1 - (palanca(t) - 0.5) * 2; // 0 cerrado, 1 abierto
const encendida = (t: number) => (t < 0.75 ? 1 : abierto(t) < 0.3 ? 1 : 0);
/** cuántos aparatos */
const aparatos = (t: number) => {
  if (t < 0.75) return 2;
  if (t < ev.aparatos1 - 0.3) return 1;
  if (t > ev.desconecta + 0.2) return 1;
  return 4;
};
/** corriente (0..1+): 1 = lo que aguanta el cable */
const corriente = (t: number) => {
  if (encendida(t) < 0.5) return 0;
  let c = 0.35;
  if (t > ev.aparatos1 - 0.3) c = 0.35 + 0.9 * r(t, ev.aparatos1 - 0.3, 2.5);
  if (entre(t, ev.pero2, ev.asi3)) c = Math.max(c, 1 + 2.2 * r(t, ev.tocan, 0.1) * (t < ev.asi2 ? 1 : r(t, ev.enorme - 0.2, 0.1)));
  if (t > ev.pero4) c = 0.6;
  return c;
};
const calorCable = (t: number) => {
  if (t < 0.75) return 0;
  const sobre = r(t, ev.calienta - 1.0, 1.2) * (1 - r(t, ev.asi1, 0.5));
  const golpe = r(t, ev.tocan + 0.1, 2.5) * (1 - r(t, ev.asi2, 0.5)) * 0.8;
  const final = ventana(t, ev.grande, ev.desconecta, 0.4);
  return Math.max(sobre, golpe, final);
};
const calorBimet = (t: number) => {
  if (t < 0.75) return 0;
  const a = r(t, ev.calentarse1 - 0.3, ev.apagarlo - ev.calentarse1) * (1 - r(t, ev.pero2, 0.6));
  const b = r(t, ev.tocan, 6) * 0.4 * (1 - r(t, ev.asi2, 0.4));
  return Math.max(a, b);
};
const iman = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.enorme - 0.1, ev.magnetico + 0.6, 0.15));
const arco = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.arco1 - 0.6, ev.apagan + 0.2, 0.15));
const hayCamara = (t: number) => visible(t, ev.laminitas - 0.2);
const hayBobina = (t: number) => visible(t, ev.bobina - 0.2);
const hayBimet = (t: number) => visible(t, ev.tira1 - 0.2);
const fuego = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.incendia - 0.3, ev.asi1 + 0.3, 0.3));
const tapa = (t: number) => (t < 0.75 ? 0 : r(t, ev.pastilla1 - 0.6, 0.6) * (1 - r(t, ev.si3 - 0.4, 0.5)));

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 2.0, 0.3, 0.2, [0.15, 0.35, 0]],
  [1.0, 1.0, 0.25, 0.1, [0, 0.36, 0]],
  [5.2, 1.75, 0.3, 0.12, [0.22, 0.3, 0]],
  [10.6, 0.85, 0.4, 0.12, [0.25, 0.07, 0.04]],
  [14.5, 0.62, 0.25, 0.08, [0.04, 0.3, 0]],
  [25.6, 1.4, 0.3, 0.1, [0.3, 0.15, 0.05]],
  [29.6, 0.7, 0.25, 0.1, [0.04, 0.3, 0]],
  [33.6, 0.62, 0.2, 0.1, [-0.02, 0.29, 0]],
  [42.6, 0.52, 0.25, 0.1, [-0.04, 0.42, 0]],
  [55.3, 0.7, 0.25, 0.15, [0.04, 0.45, 0]],
  [59.3, 1.35, 0.25, 0.1, [-0.1, 0.33, 0]],
  [61.0, 1.75, 0.35, 0.12, [0.2, 0.3, 0.05]],
  [66.0, 0.75, 0.2, 0.1, [-0.36, 0.32, 0]],
  [74.3, 1.4, 0.25, 0.1, [0.0, 0.3, 0.05]],
  [77.2, 1.7, 0.3, 0.1, [0.2, 0.25, 0.05]],
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
  const s = Math.max(ventana(t, ev.tocan - 0.05, ev.tocan + 0.6, 0.05), ventana(t, ev.arco1 - 0.1, ev.arco1 + 0.5, 0.05));
  pos[0] += Math.sin(t * 71) * 0.01 * s;
  pos[1] += Math.cos(t * 63) * 0.01 * s;
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
const Brota: React.FC<{t: number; desde: number; hasta?: number; position?: V3; children: React.ReactNode}> = ({t, desde, hasta = 999, position, children}) => {
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
const colorMezcla = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), cl(k)).getStyle();

/** cable con contorno */
const Cable: React.FC<{puntos: V3[]; r: number; color: string; brillo?: number; emis?: string}> = ({puntos, r: rr, color, brillo = 0, emis}) => {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
    return {a: new THREE.TubeGeometry(c, 80, rr, 10, false), b: new THREE.TubeGeometry(c, 80, rr + 0.0016, 10, false)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos), rr]);
  return (
    <group>
      <mesh geometry={geo.a} castShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} emissive={emis ?? color} emissiveIntensity={brillo} />
      </mesh>
      <mesh geometry={geo.b}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
/** puntitos de corriente */
const Corriente: React.FC<{t: number; puntos: V3[]; on: number; vel?: number; n?: number; tam?: number; color?: string}> = ({t, puntos, on, vel = 0.5, n = 14, tam = 0.004, color = '#ffe14d'}) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), [JSON.stringify(puntos)]);
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const u = (t * vel + i / n) % 1;
        return (
          <mesh key={i} position={curva.getPointAt(u)} scale={Math.min(1.4, on)}>
            <sphereGeometry args={[tam, 10, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
};
/** texto pintado en un plano */
const Texto3D: React.FC<{texto: string; w: number; h: number; position?: V3; color?: string; fondo?: string}> = ({texto, w, h, position, color = '#15161c', fondo = 'rgba(0,0,0,0)'}) => {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = Math.round((256 * h) / w);
    const g = cv.getContext('2d')!;
    g.fillStyle = fondo;
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = color;
    g.font = `900 ${Math.round(cv.height * 0.72)}px Inter, Arial`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, cv.width / 2, cv.height / 2 + 2);
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    return t;
  }, [texto, w, h, color, fondo]);
  return (
    <mesh position={position}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
};
/** rayito en zigzag */
const Zap: React.FC<{a: V3; b: V3; t: number; on: number; semilla?: number; g?: number; color?: string}> = ({a, b, t, on, semilla = 0, g = 0.002, color = '#fffbe0'}) => {
  if (on <= 0.05) return null;
  const n = 8;
  const f = Math.floor(t * 20);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.2;
  const pts = Array.from({length: n + 1}, (_, i) => {
    const k = i / n;
    const j = i === 0 || i === n ? 0 : 1;
    return new THREE.Vector3(a[0] + (b[0] - a[0]) * k + (rnd(f * 7 + i + semilla) - 0.5) * d * j, a[1] + (b[1] - a[1]) * k + (rnd(f * 11 + i + semilla) - 0.5) * d * j, a[2] + (b[2] - a[2]) * k);
  });
  const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
  return (
    <group>
      <mesh geometry={new THREE.TubeGeometry(c, 40, g * 3, 6, false)}>
        <meshBasicMaterial color="#ff8a1f" transparent opacity={0.5 * on} depthWrite={false} />
      </mesh>
      <mesh geometry={new THREE.TubeGeometry(c, 40, g, 6, false)}>
        <meshBasicMaterial color={color} transparent opacity={on} />
      </mesh>
    </group>
  );
};
/** flamitas */
const Llamas: React.FC<{t: number; on: number; p: V3; n?: number; ancho?: number; alto?: number}> = ({t, on, p, n = 6, ancho = 0.2, alto = 0.12}) => {
  if (on <= 0.01) return null;
  return (
    <group position={p}>
      {Array.from({length: n}, (_, i) => {
        const x = (i / (n - 1) - 0.5) * ancho;
        const h = alto * (0.6 + 0.4 * Math.sin(t * 11 + i * 2)) * on;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, h * 0.5, 0]} scale={[0.025, h * 0.6, 0.02]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color="#ff6a1f" transparent opacity={0.8} />
            </mesh>
            <mesh position={[0, h * 0.4, 0.004]} scale={[0.014, h * 0.4, 0.012]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color="#ffe14d" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- escenario: cuarto de servicio ----------
const Fondo: React.FC<{t: number}> = ({t}) => {
  const quemado = fuego(t);
  return (
    <group>
      <mesh position={[0, 1.2, -0.07]} receiveShadow>
        <planeGeometry args={[7, 3]} />
        <meshToonMaterial color="#cfe0c8" gradientMap={gradiente()} />
      </mesh>
      {/* tablero metálico detrás de la pastilla */}
      <Redondeada w={0.95} h={0.62} d={0.02} radio={0.01} position={[-0.12, 0.33, -0.06]} color="#9aa4b0" />
      <Redondeada w={0.9} h={0.57} d={0.01} radio={0.008} position={[-0.12, 0.33, -0.048]} color="#b7c0ca" contorno={false} />
      {/* mancha de quemado */}
      {quemado > 0.05 && (
        <mesh position={[0.26, 0.09, -0.068]}>
          <circleGeometry args={[0.12 * quemado, 30]} />
          <meshBasicMaterial color="#3a2a20" transparent opacity={0.6 * quemado} />
        </mesh>
      )}
      {/* piso */}
      <mesh position={[0, -0.001, 0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 1.4]} />
        <meshToonMaterial color="#d9c9ad" gradientMap={gradiente()} />
      </mesh>
      <Redondeada w={7} h={0.05} d={0.015} radio={0.005} position={[0, 0.025, -0.06]} color="#ffffff" contorno={false} />
      {/* cubeta y escoba */}
      <group position={[-0.7, 0, 0.15]}>
        <Torno perfil={[[0, 0], [0.09, 0], [0.11, 0.18], [0.105, 0.18], [0.085, 0.006], [0, 0.006]]} color="#3fa9f5" />
      </group>
      <group position={[-0.9, 0, -0.02]} rotation={[0, 0, 0.15]}>
        <Cilindro r={0.01} h={0.9} position={[0, 0.5, 0]} color="#c99a6b" />
        <Redondeada w={0.18} h={0.08} d={0.04} radio={0.01} position={[0, 0.04, 0]} color="#f2c14e" />
      </group>
    </group>
  );
};

// ---------- pastilla en corte ----------
const Pastilla: React.FC<{t: number}> = ({t}) => {
  const p = palanca(t);
  const ab = abierto(t);
  const c = corriente(t);
  const hb = calorBimet(t);
  const im = iman(t);
  const tp = tapa(t);
  // ángulo del brazo móvil
  const brazo = -0.55 * ab;
  const contactoMovil: V3 = (() => {
    const dx = FIJO[0] - PIVOTE[0];
    const dy = FIJO[1] + 0.008 - PIVOTE[1];
    const a = Math.atan2(dy, dx) + brazo;
    const L = Math.hypot(dx, dy);
    return [PIVOTE[0] + Math.cos(a) * L, PIVOTE[1] + Math.sin(a) * L, 0];
  })();
  const dobla = hb * 0.028;
  const bimTop: V3 = [BIMET_X - dobla, BIMET_Y[1], 0];
  const bimMarca = ventana(t, ev.bimetalica - 0.4, ev.bimetalica + 1.2, 0.2);
  const bobMarca = ventana(t, ev.magnetico - 0.4, ev.magnetico + 1.2, 0.2);
  const camMarca = ventana(t, ev.arqueo - 0.4, ev.arqueo + 1.2, 0.2);
  const palMarca = ventana(t, ev.palanca - 0.2, ev.pastilla1, 0.2);
  // camino de la corriente
  const camino: V3[] = [
    [TERM_IN[0], 1.4, 0.0],
    [TERM_IN[0], BY1 + 0.02, 0],
    TERM_IN,
    [FIJO[0] + 0.02, FIJO[1] + 0.03, 0],
    FIJO,
    contactoMovil,
    PIVOTE,
    bimTop,
    [BIMET_X, BIMET_Y[0], 0],
    [0.04, 0.2, 0],
    [BOBINA[0] + 0.03, BOBINA[1], 0],
    [BOBINA[0] - 0.03, BOBINA[1], 0],
    [-0.06, 0.17, 0],
    TERM_OUT,
    [0, BY0 - 0.005, 0],
  ];
  return (
    <group>
      {/* caja (mitad de atrás) */}
      <Panel p={[BX, (BY0 + BY1) / 2, -0.045]} s={[BW, BY1 - BY0, 0.01]} color="#3a3e48" />
      <Panel p={[BX - BW / 2 + 0.006, (BY0 + BY1) / 2, -0.01]} s={[0.012, BY1 - BY0, 0.08]} color="#2b2d33" />
      <Panel p={[BX + BW / 2 - 0.006, (BY0 + BY1) / 2, -0.01]} s={[0.012, BY1 - BY0, 0.08]} color="#2b2d33" />
      <Panel p={[BX, BY1 - 0.006, -0.01]} s={[BW, 0.012, 0.08]} color="#2b2d33" />
      <Panel p={[BX, BY0 + 0.006, -0.01]} s={[BW, 0.012, 0.08]} color="#2b2d33" />
      {/* terminales */}
      <Redondeada w={0.05} h={0.03} d={0.04} radio={0.006} position={TERM_IN} color="#d9823b" />
      <Redondeada w={0.05} h={0.03} d={0.04} radio={0.006} position={TERM_OUT} color="#d9823b" />
      {/* tira de cobre al contacto fijo */}
      <Cable puntos={[TERM_IN, [FIJO[0] + 0.02, FIJO[1] + 0.03, 0], FIJO]} r={0.004} color="#d9823b" />
      <Esfera r={0.008} escala={[1, 0.6, 1]} position={FIJO} color="#e8edf2" />
      {/* brazo móvil */}
      <Cable puntos={[PIVOTE, contactoMovil]} r={0.0045} color="#c9a24b" />
      <Esfera r={0.008} escala={[1, 0.6, 1]} position={contactoMovil} color="#e8edf2" />
      <Cilindro r={0.008} h={0.03} position={PIVOTE} rotation={[Math.PI / 2, 0, 0]} color="#9aa4b0" />
      {/* trenza flexible al bimetal */}
      <Cable puntos={[PIVOTE, [0.06, 0.36, 0.005], bimTop]} r={0.0028} color="#e0a050" />
      {/* lámina bimetálica */}
      {hayBimet(t) && (
        <Brota t={t} desde={ev.tira1 - 0.2}>
          {[0, 1].map((k) => (
            <Cable key={k} puntos={[[BIMET_X + (k ? 0.004 : -0.004), BIMET_Y[0], 0], [BIMET_X + (k ? 0.004 : -0.004) - dobla * 0.25, (BIMET_Y[0] + BIMET_Y[1]) / 2, 0], [bimTop[0] + (k ? 0.004 : -0.004), BIMET_Y[1], 0]]} r={0.0038} color={colorMezcla(k ? '#d9823b' : '#aeb7c2', '#ff5a2b', hb * 0.7)} brillo={hb * 0.4 + bimMarca * 0.3} emis={bimMarca > 0.2 ? '#ffd34d' : '#ff5a2b'} />
          ))}
        </Brota>
      )}
      {/* barra de disparo */}
      <Caja w={0.006} h={0.1} d={0.01} position={[0.055, 0.34, 0.006]} rotation={[0, 0, (hb > 0.9 || im > 0.5 ? 0.25 : 0)]} color="#f2c14e" />
      {/* bobina con su núcleo */}
      {hayBobina(t) && (
        <Brota t={t} desde={ev.bobina - 0.2} position={BOBINA}>
          <group rotation={[0, 0, Math.PI / 2]}>
            {Array.from({length: 9}, (_, i) => (
              <Toro key={i} r={0.016} tubo={0.0035} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.028 + i * 0.007, 0]} color={im > 0.3 ? '#5aa9ff' : bobMarca > 0.2 ? '#ffd34d' : '#d9823b'} />
            ))}
            <Cilindro r={0.008} h={0.07} position={[0, 0.01 + im * 0.015, 0]} color="#7a7f88" />
          </group>
          {im > 0.05 &&
            [0, 1, 2].map((i) => {
              const k = (t * 1.5 + i / 3) % 1;
              return (
                <mesh key={i} scale={[0.03 + k * 0.05, 0.02 + k * 0.035, 1]} position={[0, 0, 0.01]}>
                  <ringGeometry args={[0.92, 1, 40]} />
                  <meshBasicMaterial color="#5aa9ff" transparent opacity={im * (1 - k)} depthWrite={false} />
                </mesh>
              );
            })}
        </Brota>
      )}
      {!hayBobina(t) && <Cable puntos={[[0.04, 0.2, 0], [BOBINA[0], BOBINA[1], 0], [-0.06, 0.17, 0], TERM_OUT]} r={0.003} color="#d9823b" />}
      {hayBobina(t) && <Cable puntos={[[0.04, 0.2, 0], [BOBINA[0] + 0.03, BOBINA[1], 0]]} r={0.003} color="#d9823b" />}
      {hayBobina(t) && <Cable puntos={[[BOBINA[0] - 0.03, BOBINA[1], 0], [-0.07, 0.19, 0], TERM_OUT]} r={0.003} color="#d9823b" />}
      <Cable puntos={[[BIMET_X, BIMET_Y[0], 0], [0.07, 0.19, 0], [0.04, 0.2, 0]]} r={0.003} color="#d9823b" />
      {/* cámara de arqueo */}
      {hayCamara(t) && (
        <Brota t={t} desde={ev.laminitas - 0.2} position={[-0.085, 0.44, 0]}>
          {Array.from({length: 7}, (_, i) => (
            <Caja key={i} w={0.055} h={0.0035} d={0.05} position={[0, -0.036 + i * 0.012, -0.004]} rotation={[0, 0, 0.15]} color={camMarca > 0.2 ? '#ffd34d' : '#aeb7c2'} />
          ))}
        </Brota>
      )}
      {/* palanca */}
      <group position={[0.06, BY1, 0.0]}>
        <group rotation={[0, 0, (p - 0.5) * -1.0]}>
          <Redondeada w={0.024} h={0.08} d={0.04} radio={0.008} position={[0, 0.035, 0]} color={palMarca > 0.2 ? '#ffd34d' : '#2b2d33'} />
          {/* bandera roja de "botada" */}
          {Math.abs(p - 0.5) < 0.1 && <Caja w={0.026} h={0.012} d={0.042} position={[0, 0.05, 0]} color="#e5333b" contorno={false} />}
        </group>
      </group>
      {/* corriente */}
      <Corriente t={t} puntos={camino} on={c * (1 - ab)} vel={0.18 + c * 0.25} n={Math.round(18 + c * 10)} tam={0.0045} />
      {/* arco entre los contactos */}
      <Arco t={t} a={FIJO} b={contactoMovil} />
      {/* tapa del frente (al final) */}
      {tp > 0.01 && (
        <group position={[BX, (BY0 + BY1) / 2, 0.04 + (1 - tp) * 0.3]} scale={[1, 1, 1]}>
          <Panel p={[0, 0, 0]} s={[BW, BY1 - BY0, 0.012]} color="#2b2d33" o={tp} />
          {tp > 0.6 && <Texto3D texto="20 A" w={0.12} h={0.05} position={[0, -0.12, 0.007]} color="#ffffff" />}
        </group>
      )}
    </group>
  );
};

/** panel con contorno */
const Panel: React.FC<{p: V3; s: V3; color: string; o?: number}> = ({p, s, color, o = 1}) => {
  if (o <= 0.01) return null;
  const tr = o < 0.98;
  return (
    <group position={p}>
      <mesh castShadow={!tr} receiveShadow>
        <boxGeometry args={s} />
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} />
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

/** arco eléctrico (y cómo lo atrapan las laminitas) */
const Arco: React.FC<{t: number; a: V3; b: V3}> = ({t, a, b}) => {
  const on = arco(t);
  if (on <= 0.02) return null;
  const atrapa = r(t, ev.atrapan - 0.3, 0.6);
  const corta = r(t, ev.pedacitos - 0.3, 0.4);
  const apaga = 1 - r(t, ev.apagan - 0.2, 0.4);
  const centro: V3 = [(a[0] + b[0]) / 2 - atrapa * 0.06, (a[1] + b[1]) / 2 + atrapa * 0.01, 0.01];
  return (
    <group>
      {corta < 0.5 ? (
        <>
          <Zap a={a} b={centro} t={t} on={on * apaga} g={0.0025} />
          <Zap a={centro} b={b} t={t + 1} on={on * apaga} g={0.0025} semilla={3} />
          <mesh position={centro}>
            <sphereGeometry args={[0.02 * on, 16, 12]} />
            <meshBasicMaterial color="#ffb020" transparent opacity={0.5 * on * apaga} depthWrite={false} />
          </mesh>
        </>
      ) : (
        Array.from({length: 6}, (_, i) => {
          const y = 0.41 + i * 0.012;
          return <Zap key={i} a={[-0.11, y, 0.01]} b={[-0.06, y + 0.005, 0.01]} t={t + i} on={on * apaga * (1 - corta * 0.4)} g={0.0015} semilla={i * 5} />;
        })
      )}
    </group>
  );
};

/** cable de salida, regleta y aparatos */
const Salida: React.FC<{t: number}> = ({t}) => {
  const c = corriente(t);
  const h = calorCable(t);
  const ab = abierto(t);
  const derrite = t < 0.75 ? 0 : r(t, ev.derrite - 0.3, 1.0) * (1 - r(t, ev.asi1, 0.5));
  const cable: V3[] = [
    [0, BY0 - 0.005, 0],
    [0, 0.06, 0],
    [0.1, 0.05 - derrite * 0.02, -0.03],
    [0.26, 0.06 - derrite * 0.03, -0.04],
    [0.34, 0.03, 0.04],
    [REGLETA[0] - 0.12, 0.012, REGLETA[2]],
  ];
  const n = aparatos(t);
  const toque = t < 0.75 ? 0 : ventana(t, ev.tocan - 0.1, ev.tocan + 1.0, 0.05);
  const foco = encendida(t) * (t < 0.75 ? 1 : 1);
  return (
    <group>
      <Cable puntos={cable} r={0.006} color={colorMezcla('#2b2d33', '#ff4a1f', h * 0.8)} brillo={h * 0.6} />
      <Corriente t={t} puntos={cable} on={c * (1 - ab)} vel={0.2 + c * 0.3} n={10} tam={0.0045} />
      {/* gotas de plástico derretido */}
      {derrite > 0.1 &&
        [0.12, 0.2, 0.28].map((x, i) => {
          const u = ((t - ev.derrite) * 0.6 + i * 0.3) % 1;
          return <Esfera key={i} r={0.006} escala={[1, 1.4, 1]} position={[x, 0.04 - u * 0.04, -0.03]} color="#2b2d33" contorno={false} />;
        })}
      <Llamas t={t} on={fuego(t)} p={[0.2, 0.04, -0.04]} n={7} ancho={0.24} alto={0.16} />
      {/* regleta */}
      <group position={REGLETA}>
        <Redondeada w={0.26} h={0.03} d={0.06} radio={0.01} position={[0, 0.015, 0]} color="#f2efe6" />
        {[-0.08, -0.025, 0.03, 0.085].map((x) => (
          <Caja key={x} w={0.02} h={0.002} d={0.02} position={[x, 0.031, 0]} color="#3a3e48" contorno={false} />
        ))}
        <Redondeada w={0.016} h={0.01} d={0.016} radio={0.004} position={[0.115, 0.034, 0]} color={encendida(t) ? '#e5333b' : '#7a2a2a'} contorno={false} />
      </group>
      {/* aparatos */}
      <group position={[REGLETA[0], 0, REGLETA[2] - 0.13]}>
        {/* lámpara */}
        <group position={[-0.1, 0, 0]}>
          <Cilindro r={0.04} r2={0.045} h={0.015} position={[0, 0.008, 0]} color="#3a3e48" />
          <Cilindro r={0.005} h={0.2} position={[0, 0.11, 0]} color="#3a3e48" />
          <Torno perfil={[[0.02, 0.2], [0.07, 0.12], [0.075, 0.12], [0.025, 0.205]]} color="#f2c14e" doble />
          <Esfera r={0.022} position={[0, 0.135, 0]} color={foco > 0.5 ? '#fff6b0' : '#d6dbe2'} contorno={false} />
          {foco > 0.5 && <pointLight position={[0, 0.12, 0.05]} color="#ffd98a" intensity={0.5} distance={0.8} />}
        </group>
        {n > 1 && (
          <>
            <Brota t={t} desde={ev.aparatos1 - 0.3} hasta={ev.desconecta + 0.2} position={[0.0, 0, 0]}>
              {/* calentador */}
              <Redondeada w={0.08} h={0.13} d={0.05} radio={0.012} position={[0, 0.065, 0]} color="#e5333b" />
              {[0.04, 0.065, 0.09].map((y) => (
                <Caja key={y} w={0.06} h={0.006} d={0.002} position={[0, y, 0.026]} color={c > 0.3 ? '#ffb020' : '#7a2a2a'} contorno={false} />
              ))}
            </Brota>
            <Brota t={t} desde={ev.aparatos1 - 0.1} hasta={ev.desconecta + 0.4} position={[0.1, 0, 0]}>
              {/* tostador */}
              <Redondeada w={0.09} h={0.07} d={0.06} radio={0.015} position={[0, 0.035, 0]} color="#c9ced8" />
              <Caja w={0.06} h={0.004} d={0.012} position={[0, 0.071, 0]} color="#15161c" contorno={false} />
            </Brota>
            <Brota t={t} desde={ev.aparatos1 + 0.1} hasta={ev.desconecta + 0.6} position={[0.2, 0, 0.02]}>
              {/* plancha */}
              <Redondeada w={0.1} h={0.03} d={0.05} radio={0.012} position={[0, 0.015, 0]} color="#3fa9f5" />
              <Redondeada w={0.06} h={0.02} d={0.014} radio={0.006} position={[0, 0.045, 0]} color="#2b2d33" />
            </Brota>
          </>
        )}
      </group>
      {/* cables de los aparatos a la regleta */}
      {/* corto: dos cables se tocan */}
      <Zap a={[REGLETA[0] + 0.03, 0.035, REGLETA[2] - 0.03]} b={[REGLETA[0] + 0.05, 0.08, REGLETA[2] - 0.06]} t={t} on={toque} g={0.003} />
      {toque > 0.1 && (
        <mesh position={[REGLETA[0] + 0.04, 0.05, REGLETA[2] - 0.04]}>
          <sphereGeometry args={[0.03 * toque, 16, 12]} />
          <meshBasicMaterial color="#ffd34d" transparent opacity={0.6 * toque} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

/** pastilla de falla a tierra (con botón de prueba) y la grande de 40 A */
const OtrasPastillas: React.FC<{t: number}> = ({t}) => {
  const gfci = t < 0.75 ? 0 : ventana(t, ev.pastillas2 - 0.4, ev.si3 + 1.0, 0.4);
  const botaG = t > ev.cortan2 - 0.1 && t < ev.si3 + 1 ? r(t, ev.cortan2 - 0.1, 0.1) : 0;
  const boton = ventana(t, ev.boton - 0.2, ev.boton + 1.2, 0.2);
  const grande = t < 0.75 ? 0 : ventana(t, ev.grande - 0.5, ev.aguantaria + 0.8, 0.3);
  const fila = t < 0.75 ? 0 : ventana(t, ev.palanca - 0.3, ev.pero4, 0.4);
  const pastillita = (x: number, color: string, etiqueta: string, bota: number, conBoton = false, brilloBoton = 0) => (
    <group position={[x, 0.32, 0.0]}>
      <Redondeada w={0.13} h={0.36} d={0.09} radio={0.01} color={color} />
      <group position={[0, 0.17, 0]} rotation={[0, 0, (bota > 0.5 ? 0 : -0.5)]}>
        <Redondeada w={0.024} h={0.07} d={0.04} radio={0.008} position={[0, 0.03, 0]} color="#2b2d33" />
        {bota > 0.5 && <Caja w={0.026} h={0.012} d={0.042} position={[0, 0.045, 0]} color="#e5333b" contorno={false} />}
      </group>
      <Texto3D texto={etiqueta} w={0.1} h={0.045} position={[0, -0.1, 0.0455]} color={color === '#f2efe6' ? '#15161c' : '#ffffff'} />
      {conBoton && (
        <group position={[0, 0.0, 0.05]}>
          <Cilindro r={0.018} h={0.012} rotation={[Math.PI / 2, 0, 0]} color={brilloBoton > 0.2 ? '#ffd34d' : '#3fa9f5'} />
          <Texto3D texto="T" w={0.03} h={0.03} position={[0, 0, 0.0065]} color="#15161c" />
        </group>
      )}
    </group>
  );
  return (
    <group>
      {fila > 0.01 && (
        <group scale={fila}>
          {pastillita(-0.36, '#3a3e48', '15 A', 0)}
          {pastillita(-0.5, '#3a3e48', '15 A', 0)}
        </group>
      )}
      {gfci > 0.01 && <group scale={gfci}>{pastillita(-0.36, '#f2efe6', '20 A', botaG, true, boton)}</group>}
      {grande > 0.01 && (
        <group position={[0.0, 0.0, 0.28]} scale={grande}>
          {pastillita(0.0, '#3a3e48', '40 A', 0)}
          <group position={[0, 0.32, 0.06]}>
            <Caja w={0.3} h={0.03} d={0.01} rotation={[0, 0, 0.8]} color="#e5333b" contorno={false} />
            <Caja w={0.3} h={0.03} d={0.01} rotation={[0, 0, -0.8]} color="#e5333b" contorno={false} />
          </group>
        </group>
      )}
    </group>
  );
};

/** brazo que toca el calentador (fuga por la persona) */
const Persona: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.pero4 + 0.6, ev.pastillas2, 0.4);
  if (on <= 0.01) return null;
  const obj: V3 = [REGLETA[0] + 0.02, 0.14, REGLETA[2] - 0.1];
  const sep = 1 - on;
  return (
    <group>
      <group position={[obj[0] + 0.25 * sep, obj[1] + 0.2 * sep, obj[2] + 0.2 * sep]} rotation={[0.6, -0.25, -0.95]}>
        <group position={[0, 0.06, 0]}>
          <Cilindro r={0.032} r2={0.03} h={0.2} position={[0, 0.13, 0]} color="#f0c09a" />
          <Cilindro r={0.046} r2={0.042} h={0.45} position={[0, 0.45, 0]} color="#7cc26b" />
          <Redondeada w={0.07} h={0.075} d={0.034} radio={0.015} position={[0, 0.0, 0]} color="#f0c09a" />
          {[-0.024, -0.008, 0.008, 0.024].map((x) => (
            <Redondeada key={x} w={0.014} h={0.046} d={0.017} radio={0.0065} position={[x, -0.055, 0.008]} rotation={[0.2, 0, 0]} color="#f0c09a" />
          ))}
        </group>
      </group>
      <Corriente t={t} puntos={[obj, [obj[0] + 0.1, obj[1] + 0.15, obj[2] + 0.1], [obj[0] + 0.25, 0.3, obj[2] + 0.2], [obj[0] + 0.25, 0.0, obj[2] + 0.3]]} on={on * ventana(t, ev.persona - 0.6, ev.pastillas2, 0.2)} n={14} vel={1.0} tam={0.006} color="#ff4d3d" />
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
    <Fondo t={t} />
    <Pieza t={t} desde={ev.switch1 - 0.3} dir={[0.2, 1, 0.6]} caida={0.3}>
      <Pastilla t={t} />
    </Pieza>
    <Salida t={t} />
    <OtrasPastillas t={t} />
    <Persona t={t} />
    <SombraContacto position={[REGLETA[0], 0.001, REGLETA[2] - 0.06]} w={0.5} d={0.25} o={0.25} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.switch1 - 0.2, 'un switch', false],
  [ev.cortar - 0.3, 'cortas la luz cuando quieras', false],
  [ev.aparatos1 - 0.4, 'muchos aparatos', true],
  [ev.corriente1 - 0.4, 'más corriente de la que aguanta', true],
  [ev.calienta - 0.2, 'se calienta', true],
  [ev.derrite - 0.2, 'se derrite', true],
  [ev.incendia - 0.3, '¡se incendia la pared!', true],
  [ev.tira1 - 0.3, 'dos metales pegados', false],
  [ev.estira - 0.5, 'uno se estira más', false],
  [ev.dobla - 0.3, 'se dobla y apaga', false],
  [ev.bimetalica - 0.6, 'la lámina bimetálica', false],
  [ev.tocan - 0.4, 'dos cables se tocan', true],
  [ev.golpe - 0.4, '¡sube de golpe!', true],
  [ev.tarda - 0.4, 'la lámina tarda demasiado', true],
  [ev.bobina - 0.3, 'una bobina de alambre', false],
  [ev.iman - 0.4, 'se vuelve imán', false],
  [ev.instante - 0.5, '¡al instante!', false],
  [ev.magnetico - 0.6, 'el disparo magnético', false],
  [ev.arco1 - 0.4, '¡arco de fuego!', true],
  [ev.laminitas - 0.3, 'laminitas', false],
  [ev.pedacitos - 0.5, 'lo cortan en pedacitos', false],
  [ev.arqueo - 0.6, 'la cámara de arqueo', false],
  [ev.salta2 - 0.4, 'la palanca salta', false],
  [ev.pastilla1 - 0.5, 'eso es una pastilla', false],
  [ev.persona - 0.6, '¡se escapa por una persona!', true],
  [ev.boton - 0.3, 'botón de prueba', false],
  [ev.fuga - 0.4, 'detectan la fuga', false],
  [ev.tierra - 0.6, 'de falla a tierra', false],
  [ev.si3 - 0.1, '¿se bota seguido?', true],
  [ev.grande - 0.6, 'no le pongas una más grande', true],
  [ev.aguantaria - 0.8, 'tu cable no la aguantaría', true],
  [ev.desconecta - 0.2, 'desconecta aparatos', false],
  [ev.linea - 0.4, 'o revisa esa línea', false],
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
      {marca !== undefined && <div style={{position: 'absolute', left: 0, right: 0, height: 5, background: '#e5333b', bottom: `${marca * 100}%`}} />}
    </div>
    <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 24, color: '#15161c', textAlign: 'center', lineHeight: 1.0}}>{nombre}</div>
  </div>
);
const Medidores: React.FC<{t: number}> = ({t}) => {
  if (t < ev.pero1 - 0.2) return null;
  const c = corriente(t);
  const v = cl(c / 3.2) * 0.75 + (c > 1 ? 0.1 : 0);
  const alta = c > 1.05;
  return <Termometro x={950} valor={c > 0 ? Math.max(0.12, v + (c > 0.35 ? (c - 0.35) * 0.35 : 0)) : 0} color={alta ? '#e5333b' : '#ffcf3d'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="corriente" marca={0.62} />;
};
/** reloj: la lámina tarda vs milésimas de segundo */
const Reloj: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.golpe - 0.3;
  const b = ev.asi2 - 0.1;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const barra = (txt: string, frac: number, color: string) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div style={{width: 230, fontFamily: FUENTE, fontWeight: 800, fontSize: 32, color: '#15161c', textAlign: 'right'}}>{txt}</div>
      <div style={{width: 520, height: 44, borderRadius: 22, border: '5px solid #15161c', background: '#ffffff', overflow: 'hidden'}}>
        <div style={{width: `${frac * 100}%`, height: '100%', background: color}} />
      </div>
    </div>
  );
  const k = r(t, a + 0.2, 0.6);
  const kl = r(t, ev.tarda - 0.5, 3);
  return (
    <div style={{position: 'absolute', left: 30, right: 30, top: 1180, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', padding: '26px 0', borderRadius: 30, background: 'rgba(255,255,255,0.88)', opacity: o, transform: `scale(${0.85 + 0.15 * s})`}}>
      {barra('el corto', k, '#e5333b')}
      {barra('la lámina', 0.08 + kl * 0.3, '#ff9f43')}
    </div>
  );
};

export const PastillaVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#cfe0c8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(30,45,30,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Reloj t={t} />
      <Audio src={staticFile('pastilla/voz.wav')} />
      <Audio src={staticFile('pastilla/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_PASTILLA = (datos as any).duration as number;
