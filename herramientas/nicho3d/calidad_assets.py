"""Descarga (una sola vez) las texturas y cielos CC0 de Poly Haven que usa calidad.py.

Uso: python3 calidad_assets.py
Guarda todo en herramientas/nicho3d/assets_cache/ (no se sube al repo).
"""
import json, os, subprocess, sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets_cache')
TEXTURAS = ['brown_mud_02', 'farm_soil', 'forest_leaves_02', 'leafy_grass', 'coast_sand_01', 'rock_wall_08', 'dark_rock',
            'stone_wall', 'clay_plaster', 'brown_planks_05', 'bark_willow', 'thatch_roof_angled', 'snow_02']
CIELOS = ['kloofendal_48d_partly_cloudy_puresky', 'belfast_sunset_puresky']
RES_TEX, RES_HDR = '1k', '2k'


def curl(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return
    subprocess.run(['curl', '-sSfL', '--max-time', '300', '-o', dest, url], check=True)


def info(asset):
    out = subprocess.run(['curl', '-sSfL', '--max-time', '60', f'https://api.polyhaven.com/files/{asset}'],
                         capture_output=True, check=True).stdout
    return json.loads(out)


def main():
    for t in TEXTURAS:
        f = info(t)
        for mapa, nombre in (('Diffuse', 'diff'), ('Rough', 'rough'), ('nor_gl', 'nor')):
            url = f[mapa][RES_TEX]['jpg']['url']
            curl(url, os.path.join(BASE, 'tex', t, f'{nombre}.jpg'))
        print('textura', t)
    for h in CIELOS:
        url = info(h)['hdri'][RES_HDR]['hdr']['url']
        curl(url, os.path.join(BASE, 'hdri', f'{h}.hdr'))
        print('cielo', h)


if __name__ == '__main__':
    sys.exit(main())
