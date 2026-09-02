/* A REAL BOW SHOT, END TO END, AND THE MARK ON ITS NUMBER (v2.3.2234).
 *
 * Owner: "No it was the base damage for the bow appearing with the sword
 * icon.  Do headless testing to make sure it's fixed this time."
 *
 * Every previous pass at this drove a SYNTHETIC monster_damage claim and
 * read the popup it produced.  That proved the wire->icon mapping and
 * nothing else, and it is why "fixed" kept meaning "still broken".  The
 * missing piece was never subtle: the auto-attack loop is gated on
 * `S.autoAttack`, a toggle no scenario had ever set, so no arrow was ever
 * spawned and the ranged path was never actually executed in a test.
 *
 * This one arms that toggle, stands the player in bow range of a real
 * server-spawned monster, and collects EVERY popup that appears across a
 * sustained exchange -- not one sample at one moment, because the report is
 * about a number that shows up among others.
 */
import * as H from './harness.mjs';

const ICONS = (list) => list.map((p) => p.icon || '-').join(',');

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* meadow: server-driven, real monsters (town monsters are client-side). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3000);

  const setup = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.alive !== false);
    if (!m) return null;
    S.rpg.activeSlot = 'ranged';
    S.rpg.rangedWeapon = { type: 'bow', tier: 'common', tierMult: 1.12, gearBase: 'wood',
      name: 'QA Bow', quality: 'normal', element1: null, element2: null, hardness: 0, temper: 0 };
    /* THE GATE.  monsterCombat's auto-attack block is
       `if (S.autoAttack && S.rpg && _eqWpn && ...)` -- without this no arrow
       is ever spawned, which is why every earlier run reported `arrows: 0`
       and quietly proved nothing. */
    S.autoAttack = true;
    S.swingTimer = 0;
    S.player.x = m.x - 90; S.player.y = m.y;
    S._facing = 'right';
    S.lockedTarget = { type: 'monster', ref: m };   /* aim, as a player would */
    S.dmgNumbers = [];
    S.arrows = [];
    return { id: m.id, srv: !!S._serverMonsters, type: m.archetype || m.type };
  });
  rec.ok('a real server monster to shoot at, in a server-driven zone (guard)',
    !!(setup && setup.srv), setup);
  if (!setup) { await P.ctx.close().catch(() => {}); return; }

  /* Collect every popup that appears over a sustained exchange.  Sampled
     per-frame in the page and accumulated, because a popup lives ~1.2s and
     polling from Node would miss the ones between reads. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__seen = [];
    const seen = new Set();
    window.__collect = setInterval(() => {
      for (const p of (S.dmgNumbers || [])) {
        const k = p.ts + ':' + p.text + ':' + (p.iconKey || '');
        if (seen.has(k)) continue;
        seen.add(k);
        window.__seen.push({ text: p.text, icon: p.iconKey || null, crit: !!p.crit, color: p.color });
      }
    }, 40);
  });

  let arrowsSeen = 0;
  for (let i = 0; i < 50; i++) {
    await P.page.waitForTimeout(200);
    arrowsSeen = Math.max(arrowsSeen, await P.page.evaluate(
      () => (window._gameState.current.arrows || []).length));
    const n = await P.page.evaluate(() => window.__seen.length);
    if (arrowsSeen > 0 && n >= 4) break;
  }
  await P.page.evaluate(() => clearInterval(window.__collect));
  const seen = await P.page.evaluate(() => window.__seen.slice());

  console.log('    arrows spawned (max in flight): ' + arrowsSeen);
  console.log('    every popup seen: ' + JSON.stringify(seen));

  /* THE LOOP REALLY RAN.  Without this the assertions below pass vacuously
     on an empty list, which is the exact shape of the false green that let
     this ship broken twice. */
  rec.ok('the auto-attack loop actually fired a real arrow',
    arrowsSeen > 0, { arrowsSeen });
  rec.ok('...and real damage numbers landed to inspect',
    seen.length > 0, { count: seen.length, icons: ICONS(seen) });

  /* Damage dealt TO the monster is what carries a weapon mark; damage taken
     is the heart, and notices carry none. */
  const dealt = seen.filter((p) => p.icon && p.icon !== 'heart' && /\d/.test(p.text));
  rec.ok('...including at least one number dealt to the monster (guard)',
    dealt.length > 0, { dealt, all: ICONS(seen) });
  rec.ok('NOT ONE of them is marked with the sword',
    dealt.every((p) => p.icon !== 'sword'), dealt);
  rec.ok('...they are all marked with the arrow',
    dealt.every((p) => p.icon === 'arrow'), dealt);

  /* ── THE OTHER AUTHORITY MODE ──
     Town monsters are CLIENT-rolled (TRAPS #32): `_serverMonsters` is false
     there, so the number comes from the local prediction in projectiles.js
     rather than from the worker's monster_hit.  That is a different line of
     code choosing the mark, and every check so far has been on the server
     side of the fork. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'town';
    if (S.channel) S.channel.send({ type: 'move', x: 400, y: 400, z: 'town' });
  });
  await P.page.waitForTimeout(2500);
  const townSet = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = [{
      id: 'qa-town-target', x: S.player.x + 90, y: S.player.y,
      /* the projectile hit-test prefers the RENDERED position and an
         injected monster has none until the renderer stamps one */
      renderX: S.player.x + 90, renderY: S.player.y,
      hp: 4000, maxHp: 4000, curHp: 4000, alive: true,
      arch: 'fodder', type: 'fodder', archetype: 'fodder', level: 3,
      statuses: {}, vx: 0, vy: 0, atkCd: 0,
      spawnX: S.player.x + 90, spawnY: S.player.y,
    }];
    S.rpg.activeSlot = 'ranged';
    S.autoAttack = true;
    S.swingTimer = 0;
    S._facing = 'right';
    S.lockedTarget = { type: 'monster', ref: S.monsters[0] };
    S.dmgNumbers = [];
    S.arrows = [];
    window.__seen2 = [];
    const seen = new Set();
    window.__collect2 = setInterval(() => {
      const m = S.monsters[0];
      if (m) {
        m.curHp = 4000; m.alive = true;
        m.x = S.player.x + 90; m.y = S.player.y;
        m.renderX = m.x; m.renderY = m.y;
      }
      for (const p of (S.dmgNumbers || [])) {
        const k = p.ts + ':' + p.text + ':' + (p.iconKey || '');
        if (seen.has(k)) continue;
        seen.add(k);
        window.__seen2.push({ text: p.text, icon: p.iconKey || null, crit: !!p.crit });
      }
    }, 40);
    return { srv: !!S._serverMonsters, zone: S.currentZone };
  });
  let townArrows = 0;
  for (let i = 0; i < 50; i++) {
    await P.page.waitForTimeout(200);
    townArrows = Math.max(townArrows, await P.page.evaluate(
      () => (window._gameState.current.arrows || []).length));
    if (await P.page.evaluate(() => window.__seen2.length >= 4)) break;
  }
  await P.page.evaluate(() => clearInterval(window.__collect2));
  const townSeen = await P.page.evaluate(() => window.__seen2.slice());
  console.log('    TOWN (client-rolled) srv=' + townSet.srv + ' arrows=' + townArrows
    + ' popups=' + JSON.stringify(townSeen));
  rec.ok('town really is the client-rolled mode (guard)', townSet.srv === false, townSet);
  rec.ok('a real bow shot lands in town too (guard)',
    townArrows > 0 && townSeen.length > 0, { townArrows, n: townSeen.length });
  const townDealt = townSeen.filter((p) => p.icon && p.icon !== 'heart' && /\d/.test(p.text));
  rec.ok('...and NOT ONE of those is marked with the sword either',
    townDealt.length > 0 && townDealt.every((p) => p.icon !== 'sword'), townDealt);

  await P.ctx.close().catch(() => {});
}
