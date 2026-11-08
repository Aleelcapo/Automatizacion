import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, H, W} from './tema';
import {useDuracion} from './util';

/** Fondo continuo: degradado oscuro + partículas que flotan + viñeta. `tinte` cambia el color por escena. */
export const Fondo: React.FC<{tinte?: string}> = ({tinte = '#1a3a7a'}) => {
  const f = useCurrentFrame();
  const parts = Array.from({length: 40}, (_, i) => {
    const x = random(`x${i}`) * W;
    const vel = 0.4 + random(`v${i}`) * 1.2;
    const y = (H + 100 - ((random(`y${i}`) * H + f * vel) % (H + 200)));
    const r = 2 + random(`r${i}`) * 5;
    const o = 0.08 + random(`o${i}`) * 0.25;
    return <circle key={i} cx={x + Math.sin(f / 40 + i) * 12} cy={y} r={r} fill="#fff" opacity={o} />;
  });
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 80% at 50% 45%, ${tinte} 0%, ${C.fondo2} 45%, ${C.fondo1} 100%)`}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        {parts}
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(90% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Envoltorio de escena: entrada con zoom + desenfoque y salida con fundido. */
export const Escena: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const dur = useDuracion();
  const {fps} = useVideoConfig();
  const entra = interpolate(f, [0, 9], [0, 1], {extrapolateRight: 'clamp'});
  const sale = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp'});
  const s = interpolate(f, [0, 12], [1.08, 1], {extrapolateRight: 'clamp'}) + f / fps / 400;
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(entra, sale),
        transform: `scale(${s})`,
        filter: `blur(${(1 - entra) * 14}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Barra de progreso fina arriba del todo. */
export const Progreso: React.FC<{total: number}> = ({total}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', top: 0, left: 0, height: 10, width: `${(f / total) * 100}%`, background: C.oro, boxShadow: `0 0 20px ${C.oro}`}} />
  );
};
