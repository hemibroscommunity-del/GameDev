/* ═══ THE FIRST QUEST'S HAND-IN IN ONE GO (v2.3.3871) ═══
 *
 * The owner, playtesting on a computer before the showing: "don't make your
 * character click on mayor bro again to claim the reward from turning in the
 * first quest.  It's a strange series where he says that message.  Then you
 * click on him again to claim the reward from the first quest".
 *
 * A computer playing wide (a real mouse click on Mayor Bro) and an upright
 * phone (a real tap), in the world:
 *   1. a click on Mayor Bro opens his dialogue; through it, the first quest
 *      (tut_1, Into the Blue) is taken;
 *   2. its 4 Slime Remains granted, ONE click on Mayor Bro opens the hand-in,
 *      and its "Claim reward" is reached from that same window -- no second
 *      click on him in between -- and the worker marks the quest turned in;
 *   3. every window and button on the way is logged (the record of what the
 *      player saw);
 *   4. no page errors. */
import * as H from './harness.mjs';

const VIEWS = [
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
];

/* what is on screen: the dialogue (its words and its button), the offer, the
   claim panel */
const screen = (P) => P.page.evaluate(() => {
  const t = (sel) => { const e = document.querySelector(sel); return e ? (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 140) : null; };
  return { dlg: t('.bt-npcdlg-text'), next: t('.bt-npcdlg-next'), offer: !!document.querySelector('.bt-qoffer'), offerText: t('.bt-qoffer'),
    claim: t('[data-quest-claim], .bt-qclaim'), tap: window.__btNpcTap ? window.__btNpcTap.result : null };
});

/* a real click (computer) or tap (phone) on a townsperson as drawn */
/* stand beside him without talking (a hop, no tap) */
async function besideNpc(P, id) {
  const at = await P.page.evaluate((nid) => { const S = window._gameState.current; const o = (S.npcs || []).find((q) => q.id === nid); return o ? { x: o.x, y: o.y } : null; }, id);
  if (at) await H.hopTo(P, at.x, at.y + 40, { tries: 40 });
  await P.page.waitForTimeout(1200);
}
async function clickNpc(P, id, touch) {
  const at = await P.page.evaluate((nid) => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((o) => o.id === nid);
    const cv = document.querySelector('canvas.brotown-canvas');
    if (!n || !cv) return null;
    const r = cv.getBoundingClientRect();
    return { x: Math.round(r.left + (n.x - S.camera.x) * (S._worldScaleX || 1)), y: Math.round(r.top + (n.y - S.camera.y - 30) * (S._worldScaleY || 1)) };
  }, id);
  if (!at) return false;
  if (touch) await P.page.touchscreen.tap(at.x, at.y);
  else await P.page.mouse.click(at.x, at.y, { delay: 90 });
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const V of VIEWS) {
    const touch = !!V.opts.touch;
    const P = await H.newPlayer(browser, { name: 'Hand' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const log = [];
    const note = async (what) => { const s = await screen(P); log.push({ what, ...s }); console.log(`    [${V.id}] ${what}: ${JSON.stringify(s)}`); return s; };
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
      const me = await H.readState(P, (S) => S.myId);
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});

      /* 1. take the first quest */
      await besideNpc(P, 'mayor_bro');
      await clickNpc(P, 'mayor_bro', touch);
      await P.page.waitForTimeout(1200);
      await note('click 1 (no quest yet)');
      await H.acceptQuestFromGiver(P).catch(() => null);
      await P.page.waitForTimeout(1500);
      const st1 = await H.readState(P, (S) => (S.rpg && S.rpg._quests ? S.rpg._quests.tut_1 : null));
      await note(`after accept (tut_1 ${st1})`);
      rec.ok(`${V.id} 1. the first quest is taken (${st1})`, !!st1 && st1 !== 'turnedIn', st1);
      await H.closeNpcDialogue(P).catch(() => {});

      /* 2. its Slime Remains, then ONE click on him */
      await H.grant(wsPort, me, 'item', { invKey: 'slime-remnants', count: 4 });
      await P.page.waitForTimeout(2000);
      await besideNpc(P, 'mayor_bro');
      const before = await screen(P);
      rec.ok(`${V.id} 2. (guard) nothing open before the click`, !before.dlg && !before.offer, before);
      await clickNpc(P, 'mayor_bro', touch);
      await P.page.waitForTimeout(1200);
      let s = await note('ONE click on him, quest ready');
      /* through his words with the dialogue's own button, counting any click
         on HIM needed in between */
      let clicksOnHim = 1, claimed = false;
      for (let i = 0; i < 14 && !claimed; i++) {
        s = await screen(P);
        if (s.next && /claim reward/i.test(s.next)) {
          await note('Claim reward on the dialogue');
          await P.page.locator('.bt-npcdlg-next:visible').first().click({ timeout: 8000 }).catch(() => {});
          claimed = true;
          break;
        }
        if (s.next) { await P.page.locator('.bt-npcdlg-next:visible').first().click({ timeout: 8000 }).catch(() => {}); await P.page.waitForTimeout(700); await note('Next'); continue; }
        if (s.claim) { await note('claim panel'); break; }
        /* nothing open: the player would click him again */
        clicksOnHim++;
        await clickNpc(P, 'mayor_bro', touch);
        await P.page.waitForTimeout(1200);
        await note(`click ${clicksOnHim} on him`);
      }
      await P.page.waitForTimeout(2000);
      const st2 = await H.readState(P, (S) => (S.rpg && S.rpg._quests ? S.rpg._quests.tut_1 : null));
      await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/handin1-${V.id}.png` }).catch(() => {});
      rec.ok(`${V.id} 2. one click on Mayor Bro hands the quest in: Claim reward on that same window (clicks on him: ${clicksOnHim}, claimed ${claimed}, tut_1 ${st2})`,
        clicksOnHim === 1 && claimed && st2 === 'turnedIn', log);
      rec.ok(`${V.id} 4. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
