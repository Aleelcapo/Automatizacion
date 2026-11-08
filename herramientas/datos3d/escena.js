import * as THREE from 'three';
const W = 1080, H = 1920;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.15; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(R.domElement);
const S = new THREE.Scene(); S.background = new THREE.Color('#05070f'); S.fog = new THREE.Fog('#05070f', 30, 90);
const cam = new THREE.PerspectiveCamera(35, W / H, .1, 300);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, eob = t => { t = clamp(t, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
// ---- piso y estadio de luces
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#0d1426', roughness: .35, metalness: .3 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(9.8, 10, 96), new THREE.MeshBasicMaterial({ color: '#ff3b5c', transparent: true, opacity: .55 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .01; S.add(ring);
for (let i = 0; i < 24; i++) { const g = new THREE.Mesh(new THREE.PlaneGeometry(.06, 120), new THREE.MeshBasicMaterial({ color: '#1d2b52', transparent: true, opacity: .5 })); g.rotation.x = -Math.PI / 2; g.rotation.z = i / 24 * Math.PI; g.position.y = .005; S.add(g); }
S.add(new THREE.HemisphereLight('#8fb0ff', '#100810', .55));
const key = new THREE.SpotLight('#ffffff', 900, 80, .45, .5, 1.6); key.position.set(6, 26, 10); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); S.add(key); S.add(key.target);
const rim = new THREE.SpotLight('#ff4d6d', 500, 70, .6, .6, 1.6); rim.position.set(-14, 14, -12); S.add(rim); S.add(rim.target);
// conos de luz visibles
for (const [x, z, c] of [[-12, -18, '#4f7dff'], [12, -18, '#ff4d6d'], [0, -24, '#ffffff']]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 40, 32, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .045, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); cone.position.set(x, 20, z); S.add(cone); }
// estrellas / bokeh de fondo
{ const g = new THREE.BufferGeometry(), n = 600, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (rnd(i) - .5) * 160; p[i * 3 + 1] = 5 + rnd(i + 9) * 60; p[i * 3 + 2] = -40 - rnd(i + 3) * 40; } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); S.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#9fb4ff', size: .25, transparent: true, opacity: .6 }))); }
// ---- corazón
const hs = new THREE.Shape(); hs.moveTo(0, -1); hs.bezierCurveTo(-.2, -.75, -1.2, -.25, -1.05, .35); hs.bezierCurveTo(-.95, .85, -.3, 1.0, 0, .55); hs.bezierCurveTo(.3, 1.0, .95, .85, 1.05, .35); hs.bezierCurveTo(1.2, -.25, .2, -.75, 0, -1);
const hg = new THREE.ExtrudeGeometry(hs, { depth: .45, bevelEnabled: true, bevelThickness: .25, bevelSize: .2, bevelSegments: 5, curveSegments: 18 }); hg.center();
const hm = new THREE.MeshStandardMaterial({ color: '#e8203f', roughness: .28, metalness: .1, emissive: '#5a0010', emissiveIntensity: .35 });
const big = new THREE.Mesh(hg, hm); big.castShadow = true; S.add(big);
const N = 1400; const inst = new THREE.InstancedMesh(hg, hm, N); inst.castShadow = true; inst.receiveShadow = true; S.add(inst);
// montaña: posiciones finales en un cono
const tgt = []; { const HH = 9.5, RR = 6.5; for (let i = 0; i < N; i++) { const u = rnd(i * 3 + 1), y = HH * (1 - Math.cbrt(1 - u * .98)), rm = RR * (1 - y / HH) + .3, a = rnd(i) * 6.283, r = Math.sqrt(rnd(i + 5)) * rm; tgt.push([Math.cos(a) * r, y + .4, Math.sin(a) * r, rnd(i + 2) * 6.28, rnd(i + 4) * 6.28]); } tgt.sort((p, q) => p[1] - q[1]); }
// ---- etiquetas (sprites con canvas)
function label(txt, sub, col = '#ff3b5c') { const c = document.createElement('canvas'); c.width = 1024; c.height = 360; const x = c.getContext('2d');
  x.font = '800 150px Montserrat'; const tw = x.measureText(txt).width; x.font = '800 64px Montserrat'; const sw = sub ? x.measureText(sub).width : 0; const w = Math.max(tw, sw) + 120;
  x.fillStyle = 'rgba(10,14,30,.88)'; x.strokeStyle = col; x.lineWidth = 8; const rx = (1024 - w) / 2; x.beginPath(); x.roundRect(rx, 20, w, sub ? 310 : 210, 40); x.fill(); x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '800 150px Montserrat'; x.shadowColor = col; x.shadowBlur = 30; x.fillText(txt, 512, 180); if (sub) { x.shadowBlur = 0; x.fillStyle = col; x.font = '800 64px Montserrat'; x.fillText(sub, 512, 285); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); m.scale.set(6.4, 2.25, 1); m.renderOrder = 10; S.add(m); return m; }
let L1, L2, L3, lastN = -1;
const fmt = n => Math.round(n).toLocaleString('es-ES');
const dummy = new THREE.Object3D();
// ---- línea de tiempo (segundos)
const T = { beat: [0, 3.2], rain: [3.2, 8.5], year: [8.5, 12.5], life: [12.5, 16] };
window.renderFrame = (i) => {
  const t = i / 30;
  // corazón grande latiendo
  const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.2)), 8);
  const bigOn = t < T.rain[0] + 1.2;
  big.visible = bigOn; big.position.set(0, lerp(3.2, .8, ease(clamp((t - T.rain[0]) / 1.2, 0, 1))), 0); big.scale.setScalar((bigOn ? lerp(1.9, .5, ease(clamp((t - T.rain[0]) / 1.2, 0, 1))) : 1) * (1 + beat * .12)); big.rotation.y = Math.sin(t * .8) * .35;
  // lluvia de corazones
  let shown = 0;
  for (let k = 0; k < N; k++) {
    const st = T.rain[0] + .6 + (k / N) * 4.2 * (k < 400 ? 1 : 1.25) + (k >= 400 ? (t > T.year[0] ? 0 : 99) : 0);
    const p = clamp((t - st) / .7, 0, 1); const [x, y, z, a, b] = tgt[k];
    if (p <= 0) { dummy.scale.setScalar(0); }
    else { shown++; const fall = 1 - Math.pow(1 - p, 3); dummy.position.set(lerp(x * .3 + (rnd(k + 11) - .5) * 4, x, fall), lerp(y + 26, y, fall), lerp(z * .3, z, fall)); dummy.rotation.set(a + (1 - p) * 4, b, a * .3); dummy.scale.setScalar(.42); }
    dummy.updateMatrix(); inst.setMatrixAt(k, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  ring.material.opacity = .35 + .25 * beat;
  // etiquetas
  if (!L1) { L1 = label('1', 'latido'); L2 = label('100.000', 'latidos por día'); L3 = label('36.000.000', 'latidos por año', '#ffd34d'); }
  L1.visible = t > .6 && t < T.rain[0]; L1.position.set(0, 7.2, 0); L1.scale.setScalar(1).multiply(new THREE.Vector3(6.4 * eob((t - .6) * 3), 2.25 * eob((t - .6) * 3), 1));
  L2.visible = t > T.rain[0] + .8 && t < T.year[0] + .3; L2.position.set(0, 12.5, 0);
  if (L2.visible) { const v = clamp((t - T.rain[0] - .8) / 4.2, 0, 1); const n = 100000 * Math.pow(v, 2.2); if (Math.round(n / 997) !== lastN) { lastN = Math.round(n / 997); S.remove(L2); L2 = label(fmt(n), 'latidos por día'); L2.position.set(0, 12.5, 0); } L2.scale.set(6.4 * 1.2, 2.25 * 1.2, 1); }
  L3.visible = t > T.year[0] + 1.4; L3.position.set(0, 15.5, 0); const k3 = eob((t - T.year[0] - 1.4) * 2.5); L3.scale.set(7.8 * k3, 2.75 * k3, 1);
  // cámara
  let cp, ct;
  if (t < T.rain[0]) { cp = new THREE.Vector3(Math.sin(t * .3) * 2, 5, 22 - t * .9); ct = new THREE.Vector3(0, 4.6, 0); }
  else if (t < T.year[0]) { const k = ease(clamp((t - T.rain[0]) / (T.year[0] - T.rain[0]), 0, 1)); cp = new THREE.Vector3(lerp(2, 10, k), lerp(5, 10, k), lerp(20, 28, k)); ct = new THREE.Vector3(0, lerp(4.5, 6.5, k), 0); }
  else { const k = ease(clamp((t - T.year[0]) / 4, 0, 1)); const a = lerp(.4, 1.3, k); cp = new THREE.Vector3(Math.sin(a) * lerp(30, 38, k), lerp(10, 15, k), Math.cos(a) * lerp(30, 38, k)); ct = new THREE.Vector3(0, lerp(6.5, 8.5, k), 0); }
  cam.position.copy(cp); cam.lookAt(ct); key.target.position.set(0, 2, 0); rim.target.position.set(0, 3, 0);
  R.render(S, cam);
  return R.domElement.toDataURL('image/jpeg', .9);
};
await document.fonts.load('800 60px Montserrat');
window.ready = true;
