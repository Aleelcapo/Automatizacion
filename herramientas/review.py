import sys, json, subprocess, os, numpy as np, cv2
mp4, plan, outp = sys.argv[1], sys.argv[2], sys.argv[3]
P = json.load(open(plan))
shots = P['shots']; total = P['total']
tiles = []
for i, s in enumerate(shots):
    a = s['at']; b = shots[i+1]['at'] if i+1 < len(shots) else total
    row = []
    for tt in (a + 0.04, (a+b)/2, b - 0.06):
        raw = subprocess.run(['ffmpeg','-v','error','-ss',f'{tt:.3f}','-i',mp4,'-frames:v','1','-vf','scale=135:240','-f','rawvideo','-pix_fmt','bgr24','-'],capture_output=True).stdout
        im = np.frombuffer(raw,np.uint8).reshape(240,135,3).copy()
        cv2.putText(im, f'{i}:{tt:.1f}', (2,12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,255,255), 1)
        row.append(im)
    tiles.append(np.hstack(row + [np.zeros((240,6,3),np.uint8)]))
per = 6  # shots per row-group
rows = []
for k in range(0, len(tiles), per):
    grp = tiles[k:k+per]
    while len(grp) < per: grp.append(np.zeros_like(tiles[0]))
    rows.append(np.hstack(grp))
# split into images of 4 rows
for j in range(0, len(rows), 4):
    cv2.imwrite(outp.replace('.jpg', f'_{j//4}.jpg'), np.vstack(rows[j:j+4]), [cv2.IMWRITE_JPEG_QUALITY, 85])
print(len(shots), 'shots')
