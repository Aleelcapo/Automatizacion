# Sonido de las pruebas de 10 s (ambiente + efectos suaves + colchón musical).
import numpy as np, wave, sys
SR = 48000
N = SR * 10
rng = np.random.default_rng(3)
t = np.arange(N) / SR

def lp(x, a):  # paso bajo de 1 polo
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc); y[i] = acc
    return y

def env(n, at, rel):
    e = np.ones(n); a = int(at * SR); r = int(rel * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e

def put(buf, x, at, g):
    i = int(at * SR); j = min(len(buf), i + len(x)); buf[i:j] += x[: j - i] * g

def pad(chords, dur_each, g=0.05):
    out = np.zeros(N)
    for k, ch in enumerate(chords):
        n = int(dur_each * SR); tt = np.arange(n) / SR
        s = sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) for f in ch) / len(ch)
        put(out, s * env(n, 0.6, 0.8), k * dur_each, g)
    return out

def whoosh(d=0.8):
    n = int(d * SR); x = rng.standard_normal(n)
    sweep = np.linspace(0.02, 0.25, n) ** 1.5
    y = np.empty(n); acc = 0.0
    for i in range(n):
        acc += sweep[i] * (x[i] - acc); y[i] = acc
    return y * np.sin(np.linspace(0, np.pi, n)) ** 2

def tone(f0, f1, d, harm=(1,), dec=6.0):
    n = int(d * SR); tt = np.arange(n) / SR
    f = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(ph * h) / h for h in harm)
    return s * np.exp(-tt * dec) * env(n, 0.005, 0.02)

which = sys.argv[1]
mix = np.zeros(N)
if which == 'barco':
    mar = lp(rng.standard_normal(N), 0.02)
    mar *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 4.5) ** 2
    mix += mar / np.abs(mar).max() * 0.12
    n = int(2.2 * SR); tt = np.arange(n) / SR
    bocina = sum(np.sin(2 * np.pi * f * tt) / (i + 1) for i, f in enumerate([92, 184, 276, 368]))
    put(mix, lp(bocina * env(n, 0.15, 0.7), 0.15), 0.5, 0.35)
    put(mix, whoosh(1.0), 4.6, 0.5)
    for i in range(4):
        put(mix, tone(180 + i * 40, 420 + i * 60, 0.45, (1, 2), 5), 7.4 + i * 0.15, 0.12)
    mix += pad([[110, 165, 220, 277], [98, 147, 196, 247], [110, 165, 220, 277], [123, 185, 247, 311]], 2.5, 0.05)
else:
    for k in np.arange(0.2, 10, 0.85):
        put(mix, tone(62, 48, 0.18, (1, 2), 22), k, 0.35)
        put(mix, tone(58, 44, 0.16, (1, 2), 24), k + 0.22, 0.22)
    n = int(0.5 * SR); z = rng.standard_normal(n) * (rng.random(n) > 0.85)
    put(mix, lp(z, 0.5) * env(n, 0.01, 0.3), 2.8, 0.25)
    put(mix, tone(900, 300, 0.5, (1, 3), 7), 2.8, 0.06)
    put(mix, whoosh(0.45), 7.15, 0.45)
    put(mix, whoosh(0.4), 8.88, 0.35)
    for h, g in ((7.55, 0.55), (9.25, 0.45)):
        put(mix, tone(520, 760, 0.12, (1, 2, 3), 18), h, g * 0.5)
        put(mix, lp(rng.standard_normal(int(0.03 * SR)), 0.4), h, g)
    mix += pad([[131, 196, 262, 330], [147, 220, 294, 349], [131, 196, 262, 330], [165, 247, 330, 392]], 2.5, 0.045)
mix = mix / max(1e-9, np.abs(mix).max()) * 0.6
st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok', which)
