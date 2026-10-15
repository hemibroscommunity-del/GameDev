/* ═══ THE CODEX'S OWN BUTTON, AND MORE OF IT WITHOUT SCROLLING (v2.3.3215) ═══
 *
 * The owner, of the monster codex (#880): "Are you able to fit the codex as
 * another dashboard button? Also is there a way to display more data without
 * needing to scroll down so much?"  Given the choice between six narrower
 * buttons and moving the drill's back arrow down beside the screen's title,
 * the owner: "Move back arrow".
 *
 * Measured on the QA phone before this (390 x 844, a real worker): the list
 * showed NO whole card without scrolling (each 122 px tall in a 167 px box,
 * 331 px to scroll); a monster's page put its tab's first line 172 px down a
 * 167 px box, so its first look was all header; Drops scrolled 482 px, Info
 * 907, Locations 266; and the tabs scrolled away with the rest.  The five
 * buttons were 46 px wide and stepped 38 px right whenever a drill opened.
 *
 * Asserted here:
 *   1. the dashboard's row has SIX buttons, the Codex fifth, More last, each
 *      44 px wide at 390 (39 at 360), on the screen, apart, answering at their
 *      own centres -- and in the SAME places at rest, with the Codex open and
 *      on a drilled screen;
 *   2. the Codex button opens the codex as its own destination, lit; More's
 *      Codex tile opens the same;
 *   3. on a drilled screen (More -> Settings) the way back is the panel's own
 *      header, "◂ SETTINGS", a real target, and it goes back to More;
 *   4. the monster list: all nine cards whole without scrolling, their names
 *      whole;
 *   5. a monster's page: its tab's first lines in the first look; each tab, a
 *      tap puts its content just under the tab bar, which stays pinned at the
 *      top to the end of the scroll; Info's whole stage in view under it;
 *      every tab scrolls less than it did; the bar's ‹ goes back to the list;
 *   6. landscape: the six buttons and the fold chip inside the side
 *      container, the container no wider than the range it had.
 * The numbers go to tools/qa/mp/out/codexfit.json, pictures codexfit-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ORDER = ['dashboard', 'hero', 'quests', 'skills', 'encyclopedia', 'more'];
/* what each tab scrolled on main before this change, on the 390 x 844 phone */
const BEFORE = { list: 331, drops: 482, info: 907, locations: 266 };
/* the stage's ground strip may sit this far under the sheet's 18 px fade
   (MonsterCodex.jsx STAGE_IN_FADE): its feet stand 16 px up, clear of it */
const FADE = 18, STAGE_IN_FADE = 10;

const tap = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b) return false;
  b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  return true;
}, sel);
const click = (P, sel) => P.page.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
const bus = (P) => P.page.evaluate(() => {
  const b = window.__broDashPanelBus;
  return b ? { mode: b.state.mode, stack: [...b.state.stack] } : null;
});

/* the row's buttons: where, how big, and whether a finger at the centre
   reaches the button itself */
const rail = (P) => P.page.evaluate(() => [...document.querySelectorAll('.bt-navrail [data-nav]')].map((b) => {
  const r = b.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { id: b.dataset.nav, x: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height),
    lit: b.getAttribute('aria-pressed') === 'true', self: !!(top && top.closest('[data-nav]') === b) };
}));
const railOk = (rows, vw, minW) => rows.length === ORDER.length
  && rows.every((b, i) => b.id === ORDER[i] && b.w >= minW && b.x >= 0 && b.r <= vw && b.self)
  && rows.every((b, i) => i === 0 || b.x >= rows[i - 1].r);
const sameSpots = (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i].id && Math.abs(x.x - b[i].x) <= 1 && Math.abs(x.w - b[i].w) <= 1);

const measureList = (P) => P.page.evaluate(() => {
  /* the box the codex scrolls in */
  const boxOf = (el) => { let p = el ? el.parentElement : null; while (p && !/auto|scroll/.test(getComputedStyle(p).overflowY)) p = p.parentElement; return p; };
  const grid = document.querySelector('[data-cx-grid]');
  const box = boxOf(grid);
  if (!grid || !box) return null;
  box.scrollTop = 0;
  const br = box.getBoundingClientRect();
  const cards = [...grid.querySelectorAll('[data-cx-card]')];
  const rects = cards.map((c) => c.getBoundingClientRect());
  return {
    boxH: Math.round(br.height), cards: cards.length, cardH: rects.length ? Math.round(rects[0].height) : null,
    whole: rects.filter((r) => r.top >= br.top - 0.5 && r.bottom <= br.bottom + 0.5).length,
    clipped: cards.map((c) => c.querySelector('[data-cx-card-name]')).filter((n) => n && n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent),
    panelTabs: (() => { const t = document.querySelector('[data-cx-panel-tabs]'); return t ? getComputedStyle(t).display : null; })(),
    scroll: Math.max(0, box.scrollHeight - box.clientHeight),
  };
});

/* a page's tab: the first look (scrolled to its top), then where a tap left
   it, then its end */
const measureTab = (P, keepScroll) => P.page.evaluate((keep) => {
  const boxOf = (el) => { let p = el ? el.parentElement : null; while (p && !/auto|scroll/.test(getComputedStyle(p).overflowY)) p = p.parentElement; return p; };
  const FADE_ = 18;
  const page = document.querySelector('[data-cx-page]');
  const box = boxOf(page);
  if (!page || !box) return null;
  const br = box.getBoundingClientRect();
  const bar = page.querySelector('[data-cx-tabbar]');
  const body = page.querySelector('[data-cx-drops], [data-cx-info], [data-cx-locations]');
  const at = () => {
    const rb = bar ? bar.getBoundingClientRect() : null, cb = body ? body.getBoundingClientRect() : null;
    const stage = page.querySelector('[data-cx-stage-fit]');
    const sr = stage ? stage.getBoundingClientRect() : null;
    const rows = [...page.querySelectorAll('[data-cx-drop]')].map((r) => r.getBoundingClientRect());
    return {
      scrollTop: Math.round(box.scrollTop),
      barTop: rb ? Math.round(rb.top - br.top) : null, barBottom: rb ? Math.round(rb.bottom - br.top) : null,
      contentTop: cb ? Math.round(cb.top - br.top) : null,
      shown: cb ? Math.max(0, Math.round(br.bottom - FADE_ - Math.max(rb ? rb.bottom : br.top, cb.top))) : 0,
      rowsWhole: rows.filter((r) => r.top >= (rb ? rb.bottom : br.top) - 0.5 && r.bottom <= br.bottom - FADE_ + 0.5).length,
      stage: sr ? { top: Math.round(sr.top - br.top), bottom: Math.round(sr.bottom - br.top), k: +stage.dataset.cxStageFit } : null,
    };
  };
  const out = { boxH: Math.round(br.height), clientH: box.clientHeight };
  out.tapped = at();
  if (!keep) {
    box.scrollTop = 0;
    out.first = at();
    box.scrollTop = box.scrollHeight;
    out.end = at();
    out.scroll = Math.max(0, box.scrollHeight - box.clientHeight);
    box.scrollTop = 0;
  }
  return out;
}, !!keepScroll);

async function portrait(P, rec, OUT, vw, result) {
  const T = vw + 'w: ';
  const minW = vw >= 390 ? 44 : 39;

  const rest = await rail(P);
  rec.ok(T + `six buttons, the Codex fifth and More last, each ${minW}+ px wide, on screen, apart, each answering at its centre`,
    railOk(rest, vw, minW), rest.map((b) => `${b.id}:${b.w}@${b.x}${b.self ? '' : '(covered)'}`));

  /* ── the Codex button ── */
  await tap(P, '.bt-navrail [data-nav="encyclopedia"]');
  const listUp = await P.page.waitForSelector('[data-cx-grid]', { timeout: 6000 }).then(() => true).catch(() => false);
  await P.page.waitForTimeout(500);
  const b1 = await bus(P);
  const open = await rail(P);
  rec.ok(T + 'the Codex button opens the codex as its OWN destination, lit',
    listUp && b1 && b1.mode === 'expanded' && b1.stack.length === 1 && b1.stack[0] === 'encyclopedia'
      && (open.find((b) => b.id === 'encyclopedia') || {}).lit === true, { b1, lit: open.filter((b) => b.lit).map((b) => b.id) });
  rec.ok(T + '...and the buttons stand where they stood at rest', sameSpots(rest, open), { rest, open });
  if (vw < 390) return { rest, open };

  const list = await measureList(P);
  result.list = list;
  rec.ok(`the monster list: all nine cards whole without scrolling (${list && list.whole}/9; was 0), no name cut short`,
    !!list && list.cards === 9 && list.whole === 9 && list.clipped.length === 0, list);
  rec.ok(`...the Codex's empty Codex / Materials / Zones tabs step aside, and the list scrolls ${list && list.scroll} px (was ${BEFORE.list})`,
    !!list && list.panelTabs === 'none' && list.scroll <= 60, list);
  await P.page.screenshot({ path: join(OUT, 'codexfit-list.png') });

  /* ── a page ── */
  await click(P, '[data-cx-card="snowling"]');
  await P.page.waitForSelector('[data-cx-page="snowling"]', { timeout: 4000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const first = await measureTab(P, false);
  result.first = first;
  rec.ok(`the snowman's page: its first look shows its tab (${first && first.first.shown} px of the table; was none, it began 172 px down a 167 px box)`,
    !!first && first.first.contentTop != null && first.first.contentTop <= 110 && first.first.shown >= 60, first && first.first);
  await P.page.screenshot({ path: join(OUT, 'codexfit-page.png') });

  result.tabs = {};
  for (const t of ['drops', 'info', 'locations']) {
    await click(P, `[data-cx-tab="${t}"]`);
    await P.page.waitForTimeout(t === 'info' ? 1600 : 500);
    const m = await measureTab(P, true);
    await P.page.screenshot({ path: join(OUT, `codexfit-${t}.png`) });
    const all = await measureTab(P, false);
    result.tabs[t] = { tapped: m && m.tapped, ...all };
    const tp = m && m.tapped;
    rec.ok(`${t}: a tap puts it just under the tab bar, pinned at the sheet's top (bar ${tp && tp.barTop}..${tp && tp.barBottom}, content ${tp && tp.contentTop})`,
      !!tp && tp.barTop != null && Math.abs(tp.barTop) <= 1 && tp.contentTop >= tp.barBottom - 1 && tp.contentTop <= tp.barBottom + 8, tp);
    if (t === 'drops') {
      rec.ok(`drops: three rows or more whole under the bar after the tap (${tp && tp.rowsWhole})`, !!tp && tp.rowsWhole >= 3, tp);
    }
    if (t === 'info') {
      const st = tp && tp.stage;
      rec.ok(`info: the whole stage in view under the bar (${st && st.top}..${st && st.bottom} of ${all && all.clientH}, drawn at ${st && st.k})`,
        !!st && st.top >= tp.barBottom - 1 && st.bottom <= all.clientH - (FADE - STAGE_IN_FADE) + 1 && st.k >= 0.8, { st, clientH: all && all.clientH });
    }
    rec.ok(`${t}: the bar is still pinned at the end of the scroll`,
      !!all && !!all.end && all.end.barTop != null && Math.abs(all.end.barTop) <= 1, all && all.end);
    rec.ok(`${t}: scrolls ${all && all.scroll} px (was ${BEFORE[t]})`, !!all && all.scroll < BEFORE[t] * 0.9, { now: all && all.scroll, was: BEFORE[t] });
  }

  /* the bar's ‹ */
  await P.page.evaluate(() => { const b = document.querySelector('[data-cx-tabbar] [data-cx-back]'); if (b) b.click(); });
  const backUp = await P.page.waitForSelector('[data-cx-grid]', { timeout: 4000 }).then(() => true).catch(() => false);
  rec.ok('the bar\'s ‹ goes back to the monsters', backUp);

  /* More's tile opens the same destination */
  await P.page.evaluate(() => window.__broDashPanelBus.open('more'));
  await P.page.waitForTimeout(600);
  await tap(P, '[data-more-tile="encyclopedia"]');
  await P.page.waitForSelector('[data-cx-grid]', { timeout: 4000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  const b2 = await bus(P);
  const viaMore = await rail(P);
  rec.ok('More\'s Codex tile opens the same screen, the Codex button lit',
    !!b2 && b2.stack.length === 1 && b2.stack[0] === 'encyclopedia' && (viaMore.find((b) => b.id === 'encyclopedia') || {}).lit === true, b2);
  return { rest, open };
}

/* the drilled screen: the back arrow beside the title, and the row unmoved */
async function drilled(P, rec, OUT, vw, rest) {
  const T = vw + 'w: ';
  const minW = vw >= 390 ? 44 : 39;
  await P.page.evaluate(() => window.__broDashPanelBus.open('more'));
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="settings"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  await P.page.waitForTimeout(800);
  const b1 = await bus(P);
  const row = await rail(P);
  const back = await P.page.evaluate(() => {
    const b = document.querySelector('[data-dash-back]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const nav = document.querySelector('.bt-navrail');
    const nr = nav ? nav.getBoundingClientRect() : null;
    const top = document.elementFromPoint(r.left + Math.min(60, r.width / 2), r.top + r.height / 2);
    const title = b.querySelector('span:last-child');
    return { text: (b.textContent || '').trim(), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      belowRow: !!nr && r.top >= nr.bottom - 1, self: !!(top && top.closest('[data-dash-back]') === b),
      whole: !!title && title.scrollWidth <= title.clientWidth + 1,
      chipInRow: [...document.querySelectorAll('.bt-dashboard button')].some((x) => (x.textContent || '').trim() === '◂' && !x.closest('[data-dash-back]')) };
  });
  rec.ok(T + 'DRILLED (More -> Settings): every button still where it stood at rest, each ' + minW + '+ px',
    !!b1 && b1.stack.length === 2 && sameSpots(rest, row) && railOk(row, vw, minW), { stack: b1 && b1.stack, row });
  rec.ok(T + 'DRILLED: the way back is the panel\'s own header, "◂ SETTINGS", whole, a real target under the row -- no chip left in the row',
    !!back && /^◂\s*SETTINGS$/i.test(back.text) && back.h >= 32 && back.w >= 120 && back.belowRow && back.self && back.whole && !back.chipInRow, back);
  if (vw >= 390) await P.page.screenshot({ path: join(OUT, 'codexfit-drilled.png') });
  await tap(P, '[data-dash-back]');
  await P.page.waitForTimeout(500);
  const b2 = await bus(P);
  rec.ok(T + 'DRILLED: a tap on it goes back to More', !!b2 && b2.mode === 'expanded' && b2.stack.length === 1 && b2.stack[0] === 'more', b2);
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(300);
}

async function landscape({ browser, wsPort, webPort, rec, OUT }) {
  /* made upright and then turned sideways: the creator's Enter button cannot
     be clicked on a sideways page in this harness (mp-landscape-dash fails
     there on main too, 2026-10-13), and the row and the side sheet do not
     care how the phone got there */
  const P = await H.newPlayer(browser, { name: 'FitSide', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2000);
    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(2500);
    await tap(P, '[data-land-fold]');
    await P.page.waitForTimeout(900);
    const m = await P.page.evaluate(() => {
      const sh = document.querySelector('.bt-land-sheet');
      const dock = document.querySelector('.bt-land-navdock');
      if (!sh || !dock) return null;
      const s = sh.getBoundingClientRect(), d = dock.getBoundingClientRect();
      const btns = [...dock.querySelectorAll('[data-nav]')].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.nav, x: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
      return { sheet: { x: Math.round(s.left), r: Math.round(s.right), w: Math.round(s.width) }, dock: { x: Math.round(d.left), r: Math.round(d.right) }, btns };
    });
    rec.ok('LANDSCAPE: six buttons in the dock, the Codex among them, inside the side container',
      !!m && m.btns.length === 6 && m.btns.some((b) => b.id === 'encyclopedia')
        && m.btns.every((b) => b.x >= m.sheet.x - 1 && b.r <= m.sheet.r + 1 && b.w >= 24), m);
    rec.ok(`LANDSCAPE: the container stays in the width it had (${m && m.sheet.w} px, 205-245)`, !!m && m.sheet.w >= 205 && m.sheet.w <= 245, m && m.sheet);
    await tap(P, '.bt-navrail [data-nav="encyclopedia"]');
    const up = await P.page.waitForSelector('.bt-land-sheet [data-cx-grid]', { timeout: 6000 }).then(() => true).catch(() => false);
    rec.ok('LANDSCAPE: the Codex button opens the codex in the side container', up);
    await P.page.waitForTimeout(400);
    /* the side column is ~220 px: two cards across, their words wrapping,
       never cut short ("N..." for "Not met yet" with three across) */
    const cut = await P.page.evaluate(() => {
      const g = document.querySelector('.bt-land-sheet [data-cx-grid]');
      if (!g) return null;
      const spans = [...g.querySelectorAll('[data-cx-card] span')].filter((x) => x.children.length === 0 && (x.textContent || '').trim());
      return { narrow: g.dataset.cxNarrow, cols: getComputedStyle(g.querySelector('div[style*="grid"]') || g).gridTemplateColumns.split(' ').length,
        cut: spans.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent) };
    });
    rec.ok('LANDSCAPE: the list two across in the side column, no word on a card cut short',
      !!cut && cut.narrow === '1' && cut.cols === 2 && cut.cut.length === 0, cut);
    await P.page.screenshot({ path: join(OUT, 'codexfit-landscape.png') });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const result = {};
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
    const P = await H.newPlayer(browser, { name: 'Fit' + vp.width, wsPort, webPort, viewport: vp, touch: true, world: 'wheel' });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
      rec.ok(vp.width + 'w: in the Wheel (guard)', !!inW, inW);
      if (!inW) continue;
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'codex', me, { all: true, n: 3 }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await H.unfoldBand(P).catch(() => {});
      await P.page.waitForTimeout(600);
      const { rest } = await portrait(P, rec, OUT, vp.width, result);
      await P.page.evaluate(() => window.__broDashPanelBus.toBar());
      await P.page.waitForTimeout(400);
      await drilled(P, rec, OUT, vp.width, rest);
      rec.ok(vp.width + 'w: no page errors', errors.length === 0, errors);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
  await landscape({ browser, wsPort, webPort, rec, OUT });
  writeFileSync(join(OUT, 'codexfit.json'), JSON.stringify(result, null, 1));
}
