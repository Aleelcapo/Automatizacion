"""Construye un short de caricaturas 3D a partir de una historia JSON.

Uso:
  python3 build.py historias/x.json            # video final en entregas/
  python3 build.py historias/x.json --stills   # solo fotogramas de revisión (inicio/medio/final de cada plano)

Historia:
{
  "out": "nombre", "title": "...", "voice": "es-MX-JorgeNeural", "rate": "+10%",
  "look": {"skin": "white"},                       # estilo de caras del canal
  "scenes": {"calle": {"set": {...}, "actors": [...], "props": [...]}},
  "beats": [ {"text": "frase narrada", "shots": [
      {"scene": "calle", "from": "palabra", "cam": {...},
       "do": [{"on": "palabra", "target": "ana", "pose": "point", "expr": "panic", "sfx": "pop"}]} ]} ]
}
"""
import sys, os, json, math, re, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
from render import tts, read_wav, trim_silence, align_words, build_cues, srt_time, norm, SR  # noqa: E402

FPS = 30


def word_time(words, beat_t, key, after=0.0):
    """Inicio global de la primera palabra del beat que empieza por `key` (a partir de `after`)."""
    k = norm(key)
    for (s, e, w) in words:
        if s + 1e-6 >= after and norm(w).startswith(k):
            return s
    raise SystemExit(f'palabra "{key}" no encontrada en: {" ".join(w for _, _, w in words)}')


def caption_groups(words, hl_words):
    groups, cur = [], []
    for (s, e, w) in words:
        txt = ' '.join(x[2] for x in cur + [(s, e, w)])
        if cur and (len(txt) > 15 or len(cur) >= 3):
            groups.append(cur); cur = []
        cur.append((s, e, w))
        if w[-1] in '.,;:?!…':
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    out = []
    for i, g in enumerate(groups):
        t0 = g[0][0]
        t1 = groups[i + 1][0][0] if i + 1 < len(groups) else g[-1][1] + .4
        t1 = min(t1, g[-1][1] + .6)
        text = ' '.join(x[2] for x in g)
        hl = any(re.search(r'\d', x[2]) or norm(x[2]) in hl_words for x in g)
        out.append(dict(t0=round(t0, 3), t1=round(t1, 3), text=text, hl=hl))
    return out


# ---------------------------------------------------------------- efectos de sonido sintetizados
def env(n, a=.004, r=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a)
    if r:
        e *= np.exp(-t / r)
    return e


def sfx(name):
    rnd = np.random.default_rng(len(name))
    if name == 'pop':
        n = int(.09 * SR); t = np.arange(n) / SR
        f = 500 + 1400 * t / t[-1]
        return .55 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .03)
    if name == 'tick':
        n = int(.012 * SR); return .35 * rnd.standard_normal(n) * env(n, .0005, .002)
    if name == 'ding':
        n = int(1.0 * SR); t = np.arange(n) / SR
        return .3 * (np.sin(2 * np.pi * 1320 * t) + .4 * np.sin(2 * np.pi * 2640 * t) + .2 * np.sin(2 * np.pi * 3960 * t)) * env(n, .002, .25)
    if name == 'whoosh':
        n = int(.38 * SR); x = rnd.standard_normal(n)
        y = np.zeros(n); a = 0
        for i in range(n):  # paso bajo que se abre y se cierra
            k = .02 + .25 * math.sin(math.pi * i / n)
            a += k * (x[i] - a); y[i] = a
        return .9 * y * np.sin(np.pi * np.arange(n) / n) ** 2
    if name in ('thud', 'stamp'):
        n = int(.25 * SR); t = np.arange(n) / SR
        return .8 * np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * env(n, .001, .06) + .15 * rnd.standard_normal(n) * env(n, .0005, .01)
    if name == 'horn':
        n = int(.45 * SR); t = np.arange(n) / SR
        w = np.sign(np.sin(2 * np.pi * 415 * t)) + np.sign(np.sin(2 * np.pi * 520 * t))
        return .12 * w * np.minimum(1, t / .01) * np.minimum(1, (t[-1] - t) / .03)
    if name == 'boing':
        n = int(.35 * SR); t = np.arange(n) / SR
        f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6)
        return .35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .003, .15)
    if name == 'brake':
        n = int(.6 * SR); t = np.arange(n) / SR
        return .1 * np.sin(2 * np.pi * (1900 + 80 * np.sin(2 * np.pi * 23 * t)) * t) * np.minimum(1, t / .03) * np.minimum(1, (t[-1] - t) / .1)
    if name == 'crowd':
        n = int(1.2 * SR); x = rnd.standard_normal(n); y = np.convolve(x, np.ones(40) / 40, 'same')
        return .5 * y * np.sin(np.pi * np.arange(n) / n)
    raise SystemExit('sfx desconocido: ' + name)


def main(story_path, stills=False, workers=3):
    story = json.load(open(story_path))
    name = story['out']
    work = os.path.join(HERE, 'out', name)
    os.makedirs(work, exist_ok=True)
    voice, rate = story.get('voice', 'es-MX-JorgeNeural'), story.get('rate', '+10%')
    gap, lead, tail = story.get('gap', .18), story.get('lead', .3), story.get('tail', 1.0)

    # 1) voz por beat y tiempos de cada palabra
    t = lead
    parts, all_words = [], []
    for i, b in enumerate(story['beats']):
        words, wav = tts(b['text'], voice, b.get('rate', rate), os.path.join(work, f'b{i:02d}'))
        a, off = trim_silence(read_wav(wav))
        b['_start'] = t
        b['_words'] = [(t + s - off, t + e - off, w) for (s, e, w) in align_words(b['text'], words)]
        all_words += b['_words']
        parts.append((t, a))
        t += len(a) / SR + b.get('gap', gap)
    total = t + tail

    # 2) planos y acciones
    shots, actions, sounds = [], [], []
    ptypes = {f'{sc}.{p["id"]}': p['type'] for sc, v in story['scenes'].items() for p in v.get('props', [])}
    beats = story['beats']
    for i, b in enumerate(beats):
        vs = 0.0 if i == 0 else b['_start'] - .04
        ve = (beats[i + 1]['_start'] - .04) if i + 1 < len(beats) else total
        ss = b['shots']
        starts = [None] * len(ss)
        starts[0] = vs
        for k, s in enumerate(ss[1:], 1):
            if 'from' in s:
                starts[k] = word_time(b['_words'], b['_start'], s['from']) - .05
        known = [k for k in range(len(ss)) if starts[k] is not None] + [len(ss)]
        bounds = starts + [ve]
        for a_, b_ in zip(known, known[1:]):
            for k in range(a_ + 1, b_):
                bounds[k] = bounds[a_] + (bounds[b_] - bounds[a_]) * (k - a_) / (b_ - a_)
        for k, s in enumerate(ss):
            t0, t1 = bounds[k], bounds[k + 1]
            shots.append(dict(t0=round(t0, 3), t1=round(t1, 3), scene=s['scene'], cam=s.get('cam', {}), beat=i))
            for a in s.get('do', []):
                a = dict(a)
                if 'on' in a:
                    at = word_time(b['_words'], b['_start'], a.pop('on')) - a.pop('lead', .13)
                else:
                    at = t0 + a.pop('at', 0)
                tg = a.pop('target')
                a['target'] = tg if '.' in tg else f"{s['scene']}.{tg}"
                a['t'] = round(at, 3)
                snd = a.pop('sfx', None)
                if snd:
                    sounds.append((at + .1 if snd != 'whoosh' else at - .15, snd, a.pop('vol', 1)))
                if a.get('pop'):
                    sounds.append((at, 'pop', .8))
                if a.get('stamp'):
                    sounds.append((at, 'stamp', 1))
                ptype = ptypes.get(a['target'])
                if (a.get('value') is not None and ptype in ('led', 'gauge')) or (a.get('time') and ptype == 'clock'):
                    d = a.get('dur', 1)
                    for k2 in range(int(d / .07)):
                        sounds.append((at + k2 * .07, 'tick', .5))
                    sounds.append((at + d, 'ding', .6))
                actions.append(a)
    for k in range(1, len(shots)):
        if shots[k]['scene'] != shots[k - 1]['scene']:
            sounds.append((shots[k]['t0'] - .17, 'whoosh', .55))
    for s in story.get('sfx', []):
        sounds.append((word_time(all_words, 0, s['on']) + s.get('offset', 0), s['sfx'], s.get('vol', 1)))

    hl = {norm(w) for w in story.get('highlight', [])}
    captions = caption_groups(all_words, hl)
    scenes = story['scenes']
    tl = dict(fps=FPS, width=1080, height=1920, duration=round(total, 3), story=dict(look=story.get('look', {}), scenes=scenes),
              shots=shots, actions=actions, captions=captions, captionY=story.get('captionY', .7))
    tlp = os.path.join(work, 'timeline.json')
    json.dump(tl, open(tlp, 'w'), ensure_ascii=False, indent=1)
    print(f'duración {total:.1f}s, {len(shots)} planos ({total / len(shots):.2f}s por plano), {len(actions)} acciones, {len(all_words)} palabras')

    if stills:
        d = os.path.join(work, 'stills')
        subprocess.run(['rm', '-rf', d])
        subprocess.run(['node', os.path.join(HERE, 'render.js'), tlp, 'x', '--stills', d], check=True)
        # hojas de contacto: una fila por plano (inicio, medio, final)
        fs = sorted(f for f in os.listdir(d) if f.endswith('.jpg'))
        rows = [fs[i:i + 3] for i in range(0, len(fs), 3)]
        for j in range(0, len(rows), 4):
            grp = rows[j:j + 4]
            inputs, filt = [], []
            for r_, row in enumerate(grp):
                for c_, f in enumerate(row):
                    inputs += ['-i', os.path.join(d, f)]
            n = len(inputs) // 2
            layout = '|'.join(f'{c_ * 270}_{r_ * 480}' for r_ in range(len(grp)) for c_ in range(len(grp[r_])))
            filt = ''.join(f'[{k}:v]scale=270:480[v{k}];' for k in range(n)) + ''.join(f'[v{k}]' for k in range(n)) + f'xstack=inputs={n}:layout={layout}:fill=black'
            subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', filt, os.path.join(work, f'hoja_{j // 4}.jpg')], check=True)
        print('hojas en', work)
        return

    # 3) audio: voz + efectos (+ música opcional con ducking)
    n = int(math.ceil(total * SR))
    voice_mix = np.zeros(n, np.float32)
    for (st, a) in parts:
        i0 = int(st * SR); voice_mix[i0:i0 + len(a)] += a[:n - i0]
    fx = np.zeros(n, np.float32)
    cache = {}
    for (st, nm, vol) in sounds:
        if nm not in cache:
            cache[nm] = sfx(nm).astype(np.float32)
        x = cache[nm] * vol
        i0 = max(0, int(st * SR))
        fx[i0:i0 + len(x)] += x[:max(0, n - i0)]
    mix = voice_mix + fx * story.get('sfx_gain', .32)
    raw = os.path.join(work, 'mix_raw.wav')
    with wave.open(raw, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    audio = os.path.join(work, 'mix.wav')
    af = f'loudnorm=I=-15:TP=-1.5:LRA=11,afade=t=out:st={total - .4:.2f}:d=0.4'
    if story.get('music'):
        mp = os.path.join(os.path.dirname(os.path.abspath(story_path)), story['music'])
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-stream_loop', '-1', '-i', mp, '-filter_complex',
                        f'[1:a]volume={story.get("music_gain", .12)}[m];[m][0:a]sidechaincompress=threshold=.03:ratio=6:release=400[md];[0:a][md]amix=inputs=2:duration=first:normalize=0,{af}',
                        '-ar', str(SR), '-ac', '2', audio], check=True)
    else:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', str(SR), '-ac', '2', audio], check=True)

    # 4) subtítulos y guion
    ent = os.path.join(REPO, 'entregas')
    cues = build_cues(all_words)
    with open(os.path.join(ent, name + '.srt'), 'w', encoding='utf-8') as fh:
        for i, (s, e, txt) in enumerate(cues, 1):
            fh.write(f'{i}\n{srt_time(s)} --> {srt_time(e)}\n{txt}\n\n')
    with open(os.path.join(ent, name + '.txt'), 'w', encoding='utf-8') as fh:
        fh.write(story.get('title', name) + '\n\n' + '\n\n'.join(b['text'] for b in beats) + '\n')
        if story.get('sources'):
            fh.write('\nFuentes:\n' + '\n'.join('- ' + s for s in story['sources']) + '\n')

    # 5) video
    vid = os.path.join(work, 'video.mp4')
    subprocess.run(['node', os.path.join(HERE, 'render.js'), tlp, vid, '--workers', str(workers)], check=True)
    final = os.path.join(ent, name + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', vid, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final], check=True)
    print('listo:', final)


if __name__ == '__main__':
    a = sys.argv[1:]
    w = int(a[a.index('--workers') + 1]) if '--workers' in a else 3
    main(a[0], stills='--stills' in a, workers=w)
