// Timeline of the Pisa short ("La torre que salvó la guerra"): shots timed to the user's Spanish voice
// (~/pisa-short/voice/words.json, cortos/pisa/words_frames.txt), the tower's state per era (storeys built, lean,
// banana compensation, sink) and the camera grammar of the bridge short: smootherstep glides, creeping push-ins on
// every hold, hard cuts on big reframes, 7-frame flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 1880;
export const D0 = 0; // ground height (build.ts houses stand on D0)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- places ----------------
/** the beach of the explanation, far from the piazza (fog hides one from the other) */
export const BEACH: V3 = [1000, 0, 0];
/** tower dimensions (m): plinth, ground storey, six open galleries, belfry */
export const TW = { rPlinth: 8.1, rBase: 7.6, h0: 11, hG: 5.4, nG: 6, rBell: 4.7, hBell: 6.2 };
/** height of the top of storey n (0 = ground storey, 1..6 galleries, 7 = belfry) on an upright tower */
export const storeyTop = (n: number) => (n <= 0 ? TW.h0 : n <= TW.nG ? TW.h0 + n * TW.hG : TW.h0 + TW.nG * TW.hG + TW.hBell);
export const PODIUM: V3 = [6.2, 0, -15.5];
export const DUCE_AT: V3 = [6.2, 1.0, -15.5];
export const CHIEF_AT: V3 = [7.6, 0, -12];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "hook" | "dig" | "top" | "war" | "none" | "beach" | "warfar" | "return" | "duce" | "duce2" | "engineers" | "chief" | "empty";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 147, light: "day", crowd: "hook" },        // today, soldiers of Pisa march past on "guerra"
  { id: 2, a: 147, b: 358, light: "day", crowd: "dig" },        // 1173: the foundation pit
  { id: 3, a: 358, b: 495, light: "day", crowd: "top" },        // 1178: second floor, the lean starts
  { id: 4, a: 495, b: 570, light: "day", crowd: "war" },        // off to war
  { id: 5, a: 570, b: 633, light: "golden", crowd: "none" },    // abandoned for a century
  { id: 6, a: 633, b: 852, light: "day", crowd: "beach" },      // wet sand
  { id: 7, a: 852, b: 916, light: "golden", crowd: "warfar" },  // a century of war packs the ground
  { id: 8, a: 916, b: 982, light: "golden", crowd: "none" },    // what if: it topples
  { id: 9, a: 982, b: 1172, light: "day", crowd: "return" },    // builders return, storeys bend back: banana
  { id: 10, a: 1172, b: 1354, light: "day", crowd: "duce" },    // 1934: cement
  { id: 11, a: 1354, b: 1481, light: "day", crowd: "duce2" },   // luckily / unluckily
  { id: 12, a: 1481, b: 1669, light: "day", crowd: "engineers" }, // 1990: soil out from the high side
  { id: 13, a: 1669, b: 1837, light: "day", crowd: "chief" },   // stopped on purpose; tourists
  { id: 14, a: 1837, b: TOTAL, light: "day", crowd: "empty" },  // the straight tower nobody visits
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 5: 8, 6: 8, 7: 8, 9: 8, 10: 8, 12: 8 };
export const FLASH_AT = 147;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the tower per era ----------------
/** storeys: how many are built (0 = foundation only, 1 = ground storey, 2..7 = galleries, 8 = belfry; fractional =
 *  the next one rising); tilt: lean in degrees toward -x (screen right from the piazza cameras); comp: banana bend,
 *  degrees each storey above the third leans back; pit: the 1173 foundation trench is open; fall: extra topple deg */
export type TowerState = { storeys: number; tilt: number; comp: number; pit: boolean; fall: number };
const T = (f: number) => f / FPS;
const pop = (t: number, at: number, dur = 0.3) => clamp01((t - at) / dur);
export const COMP = 0.55;
export const towerState = (id: number, t: number): TowerState => {
  const f = t * FPS;
  switch (id) {
    case 1: return { storeys: 8, tilt: 4.0, comp: COMP, pit: false, fall: 0 };
    case 2: return { storeys: 0.3, tilt: 0, comp: 0, pit: true, fall: 0 };
    case 3: return { storeys: 3, tilt: 2.6 * easeOut((f - 450) / 22), comp: 0, pit: false, fall: 0 };
    case 4: case 5: case 7: return { storeys: 3, tilt: 2.6, comp: 0, pit: false, fall: 0 };
    case 6: return { storeys: 3, tilt: 2.6, comp: 0, pit: false, fall: 0 };
    case 8: {
      const u = clamp01((f - 934) / 28); // accelerating topple, lands on f962 (just before "caía")
      return { storeys: 3, tilt: 2.6 + (90 - 2.6) * u * u, comp: 0, pit: false, fall: 0 };
    }
    case 9: {
      // new storeys on "hacen", "piso", "más", "alto", "lado", "hunde"; the belfry on "curvada"
      const at = [1012, 1026, 1038, 1050, 1063, 1081].map((x) => x / FPS);
      let n = 3;
      for (const a of at) n += pop(t, a, 0.27);
      n += pop(t, 1121 / FPS, 0.27);
      return { storeys: n, tilt: 2.8, comp: COMP, pit: false, fall: 0 };
    }
    case 10: return { storeys: 8, tilt: 4.6, comp: COMP, pit: false, fall: 0 };
    case 11: return { storeys: 8, tilt: 4.6 + 1.3 * easeOut((f - 1433) / 12), comp: COMP, pit: false, fall: 0 };
    case 12: return { storeys: 8, tilt: 5.9 - 1.9 * smooth((f - 1627) / 34), comp: COMP, pit: false, fall: 0 };
    case 13: return { storeys: 8, tilt: 4.0, comp: COMP, pit: false, fall: 0 };
    default: return { storeys: 8, tilt: 0, comp: 0, pit: false, fall: 0 };
  }
};
/** the beach kid sinks on "hundís" (f716-728) */
export const beachSink = (f: number) => 0.2 * easeOut((f - 716) / 12);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const B = (x: number, y: number, z: number): V3 => [BEACH[0] + x, BEACH[1] + y, BEACH[2] + z];

const CAMS: Record<number, Key[]> = {
  1: [ // low at the base looking up the lean, then wide for the marching soldiers
    { f: 0, s: (f) => zoom([7.5, 1.4, -17], [-1.5, 24, 0], 54, pushK(f, 0, 0.0025)) },
    { f: 52, dur: 34, s: (f) => zoom([7.5, 1.4, -17], [-2.5, 30, 0], 50, pushK(f, 52, 0.0022), { roll: 0.035 }) },
    { f: 92, cut: true, s: (f) => dolly([3, 1.5, -62], [-2, 17, 0], pushK(f, 92, 0.0018, 0.004, 30), { fov: 60 }) },
  ],
  2: [ // aerial over the building site, down to the trench, the soft ground
    { f: 147, s: (f) => zoom([34, 34, -62], [0, 0, 6], 44, pushK(f, 147, 0.0022)) },
    { f: 200, dur: 36, s: (f) => zoom([26, 26, -48], [0, -1, 2], 42, pushK(f, 200, 0.002)) },
    { f: 255, cut: true, s: (f) => dolly([14.2, 4.6, -10.2], [9.6, -2.6, -4.2], pushK(f, 255, 0.0022, 0.006, 30), { fov: 50, roll: -0.03 }) },
    { f: 330, cut: true, s: (f) => dolly([13.4, 1.25, -11.6], [12.2, 0.75, -7.6], pushK(f, 330, 0.003), { fov: 38 }) },
  ],
  3: [
    { f: 358, s: (f) => dolly([24, 9, -52], [0, 9, 0], pushK(f, 358, 0.0022), { fov: 40 }) },
    { f: 427, cut: true, s: (f) => zoom([20, 1.6, -38], [0, 11, 0], 46, pushK(f, 427, 0.0025, 0.006, 30)) },
    { f: 455, dur: 20, s: (f) => zoom([20, 1.6, -38], [0, 11, 0], 46, pushK(f, 427, 0.0025, 0.006, 30), { roll: -0.045 }) },
  ],
  4: [{ f: 495, s: (f) => dolly([12, 2.0, -50], [0, 9.5, 0], pushK(f, 495, 0.0022), { fov: 46 }) }],
  5: [{ f: 566, s: (f) => dolly([-24, 3.0, -52], [0, 10, 0], pushK(f, 566, 0.0018), { fov: 42 }) }],
  6: [ // beach: kid on the wet sand, closer on "hundís", feet, back out
    { f: 629, s: (f) => dolly(B(0.7, 1.35, -5.4), B(0, 0.95, 0), pushK(f, 629, 0.0022), { fov: 40 }) },
    { f: 714, cut: true, s: (f) => dolly(B(0.5, 0.8, -3.1), B(0, 0.55, 0), pushK(f, 714, 0.0025, 0.007, 22), { fov: 38, roll: 0.04 }) },
    { f: 737, cut: true, s: (f) => dolly(B(0.3, 0.32, -1.7), B(0, 0.02, 0), pushK(f, 737, 0.002), { fov: 42 }) },
    { f: 812, dur: 30, s: (f) => dolly(B(0.6, 1.05, -3.8), B(0, 0.7, 0), pushK(f, 812, 0.002), { fov: 38 }) },
  ],
  7: [{ f: 848, s: (f) => dolly([10, 2.6, -52], [0, 10, 0], pushK(f, 848, 0.0022), { fov: 46 }) }],
  8: [{ f: 916, s: (f) => dolly([-2, 6, -72], [-14, 9, 0], pushK(f, 916, 0.0018, 0.005, 30), { fov: 50 }) }],
  9: [ // side profile, wide enough for the whole tower; then the banana
    { f: 978, s: (f) => dolly([2, 17, -98], [-2, 21, 0], pushK(f, 978, 0.0012), { fov: 40 }) },
    { f: 1095, cut: true, s: (f) => dolly([10, 14, -86], [3, 25, 0], pushK(f, 1095, 0.0015, 0.005, 30), { fov: 42 }) },
  ],
  10: [
    { f: 1168, s: (f) => dolly([13, 3.2, -42], [0, 15, 0], pushK(f, 1168, 0.002), { fov: 44 }) },
    { f: 1231, cut: true, s: (f) => dolly([6.9, 2.45, -19.4], [6.2, 2.25, -15.5], pushK(f, 1231, 0.002, 0.007, 30), { fov: 36 }) },
    { f: 1268, cut: true, s: (f) => zoom([13, 1.3, -17.5], [2, 1.8, -6.5], 46, pushK(f, 1268, 0.0025)) },
  ],
  11: [
    { f: 1354, s: (f) => dolly([8.4, 2.3, -22.4], [4.2, 5.2, -11], pushK(f, 1354, 0.0025), { fov: 46 }) },
    { f: 1400, cut: true, s: (f) => dolly([15, 3, -46], [0, 16, 0], pushK(f, 1400, 0.002), { fov: 44 }) },
    { f: 1437, dur: 18, s: (f) => dolly([15, 3, -46], [0, 16, 0], pushK(f, 1400, 0.002), { fov: 44, roll: -0.045 }) },
    { f: 1455, cut: true, s: (f) => dolly([6.9, 2.45, -19.4], [6.2, 2.25, -15.5], pushK(f, 1455, 0.0025), { fov: 36, roll: 0.03 }) },
  ],
  12: [
    { f: 1477, s: (f) => dolly([18, 2.6, -31], [3, 7, 0], pushK(f, 1477, 0.002), { fov: 44 }) },
    { f: 1545, cut: true, s: (f) => dolly([13.2, 1.45, -7.8], [9.8, 0.9, -3.4], pushK(f, 1545, 0.0025), { fov: 40 }) },
    { f: 1615, cut: true, s: (f) => dolly([10, 4, -62], [0, 20, 0], pushK(f, 1615, 0.002), { fov: 42 }) },
  ],
  13: [
    { f: 1669, s: (f) => dolly([8.3, 1.95, -15.6], [7.6, 1.85, -12], pushK(f, 1669, 0.0022), { fov: 38 }) },
    { f: 1731, dur: 22, s: (f) => dolly([8.1, 1.9, -15.0], [7.6, 1.85, -12], pushK(f, 1731, 0.0022, 0.006, 30), { fov: 36, roll: 0.035 }) },
    { f: 1774, cut: true, s: (f) => dolly([3, 1.7, -33], [-0.5, 9, 0], pushK(f, 1774, 0.0025), { fov: 50 }) },
  ],
  14: [{ f: 1837, s: (f) => dolly([3, 1.7, -33], [0, 9, 0], pushK(f, 1837, 0.003, 0.006, 30), { fov: 50 }) }],
};

/** impact kicks: offset flips sign every frame, decays over 7 f */
const KICKS: [number, number][] = [[457 / FPS, 1.0], [962 / FPS, 1.8], [1437 / FPS, 1.1], [1013 / FPS, 0.3], [1027 / FPS, 0.3], [1039 / FPS, 0.3], [1051 / FPS, 0.3], [1064 / FPS, 0.3], [1082 / FPS, 0.3]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                   // hook: tower sharp
  { f: 255, cInf: 10 },                                // trench MS (focus = look)
  { f: 330, cInf: 13, focus: () => [12.2, 1.4, -7.6] }, // sinking builder CU
  { f: 358, cInf: 0 },
  { f: 633, cInf: 12, focus: () => B(0, 1.5, 0) },      // beach kid
  { f: 737, cInf: 15, focus: () => B(0, 0.15, 0) },     // feet CU
  { f: 812, dur: 30, cInf: 12, focus: () => B(0, 1.4, 0) },
  { f: 852, cInf: 0 },
  { f: 1231, cInf: 13, focus: () => [6.2, 2.6, -15.5] }, // the Duce MS
  { f: 1268, cInf: 8 },                                  // cement at the base
  { f: 1354, cInf: 7, focus: () => [6.2, 2.6, -15.5] },
  { f: 1400, cInf: 0 },
  { f: 1455, cInf: 13, focus: () => [6.2, 2.6, -15.5] },
  { f: 1481, cInf: 0 },
  { f: 1545, cInf: 12, focus: () => [10, 1.5, -3.5] },   // auger CU
  { f: 1615, cInf: 0 },
  { f: 1669, cInf: 12, focus: () => [CHIEF_AT[0], 1.6, CHIEF_AT[2]] }, // chief engineer MS
  { f: 1774, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** near framing objects (procedural bushes from build.ts), visible a <= f < b inside their own shot */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 495, b: 570, kit: "plant_bushDetailed", pos: [8.6, 0, -33.4], s: 1.3, yaw: 0.3 },
  { a: 1669, b: 1774, kit: "plant_bushDetailed", pos: [6.8, 0, -14.6], s: 0.9, yaw: 0.5 },
];
