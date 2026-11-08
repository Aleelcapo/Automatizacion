"""Genera la voz en off de un guion y la línea de tiempo palabra por palabra.

Uso: python3 herramientas/voz.py guiones/atun.json
Salida: public/<id>/voz.wav y src/data/<id>.json (beats con inicio, duración y palabras).
"""
import sys, os, json, asyncio, subprocess, wave
import numpy as np
import edge_tts

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


async def _tts(text, voice, rate, mp3):
    com = edge_tts.Communicate(text, voice, rate=rate, proxy=os.environ.get('HTTPS_PROXY'),
                               boundary='WordBoundary')
    words = []
    with open(mp3, 'wb') as fh:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                fh.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append([ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']])
    return words


def read_wav(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def tts(text, voice, rate, base):
    js = base + '.json'
    key = [text, voice, rate]
    if os.path.exists(js) and json.load(open(js))['key'] == key:
        return json.load(open(js))['words'], read_wav(base + '.wav')
    for _ in range(5):
        try:
            words = asyncio.run(_tts(text, voice, rate, base + '.mp3'))
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', base + '.mp3', '-ac', '1', '-ar', str(SR),
                            base + '.wav'], check=True)
            if len(words) >= 0.6 * len(text.split()):
                break
        except Exception as e:  # red inestable: reintentar
            print('reintento', e)
    else:
        raise SystemExit('TTS falló: ' + text[:40])
    json.dump(dict(key=key, words=words), open(js, 'w'))
    return words, read_wav(base + '.wav')


def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx):
        return a, 0.0
    s = max(0, idx[0] - int(0.02 * SR))
    e = min(len(a), idx[-1] + int(0.06 * SR))
    return a[s:e], s / SR


def main(path):
    g = json.load(open(path))
    gid = g['id']
    cache = os.path.join(ROOT, '.cache', gid)
    os.makedirs(cache, exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'public', gid), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)

    lead = 0.4  # silencio inicial
    t = lead
    chunks = [np.zeros(int(lead * SR), np.float32)]
    beats = []
    for i, b in enumerate(g['beats']):
        words, audio = tts(b['text'], g['voice'], g['rate'], os.path.join(cache, f'b{i:02d}'))
        audio, off = trim(audio)
        dur = len(audio) / SR
        strip = lambda x: x.lower().strip('¿?¡!,.…:;"')
        keys = {strip(k) for k in b.get('keys', [])}
        # recuperar la puntuación del texto original para los subtítulos
        toks, j = b['text'].split(), 0
        ws = []
        for s, e, w in words:
            shown = w
            for jj in range(j, min(j + 4, len(toks))):
                if strip(toks[jj]) == strip(w):
                    shown, j = toks[jj], jj + 1
                    break
            ws.append(dict(t=round(t + s - off, 3), e=round(t + e - off, 3), w=shown, k=strip(w) in keys))
        gap = b.get('gap', g['gap'])
        beats.append(dict(scene=b['scene'], sfx=b.get('sfx', []), start=round(t, 3), dur=round(dur + gap, 3), text=b['text'], words=ws))
        chunks += [audio, np.zeros(int(gap * SR), np.float32)]
        t += dur + gap
    tail = 1.2
    chunks.append(np.zeros(int(tail * SR), np.float32))
    beats[-1]['dur'] = round(beats[-1]['dur'] + tail, 3)
    full = np.concatenate(chunks)
    out = os.path.join(ROOT, 'public', gid, 'voz.wav')
    with wave.open(out, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
    data = dict(id=gid, duration=round(len(full) / SR, 3), beats=beats)
    json.dump(data, open(os.path.join(ROOT, 'src', 'data', gid + '.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{gid}: {data["duration"]:.1f}s, {len(beats)} beats')
    for b in beats:
        print(f'  {b["start"]:6.2f} +{b["dur"]:5.2f}  {b["scene"]}')


if __name__ == '__main__':
    main(sys.argv[1])
