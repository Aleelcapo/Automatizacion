"""Exporta subtítulos .srt y guion .txt desde src/data/<id>.json. Uso: python3 herramientas/srt.py atun ../entregas/Atun_piloto_motion"""
import sys, json
gid, base = sys.argv[1:3]
d = json.load(open(f'src/data/{gid}.json'))
ts = lambda s: f'{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round(s % 1 * 1000)) % 1000:03d}'
words = [w for b in d['beats'] for w in b['words']]
lines, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    if w['w'][-1] in '.?…,:!' and len(cur) >= 3 or len(cur) >= 7 or not nxt or nxt['t'] - w['e'] > 0.35:
        lines.append(cur); cur = []
with open(base + '.srt', 'w') as f:
    for i, l in enumerate(lines, 1):
        fin = l[-1]['e'] + 0.15
        if i < len(lines):
            fin = min(fin, lines[i][0]['t'] - 0.02)
        f.write(f"{i}\n{ts(l[0]['t'])} --> {ts(fin)}\n{' '.join(w['w'] for w in l)}\n\n")
with open(base + '.txt', 'w') as f:
    f.write('\n\n'.join(b['text'] for b in d['beats']) + '\n')
print(len(lines), 'subtítulos')
