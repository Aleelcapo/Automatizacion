"""Efectos suaves sintetizados para el video de los 3 T. rex: transiciones, contadores, sellos y tarjetas."""
import sys, json, wave, numpy as np
SR = 48000
T = json.load(open(sys.argv[1])); dur = float(sys.argv[2]); out = sys.argv[3]
mix = np.zeros(int(SR * (dur + 1)))
rng = np.random.default_rng(1)
def add(t, x, g=1.0):
    i = int(t * SR); n = min(len(x), len(mix) - i)
    if n > 0 and i >= 0: mix[i:i + n] += x[:n] * g
def whoosh(d=0.45):
    n = int(SR * d); x = rng.normal(0, 1, n)
    f = np.cumsum(x); f -= np.convolve(f, np.ones(200) / 200, 'same')            # ruido filtrado
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return f / (np.abs(f).max() + 1e-9) * env
def tick():
    n = int(SR * 0.025); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 260)
def thump(f0=70, d=0.5):
    n = int(SR * d); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f0 + 50 * np.exp(-t * 18)) * t) * np.exp(-t * 7) + rng.normal(0, 0.15, n) * np.exp(-t * 40)
def pop():
    n = int(SR * 0.08); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (900 - 3000 * t) * t) * np.exp(-t * 55)
for k in ('sue', 'stan', 'diferencia', 'trinity', 'asi', 'final'):
    add(T[k] - 0.15, whoosh(), 0.35)
for c0, cd in ((T['vendio1'], 1.1), (T['vendio2'], 1.0), (T['apenas'], 0.8)):
    for j in range(14):
        add(c0 + cd * (1 - (1 - j / 14) ** 2), tick(), 0.25)
    add(c0 + cd, thump(), 0.6)
add(T['coleccionistas'] + 0.4, thump(90, 0.35), 0.5)
for k in ('casi', '70', '1997', '2020', 'cuantos', 'si_son', 'cuando', 'momento', 'armaron'):
    add(T[k], pop(), 0.3)
mix = mix / (np.abs(mix).max() + 1e-9) * 0.5
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('sfx ok')
