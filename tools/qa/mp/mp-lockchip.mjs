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
  }

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/lockchip.png` }).catch(() => {});
  await P.ctx.close();
}
