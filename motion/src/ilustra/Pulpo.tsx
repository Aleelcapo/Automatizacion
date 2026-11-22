import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import datos from '../data/pulpo.json';
import {Camara, Etiqueta, G, Luces, P, Papel, Pose, Titulo, canvasTex, cl, esf, lerp, poseCamara, r, rnd, tiemposPalabras, tuboAhusado, ventana} from './kit';
import {FUENTE} from '../serie/tema';

export const DURACION_PULPO = (datos as any).duration as number;
const T = tiemposPalabras(datos);

const ev = {
  para: T('para'),
  dos: T('dos'),
  sangre2: T('sangre', 2),
  hierro: T('hierro'),
  cobre: T('cobre'),
  azul: T('azul…'),
  menos: T('menos'),
  branquias: T('branquias', 1),
  chiquito: T('chiquito'),
  branquiales: T('branquiales'),
  pero2: T('pero', 1),
  sin: T('sin'),
  punta: T('punta'),
  tercer: T('tercer'),
  manda: T('manda'),
  sistemico: T('sistémico'),
  pero3: T('pero', 2),
  chorro: T('chorro'),
  detiene: T('detiene'),
  asi4: T('así', 3),
  caminar: T('caminar'),
  agota: T('agota'),
  pero4: T('pero', 3),
  cerebro: T('cerebro'),
  alcanza2: T('alcanza', 2),
  asi5: T('así', 4),
  neuronas: T('neuronas'),
  toca: T('toca'),
  prueba: T('prueba'),
  decide: T('decide'),
  ese: T('ese', 3),
  tres2: T('tres', 2),
  sangreF: T('sangre', 4),
  brazosF: T('brazos', 5),
};

// ---------- texturas ----------
const PIEL = '#e57b45';
let _piel: THREE.CanvasTexture | null = null;
const texPiel = () => {
  if (_piel) return _piel;
  _piel = canvasTex(
    512,
    512,
    (g) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 420; i++) {
        const big = rnd(i + 3) > 0.8;
        g.fillStyle = big ? 'rgba(150,40,20,0.22)' : rnd(i + 5) > 0.5 ? 'rgba(120,30,10,0.18)' : 'rgba(255,240,220,0.45)';
        g.beginPath();
        g.ellipse(rnd(i) * 512, rnd(i + 1) * 512, big ? 9 + rnd(i + 2) * 10 : 2 + rnd(i + 2) * 4, big ? 6 + rnd(i + 4) * 6 : 2 + rnd(i + 2) * 3, rnd(i + 7) * 3, 0, Math.PI * 2);
        g.fill();
      }
    },
    [2, 2],
  );
  return _piel;
};
let _arena: THREE.CanvasTexture | null = null;
const texArena = () => {
  if (_arena) return _arena;
  _arena = canvasTex(
    1024,
    1024,
    (g) => {
      g.fillStyle = '#e8d6ae';
      g.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = 'rgba(170,140,90,0.25)';
        g.lineWidth = 3;
        g.beginPath();
        const y = rnd(i) * 1024;
        g.moveTo(0, y);
        for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 10);
        g.stroke();
      }
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = rnd(i + 9) > 0.5 ? 'rgba(140,110,70,0.35)' : 'rgba(255,255,240,0.5)';
        g.fillRect(rnd(i) * 1024, rnd(i + 1) * 1024, 2, 2);
      }
    },
    [10, 10],
  );
  return _arena;
};

// ---------- tiempos de movimiento ----------
const nado = (t: number) => r(t, ev.chorro - 0.5, 0.7) * (1 - r(t, ev.asi4 - 0.25, 0.25)); // 0..1 brazos juntos
const caminata = (t: number) => (t > ev.asi4 - 0.25 && t < ev.pero4 ? 1 : 0);
const cuerpoPos = (t: number): [number, number, number] => {
  if (t < ev.asi4 - 0.25) {
    const k = r(t, ev.chorro - 0.6, 3.2);
    return [k * 3.2, k * 2.4 + Math.sin(k * Math.PI) * 0.4, -k * 0.5];
  }
  // caminando de -1.6 a 1.2 en x
  const k = cl((t - (ev.asi4 - 0.25)) / (ev.pero4 - ev.asi4 + 0.25));
  const x = t < ev.pero4 ? lerp(-1.8, 0.9, k) : 0.9;
  return [x, Math.abs(Math.sin(t * 4)) * 0.04 * caminata(t), 0];
};
const tapaAbierta = (t: number) => {
  // 1 = se ve el interior (mitad de enfrente quitada)
  const abre1 = r(t, 0.7, 0.7);
  const cierra = r(t, ev.pero3 - 0.1, 0.5);
  const abre2 = r(t, ev.pero4 + 0.6, 0.6);
  return t < ev.pero3 - 0.1 ? abre1 : t < ev.pero4 + 0.6 ? 1 - cierra : abre2;
};

// ---------- cuerpo (cabeza + manto) en corte ----------
const PERFIL: [number, number][] = [
  [0.36, 0.0],
  [0.42, 0.18],
  [0.47, 0.42],
  [0.46, 0.66],
  [0.4, 0.86],
  [0.47, 1.05],
  [0.66, 1.4],
  [0.75, 1.8],
  [0.7, 2.2],
  [0.5, 2.55],
  [0.22, 2.75],
  [0.0, 2.8],
];
const suavePerfil = (k: number) => new THREE.SplineCurve(PERFIL.map(([a, b]) => new THREE.Vector2(a * k, b))).getSpacedPoints(90);
const ZS = 0.85;
const mitadGeo = (k: number) =>
  G(`pmitad|${k}`, () => {
    const g = new THREE.LatheGeometry(suavePerfil(k), 56, Math.PI / 2, Math.PI);
    g.scale(1, 1, ZS);
    g.computeVertexNormals();
    return g;
  });
const tapaGeo = (k1: number, k2: number) =>
  G(`ptapa|${k1}|${k2}`, () => {
    const a = suavePerfil(k1);
    const b = suavePerfil(k2);
    const pos: number[] = [];
    const idx: number[] = [];
    for (const s of [1, -1]) {
      const base = pos.length / 3;
      for (let i = 0; i < a.length; i++) pos.push(s * a[i].x, a[i].y, 0.001, s * b[i].x, b[i].y, 0.001);
      for (let i = 0; i < a.length - 1; i++) {
        const q = base + i * 2;
        idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
const contornoGeo = (k: number, s: number) =>
  G(`pcont|${k}|${s}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(suavePerfil(k).map((p) => new THREE.Vector3(s * p.x, p.y, 0.003))), 160, 0.011, 6, false));

const MitadCuerpo: React.FC<{conTapa?: boolean}> = ({conTapa = true}) => (
  <group>
    <P geo={mitadGeo(1)} color={PIEL} mapa={texPiel()} linea={0} silueta={2.4} />
    <P geo={mitadGeo(0.93)} color="#f4b49b" doble linea={0} silueta={0} sombra={false} />
    {conTapa && <P geo={tapaGeo(1, 0.93)} color="#f7cdb4" doble linea={0} silueta={0} sombra={false} />}
    {conTapa &&
      [1, -1].map((s) =>
        [1, 0.93].map((k) => (
          <mesh key={`${s}${k}`} geometry={contornoGeo(k, s)}>
            <meshBasicMaterial color="#1a1b22" />
          </mesh>
        )),
      )}
  </group>
);

const Ojo: React.FC<{s: number; parpadeo: number}> = ({s, parpadeo}) => (
  <group position={[s * 0.45, 0.62, 0.02]} rotation={[0, s * 1.25, 0]} scale={0.85}>
    <P geo={G('ojoBlanco', () => new THREE.SphereGeometry(0.17, 28, 20).scale(1, 1, 0.6))} color="#f5ecd8" linea={0} silueta={2} />
    <group scale={[1, Math.max(0.08, 1 - parpadeo), 1]}>
      <P geo={G('pupila', () => new THREE.CapsuleGeometry(0.035, 0.12, 4, 12).rotateZ(Math.PI / 2))} color="#16171c" position={[0, 0, 0.1]} linea={0} silueta={0} />
    </group>
    <P geo={G('ceja', () => new THREE.TorusGeometry(0.17, 0.05, 10, 24, Math.PI))} color={PIEL} mapa={texPiel()} position={[0, 0.02, 0]} rotation={[0, 0, 0.1]} linea={0} silueta={1.8} />
  </group>
);

// ---------- órganos ----------
const latido = (t: number, f = 1.4, fase = 0) => 1 + 0.12 * Math.max(0, Math.sin((t * f + fase) * Math.PI * 2)) ** 6;

const Branquia: React.FC<{s: number}> = ({s}) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.22, 1.12, -0.1), new THREE.Vector3(s * 0.42, 1.45, -0.12), new THREE.Vector3(s * 0.5, 1.85, -0.18)]), [s]);
  return (
    <group>
      <P geo={G(`bEje|${s}`, () => new THREE.TubeGeometry(curva, 30, 0.035, 8, false))} color="#c96b7d" linea={0} silueta={1.4} />
      {Array.from({length: 13}, (_, i) => {
        const u = 0.04 + (i / 12) * 0.92;
        const p = curva.getPointAt(u);
        const tg = curva.getTangentAt(u);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg);
        const sz = 0.13 * (1 - u * 0.55);
        return (
          <group key={i} position={p.toArray() as [number, number, number]} quaternion={q}>
            <P geo={G('laminilla', () => new THREE.SphereGeometry(1, 18, 10).scale(1, 0.18, 0.55))} color={i % 2 ? '#e597a6' : '#d9808f'} scale={sz} linea={0} silueta={1.3} />
          </group>
        );
      })}
    </group>
  );
};

const POS_BR = (s: number): [number, number, number] => [s * 0.36, 1.02, -0.12];
const POS_SIS: [number, number, number] = [0, 1.28, -0.2];

const Organos: React.FC<{t: number}> = ({t}) => {
  const paradoBr = t > ev.para && t < ev.dos + 1.2; // un corazón branquial se para (gancho)
  const paradoSis = t > ev.detiene - 0.1 && t < ev.asi4 + 0.6;
  const brilloBr = ventana(t, ev.chiquito, ev.pero2 + 0.6, 0.3);
  const brilloSis = ventana(t, ev.tercer, ev.pero3, 0.3);
  return (
    <group>
      {/* glándula digestiva y bolsa de tinta */}
      <P geo={G('glandula', () => new THREE.SphereGeometry(0.4, 28, 18).scale(1.05, 0.85, 0.7))} color="#8e5a3a" position={[0, 2.02, -0.32]} linea={0} silueta={1.8} />
      <P geo={G('tinta', () => new THREE.SphereGeometry(0.1, 18, 12).scale(1, 1.4, 1))} color="#22232a" position={[0.12, 1.72, -0.08]} linea={0} silueta={1.4} />
      {/* esófago y cerebro */}
      <P geo={G('esof', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.62, -0.08), new THREE.Vector3(0, 1.2, -0.3), new THREE.Vector3(0, 1.75, -0.35)]), 30, 0.035, 8))} color="#e9b9a6" linea={0} silueta={1.2} />
      <Cerebro t={t} />
      {/* branquias y corazones */}
      {[1, -1].map((s, i) => {
        const parado = paradoBr && i === 0;
        return (
          <group key={s}>
            <Branquia s={s} />
            <group position={POS_BR(s)} scale={(parado ? 1 : latido(t, 1.5, i * 0.1)) * (1 + brilloBr * 0.25)}>
              <P geo={esf(0.11, 24)} color={parado ? '#9a8f96' : '#de5c6b'} linea={0} silueta={2} />
            </group>
            {brilloBr > 0.01 && <Brillo pos={POS_BR(s)} o={brilloBr} />}
          </group>
        );
      })}
      <group position={POS_SIS} scale={(paradoSis ? 1 : latido(t, 1.2, 0.3)) * (1 + brilloSis * 0.2)}>
        <P geo={G('sistemico', () => new THREE.SphereGeometry(0.17, 28, 18).scale(1.25, 1, 0.9))} color={paradoSis ? '#8c8287' : '#cc3f3a'} linea={0} silueta={2.2} />
      </group>
      {brilloSis > 0.01 && <Brillo pos={POS_SIS} o={brilloSis} />}
      {/* vasos */}
      {[1, -1].map((s) => (
        <group key={s}>
          <TuboV pts={[[0, 0.25, 0.05], [s * 0.2, 0.6, -0.05], POS_BR(s)]} r={0.03} color="#9aa7c4" />
          <TuboV pts={[[s * 0.5, 1.85, -0.2], [s * 0.25, 1.6, -0.25], POS_SIS]} r={0.032} color="#3f74d6" />
        </group>
      ))}
      <TuboV pts={[POS_SIS, [0, 0.9, -0.12], [0, 0.4, 0.0], [0, 0.15, 0.05]]} r={0.04} color="#3f74d6" />
    </group>
  );
};

const TuboV: React.FC<{pts: [number, number, number][]; r: number; color: string}> = ({pts, r: rr, color}) => (
  <P geo={G(`tv|${JSON.stringify(pts)}|${rr}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, rr, 10))} color={color} linea={0} silueta={1.2} />
);

const Cerebro: React.FC<{t: number}> = ({t}) => {
  const b = ventana(t, ev.cerebro - 0.2, ev.asi5 + 0.4, 0.3);
  return (
    <group position={[0, 0.62, -0.08]} scale={1 + b * 0.15}>
      <P geo={G('cerebro', () => new THREE.TorusGeometry(0.14, 0.08, 14, 28).rotateX(Math.PI / 2))} color={b > 0.5 ? '#ffe7a8' : '#f2dcc2'} linea={0} silueta={1.8} />
      {[1, -1].map((s) => (
        <P key={s} geo={G('lobulo', () => new THREE.SphereGeometry(0.1, 18, 12).scale(1.3, 1, 1))} color={b > 0.5 ? '#ffe7a8' : '#f0d6ba'} position={[s * 0.22, 0, 0.02]} linea={0} silueta={1.6} />
      ))}
      {b > 0.01 && <Brillo pos={[0, 0, 0]} o={b} escala={1.1} />}
    </group>
  );
};

let _brillo: THREE.CanvasTexture | null = null;
const texBrillo = () => {
  if (_brillo) return _brillo;
  _brillo = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,240,170,0.55)');
    gr.addColorStop(1, 'rgba(255,220,100,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  });
  return _brillo;
};
const Brillo: React.FC<{pos: [number, number, number]; o: number; escala?: number; color?: string}> = ({pos, o, escala = 0.7, color = '#ffe48a'}) => (
  <sprite position={pos} scale={[escala, escala, 1]}>
    <spriteMaterial map={texBrillo()} transparent opacity={o} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} color={color} />
  </sprite>
);

// ---------- brazos ----------
const NB = 8;
const brazoPts = (i: number, t: number): THREE.Vector3[] => {
  const ang = (i / NB) * Math.PI * 2 + 0.2;
  const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
  const lat = new THREE.Vector3(-dir.z, 0, dir.x);
  const n = nado(t);
  const c = caminata(t);
  const pts: THREE.Vector3[] = [];
  const L = 3.1 - (i % 2) * 0.25;
  for (let k = 0; k <= 7; k++) {
    const u = k / 7;
    const d = 0.3 + u * L;
    const ola = Math.sin(t * 1.6 + u * 5 + i * 1.3) * 0.18 * u;
    // extendido sobre la arena, con la punta enroscada
    const enrosque = u > 0.75 ? (u - 0.75) * 4 : 0;
    let p = dir
      .clone()
      .multiplyScalar(d * (1 - enrosque * 0.22))
      .add(lat.clone().multiplyScalar(ola + enrosque * 0.35 * (i % 2 ? 1 : -1)))
      .add(new THREE.Vector3(0, 0.16 - u * 0.12 + enrosque * 0.25, 0));
    // caminar: los brazos se levantan por turnos
    if (c) {
      const paso = Math.max(0, Math.sin(t * 4 + i * (Math.PI / 2)));
      p.y += paso * 0.35 * Math.sin(u * Math.PI);
      p.add(new THREE.Vector3(1, 0, 0).multiplyScalar(paso * 0.25 * u));
    }
    // nadar: brazos juntos, atrás y abajo del cuerpo
    if (n > 0) {
      const atras = new THREE.Vector3(-1, -0.55, 0).normalize();
      const q = atras
        .clone()
        .multiplyScalar(0.3 + u * L * 0.95)
        .add(lat.clone().multiplyScalar(0.12 * Math.sin(ang) * (1 - u) + Math.sin(t * 6 + u * 6 + i) * 0.05))
        .add(new THREE.Vector3(0, 0, Math.cos(ang) * 0.12 * (1 - u * 0.6)));
      p = p.lerp(q, n);
    }
    pts.push(p);
  }
  return pts;
};
const radioBrazo = (u: number) => 0.17 * (1 - u) ** 0.85 + 0.014;

const Brazos: React.FC<{t: number; neuronas: number}> = ({t, neuronas}) => {
  const geos = useMemo(() => Array.from({length: NB}, (_, i) => tuboAhusado(brazoPts(i, t), radioBrazo, 70, 14)), [t]);
  const cuerdas = useMemo(
    () =>
      neuronas > 0.01
        ? Array.from({length: NB}, (_, i) => {
            const pts = brazoPts(i, t).map((p) => p.clone().add(new THREE.Vector3(0, 0.0, 0)));
            return tuboAhusado(pts, (u) => radioBrazo(u) * 0.35 + 0.004, 70, 8);
          })
        : [],
    [t, neuronas > 0.01],
  );
  useEffect(() => () => [...geos, ...cuerdas].forEach((g) => g.dispose()), [geos, cuerdas]);
  return (
    <group>
      {geos.map((g, i) => (
        <P key={i} geo={g} color={PIEL} mapa={texPiel()} linea={0} silueta={2.2} opacity={neuronas > 0.01 ? 1 - 0.55 * neuronas : 1} />
      ))}
      {cuerdas.map((g, i) => (
        <mesh key={`n${i}`} geometry={g}>
          <meshBasicMaterial color="#ffd23f" transparent opacity={neuronas} depthWrite={false} />
        </mesh>
      ))}
      {neuronas > 0.01 && <PulsosNeuronas t={t} o={neuronas} />}
      <Ventosas t={t} />
    </group>
  );
};

const Ventosas: React.FC<{t: number}> = ({t}) => {
  const lista = useMemo(() => {
    const out: {p: THREE.Vector3; q: THREE.Quaternion; s: number}[] = [];
    for (let i = 0; i < NB; i++) {
      const c = new THREE.CatmullRomCurve3(brazoPts(i, t));
      for (let k = 0; k < 12; k++) {
        const u = 0.12 + k * 0.07;
        const p = c.getPointAt(u);
        const tg = c.getTangentAt(u);
        const lado = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();
        const sgn = k % 2 ? 1 : -1;
        const rr = radioBrazo(u);
        const pos = p.clone().add(lado.clone().multiplyScalar(sgn * rr * 0.92)).add(new THREE.Vector3(0, -rr * 0.25, 0));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lado.clone().multiplyScalar(sgn));
        out.push({p: pos, q, s: rr * 0.42});
      }
    }
    return out;
  }, [t]);
  return (
    <group>
      {lista.map((v, i) => (
        <group key={i} position={v.p} quaternion={v.q} scale={v.s}>
          <P geo={G('ventosa', () => new THREE.CylinderGeometry(1, 0.9, 0.45, 16))} color="#f6dcc6" linea={0} silueta={1} sombra={false} />
          <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 14]} />
            <meshBasicMaterial color="#d99a83" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const PulsosNeuronas: React.FC<{t: number; o: number}> = ({t, o}) => (
  <group>
    {Array.from({length: NB * 2}, (_, j) => {
      const i = j % NB;
      const c = new THREE.CatmullRomCurve3(brazoPts(i, t));
      const u = (t * 0.45 + j * 0.37) % 1;
      const p = c.getPointAt(u);
      return <Brillo key={j} pos={[p.x, p.y + 0.05, p.z]} o={o * 0.9} escala={0.35} />;
    })}
  </group>
);

// ---------- sangre (partículas) ----------
const Sangre: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.sangre2 - 0.2, ev.pero3, 0.4);
  const curvas = useMemo(
    () => ({
      ret: [1, -1].map((s) => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.25, 0.05), new THREE.Vector3(s * 0.2, 0.6, -0.05), new THREE.Vector3(...POS_BR(s))])),
      br: [1, -1].map((s) => new THREE.CatmullRomCurve3([new THREE.Vector3(...POS_BR(s)), new THREE.Vector3(s * 0.42, 1.45, -0.12), new THREE.Vector3(s * 0.5, 1.85, -0.18), new THREE.Vector3(s * 0.25, 1.6, -0.25), new THREE.Vector3(...POS_SIS)])),
      ao: new THREE.CatmullRomCurve3([new THREE.Vector3(...POS_SIS), new THREE.Vector3(0, 0.9, -0.12), new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, 0.15, 0.05)]),
    }),
    [],
  );
  if (o <= 0.01) return null;
  const sinSis = t < ev.tercer; // antes del tercer corazón la sangre va lenta
  const v = sinSis ? 0.18 : 0.5;
  const parado = t > ev.detiene - 0.1 && t < ev.asi4 + 0.6;
  const puntos: {p: THREE.Vector3; c: string}[] = [];
  for (let k = 0; k < 14; k++) {
    const u = (t * v + k / 14) % 1;
    puntos.push({p: curvas.ret[k % 2].getPointAt(u), c: '#c7cfdf'});
    puntos.push({p: curvas.br[k % 2].getPointAt(u), c: u > 0.5 ? '#2f6fe0' : '#9db0d8'});
    if (!sinSis && !parado) puntos.push({p: curvas.ao.getPointAt(u), c: '#2f6fe0'});
  }
  // sangre hacia los brazos
  const alcance = sinSis ? 0.42 : 1;
  for (let i = 0; i < NB; i++) {
    const c = new THREE.CatmullRomCurve3(brazoPts(i, t));
    for (let k = 0; k < 5; k++) {
      const u = ((t * (sinSis ? 0.12 : 0.4) + k / 5 + i * 0.13) % 1) * alcance;
      const p = c.getPointAt(u);
      puntos.push({p: p.add(new THREE.Vector3(0, radioBrazo(u) * 0.95, 0)), c: sinSis && u > alcance * 0.8 ? '#aab4c8' : '#2f6fe0'});
    }
  }
  return (
    <group>
      {puntos.map((q, i) => (
        <mesh key={i} position={q.p} scale={o}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshBasicMaterial color={q.c} depthTest={false} transparent />
        </mesh>
      ))}
    </group>
  );
};

// ---------- pulpo completo ----------
const Pulpo: React.FC<{t: number}> = ({t}) => {
  const ab = tapaAbierta(t);
  const n = nado(t);
  const [x, y, z] = cuerpoPos(t);
  const neur = ventana(t, ev.asi5 + 0.2, ev.ese + 0.2, 0.5);
  const respira = 1 + Math.sin(t * 2.2) * 0.015;
  const parpadeo = Math.max(0, 1 - Math.abs(((t + 1.3) % 4.2) - 0.1) * 12);
  return (
    <group position={[x, y, z]}>
      <group rotation={[0, 0, -n * 1.05]} position={[0, n * 0.3, 0]}>
        <group rotation={[-0.28, 0, 0]} scale={[respira, 1, respira]}>
          <MitadCuerpo />
          <Organos t={t} />
          {/* mitad de enfrente: se levanta como tapa */}
          {ab < 0.999 && (
            <group position={[0, ab * 0.4, ab * 3.2]} rotation={[ab * 0.9, Math.PI, 0]} scale={1 - ab * 0.4}>
              <MitadCuerpo conTapa={ab > 0.001} />
            </group>
          )}
          <Ojo s={1} parpadeo={parpadeo} />
          <Ojo s={-1} parpadeo={parpadeo} />
          <Sangre t={t} />
        </group>
      </group>
      <Brazos t={t} neuronas={neur} />
      {n > 0.05 && <Chorro t={t} o={n} />}
    </group>
  );
};

const Chorro: React.FC<{t: number; o: number}> = ({t, o}) => (
  <group>
    {Array.from({length: 18}, (_, i) => {
      const u = (t * 1.5 + i / 18) % 1;
      return (
        <mesh key={i} position={[-0.4 - u * 2.2, 0.9 - u * 1.3 + Math.sin(i) * 0.1, Math.cos(i * 2) * 0.15]} scale={o * (0.6 + u)}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshBasicMaterial color="#eaf8fb" transparent opacity={0.85 * (1 - u)} />
        </mesh>
      );
    })}
  </group>
);

// ---------- fondo marino ----------
const Roca: React.FC<{p: [number, number, number]; s: [number, number, number]; c?: string; i: number}> = ({p, s, c = '#8d9a8c', i}) => (
  <P geo={G(`roca|${i % 3}`, () => {
    const g = new THREE.DodecahedronGeometry(1, 1);
    const q = g.getAttribute('position');
    for (let k = 0; k < q.count; k++) {
      const f = 0.82 + rnd(k * 3.1 + i) * 0.3;
      q.setXYZ(k, q.getX(k) * f, Math.max(-0.2, q.getY(k)) * f, q.getZ(k) * f);
    }
    g.computeVertexNormals();
    return g;
  })} color={c} position={p} scale={s} rotation={[0, rnd(i) * 6, 0]} linea={1.2} umbral={35} />
);

const Coral: React.FC<{p: [number, number, number]; c: string; i: number; s?: number}> = ({p, c, i, s = 1}) => (
  <group position={p} scale={s}>
    {Array.from({length: 6}, (_, k) => {
      const a = rnd(i * 9 + k) * Math.PI * 2;
      const h = 0.6 + rnd(i * 7 + k) * 0.7;
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 0.15, h * 0.5, Math.sin(a) * 0.15), new THREE.Vector3(Math.cos(a) * 0.35, h, Math.sin(a) * 0.35)];
      return <P key={k} geo={G(`coral|${i}|${k}`, () => tuboAhusado(pts, (u) => 0.07 * (1 - u * 0.5), 16, 8))} color={c} linea={0} silueta={1.6} />;
    })}
  </group>
);

const Alga: React.FC<{p: [number, number, number]; t: number; i: number; h?: number}> = ({p, t, i, h = 4}) => {
  const geo = useMemo(() => {
    const pts = Array.from({length: 8}, (_, k) => {
      const u = k / 7;
      return new THREE.Vector3(Math.sin(t * 0.8 + u * 3 + i) * 0.35 * u, u * h, Math.cos(t * 0.6 + u * 2 + i) * 0.2 * u);
    });
    return tuboAhusado(pts, (u) => 0.06 * (1 - u * 0.6), 30, 6);
  }, [t, i, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <P geo={geo} color={i % 2 ? '#6c9a48' : '#86ad52'} position={p} linea={0} silueta={1.6} />;
};

const Concha: React.FC<{p: [number, number, number]; i: number}> = ({p, i}) => (
  <group position={p} rotation={[0.3, rnd(i) * 6, 0.2]}>
    <P geo={G('concha', () => new THREE.ConeGeometry(0.16, 0.4, 14, 1).rotateZ(Math.PI / 2))} color="#f2d9b2" linea={1} umbral={20} />
  </group>
);

const Estrella: React.FC<{p: [number, number, number]; i: number}> = ({p, i}) => (
  <group position={p} rotation={[0, rnd(i) * 6, 0]}>
    {Array.from({length: 5}, (_, k) => (
      <group key={k} rotation={[0, (k / 5) * Math.PI * 2, 0]}>
        <P geo={G('brazoEst', () => new THREE.CapsuleGeometry(0.06, 0.22, 4, 10).rotateZ(Math.PI / 2))} color="#ef8a3c" position={[0.15, 0.03, 0]} linea={0} silueta={1.4} />
      </group>
    ))}
  </group>
);

const Peces: React.FC<{t: number}> = ({t}) => (
  <group>
    {Array.from({length: 12}, (_, i) => {
      const a = t * 0.12 + i * 0.5;
      const rr = 9 + (i % 3) * 1.5;
      const x = Math.cos(a) * rr;
      const z = -6 + Math.sin(a) * 3 - (i % 4);
      const y = 2.5 + (i % 5) * 0.5 + Math.sin(t + i) * 0.2;
      const c = i % 3 === 0 ? '#f3c63c' : i % 3 === 1 ? '#5b8fd6' : '#e9e4d6';
      return (
        <group key={i} position={[x, y, z]} rotation={[0, -a - Math.PI / 2, Math.sin(t * 6 + i) * 0.1]}>
          <P geo={G('pez', () => new THREE.SphereGeometry(0.22, 18, 12).scale(1.6, 0.8, 0.45))} color={c} linea={0} silueta={1.4} />
          <P geo={G('cola', () => new THREE.ConeGeometry(0.15, 0.25, 4).rotateZ(Math.PI / 2))} color={c} position={[-0.42, 0, 0]} linea={1} />
        </group>
      );
    })}
  </group>
);

const Rayos: React.FC<{t: number}> = ({t}) => {
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
  return (
    <group>
      {Array.from({length: 7}, (_, i) => (
        <mesh key={i} position={[-8 + i * 2.6 + Math.sin(t * 0.3 + i) * 0.4, 7, -4 - (i % 3) * 2]} rotation={[0, 0, 0.25]}>
          <planeGeometry args={[0.8 + rnd(i) * 1.2, 16]} />
          <meshBasicMaterial map={tex} transparent opacity={0.16 + 0.06 * Math.sin(t * 0.7 + i)} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
};

const Burbujas: React.FC<{t: number}> = ({t}) => (
  <group>
    {Array.from({length: 24}, (_, i) => {
      const u = (t * 0.12 + rnd(i)) % 1;
      return (
        <mesh key={i} position={[-6 + rnd(i + 1) * 12 + Math.sin(t * 2 + i) * 0.1, u * 9, -3 + rnd(i + 2) * 4]}>
          <sphereGeometry args={[0.03 + rnd(i + 3) * 0.04, 10, 8]} />
          <meshBasicMaterial color="#f2fbff" transparent opacity={0.7} />
        </mesh>
      );
    })}
  </group>
);

const Agua: React.FC = () => {
  const scene = useThree((s) => s.scene);
  if (!scene.fog) scene.fog = new THREE.Fog('#86c0c8', 9, 34);
  const tex = useMemo(
    () =>
      canvasTex(16, 512, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 512);
        gr.addColorStop(0, '#d6f0ee');
        gr.addColorStop(0.45, '#9fd0d3');
        gr.addColorStop(1, '#6aa6b6');
        g.fillStyle = gr;
        g.fillRect(0, 0, 16, 512);
      }),
    [],
  );
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return (
    <mesh>
      <sphereGeometry args={[80, 32, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
};

const Fondo: React.FC<{t: number}> = ({t}) => (
  <group>
    <Agua />
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshToonMaterial map={texArena()} />
    </mesh>
    <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[90, 90]} />
      <shadowMaterial color="#2c3fa3" opacity={0.7} />
    </mesh>
    <Roca p={[-3.6, 0.2, -2.5]} s={[1.2, 0.9, 1.0]} i={1} />
    <Roca p={[-4.6, 0.1, -1.2]} s={[0.6, 0.45, 0.55]} i={2} c="#97a493" />
    <Roca p={[4.2, 0.2, -3.2]} s={[1.5, 1.1, 1.2]} i={3} c="#7f8f86" />
    <Roca p={[5.6, 0.1, 0.6]} s={[0.55, 0.35, 0.5]} i={4} />
    <Roca p={[-2.2, 0.05, 2.6]} s={[0.4, 0.25, 0.35]} i={5} c="#a2ad9c" />
    <Coral p={[-3.0, 0.5, -2.0]} c="#ee8a96" i={1} />
    <Coral p={[3.6, 0.9, -2.6]} c="#f2a34c" i={2} s={1.2} />
    <Coral p={[-5.2, 0, 0.5]} c="#e46f7d" i={3} s={0.8} />
    <Coral p={[6.2, 0, -1.4]} c="#b98be0" i={4} />
    {[-6.5, -5.8, 5.2, 7, -1.5, 1.8].map((x, i) => (
      <Alga key={i} p={[x, 0, -4.5 - (i % 3) * 1.2]} t={t} i={i} h={3.5 + (i % 3) * 1.2} />
    ))}
    <Concha p={[1.7, 0.08, 1.9]} i={1} />
    <Concha p={[-1.4, 0.08, 3.1]} i={2} />
    <Estrella p={[2.6, 0.02, 2.6]} i={1} />
    <Estrella p={[-3.2, 0.02, 1.4]} i={2} />
    <Peces t={t} />
    <Rayos t={t} />
    <Burbujas t={t} />
  </group>
);

// ---------- cámara ----------
const POSES: Pose[] = [
  [0, [3.4, 3.1, 7.2], [0, 1.1, 0], 34],
  [0.01, [3.4, 3.1, 7.2], [0, 1.1, 0], 34],
  [0.6, [2.4, 2.4, 5.4], [0, 1.25, 0], 34],
  [ev.sangre2 - 0.1, [1.0, 1.75, 2.6], [0, 1.25, -0.1], 32],
  [ev.cobre + 0.4, [0.8, 1.6, 2.2], [0, 1.2, -0.1], 32],
  [ev.branquias - 0.4, [1.7, 1.9, 3.3], [0, 1.45, -0.1], 34],
  [ev.pero2 - 0.1, [4.6, 5.8, 6.4], [0, 0.4, 0.6], 36],
  [ev.tercer - 0.3, [1.2, 1.7, 2.8], [0, 1.3, -0.1], 32],
  [ev.manda - 0.2, [4.4, 5.4, 6.2], [0, 0.5, 0.6], 36],
  [ev.pero3 - 0.2, [4.6, 3.2, 9.8], [0.4, 1.3, 0], 36],
  [ev.asi4 - 0.3, [2.2, 2.2, 6.4], [0, 0.7, 0], 36],
  [ev.pero4 - 0.1, [1.2, 1.15, 2.7], [0, 0.65, 0], 32],
  [ev.alcanza2 - 0.2, [3.6, 4.4, 5.4], [0, 0.6, 0.4], 36],
  [ev.asi5 - 0.1, [2.2, 6.2, 4.6], [0, 0, 0.6], 38],
  [ev.toca - 0.3, [4.0, 2.6, 5.2], [1.3, 0.3, 1.3], 34],
  [ev.ese - 0.2, [3.8, 3.2, 7.8], [0, 1.0, 0], 34],
];

const Escena: React.FC<{t: number}> = ({t}) => {
  const {pos, obj, fov} = poseCamara(t, POSES, 1.35);
  // seguir al pulpo cuando nada o camina
  const [x, y, z] = cuerpoPos(t);
  const seg = t > ev.pero3 - 0.2 ? 1 : 0;
  pos.add(new THREE.Vector3(x * seg, y * seg * 0.7, z * seg));
  obj.add(new THREE.Vector3(x * seg, y * seg, z * seg));
  return (
    <>
      <Camara pos={pos} obj={obj} fov={fov} />
      <Luces dir={[0.45, 1, 0.6]} area={9} centro={[x, 0, z]} amb={1.0} sol={0.65} />
      <Fondo t={t} />
      <Pulpo t={t} />
      <Toque t={t} />
    </>
  );
};

/** Chispas cuando el brazo toca la concha ("prueba el sabor"). */
const Toque: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.prueba - 0.2, ev.ese, 0.3);
  if (o <= 0.01) return null;
  return (
    <group position={[1.7 + cuerpoPos(t)[0], 0.25, 1.9]}>
      {Array.from({length: 6}, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + t * 2;
        return <Brillo key={i} pos={[Math.cos(a) * 0.35, 0.2 + Math.sin(t * 5 + i) * 0.1, Math.sin(a) * 0.35]} o={o} escala={0.3} />;
      })}
    </group>
  );
};

// ---------- capa 2D ----------
const Gota: React.FC<{color: string; titulo: string; sub: string; o: number}> = ({color, titulo, sub, o}) => (
  <div style={{opacity: o, transform: `scale(${0.85 + 0.15 * o})`, textAlign: 'center', fontFamily: FUENTE, width: 330}}>
    <svg width={150} height={190} viewBox="-50 -70 100 130">
      <path d="M0,-62 C18,-30 42,-8 42,18 C42,42 22,56 0,56 C-22,56 -42,42 -42,18 C-42,-8 -18,-30 0,-62 Z" fill={color} stroke="#16171c" strokeWidth={4} />
      <ellipse cx={-14} cy={6} rx={8} ry={14} fill="rgba(255,255,255,0.55)" />
    </svg>
    <div style={{fontWeight: 900, fontSize: 56, color: '#16171c', WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill'}}>{titulo}</div>
    <div style={{fontWeight: 800, fontSize: 40, color: '#16171c', WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill'}}>{sub}</div>
  </div>
);

const Pulso: React.FC<{t: number}> = ({t}) => {
  const o = ventana(t, ev.chorro, ev.asi4 + 0.3, 0.3);
  if (o <= 0) return null;
  const parado = t > ev.detiene - 0.1;
  const pts: string[] = [];
  for (let x = 0; x <= 520; x += 4) {
    const tt = t - (520 - x) / 260;
    const ph = (tt * 1.2) % 1;
    const yy = parado && tt > ev.detiene - 0.1 ? 0 : ph > 0.4 && ph < 0.46 ? -70 : ph > 0.46 && ph < 0.52 ? 40 : 0;
    pts.push(`${x},${100 + yy}`);
  }
  return (
    <div style={{position: 'absolute', left: 280, top: 1500, opacity: o}}>
      <svg width={520} height={200}>
        <rect x={0} y={0} width={520} height={200} rx={26} fill="rgba(255,255,255,0.85)" stroke="#16171c" strokeWidth={5} />
        <polyline points={pts.join(' ')} fill="none" stroke={parado ? '#e0453a' : '#2f6fe0'} strokeWidth={8} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export const PulpoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const fin = ev.ese;
  return (
    <AbsoluteFill style={{background: '#9fd0d3'}}>
      <ThreeCanvas width={width} height={height} shadows={{type: THREE.PCFShadowMap}} camera={{fov: 34, near: 0.05, far: 200, position: [3.4, 3.1, 7.2]}} gl={{antialias: true}}>
        <Escena t={t} />
      </ThreeCanvas>
      <Papel grano={0.2} manchas={0.14} />
      <Titulo texto="3 corazones" o={ventana(t, 0.5, ev.sangre2 - 0.3, 0.35)} y={200} size={124} fuente={FUENTE} />
      <Etiqueta texto={t < ev.dos ? 'se para uno…' : '…y quedan dos'} rojo={t < ev.dos} o={ventana(t, ev.para, ev.sangre2 - 0.3, 0.3)} y={360} fuente={FUENTE} />
      <div style={{position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 40}}>
        <Gota color="#d83a35" titulo="hierro" sub="tu sangre" o={ventana(t, ev.hierro - 0.1, ev.branquias - 0.6, 0.3)} />
        <Gota color="#2f6fe0" titulo="cobre" sub="la del pulpo" o={ventana(t, ev.cobre - 0.1, ev.branquias - 0.6, 0.3)} />
      </div>
      <Etiqueta texto="carga menos oxígeno" rojo o={ventana(t, ev.menos - 0.1, ev.branquias - 0.6, 0.3)} y={720} fuente={FUENTE} />
      <Etiqueta texto="branquias" o={ventana(t, ev.branquias - 0.1, ev.chiquito - 0.2, 0.3)} y={230} size={64} fuente={FUENTE} />
      <Titulo texto="corazones branquiales" o={ventana(t, ev.branquiales - 0.5, ev.pero2 + 0.2, 0.3)} y={220} size={78} fuente={FUENTE} />
      <Etiqueta texto="sin fuerza: no llega a la punta" rojo o={ventana(t, ev.sin - 0.1, ev.tercer - 0.3, 0.3)} y={230} fuente={FUENTE} />
      <Titulo texto="corazón sistémico" o={ventana(t, ev.sistemico - 0.6, ev.pero3, 0.3)} y={220} size={84} fuente={FUENTE} />
      <Etiqueta texto="el central, a todo el cuerpo" o={ventana(t, ev.manda, ev.pero3, 0.3)} y={340} fuente={FUENTE} />
      <Etiqueta texto="nada a chorro…" o={ventana(t, ev.chorro - 0.2, ev.detiene - 0.1, 0.3)} y={230} size={64} fuente={FUENTE} />
      <Titulo texto="¡se detiene!" color="#e0453a" o={ventana(t, ev.detiene - 0.1, ev.asi4 + 0.2, 0.25)} y={220} size={120} fuente={FUENTE} />
      <Pulso t={t} />
      <Etiqueta texto="mejor camina" o={ventana(t, ev.caminar - 0.2, ev.pero4 - 0.1, 0.3)} y={230} size={64} fuente={FUENTE} />
      <Etiqueta texto="nadar lo agota" rojo o={ventana(t, ev.agota - 0.3, ev.pero4 - 0.1, 0.3)} y={330} fuente={FUENTE} />
      <Etiqueta texto="1 cerebro, 8 brazos" rojo o={ventana(t, ev.cerebro - 0.3, ev.asi5, 0.3)} y={230} size={64} fuente={FUENTE} />
      <Titulo texto="2 de cada 3" o={ventana(t, ev.neuronas - 0.8, ev.toca - 0.3, 0.3)} y={200} size={124} fuente={FUENTE} />
      <Etiqueta texto="neuronas viven en los brazos" o={ventana(t, ev.neuronas - 0.2, ev.toca - 0.3, 0.3)} y={350} fuente={FUENTE} />
      <Etiqueta texto={t < ev.decide ? 'toca y prueba el sabor' : 'y decide solo'} o={ventana(t, ev.toca - 0.2, fin - 0.1, 0.3)} y={230} size={64} fuente={FUENTE} />
      <Titulo texto="3 corazones" o={ventana(t, ev.tres2 - 0.2, 99, 0.3)} y={180} size={100} fuente={FUENTE} />
      <Titulo texto="sangre azul" color="#2f6fe0" o={ventana(t, ev.sangreF - 0.2, 99, 0.3)} y={310} size={84} fuente={FUENTE} />
      <Titulo texto="brazos que piensan" o={ventana(t, ev.brazosF - 0.2, 99, 0.3)} y={420} size={72} fuente={FUENTE} />
      <Audio src={staticFile('pulpo/voz.wav')} />
      <Audio src={staticFile('pulpo/musica.wav')} />
    </AbsoluteFill>
  );
};


