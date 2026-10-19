"""Proyección Mercator compartida por la preparación del mapa y el render.

GEO_LON0 / GEO_SPAN permiten una textura que pasa el antimeridiano (p. ej. 60..480) para
recorridos que cruzan el Pacífico sin saltos; por defecto cubre -180..180.
"""
import math, os
LAT_MAX = 78.0
LON0 = float(os.environ.get('GEO_LON0', '-180'))
SPAN = float(os.environ.get('GEO_SPAN', '360'))
PX_DEG = 21600 / 360
W0 = int(round(SPAN * PX_DEG))
YMAX = math.log(math.tan(math.pi / 4 + math.radians(LAT_MAX) / 2))
H0 = int(round(21600 * 2 * YMAX / (2 * math.pi)))

def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def lonlat_to_px(lon, lat):
    """Coordenadas en píxeles del mapa Mercator nivel 0 (la longitud puede pasar de 180)."""
    x = (lon - LON0) * PX_DEG
    y = (YMAX - merc(lat)) / (2 * YMAX) * H0
    return x, y
