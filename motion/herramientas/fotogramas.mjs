// Renderiza varios fotogramas sueltos de una composición en una sola pasada.
// Uso: node herramientas/fotogramas.mjs <composicion> <salida_dir> <escala> seg1 seg2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const [comp, dir, escala, ...segs] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER;
const composition = await selectComposition({serveUrl, id: comp, browserExecutable, chromiumOptions: {gl: 'swangle'}});
for (const s of segs) {
  const frame = Math.round(parseFloat(s) * composition.fps);
  await renderStill({composition, serveUrl, frame, output: `${dir}/f_${String(s).padStart(5, '0')}.png`, scale: parseFloat(escala), browserExecutable, chromiumOptions: {gl: 'swangle'}});
  console.log('ok', s);
}
