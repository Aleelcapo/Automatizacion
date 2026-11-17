"""Parte 2 'Puerta 1: brazo quebrado' — voces TTS, tiempos y mezcla."""
import sys, os, json, wave, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from render import tts, read_wav, trim_silence, SR
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
V = {'doc': ('es-AR-TomasNeural', '-4%'), 'p1': ('es-AR-ElenaNeural', '+8%'), 'p2': ('es-UY-MateoNeural', '+5%')}
def clip(key, who, text):
    _, wav = tts(text, *V[who], os.path.join(D, 'e2_' + key)); return trim_silence(read_wav(wav))[0]
L = [
    ('d1', 'doc', 'Elegiste el uno. Brazo quebrado.', .4),
    ('p1', 'p1', '¡Doctor, ayúdeme, me duele muchísimo!', .3),
    ('d2', 'doc', 'Tranquila. A ver... ¿qué haces primero?', .3),
    ('oA', 'doc', 'A: le acomodas el hueso.', .35),
    ('oB', 'doc', 'B: le inmovilizas el brazo.', .25),
    ('oC', 'doc', 'C: le das agua para calmarla.', .25),
    ('p1b', 'p1', '¡Ay, ay, ay!', 1.6),
    ('r1', 'doc', 'La B.', 3.6),
    ('r2', 'doc', 'Nunca intentes acomodar un hueso: puedes dañar vasos y nervios.', .3),
    ('r3', 'doc', 'Se inmoviliza tal como está. Y nada de agua ni comida: quizás necesite cirugía.', .3),
    ('p2', 'p2', '¡Aaay... el pecho!', 1.1),
    ('f1', 'doc', 'Mientras tanto... el de la puerta dos se está infartando.', .35),
]
t, lines, pcm = 0, [], []
for key, who, text, gap in L:
    a = clip(key, who, text)
    if key == 'p1b': cd0 = t + .3; t = cd0 + 1.2 - gap
    if key == 'r1': cd1 = cd0 + 5; t = cd1 + .5 - gap
    t += gap
    lines.append(dict(key=key, who=who, text=text, t0=round(t, 3), t1=round(t + len(a) / SR, 3))); pcm.append((t, a)); t += len(a) / SR
T = {l['key']: l for l in lines}
alarm0 = T['r3']['t1'] + .35
out = dict(total=round(t + 1.2, 3), lines=lines, cd0=round(cd0, 3), cd1=round(cd1, 3), alarm=round(alarm0, 3))
json.dump(out, open(os.path.join(os.path.dirname(D), 'puertas2_tl.json'), 'w'), ensure_ascii=False, indent=1)
mix = np.zeros(int((out['total'] + .5) * SR), np.float32)
def put(at, a, g=1.0): i = int(at * SR); mix[i:i + len(a)] += (g * a)[:len(mix) - i]
def env(n, a, r): tt = np.arange(n) / SR; return np.minimum(1, tt / a) * np.exp(-tt / r)
rng = np.random.default_rng(3); N5 = int(.05 * SR)
tick = lambda: .5 * np.sin(2 * np.pi * 1900 * np.arange(N5) / SR) * env(N5, .001, .012) + .2 * rng.standard_normal(N5) * env(N5, .0005, .004)
ding = lambda f: .28 * (np.sin(2 * np.pi * f * np.arange(SR) / SR) + .4 * np.sin(2 * np.pi * 2 * f * np.arange(SR) / SR)) * env(SR, .003, .22)
n9 = int(.09 * SR); pop = lambda: .4 * np.sin(2 * np.pi * np.cumsum(500 + 1400 * np.linspace(0, 1, n9)) / SR) * env(n9, .002, .03)
def buzz(): n = int(.18 * SR); tt = np.arange(n) / SR; return .18 * np.sign(np.sin(2 * np.pi * 180 * tt)) * np.minimum(1, tt / .005) * np.minimum(1, (tt[-1] - tt) / .02)
def alarm(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; on = (np.floor(tt / .25) % 2 == 0)
    return .16 * np.sin(2 * np.pi * 960 * tt) * on * np.minimum(1, tt / .01)
for k in ('oA', 'oB', 'oC'): put(T[k]['t0'] - .05, pop(), .7)
for k in range(5): put(cd0 + k, tick(), 1.2)
put(cd1, ding(660), 1.0)
put(T['r1']['t0'], ding(1320), .8)
put(T['r2']['t0'] + .1, buzz(), .9); put(T['r3']['t0'] + 2.2, buzz(), .9)
put(alarm0, alarm(out['total'] - alarm0), .9)
for at, a in pcm: put(at, a / max(1e-3, np.abs(a).max()) * .85)
mix /= max(1, np.abs(mix).max() / .95)
with wave.open(os.path.join(D, 'puertas2_mix.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(json.dumps({k: v for k, v in out.items() if k != 'lines'}), [(l['key'], l['t0'], l['t1']) for l in lines])
