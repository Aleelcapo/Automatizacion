import React from 'react';
import {Composition, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {FPS, H, W} from './serie/tema';
import {VideoSerie} from './serie/Video';
import {VIDEOS} from './registro';
import {DURACION_TANQUE, TanqueBano} from './tres/TanqueBano';
import {DURACION_OLLA, OllaExpres} from './tres/OllaExpres';
import {DURACION_TERMO, Termo} from './tres/Termo';
import {DURACION_LATA, Lata} from './tres/Lata';
import {Contacto, DURACION_CONTACTO} from './tres/Contacto';
import {DURACION_MICROONDAS, Microondas} from './tres/Microondas';
import {DURACION_ENCENDEDOR, Encendedor} from './tres/Encendedor';
import {DURACION_PASTILLA, PastillaVideo} from './tres/Pastilla';
import {ChapaVideo, DURACION_CHAPA} from './tres/Chapa';
import {DURACION_LLANTA, LlantaVideo} from './tres/Llanta';
import {DURACION_LICUADORA, LicuadoraVideo} from './tres/Licuadora';
import {DURACION_PLANCHA, PlanchaVideo} from './tres/Plancha';
import {DURACION_REGULADOR, ReguladorVideo} from './tres/Regulador';

for (const [archivo, peso] of [
  ['Inter-SemiBold.otf', '600'],
  ['Inter-Bold.otf', '700'],
  ['Inter-ExtraBold.otf', '800'],
  ['Inter-Black.otf', '900'],
] as const) {
  loadFont({family: 'Inter', url: staticFile(`fonts/${archivo}`), weight: peso});
}

export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <Composition
        key={v.id}
        id={v.id.replace(/_/g, '-')}
        component={VideoSerie}
        durationInFrames={Math.ceil(v.datos.duration * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{id: v.id}}
      />
    ))}
    <Composition id="tanque-bano" component={TanqueBano} durationInFrames={Math.ceil(DURACION_TANQUE * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="olla" component={OllaExpres} durationInFrames={Math.ceil(DURACION_OLLA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="termo" component={Termo} durationInFrames={Math.ceil(DURACION_TERMO * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="lata" component={Lata} durationInFrames={Math.ceil(DURACION_LATA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="contacto" component={Contacto} durationInFrames={Math.ceil(DURACION_CONTACTO * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="microondas" component={Microondas} durationInFrames={Math.ceil(DURACION_MICROONDAS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="encendedor" component={Encendedor} durationInFrames={Math.ceil(DURACION_ENCENDEDOR * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="pastilla" component={PastillaVideo} durationInFrames={Math.ceil(DURACION_PASTILLA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="chapa" component={ChapaVideo} durationInFrames={Math.ceil(DURACION_CHAPA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="llanta" component={LlantaVideo} durationInFrames={Math.ceil(DURACION_LLANTA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="licuadora" component={LicuadoraVideo} durationInFrames={Math.ceil(DURACION_LICUADORA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="plancha" component={PlanchaVideo} durationInFrames={Math.ceil(DURACION_PLANCHA * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="regulador-gas" component={ReguladorVideo} durationInFrames={Math.ceil(DURACION_REGULADOR * FPS)} fps={FPS} width={W} height={H} />
  </>
);
