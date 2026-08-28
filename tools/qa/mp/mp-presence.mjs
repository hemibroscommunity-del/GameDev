/* Presence: seeing each other, losing each other, and coming back as the SAME
 * person.
 *
 * Everything else in this suite is built on top of "A can see B", so it is
 * worth asserting directly rather than as a side effect.  Three properties:
 *
 *  - the peer entry carries what the game draws (name, level, position), not
 *    just an id — a roster of empty objects would still satisfy "A sees B"
 *  - a disconnect removes the peer, via player_leave or the 10s ghost sweep;
 *    a frozen ghost standing in town forever is a bug this repo has hit before
 *  - reconnecting on the same browser profile returns the SAME bp_ id, which
 *    is the whole point of the silent-passphrase identity: friends lists,
 *    clan rosters and offline mail all key off it surviving a reload
 */
import * as H from './harness.mjs';

const roster = (P) => H.readState(P, (S) => {
  const o = S.others || {};
  return Object.keys(o).map((k) => ({
    id: k, name: o[k].name, lv: o[k].rpgLv,
    hasPos: typeof o[k].x === 'number' && typeof o[k].y === 'number',
  }));
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Wanderer' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  rec.ok('the two players get distinct identities', aId !== bId, { aId, bId });

  const ra = await roster(A), rb = await roster(B);
  rec.ok('the peer entry carries a name', ra.length === 1 && ra[0].name === 'Wanderer', ra);
  rec.ok('the peer entry carries a position', ra.length === 1 && ra[0].hasPos, ra);
  rec.ok('presence is mutual', rb.length === 1 && rb[0].id === aId, rb);

  /* v2.3.2078: this read `S.playerCount`, which exists nowhere in src/ — the
     worker's `player_count` is written onto `S._playerCount` (BroTown.jsx
     1705, and ChatBubble reads it there).  So `count` was null on every run
     and the `count == null || ...` escape hatch made the assertion vacuous:
     it would have passed with the room reporting nobody.  Read the real
     field, and WAIT for it, because the count arrives on its own broadcast
     rather than with the join. */
  const count = await H.waitFor(A, (S) => S._playerCount,
    (n) => typeof n === 'number' && n >= 2,
    { timeout: 20000, label: 'the room counts both players' }).catch(() => null);
  rec.ok('the room reports both players', typeof count === 'number' && count >= 2,
    { count, raw: await H.readState(A, (S) => S._playerCount) });

  /* ── disconnect: close the PAGE but keep the browser profile ── */
  await B.page.close();
  const dropped = await H.waitFor(A, (S) => Object.keys(S.others || {}).length,
    (n) => n === 0, { timeout: 25000, label: 'B disappears' }).then(() => true).catch(() => false);
  rec.ok('a disconnected player is removed from the roster', dropped, await roster(A));

  /* ── reconnecting on the SAME profile must be the SAME person ──
     Identity is a silent passphrase in localStorage, and localStorage belongs
     to the browser context — so reopening a page in B's existing context is
     exactly "the player came back".  If this ever returns a new bp_ id, every
     friends list, clan roster and piece of offline mail keyed to the old one
     is orphaned, silently. */
  const B2 = { ctx: B.ctx, name: B.name, logs: B.logs, page: await B.ctx.newPage() };
  await B2.page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  await B2.page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
  const backIn = await B2.page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId && S.currentZone);
  }, null, { timeout: 120000, polling: 500 }).then(() => true).catch(() => false);
  rec.ok('a returning player gets back into the world', backIn);

  const b2Id = backIn ? await H.readState(B2, (S) => S.myId).catch(() => null) : null;
  rec.ok('a returning player keeps the same identity', b2Id === bId, { bId, b2Id });

  /* Neither side is dirty right after a rejoin, and the tick only broadcasts
     dirty players — so both have to move before they can see each other.  A
     real player always does; a scripted one has to be told to. */
  const seenAgain = await H.waitMutualSight(A, B2, 30000).then(() => true).catch(() => false);
  rec.ok('a rejoining player becomes visible again', seenAgain, await roster(A));

  await A.ctx.close(); await B.ctx.close();
}
