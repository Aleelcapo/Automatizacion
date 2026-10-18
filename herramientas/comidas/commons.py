"""Búsqueda y descarga en Wikimedia Commons con reintentos (la IP compartida recibe 429)."""
import sys, json, re, time, urllib.request, urllib.parse

UA = 'AutomatizacionVideoBot/1.0 (educational geography video; github.com/Aleelcapo/Automatizacion)'
API = 'https://commons.wikimedia.org/w/api.php'

def get(url, tries=12):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 and e.code < 500: raise
            time.sleep(int(e.headers.get('retry-after') or 5) + 2 * i)
    raise RuntimeError('demasiados reintentos: ' + url)

def clean(s): return re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', s or '')).strip()

def info(titles):
    q = dict(action='query', format='json', titles='|'.join(titles), prop='imageinfo',
             iiprop='url|size|extmetadata|mime', iiextmetadatafilter='LicenseShortName|LicenseUrl|Artist|ImageDescription|Credit')
    d = json.loads(get(API + '?' + urllib.parse.urlencode(q)))
    out = []
    for p in d['query']['pages'].values():
        if 'imageinfo' not in p: continue
        ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
        g = lambda k: clean(m.get(k, {}).get('value', ''))
        out.append(dict(title=p['title'], url=ii['url'], page=ii['descriptionurl'], w=ii['width'], h=ii['height'],
                        mime=ii['mime'], license=g('LicenseShortName'), license_url=g('LicenseUrl'),
                        artist=g('Artist'), desc=g('ImageDescription')))
    return out

def search(q, n=30):
    p = dict(action='query', format='json', list='search', srsearch=q, srnamespace=6, srlimit=n)
    d = json.loads(get(API + '?' + urllib.parse.urlencode(p)))
    titles = [r['title'] for r in d['query']['search']]
    res = []
    for i in range(0, len(titles), 20):
        res += info(titles[i:i+20])
    return res

if __name__ == '__main__':
    for r in search(sys.argv[1]):
        if r['mime'] not in ('image/jpeg', 'image/png', 'image/webp'): continue
        print(f"{r['w']}x{r['h']} | {r['license']} | {r['title']} | {r['artist'][:40]} | {r['desc'][:80]}")

def category(cat, n=60):
    p = dict(action='query', format='json', list='categorymembers', cmtitle='Category:' + cat, cmtype='file', cmlimit=n)
    d = json.loads(get(API + '?' + urllib.parse.urlencode(p)))
    titles = [r['title'] for r in d['query']['categorymembers']]
    res = []
    for i in range(0, len(titles), 20):
        res += info(titles[i:i+20])
    return res
