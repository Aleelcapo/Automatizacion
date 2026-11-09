"""09 — Cine bajo el patio. Audio: .tmp_render/lote/c9_limpio.m4a."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(9)
DUR = 37.9
TC = 4.65
M = B.materiales()
M.update({
    'butaca': D.liso('butaca', (0.6, 0.05, 0.08), 0.75),
    'panel_tela': D.liso('panel_tela', (0.18, 0.12, 0.35), 0.95),
    'alfombra': D.liso('alfombra', (0.12, 0.1, 0.16), 0.95),
    'pantalla': D.liso('pantalla', (0.9, 0.9, 0.95), 0.4, emit=0.0),
    'haz': D.liso('haz', (0.9, 0.95, 1.0), 0.4, emit=0.5),
    'parlante': D.liso('parlante', (0.05, 0.05, 0.06), 0.5),
    'onda': D.liso('onda', (1.0, 0.6, 0.15), 0.4, emit=2.5),
    'sombra': D.liso('sombra', (0.0, 0.0, 0.0), 0.9),
    'piel': D.liso('piel', (0.85, 0.62, 0.48), 0.6),
    'camisa': D.liso('camisa', (0.15, 0.6, 0.3), 0.7),
    'pantalon': D.liso('pantalon', (0.15, 0.15, 0.2), 0.7),
    'zzz': D.liso('zzz', (0.7, 0.85, 1.0), 0.4, emit=2.5),
})
haz = M['haz']
haz.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.06
haz.surface_render_method = 'BLENDED'

RX0, RX1, RY1 = -5.0, 5.0, Y0 + 6.0
PISO, TECHO = -4.0, -1.0
W = 0.35
ESC0 = -8.6                       # inicio de la escalera en el jardin

B.terreno(M, [(ESC0, RX1 + W, RY1 + W, PISO - W - 0.1)])
B.relleno_hoyo(M, ESC0, RX1 + W, RY1 + W, PISO - W - 0.1, TC, 5.06, 6.2)
B.monton(M, (10.0, 4.0, 0.0), 5.06, 6.2, t_fin=10.5, esc=(2.6, 2.2, 1.3))
B.medida('m4', RX1 + W + 0.9, 0.0, PISO, '4 m', M, 5.86, 7.0, lado=1)

# muros gruesos, piso, techo y relleno encima
estruct = []
for nombre, x0, x1, y0, y1, z0, z1, m in (
        ('m_izq', RX0 - W, RX0, YF, RY1 + W, PISO - W, TECHO, M['concreto']),
        ('m_der', RX1, RX1 + W, YF, RY1 + W, PISO - W, TECHO, M['concreto']),
        ('m_fondo', RX0 - W, RX1 + W, RY1, RY1 + W, PISO - W, TECHO, M['concreto']),
        ('m_piso', RX0 - W, RX1 + W, YF, RY1 + W, PISO - W, PISO, M['concreto'])):
    o = B.caja_o(nombre, x0, x1, y0, y1, z0, z1, m, (0, 0, PISO - W))
    gancho(o, TC)
    crecer(o, 2, 7.0, 8.3)
    estruct.append(o)
losa = B.caja_o('losa', RX0 - W, RX1 + W, YF, RY1 + W, TECHO, TECHO + W, M['concreto'], (0, 0, TECHO))
gancho(losa, TC)
crecer(losa, 2, 9.6, 10.0)
for nombre, x0, x1 in (('a', RX0 - W, RX1 + W),):
    o = B.caja_o('tierra_encima', x0, x1, YF, RY1 + W, TECHO + W, 0.0, M['relleno'], (0, 0, TECHO + W))
    p = B.caja_o('pasto_encima', x0, x1, YF, RY1 + W, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
    gancho([o, p], TC)
    crecer(o, 2, 10.45, 10.9)
    crecer(p, 2, 10.85, 11.05)

# escalera desde el jardin (en el corte) con muros y relleno a su lado
esc_piezas = []
n = 12
for k in range(n):
    x0 = ESC0 + 0.3 * k
    z = -(k + 1) * (-PISO / n)
    esc_piezas.append(D.caja('escalon', x0, x0 + 0.32, YF, YF + 1.4, z - 0.15, z, M['concreto']))
esc = B.raiz('escalera')
B.hijos(esc, esc_piezas)
esc_muro = D.caja('esc_muro', ESC0, RX0 - W, YF + 1.4, YF + 1.6, PISO, 0.0, M['concreto'])
gancho([esc, esc_muro], TC)
pop(esc, 8.4, 0.3)
pop(esc_muro, 8.4, 0.3)
bajo = D.prisma_y('bajo_escalera', [(ESC0, -0.15), (RX0 - W, PISO - 0.15), (ESC0, PISO - 0.15)], YF, YF + 1.4, M['relleno'])
gancho(bajo, TC)
pop(bajo, 8.4, 0.3)
detras = D.caja('detras_escalera', ESC0, RX0 - W, YF + 1.6, RY1 + W, PISO - W, 0.0, M['relleno'])
pasto_detras = D.caja('pasto_detras', ESC0, RX0 - W, YF + 1.6, RY1 + W, -0.08, 0.02, M['pasto'])
gancho([detras, pasto_detras], TC)
pop(detras, 10.5, 0.3)
pop(pasto_detras, 10.6, 0.3)
puerta = D.caja('puerta', RX0 - W - 0.01, RX0 + 0.01, YF + 0.2, YF + 1.2, PISO, PISO + 2.1, M['madera'])
gancho(puerta, TC)
pop(puerta, 8.6, 0.3)

# interior: alfombra, gradas, butacas
alf = D.caja('alfombra', RX0, RX1, YF, RY1, PISO, PISO + 0.02, M['alfombra'])
gancho(alf, TC)
pop(alf, 19.5, 0.2)
gradas, butacas = [], []
FILAS = ((-3.4, 0.9), (-1.8, 0.45), (-0.2, 0.0))       # (x, altura de grada)
for i, (gx, gh) in enumerate(FILAS):
    if gh > 0:
        g = B.caja_o(f'grada{i}', RX0, gx + 0.75, YF, RY1, PISO, PISO + gh, M['alfombra'], (0, 0, PISO))
        gancho(g, TC)
        crecer(g, 2, 20.3 + 0.15 * i, 20.6 + 0.15 * i)
        gradas.append(g)
    for j in range(4):
        y = YF + 0.75 + 1.35 * j
        b = B.raiz(f'butaca{i}{j}', (gx, y, PISO + gh))
        B.hijos(b, [D.caja('asiento', -0.3, 0.35, -0.42, 0.42, 0.0, 0.45, M['butaca']),
                    D.caja('respaldo', -0.42, -0.25, -0.42, 0.42, 0.0, 1.05, M['butaca']),
                    D.caja('brazo', -0.3, 0.35, -0.5, -0.42, 0.0, 0.65, M['butaca']),
                    D.caja('brazo', -0.3, 0.35, 0.42, 0.5, 0.0, 0.65, M['butaca'])])
        gancho(b, TC)
        pop(b, 20.95 + 0.05 * (i * 4 + j), 0.25)
        butacas.append(b)
doce = B.texto('doce', '12', M['medida'], (-1.6, YF - 0.6, PISO + 2.4), tam=1.2)
key(doce, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(doce, 3.5, 0.3)
quitar(doce, 4.5, 0.15)
# lineas de vision
for i, (gx, gh) in enumerate(FILAS):
    c = B.curva(f'vision{i}', [(gx, YF - 0.25, PISO + gh + 1.15), (RX1 - 0.3, YF - 0.25, PISO + 2.2)], M['medida'], 0.025)
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    key(c, 'scale', 21.6, (1, 1, 1), 'CONSTANT')
    B.trazar(c, 21.6 + 0.1 * i, 22.1 + 0.1 * i)
    key(c, 'scale', 22.9, (1, 1, 1))
    key(c, 'scale', 23.0, (0, 0, 0), 'CONSTANT')

# paneles de tela
for k in range(6):
    y0 = YF + 0.3 + 0.95 * k
    if k < 5:
        p = D.caja(f'panel_izq{k}', RX0, RX0 + 0.08, y0, y0 + 0.85, PISO + 1.2, TECHO - 0.3, M['panel_tela'])
        B.origen(p, (RX0, y0 + 0.4, PISO + 1.2))
        gancho(p, TC)
        pop(p, 24.34 + 0.08 * k, 0.25)
for k in range(9):
    x0 = RX0 + 0.3 + 1.05 * k
    p = D.caja(f'panel_fondo{k}', x0, x0 + 0.95, RY1 - 0.08, RY1, PISO + 1.2, TECHO - 0.3, M['panel_tela'])
    B.origen(p, (x0 + 0.47, RY1, PISO + 1.2))
    gancho(p, TC)
    pop(p, 24.5 + 0.06 * k, 0.25)

# pantalla, parlantes, proyector y haz de luz
pantalla = D.caja('pantalla', RX1 - 0.12, RX1 - 0.05, YF + 0.35, RY1 - 0.35, PISO + 1.1, TECHO - 0.35, M['pantalla'])
B.origen(pantalla, (RX1 - 0.1, (YF + RY1) / 2, (PISO + TECHO) / 2))
gancho(pantalla, TC)
pop(pantalla, 27.18, 0.35)
eP = M['pantalla'].node_tree.nodes['Principled BSDF']
for t, c, s in ((0.0, (0.5, 0.7, 1.0, 1), 2.0), (TC, (0.5, 0.7, 1.0, 1), 2.0), (14.9, (1.0, 0.5, 0.2, 1), 3.0),
                (16.0, (0.4, 0.8, 1.0, 1), 2.5), (27.2, (0.95, 0.9, 0.8, 1), 2.5), (30.0, (0.3, 0.6, 1.0, 1), 2.5),
                (33.0, (0.9, 0.4, 0.2, 1), 2.5), (35.9, (1.0, 0.75, 0.3, 1), 5.0), (36.3, (1.0, 0.3, 0.1, 1), 6.0)):
    eP.inputs['Emission Color'].default_value = c
    eP.inputs['Emission Color'].keyframe_insert('default_value', frame=F(t))
    B.key_valor(eP.inputs['Emission Strength'], t, s)
parlantes = []
for y in (YF + 0.15, RY1 - 0.6):
    p = B.raiz('parlante', (RX1 - 0.35, y, PISO))
    B.hijos(p, [D.caja('caja', -0.25, 0.25, -0.25, 0.25, 0.0, 1.6, M['parlante'])])
    gancho(p, TC)
    pop(p, 14.92, 0.3)
    parlantes.append(p)
proy = B.raiz('proyector', (RX0 + 0.15, (YF + RY1) / 2, TECHO - 0.55))
B.hijos(proy, [D.caja('proy', -0.3, 0.3, -0.35, 0.35, -0.2, 0.2, M['negro']),
               B.cilindro('lente', 0.1, 0.12, 'x', M['acero_claro'], (0.3, 0, 0))])
gancho(proy, TC)
pop(proy, 28.64, 0.3)
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.0, radius2=0.02, depth=1.0)
cono = bpy.context.object
cono.name = 'haz'
cono.data.materials.append(M['haz'])
largo_h = (RX1 - 0.15) - (RX0 + 0.45)
cono.rotation_euler = (0, -math.pi / 2, math.pi / 4)
cono.scale = (1.3, 1.9, largo_h)
cono.location = (RX0 + 0.45 + largo_h / 2, (YF + RY1) / 2, (PISO + TECHO) / 2 + 0.25)
gancho(cono, TC)
key(cono, 'scale', 29.15, (0, 0, 0), 'CONSTANT')
key(cono, 'scale', 29.2, (0.05, 0.05, largo_h))
key(cono, 'scale', 29.6, (1.3, 1.9, largo_h))

# ondas de sonido que no salen
def ondas(nombre, centro, t0, n=3, r1=3.0, mat='onda'):
    for k in range(n):
        bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.03, location=centro, rotation=(math.pi / 2, 0, 0))
        w = bpy.context.object
        w.name = f'{nombre}{k}'
        w.data.materials.append(M[mat])
        a = t0 + 0.35 * k
        key(w, 'scale', a - 0.05, (0, 0, 0), 'CONSTANT')
        key(w, 'scale', a, (0.2, 0.2, 0.2))
        key(w, 'scale', a + 0.9, (r1, r1, r1))
        key(w, 'scale', a + 1.0, (0, 0, 0), 'CONSTANT')


ondas('onda_int', (0.5, YF - 0.25, PISO + 1.6), 11.6, n=4, r1=4.2)
ondas('onda_max', (RX1 - 0.4, YF - 0.25, PISO + 1.2), 15.3, n=4, r1=4.0)
zzz = B.texto('zzz', 'Zzz', M['zzz'], (-4.0, 6.0, 9.0), tam=2.8)
key(zzz, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(zzz, 17.5, 0.35)
for k in range(4):
    key(zzz, 'location', 17.9 + 0.3 * k, (-4.0, 6.0, 9.0 + 0.15 * (k % 2)))
quitar(zzz, 19.0, 0.2)

# el hermano: sentado en la primera fila, se levanta en la mejor parte
gx, gh = FILAS[2]
yh = YF + 0.75 + 1.35 * 1
herm = B.raiz('hermano', (gx + 0.05, yh, PISO + gh + 0.45))
torso = B.cilindro('torso', 0.22, 0.65, 'z', M['camisa'], (0, 0, 0.0))
cabeza = B.esfera('cabeza', 0.18, M['piel'], (0, 0, 0.85))
B.hijos(herm, [torso, cabeza])
key(herm, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(herm, 32.9, 0.3)
key(herm, 'location', 35.3, (gx + 0.05, yh, PISO + gh + 0.45))
key(herm, 'location', 35.7, (gx + 0.3, yh, PISO + gh + 1.05))
sombra = D.caja('sombra', RX1 - 0.13, RX1 - 0.125, yh - 0.35, yh + 0.35, PISO + 1.3, PISO + 2.6, M['sombra'])
B.origen(sombra, (RX1 - 0.13, yh, PISO + 1.3))
key(sombra, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(sombra, 'scale', 35.55, (0, 0, 0), 'CONSTANT')
key(sombra, 'scale', 35.6, (1, 1, 0.2))
key(sombra, 'scale', 35.75, (1, 1, 1))

B.casa_patio(M, HX=-2.0, HY=14.0)

TOMAS = [
    (0.0, (-8.5, -14.0, 3.2), (-7.0, 0.0, -0.6)),
    (1.9, (-5.5, -13.0, -0.6), (-4.5, 0.0, -2.6)),
    (3.0, (0.0, -15.5, -1.2), (0.0, 0.0, -2.6)),
    (4.6, (0.2, -15.0, -1.3), (0.0, 0.0, -2.6), 'CORTE'),
    (4.65, (-1.5, -22.0, 3.0), (-1.5, 0.0, -1.8)),
    (8.6, (-1.5, -21.0, 2.6), (-1.5, 0.0, -1.9)),
    (9.0, (-1.0, -25.0, 4.6), (0.0, 1.5, -0.6)),
    (13.8, (-1.0, -24.0, 4.2), (0.0, 1.5, -0.8)),
    (14.2, (2.5, -14.0, -1.3), (3.0, 0.0, -2.4)),
    (16.3, (0.0, -27.0, 6.5), (-1.0, 3.0, 2.0)),
    (18.9, (0.0, -26.0, 6.0), (-1.0, 3.0, 1.8)),
    (19.2, (-1.2, -15.0, -1.5), (-1.2, 0.0, -3.0)),
    (22.6, (-0.6, -15.5, -1.3), (-0.4, 0.0, -2.8)),
    (23.1, (-2.2, -13.5, -1.6), (-2.0, 0.0, -2.5)),
    (26.6, (2.8, -13.5, -1.6), (3.6, 0.0, -2.4)),
    (28.5, (-3.0, -13.5, -1.8), (-3.6, 0.0, -2.2)),
    (30.6, (0.0, -15.5, -1.6), (0.4, 0.0, -2.6)),
    (34.0, (1.4, -13.0, -1.8), (2.0, 0.0, -2.6)),
    (DUR, (1.8, -11.8, -2.0), (2.4, 0.0, -2.6)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e in ((0.0, 4.0), (16.3, 4.0), (16.6, 0.25), (19.0, 0.25), (19.15, 4.0)):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
bg = bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength']
for t, v in ((0.0, 0.35), (16.3, 0.35), (16.6, 0.03), (19.0, 0.03), (19.15, 0.35)):
    B.key_valor(bg, t, v)
vid = M['vidrio'].node_tree.nodes['Principled BSDF']
vid.inputs['Emission Color'].default_value = (1.0, 0.75, 0.35, 1)
for t, v in ((0.0, 0.0), (16.3, 0.0), (16.6, 0.0), (19.15, 0.0)):
    B.key_valor(vid.inputs['Emission Strength'], t, v)
B.terminar(opt, salida, DUR)
