import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/regulador_gas.json';
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
  manguera1: T('manguera', 1),
  tanque1: T('tanque', 1),
  estufa2: T('estufa', 2),
  pero1: T('pero', 1),
  presion1: T('presión', 1),
  soplete: T('soplete'),
  asi1: T('así', 1),
  cajita: T('cajita'),
  tapa1: T('tapa', 1),
  infla: T('infla'),
  cierra1: T('cierra', 1),
  diafragma1: T('diafragma', 1),
  pero2: T('pero', 2),
  nada: T('nada'),
  asi2: T('así', 2),
  resorte1: T('resorte', 1),
  empuja: T('empuja'),
  abajo1: T('abajo', 1),
  equilibrio: T('equilibrio'),
  sale1: T('sale', 1),
  igual: T('igual'),
  regulador1: T('regulador', 1),
  pero3: T('pero', 3),
  aire1: T('aire', 1),
  asi3: T('así', 3),
  ojito1: T('ojito', 1),
  respiradero1: T('respiradero', 1),
  tapas: T('tapas'),
  atrapado: T('atrapado'),
  traba: T('traba'),
  sube: T('sube'),
  apaga: T('apaga'),
  pero4: T('pero', 4),
  llueve: T('llueve'),
  agua: T('agua'),
  asi4: T('así', 4),
  abajo2: T('abajo', 2),
  pero5: T('pero', 5),
  rompe: T('rompe'),
  control: T('control'),
  asi5: T('así', 5),
  tope: T('tope'),
  golpe: T('golpe'),
  hule2: T('hule', 2),
  duro: T('duro'),
  baila: T('baila'),
  tapado: T('tapado'),
  viejo: T('viejo'),
  cambialo: T('cámbialo'),
  revisa: T('revisa'),
};

// ---------- geometría ----------
const RX = 0; // centro del regulador
const DIA_Y = 0.44; // diafragma
const LOW_Y = 0.32; // fondo de la cámara de abajo
const TOP_Y = 0.6; // tapa de arriba
const HW = 0.15;
const BOQ: V3 = [-0.06, 0.345, 0]; // boquilla de entrada
const TANQUE_X = -0.5;
const ESTUFA_X = 0.58;
const ENTRADA: V3 = [-HW - 0.06, 0.36, 0];
const SALIDA: V3 = [HW + 0.06, 0.36, 0];
const QUEMADOR: V3 = [ESTUFA_X, 0.47, 0.05];
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
const hayRegulador = (t: number) => visible(t, ev.cajita - 0.2);
const hayResorte = (t: number) => visible(t, ev.resorte1 - 0.2);
const hayOjito = (t: number) => visible(t, ev.ojito1 - 0.2);
const tapado = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.tapas - 0.2, ev.pero4, 0.3));
const capucha = (t: number) => visible(t, ev.abajo2 - 0.6);
/** posición del diafragma (0 abajo/abierto, 1 arriba/cerrado) */
const diafragma = (t: number) => {
  if (t < 0.75) return 0.45;
  if (!hayRegulador(t)) return 0;
  let d = 0.2;
  if (t > ev.infla - 0.3) d = 0.2 + 0.8 * r(t, ev.infla - 0.3, 1.0);
  if (hayResorte(t) && t > ev.empuja - 0.3) {
    const k = r(t, ev.empuja - 0.3, 0.6);
    const osc = Math.exp(-(t - ev.abajo1) * 1.3) * 0.35 * Math.sin((t - ev.abajo1) * 9) * (t > ev.abajo1 ? 1 : 0);
    d = 1 - k * 0.55 + osc * (1 - r(t, ev.equilibrio, 1));
  }
  // trabado: el aire atrapado no deja moverse (se queda en un lado y salta)
  if (tapado(t) > 0.3) d = 0.45 + 0.35 * Math.sign(Math.sin(t * 2.2)) * r(t, ev.traba - 0.3, 0.3);
  if (t > ev.baila - 0.3 && t < ev.revisa) d = 0.45 + 0.25 * Math.sin(t * 7);
  return cl(d);
};
/** flujo de gas que sale a la estufa (0..2) */
const flujo = (t: number) => {
  if (t < 0.75) return 1;
  if (t < ev.estufa2 - 0.4) return 0;
  if (!hayRegulador(t)) return 1 + r(t, ev.presion1 - 0.3, 1.0) * 1.0; // soplete
  const d = diafragma(t);
  let f = cl((1 - d) / 0.55) * 1.0;
  if (entre(t, ev.cierra1 - 0.2, ev.resorte1 - 0.2)) f = 0;
  if (t > ev.apaga - 0.3 && t < ev.pero4) f = 0;
  if (t > ev.golpe - 0.1 && t < ev.hule2) f = 0;
  return f;
};
const fuga = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.rompe - 0.2, ev.golpe + 0.1, 0.2));
const topeCerrado = (t: number) => (t < 0.75 ? 0 : r(t, ev.golpe - 0.3, 0.2) * (1 - r(t, ev.hule2 - 0.3, 0.3)));
const lluvia = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.llueve - 0.3, ev.pero5, 0.4));
const viejo = (t: number) => (t < 0.75 ? 0 : r(t, ev.duro - 0.4, 1.0) * (1 - r(t, ev.cambialo - 0.2, 0.4)));

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 3.2, 0.4, 0.25, [0, 0.4, 0]],
  [1.0, 3.3, 0.25, 0.15, [0.03, 0.4, 0]],
  [4.8, 1.3, 0.4, 0.1, [0.6, 0.48, 0]],
  [9.7, 1.05, 0.2, 0.1, [0, 0.46, 0]],
  [18.3, 3.0, 0.25, 0.12, [0.05, 0.42, 0]],
  [21.9, 1.05, 0.2, 0.1, [0, 0.47, 0]],
  [29.4, 3.0, 0.25, 0.12, [0.05, 0.42, 0]],
  [33.5, 0.95, 0.3, 0.12, [0.03, 0.5, 0]],
  [41.7, 1.1, 0.25, 0.1, [0.05, 0.47, 0]],
  [46.0, 2.6, 0.3, 0.12, [0.15, 0.45, 0]],
  [48.2, 1.15, 0.4, 0.15, [0.05, 0.5, 0]],
  [54.5, 3.0, 0.3, 0.15, [0.05, 0.4, 0]],
  [58.2, 1.0, 0.2, 0.1, [-0.15, 0.38, 0]],
  [63.8, 1.0, 0.25, 0.12, [0, 0.46, 0]],
  [66.0, 3.0, 0.3, 0.12, [0.05, 0.42, 0]],
  [70.7, 1.35, 0.35, 0.15, [0, 0.45, 0]],
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
const Panel: React.FC<{p: V3; s: V3; color: string; o?: number; brillo?: number; rot?: V3}> = ({p, s, color, o = 1, brillo = 0, rot}) => {
  if (o <= 0.01) return null;
  const tr = o < 0.98;
  return (
    <group position={p} rotation={rot}>
      <mesh castShadow={!tr} receiveShadow>
        <boxGeometry args={s} />
        <meshToonMaterial color={color} gradientMap={gradiente()} transparent={tr} opacity={o} depthWrite={!tr} emissive={color} emissiveIntensity={brillo} />
      </mesh>
      {!tr && (
        <mesh>
          <boxGeometry args={[s[0] + 0.005, s[1] + 0.005, s[2] + 0.005]} />
          <meshBasicMaterial color="#15161c" side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};
const Manguera: React.FC<{puntos: V3[]; r?: number; color?: string; hasta?: number}> = ({puntos, r: rr = 0.014, color = '#2b2d33', hasta = 1}) => {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
    const n = 80;
    const pts = c.getSpacedPoints(n).slice(0, Math.max(2, Math.round(n * cl(hasta)) + 1));
    const c2 = new THREE.CatmullRomCurve3(pts);
    return {a: new THREE.TubeGeometry(c2, 80, rr, 12, false), b: new THREE.TubeGeometry(c2, 80, rr + 0.003, 12, false)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos), rr, Math.round(hasta * 80)]);
  if (hasta <= 0.01) return null;
  return (
    <group>
      <mesh geometry={geo.a} castShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} />
      </mesh>
      <mesh geometry={geo.b}>
        <meshBasicMaterial color="#15161c" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
/** partículas de gas por un camino */
const Gas: React.FC<{t: number; puntos: V3[]; on: number; vel?: number; n?: number; color?: string; tam?: number}> = ({t, puntos, on, vel = 0.4, n = 14, color = '#c9b6ff', tam = 0.008}) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p))), [JSON.stringify(puntos)]);
  if (on <= 0.01) return null;
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const u = (t * vel + i / n) % 1;
        const p = curva.getPointAt(u);
        return (
          <mesh key={i} position={[p.x, p.y, p.z + 0.02]} scale={Math.min(1, on)}>
            <sphereGeometry args={[tam, 10, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- escenario: azotea ----------
const Azotea: React.FC<{t: number}> = ({t}) => {
  const ll = lluvia(t);
  return (
    <group>
      <mesh position={[0, 1.4, -1.2]}>
        <planeGeometry args={[9, 4]} />
        <meshBasicMaterial color={new THREE.Color('#ffd9a8').lerp(new THREE.Color('#8fa3b8'), ll).getStyle()} />
      </mesh>
      {/* pared */}
      <mesh position={[0, 0.8, -0.2]} receiveShadow>
        <planeGeometry args={[4, 1.6]} />
        <meshToonMaterial color="#f2a07a" gradientMap={gradiente()} />
      </mesh>
      {Array.from({length: 8}, (_, i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.2, -0.199]}>
          <planeGeometry args={[4, 0.006]} />
          <meshBasicMaterial color="#d98b6a" />
        </mesh>
      ))}
      {/* piso */}
      <mesh position={[0, 0, 0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 1.8]} />
        <meshToonMaterial color="#d9c9ad" gradientMap={gradiente()} />
      </mesh>
      {/* tinaco */}
      <group position={[-1.3, 0, -0.6]}>
        <Torno perfil={[[0, 0], [0.3, 0], [0.32, 0.6], [0.2, 0.7], [0, 0.72]]} color="#2b2d33" />
      </group>
      {/* macetas */}
      <group position={[1.25, 0, 0.1]}>
        <Torno perfil={[[0, 0], [0.08, 0], [0.1, 0.16], [0, 0.16]]} color="#e07a4f" />
        {[0, 1, 2].map((i) => (
          <Esfera key={i} r={0.06} escala={[0.6, 1.4, 0.4]} position={[Math.sin(i * 2) * 0.03, 0.24, Math.cos(i * 2) * 0.03]} color="#4fae6a" />
        ))}
      </group>
    </group>
  );
};

/** tanque de gas */
const Tanque: React.FC = () => (
  <group position={[TANQUE_X, 0, 0]}>
    <Torno perfil={[[0, 0], [0.15, 0], [0.16, 0.02], [0.16, 0.5], [0.12, 0.58], [0.05, 0.6], [0, 0.6]]} color="#e5333b" />
    <Cilindro r={0.161} h={0.04} position={[0, 0.3, 0]} color="#ffffff" contorno={false} />
    <Cilindro r={0.03} h={0.04} position={[0, 0.62, 0]} color="#c9ced8" />
    <Cilindro r={0.015} h={0.05} position={[0.03, 0.66, 0]} rotation={[0, 0, Math.PI / 2]} color="#d9a441" />
    <Redondeada w={0.08} h={0.015} d={0.03} radio={0.006} position={[0, 0.68, 0]} color="#3a3e48" />
    <SombraContacto position={[0, 0.001, 0]} w={0.45} d={0.45} o={0.3} />
  </group>
);
/** estufa */
const Estufa: React.FC<{t: number}> = ({t}) => {
  const f = flujo(t);
  const soplete = !hayRegulador(t) && t > ev.presion1 - 0.3 ? r(t, ev.presion1 - 0.3, 1) : 0;
  const tiembla = (t > ev.sube - 0.3 && t < ev.apaga) || (t > ev.baila - 0.3 && t < ev.tapado + 0.5) ? 0.4 * Math.sin(t * 13) : 0;
  const alto = f <= 0.02 ? 0 : (0.05 + 0.04 * f + soplete * 0.25) * (1 + tiembla);
  return (
    <group>
      <group position={[ESTUFA_X, 0, 0]}>
        <Redondeada w={0.5} h={0.45} d={0.45} radio={0.02} position={[0, 0.225, 0]} color="#f2efe6" />
        <Redondeada w={0.5} h={0.02} d={0.45} radio={0.008} position={[0, 0.455, 0]} color="#2b2d33" />
        {[-0.12, 0.12].map((x) =>
          [-0.1, 0.1].map((z) => (
            <group key={`${x}${z}`} position={[x, 0.468, z]}>
              <Cilindro r={0.045} h={0.008} color="#4a4f5b" />
              <Toro r={0.06} tubo={0.004} rotation={[Math.PI / 2, 0, 0]} color="#1c1d22" />
            </group>
          )),
        )}
        {[-0.15, -0.05, 0.05, 0.15].map((x) => (
          <Cilindro key={x} r={0.018} h={0.015} position={[x, 0.38, 0.23]} rotation={[Math.PI / 2, 0, 0]} color="#d6dbe2" />
        ))}
        <Redondeada w={0.36} h={0.18} d={0.01} radio={0.01} position={[0, 0.17, 0.228]} color="#2b2d33" />
        {/* olla */}
        <group position={[-0.12, 0.475, -0.1]}>
          <Torno perfil={[[0, 0], [0.08, 0], [0.085, 0.1], [0.08, 0.1], [0.075, 0.006], [0, 0.006]]} color="#c9ced8" />
        </group>
      </group>
      {/* flama del quemador del frente derecho */}
      {alto > 0.005 && (
        <group position={[ESTUFA_X + 0.12, 0.475, 0.1]}>
          {Array.from({length: 10}, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.05, alto * 0.45, Math.sin(a) * 0.05]} scale={[0.012, alto * 0.5 * (1 + 0.1 * Math.sin(t * 20 + i)), 0.012]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshBasicMaterial color={soplete > 0.3 ? '#5aa9ff' : '#3f8cff'} transparent opacity={0.85} />
              </mesh>
            );
          })}
          {soplete > 0.05 && (
            <mesh position={[0, 0.15 * soplete, 0]} scale={[0.04, 0.2 * soplete, 0.04]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color="#ff8a3d" transparent opacity={0.6} />
            </mesh>
          )}
          <pointLight color="#7fb8ff" intensity={0.4} distance={0.5} />
        </group>
      )}
    </group>
  );
};

/** regulador en corte */
const Regulador: React.FC<{t: number}> = ({t}) => {
  const d = diafragma(t);
  const dy = (d - 0.5) * 0.05; // desplazamiento del centro del diafragma
  const old = viejo(t);
  const marcaDia = ventana(t, ev.diafragma1 - 0.4, ev.diafragma1 + 1.2, 0.2);
  const marcaReg = ventana(t, ev.regulador1 - 0.4, ev.regulador1 + 1.2, 0.2);
  const colorCuerpo = marcaReg > 0.2 ? '#ffd34d' : '#9aa4b0';
  const colorHule = marcaDia > 0.2 ? '#ffd34d' : new THREE.Color('#e8743b').lerp(new THREE.Color('#5a3a20'), old).getStyle();
  // diafragma: curva por puntos
  const puntosDia: V3[] = Array.from({length: 13}, (_, i) => {
    const x = -HW + (2 * HW * i) / 12;
    const k = 1 - (x / HW) ** 2;
    return [x, DIA_Y + dy * k, 0.005];
  });
  // palanca: el centro del diafragma baja/sube una varilla; la palanca tapa la boquilla
  const vy = DIA_Y + dy - 0.005;
  const pivote: V3 = [-0.01, 0.37, 0.006];
  const brazoA = Math.atan2(vy - 0.06 - pivote[1], 0.03);
  const pad: V3 = [BOQ[0], pivote[1] - Math.sin(brazoA) * 0.05 * 0.9, 0.006];
  const resorteK = hayResorte(t) ? (t < 0.75 ? 1 : r(t, ev.resorte1 - 0.2, 0.5)) : 0;
  const ojo = hayOjito(t);
  const tap = tapado(t);
  const marcaOjo = ventana(t, ev.respiradero1 - 0.4, ev.respiradero1 + 1.2, 0.2) + ventana(t, ev.tapado - 0.6, ev.tapado + 1.0, 0.2);
  const hood = capucha(t);
  const tope = topeCerrado(t);
  return (
    <group position={[RX, 0, 0]}>
      {/* cámara de abajo (corte): fondo, paredes */}
      <Panel p={[0, (LOW_Y + DIA_Y) / 2, -0.03]} s={[HW * 2, DIA_Y - LOW_Y, 0.01]} color="#7a7f88" />
      <Panel p={[0, LOW_Y, 0]} s={[HW * 2 + 0.02, 0.02, 0.07]} color={colorCuerpo} />
      <Panel p={[-HW, (LOW_Y + DIA_Y) / 2, 0]} s={[0.02, DIA_Y - LOW_Y, 0.07]} color={colorCuerpo} />
      <Panel p={[HW, (LOW_Y + DIA_Y) / 2, 0]} s={[0.02, DIA_Y - LOW_Y, 0.07]} color={colorCuerpo} />
      {/* bonete de arriba */}
      <Panel p={[0, (DIA_Y + TOP_Y) / 2, -0.03]} s={[HW * 2, TOP_Y - DIA_Y, 0.01]} color="#aeb7c2" />
      <Panel p={[-HW, (DIA_Y + TOP_Y) / 2, 0]} s={[0.02, TOP_Y - DIA_Y, 0.07]} color={colorCuerpo} />
      <Panel p={[HW, (DIA_Y + TOP_Y) / 2 + (ojo ? 0.03 : 0), 0]} s={[0.02, TOP_Y - DIA_Y - (ojo ? 0.06 : 0), 0.07]} color={colorCuerpo} />
      {ojo && <Panel p={[HW, DIA_Y + 0.015, 0]} s={[0.02, 0.03, 0.07]} color={colorCuerpo} />}
      <Panel p={[0, TOP_Y, 0]} s={[HW * 2 + 0.02, 0.02, 0.07]} color={colorCuerpo} />
      {/* ojito / respiradero */}
      {ojo && (
        <group position={[HW + 0.012, DIA_Y + 0.06, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.012, 0.02, 24]} />
            <meshBasicMaterial color={marcaOjo > 0.2 ? '#ffd34d' : '#15161c'} side={THREE.DoubleSide} />
          </mesh>
          {tap > 0.05 && <Esfera r={0.016 * tap} position={[0.008, 0, 0]} color="#7a4a2a" />}
          {hood && (
            <Brota t={t} desde={ev.abajo2 - 0.6} position={[0.03, -0.01, 0]}>
              <Cilindro r={0.014} h={0.04} position={[0, 0.0, 0]} rotation={[0, 0, Math.PI / 2]} color="#9aa4b0" />
              <Cilindro r={0.014} h={0.05} position={[0.02, -0.03, 0]} color="#9aa4b0" />
            </Brota>
          )}
        </group>
      )}
      {/* diafragma */}
      <mesh>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(puntosDia.map((p) => new THREE.Vector3(...p))), 40, 0.007, 8, false]} />
        <meshToonMaterial color={colorHule} gradientMap={gradiente()} />
      </mesh>
      <mesh position={[0, DIA_Y + dy, 0.005]}>
        <cylinderGeometry args={[0.035, 0.035, 0.012, 24]} />
        <meshToonMaterial color="#c9ced8" gradientMap={gradiente()} />
      </mesh>
      {/* grietas del hule viejo */}
      {old > 0.4 &&
        [-0.1, -0.06, 0.07, 0.11].map((x) => <Caja key={x} w={0.002} h={0.014} d={0.004} position={[x, DIA_Y + dy * (1 - (x / HW) ** 2), 0.014]} rotation={[0, 0, 0.5]} color="#15161c" contorno={false} />)}
      {/* resorte */}
      {resorteK > 0.01 &&
        Array.from({length: 9}, (_, k) => {
          const y0 = DIA_Y + dy + 0.012;
          const y1 = TOP_Y - 0.012;
          return <Toro key={k} r={0.03 * resorteK} tubo={0.004} rotation={[Math.PI / 2 + 0.25, 0, 0]} position={[0, y0 + ((y1 - y0) * k) / 8, 0.005]} color="#5a6170" contorno={false} />;
        })}
      {/* varilla + palanca + tapón de la boquilla */}
      <Cilindro r={0.004} h={Math.max(0.01, vy - 0.39)} position={[0.02, (vy + 0.39) / 2, 0.006]} color="#c9ced8" contorno={false} />
      <Cilindro r={0.005} h={0.012} position={pivote} rotation={[Math.PI / 2, 0, 0]} color="#3a3e48" contorno={false} />
      <mesh position={[(pivote[0] + 0.02) / 2 - 0.02, pivote[1], 0.006]} rotation={[0, 0, -brazoA * 0.9]}>
        <boxGeometry args={[0.1, 0.006, 0.01]} />
        <meshToonMaterial color="#d9a441" gradientMap={gradiente()} />
      </mesh>
      <Redondeada w={0.025} h={0.01} d={0.02} radio={0.003} position={[pad[0], Math.max(BOQ[1] + 0.013, pad[1]), 0.006]} color="#2b2d33" />
      {/* boquilla de entrada */}
      <Cilindro r={0.008} h={0.025} position={[BOQ[0], BOQ[1], 0.006]} color="#d9a441" />
      <Cilindro r={0.01} h={0.06} position={[(BOQ[0] - HW) / 2, BOQ[1] - 0.012, 0.006]} rotation={[0, 0, Math.PI / 2]} color="#d9a441" />
      {/* tope de exceso de flujo (bolita en la entrada) */}
      {visible(t, ev.tope - 0.3) && (
        <Brota t={t} desde={ev.tope - 0.3} position={[-HW - 0.035 + tope * 0.02, ENTRADA[1], 0.006]}>
          <Esfera r={0.011} color={tope > 0.5 ? '#e5333b' : '#ffd34d'} />
        </Brota>
      )}
      {/* entrada y salida */}
      <Cilindro r={0.016} h={0.06} position={[-HW - 0.03, ENTRADA[1], 0]} rotation={[0, 0, Math.PI / 2]} color="#d9a441" />
      <Cilindro r={0.016} h={0.06} position={[HW + 0.03, SALIDA[1], 0]} rotation={[0, 0, Math.PI / 2]} color="#d9a441" />
    </group>
  );
};

/** aire de arriba entrando y saliendo por el ojito */
const AireOjito: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.aire1 - 0.3, ev.tapas, 0.3);
  if (on <= 0.01 || !hayOjito(t)) return null;
  const sale = Math.sin(t * 3) > 0;
  return (
    <group>
      {Array.from({length: 5}, (_, i) => {
        const u = (t * 1.2 + i / 5) % 1;
        const x = HW + (sale ? u : 1 - u) * 0.15;
        return (
          <mesh key={i} position={[x, DIA_Y + 0.06 + (rnd(i) - 0.5) * 0.02, 0.02]} scale={[2.5, 1, 1]}>
            <sphereGeometry args={[0.006, 8, 6]} />
            <meshBasicMaterial color="#7fc6ff" transparent opacity={on * 0.9} />
          </mesh>
        );
      })}
    </group>
  );
};
/** lluvia y gotas que entran */
const Lluvia: React.FC<{t: number}> = ({t}) => {
  const ll = lluvia(t);
  if (ll <= 0.02) return null;
  const entra = !capucha(t);
  return (
    <group>
      {Array.from({length: 50}, (_, i) => {
        const u = (t * 1.5 + rnd(i)) % 1;
        return (
          <mesh key={i} position={[-1 + rnd(i + 3) * 2, 1.4 - u * 1.4, -0.1 + rnd(i + 7) * 0.6]}>
            <capsuleGeometry args={[0.003, 0.04, 3, 6]} />
            <meshBasicMaterial color="#d9f2ff" transparent opacity={ll * 0.8} />
          </mesh>
        );
      })}
      {entra &&
        [0, 1, 2].map((i) => {
          const u = (t * 1.3 + i / 3) % 1;
          return <Esfera key={i} r={0.007} escala={[1, 1.3, 1]} position={[HW + 0.06 - u * 0.08, DIA_Y + 0.12 - u * 0.06, 0.01]} color="#3fa9f5" contorno={false} />;
        })}
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const reg = hayRegulador(t);
  const f = flujo(t);
  const fg = fuga(t);
  const rompe = t > 0.75 && t > ev.rompe - 0.2 && t < ev.hule2;
  const hTanque: V3 = [TANQUE_X + 0.06, 0.66, 0];
  const mangueraEntrada: V3[] = reg ? [hTanque, [-0.42, 0.62, 0.08], [-0.3, 0.42, 0.06], ENTRADA] : [hTanque, [-0.3, 0.62, 0.08], [0.0, 0.36, 0.1], [0.22, 0.3, 0.08], [ESTUFA_X - 0.25, 0.34, 0.05]];
  const mangueraSalida: V3[] = rompe ? [SALIDA, [0.25, 0.33, 0.06], [0.28, 0.3, 0.07]] : [SALIDA, [0.25, 0.33, 0.06], [0.29, 0.3, 0.06], [ESTUFA_X - 0.25, 0.34, 0.05]];
  const alta = reg ? 1.2 : 0.6 + f * 0.5;
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
        shadow-camera-left={-1.6}
        shadow-camera-right={1.6}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-1.6}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
      <Azotea t={t} />
      <Pieza t={t} desde={ev.tanque1 - 0.2} dir={[-0.6, 0.4, 1]} caida={0.3}>
        <Tanque />
      </Pieza>
      <Pieza t={t} desde={ev.estufa2 - 1.6} dir={[0.6, 0.4, 1]} caida={0.3}>
        <Estufa t={t} />
      </Pieza>
      {visible(t, ev.manguera1 - 0.2) && <Manguera puntos={mangueraEntrada} />}
      {reg && <Manguera puntos={mangueraSalida} />}
      {reg && (
        <Pieza t={t} desde={ev.cajita - 0.2} dir={[0, 1, 0.5]} caida={0.35}>
          <Regulador t={t} />
        </Pieza>
      )}
      {/* gas en las mangueras */}
      <Gas t={t} puntos={mangueraEntrada} on={t < ev.estufa2 - 0.4 && t > 0.75 ? 0 : topeCerrado(t) > 0.5 ? 0 : 1} vel={alta * 0.5} n={reg ? 22 : 14} color={reg || f > 1.3 ? '#ff8aa0' : '#c9b6ff'} tam={0.009} />
      {reg && <Gas t={t} puntos={mangueraSalida} on={rompe ? fg : cl(f)} vel={0.25 + f * 0.2} n={10} color="#9be3ff" tam={0.008} />}
      {/* dentro de la cámara */}
      {reg && <Gas t={t} puntos={[[BOQ[0], BOQ[1] + 0.02, 0], [0.0, 0.4, 0], [0.1, 0.38, 0], SALIDA]} on={cl(f)} vel={0.4} n={8} color="#9be3ff" tam={0.008} />}
      {/* fuga por la manguera rota */}
      {fg > 0.02 &&
        Array.from({length: 12}, (_, i) => {
          const u = (t * 1.6 + i / 12) % 1;
          return (
            <mesh key={i} position={[0.28 + u * 0.25, 0.3 + u * 0.12 + (rnd(i) - 0.5) * 0.06 * u, 0.07 + (rnd(i + 3) - 0.5) * 0.08 * u]}>
              <sphereGeometry args={[0.01 + u * 0.03, 10, 8]} />
              <meshToonMaterial color="#c9b6ff" gradientMap={gradiente()} transparent opacity={fg * (1 - u) * 0.7} depthWrite={false} />
            </mesh>
          );
        })}
      <AireOjito t={t} />
      <Lluvia t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.tanque1 - 0.3, 'tanque de gas', false],
  [ev.estufa2 - 0.4, 'ya tienes estufa de gas', false],
  [ev.presion1 - 0.6, 'mucha presión', true],
  [ev.soplete - 0.5, '¡como soplete!', true],
  [ev.cajita - 0.3, 'una cajita', false],
  [ev.infla - 0.4, 'el hule se infla', false],
  [ev.cierra1 - 0.2, 'y cierra el paso', false],
  [ev.diafragma1 - 0.5, 'el diafragma', false],
  [ev.nada - 1.0, 'no le llega nada', true],
  [ev.resorte1 - 0.3, 'un resorte encima', false],
  [ev.equilibrio - 0.6, 'quedan en equilibrio', false],
  [ev.sale1 - 0.2, 'sale suavecito', false],
  [ev.regulador1 - 0.5, 'el regulador', false],
  [ev.aire1 - 0.3, 'el aire de arriba', false],
  [ev.ojito1 - 0.3, 'un ojito en la tapa', false],
  [ev.respiradero1 - 0.5, 'el respiradero', false],
  [ev.tapas - 0.2, 'si lo tapas…', true],
  [ev.traba - 0.3, 'se traba', true],
  [ev.sube - 0.2, 'sube y baja, o se apaga', true],
  [ev.llueve - 0.2, 'si llueve…', true],
  [ev.agua - 0.2, 'se mete el agua', true],
  [ev.abajo2 - 0.8, 'viendo hacia abajo', false],
  [ev.rompe - 0.3, '¡se rompe la manguera!', true],
  [ev.tope - 0.3, 'un tope', false],
  [ev.golpe - 0.8, 'se cierra solo', false],
  [ev.duro - 0.4, 'el hule se endurece', true],
  [ev.baila - 0.4, '¿flama que baila?', true],
  [ev.tapado - 0.8, 'revisa el respiradero', false],
  [ev.viejo - 0.4, '¿regulador viejo?', true],
  [ev.cambialo - 0.2, '¡cámbialo!', true],
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
  if (t < ev.estufa2 - 0.3) return null;
  const f = flujo(t) / 2;
  const alta = f > 0.75;
  return <Termometro x={950} valor={f} color={alta ? '#e5333b' : f < 0.05 ? '#9aa4b0' : '#3fa9f5'} arriba={alta ? '¡!' : ''} colorArriba="#e5333b" nombre="a la estufa" />;
};

export const ReguladorVideo: React.FC = () => {
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
      <Audio src={staticFile('regulador_gas/voz.wav')} />
      <Audio src={staticFile('regulador_gas/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_REGULADOR = (datos as any).duration as number;
