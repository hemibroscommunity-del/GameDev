/* ONE MONSTER LEAVES ONE REMNANT (v2.3.2233).
 *
 * Owner: "Slime remnants still have dozens dropping as loot now."
 *
 * MEASURED BEFORE IT WAS FIXED: a single fodder slime left 47 piles in 2.5
 * seconds.  In a server zone the client never sets `alive = false` -- the
 * worker owns the kill -- so a monster whose hp has reached 0 sits at
 * `curHp <= 0 && alive` until monster_kill arrives.  Both local kill blocks
 * test exactly that and neither remembered having fired, so every DoT tick
 * and every further hit inside that window minted another pile.
 *
 * It is an ECONOMY bug, not a cosmetic one: groundLoot.js credits a skull
 * pile straight into the bag on pickup (remnantInvKey) and remnant piles are
 * exempt from the 60s despawn, so they pile up and every one is claimable --
 * the owner's "dozens in my bag then fixes the amounts", the correction
 * being the authoritative inventory sync undoing what the client invented.
 *
 * THE TEST HOLDS THE STATE, and that is the whole trick.  The first version
 * of this set curHp = 0 once and slept; the server's own tick healed it back
 * to 45 inside the window, so the block was entered exactly once and the
 * probe reported "1 pile" -- a green result from a repro that never
 * reproduced.  An exploding slime holds that state for its whole 1600ms
 * fuse, so holding it here is the faithful thing, not a cheat.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Remnant', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* A server-driven spoke: town monsters are client-side (TRAPS #32) and the
     branch under test only exists on the server-authoritative path. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3000);
  const zone = await P.page.evaluate(() => ({
    srv: !!window._gameState.current._serverMonsters,
    n: (window._gameState.current.monsters || []).length,
  }));
  rec.ok('reached a server-driven zone with monsters (guard)', zone.srv && zone.n > 0, zone);
  if (!zone.srv || !zone.n) { await P.ctx.close().catch(() => {}); return; }

  const held = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.alive !== false);
    if (!m) return null;
    S.groundLoot = [];
    let ticks = 0;
    const hold = setInterval(() => {
      ticks++;
      /* The post-damage, pre-monster_kill state, re-asserted against the
         server's own tick -- the window an exploding slime lives in. */
      m.curHp = 0; m.alive = true;
      m.statuses = { burn: { until: Date.now() + 9000, tickAt: 0, amount: 1, statusId: 'burn' } };
      m._lastDotDmg = null;
    }, 50);
    await new Promise((r) => setTimeout(r, 2500));
    clearInterval(hold);
    return { ticks, skulls: S.groundLoot.filter((l) => l.skull).length, type: m.archetype || m.type };
  });
  console.log('    held at 0hp-but-alive: ' + JSON.stringify(held));
  rec.ok('the window was actually held open (guard -- 40+ passes)',
    !!(held && held.ticks >= 40), held);
  rec.ok('...and one monster left exactly ONE claimable remnant pile, not dozens',
    !!(held && held.skulls === 1), held);

  /* A SECOND life drops its own pile: the guard is per-life, not forever. */
  const second = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x._localRemnantDropped);
    if (!m) return null;
    S.groundLoot = [];
    m._localRemnantDropped = false;      /* what the respawn branch does */
    /* Held the same way as the first life -- the server's tick heals curHp
       back within the window, and an unheld state is what made the first
       version of this file report a pass it had not earned. */
    let ticks = 0;
    const hold = setInterval(() => {
      ticks++;
      m.curHp = 0; m.alive = true;
      m.statuses = { burn: { until: Date.now() + 5000, tickAt: 0, amount: 1, statusId: 'burn' } };
      m._lastDotDmg = null;
    }, 50);
    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(hold);
    return { ticks, skulls: S.groundLoot.filter((l) => l.skull).length };
  });
  if (!second) {
    rec.skip('a respawned monster drops its own pile again', 'no flagged monster to reuse');
  } else {
    rec.ok('a respawned monster drops its own pile again (the guard is per-life)',
      second.skulls === 1, second);
  }

  await P.ctx.close().catch(() => {});
}
