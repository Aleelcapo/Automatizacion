"""Escena 3D del puente inca de Q'eswachaka (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P puente_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Cañón a lo largo de y; el puente cruza en x de un estribo al otro. La curva del puente (flecha)
se anima moviendo cada punto de los cables y cada tabla del piso.
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/puente'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 65.0  # audio 64.25 s + cola
NF = int(round(DUR * FPS))
random.seed(31)

clean()
sc = bpy.context.scene

M = dict(
    rock=mat('roca', (0.48, 0.40, 0.33), 0.9),
    grass=mat('puna', (0.55, 0.55, 0.28), 0.95),
    river=mat('rio', (0.25, 0.50, 0.55), 0.1, emit=(0.15, 0.35, 0.4), es=0.3),
    straw=mat('pasto', (0.85, 0.72, 0.35), 0.85),
    log=mat('tronco', (0.42, 0.28, 0.16), 0.85),
    stone=mat('piedra', (0.55, 0.53, 0.50), 0.85),
    cloth=mat('poncho', (0.75, 0.15, 0.15), 0.85),
    cloth2=mat('poncho2', (0.15, 0.40, 0.55), 0.85),
    sash=mat('faja', (0.95, 0.75, 0.20), 0.8),
    skin=mat('piel', (0.60, 0.40, 0.27), 0.6),
    hair=mat('pelo', (0.05, 0.04, 0.04), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    llama=mat('llama', (0.92, 0.88, 0.80), 0.95),
    condor=mat('condor', (0.08, 0.08, 0.09), 0.8),
    white=mat('blanco', (0.95, 0.95, 0.95), 0.8),
    mtn=mat('montana', (0.42, 0.40, 0.38), 0.9),
    snow=mat('nieve', (0.95, 0.96, 1.0), 0.6),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

GX = 6.0     # medio ancho del cañón
box('orilla_izq', -60, -GX, -40, 60, -20, 0, mats=[M['grass'], M['rock']])
box('orilla_der', GX, 60, -40, 60, -20, 0, mats=[M['grass'], M['rock']])
for name in ('orilla_izq', 'orilla_der'):
    face_mats(bpy.data.objects[name], lambda n: 0 if n.z > 0.5 else 1)
box('fondo', -GX, GX, -40, 60, -20, -18, m=M['rock'])
box('rio', -GX, GX, -40, 60, -18, -17.6, m=M['river'])
for k in range(6):
    x = random.choice((-1, 1)) * random.uniform(15, 40)
    h = random.uniform(12, 22)
    prim('cone', f'cerro{k}', (x, random.uniform(40, 70), h / 2 - 1), m=M['mtn'], radius1=random.uniform(10, 16), radius2=1.0, depth=h,
         vertices=9)
    prim('cone', f'cerro_nieve{k}', (x, 0, 0), m=M['snow'], radius1=3.0, radius2=0.8, depth=2.5, vertices=9)
    bpy.data.objects[f'cerro_nieve{k}'].location = (x, bpy.data.objects[f'cerro{k}'].location[1], h - 2.2)


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


def villager(name, m=None):
    return person(name, m or M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])


P = villager('constructor')
P.rotation_mode = 'XYZ'

# ---------------------------------------------------------------- 0 - 7.9: el tronco que no alcanza
lg = prim('cylinder', 'tronco', (0, 0, 0), m=M['log'], radius=0.2, depth=4.0, vertices=12, rot=(0, math.pi / 2, 0))
lg.rotation_mode = 'XYZ'
pop(lg, 1.3, 7.4, s=(1, 1, 1), dur=0.3)
key(lg, 'location', 1.3, (-8.5, 0.0, 0.2))
key(lg, 'location', 3.3, (-6.6, 0.0, 0.2))
key(lg, 'rotation_euler', 3.3, (0, math.pi / 2, 0))
key(lg, 'location', 5.6, (-6.6, 0.0, 0.2))
key(lg, 'rotation_euler', 5.6, (0, math.pi / 2, 0))
key(lg, 'location', 6.2, (-5.2, 0.0, -0.6))
key(lg, 'rotation_euler', 6.2, (0, math.pi / 2 + 0.9, 0))
key(lg, 'location', 7.3, (-3.8, 0.0, -16.5), 'LINEAR')
key(lg, 'rotation_euler', 7.3, (0, math.pi / 2 + 2.2, 0), 'LINEAR')
pose(P, 0, (-9.6, -0.4, 0), (0, 0, -1.2))
pose(P, 3.3, (-8.2, -0.4, 0), (0, 0, -1.2), 'BEZIER')
pose(P, 7.8, (-8.2, -0.4, 0), (0, 0, -1.2))
pose(P, 7.9, (-8.0, -1.0, 0), (0, 0, -0.4))   # trenzando

# ---------------------------------------------------------------- 7.9 - 17.8: cuerdas de pasto y cables
for k in range(6):
    tf = prim('cone', f'mata{k}', (-8.8 + random.uniform(-0.5, 0.5), -1.6 + random.uniform(-0.4, 0.4), 0.25), m=M['straw'], radius1=0.18,
              depth=0.5, vertices=6)
    pop(tf, 8.0 + 0.05 * k, 17.8, s=(1, 1, 1), dur=0.2)
cord = curve_obj('cuerda_trenzada', [(-7.6, -1.0, 0.8), (-6.6, -1.2, 0.3), (-5.8, -1.6, 0.05)], M['straw'], bevel=0.025)
cord.data.bevel_factor_mapping_end = 'SPLINE'
key(cord.data, 'bevel_factor_end', 0, 0.0, 'CONSTANT')
key(cord.data, 'bevel_factor_end', 8.3, 0.0)
key(cord.data, 'bevel_factor_end', 10.4, 1.0)
key(cord, 'scale', 10.75, (1, 1, 1), 'CONSTANT')
key(cord, 'scale', 10.8, Z, 'CONSTANT')
# una sola cuerda delgada que se rompe (10.9 - 13.2)
NP = 25
XA = 7.0     # anclaje en cada orilla


def sag_pts(s, y, z0=0.2, dz=0.0):
    return [(-XA + 2 * XA * i / (NP - 1), y, z0 + dz - s * (1 - ((-XA + 2 * XA * i / (NP - 1)) / XA) ** 2)) for i in range(NP)]


thin = curve_obj('cuerda_delgada', sag_pts(0.5, 0.0), M['straw'], bevel=0.02)
pop(thin, 10.9, 12.05, s=(1, 1, 1), dur=0.2)
for k, sgn in enumerate((-1, 1)):
    half = curve_obj(f'cuerda_rota{k}', [(sgn * XA, 0, 0.2), (sgn * XA * 0.6, 0, -1.5), (sgn * XA * 0.45, 0, -4.5)], M['straw'], bevel=0.02)
    pop(half, 12.05, 13.2, s=(1, 1, 1), dur=0.1)
pose(P, 10.8, (-7.6, -0.2, 0), (0, 0, -1.5))
pose(P, 11.8, (-7.0, 0.0, 0.2), (0, 0, -1.5), 'BEZIER')
pose(P, 12.2, (-7.6, -0.2, 0), (0.2, 0, -1.5), 'BEZIER')
pose(P, 13.1, (-7.6, -0.2, 0), (0, 0, -1.5))
pose(P, 13.2, (-8.6, -1.4, 0), (0, 0, -0.5))
# muchas cuerdas -> cable grueso (13.2 - 17.8)
for k in range(10):
    a = 2 * math.pi * k / 10
    c = curve_obj(f'hebra{k}', [(-9.4, -1.0 + 0.5 * math.cos(a), 0.6 + 0.5 * math.sin(a)), (-8.2, -1.0 + 0.12 * math.cos(a),
                                                                                            0.6 + 0.12 * math.sin(a)),
                                (-6.6, -1.0, 0.6)], M['straw'], bevel=0.018)
    pop(c, 13.6 + 0.08 * k, 16.4, s=(1, 1, 1), dur=0.15)
thick = prim('cylinder', 'cable_grueso', (-7.4, -1.0, 0.6), rot=(0, math.pi / 2, 0), m=M['straw'], radius=0.12, depth=2.2, vertices=16)
pop(thick, 15.6, 17.8, s=(1, 1, 1), dur=0.4)
for k in range(8):   # vueltas del trenzado
    tw = prim('torus', f'trenza{k}', (-8.3 + 0.25 * k, -1.0, 0.6), rot=(0, math.pi / 2, 0.4), m=M['straw'], major_radius=0.12,
              minor_radius=0.025, major_segments=16, minor_segments=6)
    pop(tw, 15.8 + 0.05 * k, 17.8, s=(1, 1, 1), dur=0.15)

# ---------------------------------------------------------------- 17.8 - 20: cables que se resbalan
slip = []
for k, y in enumerate((-0.3, 0.3)):
    c = curve_obj(f'cable_suelto{k}', sag_pts(1.2, y), M['straw'], bevel=0.07)
    pop(c, 18.0, 20.0, s=(1, 1, 1), dur=0.2)
    key(c, 'location', 18.7, (0, 0, 0))
    key(c, 'location', 19.9, (0, 0, -9.0))
    key(c, 'scale', 18.7, (1, 1, 1))
    key(c, 'scale', 19.9, (0.6, 1, 1.4))

# ---------------------------------------------------------------- estribos (21.1)
for k, (x, y) in enumerate(((-XA - 0.6, -0.55), (-XA - 0.6, 0.55), (XA + 0.6, -0.55), (XA + 0.6, 0.55))):
    st = box(f'estribo{k}', x - 0.6, x + 0.6, y - 0.4, y + 0.4, 0, 1.3, m=M['stone'])
    pop(st, 21.1 + 0.25 * k, s=(1, 1, 1), dur=0.3)
for k, x in enumerate((-XA - 1.3, XA + 1.3)):
    w = box(f'muro_estribo{k}', x - 0.4, x + 0.4, -1.2, 1.2, 0, 0.8, m=M['stone'])
    pop(w, 21.6 + 0.3 * k, s=(1, 1, 1), dur=0.3)
outline('contorno_estribo', rect_xz(-XA - 1.9, -XA + 0.15, -0.15, 1.5, -1.3), M['orange'], (-XA - 0.9, -1.3, 0.7), 23.2, 24.9)

# ---------------------------------------------------------------- el puente (piso, pasamanos, cuerdas verticales)
bridge = link(bpy.data.objects.new('puente', None))
bridge.location = (0, 0, 0.2)
bridge.rotation_mode = 'XYZ'
SAG0 = 1.6
floor_y = (-0.45, -0.15, 0.15, 0.45)
cables = []
single = curve_obj('cable_unico', sag_pts(SAG0, 0.0, z0=0.0), M['straw'], bevel=0.07)
single.parent = bridge
pop(single, 25.1, 28.3, s=(1, 1, 1), dur=0.2)
for k, y in enumerate(floor_y):
    c = curve_obj(f'cable_piso{k}', sag_pts(SAG0, y, z0=0.0), M['straw'], bevel=0.06)
    c.parent = bridge
    pop(c, 28.3 + 0.1 * k, s=(1, 1, 1), dur=0.2)
    cables.append((c, y, 0.0))
for k, y in enumerate((-0.65, 0.65)):
    c = curve_obj(f'pasamanos{k}', sag_pts(SAG0, y, z0=0.0, dz=1.0), M['straw'], bevel=0.05)
    c.parent = bridge
    pop(c, 36.1 + 0.3 * k, s=(1, 1, 1), dur=0.3)
    cables.append((c, y, 1.0))
NS = 44
slats = []
for i in range(NS):
    x = -XA + 0.3 + (2 * XA - 0.6) * i / (NS - 1)
    sl = box(f'rama_piso{i}', -0.06, 0.06, -0.55, 0.55, -0.02, 0.02, m=M['straw'], origin=(0, 0, 0))
    sl.parent = bridge
    sl.rotation_mode = 'XYZ'
    pop(sl, 30.2 + 1.2 * i / NS, s=(1, 1, 1), dur=0.12)
    slats.append((sl, x))
verts_ = []
for i in range(1, NP - 1, 2):
    for k, y in enumerate((-0.6, 0.6)):
        x = -XA + 2 * XA * i / (NP - 1)
        v = prim('cylinder', f'cuerda_vertical{i}_{k}', (0, 0, 0), m=M['straw'], radius=0.015, depth=1.0, vertices=5)
        for vv in v.data.vertices:
            vv.co.z += 0.5
        v.parent = bridge
        pop(v, 38.5 + 0.9 * i / NP, s=(1, 1, 1), dur=0.12)
        verts_.append((v, x, y))


def set_sag(t, s, interp='BEZIER'):
    """Pone la flecha del puente en 's' en el tiempo t (cables, tablas y cuerdas verticales)."""
    for c, y, dz in cables:
        for p, (x, yy, z) in zip(c.data.splines[0].points, sag_pts(s, y, z0=0.0, dz=dz)):
            key(p, 'co', t, (x, yy, z, 1), interp)
    for p, (x, yy, z) in zip(single.data.splines[0].points, sag_pts(s, 0.0, z0=0.0)):
        key(p, 'co', t, (x, yy, z, 1), interp)
    for sl, x in slats:
        z = -s * (1 - (x / XA) ** 2) + 0.05
        slope = 2 * s * x / XA ** 2
        key(sl, 'location', t, (x, 0, z), interp)
        key(sl, 'rotation_euler', t, (0, -math.atan(slope), 0), interp)
    for v, x, y in verts_:
        key(v, 'location', t, (x, y, -s * (1 - (x / XA) ** 2) + 0.05), interp)


set_sag(0, SAG0, 'CONSTANT')
set_sag(52.8, SAG0)
set_sag(53.9, 0.05)
set_sag(54.95, 0.05, 'CONSTANT')
set_sag(55.0, SAG0, 'CONSTANT')
# bamboleo (32.4 - 35.3) y menos bamboleo con pasamanos (37 - 39)
for k in range(8):
    key(bridge, 'rotation_euler', 32.4 + 0.36 * k, (0.13 * (1 if k % 2 else -1), 0, 0))
key(bridge, 'rotation_euler', 35.3, (0, 0, 0))
for k in range(4):
    key(bridge, 'rotation_euler', 37.0 + 0.4 * k, (0.03 * (1 if k % 2 else -1), 0, 0))
key(bridge, 'rotation_euler', 38.8, (0, 0, 0))
# se revienta si se estira recto (54.4) y vuelve al cortar (55.0)
key(bridge, 'scale', 0, (1, 1, 1), 'CONSTANT')
key(bridge, 'scale', 54.4, Z, 'CONSTANT')
key(bridge, 'scale', 55.0, (1, 1, 1), 'CONSTANT')
for k, sgn in enumerate((-1, 1)):
    for j, y in enumerate((-0.45, 0.45)):
        half = curve_obj(f'cable_reventado{k}{j}', [(sgn * XA, y, 0.2), (sgn * XA * 0.7, y, -2.0), (sgn * XA * 0.55, y, -5.5)], M['straw'],
                         bevel=0.06)
        pop(half, 54.4, 55.0, s=(1, 1, 1), dur=0.1)
arc = [(x, -1.0, 0.2 - SAG0 * (1 - (x / XA) ** 2) - 0.25) for x in [-XA + 2 * XA * i / 30 for i in range(31)]]
oc = outline('contorno_curva', arc, M['orange'], (0, -1.0, -1.0), 49.0, 50.6, cyclic=False)
oc.data.bevel_depth = 0.08

# el constructor en el cable único (25 - 27.3) y en el puente (32 - 35.3)
pose(P, 17.8, (-9.0, -1.4, 0), (0, 0, -0.5))
pose(P, 25.0, (-5.0, 0.0, -0.53), (0, 0, -1.57))
pose(P, 25.6, (-5.0, 0.0, -0.53), (0.25, 0, -1.57), 'BEZIER')
pose(P, 26.2, (-5.0, 0.0, -0.53), (-0.3, 0, -1.57), 'BEZIER')
pose(P, 26.8, (-5.2, 0.0, -0.6), (0.45, 0, -1.57), 'BEZIER')
pose(P, 27.3, (-9.0, -1.4, 0), (0, 0, -0.5))
pose(P, 31.8, (-3.0, 0.0, 0.2 - SAG0 * (1 - (3 / XA) ** 2) + 0.05), (0, 0, -1.57))
pose(P, 34.2, (-2.0, 0.0, 0.2 - SAG0 * (1 - (2 / XA) ** 2) + 0.05), (0, 0, -1.57), 'BEZIER')
pose(P, 34.6, (-2.0, 0.15, 0.2 - SAG0 * (1 - (2 / XA) ** 2) + 0.05), (0.4, 0, -1.57), 'BEZIER')
pose(P, 35.2, (-2.0, 0.0, 0.2 - SAG0 * (1 - (2 / XA) ** 2) + 0.05), (0, 0, -1.57), 'BEZIER')
pose(P, 35.3, (-9.0, -1.4, 0), (0, 0, -0.5))

# ---------------------------------------------------------------- el pasto se pudre (40.9) y se renueva (46.6)
ps_ = M['straw'].node_tree.nodes['Principled BSDF']
for t, c in ((0, (0.85, 0.72, 0.35)), (40.9, (0.85, 0.72, 0.35)), (41.9, (0.30, 0.27, 0.20)), (46.6, (0.30, 0.27, 0.20)),
             (47.6, (0.90, 0.78, 0.38))):
    node_key(ps_.inputs['Base Color'], t, (*c, 1))
# la comunidad (43.8)
for k in range(10):
    side = -1 if k < 5 else 1
    v = villager(f'comunero{k}', M['cloth'] if k % 2 else M['cloth2'])
    v.location = (side * (8.6 + 0.8 * (k % 5)), -1.8 + 0.9 * (k % 3), 0)
    v.rotation_euler = (0, 0, side * 1.2 + random.uniform(-0.3, 0.3))
    pop(v, 43.8 + 0.1 * k, 48.6, s=(1, 1, 1), dur=0.2)

# ---------------------------------------------------------------- llama, tejedores y cóndor (55 - 60.8)
def llama():
    root = link(bpy.data.objects.new('llama', None))
    ps = [prim('uv_sphere', 'll_cuerpo', (0, 0, 0.75), scale=(1.4, 0.65, 0.65), m=M['llama'], radius=0.35, segments=14, ring_count=8),
          prim('cylinder', 'll_cuello', (0.38, 0, 1.15), rot=(0, 0.2, 0), m=M['llama'], radius=0.09, depth=0.7, vertices=8),
          prim('uv_sphere', 'll_cabeza', (0.48, 0, 1.52), scale=(1.4, 0.8, 0.8), m=M['llama'], radius=0.12, segments=12, ring_count=8),
          prim('cone', 'll_oreja1', (0.42, -0.05, 1.68), m=M['llama'], radius1=0.03, depth=0.14, vertices=6),
          prim('cone', 'll_oreja2', (0.42, 0.05, 1.68), m=M['llama'], radius1=0.03, depth=0.14, vertices=6),
          prim('uv_sphere', 'll_ojo', (0.6, -0.07, 1.56), m=M['dark'], radius=0.018, segments=6, ring_count=4)]
    for x in (0.3, -0.3):
        for y in (-0.12, 0.12):
            ps.append(prim('cylinder', f'll_pata{x}{y}', (x, y, 0.27), m=M['llama'], radius=0.045, depth=0.55, vertices=6))
    for p in ps:
        p.parent = root
    return root


LL = llama()
key(LL, 'scale', 0, Z, 'CONSTANT')
key(LL, 'scale', 55.6, (1, 1, 1), 'CONSTANT')
for j in range(13):
    x = -XA - 1.0 + (2 * XA + 2.0) * j / 12
    xx = max(-XA, min(XA, x))
    z = 0.2 - SAG0 * (1 - (xx / XA) ** 2) + 0.05 if abs(x) < XA else 0.0
    key(LL, 'location', 55.6 + 3.0 * j / 12, (x, 0.0, z), 'LINEAR')
    slope = 2 * SAG0 * xx / XA ** 2 if abs(x) < XA else 0
    key(LL, 'rotation_euler', 55.6 + 3.0 * j / 12, (0, -math.atan(slope), 0), 'LINEAR')
for k in range(2):
    w = villager(f'tejedor{k}', M['cloth2'] if k else M['cloth'])
    w.location = (-9.3 - 0.9 * k, -2.0, 0)
    w.scale = (1, 1, 0.75)
    pop(w, 57.0 + 0.15 * k, s=(1, 1, 0.75), dur=0.2)
    yarn = prim('uv_sphere', f'ovillo{k}', (-9.3 - 0.9 * k + 0.25, -2.25, 0.35), m=M['straw'], radius=0.12, segments=10, ring_count=6)
    pop(yarn, 57.2 + 0.15 * k, s=(1, 1, 1), dur=0.2)
cd = link(bpy.data.objects.new('condor', None))
cps = [prim('uv_sphere', 'cd_cuerpo', (0, 0, 0), scale=(1.6, 0.6, 0.45), m=M['condor'], radius=0.35, segments=12, ring_count=8),
       prim('uv_sphere', 'cd_collar', (0.45, 0, 0.05), m=M['white'], radius=0.14, segments=10, ring_count=6),
       prim('uv_sphere', 'cd_cabeza', (0.62, 0, 0.08), m=M['skin'], radius=0.1, segments=10, ring_count=6)]
for side in (-1, 1):
    wg = box(f'cd_ala{side}', -0.5, 0.5, 0, side * 2.0, -0.03, 0.03, m=M['condor'], origin=(0, 0, 0))
    wg.parent = cd
    for j in range(5):
        key(wg, 'rotation_euler', 58.5 + 0.45 * j, (side * (0.25 if j % 2 else -0.1), 0, 0))
for p in cps:
    p.parent = cd
key(cd, 'scale', 0, Z, 'CONSTANT')
key(cd, 'scale', 58.5, (1.2, 1.2, 1.2), 'CONSTANT')
key(cd, 'location', 58.5, (-14, 4.0, -4.5))
key(cd, 'location', 60.7, (14, -3.0, -3.0), 'LINEAR')

# ---------------------------------------------------------------- cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st in ((0, (0.50, 0.70, 0.95), 0.9), (40.05, (0.50, 0.70, 0.95), 0.9), (40.1, (0.60, 0.64, 0.70), 0.75), (42.55, (0.60, 0.64, 0.70), 0.75),
                 (42.6, (0.50, 0.70, 0.95), 0.9), (61.0, (0.50, 0.70, 0.95), 0.9), (63.8, (0.82, 0.56, 0.40), 0.75)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT' if t < 61 else 'BEZIER')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT' if t < 61 else 'BEZIER')
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(5)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(42), 0, math.radians(-30))
for t, e, c in ((0, 3.8, (1.0, 0.95, 0.86)), (40.05, 3.8, (1.0, 0.95, 0.86)), (40.1, 1.6, (0.80, 0.86, 1.0)), (42.55, 1.6, (0.80, 0.86, 1.0)),
                (42.6, 3.8, (1.0, 0.95, 0.86)), (61.0, 3.8, (1.0, 0.95, 0.86))):
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')
key(sun, 'energy', 63.8, 2.8)
key(sun, 'color', 63.8, (1.0, 0.70, 0.45))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (-4.0, -7.5, 2.5), (-6.5, 0, 0.3), (-4.4, -7.0, 2.3), (-6.5, 0, 0.3)),
    (4.12, (2.5, -15.0, 2.5), (0, 0, -6.0), (2.0, -14.5, 2.0), (0, 0, -7.0)),
    (7.88, (-6.4, -4.2, 1.6), (-7.6, -1.0, 0.6), (-6.6, -4.0, 1.5), (-7.6, -1.0, 0.6)),
    (10.76, (0.0, -14.0, 2.8), (0, 0, -0.6), (0.0, -13.5, 2.6), (0, 0, -0.6)),
    (13.18, (-6.6, -4.0, 1.4), (-7.8, -1.0, 0.6), (-6.8, -3.8, 1.3), (-7.8, -1.0, 0.6)),
    (17.78, (2.0, -16.0, 4.0), (0, 0, -1.0), (1.5, -15.5, 3.6), (0, 0, -1.0)),
    (20.0, (-3.5, -9.0, 3.0), (-7.0, 0, 0.6), (-3.8, -8.5, 2.8), (-7.0, 0, 0.6)),
    (25.04, (0.5, -9.5, 1.6), (-3.0, 0, -0.6), (0.2, -9.0, 1.5), (-3.0, 0, -0.6)),
    (27.32, (3.5, -13.0, 4.5), (0, 0, -0.8), (2.5, -12.5, 4.2), (0, 0, -0.8)),
    (31.84, (0.5, -10.5, 1.5), (-1.0, 0, -0.6), (0.3, -10.0, 1.5), (-1.0, 0, -0.6)),
    (35.26, (4.5, -12.0, 3.0), (0, 0, -0.2), (3.8, -11.5, 2.8), (0, 0, -0.2)),
    (40.12, (1.5, -6.5, 0.4), (0, 0, -1.0), (1.2, -6.0, 0.3), (0, 0, -1.0)),
    (42.58, (0.0, -18.0, 5.0), (0, 0, -0.6), (0.0, -17.5, 4.6), (0, 0, -0.6)),
    (48.6, (0.0, -15.5, -0.3), (0, 0, -0.8), (0.0, -15.0, -0.3), (0, 0, -0.8)),
    (55.04, (3.5, -10.5, 2.5), (-1.0, 0, -0.3), (2.5, -10.0, 2.3), (1.0, 0, -0.3)),
    (58.4, (3.0, -13.0, -5.0), (0, 0, -2.5), (2.5, -12.5, -4.8), (0, 0, -2.5)),
    (60.78, (0.0, -20.0, 3.0), (0, 0, -3.0), (0.0, -36.0, 9.0), (0, 0, -3.0)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
