import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/extintor.json';
import {Caja, Cilindro, Esfera, GROSOR, gradiente, Papel, Redondeada, SombraContacto, Toro} from './toon';
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
  tanque: T('tanque'),
  polvo1: T('polvo', 1),
  extintor1: T('extintor', 1),
  pero1: T('pero', 1),
  gas1: T('gas', 1),
  empuje: T('empuje'),
  impulsor: T('impulsor'),
  pero2: T('pero', 2),
  escapa1: T('escapa'),
  asi2: T('así', 2),
  valvula: T('válvula'),
  palanca1: T('palanca', 1),
  aprietas1: T('aprietas', 1),
  manija1: T('manija', 1),
  pero3: T('pero', 3),
  aprieta: T('aprieta'),
  vacia: T('vacía'),
  asi3: T('así', 3),
  pasador: T('pasador'),
  sello: T('sello'),
  seguro1: T('seguro', 1),
  pero4: T('pero', 4),
  lados: T('lados'),
  asi4: T('así', 4),
  manguera: T('manguera'),
  base1: T('base', 1),
  llamas: T('llamas'),
  boquilla2: T('boquilla', 2),
  pero5: T('pero', 5),
  anos: T('años'),
  vacio: T('vacío'),
  asi5: T('así', 5),
  reloj: T('reloj'),
  verde1: T('verde', 1),
  rojo: T('rojo'),
  manometro: T('manómetro'),
  pero6: T('pero', 6),
  aceite: T('aceite'),
  empeora: T('empeora'),
  asi6: T('así', 6),
  etiqueta: T('etiqueta'),
  a: T('madera') - 0.45,
  madera: T('madera'),
  liquidos: T('líquidos'),
  electricos: T('eléctricos'),
  abc: T('abc'),
  tres: T('tres'),
  revisa: T('revisa'),
  verde2: T('verde', 2),
  funciona: T('funciona'),
  jalas: T('jalas'),
  apuntas: T('apuntas'),
  aprietas2: T('aprietas', 2),
  barres: T('barres'),
};

// ---------- geometría ----------
const R = 0.09;
const CORTE0 = 1.15;
const CORTE_L = Math.PI * 2 - 1.5;
const PERFIL_TANQUE: [number, number][] = [
  [0, 0],
  [R - 0.012, 0],
  [R, 0.015],
  [R, 0.4],
  [R - 0.015, 0.45],
  [0.05, 0.48],
  [0.025, 0.49],
  [0.025, 0.485],
  [0.048, 0.474],
  [R - 0.02, 0.445],
  [R - 0.005, 0.4],
  [R - 0.005, 0.017],
  [R - 0.016, 0.005],
  [0, 0.005],
];
const CABEZA_Y = 0.5;
const FUEGO: V3 = [0.62, 0, 0.18];
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
const corte = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.polvo1 - 0.4, ev.asi2 + 0.2, 0.4), ventana(t, ev.pero5 - 0.2, ev.asi5 + 0.4, 0.4)));
const hayValvula = (t: number) => visible(t, ev.valvula - 0.2);
const hayPasador = (t: number) => visible(t, ev.pasador - 0.2) && !(t > ev.jalas - 0.1);
const hayManguera = (t: number) => visible(t, ev.manguera - 0.2);
const hayManometro = (t: number) => visible(t, ev.reloj - 0.2);
const hayEtiqueta = (t: number) => visible(t, ev.etiqueta - 0.2);
/** palanca apretada 0..1 */
const aprieta = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.aprietas1 - 0.2, ev.manija1 + 0.6, 0.15), ventana(t, ev.aprieta - 0.15, ev.asi3, 0.15), ventana(t, ev.pero4 - 0.2, ev.boquilla2 + 0.6, 0.15), ventana(t, ev.aprietas2 - 0.2, 99, 0.15)));
/** descarga de polvo: 0 nada, salida libre */
const descarga = (t: number) => {
  if (t < 0.75) return 0;
  const sinValvula = !hayValvula(t) ? ventana(t, ev.empuje - 0.3, ev.asi2 + 0.2, 0.2) : 0;
  return Math.max(sinValvula, aprieta(t) * (hayPasador(t) && t > ev.pasador ? 0 : 1));
};
const nivelPolvo = (t: number) => {
  if (t < 0.75) return 0.8;
  let n = 0.8 * r(t, ev.polvo1 - 0.2, 1.2);
  n -= 0.6 * r(t, ev.escapa1 - 0.4, 1.4) * (1 - r(t, ev.asi2 + 0.4, 0.5));
  n -= 0.5 * r(t, ev.vacia - 0.6, 1.0) * (1 - r(t, ev.asi3 + 0.6, 0.5));
  return Math.max(0.05, n);
};
const presion = (t: number) => {
  if (t < 0.75) return 0.8;
  if (t < ev.gas1 - 0.2) return 0;
  let p = 0.85 * r(t, ev.gas1 - 0.2, 0.8);
  p -= 0.8 * r(t, ev.escapa1 - 0.4, 1.2) * (1 - r(t, ev.asi2 + 0.4, 0.4));
  p -= 0.75 * r(t, ev.anos - 0.6, 3) * (1 - r(t, ev.asi5 + 2.0, 0.6));
  p -= 0.7 * ventana(t, ev.rojo - 0.4, ev.manometro, 0.3);
  p -= 0.7 * ventana(t, ev.verde2 - 0.4, ev.funciona + 0.6, 0.3);
  return cl(p);
};
const fuego = (t: number) => {
  if (t < 0.75) return 0;
  let f = r(t, ev.extintor1 - 1.0, 0.8);
  f *= 1 - r(t, ev.base1 - 0.3, 1.5) * (1 - r(t, ev.boquilla2 + 0.6, 0.6));
  f *= 1 - r(t, ev.barres, 1.5);
  return f;
};
const apuntando = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.manguera + 0.6, ev.boquilla2 + 1.0, 0.4), ventana(t, ev.apuntas - 0.4, 99, 0.4)));
const barrido = (t: number) => (t > ev.barres - 0.2 ? Math.sin((t - ev.barres) * 5) * 0.12 : 0);

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 2.2, 0.4, 0.25, [0.15, 0.3, 0]],
  [1.0, 1.6, 0.35, 0.15, [0.15, 0.28, 0]],
  [4.9, 1.1, 0.6, 0.25, [0, 0.3, 0]],
  [11.9, 1.9, 0.35, 0.15, [0.25, 0.3, 0]],
  [14.3, 0.55, 0.5, 0.2, [0, 0.53, 0]],
  [20.2, 0.55, 0.75, 0.2, [0, 0.53, 0]],
  [29.2, 2.0, 0.3, 0.15, [0.3, 0.3, 0.1]],
  [38.4, 1.0, 0.45, 0.1, [0, 0.3, 0]],
  [43.7, 0.38, 0.15, 0.1, [0.0, 0.53, 0.06]],
  [51.0, 1.25, 0.15, 0.1, [0, 0.3, 0]],
  [56.5, 0.8, 0.05, 0.05, [0, 0.25, 0.09]],
  [63.3, 1.45, 0.3, 0.15, [0.1, 0.3, 0]],
  [66.2, 0.38, 0.15, 0.1, [0.0, 0.53, 0.06]],
  [70.4, 2.1, 0.35, 0.2, [0.3, 0.3, 0.1]],
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
const MatTinta: React.FC = () => <meshBasicMaterial color="#15161c" side={THREE.BackSide} />;
/** pieza de revolución con cuña variable (k=0 entera) */
const Corte: React.FC<{perfil: [number, number][]; k: number; color: string; colorCorte: string; opacity?: number; contorno?: boolean}> = ({perfil, k, color, colorCorte, opacity = 1, contorno = true}) => {
  const ancho = 1.5 * k;
  const ini = CORTE0 - 1.5 + ancho + 0.0;
  const largo = Math.PI * 2 - ancho;
  const clave = JSON.stringify(perfil) + Math.round(k * 60);
  const g = useMemo(() => {
    const pts = perfil.map(([x, y]) => new THREE.Vector2(x, y));
    const cuerpo = new THREE.LatheGeometry(pts, 72, ini, largo);
    const tinta = new THREE.LatheGeometry(perfil.map(([x, y]) => new THREE.Vector2(x > 0 ? x + GROSOR * 0.8 : 0, y)), 72, ini - (k > 0.01 ? 0.004 : 0), largo + (k > 0.01 ? 0.008 : 0));
    const cara = new THREE.ShapeGeometry(new THREE.Shape(pts));
    return {cuerpo, tinta, cara};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const tr = opacity < 0.98;
  return (
    <group>
      <mesh geometry={g.cuerpo} castShadow={!tr} receiveShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={tr} opacity={opacity} depthWrite={!tr} />
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
              <meshToonMaterial color={colorCorte} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={tr} opacity={opacity} depthWrite={!tr} />
            </mesh>
          </group>
        ))}
    </group>
  );
};
const Manguera: React.FC<{puntos: V3[]; r?: number; color?: string}> = ({puntos, r: rr = 0.009, color = '#2b2d33'}) => {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
    return {a: new THREE.TubeGeometry(c, 60, rr, 10, false), b: new THREE.TubeGeometry(c, 60, rr + 0.0022, 10, false)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos), rr]);
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
const Texto3D: React.FC<{texto: string; w: number; h: number; position?: V3; color?: string; fondo?: string; rot?: V3}> = ({texto, w, h, position, color = '#15161c', fondo = 'rgba(0,0,0,0)', rot}) => {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = Math.round((256 * h) / w);
    const g = cv.getContext('2d')!;
    g.fillStyle = fondo;
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = color;
    g.font = `900 ${Math.round(cv.height * 0.7)}px Inter, Arial`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, cv.width / 2, cv.height / 2 + 2);
    return new THREE.CanvasTexture(cv);
  }, [texto, w, h, color, fondo]);
  return (
    <mesh position={position} rotation={rot}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
};

// ---------- escenario: bodega ----------
const Bodega: React.FC = () => (
  <group>
    <mesh position={[0, 1.2, -0.5]}>
      <planeGeometry args={[7, 3]} />
      <meshToonMaterial color="#d6e2ee" gradientMap={gradiente()} />
    </mesh>
    <mesh position={[0, 0.3, -0.499]}>
      <planeGeometry args={[7, 0.6]} />
      <meshToonMaterial color="#b9c8d8" gradientMap={gradiente()} />
    </mesh>
    {/* letrero de extintor */}
    <group position={[-0.05, 0.95, -0.49]}>
      <Redondeada w={0.2} h={0.26} d={0.01} radio={0.01} color="#e5333b" />
      <Texto3D texto="🧯" w={0.16} h={0.16} position={[0, 0.02, 0.006]} color="#ffffff" />
    </group>
    {/* piso */}
    <mesh position={[0, 0, 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[7, 2]} />
      <meshToonMaterial color="#9aa4b0" gradientMap={gradiente()} />
    </mesh>
    {[-1, -0.5, 0, 0.5, 1].map((x) => (
      <mesh key={x} position={[x, 0.001, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.004, 2]} />
        <meshBasicMaterial color="#8a939f" />
      </mesh>
    ))}
    {/* cajas */}
    <Redondeada w={0.3} h={0.25} d={0.3} radio={0.01} position={[-0.55, 0.125, -0.25]} color="#c99a6b" />
    <Redondeada w={0.22} h={0.2} d={0.22} radio={0.01} position={[-0.5, 0.35, -0.25]} color="#d9a66b" />
    {/* bote de basura con fuego */}
    <group position={FUEGO}>
      <Cilindro r={0.09} r2={0.075} h={0.18} position={[0, 0.09, 0]} color="#5a6170" />
      {[0, 1, 2].map((i) => (
        <Redondeada key={i} w={0.06} h={0.02} d={0.12} radio={0.006} position={[(i - 1) * 0.035, 0.185, 0]} rotation={[0, i, 0.2]} color="#c99a6b" />
      ))}
    </group>
  </group>
);
const Fuego: React.FC<{t: number}> = ({t}) => {
  const f = fuego(t);
  if (f <= 0.02) return null;
  return (
    <group position={[FUEGO[0], 0.19, FUEGO[2]]}>
      {Array.from({length: 7}, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const h = (0.12 + 0.06 * Math.sin(t * 9 + i * 2)) * f;
        return (
          <group key={i} position={[Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04]}>
            <mesh position={[0, h * 0.5, 0]} scale={[0.035, h * 0.6, 0.035]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color="#ff6a1f" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, h * 0.4, 0]} scale={[0.02, h * 0.38, 0.02]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color="#ffe14d" />
            </mesh>
          </group>
        );
      })}
      <pointLight color="#ff9a3d" intensity={0.7 * f} distance={1.2} />
    </group>
  );
};

// ---------- extintor ----------
const Extintor: React.FC<{t: number}> = ({t}) => {
  const k = corte(t);
  const nivel = nivelPolvo(t);
  const p = presion(t);
  const ap = aprieta(t);
  const marcaGas = ventana(t, ev.impulsor - 0.4, ev.impulsor + 1.2, 0.2);
  const marcaManija = ventana(t, ev.manija1 - 0.4, ev.manija1 + 1.2, 0.2) + ventana(t, ev.aprietas2 - 0.2, ev.barres, 0.2);
  const marcaSeguro = ventana(t, ev.seguro1 - 0.4, ev.seguro1 + 1.2, 0.2) + ventana(t, ev.jalas - 0.4, ev.jalas + 0.6, 0.2);
  const marcaMan = ventana(t, ev.manometro - 0.5, ev.manometro + 1.2, 0.2);
  const pin = hayPasador(t);
  const jalado = t > ev.jalas - 0.1 ? r(t, ev.jalas - 0.1, 0.5) : 0;
  const aguja = -1.1 + 2.2 * (1 - p);
  return (
    <group>
      {/* tanque */}
      <Corte perfil={PERFIL_TANQUE} k={k} color="#e5333b" colorCorte="#b9262e" />
      {/* polvo dentro */}
      {k > 0.02 && nivel > 0.02 && (
        <Corte
          perfil={[
            [0, 0.006],
            [R - 0.006, 0.006],
            [R - 0.006, 0.006 + 0.39 * nivel],
            [0, 0.006 + 0.39 * nivel],
          ]}
          k={k * 0.98}
          color="#f7f0d0"
          colorCorte="#efe3b0"
          contorno={false}
        />
      )}
      {/* gas a presión arriba del polvo */}
      {k > 0.02 && p > 0.02 && (
        <group>
          {Array.from({length: 14}, (_, i) => {
            const a = CORTE0 - 0.75 + (rnd(i) - 0.5) * 1.2;
            const rr = 0.015 + rnd(i + 3) * 0.06;
            const y0 = 0.006 + 0.39 * nivel + 0.01;
            const y = y0 + ((0.44 - y0) * ((rnd(i + 7) + t * 0.3 * (0.5 + rnd(i))) % 1));
            return <Esfera key={i} r={0.006 * (0.6 + p * 0.6)} position={[Math.sin(a) * rr, Math.min(0.44, y), Math.cos(a) * rr]} color={marcaGas > 0.2 ? '#ffd34d' : '#7fc6ff'} contorno={false} />;
          })}
          {/* tubo sifón */}
          <Cilindro r={0.006} h={0.46} position={[0, 0.25, 0]} color="#c9ced8" />
        </group>
      )}
      {/* etiqueta */}
      {hayEtiqueta(t) && (
        <Brota t={t} desde={ev.etiqueta - 0.2}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[R + 0.0015, R + 0.0015, 0.16, 48, 1, true, -0.7, 1.4]} />
            <meshToonMaterial color="#ffffff" gradientMap={gradiente()} side={THREE.DoubleSide} />
          </mesh>
          {[
            ['A', '#4fae6a', ev.a - 0.2, -0.04],
            ['B', '#e5333b', ev.liquidos - 0.6, 0],
            ['C', '#3b7dd8', ev.electricos - 0.6, 0.04],
          ].map(([l, c, desde, x]) => (t < 0.75 || t > (desde as number) ? <Texto3D key={l as string} texto={l as string} w={0.035} h={0.035} position={[(x as number), 0.28, R + 0.006]} color="#ffffff" fondo={c as string} /> : null))}
          {(t < 0.75 || t > ev.abc - 0.3) && <Texto3D texto="ABC" w={0.12} h={0.04} position={[0, 0.215, R + 0.006]} color="#15161c" />}
        </Brota>
      )}
      {/* cabeza: cuello y válvula */}
      <Cilindro r={0.028} h={0.03} position={[0, 0.5, 0]} color="#c9ced8" />
      {hayValvula(t) && (
        <Brota t={t} desde={ev.valvula - 0.2} position={[0, CABEZA_Y + 0.03, 0]}>
          <Redondeada w={0.05} h={0.05} d={0.045} radio={0.008} position={[0, 0.02, 0]} color="#3a3e48" />
          {/* manija de abajo (fija) */}
          <Redondeada w={0.16} h={0.014} d={0.03} radio={0.006} position={[-0.07, 0.025, 0]} color="#2b2d33" />
          {/* palanca de arriba */}
          {visible(t, ev.palanca1 - 0.2) && (
            <group position={[0.02, 0.05, 0]} rotation={[0, 0, ap * 0.28]}>
              <Redondeada w={0.17} h={0.014} d={0.03} radio={0.006} position={[-0.08, 0.008, 0]} rotation={[0, 0, 0.12]} color={marcaManija > 0.2 ? '#ffd34d' : '#9aa4b0'} />
            </group>
          )}
          {/* pasador con sello */}
          {(pin || jalado < 0.99) && visible(t, ev.pasador - 0.2) && (
            <group position={[-0.015, 0.042, 0.03 + jalado * 0.15]} rotation={[0, 0, jalado * 2]}>
              <Cilindro r={0.003} h={0.06} rotation={[Math.PI / 2, 0, 0]} color={marcaSeguro > 0.2 ? '#ffd34d' : '#c9ced8'} />
              <Toro r={0.012} tubo={0.0025} position={[0, 0, 0.035]} color={marcaSeguro > 0.2 ? '#ffd34d' : '#c9ced8'} />
              {visible(t, ev.sello - 0.2) && <Redondeada w={0.016} h={0.022} d={0.003} radio={0.003} position={[0, -0.02, 0.028]} color="#ffd34d" />}
            </group>
          )}
          {/* manómetro */}
          {hayManometro(t) && (
            <Brota t={t} desde={ev.reloj - 0.2} position={[0.0, 0.02, 0.03]}>
              <Cilindro r={0.022} h={0.012} rotation={[Math.PI / 2, 0, 0]} color={marcaMan > 0.2 ? '#ffd34d' : '#e8edf2'} />
              <mesh position={[0, 0, 0.0065]}>
                <circleGeometry args={[0.018, 32]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0, 0.007]} rotation={[0, 0, Math.PI / 2 - 1.1]}>
                <ringGeometry args={[0.012, 0.017, 24, 1, 0, 2.2 * 0.35]} />
                <meshBasicMaterial color="#e5333b" />
              </mesh>
              <mesh position={[0, 0, 0.007]} rotation={[0, 0, Math.PI / 2 - 1.1 + 2.2 * 0.35]}>
                <ringGeometry args={[0.012, 0.017, 24, 1, 0, 2.2 * 0.65]} />
                <meshBasicMaterial color="#4fae6a" />
              </mesh>
              <group position={[0, 0, 0.008]} rotation={[0, 0, aguja]}>
                <mesh position={[0, 0.007, 0]}>
                  <boxGeometry args={[0.0022, 0.016, 0.001]} />
                  <meshBasicMaterial color="#15161c" />
                </mesh>
              </group>
              <mesh position={[0, 0, 0.0085]}>
                <circleGeometry args={[0.0025, 12]} />
                <meshBasicMaterial color="#15161c" />
              </mesh>
            </Brota>
          )}
        </Brota>
      )}
      <SombraContacto position={[0, 0.001, 0]} w={0.3} d={0.3} o={0.35} />
    </group>
  );
};

/** manguera y boquilla (guardada o apuntando) + nube de polvo */
const ap0 = (t: number) => apuntando(t);
const MangueraYPolvo: React.FC<{t: number}> = ({t}) => {
  const ap = ap0(t);
  const sw = barrido(t);
  const boquilla: V3 = [0.12 + ap * 0.18, 0.18 + ap * 0.18, 0.04 + ap * 0.08 + sw];
  const dirApunta = new THREE.Vector3(FUEGO[0] - boquilla[0], 0.2 - boquilla[1], FUEGO[2] + sw * 0.5 - boquilla[2]).normalize();
  const des = descarga(t);
  const hayM = hayManguera(t);
  const salida: V3 = hayM ? boquilla : [0.02, CABEZA_Y + 0.07, 0.0];
  const marcaBoq = ventana(t, ev.boquilla2 - 0.4, ev.boquilla2 + 1.0, 0.2);
  return (
    <group>
      {hayM && (
        <Brota t={t} desde={ev.manguera - 0.2}>
          <Manguera puntos={[[0.03, CABEZA_Y + 0.045, 0], [0.11, CABEZA_Y - 0.02, 0.02], [0.11 + ap * 0.08, 0.3, 0.05 + ap * 0.04], [boquilla[0] - dirApunta.x * 0.03, boquilla[1] - dirApunta.y * 0.03, boquilla[2] - dirApunta.z * 0.03], boquilla]} />
          <group position={boquilla} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ap > 0.5 ? dirApunta : new THREE.Vector3(0, -1, 0))}>
            <mesh position={[0, 0.015, 0]}>
              <cylinderGeometry args={[0.008, 0.016, 0.04, 16]} />
              <meshToonMaterial color={marcaBoq > 0.2 ? '#ffd34d' : '#2b2d33'} gradientMap={gradiente()} />
            </mesh>
          </group>
        </Brota>
      )}
      {/* nube de polvo */}
      {des > 0.02 &&
        Array.from({length: 22}, (_, i) => {
          const u = (t * 1.3 + i / 22) % 1;
          // apuntado: va a la base del fuego; sin manguera: sale para todos lados
          const a = rnd(i) * Math.PI * 2;
          const libre = !hayM || ap < 0.5;
          const v: V3 = libre ? [Math.cos(a) * 0.4, 0.15 + rnd(i + 2) * 0.35, Math.sin(a) * 0.4] : [dirApunta.x * 0.55 + (rnd(i + 3) - 0.5) * 0.08, dirApunta.y * 0.55 + (rnd(i + 5) - 0.5) * 0.05, dirApunta.z * 0.55 + (rnd(i + 7) - 0.5) * 0.08];
          return (
            <mesh key={i} position={[salida[0] + v[0] * u, salida[1] + v[1] * u - (libre ? 0.2 * u * u : 0), salida[2] + v[2] * u]}>
              <sphereGeometry args={[0.012 + u * 0.035, 12, 8]} />
              <meshToonMaterial color="#fffbe8" gradientMap={gradiente()} transparent opacity={des * (1 - u) * 0.85} depthWrite={false} />
            </mesh>
          );
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
      shadow-camera-left={-1.2}
      shadow-camera-right={1.2}
      shadow-camera-top={1.2}
      shadow-camera-bottom={-1.2}
      shadow-bias={-0.0004}
      shadow-radius={4}
    />
    <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
    <Bodega />
    <Fuego t={t} />
    <Pieza t={t} desde={ev.tanque - 0.2} dir={[-0.4, 0.4, 1]} caida={0.3}>
      <Extintor t={t} />
      <MangueraYPolvo t={t} />
    </Pieza>
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.tanque - 0.2, 'tanque de metal', false],
  [ev.polvo1 - 0.2, 'polvo que apaga el fuego', false],
  [ev.extintor1 - 0.4, 'ya tienes un extintor', false],
  [ev.pero1 + 0.2, 'el polvo no sale solo', true],
  [ev.gas1 - 0.2, 'gas a presión', false],
  [ev.impulsor - 0.5, 'el gas impulsor', false],
  [ev.escapa1 - 0.3, 'se escapa todo de una vez', true],
  [ev.valvula - 0.3, 'válvula con palanca', false],
  [ev.aprietas1 - 0.3, 'la aprietas y abre', false],
  [ev.manija1 - 0.4, 'la manija', false],
  [ev.aprieta - 0.4, '¿sin querer?', true],
  [ev.vacia - 0.2, '¡se vacía!', true],
  [ev.pasador - 0.3, 'un pasador de metal', false],
  [ev.sello - 0.3, 'sello de plástico', false],
  [ev.seguro1 - 0.4, 'el seguro', false],
  [ev.lados - 0.8, 'sale para todos lados', true],
  [ev.manguera - 0.3, 'manguera con boquilla', false],
  [ev.base1 - 0.5, 'a la base del fuego', false],
  [ev.llamas - 0.8, 'no a las llamas', true],
  [ev.boquilla2 - 0.5, 'la boquilla', false],
  [ev.anos - 0.8, 'el gas se escapa con los años', true],
  [ev.reloj - 0.3, 'un reloj con aguja', false],
  [ev.verde1 - 0.2, 'verde: tiene presión', false],
  [ev.rojo - 0.2, 'rojo: ya no sirve', true],
  [ev.manometro - 0.5, 'el manómetro', false],
  [ev.aceite - 0.4, 'aceite o eléctrico', true],
  [ev.empeora - 0.6, 'el agua lo empeora', true],
  [ev.etiqueta - 0.3, 'la etiqueta trae letras', false],
  [ev.abc - 0.4, 'ABC sirve para los tres', false],
  [ev.revisa - 0.2, 'revisa tu extintor', false],
  [ev.verde2 - 0.6, '¿no está en verde? no sirve', true],
  [ev.jalas - 0.2, '1. jala el seguro', false],
  [ev.apuntas - 0.2, '2. apunta a la base', false],
  [ev.aprietas2 - 0.2, '3. aprieta la manija', false],
  [ev.barres - 0.2, '4. barre de lado a lado', false],
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
  if (t < ev.gas1) return null;
  const p = presion(t);
  const f = fuego(t);
  return (
    <>
      <Termometro x={950} valor={p} color={p < 0.3 ? '#e5333b' : '#4fae6a'} arriba={p < 0.3 ? '¡!' : ''} colorArriba="#e5333b" nombre="presión" />
      <Termometro x={830} valor={f} color="#ff6a1f" arriba="" nombre="fuego" />
    </>
  );
};
/** sartén con aceite + agua = llamarada (recuadro) */
const Aceite: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.aceite - 0.4;
  const b = ev.asi6 - 0.1;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const boom = r(t, ev.empeora - 0.4, 0.4);
  return (
    <div style={{position: 'absolute', left: 190, top: 1100, width: 700, height: 380, borderRadius: 36, background: '#fff7ea', border: '6px solid #15161c', opacity: o, transform: `scale(${0.85 + 0.15 * s})`, overflow: 'hidden'}}>
      {/* sartén */}
      <div style={{position: 'absolute', left: 60, top: 270, width: 300, height: 50, borderRadius: '0 0 60px 60px', background: '#3a3e48', border: '6px solid #15161c'}} />
      <div style={{position: 'absolute', left: 350, top: 280, width: 120, height: 22, borderRadius: 11, background: '#2b2d33', border: '5px solid #15161c'}} />
      {/* flamas */}
      {Array.from({length: 5}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 90 + i * 50, bottom: 110, width: 50, height: 80 + boom * 160 + Math.sin(t * 9 + i) * 15, borderRadius: '50% 50% 40% 40%', background: 'linear-gradient(#ffe14d, #ff6a1f)', border: '4px solid #15161c'}} />
      ))}
      {/* gota de agua */}
      {boom < 0.9 && <div style={{position: 'absolute', left: 190, top: 40 + r(t, a + 0.5, 1.0) * 160, width: 40, height: 52, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: '#3fa9f5', border: '5px solid #15161c'}} />}
      {/* rayo de enchufe */}
      <div style={{position: 'absolute', right: 70, top: 110, width: 140, height: 140, borderRadius: 30, background: '#ffd34d', border: '6px solid #15161c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 90}}>⚡</div>
    </div>
  );
};
/** letras A B C (recuadro) */
const Letras: React.FC<{t: number}> = ({t}) => {
  const a = ev.a - 0.3;
  const b = ev.revisa - 0.1;
  if (!entre(t, a, b)) return null;
  const o = interpolate(t, [a, a + 0.3, b - 0.3, b], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fila = (letra: string, color: string, txt: string, desde: number) => {
    const k = r(t, desde, 0.3);
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 24, opacity: k, transform: `translateX(${(1 - k) * 60}px)`}}>
        <div style={{width: 90, height: 90, borderRadius: 18, background: color, border: '6px solid #15161c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 64, color: '#ffffff'}}>{letra}</div>
        <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 46, color: '#15161c'}}>{txt}</div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: 120, top: 1080, display: 'flex', flexDirection: 'column', gap: 16, padding: 28, borderRadius: 34, background: 'rgba(255,255,255,0.92)', border: '6px solid #15161c', opacity: o}}>
      {fila('A', '#4fae6a', 'madera y papel', ev.a - 0.2)}
      {fila('B', '#e5333b', 'líquidos', ev.liquidos - 0.6)}
      {fila('C', '#3b7dd8', 'eléctricos', ev.electricos - 0.6)}
    </div>
  );
};

export const ExtintorVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#d6e2ee'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.01, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(30,40,55,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <Aceite t={t} />
      <Letras t={t} />
      <Audio src={staticFile('extintor/voz.wav')} />
      <Audio src={staticFile('extintor/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_EXTINTOR = (datos as any).duration as number;
void Caja;
