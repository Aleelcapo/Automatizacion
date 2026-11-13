"""38 — Por que la manguera de combustible se corta sola. Audio: .tmp_render/lote3/a12_limpio.m4a (35.5 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(38)
DUR = 36.1
TC = 4.8
M = B.materiales()
M.update({
    'nafta': D.liso('nafta', (1.0, 0.6, 0.08), 0.2, emit=0.6),
    'tanque': D.liso('tanque', (0.35, 0.5, 0.35), 0.4, metal=0.5),
    'surtidor': D.liso('surtidor', (0.9, 0.15, 0.12), 0.4),
    'pistola': D.liso('pistola', (0.25, 0.27, 0.3), 0.35, metal=0.4),
    'pico': D.liso('pico', (0.75, 0.77, 0.8), 0.25, metal=0.9),
    'tubito': D.liso('tubito', (1.0, 0.15, 0.15), 0.4, emit=1.5),
    'membrana': D.liso('membrana', (0.6, 0.3, 0.85), 0.4, emit=0.8),
    'vidrio_t': D.agua('vidrio_t', col=(0.7, 0.8, 0.85), alpha=0.25),
    'auto': D.liso('auto', (0.85, 0.12, 0.1), 0.3, metal=0.3),
    'aire': D.liso('aire', (1.0, 1.0, 1.0), 0.3, emit=2.0),
    'cruz': D.liso('cruz', (1.0, 0.08, 0.05), 0.4, emit=2.5),
    'chip': D.liso('chip', (0.08, 0.1, 0.1), 0.4),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
YP = Y0 + 0.5                 # plano donde esta la pistola y el cuello del tanque

# ---------- suelo y tanque enterrado ----------
G.frente('f_tierra', -40, 40, -40.0, -0.4, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.15,
         borrar=lambda x, z: -7.2 < x < 2.2 and -5.3 < z < -1.6)
suelo = D.caja('suelo', -80, 80, Y0, Y0 + 60, -40.0, -0.4, M['tierra'])
D.restar(suelo, D.caja('pozo', -7.2, 2.2, Y0 - 1, Y0 + 3.5, -5.3, -1.6))
D.aplicar_mods(suelo)
D.caja('losa', -80, 80, Y0, Y0 + 60, -0.4, 0.0, M['concreto'])
D.caja('fondo_pozo', -7.2, 2.2, Y0 + 3.4, Y0 + 3.5, -5.3, -1.6, M['relleno'])
tq = B.medio_tubo('tanque', 1.6, -7.0, 2.0, 'x', M['tanque'], (0, Y0 + 0.02, -3.45), solido=False, tapas=True, grosor=0.15)
nafta_t = B.medio_tubo('nafta_t', 1.42, -6.85, 1.85, 'x', M['nafta'], (0, Y0 + 0.04, -3.45), solido=True)
bomba = B.raiz('bomba', (1.0, Y0 + 0.6, -4.3))
B.hijos(bomba, [B.cilindro('bomba_c', 0.3, 0.9, 'z', M['acero'], (0, 0, 0))])
caño = B.cilindro('cano', 0.12, 3.9, 'z', M['acero'], (1.0, Y0 + 0.6, -3.4))
# surtidor y manguera
D.caja('isla', -1.0, 3.0, Y0 + 0.2, Y0 + 3.0, 0.0, 0.3, M['concreto'])
surt = D.caja('surtidor', 0.2, 2.0, Y0 + 0.6, Y0 + 2.2, 0.3, 4.0, M['surtidor'])
D.caja('pantalla', 0.5, 1.7, Y0 + 0.58, Y0 + 0.6, 2.8, 3.6, M['vidrio'])
manguera = B.curva('manguera', [(1.6, Y0 + 0.55, 3.7), (2.6, Y0 + 0.5, 2.2), (3.6, YP, 2.6), (4.25, YP, 3.3)], M['negro'], grosor=0.07)

# ---------- auto (sin la chapa del frente) ----------
XA0, XA1 = 6.0, 13.0
auto = [D.caja('piso_a', XA0, XA1, Y0, Y0 + 3.2, 0.5, 0.7, M['auto']),
        D.caja('techo_a', XA0 + 1.5, XA1 - 1.0, Y0, Y0 + 3.2, 3.2, 3.4, M['auto']),
        D.caja('fondo_a', XA0, XA1, Y0 + 3.0, Y0 + 3.2, 0.5, 2.3, M['auto']),
        D.caja('cola', XA0, XA0 + 0.2, Y0, Y0 + 3.2, 0.5, 2.3, M['auto']),
        D.caja('trompa', XA1 - 0.2, XA1, Y0, Y0 + 3.2, 0.5, 2.0, M['auto']),
        D.caja('baul', XA0, XA0 + 1.6, Y0, Y0 + 3.2, 2.1, 2.3, M['auto']),
        D.caja('capot', XA1 - 1.2, XA1, Y0, Y0 + 3.2, 1.8, 2.0, M['auto']),
        D.caja('borde', XA0, XA1, Y0, Y0 + 0.12, 0.5, 1.0, M['auto'])]
for x in (XA0 + 1.4, XA1 - 1.4):
    B.cilindro('rueda', 0.55, 0.35, 'y', M['llanta'], (x, Y0 - 0.1, 0.55))
D.caja('tanque_a', XA0 + 0.6, XA0 + 3.6, Y0 + 0.3, Y0 + 2.6, 0.75, 1.75, M['vidrio_t'])
nafta_a = B.caja_o('nafta_a', XA0 + 0.65, XA0 + 3.55, Y0 + 0.35, Y0 + 2.55, 0.78, 1.7, M['nafta'], (0, 0, 0.78))
XN = XA0 + 0.9               # cuello de llenado
cuello = B.cilindro('cuello', 0.3, 1.25, 'z', M['vidrio_t'], (XN, YP, 1.7))
nafta_c = B.cilindro('nafta_c', 0.26, 1.2, 'z', M['nafta'], (XN, YP, 1.72))

# ---------- pistola ----------
pist = B.raiz('pistola', (4.3, YP, 3.3))
TIP = (XN - 4.3, 0.0, 2.15 - 3.3)          # punta del pico, relativa a la pistola
mango = D.caja('mango', -0.15, 1.3, -0.2, 0.2, -0.25, 0.25, M['pistola'])
largo_p = math.hypot(TIP[0] - 1.3, TIP[2])
pico = B.cilindro('pico', 0.09, largo_p, 'x', M['pico'], (1.3, 0, 0))
pico.rotation_euler = (0, math.atan2(-TIP[2], TIP[0] - 1.3), 0)
agujero = B.esfera('agujero', 0.08, M['negro'], (TIP[0] - 0.12, -0.09, TIP[2] + 0.18))
tubo_pts = [(TIP[0] - 0.12, -0.12, TIP[2] + 0.18), (1.35, -0.26, 0.02), (0.95, -0.26, 0.1), (0.6, -0.26, 0.12)]
tubito = B.curva('tubito', tubo_pts, M['tubito'], grosor=0.04)
memb = B.cilindro('membrana', 0.22, 0.06, 'y', M['membrana'], (0.45, -0.32, 0.12))
gat = B.raiz('gatillo', (0.9, 0, -0.25))
B.hijos(gat, [D.caja('gatillo_c', -0.7, 0.05, -0.3, 0.05, -0.1, 0.0, M['pico'])])
traba = D.caja('traba', 0.72, 0.86, -0.3, -0.22, -0.3, 0.05, M['amarillo'])
B.hijos(pist, [mango, pico, agujero, tubito, memb, gat, traba])
pist.rotation_euler = (0, 0, 0)

# ---------- niveles de nafta ----------
def llenar(t0, t_tapa, t_corte):
    key(nafta_a, 'scale', t0, (1, 1, 0.15), 'CONSTANT')
    key(nafta_a, 'scale', t_tapa - 0.6, (1, 1, 1.0), 'LINEAR')
    key(nafta_c, 'scale', t0, (1, 1, 0.0), 'CONSTANT')
    key(nafta_c, 'scale', t_tapa - 0.6, (1, 1, 0.0), 'LINEAR')
    key(nafta_c, 'scale', t_tapa, (1, 1, 0.56), 'LINEAR')
    key(nafta_c, 'scale', t_corte, (1, 1, 0.56), 'CONSTANT')


def clac(t):
    key(gat, 'rotation_euler', t - 0.05, (0, math.radians(-14), 0), 'CONSTANT')
    key(gat, 'rotation_euler', t, (0, 0, 0), 'CONSTANT')
    key(traba, 'location', t - 0.05, (0, 0, 0), 'CONSTANT')
    key(traba, 'location', t, (0, 0, 0.22), 'CONSTANT')


def armar(t):
    key(gat, 'rotation_euler', t, (0, math.radians(-14), 0), 'CONSTANT')
    key(traba, 'location', t, (0, 0, 0), 'CONSTANT')
    key(memb, 'location', t, (0.45, -0.32, 0.12), 'CONSTANT')


armar(0.0)
llenar(0.0, 3.6, 4.6)
clac(4.2)
armar(TC)
llenar(TC, 21.0, 32.9)
clac(28.3)
armar(33.0)
llenar(33.0, 36.6, 37.0)
key(memb, 'location', 24.6, (0.45, -0.32, 0.12))
key(memb, 'location', 25.6, (0.62, -0.32, 0.12))
key(memb, 'location', 32.9, (0.62, -0.32, 0.12), 'CONSTANT')
rebote(bomba, 10.2, 1.0, 1.25)

# flujo de nafta: del tanque al surtidor, por la manguera y por el pico
B.flujo('sube', M['flecha_roja'], (1.0, YF - 0.3, -3.0), (1.0, YF - 0.3, -0.2), 'z', 10.6, 12.0, n=3, largo=0.6, sep=0.3)
B.flujo('carga', M['flecha_roja'], (XN, YP - 0.45, 3.1), (XN, YP - 0.45, 2.1), '-z', 16.0, 18.4, n=4, largo=0.35, grosor=0.04, sep=0.25)

# aire entrando por el agujerito y subiendo por el tubito
aire = []
for k in range(5):
    s = B.esfera('aire', 0.045, M['aire'], (0, 0, 0))
    s.parent = pist
    key(s, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    t = 15.8 + 0.25 * k
    while t < 20.9:
        key(s, 'scale', t - 0.01, (1, 1, 1), 'CONSTANT')
        for j, p in enumerate([(TIP[0] - 0.12, -0.25, TIP[2] + 0.18)] + tubo_pts):
            key(s, 'location', t + 0.22 * j, (p[0], -0.34, p[2]), 'LINEAR')
        key(s, 'scale', t + 0.22 * len(tubo_pts), (0, 0, 0), 'CONSTANT')
        t += 1.25
    aire.append(s)
rebote(agujero, 14.3, 1.0, 2.2)
rebote(agujero, 20.8, 1.0, 2.2)
key(tubito, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
B.trazar(tubito, 15.0, 15.6)

# chip tachado
def chip_tachado(nombre, loc, t_on, t_off):
    c = B.raiz(nombre, loc)
    pp = [D.caja('chip_c', -0.45, 0.45, -0.05, 0.05, -0.45, 0.45, M['chip'])]
    for k in range(4):
        for s in (-1, 1):
            pp.append(D.caja('pata', -0.38 + 0.25 * k, -0.3 + 0.25 * k, -0.03, 0.03, s * 0.45, s * 0.6, M['pico']))
    for s in (1, -1):
        x = D.caja('cruz', -0.75, 0.75, -0.06, 0.06, -0.07, 0.07, M['cruz'])
        x.location = (0, -0.12, 0)
        x.rotation_euler = (0, s * math.pi / 4, 0)
        pp.append(x)
    B.hijos(c, pp)
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(c, t_on, 0.3)
    quitar(c, t_off, 0.2)


chip_tachado('chip1', (5.0, Y0 - 0.5, 4.6), 5.3, 6.6)
chip_tachado('chip2', (5.6, Y0 - 0.5, 3.9), 30.5, 32.0)

# ---------- carteles ----------
G.letrero('tanques_t', 'TANQUES', M['etiqueta'], (-2.5, YF - 0.3, -1.1), tam=0.7, t_on=8.0, t_off=9.8)
G.letrero('bomba_t', 'BOMBA', M['etiqueta'], (1.0, YF - 0.3, -5.8), tam=0.5, t_on=10.2, t_off=12.4)
G.letrero('agujero_t', 'AGUJERITO', M['etiqueta'], (XN - 0.9, YP - 0.6, 1.6), tam=0.22, t_on=14.3, t_off=15.6)
G.letrero('aire_t', 'AIRE', M['aire'], (XN - 0.9, YP - 0.6, 3.75), tam=0.24, t_on=17.1, t_off=19.0)
G.letrero('vacio_t', 'VACÍO', M['tubito'], (XN - 0.9, YP - 0.6, 3.75), tam=0.26, t_on=23.4, t_off=25.2)
G.letrero('memb_t', 'MEMBRANA', M['membrana'], (XN - 0.9, YP - 0.6, 3.75), tam=0.22, t_on=26.0, t_off=27.6)
G.letrero('clac_t', '¡CLAC!', M['medida'], (XN - 0.9, YP - 0.6, 3.75), tam=0.3, t_on=28.3, t_off=29.4)
G.letrero('aire2_t', 'SOLO AIRE', M['etiqueta'], (5.6, Y0 - 0.5, 2.5), tam=0.4, t_on=32.0, t_off=33.0)
G.letrero('clac0', '¡CLAC!', M['medida'], (5.0, Y0 - 0.5, 4.4), tam=0.5, t_on=4.2, t_off=TC)

# ---------- camara ----------
GANCHO = ((4.6, -10.5, 3.3), (6.0, Y0 + 1.0, 2.3))
PISTOLA = ((5.6, Y0 - 3.5, 3.0), (5.6, YP, 2.8))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (4.4, -11.0, 3.4), (6.0, Y0 + 1.0, 2.3), 'CORTE'),
    (TC, (4.5, -7.5, 3.6), (5.2, Y0 + 0.5, 3.3)),
    (6.4, (4.5, -8.0, 3.6), (5.2, Y0 + 0.5, 3.3)),
    (6.8, (-2.0, -13.0, -1.6), (-2.0, Y0, -3.0)),
    (9.5, (-1.5, -13.5, -1.4), (-1.5, Y0, -2.8)),
    (9.9, (0.8, -12.0, 0.6), (0.8, Y0, 0.2)),
    (12.2, (0.8, -12.5, 0.8), (0.8, Y0, 0.4)),
    (12.8, *PISTOLA),
    (28.8, (5.6, Y0 - 3.8, 3.0), (5.6, YP, 2.8)),
    (29.4, (5.0, -8.5, 3.0), (5.5, Y0 + 0.5, 2.6)),
    (32.9, (5.0, -9.0, 3.0), (5.5, Y0 + 0.5, 2.6), 'CORTE'),
    (33.0, *GANCHO),
    (DUR, (4.45, -10.9, 3.38), (6.0, Y0 + 1.0, 2.3)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
