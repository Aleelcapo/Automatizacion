"""17 — El tunel bajo el mar (Canal de la Mancha). Audio: .tmp_render/lote2/a1_limpio.m4a (45.8 s)."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
import mega_base as G  # noqa: E402
from escena_base import Y0, YF, key, pop, quitar, rebote, gancho  # noqa: E402

opt, salida = B.inicio(17)
DUR = 46.4
TC = 6.2
M = B.materiales()
M.update({
    'creta': D.pbr('creta', 'clay_plaster', tam=2.5, tinte=(0.93, 0.92, 0.88), fac=0.8, brillo=1.7),
    'marga': D.pbr('marga', 'rock_wall_08', tam=2.2, tinte=(0.36, 0.43, 0.48), fac=0.6, brillo=1.1),
    'arcilla': D.pbr('arcilla', 'brown_mud_02', tam=2.0, tinte=(0.2, 0.18, 0.17), fac=0.55),
    'arena': D.pbr('arena', 'coast_sand_01', tam=2.0, tinte=(0.75, 0.66, 0.48), fac=0.3),
    'mar': D.agua('mar', col=(0.02, 0.24, 0.42), alpha=0.5),
    'tbm': D.liso('tbm', (0.95, 0.66, 0.05), 0.4, metal=0.4),
    'cabeza': D.liso('cabeza', (0.25, 0.26, 0.28), 0.35, metal=0.9),
    'via': D.liso('via', (0.18, 0.17, 0.16), 0.8),
    'tren': D.liso('tren', (0.94, 0.94, 0.95), 0.25),
    'franja_t': D.liso('franja_t', (0.05, 0.2, 0.55), 0.3),
    'franja_a': D.liso('franja_a', (0.98, 0.75, 0.05), 0.3),
    'auto1': D.liso('auto1', (0.8, 0.08, 0.08), 0.3, metal=0.5),
    'auto2': D.liso('auto2', (0.1, 0.35, 0.8), 0.3, metal=0.5),
    'camion': D.liso('camion', (0.95, 0.95, 0.95), 0.4),
    'etiqueta': D.liso('etiqueta', (1.0, 1.0, 1.0), 0.4, emit=2.0),
    'resalte': D.liso('resalte', (1.0, 0.85, 0.1), 0.5, emit=0.6),
    'dinero': D.liso('dinero', (0.3, 1.0, 0.3), 0.4, emit=2.2),
    'roca': D.pbr('roca_tbm', 'rock_wall_08', tam=0.6, tinte=(0.36, 0.43, 0.48), fac=0.6),
})
res = M['resalte']
res.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.2
res.surface_render_method = 'BLENDED'

# ---------- medidas del corte ----------
ZT = 1.5            # tierra firme
ZM = -0.3           # superficie del mar
ZS = -2.4           # fondo del mar
ZC = -3.9           # creta -> marga
ZA = -6.9           # marga -> arcilla
ZB = -40.0          # fondo del bloque
ZTU, RT = -5.4, 0.78           # tunel
XA, XF, XN = -7.0, 7.0, 12.0   # acantilado ingles, costa francesa, escalon del corte
YN = Y0 + 6.0                  # cara del corte detras del escalon
YT = (Y0, Y0 + 1.7, Y0 + 3.4)  # tren, servicio, tren
YL = 150.0
ANG = math.radians(25)
S = (-3.0, ZTU)                                   # arranque del ramal donde enterraron la tuneladora
E = (S[0] + 4.6 * math.cos(ANG), S[1] - 4.6 * math.sin(ANG))

# cortadores: 3 tuneles a lo largo de x y el ramal inclinado
cort = [G.cil_x('c_t0', RT + 0.12, -40, XN + 0.5, YT[0], ZTU), G.cil_x('c_s', 0.55, -40, XN + 0.5, YT[1], ZTU),
        G.cil_x('c_t1', RT + 0.12, -40, XN + 0.5, YT[2], ZTU)]
ram = G.cil_x('c_ram', RT + 0.08, 0, 5.2, Y0, 0)
ram.location = (S[0] - 0.4 * math.cos(ANG), Y0, S[1] + 0.4 * math.sin(ANG))
ram.rotation_euler = (0, ANG, 0)
for c in cort + [ram]:
    c.hide_render = True
    c.hide_viewport = True
bpy.context.view_layer.update()

# capas del terreno por region (ingles, mar, frances, frances detras del escalon)
REG = [(-60, XA, Y0, YL, ZT), (XA, XF, Y0, YL, ZS), (XF, XN, Y0, YL, ZT), (XN, 60, YN, YL, ZT)]
for i, (x0, x1, y0, y1, ztop) in enumerate(REG):
    cc = cort if i < 3 else []
    G.capa(f'creta{i}', x0, x1, y0, y1, ZC, ztop, M['creta'], cc if ztop < -2 else [])
    G.capa(f'marga{i}', x0, x1, y0, y1, ZA, ZC, M['marga'], cc + ([ram] if i == 1 else []))
    G.capa(f'arcilla{i}', x0, x1, y0, y1, ZB, ZA, M['arcilla'], [ram] if i == 1 else [])
    if ztop > 0:
        D.caja(f'pasto{i}', x0, x1, y0, y1, ztop, ztop + 0.06, M['pasto'])
D.caja('arena', XA, XF, Y0, YL, ZS, ZS + 0.12, M['arena'])
D.caja('mar', XA, XF, Y0, Y0 + 0.02, ZS + 0.12, ZM, M['mar'])          # solo la cara de corte es transparente
sup = D.agua('mar_sup', col=(0.03, 0.22, 0.36), alpha=1.0)
sup.surface_render_method = 'DITHERED'
D.caja('mar_sup', XA, XF, Y0 + 0.02, YL, ZM - 0.02, ZM, sup)


def hueco_tunel(x, z):
    return abs(z - ZTU) < RT + 0.1 and x < XN + 0.2


def hueco_ramal(x, z):
    return G.segmento_cerca(x, z, S[0] - 0.3, S[1], E[0], E[1], RT + 0.05)


G.frente('f_creta_i', -20, XA, ZC, ZT, M['creta'], 'clay_plaster', fuerza=0.2)
G.frente('f_creta_m', XA, XF, ZC, ZS, M['creta'], 'clay_plaster', fuerza=0.2)
G.frente('f_creta_f', XF, XN, ZC, ZT, M['creta'], 'clay_plaster', fuerza=0.2)
def cambio(o, t, visible):
    o.hide_render = not visible
    o.keyframe_insert('hide_render', frame=1)
    o.hide_render = visible
    o.keyframe_insert('hide_render', frame=B.F(t))


T_RAM = 38.9
cambio(G.frente('f_marga', -20, XN, ZA, ZC, M['marga'], 'rock_wall_08', borrar=hueco_tunel, fuerza=0.22), T_RAM, True)
cambio(G.frente('f_marga_r', -20, XN, ZA, ZC, M['marga'], 'rock_wall_08', borrar=lambda x, z: hueco_tunel(x, z) or hueco_ramal(x, z), fuerza=0.22), T_RAM, False)
cambio(G.frente('f_arcilla', -20, XN, -18.0, ZA, M['arcilla'], 'brown_mud_02', fuerza=0.25), T_RAM, True)
cambio(G.frente('f_arcilla_r', -20, XN, -18.0, ZA, M['arcilla'], 'brown_mud_02', borrar=hueco_ramal, fuerza=0.25), T_RAM, False)
G.frente('f_arcilla_b', -20, XN, ZB, -18.0, M['arcilla'], 'brown_mud_02', fuerza=0.25, res=0.2)
G.frente('f_fondo_c', XN, 24, ZC, ZT, M['creta'], 'clay_plaster', y=YN - 0.001, fuerza=0.2)
G.frente('f_fondo_m', XN, 24, ZA, ZC, M['marga'], 'rock_wall_08', y=YN - 0.001, fuerza=0.2)
G.frente('f_fondo_a', XN, 24, ZB, ZA, M['arcilla'], 'brown_mud_02', y=YN - 0.001, fuerza=0.2)
for x0, x1, zt in ((-60, XA, ZT), (XF, XN, ZT)):
    D.caja('pasto_borde', x0, x1, Y0 - 0.06, Y0 + 0.3, zt - 0.1, zt + 0.08, M['pasto'])
D.caja('pasto_borde', XN, 60, YN - 0.06, YN + 0.3, ZT - 0.1, ZT + 0.08, M['pasto'])

# ---------- revestimiento de los tuneles ----------
def revestimiento(nombre, x0, x1, origen_x):
    tubo = B.medio_tubo(nombre, RT, x0, x1, 'x', M['concreto'], (0, Y0, ZTU), grosor=0.12)
    piso = D.caja(nombre + '_piso', x0, x1, Y0, Y0 + 0.62, ZTU - 0.62, ZTU - 0.5, M['via'])
    for o in (tubo, piso):
        B.origen(o, (origen_x, 0, 0))
    return tubo, piso


rev_i = revestimiento('rev_i', -20, 0, -20)
rev_f = revestimiento('rev_f', 0, XN, XN)
for yy, rr in ((YT[1], 0.5), (YT[2], RT)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=rr, depth=XN + 20, end_fill_type='NOTHING',
                                        location=((XN - 20) / 2, yy, ZTU), rotation=(0, math.pi / 2, 0))
    t = bpy.context.object
    t.data.materials.append(M['concreto'])
    s = t.modifiers.new('g', 'SOLIDIFY')
    s.thickness = 0.12
    D.caja('piso_t', -20, XN, yy - rr * 0.8, yy + rr * 0.8, ZTU - rr * 0.8, ZTU - rr * 0.68, M['via'])

# relleno de roca en el tubo frontal (se lo "comen" las tuneladoras)
fil_i = B.medio_tubo('fil_i', RT + 0.12, -20, 0, 'x', M['marga'], (0, Y0, ZTU), solido=True)
fil_f = B.medio_tubo('fil_f', RT + 0.12, 0, XN + 0.3, 'x', M['marga'], (0, Y0, ZTU), solido=True)
for o in (fil_i, fil_f):
    B.origen(o, (0, 0, 0))
fil_r = B.medio_tubo('fil_r', RT + 0.1, -4.9, 0, 'x', M['arcilla'], (0, Y0, 0), solido=True)
fil_r.location = (E[0], 0, E[1])
fil_r.rotation_euler = (0, ANG, 0)


# ---------- tuneladora (TBM) ----------
def tbm(nombre):
    r = B.raiz(nombre)
    partes = [B.medio_tubo(nombre + '_cuerpo', RT - 0.02, -2.6, -0.32, 'x', M['tbm'], (0, Y0, 0), solido=True),
              B.medio_tubo(nombre + '_cabeza', RT, -0.32, 0.0, 'x', M['cabeza'], (0, Y0, 0), solido=True),
              D.caja(nombre + '_motor', -1.9, -0.9, Y0 - 0.06, Y0 + 0.3, -0.25, 0.25, M['acero']),
              D.caja(nombre + '_cinta', -2.6, -0.3, Y0 - 0.04, Y0 + 0.2, -0.62, -0.5, M['negro']),
              D.caja(nombre + '_luz', -2.3, -2.1, Y0 - 0.07, Y0 + 0.1, 0.3, 0.45, M['flecha_roja']),
              D.caja(nombre + '_remolque', -5.0, -2.7, Y0 + 0.05, Y0 + 0.55, -0.45, 0.1, M['acero_claro']),
              D.caja(nombre + '_dovela', -4.6, -3.2, Y0 + 0.08, Y0 + 0.5, 0.1, 0.32, M['concreto'])]
    for k in range(6):
        a = math.radians(15 + 30 * k)
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.07, radius2=0, depth=0.16,
                                        location=(0.06, Y0 + 0.62 * math.sin(a), 0.62 * math.cos(a)), rotation=(0, math.pi / 2, 0))
        d = bpy.context.object
        d.data.materials.append(M['acero_claro'])
        partes.append(d)
    rocas = []
    for k in range(5):
        p = B.esfera(f'{nombre}_roca{k}', 0.09, M['roca'], (-0.4, Y0 - 0.02, -0.46), esc=(1.2, 0.9, 0.8))
        rocas.append(p)
    B.hijos(r, partes + rocas)
    r.location = (0, 0, ZTU)
    return r, rocas


def cinta(rocas, t0, t1, ciclo=0.8):
    for k, p in enumerate(rocas):
        t = t0 + k * ciclo / len(rocas)
        while t + ciclo <= t1:
            key(p, 'location', t, (-0.35, Y0 - 0.02, -0.46), 'LINEAR')
            key(p, 'location', t + ciclo - 0.01, (-2.55, Y0 - 0.02, -0.46), 'CONSTANT')
            t += ciclo


def avance(o, tramos, escala=(1, 1, 1)):
    """tramos [(t, x_frente)] lineales; el tubo y el relleno siguen al frente."""
    for t, x in tramos:
        key(o, 'location', t, (x, 0, ZTU), 'LINEAR')


tbm_i, rocas_i = tbm('tbm_i')
tbm_f, rocas_f = tbm('tbm_f')

# ---------- trenes ----------
def tren(nombre, vagones):
    r = B.raiz(nombre)
    z0, z1 = ZTU - 0.48, ZTU + 0.38
    y0, y1 = Y0 + 0.06, Y0 + 0.66
    partes = [D.prisma_y(nombre + '_nariz', [(-1.6, z0), (0.0, z0), (0.0, z0 + 0.25), (-0.8, z1), (-1.6, z1)], y0, y1, M['tren']),
              D.caja(nombre + '_vid', -1.15, -0.55, y0 - 0.01, y1, z1 - 0.32, z1 - 0.12, M['vidrio']),
              D.caja(nombre + '_fr', -1.6, -0.05, y0 - 0.012, y1, z0 + 0.08, z0 + 0.18, M['franja_a'])]
    x = -1.68
    for v in vagones:
        x1, x0 = x, x - 2.0
        if v == 'p':
            partes += [D.caja(nombre + '_coche', x0, x1, y0, y1, z0, z1, M['tren']),
                       D.caja(nombre + '_ven', x0 + 0.15, x1 - 0.15, y0 - 0.01, y1, z1 - 0.38, z1 - 0.18, M['vidrio']),
                       D.caja(nombre + '_fr', x0, x1, y0 - 0.012, y1, z0 + 0.08, z0 + 0.18, M['franja_t'])]
        else:
            partes += [D.caja(nombre + '_base', x0, x1, y0, y1, z0, z0 + 0.1, M['acero']),
                       D.caja(nombre + '_techo', x0, x1, y0, y1, z1 - 0.06, z1, M['acero_claro']),
                       D.caja(nombre + '_atras', x0, x1, y1 - 0.04, y1, z0, z1, M['acero_claro'])]
            if v == 'a':
                for k, mat in enumerate(('auto1', 'auto2')):
                    cx = x0 + 0.5 + k * 1.0
                    partes += [D.caja(nombre + '_auto', cx - 0.4, cx + 0.4, y0 + 0.1, y1 - 0.12, z0 + 0.14, z0 + 0.34, M[mat]),
                               D.caja(nombre + '_cab', cx - 0.25, cx + 0.15, y0 + 0.14, y1 - 0.16, z0 + 0.34, z0 + 0.5, M['vidrio'])]
            else:
                partes += [D.caja(nombre + '_cami', x0 + 0.1, x0 + 1.45, y0 + 0.08, y1 - 0.1, z0 + 0.14, z1 - 0.1, M['camion']),
                           D.caja(nombre + '_cabina', x0 + 1.5, x1 - 0.08, y0 + 0.08, y1 - 0.1, z0 + 0.14, z0 + 0.62, M['auto2'])]
        for xr in (x0 + 0.3, x1 - 0.3):
            partes.append(B.cilindro(nombre + '_rueda', 0.07, 0.04, 'y', M['negro'], (xr, y0 - 0.005, z0 - 0.02), verts=12))
        x = x0 - 0.08
    B.hijos(r, partes)
    return r


tren_p = tren('tren_p', 'pppp')
tren_c = tren('tren_c', 'paaca')


def pasada(o, t0, t1, x0, x1, ocultar=True):
    key(o, 'scale', t0 - 0.05, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', t0, (1, 1, 1), 'CONSTANT')
    key(o, 'location', t0, (x0, 0, 0), 'LINEAR')
    key(o, 'location', t1, (x1, 0, 0), 'CONSTANT')
    if ocultar:
        key(o, 'scale', t1 + 0.02, (0, 0, 0), 'CONSTANT')


key(tren_p, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(tren_c, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
pasada(tren_p, 0.05, TC, -1.5, 11.8)
pasada(tren_c, 31.35, 36.1, -12.5, 10.6)
pasada(tren_p, 43.1, DUR, -14.0, 3.0, ocultar=False)

# barco en la superficie
ferry = G.barco('ferry', M, (-4.0, Y0 + 7.0, ZM - 0.15), largo=5.0, ancho=1.5)
key(ferry, 'location', 0.0, (-4.5, Y0 + 7.0, ZM - 0.15), 'LINEAR')
key(ferry, 'location', DUR, (4.5, Y0 + 7.0, ZM - 0.15), 'LINEAR')
G.barco('carguero', M, (3.0, Y0 + 30, ZM - 0.15), largo=7.0, ancho=1.8, color=(0.1, 0.25, 0.45))

# ---------- animacion de la obra ----------
# gancho: tunel terminado; despues se oculta el revestimiento y vuelve la roca
for o in rev_i + rev_f:
    gancho(o, TC)
for o in (fil_i, fil_f):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
    key(o, 'scale', TC, (1, 1, 1), 'CONSTANT')
for o in (tbm_i, tbm_f):
    key(o, 'scale', 0.0, (0, 0, 0), 'CONSTANT')

XI = [(6.5, -10.8), (12.8, -4.0), (19.9, -4.0), (23.5, -0.06)]
XFR = [(19.9, 10.9), (23.5, 0.06)]
pop(tbm_i, 6.45, 0.3)
avance(tbm_i, XI)
key(tbm_f, 'scale', 19.75, (0, 0, 0), 'CONSTANT')
key(tbm_f, 'scale', 19.9, (0, 0, 0))
key(tbm_f, 'scale', 20.15, (-1.12, 1.12, 1.12))
key(tbm_f, 'scale', 20.3, (-1, 1, 1), 'CONSTANT')
avance(tbm_f, XFR)
for t, x in XI:
    key(fil_i, 'scale', t, ((0 - x) / 20, 1, 1), 'LINEAR')
    key(rev_i[0], 'scale', t, ((x + 20) / 20, 1, 1), 'LINEAR')
    key(rev_i[1], 'scale', t, ((x + 20) / 20, 1, 1), 'LINEAR')
for t, x in XFR:
    key(fil_f, 'scale', t, (x / (XN + 0.3), 1, 1), 'LINEAR')
    key(rev_f[0], 'scale', t, ((XN - x) / XN, 1, 1), 'LINEAR')
    key(rev_f[1], 'scale', t, ((XN - x) / XN, 1, 1), 'LINEAR')
key(fil_i, 'scale', 23.6, (0, 0, 0), 'CONSTANT')
key(fil_f, 'scale', 23.6, (0, 0, 0), 'CONSTANT')
cinta(rocas_i, 6.6, 12.8)
cinta(rocas_i, 19.9, 23.5)
cinta(rocas_f, 20.2, 23.5)
rebote(tbm_i, 23.5, 1.0, 1.06)
key(tbm_i, 'location', 25.8, (XI[-1][1], 0, ZTU), 'CONSTANT')
quitar(tbm_f, 25.8, 0.2, (-1, 1, 1))

# la tuneladora inglesa se desvia hacia abajo y queda enterrada
key(tbm_i, 'scale', 25.8, (1, 1, 1))
key(tbm_i, 'scale', 26.0, (0, 0, 0), 'CONSTANT')
key(tbm_i, 'location', 26.0, (S[0], 0, ZTU), 'CONSTANT')
key(tbm_i, 'rotation_euler', 26.0, (0, 0, 0), 'CONSTANT')
pop(tbm_i, 36.35, 0.3)
key(tbm_i, 'location', 38.9, (S[0], 0, S[1]), 'LINEAR')
key(tbm_i, 'rotation_euler', 38.9, (0, 0, 0))
key(tbm_i, 'rotation_euler', 39.5, (0, ANG, 0))
key(tbm_i, 'location', 40.4, (E[0], 0, E[1]), 'CONSTANT')
L_RAM = 4.9
cambio(fil_r, T_RAM - 0.05, False)
key(fil_r, 'scale', 0.0, (1, 1, 1), 'LINEAR')
key(fil_r, 'scale', 38.9, (1, 1, 1), 'LINEAR')
key(fil_r, 'scale', 40.4, (0.0, 1, 1), 'CONSTANT')
cinta(rocas_i, 38.9, 40.4, 0.5)
tapon = B.medio_tubo('tapon', RT + 0.1, 0, 2.2, 'x', M['relleno'], (0, Y0, 0), solido=True)
tapon.location = (S[0] - 0.3 * math.cos(ANG), 0, S[1] + 0.3 * math.sin(ANG))
tapon.rotation_euler = (0, ANG, 0)
key(tapon, 'scale', 0.0, (0, 0, 0), 'CONSTANT')
key(tapon, 'scale', 40.45, (0, 1, 1))
key(tapon, 'scale', 41.3, (1, 1, 1))
plata = G.letrero('plata', '$$$', M['dinero'], (E[0] + 0.3, YF - 0.5, E[1] + 1.4), tam=0.9, t_on=42.55, t_off=43.25)

# ---------- etiquetas ----------
G.letrero('ingl', 'INGLATERRA', M['etiqueta'], (-10.5, Y0 + 14, ZT + 1.9), tam=2.0, t_on=4.75, t_off=TC - 0.15)
G.letrero('fran', 'FRANCIA', M['etiqueta'], (10.0, Y0 + 14, ZT + 1.9), tam=2.0, t_on=5.55, t_off=TC - 0.15)
G.letrero('min35', '35 MIN', M['medida'], (-0.5, YF - 0.4, ZTU + 1.75), tam=1.4, t_on=2.65, t_off=TC - 0.15)
G.letrero('x11', 'x11', M['medida'], (-8.2, YF - 0.4, ZTU + 1.5), tam=1.1, t_on=7.3, t_off=9.6)
B.medida('m40', -3.6, ZS, ZTU + RT + 0.1, '40 m', M, 13.85, 16.9, lado=-1)
banda = D.caja('banda', -20, XN, YF - 0.5, YF - 0.46, ZA, ZC, res)
pop(banda, 16.6, 0.3)
quitar(banda, 19.5, 0.25)
G.letrero('roca_bl', 'ROCA BLANDA', M['medida'], (-10.0, YF - 0.55, ZC + 0.55), tam=0.6, t_on=17.3, t_off=19.5)
for x in (-4.5, -1.0, 2.5, 5.5):
    B.flujo(f'gota{x}', M['flecha_azul'], (x, YF - 0.5, ZS - 0.1), (x, YF - 0.5, ZC + 0.6), '-z', 17.9, 18.9, n=2, largo=0.6, sep=0.35)
G.letrero('menos1', '< 1 m', M['medida'], (0.0, YF - 0.45, ZTU + 1.55), tam=1.0, t_on=24.75, t_off=25.8)
rot_x = (math.pi / 2, 0, math.pi / 2)
G.letrero('l_t0', 'TREN', M['etiqueta'], (XN + 0.08, YT[0] + 0.45, ZTU + 1.25), tam=0.42, t_on=27.5, t_off=31.2, rot=rot_x)
G.letrero('l_t1', 'TREN', M['etiqueta'], (XN + 0.08, YT[2], ZTU + 1.25), tam=0.42, t_on=27.9, t_off=31.2, rot=rot_x)
G.letrero('l_s', 'SERVICIO', M['medida'], (XN + 0.08, YT[1], ZTU - 1.05), tam=0.36, t_on=29.2, t_off=31.2, rot=rot_x)
lt = bpy.data.lights.new('luz_fin', 'AREA')
lt.energy = 300
lt.size = 3
ol = D.link(bpy.data.objects.new('luz_fin', lt))
ol.location = (XN + 4, Y0 + 2, ZTU)
ol.rotation_euler = (0, -math.pi / 2, 0)

# ---------- camara ----------
TOMAS = [
    (0.0, (-1.0, -13.0, -3.0), (-0.5, Y0, -3.4)),
    (1.6, (-1.5, -15.0, -2.4), (-0.5, Y0, -3.4)),
    (4.2, (-2.0, -21.0, 3.5), (0, 1.5, -4.0)),
    (6.0, (-2.5, -23.0, 4.5), (0, 2.0, -4.0), 'CORTE'),
    (TC, (-13.5, -11.5, -2.8), (-9.5, Y0, -5.4)),
    (12.8, (-7.5, -11.5, -3.0), (-5.0, Y0, -5.4)),
    (13.6, (-5.0, -18.0, -1.2), (-3.5, Y0, -4.2)),
    (16.3, (-4.0, -19.0, -1.4), (-3.0, Y0, -4.4)),
    (17.0, (-2.0, -23.0, -1.8), (-2.0, Y0, -4.8)),
    (19.6, (-1.5, -22.0, -2.0), (-1.5, Y0, -4.9)),
    (20.4, (2.5, -21.0, -3.0), (2.5, Y0, -5.2)),
    (23.0, (0.5, -13.0, -4.0), (0.0, Y0, -5.3)),
    (25.75, (0.2, -11.5, -4.3), (0.0, Y0, -5.3), 'CORTE'),
    (25.9, (17.2, Y0 - 3.4, -3.6), (XN, Y0 + 1.9, ZTU)),
    (31.2, (16.4, Y0 - 2.8, -4.0), (XN, Y0 + 1.9, ZTU), 'CORTE'),
    (31.35, (-8.0, -12.0, -4.0), (-6.5, Y0, -5.4)),
    (36.0, (5.0, -12.0, -4.0), (6.5, Y0, -5.4), 'CORTE'),
    (36.15, (-1.5, -12.5, -4.4), (-1.0, Y0, -6.2)),
    (42.9, (-0.5, -11.0, -4.8), (-0.5, Y0, -6.3), 'CORTE'),
    (43.05, (-1.5, -16.0, 0.0), (-0.5, Y0, -3.8)),
    (DUR, (-2.5, -23.0, 4.5), (0, 2.0, -4.0)),
]
B.tomas(TOMAS)
B.luz()
B.terminar(opt, salida, DUR)
