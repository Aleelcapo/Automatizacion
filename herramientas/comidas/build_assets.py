"""Prepara los recursos geográficos: mapa en .npy (memmap), bordes simplificados y banderas recortadas a cada país.

Uso: build_assets.py <work_dir>
"""
import sys, os, json, pickle, numpy as np
from PIL import Image, ImageDraw, ImageFilter
import shapefile
from shapely.geometry import Polygon, MultiPolygon, box
sys.path.insert(0, os.path.dirname(__file__))
from geo import W0, H0, LON0, SPAN, lonlat_to_px
Image.MAX_IMAGE_PIXELS = None

WORK = sys.argv[1]
SRC = os.environ.get('SRC_WORK', WORK)   # descargas compartidas (fronteras, banderas)
SHP = os.path.join(SRC, 'dl/geo/ne_10m_admin_0_countries.shp')
FLAGS = os.path.join(SRC, 'dl/flags')
OUT = os.path.join(WORK, 'assets'); os.makedirs(OUT, exist_ok=True)

# Recorte del territorio que se dibuja (excluye islas remotas que nunca entran en cuadro)
# y caja de diseño de la bandera (núcleo continental, donde se reparten franjas y emblema).
COUNTRIES = {
    'ARG': dict(clip=(-75, -56, -53, -21), layout=(-73.6, -55.1, -53.6, -21.8), kind='h3',
                colors=['#74ACDF', '#FFFFFF', '#74ACDF'], emblem='sun', em_size=0.62, em_at=(-64.5, -36.5)),
    'PER': dict(clip=(-82, -19, -68, 0.5), layout=(-81.3, -18.4, -68.6, -0.03), kind='v3',
                colors=['#D91023', '#FFFFFF', '#D91023']),
    'MEX': dict(clip=(-118.5, 14, -86, 33), layout=(-117.2, 14.5, -86.7, 32.7), kind='v3',
                colors=['#006847', '#FFFFFF', '#CE1126'], emblem='mex', em_size=0.95, em_at=(-101.0, 22.5)),
    'ITA': dict(clip=(6, 35, 19, 47.5), layout=(6.6, 36.6, 18.5, 47.1), kind='v3',
                colors=['#009246', '#FFFFFF', '#CE2B37']),
    'IND': dict(clip=(67.5, 6, 98, 36), layout=(68.1, 8.0, 97.4, 35.5), kind='h3',
                colors=['#FF6820', '#FFFFFF', '#046A38'], emblem='chakra', em_size=0.92, em_at=(79.0, 22.0)),
    'JPN': dict(clip=(122.5, 24, 146.5, 46), layout=(129.3, 30.9, 145.9, 45.6), kind='jp',
                colors=['#FFFFFF'], disc_at=(138.3, 36.4), disc_deg=6.2),
    # banderas completas escaladas sin deformar ('cover'), ancladas en su elemento clave
    'ISL': dict(clip=(-25, 63, -13, 67), layout=(-25, 63, -13, 67), kind='cover', svg='Iceland', anchor=(0.36, 0.5), at=(-18.8, 64.9), colors=['#02529C']),
    'FIN': dict(clip=(19, 59.5, 32, 70.2), layout=(19, 59.5, 32, 70.2), kind='nordic', at=(25.3, 63.6), bar=0.2, colors=['#FFFFFF', '#002F6C']),
    'GEO': dict(clip=(39.8, 40.9, 46.8, 43.7), layout=(39.8, 40.9, 46.8, 43.7), kind='cover', svg='Georgia', anchor=(0.5, 0.5), at=(43.4, 42.2), colors=['#FFFFFF']),
    'KAZ': dict(clip=(46, 40.4, 87.5, 55.5), layout=(46, 40.4, 87.5, 55.5), kind='cover', svg='Kazakhstan', anchor=(0.52, 0.5), at=(67.5, 48.2), colors=['#00AFCA']),
    'ETH': dict(clip=(32.8, 3.3, 48.1, 15), layout=(32.8, 3.3, 48.1, 15), kind='cover', svg='Ethiopia', anchor=(0.5, 0.5), at=(39.5, 8.8), colors=['#FCDD09']),
    'PHL': dict(clip=(116.5, 4.3, 127, 21.2), layout=(116.5, 4.3, 127, 21.2), kind='cover', svg='the_Philippines', anchor=(0.2, 0.5), at=(121.8, 13.0), height_frac=0.75, colors=['#0038A8', '#CE1126']),
    'KEN': dict(clip=(33.8, -4.8, 42, 5.1), layout=(33.8, -4.8, 42, 5.1), kind='cover', svg='Kenya', anchor=(0.5, 0.5), at=(37.9, 0.4), colors=['#006600']),
    'KHM': dict(clip=(102.3, 10.3, 107.7, 14.8), layout=(102.3, 10.3, 107.7, 14.8), kind='cover', svg='Cambodia', anchor=(0.5, 0.5), at=(104.9, 12.6), colors=['#032EA1']),
    'ARM': dict(clip=(43.4, 38.8, 46.7, 41.4), layout=(43.4, 38.8, 46.7, 41.4), kind='cover', svg='Armenia', anchor=(0.5, 0.5), at=(44.9, 40.2), colors=['#0033A0']),
    'SEN': dict(clip=(-17.6, 12.2, -11.3, 16.8), layout=(-17.6, 12.2, -11.3, 16.8), kind='cover', svg='Senegal', anchor=(0.5, 0.5), at=(-14.4, 14.4), colors=['#FDEF42']),
    'SWE': dict(clip=(10.5, 55.2, 24.3, 69.1), layout=(10.5, 55.2, 24.3, 69.1), kind='nordic', at=(15.2, 60.6), bar=0.2, colors=['#006AA7', '#FECC02']),
    # Nepal: bandera no rectangular; carmesí con borde azul interior y la luna y el sol en proporción
    'NPL': dict(clip=(80, 26.3, 88.3, 30.5), layout=(80, 26.3, 88.3, 30.5), kind='nepal', svg='Nepal',
                moon_at=(82.25, 29.0), sun_at=(82.55, 27.95), em_deg=1.15, colors=['#DC143C', '#003893']),
    'TUN': dict(clip=(7.4, 30.1, 11.7, 37.6), layout=(7.4, 30.1, 11.7, 37.6), kind='cover', svg='Tunisia', anchor=(0.5, 0.5), at=(9.3, 34.9), height_frac=0.45, colors=['#E70013', '#E70013']),
    'GHA': dict(clip=(-3.4, 4.6, 1.3, 11.2), layout=(-3.4, 4.6, 1.3, 11.2), kind='cover', svg='Ghana', anchor=(0.5, 0.5), at=(-1.1, 7.9), colors=['#CE1126']),
    'LAO': dict(clip=(100, 13.8, 107.7, 22.6), layout=(100, 13.8, 107.7, 22.6), kind='cover', svg='Laos', anchor=(0.5, 0.5), at=(102.7, 20.2), height_frac=0.5, colors=['#CE1126', '#CE1126']),
    'TJK': dict(clip=(67.3, 36.6, 75.2, 41.1), layout=(67.3, 36.6, 75.2, 41.1), kind='cover', svg='Tajikistan', anchor=(0.5, 0.5), at=(70.4, 38.8), colors=['#CC0000']),
    'EST': dict(clip=(21.7, 57.4, 28.3, 59.8), layout=(21.7, 57.4, 28.3, 59.8), kind='cover', svg='Estonia', anchor=(0.5, 0.5), at=(25.5, 58.7), colors=['#0072CE']),
    # Noruega: cruz nórdica de tres colores (blanco con el azul por dentro)
    'NOR': dict(clip=(4.4, 57.8, 31.3, 71.3), layout=(4.4, 57.8, 31.3, 71.3), kind='nordic', at=(9.8, 61.2), bar=0.12, colors=['#BA0C2F', '#FFFFFF', '#00205B']),
}
ONLY = [k for k in os.environ.get('ONLY_COUNTRIES', '').split(',') if k]

def rings_of(shape):
    pts, parts = shape.points, list(shape.parts) + [len(shape.points)]
    return [pts[a:b] for a, b in zip(parts[:-1], parts[1:])]

def to_px(ring, sh=0.0):
    return np.array([lonlat_to_px(x + sh, max(min(y, 84), -84)) for x, y in ring], np.float32)

def shifts_for(lon0, lon1):
    """Copias (±360°) de un objeto que caen dentro de la textura."""
    return [k * 360 for k in (-1, 0, 1, 2) if lon1 + k * 360 > LON0 and lon0 + k * 360 < LON0 + SPAN]

def country_shift(clip):
    # la copia más al este que entra completa: el recorrido avanza hacia el este dando la vuelta al mundo
    ok = [k * 360 for k in (-1, 0, 1, 2) if clip[0] + k * 360 >= LON0 and clip[2] + k * 360 <= LON0 + SPAN]
    return max(ok)

FORCED = json.loads(os.environ.get('COUNTRY_SHIFTS', '{}'))   # desplazamiento fijo por país para un recorrido concreto

reader = shapefile.Reader(SHP)
fields = [f[0] for f in reader.fields[1:]]
iA3 = fields.index('ADM0_A3')

# --- bordes de todos los países, en dos niveles de detalle -------------------------------
borders = {'fine': [], 'coarse': []}
country_geo = {}
for sr in reader.iterShapeRecords():
    a3 = sr.record[iA3]
    polys = []
    for ring in rings_of(sr.shape):
        if len(ring) < 4: continue
        p = Polygon(ring)
        if not p.is_valid: p = p.buffer(0)
        polys.append(p)
    for lvl, tol in (('fine', 0.012), ('coarse', 0.06)):
        for p in polys:
            geoms = p.geoms if hasattr(p, 'geoms') else [p]
            for g in geoms:
                s = g.simplify(tol, preserve_topology=True)
                if s.is_empty or s.area < (0.0004 if lvl == 'fine' else 0.01): continue
                gs = s.geoms if hasattr(s, 'geoms') else [s]
                for q in gs:
                    lo, _, hi, _ = q.bounds
                    for sh in shifts_for(lo, hi):
                        borders[lvl].append(to_px(list(q.exterior.coords), sh))
    if a3 in COUNTRIES:
        country_geo[a3] = polys

# --- países destacados: contornos (recortados) + parche de bandera -----------------------
meta = {}
flag_png = {k: Image.open(os.path.join(FLAGS, f'Flag_of_{n}.png')).convert('RGB') for k, n in
            [('ARG', 'Argentina'), ('MEX', 'Mexico'), ('IND', 'India')]}
L0 = np.asarray(Image.open(os.path.join(WORK, 'map/L0.png')))

def emblem_crop(a3):
    """Recorte de la franja central del SVG oficial que contiene el emblema (proporción intacta)."""
    im = flag_png[a3]; w, h = im.size
    if a3 == 'MEX':
        return im.crop((w // 3, 0, 2 * w // 3, h))          # franja blanca completa
    side = h // 3
    return im.crop((w // 2 - side // 2, side, w // 2 + side // 2, 2 * side))

def hexrgb(c): return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))

for a3, cfg in COUNTRIES.items():
    if ONLY and a3 not in ONLY: continue
    clip = box(*cfg['clip'])
    sh = FORCED.get(a3, country_shift(cfg['clip']))
    LL = lambda lon, lat: lonlat_to_px(lon + sh, lat)
    parts = []
    for p in country_geo[a3]:
        q = p.intersection(clip)
        if q.is_empty: continue
        parts += list(q.geoms) if hasattr(q, 'geoms') else [q]
    parts = [p for p in parts if p.geom_type == 'Polygon']
    outline = {}
    for lvl, tol in (('fine', 0.006), ('coarse', 0.03)):
        rs = []
        for p in parts:
            s = p.simplify(tol, preserve_topology=True)
            if s.is_empty or s.area < 0.0005: continue
            for q in (s.geoms if hasattr(s, 'geoms') else [s]):
                rs.append(to_px(list(q.exterior.coords), sh))
        outline[lvl] = rs
    # parche en coordenadas L0
    allpts = np.concatenate(outline['fine'])
    x0, y0 = np.floor(allpts.min(0)).astype(int) - 8
    x1, y1 = np.ceil(allpts.max(0)).astype(int) + 8
    pw, ph = x1 - x0, y1 - y0
    SS = 2
    mask = Image.new('L', (pw * SS, ph * SS), 0); md = ImageDraw.Draw(mask)
    for p in parts:
        for i, ring in enumerate([p.exterior] + list(p.interiors)):
            r = (to_px(list(ring.coords), sh) - [x0, y0]) * SS
            md.polygon([tuple(v) for v in r], fill=255 if i == 0 else 0)
    mask = mask.resize((pw, ph), Image.LANCZOS)

    lx0, ly1 = LL(cfg['layout'][0], cfg['layout'][1])
    lx1, ly0 = LL(cfg['layout'][2], cfg['layout'][3])
    lx0 -= x0; lx1 -= x0; ly0 -= y0; ly1 -= y0
    flag = Image.new('RGB', (pw, ph), hexrgb(cfg['colors'][0])); fd = ImageDraw.Draw(flag)
    if cfg['kind'] == 'h3':
        bh = (ly1 - ly0) / 3
        fd.rectangle([0, ly0 + bh, pw, ly0 + 2 * bh], fill=hexrgb(cfg['colors'][1]))
        fd.rectangle([0, ly0 + 2 * bh, pw, ph], fill=hexrgb(cfg['colors'][2]))
    elif cfg['kind'] == 'v3':
        bw = (lx1 - lx0) / 3
        fd.rectangle([lx0 + bw, 0, lx0 + 2 * bw, ph], fill=hexrgb(cfg['colors'][1]))
        fd.rectangle([lx0 + 2 * bw, 0, pw, ph], fill=hexrgb(cfg['colors'][2]))
    if cfg.get('emblem'):
        em = emblem_crop(a3)
        cx, cy = LL(*cfg['em_at']); cx -= x0; cy -= y0
        if cfg['kind'] == 'h3':
            bh = (ly1 - ly0) / 3
            s = cfg['em_size'] * bh / em.height
            # la franja central se centra en el emblema para que el emblema quede siempre dentro de ella
            fd.rectangle([0, 0, pw, ph], fill=hexrgb(cfg['colors'][0]))
            fd.rectangle([0, cy - bh / 2, pw, cy + bh / 2], fill=hexrgb(cfg['colors'][1]))
            fd.rectangle([0, cy + bh / 2, pw, ph], fill=hexrgb(cfg['colors'][2]))
        else:
            bw = (lx1 - lx0) / 3
            s = min(bw / em.width, cfg['em_size'] * (ly1 - ly0) / em.height)
            fd.rectangle([0, 0, pw, ph], fill=hexrgb(cfg['colors'][0]))
            fd.rectangle([cx - bw / 2, 0, cx + bw / 2, ph], fill=hexrgb(cfg['colors'][1]))
            fd.rectangle([cx + bw / 2, 0, pw, ph], fill=hexrgb(cfg['colors'][2]))
        emr = em.resize((max(1, int(em.width * s)), max(1, int(em.height * s))), Image.LANCZOS)
        flag.paste(emr, (int(cx - emr.width / 2), int(cy - emr.height / 2)))
    if cfg['kind'] == 'cover':
        fim = Image.open(os.path.join(FLAGS, f"Flag_of_{cfg['svg']}.png")).convert('RGB')
        FW, FH = fim.size; ax, ay = cfg['anchor']
        cx, cy = LL(*cfg['at']); cx -= x0; cy -= y0
        s = 1.02 * max(cx / (ax * FW), (pw - cx) / ((1 - ax) * FW), cy / (ay * FH), (ph - cy) / ((1 - ay) * FH))
        if cfg.get('height_frac'):
            # escala fija: arriba y abajo se prolongan las franjas de la bandera
            s = cfg['height_frac'] * ph / FH
            fd.rectangle([0, 0, pw, cy], fill=hexrgb(cfg['colors'][0]))
            fd.rectangle([0, cy, pw, ph], fill=hexrgb(cfg['colors'][1]))
        fim = fim.resize((int(FW * s) + 2, int(FH * s) + 2), Image.LANCZOS)
        flag.paste(fim, (int(round(cx - ax * FW * s)), int(round(cy - ay * FH * s))))
    if cfg['kind'] == 'nordic':
        # cruz nórdica dibujada en proporción al país (una bandera completa quedaría casi toda cruz)
        cx, cy = LL(*cfg['at']); cx -= x0; cy -= y0
        t = cfg['bar'] * min(pw, ph) / 2
        fd.rectangle([cx - t, 0, cx + t, ph], fill=hexrgb(cfg['colors'][1]))
        fd.rectangle([0, cy - t, pw, cy + t], fill=hexrgb(cfg['colors'][1]))
        if len(cfg['colors']) > 2:
            t /= 2
            fd.rectangle([cx - t, 0, cx + t, ph], fill=hexrgb(cfg['colors'][2]))
            fd.rectangle([0, cy - t, pw, cy + t], fill=hexrgb(cfg['colors'][2]))
    if cfg['kind'] == 'nepal':
        fim = np.asarray(Image.open(os.path.join(FLAGS, f"Flag_of_{cfg['svg']}.png")).convert('RGBA'))
        white = (fim[..., 0] > 200) & (fim[..., 1] > 200) & (fim[..., 2] > 200) & (fim[..., 3] > 200)
        ys, xs = np.nonzero(white); mid = (ys.min() + ys.max()) / 2
        for part, at in ((ys < mid, cfg['moon_at']), (ys >= mid, cfg['sun_at'])):
            y0e, y1e, x0e, x1e = ys[part].min(), ys[part].max() + 1, xs[part].min(), xs[part].max() + 1
            a = (white[y0e:y1e, x0e:x1e] * 255).astype(np.uint8)
            em = Image.new('RGBA', a.shape[::-1], (255, 255, 255, 255)); em.putalpha(Image.fromarray(a))
            s = cfg['em_deg'] * 60 / em.width
            em = em.resize((max(1, int(em.width * s)), max(1, int(em.height * s))), Image.LANCZOS)
            cx, cy = LL(*at); cx -= x0; cy -= y0
            flag.paste(em, (int(cx - em.width / 2), int(cy - em.height / 2)), em)
    if cfg['kind'] == 'jp':
        cx, cy = LL(*cfg['disc_at']); cx -= x0; cy -= y0
        r = cfg['disc_deg'] * 21600 / 360 / 2
        fd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hexrgb('#BC002D'))

    if cfg['kind'] == 'nepal':
        k = max(3, int(0.035 * min(pw, ph))) | 1
        inner = mask.filter(ImageFilter.MinFilter(k))
        edge = (np.asarray(mask, np.int16) - np.asarray(inner, np.int16)) > 60
        fa = np.asarray(flag).copy(); fa[edge] = hexrgb(cfg['colors'][1]); flag = Image.fromarray(fa)
    # relieve del satélite sobre la bandera (sutil) para que parezca pegada al terreno
    base = L0[max(y0, 0):y1, max(x0, 0):x1].astype(np.float32).mean(axis=2)
    base = np.pad(base, ((0, ph - base.shape[0]), (0, pw - base.shape[1])), mode='edge')
    blur = np.asarray(Image.fromarray(base.astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), np.float32)
    hp = np.clip((base - blur) / 255, -0.25, 0.25)
    f = np.asarray(flag, np.float32) / 255
    f = np.clip(f * (0.95 + 0.9 * hp[..., None]), 0, 1) * 0.97
    rgba = np.dstack([(f * 255).astype(np.uint8), np.asarray(mask)])
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, f'flag_{a3}.png'))
    meta[a3] = dict(x0=int(x0), y0=int(y0), w=int(pw), h=int(ph), shift=sh)
    with open(os.path.join(OUT, f'outline_{a3}.pkl'), 'wb') as fh:
        pickle.dump(outline, fh)
    print(a3, pw, ph, len(outline['fine']), flush=True)

old_meta = os.path.join(OUT, 'flags.json')
if ONLY and os.path.exists(old_meta):
    meta = {**json.load(open(old_meta)), **meta}
json.dump(meta, open(os.path.join(OUT, 'flags.json'), 'w'), indent=1)
with open(os.path.join(OUT, 'borders.pkl'), 'wb') as fh:
    pickle.dump(borders, fh)
# mapa como .npy para memmap compartido entre procesos
for k in range(5):
    if os.path.exists(os.path.join(OUT, f'L{k}.npy')): continue
    np.save(os.path.join(OUT, f'L{k}.npy'), L0 if k == 0 else np.asarray(Image.open(os.path.join(WORK, f'map/L{k}.png'))))
print('bordes', len(borders['fine']), len(borders['coarse']))
