"""Sonidos para la prueba "Expediente militar": máquina de escribir, papel, sellos, olas, cañonazos. Uso: sfx_expediente.py <salida.wav>"""
import sys, wave, numpy as np
SR = 48000; DUR = 30.0
mix = np.zeros(int(SR * DUR)); rng = np.random.default_rng(9)
def add(t, x, g=1.0):
    i = int(t * SR); n = min(len(x), len(mix) - i)
    if n > 0: mix[i:i + n] += x[:n] * g
lp = lambda x, k: np.convolve(x, np.ones(k) / k, 'same')
def key():
    n = int(SR * 0.05); t = np.arange(n) / SR
    return rng.normal(0, 1, n) * np.exp(-t * 160) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 220) * 0.4
def paper(d=0.35):
    n = int(SR * d); x = rng.normal(0, 1, n); x = x - lp(x, 8)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 1.5 * 0.6
def thump(f0=80):
    n = int(SR * 0.4); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f0 + 60 * np.exp(-t * 25)) * t) * np.exp(-t * 14) + rng.normal(0, 1, n) * np.exp(-t * 90) * 0.5
def boom():
    n = int(SR * 1.3); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (42 + 70 * np.exp(-t * 10)) * t) * np.exp(-t * 3.2) + rng.normal(0, 1, n) * np.exp(-t * 28) * 0.6 + lp(rng.normal(0, 1, n), 140) * np.exp(-t * 2) * 6
def tick():
    n = int(SR * 0.03); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 3000 * t) * np.exp(-t * 200)
def typing(t0, chars, cps=26):
    for c in range(chars): add(t0 + 0.15 + c / cps, key(), 0.18 + 0.05 * rng.random())
# guion de eventos (mismos tiempos que expediente.py)
for tt, ch in ((0.3, 34), (4.9, 24), (8.2, 15), (10.2, 44), (15.4, 36), (20.5, 20), (25.3, 26), (28.7, 22)): typing(tt, ch)
for tt in (4.6, 10.0, 15.2, 20.4, 25.2, 28.6): add(tt - 0.05, paper(), 0.55)
for i in range(18): add(0.6 + i * 0.18, tick(), 0.25)
for tt in (3.3, 18.2, 24.0, 27.7, 28.1, 29.8): add(tt + 0.15, thump(), 0.7)       # sellos
add(12.4, paper(0.5), 0.6)                                                         # telegrama que entra
add(7.6, thump(160), 0.35)                                                         # pin que cae
for j in range(5): add(20.7 + j * 0.75, boom(), 0.85)                            # cañonazos
waves = lp(rng.normal(0, 1, int(SR * 5.2)), 300); waves *= (1 + 0.5 * np.sin(np.arange(len(waves)) / SR * 2 * np.pi * 0.4))
add(15.2, waves / np.abs(waves).max(), 0.18)
for i in range(30): add(25.8 + i * 0.06, key() * 0.6, 0.12)                       # lápiz contando
amb = lp(rng.normal(0, 1, len(mix)), 400); mix += amb / np.abs(amb).max() * 0.02
mix = mix / np.abs(mix).max() * 0.8; f = int(SR * 0.6); mix[-f:] *= np.linspace(1, 0, f)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('sfx ok')
