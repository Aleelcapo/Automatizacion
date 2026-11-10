import * as THREE from 'three';
const W = 1080, H = 1920;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(R.domElement);
const S = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .1, 200);
// ---------- materiales toon + contorno
const grad = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 1; const x = c.getContext('2d'); ['#7a7a7a', '#b8b8b8', '#ffffff', '#ffffff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i, 0, 1, 1); }); const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; return t; })();
const toon = (color, map) => new THREE.MeshToonMaterial({ color, gradientMap: grad, map: map || null });
const OUT = new THREE.MeshBasicMaterial({ color: '#2a2230', side: THREE.BackSide });
function M(geo, color, { outline = .022, map, cast = true } = {}) {
  const g = new THREE.Group(); const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color, map) : color); m.castShadow = cast; m.receiveShadow = true; g.add(m);
  if (outline) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1); const ov = OUT.clone(); ov.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${outline.toFixed(3)};`); }; o.material = ov; g.add(o); }
  return g;
}
const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (w, h, d, r = .04) => { const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2); return g; };
// ---------- textura de cara (dibujada en canvas)
function faceTex(e = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#efc7a8'; x.fillRect(0, 0, 1024, 512);
  const cx = 256, ey = 238; // frente (+z) en u=0.25
  // barba de pocos días
  const gr = x.createRadialGradient(cx, 360, 20, cx, 360, 150); gr.addColorStop(0, 'rgba(120,100,90,.55)'); gr.addColorStop(1, 'rgba(120,100,90,0)');
  x.fillStyle = gr; x.beginPath(); x.ellipse(cx, 360, 150, 110, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(80,65,55,.55)'; for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 125; const px = cx + Math.cos(a) * r * 1.1, py = 372 + Math.sin(a) * r * .6; if (py > 318) x.fillRect(px, py, 2.4, 2.4); }
  // ojeras
  x.fillStyle = 'rgba(190,130,110,.25)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 54, ey + 18, 24, 9, 0, 0, Math.PI * 2); x.fill(); }
  // ojos (cansados: párpado medio cerrado)
  for (const s of [-1, 1]) { const ex = cx + s * 52; x.fillStyle = '#fbf6ef'; x.beginPath(); x.ellipse(ex, ey, 25, 13, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3d74b0'; x.beginPath(); x.arc(ex + (e.look || 0) * 6, ey + 2, 9, 0, Math.PI * 2); x.fill(); x.fillStyle = '#16141c'; x.beginPath(); x.arc(ex + (e.look || 0) * 6, ey + 2, 4.5, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#e2b496'; x.fillRect(ex - 26, ey - 16, 52, 11); x.strokeStyle = '#2a2230'; x.lineWidth = 5; x.beginPath(); x.moveTo(ex - 24, ey - 4); x.quadraticCurveTo(ex, ey - 9, ex + 24, ey - 3); x.stroke(); }
  // cejas (una levantada: sarcasmo)
  x.strokeStyle = '#4a3a30'; x.lineWidth = 9; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx - 80, ey - 30); x.quadraticCurveTo(cx - 52, ey - 38, cx - 26, ey - 30); x.stroke();
  x.beginPath(); x.moveTo(cx + 26, ey - 40); x.quadraticCurveTo(cx + 52, ey - 54, cx + 82, ey - 44); x.stroke();
  // nariz
  x.strokeStyle = '#a8705a'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx + 4, ey + 6); x.quadraticCurveTo(cx - 4, ey + 50, cx - 12, ey + 62); x.quadraticCurveTo(cx, ey + 70, cx + 12, ey + 64); x.stroke();
  // boca: media sonrisa
  x.strokeStyle = '#5a3a33'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx - 30, ey + 106); x.quadraticCurveTo(cx + 2, ey + 112, cx + 36, ey + 96); x.stroke();
  // arrugas de frente
  x.strokeStyle = 'rgba(170,110,90,.55)'; x.lineWidth = 3; for (const k of [0, 1]) { x.beginPath(); x.moveTo(cx - 50, ey - 70 - k * 14); x.quadraticCurveTo(cx, ey - 78 - k * 14, cx + 50, ey - 70 - k * 14); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// ---------- House
const C = { jacket: '#6c7078', shirt: '#2f3038', jeans: '#5a7aa8', shoe: '#ee7a35', sole: '#f4f2ec', skin: '#efc7a8', hair: '#6b5a4c', cane: '#7a4a2a' };
function house() {
  const root = new THREE.Group();
  // piernas
  for (const s of [-1, 1]) {
    const leg = M(cyl(.13, .115, 1.0, 10), C.jeans); leg.position.set(s * .15, .62, 0); root.add(leg);
    const shoe = M(new THREE.CapsuleGeometry(.11, .2, 4, 10), C.shoe); shoe.rotation.x = Math.PI / 2; shoe.position.set(s * .16, .1, .07); root.add(shoe);
    const sole = M(box(.24, .05, .42), C.sole, { outline: .012 }); sole.position.set(s * .16, .025, .07); root.add(sole);
  }
  // cadera
  const hip = M(cyl(.3, .29, .22, 12), C.jeans); hip.position.y = 1.13; root.add(hip);
  // torso con saco
  const torso = M(cyl(.33, .29, .78, 12), C.jacket); torso.position.y = 1.58; root.add(torso);
  const hem = M(cyl(.33, .345, .18, 12), C.jacket); hem.position.y = 1.18; root.add(hem);
  // camisa oscura en V + solapas
  const v = new THREE.Shape(); v.moveTo(-.13, 0); v.lineTo(0, -.42); v.lineTo(.13, 0); v.lineTo(-.13, 0);
  const shirt = new THREE.Mesh(new THREE.ShapeGeometry(v), toon(C.shirt)); shirt.position.set(0, 1.97, .345); shirt.rotation.x = -.18; root.add(shirt);
  for (const s of [-1, 1]) { const lap = new THREE.Shape(); lap.moveTo(0, 0); lap.lineTo(s * .07, -.08); lap.lineTo(s * .02, -.4); lap.lineTo(0, -.42); const lm = M(new THREE.ExtrudeGeometry(lap, { depth: .02, bevelEnabled: false }), '#5d6168', { outline: .01 }); lm.position.set(s * .13, 1.97, .33); lm.rotation.x = -.18; root.add(lm); }
  // hombros
  const sh = M(new THREE.CapsuleGeometry(.12, .48, 4, 10), C.jacket); sh.rotation.z = Math.PI / 2; sh.position.y = 1.93; root.add(sh);
  // cuello y cabeza
  const neck = M(cyl(.085, .095, .2, 10), C.skin); neck.position.y = 2.06; root.add(neck);
  const headG = new THREE.Group(); headG.position.y = 2.36; root.add(headG);
  const head = M(new THREE.SphereGeometry(.22, 32, 24), '#ffffff', { map: faceTex() }); head.scale.set(.92, 1.18, 1); headG.add(head);
  for (const s of [-1, 1]) { const ear = M(new THREE.SphereGeometry(.05, 10, 8), C.skin, { outline: .01 }); ear.scale.set(.5, 1, .8); ear.position.set(s * .2, -.01, -.01); headG.add(ear); }
  // pelo corto despeinado (casquete + mechones)
  const cap = M(new THREE.SphereGeometry(.232, 18, 12, 0, Math.PI * 2, 0, Math.PI * .42), C.hair); cap.scale.set(.95, 1.15, 1.05); cap.position.y = .01; cap.rotation.x = -.18; headG.add(cap);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, tuft = M(new THREE.SphereGeometry(.06, 6, 5), C.hair, { outline: .008 }); tuft.scale.set(1, .7, 1); tuft.position.set(Math.cos(a) * .14, .2 + Math.sin(i * 7) * .015, Math.sin(a) * .14 - .03); headG.add(tuft); }
  for (const s of [-1, 1]) { const temple = M(new THREE.SphereGeometry(.05, 8, 6), '#a39486', { outline: .006 }); temple.scale.set(.35, 1.1, .8); temple.position.set(s * .19, .05, .03); headG.add(temple); }
  // brazos: derecho con bastón, izquierdo en el bolsillo
  const armR = new THREE.Group(); armR.position.set(-.38, 1.92, 0); root.add(armR);
  const uR = M(cyl(.078, .07, .5, 10), C.jacket); uR.position.y = -.25; armR.add(uR); armR.rotation.z = -.12;
  const lR = new THREE.Group(); lR.position.y = -.5; armR.add(lR); lR.rotation.x = -.35;
  const fR = M(cyl(.07, .062, .45, 10), C.jacket); fR.position.y = -.22; lR.add(fR);
  const hR = M(new THREE.SphereGeometry(.075, 12, 10), C.skin, { outline: .01 }); hR.scale.set(1, 1.15, .9); hR.position.y = -.5; lR.add(hR);
  const armL = new THREE.Group(); armL.position.set(.38, 1.92, 0); root.add(armL); armL.rotation.z = .18;
  const uL = M(cyl(.078, .07, .5, 10), C.jacket); uL.position.y = -.25; armL.add(uL);
  const lL = new THREE.Group(); lL.position.y = -.5; armL.add(lL); lL.rotation.z = -.5; lL.rotation.x = .2;
  const fL = M(cyl(.07, .065, .38, 10), C.jacket); fL.position.y = -.18; lL.add(fL);
  // bastón
  const caneG = new THREE.Group(); root.add(caneG); caneG.position.set(-.5, 0, .32); caneG.rotation.z = .05;
  const stick = M(cyl(.025, .025, 1.12, 8), C.cane, { outline: .01 }); stick.position.y = .56; caneG.add(stick);
  const hook = M(new THREE.TorusGeometry(.07, .025, 8, 14, Math.PI), C.cane, { outline: .01 }); hook.position.set(.07, 1.12, 0); caneG.add(hook);
  const tip = M(cyl(.03, .03, .05, 8), '#2a2230', { outline: 0 }); tip.position.y = .02; caneG.add(tip);
  root.userData = { headG, armR, lR, armL, caneG };
  return root;
}
// ---------- escena: pared pastel + piso de cemento + cielo
S.background = new THREE.Color('#bfe3f4');
const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.fillStyle = '#e7e3dc'; x.fillRect(0, 0, 1024, 1024); x.strokeStyle = 'rgba(90,80,80,.35)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 256, 0); x.lineTo(i * 256, 1024); x.moveTo(0, i * 256); x.lineTo(1024, i * 256); x.stroke(); } x.lineWidth = 2; x.strokeStyle = 'rgba(90,80,80,.25)'; x.beginPath(); x.moveTo(300, 600); x.lineTo(360, 640); x.lineTo(380, 720); x.stroke(); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), toon('#ffffff', floorTex)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), toon('#b9e2cf')); wall.position.set(0, 4, -4); wall.receiveShadow = true; S.add(wall);
const base = M(box(40, .3, .3), '#a6cfbc', { outline: .01 }); base.position.set(0, .15, -3.85); S.add(base);
S.add(new THREE.HemisphereLight('#ffffff', '#c8bfb4', 1.4));
const sun = new THREE.DirectionalLight('#fff6e8', 2.2); sun.position.set(3, 7, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2 }); sun.shadow.radius = 4; S.add(sun);
const H1 = house(); S.add(H1);
// grano de papel
const paper = document.createElement('canvas'); paper.width = paper.height = 256; { const x = paper.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - .5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); }
const OUTC = document.createElement('canvas'); OUTC.width = W; OUTC.height = H; const OX = OUTC.getContext('2d');
window.renderFrame = (i) => {
  const t = i / 30;
  const views = [[0, 1.45, 6.2, 0, 1.25], [.7, 1.45, 6.2, 0, 1.25], [1.4, 1.45, 6.2, 0, 1.25], [.35, 2.25, 1.6, 0, 2.3]];
  const v = views[Math.min(3, Math.floor(i))] || views[0];
  H1.rotation.y = 0;
  cam.position.set(Math.sin(v[0]) * v[2], v[1], Math.cos(v[0]) * v[2]); cam.lookAt(0, v[4], 0);
  R.render(S, cam);
  OX.drawImage(R.domElement, 0, 0); OX.globalCompositeOperation = 'multiply'; OX.globalAlpha = .18; OX.fillStyle = OX.createPattern(paper, 'repeat'); OX.fillRect(0, 0, W, H); OX.globalCompositeOperation = 'source-over'; OX.globalAlpha = 1;
  return OUTC.toDataURL('image/jpeg', .92);
};
window.ready = true;
