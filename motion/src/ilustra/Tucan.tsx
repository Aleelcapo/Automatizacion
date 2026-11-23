import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/tucan.json';
import {Camara, G, Luces, P, Papel, Pose, caja, canvasTex, cil, cl, cuerpoSecciones, esf, lerp, poseCamara, r, rnd, tiemposPalabras, ventana} from './kit';
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
const Ojo: React.FC<{z: number}> = ({z}) => (
  <group position={[0.07, 0.03, z]} rotation={[Math.PI / 2, 0, 0]}>
    <P geo={cil(0.075, 0.075, 0.02, 24)} color="#4fb7e6" linea={0} silueta={1.6} sombra={false} />
    <P geo={cil(0.05, 0.05, 0.024, 24)} color="#ff9a2e" linea={0} silueta={0} sombra={false} />
    <P geo={esf(0.036, 16)} color="#121216" position={[0, Math.sign(z) * 0.012, 0]} linea={0} silueta={0} sombra={false} />
    <P geo={esf(0.012, 8)} color="#ffffff" position={[0.012, Math.sign(z) * 0.04, -0.012]} linea={0} silueta={0} sombra={false} />
  </group>
);

const Tucan: React.FC<{t: number; picoEsc?: number; pechoEsc?: number; cabeza?: number; corte?: number}> = ({t, picoEsc = 1, pechoEsc = 1, cabeza = 0, corte = 0}) => {
  const resp = Math.sin(t * 2.2) * 0.012;
  return (
    <group>
      {/* patas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.02, 0, s * 0.09]}>
          <P geo={cil(0.022, 0.022, 0.22, 8)} color="#5a7fd6" position={[0, 0.11, 0]} linea={0} silueta={1.6} />
          <P geo={caja(0.14, 0.025, 0.05)} color="#5a7fd6" position={[0.03, 0.012, 0]} linea={0} silueta={1.6} />
        </group>
      ))}
      <group position={[0, resp, 0]}>
        {/* cola */}
        <P geo={caja(0.5, 0.05, 0.17)} color={NEGRO} position={[-0.42, 0.3, 0]} rotation={[0, 0, 0.75]} umbral={40} />
        <P geo={esf(0.1, 16)} color="#e5352c" position={[-0.2, 0.25, 0]} scale={[1, 0.7, 1.2]} linea={0} />
        {/* cuerpo */}
        <P geo={esf(0.3, 28)} color={NEGRO} position={[-0.02, 0.5, 0]} scale={[1, 1.35, 1]} rotation={[0, 0, -0.25]} linea={0} />
        {/* alas */}
        {[-1, 1].map((s) => (
          <P key={s} geo={esf(0.26, 20)} color="#17181e" position={[-0.1, 0.5, s * 0.25]} scale={[1.15, 1.2, 0.28]} rotation={[0, 0, -0.45]} linea={0} />
        ))}
        {/* pecho */}
        <P geo={esf(0.2, 24)} color={PECHO} position={[0.16, 0.7, 0]} scale={[0.6 * pechoEsc, 1.05 * pechoEsc, 1.15 * pechoEsc]} linea={0} silueta={1.8} />
        {/* cabeza */}
        <group position={[0.1, 0.9, 0]} rotation={[0, 0, cabeza]}>
          <P geo={esf(0.2, 28)} color={NEGRO} linea={0} />
          <P geo={esf(0.13, 20)} color={PECHO} position={[0.07, -0.08, 0]} scale={[0.8, 0.8, 1.3]} linea={0} silueta={0} />
          <Ojo z={0.17} />
          <Ojo z={-0.17} />
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

const Escena: React.FC<{t: number}> = ({t}) => {
  const primerPlano = t > ev.es - 0.1;
  const {pos, obj, fov} = primerPlano
    ? {pos: new THREE.Vector3(2.45, 1.92 + (t - ev.es) * 0.01, 2.21 - (t - ev.es) * 0.06), obj: new THREE.Vector3(3.32, 1.78, 0.14), fov: 31}
    : poseCamara(t, POSES, 0.9);
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
  // tucán en el cajón
  const sale = r(t, ev.pajaro - 0.2, 0.35);
  const rebote = Math.sin(cl((t - ev.pajaro + 0.2) / 0.5) * Math.PI) * 0.12;
  const enJaula = t > ev.metes - 0.35;
  const picoEsc = 1 + 0.28 * ventana(t, ev.gigante - 0.1, ev.juguete - 0.1, 0.25) - 0.12 * ventana(t, ev.juguete, ev.felicidades, 0.12) * (0.5 + 0.5 * Math.sin(t * 28));
  const pechoEsc = 1 + 0.15 * ventana(t, ev.pecho - 0.05, ev.pico - 0.1, 0.2);
  // cabeza: agarra y tira
  const ciclo = t > ev.agarra && t < ev.agarra + 9 * 0.17 + 0.2 ? Math.sin(((t - ev.agarra) / 0.17) * Math.PI) : 0;
  const cabeza = enJaula ? -0.35 * Math.max(0, ciclo) + 0.35 * Math.max(0, -ciclo) : 0.05 * Math.sin(t * 1.7);
  const corte = r(t, ev.hueco - 0.2, 0.55);
  return (
    <>
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[-0.55, 1, 0.55]} area={7} centro={[1, 0, 0]} amb={1.0} sol={0.62} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshToonMaterial color="#ffffff" map={texPasto()} />
      </mesh>
      <Pasto />
      <Casa />
      <group position={[MESA_X, 0, 0]}>
        <Mesa />
      </group>
      {!primerPlano && <Poste />}
      {t < ev.metes + 6 && (
        <group position={cp}>
          <Cajon tapa={tapa} />
        </group>
      )}
      {t < ev.metes + 6 && t > 0.1 && (
        <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
          <Tio t={t} anda={anda} brazos={1 - deja} saluda={saluda} />
        </group>
      )}
      {!enJaula && sale > 0.01 && (
        <group position={[cajonMesa[0], 0.99 + lerp(0.05, 0.42, sale) + rebote, 0]} rotation={[0, -0.55, 0]} scale={0.6}>
          <Tucan t={t} picoEsc={picoEsc} pechoEsc={pechoEsc} cabeza={cabeza} />
        </group>
      )}
      {!primerPlano && (
        <group position={JAULA}>
          <Jaula />
        </group>
      )}
      {enJaula && (
        <group position={[JAULA[0] - 0.02, JAULA[1] + 0.155, 0]} rotation={[0, -0.45, 0]} scale={0.5}>
          <Tucan t={t} cabeza={cabeza} corte={corte} />
        </group>
      )}
      {!primerPlano && <Semillas t={t} />}
    </>
  );
};

// ---------- capa 2D ----------
const ROJAS = new Set(['amazonas', 'negro', 'amarillo', 'naranja', 'gigante', 'juguete', 'felicidades', 'tucán', 'canario', 'semillas', 'listo', 'nada', 'tira', 'enorme', 'hueco', 'pico', 'fruta', 'comida', 'hierro', 'hígado', 'matar', 'casa', 'caliente', 'tráfico']);
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
];
const DER: Ic[] = [
  [ev.pajaro - 0.05, 'pluma', 'pájaro negro'],
  [ev.pico - 0.05, 'pico', 'pico naranja'],
  [ev.felicidades + 0.4, '', ''],
  [ev.semillas - 0.05, 'semillas', 'semillas', 'ok', ev.listo],
  [ev.no - 0.05, 'plato', 'no come', 'no', ev.no + 0.25],
  [ev.agarra + 0.6, 'tirar', 'las tira', 'no', ev.tira],
  [ev.hueco - 0.05, 'panal', 'hueco por dentro'],
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
      <Confeti t={t} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Audio src={staticFile('tucan/voz.wav')} />
      <Audio src={staticFile('tucan/musica.wav')} />
    </AbsoluteFill>
  );
};
