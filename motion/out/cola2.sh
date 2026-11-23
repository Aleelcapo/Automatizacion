#!/bin/bash
# Cola HQ (escala 2) en trozos de 360 cuadros. Un trozo o un armado por llamada.
cd /home/user/Automatizacion/motion
find /tmp -maxdepth 1 -name "remotion-webpack-bundle-*" -mmin +150 -exec rm -rf {} + 2>/dev/null
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
LISTA="tucan:tucan:29_Mascotas_Tucan ajolote2:ajolote2:30_Mascotas_Ajolote guacamayo:guacamayo:31_Mascotas_Guacamayo iguana:iguana:32_Mascotas_Iguana camaleon:camaleon:33_Mascotas_Camaleon erizo:erizo:34_Mascotas_Erizo tortuga:tortuga:35_Mascotas_Tortuga"
TROZO=360
for item in $LISTA; do
  IFS=: read c d n <<< "$item"
  [ -f ../entregas/videos/$n.mp4 ] && continue
  [ -f src/data/$d.json ] || continue
  grep -q "id=\"$c\"" src/Root.tsx || continue
  dur=$(python3 -c "import json,math;print(math.ceil(json.load(open('src/data/$d.json'))['duration']*30))")
  np=$(( (dur + TROZO - 1) / TROZO ))
  for ((p=1; p<=np; p++)); do
    if [ ! -f out/${c}_hq$p.mp4 ]; then
      a=$(( (p-1)*TROZO )); b=$(( p*TROZO-1 )); [ $b -ge $dur ] && b=$((dur-1))
      npx remotion render src/index.ts $c out/${c}_tmp.mp4 --frames=$a-$b --gl=swangle --scale=2 --crf=14 --timeout=240000 --log=error > out/${c}_hq$p.txt 2>&1 \
        && mv out/${c}_tmp.mp4 out/${c}_hq$p.mp4 && echo "PARTE $c $p/$np ($a-$b)" || echo "FALLO $c $p"
      exit 0
    fi
  done
  L=out/${c}_hqlista.txt; : > $L
  for ((p=1; p<=np; p++)); do echo "file '$PWD/out/${c}_hq$p.mp4'" >> $L; done
  ffmpeg -y -loglevel error -f concat -safe 0 -i $L -i public/$d/voz.wav -i public/$d/musica.wav \
    -filter_complex "[0:v]scale=1080:1920:flags=lanczos[v];[1:a][2:a]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -ar 48000 -c:a aac -b:a 192k -movflags +faststart -shortest \
    ../entregas/videos/$n.mp4 && echo "ARMADO $n"
  exit 0
done
echo NADA
