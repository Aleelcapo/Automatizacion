"""Escena 3D del atrapavientos / badgir (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P badgir_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Casa de adobe abierta por el frente (la pared delantera se quita a los 3.7 s) para ver cómo
circula el aire. La torre también va abierta por delante.
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/badgir'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 60.9  # audio 60.14 s + cola
NF = int(round(DUR * FPS))
random.seed(29)

clean()
sc = bpy.context.scene

M = dict(
    sand=mat('arena', (0.85, 0.68, 0.45), 0.95),
    adobe=mat('adobe', (0.80, 0.60, 0.40), 0.9),
    inner=mat('interior', (0.70, 0.50, 0.32), 0.9),
    tower=mat('torre', (0.82, 0.62, 0.42), 0.9),
    wood=mat('madera', (0.42, 0.27, 0.14), 0.8),
    window=mat('ventana_hueco', (0.62, 0.78, 0.95), 0.9),
    water=mat('agua', (0.30, 0.60, 0.90), 0.05, emit=(0.3, 0.55, 0.9), es=0.6),
    tile=mat('azulejo', (0.15, 0.45, 0.65), 0.3),
    rug=mat('alfombra', (0.70, 0.12, 0.15), 0.9),
    rug2=mat('alfombra2', (0.20, 0.30, 0.55), 0.9),
    jug=mat('jarra', (0.70, 0.40, 0.22), 0.6),
    cloth=mat('ropa', (0.92, 0.90, 0.84), 0.9),
    sash=mat('faja', (0.20, 0.40, 0.60), 0.8),
    skin=mat('piel', (0.68, 0.48, 0.32), 0.6),
    hair=mat('pelo', (0.06, 0.05, 0.05), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    cat=mat('gato', (0.85, 0.75, 0.55), 0.8),
    grain=mat('grano_arena', (0.80, 0.60, 0.35), 0.9),
    hot=flat_mat('caliente', (1.0, 0.42, 0.12), 3.0),
    cold=flat_mat('fresco', (0.35, 0.70, 1.0), 3.0),
    wind=flat_mat('viento', (0.92, 0.96, 1.0), 2.2),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

box('suelo', -80, 80, -60, 120, -2, 0, m=M['sand'])
for k in range(6):
    prim('uv_sphere', f'duna{k}', (random.uniform(-60, 60), random.uniform(50, 90), -2), scale=(random.uniform(12, 20), 8, 4),
         m=M['sand'], radius=1, segments=20, ring_count=10)

# ---------------------------------------------------------------- casa (pared delantera removible)
HX, HY, H, T = 4.0, 2.9, 3.2, 0.4
TX0, TX1, TY0, TY1 = 1.7, 3.3, -0.2, 1.4   # hueco del techo / planta de la torre
box('piso', -HX, HX, -HY, HY, 0, 0.05, m=M['inner'])
back = box('pared_atras', -HX, HX, HY - T, HY, 0, H, m=M['adobe'])
box('pared_izq', -HX, -HX + T, -HY, HY - T, 0, H, m=M['adobe'])
box('pared_der', HX - T, HX, -HY, HY - T, 0, H, m=M['adobe'])
front = box('pared_frente', -HX + T, HX - T, -HY, -HY + T, 0, H, m=M['adobe'])
fdoor = box('puerta_frente', -0.5, 0.5, -HY - 0.01, -HY + 0.02, 0, 2.0, m=M['wood'])
for o in (front, fdoor):
    cut(o, 0, 3.7)
roof_parts = [box('techo_a', -HX, HX, TY1, HY, H, H + 0.3, m=M['adobe']),
              box('techo_b', -HX, HX, -HY, TY0, H, H + 0.3, m=M['adobe']),
              box('techo_c', -HX, TX0, TY0, TY1, H, H + 0.3, m=M['adobe']),
              box('techo_d', TX1, HX, TY0, TY1, H, H + 0.3, m=M['adobe'])]
hole_cover = box('techo_tapa', TX0, TX1, TY0, TY1, H, H + 0.3, m=M['adobe'])
cut(hole_cover, 0, 13.4)
# ventanas en la pared trasera (7.9) y sus postigos (13.3)
for k, x in enumerate((-2.6, -0.8)):
    w = box(f'ventana{k}', x - 0.45, x + 0.45, HY - T - 0.01, HY - T, 1.2, 2.2, m=M['window'])
    pop(w, 7.9 + 0.15 * k, s=(1, 1, 1), dur=0.2)
    sh = box(f'postigo{k}', x - 0.48, x + 0.48, HY - T - 0.04, HY - T - 0.02, 1.15, 2.25, m=M['wood'])
    pop(sh, 13.3 + 0.1 * k, s=(1, 1, 1), dur=0.2)
reardoor = box('puerta_fondo', -3.3, -2.5, HY - T - 0.01, HY - T, 0, 1.8, m=M['window'])
pop(reardoor, 37.8, s=(1, 1, 1), dur=0.2)

# ---------------------------------------------------------------- torre (13.4 - 14.6), abierta por delante
TT = 0.18
TZ0, TZ1, TZ2 = H + 0.3, 7.4, 8.3   # base, inicio de aberturas, techo
tower = link(bpy.data.objects.new('torre', None))
tparts = [box('torre_atras', TX0 - TT, TX1 + TT, TY1, TY1 + TT, TZ0, TZ1, m=M['tower']),
          box('torre_izq', TX0 - TT, TX0, TY0, TY1, TZ0, TZ1, m=M['tower']),
          box('torre_der', TX1, TX1 + TT, TY0, TY1, TZ0, TZ1, m=M['tower']),
          box('torre_techo', TX0 - TT - 0.1, TX1 + TT + 0.1, TY0 - TT - 0.1, TY1 + TT + 0.1, TZ2, TZ2 + 0.2, m=M['tower'])]
for (x, y) in ((TX0 - TT / 2, TY0 - TT / 2), (TX1 + TT / 2, TY0 - TT / 2), (TX0 - TT / 2, TY1 + TT / 2), (TX1 + TT / 2, TY1 + TT / 2)):
    tparts.append(box(f'torre_pilar{x}{y}', x - TT / 2, x + TT / 2, y - TT / 2, y + TT / 2, TZ1, TZ2, m=M['tower']))
tfront = box('torre_frente', TX0 - TT, TX1 + TT, TY0 - TT, TY0, TZ0, TZ1, m=M['tower'])
tparts.append(tfront)
tower.location = (0, 0, TZ0)
for p in tparts:
    p.parent = tower
    p.location.z -= TZ0
key(tower, 'scale', 0, Z, 'CONSTANT')
key(tower, 'scale', 13.4, (1, 1, 0.02), 'BEZIER')
key(tower, 'scale', 14.6, (1, 1, 1))
# la torre se ve desde afuera cuando sube, luego se abre por delante
key(tfront, 'scale', 0, (1, 1, 1), 'CONSTANT')
key(tfront, 'scale', 15.2, Z, 'CONSTANT')
# tapas de madera en las aberturas (invierno, 44.5)
for k, (x0, x1, y0, y1) in enumerate(((TX0 - TT, TX1 + TT, TY1 + 0.02, TY1 + 0.08), (TX0 - TT - 0.02, TX0 - 0.1, TY0, TY1),
                                      (TX1 + 0.1, TX1 + TT + 0.02, TY0, TY1))):
    b = box(f'tapa_torre{k}', x0, x1, y0, y1, TZ1, TZ2, m=M['wood'])
    pop(b, 44.4 + 0.1 * k, 45.5, s=(1, 1, 1), dur=0.2)
outline('contorno_torre', rect_xz(TX0 - 0.4, TX1 + 0.4, H + 0.2, TZ2 + 0.45, TY0 - 0.5), M['orange'], ((TX0 + TX1) / 2, TY0 - 0.5, 6.0),
        19.9, 21.7)
# el sol calienta la torre (34.2 - 40.3)
tm = M['tower'].node_tree.nodes['Principled BSDF']
tm.inputs['Emission Color'].default_value = (1.0, 0.45, 0.15, 1)
for t, v in ((0, 0.0), (34.1, 0.0), (35.1, 0.6), (40.2, 0.6), (40.4, 0.0)):
    node_key(tm.inputs['Emission Strength'], t, v)

# ---------------------------------------------------------------- fuente bajo la torre (24.6)
pool = box('estanque', TX0 + 0.05, TX1 - 0.05, TY0 + 0.05, TY1 - 0.05, 0.05, 0.12, m=M['water'])
rim = box('estanque_borde', TX0 - 0.05, TX1 + 0.05, TY0 - 0.05, TY1 + 0.05, 0.0, 0.1, m=M['tile'])
jet = prim('cylinder', 'chorro', ((TX0 + TX1) / 2, (TY0 + TY1) / 2, 0.4), m=M['water'], radius=0.04, depth=0.6, vertices=8)
for o in (rim, pool, jet):
    pop(o, 24.6, s=(1, 1, 1), dur=0.3)
for k in range(5):
    d = prim('uv_sphere', f'gota{k}', (0, 0, 0), m=M['water'], radius=0.045, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 24.9 + 0.12 * k
    a = 2 * math.pi * k / 5
    while t < DUR:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, ((TX0 + TX1) / 2, (TY0 + TY1) / 2, 0.7), 'CONSTANT')
        key(d, 'location', t + 0.5, ((TX0 + TX1) / 2 + 0.35 * math.cos(a), (TY0 + TY1) / 2 + 0.35 * math.sin(a), 0.12), 'LINEAR')
        t += 0.55

# ---------------------------------------------------------------- persona
P = person('persona', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
key(P, 'location', 0, (-6.0, -4.5, 0), 'CONSTANT')
key(P, 'location', 0.8, (-6.0, -4.5, 0))
key(P, 'location', 3.0, (-2.0, -3.4, 0))
key(P, 'location', 3.7, (-1.6, 0.6, 0.05), 'CONSTANT')
key(P, 'rotation_euler', 0, (0, 0, -0.6), 'CONSTANT')
key(P, 'rotation_euler', 3.7, (0, 0, 0.3), 'CONSTANT')
for t, s in ((3.7, (1, 1, 1)), (5.0, (1, 1, 0.96)), (5.5, (1, 1, 1)), (6.0, (1, 1, 0.96)), (6.5, (1, 1, 1))):
    key(P, 'scale', t, s)   # sofocado
key(P, 'location', 51.9, (-1.6, 0.6, 0.05), 'CONSTANT')
key(P, 'location', 52.0, (-2.2, 1.2, 0.05), 'CONSTANT')
key(P, 'rotation_euler', 52.0, (0, 0, 0.6), 'CONSTANT')

# ---------------------------------------------------------------- flujos de aire
# aire quieto y caliente (3.7 - 7.1) y otra vez sin viento (30.5 - 33)
for k in range(10):
    o = prim('uv_sphere', f'calor_quieto{k}', (random.uniform(-3.2, 3.2), -0.6, random.uniform(0.6, 2.8)), m=M['hot'], radius=0.07,
             segments=8, ring_count=6)
    key(o, 'scale', 0, Z, 'CONSTANT')
    for t0, t1 in ((4.0, 7.1), (30.6, 33.0)):
        t = t0 + 0.1 * k
        key(o, 'scale', t, (1, 1, 1), 'CONSTANT')
        while t + 0.8 <= t1:
            key(o, 'scale', t + 0.4, (1.4, 1.4, 1.4))
            key(o, 'scale', t + 0.8, (1, 1, 1))
            t += 0.8
        key(o, 'scale', t1, Z, 'CONSTANT')
# viento caliente con arena por las ventanas (9.8 - 13.1)
for k, x in enumerate((-2.6, -0.8)):
    arrow_run(f'viento_ventana{k}', M['hot'], (x - 0.6, HY - 0.6, 1.8), (x + 2.2, -1.2, 1.3), (0, 0.15, -0.6), 9.8, 13.1, period=1.0,
              phase=0.3 * k, length=1.2)
for k in range(30):
    g = prim('ico_sphere', f'arena{k}', (0, 0, 0), m=M['grain'], radius=0.035, subdivisions=1)
    x = random.choice((-2.6, -0.8)) + random.uniform(-0.4, 0.4)
    key(g, 'scale', 0, Z, 'CONSTANT')
    t = 9.9 + random.uniform(0, 0.8)
    while t < 13.1:
        key(g, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(g, 'location', t, (x, HY + 1.0, random.uniform(1.3, 2.1)), 'CONSTANT')
        key(g, 'location', t + 0.8, (x + random.uniform(-0.5, 0.5), -1.5, random.uniform(0.1, 1.2)), 'LINEAR')
        t += 0.85
    key(g, 'scale', 13.15, Z, 'CONSTANT')
CXT = (TX0 + TX1) / 2
FY = TY0 - 0.35   # delante del hueco de la torre
# viento que entra arriba y baja (17.2 - 21.8): blanco; todavía caliente (22 - 24.6): naranja; pasa por el agua (27.4 - 29.8): azul
for t0, t1, m_ in ((17.2, 21.7, M['wind']), (22.2, 27.1, M['hot']), (27.4, 29.8, M['cold'])):
    for k in range(2):
        arrow_run(f'entra_arriba{t0}{k}', M['wind'], (-2.0, FY, 7.7 + 0.4 * k), (CXT - 0.6, FY, 7.7 + 0.4 * k), (0, 0, 0), t0, t1,
                  period=1.0, phase=0.4 * k, length=1.3)
    arrow_run(f'baja{t0}', m_, (CXT, FY, 7.4), (CXT, FY, H + 0.6), (0, math.pi / 2, 0), t0 + 0.6, t1, period=1.0, length=1.2)
    arrow_run(f'sale_cuarto{t0}', m_, (CXT - 0.6, FY, 1.0), (-2.4, FY, 1.0), (0, 0, math.pi), t0 + 1.2, t1, period=1.1, length=1.2)
# efecto chimenea (35.6 - 40.3): sube caliente y sale; entra fresco por el fondo
arrow_run('sube_torre', M['hot'], (CXT, FY, H + 0.6), (CXT, FY, TZ2 + 1.0), (0, -math.pi / 2, 0), 35.5, 40.3, period=1.0, length=1.2)
arrow_run('sale_arriba', M['hot'], (CXT + 0.5, FY, TZ1 + 0.4), (CXT + 3.0, FY, TZ1 + 0.9), (0, -0.2, 0), 36.0, 40.3, period=1.1, length=1.0)
arrow_run('entra_fondo', M['cold'], (-3.3, HY - 0.6, 0.8), (-1.6, -0.6, 0.7), (0, 0, -0.95), 37.9, 40.3, period=1.0, length=1.0)
arrow_run('hacia_torre', M['cold'], (-2.4, FY, 0.6), (CXT - 0.7, FY, 0.6), (0, 0, 0), 38.3, 40.3, period=1.1, length=1.2)
# invierno: el frío entra sin parar (40.6 - 44.4)
for k in range(2):
    arrow_run(f'frio_arriba{k}', M['cold'], (-2.0, FY, 7.7 + 0.4 * k), (CXT - 0.6, FY, 7.7 + 0.4 * k), (0, 0, 0), 40.6, 44.4,
              period=0.9, phase=0.3 * k, length=1.3)
arrow_run('frio_baja', M['cold'], (CXT, FY, 7.4), (CXT, FY, H + 0.6), (0, math.pi / 2, 0), 41.1, 44.4, period=0.9, length=1.2)
arrow_run('frio_cuarto', M['cold'], (CXT - 0.6, FY, 1.0), (-2.4, FY, 1.0), (0, 0, math.pi), 41.6, 44.4, period=1.0, length=1.2)

# ---------------------------------------------------------------- pueblo de torres (45.5 - 52.3)
for k in range(14):
    r, c = divmod(k, 7)
    x = -18 + 6 * c
    y = 10 + 8 * r + random.uniform(-1, 1)
    hh = random.uniform(2.6, 3.4)
    box(f'casa_vecina{k}', x - 2.2, x + 2.2, y - 2.0, y + 2.0, 0, hh, m=M['adobe'])
    tw = box(f'torre_vecina{k}', x + 0.6, x + 1.8, y - 0.6, y + 0.6, hh, hh + random.uniform(3.5, 5.0), m=M['tower'],
             origin=(x + 1.2, y, hh))
    key(tw, 'scale', 0, Z, 'CONSTANT')
    key(tw, 'scale', 45.4, (1, 1, 0.02), 'BEZIER')
    key(tw, 'scale', 46.4 + 0.05 * k, (1, 1, 1))
for k, z in enumerate((9.5, 10.6, 11.6)):
    arrow_run(f'viento_alto{k}', M['wind'], (-22, 14, z), (14, 14, z), (0, 0, 0), 47.9, 52.3, period=1.3, phase=0.4 * k, length=2.4)
for k in range(40):
    g = prim('ico_sphere', f'arena_baja{k}', (0, 0, 0), m=M['grain'], radius=0.08, subdivisions=1)
    y = random.uniform(4, 20)
    key(g, 'scale', 0, Z, 'CONSTANT')
    t = 49.0 + random.uniform(0, 0.8)
    while t < 52.3:
        key(g, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(g, 'location', t, (-22, y, random.uniform(0.1, 1.2)), 'CONSTANT')
        key(g, 'location', t + 1.4, (14, y, random.uniform(0.1, 1.2)), 'LINEAR')
        t += 1.45
    key(g, 'scale', 52.35, Z, 'CONSTANT')

# ---------------------------------------------------------------- alfombras, jarra y gato (52.3 - 57.4)
for k, (x, m_) in enumerate(((-2.2, M['rug']), (-0.4, M['rug2']))):
    rg = box(f'alfombra{k}', x - 0.8, x + 0.8, 0.0, 2.2, 0.05, 0.08, m=m_)
    pop(rg, 52.8 + 0.15 * k, s=(1, 1, 1), dur=0.25)
jug = prim('cylinder', 'jarra', (0.6, 1.4, 0.3), m=M['jug'], radius=0.14, depth=0.5, vertices=14)
neck = prim('cylinder', 'jarra_cuello', (0.6, 1.4, 0.62), m=M['jug'], radius=0.07, depth=0.16, vertices=12)
for o in (jug, neck):
    pop(o, 53.7, s=(1, 1, 1), dur=0.25)


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
C.location = (CXT - 1.25, 0.3, 0.05)
C.scale = (1.6, 1.6, 1.6)
pop(C, 55.0, s=(1.6, 1.6, 1.6), dur=0.25)

# ---------------------------------------------------------------- cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st in ((0, (0.55, 0.70, 0.92), 0.9), (40.25, (0.55, 0.70, 0.92), 0.9), (40.3, (0.62, 0.66, 0.72), 0.75), (45.45, (0.62, 0.66, 0.72), 0.75),
                 (45.5, (0.55, 0.70, 0.92), 0.9), (57.0, (0.55, 0.70, 0.92), 0.9), (59.8, (0.82, 0.56, 0.40), 0.75)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT' if t < 57 else 'BEZIER')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT' if t < 57 else 'BEZIER')
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(5)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(40), 0, math.radians(-30))
for t, e, c in ((0, 4.2, (1.0, 0.93, 0.80)), (40.25, 4.2, (1.0, 0.93, 0.80)), (40.3, 1.6, (0.80, 0.86, 1.0)), (45.45, 1.6, (0.80, 0.86, 1.0)),
                (45.5, 4.2, (1.0, 0.93, 0.80)), (57.0, 4.2, (1.0, 0.93, 0.80))):
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')
key(sun, 'energy', 59.8, 2.8)
key(sun, 'color', 59.8, (1.0, 0.70, 0.45))
fill = bpy.data.lights.new('relleno', 'AREA')
fill.energy = 150
fill.size = 6
fo = link(bpy.data.objects.new('relleno', fill))
fo.location = (0, -7, 3)
fo.rotation_euler = (math.radians(80), 0, 0)

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (6.0, -12.0, 4.0), (0, 0, 1.5), (5.0, -11.5, 3.6), (0, 0, 1.5)),
    (3.7, (0.0, -9.5, 2.2), (0, 0, 1.5), (0.0, -9.0, 2.2), (0, 0, 1.5)),
    (9.72, (-1.0, -8.5, 2.4), (-1.6, 0.5, 1.5), (-1.2, -8.0, 2.4), (-1.6, 0.5, 1.5)),
    (13.1, (5.0, -12.0, 5.0), (1.5, 0, 4.5), (4.0, -12.5, 5.5), (1.5, 0, 5.0)),
    (17.0, (1.0, -12.5, 5.0), (1.0, 0, 4.2), (1.0, -12.0, 5.0), (1.0, 0, 4.2)),
    (24.4, (2.0, -6.5, 1.6), (CXT, 0.4, 0.4), (1.8, -6.2, 1.6), (CXT, 0.4, 0.4)),
    (27.2, (1.0, -12.5, 5.0), (1.0, 0, 4.2), (1.0, -12.0, 5.0), (1.0, 0, 4.2)),
    (29.8, (0.0, -9.0, 2.0), (0, 0, 1.5), (0.0, -8.6, 2.0), (0, 0, 1.5)),
    (32.96, (1.0, -13.0, 5.2), (1.0, 0, 4.5), (1.0, -12.5, 5.2), (1.0, 0, 4.5)),
    (40.34, (4.5, -12.0, 6.5), (1.5, 0, 5.0), (4.0, -11.5, 6.2), (1.5, 0, 5.0)),
    (45.46, (8.0, -22.0, 10.0), (-2.0, 14.0, 4.0), (5.0, -24.0, 11.0), (-2.0, 14.0, 4.0)),
    (52.3, (0.5, -6.2, 1.8), (0.4, 1.0, 0.5), (0.2, -5.8, 1.7), (0.4, 1.0, 0.5)),
    (54.9, (1.0, -4.8, 1.5), (CXT - 1.0, 0.5, 0.3), (0.9, -4.5, 1.4), (CXT - 1.0, 0.5, 0.3)),
    (57.38, (5.0, -12.0, 5.0), (0, 0, 2.5), (10.0, -24.0, 11.0), (0, 0, 2.5)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
