// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxPuff, fxCreak, fxContact, fxShadow, fxBanana, fxDrop, fxDirt, fxCement, fxPisaFlag,
  pisan, builder, DUCE, worker34, engineer, tourist, BEACH_KID, Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, easeOut, BEACH, DUCE_AT, CHIEF_AT, TowerState, beachSink } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const SOLDIER = [0, 1, 2, 3].map((v) => pisan(v));
const BUILDER = [0, 1, 2, 3].map((v) => builder(v));
const WORKER = [0, 1, 2].map((v) => worker34(v));
const ENG = [0, 1].map((v) => engineer(v));
const DRILLER = engineer(1, true);
const TOURIST = [0, 1, 2, 3, 4, 5, 6].map((v) => tourist(v));
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1350, 2250, 2.25] : d < 6.5 ? [810, 1350, 1.35] : d < 16 ? [360, 600, 0.6] : [180, 300, 0.3]; // sized for the 1080 x 1920 final

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = { 2: [338 / 30], 3: [455 / 30], 6: [714 / 30, 737 / 30, 824 / 30], 10: [1243 / 30], 11: [1400 / 30, 1437 / 30], 12: [1630 / 30], 13: [1731 / 30] };
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- crowd by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const L = LEAD * FPS; // reaction lead in frames
let CUR_SWAPS: number[] = [];
const at = (f: number, w: number) => f >= w - L; // reaction on word frame w

/** a marching column along x (dir -1 = toward -x), files at z0 + k * dz; lead = x of the first row at frame f */
const column = (cam: CamInfo, f: number, out: Stage, o: { n: number; files: number; z0: number; dz: number; lead: (f: number) => number; dir: number; expr: (i: number) => Expr; who?: (i: number) => Who; flag?: boolean }) => {
  const t = f / FPS;
  for (let i = 0; i < o.n; i++) {
    const row = Math.floor(i / o.files), file = i % o.files;
    const x = o.lead(f) - o.dir * row * 1.4 + (hh(i) - 0.5) * 0.1, z = o.z0 + file * o.dz + (hh(i, 2) - 0.5) * 0.12;
    const who = o.who ? o.who(i) : { i, o: SOLDIER[vOf(i)], okey: `s${vOf(i)}` };
    const ph = q(((t * 1.0 + (o.who ? hh(i, 3) * 0.2 : 0)) % 1), 60);
    const view = viewOf(cam, x, z, o.dir, 0);
    const expr = o.expr(i), blink = lidAt(t, i, CUR_SWAPS);
    const fo: FrontOpts = { phase: ph, expr, mode: "march", blink, lift: 50 };
    const so: SideOpts = { phase: ph, expr, mode: "march", blink, stomp: 1, stride: view.fs };
    out.places.push(person(cam, who, x, 0, z, view, fo, so));
    blob(out, x, 0, z);
    if (o.flag && i === 1) {
      // the Pisan flag on a pole carried by the second man of the first row
      const fx = x + o.dir * 0.2, wav = 0.08 * Math.sin(t * 5);
      out.fx.push({ key: "pisaflag", cw: 256, ch: 160, draw: fxPisaFlag, x: fx - o.dir * 0.75, y: 3.1 + wav, z: z + 0.05, w: 1.5, h: 0.95, rot: 0.05 * Math.sin(t * 3) });
      out.fx.push({ key: "flagpole", cw: 32, ch: 512, draw: (p) => { p.g.fillStyle = "#241726"; p.g.fillRect(0, 0, 32, 512); p.g.fillStyle = "#8a5a34"; p.g.fillRect(6, 0, 20, 512); },
        x: fx, y: 2.2, z: z + 0.04, w: 0.07, h: 2.4 });
    }
  }
};

/** someone standing still (front view), facing the lens */
const stand = (cam: CamInfo, t: number, out: Stage, who: Who, x: number, y: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}, sc = 1) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { mode: "stand", expr, blink: lidAt(t, who.i, CUR_SWAPS), ...extra }, {}, sc));
  if (y > -0.05) blob(out, x, y, z, sc);
};

const fxAt = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, flat = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, flat });

const dust = (out: Stage, f: number, f0: number, pts: V3[], size: number, dur = 24) => {
  const u = (f - f0) / dur;
  if (u < 0 || u >= 1) return;
  pts.forEach(([x, y, z], i) => { const uu = q(u, 30); fxAt(out, `puff${uu}`, 300, 300, (p) => fxPuff(p, uu), x, y + size * 0.25 * u, z, size * (1 + 0.6 * u), size * (1 + 0.6 * u), i * 0.7); });
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, ts: TowerState, cam: CamInfo, top: THREE.Vector3): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS;
  LNAME = s.light;
  CUR_SWAPS = SWAPS[id] ?? [];
  findSun(cam, SUN);
  const B = (i: number): Who => ({ i: 100 + i, o: BUILDER[i % 4], okey: `b${i % 4}` });
  switch (s.crowd) {
    case "hook":
      if (f >= 86) column(cam, f, out, { n: 22, files: 2, z0: -45.5, dz: -1.3, lead: (ff) => -3 - 1.6 * (ff - 92) / FPS, dir: -1, flag: true,
        expr: (i) => (i % 3 === 0 ? "grin" : i % 3 === 1 ? "stern" : "laugh") });
      break;
    case "dig": {
      // pit diggers (seen from the edge), edge workers, the one sinking into the soft ground
      stand(cam, t, out, B(0), 8.7, -3, -5.0, at(f, 300) ? "nervous" : "stern", {}, 1);
      stand(cam, t, out, B(1), 9.2, -3, -2.4, "neutral");
      const ring: [number, number][] = [[14, -2], [13.5, 4], [-12, 7], [-13, -4], [3, 14], [-5, -13.5], [6, -13], [17, -2.5]];
      ring.forEach(([x, z], i) => stand(cam, t, out, B(i + 2), x, 0, z, (["neutral", "smile", "stern", "grin"] as Expr[])[i % 4]));
      const sink = 0.32 * easeOut((f - 336) / 14);
      if (f >= 326) stand(cam, t, out, { i: 140, o: builder(2, false), okey: "bsink" }, 12.2, -sink, -7.6, at(f, 338) ? (f > 352 ? "shock" : "nervous") : "neutral", { look: f > 345 ? -1 : 0 });
      if (f >= 334) fxAt(out, "blob|contact|mud", 128, 128, (p) => fxContact(p, "#6b4a32"), 12.2, 0.02, -7.6, 1.1, 0.8, 0, true);
      break;
    }
    case "top": {
      const shock = at(f, 457);
      [[-2.6, -5.6], [0.4, -6.2], [3.2, -5.4]].forEach(([dx, dz], i) => {
        const x = top.x + dx, y = top.y + dx * Math.sin((ts.tilt * Math.PI) / 180) + 0.05;
        stand(cam, t, out, B(i), x, y, top.z + dz, shock ? (i === 1 ? "shock" : "nervous") : (["neutral", "smile", "stern"] as Expr[])[i], { look: shock ? (i ? -1 : 1) : 0 });
      });
      [[11, -9], [13, -4], [-11, -10]].forEach(([x, z], i) => stand(cam, t, out, B(i + 4), x, 0, z, shock ? "shock" : "neutral"));
      if (f >= 450 && f < 480) for (const [x, y, z] of [[-7.8, 1.2, -1.5], [-7.4, 3.0, -2.5]] as V3[]) { const u = q((t * 1.3) % 1, 30); fxAt(out, `creak${u}`, 300, 300, (p) => fxCreak(p, u), x, y, z, 1.4, 1.4, x * 0.3); }
      dust(out, f, 457, [[-8.2, 0.3, -2], [-6.5, 0.3, -5]], 2.2, 20);
      break;
    }
    case "war":
      column(cam, f, out, { n: 18, files: 2, z0: -22, dz: -1.3, lead: (ff) => 4 - 1.6 * (ff - 495) / FPS, dir: -1, flag: true, expr: (i) => (i % 2 ? "grin" : "stern") });
      // the builders drop their tools and run after them
      column(cam, f, out, { n: 3, files: 1, z0: -25, dz: 0, lead: (ff) => 14 - 2.2 * (ff - 495) / FPS, dir: -1, expr: () => "grin", who: (i) => ({ i: 120 + i, o: builder(i, false), okey: `bn${i}` }) });
      break;
    case "beach": {
      const sink = beachSink(f);
      const expr: Expr = f < 714 - L ? "smile" : f < 737 - L ? "shock" : f < 824 - L ? "nervous" : "relief";
      stand(cam, t, out, { i: 150, o: BEACH_KID, okey: "kid" }, BEACH[0], -sink, BEACH[2], expr, { look: f > 740 && f < 820 ? -1 : 0 }, 0.85);
      // the dark wet patch at the feet lightens as the water squeezes out
      const k = 1 - 0.75 * smooth((f - 800) / 40);
      const col = `#${Math.round(150 + 60 * (1 - k)).toString(16)}${Math.round(115 + 60 * (1 - k)).toString(16)}${Math.round(70 + 60 * (1 - k)).toString(16)}`;
      if (f >= 714) fxAt(out, `blob|contact|${col}`, 128, 128, (p) => fxContact(p, col), BEACH[0], 0.012, BEACH[2], 1.0, 0.75, 0, true);
      if (f >= 779 && f < 846) for (let i = 0; i < 8; i++) {
        const u = ((f - 779) / 30 + hh(i, 5)) % 1, a = (i / 8) * Math.PI * 2;
        if (f - 779 < hh(i, 5) * 20) continue;
        fxAt(out, "drop", 120, 160, fxDrop, BEACH[0] + Math.cos(a) * (0.2 + 0.4 * u), 0.05 + 0.28 * Math.sin(Math.PI * u), BEACH[2] + Math.sin(a) * (0.12 + 0.3 * u), 0.07, 0.095);
      }
      break;
    }
    case "warfar":
      column(cam, f, out, { n: 16, files: 2, z0: 16, dz: 1.3, lead: (ff) => -12 + 1.6 * (ff - 852) / FPS, dir: 1, flag: true, expr: () => "stern" });
      column(cam, f, out, { n: 12, files: 2, z0: -24, dz: -1.3, lead: (ff) => 14 - 1.6 * (ff - 852) / FPS, dir: -1, expr: () => "grin" });
      break;
    case "none":
      if (id === 8) {
        // the topple lands on f962: dust along the fallen stub, a burst at the head
        if (f >= 962) {
          const pts: V3[] = []; for (let k = 0; k < 6; k++) pts.push([-9 - k * 3.4, 0.6, -2 + (k % 2) * 2]);
          dust(out, f, 962, pts, 5.5, 22);
          const u = (f - 962) / 9; if (u < 1) { const uu = q(u, 30); fxAt(out, `burst${uu}`, 500, 500, (p) => fxBurst(p, uu), -22, 3, -4, 9, 9); }
        }
        if (f >= 930 && f < 962) { const u = q((t * 1.3) % 1, 30); fxAt(out, `creak${u}`, 300, 300, (p) => fxCreak(p, u), -7.5, 2, -3, 2.2, 2.2, -0.4); }
      }
      break;
    case "return": {
      // builders walk back in from the right and look up as each storey rises
      column(cam, f, out, { n: 8, files: 2, z0: -14, dz: -1.4, lead: (ff) => Math.max(-6, -18 + 1.4 * (ff - 982) / FPS), dir: 1, expr: (i) => (f > 1013 ? (i % 2 ? "grin" : "smile") : "neutral"),
        who: (i) => ({ i: 100 + i, o: BUILDER[i % 4], okey: `b${i % 4}` }) });
      if (f >= 1150) {
        const k = easeOut((f - 1150) / 7), wob = 0.03 * Math.sin((f - 1150) * 0.5) * Math.exp(-(f - 1150) / 10);
        fxAt(out, "banana", 500, 500, fxBanana, 13, 22, -22, 20 * k, 20 * k, -1.4 + wob);
      }
      for (const w of [1012, 1026, 1038, 1050, 1063, 1081, 1121]) dust(out, f, w, [[-2, 0, 0]].map(() => [top.x, top.y, top.z - 6] as V3), 4, 14);
      break;
    }
    case "duce": case "duce2": {
      const d = DUCE_AT, shock = id === 11 && at(f, 1437), glad = id === 11 && !shock;
      const point = id === 10 && f >= 1243 - L && f < 1340;
      stand(cam, t, out, { i: 160, o: DUCE, okey: "duce" }, d[0], d[1], d[2], shock ? "shock" : glad ? "grin" : "stern", { wave: point ? q(0.6 + 0.2 * Math.sin(t * 2), 20) : undefined });
      // workers pour cement at the base (shot 10 c) and look on
      const wk: [number, number][] = [[4.6, -11.4], [0.8, -12.2], [-3.8, -11.6], [9.5, -11.5]];
      wk.forEach(([x, z], i) => stand(cam, t, out, { i: 170 + i, o: WORKER[i % 3], okey: `w${i % 3}` }, x, 0, z, shock ? "shock" : i % 2 ? "stern" : "neutral", { look: i % 2 ? -1 : 1 }));
      const g = id === 10 ? clamp01((f - 1272) / 60) : 1;
      if (g > 0) for (const [x, z, sc] of [[2.8, -9.2, 1], [-1.4, -9.7, 1.2], [-5.4, -8.4, 0.9], [6.4, -7.6, 0.8]] as const) {
        const kk = q(g, 20);
        fxAt(out, `cement${kk}`, 400, 260, (p) => fxCement(p, kk, "#a7a8a6"), x, 0.7 * sc * (0.4 + 0.6 * kk), z, 2.8 * sc, 1.8 * sc);
      }
      if (id === 11 && f >= 1430 && f < 1455) { const u = q((t * 1.3) % 1, 30); fxAt(out, `creak${u}`, 300, 300, (p) => fxCreak(p, u), -8, 2, -2, 2.4, 2.4, -0.4); }
      if (id === 11) dust(out, f, 1437, [[-8.5, 0.5, -3], [-6, 0.5, -6]], 3, 20);
      break;
    }
    case "engineers": {
      const happy = f >= 1630;
      const pos: [number, number][] = [[13.8, -1.2], [15.4, -3.6], [11.4, -11.4]];
      pos.forEach(([x, z], i) => stand(cam, t, out, { i: 180 + i, o: ENG[i % 2], okey: `e${i % 2}` }, x, 0, z, happy ? (i % 2 ? "laugh" : "grin") : "neutral",
        { wave: happy && i !== 1 ? q(Math.sin(t * 8 + i), 20) : undefined, look: happy ? 0 : -1 }));
      stand(cam, t, out, { i: 190, o: DRILLER, okey: "drill" }, 10.1, 0, -3.6, happy ? "grin" : "stern", { look: -1 });
      for (const w of [1556, 1573, 1590, 1606]) {
        const u = (f - w) / 14;
        if (u >= 0 && u < 1) { const uu = q(u, 30); fxAt(out, `dirt${uu}`, 400, 300, (p) => fxDirt(p, uu), 9.5, 0.6, -3.0, 1.4, 1.05); }
      }
      const g = clamp01((f - 1556) / 60), kk = q(g, 20);
      if (g > 0) fxAt(out, `heap${kk}`, 400, 260, (p) => fxCement(p, kk, "#8f6a45"), 10.9, 0.3 * (0.4 + 0.6 * kk), -1.9, 1.6, 1.05);
      break;
    }
    case "chief": {
      if (f < 1774) {
        const turned = at(f, 1735);
        stand(cam, t, out, { i: 200, o: ENG[0], okey: "chief" }, CHIEF_AT[0], 0, CHIEF_AT[2], turned ? (f > 1751 ? "smile_closed" : "smile") : "neutral",
          { look: turned ? 0 : -1, headTilt: turned ? 0 : -6 });
      } else {
        // tourists holding the tower up for the photo, and their photographers
        for (let i = 0; i < 16; i++) {
          const x = -7 + (i % 8) * 2.0 + (hh(i, 3) - 0.5) * 0.8, z = -18 - Math.floor(i / 8) * 3.2 - hh(i, 4) * 1.2;
          const shooter = i % 4 === 3;
          stand(cam, t, out, { i: 210 + i, o: TOURIST[i % 7], okey: `t${i % 7}` }, x, 0, z, shooter ? "smile" : (["grin", "laugh", "smile_closed"] as Expr[])[i % 3],
            shooter ? { prop: "camera" } : { wave: q(0.9 + 0.1 * Math.sin(t * 2 + i), 20) });
        }
      }
      break;
    }
    case "empty": break;
  }
  return out;
};
export { FPS };
