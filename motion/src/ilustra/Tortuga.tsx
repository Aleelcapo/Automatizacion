import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/tortuga.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, canvasTex, cil, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {Confeti, Halo, ICONOS, Ic, Ranura, Sello, Sprite, Tio, crearSubtitulo, texEstrella, texOndas} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_TORTUGA = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  estados: T('estados'),
  tortuguita: T('tortuguita', 1),
  moneda: T('moneda'),
  rayas: T('rayas'),
  felicidades: T('felicidades'),
  orejas: T('orejas'),
  pones: T('pones'),
  tupper: T('tupper', 1),
  palmerita: T('palmerita'),
  listo: T('listo'),
  pero1: T('pero', 1),
  meses: T('meses'),
  pelando: T('pelando'),
  manchas: T('manchas'),
  es1: T('es', 1),
  secarse: T('secarse'),
  lampara: T('lámpara'),
  ultravioleta: T('ultravioleta'),
  hongos: T('hongos'),
  sol: T('sol'),
  pero2: T('pero', 2),
  comida: T('comida', 1),
  fuera: T('fuera'),
  saliva: T('saliva'),
  dentro: T('dentro'),
  comedor: T('comedor'),
  pero3: T('pero', 3),
  huele: T('huele'),
  popo: T('popó'),
  filtro: T('filtro'),
  pero4: T('pero', 4),
  tortuguita3: T('tortuguita', 3),
  crece: T('crece'),
  centimetros: T('centímetros'),
  anos: T('años'),
  acuario: T('acuario'),
  importante: T('importante:'),
  suelta: T('suelta'),
  lago: T('lago'),
  desplaza: T('desplaza'),
  plaga: T('plaga'),
  ahora: T('ahora', 2),
  feliz: T('feliz'),
  vida: T('vida…'),
  soltarla: T('soltarla'),
};

// ---------- tortuga ----------
const geoCaparazon = () =>
  G('torCap', () => {
    const g = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1.15, 0.55, 1);
    const p = g.getAttribute('position');
    const col: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = p.getY(i);
      const hex = Math.sin(x * 9) * Math.sin(z * 9) > 0.25;
      c.set(y < 0.06 ? '#e5c85a' : hex ? '#3f7a3a' : '#5a9a48');
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  });
const Tortuga: React.FC<{t: number; manchas?: number; anda?: number; cabezaFuera?: number; boca?: number; seca?: number}> = ({t, manchas = 0, anda = 0, cabezaFuera = 1, boca = 0}) => (
  <group>
    <P geo={geoCaparazon()} vc color="#ffffff" linea={0} silueta={2} />
    <P geo={cil(0.55, 0.55, 0.06, 32)} color="#e5c85a" position={[0, 0.0, 0]} scale={[1.12, 1, 0.98]} linea={0} silueta={1.6} />
    {manchas > 0.01 &&
      Array.from({length: 9}, (_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const d = 0.15 + rnd(i + 3) * 0.25;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const y = 0.275 * Math.sqrt(Math.max(0, 1 - (x / 0.575) ** 2 - (z / 0.5) ** 2)) + 0.005;
        return i < manchas * 9 ? <P key={i} geo={esf(0.05, 10)} color="#f4f1ea" position={[x, y, z]} scale={[1.2, 0.25, 1]} linea={0} silueta={0} sombra={false} /> : null;
      })}
    {/* cabeza */}
    <group position={[0.55 * cabezaFuera + 0.05, 0.05, 0]}>
      <P geo={cil(0.09, 0.1, 0.25, 14)} color="#4f8a3e" rotation={[0, 0, Math.PI / 2]} position={[-0.08, 0, 0]} linea={0} silueta={1.6} />
      <P geo={esf(0.13, 18)} color="#4f8a3e" position={[0.08, 0.03, 0]} scale={[1.25, 0.9, 0.95]} linea={0} silueta={1.8} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <P geo={esf(0.045, 10)} color="#e0302a" position={[0.0, 0.03, s * 0.11]} scale={[1.8, 0.6, 0.4]} linea={0} silueta={0} />
          <P geo={esf(0.03, 10)} color="#f6d23a" position={[0.14, 0.07, s * 0.08]} linea={0} silueta={1} />
          <P geo={esf(0.016, 8)} color="#141418" position={[0.155, 0.075, s * 0.1]} linea={0} silueta={0} />
        </group>
      ))}
      <group position={[0.2, -0.03, 0]} rotation={[0, 0, -boca * 0.4]}>
        <P geo={caja(0.1, 0.01, 0.12)} color="#2d4a24" position={[-0.03, 0, 0]} linea={0} silueta={0} />
      </group>
    </group>
    {/* patas */}
    {[[0.32, 1, 0], [0.32, -1, Math.PI], [-0.32, 1, Math.PI], [-0.32, -1, 0]].map(([x, s, f], i) => (
      <P key={i} geo={esf(0.1, 12)} color="#4f8a3e" position={[x + Math.sin(t * 6 + f) * 0.05 * anda, -0.04, s * 0.38]} scale={[1.4, 0.5, 1]} rotation={[0, Math.sin(t * 6 + f) * 0.4 * anda, 0]} linea={0} silueta={1.4} />
    ))}
    <P geo={G('torCola', () => new THREE.ConeGeometry(0.05, 0.16, 8))} color="#4f8a3e" position={[-0.62, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} linea={0} silueta={1.2} />
  </group>
);

// ---------- cocina / mesa ----------
let _azulejo: THREE.CanvasTexture | null = null;
const texAzulejo = () => {
  if (_azulejo) return _azulejo;
  _azulejo = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#e6f1f3';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#a9c6cc';
      g.lineWidth = 4;
      for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64, 256);
        g.moveTo(0, i * 64);
        g.lineTo(256, i * 64);
        g.stroke();
      }
    },
    [10, 4],
  );
  return _azulejo;
};
const MESA_H = 0.85;
const Cocina: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#d9c6a6" />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#ffffff" mapa={texAzulejo()} position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    <P geo={caja(3.0, MESA_H, 0.8)} color="#f4f1ea" position={[0, MESA_H / 2, -0.4]} />
    <P geo={caja(3.05, 0.05, 0.85)} color="#7a7f88" position={[0, MESA_H + 0.025, -0.4]} />
    {[-1.1, -0.35, 0.4, 1.15].map((x) => (
      <P key={x} geo={caja(0.7, 0.7, 0.02)} color="#e8e4dc" position={[x, 0.42, 0.01]} />
    ))}
  </group>
);

const Tupper: React.FC<{t: number}> = ({t}) => (
  <group>
    <P geo={caja(0.5, 0.18, 0.35)} color="#eaf6fb" position={[0, 0.09, 0]} opacity={0.25} linea={1.4} silueta={0} umbral={10} sombra={false} />
    <mesh position={[0, 0.03, 0]}>
      <boxGeometry args={[0.48, 0.05, 0.33]} />
      <meshBasicMaterial color="#9fd8ef" transparent opacity={0.45} depthWrite={false} />
    </mesh>
    <group position={[0.15, 0, -0.08]}>
      <P geo={cil(0.012, 0.016, 0.25, 6)} color="#8a6a3a" position={[0, 0.125, 0]} linea={0} silueta={1} />
      {[0, 1, 2, 3, 4].map((k) => (
        <P key={k} geo={esf(0.06, 10)} color="#3fae4a" position={[Math.cos(k * 1.26) * 0.06, 0.25, Math.sin(k * 1.26) * 0.06]} scale={[1.6, 0.25, 0.6]} rotation={[0, -k * 1.26, -0.4]} linea={0} silueta={1} />
      ))}
    </group>
    {void t}
  </group>
);

const AW = 1.6;
const AH = 0.7;
const AD = 0.6;
const Acuario: React.FC<{t: number; sucia: number; filtro: number; isla: number; lamp: number}> = ({t, sucia, filtro, isla, lamp}) => {
  const agua = new THREE.Color('#9fd8ef').lerp(new THREE.Color('#8a8a3a'), sucia).getStyle();
  return (
    <group>
      <P geo={caja(AW + 0.06, 0.04, AD + 0.06)} color="#2a2b31" position={[0, -0.02, 0]} />
      <P geo={caja(AW + 0.06, 0.03, AD + 0.06)} color="#2a2b31" position={[0, AH + 0.015, 0]} linea={0} />
      <P geo={caja(AW - 0.02, 0.04, AD - 0.02)} color="#c9b08a" position={[0, 0.02, 0]} linea={0} silueta={0} />
      {[-0.5, -0.1, 0.4].map((x, i) => (
        <P key={i} geo={esf(0.08, 10)} color="#8c8f98" position={[x, 0.05, -0.15 + i * 0.05]} scale={[1.5, 0.6, 1]} />
      ))}
      {isla > 0.01 && (
        <group position={[0.45, 0, -0.05]} scale={[1, isla, 1]}>
          <P geo={caja(0.5, 0.42, 0.4)} color="#8a6a45" position={[0, 0.21, 0]} />
          <P geo={caja(0.55, 0.04, 0.45)} color="#a3845a" position={[0, 0.44, 0]} />
        </group>
      )}
      {filtro > 0.01 && (
        <group position={[-AW / 2 + 0.1, 0, -AD / 2 + 0.08]} scale={[1, filtro, 1]}>
          <P geo={caja(0.14, AH * 0.9, 0.08)} color="#3a3b42" position={[0, AH * 0.45, 0]} />
        </group>
      )}
      <mesh position={[0, AH * 0.33, 0]} renderOrder={5}>
        <boxGeometry args={[AW - 0.01, AH * 0.62, AD - 0.01]} />
        <meshBasicMaterial color={agua} transparent opacity={0.2 + sucia * 0.35} depthWrite={false} />
      </mesh>
      {sucia > 0.05 &&
        Array.from({length: 26}, (_, i) => (
          <P key={i} geo={esf(0.012, 6)} color="#6b5a2a" position={[(rnd(i) - 0.5) * AW * 0.9, 0.05 + ((rnd(i + 1) + t * 0.02) % 1) * AH * 0.55, (rnd(i + 2) - 0.5) * AD * 0.8]} linea={0} silueta={0} sombra={false} />
        ))}
      <P geo={caja(AW, AH, AD)} color="#dff4fb" position={[0, AH / 2, 0]} opacity={0.08} linea={1.6} silueta={0} umbral={10} sombra={false} />
      {lamp > 0.01 && (
        <group position={[0.45, AH + 0.25, -0.05]} scale={lamp}>
          <P geo={cil(0.06, 0.13, 0.14, 18)} color="#3a3b42" />
          <Halo pos={[0, -0.1, 0]} o={0.35} escala={0.22} color="#ffb070" />
          <P geo={caja(0.4, 0.04, 0.06)} color="#c9a3ff" position={[-0.35, 0.02, 0]} />
          <Halo pos={[-0.35, -0.06, 0]} o={0.3} escala={0.2} color="#b47bff" />
        </group>
      )}
    </group>
  );
};

// ---------- lago ----------
const LAGO_X = 30;
const Lago: React.FC<{t: number}> = ({t}) => (
  <group position={[LAGO_X, 0, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 20]} />
      <meshToonMaterial color="#6fbf4a" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -1.0]}>
      <circleGeometry args={[3.2, 40]} />
      <meshToonMaterial color="#4fa7d8" />
    </mesh>
    {[[-2.5, -4], [2.8, -4.5], [0, -5.5]].map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <P geo={cil(0.15, 0.22, 2.5, 10)} color="#6b4a2b" position={[0, 1.25, 0]} />
        <P geo={esf(1.0, 14)} color="#3fa548" position={[0, 2.8, 0]} scale={[1.2, 0.85, 1]} linea={0} />
      </group>
    ))}
    {/* tronco con tortugas */}
    <P geo={cil(0.12, 0.14, 1.6, 12)} color="#7a5232" position={[0.1, 0.1, -0.6]} rotation={[0, 0.2, Math.PI / 2]} />
    {void t}
  </group>
);

// ---------- escena ----------
const MESA_TIO = -1.5;
const TUP: [number, number, number] = [0.0, MESA_H + 0.05, -0.3];
const ACU: [number, number, number] = [0.0, MESA_H + 0.05, -0.45];
const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.pones - 0.35;
  const enLago = t > ev.importante - 0.3 && t < ev.ahora - 0.15;
  const acuario = t > ev.acuario - 0.6;
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.2, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.15, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.pones - 0.35, 0.3);
  const mano = V(tioX + 0.62 * Math.sin(giro) + 0.3 * Math.cos(giro), 1.3, 0.15 + 0.62 * Math.cos(giro) - 0.3 * Math.sin(giro));
  const crece = r(t, ev.crece - 0.2, 1.4);
  const esc = lerp(0.1, 0.32, crece);
  const manchas = r(t, ev.manchas - 0.3, 0.6) * (1 - r(t, ev.sol - 0.2, 0.5));
  const sucia = ventana(t, ev.huele - 0.4, ev.filtro + 0.2, 0.4);
  // posición tortuga
  let tp: [number, number, number] = [TUP[0] - 0.08, TUP[1] + 0.04, TUP[2] + 0.02];
  let ry = -0.4;
  if (acuario) {
    tp = [ACU[0] - 0.2, ACU[1] + 0.04 + 0.025 * 3.2 * esc, ACU[2] + 0.05];
    if (t > ev.ahora - 0.2) tp = [ACU[0] + 0.45, ACU[1] + 0.46 + 0.03, ACU[2] - 0.05];
  }
  // en el tupper: subir a secarse (palmera = isla)
  const seca = ventana(t, ev.secarse - 0.3, ev.pero2 - 0.1, 0.4);
  const comeFuera = ventana(t, ev.fuera - 0.3, ev.saliva, 0.3);
  if (!acuario && seca > 0) tp = [tp[0] + 0.12 * seca, tp[1] + 0.05 * seca, tp[2]];
  const boca = (t > ev.dentro - 0.2 && t < ev.comedor + 0.3) || (t > ev.popo - 1.2 && t < ev.popo) ? Math.max(0, Math.sin(t * 7)) : 0;
  const manchaComida: [number, number, number] = [TUP[0] + 0.35, TUP[1] + 0.005, TUP[2] + 0.1];

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.2], [-1.4, 1.3, 0], 42],
      [ev.tortuguita - 0.4, [mano.x + 0.12, mano.y + 0.25, mano.z + 0.75], [mano.x, mano.y + 0.05, mano.z], 32],
      [ev.felicidades - 0.25, [-1.1, 1.75, 4.2], [-1.1, 1.3, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else if (enLago) {
    const k = r(t, ev.importante - 0.3, 6);
    cam = {pos: V(LAGO_X + 0.5, 1.5 + k * 0.3, 4.5 + k * 0.5), obj: V(LAGO_X, 0.3, -0.8), fov: 40};
  } else if (acuario) {
    const k = r(t, ev.acuario - 0.6, 1.2);
    cam = {pos: V(0.15, lerp(1.5, 1.85, k), lerp(1.5, 2.9, k)), obj: V(0.05, MESA_H + 0.3, ACU[2]), fov: 38};
  } else {
    const cerca = ventana(t, ev.pero1 - 0.1, ev.es1, 0.4) + ventana(t, ev.pero2 - 0.1, ev.comedor + 0.3, 0.4) + ventana(t, ev.pero4 - 0.1, ev.acuario - 0.6, 0.4);
    cam = {pos: V(lerp(0.15, tp[0] + 0.15, cerca), lerp(1.55, tp[1] + 0.35, cerca), lerp(1.4, tp[2] + 0.65, cerca)), obj: V(lerp(0, tp[0], cerca), lerp(MESA_H + 0.08, tp[1] + 0.03, cerca), TUP[2]), fov: 36};
  }

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[-0.4, 1, 0.65]} area={enLago ? 8 : 4} centro={[enLago ? LAGO_X : 0, 0.8, 0]} amb={1.0} sol={0.6} />
      {!enLago && <Cocina />}
      {enLago && <Lago t={t} />}
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={mano.toArray() as [number, number, number]} rotation={[0, giro - 0.6, 0]} scale={0.1}>
            <Tortuga t={t} />
          </group>
          <P geo={esf(0.06, 12)} color="#f2b48c" position={[mano.x, mano.y - 0.05, mano.z]} scale={[1.6, 0.5, 1.3]} linea={0} silueta={1.4} />
        </>
      )}
      {!conTio && !enLago && !acuario && (
        <group position={TUP}>
          <Tupper t={t} />
        </group>
      )}
      {!conTio && !enLago && acuario && (
        <group position={ACU}>
          <Acuario t={t} sucia={0} filtro={1} isla={1} lamp={1} />
        </group>
      )}
      {!conTio && !enLago && !acuario && sucia > 0 && (
        <mesh position={[TUP[0], TUP[1] + 0.06, TUP[2]]}>
          <boxGeometry args={[0.47, 0.03, 0.32]} />
          <meshBasicMaterial color="#8a8a3a" transparent opacity={0.5 * sucia} depthWrite={false} />
        </mesh>
      )}
      {!conTio && !enLago && (
        <group position={tp} rotation={[0, ry, 0]} scale={esc}>
          <Tortuga t={t} manchas={manchas} anda={t > ev.pero2 - 0.2 && t < ev.saliva ? 1 : 0} boca={boca} />
        </group>
      )}
      {/* lámpara sobre el tupper */}
      {!acuario && !conTio && seca > 0.01 && (
        <group position={[TUP[0] + 0.1, TUP[1] + 0.45, TUP[2]]} scale={seca}>
          <P geo={cil(0.05, 0.11, 0.12, 18)} color="#3a3b42" />
          <Halo pos={[0, -0.1, 0]} o={0.35} escala={0.2} color="#ffb070" />
        </group>
      )}
      {/* comida afuera */}
      {comeFuera > 0.01 && !acuario && (
        <group position={manchaComida}>
          {[0, 1, 2, 3].map((i) => (
            <P key={i} geo={cil(0.012, 0.012, 0.03, 8)} color="#a26b35" position={[(rnd(i) - 0.5) * 0.06, 0.006, (rnd(i + 2) - 0.5) * 0.06]} rotation={[Math.PI / 2, 0, i]} linea={0} silueta={0.8} />
          ))}
        </group>
      )}
      {/* comida adentro del agua */}
      {t > ev.dentro - 0.3 && t < ev.comedor + 0.4 &&
        [0, 1, 2].map((i) => <P key={i} geo={cil(0.012, 0.012, 0.03, 8)} color="#a26b35" position={[tp[0] + 0.06 + i * 0.02, tp[1] + 0.02 - ((t * 0.1 + i * 0.3) % 0.04), tp[2] + 0.05]} rotation={[Math.PI / 2, 0, i]} linea={0} silueta={0.8} />)}
      {/* olor */}
      {sucia > 0.3 && !acuario &&
        [0, 1].map((i) => <Sprite key={i} tex={texOndas()} pos={[TUP[0] - 0.1 + i * 0.2, TUP[1] + 0.3 + ((t * 0.3 + i * 0.5) % 1) * 0.15, TUP[2]]} escala={[0.06, 0.12]} o={sucia} />)}
      {/* lago: tortugas soltadas y nativas */}
      {enLago && (
        <>
          {[-0.45, -0.1, 0.25, 0.6].map((x, i) => {
            const desplazada = i < 2 && t > ev.desplaza - 0.4;
            const dx = desplazada ? r(t, ev.desplaza - 0.4, 1.2) * -2 : 0;
            return (
              <group key={i} position={[LAGO_X + x * 1.6 + dx, 0.27, -0.6]} rotation={[0, -0.3 + i * 0.4, 0]} scale={0.32}>
                <Tortuga t={t + i} anda={desplazada ? 1 : 0} />
              </group>
            );
          })}
          {t > ev.suelta - 0.3 && (
            <group position={[LAGO_X + lerp(1.8, 0.9, r(t, ev.suelta - 0.3, 1.2)), 0.05, lerp(0.8, -0.2, r(t, ev.suelta - 0.3, 1.2))]} rotation={[0, 2.6, 0]} scale={0.36}>
              <Tortuga t={t} anda={1} />
            </group>
          )}
        </>
      )}
      {t > ev.moneda - 0.2 && t < ev.rayas && conTio && <Sprite tex={texEstrella()} pos={[mano.x + 0.08, mano.y + 0.08, mano.z]} escala={[0.05, 0.05]} o={1} rot={t * 3} />}
    </>
  );
};

// ---------- capa 2D ----------
Object.assign(ICONOS, {
  tortuga: (
    <g>
      <path d="M18 62 C18 36 82 36 82 62Z" fill="#5a9a48" stroke="#16171c" strokeWidth={4} />
      <path d="M30 50 L44 44 L56 44 L70 50" fill="none" stroke="#3f7a3a" strokeWidth={4} />
      <circle cx={88} cy={58} r={9} fill="#4f8a3e" stroke="#16171c" strokeWidth={3} />
      <path d="M82 56 L90 56" stroke="#e0302a" strokeWidth={3} />
      <rect x={14} y={60} width={72} height={6} fill="#e5c85a" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  moneda: (
    <g>
      <circle cx={50} cy={50} r={30} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      <circle cx={50} cy={50} r={20} fill="none" stroke="#c99a1a" strokeWidth={4} />
      <text x={50} y={60} textAnchor="middle" fontSize={26} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        $
      </text>
    </g>
  ),
  rayas: (
    <g>
      <ellipse cx={50} cy={50} rx={30} ry={24} fill="#4f8a3e" stroke="#16171c" strokeWidth={4} />
      <path d="M28 52 L56 52" stroke="#e0302a" strokeWidth={8} strokeLinecap="round" />
      <circle cx={66} cy={44} r={5} fill="#f6d23a" stroke="#16171c" strokeWidth={2} />
    </g>
  ),
  tupper: (
    <g>
      <rect x={16} y={36} width={68} height={40} rx={6} fill="#eaf6fb" stroke="#16171c" strokeWidth={4} />
      <rect x={20} y={60} width={60} height={12} fill="#9fd8ef" />
      <path d="M60 60 L60 40 M60 40 C52 36 48 40 46 44 M60 40 C68 36 72 40 74 44" fill="none" stroke="#3fae4a" strokeWidth={4} />
    </g>
  ),
  hongo: (
    <g>
      <path d="M20 54 C20 30 80 30 80 54Z" fill="#5a9a48" stroke="#16171c" strokeWidth={4} />
      {[[36, 44], [52, 40], [64, 48], [44, 52]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={6} fill="#f4f1ea" stroke="#16171c" strokeWidth={2} />
      ))}
    </g>
  ),
  agua: (
    <g>
      <path d="M10 56 C24 44 36 68 50 56 C64 44 76 68 90 56 L90 86 L10 86Z" fill="#7fc6e8" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  popo: (
    <g>
      <path d="M28 78 C20 78 20 66 30 64 C24 58 30 48 40 50 C38 40 50 34 56 42 C64 40 70 50 64 56 C76 58 78 76 66 78Z" fill="#8a5634" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  acuario: (
    <g>
      <rect x={8} y={30} width={84} height={48} fill="#bfe9f5" stroke="#16171c" strokeWidth={4} />
      <rect x={60} y={48} width={22} height={30} fill="#8a6a45" stroke="#16171c" strokeWidth={3} />
      <rect x={14} y={36} width={10} height={36} fill="#3a3b42" />
    </g>
  ),
  lago: (
    <g>
      <ellipse cx={50} cy={60} rx={40} ry={18} fill="#4fa7d8" stroke="#16171c" strokeWidth={4} />
      <path d="M20 40 L20 54 M80 36 L80 52" stroke="#3fa548" strokeWidth={8} strokeLinecap="round" />
    </g>
  ),
  plaga: (
    <g>
      {[[30, 40], [64, 36], [46, 62], [74, 66], [22, 70]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x - 12} ${y + 4} C${x - 12} ${y - 10} ${x + 12} ${y - 10} ${x + 12} ${y + 4}Z`} fill="#5a9a48" stroke="#16171c" strokeWidth={3} />
          <path d={`M${x - 4} ${y - 3} L${x + 4} ${y - 3}`} stroke="#e0302a" strokeWidth={2} />
        </g>
      ))}
    </g>
  ),
  regla: (
    <g>
      <rect x={10} y={38} width={80} height={24} fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
      {[20, 30, 40, 50, 60, 70, 80].map((x) => (
        <path key={x} d={`M${x} 38 L${x} 48`} stroke="#16171c" strokeWidth={3} />
      ))}
      <text x={50} y={76} textAnchor="middle" fontSize={14} fontWeight={900} fontFamily={FUENTE} fill="#16171c">
        30 cm
      </text>
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.estados - 0.05, 'hoja', 'Estados Unidos'],
  [ev.moneda - 0.05, 'moneda', 'tamaño de moneda'],
  [ev.orejas - 0.1, 'tortuga', 'orejas rojas', 'ok', ev.orejas + 0.3],
  [ev.tupper - 0.05, 'tupper', 'un tupper'],
  [ev.pelando - 0.05, 'tortuga', 'caparazón pelado', 'no', ev.manchas],
  [ev.secarse - 0.05, 'sol', 'secarse'],
  [ev.hongos - 0.05, 'hongo', 'hongos', 'no', ev.hongos + 0.2],
  [ev.comida - 0.05, 'plato', 'comida afuera', 'no', ev.fuera + 0.3],
  [ev.dentro - 0.05, 'agua', 'come en el agua', 'ok', ev.dentro + 0.4],
  [ev.huele - 0.05, 'sucia', 'huele feo', 'no', ev.huele + 0.3],
  [ev.filtro - 0.05, 'filtro', 'filtro fuerte', 'ok', ev.filtro + 0.3],
  [ev.centimetros - 0.05, 'regla', '30 centímetros'],
  [ev.acuario - 0.05, 'acuario', 'acuario enorme', 'ok', ev.acuario + 0.3],
  [ev.suelta - 0.05, 'lago', 'la sueltan en un lago', 'no', ev.lago],
  [ev.feliz - 0.15, 'tortuga', 'tortuga feliz', 'ok', ev.feliz + 0.1],
];
const DER: Ic[] = [
  [ev.rayas - 0.05, 'rayas', 'rayas rojas'],
  [ev.felicidades + 0.3, '', ''],
  [ev.palmerita - 0.05, 'hoja', 'palmerita', 'ok', ev.listo],
  [ev.meses - 0.05, 'calendario', 'a los meses'],
  [ev.lampara - 0.05, 'uv', 'calor y luz UV'],
  [ev.sol - 0.15, 'sol', 'su sol', 'ok', ev.sol + 0.1],
  [ev.saliva - 0.05, 'baba', 'sin saliva'],
  [ev.comedor - 0.15, 'agua', 'su comedor', 'ok', ev.comedor + 0.1],
  [ev.popo - 0.05, 'popo', 'popó en el agua', 'no', ev.popo + 0.3],
  [ev.tortuguita3 - 0.3, 'tortuga', 'ya no es chiquita'],
  [ev.anos - 0.1, 'sesenta', 'más de 30 años'],
  [ev.importante - 0.05, 'calavera', 'lo importante'],
  [ev.desplaza - 0.05, 'tortuga', 'desplaza a las nativas', 'no', ev.desplaza + 0.3],
  [ev.plaga - 0.15, 'plaga', 'plaga', 'no', ev.plaga + 0.1],
  [ev.soltarla - 0.2, 'lago', 'no soltarla', 'no', ev.soltarla],
];

const ROJAS = new Set(['estados', 'unidos', 'tortuguita', 'moneda', 'rayas', 'rojas', 'felicidades', 'tortuga', 'orejas', 'tupper', 'palmerita', 'listo', 'caparazón', 'pelando', 'manchas', 'blancas', 'secarse', 'lámpara', 'calor', 'ultravioleta', 'hongos', 'sol', 'comida', 'fuera', 'saliva', 'dentro', 'comedor', 'huele', 'feo', 'popó', 'filtro', 'fuerte', '30', 'centímetros', 'años', 'acuario', 'enorme', 'importante', 'suelta', 'lago', 'desplaza', 'plaga', 'feliz', 'vida', 'soltarla']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

export const TortugaVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const enLago = t > ev.importante - 0.3 && t < ev.ahora - 0.15;
  return (
    <AbsoluteFill style={{background: enLago ? 'linear-gradient(#bfe3f7, #eef6f8 60%)' : '#e6f1f3'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.02, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="30 cm · 30 años" o={ventana(t, ev.centimetros - 0.2, ev.acuario - 0.3, 0.25)} y={420} size={104} fuente={FUENTE} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.soltarla - 0.1} texto="NO LA SUELTES" sub="es para toda la vida" />
      <Audio src={staticFile('tortuga/voz.wav')} />
      <Audio src={staticFile('tortuga/musica.wav')} />
    </AbsoluteFill>
  );
};
