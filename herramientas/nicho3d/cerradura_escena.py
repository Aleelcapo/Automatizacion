"""35 — Como funciona una cerradura (pernos). Audio: .tmp_render/lote3/a9_limpio.m4a (36.7 s)."""
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

opt, salida = B.inicio(35)
DUR = 37.35
TC = 4.4
M = B.materiales()
M.update({
    'laton': D.liso('laton', (0.78, 0.58, 0.22), 0.35, metal=0.85),
    'laton2': D.liso('laton2', (0.9, 0.72, 0.32), 0.3, metal=0.85),
    'perno_l': D.liso('perno_l', (0.85, 0.35, 0.15), 0.35, metal=0.6),
    'perno_s': D.liso('perno_s', (0.62, 0.66, 0.72), 0.3, metal=0.9),
    'llave': D.liso('llave', (0.8, 0.82, 0.85), 0.25, metal=0.95),
    'llave_mal': D.liso('llave_mal', (0.55, 0.45, 0.35), 0.3, metal=0.8),
    'linea': D.liso('linea', (1.0, 0.85, 0.1), 0.4, emit=3.0),
    'rojo_e': D.liso('rojo_e', (1.0, 0.1, 0.05), 0.4, emit=2.5),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'puerta': D.pbr('puerta', 'brown_planks_05', tam=2.0, tinte=(0.45, 0.28, 0.15), fac=0.4),
})
ZC = 5.0                    # centro del cilindro
R = 1.0
ZS = ZC + R                 # linea de corte
XP = [-2.4, -1.2, 0.0, 1.2, 2.4]
T_OK = [5.35, 5.0, 5.55, 5.15, 5.45]       # alto de cada diente de la llave buena
T_MAL = [5.35, 5.0, 5.15, 5.15, 5.45]      # la equivocada: el del medio es mas bajo
LP = [ZS - t for t in T_OK]                # largo de cada perno de abajo
LD = 0.9                                   # perno de arriba
Z_REPOSO = 4.45
Z_TECHO = 8.6
SAL = -7.5                                 # llave afuera (desplazamiento en x)

# ---------- puerta de fondo ----------
D.caja('puerta', -30, 30, Y0 + 2.2, Y0 + 2.6, -10, 25, M['puerta'])
D.caja('piso', -60, 60, Y0 - 30, Y0 + 30, -10.2, -10.0, M['piso'])

# ---------- carcasa con huecos ----------
cort = [B.cilindro('h_tambor', R + 0.03, 8.0, 'x', M['negro'], (-4.5, Y0, ZC))]
for x in XP:
    cort.append(B.cilindro('h_perno', 0.27, Z_TECHO - ZC + 0.05, 'z', M['negro'], (x, Y0, ZC)))
carcasa = D.caja('carcasa', -4.0, 3.2, Y0, Y0 + 2.2, ZC - 1.7, Z_TECHO + 0.5, M['laton'])
for c in cort:
    D.restar(carcasa, c)
D.aplicar_mods(carcasa)

# ---------- tambor (cilindro) con su ranura y los pernos de abajo ----------
tambor = B.raiz('tambor', (0, Y0, ZC))
bpy.context.view_layer.update()
media = B.medio_tubo('cilindro', R, -4.0, 3.2, 'x', M['laton2'], (0, Y0, ZC), solido=True)
for c in [D.caja('ranura', -4.5, 3.3, Y0 - 1, Y0 + 0.45, ZC - 0.75, ZC + 0.3)] + \
        [B.cilindro('h_p', 0.27, 2.2, 'z', M['negro'], (x, Y0, ZC - 0.5)) for x in XP]:
    D.restar(media, c)
D.aplicar_mods(media)


def colgar(o, padre):
    o.parent = padre
    o.matrix_parent_inverse = padre.matrix_world.inverted()


colgar(media, tambor)
pern_l, pern_s, resortes = [], [], []
for i, x in enumerate(XP):
    pl = B.cilindro(f'perno_l{i}', 0.24, LP[i], 'z', M['perno_l'], (x, Y0 + 0.05, Z_REPOSO))
    colgar(pl, tambor)
    ps = B.cilindro(f'perno_s{i}', 0.24, LD, 'z', M['perno_s'], (x, Y0 + 0.05, Z_REPOSO + LP[i]))
    pts = []
    for k in range(61):
        a = 2 * math.pi * 8 * k / 60
        pts.append((0.18 * math.cos(a), 0.18 * math.sin(a), k / 60))
    rs = B.curva(f'resorte{i}', pts, M['perno_s'], grosor=0.035)
    rs.location = (x, Y0 + 0.05, Z_REPOSO + LP[i] + LD)
    pern_l.append(pl)
    pern_s.append(ps)
    resortes.append(rs)


def hacer_llave(nombre, T, m):
    r = B.raiz(nombre, (SAL, Y0, 0))
    top = [(2.95, 4.62)]
    for x, t in reversed(list(zip(XP, T))):
        top += [(x + 0.38, 4.78), (x, t), (x - 0.38, 4.78)]
    top += [(-4.6, 4.95)]
    perfil = [(-4.6, 4.33), (2.95, 4.33)] + top
    hoja = D.prisma_y(nombre + '_hoja', perfil, 0.08, 0.4, m)
    cuello = D.caja(nombre + '_cuello', -5.6, -4.5, 0.05, 0.43, 4.2, 5.4, m)
    cabeza = B.cilindro(nombre + '_cabeza', 1.5, 0.38, 'y', m, (-6.9, 0.05, ZC - 0.2))
    agujero = B.cilindro(nombre + '_ag', 0.4, 1.0, 'y', m, (-7.6, -0.3, ZC - 0.2))
    D.restar(cabeza, agujero)
    D.aplicar_mods(cabeza)
    B.hijos(r, [hoja, cuello, cabeza])
    return r, perfil


llave, perf_ok = hacer_llave('llave', T_OK, M['llave'])
llave_mal, perf_mal = hacer_llave('llave_mal', T_MAL, M['llave_mal'])
colgar(llave, tambor)
colgar(llave_mal, tambor)
llave.location = (SAL, Y0, 0)
llave_mal.location = (SAL, Y0, 0)


def alto_llave(T, xl):
    """alto de la cara de arriba de la llave en la coordenada local xl (None si no hay llave)."""
    top = [(2.95, 4.62)]
    for x, t in reversed(list(zip(XP, T))):
        top += [(x + 0.38, 4.78), (x, t), (x - 0.38, 4.78)]
    top += [(-4.6, 4.95)]
    if xl > 2.95 or xl < -4.6:
        return None
    for (xa, za), (xb, zb) in zip(top, top[1:]):
        if xb <= xl <= xa:
            return za + (zb - za) * (xa - xl) / (xa - xb)
    return 4.78


def meter(obj, T, t0, t1, d0=SAL, d1=0.0, pasos=24, interp='LINEAR'):
    for k in range(pasos + 1):
        u = k / pasos
        t = t0 + (t1 - t0) * u
        d = d0 + (d1 - d0) * (u * u * (3 - 2 * u))
        key(obj, 'location', t, (d, Y0, 0), interp)
        for i, x in enumerate(XP):
            h = alto_llave(T, x - d)
            zb = Z_REPOSO if h is None else max(Z_REPOSO, h)
            key(pern_l[i], 'location', t, (x, Y0 + 0.05, zb), interp)
            key(pern_s[i], 'location', t, (x, Y0 + 0.05, zb + LP[i]), interp)
            key(resortes[i], 'location', t, (x, Y0 + 0.05, zb + LP[i] + LD), interp)
            key(resortes[i], 'scale', t, (1, 1, Z_TECHO - (zb + LP[i] + LD)), interp)


def reposo(t, interp='CONSTANT'):
    for i, x in enumerate(XP):
        key(pern_l[i], 'location', t, (x, Y0 + 0.05, Z_REPOSO), interp)
        key(pern_s[i], 'location', t, (x, Y0 + 0.05, Z_REPOSO + LP[i]), interp)
        key(resortes[i], 'location', t, (x, Y0 + 0.05, Z_REPOSO + LP[i] + LD), interp)
        key(resortes[i], 'scale', t, (1, 1, Z_TECHO - (Z_REPOSO + LP[i] + LD)), interp)


def visible(o, t_on, t_off):
    key(o, 'scale', t_on - 0.05, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t_on, (1, 1, 1), 'CONSTANT')
    key(o, 'scale', t_off, (1, 1, 1), 'CONSTANT')
    key(o, 'scale', t_off + 0.05, (0, 0, 0), 'CONSTANT')


# ================= animacion =================
key(llave, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
meter(llave, T_OK, 0.0, 2.6)
key(llave, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(llave, 'location', TC, (SAL, Y0, 0), 'CONSTANT')
reposo(TC)
key(llave_mal, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
# partes
rebote(tambor, 5.9, 1.0, 1.06)
for k, o in enumerate(pern_s):
    rebote(o, 8.2 + 0.1 * k, 1.0, 1.25)
for k, o in enumerate(resortes):
    key(o, 'scale', 10.1, (1, 1, Z_TECHO - (Z_REPOSO + LP[k] + LD)))
    key(o, 'scale', 10.3, (1, 1, (Z_TECHO - (Z_REPOSO + LP[k] + LD)) * 0.8))
    key(o, 'scale', 10.6, (1, 1, Z_TECHO - (Z_REPOSO + LP[k] + LD)))
# sin llave: los pernos de arriba traban
traban = []
for i, x in enumerate(XP):
    b = D.caja('traba', x - 0.32, x + 0.32, YF - 0.1, YF, ZS - 0.06, ZS + 0.06, M['rojo_e'])
    key(b, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(b, 13.9 + 0.08 * i, 0.2)
    quitar(b, 15.5, 0.2)
    traban.append(b)
key(tambor, 'rotation_euler', 0.0, (0, 0, 0), 'CONSTANT')
for k, t in enumerate((14.6, 14.75, 14.9, 15.05, 15.2)):
    key(tambor, 'rotation_euler', t, (math.radians(4 if k % 2 else -4) if k < 4 else 0, 0, 0), 'LINEAR')
# llave buena, despacio
pop(llave, 15.7, 0.3)
key(llave, 'location', 15.6, (SAL, Y0, 0), 'CONSTANT')
reposo(16.3, 'LINEAR')
meter(llave, T_OK, 16.3, 20.9, pasos=40)
# linea de corte y gira
linea = D.caja('linea', -4.2, 3.4, YF - 0.12, YF - 0.02, ZS - 0.03, ZS + 0.03, M['linea'])
key(linea, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(linea, 'scale', 2.9, (0, 0, 0), 'CONSTANT')
pop(linea, 3.0, 0.25)
quitar(linea, TC, 0.15)
pop(linea, 22.2, 0.3)
quitar(linea, 26.2, 0.2)
pop(linea, 37.0, 0.25)
key(tambor, 'rotation_euler', 24.6, (0, 0, 0))
key(tambor, 'rotation_euler', 25.9, (math.radians(-80), 0, 0))
key(tambor, 'rotation_euler', 26.2, (math.radians(-80), 0, 0), 'CONSTANT')
key(tambor, 'rotation_euler', 26.25, (0, 0, 0), 'CONSTANT')
key(llave, 'scale', 26.2, (1, 1, 1), 'CONSTANT')
key(llave, 'scale', 26.25, (0, 0, 0), 'CONSTANT')
key(llave, 'location', 26.25, (SAL, Y0, 0), 'CONSTANT')
reposo(26.25)
# llave equivocada
pop(llave_mal, 26.6, 0.3)
key(llave_mal, 'location', 26.5, (SAL, Y0, 0), 'CONSTANT')
reposo(27.0, 'LINEAR')
meter(llave_mal, T_MAL, 27.0, 28.9, pasos=24)
mal = D.caja('mal', XP[2] - 0.34, XP[2] + 0.34, YF - 0.1, YF, ZS - 0.07, ZS + 0.07, M['rojo_e'])
key(mal, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(mal, 29.0, 0.25)
quitar(mal, 31.8, 0.2)
for k, t in enumerate((30.8, 30.95, 31.1, 31.25, 31.4)):
    key(tambor, 'rotation_euler', t, (math.radians(4 if k % 2 else -4) if k < 4 else 0, 0, 0), 'LINEAR')
quitar(llave_mal, 31.8, 0.2)
reposo(31.95, 'LINEAR')
reposo(32.1)
# millones de combinaciones: muchas llaves alrededor
rnd = random.Random(35)
llaves_c = []
for k in range(14):
    T = [rnd.uniform(4.95, 5.6) for _ in XP]
    lk, _ = hacer_llave(f'llave_c{k}', T, D.liso(f'llc{k}', (rnd.uniform(0.5, 0.95), rnd.uniform(0.5, 0.9), rnd.uniform(0.4, 0.9)), 0.3, metal=0.8))
    col, fil = k % 2, k // 2
    lk.location = (-9.0 if col == 0 else 7.0, Y0 - 0.6, -0.5 + fil * 1.75)
    lk.scale = (0.45, 0.45, 0.45)
    key(lk, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(lk, 32.4 + 0.08 * k, 0.25, 0.45)
    quitar(lk, 34.7, 0.2, 0.45)
    llaves_c.append(lk)
# vuelta al gancho
key(llave, 'scale', 34.85, (0, 0, 0), 'CONSTANT')
key(llave, 'scale', 34.9, (1, 1, 1), 'CONSTANT')
meter(llave, T_OK, 34.9, 37.5)

# ---------- carteles ----------
G.letrero('cil_t', 'CILINDRO', M['etiqueta'], (-0.4, YF - 0.3, ZC - 2.3), tam=0.7, t_on=5.9, t_off=10.9)
G.letrero('per_t', 'PERNOS', M['etiqueta'], (-0.4, YF - 0.3, Z_TECHO + 1.2), tam=0.7, t_on=8.2, t_off=10.9)
G.letrero('res_t', 'RESORTES', M['etiqueta'], (-0.4, YF - 0.3, Z_TECHO + 2.1), tam=0.6, t_on=10.2, t_off=10.9)
G.letrero('no_t', 'NO GIRA', M['rojo_e'], (-0.4, YF - 0.3, ZC - 2.3), tam=0.8, t_on=15.0, t_off=15.6)
G.letrero('linea_t', 'LÍNEA DE CORTE', M['linea'], (-0.4, YF - 0.3, Z_TECHO + 1.2), tam=0.6, t_on=22.2, t_off=26.2)
G.letrero('gira_t', 'GIRA', M['flecha_verde'], (-0.4, YF - 0.3, ZC - 2.3), tam=0.8, t_on=25.7, t_off=26.2)
G.letrero('noabre_t', 'NO ABRE', M['rojo_e'], (-0.4, YF - 0.3, ZC - 2.3), tam=0.8, t_on=31.1, t_off=31.9)
G.letrero('mill_t', 'MILLONES', M['medida'], (-0.4, YF - 0.6, Z_TECHO + 1.6), tam=1.1, t_on=32.6, t_off=34.7)

# ---------- camara ----------
GANCHO = ((-1.5, -12.5, 6.4), (-1.2, Y0, 6.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (-1.5, -13.2, 6.5), (-1.2, Y0, 6.0), 'CORTE'),
    (TC, (-0.5, -12.0, 6.6), (-0.5, Y0, 6.3)),
    (11.0, (-0.5, -12.8, 6.6), (-0.5, Y0, 6.3)),
    (11.5, (-0.3, -11.5, 6.4), (-0.3, Y0, 6.2)),
    (15.5, (-0.3, -12.0, 6.4), (-0.3, Y0, 6.2)),
    (15.9, (-2.0, -13.0, 6.0), (-1.5, Y0, 5.8)),
    (21.0, (-1.2, -12.0, 6.0), (-0.8, Y0, 5.8)),
    (24.4, (-0.8, -11.5, 6.0), (-0.5, Y0, 5.8)),
    (26.3, (-2.0, -13.0, 6.0), (-1.5, Y0, 5.8)),
    (31.9, (-1.0, -12.0, 6.0), (-0.5, Y0, 5.8)),
    (32.2, (-0.5, -22.0, 6.5), (-0.5, Y0, 6.0)),
    (34.8, (-0.5, -23.0, 6.5), (-0.5, Y0, 6.0), 'CORTE'),
    (34.9, *GANCHO),
    (DUR, (-1.5, -13.0, 6.5), (-1.2, Y0, 6.0)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
