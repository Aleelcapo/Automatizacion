"""Infografía animada vertical: "Los 3 errores que hicieron perder a Hitler".

Uso:
  python3 hitler_errores.py WORKDIR OUTDIR [--preview]

WORKDIR guarda cachés (voz, segmentos). Necesita countries.geojson de Natural Earth
(ne_50m_admin_0_countries) dentro de WORKDIR.
"""
import sys, os, json, math, subprocess, wave
from multiprocessing import Pool
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import tts, read_wav, trim_silence, align_words, srt_time, norm  # noqa: E402

W, H, FPS, SR = 1080, 1920, 30, 48000
VOICE, RATE, GAP = 'es-MX-JorgeNeural', '+20%', 0.18
OUT = 'Hitler_3_errores'

BEATS = [
    ('hook', '¿Hitler perdió la guerra por tres errores? En 1940 dominaba media Europa. '
             'Cinco años después, estaba muerto en un búnker.'),
    ('dunk1', 'Número tres: Dunkerque, 1940. Casi 400.000 soldados aliados, atrapados contra el mar.'),
    ('dunk2', 'Y Hitler ordenó a sus tanques... detenerse. Durante tres días.'),
    ('dunk3', 'Gracias a esa pausa escaparon 338.000 soldados. Y Gran Bretaña siguió en la guerra.'),
    ('barb1', 'Número dos: Barbarroja. En 1941 atacó la Unión Soviética con tres millones de soldados. '
              'Quería ganar antes del invierno.'),
    ('barb2', 'Llegó a unos treinta kilómetros de Moscú... y llegó el invierno. '
              'Cuarenta bajo cero, y sus soldados sin ropa de invierno.'),
    ('barb3', 'Casi cuatro de cada cinco soldados alemanes muertos cayeron en ese frente.'),
    ('stal1', 'Y el número uno: Stalingrado, 1942. Los soviéticos rodearon a su Sexto Ejército: '
              'más de 250.000 hombres.'),
    ('stal2', 'Sus generales querían romper el cerco. Hitler dijo que no: había que resistir.'),
    ('stal3', 'Se rindieron 91.000. Solo unos cinco mil volvieron a casa.'),
    ('verdict', '¿Perdió por sus errores, o por luchar contra medio mundo? Muchos historiadores creen '
                'que esa guerra ya estaba perdida. Pero estos errores aceleraron su caída.'),
    ('cta', 'Envíaselo a ese amigo que ve documentales de guerra a las tres de la mañana.'),
]

# ---------------------------------------------------------------- colores
SEA = (12, 17, 30)
LAND = (40, 45, 58)
BORDER = (78, 86, 104)
AXIS = (168, 48, 46)
ARROW = (255, 86, 66)
ALLY = (62, 128, 232)
USSR = (168, 104, 36)
SOV = (255, 196, 96)
GOLD = (255, 212, 110)
GOLDG = (255, 150, 40)
WHITE = (245, 245, 250)
ICE = (170, 215, 255)

AXIS_1940 = ['Germany', 'Austria', 'Czechia', 'Poland', 'Netherlands', 'Belgium', 'Luxembourg',
             'Denmark', 'Norway', 'France']
USSR_C = ['Russia', 'Ukraine', 'Belarus', 'Lithuania', 'Latvia', 'Estonia', 'Moldova']

# ---------------------------------------------------------------- utilidades
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def eout(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def pop(x):  # 0->1 con rebote
    x = clamp(x)
    return 1 + 0.25 * math.sin(math.pi * x) * (1 - x) * 2 if x < 1 else 1


def ramp(t, a, d=0.4):
    return ease((t - a) / d)


def mix(c1, c2, p):
    return tuple(int(round(a + (b - a) * p)) for a, b in zip(c1, c2))


def fmt(n):
    return f'{int(round(n)):,}'.replace(',', '.')


FONTS = {}


def font(sz, w='Black'):
    k = (sz, w)
    if k not in FONTS:
        FONTS[k] = ImageFont.truetype(f'/usr/share/fonts/opentype/inter/Inter-{w}.otf', sz)
    return FONTS[k]


PATCH = {}


def T(text, sz, color=WHITE, glow=None, w='Black', shadow=True):
    """Texto renderizado como parche RGBA (cacheado)."""
    k = ('T', text, sz, color, glow, w, shadow)
    if k in PATCH:
        return PATCH[k]
    f = font(sz, w)
    bb = f.getbbox(text)
    pad = int(sz * 0.7) if glow else int(sz * 0.25)
    tw, th = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
    im = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - bb[0], pad - bb[1]), text, font=f, fill=color + (255,))
    a = np.array(im).astype(np.float32)
    al = a[..., 3] / 255
    out = np.zeros_like(a)
    if glow:
        g = cv2.GaussianBlur(al, (0, 0), sz * 0.16) * 1.15
        out[..., :3] = np.array(glow, np.float32)
        out[..., 3] = np.clip(g, 0, 1) * 255
    elif shadow:
        g = cv2.GaussianBlur(al, (0, 0), max(2, sz * 0.06))
        out[..., 3] = np.clip(g * 0.9, 0, 1) * 255
    # texto encima
    oa = out[..., 3:4] / 255
    na = al[..., None] + oa * (1 - al[..., None])
    out[..., :3] = (a[..., :3] * al[..., None] + out[..., :3] * oa * (1 - al[..., None])) / np.maximum(na, 1e-6)
    out[..., 3] = na[..., 0] * 255
    PATCH[k] = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    return PATCH[k]


def CHIP(text, sz, fg=WHITE, bg=(20, 24, 36), border=None, w='Black', padx=None, pady=None, rad=None):
    k = ('C', text, sz, fg, bg, border, w)
    if k in PATCH:
        return PATCH[k]
    f = font(sz, w)
    bb = f.getbbox(text)
    padx = padx or int(sz * 0.55)
    pady = pady or int(sz * 0.35)
    tw, th = bb[2] - bb[0] + 2 * padx, bb[3] - bb[1] + 2 * pady
    m = 6
    im = Image.new('RGBA', (tw + 2 * m, th + 2 * m), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((m, m, m + tw, m + th), rad or int(sz * 0.3), fill=bg + (235,),
                        outline=(border + (255,)) if border else None, width=max(3, sz // 12))
    d.text((m + padx - bb[0], m + pady - bb[1]), text, font=f, fill=fg + (255,))
    PATCH[k] = im
    return im


def STAMP(text, sz, color=AXIS):
    k = ('S', text, sz, color)
    if k in PATCH:
        return PATCH[k]
    f = font(sz, 'Black')
    bb = f.getbbox(text)
    padx, pady = int(sz * 0.4), int(sz * 0.18)
    tw, th = bb[2] - bb[0] + 2 * padx, bb[3] - bb[1] + 2 * pady
    m = int(sz * 0.4)
    im = Image.new('RGBA', (tw + 2 * m, th + 2 * m), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((m, m, m + tw, m + th), int(sz * 0.15), outline=color + (255,), width=max(6, sz // 9))
    d.text((m + padx - bb[0], m + pady - bb[1]), text, font=f, fill=color + (255,))
    a = np.array(im).astype(np.float32)
    al = a[..., 3] / 255
    g = cv2.GaussianBlur(al, (0, 0), sz * 0.12)
    out = np.zeros_like(a)
    out[..., :3] = color
    out[..., 3] = np.clip(np.maximum(al, g * 0.8), 0, 1) * 255
    out[..., :3] = a[..., :3] * al[..., None] + out[..., :3] * (1 - al[..., None])
    PATCH[k] = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    return PATCH[k]


# ---------------------------------------------------------------- fondo
def make_bg():
    y = np.linspace(0, 1, H)[:, None]
    bg = np.zeros((H, W, 3), np.float32)
    top, bot = np.array([8, 10, 20.]), np.array([20, 16, 30.])
    bg[:] = top * (1 - y[..., None]) + bot * y[..., None]
    light = np.zeros((H, W), np.float32)
    for cx in (W * 0.22, W * 0.78):
        pts = np.array([[cx - 30, 0], [cx + 30, 0], [cx + 330, H * 0.8], [cx - 330, H * 0.8]], np.int32)
        cv2.fillPoly(light, [pts], 1.0)
    light = cv2.GaussianBlur(light, (0, 0), 60) * np.clip(1.15 - y * 1.1, 0, 1)
    bg += light[..., None] * np.array([34, 30, 48.])
    # suelo
    fl = np.exp(-((np.arange(H)[:, None] - H * 0.74) / 160.) ** 2) * np.ones((1, W))
    bg += fl[..., None] * np.array([20, 14, 30.])
    return np.clip(bg, 0, 255).astype(np.uint8)


def make_vig():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.56) / (H * 0.62)) ** 2)
    v = np.clip(1.15 - r ** 2 * 0.75, 0.25, 1)
    top = np.clip((yy - 150) / 420, 0.35, 1)  # oscurece arriba para subtítulos
    return (v * top)[..., None]


BG = make_bg()
VIG = make_vig()

# ---------------------------------------------------------------- mapa
COUNTRIES = []


def load_map(path):
    gj = json.load(open(path))
    for ft in gj['features']:
        name = ft['properties']['ADMIN']
        g = ft['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        rings = []
        for p in polys:
            r = np.array(p[0], np.float64)
            if r[:, 0].max() < -30 or r[:, 0].min() > 75 or r[:, 1].max() < 25 or r[:, 1].min() > 75:
                continue
            rings.append(r)
        if rings:
            COUNTRIES.append((name, rings))


CY = 1080  # centro vertical del mapa en pantalla


def proj(cam, lon, lat):
    lonc, latc, z = cam
    return (np.asarray(lon) - lonc) * z * 0.643 + W / 2, (latc - np.asarray(lat)) * z + CY


def draw_map(arr, cam, colors, tint=None):
    arr[:] = SEA
    lonc, latc, z = cam
    for name, rings in COUNTRIES:
        col = colors.get(name, LAND)
        if tint:
            col = mix(col, tint[0], tint[1])
        pts = []
        for r in rings:
            x, y = proj(cam, r[:, 0], r[:, 1])
            pts.append((np.stack([x, y], 1) * 16).astype(np.int32))
        cv2.fillPoly(arr, pts, col, cv2.LINE_AA, 4)
        cv2.polylines(arr, pts, True, BORDER if not tint else mix(BORDER, tint[0], tint[1]), 2, cv2.LINE_AA, 4)


def bez(p0, p1, p2, n=60):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2 = map(np.array, (p0, p1, p2))
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2


def arrow(arr, glow, pts, p, color, width=20):
    if p <= 0.01:
        return
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    L = d[-1] * p
    k = np.searchsorted(d, L)
    seg = pts[:max(2, k)]
    if k < len(pts):
        f = (L - d[k - 1]) / max(1e-6, d[k] - d[k - 1])
        tip = pts[k - 1] + (pts[k] - pts[k - 1]) * f
        seg = np.vstack([pts[:k], tip])
    tip = seg[-1]
    dirv = seg[-1] - seg[-2]
    dirv = dirv / (np.linalg.norm(dirv) + 1e-6)
    nrm = np.array([-dirv[1], dirv[0]])
    hl = width * 2.2
    base = tip - dirv * hl * 0.9
    body = np.vstack([seg[:-1], base])
    head = np.array([tip + dirv * hl * 0.25, base + nrm * hl * 0.75, base - nrm * hl * 0.75])
    cv2.polylines(arr, [(body * 16).astype(np.int32)], False, (0, 0, 0), width + 10, cv2.LINE_AA, 4)
    hb = np.array([tip + dirv * (hl * 0.25 + 7), base + nrm * (hl * 0.75 + 9) - dirv * 5, base - nrm * (hl * 0.75 + 9) - dirv * 5])
    cv2.fillPoly(arr, [(hb * 16).astype(np.int32)], (0, 0, 0), cv2.LINE_AA, 4)
    for tgt, c in ((arr, color), (glow, color)):
        cv2.polylines(tgt, [(body * 16).astype(np.int32)], False, c, width, cv2.LINE_AA, 4)
        cv2.fillPoly(tgt, [(head * 16).astype(np.int32)], c, cv2.LINE_AA, 4)


def star(arr, cx, cy, r, color):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    cv2.fillPoly(arr, [(np.array(pts) * 16).astype(np.int32)], color, cv2.LINE_AA, 4)


def pin(arr, x, y, color, r=14):
    cv2.circle(arr, (int(x), int(y)), r + 6, (0, 0, 0), -1, cv2.LINE_AA)
    cv2.circle(arr, (int(x), int(y)), r, color, -1, cv2.LINE_AA)


def soldier(arr, cx, cy, s, color):
    """Silueta simple de soldado con casco."""
    cx, cy = int(cx), int(cy)
    cv2.ellipse(arr, (cx, cy - int(1.05 * s)), (int(0.62 * s), int(0.5 * s)), 0, 180, 360, color, -1, cv2.LINE_AA)
    cv2.rectangle(arr, (cx - int(0.72 * s), cy - int(1.08 * s)), (cx + int(0.72 * s), cy - int(0.98 * s)), color, -1)
    cv2.circle(arr, (cx, cy - int(0.78 * s)), int(0.42 * s), color, -1, cv2.LINE_AA)
    x0, x1, y0, y1 = cx - int(0.7 * s), cx + int(0.7 * s), cy - int(0.3 * s), cy + int(1.3 * s)
    r = int(0.3 * s)
    cv2.rectangle(arr, (x0 + r, y0), (x1 - r, y1), color, -1)
    cv2.rectangle(arr, (x0, y0 + r), (x1, y1), color, -1)
    cv2.circle(arr, (x0 + r, y0 + r), r, color, -1, cv2.LINE_AA)
    cv2.circle(arr, (x1 - r, y0 + r), r, color, -1, cv2.LINE_AA)


# ---------------------------------------------------------------- escenas
class Ctx:
    def __init__(self, arr, lt, dur, beat):
        self.arr, self.lt, self.dur, self.beat = arr, lt, dur, beat
        self.items = []
        self.glow = None
        self.dark = 0.0

    def put(self, patch, x, y, alpha=1.0, scale=1.0):
        if alpha > 0.01:
            self.items.append((patch, x, y, alpha, scale))

    def m(self, sub, n=1, default=None):
        """Tiempo local donde empieza la palabra `sub` (n-ésima aparición)."""
        c = 0
        for s, e, tok in self.beat['words']:
            if norm(sub) in norm(tok):
                c += 1
                if c == n:
                    return s
        return default if default is not None else self.dur * 0.5

    def gl(self):
        if self.glow is None:
            self.glow = np.zeros_like(self.arr)
        return self.glow


def rank_badge(c, n, name, until=1.9):
    t = c.lt
    if t > until:
        return
    a = ramp(t, 0, 0.15) * (1 - ramp(t, until - 0.35, 0.35))
    c.dark = max(c.dark, 0.82 * a)
    c.items = [(p, x, y, al * (1 - a), sc) for p, x, y, al, sc in c.items]
    c.put(T('Nº', 70, GOLD, GOLDG), W / 2 - 150, 860, a, pop(t / 0.45))
    c.put(T(str(n), 340, GOLD, GOLDG), W / 2 + 40, 900, a, pop(t / 0.45))
    c.put(T(name, 96, WHITE), W / 2, 1150, a * ramp(t, 0.25, 0.3))


def big_title(c, text, y, t0, size=150, color=GOLD, glow=GOLDG, alpha=1.0):
    c.put(T(text, size, color, glow), W / 2, y, alpha * ramp(c.lt, t0, 0.2), pop((c.lt - t0) / 0.45))


EUROPE = (14.0, 50.5, 30.0)


def colors_1940(p_axis=1.0, stagger=True, t=0):
    col = {}
    for i, n in enumerate(AXIS_1940):
        pi = clamp((p_axis * (len(AXIS_1940) + 3) - i) / 3) if stagger else p_axis
        col[n] = mix(LAND, AXIS, ease(pi))
    return col


def sc_hook(c):
    t, d = c.lt, c.dur
    m1940, m5 = c.m('1940'), c.m('Cinco')
    mbunk = c.m('búnker')
    z = EUROPE[2] * (1 + 0.06 * t / d)
    if t < m1940:
        pa = 0
    elif t < m5:
        pa = ease((t - m1940) / 1.4)
    else:
        pa = 1 - ease((t - m5) / 2.2)
    draw_map(c.arr, (EUROPE[0], EUROPE[1], z), colors_1940(pa))
    lx, ly = proj((EUROPE[0], EUROPE[1], z), 10.4, 51.2)
    c.put(T('ALEMANIA', 40, WHITE), lx, ly, ramp(t, m1940 + 0.5) * (1 - ramp(t, m5 + 1.0)))
    # fase A: pregunta
    a = 1 - ramp(t, m1940 - 0.3, 0.3)
    c.dark = 0.72 * a
    c.put(T('3', 380, GOLD, GOLDG), W / 2, 900, a * ramp(t, 0.05, 0.2), pop(t / 0.5))
    c.put(T('ERRORES', 120, WHITE), W / 2, 1150, a * ramp(t, 0.35, 0.25), pop((t - 0.35) / 0.4))
    # fase B: 1940 -> 1945
    if t >= m1940 - 0.2:
        yr = 1940 if t < m5 else 1940 + int(round(5 * ease((t - m5) / 1.6)))
        c.put(T(str(yr), 170, GOLD, GOLDG), W / 2, 640, ramp(t, m1940 - 0.2, 0.25), pop((t - m1940 + 0.2) / 0.4))
    if t >= mbunk - 0.3:
        c.dark = max(c.dark, 0.55 * ramp(t, mbunk - 0.3, 0.5))
        c.put(CHIP('BERLÍN · ABRIL 1945', 46, WHITE, (30, 10, 12), AXIS), W / 2, 1300, ramp(t, mbunk - 0.3, 0.3))


DUNK = (2.37, 51.03)
DCAM = (1.9, 51.05, 240.0)
rng = np.random.default_rng(7)
POCKET = np.c_[2.0 + rng.random(140) * 1.0, 50.80 + rng.random(140) * 0.2]
POCKET = POCKET[(POCKET[:, 1] < 51.02 - (POCKET[:, 0] - 2.0) * 0.05)]
DEST = np.c_[0.75 + rng.random(len(POCKET)) * 0.75, 51.12 + rng.random(len(POCKET)) * 0.22]
DELAY = rng.random(len(POCKET))
GER_ARROWS = [((4.3, 50.35), (3.6, 50.55), (3.05, 50.85)),
              ((2.9, 50.15), (2.75, 50.45), (2.55, 50.72)),
              ((4.6, 51.05), (3.9, 51.0), (3.25, 50.98))]


def dunk_cam(t, zoom_in):
    if not zoom_in:
        return DCAM
    p = ease((t - 1.6) / 1.6)
    z0 = 33.0
    z = z0 * (DCAM[2] / z0) ** p
    return (EUROPE[0] + (DCAM[0] - EUROPE[0]) * p, EUROPE[1] + (DCAM[1] - EUROPE[1]) * p, z)


def dunk_base(c, cam, arrows_p, uk_p=0.0, dots='pocket', dots_p=1.0):
    col = {n: AXIS for n in ('Germany', 'Netherlands')}
    col['United Kingdom'] = mix(LAND, ALLY, uk_p)
    draw_map(c.arr, cam, col)
    g = c.gl()
    for a in GER_ARROWS:
        pts = np.stack(proj(cam, *bez(*a).T), 1)
        arrow(c.arr, g, pts, arrows_p, ARROW, 18)
    x, y = proj(cam, *DUNK)
    if cam[2] > 120:
        pin(c.arr, x, y, WHITE, 11)
        c.put(T('DUNKERQUE', 40, WHITE), x + 10, y + 50, ramp(cam[2], 120, 60))
        ex, ey = proj(cam, 0.6, 51.36)
        c.put(T('INGLATERRA', 40, mix(WHITE, ALLY, 0.3)), ex, ey, ramp(cam[2], 120, 60))
    for i, (lo, la) in enumerate(POCKET):
        if dots == 'pocket':
            vis = clamp(dots_p * 1.6 - DELAY[i] * 0.6)
            if vis <= 0:
                continue
            px, py = proj(cam, lo, la)
        else:
            q = ease(clamp((dots_p - DELAY[i] * 0.55) / 0.45))
            mid = ((lo + DEST[i, 0]) / 2, (la + DEST[i, 1]) / 2 + 0.05)
            pt = bez((lo, la), mid, DEST[i], 20)[int(q * 19)]
            px, py = proj(cam, *pt)
            vis = 1
        r = max(3, int(cam[2] / 20))
        cv2.circle(c.arr, (int(px), int(py)), r, mix(SEA, ALLY, vis), -1, cv2.LINE_AA)
        cv2.circle(g, (int(px), int(py)), r, mix((0, 0, 0), ALLY, vis * 0.7), -1, cv2.LINE_AA)


def sc_dunk1(c):
    t = c.lt
    cam = dunk_cam(t, True)
    m400, matr = c.m('400.000'), c.m('atrapados')
    dunk_base(c, cam, 0.8 * ease((t - matr + 0.2) / 1.2), dots_p=ease((t - m400 + 0.2) / 1.0))
    c.put(CHIP('MAYO 1940', 44, GOLD, (24, 20, 14), GOLD), W / 2, 560, ramp(t, 1.9, 0.3))
    c.put(T('400.000', 150, GOLD, GOLDG), W / 2, 700, ramp(t, m400 - 0.1, 0.2), pop((t - m400 + 0.1) / 0.45))
    c.put(T('soldados aliados', 46, WHITE, w='Bold'), W / 2, 800, ramp(t, m400 + 0.3, 0.3))
    rank_badge(c, 3, 'DUNKERQUE')


def sc_dunk2(c):
    t = c.lt
    mdet, mtres = c.m('detenerse'), c.m('tres')
    flash = 0.5 + 0.5 * math.sin(t * 14) if t > mdet else 1
    dunk_base(c, DCAM, 0.8)
    if t > mdet:
        c.dark = 0.35 * ramp(t, mdet, 0.2)
    c.put(STAMP('ALTO', 170, ARROW), W / 2, 680, ramp(t, mdet - 0.05, 0.12) * (0.85 + 0.15 * flash),
          1 + 0.6 * (1 - eout((t - mdet + 0.05) / 0.3)))
    if t > mtres - 0.1:
        a = ramp(t, mtres - 0.1, 0.2)
        c.put(CHIP('3 DÍAS', 64, GOLD, (24, 20, 14), GOLD), W / 2, 870, a, pop((t - mtres + 0.1) / 0.4))
        for i in range(3):
            on = ramp(t, mtres + 0.25 + i * 0.3, 0.15)
            x = W / 2 + (i - 1) * 90
            cv2.circle(c.arr, (int(x), 980), 28, (90, 90, 100), 4, cv2.LINE_AA)
            if on > 0:
                cv2.circle(c.arr, (int(x), 980), int(22 * on), GOLD, -1, cv2.LINE_AA)


def sc_dunk3(c):
    t = c.lt
    mesc, muk = c.m('escaparon'), c.m('Bretaña')
    p = ease((t - mesc + 0.6) / 3.2)
    dunk_base(c, DCAM, 0.8 + 0.2 * ease((t - mesc) / 3), uk_p=ramp(t, muk - 0.4, 0.6), dots='move', dots_p=p)
    c.put(CHIP('EN 9 DÍAS', 50, WHITE, (20, 24, 36), ALLY), W / 2, 560, ramp(t, mesc, 0.25))
    n = 338000 * ease((t - mesc + 0.3) / 2.6)
    c.put(T(fmt(n), 150, GOLD, GOLDG), W / 2, 700, ramp(t, mesc - 0.3, 0.2))
    c.put(T('evacuados', 46, WHITE, w='Bold'), W / 2, 800, ramp(t, mesc, 0.3))


BCAM = (31.0, 53.6, 34.0)
B_ARROWS = [((22.0, 54.6), (25.5, 57.5), (29.6, 59.3)),
            ((23.3, 52.6), (30.0, 54.6), (36.9, 55.67)),
            ((23.8, 50.6), (30.0, 50.0), (36.2, 48.6))]


def barb_colors(tint_p=0.0):
    col = colors_1940(1.0)
    for n in USSR_C:
        col[n] = USSR
    return col


def barb_base(c, cam, ps, tint=0.0):
    draw_map(c.arr, cam, barb_colors(), tint=(ICE, 0.35 * tint) if tint > 0 else None)
    g = c.gl()
    for a, p in zip(B_ARROWS, ps):
        pts = np.stack(proj(cam, *bez(*a).T), 1)
        arrow(c.arr, g, pts, p, ARROW, max(14, int(cam[2] / 2.2)))
    mx, my = proj(cam, 37.62, 55.75)
    star(c.arr, mx, my, max(16, cam[2] / 2.4), GOLD)
    star(g, mx, my, max(16, cam[2] / 2.4), GOLDG)
    c.put(T('MOSCÚ', 44, GOLD), mx + 10, my - 55)
    ux, uy = proj(cam, 42.0, 58.5)
    c.put(T('URSS', 60, mix(WHITE, USSR, 0.4)), ux, uy, 0.9)
    ax, ay = proj(cam, 13.5, 51.3)
    c.put(T('ALEMANIA', 36, WHITE), ax, ay, 0.85)


def sc_barb1(c):
    t = c.lt
    mat, mmil, minv = c.m('atacó'), c.m('millones'), c.m('invierno')
    cam = (BCAM[0], BCAM[1], BCAM[2] * (1 + 0.05 * t / c.dur))
    p = 0.62 * ease((t - mat) / 3.5)
    barb_base(c, cam, [p, p, p])
    c.put(CHIP('JUNIO 1941', 44, GOLD, (24, 20, 14), GOLD), W / 2, 560, ramp(t, c.m('1941') - 0.1, 0.3))
    c.put(T('3.000.000', 140, GOLD, GOLDG), W / 2, 700, ramp(t, mmil - 0.4, 0.2), pop((t - mmil + 0.4) / 0.45))
    c.put(T('soldados', 46, WHITE, w='Bold'), W / 2, 800, ramp(t, mmil, 0.3))
    c.put(CHIP('PLAN: ganar antes del invierno', 42, WHITE, (20, 24, 36), AXIS, w='Bold'), W / 2, 1560,
          ramp(t, minv - 0.9, 0.3))
    rank_badge(c, 2, 'BARBARROJA')


def sc_barb2(c):
    t = c.lt
    mmos, minv, mcua = c.m('Moscú'), c.m('invierno'), c.m('Cuarenta')
    pz = ease(t / 2.0)
    cam = (BCAM[0] + (34.5 - BCAM[0]) * pz, BCAM[1] + (55.2 - BCAM[1]) * pz, BCAM[2] * (1 + 0.05) * (1 + 0.75 * pz))
    p = 0.62 + 0.38 * ease(t / max(0.5, mmos))
    tint = ramp(t, minv - 0.2, 1.0)
    barb_base(c, cam, [0.62 + 0.25 * (p - 0.62) / 0.38, p, 0.62 + 0.3 * (p - 0.62) / 0.38], tint)
    mx, my = proj(cam, 37.62, 55.75)
    c.put(CHIP('30 km', 46, WHITE, (30, 10, 12), AXIS), mx - 60, my + 80, ramp(t, mmos - 0.4, 0.3))
    # nieve
    if tint > 0:
        r = np.random.default_rng(3)
        n = 260
        x0, y0, sp, sz = r.random(n) * W, r.random(n) * H, 120 + r.random(n) * 220, 2 + r.random(n) * 5
        for i in range(n):
            x = (x0[i] + 40 * math.sin(t * 1.3 + i)) % W
            y = (y0[i] + sp[i] * t) % H
            cv2.circle(c.arr, (int(x), int(y)), int(sz[i]), mix(c.arr[int(y) % H, int(x) % W].tolist(), (235, 242, 255), tint), -1, cv2.LINE_AA)
    # termómetro
    if t > mcua - 0.6:
        a = ramp(t, mcua - 0.6, 0.3)
        lvl = 1 - ease((t - mcua + 0.2) / 1.6)
        x, y0, y1 = 900, 1000, 1420
        ov = c.arr.copy()
        cv2.rectangle(ov, (x - 34, y0 - 20), (x + 34, y1 + 20), (20, 26, 40), -1)
        cv2.circle(ov, (x, y1 + 40), 58, (20, 26, 40), -1, cv2.LINE_AA)
        cv2.addWeighted(ov, a, c.arr, 1 - a, 0, c.arr)
        col = mix(ICE, AXIS, lvl * 0.6)
        top = int(y1 - (y1 - y0) * (0.08 + 0.85 * lvl))
        if a > 0.5:
            cv2.rectangle(c.arr, (x - 16, top), (x + 16, y1 + 10), col, -1)
            cv2.circle(c.arr, (x, y1 + 40), 42, col, -1, cv2.LINE_AA)
        c.put(T('-40 °C', 130, ICE, (60, 140, 255)), W / 2 - 80, 720, ramp(t, mcua - 0.1, 0.2), pop((t - mcua + 0.1) / 0.45))
        c.put(T('sin ropa de invierno', 46, WHITE, w='Bold'), W / 2 - 80, 830, ramp(t, c.m('ropa') - 0.2, 0.3))


def sc_barb3(c):
    t = c.lt
    mcua, mfr = c.m('cuatro'), c.m('frente')
    c.arr[:] = BG
    s = 70
    xs = [W / 2 + (i - 2) * 190 for i in range(5)]
    for i, x in enumerate(xs):
        on = ramp(t, mcua + 0.15 + i * 0.22, 0.2) if i < 4 else 0
        a = ramp(t, 0.05 * i, 0.3)
        soldier(c.arr, x, 1080, s, mix(mix((14, 16, 26), (95, 100, 115), a), AXIS, on))
        if on > 0:
            soldier(c.gl(), x, 1080, s, mix((0, 0, 0), AXIS, on * 0.6))
    c.put(T('4 de cada 5', 120, GOLD, GOLDG), W / 2, 720, ramp(t, mcua - 0.1, 0.2), pop((t - mcua + 0.1) / 0.45))
    c.put(T('soldados alemanes muertos', 44, WHITE, w='Bold'), W / 2, 820, ramp(t, mcua + 0.4, 0.3))
    a = ramp(t, mfr - 0.3, 0.3)
    if a > 0:
        x0, x1 = int(xs[0] - 70), int(xs[3] + 70)
        cv2.line(c.arr, (x0, 1300), (x1, 1300), mix(BG[1300, W // 2].tolist(), AXIS, a), 6, cv2.LINE_AA)
        for xx in (x0, x1):
            cv2.line(c.arr, (xx, 1270), (xx, 1300), mix(BG[1300, W // 2].tolist(), AXIS, a), 6, cv2.LINE_AA)
        c.put(T('FRENTE DEL ESTE', 50, WHITE), (x0 + x1) / 2, 1370, a)
        c.put(T('OTROS', 36, (150, 150, 165), w='Bold'), xs[4], 1370, a)


SCAM = (44.0, 49.6, 210.0)
STALIN = (44.52, 48.71)
r2 = np.random.default_rng(11)
POCK6 = np.c_[STALIN[0] - 0.75 + r2.normal(0, 0.32, 170), STALIN[1] + 0.05 + r2.normal(0, 0.2, 170)]


def stal_base(c, cam, ring_p, dim_blob=0.0):
    draw_map(c.arr, cam, {})
    g = c.gl()
    for lo, la in POCK6:
        x, y = proj(cam, lo, la)
        r = max(4, int(cam[2] / 14))
        cv2.circle(c.arr, (int(x), int(y)), r, mix(ARROW, (60, 30, 30), dim_blob), -1, cv2.LINE_AA)
        cv2.circle(g, (int(x), int(y)), r, (120, 30, 20), -1, cv2.LINE_AA)
    x, y = proj(cam, *STALIN)
    pin(c.arr, x, y, WHITE, 11)
    c.put(T('STALINGRADO', 38, WHITE), x + 150, y + 10, 0.95 * ramp(cam[2], 80, 30))
    if ring_p > 0:
        cx, cy = proj(cam, STALIN[0] - 0.7, STALIN[1] + 0.05)
        ax, ay = int(1.55 * cam[2] * 0.643), int(0.95 * cam[2])
        ang = 180 * ring_p
        cv2.ellipse(c.arr, (int(cx), int(cy)), (ax, ay), 0, 180 - ang, 180 + ang, (0, 0, 0), 34, cv2.LINE_AA)
        for tgt in (c.arr, g):
            cv2.ellipse(tgt, (int(cx), int(cy)), (ax, ay), 0, 180 - ang, 180 + ang, SOV, 22, cv2.LINE_AA)
        if ring_p > 0.3:
            rx, ry = proj(cam, STALIN[0] - 0.7, STALIN[1] + 1.25)
            c.put(CHIP('SOVIÉTICOS', 36, (30, 20, 8), SOV), rx, ry - 10, ramp(ring_p, 0.3, 0.3))
    lx, ly = proj(cam, STALIN[0] - 0.75, STALIN[1] + 0.05)
    c.put(T('6º EJÉRCITO', 40, WHITE), lx, ly + 110, 0.95 * ramp(cam[2], 80, 30))


def sc_stal1(c):
    t = c.lt
    mrod, mmil = c.m('rodearon'), c.m('250.000')
    pz = ease((t - 1.6) / 1.6)
    cam = (BCAM[0] + (SCAM[0] - BCAM[0]) * pz, BCAM[1] + (SCAM[1] - BCAM[1]) * pz, BCAM[2] * (SCAM[2] / BCAM[2]) ** pz)
    stal_base(c, cam, ease((t - mrod) / 1.4))
    c.put(CHIP('NOVIEMBRE 1942', 44, GOLD, (24, 20, 14), GOLD), W / 2, 560, ramp(t, 1.9, 0.3))
    c.put(T('+250.000', 150, GOLD, GOLDG), W / 2, 700, ramp(t, mmil - 0.3, 0.2), pop((t - mmil + 0.3) / 0.45))
    c.put(T('hombres rodeados', 46, WHITE, w='Bold'), W / 2, 800, ramp(t, mmil, 0.3))
    rank_badge(c, 1, 'STALINGRADO')


def sc_stal2(c):
    t = c.lt
    mrom, mno = c.m('romper'), c.m('no', 1)
    for s_, e_, tok in c.beat['words']:
        if norm(tok) == 'no':
            mno = s_
    stal_base(c, SCAM, 1.0)
    a = ramp(t, mrom - 0.2, 0.3) * (1 - ramp(t, mno, 0.4))
    if a > 0:
        g = c.gl()
        pts = np.stack(proj(SCAM, *bez((43.6, 48.9), (42.8, 49.0), (41.6, 48.8)).T), 1)
        arrow(c.arr, g, pts, a * ease((t - mrom) / 0.9), mix(SEA, WHITE, a), 16)
        x, y = proj(SCAM, 41.9, 49.35)
        c.put(CHIP('¿ROMPER EL CERCO?', 40, WHITE, (20, 24, 36), WHITE), x + 60, y + 170, a)
    if t > mno - 0.1:
        c.dark = 0.45 * ramp(t, mno - 0.1, 0.2)
        c.put(STAMP('NO', 260, ARROW), W / 2, 640, ramp(t, mno - 0.1, 0.1), 1 + 0.7 * (1 - eout((t - mno + 0.1) / 0.3)))
        c.put(T('“resistir”', 60, WHITE, w='Bold'), W / 2, 820, ramp(t, c.m('resistir') - 0.1, 0.3))


def sc_stal3(c):
    t = c.lt
    mrin, mvol, mcin = c.m('rindieron'), c.m('volvieron'), c.m('cinco')
    c.arr[:] = BG
    cols, rows, sp = 13, 7, 66
    x0, y0 = W / 2 - (cols - 1) * sp / 2, 1000
    keep = {2, 18, 47, 63, 88}
    fade = ramp(t, mcin - 0.2, 0.8)
    g = c.gl()
    for i in range(91):
        r_, q = divmod(i, cols)
        x, y = int(x0 + q * sp), int(y0 + r_ * sp)
        a = ramp(t, mrin - 0.2 + i * 0.012, 0.15)
        if a <= 0:
            continue
        if i in keep:
            col = mix((210, 210, 220), GOLD, ramp(t, mcin - 0.2, 0.3))
            if t > mcin - 0.2:
                cv2.circle(g, (x, y), 24, mix((0, 0, 0), GOLDG, ramp(t, mcin - 0.2, 0.3)), -1, cv2.LINE_AA)
        else:
            col = mix((210, 210, 220), (45, 45, 55), fade)
        cv2.circle(c.arr, (x, y), int(24 * a), mix(BG[y, x].tolist(), col, a), -1, cv2.LINE_AA)
    c.put(CHIP('FEBRERO 1943', 44, GOLD, (24, 20, 14), GOLD), W / 2, 560, ramp(t, 0.1, 0.3))
    a1 = ramp(t, mrin, 0.2) * (1 - ramp(t, mcin - 0.55, 0.25))
    c.put(T('91.000', 150, WHITE, (140, 140, 170)), W / 2, 720, a1, pop((t - mrin) / 0.45))
    c.put(T('prisioneros', 46, WHITE, w='Bold'), W / 2, 820, a1)
    a2 = ramp(t, mcin - 0.3, 0.2)
    c.put(T('5.000', 170, GOLD, GOLDG), W / 2, 720, a2, pop((t - mcin + 0.3) / 0.45))
    c.put(T('volvieron a casa', 46, WHITE, w='Bold'), W / 2, 830, a2)
    c.put(T('●  = 1.000 soldados', 34, (160, 160, 175), w='Bold'), W / 2, 1530, ramp(t, mrin + 0.6, 0.4))


def sc_verdict(c):
    t = c.lt
    mmed, mhis, mpero = c.m('medio'), c.m('historiadores'), c.m('Pero')
    c.arr[:] = BG
    if t < mmed:
        ang = 7 * math.sin(t * 3.0) * (1 - ramp(t, mmed - 0.5, 0.5))
    elif t < mpero:
        ang = 11 * ease((t - mmed) / 0.9)
    else:
        ang = 11 - 5 * ease((t - mpero) / 1.0)
    ang += 1.2 * math.sin(t * 2.2)
    cx, cy, L = W / 2, 980, 290
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    g = c.gl()
    gold = (220, 175, 80)
    pole = np.array([[cx - 12, cy], [cx + 12, cy], [cx + 18, cy + 520], [cx - 18, cy + 520]])
    cv2.fillPoly(c.arr, [(pole * 16).astype(np.int32)], gold, cv2.LINE_AA, 4)
    cv2.ellipse(c.arr, (int(cx), int(cy + 525)), (150, 26), 0, 0, 360, gold, -1, cv2.LINE_AA)
    ends = []
    for sgn in (-1, 1):
        ex, ey = cx + sgn * L * ca, cy + sgn * L * sa
        ends.append((ex, ey))
    cv2.line(c.arr, (int(ends[0][0]), int(ends[0][1])), (int(ends[1][0]), int(ends[1][1])), gold, 16, cv2.LINE_AA)
    cv2.line(g, (int(ends[0][0]), int(ends[0][1])), (int(ends[1][0]), int(ends[1][1])), (120, 80, 20), 16, cv2.LINE_AA)
    star(c.arr, cx, cy, 30, GOLD)
    for (ex, ey), lab, sub, colr in ((ends[0], 'SUS ERRORES', 'Dunkerque·Moscú·Stalingrado', ARROW),
                                      (ends[1], 'MEDIO MUNDO', 'EE. UU.·URSS·R. Unido', ALLY)):
        py = ey + 230
        for dx in (-130, 130):
            cv2.line(c.arr, (int(ex), int(ey)), (int(ex + dx), int(py)), (150, 120, 60), 3, cv2.LINE_AA)
        cv2.ellipse(c.arr, (int(ex), int(py)), (160, 50), 0, 0, 180, gold, -1, cv2.LINE_AA)
        cv2.ellipse(c.arr, (int(ex), int(py)), (160, 14), 0, 0, 360, (250, 215, 130), -1, cv2.LINE_AA)
        c.put(CHIP(lab, 40, WHITE, mix((14, 16, 26), colr, 0.35), colr), ex, py - 70, ramp(t, 0.2, 0.3))
        c.put(T(sub, 24, (200, 200, 210), w='Bold'), ex, py + 95, ramp(t, 0.5, 0.3))
    c.put(T('¿Errores o medio mundo?', 64, GOLD, GOLDG), W / 2, 680, ramp(t, 0.1, 0.3))
    if t > mpero - 0.2:
        c.put(CHIP('Los errores aceleraron la caída', 44, GOLD, (24, 20, 14), GOLD, w='Bold'), W / 2, 1640,
              ramp(t, mpero - 0.2, 0.3), pop((t - mpero + 0.2) / 0.4))


def sc_cta(c):
    t = c.lt
    c.arr[:] = BG
    rows = [('3', 'DUNKERQUE', 'se detuvo'), ('2', 'BARBARROJA', 'el invierno'), ('1', 'STALINGRADO', '“resistir”')]
    for i, (n, name, sub) in enumerate(rows):
        a = ramp(t, 0.15 + i * 0.25, 0.3)
        y = 760 + i * 190
        c.put(CHIP(f'{n}   {name}', 64, WHITE, (22, 22, 34), ARROW if i == 2 else (90, 90, 110)), W / 2 - 80, y, a,
              pop((t - 0.15 - i * 0.25) / 0.4))
        c.put(T(sub, 34, (190, 190, 200), w='Bold'), W / 2 + 360, y, a)
    a = ramp(t, c.m('amigo') - 0.3, 0.3)
    s = 1 + 0.05 * math.sin(t * 6)
    c.put(T('ENVÍASELO', 120, GOLD, GOLDG), W / 2, 1420, a, s * pop((t - c.m('amigo') + 0.3) / 0.45))
    c.put(T('a ese amigo de los documentales', 40, WHITE, w='Bold'), W / 2, 1530, a)


SCENES = dict(hook=sc_hook, dunk1=sc_dunk1, dunk2=sc_dunk2, dunk3=sc_dunk3, barb1=sc_barb1, barb2=sc_barb2,
              barb3=sc_barb3, stal1=sc_stal1, stal2=sc_stal2, stal3=sc_stal3, verdict=sc_verdict, cta=sc_cta)
MAP_SCENES = {'hook', 'dunk1', 'dunk2', 'dunk3', 'barb1', 'barb2', 'stal1', 'stal2'}


# ---------------------------------------------------------------- subtítulos
def chunks(words, maxw=4, maxc=26):
    out, cur = [], []
    for w in words:
        cur.append(w)
        txt = ' '.join(x[2] for x in cur)
        if len(cur) >= maxw or len(txt) >= maxc or w[2][-1] in '.,?:!…':
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def draw_subs(im, cues, t):
    cue = None
    for i, ch in enumerate(cues):
        s = ch[0][0]
        e = cues[i + 1][0][0] if i + 1 < len(cues) else ch[-1][1] + 0.4
        if s - 0.05 <= t < e:
            cue = ch
            break
    if not cue:
        return
    sz = 64
    f = font(sz, 'ExtraBold')
    sp = f.getlength(' ')
    ws = [f.getlength(w[2]) for w in cue]
    tot = sum(ws) + sp * (len(ws) - 1)
    if tot > W - 100:
        sz = int(sz * (W - 100) / tot)
        f = font(sz, 'ExtraBold')
        sp = f.getlength(' ')
        ws = [f.getlength(w[2]) for w in cue]
        tot = sum(ws) + sp * (len(ws) - 1)
    ov = Image.new('RGBA', (W, 220), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    x = (W - tot) / 2
    y = 110
    for (s, e, tok), wd in zip(cue, ws):
        cur = s - 0.03 <= t
        active = s - 0.03 <= t < e + 0.08
        if active:
            d.rounded_rectangle((x - 12, y - sz * 0.68, x + wd + 12, y + sz * 0.62), 12, fill=(250, 250, 252, 255))
            d.text((x, y), tok, font=f, fill=(14, 14, 22, 255), anchor='lm')
        else:
            col = (255, 255, 255, 255) if cur else (200, 200, 210, 230)
            d.text((x, y), tok, font=f, fill=col, anchor='lm', stroke_width=4, stroke_fill=(0, 0, 0, 200))
        x += wd + sp
    im.alpha_composite(ov, (0, 330 - 110))


# ---------------------------------------------------------------- render
G = {}


def frame(gt):
    beats = G['beats']
    i = max((k for k, b in enumerate(beats) if b['start'] <= gt + 1e-6), default=0)
    b = beats[i]
    arr = np.zeros((H, W, 3), np.uint8)
    c = Ctx(arr, gt - b['start'], b['dur'], b)
    SCENES[b['name']](c)
    out = arr.astype(np.float32)
    if c.glow is not None:
        gl = cv2.GaussianBlur(c.glow, (0, 0), 14).astype(np.float32)
        out += gl * 0.9
    if b['name'] in MAP_SCENES:
        out *= VIG
    if c.dark > 0:
        out *= 1 - c.dark
    # fundido corto al inicio de cada escena
    lt = gt - b['start']
    if lt < 0.12 and i > 0:
        out *= 0.55 + 0.45 * lt / 0.12
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).convert('RGBA')
    for patch, x, y, a, s in c.items:
        p = patch
        if abs(s - 1) > 0.01:
            p = p.resize((max(1, int(p.width * s)), max(1, int(p.height * s))), Image.BILINEAR)
        if a < 0.999:
            pa = np.array(p)
            pa[..., 3] = (pa[..., 3] * clamp(a)).astype(np.uint8)
            p = Image.fromarray(pa, 'RGBA')
        x0, y0 = int(x - p.width / 2), int(y - p.height / 2)
        cx0, cy0 = max(0, -x0), max(0, -y0)
        cx1, cy1 = min(p.width, W - x0), min(p.height, H - y0)
        if cx1 > cx0 and cy1 > cy0:
            im.alpha_composite(p.crop((cx0, cy0, cx1, cy1)), (x0 + cx0, y0 + cy0))
    draw_subs(im, G['cues'], gt)
    return np.array(im.convert('RGB'))


def init_worker(beats, cues, geo):
    G['beats'], G['cues'] = beats, cues
    load_map(geo)


def render_seg(args):
    k, f0, f1, path = args
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                          '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
                          '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(frame(fi / FPS).tobytes())
    p.stdin.close()
    p.wait()
    return path


# ---------------------------------------------------------------- audio
def synth_audio(beats, total, voice):
    n = int(total * SR)
    t = np.arange(n) / SR
    mus = (0.5 * np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 82.41 * t + 1)
           + 0.18 * np.sin(2 * np.pi * 110.3 * t) + 0.08 * np.sin(2 * np.pi * 164.8 * t))
    mus *= 0.65 + 0.35 * np.sin(2 * np.pi * t / 7.0)
    # pulso tipo tambor de guerra (70 bpm)
    beat = 60 / 70
    kick_t = np.arange(int(0.5 * SR)) / SR
    kick = np.sin(2 * np.pi * (45 * kick_t + 75 * (1 - np.exp(-kick_t * 25)) / 25)) * np.exp(-kick_t * 9)
    for bt in np.arange(0, total - 0.5, beat):
        s = int(bt * SR)
        mus[s:s + len(kick)] += 0.9 * kick[:n - s]
    mus *= np.clip(np.minimum(t / 1.5, (total - t) / 1.5), 0, 1)
    sfx = np.zeros(n)
    rnd = np.random.default_rng(1)

    def add(at, sig, g):
        s = int(at * SR)
        if s < n:
            sfx[s:s + len(sig)] += g * sig[:n - s]
    wl = int(0.55 * SR)
    wt = np.arange(wl) / SR
    noise = rnd.normal(0, 1, wl)
    k = np.exp(-np.linspace(-3, 3, 41) ** 2)
    whoosh = np.convolve(noise, k / k.sum(), 'same') * np.sin(np.pi * wt / wt[-1]) ** 2
    bl = int(1.4 * SR)
    btt = np.arange(bl) / SR
    boom = (np.sin(2 * np.pi * (34 * btt + 50 * (1 - np.exp(-btt * 6)) / 6)) * np.exp(-btt * 2.6)
            + 0.3 * rnd.normal(0, 1, bl) * np.exp(-btt * 18))
    for b in beats[1:]:
        add(b['start'] - 0.2, whoosh, 0.35)
    for b in beats:
        if b['name'] in ('dunk1', 'barb1', 'stal1'):
            add(b['start'] + 0.05, boom, 0.9)
        for key, w_ in (('dunk2', 'detenerse'), ('stal2', 'no')):
            if b['name'] == key:
                for s_, e_, tok in b['words']:
                    if norm(tok) == w_:
                        add(b['start'] + s_ - 0.05, boom, 0.8)
                        break
    mix_ = voice + 0.10 * mus / np.abs(mus).max() + 0.22 * sfx / max(1e-6, np.abs(sfx).max())
    return mix_ / np.abs(mix_).max() * 0.89


def main(work, outdir, preview=False):
    os.makedirs(work, exist_ok=True)
    os.makedirs(outdir, exist_ok=True)
    beats, start = [], 0.3
    voice_parts = []
    for i, (name, text) in enumerate(BEATS):
        words, wav = tts(text, VOICE, RATE, os.path.join(work, f'b{i:02d}'))
        a, off = trim_silence(read_wav(wav))
        al = [(s - off, e - off, tok) for s, e, tok in align_words(text, words)]
        dur = len(a) / SR + GAP + (1.4 if i == len(BEATS) - 1 else 0)
        beats.append(dict(name=name, text=text, start=start, dur=dur, words=al, alen=len(a) / SR))
        voice_parts.append((start, a))
        start += dur
    total = start
    print('duración', round(total, 2))
    voice = np.zeros(int(total * SR) + SR)
    for st, a in voice_parts:
        s = int(st * SR)
        voice[s:s + len(a)] += a / max(1e-6, np.abs(a).max()) * 0.8
    voice = voice[:int(total * SR)]
    audio = synth_audio(beats, total, voice)
    wavp = os.path.join(work, 'mix.wav')
    with wave.open(wavp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((audio * 32767).astype(np.int16).tobytes())
    # subtítulos
    allw = [(b['start'] + s, b['start'] + e, tok) for b in beats for s, e, tok in b['words']]
    cues = chunks(allw)
    with open(os.path.join(outdir, OUT + '.srt'), 'w') as fh:
        for i, ch in enumerate(cues):
            e = min(ch[-1][1] + 0.3, cues[i + 1][0][0]) if i + 1 < len(cues) else ch[-1][1] + 0.6
            fh.write(f'{i + 1}\n{srt_time(ch[0][0])} --> {srt_time(e)}\n{" ".join(w[2] for w in ch)}\n\n')
    with open(os.path.join(outdir, OUT + '.txt'), 'w') as fh:
        fh.write('LOS 3 ERRORES QUE HICIERON PERDER A HITLER\n')
        fh.write(f'Video vertical 9:16 · {total:.0f} s · voz {VOICE}\n\n')
        for b in beats:
            fh.write(f'[{b["start"]:5.1f}s] {b["text"]}\n')
    geo = os.path.join(work, 'countries.geojson')
    if preview:
        init_worker(beats, cues, geo)
        for b in beats:
            for frac in (0.3, 0.85):
                gt = b['start'] + b['dur'] * frac
                Image.fromarray(frame(gt)).resize((W // 2, H // 2)).save(os.path.join(work, f'prev_{b["name"]}_{int(frac*100)}.jpg'))
        return
    nf = int(total * FPS)
    nseg = 8
    segs = [(k, k * nf // nseg, (k + 1) * nf // nseg, os.path.join(work, f'seg{k}.mp4')) for k in range(nseg)]
    with Pool(4, init_worker, (beats, cues, geo)) as pool:
        paths = pool.map(render_seg, segs)
    lst = os.path.join(work, 'segs.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in paths))
    out = os.path.join(outdir, OUT + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wavp,
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out],
                   check=True)
    print('listo', out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], '--preview' in sys.argv)
