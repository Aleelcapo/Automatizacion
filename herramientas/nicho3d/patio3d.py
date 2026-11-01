"""Escenario común para la serie de humor: casa de dos pisos con patio y la tierra cortada al frente.

La cara de corte del terreno está en y=0 (mirando a la cámara, que está en y<0). Las excavaciones
son cortadores booleanos que crecen; lo que se construye bajo tierra vive en y >= 0.
"""
import bpy, math, random
from comun3d import *  # noqa

GX0, GX1, GY1, GZ0 = -30.0, 40.0, 30.0, -10.0
HOUSE_Y0, HOUSE_Y1 = 16.0, 22.0


def materiales():
    return dict(
        grass=mat('pasto_patio', (0.30, 0.52, 0.18), 0.9),
        soil=mat('tierra_corte', (0.45, 0.28, 0.16), 0.95),
        hole=mat('tierra_hueco', (0.36, 0.22, 0.12), 0.95),
        pav=mat('piedra_terraza', (0.80, 0.70, 0.60), 0.8),
        wall=mat('casa_pared', (0.86, 0.72, 0.58), 0.9),
        roof=mat('teja_techo', (0.55, 0.25, 0.15), 0.8),
        trim=mat('marco_blanco', (0.95, 0.95, 0.93), 0.5),
        glass=mat('vidrio_ventana', (0.25, 0.35, 0.45), 0.08, spec=0.9),
        shutter=mat('postigo', (0.12, 0.28, 0.42), 0.6),
        fence=mat('barda_madera', (0.55, 0.38, 0.22), 0.85),
        bark=mat('tronco_arbol', (0.35, 0.25, 0.16), 0.9),
        leaf=mat('hoja_arbol', (0.20, 0.42, 0.15), 0.85),
        pot=mat('maceta', (0.75, 0.38, 0.20), 0.7),
        flower=mat('flor', (0.95, 0.35, 0.45), 0.7),
        hose=mat('manguera', (0.15, 0.45, 0.25), 0.4),
        metal=mat('metal', (0.30, 0.31, 0.33), 0.35, spec=0.8),
        cloth=mat('ropa', (0.85, 0.35, 0.20), 0.85),
        sash=mat('cinto', (0.20, 0.20, 0.25), 0.8),
        skin=mat('piel', (0.75, 0.55, 0.40), 0.6),
        hair=mat('pelo', (0.15, 0.10, 0.06), 0.7),
        dark=mat('oscuro', (0.05, 0.04, 0.04), 0.7),
        dog=mat('perro', (0.80, 0.60, 0.35), 0.9),
        dogd=mat('perro_oscuro', (0.35, 0.22, 0.12), 0.9),
        suegra=mat('vestido_suegra', (0.50, 0.25, 0.55), 0.85),
        gray=mat('pelo_gris', (0.80, 0.80, 0.82), 0.7),
        rain=flat_mat('lluvia', (0.70, 0.82, 1.0), 1.2),
        water=mat('agua', (0.30, 0.60, 0.90), 0.05, emit=(0.3, 0.55, 0.9), es=0.6),
        orange=flat_mat('contorno', (1.0, 0.55, 0.28), 3.0),
        hot=flat_mat('calor', (1.0, 0.42, 0.12), 3.0),
        cold=flat_mat('fresco', (0.35, 0.70, 1.0), 3.0),
        stink=flat_mat('olor', (0.55, 0.75, 0.20), 2.0),
        sound=flat_mat('sonido', (0.95, 0.95, 1.0), 2.5),
    )


def terreno(M):
    g = box('terreno_patio', GX0, GX1, 0, GY1, GZ0, 0, mats=[M['grass'], M['soil']])
    face_mats(g, lambda n: 0 if n.z > 0.5 else 1)
    return g


CUTTERS = []


def excavar(ground, M, name, x0, x1, y0, y1, z0, z1, t0, t1, axis='z', anchor=None):
    """Cortador booleano que crece entre t0 y t1 (en z hacia abajo desde z1, o en x desde 'anchor')."""
    if axis == 'z':
        org = ((x0 + x1) / 2, (y0 + y1) / 2, z1)
        s0 = (1, 1, 0.02)
    else:
        org = (anchor, (y0 + y1) / 2, (z0 + z1) / 2)
        s0 = (0.02, 1, 1)
    c = box(name, x0, x1, y0, y1, z0, z1, m=M['hole'], origin=org)
    key(c, 'location', 0, (org[0], org[1], 60), 'CONSTANT')
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


def casa(M, x=0.0, name='casa', ancho=12.0, color=None):
    """Casa de dos pisos con ventanas, puerta corrediza y techo de dos aguas, mirando hacia -y."""
    root = link(bpy.data.objects.new(name, None))
    w2 = ancho / 2
    parts = [box(f'{name}_muros', -w2, w2, HOUSE_Y0, HOUSE_Y1, 0, 6.4, m=color or M['wall'])]
    # techo de dos aguas (prisma)
    me = bpy.data.meshes.new(f'{name}_techo')
    import bmesh
    bm = bmesh.new()
    pts = [(-w2 - 0.4, HOUSE_Y0 - 0.5, 6.4), (w2 + 0.4, HOUSE_Y0 - 0.5, 6.4), (w2 + 0.4, HOUSE_Y1 + 0.5, 6.4), (-w2 - 0.4, HOUSE_Y1 + 0.5, 6.4),
           (-w2 - 0.4, (HOUSE_Y0 + HOUSE_Y1) / 2, 8.6), (w2 + 0.4, (HOUSE_Y0 + HOUSE_Y1) / 2, 8.6)]
    vs = [bm.verts.new(p) for p in pts]
    for f in ((0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    roof = link(bpy.data.objects.new(f'{name}_techo', me))
    roof.data.materials.append(M['roof'])
    parts.append(roof)
    wins = []
    for row, zc in ((0, 1.9), (1, 4.7)):
        for k, xc in enumerate((-w2 + 1.6, -w2 + 4.0, w2 - 4.0, w2 - 1.6)):
            if row == 0 and k in (1, 2):
                continue
            fr = box(f'{name}_marco{row}{k}', xc - 0.65, xc + 0.65, HOUSE_Y0 - 0.06, HOUSE_Y0, zc - 0.85, zc + 0.85, m=M['trim'])
            gl = box(f'{name}_vidrio{row}{k}', xc - 0.52, xc + 0.52, HOUSE_Y0 - 0.08, HOUSE_Y0 - 0.05, zc - 0.72, zc + 0.72, m=M['glass'])
            for s in (-1, 1):
                parts.append(box(f'{name}_postigo{row}{k}{s}', xc + s * 0.7, xc + s * 1.15, HOUSE_Y0 - 0.06, HOUSE_Y0, zc - 0.85,
                                 zc + 0.85, m=M['shutter']))
            parts += [fr, gl]
            wins.append((xc, zc))
    parts.append(box(f'{name}_puerta_marco', -2.0, 2.0, HOUSE_Y0 - 0.06, HOUSE_Y0, 0, 2.6, m=M['trim']))
    parts.append(box(f'{name}_puerta_vidrio', -1.85, 1.85, HOUSE_Y0 - 0.08, HOUSE_Y0 - 0.05, 0.05, 2.45, m=M['glass']))
    for p in parts:
        p.parent = root
    root.location = (x, 0, 0)
    return root, wins


def decorado(M, arbol_x=10.0, barda=True, mesa=True, macetas=True, manguera=True):
    box('terraza', -7, 7, 12.5, HOUSE_Y0, 0, 0.08, m=M['pav'])
    tr = link(bpy.data.objects.new('arbol', None))
    parts = [prim('cylinder', 'arbol_tronco', (0, 0, 2.0), m=M['bark'], radius=0.35, depth=4.0, vertices=16)]
    for k, (dx, dy, dz, r) in enumerate(((0, 0, 4.6, 2.2), (1.2, 0.4, 4.0, 1.5), (-1.1, -0.3, 4.2, 1.6), (0.3, -0.8, 5.4, 1.4))):
        parts.append(prim('ico_sphere', f'arbol_copa{k}', (dx, dy, dz), m=M['leaf'], radius=r, subdivisions=2))
    for p in parts:
        p.parent = tr
    tr.location = (arbol_x, 13.0, 0)
    if barda:
        for side in (-1, 1):
            x = side * 15.5
            for k in range(14):
                box(f'barda{side}_{k}', x - 0.06, x + 0.06, 0.3 + 2.0 * k, 0.3 + 2.0 * k + 1.9, 0, 1.8, m=M['fence'])
    if mesa:
        box('mesa', 3.0, 4.4, 13.4, 14.8, 0.75, 0.82, m=M['metal'])
        prim('cylinder', 'mesa_pata', (3.7, 14.1, 0.4), m=M['metal'], radius=0.06, depth=0.8, vertices=8)
        for k, (cx, cy) in enumerate(((2.6, 14.1), (4.8, 14.1))):
            box(f'silla{k}', cx - 0.25, cx + 0.25, cy - 0.25, cy + 0.25, 0.42, 0.48, m=M['metal'])
            box(f'silla_resp{k}', cx - 0.25 if cx < 3.7 else cx + 0.2, cx - 0.2 if cx < 3.7 else cx + 0.25, cy - 0.25, cy + 0.25, 0.48, 0.95,
                m=M['metal'])
    if macetas:
        for k, x in enumerate((-6.3, -3.0, 6.3)):
            prim('cylinder', f'maceta{k}', (x, 13.2, 0.3), m=M['pot'], radius=0.3, depth=0.6, vertices=16)
            prim('ico_sphere', f'maceta_planta{k}', (x, 13.2, 0.85), m=M['leaf'], radius=0.38, subdivisions=2)
            prim('uv_sphere', f'maceta_flor{k}', (x + 0.15, 13.0, 1.05), m=M['flower'], radius=0.1, segments=8, ring_count=6)
    if manguera:
        curve_obj('manguera', [(-7.5, 14.5, 0.05), (-8.0, 10.0, 0.05), (-5.5, 7.0, 0.05), (-7.0, 4.0, 0.05)], M['hose'], bevel=0.05)


def cielo_dia(sc, energia=3.6):
    world = bpy.data.worlds.new('cielo')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.80, 0.86, 0.95, 1)
    bg.inputs['Strength'].default_value = 1.0
    sun = bpy.data.lights.new('sol', 'SUN')
    sun.angle = math.radians(4)
    so = link(bpy.data.objects.new('sol', sun))
    so.rotation_euler = (math.radians(50), 0, math.radians(-35))
    sun.energy = energia
    sun.color = (1.0, 0.95, 0.86)
    return bg, sun


def lluvia(M, tag, t0, t1, x0=-6, x1=6, y0=-1.0, y1=6.0, n=50, ztop=12):
    for k in range(n):
        r = prim('cylinder', f'lluvia_{tag}{k}', (0, 0, 0), m=M['rain'], radius=0.015, depth=0.5, vertices=4)
        x, y = random.uniform(x0, x1), random.uniform(y0, y1)
        key(r, 'scale', 0, Z, 'CONSTANT')
        t = t0 + random.uniform(0, 0.5)
        while t < t1:
            key(r, 'scale', t, Z, 'CONSTANT')
            key(r, 'location', t, (x, y, ztop), 'CONSTANT')
            key(r, 'scale', t + 0.02, (1, 1, 1), 'CONSTANT')
            key(r, 'location', t + 0.55, (x - 0.3, y, 0.0), 'LINEAR')
            key(r, 'scale', t + 0.55, Z, 'CONSTANT')
            t += 0.6


def perro(M, name='perro'):
    root = link(bpy.data.objects.new(name, None))
    ps = [prim('uv_sphere', name + '_cuerpo', (0, 0, 0.32), scale=(1.6, 0.8, 0.7), m=M['dog'], radius=0.28, segments=16, ring_count=10),
          prim('uv_sphere', name + '_cabeza', (0.5, 0, 0.55), m=M['dog'], radius=0.2, segments=14, ring_count=10),
          prim('uv_sphere', name + '_hocico', (0.68, 0, 0.5), scale=(1.2, 0.8, 0.7), m=M['dog'], radius=0.1, segments=10, ring_count=8),
          prim('uv_sphere', name + '_nariz', (0.8, 0, 0.53), m=M['dark'], radius=0.035, segments=8, ring_count=6),
          prim('uv_sphere', name + '_oreja1', (0.45, -0.15, 0.62), scale=(0.5, 0.4, 1.0), m=M['dogd'], radius=0.1, segments=8, ring_count=6),
          prim('uv_sphere', name + '_oreja2', (0.45, 0.15, 0.62), scale=(0.5, 0.4, 1.0), m=M['dogd'], radius=0.1, segments=8, ring_count=6),
          prim('uv_sphere', name + '_ojo1', (0.65, -0.1, 0.62), m=M['dark'], radius=0.025, segments=6, ring_count=4),
          prim('uv_sphere', name + '_ojo2', (0.65, 0.1, 0.62), m=M['dark'], radius=0.025, segments=6, ring_count=4),
          prim('cylinder', name + '_cola', (-0.5, 0, 0.5), rot=(0, -0.8, 0), m=M['dog'], radius=0.04, depth=0.35, vertices=6)]
    for x in (0.28, -0.28):
        for y in (-0.12, 0.12):
            ps.append(prim('cylinder', f'{name}_pata{x}{y}', (x, y, 0.12), m=M['dog'], radius=0.05, depth=0.25, vertices=6))
    for p in ps:
        p.parent = root
    return root


def casita_perro(M, loc, name='casita'):
    import bmesh
    root = link(bpy.data.objects.new(name, None))
    ps = [box(name + '_cuerpo', -0.7, 0.7, -0.6, 0.6, 0, 1.0, m=M['fence']),
          box(name + '_hueco', -0.28, 0.28, -0.62, -0.58, 0.0, 0.62, m=M['dark'])]
    me = bpy.data.meshes.new(name + '_techo')
    bm = bmesh.new()
    pts = [(-0.85, -0.75, 1.0), (0.85, -0.75, 1.0), (0.85, 0.75, 1.0), (-0.85, 0.75, 1.0), (0, -0.75, 1.55), (0, 0.75, 1.55)]
    vs = [bm.verts.new(p) for p in pts]
    for f in ((0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2), (0, 3, 2, 1)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    roof = link(bpy.data.objects.new(name + '_techo', me))
    roof.data.materials.append(M['roof'])
    ps.append(roof)
    for p in ps:
        p.parent = root
    root.location = loc
    return root


def suegra(M, name='suegra'):
    p = person(name, M['suegra'], M['trim'], M['skin'], M['dark'], M['gray'])
    bun = prim('uv_sphere', name + '_chongo', (0, 0.12, 1.45), m=M['gray'], radius=0.09, segments=10, ring_count=6)
    bun.parent = p
    return p


def pose(o, t, loc, rot=(0, 0, 0), interp='CONSTANT', s=(1, 1, 1)):
    key(o, 'location', t, loc, interp)
    key(o, 'rotation_euler', t, rot, interp)
    key(o, 'scale', t, s, interp)


def ondas(M, name, centro, t0, t1, n=3, radio=0.9):
    """Anillos que se expanden (sonido, gritos)."""
    for k in range(n):
        r = prim('torus', f'{name}{k}', centro, rot=(math.pi / 2, 0, 0), m=M['sound'], major_radius=radio, minor_radius=0.03,
                 major_segments=32, minor_segments=6)
        key(r, 'scale', 0, Z, 'CONSTANT')
        t = t0 + 0.3 * k
        while t < t1:
            key(r, 'scale', t, (0.2, 0.2, 0.2), 'CONSTANT')
            key(r, 'scale', t + 0.8, (1.5, 1.5, 1.5), 'LINEAR')
            key(r, 'scale', t + 0.82, Z, 'CONSTANT')
            t += 0.9
