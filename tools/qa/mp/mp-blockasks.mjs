/* mp-blockasks (v2.3.3486): a blocked player's duel challenge, trade request
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
    const ask = async (from, name) => {
      await P.page.evaluate(({ from, name, me }) => {
        const C = window.__btCues;
        if (C && C.reset) C.reset();
        window.__btDispatch({ type: 'duel_request', payload: { target: me, from, fromName: name } });
        window.__btDispatch({ type: 'trade2_invite', payload: { from, fromName: name } });
        window.__btDispatch({ type: 'party_invited', payload: { from, fromName: name, partySize: 1 } });
      }, { from, name, me: myId });
      await P.page.waitForTimeout(900);
      const cards = await shown();
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

    rec.ok('no page errors', errs.length === 0, errs);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
