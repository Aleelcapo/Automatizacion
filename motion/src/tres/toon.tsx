import React, {useMemo} from 'react';
import * as THREE from 'three';

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
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
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

/** Capa de papel/pincel encima del render (da el acabado de "dibujo"). */
export const Papel: React.FC = () => (
  <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.22, pointerEvents: 'none'}}>
    <filter id="papelRuido">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="linear" slope={1} />
      </feComponentTransfer>
    </filter>
    <rect width="100%" height="100%" filter="url(#papelRuido)" />
  </svg>
);
