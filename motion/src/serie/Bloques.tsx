import React, {useContext} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Beat, C, FUENTE} from './tema';
import {BeatCtx, Contador, Pildora, Titular} from './util';
import {Icono} from './iconos';
import {ILUSTRACIONES} from './ilustraciones';

/*
 Escena descrita en JSON (campo "escena" de cada beat del guion):
 { "tinte": "#hex", "momentos": [ { "en": "palabra", "el": [ {t: "titulo", texto: "..."}, ... ] } ] }
 - Cada momento reemplaza al anterior cuando se dice su palabra "en".
 - Cada elemento aparece cuando se dice su palabra "en" (o en cascada si no tiene).
 - "palabra#2" = segunda vez que se dice esa palabra en la escena.
*/

type El = Record<string, any> & {t: string; en?: string};
type Momento = {en?: string; el: El[]};
export type EscenaSpec = {tinte?: string; momentos?: Momento[]; el?: El[]; icono_fondo?: string};

const limpiar = (x: string) => x.toLowerCase().replace(/[¿?¡!,.…:;"]/g, '');
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const frameDe = (beat: Beat, fps: number, ancla: string | undefined, fallback: number): number => {
  if (!ancla) return fallback;
  const [w, nStr] = ancla.split('#');
  const n = nStr ? parseInt(nStr, 10) - 1 : 0;
  const obj = limpiar(w);
  const hits = beat.words.filter((p) => limpiar(p.w) === obj || (p.a ?? []).some((x) => limpiar(x) === obj));
  const p = hits[n] ?? hits[hits.length - 1];
  if (!p) return fallback;
  return Math.max(0, Math.round((p.t - beat.start) * fps) - 3);
};

// achica la letra solo si el texto no cabe en el ancho disponible (740 px antes del zoom)
const ajustar = (size: number, texto: string, factor = 0.62, ancho = 740) => {
  const palabras = texto.replace(/\[|\]/g, '').split(/\s+/);
  const larga = Math.max(...palabras.map((w) => w.length), 1);
  return Math.min(size, ancho / (factor * larga));
};
const ajustarLinea = (size: number, texto: string, factor = 0.6, ancho = 740) => Math.min(size, ancho / (factor * Math.max(texto.length, 1)));

const useAcento = () => {
  const beat = useContext(BeatCtx) as any;
  return (beat?.acento as string) || C.oro;
};

/** Texto con [palabras] resaltadas en el color de acento. */
const Resaltado: React.FC<{texto: string; acento: string}> = ({texto, acento}) => (
  <>
    {texto.split(/(\[[^\]]+\])/).map((p, i) =>
      p.startsWith('[') ? (
        <span key={i} style={{color: acento}}>
          {p.slice(1, -1)}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    )}
  </>
);

const Aparece: React.FC<{desde: number; children: React.ReactNode; desde_x?: number; style?: React.CSSProperties}> = ({desde, children, desde_x = 0, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - desde, fps, config: {damping: 13, stiffness: 170, mass: 0.8}});
  if (f < desde) return <div style={{opacity: 0, ...style}}>{children}</div>;
  return (
    <div style={{opacity: Math.min(1, s * 1.4), transform: `translate(${(1 - s) * desde_x}px, ${(1 - s) * 40}px) scale(${0.7 + 0.3 * s})`, ...style}}>
      {children}
    </div>
  );
};

const animIcono = (anim: string | undefined, f: number) => {
  switch (anim) {
    case 'flota':
      return `translateY(${Math.sin(f / 12) * 12}px)`;
    case 'late':
      return `scale(${1 + Math.sin(f / 5) * 0.05})`;
    case 'gira':
      return `rotate(${f * 3}deg)`;
    case 'balancea':
      return `rotate(${Math.sin(f / 9) * 10}deg)`;
    case 'tiembla':
      return `translate(${Math.sin(f * 2.7) * 5}px, ${Math.cos(f * 3.1) * 4}px)`;
    case 'cae':
      return `translateY(${interpolate(f % 50, [0, 25, 50], [0, 30, 0])}px)`;
    default:
      return 'none';
  }
};

/** Dibuja un elemento según su tipo. `d` = frame en que aparece. */
const Elemento: React.FC<{el: El; d: number; beat: Beat}> = ({el, d, beat}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acento = useAcento();
  const col = (x?: string) => (x ? ((C as any)[x] ?? x) : undefined);
  const en = (a: string | undefined, fb: number) => frameDe(beat, fps, a, fb);

  switch (el.t) {
    case 'titulo':
      return (
        <Aparece desde={d}>
          <Titular size={ajustar(el.size ?? 104, el.texto, 0.7)} color={col(el.color) ?? C.texto} style={{maxWidth: 760, whiteSpace: 'normal'}}>
            <Resaltado texto={el.texto} acento={col(el.acento) ?? acento} />
          </Titular>
        </Aparece>
      );
    case 'texto':
      return (
        <Aparece desde={d}>
          <div style={{fontFamily: FUENTE, fontWeight: 700, fontSize: el.size ?? 48, color: col(el.color) ?? C.tenue, textAlign: 'center', maxWidth: 740, whiteSpace: 'normal', lineHeight: 1.2}}>
            <Resaltado texto={el.texto} acento={col(el.acento) ?? acento} />
          </div>
        </Aparece>
      );
    case 'numero':
      return (
        <Aparece desde={d}>
          <Contador
            hasta={el.valor}
            desde={el.desde ?? 0}
            inicio={d + 2}
            dur={el.dur ?? 22}
            prefijo={el.prefijo ?? ''}
            sufijo={el.sufijo ?? ''}
            size={ajustarLinea(el.size ?? 190, `${el.prefijo ?? ''}${el.valor.toLocaleString('es')}${el.sufijo ?? ''}`, 0.6)}
            color={col(el.color) ?? acento}
          />
        </Aparece>
      );
    case 'pildora':
      return (
        <Aparece desde={d}>
          <Pildora size={ajustarLinea(el.size ?? 44, el.texto, 0.78, 640)} fondo={col(el.fondo) ?? C.tarjeta} color={col(el.color) ?? C.texto}>
            {el.texto}
          </Pildora>
        </Aparece>
      );
    case 'icono':
      return (
        <Aparece desde={d}>
          <div style={{transform: animIcono(el.anim, f), filter: `drop-shadow(0 0 40px ${col(el.color) ?? acento}44)`}}>
            <Icono nombre={el.nombre} size={Math.min(560, (el.size ?? 260) * ((el._n ?? 3) <= 2 ? 1.35 : 1.1))} color={col(el.color) ?? acento} color2={col(el.color2) ?? C.cian} />
          </div>
        </Aparece>
      );
    case 'iconos':
      return (
        <div style={{display: 'flex', gap: el.gap ?? 40, alignItems: 'flex-end', justifyContent: 'center'}}>
          {el.items.map((it: any, i: number) => (
            <Aparece key={i} desde={en(it.en, d + i * 5)}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
                <div style={{transform: animIcono(it.anim ?? el.anim, f + i * 7)}}>
                  <Icono nombre={it.nombre} size={it.size ?? el.size ?? 170} color={col(it.color) ?? acento} color2={col(it.color2) ?? C.cian} />
                </div>
                {it.texto && <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 38, color: col(it.colorTexto) ?? C.texto, textTransform: 'uppercase'}}>{it.texto}</div>}
              </div>
            </Aparece>
          ))}
        </div>
      );
    case 'tarjetas':
      return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center'}}>
          {el.items.map((it: any, i: number) => {
            const c = col(it.color) ?? acento;
            return (
              <Aparece key={i} desde={en(it.en, d + i * 6)} desde_x={-160}>
                <div
                  style={{
                    width: 740,
                    minHeight: 140,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 36,
                    padding: '18px 44px',
                    boxSizing: 'border-box',
                    background: C.tarjeta,
                    border: `3px solid ${c}66`,
                    borderRadius: 34,
                    boxShadow: `0 0 50px ${c}22`,
                  }}
                >
                  {it.icono && <Icono nombre={it.icono} size={104} color={c} color2={col(it.color2) ?? C.cian} />}
                  <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: it.size ?? 62, color: c, textTransform: 'uppercase', whiteSpace: 'normal', lineHeight: 1.05}}>{it.texto}</div>
                </div>
              </Aparece>
            );
          })}
        </div>
      );
    case 'barras': {
      const max = el.max ?? Math.max(...el.items.map((x: any) => x.valor));
      return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 30, width: 740}}>
          {el.items.map((it: any, i: number) => {
            const di = en(it.en, d + i * 10);
            const p = interpolate(f, [di, di + 26], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
            const c = col(it.color) ?? acento;
            return (
              <div key={i} style={{opacity: f >= di ? 1 : 0}}>
                <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 40, color: C.tenue, marginBottom: 10, textTransform: 'uppercase'}}>{it.texto}</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
                  <div style={{height: 70, width: Math.max(8, (470 * it.valor * p) / max), background: c, borderRadius: 14, boxShadow: `0 0 30px ${c}55`}} />
                  <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 60, color: c, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', display: el.ocultar ? 'none' : 'block'}}>
                    {(it.prefijo ?? '') + Math.round(it.valor * p).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (it.sufijo ?? '')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case 'pasos':
      return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 24, width: 740}}>
          {el.items.map((it: any, i: number) => (
            <Aparece key={i} desde={en(it.en, d + i * 8)} desde_x={-120}>
              <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
                <div style={{width: 96, height: 96, borderRadius: 48, background: acento, color: C.fondo1, fontFamily: FUENTE, fontWeight: 900, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                  {i + 1}
                </div>
                <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: it.size ?? 54, color: C.texto, whiteSpace: 'normal', lineHeight: 1.1}}>
                  <Resaltado texto={it.texto} acento={acento} />
                </div>
              </div>
            </Aparece>
          ))}
        </div>
      );
    case 'lista':
      return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 24, width: 740}}>
          {el.items.map((it: any, i: number) => (
            <Aparece key={i} desde={en(it.en, d + i * 8)} desde_x={-120}>
              <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
                <Icono nombre={it.ok ? 'check' : 'equis'} size={92} color={it.ok ? C.verde : C.rojo} />
                <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: it.size ?? 54, color: C.texto, whiteSpace: 'normal', lineHeight: 1.1, textDecoration: it.tachar ? 'line-through' : 'none'}}>
                  {it.texto}
                </div>
              </div>
            </Aparece>
          ))}
        </div>
      );
    case 'sello': {
      const s = interpolate(f, [d, d + 7], [2.4, 1], clamp);
      const o = interpolate(f, [d, d + 3], [0, 1], clamp);
      const c = col(el.color) ?? C.rojo;
      return (
        <div style={{transform: `scale(${s}) rotate(${el.giro ?? -7}deg)`, opacity: o}}>
          <div style={{border: `8px solid ${c}`, color: c, fontFamily: FUENTE, fontWeight: 900, fontSize: el.size ?? 92, padding: '4px 34px', borderRadius: 18, textTransform: 'uppercase'}}>{el.texto}</div>
        </div>
      );
    }
    case 'vs': {
      const lado = (x: any, i: number) => {
        const di = en(x.en, d + i * 12);
        const c = col(x.color) ?? (i ? C.rojo : C.verde);
        return (
          <Aparece desde={di}>
            <div style={{width: 330, padding: '30px 18px', boxSizing: 'border-box', background: C.tarjeta, border: `3px solid ${c}66`, borderRadius: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
              {x.icono && <Icono nombre={x.icono} size={130} color={c} color2={col(x.color2) ?? C.cian} />}
              {x.valor !== undefined && <Contador hasta={x.valor} inicio={di + 2} dur={20} prefijo={x.prefijo ?? ''} sufijo={x.sufijo ?? ''} size={x.size ?? 110} color={c} />}
              <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 38, color: C.texto, textAlign: 'center', whiteSpace: 'normal', textTransform: 'uppercase', lineHeight: 1.1}}>{x.texto}</div>
            </div>
          </Aparece>
        );
      };
      return (
        <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
          {lado(el.a, 0)}
          <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 56, color: C.tenue, opacity: f >= en(el.b.en, d + 12) ? 1 : 0}}>VS</div>
          {lado(el.b, 1)}
        </div>
      );
    }
    case 'grafico': {
      const fin = el.hasta ? en(el.hasta, d + 40) : d + (el.dur ?? 40);
      const p = interpolate(f, [d, Math.max(d + 10, fin)], [0, 1], clamp);
      const pts: number[] = el.puntos;
      const n = pts.length - 1;
      const xy = pts.map((y, i) => [40 + (i / n) * 680, 30 + (1 - y) * 300]);
      const visibles = Math.max(1, p * n);
      const k = Math.floor(visibles);
      const fr = visibles - k;
      const camino = xy.slice(0, k + 1).map((q) => q.join(',')) as string[];
      if (k < n) {
        const [x0, y0] = xy[k];
        const [x1, y1] = xy[k + 1];
        camino.push(`${x0 + (x1 - x0) * fr},${y0 + (y1 - y0) * fr}`);
      }
      const c = col(el.color) ?? acento;
      return (
        <Aparece desde={d}>
          <div style={{background: C.tarjeta, border: `2px solid ${C.borde}`, borderRadius: 34, padding: 32, width: 820, boxSizing: 'border-box'}}>
            {el.etiqueta && <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 40, color: C.tenue, letterSpacing: 2, textTransform: 'uppercase'}}>{el.etiqueta}</div>}
            <svg width={756} height={360} viewBox="0 0 760 360">
              <line x1={40} y1={340} x2={740} y2={340} stroke={C.borde} strokeWidth={3} />
              <line x1={40} y1={20} x2={40} y2={340} stroke={C.borde} strokeWidth={3} />
              <polyline points={camino.join(' ')} stroke={c} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {el.nota && <div style={{fontFamily: FUENTE, fontWeight: 600, fontSize: 26, color: C.tenue, textAlign: 'right'}}>{el.nota}</div>}
          </div>
        </Aparece>
      );
    }
    case 'fila': {
      const w = el.ancho ?? 80;
      return (
        <div style={{display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 5 * w + 50}}>
          {el.items.map((it: any, i: number) => {
            const di = en(it.en, d + i * (el.ritmo ?? 4));
            const vis = f >= di;
            const s = spring({frame: f - di, fps, config: {damping: 12, stiffness: 200}});
            return (
              <div key={i} style={{width: w, border: `3px solid ${C.borde}`, borderRadius: 10, background: vis ? 'rgba(255,255,255,0.08)' : 'transparent', overflow: 'hidden'}}>
                <div style={{height: w * 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: w * 0.34, color: acento, borderBottom: `2px solid ${C.borde}`, opacity: vis ? s : 0}}>
                  {it.arriba}
                </div>
                <div style={{height: w * 0.62, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FUENTE, fontWeight: 900, fontSize: w * 0.36, color: C.texto, opacity: vis ? s : 0}}>
                  {it.abajo}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case 'ilus': {
      const Comp = ILUSTRACIONES[el.nombre];
      if (!Comp) return null;
      const marcas: Record<string, number> = {};
      Object.entries(el.marcas ?? {}).forEach(([k, w]) => {
        marcas[k] = frameDe(beat, fps, w as string, 9999) - d;
      });
      // crece cuando la escena tiene pocos elementos (la ilustración es la protagonista)
      const mult = (el._n ?? 3) <= 2 ? 1.45 : (el._n ?? 3) === 3 ? 1.2 : 1.05;
      const sz = Math.min(770, (el.size ?? 560) * mult);
      return (
        <Aparece desde={d}>
          <div style={{width: sz, height: (sz * (el.alto ?? 600)) / 600}}>
            <Comp f={Math.max(0, f - d)} m={marcas} p={el} />
          </div>
        </Aparece>
      );
    }
    case 'espacio':
      return <div style={{height: el.alto ?? 40}} />;
    default:
      return null;
  }
};

/** Escena genérica a partir del JSON del guion. */
export const EscenaGenerica: React.FC = () => {
  const beat = useContext(BeatCtx)!;
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const spec: EscenaSpec = beat.escena ?? {};
  const momentos: Momento[] = spec.momentos ?? [{el: spec.el ?? []}];
  const durF = Math.round(beat.dur * fps);
  const inicios = momentos.map((m, i) => (i === 0 ? 0 : frameDe(beat, fps, m.en, Math.round((durF * i) / momentos.length))));
  return (
    <AbsoluteFill>
      {spec.icono_fondo && (
        <div style={{position: 'absolute', left: 540, top: 1000, transform: `translate(-50%,-50%) rotate(${Math.sin(f / 40) * 6}deg)`, opacity: 0.07}}>
          <Icono nombre={spec.icono_fondo} size={1000} color="#ffffff" color2="#ffffff" />
        </div>
      )}
      {momentos.map((m, i) => {
        const ini = inicios[i];
        const fin = i + 1 < momentos.length ? inicios[i + 1] : durF + 10;
        if (f < ini - 1 || f > fin + 8) return null;
        const sale = interpolate(f, [fin - 2, fin + 6], [1, 0], clamp);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 230,
              height: 1440,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 34,
              opacity: sale,
              transform: `translateY(${(1 - sale) * -60}px)`,
            }}
          >
            <div style={{zoom: 1.3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
            {m.el.map((el, k) => {
              // el primer elemento "decorativo" aparece de inmediato para que la pantalla nunca quede vacía
              const inmediato = k === 0 && ['titulo', 'icono', 'pildora', 'texto', 'iconos', 'ilus'].includes(el.t) && !el.esperar;
              const d = inmediato ? ini + 3 : frameDe(beat, fps, el.en, ini + 3 + k * 5);
              return <Elemento key={k} el={{...(inmediato ? {...el, en: undefined} : el), _n: m.el.length}} d={d} beat={beat} />;
            })}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
