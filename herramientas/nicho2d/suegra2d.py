"""Humor 01 en 2D — refugio antisuegra (mismo guion y tiempos que la versión 3D).

Uso: python3 suegra2d.py SALIDA_CUADROS [--audio VOZ --mezcla SALIDA.wav]
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor2d import *  # noqa

DUR = 60.2
HX = 2.6            # medio ancho del búnker
PROF1, PROF2 = -1.3, -3.6
PISO = -3.4

TIERRA = textura_tierra()
BLOQUES = textura_bloques()

# ---------------------------------------------------------------- personajes
yerno = Personaje(ropa='e2553a', pantalon='34495e')
suegra = Personaje(ropa='8e44ad', pantalon='6c3483', piel='f0c8a8', pelo='c8c8cc', estilo='vestido', alto=1.6)

yerno.pos.a(0, (4.0, 0.0)).a(2.0, (0.6, 0.0)).a(3.9, (0.6, PROF1), 'out')
yerno.pos.a(4.6, (0.6, PROF1), 'step').a(5.0, (3.6, 0.0), 'out').a(7.0, (3.6, 0.0)).a(7.1, (0.0, PROF1), 'step')
yerno.pos.a(8.3, (0.0, PISO), 'out').a(33.6, (0.0, PISO)).a(33.7, (-0.6, PISO), 'step')
yerno.dir.a(0, -1).a(2.0, 1, 'step').a(4.6, 1).a(4.7, 1, 'step').a(33.7, -1, 'step').a(50.6, 1, 'step')
yerno.animo.a(0, 1.0).a(4.6, -2, 'step').a(7.0, 0, 'step').a(11.9, -1, 'step').a(14.5, 1, 'step').a(19.4, -2, 'step')
yerno.animo.a(24.4, 1, 'step').a(25.2, -1, 'step').a(28.0, 1, 'step').a(38.9, -1, 'step').a(41.4, 1, 'step')
yerno.boca_abierta.a(4.6, 1.0, 'step').a(5.2, 0.0, 'step').a(19.5, 1.0, 'step').a(20.4, 0.0, 'step')
for k in range(8):   # cavando
    yerno.brazo.a(2.1 + 0.22 * k, 0.9 if k % 2 else -0.3, 'out')
    yerno.brazo.a(7.2 + 0.13 * k, 0.9 if k % 2 else -0.3, 'out')
yerno.brazo.a(8.4, 0.0)
yerno.acostado.a(50.5, 0.0, 'step').a(50.6, 0.0, 'step')
yerno.aplasta.a(50.5, 1.0, 'step').a(50.6, 0.8, 'step')
yerno.pos.a(50.6, (-0.4, PISO + 0.35), 'step')

suegra.visible = [(0, 4.6), (46.4, 50.2)]
suegra.pos.a(0, (8.0, 0.0)).a(1.6, (6.2, 0.0), 'out').a(46.4, (7.0, 0.0), 'step').a(47.4, (5.0, 0.0)).a(48.4, (3.4, 0.0))
suegra.pos.a(49.4, (0.2, 0.0)).a(50.2, (-3.5, 0.0))
suegra.dir.a(0, -1).a(48.0, -1, 'step')
suegra.animo.a(0, -1.0)
for k in range(5):
    suegra.rot.a(46.6 + 0.6 * k, 0.15 if k % 2 else -0.15)


# ---------------------------------------------------------------- piezas del búnker
def profundidad(t):
    if t < 2.1:
        return 0.0
    if t < 3.9:
        return PROF1 * ease('out', (t - 2.1) / 1.8)
    if t < 7.2:
        return PROF1
    if t < 8.2:
        return PROF1 + (PROF2 - PROF1) * ease('out', (t - 7.2) / 1.0)
    return PROF2


def huecos(t):
    hs = []
    d = profundidad(t)
    if d < -0.01:
        hs.append((-HX, HX, d))
    if t >= 21.6:
        hs.append((1.4, 2.3, PROF2 - 0.8 * ease('out', (t - 21.6) / 0.8)))
    return hs


def tablas(L, t):
    if not visible(t, 8.5, 14.4):
        return
    rot = ease('suave', (t - 11.9) / 1.0) if t > 11.9 else 0.0
    col = tuple(a + (b - a) * rot for a, b in zip(hexc('c8955a'), hexc('5f6b38')))
    n = 9
    for k in range(n):
        s = aparece(t, 8.5 + 0.07 * k, 0.25)
        if s <= 0:
            continue
        x0 = -HX + 0.05 + (2 * HX - 0.1) * k / n
        x1 = x0 + (2 * HX - 0.1) / n - 0.05
        with L.escala((x0 + x1) / 2, PROF2, s):
            L.rect(x0, PROF2, x1, -0.05, col, ancho=4)
            L.linea([((x0 + x1) / 2, PROF2 + 0.3), ((x0 + x1) / 2 + 0.03, -0.3)], hexc('000000', 0.12), ancho=4)
    if rot > 0:
        random.seed(2)
        for k in range(14):
            x, y = random.uniform(-HX + 0.3, HX - 0.3), random.uniform(PROF2 + 0.3, -0.4)
            L.circulo(x, y, 0.1 * rot, hexc('8aa04a'), ancho=3)


def bloques(L, t):
    if t < 14.5:
        return
    c = L.c
    p = ease('out', (t - 14.5) / 1.0)
    top = PROF2 + (0.0 - PROF2) * p
    c.rectangle(-HX, PROF2, 2 * HX, top - PROF2)
    c.set_source(BLOQUES)
    c.fill_preserve()
    c.set_source_rgba(*TINTA)
    c.set_line_width(L.px(5))
    c.stroke()
    for s in (-1, 1):   # muros laterales en corte
        L.rect(s * HX - (0.3 if s > 0 else 0), PROF2, s * HX + (0.3 if s < 0 else 0), top, hexc('bdb9b0'), ancho=5)
    if t >= 14.4:
        L.rect(-HX, PROF2 - 0.2, HX, PISO, hexc('a9a59c'), ancho=5)


def losa(L, t):
    if t < 16.2:
        return
    y = 2.5 * (1 - ease('bounce', (t - 16.2) / 0.6))
    L.rect(-HX - 0.35, -0.32 + y, -2.25, 0.05 + y, hexc('b7b3aa'), ancho=6)
    L.rect(-1.35, -0.32 + y, HX + 0.35, 0.05 + y, hexc('b7b3aa'), ancho=6)
    if t >= 16.8:
        s = aparece(t, 16.8, 0.25)
        with L.escala(-1.8, 0.05, s):
            L.rect(-2.25, -0.05, -1.35, 0.1, hexc('6d7378'), ancho=5)


def escalera(L, t):
    s = aparece(t, 17.0, 0.3)
    if s <= 0:
        return
    with L.escala(-1.8, PISO, s):
        for x in (-2.1, -1.5):
            L.rect(x - 0.04, PISO, x + 0.04, -0.1, hexc('8d969c'), ancho=4)
        for k in range(7):
            y = PISO + 0.4 + 0.42 * k
            L.rect(-2.1, y - 0.03, -1.5, y + 0.03, hexc('8d969c'), ancho=3)


def agua_y_bomba(L, t):
    # el agua que se filtra (19.4 - 21.4) y el charco (19.8 - 23.6)
    if visible(t, 19.8, 23.6):
        h = 0.12 * min(1, (t - 19.8) / 0.6) * (1 - ease('suave', (t - 22.8) / 0.7) if t > 22.8 else 1)
        L.rect(-HX, PISO, HX, PISO + max(0.005, h), hexc('5ab4ff', 0.85), borde=False)
    if visible(t, 19.4, 21.4):
        random.seed(9)
        for k in range(10):
            x = random.uniform(-2.2, 2.2)
            p = ((t - 19.4) * 1.4 + k / 10) % 1
            L.elipse(x, PISO - 0.15 + 0.35 * p, 0.05, 0.07, hexc('5ab4ff'), ancho=3)
    s = aparece(t, 22.9, 0.3)
    if s > 0:
        with L.escala(1.85, PROF2 - 0.8, s):
            L.rect(1.55, PROF2 - 0.75, 2.15, PROF2 - 0.25, hexc('2f6fd1'), r=0.08)
            L.circulo(1.85, PROF2 - 0.5, 0.12, hexc('d7e3f5'), ancho=3)
    s = aparece(t, 23.0, 0.4)
    if s > 0:
        pts = [(1.85, PROF2 - 0.25), (1.85, 0.15), (3.2, 0.15), (3.8, 0.4)]
        L.linea(pts, TINTA, ancho=22)
        L.linea(pts, hexc('e8e4d8'), ancho=14)
    if visible(t, 23.3, 24.4):
        for k in range(4):
            p = ((t - 23.3) * 1.6 + k / 4) % 1
            if p < 0.6:
                x, y = 1.85, PROF2 - 0.25 + (0.15 - PROF2 + 0.25) * p / 0.6
            else:
                q = (p - 0.6) / 0.4
                x, y = 1.85 + 1.95 * q, 0.15 + 0.25 * q
            L.circulo(x, y, 0.08, hexc('5ab4ff'), ancho=3)


def olor(L, t):
    if not visible(t, 25.2, 27.4):
        return
    for k in range(5):
        x = -1.8 + 0.9 * k
        fase = (t - 25.2) * 1.2 + k * 0.3
        y0 = PISO + 0.6 + (fase % 1.0) * 1.8
        pts = [(x + 0.12 * math.sin(fase * 6 + j * 0.8), y0 + 0.12 * j) for j in range(6)]
        L.linea(pts, hexc('8bc34a', 0.9), ancho=10)


def ventilacion(L, t):
    for k, x in enumerate((-0.6, 1.0)):
        s = aparece(t, 28.0 + 0.3 * k, 0.3)
        if s <= 0:
            continue
        with L.escala(x, -0.3, s):
            L.rect(x - 0.12, -0.3, x + 0.12, 1.3, hexc('e8e4d8'), ancho=5)
            L.rect(x - 0.12, 1.15, x + 0.45, 1.4, hexc('e8e4d8'), ancho=5)
    if visible(t, 29.0, 33.6):
        p = ((t - 29.0) * 0.9) % 1.0
        L.flecha(-0.6, 1.6, -0.6, PISO + 0.9, hexc('4fc3ff'), p=min(1, p * 1.6))
    if visible(t, 30.2, 33.6):
        p = ((t - 30.2) * 0.9) % 1.0
        L.flecha(1.0, PISO + 0.9, 1.0, 1.8, hexc('8bc34a'), p=min(1, p * 1.6))


def espuma_y_alfombra(L, t):
    if t >= 41.4:
        for k in range(14):
            s = aparece(t, 41.4 + 0.05 * k, 0.2)
            if s <= 0:
                continue
            r, cidx = divmod(k, 7)
            x = -2.2 + 0.68 * cidx
            y0 = PISO + 0.5 + 1.1 * r
            with L.escala(x, y0 + 0.5, s):
                L.rect(x - 0.3, y0, x + 0.3, y0 + 1.0, hexc('3b3f4a'), r=0.06, ancho=4)
                for j in range(3):
                    L.circulo(x, y0 + 0.2 + 0.3 * j, 0.09, hexc('2c2f38'), ancho=2)
    s = aparece(t, 42.6, 0.25)
    if s > 0:
        with L.escala(0, PISO, s):
            L.rect(-2.2, PISO, 2.2, PISO + 0.07, hexc('c0392b'), ancho=4)


def muebles(L, t):
    s = aparece(t, 50.6, 0.3)
    if s > 0:
        with L.escala(-0.4, PISO, s):
            L.rect(-1.0, PISO, 0.2, PISO + 0.5, hexc('8e5a2b'), r=0.12)
            L.rect(-1.05, PISO + 0.4, -0.75, PISO + 1.3, hexc('8e5a2b'), r=0.12)
            L.rect(-0.1, PISO, 0.25, PISO + 0.75, hexc('7a4a22'), r=0.1)
    s = aparece(t, 52.1, 0.3)
    if s > 0:
        with L.escala(1.6, PISO, s):
            L.rect(1.2, PISO, 2.0, PISO + 1.0, hexc('f2f4f7'), r=0.08)
            L.linea([(1.3, PISO + 0.55), (1.3, PISO + 0.8)], hexc('9aa3ad'), ancho=6)


def casita(L, t):
    if t < 37.7:
        return
    y = 2.8 * (1 - ease('bounce', (t - 37.7) / 0.55))
    x = -1.8
    L.rect(x - 0.75, y + 0.0, x + 0.75, y + 1.0, hexc('c8955a'))
    L.poli([(x - 0.9, y + 1.0), (x + 0.9, y + 1.0), (x, y + 1.6)], hexc('c8553d'))
    L.c.new_sub_path()
    L.c.arc(x, y + 0.35, 0.28, 0, math.pi)
    L.c.line_to(x - 0.28, y)
    L.c.line_to(x + 0.28, y)
    L.c.close_path()
    L.relleno(hexc('3a2416'))


# ---------------------------------------------------------------- fondo (casa con patio), con paralaje
def fondo(L, t, cam):
    cx, cy, s = cam
    VX, VY = -11.0 / 2 + 11.0 * 0.5 / 4, 0.9     # ventana de la cocina (coordenadas del fondo)
    if visible(t, 33.9, 36.3):
        p = ease('suave', (t - 33.9) / 2.4)
        L.camara(VX + 0.3, VY + 0.55, 300 + 50 * p)
    else:
        s2 = s * 0.6
        cy2 = (cy - 0.15) * s / s2
        L.camara(cx * 0.3, cy2, s2)
    L.rect(-80, -40, 80, 0.0, hexc('6cc36a'), borde=False)
    casa(L, 0.0, 0.0, ancho=11.0, alto=5.0, ventanas=4)
    arbol(L, 9.0, 0.0, t, s=1.1)
    arbol(L, -9.5, 0.0, t, s=0.9)
    for k in range(18):   # barda, solo a los lados de la casa
        x0 = -16 + 1.8 * k
        if -6.2 < x0 + 0.8 < 6.2:
            continue
        L.rect(x0, 0.0, x0 + 1.6, 1.4, hexc('b07a47'), ancho=4)
    # la suegra en la ventana de la cocina (33.9 - 36.3)
    if visible(t, 33.9, 36.3):
        vx, vy = VX, VY
        cs = L.c
        cs.save()
        cs.rectangle(vx - 0.35, vy + 0.1, 0.7, 0.9)
        cs.clip()
        sg = Personaje(ropa='8e44ad', piel='f0c8a8', pelo='c8c8cc', estilo='vestido', alto=1.6)
        sg.animo = Pista(-1.0)
        sg.pos = Pista((vx - 0.1, vy - 0.65))
        sg.dibujar(L, t)
        cs.restore()
        if (t * 4) % 1 < 0.6:
            L.rect(vx + 0.55, vy + 1.1, vx + 0.75, vy + 1.6, hexc('ff3b30'), ancho=4)
            L.circulo(vx + 0.65, vy + 0.95, 0.09, hexc('ff3b30'), ancho=4)
    ondas_sonido(L, 0.0, 2.2, t, 39.4, 40.6, col='ffffff', r=0.8, dir_=-1)
    ondas_sonido(L, 0.0, 2.2, t, 39.4, 40.6, col='ffffff', r=0.8, dir_=1)


# ---------------------------------------------------------------- cámara (cortes secos entre planos)
PLANOS = [  # t, (cx, cy, s) inicio, (cx, cy, s) fin
    (0.0, (2.0, 1.5, 70), (1.0, 0.5, 85)),
    (4.6, (0.5, -0.6, 150), (0.5, -0.6, 160)),
    (6.7, (0.0, -1.6, 125), (0.0, -1.6, 132)),
    (13.2, (0.0, -1.5, 120), (0.0, -1.5, 128)),
    (18.5, (0.6, -2.6, 175), (0.6, -2.6, 185)),
    (24.5, (0.6, -1.5, 120), (0.6, -1.5, 126)),
    (33.9, (-2.6, 5.0, 210), (-2.6, 5.0, 240)),
    (36.4, (-1.5, -0.4, 140), (-1.5, -0.4, 150)),
    (38.9, (0.0, 1.5, 75), (0.0, 0.0, 95)),
    (40.6, (0.0, -1.8, 140), (0.0, -1.8, 148)),
    (43.3, (-1.6, 0.4, 175), (-1.6, 0.4, 185)),
    (46.4, (2.0, 1.0, 85), (0.0, 0.8, 90)),
    (50.2, (0.0, -2.2, 160), (0.0, -2.2, 168)),
    (52.8, (-0.6, -0.8, 130), (-0.6, -0.8, 136)),
    (56.0, (0.0, -0.5, 120), (0.0, 1.0, 55)),
]


def camara(t):
    for i, (t0, a, b) in enumerate(PLANOS):
        t1 = PLANOS[i + 1][0] if i + 1 < len(PLANOS) else DUR
        if t0 <= t < t1:
            p = ease('suave', (t - t0) / (t1 - t0))
            cam = tuple(x + (y - x) * p for x, y in zip(a, b))
            # golpe de zoom al entrar a cada plano
            k = 1 + 0.06 * max(0, 1 - (t - t0) / 0.25)
            return (cam[0], cam[1], cam[2] * k)
    return PLANOS[-1][2]


SACUDIDAS = [(3.9, 0.3), (16.75, 0.35), (38.2, 0.35), (47.8, 0.25)]


def sacudida(t):
    for t0, d in SACUDIDAS:
        if t0 <= t < t0 + d:
            return 14 * (1 - (t - t0) / d)
    return 0.0


# ---------------------------------------------------------------- cuadro
def cuadro(L, t):
    cam = camara(t)
    cielo(L, t, arriba='4aa3e8' if not visible(t, 4.6, 6.8) else '6d7d8c', abajo='cfeeff' if not visible(t, 4.6, 6.8) else 'a9b4bf')
    L.camara(cam[0] * 0.15, 6 + cam[1] * 0.2, cam[2] * 0.5)
    nubes(L, t)
    fondo(L, t, cam)
    if visible(t, 33.9, 36.3):   # plano de la ventana: solo la casa
        return
    L.camara(cam[0], cam[1], cam[2], sacudida(t), t)
    suelo(L, t, TIERRA, huecos(t))
    # lodo de la lluvia (5.4 - 7.15)
    if visible(t, 5.4, 7.15):
        h = (PROF1 + 0.9 * ease('out', (t - 5.4) / 1.2))
        L.rect(-HX, PROF1, HX, h, hexc('6b4a2b', 0.95), ancho=5)
        for k in range(4):
            L.circulo(-2 + 1.3 * k + 0.2 * math.sin(t * 3 + k), h + 0.02, 0.08, hexc('8a6440'), ancho=3)
    tablas(L, t)
    bloques(L, t)
    escalera(L, t)
    agua_y_bomba(L, t)
    espuma_y_alfombra(L, t)
    muebles(L, t)
    olor(L, t)
    yerno.dibujar(L, t)
    losa(L, t)
    ventilacion(L, t)
    casita(L, t)
    suegra.dibujar(L, t)
    if t >= 52.9:   # el perro sin casa
        with L.escala(-0.4, 0.0, aparece(t, 52.9, 0.3)):
            perro(L, -0.2, 0.0, t, d=-1, triste=True, s=1.2)
    tierra_volando(L, t, 2.1, 3.9, 0.9, PROF1 * 0.5)
    tierra_volando(L, t, 7.2, 8.3, 0.4, -1.4, semilla=8)
    lluvia(L, t, 4.6, 6.8, -6, 8, ytop=cam[1] + 9, ybot=-1.3)
    # resaltes "Esto es..."
    L.resalte(-HX - 0.35, PISO - 0.2, HX + 0.35, 0.1, t, 17.1, 18.5)
    L.resalte(-0.9, -0.4, 1.6, 1.5, t, 32.0, 33.6)
    L.resalte(-2.7, -0.05, -0.9, 1.65, t, 44.5, 46.2)


EVENTOS = ([(2.2 + 0.45 * k, 'pala') for k in range(4)] + [(7.3 + 0.25 * k, 'pala') for k in range(4)] +
           [(5.4, 'agua'), (8.5, 'pop'), (8.9, 'pop'), (14.5, 'pop'), (14.9, 'pop'), (16.75, 'golpe'), (17.0, 'pop'),
            (19.8, 'agua'), (22.9, 'pop'), (23.3, 'agua'), (28.0, 'pop'), (28.3, 'pop'), (29.0, 'swoosh'), (30.2, 'swoosh'),
            (33.9, 'swoosh'), (38.2, 'golpe'), (41.4, 'pop'), (41.8, 'pop'), (42.6, 'pop'), (50.6, 'pop'), (52.1, 'pop'),
            (52.9, 'pop'), (56.0, 'ding')])

if __name__ == '__main__':
    out = sys.argv[1]
    args = {sys.argv[i]: sys.argv[i + 1] for i in range(2, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
    if '--cuadros' in args:   # pruebas: solo algunos cuadros, en segundos
        L = Lienzo()
        os.makedirs(out, exist_ok=True)
        for tt in [float(v) for v in args['--cuadros'].split(',')]:
            cuadro(L, tt)
            L.surf.write_to_png(os.path.join(out, f'p_{tt:05.1f}.png'))
    else:
        render(cuadro, DUR, out)
    if '--audio' in args:
        mezclar(args['--audio'], EVENTOS, args['--mezcla'], DUR, lluvia_tramos=[(4.6, 6.8)])
