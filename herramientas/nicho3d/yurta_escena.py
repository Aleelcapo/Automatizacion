"""Escena 3D de la yurta (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P yurta_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

La pared (khana) y el fieltro están hechos en dos mitades para poder quitar la delantera al
final y mostrar el interior. La puerta mira al sur (-y, hacia la cámara).
"""
import bpy, bmesh, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/yurta'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 65.8  # audio 64.97 s + cola
NF = int(round(DUR * FPS))
random.seed(23)

clean()
sc = bpy.context.scene

M = dict(
    grass=mat('estepa', (0.52, 0.58, 0.28), 0.95),
    hill=mat('colina', (0.45, 0.52, 0.30), 0.95),
    hide=mat('piel_tienda', (0.55, 0.40, 0.25), 0.9),
    pole=mat('palo', (0.50, 0.33, 0.18), 0.8),
    lattice=mat('khana', (0.72, 0.30, 0.15), 0.7),
    band=mat('faja', (0.80, 0.15, 0.12), 0.7),
    crown=mat('corona', (0.85, 0.45, 0.15), 0.6),
    felt=mat('fieltro', (0.93, 0.90, 0.82), 0.95),
    door=mat('puerta', (0.85, 0.30, 0.10), 0.6),
    rug=mat('alfombra', (0.75, 0.15, 0.20), 0.9),
    rug2=mat('alfombra2', (0.15, 0.30, 0.65), 0.9),
    stove=mat('estufa', (0.15, 0.15, 0.16), 0.5),
    teapot=mat('tetera', (0.70, 0.55, 0.20), 0.4, spec=0.7),
    cloth=mat('deel', (0.20, 0.35, 0.65), 0.85),
    sash=mat('cinto', (0.95, 0.75, 0.20), 0.8),
    skin=mat('piel', (0.75, 0.55, 0.40), 0.6),
    hair=mat('pelo', (0.06, 0.05, 0.05), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    horse=mat('caballo', (0.50, 0.30, 0.18), 0.8),
    mane=mat('crin', (0.10, 0.08, 0.06), 0.8),
    camel=mat('camello', (0.75, 0.58, 0.38), 0.9),
    sheep=mat('oveja', (0.95, 0.94, 0.90), 0.95),
    snow=mat('nieve', (0.95, 0.97, 1.0), 0.6),
    sunball=flat_mat('sol_bola', (1.0, 0.85, 0.40), 8.0),
    fire=flat_mat('fuego', (1.0, 0.5, 0.12), 8.0),
    wind=flat_mat('viento', (0.85, 0.92, 1.0), 2.2),
    cold=flat_mat('frio', (0.35, 0.65, 1.0), 3.0),
    hot=flat_mat('empuje', (1.0, 0.35, 0.12), 3.0),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
)

box('suelo', -80, 80, -60, 120, -2, 0, m=M['grass'])
for k in range(7):
    prim('uv_sphere', f'colina{k}', (random.uniform(-60, 60), random.uniform(45, 90), -3), scale=(random.uniform(14, 24), 10, 6),
         m=M['hill'], radius=1, segments=20, ring_count=10)


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


def half_shell(name, r0, r1, z0, z1, side, m, thick=0.08, segs=48):
    """Medio cilindro/cono hueco (side=+1 mitad trasera, -1 delantera)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=segs, radius1=r0, radius2=r1, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2))
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, side, 0), clear_inner=True)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    sol = o.modifiers.new('grosor', 'SOLIDIFY')
    sol.thickness = thick
    return o


P = person('nomada', M['cloth'], M['sash'], M['skin'], M['dark'], M['hair'])
P.rotation_mode = 'XYZ'
pose(P, 0, (2.2, -1.8, 0), (0, 0, 0.5))
pose(P, 43.0, (2.2, -1.8, 0), (0, 0, 0.5))
pose(P, 43.2, (4.5, -3.0, 0), (0, 0, 0.9))
pose(P, 45.8, (3.0, -3.4, 0), (0, 0, 0.9), 'LINEAR')
pose(P, 49.1, (3.0, -3.4, 0), (0, 0, 0.9))
pose(P, 49.2, (2.6, -3.2, 0), (0, 0, 0.5))
pose(P, 56.5, (2.6, -3.2, 0), (0, 0, 0.5))
pose(P, 56.6, (0.9, 0.9, 0), (0, 0, 2.6))   # adentro, junto a la estufa

# ---------------------------------------------------------------- 0 - 7.5: la tienda que se cae
tent = link(bpy.data.objects.new('tienda', None))
for k in range(3):
    a = 2 * math.pi * k / 3
    p = prim('cylinder', f'tienda_palo{k}', (0.55 * math.cos(a), 0.55 * math.sin(a), 1.1), m=M['pole'], radius=0.04, depth=2.4,
             vertices=8, rot=(0.25 * math.sin(a), -0.25 * math.cos(a), 0))
    p.parent = tent
hide = prim('cone', 'tienda_piel', (0, 0, 0.95), m=M['hide'], radius1=1.1, radius2=0.12, depth=1.9, vertices=18)
hide.parent = tent
tent.rotation_mode = 'XYZ'
pop(tent, 1.4, 7.5, s=(1, 1, 1), dur=0.4)
key(tent, 'rotation_euler', 5.8, (0, 0, 0))
key(tent, 'rotation_euler', 6.7, (0, 1.45, 0))
key(tent, 'location', 5.8, (0, 0, 0))
key(tent, 'location', 6.7, (1.0, 0, 0.2))
for k, z in enumerate((0.6, 1.3, 2.0)):
    arrow_run(f'viento_tienda{k}', M['wind'], (-6.0, -0.6, z), (-1.4, -0.6, z), (0, 0, 0), 4.6, 7.4, period=1.0, phase=0.3 * k, length=1.3)

# ---------------------------------------------------------------- 7.5 - 14.6: redonda, palos sueltos que se caen
R, WALLH = 2.6, 1.6
sticks = []
for k in range(24):
    a = 2 * math.pi * k / 24
    s = prim('cylinder', f'palo_suelto{k}', (R * math.cos(a), R * math.sin(a), WALLH / 2), m=M['pole'], radius=0.035, depth=WALLH, vertices=6)
    s.rotation_mode = 'XYZ'
    pop(s, 8.0 + 0.04 * k, 14.6, s=(1, 1, 1), dur=0.15)
    key(s, 'rotation_euler', 13.2, (0, 0, 0))
    key(s, 'rotation_euler', 14.1, (-0.9 * math.sin(a), 0.9 * math.cos(a), 0))
    sticks.append(s)
ring = curve_obj('huella', [(R * math.cos(a), R * math.sin(a), 0.03) for a in [2 * math.pi * j / 48 for j in range(48)]], M['orange'],
                 cyclic=True, bevel=0.03)
pop(ring, 7.8, 11.5, s=(1, 1, 1), dur=0.3)
for k, x in enumerate((-0.9, 0.9)):   # el viento rodea la forma redonda
    side = 1 if x > 0 else -1
    a = arrow(f'rodea{k}', M['wind'], 1.2)
    key(a, 'scale', 0, Z, 'CONSTANT')
    t = 9.4 + 0.3 * k
    while t < 11.5:
        key(a, 'scale', t, (1, 1, 1), 'CONSTANT')
        for j in range(9):
            ang = math.pi + side * math.pi * j / 8
            pos = (-(R + 0.8) * math.cos(math.pi * j / 8) - 1.5 * (j == 0), side * (R + 0.8) * math.sin(math.pi * j / 8) - 0.0, 1.0)
            key(a, 'location', t + 0.12 * j, ((R + 0.8) * math.cos(ang), (R + 0.8) * math.sin(ang), 1.0), 'LINEAR')
            key(a, 'rotation_euler', t + 0.12 * j, (0, 0, ang + side * math.pi / 2), 'LINEAR')
        key(a, 'scale', t + 1.0, Z, 'CONSTANT')
        t += 1.05

# ---------------------------------------------------------------- 14.6 - 20.7: la khana (reja plegable)
lattice = link(bpy.data.objects.new('khana', None))
lat_parts = {'atras': [], 'frente': []}
SLAT_S = {}
nl = 40
for k in range(nl):
    a = 2 * math.pi * (k + 0.5) / nl
    for d in (-1, 1):
        L = WALLH / math.sin(0.8) * 0.98
        sl = prim('cube', f'khana_{k}_{d}', (R * math.cos(a), R * math.sin(a), WALLH / 2), scale=(0.02, L / 2, 0.025), m=M['lattice'])
        sl.rotation_mode = 'XYZ'
        sl.rotation_euler = (d * 0.8, 0, a)
        sl.parent = lattice
        SLAT_S[sl.name] = tuple(sl.scale)
        lat_parts['frente' if math.sin(a) < 0 and abs(math.cos(a)) < 0.985 else 'atras'].append((sl, a))
door_a = -math.pi / 2
for half in ('atras', 'frente'):
    for j, (sl, a) in enumerate(sorted(lat_parts[half], key=lambda q: q[1])):
        if abs(math.atan2(math.sin(a - door_a), math.cos(a - door_a))) < 0.17:
            key(sl, 'scale', 0, Z, 'CONSTANT')   # hueco de la puerta
            continue
        pop(sl, 15.2 + 2.0 * ((a % (2 * math.pi)) / (2 * math.pi)), s=tuple(sl.scale), dur=0.15)
outline('contorno_khana', rect_xz(-R - 0.15, R + 0.15, -0.1, WALLH + 0.15, -R - 0.3), M['orange'], (0, -R - 0.3, WALLH / 2), 19.3, 20.6)
# el techo empuja hacia afuera (21.4 - 23.2) y la faja lo aprieta (24.2)
key(lattice, 'scale', 0, (1, 1, 1), 'CONSTANT')
key(lattice, 'scale', 21.5, (1, 1, 1))
key(lattice, 'scale', 22.6, (1.1, 1.1, 0.94))
key(lattice, 'scale', 24.4, (1.1, 1.1, 0.94))
key(lattice, 'scale', 25.2, (1, 1, 1))
for k in range(6):
    a = 2 * math.pi * k / 6
    arrow_run(f'empuje{k}', M['hot'], (R * 0.8 * math.cos(a), R * 0.8 * math.sin(a), WALLH - 0.2),
              ((R + 1.0) * math.cos(a), (R + 1.0) * math.sin(a), WALLH - 0.2), (0, 0, a), 21.6, 23.4, period=0.9, length=0.8)
band = prim('torus', 'faja', (0, 0, WALLH - 0.05), m=M['band'], major_radius=R + 0.04, minor_radius=0.05, major_segments=64, minor_segments=8)
pop(band, 24.2, s=(1, 1, 1), dur=0.3)

# ---------------------------------------------------------------- 27.3 - 36: varas del techo y la corona
CR, CZ = 0.55, 2.9
rafters = []
for k in range(32):
    a = 2 * math.pi * k / 32
    x0, y0, z0 = R * math.cos(a), R * math.sin(a), WALLH
    x1, y1, z1 = CR * math.cos(a), CR * math.sin(a), CZ
    L = math.dist((x0, y0, z0), (x1, y1, z1))
    rf = prim('cylinder', f'uni{k}', (0, 0, 0), m=M['pole'], radius=0.03, depth=L, vertices=6)
    for v in rf.data.vertices:
        v.co.z += L / 2
    rf.location = (x0, y0, z0)
    tilt = math.atan2(math.hypot(x1 - x0, y1 - y0), z1 - z0)
    rf.rotation_mode = 'XYZ'
    rf.rotation_euler = (0, -tilt, a)
    rafters.append(rf)
    if k % 4 == 0:   # primer intento: unas varas que se caen al centro
        key(rf, 'scale', 0, Z, 'CONSTANT')
        key(rf, 'scale', 28.3, (1, 1, 1), 'CONSTANT')
        key(rf, 'rotation_euler', 28.9, (0, -tilt, a))
        key(rf, 'rotation_euler', 29.6, (0, -tilt * 0.35, a))
        key(rf, 'rotation_euler', 32.7, (0, -tilt * 0.35, a), 'CONSTANT')
        key(rf, 'rotation_euler', 32.8, (0, -tilt, a), 'CONSTANT')
        key(rf, 'scale', 30.4, Z, 'CONSTANT')
        key(rf, 'scale', 32.8, (1, 1, 1), 'CONSTANT')
    else:
        pop(rf, 32.8 + 1.4 * k / 32, s=(1, 1, 1), dur=0.12)
crown = prim('torus', 'corona', (0, 0, CZ), m=M['crown'], major_radius=CR, minor_radius=0.07, major_segments=40, minor_segments=8)
spokes = []
for k in range(4):
    sp = prim('cylinder', f'corona_rayo{k}', (0, 0, CZ), rot=(0, math.pi / 2, math.pi / 4 * k), m=M['crown'], radius=0.03,
              depth=2 * CR, vertices=6)
    spokes.append(sp)
for o in [crown] + spokes:
    key(o, 'location', 0, (0, 0, CZ + 2.0), 'CONSTANT')
    key(o, 'location', 31.3, (0, 0, CZ + 2.0))
    key(o, 'location', 32.3, (0, 0, CZ))
    pop(o, 31.3, s=(1, 1, 1), dur=0.3)
oc = outline('contorno_corona', [(0.95 * math.cos(a), 0, CZ + 0.95 * math.sin(a) * 0.55) for a in [2 * math.pi * j / 40 for j in range(40)]],
             M['orange'], (0, -0.6, CZ), 34.6, 36.1)

# ---------------------------------------------------------------- 36.2 - 43: frío y fieltro (dos mitades)
felt = {}
for side, nm in ((1, 'atras'), (-1, 'frente')):
    w = half_shell(f'fieltro_pared_{nm}', R + 0.07, R + 0.07, 0, WALLH + 0.02, side, M['felt'], thick=0.06)
    r_ = half_shell(f'fieltro_techo_{nm}', R + 0.16, CR + 0.05, WALLH - 0.02, CZ + 0.05, side, M['felt'], thick=0.06)
    felt[nm] = (w, r_)
    pop(w, 40.3, s=(1, 1, 1), dur=0.35)
    pop(r_, 41.2, s=(1, 1, 1), dur=0.35)
doorb = box('puerta', -0.42, 0.42, -0.06, 0.06, 0.0, 1.25, m=M['door'], origin=(0, 0, 0))
doorb.location = (0, -R - 0.11, 0)
pop(doorb, 42.3, s=(1, 1, 1), dur=0.25)
band2 = prim('torus', 'faja_fieltro', (0, 0, WALLH - 0.2), m=M['band'], major_radius=R + 0.12, minor_radius=0.04, major_segments=64,
             minor_segments=8)
pop(band2, 42.6, s=(1, 1, 1), dur=0.25)
for k in range(60):
    f = prim('ico_sphere', f'copo{k}', (0, 0, 0), m=M['snow'], radius=0.05, subdivisions=1)
    x, y = random.uniform(-6, 6), random.uniform(-5, 4)
    key(f, 'scale', 0, Z, 'CONSTANT')
    t = 36.2 + random.uniform(0, 1.0)
    while t < 43.0:
        key(f, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(f, 'location', t, (x, y, 7.0), 'CONSTANT')
        key(f, 'location', t + 2.0, (x + 0.6, y, 0.02), 'LINEAR')
        t += 2.05
    key(f, 'scale', 43.05, Z, 'CONSTANT')
snowcap = prim('cylinder', 'nieve_suelo', (0, 0, 0.01), m=M['snow'], radius=12, depth=0.02, vertices=40)
pop(snowcap, 37.0, 43.1, s=(1, 1, 1), dur=1.2)

# ---------------------------------------------------------------- 43 - 49: mudanza: se desarma y va en camellos
yurt_parts = [lattice, band, crown, band2, doorb] + spokes + rafters + [felt['atras'][0], felt['atras'][1], felt['frente'][0], felt['frente'][1]]
for o in yurt_parts:   # todas las piezas tienen escala completa (1, 1, 1)
    key(o, 'scale', 46.3 + random.uniform(0, 0.9), (1, 1, 1), 'BEZIER')
    key(o, 'scale', 47.4, Z, 'CONSTANT')
    key(o, 'scale', 49.2, (1, 1, 1), 'CONSTANT')


def camel(name):
    root = link(bpy.data.objects.new(name, None))
    ps = [prim('uv_sphere', name + '_cuerpo', (0, 0, 1.3), scale=(1.5, 0.6, 0.6), m=M['camel'], radius=0.6, segments=16, ring_count=10),
          prim('uv_sphere', name + '_joroba1', (-0.35, 0, 1.75), m=M['camel'], radius=0.32, segments=12, ring_count=8),
          prim('uv_sphere', name + '_joroba2', (0.35, 0, 1.75), m=M['camel'], radius=0.32, segments=12, ring_count=8),
          prim('cylinder', name + '_cuello', (1.0, 0, 1.75), rot=(0, 0.5, 0), m=M['camel'], radius=0.12, depth=0.9, vertices=8),
          prim('uv_sphere', name + '_cabeza', (1.25, 0, 2.2), scale=(1.4, 0.8, 0.8), m=M['camel'], radius=0.16, segments=12, ring_count=8),
          box(name + '_carga', -0.7, 0.7, -0.75, 0.75, 1.9, 2.35, m=M['felt']),
          box(name + '_carga2', -0.5, 0.5, -0.8, 0.8, 1.55, 1.95, m=M['lattice'])]
    for x in (0.6, -0.6):
        for y in (-0.2, 0.2):
            ps.append(prim('cylinder', f'{name}_pata{x}{y}', (x, y, 0.55), m=M['camel'], radius=0.08, depth=1.1, vertices=8))
    for p in ps:
        p.parent = root
    return root


for k in range(2):
    cm = camel(f'camello{k}')
    pop(cm, 47.6 + 0.3 * k, 49.2, s=(1, 1, 1), dur=0.3)
    key(cm, 'location', 47.6, (-1.5 + 3.2 * k, 0.5, 0))
    key(cm, 'location', 49.1, (-4.0 + 3.2 * k, 0.5, 0), 'LINEAR')
for k in range(6):
    sh = prim('uv_sphere', f'oveja{k}', (0, 0, 0), scale=(1.4, 1, 1), m=M['sheep'], radius=0.3, segments=12, ring_count=8)
    hd = prim('uv_sphere', f'oveja_cabeza{k}', (0.38, 0, 0.1), m=M['dark'], radius=0.12, segments=10, ring_count=6)
    hd.parent = sh
    pop(sh, 43.4 + 0.1 * k, 49.2, s=(1.4, 1, 1), dur=0.2)
    key(sh, 'location', 43.4, (6.0 + 0.8 * k, -2.0 - 0.6 * (k % 2), 0.32))
    key(sh, 'location', 49.1, (1.0 + 0.8 * k, -2.6 - 0.6 * (k % 2), 0.32), 'LINEAR')

# ---------------------------------------------------------------- 49.2 - 56.6: puerta al sur, viento del norte, sol del sur
for k, x in enumerate((-1.5, 0.0, 1.5)):
    arrow_run(f'viento_norte{k}', M['cold'], (x, 9.0, 1.4), (x, R + 0.6, 1.4), (0, 0, -math.pi / 2), 52.4, 56.4, period=1.1,
              phase=0.3 * k, length=1.3)
sunb = prim('uv_sphere', 'sol_cielo', (0, 0, 0), m=M['sunball'], radius=1.2, segments=16, ring_count=8)
key(sunb, 'scale', 0, Z, 'CONSTANT')
key(sunb, 'scale', 54.9, (1, 1, 1), 'CONSTANT')
for j in range(9):
    a = math.pi * j / 8
    key(sunb, 'location', 54.9 + 0.2 * j, (16 * math.cos(a), -22, 2 + 9 * math.sin(a)), 'LINEAR')
key(sunb, 'scale', 56.6, Z, 'CONSTANT')

# ---------------------------------------------------------------- 56.6 - 62.5: adentro (se quita la mitad delantera)
for o in [felt['frente'][0], felt['frente'][1], doorb] + [sl for sl, a in lat_parts['frente']]:
    key(o, 'scale', 56.55, SLAT_S.get(o.name, (1, 1, 1)), 'CONSTANT')
    key(o, 'scale', 56.6, Z, 'CONSTANT')
rug = prim('cylinder', 'alfombra', (0, 0.2, 0.02), m=M['rug'], radius=1.9, depth=0.03, vertices=40)
rug2 = prim('cylinder', 'alfombra_borde', (0, 0.2, 0.025), m=M['rug2'], radius=1.4, depth=0.03, vertices=40)
for o in (rug, rug2):
    pop(o, 57.1, s=(1, 1, 1), dur=0.25)
stove = box('estufa', -0.35, 0.35, 0.0, 0.6, 0, 0.6, m=M['stove'])
pipe = prim('cylinder', 'chimenea', (0, 0.3, (0.6 + CZ + 0.4) / 2), m=M['stove'], radius=0.07, depth=CZ + 0.4 - 0.6, vertices=10)
sfire = box('estufa_fuego', -0.15, 0.15, -0.01, 0.0, 0.1, 0.35, m=M['fire'])
pot = prim('uv_sphere', 'tetera', (0, 0.25, 0.72), scale=(1, 1, 0.8), m=M['teapot'], radius=0.15, segments=14, ring_count=8)
spout = prim('cone', 'pico_tetera', (0.18, 0.25, 0.78), rot=(0, 1.0, 0), m=M['teapot'], radius1=0.04, depth=0.18, vertices=8)
for o in (stove, pipe, sfire):
    pop(o, 58.6, s=(1, 1, 1), dur=0.25)
for o in (pot, spout):
    pop(o, 58.9, s=tuple(o.scale), dur=0.25)
Ls = bpy.data.lights.new('luz_estufa', 'POINT')
Ls.color = (1.0, 0.55, 0.25)
ls_ = link(bpy.data.objects.new('luz_estufa', Ls))
ls_.location = (0, -0.4, 0.6)
key(Ls, 'energy', 0, 0, 'CONSTANT')
key(Ls, 'energy', 58.6, 0)
key(Ls, 'energy', 58.9, 60)


def horse(name):
    root = link(bpy.data.objects.new(name, None))
    ps = [prim('uv_sphere', name + '_cuerpo', (0, -1.0, 1.15), scale=(0.55, 1.5, 0.6), m=M['horse'], radius=0.55, segments=16, ring_count=10),
          prim('cylinder', name + '_cuello', (0, 0.0, 1.55), rot=(0.9, 0, 0), m=M['horse'], radius=0.17, depth=0.9, vertices=10),
          prim('uv_sphere', name + '_cabeza', (0, 0.42, 1.75), scale=(0.7, 1.6, 0.8), m=M['horse'], radius=0.18, segments=12, ring_count=8),
          box(name + '_crin', -0.04, 0.04, -0.25, 0.25, 0, 0.12, m=M['mane']),
          prim('uv_sphere', name + '_ojo1', (-0.12, 0.5, 1.82), m=M['dark'], radius=0.025, segments=6, ring_count=4),
          prim('uv_sphere', name + '_ojo2', (0.12, 0.5, 1.82), m=M['dark'], radius=0.025, segments=6, ring_count=4)]
    ps[3].location = (0, -0.05, 1.7)
    ps[3].rotation_euler = (0.9, 0, 0)
    for p in ps:
        p.parent = root
    return root


H = horse('caballo')
H.location = (0, -R - 1.9, -0.25)
H.rotation_euler = (0, 0, 0)
pop(H, 60.2, s=(1, 1, 1), dur=0.3)
key(H, 'location', 60.5, (0, -R - 1.9, -0.25))
key(H, 'location', 61.3, (0, -R - 1.25, -0.25))

# ---------------------------------------------------------------- cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st in ((0, (0.55, 0.72, 0.95), 0.9), (36.15, (0.55, 0.72, 0.95), 0.9), (36.2, (0.62, 0.66, 0.72), 0.75), (42.95, (0.62, 0.66, 0.72), 0.75),
                 (43.0, (0.55, 0.72, 0.95), 0.9), (62.0, (0.55, 0.72, 0.95), 0.9), (64.5, (0.80, 0.55, 0.42), 0.75)):
    node_key(bg.inputs['Color'], t, (*c, 1), 'CONSTANT' if t < 62 else 'BEZIER')
    node_key(bg.inputs['Strength'], t, st, 'CONSTANT' if t < 62 else 'BEZIER')
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(5)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(48), 0, math.radians(-25))
for t, e, c in ((0, 3.4, (1.0, 0.95, 0.86)), (36.15, 3.4, (1.0, 0.95, 0.86)), (36.2, 1.4, (0.8, 0.86, 1.0)), (42.95, 1.4, (0.8, 0.86, 1.0)),
                (43.0, 3.4, (1.0, 0.95, 0.86)), (62.0, 3.4, (1.0, 0.95, 0.86))):
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')
key(sun, 'energy', 64.5, 2.6)
key(sun, 'color', 64.5, (1.0, 0.70, 0.45))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (2.5, -7.0, 2.0), (0.3, 0, 1.0), (2.0, -6.4, 1.9), (0.3, 0, 1.0)),
    (4.48, (-1.0, -8.0, 2.0), (-0.5, 0, 0.9), (-0.6, -7.6, 1.9), (-0.3, 0, 0.9)),
    (7.52, (2.0, -9.5, 7.5), (0, 0, 0.3), (1.0, -9.0, 7.0), (0, 0, 0.3)),
    (11.58, (4.0, -7.5, 2.4), (0, 0, 0.8), (3.4, -7.0, 2.3), (0, 0, 0.8)),
    (14.64, (3.0, -8.5, 2.6), (0, 0, 0.8), (1.5, -8.8, 2.4), (0, 0, 0.8)),
    (20.68, (5.0, -7.5, 4.5), (0, 0, 1.2), (4.2, -7.2, 4.2), (0, 0, 1.2)),
    (27.3, (3.5, -7.5, 5.5), (0, 0, 2.0), (2.5, -7.4, 5.8), (0, 0, 2.2)),
    (34.56, (0.4, -4.6, 3.8), (0, 0, CZ), (0.3, -4.3, 3.7), (0, 0, CZ)),
    (36.18, (4.0, -9.0, 3.2), (0, 0, 1.5), (3.2, -8.6, 3.0), (0, 0, 1.5)),
    (43.24, (6.0, -11.0, 3.0), (1.5, 0, 1.0), (5.0, -10.5, 2.8), (1.0, 0, 1.0)),
    (49.18, (0.0, -10.5, 2.2), (0, 0, 1.3), (0.0, -10.0, 2.2), (0, 0, 1.3)),
    (52.28, (5.0, -13.0, 4.5), (0, 0, 2.0), (4.0, -14.0, 5.0), (0, 0, 3.0)),
    (56.62, (1.2, -6.5, 2.2), (0, 0.5, 0.9), (0.8, -6.0, 2.1), (0, 0.5, 0.9)),
    (60.0, (3.8, -4.4, 2.3), (0, -R - 0.4, 1.4), (3.5, -4.2, 2.2), (0, -R - 0.4, 1.4)),
    (62.48, (5.0, -11.0, 4.0), (0, 0, 1.4), (10.0, -22.0, 9.0), (0, 0, 1.4)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
