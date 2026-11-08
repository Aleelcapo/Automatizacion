import React from 'react';
import {Datos} from './serie/tema';
import atunDatos from './data/atun.json';
import bowlingDatos from './data/bowling.json';
import mano_izquierdaDatos from './data/mano_izquierda.json';
import narcotraficoDatos from './data/narcotrafico.json';
import zoologicosDatos from './data/zoologicos.json';
import ojos_clarosDatos from './data/ojos_claros.json';
import cosquillasDatos from './data/cosquillas.json';
import monedasDatos from './data/monedas.json';
import palomitasDatos from './data/palomitas.json';
import celular_arrozDatos from './data/celular_arroz.json';
import rayo_autoDatos from './data/rayo_auto.json';
import {ESCENAS as atunEscenas, TINTES as atunTintes} from './atun/escenas';

// Registro de videos de la serie.
// Video con escenas propias (atún) o con escenas genéricas descritas en el guion (el resto).
export type VideoDef = {id: string; datos: Datos; escenas: Record<string, React.FC>; tintes: Record<string, string>};

export const VIDEOS: VideoDef[] = [
  {id: 'atun', datos: atunDatos as Datos, escenas: atunEscenas, tintes: atunTintes},
  {id: 'bowling', datos: bowlingDatos as Datos, escenas: {}, tintes: {}},
  {id: 'mano_izquierda', datos: mano_izquierdaDatos as Datos, escenas: {}, tintes: {}},
  {id: 'narcotrafico', datos: narcotraficoDatos as Datos, escenas: {}, tintes: {}},
  {id: 'zoologicos', datos: zoologicosDatos as Datos, escenas: {}, tintes: {}},
  {id: 'ojos_claros', datos: ojos_clarosDatos as Datos, escenas: {}, tintes: {}},
  {id: 'cosquillas', datos: cosquillasDatos as Datos, escenas: {}, tintes: {}},
  {id: 'monedas', datos: monedasDatos as Datos, escenas: {}, tintes: {}},
  {id: 'palomitas', datos: palomitasDatos as Datos, escenas: {}, tintes: {}},
  {id: 'celular_arroz', datos: celular_arrozDatos as Datos, escenas: {}, tintes: {}},
  {id: 'rayo_auto', datos: rayo_autoDatos as Datos, escenas: {}, tintes: {}},
];

export const buscar = (id: string) => VIDEOS.find((v) => v.id === id)!;
