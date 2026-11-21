import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {
  AZUL_SOMBRA,
  Camara,
  G,
  Luces,
  P,
  Papel,
  Pose,
  SombraAzul,
  Titulo,
  caja,
  canvasTex,
  cil,
  esf,
  gradiente,
  lerp,
  matLinea,
  poseCamara,
  r,
  rnd,
  texNube,
  useRes,
  ventana,
} from './kit';
import {FUENTE} from '../serie/tema';

export const DURACION_PRUEBA_BARCO = 10;

/*
 Prueba 10 s — nicho "máquinas gigantes".
 Barco portacontenedores (1 unidad = 10 m): 40 de largo, 6 de manga, calado 1.5.
 Toma 1: aérea siguiendo el barco + "400 000 t".
 Toma 2: el mar se corta y se ve el casco bajo el agua + empuje.
*/

const L = 20; // medio largo
const B = 3; // media manga
const D = 1.45; // cubierta
const K = -1.5; // quilla

// ---------- casco ----------
const proaX = (y: number) => 18.6 + 1.1 * ((y - K) / (D - K)) + 0.9 * Math.exp(-(((y + 1.05) / 0.32) ** 2));
const anchoCasco = (x: number, y: number) => {
  const h = (y - K) / (D - K); // 0 quilla .. 1 cubierta
  let g = 1;
  const xb = 7;
  const xs = proaX(y);
  if (x > xb) {
    const u = Math.min(1, (x - xb) / (xs - xb));
    g = Math.sqrt(Math.max(0, 1 - u ** (1.8 + 1.4 * h)));
    // bulbo: más lleno abajo cerca de la proa
    const bulbo = Math.exp(-(((y + 1.05) / 0.3) ** 2)) * Math.exp(-(((x - xs + 0.5) / 0.6) ** 2)) * 0.12;
    g = Math.max(g, bulbo / B);
  }
  if (x < -12) {
    const u = (-12 - x) / (L - 12);
    g = 1 - u * u * (0.12 + 0.75 * (1 - h) ** 1.5);
  }
  return B * g;
};

const cascoGeo = () => {
  const N = 140;
  // perfil normalizado (zn, y): de babor-cubierta a estribor-cubierta
  const rb = 0.55;
  const perfil: [number, number][] = [];
  const lado: [number, number][] = [];
  for (let i = 0; i <= 10; i++) lado.push([-1, D - (D - (K + rb)) * (i / 10)]);
  for (let i = 1; i <= 8; i++) {
    const a = Math.PI + (i / 8) * (Math.PI / 2);
    lado.push([-1 + (rb / B) * (1 + Math.cos(a)), K + rb + rb * Math.sin(a)]);
  }
  for (let i = 1; i < 10; i++) lado.push([-1 + rb / B + (i / 10) * (1 - rb / B), K]);
  perfil.push(...lado, [0, K], ...lado.slice().reverse().map(([z, y]) => [-z, y] as [number, number]));
  const M = perfil.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const xs: number[] = [];
  for (let i = 0; i <= N; i++) xs.push(-L + (i / N) * (2 * L - 0.01));
  const vert = (x: number, zn: number, y: number) => {
    const xv = Math.min(x, proaX(y));
    pos.push(xv, y, zn * anchoCasco(xv, y));
  };
  for (const x of xs) for (const [zn, y] of perfil) vert(x, zn, y);
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j;
      const b = (i + 1) * M + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // cubierta
  const base = pos.length / 3;
  for (const x of xs) {
    const xv = Math.min(x, proaX(D));
    const w = anchoCasco(xv, D);
    pos.push(xv, D, -w, xv, D, w);
  }
  for (let i = 0; i < N; i++) {
    const a = base + i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  // espejo de popa
  const c = pos.length / 3;
  pos.push(-L, (D + K) / 2 + 0.3, 0);
  for (let j = 0; j < M; j++) {
    const [zn, y] = perfil[j];
    pos.push(-L, y, zn * anchoCasco(-L, y));
  }
  for (let j = 0; j < M - 1; j++) idx.push(c, c + 2 + j, c + 1 + j);
  idx.push(c, c + 1, c + M);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

/** Material del casco: rojo bajo el agua, franja negra, azul marino arriba, filete blanco. */
let _matCasco: THREE.MeshToonMaterial | null = null;
const matCasco = () => {
  if (_matCasco) return _matCasco;
  const m = new THREE.MeshToonMaterial({color: '#ffffff', gradientMap: gradiente(), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide});
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vY;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec3 cc = vec3(0.17,0.21,0.30);
         if (vY < 0.02) cc = vec3(0.66,0.24,0.20);
         else if (vY < 0.14) cc = vec3(0.10,0.10,0.12);
         else if (vY > 1.30 && vY < 1.37) cc = vec3(0.93,0.93,0.90);
         vec4 diffuseColor = vec4( cc, opacity );`,
      );
  };
  _matCasco = m;
  return m;
};

const Casco: React.FC = () => {
  const geo = G('casco', cascoGeo);
  const [w, h] = useRes();
  const lineas = useMemo(() => {
    const l = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, 35)), matLinea(1.6, w, h));
    l.frustumCulled = false;
    return l;
  }, [geo, w, h]);
  return (
    <group>
      <mesh geometry={geo} material={matCasco()} castShadow />
      <primitive object={lineas} />
    </group>
  );
};

// ---------- contenedores (instanciados) ----------
const COLORES = ['#d9823b', '#3f6fb8', '#3b9c8f', '#e2b13c', '#b9473a', '#8f99a6', '#5b8f4e', '#e7e2d6', '#2f4c80', '#c86a2f', '#6e4a8f', '#d0d4d8'];
let _ondulado: THREE.CanvasTexture | null = null;
const texOndulado = () => {
  if (_ondulado) return _ondulado;
  _ondulado = canvasTex(256, 64, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 32; i++) {
      g.fillStyle = 'rgba(0,0,0,0.13)';
      g.fillRect(i * 8 + 4, 0, 3, 64);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(i * 8 + 1, 0, 1.5, 64);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, 256, 3);
    g.fillRect(0, 61, 256, 3);
  });
  return _ondulado;
};

type Cont = {x: number; y: number; z: number; c: string};
const listaContenedores = (): Cont[] => {
  const out: Cont[] = [];
  const cl = 1.22;
  const ch = 0.26;
  const cw = 0.244;
  let id = 0;
  for (let bx = -10.6; bx < 14.6; bx += 1.3) {
    if (Math.abs(bx - 1.3) < 0.2) continue; // hueco de trinca
    const w = anchoCasco(bx + cl / 2 + 0.3, D) * 0.94;
    const filas = Math.floor((2 * w) / (cw + 0.012));
    const proa = bx > 9 ? Math.round((bx - 9) * 0.9) : 0;
    for (let f = 0; f < filas; f++) {
      const z = -((filas - 1) * (cw + 0.012)) / 2 + f * (cw + 0.012);
      const n = 6 + Math.floor(rnd(id * 3.1 + f) * 3) - proa - (Math.abs(z) > w - 0.4 ? 1 : 0);
      for (let k = 0; k < Math.max(1, n); k++) {
        const cc = COLORES[Math.floor(rnd(id * 7.7 + k * 1.3 + f * 0.37) * COLORES.length)];
        out.push({x: bx + cl / 2, y: D + 0.06 + ch / 2 + k * (ch + 0.004), z, c: cc});
        id++;
      }
      id++;
    }
  }
  return out;
};

const Contenedores: React.FC = () => {
  const [w, h] = useRes();
  const {malla, lineas} = useMemo(() => {
    const lista = listaContenedores();
    const geo = new THREE.BoxGeometry(1.22, 0.26, 0.244);
    const mat = new THREE.MeshToonMaterial({color: '#ffffff', map: texOndulado(), gradientMap: gradiente(), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1});
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const segs: number[] = [];
    const hx = 0.61;
    const hy = 0.13;
    const hz = 0.122;
    lista.forEach((c, i) => {
      o.position.set(c.x, c.y, c.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(c.c));
      const v = (sx: number, sy: number, sz: number) => [c.x + sx * hx, c.y + sy * hy, c.z + sz * hz];
      const e: [number[], number[]][] = [];
      for (const sy of [-1, 1]) for (const sz of [-1, 1]) e.push([v(-1, sy, sz), v(1, sy, sz)]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) e.push([v(sx, -1, sz), v(sx, 1, sz)]);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) e.push([v(sx, sy, -1), v(sx, sy, 1)]);
      for (const [a, b] of e) segs.push(...a, ...b);
    });
    m.castShadow = true;
    m.frustumCulled = false;
    const lg = new LineSegmentsGeometry().setPositions(segs);
    const l = new LineSegments2(lg, matLinea(1.15, w, h));
    l.frustumCulled = false;
    return {malla: m, lineas: l};
  }, [w, h]);
  return (
    <group>
      <primitive object={malla} />
      <primitive object={lineas} />
    </group>
  );
};

// ---------- superestructura y detalles ----------
let _ventanas: THREE.CanvasTexture | null = null;
const texVentanas = () => {
  if (_ventanas) return _ventanas;
  _ventanas = canvasTex(256, 256, (g) => {
    g.fillStyle = '#f2f0ea';
    g.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 6; row++) {
      for (let c = 0; c < 10; c++) {
        g.fillStyle = '#3a4656';
        g.fillRect(c * 25 + 6, row * 42 + 16, 14, 12);
      }
    }
  });
  return _ventanas;
};

const Puente: React.FC = () => {
  const x0 = -14.2;
  return (
    <group>
      {/* bloque de alojamiento */}
      <P geo={caja(2.2, 2.1, 4.4)} color="#ffffff" mapa={texVentanas()} position={[x0, D + 1.05, 0]} />
      <P geo={caja(2.0, 0.42, 4.0)} color="#f2f0ea" position={[x0, D + 2.31, 0]} />
      {/* puente de mando con alas */}
      <P geo={caja(1.6, 0.42, 7.4)} color="#f2f0ea" position={[x0 + 0.1, D + 2.73, 0]} />
      <P geo={caja(0.06, 0.14, 7.0)} color="#2d3644" position={[x0 + 0.91, D + 2.76, 0]} linea={0.8} silueta={0} />
      <P geo={caja(1.7, 0.06, 7.6)} color="#d8d6cf" position={[x0 + 0.1, D + 2.97, 0]} />
      {/* mástil y radar */}
      <P geo={cil(0.05, 0.06, 0.9, 10)} color="#e9e7e0" position={[x0 - 0.1, D + 3.42, 0]} />
      <P geo={caja(0.08, 0.05, 0.9)} color="#e9e7e0" position={[x0 - 0.1, D + 3.6, 0]} />
      <P geo={caja(0.6, 0.04, 0.08)} color="#2d3644" position={[x0 - 0.1, D + 3.8, 0]} />
      {/* botes salvavidas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[x0 - 0.2, D + 1.35, s * 2.45]}>
          <P geo={G('bote', () => new THREE.CapsuleGeometry(0.17, 0.75, 6, 16).rotateZ(Math.PI / 2))} color="#f07a2a" />
          <P geo={caja(0.95, 0.05, 0.05)} color="#e8e6df" position={[0, 0.25, 0]} />
        </group>
      ))}
      {/* chimenea */}
      <group position={[-16.6, D, 0]}>
        <P geo={caja(1.4, 2.6, 1.7)} color="#f2f0ea" position={[0, 1.3, 0]} />
        <P geo={caja(1.42, 0.35, 1.72)} color="#2f5aa8" position={[0, 2.25, 0]} />
        <P geo={caja(1.42, 0.22, 1.72)} color="#1f2229" position={[0, 2.71, 0]} />
        {[-0.35, 0.35].map((z) => (
          <P key={z} geo={cil(0.13, 0.13, 0.45, 14)} color="#2a2c33" position={[-0.1, 2.98, z]} />
        ))}
      </group>
      {/* casa de popa / grúa de provisiones */}
      <P geo={caja(1.6, 0.5, 4.0)} color="#e9e7e0" position={[-18.6, D + 0.25, 0]} />
      <P geo={cil(0.08, 0.08, 0.9, 10)} color="#e7b43c" position={[-15.8, D + 0.45, 2.3]} />
    </group>
  );
};

const Proa: React.FC = () => (
  <group>
    {/* castillo de proa */}
    <P geo={caja(2.2, 0.35, 3.2)} color="#c8463a" position={[18.0, D + 0.175, 0]} />
    <P geo={caja(0.18, 0.9, 3.3)} color="#e9e7e0" position={[16.4, D + 0.45, 0]} />
    {[-0.9, 0.9].map((z) => (
      <group key={z}>
        <P geo={cil(0.22, 0.22, 0.25, 18)} color="#3a3f4a" position={[17.4, D + 0.48, z]} />
        <P geo={cil(0.08, 0.08, 0.18, 10)} color="#e7b43c" position={[18.6, D + 0.44, z * 0.7]} />
        <P geo={cil(0.08, 0.08, 0.18, 10)} color="#e7b43c" position={[18.9, D + 0.44, z * 0.5]} />
      </group>
    ))}
    {/* anclas */}
    {[-1, 1].map((s) => (
      <P key={s} geo={caja(0.36, 0.3, 0.06)} color="#22252c" position={[17.8, 0.95, s * anchoCasco(17.8, 0.95) + s * 0.01]} />
    ))}
  </group>
);

// ---------- mar ----------
let _olas: THREE.CanvasTexture | null = null;
const texOlas = () => {
  if (_olas) return _olas;
  _olas = canvasTex(
    1024,
    1024,
    (g) => {
      g.fillStyle = '#6e9ccb';
      g.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 900; i++) {
        const x = rnd(i) * 1024;
        const y = rnd(i + 999) * 1024;
        const l = 14 + rnd(i + 3) * 40;
        g.strokeStyle = rnd(i + 7) > 0.55 ? 'rgba(255,255,255,0.32)' : 'rgba(40,70,130,0.18)';
        g.lineWidth = 1.5 + rnd(i + 5) * 2;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + l / 2, y - 4, x + l, y);
        g.stroke();
      }
    },
    [14, 14],
  );
  return _olas;
};

let _espuma: THREE.CanvasTexture | null = null;
const texEspuma = () => {
  if (_espuma) return _espuma;
  _espuma = canvasTex(256, 1024, (g) => {
    g.clearRect(0, 0, 256, 1024);
    for (let i = 0; i < 700; i++) {
      const y = rnd(i) * 1024;
      const spread = 30 + (y / 1024) * 110;
      const x = 128 + (rnd(i + 77) - 0.5) * 2 * spread;
      const a = 0.85 * (1 - y / 1024) ** 1.2;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath();
      g.ellipse(x, y, 3 + rnd(i + 5) * 9, 1.5 + rnd(i + 6) * 3, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  _espuma.wrapS = THREE.ClampToEdgeWrapping;
  _espuma.wrapT = THREE.RepeatWrapping;
  return _espuma;
};

const Mar: React.FC<{t: number; corteZ: number}> = ({t, corteZ}) => {
  const olas = texOlas();
  olas.offset.set(t * 0.035, 0);
  const prof = 260;
  const zMin = -200;
  const ancho = 420;
  const largoZ = corteZ - zMin;
  return (
    <group>
      <mesh position={[0, -0.001, zMin + largoZ / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ancho, largoZ]} />
        <meshBasicMaterial map={olas} />
      </mesh>
      <mesh position={[0, 0.004, zMin + largoZ / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ancho, largoZ]} />
        <shadowMaterial color="#1e2f86" opacity={0.75} />
      </mesh>
      {corteZ < 150 && (
        <group>
          {/* cara del corte: agua vista de lado */}
          <mesh position={[0, -prof / 2, corteZ]}>
            <planeGeometry args={[ancho, prof]} />
            <meshBasicMaterial map={texCorteAgua()} transparent opacity={0.34} depthWrite={false} fog={false} />
          </mesh>
          <mesh position={[0, -prof / 2 - 0.05, -40]}>
            <planeGeometry args={[ancho, prof]} />
            <meshBasicMaterial map={texCorteAgua()} fog={false} />
          </mesh>
          <mesh position={[0, -0.02, corteZ + 0.01]}>
            <planeGeometry args={[ancho, 0.06]} />
            <meshBasicMaterial color="#1a1b22" />
          </mesh>
        </group>
      )}
    </group>
  );
};

let _corte: THREE.CanvasTexture | null = null;
const texCorteAgua = () => {
  if (_corte) return _corte;
  _corte = canvasTex(64, 1024, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, '#7fb2de');
    gr.addColorStop(0.015, '#5f97cf');
    gr.addColorStop(0.06, '#3d6fae');
    gr.addColorStop(0.3, '#23447f');
    gr.addColorStop(1, '#14264d');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 1024);
  });
  _corte.wrapS = _corte.wrapT = THREE.ClampToEdgeWrapping;
  return _corte;
};

const Estela: React.FC<{t: number}> = ({t}) => {
  const tex = texEspuma();
  tex.offset.set(0, -t * 0.25);
  return (
    <group>
      {/* estela de popa */}
      <mesh position={[-L - 22, 0.01, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[11, 46]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
      {/* bigotes de proa */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[13, 0.012, s * 4.6]} rotation={[-Math.PI / 2, 0, Math.PI / 2 + s * 0.2]}>
          <planeGeometry args={[2.4, 16]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- cielo y lejanía ----------
const Cielo: React.FC = () => {
  const tex = useMemo(
    () =>
      canvasTex(16, 512, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 512);
        gr.addColorStop(0, '#8fb7de');
        gr.addColorStop(0.42, '#cfe0ee');
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
      <sphereGeometry args={[480, 32, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
};

const Nubes: React.FC = () => {
  const lista = useMemo(
    () =>
      Array.from({length: 16}, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + rnd(i) * 0.3;
        const d = 170 + rnd(i + 4) * 80;
        return {p: [Math.cos(a) * d, 14 + rnd(i + 8) * 30, Math.sin(a) * d] as [number, number, number], s: 50 + rnd(i + 2) * 50};
      }),
    [],
  );
  return (
    <group>
      {lista.map((n, i) => (
        <sprite key={i} position={n.p} scale={[n.s, n.s * 0.42, 1]}>
          <spriteMaterial map={texNube()} transparent depthWrite={false} opacity={0.9} fog={false} />
        </sprite>
      ))}
    </group>
  );
};

const Islas: React.FC = () => {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 7, 1);
    return g;
  }, []);
  const lista: [number, number, number, number][] = [
    [-120, -170, 40, 9],
    [-80, -185, 28, 6],
    [90, -190, 55, 11],
    [140, -150, 30, 7],
  ];
  return (
    <group>
      {lista.map(([x, z, s, hgt], i) => (
        <mesh key={i} geometry={geo} position={[x, hgt / 2 - 0.5, z]} scale={[s, hgt, s * 0.5]}>
          <meshToonMaterial color="#9fb3a5" gradientMap={gradiente()} />
        </mesh>
      ))}
    </group>
  );
};

const Niebla: React.FC = () => {
  const scene = useThree((s) => s.scene);
  if (!scene.fog) scene.fog = new THREE.Fog('#e9eff1', 90, 300);
  return null;
};

// ---------- flechas de empuje ----------
const Flecha: React.FC<{position: [number, number, number]; largo: number; o: number; color?: string}> = ({position, largo, o, color = '#f4c430'}) => {
  if (o <= 0.01) return null;
  return (
    <group position={position} scale={[1, o, 1]}>
      <P geo={cil(0.16, 0.16, largo, 14)} color={color} position={[0, largo / 2, 0]} sombra={false} />
      <P geo={G('punta', () => new THREE.ConeGeometry(0.42, 0.7, 18))} color={color} position={[0, largo + 0.35, 0]} sombra={false} />
    </group>
  );
};

const Regla: React.FC<{o: number}> = ({o}) => {
  if (o <= 0.01) return null;
  const x = 12.2;
  const z = anchoCasco(12.2, -0.7) + 0.35;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, -0.75 * o, 0]}>
        <boxGeometry args={[0.07, 1.5 * o, 0.07]} />
        <meshBasicMaterial color="#16171c" fog={false} />
      </mesh>
      {[0, -1.5 * o].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.55, 0.07, 0.07]} />
          <meshBasicMaterial color="#16171c" fog={false} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- escena ----------
const POSES: Pose[] = [
  [0, [60, 36, 34], [0, 0.5, 0], 32],
  [0.01, [60, 36, 34], [0, 0.5, 0], 32],
  [0.6, [44, 21, 32], [2, 1.2, 0], 32],
  [4.6, [20, 0.5, 27], [15.5, -1.4, 0], 36],
  [8.0, [19.5, 0.45, 24.5], [15.5, -1.5, 0], 37],
];
export const camBarco = (t: number) => poseCamara(t, POSES, 3.6);

const Escena: React.FC<{t: number}> = ({t}) => {
  const {pos, obj, fov} = camBarco(t);
  // el mar se "corta" al pasar a la toma lateral
  const corte = r(t, 4.9, 1.2);
  const corteZ = lerp(220, 5.2, corte);
  const vaiven = Math.sin(t * 1.3) * 0.04;
  return (
    <>
      <Niebla />
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[0.35, 1, -0.7]} area={28} centro={[0, 0, 0]} amb={1.0} sol={0.7} />
      <Cielo />
      <Nubes />
      <Islas />
      <Mar t={t} corteZ={corteZ} />
      <group position={[0, vaiven, 0]} rotation={[0, 0, Math.sin(t * 0.9) * 0.004]}>
        <Casco />
        <Contenedores />
        <Puente />
        <Proa />
      </group>
      <Estela t={t} />
      {[10, 12.4, 14.8, 17.2].map((x, i) => (
        <Flecha key={x} position={[x, -5.4, 1.6]} largo={3.1} o={r(t, 7.4 + i * 0.15, 0.6) * (0.85 + 0.15 * Math.sin(t * 5 + i))} />
      ))}
      <Regla o={r(t, 6.0, 0.5)} />
    </>
  );
};

// ---------- capa 2D ----------
const contar = (t: number, a: number, b: number, hasta: number) => Math.round(hasta * r(t, a, b - a));
const fmt = (n: number) => n.toLocaleString('es-MX').replace(/,/g, ' ');

const Cota: React.FC<{t: number}> = ({t}) => {
  // medida tipo regla: calado bajo el agua (toma 2)
  const o = ventana(t, 6.3, 10.5, 0.5);
  if (o <= 0) return null;
  const {pos, obj, fov} = camBarco(t);
  const cam = new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.3, 1200);
  cam.position.copy(pos);
  cam.lookAt(obj);
  cam.updateMatrixWorld();
  const p = new THREE.Vector3(12.2, -0.75, anchoCasco(12.2, -0.7) + 0.35).project(cam);
  const px = ((p.x + 1) / 2) * 1080;
  const py = ((1 - p.y) / 2) * 1920;
  return (
    <div style={{position: 'absolute', left: px + 30, top: py - 30, opacity: o, fontFamily: FUENTE}}>
      <div style={{fontSize: 44, fontWeight: 800, color: '#16171c', whiteSpace: 'nowrap', WebkitTextStroke: '9px #fff', paintOrder: 'stroke fill'}}>
        15 m bajo el agua
      </div>
    </div>
  );
};

export const PruebaBarco: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const o1 = ventana(t, 0.4, 4.8, 0.45);
  const o2 = ventana(t, 6.4, 11, 0.45);
  const o3 = ventana(t, 7.2, 11, 0.45);
  return (
    <AbsoluteFill style={{background: '#eef2f2'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 34, near: 0.3, far: 1200, position: [34, 24, 40]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel />
      <Titulo texto={`${fmt(contar(t, 0.5, 2.6, 400000))} t`} o={o1} y={210} size={150} fuente={FUENTE} />
      <Titulo texto="de acero y carga" o={ventana(t, 1.6, 4.8, 0.4)} y={400} size={58} fuente={FUENTE} />
      <Titulo texto="empuje del agua" o={o2} y={210} size={104} color="#16171c" fuente={FUENTE} />
      <Titulo texto="= peso que aparta" o={o3} y={350} size={64} fuente={FUENTE} />
      <Cota t={t} />
      <Audio src={staticFile('prueba-barco/audio.wav')} />
    </AbsoluteFill>
  );
};
