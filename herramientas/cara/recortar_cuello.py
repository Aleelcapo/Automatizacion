"""Recorta cabeza + cuello de una foto, quita la ropa y desvanece la base del cuello.
Uso: python3 recortar_cuello.py foto.jpg x0 y0 x1 y1 y_menton salida.png"""
import sys, cv2, numpy as np
src = sys.argv[1]; x0, y0, x1, y1, ychin = map(int, sys.argv[2:7]); out_path = sys.argv[7]
im = cv2.imread(src); pad = 40
X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.shape[1], x1 + pad), min(im.shape[0], y1 + pad)
crop = np.ascontiguousarray(im[Y0:Y1, X0:X1]); mask = np.zeros(crop.shape[:2], np.uint8)
cv2.grabCut(crop, mask, (x0 - X0, y0 - Y0, x1 - x0, y1 - y0), np.zeros((1, 65)), np.zeros((1, 65)), 10, cv2.GC_INIT_WITH_RECT)
m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV); h, w = m.shape
yy = np.repeat(np.arange(h)[:, None], w, 1); xx = np.repeat(np.arange(w)[None, :], h, 0)
chin = ychin - Y0
cloth = ((hsv[:, :, 0] > 90) & (hsv[:, :, 0] < 130) & (hsv[:, :, 1] > 40)) | (hsv[:, :, 2] < 55)
m[(yy > chin) & cloth] = 0
cx = (x0 + x1) // 2 - X0
m[(yy > chin + 6) & (np.abs(xx - cx + 4) > 34)] = 0
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
if n > 1: m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
ys, xs = np.where(m > 0); bottom = ys.max()
m = (m * np.clip((bottom - yy) / 26.0, 0, 1)).astype(np.uint8)
rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA); rgba[:, :, 3] = cv2.GaussianBlur(m, (3, 3), 0)
ys, xs = np.where(rgba[:, :, 3] > 8); top = ys.min(); rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
big = cv2.resize(rgba, None, fx=3.2, fy=3.2, interpolation=cv2.INTER_CUBIC)
rgb = big[:, :, :3].astype(np.float32); sh = np.clip(rgb * 1.6 - cv2.GaussianBlur(rgb, (0, 0), 2.2) * .6, 0, 255)
cv2.imwrite(out_path, np.dstack([sh.astype(np.uint8), cv2.GaussianBlur(big[:, :, 3], (0, 0), 1.2)]))
print(big.shape, 'mentón en', round((chin - top) / rgba.shape[0], 3), 'del alto')
