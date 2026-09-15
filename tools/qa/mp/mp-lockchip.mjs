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
  /* ═══ SAMPLE THE WHOLE BOB, NOT A MOMENT OF IT (v2.3.2314) ═══
     The chip oscillates on a ~1.26s period. A single reading lands at an
     arbitrary phase, so a clearance assertion built on one would pass or fail
     by luck -- and would have been the flakiest test in the suite. Sweep a
     full period at ~40ms and keep the WORST (lowest) chip position: that is
     the one that can land on a head, and it is the only reading a clearance
     assertion may honestly use. The spread across the sweep is also what
     proves the bob exists at all. */
  return P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState && window._gameState.current;
    const lt = S.lockedTarget;
    if (!lt || !lt.ref) { res(null); return; }
    const c = document.querySelector('canvas').getBoundingClientRect();
    const gaps = [];   /* per-FRAME clearance, see below */
    const tops = [];
    const t0 = Date.now();
    /* ON requestAnimationFrame, NOT setInterval.  A timer inside evaluate() is
       throttled unpredictably -- measured between 5 and 10 turns in 1400ms on
       the same build, which made a sample-count guard trip on nothing. rAF is
       driven by the very render loop that animates the chip, so it samples
       once per drawn frame by construction and cannot be out of step with the
       thing it is measuring. */
    /* ═══ BOTH SIDES, IN THE SAME FRAME ═══
       The first cut of this took the chip's worst position over the sweep and
       compared it against ONE reading of the sprite bounds taken at the end.
       That is not a clearance -- the monster is animated too (a slime squashes
       and stretches through its idle), so the two quantities move
       independently and the difference of a worst-case and a snapshot is a
       number with no meaning. It showed up as the measurement wandering
       between -1 and +10 px across identical runs.
       So the gap is computed PER FRAME, from a chip position and a sprite
       bounds read in the same tick, and the worst of those is the answer. */
    const step = () => {
      const sy = S._worldScaleY || 1;
      const chip = (window.__btAtkMark ? window.__btAtkMark() : []).find((k) => k.chip);
      const sp = window.__btMonsterSprite ? window.__btMonsterSprite(lt.id) : null;
      if (chip && sp && sp.bounds) {
        const top = c.top + (chip.y - S.camera.y) * sy;
        tops.push(top);
        gaps.push(sp.bounds.top - (top + 11));   /* 11 = the chip's own height */
      }
      if (Date.now() - t0 < 1400) { requestAnimationFrame(step); return; }
      res({
        arch: lt.ref.arch,
        samples: gaps.length,
        worstGap: gaps.length ? Math.round(Math.min.apply(null, gaps)) : null,
        bestGap: gaps.length ? Math.round(Math.max.apply(null, gaps)) : null,
        swing: tops.length ? Math.round(Math.max.apply(null, tops) - Math.min.apply(null, tops)) : null,
        spriteH: sp && sp.bounds ? sp.bounds.h : null,
        banded: lt.ref._bandTopOff != null,
      });
    };
    requestAnimationFrame(step);
  }));
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
      /* Six. This environment does NOT run at 60fps -- measured 9 to 18 rAF
         turns in 1400ms -- so a guard sized for a real phone would trip on the
         harness rather than on the game. Six still spans a good part of the
         ~1.26s bob and proves the sweep happened. */
      !!(m && m.worstGap != null && m.samples >= 6), m);
    if (!m || m.worstGap == null) continue;

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

    const gap = m.worstGap;
    const swing = m.swing;
    console.log(`    ${zone} worst clearance -> ${gap}px (best ${m.bestGap}), bob swing -> ${swing}px, frames ${m.samples}`);
    /* THE HEADLINE: even at its lowest the chip's tip is above the sprite's
       top edge. Negative is the bug -- the tip inside the art, which on the
       snowman is his head. */
    /* ═══ WHY 2, AND NOT A ROUNDER NUMBER ═══
       Both populations were measured with THIS method, per frame, over several
       runs:
         broken (the pre-v2.3.2313 placement): worst -14 to -25, and even its
           BEST frame was -2 to -11 -- overlapping at every phase;
         fixed: worst +4 to +19.
       So zero is the real boundary and 2 sits in the gap with margin on both
       sides. Tightening it to the fixed population's floor would make the test
       report the harness's frame rate (a slower run samples the bob's bottom
       more often) instead of the game. */
    rec.ok(`${who}: the chip clears the top of the sprite even at the bottom of its bob`,
      gap >= 2, { gap, best: m.bestGap, samples: m.samples });
    /* AND NOT FLUNG INTO THE SKY. entityRenderer records an incident where a
       mark was "raised to clear a collision that was not happening" and ended
       217px over a 64px slime, off every crop -- which looked exactly like the
       overlap it was meant to fix. A one-sided bound would not have caught it. */
    rec.ok(`${who}: ...and is still over his head, not off in the sky`,
      gap <= 60, { gap, spriteH: m.spriteH });
    /* ═══ v2.3.2314: AND IT ACTUALLY MOVES ═══
       Owner: "make the orange chip cue bob up and down while over the monsters
       head." It bobbed 3px before and he could not see it, so the assertion is
       on the SIZE of the travel, not merely on travel existing -- a 1px wobble
       would satisfy "it moves" and would be the same complaint again. The bob
       is 6px of amplitude, so a full sweep should span close to 12; 8 leaves
       room for the sampler missing the exact peaks. */
    rec.ok(`${who}: ...and it visibly bobs, not a wobble you have to be told about`,
      swing >= 8, { swing, samples: m.samples });
    /* v2.3.2472: the sweep above starts 1400ms AFTER the lock, so everything
       it measures is the RESTING chip -- the first-second flash is over before
       the first sample. That is the right scope for these four assertions (the
       resting look is what four earlier versions tuned), and it is why the
       flash gets its own section at the foot of this file rather than a bound
       smuggled in here on numbers that never saw it. */
  }

  /* ═══ v2.3.2472: THE FIRST SECOND OF A LOCK ANNOUNCES ITSELF ═══
     F1: "stamp `at` on EVERY lock, then lerp the chip's colour and bob
     amplitude over its first second."

     THE BUG WAS THE MISSING CLOCK, NOT THE MISSING ANIMATION.  `lockedTarget.at`
     was stamped only inside tapStealable -- a function that returns before the
     stamp for a bow or a staff, and is reached at all only on the tap-owned
     branch -- so an AUTOMATIC lock, the one you get by walking up to a slime,
     had no acquisition time at all.  There was nothing to animate FROM.  So the
     assertions below are in two halves and the second is the load-bearing one:
     a tap lock flashing proves the lerp works, and an AUTO lock flashing proves
     the clock now exists for the case that never had one.

     Read off __btAtkMark rather than off pixels: a still frame cannot tell a
     chip that is flashing pale from a build that paints it pale, and the bob is
     a phase you would have to catch.  The renderer reports both. */
  const chipNow = () => P.page.evaluate(() => {
    const k = (window.__btAtkMark ? window.__btAtkMark() : []).find((x) => x && x.chip);
    const S = window._gameState.current;
    return k ? { flash: k.flash, bob: k.bob, color: k.color, rest: k.rest,
      at: k.at, src: S.lockedTarget && S.lockedTarget.src } : null;
  });

  /* Clear whatever the loop above left locked, then TAP a fresh target. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.lockedTarget = null;
    const m = (S.monsters || []).find((x) => x && x.alive);
    if (m) { S.player.x = m.x + 30; S.player.y = m.y + 20; }
  });
  await P.page.waitForTimeout(400);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x && x.alive);
    S.lockedTarget = m ? { type: 'monster', id: m.id, ref: m, src: 'tap' } : null;
  });
  await P.page.waitForTimeout(150);
  const fresh = await chipNow();
  rec.ok('a lock one frame old carries a start time at all (this is what was missing)',
    !!(fresh && fresh.at), fresh);
  /* The flash is an ease-out over 1000ms, so 150ms in it is still most of the
     way up -- 0.5 leaves room for a slow frame without accepting a chip that
     has already settled. */
  rec.ok(`...and the chip is mid-flash (${fresh && fresh.flash})`,
    !!(fresh && fresh.flash > 0.5), fresh);
  /* AMPLITUDE, not position: the standoff rises with the amplitude so the
     bottom of the swing is the same pixel either way (the v2.3.2313 rule the
     clearance assertions above depend on).  6 at rest, 15 at the instant of
     the lock. */
  rec.ok(`...bobbing harder than it will at rest (${fresh && fresh.bob}px vs 6)`,
    !!(fresh && fresh.bob > 9), fresh);
  /* AND NOT MUCH HARDER THAN THAT.  The amplitude is the whole lift: the
     standoff is (amplitude + 5), so the bottom of the swing is the same pixel
     at any amplitude and the TOP sits at -(2*amplitude + 5) from the band.
     Bounding the amplitude therefore bounds how high the pop can throw the
     chip, which is the guard the per-zone clearance readings above cannot give
     (they sample after the flash has ended).  This file records the incident
     it exists to prevent: a mark raised to clear a collision that was not
     happening, ending 217px over a 64px slime. */
  rec.ok(`...and not flung into the sky by it (amplitude ${fresh && fresh.bob}px, ceiling 16)`,
    !!(fresh && fresh.bob <= 16), fresh);
  /* LIGHTER than the resting colour, and lighter in every channel -- a mix
     toward white-gold cannot darken one.  Asserted against the chip's OWN
     resting colour rather than a literal, because that colour already carries
     v2.3.2253's meaning (brass while merely locked, red while attacking) and
     the flash must not become a second meaning on the same channel. */
  const lighter = (a, b) => ((a >> 16) & 255) > ((b >> 16) & 255)
    && ((a >> 8) & 255) >= ((b >> 8) & 255) && (a & 255) > (b & 255);
  rec.ok(`...and painted lighter than its resting colour (0x${(fresh && fresh.color || 0).toString(16)} vs 0x${(fresh && fresh.rest || 0).toString(16)})`,
    !!(fresh && lighter(fresh.color, fresh.rest)), fresh);

  /* AND IT SETTLES.  A cue that never ends is not a cue -- it is just a
     different chip, and the resting look is the one four earlier versions
     tuned. */
  await P.page.waitForTimeout(1300);
  const settledChip = await chipNow();
  rec.ok(`...then settles back to the resting chip within the second (flash ${settledChip && settledChip.flash}, bob ${settledChip && settledChip.bob})`,
    !!(settledChip && settledChip.flash === 0 && settledChip.bob === 6), settledChip);
  rec.ok('...at exactly its resting colour again',
    !!(settledChip && settledChip.color === settledChip.rest), settledChip);

  /* ═══ THE HALF THAT WAS BROKEN: AN AUTOMATIC LOCK ═══
     Dropped without touching the monster, so the nearest-enemy rule in
     targeting.js re-acquires it on its own with src 'auto'.  Before v2.3.2472
     that lock had no `at` and the chip appeared fully settled from its first
     frame -- which is the case the owner actually meets, every fight. */
  await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
  await P.page.waitForTimeout(250);
  const auto = await chipNow();
  rec.ok(`an AUTOMATIC lock flashes too -- the case that had no clock at all (src ${auto && auto.src}, flash ${auto && auto.flash})`,
    !!(auto && auto.src === 'auto' && auto.flash > 0.5), auto);

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/lockchip.png` }).catch(() => {});
  await P.ctx.close();
}
