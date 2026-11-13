"""31 — El puente que se mete bajo el mar (Oresund). Audio: .tmp_render/lote3/a5_limpio.m4a (37.5 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(31)
DUR = 38.1
TC = 4.3
M = B.materiales()
M.update({
    'fondo': D.pbr('fondo', 'brown_mud_rocks_01', tam=1.8, tinte=(0.42, 0.37, 0.3), fac=0.4),
    'tunel': D.pbr('tunel', 'rough_concrete', tam=1.5, tinte=(0.72, 0.71, 0.68), fac=0.5, brillo=1.2),
    'calle': D.liso('calle', (0.13, 0.13, 0.14), 0.7),
    'puente': D.liso('puente', (0.85, 0.86, 0.86), 0.4),
    'reticula': D.liso('reticula', (0.55, 0.58, 0.6), 0.4, metal=0.6),
    'auto': D.liso('auto', (0.85, 0.08, 0.06), 0.3),
    'tren': D.liso('tren', (0.92, 0.92, 0.9), 0.35),
    'franja_t': D.liso('franja_t', (0.65, 0.1, 0.1), 0.4),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'fantasma': D.agua('fantasma', col=(1.0, 0.12, 0.08), alpha=0.35),
    'avion_c': D.liso('avion_c', (0.1, 0.25, 0.65), 0.4),
})
sup = D.agua('mar_sup', col=(0.03, 0.3, 0.42), alpha=1.0)
sup.surface_render_method = 'DITHERED'
ZF = -3.0
YR = Y0 + 1.6                       # carril donde va el auto
XT1 = -9.5                          # fin del tunel recto (lado isla)
ZT0, ZT1 = -5.3, -3.4               # piso / techo del tunel
XI0, XI1 = -10.0, 6.0               # isla artificial
ZI = 1.3

# ---------- cortadores: tunel y rampa ----------
cav = D.caja('cav_tunel', -60.0, XT1 + 0.6, Y0 - 1, Y0 + 3.0, ZT0, ZT1)
ram_len = math.hypot(13.0, ZI - ZT0)
ram_ang = math.atan2(ZI - ZT0, 13.0)
cav_r = D.caja('cav_rampa', 0.0, ram_len + 1.0, Y0 - 1, Y0 + 3.0, 0.0, ZT1 - ZT0)
cav_r.location = (XT1, 0, ZT0)
cav_r.rotation_euler = (0, -ram_ang, 0)

# ---------- fondo, mar, tierra ----------
G.frente('f_fondo', -120, 120, -90.0, ZF, M['fondo'], 'excavated_soil_wall', fuerza=0.25, res=0.2,
         borrar=lambda x, z: x < XT1 + 0.6 and ZT0 < z < ZT1 or (XT1 < x < XI1 and ZT0 < z < ZF + 0.1 and
                                                                 (z - ZT0) < (x - XT1) * math.tan(ram_ang) + 2.2 and (z - ZT0) > (x - XT1) * math.tan(ram_ang) - 0.2))
lecho = D.caja('lecho', -120, 120, Y0, Y0 + 120, -90.0, ZF, M['fondo'])
for c in (cav, cav_r):
    D.restar(lecho, c, ocultar=False)
D.aplicar_mods(lecho)
for nm, x0, x1 in (('mar_i', -120, XI0), ('mar_d', XI1, 120)):
    D.caja(nm, x0, x1, Y0, Y0 + 0.02, ZF, 0.0, M['agua'])
    D.caja(nm + '_s', x0, x1, Y0 + 0.02, Y0 + 120, -0.02, 0.0, sup)
D.caja('mar_f_s', XI0, XI1, Y0 + 9, Y0 + 120, -0.02, 0.0, sup)
# Dinamarca (izquierda, con aeropuerto) y Suecia (derecha)
D.caja('dinamarca', -300, -44, Y0, Y0 + 300, ZF, 0.6, M['pasto'])
D.caja('pista_av', -120, -48, Y0 + 6, Y0 + 9, 0.6, 0.63, M['calle'])
D.caja('suecia', 46, 300, Y0, Y0 + 300, ZF, 0.6, M['pasto'])

# ---------- isla artificial con la rampa ----------
isla = D.caja('isla', XI0, XI1, Y0, Y0 + 9, ZF, ZI, M['relleno'])
for c in (cav, cav_r):
    D.restar(isla, c, ocultar=False)
D.aplicar_mods(isla)
D.caja('isla_calle', XT1 + 13.0, XI1, Y0 + 0.6, Y0 + 2.8, ZI, ZI + 0.04, M['calle'])
D.caja('isla_pasto', XI0, XI1, Y0 + 3.0, Y0 + 9, ZI, ZI + 0.03, M['pasto'])
rampa = D.caja('rampa', 0.0, ram_len, Y0 + 0.4, Y0 + 3.0, -0.12, 0.0, M['calle'])
rampa.location = (XT1, 0, ZT0)
rampa.rotation_euler = (0, -ram_ang, 0)
cav.hide_render = cav_r.hide_render = True

# ---------- tunel: 20 piezas ----------
piezas = []
xs = [-44.0 + k * (XT1 + 44.0) / 20 for k in range(21)]
for k in range(20):
    r = B.raiz(f'pieza{k}', (xs[k], Y0, 0))
    L = xs[k + 1] - xs[k] - 0.04
    B.hijos(r, [D.caja('p_piso', 0, L, 0.0, 3.0, ZT0 - 0.3, ZT0, M['tunel']),
                D.caja('p_calle', 0, L, 0.3, 2.8, ZT0, ZT0 + 0.03, M['calle']),
                D.caja('p_techo', 0, L, 0.0, 3.0, ZT1, ZT1 + 0.3, M['tunel']),
                D.caja('p_fondo', 0, L, 2.8, 3.0, ZT0, ZT1, M['tunel']),
                D.caja('p_luz', 0.2, L - 0.2, 1.2, 1.6, ZT1 - 0.05, ZT1, M['etiqueta'])])
    piezas.append(r)
    key(r, 'location', 0.0, (xs[k], Y0, 0), 'CONSTANT')
    key(r, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    quitar(r, 25.5, 0.2)
    t_on = 27.3 + 0.05 * k
    pop(r, t_on, 0.25)
    key(r, 'location', t_on - 0.1, (xs[k], Y0, 5.6), 'CONSTANT')
    t_baja = 29.8 + 0.08 * k
    key(r, 'location', t_baja, (xs[k], Y0, 5.6))
    key(r, 'location', t_baja + 0.9, (xs[k], Y0, 0))

# ---------- puente (dos pisos) ----------
XP0, XP1 = 14.0, 60.0
ZS0, ZS1 = 3.2, 5.0                  # piso inferior (tren) y superior (autos)
puente = [D.caja('piso_inf', XP0, XP1, Y0 + 0.5, Y0 + 3.5, ZS0, ZS0 + 0.3, M['puente']),
          D.caja('piso_sup', XP0, XP1, Y0 + 0.5, Y0 + 3.5, ZS1, ZS1 + 0.3, M['puente']),
          D.caja('baranda', XP0, XP1, Y0 + 0.45, Y0 + 0.55, ZS1 + 0.3, ZS1 + 0.55, M['reticula'])]
x = XP0
while x < XP1 - 1.0:
    for dy in (0.5, 3.4):
        d = D.caja('diag', -0.07, 0.07, Y0 + dy, Y0 + dy + 0.1, 0.0, math.hypot(1.0, ZS1 - ZS0 - 0.3), M['reticula'])
        d.location = (x + 0.5, 0, ZS0 + 0.3)
        d.rotation_euler = (0, math.atan2(1.0, ZS1 - ZS0 - 0.3) * (1 if int(x) % 2 else -1), 0)
        puente.append(d)
    x += 1.0
for xp in range(18, 60, 7):
    puente.append(D.caja('pila', xp - 0.4, xp + 0.4, Y0 + 1.2, Y0 + 2.8, ZF, ZS0, M['concreto']))
for xp in (26.0, 40.0):
    puente.append(D.caja('pilon', xp - 0.35, xp + 0.35, Y0 + 3.6, Y0 + 4.2, ZF, 15.0, M['puente']))
    for dx in (-9, -6, -3, 3, 6, 9):
        cb = B.curva('tirante', [(xp, Y0 + 3.9, 14.6), (xp + dx, Y0 + 3.5, ZS1 + 0.3)], M['reticula'], grosor=0.04)
        puente.append(cb)
ap_len = math.hypot(XP0 - XI1 + 1, ZS1 - ZI)
ap = D.caja('acceso', 0.0, ap_len, Y0 + 0.5, Y0 + 3.5, -0.3, 0.0, M['puente'])
ap.location = (XI1 - 1, 0, ZI + 0.3)
ap.rotation_euler = (0, -math.atan2(ZS1 + 0.3 - ZI - 0.3, XP0 - XI1 + 1), 0)
puente.append(ap)

# ---------- auto ----------
auto = B.raiz('auto')
B.hijos(auto, [D.caja('auto_c', -0.6, 0.6, -0.35, 0.35, 0.12, 0.45, M['auto']),
               D.caja('auto_v', -0.3, 0.35, -0.3, 0.3, 0.45, 0.7, M['vidrio'])] +
        [B.cilindro('rueda', 0.15, 0.12, 'y', M['llanta'], (dx, dy, 0.15)) for dx in (-0.38, 0.38) for dy in (-0.38, 0.26)])
RUTA = [(34.0, ZS1 + 0.3), (XP0, ZS1 + 0.3), (XI1 - 1, ZI + 0.04), (XT1 + 13.0, ZI + 0.04), (XT1, ZT0 + 0.03), (-40.0, ZT0 + 0.03)]
LS = [0.0]
for a, b in zip(RUTA, RUTA[1:]):
    LS.append(LS[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))


def punto(s):
    s = max(0.0, min(s, LS[-1]))
    for i in range(len(RUTA) - 1):
        if s <= LS[i + 1] + 1e-6:
            u = (s - LS[i]) / (LS[i + 1] - LS[i])
            a, b = RUTA[i], RUTA[i + 1]
            return a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1]), math.atan2(a[1] - b[1], -(b[0] - a[0]))


def ruta(t0, t1, s0, s1):
    key(auto, 'scale', t0 - 0.05, (0, 0, 0), 'CONSTANT')
    key(auto, 'scale', t0, (1, 1, 1), 'CONSTANT')
    n = 16
    for k in range(n + 1):
        t = t0 + (t1 - t0) * k / n
        x, z, a = punto(s0 + (s1 - s0) * k / n)
        key(auto, 'location', t, (x, YR, z), 'LINEAR')
        key(auto, 'rotation_euler', t, (0, a, math.pi), 'LINEAR')
    key(auto, 'scale', t1, (1, 1, 1), 'CONSTANT')
    key(auto, 'scale', t1 + 0.05, (0, 0, 0), 'CONSTANT')


ruta(0.0, TC, 18.0, 50.0)
ruta(10.4, 12.4, 0.0, 12.0)
ruta(12.5, 16.7, 26.0, 52.0)
ruta(32.0, 35.75, 0.0, LS[-1])
ruta(35.85, DUR + 0.1, 18.0, 18.0 + 32.0 * (DUR + 0.1 - 35.85) / TC)

# ---------- tren (piso de abajo) ----------
tren = B.raiz('tren')
vag = []
for k in range(3):
    x0 = k * 2.3
    vag += [D.caja('vagon', x0, x0 + 2.2, -0.45, 0.45, 0.0, 0.85, M['tren']),
            D.caja('franja', x0, x0 + 2.2, -0.46, 0.46, 0.45, 0.6, M['franja_t'])]
B.hijos(tren, vag)
key(tren, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(tren, 'scale', 10.9, (1, 1, 1), 'CONSTANT')
key(tren, 'location', 10.9, (32.0, Y0 + 2.0, ZS0 + 0.3), 'LINEAR')
key(tren, 'location', 12.6, (14.0, Y0 + 2.0, ZS0 + 0.3), 'LINEAR')
key(tren, 'scale', 12.6, (0, 0, 0), 'CONSTANT')

# ---------- avion y barco (por que no puente) ----------
fant = D.caja('fantasma', -44.0, XI0, Y0 + 0.5, Y0 + 3.5, ZS0, ZS1 + 0.3, M['fantasma'])
key(fant, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(fant, 18.0, 0.3)
quitar(fant, 25.0, 0.3)
avion = B.raiz('avion')
B.hijos(avion, [B.cilindro('fus', 0.5, 5.4, 'x', M['blanco'], (-2.7, 0, 0.6)),
                B.esfera('nariz', 0.5, M['blanco'], (2.7, 0, 0.6), esc=(1.6, 1, 1)),
                D.caja('ala', -0.8, 0.5, -3.0, 3.0, 0.45, 0.58, M['blanco']),
                D.caja('cola', -2.7, -1.9, -0.06, 0.06, 0.8, 2.1, M['avion_c']),
                D.caja('estab', -2.7, -2.1, -1.2, 1.2, 1.1, 1.2, M['blanco'])])
key(avion, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(avion, 'scale', 20.6, (1, 1, 1), 'CONSTANT')
key(avion, 'location', 20.6, (-52.0, Y0 + 7.5, 0.7), 'LINEAR')
key(avion, 'rotation_euler', 20.6, (0, 0, 0), 'LINEAR')
key(avion, 'location', 21.4, (-44.0, Y0 + 7.5, 0.9))
key(avion, 'location', 23.3, (-14.0, Y0 + 7.5, 6.5))
key(avion, 'rotation_euler', 23.3, (0, -0.25, 0))
key(avion, 'scale', 23.3, (1, 1, 1), 'CONSTANT')
key(avion, 'scale', 23.35, (0, 0, 0), 'CONSTANT')
barco = G.barco('barco', M, (-26.0, Y0 + 40, 0.0), largo=7.0, ancho=2.0, color=(0.1, 0.2, 0.45))
barco.scale = (2.0, 2.0, 2.0)
barco.rotation_euler = (0, 0, math.pi / 2)
key(barco, 'location', 0.0, (-26.0, Y0 + 60, -0.2), 'CONSTANT')
key(barco, 'location', 22.6, (-26.0, Y0 + 30, -0.2))
key(barco, 'location', 25.2, (-26.0, Y0 + 9, -0.2))
key(barco, 'location', 25.3, (-26.0, Y0 + 60, -0.2), 'CONSTANT')

# ---------- carteles ----------
G.letrero('dk', 'DINAMARCA', M['etiqueta'], (-15.0, Y0 + 4, 6.0), tam=2.4, t_on=6.0, t_off=9.4)
G.letrero('se', 'SUECIA', M['etiqueta'], (17.0, Y0 + 4, 10.0), tam=2.4, t_on=6.8, t_off=9.4)
G.letrero('km8', '8 KM', M['medida'], (24.0, Y0 + 2, 13.0), tam=2.4, t_on=8.8, t_off=10.0)
G.letrero('autos', 'AUTOS', M['etiqueta'], (24.0, YF - 0.3, ZS1 + 1.4), tam=0.7, t_on=10.6, t_off=12.4)
G.letrero('trenes', 'TRENES', M['etiqueta'], (24.0, YF - 0.3, ZS0 - 0.7), tam=0.7, t_on=11.6, t_off=12.4)
G.letrero('isla_t', 'ISLA', M['etiqueta'], (-1.0, YF - 0.3, ZI + 1.6), tam=1.2, t_on=13.5, t_off=16.8)
G.letrero('porque', '¿?', M['medida'], (-27.0, Y0 + 2, 9.0), tam=4.0, t_on=17.0, t_off=18.4)
G.letrero('aero', 'AEROPUERTO', M['etiqueta'], (-52.0, Y0 + 4, 4.0), tam=1.6, t_on=20.0, t_off=24.9)
G.letrero('veinte', '20', M['medida'], (-27.0, YF - 0.3, 3.2), tam=2.0, t_on=27.3, t_off=29.6)
G.letrero('km16', '16 KM', M['medida'], (0.0, Y0 + 4, 14.0), tam=3.0, t_on=32.3, t_off=35.8)
G.letrero('min', '< 30 MIN', M['etiqueta'], (0.0, Y0 + 4, 10.5), tam=2.2, t_on=34.5, t_off=35.8)

# ---------- camara ----------
GANCHO = ((15.0, -27.0, 7.5), (-1.0, Y0 + 2, -1.5))
ANCHO = ((0.0, -52.0, 24.0), (0.0, Y0 + 10, 0.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (14.4, -27.6, 7.7), (-1.0, Y0 + 2, -1.5), 'CORTE'),
    (TC, *ANCHO),
    (9.6, (4.0, -50.0, 22.0), (6.0, Y0 + 10, 0.0)),
    (10.3, (27.5, -8.5, 3.9), (24.0, Y0 + 2, 4.2)),
    (12.4, (26.0, -8.5, 3.8), (22.5, Y0 + 2, 4.1)),
    (12.9, (2.0, -20.0, 3.5), (-2.5, Y0 + 1, -1.5)),
    (16.8, (-1.0, -20.0, 2.5), (-5.0, Y0 + 1, -2.5)),
    (17.0, *ANCHO),
    (18.4, (0.0, -53.0, 24.5), (0.0, Y0 + 10, 0.0)),
    (19.4, (-14.0, -34.0, 10.0), (-28.0, Y0 + 8, 2.0)),
    (25.2, (-15.0, -33.0, 9.0), (-27.0, Y0 + 8, 1.5)),
    (26.0, (-20.0, -24.0, 4.0), (-25.0, Y0 + 1, -2.0)),
    (31.8, (-20.0, -25.0, 3.5), (-25.0, Y0 + 1, -2.5)),
    (32.2, *ANCHO),
    (35.75, (0.0, -54.0, 25.0), (0.0, Y0 + 10, 0.0), 'CORTE'),
    (35.85, *GANCHO),
    (DUR, (14.5, -27.5, 7.65), (-1.0, Y0 + 2, -1.5)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
