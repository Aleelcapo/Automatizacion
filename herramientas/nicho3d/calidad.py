"""Capa de calidad para las escenas del nicho 3D (Blender 4.2, Cycles).

Se aplica sobre una escena ya construida, sin tocar el script de la escena:
  - texturas reales CC0 (Poly Haven) según el nombre del material, mezcladas con el color
    original para conservar la paleta y sus animaciones de color;
  - cielo HDRI (multiplicado por el color animado del cielo, así se conservan día y noche);
  - biselado suave en las piezas de 8 vértices (cajas);
  - render a 720x1280, más muestras y desenfoque de movimiento.

Requiere haber corrido antes calidad_assets.py.
"""
import bpy, os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets_cache')

# (palabras clave en el nombre del material, textura, tamaño del mosaico en metros)
REGLAS = [
    (('agua', 'rio', 'mar', 'espuma', 'gota', 'vidrio', 'lente', 'haz', 'humo', 'vapor', 'llama', 'fuego', 'contorno',
      'flecha', 'calor', 'frio', 'viento', 'lluvia', 'aire', 'aurora', 'ojos', 'sol_bola', 'luz_', 'escarcha_',
      'piel', 'ropa', 'faja', 'pelo', 'oscuro', 'parka', 'cara', 'manta', 'deel', 'cinto', 'poncho', 'soldado', 'rojo',
      'azul', 'hierro', 'metal', 'perro', 'gato', 'cabra', 'caballo', 'camello', 'oveja', 'llama', 'condor', 'garza',
      'gaviota', 'ajolote', 'branquias', 'mono', 'jaguar', 'mancha', 'serpiente', 'hormiga', 'raton', 'pico', 'blanco',
      'negro', 'franja', 'ribete', 'taza', 'tetera', 'estufa', 'alfombra', 'hamaca', 'estandarte', 'bandera', 'vela',
      'fruta', 'platano', 'maiz', 'mazorca', 'chile', 'cempasuchil', 'flor', 'maceta', 'vasija', 'jarra', 'costal',
      'carga', 'mug', 'cuerda', 'amarre', 'liana', 'esquirla', 'grano', 'copo', 'cactus', 'hongo', 'vela', 'casco_'), None, 0),
    (('nieve', 'escarcha'), 'snow_02', 3.0),
    (('suelo_corte',), 'dark_rock', 3.0),
    (('lodo', 'barro'), 'brown_mud_02', 2.0),
    (('tierra_cultivo', 'tierra', 'capa_lodo', 'huella'), 'farm_soil', 2.0),
    (('capa_plantas', 'hoja', 'follaje', 'copa', 'helecho', 'ahuejote'), 'forest_leaves_02', 2.0),
    (('pasto', 'estepa', 'puna', 'suelo_selva', 'orilla', 'colina', 'campo'), 'leafy_grass', 3.0),
    (('arena', 'desierto', 'playa', 'duna'), 'coast_sand_01', 3.0),
    (('roca', 'acantilado', 'toba', 'montana', 'cerro', 'volcan', 'firme'), 'rock_wall_08', 4.0),
    (('piedra', 'estribo', 'cimiento', 'muro'), 'stone_wall', 2.0),
    (('adobe', 'enjarre', 'pared', 'interior', 'horno', 'casa', 'torre'), 'clay_plaster', 2.5),
    (('tabla', 'madera', 'puerta', 'viga', 'escal', 'porton', 'molde', 'banco'), 'brown_planks_05', 2.0),
    (('tronco', 'lena', 'pilote', 'palo', 'estaca', 'corteza', 'poste', 'tronquito', 'canoa', 'khana', 'uni'), 'bark_willow', 1.5),
    (('paja', 'carrizo', 'palma', 'techo', 'fieltro'), 'thatch_roof_angled', 1.5),
]


def regla(nombre):
    n = nombre.lower()
    for claves, tex, tam in REGLAS:
        if any(c in n for c in claves):
            return tex, tam
    return None, 0


def imagen(tex, mapa, no_color=False):
    p = os.path.join(BASE, 'tex', tex, f'{mapa}.jpg')
    if not os.path.exists(p):
        return None
    img = bpy.data.images.load(p, check_existing=True)
    if no_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def mejorar_material(m, tex, tam, fac=0.75):
    if not m.use_nodes or 'Principled BSDF' not in m.node_tree.nodes:
        return False
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    diff, rough, nor = imagen(tex, 'diff'), imagen(tex, 'rough', True), imagen(tex, 'nor', True)
    if diff is None:
        return False
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.0 / tam,) * 3
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])

    def tex_node(img):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        n.projection = 'BOX'
        n.projection_blend = 0.25
        nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
        return n

    td = tex_node(diff)
    # color original (posiblemente animado) + detalle de la textura en modo "overlay"
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'OVERLAY'
    mix.inputs['Fac'].default_value = fac
    mix.inputs['Color1'].default_value = bsdf.inputs['Base Color'].default_value[:]
    nt.links.new(td.outputs['Color'], mix.inputs['Color2'])
    nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    # las animaciones de color pasan al nodo de mezcla
    ad = nt.animation_data
    if ad and ad.action:
        for fc in ad.action.fcurves:
            if fc.data_path == 'nodes["Principled BSDF"].inputs[0].default_value':
                fc.data_path = f'nodes["{mix.name}"].inputs[1].default_value'
    if rough is not None and not (ad and ad.action and any('inputs[2]' in f.data_path for f in ad.action.fcurves)):
        tr = tex_node(rough)
        nt.links.new(tr.outputs['Color'], bsdf.inputs['Roughness'])
    if nor is not None:
        tn = tex_node(nor)
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = 0.7
        nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return True


def cielo(nombre='kloofendal_48d_partly_cloudy_puresky', fuerza=1.3):
    w = bpy.context.scene.world
    p = os.path.join(BASE, 'hdri', f'{nombre}.hdr')
    if w is None or not w.use_nodes or not os.path.exists(p):
        return
    nt = w.node_tree
    bg = nt.nodes.get('Background')
    if bg is None:
        return
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(p, check_existing=True)
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Fac'].default_value = 1.0
    c = bg.inputs['Color'].default_value[:]
    mix.inputs['Color2'].default_value = c
    nt.links.new(env.outputs['Color'], mix.inputs['Color1'])
    nt.links.new(mix.outputs['Color'], bg.inputs['Color'])
    ad = nt.animation_data
    if ad and ad.action:
        for fc in ad.action.fcurves:
            if fc.data_path == 'nodes["Background"].inputs[0].default_value':
                fc.data_path = f'nodes["{mix.name}"].inputs[2].default_value'
            elif fc.data_path == 'nodes["Background"].inputs[1].default_value':
                for kp in fc.keyframe_points:
                    kp.co[1] *= fuerza
                    kp.handle_left[1] *= fuerza
                    kp.handle_right[1] *= fuerza
    # el tinte del cielo era un color "plano"; se normaliza para que el HDRI conserve su brillo
    if not (ad and ad.action):
        mix.inputs['Color2'].default_value = (1, 1, 1, 1)
    bg.inputs['Strength'].default_value *= fuerza


def biselar():
    for o in bpy.data.objects:
        if o.type == 'MESH' and len(o.data.vertices) == 8 and not any(m.type == 'BEVEL' for m in o.modifiers):
            b = o.modifiers.new('bisel_calidad', 'BEVEL')
            b.width = 0.02
            b.segments = 2
            b.limit_method = 'ANGLE'


def render(res=720, samples=32):
    sc = bpy.context.scene
    sc.render.resolution_x = res
    sc.render.resolution_y = res * 16 // 9
    sc.cycles.samples = samples
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 2
    sc.render.use_motion_blur = False   # no cambia el tiempo y casi no se nota a 24 fps
    sc.render.motion_blur_shutter = 0.4
    sc.view_settings.look = 'AgX - Punchy'


def aplicar(opt=None):
    opt = opt or {}
    hechos = 0
    for m in list(bpy.data.materials):
        tex, tam = regla(m.name)
        if tex and mejorar_material(m, tex, tam):
            hechos += 1
    cielo(opt.get('--cielo', 'kloofendal_48d_partly_cloudy_puresky'))
    biselar()
    render(int(opt.get('--res', 720)), int(opt.get('--samples', 32)))
    print('calidad: materiales con textura', hechos)
