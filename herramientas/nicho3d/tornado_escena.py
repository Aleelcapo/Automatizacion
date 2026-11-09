"""12 — Refugio contra tornados bajo el garaje. Audio: .tmp_render/lote/c12_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(12)
DUR = 39.4
TC = 6.0
M = B.materiales()
M.update({
    'blindado': D.liso('blindado', (0.42, 0.45, 0.48), 0.35, metal=0.8),
    'sirena': D.liso('sirena', (1.0, 0.1, 0.05), 0.3, emit=0.0),
    'tornado': D.liso('tornado', (0.42, 0.42, 0.45), 0.9),
    'auto': D.liso('auto', (0.1, 0.35, 0.8), 0.2, metal=0.3),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'camisa1': D.liso('camisa1', (0.85, 0.3, 0.15), 0.7),
    'camisa2': D.liso('camisa2', (0.2, 0.6, 0.3), 0.7),
    'camisa3': D.liso('camisa3', (0.9, 0.75, 0.1), 0.7),
    'pantalon': D.liso('pantalon', (0.15, 0.15, 0.2), 0.7),
    'ropero': D.liso('ropero', (0.55, 0.36, 0.2), 0.6),
    'tabla': D.liso('tabla', (0.75, 0.55, 0.3), 0.7),
})
tor = M['tornado']
tor.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.88
tor.surface_render_method = 'BLENDED'

GX, GY1 = 3.6, Y0 + 6.5          # garaje
SX, SY1, SZ0, SZ1 = 1.2, Y0 + 2.2, -2.4, -0.25   # refugio
PUERTA = (-0.6, 0.6)

B.terreno(M, [(-SX - 0.1, SX + 0.1, SY1 + 0.1, SZ0 - 0.1)])
B.relleno_hoyo(M, -SX - 0.1, SX + 0.1, SY1 + 0.1, SZ0 - 0.1, TC, 9.45, 10.4)

# garaje: losa con hueco para la puerta, paredes, techo
losa_piezas = [D.caja('losa', -GX, -SX - 0.1, YF, GY1, -0.2, 0.02, M['concreto']),
               D.caja('losa', SX + 0.1, GX, YF, GY1, -0.2, 0.02, M['concreto']),
               D.caja('losa', -SX - 0.1, SX + 0.1, SY1 + 0.1, GY1, -0.2, 0.02, M['concreto'])]
tapa_losa = D.caja('losa_hueco', -SX - 0.1, SX + 0.1, YF, SY1 + 0.1, -0.2, 0.02, M['concreto'])
key(tapa_losa, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(tapa_losa, 'scale', TC, (1, 1, 1), 'CONSTANT')
key(tapa_losa, 'scale', 9.4, (0, 0, 0), 'CONSTANT')
D.caja('pared_fondo', -GX, GX, GY1 - 0.2, GY1, 0.0, 2.8, M['muro'])
D.caja('pared_izq', -GX - 0.2, -GX, YF, GY1, 0.0, 2.8, M['muro'])
techo = B.raiz('techo_garaje', (0, (YF + GY1) / 2, 2.9))
B.hijos(techo, [D.caja('techo', -GX - 0.4, GX + 0.4, YF - (YF + GY1) / 2 - 0.3, GY1 - (YF + GY1) / 2 + 0.3, -0.1, 0.15, M['teja'])])
key(techo, 'location', 24.06, (0, (YF + GY1) / 2, 2.9))
key(techo, 'rotation_euler', 24.06, (0, 0, 0))
key(techo, 'location', 25.3, (9.0, (YF + GY1) / 2 + 4.0, 12.0))
key(techo, 'rotation_euler', 25.3, (0.8, -1.2, 0.6))
quitar(techo, 25.35, 0.2)
key(techo, 'location', 26.85, (0, (YF + GY1) / 2, 2.9), 'CONSTANT')
key(techo, 'rotation_euler', 26.85, (0, 0, 0), 'CONSTANT')
pop(techo, 26.9, 0.3)
sirena = B.esfera('sirena', 0.22, M['sirena'], (-GX - 0.3, YF + 0.6, 2.4))
eS = M['sirena'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for k in range(12):
    B.key_valor(eS, 0.0 + 0.25 * k, 8.0 if k % 2 == 0 else 0.0, 'CONSTANT')
B.key_valor(eS, 3.0, 0.0)

# refugio de acero (baja desde arriba)
refugio = B.raiz('refugio')
B.hijos(refugio, [D.caja('ref_piso', -SX, SX, YF, SY1, SZ0, SZ0 + 0.1, M['blindado']),
                  D.caja('ref_izq', -SX, -SX + 0.1, YF, SY1, SZ0, SZ1, M['blindado']),
                  D.caja('ref_der', SX - 0.1, SX, YF, SY1, SZ0, SZ1, M['blindado']),
                  D.caja('ref_fondo', -SX, SX, SY1 - 0.1, SY1, SZ0, SZ1, M['blindado']),
                  D.caja('ref_techo_i', -SX, PUERTA[0], YF, SY1, SZ1 - 0.1, SZ1, M['blindado']),
                  D.caja('ref_techo_d', PUERTA[1], SX, YF, SY1, SZ1 - 0.1, SZ1, M['blindado']),
                  D.caja('ref_banco', -SX + 0.1, SX - 0.1, SY1 - 0.55, SY1 - 0.1, SZ0, SZ0 + 0.45, M['madera'])]
       + [D.caja('ref_esc', -0.35 + 0.65 * (k % 2), -0.3 + 0.65 * (k % 2), YF + 0.3, YF + 0.36, SZ0, 0.0, M['acero_claro']) for k in range(2)]
       + [D.caja('ref_peld', -0.3, 0.3, YF + 0.3, YF + 0.36, z, z + 0.04, M['acero_claro']) for z in (-2.0, -1.6, -1.2, -0.8, -0.4)])
key(refugio, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(refugio, 'location', 0.0, (0, 0, 0), 'CONSTANT')
key(refugio, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(refugio, 'scale', 10.85, (1, 1, 1), 'CONSTANT')
key(refugio, 'location', 10.85, (0, 0, 6.0))
key(refugio, 'location', 11.8, (0, 0, 0))
key(refugio, 'location', 11.95, (0, 0, 0.1))
key(refugio, 'location', 12.1, (0, 0, 0))
relleno = [B.caja_o('relleno_lado', -SX - 0.1, -SX, YF, SY1 + 0.1, SZ0 - 0.1, -0.2, M['relleno'], (0, 0, SZ0)),
           B.caja_o('relleno_lado', SX, SX + 0.1, YF, SY1 + 0.1, SZ0 - 0.1, -0.2, M['relleno'], (0, 0, SZ0)),
           B.caja_o('losa_nueva', -SX - 0.1, PUERTA[0], YF, SY1 + 0.1, -0.2, 0.02, M['concreto'], (0, 0, -0.2)),
           B.caja_o('losa_nueva', PUERTA[1], SX + 0.1, YF, SY1 + 0.1, -0.2, 0.02, M['concreto'], (0, 0, -0.2)),
           B.caja_o('losa_nueva', PUERTA[0], PUERTA[1], YF + 1.3, SY1 + 0.1, -0.2, 0.02, M['concreto'], (0, 0, -0.2))]
for o in relleno:
    gancho(o, TC)
    crecer(o, 2, 12.3, 12.6)
# puerta corrediza
puerta = B.raiz('puerta', (0, 0, 0))
B.hijos(puerta, [D.caja('puerta_hoja', PUERTA[0] - 0.05, PUERTA[1] + 0.05, YF, YF + 1.35, -0.06, 0.02, M['blindado']),
                 D.caja('puerta_asa', -0.2, 0.2, YF + 0.6, YF + 0.7, 0.02, 0.07, M['acero_claro'])])
ABRE = (1.25, 0, -0.12)
for t, p, it in ((0.0, (0, 0, 0), 'BEZIER'), (3.5, (0, 0, 0), 'BEZIER'), (3.9, ABRE, 'BEZIER'), (5.4, ABRE, 'BEZIER'),
                 (5.8, (0, 0, 0), 'BEZIER'), (14.9, (0, 0, 0), 'BEZIER'), (15.3, ABRE, 'BEZIER'), (15.9, ABRE, 'BEZIER'),
                 (16.3, (0, 0, 0), 'BEZIER'), (19.94, (0, 0, 0), 'BEZIER'), (20.4, ABRE, 'BEZIER'), (22.2, ABRE, 'BEZIER'),
                 (22.7, (0, 0, 0), 'BEZIER')):
    key(puerta, 'location', t, p, it)
for k, t in enumerate((36.4, 36.55, 36.7, 36.85, 37.0)):
    key(puerta, 'location', t, (0.06 if k % 2 == 0 else 0.0, 0, 0))
gancho(puerta, TC)
pop(puerta, 14.6, 0.3)

# auto
def auto(nombre, loc):
    r = B.raiz(nombre, loc)
    B.hijos(r, [D.caja('auto_c', -2.1, 2.1, -0.85, 0.85, 0.3, 0.95, M['auto']),
                D.caja('auto_cab', -1.2, 0.9, -0.75, 0.75, 0.95, 1.45, M['vidrio'])]
            + [B.cilindro('rueda', 0.33, 0.25, 'y', M['llanta'], (wx, wy - 0.12, 0.33), verts=16) for wx in (-1.35, 1.35) for wy in (-0.85, 0.85)])
    return r


coche = auto('auto', (12.0, YF + 1.1, 0.02))
for t, x in ((0.0, 12.0), (17.3, 12.0), (18.2, 0.0), (18.7, 0.0), (19.5, 12.0), (34.8, 12.0), (35.6, 0.0)):
    key(coche, 'location', t, (x, YF + 1.1, 0.02))

# familia
def persona(nombre, mat, alto=1.0):
    r = B.raiz(nombre)
    B.hijos(r, [B.cilindro('torso', 0.2 * alto, 0.62 * alto, 'z', M[mat], (0, 0, 0.8 * alto)),
                B.esfera('cabeza', 0.17 * alto, M['piel'], (0, 0, 1.6 * alto)),
                B.cilindro('piernas', 0.16 * alto, 0.8 * alto, 'z', M['pantalon'], (0, 0, 0))])
    return r


familia = [persona('papa', 'camisa1'), persona('mama', 'camisa2'), persona('hijo', 'camisa3', 0.7)]
for i, p in enumerate(familia):
    xs = -2.6 + 0.9 * i
    # gancho: entran y bajan
    key(p, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(p, 'location', 0.0, (xs - 6.0, YF + 0.75, 0.02))
    key(p, 'location', 3.6 + 0.3 * i, (0.0, YF + 0.75, 0.02))
    key(p, 'location', 4.3 + 0.35 * i, (0.0, YF + 0.75, SZ0 + 0.1))
    key(p, 'location', 5.0 + 0.3 * i, (-0.7 + 0.7 * i, SY1 - 0.5, SZ0 + 0.1))
    key(p, 'scale', TC, (0, 0, 0), 'CONSTANT')
    # al llegar el tornado
    key(p, 'scale', 20.3, (1, 1, 1), 'CONSTANT')
    key(p, 'location', 20.3, (-1.6 - 0.8 * i, YF + 0.75, 0.02))
    key(p, 'location', 20.9 + 0.2 * i, (0.0, YF + 0.75, 0.02))
    key(p, 'location', 21.5 + 0.25 * i, (0.0, YF + 0.75, SZ0 + 0.1))
    key(p, 'location', 22.1 + 0.2 * i, (-0.7 + 0.7 * i, SY1 - 0.5, SZ0 + 0.1))
    key(p, 'location', 34.0, (-0.7 + 0.7 * i, SY1 - 0.5, SZ0 + 0.1))
afuera = persona('papa_afuera', 'camisa1')
key(afuera, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(afuera, 37.4, 0.3)
afuera.location = (4.5, YF + 2.8, 0.02)
for k, t in enumerate((37.8, 38.1, 38.4, 38.7, 39.0)):
    key(afuera, 'rotation_euler', t, (0, 0.08 * (1 if k % 2 else -1), 0))

veinte = B.texto('veinte', '20 s', M['flecha_roja'], (0.0, YF - 0.5, 3.4), tam=1.1)
key(veinte, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(veinte, 2.7, 0.3)
quitar(veinte, 5.8, 0.2)

# ropero para comparar
ropero = D.caja('ropero', 2.0, 3.2, YF + 1.8, YF + 2.5, 0.02, 2.2, M['ropero'])
B.origen(ropero, (2.6, YF + 2.1, 0.02))
key(ropero, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(ropero, 12.9, 0.3)
quitar(ropero, 14.0, 0.2)

# tornado (cono que gira)
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.8, radius2=6.0, depth=18.0, location=(0, 0, 9.0))
torn = bpy.context.object
torn.data.materials.append(M['tornado'])
d = torn.modifiers.new('ondas', 'DISPLACE')
tx = bpy.data.textures.new('tornado_ruido', 'CLOUDS')
tx.noise_scale = 1.2
d.texture = tx
d.strength = 0.8
for t, loc in ((0.0, (-19.0, 34.0, 0.0)), (5.9, (-13.0, 27.0, 0.0)), (6.0, (-60.0, 40.0, 0.0)), (18.7, (-24.0, 32.0, 0.0)),
               (23.5, (-14.0, 18.0, 0.0)), (27.5, (-8.0, 16.0, 0.0)), (28.0, (-60.0, 40.0, 0.0)), (36.9, (-50.0, 40.0, 0.0)),
               (37.3, (-22.0, 22.0, 0.0)), (DUR, (-15.0, 18.0, 0.0))):
    key(torn, 'location', t, loc, 'CONSTANT' if t in (6.0, 28.0, 37.3) else 'BEZIER')
for k in range(int(DUR / 0.5) + 1):
    key(torn, 'rotation_euler', 0.5 * k, (0, 0, 1.6 * k), 'LINEAR')

# viento + escombros
for k in range(4):
    B.flujo(f'viento{k}', M['flecha_gris'], (-12.0, YF - 0.4, 0.8 + 0.8 * k), (6.0, YF - 0.4, 0.8 + 0.8 * k), 'x', 23.6 + 0.15 * k,
            25.6 + 0.15 * k, n=2, largo=1.4, grosor=0.12, sep=0.6)
for k in range(8):
    e = D.caja(f'escombro{k}', -0.3, 0.3, -0.05, 0.05, -0.08, 0.08, M['tabla'])
    key(e, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(e, 24.0 + 0.1 * k, 0.15)
    key(e, 'location', 24.0 + 0.1 * k, (-10.0 + random.uniform(-2, 2), YF + random.uniform(0, 4), random.uniform(1.0, 4.0)))
    key(e, 'location', 25.8 + 0.1 * k, (10.0, YF + random.uniform(0, 4), random.uniform(3.0, 8.0)))
    key(e, 'rotation_euler', 25.8 + 0.1 * k, (random.uniform(0, 6), random.uniform(0, 6), random.uniform(0, 6)))
    quitar(e, 25.85 + 0.1 * k, 0.1)

# prueba: tabla de madera contra el refugio
tabla = D.caja('tabla', -0.9, 0.9, -0.05, 0.05, -0.04, 0.04, M['tabla'])
key(tabla, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(tabla, 'scale', 28.55, (1, 1, 1), 'CONSTANT')
key(tabla, 'location', 28.55, (-9.0, YF - 0.3, -1.3), 'LINEAR')
key(tabla, 'location', 29.2, (-SX - 1.0, YF - 0.3, -1.3))
key(tabla, 'location', 29.7, (-SX - 2.4, YF - 0.3, -0.6))
key(tabla, 'rotation_euler', 29.2, (0, 0, 0))
key(tabla, 'rotation_euler', 29.7, (0, 1.6, 0))
quitar(tabla, 31.5, 0.2)
vel = B.texto('vel', '160 km/h', M['medida'], (-3.5, YF - 0.5, 0.6), tam=0.75)
key(vel, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(vel, 30.38, 0.3)
quitar(vel, 33.2, 0.2)

# casa al lado y vecindario
for p in D.casa(M, y0=Y0 + 1.5):
    p.location.x -= 11.5
for hx in (-16.0, 16.0):
    for p in D.casa(M, y0=Y0 + 20.0):
        p.location.x += hx
for xv, yv, h in ((8.0, Y0 + 12.0, 7.0), (-24.0, Y0 + 14.0, 7.5), (22.0, Y0 + 30.0, 8.0)):
    D.arbol((xv, yv, 0), alto=h, semilla=int(xv))

TOMAS = [
    (0.0, (-6.0, -22.0, 6.0), (-6.0, 6.0, 3.0)),
    (2.5, (0.0, -12.5, 2.4), (0.0, 1.0, 0.0)),
    (5.9, (0.0, -12.0, 1.4), (0.0, 1.0, -0.8), 'CORTE'),
    (6.0, (0.0, -40.0, 14.0), (0.0, 18.0, 2.0)),
    (8.9, (0.0, -37.0, 12.0), (0.0, 16.0, 1.5)),
    (9.1, (0.0, -14.0, 1.0), (0.0, 0.0, -1.0)),
    (13.9, (0.0, -13.5, 1.4), (0.0, 0.0, -0.6)),
    (14.1, (1.5, -10.5, 1.4), (0.0, 0.0, -0.3)),
    (18.6, (2.0, -13.0, 2.0), (0.0, 1.0, 0.0)),
    (18.8, (2.0, -20.0, 5.0), (-4.0, 6.0, 2.0)),
    (19.9, (1.0, -13.0, 1.8), (0.0, 0.5, -0.4)),
    (22.9, (0.0, -12.0, 0.5), (0.0, 0.0, -1.2)),
    (23.4, (-3.0, -25.0, 7.0), (-1.0, 3.0, 2.0)),
    (27.6, (-2.0, -22.0, 5.5), (-1.0, 1.0, 0.0)),
    (27.8, (-3.0, -12.0, -0.6), (-2.5, 0.0, -1.2)),
    (33.6, (-2.0, -12.5, -0.3), (-1.5, 0.0, -1.0)),
    (33.9, (4.0, -15.0, 2.8), (1.0, 1.0, 0.0)),
    (37.0, (3.0, -16.0, 3.0), (1.0, 1.0, 0.0)),
    (37.4, (8.0, -16.0, 3.4), (2.0, 6.0, 2.5)),
    (DUR, (7.0, -14.5, 3.0), (2.5, 6.0, 2.5)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e in ((0.0, 2.2), (6.0, 4.0), (18.7, 4.0), (19.5, 1.8), (27.6, 1.8), (28.0, 4.0), (36.9, 4.0), (37.3, 1.8)):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
B.terminar(opt, salida, DUR)
