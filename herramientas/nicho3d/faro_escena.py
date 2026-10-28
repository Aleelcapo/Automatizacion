"""Escena 3D del faro (nicho 3D de arquitectura), sincronizada con el audio.

Uso:
  blender -b -P faro_escena.py -- OUT_DIR [--frames A-B] [--res 486] [--samples 10] [--stills 1,200]

Noche casi todo el video (para que se vea la luz); de día solo cuando el guion habla de
las rayas pintadas. La torre está hecha de dos mitades para poder abrirla al final y
mostrar la escalera de caracol.
"""
import bpy, bmesh, math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3d import *  # noqa

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/faro'
opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1) if argv[i].startswith('--')}

DUR = 59.8  # audio 58.96 s + cola
NF = int(round(DUR * FPS))
random.seed(21)

clean()
sc = bpy.context.scene

M = dict(
    sea=mat('mar', (0.08, 0.22, 0.38), 0.15),
    sand=mat('arena', (0.78, 0.70, 0.52), 0.9),
    rock=mat('roca', (0.36, 0.34, 0.33), 0.9),
    stone=mat('piedra_torre', (0.80, 0.78, 0.74), 0.85),
    red=mat('franja_roja', (0.80, 0.10, 0.08), 0.7),
    black=mat('franja_negra', (0.06, 0.06, 0.07), 0.7),
    iron=mat('hierro', (0.12, 0.13, 0.14), 0.4, spec=0.7),
    glass=mat('vidrio', (0.85, 0.92, 1.0), 0.05, alpha=0.25),
    log=mat('lena', (0.40, 0.26, 0.14), 0.85),
    hull=mat('casco', (0.45, 0.20, 0.12), 0.8),
    sail=mat('vela', (0.92, 0.90, 0.84), 0.9),
    mirror=mat('espejo', (0.9, 0.9, 0.92), 0.05, spec=1.0),
    lensm=mat('lente', (0.75, 0.95, 0.85), 0.05, alpha=0.55),
    smoke=mat('humo', (0.25, 0.25, 0.25), 0.9, alpha=0.6),
    cloth=mat('ropa', (0.15, 0.22, 0.40), 0.85),
    trim=mat('ribete', (0.90, 0.80, 0.30), 0.7),
    skin=mat('piel', (0.75, 0.55, 0.40), 0.6),
    hair=mat('pelo', (0.40, 0.40, 0.42), 0.7),
    dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
    gull=mat('gaviota', (0.95, 0.95, 0.95), 0.8),
    gullg=mat('gaviota_gris', (0.55, 0.57, 0.60), 0.8),
    beak=mat('pico', (0.95, 0.70, 0.15), 0.6),
    mug=mat('taza', (0.85, 0.20, 0.15), 0.5),
    fire=flat_mat('fuego', (1.0, 0.5, 0.12), 9.0),
    flame=flat_mat('llama', (1.0, 0.82, 0.45), 14.0),
    beam=flat_mat('haz', (1.0, 0.92, 0.65), 0.8),
    orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
    wind=flat_mat('viento', (0.85, 0.92, 1.0), 2.0),
    rain=flat_mat('lluvia', (0.70, 0.82, 1.0), 1.2),
    shiplight=flat_mat('luz_barco', (1.0, 0.85, 0.5), 8.0),
)
# haz de luz: emisión mezclada con transparencia
bm_nt = M['beam'].node_tree
em = bm_nt.nodes['Emission']
tr = bm_nt.nodes.new('ShaderNodeBsdfTransparent')
mix = bm_nt.nodes.new('ShaderNodeMixShader')
mix.inputs['Fac'].default_value = 0.22
out = bm_nt.nodes['Material Output']
bm_nt.links.new(tr.outputs[0], mix.inputs[1])
bm_nt.links.new(em.outputs[0], mix.inputs[2])
bm_nt.links.new(mix.outputs[0], out.inputs[0])
M['beam'].blend_method = 'BLEND'

# ---------------------------------------------------------------- costa
sea = box('mar', -80, 80, -80, 120, -3, -0.25, m=M['sea'])
box('playa', -40, 6, -6, 60, -3, 0.0, m=M['sand'])
box('acantilado', -40, 2.5, 4, 60, -3, 1.2, m=M['rock'])
for k in range(16):
    x = random.uniform(-6, 7)
    y = random.uniform(-4, 4)
    prim('ico_sphere', f'roca{k}', (x, y, -0.1), scale=(random.uniform(0.5, 1.4), random.uniform(0.5, 1.2), random.uniform(0.3, 0.8)),
         rot=(random.uniform(0, 3), random.uniform(0, 3), 0), m=M['rock'], radius=1, subdivisions=1)
TX, TY = 0.0, 1.5     # base de la torre (sobre la playa)
# otra costa con otro faro a lo lejos
box('otra_costa', -70, -30, 40, 70, -3, 1.0, m=M['rock'])

# ---------------------------------------------------------------- fogata de la playa (0 - 7.7)
camp = link(bpy.data.objects.new('fogata', None))
for k in range(5):
    lg = prim('cylinder', f'lena{k}', (0, 0, 0.1), rot=(math.pi / 2 - 0.2, 0, k * 1.2), m=M['log'], radius=0.06, depth=0.7, vertices=8)
    lg.parent = camp
fl0 = prim('cone', 'fuego_playa', (0, 0, 0.4), m=M['fire'], radius1=0.25, depth=0.7, vertices=10)
fl0.parent = camp
camp.location = (3.2, -2.5, 0)
cut(camp, 0, 7.7)
L0 = bpy.data.lights.new('luz_fogata', 'POINT')
L0.color = (1.0, 0.5, 0.15)
lo0 = link(bpy.data.objects.new('luz_fogata', L0))
lo0.location = (3.2, -2.5, 1.0)
key(L0, 'energy', 0, 250, 'CONSTANT')
key(L0, 'energy', 7.7, 0, 'CONSTANT')


def ship(name, light=True):
    root = link(bpy.data.objects.new(name, None))
    ps = [prim('uv_sphere', name + '_casco', (0, 0, 0), scale=(2.2, 0.7, 0.55), m=M['hull'], radius=1, segments=20, ring_count=10),
          prim('cylinder', name + '_mastil', (0, 0, 2.0), m=M['log'], radius=0.07, depth=3.6, vertices=8),
          box(name + '_vela', -0.05, 0.05, -1.1, 1.1, 0.8, 3.4, m=M['sail'])]
    ps[-1].rotation_euler = (0, 0, math.pi / 2)
    if light:
        ps.append(prim('uv_sphere', name + '_farol', (1.9, 0, 0.7), m=M['shiplight'], radius=0.1, segments=8, ring_count=6))
    for p in ps:
        p.parent = root
    return root


SH = ship('barco')
SH.location = (22, 26, -0.25)
SH.rotation_euler = (0, 0, 2.6)
t = 0
while t < DUR:   # se mece
    key(SH, 'rotation_euler', t, (random.uniform(-0.04, 0.04), random.uniform(-0.03, 0.03), 2.6))
    t += 1.3
# confusión entre los dos faros (36.5 - 39.5): el barco duda
key(SH, 'location', 0, (22, 26, -0.25), 'CONSTANT')
key(SH, 'location', 36.4, (22, 26, -0.25))
key(SH, 'location', 37.6, (19, 30, -0.25))
key(SH, 'location', 38.6, (23, 28, -0.25))
key(SH, 'location', 39.5, (21, 26, -0.25))

# ---------------------------------------------------------------- torre (dos mitades)
H = 8.0
R0, R1 = 1.45, 1.0


def half_frustum(name, r0, r1, z0, z1, side, m, thick=0.18):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=48, radius1=r0, radius2=r1, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2))
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0),
                                 plane_no=(0, side, 0), clear_inner=True)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    sol = o.modifiers.new('grosor', 'SOLIDIFY')
    sol.thickness = thick
    return o


tower = link(bpy.data.objects.new('torre', None))
tower.location = (TX, TY, 0)
halves = {}
for side, nm in ((1, 'atras'), (-1, 'frente')):
    o = half_frustum(f'torre_{nm}', R0, R1, 0, H, side, M['stone'])
    o.parent = tower
    halves[nm] = o
key(tower, 'scale', 0, Z, 'CONSTANT')
key(tower, 'scale', 7.9, (1, 1, 0.02))
key(tower, 'scale', 9.6, (1, 1, 1))
# franjas pintadas (44.3)
bands = []
for k in range(4):
    z0 = 0.6 + k * 2.0
    rr0 = R0 + (R1 - R0) * z0 / H + 0.02
    rr1 = R0 + (R1 - R0) * (z0 + 1.0) / H + 0.02
    for side, nm in ((1, 'atras'), (-1, 'frente')):
        b = half_frustum(f'franja{k}_{nm}', rr0, rr1, z0, z0 + 1.0, side, M['red'], thick=0.02)
        b.parent = tower
        bands.append((b, nm))
        pop(b, 44.3 + 0.1 * k, s=(1, 1, 1), dur=0.2)
# la mitad delantera se abre al final (51.3) para ver la escalera
for b, nm in bands:
    if nm == 'frente':
        key(b, 'scale', 51.25, (1, 1, 1), 'CONSTANT')
        key(b, 'scale', 51.3, Z, 'CONSTANT')
cut(halves['frente'], 0, 51.3)
# escalera de caracol (visible al abrir)
for k in range(44):
    a = k * 0.42
    z = 0.15 + k * 0.17
    st = box(f'escalon{k}', 0, 0.85, -0.18, 0.18, -0.05, 0.05, m=M['stone'], origin=(0, 0, 0))
    st.parent = tower
    st.location = (0, 0, z)
    st.rotation_euler = (0, 0, a)
    pop(st, 51.4 + 0.012 * k, s=(1, 1, 1), dur=0.15)
core = prim('cylinder', 'eje_escalera', (0, 0, H / 2), m=M['stone'], radius=0.15, depth=H, vertices=12)
core.parent = tower
pop(core, 51.35, s=(1, 1, 1), dur=0.2)

# ---------------------------------------------------------------- linterna, galería y fuego arriba
TOP = H
gallery = prim('cylinder', 'galeria', (0, 0, TOP + 0.05), m=M['iron'], radius=R1 + 0.45, depth=0.12, vertices=32)
rail = prim('torus', 'baranda', (0, 0, TOP + 0.65), m=M['iron'], major_radius=R1 + 0.42, minor_radius=0.025,
            major_segments=40, minor_segments=6)
glass = prim('cylinder', 'cuarto_vidrio', (0, 0, TOP + 0.95), m=M['glass'], radius=0.85, depth=1.7, vertices=24)
roof = prim('cone', 'cupula', (0, 0, TOP + 2.1), m=M['iron'], radius1=1.0, depth=0.7, vertices=24)
lantern_parts = [gallery, rail, glass, roof]
for k, p in enumerate(lantern_parts):
    p.parent = tower
    pop(p, 13.6 + 0.4 * k, s=(1, 1, 1), dur=0.25)
fire_top = prim('cone', 'fuego_torre', (0, 0, TOP + 0.45), m=M['fire'], radius1=0.3, depth=0.8, vertices=10)
fire_top.parent = tower
for t, s in ((0, Z), (8.4, Z), (9.7, (1, 1, 1)), (11.6, (1, 1, 1)), (12.3, Z), (14.9, Z), (15.4, (1, 1, 1)),
             (21.3, (1, 1, 1)), (21.6, Z)):
    key(fire_top, 'scale', t, s, 'CONSTANT' if s == Z else 'BEZIER')
Lt = bpy.data.lights.new('luz_torre', 'POINT')
Lt.color = (1.0, 0.65, 0.3)
Lt.shadow_soft_size = 0.2
lt = link(bpy.data.objects.new('luz_torre', Lt))
lt.parent = tower
lt.location = (0, -1.6, TOP + 1.0)
for t, e in ((0, 0), (9.6, 0), (9.9, 600), (11.6, 600), (12.3, 0), (15.1, 0), (15.5, 600), (18.0, 600), (20.4, 120),
             (21.5, 120), (21.8, 0), (22.6, 0), (23.0, 700)):
    key(Lt, 'energy', t, e)
# humo y hollín (17.6 - 20.9)
for k in range(6):
    sm = prim('uv_sphere', f'humo{k}', (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), TOP + 0.9 + random.uniform(-0.3, 0.5)),
              m=M['smoke'], radius=0.3, segments=12, ring_count=8)
    sm.parent = tower
    pop(sm, 18.0 + 0.2 * k, 21.0, s=(1, 1, 1), dur=0.4)
pg = M['glass'].node_tree.nodes['Principled BSDF']
for t, c, a in ((0, (0.85, 0.92, 1.0), 0.25), (18.6, (0.85, 0.92, 1.0), 0.25), (20.2, (0.12, 0.11, 0.10), 0.85),
                (21.0, (0.12, 0.11, 0.10), 0.85), (21.4, (0.85, 0.92, 1.0), 0.25)):
    node_key(pg.inputs['Base Color'], t, (*c, 1))
    node_key(pg.inputs['Alpha'], t, a)
# lámpara de aceite y espejos (20.9 - 27)
lamp = prim('cylinder', 'lampara_aceite', (0, 0, TOP + 0.35), m=M['trim'], radius=0.18, depth=0.4, vertices=16)
lflame = prim('cone', 'llama_lampara', (0, 0, TOP + 0.75), m=M['flame'], radius1=0.1, depth=0.3, vertices=10)
mirror = prim('uv_sphere', 'espejo', (0, 0.55, TOP + 0.75), scale=(1, 0.35, 1), m=M['mirror'], radius=0.55, segments=24, ring_count=12)
for o in (lamp, lflame):
    o.parent = tower
    pop(o, 22.7, s=(1, 1, 1), dur=0.25)
mirror.parent = tower
pop(mirror, 24.3, 30.9, s=(1, 0.35, 1), dur=0.3)


def beam_cone(name, length=14, r=1.3):
    c = prim('cone', name, (0, 0, 0), m=M['beam'], radius1=0.25, radius2=r, depth=length, vertices=24)
    for v in c.data.vertices:
        v.co.z += length / 2
    c.parent = tower
    c.location = (0, 0, TOP + 0.75)
    c.visible_shadow = False
    return c


# haz hacia el mar con espejos (25.5 - 27)
b1 = beam_cone('haz_espejo', 12, 2.2)
b1.rotation_euler = (-math.pi / 2, 0, -0.73)   # hacia el barco
pop(b1, 25.5, 27.0, s=(1, 1, 1), dur=0.4)
# la luz se escapa en todas direcciones (27.4 - 30)
for k in range(10):
    c = beam_cone(f'haz_disperso{k}', 7, 1.6)
    c.rotation_euler = (math.pi / 2 + random.uniform(-0.5, 0.5), 0, 2 * math.pi * k / 10)
    pop(c, 27.5 + 0.05 * k, 30.3, s=(1, 1, 1), dur=0.3)
# lente Fresnel (31.3) y un solo rayo (33.4)
lens = link(bpy.data.objects.new('lente_fresnel', None))
lens.parent = tower
lens.location = (0, 0, TOP + 0.75)
for k in range(7):
    ring = prim('torus', f'anillo{k}', (0, 0, -0.45 + 0.15 * k), m=M['lensm'], major_radius=0.45 - abs(k - 3) * 0.05,
                minor_radius=0.06, major_segments=32, minor_segments=8)
    ring.parent = lens
    pop(ring, 31.3 + 0.12 * k, s=(1, 1, 1), dur=0.2)
circ = [(0.75 * math.cos(a), 0, 0.75 * math.sin(a)) for a in [2 * math.pi * k / 40 for k in range(40)]]
oc = curve_obj('contorno_lente', circ, M['orange'])
oc.parent = tower
oc.location = (0, -0.95, TOP + 0.75)
pop(oc, 34.5, 36.4, s=(1, 1, 1), dur=0.3)
beam_main = link(bpy.data.objects.new('haz_giratorio', None))
beam_main.parent = tower
beam_main.location = (0, 0, 0)
for k, a in enumerate((0, math.pi)):
    c = beam_cone(f'haz_principal{k}', 26, 1.2)
    c.parent = beam_main
    c.location = (0, 0, TOP + 0.75)
    c.rotation_euler = (math.pi / 2, 0, a + math.pi / 2)
key(beam_main, 'scale', 0, Z, 'CONSTANT')
key(beam_main, 'scale', 33.4, (1, 1, 1), 'CONSTANT')
key(beam_main, 'scale', 44.0, (1, 1, 1), 'CONSTANT')
key(beam_main, 'scale', 44.05, Z, 'CONSTANT')     # de día no se ve
key(beam_main, 'scale', 56.7, (1, 1, 1), 'CONSTANT')
key(beam_main, 'rotation_euler', 0, (0, 0, -0.35), 'CONSTANT')
key(beam_main, 'rotation_euler', 39.6, (0, 0, -0.35))
key(beam_main, 'rotation_euler', 44.0, (0, 0, -0.35 + 2 * math.pi * 2.2), 'LINEAR')
key(beam_main, 'rotation_euler', 56.7, (0, 0, -0.35 + 2 * math.pi * 2.2), 'CONSTANT')
key(beam_main, 'rotation_euler', DUR, (0, 0, -0.35 + 2 * math.pi * 3.2), 'LINEAR')

# ---------------------------------------------------------------- el otro faro (luz fija y luego destellos) y sus rayas
other = link(bpy.data.objects.new('otro_faro', None))
other.location = (-42, 52, 1.0)
o_t = prim('cone', 'otro_torre', (0, 0, 3.5), m=M['stone'], radius1=1.2, radius2=0.8, depth=7, vertices=24)
o_l = prim('uv_sphere', 'otro_luz', (0, 0, 7.4), m=M['flame'], radius=0.55, segments=16, ring_count=8)
o_t.parent = other
o_l.parent = other
key(other, 'scale', 0, Z, 'CONSTANT')
key(other, 'scale', 36.4, (1, 1, 1), 'CONSTANT')
for k in range(5):  # rayas negras en espiral simple: franjas alternas distintas
    b = prim('cylinder', f'otro_franja{k}', (0, 0, 0.7 + 1.35 * k), m=M['black'], radius=1.17 - 0.08 * k, depth=0.5, vertices=24)
    b.parent = other
    pop(b, 47.6 + 0.1 * k, s=(1, 1, 1), dur=0.2)
for t in [39.6 + 0.6 * j for j in range(7)]:   # destella a otro ritmo
    key(o_l, 'scale', t, (1, 1, 1), 'CONSTANT')
    key(o_l, 'scale', t + 0.3, Z, 'CONSTANT')
key(o_l, 'scale', 44.0, Z, 'CONSTANT')
key(o_l, 'scale', 56.7, (1, 1, 1), 'CONSTANT')

# ---------------------------------------------------------------- viento y lluvia (10.5 - 12.7)
for k, z in enumerate((5.5, 7.0, 8.6)):
    arrow_run(f'viento{k}', M['wind'], (TX - 6.0, TY - 1.5, z), (TX - 1.2, TY - 1.5, z + 0.3), (0, -0.05, 0), 10.6, 12.8,
              period=0.9, phase=0.3 * k, length=1.3)
for k in range(40):
    r = prim('cylinder', f'lluvia{k}', (0, 0, 0), m=M['rain'], radius=0.015, depth=0.5, vertices=4)
    x = TX + random.uniform(-5, 5)
    y = TY + random.uniform(-4, 1)
    key(r, 'scale', 0, Z, 'CONSTANT')
    t = 10.6 + random.uniform(0, 0.5)
    while t < 12.8:
        key(r, 'scale', t, Z, 'CONSTANT')
        key(r, 'location', t, (x, y, 11), 'CONSTANT')
        key(r, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
        key(r, 'location', t + 0.5, (x + 1.0, y, 0), 'LINEAR')
        key(r, 'scale', t + 0.5, Z, 'CONSTANT')
        t += 0.55
outline('contorno_linterna', [(TX + 1.15 * math.cos(a), TY - 1.2, TOP + 1.0 + 1.15 * math.sin(a)) for a in
                              [2 * math.pi * k / 40 for k in range(40)]], M['orange'], (TX, TY - 1.2, TOP + 1.0), 16.0, 17.6)

# ---------------------------------------------------------------- farero, café y gaviota (51.3 - 56.8)
K = person('farero', M['cloth'], M['trim'], M['skin'], M['dark'], M['hair'])
K.location = (TX + 0.7, TY - 1.05, TOP + 0.11)
mugo = prim('cylinder', 'taza', (0.32, -0.2, 0.75), m=M['mug'], radius=0.06, depth=0.12, vertices=12)
mugo.parent = K
pop(K, 53.4, s=(1, 1, 1), dur=0.25)
pop(mugo, 54.1, s=(1, 1, 1), dur=0.2)
steam = prim('uv_sphere', 'vapor_cafe', (0.32, -0.2, 0.9), m=M['smoke'], radius=0.05, segments=8, ring_count=6)
steam.parent = K
pop(steam, 54.2, s=(1, 1, 1), dur=0.2)


def gull():
    root = link(bpy.data.objects.new('gaviota', None))
    ps = [prim('uv_sphere', 'gv_cuerpo', (0, 0, 0.15), scale=(1.6, 0.8, 0.8), m=M['gull'], radius=0.12, segments=12, ring_count=8),
          prim('uv_sphere', 'gv_cabeza', (0.2, 0, 0.28), m=M['gull'], radius=0.07, segments=12, ring_count=8),
          prim('cone', 'gv_pico', (0.3, 0, 0.27), rot=(0, math.pi / 2, 0), m=M['beak'], radius1=0.02, depth=0.08, vertices=6),
          prim('uv_sphere', 'gv_ala', (-0.04, 0, 0.2), scale=(1.5, 0.9, 0.4), m=M['gullg'], radius=0.12, segments=12, ring_count=8),
          prim('uv_sphere', 'gv_ojo', (0.24, -0.05, 0.3), m=M['dark'], radius=0.01, segments=6, ring_count=4)]
    for p in ps:
        p.parent = root
    return root


GL = gull()
GL.scale = (1.8, 1.8, 1.8)
key(GL, 'scale', 0, Z, 'CONSTANT')
key(GL, 'scale', 54.6, (1.8, 1.8, 1.8), 'CONSTANT')
key(GL, 'location', 54.6, (TX + 6.0, TY - 4.0, TOP + 3.0))
key(GL, 'location', 55.3, (TX - 0.8, TY - 1.17, TOP + 0.67))
GL.rotation_euler = (0, 0, -0.3)

# ---------------------------------------------------------------- cielo: noche, día (44 - 56.7) y atardecer al final
world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
for t, c, st, interp in ((0, (0.05, 0.08, 0.18), 0.6, 'CONSTANT'), (44.0, (0.05, 0.08, 0.18), 0.6, 'CONSTANT'),
                         (44.05, (0.50, 0.70, 0.95), 0.9, 'CONSTANT'), (56.7, (0.50, 0.70, 0.95), 0.9, 'CONSTANT'),
                         (56.75, (0.75, 0.48, 0.38), 0.7, 'CONSTANT')):
    node_key(bg.inputs['Color'], t, (*c, 1), interp)
    node_key(bg.inputs['Strength'], t, st, interp)
moon = bpy.data.lights.new('luna', 'SUN')
moon.angle = math.radians(4)
mo = link(bpy.data.objects.new('luna', moon))
mo.rotation_euler = (math.radians(55), 0, math.radians(-30))
for t, e, c in ((0, 0.5, (0.6, 0.7, 1.0)), (44.0, 0.5, (0.6, 0.7, 1.0)), (44.05, 3.4, (1.0, 0.96, 0.88)),
                (56.7, 3.4, (1.0, 0.96, 0.88)), (56.75, 1.6, (1.0, 0.62, 0.40))):
    key(moon, 'energy', t, e, 'CONSTANT')
    key(moon, 'color', t, c, 'CONSTANT')

# ---------------------------------------------------------------- cámara
camera_shots([
    (0.0, (6.5, -9.0, 2.2), (3.2, -2.0, 0.6), (5.8, -8.2, 2.0), (3.2, -2.0, 0.6)),
    (5.7, (27.0, 30.0, 3.6), (3.0, -2.0, 0.5), (26.6, 29.4, 3.5), (3.0, -2.0, 0.5)),     # desde el barco
    (7.72, (8.5, -12.0, 4.0), (TX, TY, 4.0), (7.0, -12.5, 5.0), (TX, TY, 4.8)),
    (13.0, (4.5, -7.5, 10.5), (TX, TY, 8.8), (3.8, -7.0, 10.0), (TX, TY, 8.8)),
    (20.92, (3.2, -5.0, 10.0), (TX, TY, 8.8), (2.8, -4.6, 9.8), (TX, TY, 8.8)),
    (26.9, (8.0, -12.0, 10.0), (TX, TY, 7.5), (7.0, -12.5, 10.0), (TX, TY, 7.5)),
    (29.98, (3.0, -4.6, 9.4), (TX, TY, 8.8), (2.6, -4.3, 9.3), (TX, TY, 8.8)),
    (33.4, (12.0, -16.0, 7.0), (TX, TY + 6, 4.0), (10.0, -17.0, 8.0), (TX, TY + 6, 4.0)),
    (36.5, (34.0, -22.0, 14.0), (-18.0, 28.0, 3.0), (33.0, -23.0, 14.0), (-18.0, 28.0, 3.0)),
    (39.52, (14.0, -18.0, 9.0), (-6.0, 20.0, 4.0), (12.0, -19.0, 9.5), (-6.0, 20.0, 4.0)),
    (44.06, (6.5, -11.0, 3.5), (TX, TY, 4.5), (5.5, -11.5, 4.0), (TX, TY, 4.5)),
    (47.3, (-31.0, 41.0, 4.5), (-42.0, 52.0, 4.5), (-31.5, 41.5, 4.5), (-42.0, 52.0, 4.5)),
    (51.3, (1.0, -8.5, 5.5), (TX, TY, 4.5), (1.4, -8.0, 7.5), (TX, TY, 7.0)),
    (53.3, (2.8, -5.0, 9.6), (TX + 0.6, TY - 1.0, 8.8), (2.4, -4.6, 9.5), (TX + 0.2, TY - 1.0, 8.8)),
    (56.76, (8.0, -12.0, 5.0), (TX, TY, 5.0), (16.0, -26.0, 10.0), (TX, TY + 4, 5.0)),
], DUR)

render_setup(OUT, opt, NF)
run(OUT, opt)
