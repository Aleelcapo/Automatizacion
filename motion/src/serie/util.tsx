import React, {createContext, useContext} from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Beat, C, FUENTE} from './tema';

// ---- contexto del beat actual: permite sincronizar animaciones con palabras habladas ----
export const BeatCtx = createContext<Beat | null>(null);

const limpiar = (x: string) => x.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');

/** Frame (relativo al inicio de la escena) en que se dice la palabra `w` (n-ésima aparición). */
export const usePalabra = (w: string, n = 0, fallback = 0): number => {
  const beat = useContext(BeatCtx);
  const {fps} = useVideoConfig();
  if (!beat) return fallback;
  const obj = limpiar(w);
  const hits = beat.words.filter((p) => limpiar(p.w) === obj || (p.a ?? []).some((x) => limpiar(x) === obj));
  const p = hits[n];
  if (!p) return fallback;
  return Math.round((p.t - beat.start) * fps);
};

export const useDuracion = () => {
  const beat = useContext(BeatCtx);
  const {fps} = useVideoConfig();
  return beat ? Math.round(beat.dur * fps) : 90;
};

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 0→1 con rebote desde el frame `desde`. */
export const usePop = (desde: number, damping = 13, stiffness = 170) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - desde, fps, config: {damping, stiffness, mass: 0.8}});
};

/** 0→1 suave entre dos frames. */
export const useRampa = (desde: number, dur: number) => {
  const f = useCurrentFrame();
  return interpolate(f, [desde, desde + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
};

export const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Número que sube animado, p. ej. $0 → $10.000. */
export const Contador: React.FC<{
  hasta: number;
  desde?: number;
  inicio: number;
  dur?: number;
  prefijo?: string;
  sufijo?: string;
  size?: number;
  color?: string;
  peso?: number;
}> = ({hasta, desde = 0, inicio, dur = 24, prefijo = '', sufijo = '', size = 160, color = C.oro, peso = 900}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [inicio, inicio + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const v = desde + (hasta - desde) * p;
  const golpe = interpolate(f, [inicio + dur, inicio + dur + 4, inicio + dur + 10], [1, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        fontFamily: FUENTE,
        fontWeight: peso,
        fontSize: size,
        color,
        letterSpacing: -size * 0.03,
        fontVariantNumeric: 'tabular-nums',
        transform: `scale(${golpe})`,
        textShadow: `0 0 ${size * 0.35}px ${color}55`,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {prefijo}
      {fmt(v)}
      {sufijo}
    </div>
  );
};

/** Etiqueta tipo píldora. */
export const Pildora: React.FC<{children: React.ReactNode; color?: string; fondo?: string; size?: number; style?: React.CSSProperties}> = ({
  children,
  color = C.texto,
  fondo = C.tarjeta,
  size = 40,
  style,
}) => (
  <div
    style={{
      fontFamily: FUENTE,
      fontWeight: 800,
      fontSize: size,
      color,
      background: fondo,
      border: `2px solid ${C.borde}`,
      borderRadius: 999,
      padding: `${size * 0.35}px ${size * 0.8}px`,
      letterSpacing: size * 0.04,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Texto grande de titular, en mayúsculas. */
export const Titular: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({
  children,
  size = 110,
  color = C.texto,
  style,
}) => (
  <div
    style={{
      fontFamily: FUENTE,
      fontWeight: 900,
      fontSize: size,
      color,
      textTransform: 'uppercase',
      textAlign: 'center',
      lineHeight: 0.95,
      letterSpacing: -size * 0.02,
      textShadow: '0 8px 30px rgba(0,0,0,0.5)',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Posiciona un hijo centrado en (x, y) del lienzo 1080x1920. */
export const En: React.FC<{x?: number; y: number; children: React.ReactNode; s?: number; o?: number; r?: number; style?: React.CSSProperties}> = ({
  x = 540,
  y,
  children,
  s = 1,
  o = 1,
  r = 0,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${s}) rotate(${r}deg)`,
      opacity: o,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);
