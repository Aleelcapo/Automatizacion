"""Render a vertical 9:16 narrated short from an EDL json.

EDL format:
{
  "src": "path.mp4", "out": "basename", "voice": "es-MX-JorgeNeural", "rate": "+0%",
  "safe": [x,y,w,h],             # default source region (excludes watermarks/overlays)
  "beats": [ {"text": "...", "gap": 0.3,
              "shots": [ {"t": 12.3, "w": 1, "mode": "full"|"fit", "cx": .5, "cx2": .5,
                          "cy": .5, "z": 1, "z2": 1, "speed": 1, "safe": [..]} ] } ]
}
"""
import sys, os, json, math, re, subprocess, asyncio, wave
import numpy as np, cv2
import edge_tts

FPS = 30
W, H = 1080, 1920
SR = 48000


def run(cmd):
    subprocess.run(cmd, check=True)


async def tts_async(text, voice, rate, mp3):
    com = edge_tts.Communicate(text, voice, rate=rate, proxy=os.environ.get('HTTPS_PROXY'),
                               boundary='WordBoundary')
    words = []
    with open(mp3, 'wb') as fh:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                fh.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append((ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']))
    return words


def tts(text, voice, rate, base):
    mp3, wav, js = base + '.mp3', base + '.wav', base + '.json'
    key = json.dumps([text, voice, rate])
    if os.path.exists(js) and os.path.exists(wav):
        d = json.load(open(js))
        if d['key'] == key:
            return d['words'], wav
    nw = len(text.split())
    for attempt in range(6):
        try:
            words = asyncio.run(tts_async(text, voice, rate, mp3))
            run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', str(SR), wav])
            dur = len(read_wav(wav)) / SR
            if dur > 0.2 * nw and len(words) >= 0.6 * nw:
                break
            print('tts too short, retry', dur, len(words), nw)
        except Exception as e:
            print('tts retry', e)
    else:
        raise SystemExit('TTS failed: ' + text[:40])
    json.dump(dict(key=key, words=words), open(js, 'w'))
    return words, wav


def read_wav(p):
    with wave.open(p) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return a


def trim_silence(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a, 0
    s = max(0, idx[0] - int(0.03 * SR))
    e = min(len(a), idx[-1] + int(0.08 * SR))
    return a[s:e], s / SR


def norm(w):
    return re.sub(r'[^\wáéíóúüñ]', '', w.lower())


def align_words(text, words):
    """Map tts word boundaries onto script tokens (keeps punctuation for subtitles)."""
    toks = text.split()
    out = []
    j = 0
    for (s, e, wt) in words:
        nw = norm(wt)
        # find token matching starting at j
        k = j
        acc = ''
        found = None
        while k < len(toks) and k < j + 4:
            acc += norm(toks[k])
            if acc == nw or norm(toks[k]) == nw:
                found = k
                break
            if nw.startswith(acc):
                k += 1
                continue
            break
        if found is None:
            # fall back: next token
            found = j if j < len(toks) else None
            if found is None:
                continue
            out.append((s, e, toks[found]))
            j = found + 1
        else:
            out.append((s, e, ' '.join(toks[j:found + 1])))
            j = found + 1
    if j < len(toks) and out:
        s, e, t = out[-1]
        out[-1] = (s, e, t + ' ' + ' '.join(toks[j:]))
    return out


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def build_cues(words, maxc=38):
    cues = []
    cur = []
    for (s, e, t) in words:
        txt = ' '.join(x[2] for x in cur)
        if cur and len(txt) + 1 + len(t) > maxc:
            cues.append(cur)
            cur = []
        cur.append((s, e, t))
        txt = ' '.join(x[2] for x in cur)
        if t[-1] in '.?!…' or (t[-1] in ',;:' and len(txt) >= 18):
            cues.append(cur)
            cur = []
    if cur:
        cues.append(cur)
    # merge orphan fragments (one short word) into the previous cue
    merged = []
    for c in cues:
        txt = ' '.join(x[2] for x in c)
        if merged and len(txt) < 10:
            prev = ' '.join(x[2] for x in merged[-1])
            if prev[-1] not in '.?!…' and len(prev) + 1 + len(txt) <= 48:
                merged[-1] = merged[-1] + c
                continue
        merged.append(c)
    cues = merged
    res = []
    for i, c in enumerate(cues):
        s = c[0][0]
        e = c[-1][1] + 0.25
        if i + 1 < len(cues):
            e = min(e, cues[i + 1][0][0] - 0.02)
        res.append((s, e, ' '.join(x[2] for x in c)))
    return res


class Src:
    def __init__(self, path):
        self.path = path
        pr = json.loads(subprocess.check_output(
            ['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries',
             'stream=width,height,r_frame_rate', '-of', 'json', path]))['streams'][0]
        self.w, self.h = pr['width'], pr['height']
        a, b = pr['r_frame_rate'].split('/')
        self.fps = int(a) / int(b)

    def frames(self, t0, n):
        cmd = ['ffmpeg', '-v', 'error', '-ss', f'{t0:.3f}', '-i', self.path, '-frames:v', str(n),
               '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-']
        raw = subprocess.run(cmd, capture_output=True, check=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, self.h, self.w, 3)
        return fr


def lerp(a, b, p):
    return a + (b - a) * p


def sharpen(img, amt=0.35, sigma=2.0):
    bl = cv2.GaussianBlur(img, (0, 0), sigma)
    return cv2.addWeighted(img, 1 + amt, bl, -amt, 0)


def render_full(reg, sh, p):
    h, w = reg.shape[:2]
    z = lerp(sh.get('z', 1.0), sh.get('z2', sh.get('z', 1.0)), p)
    ch = h / z
    cw = ch * 9 / 16
    if cw > w:
        cw = w
        ch = cw * 16 / 9
    cx = lerp(sh.get('cx', .5), sh.get('cx2', sh.get('cx', .5)), p) * w
    cy = lerp(sh.get('cy', .5), sh.get('cy2', sh.get('cy', .5)), p) * h
    x0 = min(max(cx - cw / 2, 0), w - cw)
    y0 = min(max(cy - ch / 2, 0), h - ch)
    s = W / cw
    M = np.float32([[s, 0, -x0 * s], [0, s, -y0 * s]])
    out = cv2.warpAffine(reg, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    return sharpen(out)


def render_fit(reg, sh, p):
    h, w = reg.shape[:2]
    # blurred background (cover)
    sb = max(270 / w, 480 / h)
    small = cv2.resize(reg, (max(270, int(math.ceil(w * sb))), max(480, int(math.ceil(h * sb)))),
                       interpolation=cv2.INTER_AREA)
    oy = (small.shape[0] - 480) // 2
    ox = (small.shape[1] - 270) // 2
    small = small[oy:oy + 480, ox:ox + 270]
    small = cv2.GaussianBlur(small, (0, 0), 9)
    bg = cv2.resize(small, (W, H), interpolation=cv2.INTER_LINEAR)
    bg = (bg.astype(np.float32) * 0.55).astype(np.uint8)
    # foreground with optional gentle zoom (crop into region)
    z = lerp(sh.get('z', 1.0), sh.get('z2', sh.get('z', 1.0)), p)
    cw, ch = w / z, h / z
    fa = sh.get('fa', 1.3)
    if cw / ch > fa:
        cw = ch * fa
    cx = lerp(sh.get('cx', .5), sh.get('cx2', sh.get('cx', .5)), p) * w
    cy = lerp(sh.get('cy', .5), sh.get('cy2', sh.get('cy', .5)), p) * h
    x0 = min(max(cx - cw / 2, 0), w - cw)
    y0 = min(max(cy - ch / 2, 0), h - ch)
    s = W / cw
    fh = int(round(ch * s))
    if fh > H:
        s = H / ch
        fh = H
    fw = int(round(cw * s))
    M = np.float32([[s, 0, -x0 * s], [0, s, -y0 * s]])
    fg = cv2.warpAffine(reg, M, (fw, fh), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    fg = sharpen(fg, 0.3, 1.5)
    yo = (H - fh) // 2 + int(sh.get('yoff', 0))
    xo = (W - fw) // 2
    bg[yo:yo + fh, xo:xo + fw] = fg
    return bg


def main(edl_path, outdir, preview=False):
    edl = json.load(open(edl_path))
    base = os.path.dirname(os.path.abspath(edl_path))
    def P(x):
        return x if os.path.isabs(x) else os.path.join(base, x)
    if 'sources' in edl:
        SRCS = {k: Src(P(v['path'])) for k, v in edl['sources'].items()}
        CUTS = {k: (json.load(open(P(v['cuts'])))['cuts'] if v.get('cuts') else []) for k, v in edl['sources'].items()}
        SAFE = {k: v.get('safe') for k, v in edl['sources'].items()}
    else:
        SRCS = {'_': Src(P(edl['src']))}
        CUTS = {'_': json.load(open(P(edl['cuts'])))['cuts'] if edl.get('cuts') else []}
        SAFE = {'_': edl.get('safe')}
    name = edl['out']
    tmp = os.path.join(outdir, name + '_tmp')
    os.makedirs(tmp, exist_ok=True)

    voice = edl.get('voice', 'es-MX-JorgeNeural')
    rate = edl.get('rate', '+0%')
    lead = edl.get('lead', 0.25)
    tail = edl.get('tail', 0.8)

    # 1) TTS
    t = lead
    audio_parts = []
    all_words = []
    for i, b in enumerate(edl['beats']):
        words, wav = tts(b['text'], voice, b.get('rate', rate), os.path.join(tmp, f'b{i:02d}'))
        a = read_wav(wav)
        a, off = trim_silence(a)
        b['start'] = t
        b['adur'] = len(a) / SR
        b['dur'] = b['adur'] + b.get('gap', edl.get('gap', 0.3))
        audio_parts.append((t, a))
        for (s, e, wt) in align_words(b['text'], words):
            all_words.append((t + s - off, t + e - off, wt))
        t += b['dur']
    total = t + tail
    nframes = int(round(total * FPS))
    # first beat starts at 0 visually
    edl['beats'][0]['vstart'] = 0.0
    for b in edl['beats'][1:]:
        b['vstart'] = b['start']
    # 2) shots → global frame ranges
    shots = []
    for i, b in enumerate(edl['beats']):
        vs = b['vstart']
        ve = edl['beats'][i + 1]['vstart'] if i + 1 < len(edl['beats']) else total
        ws = [s.get('w', 1) for s in b['shots']]
        acc = vs
        for s, wgt in zip(b['shots'], ws):
            d = (ve - vs) * wgt / sum(ws)
            s['g0'] = acc
            s['g1'] = acc + d
            acc += d
            s['beat'] = i
            shots.append(s)
    errors = []
    for s in shots:
        s.setdefault('src', '_')
        cuts = CUTS[s['src']]
        for (c0, c1) in cuts:
            if c0 - 0.02 <= s['t'] <= c1 + 0.02:
                s['t'] = round(c1 + 0.1, 3)
        if 'end' not in s and edl.get('autoend', False):
            nxt = [c0 for (c0, c1) in cuts if c0 > s['t'] + 0.05]
            s['end'] = round(min(nxt) - 0.1, 3) if nxt else s['t'] + 10

        s['f0'] = int(round(s['g0'] * FPS))
        s['f1'] = int(round(s['g1'] * FPS))
        s['n'] = s['f1'] - s['f0']
        if 'end' in s and 'speed' not in s:
            avail = s['end'] - s['t']
            s['speed'] = min(1.0, avail / (s['n'] / FPS))
            if s['speed'] < 0.5:
                errors.append(f"beat {s['beat']} {s['src']} shot@{s['t']:.2f} needs speed {s['speed']:.2f} (too slow)")
        sp = s.get('speed', 1.0)
        need = s['n'] / FPS * sp
        a0, a1 = s['t'], s['t'] + need
        s['src_end'] = a1
        for (c0, c1) in CUTS[s['src']]:
            if c1 > a0 + 0.02 and c0 < a1 - 0.02:
                errors.append(f"beat {s['beat']} {s['src']} shot@{s['t']:.2f} len {need:.2f} crosses cut {c0:.2f}-{c1:.2f}")
    report = [dict(beat=s['beat'], src=s['src'], t=s['t'], speed=round(s.get('speed', 1.0), 2), src_end=round(s['src_end'], 2), dur=round(s['n'] / FPS, 2),
                   mode=s.get('mode', 'full'), at=round(s['g0'], 2)) for s in shots]
    json.dump(dict(total=total, shots=report, errors=errors), open(os.path.join(outdir, name + '_plan.json'), 'w'), indent=1)
    if errors:
        print('\n'.join(errors))
        print('PLAN HAS ERRORS; total', round(total, 2))
        if not edl.get('force'):
            sys.exit(2)
    print('total duration', round(total, 2), 'shots', len(shots))

    # 3) audio mix
    mix = np.zeros(int(math.ceil(nframes / FPS * SR)) + SR, np.float32)
    for (st, a) in audio_parts:
        i0 = int(round(st * SR))
        mix[i0:i0 + len(a)] += a[:len(mix) - i0]
    mix = mix[:int(round(nframes / FPS * SR))]
    rawwav = os.path.join(tmp, 'voice_raw.wav')
    with wave.open(rawwav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    # two-pass loudnorm to -16 LUFS / -1.5 dBTP
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', rawwav, '-af',
                           'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rfind('{'):meas.rfind('}') + 1])
    normwav = os.path.join(tmp, 'voice.wav')
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
          f"aresample={SR},afade=t=out:st={nframes / FPS - 0.3:.3f}:d=0.3")
    run(['ffmpeg', '-v', 'error', '-y', '-i', rawwav, '-af', af, '-ar', str(SR), '-ac', '2', normwav])

    # 4) SRT + TXT
    cues = build_cues(all_words)
    with open(os.path.join(outdir, name + '.srt'), 'w', encoding='utf-8') as fh:
        for i, (s, e, txt) in enumerate(cues, 1):
            fh.write(f'{i}\n{srt_time(s)} --> {srt_time(e)}\n{txt}\n\n')
    with open(os.path.join(outdir, name + '.txt'), 'w', encoding='utf-8') as fh:
        fh.write(edl.get('title', name) + '\n\n')
        fh.write('\n\n'.join(b['text'] for b in edl['beats']) + '\n')

    if '--srt-only' in sys.argv:
        print('srt only'); return
    # 5) video
    vtmp = os.path.join(tmp, 'video.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}',
                            '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium' if not preview else 'ultrafast',
                            '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), vtmp], stdin=subprocess.PIPE)
    written = 0
    for s in shots:
        n = s['n']
        if s is shots[-1]:
            n = nframes - written
        sp = s.get('speed', 1.0)
        src = SRCS[s['src']]
        need = int(math.ceil(n / FPS * sp * src.fps)) + 2
        fr = src.frames(s['t'], need)
        if len(fr) == 0:
            raise SystemExit(f'no frames at {s["t"]}')
        x, y, w, h = s.get('safe') or SAFE[s['src']] or [0, 0, src.w, src.h]
        for k in range(n):
            p = k / max(1, n - 1)
            idx = min(len(fr) - 1, int(k / FPS * sp * src.fps + 1e-6))
            reg = fr[idx][y:y + h, x:x + w]
            if s.get('mode', 'full') == 'full':
                img = render_full(reg, s, p)
            else:
                img = render_fit(reg, s, p)
            enc.stdin.write(img.tobytes())
            written += 1
    enc.stdin.close()
    enc.wait()
    assert written == nframes, (written, nframes)
    final = os.path.join(outdir, name + '.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-i', vtmp, '-i', normwav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final])
    print('wrote', final, round(nframes / FPS, 2), 's')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], preview='--preview' in sys.argv)
