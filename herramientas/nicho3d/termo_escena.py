"""39 — Como funciona el termo (vacio entre dos paredes). Audio: .tmp_render/lote3/a13_limpio.m4a (37.4 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(39)
DUR = 38.0
TC = 4.4
M = B.materiales()
M.update({
    'termo': D.liso('termo', (0.1, 0.45, 0.42), 0.35, metal=0.3),
    'vacio': D.liso('vacio', (0.02, 0.02, 0.05), 0.9),
    'espejo': D.liso('espejo', (0.92, 0.93, 0.95), 0.05, metal=1.0),
    'agua_c': D.liso('agua_c', (1.0, 0.45, 0.15), 0.2, emit=0.5),
    'agua_f': D.liso('agua_f', (0.3, 0.6, 1.0), 0.2, emit=0.4),
    'aire_i': D.liso('aire_i', (0.85, 0.88, 0.9), 0.5),
    'tapa': D.liso('tapa', (0.15, 0.15, 0.17), 0.5),
    'taza': D.liso('taza', (0.95, 0.95, 0.93), 0.3),
    'cafe': D.liso('cafe', (0.3, 0.15, 0.06), 0.2),
    'onda': D.liso('onda', (1.0, 0.55, 0.1), 0.4, emit=3.0),
    'vapor': D.agua('vapor', col=(1.0, 1.0, 1.0), alpha=0.35),
    'hielo': D.agua('hielo', col=(0.85, 0.95, 1.0), alpha=0.55),
    'cruz': D.liso('cruz', (1.0, 0.08, 0.05), 0.4, emit=2.5),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
ZM = 0.0                     # mesa

# ---------- cocina ----------
D.caja('mesa', -20, 20, Y0 - 2, Y0 + 6, -0.5, 0.0, M['madera'])
D.caja('pared', -40, 40, Y0 + 6, Y0 + 6.5, -10, 20, M['muro'])
D.caja('piso', -40, 40, Y0 - 30, Y0 + 30, -10.2, -10.0, M['piso'])
D.caja('pata', -19, -18, Y0 - 1.5, Y0 + 5.5, -10.0, -0.5, M['madera'])
D.caja('pata', 18, 19, Y0 - 1.5, Y0 + 5.5, -10.0, -0.5, M['madera'])

# ---------- termo cortado a la mitad ----------
capas = [('ext', 2.0, 0.0, 6.6, M['termo']), ('vac', 1.72, 0.2, 6.4, M['vacio']), ('esp', 1.48, 0.38, 6.2, M['espejo']),
         ('aire_i', 1.36, 0.5, 6.2, M['aire_i'])]
obj = {}
for k, (nm, r, z0, z1, m) in enumerate(capas):
    obj[nm] = B.medio_tubo(nm, r, z0, z1, 'z', m, (0, Y0 - 0.012 * k, 0), solido=True)
agua = B.medio_tubo('agua', 1.36, 0.5, 5.2, 'z', M['agua_c'], (0, Y0 - 0.06, 0), solido=True)
B.origen(agua, (0, Y0, 0.5))
agua_f = B.medio_tubo('agua_f', 1.36, 0.5, 5.2, 'z', M['agua_f'], (0, Y0 - 0.07, 0), solido=True)
cuello = B.medio_tubo('cuello', 1.0, 6.2, 7.0, 'z', M['tapa'], (0, Y0 - 0.02, 0), solido=True)
tapa = B.medio_tubo('tapa', 2.05, 6.6, 7.6, 'z', M['termo'], (0, Y0 - 0.005, 0), solido=True)
key(agua_f, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
B.origen(agua_f, (0, Y0, 0.5))
key(agua_f, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(agua_f, 33.7, 0.4)
quitar(agua_f, 35.7, 0.1)
hielos = []
for k, (x, z) in enumerate(((-0.6, 4.6), (0.5, 4.3), (-0.1, 3.7), (0.7, 3.4), (-0.7, 3.2))):
    h = D.caja('hielo', -0.3, 0.3, -0.3, 0.3, -0.3, 0.3, M['hielo'])
    h.location = (x, Y0 - 0.4, z)
    h.rotation_euler = (0.3 * k, 0.2, 0.5 * k)
    key(h, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(h, 34.0 + 0.1 * k, 0.25)
    quitar(h, 35.7, 0.1)
    hielos.append(h)


# calor rebotando adentro (gancho y final)
def rebota_calor(t0, t1):
    for k, (z, d) in enumerate(((1.5, 'x'), (2.8, '-x'), (4.0, 'x'))):
        x0, x1 = (-0.6, 1.1) if d == 'x' else (0.6, -1.1)
        dr = '-x' if d == 'x' else 'x'
        t = t0 + 0.3 * k
        while t < t1 - 0.4:
            B.flujo(f'cal{k}_{t:.1f}', M['flecha_roja'], (x0, Y0 - 0.5, z), (x1, Y0 - 0.5, z), d, t, t + 0.5, n=1, largo=0.45, grosor=0.05)
            B.flujo(f'vuelve{k}_{t:.1f}', M['flecha_roja'], (x1, Y0 - 0.5, z + 0.25), (x0, Y0 - 0.5, z + 0.25), dr, t + 0.55, t + 1.05, n=1,
                    largo=0.45, grosor=0.05)
            t += 1.3


rebota_calor(0.2, TC)
rebota_calor(35.9, DUR + 0.5)
G.letrero('vacio_t', 'VACÍO', M['etiqueta'], (-1.86, Y0 - 0.6, 7.9), tam=0.45, t_on=2.9, t_off=TC)
flecha_v = B.flecha('fv', 1.0, M['etiqueta'], (-1.86, Y0 - 0.6, 7.6), '-z', 0.05)
key(flecha_v, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(flecha_v, 2.9, 0.2)
quitar(flecha_v, TC, 0.1)

# ---------- taza comun: tres formas de perder calor ----------
XT = -5.5
taza = B.raiz('taza', (XT, Y0 + 1.2, 0.0))
B.hijos(taza, [B.cilindro('taza_c', 0.95, 2.0, 'z', M['taza'], (0, 0, 0)),
               B.cilindro('cafe', 0.85, 0.05, 'z', M['cafe'], (0, 0, 1.85))])
key(taza, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(taza, 4.7, 0.3)
quitar(taza, 9.8, 0.2)
B.flujo('toca', M['flecha_roja'], (XT + 0.6, Y0 + 0.2, 0.8), (XT + 2.2, Y0 + 0.2, 0.8), 'x', 6.6, 7.4, n=3, largo=0.5, sep=0.2)
B.flujo('sube_aire', M['flecha_gris'], (XT, Y0 + 0.2, 2.2), (XT, Y0 + 0.2, 4.0), 'z', 7.4, 8.4, n=3, largo=0.5, sep=0.25)
for k, a in enumerate((-0.6, 0.0, 0.6)):
    f = B.flecha(f'luzinv{k}', 0.9, M['onda'], (XT, Y0 + 0.2, 1.0), 'x', 0.05)
    f.rotation_euler = (0, a, math.pi)
    key(f, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(f, 8.7 + 0.1 * k, 0.2)
    key(f, 'location', 8.8, (XT - 1.0, Y0 + 0.2, 1.0 + a))
    key(f, 'location', 9.6, (XT - 2.4, Y0 + 0.2, 1.0 + 2 * a))
    quitar(f, 9.7, 0.15)
G.letrero('t1', 'TOCANDO', M['flecha_roja'], (XT + 1.3, Y0 - 0.3, 3.0), tam=0.35, t_on=6.6, t_off=9.8)
G.letrero('t2', 'AIRE', M['flecha_gris'], (XT, Y0 - 0.3, 4.6), tam=0.35, t_on=7.5, t_off=9.8)
G.letrero('t3', 'LUZ INVISIBLE', M['onda'], (XT - 1.0, Y0 - 0.3, -0.6), tam=0.3, t_on=8.8, t_off=9.8)

# ---------- botella dentro de otra y sacan el aire ----------
rebote(obj['esp'], 12.6, 1.0, 1.05)
rebote(obj['ext'], 13.6, 1.0, 1.04)
for k in range(8):
    z = 0.8 + 0.7 * k
    s = B.esfera('aire_v', 0.07, M['etiqueta'], (-1.6, Y0 - 0.05, z))
    key(s, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(s, 'location', 0.0, (-1.6, Y0 - 0.05, z), 'CONSTANT')
    key(s, 'scale', 0.02, (0, 0, 0), 'CONSTANT')
    key(s, 'scale', 4.5, (1, 1, 1), 'CONSTANT')
    key(s, 'location', 14.6 + 0.05 * k, (-1.6, Y0 - 0.05, z))
    key(s, 'location', 15.8, (-1.6, Y0 - 0.05, 6.8))
    key(s, 'location', 16.1, (-2.6, Y0 - 0.05, 7.2))
    key(s, 'scale', 16.1, (0, 0, 0), 'CONSTANT')
G.letrero('vacio2', 'VACÍO', M['etiqueta'], (-1.86, Y0 - 0.6, 7.9), tam=0.45, t_on=15.4, t_off=20.4)

# el calor no puede pasar por el vacio
for k, z in enumerate((1.5, 3.0, 4.5)):
    B.flujo(f'choca{k}', M['flecha_roja'], (0.3, Y0 - 0.4, z), (1.3, Y0 - 0.4, z), 'x', 16.6 + 0.2 * k, 17.6 + 0.2 * k, n=1, largo=0.6, grosor=0.06)
    x = D.caja('cruz_v', -0.25, 0.25, -0.04, 0.04, -0.05, 0.05, M['cruz'])
    x.location = (1.6, Y0 - 0.5, z)
    x.rotation_euler = (0, math.pi / 4, 0)
    x2 = D.caja('cruz_v2', -0.25, 0.25, -0.04, 0.04, -0.05, 0.05, M['cruz'])
    x2.location = (1.6, Y0 - 0.5, z)
    x2.rotation_euler = (0, -math.pi / 4, 0)
    for o in (x, x2):
        key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
        pop(o, 17.7 + 0.2 * k, 0.2)
        quitar(o, 20.5, 0.2)
# puente sin piso
puente = B.raiz('puente', (5.4, Y0 + 0.5, 0.0))
B.hijos(puente, [D.caja('pila_a', -1.6, -1.0, -0.4, 0.4, 0.0, 2.2, M['concreto']),
                 D.caja('pila_b', 1.0, 1.6, -0.4, 0.4, 0.0, 2.2, M['concreto']),
                 D.caja('borde_a', -1.6, -0.6, -0.4, 0.4, 2.2, 2.4, M['madera']),
                 D.caja('borde_b', 0.6, 1.6, -0.4, 0.4, 2.2, 2.4, M['madera'])])
calor_p = B.esfera('calor_p', 0.25, M['flecha_roja'], (-1.2, 0, 2.7))
calor_p.parent = puente
key(puente, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(puente, 18.8, 0.3)
quitar(puente, 20.6, 0.2)
key(calor_p, 'location', 19.0, (-1.2, 0, 2.7))
key(calor_p, 'location', 19.7, (-0.5, 0, 2.7))
key(calor_p, 'location', 20.3, (-0.4, 0, 0.6))

# espejo: la luz invisible rebota
rebote(obj['esp'], 22.9, 1.0, 1.05)
espejo_t = G.letrero('espejo_t', 'ESPEJO', M['etiqueta'], (2.6, Y0 - 0.6, 6.9), tam=0.45, t_on=22.9, t_off=26.4)
onda_ida = B.curva('onda_ida', [(0.0 + 0.22 * k, Y0 - 0.45, 3.0 + 0.18 * math.sin(k * 1.4)) for k in range(7)], M['onda'], grosor=0.05)
onda_vuelta = B.curva('onda_vuelta', [(1.32 - 0.22 * k, Y0 - 0.45, 3.5 + 0.18 * math.sin(k * 1.4)) for k in range(7)], M['onda'], grosor=0.05)
for o, t0, t1 in ((onda_ida, 24.4, 25.0), (onda_vuelta, 25.0, 25.7)):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t0, (1, 1, 1), 'CONSTANT')
    B.trazar(o, t0 + 0.02, t1)
    key(o, 'scale', 26.5, (1, 1, 1), 'CONSTANT')
    key(o, 'scale', 26.55, (0, 0, 0), 'CONSTANT')

# la tapa: la unica salida
B.flujo('por_tapa', M['flecha_roja'], (0.0, Y0 - 0.5, 5.6), (0.0, Y0 - 0.5, 8.3), 'z', 27.2, 28.8, n=3, largo=0.6, sep=0.3)
G.letrero('tapa_t', 'TAPA', M['etiqueta'], (2.7, Y0 - 0.6, 7.1), tam=0.5, t_on=27.1, t_off=30.8)
rebote(tapa, 28.2, 1.0, 1.06)
G.letrero('horas_t', 'HORAS', M['medida'], (0.0, Y0 - 0.6, 9.0), tam=0.8, t_on=32.7, t_off=33.6)
G.letrero('verano_t', 'VERANO', M['agua_f'], (0.0, Y0 - 0.6, 9.0), tam=0.8, t_on=33.7, t_off=35.7)

# ---------- camara ----------
GANCHO = ((0.0, -13.0, 4.8), (0.0, Y0, 4.1))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (0.0, -13.6, 4.9), (0.0, Y0, 4.1), 'CORTE'),
    (TC, (-5.0, -8.5, 2.8), (-5.0, Y0, 1.9)),
    (9.7, (-4.8, -9.0, 2.8), (-4.8, Y0, 1.9)),
    (10.2, (0.0, -10.0, 4.4), (0.0, Y0, 3.8)),
    (16.2, (0.0, -9.0, 4.0), (0.3, Y0, 3.4)),
    (18.6, (3.2, -11.0, 3.4), (3.6, Y0, 2.6)),
    (20.5, (3.0, -11.5, 3.5), (3.4, Y0, 2.6)),
    (21.0, (0.6, -8.0, 4.0), (0.6, Y0, 3.6)),
    (26.5, (0.4, -8.5, 4.2), (0.4, Y0, 3.8)),
    (27.0, (0.0, -9.0, 6.6), (0.0, Y0, 6.2)),
    (30.8, (0.0, -10.0, 5.6), (0.0, Y0, 5.0)),
    (31.4, (0.0, -10.5, 4.8), (0.0, Y0, 4.2)),
    (35.7, (0.0, -11.0, 4.8), (0.0, Y0, 4.2), 'CORTE'),
    (35.8, *GANCHO),
    (DUR, (0.0, -13.5, 4.9), (0.0, Y0, 4.1)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
