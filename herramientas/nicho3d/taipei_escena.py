"""30 — La bola gigante dentro del rascacielos (Taipei 101). Audio: .tmp_render/lote3/a4_limpio.m4a (35.8 s)."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(30)
DUR = 36.4
TC = 6.2
M = B.materiales()
M.update({
    'fachada': D.liso('fachada', (0.18, 0.42, 0.42), 0.15, metal=0.5),
    'marco_t': D.liso('marco_t', (0.75, 0.8, 0.8), 0.3, metal=0.5),
    'interior': D.liso('interior', (0.82, 0.8, 0.76), 0.6),
    'oro': D.liso('oro', (1.0, 0.72, 0.08), 0.25, metal=0.8),
    'cable_n': D.liso('cable_n', (0.08, 0.08, 0.09), 0.5),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
YT0, YT1 = Y0, Y0 + 6.0
ZCAV0, ZCAV1 = 22.6, 26.4      # hueco donde cuelga la bola (pisos 87 a 92)

# ---------- suelo y ciudad ----------
G.frente('f_suelo', -45, 45, -14.0, 0.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.12)
suelo = D.caja('suelo', -120, 120, Y0, Y0 + 200, -14.0, 0.0, M['tierra'])
D.caja('vereda', -120, 120, Y0, Y0 + 200, 0.0, 0.05, M['concreto'])
rnd = random.Random(30)
for k in range(40):
    x = rnd.uniform(-60, 60)
    y = rnd.uniform(Y0 + 10, Y0 + 90)
    if abs(x) < 9 and y < Y0 + 16:
        continue
    w = rnd.uniform(2, 5)
    D.caja('edif', x, x + w, y, y + w, 0.05, rnd.uniform(3, 11), M['vidrio'] if k % 3 else M['muro'])
hojas = D.pbr('cerro', 'forest_leaves_02', tam=6.0, tinte=(0.1, 0.3, 0.06), fac=0.6)
for x, r, h in ((-80, 40, 22), (-20, 45, 28), (45, 40, 24), (100, 45, 20)):
    B.esfera('cerro', 1.0, hojas, (x, Y0 + 150, 0), esc=(r, 18, h))

# ---------- torre (todo cuelga de 'torre', que se balancea desde la base) ----------
torre = B.raiz('torre')
hueco = D.caja('hueco', -2.45, 2.45, YT0 - 1.0, YT1 - 0.6, ZCAV0, ZCAV1)
piezas = [D.caja('podio', -4.5, 4.5, YT0, YT1 + 1.5, 0.05, 5.0, M['fachada'])]
for i in range(8):
    z0 = 5.0 + i * 2.6
    piezas.append(D.prisma_y('segm', [(-2.5, z0), (2.5, z0), (3.25, z0 + 2.6), (-3.25, z0 + 2.6)], YT0, YT1, M['fachada']))
piezas.append(D.caja('cima', -2.0, 2.0, YT0 + 0.8, YT1 - 0.8, 25.8, 28.6, M['fachada']))
piezas.append(D.caja('cima2', -1.2, 1.2, YT0 + 1.6, YT1 - 1.6, 28.6, 30.0, M['fachada']))
for o in piezas:
    D.restar(o, hueco)
    D.aplicar_mods(o)
piezas.append(B.cilindro('aguja', 0.22, 6.0, 'z', M['marco_t'], (0, (YT0 + YT1) / 2, 30.0)))
# franjas de los pisos en la fachada
for i in range(8):
    z0 = 5.0 + i * 2.6
    for j in range(1, 4):
        z = z0 + j * 0.65
        if ZCAV0 - 0.1 < z < ZCAV1 + 0.1:
            continue
        hw = 2.5 + 0.75 * j / 4
        piezas.append(D.caja('franja', -hw, hw, YT0 - 0.03, YT0 + 0.02, z - 0.05, z + 0.05, M['marco_t']))
# interior del hueco
piezas.append(D.caja('piso87', -2.45, 2.45, YT0, YT1 - 0.6, ZCAV0 - 0.15, ZCAV0, M['interior']))
piezas.append(D.caja('techo92', -2.45, 2.45, YT0, YT1 - 0.6, ZCAV1, ZCAV1 + 0.15, M['interior']))
piezas.append(D.caja('fondo', -2.45, 2.45, YT1 - 0.62, YT1 - 0.6, ZCAV0, ZCAV1, M['interior']))
B.hijos(torre, piezas)

# ---------- amortiguador: bola colgada ----------
ZP = ZCAV1 - 0.05
pend = B.raiz('pendulo', (0, YT0 + 2.6, ZP))
pend.parent = torre
pp = [B.esfera('bola', 1.15, M['oro'], (0, 0, -2.25))]
for dx in (-0.55, 0.55):
    for dy in (-0.5, 0.5):
        c = B.cilindro('cable', 0.05, 2.0, 'z', M['cable_n'], (dx * 0.6, dy * 0.6, -2.0))
        c.rotation_euler = (math.atan2(dy * 0.4, 2.0), -math.atan2(dx * 0.4, 2.0), 0)
        pp.append(c)
B.hijos(pend, pp)
B.gancho([pend], TC)
pop(pend, 20.2, 0.35)


def amp_torre(t):
    if t < TC:
        return 0.8
    if t < 10.7:
        return 0.5
    if t < 16.5:
        return 0.5 + 3.5 * min(1.0, (t - 10.7) / 2.5)
    if t < 22.9:
        return 1.0
    if t < 28.2:
        return 2.6
    if t < 30.7:
        return 2.6 - 1.9 * (t - 28.2) / 2.5
    if t < 34.1:
        return 1.0
    return 0.8


def amp_bola(t):
    if t < TC:
        return -2.0
    if t < 22.9:
        return 0.0
    if t < 28.2:
        return -7.0
    if t < 30.7:
        return -7.0 + 3.5 * (t - 28.2) / 2.5
    if t < 34.1:
        return -16.0
    return -2.0


t = 0.0
while t <= DUR + 0.01:
    fase = math.sin(2 * math.pi * t / 2.6)
    key(torre, 'rotation_euler', t, (0, math.radians(amp_torre(t) * fase), 0), 'LINEAR')
    key(pend, 'rotation_euler', t, (0, math.radians(amp_bola(t) * fase), 0), 'LINEAR')
    t = round(t + 0.1, 2)

# ---------- carteles ----------
def cartel(nombre, s, m, loc, tam, t_on, t_off, padre=None):
    o = G.letrero(nombre, s, m, loc, tam=tam, t_on=t_on, t_off=t_off)
    if padre:
        o.parent = padre
    return o


cartel('ton', '660 t', M['medida'], (0.0, YT0 - 0.8, ZCAV0 + 0.7), 0.9, 2.5, 6.0, torre)
cartel('taipei', 'TAIPEI 101', M['etiqueta'], (0.0, YT0 - 1.0, 38.0), 2.6, 6.6, 10.6)
cartel('taiwan', 'TAIWÁN', M['etiqueta'], (0.0, YT0 - 1.0, 35.2), 1.6, 8.0, 10.6)
cartel('p87', '87', M['medida'], (-3.4, YT0 - 0.6, ZCAV0 + 0.2), 0.8, 17.9, 22.6, torre)
cartel('p92', '92', M['medida'], (-3.4, YT0 - 0.6, ZCAV1 - 0.3), 0.8, 18.8, 22.6, torre)
for k in range(5):
    B.flujo(f'viento{k}', M['flecha_gris'], (-16.0, YF - 1.5, 12.0 + 3.5 * k), (-5.0, YF - 1.5, 12.0 + 3.5 * k), 'x',
            9.2 + 0.1 * k, 10.6, n=2, largo=2.2, grosor=0.14, sep=0.35)
    B.flujo(f'empuja{k}', M['flecha_gris'], (-16.0, YF - 1.5, 12.0 + 3.5 * k), (-5.0, YF - 1.5, 12.0 + 3.5 * k), 'x',
            11.0 + 0.1 * k, 13.0, n=3, largo=2.2, grosor=0.14, sep=0.4)
    B.flujo(f'tifon{k}', M['flecha_gris'], (-16.0, YF - 1.5, 15.0 + 2.5 * k), (-5.0, YF - 1.5, 15.0 + 2.5 * k), 'x',
            30.9 + 0.1 * k, 33.4, n=3, largo=2.2, grosor=0.14, sep=0.5)
# gente mareada arriba
mareo = B.raiz('mareo', (1.4, YT0 + 0.6, ZCAV1 + 0.15 + 2.0))
mareo.parent = torre
B.hijos(mareo, [B.cilindro('cuerpo', 0.22, 0.9, 'z', M['postigo'], (0, 0, -1.9)),
                B.esfera('cabeza', 0.22, D.liso('verde', (0.55, 0.85, 0.35), 0.5), (0, 0, -0.75))])
key(mareo, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(mareo, 14.7, 0.3)
quitar(mareo, 16.4, 0.2)
# flechas: la torre va para un lado, la bola tira para el otro
for k, (d, x, t0) in enumerate((('x', -1.0, 24.0), ('-x', 1.0, 25.9))):
    f = B.flecha(f'tira{k}', 1.4, M['flecha_roja'] if k == 0 else M['flecha_verde'], (x, YT0 - 0.7, ZCAV0 - 1.0), d, 0.1)
    f.parent = torre
    key(f, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(f, t0, 0.25)
    quitar(f, 28.1, 0.2)
# 1 metro
uno = B.raiz('uno_m', (0.0, YT0 - 0.7, ZCAV0 - 0.9))
uno.parent = torre
B.hijos(uno, [B.flecha('m1a', 1.1, M['medida'], (0, 0, 0), 'x', 0.08), B.flecha('m1b', 1.1, M['medida'], (0, 0, 0), '-x', 0.08)])
t1 = G.letrero('uno_t', '1 METRO', M['medida'], (0, 0, -0.7), tam=0.7)
t1.parent = uno
key(uno, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(uno, 33.0, 0.3)
quitar(uno, 34.0, 0.2)

# ---------- camara ----------
GANCHO = ((0.0, -13.0, 24.6), (0.0, Y0 + 2.0, 24.2))
ANCHO = ((0.0, -40.0, 18.0), (0.0, Y0 + 3.0, 18.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (0.0, -14.5, 24.8), (0.0, Y0 + 2.0, 24.2), 'CORTE'),
    (TC, *ANCHO),
    (10.6, (0.0, -42.0, 18.5), (0.0, Y0 + 3.0, 18.5)),
    (14.2, (2.0, -30.0, 22.0), (0.0, Y0 + 3.0, 22.0)),
    (16.3, (1.0, -31.0, 22.0), (0.0, Y0 + 3.0, 22.0)),
    (17.6, (0.0, -15.5, 24.4), (0.0, Y0 + 2.0, 24.2)),
    (22.6, (0.0, -16.5, 24.4), (0.0, Y0 + 2.0, 24.0)),
    (23.6, (0.0, -24.0, 21.0), (0.0, Y0 + 3.0, 20.5)),
    (28.0, (0.0, -25.0, 21.0), (0.0, Y0 + 3.0, 20.5)),
    (28.8, *ANCHO),
    (30.6, (0.0, -41.0, 18.0), (0.0, Y0 + 3.0, 18.0)),
    (31.4, (0.0, -19.0, 23.5), (0.0, Y0 + 2.0, 23.5)),
    (34.0, (0.0, -18.0, 23.5), (0.0, Y0 + 2.0, 23.5), 'CORTE'),
    (34.1, *GANCHO),
    (DUR, (0.0, -14.4, 24.8), (0.0, Y0 + 2.0, 24.2)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
