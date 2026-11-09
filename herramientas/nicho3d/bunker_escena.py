"""04 — Bunker bajo el patio. Audio: .tmp_render/lote/c4_limpio.m4a (palabras c4_palabras.json)."""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import F, Y0, YF, key, pop, quitar, rebote, crecer, gancho  # noqa: E402

opt, salida = B.inicio(4)
DUR = 41.4
TC = 5.45                     # fin del gancho
M = B.materiales()
M.update({
    'tubo_acero': D.liso('tubo_acero', (0.62, 0.64, 0.6), 0.55, metal=0.15),
    'interior': D.liso('interior', (0.85, 0.84, 0.8), 0.6),
    'luz': D.liso('luz', (1.0, 0.85, 0.6), 0.3, emit=0.0),
    'tanque': D.liso('tanque', (0.1, 0.35, 0.8), 0.45),
    'panel': D.liso('panel', (0.05, 0.1, 0.3), 0.15, metal=0.5),
    'bateria': D.liso('bateria', (0.15, 0.55, 0.2), 0.4),
    'filtro': D.liso('filtro', (0.55, 0.57, 0.6), 0.5, metal=0.4),
    'colchon': D.liso('colchon', (0.25, 0.4, 0.75), 0.8),
    'almohada': D.liso('almohada', (0.95, 0.95, 0.92), 0.8),
    'sofa': D.liso('sofa', (0.65, 0.2, 0.15), 0.8),
    'pantalla': D.liso('pantalla', (0.2, 0.45, 0.9), 0.2, emit=0.0),
    'led': D.liso('led', (0.1, 1.0, 0.2), 0.3, emit=3.0),
    'lata': D.liso('lata', (0.85, 0.25, 0.1), 0.35, metal=0.5),
    'caja_comida': D.liso('caja_comida', (0.75, 0.6, 0.35), 0.7),
    'grua': D.liso('grua', (0.95, 0.7, 0.05), 0.45),
    'bus': D.liso('bus', (0.98, 0.72, 0.05), 0.35),
    'wifi': D.liso('wifi', (0.3, 0.75, 1.0), 0.3, emit=3.0),
})

# ---------------- geometria base ----------------
ZC, R = -5.2, 1.7            # tubo: centro y radio
TX = 5.0                     # tubo x[-TX, TX]
ZF = ZC - 1.0                # piso interior
YIN = (R ** 2 - 1.0 ** 2) ** 0.5   # profundidad util del piso
PX0, PX1, PY1, PZ0 = -6.6, 9.4, Y0 + 2.4, -7.2
TKX, TKR = 7.9, 1.15         # tanque de agua
SH = (3.9, 4.9)              # pozo de entrada (x)
VX = -4.5                    # respiradero (x)

B.terreno(M, [(PX0, PX1, PY1, PZ0)])
B.relleno_hoyo(M, PX0, PX1, PY1, PZ0, TC, 5.9, 7.2)
B.monton(M, (-12.0, 4.5, 0.0), 5.9, 7.2, t_fin=11.9, esc=(3.0, 2.4, 1.5))
B.medida('m8', PX0 - 0.9, 0.0, PZ0 + 0.2, '8 m', M, 6.72, 7.6)

# cama de concreto (aparece al bajar el tubo)
cama = B.caja_o('cama', PX0, PX1, YF, PY1, PZ0, ZC - R, M['concreto'], (0, 0, PZ0))
gancho(cama, TC)
crecer(cama, 2, 7.3, 7.6)

# tubo (medio cilindro abierto al frente) + tapas + piso: todo en 'bunker' para bajarlo con la grua
bunker = B.raiz('bunker')
casco = B.medio_tubo('casco', R, -TX, TX, 'x', M['tubo_acero'], (0, YF, ZC), grosor=0.12, tapas=True)
piso = B.caja('piso_bunker', -TX + 0.05, TX - 0.05, YF, YF + YIN, ZF - 0.12, ZF, M['piso_int'])
luz_techo = B.caja('luz_techo', -TX + 0.4, TX - 0.4, YF + 0.05, YF + 0.35, ZC + R - 0.18, ZC + R - 0.12, M['luz'])
faja = B.caja('faja_bajo_piso', -TX, TX, YF - 0.02, YF + 0.02, ZC - R, ZF - 0.12, M['tubo_acero'])
B.hijos(bunker, [casco, piso, luz_techo, faja])
key(bunker, 'location', 0.0, (0, 0, 0), 'CONSTANT')
key(bunker, 'scale', 0.0, (1, 1, 1), 'CONSTANT')
key(bunker, 'scale', TC, (0, 0, 0), 'CONSTANT')
key(bunker, 'scale', 8.55, (1, 1, 1), 'CONSTANT')
key(bunker, 'location', 8.55, (0, 0, 10.0))
key(bunker, 'location', 10.4, (0, 0, 0.0))
key(bunker, 'location', 10.55, (0, 0, 0.15))
key(bunker, 'location', 10.7, (0, 0, 0.0))
eL = M['luz'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((0.0, 6.0), (TC, 6.0), (TC + 0.01, 0.0), (23.9, 0.0), (24.0, 7.0)):
    B.key_valor(eL, t, v)

# grua: torre, pluma y cable que baja el tubo
grua = B.raiz('grua', (-10.0, Y0 + 5.0, 0))
torre = B.caja('grua_torre', -0.4, 0.4, -0.4, 0.4, 0, 14.0, M['grua'])
pluma = B.caja('grua_pluma', -3.0, 11.6, -0.3, 0.3, 13.4, 14.0, M['grua'])
contra = B.caja('grua_contrapeso', -3.6, -2.4, -0.6, 0.6, 12.4, 13.4, M['concreto'])
cabina = B.caja('grua_cabina', 0.4, 1.4, -0.5, 0.5, 12.2, 13.3, M['blanco'])
B.hijos(grua, [torre, pluma, contra, cabina])
key(grua, 'scale', TC, (0, 0, 0), 'CONSTANT')
pop(grua, 7.62, 0.35)
quitar(grua, 11.8, 0.3)
cable = B.cilindro('cable', 0.04, 1.0, 'z', M['negro'], (0, YF + 0.8, 0))   # cuelga desde la pluma hacia abajo
cable.rotation_euler = (math.pi, 0, 0)
cable.location = (0, YF + 0.8, 13.4)
key(cable, 'scale', 8.5, (0, 0, 0), 'CONSTANT')
for t, ztubo in ((8.55, 10.0), (10.4, 0.0)):
    largo = 13.4 - (ZC + R + ztubo)
    key(cable, 'scale', t, (1, 1, largo))
key(cable, 'scale', 10.8, (1, 1, 13.4 - (ZC + R)))
key(cable, 'scale', 11.4, (1, 1, 0.01))
key(cable, 'scale', 11.45, (0, 0, 0), 'CONSTANT')
# grua relativa: la pluma apunta hacia el tubo
grua.rotation_euler = (0, 0, math.atan2((YF + 0.8) - (Y0 + 5.0), 0 - (-10.0)))
pluma.scale = (1, 1, 1)

# autobus para comparar tamano
bus = B.raiz('bus', (0, Y0 + 9.0, 0))
B.hijos(bus, [B.caja('bus_cuerpo', -5.5, 5.5, -1.25, 1.25, 0.45, 3.2, M['bus']),
              B.caja('bus_ventanas', -4.6, 5.2, -1.27, 1.27, 1.9, 2.8, M['vidrio']),
              B.caja('bus_parabrisas', 5.48, 5.53, -1.1, 1.1, 1.5, 2.9, M['vidrio'])])
for wx in (-3.6, 3.6):
    for wy in (-1.25, 1.25):
        B.hijos(bus, [B.cilindro('bus_rueda', 0.5, 0.3, 'y', M['llanta'], (wx, wy - 0.15, 0.5), verts=18)])
key(bus, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(bus, 10.55, 0.35)
quitar(bus, 11.85, 0.25)

# concreto encima del tubo + relleno de tierra (deja libre el pozo de entrada y el respiradero)
losa = B.caja_o('losa_bunker', -TX - 0.4, TX + 0.4, YF, PY1, ZC + R, ZC + R + 0.4, M['concreto'], (0, 0, ZC + R))
gancho(losa, TC)
crecer(losa, 2, 12.3, 12.75)
lados = []
for nombre, x0, x1, z0, z1 in (('izq', PX0, -TX, ZC - R, ZC + R + 0.4), ('med', TX, TKX - TKR, ZC - R, ZC + R + 0.4),
                               ('der', TKX + TKR, PX1, ZC - R, ZC + R + 0.4), ('sobre_tanque', TKX - TKR, TKX + TKR, -3.3, ZC + R + 0.4)):
    o = B.caja_o('lado_' + nombre, x0, x1, YF, PY1, z0, z1, M['relleno'], (0, 0, z0))
    gancho(o, TC)
    crecer(o, 2, 12.5, 12.95)
    lados.append(o)
ZT = ZC + R + 0.4
arriba = []
YS = Y0 + 1.25   # tras esta franja, relleno completo; adelante deja libres el respiradero y el pozo
piezas = [(PX0, PX1, YS, PY1)] + [(x0, x1, YF, YS) for x0, x1 in ((PX0, VX - 0.3), (VX + 0.3, SH[0] - 0.15), (SH[1] + 0.15, PX1))]
for i, (x0, x1, y0, y1) in enumerate(piezas):
    ti = B.caja_o(f'arriba_tierra{i}', x0, x1, y0, y1, ZT, 0.0, M['relleno'], (0, 0, ZT))
    pa = B.caja_o(f'arriba_pasto{i}', x0, x1, y0, y1, -0.08, 0.02, M['pasto'], (0, 0, -0.08))
    gancho([ti, pa], TC)
    crecer(ti, 2, 12.9, 13.25)
    crecer(pa, 2, 13.2, 13.4)
    arriba += [ti, pa]
B.medida('m3', -TX - 1.5 + 0.0, 0.0, ZT, '3 m', M, 13.84, 16.9, lado=-1, y=YF - 0.35)

# radiacion que se frena en la tierra
for i in range(9):
    x = -5.0 + i * 1.25
    f = B.flecha(f'rad{i}', 1.3, M['flecha_verde'], (x, Y0 + 0.6, 9.0), '-z', grosor=0.09)
    t0 = 15.2 + 0.08 * i
    pop(f, t0, 0.2)
    key(f, 'location', t0, (x, Y0 + 0.6, 9.0))
    key(f, 'location', t0 + 0.7, (x, Y0 + 0.6, 1.4), 'LINEAR')
    key(f, 'scale', t0 + 0.7, (1, 1, 1))
    key(f, 'scale', t0 + 0.95, (0.2, 0.2, 0.2))
    key(f, 'scale', t0 + 1.0, (0, 0, 0), 'CONSTANT')

# respiradero con filtro

resp = B.cilindro('respiradero', 0.22, 0.0 - (ZC + R) + 0.9, 'z', M['acero_claro'], (VX, YF + 0.25, ZC + R - 0.1))
gancho(resp, TC)
crecer(resp, 2, 17.6, 18.2)
hongo = B.esfera('respiradero_cap', 0.45, M['acero_claro'], (VX, YF + 0.25, 0.85), esc=(1, 1, 0.45))
gancho(hongo, TC)
pop(hongo, 18.15, 0.25, (1, 1, 0.45))
filtro = B.caja('filtro', VX - 0.45, VX + 0.45, YF + 0.05, YF + 0.75, ZC + 0.4, ZC + 1.25, M['filtro'])
B.origen(filtro, (VX, YF + 0.4, ZC + 0.8))
gancho(filtro, TC)
pop(filtro, 18.44, 0.3)
B.flujo('aire_sucio', M['flecha_gris'], (VX, YF - 0.3, 3.0), (VX, YF - 0.3, 1.3), '-z', 19.15, 19.9, n=3, grosor=0.08)
B.flujo('aire_limpio', M['flecha_azul'], (VX + 0.3, YF - 0.3, ZC + 0.4), (VX + 2.6, YF - 0.3, ZC + 0.4), 'x', 20.3, 21.4, n=3)

# tanque de agua (medio cilindro macizo azul + agua) y tubo al bunker
tanque = B.medio_tubo('tanque', TKR, ZC - R, -3.4, 'z', M['tanque'], (TKX, YF, 0), grosor=0.1, tapas=True)
agua_t = B.medio_tubo('tanque_agua', TKR - 0.12, ZC - R + 0.1, -3.9, 'z', M['agua'], (TKX, YF + 0.01, 0), solido=True)
B.origen(tanque, (TKX, YF, ZC - R))
B.origen(agua_t, (TKX, YF, ZC - R + 0.1))
gancho([tanque, agua_t], TC)
pop(tanque, 22.7, 0.35)
crecer(agua_t, 2, 22.95, 23.5)
tubo_agua = B.cilindro('tubo_agua', 0.09, TKX - TKR - TX, 'x', M['tubo'], (TX, YF + 0.2, ZF + 0.3))
gancho(tubo_agua, TC)
crecer(tubo_agua, 0, 23.0, 23.4)

# baterias + paneles solares + cable
baterias = []
for k in range(3):
    b = B.caja(f'bateria{k}', -TX + 0.15 + 0.32 * k, -TX + 0.42 + 0.32 * k, YF + 0.5, YF + 1.0, ZF, ZF + 0.55, M['bateria'])
    B.origen(b, (-TX + 0.28 + 0.32 * k, YF + 0.75, ZF))
    gancho(b, TC)
    pop(b, 24.4 + 0.1 * k, 0.25)
    baterias.append(b)
paneles = []
for k in range(3):
    p = B.raiz(f'panel{k}', (-10.5 + 1.9 * k, 2.2, 0))
    B.hijos(p, [B.caja('panel_pata', -0.05, 0.05, -0.05, 0.05, 0, 0.8, M['acero']),
                B.caja('panel_placa', -0.85, 0.85, -0.6, 0.6, 0.0, 0.05, M['panel'])])
    p.children[1].rotation_euler = (math.radians(-30), 0, 0)
    p.children[1].location = (0, 0, 0.9)
    gancho(p, TC)
    pop(p, 25.6 + 0.12 * k, 0.3)
    paneles.append(p)
cable_s = B.curva('cable_solar', [(-10.5, YF - 0.25, 0.3), (-10.5, YF - 0.25, ZC + 0.6), (-TX + 0.3, YF - 0.25, ZC + 0.6)],
                  M['negro'], 0.05)
B.trazar(cable_s, 26.4, 27.2)

# pozo de entrada con escalera y escotilla redonda
pozo = []
for nombre, x0, x1, y0, y1 in (('pozo_izq', SH[0] - 0.15, SH[0], YF, Y0 + 1.25), ('pozo_der', SH[1], SH[1] + 0.15, YF, Y0 + 1.25),
                               ('pozo_fondo', SH[0] - 0.15, SH[1] + 0.15, Y0 + 1.1, Y0 + 1.25)):
    o = B.caja_o(nombre, x0, x1, y0, y1, ZC + R - 0.1, 0.0, M['concreto'], (0, 0, ZC + R - 0.1))
    gancho(o, TC)
    crecer(o, 2, 28.2, 28.8)
    pozo.append(o)
escalera = B.raiz('escalera', (sum(SH) / 2, Y0 + 0.95, 0))
B.hijos(escalera, [B.caja('esc_lado', -0.35, -0.3, -0.03, 0.03, ZF, 0.0, M['acero_claro']),
                   B.caja('esc_lado', 0.3, 0.35, -0.03, 0.03, ZF, 0.0, M['acero_claro'])]
        + [B.caja('esc_peldano', -0.3, 0.3, -0.03, 0.03, z, z + 0.05, M['acero_claro'])
           for z in [ZF + 0.3 + 0.35 * k for k in range(int(-ZF / 0.35))]])
gancho(escalera, TC)
crecer(escalera, 2, 28.5, 28.9)
escalera.location.z = 0
tapa = B.cilindro('escotilla', 0.62, 0.08, 'z', M['acero'], (sum(SH) / 2, Y0 + 0.55, 0.0), verts=32)
asa = B.caja('escotilla_asa', -0.2, 0.2, -0.03, 0.03, 0.08, 0.14, M['acero_claro'])
asa.parent = tapa
gancho(tapa, TC)
pop(tapa, 29.1, 0.35)

# interior: cocina, bano, literas, comida, consola, tele, router
def mueble(nombre, partes, t_pop, t_rebote=None):
    r = B.raiz(nombre)
    B.hijos(r, partes)
    gancho(r, TC)
    pop(r, t_pop, 0.3)
    if t_rebote is not None:
        rebote(r, t_rebote)
    return r


# el origen de cada mueble esta en 0: escalar desde ahi lo desplaza; por eso se agrupa con origen en su base
def grupo(nombre, cx, partes_rel, t_pop, t_reb=None):
    r = B.raiz(nombre, (cx, YF, ZF))
    for p in partes_rel:
        p.parent = r
    gancho(r, TC)
    pop(r, t_pop, 0.3)
    if t_reb is not None:
        rebote(r, t_reb)
    return r


D_ = YIN - 0.1
cocina = grupo('cocina', -3.4, [
    B.caja('mesada', -0.9, 0.9, 0.55, D_, 0, 0.9, M['madera']),
    B.caja('cubierta', -0.95, 0.95, 0.5, D_, 0.9, 0.95, M['blanco']),
    B.caja('hornalla', -0.6, -0.1, 0.7, 1.1, 0.95, 0.97, M['negro']),
    B.caja('alacena', -0.9, 0.9, D_ - 0.35, D_, 1.5, 2.0, M['madera'])], 33.0, 2.74)
bano = grupo('bano', -2.0, [
    B.caja('inodoro_base', -0.22, 0.22, 0.6, 1.0, 0, 0.42, M['blanco']),
    B.caja('inodoro_tanque', -0.25, 0.25, 1.0, 1.2, 0.3, 0.8, M['blanco']),
    B.caja('lavabo', 0.35, 0.75, 0.8, 1.15, 0.75, 0.9, M['blanco'])], 33.85)
literas = grupo('literas', -0.2, [
    B.caja('lit_pata', -1.0, -0.94, 0.2, 0.26, 0, 1.75, M['acero_claro']),
    B.caja('lit_pata', 0.94, 1.0, 0.2, 0.26, 0, 1.75, M['acero_claro']),
    B.caja('lit_colchon1', -1.0, 1.0, 0.2, YIN - 0.05, 0.3, 0.5, M['colchon']),
    B.caja('lit_colchon2', -1.0, 1.0, 0.2, YIN - 0.05, 1.25, 1.45, M['colchon']),
    B.caja('lit_almohada1', -0.95, -0.55, 0.4, 1.1, 0.5, 0.62, M['almohada']),
    B.caja('lit_almohada2', -0.95, -0.55, 0.4, 1.1, 1.45, 1.57, M['almohada'])], 34.6, 3.54)
comida = grupo('comida', 1.45, [B.caja('estante', -0.45, 0.45, D_ - 0.4, D_, 0, 1.9, M['madera'])]
               + [B.cilindro('lata', 0.07, 0.16, 'z', M['lata'], (-0.32 + 0.16 * i, D_ - 0.2, 0.05 + 0.45 * j), verts=12)
                  for i in range(5) for j in range(4)]
               + [B.caja('caja', -0.4, 0.4, D_ - 0.38, D_ - 0.02, 1.85, 2.1, M['caja_comida'])], 34.2, 4.2)
consola = grupo('consola', 3.0, [
    B.caja('sofa', -0.8, 0.8, 0.15, 0.6, 0, 0.45, M['sofa']),
    B.caja('sofa_resp', -0.8, 0.8, 0.15, 0.3, 0.45, 0.8, M['sofa']),
    B.caja('mueble_tv', -0.6, 0.6, D_ - 0.35, D_, 0, 0.45, M['madera']),
    B.caja('tele', -0.55, 0.55, D_ - 0.12, D_ - 0.06, 0.6, 1.25, M['negro']),
    B.caja('tele_pantalla', -0.5, 0.5, D_ - 0.13, D_ - 0.12, 0.65, 1.2, M['pantalla']),
    B.caja('consola_caja', -0.25, 0.1, D_ - 0.3, D_ - 0.05, 0.45, 0.55, M['blanco'])], 35.95)
router = grupo('router', 3.65, [
    B.caja('router_caja', -0.15, 0.15, D_ - 0.3, D_ - 0.05, 1.3, 1.36, M['blanco']),
    B.caja('router_antena', 0.1, 0.12, D_ - 0.2, D_ - 0.18, 1.36, 1.6, M['blanco']),
    B.caja('router_led', -0.1, -0.05, D_ - 0.31, D_ - 0.3, 1.32, 1.34, M['led'])], 35.95)
ePan = M['pantalla'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
for t, v in ((0.0, 2.5), (40.4, 2.5), (40.5, 0.0)):
    B.key_valor(ePan, t, v)
eLed = M['led'].node_tree.nodes['Principled BSDF']
for t, c in ((0.0, (0.1, 1.0, 0.2, 1)), (40.4, (0.1, 1.0, 0.2, 1)), (40.45, (1.0, 0.05, 0.02, 1))):
    eLed.inputs['Base Color'].default_value = c
    eLed.inputs['Base Color'].keyframe_insert('default_value', frame=F(t))
    eLed.inputs['Emission Color'].default_value = c
    eLed.inputs['Emission Color'].keyframe_insert('default_value', frame=F(t))
for k in range(3):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.25 + 0.2 * k, minor_radius=0.025, location=(3.65, YF - 0.05, ZF + 1.6),
                                     rotation=(math.pi / 2, 0, 0))
    w = bpy.context.object
    w.data.materials.append(M['wifi'])
    key(w, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    pop(w, 39.3 + 0.15 * k, 0.25)
    quitar(w, 40.3 + 0.08 * (2 - k), 0.2)

# fin del mundo: luz roja
sol = bpy.data.objects.get('sol')

# ---------------- casa y patio ----------------
B.casa_patio(M, HX=-5.0, HY=13.0)

TOMAS = [
    (0.0, (0.0, -28.0, 4.5), (0.0, 0.0, -2.8)),
    (2.4, (-2.4, -12.5, -4.4), (-2.4, 0.0, -5.4)),
    (4.0, (-0.6, -12.0, -4.4), (-0.6, 0.0, -5.4)),
    (5.4, (0.8, -11.8, -4.4), (0.8, 0.0, -5.4), 'CORTE'),
    (5.45, (-1.0, -31.0, 3.0), (0.6, 0.0, -3.6)),
    (7.4, (-1.5, -30.0, 3.0), (0.4, 0.0, -3.6)),
    (8.2, (-7.0, -31.0, 8.0), (-2.0, 2.0, 1.5)),
    (10.0, (-6.0, -30.0, 6.5), (-1.0, 1.5, -1.0)),
    (10.6, (-4.0, -32.0, 9.5), (0.0, 4.0, 0.5)),
    (11.8, (-3.5, -31.0, 8.5), (0.0, 3.0, 0.0)),
    (12.2, (0.0, -29.0, 2.5), (0.6, 0.0, -3.4)),
    (13.7, (-4.0, -22.0, 0.5), (-5.0, 0.0, -2.2)),
    (15.0, (-1.0, -31.0, 7.0), (0.0, 2.0, 1.5)),
    (16.8, (-1.0, -30.0, 6.0), (0.0, 1.5, 1.0)),
    (17.4, (-4.5, -16.0, -0.8), (-4.0, 0.0, -2.6)),
    (21.4, (-4.0, -15.0, -1.4), (-3.4, 0.0, -3.4)),
    (22.2, (6.0, -19.0, -2.0), (7.0, 0.0, -4.6)),
    (23.7, (6.0, -18.0, -2.2), (6.5, 0.0, -4.8)),
    (24.0, (-3.2, -13.0, -4.3), (-3.6, 0.0, -5.3)),
    (25.3, (-3.4, -13.5, -4.0), (-3.8, 0.0, -5.2)),
    (25.9, (-9.0, -12.0, 4.5), (-8.6, 2.0, 0.3)),
    (27.3, (-8.6, -11.0, 4.0), (-8.6, 2.0, 0.2)),
    (27.9, (3.0, -15.0, -1.0), (4.2, 0.0, -2.6)),
    (29.4, (3.6, -14.0, -0.6), (4.4, 0.0, -2.0)),
    (30.1, (4.4, -10.0, 4.2), (4.4, -3.2, -0.4)),
    (31.4, (4.4, -9.0, 3.6), (4.4, -3.2, -0.4)),
    (32.0, (-3.4, -12.0, -4.4), (-3.4, 0.0, -5.4)),
    (33.4, (-3.0, -11.5, -4.4), (-3.0, 0.0, -5.4)),
    (34.2, (-1.4, -11.5, -4.4), (-1.4, 0.0, -5.4)),
    (35.2, (0.6, -11.5, -4.4), (0.6, 0.0, -5.4)),
    (36.4, (2.9, -11.5, -4.4), (2.9, 0.0, -5.4)),
    (37.3, (0.0, -32.0, 7.0), (0.0, 3.0, 0.0)),
    (38.9, (0.0, -31.0, 6.0), (0.0, 2.5, -0.5)),
    (39.3, (3.3, -10.5, -4.5), (3.3, 0.0, -5.2)),
    (DUR, (3.5, -9.6, -4.6), (3.5, 0.0, -5.1)),
]
B.tomas(TOMAS)
sol = B.luz()
sd = sol.data
for t, c, e in ((0.0, (1.0, 0.96, 0.9), 4.0), (37.2, (1.0, 0.96, 0.9), 4.0), (37.9, (1.0, 0.3, 0.12), 5.0)):
    sd.color = c
    sd.keyframe_insert('color', frame=F(t))
    sd.energy = e
    sd.keyframe_insert('energy', frame=F(t))
bg = bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength']
for t, v in ((0.0, 0.35), (37.2, 0.35), (37.9, 0.12)):
    B.key_valor(bg, t, v)
B.terminar(opt, salida, DUR)
