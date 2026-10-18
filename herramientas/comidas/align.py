"""Alinea el guion con la grabación real: tiempos por palabra con faster-whisper, ortografía del guion.

Uso: align.py <voz.wav> <guion.txt> <salida.json>
"""
import sys, json, re, difflib, subprocess, unicodedata, numpy as np
from faster_whisper import WhisperModel

audio_path, script_path, out_path = sys.argv[1:4]

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)

script = open(script_path, encoding='utf-8').read().strip()
tokens = []
for pi, para in enumerate([p for p in script.split('\n\n') if p.strip()]):
    for tok in para.split():
        tokens.append(dict(text=tok, para=pi))

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio_path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
duration = len(audio) / 16000
model = WhisperModel(sys.argv[4] if len(sys.argv) > 4 else 'medium', device='cpu', compute_type='int8', cpu_threads=4)
prompt = ' '.join(t['text'] for t in tokens)
segs, info = model.transcribe(audio, language='es', word_timestamps=True, initial_prompt='TasteAtlas, medialunas, prosciutto di Parma, phirni, shabu-shabu.', vad_filter=False)
hyp = [dict(text=w.word.strip(), start=w.start, end=w.end, p=w.probability) for s in segs for w in s.words]

# "shabu-shabu" o "TasteAtlas" pueden partirse en varias palabras: se alinea por caracteres normalizados
a = [norm(t['text']) for t in tokens]; b = [norm(h['text']) for h in hyp]
sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal':
        for k in range(i2 - i1):
            tokens[i1 + k]['start'] = hyp[j1 + k]['start']; tokens[i1 + k]['end'] = hyp[j1 + k]['end']
    elif j2 > j1:
        # bloque distinto: reparte el intervalo reconocido proporcionalmente a la longitud de cada palabra
        t0, t1 = hyp[j1]['start'], hyp[j2 - 1]['end']
        lens = np.array([max(1, len(a[i])) for i in range(i1, i2)], float)
        cum = np.concatenate([[0], np.cumsum(lens)]) / lens.sum()
        for k, i in enumerate(range(i1, i2)):
            tokens[i]['start'] = t0 + (t1 - t0) * cum[k]; tokens[i]['end'] = t0 + (t1 - t0) * cum[k + 1]
            tokens[i]['interp'] = True
# palabras del guion sin audio reconocido: interpola entre vecinas
for i, t in enumerate(tokens):
    if 'start' not in t:
        prev = next((tokens[j]['end'] for j in range(i - 1, -1, -1) if 'end' in tokens[j]), 0)
        nxt = next((tokens[j]['start'] for j in range(i + 1, len(tokens)) if 'start' in tokens[j]), prev + 0.3)
        t['start'], t['end'], t['interp'] = prev, max(prev + 0.05, nxt), True
for t in tokens:
    t['start'] = round(float(t['start']), 3); t['end'] = round(float(t['end']), 3)
json.dump(dict(words=tokens, duration=round(duration, 3), whisper=' '.join(h['text'] for h in hyp)),
          open(out_path, 'w'), ensure_ascii=False, indent=0)
print('palabras', len(tokens), 'interpoladas', sum(1 for t in tokens if t.get('interp')), 'duración', round(duration, 2))
print('whisper:', ' '.join(h['text'] for h in hyp))
