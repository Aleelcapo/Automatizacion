import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

/*
 Kit "ilustración 3D" (versión 2, más calidad):
 - Color casi plano con 2 tonos suaves (luz / media sombra), sin brillos.
 - Tinta fina en TODAS las aristas (bordes duros) + silueta de grosor constante en pantalla.
 - Sombras proyectadas duras de color azul ultramar sobre el piso/agua.
 - Grano de papel + manchas de acuarela encima (capa Papel).
*/

export const TINTA = '#1a1b22';
export const AZUL_SOMBRA = '#2c3fa3';

// ---------- utilidades de tiempo ----------
export const cl = (x: number) => Math.max(0, Math.min(1, x));
export const suave = (x: number) => {
  const k = cl(x);
  return k * k * (3 - 2 * k);
};
export const r = (t: number, a: number, dur: number) => suave((t - a) / dur);
export const ventana = (t: number, a: number, b: number, f = 0.4) => r(t, a, f) * (1 - r(t, b - f, f));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- gradiente de 2 tonos ----------
let _grad: THREE.DataTexture | null = null;
export const gradiente = () => {
  if (_grad) return _grad;
  const data = new Uint8Array([196, 196, 196, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat);
  _grad.minFilter = THREE.NearestFilter;
  _grad.magFilter = THREE.NearestFilter;
  _grad.generateMipmaps = false;
  _grad.needsUpdate = true;
  return _grad;
};

// ---------- silueta: casco invertido con grosor constante en píxeles ----------
const cacheSilueta = new Map<string, THREE.ShaderMaterial>();
export const matSilueta = (px: number, w: number, h: number) => {
  const k = `${px}|${w}|${h}`;
  let m = cacheSilueta.get(k);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: {grosor: {value: px}, res: {value: new THREE.Vector2(w, h)}, color: {value: new THREE.Color(TINTA)}},
    vertexShader: `
      uniform float grosor; uniform vec2 res;
      void main(){
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        vec3 n = normalize(normalMatrix * normal);
        vec4 q = projectionMatrix * vec4(n, 0.0);
        vec2 d = q.xy; float L = length(d);
        if (L > 1e-5) p.xy += (d / L) * grosor * 2.0 / res * p.w;
        gl_Position = p;
      }`,
    fragmentShader: `uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }`,
    side: THREE.BackSide,
  });
  cacheSilueta.set(k, m);
  return m;
};

// ---------- aristas: líneas gruesas en bordes duros ----------
const cacheLineas = new Map<string, LineMaterial>();
export const matLinea = (px: number, w: number, h: number, color = TINTA) => {
  const k = `${px}|${w}|${h}|${color}`;
  let m = cacheLineas.get(k);
  if (m) return m;
  m = new LineMaterial({color: new THREE.Color(color).getHex(), linewidth: px, worldUnits: false});
  m.resolution.set(w, h);
  cacheLineas.set(k, m);
  return m;
};
const cacheAristas = new WeakMap<THREE.BufferGeometry, Map<number, LineSegmentsGeometry>>();
export const aristas = (geo: THREE.BufferGeometry, umbral: number) => {
  let porUmbral = cacheAristas.get(geo);
  if (!porUmbral) {
    porUmbral = new Map();
    cacheAristas.set(geo, porUmbral);
  }
  let g = porUmbral.get(umbral);
  if (!g) {
    g = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, umbral));
    porUmbral.set(umbral, g);
  }
  return g;
};

export const useRes = () => {
  const size = useThree((s) => s.size);
  return [size.width, size.height] as const;
};

// ---------- materiales de color ----------
const cacheMat = new Map<string, THREE.Material>();
export const matColor = (color: string, opts: {mapa?: THREE.Texture; vertexColors?: boolean; opacity?: number; doble?: boolean} = {}) => {
  const k = `${color}|${opts.mapa?.uuid ?? ''}|${opts.vertexColors ? 1 : 0}|${opts.opacity ?? 1}|${opts.doble ? 1 : 0}`;
  let m = cacheMat.get(k);
  if (m) return m;
  const o = opts.opacity ?? 1;
  m = new THREE.MeshToonMaterial({
    color,
    gradientMap: gradiente(),
    map: opts.mapa ?? null,
    vertexColors: !!opts.vertexColors,
    transparent: o < 1,
    opacity: o,
    depthWrite: o >= 1,
    side: opts.doble ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  cacheMat.set(k, m);
  return m;
};

type Tr = {position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number]};

/** Pieza con color + tinta. `geo` debe ser estable (useMemo o constante de módulo). */
export const P: React.FC<
  Tr & {
    geo: THREE.BufferGeometry;
    color?: string;
    mapa?: THREE.Texture;
    vc?: boolean;
    opacity?: number;
    doble?: boolean;
    linea?: number; // grosor de aristas en px (0 = sin)
    silueta?: number; // grosor de silueta en px (0 = sin)
    umbral?: number;
    sombra?: boolean;
    colorLinea?: string;
  }
> = ({geo, color = '#ffffff', mapa, vc, opacity = 1, doble, linea = 1.6, silueta = 2.2, umbral = 28, sombra = true, colorLinea, position, rotation, scale}) => {
  const [w, h] = useRes();
  const lineas = useMemo(() => {
    if (!linea) return null;
    const l = new LineSegments2(aristas(geo, umbral), matLinea(linea, w, h, colorLinea));
    l.frustumCulled = false;
    return l;
  }, [geo, linea, umbral, w, h, colorLinea]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} material={matColor(color, {mapa, vertexColors: vc, opacity, doble})} castShadow={sombra} />
      {silueta > 0 && opacity >= 1 && <mesh geometry={geo} material={matSilueta(silueta, w, h)} />}
      {lineas && <primitive object={lineas} />}
    </group>
  );
};

// ---------- geometrías comunes (caché por clave) ----------
const cacheGeo = new Map<string, THREE.BufferGeometry>();
export const G = (k: string, f: () => THREE.BufferGeometry) => {
  let g = cacheGeo.get(k);
  if (!g) {
    g = f();
    cacheGeo.set(k, g);
  }
  return g;
};
export const caja = (w: number, h: number, d: number) => G(`caja|${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cil = (r1: number, r2: number, h: number, s = 24) => G(`cil|${r1}|${r2}|${h}|${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s));
export const esf = (rr: number, s = 24) => G(`esf|${rr}|${s}`, () => new THREE.SphereGeometry(rr, s, Math.round(s * 0.66)));

// ---------- piso que recibe sombra azul ----------
export const SombraAzul: React.FC<{w: number; d: number; y?: number; o?: number; color?: string}> = ({w, d, y = 0.002, o = 0.82, color = AZUL_SOMBRA}) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[w, d]} />
    <shadowMaterial color={color} opacity={o} />
  </mesh>
);

/** Luz principal (sol) con sombra dura + luz ambiente. */
export const Luces: React.FC<{dir?: [number, number, number]; area?: number; centro?: [number, number, number]; amb?: number; sol?: number}> = ({
  dir = [-0.5, 1, 0.35],
  area = 30,
  centro = [0, 0, 0],
  amb = 0.95,
  sol = 0.75,
}) => {
  const luz = useMemo(() => {
    const l = new THREE.DirectionalLight('#ffffff', sol);
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -area;
    c.right = area;
    c.top = area;
    c.bottom = -area;
    c.near = 0.1;
    c.far = area * 6;
    return l;
  }, [area, sol]);
  const n = Math.hypot(...dir);
  luz.position.set(centro[0] + (dir[0] / n) * area * 2.5, centro[1] + (dir[1] / n) * area * 2.5, centro[2] + (dir[2] / n) * area * 2.5);
  luz.target.position.set(...centro);
  luz.target.updateMatrixWorld();
  return (
    <>
      <ambientLight intensity={amb} />
      <hemisphereLight args={['#ffffff', '#c9c2b4', 0.25]} />
      <primitive object={luz} />
      <primitive object={luz.target} />
    </>
  );
};

// ---------- cámara por poses ----------
export type Pose = [number, [number, number, number], [number, number, number], number?]; // t, posición, objetivo, fov
export const poseCamara = (t: number, poses: Pose[], trans = 1.4) => {
  let a = poses[0];
  let pos = new THREE.Vector3(...a[1]);
  let obj = new THREE.Vector3(...a[2]);
  let fov = a[3] ?? 35;
  for (let i = 1; i < poses.length; i++) {
    const b = poses[i];
    if (t < b[0]) break;
    const k = suave((t - b[0]) / trans);
    pos = pos.clone().lerp(new THREE.Vector3(...b[1]), k);
    obj = obj.clone().lerp(new THREE.Vector3(...b[2]), k);
    fov = lerp(fov, b[3] ?? 35, k);
  }
  return {pos, obj, fov};
};
export const Camara: React.FC<{pos: THREE.Vector3; obj: THREE.Vector3; fov: number}> = ({pos, obj, fov}) => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  cam.position.copy(pos);
  cam.lookAt(obj);
  if (cam.fov !== fov) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  return null;
};

// ---------- texturas pintadas ----------
export const canvasTex = (w: number, h: number, pintar: (g: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  pintar(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Nube pintada (sprite plano). */
let _nube: THREE.CanvasTexture | null = null;
export const texNube = () => {
  if (_nube) return _nube;
  _nube = canvasTex(512, 256, (g) => {
    for (let i = 0; i < 26; i++) {
      const x = 80 + rnd(i) * 350;
      const y = 120 + (rnd(i + 50) - 0.5) * 70 - Math.sin((x / 512) * Math.PI) * 40;
      const rr = 30 + rnd(i + 9) * 55;
      const gr = g.createRadialGradient(x, y, rr * 0.2, x, y, rr);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
  });
  _nube.wrapS = _nube.wrapT = THREE.ClampToEdgeWrapping;
  return _nube;
};

/** Capa de papel/acuarela encima de todo. Más marcada que la versión anterior. */
export const Papel: React.FC<{grano?: number; manchas?: number}> = ({grano = 0.22, manchas = 0.16}) => (
  <>
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: grano, pointerEvents: 'none'}}>
      <filter id="ilGrano">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} seed={11} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ilGrano)" />
    </svg>
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: manchas, pointerEvents: 'none'}}>
      <filter id="ilManchas">
        <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves={5} seed={4} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.40  0 0 0 0 0.37  0 0 0 1.6 -0.45" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ilManchas)" />
    </svg>
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.12, pointerEvents: 'none'}}>
      <filter id="ilFibras">
        <feTurbulence type="turbulence" baseFrequency="0.012 0.18" numOctaves={2} seed={8} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ilFibras)" />
    </svg>
  </>
);

/** Texto grande estilo título (negro con borde blanco). */
export const Titulo: React.FC<{texto: string; o: number; y?: number; size?: number; color?: string; fuente: string}> = ({texto, o, y = 230, size = 120, color = '#16171c', fuente}) => (
  <div
    style={{
      position: 'absolute',
      top: y,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: fuente,
      fontWeight: 900,
      fontSize: size,
      letterSpacing: -2,
      color,
      opacity: o,
      transform: `translateY(${(1 - o) * 30}px) scale(${0.94 + 0.06 * o})`,
      WebkitTextStroke: '14px #ffffff',
      paintOrder: 'stroke fill',
      textShadow: '0 6px 18px rgba(0,0,0,0.12)',
    }}
  >
    {texto}
  </div>
);

// ---------- geometrías orgánicas ----------
/** Tubo que se adelgaza (brazos, colas). r(u) con u de 0 a 1. */
export const tuboAhusado = (pts: THREE.Vector3[], r: (u: number) => number, seg = 64, rad = 14) => {
  const curva = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curva, seg, 1, rad, false);
  const p = g.getAttribute('position');
  const fr = curva.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const c = curva.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)).sub(c).multiplyScalar(r(u));
      p.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z);
    }
  }
  void fr;
  g.computeVertexNormals();
  return g;
};

/** Cuerpo por secciones a lo largo de X. Cada sección: [x, medioAncho, arriba, abajo, n(superelipse)].
 *  mitad=true deja solo la mitad z<=0 (corte) y le pone tapa plana en z=0. */
export const cuerpoSecciones = (sec: [number, number, number, number, number?][], opts: {mitad?: boolean; segX?: number; segA?: number} = {}) => {
  const segX = opts.segX ?? 120;
  const segA = opts.segA ?? 48;
  const xs = sec.map((s) => s[0]);
  const interp = (x: number, k: number) => {
    for (let i = 0; i < sec.length - 1; i++) {
      if (x >= sec[i][0] && x <= sec[i + 1][0]) {
        const u = (x - sec[i][0]) / (sec[i + 1][0] - sec[i][0]);
        const s = u * u * (3 - 2 * u) * 0.5 + u * 0.5;
        return lerp((sec[i][k] as number) ?? 2.4, (sec[i + 1][k] as number) ?? 2.4, s);
      }
    }
    return (sec[sec.length - 1][k] as number) ?? 2.4;
  };
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const a0 = 0;
  const a1 = opts.mitad ? Math.PI : Math.PI * 2;
  const pos: number[] = [];
  const idx: number[] = [];
  const pt = (x: number, a: number) => {
    const w = interp(x, 1);
    const up = interp(x, 2);
    const dn = interp(x, 3);
    const n = interp(x, 4) || 2.4;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const sy = Math.sign(c) * Math.abs(c) ** (2 / n);
    const sz = Math.sign(s) * Math.abs(s) ** (2 / n);
    const y = sy >= 0 ? sy * up : sy * dn;
    return [x, y, -sz * w];
  };
  for (let i = 0; i <= segX; i++) {
    const x = lerp(x0, x1, i / segX);
    for (let j = 0; j <= segA; j++) pos.push(...pt(x, lerp(a0, a1, j / segA)));
  }
  for (let i = 0; i < segX; i++)
    for (let j = 0; j < segA; j++) {
      const a = i * (segA + 1) + j;
      const b = a + segA + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  if (opts.mitad) {
    // tapa en z=0: franja entre arriba y abajo
    const base = pos.length / 3;
    for (let i = 0; i <= segX; i++) {
      const x = lerp(x0, x1, i / segX);
      pos.push(x, interp(x, 2), 0.0005, x, -interp(x, 3), 0.0005);
    }
    for (let i = 0; i < segX; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

/** Etiqueta pequeña (como las de la serie): roja para problemas. */
export const Etiqueta: React.FC<{texto: string; o: number; rojo?: boolean; y?: number; fuente: string; size?: number}> = ({texto, o, rojo, y = 360, fuente, size = 56}) => (
  <div
    style={{
      position: 'absolute',
      top: y,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontFamily: fuente,
      fontWeight: 800,
      fontSize: size,
      color: rojo ? '#e0453a' : '#16171c',
      opacity: o,
      transform: `translateY(${(1 - o) * 20}px)`,
      WebkitTextStroke: '11px #ffffff',
      paintOrder: 'stroke fill',
      lineHeight: 1.1,
    }}
  >
    {texto}
  </div>
);

/** Palabras del guion -> tiempo (n-ésima aparición). */
export const tiemposPalabras = (datos: any) => {
  const PAL: {t: number; e: number; w: string; a?: string[]}[] = datos.beats.flatMap((b: any) => b.words);
  const lim = (x: string) => x.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');
  return (w: string, n = 1): number => {
    const o = lim(w);
    const hits = PAL.filter((p) => lim(p.w) === o || (p.a ?? []).some((x) => lim(x) === o));
    const h = hits[n - 1] ?? hits[hits.length - 1];
    if (!h) throw new Error('palabra no encontrada: ' + w);
    return h.t;
  };
};
