"""Escena 3D de la casa en el árbol (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P arbol_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

El árbol tiene dos ramas gruesas hacia los lados; la plataforma se apoya sobre ellas con un
hueco alrededor del tronco. Noche entre 3.9 y 12.6 s; el resto del video es de día.
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/arbol'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 55.9  # audio 55.05 s + cola
NF = int(round(DUR * FPS))
random.seed(17)

clean()
sc = bpy.context.scene

M = dict(
    ground=mat('suelo_selva', (0.18, 0.30, 0.12), 0.95),
    bark=mat('corteza', (0.36, 0.25, 0.16), 0.9),
    leaf=mat('follaje', (0.16, 0.42, 0.14), 0.85),
    leaf2=mat('follaje2', (0.22, 0.50, 0.18), 0.85),
    palm=mat('palma', (0.30, 0.55, 0.20), 0.8),
    plank=mat('tronquito', (0.55, 0.38, 0.22), 0.85),
    rope=mat('amarre', (0.78, 0.66, 0.40), 0.9),
    liana=mat('liana', (0.35, 0.40, 0.16), 0.9),
    cloth=mat('ropa', (0.75, 0.55, 0.30), 0.9),
    sash=mat('faja', (0.20, 0.35, 0.20), 0.8),
    skin=mat('piel', (0.70, 0.50, 0.35), 0.6),
    hair=mat('pelo', (0.20, 0.12, 0.06), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    ant=mat('hormiga', (0.10, 0.04, 0.02), 0.6),
    snake=mat('serpiente', (0.30, 0.55, 0.15), 0.5),
    jag=mat('jaguar', (0.88, 0.62, 0.22), 0.8),
    spot=mat('mancha', (0.10, 0.07, 0.05), 0.8),
    eye=flat_mat('ojos', (1.0, 0.9, 0.3), 12.0),
    fire=flat_mat('fuego', (1.0, 0.5, 0.12), 8.0),
    bed=mat('petate', (0.70, 0.60, 0.40), 0.9),
    hammock=mat('hamaca', (0.20, 0.45, 0.75), 0.8),
    basket=mat('canasta', (0.70, 0.52, 0.28), 0.9),
    fruit=mat('fruta', (0.95, 0.40, 0.12), 0.6),
    banana=mat('platano', (0.98, 0.85, 0.20), 0.6),
    monkey=mat('mono', (0.40, 0.26, 0.14), 0.9),
    monkeyf=mat('cara_mono', (0.85, 0.70, 0.55), 0.8),
    rain=flat_mat('lluvia', (0.70, 0.82, 1.0), 1.2),
    wind=flat_mat('viento', (0.92, 0.96, 1.0), 2.0),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

box('suelo', -60, 60, -40, 80, -2, 0, m=M['ground'])
for k in range(22):   # selva alrededor
    x = random.uniform(-22, 22)
    y = random.uniform(5, 35) if abs(x) < 8 else random.uniform(-6, 35)
    h = random.uniform(5, 11)
    prim('cylinder', f'selva_t{k}', (x, y, h / 2), m=M['bark'], radius=random.uniform(0.2, 0.4), depth=h, vertices=10)
    prim('uv_sphere', f'selva_c{k}', (x, y, h), scale=(1, 1, 0.8), m=M['leaf2'] if k % 2 else M['leaf'],
         radius=random.uniform(1.8, 3.0), segments=14, ring_count=8)
for k in range(14):
    x, y = random.uniform(-6, 6), random.uniform(-3, 6)
    if math.hypot(x, y) < 2.0:
        continue
    prim('cone', f'helecho{k}', (x, y, 0.3), m=M['leaf2'], radius1=0.5, depth=0.6, vertices=7)

# ---------------------------------------------------------------- el árbol
FZ = 4.45   # piso de la plataforma
tree = link(bpy.data.objects.new('arbol', None))
trunk = prim('cylinder', 'tronco', (0, 0, 0), m=M['bark'], radius=0.45, depth=1.0, vertices=24)
for v in trunk.data.vertices:
    v.co.z = FZ + 0.3 if v.co.z > 0 else 0
trunk_hi = prim('cylinder', 'tronco_alto', (0, 0, 0), m=M['bark'], radius=0.45, depth=1.0, vertices=24)
for v in trunk_hi.data.vertices:
    v.co.z = 10.0 if v.co.z > 0 else FZ + 0.3
parts = [trunk, trunk_hi]
for side in (-1, 1):
    L = math.hypot(2.4, 1.2)
    br = prim('cylinder', f'rama{side}', (side * 1.2, 0, 3.9), m=M['bark'], radius=0.24, depth=L, vertices=14,
              rot=(0, side * math.atan2(2.4, 1.2), 0))
    parts.append(br)
    parts.append(prim('uv_sphere', f'copa_rama{side}', (side * 2.6, 0, 6.6), scale=(1, 1, 0.8), m=M['leaf'], radius=1.6, segments=16,
                      ring_count=10))
    tw = prim('cylinder', f'ramita{side}', (side * 2.5, 0, 5.4), m=M['bark'], radius=0.1, depth=2.0, vertices=8)
    parts.append(tw)
parts.append(prim('uv_sphere', 'copa', (0, 0.3, 10.2), scale=(1.2, 1.1, 0.8), m=M['leaf2'], radius=2.6, segments=18, ring_count=10))
for p in parts:
    p.parent = tree
tree.rotation_mode = 'XYZ'
for t in [17.6 + 0.35 * j for j in range(9)] + [24.2 + 0.4 * j for j in range(4)]:
    key(tree, 'rotation_euler', t, (0, random.choice((-1, 1)) * 0.035, 0))
key(tree, 'rotation_euler', 20.6, (0, 0, 0))
key(tree, 'rotation_euler', 23.9, (0, 0, 0))
key(tree, 'rotation_euler', 26.0, (0, 0, 0))
# el tronco engorda (43 - 43.8), y vuelve al cortar (46.9)
key(trunk, 'scale', 0, (1, 1, 1), 'CONSTANT')
key(trunk, 'scale', 42.9, (1, 1, 1))
key(trunk, 'scale', 43.8, (1.35, 1.35, 1))
key(trunk, 'scale', 46.9, (1, 1, 1), 'CONSTANT')
copa = bpy.data.objects['copa']
for o in (trunk_hi, copa):   # se ocultan mientras vemos el hueco desde arriba
    key(o, 'scale', 0, tuple(o.scale), 'CONSTANT')
    key(o, 'scale', 39.6, Z, 'CONSTANT')
    key(o, 'scale', 46.9, tuple(o.scale), 'CONSTANT')

PY = 1.25   # semiancho de la plataforma (en y)


def planks(prefix, t_in, t_out=None, gap=0.68, m=None):
    out = []
    n = 10
    for j in range(n):
        y = -PY + (j + 0.5) * 2 * PY / n
        segs_ = [(-2.0, 2.0)]
        if abs(y) < gap:
            dx = math.sqrt(max(0.0, gap ** 2 - y ** 2))
            segs_ = [(-2.0, -dx), (dx, 2.0)]
        for k, (x0, x1) in enumerate(segs_):
            o = box(f'{prefix}{j}_{k}', x0, x1, y - 0.11, y + 0.11, FZ - 0.12, FZ, m=m or M['plank'])
            pop(o, t_in + 0.05 * j, t_out, s=(1, 1, 1), dur=0.15)
            out.append(o)
    return out


# plataforma amarrada (13.6) que el viento rompe (19.8)
tied = planks('amarrado', 13.6, 20.6)
ropes = []
for k, x in enumerate((-1.5, 1.5)):
    for j in range(5):
        r = prim('torus', f'nudo{k}{j}', (x, -PY + 0.25 + 0.5 * j, FZ - 0.1), rot=(0, math.pi / 2, 0), m=M['rope'],
                 major_radius=0.16, minor_radius=0.03, major_segments=12, minor_segments=6)
        pop(r, 14.2 + 0.1 * j, 20.6, s=(1, 1, 1), dur=0.15)
        key(r, 'location', 19.7, tuple(r.location))
        key(r, 'location', 20.4, (x * 2.2, r.location[1] - 1.5, FZ + 1.5), 'LINEAR')
for o in tied[::3]:
    loc = tuple(o.location)
    key(o, 'location', 19.8, loc)
    key(o, 'location', 20.5, (loc[0], loc[1] - 0.8, 0.1), 'LINEAR')
    key(o, 'rotation_euler', 19.8, (0, 0, 0))
    key(o, 'rotation_euler', 20.5, (random.uniform(-0.8, 0.8), 0.3, 0))
for k, z in enumerate((5.0, 6.2)):
    arrow_run(f'viento{k}', M['wind'], (-7.0, -1.8, z), (-2.6, -1.8, z), (0, 0, 0), 17.4, 20.5, period=1.0, phase=0.4 * k, length=1.4)
# vigas apoyadas (21.6) y tablas sueltas encima (22.0)
for k, x in enumerate((-1.5, 1.5)):
    b = box(f'viga{k}', x - 0.12, x + 0.12, -PY - 0.2, PY + 0.2, FZ - 0.36, FZ - 0.12, m=M['plank'])
    pop(b, 21.6 + 0.15 * k, s=(1, 1, 1), dur=0.2)
floor = planks('tabla', 22.0)
outline('contorno_vigas', rect_xz(-1.8, 1.8, FZ - 0.5, FZ + 0.1, -PY - 0.3), M['orange'], (0, -PY - 0.3, FZ - 0.2), 22.6, 24.0)
# el árbol se mueve y la plataforma se desliza sin romperse (24.2 - 25.8)
for o in floor:
    loc = tuple(o.location)
    key(o, 'location', 24.2, loc)
    key(o, 'location', 24.7, (loc[0] + 0.08, loc[1], loc[2]))
    key(o, 'location', 25.2, (loc[0] - 0.06, loc[1], loc[2]))
    key(o, 'location', 25.7, loc)

# ---------------------------------------------------------------- techo de palma en capas (29.6 - 33)
RZ0, RZ1 = FZ + 1.6, FZ + 2.9   # alero y cumbrera
roof = []
for k, (x, y) in enumerate(((-1.7, -PY + 0.1), (1.7, -PY + 0.1), (-1.7, PY - 0.1), (1.7, PY - 0.1))):
    p = prim('cylinder', f'poste{k}', (x, y, (FZ + RZ0) / 2), m=M['plank'], radius=0.06, depth=RZ0 - FZ, vertices=8)
    pop(p, 29.4 + 0.08 * k, s=(1, 1, 1), dur=0.2)
    roof.append(p)
slope = math.atan2(RZ1 - RZ0, PY + 0.3)
rows = 4
for side in (-1, 1):
    for r in range(rows):
        f = (r + 0.5) / rows
        y = side * (PY + 0.3) * (1 - f)
        z = RZ0 + (RZ1 - RZ0) * f
        lf = box(f'hojas{side}_{r}', -2.3, 2.3, -0.42, 0.42, -0.03, 0.03, m=M['palm'], origin=(0, 0, 0))
        lf.location = (0, y, z + 0.04)
        lf.rotation_euler = (side * slope, 0, 0)
        pop(lf, 30.1 + 0.35 * r + 0.1 * (side > 0), s=(1, 1, 1), dur=0.25)
        roof.append(lf)
for o in roof:   # el techo se quita mientras vemos el hueco desde arriba
    key(o, 'scale', 39.55, (1, 1, 1), 'CONSTANT')
    key(o, 'scale', 39.6, Z, 'CONSTANT')
    key(o, 'scale', 46.9, (1, 1, 1), 'CONSTANT')

# ---------------------------------------------------------------- lluvia (26 - 28.3)
for k in range(45):
    r = prim('cylinder', f'lluvia{k}', (0, 0, 0), m=M['rain'], radius=0.015, depth=0.5, vertices=4)
    x, y = random.uniform(-4, 4), random.uniform(-3, 2)
    key(r, 'scale', 0, Z, 'CONSTANT')
    t = 26.0 + random.uniform(0, 0.5)
    while t < 28.4:
        key(r, 'scale', t, Z, 'CONSTANT')
        key(r, 'location', t, (x, y, 12), 'CONSTANT')
        key(r, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
        key(r, 'location', t + 0.6, (x, y, FZ + 0.05), 'LINEAR')
        key(r, 'scale', t + 0.6, Z, 'CONSTANT')
        t += 0.65

# ---------------------------------------------------------------- persona
P = person('persona', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


LIE = (0, -math.pi / 2, 0)
pose(P, 0, (1.6, -1.2, 0.2), LIE)
pose(P, 7.3, (1.6, -1.2, 0.2), LIE)
pose(P, 7.7, (0.4, -0.6, 0.0), (0, 0, 0), 'BEZIER')
pose(P, 8.6, (0.9, -0.3, 3.9), (0, 0, 0), 'BEZIER')
pose(P, 9.4, (1.6, -0.05, 4.3), (0, 0, 0), 'BEZIER')
pose(P, 9.7, (1.7, 0.0, 4.55), (0, -math.pi / 2, 0), 'BEZIER')   # acostado en la rama
pose(P, 10.6, (1.7, 0.0, 4.55), (0, -math.pi / 2, 0), 'BEZIER')
pose(P, 11.2, (1.7, -0.3, 4.4), (0.9, -math.pi / 2, 0), 'BEZIER')   # se voltea
pose(P, 11.7, (1.75, -0.45, 3.3), (0, 0, 0), 'BEZIER')               # casi se cae: colgando
pose(P, 12.5, (1.75, -0.45, 3.3), (0, 0, 0), 'BEZIER')
pose(P, 12.6, (0.9, -0.6, FZ), (0, 0, 0.4))
for k in range(6):   # amarrando troncos
    pose(P, 13.0 + 0.5 * k, (0.9, -0.6, FZ - 0.05 * (k % 2)), (0.3 * (k % 2), 0, 0.4), 'BEZIER')
pose(P, 16.8, (0.9, -0.6, FZ), (0, 0, 0.4))
pose(P, 19.9, (0.9, -0.6, FZ), (0, 0, 0.4))
pose(P, 20.5, (1.2, -1.6, 0.0), (0, 0, 0.4), 'BEZIER')   # se cae con la plataforma rota
pose(P, 21.5, (1.2, -1.6, 0.0), (0, 0, 0.4))
pose(P, 21.55, (0.9, -0.6, FZ), (0, 0, 0.4))
pose(P, 33.4, (0.9, -0.6, FZ), (0, 0, 0.4))
pose(P, 33.45, (0.2, -0.55, 0.3), (0, 0, 0))   # subiendo por el tronco
pose(P, 34.4, (0.2, -0.55, 2.0), (0, 0, 0), 'BEZIER')
pose(P, 35.0, (0.25, -0.65, 0.6), (0.3, 0, 0), 'BEZIER')   # resbala
pose(P, 35.7, (0.25, -0.65, 0.6), (0.3, 0, 0))
pose(P, 35.8, (-0.7, -1.4, 0.0), (0, 0, 0))
pose(P, 37.4, (-0.7, -1.4, 0.0), (0, 0, 0))
pose(P, 38.0, (-0.7, -1.4, FZ - 0.2), (0, 0, 0), 'LINEAR')   # sube por las lianas
pose(P, 38.3, (-0.6, -0.9, FZ), (0, 0, 0), 'BEZIER')
pose(P, 39.5, (-0.6, -0.9, FZ), (0, 0, 0))
pose(P, 39.55, (0, 0, 60))
pose(P, 46.9, (1.0, 0.0, FZ + 0.95), LIE)   # en la hamaca
# campamento
bed = box('petate', 0.6, 2.6, -1.6, -0.8, 0, 0.05, m=M['bed'])
camp = link(bpy.data.objects.new('fogata', None))
for k in range(4):
    lg = prim('cylinder', f'lena{k}', (0, 0, 0.08), rot=(math.pi / 2 - 0.25, 0, k * 1.5), m=M['plank'], radius=0.05, depth=0.6, vertices=8)
    lg.parent = camp
fl = prim('cone', 'fuego', (0, 0, 0.3), m=M['fire'], radius1=0.2, depth=0.5, vertices=10)
fl.parent = camp
camp.location = (-0.6, -2.4, 0)
for o in (bed, camp):
    cut(o, 0, 12.6)
Lf = bpy.data.lights.new('luz_fogata', 'POINT')
Lf.color = (1.0, 0.5, 0.15)
lf_ = link(bpy.data.objects.new('luz_fogata', Lf))
lf_.location = (-0.6, -2.4, 0.8)
key(Lf, 'energy', 0, 150, 'CONSTANT')
key(Lf, 'energy', 12.6, 0, 'CONSTANT')

# ---------------------------------------------------------------- hormigas, serpiente y jaguar (4.9 - 7.3)
for k in range(14):
    a = prim('uv_sphere', f'hormiga{k}', (0, 0, 0), scale=(1.6, 0.8, 0.6), m=M['ant'], radius=0.06, segments=8, ring_count=6)
    pop(a, 4.9 + 0.04 * k, 7.6, s=(1.6, 0.8, 0.6), dur=0.1)
    key(a, 'location', 4.9, (-1.6 + 0.16 * k, -1.7, 0.04))
    key(a, 'location', 7.5, (-0.4 + 0.12 * k, -1.5, 0.04), 'LINEAR')
pts = [(4.0 - 0.25 * k, -0.4 + 0.18 * math.sin(k * 1.1), 0.06) for k in range(12)]
sn = curve_obj('serpiente', [(p[0] - 4.0, p[1], p[2]) for p in pts], M['snake'], bevel=0.06)
sn.location = (4.0, -1.0, 0)
pop(sn, 5.8, 7.6, s=(1, 1, 1), dur=0.2)
key(sn, 'location', 5.9, (4.0, -1.0, 0))
key(sn, 'location', 7.5, (3.0, -1.2, 0), 'LINEAR')
jag = link(bpy.data.objects.new('jaguar', None))
jparts = [prim('uv_sphere', 'j_cuerpo', (0, 0, 0.55), scale=(1.8, 0.7, 0.65), m=M['jag'], radius=0.4, segments=16, ring_count=10),
          prim('uv_sphere', 'j_cabeza', (0.75, 0, 0.75), m=M['jag'], radius=0.24, segments=14, ring_count=10),
          prim('uv_sphere', 'j_ojo1', (0.95, -0.1, 0.8), m=M['eye'], radius=0.035, segments=8, ring_count=6),
          prim('uv_sphere', 'j_ojo2', (0.95, 0.1, 0.8), m=M['eye'], radius=0.035, segments=8, ring_count=6),
          prim('cylinder', 'j_cola', (-0.85, 0, 0.7), rot=(0, 1.0, 0), m=M['jag'], radius=0.05, depth=0.7, vertices=8)]
for x in (0.45, -0.45):
    for y in (-0.15, 0.15):
        jparts.append(prim('cylinder', f'j_pata{x}{y}', (x, y, 0.2), m=M['jag'], radius=0.07, depth=0.45, vertices=8))
for k in range(8):
    jparts.append(prim('uv_sphere', f'j_mancha{k}', (random.uniform(-0.55, 0.55), -0.26, random.uniform(0.45, 0.72)),
                       scale=(1, 0.3, 1), m=M['spot'], radius=0.06, segments=8, ring_count=6))
for p in jparts:
    p.parent = jag
jag.rotation_euler = (0, 0, math.pi)
pop(jag, 6.6, 12.6, s=(1, 1, 1), dur=0.25)
key(jag, 'location', 6.6, (5.6, -2.6, 0))
key(jag, 'location', 7.3, (3.9, -2.3, 0), 'LINEAR')
key(jag, 'location', 10.0, (3.0, -1.0, 0))
key(jag, 'location', 12.5, (4.0, -2.0, 0))

# ---------------------------------------------------------------- escalera de lianas (36.8 - 39.1)
lad = link(bpy.data.objects.new('escalera_lianas', None))
for side in (-0.2, 0.2):
    c = curve_obj(f'liana{side}', [(side, 0, 0), (side + 0.05, 0, -FZ / 2), (side, 0, -FZ + 0.05)], M['liana'], bevel=0.03)
    c.parent = lad
for j in range(9):
    r = prim('cylinder', f'lianapelda{j}', (0, 0, -0.45 - 0.45 * j), rot=(0, math.pi / 2, 0), m=M['liana'], radius=0.025, depth=0.42,
             vertices=6)
    r.parent = lad
lad.location = (-0.7, -PY - 0.1, FZ - 0.1)
pop(lad, 36.8, s=(1, 1, 1), dur=0.3)
key(lad, 'scale', 38.3, (1, 1, 1))
key(lad, 'scale', 39.1, (1, 1, 0.12))

# ---------------------------------------------------------------- el hueco alrededor del tronco (39.6 - 46.9)
circ = [(0.7 * math.cos(a), 0.7 * math.sin(a), 0) for a in [2 * math.pi * k / 40 for k in range(40)]]
oc = curve_obj('contorno_hueco', circ, M['orange'], cyclic=True, bevel=0.04)
oc.location = (0, 0, FZ + 0.06)
pop(oc, 39.8, 42.2, s=(1, 1, 1), dur=0.3)
# si lo aprietas: las tablas junto al tronco se cierran (44.5) y revientan (45.7)
near = [o for o in floor if abs(o.location[1]) < 0.68 and abs(o.location[0]) < 2.0]
for o in near:
    loc = tuple(o.location)
    sx = 1 if loc[0] > 0 else -1
    key(o, 'location', 44.4, loc)
    key(o, 'location', 44.9, (loc[0] - sx * 0.25, loc[1], loc[2]))
    key(o, 'location', 45.6, (loc[0] - sx * 0.25, loc[1], loc[2]))
    key(o, 'location', 46.0, (loc[0] - sx * 0.1, loc[1], loc[2] + 0.5))
    key(o, 'rotation_euler', 45.6, (0, 0, 0))
    key(o, 'rotation_euler', 46.0, (random.uniform(-0.5, 0.5), sx * 0.6, 0))
    key(o, 'location', 46.88, (loc[0] - sx * 0.1, loc[1], loc[2] + 0.5), 'CONSTANT')
    key(o, 'location', 46.9, loc, 'CONSTANT')
    key(o, 'rotation_euler', 46.88, (0, sx * 0.6, 0), 'CONSTANT')
    key(o, 'rotation_euler', 46.9, (0, 0, 0), 'CONSTANT')

# ---------------------------------------------------------------- hamaca, canasta y mono (46.9 - 52.2)
ham = prim('uv_sphere', 'hamaca', (0.9, 0.0, FZ + 0.8), scale=(1.15, 0.35, 0.22), m=M['hammock'], radius=1, segments=20, ring_count=10)
pop(ham, 47.3, s=(1.15, 0.35, 0.22), dur=0.3)
bask = link(bpy.data.objects.new('canasta', None))
bb = prim('cylinder', 'canasta_c', (0, 0, 0.15), m=M['basket'], radius=0.25, depth=0.3, vertices=14)
bb.parent = bask
for k in range(4):
    fr = prim('uv_sphere', f'fruta{k}', (random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), 0.32), m=M['fruit'], radius=0.08,
              segments=10, ring_count=6)
    fr.parent = bask
cord = prim('cylinder', 'cuerda_canasta', (0, 0, 0), m=M['rope'], radius=0.015, depth=1.0, vertices=6)
for v in cord.data.vertices:
    v.co.z = 0 if v.co.z < 0 else 1
cord.location = (1.9, -PY - 0.1, 0.3)
pop(bask, 48.1, s=(1, 1, 1), dur=0.25)
key(bask, 'location', 48.1, (1.9, -PY - 0.1, 0.0))
key(bask, 'location', 49.2, (1.9, -PY - 0.1, 0.0))
key(bask, 'location', 49.9, (1.9, -PY - 0.1, FZ - 0.6))
key(cord, 'scale', 0, Z, 'CONSTANT')
key(cord, 'scale', 48.4, (1, 1, FZ - 0.3), 'CONSTANT')
key(cord, 'location', 48.4, (1.9, -PY - 0.1, 0.3))
key(cord, 'location', 49.2, (1.9, -PY - 0.1, 0.3))
key(cord, 'location', 49.9, (1.9, -PY - 0.1, FZ - 0.3))
key(cord, 'scale', 49.2, (1, 1, FZ - 0.3))
key(cord, 'scale', 49.9, (1, 1, 0.3))
bunch = link(bpy.data.objects.new('platanos', None))
for k in range(4):
    bn = prim('cylinder', f'platano{k}', (0.06 * k, 0, 0.1), rot=(0, 0.5, 0.3 * k), m=M['banana'], radius=0.04, depth=0.3, vertices=8)
    bn.parent = bunch
bunch.location = (-1.3, 0.6, FZ)
pop(bunch, 48.0, s=(1, 1, 1), dur=0.2)
mk = link(bpy.data.objects.new('mono', None))
mparts = [prim('uv_sphere', 'm_cuerpo', (0, 0, 0.35), scale=(0.9, 0.8, 1.2), m=M['monkey'], radius=0.22, segments=14, ring_count=10),
          prim('uv_sphere', 'm_cabeza', (0, -0.05, 0.75), m=M['monkey'], radius=0.16, segments=14, ring_count=10),
          prim('uv_sphere', 'm_cara', (0, -0.15, 0.73), scale=(1, 0.5, 0.9), m=M['monkeyf'], radius=0.11, segments=12, ring_count=8),
          prim('uv_sphere', 'm_ojo1', (-0.04, -0.2, 0.78), m=M['dark'], radius=0.018, segments=6, ring_count=4),
          prim('uv_sphere', 'm_ojo2', (0.04, -0.2, 0.78), m=M['dark'], radius=0.018, segments=6, ring_count=4),
          prim('torus', 'm_cola', (0.2, 0.1, 0.3), rot=(math.pi / 2, 0, 0), m=M['monkey'], major_radius=0.2, minor_radius=0.03,
               major_segments=16, minor_segments=6)]
for p in mparts:
    p.parent = mk
key(mk, 'scale', 0, Z, 'CONSTANT')
key(mk, 'scale', 50.3, (1.3, 1.3, 1.3), 'CONSTANT')
key(mk, 'location', 50.3, (-2.6, 0.2, 6.2))
key(mk, 'location', 50.9, (-1.4, 0.4, FZ))
key(mk, 'location', 51.3, (-1.4, 0.4, FZ))
key(mk, 'location', 52.1, (-2.8, 0.2, 6.4), 'LINEAR')
key(bunch, 'location', 51.0, (-1.3, 0.6, FZ))
key(bunch, 'location', 51.3, (-1.4, 0.3, FZ + 0.5))
bunch.parent = None
key(bunch, 'location', 52.1, (-2.8, 0.0, 6.9), 'LINEAR')

# ---------------------------------------------------------------- cielo: día / noche (3.9 - 12.6)
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st in ((0, (0.55, 0.62, 0.70), 0.7), (3.85, (0.55, 0.62, 0.70), 0.7), (3.9, (0.03, 0.05, 0.11), 0.5), (12.55, (0.03, 0.05, 0.11), 0.5),
                 (12.6, (0.55, 0.72, 0.92), 0.9)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT')
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(5)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(48), 0, math.radians(-30))
for t, e, c in ((0, 1.8, (1.0, 0.75, 0.55)), (3.85, 1.8, (1.0, 0.75, 0.55)), (3.9, 0.35, (0.55, 0.65, 1.0)),
                (12.55, 0.35, (0.55, 0.65, 1.0)), (12.6, 3.4, (1.0, 0.95, 0.86)), (25.9, 3.4, (1.0, 0.95, 0.86)),
                (26.0, 1.2, (0.75, 0.82, 0.95)), (28.3, 1.2, (0.75, 0.82, 0.95)), (28.35, 3.4, (1.0, 0.95, 0.86)),
                (52.0, 3.4, (1.0, 0.95, 0.86))):
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')
key(sun, 'energy', 55.0, 2.8)
key(sun, 'color', 55.0, (1.0, 0.72, 0.48))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (3.5, -7.5, 1.8), (1.0, -1.0, 0.4), (3.0, -7.0, 1.6), (1.0, -1.0, 0.4)),
    (3.94, (1.5, -9.0, 2.2), (1.5, -1.0, 0.3), (1.6, -8.5, 2.1), (1.6, -1.0, 0.3)),
    (7.28, (4.0, -9.0, 4.0), (0.6, 0, 3.0), (3.4, -8.6, 4.2), (0.8, 0, 3.4)),
    (10.18, (3.4, -5.6, 4.8), (1.6, 0, 3.9), (3.0, -5.2, 4.6), (1.6, 0, 3.8)),
    (12.64, (3.5, -8.0, 6.5), (0, 0, FZ), (2.8, -7.5, 6.2), (0, 0, FZ)),
    (16.76, (-4.0, -9.0, 6.0), (0, 0, FZ), (-3.4, -8.5, 5.8), (0, 0, FZ)),
    (20.62, (3.5, -7.6, 6.4), (0, 0, FZ - 0.2), (2.8, -7.2, 6.0), (0, 0, FZ - 0.2)),
    (26.04, (2.5, -9.5, 5.0), (0, 0, FZ + 0.6), (2.0, -9.0, 5.2), (0, 0, FZ + 0.6)),
    (28.32, (5.0, -9.5, 8.0), (0, 0, FZ + 1.2), (4.0, -9.0, 7.6), (0, 0, FZ + 1.2)),
    (33.52, (2.4, -6.0, 2.4), (0, -0.4, 1.6), (2.0, -5.6, 2.2), (0, -0.4, 1.4)),
    (35.8, (3.2, -8.5, 3.8), (-0.4, -1.0, 2.6), (2.6, -8.0, 4.0), (-0.4, -1.0, 2.8)),
    (39.56, (0.3, -1.6, 7.7), (0, 0, FZ), (0.2, -1.4, 7.5), (0, 0, FZ)),
    (46.92, (3.2, -6.4, 5.8), (0.4, 0, FZ + 0.6), (2.8, -6.0, 5.6), (0.4, 0, FZ + 0.6)),
    (50.2, (-0.2, -6.4, 6.2), (-1.6, 0, FZ + 0.6), (-0.6, -6.0, 6.0), (-1.8, 0, FZ + 0.8)),
    (52.22, (4.0, -11.0, 6.0), (0, 0, FZ + 0.5), (6.0, -19.0, 9.0), (0, 0, FZ + 1.0)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
