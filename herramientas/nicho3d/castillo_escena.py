"""Escena 3D del castillo (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P castillo_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Vista exterior casi todo el tiempo; el terreno delantero (y < 0) desaparece mientras se ve
el corte del túnel y del foso. El primer plano de la saetera está montado aparte (x = 40).
"""
import bpy, bmesh, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/castillo'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 54.7  # audio 53.94 s + cola
NF = int(round(DUR * FPS))
random.seed(3)

clean()
sc = bpy.context.scene

M = dict(
    grass=mat('pasto', (0.36, 0.55, 0.22), 0.9),
    dirt=mat('tierra_corte', (0.45, 0.30, 0.18), 0.95),
    hole=mat('tierra_hueco', (0.30, 0.20, 0.12), 0.95),
    stone=mat('piedra', (0.62, 0.60, 0.56), 0.85),
    stone2=mat('piedra_oscura', (0.48, 0.46, 0.43), 0.85),
    log=mat('tronco', (0.45, 0.30, 0.17), 0.85),
    burnt=mat('quemado', (0.08, 0.06, 0.05), 0.9),
    wood=mat('madera', (0.50, 0.33, 0.18), 0.8),
    thatch=mat('paja', (0.78, 0.64, 0.32), 0.9),
    iron=mat('hierro', (0.15, 0.15, 0.17), 0.4, spec=0.7),
    water=mat('agua', (0.18, 0.45, 0.70), 0.1, alpha=0.88),
    red=mat('rojo', (0.72, 0.10, 0.08), 0.8),
    blue=mat('azul', (0.15, 0.25, 0.60), 0.8),
    skin=mat('piel', (0.75, 0.55, 0.40), 0.6),
    hair=mat('pelo', (0.30, 0.18, 0.08), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    flag=mat('estandarte', (0.80, 0.12, 0.10), 0.7),
    flag2=mat('estandarte2', (0.95, 0.80, 0.20), 0.7),
    cat=mat('gato', (0.90, 0.55, 0.20), 0.8),
    mouse=mat('raton', (0.55, 0.55, 0.58), 0.8),
    fire=flat_mat('fuego', (1.0, 0.45, 0.10), 8.0),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
    arrowm=mat('flecha', (0.85, 0.80, 0.70), 0.6),
)

# ---------------------------------------------------------------- terreno (trasero siempre, delantero solo afuera)
back = box('suelo', -40, 40, 0, 60, -30, 0, mats=[M['grass'], M['dirt']])
front = box('suelo_frente', -40, 40, -40, 0, -30, 0, mats=[M['grass'], M['dirt']])
for g in (back, front):
    face_mats(g, lambda n: 1 if n.z < 0.5 else 0)
CUT_SHOW = [(0, 18.6), (25.9, 99)]   # tramos con el terreno delantero visible


def front_only(o):
    """Objeto que solo existe con el terreno delantero (se va durante el corte)."""
    s = tuple(o.scale)
    key(o, 'scale', 0, s, 'CONSTANT')
    key(o, 'scale', 18.6, Z, 'CONSTANT')
    key(o, 'scale', 25.9, s, 'CONSTANT')


front_only(front)


def hide_cut(o, s_full):
    """Oculta durante el corte (18.6 - 25.9) un objeto que ya terminó su animación de escala."""
    key(o, 'scale', 18.55, s_full, 'CONSTANT')
    key(o, 'scale', 18.6, Z, 'CONSTANT')
    key(o, 'scale', 25.9, s_full, 'CONSTANT')


def cutter(name, x0, x1, y0, y1, z0, z1, t0, t1, axis='z', anchor=None):
    """Excavación que crece entre t0 y t1 (en z desde arriba, o en x desde 'anchor')."""
    if axis == 'z':
        org = ((x0 + x1) / 2, (y0 + y1) / 2, z1)
        s0 = (1, 1, 0.02)
    else:
        org = (anchor, (y0 + y1) / 2, (z0 + z1) / 2)
        s0 = (0.02, 1, 1)
    c = box(name, x0, x1, y0, y1, z0, z1, m=M['hole'], origin=org)
    key(c, 'location', 0, (org[0], org[1], 40), 'CONSTANT')
    key(c, 'location', t0, org, 'CONSTANT')
    key(c, 'scale', 0, s0, 'CONSTANT')
    key(c, 'scale', t0, s0)
    key(c, 'scale', t1, (1, 1, 1))
    for g in (back, front):
        md = g.modifiers.new('cut_' + name, 'BOOLEAN')
        md.object = c
        md.operation = 'DIFFERENCE'
        md.solver = 'EXACT'
        md.material_mode = 'TRANSFER'
    c.hide_render = True
    c.display_type = 'WIRE'
    return c


MI, MO, MD = 4.0, 5.6, -1.8   # foso: borde interior, exterior, fondo
cutter('foso_frente', -MO, MO, -MO, -MI, MD, 0.1, 21.3, 23.0)
cutter('foso_atras', -MO, MO, MI, MO, MD, 0.1, 21.3, 23.0)
cutter('foso_izq', -MO, -MI, -MO, MO, MD, 0.1, 21.3, 23.0)
cutter('foso_der', MI, MO, -MO, MO, MD, 0.1, 21.3, 23.0)
cutter('tunel', -9.0, -2.2, -0.45, 0.45, -1.5, -0.6, 18.9, 20.9, axis='x', anchor=-9.0)
cutter('rampa_tunel', -9.6, -8.6, -0.45, 0.45, -1.5, 0.1, 18.8, 19.0)

# agua del foso (pedazos delanteros se ocultan en el corte)
water_parts = [(-MO, MO, -MO, -MI, True), (-MO, MO, MI, MO, False),
               (-MO, -MI, -MI, 0, True), (-MO, -MI, 0, MI, False), (MI, MO, -MI, 0, True), (MI, MO, 0, MI, False)]
for k, (x0, x1, y0, y1, fr) in enumerate(water_parts):
    w = box(f'agua{k}', x0 + 0.02, x1 - 0.02, y0 + 0.02 * (y0 < 0), y1, MD + 0.02, -0.25, m=M['water'],
            origin=((x0 + x1) / 2, (y0 + y1) / 2, MD))
    key(w, 'scale', 0, Z, 'CONSTANT')
    if fr:
        key(w, 'scale', 25.9, (1, 1, 1), 'CONSTANT')
    else:
        key(w, 'scale', 23.3, (1, 1, 0.02), 'BEZIER')
        key(w, 'scale', 24.3, (1, 1, 1))
# el foso inunda el túnel
tw = box('agua_tunel', -5.6, -2.25, -0.4, 0.42, -1.48, -0.62, m=M['water'], origin=(-4.0, 0, -1.48))
key(tw, 'scale', 0, Z, 'CONSTANT')
key(tw, 'scale', 23.7, (0.02, 1, 1), 'BEZIER')
key(tw, 'scale', 24.6, (1, 1, 1))

# ---------------------------------------------------------------- choza y empalizada (0 - 7.4)
hut = box('choza', -1.0, 1.0, -0.8, 0.8, 0, 1.3, m=M['wood'])
hroof = prim('cone', 'choza_techo', (0, 0, 1.75), m=M['thatch'], radius1=1.5, depth=1.0, vertices=4, rot=(0, 0, math.pi / 4))
for o in (hut, hroof):
    cut(o, 0, 12.4)
logs = []
P0 = 3.3
side_pts = []
n = 9
for k in range(n):
    f = -P0 + 2 * P0 * k / (n - 1)
    side_pts += [(f, -P0), (f, P0)]
    if 0 < k < n - 1:
        side_pts += [(-P0, f), (P0, f)]
side_pts.sort(key=lambda p: math.atan2(p[1], p[0]))
for k, (x, y) in enumerate(side_pts):
    lg = prim('cylinder', f'tronco{k}', (x, y, 0.9), m=M['log'], radius=0.16, depth=1.8, vertices=10)
    lg.data.materials.append(M['burnt'])
    t = 2.3 + 2.1 * k / len(side_pts)
    pop(lg, t, 7.3, s=(1, 1, 1), dur=0.2)
    logs.append(lg)
    fl = prim('cone', f'llama{k}', (x, y, 1.9), m=M['fire'], radius1=0.22, depth=0.7, vertices=8)
    pop(fl, 5.7 + random.uniform(0, 0.8), 7.3, s=(1, 1, 1), dur=0.2)
    for j in range(5):
        key(fl, 'scale', 6.0 + j * 0.25, (1, 1, random.uniform(0.7, 1.4)))
fire_light = bpy.data.lights.new('luz_fuego', 'POINT')
fire_light.color = (1.0, 0.5, 0.15)
fo = link(bpy.data.objects.new('luz_fuego', fire_light))
fo.location = (0, -4.5, 2.5)
for t, e in ((0, 0), (5.7, 0), (6.2, 900), (7.1, 900), (7.4, 0)):
    key(fire_light, 'energy', t, e)
# los troncos se ennegrecen
lm = M['log'].node_tree.nodes['Principled BSDF']
node_key(lm.inputs['Base Color'], 0, (0.45, 0.30, 0.17, 1))
node_key(lm.inputs['Base Color'], 6.0, (0.45, 0.30, 0.17, 1))
node_key(lm.inputs['Base Color'], 7.0, (0.06, 0.05, 0.04, 1))

# ---------------------------------------------------------------- muros, torres y torre del homenaje
W = 3.0     # semilado del recinto
T = 0.55    # grosor de muro
H1, H2 = 2.2, 4.4
walls = []
wall_specs = [('muro_atras', -W, W, W - T, W), ('muro_izq', -W, -W + T, -W + T, W - T), ('muro_der', W - T, W, -W + T, W - T),
              ('muro_frente_a', -W, -0.75, -W, -W + T), ('muro_frente_b', 0.75, W, -W, -W + T)]
for name, x0, x1, y0, y1 in wall_specs:
    o = box(name, x0, x1, y0, y1, 0, H2, m=M['stone'], origin=((x0 + x1) / 2, (y0 + y1) / 2, 0))
    key(o, 'scale', 0, Z, 'CONSTANT')
    key(o, 'scale', 7.5, (1, 1, 0.02), 'BEZIER')
    key(o, 'scale', 9.2, (1, 1, H1 / H2))
    key(o, 'scale', 12.5, (1, 1, H1 / H2))
    key(o, 'scale', 14.2, (1, 1, 1))
    if y1 <= 0:
        hide_cut(o, (1, 1, 1))
    walls.append(o)
lintel = box('dintel', -0.75, 0.75, -W, -W + T, 2.4, H2, m=M['stone'], origin=(0, -W + T / 2, 0))
key(lintel, 'scale', 0, Z, 'CONSTANT')
key(lintel, 'scale', 12.5, (1, 1, 0.02), 'BEZIER')
key(lintel, 'scale', 14.2, (1, 1, 1))
hide_cut(lintel, (1, 1, 1))
towers = []
for k, (x, y) in enumerate(((-W, -W), (W, -W), (-W, W), (W, W))):
    tw_ = prim('cylinder', f'torre{k}', (x, y, 0), m=M['stone2'], radius=0.95, depth=2, vertices=24)
    for v in tw_.data.vertices:
        v.co.z += 1
    tw_.location = (x, y, 0)
    key(tw_, 'scale', 0, Z, 'CONSTANT')
    key(tw_, 'scale', 12.5, (1, 1, 0.02), 'BEZIER')
    key(tw_, 'scale', 14.3, (1, 1, (H2 + 1.0) / 2))
    if y < 0:
        hide_cut(tw_, (1, 1, (H2 + 1.0) / 2))
    towers.append(tw_)
keep = box('torre_homenaje', -1.2, 1.2, -0.2, 2.2, 0, 6.0, m=M['stone2'], origin=(0, 1.0, 0))
key(keep, 'scale', 0, Z, 'CONSTANT')
key(keep, 'scale', 12.5, (1, 1, 0.02), 'BEZIER')
key(keep, 'scale', 14.4, (1, 1, 1))
# almenas sobre muros y torres (15.1)
merlons = []
for name, x0, x1, y0, y1 in wall_specs:
    L = max(x1 - x0, y1 - y0)
    along_x = (x1 - x0) > (y1 - y0)
    nm = max(1, int(L / 0.7))
    for j in range(nm):
        f = (j + 0.5) / nm
        x = x0 + (x1 - x0) * f if along_x else (x0 + x1) / 2
        y = (y0 + y1) / 2 if along_x else y0 + (y1 - y0) * f
        mm = prim('cube', f'almena_{name}_{j}', (x, y, H2 + 0.22), scale=(0.18 if not along_x else 0.2, 0.2 if not along_x else 0.18, 0.22),
                  m=M['stone'])
        pop(mm, 15.1 + 0.6 * j / nm, s=tuple(mm.scale), dur=0.15)
        if y < 0:
            hide_cut(mm, tuple(mm.scale))
        merlons.append(mm)
for k, (x, y) in enumerate(((-W, -W), (W, -W), (-W, W), (W, W))):
    for j in range(8):
        a = 2 * math.pi * j / 8
        mm = prim('cube', f'almena_torre{k}_{j}', (x + 0.82 * math.cos(a), y + 0.82 * math.sin(a), H2 + 1.0 + 0.2),
                  scale=(0.16, 0.16, 0.2), rot=(0, 0, a), m=M['stone2'])
        pop(mm, 15.4 + 0.05 * j, s=tuple(mm.scale), dur=0.15)
        if y < 0:
            hide_cut(mm, tuple(mm.scale))

# ---------------------------------------------------------------- personas
def soldier(name):
    p = person(name, M['red'], M['iron'], M['skin'], M['dark'])
    helm = prim('uv_sphere', name + '_casco', (0, 0, 1.3), scale=(1.08, 1.08, 0.8), m=M['iron'], radius=0.18, segments=14, ring_count=8)
    helm.parent = p
    return p


def defender(name):
    return person(name, M['blue'], M['flag2'], M['skin'], M['dark'], M['hair'])


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


# escaleras y soldados trepando (9.9 - 12.4)
for k, x in enumerate((-1.8, 1.8)):
    lad = link(bpy.data.objects.new(f'escalera{k}', None))
    for side in (-0.25, 0.25):
        r = prim('cylinder', f'esc{k}_lado{side}', (side, 0, 1.3), m=M['wood'], radius=0.04, depth=2.6, vertices=6)
        r.parent = lad
    for j in range(7):
        r = prim('cylinder', f'esc{k}_pelda{j}', (0, 0, 0.2 + 0.37 * j), rot=(0, math.pi / 2, 0), m=M['wood'], radius=0.03,
                 depth=0.5, vertices=6)
        r.parent = lad
    lad.location = (x, -W - 0.7, 0)
    lad.rotation_euler = (-0.27, 0, 0)
    pop(lad, 10.2 + 0.2 * k, 18.6, s=(1, 1, 1), dur=0.25)
    sd = soldier(f'trepador{k}')
    pose(sd, 0, (x, -W - 0.8, 40))
    pose(sd, 10.5, (x, -W - 1.2, 0), (0, 0, 0))
    pose(sd, 12.2, (x, -W - 0.75, 1.5), (0, 0, 0), 'BEZIER')
    pose(sd, 14.3, (x, -W - 0.75, 1.5), (0, 0, 0), 'BEZIER')
    pose(sd, 15.0, (x, -W - 1.6, 0.0), (0.6, 0, 0), 'BEZIER')
    pose(sd, 18.5, (x, -W - 1.6, 0.0), (0.6, 0, 0))
    pose(sd, 18.6, (x, -W - 1.6, 40))
# arquero en la muralla (16.6 - 18.4)
arch = defender('arquero')
pose(arch, 0, (0.3, -W + 0.3, 40))
pose(arch, 15.6, (-1.8, -W + 0.3, H2), (0, 0, 0))
pose(arch, 46.0, (-1.8, -W + 0.3, H2), (0, 0, 0))
pose(arch, 46.05, (-1.8, -W + 0.3, 40), (0, 0, 0))
for k in range(3):
    a = prim('cylinder', f'flecha_sale{k}', (0, 0, 0), rot=(math.pi / 2, 0, 0), m=M['arrowm'], radius=0.02, depth=0.6, vertices=6)
    t = 16.9 + 0.5 * k
    pop(a, t, t + 0.6, s=(1, 1, 1), dur=0.05)
    key(a, 'location', t, (-1.8 + 0.6 * k, -W - 0.2, H2 + 0.9))
    key(a, 'location', t + 0.6, (-1.8 + 0.6 * k, -W - 6.0, H2 - 1.0), 'LINEAR')

# túnel enemigo (18.6 - 24.6)
miner = soldier('minero')
pose(miner, 0, (-8.6, 0.25, 40))
pose(miner, 18.6, (-8.8, 0.25, -1.5), (0, 0, 0))
pose(miner, 20.8, (-3.2, 0.25, -1.5), (0.35, 0, 0), 'BEZIER')
pose(miner, 23.6, (-3.2, 0.25, -1.5), (0.35, 0, 0), 'BEZIER')
pose(miner, 24.4, (-8.0, 0.25, -1.5), (0.1, 0, 0), 'BEZIER')
pose(miner, 25.0, (-9.1, 0.25, 0.05), (0, 0, 0), 'BEZIER')
pose(miner, 25.8, (-9.1, 0.25, 40))
outline('contorno_foso', rect_xz(-MO - 0.08, -MI + 0.08, MD - 0.08, 0.15, -0.1), M['orange'], (-4.8, -0.1, -0.8), 25.0, 25.9)

# el defensor no puede salir (25.9 - 27.7) y luego cruza el puente
hero = defender('defensor')
pose(hero, 0, (0, -1.0, 40))
pose(hero, 25.9, (0.0, -1.5, 0), (0, 0, 0))
pose(hero, 26.6, (0.0, -3.8, 0), (0, 0, 0), 'BEZIER')
pose(hero, 30.4, (0.0, -3.8, 0), (0, 0, 0), 'BEZIER')
pose(hero, 31.0, (0.0, -7.0, 0), (0, 0, 0), 'BEZIER')
pose(hero, 32.9, (0.0, -7.0, 0), (0, 0, 0))
pose(hero, 32.95, (0.0, -7.0, 40))

# puente levadizo (27.7 - 32.7)
bridge = box('puente', -0.72, 0.72, -1.75, 0, -0.08, 0.08, m=M['wood'], origin=(0, 0, 0))
bridge.location = (0, -W - 1.0, 0.1)
bridge.rotation_mode = 'XYZ'
pop(bridge, 28.6, s=(1, 1, 1), dur=0.25)
key(bridge, 'rotation_euler', 0, (-math.pi / 2, 0, 0), 'CONSTANT')
key(bridge, 'rotation_euler', 29.6, (-math.pi / 2, 0, 0))
key(bridge, 'rotation_euler', 30.4, (0, 0, 0))
for k, x in enumerate((-0.6, 0.6)):
    ch = curve_obj(f'cadena{k}', [(x, -W - 1.0, 0.1 + 1.75), (x, -W - 0.05, 2.3)], M['iron'], bevel=0.03)
    pop(ch, 28.7, s=(1, 1, 1), dur=0.2)
    key(ch.data.splines[0].points[0], 'co', 29.6, (x, -W - 1.0, 1.85, 1))
    key(ch.data.splines[0].points[0], 'co', 30.4, (x, -W - 2.7, 0.15, 1))
outline('contorno_puente', rect_xz(-0.95, 0.95, -0.15, 2.4, -W - 2.9), M['orange'], (0, -W - 2.9, 1.0), 31.0, 32.9)
# puerta de madera que derriban (33 - 34.8)
gate = box('porton', -0.74, 0.74, -W + 0.15, -W + 0.3, 0, 2.38, m=M['wood'])
cut(gate, 12.6)
key(gate, 'rotation_euler', 0, (0, 0, 0), 'CONSTANT')
key(gate, 'location', 0, tuple(gate.location), 'CONSTANT')
key(gate, 'location', 34.0, tuple(gate.location))
key(gate, 'rotation_euler', 34.0, (0, 0, 0))
key(gate, 'rotation_euler', 34.5, (1.45, 0, 0))
key(gate, 'location', 34.5, (gate.location[0], gate.location[1] + 1.1, 0.12))
attackers = []
for k in range(4):
    a = soldier(f'atacante{k}')
    x = -0.45 + 0.3 * k
    pose(a, 0, (x, -12, 40))
    pose(a, 32.9, (x, -11 - 0.8 * k, 0), (0, 0, 0))
    pose(a, 34.2, (x, -4.4 - 0.5 * k, 0), (0, 0, 0), 'LINEAR')
    pose(a, 34.8, (x, -3.7 - 0.45 * k, 0), (0, 0, 0), 'LINEAR')
    pose(a, 36.9, (x, -3.7 - 0.45 * k, 0), (0, 0, 0))
    pose(a, 37.2, (x, -4.6 - 0.45 * k, 0), (0.15, 0, 0), 'BEZIER')
    pose(a, 37.9, (x, -4.9 - 0.4 * k, 0), (0.15, 0, 0))
    pose(a, 38.0, (x, -4.9 - 0.4 * k, 40))
# reja de hierro (35.2 - 37.8)
grate = link(bpy.data.objects.new('reja', None))
for j in range(6):
    b = prim('cylinder', f'reja_v{j}', (-0.62 + 0.25 * j, 0, 1.2), m=M['iron'], radius=0.035, depth=2.5, vertices=8)
    b.parent = grate
    sp = prim('cone', f'reja_punta{j}', (-0.62 + 0.25 * j, 0, -0.12), rot=(math.pi, 0, 0), m=M['iron'], radius1=0.05, depth=0.2,
              vertices=8)
    sp.parent = grate
for j in range(5):
    b = prim('cylinder', f'reja_h{j}', (0, 0, 0.2 + 0.5 * j), rot=(0, math.pi / 2, 0), m=M['iron'], radius=0.03, depth=1.4, vertices=8)
    b.parent = grate
grate.location = (0, -W + 0.08, 2.4)
key(grate, 'location', 0, (0, -W + 0.08, 2.4), 'CONSTANT')
pop(grate, 35.4, s=(1, 1, 1), dur=0.25)
key(grate, 'location', 36.7, (0, -W + 0.08, 2.4))
key(grate, 'location', 37.0, (0, -W + 0.08, 0.1), 'LINEAR')

# ---------------------------------------------------------------- saetera (38 - 46.4), maqueta aparte en x = 40
SX = 25.0
slit = []
sw = 1.6   # grosor del muro
for side in (-1, 1):
    me = bpy.data.meshes.new(f'saetera{side}')
    bm = bmesh.new()
    # planta: el hueco mide 0.12 afuera (y=-sw/2) y 1.1 adentro (y=+sw/2)
    outer, inner = 0.06, 0.55
    pts = [(side * outer, -sw / 2), (side * 3.0, -sw / 2), (side * 3.0, sw / 2), (side * inner, sw / 2)]
    vs = [bm.verts.new((SX + x, y, z)) for z in (0, 2.4) for (x, y) in pts]
    for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(f'saetera{side}', me))
    o.data.materials.append(M['stone'])
box('piso_interior', SX - 3, SX + 3, sw / 2, 4, -0.19, 0.01, m=M['stone2'])
sarch = defender('arquero_saetera')
sarch.location = (SX, sw / 2 + 0.5, 0)
sarch.rotation_euler = (0, 0, 0)
outline('contorno_saetera', [(SX - 0.06, -sw / 2, 2.55), (SX + 0.06, -sw / 2, 2.55), (SX + 0.55, sw / 2, 2.55), (SX - 0.55, sw / 2, 2.55)],
        M['orange'], (SX, 0, 2.55), 41.4, 46.4)
# flecha del arquero sale (42.4), flechas enemigas rebotan en el muro (43.6 - 46)
a = prim('cylinder', 'flecha_arquero', (0, 0, 0), rot=(math.pi / 2, 0, 0), m=M['arrowm'], radius=0.025, depth=0.7, vertices=6)
pop(a, 42.4, 43.4, s=(1, 1, 1), dur=0.05)
key(a, 'location', 42.4, (SX, sw / 2 + 0.2, 1.3))
key(a, 'location', 43.4, (SX + 0.6, -7.0, 1.6), 'LINEAR')
for k in range(6):
    a = prim('cylinder', f'flecha_rebota{k}', (0, 0, 0), rot=(math.pi / 2, 0, 0), m=M['arrowm'], radius=0.025, depth=0.7, vertices=6)
    t = 43.6 + 0.4 * k
    x = SX + random.choice((-1, 1)) * random.uniform(0.35, 1.6)
    pop(a, t, 46.4, s=(1, 1, 1), dur=0.05)
    key(a, 'location', t, (x, -6.0, 1.4))
    key(a, 'location', t + 0.35, (x, -sw / 2 - 0.35, 1.3), 'LINEAR')
    key(a, 'rotation_euler', t + 0.35, (math.pi / 2, 0, 0))
    key(a, 'location', t + 0.8, (x + random.uniform(-0.5, 0.5), -sw / 2 - 1.0, 0.05), 'LINEAR')
    key(a, 'rotation_euler', t + 0.8, (math.pi / 2, 0, random.uniform(0.8, 2.2)), 'LINEAR')

# ---------------------------------------------------------------- estandartes, pozo y gato (46.6 - 51.4)
for k, (x, y) in enumerate(((-W, -W), (W, -W), (-W, W), (W, W), (0, 1.0))):
    top = H2 + 1.0 if k < 4 else 6.0
    pole = prim('cylinder', f'asta{k}', (x, y, top + 0.9), m=M['wood'], radius=0.04, depth=1.8, vertices=8)
    fl = box(f'bandera{k}', 0, 1.0, -0.02, 0.02, 0, 0.6, m=M['flag'] if k % 2 == 0 else M['flag2'], origin=(0, 0, 0.3))
    fl.location = (x + 0.04, y, top + 1.45)
    for o in (pole, fl):
        pop(o, 47.0 + 0.1 * k, s=(1, 1, 1), dur=0.25)
    for j in range(10):
        key(fl, 'rotation_euler', 47.4 + 0.4 * j, (0, 0, 0.25 if j % 2 else -0.25))
well = prim('cylinder', 'pozo', (1.7, -1.4, 0.3), m=M['stone2'], radius=0.45, depth=0.6, vertices=20)
well_w = prim('cylinder', 'pozo_agua', (1.7, -1.4, 0.55), m=M['water'], radius=0.36, depth=0.04, vertices=20)
wroof = prim('cone', 'pozo_techo', (1.7, -1.4, 1.65), m=M['wood'], radius1=0.7, depth=0.45, vertices=4, rot=(0, 0, math.pi / 4))
for k, dx in enumerate((-0.4, 0.4)):
    p = prim('cylinder', f'pozo_poste{k}', (1.7 + dx, -1.4, 0.95), m=M['wood'], radius=0.04, depth=1.3, vertices=6)
    pop(p, 48.0, s=(1, 1, 1), dur=0.25)
for o in (well, well_w, wroof):
    pop(o, 48.0, s=tuple(o.scale), dur=0.25)
pantry = box('despensa', -2.4, -1.0, -1.9, -0.6, 0, 1.2, m=M['wood'])
pdoor = box('despensa_puerta', -1.95, -1.45, -1.92, -1.88, 0, 0.9, m=M['dark'])
for o in (pantry, pdoor):
    pop(o, 49.6, s=(1, 1, 1), dur=0.25)


def cat(name):
    root = link(bpy.data.objects.new(name, None))
    ps = [prim('uv_sphere', name + '_c', (0, 0, 0.16), scale=(1.6, 0.8, 0.8), m=M['cat'], radius=0.12, segments=12, ring_count=8),
          prim('uv_sphere', name + '_h', (0.2, 0, 0.27), m=M['cat'], radius=0.09, segments=12, ring_count=8),
          prim('cone', name + '_o1', (0.2, -0.05, 0.37), m=M['cat'], radius1=0.035, depth=0.07, vertices=6),
          prim('cone', name + '_o2', (0.2, 0.05, 0.37), m=M['cat'], radius1=0.035, depth=0.07, vertices=6),
          prim('cylinder', name + '_cola', (-0.24, 0, 0.3), rot=(0, -0.6, 0), m=M['cat'], radius=0.02, depth=0.3, vertices=6)]
    for p in ps:
        p.parent = root
    return root


C = cat('gato')
C.scale = (2.6, 2.6, 2.6)
pop(C, 49.4, s=(2.6, 2.6, 2.6), dur=0.25)
key(C, 'location', 49.4, (0.4, -2.15, 0))
key(C, 'location', 50.9, (-1.6, -2.1, 0), 'LINEAR')
for k in range(2):
    mo = prim('uv_sphere', f'raton{k}', (0, 0, 0), scale=(1.5, 0.8, 0.8), m=M['mouse'], radius=0.07, segments=10, ring_count=6)
    pop(mo, 49.8, s=tuple(mo.scale), dur=0.15)
    key(mo, 'location', 49.8, (-1.0 - 0.3 * k, -2.0, 0.05))
    key(mo, 'location', 50.9, (-1.7 - 0.2 * k, -1.92, 0.05), 'LINEAR')
    key(mo, 'scale', 50.9, tuple(mo.scale))
    key(mo, 'scale', 51.0, Z, 'CONSTANT')

# árboles alrededor
for k in range(14):
    a = random.uniform(0, 2 * math.pi)
    r = random.uniform(9, 20)
    x, y = r * math.cos(a), abs(r * math.sin(a)) + 2
    prim('cylinder', f'arbol_t{k}', (x, y, 0.6), m=M['log'], radius=0.12, depth=1.2, vertices=8)
    prim('uv_sphere', f'arbol_c{k}', (x, y, 1.7), scale=(1, 1, 1.2), m=M['grass'], radius=0.8, segments=12, ring_count=8)

# ---------------------------------------------------------------- luz y cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.50, 0.68, 0.95, 1)
bg.inputs['Strength'].default_value = 0.9
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(6)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(50), 0, math.radians(-35))
key(sun, 'energy', 0, 3.2)
key(sun, 'color', 0, (1.0, 0.96, 0.88))
key(sun, 'energy', 51.0, 3.2)
key(sun, 'color', 51.0, (1.0, 0.96, 0.88))
key(sun, 'energy', 53.5, 2.8)
key(sun, 'color', 53.5, (1.0, 0.72, 0.48))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (2.5, -11.0, 4.0), (0, 0, 0.8), (1.5, -10.0, 3.6), (0, 0, 0.8)),
    (5.5, (-3.0, -9.5, 3.0), (0, -1.0, 1.0), (-2.4, -9.0, 2.8), (0, -1.0, 1.0)),
    (7.38, (4.5, -12.5, 5.0), (0, 0, 1.2), (3.0, -12.0, 4.5), (0, 0, 1.2)),
    (9.94, (2.2, -10.0, 2.2), (0, -W, 1.4), (1.6, -9.5, 2.4), (0, -W, 1.6)),
    (12.4, (6.0, -14.0, 6.0), (0, 0, 2.2), (3.5, -15.0, 7.0), (0, 0, 2.4)),
    (15.0, (2.5, -8.5, 6.5), (0, -W, H2), (1.5, -8.0, 6.3), (-0.5, -W, H2)),
    (18.62, (-5.4, -13.5, 0.6), (-5.4, 0, -0.9), (-5.0, -12.8, 0.5), (-5.0, 0, -0.9)),
    (24.56, (-4.8, -7.5, 0.0), (-4.8, 0, -0.8), (-4.8, -7.0, 0.0), (-4.8, 0, -0.8)),
    (25.9, (3.5, -11.5, 3.5), (0, -W - 1.0, 0.8), (2.8, -11.0, 3.2), (0, -W - 1.0, 0.8)),
    (31.0, (0.0, -12.0, 2.0), (0, -W - 2.0, 1.0), (0.0, -11.5, 2.0), (0, -W - 2.0, 1.0)),
    (32.96, (-4.0, -12.0, 3.0), (0, -W - 1.0, 0.8), (-3.0, -11.0, 2.6), (0, -W - 1.0, 0.8)),
    (38.0, (SX, -3.8, 7.5), (SX, 0.4, 0.0), (SX, -3.4, 7.0), (SX, 0.4, 0.0)),
    (43.4, (SX + 3.0, -6.5, 4.5), (SX, -0.5, 1.0), (SX + 2.4, -6.0, 4.0), (SX, -0.5, 1.0)),
    (46.64, (6.5, -10.5, 9.5), (0, 0, 2.5), (4.0, -11.5, 9.0), (0, 0, 2.5)),
    (49.2, (-0.7, -2.1, 9.0), (-0.8, -1.5, 0.0), (-0.9, -2.0, 8.2), (-1.0, -1.5, 0.0)),
    (51.46, (4.0, -13.0, 6.0), (0, 0, 2.5), (0.0, -24.0, 12.0), (0, 0, 2.5)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
