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

  /* ══ E. v2.3.2289: THE BACKDROP NO LONGER THROWS THE CLAIM AWAY ══
     Owner: "tapping just outside the reward card dismisses a reward you've
     earned."  The card already refuses to give the reward face a "Not now"
     -- its own comment says a not-now there "is a way to lose track of
     payment you are owed" -- and the full-viewport scrim handed that exact
     escape straight back, with a live dismiss band a couple of centimetres
     under the Claim button.

     DRIVEN WITH REAL MOUSE CLICKS AT REAL COORDINATES, never an in-page
     .click(): a synthetic click ignores hit-testing, so it would prove a
     handler exists rather than that a finger landing there does anything.
     That exact miss let v2.3.1827 ship an unclaimable reward. */
  const bandTap = async () => P.page.evaluate(() => {
    const card = document.querySelector('.bt-qoffer, .bt-npcdlg');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const gap = window.innerHeight - r.bottom;
    if (gap < 40) return { tapped: false, gap: Math.round(gap) };
    return { tapped: true, x: Math.round(r.left + r.width / 2),
      y: Math.round(r.bottom + Math.min(gap - 8, 40)), gap: Math.round(gap) };
  });
  const clickBand = async () => {
    const b = await bandTap();
    if (!b || !b.tapped) return b;
    await P.page.mouse.click(b.x, b.y);
    await P.page.waitForTimeout(450);
    return b;
  };

  /* Stand at him with the quest READY, so the claim face is up. */
  await place(0, 34);
  await P.page.waitForTimeout(1200);
  const face = () => P.page.evaluate(() => ({
    qoffer: !!document.querySelector('.bt-qoffer'),
    npcdlg: !!document.querySelector('.bt-npcdlg'),
  }));
  rec.ok('E: the claim screen is up (guard)', await open(), await face());

  /* BOTH FACES, SEPARATELY.  The claim flow is two screens sharing one scrim
     class -- he talks (NpcDialogue), then you claim (QuestOfferPanel) -- and
     the first cut of this test only ever reached the TALK one, so it passed
     against a build with the payout screen's backdrop still live.  Each is
     now asserted where it actually renders. */
  const talkFace = await face();
  rec.ok('E: the talk face is the one on screen first (guard)',
    talkFace.npcdlg === true && talkFace.qoffer === false, talkFace);
  const eBand = await clickBand();
  rec.ok('E: THE HAZARD, talk face — a tap in the scrim below the card no '
    + 'longer throws away a quest you have finished',
    !!eBand && eBand.tapped === true && (await open()), { band: eBand, open: await open(), face: await face() });

  await H.advanceNpcDialogue(P);
  await P.page.waitForTimeout(400);
  const payFace = await face();
  rec.ok('E: ...and advancing reaches the payout card itself (guard)',
    payFace.qoffer === true, payFace);
  const pBand = await clickBand();
  rec.ok('E: THE HAZARD, payout card — the same tap beside Claim Reward does '
    + 'not throw the reward away either',
    !!pBand && pBand.tapped === true && (await open()), { band: pBand, open: await open(), face: await face() });

  /* The deliberate exit still exists, and a REAL click on it works -- an
     inert backdrop with no ✕ would just be a modal you cannot leave. */
  const xBox = await P.page.evaluate(() => {
    const x = document.querySelector('[data-qa="dlg-close"]');
    if (!x) return null;
    const r = x.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
      w: Math.round(r.width), h: Math.round(r.height) };
  });
  rec.ok('E: ...and there is a deliberate ✕ to leave by, at a real touch size',
    !!xBox && xBox.w >= 40 && xBox.h >= 40, xBox);
  if (xBox) {
    await P.page.mouse.click(xBox.x, xBox.y);
    await P.page.waitForTimeout(450);
    /* Standing on him, the proximity opener may bring the claim straight back
       -- that is the v2.3.1884 behaviour step C pins.  What is asserted is
       that the ✕ was REACHABLE and fired, so step away first. */
    await place(420, 0);
    await P.page.waitForTimeout(700);
    rec.ok('E: ...and a real click on it does close the card',
      !(await open()), await probe());
  }

  /* THE SCOPING TWIN: an OFFER has nothing owed, so its backdrop still
     dismisses. Applying the lock to both faces would make an unaccepted
     quest undismissable, which is a different bug. */
  await setState({ tut_1: 'available' }, {});
  await place(0, 34);
  await P.page.waitForTimeout(1300);
  if (await open()) {
    const oBand = await clickBand();
    rec.ok('E: ...while an OFFER still dismisses on a backdrop tap, because '
      + 'nothing is owed yet',
      !!oBand && oBand.tapped === true && !(await open()), { band: oBand, open: await open() });
  } else {
    rec.skip('an offer still dismisses on a backdrop tap', 'offer face did not open');
  }

  await P.page.evaluate(() => { try { cancelAnimationFrame(window.__qRaf); } catch (e) {} });
  await P.ctx.close().catch(() => {});
}
