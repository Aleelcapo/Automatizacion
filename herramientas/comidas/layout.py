"""Encuadres, posiciones de tarjetas y fotos de cada país (coordenadas de pantalla 1080x1920)."""
import os, pickle, numpy as np

WORK = os.environ.get('WORK', '/home/user/Automatizacion/work')
P = 'dl/photos/'

def px_box(key):
    rings = pickle.load(open(os.path.join(WORK, 'assets', f'outline_{key}.pkl'), 'rb'))['fine']
    pts = np.concatenate(rings)
    return tuple(pts.min(0)) + tuple(pts.max(0))

# (lon, lat, ancho visible en grados): plano mundial inicial y su deriva lenta
INTRO_VIEWS = [(-22, 8, 128), (-48, -6, 104)]

NAME_Y = 1385
ARRIVE = (150, 430, 930, 1300)

COUNTRIES = {
    'ARG': dict(name='Argentina', say='Argentina', dish_word='medialunas',
                country_box=(70, 290, 465, 1295), card=(555, 300, 465, 350), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Medialunas_argentinas.jpg', focus=(0.5, 0.5)),
                        dict(file=P + 'Café_y_medialunas_en_Buenos_Aires.jpg', focus=(0.5, 0.55))]),
    'PER': dict(name='Perú', say='Perú', dish_word='bistec',
                country_box=(160, 760, 920, 1300), card=(233, 220, 614, 460), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Bisteck_a_lo_pobre_2.JPG', focus=(0.5, 0.5)),
                        dict(file=P + 'Bisteck_a_lo_pobre.JPG', focus=(0.5, 0.45))]),
    'MEX': dict(name='México', say='México', dish_word='carnitas',
                country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'CarnitasMercadodeAntojitos.JPG', focus=(0.5, 0.6)),
                        dict(file=P + 'Carnitas_in_Mexico.jpg', focus=(0.5, 0.5))]),
    'ITA': dict(name='Italia', say='Italia', dish_word='prosciutto',
                country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Prosciutto_di_Parma,_Tagliere,_Italia.jpg', focus=(0.5, 0.5)),
                        dict(file=P + 'Prosciutto_di_Parma_e_melone.jpg', focus=(0.5, 0.5))]),
    'IND': dict(name='India', say='India', dish_word='phirni',
                country_box=(170, 785, 910, 1300), card=(440, 220, 580, 435), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Firni_Or_Phirni.jpg', focus=(0.5, 0.5)),
                        dict(file=P + 'Phirni.jpg', focus=(0.5, 0.5))]),
    'JPN': dict(name='Japón', say='Japón', dish_word='shabu-shabu',
                country_box=(90, 730, 990, 1300), card=(60, 230, 540, 405), name_at=(540, NAME_Y),
                photos=[dict(file=P + 'Shabu-shabu_(6293791835).jpg', focus=(0.5, 0.5)),
                        dict(file=P + 'Shabu-shabu_Sapporo.jpg', focus=(0.5, 0.5))]),
}
for k, c in COUNTRIES.items():
    c['px_box'] = px_box(k)
    c['arrive_box'] = ARRIVE

# palabras en amarillo (comparación en minúsculas, sin puntuación)
EMPHASIS = {'tasteatlas', 'diez', 'argentina', 'medialunas', 'perú', 'bistec', 'pobre', 'méxico', 'carnitas',
            'italia', 'prosciutto', 'parma', 'india', 'phirni', 'japón', 'shabu-shabu'}
