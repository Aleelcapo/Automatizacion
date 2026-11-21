import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, cil, lerp, poseCamara, r, rnd, ventana} from './kit';
import {FUENTE} from '../serie/tema';

export const DURACION_PRUEBA_HIPO = 10;

/*
 Prueba 10 s — nicho "cuerpo humano": ¿por qué te da hipo?
 Torso en corte (mitad de enfrente quitada): pared con capas (piel, músculo),
 costillas, columna, pulmones, corazón, tráquea, diafragma, hígado, estómago,
 nervio frénico con pulso, glotis que se cierra -> ¡HIP!
*/

const ZS = 0.62; // aplastado del torso (elipse)
const perfilTorso: [number, number][] = [
  [1.02, -0.2],
  [1.0, 0.2],
  [0.93, 0.8],
  [0.98, 1.3],
  [1.1, 2.0],
  [1.2, 2.6],
  [1.24, 2.95],
  [1.12, 3.2],
  [0.75, 3.42],
  [0.42, 3.55],
  [0.38, 3.8],
  [0.37, 4.3],
];
const radioTorso = (y: number) => {
  for (let i = 0; i < perfilTorso.length - 1; i++) {
    const [r1, y1] = perfilTorso[i];
    const [r2, y2] = perfilTorso[i + 1];
    if (y >= y1 && y <= y2) return lerp(r1, r2, (y - y1) / (y2 - y1));
  }
  return perfilTorso[perfilTorso.length - 1][0];
};
const suavizar = (pts: [number, number][], n = 120) => {
  const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getSpacedPoints(n);
};

// mitad de atrás del torso (z<0): lathe con phi de pi/2 a 3pi/2
const torsoGeo = (k: number) => {
  const pts = suavizar(perfilTorso).map((v) => new THREE.Vector2(v.x * k, v.y));
  const g = new THREE.LatheGeometry(pts, 64, Math.PI / 2, Math.PI);
  g.scale(1, 1, ZS);
  g.computeVertexNormals();
  return g;
};
// tapa del corte (franja en el plano z=0) entre radio k1 y k2
const tapaGeo = (k1: number, k2: number) => {
  const pts = suavizar(perfilTorso, 80);
  const forma = (s: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(s * pts[0].x * k1, pts[0].y);
    for (const p of pts) sh.lineTo(s * p.x * k1, p.y);
    for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(s * pts[i].x * k2, pts[i].y);
    sh.closePath();
    return new THREE.ShapeGeometry(sh, 4);
  };
  return [forma(1), forma(-1)];
};

const Torso: React.FC<{sacudida: number}> = ({sacudida}) => {
  const afuera = G('torsoA', () => torsoGeo(1));
  const adentro = G('torsoB', () => torsoGeo(0.9));
  const piel = G('tapaPiel', () => {
    const [a, b] = tapaGeo(1, 0.965);
    return mergeDos(a, b);
  });
  const grasa = G('tapaGrasa', () => {
    const [a, b] = tapaGeo(0.965, 0.94);
    return mergeDos(a, b);
  });
  const musculo = G('tapaMusculo', () => {
    const [a, b] = tapaGeo(0.94, 0.9);
    return mergeDos(a, b);
  });
  return (
    <group position={[0, 0, 0]} scale={[1 + sacudida * 0.01, 1 - sacudida * 0.006, 1]}>
      <P geo={afuera} color="#f0c2a0" linea={0} silueta={2.4} />
      <P geo={adentro} color="#d9877c" doble linea={0} silueta={0} sombra={false} />
      <P geo={piel} color="#f3c9a8" doble linea={0} silueta={0} sombra={false} />
      <P geo={grasa} color="#f6e2a6" doble linea={0} silueta={0} sombra={false} />
      <P geo={musculo} color="#c4574d" doble linea={0} silueta={0} sombra={false} />
      <Contorno />
    </group>
  );
};

const mergeDos = (a: THREE.BufferGeometry, b: THREE.BufferGeometry) => {
  const pa = a.getAttribute('position').array as Float32Array;
  const pb = b.getAttribute('position').array as Float32Array;
  const ia = Array.from(a.getIndex()!.array);
  const ib = Array.from(b.getIndex()!.array).map((i) => i + pa.length / 3);
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(pa.length + pb.length);
  pos.set(pa, 0);
  pos.set(pb, pa.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex([...ia, ...ib]);
  g.computeVertexNormals();
  return g;
};

/** Línea de tinta en el borde del corte (perfil exterior e interior). */
const Contorno: React.FC = () => {
  const pts = useMemo(() => suavizar(perfilTorso, 80), []);
  const tubo = (k: number, s: number) =>
    G(`cont|${k}|${s}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(s * p.x * k, p.y, 0.002))), 160, 0.012, 6, false));
  return (
    <group>
      {[1, -1].map((s) =>
        [1, 0.9].map((k) => (
          <mesh key={`${s}${k}`} geometry={tubo(k, s)}>
            <meshBasicMaterial color="#1a1b22" />
          </mesh>
        )),
      )}
    </group>
  );
};

// ---------- huesos ----------
const Columna: React.FC = () => (
  <group>
    {Array.from({length: 20}, (_, i) => {
      const y = -0.1 + i * 0.19;
      const zc = -0.5 + Math.sin((y / 3.6) * Math.PI) * 0.06;
      return (
        <group key={i}>
          <P geo={G('vert', () => new THREE.CylinderGeometry(0.15, 0.16, 0.14, 18))} color="#eee3cc" position={[0, y, zc]} linea={1.1} silueta={1.6} />
          <P geo={caja(0.07, 0.1, 0.16)} color="#e6d9bd" position={[0, y - 0.02, zc - 0.17]} linea={1} silueta={1.4} />
          <P geo={cil(0.12, 0.12, 0.04, 16)} color="#c9b9e0" position={[0, y + 0.09, zc]} linea={0} silueta={1} />
        </group>
      );
    })}
  </group>
);

const costillaGeo = (y: number) =>
  G(`cost|${y}`, () => {
    const pts: THREE.Vector3[] = [];
    const rr = radioTorso(y) * 0.86;
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI / 2 + (i / 24) * (Math.PI / 2); // de lado (x) hacia atrás (-z)
      const x = Math.cos(a - Math.PI / 2) * rr;
      const z = -Math.sin(a - Math.PI / 2) * rr * ZS;
      pts.push(new THREE.Vector3(x, y + 0.22 * (1 - i / 24) - 0.22, z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 8, false);
  });

const Costillas: React.FC = () => (
  <group>
    {Array.from({length: 9}, (_, i) => {
      const y = 1.45 + i * 0.21;
      const rr = radioTorso(y) * 0.86;
      return [1, -1].map((s) => (
        <group key={`${i}${s}`}>
          <P geo={costillaGeo(y)} color="#efe6d2" scale={[s, 1, 1]} linea={0} silueta={1.4} />
          <mesh position={[s * rr, y, 0.003]}>
            <circleGeometry args={[0.046, 16]} />
            <meshBasicMaterial color="#f5eedd" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ));
    })}
  </group>
);

// ---------- órganos ----------
const pulmonGeo = () => {
  const perfil: [number, number][] = [
    [0.0, 0],
    [0.38, 0.04],
    [0.5, 0.3],
    [0.5, 0.75],
    [0.42, 1.1],
    [0.26, 1.35],
    [0.0, 1.45],
  ];
  const g = new THREE.LatheGeometry(suavizar(perfil, 40), 48);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    const y = p.getY(i);
    let z = p.getZ(i) * 0.78;
    if (x < 0) x *= 0.45; // cara interna aplanada
    // base cóncava (se apoya en el domo)
    const yb = y + (0.5 - Math.min(0.5, Math.hypot(x, z))) * 0.0;
    p.setXYZ(i, x * 0.92, yb, z);
  }
  g.computeVertexNormals();
  return g;
};

let _texPulmon: THREE.CanvasTexture | null = null;
const texPulmon = () => {
  if (_texPulmon) return _texPulmon;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(160,40,60,${0.08 + rnd(i) * 0.1})`;
    g.beginPath();
    g.arc(rnd(i + 1) * 256, rnd(i + 2) * 256, 2 + rnd(i + 3) * 5, 0, Math.PI * 2);
    g.fill();
  }
  _texPulmon = new THREE.CanvasTexture(cv);
  _texPulmon.wrapS = _texPulmon.wrapT = THREE.RepeatWrapping;
  _texPulmon.colorSpace = THREE.SRGBColorSpace;
  return _texPulmon;
};

const Pulmones: React.FC<{inflado: number; baseY: number}> = ({inflado, baseY}) => {
  const geo = G('pulmon', pulmonGeo);
  const alto = (2.95 - baseY) / 1.45;
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.52, baseY, -0.12]} scale={[s * (1 + inflado * 0.06), alto, 1 + inflado * 0.05]}>
          <P geo={geo} color="#ec9aa0" mapa={texPulmon()} linea={0} silueta={2} />
        </group>
      ))}
    </group>
  );
};

const Corazon: React.FC<{t: number}> = ({t}) => {
  const lat = 1 + 0.04 * Math.max(0, Math.sin(t * 7.5)) ** 4;
  return (
    <group position={[0.16, 1.78, 0.02]} rotation={[0.2, 0.3, -0.55]} scale={lat * 0.8}>
      <P geo={G('corazon', () => new THREE.SphereGeometry(0.36, 32, 22).scale(1, 1.25, 0.85))} color="#c8463d" silueta={2} linea={0} />
      <P geo={G('ventr', () => new THREE.SphereGeometry(0.22, 24, 16).scale(1, 1.1, 0.9))} color="#b63c35" position={[-0.18, 0.25, 0.05]} silueta={1.6} linea={0} />
      <Tubo pts={[[0.05, 0.35, 0], [0.12, 0.72, -0.05], [-0.1, 0.92, -0.1], [-0.34, 0.75, -0.18], [-0.38, 0.35, -0.2]]} r={0.09} color="#cf5245" />
      <Tubo pts={[[-0.12, 0.3, 0.05], [-0.3, 0.6, 0.05], [-0.55, 0.62, -0.05]]} r={0.075} color="#5b7cc4" />
    </group>
  );
};

const Tubo: React.FC<{pts: [number, number, number][]; r: number; color: string; seg?: number; silueta?: number}> = ({pts, r: rr, color, seg = 40, silueta = 1.6}) => {
  const geo = G(`tubo|${JSON.stringify(pts)}|${rr}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, rr, 12, false));
  return <P geo={geo} color={color} linea={0} silueta={silueta} />;
};

const Traquea: React.FC = () => (
  <group>
    <Tubo pts={[[0, 3.95, 0.05], [0, 3.4, 0.02], [0, 2.75, 0]]} r={0.1} color="#e9c9c0" />
    {Array.from({length: 11}, (_, i) => (
      <P key={i} geo={G('anillo', () => new THREE.TorusGeometry(0.105, 0.022, 8, 24).rotateX(Math.PI / 2))} color="#f3ead8" position={[0, 2.85 + i * 0.095, 0.01]} linea={0} silueta={1} />
    ))}
    {[1, -1].map((s) => (
      <Tubo key={s} pts={[[0, 2.78, 0], [s * 0.18, 2.6, -0.04], [s * 0.42, 2.38, -0.08]]} r={0.07} color="#e9c9c0" />
    ))}
  </group>
);

/** Glotis: dos cuerdas vocales que se cierran. */
const Glotis: React.FC<{cierre: number}> = ({cierre}) => (
  <group position={[0, 3.72, 0.06]} scale={1.5}>
    <P geo={G('laringe', () => new THREE.TorusGeometry(0.16, 0.05, 12, 32).rotateX(Math.PI / 2))} color="#ece2cf" />
    {[1, -1].map((s) => (
      <group key={s} position={[s * 0.15, 0, 0]} rotation={[0, 0, s * lerp(0.5, 0, cierre)]}>
        <P geo={caja(0.15, 0.03, 0.2)} color="#f4d9cf" position={[-s * 0.075, 0, 0]} />
      </group>
    ))}
  </group>
);

let _fibras: THREE.CanvasTexture | null = null;
const texFibras = () => {
  if (_fibras) return _fibras;
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 64;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 64; i++) {
    g.fillStyle = 'rgba(110,20,20,0.22)';
    g.fillRect(i * 8 + 2, 0, 2, 64);
  }
  _fibras = new THREE.CanvasTexture(cv);
  _fibras.colorSpace = THREE.SRGBColorSpace;
  return _fibras;
};

const domoGeo = (k: number) =>
  G(`domo|${k}`, () => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      pts.push(new THREE.Vector2(u * 0.9, (1 - u * u) * k));
    }
    const g = new THREE.LatheGeometry(pts, 64, Math.PI / 2, Math.PI);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setY(i, y * (1 - 0.42 * Math.exp(-((x / 0.22) ** 2))));
    }
    g.scale(1, 1, ZS * 1.02);
    g.computeVertexNormals();
    return g;
  });

const Diafragma: React.FC<{y: number; alto: number}> = ({y, alto}) => {
  const k = Math.round(alto * 100) / 100;
  const borde = G(`domoBorde|${k}`, () => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = -0.9 + (i / 60) * 1.8;
      const u = Math.abs(x) / 0.9;
      pts.push(new THREE.Vector3(x, (1 - u * u) * k * (1 - 0.42 * Math.exp(-((x / 0.22) ** 2))), 0.004));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 6, false);
  });
  return (
    <group position={[0, y, 0]}>
      <P geo={domoGeo(k)} color="#c9554c" mapa={texFibras()} doble linea={0} silueta={0} sombra={false} />
      <mesh geometry={borde}>
        <meshBasicMaterial color="#1a1b22" />
      </mesh>
    </group>
  );
};

const Abdomen: React.FC<{y: number}> = ({y}) => (
  <group position={[0, y, 0]}>
    <P geo={G('higado', () => new THREE.SphereGeometry(0.55, 32, 20).scale(1.15, 0.55, 0.75))} color="#9c4637" position={[-0.38, -0.25, 0]} rotation={[0, 0, 0.18]} linea={0} />
    <P geo={G('estomago', () => new THREE.SphereGeometry(0.4, 32, 20).scale(0.9, 0.75, 0.7))} color="#e6a48f" position={[0.45, -0.3, 0.05]} rotation={[0, 0, -0.5]} linea={0} />
    {Array.from({length: 11}, (_, i) => (
      <P key={i} geo={G('intest', () => new THREE.CapsuleGeometry(0.11, 0.22, 6, 14))} color={i % 2 ? '#e9b2a0' : '#f0bfae'} position={[-0.55 + (i % 4) * 0.36 + (Math.floor(i / 4) % 2) * 0.15, -0.9 - Math.floor(i / 4) * 0.22, -0.1 + rnd(i) * 0.15]} rotation={[0, 0, (rnd(i + 3) - 0.5) * 3]} linea={0} silueta={1.6} />
    ))}
  </group>
);

/** Nervio frénico (amarillo) con pulso eléctrico. */
const ptsNervio = (s: number): [number, number, number][] => [
  [s * 0.22, 4.1, 0.12],
  [s * 0.3, 3.5, 0.2],
  [s * 0.5, 2.7, 0.3],
  [s * 0.6, 2.0, 0.32],
  [s * 0.55, 1.4, 0.2],
];
const Nervio: React.FC<{pulso: number; brillo: number; diafY: number}> = ({pulso, brillo, diafY}) => {
  const curvas = useMemo(() => [1, -1].map((s) => new THREE.CatmullRomCurve3(ptsNervio(s).map((p) => new THREE.Vector3(...p)))), []);
  return (
    <group>
      {[1, -1].map((s, i) => {
        const pts = ptsNervio(s);
        pts[pts.length - 1] = [s * 0.55, diafY + 0.32, 0.2];
        const p = curvas[i].getPointAt(Math.min(1, Math.max(0, pulso)));
        return (
          <group key={s}>
            <Tubo pts={pts} r={0.028} color={brillo > 0.5 ? '#ffe45c' : '#f2c94c'} silueta={1.2} />
            {pulso > 0 && pulso < 1.02 && (
              <group position={p.toArray() as [number, number, number]}>
                <mesh>
                  <sphereGeometry args={[0.07, 16, 12]} />
                  <meshBasicMaterial color="#fffbe0" />
                </mesh>
                <sprite scale={[0.55, 0.55, 1]}>
                  <spriteMaterial map={texBrillo()} transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#ffe066" />
                </sprite>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};
let _brillo: THREE.CanvasTexture | null = null;
const texBrillo = () => {
  if (_brillo) return _brillo;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,240,150,0.6)');
  gr.addColorStop(1, 'rgba(255,220,80,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  _brillo = new THREE.CanvasTexture(cv);
  return _brillo;
};

/** Aire entrando por la tráquea. */
const Aire: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t > b + 0.6) return null;
  const freno = t > b ? Math.max(0, 1 - (t - b) / 0.6) : 1;
  return (
    <group>
      {Array.from({length: 16}, (_, i) => {
        const fase = ((t - a) * 1.6 + i / 16) % 1;
        const y = lerp(4.6, 2.5, t > b ? Math.min(fase, 0.9) : fase);
        return (
          <mesh key={i} position={[Math.sin(i * 2.3) * 0.05, y, 0.03 + Math.cos(i * 1.7) * 0.04]} scale={freno}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshBasicMaterial color="#e8f6ff" />
          </mesh>
        );
      })}
    </group>
  );
};

const Fondo: React.FC = () => (
  <group>
    <mesh position={[0, 2, -3]} receiveShadow>
      <planeGeometry args={[40, 30]} />
      <meshToonMaterial color="#e9e3d8" />
    </mesh>
    <mesh position={[0, 2, -2.99]} receiveShadow>
      <planeGeometry args={[40, 30]} />
      <shadowMaterial color="#2c3fa3" opacity={0.78} />
    </mesh>
    <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 10]} />
      <meshToonMaterial color="#ddd5c7" />
    </mesh>
    <mesh position={[0, -0.59, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 10]} />
      <shadowMaterial color="#2c3fa3" opacity={0.78} />
    </mesh>
  </group>
);

// ---------- tiempos ----------
const EV = {pulso: 2.8, contrae: 5.0, hip1: 7.55, hip2: 9.25};

const POSES: Pose[] = [
  [0, [4.6, 3.0, 8.6], [0, 1.9, 0], 32],
  [0.01, [4.6, 3.0, 8.6], [0, 1.9, 0], 32],
  [0.2, [3.9, 2.8, 7.8], [0, 1.9, 0], 32],
  [2.6, [3.2, 2.9, 6.2], [0.2, 2.4, 0], 34],
  [4.7, [3.0, 2.0, 5.4], [0.05, 1.3, 0], 36],
  [5.95, [0.9, 5.0, 2.3], [0, 3.72, 0], 34],
  [8.5, [4.0, 2.9, 7.8], [0, 2.0, 0], 32],
];

const diafragma = (t: number) => {
  // contracción brusca en cada hipo
  const golpe = (h: number) => (t < h - 0.4 ? 0 : t < h ? r(t, h - 0.4, 0.12) : 1 - r(t, h + 0.15, 0.9));
  const c = Math.max(golpe(EV.hip1), golpe(EV.hip2) * 0.9, t > EV.contrae && t < EV.hip1 - 0.4 ? r(t, EV.contrae, 0.5) * 0.15 : 0);
  return {y: lerp(0.92, 0.62, c), alto: lerp(0.5, 0.2, c), c};
};

const Escena: React.FC<{t: number}> = ({t}) => {
  const {pos, obj, fov} = poseCamara(t, POSES, 1.6);
  const d = diafragma(t);
  const sac = (h: number) => (t > h && t < h + 0.35 ? Math.sin(((t - h) / 0.35) * Math.PI) : 0);
  const s = Math.max(sac(EV.hip1), sac(EV.hip2) * 0.8);
  pos.y += s * 0.05;
  const cierre = Math.max(r(t, EV.hip1 - 0.05, 0.06) * (1 - r(t, EV.hip1 + 0.5, 0.4)), r(t, EV.hip2 - 0.05, 0.06) * (1 - r(t, EV.hip2 + 0.5, 0.3)));
  const pulso = (h: number) => (t - (h - 0.6)) / 0.5;
  const p1 = t < EV.contrae ? (t - EV.pulso) / 1.6 : t < EV.hip2 - 0.7 ? pulso(EV.hip1) : pulso(EV.hip2);
  return (
    <>
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[0.55, 0.85, 0.75]} area={6} centro={[0, 1.8, 0]} amb={1.0} sol={0.6} />
      <Fondo />
      <group position={[0, s * 0.04, 0]}>
        <Torso sacudida={s} />
        <Columna />
        <Costillas />
        <Abdomen y={d.y} />
        <Diafragma y={d.y} alto={d.alto} />
        <Pulmones inflado={d.c} baseY={d.y + d.alto * 0.7} />
        <Corazon t={t} />
        <Traquea />
        <Glotis cierre={cierre} />
        <Nervio pulso={p1} brillo={ventana(t, EV.pulso, EV.contrae + 0.3, 0.3)} diafY={d.y + d.alto * 0.5} />
        <Aire t={t} a={EV.hip1 - 0.4} b={EV.hip1} />
      </group>
    </>
  );
};

const Hip: React.FC<{t: number; h: number; size: number}> = ({t, h, size}) => {
  const k = (t - h) / 0.7;
  if (k < 0 || k > 1) return null;
  const pop = k < 0.2 ? k / 0.2 : 1;
  const o = 1 - r(k, 0.7, 0.3);
  return (
    <div style={{position: 'absolute', top: 760, left: 0, right: 0, textAlign: 'center', opacity: o}}>
      <svg width={700} height={400} viewBox="-350 -200 700 400" style={{position: 'absolute', left: 190, top: -130, opacity: 0.9}}>
        {Array.from({length: 14}, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const r1 = 150 * pop;
          const r2 = (230 + (i % 2) * 50) * pop;
          return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1 * 0.6} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2 * 0.6} stroke="#16171c" strokeWidth={9} strokeLinecap="round" />;
        })}
      </svg>
      <div
        style={{
          fontFamily: FUENTE,
          fontWeight: 900,
          fontSize: size,
          color: '#e0453a',
          WebkitTextStroke: '16px #fff',
          paintOrder: 'stroke fill',
          transform: `scale(${0.4 + 0.6 * pop}) rotate(-6deg)`,
          position: 'relative',
        }}
      >
        ¡HIP!
      </div>
    </div>
  );
};

export const PruebaHipo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: '#e9e3d8'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 32, near: 0.05, far: 100, position: [2.6, 2.7, 9.4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel />
      <Titulo texto="¿por qué da hipo?" o={ventana(t, 0.3, 2.6, 0.4)} y={200} size={104} fuente={FUENTE} />
      <Titulo texto="nervio frénico" o={ventana(t, 2.8, 4.8, 0.35)} y={200} size={104} fuente={FUENTE} />
      <Titulo texto="se irrita y manda un pulso" o={ventana(t, 3.2, 4.8, 0.35)} y={340} size={54} fuente={FUENTE} />
      <Titulo texto="diafragma" o={ventana(t, 5.0, 6.7, 0.35)} y={200} size={104} fuente={FUENTE} />
      <Titulo texto="jala aire de golpe" o={ventana(t, 5.3, 6.7, 0.35)} y={340} size={54} fuente={FUENTE} />
      <Titulo texto="35 ms después" o={ventana(t, 6.8, 9.0, 0.3)} y={200} size={104} fuente={FUENTE} />
      <Titulo texto="la glotis se cierra" o={ventana(t, 6.9, 9.0, 0.3)} y={340} size={54} fuente={FUENTE} />
      <Hip t={t} h={EV.hip1} size={210} />
      <Hip t={t} h={EV.hip2} size={170} />
      <Audio src={staticFile('prueba-hipo/audio.wav')} />
    </AbsoluteFill>
  );
};


