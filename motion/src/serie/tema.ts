// Identidad visual de la serie: cambiar aquí afecta a todos los videos.
export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const C = {
  fondo1: '#060b1c',
  fondo2: '#0d1d42',
  texto: '#ffffff',
  tenue: 'rgba(255,255,255,0.55)',
  oro: '#ffc83d',
  oroOscuro: '#2a1c00',
  cian: '#3ee0ff',
  rojo: '#ff4d5e',
  verde: '#3ddc84',
  tarjeta: 'rgba(255,255,255,0.06)',
  borde: 'rgba(255,255,255,0.14)',
};

export const FUENTE = 'Inter';

export type Palabra = {t: number; e: number; w: string; k: boolean; a?: string[]};
export type Beat = {scene: string; start: number; dur: number; text: string; words: Palabra[]; sfx: string[][]; escena?: any};
export type Datos = {id: string; duration: number; beats: Beat[]; estilo?: any};
