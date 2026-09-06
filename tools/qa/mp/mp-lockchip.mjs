/* ═══ THE LOCK-ON CHIP SITS ABOVE THE MONSTER, NOT ON IT (v2.3.2313) ═══
 *
 * Owner: "the locked on orange monster chip need to be move a little higher
 * it's on the head of the snowman."
 *
 * WHY IT WAS ONLY EVER REPORTED ON THE SNOWMAN. The chip was placed from
 * monsterBodyOffsetY -- a per-archetype HIT offset -- using `offset x 2` as a
 * stand-in for the drawn height. That is true for the shapes whose table entry
 * IS half their height (mummy, skeleton, and everything under the liveScalePx
 * rule) and false for the snowman, whose 19 is a hand-tuned aim point for an
 * oddly-anchored sprite rather than half of the ~96 world px he is drawn at.
 * Measured before the fix: the chip's tip was 3 screen px BELOW the top of his
 * sprite, and 5 below a slime's -- it overlapped BOTH, and only showed on the
 * snowman because his art fills his frame while a slime's leaves padding.
 *
 * SO THIS FILE MEASURES PIXELS AGAINST THE DRAWN SPRITE, on two shapes with
 * very different anchoring. One shape proves nothing: the old formula was
 * right for several archetypes and wrong for this one, so a test that only
 * ever looked at a slime would have stayed green through the whole bug.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* The chip is 11 CSS px tall and hangs point-DOWN from its top edge, so its
   lowest pixel -- the one that can land on a head -- is top + this. */
const CHIP_H = 11;

const zoneOf = (P) => H.readState(P, (S) => S.currentZone);

const warpTo = async (P, zone, tries = 45) => {
  await P.page.evaluate((z) => {
    const S = window._gameState && window._gameState.current;
    if (S) S._devWarp = { to: z, legs: 0, t: Date.now(), nextAt: 0 };
  }, zone);
  for (let i = 0; i < tries; i++) {
    await P.page.waitForTimeout(1000);
    if ((await zoneOf(P)) === zone) return true;
  }
  return false;
};

/* Stand next to a live monster and tap-lock it, then read where the chip
   landed and where the sprite actually is -- both in SCREEN px, which is the
   only space the two are comparable in (the chip is drawn on the world layer,
   the sprite in a scaled container; entityRenderer's own note records that
   comparing them in different spaces is how the "!" mark got flung into the
   sky). */
const lockAndMeasure = async (P) => {
  const picked = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const m = (S.monsters || []).find((x) => x && x.alive);
    if (!m || !S.player) return null;
    S.player.x = m.x + 30; S.player.y = m.y + 20;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    return { id: m.id, arch: m.arch };
  });
  if (!picked) return null;
  await P.page.waitForTimeout(1400);
  return P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const lt = S.lockedTarget;
    if (!lt || !lt.ref) return null;
    const sp = window.__btMonsterSprite ? window.__btMonsterSprite(lt.id) : null;
    const chip = (window.__btAtkMark ? window.__btAtkMark() : []).find((k) => k.chip);
    const c = document.querySelector('canvas').getBoundingClientRect();
    const sy = S._worldScaleY || 1;
    return {
      arch: lt.ref.arch,
      chipTop: chip ? Math.round(c.top + (chip.y - S.camera.y) * sy) : null,
      spriteTop: sp && sp.bounds ? sp.bounds.top : null,
      spriteH: sp && sp.bounds ? sp.bounds.h : null,
      banded: lt.ref._bandTopOff != null,
    };
  });
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Locker', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);
  await fetch('http://127.0.0.1:' + wsPort + '/api/admin/dev/quests', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId }),
  }).catch(() => {});
  await P.page.waitForTimeout(1200);

  /* frost = the snowman, the shape that was wrong and the one he reported.
     verdant = a slime, the shape the old formula was closest on -- the
     control that shows this did not fix one monster by breaking the rest. */
  for (const [zone, who] of [['frost', 'the snowman'], ['verdant', 'a slime']]) {
    const there = await warpTo(P, zone);
    rec.ok(`we can reach ${zone} (guard)`, there, { zone: await zoneOf(P) });
    if (!there) continue;
    await P.page.waitForTimeout(1600);
    const m = await lockAndMeasure(P);
    console.log(`    ${zone} -> ${JSON.stringify(m)}`);
    rec.ok(`${who} is on screen and locked, with a chip drawn (guard)`,
      !!(m && m.chipTop != null && m.spriteTop != null), m);
    if (!m || m.chipTop == null || m.spriteTop == null) continue;

    /* Half the mechanism, and labelled as only that. This says the renderer
       PUBLISHES the band top; it cannot say the chip reads it, because
       reverting the consumer alone leaves the stamp in place and this green.
       (Checked: the mutation that restores the old formula keeps banded true.)
       What proves the chip actually uses it is the clearance below, which the
       same mutation turns red on both shapes. Worth keeping anyway -- if the
       stamp ever stops being written the chip drops to its fallback silently,
       and this is the line that would say so. */
    rec.ok(`...and the renderer publishes a band top for it to hang from`,
      m.banded === true, m);

    const gap = m.spriteTop - (m.chipTop + CHIP_H);
    console.log(`    ${zone} clearance -> ${gap}px`);
    /* THE HEADLINE: the chip's lowest pixel is above the sprite's top edge.
       Negative is the bug -- the tip inside the art, which on the snowman is
       his head. */
    rec.ok(`${who}: the chip clears the top of the sprite instead of sitting on it`,
      gap >= 4, { gap, chipTop: m.chipTop, spriteTop: m.spriteTop });
    /* AND NOT FLUNG INTO THE SKY. entityRenderer records an incident where a
       mark was "raised to clear a collision that was not happening" and ended
       217px over a 64px slime, off every crop -- which looked exactly like the
       overlap it was meant to fix. A one-sided bound would not have caught it. */
    rec.ok(`${who}: ...and is still over his head, not off in the sky`,
      gap <= 60, { gap, spriteH: m.spriteH });
  }

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/lockchip.png` }).catch(() => {});
  await P.ctx.close();
}
