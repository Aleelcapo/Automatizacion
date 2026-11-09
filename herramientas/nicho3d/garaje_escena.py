"""Garaje secreto bajo el pasto, estilo diorama (Eevee). Sincronizado con .tmp_render/garaje/palabras.json (audio limpio).

blender -b -P garaje_escena.py -- SALIDA_DIR [--ancho 720] [--muestras 6] [--stills 1.0,7.5,...]
"""
import math
import os
import random
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402

arg = sys.argv[sys.argv.index('--') + 1:]
salida = arg[0]
opt = {arg[i]: arg[i + 1] for i in range(1, len(arg) - 1) if arg[i].startswith('--')}
FPS = 24
DUR = 41.9
FUENTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fuentes', 'Anton-Regular.ttf')


def F(t):
    return int(round(t * FPS)) + 1


def key(o, path, t, val, interp='BEZIER'):
    setattr(o, path, val)
    o.keyframe_insert(path, frame=F(t))
    for fc in o.animation_data.action.fcurves:
        if fc.data_path == path:
            for kp in fc.keyframe_points:
                if int(round(kp.co.x)) == F(t):
                    kp.interpolation = interp


def pop(o, t, dur=0.3, s=1.0):
    s3 = (s, s, s) if isinstance(s, (int, float)) else s
    key(o, 'scale', t - 0.1, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t, (0, 0, 0))
    key(o, 'scale', t + dur * 0.7, tuple(v * 1.12 for v in s3))
    key(o, 'scale', t + dur, s3)


def quitar(o, t, dur=0.3, s=1.0):
    s3 = (s, s, s) if isinstance(s, (int, float)) else s
    key(o, 'scale', t, s3)
    key(o, 'scale', t + dur, (0, 0, 0), 'CONSTANT')


def crecer(o, eje, t0, t1, s=1.0):
    a = [1.0, 1.0, 1.0]
    a[eje] = 0.0
    key(o, 'scale', t0 - 0.1, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t0, tuple(a))
    key(o, 'scale', t1, (1.0, 1.0, 1.0))


def gancho(o, t_fin=5.27):
    """Visible en el gancho (0..t_fin) y oculto despues (hasta que se construya)."""
    key(o, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(o, 'scale', t_fin, (0, 0, 0), 'CONSTANT')


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


def raiz(nombre, loc=(0, 0, 0)):
    o = D.link(bpy.data.objects.new(nombre, None))
    o.location = loc
    return o


def hijos(padre, objs):
    for o in objs:
        o.parent = padre


def flecha(nombre, largo, m, loc, dir_='x', grosor=0.09):
    r = raiz(nombre, loc)
    eje = cilindro(nombre + '_eje', grosor, largo * 0.65, 'x', m, (0, 0, 0))
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=grosor * 2.4, radius2=0, depth=largo * 0.35,
                                    location=(largo * 0.65 + largo * 0.175, 0, 0), rotation=(0, math.pi / 2, 0))
    punta = bpy.context.object
    punta.data.materials.append(m)
    hijos(r, [eje, punta])
    r.rotation_euler = {'x': (0, 0, 0), '-x': (0, 0, math.pi), '-z': (0, math.pi / 2, 0), 'z': (0, -math.pi / 2, 0)}[dir_]
    return r


def texto(nombre, s, m, loc, tam=1.0):
    cu = bpy.data.curves.new(nombre, 'FONT')
    cu.body = s
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.size = tam
    cu.extrude = 0.04
    try:
        cu.font = bpy.data.fonts.load(os.path.abspath(FUENTE))
    except Exception:
        pass
    o = D.link(bpy.data.objects.new(nombre, cu))
    o.data.materials.append(m)
    o.location = loc
    o.rotation_euler = (math.pi / 2, 0, 0)
    return o


def malla_barras(nombre, barras, m):
    """Une muchas barras (x0,x1,y0,y1,z0,z1) en un solo objeto."""
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    for x0, x1, y0, y1, z0, z1 in barras:
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            v.co.x = x0 if v.co.x < 0 else x1
            v.co.y = y0 if v.co.y < 0 else y1
            v.co.z = z0 if v.co.z < 0 else z1
    bm.to_mesh(me)
    bm.free()
    o = D.link(bpy.data.objects.new(nombre, me))
    o.data.materials.append(m)
    return o


def auto(nombre, col, loc, rz=0.0, deportivo=False):
    """Auto estilizado orientado a lo largo de x (frente en +x). Devuelve (raiz, faros)."""
    r = raiz(nombre, loc)
    r.rotation_euler = (0, 0, rz)
    pintura = D.liso(nombre + '_pintura', col, 0.18, metal=0.35)
    largo, ancho = (2.25, 0.95) if deportivo else (2.2, 0.9)
    alto0, alto1 = (0.28, 0.78) if deportivo else (0.3, 0.95)
    cuerpo = D.caja(nombre + '_cuerpo', -largo, largo, -ancho, ancho, alto0, alto1, pintura)
    bv = cuerpo.modifiers.new('bisel', 'BEVEL')
    bv.width = 0.16
    bv.segments = 3
    me = bpy.data.meshes.new(nombre + '_cabina')
    bm = bmesh.new()
    if deportivo:
        perfil = [(-1.3, alto1), (1.0, alto1), (0.2, alto1 + 0.42), (-0.9, alto1 + 0.42)]
    else:
        perfil = [(-1.5, alto1), (1.1, alto1), (0.6, alto1 + 0.55), (-1.25, alto1 + 0.55)]
    a = [bm.verts.new((x, -ancho * 0.82, z)) for x, z in perfil]
    b = [bm.verts.new((x, ancho * 0.82, z)) for x, z in perfil]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    cab = D.link(bpy.data.objects.new(nombre + '_cabina', me))
    cab.data.materials.append(M['vidrio_auto'])
    partes = [cuerpo, cab]
    for wx in (-largo * 0.62, largo * 0.62):
        for wy in (-ancho - 0.02, ancho + 0.02):
            partes.append(cilindro(nombre + '_rueda', 0.34, 0.26, 'y', M['llanta'], (wx, wy - 0.13, 0.34), verts=20))
            partes.append(cilindro(nombre + '_rin', 0.2, 0.28, 'y', M['rin'], (wx, wy - 0.14, 0.34), verts=16))
    faro_m = D.liso(nombre + '_faro', (1.0, 0.95, 0.8), 0.2, emit=0.6)
    faros = []
    for fy in (-ancho * 0.65, ancho * 0.65):
        f = D.caja(nombre + '_faro', largo - 0.02, largo + 0.04, fy - 0.2, fy + 0.2, alto1 - 0.22, alto1 - 0.08, faro_m)
        faros.append(f)
        partes.append(D.caja(nombre + '_stop', -largo - 0.04, -largo + 0.02, fy - 0.2, fy + 0.2, alto1 - 0.22, alto1 - 0.1,
                             M['stop']))
    partes += faros
    hijos(r, partes)
    return r, faro_m


def volteo(nombre, loc):
    """Camion de volteo pequeno con tierra."""
    r = raiz(nombre, loc)
    partes = [D.caja(nombre + '_chasis', -2.2, 2.2, -0.9, 0.9, 0.45, 0.75, M['chasis']),
              D.caja(nombre + '_cabina', 1.0, 2.3, -1.0, 1.0, 0.75, 2.3, M['amarillo']),
              D.caja(nombre + '_vidrio', 2.28, 2.33, -0.85, 0.85, 1.6, 2.15, M['vidrio']),
              D.caja(nombre + '_caja', -2.3, 0.9, -1.05, 1.05, 0.75, 1.9, M['amarillo'])]
    tierra = esfera(nombre + '_tierra', 1.0, M['relleno'], (-0.7, 0, 1.8), esc=(1.5, 0.95, 0.55))
    partes.append(tierra)
    for wx in (-1.5, 1.6):
        for wy in (-0.95, 0.95):
            partes.append(cilindro(nombre + '_rueda', 0.45, 0.3, 'y', M['llanta'], (wx, wy - 0.15, 0.45), verts=18))
    hijos(r, partes)
    return r


bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(11)

M = {
    'pasto': D.pasto(),
    'tierra': D.pbr('tierra', 'excavated_soil_wall', tam=2.2, tinte=(0.42, 0.24, 0.12), fac=0.25, oscurecer=(0.0, -9.0, 0.5)),
    'relleno': D.pbr('relleno', 'brown_mud_rocks_01', tam=1.6, tinte=(0.40, 0.25, 0.13), fac=0.3),
    'concreto': D.pbr('concreto', 'smooth_concrete_floor', tam=1.5, tinte=(0.62, 0.62, 0.6), fac=0.7, brillo=1.5),
    'piso_garaje': D.pbr('piso_garaje', 'smooth_concrete_floor', tam=2.5, tinte=(0.55, 0.56, 0.58), fac=0.6, brillo=1.4),
    'piso': D.pbr('piso', 'patterned_paving', tam=1.6, tinte=(0.78, 0.62, 0.52), fac=0.35),
    'muro': D.pbr('muro', 'plastered_wall_04', tam=3.0, tinte=(0.93, 0.78, 0.6), fac=0.85, brillo=1.25),
    'zocalo': D.pbr('zocalo', 'rough_concrete', tam=1.5, tinte=(0.55, 0.5, 0.48), fac=0.3),
    'teja': D.pbr('teja', 'clay_roof_tiles_02', tam=2.0, tinte=(0.55, 0.22, 0.14), fac=0.3),
    'marco': D.liso('marco', (0.92, 0.9, 0.86), 0.45),
    'postigo': D.liso('postigo', (0.17, 0.3, 0.45), 0.5),
    'vidrio': D.liso('vidrio', (0.12, 0.17, 0.24), 0.08, metal=0.3),
    'vidrio_auto': D.liso('vidrio_auto', (0.03, 0.04, 0.06), 0.05, metal=0.5),
    'llanta': D.liso('llanta', (0.03, 0.03, 0.03), 0.8),
    'rin': D.liso('rin', (0.7, 0.7, 0.72), 0.25, metal=0.9),
    'stop': D.liso('stop', (0.8, 0.02, 0.02), 0.3, emit=0.4),
    'chasis': D.liso('chasis', (0.08, 0.08, 0.09), 0.5),
    'amarillo': D.liso('amarillo', (0.95, 0.68, 0.05), 0.4),
    'acero': D.liso('acero', (0.36, 0.38, 0.42), 0.35, metal=0.85),
    'varilla': D.liso('varilla', (0.45, 0.22, 0.1), 0.6, metal=0.4),
    'piston': D.liso('piston', (0.85, 0.86, 0.88), 0.15, metal=1.0),
    'cilindro': D.liso('cilindro', (0.9, 0.55, 0.05), 0.4, metal=0.3),
    'tubo': D.liso('tubo', (0.93, 0.93, 0.92), 0.35),
    'bomba': D.liso('bomba', (0.1, 0.3, 0.85), 0.35, metal=0.3),
    'flecha_roja': D.liso('flecha_roja', (1.0, 0.12, 0.08), 0.5, emit=1.5),
    'flecha_azul': D.liso('flecha_azul', (0.35, 0.75, 1.0), 0.5, emit=1.6),
    'medida': D.liso('medida', (1.0, 0.85, 0.1), 0.5, emit=1.8),
    'gota': D.liso('gota', (0.7, 0.85, 1.0), 0.1, emit=0.6),
    'agua': D.agua(),
    'boton': D.liso('boton', (0.9, 0.05, 0.05), 0.3, emit=0.3),
}

# ---------------- terreno con hueco fijo ----------------
Y0 = -4.0
YF = Y0 - 0.15
GX = 7.0                  # garaje x[-GX, GX]
GY1 = Y0 + 7.0            # fondo del garaje
PISO = -3.7               # piso interior
TECHO = -0.6              # techo interior
SX = 2.6                  # pozo de la plataforma x[-SX, SX], y[YF, SY1]
SY1 = Y0 + 2.6
T_CORTE = 5.27            # fin del gancho

suelo = D.caja('suelo', -40, 40, Y0, 90, -30.0, 0.0)
suelo.data.materials.append(M['tierra'])
suelo.data.materials.append(M['pasto'])
hueco = D.caja('hueco', -GX - 0.1, GX + 0.1, Y0 - 3, GY1 + 0.1, PISO - 0.35, 1.0)
D.restar(suelo, hueco)
D.aplicar_mods(suelo)
D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > -0.01) else 0)
frente = D.cara_relieve('frente', -16, 18, -16.0, 0.0, Y0 - 0.001, M['tierra'], fuerza=0.32)
D.aplicar_mods(frente)
_bm = bmesh.new()
_bm.from_mesh(frente.data)
bmesh.ops.delete(_bm, geom=[f for f in _bm.faces if -GX - 0.1 < f.calc_center_median().x < GX + 0.1
                            and f.calc_center_median().z > PISO - 0.35], context='FACES')
_bm.to_mesh(frente.data)
_bm.free()
for a, b in ((-40, -GX - 0.1), (GX + 0.1, 40)):
    D.caja('pasto_borde', a, b, Y0 - 0.06, Y0 + 0.4, -0.12, 0.02, M['pasto'])

# relleno antes de cavar (solo visible desde el corte hasta la excavacion)
T_CAVA0, T_CAVA1 = 5.62, 7.4
tierra_hoyo = caja_o('tierra_hoyo', -GX - 0.1, GX + 0.1, YF, GY1 + 0.1, PISO - 0.35, 0.0, M['tierra'], (0, 0, PISO - 0.35))
pasto_hoyo = caja_o('pasto_hoyo', -GX - 0.1, GX + 0.1, YF, GY1 + 0.1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
for o in (tierra_hoyo, pasto_hoyo):
    key(o, 'scale', T_CORTE - 0.05, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', T_CORTE, (1, 1, 1))
key(pasto_hoyo, 'scale', T_CAVA0, (1, 1, 1))
key(pasto_hoyo, 'scale', T_CAVA0 + 0.12, (0, 0, 0), 'CONSTANT')
key(tierra_hoyo, 'scale', T_CAVA0, (1, 1, 1))
key(tierra_hoyo, 'scale', T_CAVA1, (1, 1, 0.01))
key(tierra_hoyo, 'scale', T_CAVA1 + 0.05, (0, 0, 0), 'CONSTANT')
monton = esfera('monton', 1.0, M['relleno'], (-11.0, 5.0, 0.0))
key(monton, 'scale', T_CAVA0, (0, 0, 0))
key(monton, 'scale', T_CAVA1, (3.2, 2.6, 1.6))
key(monton, 'scale', 8.2, (3.2, 2.6, 1.6))
key(monton, 'scale', 10.9, (0, 0, 0), 'CONSTANT')

# medida "6 m"
medida = raiz('medida', (-GX - 0.9, YF - 0.35, 0))
barra = cilindro('medida_barra', 0.05, -PISO, 'z', M['medida'], (0, 0, PISO))
hijos(medida, [barra])
for z in (0.0, PISO):
    hijos(medida, [D.caja('medida_tope', -0.35, 0.35, -0.05, 0.05, z - 0.04, z + 0.04, M['medida'])])
etiqueta = texto('medida_txt', '6 m', M['medida'], (-1.0, 0, PISO / 2), tam=1.1)
etiqueta.parent = medida
pop(medida, 6.4, 0.35)
quitar(medida, 7.75, 0.25)

# ---------------- camiones (x40) ----------------
camiones = []
for i in range(6):
    c = volteo(f'volteo{i}', (-9.0, 7.6, 0))
    t0 = 8.0 + i * 0.42
    pop(c, t0, 0.25)
    key(c, 'location', t0, (-9.0, 7.6, 0))
    key(c, 'location', t0 + 2.4, (14.0, 7.6, 0))
    quitar(c, t0 + 2.45, 0.2)
x40 = texto('x40', '×40', M['medida'], (4.0, 7.6, 4.2), tam=2.2)
x40.rotation_euler = (math.radians(70), 0, math.radians(-25))
pop(x40, 9.78, 0.35)
quitar(x40, 11.0, 0.2)

# ---------------- estructura: varillas, muros, piso, techo ----------------
W = 0.3
muros = [
    ('m_izq', -GX, -GX + W, YF, GY1, PISO - 0.3, TECHO),
    ('m_der', GX - W, GX, YF, GY1, PISO - 0.3, TECHO),
    ('m_fondo', -GX, GX, GY1 - W, GY1, PISO - 0.3, TECHO),
    ('m_piso', -GX, GX, YF, GY1, PISO - 0.3, PISO),
]
varillas = []
for nombre, x0, x1, y0, y1, z0, z1 in muros:
    barras = []
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
    if nombre == 'm_piso':
        for x in [(-GX + 0.3) + 0.5 * k for k in range(int((2 * GX - 0.6) / 0.5) + 1)]:
            barras.append((x - 0.025, x + 0.025, YF, GY1 - 0.3, cz - 0.025, cz + 0.025))
        for y in [YF + 0.1 + 0.5 * k for k in range(int((GY1 - YF) / 0.5))]:
            barras.append((-GX + 0.3, GX - 0.3, y - 0.025, y + 0.025, cz + 0.03, cz + 0.08))
    else:
        for z in [PISO + 0.2 + 0.5 * k for k in range(7)]:
            if nombre == 'm_fondo':
                barras.append((-GX + 0.3, GX - 0.3, cy - 0.025, cy + 0.025, z - 0.025, z + 0.025))
            else:
                barras.append((cx - 0.025, cx + 0.025, YF, GY1 - 0.3, z - 0.025, z + 0.025))
        n = int(((x1 - x0) if nombre == 'm_fondo' else (y1 - y0)) / 0.5)
        for k in range(n + 1):
            if nombre == 'm_fondo':
                x = -GX + 0.3 + 0.5 * k
                if x > GX - 0.3:
                    break
                barras.append((x - 0.025, x + 0.025, cy - 0.06, cy + 0.06 - 0.05, PISO - 0.2, TECHO - 0.05))
            else:
                y = YF + 0.1 + 0.5 * k
                barras.append((cx - 0.06, cx + 0.01, y - 0.025, y + 0.025, PISO - 0.2, TECHO - 0.05))
    v = malla_barras('varilla_' + nombre, barras, M['varilla'])
    # origen abajo para crecer
    v.data.transform(__import__('mathutils').Matrix.Translation((0, 0, -(PISO - 0.3))))
    v.location = (0, 0, PISO - 0.3)
    varillas.append(v)
    gancho(v)
    crecer(v, 2, 11.8 + 0.08 * len(varillas), 12.4 + 0.08 * len(varillas))
muro_obj = []
for nombre, x0, x1, y0, y1, z0, z1 in muros:
    m = M['piso_garaje'] if nombre == 'm_piso' else M['concreto']
    o = caja_o(nombre, x0, x1, y0, y1, z0, z1, m, (0, 0, PISO - 0.3))
    gancho(o)
    crecer(o, 2, 12.6, 13.25)
    muro_obj.append(o)

# techo + relleno + pasto encima (sin el pozo de la plataforma)
techo_piezas = []
for nombre, x0, x1, y0, y1 in (('izq', -GX - 0.1, -SX, YF, GY1 + 0.1), ('der', SX, GX + 0.1, YF, GY1 + 0.1),
                               ('fondo', -SX, SX, SY1, GY1 + 0.1)):
    losa = caja_o('losa_' + nombre, x0, x1, y0, y1, TECHO, TECHO + 0.3, M['concreto'], (0, 0, TECHO))
    tierra = caja_o('tierra_' + nombre, x0, x1, y0, y1, TECHO + 0.3, 0.0, M['relleno'], (0, 0, TECHO + 0.3))
    pasto = caja_o('pasto_' + nombre, x0, x1, y0, y1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
    for o, t in ((losa, 24.45), (tierra, 24.65), (pasto, 24.85)):
        gancho(o)
        crecer(o, 2, t, t + 0.25)
    techo_piezas += [losa, tierra, pasto]
# marco del pozo (borde de acero visible desde arriba)
for nombre, x0, x1, y0, y1 in (('bi', -SX - 0.12, -SX, YF, SY1 + 0.12), ('bd', SX, SX + 0.12, YF, SY1 + 0.12),
                               ('bf', -SX - 0.12, SX + 0.12, SY1, SY1 + 0.12)):
    o = D.caja('borde_' + nombre, x0, x1, y0, y1, -0.05, 0.03, M['acero'])
    gancho(o)
    pop(o, 24.9, 0.2)

# ---------------- empuje de la tierra y derrumbe ----------------
for lado in (-1, 1):
    for k, z in enumerate((-1.0, -2.1, -3.2)):
        fl = flecha(f'empuje{lado}{k}', 1.6, M['flecha_roja'], (lado * (GX + 2.4), YF - 0.35, z), 'x' if lado < 0 else '-x', grosor=0.12)
        t0 = 13.65 + 0.12 * k + (0.2 if lado > 0 else 0)
        pop(fl, t0, 0.25)
        x0 = lado * (GX + 2.4)
        for j, t in enumerate([t0 + 0.3 + 0.5 * n for n in range(7)]):
            key(fl, 'location', t, (x0 - lado * (0.35 if j % 2 else 0.0), YF - 0.35, z))
        quitar(fl, 17.45, 0.25)
cunas = []
for lado in (-1, 1):
    perfil = [(lado * GX, 0.0), (lado * GX, PISO), (lado * (GX - 4.6), PISO)]
    if lado > 0:
        perfil = list(reversed(perfil))
    c = D.prisma_y(f'derrumbe{lado}', [(x - lado * GX, z) for x, z in perfil], YF - 0.02, GY1 - 0.3, M['relleno'])
    c.location = (lado * GX, 0, 0)
    key(c, 'scale', 16.25, (0, 0, 0), 'CONSTANT')
    key(c, 'scale', 16.3, (0, 1, 1))
    key(c, 'scale', 17.05, (1, 1, 1))
    key(c, 'scale', 17.55, (1, 1, 1))
    key(c, 'scale', 17.6, (0, 0, 0), 'CONSTANT')
    cunas.append(c)
for o in muro_obj[:3] + varillas[:3]:
    key(o, 'scale', 16.2, (1, 1, 1))
    key(o, 'scale', 16.3, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', 17.55, (0, 0, 0))
    key(o, 'scale', 17.6, (1, 1, 1), 'CONSTANT')

# ---------------- bomba, lluvia, inundacion ----------------
bomba = raiz('bomba', (GX - 1.1, Y0 + 0.9, PISO))
hijos(bomba, [cilindro('bomba_cuerpo', 0.32, 0.7, 'z', M['bomba'], (0, 0, 0)),
              cilindro('bomba_tapa', 0.36, 0.08, 'z', M['acero'], (0, 0, 0.7))])
gancho(bomba)
pop(bomba, 18.95, 0.3)
quitar(bomba, 21.0, 0.25)
pop(bomba, 24.35, 0.3)
tubo_b = cilindro('tubo_bomba', 0.1, -PISO + 0.3, 'z', M['tubo'], (GX - 0.65, Y0 + 0.9, PISO + 0.5))
gancho(tubo_b)
crecer(tubo_b, 2, 19.3, 19.9)
for k in range(3):
    fa = flecha(f'sube{k}', 0.8, M['flecha_azul'], (GX - 0.65, YF - 0.3, PISO + 0.6), 'z', grosor=0.07)
    t0 = 19.85 + 0.25 * k
    pop(fa, t0, 0.2)
    key(fa, 'location', t0, (GX - 0.95, YF - 0.3, PISO + 0.6))
    key(fa, 'location', t0 + 0.9, (GX - 0.95, YF - 0.3, -0.6))
    quitar(fa, t0 + 0.9, 0.15)
gotas = []
for i in range(70):
    x, y = random.uniform(-9, 9), random.uniform(Y0 - 1, Y0 + 9)
    g = cilindro(f'gota{i}', 0.018, 0.7, 'z', M['gota'], (x, y, 12), verts=6)
    g.scale = (0, 0, 0)
    fase = random.uniform(0, 0.5)
    t = 19.9 + fase
    key(g, 'scale', t - 0.05, (0, 0, 0), 'CONSTANT')
    while t < 24.2:
        key(g, 'location', t, (x, y, 11.0), 'LINEAR')
        key(g, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(g, 'location', t + 0.46, (x, y, -0.2 if abs(x) > GX or y > GY1 else PISO), 'CONSTANT')
        t += 0.5
    key(g, 'scale', t, (0, 0, 0), 'CONSTANT')
    gotas.append(g)
inunda = caja_o('inundacion', -GX + W, GX - W, YF + 0.02, GY1 - W, PISO, TECHO - 0.35, M['agua'], (0, 0, PISO))
key(inunda, 'scale', 22.2, (0, 0, 0), 'CONSTANT')
key(inunda, 'scale', 22.3, (1, 1, 0.02))
key(inunda, 'scale', 23.9, (1, 1, 1))
key(inunda, 'scale', 24.3, (1, 1, 1))
key(inunda, 'scale', 24.6, (1, 1, 0.02))
key(inunda, 'scale', 24.62, (0, 0, 0), 'CONSTANT')

# autos estacionados (3) y el deportivo
estacionados = []
for i, (x, col) in enumerate(((-4.6, (0.85, 0.86, 0.88)), (0.0, (0.06, 0.18, 0.5)), (4.6, (0.2, 0.2, 0.22)))):
    a, _ = auto(f'auto{i}', col, (x, GY1 - 1.6, PISO))
    gancho(a)
    pop(a, 21.45 + 0.12 * i, 0.3)
    key(a, 'location', 22.9, (x, GY1 - 1.6, PISO))
    key(a, 'location', 23.7, (x, GY1 - 1.6, PISO + 1.0 + 0.2 * i))
    key(a, 'rotation_euler', 23.7, (0.05 * (i - 1), 0.04, 0.06 * (1 - i)))
    key(a, 'rotation_euler', 24.2, (-0.04 * (i - 1), -0.03, -0.04 * (1 - i)))
    key(a, 'location', 24.3, (x, GY1 - 1.6, PISO + 1.0 + 0.2 * i))
    key(a, 'location', 24.6, (x, GY1 - 1.6, PISO))
    key(a, 'rotation_euler', 24.6, (0, 0, 0))
    estacionados.append(a)

# ---------------- plataforma, pistones, tapa ----------------
YC = (YF + SY1) / 2
ARRIBA, ABAJO = 0.0, PISO + 0.6
plataforma = raiz('plataforma', (0, 0, ABAJO))
acero = D.caja('plat_acero', -SX + 0.08, SX - 0.08, YF + 0.05, SY1 - 0.08, -0.35, -0.08, M['acero'])
vigas = [D.caja('plat_viga', x - 0.08, x + 0.08, YF + 0.05, SY1 - 0.08, -0.5, -0.35, M['acero']) for x in (-1.6, 0, 1.6)]
pasto_plat = D.caja('plat_pasto', -SX + 0.08, SX - 0.08, YF + 0.05, SY1 - 0.08, -0.08, 0.02, M['pasto'])
hijos(plataforma, [acero, pasto_plat] + vigas)
key(plataforma, 'location', 0.0, (0, 0, ABAJO), 'CONSTANT')
key(plataforma, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(plataforma, 'scale', T_CORTE, (0, 0, 0), 'CONSTANT')
key(plataforma, 'location', 25.5, (0, 0, ARRIBA), 'CONSTANT')
pop(plataforma, 25.95, 0.3)
pasto_plat.scale = (1, 1, 1)
key(pasto_plat, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(pasto_plat, 'scale', T_CORTE, (0, 0, 0), 'CONSTANT')
pop(pasto_plat, 27.25, 0.3)
MOV = [(28.8, ARRIBA), (29.35, -1.9), (29.95, ARRIBA), (33.0, ARRIBA), (34.0, ABAJO)]
for t, z in MOV:
    key(plataforma, 'location', t, (0, 0, z))
# pistones telescopicos (barril amarillo en el piso, vastago cromado hasta la plataforma)
for px in (-1.4, 1.4):
    barril = cilindro(f'barril{px}', 0.2, 0.5, 'z', M['cilindro'], (px, YC, PISO - 0.4))
    vast = cilindro(f'vastago{px}', 0.11, 1.0, 'z', M['piston'], (px, YC, PISO + 0.1))
    tope = PISO + 0.1

    def largo(zplat):
        return max(0.001, (zplat - 0.5) - tope)
    key(barril, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(barril, 'scale', T_CORTE, (0, 0, 0), 'CONSTANT')
    pop(barril, 29.75, 0.25)
    key(vast, 'scale', 0.0, (1, 1, largo(ABAJO)), 'CONSTANT')
    key(vast, 'scale', T_CORTE, (0, 0, 0), 'CONSTANT')
    key(vast, 'scale', 29.75, (0, 0, 0), 'CONSTANT')
    key(vast, 'scale', 29.95, (1, 1, largo(ARRIBA)))
    for t, z in MOV[2:]:
        key(vast, 'scale', t, (1, 1, largo(z)))
tapa = raiz('tapa', (0, 0, 0))
hijos(tapa, [D.caja('tapa_acero', -SX + 0.02, SX - 0.02, YF, SY1 - 0.02, -0.3, -0.08, M['acero']),
             D.caja('tapa_pasto', -SX + 0.02, SX - 0.02, YF, SY1 - 0.02, -0.08, 0.025, M['pasto'])])
key(tapa, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(tapa, 'location', 0.0, (0, 0, 0))
key(tapa, 'location', 4.72, (0, 0, 0))
key(tapa, 'location', 5.15, (2 * SX + 0.3, 0, -0.32))
key(tapa, 'scale', T_CORTE, (0, 0, 0), 'CONSTANT')
key(tapa, 'scale', 33.9, (1, 1, 1), 'CONSTANT')
key(tapa, 'location', 33.9, (2 * SX + 0.3, 0, -0.32))
key(tapa, 'location', 34.4, (0.02, 0, -0.32))
key(tapa, 'location', 34.6, (0, 0, 0))

# el deportivo rojo
ferrari, faro_f = auto('deportivo', (0.75, 0.02, 0.02), (0, YC, ABAJO), deportivo=True)
key(ferrari, 'location', 0.0, (0, YC, ABAJO), 'CONSTANT')
key(ferrari, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(ferrari, 'scale', T_CORTE, (0, 0, 0), 'CONSTANT')
key(ferrari, 'location', 30.9, (-13.0, YC, 0.0))
pop(ferrari, 30.95, 0.2)
key(ferrari, 'location', 31.05, (-13.0, YC, 0.0))
key(ferrari, 'location', 32.0, (0.0, YC, 0.0))
for t, z in MOV[3:]:
    key(ferrari, 'location', t, (0.0, YC, z))
bf = faro_f.node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((31.0, 0.6), (31.05, 4.0), (32.0, 4.0), (32.3, 0.6), (40.8, 0.6), (40.85, 9.0), (41.05, 0.6), (41.2, 9.0), (41.45, 0.6)):
    bf.default_value = v
    bf.keyframe_insert('default_value', frame=F(t))

# boton en el pasto (poste con boton rojo que brilla)
poste = cilindro('poste', 0.09, 0.9, 'z', M['acero'], (-SX - 0.8, YF + 0.6, 0))
boton = esfera('boton', 0.11, M['boton'], (-SX - 0.8, YF + 0.6, 0.95), esc=(1, 1, 0.6))
eb = M['boton'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((3.5, 0.3), (3.6, 8.0), (4.4, 8.0), (4.6, 0.3), (32.5, 0.3), (32.6, 8.0), (33.4, 8.0), (33.6, 0.3)):
    eb.default_value = v
    eb.keyframe_insert('default_value', frame=F(t))
for o in (poste, boton):
    gancho(o)
    pop(o, 30.6, 0.25, tuple(o.scale) if o is boton else 1.0)
boton.scale = (1, 1, 0.6)

# ---------------- casa, patio, utileria ----------------
HY = 13.0
HX = -6.5
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
):
    D.modelo(nombre, loc, rz, s)
D.caja('barda', -40, 40, 24.0, 24.15, 0, 1.8, M['zocalo'])
for i, xv in enumerate((-16.0, -12.5, 9.0, 12.5, -20.0, 18.0)):
    D.modelo('shrub_0%d' % (2, 4)[i % 2], (xv, 22.5 - (i % 2), 0), i * 0.7, 2.4)
for xv, yv, h in ((-14.0, 25.5, 7.5), (13.0, 25.5, 7.5), (-22.0, 26.0, 8.0), (21.0, 26.0, 8.0), (17.0, 14.0, 6.5),
                  (16.0, 4.0, 6.0)):
    D.arbol((xv, yv, 0), alto=h, semilla=int(xv))

# ---------------- camara ----------------
cam, mira = D.camara((9.0, 11.0, 6.5), (0, -1.5, -0.4), lente=28)
CUT = 'CONST'
TOMAS = [
    (0.0, (-0.5, -8.5, 8.0), (0.0, -0.6, -0.8)),
    (1.5, (-1.5, -10.0, 9.0), (0.0, -0.5, -0.8)),
    (2.9, (-3.0, -16.0, 7.5), (0.0, 0.0, -1.6)),
    (4.5, (-2.2, -12.5, 7.0), (0.0, -0.8, -1.2)),
    (5.25, (-2.0, -12.0, 6.8), (0.0, -0.8, -1.3), CUT),
    (5.3, (-2.5, -27.0, 4.5), (-0.5, 0.0, -2.0)),
    (7.6, (-2.0, -26.0, 4.0), (-0.5, 0.0, -2.1)),
    (8.3, (2.0, -22.0, 10.0), (3.0, 5.0, 0.0)),
    (10.9, (3.0, -20.5, 9.0), (3.5, 5.5, 0.0)),
    (11.5, (-5.0, -15.0, 1.0), (-5.5, 0.0, -1.9)),
    (13.5, (0.0, -29.0, 2.5), (0.0, 0.0, -1.9)),
    (17.6, (0.0, -27.5, 2.2), (0.0, 0.0, -1.9)),
    (18.4, (4.0, -12.5, -0.5), (5.2, 0.0, -2.8)),
    (20.3, (4.2, -12.0, -0.3), (5.2, 0.0, -2.4)),
    (21.0, (0.5, -21.0, 5.0), (0.0, 1.0, -1.6)),
    (24.3, (0.3, -19.0, 4.0), (0.0, 1.0, -1.6)),
    (25.2, (-2.5, -13.0, 4.0), (0.0, 0.0, -1.2)),
    (28.6, (-3.0, -14.0, 3.6), (0.0, 0.0, -1.5)),
    (30.6, (-7.0, -14.0, 4.8), (-3.0, 0.0, -0.8)),
    (32.2, (-4.0, -13.0, 4.0), (0.0, 0.0, -1.0)),
    (34.2, (-3.0, -15.0, 3.0), (0.0, 0.0, -1.8)),
    (34.7, (0.5, -1.0, 16.0), (0.0, 6.0, 0.0)),
    (36.5, (0.5, -1.5, 15.0), (0.0, 6.0, 0.0)),
    (38.2, (-6.0, -24.0, 9.0), (-3.0, 5.0, 0.0)),
    (39.6, (0.6, -14.0, 0.2), (0.0, 0.0, -2.6)),
    (DUR, (0.4, -10.5, -1.0), (0.0, 0.0, -2.8)),
]
for tm in TOMAS:
    t, loc, la = tm[:3]
    it = 'CONSTANT' if len(tm) > 3 else 'BEZIER'
    key(cam, 'location', t, loc, it)
    key(mira, 'location', t, la, it)

D.luz_dia('nishita', fuerza_cielo=0.35, sol=4.0, az=-40, el=45)
D.eevee(int(opt.get('--ancho', 720)), int(opt.get('--muestras', 6)))
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, F(DUR)
sc.render.image_settings.file_format = 'PNG'
sc.render.use_overwrite = False
sc.render.use_placeholder = True

if '--debug' in opt:
    for t in opt['--debug'].split(','):
        sc.frame_set(F(float(t)))
        for o in sc.objects:
            if o.name.startswith(('deportivo', 'auto0')) and o.parent is None:
                print('DBG', t, o.name, tuple(round(v, 2) for v in o.matrix_world.translation), tuple(round(v, 2) for v in o.scale))
    sys.exit(0)
if '--stills' in opt:
    for t in opt['--stills'].split(','):
        sc.frame_set(F(float(t)))
        sc.render.filepath = os.path.join(salida, f's_{float(t):05.1f}.png')
        bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = os.path.join(salida, 'f_')
    bpy.ops.render.render(animation=True)
print('LISTO')
