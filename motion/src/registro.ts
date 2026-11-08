import React from 'react';
import {Datos} from './serie/tema';
import atunDatos from './data/atun.json';
import {ESCENAS as atunEscenas, TINTES as atunTintes} from './atun/escenas';

// Registro de videos de la serie. Para agregar uno nuevo: guion → voz.py → musica.py → escenas → aquí.
export type VideoDef = {id: string; datos: Datos; escenas: Record<string, React.FC>; tintes: Record<string, string>};

export const VIDEOS: VideoDef[] = [{id: 'atun', datos: atunDatos as Datos, escenas: atunEscenas, tintes: atunTintes}];

export const buscar = (id: string) => VIDEOS.find((v) => v.id === id)!;
