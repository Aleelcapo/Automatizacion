import React, {useMemo} from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, Datos, FUENTE, Palabra} from './tema';

type Bloque = {ini: number; fin: number; palabras: Palabra[]};

// Agrupa las palabras en bloques cortos (máx. 4 palabras o hasta un signo de puntuación).
const agrupar = (datos: Datos): Bloque[] => {
  const todas = datos.beats.flatMap((b) => b.words);
  const bloques: Bloque[] = [];
  let actual: Palabra[] = [];
  todas.forEach((p, i) => {
    actual.push(p);
    const sig = todas[i + 1];
    const corte = /[.,?…:!]$/.test(p.w) || actual.length >= 4 || !sig || sig.t - p.e > 0.35;
    if (corte) {
      bloques.push({ini: actual[0].t, fin: p.e, palabras: actual});
      actual = [];
    }
  });
  bloques.forEach((b, i) => {
    const sig = bloques[i + 1];
    b.fin = sig ? Math.min(sig.ini, b.fin + 0.6) : b.fin + 0.8;
  });
  return bloques;
};

export const Subtitulos: React.FC<{datos: Datos; y?: number}> = ({datos, y = 300}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const bloques = useMemo(() => agrupar(datos), [datos]);
  const b = bloques.find((x) => t >= x.ini - 0.05 && t < x.fin);
  if (!b) return null;
  const actual = [...b.palabras].reverse().find((p) => t >= p.t - 0.05);
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 70,
        right: 70,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 18px',
        fontFamily: FUENTE,
        fontWeight: 800,
        fontSize: 68,
        lineHeight: 1.15,
        transform: 'translateY(-50%)',
      }}
    >
      {b.palabras.map((p, i) => {
        const fi = Math.round((p.t - 0.05) * fps);
        if (f < fi) return null;
        const s = spring({frame: f - fi, fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
        const esActual = p === actual;
        const op = interpolate(s, [0, 1], [0, 1]);
        const estilo: React.CSSProperties = p.k
          ? {background: C.oro, color: C.oroOscuro, padding: '0 14px', borderRadius: 14, textShadow: 'none'}
          : {color: esActual ? C.texto : 'rgba(255,255,255,0.78)'};
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: op,
              transform: `translateY(${(1 - s) * 22}px) scale(${0.85 + 0.15 * s})`,
              textShadow: '0 4px 18px rgba(0,0,0,0.65)',
              ...estilo,
            }}
          >
            {p.w}
          </span>
        );
      })}
    </div>
  );
};
