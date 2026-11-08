"""Estilo diorama (como la referencia de la alberca): bloque de terreno cortado visto en 3/4 desde arriba.

Piezas reutilizables para Blender 4.2 + Eevee Next:
  pbr()        material con texturas Poly Haven (proyeccion caja, sin UV) + tinte opcional
  pasto()      pasto con franjas de podadora
  agua()       agua transparente con oleaje
  terreno()    bloque de tierra con hueco (cortador) y cara frontal con relieve real
  casa()       casa de dos pisos con revoque, tejas, marcos y terraza
  modelo()     importa un modelo glTF de assets_cache/modelos
  luz_dia()    sol + cielo HDRI
  eevee()      ajustes de render Eevee Next
"""
import math
import os

import bmesh
import bpy

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets_cache')
_IMG = {}


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def imagen(tex, mapa):
    for ext in ('jpg', 'png'):
        p = os.path.join(BASE, 'tex', tex, f'{mapa}.{ext}')
        if os.path.exists(p):
            break
    else:
        return None
    if p not in _IMG:
        im = bpy.data.images.load(p)
        if mapa != 'diff':
            im.colorspace_settings.name = 'Non-Color'
        _IMG[p] = im
    return _IMG[p]


def _coords(nt, tam, rot=0.0):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / tam, 1 / tam, 1 / tam)
    mp.inputs['Rotation'].default_value = (0, 0, rot)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    return mp.outputs['Vector']


def _tex(nt, im, vec, caja=True):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = im
    if caja:
        n.projection = 'BOX'
        n.projection_blend = 0.25
    nt.links.new(vec, n.inputs['Vector'])
    return n


def pbr(nombre, tex, tam=2.0, tinte=None, fac=0.0, rough=None, normal=1.0, brillo=1.0, caja=True, oscurecer=None):
    """Material con textura real. tinte+fac mezclan un color encima (fac 0 = textura pura)."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    vec = _coords(nt, tam)
    d = _tex(nt, imagen(tex, 'diff'), vec, caja)
    col = d.outputs['Color']
    if brillo != 1.0:
        g = nt.nodes.new('ShaderNodeMix')
        g.data_type = 'RGBA'
        g.blend_type = 'MULTIPLY'
        g.inputs['Factor'].default_value = 1.0
        nt.links.new(col, g.inputs['A'])
        g.inputs['B'].default_value = (brillo, brillo, brillo, 1)
        col = g.outputs['Result']
    if tinte is not None:
        mx = nt.nodes.new('ShaderNodeMix')
        mx.data_type = 'RGBA'
        mx.blend_type = 'COLOR'
        mx.inputs['Factor'].default_value = fac
        nt.links.new(col, mx.inputs['A'])
        mx.inputs['B'].default_value = (*tinte, 1)
        col = mx.outputs['Result']
    if oscurecer is not None:  # (z_arriba, z_abajo, factor): la tierra se oscurece con la profundidad
        za, zb, k = oscurecer
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sp = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(tc.outputs['Object'], sp.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = zb
        mr.inputs['From Max'].default_value = za
        mr.inputs['To Min'].default_value = k
        mr.inputs['To Max'].default_value = 1.0
        nt.links.new(sp.outputs['Z'], mr.inputs['Value'])
        g2 = nt.nodes.new('ShaderNodeMix')
        g2.data_type = 'RGBA'
        g2.blend_type = 'MULTIPLY'
        g2.inputs['Factor'].default_value = 1.0
        nt.links.new(col, g2.inputs['A'])
        cb = nt.nodes.new('ShaderNodeCombineXYZ')
        for k2 in ('X', 'Y', 'Z'):
            nt.links.new(mr.outputs['Result'], cb.inputs[k2])
        nt.links.new(cb.outputs['Vector'], g2.inputs['B'])
        col = g2.outputs['Result']
    nt.links.new(col, bsdf.inputs['Base Color'])
    r = imagen(tex, 'rough')
    if rough is not None or r is None:
        bsdf.inputs['Roughness'].default_value = rough if rough is not None else 0.8
    else:
        nt.links.new(_tex(nt, r, vec, caja).outputs['Color'], bsdf.inputs['Roughness'])
    nimg = imagen(tex, 'nor')
    if nimg is not None and normal > 0:
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal
        nt.links.new(_tex(nt, nimg, vec, caja).outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def liso(nombre, col, rough=0.5, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*col, 1)
        b.inputs['Emission Strength'].default_value = emit
    return m


def pasto(nombre='pasto', periodo=2.6):
    """Pasto con franjas de podadora (claras/oscuras alternas a lo largo de x)."""
    m = pbr(nombre, 'leafy_grass', tam=1.6, tinte=(0.09, 0.30, 0.03), fac=0.8, normal=0.6, caja=False, brillo=0.75)
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    src = bsdf.inputs['Base Color'].links[0].from_socket
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    s = nt.nodes.new('ShaderNodeMath')
    s.operation = 'SINE'
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = math.pi / periodo
    nt.links.new(sep.outputs['X'], mul.inputs[0])
    nt.links.new(mul.outputs[0], s.inputs[0])
    gt = nt.nodes.new('ShaderNodeMapRange')
    gt.inputs['From Min'].default_value = -0.08
    gt.inputs['From Max'].default_value = 0.08
    gt.inputs['To Min'].default_value = 0.8
    gt.inputs['To Max'].default_value = 1.08
    nt.links.new(s.outputs[0], gt.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix')
    mx.data_type = 'RGBA'
    mx.blend_type = 'MULTIPLY'
    mx.inputs['Factor'].default_value = 1.0
    nt.links.new(src, mx.inputs['A'])
    cmb = nt.nodes.new('ShaderNodeCombineXYZ')
    for k in ('X', 'Y', 'Z'):
        nt.links.new(gt.outputs['Result'], cmb.inputs[k])
    nt.links.new(cmb.outputs['Vector'], mx.inputs['B'])
    nt.links.new(mx.outputs['Result'], bsdf.inputs['Base Color'])
    return m


def agua(nombre='agua', col=(0.02, 0.42, 0.55), alpha=0.42):
    """Agua turquesa semitransparente con oleaje en el normal (se ve bien de lado y desde arriba)."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Roughness'].default_value = 0.04
    b.inputs['IOR'].default_value = 1.33
    b.inputs['Alpha'].default_value = alpha
    b.inputs['Specular IOR Level'].default_value = 0.8
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = 1.6
    n.inputs['Detail'].default_value = 4
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.25
    nt.links.new(n.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = False
    return m


def caja(nombre, x0, x1, y0, y1, z0, z1, m=None):
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(nombre, me))
    if m:
        o.data.materials.append(m)
    return o


def prisma_y(nombre, perfil_xz, y0, y1, m=None):
    """Prisma extruido en y a partir de un perfil (x, z) cerrado."""
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in perfil_xz]
    b = [bm.verts.new((x, y1, z)) for x, z in perfil_xz]
    n = len(a)
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(nombre, me))
    if m:
        o.data.materials.append(m)
    return o


def restar(o, cortador, ocultar=True):
    md = o.modifiers.new('corte', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.solver = 'EXACT'
    md.object = cortador
    if ocultar:
        cortador.hide_render = True
        cortador.hide_viewport = True
    return md


def aplicar_mods(o):
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)


def por_normal(o, regla):
    """regla(normal, centro) -> indice de material."""
    for p in o.data.polygons:
        p.material_index = regla(p.normal, p.center)


def cara_relieve(nombre, x0, x1, z0, z1, y, m, tex='excavated_soil_wall', tam=2.0, fuerza=0.35, res=0.06):
    """Cara de corte frontal con relieve geometrico real (Displace con el mapa de altura de la textura)."""
    nx, nz = int((x1 - x0) / res), int((z1 - z0) / res)
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=nx, y_segments=nz, size=0.5)
    for v in bm.verts:
        x = x0 + (v.co.x + 0.5) * (x1 - x0)
        z = z0 + (v.co.y + 0.5) * (z1 - z0)
        v.co = (x, y, z)
    for f in bm.faces:
        f.normal_flip()
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(nombre, me))
    o.data.materials.append(m)
    t = bpy.data.textures.new(nombre + '_alt', 'IMAGE')
    t.image = imagen(tex, 'disp')
    t.extension = 'REPEAT'
    em = bpy.data.objects.new(nombre + '_map', None)
    link(em)
    em.scale = (tam, tam, tam)
    em.rotation_euler = (math.pi / 2, 0, 0)
    d = o.modifiers.new('relieve', 'DISPLACE')
    d.texture = t
    d.texture_coords = 'OBJECT'
    d.texture_coords_object = em
    d.direction = 'NORMAL'
    d.strength = fuerza
    d.mid_level = 0.0
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def modelo(nombre, loc, rot_z=0.0, escala=1.0):
    d = os.path.join(BASE, 'modelos', nombre)
    f = [x for x in os.listdir(d) if x.endswith('.gltf')][0]
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(d, f))
    nuevos = [o for o in bpy.data.objects if o not in antes]
    raiz = link(bpy.data.objects.new(nombre + '_raiz', None))
    for o in nuevos:
        if o.parent is None:
            o.parent = raiz
    raiz.location = loc
    raiz.rotation_euler = (0, 0, rot_z)
    raiz.scale = (escala, escala, escala)
    return raiz


def casa(M, y0=16.0, ancho=13.0, fondo=7.0, alto=6.4):
    w2 = ancho / 2
    y1 = y0 + fondo
    partes = [caja('casa_muros', -w2, w2, y0, y1, 0.0, alto, M['muro'])]
    partes.append(caja('casa_zocalo', -w2 - 0.05, w2 + 0.05, y0 - 0.05, y1, 0.0, 0.45, M['zocalo']))
    partes.append(caja('casa_cornisa', -w2 - 0.15, w2 + 0.15, y0 - 0.15, y1 + 0.15, alto - 0.25, alto, M['marco']))
    partes.append(caja('casa_franja', -w2 - 0.04, w2 + 0.04, y0 - 0.06, y1, 3.15, 3.35, M['marco']))
    me = bpy.data.meshes.new('casa_techo')
    bm = bmesh.new()
    pts = [(-w2 - 0.5, y0 - 0.6, alto), (w2 + 0.5, y0 - 0.6, alto), (w2 + 0.5, y1 + 0.6, alto), (-w2 - 0.5, y1 + 0.6, alto),
           (-w2 + 1.5, (y0 + y1) / 2, alto + 2.6), (w2 - 1.5, (y0 + y1) / 2, alto + 2.6)]
    vs = [bm.verts.new(p) for p in pts]
    for f in ((0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    techo = link(bpy.data.objects.new('casa_techo', me))
    techo.data.materials.append(M['teja'])
    partes.append(techo)
    def ventana(xc, zc, w=1.3, h=1.6, puerta=False):
        partes.append(caja('marco', xc - w / 2 - 0.1, xc + w / 2 + 0.1, y0 - 0.1, y0 + 0.02, zc - h / 2 - 0.1, zc + h / 2 + 0.1, M['marco']))
        partes.append(caja('vidrio', xc - w / 2, xc + w / 2, y0 - 0.12, y0 - 0.06, zc - h / 2, zc + h / 2, M['vidrio']))
        partes.append(caja('parteluz', xc - 0.03, xc + 0.03, y0 - 0.14, y0 - 0.1, zc - h / 2, zc + h / 2, M['marco']))
        if not puerta:
            partes.append(caja('alfeizar', xc - w / 2 - 0.2, xc + w / 2 + 0.2, y0 - 0.25, y0, zc - h / 2 - 0.22, zc - h / 2 - 0.1, M['marco']))
            for s in (-1, 1):
                partes.append(caja('postigo', xc + s * (w / 2 + 0.12), xc + s * (w / 2 + 0.7), y0 - 0.12, y0 - 0.02, zc - h / 2, zc + h / 2, M['postigo']))
    for xc in (-w2 + 1.9, -w2 + 4.6, w2 - 4.6, w2 - 1.9):
        ventana(xc, 4.75)
    ventana(-w2 + 1.9, 1.75)
    ventana(w2 - 1.9, 1.75)
    ventana(0.0, 1.35, w=3.6, h=2.4, puerta=True)
    return partes


def luz_dia(hdri='kloofendal_48d_partly_cloudy_puresky', fuerza_cielo=1.0, sol=4.5, az=-35, el=48):
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('mundo')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    if hdri == 'nishita':
        env = nt.nodes.new('ShaderNodeTexSky')
        env.sky_type = 'NISHITA'
        env.sun_elevation = math.radians(el)
        env.sun_rotation = math.radians(az + 180)
        env.sun_disc = False
        env.altitude = 200
        env.air_density = 1.0
        env.dust_density = 0.6
    else:
        env = nt.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(os.path.join(BASE, 'hdri', hdri + '.hdr'))
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = fuerza_cielo
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    s = bpy.data.lights.new('sol', 'SUN')
    s.energy = sol
    s.angle = math.radians(2.5)
    s.color = (1.0, 0.96, 0.9)
    o = link(bpy.data.objects.new('sol', s))
    o.rotation_euler = (math.radians(90 - el), 0, math.radians(az))
    return o


def eevee(res=1080, muestras=24):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    e = sc.eevee
    e.taa_render_samples = muestras
    e.use_raytracing = True
    e.ray_tracing_options.resolution_scale = '2'
    e.use_shadows = True
    e.shadow_ray_count = 2
    e.use_gtao = True
    e.fast_gi_distance = 6.0
    sc.render.resolution_x = res
    sc.render.resolution_y = int(res * 16 / 9)
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.view_settings.exposure = -0.35
    sc.render.film_transparent = False


def camara(loc, mira, lente=30):
    c = bpy.data.cameras.new('cam')
    c.lens = lente
    c.clip_end = 400
    o = link(bpy.data.objects.new('cam', c))
    o.location = loc
    t = link(bpy.data.objects.new('cam_mira', None))
    t.location = mira
    k = o.constraints.new('TRACK_TO')
    k.target = t
    k.track_axis = 'TRACK_NEGATIVE_Z'
    k.up_axis = 'UP_Y'
    bpy.context.scene.camera = o
    return o, t


_ARB = {}


def arbol(loc, alto=5.0, semilla=0):
    """Arbol liviano: tronco con corteza y copa de varias esferas deformadas con textura de hojas."""
    import random
    r = random.Random(semilla)
    if not _ARB:
        _ARB['corteza'] = pbr('corteza', 'bark_willow', tam=0.8, tinte=(0.3, 0.22, 0.15), fac=0.3)
        _ARB['hojas'] = pbr('hojas', 'forest_leaves_02', tam=1.2, tinte=(0.12, 0.33, 0.05), fac=0.55, normal=1.5)
        t = bpy.data.textures.new('copa_ruido', 'CLOUDS')
        t.noise_scale = 0.55
        _ARB['ruido'] = t
    x, y, z = loc
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.22 * alto / 5, radius2=0.12 * alto / 5, depth=alto * 0.6,
                                    location=(x, y, z + alto * 0.3))
    tr = bpy.context.object
    tr.data.materials.append(_ARB['corteza'])
    partes = [tr]
    for i in range(5):
        rr = alto * r.uniform(0.2, 0.3)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=rr,
                                              location=(x + r.uniform(-.25, .25) * alto, y + r.uniform(-.25, .25) * alto,
                                                        z + alto * r.uniform(0.62, 0.9)))
        c = bpy.context.object
        d = c.modifiers.new('d', 'DISPLACE')
        d.texture = _ARB['ruido']
        d.strength = rr * 0.45
        c.data.materials.append(_ARB['hojas'])
        for p in c.data.polygons:
            p.use_smooth = True
        partes.append(c)
    return partes
