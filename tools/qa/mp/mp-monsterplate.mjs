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
  rec.ok('...with the level in the badge at the end of the pill',
    seen.plates.every((p) => /^\d+$/.test(p.badge || '')), seen.plates.map((p) => p.badge));
  rec.ok('...carrying the real level, not a placeholder',
    CAST.every((c) => seen.plates.some((p) => p.badge === String(c.level))),
    { got: seen.plates.map((p) => p.badge), want: CAST.map((c) => String(c.level)) });

  /* BENEATH the monster.  Local y is measured from the monster's own origin,
     which its art stands on, so positive is below the feet — a plate above
     the head would be the old label with extra steps. */
  rec.ok('...hanging beneath the monster, not over its head',
    seen.plates.every((p) => p.y > 0), seen.plates.map((p) => p.y));
  rec.ok('...close under it rather than adrift in the grass',
    seen.plates.every((p) => p.y > 0 && p.y < 60), seen.plates.map((p) => p.y));

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
        hpBar: p.hpBar } : null;
    };
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
    return { lockedOnly, engagedNow, released, justHit, longAgo };
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
  }
}
