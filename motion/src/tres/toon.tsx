import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/*
 Kit de "3D con acabado de dibujo":
 - Sombreado toon de 3 tonos (colores planos con sombras marcadas).
 - Contorno negro tipo tinta: casco invertido un poco más grande (BackSide).
 - Bordes gruesos para cajas de vidrio.
*/

const TINTA = '#15161c';
export const GROSOR = 0.0038;

let _grad: THREE.DataTexture | null = null;
export const gradiente = () => {
  if (_grad) return _grad;
  const data = new Uint8Array([105, 105, 105, 255, 160, 160, 160, 255, 212, 212, 212, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  _grad.minFilter = THREE.NearestFilter;
  _grad.magFilter = THREE.NearestFilter;
  _grad.generateMipmaps = false;
  _grad.needsUpdate = true;
  return _grad;
};

export const MatToon: React.FC<{color: string; opacity?: number; side?: THREE.Side}> = ({color, opacity = 1, side}) => (
  <meshToonMaterial color={color} gradientMap={gradiente()} transparent={opacity < 1} opacity={opacity} side={side} depthWrite={opacity >= 1} />
);

const MatTinta: React.FC = () => <meshBasicMaterial color={TINTA} side={THREE.BackSide} />;

type Base = {position?: [number, number, number]; rotation?: [number, number, number]; color: string; opacity?: number; contorno?: boolean; sombra?: boolean};

export const Caja: React.FC<Base & {w: number; h: number; d: number}> = ({w, h, d, position, rotation, color, opacity = 1, contorno = true, sombra = true}) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow={sombra} receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <MatToon color={color} opacity={opacity} />
    </mesh>
    {contorno && (
      <mesh>
        <boxGeometry args={[w + GROSOR * 2, h + GROSOR * 2, d + GROSOR * 2]} />
        <MatTinta />
      </mesh>
    )}
  </group>
);

export const Cilindro: React.FC<Base & {r: number; h: number; r2?: number; abierto?: boolean; seg?: number}> = ({
  r,
  r2,
  h,
  position,
  rotation,
  color,
  opacity = 1,
  contorno = true,
  sombra = true,
  abierto = false,
  seg = 40,
}) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow={sombra} receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg, 1, abierto]} />
      <MatToon color={color} opacity={opacity} side={abierto ? THREE.DoubleSide : undefined} />
    </mesh>
    {contorno && (
      <mesh>
        <cylinderGeometry args={[r + GROSOR, (r2 ?? r) + GROSOR, h + GROSOR * 2, seg, 1, abierto]} />
        <MatTinta />
      </mesh>
    )}
  </group>
);

export const Esfera: React.FC<Base & {r: number; escala?: [number, number, number]}> = ({r, position, color, opacity = 1, contorno = true, sombra = true, escala}) => (
  <group position={position} scale={escala}>
    <mesh castShadow={sombra} receiveShadow>
      <sphereGeometry args={[r, 32, 20]} />
      <MatToon color={color} opacity={opacity} />
    </mesh>
    {contorno && (
      <mesh>
        <sphereGeometry args={[r + GROSOR, 32, 20]} />
        <MatTinta />
      </mesh>
    )}
  </group>
);

export const Toro: React.FC<Base & {r: number; tubo: number; arco?: number}> = ({r, tubo, arco = Math.PI * 2, position, rotation, color, contorno = true}) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow receiveShadow>
      <torusGeometry args={[r, tubo, 16, 48, arco]} />
      <MatToon color={color} />
    </mesh>
    {contorno && (
      <mesh>
        <torusGeometry args={[r, tubo + GROSOR, 16, 48, arco]} />
        <MatTinta />
      </mesh>
    )}
  </group>
);

/** Tubo que sigue una curva de puntos. `hasta` (0..1) dibuja solo una parte (animar que "crece"). */
export const Tubo: React.FC<{puntos: [number, number, number][]; r: number; color: string; hasta?: number; contorno?: boolean}> = ({puntos, r, color, hasta = 1, contorno = true}) => {
  const geo = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
    const n = Math.max(2, Math.round(60 * Math.max(0.02, hasta)));
    const pts = curva.getSpacedPoints(n).slice(0, Math.max(2, Math.round(n * Math.max(0.02, hasta)) + 1));
    const c2 = new THREE.CatmullRomCurve3(pts);
    return {
      cuerpo: new THREE.TubeGeometry(c2, Math.max(8, pts.length * 2), r, 12, false),
      tinta: new THREE.TubeGeometry(c2, Math.max(8, pts.length * 2), r + GROSOR, 12, false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos), r, Math.round(hasta * 60)]);
  if (hasta <= 0.01) return null;
  return (
    <group>
      <mesh geometry={geo.cuerpo} castShadow receiveShadow>
        <MatToon color={color} />
      </mesh>
      {contorno && (
        <mesh geometry={geo.tinta}>
          <MatTinta />
        </mesh>
      )}
    </group>
  );
};

/** Aristas gruesas de una caja (para el tanque de vidrio). */
export const AristasCaja: React.FC<{w: number; h: number; d: number; position: [number, number, number]; g?: number; color?: string}> = ({w, h, d, position, g = 0.005, color = TINTA}) => {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const v: [number, number, number][] = [];
  for (const sx of [-x, x]) for (const sy of [-y, y]) for (const sz of [-z, z]) v.push([sx, sy, sz]);
  const aristas: [number, number][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const dif = [0, 1, 2].filter((k) => v[i][k] !== v[j][k]).length;
      if (dif === 1) aristas.push([i, j]);
    }
  return (
    <group position={position}>
      {aristas.map(([i, j], k) => {
        const a = new THREE.Vector3(...v[i]);
        const b = new THREE.Vector3(...v[j]);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const len = a.distanceTo(b);
        const dir = b.clone().sub(a).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <mesh key={k} position={mid.toArray() as [number, number, number]} quaternion={q}>
            <cylinderGeometry args={[g, g, len + g * 2, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Textura de baldosas para el piso (canvas). */
export const texturaBaldosas = (c1 = '#e9e6df', c2 = '#c9c4ba', n = 8) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = c1;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = c2;
  g.lineWidth = 6;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.moveTo((i * 512) / n, 0);
    g.lineTo((i * 512) / n, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, (i * 512) / n);
    g.lineTo(512, (i * 512) / n);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Capa de papel/acuarela encima del render (da el acabado de "dibujo"): grano fino + manchas suaves. */
export const Papel: React.FC = () => (
  <>
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.16, pointerEvents: 'none'}}>
      <filter id="papelGrano">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={7} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#papelGrano)" />
    </svg>
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.1, pointerEvents: 'none'}}>
      <filter id="papelManchas">
        <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves={4} seed={3} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 1.4 -0.35" />
      </filter>
      <rect width="100%" height="100%" filter="url(#papelManchas)" />
    </svg>
  </>
);

const MatTinta2: React.FC = () => <meshBasicMaterial color={TINTA} side={THREE.BackSide} />;

/** Caja con bordes redondeados (porcelana, plástico) + contorno. */
export const Redondeada: React.FC<Base & {w: number; h: number; d: number; radio?: number; escala?: [number, number, number]}> = ({
  w,
  h,
  d,
  radio = 0.015,
  position,
  rotation,
  color,
  opacity = 1,
  contorno = true,
  sombra = true,
  escala,
}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(w, h, d, 4, radio), [w, h, d, radio]);
  const tinta = useMemo(() => new RoundedBoxGeometry(w + GROSOR * 2, h + GROSOR * 2, d + GROSOR * 2, 4, radio + GROSOR), [w, h, d, radio]);
  return (
    <group position={position} rotation={rotation} scale={escala}>
      <mesh geometry={geo} castShadow={sombra} receiveShadow>
        <MatToon color={color} opacity={opacity} />
      </mesh>
      {contorno && (
        <mesh geometry={tinta}>
          <MatTinta2 />
        </mesh>
      )}
    </group>
  );
};

/** Pieza de revolución (taza, botella...) a partir de un perfil [radio, altura]. */
export const Torno: React.FC<Base & {perfil: [number, number][]; escala?: [number, number, number]; doble?: boolean}> = ({
  perfil,
  position,
  rotation,
  color,
  opacity = 1,
  contorno = true,
  sombra = true,
  escala,
  doble = false,
}) => {
  const geo = useMemo(() => new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), 64), [JSON.stringify(perfil)]);
  const tinta = useMemo(() => new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r + GROSOR, y)), 64), [JSON.stringify(perfil)]);
  return (
    <group position={position} rotation={rotation} scale={escala}>
      <mesh geometry={geo} castShadow={sombra} receiveShadow>
        <MatToon color={color} opacity={opacity} side={doble ? THREE.DoubleSide : undefined} />
      </mesh>
      {contorno && (
        <mesh geometry={tinta}>
          <MatTinta2 />
        </mesh>
      )}
    </group>
  );
};

let _sombraTex: THREE.CanvasTexture | null = null;
/** Sombra de contacto suave (mancha oscura difuminada) bajo un objeto. */
export const SombraContacto: React.FC<{position: [number, number, number]; w: number; d: number; o?: number}> = ({position, w, d, o = 0.35}) => {
  if (!_sombraTex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(20,25,35,1)');
    gr.addColorStop(1, 'rgba(20,25,35,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    _sombraTex = new THREE.CanvasTexture(cv);
  }
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={_sombraTex} transparent opacity={o} depthWrite={false} />
    </mesh>
  );
};

/** Textura de azulejo tipo "metro" (ladrillito blanco con junta). */
export const texturaAzulejo = (c1 = '#f4f6f4', c2 = '#c9d3cf') => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = c2;
  g.fillRect(0, 0, 512, 512);
  const fh = 64;
  const fw = 128;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 5; c++) {
      const x = c * fw + (r % 2 ? fw / 2 : 0);
      g.fillStyle = c1;
      g.fillRect(x + 4, r * fh + 4, fw - 8, fh - 8);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(x + 10, r * fh + 10, fw - 40, 6);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
