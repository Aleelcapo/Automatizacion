import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Escena, Escenario, Fondo, Progreso} from './Fondo';
import {Subtitulos} from './Subtitulos';
import {BeatCtx} from './util';
import {buscar} from '../registro';
import {EscenaGenerica} from './Bloques';

/** Arma un video de la serie: fondo + escenas (una por beat) + subtítulos + audio. */
export const VideoSerie: React.FC<{id: string}> = ({id}) => {
  const {datos, escenas, tintes} = buscar(id);
  const {fps, durationInFrames} = useVideoConfig();
  const desde = datos.beats.map((b, i) => (i === 0 ? 0 : Math.round(b.start * fps)));
  return (
    <AbsoluteFill style={{backgroundColor: '#060b1c'}}>
      {datos.beats.map((b, i) => {
        const fin = i + 1 < datos.beats.length ? desde[i + 1] : durationInFrames;
        const Comp = escenas[b.scene] ?? (b.escena ? EscenaGenerica : null);
        const beat = {...b, start: desde[i] / fps, dur: (fin - desde[i]) / fps, acento: datos.estilo?.acento};
        return (
          <Sequence key={i} from={desde[i]} durationInFrames={fin - desde[i]} name={b.scene}>
            <BeatCtx.Provider value={beat}>
              <Fondo tinte={b.escena?.tinte ?? tintes[b.scene] ?? datos.estilo?.tinte} />
              <Escenario tipo={b.escena?.escenario ?? datos.estilo?.escenario} />
              <Escena>{Comp ? <Comp /> : null}</Escena>
            </BeatCtx.Provider>
          </Sequence>
        );
      })}
      {datos.estilo?.subtitulos ? <Subtitulos datos={datos} /> : null}
      <Progreso total={durationInFrames} />
      <Audio src={staticFile(`${datos.id}/voz.wav`)} />
      <Audio src={staticFile(`${datos.id}/musica.wav`)} />
    </AbsoluteFill>
  );
};
