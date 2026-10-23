"""Genera fuentes_y_licencias.md de un video a partir de su video.json y los metadatos de Commons.

Uso: credits.py <video.json> <guion_meta.json> <salida.md>
guion_meta.json: {"titulo": ..., "audio": ..., "dur": ..., "notas": {"ITA": "texto"...}}
"""
import sys, os, json, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import commons
cfg = json.load(open(sys.argv[1], encoding='utf-8')); meta = json.load(open(sys.argv[2], encoding='utf-8'))
NAMES = dict(JPN='Japón', MEX='México', PER='Perú', ARG='Argentina', ITA='Italia', IND='India',
             ISL='Islandia', FIN='Finlandia', GEO='Georgia', KAZ='Kazajistán', ETH='Etiopía', PHL='Filipinas',
             KEN='Kenia', NPL='Nepal', KHM='Camboya', ARM='Armenia', SWE='Suecia', SEN='Senegal')
SLUG = dict(JPN='japan', MEX='mexico', PER='peru', ARG='argentina', ITA='italy', IND='india',
            ISL='iceland', FIN='finland', GEO='georgia', KAZ='kazakhstan', ETH='ethiopia', PHL='philippines',
            KEN='kenya', NPL='nepal', KHM='cambodia', ARM='armenia', SWE='sweden', SEN='senegal')
titles = ['File:' + os.path.basename(p['file']).replace('_', ' ') for s in cfg['route'] for p in s['photos']]
info = {}
for i in range(0, len(titles), 20):
    for r in commons.info(titles[i:i + 20]):
        info[r['title']] = r
L = [f"# {meta['titulo']}: fuentes, autores y licencias", '',
     'Los créditos van fuera de la imagen, en este archivo. Ninguna fotografía es generada por IA.', '',
     '## Qué compara el ranking', '',
     'Cada plato es, según el guion del autor, el que ocupa el puesto 10 en la lista **"Best rated dishes in [país]"** de TasteAtlas.',
     'La lista ordena los platos por las valoraciones del público en TasteAtlas; no mide ventas ni consumo, y cambia con nuevos votos.', '',
     '**Limitación:** TasteAtlas bloquea las consultas automáticas desde este entorno (HTTP 403), así que no pude confirmar cada puesto directamente. Conviene revisarlos antes de publicar.', '',
     '| País | Plato | Página de TasteAtlas |', '|---|---|---|']
for s in cfg['route']:
    L.append(f"| {NAMES[s['key']]} | {s['dish']} | https://www.tasteatlas.com/best-rated-dishes-in-{SLUG[s['key']]} |")
L += ['', '## Material geográfico', '',
      '| Elemento | Fuente | Autor | Licencia |', '|---|---|---|---|',
      '| Mapa satelital (Blue Marble Next Generation, julio de 2004). Reproyectado a Mercator, con corrección de color y extendido más allá de ±180° para cruzar los océanos sin cortes | https://visibleearth.nasa.gov/images/73751 | NASA Earth Observatory (Reto Stöckli) | Dominio público |',
      '| Fronteras de países (Admin 0, escala 1:10m) | https://www.naturalearthdata.com/ | Natural Earth | Dominio público |',
      '| Banderas | Wikimedia Commons, `File:Flag_of_*.svg` | Wikimedia Commons | Dominio público |', '',
      '## Fotografías (tarjetas)', '',
      'Cambios aplicados a todas: recorte al formato de la tarjeta, redimensionado, esquinas redondeadas y fundido entre fotos.', '',
      '| País | Archivo | Autor | Licencia | Descripción en Commons |', '|---|---|---|---|---|']
for s in cfg['route']:
    for p in s['photos']:
        t = 'File:' + os.path.basename(p['file']).replace('_', ' ')
        r = info.get(t, {})
        lic = r.get('license', '?'); lu = r.get('license_url', '')
        lic_md = f"[{lic}]({lu})" if lu else lic
        url = r.get('page') or 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(t.replace(' ', '_'))
        desc = (r.get('desc') or '').replace('|', '/')[:160]
        L.append(f"| {NAMES[s['key']]} | [{t[5:]}]({url}) | {(r.get('artist') or '?').replace('|', '/')[:80]} | {lic_md} | {desc} |")
if meta.get('notas'):
    L += ['', '**Notas sobre las fotos:**', '']
    L += [f"- {NAMES[k]}: {v}" for k, v in meta['notas'].items()]
L += ['', 'Las fotos muestran cada plato como contexto; cuando la ficha no indica el lugar, no se presentan como tomadas en un sitio concreto.', '',
      '## Tipografía', '', '**Anton**, de Vernon Adams y The Anton Project Authors, en mayúsculas en los subtítulos. Licencia [SIL Open Font License 1.1](https://openfontlicense.org).', '',
      '## Sonido', '',
      f"- **Narración:** la grabación que entregó el autor (`{meta['audio']}`, {meta['dur']} s). Se usa sin cambiar la velocidad ni el tono; solo se normalizó el volumen a −16 LUFS.",
      '- **Efectos:** barridos e impactos suaves sintetizados por código (`herramientas/comidas/sfx.py`), sin material de terceros.',
      '- No hay música.', '']
open(sys.argv[3], 'w', encoding='utf-8').write('\n'.join(L))
print('fotos', len(titles), 'con metadatos', sum(1 for t in titles if t in info))
