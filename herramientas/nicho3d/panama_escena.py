"""18 — Como un barco sube una montana (esclusas del Canal de Panama). Audio: .tmp_render/lote2/a2_limpio.m4a (43.4 s)."""
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

opt, salida = B.inicio(18)
DUR = 44.0
TC = 4.85
M = B.materiales()
M.update({
    'mar': D.agua('mar', col=(0.03, 0.32, 0.45), alpha=0.5),
    'lago': D.agua('lago', col=(0.05, 0.36, 0.35), alpha=0.5),
    'esclusa': D.pbr('esclusa', 'rough_concrete', tam=2.0, tinte=(0.7, 0.69, 0.66), fac=0.5, brillo=1.25),
    'compuerta': D.liso('compuerta', (0.32, 0.36, 0.33), 0.4, metal=0.7),
    'casco_r': D.liso('casco_r', (0.6, 0.08, 0.06), 0.5),
    'casco_a': D.liso('casco_a', (0.06, 0.12, 0.3), 0.4),
    'mula': D.liso('mula', (0.75, 0.77, 0.8), 0.3, metal=0.7),
    'cable': D.liso('cable', (0.1, 0.1, 0.1), 0.6),
    'pato': D.liso('pato', (1.0, 0.82, 0.05), 0.35),
    'pico': D.liso('pico', (1.0, 0.45, 0.05), 0.4),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'cruz': D.liso('cruz', (1.0, 0.08, 0.05), 0.4, emit=2.5),
    'arena': D.pbr('arena', 'coast_sand_01', tam=2.0, tinte=(0.7, 0.62, 0.45), fac=0.3),
})
CONT = [D.liso(f'cont{k}', c, 0.55) for k, c in enumerate(((0.75, 0.15, 0.1), (0.1, 0.35, 0.6), (0.85, 0.55, 0.1),
                                                           (0.2, 0.5, 0.25), (0.55, 0.55, 0.58), (0.45, 0.2, 0.45)))]

L = [0.0, 1.2, 2.4, 3.6]          # niveles: mar, escalon 1, escalon 2, lago
YB, YW = Y0 + 2.4, Y0 + 3.2       # fondo del canal de la esclusa / muro trasero
ZBASE, ZCUL, RCUL = -4.6, -3.6, 0.55
ZTOP = 4.2                        # tierra firme
# camaras: (x0, x1, nivel_bajo, nivel_alto)  izquierda sube, derecha baja
CAM_I = [(-6.3, -1.3, 0, 1), (-1.3, 3.7, 1, 2), (3.7, 8.7, 2, 3)]
CAM_D = [(19.7, 24.7, 3, 2), (24.7, 29.7, 2, 1), (29.7, 34.7, 1, 0)]


def piso(nb):
    return L[nb] - 1.6


cort = []
def cortador(nombre, x0, x1, y0, y1, z0, z1):
    c = D.caja(nombre, x0, x1, y0, y1, z0, z1)
    cort.append(c)
    return c


culv = [G.cil_x('culv_i', RCUL, -8.2, 11.2, Y0, ZCUL), G.cil_x('culv_d', RCUL, 18.0, 36.6, Y0, ZCUL)]
for c in culv:
    c.hide_render = True

# ---------- terreno ----------
suelo = D.caja('suelo', -60, 80, Y0, 150, -40.0, ZTOP)
suelo.data.materials.append(M['tierra'])
suelo.data.materials.append(M['pasto'])
for c in (D.caja('h_mar_i', -61, -6.3, Y0 - 1, Y0 + 40, -3.0, 9), D.caja('h_esc_i', -8.2, 9.3, Y0 - 1, YW, ZBASE, 9),
          D.caja('h_lago', 9.3, 19.7, Y0 - 1, Y0 + 40, -1.0, 9), D.caja('h_esc_d', 18.0, 36.6, Y0 - 1, YW, ZBASE, 9),
          D.caja('h_mar_d', 34.7, 81, Y0 - 1, Y0 + 40, -3.0, 9), D.caja('h_lago_i', 8.7, 11.2, Y0 - 1, YW, ZBASE, 9)):
    D.restar(suelo, c)
D.aplicar_mods(suelo)
D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > ZTOP - 0.01) else 0)
G.frente('f_tierra', -22, 46, -14.0, ZBASE, M['tierra'], 'excavated_soil_wall', fuerza=0.3)
G.frente('f_tierra_b', -40, 70, -40.0, -14.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.25)
G.frente('f_mar_i', -22, -8.2, ZBASE, -3.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3)
G.frente('f_lago', 11.2, 18.0, ZBASE, -1.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3)
G.frente('f_mar_d', 36.6, 46, ZBASE, -3.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3)
D.caja('arena_i', -60, -6.3, Y0, Y0 + 40, -3.0, -2.9, M['arena'])
D.caja('arena_d', 34.7, 80, Y0, Y0 + 40, -3.0, -2.9, M['arena'])
# agua grande: solo la cara de corte es transparente; la superficie es opaca (mucho mas rapido de renderizar)
sup_mar = D.agua('mar_sup', col=(0.03, 0.28, 0.4), alpha=1.0)
sup_lago = D.agua('lago_sup', col=(0.04, 0.3, 0.3), alpha=1.0)
for m in (sup_mar, sup_lago):
    m.surface_render_method = 'DITHERED'
for nm, x0, x1, z0, z1, mv, ms in (('mar_i', -60, -6.3, -2.9, L[0], M['mar'], sup_mar), ('mar_d', 34.7, 80, -2.9, L[0], M['mar'], sup_mar),
                                   ('lago', 8.7, 19.7, -1.0, L[3], M['lago'], sup_lago)):
    D.caja(nm, x0, x1, Y0, Y0 + 0.02, z0, z1, mv)
    D.caja(nm + '_sup', x0, x1, Y0 + 0.02, Y0 + 40, z1 - 0.02, z1, ms)
D.caja('lago_lejos', -60, 80, Y0 + 40, 150, L[3] - 0.03, L[3] - 0.01, sup_lago)
D.caja('lago_fondo', -60, 80, Y0 + 40, 150, -14, -1.0, M['tierra'])

# ---------- esclusas ----------
aguas, compuertas = {}, {}


def escalera(lado, camaras, x_toma, x_sal):
    bases = []
    for i, (x0, x1, nb, na) in enumerate(camaras):
        f = piso(min(nb, na))
        xc = (x0 + x1) / 2
        bases.append((D.caja(f'base{lado}{i}', x0, x1, Y0, YW, ZBASE, f, M['esclusa']), xc, f))
        D.caja(f'muro{lado}{i}', x0, x1, YB, YW, f, L[max(nb, na)] + 0.6, M['esclusa'])
        a = B.caja_o(f'agua{lado}{i}', x0 + 0.02, x1 - 0.02, Y0, YB, f, L[max(nb, na)], M['mar'], (0, 0, f))
        aguas[(lado, i)] = (a, f, L[max(nb, na)])
    # compuertas en los extremos de cada camara (bisagra en el muro trasero)
    xs = sorted({c[0] for c in camaras} | {c[1] for c in camaras})
    for k, xg in enumerate(xs):
        vecinos = [c for c in camaras if abs(c[0] - xg) < 0.01 or abs(c[1] - xg) < 0.01]
        f = min(piso(min(c[2], c[3])) for c in vecinos)
        z1 = max(L[max(c[2], c[3])] for c in vecinos) + 0.3
        g = B.caja_o(f'comp{lado}{k}', xg - 0.12, xg + 0.12, Y0 + 0.04, YB, f, z1, M['compuerta'], (xg, YB, f))
        compuertas[(lado, k)] = g
    # tomas: del lago al conducto, y del conducto al mar
    for x, ztop, nm in ((x_toma, -1.0, 'toma'), (x_sal, -3.0, 'salida')):
        cortador(f'{nm}{lado}', x - 0.3, x + 0.3, Y0 - 0.1, Y0 + 0.7, ZCUL, ztop + 0.05)
    for b, xc, f in bases:
        cortador('puerto', xc - 0.3, xc + 0.3, Y0 - 0.1, Y0 + 0.7, ZCUL, f + 0.05)
    return bases


bi = escalera('i', CAM_I, 10.4, -7.4)
bd = escalera('d', CAM_D, 18.8, 35.9)
ext = [D.caja('ext_i0', -8.2, -6.3, Y0, YW, ZBASE, -3.0, M['esclusa']), D.caja('ext_i1', 8.7, 11.2, Y0, YW, ZBASE, -1.0, M['esclusa']),
       D.caja('ext_d0', 18.0, 19.7, Y0, YW, ZBASE, -1.0, M['esclusa']), D.caja('ext_d1', 34.7, 36.6, Y0, YW, ZBASE, -3.0, M['esclusa'])]
for o in [b for b, _, _ in bi + bd] + ext:
    for c in culv + cort:
        D.restar(o, c)
    D.aplicar_mods(o)
for c in cort:
    c.hide_render = True


def nivel(lado, i, t, z, interp='BEZIER'):
    a, f, ztop = aguas[(lado, i)]
    key(a, 'scale', t, (1, 1, max(0.001, (z - f) / (ztop - f))), interp)


def compuerta(lado, k, t, abierta, dur=0.6):
    g = compuertas[(lado, k)]
    key(g, 'rotation_euler', t, g.rotation_euler[:])
    ang = math.radians(-88 if lado == 'i' else 88) if abierta else 0.0
    key(g, 'rotation_euler', t + dur, (0, 0, ang))


# ---------- barco portacontenedores ----------
def portacontenedores(nombre):
    r = B.raiz(nombre)
    Lb, W = 4.0, 1.5
    perfil = [(-Lb / 2, -0.95), (Lb / 2 - 0.6, -0.95), (Lb / 2, 0.55), (-Lb / 2, 0.55)]
    y0, y1 = -W / 2, W / 2
    partes = [D.prisma_y(nombre + '_casco', perfil, y0, y1, M['casco_a']),
              D.caja(nombre + '_obra_viva', -Lb / 2 - 0.01, Lb / 2 - 0.6, y0 - 0.01, y1 + 0.01, -0.96, -0.35, M['casco_r']),
              D.caja(nombre + '_puente', -Lb / 2 + 0.1, -Lb / 2 + 0.7, y0 + 0.1, y1 - 0.1, 0.55, 1.5, M['blanco']),
              D.caja(nombre + '_vent', -Lb / 2 + 0.68, -Lb / 2 + 0.72, y0 + 0.15, y1 - 0.15, 1.2, 1.4, M['vidrio']),
              D.caja(nombre + '_chim', -Lb / 2 + 0.2, -Lb / 2 + 0.5, -0.15, 0.15, 1.5, 1.8, M['casco_r'])]
    rnd = random.Random(3)
    x = -Lb / 2 + 0.85
    while x < Lb / 2 - 0.9:
        for fila in range(3):
            for piso_c in range(rnd.randint(2, 3)):
                yy = y0 + 0.1 + fila * 0.44
                partes.append(D.caja(nombre + '_cont', x, x + 0.56, yy, yy + 0.42, 0.55 + piso_c * 0.24, 0.77 + piso_c * 0.24,
                                     CONT[rnd.randrange(len(CONT))]))
        x += 0.6
    B.hijos(r, partes)
    return r


YB_SHIP = Y0 + 1.2
barco = portacontenedores('barco')


def nav(t, x, z, interp='BEZIER'):
    key(barco, 'location', t, (x, YB_SHIP, z), interp)


# ---------- mulas (locomotoras) con cables al barco ----------
mulas, anclas = [], []
for k, dx in enumerate((1.6, -1.6)):
    m = B.raiz(f'mula{k}')
    B.hijos(m, [D.caja('mula_c', -0.35, 0.35, -0.22, 0.22, 0.0, 0.32, M['mula']),
                D.caja('mula_cab', -0.15, 0.25, -0.18, 0.18, 0.32, 0.5, M['vidrio']),
                D.caja('mula_f', -0.36, 0.36, -0.23, 0.23, 0.05, 0.11, M['amarillo'])])
    an = B.raiz(f'ancla{k}', (dx, 0.6, 0.55))
    an.parent = barco
    cab = B.cilindro(f'cable{k}', 0.018, 1.0, 'y', M['cable'], (0, 0, 0.15))
    cab.parent = m
    st = cab.constraints.new('STRETCH_TO')
    st.target = an
    st.volume = 'NO_VOLUME'
    st.rest_length = 1.0
    mulas.append((m, dx))
    key(m, 'scale', 0.0, (0, 0, 0), 'CONSTANT')

# ---------- patito ----------
pato = B.raiz('pato')
B.hijos(pato, [B.esfera('pato_c', 0.28, M['pato'], (0, 0, 0.08), esc=(1.3, 1.0, 0.8)),
               B.esfera('pato_cab', 0.17, M['pato'], (0.25, 0, 0.36)),
               B.esfera('pato_ojo', 0.03, M['negro'], (0.36, -0.12, 0.42))])
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.07, radius2=0.0, depth=0.16, location=(0.45, 0, 0.33), rotation=(0, math.pi / 2, 0))
bpy.context.object.data.materials.append(M['pico'])
bpy.context.object.parent = pato

# ---------- bomba tachada ----------
bomba = B.raiz('bomba', (-3.8, YF - 0.6, -1.6))
B.hijos(bomba, [D.caja('bomba_c', -0.5, 0.5, -0.3, 0.3, -0.4, 0.4, D.liso('bomba_m', (0.1, 0.3, 0.85), 0.35, metal=0.3)),
                B.cilindro('bomba_t', 0.15, 0.5, 'x', M['acero'], (0.5, 0, 0.1))])
for s in (1, -1):
    x = D.caja('cruz', -0.9, 0.9, -0.08, 0.08, -0.08, 0.08, M['cruz'])
    x.location = (0, -0.4, 0)
    x.rotation_euler = (0, s * math.pi / 4, 0)
    x.parent = bomba

# ================= animacion =================
# estado de reposo: camara 1 a nivel del mar, 2 a nivel 1, 3 a nivel 2; derecha: lago, 2, 1
for lado, niveles in (('i', (0, 1, 2)), ('d', (3, 2, 1))):
    for i, n in enumerate(niveles):
        nivel(lado, i, 0.0, L[n], 'CONSTANT')

# gancho: el barco sube en la camara 2
nav(0.0, 1.2, L[1], 'LINEAR')
nivel('i', 1, 0.0, L[1], 'LINEAR')
nivel('i', 1, 4.4, L[2])
nav(4.4, 1.2, L[2], 'CONSTANT')
nivel('i', 1, TC, L[2], 'CONSTANT')
for k in range(3):
    B.flujo(f'sube{k}', M['flecha_verde'], (-0.6 + 1.8 * k, YF - 0.5, 0.6), (-0.6 + 1.8 * k, YF - 0.5, 2.6), 'z', 0.4, 4.3, n=3, largo=0.7, sep=1.2)

# reinicio: barco en el mar
nivel('i', 1, TC + 0.02, L[1], 'CONSTANT')
nav(TC + 0.02, -12.0, L[0])
for k in range(4):
    key(compuertas[('i', k)], 'rotation_euler', 0.0, (0, 0, 0), 'CONSTANT')
    key(compuertas[('d', k)], 'rotation_euler', 0.0, (0, 0, 0), 'CONSTANT')
key(compuertas[('i', 0)], 'rotation_euler', TC + 0.02, (0, 0, math.radians(-88)), 'CONSTANT')
for t in (5.4, 9.4, 13.4, 17.4):
    nav(t, -12.0 + (t - 5) * 0.08, L[0] + (0.05 if int(t) % 2 else -0.03))
nav(17.6, -10.8, L[0])

G.letrero('lago_t', 'LAGO', M['etiqueta'], (12.8, Y0 + 6, L[3] + 1.5), tam=1.2, t_on=6.4, t_off=12.4)
G.letrero('mar_t', 'MAR', M['etiqueta'], (-9.0, Y0 + 6, L[0] + 1.6), tam=1.2, t_on=9.1, t_off=12.4)
B.medida('m26', 9.9, L[3], L[0], '26 m', M, 7.55, 12.3, lado=1)
for i, (x0, x1, nb, na) in enumerate(CAM_I):
    xc = (x0 + x1) / 2
    B.flujo(f'escalon{i}', M['flecha_verde'], (xc, YF - 0.5, L[nb] + 0.3), (xc, YF - 0.5, L[na] + 0.6), 'z', 11.35 + 0.25 * i, 12.2 + 0.25 * i, n=1, largo=0.8)

# caja de concreto y compuertas
rebote(compuertas[('i', 1)], 16.3, 1.0, 1.1)
key(compuertas[('i', 0)], 'scale', 16.3, (1, 1, 1))
key(compuertas[('i', 0)], 'scale', 16.45, (1.1, 1.1, 1.1))
key(compuertas[('i', 0)], 'scale', 16.65, (1, 1, 1))

# el barco entra a la camara 1 y cierran la compuerta de atras
X1, X2, X3 = -3.8, 1.2, 6.2
nav(19.4, X1, L[0], 'BEZIER')
compuerta('i', 0, 19.3, False, 0.7)
# tuneles: agua del lago baja por la toma y entra por el piso
for t0 in (20.5, 24.9):
    B.flujo(f'toma{t0}', M['flecha_azul'], (10.4, Y0 + 0.05, -1.3), (10.4, Y0 + 0.05, ZCUL), '-z', t0, t0 + 0.7, n=2, largo=0.6)
    B.flujo(f'cond{t0}', M['flecha_azul'], (9.6, Y0 + 0.05, ZCUL), (X1 + 0.6, Y0 + 0.05, ZCUL), '-x', t0 + 0.4, t0 + 1.6, n=4, largo=0.8, sep=0.25)
    B.flujo(f'sube{t0}', M['flecha_azul'], (X1, Y0 + 0.05, ZCUL + 0.2), (X1, Y0 + 0.05, piso(0) + 0.8), 'z', t0 + 1.4, t0 + 2.2, n=2, largo=0.6)
pop(bomba, 23.6, 0.3)
quitar(bomba, 24.7, 0.2)
key(bomba, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
# la camara se llena y el barco sube
nivel('i', 0, 25.2, L[0])
nivel('i', 0, 28.7, L[1])
nav(25.2, X1, L[0])
nav(28.7, X1, L[1])
key(pato, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(pato, 'location', 0.0, (-5.4, Y0 + 0.6, L[1] - 0.05), 'CONSTANT')
pop(pato, 28.85, 0.3, 1.6)
key(pato, 'location', 29.2, (-5.4, Y0 + 0.6, L[1] - 0.05))
key(pato, 'location', 29.6, (-5.4, Y0 + 0.6, L[1] + 0.05))
key(pato, 'location', 30.0, (-5.4, Y0 + 0.6, L[1] - 0.05))
quitar(pato, 30.1, 0.2, 1.6)

# mulas: aparecen y guian al barco por las camaras 2 y 3
def muro_top(x):
    for x0, x1, nb, na in CAM_I:
        if x < x1:
            return L[max(nb, na)] + 0.6
    return L[3] + 0.6


def mula_en(t, xb, interp='BEZIER'):
    for m, dx in mulas:
        key(m, 'location', t, (xb + dx, Y0 + 2.8, muro_top(xb + dx)), interp)


mula_en(0.0, X1, 'CONSTANT')
for m, dx in mulas:
    pop(m, 30.85 + (0.15 if dx < 0 else 0), 0.3)
compuerta('i', 1, 31.4, True, 0.4)
nivel('i', 1, 31.4, L[1], 'CONSTANT')
mula_en(31.7, X1)
nav(31.7, X1, L[1])
nav(32.5, X2, L[1])
mula_en(32.5, X2)
compuerta('i', 1, 32.5, False, 0.3)
nivel('i', 1, 32.8, L[1])
nivel('i', 1, 33.3, L[2], 'CONSTANT')
nav(32.8, X2, L[1])
nav(33.3, X2, L[2], 'LINEAR')
mula_en(33.3, X2)
compuerta('i', 2, 33.2, True, 0.3)
nav(34.0, X3, L[2])
mula_en(34.0, X3)
# del otro lado: el mismo barco baja (camara derecha 2 -> 1)
XD = 27.2
nav(34.05, XD, L[2], 'CONSTANT')
nivel('d', 1, 34.05, L[2], 'CONSTANT')
nav(34.3, XD, L[2], 'LINEAR')
nivel('d', 1, 34.3, L[2])
nav(36.1, XD, L[1], 'CONSTANT')
nivel('d', 1, 36.1, L[1])
for m, dx in mulas:
    quitar(m, 34.0, 0.05)
B.flujo('baja_d', M['flecha_roja'], (XD + 2.8, YF - 0.5, 2.4), (XD + 2.8, YF - 0.5, 0.6), '-z', 34.4, 36.0, n=3, largo=0.7, sep=0.5)
# 200 millones de litros salen al mar
nivel('d', 2, 36.4, L[1])
nivel('d', 2, 40.8, L[0] + 0.02)
compuerta('d', 3, 36.3, False, 0.1)
B.flujo('sale1', M['flecha_azul'], (32.2, Y0 + 0.05, piso(0) + 0.5), (32.2, Y0 + 0.05, ZCUL + 0.2), '-z', 36.6, 37.6, n=2, largo=0.6)
B.flujo('sale2', M['flecha_azul'], (32.8, Y0 + 0.05, ZCUL), (35.5, Y0 + 0.05, ZCUL), 'x', 37.2, 38.6, n=3, largo=0.8, sep=0.3)
B.flujo('sale3', M['flecha_azul'], (35.9, Y0 + 0.05, ZCUL + 0.2), (35.9, Y0 + 0.05, -2.6), 'z', 38.2, 39.6, n=3, largo=0.6, sep=0.3)
G.letrero('litros', '200.000.000 L', M['medida'], (33.5, YF - 0.6, 1.4), tam=0.75, t_on=38.3, t_off=41.0)

# final: vuelve el plano del gancho (el barco subiendo) para el loop
nav(41.1, 1.2, L[1], 'CONSTANT')
nivel('i', 1, 41.1, L[1], 'CONSTANT')
nivel('i', 1, 41.12, L[1])
nivel('i', 1, DUR, L[1] + (L[2] - L[1]) * (DUR - 41.12) / 4.4)
nav(41.12, 1.2, L[1])
nav(DUR, 1.2, L[1] + (L[2] - L[1]) * (DUR - 41.12) / 4.4)
for i, n in ((0, 0), (2, 2)):
    nivel('i', i, 41.1, L[n], 'CONSTANT')
for k in range(4):
    key(compuertas[('i', k)], 'rotation_euler', 41.1, (0, 0, 0), 'CONSTANT')

# ---------- entorno: selva y cerros ----------
rnd = random.Random(18)
for k in range(26):
    x = rnd.uniform(-22, 44)
    y = rnd.uniform(YW + 1.5, Y0 + 30)
    if -6.3 < x < 34.7 and y < YW + 1.5:
        continue
    if (x < -6.3 or x > 34.7 or 9.3 < x < 19.7) and y < Y0 + 40:
        continue
    D.arbol((x, y, ZTOP), alto=rnd.uniform(3.5, 5.5), semilla=k)
for k in range(10):
    x = rnd.uniform(-8, 34)
    D.arbol((x, rnd.uniform(YW + 1.2, Y0 + 12), ZTOP), alto=rnd.uniform(3.0, 4.5), semilla=100 + k)
hojas = D.pbr('cerro', 'forest_leaves_02', tam=6.0, tinte=(0.1, 0.3, 0.06), fac=0.6)
for x, y, r, h in ((-30, 90, 30, 14), (5, 110, 40, 20), (45, 95, 32, 15), (75, 120, 40, 18), (-60, 120, 40, 18)):
    B.esfera('cerro', 1.0, hojas, (x, y, ZTOP - 2), esc=(r, r * 0.6, h))

# ---------- camara ----------
TOMAS = [
    (0.0, (-1.0, -15.0, 5.0), (1.5, Y0 + 1, 1.2)),
    (4.6, (-1.5, -17.0, 6.0), (1.5, Y0 + 1, 1.2), 'CORTE'),
    (TC, (-3.0, -24.0, 8.5), (1.5, 3.0, 0.0)),
    (12.2, (-2.0, -26.0, 9.5), (2.0, 4.0, 0.0)),
    (13.0, (-6.0, -13.0, 4.0), (-3.5, Y0 + 1, 0.0)),
    (17.4, (-7.0, -14.5, 4.2), (-5.0, Y0 + 1, 0.0)),
    (19.6, (-6.0, -14.0, 4.0), (-3.5, Y0 + 1, 0.0)),
    (20.3, (3.5, -19.0, 0.5), (3.5, Y0, -2.4)),
    (23.3, (3.0, -18.0, 0.5), (3.0, Y0, -2.3)),
    (24.0, (-2.0, -15.0, 2.5), (-2.5, Y0, -0.8)),
    (28.9, (-3.5, -12.0, 3.5), (-4.0, Y0 + 1, 0.6)),
    (30.2, (-3.5, -12.0, 4.5), (-3.5, Y0 + 1, 1.2)),
    (31.2, (-3.5, -13.0, 5.0), (-3.0, Y0 + 1, 1.6)),
    (32.5, (1.0, -13.0, 5.5), (1.2, Y0 + 1, 2.0)),
    (33.3, (1.5, -13.5, 6.0), (2.0, Y0 + 1, 2.3)),
    (34.0, (5.5, -14.0, 6.5), (6.0, Y0 + 1, 2.6), 'CORTE'),
    (34.05, (25.0, -14.0, 6.0), (27.5, Y0 + 1, 1.0)),
    (36.2, (26.0, -14.5, 5.0), (28.5, Y0 + 1, 0.5)),
    (37.2, (33.0, -12.5, 0.8), (33.5, Y0, -1.8)),
    (40.9, (33.0, -13.5, 1.0), (33.5, Y0, -1.8), 'CORTE'),
    (41.1, (-1.0, -15.0, 5.0), (1.5, Y0 + 1, 1.2)),
    (DUR, (-1.5, -16.0, 5.5), (1.5, Y0 + 1, 1.2)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
