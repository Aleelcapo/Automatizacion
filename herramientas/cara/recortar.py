"""Recorta la cabeza (pelo + cara) de una foto: GrabCut + corte bajo la barbilla.
Uso: python3 recortar.py foto.jpg x0 y0 x1 y1 salida.png   (rectángulo que contiene la cabeza)"""
import sys, cv2, numpy as np
src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
im = cv2.imread(src)
pad = 40
X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.shape[1], x1 + pad), min(im.shape[0], y1 + pad)
crop = im[Y0:Y1, X0:X1].copy()
mask = np.zeros(crop.shape[:2], np.uint8)
rect = (x0 - X0, y0 - Y0, x1 - x0, y1 - y0)
bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(crop, mask, rect, bg, fg, 8, cv2.GC_INIT_WITH_RECT)
m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
# limitar a una elipse de cabeza (corta hombros/ropa bajo la barbilla)
h, w = m.shape; ell = np.zeros_like(m)
cx, cy = (x0 + x1) // 2 - X0, (y0 + y1) // 2 - Y0
cv2.ellipse(ell, (cx, cy), ((x1 - x0) // 2 + 6, (y1 - y0) // 2 + 4), 0, 0, 360, 255, -1)
m = cv2.bitwise_and(m, ell)
# quedarse con el componente más grande, rellenar huecos y suavizar el borde
n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
if n > 1: m = np.where(lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
m = cv2.GaussianBlur(m, (5, 5), 0)
rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA); rgba[:, :, 3] = m
ys, xs = np.where(m > 10); rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cv2.imwrite(out, rgba); print(out, rgba.shape)
