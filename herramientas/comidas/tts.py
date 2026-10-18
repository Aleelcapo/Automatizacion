"""Voz sustituta (pedida por el autor) con Piper, español argentino. Une los párrafos con pausas naturales.

Uso: tts.py <guion.txt> <modelo.onnx> <salida.wav> [length_scale]
"""
import sys, subprocess, wave, os, tempfile, numpy as np

script, model, out = sys.argv[1:4]
scale = sys.argv[4] if len(sys.argv) > 4 else '1.0'
# solo para la pronunciación del sintetizador; los subtítulos usan la ortografía del guion
SAY = {'TasteAtlas': 'Teist Átlas', 'prosciutto': 'prosciuto', 'shabu-shabu': 'shabú shabú', 'phirni': 'pirni', 'bistec': 'bisték', 'moja': 'mója'}
paras = [p.strip() for p in open(script, encoding='utf-8').read().split('\n\n') if p.strip()]
chunks, sr = [], None
for i, p in enumerate(paras):
    for k, v in SAY.items(): p = p.replace(k, v)
    tmp = tempfile.mktemp(suffix='.wav')
    subprocess.run(['piper', '-m', model, '-f', tmp, '--length-scale', scale, '--sentence-silence', '0.25'],
                   input=p.encode('utf-8'), check=True, capture_output=True)
    with wave.open(tmp) as w:
        sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16)
    os.remove(tmp)
    # recorta silencios de los bordes y añade pausa entre párrafos (espacio para los vuelos del mapa)
    nz = np.nonzero(np.abs(a) > 300)[0]
    a = a[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.08 * sr)]
    chunks.append(a)
    chunks.append(np.zeros(int((0.85 if i < len(paras) - 1 else 0.4) * sr), np.int16))
lead = np.zeros(int(0.35 * sr), np.int16)
audio = np.concatenate([lead] + chunks)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(audio.tobytes())
print('duración', round(len(audio) / sr, 2), 's', sr, 'Hz')
