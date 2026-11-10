"""Clips verticales para TikTok a partir de directos largos (VODs de streamers).

Paso 1, buscar los mejores momentos (solo lee el audio, sirve para videos de horas):
    python3 herramientas/clipper.py analizar VIDEO.mp4 --out work/momentos.json --n 8

    Detecta picos de emoción (gritos, risas, sustos) comparando el volumen de cada
    momento con lo normal de los minutos de alrededor, transcribe cada candidato con
    Whisper y ajusta el corte para no cortar frases a la mitad. Deja en el json el
    texto de cada momento y un campo "titulo" vacío para escribir el gancho.

Paso 2, renderizar los clips 9:16:
    python3 herramientas/clipper.py cortar VIDEO.mp4 --momentos work/momentos.json \
        --canal "@streamer" --outdir entregas/clips [--cam x,y,w,h] [--modo blur|split|recorte]

    --cam   zona de la cámara del streamer en el video original (px). Con --cam el
            modo por defecto es "split": cámara arriba, juego abajo.
    --modo  blur    = juego completo al centro sobre fondo desenfocado (por defecto sin cam)
            recorte = juego recortado a pantalla completa vertical
    Subtítulos grandes palabra a palabra, título gancho arriba y crédito al canal.

Formato de momentos.json (editable a mano):
    {"src": "...", "momentos": [{"ini": 1234.5, "fin": 1262.0, "score": 9.1,
                                  "titulo": "", "texto": "..."}]}
"""
import sys, os, json, argparse, subprocess, tempfile
import numpy as np

W, H = 1080, 1920
FONT = 'Inter Black'


def run(cmd):
    subprocess.run(cmd, check=True)


def probe(f):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                   'stream=width,height:format=duration', '-of', 'json', f])
    d = json.loads(out)
    st = d.get('streams') or [{}]
    return st[0].get('width'), st[0].get('height'), float(d['format']['duration'])


# ---------------------------------------------------------------- análisis

def loudness_per_second(f, sr=8000):
    """dB RMS por segundo, leyendo el audio en streaming (no carga 6 h en memoria)."""
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', f, '-vn', '-ac', '1', '-ar', str(sr),
                          '-f', 's16le', '-'], stdout=subprocess.PIPE)
    db = []
    blk = sr * 2
    while True:
        b = p.stdout.read(blk)
        if len(b) < blk // 2:
            break
        x = np.frombuffer(b[:len(b) // 2 * 2], np.int16).astype(np.float32) / 32768
        db.append(10 * np.log10(np.mean(x * x) + 1e-9))
    p.wait()
    return np.array(db)


def rolling(x, k, fn):
    pad = k // 2
    xp = np.pad(x, pad, mode='edge')
    return np.array([fn(xp[i:i + k]) for i in range(len(x))])


def excitement(db):
    """Volumen sostenido por encima de lo normal de los minutos de alrededor."""
    s = np.convolve(db, np.ones(3) / 3, mode='same')            # suavizado 3 s
    base = rolling(db, 241, np.median)                           # base local ±2 min
    spread = rolling(np.abs(db - base), 241, np.median) + 0.5
    z = (s - base) / spread
    peaks = (db - base) / spread                                 # golpes cortos (gritos)
    burst = np.convolve((peaks > 3).astype(float), np.ones(10), mode='same')
    return z + 0.3 * burst


def pick(score, n, min_gap):
    order = np.argsort(score)[::-1]
    chosen = []
    for i in order:
        if score[i] <= 1:
            break
        if all(abs(i - c) >= min_gap for c in chosen):
            chosen.append(int(i))
        if len(chosen) >= n:
            break
    return chosen


_model = None


def whisper():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(os.environ.get('WHISPER', 'small'), device='cpu', compute_type='int8',
                              cpu_threads=os.cpu_count() or 4)
    return _model


def transcribe(f, ini, fin, words=False, lang=None):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.2f}', '-to', f'{fin:.2f}', '-i', f,
                          '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, info = whisper().transcribe(audio, language=lang, vad_filter=True, word_timestamps=words)
    out = []
    for s in segs:
        d = dict(s=ini + s.start, e=ini + s.end, t=s.text.strip())
        if words:
            d['w'] = [(ini + w.start, ini + w.end, w.word.strip()) for w in (s.words or [])]
        out.append(d)
    return out, info.language


def snap(segs, ini, fin, peak, mn, mx):
    """Ajusta inicio/fin a límites de frase sin pasar de mn..mx segundos.
    El final cae en la primera pausa clara después del pico (deja terminar la reacción)."""
    starts = [s['s'] for s in segs if s['s'] <= peak - 3]
    ss = sorted(segs, key=lambda s: s['s'])
    ends = [s['e'] for k, s in enumerate(ss) if s['e'] >= fin - 4 and
            (k + 1 == len(ss) or ss[k + 1]['s'] - s['e'] >= 1.0)]
    a = max([x for x in starts if peak - x <= mx - 5] or [ini])
    cand = [x for x in ends if mn <= x - a <= mx]
    b = min(cand) if cand else min(max(fin, a + mn), a + mx)
    if b - a < mn:
        b = a + mn
    return round(a - 0.3, 2), round(b + 0.6, 2)


def cmd_analizar(a):
    _, _, dur = probe(a.video)
    print(f'analizando audio de {dur / 3600:.1f} h ...', flush=True)
    db = loudness_per_second(a.video)
    sc = excitement(db)
    sc[:15] = sc[-15:] = 0                                       # bordes sin contexto
    peaks = pick(sc, a.n * 2, a.max)                             # el doble: luego filtramos
    res = []
    for p in peaks:
        ini, fin = max(0, p - a.antes), min(dur, p + a.despues)
        segs, lang = transcribe(a.video, max(0, ini - 15), min(dur, fin + 15), lang=a.idioma)
        txt_words = sum(len(s['t'].split()) for s in segs if ini - 5 <= s['s'] <= fin + 5)
        i2, f2 = snap(segs, ini, fin, p, a.min, a.max)
        texto = ' '.join(s['t'] for s in segs if s['e'] > i2 and s['s'] < f2)
        res.append(dict(ini=max(0, i2), fin=min(dur, f2), pico=p, score=round(float(sc[p]), 2),
                        palabras=txt_words, titulo='', texto=texto))
        print(f'  {hms(p)}  score {sc[p]:.1f}  {texto[:90]}', flush=True)
    res.sort(key=lambda r: -(r['score'] + 0.05 * min(r['palabras'], 40)))
    res = sorted(res[:a.n], key=lambda r: r['ini'])
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(dict(src=a.video, duracion=dur, momentos=res), open(a.out, 'w'), ensure_ascii=False, indent=1)
    np.save(a.out.replace('.json', '_db.npy'), db)
    print('guardado', a.out)


def hms(t):
    t = int(t)
    return f'{t // 3600}:{t // 60 % 60:02d}:{t % 60:02d}'


# ---------------------------------------------------------------- render

def ass_time(t):
    t = max(0, t)
    return f'{int(t // 3600)}:{int(t // 60 % 60):02d}:{t % 60:05.2f}'


def esc(s):
    return s.replace('\\', '').replace('{', '(').replace('}', ')')


def sin_emoji(t):
    # la fuente no trae emojis: se quitan del texto quemado (ponlos en la descripción de TikTok)
    return ''.join(c for c in t if ord(c) < 0x2600 or 0x3000 <= ord(c) < 0xFE00).strip()


def wrap_title(t, n=16):
    words, lines, cur = t.split(), [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > n:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + ' ' + w).strip()
    if cur:
        lines.append(cur)
    return '\\N'.join(lines)


def build_ass(words, dur, titulo, canal, sub_y, path):
    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{FONT},86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,7,3,5,60,60,0,1
Style: Title,{FONT},74,&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,1,0,0,0,100,100,0,0,3,18,0,8,70,70,120,1
Style: Credit,{FONT},40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,0,2,40,40,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if titulo:
        ev.append(f'Dialogue: 1,{ass_time(0)},{ass_time(min(dur, 6.0))},Title,,0,0,0,,'
                  f'{{\\fad(150,300)}}{wrap_title(esc(sin_emoji(titulo).upper()))}')
    if canal:
        ev.append(f'Dialogue: 1,{ass_time(0)},{ass_time(dur)},Credit,,0,0,0,,{esc(canal)}')
    # subtítulos: grupos de hasta 3 palabras, la palabra actual en amarillo
    groups, cur = [], []
    for w in words:
        if cur and (len(cur) >= 3 or w[0] - cur[-1][1] > 0.6 or cur[-1][2][-1:] in '.?!,'):
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    pos = f'{{\\pos({W // 2},{sub_y})}}'
    for gi, g in enumerate(groups):
        g_end = groups[gi + 1][0][0] if gi + 1 < len(groups) else g[-1][1] + 0.4
        g_end = min(g_end, g[-1][1] + 0.8)
        for k, (s, e, _) in enumerate(g):
            e2 = g[k + 1][0] if k + 1 < len(g) else g_end
            txt = ' '.join((f'{{\\c&H00FFFF&}}{esc(t.upper())}{{\\c&HFFFFFF&}}' if j == k else esc(t.upper()))
                           for j, (_, _, t) in enumerate(g))
            pop = '{\\fscx108\\fscy108\\t(0,90,\\fscx100\\fscy100)}' if k == 0 else ''
            ev.append(f'Dialogue: 0,{ass_time(s)},{ass_time(e2)},Sub,,0,0,0,,{pos}{pop}{txt}')
    open(path, 'w').write(hdr + '\n'.join(ev) + '\n')


def layout_filter(modo, sw, sh, cam):
    if modo == 'split':
        cx, cy, cw, ch = cam
        top_h = 700
        bot_h = H - top_h
        # cámara: recorte al aspecto 1080x700
        ta = W / top_h
        if cw / ch > ta:
            nw = int(ch * ta); cx += (cw - nw) // 2; cw = nw
        else:
            nh = int(cw / ta); cy += (ch - nh) // 2; ch = nh
        # juego: recorte central al aspecto 1080x1220
        ba = W / bot_h
        gw = min(sw, int(sh * ba)); gx = (sw - gw) // 2
        return (f'[0:v]split=2[a][b];[a]crop={cw}:{ch}:{cx}:{cy},scale={W}:{top_h}[top];'
                f'[b]crop={gw}:{sh}:{gx}:0,scale={W}:{bot_h}[bot];[top][bot]vstack[v0]'), top_h + 260
    if modo == 'recorte':
        gw = min(sw, int(sh * W / H)); gx = (sw - gw) // 2
        return f'[0:v]crop={gw}:{sh}:{gx}:0,scale={W}:{H}[v0]', int(H * 0.68)
    # blur: juego entero (con un poco de zoom) sobre fondo desenfocado
    fg_h = int(W / sw * sh * 1.18) // 2 * 2
    fg_w = int(W * 1.18) // 2 * 2
    return (f'[0:v]split=2[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},'
            f'boxblur=30:2,eq=brightness=-0.12[bg];[b]scale={fg_w}:{fg_h},crop={W}:{fg_h}[fg];'
            f'[bg][fg]overlay=0:(H-h)/2[v0]'), (H + fg_h) // 2 + 170


def render_clip(video, m, idx, a, sw, sh, tmp):
    ini, fin = m['ini'], m['fin']
    dur = fin - ini
    segs, _ = transcribe(video, ini, fin, words=True, lang=a.idioma)
    words = [(s - ini, e - ini, t) for sg in segs for (s, e, t) in sg['w'] if t]
    modo = a.modo or ('split' if a.cam else 'blur')
    cam = [int(v) for v in a.cam.split(',')] if a.cam else None
    lf, sub_y = layout_filter(modo, sw, sh, cam)
    ass = os.path.join(tmp, f'c{idx}.ass')
    build_ass(words, dur, m.get('titulo', ''), a.canal, sub_y, ass)
    name = m.get('nombre') or f'clip_{idx + 1:02d}_{hms(ini).replace(":", "-")}'
    out = os.path.join(a.outdir, name + '.mp4')
    fc = lf + f';[v0]ass={ass}:fontsdir=/usr/share/fonts/opentype/inter,format=yuv420p[v]'
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{ini:.2f}', '-t', f'{dur:.2f}', '-i', video,
         '-filter_complex', fc, '-map', '[v]', '-map', '0:a:0?',
         '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=%.2f:d=0.4' % max(0, dur - 0.4),
         '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', out])
    srt = out.replace('.mp4', '.srt')
    with open(srt, 'w') as fh:
        for i, sg in enumerate(segs, 1):
            fh.write(f'{i}\n{srt_t(sg["s"] - ini)} --> {srt_t(sg["e"] - ini)}\n{sg["t"]}\n\n')
    print(f'  {out}  ({dur:.0f} s, {modo})', flush=True)
    return out


def srt_t(t):
    t = max(0, t)
    return f'{int(t // 3600):02d}:{int(t // 60 % 60):02d}:{int(t % 60):02d},{int(t * 1000 % 1000):03d}'


def cmd_cortar(a):
    M = json.load(open(a.momentos))
    sw, sh, _ = probe(a.video)
    os.makedirs(a.outdir, exist_ok=True)
    sel = M['momentos']
    if a.solo:
        keep = {int(x) for x in a.solo.split(',')}
        sel = [m for i, m in enumerate(sel, 1) if i in keep]
    with tempfile.TemporaryDirectory() as tmp:
        for i, m in enumerate(sel):
            render_clip(a.video, m, i, a, sw, sh, tmp)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('analizar')
    p.add_argument('video'); p.add_argument('--out', default='work/momentos.json')
    p.add_argument('--n', type=int, default=8)
    p.add_argument('--min', type=float, default=20); p.add_argument('--max', type=float, default=60)
    p.add_argument('--antes', type=float, default=18, help='segundos antes del pico')
    p.add_argument('--despues', type=float, default=12, help='segundos después del pico')
    p.add_argument('--idioma', default='es')
    p = sub.add_parser('cortar')
    p.add_argument('video'); p.add_argument('--momentos', default='work/momentos.json')
    p.add_argument('--outdir', default='entregas/clips'); p.add_argument('--canal', default='')
    p.add_argument('--cam'); p.add_argument('--modo', choices=['blur', 'split', 'recorte'])
    p.add_argument('--solo', help='índices (1..n) de momentos a renderizar, ej. 1,3,4')
    p.add_argument('--idioma', default='es')
    a = ap.parse_args()
    {'analizar': cmd_analizar, 'cortar': cmd_cortar}[a.cmd](a)


if __name__ == '__main__':
    main()
