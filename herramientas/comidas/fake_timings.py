"""Tiempos estimados SOLO para previsualizar el montaje sin voz (nunca para el video final)."""
import sys, json, re
text = open(sys.argv[1], encoding='utf-8').read().strip()
t = 0.4; words = []
for pi, para in enumerate([p for p in text.split('\n\n') if p.strip()]):
    for tok in para.split():
        d = 0.12 + 0.055 * len(re.sub(r'\W', '', tok))
        words.append(dict(text=tok, start=round(t, 3), end=round(t + d, 3), para=pi))
        t += d + 0.04
        if tok[-1] in ',:': t += 0.18
        if tok[-1] in '.': t += 0.35
    t += 0.35
json.dump(dict(words=words, duration=round(t + 0.5, 2)), open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
print(len(words), round(t, 1))
