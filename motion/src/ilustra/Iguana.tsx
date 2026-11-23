import React from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/iguana.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, canvasTex, cil, cl, cuerpoSecciones, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Confeti, Halo, ICONOS, Ic, Mano, Ranura, Sello, Sprite, Tio, crearSubtitulo, texEstrella} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_IGUANA = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  costa: T('costa'),
  lagartija: T('lagartija'),
  verde: T('verde'),
  picos: T('picos'),
  papada: T('papada'),
  felicidades: T('felicidades'),
  iguana: T('iguana', 1),
  pones: T('pones'),
  pecera: T('pecera', 1),
  ventana: T('ventana', 1),
  grillos: T('grillos', 1),
  listo: T('listo'),
  pero1: T('pero', 1),
  meses: T('meses'),
  raro: T('raro'),
  doblan: T('doblan'),
  es1: T('es', 1),
  huesos: T('huesos'),
  calcio: T('calcio', 1),
  vitamina: T('vitamina'),
  sol: T('sol…'),
  vidrio: T('vidrio'),
  bloquea: T('bloquea'),
  lampara: T('lámpara', 1),
  ultravioleta: T('ultravioleta'),
  susol: T('sol', 2),
  pero3: T('tampoco') - 0.2,
  grillos2: T('grillos', 2),
  plantas: T('plantas'),
  hojas: T('hojas'),
  flores: T('flores'),
  frutas: T('frutas'),
  carne: T('carne'),
  rinones: T('riñones'),
  comida: T('comida'),
  pero4: T('aunque') - 0.2,
  quieta: T('quieta'),
  digiere: T('digiere'),
  calor: T('calor', 1),
  treinta: T('30'),
  panza: T('panza'),
  lampara2: T('lámpara', 2),
  rama: T('rama'),
  playa: T('playa'),
  pero5: T('agarras') - 0.9,
  agarras: T('agarras'),
  cola2: T('cola', 2),
  mano: T('mano'),
  suelta: T('suelta'),
  escapar: T('escapar'),
  crecer: T('crecer'),
  igual: T('igual'),
  ahora: T('ahora'),
  feliz: T('feliz'),
  pecera2: T('pecera', 2),
  alcanzar: T('alcanzar'),
  metros: T('metros'),
};

const VERDE = '#5fb546';
const VERDE_OSC = '#3f8a34';

// ---------- iguana ----------
const SEC: [number, number, number, number, number][] = [
  [-0.95, 0.08, 0.08, 0.06, 2.2],
  [-0.6, 0.15, 0.13, 0.1, 2.3],
  [-0.2, 0.2, 0.16, 0.13, 2.4],
  [0.2, 0.19, 0.15, 0.12, 2.4],
  [0.45, 0.13, 0.12, 0.09, 2.3],
  [0.6, 0.12, 0.12, 0.1, 2.3],
  [0.85, 0.11, 0.1, 0.07, 2.4],
  [1.05, 0.07, 0.06, 0.04, 2.3],
  [1.12, 0.015, 0.02, 0.01, 2.2],
];
const geoCuerpo = () =>
  G('igCuerpo', () => {
    const g = cuerpoSecciones(SEC, {segX: 90, segA: 32});
    const p = g.getAttribute('position');
    const col: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const banda = Math.sin(x * 14) > 0.55 && x < 0.4;
      c.set(y < -0.05 ? '#a6d97a' : banda ? VERDE_OSC : VERDE);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  });
const geoCola = (largo: number) =>
  G(`igCola|${largo.toFixed(2)}`, () => {
    const pts = Array.from({length: 7}, (_, i) => new THREE.Vector3(-i * 0.22 * largo, -0.01 * i, 0));
    const g = tuboAhusado(pts, (u) => lerp(0.08, 0.008, u), 50, 12);
    const p = g.getAttribute('position');
    const col: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      c.set(Math.sin(x * 12) > 0.3 ? VERDE_OSC : VERDE);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  });
const geoPuas = () =>
  G('igPuas', () => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 22; i++) {
      const x = lerp(0.85, -0.9, i / 21);
      const h = 0.04 + 0.05 * Math.sin((i / 21) * Math.PI) + (x > 0.5 ? 0.03 : 0);
      const up = (() => {
        for (let k = 0; k < SEC.length - 1; k++) if (x >= SEC[k][0] && x <= SEC[k + 1][0]) return lerp(SEC[k][2], SEC[k + 1][2], (x - SEC[k][0]) / (SEC[k + 1][0] - SEC[k][0]));
        return 0.1;
      })();
      const g = new THREE.ConeGeometry(0.018, h, 4);
      g.rotateZ(0.35);
      g.translate(x, up + h / 2 - 0.01, 0);
      gs.push(g);
    }
    return mergeGeometries(gs);
  });
const geoPapada = () =>
  G('igPapada', () => {
    const s = new THREE.Shape();
    s.moveTo(0.95, -0.06);
    s.bezierCurveTo(0.95, -0.25, 0.7, -0.32, 0.55, -0.1);
    s.lineTo(0.95, -0.06);
    return new THREE.ShapeGeometry(s, 16);
  });

const Pata: React.FC<{x: number; s: number; t: number; fase: number; anda: number; doblez: number}> = ({x, s, t, fase, anda, doblez}) => {
  const paso = Math.sin(t * 6 + fase) * 0.35 * anda;
  return (
    <group position={[x, -0.02, s * 0.15]} rotation={[0, paso, 0]}>
      <group rotation={[s * (1.35 - doblez * 0.5), 0, 0]}>
        <P geo={cil(0.035, 0.03, 0.2, 8)} color={VERDE} position={[0, -0.1, 0]} linea={0} silueta={1.4} />
        <group position={[0, -0.2, 0]} rotation={[-s * (1.1 - doblez * 0.9), 0, doblez * 0.6]}>
          <P geo={cil(0.03, 0.022, 0.18, 8)} color={VERDE} position={[0, -0.09, 0]} linea={0} silueta={1.4} />
          {[-1, 0, 1].map((k) => (
            <P key={k} geo={cil(0.008, 0.005, 0.09, 5)} color={VERDE_OSC} position={[0.03 * k + 0.03, -0.19, 0]} rotation={[0, 0, 1.2 + k * 0.4]} linea={0} silueta={0.8} />
          ))}
        </group>
      </group>
    </group>
  );
};

const Iguana: React.FC<{t: number; anda?: number; doblez?: number; puas?: number; papada?: number; cola?: number; colaLargo?: number; colaColor?: string; frio?: number; boca?: number}> = ({
  t,
  anda = 0,
  doblez = 0,
  puas = 1,
  papada = 1,
  cola = 1,
  colaLargo = 1,
  boca = 0,
}) => {
  const ond = Math.sin(t * 3) * 0.08 * (0.3 + anda);
  return (
    <group>
      <P geo={geoCuerpo()} vc color="#ffffff" linea={0} silueta={2} />
      <group scale={[1, puas, 1]}>
        <P geo={geoPuas()} color="#e9eea0" linea={0} silueta={1.2} sombra={false} />
      </group>
      <group scale={[1, papada, 1]}>
        <P geo={geoPapada()} color="#a6d97a" doble linea={1.4} silueta={0} umbral={5} sombra={false} />
      </group>
      {/* ojos y placa */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <P geo={esf(0.03, 12)} color="#e8b23a" position={[0.86, 0.06, s * 0.085]} linea={0} silueta={1.2} />
          <P geo={esf(0.016, 8)} color="#141418" position={[0.875, 0.065, s * 0.105]} linea={0} silueta={0} />
          <P geo={esf(0.035, 12)} color="#dfe8d2" position={[0.68, -0.02, s * 0.11]} scale={[1, 1, 0.4]} linea={0} silueta={1.2} />
        </group>
      ))}
      <group position={[1.06, -0.03, 0]} rotation={[0, 0, -boca * 0.4]}>
        <P geo={caja(0.12, 0.012, 0.09)} color="#2d5a24" position={[-0.06, 0, 0]} linea={0} silueta={0} />
      </group>
      {/* cola */}
      {cola > 0 && (
        <group position={[-0.92, 0, 0]} rotation={[0, ond, 0]}>
          <P geo={geoCola(colaLargo)} vc color="#ffffff" linea={0} silueta={1.8} />
        </group>
      )}
      <Pata x={0.45} s={1} t={t} fase={0} anda={anda} doblez={doblez} />
      <Pata x={0.45} s={-1} t={t} fase={Math.PI} anda={anda} doblez={doblez} />
      <Pata x={-0.6} s={1} t={t} fase={Math.PI} anda={anda} doblez={doblez} />
      <Pata x={-0.6} s={-1} t={t} fase={0} anda={anda} doblez={doblez} />
    </group>
  );
};

// ---------- cuarto y terrario ----------
let _piso: THREE.CanvasTexture | null = null;
const texPiso = () => {
  if (_piso) return _piso;
  _piso = canvasTex(
    512,
    512,
    (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#c99462' : '#d3a06c';
        g.fillRect(0, i * 64, 512, 64);
        g.fillStyle = 'rgba(80,40,10,0.5)';
        g.fillRect(0, i * 64, 512, 3);
        g.fillRect(((i * 197) % 512) | 0, i * 64, 3, 64);
      }
    },
    [6, 6],
  );
  return _piso;
};
const MUEBLE_H = 0.85;
const TW = 1.0;
const TH = 0.62;
const TD = 0.5;
const TER: [number, number, number] = [0.2, MUEBLE_H + 0.03, -0.25];
const VENT_X = 1.3;

const Cuarto: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#ffffff" map={texPiso()} />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#f3dcae" position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    <P geo={caja(20, 0.14, 0.24)} color="#f4f1ea" position={[0, 0.07, -1.48]} linea={0} />
    <P geo={caja(1.6, 1.4, 0.08)} color="#f4f1ea" position={[VENT_X, 1.9, -1.48]} />
    <P geo={caja(1.4, 1.2, 0.1)} color="#bfe3f7" position={[VENT_X, 1.9, -1.46]} />
    <P geo={caja(0.05, 1.2, 0.12)} color="#f4f1ea" position={[VENT_X, 1.9, -1.44]} linea={0} />
    <P geo={caja(2.3, MUEBLE_H, 0.75)} color="#8a6a4a" position={[0.2, MUEBLE_H / 2, -0.3]} />
    <P geo={caja(1.05, 0.6, 0.02)} color="#7a5a3c" position={[-0.35, 0.43, 0.08]} />
    <P geo={caja(1.05, 0.6, 0.02)} color="#7a5a3c" position={[0.75, 0.43, 0.08]} />
    {/* planta en maceta */}
    <P geo={cil(0.18, 0.14, 0.35, 16)} color="#c4562c" position={[-1.6, 0.175, -1.0]} />
    {[0, 1, 2, 3].map((k) => (
      <P key={k} geo={esf(0.25, 12)} color="#4fa548" position={[-1.6 + Math.cos(k * 1.6) * 0.15, 0.55 + k * 0.12, -1.0 + Math.sin(k * 1.6) * 0.15]} scale={[1, 0.6, 1]} linea={0} />
    ))}
  </group>
);

const Grillo: React.FC<{p: [number, number, number]; t: number; i: number}> = ({p, t, i}) => {
  const salto = Math.max(0, Math.sin(t * 2.5 + i * 2)) ** 6 * 0.06;
  return (
    <group position={[p[0], p[1] + salto, p[2]]} rotation={[0, i * 1.3, 0]}>
      <P geo={esf(0.025, 8)} color="#5a3a1c" scale={[1.6, 0.7, 0.8]} linea={0} silueta={1} />
      <P geo={cil(0.004, 0.004, 0.06, 4)} color="#3a2410" position={[-0.03, 0.02, 0.02]} rotation={[0.5, 0, 1.1]} linea={0} silueta={0.6} />
      <P geo={cil(0.004, 0.004, 0.06, 4)} color="#3a2410" position={[-0.03, 0.02, -0.02]} rotation={[-0.5, 0, 1.1]} linea={0} silueta={0.6} />
    </group>
  );
};

const Terrario: React.FC<{t: number; uv: number; calor: number; rama: number; grillos: number; plantas: number; romper: number}> = ({t, uv, calor, rama, grillos, plantas, romper}) => (
  <group position={TER}>
    <P geo={caja(TW + 0.06, 0.04, TD + 0.06)} color="#2a2b31" position={[0, -0.02, 0]} />
    <P geo={caja(TW - 0.02, 0.05, TD - 0.02)} color="#c9a06a" position={[0, 0.025, 0]} linea={0} silueta={0} />
    <P geo={caja(TW + 0.06, 0.03, TD + 0.06)} color="#2a2b31" position={[0, TH + 0.015, 0]} linea={0} />
    {romper < 0.5 && <P geo={caja(TW, TH, TD)} color="#dff4fb" position={[0, TH / 2, 0]} opacity={0.1} linea={1.6} silueta={0} umbral={10} sombra={false} />}
    {/* piedra */}
    <P geo={esf(0.09, 12)} color="#8c8f98" position={[0.32, 0.06, -0.1]} scale={[1.6, 0.6, 1]} />
    {rama > 0.01 && (
      <group scale={[1, rama, 1]}>
        <P geo={cil(0.03, 0.035, 0.85, 10)} color="#7a5232" position={[0.02, 0.26, -0.05]} rotation={[0, 0, -1.13]} />
      </group>
    )}
    {Array.from({length: 5}, (_, i) =>
      i < grillos * 5 ? <Grillo key={i} p={[-0.35 + i * 0.16, 0.06, 0.1 - (i % 2) * 0.15]} t={t} i={i} /> : null,
    )}
    {plantas > 0.01 && (
      <group position={[-0.32, 0.05, 0.08]} scale={plantas}>
        <P geo={cil(0.11, 0.08, 0.05, 20)} color="#f4f1ea" position={[0, 0.025, 0]} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <P key={k} geo={esf(0.035, 10)} color={['#4fa548', '#6fc04a', '#ff6fa3', '#ffd23a', '#ff8a1c', '#4fa548'][k]} position={[Math.cos(k) * 0.05, 0.07, Math.sin(k) * 0.05]} scale={k < 2 || k === 5 ? [1.6, 0.4, 1] : [1, 1, 1]} linea={0} silueta={1} />
        ))}
      </group>
    )}
    {/* lámparas */}
    {uv > 0.01 && (
      <group position={[-0.2, TH + 0.08, 0]} scale={uv}>
        <P geo={caja(0.5, 0.05, 0.08)} color="#3a3b42" />
        <P geo={cil(0.022, 0.022, 0.44, 10)} color="#c9a3ff" position={[0, -0.04, 0]} rotation={[0, 0, Math.PI / 2]} linea={0} silueta={1} />
        <Halo pos={[0, -0.08, 0]} o={0.45} escala={0.35} color="#b47bff" />
      </group>
    )}
    {calor > 0.01 && (
      <group position={[0.3, TH + 0.14, 0]} scale={calor}>
        <P geo={cil(0.06, 0.12, 0.14, 18)} color="#3a3b42" />
        <P geo={esf(0.05, 12)} color="#ff7a2a" position={[0, -0.07, 0]} linea={0} silueta={0} />
        <Halo pos={[0, -0.1, 0]} o={0.5} escala={0.35} color="#ff8a3a" />
      </group>
    )}
  </group>
);

// rayos del sol por la ventana (UV morado que el vidrio bloquea)
const Rayos: React.FC<{t: number; o: number; bloqueo: number; uvLamp: number}> = ({t, o, bloqueo, uvLamp}) => {
  if (o <= 0.01 && uvLamp <= 0.01) return null;
  const rayos = [];
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.9 + i * 0.25) % 1;
    const ini = new THREE.Vector3(VENT_X - 0.3 + i * 0.2, 2.2, -1.42);
    const fin = new THREE.Vector3(TER[0] + 0.1 + i * 0.1, TER[1] + 0.15, TER[2]);
    const lim = bloqueo > 0.5 ? 0.35 : 1;
    const u = ph * lim;
    const p = ini.clone().lerp(fin, u);
    rayos.push(<Sprite key={i} tex={texEstrella()} pos={[p.x, p.y, p.z]} escala={[0.06, 0.06]} o={o * (bloqueo > 0.5 && ph > 0.85 ? 0 : 1)} rot={t * 3 + i} />);
  }
  const uvR = [];
  for (let i = 0; i < 5; i++) {
    const ph = (t * 1.1 + i * 0.2) % 1;
    uvR.push(<Sprite key={'u' + i} tex={texEstrella()} pos={[TER[0] - 0.4 + i * 0.1, TER[1] + TH - ph * (TH - 0.1), TER[2] + 0.05]} escala={[0.04, 0.04]} o={uvLamp} rot={t * 4 + i} />);
  }
  return (
    <>
      {rayos}
      {uvR}
      {bloqueo > 0.5 && o > 0.01 && <Sprite tex={texEstrella()} pos={[VENT_X - 0.05, 1.95, -1.38]} escala={[0.25, 0.25]} o={o * 0.0} />}
    </>
  );
};

// ---------- escena ----------
const MESA_TIO = -1.5;
const posIg = (t: number) => {
  // posición de la iguana en el terrario (mundo)
  const base: [number, number, number] = [TER[0] - 0.05, TER[1] + 0.12, TER[2] + 0.02];
  if (t > ev.rama - 0.6 && t < ev.pero5) {
    const k = r(t, ev.rama - 0.6, 0.8);
    return {p: [lerp(base[0], TER[0] + 0.08, k), lerp(base[1], TER[1] + 0.33, k), base[2] - 0.05 * k] as [number, number, number], ry: lerp(-0.25, 0, k), rz: 0.44 * k};
  }
  if (t > ev.pero1 - 0.2 && t < ev.es1) {
    const k = r(t, ev.pero1 - 0.2, 3.5);
    return {p: [base[0] - 0.25 + k * 0.4, base[1], base[2]] as [number, number, number], ry: -0.2, rz: 0};
  }
  if (t > ev.escapar - 0.3 && t < ev.ahora) {
    const k = r(t, ev.escapar - 0.3, 0.6);
    return {p: [base[0] - 0.3 * k, base[1], base[2]] as [number, number, number], ry: -0.2 + Math.PI * 0.0, rz: 0};
  }
  return {p: base, ry: -0.25 + Math.sin(t * 0.4) * 0.05, rz: 0};
};

const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.pones - 0.35;
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.2, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.2, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.pones - 0.35, 0.3);
  const brazo = V(tioX, 2.44, 0.15);
  const final = t > ev.pecera2 - 0.4;
  const crece = r(t, ev.alcanzar - 0.3, 1.6);
  const ig = posIg(t);
  const escIg = lerp(0.2, 0.95, crece);

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  const terC = V(TER[0], TER[1] + 0.25, TER[2]);
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.2], [-1.4, 1.3, 0], 42],
      [ev.lagartija - 0.4, [brazo.x + 0.3, brazo.y + 0.45, brazo.z + 1.8], [brazo.x, brazo.y - 0.05, brazo.z], 36],
      [ev.papada - 0.3, [brazo.x + 0.35, brazo.y + 0.3, brazo.z + 1.15], [brazo.x + 0.15, brazo.y + 0.02, brazo.z], 32],
      [ev.felicidades - 0.25, [-1.0, 1.75, 4.2], [-1.0, 1.3, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (final) {
    cam = {pos: V(lerp(0.3, 0.4, crece), lerp(1.6, 1.25, crece), lerp(2.2, 4.4, crece)), obj: V(lerp(0.15, 0.05, crece), lerp(1.15, 0.6, crece), lerp(-0.25, 0.2, crece)), fov: 40};
  } else if (t > ev.es1 - 0.1 && t < ev.pero3) {
    cam = {pos: V(0.75, 1.55, 2.6), obj: V(0.6, 1.3, -0.4), fov: 40};
  } else if (t > ev.pero5 - 0.1) {
    cam = {pos: V(terC.x + 0.15, terC.y + 0.7, 1.6), obj: V(terC.x - 0.05, terC.y - 0.05, terC.z), fov: 36};
  } else {
    const a = ig.p;
    const cerca = ventana(t, ev.pero1 - 0.2, ev.es1, 0.4) + ventana(t, ev.pero4, ev.calor - 0.3, 0.4);
    cam = {pos: V(lerp(terC.x + 0.1, a[0] + 0.25, cerca), lerp(terC.y + 0.75, a[1] + 0.3, cerca), lerp(2.0, 1.05, cerca)), obj: V(lerp(terC.x, a[0] + 0.05, cerca), lerp(terC.y - 0.05, a[1] + 0.02, cerca), TER[2]), fov: 36};
  }

  const uv = r(t, ev.lampara - 0.2, 0.4);
  const calor = r(t, ev.lampara2 - 0.2, 0.4);
  const rama = r(t, ev.rama - 0.6, 0.4);
  const grillos = t < ev.pones - 0.35 ? 0 : t < ev.plantas - 0.2 ? 1 : 0;
  const plantas = r(t, ev.hojas - 0.3, 0.3);
  const anda = (t > ev.pero1 - 0.2 && t < ev.es1) || (t > ev.escapar - 0.3 && t < ev.escapar + 0.4) || (t > ev.rama - 0.6 && t < ev.rama + 0.2) ? 1 : 0;
  const doblez = ventana(t, ev.raro - 0.4, ev.es1 + 0.2, 0.4);
  const puas = 1 + 0.6 * ventana(t, ev.picos - 0.1, ev.papada - 0.1, 0.2);
  const papada = 1 + 0.8 * ventana(t, ev.papada - 0.1, ev.felicidades, 0.25);
  // cola
  const suelta = t > ev.cola2 - 0.05 && t < ev.crecer - 0.2;
  const colaLargo = t >= ev.crecer - 0.2 && t < ev.ahora + 0.1 ? lerp(0.15, 0.7, r(t, ev.crecer - 0.2, 1.0)) : t >= ev.ahora + 0.1 ? 0.7 : 1;
  const manoO = ventana(t, ev.agarras - 0.5, ev.suelta + 0.6, 0.35);
  const colaPos = V(ig.p[0] - 0.19, ig.p[1], ig.p[2] + 0.02);
  const manoHasta = V(colaPos.x - 0.12, colaPos.y + 0.04, colaPos.z + 0.04).add(V(0, suelta ? r(t, ev.cola2, 0.6) * 0.35 : 0, suelta ? r(t, ev.cola2, 0.6) * 0.25 : 0));
  const manoDesde = V(colaPos.x - 0.6, colaPos.y + 1.1, colaPos.z + 0.9);
  const ventSol = ventana(t, ev.sol - 0.4, ev.lampara - 0.1, 0.3);
  const frio = ventana(t, ev.quieta - 0.4, ev.lampara2, 0.4);

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[0.4, 1, 0.65]} area={4} centro={[0, 0.8, 0]} amb={1.0} sol={0.6} />
      <Cuarto />
      <Terrario t={t} uv={uv} calor={calor} rama={rama} grillos={grillos} plantas={plantas} romper={final ? crece : 0} />
      <Rayos t={t} o={ventSol} bloqueo={t > ev.bloquea - 0.2 ? 1 : 0} uvLamp={ventana(t, ev.ultravioleta - 0.3, ev.pero3, 0.3)} />
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={0} saluda={saluda} />
          </group>
          <group position={brazo.toArray() as [number, number, number]} rotation={[0, giro, 0]} scale={0.24}>
            <group position={[0, 0.12, 0]}>
              <Iguana t={t} puas={puas} papada={papada} />
            </group>
          </group>
        </>
      )}
      {!conTio && (
        <group position={final ? [lerp(ig.p[0], 0.0, crece), lerp(ig.p[1], escIg * 0.4, crece), lerp(ig.p[2], 0.6 * crece, crece)] : ig.p} rotation={[0, final ? lerp(ig.ry, -0.35, crece) : ig.ry, ig.rz]} scale={escIg}>
          <Iguana t={t} anda={anda} doblez={doblez} cola={suelta ? 0 : 1} colaLargo={colaLargo} boca={ventana(t, ev.hojas, ev.carne, 0.2) * Math.max(0, Math.sin(t * 6))} />
        </group>
      )}
      {/* cola suelta en la mano */}
      {suelta && (
        <group position={[manoHasta.x + 0.06, manoHasta.y - 0.04, manoHasta.z]} rotation={[0, 0, Math.sin(t * 14) * 0.3 - 0.6]} scale={0.2}>
          <P geo={geoCola(1)} vc color="#ffffff" linea={0} silueta={1.8} />
        </group>
      )}
      {manoO > 0.01 && <Mano desde={manoDesde} hasta={manoDesde.clone().lerp(manoHasta, manoO)} />}
      
    </>
  );
};

// ---------- capa 2D ----------
Object.assign(ICONOS, {
  iguana: (
    <g>
      <path d="M12 60 C24 50 40 46 58 48 C70 49 80 44 88 50 C82 58 70 58 60 60 C44 64 26 66 12 60Z" fill="#5fb546" stroke="#16171c" strokeWidth={4} />
      <path d="M40 46 L44 38 L48 46 L52 38 L56 46 L60 40 L62 47" fill="#e9eea0" stroke="#16171c" strokeWidth={2.5} />
      <circle cx={78} cy={48} r={3} fill="#16171c" />
    </g>
  ),
  puas: (
    <g>
      <path d="M10 70 L22 40 L34 70 L46 34 L58 70 L70 40 L82 70Z" fill="#e9eea0" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
    </g>
  ),
  papada: (
    <g>
      <path d="M20 40 L80 40 C80 60 66 80 44 78 C30 76 22 60 20 40Z" fill="#a6d97a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  ventana: (
    <g>
      <rect x={18} y={18} width={64} height={64} fill="#bfe3f7" stroke="#16171c" strokeWidth={4} />
      <path d="M50 18 L50 82 M18 50 L82 50" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  grillo: (
    <g>
      <ellipse cx={48} cy={56} rx={26} ry={12} fill="#5a3a1c" stroke="#16171c" strokeWidth={4} />
      <path d="M40 56 L28 36 L18 62 M58 56 L72 34 L84 62" fill="none" stroke="#16171c" strokeWidth={4} />
      <path d="M72 50 L90 30" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  hueso: (
    <g>
      <path d="M30 70 L70 30" stroke="#f4f1ea" strokeWidth={14} strokeLinecap="round" />
      {[[26, 66], [34, 74], [66, 26], [74, 34]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={9} fill="#f4f1ea" stroke="#16171c" strokeWidth={3} />
      ))}
      <path d="M30 70 L70 30" stroke="#16171c" strokeWidth={3} strokeDasharray="2 10" />
    </g>
  ),
  calcio: (
    <g>
      <rect x={30} y={20} width={40} height={64} rx={8} fill="#f4f1ea" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={60} textAnchor="middle" fontSize={26} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        Ca
      </text>
    </g>
  ),
  vitD: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={62} textAnchor="middle" fontSize={34} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        D
      </text>
    </g>
  ),
  uv: (
    <g>
      <rect x={14} y={30} width={72} height={18} rx={8} fill="#c9a3ff" stroke="#16171c" strokeWidth={4} />
      <path d="M26 56 L22 74 M42 56 L40 78 M58 56 L60 78 M74 56 L78 74" stroke="#8a4be0" strokeWidth={5} strokeLinecap="round" />
      <text x={50} y={46} textAnchor="middle" fontSize={14} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        UV
      </text>
    </g>
  ),
  rinon: (
    <g>
      <path d="M58 20 C80 20 86 50 78 68 C70 86 44 84 40 70 C38 62 48 58 48 50 C48 42 38 38 40 30 C42 22 50 20 58 20Z" fill="#b5413a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  carne: (
    <g>
      <path d="M26 30 C50 14 84 30 78 58 C74 76 44 82 30 66 C20 56 16 40 26 30Z" fill="#e05a5a" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={50} cy={50} rx={10} ry={7} fill="#f6d0c0" />
    </g>
  ),
  rama: (
    <g>
      <path d="M10 70 L90 36" stroke="#7a5232" strokeWidth={12} strokeLinecap="round" />
      <path d="M50 54 L62 70" stroke="#7a5232" strokeWidth={8} strokeLinecap="round" />
    </g>
  ),
  playa: (
    <g>
      <circle cx={70} cy={30} r={14} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <path d="M10 76 C30 64 70 64 90 76 L90 88 L10 88Z" fill="#ead7ad" stroke="#16171c" strokeWidth={4} />
      <path d="M36 74 L36 34 M36 34 C24 34 18 44 18 44 M36 34 C48 34 54 44 54 44" fill="none" stroke="#3f8a34" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  cola: (
    <g>
      <path d="M14 40 C40 44 60 56 88 74" stroke="#5fb546" strokeWidth={14} strokeLinecap="round" fill="none" />
      <path d="M50 40 L44 60" stroke="#16171c" strokeWidth={4} strokeDasharray="4 4" />
    </g>
  ),
  metro: (
    <g>
      <rect x={14} y={38} width={72} height={24} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      {[24, 34, 44, 54, 64, 74].map((x) => (
        <path key={x} d={`M${x} 38 L${x} ${x % 20 === 4 ? 52 : 46}`} stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.costa - 0.05, 'hoja', 'Costa Rica'],
  [ev.picos - 0.05, 'puas', 'picos'],
  [ev.iguana - 0.05, 'iguana', 'iguana', 'ok', ev.iguana + 0.2],
  [ev.pecera - 0.05, 'pecera', 'pecera chiquita'],
  [ev.grillos - 0.05, 'grillo', 'grillos'],
  [ev.meses - 0.05, 'calendario', 'a los meses'],
  [ev.huesos - 0.05, 'hueso', 'huesos fuertes'],
  [ev.vitamina - 0.05, 'vitD', 'vitamina D'],
  [ev.vidrio - 0.05, 'ventana', 'el vidrio la bloquea', 'no', ev.bloquea + 0.1],
  [ev.susol - 0.15, 'sol', 'su sol', 'ok', ev.susol + 0.1],
  [ev.plantas - 0.05, 'hoja', 'plantas'],
  [ev.carne - 0.05, 'carne', 'carne', 'no', ev.carne + 0.2],
  [ev.quieta - 0.05, 'enfermo', 'no digiere'],
  [ev.treinta - 0.05, 'termometro', 'más de 30°'],
  [ev.rama - 0.05, 'rama', 'rama'],
  [ev.agarras - 0.05, 'mano', 'la agarras'],
  [ev.escapar - 0.05, 'golpe', 'para escapar'],
  [ev.feliz - 0.15, 'iguana', 'iguana feliz', 'ok', ev.feliz + 0.1],
  [ev.metros - 0.3, 'metro', 'casi 2 metros'],
];
const DER: Ic[] = [
  [ev.verde - 0.05, 'iguana', 'lagartija verde'],
  [ev.papada - 0.05, 'papada', 'papada'],
  [ev.felicidades + 0.3, '', ''],
  [ev.ventana - 0.05, 'ventana', 'junto a la ventana'],
  [ev.listo - 0.1, 'grillo', 'grillos', 'ok', ev.listo],
  [ev.doblan - 0.05, 'hueso', 'patas dobladas', 'no', ev.doblan + 0.2],
  [ev.calcio - 0.05, 'calcio', 'calcio'],
  [ev.sol - 0.1, 'sol', 'luz del sol'],
  [ev.ultravioleta - 0.1, 'uv', 'luz ultravioleta', 'ok', ev.ultravioleta + 0.3],
  [ev.grillos2 - 0.05, 'grillo', 'grillos', 'no', ev.grillos2 + 0.1],
  [ev.flores - 0.05, 'fruta', 'flores y frutas'],
  [ev.rinones - 0.05, 'rinon', 'riñones'],
  [ev.comida - 0.1, 'plato', 'su comida', 'ok', ev.comida + 0.1],
  [ev.calor - 0.05, 'copo', 'sin calor propio'],
  [ev.lampara2 - 0.05, 'sol', 'lámpara de calor'],
  [ev.playa - 0.15, 'playa', 'su playa', 'ok', ev.playa + 0.1],
  [ev.cola2 - 0.05, 'cola', 'se queda la cola', 'no', ev.mano],
  [ev.igual - 0.3, 'cola', 'nunca igual'],
  [ev.pecera2 - 0.05, 'pecera', 'no alcanza', 'no', ev.alcanzar],
];

const ROJAS = new Set(['costa', 'rica', 'verde', 'picos', 'papada', 'felicidades', 'iguana', 'chiquita', 'ventana', 'grillos', 'listo', 'raro', 'doblan', 'patas', 'huesos', 'calcio', 'vitamina', 'd', 'sol', 'vidrio', 'bloquea', 'lámpara', 'ultravioleta', 'plantas', 'hojas', 'flores', 'frutas', 'carne', 'riñones', 'comida', 'quieta', 'digiere', 'calor', '30', 'grados', 'panza', 'rama', 'playa', 'cola', 'mano', 'depredadores', 'crecer', 'igual', 'feliz', 'alcanzar', 'metros']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const IguanaVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: '#f3dcae'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.03, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#7fb6ff', mixBlendMode: 'multiply', opacity: 0.2 * ventana(t, ev.quieta - 0.4, ev.lampara2, 0.4)}} />
      <div style={{position: 'absolute', inset: 0, background: '#ff9a3a', mixBlendMode: 'multiply', opacity: 0.16 * ventana(t, ev.lampara2 - 0.2, ev.pero5, 0.4)}} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="30°C" color="#e0453a" o={ventana(t, ev.treinta - 0.1, ev.lampara2 - 0.2, 0.25)} y={420} size={150} fuente={FUENTE} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.metros - 0.1} texto="¡2 METROS!" sub="de iguana adulta" color="#2f9e44" />
      <Audio src={staticFile('iguana/voz.wav')} />
      <Audio src={staticFile('iguana/musica.wav')} />
    </AbsoluteFill>
  );
};
