"""Piezas para los dioramas de megaconstrucciones (sin casa ni patio): cara de corte con relieve y huecos
arbitrarios, etiquetas 3D, barco y estela."""
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diorama as D  # noqa: E402
import escena_base as B  # noqa: E402
from escena_base import Y0, key  # noqa: E402


def frente(nombre, x0, x1, z0, z1, m, tex, borrar=None, fuerza=0.25, y=Y0 - 0.001, res=0.08, tam=2.0):
    """Cara de corte con relieve; borrar(x, z) -> True quita esa cara (huecos de tuneles, etc.)."""
    res = max(res, float(os.environ.get('MEGA_RES', 0)))
    o = D.cara_relieve(nombre, x0, x1, z0, z1, y, m, tex=tex, tam=tam, fuerza=fuerza, res=res)
    D.aplicar_mods(o)
    if borrar:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        quita = [f for f in bm.faces if borrar(f.calc_center_median().x, f.calc_center_median().z)]
        bmesh.ops.delete(bm, geom=quita, context='FACES')
        bm.to_mesh(o.data)
        bm.free()
    return o


def capa(nombre, x0, x1, y0, y1, z0, z1, m, cortes=()):
    """Bloque de terreno de una capa, con cortadores (booleanos exactos) aplicados."""
    o = D.caja(nombre, x0, x1, y0, y1, z0, z1, m)
    for c in cortes:
        D.restar(o, c)
    D.aplicar_mods(o)
    return o


def cil_x(nombre, r, x0, x1, y, z, m=None, verts=40):
    """Cilindro a lo largo de x (para cortar o como tubo)."""
    o = B.cilindro(nombre, r, x1 - x0, 'x', m or D.liso('_c', (1, 1, 1)), (x0, y, z), verts=verts)
    return o


def segmento_cerca(px, pz, ax, az, bx, bz, r):
    vx, vz = bx - ax, bz - az
    t = max(0.0, min(1.0, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)))
    dx, dz = px - (ax + t * vx), pz - (az + t * vz)
    return dx * dx + dz * dz < r * r


def letrero(nombre, s, m, loc, tam=0.8, t_on=None, t_off=None, rot=(math.pi / 2, 0, 0)):
    t = B.texto(nombre, s, m, loc, tam=tam, rot=rot)
    if t_on is not None:
        B.pop(t, t_on, 0.3)
    if t_off is not None:
        B.quitar(t, t_off, 0.2)
    return t


def barco(nombre, M, loc, largo=5.0, ancho=1.4, color=(0.75, 0.12, 0.1)):
    """Ferry/carguero simple: casco con proa, franja, superestructura blanca y chimenea."""
    r = B.raiz(nombre, loc)
    casco_m = D.liso(nombre + '_casco', color, 0.45)
    L, W = largo, ancho
    perfil = [(-L / 2, 0.0), (L / 2 - 0.8, 0.0), (L / 2, 0.55), (-L / 2, 0.55)]
    casco = D.prisma_y(nombre + '_casco', perfil, -W / 2, W / 2, casco_m)
    franja = D.caja(nombre + '_franja', -L / 2 - 0.01, L / 2 - 0.35, -W / 2 - 0.01, W / 2 + 0.01, 0.42, 0.55, M['blanco'])
    sup = D.caja(nombre + '_sup', -L / 2 + 0.5, L / 2 - 1.4, -W / 2 + 0.15, W / 2 - 0.15, 0.55, 1.15, M['blanco'])
    sup2 = D.caja(nombre + '_sup2', -L / 2 + 0.9, L / 2 - 2.0, -W / 2 + 0.25, W / 2 - 0.25, 1.15, 1.55, M['blanco'])
    vent = D.caja(nombre + '_vent', -L / 2 + 0.55, L / 2 - 1.45, -W / 2 + 0.12, W / 2 - 0.12, 0.8, 0.92, M['vidrio'])
    chim = D.caja(nombre + '_chim', -L / 2 + 1.1, -L / 2 + 1.5, -0.2, 0.2, 1.55, 2.05, casco_m)
    B.hijos(r, [casco, franja, sup, sup2, vent, chim])
    return r
