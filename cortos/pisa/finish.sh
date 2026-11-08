#!/bin/bash
# encode the JPEG sequence + mux the mix (video from the frames, audio from mix.wav)
cd /home/user/Automatizacion/remotion/out/pisa/frames
ls *.jpeg *.jpg 2>/dev/null | sort > /root/pisa-short/framelist.txt
n=$(wc -l < /root/pisa-short/framelist.txt); echo "frames: $n"
awk '{print "file '"'"'" ENVIRON["PWD"] "/" $0 "'"'"'\nduration 0.0333333333"}' /root/pisa-short/framelist.txt > /root/pisa-short/concat.txt
ffmpeg -v error -y -r 30 -f concat -safe 0 -i /root/pisa-short/concat.txt -i /root/pisa-short/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -shortest -movflags +faststart /root/pisa-short/final.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,nb_frames -of compact /root/pisa-short/final.mp4
