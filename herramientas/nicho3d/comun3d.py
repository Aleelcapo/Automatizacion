"""Utilidades compartidas para las escenas 3D del nicho (Blender 4.2, Cycles)."""
import bpy, bmesh, math

FPS = 24


def F(t):
    return int(round(t * FPS)) + 1


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
    """Material plano emisivo (flechas, contornos)."""
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


def face_mats(o, rule):
    """Asigna índice de material por cara según su normal: rule(normal) -> índice."""
    for p in o.data.polygons:
        p.material_index = rule(p.normal)


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


def setattr_path(o, path, val):
    if '.' in path:
        a, b = path.rsplit('.', 1)
        setattr(o.path_resolve(a), b, val)
    else:
        setattr(o, path, val)


def key(o, path, t, val, interp='BEZIER'):
    setattr_path(o, path, val)
    o.keyframe_insert(path, frame=F(t))
    ad = getattr(o, 'animation_data', None)
    if ad and ad.action:
        for fc in ad.action.fcurves:
            if fc.data_path == path:
                for kp in fc.keyframe_points:
                    if abs(kp.co[0] - F(t)) < 0.5:
                        kp.interpolation = interp


def node_key(sock, t, val, interp='BEZIER'):
    sock.default_value = val
    sock.keyframe_insert('default_value', frame=F(t))
    nt = sock.id_data
    if nt.animation_data and nt.animation_data.action:
        for fc in nt.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                if abs(kp.co[0] - F(t)) < 0.5:
                    kp.interpolation = interp


Z = (0.0001,) * 3


def pop(o, t_in, t_out=None, s=None, dur=0.25):
    """Aparece con rebote; desaparece encogiéndose."""
    s = tuple(s or o.scale)
    key(o, 'scale', 0, Z, 'CONSTANT')
    key(o, 'scale', max(0, t_in - 0.01), Z)
    key(o, 'scale', t_in + dur * 0.7, tuple(v * 1.12 for v in s))
    key(o, 'scale', t_in + dur, s)
    if t_out is not None:
        key(o, 'scale', t_out - 0.15, s)
        key(o, 'scale', t_out, Z, 'CONSTANT')


def cut(o, t_in, t_out=None):
    """Visible solo entre t_in y t_out (corte seco)."""
    s = tuple(o.scale)
    key(o, 'scale', 0, s if t_in <= 0 else Z, 'CONSTANT')
    if t_in > 0:
        key(o, 'scale', t_in, s, 'CONSTANT')
    if t_out is not None:
        key(o, 'scale', t_out, Z, 'CONSTANT')


def arrow(name, m, length=1.0, w=0.09):
    shaft = prim('cylinder', name + '_s', (length / 2 - 0.15, 0, 0), rot=(0, math.pi / 2, 0),
                 radius=w, depth=length - 0.3, vertices=12, m=m)
    head = prim('cone', name + '_h', (length - 0.15, 0, 0), rot=(0, math.pi / 2, 0),
                radius1=w * 2.6, depth=0.36, vertices=16, m=m)
    root = link(bpy.data.objects.new(name, None))
    for c in (shaft, head):
        c.parent = root
    return root


def arrow_run(name, m, p0, p1, rot, t0, t1, period=1.4, phase=0.0, length=1.0):
    """Flecha que recorre p0 -> p1 en bucle entre t0 y t1."""
    a = arrow(name, m, length)
    a.rotation_euler = rot
    key(a, 'scale', 0, Z, 'CONSTANT')
    t = t0 + phase
    while t < t1 - 0.2:
        key(a, 'scale', t, Z, 'CONSTANT')
        key(a, 'location', t, p0, 'CONSTANT')
        key(a, 'scale', t + 0.15, (1, 1, 1), 'LINEAR')
        key(a, 'location', t + period - 0.15, p1, 'LINEAR')
        key(a, 'scale', t + period, Z, 'LINEAR')
        key(a, 'location', t + period, p1, 'CONSTANT')
        t += period
    return a


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


def rect_xz(x0, x1, z0, z1, y):
    return [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]


def person(name, M_body, M_trim, M_skin, M_dark, M_hair=None):
    root = link(bpy.data.objects.new(name, None))
    parts = [
        prim('cylinder', name + '_cuerpo', (0, 0, 0.55), m=M_body, radius=0.24, depth=0.85, vertices=20),
        prim('uv_sphere', name + '_cadera', (0, 0, 0.15), scale=(1, 1, 0.6), m=M_body, radius=0.24, segments=20, ring_count=10),
        prim('uv_sphere', name + '_hombros', (0, 0, 0.97), scale=(1, 1, 0.6), m=M_body, radius=0.24, segments=20, ring_count=10),
        prim('uv_sphere', name + '_cabeza', (0, 0, 1.25), m=M_skin, radius=0.17, segments=20, ring_count=12),
        prim('uv_sphere', name + '_ojo1', (-0.06, -0.155, 1.28), m=M_dark, radius=0.022, segments=8, ring_count=6),
        prim('uv_sphere', name + '_ojo2', (0.06, -0.155, 1.28), m=M_dark, radius=0.022, segments=8, ring_count=6),
        prim('cylinder', name + '_brazo1', (-0.3, 0, 0.7), rot=(0, 0.25, 0), m=M_body, radius=0.075, depth=0.6, vertices=12),
        prim('cylinder', name + '_brazo2', (0.3, 0, 0.7), rot=(0, -0.25, 0), m=M_body, radius=0.075, depth=0.6, vertices=12),
        prim('cylinder', name + '_pie1', (-0.1, 0, -0.04), m=M_dark, radius=0.08, depth=0.2, vertices=12),
        prim('cylinder', name + '_pie2', (0.1, 0, -0.04), m=M_dark, radius=0.08, depth=0.2, vertices=12),
        prim('torus', name + '_faja', (0, 0, 0.45), m=M_trim, major_radius=0.245, minor_radius=0.04, major_segments=24, minor_segments=8),
    ]
    if M_hair:
        parts.append(prim('uv_sphere', name + '_pelo', (0, 0.02, 1.31), scale=(1.05, 1.05, 0.8), m=M_hair,
                          radius=0.17, segments=20, ring_count=10))
    for p in parts:
        p.parent = root
    return root


def camera_shots(shots, dur, lens=28):
    """shots: (inicio, cam_ini, mira_ini, cam_fin, mira_fin); corte seco entre planos."""
    cam_d = bpy.data.cameras.new('cam')
    cam_d.lens = lens
    cam = link(bpy.data.objects.new('cam', cam_d))
    bpy.context.scene.camera = cam
    tgt = link(bpy.data.objects.new('mira', None))
    tc = cam.constraints.new('TRACK_TO')
    tc.target = tgt
    tc.track_axis = 'TRACK_NEGATIVE_Z'
    tc.up_axis = 'UP_Y'
    for k, (t0, c0, m0, c1, m1) in enumerate(shots):
        t1 = shots[k + 1][0] if k + 1 < len(shots) else dur
        key(cam, 'location', t0, c0, 'BEZIER')
        key(tgt, 'location', t0, m0, 'BEZIER')
        key(cam, 'location', t1 - 1 / FPS, c1, 'CONSTANT')
        key(tgt, 'location', t1 - 1 / FPS, m1, 'CONSTANT')
    return cam


def render_setup(out, opt, nf):
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, nf
    sc.render.fps = FPS
    res = int(opt.get('--res', 486))
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(opt.get('--samples', 10))
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.diffuse_bounces = 2
    sc.render.use_persistent_data = True
    sc.render.resolution_x = res
    sc.render.resolution_y = res * 16 // 9
    sc.render.image_settings.file_format = 'PNG'
    sc.render.use_overwrite = False  # permite retomar un render cortado
    sc.render.use_placeholder = True
    sc.render.filepath = out.rstrip('/') + '/f_'
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'


def run(out, opt):
    sc = bpy.context.scene
    if '--save' in opt:
        bpy.ops.wm.save_as_mainfile(filepath=opt['--save'])
    if '--frames' in opt:
        a, b = opt['--frames'].split('-')
        sc.frame_start, sc.frame_end = int(a), int(b)
    if '--stills' in opt:
        for f in opt['--stills'].split(','):
            sc.frame_set(int(f))
            sc.render.filepath = out.rstrip('/') + f'/s_{int(f):04d}.png'
            bpy.ops.render.render(write_still=True)
    else:
        bpy.ops.render.render(animation=True)
