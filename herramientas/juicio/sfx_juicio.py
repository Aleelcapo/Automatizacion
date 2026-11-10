"""Sonidos sintetizados para la prueba de 10 s de la sala de juicio.

Uso: sfx_juicio.py <salida.wav> [duración]
"""
import sys, wave, numpy as np

SR = 48000
out = sys.argv[1]; dur = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
mix = np.zeros(int(SR * dur))
rng = np.random.default_rng(7)

def add(t, x, g=1.0):
    i = int(t * SR); n = min(len(x), len(mix) - i)
    if n > 0: mix[i:i + n] += x[:n] * g

def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, 'same')

def whoosh(d=0.4):
    n = int(SR * d); x = rng.normal(0, 1, n)
    x = lowpass(x, 30) - lowpass(x, 400)
    return x / (np.abs(x).max() + 1e-9) * np.sin(np.linspace(0, np.pi, n)) ** 2

def gavel():
    """golpe de madera: chasquido seco + cuerpo grave corto"""
    n = int(SR * 0.45); t = np.arange(n) / SR
    click = rng.normal(0, 1, n) * np.exp(-t * 180)
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 28) + 0.6 * np.sin(2 * np.pi * 95 * t) * np.exp(-t * 16)
    room = lowpass(rng.normal(0, 1, n), 60) * np.exp(-t * 9) * 0.5
    return click * 0.9 + body + room

def pop():
    n = int(SR * 0.12); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (700 + 900 * t) * t) * np.exp(-t * 35)

def murmur(d, rise=0.15):
    """murmullo / exclamación del público: ruido filtrado en la banda de la voz con envolvente"""
    n = int(SR * d); x = rng.normal(0, 1, n)
    x = lowpass(x, 12) - lowpass(x, 90)
    env = np.minimum(1, np.arange(n) / (SR * rise)) * np.exp(-np.arange(n) / (SR * d * 0.45))
    am = 1 + 0.35 * np.sin(2 * np.pi * 5.5 * np.arange(n) / SR)
    return x / (np.abs(x).max() + 1e-9) * env * am

# ambiente de sala (muy bajo) + eventos
amb = lowpass(rng.normal(0, 1, len(mix)), 200); mix += amb / np.abs(amb).max() * 0.03
for t in (3.0, 5.5, 8.0): add(t - 0.18, whoosh(), 0.35)
for t in (3.8, 4.45): add(t - 0.01, gavel(), 0.9)
add(5.88, whoosh(0.3), 0.3)
add(6.6, pop(), 0.35)
add(6.7, murmur(1.4), 0.45)
add(8.4, murmur(1.5, 0.25), 0.5)
add(0.25, pop(), 0.2); add(3.75, pop(), 0.2); add(8.45, pop(), 0.2)

mix = mix / (np.abs(mix).max() + 1e-9) * 0.7
fade = int(SR * 0.4); mix[-fade:] *= np.linspace(1, 0, fade)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('sfx ok')
