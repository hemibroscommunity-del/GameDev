/* THE CAPE IS ON THE PLAYER, AND OFF HIM DURING A SWING (v2.3.2023).
 *
 * The cape is five stills registered into full 256 frames against the real
 * body (tools/import_cape_green.py), so its transform is the BODY SPRITE'S
 * transform and there is no anchor to get wrong.  That is exactly why this
 * file checks the transform rather than a screenshot: if the two ever stop
 * agreeing, the cape drifts off the character and every pixel test still
 * passes because the cape is drawn perfectly, somewhere else.
 *
 * WHY THE CAPE IS DRIVEN THROUGH localStorage.  These scenarios serve dist/,
 * a built bundle with no module URLs to import (the same limit
 * qa-hairmask-look.mjs documents), so the catalog cannot be called directly.
 * It reads `bt_cape` at module init, so setting the key and reloading is the
 * supported route in, not a trick.
 *
 * THE SWING ASSERTION IS THE ONE THAT MATTERS.  During an attack the real body
 * is hidden and the figure is redrawn by a stand-in in another layer while
 * `pose` still reads 'stand' — which is how the back shield ended up hanging
 * in the air beside a swing (v2.3.1784).  v1 hides the cape instead of drawing
 * it twice.  If that gate ever breaks, this is what says so.
 */
import * as H from './harness.mjs';

const raw = (P) => P.page.evaluate(() => {
  const r = window._pixiRenderer;
  const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
  if (!pd) return null;
  const c = pd._capeSprite, b = pd._spriteBody;
  return {
    /* EFFECTIVE size, not raw scale.  The body draws from a DOWNSCALED display
       texture and the cape from a raw 256 PNG, so their scale NUMBERS differ by
       exactly that factor while the drawn sizes agree — measured 0.4476 against
       0.8952, both landing on 114.6px.  Comparing the numbers would fail on a
       correct build, which is the wrong way round for a test. */
    pose: pd._animPose || null,
    cape: c ? { visible: !!c.visible, tex: !!(c.texture && c.texture.frame),
                x: Math.round(c.x), y: Math.round(c.y),
                w: +Math.abs(Number(c.scale.x) * ((c.texture && c.texture.frame && c.texture.frame.width) || 0)).toFixed(2),
                h: +Math.abs(Number(c.scale.y) * ((c.texture && c.texture.frame && c.texture.frame.height) || 0)).toFixed(2),
                mirror: Number(c.scale.x) < 0 } : null,
    body: b ? { visible: !!b.visible, x: Math.round(b.x), y: Math.round(b.y),
                w: +Math.abs(Number(b.scale.x) * ((b.texture && b.texture.frame && b.texture.frame.width) || 0)).toFixed(2),
                h: +Math.abs(Number(b.scale.y) * ((b.texture && b.texture.frame && b.texture.frame.height) || 0)).toFixed(2),
                mirror: Number(b.scale.x) < 0 } : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Caped', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const bare = await raw(P);
  rec.ok('the player display exposes a cape sprite (guard)', !!(bare && bare.cape), bare);
  rec.ok('with no cape owned, nothing is drawn', !!bare && bare.cape && bare.cape.visible === false,
    bare && bare.cape);

  await P.page.evaluate(() => { try { localStorage.setItem('bt_cape', 'crimson'); } catch (e) { /* private mode */ } });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(9000);        /* the stored identity resumes on its own */

  const worn = await raw(P);
  rec.ok('the cape is drawn once it is worn', !!(worn && worn.cape && worn.cape.visible && worn.cape.tex), worn && worn.cape);
  rec.ok('...and the body is drawn under it (guard: otherwise "visible" means nothing)',
    !!(worn && worn.body && worn.body.visible), worn && worn.body);
  /* THE REGISTRATION. Same origin, same scale — a full-frame sticker on a
     256 frame, so any divergence is the cape coming off the character. */
  rec.ok('the cape sits exactly on the body sprite, not near it',
    !!(worn && worn.cape && worn.body && worn.cape.x === worn.body.x && worn.cape.y === worn.body.y),
    { cape: worn && worn.cape, body: worn && worn.body });
  rec.ok('...and is DRAWN the same size as the body, mirror included',
    !!(worn && worn.cape && worn.body && worn.body.w > 0
       && Math.abs(worn.cape.w - worn.body.w) < 1.5
       && Math.abs(worn.cape.h - worn.body.h) < 1.5
       && worn.cape.mirror === worn.body.mirror),
    { cape: worn && worn.cape, body: worn && worn.body });

  /* ── JOGGING ── owner: "Does it work while jogging too?"
   * It did not, and nothing here would have said so.  The art is a STANDING
   * still, and the standing figure is not where the figure is on a jog frame:
   * body-tops.json puts the crown +18x +21y in 256-space between stand-east-0
   * and jog-east.  Pinned to the frame origin the hood stayed over the
   * standing head while the real head ran out from under it — the face poking
   * out in front of the hood, plainly visible in a screenshot and invisible to
   * every assertion above, because position and scale still agreed with the
   * body exactly as they were asked to.
   *
   * So the cape is offset by this frame's crown against the standing crown.
   * The test is that the offset EXISTS while jogging and is ZERO while
   * standing: re-pinning the cape to the body origin is the regression, and it
   * is the one a later "simplification" would reach for. */
  await P.page.keyboard.down('d');
  const jog = [];
  for (let i = 0; i < 14 && jog.length < 3; i++) {
    await P.page.waitForTimeout(160);
    const s = await raw(P);
    if (s && s.pose === 'jog' && s.cape && s.body) jog.push(s);
  }
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(600);
  rec.ok('the player actually jogged (guard: without this the offset check below proves nothing)',
    jog.length > 0, { samples: jog.length });
  if (jog.length) {
    const off = jog.map((s) => [s.cape.x - s.body.x, s.cape.y - s.body.y]);
    rec.ok('while jogging the cape follows the frame\'s crown, not the frame origin',
      off.some(([dx, dy]) => dx !== 0 || dy !== 0), { offsets: off });
    rec.ok('...and it is still drawn at the body\'s size while it does so',
      jog.every((s) => Math.abs(s.cape.w - s.body.w) < 1.5), jog.map((s) => [s.cape.w, s.body.w]));
  }
  const back = await raw(P);
  rec.ok('...and standing again there is no offset — the art is fitted to THIS pose',
    !!(back && back.cape && back.body && back.pose === 'stand'
       && back.cape.x === back.body.x && back.cape.y === back.body.y),
    back);

  /* ── THE INVARIANT THAT MATTERS ──
   * Not "click and hope a monster was in range".  The first cut did that and
   * the pose never left 'stand' across six clicks, so the assertion was
   * reporting on an attack that never happened — a test that would have gone
   * green on a broken build the moment a monster wandered close.
   *
   * The property is: THE CAPE NEVER DRAWS AGAINST A HIDDEN BODY.  That is the
   * exact condition an attack creates (the body is hidden and redrawn by a
   * stand-in), and it is what the back shield got wrong by hanging in the air
   * beside the swing.  Hiding the body sprite reproduces it deterministically,
   * in every build, without needing a monster to cooperate. */
  const pinned = await P.page.evaluate(() => {
    const r = window._pixiRenderer;
    const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
    if (!pd || !pd._spriteBody) return false;
    /* PIN it, do not just set it: the renderer re-shows the body every frame,
       so a plain assignment is reverted before the next sample and the check
       reads a body that is visible again.  Last assertion in the file, so the
       sprite does not need to come back. */
    let v = false;
    try {
      Object.defineProperty(pd._spriteBody, 'visible', {
        configurable: true, get() { return v; }, set() { v = false; },
      });
    } catch (e) { return false; }
    return true;
  });
  rec.ok('the body sprite could be pinned hidden (guard: otherwise the check below is vacuous)', pinned === true, { pinned });
  await P.page.waitForTimeout(500);
  const hidden = await raw(P);
  rec.ok('the cape does not draw against a hidden body — the swing case '
    + '(v2.3.1784: the back shield hung in mid-air beside the swing)',
    !!(hidden && hidden.body && hidden.body.visible === false
       && hidden.cape && hidden.cape.visible === false),
    hidden);
}
