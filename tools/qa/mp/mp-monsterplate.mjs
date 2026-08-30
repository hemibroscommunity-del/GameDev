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
const CAST = [
  { arch: 'fodder', level: 1, expect: 'Slime' },
  { arch: 'brute', level: 7, expect: 'Brute' },
  { arch: 'snowman', level: 42, expect: 'Snowman' },
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
  rec.ok('...with the level on a second line',
    seen.plates.every((p) => /^LV \d+$/.test(p.level || '')), seen.plates.map((p) => p.level));
  rec.ok('...carrying the real level, not a placeholder',
    CAST.every((c) => seen.plates.some((p) => p.level === 'LV ' + c.level)),
    { got: seen.plates.map((p) => p.level), want: CAST.map((c) => 'LV ' + c.level) });

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

  /* v2.3.1144's danger tint had to survive the move — it is the only warning
     a player gets before engaging something far above them. */
  const hot = seen.plates.find((p) => p.level === 'LV 42');
  const cold = seen.plates.find((p) => p.level === 'LV 1');
  rec.ok('a monster far above your level still reads as dangerous',
    !!hot && /ef4444|16729156/i.test(hot.levelFill || ''), { hot, playerLvl: seen.playerLvl });
  rec.ok('...and one at your level does not',
    !!cold && !/ef4444|16729156/i.test(cold.levelFill || ''), cold);

  if (process.env.BT_SHOT) await P.page.screenshot({ path: process.env.BT_SHOT });

  /* ═══ v2.3.2154: AND THE PLATE IS BIG ENOUGH TO READ ═══
     Owner: "Make the character name plate, level, and monster nameplate and
     level a bit larger font." A size is only a size if something measures it;
     the numbers live in a factory argument three files away from anything a
     reader of this scenario would think to check. */
  const sized = await P.page.evaluate(() => {
    const pl = window.__btMonsterPlates;
    const p0 = pl && pl.plates && pl.plates.find((x) => x.hasPill && x.nameSize);
    return p0 ? { nameSize: p0.nameSize, lvlSize: p0.lvlSize, arch: p0.arch } : null;
  });
  rec.ok('a monster plate reported its font sizes (guard)', !!sized, sized);
  rec.ok(`the monster's name is at least 12px (${sized && sized.nameSize})`,
    !!sized && sized.nameSize >= 12, sized);
  rec.ok(`...and its LV line tracks it, one down (${sized && sized.lvlSize})`,
    !!sized && sized.lvlSize >= sized.nameSize - 1, sized);
}
