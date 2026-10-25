"""Une los cuadros renderizados, el audio de ElevenLabs y los subtítulos palabra por palabra.

Uso: python3 armar_video.py FRAMES_DIR AUDIO.mp3 PALABRAS.json SALIDA_BASE [--fps 24]
Genera SALIDA_BASE.mp4 (1080x1920, 30 fps), SALIDA_BASE.srt y SALIDA_BASE.txt.
"""
import sys, json, os, re, subprocess

frames, audio, words_json, out = sys.argv[1:5]
src_fps = int(sys.argv[sys.argv.index('--fps') + 1]) if '--fps' in sys.argv else 24

# correcciones de la transcripción automática
FIX = {'cabas': 'cavas', 'UniGlue!': 'un iglú!', '¡Construiste': '¡Construiste'}

words = []
for w in json.load(open(words_json)):
    t = FIX.get(w['w'], w['w'])
    parts = t.split()
    d = (w['e'] - w['s']) / len(parts)
    for k, p in enumerate(parts):
        words.append((w['s'] + k * d, w['s'] + (k + 1) * d, p))


def ts(t, sep='.'):
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f'{h}:{m:02d}:{s:02d}{sep}{cs:02d}'


def clean(w):
    w = re.sub(r'[.,;:!?¡¿]', '', w)
    return w[:1].upper() + w[1:]


# ASS: una palabra a la vez, blanca con borde negro, en el centro como en las muestras
ass = out + '.ass'
with open(ass, 'w', encoding='utf-8') as fh:
    fh.write('[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n'
             '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, '
             'BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV\n'
             'Style: W,Inter ExtraBold,92,&H00FFFFFF,&H00000000,&H64000000,1,1,7,3,5,40,40,0\n\n'
             '[Events]\nFormat: Layer, Start, End, Style, Text\n')
    for i, (s, e, w) in enumerate(words):
        e2 = words[i + 1][0] if i + 1 < len(words) and words[i + 1][0] - e < 0.35 else e + 0.15
        fh.write(f'Dialogue: 0,{ts(s)},{ts(e2)},W,{{\\pos(540,800)\\fscx90\\fscy90\\t(0,80,\\fscx100\\fscy100)}}{clean(w)}\n')

# SRT por frases (para subir a redes) y guion en TXT
sents, cur = [], []
for s, e, w in words:
    cur.append((s, e, w))
    if w[-1] in '.!?' or len(' '.join(x[2] for x in cur)) > 34:
        sents.append(cur); cur = []
if cur:
    sents.append(cur)
def srt(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


with open(out + '.srt', 'w', encoding='utf-8') as fh:
    for i, c in enumerate(sents, 1):
        e = c[-1][1] + 0.2
        if i < len(sents):
            e = min(e, sents[i][0][0] - 0.02)
        fh.write(f"{i}\n{srt(c[0][0])} --> {srt(e)}\n{' '.join(x[2] for x in c)}\n\n")
with open(out + '.txt', 'w', encoding='utf-8') as fh:
    fh.write(' '.join(w for _, _, w in words).replace('. ', '.\n\n').replace('! ', '!\n\n') + '\n')

subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-framerate', str(src_fps), '-i', os.path.join(frames, 'f_%04d.png'), '-i', audio,
    '-vf', f'scale=1080:1920:flags=lanczos,fps=30,ass={ass}',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest', '-movflags', '+faststart', out + '.mp4'], check=True)
os.remove(ass)
print('listo', out + '.mp4')
