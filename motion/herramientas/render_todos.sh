#!/bin/bash
# Renderiza videos de la serie a entregas/videos/ (con audio a -14 LUFS, subtítulos .srt y guion .txt).
# Uso: bash herramientas/render_todos.sh atun bowling ...   (sin argumentos: todos)
set -e
cd "$(dirname "$0")/.."
export REMOTION_BROWSER=${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
declare -A NOMBRE=([atun]=01_Atun_10000_en_un_dia [bowling]=02_Bowling_190_sin_strike [mano_izquierda]=03_Mano_izquierda
  [narcotrafico]=04_Narcotrafico_economia [zoologicos]=05_Zoologicos [ojos_claros]=06_Ojos_claros [cosquillas]=07_Cosquillas
  [monedas]=08_Monedas_viejas [palomitas]=09_Palomitas_del_cine [celular_arroz]=10_Celular_en_arroz [rayo_auto]=11_Rayo_en_el_auto)
IDS=${@:-atun bowling mano_izquierda narcotrafico zoologicos ojos_claros cosquillas monedas palomitas celular_arroz rayo_auto}
mkdir -p out ../entregas/videos
for id in $IDS; do
  n=${NOMBRE[$id]}
  echo "== $id → $n"
  npx remotion render src/index.ts "${id//_/-}" "out/$id.mp4" --crf=20 --audio-bitrate=192k --log=error
  ffmpeg -v error -y -i "out/$id.mp4" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -movflags +faststart "../entregas/videos/$n.mp4"
  python3 herramientas/srt.py "$id" "../entregas/videos/$n" >/dev/null
done
echo LISTO
