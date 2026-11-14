/* ═══ THE LEADERBOARDS' NEW LOOK, ON A PHONE AND A COMPUTER (v2.3.5501, card LB) ═══
 *
 * The owner, 2026-11-14: "I'd also like something more like this for
 * leaderboards (mockup and art assets attached)", and of the second mockup,
 * "This pic is better mock representation" (assets/ui/leaderboard/;
 * docs/specs/leaderboard-look.md).
 *
 * One real phone (390 x 844, touch) in the Wheel's BroTown against a real
 * worker, and four plain-socket players so the podium and the table are full:
 *   1. Ranks opens the page in the dashboard's band: "RANKS" between the two
 *      laurels down the left, then the boards as pills on the sheet's pill
 *      bars (the lit one gold) -- Melee, Bow, Magic first (their sheet tiles),
 *      then Level; Overall is NOT there against a worker without caps.power
 *      (and no stat board at all: held); the gold divider, then Kills and every board
 *      there was (Records, Skills); each a 44 px target, its word whole;
 *   2. the board: a podium of the first three on their shields (2, 1 raised,
 *      3), each with a face, its name and "Lv N"; under it the table -- #,
 *      Player, Lv, Total and the sword, bow and staff -- rows 1-3 on the gold,
 *      silver and bronze bars with the laurel medals, a crown by the first
 *      name; every piece loaded; all inside the screen;
 *   3. every board picked in turn: each opens (a table, its records, or "says
 *      so"), the list scrolling to it;
 *   4. (Overall, the Power rating and its hint: card LB's PR 3, tag 5502,
 *      once card PW's #1776 advertises caps.power; this PR reads no cap)
 *   5. sideways (844 x 390, a band ~80 px tall): the pills are one row over
 *      the table, no podium, all inside the screen;
 *   6. a computer (1440 x 900, `wide: true`, the band at the bottom, a mouse):
 *      clicked open, the list beside the board with its podium;
 *   7. no page errors.
 * No pages: the board scrolls inside the band (the spec says why).
 * Pictures: tools/qa/mp/out/boardslook-{upright,sideways,computer}.png
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

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

/* what the page shows: the list, the podium, the table */
const look = (P) => P.page.evaluate(() => {
  const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const loaded = (img) => !!img && img.complete && img.naturalWidth > 0;
  const pg = document.querySelector('[data-lb-page]');
  const title = document.querySelector('[data-lb-title]');
  const pills = [...document.querySelectorAll('[data-lb-cat]')].map((b) => {
    const pill = b.querySelector('[data-lb-pill]'), word = pill && pill.lastElementChild, bar = pill && pill.querySelector('[data-lb-bar]');
    const icon = b.querySelector('[data-lb-icon] img');
    return {
      id: b.dataset.lbCat, hit: box(b).h, on: b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-pressed') === 'true',
      bar: bar ? bar.dataset.lbBar : null, barArt: bar ? getComputedStyle(bar).borderImageSource : '',
      icon: loaded(icon), tile: !!icon && /\/ui\/leaderboard\/tile-/.test(icon.getAttribute('src')),
      word: word ? word.textContent : '', cut: !!word && word.scrollWidth > word.clientWidth + 1,
    };
  });
  const order = [...(pg ? pg.querySelectorAll('[data-lb-cat], [data-lb-divider], [data-lb-sec]') : [])].map((e) => e.dataset.lbCat || (e.hasAttribute('data-lb-divider') ? '|' : '#' + e.dataset.lbSec));
  const podium = [...document.querySelectorAll('[data-lb-podium-place]')].map((e) => {
    const img = e.querySelector(':scope > img');
    return { place: +e.dataset.lbPodiumPlace, box: box(e), art: loaded(img) ? img.getAttribute('src').split('?')[0] : null,
      face: (e.querySelector('[data-board-face]') || { dataset: {} }).dataset.boardFace || null,
      name: ((e.querySelector('[data-lb-podium-name]') || {}).textContent || '').trim(),
      nameWhole: (() => { const n = e.querySelector('[data-lb-podium-name] > span'); return !!n && n.scrollWidth <= n.clientWidth + 1; })(),
      value: ((e.querySelector('[data-lb-podium-value]') || {}).textContent || '').trim() };
  });
  /* the head's cells, a narrow table's swap button opened into its own */
  const cellsIn = [...document.querySelectorAll('[data-lb-head] > *')].flatMap((e) => (e.hasAttribute('data-lb-swap') ? [...e.children].filter((c) => c.hasAttribute('data-lb-head-col')) : [e]));
  const head = cellsIn.map((e) => (e.querySelector('img') ? '[' + e.querySelector('img').alt + ']' : e.textContent.trim()));
  const swap = (document.querySelector('[data-lb-swap]') || { dataset: {} }).dataset.lbSwap || null;
  const rows = [...document.querySelectorAll('[data-lb-board] [data-board-row]')].map((el) => {
    const medal = el.querySelector('[data-rank-medal] img'), bar = el.querySelector(':scope > [data-lb-bar]');
    return {
      rank: +el.dataset.boardRow, box: box(el), name: ((el.querySelector('[data-board-name]') || {}).textContent || '').trim(),
      medal: medal ? (loaded(medal) ? +el.querySelector('[data-rank-medal]').dataset.rankMedal : -1) : 0,
      number: ((el.querySelector('[data-rank-mark="number"]') || {}).textContent || '').trim(),
      bar: bar ? bar.dataset.lbBar : null, crown: loaded(el.querySelector('[data-lb-crown]')),
      /* the whole name: not cut (one line, or two where one is too narrow) */
      /* the name's own lines (a range over its text: the lines a clamp hides
         still have their boxes): whole when it needs two lines or fewer */
      whole: (() => {
        const n = el.querySelector('[data-board-name]');
        if (!n || !n.firstChild) return false;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const tops = new Set([...rg.getClientRects()].map((r) => Math.round(r.top)));
        return tops.size >= 1 && tops.size <= 2;
      })(),
      value: ((el.querySelector('[data-lb-value]') || {}).textContent || '').trim(),
      ring: getComputedStyle(el).outlineStyle === 'solid' && parseFloat(getComputedStyle(el).outlineWidth) >= 2,
      face: (el.querySelector('[data-board-face]') || { dataset: {} }).dataset.boardFace || null,
      mine: el.dataset.boardMine === '1',
    };
  });
  return {
    page: pg ? pg.dataset.lbPage : null, open: pg ? pg.dataset.lbOpen : null, pg: box(pg), vw: innerWidth, vh: innerHeight,
    title: title ? { text: title.textContent.trim(), laurels: [...title.querySelectorAll('img')].filter(loaded).length, box: box(title) } : null,
    divider: loaded(document.querySelector('[data-lb-divider] img')), pills, order, podium, head, swap, rows,
    board: box(document.querySelector('[data-lb-board]')),
    empty: ((document.querySelector('[data-lb-board] [data-board-empty]') || {}).textContent || '').trim(),
    records: document.querySelectorAll('[data-lb-board] [data-winloss-board], [data-lb-board] [data-fish-board]').length,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `boardslook-${name}.png`) }).catch(() => {});
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Sunburn', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  A.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  let stop = () => {};
  const bots = [];
  let D = null;
  try {
    await H.enterWorld(A);
    const inW = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    stop = H.keepAlive(A);
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(A, (S) => S.myId);

    /* four more players, wearing the phone's own look (ids the bust knows) */
    const api = `http://127.0.0.1:${wsPort}`;
    const room = await fetch(api + '/api/lobby').then((r) => r.json()).then((j) => (j && j.room) || 'brotown-1').catch(() => 'brotown-1');
    const top0 = await fetch(api + '/api/leaderboard/top?category=combat&limit=50').then((r) => r.json()).catch(() => null);
    const mine0 = top0 && (top0.results || []).find((r) => r.id === me);
    const lookOf = (mine0 && mine0.look) || {};
    const stamp = Date.now().toString(36);
    for (const name of ['Chunky Waffle', 'Chunky Pecs', 'Beefy Legend', 'Iron Mike']) {
      const id = 'bp_bl_' + name.replace(/\W/g, '').toLowerCase() + '_' + stamp;
      bots.push(await bot(wsPort, room, { id, name, device: 'dev' + id, look: lookOf }));
    }
    rec.ok('four more players are in (guard)', bots.every((b) => b.ok), bots.map((b) => b.ok));
    await A.page.waitForTimeout(1500);

    /* ── 1 ── the list */
    await H.unfoldBand(A).catch(() => {});
    await tap(A, '.bt-navrail [data-nav="leaderboard"]');
    await A.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
    const L = await H.waitFor(A, () => {
      const t = document.querySelector('[data-lb-title]');
      const rows = document.querySelectorAll('[data-lb-board] [data-board-row]').length;
      const imgs = [...document.querySelectorAll('[data-lb-page] img')];
      return { rows, laurels: t ? t.querySelectorAll('img').length : 0, loaded: imgs.every((i) => i.complete && i.naturalWidth > 0) };
    }, (v) => v.rows >= 5 && v.loaded, { timeout: 30000, label: 'the board and its pieces' }).then(() => look(A)).catch(() => look(A));
    rec.ok('1a Ranks opens the page in the band: "RANKS" between its two laurels at the list\'s head',
      L.page === 'list' && !!L.title && L.title.text === 'RANKS' && L.title.laurels === 2 && L.pg.b <= L.vh, { page: L.page, title: L.title, pg: L.pg });
    rec.ok('1b Melee, Bow, Magic lead the list (their sheet tiles), then Level; no Overall without caps.power, no stat boards',
      JSON.stringify(L.order.slice(0, 4)) === JSON.stringify(['melee', 'bow', 'magic', 'combat'])
      && L.pills.slice(0, 3).every((p) => p.tile && p.icon) && !L.order.includes('power') && !L.order.includes('might'), L.order);
    rec.ok('1c the gold divider, then Kills and every board there was: Records, Skills -- nothing dropped',
      L.divider && L.order[4] === '|' && L.order[5] === 'kills' && ['spin', 'fish', 'woodcutting', 'trapping'].every((c) => L.order.includes(c))
      && L.order.indexOf('#Records') > L.order.indexOf('|') && L.order.indexOf('#Skills') > L.order.indexOf('#Records'), L.order);
    rec.ok('1d each board a 44 px target on the sheet\'s pill bar, its word whole; the one showing (the first) on the gold one',
      L.pills.length >= 16 && L.pills.every((p) => p.hit >= 44 && p.word && !p.cut && /pill-(gold|plain)\.webp/.test(p.barArt) && p.icon)
      && L.pills.filter((p) => p.on).length === 1 && L.pills.find((p) => p.on).id === 'melee' && L.pills.find((p) => p.on).bar === 'pill-gold'
      && L.pills.filter((p) => !p.on).every((p) => p.bar === 'pill-plain') && L.open === 'melee', L.pills);

    /* ── 2 ── the podium and the table */
    const B = await H.waitFor(A, () => [...document.querySelectorAll('[data-lb-board] [data-board-face]')].filter((e) => e.dataset.boardFace === 'bust').length,
      (n) => n >= 6, { timeout: 30000, label: 'the faces' }).then(() => look(A)).catch(() => look(A));
    await shot(A, 'upright');
    const [p2, p1, p3] = B.podium;
    rec.ok('2a a podium of the first three on their shields: 2 left, 1 in the middle and raised, 3 right, each piece loaded',
      B.podium.length === 3 && p2.place === 2 && p1.place === 1 && p3.place === 3
      && /shield-silver/.test(p2.art) && /shield-gold/.test(p1.art) && /shield-bronze/.test(p3.art)
      && p2.box.r <= p1.box.l + 1 && p1.box.r <= p3.box.l + 1 && p1.box.t < p2.box.t && p1.box.t < p3.box.t
      && B.podium.every((p) => p.box.l >= B.board.l - 1 && p.box.r <= B.board.r + 1), B.podium);
    const digits = (t) => String(t || '').replace(/[^0-9]/g, '');
    rec.ok('2b ...each with a face, its name on the ribbon and the BOARD\'s value under it (Melee: the melee level), the first three of the table',
      B.podium.every((p) => p.face === 'bust' && p.name && /^Lv \d+$/.test(p.value))
      && [1, 2, 3].every((n) => { const p = B.podium.find((x) => x.place === n), r = B.rows[n - 1] || {}; return p.name === r.name && digits(p.value) === digits(r.value); }),
      { podium: B.podium, rows: B.rows.slice(0, 3) });
    rec.ok(`2c a narrow (upright) table opens Melee on the three weapons: ${B.head.join(' | ')}`,
      B.swap === 'styles' && JSON.stringify(B.head) === JSON.stringify(['#', 'Player', 'Lv', '[melee]', '[bow]', '[magic]']), { head: B.head, swap: B.swap });
    rec.ok('2c2 every name whole on the upright phone (one line, or two)', B.rows.length >= 5 && B.rows.every((r) => r.whole), B.rows.map((r) => [r.name, r.whole]));
    await tap(A, '[data-lb-swap]');
    await A.page.waitForTimeout(400);
    const Bt = await look(A);
    rec.ok(`2c3 its head's button swaps them for the Total: ${Bt.head.join(' | ')}`,
      Bt.swap === 'total' && JSON.stringify(Bt.head) === JSON.stringify(['#', 'Player', 'Lv', 'Total']) && Bt.rows.every((r) => r.whole), { head: Bt.head, swap: Bt.swap });
    await tap(A, '[data-lb-swap]');
    await A.page.waitForTimeout(300);
    rec.ok('2d rows 1-3 on the gold, silver and bronze bars with the laurel medals, a crown by the first name; from 4 the plain number',
      B.rows.length >= 5 && B.rows.slice(0, 3).every((r, i) => r.medal === i + 1 && r.bar === ['bar-gold', 'bar-silver', 'bar-bronze'][i] && !r.number)
      && B.rows[0].crown && !B.rows.slice(1).some((r) => r.crown) && B.rows.slice(3).every((r) => r.medal === 0 && r.number === String(r.rank) && (r.bar === null || (r.mine && r.bar === 'bar-plain'))), B.rows);
    const mineRow = B.rows.find((r) => r.mine);
    rec.ok(`2e every row a face, inside the board; the phone's own row marked (place ${mineRow && mineRow.rank}: ${mineRow && mineRow.rank <= 3 ? 'a ring round its bar' : 'the plain bar'})`,
      B.rows.every((r) => r.face && r.box.l >= B.board.l - 1 && r.box.r <= B.board.r + 1) && B.rows.filter((r) => r.mine).length === 1
      && (mineRow.rank <= 3 ? mineRow.ring : mineRow.bar === 'bar-plain' && !mineRow.ring) && B.rows.filter((r) => r.ring).length === (mineRow.rank <= 3 ? 1 : 0), B.rows);

    /* ── 2f ── an upright 375 px iPhone: the names still whole */
    await A.page.setViewportSize({ width: 375, height: 812 });
    await A.page.waitForTimeout(1500);
    await A.page.evaluate(() => { if (window.__broDashPanelBus) window.__broDashPanelBus.open('leaderboard'); });
    await A.page.waitForTimeout(1200);
    const B375 = await look(A);
    await shot(A, 'upright-375');
    rec.ok(`2f at 375 px every name is whole, on the podium and in the table, and every row inside the board (${B375.rows.length} rows)`,
      B375.page === 'list' && B375.rows.length >= 5 && B375.rows.every((r) => r.whole && r.box.r <= B375.board.r + 1) && B375.pg.r <= B375.vw
      && B375.podium.length === 3 && B375.podium.every((p) => p.nameWhole), { rows: B375.rows.map((r) => [r.name, r.whole]), podium: B375.podium.map((p) => [p.name, p.nameWhole]) });
    await A.page.setViewportSize(PHONE);
    await A.page.waitForTimeout(1200);

    /* ── 3 ── every board in turn */
    const ids = L.pills.map((p) => p.id);
    const seen = [];
    for (const id of ids) {
      await tap(A, `[data-lb-rail] [data-lb-cat="${id}"]`);
      let v = null;
      for (let t = 0; t < 48 && !v; t++) {
        const x = await A.page.evaluate((want) => {
          const pg = document.querySelector('[data-lb-page]');
          return { open: pg && pg.dataset.lbOpen, rows: document.querySelectorAll('[data-lb-board] [data-board-row]').length,
            empty: ((document.querySelector('[data-lb-board] [data-board-empty]') || {}).textContent || '').trim(),
            rec: document.querySelectorAll('[data-lb-board] [data-winloss-board], [data-lb-board] [data-fish-board]').length, want };
        }, id);
        if (x.open === x.want && (x.rows > 0 || (x.empty && x.empty !== 'Loading…') || x.rec > 0)) v = x;
        else await A.page.waitForTimeout(250);
      }
      seen.push({ id, ok: !!v, rows: v ? v.rows : -1, empty: v ? v.empty : '' });
    }
    rec.ok(`3 every board opens when its pill is tapped (${seen.length}): a table, its records, or a line saying nobody is on it`,
      seen.length >= 16 && seen.every((s) => s.ok), seen);
    await tap(A, '[data-lb-rail] [data-lb-cat="melee"]');
    await A.page.waitForTimeout(600);

    /* ── 4 ── Overall and the rating: card LB's PR 3 (tag 5502), once card PW's
       worker (#1776) advertises caps.power on main -- this PR reads no cap */

    /* ── 5 ── sideways */
    await A.page.setViewportSize({ width: 844, height: 390 });
    await A.page.waitForTimeout(2500);
    await A.page.evaluate(() => { if (window.__broDashPanelBus) window.__broDashPanelBus.open('leaderboard'); });
    await A.page.waitForSelector('[data-lb-page="chips"]', { timeout: 10000 }).catch(() => {});
    await A.page.waitForTimeout(1200);
    const Sd = await look(A);
    await shot(A, 'sideways');
    rec.ok('5 sideways the pills are one row over the table, no podium, all inside the screen',
      Sd.page === 'chips' && Sd.pills.length >= 16 && Sd.podium.length === 0 && Sd.pg.l >= 0 && Sd.pg.r <= Sd.vw && Sd.pg.b <= Sd.vh
      && Sd.pills.find((p) => p.on) && Sd.pills.find((p) => p.on).bar === 'pill-gold' && Sd.pills.every((p) => p.hit >= 44 && !p.cut), Sd);
    await A.page.setViewportSize(PHONE);
    await A.page.waitForTimeout(800);

    /* ── 6 ── a computer */
    D = await H.newPlayer(browser, { name: 'Deskbro', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true });
    D.page.on('pageerror', (e) => errs.push('desk: ' + String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(D);
    const inD = await H.waitFor(D, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'the computer in the Wheel' }).catch(() => null);
    if (inD) {
      await D.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await H.unfoldBand(D).catch(() => {});
      await D.page.locator('.bt-navrail [data-nav="leaderboard"]').first().click().catch(() => {});
      await D.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
      await H.waitFor(D, () => document.querySelectorAll('[data-lb-board] [data-board-face="bust"]').length, (n) => n >= 4, { timeout: 30000, label: 'the computer\'s faces' }).catch(() => null);
      const Dk = await look(D);
      await shot(D, 'computer');
      rec.ok('6 on a computer (wide, the band at the bottom), clicked open: the list beside the board with its podium, inside the window',
        Dk.page === 'list' && Dk.podium.length === 3 && Dk.rows.length >= 5 && Dk.pg.l >= 0 && Dk.pg.r <= Dk.vw && Dk.pg.b <= Dk.vh && !!Dk.title, Dk);
    } else rec.ok('6 the computer reached the Wheel', false, inD);

    /* ── 7 ── */
    rec.ok('7 no page errors', errs.length === 0, errs);
  } finally {
    stop();
    for (const b of bots) b.close();
    if (D) await D.ctx.close().catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
