// The bell tower of Pisa as stacked storeys (plinth + blind-arcade ground storey, six open galleries with real
// columns, belfry), each its own group so the story can build it storey by storey, lean it, bend the upper storeys
// back (the "banana") and topple it. Painted marble textures (seams painted in as dark tints), two-tone materials.
import * as THREE from "three";
import { Batch, lam } from "./build";
import { ctex } from "./paint";
import { TW, TowerState } from "./story";

const TAU = Math.PI * 2;
const MARBLE = "#f3dfba", MARBLE2 = "#e8d0a6", JOINT = "rgba(120,100,80,0.22)", SEAM = "rgba(52,38,44,0.85)", VOID = "#4a3c46";

/** plain marble ashlar with the faint grey banding of the real tower */
const marbleTex = (key: string, w: number, h: number, courses: number) => ctex(key, w, h, (g, r) => {
  g.fillStyle = MARBLE; g.fillRect(0, 0, w, h);
  const ch = h / courses;
  for (let i = 0; i < courses; i++) {
    g.fillStyle = i % 4 === 1 ? "rgba(150,140,128,0.16)" : `rgba(255,250,240,${(r() * 0.12).toFixed(3)})`;
    g.fillRect(0, i * ch, w, ch);
    g.fillStyle = JOINT; g.fillRect(0, i * ch, w, 2);
    let x = (i % 2) * 37 + r() * 20;
    while (x < w) { g.fillRect(x, i * ch, 2, ch); x += 70 + r() * 60; }
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(140,120,95,${(0.04 + r() * 0.06).toFixed(3)})`; g.beginPath(); g.arc(r() * w, r() * h, 8 + r() * 30, 0, TAU); g.fill(); }
});

/** arch path helper: round arch of half-width a over the rectangle x0..x0+2a, y top of the springing at ys, bottom yb */
const archPath = (g: CanvasRenderingContext2D, cx: number, a: number, ys: number, yb: number) => {
  g.beginPath(); g.moveTo(cx - a, yb); g.lineTo(cx - a, ys); g.arc(cx, ys, a, Math.PI, 0); g.lineTo(cx + a, yb); g.closePath();
};

/** ground storey: tall blind arcade, 3 arches per tile (tile repeated 5 x around) */
const groundTex = () => ctex("pisaGround", 1024, 1792, (g, r) => {
  const W = 1024, H = 1792;
  const base = marbleTex("pisaMarbleG", 1024, 1792, 36).image as HTMLCanvasElement;
  g.drawImage(base, 0, 0);
  const aw = W / 3;
  for (let i = 0; i < 3; i++) {
    const cx = aw * (i + 0.5), a = aw * 0.36, ys = H * 0.2, yb = H * 0.93;
    archPath(g, cx, a, ys, yb); g.fillStyle = MARBLE2; g.fill();
    // soft inner shade under the arch head (reads as a recess)
    const gr = g.createLinearGradient(0, ys - a, 0, ys + 300); gr.addColorStop(0, "rgba(90,70,80,0.30)"); gr.addColorStop(1, "rgba(90,70,80,0)");
    g.fillStyle = gr; g.fill();
    g.lineWidth = 7; g.strokeStyle = SEAM; g.stroke();
    // voussoirs
    g.lineWidth = 3; g.strokeStyle = "rgba(60,45,50,0.45)";
    for (let k = 1; k < 9; k++) { const t = Math.PI + (k * Math.PI) / 9; g.beginPath(); g.moveTo(cx + a * Math.cos(t), ys + a * Math.sin(t)); g.lineTo(cx + (a + 46) * Math.cos(t), ys + (a + 46) * Math.sin(t)); g.stroke(); }
    g.beginPath(); g.arc(cx, ys, a + 46, Math.PI, 0); g.stroke();
    // small lozenge in the spandrel
    const lx = aw * (i + 1), ly = ys - a * 0.55;
    g.beginPath(); g.moveTo(lx, ly - 34); g.lineTo(lx + 22, ly); g.lineTo(lx, ly + 34); g.lineTo(lx - 22, ly); g.closePath();
    g.fillStyle = "#b9a98f"; g.fill(); g.lineWidth = 4; g.strokeStyle = SEAM; g.stroke();
    // half column between arches
    const px = aw * i;
    g.fillStyle = "rgba(255,250,238,0.55)"; g.fillRect(px - 16, ys - 10, 32, yb - ys + 10);
    g.fillStyle = "rgba(110,90,80,0.25)"; g.fillRect(px + 8, ys - 10, 8, yb - ys + 10);
    g.lineWidth = 4; g.strokeStyle = SEAM; g.strokeRect(px - 16, ys - 10, 32, yb - ys + 10);
    g.fillStyle = "#e7dac0"; g.fillRect(px - 26, ys - 30, 52, 22); g.strokeRect(px - 26, ys - 30, 52, 22);
  }
  // plinth band at the foot
  g.fillStyle = "#d8c9ab"; g.fillRect(0, H * 0.93, W, H * 0.07); g.fillStyle = SEAM; g.fillRect(0, H * 0.93, W, 5);
  void r;
});

/** inner gallery wall: dark arched doorways (one per tile), tile repeated 6 x around */
const innerTex = () => ctex("pisaInner", 1024, 1024, (g) => {
  const base = marbleTex("pisaMarbleI", 1024, 1024, 18).image as HTMLCanvasElement;
  g.drawImage(base, 0, 0);
  g.fillStyle = "rgba(120,100,95,0.18)"; g.fillRect(0, 0, 1024, 1024);
  for (const cx of [256, 768]) {
    archPath(g, cx, 90, 430, 1024); g.fillStyle = VOID; g.fill(); g.lineWidth = 8; g.strokeStyle = SEAM; g.stroke();
  }
});

/** frieze over the gallery columns: a small arch springing from every column (2 arches per tile, 15 tiles around) */
const bandTex = () => ctex("pisaBand", 512, 256, (g) => {
  g.fillStyle = MARBLE; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "rgba(150,140,128,0.18)"; g.fillRect(0, 0, 512, 40);
  for (const cx of [128, 384]) {
    g.beginPath(); g.moveTo(cx - 108, 256); g.lineTo(cx - 108, 170); g.arc(cx, 170, 108, Math.PI, 0); g.lineTo(cx + 108, 256); g.closePath();
    g.fillStyle = VOID; g.fill(); g.lineWidth = 7; g.strokeStyle = SEAM; g.stroke();
    g.beginPath(); g.arc(cx, 170, 128, Math.PI, 0); g.lineWidth = 3; g.strokeStyle = "rgba(60,45,50,0.5)"; g.stroke();
  }
  g.fillStyle = SEAM; g.fillRect(0, 36, 512, 4);
});

/** belfry: six tall bell openings around (tile repeated 2 x) */
const bellTex = () => ctex("pisaBell", 1024, 768, (g) => {
  const base = marbleTex("pisaMarbleB", 1024, 768, 14).image as HTMLCanvasElement;
  g.drawImage(base, 0, 0);
  for (let i = 0; i < 3; i++) {
    const cx = 1024 * (i + 0.5) / 3;
    archPath(g, cx, 70, 260, 700); g.fillStyle = VOID; g.fill(); g.lineWidth = 8; g.strokeStyle = SEAM; g.stroke();
    g.beginPath(); g.arc(cx, 260, 92, Math.PI, 0); g.lineWidth = 4; g.stroke();
  }
  g.fillStyle = "#d8c9ab"; g.fillRect(0, 700, 1024, 68); g.fillStyle = SEAM; g.fillRect(0, 700, 1024, 5);
});

const cyl = (r: number, h: number, y0: number, seg = 64, open = false, rTop = r) => new THREE.CylinderGeometry(rTop, r, h, seg, 1, open).translate(0, y0 + h / 2, 0);
const M = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const tex = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };

export class Tower {
  root = new THREE.Group();
  /** storey groups: 0 ground, 1..6 galleries, 7 belfry; their own height for stacking */
  private st: { g: THREE.Group; h: number }[] = [];
  private found: THREE.Group;
  constructor(parent: THREE.Object3D) {
    const marble = lam("pisaMarble", () => ({ map: tex(marbleTex("pisaMarbleP", 1024, 512, 10), 6, 1) }));
    const cornice = lam("pisaCornice", () => ({ map: tex(marbleTex("pisaMarbleC", 1024, 128, 2), 8, 1) }));
    const ground = lam("pisaGroundM", () => ({ map: tex(groundTex(), 5, 1) }));
    const inner = lam("pisaInnerM", () => ({ map: tex(innerTex(), 6, 1) }));
    const band = lam("pisaBandM", () => ({ map: tex(bandTex(), 15, 1) }));
    const bell = lam("pisaBellM", () => ({ map: tex(bellTex(), 2, 1) }));
    const col = lam("pisaColumn", () => ({ color: "#f1e8d4" }));
    const cap = lam("pisaCap", () => ({ color: "#e3d5b8" }));
    // foundation masonry (visible in the 1173 trench): from 3 m down to the ground
    this.found = new THREE.Group();
    { const b = new Batch(); b.add(cyl(TW.rPlinth + 0.25, 3.1, -3.0, 64), lam("pisaFound", () => ({ map: tex(marbleTex("pisaFoundT", 1024, 512, 8), 8, 1), color: "#d9c8a8" }))); b.build(this.found); }
    this.root.add(this.found);
    // ground storey
    {
      const g = new THREE.Group(), b = new Batch();
      b.add(cyl(TW.rPlinth, 0.5, 0), marble); b.add(cyl(TW.rPlinth - 0.25, 0.45, 0.5), marble);
      b.add(cyl(TW.rBase, TW.h0 - 0.95, 0.95, 72, true), ground);
      b.add(cyl(TW.rBase + 0.35, 0.5, TW.h0 - 0.5), cornice);
      b.build(g); this.st.push({ g, h: TW.h0 });
    }
    // galleries
    const NC = 30, rc = TW.rBase - 0.3, hc = TW.hG - 1.45;
    for (let k = 0; k < TW.nG; k++) {
      const g = new THREE.Group(), b = new Batch();
      b.add(cyl(TW.rBase - 1.6, TW.hG, 0, 48, true), inner);
      for (let i = 0; i < NC; i++) {
        const a = (i / NC) * TAU, x = Math.cos(a) * rc, z = Math.sin(a) * rc;
        b.add(new THREE.CylinderGeometry(0.19, 0.22, hc, 10, 1, true), col, M(x, 0.25 + hc / 2, z));
        b.add(new THREE.BoxGeometry(0.5, 0.22, 0.5), cap, new THREE.Matrix4().makeRotationY(-a).setPosition(x, 0.25 + hc + 0.11, z));
        b.add(new THREE.BoxGeometry(0.46, 0.25, 0.46), cap, new THREE.Matrix4().makeRotationY(-a).setPosition(x, 0.125, z));
      }
      b.add(cyl(TW.rBase - 0.05, 1.0, TW.hG - 1.0, 90, true), band);
      b.add(cyl(TW.rBase + 0.35, 0.42, TW.hG - 0.42), cornice);
      b.build(g); this.st.push({ g, h: TW.hG });
    }
    // belfry
    {
      const g = new THREE.Group(), b = new Batch();
      b.add(cyl(TW.rBell, TW.hBell - 0.6, 0, 48, true), bell);
      b.add(cyl(TW.rBell + 0.35, 0.6, TW.hBell - 0.6), cornice);
      b.add(cyl(TW.rBell - 0.4, 0.5, TW.hBell, 40), marble);
      b.build(g); this.st.push({ g, h: TW.hBell });
    }
    for (const s of this.st) this.root.add(s.g);
    parent.add(this.root);
  }

  /** pose for a story state: storeys rise (scale y), the whole tower leans about its low edge (toward -x), upper
   *  storeys bend back by comp each above the third, the low side sinks into the ground */
  pose(s: TowerState) {
    this.found.visible = s.pit;
    const th0 = THREE.MathUtils.degToRad(s.tilt + s.fall), r = TW.rBase;
    // lean about the low edge, then sink the base so the high edge sits on the ground and the low edge is buried
    const sink = Math.min(1.3, r * Math.sin(Math.min(th0, THREE.MathUtils.degToRad(7))) * 1.5);
    let x = -r + r * Math.cos(th0), y = r * Math.sin(th0) - sink;
    const big = th0 > 0.5;
    if (big) y = r * Math.sin(th0) - sink * (1 - Math.min(1, (th0 - 0.5) * 2)); // a toppling tower rolls out of its pit
    let ang = th0;
    for (let k = 0; k < this.st.length; k++) {
      const { g, h } = this.st[k];
      const grow = Math.max(0, Math.min(1, (k === 0 && s.storeys < 1 ? s.storeys : s.storeys - k)));
      if (k > 2) ang -= THREE.MathUtils.degToRad(s.comp);
      g.visible = grow > 0.001;
      const e = grow < 1 ? 1 - (1 - grow) ** 3 : 1;
      g.position.set(x, y, 0); g.rotation.set(0, 0, ang); g.scale.set(1, Math.max(0.001, e), 1);
      if (grow < 1) break;
      x += -Math.sin(ang) * h; y += Math.cos(ang) * h;
      for (let j = k + 1; j < this.st.length; j++) this.st[j].g.visible = false;
    }
    for (let k = 0; k < this.st.length; k++) if (k > Math.floor(s.storeys + 0.999)) this.st[k].g.visible = false;
  }
  /** world position of the top of the highest built storey (for workers standing on it) */
  top(s: TowerState): THREE.Vector3 {
    let p = new THREE.Vector3();
    for (let k = this.st.length - 1; k >= 0; k--) if (this.st[k].g.visible) {
      const g = this.st[k].g;
      p = new THREE.Vector3(0, this.st[k].h * g.scale.y, 0).applyEuler(g.rotation).add(g.position);
      break;
    }
    void s;
    return p;
  }
}
