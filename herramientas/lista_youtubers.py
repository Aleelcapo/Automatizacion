"""Une los JSON de la investigación de youtubers y genera Excel + CSV.

    python3 herramientas/lista_youtubers.py work/yt_*.json --out entregas/youtubers_gta
"""
import sys, json, csv, argparse, re, unicodedata
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

COLS = [('prioridad', 'Prioridad', 10), ('nombre', 'Canal', 26), ('url', 'Enlace YouTube', 40),
        ('subs', 'Suscriptores', 14), ('subs_fuente', 'Fuente suscriptores', 34), ('pais', 'País', 14),
        ('contenido_gta', 'Contenido GTA', 34), ('directos', 'Directos', 9), ('plataforma', 'Plataforma', 18),
        ('clips', 'Permite clips', 13), ('clips_fuente', 'Fuente clips', 30), ('contacto', 'Contacto', 30),
        ('notas', 'Notas', 50)]
PRI = {'alta': 0, 'media': 1, 'baja': 2}
FILL = {'alta': 'C6EFCE', 'media': 'FFEB9C', 'baja': 'F2F2F2'}


def key(n):
    n = unicodedata.normalize('NFKD', n or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+'); ap.add_argument('--out', default='entregas/youtubers_gta')
    ap.add_argument('--min', type=float, default=100_000); ap.add_argument('--max', type=float, default=50_000_000)
    a = ap.parse_args()
    rows, seen = [], {}
    for f in a.files:
        for r in json.load(open(f)):
            k = key(r.get('nombre'))
            s = r.get('subs')
            if isinstance(s, str):
                s = float(re.sub(r'[^\d.]', '', s) or 0) or None
            r['subs'] = int(s) if s else None
            if r['subs'] is not None and not (a.min <= r['subs'] <= a.max):
                continue
            if k in seen:                       # duplicado: se queda el de dato de subs verificado
                if seen[k].get('subs') is None and r['subs'] is not None:
                    rows[rows.index(seen[k])] = r; seen[k] = r
                continue
            seen[k] = r; rows.append(r)
    rows.sort(key=lambda r: (PRI.get((r.get('prioridad') or '').lower(), 3), -(r['subs'] or 0)))

    with open(a.out + '.csv', 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh)
        w.writerow([c[1] for c in COLS])
        for r in rows:
            w.writerow([r.get(c[0]) if r.get(c[0]) is not None else '' for c in COLS])

    wb = Workbook(); ws = wb.active; ws.title = 'Youtubers GTA'
    ws.append([c[1] for c in COLS])
    for c in ws[1]:
        c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1F1F1F')
    for r in rows:
        ws.append([r.get(c[0]) if r.get(c[0]) is not None else ('sin verificar' if c[0] == 'subs' else '')
                   for c in COLS])
        row = ws.max_row
        p = (r.get('prioridad') or '').lower()
        if p in FILL:
            ws.cell(row, 1).fill = PatternFill('solid', fgColor=FILL[p])
        if r.get('url'):
            ws.cell(row, 3).hyperlink = r['url']; ws.cell(row, 3).style = 'Hyperlink'
        ws.cell(row, 4).number_format = '#,##0'
    for i, (_, _, wdt) in enumerate(COLS, 1):
        ws.column_dimensions[get_column_letter(i)].width = wdt
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(vertical='top', wrap_text=c.column in (5, 7, 11, 13))
    ws.freeze_panes = 'C2'
    ws.auto_filter.ref = ws.dimensions
    wb.save(a.out + '.xlsx')
    print(len(rows), 'canales ->', a.out + '.xlsx', a.out + '.csv')


if __name__ == '__main__':
    main()
