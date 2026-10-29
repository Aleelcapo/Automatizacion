"""Une los cuadros renderizados, el audio de ElevenLabs y los subtítulos palabra por palabra.

Uso: python3 armar_video.py FRAMES_DIR AUDIO PALABRAS.json SALIDA_BASE [--fps 24] [--estilo anton]
Genera SALIDA_BASE.mp4 (1080x1920, 30 fps), SALIDA_BASE.srt y SALIDA_BASE.txt.

Estilos de subtítulo (una palabra a la vez):
  inter : Inter ExtraBold, Capitalizada, centro de la pantalla (video del iglú)
  anton : Anton, minúsculas, blanca, un poco por debajo del centro
"""
import sys, json, os, re, subprocess

frames, audio, words_json, out = sys.argv[1:5]
arg = {sys.argv[i]: sys.argv[i + 1] for i in range(5, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
src_fps = int(arg.get('--fps', 24))
estilo = arg.get('--estilo', 'inter')
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fuentes')

# correcciones de la transcripción automática (palabra -> texto; una secuencia se reparte en el tiempo)
FIX = {'cabas': 'cavas', 'caban': 'cavan', 'UniGlue!': 'un iglú!', 'aguajote': 'ahuejote',
       'elevadizo.': 'levadizo.', 'contravesaños.': 'con travesaños.', 'resvale': 'resbale', 'amaca,': 'hamaca,',
       'hoyín': 'hollín', 'amarran': 'amarra', 'saleros': 'aleros', 'cana.': 'khana.', 'enfria': 'enfría',
       'arras': 'a ras', 'Quezhuachaca.': "Q'eswachaka."}
FIX_SEQ = [(('entre', 'octángulo'), ('en', 'rectángulo')), (('vuelta', 'a', 'dormido'), ('vuelta', '', 'dormido')),
           (('bad', 'gear'), ('badgir', '')), (('una', 'atrapa', 'vientos'), ('un', 'atrapavientos', '')),
           (('atrapa', 'vientos'), ('atrapavientos', ''))]

raw = json.load(open(words_json))
i = 0
while i < len(raw):
    for a, b in FIX_SEQ:
        if tuple(x['w'].strip(',.!¡?¿') for x in raw[i:i + len(a)]) == a:
            for j, (x, nw) in enumerate(zip(raw[i:i + len(a)], b)):
                core = x['w'].strip(',.!¡?¿')
                if nw == '' and j > 0:   # palabra eliminada: su puntuación pasa a la anterior
                    raw[i + j - 1]['w'] += x['w'].replace(core, '', 1)
                    x['w'] = ''
                else:
                    x['w'] = x['w'].replace(core, nw)
    i += 1

words = []
for w in raw:
    t = FIX.get(w['w'], w['w'])
    parts = t.split()
    if not parts:  # palabra eliminada por FIX_SEQ
        continue
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
    return w.lower() if estilo == 'anton' else w[:1].upper() + w[1:]


if estilo == 'anton':
    STYLE = 'Style: W,Anton,132,&H00FFFFFF,&H00000000,&H78000000,0,1,5,3,5,40,40,0'
    POS = (540, 1180)
else:
    STYLE = 'Style: W,Inter ExtraBold,92,&H00FFFFFF,&H00000000,&H64000000,1,1,7,3,5,40,40,0'
    POS = (540, 800)

# ASS: una palabra a la vez, blanca con borde negro fino
ass = out + '.ass'
with open(ass, 'w', encoding='utf-8') as fh:
    fh.write('[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n'
             '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, '
             'BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV\n'
             + STYLE + '\n\n'
             '[Events]\nFormat: Layer, Start, End, Style, Text\n')
    for i, (s, e, w) in enumerate(words):
        e2 = words[i + 1][0] if i + 1 < len(words) and words[i + 1][0] - e < 0.35 else e + 0.15
        fh.write(f'Dialogue: 0,{ts(s)},{ts(e2)},W,{{\\pos({POS[0]},{POS[1]})\\fscx90\\fscy90\\t(0,80,\\fscx100\\fscy100)}}{clean(w)}\n')

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
    '-vf', f'scale=1080:1920:flags=lanczos,fps=30,ass={ass}:fontsdir={FONTS}',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest', '-movflags', '+faststart', out + '.mp4'], check=True)
os.remove(ass)
print('listo', out + '.mp4')
