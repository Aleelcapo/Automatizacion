"""Encuentra automáticamente los mejores momentos de una grabación larga de gameplay.

Uso:
    python momentos.py grabacion.mp4 [--top 15] [--dur 30]

Analiza el audio (explosiones, choques, disparos, tus gritos) y el movimiento de la
imagen (persecuciones, caos). Compara cada instante con lo "normal" del minuto que lo
rodea, así que funciona igual en partes tranquilas que en partes intensas.

Genera, junto al video:
    grabacion_momentos.json   lista de clips sugeridos (edita "gancho" en cada uno)
    grabacion_momentos.jpg    hoja con una imagen de cada momento para revisarlos rápido
"""
import sys, os, json, argparse, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

WIN = 0.5  # segundos por ventana de análisis


def duracion(path):
    return float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip())


def audio_db(path):
    sr = 8000
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr),
                          '-f', 's16le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = int(sr * WIN)
    k = len(a) // n
    if k == 0:
        return np.zeros(0)
    rms = np.sqrt((a[:k * n].reshape(k, n) ** 2).mean(1) + 1e-10)
    return 20 * np.log10(rms)


def movimiento(path):
    fps = 1 / WIN * 2  # 4 imágenes por segundo
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-hwaccel', 'auto', '-i', path, '-an',
                          '-vf', f'fps={fps},scale=64:36,format=gray', '-f', 'rawvideo', '-'],
                         capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 36, 64).astype(np.float32)
    if len(fr) < 2:
        return np.zeros(0)
    d = np.r_[0, np.abs(fr[1:] - fr[:-1]).mean((1, 2))]
    k = len(d) // 2
    return d[:k * 2].reshape(k, 2).mean(1)


def mediana_movil(x, w):
    if len(x) == 0:
        return x
    p = w // 2
    xp = np.pad(x, p, mode='reflect') if len(x) > p else np.pad(x, p, mode='edge')
    v = np.lib.stride_tricks.sliding_window_view(xp, w)[:len(x)]
    return np.median(v, axis=1)


def suavizar(x, w):
    if len(x) == 0:
        return x
    return np.convolve(x, np.ones(w) / w, mode='same')


def robust_z(x, piso):
    med = np.median(x)
    mad = max(np.median(np.abs(x - med)) * 1.4826, piso)
    return (x - med) / mad


def puntuar(db, mov):
    n = min(len(db), len(mov)) if len(mov) else len(db)
    db = db[:n]
    ctx = 121  # ~60 s de contexto
    a = db - mediana_movil(db, ctx)                       # cuánto más fuerte que lo normal
    sa = np.clip(robust_z(a, 1.5), 0, None)        # piso 1.5 dB
    if len(mov):
        mov = mov[:n]
        m = np.log1p(mov) - np.log1p(mediana_movil(mov, ctx))
        sm = np.clip(robust_z(m, 0.05), 0, None)
    else:
        sm = np.zeros(n)
    # el audio pesa más: en GTA lo interesante casi siempre suena
    return suavizar(sa + 0.6 * sm, 5)


def elegir(score, top, dur, total, minimo):
    sep = int(dur / WIN)
    orden = np.argsort(-score)
    usados = []
    for i in orden:
        if len(usados) >= top or score[i] < minimo:
            break
        if all(abs(i - j) >= sep for j in usados):
            usados.append(i)
    res = []
    for i in sorted(usados):
        pico = i * WIN
        ini = max(0.0, pico - 0.65 * dur)   # contexto antes del pico, remate después
        fin = min(total, ini + dur)
        ini = max(0.0, fin - dur)
        res.append(dict(inicio=round(ini, 2), fin=round(fin, 2), pico=round(pico, 2),
                        puntuacion=round(float(score[i]), 2), gancho='', modo='fit', cx=0.5))
    return res


def hoja(path, momentos, out):
    if not momentos:
        return
    tw, th = 384, 216
    cols = 3
    filas = (len(momentos) + cols - 1) // cols
    img = Image.new('RGB', (cols * tw, filas * (th + 28)), (20, 20, 20))
    dr = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    for nombre in ('arialbd.ttf', 'Arial Bold.ttf', 'DejaVuSans-Bold.ttf'):  # Windows / Mac / Linux
        try:
            font = ImageFont.truetype(nombre, 18)
            break
        except OSError:
            pass
    for k, m in enumerate(momentos):
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(m['pico']), '-i', path, '-frames:v', '1',
                              '-vf', f'scale={tw}:{th}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                             capture_output=True).stdout
        x, y = (k % cols) * tw, (k // cols) * (th + 28)
        if len(raw) == tw * th * 3:
            img.paste(Image.frombytes('RGB', (tw, th), raw), (x, y + 28))
        mm, ss = divmod(int(m['inicio']), 60)
        hh, mm = divmod(mm, 60)
        dr.text((x + 6, y + 4), f"#{k}  {hh}:{mm:02d}:{ss:02d}  puntos {m['puntuacion']}", fill=(255, 220, 0), font=font)
    img.save(out, quality=85)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--top', type=int, default=15, help='cuántos momentos sugerir (por defecto 15)')
    ap.add_argument('--dur', type=float, default=30, help='duración de cada clip en segundos (por defecto 30)')
    ap.add_argument('--minimo', type=float, default=2.0,
                    help='puntuación mínima; bájala si encuentra pocos momentos (por defecto 2)')
    a = ap.parse_args()

    total = duracion(a.video)
    print(f'Analizando {a.video} ({total / 60:.1f} min)... audio', flush=True)
    db = audio_db(a.video)
    print('...movimiento (puede tardar en grabaciones largas)', flush=True)
    mov = movimiento(a.video)
    score = puntuar(db, mov)
    momentos = elegir(score, a.top, a.dur, total, a.minimo)

    base = os.path.splitext(a.video)[0]
    json.dump(dict(video=os.path.abspath(a.video), momentos=momentos),
              open(base + '_momentos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    hoja(a.video, momentos, base + '_momentos.jpg')
    print(f'{len(momentos)} momentos -> {base}_momentos.json y {base}_momentos.jpg')
    for k, m in enumerate(momentos):
        print(f"  #{k}: {m['inicio']:.0f}s - {m['fin']:.0f}s  (pico {m['pico']:.0f}s, puntos {m['puntuacion']})")


if __name__ == '__main__':
    main()
