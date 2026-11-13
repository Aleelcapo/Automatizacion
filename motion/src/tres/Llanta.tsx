import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/llanta.json';
import {Caja, Cilindro, Esfera, GROSOR, gradiente, Papel, Redondeada, SombraContacto, Torno} from './toon';
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
  aro: T('aro'),
  hule1: T('hule', 1),
  rueda: T('rueda'),
  inflas: T('inflas'),
  llanta1: T('llanta', 1),
  pero1: T('pero', 1),
  escapa: T('escapa'),
  valvula1: T('válvula', 1),
  resorte: T('resorte'),
  entrar: T('entrar'),
  valvula2: T('válvula', 2),
  pero2: T('pero', 2),
  estira: T('estira'),
  revienta: T('revienta'),
  peso: T('peso'),
  capas: T('capas'),
  acero: T('acero'),
  tela: T('tela'),
  cuerdas: T('cuerdas'),
  pero3: T('pero', 3),
  llueve: T('llueve'),
  lisa: T('lisa'),
  agua1: T('agua', 1),
  patina: T('patina'),
  asi3: T('así', 3),
  canales1: T('canales', 1),
  lados: T('lados'),
  disparada: T('disparada'),
  dibujo: T('dibujo'),
  pero4: T('pero', 4),
  bloques: T('bloques'),
  resbalan: T('resbalan'),
  rayitas: T('rayitas'),
  agarran: T('agarran'),
  laminillas: T('laminillas'),
  pero5: T('pero', 5),
  gasta1: T('gasta', 1),
  topes1: T('topes', 1),
  gasta2: T('gasta', 2),
  sirve: T('sirve'),
  desgaste: T('desgaste'),
  pero6: T('pero', 6),
  falta: T('falta'),
  aplasta: T('aplasta'),
  calienta: T('calienta'),
  reventar: T('reventar'),
  asi6: T('así', 6),
  puerta: T('puerta'),
  presion: T('presión'),
  revisala: T('revísala'),
  si2: T('si', 3),
  topes2: T('topes', 2),
  cambiala: T('cámbiala'),
  lluvia: T('lluvia'),
  agua4: T('agua', 3),
};

// ---------- geometría (eje de la llanta = z, centro a 0.345 sobre el piso) ----------
const CY = 0.345;
const RB = 0.322; // base de la banda
const H0 = 0.02; // alto de los bloques nuevos
const CORTE_C = 0.9; // centro de la cuña (ángulo en el plano xy; 0 = derecha)
const PERFIL: [number, number][] = [
  [0.205, -0.085],
  [0.215, -0.1],
  [0.27, -0.112],
  [0.305, -0.105],
  [0.322, -0.09],
  [0.325, 0],
  [0.322, 0.09],
  [0.305, 0.105],
  [0.27, 0.112],
  [0.215, 0.1],
  [0.205, 0.085],
  [0.215, 0.085],
  [0.265, 0.098],
  [0.296, 0.09],
  [0.308, 0.078],
  [0.31, 0],
  [0.308, -0.078],
  [0.296, -0.09],
  [0.265, -0.098],
  [0.215, -0.085],
];
const AIRE: [number, number][] = [
  [0.205, -0.085],
  [0.215, -0.085],
  [0.265, -0.098],
  [0.296, -0.09],
  [0.308, -0.078],
  [0.31, 0],
  [0.308, 0.078],
  [0.296, 0.09],
  [0.265, 0.098],
  [0.215, 0.085],
  [0.205, 0.085],
];
const banda = (r0: number, r1: number, a: number): [number, number][] => [
  [r0, -a],
  [r1, -a],
  [r1, a],
  [r0, a],
];
const PLIEGUE: [number, number][] = [
  [0.21, -0.088],
  [0.266, -0.1],
  [0.298, -0.093],
  [0.311, -0.08],
  [0.313, 0],
  [0.311, 0.08],
  [0.298, 0.093],
  [0.266, 0.1],
  [0.21, 0.088],
  [0.212, 0.092],
  [0.267, 0.104],
  [0.3, 0.097],
  [0.3145, 0.082],
  [0.3165, 0],
  [0.3145, -0.082],
  [0.3, -0.097],
  [0.267, -0.104],
  [0.212, -0.092],
];
const COLS = [-0.068, -0.0225, 0.0225, 0.068];
const NB = 40;
const visible = (t: number, desde: number) => t < 0.75 || t >= desde;

// ---------- estados ----------
const corte = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.inflas - 0.4, ev.pero2, 0.4), ventana(t, ev.capas - 0.4, ev.pero3 + 0.2, 0.4)));
const inflado = (t: number) => {
  if (t < 0.75) return 1;
  let k = r(t, ev.inflas - 0.2, 1.0);
  k -= 0.5 * r(t, ev.escapa - 0.3, 1.5) * (1 - r(t, ev.entrar - 0.2, 0.8));
  k -= 0.45 * r(t, ev.falta - 0.2, 1.0) * (1 - r(t, ev.asi6 + 0.4, 0.8));
  return cl(k);
};
const globo = (t: number) => (t < 0.75 ? 0 : r(t, ev.estira - 0.3, 1.2) * (1 - r(t, ev.revienta, 0.05)));
const reventada = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.revienta, ev.capas - 0.2, 0.05));
const hayDibujo = (t: number) => visible(t, ev.canales1 - 0.2);
const hayLaminillas = (t: number) => visible(t, ev.rayitas - 0.2);
const hayTopes = (t: number) => visible(t, ev.topes1 - 0.2);
const desgaste = (t: number) => (t < 0.75 ? 0 : Math.max(r(t, ev.gasta1 - 0.3, 2.0) * 0.4, r(t, ev.gasta2 - 0.2, 1.0) * 0.62) * (1 - r(t, ev.pero6, 0.5)) + r(t, ev.si2, 1.0) * 0.62);
const lluvia = (t: number) => (t < 0.75 ? 0 : Math.max(ventana(t, ev.llueve - 0.3, ev.pero4 + 0.3, 0.5), ventana(t, ev.lluvia - 0.5, 99, 0.4)));
const flota = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.agua1 - 0.4, ev.asi3 + 0.4, 0.4) + ventana(t, ev.agua4 - 0.4, 99, 0.3) * 0.7);
const chorros = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.lados - 0.3, ev.pero4, 0.3));
const calor = (t: number) => (t < 0.75 ? 0 : ventana(t, ev.calienta - 0.4, ev.asi6 + 0.3, 0.3));
const tramo = (t: number, a: number, b: number) => cl((t - a) / (b - a)) * (b - a);
const giroLlanta = (t: number) => {
  // rueda solo en la calle mojada y al mostrar el dibujo (fuera de los cortes)
  return -1.2 * (tramo(t, ev.llueve - 0.3, ev.rayitas) + tramo(t, ev.lluvia - 0.5, 99));
};

// ---------- cámara ----------
type K = [number, number, number, number, V3];
const CAMARA: K[] = [
  [0.0, 3.2, 0.6, 0.3, [0, 0.33, 0]],
  [1.0, 2.5, 0.5, 0.22, [0, 0.33, 0]],
  [5.6, 1.45, 0.75, 0.5, [0.12, 0.5, 0]],
  [13.2, 2.6, 0.55, 0.2, [0, 0.4, 0]],
  [17.6, 1.3, 0.75, 0.5, [0.14, 0.52, 0]],
  [23.3, 2.6, 0.4, 0.12, [0, 0.3, 0]],
  [30.6, 1.8, 0.5, 0.35, [0.05, 0.25, 0]],
  [39.0, 0.65, 0.35, 0.15, [0.0, 0.05, 0.02]],
  [48.5, 0.75, 0.3, 0.3, [0.0, 0.62, 0]],
  [62.2, 2.5, 0.5, 0.15, [0, 0.33, 0]],
  [73.0, 0.8, 0.3, 0.35, [0.0, 0.6, 0]],
  [76.5, 2.6, 0.45, 0.15, [0, 0.33, 0]],
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
  const s = Math.max(ventana(t, ev.revienta - 0.03, ev.revienta + 0.6, 0.05), ventana(t, ev.reventar - 0.1, ev.reventar + 0.5, 0.05) * 0.5);
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
const MatTinta: React.FC = () => <meshBasicMaterial color="#15161c" side={THREE.BackSide} />;

/** pieza de revolución alrededor del eje z, con cuña cortada (k = 0 entera) */
const Seccion: React.FC<{perfil: [number, number][]; k: number; color: string; colorCorte: string; opacity?: number; contorno?: boolean; brillo?: number; emis?: string; delta?: number}> = ({
  perfil,
  k,
  color,
  colorCorte,
  opacity = 1,
  contorno = true,
  brillo = 0,
  emis,
  delta = 0,
}) => {
  const ancho = 1.0 * k;
  // ángulo φ del torno: θ (plano xy) = φ - π/2
  const ini = Math.PI / 2 + CORTE_C + ancho / 2;
  const largo = Math.PI * 2 - ancho;
  const clave = JSON.stringify(perfil) + Math.round(k * 60);
  const g = useMemo(() => {
    const pts = perfil.map(([x, y]) => new THREE.Vector2(x, y));
    const cuerpo = new THREE.LatheGeometry(pts, 120, ini, largo);
    const tinta = contorno
      ? new THREE.LatheGeometry(
          perfil.map(([x, y]) => new THREE.Vector2(x + GROSOR * 0.8, y)),
          120,
          ini - (k > 0.01 ? 0.003 : 0),
          largo + (k > 0.01 ? 0.006 : 0),
        )
      : null;
    const cara = new THREE.ShapeGeometry(new THREE.Shape(pts));
    return {cuerpo, tinta, cara};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const tr = opacity < 0.98;
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={g.cuerpo} castShadow={!tr} receiveShadow>
        <meshToonMaterial color={color} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={tr} opacity={opacity} depthWrite={!tr} emissive={emis ?? color} emissiveIntensity={brillo} />
      </mesh>
      {g.tinta && (
        <mesh geometry={g.tinta}>
          <MatTinta />
        </mesh>
      )}
      {k > 0.01 &&
        [ini - delta, ini + largo + delta].map((a, i) => (
          <group key={i} rotation={[0, a - Math.PI / 2, 0]}>
            <mesh geometry={g.cara}>
              <meshToonMaterial color={colorCorte} gradientMap={gradiente()} side={THREE.DoubleSide} transparent={tr} opacity={opacity} depthWrite={!tr} />
            </mesh>
          </group>
        ))}
    </group>
  );
};
const enCuna = (theta: number, k: number) => {
  if (k <= 0.01) return false;
  let d = theta - CORTE_C;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) < 0.5 * k + 0.05;
};

// ---------- escenario: calle ----------
const Calle: React.FC<{t: number}> = ({t}) => {
  const ll = lluvia(t);
  return (
    <group>
      <mesh position={[0, 1.4, -1.2]}>
        <planeGeometry args={[9, 4]} />
        <meshBasicMaterial color={new THREE.Color('#bfe6ff').lerp(new THREE.Color('#8fa3b8'), ll).getStyle()} />
      </mesh>
      {/* edificios */}
      {[-1.6, -0.9, -0.2, 0.6, 1.3].map((x, i) => (
        <group key={x} position={[x, 0, -1.1]}>
          <Caja w={0.6} h={0.9 + (i % 3) * 0.35} d={0.3} position={[0, (0.9 + (i % 3) * 0.35) / 2, 0]} color={['#f2a07a', '#f6d6a8', '#9fcbbf', '#e9b4c8', '#c9b6ff'][i]} />
          {Array.from({length: 6}, (_, k) => (
            <Caja key={k} w={0.1} h={0.12} d={0.01} position={[-0.15 + (k % 3) * 0.15, 0.3 + Math.floor(k / 3) * 0.3, 0.155]} color="#ffffff" contorno={false} />
          ))}
        </group>
      ))}
      {/* banqueta */}
      <Caja w={9} h={0.1} d={0.5} position={[0, 0.05, -0.75]} color="#d9d4c8" />
      {/* asfalto */}
      <mesh position={[0, 0, 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 2.2]} />
        <meshToonMaterial color={new THREE.Color('#5b616b').lerp(new THREE.Color('#3f4a5a'), ll).getStyle()} gradientMap={gradiente()} />
      </mesh>
      {[-2, -1.2, -0.4, 0.4, 1.2, 2].map((x) => (
        <mesh key={x} position={[x - ((t * 0.0) % 0.8), 0.001, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.45, 0.05]} />
          <meshBasicMaterial color="#f2c14e" />
        </mesh>
      ))}
      {/* capa de agua */}
      {ll > 0.02 && (
        <mesh position={[0, 0.003 + flota(t) * 0.008, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[9, 2.2]} />
          <meshBasicMaterial color="#7fc6ff" transparent opacity={0.4 * ll} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

/** gotas de lluvia */
const Lluvia: React.FC<{t: number}> = ({t}) => {
  const ll = lluvia(t);
  if (ll <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 70}, (_, i) => {
        const u = (t * 1.6 + rnd(i)) % 1;
        return (
          <mesh key={i} position={[-1.2 + rnd(i + 3) * 2.4, 1.5 - u * 1.5, -0.6 + rnd(i + 7) * 1.4]}>
            <capsuleGeometry args={[0.0025, 0.04, 3, 6]} />
            <meshBasicMaterial color="#d9f2ff" transparent opacity={ll * 0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- la llanta ----------
const Rin: React.FC = () => (
  <group>
    <Seccion perfil={[[0.13, -0.09], [0.2, -0.09], [0.205, -0.1], [0.205, 0.1], [0.2, 0.09], [0.13, 0.09]]} k={0} color="#c9ced8" colorCorte="#9aa4b0" />
    <mesh position={[0, 0, 0.06]}>
      <circleGeometry args={[0.135, 48]} />
      <meshToonMaterial color="#aeb7c2" gradientMap={gradiente()} />
    </mesh>
    {Array.from({length: 5}, (_, i) => {
      const a = (i / 5) * Math.PI * 2;
      return <Redondeada key={i} w={0.035} h={0.12} d={0.02} radio={0.008} position={[Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.07]} rotation={[0, 0, a - Math.PI / 2]} color="#e8edf2" />;
    })}
    <Cilindro r={0.04} h={0.04} position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]} color="#5a6170" />
    {Array.from({length: 5}, (_, i) => {
      const a = (i / 5) * Math.PI * 2 + 0.6;
      return <Esfera key={i} r={0.006} position={[Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.096]} color="#c9ced8" contorno={false} />;
    })}
  </group>
);

/** bloques del dibujo (con laminillas y topes) */
const Dibujo: React.FC<{t: number; k: number}> = ({t, k}) => {
  const lisa = !hayDibujo(t);
  const crece = t < 0.75 ? 1 : r(t, ev.canales1 - 0.2, 1.2);
  const h = H0 * (1 - desgaste(t));
  const marcaTopes = ventana(t, ev.sirve - 0.6, ev.desgaste + 1.4, 0.2) + ventana(t, ev.topes2 - 0.4, ev.cambiala + 1.0, 0.2);
  const lam = hayLaminillas(t) ? (t < 0.75 ? 1 : r(t, ev.rayitas - 0.2, 0.6)) : 0;
  const mueve = t < 0.75 ? 0 : ventana(t, ev.bloques - 0.3, ev.rayitas - 0.2, 0.3);
  const topes = hayTopes(t) ? (t < 0.75 ? 1 : r(t, ev.topes1 - 0.2, 0.5)) : 0;
  const color = calor(t) > 0.1 ? new THREE.Color('#2b2d33').lerp(new THREE.Color('#b8442b'), calor(t) * 0.7).getStyle() : '#2b2d33';
  if (lisa) {
    return <Seccion perfil={banda(RB - 0.004, RB + H0, 0.09)} k={k} color={color} colorCorte="#3a3e48" />;
  }
  return (
    <group>
      {/* base lisa bajo los bloques mientras crecen */}
      {crece < 0.99 && <Seccion perfil={banda(RB - 0.004, RB + H0 * (1 - crece), 0.09)} k={k} color={color} colorCorte="#3a3e48" contorno={false} />}
      {Array.from({length: NB}, (_, i) => {
        const th = (i / NB) * Math.PI * 2;
        if (enCuna(th, k)) return null;
        const dth = ((Math.PI * 2) / NB) * 0.74;
        const hh = h * crece;
        const rr = RB + hh / 2;
        // los bloques de abajo (tocando el piso) se tuercen cuando "se mueven"
        const abajo = Math.cos(th + Math.PI / 2) > 0.93 ? 1 : 0;
        const tuerce = abajo * mueve * 0.25 * Math.sin(t * 9 + i);
        return (
          <group key={i} rotation={[0, 0, th]}>
            {COLS.map((a, j) => (
              <group key={j} position={[rr, 0, a]} rotation={[0, 0, tuerce]}>
                <mesh>
                  <boxGeometry args={[hh, RB * dth, 0.038]} />
                  <meshToonMaterial color={color} gradientMap={gradiente()} />
                </mesh>
                <mesh>
                  <boxGeometry args={[hh + 0.003, RB * dth + 0.003, 0.041]} />
                  <MatTinta />
                </mesh>
                {lam > 0.01 &&
                  [-0.3, 0, 0.3].map((f) => (
                    <mesh key={f} position={[hh / 2 + 0.0006, f * RB * dth, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <planeGeometry args={[0.032 * lam, 0.0018]} />
                      <meshBasicMaterial color="#9aa4b0" />
                    </mesh>
                  ))}
              </group>
            ))}
            {/* topes dentro de los canales */}
            {topes > 0.01 &&
              i % 5 === 0 &&
              [-0.045, 0, 0.045].map((a) => (
                <mesh key={a} position={[RB + H0 * 0.19, 0, a]} scale={topes}>
                  <boxGeometry args={[H0 * 0.38, RB * dth * 0.8, 0.009]} />
                  <meshToonMaterial color={marcaTopes > 0.2 ? '#e5333b' : '#5a6170'} gradientMap={gradiente()} />
                </mesh>
              ))}
          </group>
        );
      })}
      {/* fondo de los canales */}
      <Seccion perfil={banda(RB - 0.004, RB, 0.09)} k={k} color="#1f2126" colorCorte="#3a3e48" contorno={false} />
    </group>
  );
};

const Llanta: React.FC<{t: number}> = ({t}) => {
  const k = corte(t);
  const inf = inflado(t);
  const gl = globo(t);
  const rv = reventada(t);
  const cuerdas = visible(t, ev.capas - 0.2);
  const marcaCuerdas = ventana(t, ev.cuerdas - 0.4, ev.cuerdas + 1.2, 0.2);
  const ca = calor(t);
  const color = new THREE.Color('#2f3138').lerp(new THREE.Color('#c0482e'), ca * 0.6).lerp(new THREE.Color('#5a5f69'), gl * 0.5).getStyle();
  if (rv > 0.5) return null;
  const aire = t < 0.75 ? 1 : r(t, ev.inflas - 0.2, 1.0);
  return (
    <group scale={[1 + gl * 0.12, 1 + gl * 0.12, 1 + gl * 0.35]}>
      <Seccion perfil={PERFIL} k={k} color={color} colorCorte="#4a4f5b" brillo={ca * 0.25} emis="#ff4a1f" />
      {/* aire adentro */}
      {k > 0.02 && aire > 0.02 && <Seccion perfil={AIRE} k={k} color="#a8dcff" colorCorte="#a8dcff" opacity={0.35 * aire * inf} contorno={false} />}
      {/* cuerdas: cinturones de acero y pliegue de tela */}
      {cuerdas && k > 0.02 && (
        <>
          <Seccion perfil={banda(0.3145, 0.3175, 0.085)} k={k} color="#9aa4b0" colorCorte={marcaCuerdas > 0.2 ? '#ffd34d' : '#c9ced8'} contorno={false} delta={-0.004} />
          <Seccion perfil={banda(0.319, 0.322, 0.08)} k={k} color="#9aa4b0" colorCorte={marcaCuerdas > 0.2 ? '#ffd34d' : '#c9ced8'} contorno={false} delta={-0.004} />
          <Seccion perfil={PLIEGUE} k={k} color="#e8c27a" colorCorte={marcaCuerdas > 0.2 ? '#ffe680' : '#e8c27a'} contorno={false} delta={-0.004} />
        </>
      )}
      <Dibujo t={t} k={k} />
      {/* letras en el costado */}
      <mesh position={[0, 0, 0.1125]}>
        <ringGeometry args={[0.25, 0.258, 64]} />
        <meshBasicMaterial color="#5a5f69" />
      </mesh>
    </group>
  );
};

/** válvula (en el rin) */
const Valvula: React.FC<{t: number}> = ({t}) => {
  if (!visible(t, ev.valvula1 - 0.2)) return null;
  const marca = ventana(t, ev.valvula2 - 0.4, ev.valvula2 + 1.2, 0.2);
  const {fps} = useVideoConfig();
  const s = t < 0.75 ? 1 : spring({frame: (t - ev.valvula1 + 0.2) * fps, fps, config: {damping: 9, stiffness: 190, mass: 0.6}});
  return (
    <group position={[0.0, 0.185, 0.08]} rotation={[0.5, 0, 0]} scale={s}>
      <Cilindro r={0.008} h={0.05} position={[0, 0.025, 0]} color="#2b2d33" />
      <Cilindro r={0.0065} h={0.014} position={[0, 0.056, 0]} color={marca > 0.2 ? '#ffd34d' : '#c9ced8'} />
    </group>
  );
};

/** fuga de aire y aire entrando */
const AireFlujo: React.FC<{t: number}> = ({t}) => {
  const fuga = t < 0.75 ? 0 : ventana(t, ev.escapa - 0.3, ev.valvula1, 0.3);
  const entra = t < 0.75 ? 0 : ventana(t, ev.entrar - 0.6, ev.valvula2, 0.3);
  if (fuga + entra <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 10}, (_, i) => {
        const u = (t * 1.1 + i / 10) % 1;
        const p: V3 = fuga > entra ? [0.05 + u * 0.25, 0.2 + u * 0.15 + rnd(i) * 0.05, 0.1 + u * 0.1] : [0.0 + (1 - u) * 0.0, 0.25 + (1 - u) * 0.3, 0.11 + (1 - u) * 0.15];
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.01 + (fuga > entra ? u : 1 - u) * 0.02, 12, 8]} />
            <meshToonMaterial color="#d9f2ff" gradientMap={gradiente()} transparent opacity={Math.max(fuga, entra) * Math.sin(u * Math.PI) * 0.7} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** flecha del peso del carro */
const Peso: React.FC<{t: number}> = ({t}) => {
  const on = t < 0.75 ? 0 : ventana(t, ev.estira, ev.capas, 0.3);
  if (on <= 0.01) return null;
  return (
    <group position={[0, 0.85 - on * 0.1, 0]} scale={on}>
      <Cilindro r={0.035} h={0.18} position={[0, 0.09, 0]} color="#e5333b" />
      <mesh rotation={[Math.PI, 0, 0]} position={[0, -0.03, 0]}>
        <coneGeometry args={[0.07, 0.08, 24]} />
        <meshToonMaterial color="#e5333b" gradientMap={gradiente()} />
      </mesh>
    </group>
  );
};
/** pedazos al reventar */
const Pedazos: React.FC<{t: number}> = ({t}) => {
  const k = cl((t - ev.revienta) / 1.2);
  if (t < ev.revienta || k >= 1) return null;
  return (
    <group position={[0, CY, 0]}>
      {Array.from({length: 16}, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const d = 0.3 + k * 0.4;
        return <Caja key={i} w={0.05} h={0.02} d={0.06} position={[Math.cos(a) * d, Math.sin(a) * d - k * k * 0.3, (rnd(i) - 0.5) * 0.3]} rotation={[k * 6 + i, k * 4, 0]} color="#2f3138" />;
      })}
      <mesh>
        <sphereGeometry args={[0.2 + k * 0.4, 20, 14]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={(1 - k) * 0.5} depthWrite={false} />
      </mesh>
    </group>
  );
};

/** chorros de agua por los costados */
const Chorros: React.FC<{t: number}> = ({t}) => {
  const on = chorros(t);
  if (on <= 0.02) return null;
  return (
    <group>
      {Array.from({length: 24}, (_, i) => {
        const u = (t * 1.8 + rnd(i)) % 1;
        const lado = i % 2 ? 1 : -1;
        return (
          <mesh key={i} position={[0.06 + (rnd(i + 2) - 0.5) * 0.12, 0.01 + Math.sin(u * Math.PI) * 0.08, lado * (0.1 + u * 0.35)]}>
            <sphereGeometry args={[0.008 + u * 0.006, 8, 6]} />
            <meshBasicMaterial color="#7fc6ff" transparent opacity={on * (1 - u)} />
          </mesh>
        );
      })}
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => {
  const inf = inflado(t);
  const aplastada = 1 - inf;
  const fl = flota(t);
  const patina = t < 0.75 ? 0 : ventana(t, ev.patina - 0.3, ev.asi3 + 0.4, 0.3);
  const gira = giroLlanta(t);
  return (
    <>
      <Camara t={t} />
      <hemisphereLight args={['#fff6e6', '#8a8f99', 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[1.2, 2.4, 2.2]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-1.4}
        shadow-camera-right={1.4}
        shadow-camera-top={1.4}
        shadow-camera-bottom={-1.4}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <directionalLight position={[-2.2, 1.2, 0.8]} intensity={0.35} color="#dff1ff" />
      <Calle t={t} />
      <Lluvia t={t} />
      <SombraContacto position={[0, 0.004, 0]} w={0.8} d={0.4} o={0.35} />
      <group position={[Math.sin(t * 3) * 0.04 * patina, CY + fl * 0.02 - aplastada * 0.03, 0]} rotation={[0, patina * 0.25 * Math.sin(t * 2), 0]} scale={[1 + aplastada * 0.03, 1 - aplastada * 0.1, 1 + aplastada * 0.12]}>
        <group rotation={[0, 0, gira]}>
          <Pieza t={t} desde={ev.rueda - 0.2} dir={[0.2, 0.6, 1]} caida={0.3}>
            <Rin />
            <Valvula t={t} />
          </Pieza>
          <Pieza t={t} desde={ev.aro - 0.2} dir={[0.6, 0.6, 0.6]} caida={0.3}>
            <Llanta t={t} />
          </Pieza>
        </group>
      </group>
      <AireFlujo t={t} />
      <Peso t={t} />
      <Pedazos t={t} />
      <Chorros t={t} />
    </>
  );
};

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [ev.aro - 0.2, 'un aro de hule', false],
  [ev.inflas - 0.3, 'lo inflas con aire', false],
  [ev.llanta1 - 0.3, 'ya tienes una llanta', false],
  [ev.escapa - 0.5, 'el aire se escapa', true],
  [ev.valvula1 - 0.2, 'una válvula con resorte', false],
  [ev.entrar - 0.5, 'solo deja entrar aire', false],
  [ev.valvula2 - 0.4, 'la válvula', false],
  [ev.estira - 0.3, 'se estira como globo', true],
  [ev.revienta - 0.1, '¡revienta!', true],
  [ev.capas - 0.3, 'hilos de acero y tela', false],
  [ev.cuerdas - 0.4, 'las cuerdas', false],
  [ev.llueve - 0.2, 'cuando llueve…', true],
  [ev.agua1 - 0.6, 'se monta sobre el agua', true],
  [ev.patina - 0.3, '¡patina como en hielo!', true],
  [ev.canales1 - 0.3, 'canales profundos', false],
  [ev.disparada - 0.6, 'el agua sale disparada', false],
  [ev.dibujo - 0.4, 'el dibujo', false],
  [ev.resbalan - 0.8, 'los bloques se resbalan', true],
  [ev.rayitas - 0.3, 'rayitas finas', false],
  [ev.agarran - 0.3, 'agarran como dientes', false],
  [ev.laminillas - 0.5, 'las laminillas', false],
  [ev.gasta1 - 0.4, 'el hule se gasta', true],
  [ev.topes1 - 0.5, 'topes más bajitos', false],
  [ev.sirve - 0.6, '¡ya no sirve!', true],
  [ev.desgaste - 0.6, 'indicador de desgaste', false],
  [ev.falta - 0.3, 'si le falta aire…', true],
  [ev.calienta - 0.2, 'se aplasta y se calienta', true],
  [ev.reventar - 0.4, '¡puede reventar!', true],
  [ev.puerta - 0.3, 'en la puerta de tu carro', false],
  [ev.revisala - 0.2, 'revísala cada mes', false],
  [ev.topes2 - 0.6, '¿ya llegó a los topes?', true],
  [ev.cambiala - 0.2, '¡cámbiala!', true],
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
  if (t < ev.inflas) return null;
  const p = inflado(t) * 0.8 + globo(t) * 0.25;
  const baja = p < 0.55;
  const prof = 1 - desgaste(t);
  return (
    <>
      <Termometro x={950} valor={reventada(t) > 0.5 ? 0 : p} color={baja ? '#e5333b' : '#3fa9f5'} arriba={baja ? '¡!' : ''} colorArriba="#e5333b" nombre="aire" />
      {hayDibujo(t) && t > ev.pero5 - 0.3 && <Termometro x={830} valor={prof} color={prof < 0.45 ? '#e5333b' : '#4fae6a'} arriba="" nombre="dibujo" />}
    </>
  );
};

/** calcomanía de la puerta */
const Calcomania: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.puerta - 0.3;
  const b = ev.si2 - 0.1;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const resalta = t > ev.presion - 0.3;
  return (
    <div style={{position: 'absolute', left: 150, top: 1080, width: 780, height: 420, borderRadius: 36, background: '#3b7dd8', border: '6px solid #15161c', opacity: o, transform: `scale(${0.85 + 0.15 * s})`, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 70, background: '#2f63ad', borderRight: '6px solid #15161c'}} />
      <div style={{position: 'absolute', left: 140, top: 60, width: 520, height: 290, borderRadius: 18, background: '#fffbe8', border: '5px solid #15161c', padding: 24, boxSizing: 'border-box', fontFamily: FUENTE}}>
        <div style={{fontWeight: 900, fontSize: 36, color: '#15161c'}}>PRESIÓN DE LLANTAS</div>
        <div style={{display: 'flex', justifyContent: 'space-around', marginTop: 30}}>
          {['adelante', 'atrás'].map((x) => (
            <div key={x} style={{textAlign: 'center'}}>
              <div style={{fontWeight: 900, fontSize: 64, color: resalta ? '#e5333b' : '#15161c'}}>32</div>
              <div style={{fontWeight: 700, fontSize: 26, color: '#15161c'}}>psi · {x}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** válvula por dentro (recuadro) */
const ValvulaDentro: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const a = ev.resorte - 0.4;
  const b = ev.pero2 - 0.1;
  if (!entre(t, a, b)) return null;
  const s = spring({frame: (t - a) * fps, fps, config: {damping: 13, stiffness: 160}});
  const o = interpolate(t, [b - 0.3, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const entra = t > ev.entrar - 0.6;
  const abre = entra ? 18 * (0.5 + 0.5 * Math.sin(t * 8)) : 0;
  return (
    <div style={{position: 'absolute', left: 300, top: 1060, width: 480, height: 460, borderRadius: 36, background: '#fff7ea', border: '6px solid #15161c', opacity: o, transform: `scale(${0.85 + 0.15 * s})`, overflow: 'hidden'}}>
      <svg width={480} height={460}>
        <rect x={170} y={30} width={140} height={400} rx={20} fill="#2b2d33" />
        <rect x={195} y={30} width={90} height={400} fill="#d9f2ff" />
        {/* resorte */}
        <path d={Array.from({length: 11}, (_, i) => `${i === 0 ? 'M' : 'L'}${i % 2 ? 205 : 275},${120 + i * (14 - abre / 10)}`).join(' ')} stroke="#9aa4b0" strokeWidth={8} fill="none" />
        {/* tapón */}
        <rect x={205} y={260 + abre} width={70} height={26} rx={8} fill="#e5333b" stroke="#15161c" strokeWidth={5} />
        <rect x={225} y={60} width={30} height={200 + abre} fill="#c9ced8" stroke="#15161c" strokeWidth={4} />
        {entra &&
          [0, 1, 2].map((i) => {
            const u = (t * 1.2 + i / 3) % 1;
            return <circle key={i} cx={240 + (i - 1) * 22} cy={40 + u * 380} r={12} fill="#7fc6ff" opacity={1 - u} />;
          })}
      </svg>
      <div style={{position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', fontFamily: FUENTE, fontWeight: 800, fontSize: 30, color: '#15161c'}}>{entra ? 'el aire entra ↓' : 'el resorte la cierra'}</div>
    </div>
  );
};

export const LlantaVideo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#bfe6ff'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFSoftShadowMap}} camera={{fov: 40, near: 0.02, far: 40, position: [1, 0.8, 1.9]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(30,40,55,0.22) 100%)'}} />
      <Etiqueta t={t} />
      <Medidores t={t} />
      <ValvulaDentro t={t} />
      <Calcomania t={t} />
      <Audio src={staticFile('llanta/voz.wav')} />
      <Audio src={staticFile('llanta/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_LLANTA = (datos as any).duration as number;
void Torno;
