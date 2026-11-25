/* ═══ THE RANKS PAGE IN THE OWNER'S NEW STYLE (v2.3.5503, card LB part 2) ═══
 *
 * The owner, 2026-11-25, with one mockup: "Also I prefer changing the
 * leaderboard style to something like this" (src/ui/mobile/dash/
 * RanksPage.jsx; its rules src/game/ranksPage.js, ranks-page.test).
 *
 * One real phone (390 x 844, touch) in the Wheel's BroTown against a real
 * worker, and four plain-socket players so the board has rows:
 *   1. Ranks opens ONE board: four tabs across the top (Power, Stats,
 *      Records, Skills), each its picture and word, Power gold; under them
 *      the picker naming the open board, "RANKS" between the laurels and the
 *      span's tag; the heads #, Player, Lv and the board's word;
 *   2. the picker opens the list of the tab's boards (44 px each, a ✕ that
 *      Escape presses); a pick opens that board and shuts the list;
 *   3. rows 1-3 on the gold, silver and bronze bars with the laurel medals,
 *      a crown by the leader; 4 and below the plain number; your row pinned
 *      at the foot, "Rank #N";
 *   4. every tab, and every board of each through the picker, opens (a
 *      table, its records, or a line saying nobody is on it): every board of
 *      the old list, none dropped;
 *   5. a long board (served by the test in the worker's shape): only the
 *      rows scroll -- the tabs, the picker, the heads and your row stay in
 *      view; the band keeps today's height, and the first three rows (gold,
 *      silver, bronze) show at 390 x 844 and at 375 x 667; off the board
 *      your row says "Rank #—";
 *   6. sideways (844 x 390, a band 82 px tall): the tabs, the picker and
 *      your row share the top line, two rows show, all inside;
 *   7. a computer (1440 x 900, `wide: true`): the same page in the band's
 *      box, the tabs inside it;
 *   8. `?rankstyle=0` gives back the page before (the list down the left);
 *   9. no page errors.
 * Pictures (deviceScaleFactor 2): docs/shots/ranks-*.png
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const TABS = ['power', 'stats', 'records', 'skills'];

/* a plain-socket player: joins and answers pings (its join reports its row) */
async function bot(wsPort, room, { id, name, device, look }) {
  const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${encodeURIComponent(room)}&rf=1`);
  let synced = null;
  const got = new Promise((res) => { synced = res; });
  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string' || ev.data.startsWith('{"type":"tick"')) return;
    let m = null;
    try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'ping') { try { ws.send(JSON.stringify({ type: 'pong', ts: m.ts })); } catch { /* gone */ } return; }
    if (m.type === 'state_sync') synced(true);
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('bot socket failed')); });
  ws.send(JSON.stringify({
    type: 'join', id, name, phrase: 'p-' + id, device: { id: device }, protocolVersion: 2, httpAuth: true, ws: [1, 5],
    data: { x: 1000, y: 1000, d: 'south', z: 'town', name, ...(look || {}) },
  }));
  const ok = await Promise.race([got, new Promise((r) => setTimeout(() => r(false), 15000))]);
  return { ok, close: () => { try { ws.close(); } catch { /* gone */ } } };
}

/* a real tap: the element at its own centre must be it */
async function tap(P, sel, timeout = 8000) {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'attached', timeout });
  const verdict = await loc.evaluate((el) => {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (!top) return 'nothing at its centre';
    return el === top || el.contains(top) ? 'ok' : 'covered by <' + top.tagName.toLowerCase() + ' class="' + (top.className || '') + '">';
  });
  if (verdict !== 'ok') throw new Error(sel + ' is not tappable: ' + verdict);
  await loc.click({ force: true });
}

/* what the page shows */
const look = (P) => P.page.evaluate(() => {
  const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const loaded = (img) => !!img && img.complete && img.naturalWidth > 0;
  const pg = document.querySelector('[data-lb-page]');
  const list = document.querySelector('[data-lb-rows]');
  const lb = box(list);
  const tabs = [...document.querySelectorAll('[data-lb-tab]')].map((b) => ({
    id: b.dataset.lbTab, on: b.getAttribute('aria-selected') === 'true', box: box(b), icon: loaded(b.querySelector('img')),
    word: ((b.querySelector('[data-lb-tab-word]') || {}).textContent || '').trim(),
    cut: (() => { const w = b.querySelector('[data-lb-tab-word]'); return !!w && w.scrollWidth > w.clientWidth + 1; })(),
    bar: (b.querySelector('[data-lb-bar]') || { dataset: {} }).dataset.lbBar || null,
  }));
  const picker = document.querySelector('[data-lb-picker]');
  const title = document.querySelector('[data-lb-title]');
  const head = [...document.querySelectorAll('[data-lb-head] [data-lb-head-col]')].map((e) => e.textContent.trim());
  const rows = [...document.querySelectorAll('[data-lb-board] [data-board-row]')].map((el) => {
    const medal = el.querySelector('[data-rank-medal] img'), bar = el.querySelector(':scope > [data-lb-bar]');
    return {
      rank: +el.dataset.boardRow, box: box(el), name: ((el.querySelector('[data-board-name]') || {}).textContent || '').trim(),
      medal: medal ? (loaded(medal) ? +el.querySelector('[data-rank-medal]').dataset.rankMedal : -1) : 0, metal: el.dataset.lbMedal || null,
      number: ((el.querySelector('[data-rank-mark="number"]') || {}).textContent || '').trim(),
      bar: bar ? bar.dataset.lbBar : null, crown: loaded(el.querySelector('[data-lb-crown]')),
      lv: ((el.querySelector('[data-board-lv]') || {}).textContent || '').trim(),
      value: ((el.querySelector('[data-lb-value]') || {}).textContent || '').trim(),
      face: (el.querySelector('[data-board-face]') || { dataset: {} }).dataset.boardFace || null, mine: el.dataset.boardMine === '1',
      /* wholly inside the scrolled list's window */
      shown: !!lb && (() => { const b = el.getBoundingClientRect(); return b.top >= lb.t - 1 && b.bottom <= lb.b + 1; })(),
    };
  });
  const you = document.querySelector('[data-lb-you]');
  return {
    page: pg ? pg.dataset.lbPage : null, open: pg ? pg.dataset.lbOpen : null, tab: pg ? pg.dataset.lbTabOpen : null, short: !!(pg && pg.dataset.lbShort),
    pg: box(pg), vw: innerWidth, vh: innerHeight, tabs,
    picker: picker ? { id: picker.dataset.lbPicker, box: box(picker), text: picker.textContent.trim(), open: picker.getAttribute('aria-expanded') === 'true' } : null,
    title: title ? { text: title.textContent.trim(), laurels: [...title.querySelectorAll('img')].filter(loaded).length, box: box(title) } : null,
    span: ((document.querySelector('[data-lb-span]') || {}).textContent || '').trim(),
    head, headBox: box(document.querySelector('[data-lb-head]')), hintBtn: !!document.querySelector('[data-lb-power-head]'),
    rows, list: lb, scrollTop: list ? Math.round(list.scrollTop) : -1,
    you: you ? { rank: +you.dataset.lbYou, box: box(you), name: ((you.querySelector('[data-lb-you-name]') || {}).textContent || '').trim(),
      rankText: ((you.querySelector('[data-lb-you-rank]') || {}).textContent || '').trim(), value: ((you.querySelector('[data-lb-you-value]') || {}).textContent || '').trim(),
      face: (you.querySelector('[data-board-face]') || { dataset: {} }).dataset.boardFace || null } : null,
    menu: [...document.querySelectorAll('[data-lb-menu] [data-lb-cat]')].map((b) => ({ id: b.dataset.lbCat, hit: Math.round(b.getBoundingClientRect().height), on: b.getAttribute('aria-selected') === 'true' })),
    menuClose: !!document.querySelector('[data-lb-menu] [data-esc]'),
    empty: ((document.querySelector('[data-lb-board] [data-board-empty]') || {}).textContent || '').trim(),
    records: document.querySelectorAll('[data-lb-board] [data-winloss-board], [data-lb-board] [data-fish-board]').length,
  };
});
/* the fixed parts are inside the page and the screen */
const inside = (L, b) => !!b && b.t >= L.pg.t - 1 && b.b <= L.pg.b + 1 && b.l >= L.pg.l - 1 && b.r <= L.pg.r + 1 && b.b <= L.vh && b.r <= L.vw;

export async function run({ browser, wsPort, webPort, rec }) {
  const SHOTS = join(H.REPO, 'docs/shots');
  mkdirSync(SHOTS, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(SHOTS, `ranks-${name}.png`) }).catch(() => {});
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Sunburn', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', dpr: 2 });
  A.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  let stop = () => {};
  const bots = [];
  const others = [];
  try {
    await H.enterWorld(A);
    const inW = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    stop = H.keepAlive(A);
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(A, (S) => S.myId);

    /* four more players, wearing the phone's own look */
    const api = `http://127.0.0.1:${wsPort}`;
    const room = await fetch(api + '/api/lobby').then((r) => r.json()).then((j) => (j && j.room) || 'brotown-1').catch(() => 'brotown-1');
    const top0 = await fetch(api + '/api/leaderboard/top?category=combat&limit=50').then((r) => r.json()).catch(() => null);
    const mine0 = top0 && (top0.results || []).find((r) => r.id === me);
    const lookOf = (mine0 && mine0.look) || {};
    const stamp = Date.now().toString(36);
    for (const name of ['Glorb', 'Chunky Waffle', 'RogueMuffin', 'Deed Dave']) {
      const id = 'bp_rs_' + name.replace(/\W/g, '').toLowerCase() + '_' + stamp;
      bots.push(await bot(wsPort, room, { id, name, device: 'dev' + id, look: lookOf }));
    }
    rec.ok('four more players are in (guard)', bots.every((b) => b.ok), bots.map((b) => b.ok));
    const caps = await H.readState(A, (S) => ({ power: Number(S._serverCaps && S._serverCaps.power) || 0, statboards: Number(S._serverCaps && S._serverCaps.statboards) || 0 }));
    await A.page.waitForTimeout(1500);

    /* ── 1 ── the page */
    await H.unfoldBand(A).catch(() => {});
    await tap(A, '.bt-navrail [data-nav="leaderboard"]');
    await A.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
    await H.waitFor(A, () => {
      const imgs = [...document.querySelectorAll('[data-lb-page] img')];
      const rows = document.querySelectorAll('[data-lb-board] [data-board-row]').length;
      const empty = ((document.querySelector('[data-lb-board] [data-board-empty]') || {}).textContent || '').trim();
      return { rows, empty, loaded: imgs.every((i) => i.complete && i.naturalWidth > 0) };
    }, (v) => (v.rows >= 1 || (v.empty && v.empty !== 'Loading…')) && v.loaded, { timeout: 30000, label: 'the board' }).catch(() => null);
    const L = await look(A);
    await shot(A, 'power');
    rec.ok(`guard: the band upright at 390 x 844 is ${L.pg && L.pg.h} px tall, the rows' window ${L.list && L.list.h} px`, !!L.pg, { pg: L.pg, list: L.list });
    rec.ok('1a Ranks opens the new page: four tabs across the top in the mockup\'s order, each its picture and whole word; Power open on the gold bar',
      L.page === 'ranks' && JSON.stringify(L.tabs.map((t) => t.id)) === JSON.stringify(TABS)
      && JSON.stringify(L.tabs.map((t) => t.word)) === JSON.stringify(['Power', 'Stats', 'Records', 'Skills'])
      && L.tabs.every((t) => t.icon && !t.cut && inside(L, t.box)) && L.tab === 'power'
      && L.tabs.filter((t) => t.on).length === 1 && L.tabs[0].on && L.tabs[0].bar === 'pill-gold' && L.tabs.slice(1).every((t) => t.bar === 'pill-plain')
      && L.tabs.every((t, i) => i === 0 || t.box.t === L.tabs[0].box.t), L.tabs);
    const first = caps.power >= 1 ? 'power' : 'melee';
    rec.ok(`1b under them one row: the picker naming the open board ("${L.picker && L.picker.text}"), "RANKS" between the laurels, the span's tag ("${L.span}")`,
      !!L.picker && L.picker.id === first && L.open === first && !!L.title && L.title.text === 'RANKS' && L.title.laurels === 2 && L.span === 'All-time leaderboard'
      && L.picker.box.r <= L.title.box.l && inside(L, L.picker.box) && L.picker.box.t >= L.tabs[0].box.b, { picker: L.picker, title: L.title, span: L.span, caps });
    rec.ok(`1c the heads: ${L.head.join(' | ')}${L.hintBtn ? ' and the "?"' : ''}`,
      first === 'power' ? JSON.stringify(L.head) === JSON.stringify(['#', 'Player', 'Lv', 'Power']) && L.hintBtn : JSON.stringify(L.head) === JSON.stringify(['#', 'Player', 'Lv', 'Melee']) && !L.hintBtn, L.head);

    /* ── 2 ── the picker: the Power tab's boards */
    await tap(A, '[data-lb-picker]');
    await A.page.waitForSelector('[data-lb-menu]', { timeout: 5000 }).catch(() => {});
    const M = await look(A);
    await shot(A, 'picker');
    rec.ok(`2a the picker opens the list of the tab's boards: ${M.menu.map((m) => m.id).join(', ')} -- each a 44 px target, the open one lit, a ✕ (Escape)`,
      JSON.stringify(M.menu.map((m) => m.id)) === JSON.stringify(caps.power >= 1 ? ['power', 'melee', 'bow', 'magic', 'combat'] : ['melee', 'bow', 'magic', 'combat'])
      && M.menu.every((m) => m.hit >= 44) && M.menu.filter((m) => m.on).length === 1 && M.menuClose && M.picker.open, M.menu);
    await tap(A, '[data-lb-menu] [data-lb-cat="melee"]');
    await H.waitFor(A, () => [...document.querySelectorAll('[data-lb-board] [data-board-face]')].filter((e) => e.dataset.boardFace === 'bust').length, (n) => n >= 5, { timeout: 30000, label: 'the faces' }).catch(() => null);
    const B = await look(A);
    rec.ok('2b a pick opens that board and shuts the list; the tab stays Power', B.open === 'melee' && B.menu.length === 0 && B.tab === 'power' && !B.picker.open && JSON.stringify(B.head) === JSON.stringify(['#', 'Player', 'Lv', 'Melee']), { open: B.open, tab: B.tab, head: B.head });
    await tap(A, '[data-lb-picker]');
    await A.page.keyboard.press('Escape').catch(() => {});
    await A.page.waitForTimeout(300);
    let shut = (await look(A)).menu.length === 0;
    if (!shut) { await tap(A, '[data-lb-menu] [data-esc]'); await A.page.waitForTimeout(300); shut = (await look(A)).menu.length === 0; }
    rec.ok('2c the list\'s ✕ shuts it', shut, null);

    /* ── 3 ── the medals and your row */
    rec.ok('3a rows 1-3 on the gold, silver and bronze bars with the laurel medals, a crown by the leader; from 4 the plain number',
      B.rows.length >= 5 && B.rows.slice(0, 3).every((r, i) => r.medal === i + 1 && r.metal === ['gold', 'silver', 'bronze'][i] && r.bar === ['bar-gold', 'bar-silver', 'bar-bronze'][i] && !r.number)
      && B.rows[0].crown && !B.rows.slice(1).some((r) => r.crown) && B.rows.slice(3).every((r) => r.medal === 0 && !r.metal && r.number === String(r.rank)), B.rows);
    rec.ok('3b each row its face, its name, an "Lv N" chip and the value', B.rows.every((r) => r.face && r.name && /^Lv \d+$/.test(r.lv) && /^\d+$/.test(r.value)), B.rows);
    const mine = B.rows.find((r) => r.mine);
    rec.ok(`3c your row pinned at the foot, framed: "${B.you && B.you.name}", "${B.you && B.you.rankText}", ${B.you && B.you.value}`,
      !!B.you && !!mine && B.you.rank === mine.rank && B.you.rankText === 'Rank #' + mine.rank && B.you.value === mine.value && /· You$/.test(B.you.name)
      && B.you.face === 'bust' && inside(B, B.you.box) && B.you.box.t >= B.list.b - 1, { you: B.you, mine });
    await shot(A, 'melee');

    /* ── 4 ── every tab, every board through the picker */
    const seen = [];
    for (const t of TABS) {
      await tap(A, `[data-lb-tab="${t}"]`);
      await A.page.waitForTimeout(300);
      const T = await look(A);
      await tap(A, '[data-lb-picker]');
      await A.page.waitForSelector('[data-lb-menu]', { timeout: 5000 }).catch(() => {});
      const ids = (await look(A)).menu.map((m) => m.id);
      await tap(A, '[data-lb-menu] [data-esc]').catch(() => {});
      seen.push({ tab: t, on: T.tab === t && T.tabs.find((x) => x.id === t).on, ids, opens: [] });
      for (const id of ids) {
        await tap(A, '[data-lb-picker]');
        await tap(A, `[data-lb-menu] [data-lb-cat="${id}"]`);
        let v = null;
        for (let k = 0; k < 48 && !v; k++) {
          const x = await look(A);
          if (x.open === id && x.tab === t && (x.rows.length > 0 || (x.empty && x.empty !== 'Loading…') || x.records > 0)) v = x;
          else await A.page.waitForTimeout(250);
        }
        seen[seen.length - 1].opens.push([id, !!v]);
        if (t === 'records' && id === 'spin' && v) await shot(A, 'records');
        if (t === 'skills' && id === 'mining' && v) await shot(A, 'skills');
        if (t === 'stats' && id === 'pts_def' && v) await shot(A, 'stats');
      }
    }
    const all = seen.flatMap((s) => s.ids);
    const OLD = ['melee', 'bow', 'magic', 'combat', 'kills', 'woodcutting', 'fishing', 'mining', 'farming', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping'];
    rec.ok(`4 every tab opens on the gold bar, and every board of each through the picker (${all.length}): ${seen.map((s) => s.tab + ' ' + s.ids.length).join(', ')}`,
      seen.every((s) => s.on && s.ids.length >= 1 && s.opens.every((o) => o[1])) && OLD.every((id) => all.includes(id)) && new Set(all).size === all.length
      && seen.find((s) => s.tab === 'stats').ids.every((id) => /^pts_/.test(id)) && seen.find((s) => s.tab === 'skills').ids.length === 10
      && (caps.power < 1 || all.includes('power')) && all.filter((id) => /^pts_/.test(id)).length === caps.statboards, seen);

    /* ── 5 ── a long board: only the rows scroll */
    const many = (withMe) => Array.from({ length: 30 }, (_, i) => ({ id: withMe && i === 24 ? me : 'bp_rs_long' + i, name: withMe && i === 24 ? 'Sunburn' : 'Player ' + (i + 1), lv: 40 - i, value: 99 - i, look: lookOf }));
    let served = many(true);
    await A.page.route(/\/api\/leaderboard\/top\?category=woodcutting/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, category: 'woodcutting', results: served }) }));
    await tap(A, '[data-lb-tab="skills"]');
    await tap(A, '[data-lb-picker]');
    await tap(A, '[data-lb-menu] [data-lb-cat="woodcutting"]');
    await H.waitFor(A, () => document.querySelectorAll('[data-lb-board] [data-board-row]').length, (n) => n >= 30, { timeout: 15000, label: 'the long board' }).catch(() => null);
    const W0 = await look(A);
    await A.page.evaluate(() => { const l = document.querySelector('[data-lb-rows]'); if (l) l.scrollTop = l.scrollHeight; });
    await A.page.waitForTimeout(400);
    const W1 = await look(A);
    const fixedStill = (a, b) => JSON.stringify([a.tabs.map((t) => t.box.t), a.picker.box.t, a.headBox.t, a.you.box.t]) === JSON.stringify([b.tabs.map((t) => t.box.t), b.picker.box.t, b.headBox.t, b.you.box.t]);
    rec.ok(`5a only the rows scroll (scrolled to ${W1.scrollTop} px): the tabs, the picker, the heads and your row ("${W1.you && W1.you.rankText}") stay in view`,
      W1.scrollTop > 0 && fixedStill(W0, W1) && [W1.picker.box, W1.headBox, W1.you.box, ...W1.tabs.map((t) => t.box)].every((b) => inside(W1, b))
      && W1.you.rankText === 'Rank #25' && W1.you.value === '75', { top: W1.scrollTop, you: W1.you });
    const shown390 = W0.rows.filter((r) => r.shown).length;
    rec.ok(`5b at 390 x 844 (the band ${W0.pg.h} px, today's) ${shown390} rows show whole between the heads and your row: the first three at least`, shown390 >= 3, { list: W0.list, pg: W0.pg });
    await shot(A, 'scrolled');
    await A.page.setViewportSize({ width: 375, height: 667 });
    await A.page.waitForTimeout(1500);
    await A.page.evaluate(() => { if (window.__broDashPanelBus) window.__broDashPanelBus.open('leaderboard'); });
    await A.page.waitForTimeout(1200);
    const W375 = await look(A);
    const shown375 = W375.rows.filter((r) => r.shown).length;
    await shot(A, 'upright-375');
    rec.ok(`5c at 375 x 667 (the band ${W375.pg && W375.pg.h} px) ${shown375} rows show whole (three or more), every fixed part inside the screen, the tabs' words whole`,
      W375.page === 'ranks' && shown375 >= 3 && [W375.picker.box, W375.headBox, W375.you.box, ...W375.tabs.map((t) => t.box)].every((b) => inside(W375, b)) && W375.tabs.every((t) => !t.cut),
      { pg: W375.pg, list: W375.list, shown: shown375 });
    /* off the board: the mockup's dashes */
    served = many(false);
    await tap(A, '[data-lb-tab="skills"]');
    await tap(A, '[data-lb-picker]');
    await tap(A, '[data-lb-menu] [data-lb-cat="fishing"]');
    await A.page.waitForTimeout(500);
    await tap(A, '[data-lb-picker]');
    await tap(A, '[data-lb-menu] [data-lb-cat="woodcutting"]');
    await H.waitFor(A, () => (document.querySelector('[data-lb-you]') || { dataset: {} }).dataset.lbYou, (v) => v === '0', { timeout: 30000, label: 'off the board' }).catch(() => null);
    const W2 = await look(A);
    rec.ok(`5d off the board your row says "${W2.you && W2.you.rankText}", ${W2.you && W2.you.value}, with your own face`,
      !!W2.you && W2.you.rank === 0 && W2.you.rankText === 'Rank #—' && W2.you.value === '—' && W2.you.face === 'bust', W2.you);
    await A.page.unroute(/\/api\/leaderboard\/top\?category=woodcutting/);
    await A.page.setViewportSize(PHONE);
    await A.page.waitForTimeout(800);

    /* ── 6 ── sideways */
    await A.page.setViewportSize({ width: 844, height: 390 });
    await A.page.waitForTimeout(2500);
    /* turned, the page is opened as a thumb does: the band unfolded, Ranks tapped */
    await H.unfoldBand(A).catch(() => {});
    if (!(await A.page.$('[data-lb-page]'))) await tap(A, '.bt-navrail [data-nav="leaderboard"]').catch(() => {});
    await A.page.waitForTimeout(800);
    await tap(A, '[data-lb-tab="power"]').catch(() => {});
    await tap(A, '[data-lb-picker]').catch(() => {});
    await tap(A, '[data-lb-menu] [data-lb-cat="melee"]').catch(() => {});
    await A.page.waitForTimeout(1500);
    const Sd = await look(A);
    await shot(A, 'sideways');
    const shownSd = Sd.rows.filter((r) => r.shown).length;
    rec.ok(`6 sideways (the band ${Sd.pg && Sd.pg.h} px, today's): ${shownSd} rows show whole (two or more); the tabs, the picker and your row ("${Sd.you && Sd.you.rankText}") share the top line, all inside the screen`,
      Sd.page === 'ranks' && Sd.short && shownSd >= 2 && !!Sd.you && [Sd.picker.box, Sd.you.box, ...Sd.tabs.map((t) => t.box)].every((b) => inside(Sd, b))
      && Sd.tabs.every((t) => !t.cut) && Sd.you.box.b <= Sd.list.t + 1 && Math.abs(Sd.you.box.t - Sd.tabs[0].box.t) <= 2 && /^Rank #/.test(Sd.you.rankText),
      { pg: Sd.pg, list: Sd.list, short: Sd.short, shown: shownSd, you: Sd.you, tabs: Sd.tabs.map((t) => [t.word, t.cut]) });
    await A.page.setViewportSize(PHONE);
    await A.page.waitForTimeout(800);

    /* ── 7 ── a computer */
    const D = await H.newPlayer(browser, { name: 'Deskbro', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, dpr: 2 });
    others.push(D);
    D.page.on('pageerror', (e) => errs.push('desk: ' + String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(D);
    const inD = await H.waitFor(D, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'the computer in the Wheel' }).catch(() => null);
    if (inD) {
      await D.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await H.unfoldBand(D).catch(() => {});
      await D.page.locator('.bt-navrail [data-nav="leaderboard"]').first().click().catch(() => {});
      await D.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
      await D.page.locator('[data-lb-picker]').first().click().catch(() => {});
      await D.page.locator('[data-lb-menu] [data-lb-cat="melee"]').first().click().catch(() => {});
      await H.waitFor(D, () => document.querySelectorAll('[data-lb-board] [data-board-face="bust"]').length, (n) => n >= 4, { timeout: 30000, label: 'the computer\'s faces' }).catch(() => null);
      const Dk = await look(D);
      await shot(D, 'computer');
      rec.ok(`7 on a computer (wide), clicked open: the same page in the band's box (${Dk.pg && Dk.pg.w} px wide), the tabs inside it, rows and your row`,
        Dk.page === 'ranks' && Dk.rows.length >= 5 && !!Dk.you && Dk.tabs.length === 4 && Dk.tabs.every((t) => inside(Dk, t.box)) && inside(Dk, Dk.you.box), { pg: Dk.pg, tabs: Dk.tabs.map((t) => t.box) });
    } else rec.ok('7 the computer reached the Wheel', false, inD);

    /* ── 8 ── the switch */
    const O = await H.newPlayer(browser, { name: 'Oldlook', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'rankstyle=0' });
    others.push(O);
    O.page.on('pageerror', (e) => errs.push('old: ' + String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(O);
    const inO = await H.waitFor(O, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'the old look in the Wheel' }).catch(() => null);
    if (inO) {
      await O.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await H.unfoldBand(O).catch(() => {});
      await tap(O, '.bt-navrail [data-nav="leaderboard"]');
      await O.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
      const Ol = await look(O);
      const rail = await O.page.evaluate(() => document.querySelectorAll('[data-lb-rail] [data-lb-cat]').length);
      rec.ok(`8 ?rankstyle=0 gives back the page before: the list down the left (${rail} boards), no tabs`, Ol.page === 'list' && rail >= 16 && Ol.tabs.length === 0, { page: Ol.page, rail });
    } else rec.ok('8 the old look reached the Wheel', false, inO);

    /* ── 9 ── */
    rec.ok('9 no page errors', errs.length === 0, errs);
  } finally {
    stop();
    for (const b of bots) b.close();
    for (const o of others) await o.ctx.close().catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
