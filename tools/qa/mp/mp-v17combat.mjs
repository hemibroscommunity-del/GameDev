/* ═══ v2.3.6844: A WEAPON'S PAGE AND SHARED LEAD WITH THE UPGRADES, PLAYED (card UI4 PR 5, the owner's V17) ═══
 *
 * The owner, 02:10 UTC 2026-11-28: "Don't like combat menu or primary
 * skill/shared attribute menus. Too confusing for first time player and
 * doesn't use visuals first."  V17:55: "Tap weapon to see actionable upgrades
 * and available points first, then level/progress and actual weapon damage.
 * ... Upgrade preview shows actual before/after effect and cost, explicitly
 * spend, independent point pools. When no points, still inspect explanation;
 * don't show actionable plus."  A real worker and a phone in the world
 * (world: 'wheel'), every step a player's tap:
 *   1. the Combat hub (the HUD's weapon bar, then Back: its road beside V17's
 *      Bro): Sword, Bow, Staff the kit's level tiles, each the game's picture,
 *      exactly one "In hand" and framed; the Shared door shows the seven
 *      upgrades' pictures (as many as fit, never one or two) and its points;
 *   2. a weapon's page (one tap from the hub): the points' line and the six
 *      FIRST (above the level and DPS upright; left of them sideways), each
 *      the game's picture over its name, the "+" cue on every tile while the
 *      pool has points and on none at zero; DPS opens the stat tree and Back
 *      returns;
 *   3. a tap on Power opens the preview: the real before and after; Spend
 *      wears the kit's role (disabled at 0, commit, V17's gold, at 1); Spend
 *      buys ONE point on the worker: Power +1, the Sword pool -1, Bow's and
 *      the shared pool unchanged (the pools apart);
 *   4. at zero points (the Staff, when the worker deals it none) no "+" is
 *      drawn and a tap still opens the explanation;
 *   5. Shared: the seven first, each with its picture (none of the bare
 *      tiles that cut "Max Mana" at 320), then Max HP and Defense; the words
 *      say the game's rule (the best weapon's level); Spend on Max HP takes
 *      the shared pool, never a weapon's;
 *   6. it FITS, upright 390 x 844, 375 x 667, 320 x 568 and sideways
 *      844 x 390 (one row): every control 44 x 44, the tiles whole in view
 *      unscrolled, no word cut; a computer (1440 x 900, wide) draws the four
 *      facts in the row;
 *   7. `?v17combat=0` gives today's pages (the level first, the bare tiles,
 *      the hub's own doors), remembered; `=1` forgets.
 * Pictures (deviceScaleFactor 2) of the band, new and `=0`, at V17's four
 * sizes: docs/shots/v17combat-<screen>-<size>.png and -off.png (BT_V17COMBAT_
 * SHOTS=0: none).  With QA_DIST pointing at the base build only the `=0`
 * pictures are taken, as -base.png: the PR compares them to the pixel.
 */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const SHOOT = process.env.BT_V17COMBAT_SHOTS !== '0';
const BASE = !!process.env.QA_DIST;   /* the base build: only the =0 pictures, for the pixel proof */

const shot = async (P, file) => {
  if (!SHOOT) return;
  try {
    mkdirSync(SHOTS, { recursive: true });
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  } catch (e) { /* no picture */ }
};
const tap = async (P, sel, ms = 700) => {
  const el = P.page.locator(sel).first();
  const touch = await P.page.evaluate(() => navigator.maxTouchPoints > 0).catch(() => false);
  if (touch) await el.tap({ timeout: 12000 }); else await el.click({ timeout: 12000 });
  await P.page.waitForTimeout(ms);
};
const title = (P) => P.page.evaluate(() => { const t = document.querySelector('[data-dash-title]'); return t ? t.getAttribute('data-dash-title') : null; });
const back = (P) => tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);

async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
/* Sword 12 and Bow 5 with points to spend (the worker's deal), a sword in hand, a bow and a staff worn */
async function seed(P, wsPort, rec, tag) {
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'combat', id, { skill: 'sword', level: 12 }).catch(() => null);
  await H.devOp(wsPort, 'combat', id, { skill: 'bow', level: 5, deal: true }).catch(() => null);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  await P.page.waitForTimeout(2000);
  const r = await P.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return { weapon: !!R.weapon, lv: R.prog3 && R.prog3.sk ? R.prog3.sk.sword.level : null }; });
  rec.ok(`${tag}: seeded (a weapon in hand, Sword 12)`, r.weapon && r.lv === 12, r);
}
/* the worker's pools as the phone holds them (the record the worker sent; mp-ui2combat's reading) */
const pools = (P) => H.readState(P, (S) => {
  const p = (S.rpg && S.rpg.prog3) || {};
  const by = p.poolBy || {};
  const free = Math.max(0, (p.pool || 0) - (by.sword || 0) - (by.bow || 0) - (by.staff || 0));
  const atk = p.atk || {};
  return { sword: (by.sword || 0) + free, bow: (by.bow || 0) + free, staff: (by.staff || 0) + free, shared: (p.shared || 0) + free, free,
    dmg: (atk.sword && atk.sword.dmg) || 0, hp: (p.alloc && p.alloc.hp) || 0 };
});

/* what a page shows, read from outside the game: its pieces' boxes, pictures, cues, controls, cut words */
function readPage(kind) {
  const sel = kind === 'hub' ? '[data-combat-hub]' : kind === 'weapon' ? '[data-weapon-page]' : '[data-shared-page]';
  const root = document.querySelector(sel);
  if (!root) return null;
  const band = document.querySelector('[data-band-box="page"]') || document.querySelector('.bt-dashboard');
  const B = band.getBoundingClientRect();
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) }; };
  const whole = (e) => { const r = e.getBoundingClientRect(); return r.left >= B.left - 1 && r.right <= B.right + 1 && r.top >= B.top - 1 && r.bottom <= B.bottom + 1; };
  const onTop = (e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !!t && (t === e || e.contains(t)); };
  const art = (e) => { const i = e.querySelector('img'); return i && i.naturalWidth > 0 && vis(i) ? Math.round(i.getBoundingClientRect().width) : 0; };
  const mark = kind === 'weapon' ? 'data-weapon-attr' : 'data-shared-attr';
  const tiles = kind === 'hub' ? [] : Array.from(root.querySelectorAll('[' + mark + ']')).map((e) => ({
    key: e.getAttribute(mark), box: box(e), art: art(e), cue: e.classList.contains('is-cue'), plusAttr: e.getAttribute('data-attr-plus'),
    role: e.getAttribute('data-u2-role'), words: e.textContent.trim(), whole: whole(e), top: onTop(e), edge: getComputedStyle(e).borderTopColor,
    after: e.classList.contains('is-cue') ? getComputedStyle(e, '::after').color : null,
  }));
  const doors = kind !== 'hub' ? [] : Array.from(root.querySelectorAll('[data-combat-door]')).map((e) => ({
    id: e.getAttribute('data-combat-door'), box: box(e), art: art(e), role: e.getAttribute('data-u2-role'), lt: e.classList.contains('u2-lt'),
    hand: e.getAttribute('data-combat-hand'), framed: e.classList.contains('is-hand'), mark: (e.querySelector('.u2-lt-mark') || {}).textContent || '',
    sevens: e.querySelectorAll('.u2-cv-seven').length, points: e.getAttribute('data-combat-points'), whole: whole(e), top: onTop(e),
  }));
  const at = (q) => { const e = root.querySelector(q); return e && vis(e) ? box(e) : null; };
  const controls = Array.from(root.querySelectorAll('button, [role="button"]')).filter(vis).map((e) => ({ w: box(e), label: e.getAttribute('aria-label') || e.textContent.slice(0, 24) }));
  const cut = [];
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e) || !Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (e.scrollWidth > e.clientWidth + 1) cut.push(e.textContent.trim().slice(0, 30));
    /* a word below its tile's foot (the tile clips it) */
    const tile = e.closest('.u2-cv-up, .u2-wp-attr');
    if (tile) { const r = e.getBoundingClientRect(), t = tile.getBoundingClientRect(); if (r.bottom > t.bottom + 0.5 || r.top < t.top - 0.5) cut.push('foot: ' + e.textContent.trim().slice(0, 30)); }
    const cs = getComputedStyle(e);
    if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) cut.push('… ' + e.textContent.trim().slice(0, 30));
  }
  let scrolled = false;
  for (let a = root; a && a !== document.body; a = a.parentElement) if (a.scrollTop > 0 || a.scrollLeft > 0) scrolled = true;
  return {
    v17: root.classList.contains('u2-cv') || root.classList.contains('u2-cv-hub'), order: root.getAttribute('data-cv-order'),
    oldTiles: root.querySelectorAll('.u2-wp-attr, .u2-cb-door').length,
    tiles, doors, controls, small: controls.filter((c) => c.w.w < 44 || c.w.h < 44), cut, scrolled,
    line: at('.u2-at-line'), level: at('[data-weapon-level]'), dps: at('[data-weapon-dps]'), hp: at('[data-shared-hp]'), def: at('[data-shared-def]'),
    facts: root.querySelectorAll('[data-weapon-stat]').length, allStats: !!root.querySelector('[data-weapon-allstats]'),
    rule: (root.querySelector('[data-shared-rule]') || {}).textContent || '', ruleWords: root.getAttribute('data-shared-rule-words'),
    probe: kind === 'weapon' ? (window.__btWeaponPage || {}).v17 : kind === 'shared' ? (window.__btSharedPage || {}).v17 : (window.__btCombatHub || {}).v17,
  };
}
const read = (P, kind) => P.page.evaluate(readPage, kind);
const popup = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-infopopup-card]');
  if (!c) return null;
  const a = c.querySelector('[data-infopopup-action]');
  return {
    stepper: !!c.querySelector('[data-infopopup-stepper]'),
    count: +((c.querySelector('[data-infopopup-count]') || { getAttribute: () => -1 }).getAttribute('data-infopopup-count')),
    rows: Array.from(c.querySelectorAll('[data-infopopup-row]')).map((r) => r.textContent.trim()),
    role: a ? a.getAttribute('data-u2-role') : null, bg: a ? getComputedStyle(a).backgroundColor : null, ink: a ? getComputedStyle(a).color : null,
    body: c.textContent.trim().slice(0, 160),
  };
});
const closePopup = async (P) => { if (await P.page.locator('[data-infopopup-card] [data-infopopup-x]').count().catch(() => 0)) await tap(P, '[data-infopopup-card] [data-infopopup-x]', 900); };

/* the fit, at one size: the page's controls, its tiles whole and on top, nothing cut or scrolled */
function fits(rec, tag, L, n) {
  rec.ok(`6. ${tag}: every control 44 x 44 at least`, !!L && L.small.length === 0, L && L.small);
  rec.ok(`6. ${tag}: the ${n} tiles whole in view, on top, unscrolled`, !!L && L.tiles.length === n && L.tiles.every((t) => t.whole && t.top) && !L.scrolled, L && L.tiles.filter((t) => !t.whole || !t.top).map((t) => t.key));
  rec.ok(`6. ${tag}: no word cut`, !!L && L.cut.length === 0, L && L.cut);
}

/* the order: upright the line and the tiles above the row under them; sideways the tiles left of the rest */
function ordered(L, form, kind) {
  if (!L || !L.tiles.length || !L.line) return false;
  const tilesBottom = Math.max(...L.tiles.map((t) => t.box.b)), tilesRight = Math.max(...L.tiles.map((t) => t.box.r));
  const rest = kind === 'weapon' ? [L.level, L.dps] : [L.hp, L.def];
  if (rest.some((r) => !r)) return false;
  if (form === 'side') return rest.every((r) => r.x >= tilesRight - 1) && L.line.y <= Math.min(...L.tiles.map((t) => t.box.y));
  return L.line.b <= Math.min(...L.tiles.map((t) => t.box.y)) + 1 && rest.every((r) => r.y >= tilesBottom - 1);
}

async function pageChecks(P, rec, size, form) {
  const tag = `${size} ${form}`;
  await H.dashOpen(P, 'broCombat'); await P.page.waitForTimeout(800);
  const Hb = await read(P, 'hub');
  rec.ok(`1. ${tag}: the hub's weapons the kit's level tiles with the game's pictures; exactly one "In hand", framed`,
    !!Hb && Hb.v17 && Hb.doors.filter((d) => d.lt).length === 3 && Hb.doors.filter((d) => d.lt).every((d) => d.art > 0 && d.role === 'go') && Hb.doors.filter((d) => d.hand === 'held' && d.framed && /In hand/.test(d.mark)).length === 1, Hb && Hb.doors);
  const sd = Hb && Hb.doors.find((d) => d.id === 'shared');
  rec.ok(`1. ${tag}: the Shared door says what it opens: ${sd ? sd.sevens : '?'} of the seven pictures (never one or two)`, !!sd && sd.role === 'go' && (sd.sevens === 0 || sd.sevens >= 3) && (form === 'side' || sd.sevens >= 3), sd);
  rec.ok(`6. ${tag}: the hub's controls 44 x 44, whole`, !!Hb && Hb.small.length === 0 && Hb.doors.every((d) => d.whole && d.top) && Hb.cut.length === 0, Hb && { small: Hb.small, cut: Hb.cut });
  await shot(P, `v17combat-hub-${size}.png`);
  await tap(P, '[data-combat-hub] [data-combat-door="sword"]', 900);
  const W = await read(P, 'weapon');
  const pw = await pools(P);
  rec.ok(`2. ${tag}: the Sword's page leads with the six and the points (${W && W.order})`, !!W && W.v17 && W.order === 'upgrades,progress,damage' && ordered(W, form, 'weapon'), W && { line: W.line, level: W.level, dps: W.dps, probe: W.probe });
  rec.ok(`2. ${tag}: each of the six the game's picture over its name`, !!W && W.tiles.length === 6 && W.tiles.every((t) => t.art > 0 && t.role === 'go'), W && W.tiles.map((t) => [t.key, t.art]));
  rec.ok(`2. ${tag}: the "+" cue on every tile while the Sword has points (${pw.sword})`, !!W && W.tiles.every((t) => t.cue === (pw.sword > 0) && t.plusAttr === (pw.sword > 0 ? '1' : '0')), W && W.tiles.map((t) => t.cue));
  fits(rec, `${tag} Sword`, W, 6);
  rec.ok(`LISTED ${tag}: the Sword page drew ${JSON.stringify(W && W.probe)}`, true);
  await shot(P, `v17combat-weapon-${size}.png`);
  await back(P);
  await tap(P, '[data-combat-hub] [data-combat-door="shared"]', 900);
  const S = await read(P, 'shared');
  rec.ok(`5. ${tag}: Shared leads with the seven and their points, then Max HP and Defense`, !!S && S.v17 && S.order === 'upgrades,strength' && ordered(S, form, 'shared'), S && { line: S.line, hp: S.hp, def: S.def, probe: S.probe });
  rec.ok(`5. ${tag}: each of the seven the game's picture over its name`, !!S && S.tiles.length === 7 && S.tiles.every((t) => t.art > 0), S && S.tiles.map((t) => [t.key, t.art]));
  rec.ok(`5. ${tag}: the words the game's rule (the best weapon's level; flag Q1)`, !!S && /best weapon/.test(S.ruleWords || '') && !/each weapon level/.test(S.ruleWords || ''), S && { rule: S.rule, words: S.ruleWords });
  fits(rec, `${tag} Shared`, S, 7);
  rec.ok(`LISTED ${tag}: Shared drew ${JSON.stringify(S && S.probe)}`, true);
  await shot(P, `v17combat-shared-${size}.png`);
  return { W, S, Hb };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Cbphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (await inWorld(P, rec, 'phone')) {
      await seed(P, wsPort, rec, 'phone');
      await H.unfoldBand(P).catch(() => null);
      if (!BASE) {
        const { W, S } = await pageChecks(P, rec, '390x844', 'upright');
        rec.ok('5. 390x844: the rule drawn beside Max HP and Defense', !!S && /best weapon/.test(S.rule), S && S.rule);
        /* 2. DPS opens the stat tree; Back returns to the page */
        await back(P);
        await tap(P, '[data-combat-hub] [data-combat-door="sword"]', 900);
        await tap(P, '[data-weapon-page] [data-weapon-dps]', 900);
        const t1 = await title(P);
        await back(P);
        const t2 = await title(P);
        rec.ok(`2. DPS opens the stat tree (${t1}); Back returns to the Sword's page (${t2})`, t1 === 'broTree0' && t2 === 'broSword', { t1, t2 });
        /* 3. the preview, its Spend the commit role, one point on the worker, the pools apart */
        const W0 = await pools(P);
        await tap(P, '[data-weapon-attr="dmg"]', 900);
        const Q0 = await popup(P);
        rec.ok('3. Power opens the preview: the stepper at 0, Spend "disabled" with its reason', !!Q0 && Q0.stepper && Q0.count === 0 && Q0.role === 'disabled', Q0);
        await tap(P, '[data-infopopup-card] [data-infopopup-step="up"]', 600);
        const Q1 = await popup(P);
        rec.ok('3. one point: the real before and after, Spend the commit role in V17\'s gold #E4BA68 with #141D22 words',
          !!Q1 && Q1.count === 1 && Q1.rows.length >= 2 && Q1.role === 'commit' && Q1.bg === 'rgb(228, 186, 104)' && Q1.ink === 'rgb(20, 29, 34)', Q1);
        await shot(P, 'v17combat-preview-390x844.png');
        await tap(P, '[data-infopopup-card] [data-infopopup-action]', 2500);
        const W1 = await pools(P);
        rec.ok('3. Spend: Power +1 on the worker, the Sword pool -1, the Bow\'s and the shared pool unchanged', W1.dmg === W0.dmg + 1 && W1.sword === W0.sword - 1 && W1.bow === W0.bow && W1.shared === W0.shared, { W0, W1 });
        await closePopup(P);
        /* 4. zero points: the Staff when the worker deals it none */
        await back(P);
        await tap(P, '[data-combat-hub] [data-combat-door="staff"]', 900);
        const Z = await read(P, 'weapon');
        const pz = await pools(P);
        if (pz.staff === 0) {
          rec.ok('4. the Staff at 0 points: no "+" on any tile', !!Z && Z.tiles.length === 6 && Z.tiles.every((t) => !t.cue && t.plusAttr === '0'), Z && Z.tiles.map((t) => t.cue));
          await tap(P, '[data-weapon-attr="range"]', 900);
          const Qz = await popup(P);
          rec.ok('4. ...and a tap still opens the explanation (nothing to spend)', !!Qz && Qz.body.length > 10 && Qz.role !== 'commit', Qz);
          await closePopup(P);
        } else rec.ok(`4. LISTED: the Staff has ${pz.staff} points here (the free remainder); the zero case is the guard's (combat-v17.test 7)`, true);
        /* 5. Shared: Spend on Max HP takes the shared pool, never a weapon's */
        await back(P);
        await tap(P, '[data-combat-hub] [data-combat-door="shared"]', 900);
        const S0 = await pools(P);
        await tap(P, '[data-shared-attr="hp"]', 900);
        await tap(P, '[data-infopopup-card] [data-infopopup-step="up"]', 600);
        const Qs = await popup(P);
        rec.ok('5. Max HP\'s preview: Spend the commit role at one point', !!Qs && Qs.role === 'commit', Qs);
        await tap(P, '[data-infopopup-card] [data-infopopup-action]', 2500);
        const S1 = await pools(P);
        rec.ok('5. Spend: Max HP +1, the shared pool -1, the Sword\'s unchanged', S1.hp === S0.hp + 1 && S1.shared === S0.shared - 1 && S1.sword === S0.sword, { S0, S1 });
        await closePopup(P);
        for (const [s, form] of [['375x667', 'upright'], ['320x568', 'upright'], ['844x390', 'side']]) {
          const [w, h] = s.split('x').map(Number);
          await P.page.setViewportSize({ width: w, height: h });
          await P.page.waitForTimeout(1800);
          await pageChecks(P, rec, s, form);
        }
        void W;
      }
      /* 7. =0: today's pages, remembered; =1 forgets */
      await P.page.setViewportSize({ width: 390, height: 844 });
      await P.page.goto(P.page.url().replace(/([?&])v17combat=[^&]*/, '$1').replace(/[?&]$/, '') + (P.page.url().includes('?') ? '&' : '?') + 'v17combat=0', { waitUntil: 'domcontentloaded' });
      if (await inWorld(P, rec, 'phone, ?v17combat=0')) {
        await H.unfoldBand(P).catch(() => null);
        for (const [s] of [['390x844'], ['375x667'], ['844x390']]) {
          const [w, h] = s.split('x').map(Number);
          await P.page.setViewportSize({ width: w, height: h });
          await P.page.waitForTimeout(1800);
          await H.dashOpen(P, 'broCombat'); await P.page.waitForTimeout(800);
          const Hb = await read(P, 'hub');
          await shot(P, `v17combat-hub-${s}-${BASE ? 'base' : 'off'}.png`);
          await tap(P, '[data-combat-hub] [data-combat-door="sword"]', 900);
          const W = await read(P, 'weapon');
          await shot(P, `v17combat-weapon-${s}-${BASE ? 'base' : 'off'}.png`);
          await back(P);
          await tap(P, '[data-combat-hub] [data-combat-door="shared"]', 900);
          const S = await read(P, 'shared');
          await shot(P, `v17combat-shared-${s}-${BASE ? 'base' : 'off'}.png`);
          rec.ok(`7. ${s}: ?v17combat=0 gives today's hub, Sword page and Shared page`, !!Hb && !Hb.v17 && Hb.oldTiles === 4 && !!W && !W.v17 && !W.order && W.oldTiles === 6 && !!S && !S.v17 && S.oldTiles === 7, { hub: Hb && Hb.oldTiles, w: W && W.oldTiles, s: S && S.oldTiles });
        }
        const stored = await P.page.evaluate(() => { try { return localStorage.getItem('bt_v17combat'); } catch (e) { return 'x'; } });
        if (!BASE) {
          rec.ok('7. ?v17combat=0 remembered on the phone (bt_v17combat "0")', stored === '0', stored);
          await P.page.goto(P.page.url().replace('v17combat=0', 'v17combat=1'), { waitUntil: 'domcontentloaded' });
          await P.page.waitForTimeout(1500);
          const after = await P.page.evaluate(() => { try { return localStorage.getItem('bt_v17combat'); } catch (e) { return 'x'; } });
          rec.ok('7. ?v17combat=1 forgets the stored off', after === null, after);
        }
      }
    }
  } finally { await P.ctx?.close?.().catch(() => {}); }

  /* 6. a computer (the play column, wide): the four facts in the row under the six; then =0 for its picture */
  for (const off of BASE ? [true] : [false, true]) {
    const C = await H.newPlayer(browser, { name: off ? 'Cbdesk0' : 'Cbdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true, dpr: 2, query: off ? 'v17combat=0' : '' });
    try {
      if (await inWorld(C, rec, off ? 'computer, ?v17combat=0' : 'computer')) {
        await seed(C, wsPort, rec, off ? 'computer, ?v17combat=0' : 'computer');
        await H.unfoldBand(C).catch(() => null);
        await H.dashOpen(C, 'broCombat'); await C.page.waitForTimeout(800);
        await shot(C, `v17combat-hub-1440x900${off ? (BASE ? '-base' : '-off') : ''}.png`);
        await tap(C, '[data-combat-hub] [data-combat-door="sword"]', 900);
        const W = await read(C, 'weapon');
        await shot(C, `v17combat-weapon-1440x900${off ? (BASE ? '-base' : '-off') : ''}.png`);
        await back(C);
        await tap(C, '[data-combat-hub] [data-combat-door="shared"]', 900);
        const S = await read(C, 'shared');
        await shot(C, `v17combat-shared-1440x900${off ? (BASE ? '-base' : '-off') : ''}.png`);
        if (!off) {
          rec.ok('6. 1440x900: the Sword\'s six first, then the level, DPS and the four facts in the row', !!W && W.v17 && ordered(W, 'upright', 'weapon') && W.facts === 4 && !W.allStats, W && { facts: W.facts, probe: W.probe });
          fits(rec, '1440x900 Sword', W, 6);
          rec.ok('6. 1440x900: Shared\'s seven first, then Max HP, Defense and the rule', !!S && S.v17 && ordered(S, 'upright', 'shared') && /best weapon/.test(S.rule), S && { rule: S.rule, probe: S.probe });
          fits(rec, '1440x900 Shared', S, 7);
        } else rec.ok('7. 1440x900: ?v17combat=0 gives today\'s pages', !!W && !W.v17 && !!S && !S.v17, { w: W && W.v17, s: S && S.v17 });
      }
    } finally { await C.ctx?.close?.().catch(() => {}); }
  }
}
