"""Encuadres genéricos para los seis países, configurados por video con un JSON (variable VIDEO_CFG).

El JSON lista el recorrido: [{"key": "IND", "dish": "biryani hyderabadi", "photos": [{"file": ..., "focus": [x, y]}]}, ...]
y la vista inicial "intro" [[lon, lat, ancho], [lon, lat, ancho]] en coordenadas extendidas.
"""
import os, json, pickle, numpy as np

WORK = os.environ.get('WORK')
CFG = json.load(open(os.environ['VIDEO_CFG'], encoding='utf-8'))

def px_box(key):
    rings = pickle.load(open(os.path.join(WORK, 'assets', f'outline_{key}.pkl'), 'rb'))['fine']
    pts = np.concatenate(rings)
    return tuple(pts.min(0)) + tuple(pts.max(0))

NAME_Y = 1385
ARRIVE = (150, 430, 930, 1300)
# misma composición probada en los videos anteriores: tarjeta arriba y a un lado, país abajo
BASE = {
    'JPN': dict(name='Japón', country_box=(90, 730, 990, 1300), card=(60, 230, 540, 405)),
    'MEX': dict(name='México', country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450)),
    'PER': dict(name='Perú', country_box=(160, 760, 920, 1300), card=(233, 220, 614, 460)),
    'ARG': dict(name='Argentina', country_box=(70, 290, 465, 1295), card=(555, 300, 465, 350)),
    'ITA': dict(name='Italia', country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435)),
    'IND': dict(name='India', country_box=(170, 785, 910, 1300), card=(440, 220, 580, 435)),
    'ISL': dict(name='Islandia', country_box=(130, 800, 950, 1300), card=(70, 220, 580, 435)),
    'FIN': dict(name='Finlandia', country_box=(70, 300, 470, 1300), card=(555, 330, 465, 350)),
    'GEO': dict(name='Georgia', country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450)),
    'KAZ': dict(name='Kazajistán', country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450)),
    'ETH': dict(name='Etiopía', country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435)),
    'PHL': dict(name='Filipinas', country_box=(70, 300, 520, 1300), card=(580, 330, 440, 330)),
    'KEN': dict(name='Kenia', country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435)),
    'NPL': dict(name='Nepal', country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450)),
    'KHM': dict(name='Camboya', country_box=(130, 800, 950, 1300), card=(70, 220, 580, 435)),
    'ARM': dict(name='Armenia', country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435)),
    'SWE': dict(name='Suecia', country_box=(70, 300, 470, 1300), card=(555, 330, 465, 350)),
    'SEN': dict(name='Senegal', country_box=(130, 800, 950, 1300), card=(70, 220, 580, 435)),
    'TUN': dict(name='Túnez', country_box=(70, 300, 470, 1300), card=(555, 330, 465, 350)),
    'GHA': dict(name='Ghana', country_box=(70, 300, 470, 1300), card=(555, 330, 465, 350)),
    'LAO': dict(name='Laos', country_box=(190, 775, 890, 1300), card=(70, 220, 580, 435)),
    'TJK': dict(name='Tayikistán', country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450)),
    'EST': dict(name='Estonia', country_box=(60, 810, 1020, 1295), card=(240, 220, 600, 450)),
    # Noruega en diagonal: la tarjeta va en el hueco de arriba a la izquierda
    'NOR': dict(name='Noruega', country_box=(60, 560, 1020, 1300), card=(50, 200, 430, 322)),
}

INTRO_VIEWS = [tuple(v) for v in CFG['intro']]
COUNTRIES = {}
for stop in CFG['route']:
    b = BASE[stop['key']]
    COUNTRIES[stop['key']] = dict(name=b['name'], say=b['name'], dish_word=stop['dish'].split()[0],
                                  country_box=b['country_box'], card=b['card'], name_at=(540, NAME_Y),
                                  photos=[dict(p, focus=tuple(p.get('focus', (0.5, 0.5)))) for p in stop['photos']],
                                  px_box=px_box(stop['key']), arrive_box=ARRIVE)

# nombres de platos completos en un solo subtítulo (y en amarillo); países en amarillo
PHRASES = [stop['dish'] for stop in CFG['route']]
EMPHASIS = {b['name'].lower() for b in BASE.values()}
