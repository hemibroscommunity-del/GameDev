/* Monster name plates (v2.3.1918)
 *
 * Owner: "Give monsters a name plate with their name and level beneath it
 * similar to how the player has their name plate.  Remove current the level
 * text that's on top of the monster."
 *
 * Both halves get checked, and the second is the one that is easy to fake:
 * deleting the Text node from the factory is not the same as removing the
 * label from the screen, and a plate parented to the wrong container — or
 * hanging above the head, or off in the grass — would satisfy every
 * structural assertion while looking wrong.  So this reads the live scene
 * graph for what is ACTUALLY attached and where, and leaves a screenshot.
 *
 * Monsters are INJECTED rather than travelled to (the mp-block / mp-authority
 * precedent): the archetype and level have to be chosen, not rolled, or the
 * name assertion is testing whatever the meadow happened to spawn.
 */
import * as H from './harness.mjs';
import * as C from './_colour.mjs';

/* One of each shape the plate has to cope with: a sprite-bodied slime whose
   art is 96px tall over an 8px logical size, a plain procedural archetype,
   and a two-digit level far enough above the player to trip the danger tint. */
/* ═══ v2.3.2513: AND ONE OF EACH DIFFICULTY BAND ═══
   The plate's border is now the monster's level RELATIVE TO THE PLAYER'S
   (D16), so the fixture has to span the four bands from wherever the player
   actually is.  `band` is what the renderer must answer for that level against
   a level-1 player, which is what a fresh character is: -0 near, +1..+2 high,
   +3 and up danger.  A "low" case needs the player above the monster, so it is
   driven in its own sub-test below by raising the PLAYER rather than by adding
   a level-0 monster, which does not exist. */
const CAST = [
  { arch: 'fodder', level: 1, expect: 'Slime', band: 'near' },
  { arch: 'brute', level: 7, expect: 'Brute', band: 'danger' },
  { arch: 'snowman', level: 42, expect: 'Snowman', band: 'danger' },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hunter', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const seen = await P.page.evaluate(async (cast) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return { __no: true };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    S._serverMonsters = false;
    S.monsters = cast.map((c, i) => ({
      id: 'qa_plate_' + i, arch: c.arch, archetype: c.arch, type: c.arch,
      x: S.player.x - 60 + i * 60, y: S.player.y - 40,
      renderX: S.player.x - 60 + i * 60, renderY: S.player.y - 40,
      spawnX: S.player.x - 60 + i * 60, spawnY: S.player.y - 40,
      targetX: S.player.x - 60 + i * 60, targetY: S.player.y - 40,
      hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: c.level, gold: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }));
    await sleep(2500);   /* let the display build and a few frames land */
    /* Read every plate, not just the probe's last sample: the point is that
       ALL of them are labelled, and that each one got its OWN name. */
    /* Read the renderer's own per-frame probe rather than reaching for a
       renderer handle the app does not expose.  It rebuilds each frame, so
       what comes back is what was drawn on the last one. */
    const pl = window.__btMonsterPlates;
    const out = { plates: (pl && pl.plates) ? pl.plates.slice() : [], playerLvl: (S.rpg || {}).level || 1 };
    return out;
  }, CAST);

  rec.ok('the injected monsters rendered (guard)',
    !seen.__no && seen.plates.length === CAST.length, { got: seen.plates.length, want: CAST.length });
  if (!seen.plates.length) return;

  rec.ok('every monster carries a name plate',
    seen.plates.every((p) => p.hasPill && p.visible), seen.plates);
  /* Each plate names ITS OWN monster — one shared label would pass a
     "there is a name" check and be obviously wrong on screen. */
  const names = seen.plates.map((p) => p.name);
  rec.ok('...naming the monster it belongs to',
    CAST.every((c) => names.includes(c.expect)), { got: names, want: CAST.map((c) => c.expect) });
  /* ═══ v2.3.2513: THE LEVEL MOVED INTO A WHITE CIRCLE ═══
     It used to be a second line reading "LV 42"; the owner's mockup puts it in
     a badge at the pill's right end, as digits alone.  So the assertion moves
     with it -- same claim (every plate carries its monster's real level), read
     off the node that now carries it. */
  /* v2.3.2571: the white circle is gone -- the level is plain digits a space
     after the name, in the band's colour.  Same claim, same node (the level
     keeps its own Text so it can keep its own ink); only the shape it is drawn
     in has changed, so the assertion's WORDS move and its substance does not. */
  rec.ok('...with the level set after the name, as digits',
    seen.plates.every((p) => /^\d+$/.test(p.badge || '')), seen.plates.map((p) => p.badge));
  rec.ok('...carrying the real level, not a placeholder',
    CAST.every((c) => seen.plates.some((p) => p.badge === String(c.level))),
    { got: seen.plates.map((p) => p.badge), want: CAST.map((c) => String(c.level)) });

  /* ═══ v2.3.2571: ABOVE THE HEAD, ON THE HP BAR'S OWN LINE ═══
     Owner: "I want them to be above the head."  This assertion is INVERTED
     from the one that stood here since v2.3.1918 ("hanging beneath the
     monster, not over its head") -- that was the right test for the plate the
     owner has now changed their mind about, and it is updated to the new
     reality rather than relaxed: it still pins an exact side of the origin and
     an exact distance, just the other side.

     Local y is measured from the monster's own origin, which its art stands
     on, so NEGATIVE is above it.  `y` is the plate's TOP (the capsule draws
     downward from there), so the whole plate is above the origin whenever its
     top is.

     The second assertion is the one that carries the owner's real ask.  "Above
     the head" on its own would be satisfied by a plate parked anywhere in the
     sky; what was asked for is that the plate BECOMES the HP bar, which means
     the two share a spot.  So the plate's own centre line is asserted against
     the bar's, within a pixel — if they drift apart the swap stops reading as
     a swap and starts reading as one thing leaving and another arriving. */
  rec.ok('...riding above the monster, not beneath its feet',
    seen.plates.every((p) => p.y < 0), seen.plates.map((p) => p.y));
  rec.ok('...centred on the HP bar\'s own line, so the two swap in one spot',
    seen.plates.every((p) => p.bandY != null && p.plateMidY != null
      && Math.abs(p.plateMidY - p.bandY) <= 1),
    seen.plates.map((p) => ({ arch: p.arch, bandY: p.bandY, plateMidY: p.plateMidY })));
  rec.ok('...and clear of the sprite rather than adrift in the sky',
    seen.plates.every((p) => p.y < 0 && p.y > -220), seen.plates.map((p) => p.y));

  /* The label that had to GO. */
  rec.ok('the old level text over the monster is gone',
    seen.plates.every((p) => !p.hasOldLvlText), seen.plates.map((p) => p.hasOldLvlText));

  /* ═══ v2.3.2513: THE DANGER TINT BECOMES FOUR BANDS ═══
     v2.3.1144's warning is not dropped, it is graded: the border colour is the
     monster's level relative to yours, in the four bands the owner's mockup
     legends (Low / Near / High / Danger, D16).  The old assertion read the LV
     line's ink, which no longer exists -- the level is dark digits on a white
     badge whatever the danger is -- so the claim is read off the band instead.

     RELATIVE is the part worth testing, and the reason the second half of this
     raises the PLAYER rather than adding a monster: the same level 7 brute is
     "Danger" to a level 1 and "Low" to a level 9, and a fixture that only ever
     looked at one player level would pass for a plate that hard-coded the
     monster's own level into a colour. */
  const hot = seen.plates.find((p) => p.badge === '42');
  const cold = seen.plates.find((p) => p.badge === '1');
  rec.ok('a monster far above your level wears the Danger border',
    !!hot && hot.band === 'danger', { hot, playerLvl: seen.playerLvl });
  /* The fixture's level-1 slime is 'near' to a level-1 player and 'low' to the
     level-3 one a fresh character actually is, so the claim is "not Danger"
     rather than a hard-coded band -- and the graded sweep below is what pins
     the exact thresholds. */
  rec.ok('...and one at or below your level does not',
    !!cold && (cold.band === 'near' || cold.band === 'low'), { cold, playerLvl: seen.playerLvl });
  const banded = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const before = (S.rpg || {}).level || 1;
    /* Level 9 against the fixture's 1 / 7 / 42: -8 Low, -2 Low, +33 Danger.
       Then 6, which puts the brute at +1 -- High -- so all four bands are
       exercised against monsters that never moved. */
    S.rpg.level = 9; await sleep(400);
    const at9 = ((window.__btMonsterPlates || {}).plates || [])
      .map((p) => ({ badge: p.badge, band: p.band }));
    S.rpg.level = 6; await sleep(400);
    const at6 = ((window.__btMonsterPlates || {}).plates || [])
      .map((p) => ({ badge: p.badge, band: p.band }));
    S.rpg.level = before; await sleep(300);
    return { at9, at6 };
  });
  const bandOf = (list, badge) => (list.find((x) => x.badge === badge) || {}).band;
  rec.ok('a monster two or more levels UNDER you reads Low',
    bandOf(banded.at9, '1') === 'low' && bandOf(banded.at9, '7') === 'low', banded.at9);
  rec.ok('...one or two levels over reads High',
    bandOf(banded.at6, '7') === 'high', banded.at6);
  rec.ok('...and the band follows the PLAYER levelling, not only the monster',
    bandOf(banded.at9, '7') !== bandOf(banded.at6, '7'), banded);

  /* ═══════════════════════════════════════════════════════════════════
     v2.3.2530: THE SOFTENING, AND THE INFORMATION IT WAS NOT ALLOWED TO COST
     ═══════════════════════════════════════════════════════════════════════
     Owner, on the v2.3.2513 plate seen on a real phone: "too harsh -- the
     contrast is too high."  The answer is a block of named constants in
     entityRenderer's nameplate region, and the reason it is asserted HERE
     rather than left to the eye is that none of it can be read off the screen:
     a Pixi Graphics cannot be read back, and a 2 px coloured ring over a
     textured scene is exactly the crop TRAPS §21 says a colour count lies
     about.  So the renderer reports the values it painted with (`soft`) and
     the arithmetic is done on those.

     THE POINT OF THESE ASSERTIONS IS THE FLOOR, NOT THE CURRENT NUMBERS.  The
     owner is expected to ask for "softer still" more than once, and every one
     of those rounds is three numbers in that block.  What must not happen in
     any of those rounds is that a band pair, or the name, or the warning,
     quietly stops being readable.  So the exact values are asserted loosely
     (softened at all / still a warning) and the things that carry MEANING are
     asserted as hard floors. */
  const soft = await P.page.evaluate(() => {
    const pl = ((window.__btMonsterPlates || {}).plates || []).find((p) => p.soft);
    return pl ? pl.soft : null;
  });
  rec.ok('a plate reported the values it was painted with (guard)', !!soft, soft);
  if (soft) {
    /* ── 1. the softening actually landed ────────────────────────────────
       Each of these was 1 / pure white / 700 in v2.3.2513, so each is a
       statement that this change is on screen and not merely in the source. */
    rec.ok(`the resting plate's fill is no longer opaque (${soft.fillAlpha})`,
      soft.fillAlpha < 1, soft);
    rec.ok(`...its difficulty border is softened too (${soft.borderAlpha})`,
      soft.borderAlpha < 1, soft);
    rec.ok(`...its name is lighter than the 700 it shipped at (${soft.nameWeight})`,
      Number(soft.nameWeight) < 700, soft);
    /* ═══ v2.3.2571: THE DISC IS GONE, SO THE ASSERTION ON IT MOVES ═══
       This line used to read `soft.badgeFill !== 0xFFFFFF` -- the v2.3.2530
       claim that the plate's brightest object had been stepped down from pure
       white.  The disc is deleted outright now (the new mock has no circle),
       which is a stronger version of that same claim, so the old assertion is
       not weakened, it is SUPERSEDED: it is replaced by one that the deleted
       disc makes true and that would fail the moment someone drew it again. */
    rec.ok('the level no longer rides in a white disc (it was the brightest thing on the plate)',
      soft.badgeFill === undefined, { badgeFill: soft.badgeFill });

    /* ── THE FLOOR UNDER THE LEVEL, WHICH IS NEW AND IS A REAL RISK ────────
       The mock sets the level in the band's colour.  Taken literally that puts
       #FF3636 ("Danger") and #F3821F ("High") on the navy plate at 2.66:1 and
       3.65:1 -- both under AA, and the Danger one is the plate a player most
       needs to read.  The renderer therefore draws the digits in a per-band
       TEXT TINT (PLATE_LEVEL_INK), the band hue lifted toward white only as
       far as the floor demands.  Asserted here for the same reason the name's
       contrast is: it is invisible from outside the renderer, and "the level
       went dim on exactly one band" is not something a screenshot of a moving
       scene would give up. */
    rec.ok('the plate reported the ink it set the level in (guard)',
      !!soft.levelInk && !!soft.levelInks, { levelInk: soft.levelInk, levelInks: soft.levelInks });
    if (soft.levelInks) {
      let worstLv = Infinity, worstLvAt = '';
      for (const [band, ink] of Object.entries(soft.levelInks)) {
        for (const [scene, bg] of Object.entries(C.SCENES)) {
          const cr = C.contrast(ink, C.over(0x0B1F2D, soft.fillAlpha, bg));
          if (cr < worstLv) { worstLv = cr; worstLvAt = `${band} over ${scene}`; }
        }
      }
      console.log(`    level ink, worst band/scene: ${worstLv.toFixed(2)}:1 (${worstLvAt})`);
      rec.ok(`every band's level digits clear AA over every ground `
        + `(worst ${worstLv.toFixed(2)}:1 at ${worstLvAt}, floor 4.5)`,
        worstLv >= 4.5, { worstLv, worstLvAt, levelInks: soft.levelInks });
      /* The tints are a LIGHTENING, not a desaturation -- the move note 1 of
         the knob block forbids.  So they carry the same duty the rings do:
         four levels must still be four tellable-apart colours, at the same
         ΔE00 12 floor.  Without this, "fix the contrast" could quietly wash
         all four toward white and nobody would see it until they were in a
         fight wondering what the number meant. */
      /* The renderer reports the rings as NUMBERS (0x4BE54E, the form Pixi
         strokes with) and the inks as STRINGS ('#4BE54E', the form a Text
         style takes).  Compared raw, "the ink equals the band" is false for
         every band and the two assertions below would pass for the wrong
         reason -- a test that can only succeed is TRAPS §33 wearing a
         different hat.  Normalised to one form first. */
      const hexNum = (c) => (typeof c === 'string'
        ? parseInt(String(c).replace('#', ''), 16) : c);
      const lv = ['low', 'near', 'high', 'danger'];
      let worstLvDe = Infinity, worstLvPair = '';
      for (let i = 0; i < lv.length; i++) {
        for (let j = i + 1; j < lv.length; j++) {
          const d = C.deltaE00(soft.levelInks[lv[i]], soft.levelInks[lv[j]]);
          if (d < worstLvDe) { worstLvDe = d; worstLvPair = `${lv[i]}/${lv[j]}`; }
        }
      }
      rec.ok(`...and the four level tints stay tellable apart too `
        + `(worst ΔE00 ${worstLvDe.toFixed(1)} at ${worstLvPair}, floor 12)`,
        worstLvDe >= 12, { worstLvDe, worstLvPair, levelInks: soft.levelInks });
      /* THE LIFT MUST NOT HAVE LEAKED INTO THE RING.  `high` and `danger` are
         the two bands whose digits had to be lightened to clear AA; the rings
         for those bands must still be the mock's SAMPLED values, or the fix
         for the text would have quietly desaturated the border -- which is
         precisely the one move the knob block forbids, arrived at sideways.
         Written as "the ring and the digits differ for these two" because that
         is the only shape a leak could not survive: if someone sets the ring
         to the tint to make them match, this fails. */
      rec.ok('...while the ring keeps the sampled band the digits had to leave',
        hexNum(soft.bands.high) !== hexNum(soft.levelInks.high)
        && hexNum(soft.bands.danger) !== hexNum(soft.levelInks.danger),
        { ring: { high: soft.bands.high, danger: soft.bands.danger },
          ink: { high: soft.levelInks.high, danger: soft.levelInks.danger } });
      /* ...and the bands that did NOT need lifting are still byte-identical,
         so "the number is the band colour" is literally true wherever it can
         be, and the exception is only where legibility forced it. */
      rec.ok('...and the bands that cleared AA on their own are the band colour exactly',
        hexNum(soft.bands.low) === hexNum(soft.levelInks.low)
        && hexNum(soft.bands.near) === hexNum(soft.levelInks.near),
        { ring: { low: soft.bands.low, near: soft.bands.near },
          ink: { low: soft.levelInks.low, near: soft.levelInks.near } });
    }

    /* ── 2. THE FLOOR UNDER THE NAME ─────────────────────────────────────
       A translucent plate takes its background with it, so the name's contrast
       is no longer one number -- it is a number per scene, and the binding
       case is the brightest ground in the game (Frost Ridge snow), where the
       navy washes out toward the scene and the gap to an off-white name is at
       its narrowest.  Asserted against the WCAG AA body floor over every scene
       including pure white, which no zone actually is. */
    let worstCr = Infinity, worstScene = '';
    for (const [name, bg] of Object.entries(C.SCENES)) {
      const plate = C.over(0x0B1F2D, soft.fillAlpha, bg);
      const cr = C.contrast(soft.nameFill, plate);
      if (cr < worstCr) { worstCr = cr; worstScene = name; }
    }
    console.log(`    name contrast, worst scene: ${worstCr.toFixed(2)}:1 over ${worstScene}`);
    rec.ok(`the name still clears AA over the worst ground in the game `
      + `(${worstCr.toFixed(2)}:1 over ${worstScene}, floor 4.5)`,
      worstCr >= 4.5, { worstCr, worstScene, soft });

    /* ── 3. THE FLOOR UNDER THE FOUR BANDS ───────────────────────────────
       The one thing a softening could destroy without looking like it had.
       Yellow (`near`, −1..0) and orange (`high`, +1..+2) are adjacent bands
       AND adjacent hues: desaturate both and they become the same ring at
       2 px on a phone, and the plate goes on looking fine while it has stopped
       answering "can I take this thing".

       That is why the border is softened by ALPHA and never by moving the band
       colours, and the assertion is written to hold whoever reads it next:
       every pair, composited at whatever alpha the renderer currently uses,
       over every ground a plate sits on, must stay past ΔE00 12.  For scale,
       1 is the just-noticeable difference and ~10 is "nobody would call these
       the same colour" -- 12 is a deliberately generous floor for a 2 px ring
       glanced at mid-fight, and the shipped values clear it by a wide margin.

       The bands are read from the RENDERER (`soft.bands`), not restated here:
       a fixture that hard-coded the four colours would keep passing after
       someone changed them, which is the failure this is here to prevent. */
    const bandNames = ['low', 'near', 'high', 'danger'];
    rec.ok('the renderer reported all four band colours (guard)',
      !!soft.bands && bandNames.every((b) => soft.bands[b] != null), soft.bands);
    if (soft.bands && bandNames.every((b) => soft.bands[b] != null)) {
      const DE_FLOOR = 12;
      let worstDe = Infinity, worstPair = '';
      const rows = [];
      for (const [scene, bg] of Object.entries(C.SCENES)) {
        const cells = [];
        for (let i = 0; i < bandNames.length; i++) {
          for (let j = i + 1; j < bandNames.length; j++) {
            const a = C.over(soft.bands[bandNames[i]], soft.borderAlpha, bg);
            const b = C.over(soft.bands[bandNames[j]], soft.borderAlpha, bg);
            const d = C.deltaE00(a, b);
            cells.push(`${bandNames[i]}/${bandNames[j]}=${d.toFixed(1)}`);
            if (d < worstDe) { worstDe = d; worstPair = `${bandNames[i]}/${bandNames[j]} over ${scene}`; }
          }
        }
        rows.push(`      ${scene.padEnd(12)} ${cells.join('  ')}`);
      }
      console.log('    band separation (CIEDE2000, border composited at alpha '
        + soft.borderAlpha + '):');
      rows.forEach((r) => console.log(r));
      /* Called out on its own line because it is the pair the owner named and
         the one a future desaturation would kill first. */
      const nearHigh = Math.min(...Object.values(C.SCENES).map((bg) =>
        C.deltaE00(C.over(soft.bands.near, soft.borderAlpha, bg),
          C.over(soft.bands.high, soft.borderAlpha, bg))));
      rec.ok(`yellow "Near" and orange "High" stay distinct rings `
        + `(worst ΔE00 ${nearHigh.toFixed(1)}, floor ${DE_FLOOR})`,
        nearHigh >= DE_FLOOR, { nearHigh, borderAlpha: soft.borderAlpha });
      rec.ok(`...and so does every other pair of the four `
        + `(worst ΔE00 ${worstDe.toFixed(1)} at ${worstPair}, floor ${DE_FLOOR})`,
        worstDe >= DE_FLOOR, { worstDe, worstPair, borderAlpha: soft.borderAlpha });
      /* The band colours are still four DIFFERENT values -- the cheap check
         that catches the crudest possible "softening", which is setting them
         all to one muted colour. */
      rec.ok('...because the four bands are still four different colours',
        new Set(bandNames.map((b) => soft.bands[b])).size === 4, soft.bands);
    }
  }

  /* ═══ v2.3.2295: THE PLATE GOES RED WHILE IT IS HITTING YOU ═══
     Owner: "change the monster name plate to a red background when they're
     actively attacking you."

     mp-moncue proves the CHAIN (the worker's monster_attack reaching the
     plate) against real server monsters. This proves the PLATE, on the two
     things a chain test cannot reach cleanly: that only the attacker turns
     red, and that the level ink comes back afterwards.

     THE SECOND ONE IS THE TRAP, and it is the one the assertion above walked
     past. The danger tint #ef4444 measures 4.86:1 on the normal plate and
     1.9:1 on the alarm red -- TRAPS §48's "a light surface inherits AA-failing
     ink", run in Graphics rather than in CSS. So the alarm has to take the
     whole ramp with it and hand it back, and "hands it back" is the half that
     silently rots: the plate is cached on a key, and a state left out of that
     key sticks on whichever value it was last painted with. The fixture above
     only passes today because its monsters have dmg:0 and never attack -- it
     has never seen the two states meet. */
  const alarmed = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const target = (S.monsters || []).find((m) => m.level === 42);
    if (!target) return null;
    target._atkMeUntil = Date.now() + 8000;
    await sleep(500);
    const on = (window.__btMonsterPlates || {}).plates || [];
    /* v2.3.2530: `soft` rides along on the plate record, so both the alarm and
       the resting read below carry the values each state was painted with. */
    const hotOn = on.find((p) => p.level === 'LV 42') || null;
    const others = on.filter((p) => p.level !== 'LV 42').map((p) => ({ level: p.level, alarm: p.alarm }));
    target._atkMeUntil = 0;
    await sleep(500);
    const off = (window.__btMonsterPlates || {}).plates || [];
    return { hotOn: hotOn, others: others, hotOff: off.find((p) => p.level === 'LV 42') || null };
  });
  rec.ok('the attacked monster reports its plate in the alarm state (guard)',
    !!(alarmed && alarmed.hotOn), alarmed);
  if (alarmed && alarmed.hotOn) {
    rec.ok('the monster hitting you wears a red plate',
      alarmed.hotOn.alarm === true, alarmed.hotOn);
    /* ...and the plate was REBUILT for it. The rounded rect is redrawn only
       when the cache key changes, and for a monster the name and level never
       change after frame one -- so an alarm left out of that key sets the flag
       and paints nothing, forever. */
    rec.ok('...and the plate was actually repainted for it, not just flagged',
      /\|!\|/.test(String(alarmed.hotOn.pillKey || '')), alarmed.hotOn);
    rec.ok('...while the monsters standing next to it do not',
      alarmed.others.every((p) => p.alarm !== true), alarmed.others);
    /* ═══ v2.3.2513: D4 -- "THE BORDER RULES DO NOT CHANGE" ═══
       The owner's answer moves the alarm to the plate's FILL and says the
       border is unaffected, which is what lets a red border ("this thing is
       far above you") and a red fill ("it is hitting you right now") coexist
       and still mean two different things.  Both halves are asserted because
       the band is in the cache key: a rebuild that recomputed it from the
       alarm would be invisible except here.
       The old assertion on this line watched the LV line's ink leave the
       danger red, which was the AA problem (1.9:1) the dark alarm fill created.
       It is gone with the two-line plate -- the level is dark-on-white in its
       own badge now, and its contrast does not depend on the fill at all. */
    rec.ok('...and the difficulty border is untouched by the alarm',
      alarmed.hotOn.band === 'danger', alarmed.hotOn);
    /* The half that rots silently: coming BACK. */
    rec.ok('...and when it stops, the plate returns to its band',
      !!alarmed.hotOff && alarmed.hotOff.alarm === false
        && alarmed.hotOff.band === 'danger', alarmed.hotOff);

    /* ═══ v2.3.2530: THE WARNING DID NOT GET SOFTENED WITH THE REST ═══
       The owner asked for a softer plate; this state is the one thing on it
       that is a WARNING rather than a label, and a warning quieted to match
       its surroundings has been deleted.  So the softening is asserted to have
       SKIPPED it -- and the relationship is asserted rather than the absolute
       values, because every future "softer still" round moves the resting
       numbers and none of them may move this one:

         the alarm plate is OPAQUE while the resting plate is not,
         its name is HEAVIER and BRIGHTER than the resting plate's,

       which together are what makes a monster that is hitting you the loudest
       plate on the screen -- more so after this change than before it, since
       everything around it stepped back. */
    const aSoft = alarmed.hotOn.soft, rSoft = alarmed.hotOff && alarmed.hotOff.soft;
    rec.ok('both states reported what they painted with (guard)', !!(aSoft && rSoft),
      { alarm: aSoft, resting: rSoft });
    if (aSoft && rSoft) {
      rec.ok(`the attacking-you plate stays fully opaque while the resting one `
        + `does not (${aSoft.fillAlpha} vs ${rSoft.fillAlpha})`,
        aSoft.fillAlpha === 1 && rSoft.fillAlpha < 1, { alarm: aSoft, resting: rSoft });
      rec.ok(`...and its name stays heavier than the softened one `
        + `(${aSoft.nameWeight} vs ${rSoft.nameWeight})`,
        Number(aSoft.nameWeight) > Number(rSoft.nameWeight), { alarm: aSoft, resting: rSoft });
      rec.ok('...and brighter, which is also the AA the fill was chosen for',
        C.luminance(aSoft.nameFill) > C.luminance(rSoft.nameFill),
        { alarm: aSoft.nameFill, resting: rSoft.nameFill });
      /* v2.3.2513 picked #E03131 as "the brightest red that still passes AA for
         the name", measured with WHITE ink -- but the factory drew #F4F0E7 and
         nothing ever wired that constant up, so the shipped pairing was 4.04:1
         and under the floor its own comment claimed.  Naming the alarm ink
         fixes that, and this is the assertion that keeps the two in step: move
         the red and this fails until the arithmetic is redone. */
      const alarmCr = C.contrast(aSoft.nameFill, 0xE03131);
      rec.ok(`...so the name on the red plate clears AA (${alarmCr.toFixed(2)}:1, floor 4.5)`,
        alarmCr >= 4.5, { nameFill: aSoft.nameFill, alarmCr });
      /* D4: "the border rules do not change."  The difficulty ring is drawn the
         same in both states, which is what lets a red ring ("far above you")
         and a red fill ("hitting you right now") sit together and still say two
         different things. */
      rec.ok('...while the difficulty ring is drawn identically in both states',
        aSoft.borderAlpha === rSoft.borderAlpha && aSoft.borderPx === rSoft.borderPx,
        { alarm: aSoft, resting: rSoft });
    }
  }

  if (process.env.BT_SHOT) await P.page.screenshot({ path: process.env.BT_SHOT });

  /* ═══ v2.3.2154: AND THE PLATE IS BIG ENOUGH TO READ ═══
     Owner: "Make the character name plate, level, and monster nameplate and
     level a bit larger font." A size is only a size if something measures it;
     the numbers live in a factory argument three files away from anything a
     reader of this scenario would think to check. */
  const sized = await P.page.evaluate(() => {
    const pl = window.__btMonsterPlates;
    const p0 = pl && pl.plates && pl.plates.find((x) => x.hasPill && x.nameSize);
    return p0 ? { nameSize: p0.nameSize, lvlSize: p0.lvlSize, cssSize: p0.cssSize, arch: p0.arch } : null;
  });
  rec.ok('a monster plate reported its font sizes (guard)', !!sized, sized);
  rec.ok(`the monster's name is at least 12px (${sized && sized.nameSize})`,
    !!sized && sized.nameSize >= 12, sized);
  /* ═══ v2.3.2513: D5 -- THE SIZE THE PLAYER ACTUALLY SEES ═══
     `nameSize` is the design number and says nothing about the screen until it
     is multiplied by the plate's scale, its container's, and the camera zoom --
     which is exactly how a plate designed at 8 ended up rendering at 6 CSS px
     in a combat zone and nothing caught it.  `cssSize` is that product, and
     after D5 it is the number the owner named: about 14-15 CSS px, whatever the
     zoom is doing. */
  rec.ok(`...and on screen it is 13-17 CSS px, not the ~6 it used to be (${sized && sized.cssSize})`,
    !!sized && sized.cssSize >= 13 && sized.cssSize <= 17, sized);

  /* ═══ v2.3.2513: D4's FIRST RULE -- THE PLATE GETS OUT OF A FIGHT ═══
     "HIDDEN while the monster is YOUR engaged target (locked, or hit by you
     within the last 3 s) -- the HP bar stays."  Both clauses are driven, and
     the HP bar is asserted alongside, because "hide the plate in combat" and
     "hide the label you need" are one mistake apart.

     The lock alone must NOT be enough: with automatic acquisition a lock
     exists whenever anything is inside the 220px perimeter, so a plate that
     hid on the bare lock would blank every monster you walked past.  So the
     first step locks WITHOUT intent and requires the plate to stay. */
  const engaged = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const m = (S.monsters || []).find((x) => x.level === 42);
    if (!m) return null;
    /* The HP bar is only drawn once there is damage to show, so a full-health
       monster would prove nothing about D4's "the HP bar stays". */
    m.curHp = Math.round(m.maxHp * 0.5);
    const read = () => {
      const p = ((window.__btMonsterPlates || {}).plates || []).find((x) => x.badge === '42') || null;
      return p ? { hidden: p.hidden, visible: p.visible, hitByMeAgo: p.hitByMeAgo,
        hpBar: p.hpBar, bandY: p.bandY, plateMidY: p.plateMidY } : null;
    };
    /* v2.3.2571: the band's state BEFORE anything is engaged -- a monster that
       is hurt but that you are not fighting.  Under the old rule the bar was
       up for this (it keyed off "is this monster damaged"); under the new one
       the PLATE is up and the bar is down, which is the half of the owner's
       ask that is easy to miss: "less distracting" cuts both ways, and a
       half-empty bar over something you are not fighting is exactly the noise
       being removed. */
    await sleep(400);
    const hurtAtRest = read();
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'auto' };
    S.autoAttack = false;
    await sleep(400);
    const lockedOnly = read();
    /* Now the intent: a TAP lock is what engagedStance reads. */
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap', at: Date.now() };
    await sleep(400);
    const engagedNow = read();
    S.lockedTarget = null;
    await sleep(400);
    const released = read();
    /* The other clause: a hit YOU landed keeps it down for three seconds. */
    m._hitByMeAt = Date.now();
    await sleep(400);
    const justHit = read();
    m._hitByMeAt = Date.now() - 5000;
    await sleep(400);
    const longAgo = read();
    m._hitByMeAt = 0;
    /* And the case the old rule left EMPTY: engaged with the monster still at
       full health.  The plate hid (engaged) and the bar hid (undamaged), so
       there was nothing at all over the monster you were aiming at. */
    m.curHp = m.maxHp;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap', at: Date.now() };
    await sleep(400);
    const engagedFull = read();
    S.lockedTarget = null;
    m.curHp = Math.round(m.maxHp * 0.5);
    await sleep(400);
    return { hurtAtRest, lockedOnly, engagedNow, released, justHit, longAgo, engagedFull };
  });
  rec.ok('the engagement sub-test ran (guard)', !!(engaged && engaged.lockedOnly), engaged);
  if (engaged && engaged.lockedOnly) {
    rec.ok('a monster merely inside the perimeter keeps its plate',
      engaged.lockedOnly.hidden === false, engaged.lockedOnly);
    rec.ok('...but the one you have actually engaged loses it',
      engaged.engagedNow.hidden === true, engaged.engagedNow);
    /* The half of D4 that is easy to overshoot: the HP bar STAYS. */
    rec.ok('...while its HP bar stays up, which is what you need mid-swing',
      !!(engaged.engagedNow.hpBar && engaged.engagedNow.hpBar.vis
         && engaged.engagedNow.hpBar.alpha > 0), engaged.engagedNow.hpBar);
    rec.ok('...and gets it back when you let go',
      engaged.released.hidden === false, engaged.released);
    rec.ok('a hit you landed hides it for three seconds',
      engaged.justHit.hidden === true, engaged.justHit);
    rec.ok('...and no longer, once the fight has moved on',
      engaged.longAgo.hidden === false, engaged.longAgo);

    /* ═══════════════════════════════════════════════════════════════════
       v2.3.2571: THE BAND HAS EXACTLY ONE OCCUPANT
       ═══════════════════════════════════════════════════════════════════
       Owner: the plate should "disappear (change to hp bar) when taking
       damage", and go back to a plate when the fighting stops.  That is a
       claim about a PAIR of things -- one up, one down, never both, never
       neither -- so it is asserted as a pair at every step above rather than
       as two independent visibility checks that could both be wrong in the
       same direction.

       The old suite only ever asked "is the bar still up while engaged",
       which passed for a bar that was ALWAYS up. */
    const barUp = (r) => !!(r && r.hpBar && r.hpBar.vis && r.hpBar.alpha > 0);
    rec.ok('at rest the band shows the PLATE and no bar, even on a hurt monster',
      engaged.hurtAtRest && engaged.hurtAtRest.hidden === false
      && !barUp(engaged.hurtAtRest), engaged.hurtAtRest);
    rec.ok('...the moment you engage it, that swaps: bar up, plate gone',
      engaged.engagedNow.hidden === true && barUp(engaged.engagedNow),
      engaged.engagedNow);
    rec.ok('...and it swaps back when the fight moves on',
      engaged.longAgo.hidden === false && !barUp(engaged.longAgo), engaged.longAgo);
    /* The hole the old rule left, and the reason the bar's gate had to change
       rather than just the plate's position. */
    rec.ok('a monster you are aiming at but have not hit yet shows a FULL bar, not an empty band',
      engaged.engagedFull && engaged.engagedFull.hidden === true
      && barUp(engaged.engagedFull), engaged.engagedFull);
    /* Both occupants on one line -- the same coincidence asserted on the
       resting plates above, re-checked here against the bar the fight put up,
       because that is the pairing the owner actually sees swap. */
    rec.ok('...and whichever is up sits on the same line as the other',
      engaged.engagedNow.bandY != null && engaged.hurtAtRest.plateMidY != null
      && Math.abs(engaged.hurtAtRest.plateMidY - engaged.engagedNow.bandY) <= 1,
      { restingPlateMid: engaged.hurtAtRest.plateMidY, fightingBar: engaged.engagedNow.bandY });
  }
}
