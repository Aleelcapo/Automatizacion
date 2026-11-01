"""Humor 04 — cueva para la siesta: bóveda bajo el patio, en corte, sincronizada con el audio.

Uso:
  blender -b -P siesta_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 12] [--calidad 1] [--stills 1,200]
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa
from patio3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/siesta'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 57.0   # audio 56.22 s + cola
NF = int(round(DUR * FPS))
random.seed(59)

clean()
sc = bpy.context.scene
M = materiales()
M.update(
    wood=mat('tabla_madera', (0.55, 0.38, 0.22), 0.85),
    stone=mat('piedra_boveda', (0.66, 0.62, 0.56), 0.85),
    brick=mat('ladrillo_piso', (0.62, 0.30, 0.20), 0.85),
    carpet=mat('alfombra', (0.20, 0.35, 0.60), 0.95),
    straw=mat('paja_pared', (0.88, 0.74, 0.38), 0.9),
    pipe=mat('tubo_barro', (0.70, 0.42, 0.28), 0.7),
    hammock=mat('hamaca', (0.85, 0.30, 0.20), 0.8),
    clockm=mat('reloj', (0.95, 0.95, 0.93), 0.4),
    beam=flat_mat('rayo_sol', (1.0, 0.88, 0.45), 1.0),
    sunball=flat_mat('sol_bola', (1.0, 0.85, 0.40), 8.0),
    mom=mat('mama_vestido', (0.25, 0.55, 0.40), 0.85),
    snow=mat('nieve', (0.95, 0.97, 1.0), 0.6),
)
ground = terreno(M)
house, wins = casa(M)
decorado(M, mesa=False)
bg, sun = cielo_dia(sc)

HX, HY1, HD = 2.4, 3.2, 2.6
excavar(ground, M, 'hoyo', -HX, HX, -1.5, HY1, -1.6, 0.2, 3.1, 4.4)
excavar(ground, M, 'hoyo_hondo', -HX, HX, -1.5, HY1, -HD, -1.5, 15.4, 16.0)
excavar(ground, M, 'entrada', HX - 0.2, HX + 1.4, 0.6, 2.2, -HD, 0.2, 27.6, 28.2)
FLOOR = -HD

# ---------------------------------------------------------------- persona
P = person('dormilon', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
LIE = (0, -math.pi / 2, 0)
pose(P, 0, (3.5, 6.0, 0), (0, 0, 2.6))
pose(P, 2.9, (0.3, 1.5, 0), (0, 0, 2.6), 'BEZIER')
for k in range(3):
    pose(P, 3.2 + 0.4 * k, (0.3, 1.5, -1.6 * (k + 1) / 3), (0.3 * (k % 2), 0, 2.6), 'BEZIER')
pose(P, 4.7, (0.6, 1.5, -1.45), LIE)
pose(P, 14.2, (0.6, 1.5, -1.45), LIE)
pose(P, 14.6, (0.6, 1.5, -1.5), LIE, 'BEZIER', s=(1, 1, 0.55))   # casi lo aplasta
pose(P, 15.3, (0.6, 1.5, -1.5), LIE, s=(1, 1, 0.55))
pose(P, 15.4, (0.6, 1.5, FLOOR + 0.15), LIE)
pose(P, 48.9, (0.6, 1.5, FLOOR + 0.15), LIE)
pose(P, 49.0, (0.6, 1.4, FLOOR + 1.0), LIE)   # en la hamaca
# se tapa los oídos / se sacude la tierra
for k in range(5):
    key(P, 'rotation_euler', 30.2 + 0.35 * k, (0.25 * (1 if k % 2 else -1), -math.pi / 2, 0))
key(P, 'rotation_euler', 32.0, LIE)

# ---------------------------------------------------------------- el sol en la cara (6.4 - 8.5)
sunb = prim('uv_sphere', 'sol_cielo', (6.0, 8.0, 11.0), m=M['sunball'], radius=1.0, segments=16, ring_count=8)
beam = prim('cone', 'rayo', (0, 0, 0), m=M['beam'], radius1=0.15, radius2=0.9, depth=1.0, vertices=16)
for v in beam.data.vertices:
    v.co.z += 0.5
beam.location = (0.6, 1.5, -1.3)
dx, dy, dz = 6.0 - 0.6, 8.0 - 1.5, 11.0 + 1.3
Lb = math.sqrt(dx * dx + dy * dy + dz * dz)
beam.rotation_euler = (-math.atan2(dy, dz), math.atan2(dx, math.hypot(dy, dz)), 0)
for o, s in ((sunb, (1, 1, 1)), (beam, (1, 1, Lb))):
    key(o, 'scale', 0, Z, 'CONSTANT')
    key(o, 'scale', 6.4, s, 'CONSTANT')
    key(o, 'scale', 8.5, Z, 'CONSTANT')

# ---------------------------------------------------------------- tablas con tierra encima (9.5 - 11.4) que se doblan (12.6 - 15.3)
boards = []
for k in range(8):
    y = 0.2 + 0.4 * k
    for side in (-1, 1):
        b = box(f'tabla{k}{side}', 0, side * (HX + 0.3), y - 0.18, y + 0.18, -0.06, 0.02, m=M['wood'], origin=(side * (HX + 0.3), y, 0))
        b.rotation_mode = 'XYZ'
        pop(b, 9.5 + 0.06 * k, 15.4, s=(1, 1, 1), dur=0.12)
        key(b, 'rotation_euler', 12.6, (0, 0, 0))
        key(b, 'rotation_euler', 14.5, (0, -side * 0.38, 0))
        boards.append(b)
mound = prim('uv_sphere', 'monton_tierra', (0, 1.6, 0.0), scale=(3.0, 2.0, 0.7), m=M['soil'], radius=1, segments=24, ring_count=12)
pop(mound, 10.4, 15.4, s=(3.0, 2.0, 0.7), dur=0.5)
key(mound, 'location', 12.6, (0, 1.6, 0.0))
key(mound, 'location', 14.5, (0, 1.6, -0.75))

# ---------------------------------------------------------------- la bóveda (16 - 18.6) cubierta de tierra
VC, VR = FLOOR + 0.9, 2.0     # centro y radio de la bóveda (eje a lo largo de y)
vault = []
NV = 15
for k in range(NV):
    a0 = math.pi * k / NV
    a = math.pi * (k + 0.5) / NV
    b = box(f'dovela{k}', -0.18, 0.18, 0.0, HY1 - 0.1, -0.2, 0.2, m=M['stone'], origin=(0, 0, 0))
    b.location = (VR * math.cos(a), 0, VC + VR * math.sin(a) * 0.95)
    b.rotation_euler = (0, -(a - math.pi / 2), 0)
    b.scale = (1, 1, 1.9 * math.pi * VR / NV / 0.4 * 0.5)
    vault.append(b)
order = sorted(range(NV), key=lambda k: min(k, NV - 1 - k))
for j, k in enumerate(order):
    pop(vault[k], 16.0 + 2.4 * j / NV, s=tuple(vault[k].scale), dur=0.15)
walls = [box('muro_izq', -VR - 0.2, -VR + 0.15, 0.0, HY1 - 0.1, FLOOR, VC, m=M['stone']),
         box('muro_der', VR - 0.15, VR + 0.2, 0.0, HY1 - 0.1, FLOOR, VC, m=M['stone']),
         box('muro_fondo', -VR, VR, HY1 - 0.4, HY1 - 0.1, FLOOR, VC + VR, m=M['stone'])]
for o in walls:
    pop(o, 15.9, s=(1, 1, 1), dur=0.3)
import bmesh


def arc_shell(name, ri, ro, m, y0=-0.02, y1=HY1, n=24):
    """Capa en arco (medio anillo) sobre la bóveda, extruida en y."""
    poly = [(ro * math.cos(math.pi * j / n), VC + ro * math.sin(math.pi * j / n)) for j in range(n + 1)]
    poly += [(ri * math.cos(math.pi * j / n), VC + ri * math.sin(math.pi * j / n)) for j in range(n, -1, -1)]
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


cover = arc_shell('tierra_encima', VR + 0.55, VR + 1.5, M['soil'])
pop(cover, 18.8, s=(1, 1, 1), dur=0.5)
arc = [((VR + 0.35) * math.cos(a), -0.1, VC + (VR + 0.35) * math.sin(a)) for a in [math.pi * j / 30 for j in range(31)]]
outline('contorno_boveda', arc, M['orange'], (0, -0.1, VC + 1.0), 19.9, 21.4, cyclic=False)
# el peso se reparte hacia los lados
for k, s in enumerate((-1, 1)):
    arrow_run(f'peso{k}', M['hot'], (s * 0.5, -0.15, VC + VR + 0.6), (s * (VR + 0.2), -0.15, VC + 0.2), (0, math.atan2(VR + 0.4, s * (VR - 0.3)), 0),
              18.6, 21.4, period=1.1, length=1.0)

# ---------------------------------------------------------------- calor (21.5 - 23.4), tubo y aire (24.4 - 29.3)
for k in range(10):
    o = prim('uv_sphere', f'calor{k}', (random.uniform(-1.6, 1.6), 0.4, random.uniform(FLOOR + 0.4, VC + 1.2)), m=M['hot'], radius=0.07,
             segments=8, ring_count=6)
    key(o, 'scale', 0, Z, 'CONSTANT')
    t = 21.6 + 0.1 * k
    key(o, 'scale', t, (1, 1, 1), 'CONSTANT')
    while t + 0.8 <= 23.6:
        key(o, 'scale', t + 0.4, (1.5, 1.5, 1.5))
        key(o, 'scale', t + 0.8, (1, 1, 1))
        t += 0.8
    key(o, 'scale', 23.6, Z, 'CONSTANT')
tube = prim('cylinder', 'tubo_aire', (-0.8, 1.6, (VC + VR + 1.6) / 2 + 0.4), m=M['pipe'], radius=0.14, depth=VR + 1.6, vertices=14)
pop(tube, 24.4, s=(1, 1, 1), dur=0.3)
arrow_run('sale_caliente', M['hot'], (-0.8, 1.2, VC + 0.8), (-0.8, 1.2, VC + VR + 2.2), (0, -math.pi / 2, 0), 26.2, 29.3, period=1.0, length=1.0)
arrow_run('entra_fresco', M['cold'], (HX + 1.2, 1.0, FLOOR + 0.6), (0.6, 1.0, FLOOR + 0.6), (0, 0, math.pi), 27.9, 29.3, period=0.9,
          length=1.0)
door = box('puerta_cueva', HX - 0.2, HX - 0.05, 0.6, 2.2, FLOOR, FLOOR + 1.6, m=M['wood'])
key(door, 'scale', 0, Z, 'CONSTANT')
key(door, 'scale', 27.6, (1, 1, 1), 'CONSTANT')
key(door, 'location', 27.6, tuple(door.location))
key(door, 'scale', 27.8, (0.1, 1, 1), 'CONSTANT')   # se abre

# ---------------------------------------------------------------- tierra suelta (29.4 - 32) y piso de ladrillo (33 - 34.4)
for k in range(14):
    g = prim('ico_sphere', f'polvo{k}', (0, 0, 0), m=M['soil'], radius=0.04, subdivisions=1)
    x = random.uniform(-0.3, 1.5)
    pop(g, 29.5 + 0.08 * k, 32.0, s=(1, 1, 1), dur=0.05)
    key(g, 'location', 29.5 + 0.08 * k, (x, 1.3, FLOOR + 0.05))
    key(g, 'location', 30.5 + 0.08 * k, (x + random.uniform(-0.2, 0.2), 1.4, FLOOR + 0.35 + random.uniform(0, 0.15)))
for k in range(16):
    r, c = divmod(k, 8)
    x = -VR + 0.3 + 0.48 * c
    br = box(f'ladrillo{k}', x, x + 0.44, 0.0 + 1.5 * r, 1.45 + 1.5 * r, FLOOR, FLOOR + 0.08, m=M['brick'])
    pop(br, 32.9 + 0.04 * k, s=(1, 1, 1), dur=0.1)
carpet = box('alfombra', -1.4, 1.6, 0.4, 2.6, FLOOR + 0.08, FLOOR + 0.1, m=M['carpet'])
pop(carpet, 34.2, s=(1, 1, 1), dur=0.25)

# ---------------------------------------------------------------- gritos desde la casa (35.1 - 38) y paja (38.5 - 39.8)
mom = person('mama', M['mom'], M['trim'], M['skin'], M['dark'], M['hair'])
mom.location = (0.0, 15.4, 0.08)
mom.rotation_euler = (0, 0, math.pi)
pop(mom, 35.1, 38.0, s=(1, 1, 1), dur=0.2)
ondas(M, 'grito', (0.0, 14.8, 1.6), 35.3, 38.0, radio=0.8)
ondas(M, 'grito_abajo', (0.0, 0.8, VC + 1.0), 35.6, 38.0, radio=0.6)
straw = []
for k in range(NV):
    a = math.pi * (k + 0.5) / NV
    s_ = box(f'paja{k}', -0.12, 0.12, 0.0, HY1 - 0.1, -0.2, 0.2, m=M['straw'], origin=(0, 0, 0))
    s_.location = ((VR + 0.3) * math.cos(a), -0.01, VC + (VR + 0.3) * math.sin(a) * 0.95)
    s_.rotation_euler = (0, -(a - math.pi / 2), 0)
    s_.scale = (1, 1, 1.9 * math.pi * (VR + 0.3) / NV / 0.4 * 0.5)
    pop(s_, 38.5 + 1.2 * k / NV, s=tuple(s_.scale), dur=0.15)
for s in (-1, 1):
    sw = box(f'paja_muro{s}', s * (VR + 0.2) - 0.12, s * (VR + 0.2) + 0.12, -0.01, HY1 - 0.1, FLOOR, VC, m=M['straw'])
    pop(sw, 38.6, s=(1, 1, 1), dur=0.3)
ondas(M, 'grito2', (0.0, 14.8, 1.6), 39.6, 41.6, radio=0.8)

# ---------------------------------------------------------------- la tierra del techo como aislante (44 - 48.3)
for k in range(3):
    arrow_run(f'verano{k}', M['hot'], (-1.0 + 1.0 * k, -0.15, VC + VR + 3.4), (-1.0 + 1.0 * k, -0.15, VC + VR + 1.6), (0, math.pi / 2, 0),
              45.0, 46.6, period=0.8, phase=0.2 * k, length=1.0)
    arrow_run(f'invierno{k}', M['cold'], (-1.0 + 1.0 * k, -0.15, VC + VR + 3.4), (-1.0 + 1.0 * k, -0.15, VC + VR + 1.8), (0, math.pi / 2, 0),
              46.8, 48.3, period=0.8, phase=0.2 * k, length=1.0)
snowcap = arc_shell('nieve_encima', VR + 1.5, VR + 1.7, M['snow'], y0=-0.03)
key(snowcap, 'scale', 0, Z, 'CONSTANT')
key(snowcap, 'scale', 46.8, (1, 1, 1), 'CONSTANT')
key(snowcap, 'scale', 48.4, Z, 'CONSTANT')
outline('contorno_tierra', [((VR + 1.0) * math.cos(a), -0.12, VC + 0.4 + (VR + 1.0) * math.sin(a)) for a in [math.pi * j / 30 for j in range(31)]],
        M['orange'], (0, -0.12, VC + 1.5), 42.0, 44.0, cyclic=False)
for t, c, st, e in ((0, (0.80, 0.86, 0.95), 1.0, 3.6), (46.75, (0.80, 0.86, 0.95), 1.0, 3.6), (46.8, (0.70, 0.74, 0.82), 0.8, 1.6),
                    (48.35, (0.70, 0.74, 0.82), 0.8, 1.6), (48.4, (0.80, 0.86, 0.95), 1.0, 3.6)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT')
    key(sun, 'energy', t, e, 'CONSTANT')

# ---------------------------------------------------------------- hamaca, ventilador y reloj (48.9 - 53.4)
ham = prim('uv_sphere', 'hamaca', (0.6, 1.4, FLOOR + 0.95), scale=(1.4, 0.35, 0.22), m=M['hammock'], radius=1, segments=20, ring_count=10)
pop(ham, 48.9, s=(1.4, 0.35, 0.22), dur=0.3)
for k, s in enumerate((-1, 1)):
    c = curve_obj(f'cuerda_hamaca{k}', [(0.6 + s * 1.35, 1.4, FLOOR + 1.0), (s * (VR - 0.2), 1.4, VC + 0.4)], M['wood'], bevel=0.02)
    pop(c, 48.9, s=(1, 1, 1), dur=0.3)
fan = link(bpy.data.objects.new('ventilador', None))
fb = prim('cylinder', 'vent_base', (0, 0, 0.05), m=M['metal'], radius=0.18, depth=0.1, vertices=14)
fp = prim('cylinder', 'vent_poste', (0, 0, 0.45), m=M['metal'], radius=0.03, depth=0.8, vertices=8)
fh = prim('cylinder', 'vent_aspas', (0, -0.05, 0.9), rot=(math.pi / 2, 0, 0), m=M['clockm'], radius=0.28, depth=0.04, vertices=6)
for p in (fb, fp, fh):
    p.parent = fan
fan.location = (-1.3, 1.6, FLOOR + 0.08)
pop(fan, 49.8, s=(1, 1, 1), dur=0.25)
for j in range(12):
    key(fh, 'rotation_euler', 50.0 + 0.25 * j, (math.pi / 2, 0, j * 1.6))
clk = link(bpy.data.objects.new('reloj', None))
face = prim('cylinder', 'reloj_cara', (0, 0, 0), rot=(math.pi / 2, 0, 0), m=M['clockm'], radius=0.32, depth=0.05, vertices=24)
hand = box('reloj_manecilla', -0.015, 0.015, -0.04, -0.03, 0, 0.25, m=M['dark'], origin=(0, 0, 0))
face.parent = clk
hand.parent = clk
hand.rotation_mode = 'XYZ'
clk.location = (0.0, HY1 - 0.45, VC + 1.2)
pop(clk, 50.7, s=(1, 1, 1), dur=0.25)
for j in range(8):   # el reloj "finge": la manecilla regresa
    key(hand, 'rotation_euler', 51.0 + 0.3 * j, (0, -0.4 * (j % 3), 0))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (5.5, -6.0, 5.5), (0, 9.0, 1.0), (4.5, -5.0, 5.0), (0, 7.0, 0.5)),
    (2.9, (4.0, -9.5, 2.0), (0.3, 1.5, -0.8), (3.6, -9.0, 1.9), (0.3, 1.5, -0.8)),
    (6.2, (3.0, -7.5, 1.0), (0.6, 1.5, -1.2), (2.8, -7.0, 0.9), (0.6, 1.5, -1.2)),
    (8.5, (4.5, -10.0, 2.5), (0, 1.5, -0.8), (4.0, -9.5, 2.3), (0, 1.5, -0.8)),
    (15.4, (4.0, -10.5, 1.5), (0, 1.5, -1.0), (3.6, -10.0, 1.4), (0, 1.5, -1.0)),
    (21.5, (3.5, -9.5, 0.5), (0, 1.5, -1.0), (3.2, -9.0, 0.6), (0, 1.5, -0.8)),
    (29.4, (2.5, -7.0, -0.5), (0.4, 1.5, -2.0), (2.3, -6.6, -0.6), (0.4, 1.5, -2.0)),
    (35.1, (5.0, -9.0, 5.0), (0, 8.0, 0.0), (4.5, -9.5, 4.5), (0, 6.0, -0.5)),
    (38.0, (3.5, -9.5, 0.5), (0, 1.5, -1.0), (3.2, -9.0, 0.6), (0, 1.5, -1.0)),
    (41.72, (3.5, -11.0, 2.5), (0, 1.5, 0.0), (3.0, -10.5, 2.4), (0, 1.5, 0.0)),
    (48.4, (3.0, -8.0, 0.0), (0.2, 1.5, -1.3), (2.6, -7.5, -0.1), (0.2, 1.5, -1.3)),
    (53.4, (5.0, -12.0, 3.5), (0, 3.0, -0.5), (12.0, -26.0, 10.0), (0, 8.0, 0.5)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
