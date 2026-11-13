"""29 — El aeropuerto que se esta hundiendo (Kansai). Audio: .tmp_render/lote3/a3_limpio.m4a (35.2 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(29)
DUR = 35.8
TC = 3.05
M = B.materiales()
M.update({
    'barro': D.pbr('barro', 'brown_mud_rocks_01', tam=1.6, tinte=(0.33, 0.35, 0.38), fac=0.75),
    'roca': D.pbr('roca_k', 'excavated_soil_wall', tam=2.5, tinte=(0.3, 0.26, 0.23), fac=0.6),
    'pista': D.liso('pista', (0.16, 0.16, 0.17), 0.7),
    'techo': D.liso('techo', (0.78, 0.8, 0.83), 0.3, metal=0.6),
    'avion_c': D.liso('avion_c', (0.1, 0.25, 0.65), 0.4),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'placa': D.liso('placa', (0.55, 0.57, 0.6), 0.35, metal=0.8),
})
sup = D.agua('mar_sup', col=(0.03, 0.32, 0.45), alpha=1.0)
sup.surface_render_method = 'DITHERED'
ZF = -3.0            # fondo del mar (arriba de la capa de barro)
ZBR = -9.0           # base del barro
ZI = 2.2             # alto original de la isla
HUNDE = 1.6          # cuanto se hunde
XI = 9.0
YI = Y0 + 20

# ---------- fondo: roca, barro, mar ----------
G.frente('f_roca', -45, 45, -40.0, ZBR, M['roca'], 'excavated_soil_wall', fuerza=0.3, res=0.12)
D.caja('roca', -80, 80, Y0, Y0 + 90, -40.0, ZBR, M['roca'])
D.caja('barro_i', -80, -XI, Y0, Y0 + 90, ZBR, ZF, M['barro'])
D.caja('barro_d', XI, 80, Y0, Y0 + 90, ZBR, ZF, M['barro'])
D.caja('barro_f', -XI, XI, YI, Y0 + 90, ZBR, ZF, M['barro'])
barro = B.caja_o('barro_bajo', -XI, XI, Y0, YI, ZBR, ZF, M['barro'], (0, Y0, ZBR))
for nm, x0, x1, y0 in (('mar_i', -80, -XI, Y0), ('mar_d', XI, 80, Y0)):
    D.caja(nm, x0, x1, Y0, Y0 + 0.02, ZF, 0.0, M['agua'])
    D.caja(nm + '_s', x0, x1, Y0 + 0.02, Y0 + 90, -0.02, 0.0, sup)
D.caja('mar_f_s', -XI, XI, YI, Y0 + 90, -0.02, 0.0, sup)
# costa de Osaka al fondo
D.caja('costa', -300, 300, Y0 + 70, Y0 + 400, ZF, 1.0, M['pasto'])
for k in range(5):
    B.esfera('cerro', 1.0, D.pbr('cerro', 'forest_leaves_02', tam=6.0, tinte=(0.1, 0.3, 0.06), fac=0.6),
             (-60 + 30 * k, Y0 + 95, 0), esc=(22, 12, 10 + 3 * (k % 2)))

# ---------- isla (todo lo que se hunde cuelga de 'isla') ----------
isla = B.raiz('isla')
bloque = B.caja_o('relleno', -XI, XI, Y0, YI, ZF, ZI, M['relleno'], (0, Y0, ZF))
tapa = B.caja_o('tapa', -XI, XI, Y0, YI, ZI, ZI + 0.05, M['concreto'], (0, Y0, ZF))
pista = D.caja('pista', -XI, XI, Y0 + 15, Y0 + 18, ZI + 0.05, ZI + 0.08, M['pista'])
rayas = [D.caja('raya', x, x + 0.8, Y0 + 16.4, Y0 + 16.6, ZI + 0.08, ZI + 0.09, M['blanco']) for x in range(-8, 9, 2)]
B.hijos(isla, [bloque, tapa, pista] + rayas)

# terminal: pivote en el extremo izquierdo para poder torcerla
XT0, XT1, ZT = -7.0, 7.0, ZI + 0.05
XC = [-6.0, -3.0, 0.0, 3.0, 6.0]
term = B.raiz('terminal', (XT0, Y0, ZT + 0.45))
term.parent = isla
tp = [D.caja('losa', 0.0, XT1 - XT0, 0.0, 6.0, 0.0, 0.3, M['concreto']),
      D.caja('vidrio', 0.2, XT1 - XT0 - 0.2, 5.6, 5.8, 0.3, 3.0, M['vidrio'])]
for x in XC:
    tp.append(D.caja('columna', x - XT0 - 0.15, x - XT0 + 0.15, 0.3, 0.6, -0.0, 3.2, M['acero_claro']))
n = 14
for k in range(n):
    xa, xb = (XT1 - XT0) * k / n - 0.5, (XT1 - XT0) * (k + 1) / n + 0.5
    za = 3.6 + 0.9 * math.sin(math.pi * k / n)
    zb = 3.6 + 0.9 * math.sin(math.pi * (k + 1) / n)
    seg = D.caja('techo', 0.0, xb - xa + 0.02, -0.2, 6.4, 0.0, 0.18, M['techo'])
    seg.location = (xa, 0, za)
    seg.rotation_euler = (0, -math.atan2(zb - za, xb - xa), 0)
    tp.append(seg)
for x in XC:
    tp.append(D.caja('soporte', x - XT0 - 0.1, x - XT0 + 0.1, 0.35, 0.55, 3.2, 3.6 + 0.9 * math.sin(math.pi * (x - XT0) / (XT1 - XT0)), M['acero_claro']))
B.hijos(term, tp)

# gatos hidraulicos bajo cada columna (quedan sobre la isla, no sobre la terminal)
gatos, pistones, placas = [], [], []
for k, x in enumerate(XC):
    g = B.raiz(f'gato{k}', (x, Y0 + 0.45, ZT))
    g.parent = isla
    cuerpo = D.caja('gato_c', -0.35, 0.35, -0.2, 0.2, 0.0, 0.3, M['amarillo'])
    piston = B.caja_o('gato_p', -0.12, 0.12, -0.12, 0.12, 0.3, 0.45, M['acero'], (0, 0, 0.3))
    B.hijos(g, [cuerpo, piston])
    key(g, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(g, 23.9 + 0.12 * k, 0.25, 1.4)
    gatos.append(g)
    pistones.append(piston)

# ---------- avion ----------
avion = B.raiz('avion')
B.hijos(avion, [B.cilindro('fus', 0.38, 4.2, 'x', M['blanco'], (-2.1, 0, 0.5)),
                B.esfera('nariz', 0.38, M['blanco'], (2.1, 0, 0.5), esc=(1.6, 1, 1)),
                D.caja('ala', -0.6, 0.4, -2.3, 2.3, 0.35, 0.45, M['blanco']),
                D.caja('cola', -2.1, -1.5, -0.05, 0.05, 0.6, 1.6, M['avion_c']),
                D.caja('estab', -2.1, -1.6, -0.9, 0.9, 0.85, 0.92, M['blanco']),
                D.caja('franja', -1.6, 1.6, -0.39, 0.39, 0.55, 0.65, M['avion_c'])])
YA = Y0 + 16.5
ZA = ZI + 0.08 - HUNDE


def aterriza(t0, t1):
    key(avion, 'scale', t0 - 0.05, (0, 0, 0), 'CONSTANT')
    key(avion, 'scale', t0, (1, 1, 1), 'CONSTANT')
    key(avion, 'location', t0, (-11.0, YA, ZA + 4.0), 'LINEAR')
    key(avion, 'rotation_euler', t0, (0, -0.12, 0), 'LINEAR')
    tm = t0 + (t1 - t0) * 0.75
    key(avion, 'location', tm, (-2.0, YA, ZA), 'BEZIER')
    key(avion, 'rotation_euler', tm, (0, 0, 0), 'BEZIER')
    key(avion, 'location', t1, (3.0, YA, ZA), 'LINEAR')


aterriza(0.0, TC)
key(avion, 'scale', TC + 0.01, (0, 0, 0), 'CONSTANT')
aterriza(33.1, DUR + 0.6)

# ---------- animacion de la isla ----------
def hundir(t, h, interp='BEZIER'):
    key(isla, 'location', t, (0, 0, -h), interp)
    key(barro, 'scale', t, (1, 1, (ZF - ZBR - h) / (ZF - ZBR)), interp)


hundir(0.0, HUNDE, 'CONSTANT')
hundir(TC, 0.0, 'CONSTANT')
hundir(14.2, 0.0)
hundir(15.6, HUNDE * 0.55)
hundir(16.4, HUNDE * 0.55)
hundir(17.6, HUNDE)
B.gancho([bloque, tapa, pista, term] + rayas, TC)
B.crecer(bloque, 2, 7.0, 8.8)
for o in [tapa, pista] + rayas:
    pop(o, 8.8, 0.2)
pop(term, 9.0, 0.3)

G.letrero('kansai', 'KANSAI', M['etiqueta'], (0.0, Y0 + 2, 9.0), tam=1.5, t_on=3.9, t_off=5.4)
G.letrero('japon', 'JAPÓN', M['etiqueta'], (0.0, Y0 + 2, 7.4), tam=1.0, t_on=4.8, t_off=5.4)
G.letrero('barro_t', 'BARRO BLANDO', M['etiqueta'], (0.0, YF - 0.3, -6.0), tam=1.0, t_on=12.1, t_off=15.6)
for k, x in enumerate((-6, 0, 6)):
    B.flujo(f'peso{k}', M['flecha_roja'], (x, YF - 0.6, 11.0), (x, YF - 0.6, 8.3), '-z', 13.1 + 0.1 * k, 14.3, n=2, largo=1.0, grosor=0.1)
rebote(barro, 14.9, 1.0, 1.0)
linea = D.caja('linea', -XI - 1.5, XI + 1.5, -0.03, 0.03, -0.03, 0.03, M['flecha_roja'])
linea.location = (0, YF - 0.4, ZI)
key(linea, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(linea, 16.4, 0.3)
quitar(linea, 19.4, 0.2)
B.medida('m10', -XI - 1.0, ZI, ZI - HUNDE, '10 m', M, 17.0, 19.4, lado=-1.4)

# se tuerce, gatos, placas y vuelve a quedar derecha
key(term, 'rotation_euler', 0.0, (0, 0, 0), 'CONSTANT')
key(term, 'rotation_euler', 20.8, (0, 0, 0))
key(term, 'rotation_euler', 21.8, (0, math.radians(4.0), 0))
key(term, 'rotation_euler', 26.6, (0, math.radians(4.0), 0))
key(term, 'rotation_euler', 27.6, (0, 0, 0))
for k, p in enumerate(pistones):
    if k < 2:
        continue
    key(p, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(p, 'scale', 26.6, (1, 1, 1))
    key(p, 'scale', 27.6, (1, 1, 1.0 + 0.6 * (k - 1)))
    key(p, 'scale', 28.4, (1, 1, 1.0 + 0.6 * (k - 1)))
    key(p, 'scale', 28.9, (1, 1, 1.0))
    for j in range(k - 1):
        pl = D.caja('placa', -0.4, 0.4, -0.25, 0.25, 0.0, 0.1, M['placa'])
        pl.location = (XC[k], Y0 + 0.45, ZT - 0.02 - 0.1 * (j + 1))
        pl.parent = isla
        key(pl, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
        pop(pl, 27.8 + 0.2 * j + 0.1 * k, 0.2)
        placas.append(pl)
B.flujo('levanta', M['flecha_verde'], (XC[4] + 1.0, YF - 0.5, ZT - 1.4), (XC[4] + 1.0, YF - 0.5, ZT + 0.4), 'z', 26.7, 27.6, n=2, largo=0.6, sep=0.3)

# terremoto y tifon
for j in range(14):
    t = 30.6 + j * 0.06
    key(isla, 'location', t, ((0.18 if j % 2 else -0.18), 0, -HUNDE), 'LINEAR')
key(isla, 'location', 31.5, (0, 0, -HUNDE))
for k in range(6):
    B.flujo(f'viento{k}', M['flecha_gris'], (-13.0, YF - 0.6, 7.6 + 0.8 * k), (11.0, YF - 0.6, 7.6 + 0.8 * k),
            'x', 31.7 + 0.08 * k, 32.9, n=2, largo=2.2, grosor=0.14, sep=0.3)

# ---------- camara ----------
GANCHO = ((-3.0, -22.0, 14.0), (-1.0, Y0 + 10, 0.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (-3.3, -23.0, 14.6), (-1.0, Y0 + 10, 0.0), 'CORTE'),
    (TC, (0.0, -26.0, 10.0), (0.0, Y0 + 9, 1.0)),
    (9.3, (2.0, -24.0, 8.0), (0.0, Y0 + 6, 0.5)),
    (10.0, (0.0, -27.0, 2.5), (0.0, Y0, -2.0)),
    (15.6, (0.0, -28.0, 3.0), (0.0, Y0, -1.5)),
    (16.2, (-5.0, -19.0, 2.5), (-3.0, Y0, 0.5)),
    (19.4, (-4.0, -19.5, 3.5), (-2.0, Y0, 1.5)),
    (20.4, (0.0, -14.0, 4.0), (0.0, Y0 + 2, 2.5)),
    (23.2, (1.0, -13.0, 3.0), (1.0, Y0 + 1, 2.0)),
    (25.4, (4.0, -9.0, 2.4), (4.5, Y0, 1.4)),
    (28.9, (3.5, -9.5, 2.6), (4.0, Y0, 1.6)),
    (29.6, (0.0, -26.0, 7.5), (0.0, Y0 + 6, 3.5)),
    (33.0, (0.0, -27.0, 8.0), (0.0, Y0 + 6, 3.5), 'CORTE'),
    (33.1, *GANCHO),
    (DUR, (-3.3, -23.0, 14.6), (-1.0, Y0 + 10, 0.0)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
