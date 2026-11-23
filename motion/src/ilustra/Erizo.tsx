import React from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import datos from '../data/erizo.json';
import {Camara, G, Luces, P, Papel, Pose, Titulo, caja, canvasTex, cil, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, ventana} from './kit';
import {Confeti, Halo, ICONOS, Ic, Mano, Ranura, Sello, Sprite, Tio, crearSubtitulo, texCopo, texEstrella} from './mascotas';
import {FUENTE} from '../serie/tema';

export const DURACION_ERIZO = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  africa: T('áfrica'),
  bolita: T('bolita', 1),
  espinas: T('espinas', 1),
  nariz: T('nariz'),
  patitas: T('patitas'),
  felicidades: T('felicidades'),
  erizo: T('erizo', 1),
  pones: T('pones'),
  caja: T('caja'),
  croquetas: T('croquetas', 1),
  listo: T('listo'),
  pero1: T('pero', 1),
  noche: T('noche', 1),
  dormir: T('dormir:'),
  corre: T('corre', 1),
  es1: T('es', 1),
  nocturno: T('nocturno'),
  duerme: T('duerme'),
  kilometros: T('kilómetros'),
  insectos: T('insectos', 1),
  rueda: T('rueda'),
  gimnasio: T('gimnasio'),
  pero2: T('pero', 2),
  cargar: T('cargar'),
  bolita2: T('bolita', 2),
  pica: T('pica'),
  musculo: T('músculo'),
  pelota: T('pelota'),
  seguro: T('seguro'),
  abre: T('abre'),
  huela: T('huela'),
  pero3: T('pero', 3),
  saliva: T('saliva', 1),
  huele: T('huele'),
  mastica: T('mastica'),
  espuma: T('espuma'),
  unta: T('unta', 1),
  normal: T('normal'),
  pero4: T('pero', 5),
  invierno: T('invierno'),
  frio: T('frío'),
  hibernar: T('hibernar'),
  despertar: T('despertar'),
  calientito: T('calientito'),
  v24: T('24'),
  temperatura: T('temperatura'),
  cuidado: T('cuidado'),
  engorda: T('engorda'),
  insectos2: T('insectos', 2),
  especial: T('especial'),
  ahora: T('ahora'),
  feliz: T('feliz'),
  amigo: T('amigo'),
};

// ---------- erizo ----------
const geoPuas = (todo: boolean) =>
  G(`erPuas|${todo}`, () => {
    const gs: THREE.BufferGeometry[] = [];
    const N = todo ? 260 : 190;
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const n = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      if (!todo && (n.y < -0.15 || (n.x > 0.55 && n.y < 0.45))) continue;
      const c = new THREE.ConeGeometry(0.035, 0.16, 4);
      c.translate(0, 0.08, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.clone().add(new THREE.Vector3(-0.35, 0, 0)).normalize());
      c.applyQuaternion(q);
      c.translate(n.x * 0.36, n.y * 0.3, n.z * 0.33);
      const col = new THREE.Color(i % 3 === 0 ? '#f3e6cc' : '#8a6a4a');
      const cnt = c.getAttribute('position').count;
      const arr: number[] = [];
      for (let k = 0; k < cnt; k++) {
        const yy = c.getAttribute('position').getY(k);
        const v = (new THREE.Vector3(c.getAttribute('position').getX(k), yy, c.getAttribute('position').getZ(k)).length() > 0.42) ? new THREE.Color('#f8f0e0') : col;
        arr.push(v.r, v.g, v.b);
      }
      c.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
      gs.push(c);
    }
    return mergeGeometries(gs);
  });

const Erizo: React.FC<{t: number; bola?: number; anda?: number; gordo?: number; espuma?: number; olfatea?: number; cabeza?: number; frio?: number}> = ({t, bola = 0, anda = 0, gordo = 0, espuma = 0, olfatea = 0, cabeza = 0, frio = 0}) => {
  const enBola = bola > 0.5;
  const sq = enBola ? 1 : 1 + Math.sin(t * 14) * 0.02 * anda;
  const g = 1 + gordo * 0.35;
  const piel = frio > 0.5 ? '#d9c9c0' : '#f6dcc4';
  return (
    <group scale={[g, sq * (1 + gordo * 0.15), g]}>
      {enBola ? (
        <group position={[0, 0.3, 0]} rotation={[0, 0, t * 0]}>
          <P geo={esf(0.33, 20)} color="#6b4f3a" linea={0} silueta={1.6} />
          <P geo={geoPuas(true)} vc color="#ffffff" linea={0} silueta={1.2} />
        </group>
      ) : (
        <group position={[0, 0.3, 0]}>
          <P geo={esf(0.33, 22)} color="#6b4f3a" scale={[1.15, 0.9, 1]} linea={0} silueta={1.6} />
          <group scale={[1.1, 0.95, 1]}>
            <P geo={geoPuas(false)} vc color="#ffffff" linea={0} silueta={1.2} />
          </group>
          {/* cara */}
          <group position={[0.3, -0.06, 0]} rotation={[0, 0, cabeza]}>
            <P geo={esf(0.16, 18)} color={piel} scale={[1.2, 0.9, 1]} linea={0} silueta={1.6} />
            <P geo={G('hocico', () => new THREE.ConeGeometry(0.08, 0.2, 14))} color={piel} position={[0.2, -0.02, 0]} rotation={[0, 0, -Math.PI / 2]} linea={0} silueta={1.4} />
            <P geo={esf(0.035, 10)} color="#1a1a20" position={[0.3 + olfatea * Math.sin(t * 20) * 0.01, -0.02, 0]} linea={0} silueta={1} />
            {[-1, 1].map((s) => (
              <group key={s}>
                <P geo={esf(0.03, 10)} color="#1a1a20" position={[0.1, 0.06, s * 0.1]} linea={0} silueta={0.8} />
                <P geo={esf(0.01, 6)} color="#ffffff" position={[0.115, 0.072, s * 0.12]} linea={0} silueta={0} sombra={false} />
                <P geo={esf(0.045, 10)} color="#e8b9a8" position={[-0.02, 0.13, s * 0.11]} scale={[0.5, 1, 1]} linea={0} silueta={1} />
              </group>
            ))}
          </group>
          {/* patitas */}
          {[[0.18, 1], [0.18, -1], [-0.18, 1], [-0.18, -1]].map(([x, s], i) => (
            <P key={i} geo={cil(0.03, 0.03, 0.1, 8)} color={piel} position={[x + Math.sin(t * 14 + i * Math.PI) * 0.04 * anda, -0.25, s * 0.14]} linea={0} silueta={1.2} />
          ))}
        </group>
      )}
      {espuma > 0.01 &&
        Array.from({length: 18}, (_, i) =>
          i < espuma * 18 ? <P key={i} geo={esf(0.045, 10)} color="#ffffff" position={[(rnd(i) - 0.6) * 0.5, 0.48 + rnd(i + 2) * 0.12, (rnd(i + 4) - 0.5) * 0.5]} scale={[1, 0.7, 1]} linea={0} silueta={1} sombra={false} /> : null,
        )}
    </group>
  );
};

// ---------- cuarto ----------
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
      }
    },
    [6, 6],
  );
  return _piso;
};
const MUEBLE_H = 0.8;
const CW = 1.1;
const CD = 0.6;
const CH = 0.32;
const CAJA: [number, number, number] = [0.1, MUEBLE_H + 0.02, -0.25];

const Cuarto: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshToonMaterial color="#ffffff" map={texPiso()} />
    </mesh>
    <P geo={caja(20, 3.6, 0.2)} color="#f1c7c0" position={[0, 1.8, -1.6]} linea={0} silueta={0} />
    <P geo={caja(20, 0.14, 0.24)} color="#f4f1ea" position={[0, 0.07, -1.48]} linea={0} />
    <P geo={caja(1.3, 1.2, 0.08)} color="#f4f1ea" position={[-1.3, 1.95, -1.48]} />
    <P geo={caja(1.1, 1.0, 0.1)} color="#bfe3f7" position={[-1.3, 1.95, -1.46]} />
    <P geo={caja(2.2, MUEBLE_H, 0.75)} color="#8a6a4a" position={[0.1, MUEBLE_H / 2, -0.3]} />
    {/* cama */}
    <P geo={caja(1.3, 0.4, 2.0)} color="#7a5232" position={[2.1, 0.2, -0.3]} />
    <P geo={caja(1.25, 0.18, 1.95)} color="#4f7fd0" position={[2.1, 0.48, -0.3]} />
    <P geo={caja(0.9, 0.15, 0.4)} color="#f4f1ea" position={[2.1, 0.62, -1.05]} />
    <P geo={esf(0.35, 14)} color="#4f7fd0" position={[2.1, 0.6, -0.2]} scale={[1.3, 0.55, 2]} linea={0} />
    <P geo={esf(0.14, 14)} color="#f2b48c" position={[2.1, 0.75, -0.95]} linea={0} />
  </group>
);

const Caja: React.FC = () => (
  <group position={CAJA}>
    <P geo={caja(CW, 0.02, CD)} color="#e8d8b0" position={[0, 0.01, 0]} linea={0} />
    <P geo={caja(CW, CH, 0.02)} color="#c99a5e" position={[0, CH / 2, -CD / 2]} />
    <P geo={caja(CW, CH * 0.55, 0.02)} color="#d4a76a" position={[0, CH * 0.275, CD / 2]} />
    <P geo={caja(0.02, CH, CD)} color="#c99a5e" position={[-CW / 2, CH / 2, 0]} />
    <P geo={caja(0.02, CH, CD)} color="#c99a5e" position={[CW / 2, CH / 2, 0]} />
  </group>
);

const Plato: React.FC<{tipo: 'croqueta' | 'insecto'}> = ({tipo}) => (
  <group>
    <P geo={cil(0.09, 0.07, 0.04, 18)} color="#e0453a" position={[0, 0.02, 0]} />
    {Array.from({length: 8}, (_, i) => (
      <P
        key={i}
        geo={tipo === 'croqueta' ? esf(0.018, 8) : cil(0.008, 0.008, 0.05, 6)}
        color={tipo === 'croqueta' ? '#a26b35' : '#e0c070'}
        position={[(rnd(i) - 0.5) * 0.1, 0.05, (rnd(i + 2) - 0.5) * 0.1]}
        rotation={[0, i, Math.PI / 2]}
        linea={0}
        silueta={0.8}
      />
    ))}
  </group>
);

const Rueda: React.FC<{giro: number}> = ({giro}) => (
  <group>
    <P geo={caja(0.04, 0.45, 0.04)} color="#2f6fe0" position={[0, 0.22, -0.2]} />
    <P geo={caja(0.3, 0.03, 0.3)} color="#2f6fe0" position={[0, 0.015, -0.15]} />
    <group position={[0, 0.34, 0]} rotation={[0, 0, -giro]}>
      <P geo={G('ruedaAro', () => new THREE.TorusGeometry(0.32, 0.018, 8, 48))} color="#ffd23a" />
      <P geo={G('ruedaAro2', () => new THREE.TorusGeometry(0.32, 0.018, 8, 48).translate(0, 0, -0.3))} color="#ffd23a" />
      {Array.from({length: 18}, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return <P key={i} geo={cil(0.008, 0.008, 0.3, 5)} color="#e0b020" position={[Math.cos(a) * 0.32, Math.sin(a) * 0.32, -0.15]} rotation={[Math.PI / 2, 0, 0]} linea={0} silueta={0.8} />;
      })}
      {[0, 1, 2].map((k) => (
        <P key={k} geo={caja(0.62, 0.02, 0.02)} color="#e0b020" position={[0, 0, -0.3]} rotation={[0, 0, (k * Math.PI) / 3]} linea={0} silueta={0.8} />
      ))}
    </group>
  </group>
);

const Calcetin: React.FC = () => (
  <group rotation={[0, 0.5, Math.PI / 2]}>
    <P geo={cil(0.05, 0.05, 0.2, 12)} color="#e0453a" position={[0, 0.1, 0]} linea={0} />
    <P geo={esf(0.055, 12)} color="#e0453a" position={[0.04, 0.2, 0]} scale={[1.6, 1, 1]} linea={0} />
    <P geo={cil(0.052, 0.052, 0.04, 12)} color="#f4f1ea" position={[0, 0.01, 0]} linea={0} />
  </group>
);

// ---------- escena ----------
const MESA_TIO = -1.5;
const SE = 0.3;
const Escena: React.FC<{t: number}> = ({t}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const conTio = t < ev.pones - 0.35;
  const camina = r(t, 0, 2.2);
  const tioX = lerp(-3.2, MESA_TIO, camina);
  const giro = lerp(Math.PI / 2, 0.15, r(t, 2.2, 0.6));
  const saluda = ventana(t, ev.felicidades - 0.1, ev.pones - 0.35, 0.3);
  const manos = V(tioX + 0.62 * Math.sin(giro), 1.3, 0.15 + 0.62 * Math.cos(giro));
  const rueda = t > ev.rueda - 0.4;
  // posición del erizo en la caja
  const base: [number, number, number] = [CAJA[0] - 0.15, CAJA[1] + 0.02, CAJA[2] + 0.05];
  const RUEDA_P: [number, number, number] = [CAJA[0] + 0.28, CAJA[1] + 0.02, CAJA[2] + 0.12];
  const corriendo = (t > ev.corre - 0.6 && t < ev.es1) || (t > ev.kilometros - 0.3 && t < ev.rueda - 0.4) || (t > ev.ahora && t < ev.amigo - 1.2);
  const enRueda = (t > ev.rueda && t < ev.pero2) || (t > ev.corre && t < ev.es1 && false) || (t > ev.feliz - 0.5 && t < ev.amigo - 1.2);
  let pos: [number, number, number] = base;
  let ry = -0.95;
  if (corriendo && !enRueda) {
    const a = t * 1.6;
    pos = [CAJA[0] - 0.15 + Math.cos(a) * 0.25, base[1], CAJA[2] + Math.sin(a) * 0.12];
    ry = -a - Math.PI / 2;
  }
  if (enRueda) {
    pos = [RUEDA_P[0], RUEDA_P[1] + 0.03, RUEDA_P[2] - 0.15];
    ry = 0;
  }
  const bola = (t > ev.bolita - 0.2 && t < ev.nariz - 0.2) || (t > ev.bolita2 - 0.3 && t < ev.abre - 0.1) || (t > ev.frio - 0.6 && t < ev.calientito) ? 1 : 0;
  const espuma = r(t, ev.espuma - 0.2, 0.9) * (1 - r(t, ev.pero4 - 0.2, 0.3)) + 0.35 * ventana(t, ev.unta - 0.1, ev.amigo, 0.3) * (t > ev.ahora ? 1 : 0);
  const cabeza = ventana(t, ev.unta - 0.4, ev.normal, 0.3) * (0.6 + Math.sin(t * 5) * 0.2);
  const gordo = ventana(t, ev.engorda - 0.4, ev.insectos2 - 0.2, 0.4);
  const frio = ventana(t, ev.invierno - 0.3, ev.calientito, 0.4);
  const manoO = ventana(t, ev.cargar - 0.6, ev.pica + 0.4, 0.35) + ventana(t, ev.huela - 0.6, ev.pero3 - 0.1, 0.35);
  const manoHasta = V(pos[0] + 0.08, pos[1] + (t > ev.huela - 1 ? 0.06 : 0.22), pos[2] + 0.1);
  const manoDesde = V(pos[0] + 0.9, pos[1] + 1.0, pos[2] + 0.8);

  let cam: {pos: THREE.Vector3; obj: THREE.Vector3; fov: number};
  if (conTio) {
    const poses: Pose[] = [
      [0, [-1.2, 2.0, 5.2], [-1.4, 1.3, 0], 42],
      [ev.bolita - 0.4, [manos.x + 0.25, manos.y + 0.35, manos.z + 1.25], [manos.x, manos.y + 0.1, manos.z], 34],
      [ev.felicidades - 0.25, [-1.1, 1.75, 4.2], [-1.1, 1.3, 0], 40],
    ];
    cam = poseCamara(t, poses, 0.8);
  } else {
    const c = V(CAJA[0], CAJA[1] + 0.15, CAJA[2]);
    const noche = ventana(t, ev.pero1 - 0.1, ev.es1, 0.3);
    const cerca =
      ventana(t, ev.pero2 - 0.1, ev.huela + 1.2, 0.4) + ventana(t, ev.pero3 - 0.1, ev.normal + 0.3, 0.4) + ventana(t, ev.pero4 - 0.1, ev.calientito, 0.4) + ventana(t, ev.cuidado - 0.1, ev.especial + 0.3, 0.4);
    cam = {
      pos: V(lerp(lerp(c.x + 0.15, 0.9, noche), pos[0] + 0.3, cerca), lerp(lerp(c.y + 1.05, c.y + 1.2, noche), pos[1] + 0.62, cerca), lerp(lerp(1.8, 3.0, noche), pos[2] + 0.85, cerca)),
      obj: V(lerp(lerp(c.x, 0.7, noche), pos[0] + 0.05, cerca), lerp(lerp(c.y - 0.05, c.y - 0.1, noche), pos[1] + 0.08, cerca), lerp(c.z, pos[2], cerca)),
      fov: 38,
    };
  }

  return (
    <>
      <Camara pos={cam.pos} obj={cam.obj} fov={cam.fov} />
      <Luces dir={[-0.4, 1, 0.65]} area={4} centro={[0, 0.8, 0]} amb={1.0} sol={0.6} />
      <Cuarto />
      {!conTio && <Caja />}
      {!conTio && t < ev.cuidado - 0.2 && (
        <group position={[CAJA[0] - 0.4, CAJA[1] + 0.02, CAJA[2] + 0.15]}>
          <Plato tipo="croqueta" />
        </group>
      )}
      {!conTio && t >= ev.cuidado - 0.2 && (
        <group position={[CAJA[0] - 0.4, CAJA[1] + 0.02, CAJA[2] + 0.15]}>
          <Plato tipo={t > ev.insectos2 - 0.3 ? 'insecto' : 'croqueta'} />
        </group>
      )}
      {rueda && (
        <group position={RUEDA_P} scale={r(t, ev.rueda - 0.4, 0.3)}>
          <Rueda giro={enRueda ? t * 6 : 0} />
        </group>
      )}
      {t > ev.huele - 0.6 && t < ev.pero4 && (
        <group position={[CAJA[0] - 0.05, CAJA[1] + 0.04, CAJA[2] + 0.15]}>
          <Calcetin />
        </group>
      )}
      {calientito(t) > 0.01 && (
        <>
          <P geo={caja(0.4, 0.02, 0.3)} color="#ff8a3a" position={[base[0], CAJA[1] + 0.02, base[2]]} linea={0} />
          <Halo pos={[base[0], CAJA[1] + 0.15, base[2]]} o={calientito(t) * 0.5} escala={0.5} color="#ff8a3a" />
        </>
      )}
      {conTio && (
        <>
          <group position={[tioX, 0, 0.15]} rotation={[0, giro, 0]}>
            <Tio t={t} anda={t < 2.2 ? 1 : 0} brazos={saluda > 0.01 ? 0 : 1} saluda={saluda} />
          </group>
          <group position={manos.toArray() as [number, number, number]} rotation={[0, giro - 0.6, 0]} scale={SE * 0.9}>
            <Erizo t={t} bola={bola} />
          </group>
        </>
      )}
      {!conTio && (
        <group position={pos} rotation={[0, ry, 0]} scale={SE}>
          <Erizo t={t} bola={bola} anda={corriendo || enRueda ? 1 : 0} gordo={gordo} espuma={espuma} olfatea={ventana(t, ev.huela - 0.4, ev.pero3, 0.2) + ventana(t, ev.huele - 0.2, ev.mastica, 0.2)} cabeza={cabeza} frio={frio} />
        </group>
      )}
      {t > ev.pica - 0.1 && t < ev.pica + 0.5 && <Sprite tex={texEstrella()} pos={[manoHasta.x, manoHasta.y + 0.05, manoHasta.z]} escala={[0.15, 0.15]} o={1} rot={t * 6} />}
      {manoO > 0.01 && <Mano desde={manoDesde} hasta={manoDesde.clone().lerp(manoHasta, Math.min(1, manoO))} />}
      {frio > 0.01 &&
        Array.from({length: 16}, (_, i) => {
          const y = 1.6 - (((t - ev.invierno) * 0.15 + rnd(i)) % 1) * 0.8;
          return <Sprite key={i} tex={texCopo()} pos={[pos[0] - 0.5 + rnd(i + 2) * 1.0, y, pos[2] + 0.2 + rnd(i + 4) * 0.4]} escala={[0.05, 0.05]} o={frio} rot={t + i} />;
        })}
    </>
  );
};
const calientito = (t: number) => r(t, ev.calientito - 0.3, 0.4) * (1 - r(t, ev.cuidado - 0.2, 0.3));

// ---------- capa 2D ----------
Object.assign(ICONOS, {
  erizo: (
    <g>
      <path d="M16 66 C16 40 36 26 56 28 C70 30 80 44 84 58 L90 62 L80 66Z" fill="#8a6a4a" stroke="#16171c" strokeWidth={4} />
      {[24, 34, 44, 54, 64].map((x, i) => (
        <path key={i} d={`M${x} ${40 - (i % 2) * 4} L${x + 4} ${28 - (i % 2) * 4} L${x + 8} ${40 - (i % 2) * 4}`} fill="#f3e6cc" stroke="#16171c" strokeWidth={2} />
      ))}
      <path d="M60 50 C72 48 82 56 90 62 C78 68 64 66 60 60Z" fill="#f6dcc4" stroke="#16171c" strokeWidth={3} />
      <circle cx={90} cy={62} r={4} fill="#16171c" />
      <circle cx={70} cy={54} r={3} fill="#16171c" />
    </g>
  ),
  bola: (
    <g>
      <circle cx={50} cy={52} r={26} fill="#8a6a4a" stroke="#16171c" strokeWidth={4} />
      {Array.from({length: 12}, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return <path key={k} d={`M${50 + Math.cos(a) * 24} ${52 + Math.sin(a) * 24} L${50 + Math.cos(a) * 38} ${52 + Math.sin(a) * 38}`} stroke="#16171c" strokeWidth={4} strokeLinecap="round" />;
      })}
    </g>
  ),
  caja: (
    <g>
      <path d="M14 40 L50 28 L86 40 L86 76 L50 88 L14 76Z" fill="#d4a76a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <path d="M14 40 L50 52 L86 40 M50 52 L50 88" fill="none" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  luna: (
    <g>
      <path d="M62 16 C40 18 26 36 28 56 C30 76 50 88 70 82 C50 78 40 62 42 46 C44 32 52 22 62 16Z" fill="#ffd23a" stroke="#16171c" strokeWidth={4} />
    </g>
  ),
  rueda: (
    <g>
      <circle cx={50} cy={46} r={30} fill="none" stroke="#ffd23a" strokeWidth={8} />
      <circle cx={50} cy={46} r={30} fill="none" stroke="#16171c" strokeWidth={2} />
      <path d="M50 16 L50 76 M20 46 L80 46" stroke="#e0b020" strokeWidth={3} />
      <path d="M50 76 L50 88 M36 88 L64 88" stroke="#2f6fe0" strokeWidth={6} strokeLinecap="round" />
    </g>
  ),
  mapa: (
    <g>
      <path d="M14 26 L36 18 L64 26 L86 18 L86 76 L64 84 L36 76 L14 84Z" fill="#e8f0c8" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <path d="M24 66 C36 50 52 60 60 44 C66 34 74 36 78 30" fill="none" stroke="#e0453a" strokeWidth={4} strokeDasharray="6 5" />
    </g>
  ),
  espuma: (
    <g>
      {[[34, 54, 16], [54, 44, 18], [66, 62, 13], [44, 70, 11]].map(([x, y, rr], i) => (
        <circle key={i} cx={x} cy={y} r={rr} fill="#ffffff" stroke="#16171c" strokeWidth={4} />
      ))}
    </g>
  ),
  nariz: (
    <g>
      <path d="M18 50 C30 30 60 34 82 50 C60 66 30 70 18 50Z" fill="#f6dcc4" stroke="#16171c" strokeWidth={4} />
      <circle cx={82} cy={50} r={9} fill="#16171c" />
    </g>
  ),
  calcetin: (
    <g>
      <path d="M36 14 L62 14 L62 56 C62 70 74 72 80 76 C84 86 70 90 58 86 C44 82 36 70 36 56Z" fill="#e0453a" stroke="#16171c" strokeWidth={4} strokeLinejoin="round" />
      <rect x={34} y={12} width={30} height={10} fill="#f4f1ea" stroke="#16171c" strokeWidth={3} />
    </g>
  ),
  zzz: (
    <g>
      <text x={30} y={70} fontSize={34} fontWeight={900} fontFamily={FUENTE} fill="#2f6fe0">
        Z
      </text>
      <text x={52} y={52} fontSize={26} fontWeight={900} fontFamily={FUENTE} fill="#2f6fe0">
        z
      </text>
      <text x={68} y={36} fontSize={20} fontWeight={900} fontFamily={FUENTE} fill="#2f6fe0">
        z
      </text>
    </g>
  ),
  gusano: (
    <g>
      <path d="M18 60 C28 44 38 72 50 56 C62 40 72 68 84 52" fill="none" stroke="#e0c070" strokeWidth={12} strokeLinecap="round" />
      <path d="M18 60 C28 44 38 72 50 56 C62 40 72 68 84 52" fill="none" stroke="#16171c" strokeWidth={2} strokeDasharray="3 6" />
    </g>
  ),
  gordo: (
    <g>
      <ellipse cx={50} cy={56} rx={36} ry={28} fill="#8a6a4a" stroke="#16171c" strokeWidth={4} />
      <path d="M14 56 L4 56 M86 56 L96 56" stroke="#e0453a" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
});

const IZQ: Ic[] = [
  [ev.africa - 0.05, 'hoja', 'África'],
  [ev.bolita - 0.05, 'bola', 'bolita de espinas'],
  [ev.patitas - 0.05, 'erizo', 'patitas chiquitas'],
  [ev.erizo - 0.05, 'erizo', 'erizo', 'ok', ev.erizo + 0.2],
  [ev.caja - 0.05, 'caja', 'caja'],
  [ev.noche - 0.05, 'luna', 'de noche'],
  [ev.nocturno - 0.05, 'luna', 'nocturno'],
  [ev.kilometros - 0.05, 'mapa', 'camina kilómetros'],
  [ev.rueda - 0.05, 'rueda', 'rueda grande'],
  [ev.cargar - 0.05, 'mano', 'lo cargas'],
  [ev.musculo - 0.05, 'bola', 'músculo que lo cierra'],
  [ev.abre - 0.1, 'erizo', 'se abre solito', 'ok', ev.abre + 0.2],
  [ev.saliva - 0.05, 'espuma', 'saliva espumosa'],
  [ev.mastica - 0.05, 'calcetin', 'lo mastica'],
  [ev.invierno - 0.05, 'copo', 'invierno'],
  [ev.hibernar - 0.05, 'zzz', 'intenta hibernar'],
  [ev.v24 - 0.1, 'termometro', '24 a 29 grados', 'ok', ev.temperatura],
  [ev.engorda - 0.05, 'gordo', 'engorda', 'no', ev.engorda + 0.2],
  [ev.feliz - 0.15, 'erizo', 'erizo feliz', 'ok', ev.feliz + 0.1],
];
const DER: Ic[] = [
  [ev.nariz - 0.05, 'nariz', 'nariz de botón'],
  [ev.felicidades + 0.3, '', ''],
  [ev.croquetas - 0.05, 'plato', 'croquetas de gato', 'ok', ev.listo],
  [ev.dormir - 0.05, 'zzz', 'no te deja dormir', 'no', ev.dormir + 0.2],
  [ev.duerme - 0.05, 'sol', 'de día duerme'],
  [ev.insectos - 0.05, 'grillo', 'insectos'],
  [ev.gimnasio - 0.15, 'rueda', 'su gimnasio', 'ok', ev.gimnasio + 0.1],
  [ev.pica - 0.05, 'golpe', 'te pica', 'no', ev.pica + 0.1],
  [ev.seguro - 0.05, 'feliz', 'si está seguro'],
  [ev.huela - 0.05, 'nariz', 'déjalo oler', 'ok', ev.huela + 0.3],
  [ev.unta - 0.05, 'espuma', 'se la unta'],
  [ev.normal - 0.15, 'feliz', 'es normal', 'ok', ev.normal + 0.1],
  [ev.despertar - 0.2, 'calavera', 'puede no despertar', 'no', ev.despertar],
  [ev.calientito - 0.05, 'sol', 'siempre calientito'],
  [ev.cuidado - 0.05, 'plato', 'croquetas', 'no', ev.engorda],
  [ev.insectos2 - 0.05, 'gusano', 'insectos', 'ok', ev.especial],
  [ev.amigo - 0.3, 'corazon', 'tu mejor amigo'],
];

const ROJAS = new Set(['áfrica', 'bolita', 'espinas', 'nariz', 'botón', 'patitas', 'chiquitas', 'felicidades', 'erizo', 'caja', 'croquetas', 'gato', 'listo', 'noche', 'dormir', 'corre', 'parar', 'nocturno', 'duerme', 'kilómetros', 'insectos', 'rueda', 'gimnasio', 'cargar', 'pica', 'músculo', 'pelota', 'seguro', 'abre', 'huela', 'saliva', 'espumosa', 'huele', 'mastica', 'espuma', 'unta', 'normal', 'invierno', 'frío', 'hibernar', 'despertar', 'calientito', '24', '29', 'temperatura', 'engorda', 'especial', 'feliz', 'amigo']);
const Subtitulo = crearSubtitulo(datos, ROJAS);

const Temp: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.v24 - 0.2, ev.cuidado - 0.2, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 400, left: 0, right: 0, textAlign: 'center', opacity: o, fontFamily: FUENTE}}>
      <div style={{display: 'inline-block', padding: '16px 40px', borderRadius: 30, background: '#fff', border: '8px solid #16171c', fontWeight: 900, fontSize: 96, color: '#e0453a'}}>24° – 29°</div>
    </div>
  );
};

export const ErizoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const noche = ventana(t, ev.pero1 - 0.1, ev.duerme - 0.2, 0.3) + ventana(t, ev.duerme + 0.6, ev.rueda - 0.4, 0.3);
  return (
    <AbsoluteFill style={{background: '#f1c7c0'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 40, near: 0.03, far: 100, position: [0, 1.6, 4]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.18} manchas={0.12} />
      <div style={{position: 'absolute', inset: 0, background: '#1f2f70', mixBlendMode: 'multiply', opacity: 0.55 * Math.min(1, noche)}} />
      <div style={{position: 'absolute', inset: 0, background: '#7fb6ff', mixBlendMode: 'multiply', opacity: 0.25 * ventana(t, ev.invierno - 0.3, ev.calientito, 0.4)}} />
      <div style={{position: 'absolute', inset: 0, background: '#ff9a3a', mixBlendMode: 'multiply', opacity: 0.14 * calientito(t)}} />
      <Confeti t={t} t0={ev.felicidades} />
      <Titulo texto="¡AY!" color="#e0453a" o={ventana(t, ev.pica - 0.1, ev.pica + 0.6, 0.12)} y={420} size={160} fuente={FUENTE} />
      <Temp t={t} />
      <Subtitulo t={t} />
      <Ranura t={t} lista={IZQ} x={250} />
      <Ranura t={t} lista={DER} x={830} />
      <Sello t={t} t0={ev.amigo - 0.2} texto="MEJOR AMIGO" sub="aunque pique" color="#2f9e44" />
      <Audio src={staticFile('erizo/voz.wav')} />
      <Audio src={staticFile('erizo/musica.wav')} />
    </AbsoluteFill>
  );
};
