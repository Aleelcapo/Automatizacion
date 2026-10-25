"""Escena 3D del iglú (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P iglu_escena.py -- OUT_DIR [--frames A-B] [--res 540] [--samples 16] [--save escena.blend]

Estilo de las muestras: corte transversal del terreno, cámara que cambia de plano en cada
frase, flechas y contornos naranjas para marcar cada "Esto es un...".
Los tiempos (segundos) salen de la transcripción del audio de ElevenLabs.
"""
import bpy, bmesh, math, sys, random
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/iglu'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

FPS = 24
DUR = 68.6  # audio 67.63 s + cola
NF = int(round(DUR * FPS))
random.seed(7)


def F(t):
    return int(round(t * FPS)) + 1


# ---------------------------------------------------------------- utilidades
def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, col, rough=0.5, emit=None, es=0.0, alpha=1.0, trans=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*col, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Specular IOR Level'].default_value = spec
    if emit:
        p.inputs['Emission Color'].default_value = (*emit, 1)
        p.inputs['Emission Strength'].default_value = es
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
    if trans:
        p.inputs['Transmission Weight'].default_value = trans
    return m


def flat_mat(name, col, es=2.0):
    """Material plano emisivo (flechas, contornos, llama)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*col, 1)
    e.inputs['Strength'].default_value = es
    nt.links.new(e.outputs[0], o.inputs[0])
    return m


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def box(name, x0, x1, y0, y1, z0, z1, m=None, origin=None, mats=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    ox, oy, oz = origin or ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    for x in (x0, x1):
        for y in (y0, y1):
            for z in (z0, z1):
                bm.verts.new((x - ox, y - oy, z - oz))
    bm.verts.ensure_lookup_table()
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.location = (ox, oy, oz)
    for mm in (mats or ([m] if m else [])):
        me.materials.append(mm)
    return o


def prim(kind, name, loc, scale=(1, 1, 1), rot=(0, 0, 0), m=None, **kw):
    getattr(bpy.ops.mesh, 'primitive_' + kind + '_add')(location=loc, rotation=rot, **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    if m:
        o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = kind in ('uv_sphere', 'cylinder', 'cone', 'torus')
    return o


def key(o, path, t, val, interp='BEZIER', idx=None):
    setattr_path(o, path, val)
    o.keyframe_insert(path, frame=F(t))
    ad = o.animation_data if hasattr(o, 'animation_data') else None
    if ad and ad.action:
        for fc in ad.action.fcurves:
            if fc.data_path == path:
                for kp in fc.keyframe_points:
                    if abs(kp.co[0] - F(t)) < 0.5:
                        kp.interpolation = interp


def setattr_path(o, path, val):
    if '.' in path:
        a, b = path.rsplit('.', 1)
        setattr(o.path_resolve(a), b, val)
    else:
        setattr(o, path, val)


def pop(o, t_in, t_out=None, s=None, dur=0.25):
    """Aparece con rebote; desaparece encogiéndose."""
    s = tuple(s or o.scale)
    z = (0.0001,) * 3
    key(o, 'scale', 0, z, 'CONSTANT')
    key(o, 'scale', max(0, t_in - 0.01), z)
    key(o, 'scale', t_in + dur * 0.7, tuple(v * 1.12 for v in s))
    key(o, 'scale', t_in + dur, s)
    if t_out is not None:
        key(o, 'scale', t_out - 0.15, s)
        key(o, 'scale', t_out, z, 'CONSTANT')


def cut(o, t_in, t_out=None):
    """Visible solo entre t_in y t_out (corte seco, sin animación)."""
    s = tuple(o.scale)
    z = (0.0001,) * 3
    key(o, 'scale', 0, s if t_in <= 0 else z, 'CONSTANT')
    if t_in > 0:
        key(o, 'scale', t_in, s, 'CONSTANT')
    if t_out is not None:
        key(o, 'scale', t_out, z, 'CONSTANT')


def boolean(target, cutter):
    md = target.modifiers.new('cut_' + cutter.name, 'BOOLEAN')
    md.object = cutter
    md.operation = 'DIFFERENCE'
    md.solver = 'EXACT'
    md.material_mode = 'TRANSFER'
    cutter.hide_render = True
    cutter.display_type = 'WIRE'


def arrow(name, m, length=1.0, w=0.09):
    shaft = prim('cylinder', name + '_s', (length / 2 - 0.15, 0, 0), rot=(0, math.pi / 2, 0),
                 radius=w, depth=length - 0.3, vertices=12, m=m)
    head = prim('cone', name + '_h', (length - 0.15, 0, 0), rot=(0, math.pi / 2, 0),
                radius1=w * 2.6, depth=0.36, vertices=16, m=m)
    root = link(bpy.data.objects.new(name, None))
    for c in (shaft, head):
        c.parent = root
    return root


def curve_obj(name, pts, m, cyclic=False, bevel=0.035):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = bevel
    cu.bevel_resolution = 3
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    sp.use_cyclic_u = cyclic
    o = link(bpy.data.objects.new(name, cu))
    o.data.materials.append(m)
    return o


def outline(name, pts, m, center, t_in, t_out, cyclic=True):
    """Contorno naranja que marca la pieza nombrada ("Esto es un ...")."""
    rel = [tuple(p[i] - center[i] for i in range(3)) for p in pts]
    o = curve_obj(name, rel, m, cyclic)
    o.location = center
    pop(o, t_in, t_out, s=(1, 1, 1), dur=0.3)
    return o


# ---------------------------------------------------------------- escena
clean()
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, NF
sc.render.fps = FPS

M = dict(
    snow=mat('nieve', (0.84, 0.89, 0.97), 0.65),
    snowcut=mat('nieve_corte', (0.30, 0.46, 0.74), 0.85),
    block=mat('bloque', (0.90, 0.94, 1.0), 0.6),
    parka=mat('parka', (0.62, 0.28, 0.12), 0.8),
    fur=mat('piel', (0.86, 0.80, 0.68), 0.95),
    skin=mat('cara', (0.72, 0.50, 0.36), 0.6),
    dark=mat('oscuro', (0.08, 0.06, 0.05), 0.7),
    stone=mat('piedra', (0.32, 0.31, 0.30), 0.85),
    caribou=mat('caribu', (0.45, 0.30, 0.18), 0.95),
    dog=mat('perro', (0.85, 0.85, 0.85), 0.9),
    dogd=mat('perro_osc', (0.25, 0.25, 0.27), 0.9),
    water=mat('gota', (0.55, 0.8, 1.0), 0.05, emit=(0.5, 0.8, 1.0), es=1.5),
    steam=mat('vapor', (1, 1, 1), 0.9, alpha=0.45),
    glass=mat('ventana', (0.75, 0.9, 1.0), 0.03, trans=1.0),
    mount=mat('montana', (0.62, 0.70, 0.84), 0.7),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
    hot=flat_mat('calor', (1.0, 0.45, 0.12), 3.0),
    cold=flat_mat('frio', (0.35, 0.65, 1.0), 3.0),
    wind=flat_mat('viento', (0.95, 0.97, 1.0), 2.0),
    flame=flat_mat('llama', (1.0, 0.6, 0.15), 12.0),
    aurora=flat_mat('aurora', (0.2, 1.0, 0.55), 0.0),
)

# Terreno: bloque trasero (siempre) con cara frontal de corte en y=0, y bloque delantero
# que solo existe mientras vemos el iglú desde afuera.
ground = box('suelo', -16, 16, 0, 30, -4, 0, mats=[M['snow'], M['snowcut']])
front = box('suelo_frente', -16, 16, -14, 0, -4, 0, mats=[M['snow'], M['snowcut']])
for g in (ground, front):
    for p in g.data.polygons:
        p.material_index = 1 if (g is ground and p.normal.y < -0.5) else 0

# hueco (cilindro que se hace más profundo)
me = bpy.data.meshes.new('hueco')
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=1.8, radius2=1.8, depth=0.85)
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, -0.425))
bm.to_mesh(me); bm.free()
pit = link(bpy.data.objects.new('hueco', me))
pit.data.materials.append(M['snowcut'])
pit.location = (0, 0, 0.12)
key(pit, 'scale', 0, (0.15, 0.15, 0.03))
key(pit, 'scale', 0.6, (0.15, 0.15, 0.03))
key(pit, 'scale', 3.2, (1, 1, 1))

# túnel de entrada (más bajo que el piso), crece desde la puerta hacia afuera
tun = box('tunel', -4.5, 0, -0.5, 0.5, -1.62, 0, m=M['snowcut'], origin=(0, 0, 0))
tun.location = (-1.05, 0, 30)
key(tun, 'location', 0, (-1.05, 0, 30), 'CONSTANT')
key(tun, 'location', 27.2, (-1.05, 0, 0.12), 'CONSTANT')
key(tun, 'scale', 0, (0.02, 1, 1))
key(tun, 'scale', 27.3, (0.02, 1, 1))
key(tun, 'scale', 30.2, (1, 1, 1))
for g in (ground, front):
    boolean(g, pit)
    boolean(g, tun)
cut(front, 8.5, 26.9)

# banco para dormir (al fondo del iglú, a la altura del suelo original)
bench = box('banco', 0.25, 1.72, 0.0, 1.4, -0.72, -0.02, m=M['snow'])
bench2 = box('banco_corte', 0.25, 1.72, -0.01, 0.0, -0.72, -0.02, m=M['snowcut'])
cut(bench, 26.9)
cut(bench2, 26.9)

# montañas y dunas de fondo
for i, (x, y, h, r) in enumerate([(-12, 26, 7, 8), (-2, 29, 9, 9), (9, 27, 6, 7), (15, 24, 4.5, 5)]):
    prim('cone', f'montana{i}', (x, y, h / 2 - 0.5), m=M['mount'], radius1=r, depth=h, vertices=7)
for i in range(7):
    x, y = random.uniform(-12, 12), random.uniform(4, 18)
    prim('uv_sphere', f'duna{i}', (x, y, -0.1), scale=(random.uniform(1.5, 3), 1.2, 0.35),
         m=M['snow'], segments=24, ring_count=12)

# ---------------------------------------------------------------- iglú
R, HZ = 2.0, 1.12  # radio y factor de altura del domo
blocks = []  # (obj, ring, angle)
rings = 8
for i in range(rings):
    ph0 = (math.pi / 2) * i / rings * 0.93
    ph1 = (math.pi / 2) * (i + 1) / rings * 0.93
    ph = (ph0 + ph1) / 2
    r = R * math.cos(ph)
    n = max(4, round(2 * math.pi * r / 0.62))
    bh = R * HZ * (math.sin(ph1) - math.sin(ph0))
    bw = 2 * math.pi * r / n * 0.94
    for j in range(n):
        a = 2 * math.pi * (j + 0.5 * (i % 2)) / n
        x, y = r * math.cos(a), r * math.sin(a)
        z = R * HZ * math.sin(ph)
        o = prim('cube', f'bloque_{i}_{j}', (x, y, z), scale=(0.15, bw / 2, bh / 2 * 0.94),
                 rot=(0, -ph * 0.9, a), m=M['block'])
        bv = o.modifiers.new('bisel', 'BEVEL')
        bv.width = 0.035
        bv.segments = 2
        blocks.append((o, i, a))
top_z = R * HZ * math.sin(math.pi / 2 * 0.93) + 0.05
cap = prim('cylinder', 'tapa', (0, 0, top_z), scale=(1, 1, 1), m=M['block'], radius=0.42, depth=0.22, vertices=24)
bv = cap.modifiers.new('bisel', 'BEVEL'); bv.width = 0.03; bv.segments = 2


def is_door(i, a):
    return i <= 1 and abs(math.cos(a) + 1) < 0.06


def is_window(i, a):
    return i == 2 and abs(a - math.pi / 2) < 0.2


# orden de construcción: anillos 0-1 en 8.6-12.4 ; resto en espiral 17.2-22.5 ; tapa 22.6
low = [b for b in blocks if b[1] <= 1]
high = [b for b in blocks if b[1] >= 2]
low.sort(key=lambda b: (b[1], b[2]))
high.sort(key=lambda b: (b[1], b[2]))
win_block = None
for k, (o, i, a) in enumerate(low + high):
    if i <= 1:
        t = 8.6 + 3.8 * k / len(low)
    else:
        t = 17.2 + 5.2 * (k - len(low)) / len(high)
    s = tuple(o.scale)
    t_out = None
    if is_door(i, a):
        t_out = 24.75
    if o.location.y < -0.12:
        t_out = 26.9  # corte: se va la mitad delantera
    if is_window(i, a):
        t_out = 61.9
        win_block = o
    loc = tuple(o.location)
    key(o, 'location', 0, (loc[0], loc[1], loc[2] + 0.7))
    key(o, 'location', t, (loc[0], loc[1], loc[2] + 0.7))
    key(o, 'location', t + 0.22, loc)
    pop(o, t, t_out, s=s, dur=0.22)
    if t_out == 26.9:
        key(o, 'scale', 26.9, (0.0001,) * 3, 'CONSTANT')
s = tuple(cap.scale)
key(cap, 'location', 0, (0, 0, top_z + 0.8))
key(cap, 'location', 22.55, (0, 0, top_z + 0.8))
key(cap, 'location', 22.8, (0, 0, top_z))
key(cap, 'location', 41.9, (0, 0, top_z))
key(cap, 'location', 42.5, (0.3, 0, top_z + 1.6))
pop(cap, 22.55, 42.55, s=s, dur=0.25)

# el bloque que se cae hacia adentro (13.0 - 17.0)
fall = prim('cube', 'bloque_cae', (0.15, 1.55, 1.25), scale=(0.15, 0.3, 0.2), rot=(0, 0, math.pi / 2), m=M['block'])
bv = fall.modifiers.new('bisel', 'BEVEL'); bv.width = 0.035; bv.segments = 2
fall.rotation_mode = 'XYZ'
key(fall, 'rotation_euler', 14.6, (0, 0, math.pi / 2))
key(fall, 'rotation_euler', 15.5, (-1.4, 0, math.pi / 2))
key(fall, 'location', 14.6, (0.15, 1.55, 1.25))
key(fall, 'location', 15.2, (0.15, 1.1, 0.9))
key(fall, 'location', 15.7, (0.15, 0.7, -0.55))
pop(fall, 13.4, 17.1, dur=0.25)

# hielo: las paredes se vuelven brillantes (44.1 - 46.5)
pb = M['block'].node_tree.nodes['Principled BSDF']
for t, ro, c in ((0, 0.6, (0.90, 0.94, 1.0)), (44.1, 0.6, (0.90, 0.94, 1.0)), (46.5, 0.12, (0.78, 0.9, 1.0))):
    pb.inputs['Roughness'].default_value = ro
    pb.inputs['Roughness'].keyframe_insert('default_value', frame=F(t))
    pb.inputs['Base Color'].default_value = (*c, 1)
    pb.inputs['Base Color'].keyframe_insert('default_value', frame=F(t))
    pb.inputs['Coat Weight'].default_value = 0 if t < 46 else 0.8
    pb.inputs['Coat Weight'].keyframe_insert('default_value', frame=F(t))

# techo del túnel (medio cilindro, solo la mitad trasera porque vemos en corte)
segs = 16
ro_, ri_ = 0.85, 0.55
L = 3.6
me = bpy.data.meshes.new('techo_tunel')
bm = bmesh.new()
vs = []
for k in range(segs + 1):
    a = math.pi / 2 * k / segs
    row = []
    for rr in (ro_, ri_):
        for x in (0, -L):
            row.append(bm.verts.new((x, rr * math.cos(a), rr * math.sin(a))))
    vs.append(row)
for k in range(segs):
    a0, a1 = vs[k], vs[k + 1]
    bm.faces.new((a0[0], a0[1], a1[1], a1[0]))  # exterior
    bm.faces.new((a0[2], a1[2], a1[3], a0[3]))  # interior
    bm.faces.new((a0[0], a1[0], a1[2], a0[2]))  # extremo puerta
    bm.faces.new((a0[1], a0[3], a1[3], a1[1]))  # extremo exterior
bm.faces.new((vs[0][0], vs[0][2], vs[0][3], vs[0][1]))  # cara de corte
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me); bm.free()
roof = link(bpy.data.objects.new('techo_tunel', me))
roof.data.materials.append(M['block'])
roof.location = (-1.85, 0, 0)
key(roof, 'scale', 0, (0.001, 1, 1), 'CONSTANT')
key(roof, 'scale', 28.0, (0.001, 1, 1))
key(roof, 'scale', 30.4, (1, 1, 1))

# ---------------------------------------------------------------- personaje
def person():
    root = link(bpy.data.objects.new('persona', None))
    parts = [
        prim('cylinder', 'p_cuerpo', (0, 0, 0.55), m=M['parka'], radius=0.26, depth=0.85, vertices=20),
        prim('uv_sphere', 'p_cadera', (0, 0, 0.15), scale=(1, 1, 0.6), m=M['parka'], radius=0.26, segments=20, ring_count=10),
        prim('uv_sphere', 'p_hombros', (0, 0, 0.97), scale=(1, 1, 0.6), m=M['parka'], radius=0.26, segments=20, ring_count=10),
        prim('uv_sphere', 'p_cabeza', (0, 0, 1.25), m=M['skin'], radius=0.17, segments=20, ring_count=12),
        prim('torus', 'p_capucha', (0, -0.02, 1.27), rot=(math.pi / 2 - 0.15, 0, 0), m=M['fur'],
             major_radius=0.19, minor_radius=0.07, major_segments=24, minor_segments=10),
        prim('uv_sphere', 'p_ojo1', (-0.06, -0.155, 1.28), m=M['dark'], radius=0.022, segments=8, ring_count=6),
        prim('uv_sphere', 'p_ojo2', (0.06, -0.155, 1.28), m=M['dark'], radius=0.022, segments=8, ring_count=6),
        prim('cylinder', 'p_brazo1', (-0.32, 0, 0.7), rot=(0, 0.25, 0), m=M['parka'], radius=0.08, depth=0.6, vertices=12),
        prim('cylinder', 'p_brazo2', (0.32, 0, 0.7), rot=(0, -0.25, 0), m=M['parka'], radius=0.08, depth=0.6, vertices=12),
        prim('cylinder', 'p_bota1', (-0.11, 0, -0.05), m=M['dark'], radius=0.09, depth=0.25, vertices=12),
        prim('cylinder', 'p_bota2', (0.11, 0, -0.05), m=M['dark'], radius=0.09, depth=0.25, vertices=12),
        prim('torus', 'p_borde', (0, 0, 0.03), m=M['fur'], major_radius=0.26, minor_radius=0.05, major_segments=24, minor_segments=8),
    ]
    for p in parts:
        p.parent = root
    return root


P = person()
P.rotation_mode = 'XYZ'
def ppose(t, loc, rot=(0, 0, 0), sc=(1, 1, 1), interp='CONSTANT'):
    key(P, 'location', t, loc, interp)
    key(P, 'rotation_euler', t, rot, interp)
    key(P, 'scale', t, sc, interp)

# cavando en el hueco (agacharse y levantarse)
for k in range(9):
    t = 0.3 * 0 + k * 0.55
    ppose(t, (0, 0.35, -0.7 + (-0.12 if k % 2 else 0)), (0.35 if k % 2 else 0.1, 0, 0.15), interp='BEZIER')
# tiritando con el viento
for k in range(14):
    t = 5.0 + k * 0.25
    ppose(t, (0.0 + (0.025 if k % 2 else -0.025), 0.35, -0.7), (0, 0, 0.15), interp='LINEAR')
ppose(8.5, (0, 0.35, -0.7), (0, 0, 0.15))
# cavando el túnel
ppose(26.9, (-3.6, 0.3, -1.5), (0, 0, -1.2))
for k in range(7):
    t = 27.3 + k * 0.6
    ppose(t, (-3.6 + 0.0, 0.3, -1.5 - (0.08 if k % 2 else 0)), (0.3 if k % 2 else 0.05, 0, -1.2), interp='BEZIER')
# sentado en el banco (oscuro, lámpara, goteras, respiradero)
ppose(33.4, (1.05, 0.55, -0.02), (0, 0, 0.35), (1, 1, 0.78))
ppose(50.86, (1.05, 0.55, -0.02), (0, 0, 0.35), (1, 1, 0.78))
# acostado en el banco, donde llega el aire caliente
ppose(50.9, (1.6, 0.6, 0.12), (0, -math.pi / 2, 0), (1, 1, 1))
ppose(68.6, (1.6, 0.6, 0.12), (0, -math.pi / 2, 0), (1, 1, 1))

# ---------------------------------------------------------------- lámpara de grasa de foca
lampbase = box('soporte_lampara', -0.25, 0.25, 0.45, 0.85, -0.72, -0.35, m=M['snow'])
lamp = prim('uv_sphere', 'lampara', (0, 0.65, -0.32), scale=(1, 0.6, 0.35), m=M['stone'], radius=0.22, segments=24, ring_count=12)
flame = prim('cone', 'llama', (0, 0.6, -0.16), m=M['flame'], radius1=0.05, depth=0.16, vertices=12)
cut(lampbase, 33.4)
cut(lamp, 33.4)
pop(flame, 36.6, dur=0.3)
light = bpy.data.lights.new('luz_lampara', 'POINT')
light.color = (1.0, 0.62, 0.3)
light.shadow_soft_size = 0.15
lo = link(bpy.data.objects.new('luz_lampara', light))
lo.location = (0, 0.45, 0.0)
key(light, 'energy', 0, 0.0, 'CONSTANT')
key(light, 'energy', 36.5, 0.0)
key(light, 'energy', 37.0, 260.0)
t = 37.0
while t < DUR:
    t += random.uniform(0.25, 0.5)
    key(light, 'energy', t, random.uniform(220, 290), 'BEZIER')
    key(flame, 'scale', t, (1, 1, random.uniform(0.8, 1.25)), 'BEZIER')

# ---------------------------------------------------------------- gotas (38.4 - 43.6)
for d in range(7):
    x = random.uniform(-1.3, 1.3)
    y = random.uniform(0.15, 0.9)
    rr = math.hypot(x, y)
    ztop = R * HZ * math.sqrt(max(0.05, 1 - (rr / R) ** 2)) - 0.3
    g = prim('uv_sphere', f'gota{d}', (x, y, ztop), scale=(0.7, 0.7, 1.1), m=M['water'], radius=0.05, segments=10, ring_count=8)
    key(g, 'scale', 0, (0.0001,) * 3, 'CONSTANT')
    t = 38.5 + d * 0.13
    while t < 43.4:
        key(g, 'scale', t, (0.0001,) * 3, 'CONSTANT')
        key(g, 'location', t, (x, y, ztop), 'CONSTANT')
        key(g, 'scale', t + 0.05, (0.7, 0.7, 1.1), 'CONSTANT')
        key(g, 'location', t + 0.35, (x, y, ztop), 'LINEAR')
        key(g, 'location', t + 0.75, (x, y, -0.7), 'LINEAR')
        key(g, 'scale', t + 0.75, (0.0001,) * 3, 'CONSTANT')
        t += 0.8 + random.uniform(0, 0.3)

# ---------------------------------------------------------------- vapor por el respiradero (43 - 51)
for v in range(8):
    s0 = random.uniform(0.18, 0.3)
    st = prim('uv_sphere', f'vapor{v}', (0, 0.1, top_z), m=M['steam'], radius=s0, segments=12, ring_count=8)
    key(st, 'scale', 0, (0.0001,) * 3, 'CONSTANT')
    t = 43.0 + v * 0.35
    while t < 50.8:
        dx = random.uniform(-0.3, 0.3)
        key(st, 'scale', t, (0.0001,) * 3, 'CONSTANT')
        key(st, 'location', t, (0, 0.1, top_z - 0.3), 'CONSTANT')
        key(st, 'scale', t + 0.05, (0.5, 0.5, 0.5), 'LINEAR')
        key(st, 'location', t + 2.6, (dx + 0.6, 0.1, top_z + 1.8), 'LINEAR')
        key(st, 'scale', t + 2.6, (1.4, 1.4, 1.4), 'LINEAR')
        key(st, 'scale', t + 2.65, (0.0001,) * 3, 'CONSTANT')
        t += 2.8

# ---------------------------------------------------------------- flechas
def arrow_run(name, m, p0, p1, rot, t0, t1, period=1.4, phase=0.0, length=1.0):
    a = arrow(name, m, length)
    a.rotation_euler = rot
    key(a, 'scale', 0, (0.0001,) * 3, 'CONSTANT')
    t = t0 + phase
    while t < t1 - 0.2:
        key(a, 'scale', t, (0.0001,) * 3, 'CONSTANT')
        key(a, 'location', t, p0, 'CONSTANT')
        key(a, 'scale', t + 0.15, (1, 1, 1), 'LINEAR')
        key(a, 'location', t + period - 0.15, p1, 'LINEAR')
        key(a, 'scale', t + period, (0.0001,) * 3, 'LINEAR')
        key(a, 'location', t + period, p1, 'CONSTANT')
        t += period
    return a


# viento helado entrando al hueco (5.0 - 8.5)
for k, z in enumerate((0.9, 0.45, 1.3)):
    arrow_run(f'viento{k}', M['wind'], (-4.5, -0.6, z), (-0.6, -0.6, z - 0.7), (0, 0.2, 0), 5.0, 8.5,
              period=1.15, phase=k * 0.35)
# calor escapando por la puerta (24.7 - 26.9)
for k, z in enumerate((0.25, 0.65)):
    arrow_run(f'calor_puerta{k}', M['hot'], (-1.2, -0.3, z), (-4.2, -0.3, z), (0, 0, math.pi), 24.75, 26.9,
              period=1.05, phase=k * 0.4)
# aire frío: entra por el túnel y se queda abajo (51 - 59.5)
for k in range(2):
    arrow_run(f'frio{k}', M['cold'], (-5.0, -0.12, -0.55 - 0.45 * k), (-2.0, -0.12, -1.25), (0, 0.2, 0), 51.5, 59.5,
              period=1.6, phase=k * 0.7)
# aire caliente: sube hasta el banco (54 - 59.5)
for k in range(3):
    arrow_run(f'caliente{k}', M['hot'], (-0.6 + 0.4 * k, -0.12, -0.55), (0.5 + 0.35 * k, -0.12, 0.65), (0, -0.9, 0),
              54.1, 59.5, period=1.5, phase=k * 0.45, length=0.9)

# ---------------------------------------------------------------- contornos "Esto es un..."
arc = [(2.45 * math.cos(a), -2.45, 2.45 * HZ * math.sin(a) + 0.02) for a in [math.pi * k / 40 for k in range(41)]]
outline('contorno_domo', arc, M['orange'], (0, -2.45, 1.0), 23.1, 24.7, cyclic=False)
outline('contorno_trampa', [(-5.65, -0.09, -1.62), (-1.0, -0.09, -1.62), (-1.0, -0.09, 0.95), (-5.65, -0.09, 0.95)],
        M['orange'], (-3.3, -0.09, -0.3), 31.1, 33.4)
circ = [(0.55 * math.cos(a), -0.12, top_z + 0.55 * math.sin(a)) for a in [2 * math.pi * k / 36 for k in range(36)]]
outline('contorno_respiradero', circ, M['orange'], (0, -0.12, top_z), 48.98, 50.86)

# ---------------------------------------------------------------- extras finales
for k, (x, y) in enumerate(((0.65, 0.45), (1.15, 0.9), (1.45, 0.4))):
    f = prim('uv_sphere', f'piel{k}', (x, y, 0.0), scale=(0.55, 0.42, 0.06), rot=(0, 0, random.uniform(0, 3)),
             m=M['caribou'], segments=20, ring_count=10)
    pop(f, 60.0 + 0.2 * k, s=tuple(f.scale))
if win_block is not None:
    wb = win_block
    w = prim('cube', 'ventana', tuple(wb.location), scale=tuple(wb.scale), rot=tuple(wb.rotation_euler), m=M['glass'])
    pop(w, 61.9, s=tuple(w.scale))


def dog():
    root = link(bpy.data.objects.new('perro', None))
    ps = [
        prim('uv_sphere', 'd_cuerpo', (0, 0, 0.18), scale=(1.6, 0.85, 0.7), m=M['dog'], radius=0.2, segments=20, ring_count=10),
        prim('uv_sphere', 'd_lomo', (0, 0.0, 0.25), scale=(1.4, 0.75, 0.45), m=M['dogd'], radius=0.2, segments=20, ring_count=10),
        prim('uv_sphere', 'd_cabeza', (0.38, 0, 0.2), m=M['dog'], radius=0.14, segments=16, ring_count=10),
        prim('uv_sphere', 'd_hocico', (0.5, 0, 0.17), scale=(1.2, 0.8, 0.7), m=M['dog'], radius=0.07, segments=12, ring_count=8),
        prim('uv_sphere', 'd_nariz', (0.58, 0, 0.18), m=M['dark'], radius=0.025, segments=8, ring_count=6),
        prim('cone', 'd_oreja1', (0.36, -0.07, 0.34), m=M['dogd'], radius1=0.05, depth=0.11, vertices=8),
        prim('cone', 'd_oreja2', (0.36, 0.07, 0.34), m=M['dogd'], radius1=0.05, depth=0.11, vertices=8),
        prim('uv_sphere', 'd_cola', (-0.38, 0, 0.3), scale=(0.9, 0.5, 0.5), m=M['dogd'], radius=0.1, segments=10, ring_count=8),
        prim('uv_sphere', 'd_ojo', (0.47, -0.11, 0.24), m=M['dark'], radius=0.018, segments=8, ring_count=6),
    ]
    for p in ps:
        p.parent = root
    return root


D = dog()
D.location = (-1.45, 0.15, -1.62)
D.rotation_euler = (0, 0, math.pi)
pop(D, 63.2, s=(1.4, 1.4, 1.4), dur=0.3)
tail = bpy.data.objects['d_cola']
for k in range(12):
    key(tail, 'rotation_euler', 63.6 + k * 0.3, (0, 0, 0.35 if k % 2 else -0.35))

# aurora al final
for k in range(3):
    me = bpy.data.meshes.new(f'aurora{k}')
    bm = bmesh.new()
    vs = []
    for i, x in enumerate(range(-18, 19, 2)):
        z0 = 12 + 1.5 * math.sin(x * 0.35 + k)
        vs.append((bm.verts.new((x, 22 + k * 2 + math.sin(x * 0.2) * 2, z0)),
                   bm.verts.new((x, 22 + k * 2 + math.sin(x * 0.2) * 2, z0 + 3.5 + k))))
    for a, b in zip(vs, vs[1:]):
        bm.faces.new((a[0], b[0], b[1], a[1]))
    bm.to_mesh(me); bm.free()
    au = link(bpy.data.objects.new(f'aurora{k}', me))
    am = M['aurora'].copy()
    au.data.materials.append(am)
    au.visible_diffuse = au.visible_glossy = False
    em = am.node_tree.nodes['Emission']
    cut(au, 64.8)
    for t, v in ((0, 0), (64.8, 0), (66.4, 0.55 - 0.12 * k)):
        em.inputs['Strength'].default_value = v
        em.inputs['Strength'].keyframe_insert('default_value', frame=F(t))

# ---------------------------------------------------------------- nieve que cae
emit = prim('plane', 'emisor_nieve', (0, -2, 9), m=None, size=34)
ps_mod = emit.modifiers.new('nieve', 'PARTICLE_SYSTEM')
pset = ps_mod.particle_system.settings
flake = prim('ico_sphere', 'copo', (0, 0, -50), m=M['snow'], radius=0.035, subdivisions=1)
pset.count = 5000
pset.frame_start = -200
pset.frame_end = NF
pset.lifetime = 260
pset.normal_factor = 0
pset.object_align_factor[2] = -1.2
pset.effector_weights.gravity = 0.12
pset.render_type = 'OBJECT'
pset.instance_object = flake
pset.particle_size = 1.0
pset.size_random = 0.6
pset.brownian_factor = 0.4
emit.show_instancer_for_render = False
bpy.ops.object.effector_add(type='WIND', location=(-10, 0, 5), rotation=(0, math.pi / 2, 0))
wind = bpy.context.active_object
wind.field.strength = 1.4
pc = ps_mod.particle_system.point_cache
pc.frame_start = 1
pc.frame_end = NF

# ---------------------------------------------------------------- luz y cielo
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, s in ((0, (0.42, 0.52, 0.68), 0.9), (33.3, (0.42, 0.52, 0.68), 0.9), (33.4, (0.05, 0.07, 0.14), 0.35),
                (68.6, (0.05, 0.07, 0.14), 0.35)):
    bg.inputs['Color'].default_value = (*c, 1)
    bg.inputs['Strength'].default_value = s
    bg.inputs['Color'].keyframe_insert('default_value', frame=F(t))
    bg.inputs['Strength'].keyframe_insert('default_value', frame=F(t))
for fc in world.node_tree.animation_data.action.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = 'CONSTANT'
sun = bpy.data.lights.new('sol', 'SUN')
sun.angle = math.radians(8)
so = link(bpy.data.objects.new('sol', sun))
so.rotation_euler = (math.radians(50), 0, math.radians(-35))
for t, e, c in ((0, 2.6, (0.95, 0.97, 1.0)), (33.3, 2.6, (0.95, 0.97, 1.0)), (33.4, 0.12, (0.6, 0.7, 1.0)),
                (68.6, 0.12, (0.6, 0.7, 1.0))):
    key(sun, 'energy', t, e, 'CONSTANT')
    key(sun, 'color', t, c, 'CONSTANT')

# ---------------------------------------------------------------- cámara (un plano por frase)
cam_d = bpy.data.cameras.new('cam')
cam_d.lens = 28
cam = link(bpy.data.objects.new('cam', cam_d))
sc.camera = cam
tgt = link(bpy.data.objects.new('mira', None))
tc = cam.constraints.new('TRACK_TO')
tc.target = tgt
tc.track_axis = 'TRACK_NEGATIVE_Z'
tc.up_axis = 'UP_Y'

SHOTS = [  # (inicio, cam_ini, mira_ini, cam_fin, mira_fin)
    (0.0, (0, -8.5, 1.6), (0, 0, -0.2), (0, -7.0, 1.2), (0, 0, -0.35)),
    (5.0, (-1.5, -8.5, 2.2), (-1.0, 0, 0.1), (-0.5, -8.0, 1.8), (-0.5, 0, 0.0)),
    (8.5, (6.5, -8.5, 4.5), (0, 0, 0.4), (4.0, -9.5, 4.0), (0, 0, 0.5)),
    (13.0, (3.2, -5.5, 3.6), (0, 0.6, 1.0), (2.6, -5.0, 3.2), (0, 0.6, 0.8)),
    (17.1, (-5.5, -8.0, 4.5), (0, 0, 1.0), (5.0, -8.5, 3.6), (0, 0, 1.0)),
    (23.0, (0, -10.5, 2.0), (0, 0, 1.0), (0, -9.8, 2.0), (0, 0, 1.0)),
    (24.7, (-7.0, -7.5, 2.2), (-2.0, 0, 0.6), (-6.3, -7.0, 2.0), (-2.0, 0, 0.6)),
    (26.9, (-2.2, -10.5, 1.1), (-2.2, 0, -0.4), (-2.2, -9.3, 0.9), (-2.4, 0, -0.5)),
    (33.4, (0.3, -6.5, 0.6), (0.3, 0, 0.0), (0.3, -6.0, 0.6), (0.3, 0, 0.0)),
    (38.4, (0, -5.2, 1.0), (0, 0.4, 1.0), (0, -4.8, 1.1), (0, 0.4, 1.0)),
    (41.7, (0, -7.5, 1.4), (0, 0, 1.4), (0, -7.0, 1.6), (0, 0, 1.6)),
    (50.9, (-1.9, -8.2, 0.4), (-1.9, 0, -0.3), (-1.9, -7.6, 0.4), (-1.9, 0, -0.3)),
    (59.5, (0.0, -7.0, 0.5), (0.2, 0, -0.1), (-0.8, -6.6, 0.3), (-0.6, 0, -0.5)),
    (65.0, (-0.5, -8.5, 1.0), (0, 0, 0.3), (0, -18.0, 5.0), (0, 0, 2.5)),
]
for k, (t0, c0, m0, c1, m1) in enumerate(SHOTS):
    t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
    key(cam, 'location', t0, c0, 'BEZIER')
    key(tgt, 'location', t0, m0, 'BEZIER')
    key(cam, 'location', t1 - 1 / FPS, c1, 'CONSTANT')
    key(tgt, 'location', t1 - 1 / FPS, m1, 'CONSTANT')

# ---------------------------------------------------------------- render
res = int(opt.get('--res', 540))
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = int(opt.get('--samples', 16))
sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 4
sc.cycles.transmission_bounces = 4
sc.cycles.diffuse_bounces = 2
sc.render.use_persistent_data = True
sc.render.resolution_x = res
sc.render.resolution_y = res * 16 // 9
sc.render.image_settings.file_format = 'PNG'
sc.render.use_overwrite = False  # permite retomar un render cortado
sc.render.use_placeholder = True
sc.render.filepath = OUT.rstrip('/') + '/f_'
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'

bpy.ops.ptcache.bake_all(bake=True)
if '--save' in opt:
    bpy.ops.wm.save_as_mainfile(filepath=opt['--save'])
if '--frames' in opt:
    a, b = opt['--frames'].split('-')
    sc.frame_start, sc.frame_end = int(a), int(b)
if '--stills' in opt:
    for f in opt['--stills'].split(','):
        sc.frame_set(int(f))
        sc.render.filepath = OUT.rstrip('/') + f'/s_{int(f):04d}.png'
        bpy.ops.render.render(write_still=True)
elif '--build-only' not in opt:
    bpy.ops.render.render(animation=True)
