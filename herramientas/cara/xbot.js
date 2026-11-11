import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const W = 1080, H = 1920;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(R.domElement);
const S = new THREE.Scene(); S.background = new THREE.Color('#cfdedd'); S.fog = new THREE.Fog('#dfeceb', 12, 34);
const cam = new THREE.PerspectiveCamera(36, W / H, .05, 100);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, ...o });
const box = (w, h, d, mat, x, y, z, parent = S) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const cyl = (r, h, mat, x, y, z, parent = S, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; parent.add(m); return m; };
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } t.anisotropy = 8; return t; }
// ---------------- PASILLO DE HOSPITAL ----------------
const LEN = 40, WID = 4.2, HGT = 3.2;
const tiles = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#d9e2e4'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9d4d8'; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); x.strokeStyle = '#b4c0c4'; x.lineWidth = 4; x.strokeRect(0, 0, w / 2, h / 2); x.strokeRect(w / 2, h / 2, w / 2, h / 2); x.strokeRect(w / 2, 0, w / 2, h / 2); x.strokeRect(0, h / 2, w / 2, h / 2); }, [4, 40]);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(WID, LEN), new THREE.MeshStandardMaterial({ map: tiles, roughness: .22, metalness: .05 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -LEN / 2 + 6; floor.receiveShadow = true; S.add(floor);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(WID, LEN), std('#f4f6f5')); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HGT, -LEN / 2 + 6); S.add(ceil);
const wallMat = std('#cfe7e1'), stripeMat = std('#5fa8a0'), railMat = std('#e9ecef', { metalness: .4, roughness: .3 }), doorMat = std('#7fb8d6'), frameMat = std('#f2f4f4'), glass = std('#bfe3ff', { roughness: .1, metalness: .2, transparent: true, opacity: .7 });
for (const s of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN, HGT), wallMat); wall.rotation.y = -s * Math.PI / 2; wall.position.set(s * WID / 2, HGT / 2, -LEN / 2 + 6); wall.receiveShadow = true; S.add(wall);
  box(.02, .5, LEN, stripeMat, s * (WID / 2 - .01), .25, -LEN / 2 + 6);           // zócalo
  cyl(.035, LEN, railMat, s * (WID / 2 - .09), .95, -LEN / 2 + 6, S, Math.PI / 2); // pasamanos
  for (let i = 0; i < 6; i++) {                                                   // puertas con número
    const z = 2 - i * 5.5 - (s > 0 ? 2.5 : 0);
    box(.06, 2.3, 1.25, frameMat, s * (WID / 2 - .03), 1.15, z); box(.08, 2.15, 1.05, doorMat, s * (WID / 2 - .05), 1.08, z);
    box(.09, .5, .32, glass, s * (WID / 2 - .06), 1.55, z - .2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.42, .2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (x) => { x.fillStyle = '#2c4f8a'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#fff'; x.font = '800 70px Montserrat'; x.textAlign = 'center'; x.fillText(String(101 + i * 2 + (s > 0 ? 1 : 0)), 128, 92); }) }));
    sign.position.set(s * (WID / 2 - .08), 2.45, z); sign.rotation.y = -s * Math.PI / 2; S.add(sign);
  }
}
// luces de techo
for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .5), new THREE.MeshBasicMaterial({ color: '#ffffff' })); p.rotation.x = Math.PI / 2; p.position.set(0, HGT - .01, 4 - i * 4); S.add(p); }
// fondo: puertas dobles de URGENCIAS
const endZ = -LEN + 6.5;
box(WID, HGT, .1, wallMat, 0, HGT / 2, endZ - .1);
for (const s of [-1, 1]) { box(.95, 2.4, .08, std('#e9eef0'), s * .5, 1.2, endZ); box(.4, .6, .1, glass, s * .5, 1.6, endZ + .02); }
const urg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .45), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 210, (x, w, h) => { x.fillStyle = '#c0201a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '800 130px Montserrat'; x.textAlign = 'center'; x.fillText('URGENCIAS', w / 2, 150); }) }));
urg.position.set(0, 2.75, endZ + .07); S.add(urg);
// camilla
function gurney(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  box(.75, .12, 2.0, std('#f7f7f5'), 0, .78, 0, g); box(.7, .08, 1.9, std('#9fc8e0'), 0, .86, 0, g); box(.6, .1, .35, std('#ffffff'), 0, .93, -.75, g);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { cyl(.025, .7, railMat, a * .3, .4, b * .85, g); const w = new THREE.Mesh(new THREE.TorusGeometry(.05, .02, 8, 14), std('#333')); w.position.set(a * .3, .06, b * .85); w.rotation.y = Math.PI / 2; g.add(w); }
  box(.04, .25, 1.8, railMat, .38, .98, 0, g); box(.04, .25, 1.8, railMat, -.38, .98, 0, g); return g; }
gurney(-1.45, -3.5, 0);
// silla de ruedas
{ const g = new THREE.Group(); g.position.set(1.5, 0, -7.5); g.rotation.y = -.5; S.add(g); const blk = std('#2b2f36');
  box(.5, .06, .45, blk, 0, .5, 0, g); box(.5, .55, .05, blk, 0, .8, -.23, g);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.28, .025, 8, 24), railMat); w.position.set(s * .3, .3, -.05); w.rotation.y = Math.PI / 2; g.add(w); } }
// soporte de suero
{ cyl(.015, 1.9, railMat, 1.7, .95, -2.2); const bag = box(.14, .22, .06, std('#e8f6ff', { transparent: true, opacity: .8 }), 1.7, 1.75, -2.08); }
// bancos de espera y planta
for (let k = 0; k < 3; k++) { box(.45, .07, .45, std('#4f82ea'), -1.75, .45, -12 - k * .55); box(.45, .45, .05, std('#4f82ea'), -1.95, .7, -12 - k * .55); }
{ cyl(.18, .35, std('#e8e3d9'), 1.75, .18, -11); const leaf = std('#4f9a5a'); for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), leaf); l.scale.set(.6, 1.6, .3); l.position.set(1.75 + Math.cos(i) * .12, .6 + (i % 3) * .1, -11 + Math.sin(i) * .12); l.rotation.z = Math.cos(i) * .5; S.add(l); } }
// alcohol en gel en la pared
box(.08, .25, .14, std('#ffffff'), 2.05, 1.25, 0.6);
// luces
S.add(new THREE.HemisphereLight('#ffffff', '#b9c9c7', 1.25));
const key = new THREE.DirectionalLight('#fffaf2', 1.6); key.position.set(1.5, 6, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -6, far: 30 }); key.shadow.radius = 5; S.add(key); S.add(key.target);
for (let i = 0; i < 4; i++) { const pl = new THREE.PointLight('#ffffff', 6, 7, 2); pl.position.set(0, HGT - .3, 2 - i * 6); S.add(pl); }
// ---------------- MANIQUÍ PROFESIONAL (modelo con esqueleto y animaciones) + cabeza en foto ----------------
const gltf = await new GLTFLoader().loadAsync('/modelos/Xbot.glb');
const bot = gltf.scene; S.add(bot);
bot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const joints = /Joints/i.test(o.material.name); o.material = new THREE.MeshStandardMaterial({ color: joints ? '#c9d0da' : '#fbfcfe', roughness: .55, metalness: 0, emissive: '#dfe6f2', emissiveIntensity: joints ? .05 : .18 }); } });
const mixer = new THREE.AnimationMixer(bot);
const clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
const MODE = new URLSearchParams(location.search).get('anim') || 'walk';
const action = mixer.clipAction(clips[MODE] || clips.walk); action.play();
let headBone, handBone; bot.traverse(o => { if (o.isBone && /Head$/.test(o.name)) headBone = o; if (o.isBone && /RightHand$/.test(o.name)) handBone = o; });
headBone.scale.setScalar(.001);   // ocultar la cabeza del muñeco: la reemplaza la foto
const tex = new THREE.TextureLoader().load('/house_cara_hd.png'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
const HH = .4, HW = HH * 130 / 188;
const headM = new THREE.Mesh(new THREE.PlaneGeometry(HW, HH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .04 })); S.add(headM);
// bastón en la mano derecha
const CANEM = std('#7a4a2a', { roughness: .45 });
const cane = new THREE.Group(); const stick = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 55, 10), CANEM); stick.position.y = -27; cane.add(stick);
const hook = new THREE.Mesh(new THREE.TorusGeometry(3.5, 1.2, 8, 16, Math.PI), CANEM); hook.position.set(3.5, 0, 0); cane.add(hook); cane.traverse(o => o.castShadow = true);
S.add(cane); cane.scale.setScalar(.0105);
const man = bot;
const rimL = new THREE.DirectionalLight('#9fc8ff', 1.8); rimL.position.set(-3, 4, -5); S.add(rimL);
// ---------------- ANIMACIÓN ----------------
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
window.renderFrame = (i) => {
  const t = i / 30, still = new URLSearchParams(location.search).get('still');
  mixer.setTime(still ? +still : t);
  const z = MODE === 'walk' && !still ? lerp(-6.5, -1.4, clamp(t / 6, 0, 1)) : -2;
  bot.position.set(0, 0, z); bot.rotation.y = 0;
  headBone.scale.setScalar(.001);
  bot.updateMatrixWorld(true);
  handBone.getWorldPosition(_p); cane.position.set(_p.x - .02, _p.y + .02, _p.z + .05); cane.rotation.set(0, Math.PI, 0);
  headBone.getWorldPosition(_p); headBone.getWorldQuaternion(_q); _e.setFromQuaternion(_q, 'YXZ');
  headM.position.set(_p.x, _p.y + HH * .2, _p.z + .12); headM.rotation.set(0, _e.y * .6, _e.z * .5);
  cam.position.set(.45, 1.35, z + 3.4); cam.lookAt(0, 1.05, z);
  key.position.set(1.5, 6, z + 4); key.target.position.set(0, 0, z);
  R.render(S, cam); return R.domElement.toDataURL('image/jpeg', .92);
};
const m = new FontFace('Montserrat', 'url(/node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2)', { weight: '800' }); await m.load(); document.fonts.add(m);
await new Promise(r => { const chk = () => tex.image ? r() : setTimeout(chk, 50); chk(); });
window.ready = true;
