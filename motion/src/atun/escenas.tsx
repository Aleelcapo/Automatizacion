import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, FUENTE} from '../serie/tema';
import {Contador, En, Pildora, Titular, useDuracion, usePalabra, usePop, useRampa} from '../serie/util';
import {Atun, Bandera, Barco, Lomo, Mazo, Megafono, Olas, Trebol, Trofeo} from './dibujos';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Lluvia de monedas que sale de (x, y) a partir del frame `desde`. */
const Monedas: React.FC<{desde: number; x?: number; y?: number; n?: number}> = ({desde, x = 540, y = 800, n = 22}) => {
  const f = useCurrentFrame() - desde;
  if (f < 0 || f > 60) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: n}, (_, i) => {
        const ang = random(`a${i}`) * Math.PI * 2;
        const v = 14 + random(`v${i}`) * 16;
        const px = x + Math.cos(ang) * v * f;
        const py = y + Math.sin(ang) * v * f * 0.8 + 0.9 * f * f;
        const o = interpolate(f, [40, 60], [1, 0], clamp);
        return (
          <g key={i} transform={`translate(${px},${py}) scale(${Math.abs(Math.cos(f / 4 + i))},1)`} opacity={o}>
            <circle r={22} fill={C.oro} />
            <circle r={15} fill="none" stroke="#b8860b" strokeWidth={4} />
          </g>
        );
      })}
    </svg>
  );
};

const Temblor = (f: number, desde: number, fuerza = 14, dur = 12) => {
  const k = interpolate(f, [desde, desde + dur], [1, 0], clamp) * (f >= desde ? 1 : 0);
  return `translate(${Math.sin(f * 3.1) * fuerza * k}px, ${Math.cos(f * 2.3) * fuerza * k}px)`;
};

// 1 ─ Gancho
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const fDiez = usePalabra('diez');
  const fDia = usePalabra('día');
  const fHarias = usePalabra('harías?');
  const p0 = usePop(2);
  const p1 = usePop(fDiez - 4);
  const p2 = usePop(fDia - 3);
  const p3 = usePop(fHarias - 2, 9);
  return (
    <AbsoluteFill style={{transform: Temblor(f, fHarias, 16)}}>
      <En y={590} s={p0} o={p0}>
        <Titular size={120}>¿Ganarías</Titular>
      </En>
      <En y={800} s={0.6 + 0.4 * p1} o={p1}>
        <Contador hasta={10000} inicio={fDiez - 2} dur={20} prefijo="$" size={190} />
      </En>
      <En y={1000} s={p2} o={p2}>
        <Titular size={120}>
          en <span style={{color: C.oro}}>1 día</span>?
        </Titular>
      </En>
      <En y={1260} s={p3} o={p3} r={-4}>
        <Pildora size={54} fondo={C.texto} color={C.fondo1}>
          ¿Lo harías?
        </Pildora>
      </En>
      <Monedas desde={fDiez + 18} y={800} />
    </AbsoluteFill>
  );
};

// 2 ─ Revelación: pescar atún rojo
export const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const fAtun = usePalabra('atún', 0, 40);
  const salto = interpolate(f, [fAtun - 8, fAtun + 30], [0, 1], clamp);
  const ax = 760 - salto * 260;
  const ay = 1330 - Math.sin(salto * Math.PI) * 520;
  const rot = -35 + salto * 70;
  const pTit = usePop(fAtun);
  const pSub = usePop(fAtun + 8);
  const pTrabajo = usePop(2);
  const anillo = interpolate(f, [fAtun + 26, fAtun + 50], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <En y={560} s={pTrabajo} o={pTrabajo * (1 - pTit)}>
        <Pildora size={46}>El trabajo:</Pildora>
      </En>
      <En y={560} s={pTit} o={pTit}>
        <Titular size={130} color={C.rojo}>
          Atún rojo
        </Titular>
      </En>
      <En y={680} s={pSub} o={pSub * 0.8}>
        <div style={{fontFamily: FUENTE, fontWeight: 600, fontStyle: 'italic', fontSize: 40, color: C.tenue}}>Thunnus thynnus</div>
      </En>
      <Olas y={1230} f={f} color="#123a7a" amp={16} />
      <div style={{position: 'absolute', left: 300, top: 1235 + Math.sin(f / 10) * 8, transform: `translate(-50%,-83%) rotate(${Math.sin(f / 14) * 3}deg)`}}>
        <Barco escala={0.9} />
      </div>
      {salto > 0 && salto < 1 && (
        <div style={{position: 'absolute', left: ax, top: ay, transform: `translate(-50%,-50%) rotate(${rot}deg)`}}>
          <Atun ancho={360} id="rev" />
        </div>
      )}
      <Olas y={1300} f={f} color="#0b2a5e" amp={20} fase={2} vel={1.3} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <ellipse cx={500} cy={1300} rx={60 + anillo * 260} ry={14 + anillo * 50} fill="none" stroke="#fff" strokeWidth={6} opacity={(1 - anillo) * 0.8} />
      </svg>
      <Olas y={1420} f={f} color="#071c42" amp={14} fase={4} vel={0.8} />
    </AbsoluteFill>
  );
};

// 3 ─ Peso y pago en el muelle
export const Escala: React.FC = () => {
  const f = useCurrentFrame();
  const fTres = usePalabra('trescientos', 0, 60);
  const fMuelle = usePalabra('muelle', 0, 120);
  const fQuince = usePalabra('quince', 0, 180);
  const pAtun = usePop(0, 14);
  const fase = useRampa(fMuelle - 6, 18);
  const pKg = usePop(fTres - 6);
  const pPago = usePop(fMuelle);
  const pHasta = usePop(fQuince - 8);
  const caida = interpolate(f, [4, 16], [-500, 0], clamp);
  const aplasta = interpolate(f, [16, 20, 28], [1, 0.9, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-fase * 140}px) scale(${1 - fase * 0.2})`}}>
        <En y={880 + caida} s={pAtun}>
          <div style={{transform: `scaleY(${aplasta})`, transformOrigin: 'bottom'}}>
            <Atun ancho={820} id="esc" />
          </div>
        </En>
        {/* báscula */}
        <div style={{position: 'absolute', left: 150, top: 1080, width: 780, height: 34, borderRadius: 10, background: '#c9d3e3'}} />
        <div style={{position: 'absolute', left: 500, top: 1114, width: 80, height: 70, background: '#8d9ab0'}} />
        <div style={{position: 'absolute', left: 300, top: 1184, width: 480, height: 26, borderRadius: 10, background: '#8d9ab0'}} />
      </div>
      <En y={1360} s={pKg * (1 - fase)} o={pKg * (1 - fase)}>
        <div style={{background: '#06120a', border: `4px solid ${C.verde}55`, borderRadius: 24, padding: '20px 50px'}}>
          <Contador hasta={300} inicio={fTres - 4} dur={22} prefijo="+" sufijo=" kg" size={150} color={C.verde} />
        </div>
      </En>
      <En y={1230} s={pPago} o={pPago}>
        <Pildora size={44}>Pago en el muelle</Pildora>
      </En>
      <En y={1360} o={pHasta} s={0.8 + 0.2 * pHasta}>
        <div style={{fontFamily: FUENTE, fontWeight: 700, fontSize: 48, color: C.tenue}}>HASTA</div>
      </En>
      <En y={1500} o={pHasta} s={0.8 + 0.2 * pHasta}>
        <Contador hasta={15000} inicio={fQuince - 4} dur={22} prefijo="$" size={210} />
      </En>
      <Monedas desde={fQuince + 18} y={1500} n={16} />
    </AbsoluteFill>
  );
};

// 4 ─ El truco: días en alta mar
export const Tormenta: React.FC = () => {
  const f = useCurrentFrame();
  const fDias = usePalabra('días', 0, 40);
  const fTorm = usePalabra('tormentas…', 0, 100);
  const fNada = usePalabra('nada.', 0, 150);
  const pTruco = usePop(0);
  const dia = Math.min(9, 1 + Math.floor(Math.max(0, f - fDias) / 7));
  const pDia = usePop(fDias - 4);
  const flash = interpolate(f, [fTorm, fTorm + 2, fTorm + 10], [0, 0.85, 0], clamp);
  const pNada = usePop(fNada - 3, 10);
  const roll = Math.sin(f / 9) * 9;
  return (
    <AbsoluteFill style={{transform: Temblor(f, fTorm, 10, 16)}}>
      <AbsoluteFill style={{background: 'rgba(0,0,10,0.45)'}} />
      <En y={560} s={pTruco} o={pTruco * (1 - pDia)}>
        <Titular size={110}>Hay truco…</Titular>
      </En>
      <En y={560} s={pDia} o={pDia * (1 - pNada)}>
        <Pildora size={58} fondo="rgba(255,255,255,0.1)">
          Día {dia}
        </Pildora>
      </En>
      {/* rayo */}
      {f >= fTorm && f < fTorm + 8 && (
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <path d="M700,420 L640,640 L700,640 L610,900 L760,600 L690,600 L760,420 Z" fill="#fff8c0" />
        </svg>
      )}
      <Olas y={1180} f={f} color="#0d2a57" amp={40} vel={1.6} />
      <div style={{position: 'absolute', left: 540, top: 1190 + Math.sin(f / 8) * 22, transform: `translate(-50%,-83%) rotate(${roll}deg)`}}>
        <Barco escala={0.95} />
      </div>
      <Olas y={1260} f={f} color="#081d40" amp={46} fase={2} vel={1.9} />
      <Olas y={1400} f={f} color="#04122b" amp={30} fase={5} vel={1.2} />
      {/* lluvia */}
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {Array.from({length: 70}, (_, i) => {
          const x = (random(`lx${i}`) * 1300 + f * 9) % 1300 - 110;
          const y = (random(`ly${i}`) * 1920 + f * 48) % 1920;
          return <line key={i} x1={x} y1={y} x2={x - 14} y2={y + 46} stroke="#9fc3ff" strokeOpacity={0.45} strokeWidth={3} />;
        })}
      </svg>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
      <En y={740} s={pNada} o={pNada}>
        <Titular size={150} color={C.rojo}>
          0 peces
        </Titular>
        <Titular size={110} color={C.tenue}>
          $0
        </Titular>
      </En>
    </AbsoluteFill>
  );
};

// 5 ─ La pelea
export const Pelea: React.FC = () => {
  const f = useCurrentFrame();
  const fPelea = usePalabra('pelea', 0, 20);
  const fHoras = usePalabra('horas.', 0, 60);
  const fGolpea = usePalabra('golpea', 0, 110);
  const fCal = usePalabra('calienta,', 0, 140);
  const fDesp = usePalabra('desploma.', 0, 170);
  const tx = 600 + Math.sin(f / 5) * 70;
  const ty = 1080 + Math.cos(f / 7) * 40;
  const rot = Math.sin(f / 5 + 1) * 18;
  const segs = interpolate(f, [fPelea, fHoras + 6], [0, 3 * 3600 + 27 * 60 + 12], clamp);
  const hh = Math.floor(segs / 3600);
  const mm = Math.floor((segs % 3600) / 60);
  const ss = Math.floor(segs % 60);
  const pReloj = usePop(fPelea - 4);
  const pPrecio = usePop(fGolpea - 4);
  const rojo = interpolate(f, [fGolpea, fGolpea + 6, fCal, fCal + 20], [0, 0.7, 0.5, 0.9], clamp);
  const linea = useRampa(fDesp - 6, 20);
  return (
    <AbsoluteFill>
      {/* superficie */}
      <AbsoluteFill style={{background: 'linear-gradient(#0e3672 0%, #08214d 40%, #030b1d 100%)', top: 640}} />
      <Olas y={640} f={f} color="#0e3672" amp={10} />
      <div style={{position: 'absolute', left: 260, top: 650, transform: `translate(-50%,-83%) rotate(${Math.sin(f / 4) * 4}deg)`}}>
        <Barco escala={0.75} />
      </div>
      {/* sedal tenso desde la punta de la caña */}
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <path d={`M464,440 Q${(464 + tx) / 2},${(440 + ty) / 2 + 40} ${tx - 205},${ty + 5}`} stroke="#e6eefc" strokeWidth={3} fill="none" />
      </svg>
      <div style={{position: 'absolute', left: tx, top: ty, transform: `translate(-50%,-50%) rotate(${rot}deg) scaleX(-1)`}}>
        <Atun ancho={420} rojo={rojo} id="pel" />
      </div>
      {/* burbujas de pelea */}
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {Array.from({length: 18}, (_, i) => {
          const k = (f * 2 + i * 13) % 60;
          return <circle key={i} cx={tx + Math.sin(i * 7) * 120} cy={ty - k * 6} r={4 + (i % 4) * 3} fill="none" stroke="#fff" strokeOpacity={0.5 * (1 - k / 60)} strokeWidth={2} />;
        })}
      </svg>
      <En y={1460} s={pReloj * (1 - pPrecio)} o={pReloj * (1 - pPrecio)}>
        <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 150, color: C.texto, fontVariantNumeric: 'tabular-nums'}}>
          {hh}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </div>
        <Pildora size={40}>Peleando</Pildora>
      </En>
      <En y={1460} s={pPrecio} o={pPrecio}>
        <div style={{background: C.tarjeta, border: `2px solid ${C.borde}`, borderRadius: 30, padding: 30, width: 760}}>
          <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 44, color: C.tenue, letterSpacing: 2}}>PRECIO</div>
          <svg width={700} height={240} viewBox="0 0 700 240">
            <path
              d={`M20,40 L250,50 L${250 + 420 * linea},${50 + 160 * linea}`}
              stroke={linea > 0.05 ? C.rojo : C.verde}
              strokeWidth={14}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {linea > 0.9 && <path d="M640,170 L690,215 L630,228 Z" fill={C.rojo} />}
          </svg>
        </div>
      </En>
    </AbsoluteFill>
  );
};

// 6 ─ Subasta récord en Tokio
export const Subasta: React.FC = () => {
  const f = useCurrentFrame();
  const fTokio = usePalabra('tokio,', 0, 60);
  const fDosc = usePalabra('doscientos', 0, 100);
  const fVend = usePalabra('vendió', 0, 160);
  const fTres = usePalabra('tres', 0, 170);
  const fDol = usePalabra('dólares.', 0, 240);
  const pFecha = usePop(2);
  const pTokio = usePop(fTokio - 4);
  const pAtun = usePop(6, 15);
  const pTag = usePop(fDosc - 3);
  const golpe = interpolate(f, [fVend - 10, fVend, fVend + 8], [-40, 22, 0], clamp);
  const pMazo = usePop(fVend - 16);
  const pRecord = usePop(fDol + 6, 9);
  const brillo = interpolate(f, [fDol, fDol + 20], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(60% 30% at 50% 66%, rgba(255,200,61,${0.35 * brillo}), transparent 70%)`}} />
      <div style={{position: 'absolute', top: 520, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20}}>
        <div style={{transform: `scale(${pFecha})`}}>
          <Pildora size={42}>Enero 2026</Pildora>
        </div>
        <div style={{transform: `scale(${pTokio})`, opacity: pTokio, display: 'flex', alignItems: 'center', gap: 16}}>
          <Pildora size={42} style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <Bandera /> Tokio
          </Pildora>
        </div>
      </div>
      <En y={880} s={pAtun} o={pAtun}>
        <Atun ancho={780} id="sub" />
      </En>
      {/* etiqueta colgante con el peso */}
      <div style={{position: 'absolute', left: 300, top: 760, transformOrigin: 'top center', transform: `rotate(${Math.sin(f / 9) * 6}deg) scale(${pTag})`}}>
        <svg width={4} height={80} style={{position: 'absolute', left: 86}}>
          <line x1={2} y1={0} x2={2} y2={80} stroke="#fff" strokeWidth={3} />
        </svg>
        <div style={{marginTop: 80, background: C.oro, color: C.oroOscuro, fontFamily: FUENTE, fontWeight: 900, fontSize: 52, padding: '10px 26px', borderRadius: 14}}>
          243 kg
        </div>
      </div>
      <div style={{position: 'absolute', left: 820, top: 1080, transform: `scale(${pMazo}) rotate(${golpe}deg)`, transformOrigin: '50% 100%', opacity: pMazo}}>
        <Mazo s={200} />
      </div>
      <En y={1300}>
        <Contador hasta={3200000} inicio={fTres - 2} dur={Math.max(20, fDol - fTres + 6)} prefijo="$" size={150} />
      </En>
      <En y={1460} s={pRecord} o={pRecord} r={-3}>
        <Pildora size={48} fondo={C.rojo}>
          Récord histórico
        </Pildora>
      </En>
      <Monedas desde={fDol + 4} y={1300} n={28} />
    </AbsoluteFill>
  );
};

// 7 ─ Precio por kilo
export const PorKilo: React.FC = () => {
  const fTrece = usePalabra('trece', 0, 15);
  const fKilo = usePalabra('kilo.', 0, 60);
  const pLomo = usePop(0);
  const pIgual = usePop(fTrece - 8);
  const pKilo = usePop(fKilo - 4, 10);
  return (
    <AbsoluteFill>
      <En y={760} s={pLomo} o={pLomo}>
        <Lomo s={460} />
        <Pildora size={56} fondo="rgba(255,255,255,0.1)">
          1 kg
        </Pildora>
      </En>
      <En y={1060} s={pIgual} o={pIgual}>
        <Titular size={110} color={C.tenue}>
          =
        </Titular>
      </En>
      <En y={1220}>
        <Contador hasta={13000} inicio={fTrece - 4} dur={18} prefijo="$" sufijo="+" size={210} />
      </En>
      <En y={1400} s={pKilo} o={pKilo}>
        <Pildora size={46} fondo={C.oro} color={C.oroOscuro}>
          Por cada kilo
        </Pildora>
      </En>
    </AbsoluteFill>
  );
};

const Tarjeta: React.FC<{y: number; desde: number; icono: React.ReactNode; texto: string; color: string}> = ({y, desde, icono, texto, color}) => {
  const p = usePop(desde - 3);
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 160,
        width: 760,
        height: 190,
        transform: `translateX(${(1 - p) * -200}px)`,
        opacity: p,
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        padding: '0 50px',
        boxSizing: 'border-box',
        background: C.tarjeta,
        border: `3px solid ${color}66`,
        borderRadius: 36,
        boxShadow: `0 0 50px ${color}22`,
      }}
    >
      <div style={{transform: `scale(${p}) rotate(${(1 - p) * -90}deg)`}}>{icono}</div>
      <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: 80, color, textTransform: 'uppercase', letterSpacing: -1}}>{texto}</div>
    </div>
  );
};

// 8 ─ ¿Por qué tanto?
export const PorQue: React.FC = () => {
  const fPrimer = usePalabra('primer', 0, 40);
  const pT = usePop(0);
  const pSub = usePop(fPrimer - 3);
  return (
    <AbsoluteFill>
      <En y={540} s={pT} o={pT}>
        <Titular size={120}>¿Por qué?</Titular>
      </En>
      <En y={660} s={pSub} o={pSub}>
        <Pildora size={40}>1.er atún del año</Pildora>
      </En>
      <Tarjeta y={790} desde={usePalabra('suerte,', 0, 80)} icono={<Trebol s={120} />} texto="Suerte" color={C.verde} />
      <Tarjeta y={1020} desde={usePalabra('prestigio,', 0, 110)} icono={<Trofeo s={120} />} texto="Prestigio" color={C.oro} />
      <Tarjeta y={1250} desde={usePalabra('publicidad', 0, 140)} icono={<Megafono s={120} />} texto="Publicidad" color={C.cian} />
    </AbsoluteFill>
  );
};

// 9 ─ En peligro → cuotas
export const Peligro: React.FC = () => {
  const f = useCurrentFrame();
  const fPel = usePalabra('peligro.', 0, 40);
  const fCuo = usePalabra('cuotas.', 0, 110);
  const fHoy = usePalabra('hoy', 0, 70);
  const pCard = usePop(0);
  const baja = interpolate(f, [4, fPel], [0, 1], clamp);
  const sube = interpolate(f, [fHoy, fCuo + 20], [0, 1], clamp);
  const sello = interpolate(f, [fPel - 2, fPel + 6], [2.4, 1], clamp);
  const oSello = interpolate(f, [fPel - 2, fPel + 2], [0, 1], clamp);
  const pCuota = usePop(fCuo - 4);
  // curva ilustrativa (sin cifras): cae y luego se recupera un poco
  const pts: string[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    if (x > baja * 0.7 && i > 0 && x > 0.7 * baja + sube * 0.3) break;
    const y = x <= 0.7 ? 0.12 + 0.72 * Math.pow(x / 0.7, 1.4) : 0.84 - 0.28 * ((x - 0.7) / 0.3);
    pts.push(`${40 + x * 680},${30 + y * 330}`);
  }
  return (
    <AbsoluteFill>
      <En y={940} s={pCard} o={pCard}>
        <div style={{background: C.tarjeta, border: `2px solid ${C.borde}`, borderRadius: 34, padding: 34, width: 800}}>
          <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 44, color: C.tenue, letterSpacing: 2}}>POBLACIÓN DE ATÚN ROJO</div>
          <svg width={760} height={400} viewBox="0 0 760 400">
            <line x1={40} y1={370} x2={740} y2={370} stroke={C.borde} strokeWidth={3} />
            <line x1={40} y1={20} x2={40} y2={370} stroke={C.borde} strokeWidth={3} />
            <polyline points={pts.join(' ')} stroke={sube > 0 ? C.verde : C.rojo} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{fontFamily: FUENTE, fontWeight: 600, fontSize: 26, color: C.tenue, textAlign: 'right'}}>gráfico ilustrativo</div>
        </div>
      </En>
      <En y={1380} s={sello} o={oSello} r={-8}>
        <div style={{border: `8px solid ${C.rojo}`, color: C.rojo, fontFamily: FUENTE, fontWeight: 900, fontSize: 96, padding: '6px 36px', borderRadius: 18, opacity: 1 - pCuota}}>
          EN PELIGRO
        </div>
      </En>
      <En y={1380} s={pCuota} o={pCuota}>
        <Pildora size={56} fondo={C.verde} color="#032312">
          Pesca con cuotas
        </Pildora>
      </En>
    </AbsoluteFill>
  );
};

// 10 ─ Cierre
export const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const dur = useDuracion();
  const fDiez = usePalabra('diez', 0, 20);
  const fHarias = usePalabra('harías?', 0, 70);
  const fCom = usePalabra('comentarios.', 0, 120);
  const p1 = usePop(fDiez - 6);
  const p2 = usePop(fHarias - 3, 9);
  const p3 = usePop(fCom - 6);
  const late = 1 + Math.sin(f / 5) * 0.03 * (f > fHarias ? 1 : 0);
  const pSig = usePop(dur - 50);
  return (
    <AbsoluteFill>
      <En y={640} s={p1} o={p1}>
        <Contador hasta={10000} desde={10000} inicio={0} prefijo="$" size={200} />
        <Titular size={80} color={C.tenue}>
          en 1 día
        </Titular>
      </En>
      <En y={1010} s={p2 * late} o={p2}>
        <Titular size={128}>¿Lo harías?</Titular>
      </En>
      <En y={1250} s={p3} o={p3}>
        <Pildora size={50} fondo={C.oro} color={C.oroOscuro} style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <svg width={54} height={50} viewBox="0 0 54 50">
            <path d="M6,4 H48 Q52,4 52,8 V32 Q52,36 48,36 H22 L10,46 V36 H6 Q2,36 2,32 V8 Q2,4 6,4 Z" fill={C.oroOscuro} />
          </svg>
          Comenta
        </Pildora>
      </En>
      <En y={1400} s={pSig} o={pSig}>
        <div style={{fontFamily: FUENTE, fontWeight: 700, fontSize: 44, color: C.tenue}}>Sígueme para más datos así</div>
      </En>
    </AbsoluteFill>
  );
};

export const ESCENAS: Record<string, React.FC> = {
  hook: Hook,
  reveal: Reveal,
  scale: Escala,
  storm: Tormenta,
  fight: Pelea,
  auction: Subasta,
  perkilo: PorKilo,
  why: PorQue,
  danger: Peligro,
  outro: Cierre,
};

export const TINTES: Record<string, string> = {
  hook: '#2a3f7a',
  reveal: '#1a4d8c',
  scale: '#1a3a7a',
  storm: '#14203f',
  fight: '#0f3166',
  auction: '#4a3a1a',
  perkilo: '#4a2030',
  why: '#1f3a6a',
  danger: '#4a1a24',
  outro: '#2a3f7a',
};
