"""07 — Tunel a la casa del vecino. Audio: .tmp_render/lote/c7_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(7)
DUR = 39.8
TC = 4.5
M = B.materiales()
M.update({
    'tbm': D.liso('tbm', (0.95, 0.55, 0.05), 0.4, metal=0.3),
    'cabeza': D.liso('cabeza', (0.35, 0.36, 0.38), 0.35, metal=0.9),
    'luz': D.liso('luz', (1.0, 0.85, 0.6), 0.3, emit=0.0),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'camisa': D.liso('camisa', (0.15, 0.45, 0.85), 0.7),
    'pantalon': D.liso('pantalon', (0.15, 0.15, 0.2), 0.7),
    'taza': D.liso('taza', (0.95, 0.95, 0.95), 0.3),
    'muro_berlin': D.pbr('muro_berlin', 'rough_concrete', tam=1.5, tinte=(0.7, 0.7, 0.68), fac=0.6, brillo=1.4),
    'reloj': D.liso('reloj', (0.4, 1.0, 0.4), 0.3, emit=3.0),
})

SX = 4.5                 # pozos en x = +-SX
SW = 0.75                # medio ancho del pozo
ZT, RT = -3.3, 1.1       # tunel: centro y radio
ZFT = ZT - RT + 0.25     # piso del tunel
PY1 = Y0 + 1.6

B.terreno(M, [(-SX - SW, -SX + SW, PY1, ZT - RT - 0.2), (SX - SW, SX + SW, PY1, ZT - RT - 0.2),
              (-SX + SW, SX - SW, PY1, ZT - RT - 0.2, ZT + RT + 0.1)])
for sx, m in ((-SX, 'L'), (SX, 'R')):
    B.relleno_hoyo(M, sx - SW, sx + SW, PY1, ZT - RT - 0.2, TC, 4.9 + (0.2 if m == 'R' else 0), 6.5 + (0.2 if m == 'R' else 0))
B.medida('m4', -SX - SW - 0.9, 0.0, ZT - RT - 0.2, '4 m', M, 7.14, 8.4)

# revestimiento de los pozos + escaleras
for sx in (-SX, SX):
    for nombre, x0, x1, y0, y1 in (('a', sx - SW, sx - SW + 0.12, YF, PY1), ('b', sx + SW - 0.12, sx + SW, YF, PY1),
                                   ('c', sx - SW, sx + SW, PY1 - 0.12, PY1)):
        o = B.caja_o('pozo_' + nombre, x0, x1, y0, y1, ZT - RT - 0.2, 0.0, M['concreto'], (0, 0, ZT - RT - 0.2))
        gancho(o, TC)
        crecer(o, 2, 6.7, 7.1)
    esc = B.raiz('escalera', (sx, PY1 - 0.25, 0))
    B.hijos(esc, [D.caja('lado', -0.32, -0.28, -0.03, 0.03, ZFT, 0.9, M['acero_claro']),
                  D.caja('lado', 0.28, 0.32, -0.03, 0.03, ZFT, 0.9, M['acero_claro'])]
            + [D.caja('peld', -0.28, 0.28, -0.03, 0.03, z, z + 0.04, M['acero_claro']) for z in [ZFT + 0.3 + 0.35 * k for k in range(11)]])
    gancho(esc, TC)
    pop(esc, 7.3, 0.3)
    tapa = B.cilindro('tapa_pozo', SW + 0.05, 0.06, 'z', M['acero'], (sx, Y0 + 0.75, 0.0), verts=32)

# tierra del tunel: se vacia de izquierda a derecha detras de la tuneladora
XA, XB = -SX + SW, SX - SW
T_MAQ0, T_MAQ1 = 9.9, 18.2
fill = B.caja_o('tierra_tunel', XA, XB, YF, PY1, ZT - RT - 0.2, ZT + RT + 0.1, M['tierra'], (XB, 0, 0))
key(fill, 'scale', TC - 0.05, (0, 0, 0), 'CONSTANT')
key(fill, 'scale', TC, (1, 1, 1))
key(fill, 'scale', T_MAQ0, (1, 1, 1), 'LINEAR')
key(fill, 'scale', T_MAQ1, (0.001, 1, 1), 'LINEAR')
key(fill, 'scale', T_MAQ1 + 0.05, (0, 0, 0), 'CONSTANT')

def x_maq(t):
    return XA + (XB - XA) * min(1.0, max(0.0, (t - T_MAQ0) / (T_MAQ1 - T_MAQ0)))

# tuneladora: cuerpo naranja + cabeza giratoria
maq = B.raiz('tuneladora', (XA, YF, ZT))
cuerpo = B.medio_tubo('tbm_cuerpo', RT - 0.08, -2.4, -0.3, 'x', M['tbm'], (0, 0, 0), solido=True)
cab = B.raiz('tbm_cabeza', (0, 0, 0))
disco = B.medio_tubo('tbm_disco', RT - 0.02, -0.3, 0.0, 'x', M['cabeza'], (0, 0, 0), solido=True)
dientes = [D.caja('diente', 0.0, 0.12, -0.06, 0.06, -0.06, 0.06, M['acero_claro']) for _ in range(10)]
for k, dd in enumerate(dientes):
    a = math.pi * (k + 0.5) / 10
    dd.location = (0, 0.75 * math.sin(a), 0.75 * math.cos(a))
B.hijos(cab, [disco] + dientes)
B.hijos(maq, [cuerpo, cab])
key(maq, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(maq, 9.62, 0.3)
key(maq, 'location', T_MAQ0, (XA, YF, ZT), 'LINEAR')
key(maq, 'location', T_MAQ1, (XB + 0.3, YF, ZT), 'LINEAR')
quitar(maq, 18.6, 0.3)
for k, t in enumerate([T_MAQ0 + 0.5 * j for j in range(int((T_MAQ1 - T_MAQ0) / 0.5) + 1)]):
    key(cab, 'rotation_euler', t, (0.9 * k, 0, 0), 'LINEAR')

# anillos de concreto (medios anillos) colocados detras de la maquina
anillos = []
xa = XA
k = 0
while xa < XB - 0.05:
    xb_ = min(XB, xa + 0.6)
    an = B.medio_tubo(f'anillo{k}', RT, xa + 0.02, xb_ - 0.02, 'x', M['concreto'], (0, YF, ZT), grosor=0.2, tapas=False)
    B.origen(an, ((xa + xb_) / 2, YF, ZT))
    gancho(an, TC)
    t_on = T_MAQ0 + (T_MAQ1 - T_MAQ0) * ((xb_ - XA) / (XB - XA)) + 0.15
    pop(an, max(t_on, 13.6 + 0.05 * k), 0.25)
    anillos.append(an)
    xa = xb_
    k += 1

# piso, luces, tubo de aire
piso = B.caja_o('piso_tunel', XA, XB, YF, YF + 0.95, ZFT - 0.1, ZFT, M['madera'], (0, YF, ZFT - 0.1))
gancho(piso, TC)
crecer(piso, 1, 19.6, 20.0)
luz = D.caja('luz_tunel', XA + 0.3, XB - 0.3, YF + 0.15, YF + 0.35, ZT + RT - 0.32, ZT + RT - 0.26, M['luz'])
eL = M['luz'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((0.0, 7.0), (TC, 7.0), (TC + 0.01, 0.0), (20.45, 0.0), (20.55, 7.0)):
    B.key_valor(eL, t, v)
gancho(luz, TC)
pop(luz, 20.4, 0.2)
aire = B.cilindro('tubo_aire', 0.16, -(ZT + RT) + 0.9, 'z', M['acero_claro'], (0.0, YF + 0.25, ZT + RT - 0.2))
gancho(aire, TC)
crecer(aire, 2, 21.36, 21.9)
hongo = B.esfera('aire_cap', 0.36, M['acero_claro'], (0.0, YF + 0.25, 0.75), esc=(1, 1, 0.45))
gancho(hongo, TC)
pop(hongo, 21.85, 0.25, (1, 1, 0.45))
B.flujo('aire', M['flecha_azul'], (0.0, YF - 0.3, 0.2), (0.0, YF - 0.3, ZT + 0.3), '-z', 22.0, 22.95, n=3, largo=0.7)

# persona (sencilla) que cruza el tunel
def persona(nombre, loc):
    r = B.raiz(nombre, loc)
    torso = B.cilindro('torso', 0.2, 0.62, 'z', M['camisa'], (0, 0, 0.8))
    cabeza = B.esfera('cabeza', 0.17, M['piel'], (0, 0, 1.6))
    pierna1 = B.cilindro('pierna', 0.08, 0.8, 'z', M['pantalon'], (0, -0.1, 0.8))
    pierna2 = B.cilindro('pierna', 0.08, 0.8, 'z', M['pantalon'], (0, 0.1, 0.8))
    pierna1.rotation_euler = pierna2.rotation_euler = (math.pi, 0, 0)
    B.hijos(r, [torso, cabeza, pierna1, pierna2])
    return r, pierna1, pierna2


def caminar(p, p1, p2, t0, t1, x0, x1, z):
    key(p, 'scale', t0 - 0.1, (0, 0, 0), 'CONSTANT')
    key(p, 'scale', t0, (1, 1, 1))
    key(p, 'location', t0, (x0, YF + 0.5, z), 'LINEAR')
    key(p, 'location', t1, (x1, YF + 0.5, z), 'LINEAR')
    quitar(p, t1, 0.2)
    t = t0
    k = 0
    while t < t1:
        a = 0.45 if k % 2 else -0.45
        key(p1, 'rotation_euler', t, (math.pi, a, 0))
        key(p2, 'rotation_euler', t, (math.pi, -a, 0))
        t += 0.35
        k += 1


pers, pa, pb = persona('vecino', (XA, YF + 0.5, ZFT))
key(pers, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
caminar(pers, pa, pb, 23.5, 28.3, XA + 0.3, XB - 0.3, ZFT)
pers2, pc, pd = persona('vecino2', (XA, YF + 0.5, ZFT))
taza = B.cilindro('taza', 0.07, 0.12, 'z', M['taza'], (0.25, -0.15, 1.05), verts=12)
taza.parent = pers2
key(pers2, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
caminar(pers2, pc, pd, 34.6, 38.9, XA + 0.3, XB - 0.3, ZFT)

# lluvia arriba ("sin mojarte")
for i in range(55):
    x, y = random.uniform(-12, 12), random.uniform(Y0 - 0.5, Y0 + 7)
    g = B.cilindro(f'gota{i}', 0.016, 0.6, 'z', M['flecha_azul'], (x, y, 10), verts=6)
    g.scale = (0, 0, 0)
    t = 25.4 + random.uniform(0, 0.45)
    key(g, 'scale', t - 0.05, (0, 0, 0), 'CONSTANT')
    while t < 26.9:
        key(g, 'location', t, (x, y, 9.0), 'LINEAR')
        key(g, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(g, 'location', t + 0.42, (x, y, 0.1), 'CONSTANT')
        t += 0.45
    key(g, 'scale', t, (0, 0, 0), 'CONSTANT')

# muro de Berlin entre los patios
muro = B.raiz('muro_berlin', (0, Y0 + 3.5, 0))
for k in range(-6, 7):
    pl = D.caja('placa', -0.2, 0.2, -0.6, 0.6, 0.0, 3.4, M['muro_berlin'])
    pl.parent = muro
    pl.location = (0, k * 1.22, 0)
B.hijos(muro, [B.cilindro('borde_muro', 0.25, 16.0, 'y', M['muro_berlin'], (0, -8.0, 3.4), verts=12)])
key(muro, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(muro, 28.94, 0.35)
quitar(muro, 34.15, 0.3)
cerca = D.caja('cerca', -0.05, 0.05, Y0 + 0.4, Y0 + 9.5, 0, 1.6, M['madera'])
key(cerca, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(cerca, 'scale', 28.94, (0, 0, 0), 'CONSTANT')
key(cerca, 'scale', 34.3, (1, 1, 1), 'CONSTANT')

# noche: 3 de la manana
hora = B.texto('hora', '3:00 AM', M['reloj'], (2.0, YF - 0.5, 1.6), tam=0.8)
key(hora, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(hora, 38.3, 0.3)
azucar = B.raiz('azucar', (XB - 0.4, YF + 0.5, ZFT + 1.6))
B.hijos(azucar, [D.caja('bolsa', -0.2, 0.2, -0.12, 0.12, -0.3, 0.3, M['blanco']),
                 B.texto('azucar_txt', 'AZÚCAR', M['flecha_azul'], (0, -0.14, 0.0), tam=0.11)])
key(azucar, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(azucar, 37.2, 0.3, 1.4)

# casas a cada lado del patio
HY = Y0 + 7.0
for hx in (-10.5, 10.5):
    for p in D.casa(M, y0=HY):
        p.location.x += hx
for nombre, loc, rz, s in (('shrub_04', (-14.0, HY - 0.8, 0), 0, 1.6), ('shrub_02', (14.0, HY - 0.8, 0), 1.0, 1.7),
                           ('plastic_monobloc_chair_01', (-6.5, Y0 + 3.5, 0), 0.6, 1.0),
                           ('outdoor_table_chair_set_01', (7.5, Y0 + 4.5, 0), 2.0, 1.0)):
    D.modelo(nombre, loc, rz, s)
D.caja('barda', -40, 40, HY + 11.0, HY + 11.15, 0, 1.8, M['zocalo'])
for xv, yv, h in ((-20.0, HY + 12.5, 7.5), (20.0, HY + 12.5, 7.5), (0.0, HY + 13, 8.0), (-3.0, HY + 2.0, 6.0)):
    D.arbol((xv, yv, 0), alto=h, semilla=int(xv))

# luces de las ventanas de noche
vid = M['vidrio'].node_tree.nodes['Principled BSDF']
vid.inputs['Emission Color'].default_value = (1.0, 0.75, 0.35, 1)
for t, v in ((0.0, 0.0), (34.2, 0.0), (34.8, 3.0)):
    B.key_valor(vid.inputs['Emission Strength'], t, v)

TOMAS = [
    (0.0, (0.0, -27.0, 6.5), (0.0, 2.0, -0.4)),
    (3.9, (0.0, -24.5, 4.6), (0.0, 1.0, -1.2)),
    (4.45, (0.0, -24.0, 4.2), (0.0, 1.0, -1.3), 'CORTE'),
    (4.5, (0.0, -23.0, 3.0), (0.0, 0.0, -1.6)),
    (8.4, (0.0, -22.0, 2.6), (0.0, 0.0, -1.8)),
    (9.0, (-2.6, -14.0, -1.4), (-1.6, 0.0, -3.2)),
    (13.5, (0.0, -14.5, -1.4), (0.4, 0.0, -3.2)),
    (18.4, (2.4, -14.0, -1.5), (2.0, 0.0, -3.2)),
    (19.0, (0.0, -11.5, -2.6), (0.0, 0.0, -3.4)),
    (22.9, (0.3, -11.0, -2.4), (0.0, 0.0, -3.0)),
    (23.4, (-2.8, -13.0, -2.2), (-2.4, 0.0, -3.3)),
    (25.3, (-1.0, -14.0, -1.0), (-0.6, 0.0, -2.2)),
    (27.0, (1.2, -14.0, -1.6), (1.4, 0.0, -3.0)),
    (28.3, (2.6, -13.0, -2.2), (2.4, 0.0, -3.3)),
    (28.6, (-13.0, -22.0, 9.0), (0.0, 4.0, 0.5)),
    (33.8, (-11.5, -20.0, 7.8), (0.0, 4.0, 0.3)),
    (34.3, (-2.6, -15.0, -1.8), (-2.0, 0.0, -3.0)),
    (37.0, (1.0, -15.5, -1.2), (1.4, 0.0, -2.6)),
    (38.2, (2.4, -16.0, 0.0), (2.4, 0.0, -1.4)),
    (DUR, (2.6, -15.0, -0.2), (2.6, 0.0, -1.6)),
]
B.tomas(TOMAS)
sol = B.luz()
sd = sol.data
for t, e in ((0.0, 4.0), (34.2, 4.0), (34.8, 0.25)):
    sd.energy = e
    sd.keyframe_insert('energy', frame=F(t))
bg = bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength']
for t, v in ((0.0, 0.35), (34.2, 0.35), (34.8, 0.03)):
    B.key_valor(bg, t, v)
B.terminar(opt, salida, DUR)
