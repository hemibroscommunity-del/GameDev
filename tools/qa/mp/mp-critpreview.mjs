/* CRIT VS NORMAL, ON DEMAND (v2.3.2213)
 *
 * Owner: "You should be able to generate a simulated normal damage number vs
 * crit damage number without me needing to start a new char and run it every
 * time."
 *
 * Four earlier attempts to photograph a crit each cost a full playthrough --
 * accept a quest, equip a sword, cross two zones, stay alive, then wait out a
 * ~8% roll -- and three of them timed out having caught nothing.  A two-second
 * visual question should not cost ten minutes and a coin flip.
 *
 * This spawns both popups through the game's OWN pushDmgPopup with the game's
 * own flags (window._gameFns.previewCritVsNormal), so the colour rule, the
 * font sizing, the icon and the renderer are all the real ones.  Only the dice
 * are skipped.
 *
 * It also ASSERTS the two properties that were broken and invisible until the
 * owner played the preview build and told me:
 *   - the crit number is not white (the v2.3.103 override swallowed every
 *     crit colour the game has ever set -- see effectsRenderer v2.3.2213)
 *   - the crit number is drawn much bigger than the normal one
 * Both are read off the LIVE pixi objects, not off the popup record, because
 * the record was right the whole time and the screen still showed white.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Preview', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 3 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* Clear the welcome banner first -- it sits exactly where a popup is most
     readable, and the first run of this shot both numbers through it. */
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.waitForTimeout(400);

  const spawned = await H.callFn(P, 'previewCritVsNormal', 12, 41);
  rec.ok('the preview hook spawned both numbers (guard)', !!spawned, spawned);
  /* Short: popups fade with age, and a late shot catches two ghosts. */
  await P.page.waitForTimeout(160);
  /* Frame the shot from the RENDERER's own bounds -- the union of the two
     texts and their icons, padded.  Every earlier attempt at this guessed a
     world->screen transform and framed empty ground; the sprites know where
     they are, and getBounds() is already trusted a few lines below for the
     size assertions. */
  const box = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const parts = [];
    for (const d of (S.dmgNumbers || [])) {
      for (const o of [d._pixiText, d._pixiIcon]) {
        if (o && !o.destroyed) { const b = o.getBounds(); if (b.width) parts.push(b); }
      }
    }
    if (!parts.length) return null;
    const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect();
    const x0 = Math.min(...parts.map((b) => b.x)), x1 = Math.max(...parts.map((b) => b.x + b.width));
    const y0 = Math.min(...parts.map((b) => b.y)), y1 = Math.max(...parts.map((b) => b.y + b.height));
    return { left: r.left, top: r.top, x0, x1, y0, y1, vw: window.innerWidth, vh: window.innerHeight };
  });
  if (box) {
    /* More headroom ABOVE than below: the reported bounds sit at the glyph
       box, and the first framed shot clipped the tops off both numbers. */
    const pad = 26, padTop = 58;
    const clip = {
      x: Math.max(0, Math.round(box.left + box.x0 - pad)),
      y: Math.max(0, Math.round(box.top + box.y0 - padTop)),
      width: Math.min(box.vw, Math.round(box.x1 - box.x0 + pad * 2)),
      height: Math.min(box.vh, Math.round(box.y1 - box.y0 + padTop + pad)),
    };
    console.log('    clip: ' + JSON.stringify(clip));
    await P.page.screenshot({ path: '/tmp/claude-0/crit-preview.png', clip });
  } else {
    await P.page.screenshot({ path: '/tmp/claude-0/crit-preview.png' });
  }

  /* What the RENDERER actually drew — tint and on-screen height. */
  const drawn = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const pick = (wantCrit) => (S.dmgNumbers || []).find((d) => !!d.crit === wantCrit && d._pixiText);
    const read = (d) => {
      if (!d || !d._pixiText) return null;
      const t = d._pixiText;
      const tint = t.tint != null ? t.tint : null;
      const fill = (t.style && t.style.fill) || null;
      return {
        text: String(d.text), color: d.color, icon: d.iconKey || null,
        tint: typeof tint === 'number' ? '#' + tint.toString(16).padStart(6, '0') : String(tint),
        fill: fill == null ? null : String(fill),
        h: Math.round(t.getBounds().height),
        iconH: d._pixiIcon ? Math.round(d._pixiIcon.getBounds().height) : 0,
      };
    };
    return { norm: read(pick(false)), crit: read(pick(true)) };
  });
  console.log('    normal: ' + JSON.stringify(drawn.norm));
  console.log('    crit:   ' + JSON.stringify(drawn.crit));
  rec.ok('both numbers reached the renderer (guard)', !!(drawn.norm && drawn.crit), drawn);

  if (drawn.norm && drawn.crit) {
    /* The bug the owner caught: a crit rendered WHITE because the plain-number
       override replaced its colour before the tint was set. */
    const white = (v) => v === '#ffffff' || v === '0xffffff' || v === '#ffffff'.toUpperCase();
    rec.ok('the crit number is NOT drawn white — its colour survives to the renderer',
      !white(drawn.crit.tint) && !white(String(drawn.crit.fill || '')), drawn.crit);
    rec.ok('...while an ordinary hit still is (v2.3.103 uniform white, untouched)',
      white(drawn.norm.tint) || white(String(drawn.norm.fill || '')), drawn.norm);
    rec.ok('the crit number is drawn much larger than an ordinary one',
      drawn.crit.h >= drawn.norm.h * 1.5, { crit: drawn.crit.h, norm: drawn.norm.h });
    rec.ok('...and its icon is larger than the 22px every other popup caps at',
      drawn.crit.iconH > 22, { critIcon: drawn.crit.iconH, normIcon: drawn.norm.iconH });
  }

  await P.ctx.close().catch(() => {});
}
