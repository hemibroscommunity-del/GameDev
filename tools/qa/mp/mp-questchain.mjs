/* THE LATER CHAIN STEPS TURN IN BY PROXIMITY TOO (v2.3.1914).
 *
 * Owner: "After completing quest into the blue the quest reward doesn't pop up
 * by proximity to mayor bro. Same proximity turn in quest reward issue with
 * the next quest bro ascendant."
 *
 * mp-questclaim already covers tut_2 and passes, so this walks the WHOLE chain
 * — tut_2, tut_3, tut_4 — asking the same question of each. If one step is
 * broken and its neighbours are not, that asymmetry is the bug; if all three
 * behave, the fault is in how the state is REACHED in real play rather than in
 * the opener, and that is worth knowing too.
 *
 * It also checks what the opened panel actually SAYS. "The dialogue opened" and
 * "the reward is claimable" are different claims, and the owner reported the
 * second one — a panel that opens on his progress line is still a failure.
 */
import * as H from './harness.mjs';

const STEPS = [
  { id: 'tut_2', title: 'Into the Blue',  key: 'slime-remnants',       n: 6, prior: { tut_1: 'turnedIn' } },
  { id: 'tut_3', title: 'Bad Wind',       key: 'skeleton-remnants',    n: 5, prior: { tut_1: 'turnedIn', tut_2: 'turnedIn' } },
  { id: 'tut_4', title: 'Bro Ascendant',  key: 'fire-goblin-remnants', n: 6, prior: { tut_1: 'turnedIn', tut_2: 'turnedIn', tut_3: 'turnedIn' } },
];

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
  const P = await H.newPlayer(browser, { name: 'Chainer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });
  const setState = (quests, items) =>
    P.page.evaluate((src) => { eval(src); }, pin(quests, items));   // eslint-disable-line no-eval
  const panelText = () => P.page.evaluate(() => {
    const p = document.querySelector('.bt-qoffer') || document.querySelector('.bt-npcdlg');
    return p ? (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  });

  for (const st of STEPS) {
    /* Walk away first so the latch lets go, then approach fresh — this is the
       "came back from the zone and walked up to him" case the owner describes. */
    await setState(Object.assign({}, st.prior, { [st.id]: 'active' }), { [st.key]: st.n });
    await place(420, 0);
    await H.closeNpcDialogue(P);
    await P.page.waitForTimeout(700);
    const shutAway = await H.npcDialogueOpen(P);
    rec.ok(`${st.id} (${st.title}): nothing open while stood away (guard)`, !shutAway);

    await place(0, 34);
    await P.page.waitForTimeout(1400);
    const opened = await H.npcDialogueOpen(P);
    const txt = await panelText();
    console.log(`    ${st.id} panel: ${JSON.stringify(txt)}`);
    rec.ok(`${st.id} (${st.title}): walking up with it FINISHED opens his dialogue`,
      opened, { opened, txt });
    /* The claim itself, not merely a panel. QuestPanel offers 'Claim reward'
       only when status is active AND quest.check passes, so this is the thing
       the owner is actually reporting missing. */
    rec.ok(`${st.id} (${st.title}): ...and it offers the REWARD, not his progress line`,
      !!txt && /claim/i.test(txt), { txt });
    /* THE MECHANISM, pinned without new instrumentation. BroTown decides
       whether the claim is ready with check(S.rpg) — the LIVE object — and
       stores that verdict on the latch it arms when it opens the panel.
       QuestPanel then decides what to DRAW with check(rpgState) — the React
       snapshot. If the latch says ready while the panel renders his progress
       line, the two are disagreeing about the same question, which is the
       bug rather than a symptom of it. */
    const verdict = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return {
        latchReady: !!(S._npcProxLatch && S._npcProxLatch.ready),
        inv: Object.assign({}, S.rpg.inventory || {}),
      };
    });
    console.log(`    ${st.id} BroTown live verdict ready=${verdict.latchReady}`);
    rec.ok(`${st.id}: the panel agrees with BroTown that the reward is ready`,
      !verdict.latchReady || (!!txt && /claim/i.test(txt)),
      { latchReady: verdict.latchReady, txt });
  }

  await P.ctx.close().catch(() => {});
}
