"""10 — La casa que flota en las inundaciones (casa anfibia). Audio: .tmp_render/lote/c10_limpio.m4a."""
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(10)
DUR = 38.6
TC = 3.6
M = B.materiales()
M.update({
    'muro_casa': D.pbr('muro_casa', 'plastered_wall_04', tam=3.0, tinte=(0.95, 0.92, 0.85), fac=0.85, brillo=1.35),
    'puerta': D.liso('puerta', (0.12, 0.25, 0.45), 0.5),
    'collar': D.liso('collar', (0.9, 0.55, 0.05), 0.4, metal=0.5),
    'manguera_a': D.liso('manguera_a', (0.1, 0.35, 0.9), 0.5),
    'manguera_l': D.liso('manguera_l', (0.95, 0.75, 0.05), 0.5),
    'bote': D.liso('bote', (0.85, 0.85, 0.82), 0.4),
    'bote_rojo': D.liso('bote_rojo', (0.8, 0.12, 0.1), 0.4),
    'agua_rio': D.agua('agua_rio', col=(0.10, 0.32, 0.38), alpha=0.6),
})

CX0, CX1, CY1 = -3.8, 3.8, Y0 + 6.8       # cajon
CZ0, CZ1 = -1.4, 0.6
PX = 4.55                                 # postes en x = +-PX
RIO = (9.0, 24.0)
ZFONDO = -2.5

B.terreno(M, [(CX0 - 0.2, CX1 + 0.2, CY1 + 0.2, CZ0 - 0.15), (RIO[0], RIO[1], 70.0, ZFONDO),
              (-PX - 0.25, -PX + 0.25, Y0 + 0.6, -4.2, -0.05), (PX - 0.25, PX + 0.25, Y0 + 0.6, -4.2, -0.05)])
B.relleno_hoyo(M, CX0 - 0.2, CX1 + 0.2, CY1 + 0.2, CZ0 - 0.15, TC, 9.0, 10.2)

# ---------------- nivel del agua (caja de agua que sube) ----------------
L0 = -0.6
agua = B.caja_o('inundacion', -40.0, 40.0, Y0 + 0.05, 70.0, ZFONDO, L0, M['agua_rio'], (0, 0, ZFONDO))
for sx in (-PX, PX):
    tapon = B.caja('tapon_poste', sx - 0.26, sx + 0.26, YF, Y0 + 0.61, -4.25, -0.04, M['tierra'])
    key(tapon, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    key(tapon, 'scale', TC, (1, 1, 1), 'CONSTANT')
    key(tapon, 'scale', 15.6, (0, 0, 0), 'CONSTANT')
NIV = [(0.0, L0), (0.8, L0), (2.4, 1.6), (3.55, 1.6), (3.6, L0, 'C'), (19.0, L0), (20.4, 1.6), (33.0, 1.6), (34.8, L0)]
for e in NIV:
    t, l = e[0], e[1]
    key(agua, 'scale', t, (1, 1, (l - ZFONDO) / (L0 - ZFONDO)), 'CONSTANT' if len(e) > 2 else 'BEZIER')

# ---------------- la casa sobre el cajon (todo sube junto) ----------------
casa = B.raiz('casa_flotante')
cajon_piezas = [D.caja('cajon_piso', CX0, CX1, YF, CY1, CZ0, CZ0 + 0.25, M['concreto']),
                D.caja('cajon_izq', CX0, CX0 + 0.25, YF, CY1, CZ0, CZ1, M['concreto']),
                D.caja('cajon_der', CX1 - 0.25, CX1, YF, CY1, CZ0, CZ1, M['concreto']),
                D.caja('cajon_fondo', CX0, CX1, CY1 - 0.25, CY1, CZ0, CZ1, M['concreto']),
                D.caja('cajon_tapa', CX0, CX1, YF, CY1, CZ1 - 0.25, CZ1, M['concreto'])]
cajon = B.raiz('cajon')
B.hijos(cajon, cajon_piezas)
cajon.parent = casa
gancho(cajon, TC)
pop(cajon, 11.3, 0.4)
hx0, hx1, hy0, hy1 = -3.4, 3.4, Y0 + 0.6, Y0 + 6.4
partes = [D.caja('casa_muros', hx0, hx1, hy0, hy1, CZ1, CZ1 + 3.3, M['muro_casa']),
          D.caja('casa_puerta', -0.55, 0.55, hy0 - 0.05, hy0, CZ1, CZ1 + 2.1, M['puerta'])]
for wx in (-2.2, 2.2):
    partes.append(D.caja('casa_marco', wx - 0.7, wx + 0.7, hy0 - 0.06, hy0, CZ1 + 1.0, CZ1 + 2.4, M['marco']))
    partes.append(D.caja('casa_vidrio', wx - 0.58, wx + 0.58, hy0 - 0.08, hy0 - 0.05, CZ1 + 1.12, CZ1 + 2.28, M['vidrio']))
me = bpy.data.meshes.new('casa_techo')
bm = bmesh.new()
z0 = CZ1 + 3.3
pts = [(hx0 - 0.4, hy0 - 0.5, z0), (hx1 + 0.4, hy0 - 0.5, z0), (hx1 + 0.4, hy1 + 0.5, z0), (hx0 - 0.4, hy1 + 0.5, z0),
       (hx0 - 0.4, (hy0 + hy1) / 2, z0 + 2.2), (hx1 + 0.4, (hy0 + hy1) / 2, z0 + 2.2)]
vs = [bm.verts.new(p) for p in pts]
for f in ((0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
    bm.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()
techo = D.link(bpy.data.objects.new('casa_techo', me))
techo.data.materials.append(M['teja'])
partes.append(techo)
B.hijos(casa, partes)
collares = []
for sx in (-PX, PX):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.09, location=(sx, YF + 0.18, CZ1 - 0.3))
    c = bpy.context.object
    c.data.materials.append(M['collar'])
    brazo = D.caja('collar_brazo', min(sx, sx * 0.84), max(sx, sx * 0.84), YF + 0.08, YF + 0.28, CZ1 - 0.38, CZ1 - 0.22, M['collar'])
    c.parent = casa
    brazo.parent = casa
    gancho([c, brazo], TC)
    pop(c, 15.0, 0.3)
    pop(brazo, 15.0, 0.3)
    collares.append(c)
SUBE = [(0.0, 0.0), (0.6, 0.0), (2.6, 2.0), (3.55, 2.0), (3.6, 0.0, 'C'), (19.8, 0.0), (22.0, 2.0), (30.9, 2.0), (31.4, 2.35),
        (32.0, 2.0), (33.9, 2.0), (35.3, 0.0)]
for e in SUBE:
    key(casa, 'location', e[0], (0, 0, e[1]), 'CONSTANT' if len(e) > 2 else 'BEZIER')
for k, t in enumerate((24.4, 24.9, 25.4, 25.9, 26.4)):
    key(casa, 'rotation_euler', t, (0, 0.012 * (1 if k % 2 else -1), 0.02 * (1 if k % 2 else -1)))
key(casa, 'rotation_euler', 26.9, (0, 0, 0))

# postes
postes = []
for sx in (-PX, PX):
    p = B.cilindro('poste', 0.18, 11.5, 'z', M['acero_claro'], (sx, YF + 0.18, -4.0))
    gancho(p, TC)
    crecer(p, 2, 15.6, 16.8)
    postes.append(p)
B.flujo('clavado', M['flecha_roja'], (PX + 0.9, YF - 0.3, 0.8), (PX + 0.9, YF - 0.3, -3.0), '-z', 17.45, 18.3, n=2, largo=0.8)

# mangueras flexibles (el extremo sigue a la casa)
def manguera(nombre, m, x0, y, x1):
    cv = bpy.data.curves.new(nombre, 'CURVE')
    cv.dimensions = '3D'
    cv.bevel_depth = 0.06
    cv.bevel_resolution = 3
    sp = cv.splines.new('BEZIER')
    sp.bezier_points.add(2)
    pts = [(x0, y, 0.05), ((x0 + x1) / 2, y, 0.0), (x1, y, CZ1 + 0.5)]
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = D.link(bpy.data.objects.new(nombre, cv))
    o.data.materials.append(m)
    medio, fin = sp.bezier_points[1], sp.bezier_points[2]
    for e in SUBE:
        t, dz = e[0], e[1]
        fin.co = (x1, y, CZ1 + 0.5 + dz)
        fin.keyframe_insert('co', frame=F(t))
        medio.co = ((x0 + x1) / 2, y, -0.05 + dz * 0.45)
        medio.keyframe_insert('co', frame=F(t))
    return o


caja_serv = D.caja('caja_servicios', -6.8, -6.0, Y0 + 0.9, Y0 + 1.5, 0.0, 0.9, M['concreto'])
m1 = manguera('manguera_agua', M['manguera_a'], -6.2, Y0 + 1.0, hx0)
m2 = manguera('manguera_luz', M['manguera_l'], -6.2, Y0 + 1.35, hx0)
for o in (m1, m2):
    rebote(o, 27.42, 1.0, 1.05)

# barco suelto en el rio
bote = B.raiz('bote', (16.0, Y0 + 6.0, L0))
me = bpy.data.meshes.new('casco_bote')
bmb = bmesh.new()
perfil = [(-2.0, 0.6), (2.0, 0.6), (1.4, -0.25), (-1.6, -0.25)]
a = [bmb.verts.new((x, -0.9, z)) for x, z in perfil]
b = [bmb.verts.new((x, 0.9, z)) for x, z in perfil]
bmb.faces.new(a)
bmb.faces.new(list(reversed(b)))
for i in range(4):
    j = (i + 1) % 4
    bmb.faces.new((a[i], a[j], b[j], b[i]))
bmesh.ops.recalc_face_normals(bmb, faces=bmb.faces)
bmb.to_mesh(me)
bmb.free()
casco_b = D.link(bpy.data.objects.new('casco_bote', me))
casco_b.data.materials.append(M['bote_rojo'])
B.hijos(bote, [casco_b, D.caja('cabina_bote', -0.8, 0.6, -0.6, 0.6, 0.6, 1.4, M['bote'])])
key(bote, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(bote, 13.1, 0.3)
for e in NIV:
    if e[0] >= 19.0:
        key(bote, 'location', e[0], (16.0, Y0 + 6.0, e[1]))
key(bote, 'location', 26.3, (16.0, Y0 + 6.0, 1.6))
key(bote, 'location', 27.6, (16.0, Y0 + 26.0, 1.6))
key(bote, 'rotation_euler', 26.3, (0, 0, 0))
key(bote, 'rotation_euler', 27.6, (0.1, 0, 0.8))
quitar(bote, 27.7, 0.2)

# corriente que empuja
B.flujo('corriente', M['flecha_azul'], (-11.0, YF - 0.3, 1.0), (-4.5, YF - 0.3, 1.0), 'x', 24.4, 25.6, n=3, largo=1.0, grosor=0.1)
B.flujo('sube_agua', M['flecha_azul'], (6.5, YF - 0.3, -0.4), (6.5, YF - 0.3, 1.4), 'z', 19.0, 20.3, n=3, largo=0.8)
B.flujo('sube_casa', M['flecha_azul'], (0.0, YF - 0.6, -0.4), (0.0, YF - 0.6, 1.4), 'z', 20.2, 21.8, n=2, largo=0.9, grosor=0.1)

# nivel del mar (Holanda)
linea = D.caja('nivel_mar', -14.0, 14.0, YF - 0.32, YF - 0.28, 1.47, 1.53, M['medida'])
B.origen(linea, (0.0, YF - 0.3, 1.5))
txt = B.texto('nivel_txt', 'NIVEL DEL MAR', M['medida'], (0.0, YF - 0.3, 2.2), tam=0.9)
for o in (linea, txt):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(o, 5.6, 0.35)
    quitar(o, 8.4, 0.25)
B.flujo('bajo_mar', M['flecha_roja'], (0.0, YF - 0.3, 1.3), (0.0, YF - 0.3, 0.1), '-z', 6.0, 7.0, n=2, largo=0.7)

# fondo: otras casas, arboles y dique
for hx in (-14.0,):
    for p in D.casa(M, y0=Y0 + 9.0):
        p.location.x += hx
D.caja('dique', RIO[0] - 1.0, RIO[0], Y0, 70, 0.0, 0.25, M['pasto'])
for xv, yv, h in ((-6.0, Y0 + 12.0, 7.5), (5.5, Y0 + 11.0, 6.5), (-20.0, Y0 + 20.0, 8.0), (28.0, Y0 + 14.0, 7.0), (6.5, Y0 + 2.5, 5.5)):
    D.arbol((xv, yv, 0), alto=h, semilla=int(xv))
for nombre, loc, rz, s in (('shrub_04', (-9.0, Y0 + 3.0, 0), 0, 1.6), ('shrub_02', (6.8, Y0 + 6.5, 0), 1.0, 1.5)):
    D.modelo(nombre, loc, rz, s)

TOMAS = [
    (0.0, (4.0, -25.0, 5.5), (4.0, 2.0, 0.8)),
    (3.55, (3.4, -22.5, 4.6), (3.4, 2.0, 0.8), 'CORTE'),
    (3.6, (0.0, -31.0, 8.0), (0.0, 4.0, 1.0)),
    (8.5, (0.0, -29.0, 7.0), (0.0, 4.0, 1.0)),
    (8.8, (0.0, -17.0, 1.2), (0.0, 0.0, -0.4)),
    (13.9, (0.0, -16.5, 1.4), (0.0, 0.0, -0.2)),
    (14.2, (5.2, -15.5, 4.2), (4.5, 0.0, 2.0)),
    (18.4, (4.8, -16.5, 4.0), (4.5, 0.0, 1.0)),
    (18.8, (3.0, -25.0, 5.2), (2.5, 1.0, 1.2)),
    (24.0, (2.0, -24.0, 5.0), (1.0, 1.0, 1.5)),
    (26.0, (6.0, -27.0, 7.0), (8.0, 4.0, 1.5)),
    (26.9, (6.0, -26.5, 6.8), (8.0, 4.0, 1.5)),
    (27.2, (-8.5, -11.5, 3.0), (-5.0, 1.2, 1.6)),
    (32.2, (-8.0, -12.0, 3.2), (-4.8, 1.2, 1.8)),
    (32.6, (1.5, -24.0, 4.6), (1.0, 1.0, 0.6)),
    (DUR, (1.2, -21.5, 3.8), (1.0, 1.0, 0.4)),
]
B.tomas(TOMAS)
sol = B.luz()
for t, e in ((0.0, 2.4), (3.55, 2.4), (3.6, 4.0), (18.8, 4.0), (19.4, 2.4), (33.0, 2.4), (35.0, 4.2)):
    sol.data.energy = e
    sol.data.keyframe_insert('energy', frame=F(t))
B.terminar(opt, salida, DUR)
