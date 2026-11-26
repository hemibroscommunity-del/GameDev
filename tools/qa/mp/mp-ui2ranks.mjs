/* ═══ RANKS UNDER THE NEW DASHBOARD (v2.3.6692, card UI2-ranks, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 7, and its acceptance
 * task: "Find Woodcutting rankings; identify the ranked value, find personal
 * position, inspect another player, and return to the same list position."
 * And 2026-11-26: "Reduce the metallic gradients across the first three rows
 * while retaining the gold, silver and bronze medals. Highlight the player's
 * own row regardless of rank."  (dash/RanksLanding.jsx, RankStandings.jsx,
 * rankViews.jsx; the rules src/game/ranksPage.js, ranks-ui2.test.)
 *
 * One real phone (390 x 844, touch) in the Wheel's BroTown against a real
 * worker, four plain-socket players, and long boards served by the test in
 * the worker's shape (as mp-ranksstyle does):
 *   1. the landing: Combat, Life Skills, Feats (no Equipment), the band's
 *      height unchanged from the Menu's;
 *   2. THE ACCEPTANCE TASK: Life Skills, Woodcutting; the header names it, the
 *      heads Rank, Player, Level; no Lv chip; rows 1-3 the same surface as row
 *      4 with the medal; your row marked (24th) and pinned while out of view,
 *      the pinned copy gone (one copy) once scrolled into view; a tap on
 *      another player opens their page named as theirs with the row's values
 *      and "Not shared", nothing to press; Back: Woodcutting at the same scroll;
 *      your own row opens Bro;
 *   3. Combat: Sword, Bow, Staff (never Melee, Magic), Combat level's value
 *      the level; Points placed and a stat board in Points;
 *   4. Feats: Kills, Daily spin's sides, Biggest fish's kinds (the weigh-in
 *      road itself: mp-fishvariants 5);
 *   5. a board you are not on (its foot's line), a deleted row (no door), a
 *      loading board (the placeholder, never "nobody");
 *   6. 375 x 667, 844 x 390, 667 x 375 and a computer: inside the page, no tap
 *      under 44 px, no word under 11 px, no "tap" on a computer;
 *   7. `?ui2=0` gives today's Ranks page, `?ui2=0&rankstyle=0` the older one;
 *   8. no page errors.
 * Pictures: docs/shots/ui2-ranks-*.png (deviceScaleFactor 2).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const PITCH = 46;

/* a plain-socket player: joins and answers pings (mp-ranksstyle's) */
async function bot(wsPort, room, { id, name, device }) {
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
    data: { x: 1000, y: 1000, d: 'south', z: 'town', name },
  }));
  const ok = await Promise.race([got, new Promise((r) => setTimeout(() => r(false), 15000))]);
  return { ok, close: () => { try { ws.close(); } catch { /* gone */ } } };
}

/* a real tap: the element at its own centre must be it */
async function tap(P, sel, timeout = 8000) {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'attached', timeout });
  const verdict = await loc.evaluate((el) => {
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
  const frame = document.querySelector('[data-dash-frame]');
  const title = document.querySelector('[data-dash-title]');
  const board = document.querySelector('[data-rank-board]');
  const list = document.querySelector('[data-rank-list]');
  const pin = document.querySelector('[data-rank-pinned]');
  const other = document.querySelector('[data-char-page="other"]');
  const rows = [...document.querySelectorAll('[data-rank-list] [data-rank-row]')].map((el) => {
    const cs = getComputedStyle(el);
    const medal = el.querySelector('[data-rank-medal] img');
    return { rank: +el.dataset.rankRow, tag: el.tagName.toLowerCase(), h: Math.round(el.getBoundingClientRect().height), mine: el.dataset.rankMine === '1',
      cls: el.className, bg: cs.backgroundImage + '|' + cs.backgroundColor, medal: medal ? (medal.complete && medal.naturalWidth > 0 ? 1 : -1) : 0,
      text: el.textContent.replace(/\s+/g, ' ').trim(), you: !!el.querySelector('[data-rank-you]'), box: box(el) };
  });
  return {
    frame: box(frame), vw: innerWidth, vh: innerHeight, title: title ? title.textContent.trim() : null,
    landing: [...document.querySelectorAll('[data-ranks-ui2="landing"] [data-rank-tile]')].map((b) => ({ id: b.dataset.rankTile, word: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })),
    group: [...document.querySelectorAll('[data-ranks-ui2="group"] [data-rank-tile], [data-ranks-ui2="points"] [data-rank-tile]')].map((b) => ({ id: b.dataset.rankTile, word: b.textContent.trim() })),
    board: board ? board.dataset.rankBoard : null, boardBox: box(board),
    heads: [...document.querySelectorAll('[data-rank-heads] > span')].map((s) => s.textContent.trim()).filter(Boolean),
    boardText: board ? board.textContent.replace(/\s+/g, ' ') : '',
    rows, scroll: list ? Math.round(list.scrollTop) : -1,
    pinned: pin ? { you: !!pin.querySelector('[data-rank-you]'), mine: !!pin.querySelector('.is-mine'), rank: +((pin.querySelector('[data-rank-row]') || { dataset: {} }).dataset.rankRow || 0), box: box(pin) } : null,
    unranked: !!document.querySelector('[data-rank-unranked]'), loading: !!document.querySelector('[data-rank-loading]'),
    empty: ((document.querySelector('[data-rank-empty]') || {}).textContent || '').trim(),
    other: other ? { text: other.textContent.replace(/\s+/g, ' ').trim(), buttons: other.querySelectorAll('button').length, name: ((other.querySelector('[data-char-name]') || {}).textContent || '').trim() } : null,
    lbPage: (document.querySelector('[data-lb-page]') || { dataset: {} }).dataset.lbPage || null,
  };
});
/* in the ranks area: buttons under 44 px, words under 11 px, anything outside the page or the screen */
const fits = (P) => P.page.evaluate(() => {
  const root = document.querySelector('[data-rank-board], [data-ranks-ui2], [data-char-page="other"]');
  if (!root) return { none: true };
  const pg = (root.closest('[data-band-box="page"]') || root).getBoundingClientRect();
  const small = [], tiny = [], out = [];
  for (const b of root.querySelectorAll('button')) {
    const r = b.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) small.push(b.textContent.trim().slice(0, 20) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  for (const el of root.querySelectorAll('*')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11) tiny.push(el.textContent.trim().slice(0, 16) + ':' + fs);
    const scroller = el.closest('[data-rank-list], .u2-rk-tiles, .u2-rk-choice, .u2-rk-other');
    if (!scroller && (r.bottom > Math.min(pg.bottom, innerHeight) + 1 || r.right > Math.min(pg.right, innerWidth) + 1 || r.left < pg.left - 1)) out.push(el.textContent.trim().slice(0, 16));
  }
  return { small, tiny, out, words: root.textContent };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const SHOTS = join(H.REPO, 'docs/shots');
  mkdirSync(SHOTS, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(SHOTS, `ui2-ranks-${name}.png`) }).catch(() => {});
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
    const api = `http://127.0.0.1:${wsPort}`;
    const room = await fetch(api + '/api/lobby').then((r) => r.json()).then((j) => (j && j.room) || 'brotown-1').catch(() => 'brotown-1');
    const stamp = Date.now().toString(36);
    for (const name of ['Glorb', 'Chunky Waffle', 'RogueMuffin', 'Deed Dave']) {
      const id = 'bp_u2r_' + name.replace(/\W/g, '').toLowerCase() + '_' + stamp;
      bots.push(await bot(wsPort, room, { id, name, device: 'dev' + id }));
    }
    rec.ok('four more players are in (guard)', bots.every((b) => b.ok), bots.map((b) => b.ok));
    const caps = await H.readState(A, (S) => ({ statboards: Number(S._serverCaps && S._serverCaps.statboards) || 0 }));

    /* the long boards, in the worker's shape (leaderboard.js _topRead: the row, `value`, `lv`) */
    const longRow = (i, withMe, board) => {
      const mine = withMe && i === 23;
      const lv = 40 - Math.floor(i / 2);
      return { id: mine ? me : 'bp_u2r_long' + i, name: mine ? 'Sunburn' : 'Player ' + (i + 1), lv, level: 99, value: board === 'combat' ? lv : 99 - i,
        ap: 300 - i, kills: 50 + i, clanTag: i === 11 ? 'OAK' : null, series: { melee: lv - 3, bow: lv, magic: lv - 5, woodcutting: 99 - i }, lastSeen: Date.now() };
    };
    let served = { woodcutting: Array.from({ length: 30 }, (_, i) => longRow(i, true, 'woodcutting')), combat: Array.from({ length: 12 }, (_, i) => longRow(i, false, 'combat')) };
    let hold = 0;
    await A.page.route(/\/api\/leaderboard\/top\?category=(woodcutting|combat)&/, async (r) => {
      const cat = /category=(\w+)/.exec(r.request().url())[1];
      if (hold) await new Promise((res) => setTimeout(res, hold));
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, category: cat, results: served[cat] }) });
    });

    /* ── 1 ── the landing */
    await H.unfoldBand(A).catch(() => {});
    await H.dashMenuRoot(A).catch(() => {});
    await A.page.waitForTimeout(600);
    const L0 = await look(A);
    await H.dashOpen(A, 'leaderboard');
    await A.page.waitForSelector('[data-ranks-ui2="landing"]', { timeout: 15000 }).catch(() => {});
    await A.page.waitForTimeout(800);
    const L1 = await look(A);
    await shot(A, 'landing');
    rec.ok(`1 the landing: ${L1.landing.map((t) => t.word).join(', ')} (no Equipment), each a door of 44 px or more, the band ${L1.frame && L1.frame.h} px as the Menu's ${L0.frame && L0.frame.h}`,
      L1.landing.map((t) => t.id).join(',') === 'combat,life,feats' && L1.landing.map((t) => t.word).join(',') === 'Combat,Life Skills,Feats'
      && L1.landing.every((t) => t.h >= 44) && !!L1.frame && !!L0.frame && Math.abs(L1.frame.h - L0.frame.h) <= 1, { L1, L0: L0.frame });

    /* ── 2 ── THE ACCEPTANCE TASK */
    await tap(A, '[data-ranks-ui2="landing"] [data-rank-tile="life"]');
    await A.page.waitForSelector('[data-ranks-ui2="group"]', { timeout: 8000 }).catch(() => {});
    await A.page.waitForTimeout(600);
    const G = await look(A);
    await shot(A, 'group');
    rec.ok(`2a Life Skills: the header "${G.title}", its ten boards (${G.group.map((t) => t.word).join(', ')})`, G.title === 'Life Skills' && G.group.length === 10 && G.group.some((t) => t.id === 'woodcutting'), G.group);
    await tap(A, '[data-rank-tile="woodcutting"]');
    await H.waitFor(A, () => document.querySelectorAll('[data-rank-list] [data-rank-row]').length, (n) => n >= 30, { timeout: 15000, label: 'the long board' }).catch(() => null);
    await H.waitFor(A, () => [...document.querySelectorAll('[data-rank-list] img')].every((i) => i.complete), (v) => v, { timeout: 8000, label: 'the medals' }).catch(() => null);
    await A.page.waitForTimeout(800);
    const W = await look(A);
    await shot(A, 'board');
    rec.ok(`2b the header "${W.title}"; the heads ${W.heads.join(' | ')}; no Lv chip`, W.title === 'Woodcutting' && W.heads.join('|') === 'Rank|Player|Level' && !/\bLv\b/.test(W.boardText), { title: W.title, heads: W.heads });
    const r4 = W.rows.find((r) => r.rank === 4);
    rec.ok('2c rows 1 to 3: the same surface as row 4 (no gradient, tint or edge of their own), each with its medal; every row a door of 44 px',
      !!r4 && [1, 2, 3].every((n) => { const r = W.rows.find((x) => x.rank === n); return r && r.bg === r4.bg && r.cls === r4.cls && r.medal === 1; })
      && W.rows.every((r) => r.h >= 44 && r.tag === 'button'), W.rows.slice(0, 4).map((r) => ({ rank: r.rank, bg: r.bg, cls: r.cls, medal: r.medal })));
    const mine24 = W.rows.find((r) => r.rank === 24);
    rec.ok(`2d your row (24th) marked where it stands, with "You"; pinned at the foot while out of view (${W.pinned && W.pinned.rank})`,
      !!mine24 && mine24.mine && mine24.you && /is-mine/.test(mine24.cls) && !!W.pinned && W.pinned.rank === 24 && W.pinned.you && W.pinned.mine, { mine24, pinned: W.pinned });
    await A.page.evaluate((y) => { const l = document.querySelector('[data-rank-list]'); if (l) l.scrollTop = y; }, 23 * PITCH - 40);
    await A.page.waitForTimeout(900);
    const W2 = await look(A);
    const seen = W2.rows.filter((r) => r.mine && r.box.t >= W2.boardBox.t && r.box.b <= W2.boardBox.b);
    await shot(A, 'board-you');
    rec.ok('2e scrolled into view: your real row shows, the pinned copy is gone (one copy)', !W2.pinned && seen.length === 1, { pinned: W2.pinned, seen: seen.length, scroll: W2.scroll });
    await A.page.evaluate((y) => { const l = document.querySelector('[data-rank-list]'); if (l) l.scrollTop = y; }, 10 * PITCH);
    await A.page.waitForTimeout(900);
    const W3 = await look(A);
    rec.ok('2f scrolled past it: pinned again', !!W3.pinned && W3.pinned.rank === 24, W3.pinned);
    await tap(A, '[data-rank-list] [data-rank-row="12"]');
    await A.page.waitForSelector('[data-char-page="other"]', { timeout: 8000 }).catch(() => {});
    await A.page.waitForTimeout(800);
    const O1 = await look(A);
    await shot(A, 'other');
    rec.ok(`2g another player's page: "${O1.other && O1.other.text.slice(0, 120)}"`,
      !!O1.other && O1.other.name === 'Player 12' && /Player 12's Bro/.test(O1.other.text) && /Woodcutting\s*88/.test(O1.other.text) && /Sword\s*32/.test(O1.other.text)
      && /Clan\s*\[OAK\]/.test(O1.other.text) && /Title\s*Not shared/.test(O1.other.text) && !/Sunburn/.test(O1.other.text) && O1.other.buttons === 0, O1.other);
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await H.waitFor(A, () => { const l = document.querySelector('[data-rank-list]'); return l ? Math.round(l.scrollTop) : -1; }, (y) => Math.abs(y - W3.scroll) <= 1, { timeout: 4000, label: 'the scroll back' }).catch(() => null);
    const W4 = await look(A);
    rec.ok(`2h Back: Woodcutting at the same scroll (${W4.scroll} px, kept ${W3.scroll})`, W4.title === 'Woodcutting' && W4.board === 'woodcutting' && Math.abs(W4.scroll - W3.scroll) <= 1, { title: W4.title, scroll: W4.scroll, kept: W3.scroll });
    await tap(A, '[data-rank-pinned] [data-rank-row]');
    await A.page.waitForTimeout(900);
    const Me = await look(A);
    rec.ok(`2i your own row opens your one Bro page (the header "${Me.title}")`, Me.title === 'Bro' && !Me.other, Me.title);
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForTimeout(600);
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForTimeout(400);
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForSelector('[data-ranks-ui2="landing"]', { timeout: 6000 }).catch(() => {});

    /* ── 3 ── Combat */
    await tap(A, '[data-ranks-ui2="landing"] [data-rank-tile="combat"]');
    await A.page.waitForSelector('[data-ranks-ui2="group"]', { timeout: 8000 }).catch(() => {});
    await A.page.waitForTimeout(500);
    const C = await look(A);
    const words = C.group.map((t) => t.word);
    rec.ok(`3a Combat: ${words.join(', ')}`, C.title === 'Combat' && ['Sword', 'Bow', 'Staff', 'Combat level'].every((w) => words.includes(w)) && !words.includes('Melee') && !words.includes('Magic')
      && (caps.statboards > 0) === words.includes('Points placed'), words);
    await tap(A, '[data-rank-tile="combat"]');
    await H.waitFor(A, () => document.querySelectorAll('[data-rank-list] [data-rank-row]').length, (n) => n >= 12, { timeout: 15000, label: 'Combat level' }).catch(() => null);
    const CL = await look(A);
    rec.ok(`3b Combat level: the heads ${CL.heads.join(' | ')}, the value IS the level (${CL.rows[0] && CL.rows[0].text})`, CL.title === 'Combat level' && CL.heads[2] === 'Level'
      && CL.rows.length >= 12 && /40$/.test(CL.rows[0].text), CL.rows.slice(0, 2).map((r) => r.text));
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForTimeout(500);
    if (caps.statboards > 0) {
      await tap(A, '[data-rank-tile="points"]');
      await A.page.waitForSelector('[data-ranks-ui2="points"]', { timeout: 8000 }).catch(() => {});
      const PP = await look(A);
      await shot(A, 'points');
      const first = PP.group[0];
      if (first) await tap(A, '[data-rank-tile="' + first.id + '"]');
      await A.page.waitForSelector('[data-rank-board]', { timeout: 8000 }).catch(() => {});
      await A.page.waitForTimeout(800);
      const SB = await look(A);
      rec.ok(`3c Points placed: ${PP.group.length} stat boards (the worker ranks ${caps.statboards}); ${first && first.word} heads ${SB.heads.join(' | ')}`,
        PP.title === 'Points placed' && PP.group.length === caps.statboards && !!first && SB.title === first.word && SB.heads[2] === 'Points', { PP: PP.group, SB: SB.heads });
      await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
      await A.page.waitForTimeout(400);
      await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
      await A.page.waitForTimeout(400);
    } else rec.ok('3c no stat boards on this worker: no Points placed door', !words.includes('Points placed'));
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForSelector('[data-ranks-ui2="landing"]', { timeout: 6000 }).catch(() => {});

    /* ── 4 ── Feats */
    await tap(A, '[data-ranks-ui2="landing"] [data-rank-tile="feats"]');
    await A.page.waitForSelector('[data-ranks-ui2="group"]', { timeout: 8000 }).catch(() => {});
    await A.page.waitForTimeout(500);
    const F = await look(A);
    rec.ok(`4a Feats: ${F.group.map((t) => t.word).join(', ')}`, F.title === 'Feats' && F.group.some((t) => t.id === 'kills'), F.group);
    await tap(A, '[data-rank-tile="kills"]');
    await A.page.waitForSelector('[data-rank-board="kills"]', { timeout: 8000 }).catch(() => {});
    await A.page.waitForTimeout(1200);
    const K = await look(A);
    rec.ok(`4b Kills: the heads ${K.heads.join(' | ')}`, K.title === 'Kills' && K.heads[2] === 'Kills', K.heads);
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForTimeout(500);
    if (F.group.some((t) => t.id === 'spin')) {
      await tap(A, '[data-rank-tile="spin"]');
      await A.page.waitForSelector('[data-rank-board="spin"] [data-rank-side="losses"]', { timeout: 8000 }).catch(() => {});
      await tap(A, '[data-rank-side="losses"]').catch(() => {});
      await A.page.waitForTimeout(800);
      const sp = await A.page.evaluate(() => ({ w: (document.querySelector('[data-rank-side="wins"]') || { getAttribute: () => null }).getAttribute('aria-pressed'),
        l: (document.querySelector('[data-rank-side="losses"]') || { getAttribute: () => null }).getAttribute('aria-pressed') }));
      await shot(A, 'spin');
      rec.ok('4c Daily spin: its sides on the board\'s top line, Losses picked', sp.l === 'true' && sp.w !== 'true', sp);
      await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
      await A.page.waitForTimeout(500);
    } else rec.ok('4c no Daily spin board on this worker (skipped)', true);
    if (F.group.some((t) => t.id === 'fish')) {
      await tap(A, '[data-rank-tile="fish"]');
      await A.page.waitForSelector('[data-rank-board="fish"] [data-rank-fish="trout"]', { timeout: 8000 }).catch(() => {});
      await tap(A, '[data-rank-fish="trout"]').catch(() => {});
      await A.page.waitForTimeout(600);
      const tr = await A.page.evaluate(() => (document.querySelector('[data-rank-fish="trout"]') || { getAttribute: () => null }).getAttribute('aria-pressed'));
      rec.ok('4d Biggest fish: its kinds on the top line, the trout picked (the weigh-in road: mp-fishvariants 5)', tr === 'true', tr);
      await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
      await A.page.waitForTimeout(500);
    } else rec.ok('4d no Biggest fish board on this worker (skipped)', true);
    await tap(A, '[data-dash-frame] [data-dash-ctl="back"]');
    await A.page.waitForSelector('[data-ranks-ui2="landing"]', { timeout: 6000 }).catch(() => {});

    /* ── 5 ── off the board, a deleted row, a loading board */
    served = { ...served, woodcutting: Array.from({ length: 6 }, (_, i) => ({ ...longRow(i, false, 'woodcutting'), ...(i === 1 ? { gone: true, name: 'Old Bro' } : {}) })) };
    hold = 4000;
    await tap(A, '[data-ranks-ui2="landing"] [data-rank-tile="life"]');
    await A.page.waitForSelector('[data-ranks-ui2="group"]', { timeout: 8000 }).catch(() => {});
    await tap(A, '[data-rank-tile="woodcutting"]');
    await A.page.waitForTimeout(700);
    const Ld = await look(A);
    rec.ok('5a a board loading: the kit\'s placeholder, never "nobody" before the answer', Ld.loading && !Ld.empty && Ld.rows.length === 0, { loading: Ld.loading, empty: Ld.empty, rows: Ld.rows.length });
    await H.waitFor(A, () => document.querySelectorAll('[data-rank-list] [data-rank-row]').length, (n) => n >= 6, { timeout: 15000, label: 'the short board' }).catch(() => null);
    hold = 0;
    await A.page.waitForTimeout(500);
    const U = await look(A);
    await shot(A, 'unranked');
    const g2 = U.rows.find((r) => r.rank === 2);
    rec.ok('5b not on this board: "Not ranked on this board" at the foot, nothing pinned', U.unranked && !U.pinned && /Not ranked on this board/.test(U.boardText), { unranked: U.unranked });
    await A.page.evaluate(() => { const r = document.querySelector('[data-rank-row="2"]'); if (r) r.click(); });
    await A.page.waitForTimeout(700);
    const U2 = await look(A);
    rec.ok('5c a deleted character\'s row is no door (flat, "Deleted character"; a tap opens nothing)', !!g2 && g2.tag === 'div' && /Deleted character/.test(g2.text) && U2.board === 'woodcutting' && !U2.other, g2);

    /* ── 6 ── other sizes */
    const sizes = [['small', { width: 375, height: 667 }], ['sideways', { width: 844, height: 390 }], ['sideways-small', { width: 667, height: 375 }]];
    const at = [];
    for (const [name, vp] of sizes) {
      await A.page.setViewportSize(vp);
      await A.page.waitForTimeout(1500);
      const f = await fits(A);
      const Lx = await look(A);
      at.push({ name, small: f.small, tiny: f.tiny, out: f.out, rows: Lx.rows.filter((r) => r.box.b <= (Lx.boardBox ? Lx.boardBox.b : 0) + 1 && r.box.t >= (Lx.boardBox ? Lx.boardBox.t : 0) - 1).length });
      await shot(A, name);
    }
    await A.page.setViewportSize(PHONE);
    rec.ok(`6a 375 x 667, 844 x 390, 667 x 375: the board inside the page, no tap under 44 px, no word under 11 px (${at.map((a) => a.name + ' ' + a.rows + ' rows').join('; ')})`,
      at.every((a) => !a.small.length && !a.tiny.length && !a.out.length && a.rows >= 1), at);

    const D = await H.newPlayer(browser, { name: 'Deskbro', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, dpr: 2 });
    others.push(D);
    D.page.on('pageerror', (e) => errs.push('desk: ' + String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(D);
    const inD = await H.waitFor(D, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'the computer in the Wheel' }).catch(() => null);
    if (inD) {
      await D.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await H.dashOpen(D, 'leaderboard');
      await D.page.waitForSelector('[data-ranks-ui2="landing"]', { timeout: 15000 }).catch(() => {});
      await D.page.locator('[data-ranks-ui2="landing"] [data-rank-tile="feats"]').first().click().catch(() => {});
      await D.page.waitForSelector('[data-ranks-ui2="group"]', { timeout: 8000 }).catch(() => {});
      await D.page.locator('[data-rank-tile="kills"]').first().click().catch(() => {});
      await D.page.waitForSelector('[data-rank-board="kills"]', { timeout: 8000 }).catch(() => {});
      await D.page.waitForTimeout(1500);
      const fd = await fits(D);
      await D.page.screenshot({ path: join(SHOTS, 'ui2-ranks-computer.png') }).catch(() => {});
      rec.ok('6b on a computer (wide), clicked: Feats, Kills inside the page, no tap under 44 px, no word under 11 px, no "tap"',
        !fd.none && !fd.small.length && !fd.tiny.length && !fd.out.length && !/\btap\b/i.test(fd.words || ''), fd);
    } else rec.ok('6b the computer reached the Wheel', false, inD);

    /* ── 7 ── today's pages under ?ui2=0 */
    for (const [q, want] of [['ui2=0', 'ranks'], ['ui2=0&rankstyle=0', 'list|chips']]) {
      const O = await H.newPlayer(browser, { name: 'Oldlook', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: q });
      others.push(O);
      O.page.on('pageerror', (e) => errs.push(q + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(O);
      const inO = await H.waitFor(O, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'the old look in the Wheel' }).catch(() => null);
      if (!inO) { rec.ok('7 ?' + q + ' reached the Wheel', false, inO); continue; }
      await H.unfoldBand(O).catch(() => {});
      await H.dashOpen(O, 'leaderboard');
      await O.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
      const Lo = await look(O);
      rec.ok(`7 ?${q}: today's page (${Lo.lbPage}), not the new one`, new RegExp('^(' + want + ')$').test(Lo.lbPage || '') && Lo.landing.length === 0 && !Lo.board, { lbPage: Lo.lbPage });
      await O.ctx.close().catch(() => {});
      others.pop();
    }

    /* ── 8 ── */
    rec.ok('8 no page errors', errs.length === 0, errs);
  } finally {
    stop();
    for (const b of bots) b.close();
    for (const o of others) await o.ctx.close().catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
