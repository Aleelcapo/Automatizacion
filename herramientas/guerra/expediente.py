"""Estilo "Expediente militar": collage de papel recortado + textura de impresión, paleta militar, cámara siempre en movimiento.

Video de prueba: "La guerra más corta de la historia" (Zanzíbar, 27 de agosto de 1896), sin voz.
Uso: expediente.py <dir_trabajo> <salida.mp4> [--workers 4] [--only 1,5.5]

Biblia de estilo (todo el video la respeta):
- Paleta: verde oliva (fondo) #3d4422 / #565f2f, caqui #b9a77a, arena #d9c99e, papel #efe4c8, tinta #1f1d18,
  rojo óxido #a8352b (alarmas, sellos), acero #6f7c80, mar gris azulado #3e5a66, latón #c8a050.
- Material: cada objeto es un recorte de papel con borde irregular, grano de papel, borde claro de corte y sombra
  suave proyectada (las capas "flotan" a distintas alturas). Fondo de cartón con tramas de impresión.
- Texto: tiras de papel con letra de máquina de escribir (mono), aparecen letra por letra; la palabra clave en rojo.
- Movimiento: la cámara nunca se queda quieta (empuje lento + leve deriva y rotación); paralaje por capas;
  todo entra con rebote, los sellos golpean con sacudida, el mar se mueve, el humo sube, las banderas flamean.
"""
import os, sys, math, argparse, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import shapefile

W, H, FPS = 1080, 1920, 30
ROOT = os.environ.get('GUERRA_WORK', '/home/user/Automatizacion/work/guerra')
FONTS = os.path.join(ROOT, 'dl/font')
DUR = 30.0

OLIVE_D, OLIVE, KHAKI, SAND = (61, 68, 34), (86, 95, 47), (185, 167, 122), (217, 201, 158)
PAPER, INK, RUST = (239, 228, 200), (31, 29, 24), (168, 53, 43)
STEEL, STEEL_D, SEA, BRASS = (111, 124, 128), (70, 80, 84), (62, 90, 102), (200, 160, 80)

def font(size, kind='mono'):
    f = {'mono': 'IBMPlexMono-Bold.ttf', 'head': 'ArchivoBlack-Regular.ttf'}[kind]
    return ImageFont.truetype(os.path.join(FONTS, f), size)

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, t0, d): return clamp((t - t0) / d)
def ease(x): return 1 - (1 - clamp(x)) ** 3
def sstep(x): x = clamp(x); return x * x * (3 - 2 * x)
def back(x, s=2.0): x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s)
def wobble(t, f=0.7, a=1.0, ph=0.0): return a * math.sin(2 * math.pi * f * t + ph)

RNG = np.random.default_rng(11)
GRAIN = None  # textura de papel compartida (gris centrado en 0)

def init():
    global GRAIN
    g = RNG.normal(0, 1, (H, W)).astype(np.float32)
    g = np.asarray(Image.fromarray(((g * 18) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), np.float32) - 128
    fib = np.asarray(Image.fromarray((RNG.random((H // 4, W // 4)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6)), np.float32) - 128
    GRAIN = g * 0.9 + fib * 0.12

# ---------------------------------------------------------------- recortes de papel
def rough(pts, amp=2.5, seed=0):
    """borde irregular: subdivide y desplaza un poco cada punto (corte con tijera)"""
    r = np.random.default_rng(seed); out = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / 14))
        for k in range(n):
            u = k / n; out.append((x0 + (x1 - x0) * u + r.normal(0, amp), y0 + (y1 - y0) * u + r.normal(0, amp)))
    return out

_cache = {}
def cutout(key, w, h, draw, edge=(255, 250, 235), seed=0):
    """sprite RGBA de papel recortado: `draw(d)` dibuja la silueta en una máscara y el color en otra.
    Devuelve (sprite con grano y borde claro, sombra)."""
    if key in _cache: return _cache[key]
    pad = 40
    col = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0)); m = Image.new('L', col.size, 0)
    draw(ImageDraw.Draw(col), ImageDraw.Draw(m), pad)
    a = np.asarray(col).astype(np.float32)
    gy, gx = RNG.integers(0, H - col.height), RNG.integers(0, W - col.width)
    a[..., :3] += GRAIN[gy:gy + col.height, gx:gx + col.width, None] * 0.55
    # borde claro del corte (1–2 px) y leve oscurecido interior
    mm = m.filter(ImageFilter.MinFilter(5))
    rim = np.asarray(ImageChops.subtract(m, mm), np.float32)[..., None] / 255
    a[..., :3] = a[..., :3] * (1 - rim * 0.7) + np.array(edge, np.float32) * rim * 0.7
    a[..., 3] = np.asarray(m, np.float32)
    spr = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    sh = Image.new('RGBA', spr.size, (14, 12, 6, 0)); sh.putalpha(m.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * 0.55)))
    _cache[key] = (spr, sh)
    return spr, sh

def place(img, sprite, cx, cy, scale=1.0, rot=0.0, lift=10, alpha=1.0, cam=None, depth=1.0):
    """pega un recorte con su sombra; `lift` = altura del papel (más alto, sombra más corrida); `cam` aplica paralaje"""
    spr, sh = sprite
    if cam:
        cx, cy, scale = cam.apply(cx, cy, scale, depth); rot += cam.rot * depth
    if scale <= 0.01 or alpha <= 0.01: return
    def tf(im):
        if abs(scale - 1) > 1e-3: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
        if abs(rot) > 0.05: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
        if alpha < 1:
            a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * alpha).astype(np.uint8); im = Image.fromarray(a)
        return im
    s2, h2 = tf(spr), tf(sh)
    off = lift * scale
    img.alpha_composite(h2, (int(cx - h2.width / 2 + off * 0.6), int(cy - h2.height / 2 + off)))
    img.alpha_composite(s2, (int(cx - s2.width / 2), int(cy - s2.height / 2)))

class Cam:
    """cámara 2D: centro, zoom y giro; la profundidad escala el movimiento (paralaje)"""
    def __init__(self, x=W / 2, y=H / 2, z=1.0, rot=0.0, shake=(0, 0)):
        self.x, self.y, self.z, self.rot, self.sh = x, y, z, rot, shake
    def apply(self, x, y, s, depth):
        z = 1 + (self.z - 1) * depth
        return (W / 2 + (x - self.x) * z * depth + (x - W / 2) * (1 - depth) + self.sh[0] * depth,
                H / 2 + (y - self.y) * z * depth + (y - H / 2) * (1 - depth) + self.sh[1] * depth, s * z)

def shake_at(t, hits, amp=16, dur=0.3):
    """sacudida: cambia de signo cada cuadro y se apaga"""
    sx = sy = 0.0
    for h in hits:
        if h <= t < h + dur:
            f = int((t - h) * FPS); k = (1 - (t - h) / dur) * amp
            sx += (1 if f % 2 else -1) * k; sy += (1 if f % 3 else -1) * k * 0.6
    return sx, sy

# ---------------------------------------------------------------- fondo: mesa de cartón oliva con tramas
def background(t, cam):
    base = np.zeros((H, W, 3), np.float32) + np.array(OLIVE, np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    v = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    base = base * (1.12 - 0.75 * v[..., None]) + GRAIN[..., None] * 0.9
    img = Image.fromarray(base.clip(0, 255).astype(np.uint8)).convert('RGBA')
    # retícula táctica tenue que se mueve con la cámara (profundidad baja)
    d = ImageDraw.Draw(img); step = 120
    ox, oy = (-(cam.x - W / 2) * 0.25) % step, (-(cam.y - H / 2) * 0.25) % step
    for x in np.arange(ox - step, W + step, step): d.line([x, 0, x, H], fill=(110, 120, 66, 255), width=2)
    for y in np.arange(oy - step, H + step, step): d.line([0, y, W, y], fill=(110, 120, 66, 255), width=2)
    return img

def overlay_print(img, t):
    """textura de impresión (trama de puntos muy suave) + parpadeo leve de la exposición, como película de archivo"""
    a = np.asarray(img).astype(np.float32)
    flick = 1 + 0.025 * math.sin(t * 23.0) + 0.015 * math.sin(t * 7.3)
    a[..., :3] *= flick
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

# ---------------------------------------------------------------- tiras de texto (máquina de escribir)
def strip(img, t, t0, text, key=None, y=230, size=50, col_key=RUST, cps=26, rot=-1.5, width=None):
    """tira de papel que entra deslizándose; el texto se tipea letra por letra"""
    if t < t0: return
    f = font(size); d0 = ImageDraw.Draw(img)
    lines = text.split('\n'); tw = max(d0.textlength(l, font=f) for l in lines)
    w = int(width or tw + 70); h = int(len(lines) * size * 1.3 + 40)
    k = back(prog(t, t0, 0.35))
    spr = cutout(('strip', text, size), w, h, lambda dc, dm, p: (dc.polygon(rough([(p, p), (p + w, p), (p + w, p + h), (p, p + h)], 2, 3), fill=PAPER), dm.polygon(rough([(p, p), (p + w, p), (p + w, p + h), (p, p + h)], 2, 3), fill=255)), seed=3)
    layer = Image.new('RGBA', spr[0].size, (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    n = int((t - t0 - 0.15) * cps)
    shown = 0
    for li, line in enumerate(lines):
        x = 40 + 35; yy = 40 + 20 + li * size * 1.3
        for word in line.split(' '):
            for ch in word:
                if shown >= n: break
                c = col_key if key and word.strip('¿?.,:') in key else INK
                ld.text((x, yy), ch, font=f, fill=c); x += d0.textlength(ch, font=f); shown += 1
            x += d0.textlength(' ', font=f); shown += 1
    # cursor que parpadea mientras escribe
    if n < len(text) and int(t * 4) % 2 == 0: ld.rectangle([x - 6, yy + 4, x + 4, yy + size + 6], fill=INK)
    spr2 = (Image.alpha_composite(spr[0], layer), spr[1])
    place(img, spr2, W / 2 + (1 - k) * -700, y, rot=rot + wobble(t, 0.3, 0.6), lift=14)

def stamp(img, t, t0, text, cx, cy, size=96, col=RUST, rot=-12):
    """sello de goma: cae grande y golpea; textura gastada"""
    if t < t0: return
    k = prog(t, t0, 0.18); s = 1 + 1.6 * (1 - ease(k))
    f = font(size, 'head'); d0 = ImageDraw.Draw(img)
    tw = d0.textlength(text, font=f); w, h = int(tw + 70), int(size * 1.6)
    key = ('stamp', text, size, col)
    if key not in _cache:
        lay = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
        ld.rounded_rectangle([5, 5, w - 6, h - 6], 16, outline=col, width=9)
        ld.text((w / 2, h / 2), text, font=f, fill=col, anchor='mm')
        a = np.asarray(lay).copy(); worn = RNG.random(a.shape[:2]) > 0.22
        a[..., 3] = (a[..., 3] * worn * 0.92).astype(np.uint8); _cache[key] = Image.fromarray(a)
    lay = _cache[key].rotate(rot, expand=True, resample=Image.BICUBIC)
    lay = lay.resize((int(lay.width * s), int(lay.height * s)), Image.BICUBIC)
    if k < 1:
        a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3] * k).astype(np.uint8); lay = Image.fromarray(a)
    img.alpha_composite(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)))

# ---------------------------------------------------------------- objetos recortados
def sp_stopwatch():
    def dr(dc, dm, p):
        for d in (dc, dm):
            col = BRASS if d is dc else 255
            d.ellipse([p, p + 60, p + 640, p + 700], fill=col); d.rectangle([p + 280, p, p + 360, p + 70], fill=col)
            d.rounded_rectangle([p + 250, p - 10 + 10, p + 390, p + 30], 10, fill=col)
        dc.ellipse([p + 40, p + 100, p + 600, p + 660], fill=PAPER, outline=INK, width=6)
        for i in range(60):
            a = math.radians(i * 6 - 90); r0, r1 = (230, 268) if i % 5 == 0 else (250, 268)
            cx, cy = p + 320, p + 380
            dc.line([cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a) * r1, cy + math.sin(a) * r1], fill=INK, width=8 if i % 5 == 0 else 3)
        for i, n in enumerate((60, 15, 30, 45)):
            a = math.radians(i * 90 - 90)
            dc.text((p + 320 + math.cos(a) * 190, p + 380 + math.sin(a) * 190), str(n), font=font(44), fill=INK, anchor='mm')
    return cutout('stopwatch', 640, 700, dr, seed=5)

def needle(img, cx, cy, ang, length, width, col=RUST):
    a = math.radians(ang - 90)
    pts = [(cx + math.cos(a) * length, cy + math.sin(a) * length),
           (cx + math.cos(a + 2.9) * 26, cy + math.sin(a + 2.9) * 26), (cx + math.cos(a - 2.9) * 26, cy + math.sin(a - 2.9) * 26)]
    d = ImageDraw.Draw(img); d.polygon([(x + 6, y + 8) for x, y in pts], fill=(0, 0, 0, 90)); d.polygon(pts, fill=col)
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=INK)

def sp_palace():
    def dr(dc, dm, p):
        wall, shade, roof = SAND, (190, 172, 128), (120, 84, 52)
        parts = []
        parts.append(([(p + 60, p + 260), (p + 700, p + 260), (p + 700, p + 600), (p + 60, p + 600)], wall))
        for tx in (p + 10, p + 640):
            parts.append(([(tx, p + 120), (tx + 130, p + 120), (tx + 130, p + 600), (tx, p + 600)], wall))
            parts.append(([(tx - 10, p + 95), (tx + 140, p + 95), (tx + 140, p + 125), (tx - 10, p + 125)], roof))
        parts.append(([(p + 330, p + 140), (p + 430, p + 140), (p + 430, p + 260), (p + 330, p + 260)], wall))
        parts.append(([(p + 315, p + 145), (p + 380, p + 70), (p + 445, p + 145)], roof))
        for pts, c in parts:
            r = rough(pts, 1.8, len(pts) * 7 + int(pts[0][0]))
            dc.polygon(r, fill=c); dm.polygon(r, fill=255)
        for row in range(3):
            for j in range(7):
                x = p + 100 + j * 82; y = p + 290 + row * 100
                dc.rounded_rectangle([x, y, x + 50, y + 70], 22, fill=shade); dc.rounded_rectangle([x + 6, y + 24, x + 44, y + 70], 16, fill=(70, 58, 40))
        dc.line([p + 380, p + 70, p + 380, p - 30 + 30], fill=INK, width=8)
    return cutout('palace', 760, 620, dr, seed=8)

def flag(img, cx, top, t, drop=0.0, scale=1.0, cam=None):
    """bandera roja que flamea (ondas en el borde), puede bajar por el mástil"""
    if cam: cx, top, scale = cam.apply(cx, top, scale, 1.0)
    d = ImageDraw.Draw(img)
    mh = 230 * scale
    d.line([cx, top, cx, top + mh], fill=INK, width=max(3, int(8 * scale)))
    fy = top + 6 * scale + drop * (mh - 90 * scale)
    pts = []
    for i in range(13):
        u = i / 12; x = cx + u * 150 * scale; y = fy + math.sin(t * 9 - u * 6) * 9 * u * scale
        pts.append((x, y))
    for i in range(12, -1, -1):
        u = i / 12; x = cx + u * 150 * scale; y = fy + 85 * scale + math.sin(t * 9 - u * 6 + 0.4) * 9 * u * scale
        pts.append((x, y))
    d.polygon([(x + 5, y + 7) for x, y in pts], fill=(0, 0, 0, 70)); d.polygon(pts, fill=RUST)

def sp_ship(i):
    def dr(dc, dm, p):
        hull = [(p, p + 150), (p + 520, p + 150), (p + 470, p + 220), (p + 40, p + 220)]
        sup = [(p + 150, p + 95), (p + 360, p + 95), (p + 360, p + 152), (p + 150, p + 152)]
        bridge = [(p + 220, p + 55), (p + 300, p + 55), (p + 300, p + 96), (p + 220, p + 96)]
        f1 = [(p + 180, p - 10 + 10), (p + 215, p + 10), (p + 215, p + 96), (p + 180, p + 96)]
        f2 = [(p + 310, p + 10), (p + 345, p + 10), (p + 345, p + 96), (p + 310, p + 96)]
        for pts, c in ((hull, STEEL_D), (sup, STEEL), (bridge, STEEL), (f1, (60, 62, 60)), (f2, (60, 62, 60))):
            r = rough(pts, 1.5, i * 13 + int(pts[0][0])); dc.polygon(r, fill=c); dm.polygon(r, fill=255)
        dc.line([p + 360, p + 125, p + 470, p + 112], fill=INK, width=12)   # cañón de proa
        dc.line([p + 150, p + 125, p + 60, p + 116], fill=INK, width=10)
        for k in range(6): dc.ellipse([p + 70 + k * 70, p + 172, p + 84 + k * 70, p + 186], fill=(40, 46, 48))
    return cutout(('ship', i), 520, 230, dr, seed=20 + i)

def sp_puff(i):
    def dr(dc, dm, p):
        r = np.random.default_rng(i)
        for _ in range(5):
            x, y, s = p + r.uniform(20, 120), p + r.uniform(20, 80), r.uniform(40, 70)
            dc.ellipse([x - s, y - s * 0.8, x + s, y + s * 0.8], fill=(214, 208, 190)); dm.ellipse([x - s, y - s * 0.8, x + s, y + s * 0.8], fill=255)
    return cutout(('puff', i), 160, 120, dr, seed=40 + i)

def sp_burst(i):
    def dr(dc, dm, p):
        n = 11; pts = []
        for k in range(2 * n):
            r = (150 if k % 2 == 0 else 70) * (0.85 + 0.3 * ((k * 37 + i * 11) % 7) / 7)
            a = math.pi * k / n; pts.append((p + 160 + math.cos(a) * r, p + 160 + math.sin(a) * r))
        dc.polygon(pts, fill=(232, 140, 48)); dm.polygon(pts, fill=255)
        inner = [(p + 160 + (x - p - 160) * 0.55, p + 160 + (y - p - 160) * 0.55) for x, y in pts]
        dc.polygon(inner, fill=(250, 214, 120))
    return cutout(('burst', i), 320, 320, dr, seed=60 + i)

_map = {}
def map_layer():
    """mapa de papel de África oriental: tierra caqui, mar gris azulado con líneas de olas, Zanzíbar en arena"""
    if 'm' in _map: return _map['m']
    lon0, lon1, lat0, lat1, S = 24.0, 52.0, -16.0, 6.0, 120   # px por grado
    w, h = int((lon1 - lon0) * S), int((lat1 - lat0) * S)
    X = lambda lo: (lo - lon0) * S; Y = lambda la: (lat1 - la) * S
    col = Image.new('RGBA', (w, h), SEA + (255,)); d = ImageDraw.Draw(col)
    for yy in range(0, h, 26): d.line([(x, yy + 5 * math.sin(x / 40)) for x in range(0, w, 20)], fill=(78, 108, 120), width=2)
    r = shapefile.Reader(os.path.join(ROOT, 'dl/geo/ne_50m_admin_0_countries.shp'))
    for sr in r.iterShapeRecords():
        pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
        for a_, b_ in zip(parts[:-1], parts[1:]):
            ring = pts[a_:b_]
            xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
            if max(xs) < lon0 or min(xs) > lon1 or max(ys) < lat0 or min(ys) > lat1: continue
            zan = abs(sum(xs) / len(xs) - 39.35) < 0.4 and abs(sum(ys) / len(ys) + 6.15) < 0.5
            poly = [(X(x), Y(y)) for x, y in ring]
            d.polygon([(x + 6, y + 9) for x, y in poly], fill=(30, 40, 44, 255))
            d.polygon(poly, fill=SAND if zan else KHAKI, outline=(120, 104, 70))
    a = np.asarray(col).astype(np.float32)
    big = np.tile(GRAIN, (h // H + 1, w // W + 1))[:h, :w]
    a[..., :3] += big[..., None] * 0.6
    m = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    _map['m'] = (m, X, Y)
    return _map['m']

# ---------------------------------------------------------------- escenas
def sc_hook(img, t):
    cam = Cam(W / 2, H / 2 + 40, 1.0 + 0.10 * ease(prog(t, 0, 4.5)), wobble(t, 0.15, 1.2))
    sw = sp_stopwatch()
    k = back(prog(t, 0.1, 0.5))
    place(img, sw, W / 2, 1060, scale=0.95 * k, rot=wobble(t, 0.5, 1.5), lift=22, cam=cam)
    cx, cy, s = cam.apply(W / 2, 1060 + 380 * 0.95 - 350 * 0.95 + 15, 1, 1)
    if k > 0.9:
        m = 45 * ease(prog(t, 0.6, 3.2))
        needle(img, cx, cy + 2, m * 6, 240 * s, 22, RUST)
    strip(img, t, 0.3, 'LA GUERRA MÁS CORTA\nDE LA HISTORIA', key={'CORTA'}, y=300, size=56)
    stamp(img, t, 3.3, '< 1 HORA', 780, 1640, 92)

def sc_map(img, t, a):
    m, X, Y = map_layer()
    z = sstep(prog(t, a + 0.2, 3.6))
    lon, lat = 34 + (39.3 - 34) * z, -4 + (-6.1 + 4) * z
    sc = 0.32 * math.exp(math.log(1.5 / 0.32) * z) * (1 + 0.02 * wobble(t, 0.4))
    cx, cy = X(lon), Y(lat)
    cw, ch = W / sc, H / sc
    box = (int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))
    view = m.crop(box).resize((W, H), Image.BICUBIC).rotate(wobble(t, 0.2, 1.0) - 2 * (1 - z), resample=Image.BICUBIC)
    img.alpha_composite(view)
    # pin rojo que cae con rebote sobre Zanzíbar + círculo de lápiz que se dibuja
    px, py = W / 2 + (X(39.35) - cx) * sc, H / 2 + (Y(-6.15) - cy) * sc
    if t >= a + 3.0:
        kk = prog(t, a + 3.0, 0.35); drop = (1 - back(kk)) * 300
        d = ImageDraw.Draw(img)
        arc = 360 * ease(prog(t, a + 3.4, 0.8))
        if arc > 1: d.arc([px - 120, py - 120, px + 120, py + 120], -90, -90 + arc, fill=RUST, width=8)
        d.ellipse([px - 8 + 10, py - 4 + 14, px + 8 + 10, py + 4 + 14], fill=(0, 0, 0, 90))
        d.line([px, py - drop, px, py - 70 - drop], fill=INK, width=6)
        d.ellipse([px - 26, py - 110 - drop, px + 26, py - 58 - drop], fill=RUST, outline=INK, width=4)
    strip(img, t, a + 3.6, 'ZANZÍBAR · 1896', key={'ZANZÍBAR'}, y=1560, size=58, rot=2)
    strip(img, t, a + 0.3, 'UNA ISLA FRENTE A ÁFRICA', y=300, size=50)

def sc_palace(img, t, a):
    cam = Cam(W / 2, H / 2, 1.0 + 0.08 * ease(prog(t, a, 5)), wobble(t, 0.15, -1.0))
    k = back(prog(t, a + 0.1, 0.6))
    pal = sp_palace()
    base_y = 1180 + (1 - k) * 700
    place(img, pal, W / 2, base_y, scale=1.15, rot=wobble(t, 0.4, 0.6), lift=20, cam=cam)
    flag(img, W / 2 + 0, base_y - 310 * 1.15 - 160, t, scale=1.1, cam=cam)
    strip(img, t, a + 0.2, 'UN NUEVO SULTÁN QUE\nLOS BRITÁNICOS NO QUERÍAN', key={'SULTÁN'}, y=300, size=46)
    if t >= a + 2.4:
        kk = back(prog(t, a + 2.4, 0.45))
        def dr(dc, dm, p):
            pts = rough([(p, p), (p + 760, p), (p + 760, p + 330), (p, p + 330)], 2.5, 77)
            dc.polygon(pts, fill=PAPER); dm.polygon(pts, fill=255)
            dc.text((p + 40, p + 40), 'TELEGRAMA · 27-08-1896', font=font(34), fill=(110, 98, 70))
            dc.text((p + 40, p + 110), 'ULTIMÁTUM:', font=font(58, 'head'), fill=RUST)
            dc.text((p + 40, p + 200), 'dejar el palacio\nantes de las 9:00', font=font(44), fill=INK)
        tel = cutout('telegram', 760, 330, dr, seed=9)
        place(img, tel, W / 2 + (1 - kk) * 900, 1640, rot=-3 + wobble(t, 0.5, 0.8), lift=18)

def sc_fleet(img, t, a):
    pan = sstep(prog(t, a, 5.0))
    cam = Cam(W / 2 + 160 - 320 * pan, H / 2, 1.03, wobble(t, 0.2, 0.8))
    # tres franjas de mar con olas a distinta velocidad (paralaje)
    d = ImageDraw.Draw(img)
    for li, (y0, col, sp, dep) in enumerate(((1130, (70, 98, 110), 40, 0.6), (1330, SEA, 70, 0.85), (1520, (52, 76, 86), 110, 1.0))):
        off = (t * sp + (cam.x - W / 2) * dep) % 160
        pts = [(x, y0 + 16 * math.sin((x + off) / 160 * 2 * math.pi)) for x in range(-40, W + 60, 20)]
        d.polygon(pts + [(W + 60, H), (-40, H)], fill=col)
        if li == 0:   # barcos entre la primera y la segunda franja
            for i in range(5):
                ti = a + 0.3 + i * 0.35; k = ease(prog(t, ti, 0.8))
                if k <= 0: continue
                x = -400 + k * (300 + i * 230); y = 1080 + (i % 2) * 110 + wobble(t, 0.6, 6, i)
                place(img, sp_ship(i), x, y, scale=0.95 - (i % 2) * 0.08, rot=wobble(t, 0.5, 1.5, i), lift=8, cam=cam, depth=0.9)
                for j in range(3):   # humo que sube de las chimeneas
                    age = (t * 0.8 + j * 0.33 + i * 0.17) % 1
                    place(img, sp_puff(j), x - 40 + age * 70 - 20, y - 150 - age * 240, scale=0.25 + age * 0.45, alpha=(1 - age) * k * 0.8, lift=4, cam=cam, depth=0.9)
    strip(img, t, a + 0.2, '5 BARCOS DE GUERRA\nCONTRA UN PALACIO', key={'5', 'BARCOS'}, y=300, size=52)
    stamp(img, t, a + 3.0, '5 vs 1', 540, 1700, 100, col=PAPER, rot=-6)

def sc_bomb(img, t, a):
    hits = [a + 0.3 + j * 0.75 for j in range(5)]
    sh = shake_at(t, hits, 22)
    cam = Cam(W / 2, H / 2, 1.0 + 0.12 * ease(prog(t, a, 4.6)), wobble(t, 0.3, 1.0), sh)
    pal = sp_palace()
    place(img, pal, W / 2, 1280, scale=1.0, rot=wobble(t, 0.4, 0.6), lift=20, cam=cam)
    drop = ease(prog(t, a + 3.4, 0.8))
    flag(img, W / 2, 1280 - 310 - 160, t, drop=drop, scale=1.0, cam=cam)
    for j, h in enumerate(hits):
        if h <= t < h + 0.45:
            kk = (t - h) / 0.45
            bx = [300, 760, 470, 640, 380][j]; by = [1230, 1180, 1330, 1250, 1150][j]
            place(img, sp_burst(j), bx, by, scale=0.4 + kk * 0.9, rot=kk * 40, alpha=1 - kk ** 2, lift=6, cam=cam)
            place(img, sp_puff(j % 3), bx, by - 60 * kk, scale=0.8 + kk * 1.4, alpha=0.8 * (1 - kk), lift=4, cam=cam)
    # reloj chico arriba: corre de 9:00 a 9:38–9:45
    sw = sp_stopwatch()
    place(img, sw, 820, 760, scale=0.42, rot=wobble(t, 0.6, 2), lift=14)
    m = 45 * ease(prog(t, a, 3.6))
    needle(img, 820, 763 + 15 * 0.42, m * 6, 240 * 0.42, 12, RUST)
    strip(img, t, a + 0.1, 'EMPIEZA EL BOMBARDEO', key={'BOMBARDEO'}, y=300, size=54)
    stamp(img, t, a + 3.6, '38–45 MIN', 420, 760, 84, rot=-10)

def sc_toll(img, t, a):
    cam = Cam(W / 2, H / 2, 1.0 + 0.05 * ease(prog(t, a, 4)), wobble(t, 0.15, 0.8))
    def dr(dc, dm, p):
        pts = rough([(p, p), (p + 900, p), (p + 900, p + 1000), (p, p + 1000)], 3, 5)
        dc.polygon(pts, fill=PAPER); dm.polygon(pts, fill=255)
        dc.text((p + 40, p + 30), 'INFORME DE BAJAS', font=font(46, 'head'), fill=INK)
        dc.line([p + 40, p + 100, p + 860, p + 100], fill=INK, width=4)
        dc.text((p + 40, p + 900), 'ZANZÍBAR', font=font(36), fill=RUST); dc.text((p + 700, p + 900), 'BRITÁNICOS', font=font(30), fill=INK)
    k = back(prog(t, a, 0.5))
    place(img, cutout('report', 900, 1000, dr, seed=4), W / 2, 1130 + (1 - k) * 900, rot=-2 + wobble(t, 0.3, 0.6), lift=20, cam=cam)
    if k > 0.95:
        d = ImageDraw.Draw(img)
        n = int(500 * ease(prog(t, a + 0.5, 1.8)))
        x0, y0 = 150, 790   # 500 marcas de lápiz en grupos de 5 (como un conteo a mano): 10 grupos x 10 filas
        for i in range(n):
            g = i // 5; r = i % 5; gx, gy = g % 10, g // 10
            x = x0 + gx * 62 + (r * 9 if r < 4 else 0); y = y0 + gy * 58
            if r < 4: d.line([x, y, x, y + 36], fill=RUST, width=5)
            else: d.line([x - 34, y + 30, x + 6, y + 4], fill=RUST, width=5)
        kk = back(prog(t, a + 2.6, 0.3))
        if kk > 0:
            d.line([880, 1080, 880, 1080 + 36 * kk], fill=INK, width=7)
    stamp(img, t, a + 2.5, '≈500', 330, 1760, 84)
    stamp(img, t, a + 2.9, '1', 880, 1760, 84, col=INK, rot=8)
    strip(img, t, a + 0.1, '≈500 BAJAS CONTRA 1 HERIDO', key={'≈500', '1'}, y=300, size=46)

def sc_end(img, t, a):
    cam = Cam(W / 2, H / 2, 1.08 - 0.08 * ease(prog(t, a, 2.5)), wobble(t, 0.2, 1.0))
    pal = sp_palace()
    place(img, pal, W / 2, 1220, scale=0.8, rot=wobble(t, 0.4, 0.6), lift=16, cam=cam, alpha=0.9)
    flag(img, W / 2, 1220 - 310 * 0.8 - 128, t, drop=1.0, scale=0.8, cam=cam)
    strip(img, t, a + 0.1, '¿CONOCÍAS ESTA GUERRA?', key={'¿CONOCÍAS'}, y=520, size=56)
    stamp(img, t, a + 1.2, 'ARCHIVO', 540, 1650, 100, col=RUST, rot=-8)

SCENES = [(0.0, 4.6, lambda i, t: sc_hook(i, t)), (4.6, 10.0, lambda i, t: sc_map(i, t, 4.6)),
          (10.0, 15.2, lambda i, t: sc_palace(i, t, 10.0)), (15.2, 20.4, lambda i, t: sc_fleet(i, t, 15.2)),
          (20.4, 25.2, lambda i, t: sc_bomb(i, t, 20.4)), (25.2, 28.6, lambda i, t: sc_toll(i, t, 25.2)),
          (28.6, DUR, lambda i, t: sc_end(i, t, 28.6))]

def frame(i, outdir):
    t = i / FPS
    cam0 = Cam(W / 2 + wobble(t, 0.1, 30), H / 2)
    img = background(t, cam0)
    for a, b, fn in SCENES:
        if a <= t < b:
            lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fn(lay, t)
            # transición: la escena nueva entra con un "corte de papel" (barrido diagonal) en 0,25 s
            if a > 0 and t < a + 0.25:
                k = (t - a) / 0.25; m = Image.new('L', (W, H), 0)
                ImageDraw.Draw(m).polygon([(-400, H), (-400 + (W + 900) * k, H), (-400 + (W + 900) * k + 400, 0), (-400, 0)], fill=255)
                img.paste(lay, (0, 0), ImageChops.multiply(m, lay.getchannel('A')))
            else:
                img.alpha_composite(lay)
    img = overlay_print(img, t)
    img.convert('RGB').save(os.path.join(outdir, f'{i:04d}.png'), compress_level=1)

def chunk(args):
    lo, hi, outdir = args
    init()
    for i in range(lo, hi): frame(i, outdir)
    return hi - lo

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('work'); ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=4); ap.add_argument('--only', default=None)
    a = ap.parse_args()
    outdir = os.path.join(a.work, 'frames'); os.makedirs(outdir, exist_ok=True)
    n = int(DUR * FPS)
    if a.only:
        init()
        for s in a.only.split(','): frame(int(float(s) * FPS), outdir)
        sys.exit()
    from multiprocessing import Pool
    step = math.ceil(n / (a.workers * 4))
    with Pool(a.workers) as p:
        for _ in p.imap_unordered(chunk, [(lo, min(n, lo + step), outdir) for lo in range(0, n, step)]): pass
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(outdir, '%04d.png'),
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', a.out], check=True)
    print('cuadros', n)
