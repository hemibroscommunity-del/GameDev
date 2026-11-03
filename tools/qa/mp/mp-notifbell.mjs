/* THE BELL MOVED INTO MORE (v2.3.4082; the corner's bell was v2.3.2155).
 *
 * The owner, adopting the review of his dashboard: "The notification bell
 * could also move to More, retaining an unread badge."  The bell was the World
 * Chat feed's shut state, a 36px button in the lower-left corner over the
 * movement pad.  Now:
 *   1. shut, the corner draws NOTHING (no bell, no shell over the pad);
 *   2. the unread count rides the More button;
 *   3. ...and More's Notifications tile;
 *   4. the Notifications page lists the lines (newest first) and opening it
 *      clears the count;
 *   5. "Show on screen" opens the World Chat feed in the corner, over the
 *      world, left half, above the band, and the disc stays uncovered;
 *   6. a real touch on a message folds the feed away again (v2.3.2325), into
 *      More -- the corner is empty once more;
 *   7. a line that arrives while shut counts again on More.
 * The old scenario measured the bell's footprint on the pad; with no bell the
 * pad's question is whether the corner is empty, which (1) and (6) ask.
 */
import * as H from './harness.mjs';

const look = (P) => P.page.evaluate(() => {
  const shell = document.querySelector('[data-world-chat]');
  const list = document.querySelector('[data-world-chat-lines]');
  const more = document.querySelector('.bt-navrail [data-nav="more"]');
  const badge = more ? [...more.querySelectorAll('span')].find((s) => /^\d+\+?$/.test((s.textContent || '').trim())) : null;
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const nav = document.querySelector('.bt-navrail');
  return {
    shell: !!shell, list: r(list), lines: list ? Number(list.getAttribute('data-world-chat-lines')) : 0,
    moreBadge: badge ? badge.textContent.trim() : null,
    navTop: nav ? nav.getBoundingClientRect().top : null,
    vw: window.innerWidth, vh: window.innerHeight,
  };
});

const touchAt = async (P, x, y, drift = 4) => {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, 40));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + drift, y: y + drift - 1 }] });
  await new Promise((r) => setTimeout(r, 40));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
};

const pushLines = (P, n, tag) => P.page.evaluate(([k, t]) => {
  const S = window._gameState && window._gameState.current;
  if (!S) return;
  S.chatLog = S.chatLog || [];
  for (let i = 0; i < k; i++) {
    S.chatLog.push({ name: 'Crowd' + (i % 4), text: t + ' line ' + i + ' of what a busy world chat looks like', ts: Date.now() + i });
  }
  try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) { /* no bus */ }
}, [n, tag]);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bellringer', wsPort, webPort, world: 'wheel',
    touch: true, viewport: { width: 390, height: 844 }, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await pushLines(P, 12, 'first');
  await P.page.waitForTimeout(1200);

  /* ── 1. shut: nothing in the corner ── */
  const shut = await look(P);
  rec.ok('1. shut, the corner draws nothing at all: no bell, no shell over the movement pad', shut.shell === false && shut.list === null, shut);

  /* ── 2. the More button carries the count ── */
  rec.ok(`2. the More button carries the unread count (${shut.moreBadge})`, !!shut.moreBadge && (shut.moreBadge === '9+' || Number(shut.moreBadge) >= 1), shut);

  /* ── 3. ...and so does the Notifications tile ── */
  await H.openDest(P, 'More');
  await P.page.waitForTimeout(700);
  const tile = await P.page.evaluate(() => {
    const t = document.querySelector('.bt-dashboard [data-more-tile="notifications"]');
    const b = t && t.querySelector('[data-more-badge]');
    return { tile: !!t, badge: b ? Number(b.getAttribute('data-more-badge')) : 0, label: t ? (t.textContent || '').replace(/­/g, '') : '' };
  });
  rec.ok(`3. More has a Notifications tile with the same count (${tile.badge})`, tile.tile && tile.badge >= 12 && /Notifications/.test(tile.label), tile);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/notifbell-more.png` }).catch(() => {});

  /* ── 4. the page: the lines, newest first; opening clears the count ── */
  await P.page.evaluate(() => {
    const t = document.querySelector('.bt-dashboard [data-more-tile="notifications"]');
    if (t) t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(700);
  const page = await P.page.evaluate(() => {
    const l = document.querySelector('[data-notif-lines]');
    const rows = l ? [...l.children].map((c) => c.textContent || '') : [];
    const b = window.__broDashPanelBus;
    return { n: l ? Number(l.getAttribute('data-notif-lines')) : 0, first: rows.slice(0, 3).join(' | '), stack: b ? b.state.stack.join(',') : '' };
  });
  rec.ok(`4. More -> Notifications lists the lines, newest first (${page.n})`, page.stack === 'more,notifications' && page.n >= 12 && /first line 11\b/.test(page.first), page);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/notifbell-page.png` }).catch(() => {});
  const cleared = await look(P);
  rec.ok('4b. ...and opening it clears the More button\'s count', cleared.moreBadge === null, cleared);

  /* ── 5. Show on screen: the feed in the corner ── */
  await P.page.click('[data-notif-onscreen="off"]').catch(() => {});
  await P.page.waitForTimeout(300);
  await H.closeDest(P);
  await P.page.waitForTimeout(600);
  const open = await look(P);
  rec.ok('5. "Show on screen" opens the World Chat feed in the corner', open.shell && !!open.list && open.lines >= 12, open);
  rec.ok('5b. ...in the left half, above the band', !!open.list && open.list.x + open.list.w <= open.vw * 0.75
    && (open.navTop === null || open.list.y + open.list.h <= open.navTop + 1), open);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/notifbell-feed.png` }).catch(() => {});

  /* ── 6. a real touch on a message folds it away, into More ── */
  if (open.list) await touchAt(P, open.list.x + open.list.w / 2, open.list.y + open.list.h / 2);
  await P.page.waitForTimeout(700);
  const folded = await look(P);
  rec.ok('6. a real touch on a message folds the feed away: the corner is empty again', folded.shell === false, folded);

  /* ── 7. a new line while shut counts on More again ── */
  await pushLines(P, 2, 'later');
  await P.page.waitForTimeout(900);
  const again = await look(P);
  rec.ok(`7. a line that arrives while shut counts on the More button (${again.moreBadge})`, again.moreBadge === '2', again);

}
