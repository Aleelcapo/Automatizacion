"""Convierte gameplay horizontal en clips verticales 9:16 listos para TikTok / Shorts / Reels.

Un clip:
    python clip.py grabacion.mp4 --inicio 12:30 --fin 13:00 --gancho "NADIE ESPERABA *ESTO* EN GTA 6"

Todos los momentos de un JSON (de momentos.py), o solo algunos:
    python clip.py grabacion.mp4 --lista grabacion_momentos.json --solo 0,3,5

Modos de encuadre (--modo):
    fit      gameplay completo al centro (con zoom) y fondo desenfocado. El más seguro.
    crop     recorte vertical a pantalla completa. Usa --cx para elegir qué parte (0=izq, 1=der).
    facecam  tu cámara arriba y el gameplay abajo. Indica dónde está la cámara en la grabación
             con --facecam x,y,ancho,alto en fracciones (ej. 0.75,0.02,0.23,0.25).

Texto: pon palabras entre *asteriscos* para resaltarlas en amarillo.
--subs agrega subtítulos automáticos de tu voz (requiere: pip install faster-whisper).
"""
import sys, os, json, argparse, subprocess, tempfile, re

W, H = 1080, 1920
HASHTAGS = '#GTA6 #GTAVI #GrandTheftAuto #ViceCity #Leonida #gaming #shorts'


def segundos(t):
    if isinstance(t, (int, float)):
        return float(t)
    s = 0.0
    for p in str(t).split(':'):
        s = s * 60 + float(p)
    return s


def ass_time(t):
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f'{h}:{m:02d}:{s:02d}.{cs:02d}'


def ass_text(txt):
    txt = txt.replace('\\', '').replace('{', '(').replace('}', ')').replace('\n', '\\N')
    txt = re.sub(r'(GTA|VI|Vice) (6|VI|City)', r'\1\\h\2', txt, flags=re.I)  # no partir "GTA 6"
    # *palabra* -> amarillo
    return re.sub(r'\*(.+?)\*', r'{\\c&H00D7FF&}\1{\\c&HFFFFFF&}', txt)


def escribir_ass(path, dur, gancho, gancho_seg, subs, fuente, top_gancho):
    estilos = [
        f'Style: Gancho,{fuente},82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,7,3,8,80,80,{top_gancho},1',
        f'Style: Subs,{fuente},74,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,6,2,2,90,90,560,1',
    ]
    ev = []
    if gancho:
        fin = dur if gancho_seg <= 0 else min(dur, gancho_seg)
        ev.append(f'Dialogue: 0,{ass_time(0)},{ass_time(fin)},Gancho,,0,0,0,,{{\\fad(120,150)}}{ass_text(gancho)}')
    for (s, e, t) in subs:
        ev.append(f'Dialogue: 1,{ass_time(s)},{ass_time(e)},Subs,,0,0,0,,{ass_text(t.upper())}')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n'
                 'ScaledBorderAndShadow: yes\n\n[V4+ Styles]\n'
                 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, '
                 'Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, '
                 'Alignment, MarginL, MarginR, MarginV, Encoding\n' + '\n'.join(estilos) +
                 '\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
                 '\n'.join(ev) + '\n')


def transcribir(video, ini, dur, tmp):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print('  (sin subtítulos: instala con  pip install faster-whisper)')
        return []
    wav = os.path.join(tmp, 'voz.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-t', str(dur), '-i', video,
                    '-ac', '1', '-ar', '16000', wav], check=True)
    m = WhisperModel('small', device='auto', compute_type='int8')
    segs, _ = m.transcribe(wav, language='es', vad_filter=True, word_timestamps=True)
    palabras = [(w.start, w.end, w.word.strip()) for s in segs for w in (s.words or []) if w.word.strip()]
    out, grupo = [], []
    for p in palabras:  # bloques cortos de 3 palabras, estilo TikTok
        grupo.append(p)
        if len(grupo) == 3 or p[2][-1:] in '.?!,':
            out.append((grupo[0][0], grupo[-1][1], ' '.join(g[2] for g in grupo)))
            grupo = []
    if grupo:
        out.append((grupo[0][0], grupo[-1][1], ' '.join(g[2] for g in grupo)))
    return out


def fps_fuente(video):
    r = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                 'stream=r_frame_rate', '-of', 'csv=p=0', video]).decode().strip()
    a, b = r.split('/')
    return int(a) / int(b)


def tiene_audio(video):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries',
                                   'stream=index', '-of', 'csv=p=0', video]).decode().strip()
    return bool(out)


def filtro(modo, cx, zoom, facecam, fps):
    if modo == 'crop':
        v = (f'[0:v]crop=w=ih*9/16:h=ih:x=(iw-ow)*{cx}:y=0,'
             f'scale={W}:{H}:flags=lanczos,setsar=1[base]')
    elif modo == 'facecam':
        fx, fy, fw, fh = facecam
        top = 680
        v = (f'[0:v]split[a][b];'
             f'[a]crop=iw*{fw}:ih*{fh}:iw*{fx}:ih*{fy},scale={W}:{top}:force_original_aspect_ratio=increase,'
             f'crop={W}:{top},setsar=1[cam];'
             f'[b]crop=w=ih*{W}/{H - top}:h=ih:x=(iw-ow)*{cx}:y=0,scale={W}:{H - top}:flags=lanczos,setsar=1[game];'
             f'[cam][game]vstack[base]')
    else:  # fit
        v = (f'[0:v]split[a][b];'
             f'[a]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,gblur=sigma=12,'
             f'eq=brightness=-0.12:saturation=1.2,scale={W}:{H},setsar=1[bg];'
             f'[b]crop=w=min(iw\\,iw/{zoom}):h=ih:x=(iw-ow)*{cx}:y=0,scale={W}:-2:flags=lanczos,setsar=1[fg];'
             f'[bg][fg]overlay=(W-w)/2:(H-h)/2[base]')
    return v + f';[base]ass=sub.ass,fps={fps},format=yuv420p[v]'


def render(video, ini, fin, salida, gancho='', modo='fit', cx=0.5, zoom=1.35, facecam=None,
           subs=False, gancho_seg=0, fps=None, fuente='Arial', rapido=False):
    video = os.path.abspath(video)
    salida = os.path.abspath(salida)
    dur = fin - ini
    if dur <= 0:
        raise SystemExit(f'fin ({fin}) debe ser mayor que inicio ({ini})')
    if modo == 'facecam' and not facecam:
        raise SystemExit('el modo facecam necesita --facecam x,y,ancho,alto')
    if fps is None:
        fps = 60 if fps_fuente(video) >= 50 else 30
    os.makedirs(os.path.dirname(salida) or '.', exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        cues = transcribir(video, ini, dur, tmp) if subs else []
        top_gancho = 250 if modo != 'facecam' else 720
        escribir_ass(os.path.join(tmp, 'sub.ass'), dur, gancho, gancho_seg, cues, fuente, top_gancho)
        cmd = ['ffmpeg', '-v', 'error', '-stats', '-y', '-ss', f'{ini:.3f}', '-t', f'{dur:.3f}', '-i', video,
               '-filter_complex', filtro(modo, cx, zoom, facecam, fps), '-map', '[v]']
        if tiene_audio(video):
            cmd += ['-map', '0:a:0', '-af',
                    f'loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st={max(0, dur - 0.3):.3f}:d=0.3',
                    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000']
        cmd += ['-c:v', 'libx264', '-preset', 'veryfast' if rapido else 'medium', '-crf', '19',
                '-profile:v', 'high', '-movflags', '+faststart', salida]
        subprocess.run(cmd, check=True, cwd=tmp)
    with open(os.path.splitext(salida)[0] + '.txt', 'w', encoding='utf-8') as fh:
        titulo = gancho.replace('*', '') if gancho else 'GTA 6'
        fh.write(f'{titulo}\n\n{HASHTAGS}\n')
    print('listo:', salida, f'({dur:.0f}s)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--inicio', help='ej. 12:30 o 750')
    ap.add_argument('--fin', help='ej. 13:00 o 780')
    ap.add_argument('--gancho', default='', help='texto grande arriba; *palabra* = amarillo')
    ap.add_argument('--gancho-seg', type=float, default=0, help='segundos que dura el gancho (0 = todo el clip)')
    ap.add_argument('--modo', choices=['fit', 'crop', 'facecam'], default='fit')
    ap.add_argument('--cx', type=float, default=0.5, help='posición horizontal del encuadre 0..1')
    ap.add_argument('--zoom', type=float, default=1.35, help='zoom del modo fit (1 = sin recorte)')
    ap.add_argument('--facecam', help='x,y,ancho,alto de tu cámara en fracciones de la imagen')
    ap.add_argument('--subs', action='store_true', help='subtítulos automáticos de tu voz')
    ap.add_argument('--fps', type=int, help='30 o 60 (por defecto 60 si la grabación es de 60)')
    ap.add_argument('--fuente', default='Arial', help='tipografía del texto (debe estar instalada)')
    ap.add_argument('--rapido', action='store_true', help='renderiza más rápido (archivo algo más grande)')
    ap.add_argument('--lista', help='JSON de momentos.py')
    ap.add_argument('--solo', help='índices a renderizar de la lista, ej. 0,3,5')
    ap.add_argument('--salida', default='clips', help='carpeta de salida (por defecto ./clips)')
    ap.add_argument('--nombre', help='nombre base de los archivos')
    a = ap.parse_args()

    fc = [float(x) for x in a.facecam.split(',')] if a.facecam else None
    base = a.nombre or os.path.splitext(os.path.basename(a.video))[0]
    comun = dict(subs=a.subs, gancho_seg=a.gancho_seg, fps=a.fps, fuente=a.fuente, rapido=a.rapido,
                 zoom=a.zoom, facecam=fc)

    if a.lista:
        momentos = json.load(open(a.lista, encoding='utf-8'))['momentos']
        idx = [int(x) for x in a.solo.split(',')] if a.solo else range(len(momentos))
        for i in idx:
            m = momentos[i]
            print(f'[{i}] {m["inicio"]}s - {m["fin"]}s', m.get('gancho', ''))
            render(a.video, segundos(m['inicio']), segundos(m['fin']),
                   os.path.join(a.salida, f'{base}_{i:02d}.mp4'), gancho=m.get('gancho', ''),
                   modo=m.get('modo', a.modo), cx=m.get('cx', a.cx), **comun)
    else:
        if a.inicio is None or a.fin is None:
            ap.error('usa --inicio y --fin, o --lista')
        render(a.video, segundos(a.inicio), segundos(a.fin), os.path.join(a.salida, base + '_clip.mp4'),
               gancho=a.gancho, modo=a.modo, cx=a.cx, **comun)


if __name__ == '__main__':
    main()
