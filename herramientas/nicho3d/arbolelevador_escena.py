"""14 — Casa del arbol con elevador. Audio: .tmp_render/lote/c14_limpio.m4a."""
import math
import os
import random
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(14)
DUR = 39.0
TC = 6.3
M = B.materiales()
M.update({
    'corteza': D.pbr('corteza_g', 'bark_willow', tam=1.0, tinte=(0.32, 0.23, 0.15), fac=0.35),
    'raiz': D.liso('raiz', (0.32, 0.22, 0.13), 0.8),
    'hojas': D.pbr('hojas_g', 'forest_leaves_02', tam=1.5, tinte=(0.12, 0.33, 0.05), fac=0.55, normal=1.5),
    'tabla': D.pbr('tabla_casa', 'brown_planks_05', tam=1.2, tinte=(0.6, 0.42, 0.26), fac=0.35, brillo=1.4),
    'cama': D.liso('cama', (0.25, 0.4, 0.75), 0.8),
    'almohada': D.liso('almohada', (0.95, 0.95, 0.92), 0.8),
    'cabina': D.liso('cabina', (0.7, 0.85, 0.95), 0.05),
    'perno': D.liso('perno', (0.75, 0.77, 0.8), 0.2, metal=1.0),
    'ok': D.liso('ok', (0.3, 1.0, 0.3), 0.4, emit=2.5),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'camisa': D.liso('camisa', (0.9, 0.5, 0.1), 0.7),
    'pantalon': D.liso('pantalon', (0.15, 0.15, 0.2), 0.7),
    'lampara': D.liso('lampara', (1.0, 0.85, 0.5), 0.3, emit=0.0),
})
cab = M['cabina']
cab.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.35
cab.surface_render_method = 'BLENDED'

TY = Y0 + 2.2            # tronco
ZC = 8.0                 # piso de la casa
HX, HY0, HY1 = 2.6, Y0 + 0.2, Y0 + 4.4
EX, EY = 5.2, Y0 + 2.2   # poste del elevador

B.terreno(M, [])
# raices en el corte
for k in range(7):
    a = -1.2 + 0.4 * k
    pts = [(0.25 * math.sin(a), YF - 0.25, -0.1), (1.4 * math.sin(a), YF - 0.25, -0.9 - 0.3 * (k % 3)),
           (3.0 * math.sin(a), YF - 0.25, -1.8 - 0.4 * (k % 2))]
    r = B.curva(f'raiz{k}', pts, M['raiz'], 0.16 - 0.01 * (k % 3))
    for bp in r.data.splines[0].bezier_points:
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    r.data.bevel_factor_mapping_end = 'SPLINE'

# tronco y copa
bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.75, radius2=0.42, depth=15.0, location=(0, TY, 7.3))
tronco = bpy.context.object
tronco.data.materials.append(M['corteza'])
for p in tronco.data.polygons:
    p.use_smooth = True
B.origen(tronco, (0, TY, -0.2))
copa = B.raiz('copa', (0, TY, 11.0))
nube = bpy.data.textures.new('copa_ruido', 'CLOUDS')
nube.noise_scale = 0.8
random.seed(14)
for k in range(9):
    a = 2 * math.pi * k / 9
    rr = random.uniform(2.4, 3.3)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=rr, location=(3.3 * math.cos(a), 2.6 * math.sin(a) + 1.0, 4.0 + random.uniform(-0.6, 1.8)))
    c = bpy.context.object
    d = c.modifiers.new('d', 'DISPLACE')
    d.texture = nube
    d.strength = rr * 0.35
    c.data.materials.append(M['hojas'])
    for p in c.data.polygons:
        p.use_smooth = True
    c.parent = copa
for k, t in enumerate([31.9 + 0.45 * j for j in range(7)]):
    key(copa, 'rotation_euler', t, (0.03 * (1 if k % 2 else -1), 0.02 * (1 if k % 2 else -1), 0))
key(copa, 'rotation_euler', 35.2, (0, 0, 0))
B.medida('m8', -4.2, ZC, 0.0, '8 m', M, 1.25, 3.4, lado=-1)

# casa: plataforma, paredes (cortada al frente), techo, cama, balcon
casa = B.raiz('casa', (0, TY, ZC))
def C(nombre, x0, x1, y0, y1, z0, z1, m):
    o = D.caja(nombre, x0, x1, y0 - TY, y1 - TY, z0, z1, m)
    o.parent = casa
    return o
plataforma = C('plataforma', -HX - 0.3, HX + 0.3, HY0 - 1.0, HY1 + 0.3, -0.3, 0.0, M['tabla'])
paredes = [C('pared_fondo', -HX, HX, HY1 - 0.15, HY1, 0.0, 2.6, M['tabla']),
           C('pared_izq', -HX, -HX + 0.15, HY0, HY1, 0.0, 2.6, M['tabla']),
           C('pared_der', HX - 0.15, HX, HY0, HY1, 0.0, 2.6, M['tabla'])]
ventanas = [C('ventana', -1.6, -0.3, HY1 - 0.17, HY1 - 0.13, 0.9, 2.0, M['vidrio']),
            C('ventana', 0.6, 1.9, HY1 - 0.17, HY1 - 0.13, 0.9, 2.0, M['vidrio']),
            C('ventana', -HX - 0.02, -HX + 0.17, HY0 + 0.8, HY0 + 2.2, 0.9, 2.0, M['vidrio']),
            C('ventana', HX - 0.17, HX + 0.02, HY0 + 1.5, HY0 + 2.9, 0.9, 2.0, M['vidrio'])]
me = bpy.data.meshes.new('techo_casa')
bm = bmesh.new()
pts = [(-HX - 0.4, HY0 - 0.3 - TY, 2.6), (HX + 0.4, HY0 - 0.3 - TY, 2.6), (HX + 0.4, HY1 + 0.4 - TY, 2.6), (-HX - 0.4, HY1 + 0.4 - TY, 2.6),
       (-HX - 0.4, (HY0 + HY1) / 2 - TY, 4.0), (HX + 0.4, (HY0 + HY1) / 2 - TY, 4.0)]
vs = [bm.verts.new(p) for p in pts]
for f in ((0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
    bm.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()
techo = D.link(bpy.data.objects.new('techo_casa', me))
techo.data.materials.append(M['teja'])
techo.parent = casa
cama = [C('cama', -HX + 0.2, -HX + 2.0, HY1 - 1.2, HY1 - 0.2, 0.0, 0.45, M['madera']),
        C('colchon', -HX + 0.25, -HX + 1.95, HY1 - 1.15, HY1 - 0.25, 0.45, 0.65, M['cama']),
        C('almohada', -HX + 0.3, -HX + 0.8, HY1 - 1.0, HY1 - 0.4, 0.65, 0.78, M['almohada'])]
lampara = C('lampara', 0.9, 1.2, HY1 - 0.6, HY1 - 0.3, 1.6, 1.9, M['lampara'])
baranda = [C('baranda', -HX - 0.3, HX + 0.3, HY0 - 1.0, HY0 - 0.92, 0.92, 1.02, M['madera'])] + \
          [C('balaustre', x - 0.03, x + 0.03, HY0 - 1.0, HY0 - 0.94, 0.0, 1.0, M['madera']) for x in [-HX + 0.4 * k for k in range(14)]]
# paredes y techo cortados: se ve adentro
key(casa, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
for grupo, t in ((paredes + [techo], 26.3), (cama, 27.52), (ventanas, 28.22), (baranda, 29.94), ([lampara], 27.6)):
    for o in grupo:
        B.origen(o, tuple(o.matrix_world.translation - casa.matrix_world.translation) if False else (0, 0, 0))
        gancho(o, TC)
        pop(o, t, 0.3)
gancho(plataforma, TC)
pop(plataforma, 18.44, 0.35)
eL = M['lampara'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((0.0, 4.0), (36.2, 4.0), (36.3, 0.0)):
    B.key_valor(eL, t, v)
for k, t in enumerate([31.9 + 0.45 * j for j in range(7)]):
    key(casa, 'rotation_euler', t, (0.015 * (1 if k % 2 else -1), 0.02 * (1 if k % 2 else -1), 0))
key(casa, 'rotation_euler', 35.2, (0, 0, 0))

# brazos de acero en diagonal
brazos = []
for sx in (-1, 1):
    for sy in (-1, 1):
        x1, y1 = sx * (HX - 0.3), (HY0 - 0.6 if sy < 0 else HY1) - TY
        b = B.curva(f'brazo{sx}{sy}', [(0.45 * sx, 0.4 * sy, -2.8), (x1, y1, -0.3)], M['acero'], 0.08)
        b.parent = casa
        b.data.bevel_factor_end = 1.0
        key(b, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
        key(b, 'scale', TC, (0, 0, 0), 'CONSTANT')
        key(b, 'scale', 19.05, (1, 1, 1), 'CONSTANT')
        B.trazar(b, 19.1 + 0.12 * (sx + 1 + (sy + 1) / 2), 19.6 + 0.12 * (sx + 1 + (sy + 1) / 2))
        brazos.append(b)
for sx in (-1, 1):
    B.flujo(f'peso{sx}', M['flecha_roja'], (sx * 2.2, YF - 0.4, ZC - 0.2), (sx * 0.8, YF - 0.4, ZC - 2.4), '-z', 20.5, 21.5, n=2, largo=0.7)

# pernos de acero (y un clavo tachado)
pernos = []
for k, z in enumerate((ZC - 0.5, ZC - 0.9, ZC - 1.3)):
    p = B.raiz(f'perno{k}', (0, YF + 0.6, z))
    B.hijos(p, [B.cilindro('vastago', 0.07, 1.2, 'y', M['perno'], (0, -0.3, 0), verts=12),
                B.cilindro('cabeza', 0.16, 0.12, 'y', M['perno'], (0, -0.42, 0), verts=6)])
    gancho(p, TC)
    pop(p, 14.36 + 0.15 * k, 0.25)
    pernos.append(p)
clavo = B.raiz('clavo', (-0.9, YF - 0.3, ZC - 0.6))
B.hijos(clavo, [B.cilindro('clavo_v', 0.03, 0.9, 'x', M['acero_claro'], (-0.45, 0, 0), verts=8),
                B.cilindro('clavo_c', 0.09, 0.05, 'x', M['acero_claro'], (-0.5, 0, 0), verts=12)])
cruz = B.raiz('cruz', (-1.35, YF - 0.45, ZC - 0.6))
for a in (0.785, -0.785):
    bb = D.caja('cruz', -0.6, 0.6, -0.03, 0.03, -0.05, 0.05, M['flecha_roja'])
    bb.rotation_euler = (0, a, 0)
    bb.parent = cruz
for o, t in ((clavo, 12.8), (cruz, 13.2)):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, t, 0.25)
    quitar(o, 13.9, 0.2)
key(tronco, 'scale', 16.2, (1, 1, 1))
key(tronco, 'scale', 17.0, (1.12, 1.12, 1))
key(tronco, 'scale', 18.0, (1.12, 1.12, 1))
key(tronco, 'scale', 18.4, (1, 1, 1))

# experto que revisa el arbol
def persona(nombre, loc):
    r = B.raiz(nombre, loc)
    B.hijos(r, [B.cilindro('torso', 0.2, 0.62, 'z', M['camisa'], (0, 0, 0.8)), B.esfera('cabeza', 0.17, M['piel'], (0, 0, 1.6)),
                B.cilindro('piernas', 0.16, 0.8, 'z', M['pantalon'], (0, 0, 0))])
    return r


experto = persona('experto', (-1.6, YF + 0.8, 0.0))
key(experto, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(experto, 6.95, 0.3)
quitar(experto, 10.9, 0.2)
ok = B.texto('ok', 'OK', M['ok'], (-1.6, YF - 0.2, 2.6), tam=1.5)
key(ok, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(ok, 8.62, 0.3)
quitar(ok, 10.9, 0.2)
B.flujo('toneladas', M['flecha_roja'], (0.0, YF - 0.6, ZC + 3.5), (0.0, YF - 0.6, ZC + 0.4), '-z', 9.6, 10.7, n=3, largo=0.9, grosor=0.12)

# elevador: poste, riel, cabina, puente
poste = B.cilindro('poste_elev', 0.16, ZC + 3.0, 'z', M['acero'], (EX + 0.8, EY, 0.0))
riel = D.caja('riel', EX + 0.55, EX + 0.62, EY - 0.3, EY + 0.3, 0.0, ZC + 2.8, M['acero_claro'])
for o in (poste, riel):
    gancho(o, TC)
    crecer(o, 2, 22.6, 23.3)
cabina = B.raiz('cabina', (EX, EY, 0.0))
B.hijos(cabina, [D.caja('cab_piso', -0.55, 0.55, -0.6, 0.6, 0.0, 0.08, M['acero']),
                 D.caja('cab_techo', -0.55, 0.55, -0.6, 0.6, 2.15, 2.25, M['acero']),
                 D.caja('cab_vidrio', -0.53, 0.53, -0.58, 0.58, 0.08, 2.15, M['cabina'])])
pasajero = persona('pasajero', (0, 0, 0.08))
pasajero.parent = cabina
SUBE = [(0.0, 0.0), (5.1, 0.0), (6.2, ZC), (6.25, 0.0, 'C'), (23.7, 0.0), (25.4, ZC), (35.6, ZC), (36.2, 4.0), (DUR, 4.0)]
for e in SUBE:
    key(cabina, 'location', e[0], (EX, EY, e[1]), 'CONSTANT' if len(e) > 2 else 'BEZIER')
key(cabina, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(cabina, 'scale', TC, (0, 0, 0), 'CONSTANT')
pop(cabina, 22.8, 0.3)
key(pasajero, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(pasajero, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(pasajero, 'scale', 35.0, (1, 1, 1), 'CONSTANT')
puente = D.caja('puente', HX + 0.3, EX - 0.55, EY - 0.5, EY + 0.5, ZC - 0.25, ZC, M['tabla'])
gancho(puente, TC)
pop(puente, 25.9, 0.3)
escalera = B.raiz('escalera', (1.6, YF + 0.5, 0.0))
B.hijos(escalera, [D.caja('lado', -0.3, -0.25, -0.03, 0.03, 0, 7.6, M['madera']), D.caja('lado', 0.25, 0.3, -0.03, 0.03, 0, 7.6, M['madera'])]
        + [D.caja('peld', -0.25, 0.25, -0.03, 0.03, z, z + 0.05, M['madera']) for z in [0.4 + 0.4 * k for k in range(18)]])
escalera.rotation_euler = (-0.12, 0, 0)
key(escalera, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(escalera, 37.9, 0.35)
# viento
for k in range(3):
    B.flujo(f'viento{k}', M['flecha_gris'], (-9.0, YF - 0.6, 7.5 + 1.2 * k), (4.0, YF - 0.6, 7.5 + 1.2 * k), 'x', 31.6 + 0.2 * k, 33.6 + 0.2 * k,
            n=2, largo=1.4, grosor=0.12, sep=0.7)

B.casa_patio(M, HX=-3.0, HY=16.0, arboles=((-16.0, 28.0, 7.5), (14.0, 28.0, 7.5), (-22.0, 29.0, 8.0)))

TOMAS = [
    (0.0, (2.5, -10.5, 1.4), (0.5, 2.0, 7.0)),
    (3.6, (6.0, -13.0, 4.0), (3.0, 2.0, 6.0)),
    (6.25, (6.2, -13.5, 4.5), (3.0, 2.0, 6.5), 'CORTE'),
    (6.3, (0.0, -21.0, 7.5), (0.0, 2.0, 6.0)),
    (10.9, (0.0, -20.0, 7.0), (0.0, 2.0, 6.0)),
    (11.1, (1.6, -8.5, 7.8), (0.0, 1.8, 7.4)),
    (17.6, (1.3, -9.0, 7.9), (0.0, 1.8, 7.4)),
    (17.9, (2.5, -15.0, 6.0), (0.0, 2.0, 6.8)),
    (21.6, (2.0, -14.5, 6.0), (0.0, 2.0, 6.8)),
    (21.8, (9.0, -14.0, 5.0), (4.5, 2.0, 5.0)),
    (26.3, (8.0, -13.5, 8.0), (3.5, 2.0, 8.5)),
    (26.6, (0.0, -9.5, 9.6), (0.0, 2.0, 9.2)),
    (31.2, (0.5, -10.0, 9.8), (0.0, 2.0, 9.2)),
    (31.4, (-3.0, -18.0, 8.5), (0.0, 2.0, 9.0)),
    (34.9, (-2.5, -17.0, 8.0), (0.0, 2.0, 8.8)),
    (35.1, (7.5, -12.0, 4.8), (4.8, 2.0, 4.8)),
    (DUR, (6.5, -12.5, 4.2), (3.0, 2.0, 4.5)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e in ((0.0, 4.0), (36.2, 4.0), (36.4, 1.6)):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
B.terminar(opt, salida, DUR)
