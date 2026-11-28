/* ═══ THE LEADERBOARDS' HEADERS, WHOLE AT EVERY PHONE SIZE (v2.3.6846, card UI4's block) ═══
 *
 * The owner, 01:40 UTC 2026-11-28, trying the menus' new look on their phone:
 * "Leaderboards menu cuts off headers."  This plays the Menu's Ranks door
 * (dash/RanksLanding.jsx, RankStandings.jsx, rankViews.jsx) on one real phone
 * (touch) in the Wheel's BroTown against a real worker, at 390 x 844,
 * 375 x 667, 320 x 568, 430 x 932 and 844 x 390, through each of its pages
 * (the landing, Combat, Life Skills, Feats, Points placed, Woodcutting, Combat
 * level, Daily spin), and measures every header a page shows: the frame's
 * title and its Back and Menu words, the board's column heads, each door's
 * word.  A header is CUT when its text runs past its own box (scrollWidth over
 * clientWidth, or scrollHeight over clientHeight), past a clipping box around
 * it, or over a neighbour in the header row.  Also: no header word under the
 * screen's smallest word (11 px), no control under 44 x 44.
 * Run: node tools/qa/mp/run.mjs ranksheads  (QUERY=... adds URL switches,
 * e.g. QUERY=v17look=0; SIZES=844x390 one size).  Pictures: tools/qa/out/ranksheads/*.png (dpr 2; git-ignored).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const SIZES = [
  { id: '390x844', width: 390, height: 844 },
  { id: '375x667', width: 375, height: 667 },
  { id: '320x568', width: 320, height: 568 },
  { id: '430x932', width: 430, height: 932 },
  { id: '844x390', width: 844, height: 390 },
];

/* every header on the page now: its words, and whether it is cut (measured once, at rest, off the frame) */
const measure = (P) => P.page.evaluate(() => {
  const frame = document.querySelector('[data-dash-frame]');
  if (!frame) return { none: true };
  const heads = [];
  const add = (el, kind) => { if (el && el.textContent.trim()) heads.push({ el, kind }); };
  add(frame.querySelector('[data-u2="title"]'), 'title');
  for (const b of frame.querySelectorAll('[data-u2="back"], [data-u2="menu"]')) add(b, b.dataset.u2);
  for (const s of document.querySelectorAll('[data-rank-heads] > span')) add(s, 'head');
  for (const t of document.querySelectorAll('[data-ranks-ui2] [data-rank-tile], [data-rank-choice] [data-rank-tile], [data-rank-choice] button')) add(t.querySelector('.u2-tile-label') || t, 'door');
  const cut = [], tiny = [], small = [], backEll = [];
  const textBox = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  for (const { el, kind } of heads) {
    const word = el.textContent.replace(/\s+/g, ' ').trim();
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const own = el.getBoundingClientRect();
    if (own.width === 0 || own.height === 0) continue;
    const why = [];
    /* the text past its own box (a box that clips or ellipses) */
    for (const e of [el, ...el.querySelectorAll('*')]) {
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') why.push('wide ' + e.scrollWidth + '>' + e.clientWidth);
      if (e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== 'visible' && !e.matches('[data-rank-list]')) why.push('tall ' + e.scrollHeight + '>' + e.clientHeight);
    }
    /* the text past a clipping box around it (to the frame) */
    const tb = textBox(el);
    for (let a = el.parentElement; a && a !== frame.parentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      if (a.matches('[data-rank-list], .u2-rk-tiles, .u2-rk-choice')) break;   /* a scroller: its words scroll, never cut */
      const ab = a.getBoundingClientRect();
      if (tb.left < ab.left - 1 || tb.right > ab.right + 1 || tb.top < ab.top - 1 || tb.bottom > ab.bottom + 1) { why.push('past <' + a.tagName.toLowerCase() + ' ' + (a.className || '') + '>'); break; }
    }
    if (tb.right > innerWidth + 1 || tb.left < -1) why.push('off the screen');
    /* Back's long word ending in an ellipsis is the kit's own rule (v2.3.6681: "a long Back word gives way
       before the title"), kept apart: the run allows it at 320 wide only */
    if (why.length) (kind === 'back' ? backEll : cut).push(kind + ' "' + word + '": ' + [...new Set(why)].join(', '));
    const fs = parseFloat(st.fontSize);
    if (fs < 11) tiny.push(kind + ' "' + word + '" ' + fs + 'px');
    if (el.tagName === 'BUTTON' && (own.width < 43.5 || own.height < 43.5)) small.push(kind + ' "' + word + '" ' + Math.round(own.width) + 'x' + Math.round(own.height));
  }
  /* the header row: title, Back, Menu and Close never overlap */
  const row = [...frame.querySelectorAll('.u2-head [data-u2]')].filter((e) => e.getBoundingClientRect().width > 0);
  const over = [];
  for (let i = 0; i < row.length; i++) for (let j = i + 1; j < row.length; j++) {
    const a = row[i].dataset.u2 === 'title' ? textBox(row[i]) : row[i].getBoundingClientRect();
    const b = row[j].dataset.u2 === 'title' ? textBox(row[j]) : row[j].getBoundingClientRect();
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) over.push(row[i].dataset.u2 + '/' + row[j].dataset.u2);
  }
  /* the column heads never overlap one another */
  const hs = [...document.querySelectorAll('[data-rank-heads] > span')].filter((e) => e.textContent.trim() && e.getBoundingClientRect().width > 0).map(textBox);
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) if (hs[i].left < hs[j].right - 1 && hs[j].left < hs[i].right - 1) over.push('heads ' + i + '/' + j);
  return { backEll, title: ((frame.querySelector('[data-u2="title"]') || {}).textContent || '').trim(), n: heads.length, cut, tiny, small, over,
    band: Math.round(frame.getBoundingClientRect().height) };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const SHOTS = join(H.REPO, 'tools/qa/out/ranksheads');
  mkdirSync(SHOTS, { recursive: true });
  const query = process.env.QUERY || '';
  const tagQ = query ? '-' + query.replace(/[^a-z0-9]+/gi, '') : '';
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Sunburn', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel', dpr: 2, query });
  A.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  let stop = () => {};
  try {
    await H.enterWorld(A);
    const inW = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    stop = H.keepAlive(A);
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* a board's rows, in the worker's shape, so every board has standings to head */
    await A.page.route(/\/api\/leaderboard\/top\?/, async (r) => {
      const cat = (/category=(\w+)/.exec(r.request().url()) || [])[1] || 'combat';
      const results = Array.from({ length: 8 }, (_, i) => ({ id: 'bp_rh' + i, name: 'Player ' + (i + 1), lv: 40 - i, level: 99 - i, value: 99 - i, ap: 300 - i, kills: 50 + i,
        gold: 9000 - i, weight: 12 - i, series: { melee: 30, bow: 30, magic: 30 }, lastSeen: Date.now() }));
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, category: cat, results }) });
    });
    const tapSel = async (sel) => {
      const loc = A.page.locator(sel).first();
      await loc.waitFor({ state: 'visible', timeout: 8000 });
      await loc.click({ force: true });
      await A.page.waitForTimeout(700);
    };
    const toLanding = async () => {
      await H.unfoldBand(A).catch(() => {});
      await H.dashMenuRoot(A).catch(() => {});
      await H.dashOpen(A, 'leaderboard');
      await A.page.waitForSelector('[data-ranks-ui2="landing"]', { timeout: 15000 });
      await A.page.waitForTimeout(600);
    };
    const PAGES = [
      ['landing', async () => {}],
      ['combat', async () => tapSel('[data-ranks-ui2="landing"] [data-rank-tile="combat"]')],
      ['points', async () => { await tapSel('[data-ranks-ui2="landing"] [data-rank-tile="combat"]'); await tapSel('[data-rank-tile="points"]'); }],
      ['combatlevel', async () => { await tapSel('[data-ranks-ui2="landing"] [data-rank-tile="combat"]'); await tapSel('[data-rank-tile="combat"]'); }],
      ['life', async () => tapSel('[data-ranks-ui2="landing"] [data-rank-tile="life"]')],
      ['woodcutting', async () => { await tapSel('[data-ranks-ui2="landing"] [data-rank-tile="life"]'); await tapSel('[data-rank-tile="woodcutting"]'); }],
      ['feats', async () => tapSel('[data-ranks-ui2="landing"] [data-rank-tile="feats"]')],
      ['spin', async () => { await tapSel('[data-ranks-ui2="landing"] [data-rank-tile="feats"]'); await tapSel('[data-rank-tile="spin"]'); }],
    ];
    const only = (process.env.SIZES || '').split(',').filter(Boolean);   /* SIZES=844x390 plays one size while you work */
    for (const sz of SIZES.filter((z) => !only.length || only.includes(z.id))) {
      await A.page.setViewportSize({ width: sz.width, height: sz.height });
      await A.page.waitForTimeout(1500);
      for (const [pg, go] of PAGES) {
        let M = null, err = null;
        try { await toLanding(); await go(); M = await measure(A); } catch (e) { err = String(e.message || e).slice(0, 160); }
        await A.page.screenshot({ path: join(SHOTS, `${sz.id}-${pg}${tagQ}.png`) }).catch(() => {});
        if (!M || M.none) { rec.ok(`${sz.id} ${pg}: the page opened`, false, err || 'no frame'); continue; }
        rec.ok(`${sz.id} ${pg} ("${M.title}"): every header whole (${M.n} measured), none over a neighbour, no word under 11 px, no control under 44 px`,
          M.cut.length === 0 && (sz.width <= 320 || M.backEll.length === 0) && M.over.length === 0 && M.tiny.length === 0 && M.small.length === 0 && M.n >= 2, M);
      }
    }
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    stop();
    await A.ctx.close().catch(() => {});
  }
}
