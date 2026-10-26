"""Escena 3D de las chinampas (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P chinampas_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Corte transversal del lago en y=0: se ve el agua, el lodo del fondo y las capas de la isla.
Todo lo que se construye vive en y >= 0 (detrás del corte).
"""
import bpy, bmesh, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/chinampas'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 65.2  # audio 64.41 s + cola
NF = int(round(DUR * FPS))
random.seed(11)

clean()
sc = bpy.context.scene

M = dict(
    water=mat('agua', (0.18, 0.48, 0.78), 0.12, alpha=0.9),
    watercut=mat('agua_corte', (0.42, 0.70, 0.95), 0.6, alpha=0.55),
    foam=flat_mat('espuma', (0.92, 0.97, 1.0), 1.6),
    mud=mat('lodo_fondo', (0.30, 0.22, 0.15), 0.9),
    mudcut=mat('lodo_corte', (0.24, 0.17, 0.11), 0.95),
    dirt=mat('tierra', (0.45, 0.30, 0.18), 0.9),
    plants=mat('capa_plantas', (0.30, 0.48, 0.16), 0.9),
    layer_mud=mat('capa_lodo', (0.22, 0.15, 0.10), 0.9),
    top=mat('tierra_cultivo', (0.20, 0.13, 0.08), 0.9),
    wood=mat('madera', (0.42, 0.27, 0.14), 0.8),
    reed=mat('carrizo', (0.72, 0.66, 0.35), 0.8),
    leaf=mat('hoja', (0.18, 0.40, 0.14), 0.8),
    leaf2=mat('hoja_ahuejote', (0.16, 0.34, 0.16), 0.85),
    bark=mat('corteza', (0.35, 0.27, 0.20), 0.9),
    root=mat('raiz', (0.62, 0.45, 0.28), 0.9),
    grass=mat('pasto', (0.40, 0.58, 0.22), 0.9),
    corn=mat('maiz', (0.35, 0.60, 0.18), 0.8),
    cob=mat('mazorca', (0.95, 0.78, 0.25), 0.6),
    chile=mat('chile', (0.85, 0.10, 0.06), 0.35),
    flower=mat('cempasuchil', (1.0, 0.50, 0.04), 0.7),
    axo=mat('ajolote', (0.98, 0.62, 0.68), 0.5),
    axog=mat('branquias', (0.95, 0.32, 0.45), 0.6),
    cloth=mat('manta', (0.92, 0.90, 0.84), 0.9),
    sash=mat('faja', (0.80, 0.15, 0.20), 0.8),
    skin=mat('piel', (0.55, 0.36, 0.24), 0.6),
    hair=mat('pelo', (0.06, 0.05, 0.05), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    volc=mat('volcan', (0.42, 0.46, 0.55), 0.9),
    volcsnow=mat('nieve_volcan', (0.95, 0.96, 1.0), 0.6),
    land=mat('tierra_lejana', (0.42, 0.55, 0.26), 0.9),
    crate1=mat('carga1', (0.95, 0.75, 0.2), 0.7),
    crate2=mat('carga2', (0.85, 0.25, 0.15), 0.7),
    crate3=mat('carga3', (0.35, 0.65, 0.25), 0.7),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
    blue=flat_mat('flecha_agua', (0.35, 0.75, 1.0), 3.0),
    white=flat_mat('flecha_corriente', (0.95, 0.97, 1.0), 2.2),
)

WL = 0.0       # nivel del agua
BOT = -1.6     # fondo del canal
IX0, IX1, IY1 = -2.0, 2.0, 2.6   # chinampa principal: x en [IX0, IX1], y en [0, IY1]
TOPZ = 0.42

# ---------------------------------------------------------------- lago
water = box('agua', -40, 40, 0, 60, BOT, WL, mats=[M['water'], M['watercut']])
face_mats(water, lambda n: 1 if n.y < -0.5 else 0)
foam = box('espuma', -40, 40, -0.03, 0.0, WL - 0.05, WL + 0.015, m=M['foam'])
bottom = box('fondo', -40, 40, 0, 60, -5, BOT, mats=[M['mud'], M['mudcut']])
face_mats(bottom, lambda n: 1 if n.y < -0.5 else 0)
# orilla lejana y volcanes (Popocatépetl e Iztaccíhuatl, estilizados)
box('orilla', -60, 60, 40, 90, BOT, 0.3, m=M['land'])
for i, (x, y, h, r) in enumerate([(-14, 70, 16, 13), (12, 74, 11, 15)]):
    prim('cone', f'volcan{i}', (x, y, h / 2), m=M['volc'], radius1=r, radius2=r * 0.12, depth=h, vertices=10)
    prim('cone', f'volcan_nieve{i}', (x, y, h * 0.82), m=M['volcsnow'], radius1=r * 0.33, radius2=r * 0.12,
         depth=h * 0.36 + 0.05, vertices=10)

# ---------------------------------------------------------------- persona en canoa
def canoe(name, loc, cargo=False):
    root = link(bpy.data.objects.new(name, None))
    hull = prim('uv_sphere', name + '_casco', (0, 0, 0), scale=(1.5, 0.38, 0.28), m=M['wood'], radius=1, segments=24, ring_count=12)
    inner = prim('uv_sphere', name + '_dentro', (0, 0, 0.06), scale=(1.4, 0.3, 0.2), m=M['dark'], radius=1, segments=24, ring_count=12)
    parts = [hull, inner]
    if cargo:
        for k, mm in enumerate((M['crate1'], M['crate2'], M['crate3'])):
            parts.append(prim('cube', f'{name}_carga{k}', (-0.6 + 0.6 * k, 0, 0.25), scale=(0.2, 0.18, 0.16), m=mm))
    for p in parts:
        p.parent = root
    root.location = loc
    return root


boat = canoe('canoa', (-4.6, 0.9, WL - 0.02))
P = person('persona', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.parent = boat
P.location = (0.3, 0, 0.12)
P.rotation_euler = (0, 0, -0.5)
# balanceo de la canoa
t = 0
while t < DUR:
    key(boat, 'rotation_euler', t, (random.uniform(-0.03, 0.03), random.uniform(-0.02, 0.02), 0))
    t += 1.2

# ---------------------------------------------------------------- 0 - 6.2: la tierra echada al agua se deshace
mound = prim('uv_sphere', 'monticulo', (-1.2, 0.8, -0.9), scale=(1.0, 0.9, 1.0), m=M['dirt'], radius=0.75, segments=24, ring_count=12)
key(mound, 'location', 0, (-1.2, 0.8, 2.5), 'CONSTANT')
key(mound, 'location', 1.9, (-1.2, 0.8, 2.5))
key(mound, 'location', 2.5, (-1.2, 0.8, -0.85))
key(mound, 'scale', 0, (0.3, 0.3, 0.3), 'CONSTANT')
key(mound, 'scale', 1.9, (0.3, 0.3, 0.3))
key(mound, 'scale', 2.6, (1.0, 0.9, 1.0))
key(mound, 'scale', 4.4, (1.0, 0.9, 1.0))
key(mound, 'scale', 5.6, (1.25, 1.0, 0.18))
key(mound, 'location', 5.6, (-0.4, 0.8, BOT + 0.05))
key(mound, 'scale', 6.18, Z, 'CONSTANT')
for k in range(14):  # tierra arrastrada por la corriente
    g = prim('uv_sphere', f'grano{k}', (0, 0, 0), m=M['dirt'], radius=random.uniform(0.06, 0.12), segments=10, ring_count=6)
    x0, z0 = -1.2 + random.uniform(-0.5, 0.5), random.uniform(-1.2, -0.2)
    pop(g, 4.4 + random.uniform(0, 0.4), 6.18, dur=0.2)
    key(g, 'location', 4.4, (x0, 0.3, z0))
    key(g, 'location', 6.15, (x0 + random.uniform(2.5, 4.5), 0.3, z0 - random.uniform(0.1, 0.5)), 'LINEAR')
for k, z in enumerate((-0.35, -0.85)):
    arrow_run(f'corriente{k}', M['white'], (-3.5, -0.1, z), (0.5, -0.1, z), (0, 0, 0), 4.3, 6.18, period=0.95, phase=k * 0.3)

# ---------------------------------------------------------------- 6.2 - 13: estacas y carrizos
stakes = []
pts = []
for k in range(9):
    pts.append((IX0 + (IX1 - IX0) * k / 8, IY1))
for k in range(5):
    pts.append((IX0, IY1 * k / 5))
    pts.append((IX1, IY1 * k / 5))
pts.sort(key=lambda p: (p[1] < IY1, p[0]))
for k, (x, y) in enumerate(pts):
    s = prim('cylinder', f'estaca{k}', (x, max(y, 0.07), (BOT - 0.4 + TOPZ + 0.3) / 2), m=M['wood'],
             radius=0.07, depth=TOPZ + 0.3 - BOT + 0.4, vertices=10)
    t = 6.4 + 1.6 * k / len(pts)
    loc = tuple(s.location)
    key(s, 'location', 0, (loc[0], loc[1], loc[2] + 2.5), 'CONSTANT')
    key(s, 'location', t, (loc[0], loc[1], loc[2] + 2.5))
    key(s, 'location', t + 0.25, loc)
    pop(s, t, dur=0.2)
    stakes.append(s)
# carrizos tejidos: paneles horizontales en las tres paredes de la cerca
reeds = []
lv = 7
for j in range(lv):
    z = BOT + 0.15 + (TOPZ - BOT) * j / lv
    t = 8.2 + 2.4 * j / lv
    segs_ = [((IX0, IY1), (IX1, IY1)), ((IX0, 0.0), (IX0, IY1)), ((IX1, 0.0), (IX1, IY1))]
    for k, (a, b) in enumerate(segs_):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        r = prim('cylinder', f'carrizo{j}_{k}', ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z), m=M['reed'],
                 radius=0.05, depth=L, vertices=8,
                 rot=(0, math.pi / 2, 0) if k == 0 else (math.pi / 2, 0, 0))
        pop(r, t + 0.1 * k, dur=0.2)
        reeds.append(r)
# la tierra se escurre entre los huecos (11.0 - 13.1)
for k in range(16):
    g = prim('uv_sphere', f'fuga{k}', (0, 0, 0), m=M['dirt'], radius=random.uniform(0.05, 0.1), segments=10, ring_count=6)
    side = random.choice((-1, 1))
    y = random.uniform(0.4, 2.2)
    z = random.uniform(-1.3, -0.3)
    pop(g, 11.0 + random.uniform(0, 0.8), 13.16, dur=0.15)
    key(g, 'location', 11.0, (side * 1.6, y, z))
    key(g, 'location', 13.1, (side * random.uniform(2.6, 3.8), y, z - random.uniform(0.2, 0.6)), 'LINEAR')
dump = prim('uv_sphere', 'tierra_echada', (0, 1.3, -0.6), scale=(1.5, 1.0, 0.7), m=M['dirt'], radius=0.8, segments=24, ring_count=12)
pop(dump, 11.0, 13.16, dur=0.3)
key(dump, 'scale', 12.9, (1.1, 0.8, 0.4))

# ---------------------------------------------------------------- 13.2 - 20.3: capas plantas / lodo
layer_times = [(14.9, 'plants'), (15.6, 'layer_mud'), (16.4, 'plants'), (17.1, 'layer_mud'),
               (17.8, 'plants'), (18.5, 'layer_mud'), (19.2, 'top')]
nL = len(layer_times)
layers = []
for k, (t, mk) in enumerate(layer_times):
    z0 = BOT + (TOPZ - BOT) * k / nL
    z1 = BOT + (TOPZ - BOT) * (k + 1) / nL
    o = box(f'capa{k}', IX0 + 0.08, IX1 - 0.08, -0.02, IY1 - 0.08, z0, z1, m=M[mk], origin=(0, IY1 / 2, z0))
    key(o, 'location', 0, (0, IY1 / 2, z0 + 1.2), 'CONSTANT')
    key(o, 'location', t, (0, IY1 / 2, z0 + 1.2))
    key(o, 'location', t + 0.35, (0, IY1 / 2, z0))
    pop(o, t, dur=0.3)
    layers.append(o)
top_layer = layers[-1]
grass_tufts = []
for k in range(10):
    g = prim('cone', f'pasto{k}', (random.uniform(-1.6, 1.6), random.uniform(0.2, 2.3), TOPZ + 0.08), m=M['grass'],
             radius1=0.08, depth=0.18, vertices=6)
    pop(g, 19.8 + 0.05 * k, dur=0.2)
    grass_tufts.append(g)
outline('contorno_chinampa', rect_xz(IX0 - 0.12, IX1 + 0.12, BOT - 0.06, TOPZ + 0.12, -0.08), M['orange'],
        (0, -0.08, -0.6), 20.3, 21.72)

# ---------------------------------------------------------------- 21.7 - 24: las orillas se desmoronan
for k in range(8):
    side = 1 if k % 2 else -1
    c = prim('cube', f'trozo{k}', (side * 1.92, random.uniform(0.2, 2.3), random.uniform(-0.1, 0.35)),
             scale=(0.09, 0.1, 0.08), rot=(random.uniform(0, 3),) * 3, m=M['top'])
    loc = tuple(c.location)
    pop(c, 21.75, 24.0, dur=0.1)
    tt = 22.0 + random.uniform(0, 1.3)
    key(c, 'location', tt, loc)
    key(c, 'location', tt + 0.8, (loc[0] + side * random.uniform(0.4, 0.9), loc[1], BOT + 0.1), 'LINEAR')

# ---------------------------------------------------------------- 24 - 29: ahuejotes y raíces
trees = []
for k, (x, y) in enumerate(((-1.75, 0.35), (1.75, 0.35), (-1.75, 2.3), (1.75, 2.3), (0, 2.35))):
    tr = link(bpy.data.objects.new(f'ahuejote{k}', None))
    trunk = prim('cylinder', f'tronco{k}', (0, 0, 1.0), m=M['bark'], radius=0.08, depth=2.0, vertices=10)
    crown = prim('uv_sphere', f'copa{k}', (0, 0, 2.3), scale=(0.45, 0.45, 1.6), m=M['leaf2'], radius=1, segments=16, ring_count=12)
    for p in (trunk, crown):
        p.parent = tr
    tr.location = (x, y, TOPZ)
    pop(tr, 24.4 + 0.35 * k, s=(1, 1, 1), dur=0.4)
    trees.append(tr)
# raíces creciendo hacia abajo, vistas en el corte
for k in range(10):
    x0 = -1.75 if k < 5 else 1.75
    pts_ = [(x0, -0.06, TOPZ)]
    x, z = x0, TOPZ
    for s_ in range(7):
        x += random.uniform(-0.28, 0.28) + (0.06 if x0 < 0 else -0.06) * (k % 3)
        x = max(IX0 + 0.05, min(IX1 - 0.05, x))
        z -= (TOPZ - BOT) / 7
        pts_.append((x, -0.06, z))
    cu = curve_obj(f'raiz{k}', pts_, M['root'], bevel=0.025)
    cu.data.bevel_factor_mapping_end = 'SPLINE'
    key(cu.data, 'bevel_factor_end', 0, 0.0, 'CONSTANT')
    key(cu.data, 'bevel_factor_end', 26.4 + 0.08 * k, 0.0)
    key(cu.data, 'bevel_factor_end', 28.6 + 0.08 * k, 1.0)

# ---------------------------------------------------------------- 29 - 36: riego / el agua sube sola
sprouts = []
for k in range(12):
    x = -1.4 + 2.8 * (k % 6) / 5
    y = 0.6 + 1.2 * (k // 6)
    sp = prim('cone', f'brote{k}', (x, y, TOPZ + 0.15), m=M['corn'], radius1=0.07, depth=0.3, vertices=8)
    pop(sp, 29.3 + 0.04 * k, s=(1, 1, 1), dur=0.2)
    key(sp, 'scale', 33.5, (1, 1, 1))
    key(sp, 'scale', 35.5, (1.4, 1.4, 2.0))
    key(sp, 'scale', 36.4, (1.4, 1.4, 2.0))
    key(sp, 'scale', 38.4, (1.1, 1.1, 1.0))   # tierra cansada
    key(sp, 'scale', 41.6, (1.1, 1.1, 1.0))
    key(sp, 'scale', 42.8, (1.5, 1.5, 2.4))   # con abono
    sprouts.append(sp)
bucket = prim('cylinder', 'cubeta', (0, 0, 0), m=M['wood'], radius=0.14, depth=0.22, vertices=16)
bucket.parent = P
bucket.location = (0.32, -0.15, 0.6)
pop(bucket, 29.2, 31.6, s=(1, 1, 1), dur=0.2)
for k in range(6):
    d = prim('uv_sphere', f'riego{k}', (0, 0, 0), m=M['blue'], radius=0.04, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 29.5 + k * 0.12
    while t < 31.5:
        key(d, 'scale', t, Z, 'CONSTANT')
        key(d, 'location', t, (-3.5, 0.9, 0.9), 'CONSTANT')
        key(d, 'scale', t + 0.05, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t + 0.6, (-2.4 + random.uniform(0, 0.6), 0.9, TOPZ + 0.1), 'LINEAR')
        key(d, 'scale', t + 0.6, Z, 'CONSTANT')
        t += 0.7
# el personaje se pasa a la orilla de la isla durante el riego
key(boat, 'location', 0, (-4.6, 0.9, WL - 0.02), 'CONSTANT')
key(boat, 'location', 28.9, (-4.6, 0.9, WL - 0.02), 'CONSTANT')
key(boat, 'location', 29.2, (-3.75, 0.9, WL - 0.02), 'CONSTANT')
key(boat, 'location', 31.6, (-3.75, 0.9, WL - 0.02), 'CONSTANT')
key(boat, 'location', 31.64, (-4.6, 0.9, WL - 0.02), 'CONSTANT')
# flechas azules: el agua sube sola por la tierra (33.4 - 36.2)
for k in range(4):
    x = -1.3 + 0.85 * k
    arrow_run(f'capilar{k}', M['blue'], (x, -0.12, -0.9), (x, -0.12, 0.15), (0, -math.pi / 2, 0), 33.3, 36.2,
              period=1.3, phase=k * 0.25, length=0.8)

# ---------------------------------------------------------------- 36 - 43: tierra cansada y abono
ptop = M['top'].node_tree.nodes['Principled BSDF']
for t, c in ((0, (0.20, 0.13, 0.08)), (36.6, (0.20, 0.13, 0.08)), (38.0, (0.56, 0.48, 0.38)),
             (41.6, (0.56, 0.48, 0.38)), (42.6, (0.08, 0.06, 0.05))):
    node_key(ptop.inputs['Base Color'], t, (*c, 1))
pleaf = M['corn'].node_tree.nodes['Principled BSDF']
for t, c in ((0, (0.35, 0.60, 0.18)), (36.6, (0.35, 0.60, 0.18)), (38.0, (0.62, 0.58, 0.25)),
             (41.6, (0.62, 0.58, 0.25)), (42.6, (0.30, 0.62, 0.16))):
    node_key(pleaf.inputs['Base Color'], t, (*c, 1))
# lodo negro sacado del fondo del canal
scoop = prim('uv_sphere', 'lodo_negro', (0, 0, 0), scale=(1, 1, 0.6), m=M['dark'], radius=0.32, segments=16, ring_count=8)
pop(scoop, 39.4, 42.3, s=(1, 1, 0.6), dur=0.2)
key(scoop, 'location', 39.4, (-3.0, 0.9, BOT + 0.15))
key(scoop, 'location', 40.4, (-3.4, 0.9, 0.6))
key(scoop, 'location', 41.2, (-1.4, 0.9, 1.4))
key(scoop, 'location', 41.8, (-0.4, 0.9, TOPZ + 0.1))
key(scoop, 'scale', 41.8, (1, 1, 0.6))
key(scoop, 'scale', 42.3, (3.0, 2.0, 0.15))
outline('contorno_abono', rect_xz(IX0 - 0.1, IX1 + 0.1, TOPZ - (TOPZ - BOT) / nL - 0.04, TOPZ + 0.1, -0.08),
        M['orange'], (0, -0.08, TOPZ - 0.15), 42.66, 43.9)

# ---------------------------------------------------------------- 46.9: cientos de chinampas
copies = []
cw, cd, gap = 4.0, 2.6, 1.7
rows = []
for r in range(6):
    y0 = r * (cd + gap)
    for c in range(-3, 4):
        if r == 0 and c == 0:
            continue
        x0 = c * (cw + gap) - cw / 2
        rows.append((r, c, x0, y0))
for k, (r, c, x0, y0) in enumerate(sorted(rows, key=lambda q: (q[0], abs(q[1])))):
    root = link(bpy.data.objects.new(f'chinampa_{r}_{c}', None))
    body = box(f'ch_cuerpo_{r}_{c}', 0, cw, (-0.02 if r == 0 else 0), cd, BOT, TOPZ - 0.12, m=M['layer_mud'], origin=(0, 0, 0))
    topb = box(f'ch_top_{r}_{c}', 0, cw, (-0.02 if r == 0 else 0), cd, TOPZ - 0.12, TOPZ, m=M['grass'], origin=(0, 0, 0))
    parts = [body, topb]
    for j, (tx, ty) in enumerate(((0.25, 0.3), (cw - 0.25, 0.3), (0.25, cd - 0.3), (cw - 0.25, cd - 0.3))):
        parts.append(prim('cylinder', f'ch_tr_{r}_{c}_{j}', (tx, ty, TOPZ + 1.0), m=M['bark'], radius=0.07, depth=2.0, vertices=8))
        parts.append(prim('uv_sphere', f'ch_cp_{r}_{c}_{j}', (tx, ty, TOPZ + 2.3), scale=(0.42, 0.42, 1.5), m=M['leaf2'],
                          radius=1, segments=12, ring_count=8))
    for j in range(3):
        parts.append(prim('cube', f'ch_surco_{r}_{c}_{j}', (cw / 2, 0.5 + j * 0.8, TOPZ + 0.06), scale=(cw / 2 - 0.4, 0.12, 0.06),
                          m=M['corn']))
    for p in parts:
        p.parent = root
    root.location = (x0, y0, 0)
    pop(root, 46.9 + 2.4 * k / len(rows), s=(1, 1, 1), dur=0.3)
    copies.append(root)

# ---------------------------------------------------------------- 49.8 - 56: canales = calles (canoas con carga)
for k, (y, x0, x1, ph) in enumerate(((cd + gap / 2, -12, 12, 0.0), (2 * cd + 1.5 * gap, 12, -12, 0.6),
                                      (3 * cd + 2.5 * gap, -12, 12, 1.0))):
    cn = canoe(f'canoa_carga{k}', (x0, y, WL - 0.02), cargo=True)
    rp = person(f'remero{k}', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
    rp.parent = cn
    rp.location = (1.0, 0, 0.12)
    if x1 < x0:
        cn.rotation_euler = (0, 0, math.pi)
    pop(cn, 47.5, s=(1, 1, 1), dur=0.3)
    key(cn, 'location', 47.5, (x0, y, WL - 0.02))
    key(cn, 'location', DUR, (x0 + (x1 - x0) * 0.85, y, WL - 0.02), 'LINEAR')
outline('contorno_canal', [(-12, cd + 0.12, WL + 0.05), (12, cd + 0.12, WL + 0.05), (12, cd + gap - 0.12, WL + 0.05),
                           (-12, cd + gap - 0.12, WL + 0.05)], M['orange'], (0, cd + gap / 2, WL + 0.05), 51.6, 53.6)

# ---------------------------------------------------------------- 56 - 61: maíz, chile, cempasúchil y ajolote
for k in range(6):
    x = -1.3 + 0.52 * k
    cr = link(bpy.data.objects.new(f'maiz{k}', None))
    st = prim('cylinder', f'maiz_tallo{k}', (0, 0, 0.6), m=M['corn'], radius=0.04, depth=1.2, vertices=8)
    l1 = prim('cone', f'maiz_hoja{k}a', (0.12, 0, 0.7), rot=(0, 1.0, 0), m=M['corn'], radius1=0.06, depth=0.5, vertices=6)
    l2 = prim('cone', f'maiz_hoja{k}b', (-0.12, 0, 0.5), rot=(0, -1.0, 0), m=M['corn'], radius1=0.06, depth=0.5, vertices=6)
    cb = prim('uv_sphere', f'mazorca{k}', (0.07, 0, 0.75), scale=(0.6, 0.6, 1.6), m=M['cob'], radius=0.07, segments=10, ring_count=8)
    for p in (st, l1, l2, cb):
        p.parent = cr
    cr.location = (x, 1.9, TOPZ)
    pop(cr, 56.3 + 0.08 * k, s=(1, 1, 1), dur=0.3)
for k in range(5):
    ch = prim('cone', f'chile{k}', (-1.2 + 0.6 * k, 1.15, TOPZ + 0.12), rot=(0.3, 2.6, 0), m=M['chile'],
              radius1=0.05, depth=0.2, vertices=10)
    pop(ch, 57.1 + 0.07 * k, s=(1, 1, 1), dur=0.25)
for k in range(9):
    fl = prim('uv_sphere', f'flor{k}', (-1.5 + 0.38 * k, 0.45, TOPZ + 0.18), m=M['flower'], radius=0.1, segments=12, ring_count=8)
    pop(fl, 57.8 + 0.05 * k, s=(1, 1, 1), dur=0.25)
for sp in sprouts:
    key(sp, 'scale', 55.9, tuple(sp.scale))
    key(sp, 'scale', 56.1, Z, 'CONSTANT')


def axolotl():
    root = link(bpy.data.objects.new('ajolote', None))
    ps = [
        prim('uv_sphere', 'ax_cuerpo', (0, 0, 0), scale=(1.9, 0.7, 0.55), m=M['axo'], radius=0.16, segments=20, ring_count=10),
        prim('uv_sphere', 'ax_cabeza', (0.32, 0, 0.02), scale=(1.0, 1.1, 0.75), m=M['axo'], radius=0.14, segments=20, ring_count=10),
        prim('cone', 'ax_cola', (-0.42, 0, 0.0), rot=(math.pi / 2, 0, -math.pi / 2), scale=(1, 0.25, 1), m=M['axo'],
             radius1=0.1, depth=0.4, vertices=12),
        prim('uv_sphere', 'ax_ojo1', (0.42, -0.1, 0.07), m=M['dark'], radius=0.02, segments=8, ring_count=6),
        prim('uv_sphere', 'ax_ojo2', (0.42, 0.1, 0.07), m=M['dark'], radius=0.02, segments=8, ring_count=6),
    ]
    for side in (-1, 1):
        for j in range(3):
            ps.append(prim('cylinder', f'ax_branq{side}{j}', (0.25, side * 0.14, 0.06 + 0.04 * j),
                           rot=(side * (0.9 + 0.3 * j), 0, 0), m=M['axog'], radius=0.018, depth=0.18, vertices=6))
        for j in (0.2, -0.15):
            ps.append(prim('cylinder', f'ax_pata{side}{j}', (j, side * 0.12, -0.07), rot=(side * 0.8, 0, 0), m=M['axo'],
                           radius=0.025, depth=0.14, vertices=6))
    for p in ps:
        p.parent = root
    return root


AX = axolotl()
AX.location = (2.9, -0.3, -0.95)
pop(AX, 59.9, s=(1.7, 1.7, 1.7), dur=0.3)
key(AX, 'location', 60.3, (2.9, -0.3, -0.95))
key(AX, 'location', DUR, (3.6, -0.3, -0.8), 'LINEAR')

# ---------------------------------------------------------------- luz y cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.45, 0.66, 0.95, 1)
bg.inputs['Strength'].default_value = 0.9
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(6)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(48), 0, math.radians(-30))
key(sun, 'energy', 0, 3.2)
key(sun, 'color', 0, (1.0, 0.96, 0.88))
key(sun, 'energy', 61.0, 3.2)
key(sun, 'color', 61.0, (1.0, 0.96, 0.88))
key(sun, 'energy', 63.5, 3.0)
key(sun, 'color', 63.5, (1.0, 0.78, 0.55))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (-1.0, -9.5, 1.8), (-0.8, 0, -0.4), (-0.6, -8.3, 1.5), (-0.8, 0, -0.4)),
    (4.26, (0.2, -7.6, 0.9), (0.6, 0, -0.5), (0.4, -7.2, 0.8), (0.8, 0, -0.5)),
    (6.18, (3.5, -8.0, 3.4), (0, 1.0, -0.2), (2.4, -8.6, 2.8), (0, 1.0, -0.2)),
    (11.0, (0, -6.8, 0.7), (0, 0.4, -0.6), (0, -6.4, 0.7), (0, 0.4, -0.6)),
    (13.16, (0, -7.4, 0.5), (0, 0, -0.55), (0, -8.4, 0.9), (0, 0, -0.5)),
    (20.28, (0, -8.6, 0.8), (0, 0, -0.45), (0, -8.4, 0.8), (0, 0, -0.45)),
    (21.72, (3.3, -5.4, 1.4), (1.8, 0.9, -0.1), (3.0, -5.0, 1.3), (1.8, 0.9, -0.1)),
    (24.02, (-3.0, -9.6, 3.0), (0, 0.8, 0.5), (2.5, -9.6, 2.4), (0, 0.8, 0.2)),
    (26.46, (0, -8.2, 0.4), (0, 0, -0.5), (0, -7.6, 0.4), (0, 0, -0.5)),
    (29.18, (-1.0, -6.6, 2.2), (-1.4, 1.0, 0.4), (-0.6, -6.2, 2.0), (-1.2, 1.0, 0.4)),
    (31.64, (0, -6.8, 0.1), (0, 0, -0.35), (0, -6.3, 0.1), (0, 0, -0.3)),
    (36.2, (0.8, -6.0, 2.2), (0, 1.1, 0.3), (0.4, -5.6, 2.0), (0, 1.1, 0.3)),
    (38.96, (-1.6, -9.0, 1.3), (-1.6, 0.4, -0.2), (-1.0, -8.6, 1.3), (-1.2, 0.4, -0.2)),
    (43.92, (0, -9.5, 3.2), (0, 1.5, 0), (0, -12.5, 5.0), (0, 2.5, 0)),
    (46.86, (0, -15.0, 8.5), (0, 6.0, 0), (0, -17.5, 11.0), (0, 7.0, 0)),
    (49.8, (-11.0, -4.0, 5.5), (-9.0, cd + gap / 2, 0.0), (-4.0, -4.0, 5.5), (-2.0, cd + gap / 2, 0.0)),
    (56.08, (0.4, -6.8, 1.9), (0, 1.2, 0.4), (0.8, -6.4, 1.6), (0.2, 1.2, 0.3)),
    (59.34, (2.2, -6.2, 0.2), (2.6, 0, -0.5), (2.6, -5.8, 0.1), (3.2, 0, -0.6)),
    (61.32, (0, -10.5, 3.0), (0, 3.0, 0.6), (0, -22.0, 13.0), (0, 8.0, 0.5)),
], DUR)

render_setup(OUT, opt, NF)
bpy.ops.ptcache.bake_all(bake=True)
run(OUT, opt)
