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

/* v2.3.3324: an arrow is counted where it is LOOSED, not seen in flight.
   At 90 px an arrow reaches its target in a few frames, and on a slow page
   the game catches up several steps a frame, so it can be born and land
   between two looks: the 200 ms poll of S.arrows this file used (and a look
   every frame, tried) saw town's four arrow-marked hits with "arrows=0" (the
   sweep of 2026-10-17).  Every arrow the auto-attack loop looses is relayed
   to the other players as one `player_projectile` broadcast
   (monsterCombat.js), so those are counted, bolts left out. */
const watchArrows = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S.channel || S.channel.__bmWrapped) return !!S.channel;
  window.__arrowWatch = window.__arrowWatch || { fired: 0 };
  const send = S.channel.send.bind(S.channel);
  S.channel.send = (m) => {
    if (m && m.type === 'broadcast' && m.event === 'player_projectile'
      && !(m.payload && m.payload.isStaff)) window.__arrowWatch.fired++;
    return send(m);
  };
  S.channel.__bmWrapped = true;
  return true;
});
const arrowsFired = (P) => P.page.evaluate(() => (window.__arrowWatch ? window.__arrowWatch.fired : 0));

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
    /* aim, as a player would: a TAP's lock (BroTown.jsx's tap sites).
       v2.3.3324: `src: 'tap'` and the id.  Since v2.3.2258 a bow keeps only a
       lock it got from a tap -- targeting.js drops any other ('weapon') the
       next frame -- so the bare `{type, ref}` this file set was gone before
       the first shot, the bow aimed where the body last faced, and no arrow
       ever left in the meadow (the sweep of 2026-10-17). */
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
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
        window.__seen.push({ text: p.text, icon: p.iconKey || null, crit: !!p.crit, color: p.color, roll: !!p.roll || undefined });
      }
    }, 40);
  });

  await watchArrows(P);
  let arrowsSeen = 0;
  for (let i = 0; i < 50; i++) {
    await P.page.waitForTimeout(200);
    arrowsSeen = await arrowsFired(P);
    const n = await P.page.evaluate(() => window.__seen.length);
    if (arrowsSeen > 0 && n >= 4) break;
  }
  await P.page.evaluate(() => clearInterval(window.__collect));
  const seen = await P.page.evaluate(() => window.__seen.slice());

  console.log('    arrows fired: ' + arrowsSeen);
  console.log('    every popup seen: ' + JSON.stringify(seen));
  if (!arrowsSeen) {
    /* v2.3.3324: what the fire gate (monsterCombat.js, `S.autoAttack && ...
       && S._bowSight` on something) saw, when no arrow left */
    console.log('    GATE -> ' + JSON.stringify(await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x.id === mid);
      const L = S.lockedTarget;
      const r = (v) => (typeof v === 'number' ? Math.round(v) : v);
      return {
        auto: !!S.autoAttack, pending: !!S._atkPending, shield: !!S._shieldUp,
        slot: S.rpg && S.rpg.activeSlot, bow: !!(S.rpg && S.rpg.rangedWeapon),
        swingAgo: Date.now() - (S.swingTimer || 0),
        lock: L ? { type: L.type, src: L.src || null, id: L.id || (L.ref && L.ref.id) || null } : null,
        sight: S._bowSight ? { id: S._bowSight.id, d: r(S._bowSight.d), ang: +(S._bowSight.ang || 0).toFixed(2) } : null,
        me: { x: r(S.player.x), y: r(S.player.y), hp: S.rpg && S.rpg.hp, dead: !!S._playerDead },
        mon: m ? { x: r(m.x), y: r(m.y), rx: r(m.renderX), ry: r(m.renderY), alive: m.alive !== false, hp: m.curHp } : 'gone',
      };
    }, setup.id)));
  }

  /* THE LOOP REALLY RAN.  Without this the assertions below pass vacuously
     on an empty list, which is the exact shape of the false green that let
     this ship broken twice. */
  rec.ok('the auto-attack loop actually fired a real arrow',
    arrowsSeen > 0, { arrowsSeen });
  rec.ok('...and real damage numbers landed to inspect',
    seen.length > 0, { count: seen.length, icons: ICONS(seen) });

  /* Damage dealt TO the monster is what carries a weapon mark; damage taken
     is the heart, and notices carry none.
     v2.3.3324: ...and a kill's ROLL is a message, not a hit: since v2.3.3209
     a monster's death shows its roll of 1 to 10,000 with the dice
     (game/killRoll.js, `roll: true`), and "2,133" with the dice read here as
     a number dealt with no arrow on it (the sweep of 2026-10-17). */
  const isDealt = (p) => !p.roll && p.icon && p.icon !== 'heart' && /\d/.test(p.text);
  const dealt = seen.filter(isDealt);
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
    S.autoAttack = false;   /* v2.3.3324: no meadow shot counted as town's */
    S.currentZone = 'town';
    if (S.channel) S.channel.send({ type: 'move', x: 400, y: 400, z: 'town' });
  });
  await P.page.waitForTimeout(2500);
  await watchArrows(P);   /* a reconnect would have brought a new channel */
  const firedBefore = await arrowsFired(P);
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
    S.lockedTarget = { type: 'monster', id: 'qa-town-target', ref: S.monsters[0], src: 'tap' };   /* v2.3.3324: a tap's, as above */
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
        window.__seen2.push({ text: p.text, icon: p.iconKey || null, crit: !!p.crit, roll: !!p.roll || undefined });
      }
    }, 40);
    return { srv: !!S._serverMonsters, zone: S.currentZone };
  });
  let townArrows = 0;
  for (let i = 0; i < 50; i++) {
    await P.page.waitForTimeout(200);
    townArrows = (await arrowsFired(P)) - firedBefore;
    if (await P.page.evaluate(() => window.__seen2.length >= 4)) break;
  }
  await P.page.evaluate(() => clearInterval(window.__collect2));
  const townSeen = await P.page.evaluate(() => window.__seen2.slice());
  console.log('    TOWN (client-rolled) srv=' + townSet.srv + ' arrows=' + townArrows
    + ' popups=' + JSON.stringify(townSeen));
  rec.ok('town really is the client-rolled mode (guard)', townSet.srv === false, townSet);
  rec.ok('a real bow shot lands in town too (guard)',
    townArrows > 0 && townSeen.length > 0, { townArrows, n: townSeen.length });
  const townDealt = townSeen.filter(isDealt);
  rec.ok('...and NOT ONE of those is marked with the sword either',
    townDealt.length > 0 && townDealt.every((p) => p.icon !== 'sword'), townDealt);

  await P.ctx.close().catch(() => {});
}
