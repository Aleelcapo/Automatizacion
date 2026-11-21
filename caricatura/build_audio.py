"""Voz (edge-tts), línea de tiempo y mezcla de audio para el corto caricatura.

python3 build_audio.py WORKDIR   -> WORKDIR/timeline.json, WORKDIR/mix.wav, guion y SRT en entregas/
"""
import sys, os, json, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'herramientas'))
from render import tts, read_wav, trim_silence, align_words, srt_time, norm  # noqa: E402

SR, FPS = 48000, 30
VOICE, RATE = 'es-MX-JorgeNeural', '+22%'
OUT = 'Hitler_3_errores_caricatura'

BEATS = [
    ('paris', 'En 1940, Hitler se paseaba por París.'),
    ('bunker', 'Cinco años después, estaba escondido en un búnker.'),
    ('hook', '¿Cómo se pierde así una guerra? Con tres errores.'),
    ('dunkRank', 'Número tres: Dunkerque.'),
    ('beach', 'Casi 400.000 soldados aliados, atrapados en una playa.'),
    ('tank', 'Los tanques alemanes estaban a punto de llegar...'),
    ('halt', 'y Hitler les ordenó: ¡alto!'),
    ('boats', 'Tres días parados. Mientras, los ingleses mandaron todo lo que flotaba: pesqueros, yates, ferris.'),
    ('escape', 'Así escaparon 338.000 soldados.'),
    ('barbRank', 'Número dos: Rusia, 1941.'),
    ('march', 'La invadió con tres millones de soldados. Quería ganar antes del invierno.'),
    ('moscow', 'Llegó a las puertas de Moscú... y llegó el invierno.'),
    ('cold', 'Cuarenta bajo cero. Y sus soldados, sin ropa de invierno.'),
    ('helmets', 'Casi cuatro de cada cinco alemanes caídos en la guerra murieron en ese frente.'),
    ('stalRank', 'Y el número uno: Stalingrado, 1942.'),
    ('ring', 'Los soviéticos rodearon a su Sexto Ejército: más de 250.000 hombres.'),
    ('paulus', 'Su general pidió permiso para escapar.'),
    ('no', 'Hitler dijo que no: había que resistir.'),
    ('prisoners', 'Se rindieron 91.000. Solo unos cinco mil volvieron a casa.'),
    ('scale', '¿Perdió por sus errores, o por pelear contra medio mundo?'),
    ('verdict', 'Muchos historiadores creen que esa guerra ya estaba perdida. Pero estos errores aceleraron su caída.'),
    ('cta', 'Envíaselo a ese amigo que ve documentales de guerra a las tres de la mañana.'),
]
GAP = {'hook': 0.35, 'escape': 0.3, 'helmets': 0.35, 'prisoners': 0.35, 'tank': 0.0}
DEFAULT_GAP = 0.1


# ------------------------------------------------------------------ síntesis
rng = np.random.default_rng(5)


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def pluck(freq, dur, bright=0.5):
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * (0.994 + 0.005 * bright)
    return out


def tone(freq, dur, kind='sq', a=0.005, r=0.2):
    t = np.arange(int(dur * SR)) / SR
    if kind == 'sq':
        s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.6 + 0.4 * np.sin(2 * np.pi * freq * t)
    else:
        s = np.sin(2 * np.pi * freq * t)
    return s * env(len(t), a, r)


def noise(dur, lp=None):
    x = rng.normal(0, 1, int(dur * SR))
    if lp:
        k = np.ones(lp) / lp
        x = np.convolve(x, k, 'same')
    return x


def music(total):
    """Marcha juguetona en Re menor: bajo pizzicato + melodía de silbato + caja."""
    bpm = 112
    beat = 60 / bpm
    out = np.zeros(int(total * SR) + SR * 2)
    def put(at, sig, gain):
        s = int(at * SR)
        if s < len(out):
            e = min(len(out), s + len(sig)); out[s:e] += gain * sig[:e - s]
    D = 146.83
    semis = lambda k: D * 2 ** (k / 12)
    bass_prog = [0, 0, 5, 5, 3, 3, 7, 7]  # Re Re Sol Sol Fa Fa La La
    mel = [12, None, 15, 12, 17, None, 15, 12, 10, None, 12, 15, 19, 17, 15, None]
    snare = noise(0.18, 3) * env(int(0.18 * SR), 0.001, 0.05)
    kick_t = np.arange(int(0.25 * SR)) / SR
    kick = np.sin(2 * np.pi * (50 * kick_t + 60 * (1 - np.exp(-kick_t * 30)) / 30)) * np.exp(-kick_t * 14)
    nb = int(total / beat) + 1
    cache = {}
    for b in range(nb):
        at = b * beat
        bar = b // 4
        root = bass_prog[(b // 2) % len(bass_prog)]
        f = semis(root - 12)
        if f not in cache: cache[f] = pluck(f, 0.5)
        put(at, cache[f], 0.55 if b % 2 == 0 else 0.35)
        put(at, kick, 0.35 if b % 2 == 0 else 0.0)
        put(at + beat * 0.5, snare, 0.12 if b % 2 else 0.05)
        if bar % 4 != 3:
            for h in (0, 1):
                k = mel[(b * 2 + h) % len(mel)]
                if k is not None:
                    put(at + h * beat / 2, tone(semis(k), beat * 0.48, 'sq', 0.004, 0.09), 0.07)
    return out[:int(total * SR)]


def sfx_whoosh():
    n = int(0.45 * SR)
    x = noise(0.45, 25) * np.sin(np.pi * np.arange(n) / n) ** 2
    return x / np.abs(x).max()


def sfx_boom():
    t = np.arange(int(1.2 * SR)) / SR
    x = np.sin(2 * np.pi * (36 * t + 60 * (1 - np.exp(-t * 7)) / 7)) * np.exp(-t * 3) + 0.4 * noise(1.2, 4) * np.exp(-t * 16)
    return x / np.abs(x).max()


def sfx_pop():
    t = np.arange(int(0.12 * SR)) / SR
    x = np.sin(2 * np.pi * (900 - 3000 * t) * t) * np.exp(-t * 40)
    return x


def sfx_screech():
    t = np.arange(int(0.8 * SR)) / SR
    x = (np.sin(2 * np.pi * (1900 + 300 * np.sin(t * 40)) * t) * 0.5 + noise(0.8, 2) * 0.5) * np.exp(-t * 3)
    return x / np.abs(x).max()


def sfx_rumble(d):
    t = np.arange(int(d * SR)) / SR
    x = noise(d, 120) * (0.6 + 0.4 * np.sin(2 * np.pi * 8 * t)) + 0.4 * np.sign(np.sin(2 * np.pi * 42 * t))
    x *= np.minimum(1, np.minimum(t / 0.3, (d - t) / 0.3))
    return x / np.abs(x).max()


def sfx_wind(d):
    t = np.arange(int(d * SR)) / SR
    x = noise(d, 60) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t + 1))
    x *= np.minimum(1, np.minimum(t / 0.6, (d - t) / 0.6))
    return x / np.abs(x).max()


def sfx_slam():
    t = np.arange(int(0.5 * SR)) / SR
    x = np.sin(2 * np.pi * 80 * t) * np.exp(-t * 12) + noise(0.5, 3) * np.exp(-t * 30)
    return x / np.abs(x).max()


def sfx_bell():
    t = np.arange(int(1.5 * SR)) / SR
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in ((880, 3), (1320, 4), (2210, 6)))
    return x / np.abs(x).max()


def main(work):
    os.makedirs(work, exist_ok=True)
    beats, start, parts = [], 0.25, []
    for i, (bid, text) in enumerate(BEATS):
        words, wav = tts(text, VOICE, RATE, os.path.join(work, f'v{i:02d}_{bid}'))
        a, off = trim_silence(read_wav(wav))
        al = [(round(s - off, 3), round(e - off, 3), tok) for s, e, tok in align_words(text, words)]
        dur = len(a) / SR + GAP.get(bid, DEFAULT_GAP) + (1.5 if i == len(BEATS) - 1 else 0)
        beats.append(dict(id=bid, text=text, start=round(start, 4), dur=round(dur, 4), words=al))
        parts.append((start, a))
        start += dur
    total = start
    nframes = int(np.ceil(total * FPS))
    total = nframes / FPS
    print('duración', round(total, 2), 's', nframes, 'fotogramas')
    json.dump(dict(fps=FPS, total=total, frames=nframes, beats=beats), open(os.path.join(work, 'timeline.json'), 'w'), ensure_ascii=False)

    n = int(total * SR)
    voice = np.zeros(n + SR)
    for st, a in parts:
        s = int(st * SR); voice[s:s + len(a)] += a / max(1e-6, np.abs(a).max()) * 0.85
    voice = voice[:n]
    sfx = np.zeros(n + 3 * SR)
    def put(at, sig, gain):
        s = int(max(0, at) * SR); e = min(len(sfx), s + len(sig)); sfx[s:e] += gain * sig[:e - s]
    bd = {b['id']: b for b in beats}
    def wt(bid, word, k=1):
        c = 0
        for s, e, tok in bd[bid]['words']:
            if norm(word) in norm(tok):
                c += 1
                if c == k: return bd[bid]['start'] + s
        return bd[bid]['start'] + bd[bid]['dur'] * 0.5
    for b in beats[1:]:
        put(b['start'] - 0.18, sfx_whoosh(), 0.25)
    for r in ('dunkRank', 'barbRank', 'stalRank'):
        put(bd[r]['start'], sfx_boom(), 0.8)
    put(wt('hook', 'tres'), sfx_pop(), 0.5); put(wt('hook', 'tres') + 0.2, sfx_pop(), 0.5); put(wt('hook', 'tres') + 0.4, sfx_pop(), 0.5)
    put(bd['tank']['start'], sfx_rumble(bd['tank']['dur'] + 0.4), 0.35)
    put(wt('halt', 'alto') - 0.05, sfx_screech(), 0.45)
    put(bd['moscow']['start'] + bd['moscow']['dur'] * 0.5, sfx_wind(bd['moscow']['dur'] * 0.5 + bd['cold']['dur']), 0.3)
    put(wt('no', 'no') - 0.05, sfx_slam(), 0.8)
    put(bd['helmets']['start'], sfx_bell(), 0.25)
    put(wt('cta', 'tres'), sfx_bell(), 0.2)
    sfx = sfx[:n]
    mus = music(total)
    # ducking bajo la voz
    envv = np.convolve(np.abs(voice), np.ones(4800) / 4800, 'same')
    duck = 1 - 0.55 * np.clip(envv / (envv.max() * 0.25), 0, 1)
    fade = np.clip(np.minimum(np.arange(n) / SR / 0.8, (total - np.arange(n) / SR) / 1.5), 0, 1)
    mix = voice + 0.22 * mus / np.abs(mus).max() * duck * fade + 0.35 * sfx / max(1e-6, np.abs(sfx).max())
    mix = mix / np.abs(mix).max() * 0.9
    with wave.open(os.path.join(work, 'mix.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    # subtítulos y guion
    ent = os.path.join(HERE, '..', 'entregas')
    allw = [(b['start'] + s, b['start'] + e, tok) for b in beats for s, e, tok in b['words']]
    cues, cur = [], []
    for w_ in allw:
        cur.append(w_)
        if len(cur) >= 4 or len(' '.join(c[2] for c in cur)) >= 24 or w_[2][-1] in '.,?:!…':
            cues.append(cur); cur = []
    if cur: cues.append(cur)
    with open(os.path.join(ent, OUT + '.srt'), 'w') as fh:
        for i, ch in enumerate(cues):
            e = min(ch[-1][1] + 0.3, cues[i + 1][0][0]) if i + 1 < len(cues) else ch[-1][1] + 0.6
            fh.write(f'{i + 1}\n{srt_time(ch[0][0])} --> {srt_time(e)}\n{" ".join(c[2] for c in ch)}\n\n')
    with open(os.path.join(ent, OUT + '.txt'), 'w') as fh:
        fh.write('LOS 3 ERRORES QUE HICIERON PERDER A HITLER (versión caricatura)\n')
        fh.write(f'Vertical 9:16 · {total:.0f} s · voz {VOICE}\n\n')
        for b in beats:
            fh.write(f'[{b["start"]:5.1f}s] ({b["id"]}) {b["text"]}\n')


if __name__ == '__main__':
    main(sys.argv[1])
