/* THE MP / ENERGY SPEND BARS UNDER THE CHARACTER (v2.3.1895).
 *
 * Owner: "have the mp bar below the character (name plate will disappear when
 * mp is used).  The amount of mp used will slide right.  The resource bar
 * will begin fading after 1 second and disappear after 2 seconds if no further
 * mp is used.  Do the same thing for energy but beneath the mp bar.  Reserve
 * the space ... (they stay in those positions)."
 *
 * Five separable claims, so five checks — a test that only asked "did a bar
 * appear" would pass with four of them broken.
 */
import * as H from './harness.mjs';

const probe = (P) => P.page.evaluate(() => window.__btResourceBars || null);
const spend = (P, field, amount) => P.page.evaluate(({ f, a }) => {
  const S = window._gameState.current;
  S.rpg[f] = Math.max(0, (S.rpg[f] || 0) - a);
}, { f: field, a: amount });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Caster', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ── 0. THE CONTROL: at rest, nothing is drawn ──
     Not a formality. Every check below is about a bar that only this version
     draws, so if they were up at rest the rest would pass against a HUD that
     never hides. */
  await P.page.waitForTimeout(2500);
  const rest = await probe(P);
  rec.ok('at rest, neither bar is drawn (control)',
    !!rest && rest.mp <= 0.01 && rest.en <= 0.01, rest);
  rec.ok('...and the name plate is therefore shown', !!rest && rest.plateHidden === false, rest);

  /* ── 1. spending MP reveals the bar and hides the plate ── */
  await spend(P, 'mana', 30);
  await P.page.waitForTimeout(250);
  const spent = await probe(P);
  rec.ok('spending MP reveals the MP bar', !!spent && spent.mp > 0.9, spent);
  rec.ok('...and the name plate disappears', !!spent && spent.plateHidden === true, spent);
  rec.ok('...while the ENERGY bar stays hidden (they are independent)',
    !!spent && spent.en <= 0.01, spent);

  /* ── 2. the timing: full for ~1s, fading by 1.5s, gone by 2s ── */
  await P.page.waitForTimeout(600);        /* ~0.85s since the spend */
  const atHold = await probe(P);
  rec.ok('still at full alpha within the first second', !!atHold && atHold.mp > 0.9, atHold);
  await P.page.waitForTimeout(700);        /* ~1.55s */
  const midFade = await probe(P);
  rec.ok('fading between 1s and 2s', !!midFade && midFade.mp > 0.05 && midFade.mp < 0.9, midFade);
  await P.page.waitForTimeout(800);        /* ~2.35s */
  const gone = await probe(P);
  rec.ok('gone after 2 seconds', !!gone && gone.mp <= 0.01, gone);
  rec.ok('...and the name plate comes back', !!gone && gone.plateHidden === false, gone);

  /* ── 3. a second spend re-arms the hold rather than letting it fade out ── */
  await spend(P, 'mana', 10);
  await P.page.waitForTimeout(700);
  await spend(P, 'mana', 10);
  await P.page.waitForTimeout(700);        /* 1.4s after the FIRST spend */
  const rearmed = await probe(P);
  rec.ok('a further spend re-arms the hold (still full at 1.4s from the first)',
    !!rearmed && rearmed.mp > 0.9, rearmed);

  /* ── 4. energy behaves the same, and sits BELOW mp ── */
  await P.page.waitForTimeout(2500);
  await spend(P, 'stamina', 25);
  await P.page.waitForTimeout(250);
  const en = await probe(P);
  rec.ok('spending energy reveals the energy bar', !!en && en.en > 0.9, en);
  rec.ok('...and it is positioned BELOW the mp bar', !!en && en.enY > en.mpY, en);

  /* ── 5. the positions are RESERVED — energy does not move up when mp is
         hidden, which is the whole point of "they stay in those positions" ── */
  rec.ok('energy keeps its y with MP hidden (space is reserved)',
    !!en && en.en > 0.9 && en.mp <= 0.01 && en.enY === rest.enY, { en, rest });
  /* ═══ v2.3.2300: SECTIONS 6 AND 7 ARE NOW ABOUT BLOCKS ═══
     They tested the sliding chunk and the gliding "-N", and both are gone with
     the proportional fill. Owner: "instead of seeing tiny percentages and
     trying to do mental math each time stamina or mana is used, I want just 5
     blocks." The chunk and the number were that arithmetic, animated -- with a
     block readout the answer to "how much just left" is a block, visibly.

     Rewritten rather than deleted, because the QUESTION those sections asked
     is still the right one: does the bar tell you what just happened? It is
     asked of the blocks now.

     The block count is the load-bearing claim of the whole feature. A block is
     a fifth of the pool and every special costs exactly one (v2.3.2298), so
     "blocks lit" IS "specials you can still afford" -- and if that stops being
     true the readout is lying about the thing it exists to say. */
  await P.page.waitForTimeout(2500);
  const blocks = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg;
    const read = () => {
      const b = window.__btResourceBars || {};
      return { mp: b.mpBlocks, en: b.enBlocks, mpDrawn: b.mpBlocksDrawn, enDrawn: b.enBlocksDrawn,
        w: b.blockW, h: b.blockH };
    };
    /* BLOCK MULTIPLES, not percentages. maxMana is 102 at Magic 1, so
       round(102 * 0.6) is 61 -- which is 2.99 fifths and floors to 2, not 3.
       The first cut of this read that as a bug in the readout; it was the
       fixture asking for "60% of the bar" when the thing under test counts
       fifths. A player spends blocks, so the test spends blocks. */
    const at = (n) => new Promise((res) => {
      /* SPENT DOWN FROM FULL, which is the only state a player is ever in.
         Two cuts of this got it wrong in the same way, from opposite ends: max
         is not a multiple of five (maxMana is 102 at Magic 1, a block is
         floor(102/5) = 20), so "n blocks held" and "full minus (5-n) casts" are
         different numbers. 4 x 20 is 80, which is 3.92 fifths of 102 and
         correctly reads THREE -- but a player never holds 80, they hold 102-20
         = 82, which is 4.02 fifths and reads four.
         The readout was right both times. The fixture was inventing a pool
         state the game cannot produce, and then calling the honest answer a
         bug. Spend down from full, exactly as casting does. */
      R.mana = R.maxMana - (5 - n) * Math.floor(R.maxMana / 5);
      R.stamina = R.maxStamina - (5 - n) * Math.floor(R.maxStamina / 5);
      requestAnimationFrame(() => requestAnimationFrame(() => res(Object.assign({ n }, read()))));
    });
    /* ...and one deliberately AWKWARD value: maxMana - 1, which is a hair under
       full and must show four, because four is how many casts are left. */
    const justUnder = () => new Promise((res) => {
      R.mana = R.maxMana - 1;
      R.stamina = R.maxStamina - 1;
      requestAnimationFrame(() => requestAnimationFrame(() => res(Object.assign({ n: 'max-1' }, read()))));
    });
    return (async () => {
      const out = [];
      for (const n of [5, 4, 3, 2, 1, 0]) out.push(await at(n));
      out.push(await justUnder());
      return out;
    })();
  });
  const at = (n) => blocks.find((b) => b.n === n) || {};
  console.log('    blocks held -> shown: ' + blocks.map((b) => b.n + '->' + b.mp).join(' '));
  rec.ok('a full bar shows all five blocks', at(5).mp === 5 && at(5).en === 5, at(5));
  rec.ok('an empty bar shows none', at(0).mp === 0 && at(0).en === 0, at(0));
  rec.ok('every block held is a block shown, on both bars',
    at(4).mp === 4 && at(3).mp === 3 && at(2).mp === 2 && at(1).mp === 1
    && at(4).en === 4 && at(3).en === 3 && at(2).en === 2 && at(1).en === 1,
    blocks.map((b) => ({ n: b.n, mp: b.mp, en: b.en })));
  /* MANA AND STAMINA ARE DIFFERENT POOLS and this is the one place that shows.
     maxStamina is a clean 100 on a fresh character, maxMana is 102 (Magic 1 x
     2.5 on top of 100), so the two have different remainders above their fifth
     block -- and both still read five when full. Asserted together because a
     readout that only worked on the divisible pool would pass every other
     check in this file. */
  rec.ok('...and both pools read FULL as five, whether or not the max divides '
    + 'by five', at(5).mp === 5 && at(5).en === 5,
    { mp: at(5).mp, en: at(5).en });
  /* FLOOR, not round, and this is the assertion that fails if anyone
     "smooths" the display: one short of full is FOUR blocks, because four is
     how many specials you can still cast. A fifth block there would promise a
     cast the worker refuses. */
  rec.ok('...and it FLOORS -- a hair under full is four blocks, because that '
    + 'is how many specials are left',
    at('max-1').mp === 4 && at('max-1').en === 4, at('max-1'));

  /* Drawn, not merely computed. The count above comes from the renderer's own
     probe, but a probe can report a number for a sprite that never made it on
     screen -- which is exactly the class of pass this file's history is full
     of. */
  const drawn = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.mana = Math.round(S.rpg.maxMana * 0.6);
    return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = window.__btResourceBars || {};
      res({ mpDrawn: b.mpBlocksDrawn, mp: b.mpBlocks, alpha: b.mp, w: b.blockW, h: b.blockH });
    })));
  });
  rec.ok('the block bar is actually on screen while the spend is up, not just '
    + 'reported', drawn.mpDrawn === true && drawn.alpha > 0.01, drawn);
  /* And it is the owner's art at his aspect, not a squashed one: his frames are
     273x98, so a 76px-wide bar is 27 tall. Five blocks crushed into the old
     16px slot stop reading as five things. */
  rec.ok('...at the sheet\'s own proportions, so the five blocks stay countable',
    drawn.w === 76 && drawn.h === 27, drawn);


  /* ═══ v2.3.2300: A BURST OF SPENDS, COUNTED IN BLOCKS ═══
     This section tested the gliding "-N" across a burst -- that it never
     snapped back, never went cumulative, never blanked on a regen tick. All of
     those were about a NUMBER that no longer exists (see section 6).

     What survives is the question underneath: cast repeatedly and does the
     readout keep telling the truth? In blocks that is sharper than it ever was
     with a bar, because the answer is countable: four specials from full must
     leave exactly one block.

     Driven in exact block multiples rather than percentages of max. The first
     cut of this set the pool to round(max * 0.6) and got 2 blocks instead of 3
     -- correctly, because maxMana is 102 at Magic 1 and 61/102 is 2.99 fifths.
     That is the readout being honest and the fixture being sloppy: a test that
     wants "three blocks left" has to spend block-sized amounts, which is what
     the player does. */
  const burst = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg;
    const block = Math.floor(R.maxMana / 5);
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return (async () => {
      const seen = [];
      R.mana = R.maxMana;
      await frame();
      seen.push({ cast: 0, mana: R.mana, blocks: (window.__btResourceBars || {}).mpBlocks });
      for (let i = 1; i <= 5; i++) {
        R.mana = Math.max(0, R.mana - block);
        await frame();
        seen.push({ cast: i, mana: R.mana, blocks: (window.__btResourceBars || {}).mpBlocks });
      }
      return { block, seen, maxMana: R.maxMana };
    })();
  });
  console.log('    one block = ' + burst.block + ' mana of ' + burst.maxMana
    + '; casts -> blocks: ' + burst.seen.map((x) => x.cast + ':' + x.blocks).join(' '));
  rec.ok('a full bar is five blocks and each cast takes exactly one',
    burst.seen.length === 6
    && burst.seen[0].blocks === 5 && burst.seen[1].blocks === 4
    && burst.seen[2].blocks === 3 && burst.seen[3].blocks === 2
    && burst.seen[4].blocks === 1, burst.seen);
  /* THE CLAIM THE WHOLE FEATURE RESTS ON: blocks showing = specials you can
     still afford. Five casts from full, and the fifth is the last one. */
  rec.ok('...and the fifth cast is the last the bar had in it',
    burst.seen[5] && burst.seen[5].blocks === 0, burst.seen[5]);
  /* Never negative, never wrapping -- a floor on a pool the server can push
     below zero mid-echo would otherwise read as a full bar. */
  /* ═══ THE PICTURE ═══
     Owner: "Send me a preview of what it looks like in game." The bars only
     exist for two seconds after a spend, so this stages one on each pool and
     photographs the window rather than hoping to catch one. Cropped to the
     player, because a full-page shot of a 780x1688 canvas takes long enough in
     headless to land inside the fade -- the same lesson mp-moncue learned about
     photographing a mark with a clock on it. */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    const mb = Math.floor(R.maxMana / 5), sb = Math.floor(R.maxStamina / 5);
    R.mana = R.maxMana; R.stamina = R.maxStamina;
    /* two casts of mana, one of stamina, so the shot shows two DIFFERENT
       counts rather than one number twice */
    setTimeout(() => { R.mana = R.maxMana - 2 * mb; R.stamina = R.maxStamina - sb; }, 60);
  });
  await P.page.waitForTimeout(420);
  const shotBox = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const cv = document.querySelector('canvas');
    if (!cv || !S.camera || !S.player) return null;
    const r = cv.getBoundingClientRect();
    const cx = r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1);
    const cy = r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1);
    const x = Math.max(0, Math.round(cx - 110)), y = Math.max(0, Math.round(cy - 70));
    return { x, y, width: Math.min(innerWidth - x, 220), height: Math.min(innerHeight - y, 190) };
  });
  await P.page.screenshot(Object.assign({ path: `${H.REPO}/tools/qa/mp/out/resbars-blocks.png` },
    shotBox && shotBox.width > 60 ? { clip: shotBox } : {})).catch(() => {});

  rec.ok('...and a bar spent past empty still reads empty, not full',
    await P.page.evaluate(() => new Promise((r) => {
      const R = window._gameState.current.rpg;
      R.mana = -5;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const b = window.__btResourceBars || {};
        R.mana = R.maxMana;
        r(b.mpBlocks === 0);
      }));
    })), null);

  /* ══ 9. v2.3.2302: THE ROW GROWS WITH INVESTMENT ══
     Everything above describes a BASE character, who has five blocks -- which
     is why none of it changed when the ladder landed, and why none of it can
     detect the ladder failing. That is the whole point of this section: a
     build where the count never grew past five would read identically to every
     assertion above.

     Two halves, deliberately separate:
       a) the client's own derivation (blocksAt via recalcDerived) -- does a
          maxed Magic character COMPUTE ten blocks;
       b) the renderer -- given ten, does it actually DRAW ten cells on a
          longer bar. `mpCellsDrawn` counts sprites really on screen, so a
          count that says ten while the art still shows five fails here. */
  const ladder = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    const R = S.rpg;
    const snap = () => {
      const b = window.__btResourceBars || {};
      return { count: b.mpBlockCount, cells: b.mpCellsDrawn, w: b.mpBarW,
        lit: b.mpBlocks, enCount: b.enBlockCount, enCells: b.enCellsDrawn };
    };
    const before = { maxMana: R.maxMana, staff: R.prog3 && R.prog3.sk && R.prog3.sk.staff.level,
      stam: R.prog3 && R.prog3.alloc && R.prog3.alloc.stam };
    const out = { capOn: !!(S._serverCaps && S._serverCaps.blockScale) };
    R.mana = R.maxMana; R.stamina = R.maxStamina;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      out.base = snap();
      /* Max out BOTH inputs through the real client derivation, not by poking
         the counts -- that is what makes this a test of blocksAt rather than
         of the renderer reading a number we handed it. */
      R.prog3.sk.staff.level = 100;
      R.prog3.alloc.stam = 100;
      window.__btRecalc ? window.__btRecalc(R) : null;
      out.derived = { manaBlocks: R.manaBlocks, stamBlocks: R.stamBlocks, maxMana: R.maxMana };
      R.mana = R.maxMana; R.stamina = R.maxStamina;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        out.maxed = snap();
        /* spend ONE block at the new count and confirm the readout drops by
           exactly one light -- the property the whole feature rests on. */
        R.mana = R.maxMana - Math.floor(R.maxMana / (R.manaBlocks || 5));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          out.afterOneCast = snap();
          R.prog3.sk.staff.level = before.staff; R.prog3.alloc.stam = before.stam;
          if (window.__btRecalc) window.__btRecalc(R);
          R.mana = R.maxMana; R.stamina = R.maxStamina;
          res(out);
        }));
      }));
    }));
  }));
  console.log('    ladder: ' + JSON.stringify(ladder));

  rec.ok('a base character is on five blocks', ladder.base && ladder.base.count === 5, ladder.base);
  rec.ok('maxing Magic and Body derives TEN blocks on both pools',
    !!ladder.derived && ladder.derived.manaBlocks === 10 && ladder.derived.stamBlocks === 10, ladder.derived);
  rec.ok('...and the renderer actually DRAWS ten cells, not five',
    !!ladder.maxed && ladder.maxed.cells === 10 && ladder.maxed.enCells === 10, ladder.maxed);
  rec.ok('...on a bar that is genuinely longer than the five-block one',
    !!ladder.maxed && !!ladder.base && ladder.maxed.w > ladder.base.w, 
    { base: ladder.base && ladder.base.w, maxed: ladder.maxed && ladder.maxed.w });
  rec.ok('...but still within the width cap, so it cannot swallow the screen',
    !!ladder.maxed && ladder.maxed.w <= 118, ladder.maxed);
  rec.ok('a full ten-block bar reads ten, and one cast puts out exactly one',
    !!ladder.maxed && ladder.maxed.lit === 10
      && !!ladder.afterOneCast && ladder.afterOneCast.lit === 9,
    { full: ladder.maxed && ladder.maxed.lit, afterOne: ladder.afterOneCast && ladder.afterOneCast.lit });

  /* v2.3.2302: the owner asked to SEE it at both ends of the ladder before
     the width cap is final, so capture the same frame at five blocks and at
     ten rather than describing the difference in numbers. */
  const clipBox = async () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const cx = r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1);
    const cy = r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1);
    const x = Math.max(0, Math.round(cx - 110)), y = Math.max(0, Math.round(cy - 70));
    return { x, y, width: Math.min(innerWidth - x, 220), height: Math.min(innerHeight - y, 190) };
  });
  const shootAt = async (staff, stam, file) => {
    /* Set the level, THEN settle at full for a frame, THEN spend. The bar only
       reveals on a DECREASE, and raising Magic raises maxMana -- so jumping
       straight to "full minus one block" at the new max is an increase from
       the old pool, which the bar correctly reads as a refill and does not
       show. The first capture attempt got a nameplate for exactly this. */
    await P.page.evaluate((cfg) => {
      const R = window._gameState.current.rpg;
      R.prog3.sk.staff.level = cfg.staff;
      R.prog3.alloc.stam = cfg.stam;
      if (window.__btRecalc) window.__btRecalc(R);
      R.mana = R.maxMana; R.stamina = R.maxStamina;
    }, { staff, stam });
    await P.page.waitForTimeout(300);
    await P.page.evaluate(() => {
      const R = window._gameState.current.rpg;
      R.mana = R.maxMana - Math.floor(R.maxMana / (R.manaBlocks || 5));
      R.stamina = R.maxStamina - Math.floor(R.maxStamina / (R.stamBlocks || 5));
    });
    await P.page.waitForTimeout(350);
    const box = await clipBox();
    await P.page.screenshot(Object.assign({ path: `${H.REPO}/tools/qa/mp/out/${file}` },
      box && box.width > 60 ? { clip: box } : {})).catch(() => {});
  };
  await shootAt(1, 0, 'resbars-5blocks.png');
  await shootAt(100, 100, 'resbars-10blocks.png');
  console.log('    previews: out/resbars-5blocks.png, out/resbars-10blocks.png');
}