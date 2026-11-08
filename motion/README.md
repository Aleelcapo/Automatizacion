# Serie de motion graphics: preguntas intrigantes

Videos verticales de 1080×1920 a 30 fps, de unos 60 segundos, animados con código ([Remotion](https://www.remotion.dev/)).

## Estilo de la serie
- Fondo azul noche con un degradado cuyo tinte cambia en cada escena, partículas flotantes y viñeta.
- Subtítulos palabra por palabra arriba. Las palabras clave van en una caja dorada.
- Titulares en mayúsculas con la tipografía Inter Black. Los números suben animados con contadores.
- Paleta: oro `#ffc83d` (dinero), cian, rojo (peligro) y verde (positivo). Se define en `src/serie/tema.ts`.
- Voz en off es-MX-JorgeNeural con edge-tts, más música y efectos sintetizados (sin licencias).

## Cómo hacer un video nuevo
1. **Guion**: escribe `guiones/<id>.json` con beats (`scene`, `text`, `keys` = palabras a resaltar, `sfx` = efectos en palabras).
2. **Voz**: `python3 herramientas/voz.py guiones/<id>.json` genera `public/<id>/voz.wav` y `src/data/<id>.json` con los tiempos de cada palabra.
3. **Música y efectos**: `python3 herramientas/musica.py <id>` genera `public/<id>/musica.wav`.
4. **Escenas**: crea `src/<id>/escenas.tsx`, con un componente por `scene`. Usa `usePalabra('palabra')` para sincronizar animaciones con la voz. Regístralo en `src/registro.ts`.
5. **Render**:
   ```bash
   npx remotion render src/index.ts <id> out/<id>.mp4 --crf=20
   ```
   Para normalizar el audio a -14 LUFS:
   ```bash
   ffmpeg -i out/<id>.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5 -c:a aac -b:a 192k ../entregas/<Nombre>.mp4
   ```
6. **Subtítulos y guion**: `python3 herramientas/srt.py <id> ../entregas/<Nombre>` genera el `.srt` y el `.txt`.
7. **Revisión rápida**: `python3 herramientas/hoja.py <id> out/<id>.mp4 hoja.png` arma una hoja con 2 fotogramas por escena.

Para previsualizar en vivo: `npx remotion studio src/index.ts`.

Requisitos: Node 22+, Python 3 con `numpy` y `edge-tts`, y ffmpeg. En la nube se usa el Chromium preinstalado con `REMOTION_BROWSER=/ruta/a/chrome-headless-shell`.
