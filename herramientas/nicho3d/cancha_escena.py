"""15 — Cancha de basquet bajo el pasto. Audio: .tmp_render/lote/c15_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(15)
DUR = 37.0
TC = 4.3
M = B.materiales()
M.update({
    'parquet': D.pbr('parquet', 'brown_planks_05', tam=1.0, tinte=(0.8, 0.45, 0.15), fac=0.9, brillo=1.2),
    'linea': D.liso('linea', (0.95, 0.95, 0.95), 0.4),
    'aro': D.liso('aro', (1.0, 0.35, 0.05), 0.35, metal=0.5),
    'tablero': D.liso('tablero', (0.95, 0.95, 0.97), 0.2),
    'pelota': D.liso('pelota', (0.95, 0.42, 0.08), 0.5),
    'viga': D.liso('viga', (0.75, 0.2, 0.12), 0.35, metal=0.7),
    'claraboya': D.liso('claraboya', (0.7, 0.88, 0.95), 0.05),
    'luz_cono': D.liso('luz_cono', (1.0, 0.95, 0.8), 0.4, emit=0.8),
    'ducto': D.liso('ducto', (0.75, 0.77, 0.8), 0.3, metal=0.8),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'camisa': D.liso('camisa', (0.2, 0.45, 0.85), 0.7),
    'pantalon': D.liso('pantalon', (0.15, 0.15, 0.2), 0.7),
})
for nm, a in (('claraboya', 0.35), ('luz_cono', 0.035)):
    mm = M[nm]
    mm.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = a
    mm.surface_render_method = 'BLENDED'

X0, X1 = -8.0, 8.0
L = Y0 + 28.0
PISO, TECHO = -7.0, -1.2
W = 0.4
B.terreno(M, [(X0 - W, X1 + W, L + W, PISO - W - 0.1)])
B.relleno_hoyo(M, X0 - W, X1 + W, L + W, PISO - W - 0.1, TC, 4.82, 6.6)
B.monton(M, (13.0, 6.0, 0.0), 4.82, 6.6, t_fin=8.6, esc=(3.5, 3.0, 1.8))
B.medida('m7', X1 + W + 1.0, 0.0, PISO, '7 m', M, 5.74, 7.3, lado=1)
largo = D.caja('linea_30', X0 - 1.5, X0 - 1.35, Y0, L, 0.15, 0.25, M['medida'])
B.origen(largo, (X0 - 1.4, Y0, 0.15))
t30 = B.texto('t30', '30 m', M['medida'], (X0 - 2.6, Y0 + 9.0, 1.2), tam=1.8, rot=(math.radians(60), 0, 0))
for o in (largo, t30):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, 7.44, 0.35)
    quitar(o, 8.7, 0.2)

# muros, techo de concreto + tierra + pasto
for nombre, x0, x1, y0, y1, z0, z1 in (('izq', X0 - W, X0, YF, L + W, PISO - W, TECHO), ('der', X1, X1 + W, YF, L + W, PISO - W, TECHO),
                                       ('fondo', X0 - W, X1 + W, L, L + W, PISO - W, TECHO), ('base', X0 - W, X1 + W, YF, L + W, PISO - W, PISO)):
    o = B.caja_o('muro_' + nombre, x0, x1, y0, y1, z0, z1, M['concreto'], (0, 0, PISO - W))
    gancho(o, TC)
    crecer(o, 2, 7.9, 8.7)
losa = B.caja_o('losa', X0 - W, X1 + W, YF, L + W, TECHO, TECHO + 0.3, M['concreto'], (0, 0, TECHO))
gancho(losa, TC)
crecer(losa, 2, 10.6, 10.9)
tierra = B.tapar(M, [(X0 - W, X1 + W, L + W, TECHO + 0.3)], 11.3, gancho_hasta=TC)

# gente caminando arriba y cargas
def persona(nombre, loc, mat='camisa'):
    r = B.raiz(nombre, loc)
    B.hijos(r, [B.cilindro('torso', 0.2, 0.62, 'z', M[mat], (0, 0, 0.8)), B.esfera('cabeza', 0.17, M['piel'], (0, 0, 1.6)),
                B.cilindro('piernas', 0.16, 0.8, 'z', M['pantalon'], (0, 0, 0))])
    return r


for i in range(4):
    p = persona(f'gente{i}', (-5.0 + 3.2 * i, Y0 + 2.0 + 2.5 * (i % 2), 0.02))
    key(p, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(p, 12.9 + 0.1 * i, 0.25)
    key(p, 'location', 13.0, (-5.0 + 3.2 * i, Y0 + 2.0 + 2.5 * (i % 2), 0.02))
    key(p, 'location', 15.6, (-5.0 + 3.2 * i + 1.2, Y0 + 2.0 + 2.5 * (i % 2), 0.02))
    quitar(p, 15.8, 0.2)
for k in range(5):
    B.flujo(f'carga{k}', M['flecha_roja'], (-6.0 + 3.0 * k, YF - 0.5, 2.6), (-6.0 + 3.0 * k, YF - 0.5, 0.4), '-z', 11.4 + 0.08 * k,
            13.9 + 0.08 * k, n=2, largo=0.9, grosor=0.1, sep=0.8)
# columnas tachadas
cols = []
for k, x in enumerate((-3.0, 3.0)):
    c = D.caja(f'columna{k}', x - 0.35, x + 0.35, YF + 4.0, YF + 4.7, PISO, TECHO, M['concreto'])
    B.origen(c, (x, YF + 4.35, PISO))
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(c, 14.5 + 0.1 * k, 0.25)
    quitar(c, 15.5, 0.25)
    cols.append(c)
cruz = B.raiz('cruz', (0, YF - 0.6, (PISO + TECHO) / 2))
for a in (0.785, -0.785):
    bb = D.caja('cruz', -2.0, 2.0, -0.05, 0.05, -0.15, 0.15, M['flecha_roja'])
    bb.rotation_euler = (0, a, 0)
    bb.parent = cruz
key(cruz, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(cruz, 15.1, 0.25)
quitar(cruz, 15.75, 0.2)

# vigas de acero de pared a pared
vigas = []
for k in range(10):
    y = YF + 0.6 + 2.9 * k
    v = D.caja(f'viga{k}', X0, X1, y - 0.18, y + 0.18, TECHO - 0.9, TECHO, M['viga'])
    B.origen(v, (X0, y, TECHO))
    gancho(v, TC)
    crecer(v, 0, 16.6 + 0.2 * k, 17.2 + 0.2 * k)
    vigas.append(v)

# claraboyas entre las plantas + conos de luz
claras = []
for k, (x, y) in enumerate(((-4.0, Y0 + 7.0), (4.0, Y0 + 7.0), (-4.0, Y0 + 16.0), (4.0, Y0 + 16.0))):
    c = D.caja(f'claraboya{k}', x - 0.9, x + 0.9, y - 0.9, y + 0.9, -0.05, 0.25, M['claraboya'])
    B.origen(c, (x, y, 0.0))
    gancho(c, TC)
    pop(c, 21.5 + 0.1 * k, 0.3)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.2, radius2=1.2, depth=-PISO, location=(x, y, PISO / 2), rotation=(0, 0, math.pi / 4))
    cono = bpy.context.object
    cono.data.materials.append(M['luz_cono'])
    key(cono, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(cono, 'scale', TC, (0, 0, 0), 'CONSTANT')
    key(cono, 'scale', 21.9, (0, 0, 0), 'CONSTANT')
    key(cono, 'scale', 22.0, (0.2, 0.2, 1))
    key(cono, 'scale', 22.6, (1, 1, 1))
    for j, (dx, dy) in enumerate(((1.6, 0.0), (-1.6, 0.3), (0.2, 1.6))):
        s = D.modelo('shrub_0%d' % (2, 4)[j % 2], (x + dx, y + dy, 0.0), j, 1.2)
        gancho(s, TC)
        pop(s, 23.2 + 0.05 * (k * 3 + j), 0.3, 1.2)

# ventilacion
ducto = D.caja('ducto', X1 - 1.4, X1 - 0.6, YF, L, TECHO - 0.75, TECHO - 0.15, M['ducto'])
B.origen(ducto, (X1 - 1.0, YF, TECHO - 0.45))
gancho(ducto, TC)
crecer(ducto, 1, 24.86, 25.4)
toma = B.cilindro('toma_aire', 0.3, 2.0, 'z', M['ducto'], (X1 - 1.0, Y0 + 3.0, -1.4))
gorro = B.esfera('gorro', 0.6, M['ducto'], (X1 - 1.0, Y0 + 3.0, 0.65), esc=(1, 1, 0.45))
for o in (toma, gorro):
    gancho(o, TC)
    pop(o, 24.9, 0.3, tuple(o.scale) if o is gorro else 1.0)
gorro.scale = (1, 1, 0.45)
B.flujo('aire', M['flecha_azul'], (X1 - 1.0, YF - 0.5, 2.2), (X1 - 1.0, YF - 0.5, TECHO - 0.5), '-z', 25.3, 26.2, n=2, largo=0.8)
B.flujo('aire2', M['flecha_azul'], (X1 - 2.0, YF - 0.5, TECHO - 1.2), (2.0, YF - 0.5, TECHO - 1.2), '-x', 25.9, 27.2, n=3, largo=0.9)

# piso de madera, lineas, aros
piso = B.caja_o('parquet', X0, X1, YF, L, PISO, PISO + 0.06, M['parquet'], (0, YF, PISO))
gancho(piso, TC)
crecer(piso, 1, 28.5, 29.2)
lineas = [D.caja('l_centro', X0 + 0.5, X1 - 0.5, (YF + L) / 2 - 0.05, (YF + L) / 2 + 0.05, PISO + 0.06, PISO + 0.075, M['linea']),
          D.caja('l_izq', X0 + 0.5, X0 + 0.6, YF + 0.5, L - 0.5, PISO + 0.06, PISO + 0.075, M['linea']),
          D.caja('l_der', X1 - 0.6, X1 - 0.5, YF + 0.5, L - 0.5, PISO + 0.06, PISO + 0.075, M['linea']),
          D.caja('l_fondo', X0 + 0.5, X1 - 0.5, L - 0.6, L - 0.5, PISO + 0.06, PISO + 0.075, M['linea'])]
bpy.ops.mesh.primitive_torus_add(major_radius=1.8, minor_radius=0.05, location=(0, (YF + L) / 2, PISO + 0.07))
circ = bpy.context.object
circ.scale = (1, 1, 0.1)
circ.data.materials.append(M['linea'])
lineas.append(circ)
for o in lineas:
    gancho(o, TC)
    pop(o, 30.38, 0.3, tuple(o.scale) if o is circ else 1.0)
aros = []
for k, (y, s) in enumerate(((L - 1.2, -1),)):
    r = B.raiz(f'aro{k}', (0, y, PISO))
    B.hijos(r, [B.cilindro('poste', 0.1, 3.6, 'z', M['acero'], (0, -s * 0.9, 0)),
                D.caja('brazo', -0.06, 0.06, -s * 0.9 if s < 0 else 0.0, 0.0 if s < 0 else -0.9 * s, 3.4, 3.5, M['acero']),
                D.caja('tablero', -0.9, 0.9, -0.03, 0.03, 2.9, 4.0, M['tablero'])])
    bpy.ops.mesh.primitive_torus_add(major_radius=0.23, minor_radius=0.025, location=(0, s * 0.3, 3.05))
    aro = bpy.context.object
    aro.data.materials.append(M['aro'])
    aro.parent = r
    gancho(r, TC)
    pop(r, 30.7 + 0.1 * k, 0.3)
    aros.append(r)

# pelota: rebota en el gancho; tiro fallado al final
pel = B.esfera('pelota', 0.25, M['pelota'], (0, Y0 + 12.0, PISO + 0.25))
key(pel, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
for k in range(9):
    key(pel, 'location', 0.3 * k, (0.6 * math.sin(k), Y0 + 12.0, PISO + (1.2 if k % 2 else 0.25)))
key(pel, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(pel, 'scale', 31.6, (1, 1, 1), 'CONSTANT')
TIRO = [(31.6, (0.3, Y0 + 19.0, PISO + 1.9)), (32.3, (0.2, Y0 + 22.0, PISO + 5.2)), (33.0, (0.25, L - 1.15, PISO + 3.6)),
        (33.5, (0.4, L - 2.5, PISO + 2.0)), (33.95, (0.3, L - 3.6, PISO + 0.25)), (34.4, (0.0, L - 5.0, PISO + 1.4)),
        (34.9, (-0.2, L - 6.5, PISO + 0.25)), (35.3, (-0.3, L - 7.5, PISO + 0.6)), (35.7, (-0.4, L - 8.6, PISO + 0.25)),
        (DUR, (-0.6, L - 12.0, PISO + 0.25))]
for t, p in TIRO:
    key(pel, 'location', t, p)
jugador = persona('jugador', (0.3, Y0 + 18.4, PISO + 0.06))
key(jugador, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(jugador, 31.4, 0.25)

B.casa_patio(M, HX=-3.0, HY=Y0 + 34.0)

TOMAS = [
    (0.0, (-6.0, -19.0, 7.5), (0.0, 6.0, 0.0)),
    (1.7, (-3.5, -17.0, 1.5), (0.0, 6.0, -2.8)),
    (4.25, (-2.0, -15.0, -2.5), (0.0, 8.0, -4.5), 'CORTE'),
    (4.3, (-4.0, -27.0, 6.0), (0.0, 4.0, -2.5)),
    (8.6, (-4.0, -26.0, 5.5), (0.0, 4.0, -2.8)),
    (8.8, (-6.0, -23.0, 5.0), (0.0, 6.0, -0.6)),
    (15.6, (-5.0, -22.0, 4.5), (0.0, 6.0, -1.5)),
    (15.9, (0.0, -17.0, -3.0), (0.0, 8.0, -2.6)),
    (19.8, (0.0, -16.5, -3.2), (0.0, 8.0, -2.8)),
    (20.0, (4.5, -18.0, 3.0), (2.0, 7.0, -2.0)),
    (27.6, (3.5, -17.0, 2.5), (1.5, 7.0, -2.0)),
    (27.8, (0.0, -15.0, -4.6), (0.0, 9.0, -6.0)),
    (31.3, (0.0, -14.5, -4.8), (0.0, 9.0, -6.0)),
    (31.5, (2.6, Y0 + 11.0, -4.2), (0.0, L - 1.5, -3.8)),
    (34.0, (2.2, Y0 + 12.0, -4.6), (0.0, L - 4.0, -5.0)),
    (DUR, (1.6, Y0 + 13.0, -5.0), (-0.5, L - 9.0, -6.2)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
