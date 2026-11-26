/* ═══ v2.3.6683: BRO'S LANDING, SIX DOORS (card UI2-bro, the build's step 3, PR 1) ═══
 *
 * The owner, 2026-11-25: "Bro landing: Six buttons only under contextual
 * header. Character, Combat, Equipment / Life Skills, Feats, Pets. Remove the
 * redundant player/tap banner."  A phone in the world (upright 390 x 844,
 * then 375 x 667 and sideways 844 x 390), a computer playing wide, and a
 * phone with `?ui2=0`:
 *   1. Bro (by the Menu's tile) is six equal tiles in the agreed order, three
 *      by two upright and on a computer, one row of six sideways; no
 *      portrait, no banner, no page marks; every tile 44 x 44 or more, inside
 *      the band, nothing clipped and nothing to scroll;
 *   2. every door opens its page under its name and Back (saying Bro) returns
 *      to Bro; Equipment opens Gear and the Menu button comes back to Bro;
 *   3. Combat's page has Points (today's Progress door), which opens the
 *      Points window and Back returns to Combat; the glow on Combat while
 *      points wait;
 *   4. each of today's eight Progress doors still has its road;
 *   5. `?ui2=0` gives today's Bro (its pages, no landing).
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-bro-*.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const SIX = ['character', 'combat', 'equipment', 'skills', 'feats', 'pets'];

/* the landing's reading, in the page */
function landing() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const g = document.querySelector('[data-dash-grid="bro"]');
  const page = document.querySelector('[data-dash-page="hero"], [data-dash-frame] ~ * [data-bro-landing]') || (g && g.closest('[data-bro-landing]'));
  const tiles = g ? Array.from(g.querySelectorAll('[data-dest]')).map((e) => {
    const r = e.getBoundingClientRect();
    const lab = e.querySelector('.u2-tile-label');
    return {
      k: e.getAttribute('data-dest'), w: Math.round(r.width), h: Math.round(r.height), word: lab ? lab.textContent.trim() : '',
      out: !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5),
      clip: !!lab && lab.scrollWidth > lab.clientWidth + 1,
      glow: e.classList.contains('is-glow'), badge: (e.querySelector('[data-u2-badge], .u2-badge') || {}).textContent || '',
    };
  }) : [];
  let scroll = false;
  for (let el = g; el && el !== band; el = el.parentElement) if (el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible') { scroll = true; break; }
  const land = g ? g.closest('[data-bro-landing]') : null;
  const t = document.querySelector('[data-dash-title]');
  const back = document.querySelector('[data-dash-frame] [data-dash-ctl="back"]');
  const f = document.querySelector('[data-dash-frame]');
  const bus = window.__broDashPanelBus;
  const nv = bus && bus.nav ? bus.nav() : null;
  return {
    kind: f ? f.getAttribute('data-dash-frame') : null,
    title: t ? t.getAttribute('data-dash-title') : null,
    back: back ? back.textContent.trim() : null,
    rows: g ? +g.getAttribute('data-grid-rows') : 0,
    tiles,
    extra: land ? land.querySelectorAll('img').length - tiles.length : -1,
    marks: document.querySelectorAll('[data-bro-mark]').length,
    banner: !!(land && land.querySelector('[data-bro-whose]')) || document.querySelectorAll('[data-bro-card] .bt-bro3-who, [data-bro-progress]').length > 0,
    scroll,
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    page: page ? 1 : 0,
    pages: document.querySelector('[data-bro-card="pages"]') ? 1 : 0,
    combatPoints: (() => { const e = document.querySelector('[data-bro-door-page="combat"] [data-bro-row="points"]'); return e ? { n: +e.getAttribute('data-bro-spend'), live: e.classList.contains('is-live') } : null; })(),
    hero: window.__btHeroSection ? window.__btHeroSection.shown : null,
    nav: nv ? { ws: nv.ws, shown: nv.shown, menu: nv.menu.map((e) => e.id) } : null,
    rows8: Array.from(document.querySelectorAll('[data-bro-row]')).map((e) => e.getAttribute('data-bro-row')),
    title8: !!document.querySelector('[data-bro-title], [data-bro-pg="overview"] button'),
  };
}
const read = (P) => P.page.evaluate(landing);
const tap = async (P, sel, ms = 600) => { await P.page.locator(sel).first().tap({ timeout: 6000 }); await P.page.waitForTimeout(ms); };
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
function sixOk(L, rows) {
  const sizes = new Set(L.tiles.map((t) => t.w + 'x' + t.h));
  return L.tiles.map((t) => t.k).join(',') === SIX.join(',') && L.rows === rows && sizes.size === 1
    && L.tiles.every((t) => t.w >= 44 && t.h >= 44 && !t.out && !t.clip) && !L.scroll && L.marks === 0 && !L.banner && L.extra === 0;
}
const brief = (L) => ({ tiles: L.tiles.map((t) => `${t.k}:${t.w}x${t.h}${t.out ? ' out' : ''}${t.clip ? ' clip' : ''}`), rows: L.rows, scroll: L.scroll, marks: L.marks, banner: L.banner, extra: L.extra, band: L.band });

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Landbro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'phone'))) return;
    /* 1. the landing */
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(700);
    let L = await read(P);
    rec.ok('1a. 390 x 844: Bro is six equal tiles, three by two, in the agreed order; no portrait, banner or page marks; each 44 x 44 or more, inside the band, nothing clipped, no scroll',
      L.title === 'hero' && sixOk(L, 2), brief(L));
    rec.ok('1b. the words: Character, Combat, Equipment, Life Skills, Feats, Pets', L.tiles.map((t) => t.word).join('|') === 'Character|Combat|Equipment|Life Skills|Feats|Pets', L.tiles.map((t) => t.word));
    rec.ok('1c. the band at 390 x 844 is 390 x 243, as today', L.band && L.band[0] === 390 && L.band[1] === 243, L.band);
    await bandShot(P, 'ui2-bro-landing.png');
    /* 3. the glow: Combat's tile carries the points waiting, as the Menu button does */
    const cmb = L.tiles.find((t) => t.k === 'combat') || {};
    rec.ok('3a. Combat\'s tile glows exactly when it carries a count of points waiting', !!cmb.glow === !!String(cmb.badge).trim(), cmb);
    /* 2. every door opens its page; Back says Bro and returns */
    const PAGES = { character: 'broCharacter', combat: 'broCombat', skills: 'skills', feats: 'achievements', pets: 'pets' };
    const seen = [];
    for (const k of ['character', 'combat', 'skills', 'feats', 'pets']) {
      await tap(P, `[data-dash-grid="bro"] [data-dest="${k}"]`, 900);
      const G = await read(P);
      seen.push({ k, title: G.title, back: G.back, combatPoints: G.combatPoints, rows8: G.rows8, title8: G.title8, pages: G.pages, marks: G.marks });
      if (k === 'character') await bandShot(P, 'ui2-bro-character-interim.png');
      if (k === 'combat') {
        await bandShot(P, 'ui2-bro-combat.png');
        /* 3b. Points from Combat: the Points window, Back returning to Combat */
        await tap(P, '[data-bro-door-page="combat"] [data-bro-row="points"]', 1000);
        const Pp = await read(P);
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
        const Pb = await read(P);
        rec.ok('3b. Combat\'s Points opens the Points window; Back returns to Combat', Pp.title === 'hero' && Pp.hero === 'Build' && Pb.title === 'broCombat', { open: [Pp.title, Pp.hero], back: Pb.title });
      }
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
      seen[seen.length - 1].after = (await read(P)).title;
    }
    rec.ok('2a. each door opens its page under its name, Back saying Bro and returning to Bro',
      seen.every((s) => s.title === PAGES[s.k] && /Bro/.test(s.back || '') && s.after === 'hero'), seen.map((s) => ({ k: s.k, title: s.title, back: s.back, after: s.after })));
    const ch = seen[0], cb = seen[1];
    rec.ok('2b. Character opens today\'s pages (until the passport, PR 2); Combat today\'s Combat page alone, no marks, with Points',
      ch.pages && cb.pages && cb.marks === 0 && !!cb.combatPoints, { ch: [ch.pages, ch.marks], cb: [cb.pages, cb.marks, cb.combatPoints] });
    await tap(P, '[data-dash-grid="bro"] [data-dest="equipment"]', 1000);
    const E = await read(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="menu"]', 900);
    const E2 = await read(P);
    rec.ok('2c. Equipment opens Gear; the Menu button comes back to Bro', E.kind === 'gear-root' && E2.title === 'hero', { gear: E.kind, back: E2.title });
    /* 4. today's eight Progress doors: their roads */
    await tap(P, '[data-dash-grid="bro"] [data-dest="character"]', 900);
    await tap(P, '[data-bro-mark="progress"]', 700);
    const pr = await read(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
    await H.dashMenuRoot(P);
    const menuHas = await P.page.evaluate(() => !!document.querySelector('[data-dash-grid="menu"] [data-dest="homestead"]'));
    const roads = {
      skills: true, pet: true, achievements: true, equipment: true,   /* Bro's own tiles (1a) */
      points: !!cb.combatPoints,                                       /* Combat's Points (3b) */
      titles: pr.rows8.indexOf('titles') >= 0 || ch.title8,            /* Character: today's title line and Titles door */
      clan: pr.rows8.indexOf('clan') >= 0,                             /* Character: today's Clan door */
      homestead: menuHas,                                              /* the Menu's Homestead tile */
    };
    rec.ok('4. each of today\'s eight Progress doors still has its road', Object.values(roads).every(Boolean), { roads, rows: pr.rows8 });
    /* the other shapes */
    for (const s of [{ w: 375, h: 667, rows: 2, tag: '375x667' }, { w: 844, h: 390, rows: 1, tag: '844x390' }]) {
      await P.page.setViewportSize({ width: s.w, height: s.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'hero');
      await P.page.waitForTimeout(800);
      const M = await read(P);
      rec.ok(`1d. ${s.tag}: six tiles ${s.rows === 1 ? 'in one row' : 'three by two'}, each 44 x 44 or more, inside the band, nothing clipped, no scroll`, M.title === 'hero' && sixOk(M, s.rows), brief(M));
      await bandShot(P, `ui2-bro-landing-${s.tag}.png`);
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }
  /* a computer */
  const D = await H.newPlayer(browser, { name: 'Landdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await H.dashOpen(D, 'hero');
      await D.page.waitForTimeout(800);
      const M = await read(D);
      rec.ok('1e. a computer: six tiles three by two, each 44 x 44 or more, inside the band, nothing clipped, no scroll', M.title === 'hero' && sixOk(M, 2), brief(M));
      await bandShot(D, 'ui2-bro-landing-computer.png');
    }
  } finally {
    await D.ctx.close().catch(() => {});
  }
  /* 5. ?ui2=0 */
  const O = await H.newPlayer(browser, { name: 'Landold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  try {
    if (await inWorld(O, rec, 'ui2=0')) {
      await H.dashOpen(O, 'hero');
      await O.page.waitForTimeout(900);
      const M = await read(O);
      rec.ok('5. ?ui2=0: today\'s Bro (its pages), no landing', M.pages === 1 && M.tiles.length === 0, { pages: M.pages, tiles: M.tiles.length });
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
