import json, os, shutil, glob
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pick = [('v1','Puede regenerar sus patas'),('v1','Según la mitología'),('v1','Hoy solo vive'),('v1','Es una salamandra'),
        ('v3','Ese penacho'),('v1','Hacia 1860'),('v3','Duméril también'),('v1','Tras la herida'),('v1','Eso da esperanza'),
        ('v1','Pero en libertad'),('v1','Xochimilco es hoy'),('v3','Para salvarlo'),('v1','Un animal que podría')]
names = {'v1':'Ajolote_1_biologia_increible','v3':'Ajolote_3_que_lo_hace_magico'}
srcinfo = {'v1': {"path": "../src/v1.mp4", "cuts": "../work/cuts_v1b.json", "safe": [0, 0, 640, 322]},
           'v3': {"path": "../src/v3.mp4", "cuts": "../work/cuts_v3.json"}}
edls = {v: json.load(open(f'{S}/edl/{v}.json')) for v in ('v1','v3')}
out = 'Ajolote_resumen_2min'
tmp = f'{S}/out/{out}_tmp'; os.makedirs(tmp, exist_ok=True)
beats = []
for i,(v,pre) in enumerate(pick):
    e = edls[v]
    b = [x for x in e['beats'] if x['text'].startswith(pre)][0]
    # locate cached audio
    found = None
    for js in glob.glob(f'{S}/out/{names[v]}_tmp/b*.json'):
        k = json.load(open(js))['key']
        if json.loads(k)[0] == b['text']:
            found = js; break
    assert found, (v, pre)
    for ext in ('.json','.wav','.mp3'):
        shutil.copy(found[:-5]+ext, f'{tmp}/b{i:02d}{ext}')
    rate = json.loads(json.load(open(found))['key'])[2]
    shots = []
    for s in b['shots']:
        s = dict(s); s['src'] = v
        for k in ('g0','g1','beat','f0','f1','n','src_end'): s.pop(k, None)
        if v == 'v1' and 'end' in s and not e.get('autoend'): pass
        shots.append(s)
    nb = {'text': b['text'], 'rate': rate, 'shots': shots}
    if 'gap' in b: nb['gap'] = b['gap']
    beats.append(nb)
edl = {"out": out, "title": "El ajolote en 2 minutos", "voice": "es-MX-JorgeNeural", "rate": "+8%", "gap": 0.3,
       "autoend": True, "sources": srcinfo, "beats": beats}
json.dump(edl, open(f'{S}/edl/combo.json','w'), ensure_ascii=False, indent=1)
print(len(beats), 'beats', sum(len(b['text'].split()) for b in beats), 'words')
