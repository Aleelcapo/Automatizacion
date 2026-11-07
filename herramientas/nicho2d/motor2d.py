"""Motor 2D para los videos del nicho (ilustración plana, corte del suelo, personajes con expresiones).

Se dibuja con cairo directo a 1080x1920. Las coordenadas del mundo están en metros, con y hacia
arriba y el suelo en y=0; la cámara (centro y zoom) se anima con pistas de claves (Pista).
También genera efectos de sonido sencillos y los mezcla bajo la voz.
"""
import math, random, struct, subprocess, wave
import cairo
import numpy as np

W, H, FPS = 1080, 1920, 30
SR = 48000


# ---------------------------------------------------------------- animación
def ease(kind, p):
    p = min(1.0, max(0.0, p))
    if kind == 'lin':
        return p
    if kind == 'in':
        return p * p
    if kind == 'out':
        return 1 - (1 - p) ** 2
    if kind == 'back':          # se pasa un poco y regresa
        c = 1.70158
        return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2
    if kind == 'bounce':
        n, d = 7.5625, 2.75
        if p < 1 / d:
            return n * p * p
        if p < 2 / d:
            p -= 1.5 / d
            return n * p * p + 0.75
        if p < 2.5 / d:
            p -= 2.25 / d
            return n * p * p + 0.9375
        p -= 2.625 / d
        return n * p * p + 0.984375
    if kind == 'step':
        return 0.0 if p < 1 else 1.0
    return p * p * (3 - 2 * p)  # suave


class Pista:
    """Valor animado: claves (t, valor, curva hacia esa clave). Valores escalares o tuplas."""

    def __init__(self, v0):
        self.k = [(-1e9, v0, 'lin')]

    def a(self, t, v, curva='suave'):
        self.k.append((t, v, curva))
        self.k.sort(key=lambda q: q[0])
        return self

    def __call__(self, t):
        k = self.k
        if t <= k[0][0]:
            return k[0][1]
        for i in range(1, len(k)):
            if t < k[i][0]:
                t0, v0, _ = k[i - 1]
                t1, v1, c = k[i]
                p = ease(c, (t - t0) / max(1e-6, t1 - t0))
                if isinstance(v0, tuple):
                    return tuple(a + (b - a) * p for a, b in zip(v0, v1))
                return v0 + (v1 - v0) * p
        return k[-1][1]


def aparece(t, t0, dur=0.35, t1=None, dur_out=0.2):
    """Escala 0→1 con rebote al entrar; 1→0 al salir."""
    if t < t0:
        return 0.0
    s = ease('back', (t - t0) / dur)
    if t1 is not None and t > t1 - dur_out:
        s *= max(0.0, (t1 - t) / dur_out)
    return max(0.0, s)


def visible(t, t0, t1=None):
    return t >= t0 and (t1 is None or t < t1)


# ---------------------------------------------------------------- colores y dibujo
def hexc(h, a=1.0):
    h = h.lstrip('#')
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)


TINTA = hexc('2b1d14')


class Lienzo:
    def __init__(self):
        self.surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
        self.c = cairo.Context(self.surf)
        self.c.set_line_join(cairo.LINE_JOIN_ROUND)
        self.c.set_line_cap(cairo.LINE_CAP_ROUND)
        self.s = 100.0
        self.cx = self.cy = 0.0

    # cámara: centro (cx, cy) en metros y zoom en px/m; sacudida en px
    def camara(self, cx, cy, s, shake=0.0, t=0.0):
        c = self.c
        c.identity_matrix()
        dx = dy = 0
        if shake > 0:
            dx = shake * math.sin(t * 91.0)
            dy = shake * math.cos(t * 77.0)
        c.translate(W / 2 + dx, H / 2 + dy)
        c.scale(s, -s)
        c.translate(-cx, -cy)
        self.s, self.cx, self.cy = s, cx, cy

    def px(self, n):
        return n / self.s

    def relleno(self, col, borde=True, ancho=5.0, col_borde=TINTA):
        c = self.c
        c.set_source_rgba(*col)
        if borde:
            c.fill_preserve()
            c.set_source_rgba(*col_borde)
            c.set_line_width(self.px(ancho))
            c.stroke()
        else:
            c.fill()

    def rect(self, x0, y0, x1, y1, col, borde=True, r=0.0, ancho=5.0):
        c = self.c
        if r > 0:
            r = min(r, abs(x1 - x0) / 2, abs(y1 - y0) / 2)
            c.new_sub_path()
            c.arc(x1 - r, y1 - r, r, 0, math.pi / 2)
            c.arc(x0 + r, y1 - r, r, math.pi / 2, math.pi)
            c.arc(x0 + r, y0 + r, r, math.pi, 3 * math.pi / 2)
            c.arc(x1 - r, y0 + r, r, 3 * math.pi / 2, 2 * math.pi)
            c.close_path()
        else:
            c.rectangle(x0, y0, x1 - x0, y1 - y0)
        self.relleno(col, borde, ancho)

    def poli(self, pts, col, borde=True, ancho=5.0, cerrar=True):
        c = self.c
        c.move_to(*pts[0])
        for p in pts[1:]:
            c.line_to(*p)
        if cerrar:
            c.close_path()
            self.relleno(col, borde, ancho)
        else:
            c.set_source_rgba(*col)
            c.set_line_width(self.px(ancho))
            c.stroke()

    def circulo(self, x, y, r, col, borde=True, ancho=5.0):
        self.c.new_sub_path()
        self.c.arc(x, y, r, 0, 2 * math.pi)
        self.relleno(col, borde, ancho)

    def elipse(self, x, y, rx, ry, col, borde=True, ancho=5.0, ang=0.0):
        c = self.c
        c.save()
        c.translate(x, y)
        c.rotate(ang)
        c.scale(rx, ry)
        c.new_sub_path()
        c.arc(0, 0, 1, 0, 2 * math.pi)
        c.restore()
        self.relleno(col, borde, ancho)

    def linea(self, pts, col, ancho=6.0, guion=None):
        c = self.c
        c.move_to(*pts[0])
        for p in pts[1:]:
            c.line_to(*p)
        c.set_source_rgba(*col)
        c.set_line_width(self.px(ancho))
        if guion:
            c.set_dash([self.px(g) for g in guion])
        c.stroke()
        c.set_dash([])

    def curva(self, p0, p1, p2, p3, col, ancho=6.0):
        c = self.c
        c.move_to(*p0)
        c.curve_to(*p1, *p2, *p3)
        c.set_source_rgba(*col)
        c.set_line_width(self.px(ancho))
        c.stroke()

    def flecha(self, x0, y0, x1, y1, col, ancho=0.16, p=1.0):
        """Flecha gruesa con contorno de x0,y0 a x1,y1 (p: cuánto se ha dibujado)."""
        x1 = x0 + (x1 - x0) * p
        y1 = y0 + (y1 - y0) * p
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 1e-3:
            return
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        nx, ny = -uy, ux
        hl = min(L * 0.5, ancho * 2.6)
        bx, by = x1 - ux * hl, y1 - uy * hl
        w = ancho / 2
        pts = [(x0 + nx * w, y0 + ny * w), (bx + nx * w, by + ny * w), (bx + nx * w * 2.6, by + ny * w * 2.6), (x1, y1),
               (bx - nx * w * 2.6, by - ny * w * 2.6), (bx - nx * w, by - ny * w), (x0 - nx * w, y0 - ny * w)]
        self.poli(pts, col, ancho=4.0)

    def resalte(self, x0, y0, x1, y1, t, t0, t1, col=hexc('ff8a2a')):
        """Marco naranja punteado y animado que señala la pieza nombrada."""
        s = aparece(t, t0, 0.3, t1)
        if s <= 0:
            return
        c = self.c
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        c.save()
        c.translate(mx, my)
        c.scale(s, s)
        c.translate(-mx, -my)
        pad = self.px(14)
        r = self.px(26)
        x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
        c.new_sub_path()
        c.arc(x1 - r, y1 - r, r, 0, math.pi / 2)
        c.arc(x0 + r, y1 - r, r, math.pi / 2, math.pi)
        c.arc(x0 + r, y0 + r, r, math.pi, 3 * math.pi / 2)
        c.arc(x1 - r, y0 + r, r, 3 * math.pi / 2, 2 * math.pi)
        c.close_path()
        c.set_source_rgba(*TINTA)
        c.set_line_width(self.px(16))
        c.stroke_preserve()
        c.set_source_rgba(*col)
        c.set_line_width(self.px(10))
        c.set_dash([self.px(30), self.px(18)], -t * 120 / self.s)
        c.stroke()
        c.set_dash([])
        c.restore()

    def escala(self, x, y, s):
        """Envuelve un dibujo para escalarlo alrededor de (x, y): usar con 'with'."""
        return _Escala(self.c, x, y, s)


class _Escala:
    def __init__(self, c, x, y, s):
        self.c, self.x, self.y, self.s = c, x, y, s

    def __enter__(self):
        self.c.save()
        self.c.translate(self.x, self.y)
        self.c.scale(max(1e-4, self.s), max(1e-4, self.s))
        self.c.translate(-self.x, -self.y)

    def __exit__(self, *a):
        self.c.restore()


# ---------------------------------------------------------------- texturas (patrones en metros)
def textura_tierra(semilla=3, base='8a5a36', motas=('6f4628', 'a6764c', '5b3a22'), piedras=True, tam=8.0):
    """Patrón de tierra de 'tam' metros que se repite; se ve igual a cualquier zoom."""
    random.seed(semilla)
    N = 1024
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, N, N)
    c = cairo.Context(s)
    c.set_source_rgba(*hexc(base))
    c.paint()
    for _ in range(2200):
        c.set_source_rgba(*hexc(random.choice(motas), random.uniform(0.35, 0.8)))
        x, y, r = random.uniform(0, N), random.uniform(0, N), random.uniform(2, 7)
        c.arc(x, y, r, 0, 2 * math.pi)
        c.fill()
    if piedras:
        for _ in range(55):
            x, y = random.uniform(0, N), random.uniform(0, N)
            rx, ry = random.uniform(10, 24), random.uniform(7, 16)
            c.save()
            c.translate(x, y)
            c.rotate(random.uniform(0, 3))
            c.scale(rx, ry)
            c.arc(0, 0, 1, 0, 2 * math.pi)
            c.restore()
            c.set_source_rgba(*hexc(random.choice(('b49a82', '9c8571', 'c4ae96'))))
            c.fill_preserve()
            c.set_source_rgba(*hexc('4a301c', 0.9))
            c.set_line_width(2.5)
            c.stroke()
    pat = cairo.SurfacePattern(s)
    pat.set_extend(cairo.EXTEND_REPEAT)
    pat.set_filter(cairo.FILTER_GOOD)
    m = cairo.Matrix()
    m.scale(N / tam, -N / tam)
    pat.set_matrix(m)
    return pat


def textura_bloques(ancho=0.8, alto=0.4, base='c9c6be', junta='8f8b83', tono=('d3d0c8', 'bfbcb4', 'cfccc4')):
    random.seed(7)
    N = 512
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, N, N)
    c = cairo.Context(s)
    c.set_source_rgba(*hexc(junta))
    c.paint()
    cols = 4
    filas = int(round(cols * ancho / alto))
    bw, bh = N / cols, N / filas
    for r in range(filas):
        off = (bw / 2) if r % 2 else 0
        for k in range(-1, cols + 1):
            x = k * bw + off
            c.rectangle(x + 4, r * bh + 4, bw - 8, bh - 8)
            c.set_source_rgba(*hexc(random.choice(tono)))
            c.fill()
    pat = cairo.SurfacePattern(s)
    pat.set_extend(cairo.EXTEND_REPEAT)
    pat.set_filter(cairo.FILTER_GOOD)
    m = cairo.Matrix()
    m.scale(N / (ancho * cols), -N / (alto * filas))
    pat.set_matrix(m)
    return pat


# ---------------------------------------------------------------- personajes
class Personaje:
    """Monito con expresiones. Pistas: pos (x, y de los pies), dir (-1/1), animo, brazos, aplasta, rot."""

    def __init__(self, ropa='e2553a', pantalon='3b4a6b', piel='f2c39b', pelo='3a2416', estilo='normal', alto=1.75):
        self.ropa, self.pantalon, self.piel, self.pelo = hexc(ropa), hexc(pantalon), hexc(piel), hexc(pelo)
        self.estilo = estilo
        self.alto = alto
        self.pos = Pista((0.0, 0.0))
        self.dir = Pista(1.0)
        self.animo = Pista(0.0)       # 1 feliz, 0 normal, -1 enojado, -2 asustado
        self.brazo = Pista(0.0)       # ángulo extra de los brazos (radianes)
        self.aplasta = Pista(1.0)
        self.rot = Pista(0.0)
        self.boca_abierta = Pista(0.0)
        self.visible = [(-1e9, 1e9)]
        self.acostado = Pista(0.0)    # 0 de pie, 1 acostado

    def ver(self, t):
        return any(a <= t < b for a, b in self.visible)

    def dibujar(self, L, t):
        if not self.ver(t):
            return
        c = L.c
        x, y = self.pos(t)
        d = 1 if self.dir(t) >= 0 else -1
        h = self.alto
        c.save()
        c.translate(x, y)
        ac = self.acostado(t)
        c.rotate(self.rot(t) + ac * (-math.pi / 2) * d)
        c.scale(d, self.aplasta(t))
        # ciclo de respiración
        b = 1 + 0.012 * math.sin(t * 4.2)
        c.scale(1, b)
        ink = TINTA
        # piernas
        for lx in (-0.1, 0.1):
            L.rect(lx - 0.07, 0.0, lx + 0.07, h * 0.42, self.pantalon, r=0.05)
            L.elipse(lx + 0.04, 0.03, 0.11, 0.06, hexc('2b2b2b'))
        # cuerpo
        if self.estilo == 'vestido':
            L.poli([(-0.27, h * 0.18), (0.27, h * 0.18), (0.2, h * 0.72), (-0.2, h * 0.72)], self.ropa)
        else:
            L.rect(-0.22, h * 0.38, 0.22, h * 0.74, self.ropa, r=0.1)
        # brazos
        ab = self.brazo(t)
        for sx, fase in ((-1, 0.0), (1, 1.0)):
            ang = -0.35 * sx + ab * (1 if sx > 0 else 0.6) + 0.06 * math.sin(t * 3 + fase)
            sx0, sy0 = 0.2 * sx, h * 0.68
            ex = sx0 + math.sin(ang) * 0.5 * (1 if sx > 0 else -1) * -1
            ex = sx0 - math.sin(ang) * 0.48
            ey = sy0 - math.cos(ang) * 0.48
            L.linea([(sx0, sy0), (ex, ey)], ink, ancho=24)
            L.linea([(sx0, sy0), (ex, ey)], self.ropa, ancho=15)
            L.circulo(ex, ey, 0.06, self.piel, ancho=4)
        # cabeza
        hy = h * 0.86
        L.circulo(0, hy, 0.2, self.piel)
        if self.estilo == 'vestido':      # chongo gris y lentes
            L.circulo(-0.08, hy + 0.22, 0.1, self.pelo)
            c.new_sub_path()
            c.arc(0, hy + 0.02, 0.205, 0.15 * math.pi, 0.85 * math.pi)
            c.close_path()
            L.relleno(self.pelo)
        else:
            c.new_sub_path()
            c.arc(0, hy + 0.01, 0.205, 0.05 * math.pi, 0.95 * math.pi)
            c.close_path()
            L.relleno(self.pelo)
        an = self.animo(t)
        # ojos (con parpadeo)
        parp = 1.0 if (t * 0.37) % 1.0 > 0.04 else 0.12
        for ex in (0.04, 0.13):
            L.elipse(ex, hy + 0.02, 0.045, 0.055 * parp, hexc('ffffff'), ancho=3)
            if parp > 0.5:
                L.circulo(ex + 0.012, hy + 0.015, 0.02, ink, borde=False)
            # cejas: enojado baja hacia el centro, asustado sube
            inc = -0.35 * min(0, an) if an > -1.5 else 0.4
            if an > 0.5:
                inc = 0.1
            c.save()
            c.translate(ex, hy + 0.1)
            c.rotate(inc * (1 if ex < 0.1 else -1) * -1)
            L.linea([(-0.04, 0), (0.04, 0)], ink, ancho=7)
            c.restore()
        if self.estilo == 'vestido':
            for ex in (0.04, 0.13):
                c.new_sub_path()
                c.arc(ex, hy + 0.02, 0.06, 0, 2 * math.pi)
                c.set_source_rgba(*ink)
                c.set_line_width(L.px(4))
                c.stroke()
        # boca
        ab_ = self.boca_abierta(t)
        if ab_ > 0.1:
            L.elipse(0.1, hy - 0.09, 0.05, 0.03 + 0.05 * ab_, hexc('7a1f1f'), ancho=4)
        elif an >= 0.5:
            c.new_sub_path()
            c.arc(0.1, hy - 0.06, 0.06, math.pi * 1.1, math.pi * 1.9)
            c.set_source_rgba(*ink)
            c.set_line_width(L.px(6))
            c.stroke()
        elif an <= -0.5:
            c.new_sub_path()
            c.arc(0.1, hy - 0.13, 0.05, math.pi * 0.15, math.pi * 0.85)
            c.set_source_rgba(*ink)
            c.set_line_width(L.px(6))
            c.stroke()
        else:
            L.linea([(0.06, hy - 0.09), (0.14, hy - 0.09)], ink, ancho=6)
        # nariz
        L.circulo(0.19, hy - 0.02, 0.035, self.piel, ancho=3)
        c.restore()


def perro(L, x, y, t, d=1, triste=False, s=1.0, cola=True):
    c = L.c
    c.save()
    c.translate(x, y)
    c.scale(d * s, s)
    cafe, osc = hexc('c98b4f'), hexc('7a4a24')
    L.elipse(0, 0.35, 0.42, 0.22, cafe)
    for lx in (-0.25, 0.25):
        L.rect(lx - 0.05, 0.0, lx + 0.05, 0.25, cafe, r=0.04)
    if cola:
        ang = 0.5 * math.sin(t * (4 if triste else 14))
        L.linea([(-0.4, 0.42), (-0.62, 0.55 + 0.12 * ang)], TINTA, ancho=16)
        L.linea([(-0.4, 0.42), (-0.62, 0.55 + 0.12 * ang)], cafe, ancho=9)
    L.circulo(0.42, 0.58, 0.2, cafe)
    L.elipse(0.6, 0.53, 0.12, 0.08, cafe)
    L.circulo(0.7, 0.56, 0.04, TINTA, borde=False)
    oreja_y = 0.55 if triste else 0.7
    L.elipse(0.33, oreja_y, 0.07, 0.15, osc, ang=0.5 if triste else -0.3)
    L.circulo(0.48, 0.63, 0.03, TINTA, borde=False)
    if triste:
        L.linea([(0.43, 0.7), (0.53, 0.67)], TINTA, ancho=5)
        L.elipse(0.5, 0.56, 0.02, 0.035, hexc('7cc6ff'), borde=False)
    c.restore()


# ---------------------------------------------------------------- escenario: cielo, nubes, casa, suelo
def cielo(L, t, arriba='5fb3f0', abajo='c9e9ff'):
    c = L.c
    c.save()
    c.identity_matrix()
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *hexc(arriba))
    g.add_color_stop_rgba(1, *hexc(abajo))
    c.set_source(g)
    c.paint()
    c.restore()


NUBES = [(-9, 9.5, 1.3), (-2, 11.5, 1.0), (5, 10.0, 1.5), (13, 12.0, 1.1), (-16, 12.5, 1.2), (20, 9.8, 1.4)]


def nubes(L, t, vel=0.15):
    for x, y, s in NUBES:
        xx = (x + t * vel * s + 30) % 60 - 30
        for dx, dy, r in ((0, 0, 0.9), (0.9, 0.15, 0.7), (-0.9, 0.1, 0.65), (0.35, 0.5, 0.7)):
            L.circulo(xx + dx * s, y + dy * s, r * s, hexc('ffffff'), ancho=0)
        L.c.set_source_rgba(1, 1, 1, 1)


def casa(L, x, y=0.0, ancho=7.0, alto=4.6, pared='f4d9a8', techo='c8553d', ventanas=4, puerta=True):
    x0, x1 = x - ancho / 2, x + ancho / 2
    L.rect(x0, y, x1, y + alto, hexc(pared))
    L.poli([(x0 - 0.4, y + alto), (x1 + 0.4, y + alto), (x, y + alto + 2.0)], hexc(techo))
    for fila, yy in enumerate((y + 0.9, y + 2.8)):
        for k in range(ventanas):
            vx = x0 + ancho * (k + 0.5) / ventanas
            if fila == 0 and puerta and k in (1, 2):
                continue
            L.rect(vx - 0.45, yy, vx + 0.45, yy + 1.1, hexc('ffffff'), ancho=5)
            L.rect(vx - 0.35, yy + 0.1, vx + 0.35, yy + 1.0, hexc('8fd0f5'), ancho=3)
            L.linea([(vx, yy + 0.1), (vx, yy + 1.0)], hexc('ffffff'), ancho=6)
            for s in (-1, 1):
                L.rect(vx + s * 0.5, yy, vx + s * 0.75, yy + 1.1, hexc('3c6e9e'), ancho=4)
    if puerta:
        L.rect(x - 0.6, y, x + 0.6, y + 2.1, hexc('7a4a2a'), r=0.08)
        L.circulo(x + 0.4, y + 1.0, 0.06, hexc('f2c84b'), ancho=3)


def arbol(L, x, y, t, s=1.0):
    L.rect(x - 0.22 * s, y, x + 0.22 * s, y + 2.4 * s, hexc('7a4a2a'), r=0.08)
    sw = 0.05 * math.sin(t * 1.3)
    for dx, dy, r, col in ((0, 3.1, 1.4, '3f9a3a'), (-1.0, 2.6, 1.0, '4aa843'), (1.0, 2.7, 1.05, '38893a'), (0.2, 3.9, 0.95, '55b54d')):
        L.circulo(x + (dx + sw) * s, y + dy * s, r * s, hexc(col))


def suelo(L, t, pat_tierra, huecos, x0=-60, x1=60, fondo=-40, pasto='5cb85c', fondo_hueco='5e3b22'):
    """Corte del terreno: pasto arriba y tierra con textura abajo, con huecos excavados (rectángulos)."""
    c = L.c
    # huecos: fondo oscuro (pared del fondo de la excavación)
    for (hx0, hx1, hy0) in huecos:
        L.rect(hx0, hy0, hx1, 0.0, hexc(fondo_hueco), borde=False)
        # sombra en el fondo del hueco
        g = cairo.LinearGradient(0, hy0, 0, 0)
        g.add_color_stop_rgba(0, 0, 0, 0, 0.35)
        g.add_color_stop_rgba(1, 0, 0, 0, 0.0)
        c.rectangle(hx0, hy0, hx1 - hx0, -hy0)
        c.set_source(g)
        c.fill()
    # tierra con agujeros (regla par-impar)
    c.set_fill_rule(cairo.FILL_RULE_EVEN_ODD)
    c.rectangle(x0, fondo, x1 - x0, -fondo)
    for (hx0, hx1, hy0) in huecos:
        c.rectangle(hx0, hy0, hx1 - hx0, -hy0)
    c.set_source(pat_tierra)
    c.fill_preserve()
    c.set_source_rgba(*TINTA)
    c.set_line_width(L.px(6))
    c.stroke()
    c.set_fill_rule(cairo.FILL_RULE_WINDING)
    # banda de pasto, cortada en los huecos
    segs = [(x0, x1)]
    for (hx0, hx1, hy0) in huecos:
        nuevos = []
        for a, b in segs:
            if hx1 <= a or hx0 >= b:
                nuevos.append((a, b))
            else:
                if hx0 > a:
                    nuevos.append((a, hx0))
                if hx1 < b:
                    nuevos.append((hx1, b))
        segs = nuevos
    for a, b in segs:
        L.rect(a, -0.25, b, 0.12, hexc(pasto), ancho=5)
        xx = math.ceil(a / 0.35) * 0.35
        while xx < b - 0.1:
            L.poli([(xx - 0.07, 0.1), (xx, 0.32 + 0.05 * math.sin(xx * 7 + t * 2)), (xx + 0.07, 0.1)], hexc('4aa04a'), ancho=3)
            xx += 0.35


# ---------------------------------------------------------------- partículas
def lluvia(L, t, t0, t1, x0, x1, ytop=14, ybot=0, n=70, semilla=1):
    if not visible(t, t0, t1):
        return
    random.seed(semilla)
    for _ in range(n):
        x = random.uniform(x0, x1)
        fase = random.uniform(0, 1)
        p = ((t - t0) * 1.6 + fase) % 1.0
        y = ytop - (ytop - ybot) * p
        L.linea([(x, y), (x - 0.12, y - 0.55)], hexc('9fd3ff', 0.85), ancho=5)


def gotas_cayendo(L, t, t0, t1, x, y0, y1, n=4, periodo=0.6, col='5ab4ff', r=0.07):
    if not visible(t, t0, t1):
        return
    for k in range(n):
        p = ((t - t0) / periodo + k / n) % 1.0
        L.elipse(x, y0 + (y1 - y0) * p, r * 0.8, r, hexc(col), ancho=3)


def ondas_sonido(L, x, y, t, t0, t1, col='ffffff', r=0.5, dir_=1):
    if not visible(t, t0, t1):
        return
    c = L.c
    for k in range(3):
        p = ((t - t0) * 1.6 + k / 3) % 1.0
        rr = r * (0.4 + p * 1.4)
        c.new_sub_path()
        a0 = -0.6 if dir_ > 0 else math.pi - 0.6
        c.arc(x, y, rr, a0, a0 + 1.2)
        c.set_source_rgba(*hexc(col, 1 - p))
        c.set_line_width(L.px(9))
        c.stroke()


def tierra_volando(L, t, t0, t1, x, y, semilla=4, n=10):
    if not visible(t, t0, t1):
        return
    random.seed(semilla)
    for _ in range(n):
        fase = random.uniform(0, 1)
        p = ((t - t0) * 1.8 + fase) % 1.0
        vx, vy = random.uniform(-2.2, 2.2), random.uniform(3.5, 5.5)
        px_, py_ = x + vx * p, y + vy * p - 9.8 * p * p * 0.6
        L.circulo(px_, py_, random.uniform(0.06, 0.12), hexc('7a4c2a'), ancho=3)


# ---------------------------------------------------------------- render y sonido
def render(dibujar_cuadro, dur, salida, desde=0.0):
    """Llama a dibujar_cuadro(L, t) para cada cuadro y lo escribe como f_0001.png ... en 'salida'."""
    import os
    os.makedirs(salida, exist_ok=True)
    L = Lienzo()
    n = int(round(dur * FPS))
    for i in range(int(desde * FPS), n):
        t = i / FPS
        L.c.identity_matrix()
        dibujar_cuadro(L, t)
        L.surf.write_to_png(os.path.join(salida, f'f_{i + 1:04d}.png'))
        if i % 150 == 0:
            print('cuadro', i + 1, 'de', n, flush=True)


def _env(n, ataque=0.005, caida=0.15):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(1e-4, ataque)) * np.exp(-t / caida)
    return e


def sonido(tipo, rng):
    """Efectos sintéticos cortos (mono, float32)."""
    if tipo == 'pop':
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        f = 500 + 900 * tt / 0.12
        return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.04)
    if tipo == 'golpe':
        n = int(0.35 * SR)
        tt = np.arange(n) / SR
        return (0.9 * np.sin(2 * np.pi * (70 - 30 * tt) * tt) + 0.3 * rng.standard_normal(n)) * _env(n, 0.002, 0.08)
    if tipo == 'pala':
        n = int(0.25 * SR)
        ruido = rng.standard_normal(n)
        ruido = np.convolve(ruido, np.ones(12) / 12, mode='same')
        return 0.8 * ruido * _env(n, 0.003, 0.06)
    if tipo == 'agua':
        n = int(0.6 * SR)
        r = rng.standard_normal(n)
        r = r - np.convolve(r, np.ones(30) / 30, mode='same')
        return 0.35 * r * _env(n, 0.02, 0.25)
    if tipo == 'swoosh':
        n = int(0.4 * SR)
        r = rng.standard_normal(n)
        k = np.hanning(n)
        r = np.convolve(r, np.ones(6) / 6, mode='same')
        return 0.35 * r * k
    if tipo == 'ding':
        n = int(0.6 * SR)
        tt = np.arange(n) / SR
        return 0.35 * (np.sin(2 * np.pi * 1320 * tt) + 0.5 * np.sin(2 * np.pi * 1980 * tt)) * _env(n, 0.002, 0.25)
    if tipo == 'grito':
        n = int(0.5 * SR)
        tt = np.arange(n) / SR
        return 0.25 * np.sign(np.sin(2 * np.pi * (380 + 120 * np.sin(18 * tt)) * tt)) * _env(n, 0.01, 0.3)
    return np.zeros(1)


def mezclar(voz, eventos, salida, dur, vol_fx=0.22, lluvia_tramos=()):
    """Mezcla la voz con los efectos [(t, tipo), ...] y tramos de lluvia [(t0, t1)]; escribe un wav estéreo."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voz, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    v = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = int(dur * SR) + SR
    mix = np.zeros(n, np.float32)
    mix[:len(v)] += v[:n]
    rng = np.random.default_rng(5)
    fx = np.zeros(n, np.float32)
    for t, tipo in eventos:
        s = sonido(tipo, rng).astype(np.float32)
        i = int(t * SR)
        fx[i:i + len(s)] += s[:max(0, n - i)]
    for t0, t1 in lluvia_tramos:
        i0, i1 = int(t0 * SR), int(t1 * SR)
        r = rng.standard_normal(i1 - i0).astype(np.float32)
        r = r - np.convolve(r, np.ones(8) / 8, mode='same')
        fade = np.minimum(1, np.minimum(np.arange(i1 - i0), np.arange(i1 - i0)[::-1]) / (0.3 * SR))
        fx[i0:i1] += 0.25 * r * fade
    mix += vol_fx * fx
    mix = np.clip(mix, -1, 1)
    est = np.repeat((mix * 32767).astype(np.int16)[:, None], 2, axis=1)
    with wave.open(salida, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(est.tobytes())
