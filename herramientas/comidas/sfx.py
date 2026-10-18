"""Efectos sintetizados (sin música): barridos suaves en los vuelos e impactos suaves al aparecer banderas y tarjetas.

Uso: sfx.py <timings.json> <salida.wav>
"""
import sys, os, json, wave, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('WORK', '/home/user/Automatizacion/work')
from render import load_tl

SR = 48000
rng = np.random.default_rng(7)

def lowpass(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return y

def whoosh(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # ruido filtrado cuyo brillo sube y baja con el desplazamiento de cámara
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    a = 0.02 + 0.10 * env
    y = np.empty(n); acc = 0.0; acc2 = 0.0
    for i in range(n):
        acc += a[i] * (noise[i] - acc); acc2 += a[i] * (acc - acc2); y[i] = acc2
    y = y / (np.abs(y).max() + 1e-9) * env
    return y

def impact(dur=0.7, f0=70.0):
    n = int(dur * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (f0 * t + 18 * (1 - np.exp(-t * 18)) / 18)) * np.exp(-t * 7)
    click = lowpass(rng.standard_normal(n), 0.15) * np.exp(-t * 60)
    y = body * 0.9 + click * 0.5
    return y / np.abs(y).max()

def pop(dur=0.25):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (420 * t - 300 * t * t)) * np.exp(-t * 26)
    return y / np.abs(y).max()

if __name__ == '__main__':
    tl = load_tl(sys.argv[1])
    total = int((tl.duration + 1) * SR)
    mix = np.zeros(total)
    def add(sig, t, gain_db):
        i = int(t * SR); g = 10 ** (gain_db / 20)
        j = min(total, i + len(sig)); mix[i:j] += sig[:j - i] * g
    for s in tl.segs:
        add(whoosh(s['fly1'] - s['fly0'] + 0.2), s['fly0'], -27)
        add(impact(), s['fly1'] + 0.12, -25)
        add(pop(), s['card_in'], -31)
    # entrada inicial suave
    add(whoosh(1.6), 0.0, -31)
    mix = np.clip(mix, -1, 1)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print('sfx', round(tl.duration, 2), 'pico dB', round(20 * np.log10(np.abs(mix).max() + 1e-9), 1))
