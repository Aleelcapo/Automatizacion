"""Humor 01 — refugio antisuegra: búnker bajo el patio, en corte, sincronizado con el audio.

Uso:
  blender -b -P suegra_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 14] [--calidad 1] [--stills 1,200]
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa
from patio3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/suegra'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 60.2   # audio 59.35 s + cola
NF = int(round(DUR * FPS))
random.seed(51)

clean()
sc = bpy.context.scene
M = materiales()
M.update(
    wood=mat('tabla_madera', (0.55, 0.38, 0.22), 0.85),
    concrete=mat('bloque_concreto', (0.62, 0.62, 0.60), 0.9),
    slab=mat('losa_concreto', (0.55, 0.55, 0.53), 0.9),
    mud=mat('lodo_charco', (0.30, 0.20, 0.12), 0.3),
    foam=mat('espuma_acustica', (0.20, 0.20, 0.24), 0.95),
    carpet=mat('alfombra_roja', (0.65, 0.12, 0.12), 0.95),
    leather=mat('sillon_piel', (0.45, 0.25, 0.12), 0.6),
    fridge=mat('nevera', (0.92, 0.92, 0.94), 0.3),
    pipe=mat('tubo_pvc', (0.85, 0.85, 0.82), 0.4),
    pump=mat('bomba_azul', (0.15, 0.35, 0.70), 0.4),
    rot=mat('moho', (0.25, 0.32, 0.15), 0.9),
    case=mat('maleta', (0.75, 0.20, 0.25), 0.6),
)
ground = terreno(M)
house, wins = casa(M)
decorado(M)
bg, sun = cielo_dia(sc)

# hoyo (2.1 - 3.9), más hondo (7.2 - 8.2), pozo en la esquina (21.6 - 22.4)
HX = 2.6
excavar(ground, M, 'hoyo', -HX, HX, -1.5, 4.2, -1.3, 0.2, 2.1, 3.9)
excavar(ground, M, 'hoyo_hondo', -HX, HX, -1.5, 4.2, -3.6, -1.2, 7.2, 8.2)
excavar(ground, M, 'pozo', 1.4, 2.3, -0.5, 1.2, -4.4, -3.5, 21.6, 22.4)
FLOOR = -3.4

# ---------------------------------------------------------------- personas
P = person('yerno', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
S = suegra(M)
S.rotation_mode = 'XYZ'
case = box('maleta', -0.25, 0.25, -0.12, 0.12, 0, 0.6, m=M['case'])
case.parent = S
case.location = (0.4, 0, 0.0)
pose(S, 0, (0.0, 14.5, 0), (0, 0, 0))
pose(S, 0.3, (0.0, 15.6, 0), (0, 0, 0))
pose(S, 1.6, (-1.5, 12.0, 0.08), (0, 0, 0), 'BEZIER')
pose(S, 4.5, (-1.5, 12.0, 0.08), (0, 0, 0))
pose(S, 4.6, (0, 0, 60))
# la suegra en la ventana de la cocina (34 - 36.4) y revisando el patio (46.4 - 50.2)
wx, wz = wins[0]
kitchen_glass = bpy.data.objects['casa_vidrio00']
pose(S, 33.9, (wx, 15.55, 0.08), (0, 0, math.pi))
pose(S, 36.3, (wx, 15.55, 0.08), (0, 0, math.pi))
pose(S, 36.4, (0, 0, 60))
key(case, 'scale', 0, (1, 1, 1), 'CONSTANT')
key(case, 'scale', 4.6, Z, 'CONSTANT')
pose(S, 46.4, (5.5, 12.0, 0.0), (0, 0, 2.6))
pose(S, 47.4, (3.7, 12.6, 0.0), (0.4, 0, 2.6), 'BEZIER')      # revisa debajo de la mesa
pose(S, 48.4, (8.6, 11.6, 0.0), (0, 0, 1.2), 'BEZIER')        # detrás del árbol
pose(S, 49.6, (-1.0, 6.5, 0.0), (0, 0, 2.9), 'BEZIER')        # pasa junto a la casita sin mirar
pose(S, 50.1, (-1.0, 6.5, 0.0), (0, 0, 2.9))
pose(S, 50.2, (0, 0, 60))

pose(P, 0, (3.5, 5.0, 0), (0, 0, 2.6))
pose(P, 2.0, (0.5, 1.5, 0), (0, 0, 2.6), 'BEZIER')
for k in range(4):
    pose(P, 2.3 + 0.4 * k, (0.5, 1.5, -1.25 * (k + 1) / 4 - 0.08 * (k % 2)), (0.3 * (k % 2), 0, 2.6), 'BEZIER')
pose(P, 4.5, (0.5, 1.5, -1.3), (0, 0, 2.6))
pose(P, 4.6, (3.5, 1.8, 0), (0, 0, 2.6))       # sale corriendo de la lluvia
pose(P, 7.0, (3.5, 1.8, 0), (0, 0, 2.6))
pose(P, 7.1, (0.0, 1.5, -1.3), (0, 0, 2.6))
for k in range(4):
    pose(P, 7.3 + 0.25 * k, (0.0, 1.5, -1.3 - 2.1 * (k + 1) / 4), (0.3 * (k % 2), 0, 2.6), 'BEZIER')
pose(P, 8.3, (0.0, 1.5, FLOOR), (0, 0, 2.6))
pose(P, 33.6, (0.0, 1.5, FLOOR), (0, 0, 2.6))
pose(P, 33.7, (-1.4, 1.6, FLOOR), (0, 0, 2.3))
pose(P, 50.6, (-1.4, 1.6, FLOOR), (0, 0, 2.3))
pose(P, 50.7, (-0.6, 2.4, FLOOR + 0.35), (0, 0, 0.0), s=(1, 1, 0.82))   # sentado en el sillón

# ---------------------------------------------------------------- lluvia y lodo (4.6 - 6.7)
lluvia(M, 'a', 4.6, 6.8)
mud = box('lodo', -HX + 0.02, HX - 0.02, -0.02, 4.1, -1.28, -0.4, m=M['mud'], origin=(0, 2.0, -1.28))
key(mud, 'scale', 0, Z, 'CONSTANT')
key(mud, 'scale', 5.4, (1, 1, 0.05))
key(mud, 'scale', 6.6, (1, 1, 1))
key(mud, 'scale', 7.15, Z, 'CONSTANT')
bg_c = bg.inputs['Color']
for t, c, st, e in ((0, (0.80, 0.86, 0.95), 1.0, 3.6), (4.55, (0.80, 0.86, 0.95), 1.0, 3.6), (4.6, (0.50, 0.53, 0.58), 0.7, 1.2),
                    (6.75, (0.50, 0.53, 0.58), 0.7, 1.2), (6.8, (0.80, 0.86, 0.95), 1.0, 3.6)):
    node_key(bg_c, t, (*c, 1), 'CONSTANT')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT')
    key(sun, 'energy', t, e, 'CONSTANT')

# ---------------------------------------------------------------- paredes de madera (8.5) que se pudren (11.9)
planks = []
for k in range(9):
    x = -HX + 0.3 + 0.6 * k
    planks.append(box(f'tabla_atras{k}', x - 0.28, x + 0.28, 3.85, 4.0, FLOOR, -0.05, m=M['wood']))
for s in (-1, 1):
    for k in range(6):
        y = 0.35 + 0.65 * k
        planks.append(box(f'tabla_lado{s}{k}', s * (HX - 0.15) - 0.07, s * (HX - 0.15) + 0.07, y - 0.3, y + 0.3, FLOOR, -0.05, m=M['wood']))
for k, o in enumerate(planks):
    pop(o, 8.5 + 0.04 * k, 14.4, s=(1, 1, 1), dur=0.15)
pw = M['wood'].node_tree.nodes['Principled BSDF']
node_key(pw.inputs['Base Color'], 0, (0.55, 0.38, 0.22, 1))
node_key(pw.inputs['Base Color'], 11.9, (0.55, 0.38, 0.22, 1))
node_key(pw.inputs['Base Color'], 12.9, (0.20, 0.24, 0.12, 1))
for k in range(12):
    f = prim('uv_sphere', f'hongo{k}', (random.uniform(-2.2, 2.2), 3.8, random.uniform(FLOOR + 0.3, -0.5)), scale=(1, 0.5, 0.6),
             m=M['rot'], radius=0.12, segments=8, ring_count=6)
    pop(f, 12.0 + 0.06 * k, 14.4, s=(1, 0.5, 0.6), dur=0.15)

# ---------------------------------------------------------------- bloques de concreto (14.5) y losa (16.3)
blocks = []
rows = 8
for r in range(rows):
    z0 = FLOOR + r * 0.42
    for k in range(7):
        x = -HX + 0.05 + 0.75 * k + (0.37 if r % 2 else 0)
        if x + 0.7 > HX:
            continue
        blocks.append(box(f'bloque_atras{r}_{k}', x, x + 0.7, 3.75, 4.15, z0, z0 + 0.38, m=M['concrete']))
    for s in (-1, 1):
        blocks.append(box(f'bloque_lado{s}{r}', s * HX - 0.25 if s > 0 else -HX, s * HX if s > 0 else -HX + 0.25, 0.0, 4.15, z0,
                          z0 + 0.38, m=M['concrete']))
for k, o in enumerate(blocks):
    pop(o, 14.5 + 1.0 * k / len(blocks), s=(1, 1, 1), dur=0.12)
floor = box('piso_concreto', -HX, HX, 0.0, 4.15, FLOOR - 0.2, FLOOR, m=M['slab'])
pop(floor, 14.4, s=(1, 1, 1), dur=0.2)
slab_parts = [box('losa_a', -HX - 0.3, HX + 0.3, 0.0, 4.4, -0.3, 0.02, m=M['slab'])]
hatch = box('escotilla', -2.2, -1.4, 1.6, 2.4, 0.02, 0.08, m=M['metal'])
for o in slab_parts:
    L0 = tuple(o.location)
    key(o, 'location', 0, (L0[0], L0[1], L0[2] + 3.0), 'CONSTANT')
    key(o, 'location', 16.2, (L0[0], L0[1], L0[2] + 3.0))
    key(o, 'location', 16.8, L0)
    pop(o, 16.2, s=(1, 1, 1), dur=0.2)
pop(hatch, 16.8, s=(1, 1, 1), dur=0.2)
ladder = link(bpy.data.objects.new('escalera', None))
for s in (-0.3, 0.3):
    r = prim('cylinder', f'esc_lado{s}', (s, 0, (FLOOR - 0.0) / 2), m=M['metal'], radius=0.03, depth=-FLOOR, vertices=6)
    r.parent = ladder
for j in range(7):
    r = prim('cylinder', f'esc_pelda{j}', (0, 0, FLOOR + 0.4 + 0.42 * j), rot=(0, math.pi / 2, 0), m=M['metal'], radius=0.025, depth=0.6,
             vertices=6)
    r.parent = ladder
ladder.location = (-1.8, 2.0, 0)
pop(ladder, 17.0, s=(1, 1, 1), dur=0.2)
outline('contorno_bunker', rect_xz(-HX - 0.45, HX + 0.45, FLOOR - 0.35, 0.25, -0.12), M['orange'], (0, -0.12, -1.6), 17.1, 18.5)

# ---------------------------------------------------------------- filtración (19.4 - 20.7), pozo y bomba (21.5 - 24.3)
for k in range(14):
    d = prim('uv_sphere', f'filtra{k}', (0, 0, 0), m=M['water'], radius=0.06, segments=8, ring_count=6)
    x = random.uniform(-2.2, 2.2)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 19.4 + 0.1 * k
    while t < 21.4:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, (x, random.uniform(0.3, 3.5), FLOOR - 0.15), 'CONSTANT')
        key(d, 'location', t + 0.6, (x, random.uniform(0.3, 3.5), FLOOR + 0.05), 'LINEAR')
        t += 0.65
    key(d, 'scale', 21.45, Z, 'CONSTANT')
puddle = box('charco', -2.0, 2.0, 0.3, 3.6, FLOOR, FLOOR + 0.04, m=M['water'])
pop(puddle, 19.8, 23.6, s=(1, 1, 1), dur=0.6)
key(puddle, 'scale', 22.8, (1, 1, 1))
key(puddle, 'scale', 23.5, (0.2, 0.2, 1))
pump = box('bomba', 1.55, 2.15, 0.2, 0.8, FLOOR - 0.9, FLOOR - 0.4, m=M['pump'])
pipe = curve_obj('tubo_bomba', [(1.85, 0.5, FLOOR - 0.4), (1.85, 0.5, -0.4), (1.85, 0.5, 0.15), (3.6, 0.5, 0.15), (4.6, 1.5, 0.1)], M['pipe'],
                 bevel=0.06)
pop(pump, 22.9, s=(1, 1, 1), dur=0.2)
pop(pipe, 23.0, s=(1, 1, 1), dur=0.3)
for k in range(6):
    d = prim('uv_sphere', f'bombeo{k}', (0, 0, 0), m=M['water'], radius=0.07, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 23.3 + 0.15 * k
    while t < 24.4:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, (1.85, 0.4, FLOOR - 0.4), 'CONSTANT')
        key(d, 'location', t + 0.4, (1.85, 0.4, 0.15), 'LINEAR')
        key(d, 'location', t + 0.8, (4.6, 1.4, 0.15), 'LINEAR')
        key(d, 'scale', t + 0.8, Z, 'CONSTANT')
        t += 0.85

# ---------------------------------------------------------------- olor a calcetín (25.2 - 27.4) y ventilación (28 - 33.6)
for k in range(8):
    w = prim('torus', f'olor{k}', (random.uniform(-2.0, 2.0), 0.4, FLOOR + random.uniform(0.6, 2.2)), rot=(math.pi / 2, 0, 0), m=M['stink'],
             major_radius=0.18, minor_radius=0.03, major_segments=16, minor_segments=6)
    pop(w, 25.2 + 0.1 * k, 27.4, s=(1, 1, 1), dur=0.2)
    key(w, 'location', 25.4 + 0.1 * k, tuple(w.location))
    key(w, 'location', 27.3, (w.location[0], w.location[1], w.location[2] + 0.8), 'LINEAR')
for k, x in enumerate((-0.6, 1.0)):
    tube = curve_obj(f'tubo_vent{k}', [(x, 3.3, -0.3), (x, 3.3, 1.2), (x + 0.35, 3.3, 1.45)], M['pipe'], bevel=0.09)
    pop(tube, 28.0 + 0.3 * k, s=(1, 1, 1), dur=0.25)
arrow_run('aire_entra', M['cold'], (-0.6, 3.0, 1.4), (-0.6, 3.0, FLOOR + 0.8), (0, math.pi / 2, 0), 29.0, 33.6, period=1.0, length=1.0)
arrow_run('aire_sale', M['stink'], (1.0, 3.0, FLOOR + 0.8), (1.0, 3.0, 1.6), (0, -math.pi / 2, 0), 30.2, 33.6, period=1.0, length=1.0)
outline('contorno_vent', rect_xz(-1.1, 1.6, -0.4, 1.8, 3.0), M['orange'], (0.25, 3.0, 0.7), 32.0, 33.6)

# ---------------------------------------------------------------- la casita del perro tapa la entrada (37.8)
dh = casita_perro(M, (-1.8, 2.0, 0.08))
key(dh, 'scale', 0, Z, 'CONSTANT')
key(dh, 'location', 0, (-1.8, 2.0, 2.5), 'CONSTANT')
key(dh, 'scale', 37.7, (1, 1, 1), 'CONSTANT')
key(dh, 'location', 37.7, (-1.8, 2.0, 2.5))
key(dh, 'location', 38.2, (-1.8, 2.0, 0.08))
outline('contorno_casita', rect_xz(-2.85, -0.75, -0.05, 1.85, 1.2), M['orange'], (-1.8, 1.2, 0.9), 44.5, 46.2)
# la tele se escucha (39.4 - 40.6) y espuma y alfombra (41.4 - 42.8)
ondas(M, 'tele', (0.0, 15.0, 2.0), 39.4, 40.6)
ondas(M, 'tele_abajo', (0.0, 2.0, -1.6), 39.6, 40.6, radio=0.7)
for k in range(14):
    r, c = divmod(k, 7)
    x = -2.2 + 0.68 * c
    fm = box(f'espuma{k}', x - 0.3, x + 0.3, 3.6, 3.74, FLOOR + 0.5 + 1.1 * r, FLOOR + 1.5 + 1.1 * r, m=M['foam'])
    pop(fm, 41.4 + 0.05 * k, s=(1, 1, 1), dur=0.15)
carpet = box('alfombra', -2.2, 2.2, 0.3, 3.4, FLOOR, FLOOR + 0.03, m=M['carpet'])
pop(carpet, 42.6, s=(1, 1, 1), dur=0.25)

# ---------------------------------------------------------------- sillón, mini nevera y el perro sin casa (50.2 - 56)
chair = link(bpy.data.objects.new('sillon', None))
for nm, a in (('asiento', (-0.5, 0.5, -0.45, 0.45, 0.0, 0.45)), ('respaldo', (-0.5, 0.5, 0.3, 0.55, 0.45, 1.2)),
              ('brazo1', (-0.65, -0.5, -0.45, 0.55, 0.0, 0.7)), ('brazo2', (0.5, 0.65, -0.45, 0.55, 0.0, 0.7))):
    b = box(f'sillon_{nm}', *a, m=M['leather'])
    b.parent = chair
chair.location = (-0.6, 2.4, FLOOR)
pop(chair, 50.6, s=(1, 1, 1), dur=0.3)
fridge = box('mini_nevera', 1.3, 2.0, 2.8, 3.5, FLOOR, FLOOR + 0.9, m=M['fridge'])
pop(fridge, 52.1, s=(1, 1, 1), dur=0.3)
D = perro(M)
D.location = (-0.3, 1.4, 0.0)
D.rotation_euler = (0, 0, 2.6)
pop(D, 52.9, s=(1.3, 1.3, 1.1), dur=0.3)
for k in range(5):
    key(D, 'rotation_euler', 53.3 + 0.5 * k, (0, 0.12 if k % 2 else 0.0, 2.6))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (6.5, -6.0, 6.0), (0, 10, 1.0), (5.5, -5.0, 5.2), (0, 8, 0.5)),
    (4.6, (4.5, -10.5, 2.5), (0, 1.5, -0.6), (4.0, -10.0, 2.4), (0, 1.5, -0.6)),
    (6.7, (5.0, -11.5, 2.0), (0, 1.5, -1.8), (4.5, -11.0, 1.8), (0, 1.5, -1.8)),
    (13.2, (5.5, -12.0, 2.5), (0, 1.8, -1.6), (4.8, -11.5, 2.3), (0, 1.8, -1.6)),
    (18.5, (3.0, -8.5, 0.3), (0.5, 1.5, -2.5), (2.6, -8.0, 0.2), (0.6, 1.5, -2.6)),
    (24.5, (5.0, -11.5, 2.5), (0.2, 2.0, -1.2), (4.5, -11.0, 2.3), (0.2, 2.0, -1.0)),
    (33.7, (-2.0, 8.0, 2.4), (wx, 16.0, 1.6), (-2.4, 8.6, 2.3), (wx, 16.0, 1.6)),
    (36.4, (4.0, -9.0, 4.0), (-1.5, 2.0, 0.0), (3.5, -8.6, 3.6), (-1.5, 2.0, 0.0)),
    (38.9, (6.5, -12.0, 4.5), (0, 6.0, 0.5), (5.5, -11.5, 4.0), (0, 4.0, -0.5)),
    (40.6, (4.0, -9.0, 0.5), (0, 2.0, -1.8), (3.5, -8.5, 0.4), (0, 2.0, -1.8)),
    (43.3, (3.5, -6.5, 3.0), (-1.6, 2.0, 0.6), (3.0, -6.0, 2.8), (-1.6, 2.0, 0.6)),
    (46.4, (9.0, -6.0, 7.0), (2.0, 9.0, 0.5), (8.0, -5.5, 6.5), (1.0, 8.0, 0.5)),
    (50.2, (3.5, -8.0, 0.0), (0, 2.0, -2.2), (3.0, -7.5, -0.1), (0, 2.0, -2.2)),
    (52.8, (3.0, -6.5, 2.5), (-0.6, 1.8, -0.2), (2.6, -6.2, 2.3), (-0.6, 1.8, -0.4)),
    (56.0, (5.0, -12.0, 3.5), (0, 3.0, -0.5), (12.0, -26.0, 10.0), (0, 8.0, 0.5)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
