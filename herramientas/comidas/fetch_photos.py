"""Descarga fotos de Commons (miniatura de 1600 px) y guarda sus metadatos de autor y licencia."""
import sys, json, os, hashlib, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import commons

out = sys.argv[1]; titles = sys.argv[2:]
meta_path = os.path.join(out, 'meta.json')
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
todo = [t for t in titles if t not in meta or not os.path.exists(meta[t]['file'])]
infos = []
for i in range(0, len(todo), 20):
    infos += commons.info(['File:' + t for t in todo[i:i + 20]])
for r in infos:
    name = r['title'][5:]
    fn = os.path.join(out, name.replace(' ', '_'))
    if not os.path.exists(fn):
        n = name.replace(' ', '_'); h = hashlib.md5(n.encode()).hexdigest()
        u = r['url'] if r['w'] <= 1600 else \
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{urllib.parse.quote(n)}/1600px-{urllib.parse.quote(n)}"
        try:
            data = commons.get(u, tries=6)
        except Exception as e:
            print('fallo', name, e, flush=True); continue
        open(fn, 'wb').write(data)
    r['file'] = fn; meta[name] = r
    json.dump(meta, open(meta_path, 'w'), ensure_ascii=False, indent=1)
    print('ok', name, r['license'], flush=True)
