#!/bin/bash
# resumable final render: JPEG sequence in chunks of 100 frames (1080x1920, 30 fps), then encode + mux in finish.sh
cd /home/user/Automatizacion/remotion
OUT=out/pisa/frames720
mkdir -p $OUT
CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
[ -f out/pisa/bundle/index.html ] || npx remotion bundle src/index.ts --out-dir=out/pisa/bundle > /root/pisa-short/bundle.log 2>&1
for a in $(seq 0 50 1879); do
  b=$((a + 49)); [ $b -gt 1879 ] && b=1879
  if [ -f $OUT/done_$a ]; then continue; fi
  tmp=out/pisa/c720_$a; rm -rf $tmp
  C=2; for x in 566 629 848 978 1168 1477; do [ $x -ge $((a - 5)) ] && [ $x -le $((b + 5)) ] && C=1; done
  npx remotion render out/pisa/bundle PisaShort $tmp --sequence --image-format=jpeg --jpeg-quality=95 --frames=$a-$b \
    --gl=swangle --browser-executable=$CHROME --concurrency=$C --scale=0.6666667 --props='{"post":{"dpr":0.6666667}}' --timeout=600000 --log=info >> /root/pisa-short/render720.log 2>&1 || { echo "chunk $a failed" >> /root/pisa-short/render720.log; continue; }
  mv $tmp/* $OUT/ && rmdir $tmp && touch $OUT/done_$a
  echo "$(date +%T) chunk $a-$b ok" >> /root/pisa-short/render720_progress.log
done
echo "$(date +%T) ALL DONE" >> /root/pisa-short/render720_progress.log
