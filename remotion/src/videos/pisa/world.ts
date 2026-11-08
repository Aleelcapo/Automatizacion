// The whole place as one three.js scene: sky, lawn, paving, the 1173 trench, the tower (tower.ts), cathedral, city
// wall, town and hills (build.ts buildPiazza), the beach with its sea, clouds and the cast. update(id, f, camera)
// poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { getInputProps } from "remotion";
import { Batch, V, lam, buildPiazza, Kit, Ray, kitClone, boxGeo } from "./build";
import { ctex, grassHD, cobbleHD, waterNear, waterFar, cloudHD, rep } from "./paint";
import { Pen, fxPisaFlag } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, BEACH, TW, PODIUM, camAt, towerState, FOREGROUND, ShotDef, V3 } from "./story";
import { Tower } from "./tower";

// no Kenney models in this project: vegetation is procedural (build.ts addVeg)
export const loadKit = () => Promise.resolve({} as Kit);

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** per-shot sun override (az from the camera's forward axis, el) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 5: { az: 62, el: 13 }, 7: { az: 62, el: 13 }, 8: { az: 70, el: 15 }, 1: { az: 120, el: 40 }, 2: { az: 110 }, 9: { az: 125, el: 38 }, 12: { az: 115 }, 13: { az: 110 }, 14: { az: 110 } };

/** dirt for the trench, wet / dry sand */
const dirtTex = () => ctex("dirtHD", 512, 512, (g, r) => {
  g.fillStyle = "#9a7350"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(70,48,30,0.25)" : "rgba(200,170,120,0.22)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 16, 3 + r() * 9, r() * 3, 0, 7); g.fill(); }
});
const sandTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,90,50,0.12)" : "rgba(255,245,215,0.2)"; g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 12; i++) { g.strokeStyle = "rgba(255,245,215,0.18)"; g.lineWidth = 3; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + 20, 340, y - 20, 512, y + 6); g.stroke(); }
});

/** every lens position of the film looking at its subject (houses / trees there are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

/** horizontal quad at height y covering x0..x1, z0..z1 */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
/** lawn with a round hole (the trench) as a flat shape, uv in metres / tile */
const holedGround = (R: number, hole: number, tile: number) => {
  const s = new THREE.Shape(); s.moveTo(-R, -R); s.lineTo(R, -R); s.lineTo(R, R); s.lineTo(-R, R); s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ShapeGeometry(s, 48); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private tower: Tower;
  private lawn: THREE.Mesh; private lawnHoled: THREE.Mesh; private paving: THREE.Mesh; private pit = new THREE.Group();
  private podium = new THREE.Group(); private flagM: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    { const sz = (getInputProps() as { post?: { shadow?: number } }).post?.shadow ?? 2048; this.sun.shadow.mapSize.set(sz, sz); }
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- ground: lawn (full, or with the 1173 trench), marble paving round the tower, paths ----
    const grass = lam("grassHD", () => ({ map: grassHD(), color: "#cfd6b0" }));
    const fullG = quadUp(-900, 900, -900, 900, 450, 450);
    this.lawn = new THREE.Mesh(fullG, grass); this.lawn.receiveShadow = true; R.add(this.lawn);
    this.lawnHoled = new THREE.Mesh(holedGround(900, 12, 4), grass); this.lawnHoled.receiveShadow = true; R.add(this.lawnHoled);
    const pave = lam("pavingHD", () => ({ map: rep(cobbleHD(), 3, 3), color: "#f3ead8" }));
    const ring = new THREE.RingGeometry(TW.rPlinth - 0.2, 11.5, 64, 1); ring.rotateX(-Math.PI / 2); ring.translate(0, 0.015, 0);
    { const p = ring.attributes.position, uv = ring.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); }
    this.paving = new THREE.Mesh(ring, pave); this.paving.receiveShadow = true; R.add(this.paving);
    const b = new Batch();
    // white gravel paths across the lawn: tower -> cathedral, along the front
    const path = lam("pathHD", () => ({ map: rep(cobbleHD(), 1, 1), color: "#efe6d2" }));
    b.add(quadUp(-160, 240, -24, -19, 100, 1.25, 0.01), path);
    b.add(quadUp(11, 22, -3, 3, 3, 1.5, 0.01), path);
    // the trench (1173): dirt walls and floor, spoil heaps, planks, a ladder
    const dirt = lam("dirt", () => ({ map: rep(dirtTex(), 4, 1), side: THREE.BackSide }));
    const pit = new Batch();
    pit.add(new THREE.CylinderGeometry(12, 12, 3, 64, 1, true).translate(0, -1.5, 0), dirt);
    const floor = new THREE.RingGeometry(0, 12, 64); floor.rotateX(-Math.PI / 2); floor.translate(0, -3, 0);
    pit.add(floor, lam("dirtF", () => ({ map: rep(dirtTex(), 6, 6) })));
    const heap = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dirtH = lam("dirtH", () => ({ map: rep(dirtTex(), 2, 1) }));
    for (const [x, z, s] of [[16, -4, 2.6], [15, 7, 2.2], [-14, 9, 2.8], [-15, -6, 2.4], [4, 16, 2.0]] as const)
      pit.add(heap, dirtH, new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion(), V(s * 1.4, s * 0.7, s)));
    const wood = lam("plank", () => ({ color: "#a8724a" }));
    pit.add(boxGeo(V(9.6, 0.0, -9.2), V(13.6, 0.12, -8.6)), wood);
    for (const s of [-1, 1]) pit.add(boxGeo(V(9.8 + s * 0.25, -3, 1.4), V(9.9 + s * 0.25, 0.9, 1.5)), wood);
    for (let k = 0; k < 9; k++) pit.add(boxGeo(V(9.55, -2.8 + k * 0.4, 1.38), V(10.15, -2.74 + k * 0.4, 1.52)), wood);
    pit.build(this.pit); R.add(this.pit);
    // podium for 1934: a small stone stage with a balustrade
    const pod = new Batch(), podM = lam("podium", () => ({ color: "#d9c9a8" }));
    pod.add(boxGeo(V(PODIUM[0] - 1.6, 0, PODIUM[2] - 1.2), V(PODIUM[0] + 1.6, 1.0, PODIUM[2] + 1.2)), podM);
    pod.add(boxGeo(V(PODIUM[0] - 1.6, 1.0, PODIUM[2] - 1.25), V(PODIUM[0] + 1.6, 1.15, PODIUM[2] - 1.05)), lam("podTrim", () => ({ color: "#ece0c6" })));
    pod.build(this.podium); R.add(this.podium);
    b.build(R);
    buildPiazza(R, kit, sightLines());
    this.tower = new Tower(R);
    this.tower.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });

    // ---- the beach: dry sand, wet sand, the sea (water shader) ----
    const sb = new Batch();
    sb.add(quadUp(BEACH[0] - 400, BEACH[0] + 400, -400, -2.5, 100, 100, 0.0), lam("sandDry", () => ({ map: sandTex("sandDry", "#ecd39e") })));
    sb.add(quadUp(BEACH[0] - 400, BEACH[0] + 400, -2.5, 7.5, 100, 2.5, 0.0), lam("sandWet", () => ({ map: sandTex("sandWet", "#c9a46e") })));
    sb.build(R);
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    const sea = new THREE.Mesh(quadUp(BEACH[0] - 900, BEACH[0] + 900, 7.0, 900, 1, 1, 0.03), waterM);
    sea.receiveShadow = true; R.add(sea);
    // foam line along the shore
    const foam = new THREE.Mesh(quadUp(BEACH[0] - 400, BEACH[0] + 400, 6.6, 7.3, 1, 1, 0.045), new THREE.MeshBasicMaterial({ color: "#f4fbff" }));
    foam.layers.set(NOINK); R.add(foam);
    // Pisan flag on a pole (shot 1 and the war shots: carried by the column, drawn in cast.ts) — a fixed one on the podium in 1934
    this.flagM = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.88, 10, 1), lam("pisaFlag", () => ({ map: ctex("pisaFlagT", 256, 160, (g) => fxPisaFlag(new Pen(g))), side: THREE.DoubleSide })));
    this.flagM.layers.set(NOINK);
    R.add(this.flagM);
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    // the shadow box must hold the tower's shadow on wide shots
    let Rr = THREE.MathUtils.clamp(dist * 1.1 + 10, 14, 120);
    if (s.light === "golden") Rr = Math.max(Rr, 45);
    const fc = focus.clone(); if (fc.x < 500) { fc.y = Math.min(fc.y, 12); }
    this.sun.position.copy(fc).addScaledVector(sunDir, 260); this.sun.target.position.copy(fc);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.position.x = Math.cos((i / 10) * Math.PI * 2 + 0.3) * (620 + (i % 3) * 60) + cam.position.x * (cam.position.x > 500 ? 1 : 0) + (id === 5 || id === 7 ? t * 12 : 0);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- sea ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    // ---- tower, ground, trench, podium, flag ----
    const ts = towerState(id, t);
    this.tower.pose(ts);
    this.lawn.visible = !ts.pit; this.lawnHoled.visible = ts.pit; this.pit.visible = ts.pit; this.paving.visible = !ts.pit && ts.storeys >= 1;
    this.podium.visible = id === 10 || id === 11;
    this.flagM.visible = id === 10 || id === 11;
    if (this.flagM.visible) {
      this.flagM.position.set(PODIUM[0] - 1.9, 3.2, PODIUM[2] + 0.4);
      const p = this.flagM.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = (i % 11) / 10, y = i < 11 ? 0.44 : -0.44;
        p.setXYZ(i, -u * 1.4 + 0.7, y + 0.04 * u * Math.sin(t * 4 - u * 3), 0.18 * u * Math.sin(t * 5.5 - u * 5));
      }
      p.needsUpdate = true;
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, ts, { pos: cam.position, right, sun: sunDir }, this.tower.top(ts));
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    void twoTone;
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.0, -0.25 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
export type { V3 };
