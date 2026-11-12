import React from 'react';
import {Composition, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {FPS, H, W} from './serie/tema';
import {VideoSerie} from './serie/Video';
import {VIDEOS} from './registro';
import {DURACION_TANQUE, TanqueBano} from './tres/TanqueBano';

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
  </>
);
