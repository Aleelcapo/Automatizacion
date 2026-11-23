import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/tucan.json';
import {Camara, G, Luces, P, Papel, Pose, caja, canvasTex, cil, cl, cuerpoSecciones, esf, lerp, poseCamara, r, rnd, suave, texNube, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {FUENTE} from '../serie/tema';

export const DURACION_TUCAN = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  amazonas: T('amazonas'),
  regala: T('regala'),
  pajaro: T('pájaro'),
  pecho: T('pecho'),
  pico: T('pico'),
  gigante: T('gigante'),
  juguete: T('juguete…'),
  felicidades: T('felicidades'),
  tucan: T('tucán.'),
  metes: T('metes'),
  jaula: T('jaula'),
  canario: T('canario'),
  semillas: T('semillas'),
  listo: T('listo.'),
  pero: T('pero'),
  dias: T('días'),
  no: T('no'),
  agarra: T('agarra'),
  tira: T('tira.'),
  es: T('es'),
  pico2: T('pico', 2),
  enorme: T('enorme'),
  dentro: T('dentro'),
  hueco: T('hueco'),
};

// ---------- colores ----------
const NEGRO = '#23242c';
const NARANJA = '#ff8a1c';
const PECHO = '#ffe066';
const MADERA = '#b87a45';

// ---------- texturas ----------
let _pasto: THREE.CanvasTexture | null = null;
const texPasto = () => {
  if (_pasto) return _pasto;
  _pasto = canvasTex(
    512,
    512,
    (g) => {
      g.fillStyle = '#8fd24e';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 900; i++) {
        g.strokeStyle = rnd(i) > 0.5 ? 'rgba(70,140,40,0.35)' : 'rgba(200,240,140,0.35)';
        g.lineWidth = 2;
        const x = rnd(i + 1) * 512;
        const y = rnd(i + 2) * 512;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd(i + 3) - 0.5) * 6, y - 8 - rnd(i + 4) * 10);
        g.stroke();
      }
    },
    [10, 8],
  );
  return _pasto;
};
let _pared: THREE.CanvasTexture | null = null;
const texPared = () => {
  if (_pared) return _pared;
  _pared = canvasTex(
    512,
    512,
    (g) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(120,100,80,${0.04 + rnd(i) * 0.05})`;
        g.beginPath();
        g.ellipse(rnd(i + 1) * 512, rnd(i + 2) * 512, 10 + rnd(i + 3) * 40, 6 + rnd(i + 4) * 20, 0, 0, Math.PI * 2);
        g.fill();
      }
    },
    [6, 2],
  );
  return _pared;
};
let _panal: THREE.CanvasTexture | null = null;
const texPanal = () => {
  if (_panal) return _panal;
  _panal = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#d58a3a';
      g.fillRect(0, 0, 256, 256);
      const s = 32;
      const hgt = Math.sqrt(3) * s;
      for (let cx = -1; cx < 6; cx++)
        for (let cy = -1; cy < 6; cy++) {
          const x = cx * s * 1.5;
          const y = cy * hgt + (cx % 2 ? hgt / 2 : 0);
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const px = x + Math.cos(a) * s * 0.82;
            const py = y + Math.sin(a) * s * 0.82;
            if (k === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.closePath();
          g.fillStyle = '#fbe9c2';
          g.fill();
          g.strokeStyle = '#8a4f1c';
          g.lineWidth = 3;
          g.stroke();
        }
    },
    [1, 1],
  );
  _panal.repeat.set(5.5, 5.5);
  return _panal;
};

// ---------- pico ----------
const BX0 = 0.1;
const BX1 = 1.0;
// [x, medio ancho, arriba, abajo]
const PERFIL: [number, number, number, number][] = [
  [0.1, 0.1, 0.13, 0.11],
  [0.3, 0.095, 0.13, 0.09],
  [0.55, 0.08, 0.11, 0.065],
  [0.78, 0.06, 0.08, 0.04],
  [0.92, 0.04, 0.05, 0.02],
  [1.0, 0.006, 0.006, 0.0],
];
const perfil = (x: number) => {
  for (let i = 0; i < PERFIL.length - 1; i++) {
    const a = PERFIL[i];
    const b = PERFIL[i + 1];
    if (x >= a[0] && x <= b[0]) {
      const u = (x - a[0]) / (b[0] - a[0]);
      const s = u * u * (3 - 2 * u);
      return [lerp(a[1], b[1], s), lerp(a[2], b[2], s), lerp(a[3], b[3], s)];
    }
  }
  const l = PERFIL[PERFIL.length - 1];
  return [l[1], l[2], l[3]];
};
const curva = (x: number) => -0.13 * ((x - BX0) / (BX1 - BX0)) ** 2;

const geoPico = (mitad: boolean) => {
  const sec: [number, number, number, number, number][] = [];
  for (let i = 0; i <= 36; i++) {
    const x = lerp(BX0, BX1, i / 36);
    const [w, up, dn] = perfil(x);
    sec.push([x, Math.max(w, 0.003), Math.max(up, 0.003), Math.max(dn, 0.002), 2.2]);
  }
  const g = cuerpoSecciones(sec, {mitad, segX: 72, segA: 28});
  const p = g.getAttribute('position');
  const col: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setY(i, y + curva(x));
    const [, up] = perfil(x);
    if (x > 0.86) c.set('#1d1d22');
    else if (x < 0.13) c.set('#2a6e3a');
    else if (y > up * 0.72 && x < 0.7) c.set('#ffc23a');
    else if (y < -0.02 && x < 0.6) c.set('#f06a1a');
    else c.set(NARANJA);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};
const formaPerfil = (k: number) => {
  const s = new THREE.Shape();
  const N = 40;
  const x0 = lerp(BX0, BX1, (1 - k) * 0.06);
  const x1 = lerp(BX0, BX1, 1 - (1 - k) * 0.9);
  for (let i = 0; i <= N; i++) {
    const x = lerp(x0, x1, i / N);
    const [, up] = perfil(x);
    const y = up * k + curva(x);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const x = lerp(x0, x1, i / N);
    const [, , dn] = perfil(x);
    s.lineTo(x, -dn * k + curva(x));
  }
  return new THREE.ShapeGeometry(s);
};

const Pico: React.FC<{t: number; escala: number; corte: number}> = ({t, escala, corte}) => {
  const lleno = G('picoLleno', () => geoPico(false));
  const mitad = G('picoMitad', () => geoPico(true));
  const capa = G('picoCapa', () => formaPerfil(1));
  const panal = G('picoPanal', () => formaPerfil(0.8));
  void t;
  return (
    <group scale={[escala, escala, escala]}>
      {corte < 0.01 ? (
        <P geo={lleno} vc color="#ffffff" umbral={60} linea={1.2} silueta={2.6} />
      ) : (
        <>
          <P geo={mitad} vc color="#ffffff" umbral={60} linea={0} silueta={0} />
          <P geo={capa} color={NARANJA} position={[0, 0, 0.001]} linea={1.6} silueta={0} umbral={10} sombra={false} />
          <P geo={panal} color="#ffffff" mapa={texPanal()} position={[0, 0, 0.003]} linea={1.4} silueta={0} umbral={10} sombra={false} />
          {corte < 0.97 && (
            <group position={[0, corte * 0.9, corte * 0.5]} rotation={[corte * 0.9, 0, corte * 0.4]} scale={[1, 1, -1]}>
              <P geo={mitad} vc color="#ffffff" umbral={60} linea={1.2} silueta={0} doble />
            </group>
          )}
        </>
      )}
    </group>
  );
};

// ---------- tucán ----------
const Ojo: React.FC<{z: number; cierre?: number}> = ({z, cierre = 1}) => (
  <group position={[0.07, 0.03, z]} rotation={[Math.PI / 2, 0, 0]}>
    <P geo={cil(0.075, 0.075, 0.02, 24)} color="#4fb7e6" linea={0} silueta={1.6} sombra={false} />
    <P geo={cil(0.05, 0.05, 0.024, 24)} color="#ff9a2e" linea={0} silueta={0} sombra={false} />
    <P geo={esf(0.036, 16)} color="#121216" position={[0, Math.sign(z) * 0.012, 0]} linea={0} silueta={0} sombra={false} />
    <P geo={esf(0.012, 8)} color="#ffffff" position={[0.012, Math.sign(z) * 0.04, -0.012]} linea={0} silueta={0} sombra={false} />
    {cierre < 0.99 && <P geo={caja(0.17, 0.03, 0.1)} color={NEGRO} position={[0, Math.sign(z) * 0.035, -(0.085 - (1 - cierre) * 0.075)]} linea={0} silueta={0} sombra={false} />}
  </group>
);

const geoMedia = (rr: number, s: number) => G(`media|${rr}|${s}`, () => new THREE.SphereGeometry(rr, s, Math.round(s * 0.66), Math.PI, Math.PI));
const geoTapaC = (rr: number) => G(`tapaC|${rr}`, () => new THREE.CircleGeometry(rr, 40));

// vasos sanguíneos del pico (cara +z)
const caraZ = (x: number, yRel: number) => {
  const [w, up, dn] = perfil(x);
  const h = yRel >= 0 ? up : dn;
  const k = Math.min(0.97, Math.abs(yRel) / Math.max(h, 1e-3));
  return w * Math.pow(1 - Math.pow(k, 2.2), 1 / 2.2) + 0.004;
};
const RUTAS: [number, number][][] = [
  [[0.14, 0.02], [0.3, 0.03], [0.5, 0.02], [0.7, 0.0], [0.84, -0.005]],
  [[0.2, 0.0], [0.35, 0.07], [0.55, 0.07], [0.72, 0.04]],
  [[0.22, 0.0], [0.38, -0.05], [0.58, -0.035], [0.76, -0.02]],
  [[0.4, 0.07], [0.5, 0.1], [0.62, 0.08]],
  [[0.45, -0.04], [0.55, -0.055], [0.66, -0.03]],
];
const geoVasos = () =>
  mergeGeometries(
    RUTAS.map((ruta, i) =>
      tuboAhusado(
        ruta.map(([x, y]) => new THREE.Vector3(x, y + curva(x), caraZ(x, y))),
        (u) => (i === 0 ? 0.011 : 0.008) * (1 - 0.5 * u),
        40,
        6,
      ),
    ),
  );

const Tucan: React.FC<{
  t: number;
  picoEsc?: number;
  pechoEsc?: number;
  cabeza?: number;
  corte?: number;
  corteCuerpo?: boolean;
  hierro?: number;
  higado?: number;
  vasos?: number; // 1 = calor (rojo), -1 = frío
  ojos?: number; // 1 abiertos, 0.3 cansado
}> = ({t, picoEsc = 1, pechoEsc = 1, cabeza = 0, corte = 0, corteCuerpo = false, hierro = 0, higado = 0, vasos = 0, ojos = 1}) => {
  const resp = Math.sin(t * 2.2) * 0.012;
  const vg = G('vasosPico', geoVasos);
  const colHig = new THREE.Color('#a0352f').lerp(new THREE.Color('#3b1a12'), higado).getStyle();
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.02, 0, s * 0.09]}>
          <P geo={cil(0.022, 0.022, 0.22, 8)} color="#5a7fd6" position={[0, 0.11, 0]} linea={0} silueta={1.6} />
          <P geo={caja(0.14, 0.025, 0.05)} color="#5a7fd6" position={[0.03, 0.012, 0]} linea={0} silueta={1.6} />
        </group>
      ))}
      <group position={[0, resp, 0]}>
        <P geo={caja(0.5, 0.05, 0.17)} color={NEGRO} position={[-0.42, 0.3, 0]} rotation={[0, 0, 0.75]} umbral={40} />
        <P geo={esf(0.1, 16)} color="#e5352c" position={[-0.2, 0.25, 0]} scale={[1, 0.7, 1.2]} linea={0} />
        {!corteCuerpo ? (
          <>
            <P geo={esf(0.3, 28)} color={NEGRO} position={[-0.02, 0.5, 0]} scale={[1, 1.35, 1]} rotation={[0, 0, -0.25]} linea={0} />
            {[-1, 1].map((s) => (
              <P key={s} geo={esf(0.26, 20)} color="#17181e" position={[-0.1, 0.5, s * 0.25]} scale={[1.15, 1.2, 0.28]} rotation={[0, 0, -0.45]} linea={0} />
            ))}
            <P geo={esf(0.2, 24)} color={PECHO} position={[0.16, 0.7, 0]} scale={[0.6 * pechoEsc, 1.05 * pechoEsc, 1.15 * pechoEsc]} linea={0} silueta={1.8} />
          </>
        ) : (
          <>
            <group position={[-0.02, 0.5, 0]} scale={[1, 1.35, 1]} rotation={[0, 0, -0.25]}>
              <P geo={geoMedia(0.3, 28)} color={NEGRO} linea={0} silueta={2} doble />
              <P geo={geoTapaC(0.3)} color="#f2a39b" position={[0, 0, 0.001]} linea={0} silueta={0} />
              <P geo={geoTapaC(0.27)} color="#e98b84" position={[0, 0, 0.002]} linea={0} silueta={0} />
            </group>
            <P geo={esf(0.26, 20)} color="#17181e" position={[-0.1, 0.5, -0.25]} scale={[1.15, 1.2, 0.28]} rotation={[0, 0, -0.45]} linea={0} />
            <group position={[0.16, 0.7, 0]} scale={[0.6, 1.05, 1.15]}>
              <P geo={geoMedia(0.2, 24)} color={PECHO} linea={0} silueta={0} doble />
            </group>
            {/* tubo digestivo */}
            <P geo={G('tripa', () => tuboAhusado([new THREE.Vector3(0.14, 0.86, 0), new THREE.Vector3(0.12, 0.7, 0), new THREE.Vector3(0.0, 0.52, 0), new THREE.Vector3(-0.08, 0.38, 0), new THREE.Vector3(-0.16, 0.3, 0)], () => 0.028, 40, 10))} color="#f5c9a0" linea={0} silueta={1.6} />
            {/* hígado */}
            <P geo={esf(0.1, 24)} color={colHig} position={[0.07, 0.5, 0]} scale={[1.25 * (1 + 0.15 * higado), 0.85 * (1 + 0.15 * higado), 0.5]} linea={0} silueta={2} />
            {/* corazón */}
            <P geo={esf(0.05, 16)} color="#e0413a" position={[0.08, 0.68, 0]} scale={[1, 1.1, 0.6]} linea={0} silueta={1.6} />
            {/* hierro */}
            {Array.from({length: 34}, (_, i) => {
              const k = hierro * 34 - i;
              if (k <= 0) return null;
              const u = cl(k / 3);
              const ini = new THREE.Vector3(0.02, 0.56, 0.03);
              const fin = new THREE.Vector3(0.07 + (rnd(i) - 0.5) * 0.2, 0.5 + (rnd(i + 5) - 0.5) * 0.12, 0.045);
              const p = ini.lerp(fin, suave(u));
              return <P key={i} geo={esf(0.011, 8)} color="#c4561e" position={[p.x, p.y, p.z]} linea={0} silueta={1} sombra={false} />;
            })}
          </>
        )}
        <group position={[0.1, 0.9, 0]} rotation={[0, 0, cabeza]}>
          <P geo={esf(0.2, 28)} color={NEGRO} linea={0} />
          <P geo={esf(0.13, 20)} color={PECHO} position={[0.07, -0.08, 0]} scale={[0.8, 0.8, 1.3]} linea={0} silueta={0} />
          <Ojo z={0.17} cierre={ojos} />
          <Ojo z={-0.17} cierre={ojos} />
          <group scale={[picoEsc, picoEsc, picoEsc]}>
            {vasos !== 0 && corte < 0.01 && <P geo={vg} color={vasos > 0 ? '#e3221c' : '#6f86b5'} scale={[1, 1, vasos > 0 ? 1 : 0.985]} linea={0} silueta={vasos > 0 ? 1.4 : 0.8} sombra={false} />}
          </group>
          <Pico t={t} escala={picoEsc} corte={corte} />
        </group>
      </group>
    </group>
  );
};

// ---------- tío Claudio ----------
const Tio: React.FC<{t: number; anda: number; brazos: number; saluda: number}> = ({t, anda, brazos, saluda}) => {
  const paso = Math.sin(t * 9) * 0.55 * anda;
  const PIEL = '#f2b48c';
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.15, 0.95, 0]} rotation={[s * paso, 0, 0]}>
          <P geo={cil(0.1, 0.09, 0.85, 14)} color="#6b5a45" position={[0, -0.43, 0]} umbral={40} />
          <P geo={caja(0.2, 0.12, 0.32)} color="#3a2a22" position={[0, -0.9, 0.06]} />
        </group>
      ))}
      <P geo={cil(0.3, 0.33, 0.78, 18)} color="#d2ad6f" position={[0, 1.33, 0]} umbral={40} />
      <P geo={caja(0.62, 0.06, 0.62)} color="#5a3e2a" position={[0, 0.98, 0]} linea={0} />
      {/* bolsillos */}
      {[-1, 1].map((s) => (
        <P key={s} geo={caja(0.14, 0.14, 0.02)} color="#c49d60" position={[s * 0.14, 1.5, 0.31]} />
      ))}
      {/* brazos */}
      {[-1, 1].map((s) => {
        const ox = s > 0 && saluda > 0 ? -2.6 * saluda : -1.25 * brazos;
        const oz = s > 0 && saluda > 0 ? -0.35 * saluda + Math.sin(t * 10) * 0.25 * saluda : s * paso * 0.4 * (1 - brazos);
        return (
          <group key={s} position={[s * 0.36, 1.62, 0]} rotation={[ox, 0, s * 0.12 + oz * s]}>
            <P geo={cil(0.085, 0.075, 0.42, 12)} color="#d2ad6f" position={[0, -0.2, 0]} umbral={40} />
            <P geo={cil(0.065, 0.06, 0.32, 12)} color={PIEL} position={[0, -0.55, 0]} umbral={40} />
            <P geo={esf(0.08, 12)} color={PIEL} position={[0, -0.74, 0]} linea={0} />
          </group>
        );
      })}
      {/* cabeza */}
      <group position={[0, 2.02, 0]}>
        <P geo={esf(0.3, 28)} color={PIEL} linea={0} />
        <P geo={esf(0.07, 12)} color="#e89a74" position={[0, -0.02, 0.29]} linea={0} />
        <P geo={caja(0.26, 0.06, 0.06)} color="#4b3326" position={[0, -0.1, 0.27]} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <P geo={esf(0.045, 12)} color="#ffffff" position={[s * 0.1, 0.07, 0.26]} linea={0} silueta={1.4} />
            <P geo={esf(0.022, 8)} color="#141418" position={[s * 0.1, 0.07, 0.3]} linea={0} silueta={0} />
          </group>
        ))}
        <P geo={cil(0.5, 0.5, 0.03, 28)} color="#dcc28c" position={[0, 0.18, 0]} />
        <P geo={cil(0.24, 0.28, 0.22, 24)} color="#dcc28c" position={[0, 0.3, 0]} />
        <P geo={cil(0.285, 0.285, 0.05, 24)} color="#6b4a2b" position={[0, 0.22, 0]} linea={0} silueta={0} />
      </group>
    </group>
  );
};

// ---------- caja de madera ----------
const Cajon: React.FC<{tapa: number}> = ({tapa}) => (
  <group>
    <P geo={caja(0.62, 0.4, 0.46)} color="#c98d52" position={[0, 0.2, 0]} />
    {[0.1, 0.2, 0.3].map((y) => (
      <P key={y} geo={caja(0.63, 0.012, 0.47)} color="#9a6232" position={[0, y, 0]} linea={0} silueta={0} />
    ))}
    {[-0.18, 0, 0.18].map((x) => (
      <P key={x} geo={cil(0.03, 0.03, 0.02, 12)} color="#2a1c12" position={[x, 0.25, 0.232]} rotation={[Math.PI / 2, 0, 0]} linea={0} silueta={0} sombra={false} />
    ))}
    {tapa < 0.98 && (
      <group position={[tapa * 0.5, 0.4 + Math.sin(tapa * Math.PI) * 0.5 - tapa * 0.4, -0.23 - tapa * 0.5]} rotation={[-tapa * 1.4, 0, -tapa * 0.8]}>
        <P geo={caja(0.64, 0.04, 0.48)} color="#b57a42" position={[0, 0.02, 0.24]} />
      </group>
    )}
  </group>
);

// ---------- jaula redonda (de canario) ----------
const JR = 0.38;
const JH = 0.62;
const Jaula: React.FC = () => {
  const barras = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(0.008, 0.008, JH, 5);
      g.translate(Math.cos(a) * JR, JH / 2, Math.sin(a) * JR);
      gs.push(g);
    }
    for (let i = 0; i < 6; i++) {
      const g = new THREE.TorusGeometry(JR, 0.008, 5, 40, Math.PI);
      g.rotateY((i / 6) * Math.PI);
      g.translate(0, JH, 0);
      gs.push(g);
    }
    for (const y of [0.02, JH * 0.5, JH]) {
      const g = new THREE.TorusGeometry(JR, 0.012, 6, 48);
      g.rotateX(Math.PI / 2);
      g.translate(0, y, 0);
      gs.push(g);
    }
    const anillo = new THREE.TorusGeometry(0.06, 0.014, 8, 20);
    anillo.translate(0, JH + JR + 0.06, 0);
    gs.push(anillo);
    return mergeGeometries(gs);
  }, []);
  return (
    <group>
      <P geo={cil(JR + 0.05, JR + 0.04, 0.09, 40)} color="#d6393a" position={[0, -0.045, 0]} />
      <P geo={cil(JR, JR, 0.02, 40)} color="#f3f0e6" position={[0, 0.005, 0]} linea={0} silueta={0} />
      <P geo={barras} color="#c3c7cf" linea={0} silueta={1.1} />
      <P geo={cil(0.018, 0.018, JR * 2, 8)} color={MADERA} position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} linea={0} silueta={1.4} />
    </group>
  );
};

// ---------- escenario ----------
const Pasto: React.FC = () => {
  const mata = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 170; i++) {
      const x = (rnd(i * 3) - 0.5) * 16;
      const z = -2.4 + rnd(i * 3 + 1) * 9;
      for (let k = 0; k < 3; k++) {
        const h = 0.13 + rnd(i * 7 + k) * 0.12;
        const g = new THREE.ConeGeometry(0.025, h, 3);
        g.translate(0, h / 2, 0);
        g.rotateZ((k - 1) * 0.35 + (rnd(i + k) - 0.5) * 0.2);
        g.translate(x + (k - 1) * 0.03, 0, z);
        gs.push(g);
      }
    }
    return mergeGeometries(gs);
  }, []);
  return <P geo={mata} color="#5aa83a" linea={0} silueta={1.2} sombra={false} />;
};

const Casa: React.FC = () => (
  <group>
    <P geo={caja(30, 4.4, 0.3)} color="#d6c6a6" mapa={texPared()} position={[0, 2.2, -3]} linea={0} silueta={0} />
    <P geo={caja(30, 0.25, 0.32)} color="#a89474" position={[0, 0.12, -2.98]} linea={0} silueta={0} />
    <P geo={caja(30, 0.3, 1.2)} color="#e2bf82" position={[0, 4.15, -2.4]} />
    <P geo={caja(30, 0.7, 1.5)} color="#b8473a" position={[0, 4.6, -2.3]} />
    {/* puerta */}
    <P geo={caja(1.2, 2.4, 0.08)} color="#6d4630" position={[-2.6, 1.2, -2.84]} />
    {/* ventana */}
    <P geo={caja(1.7, 1.3, 0.08)} color="#f2ece0" position={[1.4, 2.2, -2.84]} />
    <P geo={caja(1.45, 1.05, 0.1)} color="#8fb6cf" position={[1.4, 2.2, -2.82]} />
    <P geo={caja(0.05, 1.05, 0.12)} color="#f2ece0" position={[1.4, 2.2, -2.8]} linea={0} />
    <P geo={caja(1.9, 0.1, 0.3)} color="#f2ece0" position={[1.4, 1.5, -2.75]} />
  </group>
);

const Mesa: React.FC = () => (
  <group>
    <P geo={caja(1.5, 0.08, 0.95)} color={MADERA} position={[0, 0.95, 0]} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <P key={`${sx}${sz}`} geo={caja(0.08, 0.92, 0.08)} color="#9b6236" position={[sx * 0.66, 0.46, sz * 0.4]} />))}
  </group>
);

const POSTE_X = 2.45;
const JAULA: [number, number, number] = [3.05, 1.2, 0];
const Poste: React.FC = () => (
  <group>
    <P geo={caja(0.5, 0.06, 0.5)} color="#7b7f86" position={[POSTE_X, 0.03, 0]} />
    <P geo={caja(0.08, 2.65, 0.08)} color="#8a5a34" position={[POSTE_X, 1.35, 0]} />
    <P geo={caja(0.75, 0.07, 0.07)} color="#8a5a34" position={[POSTE_X + 0.34, 2.64, 0]} />
    <P geo={cil(0.006, 0.006, 0.16, 4)} color="#555" position={[JAULA[0], 2.53, 0]} linea={0} silueta={1} />
  </group>
);

// ---------- semillas ----------
const Semillas: React.FC<{t: number}> = ({t}) => {
  const plato = r(t, ev.semillas - 0.1, 0.3);
  const tip = new THREE.Vector3(JAULA[0] + 0.46, JAULA[1] + 0.52, 0.22);
  return (
    <group>
      {plato > 0.01 && (
        <group position={[JAULA[0] - 0.18, JAULA[1] + 0.03, 0.16]} scale={plato}>
          <P geo={cil(0.11, 0.08, 0.07, 20)} color="#e0453a" position={[0, 0.035, 0]} />
          {Array.from({length: 9}, (_, i) => {
            const lanzada = ev.agarra + i * 0.17;
            if (t > lanzada) return null;
            return <P key={i} geo={esf(0.02, 8)} color="#8a5b2a" position={[(rnd(i) - 0.5) * 0.12, 0.075, (rnd(i + 9) - 0.5) * 0.12]} scale={[1.3, 0.8, 0.9]} linea={0} silueta={0.9} />;
          })}
        </group>
      )}
      {Array.from({length: 9}, (_, i) => {
        const t0 = ev.agarra + i * 0.17 + 0.15;
        const dt = t - t0;
        if (dt < 0) return null;
        const vx = 0.9 + rnd(i + 3) * 0.8;
        const vz = 0.5 + rnd(i + 4) * 0.9;
        const vy = 1.2 + rnd(i + 5) * 0.8;
        let y = tip.y + vy * dt - 4.9 * dt * dt;
        let tt = dt;
        if (y < 0.03) {
          y = 0.03;
          const a = 4.9;
          tt = (vy + Math.sqrt(vy * vy + 4 * a * (tip.y - 0.03))) / (2 * a);
        }
        return <P key={i} geo={esf(0.022, 8)} color="#8a5b2a" position={[tip.x + vx * tt, y, tip.z + vz * tt]} scale={[1.3, 0.8, 0.9]} linea={0} silueta={1} />;
      })}
    </group>
  );
};

// ---------- extras ----------
const ev2 = {
  esponja: T('esponja'),
  no2: T('no', 2),
  romper: T('romper'),
  suyo: T('suyo'),
  fruta: T('fruta:'),
  agarra2: T('agarra', 2),
  punta: T('punta,'),
  lanza: T('lanza'),
  traga: T('traga'),
  comida: T('comida.'),
  pero3: T('pero', 3),
  naranja: T('naranja', 2),
  todos: T('todos'),
  enferma: T('enferma.'),
  cuerpo: T('cuerpo'),
  hierro: T('hierro'),
  acido: T('ácido'),
  acumula: T('acumula'),
  matar: T('matar.'),
  papaya: T('papaya,'),
  melon: T('melón'),
  especial: T('especial'),
  pero4: T('pero', 4),
  golpeando: T('golpeando'),
  vuela: T('vuela:'),
  saltando: T('saltando'),
  rama1: T('rama', 1),
  rama2: T('rama', 2),
  larga: T('larga,'),
  palos: T('palos'),
  casa: T('casa.'),
  pero5: T('pero', 5),
  calor: T('calor'),
  tocas: T('tocas'),
  caliente: T('caliente.'),
  es5: T('aire') - 1.1,
  aire: T('aire'),
  manda: T('manda'),
  radiador: T('radiador'),
  frio: T('frío,'),
  corta: T('corta'),
  ahora: T('ahora'),
  feliz: T('feliz.'),
  pregunta: T('pregúntale'),
  trajo: T('trajo…'),
  selva: T('selva'),
  permiso: T('permiso'),
  trafico: T('tráfico'),
};

const Halo: React.FC<{pos: [number, number, number]; o: number; escala: number; color?: string}> = ({pos, o, escala, color = '#ffd27a'}) => {
  if (o <= 0.01) return null;
  return (
    <sprite position={pos} scale={[escala, escala, 1]}>
      <spriteMaterial map={texNube()} color={color} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

let _ondas: THREE.CanvasTexture | null = null;
const texOndas = () => {
  if (_ondas) return _ondas;
  _ondas = canvasTex(128, 256, (g) => {
    g.clearRect(0, 0, 128, 256);
    g.lineWidth = 9;
    g.lineCap = 'round';
    for (const x0 of [30, 64, 98]) {
      g.strokeStyle = '#16171c';
      g.lineWidth = 14;
      g.beginPath();
      for (let y = 230; y > 30; y -= 4) g.lineTo(x0 + Math.sin(y / 22) * 10, y);
      g.stroke();
      g.strokeStyle = '#ff8a2a';
      g.lineWidth = 8;
      g.beginPath();
      for (let y = 230; y > 30; y -= 4) g.lineTo(x0 + Math.sin(y / 22) * 10, y);
      g.stroke();
    }
  });
  _ondas.wrapS = _ondas.wrapT = THREE.ClampToEdgeWrapping;
  return _ondas;
};
let _copo: THREE.CanvasTexture | null = null;
const texCopo = () => {
  if (_copo) return _copo;
  _copo = canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.translate(32, 32);
    for (let k = 0; k < 6; k++) {
      g.rotate(Math.PI / 3);
      g.strokeStyle = '#16171c';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 26);
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 25);
      g.stroke();
    }
  });
  _copo.wrapS = _copo.wrapT = THREE.ClampToEdgeWrapping;
  return _copo;
};
let _estrella: THREE.CanvasTexture | null = null;
const texEstrella = () => {
  if (_estrella) return _estrella;
  _estrella = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const rr = k % 2 ? 26 : 58;
      g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = '#ffe14d';
    g.fill();
    g.strokeStyle = '#16171c';
    g.lineWidth = 6;
    g.stroke();
  });
  _estrella.wrapS = _estrella.wrapT = THREE.ClampToEdgeWrapping;
  return _estrella;
};
const Sprite: React.FC<{tex: THREE.Texture; pos: [number, number, number]; escala: [number, number]; o: number; rot?: number}> = ({tex, pos, escala, o, rot = 0}) =>
  o <= 0.01 ? null : (
    <sprite position={pos} scale={[escala[0], escala[1], 1]}>
      <spriteMaterial map={tex} transparent opacity={o} depthWrite={false} rotation={rot} />
    </sprite>
  );

// punta del pico en el mundo
const puntaPico = (base: [number, number, number], rotY: number, s: number, cabeza: number, picoEsc = 1, u = 1) => {
  const lx = lerp(BX0, BX1, u) * picoEsc;
  const ly = curva(lerp(BX0, BX1, u)) * picoEsc;
  const hx = lx * Math.cos(cabeza) - ly * Math.sin(cabeza) + 0.1;
  const hy = lx * Math.sin(cabeza) + ly * Math.cos(cabeza) + 0.9;
  return new THREE.Vector3(base[0] + hx * s * Math.cos(rotY), base[1] + hy * s, base[2] - hx * s * Math.sin(rotY));
};

// ---------- plato de comida ----------
const Plato: React.FC<{tipo: 'fruta' | 'naranja' | 'mix'; quedan: number}> = ({tipo, quedan}) => (
  <group>
    <P geo={cil(0.17, 0.12, 0.08, 28)} color="#f4f1ea" position={[0, 0.04, 0]} />
    {Array.from({length: 10}, (_, i) => {
      if (i >= quedan) return null;
      const a = rnd(i + 2) * Math.PI * 2;
      const d = rnd(i + 4) * 0.1;
      const p: [number, number, number] = [Math.cos(a) * d, 0.1 + rnd(i) * 0.02, Math.sin(a) * d];
      if (tipo === 'naranja') return <P key={i} geo={G('gajo', () => new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16, 1, false, 0, Math.PI))} color="#ff9a1a" position={p} rotation={[Math.PI / 2, 0, a]} />;
      const col = tipo === 'fruta' ? '#ffa62b' : ['#ffa62b', '#c9e98a', '#a26b35'][i % 3];
      return <P key={i} geo={caja(0.05, 0.05, 0.05)} color={col} position={p} rotation={[rnd(i) * 2, rnd(i + 1) * 2, 0]} />;
    })}
  </group>
);

// ---------- aviario (jaula larga) ----------
const AV: [number, number, number] = [7.4, 0, 0];
const AVW = 2.3;
const AVD = 1.1;
const AV0 = 0.55;
const AVH = 2.0;
const PERCHAS: [number, number][] = [
  [-0.72, 0.42],
  [-0.2, 0.98],
  [0.38, 0.6],
  [0.7, 1.32],
];
const Aviario: React.FC = () => {
  const barras = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    const add = (x: number, z: number) => {
      const g = new THREE.CylinderGeometry(0.007, 0.007, AVH, 5);
      g.translate(x, AV0 + AVH / 2, z);
      gs.push(g);
    };
    for (let x = -AVW / 2; x <= AVW / 2 + 0.001; x += 0.09) add(x, -AVD / 2);
    for (let z = -AVD / 2; z <= AVD / 2 + 0.001; z += 0.09) {
      add(-AVW / 2, z);
      add(AVW / 2, z);
    }
    return mergeGeometries(gs);
  }, []);
  const NEG = '#2a2b31';
  return (
    <group>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <P key={`${sx}${sz}`} geo={caja(0.07, AV0 + AVH, 0.07)} color={NEG} position={[(sx * AVW) / 2, (AV0 + AVH) / 2, (sz * AVD) / 2]} />),
      )}
      <P geo={caja(AVW + 0.08, 0.1, AVD + 0.08)} color={NEG} position={[0, AV0 - 0.05, 0]} />
      <P geo={caja(AVW - 0.05, 0.03, AVD - 0.05)} color="#f3efe4" position={[0, AV0 + 0.015, 0]} linea={0} />
      <P geo={caja(AVW + 0.08, 0.07, AVD + 0.08)} color={NEG} position={[0, AV0 + AVH, 0]} />
      <P geo={caja(AVW + 0.02, 0.04, AVD + 0.02)} color="#3a3b42" position={[0, 0.22, 0]} linea={0} />
      <P geo={barras} color={NEG} linea={0} silueta={0.9} sombra={false} />
      {PERCHAS.map(([x, y], i) => (
        <group key={i}>
          <P geo={cil(0.025, 0.025, 0.62, 10)} color={MADERA} position={[x, AV0 + y, -0.05]} rotation={[0, 0, Math.PI / 2]} />
          <P geo={cil(0.02, 0.02, AVD / 2, 8)} color="#8a5a34" position={[x, AV0 + y, -AVD / 4 - 0.05]} rotation={[Math.PI / 2, 0, 0]} linea={0} />
        </group>
      ))}
      {[-0.5, 0.0].map((x) => (
        <P key={x} geo={cil(0.09, 0.07, 0.07, 20)} color="#f4f1ea" position={[x, AV0 + 0.07, 0.25]} />
      ))}
      <P geo={cil(0.18, 0.16, 0.05, 28)} color="#7fc6e8" position={[0.65, AV0 + 0.06, 0.2]} linea={0} />
    </group>
  );
};
const posPercha = (i: number): [number, number, number] => [AV[0] + PERCHAS[i][0] + 0.05, AV0 + PERCHAS[i][1] + 0.022, -0.05];
const SALTOS: [number, number, number][] = [
  // tiempo, desde, hasta
  [ev2.saltando - 0.1, 0, 1],
  [ev2.rama1 - 0.05, 1, 3],
  [ev2.rama2 + 0.05, 3, 2],
  [ev2.palos - 0.2, 2, 0],
  [ev2.palos + 0.7, 0, 1],
  [ev2.casa - 0.6, 1, 2],
];
const enAviario = (t: number) => {
  let pos = posPercha(0);
  let mira = 1;
  for (const [t0, a, b] of SALTOS) {
    if (t < t0) break;
    const u = cl((t - t0) / 0.45);
    const A = posPercha(a);
    const B = posPercha(b);
    pos = [lerp(A[0], B[0], u), lerp(A[1], B[1], u) + Math.sin(u * Math.PI) * 0.35, lerp(A[2], B[2], u)];
    mira = B[0] >= A[0] ? 1 : -1;
  }
  return {pos, rotY: mira > 0 ? -0.45 : Math.PI + 0.45};
};

// ---------- mano y maleta ----------
const Mano: React.FC<{desde: THREE.Vector3; hasta: THREE.Vector3}> = ({desde, hasta}) => {
  const dir = hasta.clone().sub(desde);
  const L = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = desde.clone().add(hasta).multiplyScalar(0.5);
  return (
    <group>
      <group position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
        <P geo={cil(0.04, 0.05, L, 14)} color="#f2b48c" umbral={40} />
      </group>
      <P geo={esf(0.055, 14)} color="#f2b48c" position={[hasta.x, hasta.y, hasta.z]} scale={[1, 0.8, 1.1]} linea={0} />
    </group>
  );
};

const Maleta: React.FC<{abre: number; t: number}> = ({abre, t}) => (
  <group>
    <P geo={caja(0.8, 0.2, 0.5)} color="#7a4a2c" position={[0, 0.1, 0]} />
    <P geo={caja(0.82, 0.04, 0.52)} color="#c8a36a" position={[0, 0.12, 0]} linea={0} />
    <group position={[0, 0.2, -0.25]} rotation={[-abre * 1.9, 0, 0]}>
      <P geo={caja(0.8, 0.12, 0.5)} color="#8a5634" position={[0, 0.06, 0.25]} />
      <P geo={caja(0.2, 0.12, 0.01)} color="#e0453a" position={[-0.18, 0.06, 0.505]} linea={0} />
      <P geo={caja(0.16, 0.1, 0.01)} color="#3fae4a" position={[0.2, 0.06, 0.505]} linea={0} />
    </group>
    {abre > 0.3 &&
      Array.from({length: 10}, (_, i) => {
        const dt = (t - ev2.trajo) * 0.8 - i * 0.07;
        if (dt < 0) return null;
        return (
          <P
            key={i}
            geo={G('plumaG', () => new THREE.SphereGeometry(0.05, 10, 8))}
            color={i % 3 === 0 ? PECHO : NEGRO}
            position={[(rnd(i) - 0.5) * 0.7 * dt + Math.sin(t * 3 + i) * 0.05, 0.22 + dt * 0.9 - dt * dt * 0.5, (rnd(i + 3) - 0.3) * 0.4 * dt]}
            scale={[1.6, 0.25, 0.6]}
            rotation={[t * 2 + i, i, t + i]}
            linea={0}
            silueta={1.2}
          />
        );
      })}
  </group>
);

// ---------- escena ----------
const MESA_X = 0.2;
const POSES: Pose[] = [
  [0, [-1.3, 2.2, 6.6], [-1.2, 1.3, 0], 44],
  [2.0, [-0.5, 2.1, 6.0], [-0.4, 1.3, 0], 42],
  [ev.pajaro - 0.3, [0.85, 1.75, 3.3], [0.25, 1.62, 0], 36],
  [ev.pico - 0.2, [1.15, 1.85, 2.4], [0.45, 1.72, 0], 34],
  [ev.felicidades - 0.25, [-0.55, 1.95, 5.3], [-0.5, 1.45, 0], 40],
  [ev.metes - 0.45, [JAULA[0] - 0.05, 1.8, 3.3], [JAULA[0], 1.5, 0], 36],
  [ev.pero - 0.1, [JAULA[0] + 0.2, 1.65, 2.6], [JAULA[0] + 0.2, 1.35, 0], 36],
];

// tiros (cortes duros)
const TIRO = {
  pico: ev.es - 0.1,
  mesa: ev2.suyo - 0.35,
  dentro: ev2.cuerpo - 0.45,
  mesa2: ev2.papaya - 0.75,
  jaula2: ev2.pero4 - 0.1,
  aviario: ev2.vuela - 1.1,
  calor: ev2.pero5 - 0.1,
  aire: ev2.es5,
  final: ev2.ahora - 0.15,
  tio: ev2.pregunta - 0.35,
};
const TUC_MESA: [number, number, number] = [MESA_X - 0.25, 0.99, 0];
const ROT_MESA = -0.5;
const S_MESA = 0.6;
const TUC_JAULA: [number, number, number] = [JAULA[0] - 0.02, JAULA[1] + 0.155, 0];

const camPor = (t: number) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  if (t < TIRO.pico) return poseCamara(t, POSES, 0.9);
  if (t < TIRO.mesa) {
    const d = t - ev.es;
    return {pos: V(2.45, 1.92 + d * 0.01, 2.21 - d * 0.06), obj: V(3.32, 1.78, 0.14), fov: 31};
  }
  if (t < TIRO.dentro) {
    const d = t - TIRO.mesa;
    const arriba = ventana(t, ev2.lanza - 0.2, ev2.comida - 0.3, 0.4);
    return {pos: V(MESA_X + 0.5 - d * 0.02, 1.8 + arriba * 0.2, 2.8 - d * 0.03), obj: V(MESA_X + 0.1, 1.5 + arriba * 0.25, 0), fov: 36};
  }
  if (t < TIRO.mesa2) {
    const d = t - TIRO.dentro;
    const c = V(TUC_MESA[0] - 0.01, 1.3, 0);
    return {pos: V(c.x - 1.0 + d * 0.01, c.y + 0.28, c.z + 1.85 - d * 0.03), obj: V(c.x + 0.02, c.y + 0.08, c.z), fov: 36};
  }
  if (t < TIRO.jaula2) {
    const d = t - TIRO.mesa2;
    return {pos: V(MESA_X + 0.25 + d * 0.03, 1.75, 2.6), obj: V(MESA_X - 0.05, 1.42, 0), fov: 36};
  }
  if (t < TIRO.aviario) return {pos: V(JAULA[0] + 0.45, 1.72, 2.1), obj: V(JAULA[0] + 0.2, 1.55, 0), fov: 36};
  if (t < TIRO.calor) {
    const d = t - TIRO.aviario;
    return {pos: V(AV[0] + 0.1, 1.9, 5.0 - d * 0.05), obj: V(AV[0] + 0.05, 1.5, 0), fov: 40};
  }
  if (t < TIRO.aire) {
    const p = posPercha(2);
    return {pos: V(p[0] - 0.2, p[1] + 0.55, 1.9), obj: V(p[0] + 0.2, p[1] + 0.42, 0), fov: 34};
  }
  if (t < TIRO.final) {
    const p = posPercha(2);
    const c = puntaPico(p, -0.45, 0.5, 0, 1, 0.5);
    const d = t - TIRO.aire;
    return {pos: V(c.x - 0.72, c.y + 0.12, c.z + 1.5 - d * 0.015), obj: V(c.x - 0.04, c.y + 0.02, c.z), fov: 31};
  }
  if (t < TIRO.tio) {
    const d = t - TIRO.final;
    return {pos: V(AV[0] + 0.1, 1.85, 4.6 - d * 0.08), obj: V(AV[0] + 0.1, 1.5, 0), fov: 40};
  }
  const d = t - TIRO.tio;
  return {pos: V(MESA_X - 0.25, 2.0, 4.9 - d * 0.06), obj: V(MESA_X - 0.25, 1.55, 0), fov: 40};
};

const Escena: React.FC<{t: number}> = ({t}) => {
  const {pos, obj, fov} = camPor(t);
  const intro = t < TIRO.mesa;
  const primerPlano = t > TIRO.pico && t < TIRO.mesa;
  // tío
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.4, MESA_X - 1.35, camina);
  const anda = t < 2.25 ? 1 : 0;
  const deja = r(t, 2.25, 0.4);
  const giro = lerp(Math.PI / 2, 0.55, r(t, 2.7, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.metes - 0.2, 0.3);
  // cajón
  const cajonEnMano: [number, number, number] = [tioX + 0.62, 1.12, 0];
  const cajonMesa: [number, number, number] = [MESA_X - 0.05, 0.99, 0];
  const cp: [number, number, number] = [lerp(cajonEnMano[0], cajonMesa[0], deja), lerp(cajonEnMano[1], cajonMesa[1], deja), 0];
  const tapa = r(t, ev.pajaro - 0.35, 0.45);
  const sale = r(t, ev.pajaro - 0.2, 0.35);
  const rebote = Math.sin(cl((t - ev.pajaro + 0.2) / 0.5) * Math.PI) * 0.12;
  const enJaula = t > ev.metes - 0.35 && t < TIRO.mesa;
  const picoEsc = 1 + 0.28 * ventana(t, ev.gigante - 0.1, ev.juguete - 0.1, 0.25) - 0.12 * ventana(t, ev.juguete, ev.felicidades, 0.12) * (0.5 + 0.5 * Math.sin(t * 28));
  const pechoEsc = 1 + 0.15 * ventana(t, ev.pecho - 0.05, ev.pico - 0.1, 0.2);
  const ciclo = t > ev.agarra && t < ev.agarra + 9 * 0.17 + 0.2 ? Math.sin(((t - ev.agarra) / 0.17) * Math.PI) : 0;
  const cabezaJ = enJaula ? -0.35 * Math.max(0, ciclo) + 0.35 * Math.max(0, -ciclo) : 0.05 * Math.sin(t * 1.7);
  const corte = r(t, ev.hueco - 0.2, 0.55) * (1 - r(t, ev2.no2 - 0.35, 0.45));
  // semilla que no puede romper
  const apretar = ventana(t, ev2.romper - 0.1, ev2.romper + 0.3, 0.1);

  // ---- mesa (fruta, naranja, hierro, comida buena)
  const enMesa = t >= TIRO.mesa && t < TIRO.jaula2;
  let cabezaM = 0.04 * Math.sin(t * 1.7);
  if (t < TIRO.dentro) {
    cabezaM -= 0.42 * ventana(t, ev2.agarra2 - 0.45, ev2.agarra2 + 0.25, 0.25);
    cabezaM += 0.55 * ventana(t, ev2.lanza - 0.1, ev2.traga + 0.5, 0.2);
    cabezaM -= 0.38 * ventana(t, ev2.naranja + 0.6, ev2.naranja + 1.1, 0.2);
    cabezaM -= 0.5 * r(t, ev2.enferma - 0.15, 0.4);
  } else if (t >= TIRO.mesa2) {
    const k = Math.max(0, Math.sin((t - TIRO.mesa2) * 3.2));
    cabezaM = -0.4 * k * k * k * k;
  }
  const ojosM = t > ev2.enferma - 0.2 && t < TIRO.mesa2 ? 0.35 : 1;
  const fruta = (() => {
    if (t < ev2.agarra2 - 0.1) return null;
    if (t < ev2.lanza) return puntaPico(TUC_MESA, ROT_MESA, S_MESA, cabezaM, 1, 0.97);
    const A = puntaPico(TUC_MESA, ROT_MESA, S_MESA, 0.2, 1, 0.97);
    const B = puntaPico(TUC_MESA, ROT_MESA, S_MESA, 0.55, 1, 0.12);
    const u = cl((t - ev2.lanza) / (ev2.traga + 0.25 - ev2.lanza));
    if (u >= 1) return null;
    return new THREE.Vector3(lerp(A.x, B.x, u), lerp(A.y, B.y, u) + Math.sin(u * Math.PI) * 0.55, lerp(A.z, B.z, u));
  })();
  const tipoPlato = t >= TIRO.mesa2 ? 'mix' : t > ev2.naranja - 0.2 ? 'naranja' : 'fruta';
  const quedan = t >= TIRO.mesa2 ? 10 - Math.floor(cl((t - TIRO.mesa2) / 4) * 4) : t > ev2.naranja - 0.2 ? 7 : t > ev2.agarra2 ? 7 : 8;
  // hierro
  const hierro = cl((t - ev2.hierro) / 5.5) * 0.45 + cl((t - ev2.acido) / 2.6) * 0.55;
  const higado = r(t, ev2.acumula - 0.1, 1.0);
  const pulsa = t > ev2.matar - 0.1 ? 0.5 + 0.5 * Math.sin(t * 14) : 0;

  // ---- jaula: golpes
  const enJaula2 = t >= TIRO.jaula2 && t < TIRO.aviario;
  const golpe = t > ev2.golpeando - 0.1 ? Math.max(0, Math.sin((t - ev2.golpeando) * Math.PI * 2.6)) : 0;

  // ---- aviario
  const av = enAviario(t);
  const enAv = t >= TIRO.aviario;
  const calor = t >= TIRO.calor && t < TIRO.aire;
  const vasos = t >= TIRO.aire && t < TIRO.final ? (t > ev2.frio - 0.1 ? -1 : t > ev2.manda - 0.2 ? 1 : 0) : calor && t > ev2.caliente - 0.2 ? 1 : 0;
  const tioFinal = t >= TIRO.tio;

  return (
    <>
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[-0.55, 1, 0.55]} area={7} centro={[enAv && !tioFinal ? AV[0] : 1, 0, 0]} amb={1.0} sol={calor ? 0.85 : 0.62} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[3, 0, 0]}>
        <planeGeometry args={[46, 30]} />
        <meshToonMaterial color="#ffffff" map={texPasto()} />
      </mesh>
      <Pasto />
      <group position={[7, 0, 0]}>
        <Pasto />
      </group>
      <Casa />
      <group position={[MESA_X, 0, 0]}>
        <Mesa />
      </group>
      {(t < TIRO.pico || enJaula2) && <Poste />}
      {t < TIRO.pico && (
        <group position={cp}>
          <Cajon tapa={tapa} />
        </group>
      )}
      {t < ev.metes + 6 && t > 0.1 && (
        <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
          <Tio t={t} anda={anda} brazos={1 - deja} saluda={saluda} />
        </group>
      )}
      {t < ev.metes - 0.35 && sale > 0.01 && (
        <group position={[cajonMesa[0], 0.99 + lerp(0.05, 0.42, sale) + rebote, 0]} rotation={[0, -0.55, 0]} scale={0.6}>
          <Tucan t={t} picoEsc={picoEsc} pechoEsc={pechoEsc} cabeza={cabezaJ} />
        </group>
      )}
      {((t < TIRO.pico) || enJaula2) && (
        <group position={JAULA}>
          <Jaula />
        </group>
      )}
      {enJaula && (
        <group position={TUC_JAULA} rotation={[0, -0.45, 0]} scale={0.5}>
          <Tucan t={t} cabeza={cabezaJ} corte={corte} picoEsc={1 - apretar * 0.05} />
        </group>
      )}
      {t < TIRO.pico && <Semillas t={t} />}
      {primerPlano && t > ev2.no2 - 0.1 && (() => {
        const tip = puntaPico(TUC_JAULA, -0.45, 0.5, 0, 1, 0.94);
        const dt = t - (ev2.romper + 0.25);
        const p = dt < 0 ? tip : new THREE.Vector3(tip.x + dt * 1.5, tip.y + dt * 1.2 - dt * dt * 4, tip.z + dt * 0.8);
        return <P geo={esf(0.022, 10)} color="#8a5b2a" position={[p.x, p.y, p.z]} scale={[1.4, 0.9, 1]} linea={0} silueta={1.6} />;
      })()}
      {primerPlano && <Sprite tex={texEstrella()} pos={puntaPico(TUC_JAULA, -0.45, 0.5, 0, 1, 0.96).toArray() as [number, number, number]} escala={[0.12, 0.12]} o={ventana(t, ev2.romper - 0.05, ev2.romper + 0.35, 0.08)} rot={t * 3} />}

      {/* ---- mesa ---- */}
      {enMesa && (
        <>
          <group position={TUC_MESA} rotation={[0, ROT_MESA, 0]} scale={S_MESA}>
            <Tucan
              t={t}
              cabeza={cabezaM}
              ojos={ojosM}
              corteCuerpo={t >= TIRO.dentro && t < TIRO.mesa2}
              hierro={hierro}
              higado={Math.min(1, higado + pulsa * 0.3)}
            />
          </group>
          {t < TIRO.dentro || t >= TIRO.mesa2 ? (
            <group position={[MESA_X + 0.33, 0.99, 0.22]}>
              <Plato tipo={tipoPlato as any} quedan={quedan} />
            </group>
          ) : null}
          {fruta && <P geo={caja(0.05, 0.05, 0.05)} color="#ffa62b" position={[fruta.x, fruta.y, fruta.z]} rotation={[t * 6, t * 4, 0]} />}
          <Halo pos={[TUC_MESA[0] + 0.05, 1.3, 0.1]} o={pulsa * 0.5 * (t < TIRO.mesa2 ? 1 : 0)} escala={0.6} color="#ff3020" />
        </>
      )}

      {/* ---- jaula chica: golpes ---- */}
      {enJaula2 && (
        <>
          <group position={[TUC_JAULA[0] + golpe * 0.05, TUC_JAULA[1], TUC_JAULA[2]]} rotation={[0, -0.45, 0]} scale={0.5}>
            <Tucan t={t} cabeza={-0.15 * golpe} ojos={golpe > 0.8 ? 0.4 : 1} />
          </group>
          <Sprite tex={texEstrella()} pos={[JAULA[0] + 0.36, JAULA[1] + 0.52, 0.18]} escala={[0.14, 0.14]} o={golpe > 0.85 ? 1 : 0} rot={t * 5} />
        </>
      )}

      {/* ---- aviario ---- */}
      {enAv && (
        <group position={AV}>
          <Aviario />
        </group>
      )}
      {enAv && !tioFinal && (
        <group position={av.pos} rotation={[0, av.rotY, 0]} scale={0.5}>
          <Tucan t={t} vasos={vasos} cabeza={t >= TIRO.final ? 0.08 * Math.sin(t * 5) : 0} ojos={calor && t > ev2.caliente ? 0.6 : 1} />
        </group>
      )}
      {calor && (() => {
        const p = posPercha(2);
        const tip = puntaPico(p, -0.45, 0.5, 0, 1, 0.7);
        const u = r(t, ev2.tocas - 0.5, 0.5) * (1 - r(t, ev2.caliente + 0.15, 0.3));
        const hasta = tip.clone().add(new THREE.Vector3(0.02, 0.035, 0.04));
        const desde = hasta.clone().add(new THREE.Vector3(1.4, 0.2, 0.9));
        const mano = desde.clone().lerp(hasta, u);
        return (
          <>
            {u > 0.01 && <Mano desde={desde} hasta={mano} />}
            <Halo pos={tip.toArray() as [number, number, number]} o={r(t, ev2.caliente - 0.2, 0.3) * 0.7} escala={0.5} color="#ff5a20" />
          </>
        );
      })()}
      {t >= TIRO.aire && t < TIRO.final && (() => {
        const p = posPercha(2);
        const calorO = ventana(t, ev2.manda - 0.2, ev2.frio - 0.1, 0.3);
        const frioO = r(t, ev2.frio - 0.1, 0.3);
        return (
          <>
            {[0.35, 0.55, 0.75].map((u, i) => {
              const b = puntaPico(p, -0.45, 0.5, 0, 1, u);
              const ph = ((t * 0.7 + i * 0.33) % 1);
              return <Sprite key={i} tex={texOndas()} pos={[b.x, b.y + 0.08 + ph * 0.22, b.z + 0.02]} escala={[0.08, 0.16]} o={calorO * Math.sin(ph * Math.PI)} />;
            })}
            <Halo pos={puntaPico(p, -0.45, 0.5, 0, 1, 0.5).toArray() as [number, number, number]} o={calorO * 0.45} escala={0.6} color="#ff6a2a" />
            {Array.from({length: 16}, (_, i) => {
              const c = puntaPico(p, -0.45, 0.5, 0, 1, 0.5);
              const y = c.y + 0.45 - (((t - ev2.frio) * 0.18 + rnd(i)) % 1) * 0.8;
              return <Sprite key={'c' + i} tex={texCopo()} pos={[c.x - 0.35 + rnd(i + 2) * 0.7, y, c.z + 0.1 + rnd(i + 4) * 0.25]} escala={[0.07, 0.07]} o={frioO} rot={t + i} />;
            })}
          </>
        );
      })()}

      {/* ---- final: el tío ---- */}
      {tioFinal && (
        <>
          <group position={[MESA_X - 1.05, 0, 0.2]} rotation={[0, 0.35, 0]}>
            <Tio t={t} anda={0} brazos={0} saluda={0} />
          </group>
          <group position={[MESA_X + 0.1, 0.99, 0]} rotation={[0, -0.2, 0]}>
            <Maleta abre={r(t, ev2.trajo - 0.35, 0.4)} t={t} />
          </group>
        </>
      )}
    </>
  );
};

// ---------- capa 2D ----------
const ROJAS = new Set(['amazonas', 'negro', 'amarillo', 'naranja', 'gigante', 'juguete', 'felicidades', 'tucán', 'canario', 'semillas', 'listo', 'nada', 'tira', 'enorme', 'hueco', 'pico', 'fruta', 'comida', 'hierro', 'hígado', 'matar', 'casa', 'caliente', 'tráfico', 'esponja', 'romper', 'arriba', 'entera', 'enferma', 'ácido', 'papaya', 'melón', 'especial', 'barrotes', 'vuela', 'saltando', 'larga', 'calor', 'aire', 'acondicionado', 'sangre', 'radiador', 'frío', 'feliz', 'permiso', 'animales']);
const limpia = (w: string) => w.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');
type Pal = {t: number; e: number; w: string};
const PALABRAS: Pal[] = (datos as any).beats.flatMap((b: any) => b.words);
const TROZOS: Pal[][] = (() => {
  const out: Pal[][] = [];
  let cur: Pal[] = [];
  for (const p of PALABRAS) {
    cur.push(p);
    if (/[,.…:;?!]$/.test(p.w) || cur.length >= 3) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
})();

const Subtitulo: React.FC<{t: number}> = ({t}) => {
  let i = -1;
  for (let k = 0; k < TROZOS.length; k++) if (TROZOS[k][0].t - 0.05 <= t) i = k;
  if (i < 0) return null;
  const tr = TROZOS[i];
  if (t > tr[tr.length - 1].e + 0.8) return null;
  return (
    <div style={{position: 'absolute', top: 200, left: 50, right: 50, textAlign: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: 76, lineHeight: 1.1}}>
      {tr.map((p, k) => {
        const a = cl((t - p.t + 0.05) / 0.12);
        const roja = ROJAS.has(limpia(p.w));
        return (
          <span
            key={k}
            style={{
              display: 'inline-block',
              margin: '0 12px',
              opacity: a,
              transform: `scale(${0.7 + 0.3 * a})`,
              color: roja ? '#e3352b' : '#16171c',
              WebkitTextStroke: '13px #ffffff',
              paintOrder: 'stroke fill',
            }}
          >
            {p.w.replace(/[,.…:;]$/, '')}
          </span>
        );
      })}
    </div>
  );
};

const ICONOS: Record<string, React.ReactNode> = {
  fruta: (
    <g>
      <path d="M50 22 C74 22 84 44 78 66 C72 86 28 86 22 66 C16 44 26 22 50 22Z" fill="#ff9a2e" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={50} cy={56} rx={10} ry={18} fill="#2b2b2b" />
      <path d="M50 22 C52 14 58 10 64 10" fill="none" stroke="#3fae4a" strokeWidth={5} />
    </g>
  ),
  arriba: (
    <g>
      <rect x={38} y={56} width={24} height={24} rx={4} fill="#ffa62b" stroke="#16171c" strokeWidth={4} />
      <path d="M50 48 L50 14 M36 28 L50 14 L64 28" fill="none" stroke="#16171c" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  naranja: (
    <g>
      <circle cx={50} cy={52} r={32} fill="#ff9a1a" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={52} r={22} fill="#ffc15a" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <path key={k} d={`M50 52 L${50 + Math.cos((k / 6) * Math.PI * 2) * 22} ${52 + Math.sin((k / 6) * Math.PI * 2) * 22}`} stroke="#ff9a1a" strokeWidth={3} />
      ))}
    </g>
  ),
  enfermo: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#b9e07a" stroke="#16171c" strokeWidth={4} />
      <path d="M34 42 L44 42 M56 42 L66 42" stroke="#16171c" strokeWidth={5} strokeLinecap="round" />
      <path d="M36 66 C44 58 56 58 64 66" fill="none" stroke="#16171c" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  hierro: (
    <g>
      <rect x={20} y={30} width={60} height={44} rx={8} fill="#9aa2ad" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={62} textAnchor="middle" fontSize={30} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        Fe
      </text>
    </g>
  ),
  higado: <path d="M16 46 C20 24 60 20 84 30 C90 44 74 70 52 74 C36 76 26 70 22 62 C14 58 14 52 16 46Z" fill="#8a2f2a" stroke="#16171c" strokeWidth={4} />,
  calavera: (
    <g>
      <path d="M50 16 C30 16 20 30 20 46 C20 58 28 62 32 64 L32 78 L68 78 L68 64 C72 62 80 58 80 46 C80 30 70 16 50 16Z" fill="#fff" stroke="#16171c" strokeWidth={4} />
      <circle cx={38} cy={46} r={8} fill="#16171c" />
      <circle cx={62} cy={46} r={8} fill="#16171c" />
      <path d="M44 78 L44 70 M56 78 L56 70" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  melon: (
    <g>
      <path d="M14 50 A36 36 0 0 0 86 50Z" fill="#9bd36a" stroke="#16171c" strokeWidth={4} />
      <path d="M22 50 A28 28 0 0 0 78 50Z" fill="#f6c27a" />
    </g>
  ),
  pellet: (
    <g>
      {[[34, 40], [58, 36], [46, 58], [68, 60], [30, 64]].map(([x, y], i) => (
        <rect key={i} x={x - 8} y={y - 6} width={16} height={12} rx={5} fill={['#c98a4a', '#e05a3a', '#7fb84a'][i % 3]} stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  golpe: (
    <g>
      <path d="M50 10 L58 38 L88 30 L64 52 L84 78 L54 66 L44 92 L38 64 L10 70 L32 50 L14 26 L42 36Z" fill="#ffe14d" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  alas: (
    <g>
      <path d="M50 60 C36 36 20 30 8 32 C16 48 30 62 50 64Z" fill="#23242c" stroke="#16171c" strokeWidth={3} />
      <path d="M50 60 C64 36 80 30 92 32 C84 48 70 62 50 64Z" fill="#23242c" stroke="#16171c" strokeWidth={3} />
      <ellipse cx={50} cy={62} rx={8} ry={14} fill="#ffe066" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  saltar: (
    <g>
      <path d="M14 76 C24 30 46 30 50 60 C56 30 78 30 86 76" fill="none" stroke="#16171c" strokeWidth={5} strokeDasharray="7 6" strokeLinecap="round" />
      <rect x={6} y={76} width={22} height={6} fill="#b87a45" />
      <rect x={40} y={60} width={22} height={6} fill="#b87a45" />
      <rect x={74} y={76} width={22} height={6} fill="#b87a45" />
    </g>
  ),
  jaulaLarga: (
    <g fill="none" stroke="#2a2b31" strokeWidth={4}>
      <rect x={10} y={26} width={80} height={52} />
      {[22, 34, 46, 58, 70, 82].map((x) => (
        <path key={x} d={`M${x} 26 L${x} 78`} strokeWidth={2} />
      ))}
      <path d="M10 84 L10 90 M90 84 L90 90" />
    </g>
  ),
  palos: (
    <g>
      {[[20, 30], [50, 56], [30, 76], [62, 38]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={28} height={7} rx={3} fill="#b87a45" stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  casa: (
    <g>
      <path d="M16 48 L50 18 L84 48" fill="#e0453a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <rect x={26} y={46} width={48} height={36} fill="#f6e3b4" stroke="#16171c" strokeWidth={4} />
      <rect x={43} y={60} width={14} height={22} fill="#8a5634" />
    </g>
  ),
  sol: (
    <g>
      {Array.from({length: 8}, (_, k) => (
        <path key={k} d={`M${50 + Math.cos((k / 8) * Math.PI * 2) * 30} ${50 + Math.sin((k / 8) * Math.PI * 2) * 30} L${50 + Math.cos((k / 8) * Math.PI * 2) * 42} ${50 + Math.sin((k / 8) * Math.PI * 2) * 42}`} stroke="#ff9a1a" strokeWidth={6} strokeLinecap="round" />
      ))}
      <circle cx={50} cy={50} r={22} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  mano: (
    <g>
      <path d="M30 86 L30 50 C30 44 38 44 38 50 L38 26 C38 20 46 20 46 26 L46 22 C46 16 54 16 54 22 L54 28 C54 22 62 22 62 28 L62 40 C62 34 70 34 70 40 L70 66 C70 78 62 86 52 86Z" fill="#f2b48c" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
    </g>
  ),
  termometro: (
    <g>
      <rect x={42} y={12} width={16} height={56} rx={8} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <rect x={46} y={26} width={8} height={44} fill="#e0453a" />
      <circle cx={50} cy={74} r={14} fill="#e0453a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  aire: (
    <g>
      <rect x={12} y={28} width={76} height={30} rx={6} fill="#f4f6f8" stroke="#16171c" strokeWidth={4} />
      <path d="M20 50 L80 50" stroke="#16171c" strokeWidth={3} />
      <path d="M30 66 C26 72 34 76 30 84 M50 66 C46 72 54 76 50 84 M70 66 C66 72 74 76 70 84" fill="none" stroke="#4fb7e6" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  copo: (
    <g stroke="#4fb7e6" strokeWidth={6} strokeLinecap="round">
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M${50 + Math.cos((k / 3) * Math.PI) * 34} ${50 + Math.sin((k / 3) * Math.PI) * 34} L${50 - Math.cos((k / 3) * Math.PI) * 34} ${50 - Math.sin((k / 3) * Math.PI) * 34}`} />
      ))}
    </g>
  ),
  sangre: <path d="M50 14 C62 34 76 48 76 64 C76 80 64 88 50 88 C36 88 24 80 24 64 C24 48 38 34 50 14Z" fill="#e0302a" stroke="#16171c" strokeWidth={4} />,
  radiador: (
    <g>
      <rect x={14} y={24} width={72} height={52} rx={4} fill="#c3c7cf" stroke="#16171c" strokeWidth={4} />
      {[24, 34, 44, 54, 64, 74].map((x) => (
        <path key={x} d={`M${x} 30 L${x} 70`} stroke="#5d6068" strokeWidth={4} />
      ))}
    </g>
  ),
  corazon: <path d="M50 84 C20 62 12 46 18 34 C24 22 42 20 50 36 C58 20 76 22 82 34 C88 46 80 62 50 84Z" fill="#e0453a" stroke="#16171c" strokeWidth={4} />,
  maleta: (
    <g>
      <rect x={14} y={34} width={72} height={46} rx={6} fill="#8a5634" stroke="#16171c" strokeWidth={4} />
      <path d="M38 34 L38 24 L62 24 L62 34" fill="none" stroke="#16171c" strokeWidth={5} />
      <rect x={22} y={46} width={18} height={12} fill="#e0453a" />
      <rect x={58} y={56} width={16} height={12} fill="#3fae4a" />
    </g>
  ),

  hoja: (
    <g>
      <path d="M50 12 C80 25 84 62 50 88 C16 62 20 25 50 12Z" fill="#3fae4a" stroke="#16171c" strokeWidth={4} />
      <path d="M50 22 L50 84" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  pluma: <path d="M70 12 C40 20 26 50 30 82 L36 86 C50 60 66 40 70 12Z" fill="#23242c" stroke="#16171c" strokeWidth={3} />,
  pecho: (
    <g>
      <circle cx={50} cy={50} r={34} fill="#23242c" />
      <ellipse cx={56} cy={52} rx={16} ry={26} fill="#ffe066" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  pico: (
    <g>
      <path d="M14 38 C40 26 70 32 90 58 C66 56 40 60 14 66Z" fill="#ff8a1c" stroke="#16171c" strokeWidth={4} />
      <path d="M76 44 C82 49 87 54 90 58 C84 57 80 57 74 57Z" fill="#1d1d22" />
    </g>
  ),
  juguete: (
    <g>
      <ellipse cx={46} cy={62} rx={30} ry={20} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <circle cx={58} cy={36} r={16} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <path d="M72 36 L88 40 L72 44Z" fill="#ff8a1c" stroke="#16171c" strokeWidth={3} />
      <circle cx={62} cy={32} r={3} fill="#16171c" />
    </g>
  ),
  tucan: (
    <g>
      <circle cx={34} cy={52} r={24} fill="#23242c" />
      <circle cx={34} cy={60} r={12} fill="#ffe066" />
      <circle cx={38} cy={44} r={6} fill="#4fb7e6" />
      <path d="M48 40 C66 34 82 40 92 56 C76 54 62 58 48 60Z" fill="#ff8a1c" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  jaula: (
    <g fill="none" stroke="#7b7f88" strokeWidth={4}>
      <path d="M24 82 L24 42 C24 22 76 22 76 42 L76 82" />
      {[36, 50, 64].map((x) => (
        <path key={x} d={`M${x} 82 L${x} 30`} />
      ))}
      <rect x={18} y={80} width={64} height={8} rx={3} fill="#d6393a" stroke="#16171c" />
      <circle cx={50} cy={20} r={5} />
    </g>
  ),
  semillas: (
    <g>
      {[
        [34, 40],
        [54, 34],
        [66, 54],
        [42, 60],
        [56, 70],
        [30, 64],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={9} ry={6} transform={`rotate(${i * 35} ${x} ${y})`} fill="#a26b35" stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  calendario: (
    <g>
      <rect x={18} y={22} width={64} height={60} rx={8} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <rect x={18} y={22} width={64} height={16} rx={6} fill="#e0453a" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={74} textAnchor="middle" fontSize={32} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        7
      </text>
    </g>
  ),
  plato: (
    <g>
      <ellipse cx={50} cy={58} rx={34} ry={16} fill="#e0453a" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={50} cy={52} rx={26} ry={9} fill="#a26b35" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  tirar: (
    <g>
      {[
        [30, 70],
        [50, 46],
        [70, 30],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={8} ry={5} fill="#a26b35" stroke="#16171c" strokeWidth={3} />
      ))}
      <path d="M22 84 C40 60 58 40 84 20" fill="none" stroke="#16171c" strokeWidth={3} strokeDasharray="6 6" />
    </g>
  ),
  panal: (
    <g>
      {[
        [38, 38],
        [62, 38],
        [26, 58],
        [50, 58],
        [74, 58],
        [38, 78],
        [62, 78],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={Array.from({length: 6}, (_, k) => `${k ? 'L' : 'M'}${x + Math.cos((k / 6) * Math.PI * 2 + Math.PI / 6) * 12} ${y + Math.sin((k / 6) * Math.PI * 2 + Math.PI / 6) * 12}`).join(' ') + 'Z'}
          fill="#fbe9c2"
          stroke="#8a4f1c"
          strokeWidth={3}
        />
      ))}
    </g>
  ),
};

type Ic = [number, string, string, ('ok' | 'no')?, number?];
const IZQ: Ic[] = [
  [ev.amazonas - 0.05, 'hoja', 'Amazonas'],
  [ev.pecho - 0.05, 'pecho', 'pecho amarillo'],
  [ev.juguete - 0.1, 'juguete', 'de juguete'],
  [ev.tucan - 0.05, 'tucan', 'tucán', 'ok', ev.tucan + 0.2],
  [ev.jaula - 0.05, 'jaula', 'jaula de canario', 'ok', ev.listo],
  [ev.dias - 0.05, 'calendario', 'a los días'],
  [ev.pico2 - 0.05, 'pico', 'pico enorme'],
  [ev2.esponja - 0.05, 'panal', 'esponja dura'],
  [ev2.fruta - 0.05, 'fruta', 'fruta'],
  [ev2.naranja - 0.05, 'naranja', 'naranja'],
  [ev2.hierro - 0.05, 'hierro', 'hierro'],
  [ev2.acumula - 0.05, 'higado', 'hígado'],
  [ev2.papaya - 0.05, 'fruta', 'papaya', 'ok', ev2.papaya + 0.3],
  [ev2.pero4 + 0.2, 'jaula', 'jaula chica', 'no', ev2.golpeando],
  [ev2.vuela - 0.3, 'alas', 'casi no vuela', 'no', ev2.vuela + 0.2],
  [ev2.larga - 0.4, 'jaulaLarga', 'jaula larga', 'ok', ev2.larga + 0.2],
  [ev2.calor - 0.1, 'sol', 'día de calor'],
  [ev2.aire - 0.05, 'aire', 'aire acondicionado'],
  [ev2.frio - 0.05, 'copo', 'frío'],
  [ev2.feliz - 0.3, 'corazon', 'tucán feliz', 'ok', ev2.feliz + 0.1],
  [ev2.pregunta - 0.05, 'maleta', '¿cómo lo trajo?'],
];
const DER: Ic[] = [
  [ev.pajaro - 0.05, 'pluma', 'pájaro negro'],
  [ev.pico - 0.05, 'pico', 'pico naranja'],
  [ev.felicidades + 0.4, '', ''],
  [ev.semillas - 0.05, 'semillas', 'semillas', 'ok', ev.listo],
  [ev.no - 0.05, 'plato', 'no come', 'no', ev.no + 0.25],
  [ev.agarra + 0.6, 'tirar', 'las tira', 'no', ev.tira],
  [ev.hueco - 0.05, 'panal', 'hueco por dentro'],
  [ev2.romper - 0.1, 'semillas', 'romper semillas', 'no', ev2.romper + 0.3],
  [ev2.lanza - 0.05, 'arriba', 'la lanza arriba'],
  [ev2.comida - 0.1, 'plato', 'su comida', 'ok', ev2.comida + 0.15],
  [ev2.todos - 0.05, 'calendario', 'todos los días'],
  [ev2.enferma - 0.05, 'enfermo', 'se enferma', 'no', ev2.enferma + 0.2],
  [ev2.acido - 0.05, 'naranja', 'lo ácido'],
  [ev2.matar - 0.1, 'calavera', 'lo puede matar', 'no', ev2.matar + 0.15],
  [ev2.melon - 0.05, 'melon', 'melón', 'ok', ev2.melon + 0.3],
  [ev2.especial - 0.05, 'pellet', 'comida especial', 'ok', ev2.especial + 0.3],
  [ev2.golpeando - 0.05, 'golpe', 'se golpea'],
  [ev2.saltando - 0.05, 'saltar', 'salta de rama en rama'],
  [ev2.palos - 0.05, 'palos', 'palos a distintas alturas'],
  [ev2.casa - 0.15, 'casa', 'su casa', 'ok', ev2.casa + 0.15],
  [ev2.tocas - 0.05, 'mano', 'lo tocas'],
  [ev2.caliente - 0.05, 'termometro', 'caliente'],
  [ev2.manda - 0.05, 'sangre', 'manda sangre'],
  [ev2.radiador - 0.05, 'radiador', 'radiador'],
  [ev2.corta - 0.05, 'sangre', 'corta la sangre', 'no', ev2.corta + 0.3],
  [ev2.ahora + 0.4, '', ''],
  [ev2.selva - 0.1, 'hoja', 'sin permiso', 'no', ev2.permiso + 0.1],
];

const Marca: React.FC<{tipo: 'ok' | 'no'; o: number}> = ({tipo, o}) => (
  <svg width={64} height={64} viewBox="0 0 64 64" style={{position: 'absolute', right: -8, top: -8, transform: `scale(${o})`}}>
    <circle cx={32} cy={32} r={28} fill={tipo === 'ok' ? '#3cb54a' : '#e0453a'} stroke="#ffffff" strokeWidth={5} />
    {tipo === 'ok' ? <path d="M18 33 L28 43 L46 22" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" /> : <path d="M21 21 L43 43 M43 21 L21 43" stroke="#fff" strokeWidth={7} strokeLinecap="round" />}
  </svg>
);

const Ranura: React.FC<{t: number; lista: Ic[]; x: number}> = ({t, lista, x}) => {
  let i = -1;
  for (let k = 0; k < lista.length; k++) if (lista[k][0] <= t) i = k;
  if (i < 0 || !lista[i][1]) return null;
  const [t0, ic, lab, marca, tm] = lista[i];
  const a = cl((t - t0) / 0.22);
  const pop = a < 1 ? 0.6 + 0.4 * a + Math.sin(a * Math.PI) * 0.15 : 1;
  const om = marca && tm !== undefined ? cl((t - tm) / 0.2) : 0;
  return (
    <div style={{position: 'absolute', left: x - 110, top: 1430, width: 220, textAlign: 'center', opacity: a}}>
      <div style={{position: 'relative', width: 170, height: 170, margin: '0 auto', transform: `scale(${pop})`}}>
        <div style={{width: 170, height: 170, borderRadius: 85, background: '#ffffff', boxShadow: '0 8px 20px rgba(0,0,0,0.22)', border: '5px solid #16171c', boxSizing: 'border-box'}}>
          <svg width={160} height={160} viewBox="0 0 100 100">
            {ICONOS[ic]}
          </svg>
        </div>
        {marca && om > 0 && <Marca tipo={marca} o={om} />}
      </div>
      <div style={{marginTop: 10, fontFamily: FUENTE, fontWeight: 900, fontSize: 40, color: '#16171c', WebkitTextStroke: '9px #fff', paintOrder: 'stroke fill', lineHeight: 1.05}}>{lab}</div>
    </div>
  );
};

const Confeti: React.FC<{t: number}> = ({t}) => {
  const dt = t - ev.felicidades + 0.1;
  if (dt < 0 || dt > 2.6) return null;
  const cols = ['#e0453a', '#ffd23a', '#3cb54a', '#2f6fe0', '#ff8a1c'];
  return (
    <>
      {Array.from({length: 46}, (_, i) => {
        const x = 540 + (rnd(i) - 0.5) * 300 + (rnd(i + 1) - 0.5) * 900 * Math.min(1, dt * 2.5);
        const y = 900 - (500 + rnd(i + 2) * 500) * dt + 900 * dt * dt;
        return (
          <div
            key={i}
            style={{position: 'absolute', left: x, top: y, width: 22, height: 12, background: cols[i % 5], transform: `rotate(${dt * 600 * (rnd(i + 3) - 0.5) + i * 40}deg)`, border: '2px solid #16171c', opacity: 1 - cl((dt - 2) / 0.6)}}
          />
        );
      })}
    </>
  );
};

const Sello: React.FC<{t: number}> = ({t}) => {
  const a = cl((t - ev2.trafico + 0.1) / 0.25);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, a * 1.5)}}>
      <div
        style={{
          transform: `rotate(-9deg) scale(${lerp(2.2, 1, a)})`,
          border: '12px solid #e0302a',
          borderRadius: 26,
          padding: '18px 40px',
          background: 'rgba(255,255,255,0.88)',
          fontFamily: FUENTE,
          fontWeight: 900,
          fontSize: 96,
          lineHeight: 1,
          color: '#e0302a',
          textAlign: 'center',
          letterSpacing: -2,
        }}
      >
        TRÁFICO
        <div style={{fontSize: 56, letterSpacing: 0}}>de animales</div>
      </div>
    </div>
  );
};

const Gota: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev2.pregunta + 0.3, 99, 0.3);
  if (o <= 0) return null;
  const y = 640 + ((t * 0.6) % 1) * 60;
  return (
    <svg width={70} height={100} viewBox="0 0 70 100" style={{position: 'absolute', left: 230, top: y, opacity: o}}>
      <path d="M35 6 C46 30 60 46 60 64 C60 82 48 92 35 92 C22 92 10 82 10 64 C10 46 24 30 35 6Z" fill="#7fd0ff" stroke="#16171c" strokeWidth={5} />
    </svg>
  );
};

export const TucanVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(#cfd8de, #eef1f2 60%)'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.05, far: 200, position: [0, 2, 7]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#ff9a3a', mixBlendMode: 'multiply', opacity: 0.22 * (t >= TIRO.calor && t < TIRO.aire ? r(t, TIRO.calor, 0.6) : 0) + 0.16 * ventana(t, ev2.manda - 0.2, ev2.frio - 0.1, 0.3)}} />
      <div style={{position: 'absolute', inset: 0, background: '#7fb6ff', mixBlendMode: 'multiply', opacity: 0.25 * ventana(t, ev2.frio - 0.1, TIRO.final, 0.3)}} />
      <div style={{position: 'absolute', inset: 0, background: '#ff2a1a', mixBlendMode: 'multiply', opacity: t > ev2.matar - 0.1 && t < TIRO.mesa2 ? 0.12 + 0.1 * Math.sin(t * 14) : 0}} />
      <Confeti t={t} />
      <Sello t={t} />
      <Gota t={t} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Audio src={staticFile('tucan/voz.wav')} />
      <Audio src={staticFile('tucan/musica.wav')} />
    </AbsoluteFill>
  );
};
