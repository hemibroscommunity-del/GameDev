/* ═══ ON A COMPUTER, "TAP" READS "CLICK" (v2.3.3612) ═══
 *
 * The owner's list of 2026-10-26 (docs/OWNER-LIST-2026-10-26.md): the judges
 * play the DESKTOP version.  On a computer the very first instruction read
 * "Follow the gold road on your map, then tap him."  game/deskWords.js swaps
 * the word as it is shown, under a mouse only (docs/specs/desktop-words.md).
 * On a real page, 1440 x 900 with a mouse:
 *   1. the WELCOME plate says "then click him.";
 *   2. the coach's first card, past the welcome, says no "tap";
 *   3. Mayor Bro's lines, each one through Next, and his quest offer: no "tap";
 *   4. the dashboard's six pages (I P J L K O), the quest's own page, every
 *      page under More and every building's window: no "tap" in anything
 *      shown, a tooltip or a box's placeholder;
 *   5. on a phone the WELCOME plate still says "then tap him." -- a phone's
 *      words are as written;
 *   6. no page errors.
 * "TAP" in capitals (the trap button's own name) is not the word.
 */
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Every "tap" a player can read: shown text, tooltips, placeholders. */
const tapsShown = (P) => P.page.evaluate(() => {
  const re = /\b[Tt]ap(s|ped|ping)?\b/;
  const out = [];
  const seen = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.nodeValue || '';
    if (re.test(t) && n.parentElement && n.parentElement.tagName !== 'SCRIPT' && n.parentElement.tagName !== 'STYLE'
      && seen(n.parentElement)) out.push(t.trim().slice(0, 140));
  }
  for (const el of document.querySelectorAll('[placeholder], [title]')) {
    for (const a of ['placeholder', 'title']) {
      const v = el.getAttribute(a);
      if (v && re.test(v) && seen(el)) out.push(a + ': ' + v.slice(0, 140));
    }
  }
  return out;
});
const welcomeText = (P) => P.page.evaluate(() => {
  const w = document.querySelector('[data-quest-banner="welcome"]');
  return w ? w.innerText.replace(/\s+/g, ' ').trim() : null;
});
async function waitWelcome(P, ms = 30000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const t = await welcomeText(P);
    if (t && /gold road/.test(t)) return t;
    await P.page.waitForTimeout(150);
  }
  return welcomeText(P);
}
const key = async (P, k, ms = 500) => { await P.page.keyboard.press(k); await P.page.waitForTimeout(ms); };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Deskwords', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);

    /* ── 1. THE WELCOME ── */
    const w = await waitWelcome(P);
    const mouse = await P.page.evaluate(() => matchMedia('(pointer:fine)').matches);
    rec.ok(`1. a computer (a mouse: ${mouse}); the WELCOME plate says "click him" ("${w}")`,
      mouse && !!w && /then click him\./.test(w) && !/\btap\b/i.test(w), w);

    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the world' }).catch(() => null);

    /* ── 2. THE COACH'S FIRST CARD ── */
    await H.pastWelcome(P).catch(() => false);
    await P.page.waitForTimeout(1200);
    const coach = await P.page.evaluate(() => {
      const c = document.querySelector('[data-coach-dismiss]');
      const card = c && c.closest('div');
      return card ? card.parentElement.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
    });
    const t2 = await tapsShown(P);
    rec.ok(`2. past the welcome (the coach: "${coach}"), no "tap" on the screen`, t2.length === 0, t2);

    /* ── 3. MAYOR BRO'S LINES AND HIS OFFER ── */
    await H.closeNpcDialogue(P).catch(() => {});
    const talking = await H.approachNpc(P, 'mayor_bro').catch(() => false) || await H.npcDialogueOpen(P);
    const said = [];
    const lines = [];
    const taps3 = [];
    for (let i = 0; i < 16; i++) {
      const s = await P.page.evaluate(() => {
        const t = document.querySelector('.bt-npcdlg-text');
        return { text: t ? t.textContent : null, offer: !!document.querySelector('.bt-qoffer') };
      });
      if (s.text && !lines.includes(s.text)) lines.push(s.text);
      for (const t of await tapsShown(P)) taps3.push(t);
      said.push(s);
      if (s.offer) break;
      await key(P, 'Enter', 550);
    }
    const offered = said.some((s) => s.offer);
    rec.ok(`3. Mayor Bro's ${lines.length} line(s) and his offer${offered ? '' : ' (not reached)'}: no "tap"`,
      !!talking && lines.length > 0 && offered && taps3.length === 0, { taps3, lines });
    await key(P, 'Enter', 1500);   /* Accept Quest */
    await H.closeNpcDialogue(P).catch(() => {});
    await H.leaveNpc(P, 'mayor_bro').catch(() => {});
    await P.page.waitForTimeout(600);

    /* ── 4. THE SIX PAGES, AND THE QUEST'S OWN ── */
    await H.unfoldBand(P).catch(() => {});
    const pages = {};
    for (const k of ['i', 'p', 'j', 'l', 'k', 'o']) {
      await key(P, k, 900);
      pages[k.toUpperCase()] = await tapsShown(P);
      if (k === 'j') {
        const row = await P.page.evaluate(() => {
          const b = document.querySelector('[data-quest-row="tut_1"]') || document.querySelector('[data-quest-row]');
          if (!b) return null;
          b.click();
          return b.getAttribute('data-quest-row');
        });
        await P.page.waitForTimeout(900);
        pages['quest ' + row] = await tapsShown(P);
        await key(P, 'Escape', 600);
      }
      await key(P, k, 700);   /* the same key shuts it */
    }
    /* and every page under More, one tile at a time (Esc is back a step) */
    await key(P, 'o', 900);
    const tiles = await P.page.$$eval('[data-more-tile]', (els) => els.map((el) => el.getAttribute('data-more-tile')));
    for (const id of tiles) {
      await P.page.evaluate((t) => {
        const b = document.querySelector('[data-more-tile="' + t + '"]');
        if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      }, id);
      await P.page.waitForTimeout(900);
      pages['More: ' + id] = await tapsShown(P);
      await key(P, 'Escape', 600);
      if (!(await P.page.$('[data-more-tile]'))) await key(P, 'o', 800);
    }
    await key(P, 'Escape', 500);
    await key(P, 'Escape', 500);
    /* and every building's window (the forge, the shops, the Gem Works, the
       halls), opened by the game's own setter, its tabs as they open */
    const WINDOWS = ['forge', 'exchange', 'bank', 'party', 'woodwork', 'gemcut', 'cook', 'enchant', 'gamble', 'farm',
      'farmhome', 'post', 'sheriff', 'guildhall', 'townhall', 'hotel', 'auctionhouse'];
    const opened = [];
    for (const w of WINDOWS) {
      await P.page.evaluate((p) => window.__btBuildingWindow && window.__btBuildingWindow.open(p), w);
      await P.page.waitForTimeout(900);
      /* the window is really up: its card names it (mp-buildingrooms' way) */
      if (await P.page.evaluate((p) => { const c = document.querySelector('.bt-inspect-card'); return !!c && c.getAttribute('data-building-panel') === p; }, w)) opened.push(w);
      pages['window: ' + w] = await tapsShown(P);
      await P.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open(null));
      await P.page.waitForTimeout(300);
    }
    const bad = Object.entries(pages).filter(([, v]) => v.length);
    rec.ok(`4. the six pages, the quest's page, More's ${tiles.length} pages and ${opened.length} of ${WINDOWS.length} building windows (${Object.keys(pages).length} in all): no "tap"`,
      Object.keys(pages).length >= 7 + 8 + WINDOWS.length && opened.length === WINDOWS.length && bad.length === 0, bad.length ? Object.fromEntries(bad) : { pages: Object.keys(pages), shut: WINDOWS.filter((w) => !opened.includes(w)) });
    rec.ok('6. no page errors (the computer)', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── 5. A PHONE'S WORDS ARE AS WRITTEN ── */
  const Q = await H.newPlayer(browser, { name: 'Deskwordsphone', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const qErrors = [];
  Q.page.on('pageerror', (e) => qErrors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(Q);
    const w = await waitWelcome(Q);
    const coarse = await Q.page.evaluate(() => !matchMedia('(pointer:fine)').matches);
    rec.ok(`5. a phone (no mouse: ${coarse}); the WELCOME plate still says "tap him" ("${w}")`,
      coarse && !!w && /then tap him\./.test(w), w);
    rec.ok('6. no page errors (the phone)', qErrors.length === 0, qErrors.slice(0, 3));
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
