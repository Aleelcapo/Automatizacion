# Caricaturas 3D: generador propio de shorts

Shorts verticales (1080×1920, 30 fps) de caricaturas 3D, sin pagar ninguna app:
personajes con caras pintadas, sombreado toon y contorno negro, sets y utilería
hechos con código, voz gratis (edge-tts) y subtítulos grandes quemados en el video.

## Instalación (una vez)

```bash
cd herramientas/cartoon3d
npm install                        # three.js + fuente Montserrat
pip install edge-tts numpy opencv-python-headless
```

Requiere Node, ffmpeg y Playwright con Chromium (renderiza sin GPU).

## Uso

```bash
python3 build.py historias/dagen_h.json --stills   # hojas de revisión (inicio/medio/final de cada plano)
python3 build.py historias/dagen_h.json            # video final → entregas/<out>.mp4 + .srt + .txt
```

Un short de unos 55 s tarda unos 10 min en renderizar con 3 workers.
Los temporales quedan en `out/<nombre>/` (ignorado por git).

## Cómo se escribe una historia (`historias/*.json`)

- **beats**: cada frase narrada. Unas 160 palabras para 55 s, con una idea por frase.
- **shots**: los planos de cada frase. `from: "palabra"` hace que el plano empiece justo en esa palabra.
  Conviene un plano nuevo cada 1,5–2 s.
- **cam**: `on` (id de personaje u objeto), `shot` (`face|close|medium|full|wide|xwide`),
  `yaw`/`pitch` en grados y `move` (`drift|push|pull|orbitL|orbitR|rise|crash|hold`).
  También acepta `target` + `dist` explícitos. La cámara siempre se mueve.
- **do**: acciones. `on: "palabra"` las dispara 4 fotogramas antes de la palabra (el gesto llega
  antes que la palabra). Las acciones disponibles son:
  - Personajes: `pose`, `expr`, `lookAt` (`"cam"` o `[x,y,z]`), `move`, `turn`, `jolt`, `jump`.
  - Objetos: `pop`, `move`, `value` (contador o medidor), `time` (reloj), `stamp` (sello), `hide`.
  - Sonido: `sfx` (`pop|whoosh|tick|ding|thud|horn|boing|brake|crowd`).

### Catálogo

- **Sets**: `street` (`time`: `day|dawn|night`), `road`, `room`, `office`, `studio` (un color), `space`.
- **Utilería**: `car`, `sign`, `billboard`, `led` (contador), `gauge`, `clock`, `calendar`, `flag`
  (`sweden|norway|finland|mexico|uk`), `paper` (con sello), `stamp`, `ballot`, `podium`, `table`,
  `bench`, `tree`, `pine`, `cone`, `lamp`, `trafficlight`, `arrow`, `globe`, `phone`, `tv`, `crate`, `text`.
- **Personajes** (`look`):
  - `body`: `average|tall|short|wide|kid|old`.
  - `hair`: `short|bun|long|curly|cap|hardhat|police|hat|helmet|bald|none`.
  - Colores y accesorios: `shirt`, `pants`, `skin`, `glasses`, `mustache`, `tie`, `vest`, `coat`.
  - Un personaje con `in: "idCoche"` va sentado manejando ese coche.
- **Poses**: `idle hips cross shrug up headhold point pointside wave think drive hold thumbs present stop fist facepalm scratch cheer`.
- **Expresiones**: `neutral smile happy smug surprised shock panic worried sad angry determined confused dizzy starstruck cry joy sleepy talk nervous skeptical`.

Regla del estilo: un solo tipo de cara por canal (`look.skin` en la historia: `white` o un tono de piel).

## Música

Opcional: `"music": "archivo.mp3"` en la historia (ruta relativa al JSON). Baja de volumen
automáticamente cuando habla la voz. Usa música libre de derechos (por ejemplo, la Biblioteca de audio de YouTube).
