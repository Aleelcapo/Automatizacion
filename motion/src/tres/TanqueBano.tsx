import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/tanque_bano.json';
import {AristasCaja, Caja, Cilindro, Esfera, Papel, texturaBaldosas, Toro, Tubo, MatToon} from './toon';
import {FUENTE} from '../serie/tema';

// ---------- tiempos de palabras ----------
type W = {t: number; e: number; w: string; a?: string[]};
const PALABRAS: W[] = (datos as any).beats.flatMap((b: any) => b.words);
const lim = (x: string) => x.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');
/** Segundo en que se dice la palabra `w` (n = número de aparición, desde 1). */
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
/** 0→1 entre a y a+dur. */
const r = (t: number, a: number, dur: number) => suave((t - a) / dur);
const entre = (t: number, a: number, b: number) => t >= a && t < b;

// ---------- geometría del baño (metros) ----------
const TQ = {x: 0, z: -0.32, base: 0.52, alto: 0.36, w: 0.5, d: 0.2};
const HOYO: [number, number] = [0.05, -0.32];
const VAL_X = -0.17;
const TUBO_X = 0.15;
const TUBO_TOPE = 0.82;
const NIVEL_TUBO = (TUBO_TOPE - TQ.base) / TQ.alto;

// ---------- guion de animación ----------
const ev = {
  tanque: T('tanque') + 0.1,
  agua: T('agua'),
  taza: T('taza'),
  hoyo: T('hoyo'),
  golpe: T('golpe.'),
  tapas: T('tapas'),
  mano: T('mano'),
  aguaMano: T('agua', 3),
  cadenita: T('cadenita'),
  palanca: T('palanca'),
  manija: T('manija.'),
  llave: T('llave'),
  valvula: T('válvula.'),
  parar: T('parar.'),
  boya: T('boya.'),
  cierra: T('cierra'),
  jalar: T('jalar,'),
  cano: T('caño'),
  chorrito: T('chorrito'),
  manguerita: T('manguerita'),
  atora: T('atora'),
  borde: T('borde.', 1),
  tubo: T('tubo', 1),
  sube: T('sube', 3),
  rebose: T('rebose.'),
  alto: T('alto.'),
  bajalo: T('bájalo'),
  dinero: T('dinero.'),
};

/** Nivel del agua del tanque (0..1) en el segundo t. */
const nivel = (t: number): number => {
  const tramos: [number, number, number, number][] = [
    // [inicio, fin, desde, hasta]
    [ev.agua, ev.agua + 1.0, 0, 0.75],
    [ev.golpe - 0.6, ev.golpe + 0.1, 0.75, 0],
    [ev.tapas + 0.7, ev.tapas + 2.0, 0, 0.75],
    [ev.manija - 0.1, ev.manija + 0.7, 0.75, 0],
    [ev.valvula + 0.2, ev.parar + 0.2, 0, 0.92],
    [ev.boya - 0.1, ev.boya + 0.5, 0.92, 0.2],
    [ev.boya + 0.7, ev.cierra, 0.2, 0.72],
    [ev.jalar - 0.1, ev.jalar + 0.7, 0.72, 0],
    [ev.jalar + 1.2, ev.chorrito - 0.5, 0, 0.72],
    [ev.atora, ev.borde, 0.72, 1.0],
    [ev.tubo + 0.6, ev.tubo + 1.4, 1.0, NIVEL_TUBO],
    [ev.bajalo + 0.6, ev.bajalo + 1.4, NIVEL_TUBO, NIVEL_TUBO - 0.05],
  ];
  let v = 0;
  for (const [a, b, d, h] of tramos) {
    if (t >= a) v = t >= b ? h : d + (h - d) * suave((t - a) / (b - a));
  }
  return v;
};
const palancaAbajo = (t: number) => Math.max(r(t, ev.manija - 0.3, 0.25) * (1 - r(t, ev.manija + 0.7, 0.3)), r(t, ev.boya - 0.3, 0.2) * (1 - r(t, ev.boya + 0.5, 0.3)), r(t, ev.jalar - 0.3, 0.2) * (1 - r(t, ev.jalar + 0.7, 0.3)));
const valvulaAbierta = (t: number) => entre(t, ev.valvula + 0.2, ev.parar + 0.2) || entre(t, ev.boya + 0.7, ev.cierra) || entre(t, ev.jalar + 1.2, ev.chorrito - 0.5) || entre(t, ev.atora, ev.bajalo + 0.6);
const aguaTaza = (t: number) => 1 - 0.8 * r(t, ev.jalar, 0.8) + 0.8 * r(t, ev.chorrito, 2.5);
const desborda = (t: number) => entre(t, ev.borde - 0.2, ev.tubo + 1.0);
const rebosando = (t: number) => entre(t, ev.tubo + 1.2, ev.bajalo + 0.8);

// ---------- cámara ----------
type K = [number, [number, number, number], [number, number, number]];
const CAMARA: K[] = [
  [0.0, [1.9, 1.5, 2.6], [0, 0.55, -0.1]],
  [1.6, [1.35, 1.25, 1.95], [0, 0.65, -0.2]],
  [5.3, [1.25, 1.1, 1.85], [0, 0.58, -0.15]],
  [7.0, [0.9, 1.02, 1.3], [0, 0.66, -0.32]],
  [9.0, [0.5, 0.82, 0.72], [0.05, 0.56, -0.32]],
  [12.2, [0.62, 0.98, 0.95], [0.05, 0.64, -0.32]],
  [15.2, [-0.78, 1.05, 1.0], [-0.06, 0.74, -0.3]],
  [18.6, [-0.6, 0.98, 1.05], [-0.02, 0.7, -0.3]],
  [21.6, [-0.58, 0.92, 0.82], [-0.17, 0.6, -0.32]],
  [25.6, [0.3, 1.05, 1.1], [-0.05, 0.7, -0.32]],
  [29.2, [0.62, 1.0, 0.95], [-0.05, 0.72, -0.32]],
  [34.6, [1.2, 0.98, 1.45], [0, 0.48, -0.05]],
  [37.6, [0.78, 0.78, 0.98], [0, 0.38, 0.1]],
  [41.2, [0.38, 1.06, 0.95], [0.02, 0.72, -0.32]],
  [46.0, [0.82, 1.12, 1.25], [0, 0.74, -0.32]],
  [49.6, [0.58, 1.02, 0.85], [0.12, 0.72, -0.32]],
  [55.0, [0.32, 1.18, 0.78], [0.14, 0.76, -0.32]],
  [59.5, [0.78, 1.05, 1.05], [0.05, 0.76, -0.32]],
  [63.0, [0.26, 0.98, 0.72], [-0.04, 0.78, -0.32]],
  [66.5, [1.6, 1.3, 2.3], [0, 0.6, -0.15]],
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
  const ALEJA = 1.35;
  const pos = pos0.map((v, i) => obj[i] + (v - obj[i]) * ALEJA) as [number, number, number];
  pos[0] += Math.sin(t * 0.45) * 0.05;
  pos[1] += Math.sin(t * 0.33) * 0.025;
  return {pos, obj};
};

const Camara: React.FC<{t: number}> = ({t}) => {
  const cam = useThree((s) => s.camera);
  const {pos, obj} = camara(t);
  cam.position.set(...pos);
  cam.lookAt(...obj);
  return null;
};

// ---------- piezas con entrada animada ----------
/** Aparece en `desde` cayendo con rebote; en la intro (t<0.75) se ve armado y "explota". */
const Pieza: React.FC<{t: number; desde: number; dir?: [number, number, number]; caida?: number; children: React.ReactNode}> = ({t, desde, dir = [0, 1, 0], caida = 0.35, children}) => {
  const {fps} = useVideoConfig();
  if (t < 0.75) {
    const e = r(t, 0.18, 0.5);
    if (e >= 0.99) return null;
    return (
      <group position={[dir[0] * e * 1.6, dir[1] * e * 1.6, dir[2] * e * 1.6]} rotation={[e * dir[2] * 2, e * dir[0], e * dir[1]]} scale={1 - e * 0.6}>
        {children}
      </group>
    );
  }
  if (t < desde) return null;
  const s = spring({frame: (t - desde) * fps, fps, config: {damping: 11, stiffness: 160, mass: 0.7}});
  return (
    <group position={[0, (1 - s) * caida, 0]} scale={[0.6 + 0.4 * s, 0.6 + 0.4 * s, 0.6 + 0.4 * s]}>
      {children}
    </group>
  );
};

// ---------- escenografía ----------
const Cuarto: React.FC = () => {
  const piso = useMemo(() => texturaBaldosas('#d8cfc0', '#b9ae9c', 6), []);
  const pared = useMemo(() => texturaBaldosas('#cfe9df', '#b7d9cc', 5), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshToonMaterial map={piso} />
      </mesh>
      <mesh position={[0, 2.6, -0.75]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshToonMaterial color="#bfe4d6" />
      </mesh>
      <mesh position={[0, 0.3, -0.749]} receiveShadow>
        <planeGeometry args={[8, 0.6]} />
        <meshToonMaterial map={pared} />
      </mesh>
      <Caja w={8} h={0.03} d={0.03} position={[0, 0.61, -0.74]} color="#e9f5f0" contorno={false} />
      <mesh position={[-1.5, 2, 1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshToonMaterial color="#cde6dc" />
      </mesh>
      {/* puerta */}
      <Caja w={0.82} h={2.05} d={0.05} position={[-0.95, 1.025, -0.72]} color="#5b84c9" />
      <Caja w={0.92} h={0.06} d={0.07} position={[-0.95, 2.08, -0.72]} color="#f2f2ee" />
      <Esfera r={0.03} position={[-0.65, 1.0, -0.68]} color="#e8c55a" />
      {/* rollo de papel */}
      <Cilindro r={0.012} h={0.16} position={[0.55, 0.62, -0.68]} rotation={[0, 0, Math.PI / 2]} color="#c9ccd2" />
      <Cilindro r={0.06} h={0.11} position={[0.55, 0.58, -0.66]} rotation={[0, 0, Math.PI / 2]} color="#fbfbf8" />
      {/* zócalo */}
      <Caja w={8} h={0.08} d={0.02} position={[0, 0.04, -0.74]} color="#b8d6ca" contorno={false} />
    </group>
  );
};

// ---------- el baño ----------
const Taza: React.FC<{t: number}> = ({t}) => {
  const n = aguaTaza(t);
  const giro = t * (entre(t, ev.golpe - 0.6, ev.golpe + 0.6) || entre(t, ev.manija - 0.1, ev.manija + 1) || entre(t, ev.jalar - 0.1, ev.jalar + 1) ? 6 : 0.3);
  return (
    <group position={[0, 0, 0.12]}>
      <Cilindro r={0.13} r2={0.17} h={0.3} position={[0, 0.15, 0]} color="#f7f7f4" />
      <Cilindro r={0.235} r2={0.15} h={0.15} position={[0, 0.365, 0]} color="#f7f7f4" abierto />
      <Cilindro r={0.215} r2={0.1} h={0.13} position={[0, 0.375, 0]} color="#e3e9f0" abierto contorno={false} />
      <Cilindro r={0.1} h={0.01} position={[0, 0.312, 0]} color="#c9d3df" contorno={false} sombra={false} />
      <Toro r={0.222} tubo={0.022} position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} color="#ffffff" />
      {/* agua de la taza */}
      <group rotation={[0, giro, 0]}>
        <Cilindro r={0.11 + 0.08 * n} h={0.01} position={[0, 0.33 + 0.07 * n, 0]} color="#3d9cf0" opacity={0.92} contorno={false} sombra={false} />
        <Caja w={0.07} h={0.004} d={0.014} position={[0.05, 0.337 + 0.07 * n, 0]} color="#ffffff" contorno={false} sombra={false} />
      </group>
      {/* unión con el tanque */}
      <Caja w={0.3} h={0.1} d={0.22} position={[0, 0.44, -0.24]} color="#f7f7f4" />
    </group>
  );
};

const Tanque: React.FC<{t: number}> = ({t}) => {
  const n = nivel(t);
  const h = Math.max(0.002, n * TQ.alto);
  const yc = TQ.base + TQ.alto / 2;
  return (
    <group>
      {/* base de porcelana */}
      <Caja w={TQ.w + 0.02} h={0.035} d={TQ.d + 0.02} position={[TQ.x, TQ.base - 0.018, TQ.z]} color="#f7f7f4" />
      {/* agua */}
      {n > 0.003 && (
        <group>
          <Caja w={TQ.w - 0.01} h={h} d={TQ.d - 0.01} position={[TQ.x, TQ.base + h / 2, TQ.z]} color="#4aa3ff" opacity={0.55} contorno={false} sombra={false} />
          <Caja
            w={TQ.w - 0.01}
            h={0.004}
            d={TQ.d - 0.01}
            position={[TQ.x, TQ.base + h + Math.sin(t * 6) * 0.002, TQ.z]}
            color="#bfe3ff"
            opacity={0.8}
            contorno={false}
            sombra={false}
          />
        </group>
      )}
      {/* vidrio (vista de rayos X) */}
      <Caja w={TQ.w} h={TQ.alto} d={TQ.d} position={[TQ.x, yc, TQ.z]} color="#dff3ff" opacity={0.13} contorno={false} sombra={false} />
      <AristasCaja w={TQ.w} h={TQ.alto} d={TQ.d} position={[TQ.x, yc, TQ.z]} g={0.0045} />
    </group>
  );
};

const Hoyo: React.FC = () => <Toro r={0.045} tubo={0.01} position={[HOYO[0], TQ.base + 0.002, HOYO[1]]} rotation={[Math.PI / 2, 0, 0]} color="#3a3f4b" />;

const Sapo: React.FC<{t: number}> = ({t}) => {
  const baja = r(t, ev.tapas, 0.6);
  const abre = Math.max(palancaAbajo(t), r(t, ev.mano + 0.1, 0.3) * (1 - r(t, ev.aguaMano + 0.3, 0.3)));
  return (
    <group position={[HOYO[0], TQ.base + 0.01 + (1 - baja) * 0.3, HOYO[1] - 0.05]}>
      <group rotation={[-1.0 * abre, 0, 0]}>
        <group position={[0, 0, 0.05]}>
          <Cilindro r={0.052} h={0.018} color="#e5484d" />
          <Esfera r={0.032} position={[0, 0.012, 0]} escala={[1, 0.55, 1]} color="#e5484d" />
          <Esfera r={0.007} position={[0, 0.032, 0]} color="#9aa3b2" />
        </group>
      </group>
    </group>
  );
};

/** Brazo interior + cadenita + manija exterior. */
const Mecanismo: React.FC<{t: number; conManija: boolean}> = ({t, conManija}) => {
  const p = palancaAbajo(t);
  const piv: [number, number, number] = [-0.2, 0.83, TQ.z + 0.03];
  const ang = p * 0.45;
  const L = 0.25;
  const tip: [number, number, number] = [piv[0] + Math.cos(ang) * L, piv[1] + Math.sin(ang) * L, piv[2]];
  const sapoTop: [number, number, number] = [HOYO[0], TQ.base + 0.04 + p * 0.06, HOYO[1]];
  const eslabones = 9;
  return (
    <group>
      <group position={piv} rotation={[0, 0, ang]}>
        <Caja w={L} h={0.012} d={0.012} position={[L / 2, 0, 0]} color="#c9ced8" />
      </group>
      {Array.from({length: eslabones + 1}, (_, i) => {
        const k = i / eslabones;
        const x = tip[0] + (sapoTop[0] - tip[0]) * k;
        const y = tip[1] + (sapoTop[1] - tip[1]) * k - Math.sin(k * Math.PI) * 0.02 * (1 - p);
        const z = tip[2] + (sapoTop[2] - tip[2]) * k;
        return <Toro key={i} r={0.008} tubo={0.0025} position={[x, y, z]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]} color="#aeb5c2" contorno={false} />;
      })}
      {conManija && (
        <group position={[piv[0], piv[1], TQ.z + TQ.d / 2 + 0.01]} rotation={[0, 0, -ang * 0.8]}>
          <Cilindro r={0.012} h={0.03} rotation={[Math.PI / 2, 0, 0]} color="#c9ced8" />
          <Caja w={0.09} h={0.022} d={0.022} position={[-0.045, 0, 0.012]} color="#dde2ea" />
        </group>
      )}
    </group>
  );
};

const Valvula: React.FC<{t: number; conTubo: boolean}> = ({t, conTubo}) => {
  const crece = r(t, ev.valvula, 0.6);
  const abierta = valvulaAbierta(t);
  const sup = TQ.base + nivel(t) * TQ.alto;
  return (
    <group>
      {/* tubería que viene de la pared con su llave */}
      <Tubo
        puntos={[
          [VAL_X, 0.75 - 0.75, -0.75],
          [VAL_X, 0.2, -0.75],
          [VAL_X, 0.2, -0.5],
          [VAL_X, 0.25, TQ.z],
          [VAL_X, TQ.base - 0.02, TQ.z],
        ]}
        r={0.012}
        color="#d6dbe4"
        hasta={r(t, ev.llave, 0.8)}
      />
      {t > ev.llave + 0.4 && (
        <group position={[VAL_X, 0.2, -0.62]}>
          <Cilindro r={0.02} h={0.05} rotation={[Math.PI / 2, 0, 0]} color="#c9ced8" />
          <Caja w={0.08} h={0.015} d={0.015} position={[0, 0.03, 0]} color="#3f6fc4" />
        </group>
      )}
      {conTubo && (
        <group>
          <group position={[VAL_X, TQ.base, TQ.z]} scale={[1, Math.max(0.01, crece), 1]}>
            <Cilindro r={0.016} h={0.24} position={[0, 0.12, 0]} color="#9aa3b2" />
          </group>
          {crece > 0.95 && <Cilindro r={0.032} h={0.045} position={[VAL_X, 0.785, TQ.z]} color="#5f6878" />}
          {abierta && crece > 0.95 && (
            <Cilindro r={0.006} h={0.785 - sup} position={[VAL_X + 0.03, (0.785 + sup) / 2, TQ.z]} color="#9fd6ff" opacity={0.85} contorno={false} sombra={false} />
          )}
        </group>
      )}
    </group>
  );
};

const Flotador: React.FC<{t: number}> = ({t}) => {
  const piv: [number, number, number] = [VAL_X + 0.02, 0.775, TQ.z + 0.04];
  const L = 0.2;
  const sup = TQ.base + nivel(t) * TQ.alto;
  // trabado: no sube con el agua
  const atorado = entre(t, ev.atora, ev.bajalo + 0.2);
  const yObj = atorado ? TQ.base + 0.72 * TQ.alto : Math.min(sup, TQ.base + 0.74 * TQ.alto);
  const minAng = -0.75;
  let ang = Math.asin(Math.max(-1, Math.min(1, (yObj - piv[1]) / L)));
  ang = Math.max(minAng, ang);
  if (t > ev.bajalo) ang -= 0.12 * r(t, ev.bajalo, 0.6);
  const bx = piv[0] + Math.cos(ang) * L;
  const by = piv[1] + Math.sin(ang) * L;
  const tiembla = atorado ? Math.sin(t * 40) * 0.003 : 0;
  const resalta = entre(t, ev.alto - 0.6, ev.bajalo + 1.2);
  return (
    <group>
      <group position={piv} rotation={[0, 0, ang]}>
        <Caja w={L} h={0.008} d={0.008} position={[L / 2, 0, 0]} color="#9aa3b2" />
      </group>
      <Esfera r={0.045} position={[bx + tiembla, by, piv[2]]} color={resalta ? '#ffd23f' : '#ff9f1c'} />
      {atorado && <Esfera r={0.01} position={[bx, by + 0.06, piv[2]]} color="#e5484d" />}
    </group>
  );
};

const Manguerita: React.FC<{t: number}> = ({t}) => {
  const hasta = r(t, ev.manguerita - 0.3, 0.8);
  const chorrito = entre(t, ev.chorrito, ev.chorrito + 4.5) || rebosando(t);
  return (
    <group>
      <Tubo
        puntos={[
          [VAL_X + 0.01, 0.8, TQ.z],
          [VAL_X + 0.05, 0.86, TQ.z],
          [0.0, 0.875, TQ.z],
          [TUBO_X - 0.03, 0.865, TQ.z],
          [TUBO_X, 0.835, TQ.z],
        ]}
        r={0.0055}
        color="#2b2f3a"
        hasta={hasta}
      />
      {chorrito && hasta > 0.98 && <Cilindro r={0.004} h={0.31} position={[TUBO_X, 0.835 - 0.155, TQ.z]} color="#9fd6ff" opacity={0.9} contorno={false} sombra={false} />}
    </group>
  );
};

const TuboRebose: React.FC<{t: number}> = ({t}) => {
  const crece = r(t, ev.tubo, 0.6);
  const h = TUBO_TOPE - TQ.base;
  return (
    <group>
      <group position={[TUBO_X, TQ.base, TQ.z]} scale={[1, Math.max(0.01, crece), 1]}>
        <Cilindro r={0.024} h={h} position={[0, h / 2, 0]} color="#eef3f8" abierto />
        <Cilindro r={0.018} h={h} position={[0, h / 2, 0]} color="#c3cbd6" abierto contorno={false} />
      </group>
      {rebosando(t) && (
        <group>
          <Cilindro r={0.014} h={h} position={[TUBO_X, TQ.base + h / 2, TQ.z]} color="#59b3ff" opacity={0.85} contorno={false} sombra={false} />
          <Toro r={0.024} tubo={0.006} position={[TUBO_X, TUBO_TOPE + 0.004, TQ.z]} rotation={[Math.PI / 2, 0, 0]} color="#9fd6ff" contorno={false} />
        </group>
      )}
    </group>
  );
};

/** Gotas que caen cuando el agua se desborda. */
const Goteo: React.FC<{t: number}> = ({t}) => {
  if (!desborda(t)) return null;
  return (
    <group>
      {Array.from({length: 8}, (_, i) => {
        const k = ((t * 1.3 + i / 8) % 1);
        const x = -0.2 + (i % 4) * 0.13;
        return <Esfera key={i} r={0.012} position={[x, 0.88 - k * 0.85, TQ.z + TQ.d / 2 + 0.01]} color="#59b3ff" opacity={1 - k * 0.5} contorno={false} />;
      })}
      <Cilindro r={0.25} h={0.004} position={[0, 0.003, -0.05]} color="#7cc0ff" opacity={0.6 * r(t, ev.borde, 1)} contorno={false} sombra={false} />
    </group>
  );
};

/** Olor del drenaje: nubecitas verdes que suben de la taza. */
const Olor: React.FC<{t: number}> = ({t}) => {
  const vis = r(t, ev.cano - 0.6, 0.6) * (1 - r(t, ev.chorrito + 1.5, 1.2));
  if (vis <= 0.01) return null;
  return (
    <group>
      {Array.from({length: 10}, (_, i) => {
        const k = ((t * 0.35 + i / 10) % 1);
        return (
          <Esfera
            key={i}
            r={0.03 + k * 0.05}
            position={[Math.sin(t * 2 + i) * 0.08, 0.42 + k * 0.55, 0.12 + Math.cos(t * 1.7 + i) * 0.06]}
            color="#8fd16a"
            opacity={vis * (1 - k) * 0.85}
            contorno={false}
          />
        );
      })}
    </group>
  );
};

/** Mano que entra al agua para levantar el sapo. */
const Mano: React.FC<{t: number}> = ({t}) => {
  const baja = r(t, ev.mano - 0.4, 0.5) * (1 - r(t, ev.aguaMano + 0.3, 0.5));
  if (baja <= 0.01) return null;
  const y = 1.25 - baja * 0.62;
  return (
    <group position={[HOYO[0] + 0.02, y, HOYO[1]]} rotation={[0, 0, 0.25]}>
      <Cilindro r={0.035} h={0.5} position={[0, 0.25, 0]} color="#e9b48a" />
      <Esfera r={0.045} position={[0, 0, 0]} escala={[1, 1.2, 0.7]} color="#e9b48a" />
    </group>
  );
};

/** Salpicadura cuando el agua baja de golpe a la taza. */
const Salpica: React.FC<{t: number}> = ({t}) => {
  const ventanas = [ev.golpe - 0.6, ev.manija - 0.1, ev.boya - 0.1, ev.jalar - 0.1];
  const v = ventanas.find((a) => entre(t, a, a + 0.9));
  if (v === undefined) return null;
  const k = (t - v) / 0.9;
  return (
    <group>
      {Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const rr = 0.05 + k * 0.18;
        return <Esfera key={i} r={0.012} position={[Math.cos(a) * rr, 0.45 + Math.sin(k * Math.PI) * 0.12, 0.12 + Math.sin(a) * rr]} color="#7cc0ff" opacity={1 - k} contorno={false} />;
      })}
    </group>
  );
};

const Escena3D: React.FC<{t: number}> = ({t}) => (
  <>
    <Camara t={t} />
    <ambientLight intensity={1.15} />
    <directionalLight position={[1.8, 3.2, 2.2]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2} shadow-camera-bottom={-2} shadow-bias={-0.0004} />
    <Cuarto />
    <Pieza t={t} desde={ev.taza} dir={[0.3, -0.2, 1]}>
      <Taza t={t} />
    </Pieza>
    <Pieza t={t} desde={ev.tanque} dir={[0, 1, 0]}>
      <Tanque t={t} />
    </Pieza>
    <Pieza t={t} desde={ev.hoyo} dir={[0.4, 0.2, 0.6]} caida={0.05}>
      <Hoyo />
    </Pieza>
    {(t < 0.75 || t >= ev.tapas) && (
      <Pieza t={t} desde={ev.tapas} dir={[1, 0.5, 0.3]} caida={0}>
        <Sapo t={t} />
      </Pieza>
    )}
    <Pieza t={t} desde={ev.cadenita} dir={[-1, 0.6, 0.4]} caida={0.1}>
      <Mecanismo t={t} conManija={t < 0.75 || t >= ev.palanca} />
    </Pieza>
    <Pieza t={t} desde={ev.llave} dir={[-1, -0.3, 0.5]} caida={0}>
      <Valvula t={t} conTubo={t < 0.75 || t >= ev.valvula} />
    </Pieza>
    <Pieza t={t} desde={ev.boya} dir={[-0.5, 1, 0.8]} caida={0.15}>
      <Flotador t={t} />
    </Pieza>
    <Pieza t={t} desde={ev.manguerita - 0.3} dir={[0.2, 1, -0.4]} caida={0}>
      <Manguerita t={t} />
    </Pieza>
    <Pieza t={t} desde={ev.tubo} dir={[1, 0.8, 0]} caida={0}>
      <TuboRebose t={t} />
    </Pieza>
    <Mano t={t} />
    <Olor t={t} />
    <Salpica t={t} />
    <Goteo t={t} />
  </>
);

// ---------- capas 2D ----------
const ETIQUETAS: [number, string, boolean][] = [
  [T('baño.'), 'ya tienes un baño', false],
  [T('golpe.') - 0.3, 'de golpe', true],
  [T('sapo.') - 0.2, 'el sapo', false],
  [T('mano') - 0.2, 'la mano al agua', true],
  [T('manija.') - 0.2, 'la manija', false],
  [T('vacío.') - 0.2, 'vacío', true],
  [T('llenado.') - 0.4, 'válvula de llenado', false],
  [T('parar.', 1) - 0.4, 'sin parar', true],
  [T('flotador.', 1) - 0.2, 'el flotador', false],
  [T('olor', 1) - 0.2, 'el olor', true],
  [T('manguerita') - 0.2, 'la manguerita', false],
  [T('atora') - 0.2, 'se atora', true],
  [T('rebose.') - 0.4, 'el tubo de rebose', false],
  [T('alto.') - 0.3, 'muy alto', true],
  [T('bájalo') - 0.1, 'bájalo un poco', false],
  [T('dinero.') - 0.2, 'agua… y dinero', true],
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
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: FUENTE,
        fontWeight: 900,
        fontSize: 78,
        letterSpacing: -1,
        color: rojo ? '#e5333b' : '#15161c',
        opacity: o * Math.min(1, s * 1.5),
        transform: `scale(${0.8 + 0.2 * s})`,
        textShadow: '0 0 18px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,1)',
      }}
    >
      {texto}
    </div>
  );
};

const Medidor: React.FC<{t: number}> = ({t}) => {
  if (t < ev.agua) return null;
  const n = nivel(t);
  const litros = n * 6;
  const tirados = rebosando(t) ? (t - (ev.tubo + 1.2)) * 0.9 : t > ev.bajalo + 0.8 ? (ev.bajalo + 0.8 - (ev.tubo + 1.2)) * 0.9 : 0;
  const tubo = (valor: number, max: number, color: string, nombre: string, txt: string, x: number) => (
    <div style={{position: 'absolute', left: x - 14, top: 1450, width: 98, padding: '12px 0', borderRadius: 24, background: 'rgba(255,255,255,0.78)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
      <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 30, color: '#15161c'}}>{txt}</div>
      <div style={{width: 46, height: 240, borderRadius: 23, border: '5px solid #15161c', background: 'rgba(255,255,255,0.7)', position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: `${cl(valor / max) * 100}%`, background: color}} />
      </div>
      <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 24, color: '#15161c'}}>{nombre}</div>
    </div>
  );
  return (
    <>
      {tubo(litros, 6, '#4aa3ff', 'tanque', `${litros.toFixed(1).replace('.', ',')} L`, 950)}
      {t > ev.tubo + 1.2 && tubo(tirados, 12, '#e5333b', 'tirados', `${tirados.toFixed(1).replace('.', ',')} L`, 840)}
    </>
  );
};

export const TanqueBano: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{backgroundColor: '#d9efe6'}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 40, near: 0.05, far: 50, position: [1.9, 1.5, 2.6]}} gl={{antialias: true}}>
        <Escena3D t={t} />
      </ThreeCanvas>
      <Papel />
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(40,50,60,0.25) 100%)'}} />
      <Etiqueta t={t} />
      <Medidor t={t} />
      <Audio src={staticFile('tanque_bano/voz.wav')} />
      <Audio src={staticFile('tanque_bano/musica.wav')} />
    </AbsoluteFill>
  );
};

export const DURACION_TANQUE = (datos as any).duration as number;
// evitar advertencia de import no usado
void MatToon;
void THREE;
