/* WALKING UP TO CLAIM A FINISHED QUEST OPENS THE CLAIM (v2.3.1884).
 *
 * Owner: "Walking up to claim the quest reward after completing 'into the
 * blue' doesn't pop up automatically when walking close to mayor bro.  Make
 * it so that it does."
 *
 * Three different things could have been meant, so all three were measured
 * before anything was changed, and only one of them was broken:
 *
 *   A. approaching him with a claimable reward   — already worked
 *   B. the same, after a zone round trip         — already worked
 *   C. the reward becoming claimable while you   — BROKEN
 *      are already standing next to him
 *
 * (C) is what this fixes, and it is a fair reading of the report: the
 * proximity latch (v2.3.1701) held the NPC and nothing else, so once it had
 * shown you anything about Mayor Bro it stayed armed until you left a 110px
 * radius.  "You have already seen this NPC" is not the same claim as "you have
 * already seen this NEWS".
 *
 * WHAT IS DELIBERATELY NOT ASSERTED: that dismissing a claimable quest and
 * standing still brings it back.  It does not, on purpose — that is the
 * frame-after-frame re-open the latch exists to prevent (v2.3.1701: "the panel
 * becomes a trap rather than a convenience"), and mp-questprox asserts it
 * directly.  Recovering a dismissed panel is a step out and back, which
 * v2.3.1884 made cheap by releasing at 90px instead of 110 — that is (D).
 *
 * Quest state is pinned every frame rather than set once: S.rpg is replaced
 * wholesale on every server delta, so a single write is gone within a tick.
 */
import * as H from './harness.mjs';

const pin = (quests, items) => `(() => {
  const q = ${JSON.stringify(quests)}, it = ${JSON.stringify(items)};
  const set = () => {
    const s = window._gameState.current;
    if (s && s.rpg) {
      s.rpg._quests = Object.assign({}, s.rpg._quests, q);
      s.rpg.inventory = Object.assign({}, s.rpg.inventory, it);
    }
    window.__qRaf = requestAnimationFrame(set);
  };
  try { cancelAnimationFrame(window.__qRaf); } catch (e) {}
  set();
})()`;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Claimer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return { dist: Math.round(Math.hypot(ox, oy)) };
  }, { ox: dx, oy: dy });
  const open = () => H.npcDialogueOpen(P);
  const setState = (quests, items) =>
    P.page.evaluate((src) => { eval(src); }, pin(quests, items));   // eslint-disable-line no-eval
  const probe = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const npc = (S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    return {
      quests: S.rpg && S.rpg._quests,
      remnants: (S.rpg && S.rpg.inventory && S.rpg.inventory['slime-remnants']) || 0,
      latch: !!S._npcProxLatch,
      latchReady: !!(S._npcProxLatch && S._npcProxLatch.ready),
      dist: npc && S.player ? Math.round(Math.hypot(npc.x - S.player.x, npc.y - S.player.y)) : null,
    };
  });

  /* GUARD: the feature under test is an APPROACH opening a dialogue, so prove
     an approach opens one at all before asserting about which one. */
  await place(420, 0);
  await H.closeNpcDialogue(P);
  await P.page.waitForTimeout(600);
  rec.ok('standing well away from him, nothing is open (guard)', !(await open()));
  await place(0, 34);
  await P.page.waitForTimeout(1000);
  rec.ok('a fresh character walking up gets his dialogue (guard)', await open(), await probe());
  await H.closeNpcDialogue(P);

  /* ── A. the reported case: approach with a finished "Into the Blue" ── */
  await place(420, 0);
  await P.page.waitForTimeout(700);
  await setState({ tut_1: 'turnedIn', tut_2: 'active' }, { 'slime-remnants': 6 });
  await P.page.waitForTimeout(600);
  await place(0, 34);
  await P.page.waitForTimeout(1200);
  rec.ok('A: walking up with the quest finished opens the claim', await open(), await probe());

  /* ── B. the same after a zone round trip, which the real flow does ── */
  await H.closeNpcDialogue(P);
  await place(420, 0);
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'verdant'; S.npcs = null;      /* what zoneTransitions does */
  });
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => { window._gameState.current.currentZone = 'town'; });
  await P.page.waitForTimeout(900);
  await place(0, 34);
  await P.page.waitForTimeout(1200);
  rec.ok('B: ...and still does after leaving town and coming back', await open(), await probe());

  /* ── C. THE FIX: it becomes claimable while you stand there ──
     Approach with the objective UNfinished (he gives the progress line),
     dismiss it, stay put, then finish the objective.  Before v2.3.1884 the
     latch was armed on the NPC and nothing brought the claim back. */
  await H.closeNpcDialogue(P);
  await place(420, 0);
  await P.page.waitForTimeout(600);
  await setState({ tut_1: 'turnedIn', tut_2: 'active' }, { 'slime-remnants': 2 });
  await P.page.waitForTimeout(600);
  await place(0, 34);
  await P.page.waitForTimeout(1100);
  rec.ok('C: he talks when you walk up mid-quest (guard for the step below)',
    await open(), await probe());
  await H.closeNpcDialogue(P);
  await P.page.waitForTimeout(900);
  rec.ok('C: ...and stays shut while nothing has changed (the latch still holds)',
    !(await open()), await probe());
  await setState({ tut_1: 'turnedIn', tut_2: 'active' }, { 'slime-remnants': 6 });
  await P.page.waitForTimeout(1200);
  rec.ok('C: THE FIX — finishing it while stood next to him opens the claim, unmoved',
    await open(), await probe());

  /* ── D. a dismissed panel is a short step away, not a hike ──
     v2.3.1886 note: this used to step to a hard-coded 100px, chosen because
     it cleared the release radius of the day.  That is the same mistake the
     bug it now sits beside was made of — a distance written down in one place
     and left behind when the radius moved (NPC_PROX_OPEN stayed 56 for the
     185 versions after _nearNpc went to 90).  So it no longer names a
     distance: it walks outward until the latch actually lets go, and asserts
     that the distance it found is a step rather than a trek.  That survives
     the next radius change, and it still fails loudly if recovery ever needs
     crossing the town. */
  await H.closeNpcDialogue(P);
  await P.page.waitForTimeout(700);
  let released = null;
  for (const d of [100, 120, 130, 140, 160, 200, 260]) {
    await place(d, 0);
    await P.page.waitForTimeout(450);
    const stillLatched = await P.page.evaluate(() => !!(window._gameState.current._npcProxLatch));
    if (!stillLatched) { released = d; break; }
  }
  rec.ok('D: the latch does let go when you step away at all', released !== null,
    { released, note: 'never released out to 260px' });
  /* ~5 tiles.  Beyond this "walk away and come back" stops being a step and
     starts being the hike that made the owner report it in the first place. */
  rec.ok('D: ...within a short step, not a hike across town',
    released !== null && released <= 160, { releasedAt: released, budget: 160 });
  await place(0, 34);
  await P.page.waitForTimeout(1100);
  rec.ok('D: ...and returning re-opens the claim', await open(), await probe());

  await P.page.evaluate(() => { try { cancelAnimationFrame(window.__qRaf); } catch (e) {} });
  await P.ctx.close().catch(() => {});
}
