"""Escena 3D de la casa de adobe (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P adobe_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Primero un muro de prueba (lodo, paja, adobes, base de piedra) en x = -8; luego la casa con
patio en el centro; el corte del muro grueso para el giro está montado aparte en x = 30.
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/adobe'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 62.6  # audio 61.79 s + cola
NF = int(round(DUR * FPS))
random.seed(13)

clean()
sc = bpy.context.scene

M = dict(
    ground=mat('desierto', (0.80, 0.64, 0.44), 0.95),
    mud=mat('lodo', (0.40, 0.26, 0.15), 0.9),
    wet=mat('lodo_mojado', (0.30, 0.19, 0.11), 0.6),
    adobe=mat('adobe', (0.36, 0.23, 0.13), 0.9),
    straw=mat('paja', (0.90, 0.78, 0.40), 0.8),
    wood=mat('madera', (0.45, 0.30, 0.17), 0.8),
    stone=mat('piedra', (0.55, 0.53, 0.50), 0.85),
    crack=mat('grieta', (0.08, 0.05, 0.03), 0.9),
    window=mat('ventana', (0.10, 0.07, 0.05), 0.9),
    cactus=mat('cactus', (0.30, 0.50, 0.25), 0.8),
    leaf=mat('hoja', (0.28, 0.50, 0.20), 0.8),
    pot=mat('maceta', (0.75, 0.38, 0.20), 0.7),
    flower=mat('flor', (0.95, 0.35, 0.45), 0.7),
    cloth=mat('ropa', (0.90, 0.85, 0.72), 0.9),
    sash=mat('faja', (0.80, 0.25, 0.15), 0.8),
    skin=mat('piel', (0.60, 0.40, 0.27), 0.6),
    hair=mat('pelo', (0.06, 0.05, 0.05), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    cat=mat('gato', (0.30, 0.28, 0.28), 0.8),
    frost=mat('escarcha', (0.92, 0.96, 1.0), 0.6),
    rain=flat_mat('lluvia', (0.70, 0.82, 1.0), 1.2),
    water=mat('agua', (0.45, 0.70, 0.95), 0.05, emit=(0.4, 0.65, 0.95), es=1.2),
    sunball=flat_mat('sol_bola', (1.0, 0.85, 0.40), 8.0),
    fire=flat_mat('fuego', (1.0, 0.5, 0.12), 8.0),
    hot=flat_mat('calor', (1.0, 0.45, 0.12), 3.0),
    cold=flat_mat('frio', (0.35, 0.65, 1.0), 3.0),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

box('suelo', -60, 60, -40, 80, -2, 0, m=M['ground'])
for k in range(10):
    x, y = random.uniform(-25, 25), random.uniform(10, 40)
    h = random.uniform(1.2, 2.4)
    prim('cylinder', f'cactus{k}', (x, y, h / 2), m=M['cactus'], radius=0.18, depth=h, vertices=10)
    prim('cylinder', f'cactus_brazo{k}', (x + 0.3, y, h * 0.6), m=M['cactus'], radius=0.12, depth=0.7, vertices=8)
for k in range(5):
    x = random.uniform(-40, 40)
    prim('cone', f'cerro{k}', (x, 60, 3), m=M['ground'], radius1=random.uniform(8, 14), depth=random.uniform(5, 9), vertices=8)


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


P = person('persona', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
WX = -8.0   # muro de prueba
pose(P, 0, (WX + 1.6, -1.2, 0), (0, 0, 0.5))
for k in range(8):
    pose(P, 1.8 + 0.4 * k, (WX + 1.6, -1.2, -0.08 * (k % 2)), (0.3 * (k % 2), 0, 0.5), 'BEZIER')
pose(P, 16.0, (WX + 1.6, -1.2, 0), (0, 0, 0.5))
pose(P, 16.05, (2.6, -0.6, 0), (0, 0, 0.9))
for k in range(5):
    pose(P, 16.6 + 0.35 * k, (2.6, -0.6, -0.08 * (k % 2)), (0.3 * (k % 2), 0, 0.9), 'BEZIER')
pose(P, 21.3, (2.6, -0.6, 0), (0, 0, 0.9))
pose(P, 21.35, (0, 0, 40))

# ---------------------------------------------------------------- 0 - 8.6: muro de lodo que se agrieta y se cae
blobs = []
for k in range(14):
    row, col = divmod(k, 5)
    x = WX - 1.0 + 0.5 * col + 0.25 * (row % 2)
    z = 0.25 + 0.42 * row
    b = prim('uv_sphere', f'bola_lodo{k}', (x, 0, z), scale=(0.34, 0.36, 0.25), m=M['mud'], radius=1, segments=14, ring_count=8)
    pop(b, 2.3 + 0.17 * k, 8.4, s=tuple(b.scale), dur=0.15)
    key(b, 'location', 7.7, (x, 0, z))
    key(b, 'location', 8.3, (x + random.uniform(-0.6, 0.6), random.uniform(-0.5, -0.1), 0.15), 'LINEAR')
    key(b, 'rotation_euler', 7.7, (0, 0, 0))
    key(b, 'rotation_euler', 8.3, (random.uniform(-1, 1), random.uniform(-1, 1), 0))
    blobs.append(b)
for k in range(5):
    c = box(f'grieta{k}', -0.035, 0.035, -0.03, 0.03, -0.35, 0.35, m=M['crack'])
    c.location = (WX - 0.8 + 0.42 * k, -0.43, 0.5 + 0.25 * (k % 3))
    c.rotation_euler = (0, random.uniform(-0.6, 0.6), 0)
    pop(c, 5.8 + 0.15 * k, 7.7, s=(1, 1, 1), dur=0.1)

# ---------------------------------------------------------------- 8.6 - 16: paja y muro grueso que tarda en secar
straws = []
for k in range(30):
    s = prim('cylinder', f'paja{k}', (WX + random.uniform(-1.2, 1.2), random.uniform(-0.5, 0.2), random.uniform(0.1, 1.4)),
             rot=(random.uniform(0, 3), random.uniform(0, 3), 0), m=M['straw'], radius=0.012, depth=0.5, vertices=4)
    pop(s, 9.6 + 0.02 * k, 16.0, s=(1, 1, 1), dur=0.15)
    straws.append(s)
thick = box('muro_grueso', WX - 1.3, WX + 1.3, -0.45, 0.45, 0, 1.6, m=M['wet'], origin=(WX, 0, 0))
key(thick, 'scale', 0, Z, 'CONSTANT')
key(thick, 'scale', 10.4, (1, 1, 0.02))
key(thick, 'scale', 11.8, (1, 1, 1))
key(thick, 'scale', 16.0, (1, 1, 1), 'CONSTANT')
key(thick, 'scale', 16.05, Z, 'CONSTANT')
# sol que da vueltas: pasan los días (12.5 - 15.8)
sunb = prim('uv_sphere', 'sol_cielo', (0, 0, 0), m=M['sunball'], radius=1.4, segments=16, ring_count=8)
key(sunb, 'scale', 0, Z, 'CONSTANT')
t = 12.6
for d in range(4):
    for j in range(7):
        a = math.pi * j / 6
        key(sunb, 'location', t + 0.12 * j, (WX - 14 * math.cos(a), 26, 1 + 10 * math.sin(a)), 'LINEAR')
        key(sunb, 'scale', t + 0.12 * j, (1, 1, 1), 'CONSTANT')
    t += 0.8
key(sunb, 'scale', t, Z, 'CONSTANT')
key(sunb, 'scale', 38.4, (1.6, 1.6, 1.6), 'CONSTANT')
key(sunb, 'location', 38.4, (-6, 22, 16))
key(sunb, 'scale', 40.7, Z, 'CONSTANT')

# ---------------------------------------------------------------- 16 - 21.4: moldes de madera y adobes al sol
bricks = []
for k in range(6):
    i, j = divmod(k, 3)
    x, y = 0.0 + 0.75 * j, -1.2 + 0.5 * i
    fr = box(f'molde{k}', x - 0.34, x + 0.34, y - 0.22, y + 0.22, 0, 0.16, m=M['wood'])
    hole = box(f'molde_hueco{k}', x - 0.28, x + 0.28, y - 0.16, y + 0.16, 0.0, 0.17, m=M['dark'])
    pop(fr, 16.6 + 0.1 * k, 18.6, s=(1, 1, 1), dur=0.2)
    pop(hole, 16.6 + 0.1 * k, 17.6, s=(1, 1, 1), dur=0.2)
    br = box(f'adobe_suelto{k}', x - 0.28, x + 0.28, y - 0.16, y + 0.16, 0, 0.15, m=M['adobe'])
    pop(br, 17.6 + 0.08 * k, 21.4, s=(1, 1, 1), dur=0.15)
    bricks.append(br)
pa = M['adobe'].node_tree.nodes['Principled BSDF']
for t, c in ((0, (0.36, 0.23, 0.13)), (18.9, (0.36, 0.23, 0.13)), (19.8, (0.72, 0.55, 0.36))):
    node_key(pa.inputs['Base Color'], t, (*c, 1))
outline('contorno_adobe', rect_xz(0.75 - 0.36, 0.75 + 0.36, -0.04, 0.22, -1.42), M['orange'], (0.75, -1.42, 0.09), 20.7, 21.4)

# ---------------------------------------------------------------- 21.4 - 29.4: muro de adobes, humedad, base de piedra
wall_b = []
for row in range(7):
    for col in range(6):
        x = -1.6 + 0.6 * col + 0.3 * (row % 2)
        if x > 1.7:
            continue
        b = box(f'muro_adobe_{row}_{col}', x - 0.28, x + 0.28, -0.2, 0.2, 0.17 * row, 0.17 * row + 0.15, m=M['adobe'])
        key(b, 'scale', 0, Z, 'CONSTANT')
        key(b, 'scale', 21.4, (1, 1, 1), 'CONSTANT')
        key(b, 'scale', 29.4, Z, 'CONSTANT')
        base_loc = tuple(b.location)
        key(b, 'location', 0, base_loc, 'CONSTANT')
        key(b, 'location', 26.4, base_loc)
        key(b, 'location', 27.0, (base_loc[0], base_loc[1], base_loc[2] + 0.45))
        if row == 0:  # la humedad deshace la primera hilada
            key(b, 'scale', 24.0, (1, 1, 1))
            key(b, 'scale', 25.3, (0.8, 0.7, 0.55))
            key(b, 'scale', 26.4, (0.8, 0.7, 0.55))
            key(b, 'scale', 27.0, (1, 1, 1))
        wall_b.append(b)
for k in range(5):
    x = -1.3 + 0.65 * k
    arrow_run(f'humedad{k}', M['cold'], (x, -0.3, -0.05), (x, -0.3, 0.6), (0, -math.pi / 2, 0), 22.3, 25.4,
              period=1.0, phase=0.15 * k, length=0.7)
for k in range(7):
    st = prim('ico_sphere', f'piedra_base{k}', (-1.5 + 0.5 * k, 0, 0.22), scale=(0.28, 0.24, 0.22), m=M['stone'], radius=1, subdivisions=1)
    pop(st, 26.8 + 0.06 * k, 29.4, s=tuple(st.scale), dur=0.15)

# ---------------------------------------------------------------- 29.4 en adelante: la casa con patio
HO, HI, WT, WH = 4.2, 2.0, 0.55, 2.6   # semilado exterior, semilado del patio, grosor, altura
house = []


def wall_ring(prefix, h, m, door=False):
    out = []
    specs = [(-h, h, h - WT, h), (-h, -h + WT, -h + WT, h - WT), (h - WT, h, -h + WT, h - WT)]
    if door:
        specs += [(-h, -0.6, -h, -h + WT), (0.6, h, -h, -h + WT)]
    else:
        specs += [(-h, h, -h, -h + WT)]
    for k, (x0, x1, y0, y1) in enumerate(specs):
        o = box(f'{prefix}{k}', x0, x1, y0, y1, 0.45, WH, m=m)
        out.append(o)
    return out


outer = wall_ring('muro_ext', HO, M['adobe'], door=True)
inner = wall_ring('muro_int', HI + WT, M['adobe'])
lintel = box('dintel', -0.6, 0.6, -HO, -HO + WT, 2.0, WH, m=M['adobe'])
found = []
found.append(box('cimiento', -HO - 0.05, HO + 0.05, -HO - 0.05, HO + 0.05, 0, 0.45, m=M['stone']))
roof_parts = []
for k, (x0, x1, y0, y1) in enumerate([(-HO, HO, HI, HO), (-HO, HO, -HO, -HI), (-HO, -HI, -HI, HI), (HI, HO, -HI, HI)]):
    r = box(f'techo{k}', x0, x1, y0, y1, WH, WH + 0.2, m=M['wood'], origin=((x0 + x1) / 2, (y0 + y1) / 2, WH))
    roof_parts.append(r)
for o in outer + inner + [lintel] + found + roof_parts:
    cut(o, 29.4)
# vigas que asoman (aleros) 34.2 - 35.3: el techo se agranda hacia afuera
E = 0.65
for k, (x0, x1, y0, y1) in enumerate([(-HO - E, HO + E, -HO - E, -HO + 0.3), (-HO - E, HO + E, HO - 0.3, HO + E),
                                      (-HO - E, -HO + 0.3, -HO + 0.3, HO - 0.3), (HO - 0.3, HO + E, -HO + 0.3, HO - 0.3)]):
    al = box(f'alero{k}', x0, x1, y0, y1, WH + 0.2, WH + 0.3, m=M['wood'])
    pop(al, 34.2 + 0.15 * k, s=(1, 1, 1), dur=0.25)
for k in range(12):
    side = k // 3
    f = -2.5 + 2.5 * (k % 3)
    pos = [(f, -HO - 0.3), (f, HO + 0.3), (-HO - 0.3, f), (HO + 0.3, f)][side]
    rot = (0, 0, 0 if side < 2 else math.pi / 2)
    v = prim('cylinder', f'viga{k}', (pos[0], pos[1], WH + 0.05), rot=(math.pi / 2, 0, rot[2]), m=M['wood'], radius=0.08, depth=0.8,
             vertices=8)
    pop(v, 34.3 + 0.05 * k, s=(1, 1, 1), dur=0.2)
# enjarre (37 - 38.1)
node_key(pa.inputs['Base Color'], 36.9, (0.72, 0.55, 0.36, 1))
node_key(pa.inputs['Base Color'], 38.0, (0.86, 0.68, 0.48, 1))
node_key(pa.inputs['Roughness'], 36.9, 0.9)
node_key(pa.inputs['Roughness'], 38.0, 0.75)
# lluvia y agua lavando las paredes (29.6 - 33.3) / goteando lejos del muro con aleros (35.4 - 38.3)
for k in range(40):
    r = prim('cylinder', f'lluvia{k}', (0, 0, 0), m=M['rain'], radius=0.015, depth=0.5, vertices=4)
    x = random.uniform(-6, 6)
    y = random.uniform(-6, 3)
    key(r, 'scale', 0, Z, 'CONSTANT')
    for t0, t1 in ((29.6, 33.3), (35.4, 38.3)):
        t = t0 + random.uniform(0, 0.5)
        while t < t1:
            key(r, 'scale', t, Z, 'CONSTANT')
            key(r, 'location', t, (x, y, 9), 'CONSTANT')
            key(r, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
            key(r, 'location', t + 0.5, (x, y, 0), 'LINEAR')
            key(r, 'scale', t + 0.5, Z, 'CONSTANT')
            t += 0.55
for k in range(8):
    d = prim('uv_sphere', f'chorro{k}', (0, 0, 0), m=M['water'], radius=0.06, segments=8, ring_count=6)
    x = -3.5 + 1.0 * k
    key(d, 'scale', 0, Z, 'CONSTANT')
    for t0, t1, y_top, y_bot in ((30.4, 33.2, -HO - 0.03, -HO - 0.03), (35.4, 38.3, -HO - 0.75, -HO - 0.75)):
        t = t0 + 0.1 * k
        while t < t1:
            key(d, 'scale', t, Z, 'CONSTANT')
            key(d, 'location', t, (x, y_top, WH + 0.1), 'CONSTANT')
            key(d, 'scale', t + 0.02, (0.8, 0.8, 2.0), 'CONSTANT')
            key(d, 'location', t + 0.7, (x, y_bot, 0.05), 'LINEAR')
            key(d, 'scale', t + 0.7, Z, 'CONSTANT')
            t += 0.75
# manchas de lavado en el muro (31.5 - 33.3)
for k in range(6):
    st = box(f'lavado{k}', -0.12, 0.12, -0.01, 0.0, -0.9, 0.0, m=M['wet'], origin=(0, 0, 0))
    st.location = (-3.0 + 1.2 * k, -HO - 0.005, WH)
    key(st, 'scale', 0, Z, 'CONSTANT')
    key(st, 'scale', 31.3, (1, 1, 0.02))
    key(st, 'scale', 32.8, (1, 1, 1.6))
    key(st, 'scale', 33.3, Z, 'CONSTANT')
# sol brutal (38.5 - 40.7)
for k in range(5):
    arrow_run(f'sol_calor{k}', M['hot'], (-3.0 + 1.5 * k, -HO - 1.0, 7.5), (-3.0 + 1.5 * k, -HO - 1.0, WH + 0.6), (0, math.pi / 2, 0),
              38.6, 40.7, period=0.9, phase=0.15 * k, length=1.0)
# ventanas pequeñas (41.5) y patio con sombra (42.9 - 44.1)
for k, (x, y, rz) in enumerate(((-2.6, -HO - 0.01, 0), (2.6, -HO - 0.01, 0), (-HO - 0.01, 0, math.pi / 2), (HO + 0.01, 0, math.pi / 2))):
    w = box(f'ventana{k}', -0.25, 0.25, -0.03, 0.03, 1.3, 1.75, m=M['window'], origin=(0, 0, 0))
    w.location = (x, y, 0)
    w.rotation_euler = (0, 0, rz)
    pop(w, 41.5 + 0.08 * k, s=(1, 1, 1), dur=0.2)
sill = box('repisa_ventana', -2.95, -2.25, -HO - 0.25, -HO, 1.2, 1.3, m=M['adobe'])
pop(sill, 41.5, s=(1, 1, 1), dur=0.2)
tree = link(bpy.data.objects.new('arbol_patio', None))
for p in (prim('cylinder', 'patio_tronco', (0, 0, 1.2), m=M['wood'], radius=0.15, depth=2.4, vertices=10),
          prim('uv_sphere', 'patio_copa', (0, 0, 2.7), scale=(1.2, 1.2, 0.8), m=M['leaf'], radius=0.9, segments=16, ring_count=10)):
    p.parent = tree
pop(tree, 43.0, s=(1, 1, 1), dur=0.35)

# ---------------------------------------------------------------- 44.7 - 54.4: corte del muro grueso (x = 30)
CX = 30.0
box('corte_muro', CX - 0.8, CX + 0.8, 0, 2, 0, 2.6, m=M['adobe'])
box('corte_techo', CX - 1.0, CX + 4.0, 0, 2, 2.6, 2.85, m=M['wood'])
box('corte_piso', CX + 0.8, CX + 4.0, 0, 2, 0, 0.05, m=M['stone'])
glow = box('calor_guardado', CX - 0.75, CX + 0.75, -0.01, 0.0, 0.05, 2.55, m=M['hot'])
key(glow, 'scale', 0, Z, 'CONSTANT')
key(glow, 'scale', 47.6, (1, 1, 0.02))
key(glow, 'scale', 48.7, (1, 1, 1))
key(glow, 'scale', 49.6, (1, 1, 1))
key(glow, 'scale', 50.1, Z, 'CONSTANT')
gl_em = M['hot'].copy()
glow.data.materials[0] = gl_em
node_key(gl_em.node_tree.nodes['Emission'].inputs['Strength'], 0, 0.6)
# día: el sol calienta el muro, el calor se queda adentro del muro
for k in range(3):
    arrow_run(f'dia_entra{k}', M['hot'], (CX - 4.5, -0.15, 1.9 - 0.6 * k), (CX - 0.4, -0.15, 1.4 - 0.4 * k), (0, 0.15, 0),
              47.3, 49.0, period=0.85, phase=0.25 * k, length=1.0)
# noche: el muro suelta el calor hacia adentro
for k in range(3):
    arrow_run(f'noche_sale{k}', M['hot'], (CX + 0.3, -0.15, 0.6 + 0.6 * k), (CX + 3.2, -0.15, 0.6 + 0.6 * k), (0, 0, 0),
              49.0, 50.0, period=0.95, phase=0.25 * k, length=0.9)
# adentro fresco cuando afuera quema
for k in range(3):
    arrow_run(f'afuera_quema{k}', M['hot'], (CX - 4.5, -0.15, 0.6 + 0.6 * k), (CX - 1.0, -0.15, 0.6 + 0.6 * k), (0, 0, 0),
              50.1, 52.2, period=0.9, phase=0.2 * k, length=0.9)
    arrow_run(f'adentro_fresco{k}', M['cold'], (CX + 1.2, -0.15, 2.2 - 0.6 * k), (CX + 3.4, -0.15, 2.2 - 0.6 * k), (0, 0, 0),
              50.1, 52.2, period=1.1, phase=0.3 * k, length=0.8)
# tibio cuando afuera hiela
for k in range(3):
    arrow_run(f'adentro_tibio{k}', M['hot'], (CX + 1.2, -0.15, 0.6 + 0.6 * k), (CX + 3.4, -0.15, 0.6 + 0.6 * k), (0, 0, 0),
              52.3, 54.3, period=1.0, phase=0.3 * k, length=0.8)
for k in range(30):
    f = prim('ico_sphere', f'escarcha{k}', (0, 0, 0), m=M['frost'], radius=0.04, subdivisions=1)
    x = CX - random.uniform(1.0, 5.0)
    key(f, 'scale', 0, Z, 'CONSTANT')
    t = 52.3 + random.uniform(0, 0.6)
    while t < 54.3:
        key(f, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(f, 'location', t, (x, random.uniform(-0.5, 0.5), 3.5), 'CONSTANT')
        key(f, 'location', t + 1.0, (x + 0.3, random.uniform(-0.5, 0.5), 0.02), 'LINEAR')
        t += 1.05
    key(f, 'scale', 54.35, Z, 'CONSTANT')
inp = person('habitante', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
inp.location = (CX + 2.6, 0.7, 0.05)
inp.rotation_euler = (0, 0, 0)

# ---------------------------------------------------------------- 54.4 - 58.5: horno, macetas y gato
oven = prim('uv_sphere', 'horno', (1.0, 0.8, 0), scale=(1, 1, 0.9), m=M['adobe'], radius=0.6, segments=20, ring_count=10)
ofire = prim('cone', 'horno_fuego', (1.0, 0.25, 0.15), m=M['fire'], radius1=0.15, depth=0.3, vertices=10)
mouth = box('horno_boca', 0.8, 1.2, 0.18, 0.24, 0, 0.35, m=M['dark'])
for o in (oven, mouth, ofire):
    pop(o, 54.9, s=tuple(o.scale), dur=0.25)
for k, (x, y) in enumerate(((-1.4, -1.4), (-0.6, -1.5), (1.4, -1.3), (-1.5, 1.2))):
    p = prim('cylinder', f'maceta{k}', (x, y, 0.2), m=M['pot'], radius=0.2, depth=0.4, vertices=14)
    pl = prim('uv_sphere', f'planta{k}', (x, y, 0.55), m=M['leaf'], radius=0.25, segments=12, ring_count=8)
    fl = prim('uv_sphere', f'flor{k}', (x + 0.1, y - 0.1, 0.75), m=M['flower'], radius=0.08, segments=8, ring_count=6)
    for o in (p, pl, fl):
        pop(o, 55.8 + 0.1 * k, s=(1, 1, 1), dur=0.2)


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


C = cat('gato')
C.location = (-2.6, -HO - 0.12, 1.3)
C.scale = (1.6, 1.6, 1.6)
pop(C, 57.2, s=(1.6, 1.6, 1.6), dur=0.25)
for k in range(5):  # respira dormido
    key(C, 'scale', 57.6 + 0.4 * k, (1.6, 1.6, 1.6 * (1.05 if k % 2 else 1.0)))

# ---------------------------------------------------------------- cielo y sol (días, noche)
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
DAY, NIGHT = (0.55, 0.72, 0.95), (0.04, 0.06, 0.14)
sky = [(0, DAY, 0.9), (48.9, DAY, 0.9), (49.0, NIGHT, 0.5), (50.05, NIGHT, 0.5), (50.1, DAY, 0.9), (52.25, DAY, 0.9),
       (52.3, NIGHT, 0.5), (54.35, NIGHT, 0.5), (54.4, DAY, 0.9), (59.0, DAY, 0.9), (61.5, (0.80, 0.55, 0.40), 0.75)]
for t, c, st in sky:
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT' if t < 59 else 'BEZIER')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT' if t < 59 else 'BEZIER')
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(5)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(45), 0, math.radians(-35))
light = [(0, 3.6, (1.0, 0.95, 0.85)), (38.4, 3.6, (1.0, 0.95, 0.85)), (38.5, 6.0, (1.0, 0.92, 0.75)), (40.6, 6.0, (1.0, 0.92, 0.75)),
         (40.7, 3.6, (1.0, 0.95, 0.85)), (48.9, 3.6, (1.0, 0.95, 0.85)), (49.0, 0.3, (0.6, 0.7, 1.0)), (50.05, 0.3, (0.6, 0.7, 1.0)),
         (50.1, 4.5, (1.0, 0.92, 0.78)), (52.25, 4.5, (1.0, 0.92, 0.78)), (52.3, 0.3, (0.6, 0.7, 1.0)), (54.35, 0.3, (0.6, 0.7, 1.0)),
         (54.4, 3.6, (1.0, 0.95, 0.85)), (59.0, 3.6, (1.0, 0.95, 0.85))]
for t, e, c in light:
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')
key(sun, 'energy', 61.5, 2.6)
key(sun, 'color', 61.5, (1.0, 0.70, 0.45))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (WX + 1.2, -6.5, 2.0), (WX, 0, 0.7), (WX + 0.8, -6.0, 1.8), (WX, 0, 0.7)),
    (5.06, (WX + 0.4, -4.4, 1.3), (WX, 0, 0.7), (WX + 0.2, -4.0, 1.2), (WX, 0, 0.7)),
    (8.6, (WX + 2.5, -5.5, 2.2), (WX, 0, 0.6), (WX + 2.0, -5.2, 2.0), (WX, 0, 0.6)),
    (12.5, (WX + 3.0, -9.5, 3.0), (WX - 3.0, 10, 3.5), (WX + 2.6, -9.0, 3.0), (WX - 3.0, 10, 3.5)),
    (16.04, (1.4, -4.6, 2.4), (0.75, -1.0, 0.0), (1.2, -4.2, 2.2), (0.75, -1.0, 0.0)),
    (21.4, (0.4, -5.2, 1.0), (0.0, 0, 0.6), (0.2, -4.8, 1.0), (0.0, 0, 0.6)),
    (29.4, (6.5, -13.0, 4.5), (0, 0, 1.3), (5.5, -12.5, 4.2), (0, 0, 1.3)),
    (33.32, (3.5, -8.6, 2.6), (0, -HO, 1.8), (3.0, -8.2, 2.6), (0, -HO, 1.8)),
    (38.48, (7.0, -13.0, 6.0), (0, 0, 1.5), (6.0, -12.5, 5.6), (0, 0, 1.5)),
    (42.6, (2.0, -6.5, 11.0), (0, 0, 0.0), (1.4, -6.0, 10.5), (0, 0, 0.0)),
    (44.72, (CX + 0.4, -7.5, 1.4), (CX + 0.2, 0, 1.3), (CX + 0.4, -7.0, 1.4), (CX + 0.2, 0, 1.3)),
    (54.36, (4.0, -8.0, 8.5), (0.2, -0.2, 0.3), (3.4, -7.4, 8.0), (0.2, -0.2, 0.3)),
    (57.0, (-2.0, -7.2, 1.8), (-2.6, -HO, 1.3), (-2.2, -6.6, 1.6), (-2.6, -HO, 1.3)),
    (58.54, (5.0, -12.0, 5.0), (0, 0, 1.3), (9.0, -22.0, 10.0), (0, 0, 1.3)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
