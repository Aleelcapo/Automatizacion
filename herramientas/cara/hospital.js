import * as THREE from 'three';
const W = 1080, H = 1920;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(R.domElement);
const S = new THREE.Scene(); S.background = new THREE.Color('#dfeceb'); S.fog = new THREE.Fog('#dfeceb', 12, 34);
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
// ---------------- MANIQUÍ con cabeza en foto ----------------
const WHITE = new THREE.MeshStandardMaterial({ color: '#fbfcfe', roughness: .45, metalness: 0 });
const cap = (r, l) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 8, 18), WHITE); m.castShadow = true; return m; };
const man = new THREE.Group(); S.add(man);
const body = new THREE.Group(); man.add(body);
const pelvis = cap(.19, .14); pelvis.rotation.z = Math.PI / 2; pelvis.position.y = 1.0; body.add(pelvis);
const torso = new THREE.Mesh(new THREE.SphereGeometry(.33, 28, 20), WHITE); torso.scale.set(.86, 1.12, .6); torso.position.y = 1.52; torso.castShadow = true; body.add(torso);
const shoulders = cap(.07, .44); shoulders.rotation.z = Math.PI / 2; shoulders.position.y = 1.9; body.add(shoulders);
const neck = cap(.06, .06); neck.position.y = 1.99; body.add(neck);
// cabeza: plano con la foto, apoyado sobre el cuello (el mentón tapa la parte de arriba del cuello)
const headG = new THREE.Group(); headG.position.set(0, 2.03, .1); body.add(headG);
const HEAD = new URLSearchParams(location.search).get('head') || 'C0';
const tex = new THREE.TextureLoader().load({ A: '/house_head3d.png', B: '/house_sticker.png', C: '/house_badge.png' }[HEAD] || '/house_cara.png'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
let headM;
if (HEAD === 'A') {
  // cabeza 3D con forma de huevo; la foto se proyecta de frente sobre la cara
  const g = new THREE.SphereGeometry(.25, 48, 36); const p = g.attributes.position, uv = g.attributes.uv;
  for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); if (z > -.02) uv.setXY(k, .5 + x / .4, .42 + (y + .02) / .44); else uv.setXY(k, .02, .98); }
  headM = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: .55 })); headM.scale.set(.92, 1.2, .95); headM.position.y = .27; headM.castShadow = true; headG.add(headM); headG.position.z = 0;
} else {
  const AR = HEAD === 'C' ? 1 : HEAD === 'B' ? (130 + 48) / (188 + 48) : 130 / 188, HH = HEAD === 'C' ? .62 : .8;
  headM = new THREE.Mesh(new THREE.PlaneGeometry(HH * AR, HH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .05 }));
  headM.position.y = HH / 2 - (HEAD === 'C' ? .02 : .07); headG.add(headM);
}
// sombra suave del mentón sobre el cuello
const shadowC = new THREE.Mesh(new THREE.CircleGeometry(.09, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .18 })); shadowC.scale.set(1, .5, 1); shadowC.visible = false;
function limb(len1, len2, r) { const a = new THREE.Group(), u = cap(r, len1 - 2 * r); u.position.y = -len1 / 2; a.add(u); const j = new THREE.Group(); j.position.y = -len1 - .02; a.add(j); const l = cap(r * .92, len2 - 2 * r); l.position.y = -len2 / 2; j.add(l); return { root: a, joint: j }; }
const arms = [-1, 1].map(s => { const L = limb(.47, .43, .072); L.root.position.set(s * .37, 1.9, 0); body.add(L.root); const hand = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), WHITE); hand.scale.set(.9, 1.15, .75); hand.position.y = -.49; hand.castShadow = true; L.joint.add(hand); return L; });
const legs = [-1, 1].map(s => { const L = limb(.52, .5, .088); L.root.position.set(s * .16, .93, 0); man.add(L.root); const foot = cap(.075, .16); foot.rotation.x = Math.PI / 2; foot.position.set(0, -.54, .08); L.joint.add(foot); return L; });
// bastón (lo único característico además de la cara)
const CANE = std('#7a4a2a', { roughness: .45 });
const cane = new THREE.Group(); const stick = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .95, 10), CANE); stick.position.y = -.47; stick.castShadow = true; cane.add(stick);
const hook = new THREE.Mesh(new THREE.TorusGeometry(.06, .02, 8, 16, Math.PI), CANE); hook.position.set(.06, 0, 0); cane.add(hook);
arms[0].joint.add(cane); cane.position.set(0, -.49, .03);
// ---------------- ANIMACIÓN ----------------
window.renderFrame = (i) => {
  const t = i / 30;
  if (new URLSearchParams(location.search).get('still')) { man.position.set(0, 0, -2); legs.forEach(l => { l.root.rotation.x = 0; l.joint.rotation.x = 0; }); arms[0].root.rotation.set(-.1, 0, -.1); arms[0].joint.rotation.x = -.35; arms[1].root.rotation.set(0, 0, .12); arms[1].joint.rotation.x = -.15; headG.rotation.y = -.25; body.rotation.y = .25; cam.position.set(.7, 2.05, 1.5); cam.lookAt(0, 1.85, -2); R.render(S, cam); return R.domElement.toDataURL('image/jpeg', .92); }
  const z = lerp(-6.5, -1.2, clamp(t / 6, 0, 1));      // camina hacia la cámara por el pasillo
  const w = t * 5.0, sw = Math.sin(w);
  man.position.set(-.1, Math.abs(Math.cos(w)) * .035, z);
  legs[0].root.rotation.x = sw * .4; legs[1].root.rotation.x = -sw * .4;
  legs[0].joint.rotation.x = Math.max(0, -Math.cos(w)) * .55; legs[1].joint.rotation.x = Math.max(0, Math.cos(w)) * .55;
  arms[1].root.rotation.set(sw * .32, 0, .1); arms[1].joint.rotation.x = -.2;
  arms[0].root.rotation.set(-sw * .25 - .08, 0, -.08); arms[0].joint.rotation.x = -.35; cane.rotation.x = .35 + sw * .2;
  body.rotation.z = Math.sin(w) * .025;                // leve cojera
  headG.rotation.z = -Math.sin(w) * .03; headG.position.y = 2.03 + Math.abs(Math.cos(w)) * .01;
  cam.position.set(.9, 1.55, z + 6.2 - Math.sin(t * .4) * .2); cam.lookAt(-.1, 1.3, z - 1);
  key.position.set(1.5, 6, z + 4); key.target.position.set(0, 0, z);
  R.render(S, cam); return R.domElement.toDataURL('image/jpeg', .92);
};
const m = new FontFace('Montserrat', 'url(/node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2)', { weight: '800' }); await m.load(); document.fonts.add(m);
await new Promise(r => { const chk = () => tex.image ? r() : setTimeout(chk, 50); chk(); });
window.ready = true;
