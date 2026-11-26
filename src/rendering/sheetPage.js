/* ═══ v2.3.6744: A SHEET'S PAGE AT ITS OWN VERSION (card KEEP, PR 3c: /world/objects) ═══
 *
 * A sheet is two files: its frames (x.json) and its page, the picture they
 * are cut from (x.png).  Pixi's sheet loader asks for the page at the sheet's
 * folder with the SHEET's query copied on (spritesheetAsset copySearchParams):
 * `x.json?v=<the json's version>` would ask for `x.png?v=<the json's
 * version>` -- the wrong version, so a changed page kept a year would show
 * old (card KEEP's rule 3), and the census reads it 'hand'.
 *
 * So the page is loaded first, at its OWN address (assetUrl: its bytes'
 * version), through the same loader Pixi's sheet loader uses for it
 * (Assets.loader.load: paletteLoad.js's numbers where they apply, a picture
 * else), and handed to the sheet's Assets.load as `data.texture`, which Pixi
 * then uses instead of asking.  Unloading the sheet unloads its page as
 * before (spritesheetAsset.unload: `loader.unload(textureSource._sourceOrigin)`,
 * the page's address), so the callers' unload stays one Assets.unload of the
 * sheet.
 *
 *   loadSheetPage(page)   -> its Texture (rejects as a load does)
 *   freeSheetPage(page)   the page let go when its sheet's load failed after it
 */
import { Assets } from 'pixi.js';

export async function loadSheetPage(page) {
  const got = await Assets.loader.load([{ src: page }]);
  const tex = got && got[page];
  if (!tex) throw new Error('no page: ' + page);
  return tex;
}

export function freeSheetPage(page) {
  try { return Promise.resolve(Assets.loader.unload(page)).catch(() => {}); } catch (e) { return Promise.resolve(); }
}
