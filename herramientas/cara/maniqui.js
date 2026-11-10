import * as THREE from 'three';
const W = 1080, H = 1920;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
document.body.appendChild(R.domElement);
const S = new THREE.Scene(); S.background = new THREE.Color('#0b1430'); S.fog = new THREE.Fog('#0b1430', 14, 40);
const cam = new THREE.PerspectiveCamera(32, W / H, .1, 100);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// fondo: paneles celestes flotando
const panels = [];
for (let i = 0; i < 16; i++) { const s = .8 + ((i * 37) % 10) / 6; const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: i % 3 ? '#8fc7ff' : '#c9e4ff', transparent: true, opacity: .55 + (i % 4) * .1 })); p.position.set(((i * 97) % 14) - 7, ((i * 53) % 9) + .5, -6 - (i % 5) * 2); S.add(p); panels.push(p); }
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#0e1a3a', roughness: .25, metalness: .4 })); floor.rotation.x = -Math.PI / 2; S.add(floor);
S.add(new THREE.HemisphereLight('#dce9ff', '#1a2244', 1.3));
const key = new THREE.DirectionalLight('#ffffff', 2.4); key.position.set(2, 5, 6); S.add(key);
const rim = new THREE.DirectionalLight('#8fc7ff', 2.2); rim.position.set(-4, 3, -4); S.add(rim);
// maniquí: piezas blancas redondeadas y separadas
const WHITE = new THREE.MeshStandardMaterial({ color: '#f4f6fb', roughness: .55, metalness: .0, emissive: '#3a4a7a', emissiveIntensity: .12 });
const cap = (r, l) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 8, 16), WHITE);
const G = () => new THREE.Group();
const man = G(); S.add(man);
const pelvis = cap(.2, .12); pelvis.rotation.z = Math.PI / 2; pelvis.position.y = 1.0; man.add(pelvis);
const torso = new THREE.Mesh(new THREE.SphereGeometry(.34, 24, 18), WHITE); torso.scale.set(1, 1.25, .7); torso.position.y = 1.55; man.add(torso);
const neck = cap(.06, .06); neck.position.y = 2.02; man.add(neck);
const chest = cap(.08, .5); chest.rotation.z = Math.PI / 2; chest.position.y = 1.92; man.add(chest);
// cabeza = foto recortada
const tex = new THREE.TextureLoader().load('/house_cara.png'); tex.colorSpace = THREE.SRGBColorSpace;
const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); head.scale.set(.6, .87, 1); head.position.y = 2.36; man.add(head);
function limb(len1, len2, r) { const a = G(), u = cap(r, len1 - 2 * r); u.position.y = -len1 / 2; a.add(u); const j = G(); j.position.y = -len1 - .03; a.add(j); const l = cap(r * .92, len2 - 2 * r); l.position.y = -len2 / 2; j.add(l); return { root: a, joint: j }; }
const arms = [-1, 1].map(s => { const L = limb(.48, .44, .075); L.root.position.set(s * .44, 1.9, 0); man.add(L.root); const hand = new THREE.Mesh(new THREE.SphereGeometry(.085, 14, 12), WHITE); hand.scale.set(.9, 1.15, .7); hand.position.y = -.5; L.joint.add(hand); return L; });
const legs = [-1, 1].map(s => { const L = limb(.52, .5, .09); L.root.position.set(s * .17, .92, 0); man.add(L.root); const foot = cap(.07, .14); foot.rotation.x = Math.PI / 2; foot.position.set(0, -.55, .07); L.joint.add(foot); return L; });
// bastón en la mano derecha (de pantalla izquierda)
const CANE = new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: .5 });
const cane = G(); const stick = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.0, 10), CANE); stick.position.y = -.5; cane.add(stick);
const hook = new THREE.Mesh(new THREE.TorusGeometry(.065, .022, 8, 16, Math.PI), CANE); hook.position.set(.065, 0, 0); cane.add(hook);
arms[0].joint.add(cane); cane.position.set(0, -.5, .04);
// etiqueta con el nombre
function label(txt) { const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const x = c.getContext('2d'); x.font = '900 150px Montserrat'; x.textAlign = 'center'; x.lineJoin = 'round'; x.lineWidth = 22; x.strokeStyle = '#fff'; x.strokeText(txt, 512, 160); x.fillStyle = '#e8322b'; x.fillText(txt, 512, 160); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(1.5, .32, 1); s.renderOrder = 5; return s; }
let name;
window.renderFrame = (i) => {
  const t = i / 30;
  // caminata en el lugar (cojeando apenas) + giro suave
  const w = t * 5.2, sw = Math.sin(w);
  legs[0].root.rotation.x = sw * .38; legs[1].root.rotation.x = -sw * .38;
  legs[0].joint.rotation.x = Math.max(0, -Math.cos(w)) * .6; legs[1].joint.rotation.x = Math.max(0, Math.cos(w)) * .6;
  arms[1].root.rotation.x = sw * .35; arms[1].root.rotation.z = .12; arms[1].joint.rotation.x = -.25;
  arms[0].root.rotation.x = -sw * .22 - .1; arms[0].root.rotation.z = -.1; arms[0].joint.rotation.x = -.3;
  man.position.y = Math.abs(Math.cos(w)) * .04; man.rotation.y = Math.sin(t * .6) * .25;
  head.position.y = 2.36 + Math.abs(Math.cos(w)) * .02; head.material.rotation = Math.sin(w) * .04;
  panels.forEach((p, k) => { p.position.y += Math.sin(t * .8 + k) * .002; });
  const k = ease(clamp(t / 6, 0, 1)); cam.position.set(lerp(.6, -.3, k), lerp(1.7, 1.9, k), lerp(7.2, 5.6, k)); cam.lookAt(0, 1.5, 0);
  R.render(S, cam); return R.domElement.toDataURL('image/jpeg', .92);
};
const m = new FontFace('Montserrat', 'url(/node_modules/@fontsource/montserrat/files/montserrat-latin-900-normal.woff2)', { weight: '900' }); await m.load(); document.fonts.add(m);
name = label('DR. HOUSE'); name.position.set(0, 1.5, .4); man.add(name);
await new Promise(r => { const chk = () => tex.image ? r() : setTimeout(chk, 50); chk(); });
window.ready = true;
