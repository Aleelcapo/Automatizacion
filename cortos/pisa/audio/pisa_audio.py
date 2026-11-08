# Sound for "La torre que salvó la guerra" (Pisa short): the user's recorded voice (gain only) + an original
# tarantella-flavoured comedy score + synthesized SFX, all timed to the picture (story.ts frames, 30 fps).
# Standard mix: music bed -10 LU under the voice ("+3 dB music"), SFX 6 dB under the old bridge levels, voice unchanged,
# master -15 LUFS, true peak <= -1.2 dBTP, exactly TOTAL/30 s, 48 kHz stereo 24-bit.
# usage: python pisa_audio.py  (writes ../mix.wav, ../stem_*.wav, ../cues.md)
import os, json
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, ns, st, dbg, rng, pan, place, fades, lp, hp, bp, make_ir, convolve_st, integrated, momentary_max, true_peak,
                 read_wav, write_wav, lra, colored, smooth_noise, phase)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 1880
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
F = I.m2f
R = rng(1173)
def _r(): return rng(int(R.integers(1 << 30)))

# ---------------------------------------------------------------- picture time constants (story.ts / cast.ts)
FLASH = fr(147)
LEAN = fr(457); LEAN0 = fr(450)
SINK = fr(336); BEACH_SINK = fr(716)
FALL0, FALL1 = fr(934), fr(962)
STOREYS = [fr(x) for x in (1012, 1026, 1038, 1050, 1063, 1081, 1121)]
BANANA = fr(1150)
DUCE_PT = fr(1243)
CEMENT0, CEMENT1 = fr(1272), fr(1332)
TILT2 = fr(1437)
DIRT = [fr(x) for x in (1556, 1573, 1590, 1606)]
STRAIGHT0, STRAIGHT1 = fr(1627), fr(1661)
TURN = fr(1735)
TOURISTS = fr(1774)
EMPTY = fr(1837)
WORDS = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))

# ================================================================ music
class Band:
    def __init__(self):
        self.tr, self.send, self.cues = {}, {}, []
    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)

B8 = 0.5 / 3      # one eighth in 6/8 at dotted-quarter = 120 bpm (bar = 1.0 s)
# tarantella A theme (A minor), (bar, eighth, length in eighths, midi)
TAR = [(0, 0, 1, 69), (0, 1, 1, 72), (0, 2, 1, 76), (0, 3, 2, 81), (0, 5, 1, 79),
       (1, 0, 1, 77), (1, 1, 1, 76), (1, 2, 1, 74), (1, 3, 2, 76), (1, 5, 1, 72),
       (2, 0, 1, 74), (2, 1, 1, 71), (2, 2, 1, 68), (2, 3, 1, 71), (2, 4, 1, 74), (2, 5, 1, 77),
       (3, 0, 2, 76), (3, 2, 1, 72), (3, 3, 3, 69)]
CHM = [[45, 57, 60, 64], [41, 57, 60, 65], [40, 56, 59, 62], [45, 57, 60, 64]]   # Am F E Am
CHMAJ = [[48, 55, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [48, 55, 60, 64]]  # C F G C

def mando(b, t, d, m, vel=0.5, p=0.25):
    """mandolin: tremolo-picked string (fast repeated plucks)"""
    k = max(1, int(d / 0.055))
    for i in range(k):
        b.add("mando", I.pluck(F(m), vel * (0.85 if i else 1.0) * R.uniform(0.9, 1.05), _r(), dur=0.18, bright=0.75, pos=0.12), t + i * 0.055, p)

def tarantella(b, t0, bars, major=False, vel=0.55, mel="mando", bass=True, tamb=True, transpose=0):
    th = TAR
    for (bar, e, l, m) in th:
        if bar >= bars:
            continue
        mm = m + transpose + (3 if major and m % 12 in (0, 5, 7) else 0) if False else m + transpose
        if major:
            mm = {69: 72, 72: 76, 76: 79, 81: 84, 79: 81, 77: 77, 74: 74, 71: 71, 68: 67}.get(m, m) + transpose
        tt = t0 + bar * 1.0 + e * B8
        if mel == "mando":
            mando(b, tt, l * B8 * 0.95, mm, vel)
        elif mel == "fife":
            b.add("fife", I.fife(F(mm), l * B8 * 0.9, vel, _r()), tt, 0.2)
        elif mel == "glock":
            b.add("glock", I.glock(F(mm + 12), vel, _r(), dur=1.0), tt, -0.3)
        elif mel == "vibes":
            b.add("vibes", I.vibes(F(mm), vel, _r(), dur=1.0, damp=l * B8 + 0.2), tt, -0.2)
    ch = CHMAJ if major else CHM
    for bar in range(bars):
        c = ch[bar % 4]
        tb = t0 + bar
        if bass:
            b.add("tuba", I.brass(F(c[0] - 12 if c[0] > 43 else c[0]), 0.16, vel * 0.9, _r(), "tuba"), tb, -0.1)
            b.add("tuba", I.brass(F(c[0] + 7 - 12 if c[0] > 43 else c[0] + 7), 0.16, vel * 0.75, _r(), "tuba"), tb + 3 * B8, -0.1)
            for k in (1, 2, 4, 5):
                for j, mm in enumerate(c[1:]):
                    b.add("acc", I.brass(F(mm + transpose), 0.07, vel * 0.32, _r(), "horn", scoop=-6), tb + k * B8 + 0.003 * j, 0.3 - 0.15 * j)
        if tamb:
            for k in range(6):
                b.add("tamb", I.brush(0.5 if k in (0, 3) else 0.3, _r(), dur=0.12), tb + k * B8, 0.35)
            b.add("tamb", I.triangle(0.18, _r(), dur=0.3, f=2600), tb, 0.4)

def wah(b, t, notes, step=0.42, vel=0.6):
    """sad trombone: descending notes, the last one bends down with vibrato"""
    for i, m in enumerate(notes):
        last = i == len(notes) - 1
        d = step * (2.4 if last else 0.85)
        b.add("bone", I.brass(F(m), d, vel, _r(), "horn", scoop=-40, fall=-1.0 if last else 0.0), t + i * step, -0.15)

def build_music():
    b = Band()
    # ---- hook 0 - FLASH: tarantella tutti, button on the flash
    tarantella(b, 0.0, 4, vel=0.6)
    b.add("cymbal", I.cymbal(0.35, _r()), 0.0)
    cut = np.ones(N); a = ns(FLASH - 0.02); cut[a:] = 0
    for k in b.tr: b.tr[k] *= cut[None, :]
    for m in [45, 57, 60, 64, 69]:
        b.add("stab", I.brass(F(m), 0.22, 0.8, _r(), "stab", scoop=-15), FLASH, (m - 60) / 20)
    b.add("cymbal", I.cymbal(0.4, _r(), dur=1.2), FLASH)
    b.cues.append((0.0, "hook: tarantella (A minor, 6/8) tutti, button + clash on the white flash"))
    # ---- 1173 building: light major tarantella, pizzicato + glock
    t0 = FLASH + 0.5
    for rep in range(2):
        tarantella(b, t0 + rep * 4, 4, major=True, vel=0.38 + 0.06 * rep, mel="glock" if rep == 0 else "mando", tamb=rep == 1)
    tarantella(b, t0 + 8, 2, major=True, vel=0.44, mel="mando")   # ends ~ 15.4
    stop = np.ones(N); a = ns(LEAN0 + 0.05); stop[a:a + ns(0.04)] = np.linspace(1, 0, ns(0.04)); stop[a + ns(0.04):] = 0
    keep = {k: v.copy() for k, v in b.tr.items()}
    for k in b.tr: b.tr[k] = np.where(np.arange(N)[None, :] < ns(FLASH + 0.1), keep[k], keep[k] * stop[None, :])
    b.cues.append((t0, "1173: tarantella in C major, glock then mandolin; stops as the tower starts to lean"))
    wah(b, LEAN - 0.05, [67, 66, 65, 64], step=0.3, vel=0.55)
    b.cues.append((LEAN, "lean: descending muted-brass slide (G-F#-F-E) on 'hundirse'"))
    # ---- war: snare march + fife in A minor
    tw = fr(495)
    for k in range(int((fr(570) - tw) / (B8 * 3))):
        tb = tw + k * B8 * 3
        b.add("snare", I.snare(0.55 if k % 2 == 0 else 0.4, _r()), tb)
        b.add("snare", I.snare(0.3, _r()), tb + B8 * 2)
    tarantella(b, tw, 2, vel=0.42, mel="fife", bass=False, tamb=False)
    b.cues.append((tw, "off to war: field snare + fife on the theme"))
    # ---- a century: slow music box + pad (golden)
    tc = fr(568)
    for i, m in enumerate([81, 76, 72, 69, 71, 72, 74, 76]):
        b.add("mbox", I.musicbox(F(m), 0.5, _r()), tc + i * 0.33, 0.2)
    b.add("pad", I.pad([F(57), F(60), F(64)], 2.0, 0.35, _r(), att=0.4, rel=0.6), tc)
    b.cues.append((tc, "a century passes: slow music box over a soft A minor pad"))
    # ---- beach: breezy vibes + plucks in F
    tb0 = fr(633)
    tarantella(b, tb0 + 0.1, 3, major=True, vel=0.35, mel="vibes", bass=False, tamb=False, transpose=-7)
    for k in range(7):
        c = [[41, 57, 60, 65], [36, 55, 60, 64]][k % 2]
        b.add("pluck", I.pluck(F(c[0]), 0.6, _r(), dur=0.8), tb0 + k, -0.05)
        for j in (1, 2, 4, 5):
            for mm in c[1:]:
                b.add("pluck", I.pluck(F(mm), 0.22, _r(), dur=0.3, bright=0.6), tb0 + k + j * B8, 0.25)
    # "hundís": a pluck sliding down; "compacta": a glock ding up
    for i, m in enumerate([72, 70, 67, 63]):
        b.add("pluck", I.pluck(F(m), 0.5, _r(), dur=0.4), BEACH_SINK - 0.05 + i * 0.07, 0.1)
    for i, m in enumerate([84, 88, 91]):
        b.add("glock", I.glock(F(m), 0.45, _r(), dur=1.2), fr(834) + i * 0.08, -0.3)
    b.cues.append((tb0, "beach: breezy vibes + plucked guitar in F; pluck slide down on 'hundís', glock up on 'compacta'"))
    # ---- war again (soft) + topple: snare drive, roll, hard stop at the impact
    tw2 = fr(852)
    for k in range(int((FALL0 - tw2) / (B8 * 3))):
        b.add("snare", I.snare(0.35, _r()), tw2 + k * B8 * 3)
    for t, v in I.snare_roll(FALL0 - 0.6, FALL1, 0.2, 0.9, _r()):
        b.add("snare", I.snare(v, _r(), dur=0.14, buzz=True), t)
    b.add("pad", I.pad([F(52), F(56), F(59), F(62)], FALL1 - (FALL0 - 0.6), 0.45, _r(), att=0.8, rel=0.05), FALL0 - 0.6)
    b.add("timpani", I.timpani(F(40), 0.95, _r(), dur=2.5), FALL1)
    b.cues.append((FALL0 - 0.6, "topple: snare roll + rising pad, timpani on the impact (f962), then silence"))
    # ---- return: tarantella in C builds, a glock note climbs with every new storey
    tr0 = fr(990)
    tarantella(b, tr0, 4, major=True, vel=0.45, mel="mando")
    tarantella(b, tr0 + 4, 2, major=True, vel=0.5, mel="mando")
    for i, t in enumerate(STOREYS):
        b.add("glock", I.glock(F(72 + [0, 2, 4, 5, 7, 9, 12][i]), 0.55, _r(), dur=1.0), t, -0.3)
    b.cues.append((tr0, "builders return: tarantella in C; glock climbs C-D-E-F-G-A-C on each new storey"))
    # ---- 1934: pompous brass oom-pah in Bb (2/4 feel), stab on "Mussolini"
    t34 = fr(1176)
    bb = [[34, 58, 62, 65], [41, 57, 60, 65], [34, 58, 62, 65], [41, 57, 60, 63]]
    for k in range(int((fr(1354) - t34) / 1.0)):
        c = bb[k % 4]; tb = t34 + k
        b.add("tuba", I.brass(F(c[0]), 0.3, 0.7, _r(), "tuba"), tb, -0.1)
        b.add("tuba", I.brass(F(c[0] + 7), 0.3, 0.6, _r(), "tuba"), tb + 0.5, -0.1)
        for j, mm in enumerate(c[1:]):
            b.add("acc", I.brass(F(mm), 0.14, 0.4, _r(), "horn", scoop=-10), tb + 0.25 + 0.004 * j, 0.3)
            b.add("acc", I.brass(F(mm), 0.14, 0.4, _r(), "horn", scoop=-10), tb + 0.75 + 0.004 * j, 0.3)
        b.add("snare", I.snare(0.4, _r()), tb + 0.5)
    for m in [46, 58, 62, 65, 70]:
        b.add("stab", I.brass(F(m), 0.3, 0.75, _r(), "stab"), DUCE_PT - 0.02, (m - 60) / 20)
    b.add("timpani", I.timpani(F(46), 0.7, _r()), DUCE_PT - 0.02)
    b.cues.append((t34, "1934: pompous brass oom-pah in Bb; brass stab + timpani on 'Mussolini'"))
    # ---- "por suerte": ta-da; "por desgracia": sad trombone
    for m in [58, 62, 65, 70]:
        b.add("stab", I.brass(F(m), 0.12, 0.6, _r(), "stab"), fr(1385), 0.0)
        b.add("stab", I.brass(F(m + 5), 0.4, 0.65, _r(), "stab"), fr(1385) + 0.18, 0.0)
    wah(b, fr(1437) - 0.1, [65, 64, 63, 62], step=0.36, vel=0.6)
    b.cues.append((fr(1385), "'no se cayó': little ta-da; 'se inclinó todavía más': sad trombone Wah-wah-wah-waaah"))
    # ---- 1990: modern light pizz + vibes + brushes in C, rising glock on "endereza"
    t90 = fr(1484)
    for k in range(int((fr(1669) - t90) / 1.0)):
        c = CHMAJ[k % 4]; tb = t90 + k
        b.add("pluck", I.pluck(F(c[0]), 0.6, _r(), dur=0.8), tb, -0.05)
        b.add("pluck", I.pluck(F(c[0] + 7), 0.45, _r(), dur=0.6), tb + 0.5, -0.05)
        for j in (1, 2, 4, 5):
            b.add("brush", I.brush(0.4 if j in (1, 4) else 0.25, _r(), dur=0.2), tb + j * B8, 0.15)
    for i, m in enumerate([72, 74, 76, 77, 79, 81, 83, 84]):
        b.add("glock", I.glock(F(m), 0.4 + 0.03 * i, _r(), dur=0.9), STRAIGHT0 + i * (STRAIGHT1 - STRAIGHT0) / 8, -0.3)
    b.cues.append((t90, "1990: pizzicato bass + brushes; glock scale climbs while the tower straightens"))
    # ---- ending: playful tarantella reprise; cut dead on the empty straight tower
    te = fr(1672)
    tarantella(b, te, 6, vel=0.5, mel="mando")
    end = np.ones(N); a = ns(EMPTY - 0.01); end[a:] = 0
    for k in b.tr: b.tr[k] *= end[None, :]
    b.add("pluck", I.pluck(F(57), 0.35, _r(), dur=1.4), fr(1867), 0.0)  # one lonely note on "Pisa"
    b.cues.append((te, "reprise: tarantella A minor; music cuts dead on the cut to the straight, empty tower (f1837)"))
    b.cues.append((fr(1867), "one lonely plucked A on 'Pisa'"))
    return b

TARGET = {"mando": 0.0, "fife": -1.0, "glock": -5.0, "vibes": -2.0, "tuba": -3.0, "acc": -9.0, "tamb": -13.0, "stab": -3.0,
          "cymbal": -12.0, "snare": -6.0, "bone": -1.0, "mbox": -1.5, "pad": -6.0, "pluck": -3.0, "timpani": -4.0, "brush": -12.0}

def render_music(b, ref=-20.0):
    hall = make_ir(1.2, 7, pre=0.015, hf=1.5)
    dry, wet = np.zeros((2, N)), np.zeros((2, N))
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        x = x * dbg(ref + TARGET.get(k, -6) - L)
        dry += x; wet += 0.18 * x
    return hp(dry + 0.6 * convolve_st(wet.mean(0), hall), 30, 2)

# ================================================================ SFX: (time, generator, rel. level LU vs voice, pan, kind)
def sfx_cues():
    C = []
    def ev(t, gen, lvl, p=0.0, kind="event", name=""):
        C.append(dict(t=t, gen=gen, lvl=lvl, p=p, kind=kind, name=name))
    r = _r
    # ambience beds
    ev(0.0, lambda: G.breeze(FLASH, r(), 0.8), -24, 0, "bed", "piazza breeze")
    ev(0.0, lambda: G.bird_chirps(FLASH, r(), 0.5), -27, 0.3, "bed", "birds")
    ev(FLASH, lambda: G.babble(fr(495) - FLASH, r(), 120, 1.0, rate=3.0, active=0.5), -27, -0.2, "bed", "builders murmur")
    for k in range(14):
        t = FLASH + 0.6 + k * 0.48 + R.uniform(-0.05, 0.05)
        if t < fr(450): ev(t, lambda: G.hammer_hit(r(), 0.25), -24, R.uniform(-0.5, 0.5), "event", "mason's hammer")
    # hook column: boots on the lawn
    for k in range(4):
        ev(fr(92) + k * 0.5, lambda k=k: G.column_stomp(r(), 0.45, k % 2, boots=16), -19, -0.1, "event", "column footfall")
    ev(FLASH - 0.15, lambda: G.whoosh(0.5, r(), peak=0.3), -16, 0, "event", "flash whoosh")
    # soft ground: squelch
    ev(SINK, lambda: G.bubbles(0.55, r(), 22, f_lo=120, f_hi=520), -16, 0.2, "event", "mud squelch")
    # the lean: stone groan + thud
    ev(LEAN0, lambda: G.creak(0.9, r(), rate0=40, rate1=70, scale=0.45, rough=0.25), -16, -0.2, "event", "stone groan")
    ev(LEAN, lambda: I.timpani(F(33), 0.8, r(), dur=1.4), -15, 0, "event", "lean thud")
    # war: column stomps + flag
    for k in range(int((fr(570) - fr(495)) / 0.5)):
        ev(fr(495) + k * 0.5, lambda k=k: G.column_stomp(r(), 0.6, k % 2, boots=24), -17, -0.15, "event", "march")
    ev(fr(495), lambda: G.flag_flutter(fr(570) - fr(495), r()), -26, 0.2, "bed", "flag")
    # a century: wind and crickets
    ev(fr(570), lambda: G.breeze(fr(633) - fr(570) + 0.3, r(), 1.0, gust=0.3), -21, 0, "bed", "lonely wind")
    ev(fr(570), lambda: G.crickets(fr(633) - fr(570), r()), -25, 0.3, "bed", "crickets")
    # beach: waves, breeze, squelch, water squeezing out
    ev(fr(629), lambda: G.water_bed(fr(852) - fr(629) + 0.2, r(), close=0.6, slosh_rate=0.25), -19, 0, "bed", "sea")
    ev(fr(629), lambda: G.breeze(fr(852) - fr(629), r(), 0.7), -25, 0, "bed", "sea breeze")
    ev(BEACH_SINK, lambda: G.bubbles(0.45, r(), 30, f_lo=160, f_hi=700), -14, 0, "event", "wet sand squelch")
    ev(fr(779), lambda: G.bubbles(1.9, r(), 14, f_lo=900, f_hi=3200), -20, 0, "event", "water trickles out")
    # a century of war: distant marching
    for k in range(int((fr(916) - fr(852)) / 0.5)):
        ev(fr(852) + k * 0.5, lambda k=k: lp(np.asarray(G.column_stomp(r(), 0.4, k % 2, boots=20)[0]), 1800, 1), -24, 0.2, "event", "distant march")
    # topple: groan, whoosh, impact, debris
    ev(FALL0, lambda: G.creak(FALL1 - FALL0, r(), rate0=35, rate1=110, scale=0.4, rough=0.3), -15, -0.2, "event", "tower groan")
    ev(FALL1 - 0.45, lambda: G.whoosh(0.6, r(), peak=0.75, f_lo=150, f_hi=900), -15, -0.3, "event", "fall whoosh")
    ev(FALL1, lambda: I.timpani(F(28), 1.0, r(), dur=2.0) + 0.6 * G.wood_crack(r())[: ns(2.0)] if False else I.timpani(F(28), 1.0, r(), dur=2.0), -11, -0.2, "event", "impact boom")
    ev(FALL1 + 0.02, lambda: G.rattle(1.2, r(), density=40, heavy=True), -17, -0.3, "event", "rubble")
    # storeys: stone blocks thunk into place
    for t in STOREYS:
        ev(t, lambda: G.hammer_hit(r(), 0.9), -18, 0, "event", "storey thunk")
    # banana: slide-whistle up
    def slide():
        n = ns(0.45); t = np.arange(n) / SR
        f = 700 * 2 ** (1.6 * (t / t[-1]) ** 0.7)
        y = np.sin(phase(f * (1 + 0.01 * np.sin(2 * np.pi * 7 * t)))) * np.minimum(1, t / 0.02) * np.minimum(1, (t[-1] - t) / 0.08)
        return y + 0.02 * np.random.default_rng(3).standard_normal(n)
    ev(BANANA, slide, -15, 0.2, "event", "banana slide whistle")
    # 1934: crowd murmur, cement pours
    ev(fr(1172), lambda: G.babble(fr(1354) - fr(1172), r(), 115, 1.0, rate=3.5, active=0.6), -26, 0.1, "bed", "1934 crowd")
    def slurry(d):
        rr = r(); n = ns(d)
        y = lp(colored(n, rr, 1.6), 900, 2) * (0.6 + 0.4 * smooth_noise(n, rr, 3.0))
        return fades(y, 0.2, 0.4)
    ev(CEMENT0, lambda: slurry(CEMENT1 - CEMENT0 + 0.6), -18, -0.2, "event", "cement pour")
    ev(TILT2 - 0.2, lambda: G.creak(0.7, r(), rate0=40, rate1=80, scale=0.45, rough=0.25), -15, -0.2, "event", "stone groan 2")
    ev(TILT2, lambda: I.timpani(F(31), 0.85, r(), dur=1.4), -14, 0, "event", "tilt thud")
    ev(TILT2 + 0.15, lambda: G.whoa(r()), -19, 0.25, "event", "the Duce's whoa")
    # 1990: auger motor + dirt, the slow straightening groan, a cheer
    def auger(d):
        rr = r(); n = ns(d); t = np.arange(n) / SR
        y = np.sin(phase(np.full(n, 92.0) * (1 + 0.02 * smooth_noise(n, rr, 4)))) * 0.5 + bp(colored(n, rr, 1.0), 300, 2200, 2) * 0.5
        return fades(y * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t)), 0.15, 0.3)
    ev(fr(1545), lambda: auger(fr(1615) - fr(1545)), -20, 0.25, "event", "soil auger")
    for t in DIRT:
        ev(t, lambda: G.rattle(0.35, r(), density=25), -20, 0.25, "event", "dirt spray")
    ev(STRAIGHT0, lambda: G.creak(STRAIGHT1 - STRAIGHT0, r(), rate0=70, rate1=35, scale=0.45, rough=0.2), -17, -0.1, "event", "tower settles back")
    ev(fr(1645), lambda: G.hurrah(r(), 120, 1.0), -19, 0.2, "event", "engineers cheer")
    # tourists: chatter + camera shutters; then the empty piazza: wind and one cricket
    ev(TOURISTS, lambda: G.babble(EMPTY - TOURISTS, r(), 125, 1.05, rate=4.5, active=0.8), -22, 0, "bed", "tourist chatter")
    def shutter():
        rr = r(); n = ns(0.09); t = np.arange(n) / SR
        y = bp(rr.standard_normal(n), 1500, 7000, 2) * (np.exp(-t / 0.006) + 0.7 * np.exp(-np.maximum(0, t - 0.045) / 0.008) * (t > 0.045))
        return y
    for k, t in enumerate([60.0, 60.4, 60.75, 61.0]):
        ev(t, shutter, -19, (-0.4, 0.3, -0.1, 0.45)[k], "event", "camera shutter")
    ev(EMPTY, lambda: G.breeze(DUR - EMPTY, r(), 1.0, gust=0.35), -21, 0, "bed", "empty wind")
    ev(EMPTY + 0.35, lambda: G.crickets(DUR - EMPTY - 0.35, r(), voices=1), -24, 0.4, "bed", "one cricket")
    return C

SFX_OFFSET = -6.0   # standard: SFX 6 dB down

def render_sfx(v_ref):
    out, send = np.zeros((2, N)), np.zeros(N)
    C = sfx_cues()
    for c in C:
        x = c["gen"]()
        if isinstance(x, tuple): x = x[0]
        x = np.asarray(x, float)
        if x.ndim == 2 and x.shape[0] != 2: x = x[0]
        x = pan(x, c["p"]) if x.ndim == 1 else x
        cur = momentary_max(x) if c["kind"] == "event" else integrated(x)
        tgt = v_ref + c["lvl"] + 6.0 + SFX_OFFSET   # levels written for the bridge balance (+6), then the -6 dB standard
        if np.isfinite(cur): x = x * dbg(tgt - cur)
        c["measured"] = (momentary_max(x) if c["kind"] == "event" else integrated(x)) - v_ref
        place(out, x, c["t"]); send[ns(c["t"]): ns(c["t"]) + x.shape[1]] += 0.12 * x.mean(0)[: max(0, min(x.shape[1], N - ns(c["t"])))]
    out += 0.5 * convolve_st(send, make_ir(0.9, 77, pre=0.01, hf=1.6))
    return hp(out, 25, 2), C

# ================================================================ mix
def duck(spans, depth=-3.0, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000; nc = int(DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans: va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc); e = 0.0
    for i in range(nc):
        e += (va[i] - e) * (ka if va[i] > e else kr); env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)

def limiter(x, ceil_db=-1.2, look=0.003, rel=0.08):
    c = dbg(ceil_db); n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    a = np.exp(-1 / (rel * SR))
    out = g.copy()
    idx = np.where(g < 1)[0]
    if len(idx):
        for i in range(idx[0], n):
            out[i] = min(g[i], a * out[i - 1] + (1 - a)) if i else g[i]
            if out[i] >= 0.99999 and g[i] >= 1 and i > idx[-1]: break
    out = ndimage.uniform_filter1d(out, 2 * La + 1, mode="nearest")
    return np.minimum(out, 1.0)

def main():
    v, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav")); assert sr == SR
    vm = v.mean(0) if v.ndim == 2 else v
    voice = np.zeros(N); voice[: min(N, len(vm))] = vm[:N]
    voice = st(voice)
    Lv = integrated(voice)
    spans = []
    for w in WORDS:
        s, e = float(w["s"]), float(w["e"])
        if spans and s - spans[-1][1] < 0.3: spans[-1][1] = max(spans[-1][1], e)
        else: spans.append([s, e])
    band = build_music()
    music = render_music(band)
    music = music * dbg(duck(spans))[None, :]
    # music bed: -10 LU under the voice where she speaks over it (measured over the whole film)
    Lm = integrated(music)
    music *= dbg(Lv - 10.0 - Lm)
    sfx, C = render_sfx(Lv)
    mix = voice + music + sfx
    g = dbg(-15.0 - integrated(mix))
    voice, music, sfx, mix = voice * g, music * g, sfx * g, mix * g
    lim = limiter(mix)
    mix = mix * lim[None, :]
    end = ns(DUR - 0.05); mix[:, end:] *= np.linspace(1, 0, N - end)[None, :]
    write_wav(os.path.join(ROOT, "mix.wav"), mix)
    for nm, x in [("voice", voice), ("music", music), ("sfx", sfx)]:
        write_wav(os.path.join(ROOT, f"stem_{nm}.wav"), x)
    rep = [f"# Pisa short - cue sheet\n", f"- Duration {N / SR:.3f} s ({N} samples, 48 kHz, stereo)",
           f"- Master: integrated {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP, LRA {lra(mix):.1f} LU, limiter min gain {20 * np.log10(lim.min()):.2f} dB",
           f"- Stems: voice {integrated(voice):.1f} LUFS, music {integrated(music):.1f} LUFS, sfx {integrated(sfx):.1f} LUFS\n", "## Music"]
    rep += [f"- {t:6.2f} s (f{round(t * FPS)}): {d}" for t, d in sorted(band.cues)]
    rep += ["\n## SFX (level = momentary max / integrated vs voice, LU)"]
    rep += [f"- {c['t']:6.2f} s (f{round(c['t'] * FPS)}) {c['name']}: {c['measured']:+.1f}" for c in sorted(C, key=lambda c: c["t"])]
    open(os.path.join(ROOT, "cues.md"), "w").write("\n".join(rep) + "\n")
    print("\n".join(rep[:5]))

if __name__ == "__main__":
    main()
