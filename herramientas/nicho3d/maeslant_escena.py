"""32 — Las puertas que cierran el mar (Maeslantkering). Audio: .tmp_render/lote3/a6_limpio.m4a (37.6 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(32)
DUR = 38.2
TC = 3.0
M = B.materiales()
M.update({
    'puerta': D.liso('puerta', (0.88, 0.88, 0.86), 0.4, metal=0.3),
    'brazo': D.liso('brazo', (0.85, 0.85, 0.83), 0.35, metal=0.6),
    'dique': D.pbr('dique', 'rough_concrete', tam=1.5, tinte=(0.55, 0.6, 0.45), fac=0.5),
    'casa': D.liso('casa', (0.85, 0.45, 0.3), 0.5),
    'pantalla': D.liso('pantalla', (0.1, 0.25, 0.15), 0.3, emit=1.2),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'linea_mar': D.liso('linea_mar', (0.3, 0.7, 1.0), 0.4, emit=2.0),
})
sup = D.agua('mar_sup', col=(0.03, 0.3, 0.42), alpha=1.0)
sup.surface_render_method = 'DITHERED'
ZF = -4.0                  # fondo del canal
ZB = 1.5                   # alto de las orillas
XC = 11.0                  # medio ancho del canal
YJ = Y0 + 8.0              # rotulas de los brazos
YG = YJ + 6.0              # linea donde se cierran las puertas
YP = Y0 + 7.0              # franja del polder (frente, lado derecho)

# ---------- terreno ----------
G.frente('f_roca', -90, 90, -60.0, ZF, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.2)
D.caja('roca', -200, 200, Y0, Y0 + 200, -60.0, ZF, M['tierra'])
G.frente('f_izq', -90, -XC, ZF, ZB, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.12)
izq = D.caja('orilla_i', -200, -XC, Y0, Y0 + 200, ZF, ZB, M['tierra'])
izq.data.materials.append(M['pasto'])
D.restar(izq, D.caja('dock_i', -19.5, -XC + 0.5, YJ - 0.5, YJ + 12.5, ZF, ZB + 1))
D.aplicar_mods(izq)
D.por_normal(izq, lambda n, c: 1 if (n.z > 0.9 and c.z > ZB - 0.01) else 0)
der = D.caja('orilla_d', XC, 200, YP, Y0 + 200, ZF, ZB, M['tierra'])
der.data.materials.append(M['pasto'])
D.restar(der, D.caja('dock_d', XC - 0.5, 19.5, YJ - 0.5, YJ + 12.5, ZF, ZB + 1))
D.aplicar_mods(der)
D.por_normal(der, lambda n, c: 1 if (n.z > 0.9 and c.z > ZB - 0.01) else 0)
# frente derecho: dique y polder por debajo del mar
dique = D.prisma_y('dique', [(XC, ZF), (16.0, ZF), (16.0, -2.0), (14.5, 2.5), (XC + 0.4, 2.5), (XC, ZB)], Y0, YP, M['dique'])
polder = D.caja('polder', 16.0, 200, Y0, YP, ZF, -2.0, M['tierra'])
polder.data.materials.append(M['pasto'])
D.por_normal(polder, lambda n, c: 1 if n.z > 0.9 else 0)
G.frente('f_polder', 16.0, 90, ZF, -2.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.12)
casas = []
for k, x in enumerate((19.0, 23.5, 28.0)):
    c = B.raiz(f'casa{k}', (x, Y0 + 3.0, -2.0))
    B.hijos(c, [D.caja('casa_c', -1.0, 1.0, -1.0, 1.0, 0.0, 1.4, M['casa']),
                D.prisma_y('casa_t', [(-1.2, 1.4), (1.2, 1.4), (0.0, 2.3)], -1.1, 1.1, M['teja'])])
    casas.append(c)

# ---------- agua: canal adentro (frente) y mar afuera (atras de las puertas) ----------
canal = B.caja_o('canal', -XC, XC, Y0, Y0 + 0.02, ZF, 0.0, M['agua'], (0, Y0, ZF))
canal_s = B.caja_o('canal_s', -XC, XC, Y0 + 0.02, YG, -0.02, 0.0, sup, (0, 0, 0))
docks = [D.caja('dock_s', -19.5, -XC, YJ - 0.5, YJ + 12.5, -0.03, -0.01, sup), D.caja('dock_s', XC, 19.5, YJ - 0.5, YJ + 12.5, -0.03, -0.01, sup)]
mar = B.caja_o('mar_s', -XC - 0.5, XC + 0.5, YG, Y0 + 200, -0.02, 0.0, sup, (0, 0, 0))
D.caja('mar_lejos', -200, 200, Y0 + 60, Y0 + 400, -0.04, -0.02, sup)
inunda = B.caja_o('inunda', 16.0, 60.0, Y0, YP, -2.0, 0.6, M['agua'], (0, Y0, -2.0))


def nivel_canal(t, z, interp='BEZIER'):
    key(canal, 'scale', t, (1, 1, (z - ZF) / (0.0 - ZF)), interp)
    key(canal_s, 'location', t, (0, 0, z), interp)


def nivel_mar(t, z, interp='BEZIER'):
    key(mar, 'location', t, (0, 0, z), interp)


nivel_canal(0.0, 0.0, 'CONSTANT')
nivel_canal(9.2, 0.0)
nivel_canal(10.0, 2.9)
nivel_canal(10.85, 2.9, 'CONSTANT')
nivel_canal(10.9, 0.0, 'CONSTANT')
for t, z in ((0.0, 2.0), (0.5, 2.25), (1.0, 1.95), (1.5, 2.25), (2.0, 1.95), (2.5, 2.25)):
    nivel_mar(t, z)
nivel_mar(TC, 0.0, 'CONSTANT')
nivel_mar(9.2, 0.0)
nivel_mar(10.0, 2.9)
nivel_mar(10.85, 2.9, 'CONSTANT')
nivel_mar(10.9, 0.0, 'CONSTANT')
nivel_mar(31.6, 0.0)
nivel_mar(33.0, 2.0)
for k, t in enumerate((33.5, 34.0, 34.5, 35.0, 35.75)):
    nivel_mar(t, 2.0 + (0.25 if k % 2 == 0 else -0.05))
for k, t in enumerate((35.8, 36.3, 36.8, 37.3, 37.8, 38.3)):
    nivel_mar(t, 2.0 + (0.0 if k % 2 == 0 else 0.25))
key(inunda, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(inunda, 'scale', 9.85, (1, 1, 0.01))
key(inunda, 'scale', 10.5, (1, 1, 1.0))
key(inunda, 'scale', 10.85, (1, 1, 1.0), 'CONSTANT')
key(inunda, 'scale', 10.9, (0, 0, 0), 'CONSTANT')

# ---------- puertas ----------
def viga(nombre, p0, p1, m, ancho=0.35, z0=-0.2, z1=0.2):
    L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    o = D.caja(nombre, 0.0, L, -ancho / 2, ancho / 2, z0, z1, m)
    o.location = (p0[0], p0[1], 0)
    o.rotation_euler = (0, 0, math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
    return o


puertas = []
for lado in (-1, 1):
    r = B.raiz(f'puerta{lado}', (lado * (XC + 0.5), YJ, ZB))
    x0, x1 = 0.6, XC + 0.5 - 0.05
    pp = [D.caja('muro', -lado * x1 if lado > 0 else x0, -lado * x0 if lado > 0 else x1, 5.6, 6.4, ZF - ZB, 1.6, M['puerta'])]
    for xa in (x0, (x0 + x1) / 2, x1):
        pp.append(viga('brazo', (0, 0), (-lado * xa, 5.7), M['brazo']))
    pp.append(viga('travesano', (-lado * x0 * 0.5, 2.85), (-lado * x1 * 0.5, 2.85), M['brazo']))
    pp.append(B.esfera('rotula', 0.8, M['acero'], (0, 0, 0)))
    B.hijos(r, pp)
    puertas.append(r)
    descanso = (0, 0, math.radians(90 if lado < 0 else -90))
    key(r, 'rotation_euler', 0.0, (0, 0, 0), 'CONSTANT')
    key(r, 'rotation_euler', TC, descanso, 'CONSTANT')
    key(r, 'rotation_euler', 25.6, descanso)
    key(r, 'rotation_euler', 28.3, (0, 0, 0))
    key(r, 'location', 0.0, (lado * (XC + 0.5), YJ, ZB), 'CONSTANT')
    key(r, 'location', TC, (lado * (XC + 0.5), YJ, ZB + 1.2), 'CONSTANT')
    key(r, 'location', 29.9, (lado * (XC + 0.5), YJ, ZB + 1.2))
    key(r, 'location', 31.0, (lado * (XC + 0.5), YJ, ZB))
B.gancho(puertas, TC)
for k, r in enumerate(puertas):
    pop(r, 13.5 + 0.3 * k, 0.35)
    rebote(r, 31.0, 1.0, 1.04)

# ---------- canchas de futbol (largo de un brazo) ----------
canchas = []
for k in range(2):
    c = B.raiz(f'cancha{k}', (-23.5, YJ + 0.6 + k * 5.45 + 2.6, ZB + 0.02))
    B.hijos(c, [D.caja('c_pasto', -1.7, 1.7, -2.6, 2.6, 0.0, 0.05, D.liso('cancha', (0.15, 0.6, 0.15), 0.6)),
                D.caja('c_linea', -1.55, 1.55, -0.04, 0.04, 0.05, 0.08, M['blanco']),
                D.caja('c_l1', -1.55, -1.47, -2.45, 2.45, 0.05, 0.08, M['blanco']),
                D.caja('c_l2', 1.47, 1.55, -2.45, 2.45, 0.05, 0.08, M['blanco']),
                D.caja('c_l3', -1.55, 1.55, -2.45, -2.37, 0.05, 0.08, M['blanco']),
                D.caja('c_l4', -1.55, 1.55, 2.37, 2.45, 0.05, 0.08, M['blanco'])])
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(c, 16.6 + 0.4 * k, 0.3)
    quitar(c, 18.2, 0.2)
    canchas.append(c)

# ---------- barco que pasa ----------
barco = G.barco('barco', M, (0, Y0 + 2, -0.3), largo=6.0, ancho=2.0, color=(0.15, 0.3, 0.6))
barco.rotation_euler = (0, 0, math.pi / 2)
key(barco, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(barco, 'scale', 18.9, (1, 1, 1), 'CONSTANT')
key(barco, 'location', 18.9, (0, Y0 + 3, -0.3))
key(barco, 'location', 21.6, (0, Y0 + 32, -0.3))
key(barco, 'scale', 21.6, (0, 0, 0), 'CONSTANT')

# ---------- computadora ----------
compu = B.raiz('compu', (-14.5, Y0 + 2.0, ZB))
B.hijos(compu, [D.caja('pie', -0.15, 0.15, -0.15, 0.15, 0.0, 0.6, M['acero']),
                D.caja('monitor', -1.1, 1.1, -0.12, 0.12, 0.6, 2.0, M['negro']),
                D.caja('pantalla', -1.0, 1.0, -0.14, -0.12, 0.7, 1.9, M['pantalla'])])
txt = G.letrero('compu_t', '+3 m', M['medida'], (0.0, -0.2, 1.3), tam=0.6)
txt.parent = compu
key(compu, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(compu, 21.3, 0.3)
quitar(compu, 25.3, 0.2)

# ---------- carteles ----------
G.letrero('pb', 'PAÍSES BAJOS', M['etiqueta'], (20.5, YF - 0.3, 1.2), tam=0.8, t_on=3.3, t_off=7.2)
nivel = D.caja('nivel', 16.2, 34.0, -0.02, 0.02, -0.04, 0.04, M['linea_mar'])
nivel.location = (0, YF - 0.3, 0.0)
key(nivel, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(nivel, 6.3, 0.3)
quitar(nivel, 9.0, 0.2)
G.letrero('nm', 'NIVEL DEL MAR', M['linea_mar'], (25.0, YF - 0.3, 0.6), tam=0.6, t_on=6.4, t_off=9.0)
G.letrero('a1953', '1953', M['medida'], (14.0, YF - 0.3, 6.0), tam=2.0, t_on=7.5, t_off=10.8)
G.letrero('rott', 'ROTTERDAM', M['etiqueta'], (0.0, YJ + 4, 7.5), tam=2.2, t_on=12.6, t_off=15.0)
B.medida('m3', -XC + 0.8, 3.0, 0.0, '3 m', M, 23.5, 25.4, lado=1.6)
for k, x in enumerate((-6.0, 6.0)):
    B.flujo(f'llena{k}', M['flecha_azul'], (x, YG - 0.8, 4.2), (x, YG - 0.8, 2.0), '-z', 28.8, 29.8, n=3, largo=0.8, sep=0.25)
G.letrero('a2007', '2007', M['medida'], (-4.0, YG + 2, 7.0), tam=2.2, t_on=33.8, t_off=35.75)
G.letrero('a2023', '2023', M['medida'], (4.0, YG + 2, 7.0), tam=2.2, t_on=34.5, t_off=35.75)

# ---------- camara ----------
GANCHO = ((0.0, -21.0, 15.0), (0.0, YJ + 6, 0.0))
ALTO = ((-3.0, -26.0, 22.0), (-3.0, YJ + 7, 0.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (0.0, -22.0, 15.5), (0.0, YJ + 6, 0.0), 'CORTE'),
    (TC, (22.0, -13.0, 3.0), (22.0, Y0 + 2, -1.0)),
    (7.0, (16.0, -22.0, 5.5), (12.0, Y0 + 3, 0.0)),
    (10.7, (15.0, -23.0, 6.0), (11.0, Y0 + 3, 0.0)),
    (11.6, *ALTO),
    (15.6, (-4.0, -27.0, 22.5), (-3.0, YJ + 7, 0.0)),
    (16.3, (-19.0, -12.0, 17.0), (-20.0, YJ + 6, 0.0)),
    (18.1, (-19.5, -13.0, 17.5), (-20.0, YJ + 6, 0.0)),
    (18.8, (0.0, -20.0, 12.0), (0.0, YJ + 5, 0.0)),
    (20.8, (0.0, -21.0, 12.5), (0.0, YJ + 5, 0.0)),
    (21.3, (-11.0, -8.5, 3.6), (-13.0, Y0 + 2, 2.4)),
    (22.8, (-10.0, -10.0, 3.6), (-12.0, Y0 + 2, 2.0)),
    (23.4, (-5.0, -16.0, 3.0), (-8.0, Y0 + 2, 1.2)),
    (25.4, (0.0, -24.0, 19.0), (0.0, YJ + 7, 0.0)),
    (28.4, (0.0, -25.0, 18.0), (0.0, YJ + 7, 0.0)),
    (28.9, (0.0, -15.0, 1.0), (0.0, YG, -0.8)),
    (31.5, (0.0, -16.0, 1.5), (0.0, YG, -0.5)),
    (32.2, (0.0, -24.0, 12.0), (0.0, YG + 4, 1.0)),
    (35.7, (0.0, -25.0, 12.5), (0.0, YG + 4, 1.0), 'CORTE'),
    (35.75, *GANCHO),
    (DUR, (0.0, -21.8, 15.4), (0.0, YJ + 6, 0.0)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
