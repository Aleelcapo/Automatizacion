"""36 — Como funciona la lavadora (contrapesos de concreto). Audio: .tmp_render/lote3/a10_limpio.m4a (35.5 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(36)
DUR = 36.1
TC = 3.4
M = B.materiales()
M.update({
    'gabinete': D.liso('gabinete', (0.93, 0.93, 0.92), 0.35),
    'cuba': D.liso('cuba', (0.35, 0.37, 0.4), 0.4),
    'tambor': D.liso('tambor', (0.78, 0.8, 0.84), 0.25, metal=0.9),
    'contrapeso': D.pbr('contrapeso', 'rough_concrete', tam=0.8, tinte=(0.4, 0.4, 0.38), fac=0.7, brillo=1.0),
    'gota': D.liso('gota', (0.3, 0.65, 1.0), 0.2, emit=0.8),
    'paraguas': D.liso('paraguas', (0.85, 0.12, 0.15), 0.4),
    'azulejo': D.pbr('azulejo', 'smooth_concrete_floor', tam=1.0, tinte=(0.8, 0.85, 0.88), fac=0.6),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
ROPA = [D.liso(f'ropa{k}', c, 0.8) for k, c in enumerate(((0.85, 0.2, 0.2), (0.2, 0.45, 0.85), (0.95, 0.75, 0.1),
                                                          (0.25, 0.65, 0.3), (0.6, 0.3, 0.7), (0.95, 0.5, 0.2)))]
ZC = 4.2                     # eje del tambor
RT, RC = 2.32, 2.7           # radio del tambor y de la cuba


def colgar(o, padre):
    bpy.context.view_layer.update()
    o.parent = padre
    o.matrix_parent_inverse = padre.matrix_world.inverted()


# ---------- lavadero ----------
D.caja('piso', -30, 30, Y0 - 20, Y0 + 20, -0.2, 0.0, M['azulejo'])
D.caja('pared', -30, 30, Y0 + 7.0, Y0 + 7.4, -0.2, 20.0, M['muro'])
D.caja('estante', -9.0, -4.5, Y0 + 5.0, Y0 + 7.0, 9.0, 9.2, M['madera'])

# ---------- maquina ----------
maquina = B.raiz('maquina', (0, Y0, 0))
gab = [D.caja('lado_i', -3.2, -3.0, Y0, Y0 + 6.0, 0.0, 8.5, M['gabinete']),
       D.caja('lado_d', 3.0, 3.2, Y0, Y0 + 6.0, 0.0, 8.5, M['gabinete']),
       D.caja('techo', -3.2, 3.2, Y0, Y0 + 6.0, 8.3, 8.5, M['gabinete']),
       D.caja('base', -3.2, 3.2, Y0, Y0 + 6.0, 0.0, 0.2, M['gabinete']),
       D.caja('fondo', -3.2, 3.2, Y0 + 5.8, Y0 + 6.0, 0.0, 8.5, M['gabinete']),
       D.caja('panel', -3.2, 3.2, Y0 - 0.05, Y0 + 0.4, 7.6, 8.5, M['gabinete']),
       B.cilindro('perilla', 0.3, 0.2, 'y', M['acero_claro'], (2.3, Y0 - 0.15, 8.05))]
for o in gab:
    colgar(o, maquina)
resortes = []
for x in (-2.3, 2.3):
    pts = [(0.22 * math.cos(2 * math.pi * 9 * k / 80), 0.22 * math.sin(2 * math.pi * 9 * k / 80), -2.7 * k / 80) for k in range(81)]
    r = B.curva('resorte', pts, M['acero_claro'], grosor=0.05)
    r.location = (x, Y0 + 2.8, 8.3)
    colgar(r, maquina)
    resortes.append(r)
amort = []
for x in (-2.0, 2.0):
    a = B.raiz('amort', (x, Y0 + 2.8, 0.2))
    B.hijos(a, [B.cilindro('am_a', 0.2, 1.1, 'z', M['negro'], (0, 0, 0)),
                B.cilindro('am_b', 0.1, 1.1, 'z', M['acero_claro'], (0, 0, 1.0))])
    colgar(a, maquina)
    amort.append(a)

# cuba (se sacude) con los contrapesos y el tambor adentro
cuba = B.raiz('cuba', (0, Y0, ZC))
colgar(cuba, maquina)
tubo = B.cilindro('cuba_ext', RC, 5.5, 'y', M['cuba'], (0, Y0 + 0.1, ZC), verts=48)
D.restar(tubo, B.cilindro('cuba_int', RC - 0.18, 6.0, 'y', M['cuba'], (0, Y0 - 0.3, ZC), verts=48))
D.aplicar_mods(tubo)
tapa = B.cilindro('cuba_tapa', RC, 0.15, 'y', M['cuba'], (0, Y0 + 5.45, ZC), verts=48)
bloque_a = D.caja('bloque_a', -1.8, 1.8, Y0 + 0.4, Y0 + 4.8, ZC + RC - 0.15, ZC + RC + 0.75, M['contrapeso'])
bloque_b = D.caja('bloque_b', -1.5, 1.5, Y0 + 0.2, Y0 + 1.6, ZC - RC - 0.65, ZC - RC + 0.25, M['contrapeso'])
B.origen(bloque_a, (0, Y0 + 2.6, ZC + RC + 0.3))
B.origen(bloque_b, (0, Y0 + 0.9, ZC - RC - 0.2))
for o in (tubo, tapa, bloque_a, bloque_b):
    colgar(o, cuba)
tambor = B.raiz('tambor', (0, Y0, ZC))
colgar(tambor, cuba)
n = 40
ancho = 2 * math.pi * RT / n
seg = []
for k in range(n):
    a = 2 * math.pi * k / n
    s = D.caja('lama', -ancho * 0.36, ancho * 0.36, Y0 + 0.3, Y0 + 5.2, -0.08, 0.08, M['tambor'])
    s.location = (RT * math.cos(a), 0, ZC + RT * math.sin(a))
    s.rotation_euler = (0, -a + math.pi / 2, 0)
    seg.append(s)
seg.append(B.cilindro('tambor_fondo', RT, 0.1, 'y', M['cuba'], (0, Y0 + 5.15, ZC), verts=48))
for k in range(3):
    a = 2 * math.pi * k / 3
    p = D.caja('paleta', -0.12, 0.12, Y0 + 0.4, Y0 + 5.1, -0.35, 0.0, M['tambor'])
    p.location = ((RT - 0.05) * math.cos(a), 0, ZC + (RT - 0.05) * math.sin(a))
    p.rotation_euler = (0, -a + math.pi / 2, 0)
    seg.append(p)
for o in seg:
    colgar(o, tambor)
# ropa pegada a la pared del tambor
ropa = []
for k in range(6):
    o = B.esfera('ropa', 0.55, ROPA[k], (0, 0, 0), esc=(1.3, 1.6, 0.55))
    ropa.append(o)
    a = 2 * math.pi * k / 6
    o.location = ((RT - 0.45) * math.cos(a), Y0 + 1.0 + 0.6 * (k % 3), ZC + (RT - 0.45) * math.sin(a))
    o.rotation_euler = (0, -a + math.pi / 2, 0)
    colgar(o, tambor)


def ropa_en(t, angs, interp='BEZIER'):
    for k, o in enumerate(ropa):
        a = angs[k]
        key(o, 'location', t, ((RT - 0.45) * math.cos(a), Y0 + 1.0 + 0.6 * (k % 3), ZC + (RT - 0.45) * math.sin(a)), interp)
        key(o, 'rotation_euler', t, (0, -a + math.pi / 2, 0), interp)


PAREJA = [2 * math.pi * k / 6 for k in range(6)]
JUNTA = [1.2 + 0.35 * k for k in range(6)]
ropa_en(0.0, PAREJA, 'CONSTANT')
ropa_en(18.0, PAREJA)
ropa_en(18.9, JUNTA)
ropa_en(33.6, JUNTA, 'CONSTANT')
ropa_en(33.65, PAREJA, 'CONSTANT')

# giro del tambor (alrededor del eje y)
def vel(t):
    if t < TC:
        return 1.0
    if t < 5.9:
        return 0.5
    if t < 7.4:
        return 0.5 + 2.0 * (t - 5.9) / 1.5
    if t < 33.6:
        return 2.5
    return 1.0


a, t = 0.0, 0.0
while t <= DUR + 0.01:
    key(tambor, 'rotation_euler', t, (0, -a, 0), 'LINEAR')
    a += 2 * math.pi * vel(t) * 0.1
    t = round(t + 0.1, 2)


# sacudidas de la cuba
def amp(t):
    if t < TC:
        return 0.03
    if t < 19.4:
        return 0.02
    if t < 20.4:
        return 0.02 + 0.33 * (t - 19.4)
    if t < 27.0:
        return 0.35
    if t < 27.8:
        return 0.35 - 0.3 * (t - 27.0) / 0.8
    if t < 33.6:
        return 0.06
    return 0.03


t = 0.0
k = 0
while t <= DUR + 0.01:
    A = amp(t)
    key(cuba, 'location', t, (A * (1 if k % 2 else -1) * 0.8, Y0, ZC + A * (0.6 if k % 3 else -0.6)), 'LINEAR')
    t = round(t + 0.08, 2)
    k += 1

# la maquina baila al final
t = 31.9
k = 0
key(maquina, 'location', 0.0, (0, Y0, 0), 'CONSTANT')
key(maquina, 'rotation_euler', 0.0, (0, 0, 0), 'CONSTANT')
key(maquina, 'location', t, (0, Y0, 0))
key(maquina, 'rotation_euler', t, (0, 0, 0))
while t < 33.4:
    t = round(t + 0.12, 2)
    key(maquina, 'location', t, (0.12 * k, Y0, 0.35 if k % 2 == 0 else 0.0), 'LINEAR')
    key(maquina, 'rotation_euler', t, (0, math.radians(4 if k % 2 else -4), math.radians(8 if k % 2 else -8)), 'LINEAR')
    k += 1
key(maquina, 'location', 33.55, (0.12 * k, Y0, 0.0))
key(maquina, 'rotation_euler', 33.55, (0, 0, 0))
key(maquina, 'location', 33.6, (0, Y0, 0), 'CONSTANT')

# ---------- gotas que salen disparadas ----------
for k in range(16):
    a = 2 * math.pi * k / 16 + 0.1
    g = B.esfera('gota', 0.17, M['gota'], (0, 0, 0))
    key(g, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    for c in range(3):
        t0 = 11.9 + 0.55 * c + 0.03 * k
        key(g, 'scale', t0 - 0.01, (0, 0, 0), 'CONSTANT')
        key(g, 'scale', t0, (1, 1, 1), 'CONSTANT')
        key(g, 'location', t0, (RT * math.cos(a), YF - 0.2, ZC + RT * math.sin(a)), 'LINEAR')
        key(g, 'location', t0 + 0.45, ((RT + 1.6) * math.cos(a), YF - 0.2, ZC + (RT + 1.6) * math.sin(a)), 'LINEAR')
        key(g, 'scale', t0 + 0.45, (0, 0, 0), 'CONSTANT')

# ---------- paraguas ----------
par = B.raiz('paraguas', (-5.6, Y0 + 1.0, 4.0))
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=1.5, radius2=0.0, depth=0.7, location=(0, 0, 2.1))
copa = bpy.context.object
copa.data.materials.append(M['paraguas'])
B.hijos(par, [copa, B.cilindro('mango', 0.05, 2.4, 'z', M['negro'], (0, 0, 0))])
key(par, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(par, 13.9, 0.3)
quitar(par, 15.4, 0.2)
key(par, 'rotation_euler', 13.9, (0, 0, 0), 'LINEAR')
key(par, 'rotation_euler', 15.4, (0, 0, 2 * math.pi * 4), 'LINEAR')
for k in range(10):
    a = 2 * math.pi * k / 10
    g = B.esfera('gota_p', 0.1, M['gota'], (0, 0, 0))
    key(g, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    for c in range(2):
        t0 = 14.2 + 0.5 * c + 0.02 * k
        key(g, 'scale', t0 - 0.01, (0, 0, 0), 'CONSTANT')
        key(g, 'scale', t0, (1, 1, 1), 'CONSTANT')
        key(g, 'location', t0, (-5.6 + 1.5 * math.cos(a), Y0 + 1.0 + 1.5 * math.sin(a), 5.75), 'LINEAR')
        key(g, 'location', t0 + 0.45, (-5.6 + 2.8 * math.cos(a), Y0 + 1.0 + 2.8 * math.sin(a), 5.2), 'LINEAR')
        key(g, 'scale', t0 + 0.45, (0, 0, 0), 'CONSTANT')

# ---------- carteles y senales ----------
G.letrero('conc_t', 'CONCRETO', M['medida'], (0.0, YF - 0.5, 9.3), tam=0.9, t_on=1.5, t_off=TC)
G.letrero('conc_t2', 'CONCRETO', M['medida'], (0.0, YF - 0.5, 9.3), tam=0.9, t_on=22.1, t_off=24.0)
for t in (1.6, 22.2):
    rebote(bloque_a, t, 1.0, 1.12)
    rebote(bloque_b, t + 0.15, 1.0, 1.12)
G.letrero('agujeros_t', 'CIENTOS DE AGUJEROS', M['etiqueta'], (0.0, YF - 0.5, 0.9), tam=0.55, t_on=4.4, t_off=8.4)
G.letrero('rpm', '+1.000 VUELTAS / MIN', M['medida'], (0.0, YF - 0.5, 9.3), tam=0.6, t_on=7.4, t_off=8.9)
G.letrero('pared_t', 'ROPA PEGADA A LA PARED', M['etiqueta'], (0.0, YF - 0.5, 0.9), tam=0.45, t_on=10.4, t_off=11.8)
G.letrero('res_t', 'RESORTES', M['etiqueta'], (0.0, YF - 0.5, 9.3), tam=0.8, t_on=24.0, t_off=24.6)
G.letrero('amo_t', 'AMORTIGUADORES', M['etiqueta'], (0.0, YF - 0.5, 9.3), tam=0.7, t_on=24.7, t_off=26.2)
G.letrero('auto_t', 'COMO UN AUTO', M['etiqueta'], (0.0, YF - 0.5, 0.9), tam=0.6, t_on=25.5, t_off=26.3)
for o in resortes:
    rebote(o, 23.9, 1.0, 1.12)
for o in amort:
    rebote(o, 24.7, 1.0, 1.15)
G.letrero('baila_t', '¡A BAILAR!', M['medida'], (0.0, YF - 0.5, 9.6), tam=0.9, t_on=32.4, t_off=33.6)

# ---------- camara ----------
GANCHO = ((0.0, -13.0, 5.8), (0.0, Y0 + 1, 5.3))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (0.0, -13.6, 5.9), (0.0, Y0 + 1, 5.3), 'CORTE'),
    (TC, (0.0, -8.5, 4.4), (0.0, Y0 + 1, 4.3)),
    (8.8, (0.0, -8.0, 4.3), (0.0, Y0 + 1, 4.3)),
    (13.6, (0.0, -8.6, 4.4), (0.0, Y0 + 1, 4.3)),
    (14.0, (-3.6, -10.0, 4.8), (-3.8, Y0 + 1, 4.4)),
    (15.3, (-3.4, -10.2, 4.8), (-3.6, Y0 + 1, 4.4)),
    (15.6, (0.0, -9.0, 4.4), (0.0, Y0 + 1, 4.3)),
    (20.6, (0.0, -9.5, 4.5), (0.0, Y0 + 1, 4.3)),
    (21.2, (0.0, -13.0, 5.8), (0.0, Y0 + 1, 5.3)),
    (30.4, (0.0, -13.5, 5.8), (0.0, Y0 + 1, 5.3)),
    (31.2, (0.0, -16.0, 5.6), (0.3, Y0 + 1, 5.0)),
    (33.5, (0.0, -16.4, 5.6), (0.3, Y0 + 1, 5.0), 'CORTE'),
    (33.6, *GANCHO),
    (DUR, (0.0, -13.5, 5.9), (0.0, Y0 + 1, 5.3)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
