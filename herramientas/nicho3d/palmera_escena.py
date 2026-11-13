"""28 — La isla hecha con arena escupida (Palm Jumeirah). Audio: .tmp_render/lote3/a2_limpio.m4a (38.1 s)."""
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

opt, salida = B.inicio(28)
DUR = 38.7
TC = 3.0
M = B.materiales()
M.update({
    'arena': D.pbr('arena', 'coast_sand_01', tam=2.0, tinte=(0.85, 0.72, 0.5), fac=0.4, brillo=1.2),
    'arena_d': D.liso('arena_d', (0.98, 0.86, 0.55), 0.8),
    'chorro': D.liso('chorro', (0.92, 0.7, 0.38), 0.6, emit=0.4),
    'fondo': D.pbr('fondo', 'coast_sand_01', tam=2.0, tinte=(0.6, 0.52, 0.38), fac=0.4),
    'roca': D.pbr('roca_m', 'rough_concrete', tam=1.0, tinte=(0.45, 0.43, 0.4), fac=0.6),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'cruz': D.liso('cruz', (1.0, 0.08, 0.05), 0.4, emit=2.5),
    'palma': D.liso('palma', (0.12, 0.45, 0.12), 0.6),
})
mar_sup = D.agua('mar_sup', col=(0.02, 0.38, 0.5), alpha=1.0)
mar_sup.surface_render_method = 'DITHERED'
ZF, ZT = -3.0, 0.6             # fondo del mar / alto de la isla
YC = Y0 + 11.0                 # centro de la media luna

# ---------- mar y fondo ----------
G.frente('f_fondo', -45, 45, -40.0, ZF, M['fondo'], 'excavated_soil_wall', fuerza=0.25, res=0.12)
D.caja('lecho', -80, 80, Y0, Y0 + 90, -40.0, ZF, M['fondo'])
D.caja('mar', -80, 80, Y0, Y0 + 0.02, ZF, 0.0, M['agua'])
D.caja('mar_s', -80, 80, Y0 + 0.02, Y0 + 90, -0.02, 0.0, mar_sup)
# costa de Dubai al fondo (tierra y torres)
costa = D.caja('costa', -300, 300, Y0 + 40, Y0 + 400, ZF, 0.5, M['arena'])
rnd = random.Random(8)
for k in range(16):
    x = -36 + k * 4.8 + rnd.uniform(-0.8, 0.8)
    h = rnd.uniform(3, 11)
    D.caja('torre', x, x + 1.6, Y0 + 44, Y0 + 45.6, 0.5, 0.5 + h, M['vidrio'] if k % 3 else M['blanco'])

# ---------- isla ----------
tronco = D.prisma_y('tronco', [(-2.2, ZF), (2.2, ZF), (1.2, ZT), (-1.2, ZT)], 0.0, 15.5, M['arena'])
tronco.location = (0, Y0, 0)
hojas = []
for k, (yy, ang) in enumerate([(7.5, 60), (9.5, 52), (11.5, 44), (13.5, 36)] * 2):
    lado = 1 if k < 4 else -1
    h = D.prisma_y('hoja', [(-0.75, ZF), (0.75, ZF), (0.55, ZT), (-0.55, ZT)], 0.0, 8.0 - 0.6 * (k % 4), M['arena'])
    h.location = (0, Y0 + yy, 0)
    h.rotation_euler = (0, 0, -lado * math.radians(ang))
    hojas.append(h)
copa = D.prisma_y('copa', [(-1.8, ZF), (1.8, ZF), (1.0, ZT), (-1.0, ZT)], 0.0, 3.0, M['arena'])
copa.location = (0, Y0 + 15.5, 0)
# palmeras de verdad sobre la isla
arboles = []
for k in range(10):
    y = Y0 + 1.5 + k * 1.5
    for x in (-0.8, 0.8):
        if rnd.random() < 0.5:
            p = B.raiz('palm', (x, y, ZT))
            B.hijos(p, [B.cilindro('palm_t', 0.05, 0.8, 'z', M['madera'], (0, 0, 0)),
                        B.esfera('palm_h', 0.35, M['palma'], (0, 0, 0.85), esc=(1, 1, 0.35))])
            arboles.append(p)
# media luna de rocas
rocas = []
for k in range(44):
    a = math.radians(-20 + k * 220 / 43)
    x, y = 12.5 * math.cos(a), YC + 12.5 * math.sin(a)
    r = B.esfera('roca', rnd.uniform(0.7, 1.0), M['roca'], (x, y, 0.0), esc=(1.3, 1.0, 0.7))
    rocas.append(r)

B.gancho([tronco, copa] + hojas + arboles + rocas, TC)
B.crecer(tronco, 1, 9.3, 12.6)
for k, h in enumerate(hojas):
    B.crecer(h, 1, 17.4 + 0.33 * (k % 4) + 0.15 * (k // 4), 18.2 + 0.33 * (k % 4) + 0.15 * (k // 4))
B.crecer(copa, 1, 19.6, 20.3)
for k, p in enumerate(arboles):
    pop(p, 20.0 + 0.04 * k, 0.25)
for k, r in enumerate(rocas):
    pop(r, 21.1 + 0.035 * k, 0.25)

# ---------- draga ----------
XD = -9.0
draga = G.barco('draga', M, (XD, Y0 + 1.2, -0.3), largo=5.0, ancho=1.6, color=(0.9, 0.45, 0.08))
tubo = B.cilindro('succion', 0.18, 3.0, 'z', M['acero'], (XD - 1.0, Y0 + 1.2, ZF + 0.1))
pop(draga, TC + 0.3, 0.3)
key(tubo, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
B.crecer(tubo, 2, 6.9, 7.4)
quitar(tubo, 13.0, 0.2)
quitar(draga, 13.0, 0.2)
B.flujo('chupa', M['flecha_gris'], (XD - 1.0, Y0 + 0.8, ZF + 0.2), (XD - 1.0, Y0 + 0.8, -0.2), 'z', 7.4, 8.8, n=3, largo=0.7, sep=0.35)

# chorro en arco (arcoiris de arena)
pts = []
for k in range(17):
    u = k / 16
    pts.append((XD + 2.6 + u * 8.0, Y0 + 1.2 + u * 3.0, 1.2 + 6.5 * 4 * u * (1 - u) - 0.9 * u))
chorro = B.curva('chorro', pts, M['chorro'], grosor=0.22)
key(chorro, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(chorro, 'scale', 3.3, (1, 1, 1), 'CONSTANT')
B.trazar(chorro, 3.35, 4.3)
quitar(chorro, 13.0, 0.2)
gotas = []
for k in range(14):
    g = B.esfera('gota', 0.09, M['chorro'], pts[k + 1])
    key(g, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(g, 4.3 + 0.03 * k, 0.15)
    for j, t in enumerate((10.0, 10.4, 10.8, 11.2, 11.6, 12.0, 12.4)):
        q = pts[k + 1]
        key(g, 'location', t, (q[0] + 0.15 * ((j + k) % 3 - 1), q[1], q[2] + 0.15 * ((j * 2 + k) % 3 - 1)))
    quitar(g, 13.0, 0.2)
    gotas.append(g)

# ---------- arena del desierto (no sirve) ----------
XS = 9.0
bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=1.9, radius2=0.0, depth=1.8, location=(XS, Y0 + 2.6, 0.5))
monton = bpy.context.object
monton.data.materials.append(M['arena_d'])
key(monton, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(monton, 13.5, 0.3)
key(monton, 'scale', 16.2, (1, 1, 1))
key(monton, 'scale', 16.9, (0, 0, 0), 'CONSTANT')
G.letrero('desierto', 'DESIERTO', M['etiqueta'], (XS, Y0 + 1.0, 2.6), tam=0.7, t_on=14.0, t_off=16.9)
cruz = B.raiz('cruz', (XS, Y0 + 1.0, 0.9))
for s in (1, -1):
    x = D.caja('cruz_b', -1.1, 1.1, -0.08, 0.08, -0.1, 0.1, M['cruz'])
    x.rotation_euler = (0, s * math.pi / 4, 0)
    x.parent = cruz
key(cruz, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(cruz, 15.2, 0.25)
quitar(cruz, 16.9, 0.2)
B.flujo('olas_d', M['flecha_azul'], (XS - 3.5, Y0 + 0.6, 0.3), (XS + 0.5, Y0 + 0.6, 0.3), 'x', 15.9, 16.9, n=3, largo=0.8, sep=0.2)

# ---------- cifras ----------
G.letrero('m3', '94.000.000 m³', M['medida'], (0, Y0 + 6, 5.0), tam=2.3, t_on=18.0, t_off=20.6)
G.letrero('ton', '7.000.000 t', M['medida'], (0, YC + 14.0, 4.0), tam=2.8, t_on=22.4, t_off=25.6)
for k, (x0, x1, d, y) in enumerate(((-22, -15.5, 'x', YC), (22, 15.5, '-x', YC), (-20, -12.5, 'x', YC + 7), (20, 12.5, '-x', YC + 7))):
    B.flujo(f'ola{k}', M['flecha_azul'], (x0, y, 0.5), (x1, y, 0.5), d, 24.5, 25.5, n=2, largo=1.4, grosor=0.12)

# ---------- ni concreto ni acero ----------
iconos = []
for k, (x, m) in enumerate(((-1.6, M['concreto']), (1.6, M['acero']))):
    ic = B.raiz(f'icono{k}', (x, Y0 + 1.0, 2.6))
    if k == 0:
        partes = [D.caja('bloque', -0.6, 0.6, -0.4, 0.4, -0.45, 0.45, m)]
    else:
        partes = [D.caja('viga_a', -0.8, 0.8, -0.3, 0.3, 0.32, 0.45, m), D.caja('viga_b', -0.8, 0.8, -0.3, 0.3, -0.45, -0.32, m),
                  D.caja('viga_c', -0.8, 0.8, -0.06, 0.06, -0.32, 0.32, m)]
    for s in (1, -1):
        x2 = D.caja('cruz_i', -0.9, 0.9, -0.06, 0.06, -0.08, 0.08, M['cruz'])
        x2.location = (0, -0.5, 0)
        x2.rotation_euler = (0, s * math.pi / 4, 0)
        partes.append(x2)
    B.hijos(ic, partes)
    key(ic, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(ic, (27.5, 28.4)[k], 0.3)
    quitar(ic, 29.4, 0.2)
    iconos.append(ic)
rebote(tronco, 29.7, 1.0, 1.06)

# ---------- vibradores ----------
vib = []
for k, x in enumerate((-1.0, 0.0, 1.0)):
    v = B.raiz(f'vib{k}', (x, Y0 + 0.02, 4.0))
    B.hijos(v, [B.cilindro('vib_t', 0.13, 3.6, 'z', M['acero_claro'], (0, 0, -3.6)),
                D.caja('vib_m', -0.25, 0.25, -0.25, 0.25, 0.0, 0.5, M['amarillo'])])
    key(v, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(v, 31.5 + 0.12 * k, 0.25)
    key(v, 'location', 31.9, (x, Y0 + 0.02, 4.0))
    key(v, 'location', 32.5 + 0.1 * k, (x, Y0 + 0.02, 0.9))
    for j in range(24):
        t = 32.6 + 0.1 * k + j * 0.1
        key(v, 'location', t, (x + (0.06 if j % 2 else -0.06), Y0 + 0.02, 0.9 - 0.02 * (j % 3)), 'LINEAR')
    key(v, 'location', 35.2, (x, Y0 + 0.02, 0.9))
    key(v, 'location', 35.7, (x, Y0 + 0.02, 4.0))
    quitar(v, 35.8, 0.2)
    vib.append(v)
for k in range(3):
    B.flujo(f'aprieta{k}', M['flecha_verde'], (-1.8 + 1.8 * k, YF - 0.3, -0.2), (-1.8 + 1.8 * k, YF - 0.3, -1.6), '-z', 33.6, 34.8, n=1, largo=0.6)

# ---------- camara ----------
GANCHO = ((0.0, -18.0, 23.0), (0.0, YC + 1.0, -1.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (0.0, -17.0, 22.0), (0.0, YC + 1.0, -1.0), 'CORTE'),
    (TC, (-6.5, -12.0, 3.0), (-5.0, Y0 + 2.0, 0.2)),
    (6.8, (-9.0, -11.0, 1.5), (-9.5, Y0 + 1.5, -1.2)),
    (8.8, (-9.0, -11.5, 1.2), (-9.5, Y0 + 1.5, -1.4)),
    (9.6, (-3.5, -14.0, 7.5), (-1.0, Y0 + 5.0, 1.0)),
    (12.8, (-2.5, -15.0, 8.5), (0.0, Y0 + 6.0, 0.5)),
    (13.4, (7.5, -9.0, 3.2), (XS, Y0 + 2.6, 0.6)),
    (17.0, (7.5, -9.5, 3.2), (XS, Y0 + 2.6, 0.6), 'CORTE'),
    (17.1, (0.0, -15.0, 21.0), (0.0, Y0 + 9.0, -1.0)),
    (20.6, (0.0, -19.0, 25.0), (0.0, YC + 2.0, -1.0)),
    (25.6, (0.0, -21.0, 26.0), (0.0, YC + 2.0, -1.0)),
    (26.6, (0.0, -9.5, 3.8), (0.0, Y0 + 2.0, 1.0)),
    (30.4, (0.0, -10.5, 3.2), (0.0, Y0 + 1.5, 0.5)),
    (31.2, (0.0, -9.5, 2.0), (0.0, Y0, -0.4)),
    (35.9, (0.0, -10.0, 2.2), (0.0, Y0, -0.4), 'CORTE'),
    (36.0, *GANCHO),
    (DUR, (0.0, -17.2, 22.2), (0.0, YC + 1.0, -1.0)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
