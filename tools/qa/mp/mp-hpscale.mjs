/* v2.3.2572: every HP readout reads the SAME number (§5.8 D1).
 *
 * Owner: "Also character HP bar should read based on the new HP display
 * (lower). Like lower meaning HP is recalculated to be visually less, same
 * with other combat numbers."
 *
 * THE BUG IS A DISAGREEMENT, NOT A NUMBER.  v2.3.2520/2521 put the monster's
 * floating HP number, the dash, the stat screen and the hero sheet on
 * toDisplayHp and left the number over the PLAYER'S OWN head raw -- so one
 * character read 100 in the world and "20 / 20" one tap away.  A scenario that
 * asserted "the player's HP reads 20" would pin the fix and miss the point;
 * this one asserts that every surface showing that character's HP agrees with
 * every other, which is the claim the owner is actually making and the one
 * that keeps being true after the next balance change.
 *
 * Deliberately NOT restating k or any expected constant: the numbers are read
 * from the running client and compared against EACH OTHER, plus against
 * toDisplayHp imported from the game's own module.  A fixture that hard-coded
 * "20" would keep passing after someone changed DISPLAY_SCALE_K, which is the
 * failure TRAPS §35 records (a test that copies a value out of the game stops
 * testing the game).
 *
 * The RAW pool is asserted untouched in the same breath: this is a display
 * lens and nothing here may move what the server settles with.
 */
import * as H from './harness.mjs';
import { toDisplayHp, DISPLAY_SCALE_K } from '../../../src/data/gameSystems.js';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Scaler', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Take real damage so the contextual bar reveals and the number is drawn --
     a full-health character's bar is faded out and its Text never updates. */
  const reads = await P.page.evaluate(async () => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return { __no: true };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    S.rpg.maxHp = 100;
    S.rpg.hp = 63;                     /* not a multiple of k, so rounding shows */
    await sleep(900);
    return {
      hud: window.__btHpReads || null,
      rawHp: S.rpg.hp, rawMaxHp: S.rpg.maxHp,
    };
  });
  rec.ok('the player HUD reported its HP read (guard)',
    !reads.__no && !!reads.hud, reads);
  if (!reads.hud) return;

  /* ── 1. THE RAW POOL IS UNTOUCHED ──
     The whole licence for this change is that it is a lens.  If the scale ever
     reaches the stored value, every other assertion in the repo is measuring a
     game that has quietly been re-balanced. */
  rec.ok(`the stored HP pool is untouched by the display scale (${reads.rawHp}/${reads.rawMaxHp})`,
    reads.rawHp === 63 && reads.rawMaxHp === 100, reads);

  /* ── 2. THE NUMBER OVER YOUR HEAD IS ON THE SCALE ── */
  rec.ok(`your own HP number reads on the display scale `
    + `(raw ${reads.hud.rawHp} -> drawn "${reads.hud.drawn}", k=${reads.hud.k})`,
    reads.hud.drawn === String(toDisplayHp(reads.rawHp)), reads.hud);
  rec.ok('...and it is NOT the raw pool any more (the v2.3.2572 complaint)',
    reads.hud.drawn !== String(reads.rawHp), reads.hud);

  /* ── 3. EVERY SURFACE AGREES ──
     The dash meter, the stat screen and the hero sheet all read from the same
     rpg blob through toDisplayHp, so what is worth asserting is that the
     WORLD's number equals what those surfaces compute -- one character, one
     number, wherever you look at it. */
  const surfaces = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg;
    return { hp: R.hp, maxHp: R.maxHp };
  });
  const dashHp = toDisplayHp(surfaces.hp);
  const dashMax = toDisplayHp(surfaces.maxHp);
  rec.ok(`the world number and the dash/stat/hero number are the same `
    + `("${reads.hud.drawn}" vs "${dashHp}", out of ${dashMax})`,
    String(dashHp) === reads.hud.drawn && String(dashMax) === reads.hud.expectMax,
    { world: reads.hud.drawn, dash: dashHp, worldMax: reads.hud.expectMax, dashMax });

  /* ── 4. THE BOUNDARIES ──
     The three the owner's ask turns on, driven through the live client rather
     than computed here: full health must not read "20 / 19" or "19 / 20"; a
     living character must never read 0; a corpse must read 0. */
  const bounds = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const at = async (hp) => {
      S.rpg.hp = hp;
      await sleep(450);
      const r = window.__btHpReads || {};
      return { hp, drawn: r.drawn, expectMax: r.expectMax };
    };
    const full = await at(100);
    const oneOff = await at(99);
    const nearDeath = await at(1);
    const dead = await at(0);
    S.rpg.hp = 100;
    return { full, oneOff, nearDeath, dead };
  });
  rec.ok(`at full health the pair matches ("${bounds.full.drawn} / ${bounds.full.expectMax}")`,
    bounds.full.drawn === bounds.full.expectMax, bounds.full);
  rec.ok(`...one raw point of damage does not drop the number below max `
    + `("${bounds.oneOff.drawn} / ${bounds.oneOff.expectMax}") -- ceil rounds the `
    + `top ${DISPLAY_SCALE_K - 1} raw points into the top displayed one`,
    bounds.oneOff.drawn === bounds.oneOff.expectMax, bounds.oneOff);
  /* THE ONE THAT WOULD BE REPORTED AS A BUG.  toDisplayHp has no Math.max(1,…)
     the way toDisplayDamage does -- it does not need one, because ceil already
     carries any hp > 0 up to at least 1.  A living character showing "0" would
     read as "it says I'm dead", so this is asserted rather than assumed. */
  rec.ok(`a character on its last raw point reads "${bounds.nearDeath.drawn}", not "0"`,
    bounds.nearDeath.drawn === '1', bounds.nearDeath);
  rec.ok(`...and only an actually-dead one reads "${bounds.dead.drawn}"`,
    bounds.dead.drawn === '0', bounds.dead);

  /* ── 5. THE MONSTER BESIDE YOU IS IN THE SAME CURRENCY ──
     The band over a monster's head is the HP bar this PR puts there in place
     of the name plate, so a monster reading in raw points while the player
     reads scaled would be a regression introduced by that very change. */
  const mon = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    S._serverMonsters = false;
    const x = S.player.x - 70, y = S.player.y - 60;
    const m = {
      id: 'qa_hpscale', arch: 'brute', archetype: 'brute', type: 'brute',
      x, y, renderX: x, renderY: y, spawnX: x, spawnY: y, targetX: x, targetY: y,
      hp: 500, curHp: 240, maxHp: 500, dmg: 0, level: 5, gold: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    };
    S.monsters = [m];
    await sleep(1200);
    /* engage it so the bar is the band's occupant and its number is drawn */
    m._hitByMeAt = Date.now();
    await sleep(700);
    const disp = (window.__btMonsterPlates || {}).plates || [];
    const rec0 = disp.find((p) => p.id === 'qa_hpscale') || null;
    return { curHp: m.curHp, plate: rec0, hud: window.__btHpReads || null };
  });
  rec.ok('the monster rendered with its bar up (guard)',
    !!(mon.plate && mon.plate.hpBar && mon.plate.hpBar.vis), mon);
  /* The monster's own number has been scaled since v2.3.2520; asserted here
     beside the player's so the PAIR is pinned, which is the thing that was
     actually broken.  Both read off the Text nodes that were DRAWN. */
  rec.ok(`the monster's bar prints the scaled number `
    + `(raw ${mon.plate && mon.plate.hpRaw} -> "${mon.plate && mon.plate.hpNum}")`,
    !!mon.plate && mon.plate.hpNum === String(toDisplayHp(mon.plate.hpRaw)),
    mon.plate);
  /* ONE CURRENCY.  Both numbers divided by their own raw pool must give the
     same k -- which is the only form of this claim that survives someone
     changing DISPLAY_SCALE_K, and the form that would have caught the bug
     this scenario exists for (raw over your head, scaled over the monster). */
  const kOf = (raw, drawn) => Math.ceil(Number(raw) / Number(drawn));
  const kPlayer = kOf(mon.hud.rawHp, mon.hud.drawn);
  const kMonster = kOf(mon.plate.hpRaw, mon.plate.hpNum);
  rec.ok(`your HP and the monster's are in ONE currency `
    + `(you ${mon.hud.rawHp}->"${mon.hud.drawn}", it ${mon.plate.hpRaw}->"${mon.plate.hpNum}"; `
    + `k=${DISPLAY_SCALE_K})`,
    kPlayer === kMonster && kPlayer === DISPLAY_SCALE_K,
    { kPlayer, kMonster, k: DISPLAY_SCALE_K });

  if (process.env.BT_SHOT) await P.page.screenshot({ path: process.env.BT_SHOT });
}
