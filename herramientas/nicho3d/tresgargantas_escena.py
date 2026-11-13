"""27 — La presa que freno la Tierra (Tres Gargantas). Audio: .tmp_render/lote3/a1_limpio.m4a (39.4 s)."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar  # noqa: E402

opt, salida = B.inicio(27)
DUR = 40.0
TC = 4.3
M = B.materiales()
M.update({
    'presa': D.pbr('presa', 'rough_concrete', tam=2.0, tinte=(0.72, 0.71, 0.68), fac=0.5, brillo=1.25),
    'roca': D.pbr('roca', 'excavated_soil_wall', tam=2.5, tinte=(0.45, 0.4, 0.36), fac=0.5),
    'oceano': D.liso('oceano', (0.05, 0.25, 0.65), 0.35),
    'continente': D.liso('continente', (0.2, 0.55, 0.15), 0.6),
    'hielo': D.liso('hielo', (0.85, 0.92, 1.0), 0.2),
    'vestido': D.liso('vestido', (0.9, 0.2, 0.45), 0.5),
    'piel': D.liso('piel', (0.95, 0.75, 0.6), 0.5),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'pato': D.liso('pato', (1.0, 0.82, 0.05), 0.35),
    'pico': D.liso('pico', (1.0, 0.45, 0.05), 0.4),
})
sup = D.agua('emb_sup', col=(0.04, 0.3, 0.38), alpha=1.0)
sup.surface_render_method = 'DITHERED'

ZB = -6.0                      # fondo del valle
ZC = 4.0                       # coronamiento de la presa
Z_LLENO, Z_BAJO, Z_RIO = 3.4, -3.0, -4.5
YL = Y0 + 24                   # la presa cruza el valle hasta la montana del fondo

# ---------- terreno ----------
G.frente('f_roca', -45, 45, -40.0, ZB, M['roca'], 'excavated_soil_wall', fuerza=0.3, res=0.12)
D.caja('lecho', -60, 60, Y0, YL + 40, -40.0, ZB, M['roca'])
monte = D.caja('monte', -60, 60, YL, YL + 60, ZB, 7.0, M['tierra'])
monte.data.materials.append(M['pasto'])
D.por_normal(monte, lambda n, c: 1 if n.z > 0.9 else 0)
hojas = D.pbr('cerro', 'forest_leaves_02', tam=6.0, tinte=(0.1, 0.3, 0.06), fac=0.6)
for x, y, r, h in ((-40, YL + 10, 22, 16), (-8, YL + 18, 26, 20), (25, YL + 12, 22, 15), (50, YL + 20, 30, 18),
                   (-55, Y0 + 10, 14, 12), (52, Y0 + 8, 14, 10)):
    B.esfera('cerro', 1.0, hojas, (x, y, 5), esc=(r, r * 0.6, h))

# ---------- presa ----------
presa = D.prisma_y('presa', [(-1.0, ZB), (4.5, ZB), (1.0, ZC), (-1.0, ZC)], Y0, YL + 1, M['presa'])
D.caja('camino', -1.0, 1.0, Y0, YL + 1, ZC, ZC + 0.08, M['negro'])
for k in range(9):
    y = Y0 + 1.5 + k * 2.6
    D.caja('compuerta', 1.6, 2.0, y, y + 1.2, -1.0, 2.2, M['acero'])
    D.caja('poste', -1.0, -0.85, y, y + 0.15, ZC, ZC + 0.6, M['blanco'])

# ---------- agua ----------
emb = B.caja_o('emb', -60, -1.0, Y0, Y0 + 0.02, ZB, Z_LLENO, M['agua'], (0, Y0, ZB))
emb_sup = B.caja_o('emb_sup', -60, -1.0, Y0 + 0.02, YL, -0.02, 0.0, sup, (0, Y0, 0))
D.caja('rio', 3.0, 60, Y0, Y0 + 0.02, ZB, Z_RIO, M['agua'])
D.caja('rio_sup', 3.0, 60, Y0 + 0.02, YL, Z_RIO - 0.02, Z_RIO, sup)


def nivel(t, z, interp='BEZIER'):
    key(emb, 'scale', t, (1, 1, (z - ZB) / (Z_LLENO - ZB)), interp)
    key(emb_sup, 'location', t, (0, Y0, z), interp)


nivel(0.0, Z_LLENO, 'CONSTANT')
nivel(11.4, Z_LLENO, 'CONSTANT')
nivel(11.45, Z_BAJO)
nivel(11.8, Z_BAJO)
nivel(14.4, Z_LLENO)

# ---------- la Tierra ----------
GX, GY, GZ = -7.0, Y0 + 9.0, 13.0
tierra_r = B.raiz('tierra_r', (GX, GY, GZ))
tierra_r.rotation_euler = (math.radians(23), 0, 0)
globo = B.raiz('globo')
globo.parent = tierra_r
partes = [B.esfera('oceano', 2.4, M['oceano'], (0, 0, 0))]
rnd = random.Random(5)
for k in range(9):
    th, ph = rnd.uniform(0, 2 * math.pi), rnd.uniform(-1.0, 1.0)
    p = (2.25 * math.cos(ph) * math.cos(th), 2.25 * math.cos(ph) * math.sin(th), 2.25 * math.sin(ph))
    e = B.esfera('cont', rnd.uniform(0.6, 1.0), M['continente'], p, esc=(1.0, 1.0, 0.5))
    e.rotation_euler = (0, math.pi / 2 - ph, th)
    partes.append(e)
B.hijos(globo, partes)


def vel(t):
    """vueltas por segundo del globo."""
    if 3.4 <= t < TC:
        return 0.25 - 0.15 * (t - 3.4) / (TC - 3.4)
    if 20.8 <= t < 22.0:
        return 0.25 - 0.15 * (t - 20.8) / 1.2
    if 22.0 <= t < 37.2:
        return 0.1
    return 0.25


ang, t = 0.0, 0.0
while t <= DUR + 0.01:
    key(globo, 'rotation_euler', t, (0, 0, ang), 'LINEAR')
    ang += 2 * math.pi * vel(t) * 0.25
    t += 0.25

# ---------- patinadora ----------
pat = B.raiz('patinadora', (GX, GY, GZ - 2.0))
pista = B.cilindro('pista', 1.6, 0.12, 'z', M['hielo'], (GX, GY, GZ - 2.12))
pista.parent = None
cuerpo = B.raiz('cuerpo')
cuerpo.parent = pat
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.6, radius2=0.18, depth=1.4, location=(0, 0, 1.3))
falda = bpy.context.object
falda.data.materials.append(M['vestido'])
brazos = B.raiz('brazos', (0, 0, 1.9))
B.hijos(brazos, [D.caja('brazo', -1.3, 1.3, -0.07, 0.07, -0.07, 0.07, M['piel'])])
B.hijos(cuerpo, [falda, B.esfera('cabeza', 0.28, M['piel'], (0, 0, 2.3)), B.esfera('pelo', 0.24, M['negro'], (0, 0.08, 2.42)),
                 B.cilindro('pierna', 0.07, 0.6, 'z', M['piel'], (0, 0, 0.0)), brazos])
for o in (pat, pista):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, 17.4, 0.3)
    quitar(o, 20.5, 0.15)
key(brazos, 'scale', 0.0, (0.22, 1, 1), 'CONSTANT')
key(brazos, 'scale', 18.4, (0.22, 1, 1))
key(brazos, 'scale', 18.9, (1, 1, 1))
key(cuerpo, 'rotation_euler', 17.3, (0, 0, 0), 'LINEAR')
key(cuerpo, 'rotation_euler', 18.65, (0, 0, 2 * math.pi * 2.4 * 1.35), 'LINEAR')
key(cuerpo, 'rotation_euler', 20.7, (0, 0, 2 * math.pi * (2.4 * 1.35 + 0.45 * 2.05)), 'LINEAR')
key(tierra_r, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
quitar(tierra_r, 17.2, 0.15)
pop(tierra_r, 20.65, 0.3)

# ---------- carteles ----------
G.letrero('nombre', 'TRES GARGANTAS', M['etiqueta'], (-3.0, Y0 + 2, 6.8), tam=1.5, t_on=5.4, t_off=8.1)
G.letrero('largo', '2 KM', M['medida'], (1.5, Y0 + 12, 6.6), tam=2.6, t_on=8.2, t_off=11.3)
B.medida('alto', -1.5, ZC, ZB, '185 m', M, 9.6, 11.3, lado=-1.3)
for k, x in enumerate((-22, -14, -6)):
    B.flujo(f'peso{k}', M['flecha_roja'], (x, YF - 0.5, 7.0), (x, YF - 0.5, 4.0), '-z', 16.2 + 0.1 * k, 17.1, n=2, largo=1.0, grosor=0.1)
dia = G.letrero('dia', 'DÍA +0,00000006 s', M['medida'], (GX, GY - 3.0, GZ - 3.4), tam=0.7, t_on=22.6, t_off=26.0)

# ---------- ascensor de barcos ----------
XA = 8.0
asc = B.raiz('ascensor', (XA, Y0, ZB))
torres = []
for x0, x1 in ((-2.6, -2.0), (2.0, 2.6)):
    torres.append(D.caja('torre', x0, x1, 0.3, 3.4, 0.0, 13.2, M['presa']))
torres.append(D.caja('viga', -2.6, 2.6, 0.3, 3.4, 13.2, 13.8, M['presa']))
for k in range(8):
    torres.append(B.cilindro('cable', 0.03, 9.0, 'z', M['acero'], (-1.6 + 0.45 * k, 1.85, 4.2)))
B.hijos(asc, torres)
caj = B.raiz('cajon', (XA, Y0 + 1.85, Z_RIO - 0.3))
pc = [D.caja('cajon_piso', -1.95, 1.95, -1.4, 1.4, -0.7, -0.45, M['acero_claro'])]
for x0, x1, y0, y1 in ((-1.95, -1.85, -1.4, 1.4), (1.85, 1.95, -1.4, 1.4), (-1.95, 1.95, 1.3, 1.4)):
    pc.append(D.caja('cajon_pared', x0, x1, y0, y1, -0.7, 0.45, M['acero_claro']))
pc.append(D.caja('cajon_agua', -1.85, 1.85, -1.4, 1.3, -0.45, 0.3, M['agua']))
barco = G.barco('barco', M, (0.0, 0.0, -0.05), largo=4.0, ancho=1.4)
barco.scale = (0.75, 0.75, 0.75)
pc.append(barco)
B.hijos(caj, pc)
pato = B.raiz('pato', (1.25, -0.9, 0.3))
pato.parent = caj
B.hijos(pato, [B.esfera('pato_c', 0.22, M['pato'], (0, 0, 0.06), esc=(1.3, 1.0, 0.8)),
               B.esfera('pato_cab', 0.13, M['pato'], (0.2, 0, 0.28)),
               B.esfera('pato_ojo', 0.025, M['negro'], (0.28, -0.1, 0.33))])
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.055, radius2=0.0, depth=0.12, location=(0.36, 0, 0.26), rotation=(0, math.pi / 2, 0))
bpy.context.object.data.materials.append(M['pico'])
bpy.context.object.parent = pato
key(pato, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(pato, 35.8, 0.3)

Z_ARR = Z_LLENO - 0.3
# gancho: ascensor arriba; luego desaparece y vuelve a aparecer abajo a los 29.4
B.gancho([asc, caj], TC)
pop(asc, 29.5, 0.35)
pop(caj, 29.6, 0.35)
key(caj, 'location', 0.0, (XA, Y0 + 1.85, Z_ARR), 'CONSTANT')
key(caj, 'location', TC, (XA, Y0 + 1.85, Z_RIO - 0.3), 'CONSTANT')
key(caj, 'location', 32.8, (XA, Y0 + 1.85, Z_RIO - 0.3))
key(caj, 'location', 36.4, (XA, Y0 + 1.85, Z_ARR))
B.flujo('sube', M['flecha_verde'], (XA - 3.1, YF - 0.5, -3.0), (XA - 3.1, YF - 0.5, 2.0), 'z', 32.9, 35.6, n=3, largo=0.9, sep=0.5)
B.medida('m113', XA + 3.2, Z_LLENO, Z_RIO, '113 m', M, 34.4, 37.0, lado=1.5)

# ---------- camara ----------
TOMAS = [
    (0.0, (-2.5, -26.0, 8.5), (-2.5, Y0 + 6, 5.5)),
    (TC, (-2.8, -27.5, 9.2), (-2.5, Y0 + 6, 5.5), 'CORTE'),
    (TC + 0.05, (-12.0, -20.0, 14.0), (1.0, Y0 + 10, 1.0)),
    (8.0, (-10.0, -21.0, 13.0), (1.0, Y0 + 10, 2.0)),
    (9.4, (-8.0, -22.0, 6.0), (-1.0, Y0 + 4, 0.0)),
    (11.4, (-8.5, -21.0, 4.0), (-4.0, Y0, -1.0)),
    (15.5, (-12.0, -22.0, 6.0), (-10.0, Y0, 2.0)),
    (17.2, (-12.5, -23.0, 6.5), (-10.0, Y0, 2.0), 'CORTE'),
    (17.3, (GX, GY - 9.0, GZ - 0.5), (GX, GY, GZ - 0.9)),
    (20.5, (GX, GY - 8.0, GZ - 0.6), (GX, GY, GZ - 0.9)),
    (22.3, (GX, GY - 10.5, GZ - 1.2), (GX, GY, GZ - 1.6)),
    (25.9, (GX + 1.0, GY - 11.0, GZ - 1.5), (GX, GY, GZ - 1.8)),
    (27.0, (4.0, -20.0, 4.0), (XA, Y0 + 2, 1.0)),
    (29.4, (6.0, -19.0, 2.0), (XA, Y0 + 2, 1.5)),
    (32.6, (6.0, -18.0, -1.0), (XA, Y0 + 2, -2.0)),
    (36.4, (6.5, -18.0, 4.0), (XA, Y0 + 2, 2.5)),
    (37.1, (6.5, -18.5, 4.2), (XA, Y0 + 2, 2.6), 'CORTE'),
    (37.2, (-2.5, -26.0, 8.5), (-2.5, Y0 + 6, 5.5)),
    (DUR, (-2.7, -27.0, 9.0), (-2.5, Y0 + 6, 5.5)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
