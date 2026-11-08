"""Versión ilustrada de la serie: toma los guiones de crear_guiones.py y reemplaza la parte visual
de cada escena por ilustraciones animadas de lo que se menciona (estilo "objeto en pantalla").
Sin subtítulos. Uso: python3 guiones/ilustrar.py   (escribe guiones/<id>.json)
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crear_guiones import G, tit, txt, num, pil, ico, icos, tarj, barras, pasos, lista, sello, vs, fila, comenta, AZUL_OJO, CAFE  # noqa

AQUI = os.path.dirname(os.path.abspath(__file__))


def il(nombre, en=None, marcas=None, **kw):
    return dict(t='ilus', nombre=nombre, en=en, marcas=marcas or {}, **kw)


ESCENARIO = dict(bowling='bolera', mano_izquierda='papel', narcotrafico='ciudad', zoologicos='sabana', ojos_claros='adn',
                 cosquillas=None, monedas='monedas', palomitas='cine', celular_arroz='agua', rayo_auto='tormenta')

V = {}  # escena -> lista de elementos o ('momentos', [...])

# ---------------- BOWLING ----------------
V.update({
    'b1': [tit('¿[190] puntos sin un strike?', size=92), il('bolera', modo='nueve', marcas={'tiro': 'bowling'}, etiqueta='SIN STRIKE')],
    'b2': [tit('El truco: el [spare]', size=96), il('bolera', modo='spare', marcas={'tiro': 'derribar', 'segunda': 'dos'}, etiqueta='SPARE = 10 EN 2 TIROS')],
    'b3': [num(10, '10', sufijo=' pts', size=150), tit('+ la [siguiente bola]', 'siguiente', size=80), il('bolera', 'siguiente', modo='strike', marcas={'tiro': 'siguiente'}, size=430, esperar=True)],
    'b4': [il('bolera', modo='spare', marcas={'tiro': '9', 'segunda': 'spare,'}, size=500), num(19, '19', sufijo=' por cuadro', size=120)],
    'b6': [tit('[Sin] spare', acento='rojo', size=110), il('bolera', modo='nueve', marcas={'tiro': 'tiras'}, size=470), num(90, '90', sufijo=' pts', color='rojo', size=160)],
    'b8': [il('trofeo_brillo', size=480), tit('190 = [altísimo]', '190', size=104)],
    'b10': [tit('“[Dutch 200]”', size=120), il('bolera', modo='strike', marcas={'tiro': 'dutch'}, etiqueta='¡STRIKE!', size=480)],
    'b11': [il('bolera', modo='spare', marcas={'tiro': 'asegura', 'segunda': 'spare.'}, size=440),
            lista([dict(texto='Buscar el strike', ok=False, en='busques'), dict(texto='Asegurar el spare', ok=True, en='asegura')])],
    'b12': [il('trofeo_brillo', size=380), tit('¿Tu mejor [puntaje]?', size=104), comenta()],
})

# ---------------- MANO IZQUIERDA ----------------
V.update({
    'm1': [tit('¿Cuánto tarda la [izquierda]?', size=96), il('mano_firma', temblor=1.2, dur=80, etiqueta='MANO IZQUIERDA')],
    'm2': [pil('Día 1', size=56), il('mano_firma', temblor=1, dur=60), tit('Firma de [niño de 5]', 'niño', size=96)],
    'm3': ('momentos', [(None, [pil('Un estudio', size=50), il('mano_firma', temblor=0.6, dur=60, etiqueta='PRACTICANDO')]),
                        ('10', [il('calendario_hojas', desde=1, hasta=10, titulo='DÍAS', dur=30, size=440), txt('Menos de [3 h 30 min] en total', 'menos', size=52)])]),
    'm4': [num(89, '89', sufijo='%', size=190), il('grafico', forma='sube', color='#a78bfa', etiqueta='MEJORARON', size=380),
           lista([dict(texto='Velocidad', ok=True, en='velocidad,'), dict(texto='Precisión', ok=True, en='precisión'), dict(texto='Suavidad', ok=True, en='suavidad.')])],
    'm5': [il('reloj_vueltas', velocidad=5, etiqueta='6 MESES DESPUÉS', size=480), pil('Seguían mejor', 'conservaba', fondo='verde', color='#032312', size=52)],
    'm6': [pil('15 min al día', '15', size=56), il('calendario_hojas', '6', desde=1, hasta=6, titulo='SEMANA', dur=36, size=420),
           icos([dict(nombre='pluma', texto='Escribir', en='escribir'), dict(nombre='mouse', texto='Mouse', en='mouse')], size=150)],
    'm8': [il('cerebro_puente', izq='MANO DERECHA', der='MANO IZQUIERDA', c1='#a78bfa', size=500), tit('Toda la vida con [un solo lado]', 'entrenando', size=84)],
    'm9': ('momentos', [(None, [tit('Lo más [loco]…', size=120), ico('estrella', anim='gira', size=180)]),
                        ('al', [tit('Entrenas la izquierda…', size=80), il('cerebro_puente', izq='IZQUIERDA', der='DERECHA', marcas={'cruza': 'derecha'}, size=520),
                                tit('…y [mejora la derecha]', 'mejora.', size=80)])]),
    'm10': [il('cerebro_puente', izq='APRENDE', der='COMPARTE', marcas={'cruza': 'comparte'}, size=520), tit('Comparte lo que [aprende]', 'comparte', size=90)],
    'm11': [il('calendario_hojas', desde=1, hasta=7, titulo='1 SEMANA', dur=40, size=400), tit('¿Te [animas]?', size=120), comenta()],
})

# ---------------- NARCOTRÁFICO ----------------
V.update({
    'n1': [tit('¿El narco [ayuda] a la economía?', size=92), il('balanza_inclina', angulo=0, tizq='¿ENTRA?', tder='¿SE PIERDE?', nizq=1, nder=1, size=520)],
    'n3': [il('lluvia_billetes', size=540), tit('Dinero en [efectivo]', 'efectivo.', size=100)],
    'n4': [tit('Casas, negocios, autos', size=86), il('ciudad_crece', marcas={'casas': 'casas,', 'negocios': 'negocios,', 'autos': 'autos.'}, size=560)],
    'n6': [tit('La cuenta que [no te muestran]', size=96), il('grafico', forma='baja', etiqueta='LA OTRA CUENTA', size=500)],
    'n7': [pil('México · 2025', size=50), num(4, '4', prefijo='$', sufijo=' billones', size=140, color='rojo'), txt('de pesos: el costo de la violencia', 'pesos'),
           il('grafico', forma='baja', color='#ff4d5e', size=400)],
    'n9': [tit('¿Por qué?', size=100), il('tienda_cerrada', marcas={'cierra': 'extorsión.'}, size=380),
           tarj([dict(icono='fabrica', texto='Sin inversión', color='rojo', en='invierten,'), dict(icono='avion', texto='Sin turistas', color='rojo', en='turistas'),
                 dict(icono='candado', texto='Extorsión', color='rojo', en='extorsión.')])],
    'n10': [il('casa_precio', marcas={'sube': 'infla'}, size=540), tit('Casas [impagables]', 'pagarlas.', acento='rojo', size=100)],
    'n11': [il('piramide', marcas={'riesgo': 'riesgo.'}, size=600)],
    'n12': [il('balanza_inclina', angulo=24, marcas={'inclina': 'pierde.'}, tizq='LO QUE ENTRA', tder='LO QUE SE PIERDE', nizq=1, nder=3, size=560)],
})

# ---------------- ZOOLÓGICOS ----------------
V.update({
    'z1': [tit('¿Por qué desaparecen los [zoológicos]?', size=90), il('jaula_abre', marcas={'abre': 'desapareciendo'}, size=540)],
    'z2': [pil('Buenos Aires · 2016', size=50), il('mapa_pin', x=320, y=430, etiqueta='BUENOS AIRES', size=460), tit('+[100] años', '100', size=96),
           pil('→ Ecoparque', 'ecoparque.', fondo='verde', color='#032312', size=56)],
    'z3': [pil('Costa Rica · Mayo 2024', size=50), il('mapa_pin', x=235, y=110, etiqueta='COSTA RICA', size=480), sello('Cerrados', 'cerró', color='rojo')],
    'z4': [num(300, '300', prefijo='~', sufijo=' animales', size=150), il('camion', size=520)],
    'z6': [pil('Revista Science', size=50), il('elefante_camina', etiqueta='ELEFANTAS', size=420),
           icos([dict(nombre='jaula', texto='Zoológico', color='#c9d3e3', en='zoológicos'), dict(nombre='hoja', texto='Salvajes · Kenia', en='salvajes')], size=150)],
    'z7': [il('elefante_camina', size=380),
           barras([dict(texto='Salvajes (Kenia)', valor=56, sufijo=' años', color='verde', en='56'), dict(texto='En zoológico', valor=17, sufijo=' años', color='rojo', en='17.')])],
    'z9': ('momentos', [(None, [tit('Ojo: [no todos] desaparecen', size=100), ico('ojo', anim='late', size=200, color='verde')]),
                        ('transformando', [il('jaula_abre', marcas={'abre': 'santuarios'}, size=480),
                                           lista([dict(texto='Rescatan animales', ok=True, en='rescatan'), dict(texto='Protegen especies', ok=True, en='especies')])])]),
})

# ---------------- OJOS CLAROS ----------------
V.update({
    'o1': [il('ojo_grande', color=AZUL_OJO, color2=CAFE, marcas={'cambia': 'café?'}, size=540), tit('¿Azules… o [café]?', size=104)],
    'o3': [il('sol_mapa', size=560), pil('Menos pigmento', 'pigmento', size=52)],
    'o5': [il('adn_helice', marcas={'marca': 'mutación.'}, etiqueta='MUTACIÓN', size=540), tit('[1] misma mutación', 'mutación.', size=104)],
    'o6': [il('arbol_familia', size=480), tit('Hace [6.000 – 10.000] años', '6', size=84)],
    'o7': [il('arbol_familia', size=520), tit('Un [ancestro] en común', 'ancestro', size=100)],
    'o8': [pil('Otro dato', size=50), il('ojo_grande', color=AZUL_OJO, size=480), sello('0 pigmento azul', 'pigmento', color='rojo', size=80)],
    'o9': [il('luz_iris', marcas={'rebota': 'rebota', 'cielo': 'cielo'}, size=560), tit('La luz [rebota]', 'rebota', size=104)],
    'o12': [il('ojo_grande', color=AZUL_OJO, dilata=True, size=380),
            tarj([dict(icono='adn', texto='Mismos genes: piel y ojos', color=AZUL_OJO, color2='#a78bfa', en='genes', size=50),
                  dict(icono='ojo', texto='Ver mejor con poca luz', color=AZUL_OJO, en='vean', size=50)])],
    'o14': [il('ojo_grande', color=AZUL_OJO, color2='#3e9d5a', marcas={'cambia': 'color'}, size=440), tit('¿Tus [ojos]?', size=120), comenta()],
})

# ---------------- COSQUILLAS ----------------
V.update({
    'c1': [tit('¿Cosquillas a [ti mismo]?', size=100), il('pluma_mano', siente=False, size=540)],
    'c2': [il('pluma_mano', siente=False, size=520), sello('No funciona', 'funciona.', color='rojo')],
    'c4': [il('senal_cerebro', marcas={'copia': 'copia'}, size=580), pil('Copia de la orden', 'copia', size=52)],
    'c5': [tit('[Predice] lo que vas a sentir', 'predice', size=90), il('volumen', marcas={'baja': 'volumen.'}, etiqueta='COSQUILLAS', size=520)],
    'c6': [il('pluma_mano', siente=True, size=540), tit('No lo [vio venir]', 'venir,', size=104)],
    'c7': [pil('Experimento · Londres', size=50), il('robot_cosquillas', size=540), tit('Brazo [robótico]', 'robótico.', size=100)],
    'c8': [il('robot_cosquillas', marcas={'retraso': 'retraso,'}, size=560), tit('¡Las cosquillas [volvían]!', 'volvían.', size=92)],
    'c9': ('momentos', [(None, [tit('¿Para qué [sirve]?', size=110), ico('cerebro', anim='late', size=240, color='#ff7ab6', color2='oro')]),
                        ('ignore', [lista([dict(texto='Ignora lo tuyo', ok=False, en='ignore'), dict(texto='Detecta lo de afuera', ok=True, en='detecte')]),
                                    il('insecto_brazo', marcas={'detecta': 'insecto'}, size=480)])]),
    'c11': [il('pluma_mano', siente=True, size=420), tit('¿Eres [cosquilloso]?', size=104), comenta()],
})

# ---------------- MONEDAS ----------------
V.update({
    'mo1': [il('moneda_bimetalica', size=500), sello('No la vendas', 'vendas.', color='rojo'), tit('Vale [más] de lo que crees', 'vale', size=84)],
    'mo2': [il('moneda_bimetalica', marcas={'separa': 'anillo'}, size=520), tit('Les quitan el [anillo]', 'anillo', size=100)],
    'mo3': [il('moneda_bimetalica', marcas={'separa': 'adentro.'}, size=420),
            lista([dict(texto='Coleccionar', ok=False, en='coleccionar,'), dict(texto='Lo que tiene adentro', ok=True, en='adentro.')])],
    'mo4': [pil('10 nuevos pesos · años 90', '10', size=48), il('moneda_bimetalica', marcas={'separa': 'plata.'}, etiqueta='CENTRO DE PLATA', size=520)],
    'mo5': [il('moneda_bimetalica', marcas={'separa': 'plata'}, etiqueta='LEY .925', size=560)],
    'mo6': [il('bascula', valor=5, sufijo=' g', size=520), txt('de plata pura', 'pura.', size=56)],
    'mo7': [txt('Solo el metal:', 'metal'), num(100, '100', prefijo='+$', size=200), il('grafico', forma='sube', etiqueta='PRECIO DE LA PLATA', size=420)],
    'mo11': [tit('Revisa también:', size=90), il('lupa_moneda', marcas={'encuentra': 'errores'}, size=380),
             tarj([dict(icono='lupa', texto='Errores de fábrica', en='errores', size=50), dict(icono='calendario', texto='Poca producción', en='producción', size=50),
                   dict(icono='moneda', texto='Antiguas de plata', color='#dfe6ee', en='antiguas', size=50)])],
    'mo13': [il('moneda_bimetalica', size=420), tit('¿Tienes [alguna]?', size=110), comenta()],
})

# ---------------- PALOMITAS ----------------
V.update({
    'p1': [il('palomitas_maquina', size=520), tit('¿Casi [lo mismo] que la entrada?', size=92)],
    'p2': [il('boleto_reparte', estudio=70, marcas={'corta': 'nada.'}, size=520), tit('Al cine le queda [casi nada]', 'nada.', acento='rojo', size=90)],
    'p4': [pil('1.ª semana de estreno', size=50), il('boleto_reparte', estudio=70, marcas={'corta': '70%,'}, size=520), num(70, '70%,', sufijo='%+', size=170, color='rojo')],
    'p5': [tit('¿De dónde gana?', size=104), il('palomitas_maquina', 'dulcería.', size=500, esperar=True), tit('La [dulcería]', 'dulcería.', size=110)],
    'p7': [pil('Gran cadena de cines · EE. UU.', size=46), il('dulceria', size=460), txt('De cada $100 en dulcería:', '100'), num(80, '80', prefijo='+$', size=180, color='verde')],
    'p11': [tit('El cine es una [tienda de palomitas]', 'tienda', size=90), il('palomitas_maquina', size=500), txt('…con una película de regalo', 'película')],
})

# ---------------- CELULAR EN ARROZ ----------------
V.update({
    'a1': [il('celular_agua', size=540), sello('No lo metas en arroz', 'arroz.', color='rojo', size=70)],
    'a5': [tit('¿Por qué?', size=110), il('celular_arroz', marcas={'particulas': 'polvo'}, size=580), sello('Más daño', 'dañarlo', color='rojo')],
    'a6': [il('reloj_vueltas', velocidad=3, color='#5ac8ff', size=460), tit('No seca [tan rápido]', 'rápido', size=100)],
    'a8': [il('celular_aire', size=420), pasos([dict(texto='[Apágalo] y no lo cargues', en='apágalo')])],
    'a9': [il('celular_golpes', size=460), pasos([dict(texto='Apágalo y no lo cargues'), dict(texto='Puerto abajo: [golpecitos]', en='golpecitos')])],
    'a10': [il('celular_aire', size=440),
            pasos([dict(texto='Apágalo y no lo cargues'), dict(texto='Puerto abajo: golpecitos'), dict(texto='Lugar seco, con aire, [1 día]', en='seco,')])],
})

# ---------------- RAYO EN EL AUTO ----------------
V.update({
    'r1': [il('rayo_auto', marcas={'impacto': 'rayo'}, size=560), tit('[Sobrevives]… pero no por lo que crees', 'sobrevivas,', size=80)],
    'r5': [il('rayo_auto', marcas={'impacto': 'salva'}, size=580), tit('La [carrocería] de metal', 'carrocería', size=96)],
    'r7': [il('rayo_auto', marcas={'impacto': 'electricidad'}, size=540),
           pasos([dict(texto='Corre por [afuera]', en='afuera'), dict(texto='Rodea el auto', en='rodea'), dict(texto='Se va al [suelo]', en='suelo.')])],
    'r8': [il('rayo_auto', size=520), tit('[Protegido]', 'protegido.', size=120)],
    'r12': [il('edificio_rayo', size=560), tit('Lo más seguro: un [edificio]', 'edificio.', size=90)],
})


if __name__ == '__main__':
    usadas = set()
    for gid, g in G.items():
        g = json.loads(json.dumps(g))
        g['estilo']['escenario'] = ESCENARIO.get(gid)
        g['estilo']['subtitulos'] = False
        for b in g['beats']:
            v = V.get(b['scene'])
            if v is None:
                continue
            usadas.add(b['scene'])
            tinte = b['escena'].get('tinte')
            if isinstance(v, tuple):
                b['escena'] = {'momentos': [dict(en=m[0], el=m[1]) for m in v[1]]}
            else:
                b['escena'] = {'el': v}
            if tinte:
                b['escena']['tinte'] = tinte
        json.dump(dict(id=gid, **g), open(os.path.join(AQUI, gid + '.json'), 'w'), ensure_ascii=False, indent=1)
    faltan = set(V) - usadas
    print('escenas ilustradas:', len(usadas), '| ids sin usar:', faltan or 'ninguno')
