"""08 — Cisterna de agua de lluvia. Audio: .tmp_render/lote/c8_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(8)
DUR = 41.0
TC = 6.05
M = B.materiales()
M.update({
    'plastico': D.liso('plastico', (0.12, 0.32, 0.18), 0.5),
    'canaleta': D.liso('canaleta', (0.85, 0.86, 0.87), 0.35, metal=0.3),
    'cloaca': D.liso('cloaca', (0.3, 0.3, 0.32), 0.6),
    'hoja': D.liso('hoja', (0.35, 0.6, 0.12), 0.6),
    'flecha_cafe': D.liso('flecha_cafe', (0.55, 0.32, 0.1), 0.5, emit=1.2),
    'alga': D.liso('alga', (0.2, 0.8, 0.15), 0.5, emit=0.6),
    'bomba': D.liso('bomba', (0.1, 0.3, 0.85), 0.35, metal=0.3),
    'auto': D.liso('auto', (0.85, 0.12, 0.1), 0.2, metal=0.3),
    'gota': D.liso('gota', (0.7, 0.85, 1.0), 0.1, emit=0.8),
    'factura': D.liso('factura', (1.0, 0.15, 0.1), 0.4, emit=2.0),
    'verde_txt': D.liso('verde_txt', (0.3, 1.0, 0.3), 0.4, emit=2.0),
})

TX, TR = 5.4, 1.4                 # tanque
TZ0, TZ1 = -3.1, -0.55
HX, HY = -5.0, Y0 + 1.3           # casa (frente cerca del corte)
BX = HX + 6.5 - 0.25              # bajada pluvial (esquina derecha de la casa)
ZT = -0.55                        # tubo enterrado

B.terreno(M, [(TX - TR - 0.15, TX + TR + 0.15, Y0 + TR + 0.3, TZ0 - 0.25),
              (-16.0, 1.0, Y0 + 0.6, -2.95, -1.85), (BX - 0.35, BX - 0.05, Y0 + 0.4, -2.0, -0.05),
              (BX - 0.25, TX - TR - 0.15, Y0 + 0.4, ZT - 0.25, ZT + 0.25), (BX - 0.25, BX + 0.25, Y0 + 0.4, ZT, -0.05),
              (BX + 1.1, BX + 1.7, Y0 + 0.5, ZT - 1.95, ZT - 0.25)])
B.relleno_hoyo(M, TX - TR - 0.15, TX + TR + 0.15, Y0 + TR + 0.3, TZ0 - 0.25, TC, 7.05, 8.1)
B.monton(M, (10.5, 4.0, 0.0), 7.05, 8.1, t_fin=11.3, esc=(2.0, 1.8, 1.0))

# casa con canaleta y bajada
for p in D.casa(M, y0=HY):
    p.location.x += HX
canaleta = D.caja('canaleta', HX - 6.9, HX + 6.9, HY - 0.85, HY - 0.6, 6.15, 6.35, M['canaleta'])
bajada = B.cilindro('bajada', 0.09, 6.2, 'z', M['canaleta'], (BX, HY - 0.75, 0.05))
gancho([canaleta], TC)
pop(canaleta, 13.86, 0.3)
key(bajada, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(bajada, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(bajada, 'scale', 13.9, (1, 1, 0), 'CONSTANT')
bajada.rotation_euler = (math.pi, 0, 0)
bajada.location = (BX, HY - 0.75, 6.25)
key(bajada, 'scale', 14.0, (1, 1, 0))
key(bajada, 'scale', 14.35, (1, 1, 1))

# cloaca (antes el agua se iba ahi)
cloaca = B.medio_tubo('cloaca', 0.45, -16.0, 1.0, 'x', M['cloaca'], (0, YF, -2.4), grosor=0.1, tapas=False)
rejilla = D.caja('rejilla', BX - 0.5, BX + 0.1, Y0 + 0.1, Y0 + 0.6, -0.02, 0.03, M['negro'])
bajada_cloaca = B.cilindro('a_cloaca', 0.08, 2.0, 'z', M['cloaca'], (BX - 0.2, YF - 0.12, -2.0))
B.flujo('a_drenaje', M['flecha_azul'], (BX - 0.2, YF - 0.35, 0.0), (BX - 0.2, YF - 0.35, -1.9), '-z', 4.25, 5.1, n=3, largo=0.6)
B.flujo('por_cloaca', M['flecha_azul'], (-1.0, YF - 0.35, -2.4), (-7.0, YF - 0.35, -2.4), '-x', 4.9, 5.9, n=3, largo=0.7)

# tanque: baja desde arriba
tanque = B.raiz('tanque', (0, 0, 0))
casco = B.medio_tubo('casco', TR, TZ0, TZ1, 'z', M['plastico'], (TX, YF, 0), grosor=0.1, tapas=True)
B.hijos(tanque, [casco])
key(tanque, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(tanque, 'location', 0.0, (0, 0, 0), 'CONSTANT')
key(tanque, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(tanque, 'scale', 8.6, (1, 1, 1), 'CONSTANT')
key(tanque, 'location', 8.6, (0, 0, 7.0))
key(tanque, 'location', 9.55, (0, 0, 0))
key(tanque, 'location', 9.7, (0, 0, 0.12))
key(tanque, 'location', 9.85, (0, 0, 0))
litros = B.texto('litros', '10.000 L', M['medida'], (TX, YF - 0.4, (TZ0 + TZ1) / 2), tam=0.75)
key(litros, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(litros, 10.66, 0.3)
quitar(litros, 11.85, 0.2)
lit2 = B.texto('lleno', 'LLENO', M['verde_txt'], (TX, YF - 0.4, (TZ0 + TZ1) / 2), tam=0.8)
key(lit2, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(lit2, 34.9, 0.3)
quitar(lit2, 35.9, 0.2)
# relleno alrededor y encima del tanque
for nombre, x0, x1, z0, z1 in (('izq', TX - TR - 0.15, TX - TR, TZ0 - 0.25, 0.0), ('der', TX + TR, TX + TR + 0.15, TZ0 - 0.25, 0.0),
                               ('arriba', TX - TR, TX + TR, TZ1, 0.0)):
    o = B.caja_o('relleno_' + nombre, x0, x1, YF, Y0 + TR + 0.3, z0, z1, M['relleno'], (0, 0, z0))
    gancho(o, TC)
    crecer(o, 2, 11.3, 11.7)
pasto_t = B.caja_o('pasto_tanque', TX - TR - 0.15, TX + TR + 0.15, YF, Y0 + TR + 0.3, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
gancho(pasto_t, TC)
crecer(pasto_t, 2, 11.65, 11.85)
registro = B.cilindro('registro', 0.4, 0.06, 'z', M['plastico'], (TX, Y0 + 0.8, 0.0), verts=28)

# agua dentro del tanque
agua = B.medio_tubo('agua_tanque', TR - 0.12, TZ0 + 0.1, TZ1 - 0.12, 'z', M['agua'], (TX, YF + 0.01, 0), solido=True)
B.origen(agua, (TX, YF, TZ0 + 0.1))
key(agua, 'scale', 0.0, (1, 1, 0.8), 'CONSTANT')
key(agua, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(agua, 'scale', 23.05, (1, 1, 0.02))
key(agua, 'scale', 25.0, (1, 1, 0.55))
key(agua, 'scale', 32.9, (1, 1, 0.45))
key(agua, 'scale', 34.9, (1, 1, 1.0))

# tubo enterrado: bajada -> filtro -> tanque, con desvio de primeras lluvias
filtro = B.raiz('filtro', (BX, YF - 0.12, 0.0))
B.hijos(filtro, [D.caja('filtro_caja', -0.28, 0.28, -0.12, 0.25, 0.05, 0.6, M['canaleta']),
                 D.caja('filtro_malla', -0.25, 0.25, -0.13, -0.12, 0.15, 0.55, M['negro'])])
gancho(filtro, TC)
pop(filtro, 16.06, 0.3)
vertical = B.cilindro('tubo_v', 0.1, -ZT + 0.05, 'z', M['tubo'], (BX, YF - 0.12, ZT))
gancho(vertical, TC)
crecer(vertical, 2, 14.3, 14.55)
horiz = B.cilindro('tubo_h', 0.1, TX - BX - TR + 0.05, 'x', M['tubo'], (BX, YF - 0.12, ZT))
gancho(horiz, TC)
crecer(horiz, 0, 14.5, 14.95)
desvio = B.cilindro('desvio', 0.1, 1.3, 'z', M['tubo'], (BX + 1.4, YF - 0.12, ZT - 1.3))
camara_d = B.cilindro('desvio_camara', 0.22, 0.6, 'z', M['tubo'], (BX + 1.4, YF - 0.12, ZT - 1.9))
desvio.rotation_euler = (0, 0, 0)
gancho([desvio, camara_d], TC)
crecer(desvio, 2, 18.8, 19.2)
pop(camara_d, 19.2, 0.25)
B.flujo('sucia', M['flecha_cafe'], (BX + 0.3, YF - 0.4, ZT), (BX + 1.4, YF - 0.4, ZT), 'x', 20.1, 20.6, n=2, largo=0.5)
B.flujo('sucia_baja', M['flecha_cafe'], (BX + 1.4, YF - 0.4, ZT - 0.1), (BX + 1.4, YF - 0.4, ZT - 1.5), '-z', 20.6, 22.4, n=3, largo=0.5)
B.flujo('limpia', M['flecha_azul'], (BX + 1.6, YF - 0.4, ZT), (TX - TR - 0.2, YF - 0.4, ZT), 'x', 22.0, 23.0, n=3, largo=0.6)

# agua por el techo y la bajada
B.flujo('techo', M['flecha_azul'], (HX - 2.0, HY - 0.75, 6.6), (BX - 0.3, HY - 0.75, 6.6), 'x', 12.4, 13.3, n=3, largo=0.8)
B.flujo('baja', M['flecha_azul'], (BX + 0.3, YF - 0.4, 5.6), (BX + 0.3, YF - 0.4, 0.4), '-z', 13.2, 14.4, n=3, largo=0.8)
hojas = []
for k in range(6):
    h = B.esfera(f'hoja{k}', 0.12, M['hoja'], (BX + 0.3 + 0.08 * k, YF - 0.45, 5.8), esc=(1.3, 0.4, 0.6))
    key(h, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    t0 = 16.55 + 0.12 * k
    pop(h, t0, 0.15, (1.3, 0.4, 0.6))
    key(h, 'location', t0, (BX + 0.3 + 0.05 * k, YF - 0.45, 5.8))
    key(h, 'location', t0 + 0.8, (BX - 0.15 + 0.06 * k, YF - 0.42, 0.62 + 0.03 * k))
    quitar(h, 23.0, 0.2, (1.3, 0.4, 0.6))

# algas que no crecen
for k in range(6):
    a = B.esfera(f'alga{k}', 0.13, M['alga'], (TX - 0.8 + 0.32 * k, YF - 0.1, TZ0 + 0.4 + 0.25 * (k % 3)))
    key(a, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(a, 26.2 + 0.05 * k, 0.2)
    quitar(a, 26.75 + 0.03 * k, 0.25)

# bomba, riego, auto, inodoro
bomba = B.raiz('bomba', (TX + 2.2, Y0 + 0.5, 0.0))
B.hijos(bomba, [B.cilindro('bomba_c', 0.25, 0.5, 'z', M['bomba'], (0, 0, 0)), D.caja('bomba_base', -0.35, 0.35, -0.3, 0.3, -0.05, 0.02, M['concreto'])])
key(bomba, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(bomba, 27.56, 0.3)
sube = B.cilindro('tubo_bomba', 0.07, -TZ0 - 0.2, 'z', M['tubo'], (TX + 1.0, YF - 0.12, TZ0 + 0.2))
key(sube, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
crecer(sube, 2, 27.9, 28.3)
B.flujo('bomba_sube', M['flecha_azul'], (TX + 1.0, YF - 0.4, TZ0 + 0.4), (TX + 1.0, YF - 0.4, -0.2), 'z', 28.3, 29.1, n=3, largo=0.6)
aspersor = B.raiz('aspersor', (11.0, Y0 + 3.5, 0))
B.hijos(aspersor, [B.cilindro('asp', 0.05, 0.35, 'z', M['acero'], (0, 0, 0))])
chorros = []
for k in range(7):
    a = 2 * math.pi * k / 7
    c = B.curva(f'chorro{k}', [(0, 0, 0.35), (0.9 * math.cos(a), 0.9 * math.sin(a), 1.2), (1.8 * math.cos(a), 1.8 * math.sin(a), 0.1)],
                M['gota'], 0.025)
    c.data.splines[0].bezier_points[1].handle_left_type = 'AUTO'
    c.parent = aspersor
    chorros.append(c)
key(aspersor, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(aspersor, 28.85, 0.3)
quitar(aspersor, 30.0, 0.2)
pop(aspersor, 38.6, 0.3)
for k in range(12):
    key(aspersor, 'rotation_euler', 28.9 + 0.25 * k, (0, 0, 0.4 * k))
for k in range(8):
    key(aspersor, 'rotation_euler', 38.7 + 0.25 * k, (0, 0, 0.4 * k))
auto = B.raiz('auto', (8.5, Y0 + 7.5, 0))
B.hijos(auto, [D.caja('auto_c', -2.1, 2.1, -0.85, 0.85, 0.3, 0.95, M['auto']),
               D.caja('auto_cab', -1.2, 0.9, -0.75, 0.75, 0.95, 1.45, M['vidrio'])]
        + [B.cilindro('rueda', 0.33, 0.25, 'y', M['llanta'], (wx, wy - 0.12, 0.33), verts=16) for wx in (-1.35, 1.35) for wy in (-0.85, 0.85)])
key(auto, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(auto, 30.0, 0.3)
quitar(auto, 31.0, 0.2)
manguera = B.curva('manguera_auto', [(7.5, Y0 + 5.6, 0.05), (7.6, Y0 + 6.3, 0.9), (7.9, Y0 + 6.5, 1.3)], M['negro'], 0.03)
key(manguera, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(manguera, 30.1, 0.2)
quitar(manguera, 31.0, 0.2)
B.flujo('lava', M['flecha_azul'], (7.9, Y0 + 6.5, 1.3), (8.5, Y0 + 6.6, 1.5), 'x', 30.2, 30.9, n=2, largo=0.5)
B.flujo('a_casa', M['flecha_azul'], (TX + 0.6, YF - 0.4, 0.4), (HX + 4.0, YF - 0.4, 0.4), '-x', 31.0, 31.8, n=3, largo=0.8)

# lluvia: al principio, al llenar el techo y la tormenta final
gotas = []
for i in range(70):
    x, y = random.uniform(-12, 14), random.uniform(Y0 - 0.5, Y0 + 9)
    g = B.cilindro(f'gota{i}', 0.016, 0.6, 'z', M['gota'], (x, y, 11), verts=6)
    g.scale = (0, 0, 0)
    key(g, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    for t0, t1 in ((0.0, 5.9), (12.0, 15.0), (32.2, 35.6)):
        t = t0 + random.uniform(0, 0.45)
        while t < t1:
            key(g, 'location', t, (x, y, 10.0), 'LINEAR')
            key(g, 'scale', t, (1, 1, 1), 'CONSTANT')
            key(g, 'location', t + 0.42, (x, y, 0.1), 'CONSTANT')
            t += 0.45
        key(g, 'scale', t, (0, 0, 0), 'CONSTANT')

# la factura del vecino
factura = B.raiz('factura', (13.0, Y0 + 4.0, 3.0))
B.hijos(factura, [D.caja('papel', -0.8, 0.8, -0.03, 0.03, -1.0, 1.0, M['blanco']),
                  B.texto('fac_txt', '$$$', M['factura'], (0, -0.05, 0.1), tam=0.75)])
key(factura, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(factura, 37.05, 0.3, 1.8)
gratis = B.texto('gratis', 'GRATIS', M['verde_txt'], (10.6, Y0 + 2.5, 2.6), tam=1.3)
key(gratis, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(gratis, 39.7, 0.3)

# patio y fondo
for nombre, loc, rz, s in (('shrub_04', (13.0, Y0 + 9.0, 0), 0, 1.6), ('shrub_02', (-13.5, Y0 + 9.0, 0), 1.0, 1.7),
                           ('potted_plant_02', (BX + 0.8, HY - 0.6, 0), 0, 1.3), ('planter_pot_clay', (HX - 4.0, HY - 0.6, 0), 0, 1.4)):
    D.modelo(nombre, loc, rz, s)
D.caja('cerca_vecino', 14.2, 14.3, Y0 + 0.2, Y0 + 14.0, 0, 1.8, M['madera'])
D.caja('barda', -40, 40, Y0 + 20.0, Y0 + 20.15, 0, 1.8, M['zocalo'])
for xv, yv, h in ((-16.0, Y0 + 14.0, 7.5), (16.0, Y0 + 16.0, 7.5), (9.5, Y0 + 12.0, 6.5), (-20.0, Y0 + 22.0, 8.0)):
    D.arbol((xv, yv, 0), alto=h, semilla=int(xv))

TOMAS = [
    (0.0, (2.0, -22.0, 7.0), (1.0, 2.0, 2.0)),
    (3.9, (0.0, -19.0, 3.0), (-1.0, 0.0, -0.8)),
    (5.9, (-1.0, -18.0, 2.0), (-2.0, 0.0, -1.4)),
    (6.0, (-1.2, -18.2, 2.0), (-2.0, 0.0, -1.4), 'CORTE'),
    (6.05, (4.5, -17.0, 2.5), (5.0, 0.0, -1.4)),
    (8.3, (5.0, -20.0, 5.0), (5.0, 1.0, 1.0)),
    (10.3, (5.2, -14.0, 0.0), (5.3, 0.0, -1.8)),
    (11.8, (4.8, -15.0, 0.4), (5.0, 0.0, -1.5)),
    (12.2, (0.0, -21.0, 7.0), (0.5, 1.0, 2.6)),
    (14.6, (1.5, -17.0, 2.2), (2.5, 0.0, -0.2)),
    (16.0, (1.0, -9.5, 1.4), (1.3, 0.0, 0.3)),
    (17.9, (1.0, -9.0, 1.0), (1.3, 0.0, 0.0)),
    (18.3, (2.6, -10.5, -0.2), (3.0, 0.0, -1.2)),
    (22.9, (3.2, -11.0, -0.4), (3.6, 0.0, -1.2)),
    (23.2, (5.4, -12.5, -1.0), (5.4, 0.0, -1.8)),
    (26.9, (5.4, -12.0, -1.2), (5.4, 0.0, -1.8)),
    (27.3, (7.5, -17.0, 4.0), (8.0, 2.0, 0.0)),
    (31.9, (6.5, -18.0, 3.8), (6.0, 2.0, -0.4)),
    (32.3, (3.0, -20.0, 5.0), (4.0, 0.5, -0.5)),
    (35.6, (3.5, -19.0, 4.5), (4.5, 0.5, -0.6)),
    (36.0, (10.0, -11.5, 3.2), (12.0, 0.0, 2.2)),
    (DUR, (10.2, -10.0, 3.0), (12.0, 0.0, 2.2)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e in ((0.0, 2.2), (5.9, 2.2), (6.0, 4.0), (32.0, 4.0), (32.4, 2.0), (35.6, 2.0), (36.0, 4.0)):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
B.terminar(opt, salida, DUR)
