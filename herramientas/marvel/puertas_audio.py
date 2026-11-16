"""Voces (3 personajes), tiempos y mezcla del video de prueba 'Elegí la puerta'."""
import sys, os, json, wave, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from render import tts, read_wav, trim_silence, SR
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
V = {'doc': ('es-AR-TomasNeural', '-4%'), 'p1': ('es-UY-MateoNeural', '+22%'), 'p2': ('es-AR-ElenaNeural', '+16%')}
def clip(key, who, text):
    voice, rate = V[who]
    _, wav = tts(text, voice, rate, os.path.join(D, key))
    a, _ = trim_silence(read_wav(wav))
    return a
L = [  # (clave, quién, texto, pausa antes)
    ('h1', 'doc', '¿Qué paciente eliges?', .35),
    ('h2', 'doc', '¿El uno...', .15),
    ('h3', 'doc', '¿o el dos?', .2),
    ('p1', 'p1', '¡Ay! ¡Me quebré el brazo!', .3),
    ('p2', 'p2', 'Ay... me duele mucho la mandíbula.', .5),
    ('q1', 'doc', '¿Alguien puede llamar a un médico?', .9),
    ('q2', 'doc', 'Ah, no. Soy yo.', .55),
    ('f1', 'doc', 'Si elegiste el uno, tendrás que resolver lo siguiente...', .7),
]
t, lines, pcm = 0, [], []
for key, who, text, gap in L:
    a = clip(key, who, text)
    t += gap
    lines.append(dict(key=key, who=who, text=text, t0=round(t, 3), t1=round(t + len(a) / SR, 3)))
    pcm.append((t, a)); t += len(a) / SR
total = t + 1.4
tl = {l['key']: l for l in lines}
cd0 = tl['h3']['t1'] + .25; cd1 = max(cd0 + 5, tl['p2']['t1'] + .15)
# el diálogo del doctor arranca cuando termina el conteo
shift = max(0, cd1 + .5 - tl['q1']['t0'])
for i, l in enumerate(lines):
    if l['key'] in ('q1', 'q2', 'f1'):
        l['t0'] = round(l['t0'] + shift, 3); l['t1'] = round(l['t1'] + shift, 3); pcm[i] = (pcm[i][0] + shift, pcm[i][1])
total += shift
out = dict(total=round(total, 3), lines=lines, hl1=tl['h2']['t0'] + .1, hl2=tl['h3']['t0'] + .25, cd0=round(cd0, 3), cd1=round(cd1, 3))
json.dump(out, open(os.path.join(os.path.dirname(D), 'puertas_tl.json'), 'w'), ensure_ascii=False, indent=1)
# mezcla: voces + efectos
mix = np.zeros(int((total + .5) * SR), np.float32)
def put(at, a, g=1.0):
    i = int(at * SR); mix[i:i + len(a)] += (g * a)[:len(mix) - i]
def env(n, a, r): tt = np.arange(n) / SR; return np.minimum(1, tt / a) * np.exp(-tt / r)
rng = np.random.default_rng(3)
tick = lambda: .5 * np.sin(2 * np.pi * 1900 * np.arange(int(.05 * SR)) / SR) * env(int(.05 * SR), .001, .012) + .2 * rng.standard_normal(int(.05 * SR)) * env(int(.05 * SR), .0005, .004)
ding = lambda f=880: .28 * (np.sin(2 * np.pi * f * np.arange(SR) / SR) + .4 * np.sin(2 * np.pi * 2 * f * np.arange(SR) / SR)) * env(SR, .003, .22)
pop = lambda: .4 * np.sin(2 * np.pi * np.cumsum(500 + 1400 * np.linspace(0, 1, int(.09 * SR))) / SR) * env(int(.09 * SR), .002, .03)
boing = lambda: .3 * np.sin(2 * np.pi * np.cumsum(220 + 160 * np.sin(2 * np.pi * 9 * np.arange(int(.35 * SR)) / SR) * np.exp(-np.arange(int(.35 * SR)) / SR * 6)) / SR) * env(int(.35 * SR), .003, .15)
put(.05, pop(), .8)
put(out['hl1'], ding(988)); put(out['hl2'], ding(1175))
n = int(round(cd1 - cd0)); step = (cd1 - cd0) / 5
for k in range(5): put(cd0 + k * step, tick(), 1.2)
put(cd1, ding(660), 1.1)
put(tl['q2']['t0'] + .55, boing(), .9)
for at, a in pcm: put(at, a, 1.0)
mix /= max(1, np.abs(mix).max() / .95)
with wave.open(os.path.join(D, 'puertas_mix.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(json.dumps(out, ensure_ascii=False)[:900])
