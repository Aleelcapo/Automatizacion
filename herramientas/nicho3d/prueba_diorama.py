"""Cuadro de prueba del estilo diorama: alberca terminada, cortada al frente.

blender -b -P prueba_diorama.py -- SALIDA.png [--res 1080] [--muestras 24]
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402

arg = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['prueba.png']
opt = {arg[i]: arg[i + 1] for i in range(1, len(arg) - 1, 2)}
salida = arg[0]

bpy.ops.wm.read_factory_settings(use_empty=True)

M = {
    'pasto': D.pasto(),
    'tierra': D.pbr('tierra', 'excavated_soil_wall', tam=2.2, tinte=(0.42, 0.24, 0.12), fac=0.25, oscurecer=(0.0, -9.0, 0.5)),
    'tierra_fondo': D.pbr('tierra_fondo', 'brown_mud_rocks_01', tam=2.5, tinte=(0.40, 0.24, 0.12), fac=0.3),
    'concreto': D.pbr('concreto', 'smooth_concrete_floor', tam=2.0, brillo=1.1),
    'azulejo': D.pbr('azulejo', 'blue_floor_tiles_01', tam=1.2, tinte=(0.10, 0.55, 0.75), fac=0.7, brillo=1.0),
    'borde': D.pbr('borde', 'white_sandstone_blocks_02', tam=1.0, brillo=1.15),
    'piso': D.pbr('piso', 'patterned_paving', tam=1.6, tinte=(0.78, 0.62, 0.52), fac=0.35),
    'agua': D.agua(),
    'muro': D.pbr('muro', 'plastered_wall_04', tam=3.0, tinte=(0.93, 0.78, 0.6), fac=0.85, brillo=1.25),
    'zocalo': D.pbr('zocalo', 'rough_concrete', tam=1.5, tinte=(0.55, 0.5, 0.48), fac=0.3),
    'teja': D.pbr('teja', 'clay_roof_tiles_02', tam=2.0, tinte=(0.55, 0.22, 0.14), fac=0.3),
    'marco': D.liso('marco', (0.92, 0.9, 0.86), 0.45),
    'postigo': D.liso('postigo', (0.17, 0.3, 0.45), 0.5),
    'vidrio': D.liso('vidrio', (0.12, 0.17, 0.24), 0.08, metal=0.3),
    'tubo': D.liso('tubo', (0.93, 0.93, 0.92), 0.35),
}

# --- terreno: bloque con el hueco de la alberca, cortado al frente en y = Y0 ---
Y0 = -4.0
PX0, PX1, PY1 = -3.8, 3.8, 5.0          # hueco de la alberca (incluye el muro de concreto)
HONDO, BAJO = -2.7, -1.5                # fondo lado hondo (x>0) y lado bajo (x<0)
T = 0.28                                # espesor del concreto
suelo = D.caja('suelo', -40, 40, Y0, 90, -30.0, 0.0)
suelo.data.materials.append(M['tierra'])
suelo.data.materials.append(M['pasto'])
perfil_hueco = [(PX0, 0.5), (PX0, BAJO - T), (-0.6, BAJO - T), (1.4, HONDO - T), (PX1, HONDO - T), (PX1, 0.5)]
cortador = D.prisma_y('hueco', perfil_hueco, Y0 - 1, PY1)
D.restar(suelo, cortador)
D.aplicar_mods(suelo)
D.por_normal(suelo, lambda n, c: 1 if (n.z > 0.9 and c.z > -0.01) else 0)

# cara de corte frontal con relieve real (con hueco donde va la alberca)
frente = D.cara_relieve('frente', -14, 14, -16.0, 0.0, Y0 - 0.001, M['tierra'], fuerza=0.32)
corte_frente = D.prisma_y('hueco_frente', perfil_hueco, Y0 - 2, Y0 + 1)
D.aplicar_mods(frente)
D.restar(frente, corte_frente)
D.aplicar_mods(frente)
# pasto: un poco de borde con espesor encima del corte
for a, b in ((-40, PX0), (PX1, 40)):
    D.caja('pasto_borde', a, b, Y0 - 0.06, Y0 + 0.4, -0.12, 0.02, M['pasto'])

# --- alberca: casco de concreto, azulejo interior, borde, agua ---
ext = [(PX0, 0.0), (PX0, BAJO - T), (-0.6, BAJO - T), (1.4, HONDO - T), (PX1, HONDO - T), (PX1, 0.0)]
inn = [(PX0 + T, 0.0), (PX0 + T, BAJO), (-0.6, BAJO), (1.4, HONDO), (PX1 - T, HONDO), (PX1 - T, 0.0)]
casco = D.prisma_y('casco', ext, Y0, PY1, M['concreto'])
hueco_in = D.prisma_y('casco_in', [(PX0 + T, 1.0)] + inn[1:-1] + [(PX1 - T, 1.0)], Y0 - 1, PY1 - T)
D.restar(casco, hueco_in)
D.aplicar_mods(casco)
casco.data.materials.append(M['azulejo'])
D.por_normal(casco, lambda n, c: 1 if (c.y > Y0 + 0.01 and abs(c.x) < PX1 - T + 0.01 and c.z > HONDO - 0.01
                                          and c.y < PY1 - T + 0.01) else 0)
# borde de piedra
for x0, x1, y0, y1 in ((PX0 - 0.35, PX1 + 0.35, PY1 - T, PY1 + 0.35), (PX0 - 0.35, PX0 + T, Y0, PY1),
                       (PX1 - T, PX1 + 0.35, Y0, PY1)):
    D.caja('borde', x0, x1, y0, y1, -0.02, 0.1, M['borde'])
agua_perf = [(PX0 + T, -0.22), (PX0 + T, BAJO), (-0.6, BAJO), (1.4, HONDO), (PX1 - T, HONDO), (PX1 - T, -0.22)]
agua = D.prisma_y('agua', agua_perf, Y0 + 0.002, PY1 - T - 0.002, M['agua'])

# tubo de retorno que sale por el corte frontal hacia la bomba
tubo = D.caja('tubo_h', PX1 - 0.3, 7.0, Y0 + 0.15, Y0 + 0.45, HONDO - 0.6, HONDO - 0.3, M['tubo'])
D.caja('tubo_v', 6.7, 7.0, Y0 + 0.15, Y0 + 0.45, HONDO - 0.6, 0.15, M['tubo'])

# --- patio y casa ---
D.caja('terraza', -7.5, 7.5, 12.0, 16.1, 0.0, 0.08, M['piso'])
D.caja('andador', PX0 - 0.35, PX1 + 0.35, PY1 + 0.35, 6.8, 0.0, 0.05, M['piso'])
D.casa(M, y0=16.0)
for nombre, loc, rz, s in (
        ('outdoor_table_chair_set_01', (-4.0, 13.6, 0.08), 0.3, 1.0),
        ('plastic_monobloc_chair_01', (2.6, 6.2, 0.05), math.pi + 0.4, 1.0),
        ('plastic_monobloc_chair_01', (4.4, 6.0, 0.05), math.pi - 0.3, 1.0),
        ('potted_plant_02', (-2.6, 15.6, 0.08), 0, 1.3),
        ('potted_plant_02', (2.6, 15.6, 0.08), 0, 1.3),
        ('planter_pot_clay', (6.6, 13.0, 0.08), 0, 1.4),
        ('shrub_04', (-7.8, 15.4, 0), 0, 1.6),
        ('shrub_02', (8.2, 15.2, 0), 1.0, 1.7),
        ('shrub_04', (-9.5, 8.0, 0), 0.5, 1.5),
        ('garden_hose_wall_mounted_01', (5.2, 15.95, 0.6), math.pi, 1.0),
        ('wooden_ladder', (PX1 - 0.6, Y0 + 2.5, -1.0), math.pi / 2, 0.8),
):
    if '--sin_modelos' in arg:
        break
    try:
        D.modelo(nombre, loc, rz, s)
    except Exception as e:  # un modelo que falle no tumba la prueba
        print('MODELO_FALLO', nombre, e)

# casas vecinas y barda al fondo
D.caja('barda', -40, 40, 27, 27.15, 0, 1.8, M['zocalo'])
for i, xv in enumerate(() if '--sin_modelos' in arg else (-14, -10.5, 10.5, 14, -18, 18)):
    D.modelo('shrub_0%d' % (2, 4)[i % 2], (xv, 25.5 - (i % 2), 0), i * 0.7, 2.4)
for xv in (() if '--sin_modelos' in arg else (-12.0, 13.5, -20, 21)):
    D.arbol((xv, 28.0, 0), alto=7.5, semilla=int(xv))
if '--sin_modelos' not in arg:
    D.arbol((11.5, 10.0, 0), alto=6.0, semilla=3)

D.luz_dia('nishita', fuerza_cielo=0.35, sol=4.0, az=-40, el=45)
D.eevee(int(opt.get('--res', 1080)), int(opt.get('--muestras', 24)))
D.camara((-5.5, -11.5, 8.2), (0.8, 3.0, -2.6), lente=26)

sc = bpy.context.scene
if '--sin_rt' in arg:
    sc.eevee.use_raytracing = False
if '--sin_relieve' in arg:
    frente.modifiers.clear()
sc.render.filepath = salida
import time
for i in range(int(opt.get('--veces', 1))):
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print('T', i, round(time.time() - t, 1))
print('LISTO', salida)
