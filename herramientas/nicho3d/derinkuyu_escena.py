"""Escena 3D de Derinkuyu (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P derinkuyu_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Corte transversal del terreno en y=0: cada sala es un cortador booleano que crece cuando
el guion la nombra. Todo lo de adentro vive en y >= 0 (detrás del corte).
"""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/derinkuyu'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 64.6  # audio 63.81 s + cola
NF = int(round(DUR * FPS))
random.seed(5)

clean()
sc = bpy.context.scene

M = dict(
    tuff=mat('toba', (0.82, 0.66, 0.48), 0.9),
    tuffcut=mat('toba_corte', (0.80, 0.60, 0.42), 0.95),
    hollow=mat('toba_hueco', (0.22, 0.15, 0.10), 0.95),
    stone=mat('piedra_puerta', (0.62, 0.55, 0.47), 0.85),
    house=mat('casa', (0.86, 0.76, 0.62), 0.9),
    roof=mat('techo', (0.55, 0.33, 0.20), 0.9),
    door=mat('puerta_casa', (0.30, 0.18, 0.10), 0.9),
    villager=mat('ropa', (0.55, 0.40, 0.25), 0.9),
    villager2=mat('ropa2', (0.30, 0.45, 0.55), 0.9),
    sash=mat('faja', (0.80, 0.65, 0.20), 0.8),
    soldier=mat('soldado', (0.70, 0.12, 0.10), 0.8),
    metal=mat('metal', (0.55, 0.56, 0.60), 0.35, spec=0.8),
    skin=mat('piel', (0.70, 0.50, 0.36), 0.6),
    hair=mat('pelo', (0.12, 0.08, 0.05), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    sack=mat('costal', (0.78, 0.68, 0.48), 0.95),
    jar=mat('vasija', (0.68, 0.38, 0.22), 0.7),
    wood=mat('madera', (0.45, 0.30, 0.17), 0.8),
    water=mat('agua', (0.25, 0.55, 0.85), 0.1, emit=(0.2, 0.45, 0.8), es=0.6),
    goat=mat('cabra', (0.92, 0.90, 0.85), 0.9),
    goatd=mat('cabra_osc', (0.35, 0.28, 0.22), 0.9),
    hay=mat('paja', (0.85, 0.72, 0.35), 0.9),
    fire=flat_mat('fuego', (1.0, 0.55, 0.15), 10.0),
    flame=flat_mat('llama', (1.0, 0.7, 0.3), 14.0),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
    air=flat_mat('aire', (0.55, 0.85, 1.0), 2.6),
    chunk=mat('esquirla', (0.78, 0.62, 0.45), 0.9),
)

# ---------------------------------------------------------------- terreno con corte en y=0
ground = box('terreno', -30, 30, 0, 40, -45, 0, mats=[M['tuff'], M['tuffcut']])
face_mats(ground, lambda n: 1 if n.y < -0.5 else 0)
ground.data.materials.append(M['hollow'])
# vetas de la roca en la cara de corte
nt = M['tuffcut'].node_tree
noise = nt.nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 0.35
tco = nt.nodes.new('ShaderNodeTexCoord')
nt.links.new(tco.outputs['Object'], noise.inputs['Vector'])
noise.inputs['Detail'].default_value = 4
ramp = nt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (0.62, 0.42, 0.27, 1)
ramp.color_ramp.elements[1].color = (0.88, 0.70, 0.50, 1)
nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
nt.links.new(ramp.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])

CUTTERS = []


def room(name, x0, x1, z0, z1, t0, t1, grow='x', anchor=None, depth=2.2):
    """Sala excavada: un cortador que crece entre t0 y t1 desde 'anchor'."""
    ax = anchor if anchor is not None else (x0 if grow == 'x' else z1)
    if grow == 'x':
        org = (ax, 0, (z0 + z1) / 2)
    else:
        org = ((x0 + x1) / 2, 0, ax)
    c = box(name, x0, x1, -1.0, depth, z0, z1, m=M['hollow'], origin=org)
    s0 = (0.02, 1, 1) if grow == 'x' else (1, 1, 0.02)
    hidden = (org[0], org[1], 40.0)
    key(c, 'location', 0, hidden, 'CONSTANT')
    key(c, 'location', t0, org, 'CONSTANT')
    key(c, 'scale', 0, s0, 'CONSTANT')
    key(c, 'scale', t0, s0)
    key(c, 'scale', t1, (1, 1, 1))
    md = ground.modifiers.new('cut_' + name, 'BOOLEAN')
    md.object = c
    md.operation = 'DIFFERENCE'
    md.solver = 'EXACT'
    md.material_mode = 'TRANSFER'
    c.hide_render = True
    c.display_type = 'WIRE'
    CUTTERS.append(c)
    return c


# Nivel 1: z -3.5 .. -2.2 ; nivel 2: -6.0 .. -4.7 ; nivel 3: -8.5 .. -7.2 ; nivel 4: -11 .. -9.7
L1 = (-3.5, -2.2)
L2 = (-6.0, -4.7)
L3 = (-8.5, -7.2)
L4 = (-11.0, -9.7)
room('cueva', -1.0, 1.0, -1.3, 0.2, 0.0, 0.01, grow='z', anchor=0.2)
room('pozo_bajada', -1.0, 0.0, L1[0], -1.0, 6.2, 7.6, grow='z', anchor=-1.0)
room('sala1', -0.05, 3.2, L1[0], L1[1], 7.4, 9.0, grow='x', anchor=-0.05)
room('respiradero', 2.45, 2.85, L1[1] - 0.05, 0.3, 17.6, 19.3, grow='z', anchor=L1[1] - 0.05)
room('nicho_piedra', 0.2, 1.6, L1[0], L1[1] + 0.25, 25.1, 26.0, grow='x', anchor=1.6)
room('pozo_agua', 3.55, 3.95, -8.6, L1[0] + 0.1, 37.0, 38.2, grow='z', anchor=L1[0] + 0.1)
room('bodega', 3.2, 6.6, L1[0], L1[1], 38.2, 39.4, grow='x', anchor=3.2)
room('establo', -5.6, -1.0, L1[0], L1[1], 39.6, 40.8, grow='x', anchor=-1.0)
room('escalera', 1.3, 1.9, L4[0], L1[0] + 0.1, 44.9, 46.6, grow='z', anchor=L1[0] + 0.1)
room('cocina', -3.6, 1.9, L2[0], L2[1], 46.6, 47.4, grow='x', anchor=1.9)
room('capilla', 1.3, 6.4, L3[0], L3[1] + 0.3, 47.4, 48.2, grow='x', anchor=1.3)
room('escuela', -3.4, 1.9, L4[0], L4[1], 48.2, 49.0, grow='x', anchor=1.9)
room('pasillo', -7.8, -3.6, L2[0], L2[0] + 0.75, 49.0, 49.5, grow='x', anchor=-3.6)

# ---------------------------------------------------------------- superficie: aldea y chimeneas de hada
for k, (x, y, w, h) in enumerate(((-7.5, 16.0, 2.4, 1.8), (-3.5, 18.0, 2.0, 1.5), (5.0, 16.5, 2.6, 2.0), (9.0, 19.0, 2.0, 1.6))):
    box(f'casa{k}', x - w / 2, x + w / 2, y - 1, y + 1, 0, h, m=M['house'])
    box(f'techo{k}', x - w / 2 - 0.1, x + w / 2 + 0.1, y - 1.1, y + 1.1, h, h + 0.15, m=M['roof'])
    box(f'puerta{k}', x - 0.25, x + 0.25, y - 1.02, y - 0.98, 0, 0.9, m=M['door'])
for k in range(9):
    x = random.uniform(-16, 16)
    y = random.uniform(10, 26)
    h = random.uniform(3, 7)
    prim('cone', f'chimenea{k}', (x, y, h / 2), m=M['tuff'], radius1=random.uniform(0.9, 1.6), radius2=0.35, depth=h, vertices=12)
    prim('cone', f'sombrero{k}', (x, y, h + 0.25), m=M['hollow'], radius1=0.75, radius2=0.1, depth=0.6, vertices=12)

# ---------------------------------------------------------------- personas
def villager(name, body=None):
    return person(name, body or M['villager'], M['sash'], M['skin'], M['dark'], M['hair'])


def soldier(name):
    p = person(name, M['soldier'], M['metal'], M['skin'], M['dark'])
    helm = prim('uv_sphere', name + '_casco', (0, 0, 1.3), scale=(1.08, 1.08, 0.8), m=M['metal'], radius=0.18, segments=16, ring_count=8)
    spear = prim('cylinder', name + '_lanza', (0.35, 0, 1.0), m=M['wood'], radius=0.025, depth=2.0, vertices=8)
    tip = prim('cone', name + '_punta', (0.35, 0, 2.05), m=M['metal'], radius1=0.06, depth=0.2, vertices=8)
    for o in (helm, spear, tip):
        o.parent = p
    return p


P = villager('aldeano')
P.rotation_mode = 'XYZ'


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


pose(P, 0, (-3.0, 0.8, 0.0), (0, 0, 0.2))
pose(P, 0.6, (-3.0, 0.8, 0.0), (0, 0, 0.2), 'BEZIER')
pose(P, 1.8, (-0.3, 0.6, 0.0), (0, 0, 0.2), 'BEZIER')
pose(P, 2.6, (-0.2, 0.6, -1.3), (0, 0, 0.2), 'BEZIER')
pose(P, 5.9, (-0.2, 0.6, -1.3), (0, 0, 0.2))
# excavando hacia abajo
for k in range(12):
    t = 6.0 + k * 0.55
    z = -1.3 - min(1.0, k / 4) * (L1[0] + 1.3) * -1
    x = -0.5 + (max(0, k - 4) / 7) * 2.2
    pose(P, t, (x, 0.6, max(L1[0], z) - (0.08 if k % 2 else 0)), (0.3 if k % 2 else 0.05, 0, 0.0), 'BEZIER')
pose(P, 13.0, (1.7, 0.6, L1[0]), (0, 0, 0.0))
pose(P, 49.3, (1.7, 0.6, L1[0]), (0, 0, 0.0))
pose(P, 49.32, (2.6, 0.7, L3[0]), (0, 0, -0.4))   # en la capilla mientras los soldados se atoran

# esquirlas: la roca blanda se talla fácil (8 - 13)
for k in range(14):
    c = prim('cube', f'esquirla{k}', (0, 0, 0), scale=(0.07, 0.07, 0.06), rot=(random.uniform(0, 3),) * 3, m=M['chunk'])
    t = 8.0 + k * 0.35
    x = 0.4 + random.uniform(0, 2.4)
    z = L1[1] - 0.1
    pop(c, t, t + 0.9, dur=0.08)
    key(c, 'location', t, (x, 0.3, z))
    key(c, 'location', t + 0.8, (x + random.uniform(-0.3, 0.3), 0.3, L1[0] + 0.06), 'LINEAR')

# lámpara de la sala 1: se apaga sin aire (15.5) y vuelve con el respiradero (19.8)
lamp_base = prim('cylinder', 'lampara1', (0.9, 0.5, L1[0] + 0.55), m=M['jar'], radius=0.08, depth=0.08, vertices=12)
nicho = prim('cube', 'repisa1', (0.9, 0.55, L1[0] + 0.45), scale=(0.18, 0.12, 0.06), m=M['hollow'])
fl1 = prim('cone', 'llama1', (0.9, 0.5, L1[0] + 0.66), m=M['flame'], radius1=0.035, depth=0.12, vertices=8)
cut(lamp_base, 7.6)
cut(nicho, 7.6)
L = bpy.data.lights.new('luz1', 'POINT')
L.color = (1.0, 0.62, 0.3)
L.shadow_soft_size = 0.1
lo = link(bpy.data.objects.new('luz1', L))
lo.location = (0.9, -0.3, L1[0] + 0.9)
for t, e in ((0, 0), (8.6, 0), (9.0, 60), (14.4, 60), (15.6, 4), (16.2, 0), (19.5, 0), (20.0, 60)):
    key(L, 'energy', t, e)
for t, s in ((0, Z), (8.8, Z), (9.0, (1, 1, 1)), (14.4, (1, 1, 1)), (15.6, (0.4, 0.4, 0.3)), (16.2, Z), (19.6, Z), (19.9, (1, 1, 1))):
    key(fl1, 'scale', t, s, 'CONSTANT' if s == Z else 'BEZIER')

# aire entrando por el respiradero (19.4 - 21.8)
for k in range(3):
    arrow_run(f'aire{k}', M['air'], (2.65, -0.12, 0.6), (2.65, -0.12, L1[1] + 0.2), (0, math.pi / 2, 0), 19.4, 21.8,
              period=1.0, phase=k * 0.33, length=0.9)
outline('contorno_respiradero', rect_xz(2.25, 3.05, L1[1] - 0.1, 0.5, -0.1), M['orange'], (2.65, -0.1, -1.0), 20.8, 21.86)

# ---------------------------------------------------------------- invasores
S1 = soldier('soldado1')
S2 = soldier('soldado2')
for k, S in enumerate((S1, S2)):
    dx = -0.9 * k
    pose(S, 0, (-9 + dx, 0.6, 0), (0, 0, -0.3))
    pose(S, 3.9, (-9 + dx, 0.6, 0), (0, 0, -0.3))
    pose(S, 4.6, (-1.6 + dx, 0.6, 0), (0, 0, -0.3), 'BEZIER')
    pose(S, 5.9, (-1.6 + dx, 0.6, 0), (0, 0, -0.3), 'BEZIER')
    pose(S, 21.9, (-4.0 + dx, 0.6, 0), (0, 0, -0.3))
    pose(S, 23.2, (-0.6 + dx * 0.4, 0.55, 0), (0, 0, -0.3), 'BEZIER')
    pose(S, 26.0, (-0.6 + dx * 0.4, 0.55, -1.3), (0, 0, -0.3), 'BEZIER')
    pose(S, 29.2, (-0.55 + dx * 0.4, 0.55 - 0.1 * k, L1[0]), (0, 0, -0.3), 'BEZIER')
    pose(S, 31.5, (-0.55 + dx * 0.4, 0.55 - 0.1 * k, L1[0]), (0, 0, -0.3))
    pose(S, 31.6, (-0.55 + dx * 0.4, 0.55 - 0.1 * k, 40), (0, 0, -0.3))
# en los pasillos estrechos (49.3 - 56): tres soldados agachados en fila
for k in range(3):
    S = soldier(f'soldado_pasillo{k}')
    pose(S, 0, (-7.2 + 1.1 * k, 0.55, 40), (0, 0, 0))
    pose(S, 49.3, (-9.0 + 1.1 * k, 0.55, L2[0]), (0, 0.55, 0), s=(1, 1, 0.82))
    pose(S, 55.6, (-6.0 + 1.1 * k, 0.55, L2[0]), (0, 0.55, 0), 'LINEAR', s=(1, 1, 0.82))
    pose(S, 55.62, (-6.0 + 1.1 * k, 0.55, 40), (0, 0.55, 0))
outline('contorno_pasillo', rect_xz(-7.9, -3.5, L2[0] - 0.08, L2[0] + 0.85, -0.1), M['orange'], (-5.7, -0.1, L2[0] + 0.4),
        49.6, 52.4)

# ---------------------------------------------------------------- puerta de piedra rodante
door = prim('cylinder', 'piedra_rueda', (1.0, 0.55, L1[0] + 0.62), rot=(math.pi / 2, 0, 0), m=M['stone'],
            radius=0.62, depth=0.35, vertices=40)
hole = prim('cylinder', 'piedra_hoyo', (1.0, 0.36, L1[0] + 0.62), rot=(math.pi / 2, 0, 0), m=M['dark'],
            radius=0.12, depth=0.02, vertices=16)
hole.parent = door
hole.location = (0, 0, 0.19)
door.rotation_mode = 'XYZ'
pop(door, 26.0, s=(1, 1, 1), dur=0.4)
key(door, 'location', 28.9, (1.0, 0.55, L1[0] + 0.62))
key(door, 'location', 29.9, (-0.12, 0.55, L1[0] + 0.62))
key(door, 'rotation_euler', 28.9, (math.pi / 2, 0, 0))
key(door, 'rotation_euler', 29.9, (math.pi / 2, 1.12 / 0.62, 0))
circ = [(-0.12 + 0.78 * math.cos(a), -0.1, L1[0] + 0.62 + 0.78 * math.sin(a)) for a in [2 * math.pi * k / 40 for k in range(40)]]
outline('contorno_piedra', circ, M['orange'], (-0.12, -0.1, L1[0] + 0.62), 31.1, 32.6)

# ---------------------------------------------------------------- semanas: la comida se acaba (30.3 - 36)
food = []
for k in range(4):
    o = prim('uv_sphere', f'costal{k}', (1.55 + 0.38 * k, 0.9, L1[0] + 0.24), scale=(0.9, 0.8, 1.1), m=M['sack'], radius=0.22,
             segments=14, ring_count=8)
    pop(o, 9.2, s=tuple(o.scale), dur=0.2)
    key(o, 'scale', 34.3 + 0.25 * k, tuple(o.scale))
    key(o, 'scale', 35.0 + 0.25 * k, (0.5, 0.5, 0.2))
    food.append(o)
jar = prim('cylinder', 'cantaro', (2.95, 0.7, L1[0] + 0.3), m=M['jar'], radius=0.16, depth=0.6, vertices=16)
pop(jar, 9.4, s=(1, 1, 1), dur=0.2)

# ---------------------------------------------------------------- pozo de agua, bodegas y establos (36 - 41)
wat = box('agua_pozo', 3.57, 3.93, 0.0, 0.8, -8.6, -7.6, m=M['water'])
pop(wat, 38.0, s=(1, 1, 1), dur=0.3)
bucket = prim('cylinder', 'cubeta_pozo', (3.75, 0.4, -6.0), m=M['wood'], radius=0.11, depth=0.2, vertices=12)
rope = prim('cylinder', 'cuerda', (3.75, 0.4, -4.5), m=M['sack'], radius=0.012, depth=3.0, vertices=6)
for o in (bucket, rope):
    pop(o, 37.6, s=(1, 1, 1), dur=0.2)
key(bucket, 'location', 37.8, (3.75, 0.4, -6.0))
key(bucket, 'location', 40.5, (3.75, 0.4, -7.6))
for k in range(8):
    x = 3.5 + 0.38 * k
    o = prim('cylinder', f'tinaja{k}', (x, 1.3, L1[0] + 0.32), m=M['jar'] if k % 2 else M['sack'], radius=0.16, depth=0.64, vertices=14)
    pop(o, 38.6 + 0.08 * k, s=(1, 1, 1), dur=0.2)
for k in range(3):
    h = prim('uv_sphere', f'paja{k}', (-4.8 + 0.5 * k, 1.2, L1[0] + 0.12), scale=(1.2, 1, 0.5), m=M['hay'], radius=0.3,
             segments=12, ring_count=6)
    pop(h, 40.0 + 0.1 * k, s=tuple(h.scale), dur=0.2)


def goat(name):
    root = link(bpy.data.objects.new(name, None))
    ps = [
        prim('uv_sphere', name + '_cuerpo', (0, 0, 0.42), scale=(1.5, 0.8, 0.8), m=M['goat'], radius=0.22, segments=16, ring_count=10),
        prim('uv_sphere', name + '_cabeza', (0.36, 0, 0.66), scale=(1.2, 0.8, 0.8), m=M['goat'], radius=0.12, segments=14, ring_count=8),
        prim('cone', name + '_cuerno1', (0.32, -0.05, 0.8), rot=(0, -0.6, 0), m=M['goatd'], radius1=0.03, depth=0.16, vertices=6),
        prim('cone', name + '_cuerno2', (0.32, 0.05, 0.8), rot=(0, -0.6, 0), m=M['goatd'], radius1=0.03, depth=0.16, vertices=6),
        prim('uv_sphere', name + '_barba', (0.46, 0, 0.55), scale=(0.6, 0.6, 1.2), m=M['goatd'], radius=0.04, segments=8, ring_count=6),
        prim('uv_sphere', name + '_ojo', (0.44, -0.08, 0.7), m=M['dark'], radius=0.015, segments=8, ring_count=6),
    ]
    for x in (0.2, -0.2):
        for y in (-0.08, 0.08):
            ps.append(prim('cylinder', f'{name}_pata{x}{y}', (x, y, 0.13), m=M['goatd'], radius=0.03, depth=0.26, vertices=6))
    for p in ps:
        p.parent = root
    return root


for k in range(2):
    g = goat(f'cabra_establo{k}')
    g.location = (-4.4 + 1.2 * k, 0.8, L1[0])
    g.rotation_euler = (0, 0, math.pi * k)
    pop(g, 40.1 + 0.2 * k, s=(1, 1, 1), dur=0.25)

# ---------------------------------------------------------------- mucha gente (41.4 - 44.3)
for k in range(6):
    v = villager(f'gente{k}', M['villager2'] if k % 2 else M['villager'])
    v.location = (0.5 + 0.42 * k, 0.45 + 0.25 * (k % 2), L1[0])
    v.rotation_euler = (0, 0, random.uniform(-0.4, 0.4))
    v.scale = (0.85, 0.85, 0.85)
    pop(v, 41.9 + 0.1 * k, s=(0.85, 0.85, 0.85), dur=0.2)
    key(v, 'scale', 44.2, (0.85, 0.85, 0.85))
    key(v, 'scale', 44.3, Z, 'CONSTANT')

# ---------------------------------------------------------------- pisos de abajo: cocina, capilla, escuela
oven = prim('uv_sphere', 'horno', (-2.6, 0.8, L2[0]), scale=(1, 1, 0.8), m=M['hollow'], radius=0.5, segments=16, ring_count=8)
ofire = prim('cone', 'fuego_horno', (-2.6, 0.4, L2[0] + 0.15), m=M['fire'], radius1=0.18, depth=0.3, vertices=10)
pop(oven, 47.2, s=(1, 1, 0.8), dur=0.25)
pop(ofire, 47.3, s=(1, 1, 1), dur=0.25)
for k in range(3):
    pot = prim('cylinder', f'olla{k}', (-1.5 + 0.5 * k, 0.6, L2[0] + 0.15), m=M['jar'], radius=0.14, depth=0.3, vertices=12)
    pop(pot, 47.3 + 0.08 * k, s=(1, 1, 1), dur=0.2)
Lk = bpy.data.lights.new('luz_cocina', 'POINT')
Lk.color = (1.0, 0.5, 0.2)
lk = link(bpy.data.objects.new('luz_cocina', Lk))
lk.location = (-2.6, -0.2, L2[0] + 0.6)
key(Lk, 'energy', 0, 0, 'CONSTANT')
key(Lk, 'energy', 47.2, 0)
key(Lk, 'energy', 47.5, 80)
# capilla: arcos, altar y velas
for k in range(3):
    pts = [(2.3 + 1.4 * k + 0.55 * math.cos(a), 1.8, L3[1] - 0.2 + 0.4 * math.sin(a)) for a in [math.pi * j / 16 for j in range(17)]]
    ar = curve_obj(f'arco{k}', [(p[0] - (2.3 + 1.4 * k), 0, p[2] - (L3[1] - 0.2)) for p in pts], M['tuff'], bevel=0.08)
    ar.location = (2.3 + 1.4 * k, 1.8, L3[1] - 0.2)
    pop(ar, 48.0 + 0.1 * k, s=(1, 1, 1), dur=0.2)
altar = box('altar', 5.0, 5.9, 1.0, 1.6, L3[0], L3[0] + 0.55, m=M['stone'])
pop(altar, 48.1, s=(1, 1, 1), dur=0.2)
for k in range(3):
    cd = prim('cone', f'vela{k}', (5.15 + 0.3 * k, 1.3, L3[0] + 0.66), m=M['flame'], radius1=0.03, depth=0.1, vertices=8)
    pop(cd, 48.2, s=(1, 1, 1), dur=0.2)
# escuela: bancos y alumnos
for k in range(3):
    b = box(f'banco{k}', -2.8 + 1.4 * k, -1.8 + 1.4 * k, 0.6, 1.0, L4[0], L4[0] + 0.35, m=M['wood'])
    pop(b, 48.6 + 0.06 * k, s=(1, 1, 1), dur=0.2)
    kid = villager(f'alumno{k}', M['villager2'])
    kid.location = (-2.3 + 1.4 * k, 0.55, L4[0])
    kid.scale = (0.7, 0.7, 0.62)
    pop(kid, 48.7 + 0.06 * k, s=(0.7, 0.7, 0.62), dur=0.2)
teacher = villager('maestro')
teacher.location = (1.3, 0.5, L4[0])
teacher.rotation_euler = (0, 0, 1.2)
pop(teacher, 48.8, s=(1, 1, 1), dur=0.2)

# ---------------------------------------------------------------- 55.6 - 60: lámparas, vino y la cabra
lamp_spots = [(-4.2, L1[0]), (5.0, L1[0]), (-2.0, L2[0]), (0.6, L2[0]), (3.0, L3[0]), (-0.6, L4[0]), (-6.0, L2[0])]
for k, (x, z) in enumerate(lamp_spots):
    fl = prim('cone', f'lamp_llama{k}', (x, 0.5, z + 1.05), m=M['flame'], radius1=0.035, depth=0.12, vertices=8)
    ba = prim('cylinder', f'lamp_base{k}', (x, 0.5, z + 0.95), m=M['jar'], radius=0.08, depth=0.08, vertices=10)
    t = 56.1 + 0.12 * k
    pop(fl, t, s=(1, 1, 1), dur=0.2)
    pop(ba, t, s=(1, 1, 1), dur=0.2)
    Ll = bpy.data.lights.new(f'luz_lamp{k}', 'POINT')
    Ll.color = (1.0, 0.62, 0.3)
    lo_ = link(bpy.data.objects.new(f'luz_lamp{k}', Ll))
    lo_.location = (x, -0.3, z + 1.1)
    key(Ll, 'energy', 0, 0, 'CONSTANT')
    key(Ll, 'energy', t, 0)
    key(Ll, 'energy', t + 0.3, 45)
for k in range(3):
    br = prim('cylinder', f'barril{k}', (4.0 + 0.75 * k, 0.6, L1[0] + 0.3), rot=(math.pi / 2, 0, 0), m=M['wood'],
              radius=0.3, depth=0.55, vertices=16)
    pop(br, 57.5 + 0.1 * k, s=(1, 1, 1), dur=0.25)
G = goat('cabra_terca')
G.location = (1.6, 0.6, -4.3)
G.rotation_euler = (0, 0, math.pi)
pop(G, 58.7, s=(1.1, 1.1, 1.1), dur=0.25)
for k in range(8):  # se planta y sacude la cabeza
    key(G, 'rotation_euler', 59.0 + 0.2 * k, (0, 0, math.pi + (0.25 if k % 2 else -0.25)))
helper = villager('jalando_cabra')
helper.location = (1.6, 0.6, L1[0])
helper.rotation_euler = (0, 0, math.pi)
pop(helper, 58.7, s=(1, 1, 1), dur=0.25)

# ---------------------------------------------------------------- luz y cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.55, 0.70, 0.92, 1)
bg.inputs['Strength'].default_value = 0.85
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(6)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(55), 0, math.radians(-25))
key(sun, 'energy', 0, 3.0)
key(sun, 'color', 0, (1.0, 0.95, 0.86))
key(sun, 'energy', 60.0, 3.0)
key(sun, 'color', 60.0, (1.0, 0.95, 0.86))
key(sun, 'energy', 62.5, 2.6)
key(sun, 'color', 62.5, (1.0, 0.72, 0.48))

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (-0.8, -8.5, 1.2), (-0.6, 0, -0.3), (-0.4, -7.5, 0.9), (-0.4, 0, -0.4)),
    (4.52, (-1.2, -6.8, 1.0), (-0.9, 0, -0.1), (-1.0, -6.4, 0.9), (-0.8, 0, -0.1)),
    (5.9, (0.9, -9.0, -1.4), (0.9, 0, -2.0), (1.1, -8.2, -1.6), (1.1, 0, -2.1)),
    (13.22, (1.4, -6.0, -2.6), (1.4, 0, -2.9), (1.5, -5.6, -2.7), (1.5, 0, -2.9)),
    (16.7, (1.6, -10.5, -1.4), (1.6, 0, -1.6), (1.8, -10.0, -1.4), (1.8, 0, -1.6)),
    (21.86, (-0.8, -10.5, -1.4), (-0.6, 0, -1.7), (-0.4, -9.8, -1.8), (-0.3, 0, -2.0)),
    (24.8, (0.4, -6.4, -2.6), (0.3, 0, -2.9), (0.2, -6.0, -2.7), (0.2, 0, -2.9)),
    (30.3, (1.4, -6.4, -2.6), (1.4, 0, -2.9), (1.6, -6.0, -2.7), (1.6, 0, -2.9)),
    (36.16, (0.8, -12.5, -3.8), (0.8, 0, -3.9), (0.8, -12.0, -3.6), (0.8, 0, -3.7)),
    (41.42, (1.6, -6.4, -2.6), (1.6, 0, -2.9), (1.7, -6.0, -2.7), (1.7, 0, -2.9)),
    (44.3, (0.8, -14.5, -5.2), (0.8, 0, -5.6), (0.8, -18.5, -5.4), (0.8, 0, -5.8)),
    (49.32, (-5.4, -6.2, -5.4), (-5.4, 0, -5.6), (-4.8, -5.8, -5.4), (-4.8, 0, -5.6)),
    (55.6, (0.2, -15.5, -4.6), (0.2, 0, -4.8), (0.6, -14.5, -4.6), (0.6, 0, -4.8)),
    (58.5, (1.6, -5.6, -3.6), (1.6, 0, -3.9), (1.6, -5.3, -3.7), (1.6, 0, -3.9)),
    (60.2, (0.6, -17.0, -3.5), (0.6, 0, -4.6), (0.6, -30.0, 0.0), (0.6, 0, -3.6)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
