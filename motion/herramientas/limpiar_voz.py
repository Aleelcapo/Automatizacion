"""Quita silencios largos y respiraciones de una voz en off (ElevenLabs, grabación propia, etc.).

Uso:
  python3 herramientas/limpiar_voz.py entrada.mp3 salida_base [--punto 0.25] [--coma 0.15] [--resto 0.08]

Genera:
  salida_base.wav / salida_base.mp3   audio limpio
  salida_base.palabras.json           palabras con sus tiempos YA en el audio limpio (para animar)

Cómo decide:
  - Mide la energía cada 10 ms. Lo que está más de 18 dB por debajo del nivel típico de la voz
    es silencio o respiración (una inhalación suena ~25 dB más baja que la voz).
  - Cada hueco se reemplaza por una pausa corta fija según la puntuación de la palabra anterior
    (transcripción con Whisper): punto/pregunta -> --punto, coma -> --coma, resto -> --resto.
  - Fundidos de unos ms en cada corte para que no se escuchen clics.
"""
import argparse, json, os, subprocess
import numpy as np

SR = 48000


def cargar(path, sr):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def transcribir(path, prompt=None):
    from faster_whisper import WhisperModel
    audio = cargar(path, 16000)
    m = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4)
    segs, _ = m.transcribe(audio, language='es', word_timestamps=True, initial_prompt=prompt)
    return [[w.start, w.end, w.word.strip()] for s in segs for w in s.words]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada')
    ap.add_argument('salida')
    ap.add_argument('--punto', type=float, default=0.25)
    ap.add_argument('--coma', type=float, default=0.15)
    ap.add_argument('--resto', type=float, default=0.08)
    ap.add_argument('--umbral', type=float, default=18, help='dB por debajo de la voz que cuentan como silencio/respiración')
    ap.add_argument('--prompt', default=None, help='texto del guion para ayudar a Whisper')
    a = ap.parse_args()

    x = cargar(a.entrada, SR)
    hop = SR // 100
    n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-7)
    nivel = np.median(db[db > -40])
    voz = db > nivel - a.umbral

    # regiones de voz (unir huecos < 120 ms, que son pausas dentro de palabras)
    reg, i = [], 0
    while i < n:
        if voz[i]:
            j = i
            while j < n and voz[j:j + 12].any():
                j += 1
            k = j
            while k > i and not voz[k - 1]:
                k -= 1
            reg.append([i, k])
            i = j
        else:
            i += 1
    # descartar chispazos sueltos (< 40 ms)
    reg = [r for r in reg if r[1] - r[0] >= 4]

    palabras = transcribir(a.entrada, a.prompt)

    def pausa(t):
        prev = [w for w in palabras if w[1] <= t + 0.15]
        if not prev:
            return a.resto
        p = prev[-1][2]
        if p.endswith(('.', '?', '!', '…')):
            return a.punto
        if p.endswith((',', ':', ';')):
            return a.coma
        return a.resto

    pre, post = int(0.025 * SR), int(0.045 * SR)
    fade_in, fade_out = int(0.008 * SR), int(0.020 * SR)
    partes, mapa = [], []  # mapa: (t_orig_ini, t_orig_fin, t_nuevo_ini)
    t_nuevo = 0.0
    partes.append(np.zeros(int(0.12 * SR), np.float32)); t_nuevo += 0.12
    for k, (r0, r1) in enumerate(reg):
        s = max(0, r0 * hop - pre)
        e = min(len(x), r1 * hop + post)
        seg = x[s:e].copy()
        seg[:fade_in] *= np.linspace(0, 1, fade_in)
        seg[-fade_out:] *= np.linspace(1, 0, fade_out)
        mapa.append((s / SR, e / SR, t_nuevo))
        partes.append(seg); t_nuevo += len(seg) / SR
        if k + 1 < len(reg):
            hueco = (reg[k + 1][0] - r1) * hop / SR
            p = min(pausa(r1 * hop / SR), max(0.0, hueco - 0.07))
            partes.append(np.zeros(int(p * SR), np.float32)); t_nuevo += p
    partes.append(np.zeros(int(0.25 * SR), np.float32))
    y = np.concatenate(partes)

    def remap(t):
        for o0, o1, nn in mapa:
            if t <= o1:
                return nn + max(0.0, t - o0)
        o0, o1, nn = mapa[-1]
        return nn + (o1 - o0)

    out_words = [dict(t=round(remap(w0), 3), e=round(remap(w1), 3), w=w) for w0, w1, w in palabras]

    base = a.salida
    os.makedirs(os.path.dirname(os.path.abspath(base)), exist_ok=True)
    import wave
    with wave.open(base + '.wav', 'w') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', base + '.wav', '-b:a', '192k', base + '.mp3'], check=True)
    json.dump(out_words, open(base + '.palabras.json', 'w'), ensure_ascii=False, indent=0)
    print(f'original {len(x) / SR:.1f}s -> limpio {len(y) / SR:.1f}s  ({len(reg)} frases, nivel voz {nivel:.1f} dB)')


if __name__ == '__main__':
    main()
