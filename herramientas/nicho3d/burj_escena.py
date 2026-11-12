"""19 — Los pies del edificio mas alto del mundo (cimientos del Burj Khalifa). Audio: .tmp_render/lote2/a3_limpio.m4a (43.6 s)."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, key_valor, pop, quitar, crecer, gancho  # noqa: E402

opt, salida = B.inicio(19)
DUR = 44.2
TC = 7.5
M = B.materiales()
M.update({
    'arena': D.pbr('arena', 'coast_sand_01', tam=2.0, tinte=(0.86, 0.68, 0.42), fac=0.45, brillo=1.25),
    'arena_h': D.pbr('arena_h', 'coast_sand_01', tam=2.0, tinte=(0.55, 0.44, 0.3), fac=0.55),
    'roca_b': D.pbr('roca_b', 'rock_wall_08', tam=2.4, tinte=(0.72, 0.62, 0.48), fac=0.6, brillo=1.2),
    'torre': D.liso('torre', (0.6, 0.67, 0.75), 0.12, metal=0.85),
    'torre_b': D.liso('torre_b', (0.85, 0.87, 0.9), 0.3, metal=0.6),
    'pilote': D.liso('pilote', (0.58, 0.58, 0.56), 0.7),
    'varilla': D.liso('varilla', (0.35, 0.35, 0.38), 0.4, metal=0.9),
    'oxido': D.liso('oxido', (0.55, 0.22, 0.06), 0.9),
    'cable_e': D.liso('cable_e', (0.95, 0.75, 0.05), 0.4, emit=1.2),
    'ahogo': D.liso('ahogo', (0.1, 0.45, 0.9), 0.3, emit=0.0),
    'hielo': D.liso('hielo', (0.75, 0.92, 1.0), 0.05, emit=0.4),
    'tambor': D.liso('tambor', (0.9, 0.5, 0.1), 0.4, metal=0.3),
    'concreto_f': D.liso('concreto_f', (0.55, 0.55, 0.53), 0.7),
    'calor': D.liso('calor', (1.0, 0.25, 0.05), 0.4, emit=2.5),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
agua_m = M['ahogo']
agua_m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.12
agua_m.surface_render_method = 'BLENDED'

Z1, Z2, ZR = -2.0, -8.0, -40.0     # arena seca / arena con agua salada / roca blanda
LX, LY = 8.0, Y0 + 16.0            # losa x[-LX, LX], y[Y0, LY], z[-1, 0]
TX, TY = 0.0, Y0 + 8.0             # centro de la torre
ZP = -13.5                         # punta de los pilotes
RP = 0.38
XP = [-7.0 + 1.4 * k for k in range(11)]

# ---------- terreno ----------
suelo = D.caja('suelo', -60, 60, Y0, 150, ZR, 0.0, M['arena'])
D.restar(suelo, D.caja('hoyo', -LX - 0.3, LX + 0.3, Y0 - 1, LY + 0.3, -1.0, 1))
D.aplicar_mods(suelo)
G.frente('f_arena', -22, 22, Z1, 0.0, M['arena'], 'coast_sand_01', fuerza=0.2,
         borrar=lambda x, z: -LX - 0.3 < x < LX + 0.3 and z > -1.0)
G.frente('f_humeda', -22, 22, Z2, Z1, M['arena_h'], 'coast_sand_01', fuerza=0.2)
G.frente('f_roca', -22, 22, -18.0, Z2, M['roca_b'], 'rock_wall_08', fuerza=0.25)
G.frente('f_roca_b', -40, 40, ZR, -18.0, M['roca_b'], 'rock_wall_08', fuerza=0.25, res=0.25)
for x0, x1 in ((-60, -LX - 0.3), (LX + 0.3, 60)):
    D.caja('borde', x0, x1, Y0 - 0.05, Y0 + 0.3, -0.12, 0.02, M['arena'])
M2 = dict(M, tierra=M['arena'], pasto=M['arena'])
B.relleno_hoyo(M2, -LX - 0.3, LX + 0.3, LY + 0.3, -1.0, TC, 13.0, 14.0)
rnd = random.Random(19)
for k in range(9):   # dunas
    x = rnd.uniform(-70, 70)
    B.esfera('duna', 1.0, M['arena'], (x, rnd.uniform(45, 120), -1.0), esc=(rnd.uniform(14, 26), rnd.uniform(8, 14), rnd.uniform(3, 6)))

# ---------- losa y pilotes ----------
losa = B.caja_o('losa', -LX, LX, Y0 - 0.012, LY, -1.0, 0.0, M['concreto'], (0, 0, -1.0))
gancho(losa, TC)
crecer(losa, 2, 25.3, 26.2)
pilotes = []
for i, x in enumerate(XP):
    p = B.caja_o(f'pilote{i}', x - RP, x + RP, Y0 - 0.012, Y0 + 0.5, ZP, -1.0, M['pilote'], (x, 0, -1.0))
    vs = [D.caja('varilla', x + dx - 0.022, x + dx + 0.022, Y0 - 0.025, Y0 - 0.01, ZP + 0.1, -1.05, M['varilla'])
          for dx in ((-0.24, -0.08, 0.08, 0.24) if i == 5 else ())]
    for v in vs:
        v.parent = p
    for v in vs:
        v.location = (-x, 0, 1.0)
    gancho(p, TC)
    key(p, 'scale', 15.0 + 0.2 * abs(i - 5) - 0.1, (0, 0, 0), 'CONSTANT')
    key(p, 'scale', 15.0 + 0.2 * abs(i - 5), (1, 1, 0.0))
    key(p, 'scale', 16.4 + 0.2 * abs(i - 5), (1, 1, 1))
    pilotes.append(p)

# ---------- torre ----------
torre = B.raiz('torre', (TX, TY, 0.0))
partes = []
for k in range(10):
    z0, z1 = 4.0 * k, 4.0 * k + 4.0
    lw, ww = 3.4 - 0.3 * k, 1.5 - 0.09 * k
    for a in range(3):
        if k >= 7 and a == k % 3:
            continue
        b = D.caja('ala', 0.0, lw, -ww / 2, ww / 2, z0, z1 - 0.05, M['torre'])
        b.rotation_euler = (0, 0, math.radians(90 + 120 * a))
        partes.append(b)
        partes.append(D.caja('franja', 0.0, lw + 0.02, -ww / 2 - 0.02, ww / 2 + 0.02, z1 - 0.12, z1, M['torre_b']))
        partes[-1].rotation_euler = (0, 0, math.radians(90 + 120 * a))
    partes.append(B.cilindro('nucleo', 1.1 - 0.06 * k, 4.0, 'z', M['torre'], (0, 0, z0)))
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.55, radius2=0.03, depth=10.0, location=(0, 0, 45.0))
punta = bpy.context.object
punta.data.materials.append(M['torre_b'])
partes.append(punta)
B.hijos(torre, partes)
gancho(torre, TC)
key(torre, 'scale', 41.75, (0, 0, 0), 'CONSTANT')
key(torre, 'scale', 41.9, (1, 1, 0.01))
key(torre, 'scale', 43.6, (1, 1, 1))

# ---------- etiquetas, medidas y flechas ----------
G.letrero('m828', '828 m', M['medida'], (TX + 7.0, TY, 30.0), tam=3.2, t_on=2.6, t_off=TC - 0.2)
G.letrero('dubai', 'DUBÁI', M['etiqueta'], (0.0, Y0 + 12, 3.5), tam=2.2, t_on=7.7, t_off=12.4)
banda = D.caja('banda_agua', -22, 22, YF - 0.5, YF - 0.46, Z2, Z1, agua_m)
for t0, t1 in ((11.4, 14.6), (29.6, 31.4)):
    pop(banda, t0, 0.3)
    quitar(banda, t1, 0.25)
key(banda, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
G.letrero('l_arena', 'ARENA', M['etiqueta'], (-5.5, YF - 0.55, -1.5), tam=1.2, t_on=10.7, t_off=14.6)
G.letrero('l_agua', 'AGUA SALADA', M['etiqueta'], (-4.0, YF - 0.55, -5.0), tam=1.2, t_on=11.5, t_off=14.6)
B.flujo('bajar', M['flecha_roja'], (0, YF - 0.5, 1.5), (0, YF - 0.5, -3.0), '-z', 13.9, 14.6, n=3, largo=0.8)
G.letrero('n192', '192', M['medida'], (0.0, YF - 0.6, 1.6), tam=2.0, t_on=15.2, t_off=19.4)
B.medida('m50', 4.9, -1.0, ZP, '50 m', M, 17.8, 19.4, lado=1)
# no se apoyan en la punta: flecha tachada; si en el roce: flechas hacia arriba por los costados
B.flujo('punta', M['flecha_gris'], (0.0, YF - 0.5, ZP + 0.4), (0.0, YF - 0.5, ZP - 1.2), '-z', 19.8, 20.6, n=1, largo=0.9)
cruz = B.raiz('cruz', (0.0, YF - 0.6, ZP - 0.8))
for s in (1, -1):
    c = D.caja('cruz_b', -0.7, 0.7, -0.06, 0.06, -0.08, 0.08, M['flecha_roja'])
    c.rotation_euler = (0, s * math.pi / 4, 0)
    c.parent = cruz
key(cruz, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(cruz, 20.2, 0.25)
quitar(cruz, 21.1, 0.2)
for x in (-1.4, 0.0, 1.4):
    for s in (-1, 1):
        B.flujo(f'roce{x}{s}', M['flecha_verde'], (x + s * 0.55, YF - 0.5, -11.5), (x + s * 0.55, YF - 0.5, -6.0), 'z', 21.1, 22.9, n=3, largo=0.6, sep=0.4)
# clavo en madera
clavo_r = B.raiz('clavo_r', (-2.0, YF - 2.0, -8.6))
tabla = D.caja('tabla', -1.0, 1.0, -0.6, 0.6, -0.9, 0.0, M['madera'])
clavo = B.raiz('clavo')
B.hijos(clavo, [B.cilindro('clavo_c', 0.05, 1.0, 'z', M['acero_claro'], (0, 0, -0.8)), B.cilindro('clavo_cab', 0.17, 0.06, 'z', M['acero_claro'], (0, 0, 0.2))])
B.hijos(clavo_r, [tabla, clavo])
key(clavo_r, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(clavo_r, 23.25, 0.3)
key(clavo, 'location', 23.4, (0, 0, 1.0))
key(clavo, 'location', 24.0, (0, 0, -0.1))
quitar(clavo_r, 24.75, 0.2)
# la losa reparte el peso
G.letrero('m4', '4 m', M['medida'], (-LX - 1.3, YF - 0.5, -0.5), tam=0.9, t_on=26.6, t_off=28.2)
for x in (-6.0, -3.0, 0.0, 3.0, 6.0):
    B.flujo(f'peso{x}', M['flecha_roja'], (x, YF - 0.5, 1.6), (x, YF - 0.5, -4.0), '-z', 28.1, 29.3, n=2, largo=0.7, sep=0.35)
# corrosion y proteccion catodica en el pilote central
xc = XP[5]
oxidos = []
for k, (dx, z0, z1) in enumerate(((-0.24, -3.2, -4.0), (0.08, -4.4, -5.6), (-0.08, -2.6, -3.1), (0.24, -5.0, -6.3), (-0.24, -5.8, -6.6))):
    o = D.caja('oxido', xc + dx - 0.04, xc + dx + 0.04, Y0 - 0.035, Y0 - 0.02, z1, z0, M['oxido'])
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    B.origen(o, (xc + dx, Y0, (z0 + z1) / 2))
    pop(o, 31.6 + 0.15 * k, 0.3)
    quitar(o, 35.0 + 0.1 * k, 0.4)
    oxidos.append(o)
anodos = []
for s in (-1, 1):
    a = B.raiz(f'anodo{s}', (xc + s * 0.75, YF - 0.3, -4.6))
    B.hijos(a, [B.cilindro('anodo_c', 0.16, 1.2, 'z', M['acero'], (0, 0, -0.6)),
                D.caja('anodo_cable', min(0, -s * 0.37), max(0, -s * 0.37), -0.025, 0.025, 0.0, 0.05, M['cable_e'])])
    key(a, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(a, 33.7 + 0.15 * (s > 0), 0.3)
    quitar(a, 36.1, 0.2)
    B.flujo(f'chispa{s}', M['medida'], (xc + s * 0.72, YF - 0.33, -4.55), (xc + s * 0.4, YF - 0.33, -4.55), '-x' if s > 0 else 'x',
            34.3, 36.0, n=4, largo=0.3, grosor=0.04, sep=0.4)

# ---------- de noche: concreto con hielo ----------
mundo = bpy.context.scene.world
sol = B.luz()
fondo = [n for n in bpy.context.scene.world.node_tree.nodes if n.type == 'BACKGROUND'][0].inputs['Strength']
for t, v in ((0.0, 0.35), (36.5, 0.35), (37.3, 0.02), (41.7, 0.02), (42.4, 0.35)):
    key_valor(fondo, t, v)
for t, v in ((0.0, 4.0), (36.5, 4.0), (37.3, 0.0), (41.7, 0.0), (42.4, 4.0)):
    sol.data.energy = v
    sol.data.keyframe_insert('energy', frame=B.F(t))
focos = []
for x in (-6.0, 2.0):
    l = bpy.data.lights.new('foco', 'SPOT')
    l.spot_size = math.radians(70)
    l.color = (1.0, 0.85, 0.6)
    o = D.link(bpy.data.objects.new('foco', l))
    o.location = (x, Y0 - 3.0, 9.0)
    o.rotation_euler = (math.radians(35), 0, 0)
    for t, v in ((0.0, 0.0), (36.6, 0.0), (37.3, 2500.0), (41.7, 2500.0), (42.4, 0.0)):
        l.energy = v
        l.keyframe_insert('energy', frame=B.F(t))
camion = B.raiz('camion', (-9.0, Y0 + 3.5, 0.0))
B.hijos(camion, [D.caja('cab', 1.5, 2.6, -0.65, 0.65, 0.2, 1.5, M['blanco']),
                 D.caja('chasis', -2.0, 2.6, -0.6, 0.6, 0.2, 0.5, M['acero']),
                 B.cilindro('tambor', 0.85, 2.6, 'x', M['tambor'], (-1.9, 0, 1.4))]
          + [B.cilindro('rueda', 0.32, 0.25, 'y', M['negro'], (xr, s * 0.62, 0.32), verts=16) for xr in (-1.4, 0.0, 2.0) for s in (-1, 1)])
key(camion, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(camion, 36.5, 0.3)
quitar(camion, 41.75, 0.2)
pluma = B.curva('pluma', [(-8.5, Y0 + 3.5, 2.3), (-7.0, Y0 + 3.5, 5.0), (-3.0, Y0 + 3.5, 4.6), (-1.5, Y0 + 3.5, 3.0)], M['amarillo'], grosor=0.12)
B.trazar(pluma, 36.6, 37.4)
key(pluma, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(pluma, 'scale', 41.75, (0, 0, 0), 'CONSTANT')
chorro = B.cilindro('chorro', 0.16, 3.0, 'z', M['concreto_f'], (-1.5, Y0 + 3.5, 0.0))
key(chorro, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(chorro, 'scale', 37.4, (0, 0, 0), 'CONSTANT')
key(chorro, 'scale', 37.6, (1, 1, 1), 'CONSTANT')
key(chorro, 'scale', 41.75, (0, 0, 0), 'CONSTANT')
capa = B.caja_o('capa', -LX + 0.2, LX - 0.2, Y0 - 0.012, LY - 0.2, 0.0, 0.25, M['concreto_f'], (0, 0, 0.0))
key(capa, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(capa, 'scale', 37.5, (1, 1, 0.0))
key(capa, 'scale', 41.0, (1, 1, 1))
key(capa, 'scale', 41.75, (0, 0, 0), 'CONSTANT')
for k in range(7):
    h = B.caja_o(f'hielo{k}', -0.18, 0.18, -0.18, 0.18, -0.18, 0.18, M['hielo'], (0, 0, 0))
    x0 = -11.6 + 0.3 * k
    key(h, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    t = 38.3 + 0.1 * k
    key(h, 'scale', t - 0.05, (0, 0, 0), 'CONSTANT')
    key(h, 'scale', t, (1, 1, 1))
    key(h, 'location', t, (x0, Y0 + 3.5, 5.0))
    key(h, 'rotation_euler', t, (0, 0, 0))
    key(h, 'location', t + 0.5, (x0 + 0.2, Y0 + 3.5, 2.1))
    key(h, 'rotation_euler', t + 0.5, (0.8 * k, 0.5, 1.2))
    key(h, 'scale', t + 0.55, (0, 0, 0), 'CONSTANT')
G.letrero('calor', '50 °C', M['calor'], (-1.5, Y0 + 3.5, 6.0), tam=1.5, t_on=39.55, t_off=41.6)

# ---------- camara ----------
TOMAS = [
    (0.0, (-13.0, -31.0, 2.0), (0.0, TY, 21.0)),
    (3.8, (-12.0, -30.0, 2.5), (0.0, TY, 18.0)),
    (6.9, (-5.0, -19.0, 2.5), (0.0, Y0, -5.0)),
    (7.35, (-4.8, -18.5, 2.3), (0.0, Y0, -5.2), 'CORTE'),
    (TC, (-4.0, -24.0, 7.0), (0.0, Y0 + 2.0, -3.5)),
    (14.4, (-3.0, -24.0, 6.0), (0.0, Y0 + 1.0, -4.0)),
    (15.0, (0.0, -21.0, -3.0), (0.0, Y0, -7.0)),
    (19.4, (0.0, -20.0, -3.5), (0.0, Y0, -7.2)),
    (20.0, (0.5, -12.0, -8.5), (0.3, Y0, -10.0)),
    (24.6, (0.0, -12.5, -7.5), (-0.5, Y0, -8.8)),
    (25.2, (-3.0, -17.0, 3.0), (0.0, Y0 + 2.0, -1.5)),
    (29.3, (-2.5, -18.0, 3.2), (0.0, Y0 + 2.0, -1.8), 'CORTE'),
    (29.45, (0.4, -7.4, -4.3), (0.0, Y0, -4.8)),
    (36.1, (0.3, -6.8, -4.5), (0.0, Y0, -4.8), 'CORTE'),
    (36.25, (-6.0, -15.0, 6.0), (-4.5, Y0 + 3.0, 1.0)),
    (41.7, (-6.5, -16.0, 6.5), (-4.5, Y0 + 3.0, 1.0)),
    (42.3, (-12.0, -29.0, 3.0), (0.0, TY, 16.0)),
    (DUR, (-13.0, -31.0, 2.0), (0.0, TY, 21.0)),
]
B.tomas(TOMAS)
B.terminar(opt, salida, DUR)
