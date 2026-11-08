"""Hoja de revisión: 2 fotogramas por escena en una sola imagen. Uso: python3 herramientas/hoja.py atun video.mp4 salida.png"""
import sys, json, subprocess, tempfile, os
gid, vid, out = sys.argv[1:4]
d = json.load(open(f'src/data/{gid}.json'))
tmp = tempfile.mkdtemp()
ts = [b['start'] + b['dur'] * k for b in d['beats'] for k in (0.45, 0.9)]
for i, t in enumerate(ts):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', vid, '-frames:v', '1', '-vf', 'scale=432:-1', f'{tmp}/f{i:02d}.png'], check=True)
subprocess.run(f"ffmpeg -v error -y -pattern_type glob -i '{tmp}/f*.png' -vf tile={(len(ts) + 1) // 2}x2 {out}", shell=True, check=True)
