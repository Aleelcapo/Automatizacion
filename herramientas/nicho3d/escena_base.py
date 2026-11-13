"""Piezas comunes de las escenas diorama (Eevee): animacion por segundos, primitivas, materiales,
terreno cortado al frente con huecos, casa con patio, camara por tomas y salida (stills / animacion).

Uso en una escena:
    import escena_base as B
    opt, salida = B.inicio()
    M = B.materiales()
    B.terreno(M, huecos=[(x0, x1, y1, z0)])
    ...
    B.tomas(TOMAS); B.terminar(opt, salida, DUR)
"""
import math
import os
import random
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402

FPS = 24
Y0 = -4.0
YF = Y0 - 0.15
FUENTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fuentes', 'Anton-Regular.ttf')


def inicio(semilla=7):
    arg = sys.argv[sys.argv.index('--') + 1:]
    opt = {arg[i]: arg[i + 1] for i in range(1, len(arg) - 1) if arg[i].startswith('--')}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    random.seed(semilla)
    return opt, arg[0]


def F(t):
    return int(round(t * FPS)) + 1


def key(o, path, t, val, interp='BEZIER'):
    setattr(o, path, val)
    o.keyframe_insert(path, frame=F(t))
    ad = o.animation_data
    for fc in ad.action.fcurves:
        if fc.data_path == path:
            for kp in fc.keyframe_points:
                if int(round(kp.co.x)) == F(t):
                    kp.interpolation = interp


def key_valor(sock, t, val, interp='BEZIER'):
    """Anima un socket de nodo (default_value)."""
    sock.default_value = val
    sock.keyframe_insert('default_value', frame=F(t))


def pop(o, t, dur=0.3, s=1.0):
    s3 = (s, s, s) if isinstance(s, (int, float)) else tuple(s)
    key(o, 'scale', t - 0.1, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t, (0, 0, 0))
    key(o, 'scale', t + dur * 0.7, tuple(v * 1.12 for v in s3))
    key(o, 'scale', t + dur, s3)


def quitar(o, t, dur=0.3, s=1.0):
    s3 = (s, s, s) if isinstance(s, (int, float)) else tuple(s)
    key(o, 'scale', t, s3)
    key(o, 'scale', t + dur, (0, 0, 0), 'CONSTANT')


def rebote(o, t, s=1.0, k=1.18):
    """Pequeno salto de escala para senalar un objeto que ya esta visible."""
    key(o, 'scale', t, (s, s, s))
    key(o, 'scale', t + 0.15, (s * k, s * k, s * k))
    key(o, 'scale', t + 0.35, (s, s, s))


def crecer(o, eje, t0, t1):
    a = [1.0, 1.0, 1.0]
    a[eje] = 0.0
    key(o, 'scale', t0 - 0.1, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t0, tuple(a))
    key(o, 'scale', t1, (1.0, 1.0, 1.0))


def gancho(objs, t_fin):
    """Visibles durante el gancho (0..t_fin) y ocultos despues, hasta que la escena los construya."""
    for o in (objs if isinstance(objs, (list, tuple)) else [objs]):
        key(o, 'scale', 0.0, tuple(o.scale) if any(o.scale) else (1, 1, 1), 'CONSTANT')
        key(o, 'scale', t_fin, (0, 0, 0), 'CONSTANT')


def link(o):
    return D.link(o)


def caja(nombre, x0, x1, y0, y1, z0, z1, m=None):
    return D.caja(nombre, x0, x1, y0, y1, z0, z1, m)


def caja_o(nombre, x0, x1, y0, y1, z0, z1, m, origen):
    ox, oy, oz = origen
    o = D.caja(nombre, x0 - ox, x1 - ox, y0 - oy, y1 - oy, z0 - oz, z1 - oz, m)
    o.location = origen
    return o


def cilindro(nombre, r, largo, eje, m, loc, origen_extremo=True, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=largo, location=(0, 0, 0))
    o = bpy.context.object
    o.name = nombre
    for v in o.data.vertices:
        z = v.co.z + (largo / 2 if origen_extremo else 0)
        x, y = v.co.x, v.co.y
        v.co = {'x': (z, x, y), 'y': (x, z, -y), 'z': (x, y, z)}[eje]
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    o.location = loc
    return o


def esfera(nombre, r, m, loc, esc=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=r, location=loc)
    o = bpy.context.object
    o.name = nombre
    o.scale = esc
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def origen(o, p):
    """Mueve el origen del objeto a p sin moverlo (para escalar/aparecer desde ahi)."""
    import mathutils
    o.data.transform(mathutils.Matrix.Translation((-p[0], -p[1], -p[2])))
    o.location = p
    return o


def raiz(nombre, loc=(0, 0, 0)):
    o = D.link(bpy.data.objects.new(nombre, None))
    o.location = loc
    return o


def hijos(padre, objs):
    for o in objs:
        o.parent = padre
    return padre


def medio_tubo(nombre, r, a0, a1, eje, m, centro, grosor=0.12, solido=False, tapas=False, n=40):
    """Medio cilindro abierto hacia la camara (lado y >= centro_y). eje 'x' o 'z'.
    solido=True: medio cilindro macizo (con cara plana en el corte)."""
    cx, cy, cz = centro
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    ang = [math.pi * k / n for k in range(n + 1)]   # 0..pi, del lado +y
    filas = []
    for a in (a0, a1):
        fila = []
        for t in ang:
            u, w = r * math.cos(t), r * math.sin(t)       # u: eje transversal, w: hacia +y
            if eje == 'x':
                fila.append(bm.verts.new((a, cy + w, cz + u)))
            else:
                fila.append(bm.verts.new((cx + u, cy + w, a)))
        filas.append(fila)
    for k in range(n):
        bm.faces.new((filas[0][k], filas[0][k + 1], filas[1][k + 1], filas[1][k]))
    if solido or tapas:
        for fila in filas:
            bm.faces.new(fila)
    if solido:
        bm.faces.new((filas[0][0], filas[1][0], filas[1][n], filas[0][n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = D.link(bpy.data.objects.new(nombre, me))
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    if not solido and grosor:
        s = o.modifiers.new('grosor', 'SOLIDIFY')
        s.thickness = grosor
        s.offset = 1.0
    return o


def flecha(nombre, largo, m, loc, dir_='x', grosor=0.09):
    r = raiz(nombre, loc)
    eje = cilindro(nombre + '_eje', grosor, largo * 0.65, 'x', m, (0, 0, 0))
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=grosor * 2.4, radius2=0, depth=largo * 0.35,
                                    location=(largo * 0.65 + largo * 0.175, 0, 0), rotation=(0, math.pi / 2, 0))
    punta = bpy.context.object
    punta.data.materials.append(m)
    hijos(r, [eje, punta])
    r.rotation_euler = {'x': (0, 0, 0), '-x': (0, 0, math.pi), '-z': (0, math.pi / 2, 0), 'z': (0, -math.pi / 2, 0),
                        'y': (0, 0, math.pi / 2)}[dir_]
    return r


def texto(nombre, s, m, loc, tam=1.0, rot=(math.pi / 2, 0, 0)):
    cu = bpy.data.curves.new(nombre, 'FONT')
    cu.body = s
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.size = tam
    cu.extrude = 0.04
    try:
        cu.font = bpy.data.fonts.load(os.path.abspath(FUENTE), check_existing=True)
    except Exception:
        pass
    o = D.link(bpy.data.objects.new(nombre, cu))
    o.data.materials.append(m)
    o.location = loc
    o.rotation_euler = rot
    return o


def medida(nombre, x, z_arriba, z_abajo, etiqueta, M, t_on, t_off, lado=-1, y=None):
    """Cota vertical amarilla con texto (ej. '8 m') pegada a la cara de corte."""
    y = YF - 0.35 if y is None else y
    r = raiz(nombre, (x, y, 0))
    hijos(r, [cilindro(nombre + '_barra', 0.05, z_arriba - z_abajo, 'z', M['medida'], (0, 0, z_abajo))])
    for z in (z_arriba, z_abajo):
        hijos(r, [D.caja(nombre + '_tope', -0.35, 0.35, -0.05, 0.05, z - 0.04, z + 0.04, M['medida'])])
    t = texto(nombre + '_txt', etiqueta, M['medida'], (lado * 1.0, 0, (z_arriba + z_abajo) / 2), tam=1.1)
    t.parent = r
    pop(r, t_on, 0.35)
    quitar(r, t_off, 0.25)
    return r


def curva(nombre, pts, m, grosor=0.05):
    cv = bpy.data.curves.new(nombre, 'CURVE')
    cv.dimensions = '3D'
    cv.bevel_depth = grosor
    cv.bevel_resolution = 3
    sp = cv.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'VECTOR'
    o = D.link(bpy.data.objects.new(nombre, cv))
    o.data.materials.append(m)
    return o


def trazar(curva_obj, t0, t1):
    cv = curva_obj.data
    cv.bevel_factor_end = 0.0
    cv.keyframe_insert('bevel_factor_end', frame=F(t0))
    cv.bevel_factor_end = 1.0
    cv.keyframe_insert('bevel_factor_end', frame=F(t1))


def flujo(nombre, m, p0, p1, dir_, t0, t1, n=3, largo=0.8, grosor=0.07, sep=0.3):
    """n flechas que viajan de p0 a p1 (aparecen escalonadas)."""
    fs = []
    for k in range(n):
        f = flecha(f'{nombre}{k}', largo, m, p0, dir_, grosor)
        a = t0 + sep * k
        pop(f, a, 0.2)
        key(f, 'location', a, p0)
        key(f, 'location', min(a + (t1 - t0), t1 + sep * k), p1)
        quitar(f, min(a + (t1 - t0), t1 + sep * k), 0.15)
        fs.append(f)
    return fs


# ---------------- materiales ----------------
def materiales():
    return {
        'pasto': D.pasto(),
        'tierra': D.pbr('tierra', 'excavated_soil_wall', tam=2.2, tinte=(0.42, 0.24, 0.12), fac=0.25, oscurecer=(0.0, -10.0, 0.5)),
        'relleno': D.pbr('relleno', 'brown_mud_rocks_01', tam=1.6, tinte=(0.40, 0.25, 0.13), fac=0.3),
        'concreto': D.pbr('concreto', 'smooth_concrete_floor', tam=1.5, tinte=(0.62, 0.62, 0.6), fac=0.7, brillo=1.5),
        'piso_int': D.pbr('piso_int', 'brown_planks_05', tam=1.2, tinte=(0.55, 0.38, 0.22), fac=0.3, brillo=1.2),
        'piso': D.pbr('piso', 'patterned_paving', tam=1.6, tinte=(0.78, 0.62, 0.52), fac=0.35),
        'madera': D.pbr('madera', 'brown_planks_05', tam=1.0, tinte=(0.6, 0.42, 0.25), fac=0.4, brillo=1.3),
        'grava': D.pbr('grava', 'gravel_ground_01', tam=0.9, brillo=1.1),
        'muro': D.pbr('muro', 'plastered_wall_04', tam=3.0, tinte=(0.93, 0.78, 0.6), fac=0.85, brillo=1.25),
        'zocalo': D.pbr('zocalo', 'rough_concrete', tam=1.5, tinte=(0.55, 0.5, 0.48), fac=0.3),
        'teja': D.pbr('teja', 'clay_roof_tiles_02', tam=2.0, tinte=(0.55, 0.22, 0.14), fac=0.3),
        'marco': D.liso('marco', (0.92, 0.9, 0.86), 0.45),
        'postigo': D.liso('postigo', (0.17, 0.3, 0.45), 0.5),
        'vidrio': D.liso('vidrio', (0.12, 0.17, 0.24), 0.08, metal=0.3),
        'acero': D.liso('acero', (0.36, 0.38, 0.42), 0.35, metal=0.85),
        'acero_claro': D.liso('acero_claro', (0.72, 0.74, 0.76), 0.3, metal=0.7),
        'blanco': D.liso('blanco', (0.93, 0.93, 0.92), 0.4),
        'negro': D.liso('negro', (0.03, 0.03, 0.03), 0.6),
        'amarillo': D.liso('amarillo', (0.95, 0.68, 0.05), 0.4),
        'tubo': D.liso('tubo', (0.93, 0.93, 0.92), 0.35),
        'medida': D.liso('medida', (1.0, 0.85, 0.1), 0.5, emit=1.8),
        'flecha_roja': D.liso('flecha_roja', (1.0, 0.12, 0.08), 0.5, emit=1.5),
        'flecha_azul': D.liso('flecha_azul', (0.35, 0.75, 1.0), 0.5, emit=1.6),
        'flecha_gris': D.liso('flecha_gris', (0.45, 0.42, 0.38), 0.5, emit=0.3),
        'flecha_verde': D.liso('flecha_verde', (0.65, 1.0, 0.15), 0.5, emit=2.0),
        'agua': D.agua(),
        'llanta': D.liso('llanta', (0.03, 0.03, 0.03), 0.8),
    }


# ---------------- terreno ----------------
def terreno(M, huecos, ancho=(-16, 18)):
    """Suelo con huecos (x0, x1, y1, z0) abiertos al frente; cara de corte con relieve real.
    Devuelve una lista de cortadores (para rellenos)."""
    suelo = D.caja('suelo', -40, 40, Y0, 90, -30.0, 0.0)
    suelo.data.materials.append(M['tierra'])
    suelo.data.materials.append(M['pasto'])
    cortes = []
    huecos = [h if len(h) == 5 else (*h, 1.0) for h in huecos]
    for i, (x0, x1, y1, z0, z1) in enumerate(huecos):
        c = D.caja(f'hueco{i}', x0, x1, Y0 - 3, y1, z0, z1)
        D.restar(suelo, c)
        cortes.append(c)
    D.aplicar_mods(suelo)
    D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > -0.01) else 0)
    frente = D.cara_relieve('frente', ancho[0], ancho[1], -16.0, 0.0, Y0 - 0.001, M['tierra'], fuerza=0.32)
    D.aplicar_mods(frente)
    bm = bmesh.new()
    bm.from_mesh(frente.data)
    borrar = []
    for f in bm.faces:
        c = f.calc_center_median()
        if any(x0 < c.x < x1 and z0 < c.z < z1 for x0, x1, y1, z0, z1 in huecos):
            borrar.append(f)
    bmesh.ops.delete(bm, geom=borrar, context='FACES')
    bm.to_mesh(frente.data)
    bm.free()
    xs = sorted((x0, x1) for x0, x1, _, _, z1 in huecos if z1 > 0)
    a = -40
    for x0, x1 in xs + [(40, 40)]:
        if x0 > a:
            D.caja('pasto_borde', a, x0, Y0 - 0.06, Y0 + 0.4, -0.12, 0.02, M['pasto'])
        a = max(a, x1)
    return cortes


def relleno_hoyo(M, x0, x1, y1, z0, t_aparece, t_cava0, t_cava1):
    """Tierra + pasto que tapan un hueco desde t_aparece y se 'cavan' entre t_cava0 y t_cava1."""
    tierra = caja_o('tierra_hoyo', x0, x1, YF, y1, z0, 0.0, M['tierra'], (0, 0, z0))
    pasto = caja_o('pasto_hoyo', x0, x1, YF, y1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
    for o in (tierra, pasto):
        key(o, 'scale', max(0.0, t_aparece - 0.05), (0, 0, 0), 'CONSTANT')
        key(o, 'scale', t_aparece, (1, 1, 1))
    key(pasto, 'scale', t_cava0, (1, 1, 1))
    key(pasto, 'scale', t_cava0 + 0.12, (0, 0, 0), 'CONSTANT')
    key(tierra, 'scale', t_cava0, (1, 1, 1))
    key(tierra, 'scale', t_cava1, (1, 1, 0.01))
    key(tierra, 'scale', t_cava1 + 0.05, (0, 0, 0), 'CONSTANT')
    return tierra, pasto


def tapar(M, piezas, t0, dur=0.35, gancho_hasta=None):
    """Rellena con tierra + pasto (piezas = [(x0, x1, y1, z0)]) creciendo desde abajo en t0."""
    objs = []
    for i, (x0, x1, y1, z0) in enumerate(piezas):
        tierra = caja_o(f'tapa_tierra{i}', x0, x1, YF, y1, z0, 0.0, M['relleno'], (0, 0, z0))
        pasto = caja_o(f'tapa_pasto{i}', x0, x1, YF, y1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
        if gancho_hasta:
            gancho([tierra, pasto], gancho_hasta)
        crecer(tierra, 2, t0, t0 + dur)
        crecer(pasto, 2, t0 + dur - 0.05, t0 + dur + 0.15)
        objs += [tierra, pasto]
    return objs


def monton(M, loc, t0, t1, t_fin=None, esc=(2.6, 2.2, 1.2)):
    m = esfera('monton', 1.0, M['relleno'], loc)
    key(m, 'scale', t0, (0, 0, 0))
    key(m, 'scale', t1, esc)
    if t_fin:
        key(m, 'scale', t_fin, esc)
        key(m, 'scale', t_fin + 0.4, (0, 0, 0), 'CONSTANT')
    return m


# ---------------- casa y patio ----------------
def casa_patio(M, HX=-6.5, HY=13.0, arboles=None, extra=()):
    D.caja('terraza', HX - 7.5, HX + 7.0, HY - 3.5, HY + 0.1, 0.0, 0.08, M['piso'])
    for p in D.casa(M, y0=HY):
        p.location.x += HX
    for nombre, loc, rz, s in (
            ('outdoor_table_chair_set_01', (HX - 3.5, HY - 1.8, 0.08), 0.3, 1.0),
            ('plastic_monobloc_chair_01', (HX + 2.5, HY - 2.4, 0.08), 2.6, 1.0),
            ('potted_plant_02', (HX - 3.0, HY - 0.4, 0.08), 0, 1.3),
            ('planter_pot_clay', (HX + 2.2, HY - 0.4, 0.08), 0, 1.4),
            ('shrub_04', (HX - 8.6, HY - 0.6, 0), 0, 1.6),
            ('shrub_02', (HX + 7.6, HY - 0.6, 0), 1.0, 1.7),
            ('garden_hose_wall_mounted_01', (HX + 4.2, HY - 0.05, 0.6), math.pi, 1.0),
    ) + tuple(extra):
        D.modelo(nombre, loc, rz, s)
    D.caja('barda', -40, 40, HY + 11.0, HY + 11.15, 0, 1.8, M['zocalo'])
    for i, xv in enumerate((-16.0, -12.5, 9.0, 12.5, -20.0, 18.0)):
        D.modelo('shrub_0%d' % (2, 4)[i % 2], (xv, HY + 9.5 - (i % 2), 0), i * 0.7, 2.4)
    for xv, yv, h in (arboles or ((-14.0, HY + 12.5, 7.5), (13.0, HY + 12.5, 7.5), (-22.0, HY + 13, 8.0),
                                  (21.0, HY + 13, 8.0), (17.0, HY + 1, 6.5))):
        D.arbol((xv, yv, 0), alto=h, semilla=int(xv))


# ---------------- camara y salida ----------------
def tomas(TOMAS, lente=28):
    """TOMAS: [(t, (x,y,z), (mx,my,mz) [, 'CORTE'])]; 'CORTE' = la toma se mantiene y salta a la siguiente."""
    cam, mira = D.camara(TOMAS[0][1], TOMAS[0][2], lente=lente)
    for tm in TOMAS:
        t, loc, la = tm[:3]
        it = 'CONSTANT' if len(tm) > 3 else 'BEZIER'
        key(cam, 'location', t, loc, it)
        key(mira, 'location', t, la, it)
    return cam, mira


def luz():
    return D.luz_dia('nishita', fuerza_cielo=0.35, sol=4.0, az=-40, el=45)


def terminar(opt, salida, DUR):
    D.eevee(int(opt.get('--ancho', 720)), int(opt.get('--muestras', 6)))
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, F(DUR)
    sc.render.image_settings.file_format = 'PNG'
    sc.render.use_overwrite = False
    sc.render.use_placeholder = True
    franja = os.environ.get('FRANJA')  # x0,y0,x1,y1 en pixeles desde arriba-izquierda: re-render parcial
    if franja:
        x0, y0, x1, y1 = (int(v) for v in franja.split(','))
        W, H = sc.render.resolution_x, sc.render.resolution_y
        c = sc.camera.data
        mm = c.sensor_width / max(W, H)  # sensor_fit AUTO: el sensor cubre el lado mayor
        w, h = x1 - x0, y1 - y0
        sc.render.resolution_x, sc.render.resolution_y = w, h
        c.sensor_fit = 'AUTO'
        c.sensor_width = mm * max(w, h)
        c.shift_x = ((x0 + x1) / 2 - W / 2) / max(w, h)
        c.shift_y = (H / 2 - (y0 + y1) / 2) / max(w, h)
    if '--stills' in opt:
        for t in opt['--stills'].split(','):
            sc.frame_set(F(float(t)))
            sc.render.filepath = os.path.join(salida, f's_{float(t):05.1f}.png')
            bpy.ops.render.render(write_still=True)
    else:
        sc.render.filepath = os.path.join(salida, 'f_')
        bpy.ops.render.render(animation=True)
    print('LISTO')
