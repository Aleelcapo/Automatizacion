"""Busca candidatas en Commons para varias consultas y guarda los resultados (título, licencia, autor, descripción)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import commons
out = sys.argv[1]; queries = sys.argv[2:]
res = json.load(open(out)) if os.path.exists(out) else {}
for q in queries:
    if q in res: continue
    try:
        rs = commons.search(q, n=25)
    except Exception as e:
        print('fallo', q, e, flush=True); continue
    res[q] = [dict(title=r['title'][5:], w=r['w'], h=r['h'], license=r['license'], artist=r['artist'][:60], desc=r['desc'][:140])
              for r in rs if r['mime'] in ('image/jpeg', 'image/png')]
    json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
    print('ok', q, len(res[q]), flush=True)
