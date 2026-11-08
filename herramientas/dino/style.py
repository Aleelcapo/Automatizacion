"""Sistema visual "Archivo de excavación": paleta, tipografías, texturas y piezas reutilizables (cuadros 1080×1920)."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H = 1080, 1920
ROOT = os.environ.get('DINO_WORK', '/home/user/Automatizacion/work/dino')
FONTS = os.path.join(ROOT, 'dl/font')

# paleta fija del canal: carbón cálido, hueso, ámbar (dinero) y óxido (ilegal / perdido)
BG = (20, 18, 17)
BG2 = (31, 28, 26)
BONE = (237, 227, 207)
BONE_DIM = (150, 142, 128)
AMBER = (255, 176, 32)
RUST = (217, 72, 43)
INK = (12, 11, 10)

def font(kind, size):
    f = {'head': 'ArchivoBlack-Regular.ttf', 'mono': 'IBMPlexMono-Medium.ttf', 'monob': 'IBMPlexMono-Bold.ttf',
         'sans': 'SpaceGrotesk.ttf'}[kind]
    return ImageFont.truetype(os.path.join(FONTS, f), size)

def grain(img, amount=10, seed=0):
    """Grano de sedimento: ruido fino más motas grandes muy tenues."""
    rng = np.random.default_rng(seed)
    a = np.asarray(img).astype(np.int16)
    n = rng.normal(0, amount, a.shape[:2])[..., None]
    specks = (rng.random(a.shape[:2]) > 0.9985)[..., None] * 35
    return Image.fromarray(np.clip(a + n + specks, 0, 255).astype(np.uint8))

def background(seed=0):
    img = Image.new('RGB', (W, H), BG)
    # viñeta suave hacia los bordes
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    a = np.asarray(img).astype(np.float32) * (1.08 - 0.5 * d[..., None])
    return grain(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), 7, seed)

def halftone(mask, cell=9, color=BONE, shade=None, angle=0):
    """Rellena una máscara (L) con puntos de semitono; `shade` (0..1, mismo tamaño) modula el radio."""
    w, h = mask.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(out)
    m = np.asarray(mask)
    s = np.asarray(shade) if shade is not None else None
    for y in range(cell // 2, h, cell):
        off = (cell // 2) if (y // cell) % 2 else 0
        for x in range(cell // 2 + off, w, cell):
            if m[y, x] < 128: continue
            k = 0.85 if s is None else float(s[y, x])
            r = cell * 0.5 * k
            if r < 0.6: continue
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    return out

def contour_lines(mask, steps=(6, 18, 34), color=BONE, width=2):
    """Líneas interiores paralelas al borde (erosiones sucesivas): aspecto de grabado / radiografía."""
    out = Image.new('RGBA', mask.size, (0, 0, 0, 0))
    edge = lambda m: ImageChops.subtract(m, m.filter(ImageFilter.MinFilter(2 * width + 1)))
    out.paste(Image.new('RGBA', mask.size, color + (255,)), (0, 0), edge(mask))
    m, done = mask, 0
    for s in sorted(steps):
        while done < s:                     # erosión acumulada de 1 px por paso
            m = m.filter(ImageFilter.MinFilter(3)); done += 1
        e = edge(m).point(lambda v: int(v * 0.45))
        out.paste(Image.new('RGBA', mask.size, color + (255,)), (0, 0), e)
    return out

def text(d, xy, s, f, fill, anchor='la', spacing=0):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)

def headline(img, lines, y=150, size=86, accent=None):
    """Frase clave arriba, centrada, en hueso; las palabras de `accent` van en ámbar."""
    d = ImageDraw.Draw(img); f = font('head', size)
    for i, ln in enumerate(lines):
        words = ln.split(' ')
        widths = [d.textlength(w + ' ', font=f) for w in words]
        x = (W - (sum(widths) - d.textlength(' ', font=f))) / 2
        for w, wd in zip(words, widths):
            col = accent[1] if accent and w.strip('¿?.,') in accent[0] else BONE
            d.text((x, y + i * size * 1.12), w, font=f, fill=col)
            x += wd

def label(d, xy, s, size=26, fill=BONE_DIM, anchor='la', bold=False):
    d.text(xy, s, font=font('monob' if bold else 'mono', size), fill=fill, anchor=anchor)

def dino_mask(path, width, color_key=None):
    """Silueta del dinosaurio como máscara L del ancho pedido."""
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    if color_key == 'purple':
        m = (a[..., 2] - a[..., 1] > 35) & (a[..., 2] > 120)
    else:
        m = a.sum(-1) < 200
    m = Image.fromarray((m * 255).astype(np.uint8))
    bb = m.getbbox(); m = m.crop(bb)
    h = round(m.height * width / m.width)
    return m.resize((width, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: 255 if v > 120 else 0)
