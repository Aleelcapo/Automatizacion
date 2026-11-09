"""13 — Biopiscina (piscina sin cloro). Audio: .tmp_render/lote/c13_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(13)
DUR = 37.0
M = B.materiales()
M.update({
    'liner': D.pbr('liner', 'smooth_concrete_floor', tam=1.5, tinte=(0.25, 0.32, 0.35), fac=0.6, brillo=0.9),
    'borde_piedra': D.pbr('borde_piedra', 'white_sandstone_blocks_02', tam=1.0, brillo=1.1),
    'deck': D.pbr('deck', 'brown_planks_05', tam=1.4, tinte=(0.62, 0.42, 0.25), fac=0.35, brillo=1.35),
    'junco': D.liso('junco', (0.25, 0.55, 0.12), 0.6),
    'nenufar': D.liso('nenufar', (0.2, 0.5, 0.15), 0.5),
    'flor': D.liso('flor', (1.0, 0.55, 0.75), 0.4),
    'rana': D.liso('rana', (0.35, 0.75, 0.15), 0.35),
    'bacteria': D.liso('bacteria', (0.3, 0.85, 0.18), 0.45, emit=0.3),
    'ojo': D.liso('ojo', (1, 1, 1), 0.3),
    'pupila': D.liso('pupila', (0.01, 0.01, 0.01), 0.3),
    'suciedad': D.liso('suciedad', (0.25, 0.16, 0.06), 0.6),
    'alga': D.liso('alga', (0.25, 0.65, 0.1), 0.5),
    'bomba': D.liso('bomba', (0.15, 0.45, 0.2), 0.4),
    'verde_txt': D.liso('verde_txt', (0.3, 1.0, 0.3), 0.4, emit=2.0),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'malla': D.liso('malla', (0.9, 0.2, 0.2), 0.6),
    'agua_bio': D.agua('agua_bio', col=(0.04, 0.34, 0.32), alpha=0.5),
})

X0, X1, PY1 = -5.2, 6.2, Y0 + 5.2
ZS = -1.8          # fondo zona de nado
ZR = -0.8          # tope de la grava en la zona de plantas
NIV = -0.1
DIV = (0.5, 1.0)

B.terreno(M, [(X0, X1 + 0.7, PY1, ZS - 0.35)])
# vaso: piso, muros, divisor, grava, agua
for nombre, x0, x1, y0, y1, z0, z1 in (('piso', X0, X1, YF, PY1, ZS - 0.3, ZS), ('izq', X0, X0 + 0.25, YF, PY1, ZS, NIV - 0.05),
                                       ('der', X1 - 0.25, X1, YF, PY1, ZS, NIV - 0.05), ('fondo', X0, X1, PY1 - 0.25, PY1, ZS, NIV - 0.05),
                                       ('div', DIV[0], DIV[1], YF, PY1 - 0.25, ZS, NIV - 0.35)):
    D.caja('vaso_' + nombre, x0, x1, y0, y1, z0, z1, M['liner'])
D.caja('relleno_der', X1, X1 + 0.7, YF, PY1, ZS - 0.35, 0.0, M['relleno'])
grava = D.caja('grava', DIV[1], X1 - 0.25, YF, PY1 - 0.25, ZS, ZR, M['grava'])
agua = D.caja('agua', X0 + 0.25, X1 - 0.25, YF + 0.02, PY1 - 0.25, ZS, NIV, M['agua_bio'])
for x0, x1, y0, y1 in ((X0 - 0.5, X1 + 0.5, PY1 - 0.25, PY1 + 0.4), (X0 - 0.5, X0 + 0.25, YF, PY1), (X1 - 0.25, X1 + 0.5, YF, PY1)):
    D.caja('borde', x0, x1, y0, y1, -0.05, 0.1, M['borde_piedra'])
D.caja('deck', X0 - 4.0, X0 - 0.5, YF, PY1 + 1.0, -0.05, 0.12, M['deck'])

# plantas: juncos y nenufares
plantas = []
random.seed(13)
for c in range(10):
    cx = DIV[1] + 0.5 + random.uniform(0, X1 - DIV[1] - 1.2)
    cy = YF + 0.5 + random.uniform(0, PY1 - YF - 1.2)
    r = B.raiz(f'junco{c}', (cx, cy, ZR))
    for k in range(6):
        h = random.uniform(1.4, 2.3)
        t = B.cilindro('tallo', 0.025, h, 'z', M['junco'], (random.uniform(-0.15, 0.15), random.uniform(-0.15, 0.15), 0), verts=6)
        t.rotation_euler = (random.uniform(-0.15, 0.15), random.uniform(-0.15, 0.15), 0)
        t.parent = r
    plantas.append(r)
for c in range(7):
    cx = DIV[1] + 0.4 + random.uniform(0, X1 - DIV[1] - 0.9)
    cy = YF + 0.4 + random.uniform(0, PY1 - YF - 0.9)
    r = B.raiz(f'nenufar{c}', (cx, cy, NIV + 0.01))
    B.hijos(r, [B.cilindro('hoja', 0.35, 0.02, 'z', M['nenufar'], (0, 0, 0), verts=20)])
    if c % 2 == 0:
        B.hijos(r, [B.esfera('flor', 0.1, M['flor'], (0.1, 0.05, 0.08), esc=(1, 1, 0.6))])
    plantas.append(r)
for k, p in enumerate(plantas):
    rebote(p, 19.3 + 0.04 * k, 1.0, 1.15)

# bomba y tubos
bomba = B.raiz('bomba', (X1 + 1.6, Y0 + 0.8, 0.0))
B.hijos(bomba, [D.caja('bomba_caja', -0.5, 0.5, -0.4, 0.4, 0.0, 0.8, M['bomba'])])
tubo_fondo = B.cilindro('tubo_fondo', 0.08, X1 + 1.3 - (-2.0), 'x', M['tubo'], (-2.0, YF - 0.15, ZS - 0.15))
tubo_sube = B.cilindro('tubo_sube', 0.08, -(ZS - 0.15) + 0.3, 'z', M['tubo'], (X1 + 1.3, YF - 0.15, ZS - 0.15))
tubo_vuelta = B.cilindro('tubo_vuelta', 0.08, 1.5, 'x', M['tubo'], (X1 - 0.6, YF - 0.15, -0.5))
rebote(bomba, 9.86)
fl = M['flecha_azul']
B.flujo('a_bomba', M['flecha_gris'], (-1.6, YF - 0.4, ZS - 0.15), (X1 + 0.9, YF - 0.4, ZS - 0.15), 'x', 10.2, 11.6, n=3, largo=0.8)
B.flujo('sube', M['flecha_gris'], (X1 + 1.3, YF - 0.4, ZS + 0.1), (X1 + 1.3, YF - 0.4, -0.6), 'z', 11.2, 12.2, n=2, largo=0.7)
B.flujo('a_plantas', M['flecha_gris'], (X1 + 0.6, YF - 0.4, -0.5), (X1 - 1.4, YF - 0.4, -0.5), '-x', 12.0, 12.9, n=2, largo=0.7)
for k, x in enumerate((2.0, 3.4, 4.8)):
    B.flujo(f'filtra{k}', M['flecha_gris'], (x, YF - 0.4, ZR + 0.5), (x, YF - 0.4, ZS + 0.3), '-z', 13.4 + 0.15 * k, 15.3 + 0.15 * k, n=2,
            largo=0.6, sep=0.5)
B.flujo('vuelve', fl, (DIV[1] + 0.6, YF - 0.4, NIV - 0.3), (-2.0, YF - 0.4, NIV - 0.3), '-x', 23.6, 25.2, n=3, largo=0.9)
# ciclo: flechas dando la vuelta
for k in range(2):
    a = 25.6 + 0.8 * k
    B.flujo(f'ciclo_a{k}', fl, (-1.6, YF - 0.4, ZS - 0.15), (X1 + 0.9, YF - 0.4, ZS - 0.15), 'x', a, a + 0.6, n=1, largo=0.8)
    B.flujo(f'ciclo_b{k}', fl, (X1 + 0.6, YF - 0.4, -0.5), (DIV[1] + 0.4, YF - 0.4, -0.5), '-x', a + 0.3, a + 0.9, n=1, largo=0.8)
    B.flujo(f'ciclo_c{k}', fl, (DIV[1], YF - 0.4, NIV - 0.3), (-2.0, YF - 0.4, NIV - 0.3), '-x', a + 0.5, a + 1.1, n=1, largo=0.8)

# bacterias comiendo suciedad en la grava + algas que no crecen
for i in range(12):
    x = DIV[1] + 0.4 + (X1 - DIV[1] - 1.0) * (i + 0.5) / 12
    z = random.uniform(ZS + 0.2, ZR - 0.15)
    r = B.raiz(f'bacteria{i}', (x, YF - 0.25, z))
    B.hijos(r, [B.esfera('cuerpo', 0.14, M['bacteria'], (0, 0, 0), esc=(1, 0.55, 0.6)),
                B.esfera('ojo', 0.04, M['ojo'], (0.04, -0.07, 0.03)), B.esfera('ojo', 0.04, M['ojo'], (-0.05, -0.07, 0.03)),
                B.esfera('pup', 0.02, M['pupila'], (0.04, -0.1, 0.03)), B.esfera('pup', 0.02, M['pupila'], (-0.05, -0.1, 0.03))])
    key(r, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(r, 16.1 + 0.05 * i, 0.25, 1.3)
    for k in range(6):
        key(r, 'rotation_euler', 16.6 + 0.4 * k, (0, 0.3 * (1 if k % 2 else -1), 0))
    quitar(r, 23.2, 0.2, 1.3)
    s = B.esfera(f'sucio{i}', 0.06, M['suciedad'], (x + 0.18, YF - 0.25, z + 0.05))
    key(s, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(s, 14.5 + 0.05 * i, 0.2)
    key(s, 'scale', 18.06 + 0.04 * i, (1, 1, 1))
    key(s, 'scale', 18.6 + 0.04 * i, (0, 0, 0), 'CONSTANT')
for i in range(6):
    a = B.esfera(f'alga{i}', 0.16, M['alga'], (-4.0 + 0.8 * i, YF - 0.2, ZS + 0.2), esc=(1.3, 0.5, 0.8))
    key(a, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(a, 21.1 + 0.05 * i, 0.2, (1.3, 0.5, 0.8))
    quitar(a, 22.0 + 0.04 * i, 0.4, (1.3, 0.5, 0.8))

# textos
for nombre, txt, loc, t0, t1, mat in (('bio', 'BIOPISCINA', (0.5, YF - 0.5, 2.0), 4.95, 6.2, 'verde_txt'),
                                      ('nado', 'NADO', (-2.3, YF - 0.5, 1.6), 7.45, 9.5, 'medida'),
                                      ('plantas', 'PLANTAS', (3.6, YF - 0.5, 3.0), 8.95, 9.5, 'medida')):
    o = B.texto(nombre, txt, M[mat], loc, tam=1.4)
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, t0, 0.3)
    quitar(o, t1, 0.2)
cloro = B.raiz('cloro', (-2.5, YF - 0.6, 1.6))
B.hijos(cloro, [B.cilindro('bot', 0.22, 0.7, 'z', M['blanco'], (0, 0, -0.35)),
                B.cilindro('tap', 0.1, 0.12, 'z', M['flecha_roja'], (0, 0, 0.35))])
cruz = B.raiz('cruz', (-2.5, YF - 0.9, 1.6))
for a in (0.785, -0.785):
    b_ = D.caja('cruz', -0.8, 0.8, -0.04, 0.04, -0.07, 0.07, M['flecha_roja'])
    b_.rotation_euler = (0, a, 0)
    b_.parent = cruz
for o, t0 in ((cloro, 1.5), (cruz, 2.0)):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, t0, 0.25)
    quitar(o, 3.4, 0.2)

# nadador flotando
nad = B.raiz('nadador', (-2.6, Y0 + 2.0, NIV + 0.02))
B.hijos(nad, [B.cilindro('torso', 0.2, 0.7, 'x', M['malla'], (-0.35, 0, 0)), B.esfera('cabeza', 0.17, M['piel'], (0.55, 0, 0.05)),
              B.cilindro('piernas', 0.13, 0.85, 'x', M['piel'], (-1.2, 0, 0)),
              B.cilindro('brazo', 0.06, 0.6, 'y', M['piel'], (0.1, -0.7, 0)), B.cilindro('brazo', 0.06, 0.6, 'y', M['piel'], (0.1, 0.1, 0))])
key(nad, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(nad, 27.4, 0.3)
for k in range(8):
    key(nad, 'location', 27.6 + 0.5 * k, (-2.6 + 0.05 * k, Y0 + 2.0, NIV + 0.02 + 0.04 * (k % 2)))
quitar(nad, 31.8, 0.2)

# ranas
def rana(nombre, loc, t, s=1.0):
    r = B.raiz(nombre, loc)
    B.hijos(r, [B.esfera('cuerpo', 0.16, M['rana'], (0, 0, 0.08), esc=(1.2, 1.0, 0.65)),
                B.esfera('ojo', 0.06, M['rana'], (0.08, -0.08, 0.2)), B.esfera('ojo', 0.06, M['rana'], (-0.08, -0.08, 0.2)),
                B.esfera('pup', 0.035, M['pupila'], (0.08, -0.13, 0.22)), B.esfera('pup', 0.035, M['pupila'], (-0.08, -0.13, 0.22))])
    key(r, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(r, t, 0.25, s)
    key(r, 'location', t + 0.6, loc)
    key(r, 'location', t + 0.8, (loc[0], loc[1], loc[2] + 0.25))
    key(r, 'location', t + 1.0, loc)
    return r


lugares = [(DIV[1] + 0.6 + 0.6 * k, YF + 0.5 + (k % 3) * 1.4, NIV + 0.03) for k in range(8)]
lugares += [(X0 + 0.3 + 0.5 * k, YF + 0.2 + 0.1 * (k % 2), 0.1) for k in range(6)]
lugares += [(X0 - 3.5 + 0.6 * k, YF + 0.5 + 0.4 * (k % 3), 0.12) for k in range(6)]
lugares += [(X1 - 0.1, YF + 0.4 + 0.8 * k, 0.1) for k in range(6)]
for i, l in enumerate(lugares):
    rana(f'rana{i}', l, 34.26 if i < 3 else 35.2 + 0.05 * i, 1.4)

# casa y fondo
B.casa_patio(M, HX=-2.0, HY=13.0)

TOMAS = [
    (0.0, (-1.0, -17.0, 5.0), (0.5, 1.5, -0.4)),
    (1.4, (-2.4, -12.0, 2.4), (-2.4, 0.0, 0.6)),
    (3.6, (-1.5, -13.5, 2.6), (-1.0, 0.5, 0.0)),
    (4.6, (0.5, -18.5, 4.6), (0.5, 1.0, -0.2)),
    (9.5, (0.5, -15.5, 1.0), (1.0, 0.0, -1.0)),
    (13.2, (3.6, -11.0, -0.2), (3.6, 0.0, -1.2)),
    (19.0, (3.2, -11.5, 0.6), (3.2, 0.0, -0.6)),
    (22.9, (0.0, -11.0, -0.2), (-1.0, 0.0, -1.2)),
    (23.3, (0.5, -15.5, 1.2), (0.6, 0.0, -0.9)),
    (27.3, (0.4, -15.0, 1.0), (0.6, 0.0, -0.9)),
    (27.5, (-2.6, -10.5, 2.4), (-2.6, 1.8, -0.2)),
    (31.6, (-2.3, -10.2, 2.2), (-2.4, 1.8, -0.2)),
    (32.0, (1.0, -15.0, 3.2), (1.0, 1.5, -0.2)),
    (34.2, (2.5, -11.5, 2.0), (2.6, 1.5, -0.2)),
    (35.2, (0.0, -17.0, 3.6), (0.0, 1.0, -0.2)),
    (DUR, (0.0, -15.0, 3.0), (0.0, 1.0, -0.2)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
