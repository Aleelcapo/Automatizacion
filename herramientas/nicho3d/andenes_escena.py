"""Escena 3D de los andenes de Machu Picchu (arquitectura ancestral latina), sincronizada con el audio.

Uso:
  blender -b -P andenes_escena.py -- OUT_DIR [--frames A-B] [--res 540] [--samples 20] [--calidad 1] [--stills 1,200]

Corte transversal de la ladera en y=0: la montaña y los andenes son prismas extruidos desde un
perfil en el plano xz, así la cara de corte muestra el muro inclinado y las capas del relleno.
"""
import bpy, bmesh, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/andenes'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 78.1  # audio 77.28 s + cola
NF = int(round(DUR * FPS))
random.seed(41)

clean()
sc = bpy.context.scene

M = dict(
    grass=mat('pasto_ladera', (0.36, 0.50, 0.20), 0.95),
    soil=mat('tierra_ladera', (0.40, 0.27, 0.16), 0.95),
    rockcut=mat('suelo_corte', (0.40, 0.32, 0.25), 0.9),
    wall=mat('piedra_muro', (0.62, 0.60, 0.55), 0.85),
    fill=mat('tierra_relleno', (0.42, 0.28, 0.17), 0.95),
    big=mat('piedra_grande', (0.42, 0.41, 0.40), 0.85),
    gravel=mat('grava', (0.58, 0.56, 0.52), 0.9),
    sand=mat('arena_capa', (0.82, 0.70, 0.50), 0.95),
    top=mat('tierra_buena', (0.22, 0.14, 0.08), 0.95),
    chan=mat('piedra_canal', (0.55, 0.53, 0.50), 0.85),
    water=mat('agua', (0.30, 0.60, 0.90), 0.05, emit=(0.3, 0.55, 0.9), es=0.8),
    river=mat('rio', (0.25, 0.50, 0.60), 0.1, emit=(0.15, 0.35, 0.45), es=0.3),
    leaf=mat('hoja_cultivo', (0.30, 0.55, 0.18), 0.85),
    corn=mat('maiz', (0.38, 0.60, 0.20), 0.8),
    cob=mat('mazorca', (0.95, 0.80, 0.30), 0.6),
    potato=mat('papa_flor', (0.75, 0.55, 0.85), 0.7),
    cloth=mat('poncho', (0.75, 0.15, 0.15), 0.85),
    sash=mat('faja', (0.95, 0.75, 0.20), 0.8),
    skin=mat('piel', (0.60, 0.40, 0.27), 0.6),
    hair=mat('pelo', (0.05, 0.04, 0.04), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    llama=mat('llama', (0.92, 0.88, 0.80), 0.95),
    condor=mat('condor', (0.08, 0.08, 0.09), 0.8),
    white=mat('blanco', (0.95, 0.95, 0.95), 0.8),
    mtn=mat('montana', (0.40, 0.45, 0.32), 0.9),
    rain=flat_mat('lluvia', (0.70, 0.82, 1.0), 1.2),
    push=flat_mat('empuje', (1.0, 0.35, 0.12), 3.0),
    blue=flat_mat('flecha_agua', (0.35, 0.75, 1.0), 3.0),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

DEPTH = 14.0   # los prismas van de y=0 (cara de corte) a y=DEPTH


def zs(x):
    """Perfil natural de la ladera."""
    return 0.62 * (x + 8.0)


def prism(name, poly, mats, y0=0.0, y1=DEPTH, cut_index=1):
    """Prisma extruido en y desde un polígono convexo del plano xz (x, z)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    f0 = [bm.verts.new((x, y0, z)) for x, z in poly]
    f1 = [bm.verts.new((x, y1, z)) for x, z in poly]
    bm.faces.new(f0)
    bm.faces.new(list(reversed(f1)))
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((f0[i], f0[j], f1[j], f1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    for m in mats:
        o.data.materials.append(m)
    if len(mats) > 1:
        face_mats(o, lambda nn: cut_index if nn.y < -0.5 else (0 if nn.z > 0.3 else min(len(mats) - 1, 2)))
    return o


def clip_band(poly, za, zb):
    """Recorta un polígono convexo a la franja za <= z <= zb."""
    def clip(pts, keep, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            ka, kb = keep(a), keep(b)
            if ka:
                out.append(a)
            if ka != kb:
                out.append(inter(a, b))
        return out

    def at(z):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]), z)
    p = clip(poly, lambda q: q[1] >= za, at(za))
    return clip(p, lambda q: q[1] <= zb, at(zb)) if p else []


# ---------------------------------------------------------------- montaña, río y fondo
XL, XR = -14.0, 14.0
mountain = prism('montana_ladera', [(XL, -8), (XR, -8), (XR, zs(XR)), (-8.0, 0.0), (XL, 0.0)], [M['grass'], M['rockcut'], M['soil']])
box('valle_frente', -40, XL, -30, 40, -8, 0, m=M['grass'])
box('valle', XL, 40, -30, 0, -8, -8.0 + 0.01, m=M['grass'])
riv = box('rio', -30, -14.5, -6, 40, -0.4, -0.05, m=M['river'])
prim('cone', 'huayna_picchu', (6, 40, 14), m=M['mtn'], radius1=10, radius2=1.2, depth=30, vertices=10)
prim('cone', 'cerro_fondo1', (-20, 55, 10), m=M['mtn'], radius1=16, radius2=2.0, depth=24, vertices=9)
prim('cone', 'cerro_fondo2', (28, 50, 12), m=M['mtn'], radius1=14, radius2=1.5, depth=26, vertices=9)

# ---------------------------------------------------------------- persona
P = person('campesino', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


# ---------------------------------------------------------------- 0 - 8.3: la chacra en la ladera y la lluvia que la arrastra
crops0 = []
for k in range(9):
    x = -6.6 + 0.6 * k
    c = prim('cone', f'brote{k}', (x, 1.0 + 0.4 * (k % 3), zs(x) + 0.2), m=M['leaf'], radius1=0.12, depth=0.4, vertices=6)
    c.rotation_euler = (0, -0.55, 0)
    pop(c, 1.6 + 0.08 * k, 8.2, s=(1, 1, 1), dur=0.2)
    key(c, 'location', 6.0, tuple(c.location))
    key(c, 'location', 7.8, (x - 2.5, c.location[1], max(0.1, zs(x - 2.5)) + 0.1), 'LINEAR')
    crops0.append(c)
for k in range(14):   # tierra que se desliza
    g = prim('ico_sphere', f'deslave{k}', (0, 0, 0), m=M['soil'], radius=0.12, subdivisions=1)
    x0 = random.uniform(-6, -2)
    y = random.uniform(0.4, 3.0)
    pop(g, 5.9 + 0.05 * k, 8.2, s=(1, 1, 1), dur=0.1)
    key(g, 'location', 5.9, (x0, y, zs(x0) + 0.1))
    key(g, 'location', 8.0, (x0 - random.uniform(3, 6), y, max(0.1, zs(x0 - 4)) + 0.05), 'LINEAR')


def rain(tag, t0, t1, n=50, x0=-9, x1=4):
    for k in range(n):
        r = prim('cylinder', f'lluvia_{tag}{k}', (0, 0, 0), m=M['rain'], radius=0.015, depth=0.5, vertices=4)
        x, y = random.uniform(x0, x1), random.uniform(-1.0, 4.0)
        key(r, 'scale', 0, Z, 'CONSTANT')
        t = t0 + random.uniform(0, 0.5)
        while t < t1:
            key(r, 'scale', t, Z, 'CONSTANT')
            key(r, 'location', t, (x, y, 13), 'CONSTANT')
            key(r, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
            key(r, 'location', t + 0.55, (x - 0.4, y, max(0.0, zs(x)) - 0.2), 'LINEAR')
            key(r, 'scale', t + 0.55, Z, 'CONSTANT')
            t += 0.6


rain('a', 5.2, 8.3)
rain('b', 29.0, 34.0, n=60, x0=-8, x1=8)

pose(P, 0, (-4.6, 1.2, zs(-4.6)), (0, 0, -1.2))
for k in range(6):
    pose(P, 1.0 + 0.6 * k, (-4.6, 1.2, zs(-4.6) - 0.06 * (k % 2)), (0.3 * (k % 2), 0, -1.2), 'BEZIER')

# ---------------------------------------------------------------- andenes
W_ = 2.4      # ancho de cada escalón
NT = 6
X0 = -6.2
WT = 0.5      # grosor del muro
LEAN = 0.22   # inclinación del muro hacia la montaña


def terrace_geom(i):
    x = X0 + i * W_
    top = zs(x + W_) + 0.15
    base = zs(x) - 0.35
    wall = [(x, base), (x + WT, base), (x + WT + LEAN, top), (x + LEAN, top)]
    fill = [(x + WT * 0.6, zs(x + WT * 0.6)), (x + W_, zs(x + W_)), (x + W_, top), (x + WT * 0.6 + LEAN, top)]
    return x, top, base, wall, fill


TER = [terrace_geom(i) for i in range(NT)]
build_t = [8.9, 24.4, 25.0, 26.1, 26.8, 27.6]
walls, fills = [], []
for i, (x, top, base, wall, fill) in enumerate(TER):
    t = build_t[i]
    w = prism(f'muro{i}', wall, [M['wall']], y0=-0.03)
    f = prism(f'relleno{i}', fill, [M['fill']], y0=-0.02)
    for o, tt in ((w, t), (f, t + (1.5 if i == 0 else 0.3))):
        if i == 0 and o is w:
            continue   # el primer muro inclinado aparece después (17.2)
        o.location = (0, 0, 0)
        key(o, 'scale', 0, Z, 'CONSTANT')
        key(o, 'scale', tt, (1, 1, 0.02), 'BEZIER')
        key(o, 'scale', tt + 0.6, (1, 1, 1))
    walls.append(w)
    fills.append(f)
# las mallas escalan desde el origen; se mueve el origen a la base de cada pieza
for o in walls + fills:
    zmin = min(v.co.z for v in o.data.vertices)
    for v in o.data.vertices:
        v.co.z -= zmin
    o.location = (0, 0, zmin)
# primer muro recto (8.9) que revienta (15.8); luego se rehace inclinado (17.3)
x, top, base, wall, fill = TER[0]
straight = prism('muro_recto', [(x, base), (x + WT, base), (x + WT, top), (x, top)], [M['wall']], y0=-0.03)
zmin = base
for v in straight.data.vertices:
    v.co.z -= zmin
straight.location = (0, 0, zmin)
key(straight, 'scale', 0, Z, 'CONSTANT')
key(straight, 'scale', 8.9, (1, 1, 0.02), 'BEZIER')
key(straight, 'scale', 9.6, (1, 1, 1))
key(straight, 'scale', 15.75, (1, 1, 1), 'CONSTANT')
key(straight, 'scale', 15.8, Z, 'CONSTANT')
w0 = walls[0]
key(w0, 'scale', 0, Z, 'CONSTANT')
key(w0, 'scale', 17.2, (1, 1, 0.02), 'BEZIER')
key(w0, 'scale', 17.9, (1, 1, 1))
for k in range(10):   # pedazos del muro reventado
    pc = prim('cube', f'pedazo{k}', (0, 0, 0), scale=(0.2, 0.25, 0.18), rot=(random.uniform(0, 3),) * 3, m=M['wall'])
    zz = base + random.uniform(0.2, top - base - 0.2)
    pop(pc, 15.8, 17.2, s=(0.2, 0.25, 0.18), dur=0.05)
    key(pc, 'location', 15.8, (x + 0.25, random.uniform(0.3, 3.0), zz))
    key(pc, 'location', 16.9, (x - random.uniform(1.0, 3.0), random.uniform(0.3, 3.0), max(0.15, zs(x - 2))), 'LINEAR')
spill = prim('uv_sphere', 'derrame', (x - 0.8, 1.5, zs(x - 0.8) + 0.1), scale=(1.4, 1.5, 0.35), m=M['fill'], radius=1, segments=16,
             ring_count=8)
pop(spill, 15.9, 17.2, s=(1.4, 1.5, 0.35), dur=0.4)
f0 = fills[0]
key(f0, 'scale', 15.75, (1, 1, 1), 'CONSTANT')
key(f0, 'scale', 15.8, (1, 1, 0.55), 'CONSTANT')
key(f0, 'scale', 17.9, (1, 1, 0.55))
key(f0, 'scale', 18.5, (1, 1, 1))
outline('contorno_anden', rect_xz(x - 0.15, x + W_ + 0.1, base - 0.1, top + 0.15, -0.1), M['orange'], (x + 1.1, -0.1, (base + top) / 2),
        12.4, 13.6)
# empuje de la tierra mojada (14 - 15.8) y del agua atrapada (32.4 - 34)
for k in range(3):
    zz = base + 0.4 + 0.45 * k
    arrow_run(f'empuje{k}', M['push'], (x + 1.4, -0.12, zz), (x - 0.2, -0.12, zz), (0, 0, math.pi), 14.1, 15.8, period=0.85,
              phase=0.2 * k, length=1.0)
for i in (1, 3):
    xx, tp, bs, _, _ = TER[i]
    for k in range(2):
        zz = bs + 0.6 + 0.5 * k
        arrow_run(f'empuje_agua{i}{k}', M['push'], (xx + 1.6, -0.12, zz), (xx + 0.2, -0.12, zz), (0, 0, math.pi), 32.4, 34.0,
                  period=0.8, phase=0.25 * k, length=1.0)
for k in range(24):   # agua atrapada en la tierra
    i = k % NT
    xx, tp, bs, _, _ = TER[i]
    d = prim('uv_sphere', f'agua_atrapada{k}', (xx + random.uniform(0.8, 2.2), -0.05, random.uniform(zs(xx + 1.0) + 0.1, tp - 0.15)),
             m=M['water'], radius=0.06, segments=8, ring_count=6)
    pop(d, 30.6 + 0.05 * k, 34.1, s=(1, 1, 1), dur=0.15)

# ---------------------------------------------------------------- relleno por capas (36.7 - 41.3)
LAYERS = [(0.0, 0.35, M['big'], 36.7), (0.35, 0.55, M['gravel'], 38.3), (0.55, 0.72, M['sand'], 39.2), (0.72, 1.0, M['top'], 40.3)]
layer_objs = []
for i, (x, top, base, wall, fill) in enumerate(TER):
    zlo = min(z for _, z in fill)
    for j, (a, b, m, t) in enumerate(LAYERS):
        za = zlo + (top - zlo) * a
        zb = zlo + (top - zlo) * b
        poly = clip_band(fill, za, zb)
        if len(poly) < 3:
            continue
        o = prism(f'capa{i}_{j}', poly, [m], y0=-0.025, y1=DEPTH - 0.01)
        pop(o, t + 0.05 * i, s=(1, 1, 1), dur=0.3)
        layer_objs.append(o)
for f in fills:
    key(f, 'scale', 36.6, (1, 1, 1), 'CONSTANT')
    key(f, 'scale', 36.65, Z, 'CONSTANT')
# piedras grandes dibujadas en la capa del fondo
for i, (x, top, base, wall, fill) in enumerate(TER):
    zlo = min(z for _, z in fill)
    for k in range(4):
        px = x + 0.7 + 0.4 * k
        pz = max(zs(px) + 0.15, zlo + 0.12)
        if pz > zlo + (top - zlo) * 0.33:
            continue
        st = prim('ico_sphere', f'canto{i}{k}', (px, -0.08, pz), scale=(0.18, 0.08, 0.13), m=M['big'], radius=1, subdivisions=1)
        pop(st, 36.8 + 0.05 * i, s=(0.18, 0.08, 0.13), dur=0.2)

# ---------------------------------------------------------------- 41.9 - 49.5: el agua se lleva la tierra; canales de piedra
for k in range(8):
    i = 2 + (k % 3)
    xx, tp, bs, _, _ = TER[i]
    for m_, tag in ((M['water'], 'a'), (M['fill'], 't')):
        d = prim('uv_sphere', f'cae_{tag}{k}', (0, 0, 0), m=m_, radius=0.07 if tag == 'a' else 0.09, segments=8, ring_count=6)
        key(d, 'scale', 0, Z, 'CONSTANT')
        t = 42.3 + 0.25 * k + (0.1 if tag == 't' else 0)
        while t < 44.8:
            y = 1.0 + 0.3 * (k % 4)
            key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
            key(d, 'location', t, (xx + 0.5, y, tp + 0.05), 'CONSTANT')
            key(d, 'location', t + 0.7, (xx - 0.6, y, TER[i - 1][1] + 0.05), 'LINEAR')
            key(d, 'scale', t + 0.75, Z, 'CONSTANT')
            t += 0.8
CY = 2.4
chan_pts = []
for i in range(NT - 1, -1, -1):
    xx, tp, bs, _, _ = TER[i]
    chan_pts += [(xx + W_ - 0.2, CY, tp + 0.05), (xx + 0.3, CY, tp + 0.05), (xx + 0.15, CY, bs + 0.4)]
chan_pts += [(X0 - 1.0, CY, 0.2), (-14.5, CY, -0.1)]
chan = curve_obj('canal', chan_pts, M['chan'], bevel=0.12)
chan.data.bevel_factor_mapping_end = 'SPLINE'
key(chan.data, 'bevel_factor_end', 0, 0.0, 'CONSTANT')
key(chan.data, 'bevel_factor_end', 45.7, 0.0)
key(chan.data, 'bevel_factor_end', 47.2, 1.0)
for k in range(10):
    d = prim('uv_sphere', f'canal_agua{k}', (0, 0, 0), m=M['water'], radius=0.09, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 47.0 + 0.25 * k
    while t + 2.0 < 49.6 + 0.01:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        n = len(chan_pts)
        for j, p in enumerate(chan_pts):
            key(d, 'location', t + 2.0 * j / (n - 1), (p[0], p[1] - 0.1, p[2] + 0.12), 'LINEAR')
        key(d, 'scale', t + 2.0, Z, 'CONSTANT')
        t += 2.05

# ---------------------------------------------------------------- 49.5 - 56.5: escaleras voladas
SI = 2
xx, tp, bs, _, _ = TER[SI]
steps = []
for k in range(5):
    f = (k + 0.5) / 5
    zz = bs + 0.25 + (tp - bs - 0.3) * f
    xw = xx + LEAN * (zz - bs) / (tp - bs)
    st = box(f'escalon_volado{k}', xw - 0.32, xw + 0.2, 0.9 + 0.32 * k, 1.2 + 0.32 * k, zz - 0.06, zz + 0.06, m=M['wall'])
    pop(st, 53.3 + 0.18 * k, s=(1, 1, 1), dur=0.2)
    steps.append((xw - 0.12, 1.05 + 0.32 * k, zz + 0.06))
pose(P, 8.2, (-7.6, 1.2, zs(-7.6)), (0, 0, -1.2))
pose(P, 21.0, (-7.6, 1.2, zs(-7.6)), (0, 0, -1.2))
pose(P, 21.1, (TER[0][0] + 1.3, 1.5, TER[0][1]), (0, 0, -1.4))   # un solo escalón
pose(P, 23.9, (TER[0][0] + 1.3, 1.5, TER[0][1]), (0, 0, -1.4))
pose(P, 24.0, (TER[0][0] + 1.3, 1.5, TER[0][1]), (0, 0, -1.4))
pose(P, 49.4, (TER[0][0] + 1.3, 1.5, TER[0][1]), (0, 0, -1.4))
pose(P, 49.5, (xx - 0.5, 1.1, TER[SI - 1][1]), (0, 0, 0))   # al pie del muro
for k in range(3):   # intenta trepar y resbala
    pose(P, 49.9 + 0.7 * k, (xx - 0.35, 1.1, TER[SI - 1][1] + 0.5), (0.2, 0, 0), 'BEZIER')
    pose(P, 50.2 + 0.7 * k, (xx - 0.5, 1.1, TER[SI - 1][1]), (0, 0, 0), 'BEZIER')
pose(P, 54.6, (xx - 0.5, 1.1, TER[SI - 1][1]), (0, 0, 0))
for k, (sx, sy, sz) in enumerate(steps):
    pose(P, 54.9 + 0.3 * k, (sx, sy, sz), (0, 0, 0), 'BEZIER')
pose(P, 56.6, (xx + 1.3, steps[-1][1], tp), (0, 0, 0), 'BEZIER')
pose(P, 67.9, (xx + 1.3, steps[-1][1], tp), (0, 0, 0))
pose(P, 68.0, (TER[1][0] + 1.4, 2.6, TER[1][1]), (0, 0, -0.6))

# ---------------------------------------------------------------- 56.5 - 68: drenaje (el giro)
for k in range(18):
    i = 1 + (k % 3)
    xx, tp, bs, _, fill = TER[i]
    zlo = min(z for _, z in fill)
    d = prim('uv_sphere', f'filtra{k}', (0, 0, 0), m=M['water'], radius=0.06, segments=8, ring_count=6)
    key(d, 'scale', 0, Z, 'CONSTANT')
    t = 61.2 + 0.2 * k
    px = xx + 0.9 + 0.35 * (k % 4)
    while t < 64.6:
        key(d, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(d, 'location', t, (px, -0.08, tp - 0.05), 'CONSTANT')
        key(d, 'location', t + 1.0, (px, -0.08, zlo + 0.2), 'LINEAR')
        key(d, 'location', t + 1.6, (xx + 0.3, -0.08, max(zs(xx + 0.3), bs) + 0.1), 'LINEAR')
        key(d, 'scale', t + 1.65, Z, 'CONSTANT')
        t += 1.7
for i in (1, 2, 3):
    xx, tp, bs, _, _ = TER[i]
    arrow_run(f'sale_drenaje{i}', M['blue'], (xx + 0.6, -0.15, bs + 0.35), (xx - 0.7, -0.15, bs + 0.15), (0, 0.15, math.pi), 62.6, 64.8,
              period=1.0, length=0.8)
xx, tp, bs, _, fill = TER[2]
zlo = min(z for _, z in fill)
outline('contorno_capas', rect_xz(xx + 0.2, xx + W_ + 0.05, zlo - 0.1, zlo + (tp - zlo) * 0.58, -0.12), M['orange'],
        (xx + 1.2, -0.12, zlo + 0.6), 57.0, 59.3)

# ---------------------------------------------------------------- 68 - 74: cultivos, llama y cóndor
for i, (x, top, base, wall, fill) in enumerate(TER):
    for k in range(4):
        px = x + 0.9 + 0.4 * k
        py = 1.0 + 0.9 * (k % 3) + 0.3 * i
        if i % 2 == 0:
            pl = prim('uv_sphere', f'papa{i}{k}', (px, py, top + 0.12), scale=(1, 1, 0.6), m=M['leaf'], radius=0.18, segments=10, ring_count=6)
            fl = prim('uv_sphere', f'papa_flor{i}{k}', (px, py, top + 0.25), m=M['potato'], radius=0.05, segments=6, ring_count=4)
            for o in (pl, fl):
                pop(o, 68.5 + 0.06 * i, s=tuple(o.scale), dur=0.2)
        else:
            st = prim('cylinder', f'maiz_tallo{i}{k}', (px, py, top + 0.45), m=M['corn'], radius=0.03, depth=0.9, vertices=6)
            cb = prim('uv_sphere', f'maiz_mazorca{i}{k}', (px + 0.05, py, top + 0.55), scale=(0.6, 0.6, 1.5), m=M['cob'], radius=0.06,
                      segments=8, ring_count=6)
            for o in (st, cb):
                pop(o, 69.3 + 0.06 * i, s=tuple(o.scale), dur=0.2)


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
key(LL, 'scale', 70.1, (1, 1, 1), 'CONSTANT')
key(LL, 'location', 70.1, (TER[3][0] + 1.0, 3.0, TER[3][1]))
key(LL, 'location', 73.9, (TER[3][0] + 1.8, 3.4, TER[3][1]), 'LINEAR')
for k in range(6):   # pasta: baja y sube la cabeza
    key(LL, 'rotation_euler', 70.4 + 0.6 * k, (0, 0.35 if k % 2 else 0.0, 0))
cd = link(bpy.data.objects.new('condor', None))
cps = [prim('uv_sphere', 'cd_cuerpo', (0, 0, 0), scale=(1.6, 0.6, 0.45), m=M['condor'], radius=0.35, segments=12, ring_count=8),
       prim('uv_sphere', 'cd_collar', (0.45, 0, 0.05), m=M['white'], radius=0.14, segments=10, ring_count=6),
       prim('uv_sphere', 'cd_cabeza', (0.62, 0, 0.08), m=M['skin'], radius=0.1, segments=10, ring_count=6)]
for side in (-1, 1):
    wg = box(f'cd_ala{side}', -0.5, 0.5, 0, side * 2.0, -0.03, 0.03, m=M['condor'], origin=(0, 0, 0))
    wg.parent = cd
    for j in range(6):
        key(wg, 'rotation_euler', 71.8 + 0.5 * j, (side * (0.22 if j % 2 else -0.08), 0, 0))
for p in cps:
    p.parent = cd
key(cd, 'scale', 0, Z, 'CONSTANT')
key(cd, 'scale', 71.8, (1.4, 1.4, 1.4), 'CONSTANT')
key(cd, 'location', 71.8, (12, 6, 17))
key(cd, 'location', 74.0, (2, 4, 15), 'LINEAR')
key(cd, 'location', DUR, (-8, 6, 16), 'LINEAR')

# ---------------------------------------------------------------- cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st in ((0, (0.80, 0.86, 0.95), 1.0), (5.1, (0.80, 0.86, 0.95), 1.0), (5.15, (0.55, 0.58, 0.64), 0.7), (8.25, (0.55, 0.58, 0.64), 0.7),
                 (8.3, (0.80, 0.86, 0.95), 1.0), (28.8, (0.80, 0.86, 0.95), 1.0), (28.85, (0.55, 0.58, 0.64), 0.7),
                 (34.05, (0.55, 0.58, 0.64), 0.7), (34.1, (0.80, 0.86, 0.95), 1.0), (74.0, (0.80, 0.86, 0.95), 1.0),
                 (77.0, (0.95, 0.70, 0.55), 0.85)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT' if t < 74 else 'BEZIER')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT' if t < 74 else 'BEZIER')
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(4)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(50), 0, math.radians(-40))
for t, e, c in ((0, 3.6, (1.0, 0.95, 0.86)), (5.1, 3.6, (1.0, 0.95, 0.86)), (5.15, 1.3, (0.8, 0.86, 1.0)), (8.25, 1.3, (0.8, 0.86, 1.0)),
                (8.3, 3.6, (1.0, 0.95, 0.86)), (28.8, 3.6, (1.0, 0.95, 0.86)), (28.85, 1.3, (0.8, 0.86, 1.0)), (34.05, 1.3, (0.8, 0.86, 1.0)),
                (34.1, 3.6, (1.0, 0.95, 0.86)), (74.0, 3.6, (1.0, 0.95, 0.86))):
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')
key(sun, 'energy', 77.0, 2.8)
key(sun, 'color', 77.0, (1.0, 0.70, 0.45))

# ---------------------------------------------------------------- cámara
X1, T1 = TER[0][0], TER[0][1]
X3 = TER[3][0]
camera_shots([
    (0.0, (-1.0, -9.0, 5.0), (-4.5, 1.0, 2.0), (-1.6, -8.4, 4.6), (-4.5, 1.0, 2.0)),
    (5.06, (-2.0, -11.0, 4.0), (-5.0, 1.0, 1.0), (-2.4, -10.6, 3.8), (-5.0, 1.0, 1.0)),
    (8.26, (X1 + 1.2, -6.0, T1 + 0.4), (X1 + 1.2, 0, T1 - 0.6), (X1 + 1.2, -5.5, T1 + 0.4), (X1 + 1.2, 0, T1 - 0.6)),
    (13.7, (X1 + 0.6, -6.2, T1 + 0.2), (X1 + 0.6, 0, T1 - 0.8), (X1 + 0.6, -5.8, T1 + 0.2), (X1 + 0.6, 0, T1 - 0.8)),
    (16.6, (X1 + 3.5, -6.5, T1 + 1.0), (X1 + 0.5, 0.5, T1 - 0.6), (X1 + 3.2, -6.2, T1 + 1.0), (X1 + 0.5, 0.5, T1 - 0.6)),
    (21.08, (X1 + 4.0, -7.0, T1 + 2.5), (X1 + 1.0, 1.5, T1), (X1 + 3.5, -6.8, T1 + 2.4), (X1 + 1.0, 1.5, T1)),
    (23.98, (4.0, -22.0, 9.0), (1.0, 2.0, 5.0), (2.0, -23.0, 9.5), (1.0, 2.0, 5.5)),
    (28.84, (2.0, -17.0, 7.5), (1.0, 0, 5.0), (1.5, -16.5, 7.4), (1.0, 0, 5.0)),
    (34.1, (TER[1][0] + 2.0, -5.0, TER[1][1] + 0.2), (TER[1][0] + 2.0, 0, TER[1][1] - 0.7), (TER[1][0] + 2.0, -4.6, TER[1][1] + 0.1),
     (TER[1][0] + 2.0, 0, TER[1][1] - 0.7)),
    (41.88, (TER[2][0] + 1.0, -9.0, TER[2][1] + 1.5), (TER[2][0] + 1.0, 1.0, TER[2][1]), (TER[2][0] + 1.0, -8.6, TER[2][1] + 1.4),
     (TER[2][0] + 1.0, 1.0, TER[2][1])),
    (44.94, (3.0, -20.0, 8.0), (0.0, 2.4, 4.0), (2.0, -19.0, 7.6), (0.0, 2.4, 4.0)),
    (49.48, (TER[SI][0] + 3.0, -5.0, TER[SI][1] + 0.5), (TER[SI][0], 1.2, TER[SI][1] - 0.6), (TER[SI][0] + 2.6, -4.6, TER[SI][1] + 0.6),
     (TER[SI][0], 1.6, TER[SI][1] - 0.4)),
    (56.48, (TER[2][0] + 1.6, -5.0, TER[2][1] - 0.6), (TER[2][0] + 1.6, 0, TER[2][1] - 1.1), (TER[2][0] + 1.6, -4.7, TER[2][1] - 0.6),
     (TER[2][0] + 1.6, 0, TER[2][1] - 1.1)),
    (64.9, (6.0, -24.0, 10.0), (1.0, 3.0, 5.0), (4.0, -26.0, 11.0), (1.0, 3.0, 5.0)),
    (68.08, (X3 + 4.0, -7.0, TER[3][1] + 3.0), (X3 + 1.0, 2.0, TER[3][1] + 0.5), (X3 + 3.5, -6.5, TER[3][1] + 2.8),
     (X3 + 1.0, 2.5, TER[3][1] + 0.5)),
    (71.8, (X3 + 4.0, -9.0, TER[3][1] + 4.0), (4.0, 4.0, 12.0), (X3 + 3.5, -8.6, TER[3][1] + 4.2), (2.0, 4.0, 13.0)),
    (73.96, (4.0, -22.0, 10.0), (1.0, 4.0, 6.0), (6.0, -36.0, 16.0), (1.0, 6.0, 7.0)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
