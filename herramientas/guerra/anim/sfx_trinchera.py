"""Sonido del gancho de las trincheras: tiroteo, artillería lejana, silencio con viento, "Noche de paz" tarareada
(melodía de 1818, dominio público), aplausos y patadas a la pelota. Uso: sfx_trinchera.py <salida.wav>"""
import sys, wave, numpy as np
SR = 48000; DUR = 21.0
mix = np.zeros(int(SR * DUR)); rng = np.random.default_rng(14)
def add(t, x, g=1.0):
    i = int(t * SR); n = min(len(x), len(mix) - i)
    if n > 0 and i >= 0: mix[i:i + n] += x[:n] * g
lp = lambda x, k: np.convolve(x, np.ones(k) / k, 'same')
def shot():
    n = int(SR * 0.5); t = np.arange(n) / SR
    return rng.normal(0, 1, n) * np.exp(-t * 35) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 18) * 0.8
def boom():
    n = int(SR * 2.0); t = np.arange(n) / SR
    return lp(rng.normal(0, 1, n), 200) * np.exp(-t * 1.8) * 9 + np.sin(2 * np.pi * (38 + 30 * np.exp(-t * 5)) * t) * np.exp(-t * 2.5)
def hum(f, d):
    n = int(SR * d); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.12)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    return (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * env
def kick():
    n = int(SR * 0.15); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (140 + 200 * np.exp(-t * 60)) * t) * np.exp(-t * 30)
def cheer(d):
    n = int(SR * d); x = rng.normal(0, 1, n); x = lp(x, 10) - lp(x, 80)
    am = 1 + 0.4 * np.sin(np.arange(n) / SR * 2 * np.pi * 3.1)
    return x / np.abs(x).max() * am * np.minimum(1, np.arange(n) / (SR * 0.4)) * np.exp(-np.arange(n) / (SR * d * 0.6))
# tiroteo (mismos tiempos que trinchera.ts: 26 disparos desde 0,3 s cada 0,27 s)
r = lambda s: (np.sin(s * 127.1) * 43758.5453) % 1
for i in range(26):
    t = 0.3 + i * 0.27 + r(i) * 0.1
    if t < 6.9: add(t, shot(), 0.55 + 0.25 * rng.random())
for t in (1.2, 3.0, 4.6, 6.0): add(t, boom(), 0.5)
# silencio: viento suave mientras nieva
wind = lp(rng.normal(0, 1, int(SR * 14)), 600); wind *= 1 + 0.6 * np.sin(np.arange(len(wind)) / SR * 2 * np.pi * 0.15)
add(6.9, wind / np.abs(wind).max(), 0.12)
# "Noche de paz" (Gruber, 1818): primera frase, tarareada desde el arbolito
G4, A4, E4, D5, B4, C5 = 392.0, 440.0, 329.6, 587.3, 493.9, 523.3
mel = [(G4, .75), (A4, .25), (G4, .5), (E4, 1.5), (G4, .75), (A4, .25), (G4, .5), (E4, 1.5), (D5, 1.0), (D5, .5), (B4, 1.5), (C5, 1.0), (C5, .5), (G4, 1.5)]
t = 7.2; beat = 0.5
for f, d in mel:
    add(t, hum(f, d * beat * 0.98), 0.32); add(t, hum(f / 2, d * beat * 0.98), 0.12); t += d * beat
add(15.0, cheer(5.5), 0.35)
for k in range(9): add(14.7 + k * 0.65, kick(), 0.5)
mix = mix / np.abs(mix).max() * 0.8; f = int(SR * 0.8); mix[-f:] *= np.linspace(1, 0, f)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('sfx ok')
