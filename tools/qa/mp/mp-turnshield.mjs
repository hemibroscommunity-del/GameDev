/* Turning while blocking: does the shield stay on the right side? (v2.3.1836)
 *
 * Owner, with a screenshot taken during the block tutorial's "turn all the way
 * around": "the shield showing in front of the character (shield should be on
 * back)".
 *
 * The suspicion is a split source of truth that only shows up MID-TURN.  The
 * stand-in BODY is chosen from S._bowDir, which entityRenderer derives from
 * the GUARD angle (S._shieldAngle).  The front-or-behind decision next to it
 * is made from `facingIdx`, which comes from the body's RENDER facing — and
 * the render facing is slewed toward its target over several frames rather
 * than snapped.  Hold still and they agree, which is why every earlier test
 * passed.  Turn, and the guard angle leads; for as long as it leads, the two
 * halves of one picture disagree about which way the character is pointing.
 *
 * This spins the guard through a full circle and records every frame where
 * the body being DRAWN is a rear facing but the shield was not handed to the
 * clone behind it (or the reverse).  Those frames are the bug, if it exists.
 */
import * as H from './harness.mjs';

const REAR = new Set(['northwest', 'north', 'northeast']);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Turner', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.shield) S.rpg.shield = { id: 'wood-shield', name: 'Pine Shield', type: 'shield' };
  });

  /* Sweep the guard angle from inside a rAF, the way a player turning the
     right stick does — a value written from evaluate() is gone by the next
     draw, and a stepped pin would never produce the slew this is about. */
  await P.page.evaluate(() => {
    window.__spin = { on: true, a: 0, log: [] };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__spin;
      if (S && p && p.on) {
        p.a += 0.13;                       /* ~7.5 deg/frame, a brisk turn */
        S._shieldUp = true;
        S._shieldAngle = p.a;
        S._aimAngle = p.a;
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        const b = window.__btBlockPose;
        if (b && b.standIn) {
          p.log.push({ drawn: b.standInDir, facing: b.facing,
            behind: !!b.shieldBehind, ownSprite: !!b.shieldSpriteVisible });
          if (p.log.length > 900) p.log.shift();
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await P.page.waitForTimeout(9000);
  const log = await P.page.evaluate(() => {
    window.__spin.on = false;
    return window.__spin.log;
  });

  rec.ok('the spin produced frames to inspect (guard)', log.length > 100, { frames: log.length });

  /* THE CONTRADICTION: the body on screen faces away, so the shield belongs
     to the clone drawn behind it; or the body faces us and it does not. */
  const bad = log.filter((f) => f.drawn && REAR.has(f.drawn) !== f.behind);
  const pct = log.length ? (bad.length / log.length) * 100 : 0;
  rec.ok('the shield is never on the wrong side of the body mid-turn',
    bad.length === 0,
    { badFrames: bad.length, ofFrames: log.length, pct: +pct.toFixed(1),
      examples: bad.slice(0, 6) });

  /* And the display's own sprite must never be the one drawing while a rear
     body is on screen — it lives in a container that cannot be ordered
     against the stand-in at all, so whatever it draws lands on top. */
  const onTop = log.filter((f) => f.drawn && REAR.has(f.drawn) && f.ownSprite);
  rec.ok('...and the display sprite never paints the shield over a rear body',
    onTop.length === 0,
    { frames: onTop.length, examples: onTop.slice(0, 6) });

  const seen = [...new Set(log.map((f) => f.drawn))];
  rec.ok('the spin really visited the rear facings (guard)',
    seen.some((d) => REAR.has(d)), { seen });
}
