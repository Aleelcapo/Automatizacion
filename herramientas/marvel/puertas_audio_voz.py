"""Versión con las voces grabadas por el usuario (ElevenLabs), un archivo por frase."""
import os, json, wave, subprocess, numpy as np
SR = 48000
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
VZ = os.path.join(D, 'voces')
def load(name, a=None, b=None):
    wav = os.path.join(VZ, name + '_48k.wav')
    if not os.path.exists(wav): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(VZ, name + '.mp3'), '-ac', '1', '-ar', str(SR), wav], check=True)
    w = wave.open(wav); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    x = x[int((a or 0) * SR): int(b * SR) if b else None]
    idx = np.where(np.abs(x) > .006)[0]; s = max(0, idx[0] - int(.02 * SR)); e = min(len(x), idx[-1] + int(.06 * SR))
    return x[s:e], s / SR
hook, hs = load('house_1')
p1, _ = load('paciente2')          # voz de mujer: "Ay, me quebré el brazo" -> puerta 1
p2, _ = load('paciente1')          # voz de hombre: "Ay, me duele mucho la mandíbula" -> puerta 2
q1, _ = load('house_1_1', 0, 1.56); q2, q2s = load('house_1_1', 1.56)
f1, _ = load('house_1_2')
seq = [('h1', 'doc', hook, .3), ('p1', 'p1', p1, .35), ('p2', 'p2', p2, .35), ('q1', 'doc', q1, .6), ('q2', 'doc', q2, .45), ('f1', 'doc', f1, .7)]
t, lines, pcm = 0, [], []
for key, who, a, gap in seq:
    t += gap
    if key == 'p1': cd0 = t - .1
    if key == 'q1': cd1 = max(cd0 + 5, t - .5); t = max(t, cd1 + .5)
    lines.append(dict(key=key, who=who, t0=round(t, 3), t1=round(t + len(a) / SR, 3))); pcm.append((t, a)); t += len(a) / SR
L = {l['key']: l for l in lines}
h0 = L['h1']['t0'] - hs
out = dict(total=round(t + 1.3, 3), lines=lines, hl1=round(h0 + 1.40, 3), hl2=round(h0 + 2.14, 3), cd0=round(cd0, 3), cd1=round(cd1, 3))
# el JS usa h2/h3 solo vía hl1/hl2; p1/p2 por 'who'
json.dump(out, open(os.path.join(os.path.dirname(D), 'puertas_tl.json'), 'w'), indent=1)
mix = np.zeros(int((out['total'] + .5) * SR), np.float32)
def put(at, a, g=1.0): i = int(at * SR); mix[i:i + len(a)] += (g * a)[:len(mix) - i]
def env(n, a, r): tt = np.arange(n) / SR; return np.minimum(1, tt / a) * np.exp(-tt / r)
rng = np.random.default_rng(3); N5 = int(.05 * SR)
tick = lambda: .5 * np.sin(2 * np.pi * 1900 * np.arange(N5) / SR) * env(N5, .001, .012) + .2 * rng.standard_normal(N5) * env(N5, .0005, .004)
ding = lambda f: .28 * (np.sin(2 * np.pi * f * np.arange(SR) / SR) + .4 * np.sin(2 * np.pi * 2 * f * np.arange(SR) / SR)) * env(SR, .003, .22)
n9 = int(.09 * SR); pop = lambda: .4 * np.sin(2 * np.pi * np.cumsum(500 + 1400 * np.linspace(0, 1, n9)) / SR) * env(n9, .002, .03)
n35 = int(.35 * SR); tt = np.arange(n35) / SR; boing = lambda: .3 * np.sin(2 * np.pi * np.cumsum(220 + 160 * np.sin(2 * np.pi * 9 * tt) * np.exp(-tt * 6)) / SR) * env(n35, .003, .15)
put(.05, pop(), .8); put(out['hl1'], ding(988), .7); put(out['hl2'], ding(1175), .7)
step = (cd1 - cd0) / 5
for k in range(5): put(cd0 + k * step, tick(), 1.2)
put(cd1, ding(660), 1.0)
put(L['q2']['t1'] - .15, boing(), .8)
for at, a in pcm: put(at, a / max(1e-3, np.abs(a).max()) * .85)
mix /= max(1, np.abs(mix).max() / .95)
with wave.open(os.path.join(D, 'puertas_mix.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(json.dumps(out))
