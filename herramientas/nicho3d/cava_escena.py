"""06 — Cava de vino en espiral debajo de la cocina. Audio: .tmp_render/lote/c6_limpio.m4a."""
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(6)
DUR = 40.2
TC = 5.95
M = B.materiales()
M.update({
    'baldosa': D.pbr('baldosa', 'large_grey_tiles' if False else 'smooth_concrete_floor', tam=1.0, tinte=(0.85, 0.82, 0.76), fac=0.6, brillo=1.6),
    'vidrio_grueso': D.liso('vidrio_grueso', (0.6, 0.85, 0.9), 0.02),
    'botella': D.liso('botella', (0.04, 0.16, 0.06), 0.08, metal=0.1),
    'corcho': D.liso('corcho', (0.55, 0.35, 0.2), 0.7),
    'rojo_txt': D.liso('rojo_txt', (1.0, 0.25, 0.1), 0.4, emit=2.0),
    'azul_txt': D.liso('azul_txt', (0.4, 0.75, 1.0), 0.4, emit=2.0),
    'alfombra': D.liso('alfombra', (0.55, 0.12, 0.1), 0.9),
    'heladera': D.liso('heladera', (0.8, 0.82, 0.84), 0.25, metal=0.6),
    'brillo': D.liso('brillo', (1.0, 0.9, 0.5), 0.3, emit=0.0),
})
vg = M['vidrio_grueso']
vg.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.35
vg.surface_render_method = 'BLENDED'

R = 1.6                       # radio de la cava
ZP = -0.3                     # bajo el piso de la cocina
ZB = -3.4                     # fondo
HX0, HX1, HY1 = -6.0, 6.0, Y0 + 7.0   # casa

# ---------------- terreno con hueco redondo (medio cilindro abierto al frente) ----------------
suelo = D.caja('suelo', -40, 40, Y0, 90, -30.0, 0.0)
suelo.data.materials.append(M['tierra'])
suelo.data.materials.append(M['pasto'])
cort = B.medio_tubo('cortador', R + 0.02, ZB - 0.25, 1.0, 'z', M['tierra'], (0, Y0 - 0.5, 0), solido=True)
cort.scale = (1, 1, 1)
D.restar(suelo, cort)
D.aplicar_mods(suelo)
D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > -0.01) else 0)
frente = D.cara_relieve('frente', -16, 16, -16.0, 0.0, Y0 - 0.001, M['tierra'], fuerza=0.32)
D.aplicar_mods(frente)
bm = bmesh.new()
bm.from_mesh(frente.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().x) < R + 0.02 and f.calc_center_median().z > ZB - 0.25],
                 context='FACES')
bm.to_mesh(frente.data)
bm.free()
for a, b in ((-40, -R), (R, 40)):
    D.caja('pasto_borde', a, b, Y0 - 0.06, Y0 + 0.4, -0.12, 0.02, M['pasto'])

# relleno de tierra (medio cilindro macizo) que se cava
fill = B.medio_tubo('tierra_pozo', R, ZB - 0.25, ZP, 'z', M['tierra'], (0, YF, 0), solido=True)
B.origen(fill, (0, YF, ZB - 0.25))
key(fill, 'scale', TC - 0.05, (0, 0, 0), 'CONSTANT')
key(fill, 'scale', TC, (1, 1, 1))
key(fill, 'scale', 6.6, (1, 1, 1))
key(fill, 'scale', 8.0, (1, 1, 0.01))
key(fill, 'scale', 8.05, (0, 0, 0), 'CONSTANT')
B.medida('m3', R + 0.9, ZP, ZB, '3 m', M, 7.94, 9.6, lado=1)
B.monton(M, (8.5, 2.0, 0.0), 6.6, 8.0, t_fin=9.6, esc=(1.8, 1.5, 0.9))

# ---------------- casa cortada: cocina ----------------
losa = D.caja('losa_cocina', HX0, HX1, YF, HY1, ZP, 0.02, M['baldosa'])
hueco_losa = B.medio_tubo('hueco_losa', R, ZP - 0.5, 0.5, 'z', M['baldosa'], (0, YF - 0.3, 0), solido=True)
D.restar(losa, hueco_losa)
D.aplicar_mods(losa)
tapon = B.medio_tubo('tapon', R, ZP, 0.02, 'z', M['baldosa'], (0, YF, 0), solido=True)
key(tapon, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(tapon, 'scale', TC, (1, 1, 1), 'CONSTANT')
key(tapon, 'scale', 6.5, (0, 0, 0), 'CONSTANT')
for nombre, x0, x1, y0, y1, z0, z1 in (('fondo', HX0, HX1, HY1 - 0.2, HY1, 0, 3.0), ('izq', HX0, HX0 + 0.2, YF, HY1, 0, 3.0),
                                       ('der', HX1 - 0.2, HX1, YF, HY1, 0, 3.0), ('techo', HX0, HX1, YF, HY1, 3.0, 3.3)):
    D.caja('pared_' + nombre, x0, x1, y0, y1, z0, z1, M['muro'] if nombre != 'techo' else M['concreto'])
D.caja('piso_alto', HX0, HX1, YF, HY1, 3.3, 6.2, M['muro'])
me = bpy.data.meshes.new('techo')
bmt = bmesh.new()
pts = [(HX0 - 0.4, YF - 0.3, 6.2), (HX1 + 0.4, YF - 0.3, 6.2), (HX1 + 0.4, HY1 + 0.4, 6.2), (HX0 - 0.4, HY1 + 0.4, 6.2),
       (HX0 + 1.5, (YF + HY1) / 2, 8.6), (HX1 - 1.5, (YF + HY1) / 2, 8.6)]
vs = [bmt.verts.new(p) for p in pts]
for f in ((0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
    bmt.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(bmt, faces=bmt.faces)
bmt.to_mesh(me)
bmt.free()
techo = D.link(bpy.data.objects.new('techo', me))
techo.data.materials.append(M['teja'])
# muebles de cocina
yb = HY1 - 0.2
D.caja('bajo_mesada', HX0 + 0.3, 3.4, yb - 0.6, yb, 0, 0.9, M['madera'])
D.caja('mesada', HX0 + 0.3, 3.4, yb - 0.65, yb, 0.9, 0.95, M['blanco'])
D.caja('alacena', HX0 + 0.3, 3.4, yb - 0.35, yb, 1.6, 2.3, M['madera'])
D.caja('heladera', 3.7, 4.6, yb - 0.75, yb, 0, 2.0, M['heladera'])
D.caja('ventana', -2.0, 0.0, yb - 0.02, yb + 0.01, 1.1, 2.0, M['vidrio'])
D.caja('anafe', -1.5, -0.6, yb - 0.5, yb - 0.15, 0.95, 0.97, M['negro'])
for sx in (-3.6, -2.6):
    D.modelo('plastic_monobloc_chair_01', (sx, yb - 1.6, 0.02), math.pi, 1.0)
aire = B.raiz('aire_ac', (-4.4, yb - 0.15, 2.5))
B.hijos(aire, [D.caja('ac', -0.6, 0.6, -0.13, 0.13, -0.2, 0.2, M['blanco'])])
key(aire, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(aire, 29.6, 0.3)
cruz = B.raiz('cruz', (-4.4, yb - 0.5, 2.5))
for a in (0.785, -0.785):
    b_ = D.caja('cruz_barra', -0.9, 0.9, -0.05, 0.05, -0.08, 0.08, M['flecha_roja'])
    b_.rotation_euler = (0, a, 0)
    b_.parent = cruz
key(cruz, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(cruz, 30.05, 0.25)
quitar(cruz, 30.9, 0.2)
quitar(aire, 30.9, 0.2)

# ---------------- cava: muro, botellas, escalera, tapa ----------------
muro = B.medio_tubo('muro_cava', R, ZB, ZP, 'z', M['concreto'], (0, YF, 0), grosor=-0.22, tapas=False)
piso_cava = B.medio_tubo('piso_cava', R, ZB - 0.2, ZB, 'z', M['concreto'], (0, YF, 0), solido=True)
B.origen(muro, (0, YF, ZB))
gancho([muro, piso_cava], TC)
crecer(piso_cava, 2, 9.85, 10.2)
crecer(muro, 2, 10.6, 12.9)

botellas = []
filas = 14
for fi in range(filas):
    z = ZB + 0.22 + fi * 0.19
    for k in range(9):
        a = math.pi * (k + 0.5 + 0.5 * (fi % 2)) / 9.5     # 0..pi del lado +y
        ca, sa = math.cos(a), math.sin(a)
        rr = R - 0.24
        b = B.raiz('botella', (rr * ca, YF + rr * sa, z))
        b.rotation_euler = (0, math.pi / 2, a + math.pi)   # eje local z -> radial hacia el centro
        cuerpo = B.cilindro('bot_cuerpo', 0.045, 0.24, 'z', M['botella'], (0, 0, 0), verts=10)
        cuello = B.cilindro('bot_cuello', 0.016, 0.08, 'z', M['botella'], (0, 0, 0.24), verts=8)
        tap = B.cilindro('bot_corcho', 0.017, 0.02, 'z', M['corcho'], (0, 0, 0.32), verts=8)
        B.hijos(b, [cuerpo, cuello, tap])
        botellas.append((fi, k, b))
for fi, k, b in botellas:
    orden = fi * 9 + k
    t = 13.45 + 2.6 * orden / (filas * 9)
    gancho(b, TC)
    pop(b, t, 0.2)
    if (fi + k) % 5 == 0:
        rebote(b, 39.25 + 0.002 * orden, 1.0, 1.3)

esc = B.raiz('escalera_caracol', (0, YF + 0.2, ZB))
col = B.cilindro('columna', 0.1, -ZB + 0.02, 'z', M['acero_claro'], (0, 0, 0))
col.parent = esc
peldanos = []
for k in range(16):
    p = B.raiz(f'peldano{k}', (0, YF + 0.2, ZB + 0.2 * (k + 1)))
    pe = D.caja('peldano', 0.05, 1.15, -0.2, 0.2, -0.04, 0.0, M['madera'])
    pe.parent = p
    p.rotation_euler = (0, 0, math.radians(-150 + 22 * k))
    gancho(p, TC)
    pop(p, 17.5 + 0.11 * k, 0.2)
    peldanos.append(p)
col.scale = (1, 1, 1)
key(col, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(col, 'scale', TC, (0, 0, 0), 'CONSTANT')
crecer(col, 2, 17.4, 19.3)

# tapa de vidrio (media, cortada al frente) con bisagra atras
tapa = B.raiz('tapa', (0, YF + R, 0.02))
vidrio = B.medio_tubo('tapa_vidrio', R + 0.05, 0.0, 0.08, 'z', M['vidrio_grueso'], (0, -R, 0), solido=True)
aro = B.medio_tubo('tapa_aro', R + 0.08, 0.0, 0.09, 'z', M['acero'], (0, -R, 0), grosor=0.06)
B.hijos(tapa, [vidrio, aro])
ABIERTA = (-1.25, 0, 0)
for t, rot in ((0.0, (0, 0, 0)), (0.5, (0, 0, 0)), (1.6, ABIERTA), (31.0, ABIERTA), (31.7, (0, 0, 0))):
    key(tapa, 'rotation_euler', t, rot)
key(tapa, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(tapa, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(tapa, 'scale', 30.9, (1, 1, 1), 'CONSTANT')
alfombra = D.caja('alfombra', -1.9, 1.9, YF + 0.0, YF + 1.95, 0.11, 0.14, M['alfombra'])
B.origen(alfombra, (5.0, YF + 1.0, 0.11))
alfombra.location = (5.0, YF + 1.0, 0.11)
key(alfombra, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(alfombra, 'scale', 36.9, (1, 1, 1), 'CONSTANT')
key(alfombra, 'location', 36.9, (10.0, YF + 1.0, 0.11))
key(alfombra, 'location', 37.7, (5.0, YF + 1.0, 0.11))

# temperaturas
t13 = B.texto('t13', '13°C', M['medida'], (0, YF - 0.4, -1.9), tam=0.7)
key(t13, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(t13, 22.9, 0.3)
quitar(t13, 29.0, 0.25)
t35 = B.texto('t35', '35°C', M['rojo_txt'], (0, YF - 0.4, 4.6), tam=1.0)
key(t35, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(t35, 25.75, 0.25)
quitar(t35, 26.45, 0.15)
tm5 = B.texto('tm5', '-5°C', M['azul_txt'], (0, YF - 0.4, 4.6), tam=1.0)
key(tm5, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(tm5, 26.55, 0.25)
quitar(tm5, 28.9, 0.2)
mil = B.texto('mil', '1.000', M['medida'], (0, YF - 0.5, -1.6), tam=0.9)
key(mil, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(mil, 34.85, 0.3)
quitar(mil, 36.2, 0.2)

# exterior
B.casa_patio(M, HX=0.0, HY=22.0, arboles=((-12.0, 8.0, 6.5), (12.0, 9.0, 7.0), (-16.0, 30.0, 8.0), (16.0, 30.0, 8.0)))

TOMAS = [
    (0.0, (0.0, -10.5, 2.0), (0.0, -1.5, 0.3)),
    (1.8, (0.0, -9.0, 1.4), (0.0, -2.5, -0.4)),
    (3.2, (0.0, -8.0, 0.4), (0.0, -3.0, -1.4)),
    (5.9, (0.2, -7.4, -1.0), (0.0, -3.0, -2.2), 'CORTE'),
    (5.95, (0.0, -15.0, 2.6), (0.0, -2.0, -1.2)),
    (9.7, (0.0, -14.0, 2.2), (0.0, -2.0, -1.4)),
    (10.1, (1.6, -9.5, -0.8), (0.0, -3.2, -1.9)),
    (16.6, (1.2, -9.0, -1.1), (0.0, -3.2, -1.9)),
    (17.0, (0.0, -9.8, -0.4), (0.0, -3.4, -1.6)),
    (19.7, (0.0, -9.2, -0.5), (0.0, -3.4, -1.6)),
    (20.2, (0.0, -17.0, 4.0), (0.0, -1.0, 0.8)),
    (26.9, (0.0, -16.0, 3.6), (0.0, -1.0, 0.6)),
    (27.4, (-3.4, -9.5, 2.0), (-4.2, 3.0, 2.2)),
    (30.6, (-3.6, -8.5, 2.1), (-4.3, 3.0, 2.3)),
    (31.0, (0.0, -8.5, 4.4), (0.0, -3.2, 0.0)),
    (33.9, (0.0, -8.2, 4.1), (0.0, -3.2, 0.0)),
    (34.3, (0.0, -12.0, 0.2), (0.0, -3.0, -1.6)),
    (35.9, (0.0, -11.6, 0.0), (0.0, -3.0, -1.6)),
    (36.4, (0.0, -15.0, 2.4), (0.0, -2.0, -0.4)),
    (DUR, (0.0, -13.0, 1.7), (0.0, -2.2, -0.8)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
