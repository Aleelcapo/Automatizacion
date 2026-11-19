"""Sonidos del video de prueba de Zanzíbar: tic del reloj, transiciones, cañonazos y cierre. Uso: sfx_zanzibar.py <salida.wav>"""
import sys, wave, numpy as np
SR = 48000; DUR = 28.0
mix = np.zeros(int(SR * DUR)); rng = np.random.default_rng(5)
def add(t, x, g=1.0):
    i = int(t * SR); n = min(len(x), len(mix) - i)
    if n > 0: mix[i:i + n] += x[:n] * g
lp = lambda x, k: np.convolve(x, np.ones(k) / k, 'same')
def tick():
    n = int(SR * 0.04); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3200 * t) * 0.6 + rng.normal(0, 0.4, n)) * np.exp(-t * 180)
def whoosh(d=0.45):
    n = int(SR * d); x = rng.normal(0, 1, n); x = lp(x, 25) - lp(x, 300)
    return x / np.abs(x).max() * np.sin(np.linspace(0, np.pi, n)) ** 2
def boom():
    n = int(SR * 1.4); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 12)) * t) * np.exp(-t * 3.5)
    crack = rng.normal(0, 1, n) * np.exp(-t * 30)
    rumble = lp(rng.normal(0, 1, n), 120) * np.exp(-t * 2.2) * 6
    return body + 0.5 * crack + rumble
def pop():
    n = int(SR * 0.1); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (650 + 1200 * t) * t) * np.exp(-t * 40)
def bell():
    n = int(SR * 2.0); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * a for f, a in ((660, 1), (1320, 0.4), (1980, 0.2))) * np.exp(-t * 2.2)
for i in range(16): add(0.6 + i * 0.22, tick(), 0.35)                 # reloj corriendo
for tt in (4.2, 9.2, 14.2, 19.2, 23.4): add(tt - 0.2, whoosh(), 0.35)
add(11.8, pop(), 0.4); add(15.0, pop(), 0.3); add(15.4, pop(), 0.3); add(15.8, boom()[:SR // 2], 0.25)
for j in range(4): add(19.4 + j * 0.9, boom(), 0.8)                   # cañonazos sincronizados con los fogonazos
add(21.9, bell(), 0.3)
for i in range(10): add(23.8 + i * 0.16, tick(), 0.2)                 # puntos que aparecen
add(25.8, pop(), 0.45)
amb = lp(rng.normal(0, 1, len(mix)), 300); mix += amb / np.abs(amb).max() * 0.02
mix = mix / np.abs(mix).max() * 0.75; f = int(SR * 0.5); mix[-f:] *= np.linspace(1, 0, f)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('sfx ok')
