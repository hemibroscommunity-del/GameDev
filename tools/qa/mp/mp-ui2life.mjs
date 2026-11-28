/* ═══ v2.3.6694: LIFE SKILLS UNDER THE NEW FRAME (card UI2-life, the build's step 6) ═══
 *
 * The owner, 2026-11-25, the master specification 4.4: "Sum of life skill
 * levels as headline statistic"; "Each skill destination includes a compact
 * XP progress bar"; and 2026-11-26: "Enlarge the icons and cards to occupy the
 * unused vertical space. Put level indicators inside the cards instead of
 * having badges protrude from them. Match the rest of the game's typography."
 * A character seeded on the worker (/dev/lifeskill: each level, XP 0), in the
 * world:
 *   1. the landing (`skills`, through Bro's Life Skills door) at 390 x 844,
 *      375 x 667, 430 x 932, upright and sideways, and on a computer: "Total
 *      level" and ten tiles, every tile 44 x 44 or more, inside the band,
 *      nothing clipped, nothing to scroll, no text under 11 px; the tiles FILL
 *      the page (no band under them); "Lv N" and the dot INSIDE each tile; the
 *      gather row over the craft row, never resorted;
 *   2. the sum equals the ten seeded levels;
 *   3. the specification's acceptance task: "Find combined life skill level,
 *      the highest skill, the next level's XP progress, and a distant future
 *      unlock": the total, the highest tile, a skill's page (its XP now / the
 *      worker's need), and fishing's last rung (Pike, Lv 20) from All
 *      unlocks; NO label of what kind of player you are anywhere (no
 *      specialist, no radar);
 *   4. a skill at 101: the worker's need, ceil(1000 x 1.08^100), never the old
 *      copy's 1.10 a level past 100;
 *   5. trapping: All unlocks is the honest empty ("No unlocks by level" and
 *      how it is earned);
 *   6. Back from All unlocks to the skill, to the landing, to Bro;
 *   7. a level-up not yet seen wears the dot on its tile once;
 *   8. "How it works" carries today's detail lines (the hit ladder's
 *      data-hit-odds);
 *   9. L on a computer opens the landing;
 *  10. `?ui2=0`: today's page (data-skill-grid), no new landing.
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-life-*.png.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');

/* the seeded levels (each its XP 0): enchanting past 100 for step 4; fishing low, so Pike is far */
const SEED = { woodcutting: 12, fishing: 3, mining: 7, farming: 5, trapping: 2, cooking: 9, blacksmithing: 4, woodworking: 1, gemCutting: 15, enchanting: 101 };
const DISPLAY = ['woodcutting', 'fishing', 'mining', 'farming', 'trapping', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting'];
const NEED = (lv) => Math.ceil(1000 * Math.pow(1.08, lv - 1));

/* the room's reading: every press and word of the page inside the band, its size, clipping, scroll, fonts;
   and for the landing, the tiles' fill and what sits inside each tile */
function room(sel, pressSel) {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const root = document.querySelector(sel);
  if (!root) return null;
  const R = root.getBoundingClientRect();
  const out = (r) => !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5);
  const inside = (r, o) => r.left >= o.left - 0.5 && r.right <= o.right + 0.5 && r.top >= o.top - 0.5 && r.bottom <= o.bottom + 0.5;
  const presses = Array.from(root.querySelectorAll(pressSel)).map((e) => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-life-door') || e.getAttribute('data-life-guild') || (e.hasAttribute('data-life-all') ? 'all' : e.hasAttribute('data-life-how-door') ? 'how' : '?'), w: Math.round(r.width), h: Math.round(r.height), out: out(r), top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
  const clipped = [];
  let minFont = 99;
  const fonts = new Set();
  for (const e of root.querySelectorAll('span, b, button, p, div')) {
    if (!e.textContent.trim() || e.children.length) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1) continue;
    minFont = Math.min(minFont, parseFloat(cs.fontSize));
    fonts.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim());
    if (e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible') clipped.push(e.textContent.trim().slice(0, 24));
    if (out(r)) clipped.push('out:' + e.textContent.trim().slice(0, 24));
  }
  let scroll = false;
  for (let el = root; el && el !== band; el = el.parentElement) if (el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible') { scroll = true; break; }
  const tiles = Array.from(root.querySelectorAll('[data-life-door]')).map((e) => {
    const r = e.getBoundingClientRect();
    const lv = e.querySelector('.u2-life-lv');
    const dot = e.querySelector('[data-skill-new]');
    const art = e.querySelector('img');
    const name = e.querySelector('.u2-life-name');
    const a = art ? art.getBoundingClientRect() : null;
    return {
      key: e.getAttribute('data-life-door'), lv: +e.getAttribute('data-life-lv'), raised: e.classList.contains('u2-raised'), btn: e.tagName === 'BUTTON',
      lvText: lv ? lv.textContent.trim() : '', lvInside: !!lv && inside(lv.getBoundingClientRect(), r),
      dot: !!dot, dotInside: !dot || inside(dot.getBoundingClientRect(), r),
      bar: !!e.querySelector('.u2-life-track'), badge: !!e.querySelector('.u2-badge'),
      art: a ? Math.round(Math.min(a.width, a.height)) : 0, nameFont: name ? parseFloat(getComputedStyle(name).fontSize) : 0,
      /* the whole name shown: no word wider than its line, its box inside the tile */
      nameFits: !!name && name.scrollWidth <= name.clientWidth + 1 && inside(name.getBoundingClientRect(), r), nameLines: name ? Math.round(name.getBoundingClientRect().height / (parseFloat(getComputedStyle(name).lineHeight) || 14)) : 0,
      bottom: Math.round(r.bottom), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
    };
  });
  const lowest = tiles.length ? Math.max(...tiles.map((t) => t.bottom)) : 0;
  const t = document.querySelector('[data-dash-title]');
  const tot = root.querySelector('[data-life-total]');
  return {
    title: t ? t.getAttribute('data-dash-title') : null, head: t ? t.textContent.trim() : '', presses, clipped, minFont, scroll, text: root.textContent,
    tiles, under: tiles.length ? Math.round(R.bottom - lowest) : null, pageH: Math.round(R.height), pageW: Math.round(R.width),
    total: tot ? +tot.getAttribute('data-life-total') : null, totalRaised: !!tot && tot.classList.contains('u2-raised'), totalBtn: !!tot && tot.tagName === 'BUTTON',
    fonts: Array.from(fonts),
  };
}
const roomOk = (Q, n) => !!Q && Q.presses.length >= n && Q.presses.every((p) => p.w >= 44 && p.h >= 44 && !p.out) && Q.clipped.length === 0 && !Q.scroll && Q.minFont >= 11;
const roomBrief = (Q) => (Q ? { title: Q.title, page: Q.pageW + 'x' + Q.pageH, names: Q.tiles ? Q.tiles.filter((t) => !t.nameFits).map((t) => t.key).join(',') : '', presses: Q.presses.map((p) => `${p.id}:${p.w}x${p.h}${p.out ? ' out' : ''}`), clipped: Q.clipped, minFont: Q.minFont, scroll: Q.scroll, under: Q.under, art: Q.tiles ? Q.tiles.map((t) => t.art).join(',') : '' } : null);
const LAND = ['[data-life-page]', '[data-life-door]'];
const PAGE = ['[data-life-skill]', '[data-life-guild], [data-life-all], [data-life-how-door]'];
const readRoom = (P, [a, b]) => P.page.evaluate(([x, y]) => window.__u2life(x, y), [a, b]);
async function plant(P) { await P.page.evaluate(`window.__u2life = ${room.toString()}`); }
/* the landing as it must be: ten raised doors in display order, Lv inside, no badge, the tiles fill the page */
const landingOk = (Q) => !!Q && Q.tiles.length === 10 && Q.tiles.map((t) => t.key).join(',') === DISPLAY.join(',')
  && Q.tiles.every((t) => t.raised && t.btn && t.lvInside && t.dotInside && t.nameFits && !t.badge && t.lvText === 'Lv ' + t.lv && t.nameFont === 13)
  && Q.under != null && Q.under <= 6 && !Q.totalRaised && !Q.totalBtn;

const tap = async (P, sel, ms = 700) => {
  const el = P.page.locator(sel).first();
  const touch = await P.page.evaluate(() => navigator.maxTouchPoints > 0).catch(() => false);
  if (touch) await el.tap({ timeout: 15000 }); else await el.click({ timeout: 15000 });
  await P.page.waitForTimeout(ms);
};
const back = (P) => tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
const title = (P) => P.page.evaluate(() => { const t = document.querySelector('[data-dash-title]'); return t ? t.getAttribute('data-dash-title') : null; });
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  } catch (e) { /* no picture */ }
}
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  if (w) await plant(P);
  return !!w;
}
async function seed(P, wsPort, rec, tag) {
  const id = await H.readState(P, (S) => S.myId);
  const got = [];
  for (const k of Object.keys(SEED)) got.push(await H.devOp(wsPort, 'lifeskill', id, { skill: k, level: SEED[k] }).catch(() => null));
  const lv = await H.waitFor(P, (S) => { const ls = (S.rpg && S.rpg.lifeSkills) || {}; const o = {}; for (const k of Object.keys(ls)) o[k] = ls[k] && ls[k].level; return o; },
    (o) => Object.keys(SEED).every((k) => o[k] === SEED[k]), { timeout: 15000, label: 'seeded levels' }).catch(() => null);
  rec.ok(`${tag}: the ten levels seeded on the worker (XP 0)`, got.every((g) => g && g.ok) && !!lv, { lv });
  return id;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const want = Object.values(SEED).reduce((a, b) => a + b, 0);
  const P = await H.newPlayer(browser, { name: 'Lifeskill', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'phone'))) return;
    const myId = await seed(P, wsPort, rec, '0');

    /* 1 and 2: the landing, through Bro's door (H.dashOpen 'skills') */
    await H.dashOpen(P, 'skills');
    await P.page.waitForTimeout(900);
    const L = await readRoom(P, LAND);
    rec.ok('1a. 390 x 844: "Total level" (the stat, recessed) over ten raised doors in display order, each "Lv N" and its dot INSIDE it, no badge, the name at the navigation size',
      L && L.title === 'skills' && landingOk(L), L && { tiles: L.tiles.map((t) => `${t.key}:${t.lvText}:${t.lvInside ? 'in' : 'OUT'}:${t.nameFont}px${t.badge ? ':badge' : ''}`), under: L.under, totalRaised: L.totalRaised });
    rec.ok('1b. 390 x 844: every tile 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px; the tiles fill the page', roomOk(L, 10) && L.under <= 6, roomBrief(L));
    rec.ok('2. the headline is the sum of the ten seeded levels, and of the ten numbers on screen', !!L && L.total === want && L.tiles.reduce((a, t) => a + t.lv, 0) === want
      && L.tiles.every((t) => t.lv === SEED[t.key]), { total: L && L.total, want });
    await bandShot(P, 'ui2-life-landing.png');

    /* 3. the acceptance task: the total (above), the highest tile, its next level's XP, a distant unlock */
    const hi = L ? L.tiles.slice().sort((a, b) => b.lv - a.lv)[0] : null;
    rec.ok('3a. the highest skill read from the tiles: Enchanting at 101', !!hi && hi.key === 'enchanting' && hi.lv === 101, hi);
    rec.ok('3b. no label of what kind of player you are, no radar, on the landing', !!L && !/specialist|generalist|gatherer|crafter|jack of|radar|highest/i.test(L.text), L && L.text.slice(0, 160));
    await tap(P, '[data-life-door="fishing"]', 900);
    const F = await readRoom(P, PAGE);
    const Fp = await P.page.evaluate(() => {
      const e = document.querySelector('[data-life-skill]');
      const lv = document.querySelector('[data-life-level]');
      const nx = document.querySelector('[data-life-next]');
      const all = document.querySelector('[data-life-all]');
      return e && { skill: e.getAttribute('data-life-skill'), lv: lv && lv.getAttribute('data-life-level'), xp: lv && lv.getAttribute('data-life-xp'), next: nx && nx.textContent, nextLv: nx && nx.getAttribute('data-life-next'), all: all && all.getAttribute('data-life-all'), allText: all && all.textContent, guild: (document.querySelector('[data-life-guild]') || {}).textContent || '' };
    });
    rec.ok('3c. Fishing\'s page (its header "Fishing"): Lv 3, its XP now / the worker\'s need, the next unlock (Lv 5: Clownfish), the guild\'s line, "All unlocks (5)"',
      !!Fp && F && F.title === 'lifeFishing' && F.head === 'Fishing' && Fp.lv === '3' && Fp.xp === '0/' + NEED(3) && /Lv 5: Clownfish/.test(Fp.next || '') && Fp.all === '5' && /All unlocks \(5\)/.test(Fp.allText || '')
      && /Angler's Circle/.test(Fp.guild) && /Novice/.test(Fp.guild), { Fp, head: F && F.head });
    rec.ok('3d. 390 x 844: Fishing\'s page in the room: every press 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', roomOk(F, 3), roomBrief(F));
    await bandShot(P, 'ui2-life-skill.png');
    await tap(P, '[data-life-all]', 900);
    const U = await P.page.evaluate(() => {
      const e = document.querySelector('[data-life-unlocks]');
      const t = document.querySelector('[data-dash-title]');
      const rungs = Array.from(document.querySelectorAll('[data-life-rung]')).map((r) => ({ lv: +r.getAttribute('data-life-rung'), st: r.getAttribute('data-life-rung-state'), name: r.getAttribute('data-life-rung-name'), text: r.textContent }));
      return e && { skill: e.getAttribute('data-life-unlocks'), title: t && t.getAttribute('data-dash-title'), rungs };
    });
    const last = U && U.rungs[U.rungs.length - 1];
    rec.ok('3e. All unlocks: fishing\'s whole ladder, each rung its level, its name and its state in words (Minnow got; Clownfish next; Trout, Salmon, Pike later)',
      !!U && U.title === 'lifeUnlocks' && U.skill === 'fishing' && U.rungs.map((r) => r.lv + ':' + r.st).join(',') === '1:got,5:next,10:later,15:later,20:later'
      && U.rungs.every((r) => r.text.includes('Lv ' + r.lv) && r.text.includes(r.name) && /Got|Next|Later/.test(r.text)), U);
    if (last) await P.page.locator(`[data-life-rung="${last.lv}"]`).scrollIntoViewIfNeeded().catch(() => {});
    const seen = await P.page.evaluate(() => { const e = document.querySelector('[data-life-rung="20"]'); const b = document.querySelector('.bt-dashboard'); if (!e || !b) return false; const r = e.getBoundingClientRect(), B = b.getBoundingClientRect(); return r.top >= B.top && r.bottom <= B.bottom; });
    rec.ok('3f. the distant unlock: Pike at Lv 20, "Later", reached on the list', !!last && last.name === 'Pike' && last.lv === 20 && last.st === 'later' && seen, { last, seen });
    await bandShot(P, 'ui2-life-unlocks.png');

    /* 6. Back, step by step */
    await back(P);
    const b1 = await title(P);
    await back(P);
    const b2 = await title(P);
    await back(P);
    const b3 = await P.page.evaluate(() => !!document.querySelector('[data-bro-landing]'));   /* v2.3.6843 (card UI4 PR 4): either Bro (V17's quiet strip, or the six tiles of ?v17bro=0) */
    rec.ok('6. Back: All unlocks to Fishing, to the landing, to Bro', b1 === 'lifeFishing' && b2 === 'skills' && b3, { b1, b2, b3 });

    /* 4. a skill at 101 */
    await H.dashOpen(P, 'skills');
    await P.page.waitForTimeout(700);
    await tap(P, '[data-life-door="enchanting"]', 900);
    const E = await P.page.evaluate(() => { const lv = document.querySelector('[data-life-level]'); return lv && { lv: lv.getAttribute('data-life-level'), xp: lv.getAttribute('data-life-xp'), text: lv.textContent }; });
    rec.ok('4. Enchanting at 101: its XP reads the worker\'s need, ceil(1000 x 1.08^100), never the old copy\'s 1.10', !!E && E.lv === '101' && E.xp === '0/' + NEED(101)
      && E.text.includes(NEED(101).toLocaleString('en-US')), { E, want: NEED(101) });
    await back(P);
    await P.page.waitForTimeout(400);

    /* 5. trapping's honest empty */
    await tap(P, '[data-life-door="trapping"]', 900);
    const T1 = await P.page.evaluate(() => ({ next: (document.querySelector('[data-life-next]') || {}).textContent || '', all: (document.querySelector('[data-life-all]') || { getAttribute: () => null }).getAttribute('data-life-all') }));
    await tap(P, '[data-life-all]', 900);
    const T2 = await P.page.evaluate(() => { const e = document.querySelector('[data-life-unlocks]'); const m = e && e.querySelector('[data-u2-empty]'); return e && { skill: e.getAttribute('data-life-unlocks'), rungs: e.querySelectorAll('[data-life-rung]').length, empty: !!m, text: m ? m.textContent : '' }; });
    rec.ok('5. Trapping: "No unlocks by level" on its page and on All unlocks (the kit\'s empty state, with how it is earned), no rung invented',
      /No unlocks by level/.test(T1.next) && T1.all === '0' && !!T2 && T2.skill === 'trapping' && T2.rungs === 0 && T2.empty && /No unlocks by level/.test(T2.text) && /trap/i.test(T2.text), { T1, T2 });
    await back(P);
    await back(P);

    /* 8. How it works: today's detail lines (Fishing: the hit ladder) */
    await tap(P, '[data-life-door="fishing"]', 900);
    await tap(P, '[data-life-how-door]', 900);
    const W = await P.page.evaluate(() => { const e = document.querySelector('[data-life-how]'); const t = document.querySelector('[data-dash-title]'); return e && { skill: e.getAttribute('data-life-how'), title: t && t.getAttribute('data-dash-title'), hits: !!e.querySelector('[data-hit-odds]'), text: e.textContent }; });
    const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.gatherhits));
    rec.ok('8. How it works: Fishing\'s detail lines, the hit ladder (data-hit-odds) where the worker rolls hits, where it is found, how it is earned',
      !!W && W.title === 'lifeHow' && W.skill === 'fishing' && (W.hits || !caps) && /Found at/.test(W.text) && /Cast at fishing spots/.test(W.text), W && { ...W, text: W.text.slice(0, 160), caps });
    const Wr = await readRoom(P, ['[data-life-how]', 'button']);
    rec.ok('8b. 390 x 844: How it works in the room: nothing clipped, no scroll, no text under 11 px', !!Wr && Wr.clipped.length === 0 && !Wr.scroll && Wr.minFont >= 11, roomBrief(Wr));
    await bandShot(P, 'ui2-life-how.png');

    /* 7. a level-up not yet seen: the dot on its tile, once */
    await H.devOp(wsPort, 'lifeskill', myId, { skill: 'cooking', level: SEED.cooking + 1 }).catch(() => null);
    await H.waitFor(P, (S) => S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.cooking && S.rpg.lifeSkills.cooking.level, (v) => v === SEED.cooking + 1, { timeout: 15000, label: 'cooking up' }).catch(() => null);
    await H.dashOpen(P, 'skills');
    await P.page.waitForTimeout(900);
    const D1 = await readRoom(P, LAND);
    await bandShot(P, 'ui2-life-landing-dot.png');
    await back(P);
    await H.dashOpen(P, 'skills');
    await P.page.waitForTimeout(900);
    const D2 = await readRoom(P, LAND);
    const dots = (Q) => (Q ? Q.tiles.filter((t) => t.dot).map((t) => t.key).join(',') : null);
    rec.ok('7. a level-up not yet seen wears the brass dot inside its tile (Cooking only), and not on the next visit', dots(D1) === 'cooking' && D1.tiles.every((t) => t.dotInside) && dots(D2) === '', { d1: dots(D1), d2: dots(D2) });

    /* 1c. the other sizes */
    const SIZES = [{ w: 375, h: 667, f: 'ui2-life-landing-375.png' }, { w: 430, h: 932 }, { w: 844, h: 390, f: 'ui2-life-landing-side.png' }, { w: 667, h: 375 }, { w: 932, h: 430 }];
    for (const s of SIZES) {
      await P.page.setViewportSize({ width: s.w, height: s.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'skills');
      await P.page.waitForTimeout(900);
      await plant(P);
      const Q = await readRoom(P, LAND);
      rec.ok(`1c. ${s.w} x ${s.h}: the landing in the room, the ten fill it, Lv inside each tile`, roomOk(Q, 10) && landingOk(Q) && Q.total === want + 1, roomBrief(Q));
      if (s.f) await bandShot(P, s.f);
      if (s.w === 844) {
        await tap(P, '[data-life-door="fishing"]', 900);
        const Fs = await readRoom(P, PAGE);
        const nx = await P.page.evaluate(() => !!document.querySelector('[data-life-next]'));
        rec.ok('3g. 844 x 390: Fishing\'s page sideways, the next unlock on it, in the room', roomOk(Fs, 2) && nx, roomBrief(Fs));
        await bandShot(P, 'ui2-life-skill-side.png');
      }
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* 9. a computer: L opens the landing; the landing in the room */
  const C = await H.newPlayer(browser, { name: 'Lifedesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (await inWorld(C, rec, 'computer')) {
      await seed(C, wsPort, rec, '9');
      await C.page.mouse.click(640, 300).catch(() => {});
      await C.page.keyboard.press('l');
      await C.page.waitForTimeout(1200);
      const t = await title(C);
      const Q = await readRoom(C, LAND);
      rec.ok('9. a computer: L opens the Life Skills landing; in the room, the ten fill it', t === 'skills' && roomOk(Q, 10) && landingOk(Q) && Q.total === want, { t, ...roomBrief(Q) });
      await bandShot(C, 'ui2-life-landing-desk.png');
    }
  } finally {
    await C.ctx.close().catch(() => {});
  }

  /* 10. ?ui2=0: today's page */
  const O = await H.newPlayer(browser, { name: 'Lifeold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  try {
    if (await inWorld(O, rec, 'ui2=0')) {
      await O.page.evaluate(() => window.__broDashPanelBus.open('skills'));   /* today's road (mp-hitladder's) */
      await O.page.waitForTimeout(900);
      const M = await O.page.evaluate(() => ({ old: !!document.querySelector('[data-skill-grid]'), tiles: document.querySelectorAll('[data-skill]').length, neu: !!document.querySelector('[data-life-page]') }));
      rec.ok('10. ?ui2=0: today\'s Life Skills page (its grid of ten), no new landing', M.old && M.tiles === 10 && !M.neu, M);
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
