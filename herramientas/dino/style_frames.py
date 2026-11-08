"""Cuadros de muestra del estilo "Archivo de excavación" (portada, capas, ficha de subasta, escala)."""
import os, sys, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from style import *

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
SUE = os.path.join(ROOT, 'dl/img/Tyrannosaurus_rex-sue.JPG')

def fossil(width, flip=False):
    """T. rex en hueso: semitono que se aclara hacia el lomo + líneas interiores de grabado."""
    m = dino_mask(SUE, width, 'purple')
    if flip: m = m.transpose(Image.FLIP_LEFT_RIGHT)
    w, h = m.size
    yy = np.linspace(0.55, 1.0, h)[:, None] * np.ones((1, w))
    shade = Image.fromarray((np.clip(1.05 - yy * 0.55, 0, 1) * 255).astype(np.uint8)).point(lambda v: v)
    ht = halftone(m, cell=8, shade=np.asarray(shade) / 255.0)
    lines = contour_lines(m, steps=(9, 22), width=2)
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    layer.alpha_composite(ht); layer.alpha_composite(lines)
    return layer, m

def rolling_number(img, xy, s, size, color, roll_last=2, frac=0.4):
    """Cifra en monoespaciada con los últimos dígitos girando (como un contador en movimiento)."""
    d = ImageDraw.Draw(img); f = font('monob', size)
    x, y = xy; cw = d.textlength('0', font=f)
    digits = [i for i, c in enumerate(s) if c.isdigit()]
    rolling = set(digits[-roll_last:]) if roll_last else set()
    asc, desc = f.getmetrics(); lh = asc + desc
    for i, c in enumerate(s):
        if i in rolling:
            # tira con el dígito actual y el siguiente; se ve una ventana del alto de la línea
            strip = Image.new('L', (int(cw) + 2, lh * 2), 0); sd = ImageDraw.Draw(strip)
            sd.text((1, 0), c, font=f, fill=255); sd.text((1, lh), str((int(c) + 1) % 10), font=f, fill=255)
            win = np.asarray(strip.crop((0, int(frac * lh), strip.width, int(frac * lh) + lh))).astype(np.float32)
            k = 15; pad = np.pad(win, ((k, k), (0, 0)))
            win = sum(pad[k + t:k + t + lh] for t in range(-k // 2, k // 2 + 1)) / k   # desenfoque vertical sin envolver
            img.paste(Image.new('RGBA', (strip.width, lh), color + (255,)), (int(x) - 1, int(y)),
                      Image.fromarray(win.clip(0, 255).astype(np.uint8)))
        else:
            d.text((x, y), c, font=f, fill=color)
        x += cw

# ---------------------------------------------------------------- 1. portada
img = background(1).convert('RGBA'); d = ImageDraw.Draw(img)
headline(img, ['¿Cuánto cuesta', 'un T. rex?'], y=170, size=96, accent=({'T.', 'rex'}, AMBER))
f_layer, m = fossil(1000, flip=False)
# suelo / estrato bajo las patas
gy = 1235
d.rectangle([0, gy, W, H], fill=BG2)
for i in range(0, W, 14): d.line([i, gy, i + 6, gy], fill=BONE_DIM, width=2)
img.alpha_composite(f_layer, (40, gy - f_layer.height + 6))
label(d, (60, gy + 34), 'TYRANNOSAURUS REX · CRETÁCICO SUPERIOR', 22)
label(d, (W - 60, gy + 34), '≈ 12 m', 22, anchor='ra')
d = ImageDraw.Draw(img)
label(d, (W / 2, 1420), 'PRECIO FINAL EN SUBASTA', 28, BONE_DIM, anchor='ma', bold=True)
rolling_number(img, (95, 1470), 'USD 31.800.000', 92, AMBER, roll_last=0)
d = ImageDraw.Draw(img)
d.line([95, 1600, W - 95, 1600], fill=AMBER, width=3)
label(d, (95, 1625), 'T. REX «STAN» · CHRISTIE\'S NUEVA YORK · 2020', 26, BONE)
img.convert('RGB').save(os.path.join(OUT, '1_portada.png'))

# ---------------------------------------------------------------- 2. capas de la tierra
img = background(2).convert('RGBA'); d = ImageDraw.Draw(img)
headline(img, ['66 millones', 'de años bajo tierra'], y=150, size=80, accent=({'66', 'millones'}, AMBER))
layers = [(560, 'SUELO ACTUAL', 'grass'), (690, 'ARENISCAS', 'dots'), (900, 'LUTITAS', 'lines'),
          (1120, 'CARBÓN', 'dark'), (1330, 'FORMACIÓN HELL CREEK · CRETÁCICO SUPERIOR', 'bone'), (1920, None, None)]
cols = {'grass': (40, 36, 30), 'dots': (52, 45, 38), 'lines': (44, 39, 34), 'dark': (26, 24, 22), 'bone': (60, 50, 40)}
for (y0, name, kind), (y1, *_ ) in zip(layers[:-1], layers[1:]):
    # borde superior ondulado
    xs = np.arange(0, W + 20, 20)
    top = [(x, y0 + 10 * math.sin(x / 90 + y0)) for x in xs]
    d.polygon(top + [(W, y1 + 30), (0, y1 + 30)], fill=cols[kind])
    if kind == 'dots':
        rng = np.random.default_rng(y0)
        for _ in range(900):
            x, y = rng.uniform(0, W), rng.uniform(y0 + 15, y1)
            r = rng.uniform(1, 3); d.ellipse([x - r, y - r, x + r, y + r], fill=(90, 80, 68))
    if kind == 'lines':
        for y in range(y0 + 25, y1, 22):
            d.line([(x, y + 4 * math.sin(x / 70 + y)) for x in range(0, W + 10, 10)], fill=(70, 63, 55), width=2)
    d.line(top, fill=BONE_DIM, width=2)
    if name: label(d, (150, y0 + 26), name, 24, BONE_DIM if kind != 'bone' else AMBER, bold=kind == 'bone')
# regla de profundidad
for i, y in enumerate(range(560, 1880, 110)):
    d.line([60, y, 90 if i % 2 else 110, y], fill=BONE, width=2)
    if i % 2 == 0: label(d, (118, y - 14), f'-{i // 2 * 2} m' if i else '0 m', 20, BONE)
d.line([60, 560, 60, 1880], fill=BONE, width=2)
# fósil tumbado en la capa inferior, con la cuadrícula de excavación encima
fl, m = fossil(820, flip=True)
fl = fl.rotate(-11, expand=True, resample=Image.BICUBIC)
img.alpha_composite(fl, (190, 1450))
d = ImageDraw.Draw(img)
gx0, gy0, gx1, gy1 = 170, 1400, 1040, 1800
for x in range(gx0, gx1 + 1, 145):
    for y in range(gy0, gy1, 18): d.line([x, y, x, y + 9], fill=AMBER, width=2)
for y in range(gy0, gy1 + 1, 100):
    for x in range(gx0, gx1, 18): d.line([x, y, x + 9, y], fill=AMBER, width=2)
for x in range(gx0, gx1 + 1, 145): d.rectangle([x - 5, gy0 - 22, x + 5, gy0], fill=AMBER)
label(d, (gx1, gy1 + 16), 'CUADRÍCULA 1 × 1 m', 20, AMBER, anchor='ra')
img.convert('RGB').save(os.path.join(OUT, '2_capas.png'))

# ---------------------------------------------------------------- 3. ficha de subasta
img = background(3).convert('RGBA'); d = ImageDraw.Draw(img)
headline(img, ['casi 4 veces', 'lo que esperaban'], y=170, size=84, accent=({'4', 'veces'}, AMBER))
card = Image.new('RGBA', (840, 980), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
cd.rounded_rectangle([0, 0, 839, 979], 18, fill=BONE)
paper = np.asarray(card).astype(np.int16)
paper[..., :3] += np.random.default_rng(5).normal(0, 6, paper.shape[:2])[..., None].astype(np.int16)
card = Image.fromarray(np.clip(paper, 0, 255).astype(np.uint8)); cd = ImageDraw.Draw(card)
cd.rectangle([0, 0, 839, 110], fill=INK); cd.rounded_rectangle([0, 0, 839, 30], 18, fill=INK)
cd.text((48, 34), 'LOTE · SUBASTA', font=font('monob', 34), fill=BONE)
cd.text((792, 34), 'N.º 001', font=font('mono', 30), fill=AMBER, anchor='ra')
rows = [('ESPÉCIMEN', 'Tyrannosaurus rex'), ('APODO', '«Stan» · BHI 3033'), ('CASA', "Christie's, Nueva York"),
        ('FECHA', '6 de octubre de 2020'), ('ESTIMADO', 'USD 6 – 8 millones')]
y = 160
for k, v in rows:
    cd.text((48, y), k, font=font('mono', 24), fill=(110, 100, 88))
    cd.text((48, y + 32), v, font=font('head', 44), fill=INK)
    cd.line([48, y + 102, 792, y + 102], fill=(190, 178, 158), width=2)
    y += 128
cd.text((48, y + 10), 'PRECIO FINAL', font=font('mono', 24), fill=(110, 100, 88))
cd.text((48, y + 40), 'USD 31,8 M', font=font('monob', 92), fill=(196, 120, 0))
# sello
st = Image.new('RGBA', (360, 140), (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
sd.rounded_rectangle([4, 4, 355, 135], 14, outline=RUST, width=8)
sd.text((180, 70), 'VENDIDO', font=font('head', 64), fill=RUST, anchor='mm')
st = st.rotate(12, expand=True, resample=Image.BICUBIC)
a = np.asarray(st).copy(); a[..., 3] = (a[..., 3] * (np.random.default_rng(9).random(a.shape[:2]) > 0.18)).astype(np.uint8)
card.alpha_composite(Image.fromarray(a), (450, 690))
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([130, 560, 970, 1540], 18, fill=(0, 0, 0, 170))
img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))
card = card.rotate(-2.5, expand=True, resample=Image.BICUBIC)
img.alpha_composite(card, (W // 2 - card.width // 2, 520))
d = ImageDraw.Draw(img)
# martillo de subasta: base + mazo inclinado, en trazo ámbar
gx, gy = 770, 1700
d.rounded_rectangle([gx - 120, gy + 40, gx + 120, gy + 70], 10, outline=AMBER, width=4)
hammer = Image.new('RGBA', (420, 160), (0, 0, 0, 0)); hd = ImageDraw.Draw(hammer)
hd.rounded_rectangle([20, 20, 150, 140], 16, outline=AMBER, width=5)
hd.line([60, 20, 60, 140], fill=AMBER, width=4); hd.line([110, 20, 110, 140], fill=AMBER, width=4)
hd.rounded_rectangle([150, 70, 400, 90], 8, outline=AMBER, width=4)
hammer = hammer.rotate(28, expand=True, resample=Image.BICUBIC)
img.alpha_composite(hammer, (gx - 150, gy - 230))
d = ImageDraw.Draw(img)
for k, r in enumerate((40, 62)):
    d.arc([gx - 95 - r, gy + 30 - r, gx - 95 + r, gy + 30 + r], 190, 260, fill=AMBER, width=3)
img.convert('RGB').save(os.path.join(OUT, '3_ficha_subasta.png'))

# ---------------------------------------------------------------- 4. escala
img = background(4).convert('RGBA'); d = ImageDraw.Draw(img)
headline(img, ['tan largo como', 'un colectivo'], y=170, size=88, accent=({'colectivo'}, AMBER))
base = 1250; px_m = 80                         # 1 m = 80 px → 12 m ≈ 960 px
for x in range(60, W - 40, px_m): d.line([x, 560, x, base], fill=(40, 37, 34), width=1)
for y in range(base, 540, -px_m): d.line([60, y, W - 60, y], fill=(40, 37, 34), width=1)
fl, m = fossil(12 * px_m - 10)
img.alpha_composite(fl, (60, base - fl.height))
d = ImageDraw.Draw(img)
# colectivo urbano (≈ 12 m × 3 m) en línea de trazo ámbar, debajo
by = 1660; bx0 = 60; bx1 = bx0 + 12 * px_m
d.rounded_rectangle([bx0, by - 3 * px_m, bx1, by - 20], 26, outline=AMBER, width=5)
for x in range(bx0 + 70, bx1 - 120, 112): d.rounded_rectangle([x, by - 3 * px_m + 30, x + 90, by - 3 * px_m + 110], 8, outline=AMBER, width=3)
for cx in (bx0 + 170, bx1 - 190):
    d.ellipse([cx - 42, by - 62, cx + 42, by + 22], fill=BG, outline=AMBER, width=5)
d.line([40, by + 24, W - 40, by + 24], fill=BONE_DIM, width=2)
# persona 1,75 m
px = W - 120
d.ellipse([px - 14, base - 1.75 * px_m, px + 14, base - 1.75 * px_m + 28], fill=BONE)
d.rounded_rectangle([px - 16, base - 1.75 * px_m + 30, px + 16, base - 0.8 * px_m], 10, fill=BONE)
d.rectangle([px - 14, base - 0.8 * px_m, px - 3, base], fill=BONE); d.rectangle([px + 3, base - 0.8 * px_m, px + 14, base], fill=BONE)
label(d, (px, base - 1.75 * px_m - 40), '1,75 m', 20, BONE, anchor='ma')
# cotas
def dim(y, x0, x1, txt, col):
    d.line([x0, y, x1, y], fill=col, width=3); d.line([x0, y - 12, x0, y + 12], fill=col, width=3); d.line([x1, y - 12, x1, y + 12], fill=col, width=3)
    tw = d.textlength(txt, font=font('monob', 30)); d.rectangle([(x0 + x1) / 2 - tw / 2 - 12, y - 22, (x0 + x1) / 2 + tw / 2 + 12, y + 22], fill=BG)
    label(d, ((x0 + x1) / 2, y - 19), txt, 30, col, anchor='ma', bold=True)
dim(base + 60, 60, 60 + 12 * px_m, 'T. REX ≈ 12 m', BONE)
dim(by + 70, bx0, bx1, 'COLECTIVO ≈ 12 m', AMBER)
img.convert('RGB').save(os.path.join(OUT, '4_escala.png'))
print('ok')
