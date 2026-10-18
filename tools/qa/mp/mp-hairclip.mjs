/* THE HAIR IS CLIPPED TO THE HAT WHILE SWINGING, TOO (v2.3.1776).
 *
 * Owner: "can you also make the hair mask apply when swinging".
 *
 * A hat that declares `clipsHair` has the player's hair masked to its own
 * silhouette so it cannot burst out the top — on the WALKING figure.  Every
 * stand-in pose (swing, bow shot, chop, cook, firemaking, and the remote
 * versions of the first two) composites its head traits through a different
 * function, which never applied that mask, so a contained head came undone for
 * the quarter-second of every swing.
 *
 * WHAT IS MEASURED, and why it is the live sprite rather than the call.
 * "The mask sprite was placed" and "the hair is masked to it" are different
 * facts — the first is true even when the placement lands nowhere and the clip
 * is deliberately dropped — so the probe reports the hair sprite's own `mask`
 * reference, which is the thing that decides what a player sees.
 *
 * The negative case is asserted alongside it: a hat that does NOT clip must
 * leave the hair unmasked, or "always mask" would pass this file while
 * quietly cropping every other hat in the game.
 */
import * as H from './harness.mjs';

const CLIPPING_HAT = 'army-helmet';   /* ships a hairmask/ + clipsHair in meta */
const PLAIN_HAT = 'none';
const HAIR = 'afro';                  /* big enough that a clip is the visible difference */

const clip = (P) => P.page.evaluate(() => (window.__btStandInHairClip ? window.__btStandInHairClip() : null));

async function swingAndRead(P) {
  /* Sample WHILE the stand-in is playing — it lasts ~300ms, and reading after
     it ends would report whatever the walking figure left behind. */
  return P.page.evaluate(async () => {
    const cv = document.querySelector('canvas.brotown-canvas');
    const r = cv.getBoundingClientRect();
    const S = window._gameState.current;
    const k = S._worldScaleX || 1;
    const x = r.left + (S.player.x - S.camera.x) * k;
    const y = r.top + (S.player.y - S.camera.y) * k;
    const ev = (t) => cv.dispatchEvent(new MouseEvent(t, { clientX: x + 40, clientY: y + 10, bubbles: true, button: 0 }));
    ev('mousemove'); ev('mousedown');
    let seen = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((res) => setTimeout(res, 25));
      const c = window.__btStandInHairClip ? window.__btStandInHairClip() : null;
      /* keep the sample from the frames the swing owned */
      if (c && c.maskVisible) { seen = c; break; }
      if (c) seen = c;
    }
    ev('mouseup');
    return seen;
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Helmet', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* A weapon, so the swing stand-in actually plays. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2500);
  const armed = await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    const i = (R.weaponStash || []).findIndex((w) => w && /Sword/i.test(w.name || ''));
    if (i >= 0) { R.weapon = R.weaponStash.splice(i, 1)[0]; R.activeSlot = 'melee'; }
    return !!R.weapon;
  });
  rec.ok('the player is holding a sword (guard: no weapon, no stand-in)', armed);

  const set = (hat) => P.page.evaluate(({ h, hair }) => {
    if (window.__btSetHair) window.__btSetHair(hair);
    if (window.__btSetHeadwear) window.__btSetHeadwear(h);
    return !!(window.__btSetHair && window.__btSetHeadwear);
  }, { h: hat, hair: HAIR });

  rec.ok('the test can drive hair + headwear', (await set(CLIPPING_HAT)) === true);
  await P.page.waitForTimeout(2500);   /* the hat art and its mask load */

  const withHelmet = await swingAndRead(P);
  rec.ok('the swing stand-in reported its hair-clip state (guard)', !!withHelmet, withHelmet);
  rec.ok('the helmet is one that clips (guard: otherwise the check below is vacuous)',
    !!withHelmet && withHelmet.clipsHair === true, withHelmet);
  rec.ok('the swung hair is MASKED to the helmet, not left bursting out of it',
    !!withHelmet && withHelmet.masked === true && withHelmet.maskVisible === true, withHelmet);

  /* ── v2.3.3459: the clip goes through the stencil, in a box of its own
     (hairClip.js).  The head set changes layer with the figure that owns it
     -- a chop, cook or fire figure seats it in the gesture layer, a swing back
     in the fighting one (effectsRenderer _seatStandInTraits) -- and the hat's
     silhouette must travel IN its box: moved alone, it is drawn as a white hat
     and the hair is clipped to an empty box.  Seated as a gathering figure
     would seat it, then swung again: in its box both times, and never boxed
     again (a silhouette found outside its box is boxed again where it stands
     -- a structural change, so a draw-list rebuild, every frame it happened). */
  const seat = await P.page.evaluate(() => ({
    clip: window.__btHairClip ? window.__btHairClip() : null,
    at: window.__btSeatStandInTraits ? window.__btSeatStandInTraits(true) : null,
  }));
  rec.ok(`the clip goes through the stencil (${JSON.stringify(seat.clip)}) (guard)`, !!seat.clip && seat.clip.stencil === true && seat.clip.boxes > 0, seat.clip);
  rec.ok(`seated as a gathering figure seats it, the hat's silhouette is in its box and the box in the gesture layer (${JSON.stringify(seat.at)})`,
    !!seat.at && seat.at.boxed === true && seat.at.box === 'gesture', seat.at);
  const again = await swingAndRead(P);
  const back = await P.page.evaluate(() => ({
    clip: window.__btHairClip ? window.__btHairClip() : null,
    at: window.__btSeatStandInTraits ? window.__btSeatStandInTraits(false) : null,
  }));
  rec.ok(`...and the next swing seats it back with the fighting figures and clips the hair to it again, nothing boxed again (${JSON.stringify(back)})`,
    !!again && again.masked === true && again.maskVisible === true && !!back.at && back.at.boxed === true && back.at.box === 'node'
      && !!back.clip && !!seat.clip && back.clip.reboxed === seat.clip.reboxed, { again, back });

  /* ── the negative: a hat with no clip must not crop the hair ── */
  await set(PLAIN_HAT);
  await P.page.waitForTimeout(1500);
  const bare = await swingAndRead(P);
  rec.ok('with no clipping hat on, the swung hair is NOT masked',
    !!bare && bare.masked === false, bare);

  await P.ctx.close().catch(() => {});
}
