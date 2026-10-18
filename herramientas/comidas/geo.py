"""Proyección Mercator compartida por la preparación del mapa y el render."""
import math
LAT_MAX = 78.0
W0 = 21600
YMAX = math.log(math.tan(math.pi / 4 + math.radians(LAT_MAX) / 2))
H0 = int(round(W0 * 2 * YMAX / (2 * math.pi)))

def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def lonlat_to_px(lon, lat, w=W0):
    """Coordenadas en píxeles del mapa Mercator nivel 0 (escaladas a ancho w)."""
    x = (lon + 180) / 360 * w
    y = (YMAX - merc(lat)) / (2 * YMAX) * (w * H0 / W0)
    return x, y
