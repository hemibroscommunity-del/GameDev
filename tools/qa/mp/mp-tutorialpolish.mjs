/* ═══ THE MAYOR'S FIRST QUEST, TAKEN CLEANLY (v2.3.4166) ═══
 *
 * The owner, 2026-11-03, playing the live game: "Remove the arrow in the
 * first screenshot. In the second screenshot (after accepting the quest)
 * mayor bro says again to kill the slimes (this message is unnecessary they
 * already know they just accepted his quest)."
 *
 * A brand-new character in the world's BroTown, on an upright phone and a
 * computer (wide):
 *   1. talked to Mayor Bro and paged to his quest offer (NEW QUEST, "Into the
 *      Blue"), with the big arrow still wanting him (the owner's case: its
 *      Mayor lesson forgotten): for 3 s no arrow and no coach ring over the
 *      offer card;
 *   2. ACCEPT QUEST: the window closes -- no dialogue, and never his "I still
 *      need ..." progress line -- and QUEST ACCEPTED! shows;
 *   3. once the card has closed, the next step comes: the big arrow at the
 *      gear (the weapon lesson) and the coach's Gear up card;
 *   4. talking to him again later gives his progress line (it is not lost);
 *   5. a giver with something to do AT ONCE for his quest keeps the window on
 *      Accept, that button alone and no "I still need ..." above it (the
 *      orchestrator's refinement): Lil Bro's Race Day (Race!) and Blacksmith
 *      Bro's Some Assembly Required (Open the forge), each reached by the
 *      operator's /dev/tour jump;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/tutorialpolish-<view>-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEWS = [
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
];

/* over the card: an arrow or a coach ring whose box crosses the offer card's */
const overCard = (P) => P.page.evaluate(() => {
  const card = document.querySelector('.bt-qoffer');
  if (!card) return { card: false };
  const c = card.getBoundingClientRect();
  const crosses = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top; };
  return { card: true, arrow: crosses(document.querySelector('[data-guide-arrow]')), ring: crosses(document.querySelector('[data-coach-ring]')),
    lesson: window.__btGuideArrow ? window.__btGuideArrow.lesson : null };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  for (const V of VIEWS.filter((v) => !process.env.BT_TP_ONLY || v.id === process.env.BT_TP_ONLY)) {
    const P = await H.newPlayer(browser, { name: 'Polish' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
    const shot = (n) => P.page.screenshot({ path: join(OUT, `tutorialpolish-${V.id}-${n}.png`) }).catch(() => {});
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
      await H.pastWelcome(P).catch(() => {});

      /* 1. his offer card, the arrow still wanting him */
      await H.approachNpc(P, 'mayor_bro');
      await H.advanceNpcDialogue(P, { max: 14 }).catch(() => {});
      let up = false;
      for (let i = 0; i < 30 && !up; i++) { up = await P.page.evaluate(() => !!document.querySelector('.bt-qoffer')); if (!up) await P.page.waitForTimeout(250); }
      await P.page.evaluate(() => { try { window.__btGuideArrow.forget(); } catch (e) { /* none */ } });
      let worst = { arrow: false, ring: false };
      const samples = [];
      for (let i = 0; i < 15; i++) {
        const o = await overCard(P);
        samples.push(o);
        if (o.arrow) worst.arrow = true;
        if (o.ring) worst.ring = true;
        await P.page.waitForTimeout(200);
      }
      await shot('1-offer');
      rec.ok(`${V.id} 1. the Mayor's quest offer is up (${up}): for 3 s no big arrow (${worst.arrow}) and no coach ring (${worst.ring}) over it`,
        up && !worst.arrow && !worst.ring, { worst, last: samples[samples.length - 1] });

      /* 2. ACCEPT QUEST: the window closes, no "I still need" */
      await H.confirmQuestOffer(P).catch(() => null);
      const after = [];
      for (let i = 0; i < 12; i++) {
        after.push(await P.page.evaluate(() => ({
          dlg: !!document.querySelector('.bt-npcdlg, .bt-qoffer'),
          need: /I still need/.test((document.querySelector('.bt-npcdlg-text') || {}).textContent || ''),
          banner: (document.querySelector('[data-quest-banner]') || {}).getAttribute ? document.querySelector('[data-quest-banner]').getAttribute('data-quest-banner') : null,
          tut1: (window._gameState.current.rpg._quests || {}).tut_1 || null,
        })));
        await P.page.waitForTimeout(250);
      }
      await shot('2-accepted');
      const last = after[after.length - 1];
      rec.ok(`${V.id} 2. ACCEPT QUEST closes the window (tut_1 ${last.tut1}): no dialogue, never "I still need", QUEST ACCEPTED! shows`,
        last.tut1 === 'active' && !last.dlg && after.every((a) => !a.need) && after.some((a) => a.banner === 'accepted'), { last, sawNeed: after.some((a) => a.need), banners: after.map((a) => a.banner) });

      /* 3. the next step once the card has closed */
      let next = null;
      for (let i = 0; i < 80; i++) {
        next = await P.page.evaluate(() => ({ arrow: window.__btGuideArrow ? window.__btGuideArrow.lesson : null, el: !!document.querySelector('[data-guide-arrow]'),
          coach: (document.querySelector('[data-coach]') || { getAttribute: () => null }).getAttribute('data-coach') }));
        if (next.el && next.arrow === 'weapon' && next.coach === 'equip') break;
        await P.page.waitForTimeout(250);
      }
      await shot('3-next');
      rec.ok(`${V.id} 3. once the card has closed, the next step: the big arrow at the gear (${next.arrow}) and Gear up (${next.coach})`, next.el && next.arrow === 'weapon' && next.coach === 'equip', next);

      /* 4. his progress line when you talk to him again */
      await H.closeNpcDialogue(P).catch(() => {});
      await H.approachNpc(P, 'mayor_bro');
      let line = null;
      for (let i = 0; i < 20 && !line; i++) {
        line = await P.page.evaluate(() => { const t = document.querySelector('.bt-npcdlg-text'); return t ? (t.textContent || '').trim() : null; });
        if (!line) await P.page.waitForTimeout(250);
      }
      rec.ok(`${V.id} 4. talking to him again gives his progress line ("${(line || '').slice(0, 60)}")`, !!line && /I still need/.test(line), line);
      await H.closeNpcDialogue(P).catch(() => {});

      /* 5. givers with a button for their quest at once: it stays, alone */
      const myId = await H.readState(P, (S) => S.myId);
      for (const G of [{ q: 'race_1', npc: 'lil_bro', qa: 'race-go', label: 'Race!' }, { q: 'smith_2', npc: 'blacksmith_bro', qa: 'quest-open', label: 'Open the forge' }]) {
        const jumped = await H.devOp(wsPort, 'tour', myId, { at: G.q }).catch(() => null);
        await P.page.waitForTimeout(1500);
        await H.closeNpcDialogue(P).catch(() => {});
        await H.approachNpc(P, G.npc);
        const landed = await H.advanceNpcDialogue(P, { max: 14 }).catch(() => null);
        await H.confirmQuestOffer(P).catch(() => null);
        const seen = [];
        for (let i = 0; i < 10; i++) {
          seen.push(await P.page.evaluate((G) => {
            const b = document.querySelector(`[data-qa="${G.qa}"]`), t = document.querySelector('.bt-npcdlg-text');
            return { dlg: !!document.querySelector('.bt-npcdlg'), offer: !!document.querySelector('.bt-qoffer'), btn: b ? b.innerText.trim() : null,
              text: t ? (t.textContent || '').trim() : '', st: (window._gameState.current.rpg._quests || {})[G.q] || null };
          }, G));
          await P.page.waitForTimeout(250);
        }
        await shot(`5-${G.q}`);
        const fin = seen[seen.length - 1];
        rec.ok(`${V.id} 5. ${G.q}: ACCEPT keeps the window with "${fin.btn}" alone (text "${fin.text.slice(0, 40)}"), never "I still need"`,
          !!jumped && jumped.ok === true && landed === 'offer' && fin.st === 'active' && fin.dlg && !fin.offer && fin.btn === G.label && !fin.text && seen.every((a) => !/I still need/.test(a.text)),
          { jumped, landed, fin, sawNeed: seen.some((a) => /I still need/.test(a.text)) });
        await H.closeNpcDialogue(P).catch(() => {});
      }
      rec.ok(`${V.id} 6. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
