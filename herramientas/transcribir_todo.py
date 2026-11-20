"""Transcribe un directo completo por bloques de 10 min (reanudable) y guarda segmentos con tiempos.

    python3 herramientas/transcribir_todo.py VIDEO work/salida.json [--modelo small]
"""
import sys, os, json, argparse, subprocess
import numpy as np
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out'); ap.add_argument('--modelo', default='small')
ap.add_argument('--bloque', type=float, default=600); ap.add_argument('--idioma', default='es')
a = ap.parse_args()
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                     '-of', 'csv=p=0', a.video]).decode())
res = json.load(open(a.out)) if os.path.exists(a.out) else {'hecho': 0, 'segs': []}
m = WhisperModel(a.modelo, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
t = res['hecho']
while t < dur:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-t', f'{a.bloque:.2f}', '-i', a.video,
                          '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, _ = m.transcribe(audio, language=a.idioma, vad_filter=True, condition_on_previous_text=False)
    for s in segs:
        res['segs'].append(dict(s=round(t + s.start, 1), e=round(t + s.end, 1), t=s.text.strip()))
    t += a.bloque
    res['hecho'] = t
    json.dump(res, open(a.out, 'w'), ensure_ascii=False)
    print(f'{min(t, dur) / 3600:.2f} h / {dur / 3600:.2f} h', flush=True)
