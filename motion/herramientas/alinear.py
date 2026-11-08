"""Sincroniza una voz grabada (ya limpia) con su guion.

Uso: python3 herramientas/alinear.py <id>
Lee:  guiones/<id>.json  (beats con texto, keys, sfx, escena)
      voces/<id>.wav + voces/<id>.palabras.json  (salida de limpiar_voz.py)
Escribe: public/<id>/voz.wav y src/data/<id>.json (mismo formato que voz.py)

Los subtítulos muestran lo que realmente se dijo (Whisper), con la ortografía del guion
cuando coincide. Cada palabra guarda también sus "alias" del guion (p. ej. "190" ↔ "ciento noventa")
para que las animaciones se puedan anclar a palabras del guion.
"""
import sys, os, json, re, shutil, difflib, unicodedata, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUNT = '¿?¡!,.…:;"“”()'


def limpia(w):
    return w.lower().strip(PUNT)


def sin_acentos(w):
    return ''.join(c for c in unicodedata.normalize('NFD', limpia(w)) if unicodedata.category(c) != 'Mn')


def juntar_numeros(ws):
    """Whisper a veces parte '10 .000' en dos palabras."""
    out = []
    for w in ws:
        if out and re.fullmatch(r'[.,]\d{3}[.,?!]*', w['w']) and re.search(r'\d$', out[-1]['w']):
            out[-1]['w'] += w['w']
            out[-1]['e'] = w['e']
        else:
            out.append(dict(w))
    return out


def main(gid):
    g = json.load(open(os.path.join(ROOT, 'guiones', gid + '.json')))
    W = juntar_numeros(json.load(open(os.path.join(ROOT, 'voces', gid + '.palabras.json'))))
    # tokens del guion con su beat
    S = []
    for bi, b in enumerate(g['beats']):
        for tok in b['text'].split():
            S.append(dict(w=tok, beat=bi))
    a = [sin_acentos(s['w']) for s in S]
    b = [sin_acentos(w['w']) for w in W]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)

    disp = []  # palabras a mostrar: dict(t,e,w,a=[alias], beat)
    s_time = [None] * len(S)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                w = W[j1 + k]
                s_time[i1 + k] = (w['t'], w['e'])
                disp.append(dict(t=w['t'], e=w['e'], w=S[i1 + k]['w'], a=[limpia(S[i1 + k]['w'])], beat=S[i1 + k]['beat']))
        elif op in ('replace', 'insert'):
            ws = W[j1:j2]
            ss = S[i1:i2]
            t0, t1 = ws[0]['t'], ws[-1]['e']
            # tiempos de los tokens del guion repartidos en el tramo
            for k in range(len(ss)):
                s_time[i1 + k] = (t0 + (t1 - t0) * k / len(ss), t0 + (t1 - t0) * (k + 1) / len(ss))
            usar_whisper = op == 'insert' or any(re.search(r'\d', w['w']) for w in ws) or abs(len(ws) - len(ss)) > 2
            if usar_whisper:
                for k, w in enumerate(ws):
                    # alias: tokens del guion que caen en este tramo
                    lo = int(k * len(ss) / len(ws)) if ss else 0
                    hi = max(lo + 1, int((k + 1) * len(ss) / len(ws))) if ss else 0
                    beat = ss[min(lo, len(ss) - 1)]['beat'] if ss else (disp[-1]['beat'] if disp else 0)
                    disp.append(dict(t=w['t'], e=w['e'], w=w['w'], a=[limpia(x['w']) for x in ss[lo:hi]] + [limpia(w['w'])], beat=beat))
            else:
                for k, s in enumerate(ss):
                    t, e = s_time[i1 + k]
                    disp.append(dict(t=t, e=e, w=s['w'], a=[limpia(s['w'])], beat=s['beat']))
        elif op == 'delete':
            # palabras del guion que no se dijeron: solo sirven de ancla
            prev = disp[-1]['e'] if disp else 0
            for k in range(i2 - i1):
                s_time[i1 + k] = (prev, prev)

    # inicio de cada beat = primera palabra del beat
    starts = []
    for bi in range(len(g['beats'])):
        idx = [i for i, s in enumerate(S) if s['beat'] == bi and s_time[i] is not None]
        starts.append(s_time[idx[0]][0] if idx else None)
    for bi in range(len(starts)):
        if starts[bi] is None:
            starts[bi] = starts[bi - 1] if bi else 0
    starts = [0.0] + [max(0.0, s - 0.12) for s in starts[1:]]

    src = os.path.join(ROOT, 'voces', gid + '.wav')
    with wave.open(src) as f:
        dur_audio = f.getnframes() / f.getframerate()
    total = round(dur_audio + 1.0, 3)
    os.makedirs(os.path.join(ROOT, 'public', gid), exist_ok=True)
    shutil.copy(src, os.path.join(ROOT, 'public', gid, 'voz.wav'))

    keys_por_beat = [{limpia(k) for k in b.get('keys', [])} for b in g['beats']]
    beats = []
    for bi, b in enumerate(g['beats']):
        fin = starts[bi + 1] if bi + 1 < len(starts) else total
        ws = [dict(t=round(d['t'], 3), e=round(d['e'], 3), w=d['w'], a=d['a'],
                   k=any(x in keys_por_beat[d['beat']] for x in d['a'])) for d in disp if d['beat'] == bi]
        beats.append(dict(scene=b['scene'], sfx=b.get('sfx', []), start=round(starts[bi], 3),
                          dur=round(fin - starts[bi], 3), text=b['text'], words=ws, escena=b.get('escena')))
    data = dict(id=gid, duration=total, beats=beats, estilo=g.get('estilo', {}))
    os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
    json.dump(data, open(os.path.join(ROOT, 'src', 'data', gid + '.json'), 'w'), ensure_ascii=False, indent=1)
    perdidas = sum(1 for op, i1, i2, *_ in sm.get_opcodes() if op == 'delete' for _ in range(i2 - i1))
    print(f'{gid}: {total:.1f}s, {len(beats)} escenas, {len(disp)} palabras en subtítulos, {perdidas} palabras del guion no dichas')


if __name__ == '__main__':
    for gid in sys.argv[1:]:
        main(gid)
