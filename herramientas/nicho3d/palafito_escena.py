"""Escena 3D del palafito (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P palafito_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Corte transversal del río en y=0: agua, lodo blando y tierra firme. La casa vive detrás del
corte (y >= 0.3); su pared delantera desaparece para mostrar el piso con rendijas.
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/palafito'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 54.5  # audio 53.68 s + cola
NF = int(round(DUR * FPS))
random.seed(9)

clean()
sc = bpy.context.scene

M = dict(
    grass=mat('pasto', (0.34, 0.52, 0.20), 0.9),
    bank=mat('orilla_corte', (0.42, 0.30, 0.18), 0.95),
    mud=mat('lodo_blando', (0.36, 0.26, 0.16), 0.95),
    mudcut=mat('lodo_corte', (0.30, 0.21, 0.13), 0.95),
    firm=mat('tierra_firme', (0.30, 0.28, 0.26), 0.9),
    firmcut=mat('firme_corte', (0.24, 0.22, 0.21), 0.9),
    water=mat('agua', (0.20, 0.45, 0.42), 0.12, alpha=0.88),
    watercut=mat('agua_corte', (0.35, 0.62, 0.62), 0.6, alpha=0.42),
    foam=flat_mat('espuma', (0.92, 0.97, 1.0), 1.6),
    pile=mat('pilote', (0.50, 0.36, 0.22), 0.85),
    plank=mat('tabla', (0.62, 0.45, 0.28), 0.8),
    wall=mat('pared', (0.78, 0.66, 0.42), 0.85),
    thatch=mat('palma', (0.70, 0.58, 0.28), 0.9),
    fungus=mat('hongo', (0.80, 0.78, 0.62), 0.8),
    skin=mat('piel', (0.55, 0.36, 0.24), 0.6),
    cloth=mat('ropa', (0.90, 0.88, 0.80), 0.9),
    sash=mat('faja', (0.20, 0.45, 0.70), 0.8),
    hair=mat('pelo', (0.06, 0.05, 0.05), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    canoe=mat('canoa', (0.40, 0.25, 0.13), 0.8),
    hammock=mat('hamaca', (0.85, 0.25, 0.20), 0.8),
    heron=mat('garza', (0.85, 0.87, 0.90), 0.8),
    herond=mat('garza_osc', (0.35, 0.37, 0.42), 0.8),
    beak=mat('pico', (0.95, 0.75, 0.15), 0.6),
    tree=mat('arbol', (0.20, 0.42, 0.16), 0.85),
    trunk=mat('tronco', (0.38, 0.26, 0.15), 0.9),
    rain=flat_mat('lluvia', (0.75, 0.88, 1.0), 1.5),
    drop=mat('gota', (0.55, 0.8, 1.0), 0.05, emit=(0.5, 0.8, 1.0), es=1.5),
    air=flat_mat('aire', (0.55, 0.85, 1.0), 2.6),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

BANK_X = -3.0
LVL = -0.6       # nivel normal del río
BED = -2.0       # fondo del río (arriba del lodo)
FIRM = -3.0      # comienza la tierra firme


def cut_box(name, x0, x1, z0, z1, m_top, m_cut, y1=40):
    o = box(name, x0, x1, 0, y1, z0, z1, mats=[m_top, m_cut])
    face_mats(o, lambda n: 1 if n.y < -0.5 else 0)
    return o


cut_box('orilla', -40, BANK_X, FIRM, 0, M['grass'], M['bank'])
cut_box('lodo', BANK_X, 40, FIRM, BED, M['mud'], M['mudcut'])
cut_box('firme', -40, 40, -14, FIRM, M['firm'], M['firmcut'])
river = box('rio', BANK_X, 40, 0, 40, BED, LVL, mats=[M['water'], M['watercut']], origin=(0, 20, BED))
face_mats(river, lambda n: 1 if n.y < -0.5 else 0)
foam = box('espuma', BANK_X, 40, -0.03, 0.0, LVL - 0.05, LVL + 0.015, m=M['foam'], origin=(0, 0, LVL))
flood = box('inundacion', -40, BANK_X, 0, 40, 0, 0.9, mats=[M['water'], M['watercut']], origin=(0, 20, 0))
face_mats(flood, lambda n: 1 if n.y < -0.5 else 0)
H0 = LVL - BED
HF = 0.9 - BED
for t, h in ((0, H0), (5.6, H0), (7.2, HF), (7.75, HF), (7.8, H0)):
    key(river, 'scale', t, (1, 1, h / H0), 'CONSTANT' if t == 7.75 else 'BEZIER')
    key(foam, 'location', t, (0, 0, BED + h), 'CONSTANT' if t == 7.75 else 'BEZIER')
key(flood, 'scale', 0, Z, 'CONSTANT')
key(flood, 'scale', 6.3, (1, 1, 0.02))
key(flood, 'scale', 7.2, (1, 1, 1))
key(flood, 'scale', 7.8, Z, 'CONSTANT')

# árboles en la orilla
for k in range(10):
    x = random.uniform(-16, -5) if k < 6 else random.uniform(-8, 16)
    y = random.uniform(2, 6) if k < 6 else random.uniform(16, 28)
    if k >= 6:
        box(f'orilla_fondo{k}', x - 3, x + 3, y - 2, y + 2, LVL - 0.2, 0.2, m=M['grass'])
    prim('cylinder', f'tronco{k}', (x, y, 1.0), m=M['trunk'], radius=0.12, depth=2.0, vertices=8)
    prim('uv_sphere', f'copa{k}', (x, y, 2.4), scale=(1, 1, 1.1), m=M['tree'], radius=1.0, segments=12, ring_count=8)

# ---------------------------------------------------------------- casa
HX0, HX1, HY0, HY1 = -1.2, 1.2, 0.05, 2.7
WALL_H = 1.6
house = link(bpy.data.objects.new('casa', None))
parts = []
for j in range(8):  # piso de tablas con rendijas
    x = -1.05 + 0.3 * j
    parts.append(box(f'tabla{j}', x - 0.12, x + 0.12, HY0, HY1, -0.08, 0, m=M['plank']))
for y in (0.2, 2.4):
    parts.append(box(f'viga{y}', HX0, HX1, y - 0.08, y + 0.08, -0.24, -0.08, m=M['pile']))
parts.append(box('pared_atras', HX0, HX1, HY1 - 0.1, HY1, 0, WALL_H, m=M['wall']))
parts.append(box('pared_izq', HX0, HX0 + 0.1, HY0, HY1, 0, WALL_H, m=M['wall']))
parts.append(box('pared_der', HX1 - 0.1, HX1, HY0, HY1, 0, WALL_H, m=M['wall']))
front_parts = [box('pared_frente_a', HX0, -0.35, HY0, HY0 + 0.1, 0, WALL_H, m=M['wall']),
               box('pared_frente_b', 0.35, HX1, HY0, HY0 + 0.1, 0, WALL_H, m=M['wall']),
               box('pared_frente_c', -0.35, 0.35, HY0, HY0 + 0.1, 1.15, WALL_H, m=M['wall'])]
roof = prim('cone', 'techo', (0, (HY0 + HY1) / 2, WALL_H), m=M['thatch'], radius1=2.25, depth=2.0, vertices=4,
            rot=(0, 0, math.pi / 4))
for v in roof.data.vertices:
    v.co.z += 1.0
roof.location = (0, (HY0 + HY1) / 2, WALL_H)
for p in parts + front_parts + [roof]:
    p.parent = house
key(roof, 'scale', 0, (1, 1, 0.38))
key(roof, 'scale', 35.3, (1, 1, 0.38))
key(roof, 'scale', 36.4, (1, 1, 1.0))
for p in front_parts:
    cut(p, 0, 38.64)

struct = link(bpy.data.objects.new('estructura', None))   # pilotes + casa (se inclina junto)
struct.location = (1.5, 0, LVL)
struct.rotation_mode = 'XYZ'
key(struct, 'location', 0, (1.5, 0, LVL), 'CONSTANT')
key(struct, 'location', 14.6, (1.5, 0, LVL))
key(struct, 'location', 15.6, (1.5, 0, LVL - 0.35))
key(struct, 'location', 16.7, (1.5, 0, LVL - 0.35))
key(struct, 'location', 17.6, (1.5, 0, LVL))
key(struct, 'rotation_euler', 0, (0, 0, 0), 'CONSTANT')
key(struct, 'rotation_euler', 14.6, (0, 0, 0))
key(struct, 'rotation_euler', 15.6, (0, 0.13, 0))
key(struct, 'rotation_euler', 16.7, (0, 0.13, 0))
key(struct, 'rotation_euler', 17.6, (0, 0, 0))
FLOOR_Z = 2.2  # piso de la casa sobre el nivel del río (local de la estructura)
# la choza empieza en la orilla, luego sube a los pilotes
key(house, 'location', 0, (-7.5 - 1.5, 0, 0 - LVL), 'CONSTANT')
house.parent = struct
key(house, 'location', 7.8, (0, 0, FLOOR_Z - 1.5), 'CONSTANT')
key(house, 'location', 9.6, (0, 0, FLOOR_Z), 'BEZIER')

piles = []
for k, (x, y) in enumerate([(px, py) for px in (-1.0, 0.0, 1.0) for py in (0.02, 2.45)]):
    top = FLOOR_Z - 0.2
    bot = BED - LVL - 0.6   # dentro del lodo blando
    pl = prim('cylinder', f'pilote{k}', (0, 0, 0), m=M['pile'], radius=0.11, depth=1, vertices=12)
    for v in pl.data.vertices:
        v.co.z = 0 if v.co.z > 0 else -1
    pl.parent = struct
    pl.location = (x, y, top)
    s_full = (1, 1, top - bot)
    s_deep = (1, 1, top - (FIRM - LVL - 0.6))
    key(pl, 'location', 0, (x, y, top + 8), 'CONSTANT')
    key(pl, 'location', 8.3 + 0.12 * k, (x, y, top + 8))
    key(pl, 'location', 9.4 + 0.12 * k, (x, y, top))
    key(pl, 'scale', 0, Z, 'CONSTANT')
    key(pl, 'scale', 8.3, s_full, 'CONSTANT')
    key(pl, 'scale', 16.7, s_full)
    key(pl, 'scale', 18.2, s_deep)
    piles.append(pl)
outline('contorno_pilotes', rect_xz(1.5 - 1.3, 1.5 + 1.3, BED - 0.75, LVL + FLOOR_Z - 0.15, -0.1), M['orange'],
        (1.5, -0.1, -0.5), 11.3, 12.74)
# travesaños (19.4)
for k, (x0, x1) in enumerate(((-1.0, 0.0), (0.0, 1.0))):
    for d, (za, zb) in enumerate(((-0.1, 1.6), (1.6, -0.1))):
        L = math.hypot(x1 - x0, zb - za)
        br = prim('cylinder', f'travesano{k}{d}', (0, 0, 0), m=M['pile'], radius=0.06, depth=L, vertices=8)
        br.parent = struct
        br.location = ((x0 + x1) / 2, 0.02, (za + zb) / 2)
        br.rotation_euler = (0, math.atan2(x1 - x0, zb - za), 0)
        pop(br, 19.4 + 0.12 * (2 * k + d), s=(1, 1, 1), dur=0.2)
outline('contorno_firme', rect_xz(-1.5, 4.5, FIRM - 0.75, FIRM + 0.05, -0.1), M['orange'], (1.5, -0.1, FIRM - 0.35), 18.0, 19.4)

# madera podrida (20.5 - 22.7) y madera dura (23.3)
pp = M['pile'].node_tree.nodes['Principled BSDF']
for t, c in ((0, (0.50, 0.36, 0.22)), (20.9, (0.50, 0.36, 0.22)), (22.0, (0.20, 0.24, 0.12)), (23.2, (0.20, 0.24, 0.12)),
             (24.0, (0.33, 0.14, 0.07))):
    node_key(pp.inputs['Base Color'], t, (*c, 1))
for k in range(10):
    pl = piles[k % 6]
    f = prim('uv_sphere', f'hongo{k}', (0, 0, 0), scale=(1, 1, 0.5), m=M['fungus'], radius=0.07, segments=10, ring_count=6)
    f.parent = struct
    f.location = (pl.location[0] + random.choice((-0.11, 0.11)), pl.location[1] - 0.05, random.uniform(-0.3, 0.9))
    pop(f, 21.2 + 0.08 * k, 23.6, s=(1, 1, 0.5), dur=0.15)

# ---------------------------------------------------------------- persona, canoa y escalera
def canoe(name):
    root = link(bpy.data.objects.new(name, None))
    hull = prim('uv_sphere', name + '_casco', (0, 0, 0), scale=(1.4, 0.36, 0.26), m=M['canoe'], radius=1, segments=24, ring_count=12)
    inner = prim('uv_sphere', name + '_dentro', (0, 0, 0.06), scale=(1.3, 0.28, 0.19), m=M['dark'], radius=1, segments=24, ring_count=12)
    for p in (hull, inner):
        p.parent = root
    return root


P = person('persona', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


pose(P, 0, (-6.0, 0.6, 0), (0, 0, 0.3))
pose(P, 4.2, (-6.0, 0.6, 0), (0, 0, 0.3))
pose(P, 7.8, (-6.0, 0.6, 40))
cn = canoe('canoa')
key(cn, 'location', 0, (8.0, 0.8, LVL - 0.02), 'CONSTANT')
key(cn, 'location', 26.1, (8.0, 0.8, LVL - 0.02))
key(cn, 'location', 27.6, (3.9, 0.8, LVL - 0.02))
key(cn, 'location', 29.0, (0.1, 0.8, LVL - 0.02))
pose(P, 26.1, (8.0, 0.8, LVL + 0.1), (0, 0, 0))
pose(P, 27.6, (3.9, 0.8, LVL + 0.1), (0, 0, 0), 'BEZIER')
pose(P, 28.0, (3.9, 0.8, LVL + 0.1), (-0.25, 0, 0), 'BEZIER')   # mira hacia arriba
pose(P, 29.0, (0.1, 0.8, LVL + 0.1), (0, 0, 0), 'BEZIER')
pose(P, 29.8, (-0.1, 0.8, LVL + 0.15), (0, 0, 0), 'BEZIER')
pose(P, 30.4, (0.3, 0.8, LVL + FLOOR_Z), (0, 0, 0), 'BEZIER')
pose(P, 30.9, (1.2, 1.5, LVL + FLOOR_Z), (0, 0, 0), 'BEZIER')
pose(P, 46.0, (1.2, 1.5, LVL + FLOOR_Z), (0, 0, 0))
pose(P, 46.6, (1.5, 1.5, LVL + FLOOR_Z + 0.75), (0, -math.pi / 2, 0))   # acostado en la hamaca
# escalera
lad = link(bpy.data.objects.new('escalera', None))
for side in (-0.22, 0.22):
    r = prim('cylinder', f'esc_lado{side}', (side, 0, 1.25), m=M['plank'], radius=0.035, depth=2.6, vertices=6)
    r.parent = lad
for j in range(7):
    r = prim('cylinder', f'esc_pelda{j}', (0, 0, 0.15 + 0.36 * j), rot=(0, math.pi / 2, 0), m=M['plank'], radius=0.028,
             depth=0.44, vertices=6)
    r.parent = lad
lad.rotation_mode = 'XYZ'
lad.location = (-0.05, 0.2, LVL - 0.1)
lad.rotation_euler = (0, 0.32, 0)
pop(lad, 29.4, s=(1, 1, 1), dur=0.25)
key(lad, 'location', 30.9, (-0.05, 0.2, LVL - 0.1))
key(lad, 'rotation_euler', 30.9, (0, 0.32, 0))
key(lad, 'location', 31.4, (0.3, 0.9, LVL + FLOOR_Z + 0.05))
key(lad, 'rotation_euler', 31.4, (0, math.pi / 2, 0))

# ---------------------------------------------------------------- lluvia y sol
def rain(t0, t1, x0, x1, z_top, z_bot, n=40, tag='a'):
    for k in range(n):
        r = prim('cylinder', f'lluvia_{tag}{k}', (0, 0, 0), m=M['rain'], radius=0.012, depth=0.35, vertices=4)
        x = random.uniform(x0, x1)
        y = random.uniform(-0.3, 3.0)
        key(r, 'scale', 0, Z, 'CONSTANT')
        t = t0 + random.uniform(0, 0.5)
        while t < t1:
            key(r, 'scale', t, Z, 'CONSTANT')
            key(r, 'location', t, (x, y, z_top), 'CONSTANT')
            key(r, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
            key(r, 'location', t + 0.45, (x - 0.15, y, z_bot), 'LINEAR')
            key(r, 'scale', t + 0.45, Z, 'CONSTANT')
            t += 0.5


rain(4.3, 7.8, -12, 6, 6.0, -0.4, tag='a')
rain(32.0, 34.3, -1.5, 4.5, 7.0, LVL + FLOOR_Z + 1.0, n=30, tag='b')
rain(36.6, 38.6, -1.5, 4.5, 7.5, LVL + FLOOR_Z + 1.5, n=30, tag='c')
# gotas que escurren por el techo empinado (37.2 - 38.6)
for k in range(6):
    d = prim('uv_sphere', f'escurre{k}', (0, 0, 0), m=M['drop'], radius=0.05, segments=8, ring_count=6)
    side = -1 if k % 2 else 1
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 37.0 + 0.12 * k
    while t < 38.5:
        key(d, 'scale', t, Z, 'CONSTANT')
        key(d, 'location', t, (1.5 + side * 0.2, 1.5, LVL + FLOOR_Z + WALL_H + 1.8), 'CONSTANT')
        key(d, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t + 0.45, (1.5 + side * 1.65, 1.5, LVL + FLOOR_Z + WALL_H + 0.05), 'LINEAR')
        key(d, 'location', t + 0.8, (1.5 + side * 1.9, 1.5, LVL + 0.05), 'LINEAR')
        key(d, 'scale', t + 0.8, Z, 'CONSTANT')
        t += 0.85

# ---------------------------------------------------------------- piso con rendijas: aire sube, agua baja (38.6 - 46)
outline('contorno_piso', rect_xz(1.5 + HX0 - 0.1, 1.5 + HX1 + 0.1, LVL + FLOOR_Z - 0.3, LVL + FLOOR_Z + 0.12, 0.2), M['orange'],
        (1.5, 0.2, LVL + FLOOR_Z - 0.1), 38.9, 41.3)
for k in range(4):
    x = 1.5 - 1.05 + 0.3 * (2 * k) + 0.15
    arrow_run(f'aire{k}', M['air'], (x, 0.2, LVL + FLOOR_Z - 1.2), (x, 0.2, LVL + FLOOR_Z + 0.9), (0, -math.pi / 2, 0),
              41.9, 44.0, period=1.0, phase=0.2 * k, length=0.8)
for k in range(6):
    d = prim('uv_sphere', f'gota_piso{k}', (0, 0, 0), m=M['drop'], radius=0.045, segments=8, ring_count=6)
    x = 1.5 - 1.05 + 0.3 * k + 0.15
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 44.0 + 0.1 * k
    while t < 46.0:
        key(d, 'scale', t, Z, 'CONSTANT')
        key(d, 'location', t, (x, 0.5, LVL + FLOOR_Z + 0.25), 'CONSTANT')
        key(d, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t + 0.6, (x, 0.5, LVL + 0.02), 'LINEAR')
        key(d, 'scale', t + 0.6, Z, 'CONSTANT')
        t += 0.65
puddle = prim('cylinder', 'charco', (1.3, 0.8, LVL + FLOOR_Z + 0.01), scale=(1, 1, 1), m=M['drop'], radius=0.35, depth=0.015,
              vertices=20)
pop(puddle, 43.9, s=(1, 1, 1), dur=0.2)
key(puddle, 'scale', 44.2, (1, 1, 1))
key(puddle, 'scale', 45.4, (0.15, 0.15, 1))
key(puddle, 'scale', 45.5, Z, 'CONSTANT')

# ---------------------------------------------------------------- hamaca, canoa amarrada y garza (46 - 51.3)
ham = prim('uv_sphere', 'hamaca', (1.5, 1.5, LVL + FLOOR_Z + 0.75), scale=(1.0, 0.32, 0.22), m=M['hammock'], radius=1,
           segments=20, ring_count=10)
pop(ham, 46.6, s=(1.0, 0.32, 0.22), dur=0.3)
for k, x in enumerate((0.42, 2.58)):
    c = curve_obj(f'cuerda_hamaca{k}', [(x, 1.5, LVL + FLOOR_Z + 0.78), (1.5 + (x - 1.5) * 1.12, 1.5, LVL + FLOOR_Z + 1.25)],
                  M['plank'], bevel=0.02)
    pop(c, 46.6, s=(1, 1, 1), dur=0.3)
cn2 = canoe('canoa_amarrada')
cn2.location = (-0.6, 0.9, LVL - 0.02)
cn2.rotation_euler = (0, 0, 0.25)
pop(cn2, 47.4, s=(1, 1, 1), dur=0.3)
rope = curve_obj('cuerda_canoa', [(0.3, 0.9, LVL + 0.1), (0.5, 0.6, LVL + 0.5)], M['plank'], bevel=0.02)
pop(rope, 47.8, s=(1, 1, 1), dur=0.2)


def heron():
    root = link(bpy.data.objects.new('garza', None))
    ps = [prim('uv_sphere', 'g_cuerpo', (0, 0, 0.55), scale=(1.5, 0.7, 0.8), m=M['heron'], radius=0.2, segments=16, ring_count=10),
          prim('cylinder', 'g_cuello', (0.22, 0, 0.85), rot=(0, 0.45, 0), m=M['heron'], radius=0.045, depth=0.45, vertices=8),
          prim('uv_sphere', 'g_cabeza', (0.33, 0, 1.08), m=M['heron'], radius=0.08, segments=12, ring_count=8),
          prim('cone', 'g_pico', (0.5, 0, 1.06), rot=(0, math.pi / 2, 0), m=M['beak'], radius1=0.03, depth=0.26, vertices=8),
          prim('uv_sphere', 'g_ala', (-0.05, 0, 0.6), scale=(1.4, 0.75, 0.6), m=M['herond'], radius=0.2, segments=12, ring_count=8),
          prim('uv_sphere', 'g_ojo', (0.38, -0.06, 1.1), m=M['dark'], radius=0.015, segments=6, ring_count=4)]
    for y in (-0.06, 0.06):
        ps.append(prim('cylinder', f'g_pata{y}', (0, y, 0.2), m=M['beak'], radius=0.015, depth=0.4, vertices=6))
    for p in ps:
        p.parent = root
    return root


G = heron()
G.location = (1.5, 1.5, LVL + FLOOR_Z + WALL_H + 1.85)
G.rotation_euler = (0, 0, math.pi)
key(G, 'scale', 0, Z, 'CONSTANT')
key(G, 'location', 0, (5.5, 1.5, LVL + FLOOR_Z + WALL_H + 4.0), 'CONSTANT')
key(G, 'scale', 49.1, (1.3, 1.3, 1.3), 'CONSTANT')
key(G, 'location', 49.1, (5.5, 1.5, LVL + FLOOR_Z + WALL_H + 4.0))
key(G, 'location', 49.8, (1.5, 1.5, LVL + FLOOR_Z + WALL_H + 1.85))

# otros palafitos al final
for k, (x, y) in enumerate(((-4.0, 9.0), (5.5, 11.0), (11.0, 8.0))):
    root = link(bpy.data.objects.new(f'vecino{k}', None))
    ps = [box(f'v_casa{k}', -1, 1, -1, 1, 0, 1.4, m=M['wall']),
          prim('cone', f'v_techo{k}', (0, 0, 2.4), m=M['thatch'], radius1=1.9, depth=2.0, vertices=4, rot=(0, 0, math.pi / 4))]
    for px in (-0.8, 0.8):
        for py in (-0.8, 0.8):
            ps.append(prim('cylinder', f'v_pil{k}{px}{py}', (px, py, -1.4), m=M['pile'], radius=0.09, depth=2.8, vertices=8))
    for p in ps:
        p.parent = root
    root.location = (x, y, LVL + 1.8)
    pop(root, 51.4 + 0.2 * k, s=(1, 1, 1), dur=0.3)

# ---------------------------------------------------------------- luz y cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st in ((0, (0.50, 0.68, 0.92), 0.9), (4.2, (0.50, 0.68, 0.92), 0.9), (4.6, (0.38, 0.44, 0.52), 0.7), (7.6, (0.38, 0.44, 0.52), 0.7),
                 (8.0, (0.50, 0.68, 0.92), 0.9)):
    node_key(bg.inputs['Color'], t, (*c, 1))
    node_key(bg.inputs['Strength'], t, st)
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(6)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(50), 0, math.radians(-30))
for t, e, c in ((0, 3.2, (1.0, 0.96, 0.88)), (4.2, 3.2, (1.0, 0.96, 0.88)), (4.6, 1.0, (0.8, 0.85, 0.95)), (7.6, 1.0, (0.8, 0.85, 0.95)),
                (8.0, 3.2, (1.0, 0.96, 0.88)), (31.4, 3.2, (1.0, 0.96, 0.88)), (31.8, 5.5, (1.0, 0.88, 0.65)),
                (32.1, 1.4, (0.8, 0.85, 0.95)), (34.2, 1.4, (0.8, 0.85, 0.95)), (34.5, 3.2, (1.0, 0.96, 0.88)),
                (36.6, 3.2, (1.0, 0.96, 0.88)), (36.8, 1.6, (0.8, 0.85, 0.95)), (38.5, 1.6, (0.8, 0.85, 0.95)),
                (38.7, 3.2, (1.0, 0.96, 0.88)), (51.0, 3.2, (1.0, 0.96, 0.88)), (53.5, 2.8, (1.0, 0.72, 0.48))):
    key(sun, 'energy', t, e)
    key(sun, 'color', t, c)

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (-6.5, -8.5, 2.0), (-6.5, 0, 0.6), (-6.8, -7.4, 1.8), (-6.8, 0, 0.6)),
    (4.22, (-4.0, -11.0, 1.4), (-4.0, 0, 0.0), (-4.0, -10.4, 1.4), (-4.0, 0, 0.0)),
    (7.8, (1.5, -12.0, 0.6), (1.5, 0, -0.4), (1.5, -11.4, 0.6), (1.5, 0, -0.4)),
    (12.74, (1.5, -10.5, -0.2), (1.5, 0, -1.0), (1.5, -10.0, -0.2), (1.5, 0, -1.0)),
    (16.08, (1.5, -12.0, -0.8), (1.5, 0, -1.4), (1.5, -11.5, -0.8), (1.5, 0, -1.4)),
    (20.48, (1.2, -6.0, -0.1), (1.2, 0, -0.3), (1.4, -5.6, -0.1), (1.4, 0, -0.3)),
    (26.14, (4.0, -9.5, 1.6), (1.5, 0, 0.9), (3.0, -9.0, 1.6), (1.0, 0, 0.9)),
    (31.48, (3.0, -9.5, 4.6), (1.5, 0.8, 3.0), (2.4, -9.0, 4.4), (1.5, 0.8, 3.0)),
    (38.64, (1.5, -4.6, 2.3), (1.5, 1.2, 1.4), (1.5, -4.2, 2.2), (1.5, 1.2, 1.4)),
    (46.1, (2.4, -8.6, 1.8), (1.2, 0.8, 1.0), (2.0, -8.2, 1.8), (1.2, 0.8, 1.0)),
    (49.0, (2.8, -6.8, 5.0), (1.5, 1.4, 4.0), (2.6, -6.4, 4.8), (1.5, 1.4, 4.0)),
    (51.34, (1.5, -11.0, 3.0), (1.5, 2.0, 1.4), (1.5, -24.0, 9.0), (2.0, 5.0, 1.0)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
