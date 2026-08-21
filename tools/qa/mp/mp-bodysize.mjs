/* IS THE CHARACTER THE SAME SIZE IN EVERY DIRECTION? (v2.3.1826)
 *
 * Owner: "Character's size is inconsistent across different directions
 * (east, southwest, etc).  I don't know the best way to fix that.  Also
 * without breaking anything else (relative item scale like hats, beards,
 * etc)."
 *
 * Measured through bodyFigureProbe, which reads the pixels of the frame
 * actually on screen and converts through the live transform — see the note
 * on that probe for why neither the sheets nor getBounds() can answer this.
 *
 * Two numbers matter and they are different failures:
 *   - figurePx: crown-to-boots on screen.  If it varies, the character
 *     grows and shrinks as you turn.
 *   - feetOffsetPx: where the boots land.  The body sprite is anchored at
 *     the CELL's centre, so a facing whose figure is taller also puts its
 *     feet lower — the character sinks and rises as it turns, which reads as
 *     the ground moving.
 *
 * The hat is measured alongside, because the owner's real constraint is that
 * fixing the body must not break the trait scale: traits are placed through
 * the same bodyScale, so hat-height / body-height must stay constant across
 * facings even as both change.
 */
import * as H from './harness.mjs';

const DIRS = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];

/* Pin the facing from INSIDE a rAF: _facingAngle is slewed by the game loop,
   so a value written from evaluate() is overwritten before the next draw. */
async function face(P, dir) {
  await P.page.evaluate((d) => {
    const S = window._gameState && window._gameState.current;
    if (!S) return;
    const ANG = {
      east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4,
      west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4,
    };
    window.__btPinDir = d;
    if (window.__btPinRaf) return;
    const tick = () => {
      const s = window._gameState && window._gameState.current;
      const k = window.__btPinDir;
      if (s && k) { s._facing = k; s._facingAngle = ANG[k]; s._renderFacing = k; }
      window.__btPinRaf = requestAnimationFrame(tick);
    };
    window.__btPinRaf = requestAnimationFrame(tick);
  }, dir);
  await P.page.waitForTimeout(700);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sizer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* Put a hat and a beard ON, so the trait-proportion assertion below has
     something to measure.  Ids are read out of the game's own catalogs
     rather than typed here — a hardcoded id that has since been retired
     would silently leave the character bare-headed and turn the assertion
     back into a skip. */
  const dressed = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.setHeadwear || !f.HEADWEAR_CATALOG) return null;
    const hat = (f.HEADWEAR_CATALOG || []).find((h) => h && h.id && h.id !== 'none');
    const beard = (f.FACIALHAIR_CATALOG || []).find((b) => b && b.id && b.id !== 'none');
    try { if (hat) f.setHeadwear(hat.id); } catch (e) { /* retired id */ }
    try { if (beard && f.setFacialHair) f.setFacialHair(beard.id); } catch (e) {}
    return { hat: hat && hat.id, beard: beard && beard.id };
  });
  await P.page.waitForTimeout(1500);
  rec.ok('the character is wearing something, so trait scale can be checked (guard)',
    !!(dressed && dressed.hat), dressed);

  const rows = [];
  for (const d of DIRS) {
    await face(P, d);
    const r = await P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.bodyFigureProbe
      ? window._pixiRenderer.bodyFigureProbe() : null));
    if (r && !r.err && r.painted && r.painted.h > 0) rows.push({ want: d, ...r });
  }

  rec.ok('every facing was measured (guard)', rows.length === DIRS.length,
    { got: rows.length, of: DIRS.length, rows: rows.map((r) => `${r.want}->${r.facing}:${r.figurePx}`) });
  if (!rows.length) { await P.ctx.close().catch(() => {}); return; }

  const hs = rows.map((r) => r.figurePx);
  const lo = Math.min(...hs), hi = Math.max(...hs);
  const spread = (hi - lo) / ((hi + lo) / 2);
  const worst = rows.slice().sort((a, b) => a.figurePx - b.figurePx);

  rec.ok('the character is the same height whichever way it faces (within 4%)',
    spread < 0.04,
    {
      spreadPct: +(spread * 100).toFixed(1),
      smallest: `${worst[0].want} ${worst[0].figurePx}px`,
      largest: `${worst[worst.length - 1].want} ${worst[worst.length - 1].figurePx}px`,
      all: rows.map((r) => `${r.want}=${r.figurePx}`),
    });

  const fs2 = rows.map((r) => r.feetOffsetPx);
  const fspread = Math.max(...fs2) - Math.min(...fs2);
  rec.ok('...and its boots stay on the same line as it turns (within 4px)',
    fspread < 4,
    { feetSpreadPx: +fspread.toFixed(1), all: rows.map((r) => `${r.want}=${r.feetOffsetPx}`) });

  /* ── the owner's constraint: "without breaking anything else (relative
     item scale like hats, beards, etc)" ──

     NOT hat-height / body-height.  That ratio genuinely differs between
     facings — each facing's hat art has its own frame size — and it is
     IDENTICAL before and after the body-scale change, which is the control
     that proved the first version of this assertion was measuring authored
     art rather than anything the fix touched.

     The invariant that matters is that the trait is scaled BY the body: every
     trait is placed through _placeTrait with the same bodyScale, so
     traitScale / bodyScale must be the same in every direction.  If a body
     scale edit ever moved one without the other, THIS is the number that
     changes — and a hat that no longer tracks the body is exactly the
     failure the owner was guarding against. */
  const worn = rows.filter((r) => r.hatScaleRatio > 0);
  if (worn.length >= 2) {
    const hr = worn.map((r) => r.hatScaleRatio);
    const spreadH = (Math.max(...hr) - Math.min(...hr)) / ((Math.max(...hr) + Math.min(...hr)) / 2);
    rec.ok('the hat is scaled by the body, in every direction',
      spreadH < 0.02,
      { spreadPct: +(spreadH * 100).toFixed(2), all: worn.map((r) => `${r.want}=${r.hatScaleRatio}`) });

    const br = rows.filter((r) => r.beardScaleRatio > 0).map((r) => r.beardScaleRatio);
    if (br.length >= 2) {
      const spreadB = (Math.max(...br) - Math.min(...br)) / ((Math.max(...br) + Math.min(...br)) / 2);
      rec.ok('...and so is the beard', spreadB < 0.02,
        { spreadPct: +(spreadB * 100).toFixed(2), all: br });
    }
  } else {
    rec.skip('the traits are scaled by the body',
      `this character is bare-headed (${worn.length} facing(s) had a hat)`);
  }

  await P.ctx.close().catch(() => {});
}
