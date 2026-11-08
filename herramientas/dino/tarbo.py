"""Video 2 del nicho fósiles: "El dinosaurio que Nicolas Cage tuvo que devolver".

Reusa el motor y las piezas de tres_trex.py (mismo estilo) y agrega cráneo, mapa con ruta y puja.
Uso: tarbo.py <dir_trabajo> <salida.mp4> [--workers 4] [--only 1.5,6]
"""
import os, sys, math, json
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import tres_trex as B
from tres_trex import clamp, prog, ease_out, ease_io, back_out, paste_fossil, counter, chip, stamp, name_card, label_c
from style import *
import shapefile

SHP = os.path.join(os.path.dirname(ROOT), 'dl/geo/ne_10m_admin_0_countries.shp')
_cache = {}

# ---------------------------------------------------------------- cráneo (recorte de la cabeza de la silueta)
def skull_layer(width):
    if ('skull', width) in _cache: return _cache[('skull', width)]
    m = dino_mask(B.SUE, 2400, 'purple')
    w, h = m.size
    head = m.crop((int(w * 0.835), 0, w, int(h * 0.44)))   # solo la cabeza y el arranque del cuello
    head = head.crop(head.getbbox())
    hh = round(head.height * width / head.width)
    head = head.resize((width, hh), Image.LANCZOS).point(lambda v: 255 if v > 120 else 0)
    yy = np.linspace(0.5, 1.0, hh)[:, None] * np.ones((1, width))
    lay = Image.new('RGBA', head.size, (0, 0, 0, 0))
    lay.alpha_composite(halftone(head, cell=10, shade=np.clip(1.05 - yy * 0.5, 0, 1)))
    lay.alpha_composite(contour_lines(head, steps=(10, 26, 46), width=2))
    _cache[('skull', width)] = lay
    return lay

def paste_skull(img, width, cx, cy, k=1.0, angle=0.0):
    lay = skull_layer(width)
    if angle: lay = lay.rotate(angle, expand=True, resample=Image.BICUBIC)
    if k < 1:
        a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3] * k).astype(np.uint8); lay = Image.fromarray(a)
    img.alpha_composite(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)))

# ---------------------------------------------------------------- mapa (Mongolia → Estados Unidos por el Pacífico)
LON0, LON1, LAT0, LAT1 = 70.0, 300.0, 5.0, 65.0          # América desplazada +360° para cruzar el Pacífico
MX0, MY0, MW = 0, 640, 1080
MH = int(MW * (LAT1 - LAT0) / (LON1 - LON0) * 1.25)

def proj(lon, lat):
    if lon < 0: lon += 360
    return MX0 + (lon - LON0) / (LON1 - LON0) * MW, MY0 + (LAT1 - lat) / (LAT1 - LAT0) * MH

def map_layer():
    if 'map' in _cache: return _cache['map']
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    r = shapefile.Reader(SHP); fields = [f[0] for f in r.fields[1:]]; ia = fields.index('ADM0_A3')
    for sr in r.iterShapeRecords():
        a3 = sr.record[ia]; pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
        bb = sr.shape.bbox
        if bb[3] < LAT0 - 5 or bb[1] > LAT1 + 5: continue
        fill = {'MNG': AMBER, 'USA': (70, 64, 58)}.get(a3, (36, 33, 30))
        for p0, p1 in zip(parts[:-1], parts[1:]):
            ring = pts[p0:p1]
            if len(ring) < 3: continue
            # anillos que cruzan el antimeridiano se parten mal: se descartan los que saltan
            xy = [proj(x, y) for x, y in ring]
            if max(x for x, _ in xy) - min(x for x, _ in xy) > MW * 0.6: continue
            d.polygon(xy, fill=fill, outline=(60, 55, 50) if a3 != 'MNG' else AMBER)
    _cache['map'] = lay
    return lay

MNG = proj(103.0, 46.5)
NYC = proj(-74.0, 40.7)

def route_points(n=120):
    """Arco del Pacífico entre Mongolia y Nueva York."""
    (x0, y0), (x1, y1) = MNG, NYC
    pts = []
    for i in range(n + 1):
        u = i / n
        pts.append((x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - 260 * math.sin(math.pi * u)))
    return pts

def draw_map(img, t, k_in, route=0.0, back=False, labels=True):
    lay = map_layer()
    if k_in < 1:
        a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3] * k_in).astype(np.uint8); lay = Image.fromarray(a)
    img.alpha_composite(lay, (0, 0))
    d = ImageDraw.Draw(img)
    if labels and k_in > 0.5:
        label(d, (MNG[0], MNG[1] + 46), 'MONGOLIA', 28, AMBER, anchor='ma', bold=True)
        label(d, (NYC[0] - 10, NYC[1] + 40), 'NUEVA YORK', 26, BONE, anchor='ra', bold=True)
        d.ellipse([NYC[0] - 9, NYC[1] - 9, NYC[0] + 9, NYC[1] + 9], fill=BONE)
    if route > 0:
        pts = route_points()
        if back: pts = pts[::-1]
        upto = max(2, int(len(pts) * route))
        seg = pts[:upto]
        for i in range(0, len(seg) - 1, 2):
            d.line([seg[i], seg[i + 1]], fill=RUST if not back else AMBER, width=6)
        hx, hy = seg[-1]
        d.ellipse([hx - 14, hy - 14, hx + 14, hy + 14], fill=RUST if not back else AMBER)

# ---------------------------------------------------------------- escenas
def auction_card(img, t, k, rows, price=None, price_k=0.0):
    if k <= 0: return
    card = Image.new('RGBA', (900, 700), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([0, 0, 899, 699], 18, fill=BONE)
    cd.rectangle([0, 0, 899, 96], fill=INK); cd.rounded_rectangle([0, 0, 899, 30], 18, fill=INK)
    cd.text((44, 28), 'LOTE · SUBASTA', font=font('monob', 34), fill=BONE)
    y = 130
    for kk, v in rows:
        cd.text((44, y), kk, font=font('mono', 24), fill=(110, 100, 88))
        cd.text((44, y + 30), v, font=font('head', 44), fill=INK)
        cd.line([44, y + 98, 856, y + 98], fill=(190, 178, 158), width=2)
        y += 122
    if price is not None and price_k > 0:
        cd.text((44, y + 4), 'PRECIO', font=font('mono', 24), fill=(110, 100, 88))
        cd.text((44, y + 32), B.fmt_usd(price * ease_out(price_k)), font=font('monob', 74), fill=(196, 120, 0))
    card = card.rotate(-2, expand=True, resample=Image.BICUBIC)
    e = ease_out(k)
    a = np.asarray(card).copy(); a[..., 3] = (a[..., 3] * e).astype(np.uint8)
    img.alpha_composite(Image.fromarray(a), (int(W / 2 - card.width / 2), int(560 + (1 - e) * 80)))

def scene_hook(img, t, T):
    k = ease_out(prog(t, 0.0, 0.6))
    paste_skull(img, 700, W / 2, 960 - (1 - k) * 60, k=k, angle=4 * math.sin(t * 1.3))
    name_card(img, 60, 470, 'NICOLAS CAGE', 'actor · comprador', prog(t, 0.3, 0.45))
    if t >= T['276a'] - 0.1:
        counter(img, W / 2, 1360, 276_000 * ease_out(prog(t, T['276a'] - 0.1, 1.4)), 104, AMBER, label='PAGÓ')
    stamp(img, 780, 1590, 'DEVOLVER', prog(t, T['devolverla'], 0.25))

def scene_auction(img, t, T):
    rows = [('ESPÉCIMEN', 'Cráneo de tarbosaurio'), ('LUGAR', 'Subasta en Nueva York'), ('AÑO', '2007')]
    auction_card(img, t, prog(t, T['fue'] - 0.2, 0.5), rows, price=276_000, price_k=prog(t, T['subasta1'], 0.8))

def scene_cousin(img, t, T):
    """El tarbosaurio al lado del T. rex: primo asiático, un poco más chico."""
    k1 = ease_out(prog(t, T['craneo'] - 0.1, 0.5)); k2 = ease_out(prog(t, T['primo'], 0.5))
    paste_fossil(img, 900, (60 + (1 - k2) * 80, 520), alpha=k2 * 0.9)
    d = ImageDraw.Draw(img)
    if k2 > 0: label(d, (70, 480), 'T. REX · AMÉRICA DEL NORTE', 26, BONE_DIM, bold=True)
    paste_fossil(img, 760, (60 + (1 - k1) * 120, 1050), alpha=k1, colors=[AMBER])
    if k1 > 0: label(d, (70, 1010), 'TARBOSAURIO · ASIA', 26, AMBER, bold=True)
    chip(img, 820, 1460, 'PRIMOS', prog(t, T['asiatico'], 0.35), color=AMBER)

def scene_bid(img, t, T):
    """La puja: dos paletas con montos que suben; gana Cage."""
    d = ImageDraw.Draw(img)
    chip(img, W / 2, 470, 'SEGÚN LA PRENSA', prog(t, T['segun'], 0.3), color=BONE_DIM)
    for i, (nm, x) in enumerate((('CAGE', 280), ('DICAPRIO', 800))):
        k = ease_out(prog(t, T['segun'] + 0.15 * i, 0.45))
        if k <= 0: continue
        y = 900 + (1 - k) * 120
        win = i == 0 and t >= T['dicaprio'] + 0.5
        col = AMBER if win else BONE
        d.rounded_rectangle([x - 150, y - 150, x + 150, y + 90], 26, fill=col)
        d.rectangle([x - 18, y + 90, x + 18, y + 360], fill=col)
        d.text((x, y - 30), nm, font=font('head', 50 if len(nm) < 6 else 40), fill=INK, anchor='mm')
        d.text((x, y + 30), 'PUJA', font=font('monob', 32), fill=INK, anchor='mm')
        if win:
            chip(img, x, y - 260, 'GANÓ', prog(t, T['dicaprio'] + 0.5, 0.3), color=AMBER)

def scene_mongolia(img, t, T):
    draw_map(img, t, ease_out(prog(t, T['problema'] - 0.1, 0.6)))
    paste_skull(img, 300, MNG[0], MNG[1] - 230, k=ease_out(prog(t, T['venia'], 0.4)))
    stamp(img, W / 2, 1460, 'PROPIEDAD DEL ESTADO', prog(t, T['estado'], 0.25), size=52, angle=-6)
    if t >= T['no_se']:
        d = ImageDraw.Draw(img); k = ease_out(prog(t, T['no_se'], 0.3))
        for j, txt in enumerate(('×  NO SE VENDEN', '×  NO SALEN DEL PAÍS')):
            kk = ease_out(prog(t, T['no_se'] + j * 0.9, 0.3))
            label(d, (W / 2, 1640 + j * 64), txt, 40, RUST + (int(255 * kk),), anchor='ma', bold=True)

def scene_route(img, t, T):
    draw_map(img, t, 1.0, route=ease_io(prog(t, T['salio'] - 0.2, 2.2)))
    k = ease_out(prog(t, T['completo'] - 0.3, 0.5))
    pts = route_points(); u = ease_io(prog(t, T['salio'] - 0.2, 2.2))
    hx, hy = pts[int(u * (len(pts) - 1))]
    paste_fossil(img, 380, (hx - 190, hy - 230), alpha=k, colors=[RUST])
    chip(img, 860, 470, '2012', prog(t, T['2012'], 0.35), color=AMBER)

def scene_sale(img, t, T):
    k = ease_out(prog(t, T['se_vendio'] - 0.3, 0.5))
    paste_fossil(img, 1000, (40, 600), alpha=k, colors=[RUST])
    name_card(img, 60, 470, 'TARBOSAURIO', 'esqueleto completo · 2012', prog(t, T['se_vendio'] - 0.2, 0.45))
    if t >= T['por2'] - 0.1:
        counter(img, W / 2, 1180, 1_050_000 * ease_out(prog(t, T['por2'] - 0.1, 1.1)), 98, AMBER, label='SE VENDIÓ POR')
    stamp(img, 300, 1500, 'FRENADO', prog(t, T['freno'], 0.25), angle=-8)
    stamp(img, 780, 1640, 'CULPABLE', prog(t, T['culpable'], 0.25), angle=7)
    if t >= T['comerciante']:
        d = ImageDraw.Draw(img); kk = ease_out(prog(t, T['comerciante'], 0.4))
        label(d, (W / 2, 1380), 'EL IMPORTADOR: CONTRABANDO', 30, BONE + (int(255 * kk),), anchor='ma', bold=True)

def scene_return(img, t, T):
    draw_map(img, t, ease_out(prog(t, T['2013'] - 0.3, 0.4)), route=ease_io(prog(t, T['esqueleto'], 1.4)), back=True)
    chip(img, 860, 470, '2013', prog(t, T['2013'], 0.35), color=AMBER)
    u = ease_io(prog(t, T['esqueleto'], 1.4)); pts = route_points()[::-1]
    hx, hy = pts[int(u * (len(pts) - 1))]
    paste_fossil(img, 380, (hx - 190, hy - 230), alpha=ease_out(prog(t, T['2013'], 0.4)), colors=[AMBER], flip=True)
    if t >= T['volvio'] + 0.9:
        stamp(img, W / 2, 1500, 'DEVUELTO A MONGOLIA', prog(t, T['volvio'] + 0.9, 0.25), color=AMBER, size=48, angle=-5)

def scene_cage(img, t, T):
    k = ease_out(prog(t, T['y2015'] - 0.2, 0.5))
    paste_skull(img, 700, W / 2, 900, k=k, angle=3 * math.sin(t * 1.3))
    name_card(img, 60, 470, 'NICOLAS CAGE', 'su cráneo · 2015', prog(t, T['y2015'], 0.45))
    chip(img, 880, 470, '2015', prog(t, T['2015'], 0.35), color=AMBER)
    stamp(img, W / 2, 1380, 'CONTRABANDO', prog(t, T['contrabando2'], 0.25), angle=-6)
    stamp(img, W / 2, 1600, 'ENTREGADO', prog(t, T['entrego'], 0.25), color=AMBER, angle=5)

def scene_end(img, t, T):
    k = ease_out(prog(t, T['276b'] - 0.2, 0.4))
    paste_skull(img, 520, W / 2, 820, k=k * (1 - 0.6 * ease_io(prog(t, T['para'], 1.2))))
    v = 276_000 * (1 - ease_io(prog(t, T['para'], 1.3)))
    counter(img, W / 2, 1200, v, 110, AMBER if v > 1 else RUST, label='LO QUE LE QUEDÓ')

def word_times(words):
    def at(tok, n=1):
        c = 0
        for w in words:
            if w['text'].lower().strip('¿?.,:;') == tok:
                c += 1
                if c == n: return w['start']
        raise KeyError((tok, n))
    T = {'276a': at('276'), 'devolverla': at('devolverla'), 'fue': at('fue'), 'subasta1': at('subasta'),
         'craneo': at('cráneo'), 'primo': at('primo'), 'asiatico': at('asiático'), 'segun': at('según'),
         'gano': at('ganó'), 'dicaprio': at('dicaprio'), 'problema': at('problema') - 0.2, 'venia': at('venía'),
         'estado': at('estado'), 'no_se': at('no'), 'salio': at('salió'), '2012': at('2012'), 'completo': at('completo'),
         'se_vendio': at('se', 2), 'por2': at('por', 2), 'freno': at('frenó'), 'comerciante': at('comerciante'),
         'culpable': at('culpable'), '2013': at('2013'), 'esqueleto': at('esqueleto'), 'volvio': at('volvió'),
         'y2015': at('y', 4) if False else at('2015') - 0.4, '2015': at('2015'), 'contrabando2': at('contrabando', 2),
         'entrego': at('entregó'), '276b': at('276', 2), 'para': at('para'), 'cage2': at('cage', 2)}
    T['en2012'] = at('2012') - 0.25
    T['final'] = T['276b'] + 0.8   # el cierre arranca cuando ya se vio el sello de entregado
    return T

def build(T):
    sc = [
        (0.0, T['fue'] - 0.2, scene_hook),
        (T['fue'] - 0.2, T['craneo'] - 0.25, scene_auction),
        (T['craneo'] - 0.25, T['segun'] - 0.2, scene_cousin),
        (T['segun'] - 0.2, T['problema'], scene_bid),
        (T['problema'], T['en2012'], scene_mongolia),
        (T['en2012'], T['se_vendio'] - 0.4, scene_route),
        (T['se_vendio'] - 0.4, T['2013'] - 0.3, scene_sale),
        (T['2013'] - 0.3, T['y2015'] - 0.3, scene_return),
        (T['y2015'] - 0.3, T['final'], scene_cage),
        (T['final'], 999, scene_end),
    ]
    return [(a, b, (lambda f: (lambda img, t: f(img, t, T)))(fn)) for a, b, fn in sc]

def build_heads(T):
    B.HEADS = [
        (0.0, ['Nicolas Cage', 'pagó 276 mil'], ['276', 'mil']),
        (T['devolverla'] - 0.4, ['…y tuvo que', 'devolverla'], ['devolverla']),
        (T['fue'] - 0.1, ['Nueva York, 2007'], ['2007']),
        (T['craneo'] - 0.2, ['un tarbosaurio'], ['tarbosaurio']),
        (T['primo'], ['el primo asiático', 'del T. rex'], ['asiático']),
        (T['segun'] - 0.1, ['le ganó a', 'DiCaprio'], ['DiCaprio']),
        (T['problema'], ['el problema'], ['problema']),
        (T['venia'], ['venía de', 'Mongolia'], ['Mongolia']),
        (T['estado'] - 0.3, ['son del Estado'], ['Estado']),
        (T['salio'] - 0.4, ['2012: otro', 'tarbosaurio'], ['2012:']),
        (T['se_vendio'] - 0.3, ['vendido por', '1 millón'], ['1', 'millón']),
        (T['freno'] - 0.3, ['el gobierno', 'lo frenó'], ['frenó']),
        (T['culpable'] - 0.3, ['culpable de', 'contrabando'], ['contrabando']),
        (T['2013'] - 0.2, ['volvió a', 'Mongolia'], ['Mongolia']),
        (T['y2015'], ['2015: le toca', 'a Cage'], ['Cage']),
        (T['contrabando2'] - 0.4, ['también era', 'contrabando'], ['contrabando']),
        (T['276b'] - 0.3, ['276 mil dólares…'], ['276', 'mil']),
        (T['para'], ['para quedarse', 'sin nada'], ['nada']),
    ]

B.build = build
B.build_heads = build_heads
B.word_times = word_times

if __name__ == '__main__':
    import argparse, subprocess
    from multiprocessing import Pool
    ap = argparse.ArgumentParser(); ap.add_argument('work'); ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=4); ap.add_argument('--only', type=str, default=None)
    a = ap.parse_args()
    tm = json.load(open(os.path.join(a.work, 'timings.json')))
    T = word_times(tm['words'])
    n = int(round(tm['duration'] * B.FPS))
    outdir = os.path.join(a.work, 'frames'); os.makedirs(outdir, exist_ok=True)
    json.dump(T, open(os.path.join(a.work, 'T.json'), 'w'), indent=1)
    if a.only:
        B.init_worker(); build_heads(T); sc = build(T)
        for s in a.only.split(','): B.render_frame(int(float(s) * B.FPS), T, sc, outdir)
        sys.exit()
    step = math.ceil(n / (a.workers * 4))
    jobs = [(lo, min(n, lo + step), T, outdir) for lo in range(0, n, step)]
    with Pool(a.workers) as p:
        for _ in p.imap_unordered(B.run_chunk, jobs): pass
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(B.FPS), '-i', os.path.join(outdir, '%05d.png'),
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', a.out], check=True)
    print('cuadros', n)
