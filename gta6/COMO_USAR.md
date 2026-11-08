# Cómo usar las herramientas de clips

Las herramientas están en `herramientas/gta6/`:

| Archivo | Qué hace |
|---|---|
| `momentos.py` | Revisa una grabación larga y encuentra los mejores momentos (por sonido y movimiento). |
| `clip.py` | Corta y convierte a vertical 9:16 (1080×1920, 60 fps) con gancho, subtítulos y audio nivelado. |

## Instalación (una sola vez, en tu PC)

1. Instala **Python 3.10 o más nuevo**: https://www.python.org (en Windows, marca "Add Python to PATH").
2. Instala **ffmpeg**:
   - Windows: abre PowerShell y ejecuta `winget install Gyan.FFmpeg`
   - Mac: `brew install ffmpeg`
3. Instala las librerías:

```bash
pip install -r herramientas/gta6/requirements.txt
```

4. *(Opcional, para subtítulos automáticos de tu voz)*:

```bash
pip install faster-whisper
```

## Uso diario

Entra en la carpeta de las herramientas:

```bash
cd herramientas/gta6
```

### 1) Encontrar los mejores momentos

```bash
python momentos.py "D:/Grabaciones/sesion1.mp4" --top 20 --dur 30
```

Junto al video se crean:
- `sesion1_momentos.jpg`: una imagen de cada momento con su número y minuto. Ábrela y elige los buenos.
- `sesion1_momentos.json`: la lista de clips. Ábrela con el Bloc de notas y escribe el **gancho** de los que te gusten:

```json
{"inicio": 812.5, "fin": 842.5, "pico": 832.0, "puntuacion": 7.4,
 "gancho": "NADIE ESPERABA *ESTO* EN GTA 6", "modo": "fit", "cx": 0.5}
```

También puedes ajustar `inicio` y `fin` (en segundos), cambiar `modo` a `crop` o `facecam`, o mover el encuadre con `cx`.

Si encuentra pocos momentos, usa `--minimo 1.2`. Si encuentra demasiados, usa `--minimo 3`.

### 2) Crear los clips

Todos los de la lista, o solo los que elijas:

```bash
python clip.py "D:/Grabaciones/sesion1.mp4" --lista "D:/Grabaciones/sesion1_momentos.json" --solo 2,5,9
```

Un clip suelto, eligiendo tú los tiempos:

```bash
python clip.py sesion1.mp4 --inicio 13:32 --fin 14:05 --gancho "GTA 6 hace algo que GTA 5 *nunca* pudo"
```

Los clips quedan en la carpeta `clips/`. Cada uno tiene al lado un `.txt` con el título y los hashtags, para copiarlos y pegarlos al subir.

### Opciones útiles

| Opción | Para qué |
|---|---|
| `--modo fit` | (por defecto) Gameplay al centro con fondo desenfocado. Se ve todo. |
| `--modo crop --cx 0.5` | Pantalla vertical completa. `cx` mueve el recorte: 0 = izquierda, 1 = derecha. Ideal cuando la acción está en un punto. |
| `--modo facecam --facecam 0.75,0.02,0.23,0.25` | Tu cámara arriba y el juego abajo. Los números dicen dónde está tu cámara en la grabación: x, y, ancho y alto, como fracción de la imagen. |
| `--zoom 1.6` | Más zoom en el modo `fit` (por defecto 1.35; 1 = ver todo el ancho). |
| `--subs` | Subtítulos automáticos de lo que dices (necesita faster-whisper). |
| `--gancho-seg 4` | El gancho se ve solo los primeros 4 segundos (por defecto, todo el clip). |
| `--fuente "Montserrat ExtraBold"` | Otra tipografía, si la tienes instalada. |
| `--rapido` | Renderiza más rápido, ideal para la noche del lanzamiento. |
| `*palabra*` en el gancho | Esa palabra sale en **amarillo**. |

## Antes de subir, revisa

- [ ] Que no se escuche **música de la radio** del juego.
- [ ] Que no haya **violencia fuerte en los primeros 7 segundos** (regla de YouTube).
- [ ] Que el gancho se lea bien y no lo tape la interfaz de TikTok (por eso va arriba).
- [ ] Que no tenga spoilers en el texto del gancho.
