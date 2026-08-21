/* DOES THE HAND-IN LOOP? (v2.3.1828)
 *
 * Owner: "The quest complete loop is broken.  It says I finished the quest
 * and rewards me."
 *
 * Reproduces LIVE PLAY rather than the questline's tidy walk: the player is
 * standing right in front of him and does NOT walk away between steps, which
 * is the case the walk-away in mp-questline deliberately avoids because it
 * was papering over a stale card (v2.3.1706b).  So this one stands still and
 * records everything for a while after the hand-in — every banner, every
 * panel that appears, and the WORKER's coins and quest status — because "it
 * rewards me again" is a claim about payment, and a client-side banner is not
 * evidence of payment either way.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Looper', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);
  const myId = await H.readState(P, (S) => S.myId);

  /* Record every quest banner as it is inserted — they live ~2-4s, so
     sampling would miss a repeat. */
  await P.page.evaluate(() => {
    window.__qb = [];
    const seen = new WeakSet();
    const scan = () => {
      document.querySelectorAll('.bt-quest-banner').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        window.__qb.push({
          kind: el.getAttribute('data-quest-banner'),
          text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
          t: Date.now(),
        });
      });
    };
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
  });

  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });

  const srv = () => H.adminPlayer(wsPort, myId)
    .then((a) => (a && a.rpg) || null).catch(() => null);

  /* ── accept tut_1 ── */
  await place(420, 0); await P.page.waitForTimeout(600);
  await H.closeNpcDialogue(P);
  await place(0, 34);  await P.page.waitForTimeout(1400);
  await H.advanceNpcDialogue(P);
  rec.ok('the first quest could be accepted (guard)', await H.confirmQuestOffer(P));
  await P.page.waitForTimeout(1800);

  /* ═══ THE BUG THE OWNER IS DESCRIBING ═══
     "It says I finished the quest and rewards me."
     The panel deliberately STAYS OPEN after an accept (v2.3.1713 — he
     answers you instead of the screen going blank).  But QuestPanel's
     `stage` is useState('talk') with no reset, so after you tap Accept it is
     still on 'act' — and with the quest now `active` rather than
     `available`, the act stage renders the REWARD face of the offer panel:
     "Quest Complete", the completion items, and a Claim Reward button, for a
     quest you have not started.
     Every other scenario missed it by CLOSING the panel after accepting. */
  const rightAfterAccept = await P.page.evaluate(() => {
    const p = document.querySelector('.bt-qoffer');
    const d = document.querySelector('.bt-npcdlg');
    return {
      offer: p ? (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160) : null,
      dialogue: d ? (d.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100) : null,
    };
  });
  rec.ok('accepting does NOT immediately claim to have finished the quest',
    !rightAfterAccept.offer || !/Quest Complete|Claim Reward/i.test(rightAfterAccept.offer),
    rightAfterAccept);

  /* ── finish it, WITHOUT walking away ── */
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(2000);

  /* The panel is still open on his NEXT offer, so close it once and let the
     proximity opener bring up the READY quest — that is what happens in play
     when you walk back in with the items. */
  await H.closeNpcDialogue(P);
  await place(420, 0); await P.page.waitForTimeout(600);
  await place(0, 34);  await P.page.waitForTimeout(1500);

  const landed = await H.advanceNpcDialogue(P);
  rec.ok('his lines lead to the claim panel (guard)', landed === 'offer', { landed });
  await H.chooseQuestSkill(P, 'Melee');
  const before = await srv();
  rec.ok('the claim could be pressed (guard)', await H.confirmQuestOffer(P));

  /* ── now STAND STILL and watch ── */
  await P.page.waitForTimeout(9000);
  const after = await srv();
  const banners = await P.page.evaluate(() => window.__qb || []);
  const onScreen = await P.page.evaluate(() => {
    const p = document.querySelector('.bt-qoffer');
    return {
      panel: p ? (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 140) : null,
      dlg: !!document.querySelector('.bt-npcdlg'),
    };
  });

  const completed = banners.filter((b) => /complete/i.test(b.kind || '') || /COMPLETED/i.test(b.text));
  const rewards = banners.filter((b) => /reward/i.test(b.kind || '') || /REWARD/i.test(b.text));

  rec.ok('the quest is turned in on the WORKER exactly once',
    !!after && (after._quests || {}).tut_1 === 'turnedIn',
    { quests: after && after._quests });
  rec.ok('the completion banner fires ONCE, not on a loop',
    completed.length === 1, { count: completed.length, banners: banners.map((b) => b.kind + ':' + b.text) });
  rec.ok('the reward banner fires ONCE, not on a loop',
    rewards.length <= 1, { count: rewards.length, banners: banners.map((b) => b.kind + ':' + b.text) });
  /* The gold is paid once.  Read from the STORED blob: the client adds it
     optimistically, so its own number would say "paid" either way. */
  rec.ok('the gold is paid exactly once',
    !!before && !!after && (after.coins - before.coins) === 25,
    { before: before && before.coins, after: after && after.coins,
      delta: after && before && (after.coins - before.coins) });
  rec.ok('...and what is on screen afterwards is his NEXT quest, not the one just paid',
    !onScreen.panel || !/Claim Reward/i.test(onScreen.panel), onScreen);

  /* ── VARIANT B: double-tap the claim.  A finger on a phone bounces, and
     the panel stays open through the hand-in (v2.3.1713), so the button is
     still under the thumb when the second tap lands. ── */
  await H.closeNpcDialogue(P);
  await place(420, 0); await P.page.waitForTimeout(600);
  await place(0, 34);  await P.page.waitForTimeout(1500);
  await H.advanceNpcDialogue(P);
  await H.confirmQuestOffer(P);          // accept tut_2
  await P.page.waitForTimeout(1600);
  await H.grant(wsPort, myId, 'item', { invKey: 'slime-remnants', count: 6 });
  await P.page.waitForTimeout(1800);
  await H.closeNpcDialogue(P);
  await place(420, 0); await P.page.waitForTimeout(600);
  await place(0, 34);  await P.page.waitForTimeout(1500);
  await H.advanceNpcDialogue(P);
  await H.chooseQuestSkill(P, 'Melee');
  const b2 = await srv();
  await P.page.evaluate(() => {
    const b = document.querySelector('[data-tut="qoffer-confirm"]');
    if (b) { b.click(); b.click(); b.click(); }   // bounce
  });
  await P.page.waitForTimeout(4000);
  const a2 = await srv();
  /* READ the expected payout from the game's own quest table rather than
     typing a number: the first version of this assertion guessed 25 when
     tut_2 actually pays 60, and reported a correct single payment as a
     triple one — a test inventing a bug. */
  const tut2Gold = await P.page.evaluate(() => {
    const f = window._gameFns;
    const q = f && f.QUEST_CHAINS && f.QUEST_CHAINS.tut_2;
    return (q && q.reward && q.reward.gold) || null;
  });
  rec.ok('the expected tut_2 payout could be read from the quest table (guard)',
    typeof tut2Gold === 'number' && tut2Gold > 0, { tut2Gold });
  rec.ok('a bounced tap on Claim pays once, not three times',
    !!b2 && !!a2 && (a2.coins - b2.coins) === tut2Gold,
    { before: b2 && b2.coins, after: a2 && a2.coins,
      delta: a2 && b2 && (a2.coins - b2.coins), expected: tut2Gold,
      questsBefore: b2 && b2._quests, questsAfter: a2 && a2._quests });

  /* ── VARIANT C: accept a quest you can ALREADY complete.  The owner is
     starting fresh characters, and remnants carry no per-quest tag — so
     arriving at a step already holding its items is ordinary, not exotic. ── */
  await H.closeNpcDialogue(P);
  await H.grant(wsPort, myId, 'item', { invKey: 'skeleton-remnants', count: 5 });
  await P.page.waitForTimeout(1500);
  await place(420, 0); await P.page.waitForTimeout(600);
  await place(0, 34);  await P.page.waitForTimeout(1500);
  const landC = await H.advanceNpcDialogue(P);
  const panelC = await P.page.evaluate(() => {
    const p = document.querySelector('.bt-qoffer');
    return p ? (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160) : null;
  });
  rec.ok('a quest you can already finish is still OFFERED first, not paid on sight',
    landC === 'offer' && !!panelC && /Accept Quest/i.test(panelC),
    { landC, panelC });

  await P.ctx.close().catch(() => {});
}
