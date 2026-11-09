"""16 — Jacuzzi escondido en la terraza. Audio: .tmp_render/lote/c16_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(16)
DUR = 38.1
TC = 6.0
M = B.materiales()
M.update({
    'deck': D.pbr('deck', 'brown_planks_05', tam=1.4, tinte=(0.62, 0.42, 0.25), fac=0.35, brillo=1.35),
    'tina': D.liso('tina', (0.92, 0.94, 0.95), 0.2),
    'espuma': D.liso('espuma', (0.95, 0.85, 0.3), 0.8),
    'burbuja': D.liso('burbuja', (1.0, 1.0, 1.0), 0.1, emit=0.4),
    'vapor': D.liso('vapor', (1.0, 1.0, 1.0), 0.5),
    'bomba': D.liso('bomba', (0.1, 0.3, 0.85), 0.35, metal=0.3),
    'filtro': D.liso('filtro', (0.55, 0.57, 0.6), 0.5, metal=0.4),
    'calentador': D.liso('calentador', (0.85, 0.2, 0.1), 0.4, emit=0.0),
    'boquilla': D.liso('boquilla', (0.2, 0.2, 0.22), 0.3, metal=0.8),
    'calor': D.liso('calor', (1.0, 0.45, 0.05), 0.4, emit=2.5),
    'frio_txt': D.liso('frio_txt', (0.4, 0.75, 1.0), 0.4, emit=2.5),
    'copo': D.liso('copo', (1.0, 1.0, 1.0), 0.4, emit=0.6),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'camisa1': D.liso('camisa1', (0.85, 0.3, 0.15), 0.7),
    'camisa2': D.liso('camisa2', (0.2, 0.6, 0.3), 0.7),
    'camisa3': D.liso('camisa3', (0.9, 0.75, 0.1), 0.7),
    'pantalon': D.liso('pantalon', (0.15, 0.15, 0.2), 0.7),
    'agua_j': D.agua('agua_j', col=(0.1, 0.55, 0.65), alpha=0.5),
})
vap = M['vapor']
vap.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.35
vap.surface_render_method = 'BLENDED'

ZD = 0.45                          # superficie de la terraza
TX, TY1, TZ0 = 1.2, Y0 + 2.4, -0.8  # tina x[-TX,TX] y[YF,TY1]
EQ = (2.2, 4.6, -0.9)              # pozo de equipos x0, x1, fondo

B.terreno(M, [(-TX - 0.4, TX + 0.4, TY1 + 0.4, TZ0 - 0.4), (EQ[0], EQ[1], Y0 + 1.6, EQ[2] - 0.1)])
B.relleno_hoyo(M, -TX - 0.4, TX + 0.4, TY1 + 0.4, TZ0 - 0.4, TC, 7.0, 7.9)
eq_t, eq_p = B.relleno_hoyo(M, EQ[0], EQ[1], Y0 + 1.6, EQ[2] - 0.1, TC, 17.0, 17.6)

# terraza (deck sobre vigas), con hueco para la tapa
for x0, x1, y0, y1 in ((-6.5, -TX - 0.1, YF, Y0 + 6.5), (TX + 0.1, 6.5, YF, Y0 + 6.5), (-TX - 0.1, TX + 0.1, TY1 + 0.1, Y0 + 6.5)):
    D.caja('deck', x0, x1, y0, y1, ZD - 0.08, ZD, M['deck'])
for x in (-6.0, -3.0, 3.0, 6.0):
    D.caja('viga_deck', x - 0.1, x + 0.1, YF, Y0 + 6.5, 0.0, ZD - 0.08, M['madera'])
D.caja('baranda', -6.5, 6.5, Y0 + 6.4, Y0 + 6.5, ZD, ZD + 1.0, M['madera'])

# tina (baja), espuma aislante, agua, boquillas
tina = B.raiz('tina')
B.hijos(tina, [D.caja('tina_piso', -TX, TX, YF, TY1, TZ0, TZ0 + 0.1, M['tina']),
               D.caja('tina_izq', -TX, -TX + 0.1, YF, TY1, TZ0, ZD - 0.08, M['tina']),
               D.caja('tina_der', TX - 0.1, TX, YF, TY1, TZ0, ZD - 0.08, M['tina']),
               D.caja('tina_fondo', -TX, TX, TY1 - 0.1, TY1, TZ0, ZD - 0.08, M['tina']),
               D.caja('asiento', -TX + 0.1, TX - 0.1, TY1 - 0.55, TY1 - 0.1, TZ0, TZ0 + 0.45, M['tina'])]
        + [B.cilindro('boquilla', 0.05, 0.04, 'y', M['boquilla'], (x, TY1 - 0.12, TZ0 + 0.6), verts=12) for x in (-0.7, 0.0, 0.7)])
key(tina, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(tina, 'location', 0.0, (0, 0, 0), 'CONSTANT')
key(tina, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(tina, 'scale', 8.05, (1, 1, 1), 'CONSTANT')
key(tina, 'location', 8.05, (0, 0, 5.0))
key(tina, 'location', 8.8, (0, 0, 0))
key(tina, 'location', 8.95, (0, 0, 0.08))
key(tina, 'location', 9.1, (0, 0, 0))
espuma = [B.caja_o('espuma', x0, x1, YF, y1, TZ0 - 0.4, ZD - 0.08, M['espuma'], (0, 0, TZ0 - 0.4))
          for x0, x1, y1 in ((-TX - 0.4, -TX, TY1 + 0.4), (TX, TX + 0.4, TY1 + 0.4))]
espuma.append(B.caja_o('espuma', -TX, TX, YF, TY1 + 0.4, TZ0 - 0.4, TZ0, M['espuma'], (0, 0, TZ0 - 0.4)))
for o in espuma:
    gancho(o, TC)
    crecer(o, 2, 9.46, 10.2)
agua = B.caja_o('agua_tina', -TX + 0.1, TX - 0.1, YF + 0.02, TY1 - 0.1, TZ0 + 0.1, ZD - 0.2, M['agua_j'], (0, 0, TZ0 + 0.1))
key(agua, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(agua, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(agua, 'scale', 21.0, (1, 1, 0.02))
key(agua, 'scale', 21.8, (1, 1, 1))
for k in range(3):
    B.flujo(f'calor_rebota{k}', M['calor'], (-0.4 + 0.4 * k, YF - 0.3, -0.2), (-TX - 0.2 if k == 0 else (TX + 0.2 if k == 2 else 0.0),
            YF - 0.3, -0.2 if k != 1 else TZ0 - 0.2), '-x' if k == 0 else ('x' if k == 2 else '-z'), 11.0, 11.6, n=1, largo=0.6)
    B.flujo(f'calor_vuelve{k}', M['calor'], (-TX + 0.1 if k == 0 else (TX - 0.1 if k == 2 else 0.0), YF - 0.3, -0.2 if k != 1 else TZ0 + 0.1),
            (-0.4 + 0.4 * k, YF - 0.3, -0.2), 'x' if k == 0 else ('-x' if k == 2 else 'z'), 11.7, 12.2, n=1, largo=0.6)

# tapa (parte del deck) con bisagra atras y pistones a gas
tapa = B.raiz('tapa', (0, TY1 + 0.1, ZD))
listones = []
x = -TX - 0.08
while x < TX + 0.05:
    listones.append(D.caja('liston', x, min(x + 0.28, TX + 0.08), YF - TY1 - 0.1, 0.0, -0.08, 0.0, M['deck']))
    x += 0.3
B.hijos(tapa, listones)
ABIERTA = (-1.1, 0, 0)
for t, r, it in ((0.0, (0, 0, 0), 'BEZIER'), (2.4, (0, 0, 0), 'BEZIER'), (3.5, ABIERTA, 'BEZIER'), (5.95, ABIERTA, 'CONSTANT'),
                 (6.0, (0, 0, 0), 'CONSTANT'), (14.7, (0, 0, 0), 'BEZIER'), (15.4, ABIERTA, 'BEZIER'), (30.26, ABIERTA, 'BEZIER'),
                 (30.9, (0, 0, 0), 'BEZIER'), (36.4, (0, 0, 0), 'BEZIER'), (37.0, ABIERTA, 'BEZIER')):
    key(tapa, 'rotation_euler', t, r, it)
key(tapa, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(tapa, 'scale', TC, (0, 0, 0), 'CONSTANT')
pop(tapa, 12.55, 0.3)
for sx in (-TX + 0.15, TX - 0.15):
    pg = B.cilindro('piston_gas', 0.03, 1.4, 'y', M['acero_claro'], (sx, -1.3, -0.1), verts=8)
    pg.parent = tapa
    pg.rotation_euler = (0.5, 0, 0)
    gancho(pg, TC)
    pop(pg, 15.7, 0.25)

# equipos: bomba, filtro, calentador + tubos
eqs = []
for nombre, mat, x0, x1, t in (('bomba', 'bomba', EQ[0] + 0.15, EQ[0] + 0.85, 19.02), ('filtro', 'filtro', EQ[0] + 0.95, EQ[0] + 1.5, 19.72),
                               ('calentador', 'calentador', EQ[0] + 1.6, EQ[1] - 0.15, 20.56)):
    o = D.caja(nombre, x0, x1, YF + 0.1, Y0 + 1.3, EQ[2], EQ[2] + 0.85, M[mat])
    B.origen(o, ((x0 + x1) / 2, YF + 0.7, EQ[2]))
    gancho(o, TC)
    pop(o, t, 0.3)
    eqs.append(o)
tubo = B.cilindro('tubo_eq', 0.06, EQ[0] - TX + 0.2, 'x', M['tubo'], (TX - 0.1, YF - 0.1, EQ[2] + 0.45))
gancho(tubo, TC)
crecer(tubo, 0, 20.9, 21.3)
eC = M['calentador'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((0.0, 0.0), (25.7, 0.0), (26.0, 2.5)):
    B.key_valor(eC, t, v)
B.flujo('empuja', M['flecha_azul'], (EQ[0] + 0.5, YF - 0.35, EQ[2] + 0.45), (TX - 0.3, YF - 0.35, EQ[2] + 0.45), '-x', 21.8, 23.4, n=3, largo=0.6)

# burbujas y vapor
def burbujas(t0, t1, n=24):
    for i in range(n):
        x = random.uniform(-TX + 0.2, TX - 0.2)
        y = random.uniform(YF + 0.05, YF + 0.3)
        b = B.esfera(f'burbuja{t0}_{i}', 0.04 + 0.03 * random.random(), M['burbuja'], (x, y, TZ0 + 0.3))
        b.scale = (0, 0, 0)
        key(b, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
        t = t0 + random.uniform(0, 0.6)
        while t < t1:
            key(b, 'location', t, (x, y, TZ0 + 0.4), 'LINEAR')
            key(b, 'scale', t, (1, 1, 1), 'CONSTANT')
            key(b, 'location', t + 0.7, (x + 0.05, y, ZD - 0.22), 'CONSTANT')
            t += 0.75
        key(b, 'scale', t, (0, 0, 0), 'CONSTANT')


def vapor(t0, t1, n=10):
    for i in range(n):
        x = random.uniform(-TX + 0.3, TX - 0.3)
        y = random.uniform(YF + 0.3, TY1 - 0.3)
        v = B.esfera(f'vapor{t0}_{i}', 0.35, M['vapor'], (x, y, ZD))
        v.scale = (0, 0, 0)
        key(v, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
        t = t0 + random.uniform(0, 1.2)
        while t < t1:
            key(v, 'location', t, (x, y, ZD), 'LINEAR')
            key(v, 'scale', t, (0.4, 0.4, 0.4))
            key(v, 'location', t + 1.4, (x + 0.3, y, ZD + 2.0), 'CONSTANT')
            key(v, 'scale', t + 1.4, (1.3, 1.3, 1.3), 'CONSTANT')
            t += 1.5
        key(v, 'scale', t, (0, 0, 0), 'CONSTANT')


random.seed(16)
burbujas(4.3, 5.95)
burbujas(24.4, 29.5)
burbujas(36.6, DUR)
vapor(4.3, 5.95)
vapor(26.9, 30.2)
vapor(36.6, DUR)

t38 = B.texto('t38', '38°C', M['calor'], (0.0, YF - 0.5, 1.4), tam=0.9)
tfrio = B.texto('tfrio', '-2°C', M['frio_txt'], (-2.6, YF - 0.5, 2.9), tam=0.9)
for o, a, b in ((t38, 26.96, 29.9), (tfrio, 28.6, 29.9)):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, a, 0.3)
    quitar(o, b, 0.2)
for i in range(45):
    xx, yy = random.uniform(-9, 9), random.uniform(Y0 - 0.5, Y0 + 9)
    c = B.esfera(f'copo{i}', 0.05, M['copo'], (xx, yy, 8.0))
    c.scale = (0, 0, 0)
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    t = 28.5 + random.uniform(0, 1.0)
    while t < 30.6:
        key(c, 'location', t, (xx, yy, 6.0), 'LINEAR')
        key(c, 'scale', t, (1, 1, 1), 'CONSTANT')
        key(c, 'location', t + 1.1, (xx + 0.3, yy, ZD + 0.05), 'CONSTANT')
        t += 1.15
    key(c, 'scale', t, (0, 0, 0), 'CONSTANT')

# amigos: parados en la terraza, despues dentro del jacuzzi
def persona(nombre, mat, loc):
    r = B.raiz(nombre, loc)
    B.hijos(r, [B.cilindro('torso', 0.2, 0.62, 'z', M[mat], (0, 0, 0.8)), B.esfera('cabeza', 0.17, M['piel'], (0, 0, 1.6)),
                B.cilindro('piernas', 0.16, 0.8, 'z', M['pantalon'], (0, 0, 0))])
    return r


for i, mat in enumerate(('camisa1', 'camisa2', 'camisa3')):
    p = persona(f'amigo{i}', mat, (2.5 + 1.0 * i, Y0 + 3.5 + 0.4 * (i % 2), ZD))
    key(p, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(p, 33.1 + 0.12 * i, 0.25)
    key(p, 'location', 36.4, (2.5 + 1.0 * i, Y0 + 3.5 + 0.4 * (i % 2), ZD))
    key(p, 'location', 36.45, (-0.7 + 0.7 * i, TY1 - 0.4, TZ0 - 0.25), 'CONSTANT')

B.casa_patio(M, HX=-2.0, HY=Y0 + 13.0)

TOMAS = [
    (0.0, (-4.0, -14.0, 5.0), (0.0, 1.5, 0.4)),
    (2.2, (-2.0, -11.0, 3.4), (0.0, 0.5, 0.2)),
    (4.3, (-1.0, -9.5, 2.0), (0.0, 0.0, -0.1)),
    (5.95, (-0.8, -9.2, 1.8), (0.0, 0.0, -0.2), 'CORTE'),
    (6.0, (0.0, -14.0, 2.4), (0.6, 0.0, -0.4)),
    (11.9, (0.0, -13.0, 2.0), (0.6, 0.0, -0.4)),
    (12.1, (-2.5, -10.5, 2.6), (0.0, 0.5, 0.2)),
    (16.6, (-2.0, -10.0, 2.4), (0.0, 0.5, 0.2)),
    (16.8, (3.4, -9.0, 0.8), (3.4, 0.0, -0.5)),
    (21.2, (3.0, -9.5, 0.8), (3.0, 0.0, -0.4)),
    (21.4, (1.6, -9.0, 0.4), (1.4, 0.0, -0.5)),
    (25.5, (0.4, -8.5, 0.6), (0.2, 0.0, -0.3)),
    (25.7, (-1.0, -12.0, 2.4), (-0.6, 0.0, 0.4)),
    (29.0, (-1.0, -12.5, 2.6), (-0.6, 0.0, 0.4)),
    (29.2, (-3.0, -12.0, 3.4), (0.0, 1.0, 0.2)),
    (32.9, (-3.5, -14.0, 4.4), (0.5, 2.0, 0.4)),
    (36.3, (-3.0, -13.0, 4.0), (1.0, 2.0, 0.4)),
    (36.45, (-1.0, -9.5, 1.6), (0.0, 0.5, 0.0)),
    (DUR, (-0.8, -9.0, 1.4), (0.0, 0.5, 0.0)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e in ((0.0, 4.0), (28.3, 4.0), (28.6, 2.4), (30.3, 2.4), (30.6, 4.0)):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
B.terminar(opt, salida, DUR)
