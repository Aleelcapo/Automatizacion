"""05 — La piscina que desaparece (fondo movil). Audio: .tmp_render/lote/c5_limpio.m4a."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(5)
DUR = 39.6
TC = 5.2
M = B.materiales()
M.update({
    'azulejo': D.pbr('azulejo', 'blue_floor_tiles_01', tam=1.2, tinte=(0.10, 0.55, 0.75), fac=0.7, brillo=1.0),
    'deck': D.pbr('deck', 'brown_planks_05', tam=1.4, tinte=(0.62, 0.42, 0.25), fac=0.35, brillo=1.35),
    'cilindro': D.liso('cilindro', (0.9, 0.55, 0.05), 0.4, metal=0.3),
    'piston': D.liso('piston', (0.85, 0.86, 0.88), 0.15, metal=1.0),
    'boton': D.liso('boton', (0.9, 0.05, 0.05), 0.3, emit=0.3),
    'pato': D.liso('pato', (1.0, 0.82, 0.05), 0.35),
    'pico': D.liso('pico', (1.0, 0.45, 0.05), 0.35),
    'flotador': D.liso('flotador', (0.95, 0.15, 0.15), 0.3),
    'globo_r': D.liso('globo_r', (0.95, 0.15, 0.2), 0.25),
    'globo_a': D.liso('globo_a', (0.15, 0.45, 0.95), 0.25),
    'globo_v': D.liso('globo_v', (0.2, 0.8, 0.3), 0.25),
    'foco': D.liso('foco', (1.0, 0.85, 0.5), 0.3, emit=4.0),
})

PX, PY1, PISO = 4.5, Y0 + 5.0, -2.0
W = 0.3
NIVEL = -0.1                     # superficie del agua
ARRIBA, ABAJO, NINOS = 0.1, PISO + 0.45, -0.6

B.terreno(M, [(-PX - 0.1, PX + 0.1, PY1 + 0.1, PISO - 0.35)])
B.relleno_hoyo(M, -PX - 0.1, PX + 0.1, PY1 + 0.1, PISO - 0.35, TC, 5.5, 6.6)
B.monton(M, (-10.5, 4.0, 0.0), 5.5, 6.6, t_fin=7.3)

# terraza de madera alrededor (siempre)
for x0, x1, y0, y1 in ((-8.0, -PX - 0.1, YF, Y0 + 7.5), (PX + 0.1, 8.0, YF, Y0 + 7.5), (-PX - 0.1, PX + 0.1, PY1 + 0.1, Y0 + 7.5)):
    B.caja('deck_borde', x0, x1, y0, y1, -0.05, ARRIBA, M['deck'])

# muros de concreto y azulejo
muros, azulejos = [], []
for nombre, x0, x1, y0, y1, z0, z1 in (('izq', -PX, -PX + W, YF, PY1, PISO - W, ARRIBA - 0.12),
                                       ('der', PX - W, PX, YF, PY1, PISO - W, ARRIBA - 0.12),
                                       ('fondo', -PX, PX, PY1 - W, PY1, PISO - W, ARRIBA - 0.12),
                                       ('piso', -PX, PX, YF, PY1, PISO - W, PISO)):
    o = B.caja_o('muro_' + nombre, x0, x1, y0, y1, z0, z1, M['concreto'], (0, 0, PISO - W))
    gancho(o, TC)
    crecer(o, 2, 7.4, 8.0)
    muros.append(o)
for nombre, x0, x1, y0, y1, z0, z1 in (('izq', -PX + W, -PX + W + 0.03, YF, PY1 - W, PISO, ARRIBA - 0.12),
                                       ('der', PX - W - 0.03, PX - W, YF, PY1 - W, PISO, ARRIBA - 0.12),
                                       ('fondo', -PX + W, PX - W, PY1 - W - 0.03, PY1 - W, PISO, ARRIBA - 0.12),
                                       ('piso', -PX + W, PX - W, YF, PY1 - W, PISO, PISO + 0.03)):
    o = B.caja_o('azulejo_' + nombre, x0, x1, y0, y1, z0, z1, M['azulejo'], (0, 0, PISO))
    gancho(o, TC)
    crecer(o, 2, 8.45, 8.95)
    azulejos.append(o)
agua = B.caja_o('agua', -PX + W + 0.03, PX - W - 0.03, YF + 0.03, PY1 - W - 0.03, PISO + 0.03, NIVEL, M['agua'], (0, 0, PISO))
gancho(agua, TC)
key(agua, 'scale', 9.0, (1, 1, 0.01))
key(agua, 'scale', 10.3, (1, 1, 1))
B.medida('profundo', -PX - 0.9, NIVEL, PISO, '2 m', M, 7.8, 9.0)

# plataforma de madera con rendijas (origen = superficie)
plat = B.raiz('plataforma', (0, 0, ARRIBA))
listones = []
x = -PX + W + 0.06
while x < PX - W - 0.4:
    listones.append(B.caja('liston', x, x + 0.52, YF + 0.06, PY1 - W - 0.06, -0.08, 0.0, M['deck']))
    x += 0.6
vigas = [B.caja('viga', -PX + W + 0.05, PX - W - 0.05, y - 0.08, y + 0.08, -0.3, -0.08, M['acero'])
         for y in (Y0 + 0.4, Y0 + 2.4, Y0 + 4.2)]
B.hijos(plat, listones + vigas)
MOV = [(0.0, ARRIBA), (4.0, ARRIBA), (5.1, -1.3), (11.1, ABAJO), (11.9, ABAJO), (13.0, ARRIBA), (21.3, ARRIBA), (22.6, ABAJO),
       (26.9, ABAJO), (27.6, NINOS), (34.2, NINOS), (34.9, ARRIBA), (37.6, ARRIBA), (38.8, ABAJO), (DUR, ABAJO)]
for t, z in MOV:
    key(plat, 'location', t, (0, 0, z))
key(plat, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(plat, 'scale', TC, (0, 0, 0), 'CONSTANT')
pop(plat, 11.1, 0.3)

# pistones (barril bajo el piso + vastago cromado hasta la plataforma)
TOPE = PISO + 0.05
def largo(z):
    return max(0.001, (z - 0.3) - TOPE)
for px in (-2.4, 2.4):
    for py in (Y0 + 0.45, Y0 + 3.5):
        barril = B.cilindro('barril', 0.18, 0.4, 'z', M['cilindro'], (px, py, PISO - 0.35))
        vast = B.cilindro('vastago', 0.1, 1.0, 'z', M['piston'], (px, py, TOPE))
        gancho([barril], TC)
        pop(barril, 12.5, 0.25)
        key(vast, 'scale', 0.0, (1, 1, largo(ARRIBA)), 'CONSTANT')
        key(vast, 'scale', TC, (0, 0, 0), 'CONSTANT')
        key(vast, 'scale', 12.45, (0, 0, 0), 'CONSTANT')
        key(vast, 'scale', 12.55, (1, 1, largo(ABAJO + (ARRIBA - ABAJO) * 0.5)))
        for t, z in MOV:
            if t >= 13.0:
                key(vast, 'scale', t, (1, 1, largo(z)))

# boton en un poste junto a la terraza
poste = B.cilindro('poste', 0.08, 0.9, 'z', M['acero'], (-PX - 1.2, YF + 0.5, ARRIBA))
boton = B.esfera('boton', 0.1, M['boton'], (-PX - 1.2, YF + 0.5, ARRIBA + 0.95), esc=(1, 1, 0.6))
eb = M['boton'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((3.3, 0.3), (3.4, 8.0), (4.1, 8.0), (4.3, 0.3), (37.1, 0.3), (37.2, 8.0), (37.8, 8.0), (38.0, 0.3)):
    B.key_valor(eb, t, v)

# muebles para la fiesta (sobre la plataforma, siguen su altura)
def sigue(o, t0, t1, dz=0.0):
    for t, z in MOV:
        if t0 <= t <= t1:
            key(o, 'location', t, (o.location.x, o.location.y, z + dz))


fiesta = []
mesa = D.modelo('outdoor_table_chair_set_01', (-1.5, Y0 + 2.4, ARRIBA), 0.3, 1.0)
pop(mesa, 16.66, 0.3)
quitar(mesa, 19.8, 0.25)
fiesta.append(mesa)
for i, (x, y, rz) in enumerate(((1.6, Y0 + 1.4, 2.4), (2.8, Y0 + 2.9, 3.6), (0.8, Y0 + 3.6, 4.4))):
    s = D.modelo('plastic_monobloc_chair_01', (x, y, ARRIBA), rz, 1.0)
    pop(s, 17.48 + 0.1 * i, 0.25)
    quitar(s, 19.8, 0.25)
colores = ('globo_r', 'globo_a', 'globo_v')
for i in range(7):
    gx = -3.6 + 1.2 * i
    g = B.raiz(f'globo{i}', (gx, Y0 + 4.4 - 0.5 * (i % 2), ARRIBA))
    B.hijos(g, [B.esfera('globo', 0.32, M[colores[i % 3]], (0, 0, 2.0 + 0.3 * (i % 3)), esc=(1, 1, 1.2)),
                B.cilindro('hilo', 0.01, 1.7 + 0.3 * (i % 3), 'z', M['blanco'], (0, 0, 0), verts=6)])
    pop(g, 18.6 + 0.06 * i, 0.3)
    quitar(g, 19.8, 0.25)
luces = B.curva('guirnalda', [(-PX - 1.5, Y0 + 5.6, 2.6), (0, Y0 + 5.6, 2.1), (PX + 1.5, Y0 + 5.6, 2.6)], M['negro'], 0.015)
for i in range(11):
    f = B.esfera(f'foco{i}', 0.07, M['foco'], (-PX - 1.4 + 1.1 * i, Y0 + 5.6, 2.55 - 0.45 * math.sin(math.pi * i / 10)))
    pop(f, 18.7 + 0.03 * i, 0.2)
    quitar(f, 19.8, 0.2)
B.trazar(luces, 18.6, 18.9)
key(luces, 'scale', 19.8, (1, 1, 1))
key(luces, 'scale', 20.0, (0, 0, 0), 'CONSTANT')

# escalera de piscina y flotador
esc = B.raiz('escalera_pisc', (2.5, PY1 - W - 0.05, 0))
for dx in (-0.35, 0.35):
    B.hijos(esc, [B.curva('riel', [(dx, 0.4, ARRIBA + 0.9), (dx, 0.1, ARRIBA + 1.0), (dx, -0.2, ARRIBA + 0.6), (dx, -0.25, -1.4)],
                          M['acero_claro'], 0.04)])
for z in (-0.4, -0.8, -1.2):
    B.hijos(esc, [B.caja('peldano', -0.35, 0.35, -0.32, -0.12, z, z + 0.04, M['acero_claro'])])
key(esc, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(esc, 24.4, 0.3)
bpy.ops.mesh.primitive_torus_add(major_radius=0.45, minor_radius=0.15, location=(-1.8, Y0 + 2.8, NIVEL + 0.05))
flot = bpy.context.object
flot.data.materials.append(M['flotador'])
key(flot, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(flot, 24.6, 0.3)
for k, t in enumerate((25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0, 32.0, 33.0)):
    key(flot, 'location', t, (-1.8 + 0.15 * math.sin(k), Y0 + 2.8 + 0.1 * math.cos(k), NIVEL + 0.05 + 0.03 * (k % 2)))
quitar(flot, 33.8, 0.25)

# patito para la piscina de bebes
pato = B.raiz('pato', (1.2, Y0 + 2.0, NIVEL + 0.02))
B.hijos(pato, [B.esfera('pato_cuerpo', 0.22, M['pato'], (0, 0, 0.1), esc=(1.25, 1, 0.75)),
               B.esfera('pato_cabeza', 0.13, M['pato'], (0.18, 0, 0.32)),
               B.esfera('pato_ojo', 0.025, M['negro'], (0.26, -0.1, 0.36)),
               B.esfera('pato_pico', 0.07, M['pico'], (0.33, 0, 0.29), esc=(1.4, 1, 0.5))])
pato.rotation_euler = (0, 0, -0.5)
key(pato, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(pato, 28.75, 0.3, 1.6)
quitar(pato, 33.8, 0.25, 1.6)
for k, t in enumerate((29.2, 30.0, 30.8, 31.6, 32.4, 33.2)):
    key(pato, 'rotation_euler', t, (0.08 * (1 if k % 2 else -1), 0, -0.5 + 0.1 * k))
B.medida('medio', PX + 0.9, NIVEL, NINOS + 0.0, '0,5 m', M, 27.35, 29.6, lado=1)

# el agua pasa por las rendijas (flechas arriba y abajo en el corte)
for k, xx in enumerate((-2.9, -0.5, 1.9)):
    B.flujo(f'sube{k}', M['flecha_azul'], (xx + 0.27, YF - 0.25, NINOS - 0.9), (xx + 0.27, YF - 0.25, NINOS + 0.15), 'z',
            31.5 + 0.2 * k, 32.6 + 0.2 * k, n=2, largo=0.6, grosor=0.06, sep=0.35)
    B.flujo(f'baja{k}', M['flecha_azul'], (xx + 0.87, YF - 0.25, NINOS + 0.25), (xx + 0.87, YF - 0.25, NINOS - 0.8), '-z',
            31.7 + 0.2 * k, 32.8 + 0.2 * k, n=2, largo=0.6, grosor=0.06, sep=0.35)

# final: subes las sillas... y al apretar el boton flotan
finales = []
for i, (x, y, rz) in enumerate(((-1.2, Y0 + 1.6, 0.4), (1.4, Y0 + 2.2, 2.6), (-2.6, Y0 + 3.5, 1.2))):
    s = D.modelo('plastic_monobloc_chair_01', (x, y, ARRIBA), rz, 1.0)
    pop(s, 35.86 + 0.15 * i, 0.25)
    key(s, 'location', 37.6, (x, y, ARRIBA))
    key(s, 'location', 38.05, (x, y, NIVEL - 0.15))
    key(s, 'rotation_euler', 38.05, (0, 0, rz))
    key(s, 'rotation_euler', 38.8, (0.35 * (1 if i % 2 else -1), 0.25, rz + 0.3))
    key(s, 'location', 38.8, (x + 0.2, y, NIVEL - 0.25))
    key(s, 'location', DUR, (x + 0.35, y + 0.1, NIVEL - 0.2))
    finales.append(s)

B.casa_patio(M, HX=-2.0, HY=14.0)

TOMAS = [
    (0.0, (-3.0, -16.5, 7.0), (0.0, 1.5, -0.2)),
    (2.6, (-2.0, -13.5, 5.6), (0.0, 1.5, -0.4)),
    (4.0, (-2.0, -14.0, 4.6), (0.0, 1.0, -1.0)),
    (5.15, (-2.0, -14.6, 4.2), (0.0, 1.0, -1.2), 'CORTE'),
    (5.2, (-1.0, -22.0, 3.6), (0.0, 0.0, -1.2)),
    (10.5, (-1.0, -21.0, 3.0), (0.0, 0.0, -1.2)),
    (11.1, (-1.5, -17.0, 1.4), (0.0, 0.0, -1.3)),
    (13.1, (-1.5, -16.0, 1.8), (0.0, 0.0, -1.0)),
    (13.9, (-5.0, -18.0, 6.2), (0.0, 2.0, 0.0)),
    (19.1, (-4.0, -16.0, 5.4), (0.0, 2.0, 0.2)),
    (19.7, (-1.0, -20.0, 3.0), (0.0, 0.0, -1.0)),
    (25.1, (-1.0, -19.0, 3.2), (0.0, 0.5, -0.8)),
    (25.7, (2.0, -15.0, 2.6), (1.0, 1.0, -0.6)),
    (29.6, (1.6, -14.0, 2.2), (1.0, 1.0, -0.6)),
    (30.0, (-0.4, -9.5, -0.2), (-0.4, 0.0, -0.8)),
    (33.8, (-0.4, -9.0, -0.1), (-0.4, 0.0, -0.8)),
    (34.1, (-4.0, -17.0, 5.0), (0.0, 1.5, -0.3)),
    (37.0, (-3.0, -15.0, 4.4), (0.0, 1.2, -0.4)),
    (DUR, (-2.4, -13.2, 3.4), (0.0, 1.0, -0.6)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
