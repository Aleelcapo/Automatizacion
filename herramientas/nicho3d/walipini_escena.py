"""11 — Walipini: invernadero bajo tierra en los Andes. Audio: .tmp_render/lote/c11_limpio.m4a."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(11)
DUR = 39.7
TC = 6.95
M = B.materiales()
M['pasto'] = D.pbr('nieve', 'snow_02', tam=2.5, brillo=1.3)
M.update({
    'adobe': D.pbr('adobe', 'clay_plaster', tam=1.5, tinte=(0.6, 0.42, 0.28), fac=0.5, brillo=1.1),
    'plastico': D.liso('plastico', (0.85, 0.92, 0.95), 0.05),
    'tierra_huerta': D.liso('tierra_huerta', (0.16, 0.1, 0.06), 0.9),
    'hoja': D.liso('hoja', (0.2, 0.55, 0.12), 0.6),
    'lechuga': D.liso('lechuga', (0.45, 0.8, 0.25), 0.6),
    'tomate': D.liso('tomate', (0.85, 0.1, 0.05), 0.3),
    'frutilla': D.liso('frutilla', (0.9, 0.05, 0.15), 0.3),
    'montana': D.pbr('montana', 'rock_wall_08', tam=6.0, tinte=(0.45, 0.4, 0.38), fac=0.4),
    'cumbre': D.liso('cumbre', (0.95, 0.96, 1.0), 0.6),
    'sol_disco': D.liso('sol_disco', (1.0, 0.85, 0.3), 0.3, emit=6.0),
    'calor': D.liso('calor', (1.0, 0.45, 0.05), 0.4, emit=2.5),
    'frio_txt': D.liso('frio_txt', (0.4, 0.75, 1.0), 0.4, emit=2.5),
    'tibio_txt': D.liso('tibio_txt', (1.0, 0.6, 0.2), 0.4, emit=2.5),
    'copo': D.liso('copo', (1.0, 1.0, 1.0), 0.4, emit=0.6),
    'pala': D.liso('pala', (0.4, 0.42, 0.45), 0.3, metal=0.9),
})
pl = M['plastico']
pl.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.22
pl.surface_render_method = 'BLENDED'

X0, X1, Y1, PISO = -4.0, 4.0, Y0 + 5.0, -2.5
B.terreno(M, [(X0, X1, Y1, PISO - 0.2)])
B.relleno_hoyo(M, X0, X1, Y1, PISO - 0.2, TC, 7.6, 8.8)
B.monton(M, (8.0, 3.5, 0.0), 7.6, 8.8, t_fin=10.0, esc=(2.0, 1.7, 1.0))
B.medida('m25', X1 + 0.9, 0.0, PISO, '2,5 m', M, 9.06, 10.5, lado=1)

# muros de adobe sobre el suelo: fondo alto, lados en triangulo
ZB = 1.5     # altura del muro de atras
muro_f = D.caja('muro_fondo', X0 - 0.4, X1 + 0.4, Y1, Y1 + 0.4, 0.0, ZB, M['adobe'])
lados = [D.prisma_y('muro_lado', [(x, 0.0), (x + 0.4, 0.0), (x + 0.4, 0.3), (x, 0.3)], YF, Y1, M['adobe']) for x in (X0 - 0.4, X1)]
for lado, x in zip(lados, (X0 - 0.4, X1)):
    # el lado sube hacia atras: se arma como cuna en el plano yz
    lado.data.clear_geometry()
import bmesh  # noqa: E402
def cuna(nombre, x0, x1):
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    pf = [(YF, 0.0), (Y1 + 0.4, 0.0), (Y1 + 0.4, ZB), (YF, 0.35)]
    a = [bm.verts.new((x0, y, z)) for y, z in pf]
    b = [bm.verts.new((x1, y, z)) for y, z in pf]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = D.link(bpy.data.objects.new(nombre, me))
    o.data.materials.append(M['adobe'])
    return o
for lado in lados:
    bpy.data.objects.remove(lado)
muros = [muro_f, cuna('cuna_izq', X0 - 0.4, X0), cuna('cuna_der', X1, X1 + 0.4)]
for o in muros:
    B.origen(o, (0, 0, 0))
    gancho(o, TC)
    crecer(o, 2, 15.9, 16.4)

# techo de plastico con bisagra adelante: plano -> inclinado
techo = B.raiz('techo', (0, YF, 0.35))
lamina = D.caja('lamina', X0 - 0.4, X1 + 0.4, 0.0, (Y1 + 0.4) - YF, -0.02, 0.02, M['plastico'])
marcos = [D.caja('marco_techo', x - 0.05, x + 0.05, 0.0, (Y1 + 0.4) - YF, 0.02, 0.1, M['madera']) for x in (X0 - 0.3, -1.4, 1.4, X1 + 0.3)]
B.hijos(techo, [lamina] + marcos)
ang = math.atan2(ZB - 0.35, (Y1 + 0.4) - YF)
key(techo, 'rotation_euler', 0.0, (ang, 0, 0), 'CONSTANT')
key(techo, 'rotation_euler', TC, (0.0, 0, 0), 'CONSTANT')
key(techo, 'rotation_euler', 20.3, (0.0, 0, 0))
key(techo, 'rotation_euler', 21.0, (ang, 0, 0))
gancho(techo, TC)
pop(techo, 18.44, 0.35)

# canteros y plantas
canteros = []
for y0 in (YF + 0.3, Y0 + 2.2, Y0 + 3.9):
    c = B.caja_o('cantero', X0 + 0.4, X1 - 0.4, y0, y0 + 0.9, PISO, PISO + 0.35, M['tierra_huerta'], (0, 0, PISO))
    gancho(c, TC)
    crecer(c, 2, 30.6, 30.9)
    canteros.append(c)
def planta(tipo, x, y, t):
    z = PISO + 0.35
    r = B.raiz(tipo, (x, y, z))
    if tipo == 'lechuga':
        B.hijos(r, [B.esfera('lech', 0.22, M['lechuga'], (0, 0, 0.1), esc=(1, 1, 0.6))])
    elif tipo == 'tomate':
        B.hijos(r, [B.cilindro('tallo', 0.03, 0.9, 'z', M['hoja'], (0, 0, 0), verts=6),
                    B.esfera('mata', 0.3, M['hoja'], (0, 0, 0.8), esc=(1, 1, 1.2)),
                    B.esfera('tom', 0.08, M['tomate'], (0.2, -0.22, 0.65)), B.esfera('tom', 0.07, M['tomate'], (-0.15, -0.25, 0.9))])
    else:
        B.hijos(r, [B.esfera('mata', 0.18, M['hoja'], (0, 0, 0.08), esc=(1.3, 1.3, 0.5)),
                    B.esfera('frut', 0.05, M['frutilla'], (0.1, -0.15, 0.08)), B.esfera('frut', 0.05, M['frutilla'], (-0.12, -0.1, 0.06))])
    gancho(r, TC)
    pop(r, t, 0.3)
    return r
plantas = []
for i, x in enumerate([X0 + 0.9 + 0.75 * k for k in range(9)]):
    plantas.append(planta('lechuga', x, YF + 0.75, 31.84 + 0.04 * i))
    plantas.append(planta('tomate', x, Y0 + 2.65, 32.68 + 0.04 * i))
    plantas.append(planta('frutilla', x, Y0 + 4.35, 33.3 + 0.04 * i))
for k, p in enumerate(plantas[::3]):
    rebote(p, 29.85 + 0.03 * k)

# textos de temperatura y altura
alt = B.texto('altura', '4.000 m', M['medida'], (0, 40.0, 16.0), tam=4.0)
key(alt, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(alt, 1.1, 0.35)
quitar(alt, 2.6, 0.25)
tibio = B.texto('tibio', '+12°C', M['tibio_txt'], (0, YF - 0.5, -1.3), tam=0.9)
frio = B.texto('frio', '-10°C', M['frio_txt'], (-2.5, YF - 0.5, 2.6), tam=1.0)
for o, t0, t1 in ((tibio, 13.18, 15.9), (frio, 15.0, 15.95)):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, t0, 0.3)
    quitar(o, t1, 0.2)

# sol, rayos y calor
sol_d = B.esfera('sol_disco', 1.6, M['sol_disco'], (-14.0, 30.0, 14.0))
key(sol_d, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(sol_d, 'scale', 26.0, (1, 1, 1))
key(sol_d, 'scale', 26.3, (0, 0, 0), 'CONSTANT')
key(sol_d, 'scale', 30.85, (0, 0, 0), 'CONSTANT')
key(sol_d, 'scale', 31.0, (1, 1, 1))
for k in range(4):
    B.flujo(f'rayo{k}', M['medida'], (-3.0 + 2.0 * k, YF - 0.3, 4.5), (-2.4 + 2.0 * k, YF - 0.3, -1.2), '-z', 21.0 + 0.1 * k,
            22.6 + 0.1 * k, n=2, largo=0.9, grosor=0.08)
for lado in (-1, 1):
    B.flujo(f'calienta{lado}', M['calor'], (lado * 2.8, YF - 0.3, -0.6), (lado * 4.6, YF - 0.3, -0.6), 'x' if lado > 0 else '-x',
            24.3, 25.7, n=3, largo=0.7)
    B.flujo(f'suelta{lado}', M['calor'], (lado * 4.4, YF - 0.3, -1.6), (lado * 2.4, YF - 0.3, -1.6), '-x' if lado > 0 else 'x',
            27.2, 29.0, n=3, largo=0.7)

# nieve
copos = []
for i in range(60):
    x, y = random.uniform(-14, 14), random.uniform(Y0 - 0.5, Y0 + 12)
    c = B.esfera(f'copo{i}', 0.06, M['copo'], (x, y, 9.0))
    c.scale = (0, 0, 0)
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    for t0, t1 in ((0.0, 6.9), (33.8, DUR)):
        t = t0 + random.uniform(0, 1.2)
        while t < t1:
            key(c, 'location', t, (x, y, 8.0), 'LINEAR')
            key(c, 'scale', t, (1, 1, 1), 'CONSTANT')
            key(c, 'location', t + 1.6, (x + 0.4, y, 0.1), 'CONSTANT')
            t += 1.65
        key(c, 'scale', t, (0, 0, 0), 'CONSTANT')

# pala clavada en la nieve
pala = B.raiz('pala', (6.0, Y0 + 1.6, 0))
B.hijos(pala, [B.cilindro('mango', 0.04, 1.3, 'z', M['madera'], (0, 0, 0.3)), D.caja('hoja_pala', -0.15, 0.15, -0.02, 0.02, -0.1, 0.35, M['pala'])])
pala.rotation_euler = (0.2, 0.1, 0)
key(pala, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(pala, 38.55, 0.3, 1.3)

# montanas y una casita de adobe
for i, (mx, my, h, r) in enumerate(((-30, 70, 26, 22), (0, 85, 34, 26), (32, 72, 28, 22), (-55, 90, 30, 25), (58, 90, 30, 25))):
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=r, radius2=0, depth=h, location=(mx, my, h / 2 - 1))
    mo = bpy.context.object
    mo.data.materials.append(M['montana'])
    mo.rotation_euler = (0, 0, i)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=r * 0.32, radius2=0, depth=h * 0.32, location=(mx, my, h - 1 - h * 0.16 + 0.05))
    cu = bpy.context.object
    cu.data.materials.append(M['cumbre'])
    cu.rotation_euler = (0, 0, i)
D.caja('casita', -13.0, -8.5, Y0 + 9.0, Y0 + 13.0, 0.0, 2.6, M['adobe'])
D.prisma_y('casita_techo', [(-13.4, 2.6), (-8.1, 2.6), (-10.75, 4.0)], Y0 + 8.7, Y0 + 13.3, M['madera'])

TOMAS = [
    (0.0, (0.0, -32.0, 12.0), (0.0, 30.0, 8.0)),
    (2.5, (0.0, -22.0, 6.0), (0.0, 2.0, 0.0)),
    (4.8, (0.0, -12.5, 0.2), (0.0, 0.0, -1.3)),
    (6.9, (0.0, -12.0, 0.0), (0.0, 0.0, -1.4), 'CORTE'),
    (6.95, (0.0, -18.5, 2.2), (0.0, 0.0, -1.2)),
    (10.5, (0.0, -17.5, 1.8), (0.0, 0.0, -1.2)),
    (10.7, (-1.5, -21.0, 3.6), (-1.5, 0.0, 0.2)),
    (15.9, (-1.0, -20.0, 3.2), (-1.0, 0.0, 0.0)),
    (16.1, (-3.0, -22.0, 6.5), (-2.0, 3.0, 2.5)),
    (22.9, (-2.5, -20.5, 5.5), (-1.5, 2.0, 1.5)),
    (23.1, (0.0, -14.5, 0.6), (0.0, 0.0, -1.2)),
    (30.7, (0.0, -13.5, 0.3), (0.0, 0.0, -1.3)),
    (30.9, (0.0, -11.0, -0.9), (0.0, 0.0, -1.8)),
    (33.7, (0.0, -10.5, -1.0), (0.0, 0.0, -1.8)),
    (34.4, (1.0, -16.0, 2.0), (0.5, 1.5, -0.3)),
    (35.6, (3.5, -14.5, 2.0), (4.5, 1.0, 0.2)),
    (DUR, (4.2, -11.5, 1.4), (5.5, 1.0, 0.4)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e, c in ((0.0, 4.0, (1.0, 0.96, 0.9)), (25.9, 4.0, (1.0, 0.96, 0.9)), (26.3, 0.9, (0.5, 0.6, 1.0)),
                (30.7, 0.9, (0.5, 0.6, 1.0)), (31.0, 4.0, (1.0, 0.96, 0.9))):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
    sol.data.color = c
    sol.data.keyframe_insert('color', frame=F(t))
bg = bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength']
for t, v in ((0.0, 0.35), (25.9, 0.35), (26.3, 0.1), (30.7, 0.1), (31.0, 0.35)):
    B.key_valor(bg, t, v)
B.terminar(opt, salida, DUR)
