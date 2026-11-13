"""37 — Como sabe el semaforo que llegaste (espira bajo el asfalto). Audio: .tmp_render/lote3/a11_limpio.m4a (33.6 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote  # noqa: E402

opt, salida = B.inicio(37)
DUR = 34.2
TC = 4.9
M = B.materiales()
M.update({
    'asfalto': D.pbr('asfalto', 'gravel_ground_01', tam=0.6, tinte=(0.18, 0.18, 0.19), fac=0.85, brillo=0.8),
    'base': D.pbr('base_g', 'gravel_ground_01', tam=0.9, tinte=(0.55, 0.5, 0.45), fac=0.4),
    'vereda': D.pbr('vereda', 'patterned_paving', tam=1.2, tinte=(0.7, 0.68, 0.65), fac=0.5),
    'ranura': D.liso('ranura', (0.02, 0.02, 0.02), 0.8),
    'cobre': D.liso('cobre', (0.9, 0.45, 0.15), 0.3, metal=0.8, emit=0.3),
    'campo': D.agua('campo', col=(0.3, 0.6, 1.0), alpha=0.22),
    'campo2': D.agua('campo2', col=(1.0, 0.75, 0.2), alpha=0.25),
    'auto': D.liso('auto', (0.15, 0.35, 0.75), 0.3, metal=0.4),
    'bici': D.liso('bici', (0.9, 0.2, 0.15), 0.4),
    'rojo_on': D.liso('rojo_on', (1.0, 0.08, 0.05), 0.4, emit=5.0),
    'verde_on': D.liso('verde_on', (0.2, 1.0, 0.3), 0.4, emit=5.0),
    'apagado': D.liso('apagado', (0.12, 0.12, 0.12), 0.4),
    'led': D.liso('led', (0.2, 1.0, 0.3), 0.4, emit=4.0),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
})
YL = Y0 + 2.6                     # carril
XL0, XL1 = -2.0, 3.0              # espira (x)
YE0, YE1 = Y0 - 0.2, Y0 + 4.4     # espira (y): el frente queda cortado por la cara del diorama

# ---------- calle ----------
G.frente('f_tierra', -60, 60, -50.0, -2.0, M['tierra'], 'excavated_soil_wall', fuerza=0.3, res=0.15)
D.caja('tierra', -80, 80, Y0, Y0 + 80, -50.0, -2.0, M['tierra'])
D.caja('base', -80, 80, Y0, Y0 + 7.0, -2.0, -0.6, M['base'])
cortes = []
for x in (XL0, XL1):
    cortes.append(D.caja('c_lado', x - 0.12, x + 0.12, Y0 - 1, YE1 + 0.12, -0.35, 0.2))
cortes.append(D.caja('c_fondo', XL0 - 0.12, XL1 + 0.12, YE1 - 0.12, YE1 + 0.12, -0.35, 0.2))
cortes.append(D.caja('c_salida', XL1 - 0.12, XL1 + 0.12, YE1, Y0 + 7.2, -0.35, 0.2))
asf = D.caja('asfalto', -80, 80, Y0, Y0 + 7.0, -0.6, 0.0, M['asfalto'])
for c in cortes:
    D.restar(asf, c)
D.aplicar_mods(asf)
D.caja('vereda', -80, 80, Y0 + 7.0, Y0 + 11.0, -2.0, 0.25, M['vereda'])
D.caja('cordon', -80, 80, Y0 + 6.9, Y0 + 7.1, -0.3, 0.3, M['concreto'])
D.caja('pared', -80, 80, Y0 + 11.0, Y0 + 11.5, 0.25, 9.0, M['muro'])
D.caja('linea_pare', 4.2, 4.7, Y0, Y0 + 6.9, 0.0, 0.01, M['blanco'])
for x in range(-36, -4, 4):
    D.caja('linea_carril', x, x + 2, Y0 + 5.6, Y0 + 5.75, 0.0, 0.01, M['blanco'])
# fondo de las ranuras (negro) y los cables de cobre adentro (3 vueltas)
for c in cortes:
    bb = [c.matrix_world @ v.co for v in c.data.vertices]
    x0, x1 = min(v.x for v in bb), max(v.x for v in bb)
    y0, y1 = max(Y0, min(v.y for v in bb)), max(v.y for v in bb)
    D.caja('ranura_f', x0, x1, y0, y1, -0.36, -0.34, M['ranura'])
cables = []
for k in range(3):
    z = -0.3 + 0.08 * k
    pts = [(XL0, Y0, z), (XL0, YE1, z), (XL1, YE1, z), (XL1, Y0, z)]
    cv = B.curva(f'bobina{k}', pts, M['cobre'], grosor=0.035)
    cables.append(cv)
salida_c = B.curva('salida', [(XL1, YE1, -0.25), (XL1, Y0 + 7.0, -0.25), (XL1, Y0 + 8.5, -0.25), (8.0, Y0 + 8.5, -0.25), (8.0, Y0 + 8.5, 0.6)],
                   M['cobre'], grosor=0.05)
cables.append(salida_c)

# ---------- semaforo y cajita ----------
XS = 6.0
poste = B.cilindro('poste', 0.12, 5.2, 'z', M['acero'], (XS, Y0 + 8.0, 0.25))
cabeza = D.caja('cabeza', XS - 0.45, XS + 0.45, Y0 + 7.55, Y0 + 8.0, 3.2, 5.4, M['negro'])
luces = {}
for nombre, z in (('rojo', 4.95), ('amar', 4.3), ('verde', 3.65)):
    B.esfera(nombre + '_off', 0.24, M['apagado'], (XS, Y0 + 7.55, z))
for nombre, z, m in (('rojo', 4.95, M['rojo_on']), ('verde', 3.65, M['verde_on'])):
    luces[nombre] = B.esfera(nombre + '_on', 0.26, m, (XS, Y0 + 7.53, z))
caja = D.caja('cajita', 7.4, 8.6, Y0 + 8.1, Y0 + 9.0, 0.25, 1.6, M['acero_claro'])
led = B.esfera('led', 0.12, M['led'], (8.0, Y0 + 8.08, 1.3))


def semaforo(t, verde):
    key(luces['rojo'], 'scale', t, (0, 0, 0) if verde else (1, 1, 1), 'CONSTANT')
    key(luces['verde'], 'scale', t, (1, 1, 1) if verde else (0, 0, 0), 'CONSTANT')


semaforo(0.0, False)
semaforo(3.9, True)
semaforo(TC, False)
semaforo(25.7, True)
semaforo(26.6, False)
key(led, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pop(led, 3.4, 0.2)
key(led, 'scale', TC, (0, 0, 0), 'CONSTANT')
pop(led, 22.0, 0.2)
quitar(led, 26.5, 0.1)

# ---------- campo magnetico ----------
campo = B.esfera('campo', 1.0, M['campo'], ((XL0 + XL1) / 2, (YE0 + YE1) / 2, 0.0), esc=(3.0, 2.6, 1.6))
campo2 = B.esfera('campo2', 1.0, M['campo2'], ((XL0 + XL1) / 2, (YE0 + YE1) / 2, 0.0), esc=(3.0, 2.6, 1.6))
for o in (campo, campo2):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
# gancho: campo amarillo (auto encima)
key(campo2, 'scale', 0.05, (3.0, 2.6, 1.6), 'CONSTANT')
key(campo2, 'scale', TC, (0, 0, 0), 'CONSTANT')
pop(campo, 15.2, 0.4, (3.0, 2.6, 1.6))
for k, t in enumerate((15.8, 16.3, 16.8)):
    key(campo, 'scale', t, (3.0, 2.6, 1.6) if k % 2 == 0 else (3.15, 2.75, 1.7))
key(campo, 'scale', 19.2, (3.0, 2.6, 1.6), 'CONSTANT')
key(campo, 'scale', 19.25, (0, 0, 0), 'CONSTANT')
key(campo2, 'scale', 19.2, (0, 0, 0), 'CONSTANT')
key(campo2, 'scale', 19.25, (3.0, 2.6, 1.6), 'CONSTANT')
key(campo2, 'scale', 19.6, (2.6, 2.4, 1.0))
key(campo2, 'scale', 26.5, (2.6, 2.4, 1.0), 'CONSTANT')
key(campo2, 'scale', 26.55, (0, 0, 0), 'CONSTANT')
key(campo, 'scale', 26.55, (3.0, 2.6, 1.6), 'CONSTANT')
key(campo, 'scale', 30.85, (3.0, 2.6, 1.6), 'CONSTANT')
key(campo, 'scale', 30.9, (0, 0, 0), 'CONSTANT')
key(campo2, 'scale', 30.9, (2.6, 2.4, 1.0), 'CONSTANT')
B.flujo('aviso', M['flecha_verde'], (XL1 + 0.4, YE1 + 0.4, 0.3), (XL1 + 0.4, Y0 + 7.6, 0.3), 'x', 20.4, 21.6, n=2, largo=0.7, sep=0.3)
for f in B.flujo('aviso2', M['flecha_verde'], (XL1 + 0.6, Y0 + 8.4, 0.6), (7.2, Y0 + 8.4, 0.6), 'x', 21.2, 22.0, n=2, largo=0.7, sep=0.3):
    pass
for o in cables:
    rebote(o, 10.6, 1.0, 1.0)
key(cables[0], 'scale', 0.0, (1, 1, 1), 'CONSTANT')

# ---------- auto ----------
def auto_nuevo(nombre, m, largo=4.0):
    r = B.raiz(nombre)
    L = largo / 2
    B.hijos(r, [D.caja(nombre + '_c', -L, L, -0.9, 0.9, 0.35, 1.1, m),
                D.caja(nombre + '_t', -L * 0.55, L * 0.45, -0.8, 0.8, 1.1, 1.75, M['vidrio']),
                D.caja(nombre + '_tt', -L * 0.5, L * 0.4, -0.82, 0.82, 1.7, 1.8, m)] +
            [B.cilindro(nombre + '_r', 0.38, 0.25, 'y', M['llanta'], (dx, dy, 0.38)) for dx in (-L * 0.62, L * 0.62) for dy in (-0.95, 0.7)])
    return r


auto = auto_nuevo('auto', M['auto'])
XA = (XL0 + XL1) / 2
key(auto, 'location', 0.0, (-14.0, YL, 0.0), 'LINEAR')
key(auto, 'location', 2.3, (XA, YL, 0.0))
key(auto, 'location', TC, (XA, YL, 0.0), 'CONSTANT')
key(auto, 'location', TC + 0.06, (-40.0, YL, 0.0), 'CONSTANT')
key(auto, 'location', 16.4, (-40.0, YL, 0.0))
key(auto, 'location', 18.0, (XA, YL, 0.0))
key(auto, 'location', 25.9, (XA, YL, 0.0))
key(auto, 'location', 26.5, (14.0, YL, 0.0), 'CONSTANT')
key(auto, 'location', 26.55, (60.0, YL, 0.0), 'CONSTANT')
key(auto, 'location', 30.85, (60.0, YL, 0.0), 'CONSTANT')
key(auto, 'location', 30.9, (-14.0, YL, 0.0), 'LINEAR')
key(auto, 'location', 30.9 + 2.3, (XA, YL, 0.0))

# ---------- bici ----------
bici = B.raiz('bici')
rueda = lambda x: B.cilindro('rb', 0.5, 0.06, 'y', M['negro'], (x, -0.03, 0.5))
B.hijos(bici, [rueda(-0.7), rueda(0.7), D.caja('cuadro', -0.7, 0.7, -0.04, 0.04, 0.5, 0.6, M['bici']),
               D.caja('cuadro2', -0.05, 0.05, -0.04, 0.04, 0.5, 1.1, M['bici']),
               D.caja('asiento', -0.25, 0.1, -0.1, 0.1, 1.1, 1.18, M['negro'])])
key(bici, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(bici, 'scale', 26.55, (1.4, 1.4, 1.4), 'CONSTANT')
key(bici, 'location', 26.55, (-12.0, YL, 0.0))
key(bici, 'location', 27.9, (XA, YL, 0.0))
quitar(bici, 30.7, 0.15, 1.4)
G.letrero('nada', '?', M['medida'], (XA, Y0 + 2.0, 3.0), tam=1.6, t_on=29.0, t_off=30.7)

# ---------- carteles ----------
G.letrero('cable_t', 'CABLE', M['cobre'], (XA, YF - 0.3, -1.1), tam=0.5, t_on=3.0, t_off=TC)
G.letrero('bobina_t', 'BOBINA', M['cobre'], (XA, YF - 0.3, -1.1), tam=0.55, t_on=10.6, t_off=12.6)
G.letrero('campo_t', 'CAMPO MAGNÉTICO', M['etiqueta'], (XA, Y0 + 2.0, 2.4), tam=0.55, t_on=15.3, t_off=16.9)
G.letrero('metal_t', 'METAL', M['medida'], (XA, Y0 + 2.0, 2.9), tam=0.7, t_on=19.0, t_off=20.4)
G.letrero('poco_t', 'POCO METAL', M['medida'], (XA, Y0 + 2.0, 2.6), tam=0.6, t_on=29.6, t_off=30.7)

# ---------- camara ----------
GANCHO = ((-5.0, -13.0, 6.5), (1.5, Y0 + 3.5, 0.3))
CAMPO = ((0.0, -12.0, 5.0), (0.8, Y0 + 3.0, 0.5))
TOMAS = [
    (0.0, *GANCHO),
    (TC - 0.05, (-5.4, -13.6, 6.8), (1.5, Y0 + 3.5, 0.3), 'CORTE'),
    (TC, (0.5, -9.5, 9.0), (0.5, Y0 + 3.0, 0.0)),
    (8.2, (0.5, -10.0, 9.2), (0.5, Y0 + 3.0, 0.0)),
    (8.6, (XL0, -6.0, 0.9), (XL0, Y0, -0.4)),
    (12.4, (XL0 + 0.4, -6.2, 1.0), (XL0 + 0.4, Y0, -0.3)),
    (12.9, *CAMPO),
    (16.2, (0.0, -12.5, 5.2), (0.8, Y0 + 3.0, 0.5)),
    (16.8, (1.0, -15.0, 6.0), (3.0, Y0 + 4.0, 1.0)),
    (22.4, (2.0, -15.5, 6.2), (4.0, Y0 + 5.0, 1.5)),
    (22.8, (5.5, -9.0, 4.6), (6.0, Y0 + 7.5, 3.6)),
    (26.3, (5.5, -9.5, 4.6), (6.0, Y0 + 7.5, 3.6)),
    (26.6, *CAMPO),
    (30.8, (0.0, -12.5, 5.2), (0.8, Y0 + 3.0, 0.5), 'CORTE'),
    (30.9, *GANCHO),
    (DUR, (-5.3, -13.5, 6.75), (1.5, Y0 + 3.5, 0.3)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
