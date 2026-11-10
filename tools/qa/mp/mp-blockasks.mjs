/* mp-blockasks (v2.3.3526): a blocked player's duel challenge, trade request
 * and party invite never reach you.  The owner, of the 2026-10-19 UI review's
 * "should blocking a player also stop their trade and duel requests?": "Go
 * recommended on everything".  Block (the player card's, and the friends
 * list's) hid chat and emotes only; the three request cards came through.
 *
 * On a phone in the Wheel, the requests fed to the game as the socket's own
 * messages are (window.__btDispatch, processGameEvent):
 *   1. guard: from a player nobody blocked, each of the three shows its card;
 *   2. with bp_qapest on the block list as the player card writes it (a plain
 *      id), none of the three from them shows a card or plays its sound;
 *   3. the friends list's shape ({id, name}) blocks them the same;
 *   4. unblocked, their challenge shows its card again.
 *
 * v2.3.4365 (the state-machine sweep, 2026-11-03: V6 N2-18, V12 P2-19):
 *   - the duel challenge is sent as the game's own Duel button sends it,
 *     `duel_wager_request` (only the older `duel_request` was ever checked,
 *     so a blocked player's challenge still raised the card); section 2 also
 *     sends the older one;
 *   5. TWO WRITERS: a block saved behind the page's back (as the Friends page
 *      saves one), then Block and Unblock of another player on their card:
 *      the first block is still on the list (the card used to write back the
 *      copy it read at load, erasing it), and the card agrees it is blocked.
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };
const PEST = 'bp_qapest', FRIEND = 'bp_qafriend';
const CARDS = { duel: '[data-duel-request]', trade: '[data-trade-drawer="invite"]', party: '[data-party-invite]' };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Blocker', wsPort, webPort, viewport: VIEW, touch: true, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId).catch(() => {});
    await P.page.waitForTimeout(1500);
    await H.closeNpcDialogue(P).catch(() => {});
    const can = await P.page.evaluate(() => typeof window.__btDispatch === 'function');
    rec.ok('a phone in the Wheel, the game\'s own message door open (guard)', !!myId && can, { myId, can });

    const setBlocked = (list) => P.page.evaluate((l) => { localStorage.setItem('bt_blocked', JSON.stringify(l)); }, list);
    const shown = () => P.page.evaluate((C) => {
      const out = {};
      for (const k of Object.keys(C)) out[k] = !!document.querySelector(C[k]);
      return out;
    }, CARDS);
    /* the three, from `from`, then what is on the screen and what was heard */
    const ask = async (from, name, duelType = 'duel_wager_request') => {
      await P.page.evaluate(({ from, name, me, duelType }) => {
        const C = window.__btCues;
        if (C && C.reset) C.reset();
        window.__btDispatch({ type: duelType, payload: { target: me, from, fromName: name, wager: 0 } });
        window.__btDispatch({ type: 'trade2_invite', payload: { from, fromName: name } });
        window.__btDispatch({ type: 'party_invited', payload: { from, fromName: name, partySize: 1 } });
      }, { from, name, me: myId, duelType });
      /* v2.3.4365: 900 ms at least (a dropped request must have had time to
         show), then up to 4 s more for all three: on this box the trade card
         can draw after its sound (a first run, section 1) */
      await P.page.waitForTimeout(900);
      let cards = await shown();
      for (let i = 0; i < 8 && !(cards.duel && cards.trade && cards.party); i++) {
        await P.page.waitForTimeout(500);
        cards = await shown();
      }
      const heard = await P.page.evaluate(() => {
        const C = window.__btCues;
        const log = C && C.log ? C.log() : (C && C.stats && C.stats.log) || [];
        return Array.isArray(log) ? log.map((c) => c.name || c).filter((n) => /duelAsk|tradeAsk|notify/.test(String(n))) : null;
      });
      return { cards, heard };
    };
    /* answer each card: Decline */
    const clear = async () => {
      for (let i = 0; i < 6; i++) {
        const did = await P.page.evaluate((C) => {
          for (const sel of Object.values(C)) {
            const card = document.querySelector(sel);
            if (!card) continue;
            const b = Array.from(card.querySelectorAll('button')).find((q) => /^(decline|no|not now)$/i.test((q.textContent || '').trim()));
            if (b) { b.click(); return true; }
          }
          return false;
        }, CARDS);
        if (!did) break;
        await P.page.waitForTimeout(400);
      }
      return shown();
    };

    /* ── 1. guard: nobody blocked, the three show ── */
    await setBlocked([]);
    const open = await ask(FRIEND, 'Friendly');
    rec.ok('1. from a player nobody blocked: the duel challenge, the trade request and the party invite each show their card (guard)',
      open.cards.duel && open.cards.trade && open.cards.party, open);
    const after1 = await clear();
    rec.ok('...answered, all three go (guard)', !after1.duel && !after1.trade && !after1.party, after1);

    /* ── 2. blocked by the player card (a plain id) ── */
    await setBlocked([PEST]);
    const pest = await ask(PEST, 'Pest');
    rec.ok('2. blocked from their card: none of their three requests shows a card',
      !pest.cards.duel && !pest.cards.trade && !pest.cards.party, pest);
    rec.ok('...and none plays its sound', !pest.heard || pest.heard.length === 0, pest);
    await clear();
    const pestOld = await ask(PEST, 'Pest', 'duel_request');
    rec.ok('...nor the older plain duel_request', !pestOld.cards.duel && !pestOld.cards.trade && !pestOld.cards.party, pestOld);
    await clear();

    /* ── 3. blocked from the friends list ({id, name}) ── */
    await setBlocked([{ id: PEST, name: 'Pest' }]);
    const pest2 = await ask(PEST, 'Pest');
    rec.ok('3. blocked from the friends list ({id, name}): none of their three shows a card either',
      !pest2.cards.duel && !pest2.cards.trade && !pest2.cards.party, pest2);
    await clear();

    /* ── 4. unblocked ── */
    await setBlocked([]);
    const back = await ask(PEST, 'Pest');
    rec.ok('4. unblocked, their requests show again', back.cards.duel && back.cards.trade && back.cards.party, back);
    await clear();

    /* ── 5. two writers: a stored block survives a card's Block and Unblock ── */
    const Q = await H.newPlayer(browser, { name: 'Quarrel', wsPort, webPort, viewport: VIEW, touch: true, world: 'wheel' });
    try {
      await H.enterWorld(Q);
      const qId = await H.readState(Q, (S) => S.myId);
      await H.waitMutualSight(P, Q).catch(() => null);
      await setBlocked([{ id: PEST, name: 'Pest' }]);    /* saved behind the page's back, as the Friends page saves */
      const opened = await H.openInspect(P, qId).catch(() => false);
      rec.ok('5. a second player\'s card opens (guard)', !!opened, { qId, opened });
      const list = () => P.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_blocked') || '[]').map((b) => (b && b.id) || b); } catch (e) { return null; } });
      const pressed = () => P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-card [data-act="block"]'); return b ? b.getAttribute('aria-pressed') : null; });
      await H.clickAct(P, 'block');
      await P.page.waitForTimeout(600);
      const l1 = await list(), p1 = await pressed();
      rec.ok('...Block on their card keeps the block saved elsewhere, and adds theirs',
        Array.isArray(l1) && l1.includes(PEST) && l1.includes(qId) && p1 === 'true', { l1, p1 });
      await H.clickAct(P, 'block');
      await P.page.waitForTimeout(600);
      const l2 = await list(), p2 = await pressed();
      rec.ok('...and Unblock on their card removes only theirs (the card used to erase the other)',
        Array.isArray(l2) && l2.includes(PEST) && !l2.includes(qId) && p2 === 'false', { l2, p2 });
      const still = await ask(PEST, 'Pest');
      rec.ok('...so the first player\'s requests still stop', !still.cards.duel && !still.cards.trade && !still.cards.party, still);
      await clear();
    } finally {
      await Q.ctx.close().catch(() => {});
    }

    rec.ok('no page errors', errs.length === 0, errs);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
