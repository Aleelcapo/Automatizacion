#!/bin/bash
# run_video.sh <dir_trabajo> <salida_dir> <nombre>  -> MP4 final + SRT con la voz original del audio
set -e
D="$1"; OUT="$2"; NAME="$3"; H=/home/user/Automatizacion/herramientas/comidas
export GEO_LON0=-180 GEO_SPAN=660 WORK="$D" SRC_WORK=/home/user/Automatizacion/work LAYOUT=layout_cfg VIDEO_CFG="$D/video.json"
cd "$D"
python3 $H/render.py timings.json video.mp4 --workers 4 2>&1 | grep -v AVISO | tail -1
python3 $H/sfx.py timings.json sfx.wav
ffmpeg -v error -y -i raw.wav -af "highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 voz_norm.wav
DUR=$(python3 -c "import json;print(json.load(open('timings.json'))['duration'])")
mkdir -p "$OUT"
ffmpeg -v error -y -i video.mp4 -i voz_norm.wav -i sfx.wav -filter_complex "[1:a]aresample=48000,apad[v];[2:a]aresample=48000[s];[v][s]amix=inputs=2:duration=first:normalize=0,atrim=0:$DUR,alimiter=limit=0.89[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -ac 2 -ar 48000 -movflags +faststart -shortest "$OUT/$NAME.mp4"
python3 $H/make_srt.py timings.json "$OUT/${NAME}_palabras.srt" "$OUT/${NAME}_frases.srt"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of compact "$OUT/$NAME.mp4"
ffmpeg -v error -i "$OUT/$NAME.mp4" -f null - && echo "decodifica OK"
ffmpeg -i "$OUT/$NAME.mp4" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:"
ffmpeg -v error -y -i "$OUT/$NAME.mp4" -vf "fps=1,scale=216:384,tile=14x4" -frames:v 1 "$D/sheet.jpg"
