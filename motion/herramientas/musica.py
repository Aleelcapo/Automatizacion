"""Sintetiza la música de fondo y los efectos de sonido de un video.

Uso: python3 herramientas/musica.py atun
Lee src/data/<id>.json y public/<id>/voz.wav; escribe public/<id>/musica.wav
(música con ducking bajo la voz + whoosh en cada escena + efectos en palabras clave).
Todo es sintetizado: sin licencias ni descargas.
"""
import sys, os, json, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)


def read_wav(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def write_wav(path, a):
    a = np.clip(a, -1, 1)
    with wave.open(path, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((a * 32767).astype(np.int16).T.copy().tobytes() if a.ndim == 2 else
                      (np.repeat(a[:, None], 2, 1) * 32767).astype(np.int16).tobytes())


def t_(d):
    return np.arange(int(d * SR)) / SR


def lowpass(x, cutoff):
    # filtro de un polo, cutoff puede ser array (barrido)
    a = np.exp(-2 * np.pi * np.asarray(cutoff) / SR) * np.ones(len(x))
    y = np.zeros_like(x); prev = 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev
        y[i] = prev
    return y


def mix(L, R, s, i, gl, gr=None):
    gr = gl if gr is None else gr
    n = len(L)
    if i >= n:
        return
    e = min(n, i + len(s))
    L[i:e] += gl * s[:e - i]; R[i:e] += gr * s[:e - i]


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def note(f, d, kind='saw'):
    t = t_(d)
    if kind == 'sine':
        return np.sin(2 * np.pi * f * t)
    if kind == 'tri':
        return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    return 2 * ((f * t) % 1) - 1


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- música ----------
def music(dur, bpm=100):
    beat = 60 / bpm
    n = int(dur * SR)
    L = np.zeros(n); R = np.zeros(n)
    # Am - F - C - G (cada acorde 1 compás de 4 tiempos)
    prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bass = [45, 41, 48, 43]
    bar = 4 * beat
    nb = int(dur / bar) + 1
    for b in range(nb):
        t0 = b * bar
        ch = prog[b % 4]
        i0 = int(t0 * SR)
        # pad: sierras desafinadas filtradas
        pad = sum(note(mtof(m) * d, bar) for m in ch for d in (0.996, 1.004)) / 6
        pad = lowpass(pad, 900) * np.minimum(1, t_(bar) / 0.4) * np.minimum(1, (bar - t_(bar)) / 0.3)
        mix(L, R, pad, i0, 0.10)
        # bajo
        for k in range(4):
            tb = t0 + k * beat
            s = note(mtof(bass[b % 4]), beat * 0.9, 'tri') * env(int(beat * 0.9 * SR), 0.01, 0.35)
            mix(L, R, s, int(tb * SR), 0.16)
        # arpegio en corcheas
        arp = ch + [ch[0] + 12, ch[1] + 12, ch[2], ch[1] + 12, ch[0] + 12]
        for k in range(8):
            tb = t0 + k * beat / 2
            m = arp[k % len(arp)] + 12
            s = (note(mtof(m), 0.3, 'tri') * 0.7 + note(mtof(m) * 2, 0.3, 'sine') * 0.3) * env(int(0.3 * SR), 0.003, 0.09)
            pan = 0.5 + 0.35 * np.sin(k)
            mix(L, R, s, int(tb * SR), 0.07 * (1 - pan), 0.07 * pan)
        # bombo suave y hi-hat
        for k in range(4):
            tb = t0 + k * beat
            kd = 0.25
            tk = t_(kd)
            kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 12)
            mix(L, R, kick, int(tb * SR), 0.22)
            hh = rng.standard_normal(int(0.05 * SR)); hh = (hh - lowpass(hh, 7000)) * env(len(hh), 0.001, 0.015)
            mix(L, R, hh, int((tb + beat / 2) * SR), 0.05)
    return np.stack([L, R])


# ---------- efectos ----------
def whoosh(d=0.45):
    x = rng.standard_normal(int(d * SR))
    t = t_(d)
    cut = 300 + 5000 * np.sin(np.pi * t / d) ** 2
    y = lowpass(x, cut) * np.sin(np.pi * t / d) ** 2
    return 0.35 * y / (np.abs(y).max() + 1e-9)


def coin():
    d = 0.7; t = t_(d)
    y = 0
    for f, a in ((1975, 1), (2637, 0.8), (3951, 0.4)):
        y = y + a * np.sin(2 * np.pi * f * t)
    y2 = np.sin(2 * np.pi * 2637 * t) * (t > 0.07)
    y = (y * np.exp(-t * 9) + 0.8 * y2 * np.exp(-np.maximum(0, t - 0.07) * 7)) / 3
    return 0.45 * y


def pop():
    d = 0.12; t = t_(d)
    y = np.sin(2 * np.pi * (300 + 900 * t / d) * t) * np.exp(-t * 40)
    return 0.4 * y


def thud():
    d = 0.5; t = t_(d)
    y = np.sin(2 * np.pi * (40 + 80 * np.exp(-t * 20)) * t) * np.exp(-t * 8)
    return 0.7 * y


def splash():
    d = 0.8; t = t_(d)
    x = rng.standard_normal(len(t))
    y = lowpass(x, 2500 * np.exp(-t * 2) + 400) * np.exp(-t * 5)
    return 0.6 * y / (np.abs(y).max() + 1e-9)


def thunder():
    d = 2.2; t = t_(d)
    x = rng.standard_normal(len(t))
    y = lowpass(x, 180 + 1500 * np.exp(-t * 6)) * (np.minimum(1, t / 0.02) * np.exp(-t * 1.6))
    return 0.9 * y / (np.abs(y).max() + 1e-9)


def drop():
    d = 0.7; t = t_(d)
    f = 600 * np.exp(-t * 3)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3)
    return 0.35 * y


def reel():
    d = 1.4; t = t_(d)
    clicks = (np.sin(2 * np.pi * (18 + 10 * t) * t) > 0.95).astype(float)
    x = rng.standard_normal(len(t)) * clicks
    y = (x - lowpass(x, 3000)) * np.minimum(1, (d - t) / 0.3)
    return 0.4 * y / (np.abs(y).max() + 1e-9)


def gavel():
    d = 0.4; t = t_(d)
    y = (np.sin(2 * np.pi * 180 * t) + 0.6 * np.sin(2 * np.pi * 410 * t)) * np.exp(-t * 25)
    y += 0.4 * rng.standard_normal(len(t)) * np.exp(-t * 80)
    return 0.6 * y


def stamp():
    return 0.9 * thud() + np.concatenate([gavel(), np.zeros(len(thud()) - len(gavel()))]) * 0.5


SFX = dict(coin=coin, pop=pop, thud=thud, splash=splash, thunder=thunder, drop=drop, reel=reel,
           gavel=gavel, stamp=stamp)


def strip(x):
    return x.lower().strip('¿?¡!,.…:;"')


def main(gid):
    data = json.load(open(os.path.join(ROOT, 'src', 'data', gid + '.json')))
    voice = read_wav(os.path.join(ROOT, 'public', gid, 'voz.wav'))
    dur = data['duration']
    n = int(dur * SR)
    mus = music(dur)[:, :n]
    # ducking: baja la música cuando hay voz
    e = np.abs(voice[:n])
    win = int(0.15 * SR)
    e = np.convolve(e, np.ones(win) / win, 'same')
    duck = 1 - 0.55 * np.clip(e / 0.05, 0, 1)
    duck = np.convolve(duck, np.ones(win) / win, 'same')
    if len(duck) < n:
        duck = np.pad(duck, (0, n - len(duck)), constant_values=1)
    mus *= duck[None, :n]
    # entrada y salida
    fade = np.minimum(1, np.arange(n) / (0.8 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.5 * SR))
    mus *= fade[None]
    out = mus * 0.45

    def add(sig, at):
        i = int(at * SR)
        if i >= n:
            return
        e = min(n, i + len(sig))
        out[:, i:e] += sig[None, :e - i]

    for k, b in enumerate(data['beats']):
        if k > 0:
            add(whoosh(), b['start'] - 0.2)
        for kind, word in b.get('sfx', []):
            w = next((w for w in b['words'] if strip(w['w']) == strip(word)), None)
            if w:
                add(SFX[kind](), w['t'])
            else:
                print('palabra no encontrada para sfx:', kind, word)
    out = np.tanh(out * 1.1) / 1.1
    write_wav(os.path.join(ROOT, 'public', gid, 'musica.wav'), out)
    print('musica.wav', out.shape[1] / SR, 's, pico', np.abs(out).max())


if __name__ == '__main__':
    main(sys.argv[1])
