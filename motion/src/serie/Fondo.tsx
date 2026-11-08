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

/** Ambientación de fondo por tema (siluetas suaves que llenan la pantalla sin distraer). */
export const Escenario: React.FC<{tipo?: string}> = ({tipo}) => {
  const f = useCurrentFrame();
  if (!tipo) return null;
  const o = 0.16;
  let contenido: React.ReactNode = null;
  if (tipo === 'bolera') {
    contenido = (
      <g opacity={o}>
        {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
          <line key={i} x1={540 + i * 420} y1={1920} x2={540 + i * 70} y2={1150} stroke="#ffb070" strokeWidth={6} />
        ))}
        <rect x={0} y={1080} width={1080} height={70} fill="#ffb070" opacity={0.5} />
        {Array.from({length: 9}, (_, i) => <circle key={i} cx={100 + i * 110} cy={1040} r={14} fill="#fff" />)}
      </g>
    );
  } else if (tipo === 'ciudad') {
    contenido = (
      <g opacity={o}>
        {Array.from({length: 14}, (_, i) => {
          const h = 220 + random(`h${i}`) * 420;
          return <rect key={i} x={i * 80 - 20} y={1920 - h} width={72} height={h} fill="#9fb0e8" />;
        })}
      </g>
    );
  } else if (tipo === 'sabana') {
    contenido = (
      <g opacity={o + 0.04}>
        <path d="M0,1650 Q270,1560 540,1640 Q810,1720 1080,1620 L1080,1920 L0,1920 Z" fill="#3ddc84" />
        {[180, 860].map((x, i) => (
          <g key={x} transform={`translate(${x} ${1600 - i * 20})`}>
            <rect x={-10} y={-160} width={20} height={160} fill="#3ddc84" />
            <ellipse cx={0} cy={-170} rx={140} ry={40} fill="#3ddc84" />
          </g>
        ))}
      </g>
    );
  } else if (tipo === 'cine') {
    contenido = (
      <g opacity={o + 0.06}>
        {[0, 1].map((lado) => (
          <g key={lado} transform={lado ? 'translate(1080 0) scale(-1 1)' : ''}>
            {Array.from({length: 4}, (_, i) => <rect key={i} x={i * 34} y={0} width={30} height={1920} fill="#ff4d5e" opacity={0.6 + (i % 2) * 0.3} />)}
          </g>
        ))}
        {Array.from({length: 3}, (_, r) => Array.from({length: 7}, (_, k) => <rect key={`${r}${k}`} x={150 + k * 120} y={1720 + r * 70} width={90} height={60} rx={20} fill="#ff4d5e" />))}
      </g>
    );
  } else if (tipo === 'tormenta') {
    contenido = (
      <g opacity={o + 0.04}>
        {Array.from({length: 50}, (_, i) => {
          const x = (random(`tx${i}`) * 1200 + f * 3) % 1200 - 60;
          const y = (random(`ty${i}`) * 1920 + f * 30) % 1920;
          return <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 40} stroke="#9fc3ff" strokeWidth={3} />;
        })}
        <ellipse cx={200} cy={120} rx={300} ry={110} fill="#6b7a99" />
        <ellipse cx={850} cy={90} rx={330} ry={120} fill="#6b7a99" />
      </g>
    );
  } else if (tipo === 'papel') {
    contenido = (
      <g opacity={o - 0.04}>
        {Array.from({length: 30}, (_, i) => <line key={i} x1={0} y1={120 + i * 64} x2={1080} y2={120 + i * 64} stroke="#c9b8ff" strokeWidth={2} />)}
        <line x1={150} y1={0} x2={150} y2={1920} stroke="#ff7ab6" strokeWidth={3} />
      </g>
    );
  } else if (tipo === 'agua') {
    contenido = (
      <g opacity={o}>
        {Array.from({length: 6}, (_, i) => (
          <path key={i} d={`M0,${1400 + i * 90} ${Array.from({length: 10}, (_, k) => `Q${k * 120 + 60},${1400 + i * 90 + Math.sin(f / 15 + k + i) * 20} ${(k + 1) * 120},${1400 + i * 90}`).join(' ')}`} stroke="#5ac8ff" strokeWidth={5} fill="none" />
        ))}
      </g>
    );
  } else if (tipo === 'monedas') {
    contenido = (
      <g opacity={o - 0.04}>
        {Array.from({length: 12}, (_, i) => {
          const x = random(`mx${i}`) * 1080;
          const y = ((random(`my${i}`) * 1920 + f * (0.6 + random(`mv${i}`))) % 2100) - 100;
          return <circle key={i} cx={x} cy={y} r={30 + random(`mr${i}`) * 30} fill="none" stroke="#ffc83d" strokeWidth={8} />;
        })}
      </g>
    );
  } else if (tipo === 'adn') {
    contenido = (
      <g opacity={o - 0.05}>
        {Array.from({length: 40}, (_, i) => {
          const y = i * 50;
          const a = y / 90 + f / 30;
          return <line key={i} x1={90 + 60 * Math.sin(a)} y1={y} x2={90 - 60 * Math.sin(a)} y2={y} stroke="#5ac8ff" strokeWidth={4} />;
        })}
        {Array.from({length: 40}, (_, i) => {
          const y = i * 50;
          const a = y / 90 + f / 30 + 2;
          return <line key={`b${i}`} x1={990 + 60 * Math.sin(a)} y1={y} x2={990 - 60 * Math.sin(a)} y2={y} stroke="#a78bfa" strokeWidth={4} />;
        })}
      </g>
    );
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      {contenido}
    </svg>
  );
};
