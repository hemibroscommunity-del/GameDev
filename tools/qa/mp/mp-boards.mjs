/* ═══ THE LEADERBOARDS, WITH FACES, ON A PHONE (v2.3.4393, docs/specs/leaderboards.md) ═══
 *
 * The owner, 2026-11-09: "make room for a new 'leaderboards' button on the
 * dashboard ... the leaderboards should be expanded and easier to navigate
 * from mobile and include the character profile pic and level next to each
 * record.  Also I want to have the 'daily spin' biggest wins and losses
 * records ... stand-in (deleted character) rows ... grayed out with the
 * deleted label over it."
 *
 * One real phone (390 x 844, touch) in the Wheel's BroTown against a real
 * worker, and three plain-socket players who make the records the phone
 * then reads (a real spin each: the worker rolls every one):
 *   Winnie  spins the login wheel and takes the pot           -> a WIN
 *   Lou     spins and doubles until the coin says nothing     -> a LOSS
 *   Ghost   spins, takes the pot, then DELETES the character  -> stand-ins
 *
 *   1. the worker says it keeps the boards (caps.boards2);
 *   2. the dashboard's row is six buttons -- Gear, Bro, Quests, Ranks,
 *      Codex, More -- each inside the screen, none over another, their
 *      words showing; Ranks opens the Leaderboards and is lit; More has no
 *      Leaderboards tile any more;
 *   3. the page: a list of boards down the left (Ranks, Records, Skills),
 *      the board beside it, each scrolling by itself; each board a
 *      pill-shaped button with its own picture and its word whole;
 *   4. the Level board: every row a face, the phone's own row lit, Ghost's
 *      row grey with DELETED across its face; the first places wear the
 *      owner's trophies where the rank was, each shining and sparkling (a
 *      deleted character's grey and still);
 *   5. Daily spin: Biggest wins has Winnie (the gold the worker paid, her
 *      level pill) and Ghost's stand-in; Biggest losses has Lou;
 *   6. a board nobody is on says so; the list scrolls to the last skill;
 *   7. sideways (a band ~80 px tall) the list is a row of chips over the
 *      board, the board showing among them, all inside the screen; at 375
 *      px the six buttons still wear their words;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/leaderboards-{row,row-375,level,trophies,spin-wins,spin-losses,sideways}.png
 * (docs/shots/leaderboards-*.webp are four of them, kept with the PR).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* a plain-socket player: joins, answers pings, sends, waits for a message */
async function bot(wsPort, room, { id, name, device, look }) {
  const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${encodeURIComponent(room)}&rf=1`);
  const msgs = [];
  const waiters = [];
  let closed = null;
  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string' || ev.data.startsWith('{"type":"tick"')) return;
    let m = null;
    try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'ping') { try { ws.send(JSON.stringify({ type: 'pong', ts: m.ts })); } catch { /* gone */ } return; }
    msgs.push(m);
    for (const w of [...waiters]) if (w.type === m.type && (!w.pred || w.pred(m))) { waiters.splice(waiters.indexOf(w), 1); w.done(m); }
  };
  ws.onclose = (ev) => { closed = ev.code || 1006; for (const w of waiters.splice(0)) w.done(null); };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('bot socket failed')); });
  const send = (type, payload) => ws.send(JSON.stringify({ type, payload: payload || {} }));
  const wait = (type, pred, ms = 8000) => new Promise((res) => {
    const hit = msgs.find((m) => m.type === type && (!pred || pred(m)));
    if (hit) { res(hit); return; }
    const w = { type, pred, done: res };
    waiters.push(w);
    setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); res(null); } }, ms);
  });
  ws.send(JSON.stringify({
    type: 'join', id, name, phrase: 'p-' + id, device: { id: device }, protocolVersion: 2, httpAuth: true, ws: [1, 5],
    data: { x: 1000, y: 1000, d: 'south', z: 'town', name, ...(look || {}) },
  }));
  const sync = await wait('state_sync', null, 15000);
  return { id, name, send, wait, msgs, sync, closed: () => closed, close: () => { try { ws.close(); } catch { /* gone */ } }, clear: () => { msgs.length = 0; } };
}

/* a real tap: the element at its own centre must be it */
async function tap(P, sel, timeout = 8000) {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout });
  const verdict = await loc.evaluate((el) => {
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (!top) return 'nothing at its centre';
    return el === top || el.contains(top) ? 'ok' : 'covered by <' + top.tagName.toLowerCase() + ' class="' + (top.className || '') + '">';
  });
  if (verdict !== 'ok') throw new Error(sel + ' is not tappable: ' + verdict);
  await loc.click({ force: true });
}

/* the rows the board shows: rank, name, level pill, record, face, gone */
const rows = (P) => P.page.evaluate(() => [...document.querySelectorAll('[data-lb-board] [data-board-row]')].map((el) => ({
  rank: +el.dataset.boardRow,
  name: (el.querySelector('[data-board-name]') || {}).textContent || '',
  lv: +((el.querySelector('[data-board-lv]') || { dataset: {} }).dataset.boardLv || 0),
  value: ((el.querySelector('[data-lb-value]') || {}).textContent || '').trim(),
  line: ((el.querySelector('[data-board-line]') || {}).textContent || '').trim(),
  face: (el.querySelector('[data-board-face]') || { dataset: {} }).dataset.boardFace || null,
  gone: el.dataset.boardGone === '1',
  stamp: ((el.querySelector('[data-board-deleted]') || {}).textContent || '').trim(),
  lit: getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
})));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');   /* git-ignored; the PR's pictures are docs/shots/leaderboards-*.webp, made from these */
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `leaderboards-${name}.png`) }).catch(() => {});
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Ada', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  A.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  let stop = () => {};
  const bots = [];
  try {
    await H.enterWorld(A);
    const inW = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    stop = H.keepAlive(A);
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(A, (S) => S.myId);

    /* ── 1 ── */
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.boards2));
    rec.ok('1 the worker keeps the boards (caps.boards2)', caps === true, caps);

    /* the three record-makers, wearing the phone's own look (ids the bust knows) */
    const api = `http://127.0.0.1:${wsPort}`;
    const room = await fetch(api + '/api/lobby').then((r) => r.json()).then((j) => (j && j.room) || 'brotown-1').catch(() => 'brotown-1');
    const top0 = await fetch(api + '/api/leaderboard/top?category=combat&limit=50').then((r) => r.json()).catch(() => null);
    const mine0 = top0 && (top0.results || []).find((r) => r.id === me);
    rec.ok('the ranks row of the phone\'s character carries its face as a look, and its level', !!mine0 && !!mine0.look && Object.keys(mine0.look).length >= 2 && mine0.lv >= 1, mine0);
    const look = (mine0 && mine0.look) || {};
    const stamp = Date.now().toString(36);
    const win = await bot(wsPort, room, { id: 'bp_bd_win_' + stamp, name: 'Winnie', device: 'devwin' + stamp, look });
    const lou = await bot(wsPort, room, { id: 'bp_bd_lou_' + stamp, name: 'Lou', device: 'devlou' + stamp, look });
    const gho = await bot(wsPort, room, { id: 'bp_bd_gho_' + stamp, name: 'Ghost', device: 'devgho' + stamp, look });
    bots.push(win, lou, gho);
    rec.ok('three more players are in (guard)', !!win.sync && !!lou.sync && !!gho.sync, [!!win.sync, !!lou.sync, !!gho.sync]);

    /* Winnie: spin, take it */
    win.send('loginspin_go');
    const wr = await win.wait('loginspin_result');
    win.send('loginspin_collect', { k: 0 });
    const wc = await win.wait('loginspin_round', (m) => m.payload && m.payload.collected);
    const winGold = wr && wr.payload ? wr.payload.pot : 0;
    rec.ok(`Winnie spins and takes ${winGold} gold (guard)`, winGold >= 100 && !!wc, [wr && wr.payload, wc && wc.payload]);

    /* Lou: spin, double until nothing */
    lou.send('loginspin_go');
    const lr = await lou.wait('loginspin_result');
    let lost = 0, pot = lr && lr.payload ? lr.payload.pot : 0, k = 0;
    for (let i = 0; i < 14 && pot > 0; i++) {
      lou.clear();
      lou.send('loginspin_double', { k });
      const rr = await lou.wait('loginspin_round');
      if (!rr || !rr.payload) break;
      if (rr.payload.lost) { lost = pot; break; }
      if (!rr.payload.open) break;   /* the house limit paid it: a 1 in 500 run */
      pot = rr.payload.pot; k = rr.payload.k;
    }
    rec.ok(`Lou doubles until the coin says nothing: ${lost} gold lost (guard)`, lost >= 100, { lost, pot, k });

    /* Ghost: spin, take it, then delete the character */
    gho.send('loginspin_go');
    const gr = await gho.wait('loginspin_result');
    gho.send('loginspin_collect', { k: 0 });
    await gho.wait('loginspin_round', (m) => m.payload && m.payload.collected);
    const ghostGold = gr && gr.payload ? gr.payload.pot : 0;
    gho.send('character_reset', { confirm: true });
    const gone = await gho.wait('character_reset_done', null, 10000);
    rec.ok(`Ghost takes ${ghostGold} gold and deletes the character (guard)`, ghostGold >= 100 && !!gone, [gr && gr.payload, !!gone]);
    await A.page.waitForTimeout(800);

    /* ── 2 ── the row */
    await H.unfoldBand(A).catch(() => {});
    const row = await A.page.evaluate(() => {
      const rail = document.querySelector('.bt-navrail');
      const close = document.querySelector('[data-dash-close]');
      const box = (e) => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
      return {
        ids: [...rail.querySelectorAll('[data-nav]')].map((e) => e.dataset.nav),
        boxes: [...rail.querySelectorAll('[data-nav]')].map(box),
        words: [...rail.querySelectorAll('[data-nav-word]')].map((e) => ({ id: e.dataset.navWord, t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1 })),
        mode: rail.dataset.navWords, close: close ? box(close) : null, vw: innerWidth,
        label: (rail.querySelector('[data-nav="leaderboard"]') || { getAttribute: () => null }).getAttribute('aria-label'),
      };
    });
    await shot(A, 'row');
    rec.ok('2a the row is six buttons: Gear, Bro, Quests, Ranks, Codex, More',
      JSON.stringify(row.ids) === JSON.stringify(['dashboard', 'hero', 'quests', 'leaderboard', 'encyclopedia', 'more']), row.ids);
    rec.ok(`2b each inside the screen, none over another or over CLOSE (${row.boxes.map((b) => b.w).join(', ')} px wide)`,
      row.boxes.every((b, i) => b.l >= 0 && b.r <= row.vw && b.w >= 44 && b.h >= 40 && (i === 0 ? (!row.close || b.l >= row.close.r) : b.l >= row.boxes[i - 1].r)), row);
    rec.ok('2c their words show whole ("Ranks" on the button, "Leaderboards" its name)',
      row.mode === 'stack' && row.words.length === 6 && row.words.every((w) => !w.cut) && row.words.some((w) => w.id === 'leaderboard' && w.t === 'Ranks') && row.label === 'Leaderboards', row);
    await tap(A, '.bt-navrail [data-nav="leaderboard"]');
    await A.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
    const open = await A.page.evaluate(() => ({
      page: (document.querySelector('[data-lb-page]') || { dataset: {} }).dataset.lbPage || null,
      lit: (document.querySelector('.bt-navrail [data-nav="leaderboard"]') || { getAttribute: () => null }).getAttribute('aria-pressed'),
      bus: window.__broDashPanelBus ? window.__broDashPanelBus.state : null,
    }));
    rec.ok('2d Ranks opens the Leaderboards, its button lit, as a page of its own (no drill under More)',
      open.page === 'list' && open.lit === 'true' && !!open.bus && open.bus.stack.length === 1 && open.bus.stack[0] === 'leaderboard', open);

    /* ── 3 ── the page */
    const page = await A.page.evaluate(() => {
      const rail = document.querySelector('[data-lb-rail]'), board = document.querySelector('[data-lb-board]'), pg = document.querySelector('[data-lb-page]');
      const b = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
      return {
        secs: [...rail.querySelectorAll('[data-lb-sec]')].map((e) => e.dataset.lbSec),
        heads: [...rail.querySelectorAll('[data-lb-sec]')].map((e) => { const cs = getComputedStyle(e); return { color: cs.color, px: parseFloat(cs.fontSize), weight: +cs.fontWeight, rule: parseFloat(cs.borderBottomWidth) }; }),
        cats: [...rail.querySelectorAll('[data-lb-cat]')].map((e) => e.dataset.lbCat),
        hits: [...rail.querySelectorAll('[data-lb-cat]')].map((e) => Math.round(e.getBoundingClientRect().height)),
        rail: b(rail), board: b(board), pg: b(pg), vw: innerWidth, vh: innerHeight,
        railScrolls: rail.scrollHeight > rail.clientHeight + 4, pageScrolls: pg.scrollHeight > pg.clientHeight + 2,
        openCat: pg.dataset.lbOpen,
      };
    });
    rec.ok('3a the boards are a list under Ranks, Records and Skills: the level, the weapons, kills, the spin, the flip, the fish, the ten skills',
      JSON.stringify(page.secs) === JSON.stringify(['Ranks', 'Records', 'Skills'])
      && ['combat', 'melee', 'bow', 'magic', 'kills', 'spin', 'fish', 'woodcutting', 'trapping'].every((c) => page.cats.includes(c))
      && page.cats.indexOf('spin') < page.cats.indexOf('woodcutting'), page);
    rec.ok('3b every board in the list is a 44 px target; the list and the board stand side by side inside the screen',
      page.hits.every((h) => h >= 44) && page.rail.l >= 0 && page.rail.r <= page.board.l + 1 && page.board.r <= page.vw && page.pg.b <= page.vh, page);
    rec.ok('3c the list scrolls by itself; the page does not', page.railScrolls && !page.pageScrolls && page.openCat === 'combat', page);
    rec.ok('3c2 the headings (Ranks, Records, Skills) headline their sections: brass, 13 px, heavy, a rule under each',
      page.heads.length === 3 && page.heads.every((h) => h.color === 'rgb(216, 170, 88)' && h.px >= 13 && h.weight >= 700 && h.rule >= 1), page.heads);
    /* each board a pill with its own picture */
    const pills = await H.waitFor(A, () => [...document.querySelectorAll('[data-lb-rail] [data-lb-cat]')].map((b) => {
      const pill = b.querySelector('[data-lb-pill]'), img = b.querySelector('[data-lb-icon] img'), word = pill && pill.lastElementChild;
      const cs = pill ? getComputedStyle(pill) : null;
      const ib = b.querySelector('[data-lb-icon]') ? b.querySelector('[data-lb-icon]').getBoundingClientRect() : null;
      return {
        id: b.dataset.lbCat, radius: cs ? parseFloat(cs.borderTopLeftRadius) : 0, h: pill ? Math.round(pill.getBoundingClientRect().height) : 0,
        rim: cs ? cs.borderTopColor : '', on: b.getAttribute('aria-selected') === 'true',
        icon: !!img && img.complete && img.naturalWidth > 0, src: img ? img.getAttribute('src').split('?')[0] : null, iw: ib ? Math.round(ib.width) : 0,
        word: word ? word.textContent : '', cut: !!word && word.scrollWidth > word.clientWidth + 1,
      };
    }), (v) => v.length >= 15 && v.every((p) => p.icon), { timeout: 15000, label: 'the boards\' pictures loaded' }).catch(() => null);
    rec.ok(`3d each board is a pill-shaped button (36 px tall, fully rounded) with its word whole: ${(pills || []).map((p) => p.word).join(', ')}`,
      !!pills && pills.length >= 15 && pills.every((p) => p.h === 36 && p.radius >= 18 && p.word && !p.cut), pills);
    rec.ok('3e ...each with its own picture, loaded, no two alike; the one showing has the brass rim',
      !!pills && pills.every((p) => p.icon && p.iw === 20) && new Set(pills.map((p) => p.src)).size === pills.length
      && pills.filter((p) => p.on).length === 1 && pills.find((p) => p.on).id === 'combat' && pills.find((p) => p.on).rim !== pills.find((p) => !p.on).rim, pills);

    /* ── 4 ── the Level board */
    const lvl = await H.waitFor(A, () => [...document.querySelectorAll('[data-lb-board] [data-board-row]')].map((el) => ({
      name: (el.querySelector('[data-board-name]') || {}).textContent || '', face: (el.querySelector('[data-board-face]') || { dataset: {} }).dataset.boardFace,
    })), (v) => v.length >= 4 && v.filter((r) => r.face === 'bust').length >= 3, { timeout: 30000, label: 'the Level board with faces' }).then(() => rows(A)).catch(() => rows(A));
    await shot(A, 'level');
    const ada = lvl.find((r) => r.name === 'Ada'), ghostRow = lvl.find((r) => r.name === 'Ghost');
    rec.ok('4a the Level board lists the players, each with a face and "Lv N"',
      ['Ada', 'Winnie', 'Lou'].every((n) => lvl.some((r) => r.name === n && !r.gone && r.face === 'bust' && /^Lv \d+$/.test(r.value))), lvl);
    rec.ok('4b the phone\'s own row is lit', !!ada && ada.lit && !lvl.some((r) => r.name !== 'Ada' && r.lit), lvl);
    rec.ok('4c the deleted character keeps its row: grey, its face under a DELETED stamp',
      !!ghostRow && ghostRow.gone && ghostRow.face === 'gone' && ghostRow.stamp === 'DELETED' && /^Lv \d+$/.test(ghostRow.value), ghostRow);
    const grey = await A.page.evaluate(() => {
      const el = document.querySelector('[data-board-gone="1"] [data-board-face] > span');
      const cs = el ? getComputedStyle(el) : null;
      return cs ? { filter: cs.filter, opacity: cs.opacity } : null;
    });
    rec.ok('4d ...really greyed (desaturated and dimmed)', !!grey && /grayscale\(1\)/.test(grey.filter) && Number(grey.opacity) < 0.8, grey);

    /* ── 4e-4g ── the owner's trophies, in the rank's place, shining */
    const cups = await H.waitFor(A, () => [...document.querySelectorAll('[data-lb-board] [data-board-row]')].map((el) => {
      const t = el.querySelector('[data-rank-trophy]');
      const img = t && t.querySelector('img');
      const face = el.querySelector('[data-board-face]');
      const b = t ? t.getBoundingClientRect() : null, f = face ? face.getBoundingClientRect() : null;
      const shine = t && t.querySelector('.bt-rank-shine');
      const anims = t ? t.getAnimations({ subtree: true }) : [];
      return {
        rank: +el.dataset.boardRow, trophy: t ? +t.dataset.rankTrophy : 0, label: t ? t.getAttribute('aria-label') : null,
        loaded: !!img && img.complete && img.naturalWidth === 120, src: img ? img.getAttribute('src') : null,
        w: b ? Math.round(b.width) : 0, h: b ? Math.round(b.height) : 0, leftOfFace: !!b && !!f && b.right <= f.left + 1 && b.left >= 0,
        shine: !!shine && getComputedStyle(shine).display !== 'none', mask: shine ? (getComputedStyle(shine).webkitMaskImage || getComputedStyle(shine).maskImage || '') : '',
        sparks: t ? t.querySelectorAll('.bt-rank-spark').length : 0, running: anims.filter((a) => a.playState === 'running').length,
        gone: el.dataset.boardGone === '1', grey: img ? getComputedStyle(img).filter : '',
        number: ((el.querySelector('[data-rank-mark="number"]') || {}).textContent || '').trim(),
      };
    }), (v) => v.length >= 4 && v.slice(0, 4).every((r) => r.loaded), { timeout: 15000, label: 'the trophies loaded' }).catch(() => null);
    rec.ok('4e the first places wear the owner\'s trophies where the rank was: the gold cup on #1, silver #2, bronze #3, the rosette #4, each left of its face',
      !!cups && cups.slice(0, 4).every((r, i) => r.trophy === i + 1 && r.label === 'Rank ' + (i + 1) && r.loaded && r.w === 40 && r.h === 40 && r.leftOfFace && !r.number
        && new RegExp('/icons/ui/rank-' + (i + 1) + '\\.webp').test(r.src)), cups);
    const live = (cups || []).filter((r) => !r.gone && r.trophy);
    rec.ok(`4f ...shining: a band of light cut to the trophy's own shape, and its stars (${live.map((r) => r.sparks).join(', ')}), all running`,
      live.length >= 3 && live.every((r) => r.shine && /rank-\d\.webp/.test(r.mask) && r.sparks === ({ 1: 3, 2: 2, 3: 2, 4: 1, 5: 1 })[r.trophy] && r.running === r.sparks + 1), live);
    const dead = (cups || []).find((r) => r.gone);
    rec.ok('4g a deleted character\'s trophy is grey and still', !!dead && dead.trophy >= 1 && /grayscale\(1\)/.test(dead.grey) && !dead.shine && dead.sparks === 0 && dead.running === 0, dead);
    /* a still of the shine mid-pass and the stars lit, for the picture */
    await A.page.evaluate(() => {
      for (const t of document.querySelectorAll('[data-rank-trophy]')) for (const a of t.getAnimations({ subtree: true })) {
        const name = a.animationName || '';
        a.pause();
        a.currentTime = name === 'bt-rank-shine' ? 4200 * 0.79 + (parseFloat(getComputedStyle(t).getPropertyValue('--rank-delay')) || 0) * 1000 : 3300 * 0.74 + (parseFloat(getComputedStyle(a.effect.target).animationDelay) || 0) * 1000;
      }
    });
    await A.page.waitForTimeout(250);
    await shot(A, 'trophies');
    await A.page.evaluate(() => { for (const t of document.querySelectorAll('[data-rank-trophy]')) for (const a of t.getAnimations({ subtree: true })) a.play(); });

    /* ── 5 ── the daily spin */
    await tap(A, '[data-lb-rail] [data-lb-cat="spin"]');
    await A.page.waitForSelector('[data-winloss-board="spin"] [data-board-row]', { timeout: 15000 }).catch(() => {});
    await A.page.waitForTimeout(1200);
    const wins = await rows(A);
    await shot(A, 'spin-wins');
    const wRow = wins.find((r) => r.name === 'Winnie'), gRow = wins.find((r) => r.name === 'Ghost');
    rec.ok(`5a Daily spin, Biggest wins: Winnie's ${winGold} gold, her face and level beside it`,
      !!wRow && !wRow.gone && wRow.value === winGold.toLocaleString('en-US') + ' gold' && wRow.lv >= 1 && wRow.face === 'bust' && wRow.line === 'No doubles', wRow);
    rec.ok('5b ...and the deleted character\'s win still stands, as a stand-in',
      !!gRow && gRow.gone && gRow.stamp === 'DELETED' && gRow.value === ghostGold.toLocaleString('en-US') + ' gold' && gRow.lv >= 1, gRow);
    rec.ok('5c the wins are ranked, biggest first', wins.length >= 2 && wins.every((r, i) => r.rank === i + 1
      && (i === 0 || Number(wins[i - 1].value.replace(/[^0-9]/g, '')) >= Number(r.value.replace(/[^0-9]/g, '')))), wins);
    await tap(A, '[data-winloss-tab="losses"]');
    await A.page.waitForTimeout(700);
    const losses = await rows(A);
    await shot(A, 'spin-losses');
    const lRow = losses.find((r) => r.name === 'Lou');
    rec.ok(`5d Biggest losses: Lou's ${lost} gold, lost on a double`,
      !!lRow && lRow.value === lost.toLocaleString('en-US') + ' gold' && /^On the \d+(st|nd|rd|th) double$/.test(lRow.line) && !losses.some((r) => r.name === 'Winnie'), losses);

    /* ── 6 ── */
    await tap(A, '[data-lb-rail] [data-lb-cat="trapping"]');
    await A.page.waitForTimeout(1500);
    const empty = await A.page.evaluate(() => ({
      text: ((document.querySelector('[data-lb-board] [data-board-empty]') || {}).textContent || '').trim(),
      rows: document.querySelectorAll('[data-lb-board] [data-board-row]').length,
      lit: (document.querySelector('[data-lb-rail] [data-lb-cat="trapping"]') || { getAttribute: () => null }).getAttribute('aria-selected'),
    }));
    rec.ok('6 the list scrolls to its last board; a skill nobody trained says so and lists no one',
      empty.text === 'Nobody has trained this yet.' && empty.rows === 0 && empty.lit === 'true', empty);
    /* the biggest fish: each kind's pill wears its fish */
    await tap(A, '[data-lb-rail] [data-lb-cat="fish"]');
    const kinds = await H.waitFor(A, () => [...document.querySelectorAll('[data-fish-board] [data-fish-board-sp]')].map((b) => {
      const img = b.querySelector('img');
      return { sp: b.dataset.fishBoardSp, icon: !!img && img.complete && img.naturalWidth > 0, src: img ? img.getAttribute('src') : null };
    }), (v) => v.length === 5 && v.every((k) => k.icon), { timeout: 12000, label: 'the fish kinds\' pictures' }).catch(() => null);
    rec.ok('6b Biggest fish: five kinds, each pill with its own fish', !!kinds && kinds.length === 5 && kinds.every((k) => k.icon && k.src === '/icons/items/fish-' + k.sp + '.webp'), kinds);
    await tap(A, '[data-lb-rail] [data-lb-cat="trapping"]');
    await A.page.waitForTimeout(600);

    /* More has no Leaderboards tile now */
    await tap(A, '.bt-navrail [data-nav="more"]');
    await A.page.waitForSelector('[data-more-tile]', { timeout: 10000 }).catch(() => {});
    const more = await A.page.evaluate(() => [...document.querySelectorAll('[data-more-tile]')].map((e) => e.dataset.moreTile));
    rec.ok('2e More has eleven tiles, the Leaderboards not among them', more.length === 11 && !more.includes('leaderboard'), more);

    /* ── 7 ── sideways */
    await A.page.evaluate(() => { if (window.__broDashPanelBus) window.__broDashPanelBus.open('leaderboard'); });
    await A.page.setViewportSize({ width: 844, height: 390 });
    await A.page.waitForTimeout(2500);
    await A.page.evaluate(() => { if (window.__broDashPanelBus) window.__broDashPanelBus.open('leaderboard'); });
    await A.page.waitForSelector('[data-lb-page]', { timeout: 10000 }).catch(() => {});
    await A.page.waitForTimeout(800);
    const side = await A.page.evaluate(() => {
      const pg = document.querySelector('[data-lb-page]');
      if (!pg) return null;
      const r = pg.getBoundingClientRect();
      const nav = [...document.querySelectorAll('.bt-navrail [data-nav]')].map((e) => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; });
      return { mode: pg.dataset.lbPage, l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), vw: innerWidth, vh: innerHeight,
        chips: pg.querySelectorAll('[data-lb-cat]').length, rows: pg.querySelectorAll('[data-board-row]').length, nav };
    });
    await shot(A, 'sideways');
    rec.ok('7a sideways the page is the row of chips over the board, the six buttons and the page inside the screen',
      !!side && side.mode === 'chips' && side.chips >= 15 && side.l >= 0 && side.r <= side.vw && side.b <= side.vh
      && side.nav.length === 6 && side.nav.every((n) => n.l >= 0 && n.r <= side.vw), side);
    const chipOn = await A.page.evaluate(() => {
      const box = document.querySelector('[data-lb-chips]'), on = box && box.querySelector('[aria-pressed="true"]');
      if (!on) return null;
      const a = box.getBoundingClientRect(), b = on.getBoundingClientRect();
      return { id: on.dataset.lbCat, shown: b.left >= a.left - 1 && b.right <= a.right + 1 };
    });
    rec.ok('7b ...opened on the board you last looked at, its chip scrolled into sight', !!chipOn && chipOn.id === 'trapping' && chipOn.shown, chipOn);
    /* the narrower phones: a 375 px iPhone keeps the words, 360 and 320 show
       the pictures alone, and the row stays inside the screen down to 320 */
    for (const w of [375, 360, 320]) {
      await A.page.setViewportSize({ width: w, height: 667 });
      await A.page.waitForTimeout(1200);
      const n = await A.page.evaluate(() => {
        const rail = document.querySelector('.bt-navrail');
        const bs = [...rail.querySelectorAll('[data-nav]')].map((e) => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; });
        return { mode: rail.dataset.navWords, bs, vw: innerWidth, cut: [...rail.querySelectorAll('[data-nav-word]')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent) };
      });
      if (w === 375) await shot(A, 'row-375');
      rec.ok(`7c at ${w} px the six buttons are inside the screen, none over another (${n.bs[0] && n.bs[0].w} px each${n.mode === 'stack' ? ', words on' : ', pictures alone'})`,
        n.bs.length === 6 && n.bs.every((b, i) => b.l >= 0 && b.r <= n.vw && (i === 0 || b.l >= n.bs[i - 1].r)) && n.cut.length === 0 && n.mode === (w === 375 ? 'stack' : 'icon'), n);
    }
    await A.page.setViewportSize(PHONE);
    await A.page.waitForTimeout(800);

    /* ── 8 ── */
    rec.ok('8 no page errors', errs.length === 0, errs);
  } finally {
    stop();
    for (const b of bots) b.close();
    await A.ctx.close().catch(() => {});
  }
}
