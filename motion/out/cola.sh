#!/bin/bash
# Renderiza UNA parte pendiente (o arma un video) por llamada.
cd /home/user/Automatizacion/motion
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
LISTA="olla:olla:13_3D_Olla_expres termo:termo:14_3D_Termo lata:lata:15_3D_Lata contacto:contacto:16_3D_Contacto microondas:microondas:17_3D_Microondas encendedor:encendedor:18_3D_Encendedor pastilla:pastilla:19_3D_Pastilla chapa:chapa:20_3D_Chapa llanta:llanta:21_3D_Llanta licuadora:licuadora:22_3D_Licuadora plancha:plancha:23_3D_Plancha regulador-gas:regulador_gas:24_3D_Regulador_gas pluma:pluma:25_3D_Pluma extintor:extintor:26_3D_Extintor"
for item in $LISTA; do
  IFS=: read c d n <<< "$item"
  [ -f ../entregas/videos/$n.mp4 ] && continue
  total=$(python3 -c "import json,math;print(math.ceil(json.load(open('src/data/$d.json'))['duration']*30))")
  t3=$(( (total + 2) / 3 ))
  for p in 1 2 3; do
    a=$(( (p - 1) * t3 )); b=$(( p * t3 - 1 )); [ $b -ge $total ] && b=$(( total - 1 ))
    if [ ! -f out/${c}_p$p.mp4 ]; then
      npx remotion render src/index.ts $c out/${c}_tmp.mp4 --frames=$a-$b --gl=swangle --scale=1.5 --crf=16 --audio-bitrate=192k --timeout=240000 --log=error > out/${c}_p$p.txt 2>&1 \
        && mv out/${c}_tmp.mp4 out/${c}_p$p.mp4 && echo "PARTE $c $p ($a-$b)" || echo "FALLO $c $p"
      exit 0
    fi
  done
  bash out/armar.sh $c $d $n
  exit 0
done
echo NADA
