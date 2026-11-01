"""Humor 03 — túnel para robarle el wifi al vecino, en corte, sincronizado con el audio.

Uso:
  blender -b -P wifi_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 12] [--calidad 1] [--stills 1,200]
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa
from patio3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/wifi'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 55.4   # audio 54.61 s + cola
NF = int(round(DUR * FPS))
random.seed(57)

clean()
sc = bpy.context.scene
M = materiales()
M.update(
    wood=mat('marco_madera', (0.55, 0.38, 0.22), 0.85),
    rail=mat('riel', (0.35, 0.35, 0.37), 0.4, spec=0.7),
    cart=mat('carrito', (0.65, 0.20, 0.15), 0.6),
    bulb=flat_mat('foco', (1.0, 0.85, 0.5), 8.0),
    cable=mat('cable_red', (0.15, 0.40, 0.85), 0.5),
    router=mat('router', (0.12, 0.12, 0.14), 0.4),
    fanm=mat('ventilador', (0.85, 0.85, 0.85), 0.4),
    wall2=mat('casa_vecino', (0.70, 0.80, 0.88), 0.9),
    cat=mat('gato', (0.90, 0.55, 0.20), 0.8),
    good=flat_mat('wifi_bueno', (0.30, 1.0, 0.45), 3.0),
    bad=flat_mat('wifi_malo', (1.0, 0.25, 0.20), 3.0),
)
ground = terreno(M)
house, wins = casa(M, x=-4.0, ancho=10.0)
house2, wins2 = casa(M, x=17.0, name='vecino', ancho=10.0, color=M['wall2'])
decorado(M, arbol_x=-11.0, barda=False, mesa=False)
bg, sun = cielo_dia(sc)
FX = 8.0   # la barda entre las dos casas
for k in range(14):
    box(f'barda_medio{k}', FX - 0.06, FX + 0.06, 0.3 + 2.0 * k, 2.2 + 2.0 * k, 0, 1.8, m=M['fence'])


def wifi(name, loc, m, n=3):
    root = link(bpy.data.objects.new(name, None))
    for k in range(n):
        r = 0.35 + 0.35 * k
        pts = [(r * math.cos(a), 0, r * math.sin(a)) for a in [math.pi / 4 + (math.pi / 2) * j / 12 for j in range(13)]]
        c = curve_obj(f'{name}_arco{k}', pts, m, bevel=0.07)
        c.parent = root
    dot = prim('uv_sphere', f'{name}_punto', (0, 0, 0), m=m, radius=0.12, segments=10, ring_count=6)
    dot.parent = root
    root.location = loc
    return root


w_good = wifi('wifi_vecino', (17.0, 15.5, 9.8), M['good'])
w_bad = wifi('wifi_mio', (-4.0, 15.5, 9.8), M['bad'], n=1)
key(w_bad, 'scale', 0, (1, 1, 1), 'CONSTANT')
key(w_bad, 'scale', 51.8, Z, 'CONSTANT')
w_mine = wifi('wifi_mio_bueno', (-4.0, 15.5, 9.8), M['good'])
key(w_mine, 'scale', 0, Z, 'CONSTANT')
key(w_mine, 'scale', 51.8, (1, 1, 1), 'CONSTANT')
# plantas del vecino (donde sale la varilla y el router)
BED_X = 16.0
box('jardinera', BED_X - 1.0, BED_X + 1.0, 0.6, 2.6, 0, 0.3, m=M['fence'])
for k in range(5):
    prim('ico_sphere', f'planta_vecino{k}', (BED_X - 0.7 + 0.35 * k, 1.6, 0.6), m=M['leaf'], radius=0.32, subdivisions=2)
    prim('uv_sphere', f'flor_vecino{k}', (BED_X - 0.6 + 0.35 * k, 1.3, 0.85), m=M['flower'], radius=0.09, segments=8, ring_count=6)

# ---------------------------------------------------------------- pozo junto a la barda (2.7 - 3.8) y túnel
SX0, SX1 = 4.6, 6.6
TZ0, TZ1 = -3.2, -1.8          # piso y techo del túnel en el arranque
TX_END = 16.4
SLOPE = math.atan2(0.45, TX_END - SX1)   # sube hacia el vecino
excavar(ground, M, 'pozo', SX0, SX1, -1.5, 2.5, TZ0, 0.2, 2.7, 3.9)
tun = excavar(ground, M, 'tunel', SX1 - 0.2, TX_END, -1.5, 2.5, TZ0, TZ1, 5.9, 6.0, axis='x', anchor=SX1 - 0.2)
tun.rotation_euler = (0, -SLOPE, 0)
fc_scale = 'scale'
L = TX_END - (SX1 - 0.2)
for t, x in ((6.0, 1.4), (8.4, 1.4), (12.0, 4.4), (19.2, 4.4), (21.4, 7.4), (28.6, 7.4), (32.0, L)):
    key(tun, 'scale', t, (x / L, 1, 1))


def floor_at(x):
    return TZ0 + (x - (SX1 - 0.2)) * math.tan(SLOPE)


# ---------------------------------------------------------------- personas
P = person('yo', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
pose(P, 0, (2.5, 3.0, 0), (0, 0, -1.5))
pose(P, 2.5, (5.6, 1.2, 0), (0, 0, -1.5), 'BEZIER')
for k in range(3):
    pose(P, 2.8 + 0.35 * k, (5.6, 1.2, TZ0 * (k + 1) / 3), (0.3 * (k % 2), 0, -1.5), 'BEZIER')


def dig_to(t, x, t_end=None):
    pose(P, t, (x, 1.2, floor_at(x)), (0.35, 0, -1.5), 'BEZIER')


dig_to(6.0, 7.2)
pose(P, 7.6, (7.4, 1.2, floor_at(7.4)), (0.35, 0, -1.5), 'BEZIER')
pose(P, 8.2, (7.2, 1.2, floor_at(7.2) - 0.1), (-0.3, 0, -1.5), 'BEZIER')   # le cae tierra
dig_to(12.0, 10.4)
dig_to(19.2, 10.4)
dig_to(21.4, 13.4)
dig_to(28.6, 13.4)
dig_to(32.0, 15.8)
pose(P, 33.0, (15.8, 1.2, floor_at(15.8)), (0, 0, -0.2), 'BEZIER')
pose(P, 34.0, (15.8, 1.2, floor_at(15.8)), (0, 0, -2.8), 'BEZIER')
pose(P, 39.3, (15.8, 1.2, floor_at(15.8)), (0, 0, -1.5))
pose(P, 39.4, (5.6, 1.6, floor_at(5.6)), (0, 0, -1.5))
pose(P, 46.2, (5.6, 1.6, floor_at(5.6)), (0, 0, -1.5))
pose(P, 46.3, (2.8, -0.4, 0), (0, 0, 0.6))
for k in range(10):   # tierra que se le cae en la cabeza (7.5 - 8.3)
    ch = prim('ico_sphere', f'derrumbe{k}', (0, 0, 0), m=M['soil'], radius=0.1, subdivisions=1)
    x = 7.0 + random.uniform(-0.3, 0.6)
    pop(ch, 7.4 + 0.04 * k, 8.6, s=(1, 1, 1), dur=0.05)
    key(ch, 'location', 7.4 + 0.04 * k, (x, random.uniform(0.6, 1.8), TZ1 - 0.05))
    key(ch, 'location', 8.2, (x, random.uniform(0.6, 1.8), floor_at(x) + 0.08), 'LINEAR')

# ---------------------------------------------------------------- ademe: marcos de madera cada medio metro (9 - 12, y siguiendo al túnel)
frames = []
x = SX1 + 0.2
k = 0
while x < TX_END - 0.2:
    fz = floor_at(x)
    h = TZ1 - TZ0
    parts = [box(f'ademe_poste_a{k}', x - 0.07, x + 0.07, 0.0, 0.15, fz, fz + h, m=M['wood']),
             box(f'ademe_poste_b{k}', x - 0.07, x + 0.07, 2.25, 2.4, fz, fz + h, m=M['wood']),
             box(f'ademe_viga{k}', x - 0.07, x + 0.07, 0.0, 2.4, fz + h - 0.14, fz + h, m=M['wood'])]
    t_frame = 9.1 + 2.9 * (x - SX1) / 3.8 if x < 10.4 else (19.4 + 2.0 * (x - 10.4) / 3.0 if x < 13.4 else 29.0 + 3.0 * (x - 13.4) / 3.0)
    for p in parts:
        pop(p, t_frame, s=(1, 1, 1), dur=0.12)
    frames.append((x, fz, h))
    x += 0.5
    k += 1
outline('contorno_ademe', rect_xz(SX1 + 0.05, SX1 + 1.4, TZ0 - 0.1, TZ1 + 0.1, -0.1), M['orange'], (SX1 + 0.7, -0.1, -2.5), 12.8, 13.8)
# oscurísimo (13.8 - 16.6) y focos (16.7 - 18.6)
for t, c, st, e in ((0, (0.80, 0.86, 0.95), 1.0, 3.6), (13.75, (0.80, 0.86, 0.95), 1.0, 3.6), (13.8, (0.10, 0.12, 0.20), 0.25, 0.25),
                    (16.6, (0.10, 0.12, 0.20), 0.25, 0.25), (16.65, (0.80, 0.86, 0.95), 1.0, 3.6)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT')
    key(sun, 'energy', t, e, 'CONSTANT')
cable_pts = [(SX0 + 0.5, 1.2, 0.3), (SX0 + 0.5, 1.2, TZ1 - 0.25)] + [(xx, 1.2, fz + h - 0.25) for xx, fz, h in frames[::2]]
ext = curve_obj('extension', cable_pts, M['dark'], bevel=0.02)
pop(ext, 16.7, s=(1, 1, 1), dur=0.3)
for j, (xx, fz, h) in enumerate(frames[1::3]):
    b = prim('uv_sphere', f'foco{j}', (xx, 1.2, fz + h - 0.4), m=M['bulb'], radius=0.09, segments=10, ring_count=6)
    t_on = 16.9 + 0.12 * j if xx < 10.6 else (21.5 if xx < 13.5 else 32.0)
    pop(b, t_on, s=(1, 1, 1), dur=0.1)

# ---------------------------------------------------------------- manguera con ventilador (22 - 25.9)
fan = link(bpy.data.objects.new('ventilador', None))
fb = box('vent_caja', -0.35, 0.35, -0.35, 0.35, 0, 0.7, m=M['fanm'])
fb.parent = fan
blades = prim('cylinder', 'vent_aspas', (0, -0.36, 0.35), rot=(math.pi / 2, 0, 0), m=M['dark'], radius=0.28, depth=0.03, vertices=6)
blades.parent = fan
fan.location = (3.6, 1.2, 0)
pop(fan, 22.4, s=(1, 1, 1), dur=0.25)
hose_pts = [(3.6, 1.6, 0.35), (SX0 + 0.3, 1.8, 0.2), (SX0 + 0.3, 1.8, TZ0 + 0.3)] + [(xx, 1.8, fz + 0.3) for xx, fz, h in frames[:16:3]]
hose = curve_obj('manguera_aire', hose_pts, M['hose'], bevel=0.08)
hose.data.bevel_factor_mapping_end = 'SPLINE'
key(hose.data, 'bevel_factor_end', 0, 0.0, 'CONSTANT')
key(hose.data, 'bevel_factor_end', 22.6, 0.0)
key(hose.data, 'bevel_factor_end', 23.8, 1.0)
for j in range(8):
    key(blades, 'rotation_euler', 23.8 + 0.25 * j, (math.pi / 2, 0, j * 1.3))
arrow_run('aire_tunel', M['cold'], (SX1 + 0.3, -0.1, floor_at(SX1) + 0.7), (12.8, -0.1, floor_at(12.8) + 0.7), (0, -SLOPE, 0), 23.9, 25.9,
          period=1.0, length=1.0)

# ---------------------------------------------------------------- rieles y carrito (29 - 32)
for s in (0.8, 1.6):
    r = prim('cylinder', f'riel{s}', ((SX0 + TX_END) / 2, s, 0), rot=(0, math.pi / 2 - SLOPE, 0), m=M['rail'], radius=0.03,
             depth=TX_END - SX0 - 0.4, vertices=6)
    r.location = ((SX0 + 0.3 + TX_END - 0.3) / 2, s, floor_at((SX0 + TX_END) / 2) + 0.05)
    pop(r, 29.4, s=(1, 1, 1), dur=0.25)
cart = link(bpy.data.objects.new('carrito', None))
cb = box('carrito_caja', -0.45, 0.45, -0.4, 0.4, 0.15, 0.6, m=M['cart'])
cd = prim('uv_sphere', 'carrito_tierra', (0, 0, 0.6), scale=(1.4, 1.2, 0.45), m=M['soil'], radius=0.32, segments=12, ring_count=6)
for p in (cb, cd):
    p.parent = cart
cart.rotation_euler = (0, -SLOPE, 0)
key(cart, 'scale', 0, Z, 'CONSTANT')
key(cart, 'scale', 29.6, (1, 1, 1), 'CONSTANT')
for t, x in ((29.6, 13.0), (30.6, SX0 + 1.0), (31.2, SX0 + 1.0), (32.2, 15.0)):
    key(cart, 'location', t, (x, 1.2, floor_at(x) + 0.05))
rope = curve_obj('cuerda_carrito', [(SX0 + 0.6, 1.2, TZ0 + 0.9), (SX0 + 0.6, 1.2, 0.3)], M['rope'] if 'rope' in M else M['fence'], bevel=0.02)
pop(rope, 29.6, s=(1, 1, 1), dur=0.2)

# ---------------------------------------------------------------- la varilla sale entre las plantas (36.4 - 38.8)
rod = prim('cylinder', 'varilla', (0, 0, 0), m=M['metal'], radius=0.035, depth=1.0, vertices=8)
for v in rod.data.vertices:
    v.co.z += 0.5
rod.location = (BED_X, 1.6, floor_at(15.8) + 1.3)
key(rod, 'scale', 0, Z, 'CONSTANT')
key(rod, 'scale', 36.4, (1, 1, 0.1), 'CONSTANT')
key(rod, 'scale', 38.6, (1, 1, -floor_at(15.8) - 1.3 + 1.2))
pose(P, 36.3, (15.8, 1.2, floor_at(15.8)), (0, 0, -1.5))

# ---------------------------------------------------------------- el túnel sube: el agua escurre hacia tu lado (40 - 46)
x0f, x1f = SX1, TX_END - 0.2
outline('contorno_pendiente', [(x0f, -0.12, floor_at(x0f) + 0.08), (x1f, -0.12, floor_at(x1f) + 0.08)], M['orange'],
        ((x0f + x1f) / 2, -0.12, floor_at((x0f + x1f) / 2)), 40.0, 42.0, cyclic=False)
lluvia(M, 'b', 42.2, 46.2, x0=4, x1=20, y0=-1.0, y1=4.0, n=50)
for k in range(10):
    d = prim('uv_sphere', f'escurre{k}', (0, 0, 0), m=M['water'], radius=0.08, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 42.8 + 0.3 * k
    while t + 2.0 < 46.4:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, (TX_END - 0.4, 1.2 + 0.2 * (k % 3), floor_at(TX_END - 0.4) + 0.06), 'CONSTANT')
        key(d, 'location', t + 2.0, (SX0 + 0.5, 1.2 + 0.2 * (k % 3), floor_at(SX0 + 0.5) + 0.06), 'LINEAR')
        key(d, 'scale', t + 2.0, Z, 'CONSTANT')
        t += 2.05
pud = box('charco_pozo', SX0 + 0.05, SX1 - 0.05, 0.0, 2.4, TZ0, TZ0 + 0.12, m=M['water'])
pop(pud, 44.6, s=(1, 1, 1), dur=0.6)

# ---------------------------------------------------------------- cable de red, router en la maceta y el gato (46.3 - 52)
lan = curve_obj('cable_red', [(-1.0, 15.0, 0.6), (2.0, 6.0, 0.05), (SX0 + 0.2, 0.6, 0.05), (SX0 + 0.2, 0.6, TZ0 + 0.1)] +
                [(xx, 0.6, fz + 0.1) for xx, fz, h in frames[::4]] + [(BED_X, 0.9, floor_at(BED_X) + 0.2), (BED_X, 0.9, 0.5)], M['cable'],
                bevel=0.03)
lan.data.bevel_factor_mapping_end = 'SPLINE'
key(lan.data, 'bevel_factor_end', 0, 0.0, 'CONSTANT')
key(lan.data, 'bevel_factor_end', 46.6, 0.0)
key(lan.data, 'bevel_factor_end', 47.6, 1.0)
rt = link(bpy.data.objects.new('router', None))
pot = prim('cylinder', 'maceta_router', (0, 0, 0.25), m=M['pot'], radius=0.32, depth=0.5, vertices=16)
rb = box('router_caja', -0.22, 0.22, -0.14, 0.14, 0.5, 0.62, m=M['router'])
parts = [pot, rb]
for s in (-0.15, 0.15):
    parts.append(prim('cylinder', f'antena{s}', (s, 0.1, 0.85), m=M['router'], radius=0.015, depth=0.45, vertices=6))
parts.append(prim('uv_sphere', 'led', (0.1, -0.15, 0.56), m=M['good'], radius=0.02, segments=6, ring_count=4))
for p in parts:
    p.parent = rt
rt.location = (BED_X - 1.4, 1.0, 0)
pop(rt, 47.6, s=(1.2, 1.2, 1.2), dur=0.3)


def cat(name):
    root = link(bpy.data.objects.new(name, None))
    ps = [prim('uv_sphere', name + '_c', (0, 0, 0.12), scale=(1.5, 1.0, 0.7), m=M['cat'], radius=0.14, segments=12, ring_count=8),
          prim('uv_sphere', name + '_h', (0.18, -0.02, 0.16), m=M['cat'], radius=0.09, segments=12, ring_count=8),
          prim('cone', name + '_o1', (0.18, -0.07, 0.25), m=M['cat'], radius1=0.035, depth=0.07, vertices=6),
          prim('cone', name + '_o2', (0.18, 0.03, 0.25), m=M['cat'], radius1=0.035, depth=0.07, vertices=6),
          prim('torus', name + '_cola', (-0.12, 0.05, 0.05), m=M['cat'], major_radius=0.14, minor_radius=0.025, major_segments=16,
               minor_segments=6)]
    for p in ps:
        p.parent = root
    return root


C = cat('gato_vecino')
C.location = (11.5, 1.3, floor_at(11.5))
pop(C, 49.4, s=(2.2, 2.2, 2.2), dur=0.3)

# ---------------------------------------------------------------- cámara
MID = (SX0 + TX_END) / 2
camera_shots([
    (0.0, (6.0, -16.0, 9.0), (6.0, 12.0, 4.0), (6.0, -15.0, 8.0), (6.0, 10.0, 3.0)),
    (2.5, (8.5, -9.0, 1.5), (5.6, 1.0, -1.2), (8.2, -8.6, 1.4), (5.8, 1.0, -1.4)),
    (8.6, (10.0, -8.5, 0.0), (8.6, 1.0, -2.4), (11.0, -8.5, 0.0), (9.6, 1.0, -2.4)),
    (15.8, (10.0, -9.5, 0.5), (8.6, 1.0, -2.2), (10.5, -9.0, 0.3), (9.0, 1.0, -2.2)),
    (19.1, (MID, -14.5, 2.0), (MID, 1.0, -1.8), (MID, -14.0, 1.8), (MID, 1.0, -1.8)),
    (25.9, (MID + 1.0, -13.0, 1.0), (MID + 1.0, 1.0, -2.0), (MID + 1.0, -12.5, 0.8), (MID + 1.0, 1.0, -2.0)),
    (32.24, (16.5, -6.5, 0.5), (15.6, 1.0, -1.5), (16.3, -6.2, 0.6), (15.8, 1.0, -1.0)),
    (39.38, (MID, -15.0, 1.5), (MID, 1.0, -1.8), (MID, -14.5, 1.4), (MID, 1.0, -1.8)),
    (46.26, (13.5, -6.5, 3.0), (BED_X - 1.0, 1.0, 0.2), (13.2, -6.2, 2.8), (BED_X - 1.0, 1.0, 0.0)),
    (49.2, (12.5, -6.0, -0.6), (11.5, 1.0, -2.6), (12.3, -5.7, -0.7), (11.5, 1.0, -2.6)),
    (51.9, (6.0, -16.0, 6.0), (6.0, 8.0, 2.0), (6.0, -28.0, 12.0), (6.0, 10.0, 4.0)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
