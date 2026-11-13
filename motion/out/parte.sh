#!/bin/bash
# uso: parte.sh <composicion> <n> <desde> <hasta>
cd /home/user/Automatizacion/motion
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
npx remotion render src/index.ts $1 out/$1_p$2.mp4 --frames=$3-$4 --gl=swangle --scale=1.5 --crf=16 --audio-bitrate=192k --timeout=240000 --log=error > out/$1_p$2.txt 2>&1 && echo LISTO $1 $2
