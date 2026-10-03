/* ═══ v2.3.2987: A RUN OF PHOTOGRAPHS, READ BACK OFF THE GPU IN ONE GO ═══
 *
 * The stat scene's fighter is photographed off the world's own renderers: the
 * swing and the bow shot off the effects renderer's stand-ins (v2.3.2986), the
 * dodge roll and the jog off the player's own figure (v2.3.2987).  Each frame
 * is rendered into its own small texture -- clipped to its own box, so a blade
 * tip cannot spill into the next frame -- and what costs is getting them back
 * off the GPU.  MEASURED (headless Chromium, whose GPU is software): posing and
 * drawing are under 1ms a frame, and the readback is the whole cost, ~230ms for
 * the swing's eleven, scaling with pixels -- so the frames are laid out on as
 * few sheets as fit and read back once a sheet, not once a frame.  A phone's
 * GPU reads back in a fraction of that; it is still the cost, which is why the
 * callers cap their resolution at 2 and crop the frames to their paint.
 *
 * A sheet is never more than 2048px on a side: older iPhones cannot make a
 * texture larger than 4096, and a jog is ~30 frames.  This module is the one
 * copy of that rule; both capture sites read back through it.
 *
 *   R      the Pixi renderer (generateTexture + extract)
 *   texs   the frames, all one size (generateTexture's own textures)
 *   res    the resolution they were made at (device px per texture unit)
 * Returns one canvas per frame, round(width x res) by round(height x res).
 * The textures are the caller's to destroy; the sheets are destroyed here. */
import { Container, Rectangle, Sprite } from 'pixi.js';

const SHEET_MAX = 2048;

export function readbackFrames(R, texs, res) {
  const n = texs.length;
  if (!n) return [];
  const fw = texs[0].width, fh = texs[0].height;
  const pw = Math.round(fw * res), ph = Math.round(fh * res);
  const cols = Math.max(1, Math.min(n, Math.floor(SHEET_MAX / Math.max(1, pw))));
  const rowsPer = Math.max(1, Math.floor(SHEET_MAX / Math.max(1, ph)));
  const per = cols * rowsPer;
  const out = [];
  for (let s0 = 0; s0 < n; s0 += per) {
    const part = texs.slice(s0, s0 + per);
    const rows = Math.ceil(part.length / cols);
    const sheet = new Container();
    part.forEach((t, i) => {
      const sp = new Sprite(t);
      sp.x = (i % cols) * fw; sp.y = Math.floor(i / cols) * fh;
      sheet.addChild(sp);
    });
    let big = null;
    const all = R.generateTexture({ target: sheet, frame: new Rectangle(0, 0, Math.min(part.length, cols) * fw, rows * fh), resolution: res });
    try { big = R.extract.canvas({ target: all }); } finally { all.destroy(true); sheet.destroy({ children: true }); }
    part.forEach((t, i) => {
      const c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      c.getContext('2d').drawImage(big, (i % cols) * pw, Math.floor(i / cols) * ph, pw, ph, 0, 0, pw, ph);
      out.push(c);
    });
  }
  return out;
}
