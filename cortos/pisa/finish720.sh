#!/bin/bash
# order the 720 JPEG frames by number, encode H.264 30 fps + mux the mix (video from frames, audio from mix.wav)
set -e
F=/home/user/Automatizacion/remotion/out/pisa/frames720; S=/root/pisa-short/seq720
rm -rf $S; mkdir -p $S
for f in $F/element-*.jpeg; do n=$(basename $f .jpeg); n=$((10#${n#element-})); ln -s $f $(printf "$S/f%04d.jpg" $n); done
echo "frames: $(ls $S | wc -l)"
ffmpeg -v error -y -framerate 30 -i $S/f%04d.jpg -i /root/pisa-short/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart /root/pisa-short/pisa_720.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,nb_frames -of compact /root/pisa-short/pisa_720.mp4
