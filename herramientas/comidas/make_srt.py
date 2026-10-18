"""SRT a partir de los tiempos alineados: una palabra por subtítulo (igual que en pantalla) y otro por frases.

Uso: make_srt.py <timings.json> <palabras.srt> <frases.srt>
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from render import prepare_words

def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

d = json.load(open(sys.argv[1]))
words = prepare_words(d['words'])
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    for i, w in enumerate(words, 1):
        f.write(f"{i}\n{ts(max(0, w['start'] - 0.02))} --> {ts(w['show_end'])}\n{w['shown']}\n\n")
# frases: se corta en puntuación fuerte o cada ~7 palabras
cues, cur = [], []
for w in d['words']:
    cur.append(w)
    if w['text'][-1] in '.:,' and len(cur) >= 3 or len(cur) >= 8 or w['text'][-1] in '.:':
        cues.append(cur); cur = []
if cur: cues.append(cur)
with open(sys.argv[3], 'w', encoding='utf-8') as f:
    for i, c in enumerate(cues, 1):
        end = c[-1]['end'] + 0.15
        if i < len(cues): end = min(end, cues[i][0]['start'] - 0.01)
        f.write(f"{i}\n{ts(c[0]['start'])} --> {ts(end)}\n{' '.join(w['text'] for w in c)}\n\n")
print(len(words), 'palabras;', len(cues), 'frases')
