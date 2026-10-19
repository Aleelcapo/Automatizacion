"""Video 2 (Japón → México → Perú → Argentina → Italia → India). Usar con GEO_LON0=60 GEO_SPAN=420.

Las longitudes de las vistas están en coordenadas extendidas (América y Europa +360°).
"""
import os, pickle, numpy as np

WORK = os.environ.get('WORK', '/home/user/Automatizacion/work/v2')
P = 'photos/'

def px_box(key):
    rings = pickle.load(open(os.path.join(WORK, 'assets', f'outline_{key}.pkl'), 'rb'))['fine']
    pts = np.concatenate(rings)
    return tuple(pts.min(0)) + tuple(pts.max(0))

# plano inicial: este de Asia y el Pacífico, deriva lenta antes de llegar a Japón
INTRO_VIEWS = [(128, 22, 118), (134, 30, 100)]

NAME_Y = 1385
ARRIVE = (150, 430, 930, 1300)

COUNTRIES = {
    'JPN': dict(name='Japón', say='Japón', dish_word='cheesecake',
                country_box=(90, 730, 990, 1300), card=(60, 230, 540, 405), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Japanese_cheese_cake_in_western.jpg', focus=(0.5, 0.5)), dict(file=P + 'Japanese_cheesecake_2_(cropped).jpg', focus=(0.5, 0.5))]),
    'MEX': dict(name='México', say='México', dish_word='sopa',
                country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Sopa_de_lima_yucateca_en_Mercado_Santa_Anita_de_Mérida_01.jpg', focus=(0.5, 0.7)), dict(file=P + 'Sopa_de_lima,_Homun,_Yucatan,_Mexico.jpg', focus=(0.5, 0.55))]),
    'PER': dict(name='Perú', say='Perú', dish_word='pan',
                country_box=(160, 760, 920, 1300), card=(233, 220, 614, 460), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Easter_Island_Bolivia_Peru_129.jpg', focus=(0.5, 0.75)), dict(file=P + 'Pan_con_Chicharrón_Jano_Loo_+_Fresa_con_Leche_de_la_Perla_de_los_Jugos.jpg', focus=(0.5, 0.6))]),
    'ARG': dict(name='Argentina', say='Argentina', dish_word='provoleta',
                country_box=(70, 290, 465, 1295), card=(555, 300, 465, 350), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'La_provoleta_dorada,_servida_en_su_punto_justo,_acompaña_a_un_clásico_del_asado_argentino_costilla_jugosa,_chorizo_y_cinchulines_bien_asados.jpg', focus=(0.5, 0.5)), dict(file=P + 'Provoleta_argentina.jpg', focus=(0.5, 0.5))]),
    'ITA': dict(name='Italia', say='Italia', dish_word='focaccia',
                country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Focaccia_Genovese_02.jpg', focus=(0.5, 0.5)), dict(file=P + 'Focaccia_on_sale_in_Genoa.JPG', focus=(0.15, 0.1), zoom=1.6)]),
    'IND': dict(name='India', say='India', dish_word='tandoori',
                country_box=(170, 785, 910, 1300), card=(440, 220, 580, 435), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Chicken_Tandoori_01.jpg', focus=(0.5, 0.5)), dict(file=P + 'Food-Tandoori-Chicken-2.jpg', focus=(0.5, 0.5))]),
}
for k, c in COUNTRIES.items():
    c['px_box'] = px_box(k)
    c['arrive_box'] = ARRIVE

# nombres de platos que se muestran completos en un solo subtítulo
PHRASES = ['cheesecake japonés', 'sopa de lima', 'pan con chicharrón', 'provoleta', 'focaccia alla genovese', 'tandoori murg']

# palabras en amarillo (comparación en minúsculas, sin puntuación)
EMPHASIS = {'japón', 'méxico', 'perú', 'argentina', 'italia', 'india', 'provoleta'}
