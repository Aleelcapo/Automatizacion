"""33 — El tunel mas largo del mundo (San Gotardo). Audio: .tmp_render/lote3/a7_limpio.m4a (37.4 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar  # noqa: E402

opt, salida = B.inicio(33)
DUR = 38.0
TC = 3.4
M = B.materiales()
M.update({
    'roca': D.pbr('roca_g', 'brown_mud_rocks_01', tam=2.5, tinte=(0.5, 0.48, 0.46), fac=0.7),
    'nieve': D.liso('nieve', (0.95, 0.97, 1.0), 0.5),
    'tren': D.liso('tren', (0.92, 0.92, 0.9), 0.35),
    'franja_t': D.liso('franja_t', (0.8, 0.08, 0.08), 0.4),
    'tbm': D.liso('tbm', (0.95, 0.7, 0.05), 0.4, metal=0.3),
    'calor': D.agua('calor', col=(1.0, 0.25, 0.03), alpha=0.28),
    'fuego': D.liso('fuego', (1.0, 0.4, 0.03), 0.5, emit=2.2),
    'camion': D.liso('camion', (0.95, 0.6, 0.05), 0.45),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
ZT0, ZT1 = 0.2, 2.3              # piso / techo del tunel
YM = Y0 + 30

# ---------- montana con el tunel ----------
PERFIL = [(-48, 0), (48, 0), (30, 2), (12, 14), (0, 22), (-10, 16), (-28, 4), (-48, 0)]
cav = D.caja('cav', -300, 300, Y0 - 1, Y0 + 3.0, ZT0, ZT1)
monte = D.prisma_y('monte', PERFIL, Y0, YM, M['roca'])
D.restar(monte, cav, ocultar=False)
D.aplicar_mods(monte)
nieve = D.prisma_y('nieve', [(-6.7, 18.0), (6.0, 18.0), (0.0, 22.05)], Y0 - 0.02, YM + 0.02, M['nieve'])
suelo = D.caja('suelo', -300, 300, Y0, Y0 + 300, -40.0, 0.0, M['tierra'])
suelo.data.materials.append(M['pasto'])
D.restar(suelo, cav, ocultar=False)
D.aplicar_mods(suelo)
D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > -0.01) else 0)
cav.hide_render = True
G.frente('f_suelo', -120, 120, -40.0, -10.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.25)
D.caja('vias', -300, 300, Y0 + 0.6, Y0 + 2.4, ZT0, ZT0 + 0.05, M['acero'])
D.caja('luces', -48, 48, Y0 + 1.3, Y0 + 1.7, ZT1 - 0.05, ZT1, M['etiqueta'])
hojas = D.pbr('cerro', 'forest_leaves_02', tam=6.0, tinte=(0.1, 0.3, 0.06), fac=0.6)
for x, y, r, h in ((-70, 60, 30, 26), (60, 70, 34, 30), (0, 110, 50, 40)):
    B.esfera('alpe', 1.0, M['roca'], (x, Y0 + y, 0), esc=(r, r * 0.6, h))
    B.esfera('alpe_n', 1.0, M['nieve'], (x, Y0 + y, h * 0.62), esc=(r * 0.42, r * 0.26, h * 0.42))

# ---------- tren ----------
tren = B.raiz('tren')
vag = []
for k in range(4):
    x0 = -k * 3.1
    vag += [D.caja('vagon', x0 - 3.0, x0, -0.75, 0.75, 0.0, 1.6, M['tren']),
            D.caja('franja', x0 - 3.0, x0, -0.76, 0.76, 0.6, 0.85, M['franja_t']),
            D.caja('vent', x0 - 2.7, x0 - 0.3, -0.77, 0.77, 0.95, 1.35, M['vidrio'])]
vag.append(B.esfera('nariz', 0.75, M['tren'], (0.0, 0.0, 0.8), esc=(1.4, 1.0, 1.0)))
B.hijos(tren, vag)
YTR = Y0 + 1.5


def pasa(t0, t1, x0, x1):
    key(tren, 'scale', t0 - 0.05, (0, 0, 0), 'CONSTANT')
    key(tren, 'scale', t0, (1, 1, 1), 'CONSTANT')
    key(tren, 'location', t0, (x0, YTR, ZT0 + 0.05), 'LINEAR')
    key(tren, 'location', t1, (x1, YTR, ZT0 + 0.05), 'LINEAR')
    key(tren, 'scale', t1, (1, 1, 1), 'CONSTANT')
    key(tren, 'scale', t1 + 0.05, (0, 0, 0), 'CONSTANT')


pasa(0.0, TC, -8.0, 9.0)
pasa(TC + 0.05, 9.5, -40.0, 30.0)
pasa(28.2, 34.6, -90.0, 90.0)
pasa(35.15, DUR + 0.1, -8.0, -8.0 + 17.0 * (DUR + 0.1 - 35.15) / TC)

# ---------- excavacion: 3 tuneladoras desde varios puntos ----------
TRAMOS = [(-48.0, -16.0), (-16.0, 16.0), (16.0, 48.0)]
for k, (x0, x1) in enumerate(TRAMOS):
    f = B.caja_o(f'relleno{k}', x0, x1, Y0 - 0.02, Y0 + 3.0, ZT0, ZT1, M['roca'], (x1, Y0, ZT0))
    key(f, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    key(f, 'scale', TC + 0.05, (1, 1, 1), 'CONSTANT')
    key(f, 'scale', 10.0, (1, 1, 1), 'CONSTANT')
    key(f, 'scale', 12.4, (1, 1, 1), 'LINEAR')
    key(f, 'scale', 15.2, (0.001, 1, 1), 'LINEAR')
    key(f, 'scale', 15.25, (0, 0, 0), 'CONSTANT')
    tbm = B.raiz(f'tbm{k}', (x0, YTR, ZT0 + 1.05))
    B.hijos(tbm, [B.cilindro('tbm_c', 0.95, 3.0, 'x', M['tbm'], (-3.0, 0, 0)),
                  B.cilindro('tbm_d', 1.0, 0.25, 'x', M['acero'], (0.0, 0, 0))])
    key(tbm, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(tbm, 12.2, 0.25)
    key(tbm, 'location', 12.4, (x0, YTR, ZT0 + 1.05), 'LINEAR')
    key(tbm, 'location', 15.2, (x1, YTR, ZT0 + 1.05), 'LINEAR')
    quitar(tbm, 15.3, 0.2)
    for j, dx in enumerate((6.0, 14.0, 22.0)):
        e = B.esfera('explo', 1.3, M['fuego'], (x0 + dx, YF - 0.3, 1.3))
        key(e, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
        pop(e, 13.3 + 0.15 * j + 0.05 * k, 0.15)
        quitar(e, 13.7 + 0.15 * j + 0.05 * k, 0.2)

# ---------- calor y aire frio ----------
calor = D.caja('calor', -48, 48, YF - 0.25, YF - 0.2, -0.6, 3.4, M['calor'])
key(calor, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(calor, 16.4, 0.4)
quitar(calor, 20.7, 0.4)
for k in range(3):
    B.flujo(f'frio{k}', M['flecha_azul'], (-6.0 + 5 * k, YF - 0.3, 1.3), (-2.0 + 5 * k, YF - 0.3, 1.3), 'x', 19.5 + 0.15 * k, 20.8,
            n=3, largo=1.2, grosor=0.1, sep=0.3)

# ---------- piedra sacada y camiones ----------
import mathutils  # noqa: E402
bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=5.0, radius2=0.0, depth=4.5, location=(0, 0, 0))
monton = bpy.context.object
monton.data.materials.append(M['roca'])
monton.data.transform(mathutils.Matrix.Translation((0, 0, 2.25)))
monton.location = (54.0, Y0 + 9.0, 0.0)
key(monton, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
B.crecer(monton, 2, 21.7, 23.0)
camiones = []
for k in range(6):
    c = B.raiz(f'camion{k}', (50.0 + k * 3.4, Y0 + 3.8, 0.0))
    B.hijos(c, [D.caja('cab', 0.9, 1.6, -0.6, 0.6, 0.3, 1.4, M['camion']),
                D.caja('caja', -1.4, 0.85, -0.65, 0.65, 0.4, 1.3, M['camion']),
                D.caja('carga', -1.3, 0.75, -0.55, 0.55, 1.3, 1.6, M['roca'])] +
            [B.cilindro('rueda', 0.3, 0.2, 'y', M['llanta'], (dx, dy, 0.3)) for dx in (-0.9, 1.1) for dy in (-0.75, 0.55)])
    key(c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(c, 24.1 + 0.15 * k, 0.25)
    quitar(c, 25.5, 0.2)
    camiones.append(c)

# ---------- camino viejo dando vueltas ----------
def x_izq(z):
    return -28.0 + 1.5 * (z - 4.0)


pts = []
for k, z in enumerate((1.0, 3.0, 5.0, 7.0, 9.0, 11.0, 13.0, 15.0)):
    xa = x_izq(max(z, 4.0)) + 1.2 if z >= 4 else -32.0 + z
    pts.append((xa if k % 2 == 0 else xa + 7.0, YF - 0.05, z))
camino = B.curva('camino', pts, M['calle'] if 'calle' in M else M['negro'], grosor=0.18)
key(camino, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(camino, 'scale', 25.7, (1, 1, 1), 'CONSTANT')
B.trazar(camino, 25.75, 27.0)
quitar(camino, 28.1, 0.2)
auto = B.raiz('auto')
B.hijos(auto, [D.caja('auto_c', -0.5, 0.5, -0.3, 0.3, 0.1, 0.45, D.liso('rojo', (0.85, 0.08, 0.06), 0.35)),
               D.caja('auto_v', -0.25, 0.3, -0.25, 0.25, 0.45, 0.65, M['vidrio'])])
key(auto, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(auto, 26.0, 0.2)
for k, p in enumerate(pts):
    key(auto, 'location', 26.0 + 0.24 * k, (p[0], p[1] - 0.3, p[2] + 0.1), 'LINEAR')
quitar(auto, 28.1, 0.2)

# ---------- carteles ----------
B.medida('m2km', 3.0, 22.0, ZT1, '2 km', M, 1.0, 3.4, lado=1.8)
G.letrero('nombre', 'SAN GOTARDO', M['etiqueta'], (0.0, Y0 - 1, 28.0), tam=5.0, t_on=4.0, t_off=9.6)
G.letrero('suiza', 'SUIZA', M['etiqueta'], (0.0, Y0 - 1, 24.2), tam=3.2, t_on=5.1, t_off=9.6)
G.letrero('km57', '57 KM', M['medida'], (0.0, YF - 0.3, 5.5), tam=4.5, t_on=5.6, t_off=9.6)
G.letrero('n1', '#1 DEL MUNDO', M['medida'], (0.0, YF - 0.3, 10.5), tam=3.5, t_on=8.6, t_off=9.6)
G.letrero('anos', '17 AÑOS', M['medida'], (-16.0, YF - 0.3, 6.0), tam=2.6, t_on=10.8, t_off=15.5)
G.letrero('grados', '46 °C', M['medida'], (0.0, YF - 0.3, 4.0), tam=1.3, t_on=17.4, t_off=20.7)
G.letrero('millones', 'MILLONES DE CAMIONES', M['etiqueta'], (56.0, Y0 + 2, 6.5), tam=1.1, t_on=24.3, t_off=25.6)
G.letrero('vel', '+200 KM/H', M['medida'], (0.0, Y0 - 1, 27.0), tam=4.5, t_on=31.1, t_off=34.6)
G.letrero('min', '20 MIN', M['etiqueta'], (0.0, Y0 - 1, 32.5), tam=4.5, t_on=34.1, t_off=35.1)

# ---------- camara ----------
GANCHO = ((0.0, -27.0, 11.0), (0.0, Y0 + 2, 10.5))
ANCHO = ((0.0, -56.0, 13.0), (0.0, Y0 + 5, 11.0))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (0.0, -28.5, 11.2), (0.0, Y0 + 2, 10.5), 'CORTE'),
    (TC, *ANCHO),
    (9.7, (0.0, -68.0, 14.0), (0.0, Y0 + 5, 11.0)),
    (10.4, (-16.0, -28.0, 4.5), (-16.0, Y0, 2.5)),
    (15.4, (-14.0, -29.0, 4.5), (-14.0, Y0, 2.5)),
    (16.2, (-2.0, -15.0, 2.5), (0.0, Y0 + 1, 2.0)),
    (21.0, (-1.0, -16.0, 2.6), (0.0, Y0 + 1, 2.0)),
    (21.5, (44.0, -20.0, 6.0), (54.0, Y0 + 5, 2.0)),
    (25.5, (45.0, -21.0, 6.0), (54.0, Y0 + 5, 2.0)),
    (25.7, (-18.0, -32.0, 9.0), (-19.0, Y0, 8.0)),
    (28.1, (-17.0, -33.0, 9.0), (-18.0, Y0, 8.0)),
    (28.3, *ANCHO),
    (35.1, (0.0, -68.0, 14.5), (0.0, Y0 + 5, 11.0), 'CORTE'),
    (35.15, *GANCHO),
    (DUR, (0.0, -28.4, 11.2), (0.0, Y0 + 2, 10.5)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
