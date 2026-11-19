"""Video de prueba del nicho guerra: "La guerra más corta de la historia" (Zanzíbar, 1896).

Estilo de las referencias: fondo azul noche con focos, objetos brillantes en 2D, cifras en etiquetas amarillas y
texto arriba con la palabra clave en un recuadro blanco. Sin voz: la historia va en los textos.
Uso: zanzibar.py <dir_trabajo> <salida.mp4> [--workers 4] [--only 1.5,6]
"""
import os, sys, math, argparse, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import shapefile

W, H, FPS = 1080, 1920, 30
ROOT = os.environ.get('GUERRA_WORK', '/home/user/Automatizacion/work/guerra')
F = lambda n: os.path.join(ROOT, 'dl/font', n)
DUR = 28.0

NAVY0, NAVY1 = (8, 14, 32), (24, 40, 74)
GOLD, GOLD_D = (247, 196, 64), (170, 118, 24)
WHITE, INK = (245, 247, 252), (14, 18, 30)
RED = (214, 52, 52)
STEEL, STEEL_D = (176, 186, 204), (92, 104, 128)

def font(size, kind='inter'):
    if kind == 'mono': return ImageFont.truetype(F('IBMPlexMono-Bold.ttf'), size)
    if kind == 'head': return ImageFont.truetype(F('ArchivoBlack-Regular.ttf'), size)
    f = ImageFont.truetype(F('Inter.ttf'), size)
    try: f.set_variation_by_name('Bold')
    except Exception: pass
    return f

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, t0, d): return clamp((t - t0) / d)
def ease(x): return 1 - (1 - x) ** 3
def sstep(x): x = clamp(x); return x * x * (3 - 2 * x)
def back(x, s=1.7): x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s)

# ---------------------------------------------------------------- fondo: azul noche, focos desde arriba, viñeta
def make_bg():
    y = np.linspace(0, 1, H)[:, None, None]
    a = np.array(NAVY0, np.float32) * (1 - y) + np.array(NAVY1, np.float32) * y
    a = np.repeat(a, W, axis=1)
    beams = Image.new('L', (W, H), 0); d = ImageDraw.Draw(beams)
    for cx in (180, 540, 900):
        d.polygon([(cx - 40, -10), (cx + 40, -10), (cx + 260, H * 0.78), (cx - 260, H * 0.78)], fill=70)
    beams = np.asarray(beams.filter(ImageFilter.GaussianBlur(60)), np.float32)[..., None] / 255
    a = a + beams * np.array([120, 150, 210], np.float32) * 0.55
    yy, xx = np.mgrid[0:H, 0:W]
    v = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.45) / H) ** 2)
    a = a * (1.15 - 0.9 * v[..., None])
    rng = np.random.default_rng(3)
    a += rng.normal(0, 3, a.shape[:2])[..., None]
    # puntitos de luz (polvo en los focos)
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    for _ in range(140):
        x, yv, r = rng.uniform(0, W), rng.uniform(0, H * 0.75), rng.uniform(1, 2.6)
        d.ellipse([x - r, yv - r, x + r, yv + r], fill=(200, 215, 255, int(rng.uniform(40, 120))))
    return img

def radial(size, c_in, c_out, cx=0.4, cy=0.35):
    """disco con brillo radial (metal / oro)"""
    n = size; yy, xx = np.mgrid[0:n, 0:n] / n
    d = np.clip(np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / 0.85, 0, 1)[..., None]
    col = np.array(c_in, np.float32) * (1 - d) + np.array(c_out, np.float32) * d
    alpha = (np.sqrt((xx - 0.5) ** 2 + (yy - 0.5) ** 2) < 0.5).astype(np.float32)[..., None] * 255
    return Image.fromarray(np.concatenate([col, alpha], -1).astype(np.uint8), 'RGBA')

def glow(img, layer, radius=18, strength=0.7):
    g = layer.filter(ImageFilter.GaussianBlur(radius))
    a = np.asarray(g).copy(); a[..., 3] = (a[..., 3] * strength).astype(np.uint8)
    img.alpha_composite(Image.fromarray(a)); img.alpha_composite(layer)

def fade(layer, k):
    if k >= 1: return layer
    a = np.asarray(layer).copy(); a[..., 3] = (a[..., 3] * clamp(k)).astype(np.uint8)
    return Image.fromarray(a)

def tag(img, cx, y, big, small, k=1.0, col=GOLD):
    """etiqueta de cifra estilo referencia: número grande + palabra chica"""
    if k <= 0: return
    fb, fs = font(76), font(38)
    d0 = ImageDraw.Draw(img)
    wb, ws = d0.textlength(big, font=fb), d0.textlength(small, font=fs) if small else 0
    w = wb + ws + (14 if small else 0)
    lay = Image.new('RGBA', (int(w + 60), 120), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rounded_rectangle([0, 6, lay.width - 1, 114], 18, fill=(10, 14, 26, 210))
    d.text((30, 60), big, font=fb, fill=col, anchor='lm')
    if small: d.text((30 + wb + 14, 72), small, font=fs, fill=WHITE, anchor='lm')
    s = back(k)
    lay = lay.resize((max(1, int(lay.width * s)), max(1, int(lay.height * s))), Image.BICUBIC)
    img.alpha_composite(fade(lay, k * 2), (int(cx - lay.width / 2), int(y - lay.height / 2)))

# ---------------------------------------------------------------- texto arriba (frase con palabra clave en recuadro)
CAPS = []  # (t0, t1, palabras, índice de la clave)
def caption(img, t):
    cur = [c for c in CAPS if c[0] <= t < c[1]]
    if not cur: return
    t0, t1, words, key = cur[-1]
    f = font(64); d = ImageDraw.Draw(img)
    lines, line, wmax = [], [], 900
    for i, w in enumerate(words):
        test = ' '.join(x for _, x in line + [(i, w)])
        if d.textlength(test, font=f) > wmax and line: lines.append(line); line = []
        line.append((i, w))
    lines.append(line)
    y = 230 - (len(lines) - 1) * 40
    for ln in lines:
        widths = [d.textlength(w, font=f) + (24 if i == key else 0) for i, w in ln]; sp = d.textlength(' ', font=f)
        x = (W - (sum(widths) + sp * (len(ln) - 1))) / 2
        for (i, w), ww in zip(ln, widths):
            # cada palabra aparece en su turno (como la voz palabra por palabra)
            ti = t0 + i * min(0.22, (t1 - t0 - 0.6) / max(1, len(words)))
            k = prog(t, ti, 0.12)
            if k <= 0: x += ww + sp; continue
            if i == key:
                d.rounded_rectangle([x, y - 4, x + ww, y + 74], 8, fill=WHITE + (int(255 * k),))
                d.text((x + 12, y), w, font=f, fill=INK + (int(255 * k),))
            else:
                d.text((x, y), w, font=f, fill=WHITE + (int(255 * k),))
            x += ww + sp
        y += 82

# ---------------------------------------------------------------- piezas
def clock(img, cx, cy, r, minutes, k=1.0, label=None):
    """reloj de pared metálico; `minutes` desde las 9:00"""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ring = radial(int(2 * r + 60), (245, 248, 255), (90, 100, 125)); lay.alpha_composite(ring, (int(cx - r - 30), int(cy - r - 30)))
    face = radial(int(2 * r), (250, 246, 236), (205, 198, 182), 0.45, 0.4); lay.alpha_composite(face, (int(cx - r), int(cy - r)))
    d = ImageDraw.Draw(lay)
    for i in range(60):
        a = math.radians(i * 6 - 90); l = 0.13 if i % 5 == 0 else 0.06; w = 9 if i % 5 == 0 else 3
        d.line([(cx + math.cos(a) * r * 0.92, cy + math.sin(a) * r * 0.92), (cx + math.cos(a) * r * (0.92 - l), cy + math.sin(a) * r * (0.92 - l))], fill=INK, width=w)
    # tramo rojo: los minutos que ya pasaron de guerra
    if minutes > 0:
        d.pieslice([cx - r * 0.84, cy - r * 0.84, cx + r * 0.84, cy + r * 0.84], -90, -90 + minutes * 6, fill=(214, 52, 52, 90))
    h_ang = math.radians((9 + minutes / 60) * 30 - 90); m_ang = math.radians(minutes * 6 - 90)
    d.line([(cx, cy), (cx + math.cos(h_ang) * r * 0.5, cy + math.sin(h_ang) * r * 0.5)], fill=INK, width=22)
    d.line([(cx, cy), (cx + math.cos(m_ang) * r * 0.78, cy + math.sin(m_ang) * r * 0.78)], fill=INK, width=12)
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=RED)
    img.alpha_composite(fade(lay, k))
    if label:
        tag(img, cx, cy + r + 120, *label, k=k)

_geo = {}
def africa():
    if 'af' in _geo: return _geo['af']
    r = shapefile.Reader(os.path.join(ROOT, 'dl/geo/ne_50m_admin_0_countries.shp'))
    fl = [f[0] for f in r.fields[1:]]; ic = fl.index('CONTINENT')
    polys = []
    for sr in r.iterShapeRecords():
        if sr.record[ic] not in ('Africa', 'Asia'): continue
        pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
        for a, b in zip(parts[:-1], parts[1:]):
            ring = np.array(pts[a:b])
            if ring[:, 0].max() < -20 or ring[:, 0].min() > 70 or ring[:, 1].min() > 40: continue
            zan = abs(ring[:, 0].mean() - 39.35) < 0.4 and abs(ring[:, 1].mean() + 6.15) < 0.5   # isla de Unguja (Zanzíbar)
            polys.append((ring, zan))
    _geo['af'] = polys
    return polys

def map_scene(img, t, t0):
    """África → zoom a Zanzíbar con un pin que late"""
    z = sstep(prog(t, t0 + 0.3, 3.2))
    lon_c, lat_c = 20 + (39.3 - 20) * z, 2 + (-6.1 - 2) * z
    scale = 13 * math.exp(math.log(160 / 13) * z)            # px por grado
    X = lambda lon: W / 2 + (lon - lon_c) * scale
    Y = lambda lat: H * 0.55 - (lat - lat_c) * scale * 1.0
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for ring, zan in africa():
        xy = [(X(x), Y(y)) for x, y in ring]
        if max(p[0] for p in xy) < -50 or min(p[0] for p in xy) > W + 50: continue
        d.polygon(xy, fill=(234, 196, 92) if zan else (62, 86, 136), outline=(140, 170, 225) if not zan else GOLD)
    k = ease(prog(t, t0, 0.5))
    glow(img, fade(lay, k), 10, 0.5)
    px, py = X(39.35), Y(-6.15)
    if z > 0.85:
        kk = ease(prog(t, t0 + 3.3, 0.4)); ph = (t * 1.6) % 1
        d2 = ImageDraw.Draw(img)
        d2.ellipse([px - 60 * ph - 20, py - 60 * ph - 20, px + 60 * ph + 20, py + 60 * ph + 20], outline=GOLD + (int(255 * (1 - ph) * kk),), width=6)
        tag(img, W / 2, py + 260, 'ZANZÍBAR', '· 1896', k=kk, col=WHITE)

def palace(img, cx, base, s=1.0, k=1.0, flag_down=0.0, shake=0.0):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    wall, wall_d, roof = (236, 226, 204), (196, 182, 152), (120, 86, 60)
    bw, bh = 520 * s, 300 * s
    x0, x1, y0 = cx - bw / 2, cx + bw / 2, base - bh
    d.rectangle([x0, y0, x1, base], fill=wall, outline=INK, width=5)
    for i in range(3):   # pisos con arcos
        yy = y0 + 30 * s + i * 90 * s
        for j in range(6):
            ax = x0 + 30 * s + j * 80 * s
            d.rounded_rectangle([ax, yy, ax + 50 * s, yy + 66 * s], int(24 * s), fill=wall_d, outline=INK, width=3)
    tower_w = 120 * s
    for tx in (x0 - tower_w * 0.4, x1 - tower_w * 0.6):
        d.rectangle([tx, y0 - 140 * s, tx + tower_w, base], fill=wall, outline=INK, width=5)
        d.rectangle([tx - 8 * s, y0 - 160 * s, tx + tower_w + 8 * s, y0 - 140 * s], fill=roof, outline=INK, width=4)
        for j in range(4):
            d.rectangle([tx + j * tower_w / 4 + 4, y0 - 190 * s, tx + j * tower_w / 4 + tower_w / 8 + 4, y0 - 160 * s], fill=wall, outline=INK, width=3)
    # torre del reloj central y mástil con bandera roja
    d.rectangle([cx - 50 * s, y0 - 120 * s, cx + 50 * s, y0], fill=wall, outline=INK, width=5)
    d.polygon([(cx - 60 * s, y0 - 120 * s), (cx, y0 - 190 * s), (cx + 60 * s, y0 - 120 * s)], fill=roof, outline=INK)
    mx = cx; my0, my1 = y0 - 190 * s, y0 - 360 * s
    d.line([mx, my0, mx, my1], fill=INK, width=int(8 * s))
    fy = my1 + (my0 - my1 - 70 * s) * flag_down
    wave = [(mx, fy), (mx + 70 * s, fy + 6 * s), (mx + 140 * s, fy), (mx + 140 * s, fy + 70 * s), (mx + 70 * s, fy + 76 * s), (mx, fy + 70 * s)]
    d.polygon(wave, fill=RED, outline=INK)
    if shake:
        lay = lay.transform(lay.size, Image.AFFINE, (1, 0, shake, 0, 1, 0), resample=Image.BICUBIC)
    img.alpha_composite(fade(lay, k))

def ship(d, x, y, s, col=STEEL):
    hull = [(x - 150 * s, y - 30 * s), (x + 170 * s, y - 30 * s), (x + 130 * s, y + 30 * s), (x - 120 * s, y + 30 * s)]
    d.polygon(hull, fill=STEEL_D, outline=INK)
    d.rectangle([x - 70 * s, y - 70 * s, x + 60 * s, y - 30 * s], fill=col, outline=INK, width=3)
    d.rectangle([x - 30 * s, y - 110 * s, x + 20 * s, y - 70 * s], fill=col, outline=INK, width=3)
    for fx in (-50, 30):
        d.rectangle([x + fx * s, y - 150 * s, x + (fx + 18) * s, y - 70 * s], fill=(70, 74, 86), outline=INK, width=3)
    d.line([x + 60 * s, y - 50 * s, x + 130 * s, y - 60 * s], fill=INK, width=int(8 * s))

def balance(img, t, t0):
    """balanza dorada: 5 barcos contra el palacio con ~3.000 defensores"""
    k = ease(prog(t, t0, 0.5)); tilt = -9 * sstep(prog(t, t0 + 1.6, 1.0))   # baja el lado de los barcos (izquierda)
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    cx, top = W / 2, 760
    d.rectangle([cx - 14, top, cx + 14, 1500], fill=GOLD, outline=GOLD_D, width=3)
    d.polygon([(cx - 170, 1560), (cx + 170, 1560), (cx + 90, 1490), (cx - 90, 1490)], fill=GOLD, outline=GOLD_D)
    a = math.radians(tilt); L = 320
    ends = [(cx - L * math.cos(a), top - L * math.sin(a) * -1 * -1), (cx + L * math.cos(a), top + L * math.sin(a))]
    ends[0] = (cx - L * math.cos(a), top - L * math.sin(a))
    d.line([ends[0], ends[1]], fill=GOLD, width=16)
    d.ellipse([cx - 30, top - 30, cx + 30, top + 30], fill=GOLD, outline=GOLD_D, width=3)
    pans = []
    for ex, ey in ends:
        d.line([(ex, ey), (ex - 150, ey + 330)], fill=GOLD_D, width=4); d.line([(ex, ey), (ex + 150, ey + 330)], fill=GOLD_D, width=4)
        d.chord([ex - 200, ey + 270, ex + 200, ey + 390], 0, 180, fill=GOLD, outline=GOLD_D, width=3)
        pans.append((ex, ey + 330))
    # carga: barcos a la izquierda, palacio chico a la derecha
    (lx, ly), (rx, ry) = pans
    for i in range(5):
        ship(d, lx - 110 + (i % 3) * 110, ly - 10 - (i // 3) * 95, 0.42)
    img.alpha_composite(fade(lay, k))
    palace(img, rx, ry - 4, 0.42, k=k)
    tag(img, max(lx, 200), ly + 140, '5', 'barcos', k=prog(t, t0 + 0.6, 0.4))
    tag(img, min(rx, W - 230), ry + 140, '≈3.000', 'defensores', k=prog(t, t0 + 1.0, 0.4), col=WHITE)

def casualties(img, t, t0):
    """grilla de puntos: unas 500 bajas en Zanzíbar contra 1 herido británico"""
    d = ImageDraw.Draw(img)
    cols, step, x0, y0 = 20, 34, 120, 620
    n = int(500 * ease(prog(t, t0 + 0.3, 1.6)))
    for i in range(n):
        x, y = x0 + (i % cols) * step, y0 + (i // cols) * step
        d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=RED)
    tag(img, 330 + 120, y0 + 25 * step + 70, '≈500', 'bajas · Zanzíbar', k=prog(t, t0 + 1.8, 0.4), col=RED)
    k = back(prog(t, t0 + 2.4, 0.35))
    if k > 0:
        bx, by = 920, 1010
        d.ellipse([bx - 16 * k, by - 16 * k, bx + 16 * k, by + 16 * k], fill=WHITE)
        tag(img, bx - 40, by + 120, '1', 'herido', k=prog(t, t0 + 2.6, 0.4), col=WHITE)

# ---------------------------------------------------------------- guion visual
SC = [  # (desde, hasta)
    ('reloj', 0.0, 4.2), ('mapa', 4.2, 9.2), ('palacio', 9.2, 14.2), ('balanza', 14.2, 19.2),
    ('bombardeo', 19.2, 23.4), ('bajas', 23.4, DUR),
]
CAPS[:] = [
    (0.2, 2.2, ['La', 'guerra', 'más', 'corta', 'de', 'la', 'historia'], 3),
    (2.2, 4.2, ['duró', 'menos', 'que', 'un', 'partido'], 4),
    (4.4, 9.2, ['Zanzíbar,', '1896:', 'una', 'isla', 'frente', 'a', 'África'], 0),
    (9.4, 11.8, ['Un', 'nuevo', 'sultán', 'que', 'los', 'británicos', 'no', 'querían'], 2),
    (11.8, 14.2, ['Ultimátum:', 'irse', 'antes', 'de', 'las', '9:00'], 0),
    (14.4, 19.2, ['5', 'barcos', 'de', 'guerra', 'contra', 'un', 'palacio'], 1),
    (19.4, 23.4, ['Entre', '38', 'y', '45', 'minutos', 'después…'], 4),
    (23.6, 26.0, ['≈500', 'bajas', 'contra', '1', 'herido'], 4),
    (26.0, DUR, ['¿Conocías', 'esta', 'guerra?'], 0),
]

BG = None
def frame(i, outdir):
    t = i / FPS
    img = BG.copy()
    name = next((n for n, a, b in SC if a <= t < b), SC[-1][0])
    a = next(a for n, a, b in SC if n == name)
    # transición: fundido corto al entrar a cada escena
    k_in = ease(prog(t, a, 0.35)) if a > 0 else 1.0
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if name == 'reloj':
        m = 45 * ease(prog(t, 0.6, 3.2))
        clock(lay, W / 2, 1000, 330, m, k=ease(prog(t, 0.0, 0.5)), label=(f'{int(m):02d}', 'minutos'))
    elif name == 'mapa':
        map_scene(lay, t, a)
    elif name == 'palacio':
        palace(lay, W / 2, 1430, 1.15, k=ease(prog(t, a, 0.5)))
        if t >= 11.8:
            kk = back(prog(t, 11.8, 0.35))
            card = Image.new('RGBA', (560, 240), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
            cd.rounded_rectangle([0, 0, 559, 239], 20, fill=(250, 244, 226), outline=INK, width=6)
            cd.text((280, 60), 'ULTIMÁTUM', font=font(58, 'head'), fill=RED, anchor='mm')
            cd.text((280, 160), 'antes de las 9:00', font=font(50), fill=INK, anchor='mm')
            card = card.rotate(-4, expand=True, resample=Image.BICUBIC)
            card = card.resize((max(1, int(card.width * kk)), max(1, int(card.height * kk))), Image.BICUBIC)
            lay.alpha_composite(card, (int(W / 2 - card.width / 2), int(1580 - card.height / 2)))
    elif name == 'balanza':
        balance(lay, t, a)
    elif name == 'bombardeo':
        m = 38 + 7 * ease(prog(t, a + 1.4, 2.0))
        clock(lay, W / 2, 700, 230, 38 * ease(prog(t, a, 1.4)) if t < a + 1.4 else m)
        tag(lay, W / 2, 1040, '38–45', 'minutos', k=ease(prog(t, a + 0.3, 0.4)))
        f = round((t - a) * FPS)
        sh = ((-1) ** f) * 10 * max(0, 1 - ((t - a) % 0.9) / 0.25) if t < a + 3.0 else 0
        palace(lay, W / 2, 1640, 0.85, flag_down=ease(prog(t, a + 2.6, 0.9)), shake=sh)
        # fogonazos del bombardeo
        d = ImageDraw.Draw(lay)
        for j in range(4):
            tb = a + 0.2 + j * 0.9
            if tb <= t < tb + 0.25:
                r = 120 * (1 - (t - tb) / 0.25) + 40; bx = 300 + j * 160
                d.ellipse([bx - r, 1380 - r, bx + r, 1380 + r], fill=(255, 170, 60, 200)); d.ellipse([bx - r * 0.55, 1380 - r * 0.55, bx + r * 0.55, 1380 + r * 0.55], fill=(255, 240, 190, 230))
    elif name == 'bajas':
        casualties(lay, t, a)
    img.alpha_composite(fade(lay, k_in) if k_in < 1 else lay)
    caption(img, t)
    img.convert('RGB').save(os.path.join(outdir, f'{i:04d}.png'), compress_level=1)

def chunk(args):
    lo, hi, outdir = args
    global BG
    BG = make_bg()
    for i in range(lo, hi): frame(i, outdir)
    return hi - lo

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('work'); ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=4); ap.add_argument('--only', default=None)
    a = ap.parse_args()
    outdir = os.path.join(a.work, 'frames'); os.makedirs(outdir, exist_ok=True)
    n = int(DUR * FPS)
    if a.only:
        BG = make_bg()
        for s in a.only.split(','): frame(int(float(s) * FPS), outdir)
        sys.exit()
    from multiprocessing import Pool
    step = math.ceil(n / (a.workers * 4))
    with Pool(a.workers) as p:
        for _ in p.imap_unordered(chunk, [(lo, min(n, lo + step), outdir) for lo in range(0, n, step)]): pass
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(outdir, '%04d.png'),
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', a.out], check=True)
    print('cuadros', n)
