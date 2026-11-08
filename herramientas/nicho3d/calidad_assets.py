"""Descarga (una sola vez) las texturas y cielos CC0 de Poly Haven que usa calidad.py.

Uso: python3 calidad_assets.py
Guarda todo en herramientas/nicho3d/assets_cache/ (no se sube al repo).
"""
import json, os, subprocess, sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets_cache')
TEXTURAS = ['brown_mud_02', 'farm_soil', 'forest_leaves_02', 'leafy_grass', 'coast_sand_01', 'rock_wall_08', 'dark_rock',
            'stone_wall', 'clay_plaster', 'brown_planks_05', 'bark_willow', 'thatch_roof_angled', 'snow_02']
TEXTURAS += ['excavated_soil_wall', 'patterned_paving', 'blue_floor_tiles_01', 'smooth_concrete_floor', 'rebar_reinforced_concrete',
             'brown_mud_rocks_01', 'grass_path_2', 'rough_concrete', 'clay_roof_tiles_02', 'plastered_wall_04', 'white_sandstone_blocks_02']
MODELOS = ['plastic_monobloc_chair_01', 'potted_plant_01', 'potted_plant_02', 'shrub_01', 'shrub_02', 'shrub_04',
           'outdoor_table_chair_set_01', 'garden_hose_wall_mounted_01', 'tree_small_02', 'planter_pot_clay', 'wooden_ladder']
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
        for mapa, nombre in (('Diffuse', 'diff'), ('Rough', 'rough'), ('nor_gl', 'nor'), ('Displacement', 'disp')):
            if mapa not in f:
                continue
            url = f[mapa][RES_TEX]['png' if mapa == 'Displacement' and 'png' in f[mapa][RES_TEX] else 'jpg']['url']
            curl(url, os.path.join(BASE, 'tex', t, f'{nombre}.' + url.rsplit('.', 1)[1]))
        print('textura', t)
    for m in MODELOS:
        g = info(m)['gltf']['1k']['gltf']
        d = os.path.join(BASE, 'modelos', m)
        curl(g['url'], os.path.join(d, os.path.basename(g['url'])))
        for rel, inc in g.get('include', {}).items():
            curl(inc['url'], os.path.join(d, rel))
        print('modelo', m)
    for h in CIELOS:
        url = info(h)['hdri'][RES_HDR]['hdr']['url']
        curl(url, os.path.join(BASE, 'hdri', f'{h}.hdr'))
        print('cielo', h)


if __name__ == '__main__':
    sys.exit(main())
