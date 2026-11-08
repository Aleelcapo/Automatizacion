"""Fosa septica bajo el patio, estilo diorama (Eevee). Sincronizado con .tmp_render/fosa/palabras.json.

blender -b -P fosa_escena.py -- SALIDA_DIR [--ancho 720] [--muestras 6] [--stills 1.0,7.5,...]
Sin --stills renderiza la animacion completa a SALIDA_DIR/f_0001.png ... (retoma sin repetir cuadros).
"""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402

arg = sys.argv[sys.argv.index('--') + 1:]
salida = arg[0]
opt = {arg[i]: arg[i + 1] for i in range(1, len(arg) - 1) if arg[i].startswith('--')}
FPS = 24
DUR = 42.0


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
    """Aparece desde escala 0 con un pequeno rebote."""
    s3 = (s, s, s) if isinstance(s, (int, float)) else s
    key(o, 'scale', t - 0.001, (0, 0, 0), 'CONSTANT') if t > 0.05 else None
    key(o, 'scale', t, (0, 0, 0))
    key(o, 'scale', t + dur * 0.7, tuple(v * 1.12 for v in s3))
    key(o, 'scale', t + dur, s3)


def quitar(o, t, dur=0.3, s=1.0):
    s3 = (s, s, s) if isinstance(s, (int, float)) else s
    key(o, 'scale', t, s3)
    key(o, 'scale', t + dur, (0, 0, 0), 'CONSTANT')


def crecer(o, eje, t0, t1, s=1.0, base=None):
    """Escala un eje de 0 a s entre t0 y t1 (el origen del objeto es el ancla)."""
    b = list(base or (1, 1, 1))
    a = list(b)
    a[eje] = 0.0
    b[eje] = s
    key(o, 'scale', t0 - 0.1, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t0, tuple(a))
    key(o, 'scale', t1, tuple(b))


def caja_o(nombre, x0, x1, y0, y1, z0, z1, m, origen):
    """Caja con el origen en 'origen' (para escalar desde ese punto)."""
    ox, oy, oz = origen
    o = D.caja(nombre, x0 - ox, x1 - ox, y0 - oy, y1 - oy, z0 - oz, z1 - oz, m)
    o.location = origen
    return o


def cilindro(nombre, r, largo, eje, m, loc, origen_extremo=True, verts=24):
    """Cilindro a lo largo de 'x', 'y' o 'z'; con origen en un extremo (para crecer como tubo)."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=largo, location=(0, 0, 0))
    o = bpy.context.object
    o.name = nombre
    me = o.data
    for v in me.vertices:
        z = v.co.z + (largo / 2 if origen_extremo else 0)
        x, y = v.co.x, v.co.y
        v.co = {'x': (z, x, y), 'y': (x, z, y), 'z': (x, y, z)}[eje]
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    o.location = loc
    return o


def esfera(nombre, r, m, loc, esc=(1, 1, 1), sub=2):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if sub < 3 else 24, ring_count=10 if sub < 3 else 14, radius=r, location=loc)
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
    """Flecha plana-gruesa apuntando en +x (dir_='x'), -z ('-z') o +x/−x."""
    r = raiz(nombre, loc)
    eje = cilindro(nombre + '_eje', grosor, largo * 0.65, 'x', m, (0, 0, 0))
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=grosor * 2.4, radius2=0, depth=largo * 0.35,
                                    location=(largo * 0.65 + largo * 0.175, 0, 0), rotation=(0, math.pi / 2, 0))
    punta = bpy.context.object
    punta.data.materials.append(m)
    hijos(r, [eje, punta])
    r.rotation_euler = {'x': (0, 0, 0), '-x': (0, 0, math.pi), '-z': (0, math.pi / 2, 0), 'z': (0, -math.pi / 2, 0)}[dir_]
    return r


bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(7)

# ---------------- materiales ----------------
def puntos_mat(nombre):
    """Tubo PVC blanco con agujeros negros (tubo perforado)."""
    m = D.liso(nombre, (0.93, 0.93, 0.92), 0.35)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vo = nt.nodes.new('ShaderNodeTexVoronoi')
    vo.inputs['Scale'].default_value = 4.0
    vo.inputs['Randomness'].default_value = 0.0
    nt.links.new(tc.outputs['Object'], vo.inputs['Vector'])
    lt = nt.nodes.new('ShaderNodeMath')
    lt.operation = 'LESS_THAN'
    lt.inputs[1].default_value = 0.13
    nt.links.new(vo.outputs['Distance'], lt.inputs[0])
    mx = nt.nodes.new('ShaderNodeMix')
    mx.data_type = 'RGBA'
    nt.links.new(lt.outputs[0], mx.inputs['Factor'])
    mx.inputs['A'].default_value = (0.93, 0.93, 0.92, 1)
    mx.inputs['B'].default_value = (0.02, 0.02, 0.02, 1)
    nt.links.new(mx.outputs['Result'], b.inputs['Base Color'])
    return m


M = {
    'pasto': D.pasto(),
    'tierra': D.pbr('tierra', 'excavated_soil_wall', tam=2.2, tinte=(0.42, 0.24, 0.12), fac=0.25, oscurecer=(0.0, -9.0, 0.5)),
    'relleno': D.pbr('relleno', 'brown_mud_rocks_01', tam=1.6, tinte=(0.40, 0.25, 0.13), fac=0.3),
    'concreto': D.pbr('concreto', 'smooth_concrete_floor', tam=1.5, tinte=(0.62, 0.62, 0.6), fac=0.7, brillo=1.5),
    'piso': D.pbr('piso', 'patterned_paving', tam=1.6, tinte=(0.78, 0.62, 0.52), fac=0.35),
    'muro': D.pbr('muro', 'plastered_wall_04', tam=3.0, tinte=(0.93, 0.78, 0.6), fac=0.85, brillo=1.25),
    'zocalo': D.pbr('zocalo', 'rough_concrete', tam=1.5, tinte=(0.55, 0.5, 0.48), fac=0.3),
    'teja': D.pbr('teja', 'clay_roof_tiles_02', tam=2.0, tinte=(0.55, 0.22, 0.14), fac=0.3),
    'marco': D.liso('marco', (0.92, 0.9, 0.86), 0.45),
    'postigo': D.liso('postigo', (0.17, 0.3, 0.45), 0.5),
    'vidrio': D.liso('vidrio', (0.12, 0.17, 0.24), 0.08, metal=0.3),
    'grava': D.pbr('grava', 'gravel_ground_01', tam=0.9, brillo=1.1),
    'tubo': D.liso('tubo', (0.93, 0.93, 0.92), 0.35),
    'perforado': puntos_mat('perforado'),
    'negras': D.liso('negras', (0.10, 0.075, 0.035), 0.2),
    'lodo': D.pbr('lodo', 'brown_mud_02', tam=0.8, tinte=(0.16, 0.10, 0.05), fac=0.5, brillo=0.6),
    'nata': D.liso('nata', (0.80, 0.66, 0.25), 0.55),
    'agua2': D.liso('agua2', (0.12, 0.33, 0.33), 0.12),
    'particula': D.liso('particula', (0.13, 0.08, 0.03), 0.6),
    'burbuja': D.liso('burbuja', (0.95, 0.8, 0.3), 0.4),
    'bacteria': D.liso('bacteria', (0.30, 0.85, 0.18), 0.45, emit=0.25),
    'ojo': D.liso('ojo', (1, 1, 1), 0.3, emit=0.4),
    'pupila': D.liso('pupila', (0.01, 0.01, 0.01), 0.3),
    'flecha_cafe': D.liso('flecha_cafe', (0.55, 0.32, 0.1), 0.5, emit=1.2),
    'flecha_azul': D.liso('flecha_azul', (0.35, 0.75, 1.0), 0.5, emit=1.6),
    'tapa': D.liso('tapa', (0.13, 0.36, 0.18), 0.5),
    'blanco': D.liso('blanco', (0.95, 0.95, 0.95), 0.4),
    'azul': D.liso('azul', (0.1, 0.3, 0.85), 0.35),
    'rojo': D.liso('rojo', (0.85, 0.08, 0.06), 0.4),
    'naranja': D.liso('naranja', (0.95, 0.45, 0.08), 0.35, metal=0.2),
    'chasis': D.liso('chasis', (0.08, 0.08, 0.09), 0.5),
    'llanta': D.liso('llanta', (0.03, 0.03, 0.03), 0.8),
    'manguera': D.liso('manguera', (0.05, 0.05, 0.05), 0.6),
}

# ---------------- terreno con huecos fijos ----------------
Y0 = -4.0
TX0, TX1, TY1, TZ0 = -3.2, 3.2, Y0 + 3.2, -3.3      # tanque
LID0, LID1 = -0.45, -0.25                           # losa
TRINCHERAS = (6.5, 8.6, 10.7)
TRY1 = Y0 + 7.0
TRZ0 = -1.4

suelo = D.caja('suelo', -40, 40, Y0, 90, -30.0, 0.0)
suelo.data.materials.append(M['tierra'])
suelo.data.materials.append(M['pasto'])
cortes = [D.caja('hueco_tanque', TX0 - 0.1, TX1 + 0.1, Y0 - 3, TY1 + 0.1, TZ0 - 0.1, 1.0)]
for xc in TRINCHERAS:
    cortes.append(D.caja('hueco_trinchera', xc - 0.45, xc + 0.45, Y0 - 3, TRY1, TRZ0, 1.0))
for c in cortes:
    D.restar(suelo, c)
D.aplicar_mods(suelo)
D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > -0.01) else 0)

frente = D.cara_relieve('frente', -14, 16, -16.0, 0.0, Y0 - 0.001, M['tierra'], fuerza=0.32)
D.aplicar_mods(frente)
for c in cortes:
    D.restar(frente, c)
D.aplicar_mods(frente)
for a, b in ((-40, TX0 - 0.1), (TX1 + 0.1, TRINCHERAS[0] - 0.45), (TRINCHERAS[0] + 0.45, TRINCHERAS[1] - 0.45),
             (TRINCHERAS[1] + 0.45, TRINCHERAS[2] - 0.45), (TRINCHERAS[2] + 0.45, 40)):
    D.caja('pasto_borde', a, b, Y0 - 0.06, Y0 + 0.4, -0.12, 0.02, M['pasto'])

YF = Y0 - 0.15   # frente de los rellenos y piezas cortadas

# relleno del hoyo antes de cavar (tierra + tapa de pasto)
tierra_hoyo = caja_o('tierra_hoyo', TX0 - 0.1, TX1 + 0.1, YF, TY1 + 0.1, TZ0 - 0.1, 0.0, M['tierra'], (0, 0, TZ0 - 0.1))
pasto_hoyo = caja_o('pasto_hoyo', TX0 - 0.1, TX1 + 0.1, YF, TY1 + 0.1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
T_CAVA0, T_CAVA1 = 5.38, 6.6
key(pasto_hoyo, 'scale', T_CAVA0, (1, 1, 1))
key(pasto_hoyo, 'scale', T_CAVA0 + 0.12, (0, 0, 0), 'CONSTANT')
key(tierra_hoyo, 'scale', T_CAVA0, (1, 1, 1))
key(tierra_hoyo, 'scale', T_CAVA1, (1, 1, 0.01))
key(tierra_hoyo, 'scale', T_CAVA1 + 0.05, (0, 0, 0), 'CONSTANT')
monton = D.esfera if False else None
monton = esfera('monton', 1.0, M['relleno'], (-6.8, Y0 + 5.0, 0.0), sub=3)
key(monton, 'scale', T_CAVA0, (0, 0, 0))
key(monton, 'scale', T_CAVA1, (2.6, 2.2, 1.1))
key(monton, 'scale', 8.9, (2.6, 2.2, 1.1))
key(monton, 'scale', 9.4, (0, 0, 0), 'CONSTANT')

# ---------------- tanque (cortado al frente) ----------------
tanque = raiz('tanque')
W = 0.25
piezas = [
    D.caja('t_piso', TX0, TX1, YF, TY1, TZ0, TZ0 + W, M['concreto']),
    D.caja('t_izq', TX0, TX0 + W, YF, TY1, TZ0, LID0, M['concreto']),
    D.caja('t_der', TX1 - W, TX1, YF, TY1, TZ0, LID0, M['concreto']),
    D.caja('t_fondo', TX0, TX1, TY1 - W, TY1, TZ0, LID0, M['concreto']),
    D.caja('t_losa', TX0, TX1, YF, TY1, LID0, LID1, M['concreto']),
]
hijos(tanque, piezas)
DX = 0.55
divisor = raiz('divisor', (0, 0, TZ0 + W))
hijos(divisor, [D.caja('div_bajo', DX, DX + W, YF, TY1 - W, TZ0 + W, -1.9, M['concreto']),
                D.caja('div_alto', DX, DX + W, YF, TY1 - W, -1.4, LID0, M['concreto'])])
for o in divisor.children:
    o.location.z -= TZ0 + W
divisor.parent = tanque
key(divisor, 'scale', 8.3, (0, 0, 0), 'CONSTANT')
key(divisor, 'scale', 8.4, (1, 1, 0))
key(divisor, 'scale', 8.9, (1, 1, 1))
key(tanque, 'location', 6.88, (0, 0, 9.0))
key(tanque, 'location', 7.8, (0, 0, 0))
key(tanque, 'location', 7.95, (0, 0, 0.12))
key(tanque, 'location', 8.1, (0, 0, 0))
key(tanque, 'scale', 6.75, (0, 0, 0), 'CONSTANT')
key(tanque, 'scale', 6.88, (1, 1, 1))

# registros (tapas verdes) que asoman al rellenar
REG = ((-1.5, Y0 + 1.6), (1.9, Y0 + 1.6))
tapas = []
for i, (rx, ry) in enumerate(REG):
    reg = cilindro(f'registro{i}', 0.32, 0.36, 'z', M['concreto'], (rx, ry, LID1))
    tp = cilindro(f'tapa{i}', 0.36, 0.05, 'z', M['tapa'], (rx, ry, 0.05))
    pop(reg, 9.15, 0.25)
    pop(tp, 9.3, 0.25)
    tapas.append(tp)
# relleno encima de la losa
encima = caja_o('relleno_encima', TX0 - 0.1, TX1 + 0.1, YF, TY1 + 0.1, LID1, 0.0, M['relleno'], (0, 0, LID1))
pasto_encima = caja_o('pasto_encima', TX0 - 0.1, TX1 + 0.1, YF, TY1 + 0.1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
for o in (encima, pasto_encima):
    o.scale = (1, 1, 0)
key(encima, 'scale', 8.85, (0, 0, 0), 'CONSTANT')
key(encima, 'scale', 8.95, (1, 1, 0))
key(encima, 'scale', 9.35, (1, 1, 1))
key(pasto_encima, 'scale', 9.2, (0, 0, 0), 'CONSTANT')
key(pasto_encima, 'scale', 9.3, (1, 1, 0))
key(pasto_encima, 'scale', 9.5, (1, 1, 1))

# ---------------- liquidos ----------------
C1 = (TX0 + W, DX)
C2 = (DX + W, TX1 - W)
ZB = TZ0 + W
ZL = -0.95
YL0, YL1 = YF + 0.02, TY1 - W
liq1 = caja_o('liq1', C1[0], C1[1], YL0, YL1, ZB, ZL, M['negras'], (0, 0, ZB))
liq1.scale = (0, 0, 0)
key(liq1, 'scale', 10.2, (0, 0, 0), 'CONSTANT')
key(liq1, 'scale', 10.3, (1, 1, 0))
key(liq1, 'scale', 11.3, (1, 1, 1))
lodo = caja_o('lodo', C1[0], C1[1], YL0 - 0.02, YL1, ZB, -2.35, M['lodo'], (0, 0, ZB))
lodo.scale = (0, 0, 0)
key(lodo, 'scale', 12.1, (0, 0, 0), 'CONSTANT')
key(lodo, 'scale', 12.2, (1, 1, 0))
key(lodo, 'scale', 13.7, (1, 1, 1))
nata = caja_o('nata', C1[0], C1[1], YL0 - 0.02, YL1, -1.22, ZL + 0.01, M['nata'], (0, 0, ZL))
nata.scale = (0, 0, 0)
key(nata, 'scale', 14.5, (0, 0, 0), 'CONSTANT')
key(nata, 'scale', 14.6, (1, 1, 0))
key(nata, 'scale', 15.8, (1, 1, 1))
liq2 = caja_o('liq2', C2[0], C2[1], YL0, YL1, ZB, ZL, M['agua2'], (0, 0, ZB))
liq2.scale = (0, 0, 0)
key(liq2, 'scale', 22.6, (0, 0, 0), 'CONSTANT')
key(liq2, 'scale', 22.7, (1, 1, 0))
key(liq2, 'scale', 25.3, (1, 1, 1))
# vaciado (camion)
key(lodo, 'scale', 38.8, (1, 1, 1))
key(lodo, 'scale', 40.2, (1, 1, 0.15))
key(nata, 'scale', 38.8, (1, 1, 1))
key(nata, 'scale', 39.6, (0, 0, 0), 'CONSTANT')
key(liq1, 'scale', 38.8, (1, 1, 1))
key(liq1, 'scale', 40.4, (1, 1, 0.25))

# ---------------- tubos ----------------
YT = Y0 - 0.2
ZT = -0.85
entrada = cilindro('tubo_entrada', 0.14, TX0 + 15.0, 'x', M['tubo'], (-15.0, YT, ZT))
crecer(entrada, 0, 9.6, 10.35)
f_entra = flecha('flecha_entra', 1.0, M['flecha_cafe'], (-6.0, YT - 0.25, ZT), 'x')
key(f_entra, 'location', 10.2, (-6.5, YT - 0.25, ZT))
key(f_entra, 'location', 11.2, (-3.0, YT - 0.25, ZT))
pop(f_entra, 10.2, 0.2)
quitar(f_entra, 11.2, 0.2)
salida_t = cilindro('tubo_salida', 0.14, TRINCHERAS[-1] - TX1, 'x', M['tubo'], (TX1, YT, ZT))
crecer(salida_t, 0, 26.0, 26.7)
laterales, gravas = [], []
for i, xc in enumerate(TRINCHERAS):
    hueco_f = caja_o(f'trinchera_tierra{i}', xc - 0.46, xc + 0.46, YF, TRY1, TRZ0, 0.0, M['relleno'], (0, 0, TRZ0))
    hueco_p = caja_o(f'trinchera_pasto{i}', xc - 0.46, xc + 0.46, YF, TRY1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
    key(hueco_p, 'scale', 25.9, (1, 1, 1))
    key(hueco_p, 'scale', 26.0, (0, 0, 0), 'CONSTANT')
    key(hueco_f, 'scale', 25.9 + i * 0.1, (1, 1, 1))
    key(hueco_f, 'scale', 26.5 + i * 0.1, (1, 1, 0.01))
    key(hueco_f, 'scale', 26.55 + i * 0.1, (0, 0, 0), 'CONSTANT')
    lat = cilindro(f'lateral{i}', 0.13, TRY1 - YT - 0.2, 'y', M['perforado'], (xc, YT, -0.75))
    crecer(lat, 1, 26.7 + i * 0.12, 27.5 + i * 0.12)
    gr = caja_o(f'grava{i}', xc - 0.45, xc + 0.45, YF, TRY1, TRZ0, -0.6, M['grava'], (0, 0, TRZ0))
    gr.scale = (0, 0, 0)
    key(gr, 'scale', 28.4 + i * 0.1, (0, 0, 0), 'CONSTANT')
    key(gr, 'scale', 28.5 + i * 0.1, (1, 1, 0))
    key(gr, 'scale', 29.0 + i * 0.1, (1, 1, 1))
    for k in range(2):
        fa = flecha(f'gota{i}{k}', 0.9, M['flecha_azul'], (xc - 0.15 + 0.3 * k, YT - 0.3, -1.5), '-z', grosor=0.085)
        t0 = 29.4 + 0.15 * i + 0.3 * k
        pop(fa, t0, 0.2)
        key(fa, 'location', t0, (xc - 0.15 + 0.3 * k, YT - 0.3, -1.5))
        key(fa, 'location', 31.0, (xc - 0.15 + 0.3 * k, YT - 0.3, -2.6))
        quitar(fa, 31.0, 0.2)
# flecha de paso a la segunda camara
f_paso = flecha('flecha_paso', 1.1, M['flecha_azul'], (-0.2, YF - 0.2, -1.65), 'x')
pop(f_paso, 22.5, 0.2)
key(f_paso, 'location', 22.5, (-0.4, YF - 0.2, -1.65))
key(f_paso, 'location', 24.6, (0.9, YF - 0.2, -1.65))
quitar(f_paso, 24.6, 0.2)

# ---------------- particulas, burbujas, bacterias ----------------
YP = YF - 0.12
for i in range(26):
    x = random.uniform(C1[0] + 0.2, C1[1] - 0.2)
    p = esfera(f'part{i}', 0.055, M['particula'], (x, YP, random.uniform(-1.8, -1.1)))
    t0 = 11.5 + random.uniform(0, 0.4)
    pop(p, t0, 0.2, 1.0)
    key(p, 'location', t0 + 0.2, (x, YP, p.location.z))
    key(p, 'location', t0 + 1.1, (x, YP, random.uniform(-2.9, -2.45)))
    key(p, 'scale', 18.74 + random.uniform(0, 0.8), (1, 1, 1))
    key(p, 'scale', 19.9 + random.uniform(0, 0.4), (0, 0, 0), 'CONSTANT')
for i in range(10):
    x = random.uniform(C1[0] + 0.2, C1[1] - 0.2)
    b = esfera(f'burbuja{i}', 0.07, M['burbuja'], (x, YP, -1.9))
    t0 = 14.35 + random.uniform(0, 0.5)
    pop(b, t0, 0.15)
    key(b, 'location', t0, (x, YP, -1.9))
    key(b, 'location', t0 + 0.8, (x, YP, -1.12))
    quitar(b, t0 + 0.85, 0.15)

bacterias = []
for i in range(16):
    x = random.uniform(C1[0] + 0.25, C1[1] - 0.25)
    z = random.uniform(-2.9, -1.4) if i % 3 else random.uniform(-2.9, -2.4)
    r = raiz(f'bacteria{i}', (x, YP - 0.1, z))
    cuerpo = esfera(f'bac_cuerpo{i}', 0.2, M['bacteria'], (0, 0, 0), esc=(1.0, 0.55, 0.55))
    ojos = []
    for s in (-1, 1):
        ojos.append(esfera(f'bac_ojo{i}{s}', 0.055, M['ojo'], (0.07 * s + 0.04, -0.1, 0.04)))
        ojos.append(esfera(f'bac_pup{i}{s}', 0.028, M['pupila'], (0.07 * s + 0.05, -0.15, 0.04)))
    hijos(r, [cuerpo] + ojos)
    r.rotation_euler = (0, random.uniform(-0.6, 0.6), 0)
    t0 = 17.4 + i * 0.1
    pop(r, t0, 0.25, 1.15)
    rot0 = r.rotation_euler.y
    t = t0 + 0.3
    k = 0
    while t < 34.0:
        key(r, 'rotation_euler', t, (0, rot0 + (0.25 if k % 2 else -0.25), 0))
        t += 0.45 + random.uniform(0, 0.2)
        k += 1
    key(r, 'rotation_euler', 34.3, (0, rot0 + 1.4, 0))
    key(r, 'scale', 34.5 + i * 0.05, (1.15, 1.15, 1.15))
    key(r, 'scale', 35.4 + i * 0.05, (0, 0, 0), 'CONSTANT')
    bacterias.append(r)
bc = M['bacteria'].node_tree.nodes['Principled BSDF']
for sock, val_a, val_b in ((bc.inputs['Base Color'], (0.30, 0.85, 0.18, 1), (0.35, 0.33, 0.30, 1)),
                           (bc.inputs['Emission Color'], (0.30, 0.85, 0.18, 1), (0.05, 0.05, 0.05, 1))):
    sock.default_value = val_a
    sock.keyframe_insert('default_value', frame=F(33.9))
    sock.default_value = val_b
    sock.keyframe_insert('default_value', frame=F(34.4))

# cloro y toallita caen a la primera camara
cloro = raiz('cloro', (-1.0, YP - 0.15, -0.6))
cuerpo = cilindro('cloro_cuerpo', 0.16, 0.5, 'z', M['blanco'], (0, 0, 0))
etiqueta = cilindro('cloro_etiqueta', 0.165, 0.18, 'z', M['azul'], (0, 0, 0.14))
tapon = cilindro('cloro_tapon', 0.07, 0.1, 'z', M['rojo'], (0, 0, 0.5))
hijos(cloro, [cuerpo, etiqueta, tapon])
pop(cloro, 31.7, 0.2, 1.3)
key(cloro, 'location', 31.9, (-1.0, YP - 0.15, -0.65))
key(cloro, 'location', 32.6, (-1.0, YP - 0.15, -1.45))
key(cloro, 'rotation_euler', 31.9, (0, 0, 0))
key(cloro, 'rotation_euler', 32.6, (0, 0.9, 0))
toalla = D.caja('toallita', -0.3, 0.3, -0.02, 0.02, -0.22, 0.22, M['blanco'])
toalla.location = (-2.1, YP - 0.15, -0.6)
pop(toalla, 32.8, 0.2)
key(toalla, 'location', 33.0, (-2.1, YP - 0.15, -0.65))
key(toalla, 'location', 33.8, (-2.0, YP - 0.15, -1.35))
key(toalla, 'rotation_euler', 33.0, (0, 0.2, 0))
key(toalla, 'rotation_euler', 33.4, (0, -0.4, 0))
key(toalla, 'rotation_euler', 33.8, (0, 0.3, 0))
for o in (cloro, toalla):
    quitar(o, 39.4, 0.3, o.scale[0] if o.scale[0] else 1.0)

# ---------------- camion de vaciado ----------------
camion = raiz('camion', (26.0, 5.0, 0.0))
partes = [D.caja('cam_chasis', -3.0, 3.0, -0.95, 0.95, 0.55, 0.85, M['chasis']),
          D.caja('cam_cabina', -3.2, -1.5, -1.05, 1.05, 0.85, 2.7, M['blanco']),
          D.caja('cam_parabrisas', -3.25, -3.2, -0.9, 0.9, 1.8, 2.5, M['vidrio'])]
tq = cilindro('cam_tanque', 0.95, 4.2, 'x', M['naranja'], (-1.3, 0, 1.85))
partes.append(tq)
ruedas = []
for wx in (-2.4, 0.6, 2.2):
    for wy in (-1.0, 1.0):
        rd = cilindro('cam_rueda', 0.5, 0.35, 'y', M['llanta'], (wx, wy - 0.175, 0.5), verts=20)
        ruedas.append(rd)
hijos(camion, partes + ruedas)
key(camion, 'location', 36.6, (26.0, 5.0, 0.0))
key(camion, 'location', 38.1, (4.6, 5.0, 0.0))
for rd in ruedas:
    key(rd, 'rotation_euler', 36.6, (0, 0, 0))
    key(rd, 'rotation_euler', 38.1, (0, -(26.0 - 4.6) / 0.5, 0))
cv = bpy.data.curves.new('manguera', 'CURVE')
cv.dimensions = '3D'
cv.bevel_depth = 0.07
cv.bevel_resolution = 3
sp = cv.splines.new('BEZIER')
pts = [(3.4, 4.1, 1.3), (2.6, 3.0, 0.12), (0.6, 0.6, 0.1), (-1.0, -1.7, 0.14), (-1.5, -2.4, 0.35)]
sp.bezier_points.add(len(pts) - 1)
for bp, p in zip(sp.bezier_points, pts):
    bp.co = p
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
manguera = D.link(bpy.data.objects.new('manguera', cv))
manguera.data.materials.append(M['manguera'])
cv.bevel_factor_end = 0.0
cv.keyframe_insert('bevel_factor_end', frame=F(38.3))
cv.bevel_factor_end = 1.0
cv.keyframe_insert('bevel_factor_end', frame=F(38.9))
tp = tapas[0]
key(tp, 'location', 38.2, tuple(tp.location))
key(tp, 'location', 38.6, (tp.location.x - 0.8, tp.location.y - 0.3, 0.05))

# ---------------- casa, patio, utileria ----------------
HY = 10.0
D.caja('terraza', -8.0, 6.5, HY - 3.5, HY + 0.1, 0.0, 0.08, M['piso'])
for p in D.casa(M, y0=HY):
    p.location.x -= 1.0
for nombre, loc, rz, s in (
        ('outdoor_table_chair_set_01', (-4.5, HY - 1.8, 0.08), 0.3, 1.0),
        ('plastic_monobloc_chair_01', (2.2, HY - 2.4, 0.08), 2.6, 1.0),
        ('potted_plant_02', (-3.4, HY - 0.4, 0.08), 0, 1.3),
        ('planter_pot_clay', (1.6, HY - 0.4, 0.08), 0, 1.4),
        ('shrub_04', (-8.8, HY - 0.6, 0), 0, 1.6),
        ('shrub_02', (6.8, HY - 0.6, 0), 1.0, 1.7),
        ('shrub_04', (-11.0, 2.0, 0), 0.5, 1.5),
        ('garden_hose_wall_mounted_01', (4.2, HY - 0.05, 0.6), math.pi, 1.0),
):
    D.modelo(nombre, loc, rz, s)
D.caja('barda', -40, 40, 21.0, 21.15, 0, 1.8, M['zocalo'])
for i, xv in enumerate((-15.0, -11.5, 11.0, 14.5, -19.0, 19.0)):
    D.modelo('shrub_0%d' % (2, 4)[i % 2], (xv, 19.5 - (i % 2), 0), i * 0.7, 2.4)
for xv, yv, h in ((-13.0, 22.5, 7.5), (14.0, 22.5, 7.5), (-21.0, 23.0, 8.0), (22.0, 23.0, 8.0), (14.5, 9.0, 6.0)):
    D.arbol((xv, yv, 0), alto=h, semilla=int(xv))

# ---------------- camara ----------------
cam, mira = D.camara((-7, -17, 10), (0, 4, -1), lente=28)
TOMAS = [
    (0.0, (-7.0, -17.0, 10.0), (0.0, 4.0, -1.0)),
    (1.7, (-5.5, -14.5, 8.5), (0.0, 6.0, 1.0)),
    (3.3, (-4.0, -14.0, 5.5), (0.0, 2.0, -0.5)),
    (4.7, (-2.5, -15.0, 1.8), (0.0, 0.0, -1.0)),
    (9.3, (-2.0, -14.0, 1.4), (0.0, 0.0, -1.3)),
    (10.0, (-5.5, -12.0, 0.4), (-4.5, 0.0, -1.2)),
    (10.9, (-5.2, -11.6, 0.3), (-4.2, 0.0, -1.2)),
    (11.6, (-1.6, -11.0, -0.5), (-1.2, 0.0, -1.8)),
    (16.6, (-1.4, -10.4, -0.9), (-1.2, 0.0, -2.0)),
    (17.4, (-1.3, -8.6, -1.6), (-1.2, 0.0, -2.35)),
    (21.6, (-1.2, -8.2, -1.6), (-1.2, 0.0, -2.35)),
    (22.6, (0.6, -10.5, -0.9), (0.9, 0.0, -1.7)),
    (25.4, (0.8, -11.0, -0.6), (1.0, 0.0, -1.6)),
    (26.4, (1.5, -17.0, 7.5), (6.5, 2.0, -0.9)),
    (30.9, (2.5, -16.0, 6.5), (7.0, 2.5, -1.2)),
    (31.6, (-1.5, -11.0, -0.3), (-1.2, 0.0, -1.5)),
    (36.2, (-1.4, -10.0, -1.0), (-1.2, 0.0, -2.0)),
    (37.0, (-2.0, -19.0, 8.0), (4.0, 3.0, 0.0)),
    (38.4, (-2.5, -16.0, 6.0), (1.5, 2.0, -0.5)),
    (40.0, (-2.5, -15.5, 4.6), (1.0, 1.0, -0.6)),
    (DUR, (-2.3, -14.6, 4.2), (1.0, 1.0, -0.7)),
]
for t, loc, la in TOMAS:
    key(cam, 'location', t, loc)
    key(mira, 'location', t, la)

D.luz_dia('nishita', fuerza_cielo=0.35, sol=4.0, az=-40, el=45)
D.eevee(int(opt.get('--ancho', 720)), int(opt.get('--muestras', 6)))
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, F(DUR) - 1
sc.render.image_settings.file_format = 'PNG'
sc.render.use_overwrite = False
sc.render.use_placeholder = True

if '--stills' in opt:
    for t in opt['--stills'].split(','):
        sc.frame_set(F(float(t)))
        sc.render.filepath = os.path.join(salida, f's_{float(t):05.1f}.png')
        bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = os.path.join(salida, 'f_')
    bpy.ops.render.render(animation=True)
print('LISTO')
