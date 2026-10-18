"""Reproyecta Blue Marble a Mercator, aplica el etalonaje oscuro de la referencia y genera una pirámide."""
import sys, os, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
import shapefile
sys.path.insert(0, os.path.dirname(__file__))
from geo import W0, H0, YMAX, lonlat_to_px
Image.MAX_IMAGE_PIXELS = None
src, shp, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)

eq = np.asarray(Image.open(src).convert('RGB'))          # 10800 x 21600, equirectangular
He = eq.shape[0]
# fila Mercator -> latitud -> fila equirectangular
ys = (np.arange(H0) + 0.5) / H0
merc_y = YMAX - ys * 2 * YMAX
lat = np.degrees(2 * np.arctan(np.exp(merc_y)) - np.pi / 2)
rows = np.clip(((90 - lat) / 180 * He).astype(int), 0, He - 1)

# máscara de tierra (Natural Earth) rasterizada en Mercator
mask = Image.new('L', (W0, H0), 0); d = ImageDraw.Draw(mask)
for sr in shapefile.Reader(shp).iterShapeRecords():
    pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
    for a, b in zip(parts[:-1], parts[1:]):
        ring = [lonlat_to_px(x, max(min(y, 85), -85)) for x, y in pts[a:b]]
        if len(ring) > 2: d.polygon(ring, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(3))
m_all = np.asarray(mask, dtype=np.float32) / 255

res = np.empty((H0, W0, 3), np.uint8)
for y0 in range(0, H0, 1024):
    y1 = min(H0, y0 + 1024)
    c = eq[rows[y0:y1]].astype(np.float32) / 255
    m = m_all[y0:y1, :, None]
    # océano: muy oscuro, azul petróleo, conservando la textura batimétrica
    b = np.clip(c[..., 2:3] - 0.08, 0, 0.6)
    ocean = np.array([0.030, 0.072, 0.090], np.float32) + b * np.array([0.10, 0.24, 0.28], np.float32)
    # tierra: algo desaturada, más contraste y un poco más oscura (cinematográfico)
    g = c.mean(axis=2, keepdims=True)
    land = g + (c - g) * 0.78
    land = np.clip((land - 0.04) * 1.12, 0, 1) ** 1.12 * 0.86
    land = land * np.array([1.0, 1.0, 0.94], np.float32)
    o = ocean * (1 - m) + land * m
    res[y0:y1] = (np.clip(o, 0, 1) * 255 + 0.5).astype(np.uint8)
    print(y0, flush=True)
img = Image.fromarray(res); del res
img.save(os.path.join(out, 'L0.png'), compress_level=1)
for k in range(1, 5):
    img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    img.save(os.path.join(out, f'L{k}.png'), compress_level=1)
img.save(os.path.join(out, 'preview.jpg'), quality=88)
print('hecho', W0, H0)
