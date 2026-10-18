"""Render del video de comidas: mapa satelital, banderas recortadas, tarjetas pendulares y subtítulos palabra a palabra.

Uso: render.py <timings.json> <salida.mp4> [--audio voz.wav] [--frames a:b] [--stills t1,t2,...] [--workers N]
"""
import sys, os, json, math, pickle, argparse, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from geo import W0, H0, lonlat_to_px
from layout import COUNTRIES, EMPHASIS, INTRO_VIEWS

WORK = os.environ.get('WORK', '/home/user/Automatizacion/work')
A = os.path.join(WORK, 'assets')
FONT = os.path.join(WORK, 'dl/font/LilitaOne-Regular.ttf')
OW, OH, FPS = 1080, 1920, 30
OC = np.array([OW / 2, OH / 2])

# ----------------------------------------------------------------------------- utilidades
def clamp(x, a, b): return max(a, min(b, x))
def smooth(x): x = clamp(x, 0, 1); return x * x * (3 - 2 * x)
def smoother(x): x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10)
def ease_out_back(x, k=1.6):
    x = clamp(x, 0, 1); return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2

def deg_px(deg): return deg / 360 * W0

# ----------------------------------------------------------------------------- cámara
def zoom_path(v0, v1, rho=1.25):
    """Trayectoria de zoom suave (van Wijk & Nuij, como d3.interpolateZoom). v = (cx, cy, w)."""
    ux0, uy0, w0 = v0; ux1, uy1, w1 = v1
    dx, dy = ux1 - ux0, uy1 - uy0; d2 = dx * dx + dy * dy
    r2, r4 = rho * rho, rho ** 4
    if d2 < 1e-6:
        S = math.log(w1 / w0) / rho
        return lambda t: (ux0 + t * dx, uy0 + t * dy, w0 * math.exp(rho * t * S))
    d1 = math.sqrt(d2)
    b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d1)
    b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d1)
    q0 = math.log(math.sqrt(b0 * b0 + 1) - b0); q1 = math.log(math.sqrt(b1 * b1 + 1) - b1)
    S = (q1 - q0) / rho
    def f(t):
        s = t * S; c0 = math.cosh(q0)
        u = w0 / (r2 * d1) * (c0 * math.tanh(rho * s + q0) - math.sinh(q0))
        return (ux0 + u * dx, uy0 + u * dy, w0 * c0 / math.cosh(rho * s + q0))
    return f

def view_fit(px_box, screen_box):
    """Vista (cx, cy, w) que encaja la caja de píxeles L0 del país dentro de la caja de pantalla."""
    x0, y0, x1, y1 = px_box; sx0, sy0, sx1, sy1 = screen_box
    s = max((x1 - x0) / (sx1 - sx0), (y1 - y0) / (sy1 - sy0))          # px L0 por px de salida
    cx = (x0 + x1) / 2 - ((sx0 + sx1) / 2 - OW / 2) * s
    cy = (y0 + y1) / 2 - ((sy0 + sy1) / 2 - OH / 2) * s
    return (cx, cy, s * OW)

MAX_W = (H0 - 400) * OW / OH * 0.97

def clamp_view(cx, cy, w, rot):
    """Mantiene el encuadre (incluida su rotación) dentro de la textura: nunca bordes ni franjas."""
    w = min(w, MAX_W)
    s = w / OW; r = math.radians(abs(rot))
    hw = (OW * math.cos(r) + OH * math.sin(r)) / 2 * s + 6
    hh = (OW * math.sin(r) + OH * math.cos(r)) / 2 * s + 6
    return clamp(cx, hw, W0 - hw), clamp(cy, hh, H0 - hh), w

class Timeline:
    def __init__(self, words, duration):
        self.words = words; self.duration = duration
        paras = {}
        for w in words: paras.setdefault(w['para'], []).append(w)
        self.segs = []
        def norm(s): return ''.join(ch for ch in s.lower() if ch.isalnum() or ch == '-')
        for key, c in COUNTRIES.items():
            # párrafo que contiene el nombre del país y la palabra del plato
            for pi, ws in paras.items():
                names = [w for w in ws if norm(w['text']) == norm(c['say'])]
                if names: break
            else:
                raise SystemExit(f'no encuentro "{c["say"]}" en la narración')
            dish = next(w for w in ws if norm(w['text']) == norm(c['dish_word']))
            self.segs.append(dict(key=key, c=c, para=pi, t_para=ws[0]['start'], t_name_s=names[0]['start'],
                                  t_name=names[0]['end'], t_dish=dish['start'], t_end=ws[-1]['end']))
        for s in self.segs:
            s['fly0'] = s['t_para'] - 0.12
            s['fly1'] = max(s['t_name'] + 0.05, s['fly0'] + 1.5)
            if s['fly1'] - s['fly0'] > 3.2: s['fly0'] = s['fly1'] - 3.2
        for i, s in enumerate(self.segs):
            s['card_in'] = max(s['t_dish'] - 0.05, s['fly1'] + 0.85)
            nxt = self.segs[i + 1]['fly0'] if i + 1 < len(self.segs) else duration + 5
            s['leave'] = nxt
            s['card_out'] = nxt - 0.35 if i + 1 < len(self.segs) else duration + 5
            end = min(s['t_end'], s['card_out'] - 0.5)
            s['swap'] = s['card_in'] + max(1.6, (end - s['card_in']) * 0.5)
        self.build_camera()

    def build_camera(self):
        c0 = INTRO_VIEWS
        v_a = lonlat_to_px(*c0[0][:2]) + (deg_px(c0[0][2]),)
        v_b = lonlat_to_px(*c0[1][:2]) + (deg_px(c0[1][2]),)
        self.keys = []   # (t0, t1, función de t local [0..1] -> vista)
        first = self.segs[0]['fly0']
        intro = zoom_path(v_a, v_b)
        self.keys.append((0, first, lambda u, f=intro: f(smooth(u) * 0.35 + u * 0.65)))
        prev_end = v_b
        for s in self.segs:
            c = s['c']
            box = [*c['px_box']]
            A_ = view_fit(box, c['arrive_box']); B_ = view_fit(box, c['country_box'])
            s['A'], s['B'] = A_, B_
            fly = zoom_path(prev_end, A_)
            self.keys.append((s['fly0'], s['fly1'], lambda u, f=fly: f(smoother(u))))
            # sostenido: reencuadre A->B antes de la tarjeta y acercamiento lento posterior
            t_b0, t_b1 = s['fly1'], s['card_in'] - 0.08
            hold_end = s['leave']
            def hold(u, s=s, t_b0=t_b0, t_b1=t_b1, hold_end=hold_end):
                t = s['fly1'] + u * (hold_end - s['fly1'])
                k = smooth((t - t_b0) / max(0.3, t_b1 - t_b0))
                cx = s['A'][0] + (s['B'][0] - s['A'][0]) * k
                cy = s['A'][1] + (s['B'][1] - s['A'][1]) * k
                w = s['A'][2] + (s['B'][2] - s['A'][2]) * k
                z = 1 - 0.03 * smooth((t - t_b1) / max(1, hold_end - t_b1))
                return (cx, cy, w * z)
            self.keys.append((s['fly1'], hold_end, hold))
            prev_end = None
            s['hold'] = hold
            # el siguiente vuelo parte exactamente de donde terminó el sostenido
            prev_end = hold(1.0) if hold_end < self.duration + 4 else None

    def camera(self, t):
        for t0, t1, f in self.keys:
            if t < t1 or (t0, t1, f) == self.keys[-1]:
                u = (t - t0) / max(1e-6, t1 - t0)
                cx, cy, w = f(clamp(u, 0, 1))
                break
        # deriva continua (función del tiempo global): paneo y balanceo muy leves
        amp = clamp((6000 - w) / 4000, 0, 1)
        cx += w * 0.0045 * math.sin(2 * math.pi * t / 9.0)
        cy += w * 0.0035 * math.sin(2 * math.pi * t / 11.0 + 1.1)
        rot = 0.45 * amp * math.sin(2 * math.pi * t / 13.0 + 0.4)
        cx, cy, w = clamp_view(cx, cy, w, rot)
        return cx, cy, w, rot

# ----------------------------------------------------------------------------- recursos
class Assets:
    def __init__(self):
        self.levels = [np.load(os.path.join(A, f'L{k}.npy'), mmap_mode='r') for k in range(5)]
        self.borders = pickle.load(open(os.path.join(A, 'borders.pkl'), 'rb'))
        self.bbox = {k: [(r.min(0), r.max(0)) for r in v] for k, v in self.borders.items()}
        fm = json.load(open(os.path.join(A, 'flags.json')))
        self.flags = {}
        for k, m in fm.items():
            im = Image.open(os.path.join(A, f'flag_{k}.png')).convert('RGBA')
            pyr = [im]
            for _ in range(4): pyr.append(pyr[-1].resize((max(1, pyr[-1].width // 2), max(1, pyr[-1].height // 2)), Image.LANCZOS))
            self.flags[k] = (m, pyr)
        self.outlines = {k: pickle.load(open(os.path.join(A, f'outline_{k}.pkl'), 'rb')) for k in fm}
        yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
        r = np.sqrt(((xx - OW / 2) / (OW * 0.62)) ** 2 + ((yy - OH / 2) / (OH * 0.60)) ** 2)
        self.vignette = (1 - 0.55 * np.clip(r - 0.35, 0, 1) ** 1.6)[..., None].astype(np.float32)
        self.font_sub = ImageFont.truetype(FONT, 104)
        self.font_name = ImageFont.truetype(FONT, 96)
        self.cards = {}

    @functools.lru_cache(maxsize=256)
    def word_img(self, text, yellow):
        return text_sprite(text, self.font_sub, (255, 214, 10) if yellow else (255, 255, 255), stroke=7)

    @functools.lru_cache(maxsize=16)
    def name_img(self, text):
        return text_sprite(text, self.font_name, (255, 255, 255), stroke=6)

def text_sprite(text, font, color, stroke):
    l, t, r, b = font.getbbox(text, stroke_width=stroke)
    pad = 30
    im = Image.new('RGBA', (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((pad - l + 3, pad - t + 7), text, font=font, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(7))
    d = ImageDraw.Draw(im)
    d.text((pad - l, pad - t), text, font=font, fill=color + (255,), stroke_width=stroke, stroke_fill=(18, 22, 30, 255))
    sh.alpha_composite(im)
    return sh

# ----------------------------------------------------------------------------- tarjeta
def make_card(path, size, focus=(0.5, 0.5)):
    """Foto recortada al rectángulo de la tarjeta (de frente, sin texto)."""
    w, h = size
    if not os.path.exists(path):
        print('AVISO: falta la foto', path, '- marcador gris solo para previsualizar', file=sys.stderr)
        return Image.new('RGB', (w, h), (90, 90, 90))
    im = Image.open(path).convert('RGB')
    s = max(w / im.width, h / im.height)
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    x = int((im.width - w) * focus[0]); y = int((im.height - h) * focus[1])
    return im.crop((x, y, x + w, y + h))

def card_frame(photos, mix, size, radius=26, border=4):
    """Contenedor: foto(s) mezcladas + esquinas redondeadas + borde fino + sombra discreta."""
    w, h = size
    content = photos[0] if mix <= 0 else (photos[1] if mix >= 1 else Image.blend(photos[0], photos[1], mix))
    pad = 40
    canvas = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    m = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius * 2, fill=255)
    m = m.resize((w, h), Image.LANCZOS)
    sh = Image.new('L', canvas.size, 0); sh.paste(m, (pad, pad + 10))
    sh = sh.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.5))
    canvas.paste(Image.new('RGBA', canvas.size, (0, 0, 0, 255)), (0, 0), sh)
    bor = Image.new('RGBA', (w, h), (255, 255, 255, 235))
    canvas.paste(bor, (pad, pad), m)
    inner = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(inner).rounded_rectangle([border * 2, border * 2, w * 2 - 1 - border * 2, h * 2 - 1 - border * 2], (radius - border) * 2, fill=255)
    inner = inner.resize((w, h), Image.LANCZOS)
    canvas.paste(content.convert('RGBA'), (pad, pad), inner)
    return canvas, pad

# ----------------------------------------------------------------------------- render de un fotograma
class Renderer:
    def __init__(self, tl):
        self.tl = tl; self.a = Assets()
        self.card_photos = {}
        for s in tl.segs:
            c = s['c']; size = (c['card'][2], c['card'][3])
            self.card_photos[s['key']] = [make_card(os.path.join(WORK, p['file']), size, p.get('focus', (0.5, 0.5))) for p in c['photos']]
        self.stats = []

    def to_screen(self, pts, cam):
        cx, cy, w, rot = cam; s = w / OW; r = math.radians(rot)
        d = (pts - [cx, cy]) / s
        c, sn = math.cos(-r), math.sin(-r)
        return np.stack([d[:, 0] * c - d[:, 1] * sn, d[:, 0] * sn + d[:, 1] * c], 1) + OC

    def map_layer(self, cam):
        cx, cy, w, rot = cam
        s = w / OW
        k = int(clamp(math.floor(math.log2(max(s, 1))), 0, 4))
        L = self.a.levels[k]; sk = s / 2 ** k
        ccx, ccy = cx / 2 ** k, cy / 2 ** k
        R = math.hypot(OW, OH) / 2 * sk + 8
        x0, y0 = int(max(0, ccx - R)), int(max(0, ccy - R))
        x1, y1 = int(min(L.shape[1], ccx + R)), int(min(L.shape[0], ccy + R))
        crop = Image.fromarray(np.ascontiguousarray(L[y0:y1, x0:x1]))
        r = math.radians(rot); c, sn = math.cos(r), math.sin(r)
        a, b, d_, e = sk * c, -sk * sn, sk * sn, sk * c
        tx = ccx - x0 - (a * OW / 2 + b * OH / 2); ty = ccy - y0 - (d_ * OW / 2 + e * OH / 2)
        out = crop.transform((OW, OH), Image.AFFINE, (a, b, tx, d_, e, ty), resample=Image.BICUBIC)
        # control de bordes: las cuatro esquinas del encuadre deben caer dentro de la textura
        corners = np.array([[0, 0], [OW, 0], [0, OH], [OW, OH]], np.float32)
        src = np.stack([a * corners[:, 0] + b * corners[:, 1] + tx + x0, d_ * corners[:, 0] + e * corners[:, 1] + ty + y0], 1) * 2 ** k
        ok = (src[:, 0] >= 0).all() and (src[:, 0] <= W0).all() and (src[:, 1] >= 0).all() and (src[:, 1] <= H0).all()
        return out, ok

    def draw_borders(self, img, cam):
        cx, cy, w, rot = cam
        lvl = 'fine' if w < 4500 else 'coarse'
        s = w / OW; R = math.hypot(OW, OH) / 2 * s
        alpha = int(clamp(150 - (w - 2500) / 60, 55, 120))
        lay = Image.new('RGBA', (OW, OH), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        for ring, (lo, hi) in zip(self.a.borders[lvl], self.a.bbox[lvl]):
            if hi[0] < cx - R or lo[0] > cx + R or hi[1] < cy - R or lo[1] > cy + R: continue
            p = self.to_screen(ring, cam)
            d.line([tuple(v) for v in p], fill=(255, 255, 255, alpha), width=2)
        img.alpha_composite(lay)

    def flag_layer(self, key, cam):
        m, pyr = self.a.flags[key]
        cx, cy, w, rot = cam; s = w / OW
        k = int(clamp(math.floor(math.log2(max(s, 1))), 0, 4))
        im = pyr[k]; sk = s / 2 ** k
        r = math.radians(rot); c, sn = math.cos(r), math.sin(r)
        a, b, d_, e = sk * c, -sk * sn, sk * sn, sk * c
        ox, oy = (cx - m['x0']) / 2 ** k, (cy - m['y0']) / 2 ** k
        tx = ox - (a * OW / 2 + b * OH / 2); ty = oy - (d_ * OW / 2 + e * OH / 2)
        return im.transform((OW, OH), Image.AFFINE, (a, b, tx, d_, e, ty), resample=Image.BILINEAR)

    def outline_layer(self, key, cam, alpha):
        lvl = 'fine' if cam[2] < 4500 else 'coarse'
        line = Image.new('L', (OW, OH), 0); glow = Image.new('L', (OW, OH), 0)
        dl, dg = ImageDraw.Draw(line), ImageDraw.Draw(glow)
        for ring in self.a.outlines[key][lvl]:
            p = [tuple(v) for v in self.to_screen(ring, cam)]
            dl.line(p + [p[0]], fill=255, width=4, joint='curve')
            dg.line(p + [p[0]], fill=255, width=14, joint='curve')
        glow = glow.filter(ImageFilter.GaussianBlur(9))
        g = np.maximum(np.asarray(line, np.float32), np.asarray(glow, np.float32) * 0.75) * alpha
        return g

    def frame(self, t):
        tl = self.tl
        cam = tl.camera(t)
        base, ok = self.map_layer(cam)
        img = base.convert('RGBA')
        self.draw_borders(img, cam)
        stat = dict(t=round(t, 3), edge_ok=bool(ok), cam=[round(v, 1) for v in cam])
        flag_alpha_for_check = None
        for s in tl.segs:
            if t < s['fly1'] - 0.5 or t > s['leave'] + 0.6: continue
            out_k = 1 - smooth((t - s['leave']) / 0.45)
            a_out = smooth((t - (s['fly1'] - 0.4)) / 0.35) * out_k
            a_flag = smooth((t - (s['fly1'] + 0.12)) / 0.45) * out_k
            if a_flag > 0:
                fl = self.flag_layer(s['key'], cam)
                arr = np.asarray(fl).copy()
                arr[..., 3] = (arr[..., 3].astype(np.float32) * a_flag).astype(np.uint8)
                img.alpha_composite(Image.fromarray(arr, 'RGBA'))
                if t >= s['card_in'] and t <= s['card_out']:
                    flag_alpha_for_check = np.asarray(fl)[..., 3]
            if a_out > 0:
                g = self.outline_layer(s['key'], cam, a_out)
                arr = np.asarray(img).astype(np.float32)
                arr[..., :3] = arr[..., :3] + (255 - arr[..., :3]) * (g[..., None] / 255)
                img = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')
        # viñeta (el mapa queda nítido; solo se oscurecen los bordes como en la referencia)
        arr = np.asarray(img)[..., :3].astype(np.float32) * self.a.vignette
        img = Image.fromarray(arr.astype(np.uint8)).convert('RGBA')

        for s in tl.segs:
            self.draw_name(img, s, t)
            st = self.draw_card(img, s, t, flag_alpha_for_check)
            if st: stat.update(st)
        self.draw_subtitle(img, t)
        self.stats.append(stat)
        return img.convert('RGB')

    def draw_name(self, img, s, t):
        t0 = s['fly1'] - 0.25
        if t < t0 or t > s['leave'] + 0.3: return
        u = (t - t0) / 0.4
        sc = 0.6 + 0.4 * ease_out_back(u, 2.2)
        al = smooth(u * 2.5) * (1 - smooth((t - s['leave']) / 0.25))
        if al <= 0: return
        spr = self.a.name_img(s['c']['name'])
        if abs(sc - 1) > 1e-3:
            spr = spr.resize((max(1, int(spr.width * sc)), max(1, int(spr.height * sc))), Image.BICUBIC)
        if al < 1:
            arr = np.asarray(spr).copy(); arr[..., 3] = (arr[..., 3] * al).astype(np.uint8); spr = Image.fromarray(arr)
        x, y = s['c']['name_at']
        img.alpha_composite(spr, (int(x - spr.width / 2), int(y - spr.height / 2)))

    def draw_card(self, img, s, t, flag_alpha):
        if t < s['card_in'] or t > s['card_out'] + 0.35: return None
        c = s['c']; x, y, w, h = c['card']
        u_in = (t - s['card_in']) / 0.5
        u_out = (t - s['card_out']) / 0.35
        sc = (0.86 + 0.14 * ease_out_back(u_in, 1.4)) * (1 - 0.05 * smooth(u_out))
        al = smooth(u_in * 2) * (1 - smooth(u_out))
        if al <= 0: return None
        mix = smooth((t - s['swap']) / 0.4)
        key = (s['key'], round(mix, 3))
        canvas, pad = card_frame(self.card_photos[s['key']], mix, (w, h))
        # balanceo pendular en función del TIEMPO GLOBAL: no se reinicia al cambiar la foto
        ph = 2 * math.pi * t / 7.0
        dx = 13 * math.sin(ph)
        ang = 1.5 * math.sin(ph + 0.35)
        if abs(sc - 1) > 1e-3:
            canvas = canvas.resize((int(canvas.width * sc), int(canvas.height * sc)), Image.BICUBIC)
        rot = canvas.rotate(ang, resample=Image.BICUBIC, expand=True)
        if al < 1:
            arr = np.asarray(rot).copy(); arr[..., 3] = (arr[..., 3] * al).astype(np.uint8); rot = Image.fromarray(arr)
        ccx, ccy = x + w / 2 + dx, y + h / 2
        img.alpha_composite(rot, (int(round(ccx - rot.width / 2)), int(round(ccy - rot.height / 2))))
        st = dict(card=s['key'], card_dx=round(dx, 2), card_ang=round(ang, 3), card_mix=round(mix, 3))
        if flag_alpha is not None and al > 0.5:
            # distancia mínima entre la tarjeta (rotada) y cualquier píxel del territorio
            hw, hh = w * sc / 2, h * sc / 2
            m = 160
            X0, Y0 = int(max(0, ccx - hw - m)), int(max(0, ccy - hh - m))
            X1, Y1 = int(min(OW, ccx + hw + m)), int(min(OH, ccy + hh + m))
            ys, xs = np.nonzero(flag_alpha[Y0:Y1:2, X0:X1:2] > 60)
            if len(xs):
                px = xs * 2 + X0 - ccx; py = ys * 2 + Y0 - ccy
                r = math.radians(ang); cr, sr = math.cos(r), math.sin(r)
                lx = px * cr - py * sr; ly = px * sr + py * cr
                ddx = np.maximum(np.abs(lx) - hw, 0); ddy = np.maximum(np.abs(ly) - hh, 0)
                st['card_gap'] = round(float(np.sqrt(ddx ** 2 + ddy ** 2).min()), 1)
            else:
                st['card_gap'] = 999.0
        return st

    def draw_subtitle(self, img, t):
        cur = None
        for w in self.tl.words:
            # una palabra a la vez; se mantiene hasta la siguiente salvo silencios largos
            if w['start'] - 0.02 <= t < w['show_end']: cur = w
        if cur is None: return
        u = (t - (cur['start'] - 0.02)) / 0.16
        sc = 0.72 + 0.28 * ease_out_back(u, 2.4)
        dy = 14 * (1 - smooth(u))
        al = smooth(u * 2.2)
        spr = self.a.word_img(cur['shown'], cur['yellow'])
        if abs(sc - 1) > 1e-3:
            spr = spr.resize((max(1, int(spr.width * sc)), max(1, int(spr.height * sc))), Image.BICUBIC)
        if al < 1:
            arr = np.asarray(spr).copy(); arr[..., 3] = (arr[..., 3] * al).astype(np.uint8); spr = Image.fromarray(arr)
        img.alpha_composite(spr, (int(OW / 2 - spr.width / 2), int(SUB_Y - spr.height / 2 + dy)))

SUB_Y = 1530

def prepare_words(words):
    out = []
    for i, w in enumerate(words):
        shown = w['text'].strip(',.:;¡!¿?"«»')
        nxt = words[i + 1]['start'] if i + 1 < len(words) else w['end'] + 0.6
        # si hay un silencio largo, la palabra desaparece poco después de terminar
        show_end = nxt - 0.02 if nxt - w['end'] < 0.45 else w['end'] + 0.25
        key = shown.lower()
        out.append(dict(w, shown=shown, show_end=show_end, yellow=key in EMPHASIS))
    return out

# ----------------------------------------------------------------------------- main
def render_range(args):
    timings, f0, f1, path = args
    tl = load_tl(timings)
    rd = Renderer(tl)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS),
                          '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        p.stdin.write(rd.frame(f / FPS).tobytes())
    p.stdin.close(); p.wait()
    return rd.stats

def load_tl(timings):
    d = json.load(open(timings))
    return Timeline(prepare_words(d['words']), d['duration'])

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('timings'); ap.add_argument('out')
    ap.add_argument('--stills'); ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--frames')
    ns = ap.parse_args()
    tl = load_tl(ns.timings)
    if ns.stills:
        rd = Renderer(tl)
        os.makedirs(ns.out, exist_ok=True)
        for ts in ns.stills.split(','):
            rd.frame(float(ts)).save(os.path.join(ns.out, f'still_{float(ts):06.2f}.jpg'), quality=90)
        print(json.dumps(rd.stats, default=float)); sys.exit()
    n = int(math.ceil(tl.duration * FPS))
    f0, f1 = (0, n)
    if ns.frames: f0, f1 = map(int, ns.frames.split(':'))
    parts = []; step = math.ceil((f1 - f0) / ns.workers)
    tmp = ns.out + '.parts'; os.makedirs(tmp, exist_ok=True)
    for i in range(ns.workers):
        a, b = f0 + i * step, min(f1, f0 + (i + 1) * step)
        if a < b: parts.append((ns.timings, a, b, os.path.join(tmp, f'p{i:02d}.mp4')))
    from multiprocessing import Pool
    with Pool(len(parts)) as pool:
        stats = sum(pool.map(render_range, parts), [])
    with open(os.path.join(tmp, 'list.txt'), 'w') as fh:
        for p in parts: fh.write(f"file '{os.path.abspath(p[3])}'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', os.path.join(tmp, 'list.txt'), '-c', 'copy', ns.out], check=True)
    json.dump(stats, open(ns.out + ".stats.json", "w"), default=float)
    print('frames', len(stats), 'bordes_fuera', sum(not s['edge_ok'] for s in stats),
          'gap_min', min([s['card_gap'] for s in stats if 'card_gap' in s] or [None]))
