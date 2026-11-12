"""Sonido para los videos diorama: efectos sinteticos + musica original, mezclados bajo la voz.

Uso como modulo:
    import sonido3d as S
    S.mezclar('voz.m4a', EVENTOS, 'mezcla.m4a', tramos={'lluvia': [(19.9, 24.4)]})
EVENTOS = [(t, 'tipo'), ...]; tipos en S.TIPOS.
Todo es sintetizado aqui (sin muestras de terceros).
"""
import subprocess

import numpy as np

SR = 48000
RNG = np.random.default_rng(5)


def _env(n, a, r):
    e = np.ones(n, np.float32)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def _banda(x, f0, f1):
    """Filtro pasa-banda por FFT (f0..f1 Hz)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = ((f >= f0) & (f <= f1)).astype(np.float32)
    k = max(1, int(len(g) * 0.002))
    g = np.convolve(g, np.ones(k) / k, mode='same')
    return np.fft.irfft(X * g, len(x)).astype(np.float32)


def _ruido(seg):
    return RNG.standard_normal(int(seg * SR)).astype(np.float32)


def _tono(f, seg, forma='sin'):
    n = int(seg * SR)
    f = np.broadcast_to(np.asarray(f, np.float32), (n,)) if np.ndim(f) else np.full(n, f, np.float32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if forma == 'saw':
        return (2 * ((ph / (2 * np.pi)) % 1.0) - 1).astype(np.float32)
    if forma == 'sq':
        return np.sign(np.sin(ph)).astype(np.float32)
    return np.sin(ph).astype(np.float32)


def _norm(x, pico=0.8):
    m = np.max(np.abs(x)) + 1e-9
    return (x / m * pico).astype(np.float32)


def sfx(tipo):
    if tipo == 'whoosh':
        n = 0.45
        x = _ruido(n)
        t = np.arange(len(x)) / SR
        out = np.zeros_like(x)
        for k, (a, b) in enumerate(((300, 900), (900, 2500), (2500, 6000))):
            out += _banda(x, a, b) * np.exp(-((t - 0.12 - 0.08 * k) / 0.09) ** 2)
        return _norm(out, 0.6)
    if tipo == 'boton':
        return _norm(np.concatenate([_tono(1400, 0.07) * _env(int(0.07 * SR), 0.002, 0.02),
                                     np.zeros(int(0.04 * SR), np.float32),
                                     _tono(1900, 0.09) * _env(int(0.09 * SR), 0.002, 0.04)]), 0.5)
    if tipo == 'excavar':
        n = 1.8
        t = np.arange(int(n * SR)) / SR
        motor = _tono(48 + 6 * np.sin(2 * np.pi * 3 * t), n, 'saw') * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
        tierra = _banda(_ruido(n), 150, 1200) * (0.5 + 0.5 * (np.sin(2 * np.pi * 2.2 * t) > 0.3))
        return _norm(_banda(motor, 30, 600) * 0.7 + tierra * 0.6, 0.8) * _env(int(n * SR), 0.1, 0.4)
    if tipo == 'camion':
        n = 2.6
        t = np.arange(int(n * SR)) / SR
        f = 55 + 25 * np.clip(t / 1.2, 0, 1)
        m = _tono(f, n, 'saw') + 0.5 * _tono(f * 2, n, 'sq')
        return _norm(_banda(m, 30, 900) * (0.8 + 0.2 * np.sin(2 * np.pi * 14 * t)), 0.6) * _env(int(n * SR), 0.15, 0.8)
    if tipo == 'metal':
        n = 0.5
        t = np.arange(int(n * SR)) / SR
        x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((523, 9), (1347, 12), (2210, 16), (3180, 22)))
        return _norm(x.astype(np.float32), 0.45)
    if tipo == 'concreto':
        n = 0.9
        x = _banda(_ruido(n), 80, 700)
        t = np.arange(len(x)) / SR
        x *= 0.6 + 0.4 * np.sin(2 * np.pi * 7 * t) ** 2
        return _norm(x, 0.6) * _env(len(x), 0.05, 0.3)
    if tipo == 'golpe':
        n = 0.5
        t = np.arange(int(n * SR)) / SR
        x = np.sin(2 * np.pi * (75 - 35 * t) * t) * np.exp(-t * 9) + 0.25 * _banda(_ruido(n), 60, 400) * np.exp(-t * 20)
        return _norm(x.astype(np.float32), 0.9)
    if tipo == 'crujido':
        n = 1.2
        x = _banda(_ruido(n), 40, 500)
        t = np.arange(len(x)) / SR
        x *= (np.sin(2 * np.pi * 11 * t) > 0.2) * 0.7 + 0.3
        return _norm(x, 0.8) * _env(len(x), 0.05, 0.4)
    if tipo == 'bomba':
        n = 1.5
        t = np.arange(int(n * SR)) / SR
        x = _tono(120, n, 'saw') * 0.5 + _tono(240, n) * 0.3
        return _norm(_banda(x, 60, 1500), 0.4) * _env(len(x), 0.08, 0.4)
    if tipo == 'llenar':
        n = 2.0
        x = _banda(_ruido(n), 200, 2500)
        t = np.arange(len(x)) / SR
        burb = sum(np.sin(2 * np.pi * (300 + 600 * RNG.random()) * (t - t0)) * np.exp(-np.maximum(t - t0, 0) * 40) * (t > t0)
                   for t0 in RNG.uniform(0, n, 40))
        return _norm(x * 0.5 + burb.astype(np.float32) * 0.5, 0.55) * _env(len(x), 0.2, 0.5)
    if tipo == 'hidraulica':
        n = 0.9
        t = np.arange(int(n * SR)) / SR
        hum = _tono(90 + 20 * t, n, 'saw')
        sss = _banda(_ruido(n), 2500, 8000)
        return _norm(_banda(hum, 40, 800) * 0.7 + sss * 0.35, 0.55) * _env(int(n * SR), 0.06, 0.25)
    if tipo == 'motor':
        n = 1.6
        t = np.arange(int(n * SR)) / SR
        f = 70 + 110 * np.clip(t / 0.5, 0, 1) - 60 * np.clip((t - 0.6) / 0.8, 0, 1)
        x = _tono(f, n, 'saw') + 0.6 * _tono(f * 2.01, n, 'saw')
        return _norm(_banda(x, 40, 2500), 0.6) * _env(int(n * SR), 0.05, 0.4)
    if tipo == 'luces':
        b = _tono(2200, 0.08) * _env(int(0.08 * SR), 0.002, 0.03)
        return _norm(np.concatenate([b, np.zeros(int(0.12 * SR), np.float32), b]), 0.45)
    if tipo == 'pop':
        n = 0.12
        t = np.arange(int(n * SR)) / SR
        return (0.4 * np.sin(2 * np.pi * np.cumsum(500 + 900 * t / n) / SR) * _env(int(n * SR), 0.002, 0.05)).astype(np.float32)
    raise ValueError(tipo)


def lluvia(dur):
    x = _banda(_ruido(dur), 800, 9000) * 0.5 + _banda(_ruido(dur), 150, 800) * 0.3
    return _norm(x, 0.35) * _env(len(x), 0.4, 0.6)


def musica(dur, bpm=104):
    """Base original: bombo, hi-hat, bajo y arpegio pluck (La menor - Fa - Do - Sol)."""
    n = int(dur * SR)
    out = np.zeros(n, np.float32)
    beat = 60 / bpm
    acordes = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    t_b = 0.0
    k = 0
    while t_b < dur:
        i = int(t_b * SR)
        ac = acordes[(k // 8) % 4]
        # bombo en 1 y 3, hi-hat en corcheas
        if k % 2 == 0:
            tt = np.arange(int(0.25 * SR)) / SR
            b = np.sin(2 * np.pi * (110 * np.exp(-tt * 18) + 45) * tt) * np.exp(-tt * 14)
            out[i:i + len(b)] += 0.55 * b[:max(0, n - i)]
        for h in (0, 0.5):
            j = int((t_b + h * beat) * SR)
            hh = _banda(_ruido(0.05), 6000, 12000) * _env(int(0.05 * SR), 0.001, 0.04)
            out[j:j + len(hh)] += 0.12 * hh[:max(0, n - j)]
        # bajo (negras)
        tt = np.arange(int(beat * 0.9 * SR)) / SR
        f = hz(ac[0] - 12)
        bajo = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * _env(len(tt), 0.01, 0.15)
        out[i:i + len(bajo)] += 0.35 * bajo[:max(0, n - i)]
        # arpegio pluck (corcheas)
        for h, nota in ((0, ac[k % 3]), (0.5, ac[(k + 1) % 3] + 12)):
            j = int((t_b + h * beat) * SR)
            tt = np.arange(int(0.3 * SR)) / SR
            f = hz(nota)
            p = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 11)
            out[j:j + len(p)] += 0.16 * p[:max(0, n - j)]
        t_b += beat
        k += 1
    return _norm(out, 0.7)


def leer(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def mezclar(voz_f, eventos, salida, tramos=None, vol_fx=0.22, vol_mus=0.16, cola=0.6):
    voz = leer(voz_f)
    n = len(voz) + int(cola * SR)
    v = np.zeros(n, np.float32)
    v[:len(voz)] = voz
    fx = np.zeros(n, np.float32)
    for t, tipo in eventos:
        s = sfx(tipo)
        i = int(t * SR)
        if i >= n:
            continue
        fx[i:i + len(s)] += s[:n - i]
    for tipo, lst in (tramos or {}).items():
        for t0, t1 in lst:
            s = lluvia(t1 - t0) if tipo == 'lluvia' else np.zeros(1, np.float32)
            i = int(t0 * SR)
            fx[i:i + len(s)] += s[:n - i]
    mus = musica(n / SR + 0.01)[:n]
    mus = np.pad(mus, (0, n - len(mus)))
    # ducking: la musica baja cuando hay voz
    w = int(0.05 * SR)
    envv = np.convolve(np.abs(v), np.ones(w) / w, mode='same')
    duck = 1.0 - 0.55 * np.clip(envv / (np.percentile(envv[envv > 1e-4], 60) + 1e-9), 0, 1)
    duck = np.convolve(duck, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode='same')
    mus *= _env(n, 0.5, 1.2)
    mix = v + vol_fx * fx + vol_mus * mus * duck
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), '-c:a', 'aac', '-b:a', '192k', salida],
                   input=mix.astype(np.float32).tobytes(), check=True)
    return salida
