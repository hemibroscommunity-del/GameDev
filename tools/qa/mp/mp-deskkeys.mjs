/* ═══ A COMPUTER'S KEYS, ON THE BUTTONS THEY PRESS (v2.3.3407) ═══
 *
 * Owner, 2026-10-18: "For computer usage if there's a key that makes sense to
 * use for a certain action just put the letter next to the icon or action in
 * a tasteful way."
 *
 * game/deskKeys.js is the one table: desktopControls.js binds each key and
 * the button that does the same wears its letter (`data-key`, drawn by
 * game.css only under a mouse).  Proven here on a real page, by real key
 * presses (1440 x 900, the game in its centred column):
 *   1. the dashboard's six buttons wear I P J L K O, the minimap's open
 *      button M beside its "tap me" mark, the keys strip lists 1-3 and no
 *      longer lies under the bell (v2.3.6304: since v2.3.4263 the band's own
 *      list, `[data-band-keys]`, in the strip's place);
 *   2. each key opens its page and closes it again; I is the bag (back to
 *      rest, and at rest it folds the band away and back); B is the emotes
 *      (v2.3.3391's key), the chat box's smiley wears it, and the picker's ✕
 *      wears Esc and Esc closes it;
 *   3. never with Ctrl held (the browser's), never while typing in chat;
 *   4. M opens the world map and closes it, Esc presses its ✕;
 *   5. Esc presses the ✕ of the window in front -- a building, Diego, Ace,
 *      the daily rewards -- one window at a time, then a dashboard page
 *      (back a step, then shut);
 *   6. Enter is Mayor Bro's Next and the quest's Accept, Esc its "Not now";
 *   7. a phone shows none of the letters.
 *
 * v2.3.3711, THE OWNER'S LAYOUT ("Do your recommended keyboard layout. I
 * still think there are better layouts if you consider more creative combos
 * (like keyboard presses while a click is held down, double clicking, etc)").
 * A second computer (1280 x 800, the layout players get: since v2.3.4152 the
 * band at the bottom, src/ui/oneBand.js), in the world at
 * Frost Ridge, a greatsword and a bow, every binding driven by Playwright's
 * real mouse and keyboard:
 *   8.  (v2.3.3986) the minimap twice as big there: 264 px, 4,800 game px
 *       across, the world map's button over it;
 *   8a. the mouse wheel over the world: down the next weapon, up the one
 *       before; over the band it swaps nothing;
 *   8b. Q is the weapon's special (it raises no shield); F the Element Burst,
 *       G too, and F no longer the special;
 *   8c. the right button HELD raises the shield, facing the pointer, no
 *       browser menu; a left click while it is held is the shield bash (sent
 *       to the worker), not a swing; letting go lowers it (v2.3.3847: keeps
 *       it up, a toggle, and the next right press lowers it; with a snowman
 *       near it faces the snowman -- mp-shieldtoggle has the rest);
 *   8d. with no shield on the arm, the right button is the special, as it was;
 *   8e. D tapped twice quickly rolls; once, or twice slowly, does not
 *       (v2.3.6304: "quickly" by the page's own key times, DBL_TAP_MS);
 *   8f. a double click on a snowman, the bow in hand, ends locked on it (two
 *       single clicks used to lock and let go); with the sword it lunges at it;
 *   8g. no page errors.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';   /* v2.3.3986: the minimap's picture */
import { mkdirSync } from 'node:fs';
/* v2.3.6304: the minimap's sizes, the game's own (step 8) */
import { DBL_TAP_MS } from '../../../src/game/deskCombos.js';   /* v2.3.6304: step 8e's window, the game's own */
import { WHEEL_MINI_PX, WHEEL_MINI_BAND_K, WHEEL_MINI_DESK_K, WHEEL_MINI_WINDOW, WHEEL_MINI_DESK_WINDOW } from '../../../src/ui/wheelMiniSize.js';
export const lane = 'full';
const OUT = join(H.REPO, 'tools/qa/mp/out');

const DESK = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
/* src/game/deskKeys.js NAV_KEYS -- held to it in step 1 by what the page
   wears, so a change there that this file missed fails here */
/* v2.3.4172: five buttons (Gear, Bro, Quests, Codex, More); L opens the
   Life Skills page under Bro, and the Bro card's Life Skills row wears it
   (checked in step 2) */
const NAV = { dashboard: 'I', hero: 'P', quests: 'J', leaderboard: 'U', encyclopedia: 'K', more: 'O' };   /* v2.3.4393: U, the Leaderboards */

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
  /* v2.3.4172: + what Bro shows (heroSectionBus.shown: its card or a window) */
  const h = window.__btHeroSection;
  return b ? { mode: b.state.mode, root: b.state.stack[0], top: b.current(), fold: f ? f.getAttribute('data-dash-fold') : null, tab: h ? h.shown : null } : null;
});
const mapOpen = (P) => P.page.evaluate(() => !!(window.__btWorldMap && window.__btWorldMap.open) && !!document.querySelector('[data-world-map]'));
const key = async (P, k, ms = 450) => { await P.page.keyboard.press(k); await P.page.waitForTimeout(ms); };

export async function run(ctx) {
  await runKeys(ctx);
  await runLayout(ctx);
}

async function runKeys({ browser, wsPort, webPort, rec }) {
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
    rec.ok('the dashboard\'s buttons wear I P J U K O (v2.3.4172; v2.3.4393: U, the Leaderboards)',
      Object.keys(NAV).every((id) => shown(caps[id]) && caps[id].key === NAV[id]), caps);
    const mapCap = await capOf(P, '[data-world-map-open]');
    const mark = await P.page.evaluate(() => (window.__btWheelMini && window.__btWheelMini.mark) || null);
    rec.ok('the minimap wears M, just right of its "tap me" mark',
      shown(mapCap) && mapCap.key === 'M' && !!mark && parseFloat(mapCap.left) >= mark.x + mark.w
        && parseFloat(mapCap.left) <= mark.x + mark.w + 8 && Math.abs(parseFloat(mapCap.top) - mark.y) <= 2, { mapCap, mark });
    /* ═══ v2.3.6304 (card RR; docs/plan/census/RR-reds.md): THE BAND'S OWN KEYS ═══
       Since v2.3.4263 (the owner: "For desktop add the short list of
       shortcuts to the extra dashboard area on the right"), a computer under
       the one band (the default) lists its keys IN the band
       (KeyboardHintsPanel.jsx BandKeys, `[data-band-keys]`), with its own ⌨
       heading that H and a click fold and open, and the floating strip and
       its chip are not drawn at all (bandKeysActive).  Steps 1, 1b and 1c
       read that strip (`.bt-kb-hints`, `.bt-kb-chip`), so they were red on
       every run: they ask the same things of the list that stands in its
       place -- 1, 2 and 3 on it, clear of the bell, on the screen; the ⌨
       heading lit, what a click there reaches, one click folds it, one more
       opens it; on a window with no room beside the game, still in the band
       -- and that the old strip and chip are gone, as promised. */
    const bk1 = await bandKeys(P);
    /* v2.3.6291 (card HB2, PR 12; the planning session's yes, 2026-11-23: step 1's two lines only): this page is
       the upright COLUMN (no `bt-desk-wide`), where the band's key list is not drawn (game.css; bandKeysActive asks the
       same) and the column keeps its floating strip and its chip.  Both lines asked the opposite, of the 18 px list
       v2.3.6304 found there; the list's own checks (1, 2 and 3 on it, clear of the bell, on the screen, the heading)
       are step 8h's, on the computer's band. */
    rec.ok('the upright column draws no band keys list (v2.3.6291: it lists keys only on the computer\'s band)',
      !bk1.box, bk1);
    rec.ok('...and keeps its floating strip and its ⌨ chip (bandKeysActive is false there)', bk1.oldStrip && bk1.oldChip, bk1);
    /* its ⌨ heading, a click's fold and a narrow window: step 8h, on the
       layout players get (on this upright column the list is drawn 18 px
       wide and its heading has no size: a question for the planning
       session, docs/plan/status/RR.md) */

    /* ── 2. EACH KEY ITS PAGE, AND AGAIN TO CLOSE IT ── */
    for (const [id, k] of [['quests', 'J'], ['hero', 'P'], ['encyclopedia', 'K'], ['more', 'O']]) {
      await key(P, 'Key' + k);
      const on = await sheet(P);
      await key(P, 'Key' + k);
      const off = await sheet(P);
      rec.ok(`${k} opens ${id}, and ${k} again closes it`, !!on && on.mode === 'expanded' && on.root === id && !!off && off.mode === 'bar', { on, off });
    }
    /* v2.3.4172: L is the Life Skills page under Bro (the owner: "Lifeskills
       move inside Bro"); the Bro card's Life Skills row wears the L; L again
       closes it */
    await key(P, 'KeyP', 900);
    /* v2.3.6600 (card BRO): the Bro tab is pages; this door is on Progress */ await P.page.evaluate(() => { const c = window.__btBroCard; if (c && c.to) c.to({ to: 'progress' }); }); await P.page.waitForTimeout(300);
    const lCap = await capOf(P, '[data-bro-row="skills"]');
    await key(P, 'KeyP');
    await key(P, 'KeyL');
    const lOn = await sheet(P);
    await key(P, 'KeyL');
    const lOff = await sheet(P);
    rec.ok('L opens the Life Skills page under Bro (the card\'s Life Skills row wears the L), and L again closes it',
      !!lOn && lOn.mode === 'expanded' && lOn.root === 'hero' && lOn.top === 'skills' && shown(lCap) && lCap.key === 'L' && !!lOff && lOff.mode === 'bar', { lOn, lCap, lOff });
    await key(P, 'KeyJ');
    await key(P, 'KeyL');
    const swapped = await sheet(P);
    rec.ok('J then L: the Quests page gives way to Life Skills, under Bro', !!swapped && swapped.mode === 'expanded' && swapped.root === 'hero' && swapped.top === 'skills', swapped);
    await key(P, 'KeyI');
    const toBag = await sheet(P);
    rec.ok('I with a page open: back to the band at rest, where the bag is', !!toBag && toBag.mode === 'bar' && toBag.fold === 'open', toBag);
    await key(P, 'KeyI');
    const folded = await sheet(P);
    await key(P, 'KeyI');
    const unfolded = await sheet(P);
    rec.ok('I at rest folds the band away, and I brings it back', !!folded && folded.fold === 'min' && !!unfolded && unfolded.fold === 'open', { folded, unfolded });

    /* B, THE EMOTES (main's v2.3.3391 key): its button, the chat box's
       smiley, wears it, and the picker's ✕ wears Esc */
    const picker = () => P.page.evaluate(() => !!document.querySelector('[data-emote-picker]'));
    await P.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
    await P.page.waitForTimeout(700);
    const smileyCap = await capOf(P, '[data-chat-emotes]');
    await P.page.evaluate(() => window.__broChatBubbleBus.setOpen(false));
    await P.page.waitForTimeout(500);
    rec.ok('the chat box\'s smiley, the emotes\' button, wears B', shown(smileyCap) && smileyCap.key === 'B', smileyCap);
    await key(P, 'KeyB', 700);
    const e1 = await picker();
    const emoteX = await capOf(P, '[data-emote-close]');
    /* every button in the picker answers a click at its middle: the keys
       strip, outside the game's wrapper, painted over its second row */
    const reach = await P.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[data-emote-picker] button'));
      const hidden = all.filter((b) => {
        const r = b.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) return false;
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(at && (at === b || b.contains(at)));
      }).map((b) => b.getAttribute('aria-label') || b.textContent.trim().slice(0, 16));
      const strip = document.querySelector('.bt-kb-hints');
      const col = document.getElementById('root').getBoundingClientRect();
      const sr = strip ? strip.getBoundingClientRect() : null;
      return { buttons: all.length, hidden, strip: !!strip && getComputedStyle(strip).display !== 'none',
        /* v2.3.3526: in the margin it covers nothing, so it stays */
        margin: !!(strip && strip.getAttribute('data-kb-place') === 'side' && sr && sr.right <= col.left) };
    });
    rec.ok('...every button in it answers a click, the keys strip in the margin beside the game (or standing aside)',
      reach.buttons >= 8 && reach.hidden.length === 0 && (!reach.strip || reach.margin), reach);
    await key(P, 'Escape', 700);
    const e2 = await picker();
    await key(P, 'KeyB', 700);
    const e3 = await picker();
    await key(P, 'KeyB', 700);
    const e4 = await picker();
    const restB = await sheet(P);
    rec.ok('B opens the emotes, whose ✕ wears Esc', e1 && shown(emoteX) && emoteX.key === 'Esc', { e1, emoteX });
    rec.ok('...Esc closes them, B opens them again and B closes them, the band left as it was',
      !e2 && e3 && !e4 && !!restB && restB.mode === 'bar' && restB.fold === 'open', { e2, e3, e4, restB });

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
    await P.page.keyboard.type('jplkoibm', { delay: 40 });
    await P.page.waitForTimeout(500);
    const typed = await sheet(P);
    const words = await P.page.evaluate(() => { const i = document.querySelector('[data-chat-input]'); return i ? i.value : null; });
    rec.ok('typing "jplkoibm" in the chat opens no page, no map and no emotes',
      typing && words === 'jplkoibm' && !!typed && typed.mode === 'bar' && !(await mapOpen(P)) && !(await picker()), { typing, words, typed });
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
      || await H.talkToNpc(P, 'mayor_bro').then(() => P.page.waitForTimeout(800)).then(() => false).catch(() => false)   /* v2.3.4105: a second click on him (E never talks) */
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

/* ═══ 8. v2.3.3711: THE OWNER'S LAYOUT, BY THE REAL MOUSE AND KEYBOARD ═══ */
const WIDE = { width: 1280, height: 800 };
/* a world point on the page, and whether the world is what is there */
const pagePoint = (P, wx, wy) => P.page.evaluate(([x, y]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const px = cv.left + (x - S.camera.x) * S._worldScaleX, py = cv.top + (y - S.camera.y) * S._worldScaleY;
  const top = document.elementFromPoint(px, py);
  return { x: Math.round(px), y: Math.round(py), canvas: !!(top && top.classList && top.classList.contains('brotown-canvas')) };
}, [wx, wy]);
const snowmen = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ id: String(m.id), x: Math.round(m.x), y: Math.round(m.y), d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
    .sort((a, b) => a.d - b.d);
});
/* what the game holds now, for a before and after */
/* v2.3.6304: the band's own keys list, as a page draws it (steps 1 and 8h) */
const bandKeys = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-band-keys]'), head = el && el.querySelector('.bt-band-keys-head');
  const bell = document.querySelector('[data-world-chat-toggle]');
  const R = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? { l: r.left, r: r.right, t: r.top, b: r.bottom } : null; };
  const box = R(el), b = R(bell), h = R(head);
  const ov = (x, z) => !!(x && z && x.l < z.r && x.r > z.l && x.t < z.b && x.b > z.t);
  let onTop = false;
  if (h) { const at = document.elementFromPoint((h.l + h.r) / 2, (h.t + h.b) / 2); onTop = !!(at && (at === head || head.contains(at))); }
  const keys = el ? Array.from(el.querySelectorAll('.bt-band-keys-list kbd')).map((k) => k.textContent) : [];
  return { state: el ? el.getAttribute('data-band-keys') : null, keys, box, overBell: ov(box, b),
    onScreen: !!box && box.l >= 0 && box.t >= 0 && box.r <= innerWidth && box.b <= innerHeight,
    headKey: head ? (head.querySelector('kbd') || {}).textContent || null : null, lit: head ? head.getAttribute('aria-expanded') : null,
    onTop, at: h ? [Math.round((h.l + h.r) / 2), Math.round((h.t + h.b) / 2)] : null,
    oldStrip: !!document.querySelector('.bt-kb-hints'), oldChip: !!document.querySelector('.bt-kb-chip') };
});
const look = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, R = S.rpg || {}, lt = S.lockedTarget;
  return { slot: R.activeSlot || 'melee', swipe: S._lastSwipe || 0, burst: Math.max(S._lastBurstAt || 0, S._burstMsgAt || 0),
    up: !!S._shieldUp, mouse: !!S._shieldMouse, ang: typeof S._shieldAngle === 'number' ? S._shieldAngle : null,
    aim: typeof S._mouseAimAngle === 'number' ? S._mouseAimAngle : null, swing: S.swingTimer || 0,
    roll: !!S._dodgeRoll, rolls: S._dblTapRolls || 0, press: window.__btDeskPress || null, dbl: window.__btDeskDbl || null,
    lock: lt ? { id: lt.id != null ? String(lt.id) : null, src: lt.src || null } : null,
    sent: (window.__dkSent || []).slice(), menus: (window.__dkMenus || []).slice() };
});
const angGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

async function runLayout({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Desklayout', wsPort, webPort, viewport: WIDE, world: 'wheel', wide: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, desk: !!S._isDesktop }),
      (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'into the world' }).catch(() => null);
    /* v2.3.4152: the layout players get is the band at the bottom (the one
       band, the default): no keys strip, the band the window's width */
    const lay = await P.page.evaluate(() => ({ band: document.documentElement.classList.contains('bt-one-band'), wide: document.documentElement.classList.contains('bt-desk-wide'), strip: !!document.querySelector('.bt-desk-keys') }));
    rec.ok('8. a computer in the world, the layout players get -- the band at the bottom (guard)', !!inW && inW.desk && lay.band && lay.wide && !lay.strip, { inW, lay });
    if (!inW || !inW.desk) return;
    await H.closeNpcDialogue(P).catch(() => {});
    /* ── 8. v2.3.3986: THE MINIMAP, TWICE AS BIG ON A COMPUTER ──
       The owner: "make the mini map 100% + bigger/ double the size": 264 CSS
       px (a phone's 132 x 2), 4,800 game px across (1.5 x a phone's), flush
       in the canvas's top-right corner, the world map's button exactly over
       it and the M beside its "tap me" mark, scaled with it */
    {
      const mm = await P.page.waitForFunction(() => {
        const m = window.__btMinimap, r = window.__btWheelMini, b = document.querySelector('[data-world-map-open]');
        const cv = document.querySelector('canvas.brotown-canvas');
        if (!m || !m.wheel || !r || !b || !cv) return null;
        const br = b.getBoundingClientRect(), cr = cv.getBoundingClientRect();
        return { k: m.k, box: m.box, h: m.h, window: m.window, frame: m.frame, mapBottom: m.mapBottom, scale: m.scale, rect: r,
          btn: { l: Math.round(br.left), t: Math.round(br.top), w: Math.round(br.width), h: Math.round(br.height) }, canvasRight: Math.round(cr.right), plate: window.__btWheelPlate || null };
      }, null, { timeout: 30000, polling: 300 }).then((h) => h.jsonValue()).catch(() => null);
      /* v2.3.4152: twice as big in the side column's layout (?oneband=0);
         under the band (the default) the world is a third shorter and the
         minimap stays a phone's 132 px (wheelMiniSize.js) */
      /* v2.3.6304 (card RR): and since v2.3.4263 (the owner: "Make the
         desktop version of the minimap somewhat larger") a computer under the
         band draws it WHEEL_MINI_BAND_K (1.35x: 178 px), the window still a
         phone's 3,200 game px (src/ui/wheelMiniSize.js, read here, never
         typed); the check wanted the phone's 132 px and was red every run.
         The button's size is a whole px (178 of 178.2): held within 1. */
      const K = lay.band ? WHEEL_MINI_BAND_K : WHEEL_MINI_DESK_K, BOX = WHEEL_MINI_PX * K, WIN = lay.band ? WHEEL_MINI_WINDOW : WHEEL_MINI_DESK_WINDOW;
      const near = (a, b) => Math.abs(a - b) <= 0.01, px1 = (a, b) => Math.abs(a - b) <= 1;
      rec.ok(`8. the minimap is ${K === WHEEL_MINI_DESK_K ? 'twice as big on a computer' : `${K}x a phone's under the band`}: ${mm && mm.box} x ${mm && mm.h} px (k ${mm && mm.k}), ${mm && mm.window} game px across, flush right in the canvas, the world map's button over it (${mm && mm.btn && mm.btn.w} x ${mm && mm.btn && mm.btn.h}), its plate inside it`,
        !!mm && mm.k === K && near(mm.box, BOX) && near(mm.h, BOX) && mm.window === WIN && Math.abs(mm.scale - BOX / WIN) < 1e-9
          && Math.abs(mm.rect.left + mm.rect.w - mm.canvasRight) <= 1 && near(mm.rect.w, BOX) && mm.rect.mark
          && Math.abs(mm.btn.l - mm.rect.left) <= 1 && Math.abs(mm.btn.t - mm.rect.top) <= 1 && px1(mm.btn.w, BOX) && px1(mm.btn.h, BOX)
          && !!mm.plate && mm.plate.top >= mm.rect.top + mm.mapBottom && mm.plate.top + mm.plate.height <= mm.rect.top + mm.rect.h, mm);
      const r = mm && mm.rect;
      mkdirSync(OUT, { recursive: true });
      if (r) await P.page.screenshot({ path: join(OUT, 'deskkeys-minimap.png'), clip: { x: r.left - 8, y: Math.max(0, r.top - 8), width: r.w + 8, height: r.h + 16 } }).catch(() => {});
    }
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    const armed = await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.waitForTimeout(1200);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* what the page sends, and every browser menu asked for (and whether the
       game refused it) -- heard after the game's own listeners */
    await P.page.evaluate(() => {
      window.__btProbe = true;
      const S = window._gameState.current;
      window.__dkSent = [];
      const send = S.channel.send.bind(S.channel);
      S.channel.send = (m) => { try { window.__dkSent.push(m && m.type === 'ability' ? 'ability:' + (m.payload && m.payload.kind) : m && m.type); } catch (e) { /* the probe only */ } return send(m); };
      window.__dkMenus = [];
      document.addEventListener('contextmenu', (e) => window.__dkMenus.push(e.defaultPrevented));
    });
    const kit = await H.readState(P, (S) => ({ melee: !!(S.rpg && S.rpg.weapon), ranged: !!(S.rpg && S.rpg.rangedWeapon), slot: S.rpg && S.rpg.activeSlot }));
    rec.ok(`8. a greatsword and a bow (guard): ${JSON.stringify({ kit, armed })}`, kit.melee && kit.ranged && kit.slot === 'melee', { kit, armed });

    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });   /* mp-desklunge's spot: dry land (+420 is the water, where nothing fights) */
    await P.page.waitForTimeout(1500);
    const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    /* the pointer on the world, a little right of the bro */
    const aimPt = await pagePoint(P, here.x + 140, here.y + 10);
    await P.page.mouse.move(aimPt.x, aimPt.y);
    await P.page.waitForTimeout(400);

    /* ── 8a. THE WHEEL ── */
    const w0 = await look(P);
    await P.page.mouse.wheel(0, 100);
    await P.page.waitForTimeout(700);
    const w1 = await look(P);
    await P.page.mouse.wheel(0, -100);
    await P.page.waitForTimeout(700);
    const w2 = await look(P);
    rec.ok(`8a. the wheel over the world (${aimPt.canvas ? 'the canvas' : 'NOT the canvas'}): down the next weapon, up the one before (${w0.slot} -> ${w1.slot} -> ${w2.slot})`,
      aimPt.canvas && w0.slot === 'melee' && w1.slot === 'ranged' && w2.slot === 'melee', { w0: w0.slot, w1: w1.slot, w2: w2.slot, aimPt });
    /* v2.3.4152: over the band (the controls' column of the old layout,
       ?oneband=0, is gone with the side column) */
    const colBox = await P.page.evaluate(() => { const c = document.querySelector('.bt-desk-keys') || document.querySelector('.bt-dashboard'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + Math.min(r.height / 2, 20)) }; });
    if (colBox) { await P.page.mouse.move(colBox.x, colBox.y); await P.page.mouse.wheel(0, 100); await P.page.waitForTimeout(700); }
    const w3 = await look(P);
    rec.ok(`8a. ...over the band it swaps nothing (${w3.slot})`, !!colBox && w3.slot === 'melee', { colBox, slot: w3.slot });
    await P.page.mouse.move(aimPt.x, aimPt.y);
    await P.page.waitForTimeout(400);

    /* ── 8b. Q, F, G ── */
    await P.page.evaluate(() => { const R = window._gameState.current.rpg; R.mana = Math.max(R.mana || 0, 500); });
    const q0 = await look(P);
    await P.page.keyboard.press('q');
    await P.page.waitForTimeout(600);
    const q1 = await look(P);
    rec.ok('8b. Q fires no special (v2.3.4323: it is the shield\'s toggle; mp-shieldtoggle has it up and down)',
      q1.swipe === q0.swipe && !q1.sent.slice(q0.sent.length).includes('ability_use'), { q0: q0.swipe, q1: q1.swipe, sent: q1.sent.slice(q0.sent.length), up: q1.up });
    await P.page.keyboard.press('q');   /* ... and lowers it */
    await P.page.waitForTimeout(500);
    await P.page.waitForTimeout(1700);   /* the special's 1.5 s cooldown */
    const f0 = await look(P);
    await P.page.keyboard.press('f');
    await P.page.waitForTimeout(600);
    const f1 = await look(P);
    await P.page.waitForTimeout(900);   /* the burst's refusal speaks once in 700 ms */
    await P.page.keyboard.press('g');
    await P.page.waitForTimeout(600);
    const g1 = await look(P);
    rec.ok('8b. F is the Element Burst (it was asked: cast or refused), and no longer the special; G still the burst',
      f1.burst > f0.burst && f1.swipe === f0.swipe && g1.burst > f1.burst, { f0, f1: [f1.burst, f1.swipe], g1: g1.burst });

    /* ── 8c. THE RIGHT BUTTON HELD, AND A CLICK WITH IT ── */
    const shieldOn = await P.page.evaluate(() => {
      const R = window._gameState.current.rpg;
      if (!R.shield) R.shield = (R.shieldStash || []).length ? R.shieldStash[0] : { name: 'Pine Shield', type: 'shield', gearBase: 'wood', tierMult: 1, def: 1 };
      return !!R.shield;
    });
    await P.page.waitForTimeout(400);
    const upPt = await pagePoint(P, here.x - 10, here.y - 160);   /* the pointer above the bro */
    await P.page.mouse.move(upPt.x, upPt.y);
    await P.page.waitForTimeout(500);
    const r0 = await look(P);
    await P.page.keyboard.press('q');   /* v2.3.4323: Q toggles the shield now */
    await P.page.waitForTimeout(700);
    const r1 = await look(P);
    /* v2.3.3847: with a snowman near the guard faces it, not the pointer
       (mp-shieldtoggle step 7 holds that, and the pointer with nothing near) */
    const nearMon = await P.page.evaluate(() => { const S = window._gameState.current, p = S.player;
      return (S.monsters || []).some((m) => m && m.alive !== false && Math.hypot(m.x - p.x, m.y - p.y) < 600); });
    rec.ok(`8c. the right button pressed raises the shield (press: ${r1.press && r1.press.kind}), facing the pointer${nearMon ? ' or, a snowman near, the snowman' : ''} (shield ${r1.ang && r1.ang.toFixed(2)}, aim ${r1.aim && r1.aim.toFixed(2)})`,
      shieldOn && r1.up && r1.mouse && r1.press && r1.press.kind === 'shield' && r1.ang != null && r1.aim != null && (nearMon || (angGap(r1.ang, r1.aim) < 0.35 && r1.aim < 0)), { r1, nearMon });
    rec.ok(`8c. ...and no browser menu: every one asked for was refused (${JSON.stringify(r1.menus)})`, r1.menus.every((p) => p === true), r1.menus);
    await P.page.mouse.down({ button: 'left' });
    await P.page.waitForTimeout(150);
    await P.page.mouse.up({ button: 'left' });
    await P.page.waitForTimeout(600);
    const r2 = await look(P);
    const bashSent = r2.sent.slice(r1.sent.length);
    /* what the pointer is over after the bash (a failure below names it) */
    const atUp = await P.page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); return t ? t.tagName.toLowerCase() + (typeof t.className === 'string' && t.className ? '.' + t.className.trim().split(/\s+/).join('.') : '') + Array.from(t.attributes || []).filter((a) => a.name.startsWith('data-')).map((a) => '[' + a.name + ']').join('') : null; }, [upPt.x, upPt.y]);
    console.log('    8c: over the pointer after the bash: ' + atUp + ' at ' + JSON.stringify(upPt));
    /* the press was the bash's (kind 'bash' is set before the swing's path,
       which it returns ahead of); the bash's own pose moves swingTimer, so
       that clock says nothing here */
    rec.ok(`8c. a left click while it is held is the shield bash (press: ${r2.press && r2.press.kind}; sent ${JSON.stringify(bashSent)}), not a swing`,
      r2.press && r2.press.kind === 'bash' && bashSent.includes('ability:bash'), { press: r2.press, bashSent });
    /* (no release: a toggle) */
    await P.page.waitForTimeout(600);
    const r3 = await look(P);
    /* v2.3.3847: a toggle -- the release keeps it up, the next press lowers it */
    await P.page.keyboard.press('q');   /* v2.3.4323: Q toggles the shield now */
    await P.page.waitForTimeout(150);
    /* (no release: a toggle) */
    await P.page.waitForTimeout(600);
    const r3b = await look(P);
    rec.ok(`8c. letting the right button go keeps the shield up (a toggle, v2.3.3847); the next right press lowers it (press: ${r3b.press && r3b.press.kind})`,
      r3.up && !r3b.up && r3b.press && r3b.press.kind === 'shield-down', { r3, r3b });

    /* ── 8d. NO SHIELD: THE RIGHT BUTTON IS THE SPECIAL, AS IT WAS ── */
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.shield = null; S.rpg.mana = Math.max(S.rpg.mana || 0, 500); S._lastSwipe = 0; });
    await P.page.waitForTimeout(400);
    const n0 = await look(P);
    await P.page.mouse.down({ button: 'right' });   /* v2.3.4323: the right button is the special, shield or none */
    await P.page.waitForTimeout(150);
    await P.page.mouse.up({ button: 'right' });
    await P.page.waitForTimeout(600);
    const n1 = await look(P);
    rec.ok(`8d. the right button is the special (press: ${n1.press && n1.press.kind})`,
      n1.press && n1.press.kind === 'special' && n1.swipe > n0.swipe && !n1.up, { n0: n0.swipe, n1 });

    /* ── 8e. A DIRECTION TAPPED TWICE ── */
    await P.page.waitForTimeout(1200);
    /* v2.3.6304 (card RR; TRAPS §200): the page's own clock decides whether
       a pair WAS quick.  The game rolls on a second tap of a direction within
       DBL_TAP_MS (250 ms, src/game/deskCombos.js), read off each key's own
       event; on a session box two key presses with nothing between them
       reached the page 294 ms apart (every run), so it never saw a double
       tap and the check went red.  Up to three pairs are tried; a pair the
       page received within DBL_TAP_MS must roll (a FAIL if it does not); if
       none came that quickly, the box could not play the step: a SKIP that
       names the gaps it measured.  The single tap and the slow pair are
       checked as before, either way. */
    await P.page.evaluate(() => {
      window.__dkTaps = [];
      window.addEventListener('keydown', (e) => { if (!e.repeat) window.__dkTaps.push([e.key, Math.round(e.timeStamp)]); }, true);
    });
    const d0 = await look(P);
    let d1 = d0, quickGap = null;
    const gaps = [];
    for (let tryN = 0; tryN < 3 && quickGap == null; tryN++) {
      if (tryN) await P.page.waitForTimeout(1500);
      const before = await look(P);
      const n0 = await P.page.evaluate(() => window.__dkTaps.length);
      /* two taps as quick as a player's (this box's round trips are slow: no
         waits between them), each key's own time read off its event */
      await P.page.keyboard.down('d'); await P.page.keyboard.up('d');
      await P.page.keyboard.down('d'); await P.page.keyboard.up('d');
      await P.page.waitForTimeout(60);
      const after = await look(P);
      const pair = await P.page.evaluate((n) => window.__dkTaps.slice(n).filter((t) => t[0] === 'd').slice(0, 2), n0);
      const gap = pair.length === 2 ? pair[1][1] - pair[0][1] : null;
      gaps.push(gap);
      if (gap != null && gap <= DBL_TAP_MS) { quickGap = gap; d1 = after; d1.from = before.rolls; }
      else d1 = after;
    }
    await P.page.waitForTimeout(1500);
    await P.page.keyboard.press('d', { delay: 40 });
    await P.page.waitForTimeout(500);
    const d2 = await look(P);
    await P.page.keyboard.press('a', { delay: 40 });
    await P.page.waitForTimeout(420);
    await P.page.keyboard.press('a', { delay: 40 });
    await P.page.waitForTimeout(400);
    const d3 = await look(P);
    const taps = await P.page.evaluate(() => window.__dkTaps || []);
    if (quickGap == null) {
      rec.skip(`8e. D tapped twice quickly rolls`, `the page received every pair slower than DBL_TAP_MS (${DBL_TAP_MS} ms): ${gaps.join(', ')} ms apart -- this box could not play the step (TRAPS §200)`);
    } else {
      rec.ok(`8e. D tapped twice quickly (${quickGap} ms apart, within ${DBL_TAP_MS}) rolls (rolls ${d1.from} -> ${d1.rolls})`,
        d1.rolls === d1.from + 1, { d0: d0.rolls, d1: [d1.from, d1.rolls, d1.roll], gaps, taps });
    }
    rec.ok(`8e. ...one more tap, or A twice slowly, does not roll (${d1.rolls} -> ${d2.rolls}, ${d3.rolls})`,
      d2.rolls === d1.rolls && d3.rolls === d1.rolls, { d1: d1.rolls, d2: d2.rolls, d3: d3.rolls, taps });

    /* ── 8f. A DOUBLE CLICK ON A SNOWMAN ── */
    await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch(() => null);
    await P.page.waitForTimeout(800);
    await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
    let ms = await snowmen(P);
    const onMonster = async (m) => {
      const p = await P.page.evaluate((mid) => {
        const S = window._gameState.current;
        const q = (S.monsters || []).find((z) => z && String(z.id) === mid);
        return q ? { x: q.x, y: q.y - 28 } : null;
      }, m.id);
      return p ? pagePoint(P, p.x, p.y) : null;
    };
    const mb = ms.find((m) => m.d < 520) || ms[0];
    const pb = mb ? await onMonster(mb) : null;
    if (pb) await P.page.mouse.dblclick(pb.x, pb.y, { delay: 40 });
    await P.page.waitForTimeout(800);
    const b1 = await look(P);
    rec.ok(`8f. the bow in hand, a double click on a snowman (${mb && mb.id}, ${mb && mb.d} px) ends locked on it: ${JSON.stringify(b1.lock)}`,
      !!pb && pb.canvas && !!b1.lock && b1.lock.id === mb.id && b1.lock.src === 'tap' && !!b1.dbl && b1.dbl.id === mb.id, { b1: b1.lock, dbl: b1.dbl, pb });
    /* the sword: the double click's lunge (the first press's, or its own) */
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.waitForTimeout(800);
    /* the bash and the rolls spent stamina: topped up, and the lunge ready */
    await H.devOp(wsPort, 'vitals', me, { heal: true }).catch(() => {});
    const ready = await H.waitFor(P, () => (window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null),
      (st) => !!st && st.visible && st.equipped && st.afford && st.cdLeft === 0, { timeout: 30000, label: 'the lunge ready' }).catch(() => null);
    /* a snowman at a lunge's distance (one at your feet is struck where it
       stands, no dash): step back from them first if they crowd you */
    ms = await snowmen(P);
    if (!ms.some((m) => m.d >= 110 && m.d < 400) && ms[0]) {
      const me2 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const k = 230 / Math.max(1, ms[0].d);
      await H.hopTo(P, ms[0].x + (me2.x - ms[0].x) * k, ms[0].y + (me2.y - ms[0].y) * k, { tries: 20 });
      await P.page.waitForTimeout(600);
      ms = await snowmen(P);
    }
    const mm = ms.find((m) => m.d >= 110 && m.d < 400) || ms[0];
    const pm = mm ? await onMonster(mm) : null;
    await P.page.evaluate(() => {
      const S = window._gameState.current, w = { dash: null };
      window.__dkDash = w;
      const tick = () => { if (window.__dkDash !== w) return; if (S._bashDash && !w.dash) w.dash = String(S._bashDash.targetId); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    if (pm) await P.page.mouse.dblclick(pm.x, pm.y, { delay: 40 });
    await P.page.waitForTimeout(900);
    const s1 = await look(P);
    const dash = await P.page.evaluate(() => { const w = window.__dkDash; window.__dkDash = null; return w ? w.dash : null; });
    rec.ok(`8f. the sword in hand, a double click on a snowman (${mm && mm.id}, ${mm && mm.d} px) lunges at it (the dash left for ${dash}) and ends locked on it: ${JSON.stringify(s1.lock)}`,
      !!pm && pm.canvas && dash === mm.id && !!s1.lock && s1.lock.id === mm.id, { dash, lock: s1.lock, dbl: s1.dbl, press: s1.press, pm, ready });

    /* ── 8h. v2.3.6304: THE BAND'S KEYS, ITS ⌨ HEADING (the narrow page's 1b and 1c, moved here) ── */
    const bk1 = await bandKeys(P);
    rec.ok('8h. the band\'s keys list\'s ⌨ heading wears H, lit while the list is open, and is what a click there reaches',
      bk1.headKey === 'H' && bk1.lit === 'true' && bk1.onTop && !!bk1.at
        && ['1', '2', '3'].every((k) => bk1.keys.includes(k)) && !bk1.overBell && bk1.onScreen, bk1);   /* v2.3.6291: + step 1's old list checks (1, 2, 3, the bell, the screen), moved here with the list */
    if (bk1.at) await P.page.mouse.click(bk1.at[0], bk1.at[1]);
    await P.page.waitForTimeout(400);
    const bk2 = await bandKeys(P);
    if (bk2.at) await P.page.mouse.click(bk2.at[0], bk2.at[1]);
    await P.page.waitForTimeout(400);
    const bk3 = await bandKeys(P);
    rec.ok('8h. ...one click on it folds the list to its heading (unlit), one more opens it again',
      bk2.state === 'folded' && bk2.lit === 'false' && bk2.keys.length === 0 && bk3.state === 'open' && bk3.lit === 'true' && bk3.keys.length > 0, { bk2, bk3 });
    await P.page.setViewportSize({ width: 1000, height: 1200 });
    await P.page.waitForTimeout(900);
    const bkNarrow = await bandKeys(P);
    await P.page.setViewportSize(WIDE);
    await P.page.waitForTimeout(900);
    const bkWide = await bandKeys(P);
    rec.ok('8h. ...on a window with no room beside the game (1000 x 1200) the list is still in the band, open and on the screen, and so on this one again',
      bkNarrow.state === 'open' && bkNarrow.onScreen && !bkNarrow.oldStrip && bkWide.state === 'open' && bkWide.onScreen && !bkWide.oldStrip, { bkNarrow, bkWide });

    rec.ok('8g. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
