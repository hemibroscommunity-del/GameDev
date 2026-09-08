/* ═══ DOES DYING COST GOLD, AND DOES THE HUD AGREE WITH THE WORKER? (v2.3.2343) ═══
 *
 * The worker owns coins.  Its _handlePlayerDeath never touches ps.coins, so a
 * death charges nothing server-side -- but the client's player_died handler
 * used to subtract 10% locally and print a '-NG' popup anyway.  Under
 * protocol v2 an UNCHANGED field is never re-sent, so nothing corrected it:
 * the HUD under-reported gold until the next coin change, and then the "lost"
 * gold silently came back.  The bank panel, meanwhile, promised the loss.
 *
 * So this measures the one thing that can tell prediction from truth: the
 * client's coin count the moment it has processed the death, against what it
 * held before and against the worker's own number for the same player.  If
 * the three disagree, someone is predicting a charge nobody makes.
 *
 * ── THE DEATH IS REAL ──
 * `S._dying` in a worker-owned zone is set by exactly one thing: the
 * `player_died` message (wsClient.js).  Every local death path (BroTown's
 * watchdog, monsterCombat, gameEvents) is gated on `!S._serverMonsters`, so
 * in a spoke zone the only way onto the floor is a monster the WORKER runs
 * taking the last point of HP the WORKER tracks.  The scenario therefore
 * walks out to the first spoke (mp-moncue's route), stands on the nearest
 * monster, and waits.  Nothing is forged and no privileged event is faked; a
 * level-1 character standing still on a monster dies on its own.
 *
 * ── AND THE RECOVERY IS READ TWICE ──
 * Immediately after the death, from the client and from /api/admin/player
 * (the worker's live ps.coins), and again after a full rejoin (page reload,
 * same identity), which is the one message guaranteed to carry every field.
 * The pre-fix code passes the rejoin check and fails the immediate one --
 * which IS the bug: the gold "comes back", it was never gone.
 *
 * TRAPS §21 applies in spirit: this counts coins, not pixels, and the control
 * is the worker's number for the same player at the same moment.
 */
import * as H from './harness.mjs';

const TILE = 32;
const SEED_GOLD = 500;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* The client's coin count and death flags, in one read so they cannot drift
   apart between two round trips. */
const snap = (P) => H.readState(P, (S) => ({
  coins: S.rpg ? S.rpg.coins : null,
  hp: S.rpg ? S.rpg.hp : null,
  dying: !!S._dying,
  zone: S.currentZone,
  serverMonsters: !!S._serverMonsters,
}));

/* Stand on the nearest living monster the worker is running, re-standing
   every beat because it moves; return once the client has processed a death
   or the clock runs out. */
async function standOnMonstersUntilDead(P, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return { dying: false, near: 0 };
      if (S._dying) return { dying: true };
      const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
      let best = null, bd = Infinity;
      for (const m of live) {
        const d = Math.hypot((m.x || 0) - S.player.x, (m.y || 0) - S.player.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) { S.player.x = (best.x || 0) + 10; S.player.y = best.y || 0; }
      return { dying: false, near: live.length, hp: S.rpg && S.rpg.hp };
    }).catch(() => ({ dying: false, near: 0 }));
    if (r.dying) return true;
    await P.page.waitForTimeout(300);
  }
  return false;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Miser', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const pid = await H.readState(P, (S) => S.myId);
  rec.ok('the player has an id to seed against (guard)', !!pid, { pid });
  if (!pid) { await P.ctx.close().catch(() => {}); return; }

  /* ── seed gold through the operator surface, and wait for the ECHO ──
     The grant lands in ps.coins on the worker and reaches the client via
     player_state; asserting on the echo (not the HTTP reply) is what makes
     the "before" number a number the client actually holds. */
  const g = await H.grant(wsPort, pid, 'gold', { amount: SEED_GOLD }).catch(() => null);
  rec.ok('the worker accepted the gold grant (guard)', !!(g && g.ok), g);
  const seeded = await H.waitFor(P, (S) => (S.rpg ? S.rpg.coins : null),
    (c) => typeof c === 'number' && c >= SEED_GOLD, { timeout: 15000, label: 'gold echo' })
    .then(() => true).catch(() => false);
  const before = await snap(P);
  rec.ok('the client holds the seeded gold before dying (guard)',
    seeded && before.coins >= SEED_GOLD, before);
  if (!seeded) { await P.ctx.close().catch(() => {}); return; }

  /* ── out to a spoke zone the worker runs monsters in (mp-moncue's route) ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('a death can be induced in a combat zone', 'no exit tables');
    await P.ctx.close().catch(() => {}); return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2500);

  const arrived = await snap(P);
  rec.ok('we are in a zone the WORKER owns the monsters of (guard)',
    arrived.serverMonsters === true && arrived.zone !== 'town', arrived);
  if (!arrived.serverMonsters) { await P.ctx.close().catch(() => {}); return; }
  /* The walk out cannot have changed the purse; if it did, the "before"
     number is re-read here so the death is measured against the right one. */
  const preDeath = arrived.coins;
  rec.ok('the purse is unchanged by the walk out (guard)', preDeath === before.coins,
    { before: before.coins, arrived: preDeath });

  /* ── die, for real ── */
  const died = await standOnMonstersUntilDead(P, 90000);
  const dead = await snap(P);
  rec.ok('a worker-run monster killed the player (guard: the death is the '
    + "worker's player_died, not a local path)", died && dead.dying === true, dead);
  if (!died) { await P.ctx.close().catch(() => {}); return; }

  /* ═══ THE ASSERTION ═══
     The client has just run its player_died handler.  The worker charged
     nothing, so the number on screen must still be the number from before. */
  const live = await H.adminPlayer(wsPort, pid).catch(() => ({}));
  const serverCoins = live && live.live ? live.live.coins : null;
  console.log('    coins: before=' + preDeath + ' clientAfterDeath=' + dead.coins
    + ' worker=' + serverCoins);
  rec.ok('dying does not change the coin count the HUD shows',
    dead.coins === preDeath, { before: preDeath, after: dead.coins });
  rec.ok("...and the client's count after death equals the worker's",
    typeof serverCoins === 'number' && dead.coins === serverCoins,
    { client: dead.coins, worker: serverCoins });

  /* ── the next FULL player_state: a rejoin on the same identity ──
     A reload keeps the bp_ identity (localStorage) and the join handshake
     answers with every field, unchanged or not.  What it carries is what the
     worker has held all along. */
  await H.waitFor(P, (S) => !!S._dying, (d) => d === false, { timeout: 20000, label: 'respawn' })
    .catch(() => {});
  await P.page.reload().catch(() => {});
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2500);
  const rejoined = await snap(P);
  rec.ok('the full player_state after a rejoin carries the same gold as before '
    + 'the death (the worker never charged it)', rejoined.coins === preDeath,
    { before: preDeath, rejoined: rejoined.coins });

  await P.ctx.close().catch(() => {});
}
