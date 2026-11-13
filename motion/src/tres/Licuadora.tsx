import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/licuadora.json';
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
const tramo = (t: number, a: number, b: number) => cl((t - a) / (b - a)) * (b - a);
type V3 = [number, number, number];

const ev = {
  motor1: T('motor', 1),
  cuchillas1: T('cuchillas', 1),
  licuadora1: T('licuadora', 1),
  pero1: T('pero', 1),
  remolino: T('remolino'),
  asi1: T('así', 1),
  doblas: T('doblas'),
  arriba2: T('arriba', 2),
  abajo2: T('abajo', 2),
  alturas: T('alturas'),
  cuchillas3: T('cuchillas', 3),
  pero2: T('pero', 2),
  sale: T('sale'),
  eje1: T('eje', 1),
  anillo: T('anillo'),
  empaque: T('empaque'),
  pero3: T('pero', 3),
  arranca: T('arranca'),
  salpica: T('salpica'),
  asi3: T('así', 3),
  velocidades: T('velocidades'),
  pulso: T('pulso'),
  aprietas: T('aprietas'),
  pero4: T('pero', 4),
  corta: T('corta'),
  asi4: T('así', 4),
  costillas: T('costillas'),
  frenan: T('frenan'),
  regresan: T('regresan'),
  pero5: T('pero', 5),
  calienta1: T('calienta', 1),
  asi5: T('así', 5),
  ventilador: T('ventilador'),
  rejillas: T('rejillas'),
  respire: T('respire'),
  pero6: T('pero', 6),
  duro: T('duro'),
  atora1: T('atora', 1),
  empujando: T('empujando'),
  quema: T('quema'),
  asi6: T('así', 6),
  pieza1: T('pieza', 1),
  debil: T('débil'),
  atora2: T('atora', 2),
  barre: T('barre'),
  salva: T('salva'),
  acoplador1: T('acoplador', 1),
  rompe: T('rompe'),
  barato: T('barato'),
  motor6: T('motor', 6),
  suena: T('suena'),
  giran: T('giran'),
  descompuesta: T('descompuesta'),
  acoplador2: T('acoplador', 2),
};

// ---------- geometría ----------
const BASE_H = 0.17;
const JAR_Y = 0.185;
const JAR_H = 0.36;
const ASPAS_Y = JAR_Y + 0.035;
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;
const PERFIL_VASO: [number, number][] = [
  [0, JAR_Y],
  [0.075, JAR_Y],
  [0.08, JAR_Y + 0.02],
  [0.1, JAR_Y + JAR_H],
  [0.108, JAR_Y + JAR_H + 0.006],
  [0.102, JAR_Y + JAR_H + 0.006],
  [0.094, JAR_Y + JAR_H],
  [0.074, JAR_Y + 0.024],
  [0, JAR_Y + 0.024],
];

// ---------- estados ----------
/** velocidad de las cuchillas (vueltas/s relativas) */
const velocidad = (t: number) => {
  if (t < 0.75) return 1;
  let v = r(t, ev.licuadora1 - 0.5, 0.6);
  v *= 1 - ventana(t, ev.pero2 - 0.2, ev.pero3, 0.3) * 0.7;
  if (entre(t, ev.arranca - 0.2, ev.asi3)) v = 2.2 * r(t, ev.arranca - 0.2, 0.05);
  if (entre(t, ev.asi3, ev.pero4)) v = 0.3 + 0.9 * r(t, ev.velocidades - 0.2, 1.4) * (t > ev.pulso - 0.2 && t < ev.aprietas + 0.6 ? 0.5 + 0.5 * Math.sign(Math.sin(t * 6)) : 1);
  if (t > ev.atora1 - 0.1 && t < ev.salva + 0.4) v = 0; // atorada
  if (t > ev.salva + 0.4 && t < ev.suena - 0.3) v = r(t, ev.salva + 0.4, 1) * 0.6;
  if (t > ev.suena - 0.3) v = 0; // acoplador barrido
  return v;
};
/** giro del motor (sigue aunque se atore) */
const velMotor = (t: number) => {
  if (t > ev.atora1 - 0.1 && t < ev.pieza1 - 0.4) return 0.6;
  if (t > ev.atora2 - 0.2 && t < ev.salva + 0.4) return 1.4;
  if (t > ev.suena - 0.3) return 1.2;
  return velocidad(t);
};
const anguloCuchillas = (t: number) => {
  // integra la velocidad por tramos (aprox.)
  const pasos = 80;
  let a = 0;
  const dt = t / pasos;
  for (let i = 0; i < pasos; i++) a += velocidad(i * dt) * dt;
  return a * 14;
};
const anguloMotor = (t: number) => {
  const pasos = 80;
  let a = 0;
  const dt = t / pasos;
  for (let i = 0; i < pasos; i++) a += velMotor(i * dt) * dt;
  return a * 14;
};
const aspasDobladas = (t: number) => (t < 0.75 ? 1 : r(t, ev.doblas - 0.1, 0.8));
const hayEmpaque = (t: number) => visible(t, ev.anillo - 0.2);
const hayCostillas = (t: number) => visible(t, ev.costillas - 0.2);
const xray = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.pero5 - 0.2, ev.pero6 + 0.6, 0.4), ventana(t, ev.atora1, ev.rompe, 0.4), ventana(t, ev.suena - 0.6, 99, 0.4)));
const calorMotor = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.calienta1 - 0.6, ev.respire, 0.6), r(t, ev.empujando - 0.5, 2) * (1 - r(t, ev.asi6, 0.6))));
const molido = (t: number) => (t < 0.75 ? 1 : r(t, ev.doblas + 0.6, 2.5) * 0.4 + r(t, ev.frenan, 2.5) * 0.6);
const acopladorRoto = (t: number) => (t < 0.75 ? 0 : t > ev.barre && t < ev.acoplador2 - 0.4 ? 1 : 0);

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 2.3, 0.5, 0.3, [0, 0.3, 0]],
  [1.0, 1.6, 0.4, 0.18, [0, 0.3, 0]],
  [4.6, 0.85, 0.4, 0.55, [0, 0.33, 0]],
  [9.2, 0.62, 0.45, 0.35, [0, 0.25, 0]],
  [17.0, 0.6, 0.5, 0.05, [0, 0.17, 0.03]],
  [24.8, 1.6, 0.3, 0.2, [0, 0.38, 0]],
  [29.0, 0.62, 0.15, 0.12, [0, 0.1, 0.1]],
  [34.6, 0.8, 0.45, 0.55, [0, 0.33, 0]],
  [38.2, 0.75, 0.6, 0.45, [0, 0.33, 0]],
  [45.0, 0.8, 0.5, 0.15, [0, 0.1, 0]],
  [52.4, 1.05, 0.4, 0.25, [0, 0.26, 0]],
  [59.4, 0.6, 0.6, 0.15, [0, 0.17, 0]],
  [70.3, 1.5, 0.4, 0.2, [0, 0.3, 0]],
  [74.4, 0.75, 0.5, 0.15, [0, 0.18, 0]],
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
  const s = Math.max(ventana(t, ev.salpica - 0.1, ev.salpica + 0.6, 0.05), ventana(t, ev.barre - 0.1, ev.barre + 0.5, 0.05));
  pos[0] += Math.sin(t * 71) * 0.012 * s;
  pos[1] += Math.cos(t * 63) * 0.012 * s;
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

// ---------- cocina ----------
const Cocina: React.FC<{t: number}> = ({t}) => {
  const azulejo = useMemo(() => {
    const tx = texturaAzulejo('#f4fbf8', '#c9dcd4');
    tx.repeat.set(6, 2);
    return tx;
  }, []);
  const manchas = t < 0.75 ? 0 : r(t, ev.salpica, 0.3) * (1 - r(t, ev.asi3 + 1.5, 0.5));
  return (
    <group>
      <mesh position={[0, 1.3, -0.4]} receiveShadow>
        <planeGeometry args={[7, 3]} />
        <meshToonMaterial color="#ffd0c2" gradientMap={gradiente()} />
      </mesh>
      <mesh position={[0, 0.35, -0.399]} receiveShadow>
        <planeGeometry args={[7, 0.7]} />
        <meshToonMaterial map={azulejo} gradientMap={gradiente()} />
      </mesh>
      {manchas > 0.01 &&
        Array.from({length: 14}, (_, i) => (
          <mesh key={i} position={[-0.3 + rnd(i) * 0.6, 0.35 + rnd(i + 5) * 0.4, -0.397]}>
            <circleGeometry args={[(0.01 + rnd(i + 9) * 0.02) * manchas, 16]} />
            <meshBasicMaterial color="#ff8fa3" />
          </mesh>
        ))}
      <Redondeada w={4} h={0.05} d={0.7} radio={0.012} position={[0, -0.025, -0.05]} color="#f2efe6" />
      <Caja w={4} h={0.86} d={0.64} position={[0, -0.48, -0.08]} color="#e07a4f" contorno={false} />
      {/* frutas en la barra */}
      <group position={[-0.35, 0, 0.05]}>
        <Cilindro r={0.12} r2={0.09} h={0.04} position={[0, 0.02, 0]} color="#7cb6a8" />
        <Esfera r={0.035} position={[-0.03, 0.065, 0]} color="#e5333b" />
        <Esfera r={0.03} position={[0.035, 0.06, 0.02]} color="#e5333b" />
        <Esfera r={0.025} escala={[2.2, 0.8, 0.8]} position={[0.0, 0.08, -0.03]} rotation={[0, 0.4, 0]} color="#f7d24a" />
      </group>
      <group position={[0.38, 0, -0.1]}>
        <Torno perfil={[[0, 0], [0.04, 0], [0.045, 0.14], [0.04, 0.14], [0.035, 0.006], [0, 0.006]]} color="#e9f4f6" opacity={0.7} contorno={false} />
        <Cilindro r={0.036} h={0.1} position={[0, 0.055, 0]} color="#ff8fa3" contorno={false} />
      </group>
    </group>
  );
};

// ---------- licuadora ----------
const Base: React.FC<{t: number}> = ({t}) => {
  const x = xray(t);
  const o = 1 - x * 0.8;
  const color = '#3fa9f5';
  const vel = velocidad(t);
  const nivel = t < 0.75 ? 3 : entre(t, ev.velocidades - 0.2, ev.pero4) ? Math.min(4, Math.floor(r(t, ev.velocidades - 0.2, 1.4) * 4.99)) : vel > 1.5 ? 4 : vel > 0.1 ? 2 : -1;
  const pulso = ventana(t, ev.pulso - 0.2, ev.aprietas + 0.6, 0.1) * (Math.sin(t * 6) > 0 ? 1 : 0.3);
  const rejillas = visible(t, ev.rejillas - 0.2);
  return (
    <group>
      {/* paredes de la base */}
      <Panel p={[0, 0.006, 0]} s={[0.22, 0.012, 0.22]} color="#2b2d33" />
      <Panel p={[0, BASE_H / 2, -0.105]} s={[0.22, BASE_H, 0.01]} color={color} />
      <Panel p={[-0.105, BASE_H / 2, 0]} s={[0.01, BASE_H, 0.22]} color={color} />
      <Panel p={[0.105, BASE_H / 2, 0]} s={[0.01, BASE_H, 0.22]} color={color} o={o} />
      <Panel p={[0, BASE_H / 2, 0.105]} s={[0.22, BASE_H, 0.01]} color={color} o={o} />
      <Panel p={[0, BASE_H - 0.005, 0]} s={[0.22, 0.01, 0.22]} color="#2f8fdc" o={o} />
      {/* botones */}
      <group position={[0, 0.07, 0.112]}>
        {[0, 1, 2, 3].map((i) => (
          <Redondeada key={i} w={0.03} h={0.022} d={0.012} radio={0.005} position={[-0.06 + i * 0.035, 0, 0]} color={nivel >= i ? '#ffd34d' : '#e8edf2'} opacity={Math.max(o, 0.6)} />
        ))}
        <Redondeada w={0.03} h={0.022} d={0.012} radio={0.005} position={[0.085, 0, 0]} color={pulso > 0.5 ? '#ff6a3d' : '#e5333b'} opacity={Math.max(o, 0.6)} />
      </group>
      {/* rejillas */}
      {rejillas &&
        [-1, 1].map((lado) => (
          <group key={lado} position={[lado * 0.111, 0.045, 0]}>
            {Array.from({length: 5}, (_, i) => (
              <Caja key={i} w={0.003} h={0.006} d={0.12} position={[0, i * 0.012, 0]} color="#15161c" contorno={false} />
            ))}
          </group>
        ))}
      <SombraContacto position={[0, 0.001, 0]} w={0.36} d={0.36} o={0.3} />
    </group>
  );
};

/** motor, ventilador y acoplador de abajo */
const Motor: React.FC<{t: number}> = ({t}) => {
  const x = xray(t);
  const h = calorMotor(t);
  const ang = anguloMotor(t);
  const roto = acopladorRoto(t);
  const marca = ventana(t, ev.pieza1 - 0.3, ev.acoplador1 + 1.2, 0.2) + ventana(t, ev.acoplador2 - 0.4, 99, 0.2);
  const humo = t < 0.75 ? 0 : ventana(t, ev.quema - 0.6, ev.asi6 + 0.4, 0.3);
  return (
    <group>
      {x > 0.05 && (
        <>
          <Cilindro r={0.05} h={0.08} position={[0, 0.08, 0]} color={h > 0.3 ? '#ff6a3d' : '#d9823b'} />
          {Array.from({length: 6}, (_, i) => (
            <Toro key={i} r={0.051} tubo={0.004} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.048 + i * 0.013, 0]} color={h > 0.3 ? '#ff4a1f' : '#b8642b'} contorno={false} />
          ))}
          <Cilindro r={0.006} h={0.06} position={[0, 0.14, 0]} color="#c9ced8" />
          {/* ventilador */}
          <group position={[0, 0.03, 0]} rotation={[0, ang, 0]}>
            {visible(t, ev.ventilador - 0.2) &&
              [0, 1, 2, 3, 4].map((i) => (
                <group key={i} rotation={[0, (i * Math.PI * 2) / 5, 0]}>
                  <Redondeada w={0.04} h={0.004} d={0.018} radio={0.002} position={[0.03, 0, 0]} rotation={[0.5, 0, 0]} color="#7fc6ff" />
                </group>
              ))}
          </group>
        </>
      )}
      {/* acoplador de la base (gira con el motor) */}
      <group position={[0, BASE_H + 0.006, 0]} rotation={[0, ang, 0]}>
        <Cilindro r={0.018} h={0.012} color={marca > 0.2 ? '#ffd34d' : '#2b2d33'} />
        {Array.from({length: 6}, (_, i) => {
          if (roto && i % 2 === 0) return null;
          const a = (i / 6) * Math.PI * 2;
          return <Caja key={i} w={0.012} h={0.012} d={0.006} position={[Math.cos(a) * 0.022, 0, Math.sin(a) * 0.022]} rotation={[0, -a, 0]} color={roto ? '#e5333b' : marca > 0.2 ? '#ffd34d' : '#2b2d33'} />;
        })}
      </group>
      {/* humo */}
      {humo > 0.02 &&
        Array.from({length: 7}, (_, i) => {
          const u = (t * 0.5 + i / 7) % 1;
          return (
            <mesh key={i} position={[0.08 + Math.sin(t + i) * 0.02, 0.06 + u * 0.35, 0.06]}>
              <sphereGeometry args={[0.015 + u * 0.03, 12, 8]} />
              <meshToonMaterial color="#6f7480" gradientMap={gradiente()} transparent opacity={humo * Math.sin(u * Math.PI) * 0.6} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/** aire del ventilador saliendo por las rejillas */
const Aire: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.rejillas, ev.pero6, 0.4);
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: 10}, (_, i) => {
        const u = (t * 1.3 + i / 10) % 1;
        const lado = i % 2 ? 1 : -1;
        return (
          <mesh key={i} position={[lado * (0.11 + u * 0.15), 0.05 + (rnd(i) - 0.5) * 0.04, (rnd(i + 3) - 0.5) * 0.1]} scale={[3, 1, 1]}>
            <sphereGeometry args={[0.004, 8, 6]} />
            <meshBasicMaterial color="#7fc6ff" transparent opacity={on * (1 - u)} />
          </mesh>
        );
      })}
    </group>
  );
};

/** vaso, costillas, cuchillas, empaque y comida */
const Vaso: React.FC<{t: number}> = ({t}) => {
  const ang = anguloCuchillas(t);
  const dob = aspasDobladas(t);
  const cost = hayCostillas(t) ? (t < 0.75 ? 1 : r(t, ev.costillas - 0.2, 0.5)) : 0;
  const marcaCuch = ventana(t, ev.cuchillas3 - 0.4, ev.cuchillas3 + 1.2, 0.2);
  const marcaCost = ventana(t, ev.costillas - 0.2, ev.regresan + 0.6, 0.2);
  const roto = acopladorRoto(t);
  return (
    <group>
      {/* acoplador del vaso */}
      <group position={[0, JAR_Y - 0.004, 0]} rotation={[0, ang, 0]}>
        <Cilindro r={0.016} h={0.008} color={roto ? '#9aa4b0' : '#c9ced8'} />
      </group>
      {/* vaso transparente */}
      <Torno perfil={PERFIL_VASO} color="#cfeeff" opacity={0.36} contorno={false} sombra={false} doble />
      <mesh position={[0, JAR_Y + JAR_H + 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.104, 0.003, 8, 64]} />
        <meshBasicMaterial color="#15161c" />
      </mesh>
      <mesh position={[0, JAR_Y + 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.003, 8, 64]} />
        <meshBasicMaterial color="#15161c" />
      </mesh>
      {/* asa */}
      <Redondeada w={0.025} h={0.22} d={0.03} radio={0.01} position={[0.14, JAR_Y + 0.2, 0]} color="#dff4ff" opacity={0.6} />
      <Redondeada w={0.05} h={0.02} d={0.03} radio={0.008} position={[0.12, JAR_Y + 0.31, 0]} color="#dff4ff" opacity={0.6} />
      <Redondeada w={0.05} h={0.02} d={0.03} radio={0.008} position={[0.12, JAR_Y + 0.09, 0]} color="#dff4ff" opacity={0.6} />
      {/* costillas */}
      {cost > 0.01 &&
        [0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <group key={i} rotation={[0, -a, 0]}>
              <mesh position={[0.082, JAR_Y + 0.17, 0]} rotation={[0, 0, 0.055]} scale={[1, cost, 1]}>
                <boxGeometry args={[0.02, 0.29, 0.012]} />
                <meshToonMaterial color={marcaCost > 0.2 ? '#ffe680' : '#c9e8f7'} gradientMap={gradiente()} transparent opacity={0.75} />
              </mesh>
            </group>
          );
        })}
      {/* eje y empaque */}
      <Cilindro r={0.005} h={0.03} position={[0, JAR_Y + 0.012, 0]} color="#c9ced8" />
      {hayEmpaque(t) && (
        <Brota t={t} desde={ev.anillo - 0.2} position={[0, JAR_Y + 0.026, 0]}>
          <Toro r={0.011} tubo={0.004} rotation={[Math.PI / 2, 0, 0]} color={ventana(t, ev.empaque - 0.4, ev.empaque + 1.2, 0.2) > 0.2 ? '#ffd34d' : '#e8743b'} />
        </Brota>
      )}
      {/* cuchillas */}
      <Pieza t={t} desde={ev.cuchillas1 - 0.2} dir={[0, 1, 0.3]} caida={0.3}>
        <group position={[0, ASPAS_Y, 0]} rotation={[0, ang, 0]}>
          <Cilindro r={0.012} h={0.012} color="#9aa4b0" />
          {[0, 1, 2, 3].map((i) => {
            const arriba = i % 2 === 0;
            const incl = dob * (arriba ? 0.6 : -0.5);
            return (
              <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
                <group position={[0.01, 0, 0]} rotation={[0, 0, incl]}>
                  <Redondeada w={0.055} h={0.004} d={0.016} radio={0.002} position={[0.027, 0, 0]} rotation={[0.25, 0, 0]} color={marcaCuch > 0.2 ? '#ffd34d' : '#e8edf2'} />
                </group>
              </group>
            );
          })}
        </group>
      </Pieza>
    </group>
  );
};

/** licuado: líquido y pedazos de fruta */
const PEDAZOS = Array.from({length: 12}, (_, i) => ({a: rnd(i) * Math.PI * 2, rr: 0.025 + rnd(i + 3) * 0.045, y: 0.03 + rnd(i + 7) * 0.12, tipo: i % 3}));
const Licuado: React.FC<{t: number}> = ({t}) => {
  const lleno = t < 0.75 ? 1 : r(t, ev.licuadora1 - 0.2, 0.8);
  if (lleno <= 0.01) return null;
  const m = molido(t);
  const vel = velocidad(t);
  const remolino = t < 0.75 ? 0.3 : Math.max(ventana(t, ev.pero1, ev.asi1 + 0.4, 0.4), ventana(t, ev.pero4, ev.costillas, 0.4));
  const fuga = t < 0.75 ? 0 : ventana(t, ev.sale - 0.4, ev.anillo + 0.3, 0.3);
  const nivel = 0.17 * lleno - fuga * 0.02 - ventana(t, ev.salpica, ev.velocidades, 0.3) * 0.03;
  const hundido = remolino * 0.05 + vel * 0.012;
  const color = new THREE.Color('#fff0d6').lerp(new THREE.Color('#ff7f9a'), m).getStyle();
  const perfil: [number, number][] = [
    [0, JAR_Y + 0.025],
    [0.073, JAR_Y + 0.025],
    [0.073 + nivel * 0.06, JAR_Y + 0.025 + nivel],
    [0.04, JAR_Y + 0.025 + nivel - hundido * 0.4],
    [0, JAR_Y + 0.025 + nivel - hundido],
  ];
  const giroComida = anguloCuchillas(t) * (remolino > 0.3 ? 0.9 : 0.08);
  return (
    <group>
      <Torno perfil={perfil} color={color} opacity={0.86} contorno={false} sombra={false} />
      {/* pedazos de fruta */}
      {PEDAZOS.map((p, i) => {
        const esc = 1 - m * 0.75;
        const a = p.a + giroComida * (1 - p.rr * 4);
        const brinco = hayCostillas(t) && t > ev.frenan - 0.3 && t < ev.pero5 ? Math.abs(Math.sin(t * 5 + i)) * 0.04 : 0;
        const pos: V3 = [Math.cos(a) * p.rr, JAR_Y + 0.025 + p.y * Math.max(0.3, nivel / 0.17) + brinco, Math.sin(a) * p.rr];
        const c = ['#e5333b', '#f7d24a', '#7a3fa8'][p.tipo];
        return <Esfera key={i} r={(p.tipo === 1 ? 0.016 : 0.014) * esc} escala={p.tipo === 1 ? [1.6, 0.8, 0.8] : [1, 1, 1]} position={pos} color={c} />;
      })}
      {/* lo duro (un hielo enorme / hueso de mango) */}
      {t > 0.75 && entre(t, ev.duro - 0.6, ev.salva + 0.3) && (
        <group position={[0.0, ASPAS_Y + 0.03 + (1 - r(t, ev.duro - 0.6, 0.5)) * 0.35, 0.0]} rotation={[0.3, 0.5, 0.2]}>
          <Redondeada w={0.07} h={0.05} d={0.06} radio={0.01} color="#d6f0ff" opacity={0.9} />
        </group>
      )}
      {/* goteo por el eje */}
      {fuga > 0.02 &&
        Array.from({length: 4}, (_, i) => {
          const u = (t * 0.8 + i / 4) % 1;
          return <Esfera key={i} r={0.006} escala={[1, 1.4, 1]} position={[0.02, JAR_Y - 0.01 - u * 0.17, 0.112]} color={color} contorno={false} />;
        })}
      {fuga > 0.02 && (
        <mesh position={[0.02, 0.001, 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.04 * fuga, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};

/** salpicadero al arrancar de golpe */
const Salpica: React.FC<{t: number}> = ({t}) => {
  const k = cl((t - ev.salpica + 0.3) / 1.2);
  if (t < ev.salpica - 0.3 || k >= 1) return null;
  return (
    <group>
      {Array.from({length: 22}, (_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const v = 0.25 + rnd(i + 4) * 0.3;
        return <Esfera key={i} r={0.01} position={[Math.cos(a) * v * k, JAR_Y + JAR_H + v * k - 0.6 * k * k, Math.sin(a) * v * k * 0.6]} color="#ff9fb2" contorno={false} />;
      })}
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
    <Cocina t={t} />
    <Pieza t={t} desde={ev.motor1 - 0.2} dir={[0.4, 0.2, 1]} caida={0.25}>
      <Base t={t} />
      <Motor t={t} />
    </Pieza>
    <Pieza t={t} desde={ev.cuchillas1 - 0.3} dir={[-0.3, 1, 0.4]} caida={0.35}>
      <Vaso t={t} />
      <Licuado t={t} />
    </Pieza>
    <Aire t={t} />
    <Salpica t={t} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.motor1 - 0.2, 'un motor abajo', false],
  [ev.cuchillas1 - 0.2, 'cuchillas arriba', false],
  [ev.licuadora1 - 0.4, 'ya tienes una licuadora', false],
  [ev.remolino - 1.2, 'solo hacen remolino', true],
  [ev.doblas - 0.2, 'aspas arriba y abajo', false],
  [ev.alturas - 0.6, 'cortan a diferentes alturas', false],
  [ev.cuchillas3 - 0.4, 'las cuchillas', false],
  [ev.sale - 0.4, 'se sale por el eje', true],
  [ev.anillo - 0.3, 'un anillo de hule', false],
  [ev.empaque - 0.4, 'el empaque', false],
  [ev.arranca - 0.3, 'de golpe…', true],
  [ev.salpica - 0.2, '¡salpica todo!', true],
  [ev.velocidades - 0.4, 'varias velocidades', false],
  [ev.pulso - 0.3, 'botón de pulso', false],
  [ev.corta - 1.2, 'gira junto y no se corta', true],
  [ev.costillas - 0.6, 'costillas por dentro', false],
  [ev.frenan - 0.2, 'frenan la comida', false],
  [ev.calienta1 - 0.6, '¡el motor se calienta!', true],
  [ev.ventilador - 0.2, 'un ventilador', false],
  [ev.rejillas - 0.2, 'rejillas para que respire', false],
  [ev.duro - 0.6, 'algo muy duro', true],
  [ev.atora1 - 0.2, 'se atora', true],
  [ev.quema - 0.6, '¡el motor se quema!', true],
  [ev.pieza1 - 0.4, 'una pieza más débil', false],
  [ev.barre - 0.4, 'se barre primero', false],
  [ev.salva - 0.3, 'el motor se salva', false],
  [ev.acoplador1 - 0.5, 'el acoplador', false],
  [ev.rompe - 0.5, 'por eso se rompe', false],
  [ev.suena - 0.3, 'suena pero no gira', true],
  [ev.descompuesta - 0.3, 'no está descompuesta', false],
  [ev.acoplador2 - 0.8, 'cambia el acoplador', false],
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
  if (t < ev.licuadora1) return null;
  const v = velocidad(t) / 2.3;
  const h = 0.2 + calorMotor(t) * 0.75;
  return (
    <>
      <Termometro x={950} valor={v} color={v > 0.8 ? '#e5333b' : '#3fa9f5'} arriba={v > 0.8 ? '¡!' : ''} colorArriba="#e5333b" nombre="velocidad" />
      {t > ev.pero5 - 0.4 && <Termometro x={830} valor={h} color={h > 0.7 ? '#e5333b' : '#ff9f43'} arriba={h > 0.7 ? '¡!' : ''} colorArriba="#e5333b" nombre="motor" />}
    </>
  );
};
/** precios: acoplador vs motor */
const Precios: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.barato - 0.5;
  const b = ev.suena - 0.2;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fila = (txt: string, precio: string, color: string) => (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 640, fontFamily: FUENTE, fontWeight: 900}}>
      <div style={{fontSize: 44, color: '#15161c'}}>{txt}</div>
      <div style={{fontSize: 56, color}}>{precio}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 120, right: 120, top: 1150, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', padding: '30px 0', borderRadius: 34, background: 'rgba(255,255,255,0.9)', border: '6px solid #15161c', opacity: o, transform: `scale(${0.85 + 0.15 * s})`}}>
      {fila('acoplador', '$', '#4fae6a')}
      {fila('motor nuevo', '$$$$', '#e5333b')}
    </div>
  );
};

export const LicuadoraVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#ffd0c2'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(60,35,30,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Precios t={t} />
      <Audio src={staticFile('licuadora/voz.wav')} />
      <Audio src={staticFile('licuadora/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_LICUADORA = (datos as any).duration as number;
void tramo;
