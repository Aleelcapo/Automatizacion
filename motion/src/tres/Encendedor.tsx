import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/encendedor.json';
import {AristasCaja, Caja, Cilindro, Esfera, gradiente, Papel, Redondeada, SombraContacto, Torno, Toro} from './toon';
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
  gas1: T('gas', 1),
  tanquecito: T('tanquecito'),
  ojito1: T('ojito', 1),
  encendedor1: T('encendedor', 1),
  pero1: T('pero', 1),
  escapa: T('escapa'),
  asi1: T('así', 1),
  valvula: T('válvula'),
  boton: T('botón'),
  palanca: T('palanca'),
  pero2: T('pero', 2),
  prende: T('prende'),
  asi2: T('así', 2),
  piedrita: T('piedrita'),
  rueda1: T('rueda', 1),
  girarla: T('girarla'),
  raspas: T('raspas'),
  vivo: T('vivo'),
  piedra2: T('piedra', 2),
  pero3: T('pero', 3),
  lados: T('lados'),
  asi3: T('así', 3),
  abajo: T('abajo'),
  resorte: T('resorte'),
  saltan: T('saltan'),
  directo: T('directo'),
  pero4: T('pero', 4),
  alta: T('alta'),
  quema: T('quema'),
  asi4: T('así', 4),
  perilla: T('perilla'),
  mas: T('más', 1),
  menos: T('menos'),
  regulador: T('regulador'),
  pero5: T('pero', 5),
  viento1: T('viento', 1),
  apaga: T('apaga'),
  asi5: T('así', 5),
  capuchon: T('capuchón'),
  ojitos: T('ojitos'),
  protege: T('protege'),
  aire: T('aire'),
  protector: T('protector'),
  transparente: T('transparente'),
  liquido1: T('líquido', 1),
  salir: T('salir', 2),
  vuelve: T('vuelve'),
  dejes: T('dejes'),
  sol: T('sol'),
  expande: T('expande'),
  tronar: T('tronar'),
  si2: T('si', 2),
  chispa: T('chispa'),
  acabo: T('acabó'),
};

// ---------- geometría ----------
const TW = 0.1;
const TH = 0.26;
const TD = 0.046;
const NOZ: V3 = [-0.02, 0.29, 0]; // boca del gas (ojito)
const RUEDA: V3 = [0.016, 0.305, 0];
const RR = 0.019;
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
const hayValvula = (t: number) => visible(t, ev.valvula - 0.2);
const hayRueda = (t: number) => visible(t, ev.rueda1 - 0.2);
const hayProtector = (t: number) => visible(t, ev.capuchon - 0.2);
/** palanca apretada (0..1) */
const aprieta = (t: number) => {
  if (t < 0.75) return 1;
  return Math.max(
    ventana(t, ev.palanca - 0.6, ev.pero2 - 0.1, 0.15),
    ventana(t, ev.pero2 + 0.2, ev.asi2 - 0.2, 0.15),
    ventana(t, ev.pero3 - 0.2, ev.asi3, 0.15),
    ventana(t, ev.saltan - 1.2, ev.quema + 0.3, 0.15),
    ventana(t, ev.perilla + 0.4, ev.apaga + 0.6, 0.15),
    ventana(t, ev.protege - 1.0, ev.transparente - 0.6, 0.15),
  );
};
/** gas saliendo (0..1) */
const gasSale = (t: number) => {
  if (t < 0.75) return 0;
  const libre = !hayValvula(t) && t > ev.ojito1 ? 1 : 0;
  const cierra = r(t, ev.valvula - 0.2, 0.3);
  return Math.max(libre * (1 - cierra), hayValvula(t) ? aprieta(t) : 0) * (1 - r(t, ev.transparente - 0.6, 0.4));
};
/** flama (altura 0..1.6) */
const flama = (t: number) => {
  if (t < 0.75) return 1;
  const prende = r(t, ev.directo + 0.6, 0.15);
  let f = 0;
  if (entre(t, ev.directo + 0.5, ev.apaga + 0.4)) {
    f = prende * 1.0;
    f += 0.6 * ventana(t, ev.pero4 - 0.1, ev.asi4 + 0.3, 0.3); // muy alta
    // regulador: más / menos
    if (t > ev.perilla) f = 1 + 0.4 * ventana(t, ev.mas - 0.1, ev.menos, 0.3) - 0.35 * ventana(t, ev.menos, ev.regulador + 0.4, 0.3);
    f *= 1 - r(t, ev.apaga - 0.1, 0.35);
  }
  if (entre(t, ev.protege - 0.8, ev.transparente - 0.6)) f = r(t, ev.protege - 0.8, 0.2) * (1 - r(t, ev.transparente - 0.9, 0.3));
  return f * aprieta(t);
};
const quitaDedo = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.quema - 0.05, ev.asi4 + 0.3, 0.1));
/** rueda girando (vueltas) */
const giroRueda = (t: number) => {
  if (t < 0.75) return 0;
  const segs: [number, number][] = [
    [ev.girarla, ev.vivo + 0.4],
    [ev.pero3, ev.lados + 0.8],
    [ev.saltan - 0.4, ev.directo + 0.5],
    [ev.protege - 1.1, ev.protege - 0.7],
    [ev.si2 + 0.6, ev.acabo + 0.4],
  ];
  let a = 0;
  for (const [s, e] of segs) a += cl((t - s) / (e - s)) * (e - s) * 7;
  return a;
};
const raspando = (t: number) => {
  if (t < 0.75) return 0;
  return Math.max(ventana(t, ev.raspas - 0.3, ev.vivo + 0.4, 0.1), ventana(t, ev.pero3, ev.lados + 0.8, 0.1), ventana(t, ev.saltan - 0.4, ev.directo + 0.5, 0.1), ventana(t, ev.protege - 1.1, ev.protege - 0.7, 0.05));
};
/** piedra: 0 al lado de la rueda, 1 abajo con resorte */
const piedraAbajo = (t: number) => (t < 0.75 ? 1 : r(t, ev.abajo - 0.3, 0.6));
const largoPiedra = (t: number) => (t < 0.75 ? 1 : 1 - 0.85 * r(t, ev.si2, 0.5));
const calorSol = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.dejes - 0.3, ev.si2, 0.4));
const hinchado = (t: number) => (t < 0.75 ? 0 : r(t, ev.expande - 0.2, 1.2) * (1 - r(t, ev.si2 - 0.3, 0.3)));
const truena = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.tronar - 0.05, ev.si2 - 0.2, 0.08));
const nivelGas = (t: number) => {
  if (t < 0.75) return 0.6;
  let v = 0.62 * r(t, ev.gas1 + 0.4, 0.8);
  v -= 0.12 * r(t, ev.pero1, 2.2) * (1 - r(t, ev.valvula, 0.01));
  v += 0.06 * hinchado(t);
  return Math.max(0.3, v);
};
const viento = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.viento1 - 0.4, ev.asi5 + 0.2, 0.4), ventana(t, ev.protege - 0.5, ev.aire, 0.4) * 0.8));

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 1.5, 0.4, 0.3, [0, 0.17, 0]],
  [1.0, 0.95, 0.35, 0.15, [0, 0.17, 0]],
  [5.7, 0.45, 0.4, 0.25, [-0.01, 0.3, 0]],
  [14.5, 0.55, 0.5, 0.2, [0, 0.3, 0]],
  [17.1, 0.42, 0.7, 0.15, [0.01, 0.29, 0]],
  [26.9, 0.6, 0.5, 0.2, [0, 0.31, 0]],
  [31.4, 0.48, 0.25, 0.1, [0.012, 0.27, 0]],
  [37.0, 0.55, 0.5, 0.2, [0, 0.32, 0]],
  [39.6, 0.85, 0.45, 0.15, [0, 0.36, 0]],
  [42.4, 0.5, -0.3, 0.15, [-0.03, 0.3, 0]],
  [48.1, 0.85, 0.45, 0.15, [0, 0.33, 0]],
  [57.4, 0.8, 0.4, 0.1, [0, 0.15, 0]],
  [65.0, 1.05, 0.5, 0.2, [0, 0.17, 0]],
  [70.2, 0.5, 0.6, 0.2, [0.01, 0.3, 0]],
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
  const s = truena(t);
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

// ---------- escenario: patio de noche ----------
const Patio: React.FC<{t: number}> = ({t}) => {
  const sol = calorSol(t);
  return (
    <group>
      <mesh position={[0, 1.2, -0.8]}>
        <planeGeometry args={[8, 4]} />
        <meshBasicMaterial color={new THREE.Color('#2c4a78').lerp(new THREE.Color('#ffb36b'), sol).getStyle()} />
      </mesh>
      {/* estrellas */}
      {sol < 0.5 &&
        Array.from({length: 30}, (_, i) => (
          <mesh key={i} position={[-2 + rnd(i) * 4, 0.6 + rnd(i + 9) * 1.6, -0.79]}>
            <circleGeometry args={[0.006 + rnd(i + 3) * 0.006, 8]} />
            <meshBasicMaterial color="#fff6c8" transparent opacity={1 - sol * 2} />
          </mesh>
        ))}
      {/* barda */}
      <mesh position={[0, 0.25, -0.6]} receiveShadow>
        <planeGeometry args={[8, 0.8]} />
        <meshToonMaterial color="#d98b6a" gradientMap={gradiente()} />
      </mesh>
      {Array.from({length: 16}, (_, i) => (
        <Caja key={i} w={0.012} h={0.8} d={0.01} position={[-2 + i * 0.27, 0.25, -0.595]} color="#c27a5a" contorno={false} />
      ))}
      {/* foquitos */}
      {Array.from({length: 14}, (_, i) => {
        const x = -1.3 + i * 0.2;
        const y = 0.85 - Math.sin((i / 13) * Math.PI) * 0.12;
        return <Esfera key={i} r={0.016} position={[x, y, -0.55]} color={['#ffd34d', '#ff8a6b', '#7fd0ff', '#9be37a'][i % 4]} contorno={false} />;
      })}
      {/* mesa de madera */}
      <Redondeada w={2.6} h={0.05} d={1.0} radio={0.015} position={[0, -0.025, -0.1]} color="#b9834c" />
      {[-0.35, -0.15, 0.05, 0.25].map((z) => (
        <mesh key={z} position={[0, 0.0005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 0.004]} />
          <meshBasicMaterial color="#9a6a3c" />
        </mesh>
      ))}
      <Caja w={2.6} h={0.9} d={0.9} position={[0, -0.5, -0.12]} color="#8f6238" contorno={false} />
      {/* vela en frasco y maceta */}
      <group position={[-0.32, 0, -0.2]}>
        <Torno perfil={[[0, 0], [0.05, 0], [0.052, 0.12], [0.045, 0.13], [0, 0.13]]} color="#e9f4f6" opacity={0.6} contorno={false} />
        <Cilindro r={0.04} h={0.07} position={[0, 0.035, 0]} color="#fff3d6" />
        <Cilindro r={0.002} h={0.015} position={[0, 0.077, 0]} color="#15161c" contorno={false} />
      </group>
      <group position={[0.34, 0, -0.25]}>
        <Torno perfil={[[0, 0], [0.06, 0], [0.075, 0.12], [0, 0.12]]} color="#e07a4f" />
        {[0, 1, 2, 3].map((i) => (
          <Esfera key={i} r={0.05} escala={[0.5, 1.3, 0.3]} position={[Math.sin(i * 1.6) * 0.03, 0.19, Math.cos(i * 1.6) * 0.03]} color="#4fae6a" />
        ))}
      </group>
      {/* llaves sobre la mesa */}
      <group position={[0.25, 0.004, 0.15]} rotation={[0, 0.6, 0]}>
        <Toro r={0.022} tubo={0.004} rotation={[Math.PI / 2, 0, 0]} color="#c9ced8" />
        <Redondeada w={0.06} h={0.006} d={0.022} radio={0.003} position={[0.05, 0, 0]} color="#f2c14e" />
      </group>
    </group>
  );
};

// ---------- el encendedor ----------
const Tanque: React.FC<{t: number}> = ({t}) => {
  const h = hinchado(t);
  const brilla = ventana(t, ev.transparente - 0.3, ev.transparente + 1.4, 0.2);
  const nivel = nivelGas(t);
  const liquidoMarca = ventana(t, ev.liquido1 - 0.2, ev.liquido1 + 1.4, 0.2);
  const roto = t > ev.tronar - 0.05 && t < ev.si2 - 0.2;
  return (
    <group scale={[1 + h * 0.18, 1 + h * 0.03, 1 + h * 0.45]}>
      {/* tanque transparente */}
      <Redondeada w={TW} h={TH} d={TD} radio={0.012} position={[0, TH / 2, 0]} color={brilla > 0.2 ? '#bfefff' : '#6fc3ff'} opacity={0.32} contorno={false} sombra={false} />
      <AristasCaja w={TW} h={TH} d={TD} position={[0, TH / 2, 0]} g={0.0012} />
      {/* gas líquido */}
      <mesh position={[0, 0.004 + (TH * nivel) / 2, 0]}>
        <boxGeometry args={[TW - 0.008, TH * nivel, TD - 0.008]} />
        <meshToonMaterial color={liquidoMarca > 0.2 ? '#e8fbff' : '#cfe9ff'} gradientMap={gradiente()} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.004 + TH * nivel, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TW - 0.008, TD - 0.008]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {/* burbujitas que suben del líquido */}
      {Array.from({length: 8}, (_, i) => {
        const u = (t * 0.4 + rnd(i)) % 1;
        return <Esfera key={i} r={0.002 + rnd(i + 3) * 0.002} position={[(rnd(i + 5) - 0.5) * 0.07, 0.01 + u * TH * nivel, (rnd(i + 7) - 0.5) * 0.025]} color="#ffffff" contorno={false} sombra={false} />;
      })}
      {/* tubo del gas hasta arriba */}
      <Cilindro r={0.003} h={0.27} position={[NOZ[0], 0.15, 0]} color="#e9f4f6" opacity={0.7} contorno={false} />
      {/* base de color */}
      <Redondeada w={TW + 0.002} h={0.012} d={TD + 0.002} radio={0.005} position={[0, 0.006, 0]} color="#e5333b" />
      {roto && (
        <group position={[0.03, 0.14, TD / 2 + 0.002]}>
          <Caja w={0.002} h={0.06} d={0.002} rotation={[0, 0, 0.4]} color="#15161c" contorno={false} />
          <Caja w={0.002} h={0.04} d={0.002} position={[0.01, -0.02, 0]} rotation={[0, 0, -0.5]} color="#15161c" contorno={false} />
        </group>
      )}
    </group>
  );
};

/** cabeza: tapa negra, ojito, válvula, palanca, rueda, piedra y resorte, perilla */
const Cabeza: React.FC<{t: number}> = ({t}) => {
  const ap = aprieta(t);
  const ojitoOn = t < 0.75 || t > ev.ojito1 - 0.2;
  const valvulaMarca = ventana(t, ev.valvula - 0.2, ev.valvula + 1.2, 0.2);
  const palancaMarca = ventana(t, ev.palanca - 0.3, ev.palanca + 1.2, 0.2);
  const piedraMarca = ventana(t, ev.piedra2 - 0.4, ev.piedra2 + 1.2, 0.2) + ventana(t, ev.acabo - 0.4, ev.acabo + 2, 0.2);
  const perillaMarca = ventana(t, ev.regulador - 0.4, ev.regulador + 1.2, 0.2);
  const abajo = piedraAbajo(t);
  const lp = largoPiedra(t);
  // piedra: al lado de la rueda (x+0.03) o justo abajo
  const px = RUEDA[0] + (1 - abajo) * 0.035;
  const py = RUEDA[1] - RR - 0.004 - (1 - abajo) * 0.0;
  const perillaGiro = t < 0.75 ? 0 : (ventana(t, ev.mas - 0.1, ev.menos, 0.3) - ventana(t, ev.menos, ev.regulador + 0.4, 0.3)) * 1.5;
  return (
    <group>
      {/* tapa negra */}
      <Redondeada w={TW} h={0.016} d={TD} radio={0.006} position={[0, TH + 0.008, 0]} color="#2b2d33" />
      {/* ojito (boquilla) */}
      {ojitoOn && (
        <Brota t={t} desde={ev.ojito1 - 0.2} position={[NOZ[0], TH + 0.016, 0]}>
          <Cilindro r={0.0055} h={0.014} position={[0, 0.007, 0]} color={valvulaMarca > 0.2 ? '#ffd34d' : '#aeb7c2'} />
          <Cilindro r={0.0025} h={0.0012} position={[0, 0.0145, 0]} color="#15161c" contorno={false} />
        </Brota>
      )}
      {/* palanca de gas (botón) */}
      <Brota t={t} desde={ev.boton - 0.2} position={[-0.012, TH + 0.022 - ap * 0.004, 0]}>
        <group rotation={[0, 0, -ap * 0.08]}>
          <Redondeada w={0.075} h={0.012} d={TD - 0.004} radio={0.004} position={[-0.004, 0, 0]} color={palancaMarca > 0.2 ? '#ffd34d' : '#e5333b'} />
          <Caja w={0.012} h={0.004} d={0.01} position={[-0.008, 0.008, 0]} color="#2b2d33" contorno={false} />
        </group>
      </Brota>
      {/* rueda */}
      {hayRueda(t) && (
        <Brota t={t} desde={ev.rueda1 - 0.2} position={RUEDA}>
          <group rotation={[0, 0, -giroRueda(t)]}>
            <Cilindro r={RR} h={0.03} rotation={[Math.PI / 2, 0, 0]} color="#9aa4b0" />
            {Array.from({length: 14}, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return <Caja key={i} w={0.003} h={0.003} d={0.032} position={[Math.cos(a) * RR, Math.sin(a) * RR, 0]} rotation={[0, 0, a]} color="#6f7885" contorno={false} />;
            })}
            <Cilindro r={0.006} h={0.034} rotation={[Math.PI / 2, 0, 0]} color="#3a3e48" />
          </group>
        </Brota>
      )}
      {/* piedra + resorte (dentro de un tubito, se ve por el tanque) */}
      <Brota t={t} desde={ev.piedrita - 0.1} position={[px, py, 0]}>
        <Cilindro r={0.0045} h={0.014 * lp} position={[0, -0.007 * lp, 0]} color={piedraMarca > 0.2 ? '#ffd34d' : '#4a4f5b'} />
      </Brota>
      {visible(t, ev.resorte - 0.2) && (
        <Brota t={t} desde={ev.resorte - 0.2} position={[RUEDA[0], py - 0.014 * lp, 0]}>
          <Cilindro r={0.0065} h={0.12} position={[0, -0.065, 0]} color="#e9f4f6" opacity={0.45} contorno={false} />
          {Array.from({length: 14}, (_, i) => (
            <Toro key={i} r={0.0042} tubo={0.0011} rotation={[Math.PI / 2 + 0.25, 0, 0]} position={[0, -0.006 - i * (0.075 / 14) * (1 + (1 - lp) * 0.5), 0]} color="#c9ced8" contorno={false} />
          ))}
        </Brota>
      )}
      {/* perilla del regulador */}
      <Brota t={t} desde={ev.perilla - 0.2} position={[NOZ[0] - 0.012, TH + 0.008, TD / 2 + 0.004]}>
        <group rotation={[Math.PI / 2, perillaGiro, 0]}>
          <Cilindro r={0.012} h={0.006} color={perillaMarca > 0.2 ? '#ffd34d' : '#f2c14e'} />
          {Array.from({length: 10}, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <Caja key={i} w={0.003} h={0.007} d={0.003} position={[Math.cos(a) * 0.012, 0, Math.sin(a) * 0.012]} color="#d99a20" contorno={false} />;
          })}
        </group>
      </Brota>
    </group>
  );
};

/** protector (capuchón con ojitos) */
let _hoyos: THREE.CanvasTexture | null = null;
const texturaHoyos = () => {
  if (_hoyos) return _hoyos;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#c9ced8';
  g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 6; x++) {
      g.beginPath();
      g.arc(24 + x * 42, 60 + y * 60, 13, 0, Math.PI * 2);
      g.fill();
    }
  _hoyos = new THREE.CanvasTexture(cv);
  return _hoyos;
};
const Protector: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  if (!hayProtector(t)) return null;
  const s = t < 0.75 ? 1 : spring({frame: (t - ev.capuchon + 0.2) * fps, fps, config: {damping: 12, stiffness: 150, mass: 0.7}});
  const hoyos = t < 0.75 || t > ev.ojitos - 0.2;
  const tex = texturaHoyos();
  const marca = ventana(t, ev.protector - 0.3, ev.protector + 1.2, 0.2);
  const color = marca > 0.2 ? '#ffe680' : '#d6dbe2';
  const W = TW - 0.012;
  const D = TD + 0.004;
  const H = 0.05;
  const y = TH + 0.016 + H / 2 + (1 - s) * 0.25;
  const lado = (p: V3, rot: V3, w: number) => (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={[w, H]} />
      {hoyos ? <meshToonMaterial color={color} gradientMap={gradiente()} map={tex} transparent alphaTest={0.5} side={THREE.DoubleSide} /> : <meshToonMaterial color={color} gradientMap={gradiente()} side={THREE.DoubleSide} />}
    </mesh>
  );
  return (
    <group position={[-0.008, y, 0]}>
      {lado([0, 0, D / 2], [0, 0, 0], W)}
      {lado([0, 0, -D / 2], [0, 0, 0], W)}
      {lado([-W / 2, 0, 0], [0, Math.PI / 2, 0], D)}
      <AristasCaja w={W} h={H} d={D} position={[0, 0, 0]} g={0.0012} />
    </group>
  );
};

/** flama (capas que parpadean) */
const Flama: React.FC<{t: number}> = ({t}) => {
  const f = flama(t);
  const v = viento(t);
  if (f <= 0.02) return null;
  const prot = hayProtector(t) && t > ev.capuchon + 0.5;
  const ladeo = v * (prot ? 0.15 : 0.7) * (0.8 + 0.2 * Math.sin(t * 13));
  const h = 0.05 * f;
  const capa = (esc: number, color: string, o: number, dy = 0) => (
    <mesh position={[0, h * esc * 0.5 + dy, 0]} scale={[0.012 * esc * (1 + 0.1 * Math.sin(t * 17)), h * esc * (1 + 0.06 * Math.sin(t * 23)), 0.012 * esc]}>
      <sphereGeometry args={[1, 20, 16]} />
      <meshBasicMaterial color={color} transparent opacity={o} depthWrite={false} />
    </mesh>
  );
  return (
    <group position={[NOZ[0], TH + 0.03, 0]} rotation={[0, 0, -ladeo]}>
      <pointLight color="#ffb04d" intensity={0.6 * f} distance={0.6} />
      {capa(1.35, '#ff6a1f', 0.55)}
      {capa(1.0, '#ffb020', 0.85)}
      {capa(0.6, '#fff1a8', 0.95)}
      <mesh position={[0, 0.003, 0]} scale={[0.008, 0.008, 0.008]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color="#3f8cff" transparent opacity={0.85} />
      </mesh>
    </group>
  );
};

/** gas saliendo (nubecitas moradas transparentes) */
const Gas: React.FC<{t: number}> = ({t}) => {
  const g = gasSale(t) * (flama(t) > 0.1 ? 0 : 1);
  if (g <= 0.02) return null;
  return (
    <group position={[NOZ[0], TH + 0.03, 0]}>
      {Array.from({length: 10}, (_, i) => {
        const u = (t * 0.9 + i / 10) % 1;
        const dx = Math.sin(t * 2 + i * 1.7) * 0.02 * u;
        return (
          <mesh key={i} position={[dx, u * 0.12, (rnd(i) - 0.5) * 0.03 * u]}>
            <sphereGeometry args={[0.006 + u * 0.018, 14, 10]} />
            <meshToonMaterial color="#c9b6ff" gradientMap={gradiente()} transparent opacity={g * Math.sin(u * Math.PI) * 0.45} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** chispas de la piedra */
const Chispas: React.FC<{t: number}> = ({t}) => {
  const on = raspando(t) * (t > ev.si2 ? 0 : 1);
  if (on <= 0.02) return null;
  const abajo = piedraAbajo(t);
  const contacto: V3 = [RUEDA[0] + (1 - abajo) * 0.02, RUEDA[1] - RR * (abajo > 0.5 ? 1 : 0.4), 0];
  return (
    <group>
      {Array.from({length: 18}, (_, i) => {
        const u = (t * 3 + rnd(i)) % 1;
        // sin dirigir: para todos lados; dirigidas: hacia la boca del gas
        const ang = rnd(i + Math.floor(t * 3 + rnd(i)) * 31) * Math.PI * 2;
        const libre: V3 = [Math.cos(ang) * 0.09, Math.abs(Math.sin(ang)) * 0.07 + 0.01, (rnd(i + 3) - 0.5) * 0.08];
        const dirigida: V3 = [NOZ[0] - contacto[0] + (rnd(i + 5) - 0.5) * 0.01, TH + 0.04 - contacto[1] + (rnd(i + 2) - 0.5) * 0.02, (rnd(i + 7) - 0.5) * 0.01];
        const d = abajo > 0.5 ? dirigida : libre;
        const p: V3 = [contacto[0] + d[0] * u, contacto[1] + d[1] * u - (abajo > 0.5 ? 0 : 0.05 * u * u), contacto[2] + d[2] * u];
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.0018 + (1 - u) * 0.0015, 8, 6]} />
            <meshBasicMaterial color={u < 0.4 ? '#fffbe0' : '#ff7a1f'} transparent opacity={on * (1 - u * 0.5)} />
          </mesh>
        );
      })}
    </group>
  );
};

/** pulgar (gira la rueda y aprieta la palanca) */
const Pulgar: React.FC<{t: number}> = ({t}) => {
  if (t < 0.75) return null;
  const on = Math.max(ventana(t, ev.girarla - 0.6, ev.piedra2, 0.4), ventana(t, ev.pero3 - 0.4, ev.asi3 + 0.2, 0.4), ventana(t, ev.saltan - 1.6, ev.quema + 0.6, 0.3), ventana(t, ev.protege - 1.5, ev.transparente - 0.6, 0.3), ventana(t, ev.si2 + 0.2, 99, 0.4));
  if (on <= 0.01) return null;
  const gira = raspando(t) > 0.3 || entre(t, ev.si2 + 0.6, ev.acabo + 0.4);
  const ciclo = gira ? ((t * 2.5) % 1) : 0;
  const quita = quitaDedo(t);
  const sep = (1 - on) * 0.2 + quita * 0.06;
  // posición: sobre la rueda bajando hacia la palanca
  const x = RUEDA[0] + 0.02 - ciclo * 0.035 + sep * 0.8;
  const y = RUEDA[1] + RR + 0.012 - ciclo * 0.008 + sep * 0.5;
  return (
    <group position={[x, y, 0.004 + sep * 0.3]} rotation={[0, 0, 0.35]}>
      <Redondeada w={0.065} h={0.03} d={0.034} radio={0.014} position={[0.025, 0, 0]} color={quita > 0.3 ? '#ff9a85' : '#f0c09a'} />
      <Redondeada w={0.02} h={0.006} d={0.022} radio={0.003} position={[0.005, 0.015, 0]} color="#fbe2d2" contorno={false} />
      <Redondeada w={0.09} h={0.05} d={0.05} radio={0.02} position={[0.085, -0.018, 0]} rotation={[0, 0, -0.2]} color="#f0c09a" />
      <Cilindro r={0.032} h={0.12} position={[0.17, -0.04, 0]} rotation={[0, 0, Math.PI / 2 - 0.3]} color="#f0c09a" />
      <Cilindro r={0.045} h={0.3} position={[0.36, -0.1, 0]} rotation={[0, 0, Math.PI / 2 - 0.3]} color="#5b84c9" />
    </group>
  );
};

/** líneas de viento */
const Viento: React.FC<{t: number}> = ({t}) => {
  const v = viento(t);
  if (v <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 7}, (_, i) => {
        const u = (t * 0.9 + i / 7) % 1;
        const y = TH + 0.02 + (i % 4) * 0.025;
        return (
          <mesh key={i} position={[-0.28 + u * 0.5, y, (rnd(i) - 0.5) * 0.06]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.0025, 0.06, 4, 8]} />
            <meshBasicMaterial color="#e8f6ff" transparent opacity={v * Math.sin(u * Math.PI) * 0.9} />
          </mesh>
        );
      })}
      {/* aire que entra por los ojitos */}
      {t > ev.aire - 0.5 &&
        hayProtector(t) &&
        Array.from({length: 4}, (_, i) => {
          const u = (t * 1.2 + i / 4) % 1;
          return (
            <mesh key={`a${i}`} position={[-0.03 + (i - 1.5) * 0.015, TH + 0.035, TD / 2 + 0.03 - u * 0.03]}>
              <sphereGeometry args={[0.003, 8, 6]} />
              <meshBasicMaterial color="#7fc6ff" transparent opacity={v * (1 - u)} />
            </mesh>
          );
        })}
    </group>
  );
};

/** nube del tronido */
const Tronido: React.FC<{t: number}> = ({t}) => {
  const k = cl((t - ev.tronar + 0.05) / 0.9);
  if (t < ev.tronar - 0.05 || k >= 1) return null;
  return (
    <group position={[0, 0.15, 0]}>
      {Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const d = 0.04 + k * 0.18;
        return (
          <mesh key={i} position={[Math.cos(a) * d, Math.sin(a) * d * 0.7, 0.03]}>
            <sphereGeometry args={[0.03 + k * 0.03, 14, 10]} />
            <meshToonMaterial color={i % 2 ? '#ffd34d' : '#ffffff'} gradientMap={gradiente()} transparent opacity={(1 - k) * 0.85} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const sol = calorSol(t);
  const tiembla = hinchado(t) * 0.002 * Math.sin(t * 50);
  return (
    <>
      <Camara t={t} />
      <hemisphereLight args={[sol > 0.3 ? '#ffe0b0' : '#dfe8ff', '#7a6a5a', 0.85]} />
      <ambientLight intensity={0.35 + sol * 0.2} />
      <directionalLight
        position={[1.2, 2.4, 2.2]}
        intensity={1.5 + sol * 0.6}
        color={sol > 0.3 ? '#ffd9a0' : '#ffffff'}
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
      <Patio t={t} />
      <SombraContacto position={[0, 0.001, 0]} w={0.18} d={0.1} o={0.35} />
      <group position={[tiembla, 0, 0]}>
        <Pieza t={t} desde={ev.tanquecito - 0.2} dir={[0.5, 0.3, 1]} caida={0.3}>
          <Tanque t={t} />
        </Pieza>
        <Pieza t={t} desde={ev.tanquecito} dir={[-0.4, 1, 0.3]} caida={0.2}>
          <Cabeza t={t} />
        </Pieza>
        <Protector t={t} />
        <Flama t={t} />
        <Gas t={t} />
        <Chispas t={t} />
      </group>
      <Pulgar t={t} />
      <Viento t={t} />
      <Tronido t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.gas1 - 0.1, 'gas', false],
  [ev.tanquecito - 0.1, 'tanquecito de plástico', false],
  [ev.ojito1 - 0.2, 'un ojito arriba', false],
  [ev.encendedor1 - 0.3, 'ya tienes un encendedor', false],
  [ev.escapa - 0.5, 'se escapa todo el tiempo', true],
  [ev.valvula - 0.3, 'una válvula', false],
  [ev.boton - 0.3, 'un botón', false],
  [ev.palanca - 0.5, 'la palanca de gas', false],
  [ev.prende - 1.2, 'sale… pero no se prende', true],
  [ev.piedrita - 0.2, 'una piedrita dura', false],
  [ev.rueda1 - 0.2, 'rueda de metal rasposa', false],
  [ev.raspas - 0.2, 'raspas pedacitos', false],
  [ev.vivo - 0.6, '¡al rojo vivo!', false],
  [ev.piedra2 - 0.4, 'la piedra', false],
  [ev.lados - 0.8, 'chispas para todos lados', true],
  [ev.abajo - 0.4, 'abajo de la rueda', false],
  [ev.resorte - 0.2, 'un resorte', false],
  [ev.saltan - 0.3, 'directo al gas', false],
  [ev.alta - 0.4, 'flama muy alta', true],
  [ev.quema - 0.1, '¡te quema el dedo!', true],
  [ev.perilla - 0.3, 'una perilla', false],
  [ev.mas - 0.2, 'más o menos gas', false],
  [ev.regulador - 0.4, 'el regulador de flama', false],
  [ev.viento1 - 0.2, 'el viento la apaga', true],
  [ev.capuchon - 0.3, 'capuchón de metal', false],
  [ev.ojitos - 0.2, 'con ojitos', false],
  [ev.aire - 0.8, 'deja entrar aire', false],
  [ev.protector - 0.4, 'el protector', false],
  [ev.transparente - 0.6, '¿por qué transparente?', false],
  [ev.liquido1 - 0.3, 'adentro: líquido', false],
  [ev.vuelve - 0.4, 'al salir: gas', false],
  [ev.dejes - 0.3, 'no lo dejes al sol', true],
  [ev.expande - 0.3, 'el líquido se expande', true],
  [ev.tronar - 0.4, '¡puede tronar!', true],
  [ev.chispa - 0.5, '¿no echa chispa?', true],
  [T('gas', 10) - 0.6, 'no es el gas…', false],
  [ev.acabo - 0.2, 'se acabó la piedra', true],
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
  if (t < ev.gas1 + 0.4) return null;
  const g = nivelGas(t) / 0.75;
  const presion = 0.45 + 0.5 * hinchado(t) + 0.1 * calorSol(t);
  const alta = presion > 0.8;
  return (
    <>
      <Termometro x={950} valor={g} color="#9b8cff" arriba="" nombre="gas" />
      {calorSol(t) > 0.05 && <Termometro x={830} valor={presion} color={alta ? '#e5333b' : '#ff9f43'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="presión" />}
    </>
  );
};

/** sol de mediodía (cuando hablamos del carro) */
const Sol: React.FC<{t: number}> = ({t}) => {
  const o = calorSol(t);
  if (o <= 0.01) return null;
  return (
    <div style={{position: 'absolute', right: 70, top: 420, width: 220, height: 220, opacity: o}}>
      <div style={{position: 'absolute', inset: 30, borderRadius: 90, background: '#ffd34d', border: '8px solid #15161c', boxShadow: '0 0 60px #ffcf3d'}} />
      {Array.from({length: 10}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 104, top: 0, width: 12, height: 34, borderRadius: 6, background: '#ffb020', border: '4px solid #15161c', transformOrigin: '6px 110px', transform: `rotate(${i * 36 + t * 20}deg)`}} />
      ))}
    </div>
  );
};

const Destello: React.FC<{t: number}> = ({t}) => {
  const o = truena(t) * (1 - r(t, ev.tronar + 0.1, 0.4));
  if (o <= 0.01) return null;
  return <AbsoluteFill style={{background: '#ffffff', opacity: o * 0.7}} />;
};

export const Encendedor: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#2c4a78'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(20,25,45,0.25) 100%)'}} />
      <Sol t={t} />
      <Destello t={t} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Audio src={staticFile('encendedor/voz.wav')} />
      <Audio src={staticFile('encendedor/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_ENCENDEDOR = (datos as any).duration as number;
