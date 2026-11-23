import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/ajolote_m.json';
import {Camara, G, Luces, P, Papel, Pose, caja, canvasTex, cil, cl, cuerpoSecciones, esf, lerp, poseCamara, r, rnd, suave, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Confeti, Halo, ICONOS, Ic, MADERA, Mano, Ranura, Sello, Sprite, Tio, crearSubtitulo, texCopo, texEstrella} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_AJOLOTE = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  bichito: T('bichito'),
  sonrie: T('sonríe'),
  plumitas: T('plumitas'),
  felicidades: T('felicidades'),
  ajolote: T('ajolote'),
  pones: T('pones'),
  pecera: T('pecera'),
  piedritas: T('piedritas'),
  lampara: T('lámpara'),
  listo: T('listo'),
  pero1: T('pero', 1),
  come: T('come', 1),
  panza: T('panza'),
  es1: T('es', 1),
  chupando: T('chupando'),
  golpe: T('golpe'),
  traga: T('traga'),
  piedritas2: T('piedritas', 2),
  tripas: T('tripas'),
  fondo: T('fondo'),
  arena: T('arena'),
  piso: T('piso'),
  pero2: T('pero', 2),
  plumitas2: T('plumitas', 2),
  encogen: T('encogen', 1),
  branquias: T('branquias'),
  respira: T('respira'),
  sucia: T('sucia'),
  queman: T('queman'),
  grandes: T('grandes'),
  esponjadas: T('esponjadas'),
  filtro: T('filtro'),
  cambiarle: T('cambiarle'),
  semana: T('semana'),
  pero3: T('pero', 3),
  verano: T('verano'),
  flotando: T('flotando'),
  lagos: T('lagos'),
  veinte: T('20'),
  estresa: T('estresa'),
  enferma: T('enferma'),
  temperatura: T('temperatura'),
  pero4: T('pero', 4),
  agarrar: T('agarrar'),
  resbala: T('resbala'),
  marcada: T('marcada'),
  baba: T('baba'),
  manos: T('manos'),
  quitan: T('quitan'),
  mira: T('mira'),
  toca: T('toca'),
  ahora: T('ahora'),
  feliz2: T('feliz', 2),
  lastima: T('lastima'),
  pata: T('pata'),
  crecer: T('crecer'),
};

const ROSA = '#f7a8b8';
const ROSA_OSC = '#e9879b';
const BRANQ = '#e2456a';

// ---------- texturas ----------
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
let _arena: THREE.CanvasTexture | null = null;
const texArena = () => {
  if (_arena) return _arena;
  _arena = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#ead7ad';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = rnd(i) > 0.5 ? 'rgba(160,120,70,0.35)' : 'rgba(255,250,230,0.6)';
        g.fillRect(rnd(i + 1) * 256, rnd(i + 2) * 256, 2, 2);
      }
    },
    [3, 2],
  );
  return _arena;
};
let _burbuja: THREE.CanvasTexture | null = null;
const texBurbuja = () => {
  if (_burbuja) return _burbuja;
  _burbuja = canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.beginPath();
    g.arc(32, 32, 26, 0, Math.PI * 2);
    g.fillStyle = 'rgba(230,250,255,0.55)';
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = '#16171c';
    g.stroke();
    g.beginPath();
    g.arc(24, 24, 7, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
  });
  _burbuja.wrapS = _burbuja.wrapT = THREE.ClampToEdgeWrapping;
  return _burbuja;
};

// ---------- ajolote ----------
const SEC = (panza: number): [number, number, number, number, number][] => [
  [-1.25, 0.012, 0.03, 0.03, 2.2],
  [-0.95, 0.05, 0.1, 0.08, 2.2],
  [-0.55, 0.11, 0.13, 0.12, 2.3],
  [-0.15, 0.16 + 0.06 * panza, 0.14, 0.14 + 0.1 * panza, 2.4],
  [0.18, 0.17 + 0.05 * panza, 0.14, 0.13 + 0.07 * panza, 2.4],
  [0.4, 0.2, 0.13, 0.11, 2.4],
  [0.6, 0.26, 0.15, 0.11, 2.6],
  [0.8, 0.23, 0.13, 0.09, 2.6],
  [0.93, 0.14, 0.08, 0.05, 2.4],
  [0.99, 0.02, 0.02, 0.01, 2.2],
];
const geoCuerpo = (panza: number, mitad: boolean) => G(`ajoC|${panza.toFixed(2)}|${mitad}`, () => cuerpoSecciones(SEC(panza), {segX: 90, segA: 36, mitad}));
const geoAleta = () =>
  G('ajoAleta', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.15, 0.12);
    s.bezierCurveTo(-0.5, 0.32, -0.95, 0.24, -1.36, 0.0);
    s.bezierCurveTo(-0.95, -0.2, -0.55, -0.22, -0.3, -0.1);
    s.lineTo(-0.15, 0.12);
    return new THREE.ShapeGeometry(s, 24);
  });
const geoBranquia = () =>
  G('ajoBranq', () => {
    const gs: THREE.BufferGeometry[] = [];
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.06, 0.1, 0.06), new THREE.Vector3(-0.18, 0.18, 0.1), new THREE.Vector3(-0.32, 0.22, 0.1)];
    gs.push(tuboAhusado(pts, (u) => 0.03 * (1 - 0.6 * u), 20, 8));
    const curva = new THREE.CatmullRomCurve3(pts);
    for (let i = 0; i < 9; i++) {
      const u = 0.15 + (i / 9) * 0.8;
      const p = curva.getPointAt(u);
      for (const s of [-1, 1]) {
        const f = new THREE.ConeGeometry(0.014, 0.09, 5);
        f.translate(0, 0.045, 0);
        f.rotateZ(s * 0.7);
        f.rotateX(0.5);
        f.translate(p.x, p.y, p.z);
        gs.push(f);
      }
    }
    return mergeGeometries(gs);
  });
const geoSonrisa = () =>
  G('ajoSonrisa', () =>
    tuboAhusado(
      Array.from({length: 9}, (_, i) => {
        const a = lerp(-1.05, 1.05, i / 8);
        return new THREE.Vector3(0.62 + Math.cos(a) * 0.3, -0.035 + Math.abs(Math.sin(a)) * 0.035, Math.sin(a) * 0.22);
      }),
      () => 0.008,
      40,
      6,
    ),
  );

const Pata: React.FC<{x: number; s: number; esc?: number; t: number; fase: number}> = ({x, s, esc = 1, t, fase}) => {
  if (esc < 0.02) return null;
  const mov = Math.sin(t * 2 + fase) * 0.2;
  return (
    <group position={[x, -0.05, s * 0.15]} rotation={[s * 0.9, mov, -0.4]} scale={esc}>
      <P geo={cil(0.035, 0.03, 0.18, 10)} color={ROSA} position={[0, -0.09, 0]} linea={0} silueta={1.6} />
      <group position={[0, -0.18, 0]} rotation={[0, 0, 0.9]}>
        <P geo={cil(0.03, 0.025, 0.12, 10)} color={ROSA} position={[0, -0.06, 0]} linea={0} silueta={1.6} />
        {[-1.5, -0.5, 0.5, 1.5].map((k) => (
          <P key={k} geo={cil(0.008, 0.006, 0.06, 6)} color={ROSA_OSC} position={[0, -0.14, k * 0.015]} rotation={[k * 0.35, 0, 0]} linea={0} silueta={1} />
        ))}
      </group>
    </group>
  );
};

const Ajolote: React.FC<{
  t: number;
  panza?: number;
  branq?: number; // escala de branquias
  branqColor?: string;
  corte?: boolean;
  piedras?: number;
  pataEsc?: number;
  boca?: number;
  marca?: number;
  brillo?: number;
}> = ({t, panza = 0, branq = 1, branqColor = BRANQ, corte = false, piedras = 0, pataEsc = 1, boca = 0, marca = 0, brillo = 0}) => {
  const ond = Math.sin(t * 2.4);
  const pz = Math.round(panza * 4) / 4;
  return (
    <group>
      <P geo={geoCuerpo(pz, corte)} color={ROSA} linea={0} silueta={2.2} doble={corte} />
      <group rotation={[0, ond * 0.12, 0]} position={[-0.2, 0, 0]}>
        <group position={[0.2, 0, 0]}>
          <P geo={geoAleta()} color="#fbc6d0" opacity={0.95} doble linea={1.4} silueta={0} umbral={5} sombra={false} />
        </group>
      </group>
      {/* ojos */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <P geo={esf(0.032, 14)} color="#1a1a20" position={[0.76, 0.07, s * 0.19]} linea={0} silueta={1.2} />
          <P geo={esf(0.01, 8)} color="#ffffff" position={[0.775, 0.085, s * 0.215]} linea={0} silueta={0} sombra={false} />
        </group>
      ))}
      {/* sonrisa */}
      <group scale={[1, 1 + boca * 1.8, 1]}>
        <P geo={geoSonrisa()} color="#7a2c3c" linea={0} silueta={0} sombra={false} />
      </group>
      {boca > 0.05 && <P geo={esf(0.06, 14)} color="#5a1a28" position={[0.93, -0.03, 0]} scale={[0.4, boca, 1.4]} linea={0} silueta={0} sombra={false} />}
      {/* branquias */}
      {[-1, 1].map((s) =>
        [0, 1, 2].map((k) => (
          <group key={`${s}${k}`} position={[0.45, 0.02 + k * 0.06, s * 0.2]} rotation={[s * (0.55 - k * 0.45) + Math.sin(t * 3 + k) * 0.06, s * 0.2, 0]} scale={[branq, branq, s * branq]}>
            <P geo={geoBranquia()} color={branqColor} linea={0} silueta={1.4} sombra={false} />
          </group>
        )),
      )}
      {/* patas */}
      <Pata x={0.33} s={1} esc={pataEsc} t={t} fase={0} />
      <Pata x={0.33} s={-1} t={t} fase={1.5} />
      <Pata x={-0.38} s={1} t={t} fase={3} />
      <Pata x={-0.38} s={-1} t={t} fase={4.5} />
      {/* marca de la mano */}
      {marca > 0.01 && <P geo={esf(0.1, 16)} color="#fde3e8" position={[0.05, 0.11, 0.06]} scale={[1.4, 0.35 * marca, 1.1]} linea={0} silueta={0} sombra={false} />}
      {/* corte: estómago con piedras */}
      {corte && (
        <>
          <P geo={esf(0.15, 20)} color="#e47b8c" position={[0.0, -0.04, 0]} scale={[1.6, 0.9, 0.3]} linea={0} silueta={1.6} />
          {Array.from({length: 14}, (_, i) =>
            i < piedras * 14 ? (
              <P key={i} geo={esf(0.03, 10)} color={['#e0453a', '#2f6fe0', '#ffd23a', '#3cb54a', '#a64ad6'][i % 5]} position={[(rnd(i) - 0.5) * 0.36, -0.04 + (rnd(i + 3) - 0.5) * 0.15, 0.035]} linea={0} silueta={1.2} sombra={false} />
            ) : null,
          )}
        </>
      )}
      {brillo > 0.01 &&
        [0, 1, 2, 3, 4].map((i) => (
          <Sprite key={i} tex={texEstrella()} pos={[-0.6 + i * 0.32, 0.17 + Math.sin(i) * 0.03, 0.05]} escala={[0.09, 0.09]} o={brillo * (0.5 + 0.5 * Math.sin(t * 6 + i * 2))} rot={t + i} />
        ))}
    </group>
  );
};

// ---------- cuarto y pecera ----------
const PW = 1.0;
const PH = 0.6;
const PD = 0.5;
const MUEBLE_H = 0.85;
const PISO_P = MUEBLE_H + 0.03;

const Cuarto: React.FC<{sol: number}> = ({sol}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#ffffff" map={texPiso()} />
    </mesh>
    <P geo={caja(20, 3.4, 0.2)} color="#bfe0d8" position={[0, 1.7, -1.6]} linea={0} silueta={0} />
    <P geo={caja(20, 0.14, 0.24)} color="#f4f1ea" position={[0, 0.07, -1.48]} linea={0} />
    {/* ventana */}
    <P geo={caja(1.5, 1.2, 0.08)} color="#f4f1ea" position={[1.6, 1.9, -1.48]} />
    <P geo={caja(1.3, 1.0, 0.1)} color={sol > 0.5 ? '#ffe9a8' : '#a9d3ef'} position={[1.6, 1.9, -1.46]} />
    <P geo={caja(0.05, 1.0, 0.12)} color="#f4f1ea" position={[1.6, 1.9, -1.44]} linea={0} />
    <P geo={caja(1.2, 1.3, 0.06)} color="#e0453a" position={[2.55, 1.85, -1.42]} />
    {/* cuadro */}
    <P geo={caja(0.6, 0.45, 0.05)} color="#f6c445" position={[-1.4, 2.0, -1.47]} />
    <P geo={caja(0.5, 0.35, 0.06)} color="#7fc6e8" position={[-1.4, 2.0, -1.46]} linea={0} />
    {/* mueble */}
    <P geo={caja(2.1, MUEBLE_H, 0.75)} color="#a8744a" position={[0, MUEBLE_H / 2, -0.2]} />
    <P geo={caja(0.95, 0.6, 0.02)} color="#94633c" position={[-0.5, 0.43, 0.18]} />
    <P geo={caja(0.95, 0.6, 0.02)} color="#94633c" position={[0.5, 0.43, 0.18]} />
  </group>
);

const geoGrava = () =>
  G('grava', () => {
    const gs: THREE.BufferGeometry[] = [];
    const cols = ['#e0453a', '#2f6fe0', '#ffd23a', '#3cb54a', '#a64ad6', '#ff8a1c'];
    for (let i = 0; i < 420; i++) {
      const g = new THREE.SphereGeometry(0.018 + rnd(i) * 0.008, 7, 5);
      g.translate((rnd(i + 1) - 0.5) * (PW - 0.04), 0.012 + rnd(i + 2) * 0.025, (rnd(i + 3) - 0.5) * (PD - 0.04));
      const c = new THREE.Color(cols[i % cols.length]);
      const n = g.getAttribute('position').count;
      g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({length: n * 3}, (_, k) => [c.r, c.g, c.b][k % 3]), 3));
      gs.push(g);
    }
    return mergeGeometries(gs);
  });

const Pecera: React.FC<{t: number; grava: number; arena: number; sucia: number; filtro: number; lampara: number}> = ({t, grava, arena, sucia, filtro, lampara}) => {
  const agua = new THREE.Color('#bfe9f5').lerp(new THREE.Color('#8f8a3c'), sucia).getStyle();
  return (
    <group position={[0, PISO_P, -0.1]}>
      <P geo={caja(PW + 0.06, 0.04, PD + 0.06)} color="#2a2b31" position={[0, -0.02, 0]} />
      <P geo={caja(PW + 0.06, 0.03, PD + 0.06)} color="#2a2b31" position={[0, PH + 0.015, 0]} linea={0} />
      {arena > 0.01 && <P geo={caja(PW - 0.01, 0.04 * arena, PD - 0.01)} color="#ffffff" mapa={texArena()} position={[0, 0.02 * arena, 0]} linea={0} silueta={0} />}
      {grava > 0.01 && (
        <group scale={[1, grava, 1]}>
          <P geo={geoGrava()} vc color="#ffffff" linea={0} silueta={0.8} sombra={false} />
        </group>
      )}
      {/* planta y piedra */}
      <P geo={esf(0.09, 12)} color="#8c8f98" position={[-0.32, 0.05, -0.1]} scale={[1.4, 0.7, 1]} />
      {[0, 1, 2].map((k) => (
        <P
          key={k}
          geo={G('hojaPlanta', () => tuboAhusado([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.15, 0), new THREE.Vector3(-0.02, 0.3, 0.01), new THREE.Vector3(0.03, 0.42, 0)], (u) => 0.022 * (1 - u * 0.7), 20, 6))}
          color="#4fb04a"
          position={[0.36 + k * 0.04, 0.02, -0.15 + k * 0.03]}
          rotation={[Math.sin(t * 1.3 + k) * 0.08, k, (k - 1) * 0.25]}
          linea={0}
          silueta={1.4}
        />
      ))}
      {/* filtro */}
      {filtro > 0.01 && (
        <group position={[PW / 2 - 0.08, 0, -PD / 2 + 0.06]} scale={[1, filtro, 1]}>
          <P geo={caja(0.1, PH * 0.9, 0.07)} color="#3a3b42" position={[0, PH * 0.45, 0]} />
          <P geo={cil(0.015, 0.015, 0.25, 8)} color="#3a3b42" position={[-0.03, 0.12, 0.05]} linea={0} />
        </group>
      )}
      {filtro > 0.5 &&
        Array.from({length: 8}, (_, i) => {
          const ph = (t * 0.45 + i / 8) % 1;
          return <Sprite key={i} tex={texBurbuja()} pos={[PW / 2 - 0.12 + Math.sin(t * 3 + i) * 0.01, 0.05 + ph * (PH - 0.08), -PD / 2 + 0.12]} escala={[0.025, 0.025]} o={1} />;
        })}
      {/* agua */}
      <mesh position={[0, (PH - 0.04) / 2, 0]} renderOrder={5}>
        <boxGeometry args={[PW - 0.005, PH - 0.04, PD - 0.005]} />
        <meshBasicMaterial color={agua} transparent opacity={0.16 + sucia * 0.34} depthWrite={false} />
      </mesh>
      {sucia > 0.05 &&
        Array.from({length: 30}, (_, i) => (
          <P key={i} geo={esf(0.008, 6)} color="#6b5a2a" position={[(rnd(i) - 0.5) * PW * 0.9, 0.05 + ((rnd(i + 1) + t * 0.02) % 1) * (PH - 0.1), (rnd(i + 2) - 0.5) * PD * 0.8]} linea={0} silueta={0} sombra={false} />
        ))}
      {/* vidrio: aristas */}
      <P geo={caja(PW, PH, PD)} color="#dff4fb" position={[0, PH / 2, 0]} opacity={0.08} linea={1.6} silueta={0} umbral={10} sombra={false} />
      {/* lámpara */}
      {lampara > 0.01 && (
        <group position={[0, PH + 0.32, 0]} scale={lampara}>
          <P geo={cil(0.006, 0.006, 0.6, 6)} color="#3a3b42" position={[-0.4, -0.05, -0.2]} linea={0} />
          <P geo={cil(0.08, 0.17, 0.16, 20)} color="#ffd23a" position={[0, 0, 0]} />
          <Halo pos={[0, -0.15, 0]} o={0.55} escala={0.7} color="#fff2a0" />
        </group>
      )}
    </group>
  );
};

// ---------- bolsa del tío ----------
const Bolsa: React.FC<{t: number}> = ({t}) => (
  <group>
    <mesh renderOrder={5}>
      <sphereGeometry args={[0.2, 24, 18]} />
      <meshBasicMaterial color="#cfeefa" transparent opacity={0.3} depthWrite={false} />
    </mesh>
    <P geo={esf(0.2, 24)} color="#e9f8ff" opacity={0.12} linea={0} silueta={1.4} sombra={false} />
    <P geo={cil(0.02, 0.06, 0.12, 10)} color="#e9f8ff" position={[0, 0.24, 0]} opacity={0.5} linea={0} silueta={0} />
    <P geo={cil(0.025, 0.025, 0.03, 10)} color="#e0453a" position={[0, 0.2, 0]} linea={0} silueta={1} />
    <group position={[0, -0.04, 0]} rotation={[0, -0.5 + Math.sin(t) * 0.2, 0]} scale={0.13}>
      <Ajolote t={t} />
    </group>
  </group>
);

// ---------- tiros ----------
const TIRO = {
  pecera: ev.pones - 0.35,
  dentro: ev.traga - 0.35,
  fuera: ev.fondo - 0.4,
};
const MESA_TIO = -1.75;
const BOLSA: [number, number, number] = [-0.78, MUEBLE_H + 0.2, 0.0];
const C = new THREE.Vector3(0, PISO_P + 0.2, -0.1); // centro de la pecera
const POSES: Pose[] = [
  [0, [-0.4, 1.75, 4.6], [-0.9, 1.2, 0], 42],
  [ev.bichito - 0.45, [BOLSA[0] + 0.25, 1.22, 0.95], [BOLSA[0], 1.04, 0], 30],
  [ev.felicidades - 0.25, [-1.0, 1.7, 3.9], [-1.15, 1.3, 0], 40],
  [TIRO.pecera, [0.0, 1.45, 3.4], [0.0, 1.1, -0.1], 38],
  [ev.pero1 - 0.1, [0.15, 1.3, 1.9], [0.05, 1.08, -0.1], 36],
  [ev.es1 - 0.1, [0.45, 1.15, 1.25], [0.15, 1.02, -0.1], 34],
];

// posición del ajolote en la pecera (mundo)
const posAjo = (t: number): {p: [number, number, number]; ry: number; rz: number; rx: number} => {
  const base: [number, number, number] = [C.x + 0.05 * Math.sin(t * 0.4), PISO_P + 0.075, C.z + 0.05];
  if (t > ev.verano - 0.4 && t < ev.temperatura - 0.2) {
    const k = r(t, ev.verano - 0.4, 1.2);
    return {p: [C.x - 0.05, lerp(base[1], PISO_P + PH - 0.11, k) + Math.sin(t * 1.3) * 0.006, C.z + 0.05], ry: -0.25, rz: 0.1 * k, rx: 2.6 * k};
  }
  if (t > ev.resbala - 0.1 && t < ev.ahora) {
    const k = r(t, ev.resbala - 0.1, 0.35);
    return {p: [lerp(base[0], C.x - 0.26, k), base[1] + Math.sin(k * Math.PI) * 0.12, base[2]], ry: -0.25 + k * 0.5, rz: 0, rx: 0};
  }
  return {p: base, ry: -0.25 + Math.sin(t * 0.5) * 0.08, rz: 0, rx: 0};
};

const Escena: React.FC<{t: number}> = ({t}) => {
  const {pos, obj, fov} = (() => {
    if (t >= TIRO.dentro && t < TIRO.fuera) {
      const a = posAjo(t).p;
      return {pos: new THREE.Vector3(a[0] + 0.1, a[1] + 0.12, a[2] + 0.9 - (t - TIRO.dentro) * 0.02), obj: new THREE.Vector3(a[0] + 0.04, a[1] + 0.01, a[2]), fov: 32};
    }
    if (t >= TIRO.fuera && t < ev.pero2 - 0.1) return {pos: new THREE.Vector3(0.0, 1.35, 2.2), obj: new THREE.Vector3(0, 1.05, -0.1), fov: 36};
    if (t >= ev.pero2 - 0.1 && t < ev.filtro - 0.6) {
      const a = posAjo(t).p;
      return {pos: new THREE.Vector3(a[0] + 0.25, a[1] + 0.22, a[2] + 0.85), obj: new THREE.Vector3(a[0] + 0.12, a[1] + 0.04, a[2]), fov: 32};
    }
    if (t >= ev.filtro - 0.6 && t < ev.pero3 - 0.1) return {pos: new THREE.Vector3(0.1, 1.35, 1.9), obj: new THREE.Vector3(0.05, 1.08, -0.1), fov: 36};
    if (t >= ev.pero3 - 0.1 && t < ev.pero4 - 0.1) return {pos: new THREE.Vector3(0.2, 1.45, 2.4 - (t - ev.pero3) * 0.03), obj: new THREE.Vector3(0.05, 1.15, -0.1), fov: 38};
    if (t >= ev.pero4 - 0.1 && t < ev.ahora - 0.15) return {pos: new THREE.Vector3(0.1, 1.35, 1.75), obj: new THREE.Vector3(-0.05, 1.05, -0.1), fov: 36};
    if (t >= ev.ahora - 0.15) {
      const a = posAjo(t).p;
      const k = r(t, ev.lastima - 0.4, 0.6);
      return {pos: new THREE.Vector3(lerp(0.05, a[0] + 0.3, k), lerp(1.3, a[1] + 0.15, k), lerp(1.8, a[2] + 0.8, k)), obj: new THREE.Vector3(lerp(0, a[0] + 0.12, k), lerp(1.05, a[1] - 0.02, k), a[2]), fov: 36 - k * 4};
    }
    return poseCamara(t, POSES, 0.9);
  })();
  // tío
  const camina = r(t, 0, 2.0);
  const tioX = lerp(-3.0, MESA_TIO, camina);
  const conTio = t < TIRO.pecera;
  const saluda = ventana(t, ev.felicidades - 0.1, TIRO.pecera, 0.3);
  const deja = r(t, 2.0, 0.4);
  const bolsaP: [number, number, number] = [lerp(tioX + 0.6, BOLSA[0], deja), lerp(1.2, BOLSA[1], deja) + Math.sin(deja * Math.PI) * 0.1, lerp(0.3, BOLSA[2], deja)];
  // pecera
  const enPecera = t >= TIRO.pecera;
  const grava = enPecera ? 1 - r(t, ev.fondo - 0.1, 0.6) : 0;
  const arena = r(t, ev.arena - 0.3, 0.5);
  const sucia = ventana(t, ev.sucia - 0.4, ev.grandes - 0.2, 0.4);
  const filtro = r(t, ev.filtro - 0.2, 0.35);
  const lampara = ventana(t, ev.lampara - 0.15, ev.pero1 + 0.5, 0.25);
  const sol = ventana(t, ev.verano - 0.3, ev.temperatura - 0.2, 0.4);
  // ajolote
  const a = posAjo(t);
  const panza = r(t, ev.panza - 0.2, 0.5) * (1 - r(t, ev.fondo - 0.2, 0.5));
  let branq = 1;
  branq -= 0.45 * r(t, ev.plumitas2, 1.2);
  branq += 0.45 * r(t, ev.branquias - 0.2, 0.6);
  branq -= 0.5 * ventana(t, ev.queman - 0.3, ev.grandes - 0.1, 0.4);
  branq += 0.3 * ventana(t, ev.esponjadas - 0.3, ev.filtro + 0.4, 0.4);
  branq -= 0.35 * ventana(t, ev.estresa - 0.2, ev.temperatura - 0.2, 0.5);
  branq += 0.15 * r(t, ev.feliz2 - 0.3, 0.4);
  const branqColor = sucia > 0.5 ? '#b8323a' : BRANQ;
  const chupa = t > ev.chupando - 0.1 && t < ev.traga ? Math.max(0, Math.sin((t - ev.chupando) * 4.2)) : 0;
  const pataEsc = t > ev.lastima - 0.1 ? Math.min(1, cl((t - ev.lastima + 0.1) / 0.15) > 0 && t < ev.pata + 0.3 ? 0 : r(t, ev.pata + 0.3, 1.0)) : 1;
  const marca = ventana(t, ev.marcada - 0.2, ev.mira, 0.3);
  const brillo = ventana(t, ev.baba - 0.2, ev.quitan, 0.3);
  // mano
  const mano = ventana(t, ev.agarrar - 0.6, ev.marcada + 0.2, 0.4) + ventana(t, ev.manos - 0.4, ev.toca + 0.1, 0.3) * 0.7;
  const manoHasta = new THREE.Vector3(C.x + 0.02, PISO_P + 0.18, C.z + 0.08);
  const manoDesde = new THREE.Vector3(C.x + 0.9, PISO_P + 1.3, C.z + 0.6);
  // comida chupada
  const absorbidas = cl((t - ev.chupando) / (ev.traga - ev.chupando));
  return (
    <>
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[-0.4, 1, 0.65]} area={4} centro={[0, 0.8, 0]} amb={1.0} sol={0.6 + sol * 0.3} />
      <Cuarto sol={sol} />
      {conTio && (
        <>
          <group position={[tioX, 0, 0.2]} rotation={[0, lerp(Math.PI / 2, 0.5, r(t, 2.0, 0.6)), 0]}>
            <Tio t={t} anda={t < 2.0 ? 1 : 0} brazos={1 - deja} saluda={saluda} />
          </group>
          <group position={bolsaP}>
            <Bolsa t={t} />
          </group>
        </>
      )}
      <Pecera t={t} grava={grava} arena={arena} sucia={sucia} filtro={filtro} lampara={lampara} />
      {enPecera && (
        <group position={a.p} rotation={[a.rx, a.ry, a.rz]} scale={0.22}>
          <Ajolote
            t={t}
            panza={panza}
            branq={branq}
            branqColor={branqColor}
            corte={t >= TIRO.dentro && t < TIRO.fuera}
            piedras={cl((t - ev.piedritas2 + 0.3) / 1.2)}
            pataEsc={pataEsc}
            boca={chupa}
            marca={marca}
            brillo={brillo}
          />
        </group>
      )}
      {/* gusanito que ignora */}
      {t > ev.come - 0.5 && t < ev.chupando + 0.5 && (
        <P
          geo={G('gusano', () => tuboAhusado([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.01, 0.01), new THREE.Vector3(0.06, 0, -0.01), new THREE.Vector3(0.09, 0.012, 0)], () => 0.008, 20, 6))}
          color="#c0392b"
          position={[a.p[0] + 0.22 - absorbidas * 0.05, a.p[1] - 0.04, a.p[2] + 0.02]}
          rotation={[0, Math.sin(t * 4) * 0.3, 0]}
          linea={0}
          silueta={1}
        />
      )}
      {/* piedritas que vuelan a la boca */}
      {t > ev.chupando && t < ev.traga + 0.2 &&
        Array.from({length: 10}, (_, i) => {
          const u = cl(((t - ev.chupando) * 1.4 - i * 0.18) % 1.2);
          const boca = new THREE.Vector3(a.p[0] + 0.21, a.p[1] - 0.01, a.p[2] + 0.02);
          const ini = new THREE.Vector3(boca.x + 0.06 + rnd(i) * 0.12, PISO_P + 0.03, boca.z + (rnd(i + 1) - 0.5) * 0.12);
          const p = ini.lerp(boca, suave(u));
          if (u >= 1) return null;
          return <P key={i} geo={esf(0.018, 8)} color={['#e0453a', '#2f6fe0', '#ffd23a', '#3cb54a', '#a64ad6'][i % 5]} position={[p.x, p.y, p.z]} linea={0} silueta={1} sombra={false} />;
        })}
      {/* burbujas de oxígeno a las branquias */}
      {t > ev.respira - 0.2 && t < ev.sucia - 0.3 &&
        Array.from({length: 8}, (_, i) => {
          const ph = (t * 0.6 + i / 8) % 1;
          return <Sprite key={i} tex={texBurbuja()} pos={[a.p[0] + 0.3 - ph * 0.22, a.p[1] + 0.02 + ph * 0.05, a.p[2] + 0.1 - ph * 0.04]} escala={[0.02, 0.02]} o={Math.sin(ph * Math.PI)} />;
        })}
      {/* frío / lagos */}
      {Array.from({length: 14}, (_, i) => {
        const o = ventana(t, ev.lagos - 0.2, ev.veinte - 0.1, 0.3);
        if (o <= 0) return null;
        const y = 1.6 - (((t - ev.lagos) * 0.15 + rnd(i)) % 1) * 0.9;
        return <Sprite key={'c' + i} tex={texCopo()} pos={[-0.6 + rnd(i + 2) * 1.2, y, 0.3 + rnd(i + 4) * 0.3]} escala={[0.05, 0.05]} o={o} rot={t + i} />;
      })}
      {mano > 0.01 && <Mano desde={manoDesde} hasta={manoDesde.clone().lerp(manoHasta, mano)} />}
    </>
  );
};

// ---------- capa 2D ----------
Object.assign(ICONOS, {
  ajolote: (
    <g>
      <ellipse cx={52} cy={56} rx={30} ry={22} fill="#f7a8b8" stroke="#16171c" strokeWidth={4} />
      {[-1, 1].map((s) => [0, 1, 2].map((k) => <path key={`${s}${k}`} d={`M${52 + s * 24} ${44 + k * 8} C${52 + s * 36} ${36 + k * 8} ${52 + s * 40} ${30 + k * 10} ${52 + s * 44} ${28 + k * 12}`} fill="none" stroke="#e2456a" strokeWidth={6} strokeLinecap="round" />))}
      <circle cx={42} cy={52} r={4} fill="#16171c" />
      <circle cx={62} cy={52} r={4} fill="#16171c" />
      <path d="M40 64 C48 70 56 70 64 64" fill="none" stroke="#16171c" strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  piedras: (
    <g>
      {[[30, 64, '#e0453a'], [48, 70, '#2f6fe0'], [66, 64, '#ffd23a'], [40, 50, '#3cb54a'], [58, 50, '#a64ad6']].map(([x, y, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={9} fill={c as string} stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  lampara: (
    <g>
      <path d="M30 40 L70 40 L80 60 L20 60Z" fill="#ffd23a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <path d="M50 20 L50 40" stroke="#16171c" strokeWidth={4} />
      <path d="M34 70 L28 84 M50 70 L50 86 M66 70 L72 84" stroke="#ff9a1a" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  pecera: (
    <g>
      <rect x={14} y={28} width={72} height={50} rx={4} fill="#bfe9f5" stroke="#16171c" strokeWidth={4} />
      <path d="M14 40 L86 40" stroke="#16171c" strokeWidth={3} />
      <ellipse cx={50} cy={60} rx={14} ry={7} fill="#f7a8b8" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  panza: (
    <g>
      <ellipse cx={50} cy={54} rx={30} ry={26} fill="#f7a8b8" stroke="#16171c" strokeWidth={4} />
      <path d="M38 52 L46 52 M54 52 L62 52" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
      <path d="M40 66 C46 62 54 62 60 66" fill="none" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  arena: (
    <g>
      <path d="M10 70 C30 56 46 66 60 58 C72 52 82 58 90 56 L90 84 L10 84Z" fill="#ead7ad" stroke="#16171c" strokeWidth={4} />
      {[24, 40, 56, 72].map((x) => (
        <circle key={x} cx={x} cy={74} r={2} fill="#a07a46" />
      ))}
    </g>
  ),
  branquias: (
    <g>
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M30 ${70 - k * 8} C40 ${50 - k * 8} 60 ${40 - k * 10} 80 ${34 - k * 10}`} fill="none" stroke="#e2456a" strokeWidth={10} strokeLinecap="round" />
      ))}
    </g>
  ),
  burbuja: (
    <g>
      {[[40, 60, 16], [62, 40, 11], [64, 68, 8]].map(([x, y, rr], i) => (
        <circle key={i} cx={x} cy={y} r={rr} fill="#cdeffa" stroke="#16171c" strokeWidth={4} />
      ))}
      <text x={40} y={66} textAnchor="middle" fontSize={16} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        O₂
      </text>
    </g>
  ),
  sucia: (
    <g>
      <rect x={14} y={28} width={72} height={50} rx={4} fill="#9a9446" stroke="#16171c" strokeWidth={4} />
      {[[30, 46], [52, 60], [70, 42], [40, 68], [64, 70]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="#5a4a1e" />
      ))}
    </g>
  ),
  filtro: (
    <g>
      <rect x={34} y={18} width={30} height={64} rx={5} fill="#3a3b42" stroke="#16171c" strokeWidth={4} />
      {[[74, 70, 6], [78, 52, 5], [72, 34, 4]].map(([x, y, rr], i) => (
        <circle key={i} cx={x} cy={y} r={rr} fill="#cdeffa" stroke="#16171c" strokeWidth={3} />
      ))}
    </g>
  ),
  feliz: (
    <g>
      <circle cx={50} cy={50} r={32} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <circle cx={40} cy={44} r={4} fill="#16171c" />
      <circle cx={60} cy={44} r={4} fill="#16171c" />
      <path d="M36 58 C44 70 56 70 64 58" fill="none" stroke="#16171c" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  calendario2: (
    <g>
      <rect x={18} y={22} width={64} height={60} rx={8} fill="#fff" stroke="#16171c" strokeWidth={4} />
      <rect x={18} y={22} width={64} height={16} rx={6} fill="#2f6fe0" stroke="#16171c" strokeWidth={4} />
      <text x={50} y={74} textAnchor="middle" fontSize={26} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        1×
      </text>
    </g>
  ),
  lago: (
    <g>
      <path d="M14 66 L34 34 L50 52 L64 30 L86 66Z" fill="#cfd9e6" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <ellipse cx={50} cy={72} rx={36} ry={10} fill="#7fc6e8" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  baba: (
    <g>
      <path d="M50 14 C62 34 76 48 76 64 C76 80 64 88 50 88 C36 88 24 80 24 64 C24 48 38 34 50 14Z" fill="#cdeffa" stroke="#16171c" strokeWidth={4} />
      <ellipse cx={42} cy={60} rx={6} ry={10} fill="#ffffff" />
    </g>
  ),
  ojo: (
    <g>
      <path d="M10 50 C30 24 70 24 90 50 C70 76 30 76 10 50Z" fill="#ffffff" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={50} r={14} fill="#2f6fe0" stroke="#16171c" strokeWidth={3} />
      <circle cx={50} cy={50} r={6} fill="#16171c" />
    </g>
  ),
  pata: (
    <g>
      <path d="M50 16 L50 58" stroke="#f7a8b8" strokeWidth={16} strokeLinecap="round" />
      <path d="M50 58 L32 80 M50 58 L44 84 M50 58 L56 84 M50 58 L68 80" stroke="#e9879b" strokeWidth={7} strokeLinecap="round" />
      <path d="M50 16 L50 58" stroke="#16171c" strokeWidth={3} strokeDasharray="4 4" />
    </g>
  ),
});

const IZQ: Ic[] = [
  [T('méxico') - 0.05, 'hoja', 'México'],
  [ev.bichito - 0.05, 'ajolote', 'bichito rosado'],
  [ev.plumitas - 0.05, 'branquias', 'plumitas'],
  [ev.ajolote - 0.05, 'ajolote', 'ajolote', 'ok', ev.ajolote + 0.2],
  [ev.pecera - 0.05, 'pecera', 'pecera'],
  [ev.lampara - 0.05, 'lampara', 'lámpara fuerte'],
  [ev.come - 0.1, 'plato', 'no come', 'no', ev.come + 0.15],
  [ev.chupando - 0.05, 'burbuja', 'chupa de golpe'],
  [ev.tripas - 0.1, 'panza', 'tripas tapadas', 'no', ev.tripas + 0.1],
  [ev.arena - 0.05, 'arena', 'arena fina', 'ok', ev.arena + 0.3],
  [ev.encogen - 0.05, 'branquias', 'se encogen', 'no', ev.encogen + 0.1],
  [ev.respira - 0.05, 'burbuja', 'respira'],
  [ev.sucia - 0.05, 'sucia', 'agua sucia', 'no', ev.sucia + 0.2],
  [ev.esponjadas - 0.05, 'feliz', 'está feliz', 'ok', ev.esponjadas + 0.3],
  [ev.cambiarle - 0.05, 'calendario2', 'agua cada semana'],
  [ev.verano - 0.05, 'sol', 'verano'],
  [ev.lagos - 0.05, 'lago', 'lagos fríos'],
  [ev.estresa - 0.05, 'termometro', 'más de 20°', 'no', ev.estresa + 0.1],
  [ev.agarrar - 0.05, 'mano', 'agarrarlo'],
  [ev.baba - 0.05, 'baba', 'capa de baba'],
  [ev.mira - 0.05, 'ojo', 'se mira', 'ok', ev.mira + 0.15],
  [ev.feliz2 - 0.1, 'ajolote', 'ajolote feliz', 'ok', ev.feliz2 + 0.1],
];
const DER: Ic[] = [
  [ev.sonrie - 0.05, 'feliz', 'sonríe'],
  [ev.felicidades + 0.3, '', ''],
  [ev.piedritas - 0.05, 'piedras', 'piedritas'],
  [ev.listo - 0.1, 'piedras', 'piedritas', 'ok', ev.listo],
  [ev.panza - 0.05, 'panza', 'panza hinchada', 'no', ev.panza + 0.3],
  [ev.piedritas2 - 0.05, 'piedras', 'se las traga', 'no', ev.piedritas2 + 0.2],
  [ev.piso - 0.1, 'casa', 'su piso', 'ok', ev.piso + 0.1],
  [ev.branquias - 0.05, 'branquias', 'branquias'],
  [ev.queman - 0.05, 'sangre', 'se queman', 'no', ev.queman + 0.15],
  [ev.filtro - 0.05, 'filtro', 'filtro suave', 'ok', ev.filtro + 0.3],
  [ev.flotando - 0.05, 'enfermo', 'flotando', 'no', ev.flotando + 0.3],
  [ev.temperatura - 0.15, 'copo', 'agua fresca', 'ok', ev.temperatura + 0.1],
  [ev.resbala - 0.05, 'baba', 'se resbala'],
  [ev.quitan - 0.1, 'mano', 'tus manos', 'no', ev.quitan + 0.1],
  [ev.toca - 0.1, 'mano', 'no se toca', 'no', ev.toca + 0.05],
  [ev.lastima - 0.05, 'pata', 'pierde una pata'],
  [ev.crecer - 0.15, 'pata', 'le vuelve a crecer', 'ok', ev.crecer + 0.1],
];

const ROJAS = new Set(['méxico', 'rosado', 'sonríe', 'plumitas', 'felicidades', 'ajolote', 'piedritas', 'colores', 'lámpara', 'listo', 'come', 'panza', 'hinchada', 'chupando', 'golpe', 'traga', 'tripas', 'limpio', 'arena', 'piso', 'encogen', 'branquias', 'respira', 'sucia', 'queman', 'esponjadas', 'feliz', 'filtro', 'semana', 'verano', 'flotando', 'fríos', '20', 'grados', 'estresa', 'enferma', 'temperatura', 'resbala', 'marcada', 'baba', 'protege', 'manos', 'mira', 'toca', 'pata', 'crecer']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

const Termometro: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.verano - 0.2, ev.pero4 - 0.1, 0.3);
  if (o <= 0) return null;
  const temp = lerp(16, 26, r(t, ev.verano, 1.6)) - 9 * r(t, ev.temperatura - 0.3, 0.8);
  const h = cl((temp - 10) / 20);
  return (
    <div style={{position: 'absolute', right: 70, top: 420, opacity: o, fontFamily: FUENTE, textAlign: 'center'}}>
      <svg width={120} height={420} viewBox="0 0 120 420">
        <rect x={40} y={10} width={40} height={340} rx={20} fill="#fff" stroke="#16171c" strokeWidth={6} />
        <rect x={50} y={20 + (1 - h) * 320} width={20} height={h * 320 + 20} fill={temp > 20 ? '#e0453a' : '#2f6fe0'} />
        <circle cx={60} cy={370} r={38} fill={temp > 20 ? '#e0453a' : '#2f6fe0'} stroke="#16171c" strokeWidth={6} />
        <line x1={24} x2={96} y1={20 + 0.5 * 320} y2={20 + 0.5 * 320} stroke="#16171c" strokeWidth={5} strokeDasharray="8 6" />
      </svg>
      <div style={{fontWeight: 900, fontSize: 58, color: temp > 20 ? '#e0453a' : '#2f6fe0', WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill'}}>{Math.round(temp)}°</div>
    </div>
  );
};

export const AjoloteVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const calor = ventana(t, ev.verano - 0.3, ev.temperatura - 0.2, 0.4);
  return (
    <AbsoluteFill style={{background: '#cfe6e0'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.03, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#ff9a3a', mixBlendMode: 'multiply', opacity: 0.2 * calor}} />
      <div style={{position: 'absolute', inset: 0, background: '#7fb6ff', mixBlendMode: 'multiply', opacity: 0.22 * ventana(t, ev.lagos - 0.2, ev.veinte - 0.1, 0.3)}} />
      <Confeti t={t} t0={ev.felicidades} />
      <Termometro t={t} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.crecer - 0.1} texto="¡REGENERA!" sub="patas, cola y más" color="#2f9e44" />
      <Audio src={staticFile('ajolote_m/voz.wav')} />
      <Audio src={staticFile('ajolote_m/musica.wav')} />
    </AbsoluteFill>
  );
};
