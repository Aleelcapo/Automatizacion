"""Video 1 del nicho fósiles: "3 T. rex, 3 precios" (estilo Archivo de excavación).

Uso: tres_trex.py <dir_trabajo> <salida.mp4> [--workers 4]
Lee timings.json (tiempos por palabra) del directorio de trabajo; escribe cuadros PNG y los codifica.
"""
import os, sys, math, json, argparse, subprocess, functools, numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from style import *

FPS = 30
SUE = os.path.join(ROOT, 'dl/img/Tyrannosaurus_rex-sue.JPG')

# ---------------------------------------------------------------- utilidades de tiempo
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, t0, dur): return clamp((t - t0) / dur)
def ease_out(x): return 1 - (1 - x) ** 3
def ease_io(x): return 3 * x * x - 2 * x * x * x
def back_out(x, s=1.7): x -= 1; return 1 + x * x * ((s + 1) * x + s)

# ---------------------------------------------------------------- recursos precalculados
class Assets:
    def __init__(self):
        self.bg = [background(s) for s in range(6)]          # grano animado a 12 fps
        self.fossil = {}

    def fossil_layers(self, width, colors=None, cuts=None):
        """Capa de semitono + contorno del T. rex. Con `cuts`, cada tramo en x lleva su color."""
        key = (width, tuple(colors or ()), tuple(cuts or ()))
        if key in self.fossil: return self.fossil[key]
        m = dino_mask(SUE, width, 'purple'); w, h = m.size
        yy = np.linspace(0.55, 1.0, h)[:, None] * np.ones((1, w))
        shade = np.clip(1.05 - yy * 0.55, 0, 1)
        parts = []
        bounds = [0] + [int(c * w) for c in (cuts or [])] + [w]
        cols = colors or [BONE]
        for i, (x0, x1) in enumerate(zip(bounds[:-1], bounds[1:])):
            pm = Image.new('L', (w, h), 0); pm.paste(m.crop((x0, 0, x1, h)), (x0, 0))
            col = cols[i % len(cols)]
            lay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            lay.alpha_composite(halftone(pm, cell=8, color=col, shade=shade))
            lay.alpha_composite(contour_lines(pm, steps=(9, 22), color=col, width=2))
            parts.append((x0, x1, lay))
        edge = contour_lines(m, steps=(), color=BONE_DIM, width=2)   # solo el borde: hueso que falta
        self.fossil[key] = (m, parts, edge)
        return self.fossil[key]

A = None

def paste_fossil(img, width, xy, reveal=1.0, alpha=1.0, colors=None, cuts=None, offsets=None, flip=False):
    """Dibuja el fósil; `reveal` (0..1) marca qué fracción tiene hueso, el resto queda solo en contorno."""
    m, parts, edge = A.fossil_layers(width, colors, cuts)
    w, h = m.size
    x, y = int(xy[0]), int(xy[1])
    def put(layer, dx=0, dy=0):
        if flip: layer = layer.transpose(Image.FLIP_LEFT_RIGHT)
        if alpha < 1:
            a = np.asarray(layer).copy(); a[..., 3] = (a[..., 3] * alpha).astype(np.uint8); layer = Image.fromarray(a)
        img.alpha_composite(layer, (x + int(dx), y + int(dy)))
    if reveal < 1:
        put(edge)
    for i, (x0, x1, lay) in enumerate(parts):
        dx, dy = offsets[i] if offsets else (0, 0)
        if reveal < 1:
            # el hueso aparece desde la cabeza (derecha) hacia la cola: lo que falta queda en la cola
            cut = int(w * (1 - reveal))
            if cut >= x1: continue
            lay = lay.copy(); ImageDraw.Draw(lay).rectangle([0, 0, cut, h], fill=(0, 0, 0, 0))
        put(lay, dx, dy)
    return w, h

# ---------------------------------------------------------------- piezas gráficas
def fmt_usd(v):
    return 'USD ' + f'{int(round(v)):,}'.replace(',', '.')

def counter(img, cx, y, value, size, color, label=None, prefix=''):
    d = ImageDraw.Draw(img); f = font('monob', size)
    s = prefix + fmt_usd(value)
    d.text((cx, y), s, font=f, fill=color, anchor='ma')
    if label: label_c(d, cx, y - 44, label, 26)

def label_c(d, cx, y, s, size=26, fill=BONE_DIM, bold=True):
    d.text((cx, y), s, font=font('monob' if bold else 'mono', size), fill=fill, anchor='ma')

def bone_bar(img, x, y, w, frac, target_txt, color=AMBER):
    d = ImageDraw.Draw(img)
    label(d, (x, y - 40), 'HUESOS RECUPERADOS', 24, BONE_DIM, bold=True)
    d.rectangle([x, y, x + w, y + 26], outline=BONE_DIM, width=2)
    seg = 40
    for i in range(seg):
        if (i + 0.5) / seg > frac: break
        sx = x + 4 + i * (w - 8) / seg
        d.rectangle([sx, y + 5, sx + (w - 8) / seg - 4, y + 21], fill=color)
    label(d, (x + w, y - 40), target_txt, 30, color, anchor='ra', bold=True)

def chip(img, cx, y, txt, k, color=BONE, fg=INK, size=38):
    """Etiqueta tipo cinta que aparece con rebote (k 0..1)."""
    if k <= 0: return
    s = back_out(clamp(k))
    f = font('monob', size); d0 = ImageDraw.Draw(img)
    tw = d0.textlength(txt, font=f); pw, ph = int(tw + 44), int(size * 1.6)
    tile = Image.new('RGBA', (pw, ph), (0, 0, 0, 0)); td = ImageDraw.Draw(tile)
    td.rectangle([0, 0, pw - 1, ph - 1], fill=color)
    td.text((pw / 2, ph / 2 + 2), txt, font=f, fill=fg, anchor='mm')
    tile = tile.resize((max(1, int(pw * s)), max(1, int(ph * s))), Image.BICUBIC).rotate(-3, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(tile, (int(cx - tile.width / 2), int(y)))

def stamp(img, cx, cy, txt, k, color=RUST, size=60, angle=10):
    if k <= 0: return
    s = 1 + 1.4 * (1 - ease_out(clamp(k)))
    a = clamp(k * 3)
    f = font('head', size); d0 = ImageDraw.Draw(img)
    tw = d0.textlength(txt, font=f); pw, ph = int(tw + 60), int(size * 1.9)
    tile = Image.new('RGBA', (pw, ph), (0, 0, 0, 0)); td = ImageDraw.Draw(tile)
    td.rounded_rectangle([4, 4, pw - 5, ph - 5], 12, outline=color, width=7)
    td.text((pw / 2, ph / 2), txt, font=f, fill=color, anchor='mm')
    arr = np.asarray(tile).copy()
    arr[..., 3] = (arr[..., 3] * (np.random.default_rng(7).random(arr.shape[:2]) > 0.16) * a).astype(np.uint8)
    tile = Image.fromarray(arr).rotate(angle, expand=True, resample=Image.BICUBIC)
    tile = tile.resize((int(tile.width * s), int(tile.height * s)), Image.BICUBIC)
    img.alpha_composite(tile, (int(cx - tile.width / 2), int(cy - tile.height / 2)))

def name_card(img, x, y, name, sub, k):
    if k <= 0: return
    e = ease_out(clamp(k))
    d = ImageDraw.Draw(img)
    f1, f2 = font('head', 54), font('mono', 24)
    w = max(d.textlength(name, font=f1), d.textlength(sub, font=f2)) + 56
    xx = x - (1 - e) * 60
    card = Image.new('RGBA', (int(w), 118), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
    cd.rectangle([0, 0, w - 1, 117], fill=BONE); cd.rectangle([0, 0, 10, 117], fill=AMBER)
    cd.text((30, 12), name, font=f1, fill=INK); cd.text((30, 80), sub, font=f2, fill=(90, 82, 72))
    a = np.asarray(card).copy(); a[..., 3] = (a[..., 3] * e).astype(np.uint8)
    img.alpha_composite(Image.fromarray(a), (int(xx), int(y)))

# ---------------------------------------------------------------- titulares (frases clave)
HEADS = []   # (t, lines, accent_words) — se completa en build_heads

def draw_heads(img, t):
    cur = [h for h in HEADS if h[0] <= t]
    if not cur: return
    t0, lines, acc = cur[-1]
    k = ease_out(prog(t, t0, 0.22))
    layer = Image.new('RGBA', (W, 430), (0, 0, 0, 0))
    n = len(lines); size = 92 if max(len(l) for l in lines) <= 16 else 80
    y0 = 200 - (n - 1) * size * 0.56
    headline(layer, lines, y=y0 + (1 - k) * 26, size=size, accent=(set(acc), AMBER))
    if k < 1:
        a = np.asarray(layer).copy(); a[..., 3] = (a[..., 3] * k).astype(np.uint8); layer = Image.fromarray(a)
    img.alpha_composite(layer, (0, 0))

# ---------------------------------------------------------------- escenas
ROWS = [('SUE', 1997, 8_360_000), ('STAN', 2020, 31_800_000), ('TRINITY', 2023, 6_000_000)]

def scene_intro(img, t, T, final=False):
    """Tres T. rex en fila; precios ocultos (o finales en el cierre)."""
    for i, (name, yr, price) in enumerate(ROWS):
        y = 540 + i * 400
        k = ease_out(prog(t, 0.15 + i * 0.18, 0.55)) if not final else ease_out(prog(t, T['final'] + i * 0.12, 0.45))
        x = 50 + (1 - k) * 700
        if final: x = 50
        cols = [BONE, AMBER, RUST] if (final and name == 'TRINITY') else None
        cuts = [0.36, 0.68] if cols else None
        paste_fossil(img, 560, (x, y + 20), alpha=k if not final else 1, colors=cols, cuts=cuts)
        d = ImageDraw.Draw(img)
        label(d, (x + 4, y - 18), f'T. REX · {name}', 26, BONE, bold=True)
        if final:
            kk = ease_out(prog(t, T['final'] + 0.2 + i * 0.15, 0.4))
            txt = {'SUE': '8,36 M', 'STAN': '31,8 M', 'TRINITY': '≈ 6 M'}[name]
            col = AMBER if name != 'TRINITY' else RUST
            d.text((1030, y + 80), txt, font=font('monob', 64), fill=col + (int(255 * kk),), anchor='ra')
            label(d, (1030, y + 160), f'USD · {yr}', 24, BONE_DIM, anchor='ra')
        else:
            # precio desconocido: dígitos que giran al azar
            rng = np.random.default_rng(int(t * 12) + i * 100)
            s = 'USD ' + ''.join(str(v) for v in rng.integers(0, 10, 2)) + ' M'
            q = clamp((t - 0.6 - i * 0.18) * 3)
            d.text((1030, y + 80), s if t < T['sue'] - 0.6 else 'USD ??', font=font('monob', 56),
                   fill=AMBER + (int(255 * q),), anchor='ra')

def scene_specimen(img, t, s):
    """Ficha de un ejemplar: fósil grande con % de huesos, año y precio."""
    k_in = ease_out(prog(t, s['t0'], 0.5))
    fx = 40 + (1 - k_in) * 120
    fr = s['pct'] * ease_io(prog(t, s['bar0'], 1.1))
    reveal = max(fr, 0.02) if t >= s['bar0'] else (0.0 if s['pct'] < 1 else 1.0)
    paste_fossil(img, 1000, (fx, 560), reveal=reveal if t >= s['t0'] + 0.2 else 0.0, alpha=k_in)
    name_card(img, 60, 470, s['name'], s['sub'], prog(t, s['t0'] + 0.15, 0.45))
    if t >= s['bar0'] - 0.3:
        bone_bar(img, 60, 1080, 960, fr, f"{round(fr * 100)} %")
    chip(img, 870, 445, str(s['year']), prog(t, s['year_t'], 0.35), color=AMBER)
    if t >= s['cnt0']:
        v = s['price'] * ease_out(prog(t, s['cnt0'], s['cnt_dur']))
        counter(img, W / 2, 1300, v, 98, AMBER, label='PRECIO FINAL EN SUBASTA')
        if t >= s['cnt0'] + s['cnt_dur']:
            stamp(img, 820, 1530, 'VENDIDO', prog(t, s['cnt0'] + s['cnt_dur'], 0.25))

def scene_moment(img, t, T):
    """Gráfico: récord de precio por año, la línea se dispara."""
    d = ImageDraw.Draw(img)
    x0, x1, y0, y1 = 130, 1000, 1500, 640          # ejes: años 1995–2025, millones 0–35
    k = ease_out(prog(t, T['moment'], 0.5))
    X = lambda yr: x0 + (yr - 1995) / 30 * (x1 - x0)
    Y = lambda mm: y0 - mm / 35 * (y0 - y1)
    d.line([x0, y0, x0 + (x1 - x0) * k, y0], fill=BONE_DIM, width=3)
    d.line([x0, y0, x0, y0 - (y0 - y1) * k], fill=BONE_DIM, width=3)
    for yr in (2000, 2010, 2020):
        d.line([X(yr), y0, X(yr), y0 + 14], fill=BONE_DIM, width=2); label(d, (X(yr), y0 + 24), str(yr), 24, BONE_DIM, anchor='ma')
    for mm in (10, 20, 30):
        for xx in range(x0, x1, 22): d.line([xx, Y(mm), xx + 10, Y(mm)], fill=(48, 44, 40), width=2)
        label(d, (x0 - 14, Y(mm) - 14), f'{mm} M', 26, BONE_DIM, anchor='ra')
    pts = [(1997, 8.36), (2020, 31.8)]
    lk = ease_io(prog(t, T['momento'], 1.0))
    if lk > 0:
        (ax, ay), (bx, by) = [(X(a), Y(b)) for a, b in pts]
        d.line([ax, ay, ax + (bx - ax) * lk, ay + (by - ay) * lk], fill=AMBER, width=8)
    for i, (yr, mm) in enumerate(pts):
        kk = back_out(prog(t, T['momento'] + i * 1.0, 0.35))
        if kk <= 0: continue
        r = 16 * kk; cx, cy = X(yr), Y(mm)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=AMBER)
        nm = ('SUE', 'STAN')[i]
        label(d, (cx + (24 if i == 0 else -24), cy - 64), f"{nm} · {str(mm).replace('.', ',')} M", 30, BONE, anchor='la' if i == 0 else 'ra', bold=True)
    # "fiebre": partículas de dinero que suben cuando los precios se disparan
    pk = prog(t, T['moda'], 4.0)
    if pk > 0:
        rng = np.random.default_rng(3)
        for j in range(60):
            sx = rng.uniform(x0 + 40, x1); sp = rng.uniform(120, 340); ph = rng.uniform(0, 3)
            age = (t - T['moda']) - ph * 0.6
            if age < 0: continue
            yy = y0 - 40 - (age * sp) % (y0 - 520)
            r = rng.uniform(4, 10)
            d.ellipse([sx - r, yy - r, sx + r, yy + r], outline=AMBER, width=3)
    if t >= T['dispararon']:
        kk = ease_out(prog(t, T['dispararon'], 0.5))
        bx, by = X(2020), Y(31.8)
        d.line([bx, by, bx + 60 * kk, by - 260 * kk], fill=AMBER, width=8)
        if kk > 0.9:
            d.polygon([(bx + 60, by - 300), (bx + 36, by - 250), (bx + 86, by - 252)], fill=AMBER)

def scene_trinity(img, t, T):
    k_in = ease_out(prog(t, T['trinity'], 0.5))
    split = ease_io(prog(t, T['armaron'], 0.8)) - ease_io(prog(t, T['coleccionistas'], 0.7))
    cols = [BONE, AMBER, RUST]
    offs = [(-70 * split, 50 * split), (0, -60 * split), (70 * split, 50 * split)]
    colored = t >= T['solo'] + 0.2
    paste_fossil(img, 1000, (40 + (1 - k_in) * 120, 640), alpha=k_in,
                 colors=cols if colored else None, cuts=[0.36, 0.68] if colored else None, offsets=offs if colored else None)
    name_card(img, 60, 470, 'TRINITY', 'Koller, Zúrich · 2023', prog(t, T['trinity'] + 0.1, 0.45))
    chip(img, 870, 445, '2023', prog(t, T['trinity'] + 0.3, 0.35), color=AMBER)
    if T['apenas'] <= t:
        v = 6_000_000 * ease_out(prog(t, T['apenas'], 0.8))
        counter(img, W / 2, 1380, v, 98, AMBER, label='PRECIO FINAL EN SUBASTA', prefix='≈ ')
    if split > 0.05:
        d = ImageDraw.Draw(img)
        for i, (lx, nm) in enumerate(((180, 'ANIMAL A'), (560, 'ANIMAL B'), (880, 'ANIMAL C'))):
            label(d, (lx, 1160 + (0 if i != 1 else -40)), nm, 28, cols[i] + (int(255 * min(1, split * 1.5)),), anchor='ma', bold=True)
    stamp(img, 800, 1610, '3 EN 1', prog(t, T['coleccionistas'] + 0.4, 0.25))

def scene_factors(img, t, T):
    items = [(T['cuantos'], '01', 'CUÁNTOS HUESOS', 'bar'), (T['si_son'], '02', 'DEL MISMO ANIMAL', 'split'),
             (T['cuando'], '03', 'CUÁNDO SE VENDE', 'year')]
    for i, (t0, num, txt, kind) in enumerate(items):
        k = ease_out(prog(t, t0 - 0.1, 0.4))
        y = 560 + i * 330
        # casillero vacío numerado mientras la voz anuncia "tres cosas"
        ks = ease_out(prog(t, T['asi'] + 0.3 + i * 0.15, 0.4))
        if ks > 0 and k < 1:
            d = ImageDraw.Draw(img); a_ = int(255 * ks * (1 - k))
            for xx in range(60, 1020, 24): d.line([xx, y, xx + 12, y], fill=BONE_DIM + (a_,), width=2); d.line([xx, y + 269, xx + 12, y + 269], fill=BONE_DIM + (a_,), width=2)
            for yy in range(y, y + 270, 24): d.line([60, yy, 60, yy + 12], fill=BONE_DIM + (a_,), width=2); d.line([1019, yy, 1019, yy + 12], fill=BONE_DIM + (a_,), width=2)
            d.text((96, y + 26), num, font=font('monob', 40), fill=BONE_DIM + (a_,))
            d.text((540, y + 135), '?', font=font('head', 90), fill=BONE_DIM + (a_,), anchor='mm')
        if k <= 0: continue
        x = 60 + (1 - k) * 200
        card = Image.new('RGBA', (960, 270), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
        cd.rectangle([0, 0, 959, 269], fill=BG2, outline=(70, 64, 58), width=2)
        cd.text((36, 26), num, font=font('monob', 40), fill=AMBER)
        cd.text((36, 190), txt, font=font('head', 50), fill=BONE, anchor='ls')
        if kind == 'bar':
            for j in range(10):
                cd.rectangle([600 + j * 32, 70, 624 + j * 32, 160], fill=AMBER if j < 9 else (60, 55, 50))
        elif kind == 'split':
            for j, c in enumerate((BONE, AMBER, RUST)):
                cd.rounded_rectangle([600 + j * 105, 70 + (j % 2) * 30, 690 + j * 105, 140 + (j % 2) * 30], 10, fill=c)
        else:
            cd.text((780, 115), '1997 → 2020', font=font('monob', 40), fill=AMBER, anchor='mm')
        a = np.asarray(card).copy(); a[..., 3] = (a[..., 3] * k).astype(np.uint8)
        img.alpha_composite(Image.fromarray(a), (int(x), y))

# ---------------------------------------------------------------- guion visual
def build(T):
    """Escenas con su intervalo; las transiciones empujan hacia arriba con fundido."""
    sue = dict(name='SUE', sub='Field Museum, Chicago · 90 %', year=1997, price=8_360_000, pct=0.9,
               t0=T['sue'], bar0=T['casi'], year_t=T['1997'], cnt0=T['vendio1'], cnt_dur=1.1)
    stan = dict(name='STAN', sub="Christie's, Nueva York · 70 %", year=2020, price=31_800_000, pct=0.7,
                t0=T['stan'], bar0=T['70'] - 0.3, year_t=T['2020'], cnt0=T['vendio2'], cnt_dur=1.0)
    return [
        (0.0, T['sue'], lambda img, t: scene_intro(img, t, T)),
        (T['sue'], T['stan'], lambda img, t: scene_specimen(img, t, sue)),
        (T['stan'], T['diferencia'], lambda img, t: scene_specimen(img, t, stan)),
        (T['diferencia'], T['trinity'], lambda img, t: scene_moment(img, t, T)),
        (T['trinity'], T['asi'], lambda img, t: scene_trinity(img, t, T)),
        (T['asi'], T['final'], lambda img, t: scene_factors(img, t, T)),
        (T['final'], 999, lambda img, t: scene_intro(img, t, T, final=True)),
    ]

def word_times(words):
    def at(tok, n=1):
        c = 0
        for w in words:
            if w['text'].lower().strip('¿?.,:;') == tok:
                c += 1
                if c == n: return w['start']
        raise KeyError(tok)
    T = dict(sue=at('sue') - 0.15, casi=at('casi'), **{'1997': at('1997')}, vendio1=at('vendió'),
             stan=at('stan') - 0.15, **{'70': at('70'), '2020': at('2020')}, vendio2=at('vendió', 2),
             diferencia=at('diferencia') - 0.25, moment=at('diferencia'), momento=at('momento'), moda=at('moda'),
             dispararon=at('dispararon'), trinity=at('trinity') - 0.25, apenas=at('apenas'), barato=at('barato'),
             solo=at('solo'), armaron=at('armaron'), coleccionistas=at('coleccionistas'),
             asi=at('así') - 0.15, cuantos=at('cuántos'), si_son=at('si'), cuando=at('cuándo'), final=at('cuál') - 0.15)
    T['por_que_sera'] = at('será') - 0.3
    T['cosas'] = at('cosas'); T['depende'] = at('depende'); T['autentico'] = at('auténtico')
    T['tres_trex'] = at('tres', 2); T['completo'] = at('completo'); T['huesos'] = at('huesos')
    T['menos'] = at('menos'); T['millonarios'] = at('millonarios'); T['no_es'] = at('no')
    return T

def build_heads(T):
    global HEADS
    HEADS = [
        (0.0, ['3 T. rex', '3 precios'], ['3', 'precios']),
        (T['por_que_sera'], ['¿por qué?'], ['por', 'qué']),
        (T['sue'], ['Sue', 'el más completo'], ['Sue']),
        (T['1997'] - 0.1, ['vendido en 1997'], ['1997']),
        (T['stan'], ['Stan', 'menos huesos'], ['Stan']),
        (T['2020'] - 0.2, ['pero en 2020…'], ['2020…']),
        (T['diferencia'], ['¿la diferencia?'], []),
        (T['momento'] - 0.1, ['el momento'], ['momento']),
        (T['moda'] - 0.3, ['de moda entre', 'millonarios'], ['millonarios']),
        (T['dispararon'] - 0.2, ['precios', 'por las nubes'], ['nubes']),
        (T['trinity'], ['Trinity'], ['Trinity']),
        (T['apenas'] - 0.1, ['apenas', '6 millones'], ['6', 'millones']),
        (T['barato'] - 0.4, ['¿por qué', 'tan barato?'], ['barato']),
        (T['no_es'] - 0.1, ['no es un solo', 'dinosaurio'], ['solo']),
        (T['armaron'], ['huesos de', '3 T. rex distintos'], ['3']),
        (T['coleccionistas'] - 0.1, ['pagan por', 'uno auténtico'], ['auténtico']),
        (T['asi'], ['el precio', 'depende de…'], []),
        (T['tres_trex'] if False else T['cosas'] - 0.2, ['3 cosas'], ['3']),
        (T['final'], ['¿cuál', 'comprarías?'], ['comprarías']),
    ]

# ---------------------------------------------------------------- render
def render_frame(i, T, scenes, outdir):
    t = i / FPS
    img = A.bg[(i // 3) % len(A.bg)].convert('RGBA')
    TR = 0.35
    for (a, b, fn) in scenes:
        if a - TR <= t < b + 0.0001 or (a <= t and b == 999):
            layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            fn(layer, t)
            k_in = ease_out(prog(t, a, TR)) if a > 0 else 1.0
            k_out = 1 - ease_io(prog(t, b - TR, TR)) if b != 999 else 1.0
            k = min(k_in, k_out)
            if t < a: continue
            dy = int((1 - k_in) * 140 - (1 - k_out) * 140)
            if k < 1:
                arr = np.asarray(layer).copy(); arr[..., 3] = (arr[..., 3] * k).astype(np.uint8); layer = Image.fromarray(arr)
            img.alpha_composite(layer, (0, dy))
    draw_heads(img, t)
    img.convert('RGB').save(os.path.join(outdir, f'{i:05d}.png'), compress_level=1)

def init_worker():
    global A
    A = Assets()

def run_chunk(args):
    lo, hi, T, outdir = args
    init_worker(); build_heads(T)
    scenes = build(T)
    for i in range(lo, hi): render_frame(i, T, scenes, outdir)
    return hi - lo

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('work'); ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=4); ap.add_argument('--only', type=str, default=None)
    a = ap.parse_args()
    tm = json.load(open(os.path.join(a.work, 'timings.json')))
    T = word_times(tm['words'])
    n = int(round(tm['duration'] * FPS))
    outdir = os.path.join(a.work, 'frames'); os.makedirs(outdir, exist_ok=True)
    if a.only:   # cuadros sueltos para revisar: --only 1.5,6,20
        init_worker(); build_heads(T); sc = build(T)
        for s in a.only.split(','): render_frame(int(float(s) * FPS), T, sc, outdir)
        sys.exit()
    from multiprocessing import Pool
    step = math.ceil(n / (a.workers * 4))
    jobs = [(lo, min(n, lo + step), T, outdir) for lo in range(0, n, step)]
    with Pool(a.workers) as p:
        done = 0
        for k in p.imap_unordered(run_chunk, jobs):
            done += k
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(outdir, '%05d.png'),
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', a.out], check=True)
    json.dump(T, open(os.path.join(a.work, 'T.json'), 'w'), indent=1)
    print('cuadros', n)
