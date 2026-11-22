import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/cachalote.json';
import {Camara, Etiqueta, G, Luces, P, Papel, Pose, Titulo, canvasTex, cl, cuerpoSecciones, esf, lerp, poseCamara, r, rnd, suave, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {FUENTE} from '../serie/tema';

export const DURACION_CACHALOTE = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  dos: T('dos', 1),
  aplastaria: T('aplastaría'),
  animal: T('animal'),
  deja: T('deja', 1),
  cachalote: T('cachalote:', 1),
  respira: T('respira'),
  caza: T('caza'),
  oscuridad: T('oscuridad'),
  pero1: T('pero', 2),
  hora: T('hora'),
  asi1: T('así', 1),
  musculos: T('músculos,'),
  mioglobina: T('mioglobina.'),
  negra: T('negra.'),
  tanque: T('tanque', 1),
  pero2: T('pero', 3),
  gasta: T('gasta'),
  asi2: T('así', 2),
  frena: T('frena'),
  sangreSolo: T('solo'),
  cerebro: T('cerebro'),
  ballena: T('ballena'),
  latidos: T('latidos'),
  reflejo: T('reflejo'),
  pero3: T('pero', 4),
  atm: T('200'),
  unos: T('unos'),
  aplastarian: T('aplastarían…'),
  nitrogeno1: T('nitrógeno', 1),
  asi3: T('así', 3),
  colapsen: T('colapsen'),
  costillas: T('costillas'),
  sinAire: T('sin', 3),
  nitrogeno2: T('nitrógeno', 2),
  pero4: T('pero', 5),
  recargar: T('recargar'),
  asi4: T('así', 4),
  cambia: T('cambia'),
  ese: T('ese', 4),
  tanque2: T('tanque', 2),
  corazonF: T('corazón', 3),
};

// ---------- trayectoria de la ballena ----------
const FONDO = -100; // 2000 m (1 unidad = 20 m de profundidad en la escala vertical)
const ballenaY = (t: number) => {
  if (t < ev.cachalote - 0.2) return FONDO; // abajo, en la oscuridad (gancho)
  if (t < ev.caza - 0.2) return 0.75; // en la superficie
  if (t < ev.pero1 + 0.4) return lerp(0.75, FONDO, suave((t - (ev.caza - 0.2)) / (ev.pero1 + 0.4 - ev.caza + 0.2)));
  if (t < ev.pero4) return FONDO;
  if (t < ev.asi4) return lerp(FONDO, 0.75, suave((t - ev.pero4) / (ev.asi4 - ev.pero4)));
  return 0.75;
};
const ballenaPitch = (t: number) => {
  const baja = ventana(t, ev.caza - 0.2, ev.pero1 + 0.4, 0.6);
  const corte = ventana(t, ev.pero1 + 0.2, ev.pero4 - 0.1, 1.0);
  const sube = ventana(t, ev.pero4 - 0.1, ev.asi4 + 0.2, 0.5);
  return -0.65 * baja - 1.2 * corte + 0.6 * sube;
};
const ballenaX = (t: number) => (t > ev.asi1 - 0.3 && t < ev.pero4 ? 0 : (t * 1.2) % 1000) * 0; // nada en su lugar (el agua se mueve)
const foco = (t: number): THREE.Vector3 => {
  if (t < ev.animal - 0.3) {
    // la cámara baja sola desde la superficie
    const k = suave(cl((t - 0.3) / 2.0));
    return new THREE.Vector3(0, lerp(-2, FONDO, k), 0);
  }
  return new THREE.Vector3(ballenaX(t), ballenaY(t), 0);
};
const profundidadM = (y: number) => Math.max(0, Math.round(-y * 20));

// ---------- color del agua según profundidad ----------
const colorAgua = (y: number) => {
  const d = profundidadM(y);
  const stops: [number, string][] = [
    [0, '#8fcde0'],
    [150, '#3f86b5'],
    [500, '#1a4a7c'],
    [1000, '#0c2649'],
    [2000, '#071631'],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (d <= stops[i + 1][0]) return new THREE.Color(stops[i][1]).lerp(new THREE.Color(stops[i + 1][1]), (d - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
  }
  return new THREE.Color(stops[stops.length - 1][1]);
};

// ---------- cuerpo del cachalote ----------
type Sec = [number, number, number, number, number?];
const SEC: Sec[] = [
  [-3.2, 1.25, 1.25, 1.3, 2.3],
  [-0.5, 1.55, 1.45, 1.6, 2.4],
  [1.5, 1.55, 1.55, 1.65, 2.6],
  [3.0, 1.45, 1.6, 1.6, 3.2],
  [5.0, 1.38, 1.62, 1.55, 3.8],
  [7.0, 1.3, 1.55, 1.45, 3.8],
  [7.9, 1.05, 1.25, 1.2, 3.2],
  [8.2, 0.5, 0.75, 0.75, 2.4],
  [8.28, 0.05, 0.1, 0.1, 2],
];
const SEC_COLA: Sec[] = [
  [-8.4, 0.08, 0.2, 0.18, 2],
  [-8.0, 0.22, 0.42, 0.36, 2.2],
  [-6.5, 0.4, 0.7, 0.62, 2.2],
  [-5.0, 0.75, 0.95, 0.95, 2.3],
  [-3.0, 1.27, 1.27, 1.32, 2.3],
];
const interp = (sec: Sec[], x: number, k: number) => {
  for (let i = 0; i < sec.length - 1; i++) {
    if (x >= sec[i][0] && x <= sec[i + 1][0]) {
      const u = (x - sec[i][0]) / (sec[i + 1][0] - sec[i][0]);
      const s = u * u * (3 - 2 * u) * 0.5 + u * 0.5;
      return lerp(sec[i][k] as number, sec[i + 1][k] as number, s);
    }
  }
  return sec[x < sec[0][0] ? 0 : sec.length - 1][k] as number;
};

let _pielB: THREE.CanvasTexture | null = null;
const texPielB = () => {
  if (_pielB) return _pielB;
  _pielB = canvasTex(
    1024,
    512,
    (g) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(30,35,45,${0.1 + rnd(i) * 0.1})`;
        g.lineWidth = 2 + rnd(i + 3) * 2;
        g.beginPath();
        const y = rnd(i + 1) * 512;
        g.moveTo(0, y);
        for (let x = 0; x <= 1024; x += 24) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 6 + Math.sin(x * 0.11 + i * 2) * 3);
        g.stroke();
      }
      // cicatrices de ventosas de calamar
      for (let i = 0; i < 60; i++) {
        g.strokeStyle = 'rgba(235,235,230,0.55)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(600 + rnd(i + 7) * 400, rnd(i + 9) * 512, 4 + rnd(i + 2) * 7, 0, Math.PI * 2);
        g.stroke();
      }
      for (let i = 0; i < 18; i++) {
        g.strokeStyle = 'rgba(235,235,230,0.5)';
        g.lineWidth = 3;
        g.beginPath();
        const x = 650 + rnd(i + 30) * 350;
        const y = rnd(i + 31) * 512;
        g.moveTo(x, y);
        g.lineTo(x + 40 + rnd(i) * 60, y + (rnd(i + 2) - 0.5) * 30);
        g.stroke();
      }
    },
    [1, 1],
  );
  return _pielB;
};
const GRIS = '#5f6874';

/** Corte en z=0: forma de la silueta (arriba/abajo de las secciones). */
const silueta2D = (k: number, x0 = -8.4, x1 = 8.28, n = 120) => {
  const arriba: THREE.Vector2[] = [];
  const abajo: THREE.Vector2[] = [];
  const todas = [...SEC_COLA.slice(0, -1), ...SEC];
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    arriba.push(new THREE.Vector2(x, interp(todas, x, 2) * k));
    abajo.push(new THREE.Vector2(x, -interp(todas, x, 3) * k));
  }
  return [...arriba, ...abajo.reverse()];
};
const CAVIDAD = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push(new THREE.Vector2(1.7 + Math.cos(a) * 2.3, -0.15 + Math.sin(a) * 1.0 * (Math.sin(a) > 0 ? 1.05 : 1.15)));
  }
  return pts;
})();
const ESPERMACETI = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push(new THREE.Vector2(5.3 + Math.cos(a) * 1.9, 0.42 + Math.sin(a) * 0.68));
  }
  return pts;
})();

const capaGeo = (k: number, huecos: THREE.Vector2[][], conHuecoInterno?: number) =>
  G(`capa|${k}|${huecos.length}|${conHuecoInterno ?? 0}`, () => {
    const sh = new THREE.Shape(k < 1 ? silueta2D(k, -7.9, 8.0) : silueta2D(k));
    if (conHuecoInterno) sh.holes.push(new THREE.Path(silueta2D(conHuecoInterno, -7.9, 8.0).reverse()));
    for (const h of huecos) sh.holes.push(new THREE.Path(h.slice().reverse()));
    return new THREE.ShapeGeometry(sh, 2);
  });

const Corte: React.FC = () => (
  <group>
    {/* grasa (blubber) */}
    <mesh geometry={capaGeo(1, [], 0.86)} position={[0, 0, 0.004]}>
      <meshToonMaterial color="#f1e0c4" side={THREE.DoubleSide} />
    </mesh>
    {/* músculo casi negro */}
    <mesh geometry={capaGeo(0.86, [CAVIDAD, ESPERMACETI])} position={[0, 0, 0.005]}>
      <meshToonMaterial color="#3d1d22" side={THREE.DoubleSide} />
    </mesh>
    {/* órgano de espermaceti */}
    <mesh geometry={G('esper', () => new THREE.ShapeGeometry(new THREE.Shape(ESPERMACETI)))} position={[0, 0, 0.005]}>
      <meshToonMaterial color="#efdca0" side={THREE.DoubleSide} />
    </mesh>
    {/* contornos */}
    {[silueta2D(1), silueta2D(0.86, -7.9, 8.0), CAVIDAD, ESPERMACETI].map((pts, i) => (
      <mesh key={i} geometry={G(`bordeC|${i}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0.007)), true), 400, 0.035, 6, true))}>
        <meshBasicMaterial color="#1a1b22" />
      </mesh>
    ))}
  </group>
);

const Ojo: React.FC<{s: number}> = ({s: lado}) => (
  <group>
    {[lado].map((s) => (
      <group key={s} position={[3.0, -0.55, s * 1.42]}>
        <P geo={esf(0.12, 16)} color="#1d1f26" linea={0} silueta={1.4} />
        <P geo={G('parp', () => new THREE.TorusGeometry(0.15, 0.04, 8, 20))} color="#4c5560" rotation={[0, s > 0 ? 0 : Math.PI, 0]} linea={0} silueta={1} />
      </group>
    ))}
  </group>
);

const Mandibula: React.FC<{abre: number}> = ({abre}) => (
  <group position={[2.3, -1.35, 0]} rotation={[0, 0, -abre * 0.35]}>
    <P geo={G('mand', () => cuerpoSecciones([[0, 0.45, 0.25, 0.25, 2.4], [2.5, 0.32, 0.2, 0.22, 2.4], [5.2, 0.2, 0.14, 0.16, 2.2], [5.5, 0.05, 0.05, 0.06, 2]], {segX: 50, segA: 24}))} color="#d9d6cf" linea={0} silueta={2} />
    {Array.from({length: 13}, (_, i) =>
      [1, -1].map((s) => (
        <P key={`${i}${s}`} geo={G('diente', () => new THREE.ConeGeometry(0.06, 0.2, 8))} color="#f6f1e2" position={[1.0 + i * 0.33, 0.28, s * (0.26 - i * 0.012)]} linea={0} silueta={1} />
      )),
    )}
  </group>
);

const Aleta: React.FC<{s: number; t: number}> = ({s, t}) => (
  <group position={[2.6, -1.1, s * 1.3]} rotation={[s * 0.9, s * 0.3, -0.5 + Math.sin(t * 1.3) * 0.08]}>
    <P geo={G('aleta', () => new THREE.SphereGeometry(1, 20, 12).scale(0.75, 0.08, 0.38).translate(-0.55, 0, 0))} color={GRIS} mapa={texPielB()} linea={0} silueta={2} />
  </group>
);

const Cola: React.FC<{t: number; nada: number; cortada: boolean}> = ({t, nada, cortada}) => {
  const ang = Math.sin(t * 2.0) * 0.22 * nada;
  return (
    <group position={[-3.0, 0, 0]} rotation={[0, 0, ang]}>
      <group position={[3.0, 0, 0]}>
        <P geo={cortada ? G('colaM', () => cuerpoSecciones(SEC_COLA, {mitad: true, segX: 60, segA: 36})) : G('cola', () => cuerpoSecciones(SEC_COLA, {segX: 60, segA: 36}))} color={GRIS} mapa={texPielB()} linea={0} silueta={2.4} />
        {/* nudillos de la espalda */}
        {Array.from({length: 6}, (_, i) => (
          <P key={i} geo={G('nud', () => new THREE.SphereGeometry(0.16, 12, 8).scale(1.6, 0.6, 0.8))} color={GRIS} position={[-3.6 - i * 0.55, interp(SEC_COLA, -3.6 - i * 0.55, 2) - 0.02, 0]} linea={0} silueta={1.4} />
        ))}
        {/* aleta caudal */}
        <group position={[-8.3, 0, 0]} rotation={[0, 0, ang * 1.4]}>
          <P geo={G('cauda', () => {
            const sh = new THREE.Shape();
            sh.moveTo(0.4, 0);
            sh.bezierCurveTo(-0.2, 0.6, -0.9, 1.6, -1.6, 2.3);
            sh.bezierCurveTo(-1.2, 1.5, -1.0, 0.6, -1.05, 0.0);
            sh.bezierCurveTo(-1.0, -0.6, -1.2, -1.5, -1.6, -2.3);
            sh.bezierCurveTo(-0.9, -1.6, -0.2, -0.6, 0.4, 0);
            const g = new THREE.ExtrudeGeometry(sh, {depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 24});
            g.translate(0, 0, -0.06);
            g.rotateX(Math.PI / 2);
            return g;
          })} color={GRIS} linea={1.4} umbral={40} silueta={2} />
        </group>
      </group>
    </group>
  );
};

// ---------- interior ----------
const radioInterior = (x: number, a: number) => {
  // punto sobre la pared interior (mitad de atrás) en ángulo a (0 arriba, pi abajo)
  const w = interp(SEC, x, 1) * 0.84;
  const up = interp(SEC, x, 2) * 0.84;
  const dn = interp(SEC, x, 3) * 0.84;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector3(x, c >= 0 ? c * up : c * dn, -s * w);
};

const Interior: React.FC<{t: number}> = ({t}) => {
  const colapso = r(t, ev.colapsen - 0.3, 1.6) * (1 - r(t, ev.pero4 + 0.6, 1.2));
  const costilla = r(t, ev.costillas - 0.3, 1.0) * (1 - r(t, ev.pero4 + 0.6, 1.2));
  const lat = latidoB(t);
  const reflejo = r(t, ev.sangreSolo - 0.3, 0.8) * (1 - r(t, ev.pero4, 1));
  return (
    <group>
      {/* pared interior oscura */}
      <P geo={G('inner', () => cuerpoSecciones(SEC.map((s) => [s[0], s[1] * 0.86, s[2] * 0.86, s[3] * 0.86, s[4]] as Sec), {mitad: true, segX: 80, segA: 32}))} color="#c0625c" doble linea={0} silueta={0} sombra={false} />
      {/* costillas */}
      {Array.from({length: 9}, (_, i) => {
        const x = -0.3 + i * 0.42;
        if (x > 3.9) return null;
        const pts = Array.from({length: 14}, (_, k) => radioInterior(x - k * 0.025, 0.25 + (k / 13) * (Math.PI - 0.6)));
        return (
          <group key={i} position={[x, 0, 0]} scale={[1, 1 - costilla * 0.18, 1 - costilla * 0.35]}>
            <group position={[-x, 0, 0]}>
              <P geo={G(`cost|${i}`, () => tuboAhusado(pts, () => 0.07, 24, 8))} color="#efe6d2" linea={0} silueta={1.6} />
            </group>
          </group>
        );
      })}
      {/* columna */}
      {Array.from({length: 22}, (_, i) => (
        <P key={i} geo={G('vertB', () => new THREE.CylinderGeometry(0.17, 0.17, 0.24, 14).rotateZ(Math.PI / 2))} color="#e8dcc0" position={[-3 + i * 0.3, 0.95 - Math.max(0, i - 15) * 0.02, -0.45]} linea={0} silueta={1.2} />
      ))}
      {/* pulmón */}
      <group position={[1.4, 0.35, -0.55]} scale={[1 - colapso * 0.55, 1 - colapso * 0.7, 1 - colapso * 0.6]}>
        <P geo={G('pulmonB', () => new THREE.SphereGeometry(1, 32, 20).scale(1.6, 0.62, 0.6))} color="#f7b3ba" linea={0} silueta={2} />
      </group>
      {/* corazón */}
      <group position={[2.9, -0.6, -0.15]} scale={lat}>
        <P geo={G('corB', () => new THREE.SphereGeometry(0.5, 28, 18).scale(1, 1.15, 0.85))} color="#e0413a" linea={0} silueta={2.4} />
      </group>
      {/* cerebro (detrás del espermaceti) */}
      <P geo={G('cerB', () => new THREE.SphereGeometry(0.32, 22, 14).scale(1.3, 1, 1))} color="#f0c9c0" position={[3.6, 0.25, -0.25]} linea={0} silueta={1.6} />
      {/* vasos */}
      <Vaso pts={[[3.0, -0.4, -0.2], [3.3, 0.0, -0.2], [3.6, 0.25, -0.2]]} on={1} />
      <Vaso pts={[[2.7, -0.7, -0.2], [1.5, -0.9, -0.2], [0, -0.7, -0.3], [-2.5, -0.4, -0.4]]} on={1 - reflejo} />
      <Vaso pts={[[2.8, -0.9, -0.2], [2.2, -1.2, -0.2], [1.0, -1.25, -0.25]]} on={1 - reflejo} />
      <Vaso pts={[[2.6, -0.5, -0.2], [1.8, 0.9, -0.3], [0.2, 0.85, -0.4], [-2.0, 0.6, -0.4]]} on={1 - reflejo} />
      <SangreB t={t} reflejo={reflejo} />
      <Oxigeno t={t} />
      <Nitrogeno t={t} colapso={colapso} />
    </group>
  );
};

const latidoB = (t: number) => {
  // frecuencia baja muchísimo con el reflejo de buceo
  const f = t < ev.frena ? 1.0 : lerp(1.0, 0.18, r(t, ev.frena, 2.0));
  const ph = (t * f) % 1;
  return 1 + 0.12 * Math.max(0, Math.sin(ph * Math.PI * 2)) ** 8;
};

const Vaso: React.FC<{pts: [number, number, number][]; on: number}> = ({pts, on}) => (
  <P geo={G(`vaso|${JSON.stringify(pts)}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, 0.07, 10))} color={on > 0.5 ? '#d2443c' : '#8d8a8f'} linea={0} silueta={1.2} />
);

const SangreB: React.FC<{t: number; reflejo: number}> = ({t, reflejo}) => {
  const o = ventana(t, ev.frena - 0.5, ev.pero3 + 0.3, 0.4);
  const curvas = useMemo(
    () => [
      new THREE.CatmullRomCurve3([new THREE.Vector3(3.0, -0.4, -0.15), new THREE.Vector3(3.3, 0.0, -0.15), new THREE.Vector3(3.6, 0.25, -0.15)]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(2.7, -0.7, -0.15), new THREE.Vector3(1.5, -0.9, -0.15), new THREE.Vector3(0, -0.7, -0.25), new THREE.Vector3(-2.5, -0.4, -0.35)]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(2.6, -0.5, -0.15), new THREE.Vector3(1.8, 0.9, -0.25), new THREE.Vector3(0.2, 0.85, -0.35), new THREE.Vector3(-2.0, 0.6, -0.35)]),
    ],
    [],
  );
  if (o <= 0.01) return null;
  const v = lerp(0.5, 0.15, r(t, ev.frena, 2));
  return (
    <group>
      {curvas.map((c, ci) =>
        Array.from({length: 10}, (_, k) => {
          if (ci > 0 && reflejo > 0.5) return null;
          const u = (t * v * (ci ? 0.5 : 1) + k / 10) % 1;
          return (
            <mesh key={`${ci}${k}`} position={c.getPointAt(u)} scale={o}>
              <sphereGeometry args={[0.06, 10, 8]} />
              <meshBasicMaterial color="#ff6b5e" depthTest={false} transparent />
            </mesh>
          );
        }),
      )}
    </group>
  );
};

/** Moléculas de oxígeno que se pegan al músculo (mioglobina). */
const Oxigeno: React.FC<{t: number}> = ({t}) => {
  const llegan = r(t, ev.asi1 + 0.2, 3.5);
  const gasto = r(t, ev.gasta - 0.3, 2.0) * (1 - r(t, ev.frena, 1.5)) * 0.6 + r(t, ev.frena, 1.5) * 0.3;
  const o = ventana(t, ev.asi1, ev.pero3, 0.4);
  if (o <= 0.01) return null;
  return (
    <group>
      {Array.from({length: 46}, (_, i) => {
        const x = -6 + rnd(i) * 7.5;
        const yy = (rnd(i + 3) - 0.5) * 2 * interp([...SEC_COLA, ...SEC], x, 2) * 0.62;
        const k = cl(llegan * 1.6 - rnd(i + 7) * 0.6);
        if (rnd(i + 11) < gasto) return null;
        const desde = new THREE.Vector3(1.4, 0.35, 0.4);
        const p = desde.lerp(new THREE.Vector3(x, yy, 0.03), suave(k));
        return (
          <group key={i} position={p} scale={o}>
            <mesh position={[-0.07, 0, 0]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshBasicMaterial color="#ff5d6c" />
            </mesh>
            <mesh position={[0.07, 0, 0]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshBasicMaterial color="#ff5d6c" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Burbujas de nitrógeno: en el pulmón; si no colapsa, pasan a la sangre. */
const Nitrogeno: React.FC<{t: number; colapso: number}> = ({t, colapso}) => {
  const o = ventana(t, ev.nitrogeno1 - 0.4, ev.pero4, 0.4);
  if (o <= 0.01) return null;
  const pasa = t < ev.asi3 ? r(t, ev.nitrogeno1, 1.2) : 0;
  return (
    <group>
      {Array.from({length: 14}, (_, i) => {
        const base = new THREE.Vector3(1.4 + (rnd(i) - 0.5) * 2.2 * (1 - colapso * 0.55), 0.35 + (rnd(i + 1) - 0.5) * 0.8 * (1 - colapso * 0.7), 0.15);
        const dest = new THREE.Vector3(0.5 + rnd(i + 2) * 2, -0.85, 0.1);
        const p = base.lerp(dest, pasa * cl(1.4 - rnd(i + 4)));
        return (
          <mesh key={i} position={p} scale={o * (0.7 + rnd(i + 5) * 0.6)}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshBasicMaterial color="#bfe9ff" />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- ballena completa ----------
const tapaB = (t: number) => r(t, ev.asi1 - 0.1, 0.9) * (1 - r(t, ev.pero4 - 0.2, 0.6));

const Cachalote: React.FC<{t: number}> = ({t}) => {
  const ab = tapaB(t);
  const y = ballenaY(t);
  const pitch = ballenaPitch(t);
  const nada = 1 - ventana(t, ev.asi1 - 0.3, ev.pero4, 0.4);
  const cuerpo = G('cuerpoB', () => cuerpoSecciones(SEC, {segX: 140, segA: 48}));
  const mitad = G('mitadB', () => cuerpoSecciones(SEC, {mitad: true, segX: 140, segA: 48}));
  return (
    <group position={[ballenaX(t), y, 0]} rotation={[0, 0, pitch]}>
      {ab > 0.001 ? (
        <group>
          <P geo={mitad} color={GRIS} mapa={texPielB()} linea={0} silueta={2.6} />
          <Corte />
          <Interior t={t} />
          {ab < 0.97 && (
            <group position={[ab * 4, ab * 16, ab * 2]} rotation={[0, Math.PI, ab * 0.6]} scale={1 - ab * 0.7}>
              <P geo={mitad} color={GRIS} mapa={texPielB()} linea={0} silueta={2.6} />
            </group>
          )}
        </group>
      ) : (
        <P geo={cuerpo} color={GRIS} mapa={texPielB()} linea={0} silueta={2.6} />
      )}
      {/* espiráculo: adelante a la izquierda */}
      <P geo={G('espir', () => new THREE.CapsuleGeometry(0.06, 0.25, 4, 10).rotateZ(Math.PI / 2))} color="#22252c" position={[7.6, 1.5, 0.38]} rotation={[0, 0.5, 0]} linea={0} silueta={0} />
      <Ojo s={-1} />
      <Aleta s={-1} t={t} />
      <group position={[ab * 4, ab * 16, ab * 2]} scale={1 - ab * 0.7} visible={ab < 0.97}>
        <Ojo s={1} />
        <Mandibula abre={ventana(t, ev.caza, ev.oscuridad + 0.6, 0.3)} />
        <Aleta s={1} t={t} />
      </group>
      <Presion t={t} />
      <Cola t={t} nada={nada} cortada={ab > 0.001} />
      <Soplo t={t} />
    </group>
  );
};

const Soplo: React.FC<{t: number}> = ({t}) => {
  const tiros = [ev.respira - 0.2, ev.asi4 + 0.2, ev.cambia + 0.3, ev.ese + 0.5];
  return (
    <group position={[7.7, 1.6, 0.38]} rotation={[0, 0, 0.75]}>
      {tiros.map((h, j) => {
        const k = (t - h) / 2.4;
        if (k < 0 || k > 1) return null;
        return Array.from({length: 26}, (_, i) => {
          const u = cl(k * 1.4 - rnd(i + j) * 0.4);
          const dir = new THREE.Vector3(0.25 + (rnd(i + 1) - 0.5) * 0.35, 1, (rnd(i + 2) - 0.5) * 0.35);
          const p = dir.multiplyScalar(u * 5.5);
          return (
            <sprite key={`${j}-${i}`} position={p} scale={[0.5 + u * 1.6, 0.5 + u * 1.6, 1]}>
              <spriteMaterial map={texNiebla()} transparent opacity={(1 - u) * 0.85 * (u > 0.02 ? 1 : 0)} depthWrite={false} />
            </sprite>
          );
        });
      })}
    </group>
  );
};

let _niebla: THREE.CanvasTexture | null = null;
const texNiebla = () => {
  if (_niebla) return _niebla;
  _niebla = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  });
  _niebla.wrapS = _niebla.wrapT = THREE.ClampToEdgeWrapping;
  return _niebla;
};

// ---------- calamar ----------
const Calamar: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.caza - 0.5, ev.asi1 - 0.2, 0.4);
  const brazos = useMemo(
    () =>
      Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const largo = i < 2 ? 4.2 : 2.2;
        const pts = Array.from({length: 6}, (_, k) => {
          const u = k / 5;
          return new THREE.Vector3(-u * largo, Math.cos(a) * 0.25 * (1 + u) + Math.sin(t * 2 + i + u * 3) * 0.15 * u, Math.sin(a) * 0.25 * (1 + u));
        });
        return tuboAhusado(pts, (u) => 0.09 * (1 - u * 0.8) + (i < 2 && u > 0.8 ? 0.05 : 0), 30, 8);
      }),
    [t],
  );
  useEffect(() => () => brazos.forEach((g) => g.dispose()), [brazos]);
  if (o <= 0.01) return null;
  const y = ballenaY(t);
  return (
    <group position={[14 - (t - ev.caza) * 1.5, y - 3.5, -4]} rotation={[0, 0.3, 0.2]} scale={o}>
      <P geo={G('mantoC', () => new THREE.ConeGeometry(0.5, 3, 20).rotateZ(-Math.PI / 2).translate(1.7, 0, 0))} color="#b9454e" linea={0} silueta={2} />
      <P geo={G('cabC', () => new THREE.SphereGeometry(0.42, 20, 14).scale(1.2, 1, 1))} color="#c4525b" linea={0} silueta={2} />
      {[1, -1].map((s) => (
        <group key={s} position={[0.05, 0.12, s * 0.38]}>
          <P geo={esf(0.15, 16)} color="#f4f0e2" linea={0} silueta={1.2} />
          <mesh position={[0, 0, s * 0.08]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshBasicMaterial color="#111318" />
          </mesh>
        </group>
      ))}
      {brazos.map((g, i) => (
        <P key={i} geo={g} color="#c4525b" linea={0} silueta={1.6} />
      ))}
    </group>
  );
};

// ---------- océano ----------
const Oceano: React.FC<{t: number; camY: number}> = ({t, camY}) => {
  const scene = useThree((s) => s.scene);
  const c = colorAgua(camY);
  scene.background = c;
  if (!scene.fog) scene.fog = new THREE.Fog(c, 20, 90);
  (scene.fog as THREE.Fog).color.copy(c);
  const olas = useMemo(
    () =>
      canvasTex(
        1024,
        1024,
        (g) => {
          g.fillStyle = '#6fb0d4';
          g.fillRect(0, 0, 1024, 1024);
          for (let i = 0; i < 900; i++) {
            const x = rnd(i) * 1024;
            const y = rnd(i + 999) * 1024;
            const l = 14 + rnd(i + 3) * 40;
            g.strokeStyle = rnd(i + 7) > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(30,70,120,0.2)';
            g.lineWidth = 1.5 + rnd(i + 5) * 2;
            g.beginPath();
            g.moveTo(x, y);
            g.quadraticCurveTo(x + l / 2, y - 4, x + l, y);
            g.stroke();
          }
        },
        [24, 24],
      ),
    [],
  );
  olas.offset.set(t * 0.01, 0);
  return (
    <group>
      {/* superficie (se ve de arriba y de abajo) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshBasicMaterial map={olas} side={THREE.DoubleSide} transparent opacity={camY > 0 ? 1 : 0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <shadowMaterial color="#1e2f86" opacity={0.6} />
      </mesh>
      {camY > 0 && <Cielo />}
      <Nieve t={t} camY={camY} />
      <RayosB t={t} camY={camY} />
    </group>
  );
};

const Cielo: React.FC = () => {
  const tex = useMemo(
    () =>
      canvasTex(16, 512, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 512);
        gr.addColorStop(0, '#8fb7de');
        gr.addColorStop(0.45, '#d3e3ef');
        gr.addColorStop(0.5, '#eef2f2');
        gr.addColorStop(1, '#eef2f2');
        g.fillStyle = gr;
        g.fillRect(0, 0, 16, 512);
      }),
    [],
  );
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return (
    <mesh>
      <sphereGeometry args={[400, 32, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
};

/** Nieve marina: partículas que dan sensación de profundidad y movimiento. */
const Nieve: React.FC<{t: number; camY: number}> = ({t, camY}) => {
  if (camY > 0) return null;
  return (
    <group>
      {Array.from({length: 120}, (_, i) => {
        const x = -30 + rnd(i) * 60;
        const z = -25 + rnd(i + 1) * 40;
        const span = 40;
        const yy = camY - span / 2 + ((rnd(i + 2) * span - t * 0.6 + 1000 * span) % span);
        return (
          <mesh key={i} position={[x, yy, z]}>
            <sphereGeometry args={[0.04 + rnd(i + 3) * 0.05, 6, 4]} />
            <meshBasicMaterial color="#e6f3ff" transparent opacity={0.65} />
          </mesh>
        );
      })}
    </group>
  );
};

const RayosB: React.FC<{t: number; camY: number}> = ({t, camY}) => {
  const tex = useMemo(
    () =>
      canvasTex(64, 512, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 512);
        gr.addColorStop(0, 'rgba(255,255,240,0.9)');
        gr.addColorStop(1, 'rgba(255,255,240,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 512);
      }),
    [],
  );
  const o = cl(1 - profundidadM(camY) / 250);
  if (o <= 0.01 || camY > 0) return null;
  return (
    <group>
      {Array.from({length: 9}, (_, i) => (
        <mesh key={i} position={[-20 + i * 5 + Math.sin(t * 0.3 + i) * 0.6, -14, -10 - (i % 3) * 4]} rotation={[0, 0, 0.22]}>
          <planeGeometry args={[1.5 + rnd(i) * 2, 30]} />
          <meshBasicMaterial map={tex} transparent opacity={(0.18 + 0.06 * Math.sin(t + i)) * o} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- flechas de presión ----------
const Presion: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.pero3, ev.asi3 + 0.4, 0.5);
  if (o <= 0.01) return null;
  return (
    <group>
      {Array.from({length: 14}, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const rr = 4.6 + Math.sin(t * 5 + i) * 0.25;
        const p = new THREE.Vector3(Math.cos(a) * rr * 2.0, Math.sin(a) * rr, 1.5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().setZ(0).normalize().negate());
        return (
          <group key={i} position={p} quaternion={q} scale={o}>
            <P geo={cil(0.13, 0.13, 1.4, 10)} color="#f4c430" position={[0, 0, 0]} sombra={false} />
            <P geo={G('puntaP', () => new THREE.ConeGeometry(0.34, 0.6, 14))} color="#f4c430" position={[0, 0.95, 0]} sombra={false} />
          </group>
        );
      })}
    </group>
  );
};
const cil = (a: number, b: number, h: number, s: number) => G(`cilB|${a}|${b}|${h}|${s}`, () => new THREE.CylinderGeometry(a, b, h, s));

// ---------- cámara ----------
const POSES: Pose[] = [
  [0, [5, 2, 16], [0, -3, 0], 40],
  [0.01, [5, 2, 16], [0, -3, 0], 40],
  [ev.animal - 0.4, [12, 3, 26], [1.5, 0, 0], 38],
  [ev.cachalote - 0.25, [15, 8, 15], [3, 0.6, 0], 38],
  [ev.caza - 0.3, [15, 4, 24], [1, 0, 0], 38],
  [ev.pero1 - 0.3, [14, 2, 26], [1.5, -1, 0], 38],
  [ev.asi1 - 0.2, [-1.5, 0.3, 14], [-1.5, 0, 0], 36],
  [ev.mioglobina - 0.6, [-1.2, 0, 11.5], [-1.2, 0, 0], 36],
  [ev.asi2 - 0.1, [3.0, -0.4, 9.5], [2.9, -0.4, 0], 36],
  [ev.sangreSolo - 0.3, [2.0, 0, 15], [1.6, 0, 0], 36],
  [ev.pero3 - 0.1, [0.5, 0, 36], [0, 0, 0], 40],
  [ev.asi3 - 0.1, [1.4, 0.3, 9.5], [1.4, 0.3, 0], 36],
  [ev.pero4 - 0.1, [12, -3, 26], [1, 0, 0], 40],
  [ev.asi4 - 0.2, [14, 9, 16], [3, 1, 0], 38],
  [ev.ese - 0.2, [18, 10, 24], [1, 1, 0], 38],
];

const camaraB = (t: number) => {
  const {pos, obj, fov} = poseCamara(t, POSES, 1.4);
  const f = foco(t);
  if (t >= ev.animal - 0.3) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ballenaPitch(t));
    pos.applyQuaternion(q);
    obj.applyQuaternion(q);
  }
  pos.add(f);
  obj.add(f);
  return {pos, obj, fov, f};
};

const Escena: React.FC<{t: number}> = ({t}) => {
  const {pos, obj, fov, f} = camaraB(t);
  return (
    <>
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[0.35, 1, 0.55]} area={14} centro={[f.x, f.y, f.z]} amb={1.0} sol={0.62} />
      <Oceano t={t} camY={pos.y} />
      <Cachalote t={t} />
      <Calamar t={t} />
    </>
  );
};

// ---------- capa 2D ----------
const fmt = (n: number) => n.toLocaleString('es-MX').replace(/,/g, ' ');

const Profundimetro: React.FC<{t: number}> = ({t}) => {
  const d = Math.min(2000, profundidadM(camaraB(t).f.y));
  const o = ventana(t, 0.2, ev.ese - 0.3, 0.4);
  return (
    <div style={{position: 'absolute', left: 40, top: 640, opacity: o, fontFamily: FUENTE}}>
      <div style={{width: 18, height: 560, borderRadius: 9, background: 'rgba(255,255,255,0.75)', border: '4px solid #16171c', position: 'relative'}}>
        <div style={{position: 'absolute', left: -8, top: (d / 2000) * 540, width: 34, height: 12, borderRadius: 6, background: '#e0453a', border: '3px solid #16171c'}} />
      </div>
      <div style={{position: 'absolute', left: 36, top: (d / 2000) * 540 - 22, fontWeight: 900, fontSize: 40, color: '#16171c', WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>
        {fmt(d)} m
      </div>
    </div>
  );
};

const PulmonesHumanos: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  const o = ventana(t, a - 0.3, b, 0.3);
  if (o <= 0) return null;
  const k = r(t, a, 0.5);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', opacity: o}}>
      <svg width={420} height={380} viewBox="-210 -190 420 380">
        <g transform={`scale(${1 - k * 0.45}, ${1 - k * 0.2})`}>
          <path d="M-20,-150 L-20,-60 M20,-150 L20,-60" stroke="#16171c" strokeWidth={14} />
          <path d="M-30,-70 C-120,-100 -170,20 -150,120 C-140,165 -60,160 -35,120 C-20,60 -20,-20 -30,-70 Z" fill="#ee9ea6" stroke="#16171c" strokeWidth={8} />
          <path d="M30,-70 C120,-100 170,20 150,120 C140,165 60,160 35,120 C20,60 20,-20 30,-70 Z" fill="#ee9ea6" stroke="#16171c" strokeWidth={8} />
        </g>
        {k > 0.3 && (
          <g stroke="#e0453a" strokeWidth={22} strokeLinecap="round" opacity={k}>
            <line x1={-130} y1={-130} x2={130} y2={130} />
            <line x1={130} y1={-130} x2={-130} y2={130} />
          </g>
        )}
      </svg>
    </div>
  );
};

const Barra: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.tanque - 0.3, ev.frena + 0.5, 0.3);
  if (o <= 0) return null;
  const nivel = 1 - r(t, ev.gasta - 0.2, 1.6) * 0.75;
  return (
    <div style={{position: 'absolute', right: 70, top: 640, opacity: o, fontFamily: FUENTE, textAlign: 'center'}}>
      <div style={{width: 90, height: 420, borderRadius: 26, background: 'rgba(255,255,255,0.85)', border: '6px solid #16171c', position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: `${nivel * 100}%`, background: nivel < 0.5 ? '#e0453a' : '#ff6b7a'}} />
      </div>
      <div style={{fontWeight: 900, fontSize: 46, color: '#16171c', WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill', marginTop: 8}}>O₂</div>
    </div>
  );
};

const Pulso: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.frena - 0.5, ev.pero3, 0.3);
  if (o <= 0) return null;
  const pts: string[] = [];
  for (let x = 0; x <= 600; x += 4) {
    const tt = t - (600 - x) / 200;
    const f = tt < ev.frena ? 1.0 : lerp(1.0, 0.18, r(tt, ev.frena, 2.0));
    const ph = (tt * f) % 1;
    const yy = ph > 0.4 && ph < 0.43 ? -70 : ph > 0.43 && ph < 0.46 ? 40 : 0;
    pts.push(`${x},${100 + yy}`);
  }
  return (
    <div style={{position: 'absolute', left: 240, top: 1540, opacity: o}}>
      <svg width={600} height={200}>
        <rect x={0} y={0} width={600} height={200} rx={26} fill="rgba(255,255,255,0.88)" stroke="#16171c" strokeWidth={5} />
        <polyline points={pts.join(' ')} fill="none" stroke="#d2443c" strokeWidth={8} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export const CachaloteVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: '#0c2649'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.1, far: 800, position: [5, 2, 16]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.2} manchas={0.12} />
      <Profundimetro t={t} />
      <Titulo texto={`${fmt(Math.min(2000, Math.round(profundidadM(foco(t).y) / 10) * 10))} m`} o={ventana(t, 0.3, ev.aplastaria - 0.1, 0.3)} y={200} size={130} fuente={FUENTE} />
      <PulmonesHumanos t={t} a={ev.aplastaria} b={ev.animal - 0.1} />
      <Etiqueta texto="te aplastaría los pulmones" rojo o={ventana(t, ev.aplastaria - 0.1, ev.animal - 0.1, 0.3)} y={220} size={60} fuente={FUENTE} />
      <Etiqueta texto={t < ev.deja ? 'a este animal también…' : '…y lo deja pasar'} o={ventana(t, ev.animal - 0.1, ev.cachalote - 0.3, 0.3)} y={220} size={60} fuente={FUENTE} />
      <Titulo texto="cachalote" o={ventana(t, ev.cachalote - 0.1, ev.caza - 0.1, 0.3)} y={200} size={130} fuente={FUENTE} />
      <Etiqueta texto="respira aire, como tú" o={ventana(t, ev.respira - 0.1, ev.caza - 0.1, 0.3)} y={350} fuente={FUENTE} />
      <Etiqueta texto="caza calamares en la oscuridad" o={ventana(t, ev.caza - 0.1, ev.pero1 - 0.1, 0.3)} y={220} size={60} fuente={FUENTE} />
      <Etiqueta texto="sin aire" rojo o={ventana(t, ev.pero1, ev.hora - 0.2, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Titulo texto="+1 hora" o={ventana(t, ev.hora - 0.4, ev.asi1 - 0.1, 0.3)} y={200} size={140} fuente={FUENTE} />
      <Etiqueta texto="oxígeno → músculos" o={ventana(t, ev.musculos - 0.4, ev.mioglobina - 0.6, 0.3)} y={220} size={60} fuente={FUENTE} />
      <Titulo texto="mioglobina" o={ventana(t, ev.mioglobina - 0.6, ev.tanque - 0.2, 0.3)} y={200} size={120} fuente={FUENTE} />
      <Etiqueta texto="carne casi negra" o={ventana(t, ev.negra - 0.6, ev.tanque - 0.2, 0.3)} y={350} fuente={FUENTE} />
      <Titulo texto="tanque de oxígeno" o={ventana(t, ev.tanque - 0.3, ev.pero2, 0.3)} y={200} size={96} fuente={FUENTE} />
      <Etiqueta texto="se gasta muy rápido" rojo o={ventana(t, ev.gasta - 0.3, ev.asi2, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Etiqueta texto="el corazón se frena" o={ventana(t, ev.frena - 0.3, ev.sangreSolo - 0.2, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Etiqueta texto="sangre solo a cerebro y corazón" o={ventana(t, ev.sangreSolo - 0.2, ev.ballena - 0.2, 0.3)} y={220} size={58} fuente={FUENTE} />
      <Titulo texto="2 latidos/min" o={ventana(t, ev.latidos - 0.5, ev.reflejo - 0.2, 0.3)} y={200} size={112} fuente={FUENTE} />
      <Etiqueta texto="(medido en ballena azul)" o={ventana(t, ev.latidos - 0.3, ev.reflejo - 0.2, 0.3)} y={340} size={44} fuente={FUENTE} />
      <Titulo texto="reflejo de buceo" o={ventana(t, ev.reflejo - 0.5, ev.pero3, 0.3)} y={200} size={100} fuente={FUENTE} />
      <Titulo texto="200 atmósferas" o={ventana(t, ev.atm - 0.4, ev.unos - 0.1, 0.3)} y={200} size={110} fuente={FUENTE} />
      <PulmonesHumanos t={t} a={ev.aplastarian} b={ev.nitrogeno1 - 0.2} />
      <Etiqueta texto="pulmones llenos: se aplastan" rojo o={ventana(t, ev.unos - 0.1, ev.nitrogeno1 - 0.2, 0.3)} y={220} size={58} fuente={FUENTE} />
      <Etiqueta texto="nitrógeno a la sangre" rojo o={ventana(t, ev.nitrogeno1 - 0.2, ev.asi3, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Etiqueta texto="pulmones colapsados a propósito" o={ventana(t, ev.colapsen - 0.3, ev.costillas - 0.2, 0.3)} y={220} size={56} fuente={FUENTE} />
      <Etiqueta texto="costillas que se doblan" o={ventana(t, ev.costillas - 0.2, ev.sinAire - 0.2, 0.3)} y={220} size={60} fuente={FUENTE} />
      <Etiqueta texto="el nitrógeno no pasa" o={ventana(t, ev.sinAire - 0.2, ev.pero4, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Etiqueta texto="recargar de golpe" rojo o={ventana(t, ev.recargar - 0.4, ev.asi4, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Etiqueta texto="cambia casi todo el aire" o={ventana(t, ev.cambia - 0.3, ev.ese - 0.2, 0.3)} y={220} size={64} fuente={FUENTE} />
      <Titulo texto="tanque de oxígeno" o={ventana(t, ev.tanque2 - 0.3, 99, 0.3)} y={190} size={96} fuente={FUENTE} />
      <Titulo texto="corazón casi apagado" color="#d2443c" o={ventana(t, ev.corazonF - 0.3, 99, 0.3)} y={320} size={74} fuente={FUENTE} />
      <Barra t={t} />
      <Pulso t={t} />
      <Audio src={staticFile('cachalote/voz.wav')} />
      <Audio src={staticFile('cachalote/musica.wav')} />
    </AbsoluteFill>
  );
};
