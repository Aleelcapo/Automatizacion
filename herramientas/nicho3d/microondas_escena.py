"""34 — Como funciona el microondas. Audio: .tmp_render/lote3/a8_limpio.m4a (38.8 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(34)
DUR = 39.4
TC = 4.9
M = B.materiales()
M.update({
    'carcasa': D.liso('carcasa', (0.9, 0.9, 0.88), 0.35),
    'interior_m': D.liso('interior_m', (0.82, 0.8, 0.74), 0.5),
    'vidrio_p': D.agua('vidrio_p', col=(0.05, 0.08, 0.1), alpha=0.25),
    'malla': D.liso('malla', (0.05, 0.05, 0.05), 0.5),
    'plato': D.agua('plato', col=(0.7, 0.85, 0.9), alpha=0.5),
    'comida': D.liso('comida', (0.82, 0.62, 0.3), 0.7),
    'caliente': D.liso('caliente', (1.0, 0.25, 0.05), 0.5, emit=1.2),
    'frio': D.liso('frio', (0.3, 0.6, 1.0), 0.5, emit=0.6),
    'cobre': D.liso('cobre', (0.85, 0.45, 0.2), 0.3, metal=0.9),
    'onda': D.liso('onda', (1.0, 0.15, 0.1), 0.5, emit=3.0),
    'luz_am': D.liso('luz_am', (1.0, 0.85, 0.2), 0.5, emit=3.0),
    'zona_c': D.agua('zona_c', col=(1.0, 0.2, 0.05), alpha=0.3),
    'zona_f': D.agua('zona_f', col=(0.2, 0.5, 1.0), alpha=0.3),
    'oxi': D.liso('oxi', (0.9, 0.12, 0.1), 0.35),
    'hidro': D.liso('hidro', (0.95, 0.95, 0.95), 0.35),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
XC, YC = -1.35, Y0 + 2.7         # centro del plato
ZP = 0.5                          # alto del plato

# ---------- cocina ----------
mueble = D.caja('mueble', -30, 30, Y0, Y0 + 10, -8.0, -0.25, M['madera'])
D.caja('mesada', -30, 30, Y0 - 0.2, Y0 + 10, -0.25, 0.0, M['concreto'])
D.caja('pared', -30, 30, Y0 + 10, Y0 + 10.5, -8.0, 14.0, M['muro'])
D.caja('piso_c', -60, 60, Y0 - 30, Y0 + 30, -8.2, -8.0, M['piso'])
for x in (-12.0, 9.0):
    D.caja('alacena', x, x + 6, Y0 + 7, Y0 + 10, 7.0, 12.0, M['madera'])

# ---------- microondas ----------
cuerpo = D.caja('cuerpo', -4.5, 4.5, Y0, Y0 + 5.5, 0.05, 4.6, M['carcasa'])
for c in (D.caja('cav', -4.1, 1.4, Y0 - 1, Y0 + 5.1, 0.35, 4.2), D.caja('comp', 1.65, 4.3, Y0 - 1, Y0 + 5.1, 0.35, 4.2)):
    D.restar(cuerpo, c)
D.aplicar_mods(cuerpo)
D.caja('fondo_cav', -4.1, 1.4, Y0 + 5.05, Y0 + 5.1, 0.35, 4.2, M['interior_m'])
D.caja('piso_cav', -4.1, 1.4, Y0, Y0 + 5.1, 0.33, 0.36, M['interior_m'])
luz = bpy.data.lights.new('luz_int', 'POINT')
luz.energy = 120
luz.color = (1.0, 0.9, 0.7)
lo = bpy.data.objects.new('luz_int', luz)
bpy.context.scene.collection.objects.link(lo)
lo.location = (XC, Y0 + 2.5, 3.8)

# magnetron y guia de ondas
mag = B.raiz('magnetron', (2.95, Y0 + 3.0, 1.8))
aletas = [B.cilindro('mag_c', 0.55, 1.2, 'z', M['cobre'], (0, 0, -0.6))]
for k in range(6):
    aletas.append(D.caja('aleta', -0.9, 0.9, -0.9, 0.9, -0.55 + 0.2 * k, -0.5 + 0.2 * k, M['acero_claro']))
aletas.append(B.cilindro('antena', 0.12, 1.3, 'z', M['acero'], (0, 0, 0.6)))
B.hijos(mag, aletas)
D.caja('guia', 1.3, 3.4, Y0 + 2.2, Y0 + 3.8, 3.5, 4.1, M['acero_claro'])

# ---------- puerta con malla ----------
puerta = B.raiz('puerta', (-1.45, Y0 - 0.15, 2.3))
pp = [D.caja('vidrio', -2.95, 2.95, -0.08, 0.08, -2.1, 2.1, M['vidrio_p'])]
for x0, x1, z0, z1 in ((-2.95, -2.6, -2.1, 2.1), (2.6, 2.95, -2.1, 2.1), (-2.95, 2.95, -2.1, -1.8), (-2.95, 2.95, 1.8, 2.1)):
    pp.append(D.caja('marco', x0, x1, -0.1, 0.1, z0, z1, M['carcasa']))
for k in range(53):
    x = -2.6 + k * 5.2 / 52
    pp.append(D.caja('malla_v', x - 0.008, x + 0.008, -0.11, -0.09, -1.8, 1.8, M['malla']))
for k in range(37):
    z = -1.8 + k * 3.6 / 36
    pp.append(D.caja('malla_h', -2.6, 2.6, -0.11, -0.09, z - 0.008, z + 0.008, M['malla']))
pp.append(D.caja('manija', 2.65, 2.85, -0.45, -0.1, -1.2, 1.2, M['acero_claro']))
B.hijos(puerta, pp)
B.gancho([puerta], TC)
pop(puerta, 27.4, 0.35)

# ---------- plato y comida (cortada a la mitad) ----------
plato = B.raiz('plato', (XC, YC, ZP))
comida = B.raiz('comida', (0, -0.9, 0.08))
comida.parent = plato
media = B.medio_tubo('media', 1.0, 0.0, 0.9, 'z', M['comida'], (0, 0, 0), solido=True)
anillo = B.medio_tubo('anillo', 1.0, 0.0, 0.9, 'z', M['caliente'], (0, -0.012, 0), solido=True)
nucleo = B.medio_tubo('nucleo', 0.72, -0.01, 0.91, 'z', M['frio'], (0, -0.024, 0), solido=True)
B.hijos(comida, [media, anillo, nucleo])
B.hijos(plato, [B.cilindro('vidrio_pl', 2.3, 0.08, 'z', M['plato'], (0, 0, 0)), comida])
# en el gancho ya se ve el borde caliente; despues vuelve a frio hasta 18.3
for o in (anillo, nucleo):
    key(o, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
    key(o, 'scale', TC, (0, 0, 0), 'CONSTANT')
    pop(o, 18.3 if o is anillo else 18.6, 0.35)

ang = [(0.0, 0.0), (TC, 2 * math.pi), (21.4, 2 * math.pi), (27.0, 4 * math.pi), (36.85, 4 * math.pi),
       (DUR + 0.1, 4 * math.pi + 2 * math.pi * (DUR + 0.1 - 36.85) / TC)]
for t, a in ang:
    key(plato, 'rotation_euler', t, (0, 0, a), 'LINEAR')
key(plato, 'rotation_euler', TC + 0.01, (0, 0, 2 * math.pi), 'CONSTANT')


# ---------- ondas ----------
def onda(nombre, p0, p1, amp, ondas, grosor=0.04, m=None):
    pts = []
    n = 60
    dx, dz = p1[0] - p0[0], p1[2] - p0[2]
    L = math.hypot(dx, dz)
    nx, nz = (-dz / L, dx / L) if L > 1e-6 else (0.0, 1.0)
    for k in range(n + 1):
        u = k / n
        s = amp * math.sin(2 * math.pi * ondas * u)
        pts.append((p0[0] + dx * u + nx * s, p0[1] + (p1[1] - p0[1]) * u, p0[2] + dz * u + nz * s))
    return B.curva(nombre, pts, m or M['onda'], grosor=grosor)


ondas_i = []
for k, (p0, p1) in enumerate(((((2.95, Y0 + 2.6, 2.6), (2.95, Y0 + 2.6, 3.8))), ((2.9, Y0 + 2.6, 3.8), (1.2, Y0 + 2.6, 3.8)),
                              ((1.2, Y0 + 2.6, 3.8), (-1.0, Y0 + 2.6, 1.0)), ((1.2, Y0 + 2.6, 3.6), (-3.6, Y0 + 2.6, 2.0)),
                              ((-3.6, Y0 + 2.6, 2.0), (-1.6, Y0 + 2.6, 0.8)))):
    o = onda(f'onda{k}', p0, p1, 0.12, 3 + k)
    ondas_i.append(o)


def ondas_on(t0, t1):
    for k, o in enumerate(ondas_i):
        key(o, 'scale', t0 - 0.05, (0, 0, 0), 'CONSTANT')
        key(o, 'scale', t0 + 0.2 * k, (1, 1, 1), 'CONSTANT')
        o.data.bevel_factor_end = 0.0
        o.data.keyframe_insert('bevel_factor_end', frame=B.F(t0 + 0.2 * k))
        o.data.bevel_factor_end = 1.0
        o.data.keyframe_insert('bevel_factor_end', frame=B.F(t0 + 0.2 * k + 0.4))
        key(o, 'scale', t1, (1, 1, 1), 'CONSTANT')
        key(o, 'scale', t1 + 0.05, (0, 0, 0), 'CONSTANT')


for o in ondas_i:
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
ondas_on(0.1, TC - 0.05)
ondas_on(7.8, 9.6)
ondas_on(36.9, DUR + 0.2)
rebote(mag, 6.9, 1.0, 1.2)

# ---------- moleculas de agua girando ----------
mols = []
for k, (dx, dz) in enumerate(((-0.45, 0.25), (0.35, 0.55), (0.1, 0.1))):
    m = B.raiz(f'mol{k}', (XC + dx, YC - 0.9 - 0.35, ZP + 0.08 + dz + 0.1))
    a = math.radians(52)
    B.hijos(m, [B.esfera('O', 0.14, M['oxi'], (0, 0, 0)),
                B.esfera('H1', 0.09, M['hidro'], (0.18 * math.sin(a), 0, 0.18 * math.cos(a))),
                B.esfera('H2', 0.09, M['hidro'], (-0.18 * math.sin(a), 0, 0.18 * math.cos(a)))])
    key(m, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(m, 10.6 + 0.2 * k, 0.25)
    for j in range(40):
        t = 11.0 + j * 0.13
        key(m, 'rotation_euler', t, (0, math.radians(55 if (j + k) % 2 else -55), 0), 'LINEAR')
    quitar(m, 16.5, 0.2)
    mols.append(m)
G.letrero('milm', '2.450.000.000 / s', M['medida'], (XC, YC - 2.0, ZP + 1.75), tam=0.24, t_on=14.4, t_off=16.5)
G.letrero('calor_t', 'CALOR', M['caliente'], (XC, YC - 2.0, ZP + 1.4), tam=0.3, t_on=18.3, t_off=20.9)
for k, dx in enumerate((-0.95, 0.95)):
    B.flujo(f'afuera{k}', M['flecha_roja'], (XC + dx * 1.35, YC - 2.0, ZP + 0.5), (XC + dx * 0.9, YC - 2.0, ZP + 0.5),
            '-x' if dx > 0 else 'x', 19.4, 20.8, n=2, largo=0.3, grosor=0.03, sep=0.3)

# ---------- zonas calientes y frias ----------
zonas = []
for k in range(6):
    a = 2 * math.pi * k / 6 + 0.4
    z = B.cilindro('zona', 0.55, 3.6, 'z', M['zona_c'] if k % 2 == 0 else M['zona_f'], (XC + 0.95 * math.cos(a), YC + 0.95 * math.sin(a), ZP))
    key(z, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(z, 22.8 + 0.12 * k, 0.3)
    quitar(z, 26.9, 0.3)
    zonas.append(z)

# ---------- la malla de la puerta: la onda rebota, la luz pasa ----------
grande = onda('onda_grande', (XC - 2.4, Y0 + 2.5, 3.6), (XC + 0.3, Y0 + 0.15, 1.6), 0.35, 2.2, grosor=0.06)
key(grande, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(grande, 'scale', 30.6, (1, 1, 1), 'CONSTANT')
B.trazar(grande, 30.65, 31.6)
key(grande, 'scale', 33.3, (1, 1, 1), 'CONSTANT')
key(grande, 'scale', 33.35, (0, 0, 0), 'CONSTANT')
rebota = onda('onda_rebota', (XC + 0.3, Y0 + 0.15, 1.6), (XC + 2.3, Y0 + 2.5, 3.5), 0.35, 2.2, grosor=0.06)
key(rebota, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(rebota, 'scale', 33.35, (1, 1, 1), 'CONSTANT')
B.trazar(rebota, 33.36, 34.0)
key(rebota, 'scale', 34.3, (1, 1, 1), 'CONSTANT')
key(rebota, 'scale', 34.35, (0, 0, 0), 'CONSTANT')
G.letrero('rebota_t', 'NO PASA', M['onda'], (XC, Y0 - 0.5, 3.7), tam=0.34, t_on=33.3, t_off=34.3)
for k in range(4):
    f = B.flecha(f'luz{k}', 1.6, M['luz_am'], (XC - 1.2 + 0.8 * k, Y0 + 1.0, 1.4 + 0.4 * (k % 2)), 'x', 0.08)
    f.rotation_euler = (0, 0, -math.pi / 2)
    key(f, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(f, 34.6 + 0.1 * k, 0.2)
    key(f, 'location', 34.7 + 0.1 * k, (XC - 1.2 + 0.8 * k, Y0 + 1.0, 1.4 + 0.4 * (k % 2)))
    key(f, 'location', 35.9 + 0.1 * k, (XC - 1.2 + 0.8 * k, Y0 - 2.4, 1.4 + 0.4 * (k % 2)))
    quitar(f, 36.3, 0.2)
G.letrero('agujeros', 'AGUJEROS DE 1 mm', M['etiqueta'], (XC, Y0 - 0.5, 3.7), tam=0.34, t_on=29.4, t_off=30.6)
G.letrero('onda12', 'ONDA DE 12 cm', M['onda'], (XC, Y0 - 0.5, 3.7), tam=0.34, t_on=31.0, t_off=34.2)

# ---------- camara ----------
GANCHO = ((-0.3, -10.0, 3.6), (-0.3, Y0 + 2.5, 2.2))
COMIDA = ((XC, -6.6, 1.25), (XC, Y0 + 1.8, 0.95))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (-0.3, -10.6, 3.7), (-0.3, Y0 + 2.5, 2.2), 'CORTE'),
    (TC, (-0.5, -15.0, 5.0), (-0.3, Y0 + 2.5, 2.1)),
    (5.6, (5.5, -6.5, 3.0), (2.9, Y0 + 3.0, 2.6)),
    (9.3, (5.0, -7.5, 3.3), (2.4, Y0 + 3.0, 2.6)),
    (10.2, *COMIDA),
    (16.4, (XC, -6.2, 1.25), (XC, Y0 + 1.8, 0.95)),
    (17.0, (XC, -6.6, 1.3), (XC, Y0 + 1.8, 0.95)),
    (20.9, (XC, -6.3, 1.3), (XC, Y0 + 1.8, 0.95)),
    (21.6, (XC, -8.0, 5.5), (XC, YC, 0.9)),
    (27.0, (XC, -8.5, 5.6), (XC, YC, 0.9)),
    (27.8, (-1.2, -9.0, 2.8), (-1.4, Y0, 2.4)),
    (32.0, (-1.4, -8.0, 2.7), (-1.4, Y0 + 0.5, 2.5)),
    (36.7, (-1.4, -8.6, 2.8), (-1.4, Y0 + 0.5, 2.4), 'CORTE'),
    (36.85, *GANCHO),
    (DUR, (-0.3, -10.5, 3.7), (-0.3, Y0 + 2.5, 2.2)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
