/* ═══ v2.3.2917: A COOK'S FIRE STAYS LIT ON EVERY SCREEN WHILE THEY COOK ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side so there's no discrepancies."
 *
 * A campfire burns 45 s, but the fire you are cooking over does not go out
 * under the pan: while you cook, its fuse is pushed 15 s ahead (BroTown,
 * v2.3.1431 -- "the minnow isn't getting cooked").  Watchers get your fire
 * from campfire_lit with the 45 s fuse it was lit with, and nothing on their
 * side ever pushed it, so on everybody else's screen you went on cooking over
 * bare ground once the 45 s were up.
 *
 * Two real clients.  B lights a fire through the game's own path (the bag's
 * log tap sets exactly this S._firemaking record) and cooks over it past the
 * 45 s mark; A watches.  Both screens' fires are read off the fire renderer's
 * own probe (__btCampfire): B's own and A's copy of B's must both be burning
 * at 52 s.  Then B stops, and both must go out on the same schedule -- the
 * watcher's copy may not become immortal either.
 *
 *   node tools/qa/mp/run.mjs campfirelife
 */
import * as H from './harness.mjs';

const fireOf = (P, key) => P.page.evaluate((k) => {
  const p = window.__btCampfire ? window.__btCampfire() : null;
  const f = p && p.fires.find((x) => x.key === k);
  return f ? { dying: !!f.dying, flameOn: !!f.flameOn } : null;
}, key);
const burning = (f) => !!(f && !f.dying);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Cook' });
  await H.waitMutualSight(A, B);
  const bId = await H.readState(B, (S) => S.myId);
  const peerKey = 'p:' + bId;
  await B.page.evaluate(() => { const S = window._gameState.current; if (S.player) S.player.x += 90; });
  await B.page.waitForTimeout(700);
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    const now = Date.now();
    S._firemaking = { startedAt: now, doneAt: now + 700, x: S.player.x, y: S.player.y + 6 };
  });
  const lit = await H.waitFor(B, (S) => (S._campfire ? S._campfire.litAt : null), (v) => !!v,
    { timeout: 8000, label: 'the fire is lit' }).catch(() => null);
  let got = false;
  for (let i = 0; i < 30 && !got; i++) {
    got = await A.page.evaluate((id) => !!(window._gameState.current._peerCampfires
      && window._gameState.current._peerCampfires.has(String(id))), bId);
    if (!got) await A.page.waitForTimeout(150);
  }
  rec.ok('the cook lights a fire and the watcher receives it (guard)', !!lit && got, { lit: !!lit, got });
  if (!lit || !got) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* Cook over it, held in the wind-up (mp-cookpeer's way) so it lasts. */
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    const now = Date.now();
    S._extraction = { nodeId: undefined, nodeRef: S._campfire, skill: 'cooking', startedAt: now,
      windowOpensAt: now + 600000, windowClosesAt: now + 603000, status: 'waiting', swipeSamples: [],
      fishKey: 'fish_minnow' };
  });
  const litAt = Date.now();
  const log = [];
  while (Date.now() - litAt < 52000) {
    await A.page.waitForTimeout(4000);
    const own = await fireOf(B, 'self'), peer = await fireOf(A, peerKey);
    const cooking = await B.page.evaluate(() => !!(window._gameState.current._extraction));
    log.push({ s: Math.round((Date.now() - litAt) / 1000), cooking, own: burning(own), watcher: burning(peer) });
  }
  console.log('    while cooking: ' + log.map((r) => `${r.s}s ${r.own ? 'lit' : 'OUT'}/${r.watcher ? 'lit' : 'OUT'}`).join('  '));
  const ownAt52 = await fireOf(B, 'self'), peerAt52 = await fireOf(A, peerKey);
  rec.ok('the cook\'s own fire is still lit at 52 s, cooking the whole time (guard)',
    burning(ownAt52) && log.every((r) => r.cooking), { ownAt52, log });
  rec.ok('...and so is the watcher\'s copy of it (the 45 s fuse is kept up while they cook)', burning(peerAt52), { peerAt52, log });

  /* Stop cooking: both fires now have ~15 s left, and both must go out. */
  await B.page.evaluate(() => { window._gameState.current._extraction = null; });
  await A.page.waitForTimeout(18500);
  const ownEnd = await fireOf(B, 'self'), peerEnd = await fireOf(A, peerKey);
  console.log(`    18.5 s after the cook stops: own ${JSON.stringify(ownEnd)}, watcher ${JSON.stringify(peerEnd)}`);
  rec.ok('when the cooking stops the fire burns down on the cook\'s screen (guard)', !burning(ownEnd), { ownEnd });
  rec.ok('...and on the watcher\'s, on the same schedule (their copy is not left burning forever)', !burning(peerEnd), { peerEnd });
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
