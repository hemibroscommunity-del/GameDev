/* Element Burst + the flat special-attack mana cost, through a REAL browser
 * against a REAL worker (v2.3.1734; server core server/src/burst.js; plan
 * docs/COMBAT-OVERHAUL-PLAN.md PR 6).
 *
 * burst.test.mjs already pins the math and all four gates against a mocked
 * DO.  What only THIS harness can see is the JOINT, and the joint is where
 * this repo's most expensive class of bug lives:
 *
 *  1. THE SHIM ALLOWLIST (TRAPS #18).  `channelShim.send` in wsClient.js is
 *     an ALLOWLIST, not a transport.  A client→server type with no line
 *     there never leaves the browser, and the failure is silent in BOTH
 *     directions — the client behaves as if it sent, the worker as if
 *     nobody spoke.  It ate `extraction_start` for ~1400 versions and
 *     `firemaking_request` outright.  A unit test cannot see it: server
 *     suites push messages straight down a socket and never touch the shim.
 *
 *  2. THE MANA COST IS THE WORKER'S.  The special's cost moved from
 *     floor(maxMana/5) to a flat 25.  The client predicts the deduction and
 *     the worker settles it, so a drift between the two is invisible on
 *     screen (the echo just quietly corrects the bar) and shows up only as
 *     "the charge pie lied about how many casts I had".  Read from the
 *     WORKER's stored blob, never the browser's copy.
 *
 * NOT covered here, on purpose: a successful nova.  The ability unlocks at
 * character level 6 and a fresh character is level 3, with no operator
 * endpoint that sets a trained level — reaching 6 honestly means ~2000
 * points of damage dealt through the browser, which would make this a
 * five-minute flake generator.  The resolution half (radius, status,
 * damage, XP, spend-once) is pinned by burst.test.mjs against real monsters
 * in a real zone; what is proved HERE is that a browser's cast reaches the
 * worker's handler at all.
 */
import * as H from './harness.mjs';
import { PROG3 } from '../../../src/data/prog3.js';

/* The WORKER's live pool, not the browser's.  The client predicts every
   ability spend and the worker settles it, so reading the browser would
   pass whether or not the two agree — which is the entire question. */
const srvMana = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  const l = a && a.live;
  if (!l || typeof l.mana !== 'number' || typeof l.maxMana !== 'number') return null;
  return { mana: l.mana, maxMana: l.maxMana };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Emberling', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await H.instrumentWire(P);

  /* ── the deploy-order flag ── */
  const caps = await H.readState(P, (S) => ({
    elemBurst: !!(S._serverCaps && S._serverCaps.elemBurst),
    prog3: !!(S._serverCaps && S._serverCaps.prog3),
  }));
  rec.ok('the worker advertises caps.elemBurst', caps.elemBurst, caps);

  /* ═══ 1. THE FLAT SPECIAL COST, SETTLED BY THE WORKER ═══ */
  /* Arm the character: fresh characters start with every slot empty
     (v2.3.1676), and the mayor's first quest hands out Bro's Sword. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => (S.rpg?.weaponStash || []).map((w) => w && w.type),
    (t) => t.includes('greatsword'), { timeout: 20000, label: 'the quest sword reaches the stash' })
    .catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return;
    const idx = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (idx >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
  });
  await P.page.waitForTimeout(2000);
  rec.ok('the starter sword is equipped, so a special is possible',
    (await H.readState(P, (S) => S.rpg?.weapon?.type || null)) === 'greatsword');

  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg) { S.rpg.mana = S.rpg.maxMana || 100; S._lastSwipe = 0; S._tutorialStep = 0; }
  });
  await P.page.waitForTimeout(900);   /* let the topped-up bar settle server-side */
  const before = await srvMana(wsPort, myId);
  rec.ok('the worker reports a full mana bar to start from',
    !!before && before.mana === before.maxMana, before);

  /* Sample the worker FAST and take the LOW-WATER mark, because the regen
     tick is racing us: the character is in town, where the hub top-off pays
     10% of maxMana every ~670 ms (v2.3.1414), so a single read 900 ms after
     the cast measures "cost minus one or two refunds" and lands on an
     arbitrary number.  (It did: the first version of this assertion read 12
     and looked like a real cost bug.)  The minimum across the window is the
     post-spend value. */
  await H.callFn(P, 'specialAttack').catch(() => {});
  let low = before ? before.mana : null;
  for (let i = 0; i < 14; i++) {
    const s = await srvMana(wsPort, myId);
    if (s && (low == null || s.mana < low)) low = s.mana;
    await P.page.waitForTimeout(45);
  }
  const after = low != null ? { mana: low, maxMana: before && before.maxMana } : null;
  const spent = before && after ? before.mana - after.mana : null;
  /* THE REGRESSION.  Under floor(maxMana/5) this reads 20 at the fresh
     character's 102 max — and, crucially, it read a DIFFERENT number at
     every Magic level, which is exactly why mana could never progress. */
  rec.ok(`a special costs the FLAT ${PROG3.SPECIAL_MANA_COST} on the worker (was a fraction of max)`,
    spent === PROG3.SPECIAL_MANA_COST, { before, after, spent, expected: PROG3.SPECIAL_MANA_COST });

  /* THE HUD MUST AGREE WITH THE WORKER.  The charge pie's centre number is
     the client's claim about how many casts you are carrying, derived from
     the same cost constant.  With a full 102-mana bar and a flat 25 that is
     4; the old 5-segment pie said 5 at every Magic level in the game, which
     is the readout half of the same bug. */
  /* THE CLIENT'S PREDICTION, measured SYNCHRONOUSLY.  The special deducts
     its cost locally for a snappy bar and the worker settles the real one;
     if the two disagree the bar visibly snaps back on every cast, and the
     charge pie counts casts the worker will not fund.
     Both reads happen inside ONE page.evaluate, so nothing — not the regen
     tick, not the player_state echo, not a React frame — can run between
     them.  (An earlier version of this check pinned S.rpg.mana on a 16 ms
     interval and read the pie's DOM text instead; the echo raced the pin
     and the assertion flaked, which is exactly the class of test this repo
     does not need more of.) */
  const predicted = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg || !window._gameFns || !window._gameFns.specialAttack) return null;
    S.rpg.mana = S.rpg.maxMana || 100;
    S._lastSwipe = 0;
    S._tutorialStep = 0;
    const was = S.rpg.mana;
    window._gameFns.specialAttack();
    return { was, now: S.rpg.mana, maxMana: S.rpg.maxMana };
  });
  rec.ok(`the CLIENT predicts the same flat ${PROG3.SPECIAL_MANA_COST} (it predicted floor(maxMana/5) before)`,
    !!predicted && predicted.was - predicted.now === PROG3.SPECIAL_MANA_COST, predicted);

  /* ═══ 2. element_burst REACHES THE WORKER ═══ */
  /* Sent RAW rather than through elementBurst(), deliberately: at character
     level 3 the client's own display gate refuses (correctly) and nothing
     would go on the wire, so testing the transport would be impossible from
     the honest path.  This asks exactly one question — does a message of
     this type survive channelShim.send and land in the worker's switch. */
  /* First: the honest path REFUSES, out loud.  A level-3 character pressing
     G must get a reason, not silence (the v2.3.1716 lesson) — and must not
     put anything on the wire. */
  const wireBefore = await H.wireCounts(P);
  await H.callFn(P, 'elementBurst').catch(() => {});
  await P.page.waitForTimeout(400);
  const wireAfterHonest = await H.wireCounts(P);
  rec.ok('an ineligible cast is refused by the CLIENT and sends nothing',
    (wireAfterHonest.element_burst || 0) === (wireBefore.element_burst || 0),
    { before: wireBefore.element_burst || 0, after: wireAfterHonest.element_burst || 0 });
  rec.ok('...and says why, on screen',
    await H.readState(P, (S) => (S.dmgNumbers || []).some((d) => /Element Burst/i.test(String(d.text || d.txt || '')))),
    await H.readState(P, (S) => (S.dmgNumbers || []).map((d) => d.text || d.txt)));

  const manaPreBurst = await srvMana(wsPort, myId);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'element_burst', payload: {} });
  });
  await P.page.waitForTimeout(900);
  const wire = await H.wireCounts(P);
  rec.ok('element_burst has a channelShim passthrough (TRAPS #18 — without it, nothing leaves the browser)',
    (wire.element_burst || 0) >= 1, wire);

  /* The worker heard it and REFUSED it: a level-3 character with a plain
     starter sword fails both the level gate and the enchant gate, so its
     mana must be untouched.  A worker that had accepted this would have
     spent BURST_MANA_COST. */
  const manaPostBurst = await srvMana(wsPort, myId);
  rec.ok('...and the worker refuses an ineligible cast without spending mana',
    manaPreBurst && manaPostBurst && manaPostBurst.mana >= manaPreBurst.mana,
    { pre: manaPreBurst, post: manaPostBurst });

  /* ═══ 3. THE BUTTON HIDES ITSELF ═══ */
  /* It renders nothing until the character is level 6 with an enchanted
     weapon in hand, which is the whole reason it can be mounted
     unconditionally in GameApp. */
  const gate = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return {
      level: (S && S.rpg && S.rpg.level) || 0,
      btn: !!document.querySelector('.bt-burst-btn'),
    };
  });
  rec.ok('a level-3 character sees no Element Burst button',
    gate.level < PROG3.BURST_MIN_CHAR_LEVEL && gate.btn === false, gate);

  await P.ctx.close().catch(() => {});
}
