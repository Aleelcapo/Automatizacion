#!/bin/bash
# uso: armar.sh <composicion> <id_datos> <nombre_final>
cd /home/user/Automatizacion/motion
c=$1; d=$2; n=$3
L=out/${c}_lista.txt
: > $L
for p in 1 2 3; do echo "file '$PWD/out/${c}_p$p.mp4'" >> $L; done
ffmpeg -y -loglevel error -f concat -safe 0 -i $L -i public/$d/voz.wav -i public/$d/musica.wav \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos[v];[1:a][2:a]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -ar 48000 -c:a aac -b:a 192k -movflags +faststart -shortest \
  ../entregas/videos/$n.mp4 && echo ARMADO $n
