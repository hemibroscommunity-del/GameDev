/* ═══ A COMPUTER'S KEYS, ON THE BUTTONS THEY PRESS (v2.3.3343) ═══
 *
 * Owner, 2026-10-18: "For computer usage if there's a key that makes sense to
 * use for a certain action just put the letter next to the icon or action in
 * a tasteful way."
 *
 * game/deskKeys.js is the one table: desktopControls.js binds each key and
 * the button that does the same wears its letter (`data-key`, drawn by
 * game.css only under a mouse).  Proven here on a real page, by real key
 * presses (1440 x 900, the game in its centred column):
 *   1. the dashboard's six buttons wear B P J L K O, the minimap's open
 *      button M beside its "tap me" mark, the keys strip lists 1-3 and no
 *      longer lies under the bell;
 *   2. each key opens its page and closes it again; B is the bag (back to
 *      rest, and at rest it folds the band away and back);
 *   3. never with Ctrl held (the browser's), never while typing in chat;
 *   4. M opens the world map and closes it, Esc presses its ✕;
 *   5. Esc presses the ✕ of the window in front -- a building, Diego, Ace,
 *      the daily rewards -- one window at a time, then a dashboard page
 *      (back a step, then shut);
 *   6. Enter is Mayor Bro's Next and the quest's Accept, Esc its "Not now";
 *   7. a phone shows none of the letters.
 */
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
/* src/game/deskKeys.js NAV_KEYS -- held to it in step 1 by what the page
   wears, so a change there that this file missed fails here */
const NAV = { dashboard: 'B', hero: 'P', quests: 'J', skills: 'L', encyclopedia: 'K', more: 'O' };

/** The key cap a control wears: its ::after (or ::before) as computed. */
const capOf = (P, sel, pseudo = '::after') => P.page.evaluate(([s, ps]) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const cs = getComputedStyle(el, ps);
  return { key: el.getAttribute('data-key'), content: cs.content, display: cs.display, left: cs.left, top: cs.top };
}, [sel, pseudo]);
const shown = (c) => !!c && c.content && c.content !== 'none' && c.content !== 'normal' && c.display !== 'none';

const sheet = (P) => P.page.evaluate(() => {
  const b = window.__broDashPanelBus;
  const f = document.querySelector('[data-dash-fold]');
  return b ? { mode: b.state.mode, root: b.state.stack[0], top: b.current(), fold: f ? f.getAttribute('data-dash-fold') : null } : null;
});
const mapOpen = (P) => P.page.evaluate(() => !!(window.__btWorldMap && window.__btWorldMap.open) && !!document.querySelector('[data-world-map]'));
const key = async (P, k, ms = 450) => { await P.page.keyboard.press(k); await P.page.waitForTimeout(ms); };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Deskkeys', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
    await P.page.waitForTimeout(2000);
    await H.unfoldBand(P);
    /* a new bro beside Mayor Bro gets his welcome: put away first (step 6
       walks back to him) */
    await H.closeNpcDialogue(P).catch(() => {});
    await H.leaveNpc(P, 'mayor_bro').catch(() => {});
    await P.page.waitForTimeout(800);
    rec.ok('a computer, in the Wheel, the band open (guard)', await P.page.evaluate(() => matchMedia('(pointer:fine)').matches
      && window._gameState.current.currentZone === 'wheel') && (await sheet(P) || {}).fold === 'open', await sheet(P));

    /* ── 1. THE LETTERS ── */
    const caps = {};
    for (const id of Object.keys(NAV)) caps[id] = await capOf(P, `[data-nav="${id}"]`);
    rec.ok('the dashboard\'s six buttons wear B P J L K O',
      Object.keys(NAV).every((id) => shown(caps[id]) && caps[id].key === NAV[id]), caps);
    const mapCap = await capOf(P, '[data-world-map-open]');
    const mark = await P.page.evaluate(() => (window.__btWheelMini && window.__btWheelMini.mark) || null);
    rec.ok('the minimap wears M, just right of its "tap me" mark',
      shown(mapCap) && mapCap.key === 'M' && !!mark && parseFloat(mapCap.left) >= mark.x + mark.w
        && parseFloat(mapCap.left) <= mark.x + mark.w + 8 && Math.abs(parseFloat(mapCap.top) - mark.y) <= 2, { mapCap, mark });
    const strip = await P.page.evaluate(() => {
      const s = document.querySelector('.bt-kb-hints');
      const bell = document.querySelector('[data-world-chat-toggle]');
      const r = s && s.getBoundingClientRect(), b = bell && bell.getBoundingClientRect();
      const keys = s ? Array.from(s.querySelectorAll('kbd')).map((k) => k.textContent) : [];
      return { keys, left: r && Math.round(r.left), bellRight: b && Math.round(b.right),
        overlap: !!(r && b && b.width && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) };
    });
    rec.ok('the keys strip lists 1-3, and lies clear of the bell', strip.keys.includes('1-3') && !strip.overlap, strip);

    /* ── 2. EACH KEY ITS PAGE, AND AGAIN TO CLOSE IT ── */
    for (const [id, k] of [['quests', 'J'], ['hero', 'P'], ['skills', 'L'], ['encyclopedia', 'K'], ['more', 'O']]) {
      await key(P, 'Key' + k);
      const on = await sheet(P);
      await key(P, 'Key' + k);
      const off = await sheet(P);
      rec.ok(`${k} opens ${id}, and ${k} again closes it`, !!on && on.mode === 'expanded' && on.root === id && !!off && off.mode === 'bar', { on, off });
    }
    await key(P, 'KeyJ');
    await key(P, 'KeyL');
    const swapped = await sheet(P);
    rec.ok('J then L: the Quests page gives way to Life Skills', !!swapped && swapped.mode === 'expanded' && swapped.root === 'skills', swapped);
    await key(P, 'KeyB');
    const toBag = await sheet(P);
    rec.ok('B with a page open: back to the band at rest, where the bag is', !!toBag && toBag.mode === 'bar' && toBag.fold === 'open', toBag);
    await key(P, 'KeyB');
    const folded = await sheet(P);
    await key(P, 'KeyB');
    const unfolded = await sheet(P);
    rec.ok('B at rest folds the band away, and B brings it back', !!folded && folded.fold === 'min' && !!unfolded && unfolded.fold === 'open', { folded, unfolded });

    /* Esc on the dashboard: back a step, then shut */
    await key(P, 'KeyO');
    await P.page.evaluate(() => window.__broDashPanelBus.push('settings'));
    await P.page.waitForTimeout(400);
    const deep = await sheet(P);
    await key(P, 'Escape');
    const back1 = await sheet(P);
    await key(P, 'Escape');
    const back2 = await sheet(P);
    rec.ok('Esc on More > Settings goes back to More, and again shuts the page',
      !!deep && deep.top === 'settings' && !!back1 && back1.mode === 'expanded' && back1.top === 'more' && !!back2 && back2.mode === 'bar', { deep, back1, back2 });

    /* ── 3. NEVER THE BROWSER'S, NEVER WHILE TYPING ── */
    await key(P, 'Control+KeyJ');
    await key(P, 'Control+KeyM');
    const chord = await sheet(P);
    rec.ok('Ctrl+J and Ctrl+M are left to the browser', !!chord && chord.mode === 'bar' && !(await mapOpen(P)), chord);
    await key(P, 'KeyC', 700);
    const typing = await P.page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-chat-input'));
    await P.page.keyboard.type('jplkobm', { delay: 40 });
    await P.page.waitForTimeout(500);
    const typed = await sheet(P);
    const words = await P.page.evaluate(() => { const i = document.querySelector('[data-chat-input]'); return i ? i.value : null; });
    rec.ok('typing "jplkobm" in the chat opens no page and no map', typing && words === 'jplkobm' && !!typed && typed.mode === 'bar' && !(await mapOpen(P)), { typing, words, typed });
    await key(P, 'Escape');
    rec.ok('...and Esc closes the chat', await P.page.evaluate(() => !document.querySelector('[data-chat-input]')));

    /* ── 4. M, THE WORLD MAP ── */
    await key(P, 'KeyM', 1200);
    const m1 = await mapOpen(P);
    const xCap = await capOf(P, '[data-world-map-close]');
    await key(P, 'Escape', 800);
    const m2 = await mapOpen(P);
    await key(P, 'KeyM', 1200);
    const m3 = await mapOpen(P);
    await key(P, 'KeyM', 800);
    const m4 = await mapOpen(P);
    rec.ok('M opens the world map, whose ✕ wears Esc', m1 && shown(xCap) && xCap.key === 'Esc', { m1, xCap });
    rec.ok('...Esc closes it, M opens it again and M closes it', !m2 && m3 && !m4, { m2, m3, m4 });

    /* ── 5. Esc: THE WINDOW IN FRONT, BY ITS ✕ ── */
    await P.page.evaluate(() => window.__btBuildingWindow.open('bank'));
    await P.page.waitForTimeout(1000);
    const bankX = await capOf(P, '[data-building-panel] .bt-inspect-close', '::before');
    rec.ok('a building\'s window: its ✕ wears Esc', shown(bankX) && /Esc/.test(bankX.content), bankX);
    await key(P, 'Escape', 700);
    rec.ok('...and Esc closes it', await P.page.evaluate(() => !document.querySelector('[data-building-panel]')));
    for (const [what, open, sel, gone] of [
      ['Diego\'s shop', () => window.__broShopBus.setOpen(true), '[data-shop-close]', () => !document.querySelector('[data-shop-close]')],
      ['Ace\'s coin flip', () => { window.__btAceFlipBus.setStake(0); window.__btAceFlipBus.setOpen(true); }, '[aria-label="Close"][data-esc]', () => !(window.__btAceFlipBus && window.__btAceFlipBus.open)],
      ['the daily rewards', () => window.__btDailyRewards.open('today'), '[data-daily-close]', () => !document.querySelector('[data-daily-rewards]')],
    ]) {
      await P.page.evaluate(open);
      await P.page.waitForTimeout(1200);
      const c = await capOf(P, sel);
      const m = await capOf(P, '[data-world-map-open]');
      await key(P, 'Escape', 800);
      const closed = await P.page.evaluate(gone);
      rec.ok(`${what}: its ✕ wears Esc, and Esc closes it`, shown(c) && closed, { c, closed });
      rec.ok(`...and while it was up the minimap's M stood aside`, !!m && m.display === 'none', m);
    }
    /* one window over another: the one in front only */
    await P.page.evaluate(() => window.__btBuildingWindow.open('bank'));
    await P.page.waitForTimeout(900);
    await P.page.evaluate(() => window.__btDailyRewards.open('today'));
    await P.page.waitForTimeout(1200);
    await key(P, 'Escape', 800);
    const layered = await P.page.evaluate(() => ({ daily: !!document.querySelector('[data-daily-rewards]'), bank: !!document.querySelector('[data-building-panel]') }));
    await key(P, 'Escape', 800);
    const layered2 = await P.page.evaluate(() => ({ bank: !!document.querySelector('[data-building-panel]') }));
    rec.ok('the daily rewards over the bank: Esc shuts the rewards, the bank stays; Esc again shuts the bank',
      !layered.daily && layered.bank && !layered2.bank, { layered, layered2 });

    /* ── 6. Enter AND Esc IN MAYOR BRO'S DIALOGUE ── */
    const talking = await H.approachNpc(P, 'mayor_bro').catch(() => false)
      || await P.page.evaluate(() => { const S = window._gameState.current; if (S._interactNow) S._interactNow({ npcFirst: true }); return false; })
      || await H.npcDialogueOpen(P);
    rec.ok('Mayor Bro\'s dialogue is up (guard)', !!talking);
    const mUnder = await capOf(P, '[data-world-map-open]');
    rec.ok('...and the minimap\'s M stands aside under its dimmed screen', !!mUnder && mUnder.display === 'none', mUnder);
    const nextCap = await capOf(P, '.bt-npcdlg-next');
    rec.ok('its Next wears Enter', shown(nextCap) && nextCap.key === 'Enter', nextCap);
    const said = () => P.page.evaluate(() => {
      const t = document.querySelector('.bt-npcdlg-text');
      return { text: t ? t.textContent : null, offer: !!document.querySelector('.bt-qoffer') };
    });
    const before = await said();
    await key(P, 'Enter', 600);
    const after = await said();
    rec.ok('Enter is Next: he says his next line (or offers the quest)', after.offer || (!!after.text && after.text !== before.text), { before, after });
    for (let i = 0; i < 14 && !(await said()).offer; i++) await key(P, 'Enter', 450);
    const acceptCap = await capOf(P, '[data-tut="qoffer-confirm"]');
    const laterCap = await capOf(P, '.bt-qoffer-later');
    rec.ok('the quest offer: Accept Quest wears Enter, Not now wears Esc',
      shown(acceptCap) && acceptCap.key === 'Enter' && shown(laterCap) && laterCap.key === 'Esc', { acceptCap, laterCap });
    const offerNode = await P.page.evaluateHandle(() => document.querySelector('.bt-qoffer'));
    await key(P, 'Escape', 700);
    const declined = await P.page.evaluate((n) => !n || !n.isConnected, offerNode);
    rec.ok('Esc is Not now: the offer goes', declined);
    await H.leaveNpc(P, 'mayor_bro').catch(() => {});
    await P.page.waitForTimeout(600);
    await H.approachNpc(P, 'mayor_bro').catch(() => {});
    for (let i = 0; i < 14 && !(await said()).offer; i++) await key(P, 'Enter', 450);
    const offered = (await said()).offer;
    await key(P, 'Enter', 1500);
    /* the worker's own record, as mp-questline reads it */
    const myId = await H.readState(P, (S) => S.myId);
    const srv = await H.adminPlayer(wsPort, myId).then((a) => (a && a.rpg) || null).catch(() => null);
    const accepted = { offered, offer: await P.page.evaluate(() => !!document.querySelector('.bt-qoffer')),
      tut1: srv && srv._quests ? srv._quests.tut_1 : null };
    rec.ok('Enter is Accept Quest: the offer goes and Cold Reception is taken', offered && !accepted.offer && accepted.tut1 === 'active', accepted);
    await H.closeNpcDialogue(P).catch(() => {});
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── 7. A PHONE WEARS NONE OF IT ── */
  const Q = await H.newPlayer(browser, { name: 'Deskkeysphone', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  try {
    await H.enterWorld(Q);
    await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'the phone into the Wheel' }).catch(() => null);
    await Q.page.waitForTimeout(1500);
    const phone = await Q.page.evaluate(() => {
      const nav = document.querySelector('[data-nav="quests"]');
      const map = document.querySelector('[data-world-map-open]');
      const c = (el) => (el ? getComputedStyle(el, '::after').content : 'absent');
      return { coarse: !matchMedia('(pointer:fine)').matches, nav: c(nav), map: c(map), strip: !!document.querySelector('.bt-kb-hints') };
    });
    rec.ok('a phone: no letters on the buttons, and no keys strip',
      phone.coarse && (phone.nav === 'none' || phone.nav === 'normal') && (phone.map === 'none' || phone.map === 'normal' || phone.map === 'absent') && !phone.strip, phone);
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
