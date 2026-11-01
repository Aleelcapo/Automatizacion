"""Humor 02 — alberca contra el calor: alberca en el patio, en corte, sincronizada con el audio.

Uso:
  blender -b -P alberca_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 12] [--calidad 1] [--stills 1,200]
"""
import bpy, bmesh, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa
from patio3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/alberca'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 56.6   # audio 55.77 s + cola
NF = int(round(DUR * FPS))
random.seed(53)

clean()
sc = bpy.context.scene
M = materiales()
M.update(
    rebar=mat('varilla', (0.45, 0.25, 0.15), 0.5, spec=0.6),
    concrete=mat('concreto_alberca', (0.62, 0.62, 0.60), 0.9),
    paint=mat('impermeabilizante', (0.20, 0.30, 0.45), 0.4),
    tile=mat('azulejo_alberca', (0.55, 0.85, 0.92), 0.15),
    pool=mat('agua_alberca', (0.25, 0.65, 0.85), 0.05, alpha=0.75),
    mud=mat('lodo_fondo', (0.32, 0.21, 0.12), 0.4),
    leafm=mat('hoja_flotante', (0.35, 0.50, 0.15), 0.8),
    pump=mat('bomba_azul', (0.15, 0.35, 0.70), 0.4),
    pipe=mat('tubo_pvc', (0.85, 0.85, 0.82), 0.4),
    donut=mat('dona', (0.95, 0.45, 0.65), 0.4),
    kid=mat('traje_bano', (0.20, 0.60, 0.90), 0.6),
    uncle=mat('short_tio', (0.95, 0.75, 0.15), 0.7),
    sweat=mat('sudor', (0.60, 0.85, 1.0), 0.05),
)
ground = terreno(M)
house, wins = casa(M)
decorado(M, mesa=False)
bg, sun = cielo_dia(sc, energia=4.5)

PX0, PX1, PY1 = -3.0, 3.0, 4.0
excavar(ground, M, 'hoyo', PX0, PX1, -1.5, PY1, -2.6, 0.2, 2.7, 3.7)
T = 0.25                 # grosor del concreto
ZS, ZD = -1.1, -2.2      # piso: parte baja (izquierda) y honda (derecha)


def prism(name, poly, m, y0=0.0, y1=PY1 - 0.05):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    f0 = [bm.verts.new((x, y0, z)) for x, z in poly]
    f1 = [bm.verts.new((x, y1, z)) for x, z in poly]
    bm.faces.new(f0)
    bm.faces.new(list(reversed(f1)))
    for i in range(len(poly)):
        j = (i + 1) % len(poly)
        bm.faces.new((f0[i], f0[j], f1[j], f1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.data.materials.append(m)
    return o


def floor_z(x):
    return ZS + (ZD - ZS) * (x - (PX0 + T)) / ((PX1 - T) - (PX0 + T))


IX0, IX1 = PX0 + T, PX1 - T
inner = [(IX0, floor_z(IX0)), (IX1, floor_z(IX1)), (IX1, -0.05), (IX0, -0.05)]

# ---------------------------------------------------------------- personas y perro sudando (0 - 6.4)
P = person('dueno', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
D = perro(M)
D.location = (-4.5, 5.5, 0)
D.rotation_euler = (0, 0, -0.5)
for k in range(6):
    s_ = prim('uv_sphere', f'sudor{k}', (0, 0, 0), scale=(0.7, 0.7, 1.2), m=M['sweat'], radius=0.05, segments=8, ring_count=6)
    key(s_, 'scale', 0, Z, 'CONSTANT')
    t = 0.6 + 0.3 * k
    while t < 6.3:
        key(s_, 'scale', t, (0.7, 0.7, 1.2), 'CONSTANT')
        key(s_, 'location', t, (-4.0 + random.uniform(-0.1, 0.1), 5.2, 0.75), 'CONSTANT')
        key(s_, 'location', t + 0.6, (-4.0, 5.1, 0.05), 'LINEAR')
        key(s_, 'scale', t + 0.6, Z, 'CONSTANT')
        t += 0.7
key(D, 'location', 6.3, (-4.5, 5.5, 0))
key(D, 'location', 6.35, (-6.5, 8.0, 0), 'CONSTANT')
pose(P, 0, (3.8, 5.5, 0), (0, 0, 2.6))
pose(P, 2.5, (1.0, 1.8, 0), (0, 0, 2.6), 'BEZIER')
for k in range(3):
    pose(P, 2.8 + 0.3 * k, (1.0, 1.8, -2.4 * (k + 1) / 3), (0.3 * (k % 2), 0, 2.6), 'BEZIER')
pose(P, 3.8, (3.6, 1.6, 0), (0, 0, 2.6))
pose(P, 42.0, (3.6, 1.6, 0), (0, 0, 2.6))
pose(P, 42.1, (0, 0, 60))
hose_jet = curve_obj('chorro_manguera', [(-3.6, 1.8, 0.4), (-2.6, 1.8, 0.6), (-1.6, 1.8, -0.4)], M['water'], bevel=0.06)
pop(hose_jet, 4.2, 5.8, s=(1, 1, 1), dur=0.2)
# el primer agua llena el hoyo y se va a la tierra (4.3 - 9.3)
w0 = box('agua_hoyo', PX0 + 0.02, PX1 - 0.02, 0.0, PY1 - 0.02, -2.58, -0.3, m=M['pool'], origin=(0, PY1 / 2, -2.58))
key(w0, 'scale', 0, Z, 'CONSTANT')
key(w0, 'scale', 4.3, (1, 1, 0.02))
key(w0, 'scale', 5.7, (1, 1, 1))
key(w0, 'scale', 7.0, (1, 1, 1))
key(w0, 'scale', 9.2, (1, 1, 0.03))
key(w0, 'scale', 9.8, Z, 'CONSTANT')
mud = box('lodo', PX0 + 0.02, PX1 - 0.02, 0.0, PY1 - 0.02, -2.6, -2.35, m=M['mud'])
pop(mud, 8.6, 10.6, s=(1, 1, 1), dur=0.5)
for k in range(10):   # el agua se mete en la tierra
    d = prim('uv_sphere', f'se_mete{k}', (0, 0, 0), m=M['water'], radius=0.07, segments=8, ring_count=6)
    side = random.choice((-1, 1))
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 7.0 + 0.2 * k
    while t < 9.3:
        z = random.uniform(-2.3, -0.8)
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, (side * 2.95, -0.05, z), 'CONSTANT')
        key(d, 'location', t + 0.8, (side * 4.2, -0.05, z - 0.6), 'LINEAR')
        key(d, 'scale', t + 0.8, Z, 'CONSTANT')
        t += 0.85

# ---------------------------------------------------------------- varillas (11 - 12.8) y concreto armado (16 - 18.4)
rebars = []
for k in range(11):
    x = IX0 - 0.12 + (IX1 - IX0 + 0.24) * k / 10
    z = floor_z(min(max(x, IX0), IX1)) - 0.12
    rebars.append(prim('cylinder', f'varilla_y{k}', (x, PY1 / 2, z), rot=(math.pi / 2, 0, 0), m=M['rebar'], radius=0.025, depth=PY1 - 0.2,
                       vertices=6))
for k in range(6):
    y = 0.3 + 0.65 * k
    L = math.hypot(IX1 - IX0, ZD - ZS)
    ang = math.atan2(ZD - ZS, IX1 - IX0)
    rebars.append(prim('cylinder', f'varilla_x{k}', (0, y, (ZS + ZD) / 2 - 0.12), rot=(0, math.pi / 2 - ang, 0), m=M['rebar'], radius=0.025,
                       depth=L + 0.3, vertices=6))
for s in (-1, 1):
    for k in range(5):
        z = -0.25 - 0.4 * k
        rebars.append(prim('cylinder', f'varilla_pared{s}{k}', (s * (PX1 - 0.12), PY1 / 2, z), rot=(math.pi / 2, 0, 0), m=M['rebar'],
                           radius=0.025, depth=PY1 - 0.2, vertices=6))
for k, r in enumerate(rebars):
    pop(r, 11.0 + 1.8 * k / len(rebars), s=(1, 1, 1), dur=0.12)
for k in range(8):   # el agua pasa entre las varillas
    d = prim('uv_sphere', f'atraviesa{k}', (0, 0, 0), m=M['water'], radius=0.07, segments=8, ring_count=6)
    x = random.uniform(-2.0, 2.0)
    pop(d, 13.6 + 0.15 * k, 15.4, s=(1, 1, 1), dur=0.05)
    key(d, 'location', 13.6 + 0.15 * k, (x, 1.5, 0.5))
    key(d, 'location', 15.2, (x, 1.5, -2.55), 'LINEAR')
shell = [prism('concreto_piso', [(PX0, floor_z(IX0) - T), (PX1, floor_z(IX1) - T), (PX1, floor_z(IX1)), (PX0, floor_z(IX0))],
               M['concrete'], y0=-0.02),
         prism('concreto_izq', [(PX0, floor_z(IX0)), (IX0, floor_z(IX0)), (IX0, 0.02), (PX0, 0.02)], M['concrete'], y0=-0.02),
         prism('concreto_der', [(IX1, floor_z(IX1)), (PX1, floor_z(IX1)), (PX1, 0.02), (IX1, 0.02)], M['concrete'], y0=-0.02),
         box('concreto_atras', PX0, PX1, PY1 - 0.3, PY1, ZD - T, 0.02, m=M['concrete'])]
fillw = prism('relleno_compactado', [(PX0, -2.6), (PX1, -2.6), (PX1, floor_z(IX1) - T), (PX0, floor_z(IX0) - T)], M['soil'], y0=-0.01)
pop(fillw, 15.6, s=(1, 1, 1), dur=0.4)
for k, o in enumerate(shell):
    pop(o, 16.0 + 0.6 * k, s=(1, 1, 1), dur=0.4)
outline('contorno_concreto', rect_xz(PX0 - 0.15, PX1 + 0.15, ZD - T - 0.15, 0.15, -0.1), M['orange'], (0, -0.1, -1.2), 19.0, 20.7)
# agua que se escapa por los poros (21 - 24.7)
w1 = prism('agua_poros', inner, M['pool'], y0=0.0, y1=PY1 - 0.3)
for v in w1.data.vertices:
    v.co.z -= ZD
w1.location = (0, 0, ZD)
key(w1, 'scale', 0, Z, 'CONSTANT')
key(w1, 'scale', 21.0, (1, 1, 1), 'CONSTANT')
key(w1, 'scale', 22.5, (1, 1, 1))
key(w1, 'scale', 24.6, (1, 1, 0.7))
key(w1, 'scale', 24.75, Z, 'CONSTANT')
for k in range(12):
    d = prim('uv_sphere', f'poro{k}', (0, 0, 0), m=M['water'], radius=0.05, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    x = random.uniform(-2.5, 2.5)
    t = 22.6 + 0.15 * k
    while t < 24.7:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, (x, -0.05, floor_z(min(max(x, IX0), IX1)) - 0.05), 'CONSTANT')
        key(d, 'location', t + 0.9, (x, -0.05, floor_z(min(max(x, IX0), IX1)) - 0.8), 'LINEAR')
        key(d, 'scale', t + 0.9, Z, 'CONSTANT')
        t += 0.95
# impermeabilizante (25.2) y azulejos (27.3)
for k, (m_, t0, off) in enumerate(((M['paint'], 25.2, 0.0), (M['tile'], 27.3, 0.03))):
    layer = [prism(f'capa{k}_piso', [(IX0, floor_z(IX0)), (IX1, floor_z(IX1)), (IX1, floor_z(IX1) + 0.04 + off), (IX0, floor_z(IX0) + 0.04 + off)],
                   m_, y0=-0.03 - 0.01 * k),
             box(f'capa{k}_izq', IX0, IX0 + 0.04 + off, -0.03 - 0.01 * k, PY1 - 0.3, floor_z(IX0), 0.0, m=m_),
             box(f'capa{k}_der', IX1 - 0.04 - off, IX1, -0.03 - 0.01 * k, PY1 - 0.3, floor_z(IX1), 0.0, m=m_),
             box(f'capa{k}_atras', IX0, IX1, PY1 - 0.34 - off, PY1 - 0.3, ZD, 0.0, m=m_)]
    for j, o in enumerate(layer):
        pop(o, t0 + 0.2 * j, s=(1, 1, 1), dur=0.3)
for k in range(20):   # juntas de los azulejos
    x = IX0 + (IX1 - IX0) * (k + 0.5) / 20
    j = box(f'junta{k}', x - 0.008, x + 0.008, -0.06, -0.05, floor_z(x) + 0.07, floor_z(x) + 0.075, m=M['trim'])
    pop(j, 27.8, s=(1, 1, 1), dur=0.1)

# ---------------------------------------------------------------- el agua de la alberca: verde (29.6), limpia (34.5)
water = prism('agua_alberca', [(IX0, floor_z(IX0) + 0.08), (IX1, floor_z(IX1) + 0.08), (IX1, -0.2), (IX0, -0.2)], M['pool'], y0=0.0,
              y1=PY1 - 0.35)
key(water, 'scale', 0, Z, 'CONSTANT')
key(water, 'scale', 28.6, (1, 1, 1), 'CONSTANT')
pw = M['pool'].node_tree.nodes['Principled BSDF']
for t, c in ((0, (0.25, 0.65, 0.85)), (28.6, (0.25, 0.65, 0.85)), (29.8, (0.25, 0.42, 0.12)), (34.4, (0.25, 0.42, 0.12)),
             (35.4, (0.20, 0.65, 0.90))):
    node_key(pw.inputs['Base Color'], t, (*c, 1))
pump = box('bomba', 4.0, 4.7, 1.4, 2.1, 0, 0.5, m=M['pump'])
filt = prim('cylinder', 'filtro_arena', (5.3, 1.8, 0.6), m=M['pump'], radius=0.4, depth=1.2, vertices=20)
p1 = curve_obj('tubo_succion', [(2.9, 2.6, -0.3), (3.4, 2.6, 0.15), (4.0, 1.75, 0.25)], M['pipe'], bevel=0.05)
p2 = curve_obj('tubo_regreso', [(5.3, 1.8, 1.2), (5.3, 3.0, 1.0), (3.2, 3.2, 0.1), (2.8, 3.2, -0.4)], M['pipe'], bevel=0.05)
for o in (pump, filt, p1, p2):
    pop(o, 32.2, s=(1, 1, 1), dur=0.3)
for k in range(8):
    d = prim('uv_sphere', f'circula{k}', (0, 0, 0), m=M['water'], radius=0.06, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 33.0 + 0.2 * k
    path = [(2.9, 2.6, -0.3), (3.4, 2.6, 0.15), (4.3, 1.75, 0.3), (5.3, 1.8, 0.8), (5.3, 1.8, 1.2), (5.3, 3.0, 1.0), (3.2, 3.2, 0.1),
            (2.8, 3.2, -0.4)]
    while t + 1.6 < 35.7:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        for j, p in enumerate(path):
            key(d, 'location', t + 1.6 * j / (len(path) - 1), p, 'LINEAR')
        key(d, 'scale', t + 1.6, Z, 'CONSTANT')
        t += 1.65

# ---------------------------------------------------------------- hojas flotando (35.9) y desnatador (38.5 - 41.9)
skim = box('desnatador', 1.6, 2.4, PY1 - 0.38, PY1 - 0.3, -0.45, -0.15, m=M['dark'])
pop(skim, 38.5, s=(1, 1, 1), dur=0.25)
for k in range(8):
    lf = prim('uv_sphere', f'hoja{k}', (0, 0, 0), scale=(1.4, 0.9, 0.15), m=M['leafm'], radius=0.12, segments=10, ring_count=6)
    x0, y0 = random.uniform(-2.2, 2.2), random.uniform(0.6, 3.0)
    pop(lf, 35.9 + 0.08 * k, 40.6, s=(1.4, 0.9, 0.15), dur=0.2)
    key(lf, 'location', 35.9, (x0 + 1.0, y0, 2.0))
    key(lf, 'location', 36.6 + 0.08 * k, (x0, y0, -0.18))
    key(lf, 'location', 39.4, (x0 + 0.2, y0 + 0.2, -0.18))
    key(lf, 'location', 40.5, (2.0, PY1 - 0.45, -0.25), 'LINEAR')
outline('contorno_desnatador', rect_xz(1.4, 2.6, -0.6, 0.0, PY1 - 0.5), M['orange'], (2.0, PY1 - 0.5, -0.3), 40.4, 42.0)

# ---------------------------------------------------------------- piso inclinado: niños en lo bajo, el tío de bomba en lo hondo (42 - 48.4)
for k in range(2):
    kid = person(f'nino{k}', M['kid'], M['trim'], M['skin'], M['dark'], M['hair'])
    kid.location = (-2.0 + 0.6 * k, 1.4 + 0.8 * k, floor_z(-2.0 + 0.6 * k) + 0.1)
    kid.scale = (0.6, 0.6, 0.6)
    pop(kid, 45.2 + 0.15 * k, s=(0.6, 0.6, 0.6), dur=0.25)
U = person('tio', M['uncle'], M['trim'], M['skin'], M['dark'], M['hair'])
U.rotation_mode = 'XYZ'
key(U, 'scale', 0, Z, 'CONSTANT')
key(U, 'scale', 46.6, (1.15, 1.15, 1.0), 'CONSTANT')
key(U, 'location', 46.6, (4.6, 2.0, 0.0))
key(U, 'location', 47.2, (3.6, 2.0, 1.6))
key(U, 'location', 47.8, (2.0, 2.0, -0.6))
key(U, 'rotation_euler', 46.6, (0, 0, math.pi / 2))
key(U, 'rotation_euler', 47.4, (0, 1.2, math.pi / 2))
key(U, 'location', 48.5, (2.0, 2.0, -1.4))
for k in range(12):
    sp = prim('uv_sphere', f'salpica{k}', (0, 0, 0), m=M['water'], radius=0.1, segments=8, ring_count=6)
    a = 2 * math.pi * k / 12
    pop(sp, 47.8, 48.9, s=(1, 1, 1), dur=0.05)
    key(sp, 'location', 47.8, (2.0, 2.0, -0.2))
    key(sp, 'location', 48.3, (2.0 + 1.3 * math.cos(a), 2.0 + 1.0 * math.sin(a), 1.2 + random.uniform(0, 0.6)))
    key(sp, 'location', 48.9, (2.0 + 1.8 * math.cos(a), 2.0 + 1.4 * math.sin(a), -0.15))
key(water, 'scale', 47.8, (1, 1, 1))
key(water, 'scale', 48.1, (1, 1, 1.06))
key(water, 'scale', 48.6, (1, 1, 1))

# ---------------------------------------------------------------- escalera, dona y perro en el agua (48.4 - 53)
lad = link(bpy.data.objects.new('escalera', None))
for s in (-0.25, 0.25):
    c = curve_obj(f'esc_tubo{s}', [(0, s, -1.6), (0, s, 0.5), (0.35, s, 0.7), (0.5, s, 0.5)], M['metal'], bevel=0.035)
    c.parent = lad
lad.location = (IX1 - 0.1, 2.8, 0)
pop(lad, 48.9, s=(1, 1, 1), dur=0.25)
donut = prim('torus', 'dona', (-0.8, 2.0, -0.2), m=M['donut'], major_radius=0.45, minor_radius=0.16, major_segments=24, minor_segments=10)
pop(donut, 49.7, s=(1, 1, 1), dur=0.3)
for k in range(6):
    key(donut, 'location', 50.0 + 0.6 * k, (-0.8 + 0.1 * math.sin(k), 2.0, -0.2 + (0.05 if k % 2 else 0)))
D2 = perro(M, 'perro_nadando')
D2.location = (0.6, 1.4, -0.65)
D2.rotation_euler = (0, 0, 0.4)
pop(D2, 50.8, s=(1.2, 1.2, 1.2), dur=0.3)
for k in range(8):
    key(D2, 'location', 51.1 + 0.4 * k, (0.6 + 0.12 * k, 1.4 + 0.05 * (k % 2), -0.65 + (0.04 if k % 2 else 0)))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (-1.0, -5.0, 2.5), (-4.0, 5.0, 0.6), (-1.6, -4.4, 2.3), (-4.0, 5.0, 0.6)),
    (2.5, (5.0, -10.5, 2.6), (0, 1.8, -1.0), (4.6, -10.0, 2.4), (0, 1.8, -1.0)),
    (9.8, (5.5, -11.0, 3.0), (0, 1.8, -1.2), (4.8, -10.5, 2.8), (0, 1.8, -1.2)),
    (19.0, (0.0, -9.0, -0.6), (0, 1.5, -1.2), (0.0, -8.6, -0.6), (0, 1.5, -1.2)),
    (24.78, (4.5, -9.5, 2.0), (0, 1.8, -1.1), (4.0, -9.0, 1.8), (0, 1.8, -1.1)),
    (31.4, (8.5, -9.5, 4.5), (2.0, 2.0, -0.2), (7.5, -9.0, 4.2), (2.0, 2.0, -0.2)),
    (35.66, (3.5, -5.5, 4.0), (1.0, 2.6, -0.3), (3.2, -5.2, 3.8), (1.3, 2.8, -0.3)),
    (42.08, (5.5, -11.0, 1.5), (0, 1.8, -1.0), (5.0, -10.5, 1.5), (0, 1.8, -1.0)),
    (46.4, (7.5, -9.0, 3.5), (2.0, 2.0, 0.0), (7.0, -8.6, 3.3), (2.0, 2.0, -0.3)),
    (48.38, (4.0, -9.0, 2.5), (0.2, 2.0, -0.5), (3.6, -8.6, 2.4), (0.2, 2.0, -0.5)),
    (53.0, (5.0, -12.0, 3.5), (0, 3.0, -0.5), (12.0, -26.0, 10.0), (0, 8.0, 0.5)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
