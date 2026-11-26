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
 *   3. Combat's page has Points (today's Progress door; v2.3.6685: the hub's
 *      Shared door), which opens the Points window and Back returns to
 *      Combat; the glow on Combat while
 *      points wait;
 *   4. each of today's eight Progress doors still has its road;
 *   5. `?ui2=0` gives today's Bro (its pages, no landing).
 * v2.3.6684 (PR 2), CHARACTER, THE PASSPORT, on a character seeded on the
 * worker (its levels by /dev/combat, Blooded earned by /dev/achv: the
 * record on file the passport reads):
 *   6. the specification's first acceptance task, "Find your combat level,
 *      then your Bow level": both on the passport, unscrolled, the combat
 *      level the WORKER's (its charLevel) right beside the face, the Bow
 *      level the seeded one; the Bow door opens the Bow's own page over
 *      Combat's hub (v2.3.6685): Back to the hub, Back to the passport;
 *   7. the passport shows the real name, title ("No title equipped" before),
 *      levels and counts, honest lines where the game has none (No clan,
 *      Skill guilds); every door 44 x 44 or more, inside the band, nothing
 *      clipped, nothing to scroll, no text under 11 px; at 390 x 844,
 *      375 x 667, 844 x 390, 667 x 375 and on a computer;
 *   8. the title changed from it: Titles, pick Blooded, Equip; the button
 *      marks itself pending ('out') and the worker's answer settles it; Back:
 *      the passport reads "Blooded".
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
    /* v2.3.6685 (card UI2-combat): Combat is its hub; the shared count's door opens the Points window */
    combatPoints: (() => { const e = document.querySelector('[data-bro-door-page="combat"] [data-combat-hub] [data-combat-door="shared"]'); return e ? { n: +e.getAttribute('data-combat-points'), live: e.classList.contains('is-glow') } : null; })(),
    hub: document.querySelector('[data-bro-door-page="combat"] [data-combat-hub]') ? 1 : 0,
    hero: window.__btHeroSection ? window.__btHeroSection.shown : null,
    nav: nv ? { ws: nv.ws, shown: nv.shown, menu: nv.menu.map((e) => e.id) } : null,
    rows8: Array.from(document.querySelectorAll('[data-bro-row]')).map((e) => e.getAttribute('data-bro-row')),
    title8: !!document.querySelector('[data-bro-title], [data-bro-pg="overview"] button'),
  };
}
const read = (P) => P.page.evaluate(landing);
/* v2.3.6684: the passport's reading, in the page */
function passport() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const root = document.querySelector('[data-char-page]');
  if (!root || !B) return null;
  const out = (r) => r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5;
  const txt = (sel) => { const e = root.querySelector(sel); return e ? e.textContent.trim() : null; };
  const doors = Array.from(root.querySelectorAll('[data-char-door]')).map((e) => {
    const r = e.getBoundingClientRect();
    return { id: e.getAttribute('data-char-door'), w: Math.round(r.width), h: Math.round(r.height), out: out(r), loading: e.hasAttribute('data-char-loading') };
  });
  const clipped = Array.from(root.querySelectorAll('.u2-pass-k, .u2-pass-v, .u2-pass-name, .u2-pass-title, .u2-group-k')).filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim());
  let minFont = 99;
  for (const e of root.querySelectorAll('*')) {
    if (!Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    minFont = Math.min(minFont, parseFloat(getComputedStyle(e).fontSize) || 99);
  }
  let scroll = false;
  for (const e of [root, ...root.querySelectorAll('*')]) {
    const cs = getComputedStyle(e);
    if ((cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1) || (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1)) { scroll = true; break; }
  }
  const face = root.querySelector('[data-char-portrait]');
  const cmb = root.querySelector('[data-char-combat]');
  const fr = face ? face.getBoundingClientRect() : null;
  const cr = cmb ? cmb.getBoundingClientRect() : null;
  /* beside: the level's box starts within 12 px of the face's right edge and they share rows */
  const beside = !!(fr && cr) && cr.left - fr.right >= -0.5 && cr.left - fr.right <= 12 && cr.top < fr.bottom && cr.bottom > fr.top;
  const t = document.querySelector('[data-dash-title]');
  return {
    shape: root.getAttribute('data-char-shape'), who: root.getAttribute('data-char-page'),
    title: t ? t.getAttribute('data-dash-title') : null,
    name: txt('[data-char-name]'), tline: txt('[data-char-title]'), titleId: (root.querySelector('[data-char-title]') || { getAttribute: () => null }).getAttribute('data-char-title'),
    combat: cmb ? cmb.getAttribute('data-char-combat') : null, combatText: cmb ? cmb.textContent.trim() : null,
    bow: txt('[data-char-v="weapon-bow"]'), sword: txt('[data-char-v="weapon-sword"]'), staff: txt('[data-char-v="weapon-staff"]'),
    clan: txt('[data-char-v="clan"]'), guilds: txt('[data-char-v="guilds"]'), ap: txt('[data-char-v="ap"]'), quests: txt('[data-char-v="quests"]'),
    face: fr ? [Math.round(fr.width), Math.round(fr.height)] : null, beside,
    doors, clipped, minFont, scroll,
  };
}
const readPass = (P) => P.page.evaluate(passport);
const passOk = (Q) => !!Q && Q.doors.length >= 9 && Q.doors.every((d) => d.w >= 44 && d.h >= 44 && !d.out) && Q.clipped.length === 0 && !Q.scroll && Q.minFont >= 11 && Q.beside;
const passBrief = (Q) => (Q ? { shape: Q.shape, face: Q.face, beside: Q.beside, doors: Q.doors.map((d) => `${d.id}:${d.w}x${d.h}${d.out ? ' out' : ''}`), clipped: Q.clipped, minFont: Q.minFont, scroll: Q.scroll } : null);
const lvOf = (s) => { const m = /(\d+)\s*$/.exec(String(s || '')); return m ? +m[1] : null; };
const tap = async (P, sel, ms = 600) => { await P.page.locator(sel).first().tap({ timeout: 15000 });   /* a slow box: 2 of 4 runs waited past 6 s for Bro's tiles after Points, Back, Back */ await P.page.waitForTimeout(ms); };
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
      seen.push({ k, title: G.title, back: G.back, combatPoints: G.combatPoints, rows8: G.rows8, title8: G.title8, pages: G.pages, marks: G.marks,
        pass: k === 'character' ? await readPass(P) : null });
      if (k === 'combat') {
        await bandShot(P, 'ui2-bro-combat.png');
        /* 3b. Points from Combat: the Points window, Back returning to Combat */
        await tap(P, '[data-bro-door-page="combat"] [data-combat-door="shared"]', 1000);   /* v2.3.6685: the hub's Shared door */
        const Pp = await read(P);
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
        const Pb = await read(P);
        rec.ok('3b. Combat\'s Points opens the Points window; Back returns to Combat', Pp.title === 'hero' && Pp.hero === 'Build' && Pb.title === 'broCombat', { open: [Pp.title, Pp.hero], back: Pb.title });
      }
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
      const A = await read(P);
      seen[seen.length - 1].after = A.title;
      seen[seen.length - 1].afterHero = A.hero;
      if (k === 'combat') {
        const vis = await P.page.evaluate(() => { const e = document.querySelector('[data-dash-grid="bro"] [data-dest="skills"]'); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { r: [r.x, r.y, r.width, r.height].map(Math.round), vis: cs.visibility, op: cs.opacity, n: document.querySelectorAll('[data-dash-grid="bro"]').length }; });
        seen[seen.length - 1].vis = vis;
        if (!vis || vis.r[2] < 1) { rec.ok('2z. after Combat, Bro\'s landing is back', false, { A: { title: A.title, hero: A.hero, tiles: A.tiles.length }, vis }); return; }
      }
    }
    rec.ok('2a. each door opens its page under its name, Back saying Bro and returning to Bro',
      seen.every((s) => s.title === PAGES[s.k] && /Bro/.test(s.back || '') && s.after === 'hero'), seen.map((s) => ({ k: s.k, title: s.title, back: s.back, after: s.after })));
    const ch = seen[0], cb = seen[1];
    rec.ok('2b. Character opens the passport (v2.3.6684), not today\'s pages; Combat its hub (v2.3.6685), no marks, with Points (its Shared door)',
      !!ch.pass && !ch.pages && !cb.pages && cb.hub && cb.marks === 0 && !!cb.combatPoints, { ch: [!!ch.pass, ch.pages], cb: [cb.pages, cb.hub, cb.marks, cb.combatPoints] });
    await tap(P, '[data-dash-grid="bro"] [data-dest="equipment"]', 1000);
    const E = await read(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="menu"]', 900);
    const E2 = await read(P);
    rec.ok('2c. Equipment opens Gear; the Menu button comes back to Bro', E.kind === 'gear-root' && E2.title === 'hero', { gear: E.kind, back: E2.title });
    /* 4. today's eight Progress doors: their roads */
    const pd = (ch.pass && ch.pass.doors.map((d) => d.id)) || [];
    await H.dashMenuRoot(P);
    const menuHas = await P.page.evaluate(() => !!document.querySelector('[data-dash-grid="menu"] [data-dest="homestead"]'));
    const roads = {
      skills: true, pet: true, achievements: true, equipment: true,   /* Bro's own tiles (1a) */
      points: !!cb.combatPoints,                                       /* Combat's Points (3b) */
      titles: pd.indexOf('titles') >= 0,                               /* the passport's Titles door (v2.3.6684) */
      clan: pd.indexOf('clan') >= 0,                                   /* the passport's Clan line, a door */
      homestead: menuHas,                                              /* the Menu's Homestead tile */
    };
    rec.ok('4. each of today\'s eight Progress doors still has its road', Object.values(roads).every(Boolean), { roads, passport: pd });
    /* ═══ v2.3.6684: 6 to 8, CHARACTER, THE PASSPORT ═══ */
    const myId = await H.readState(P, (S) => S.myId);
    const k1 = await H.devOp(wsPort, 'combat', myId, { skill: 'sword', level: 12 }).catch(() => null);
    await H.devOp(wsPort, 'combat', myId, { skill: 'staff', level: 5 }).catch(() => null);
    const k3 = await H.devOp(wsPort, 'combat', myId, { skill: 'bow', level: 9 }).catch(() => null);
    const gr = await H.devOp(wsPort, 'achv', myId, { id: 'combat_10' }).catch(() => null);
    rec.ok('6z. the character seeded on the worker (levels 12 / 9 / 5, Blooded earned)', !!(k1 && k1.ok && k3 && k3.ok && gr && gr.ok !== false), { k1, k3, gr });
    await P.page.waitForTimeout(1200);
    await H.dashOpen(P, 'broCharacter');
    await P.page.waitForTimeout(900);
    const Q = await readPass(P);
    const myName = await H.readState(P, (S) => S.myName);
    rec.ok('6. "Find your combat level, then your Bow level": both on the passport, unscrolled; the combat level the worker\'s (its charLevel), right beside the face; Bow the seeded 9',
      !!Q && Q.title === 'broCharacter' && +Q.combat === k3.charLevel && lvOf(Q.combatText) === k3.charLevel && lvOf(Q.bow) === 9 && Q.beside && !Q.scroll,
      { combat: Q && Q.combat, text: Q && Q.combatText, worker: k3 && k3.charLevel, bow: Q && Q.bow, beside: Q && Q.beside, scroll: Q && Q.scroll });
    rec.ok('7a. the real name, "No title equipped" before one is chosen, the three levels, the counts, and honest lines (No clan, Skill guilds); nothing still loading',
      !!Q && Q.name === myName && Q.tline === 'No title equipped' && lvOf(Q.sword) === 12 && lvOf(Q.staff) === 5 && Q.clan === 'No clan' && Q.guilds === 'Skill guilds'
        && /^\d[\d,]*$/.test(Q.ap || '') && /^\d[\d,]*$/.test(Q.quests || '') && Q.doors.every((d) => !d.loading),
      Q && { name: Q.name, me: myName, tline: Q.tline, sword: Q.sword, staff: Q.staff, clan: Q.clan, guilds: Q.guilds, ap: Q.ap, quests: Q.quests });
    rec.ok('7b. 390 x 844: every door 44 x 44 or more, inside the band, nothing clipped, nothing to scroll, no text under 11 px', passOk(Q), passBrief(Q));
    await bandShot(P, 'ui2-bro-character.png');
    /* 6b. the Bow door: the Bow's page over Combat's hub (v2.3.6685); Back to the hub, Back to the passport */
    await tap(P, '[data-char-door="weapon-bow"]', 900);
    const title = () => P.page.evaluate(() => { const e = document.querySelector('[data-weapon-page]'); const t = document.querySelector('[data-dash-title]'); return { title: t && t.getAttribute('data-dash-title'), weapon: e && e.getAttribute('data-weapon-page'), hub: !!document.querySelector('[data-combat-hub]') }; });
    const cw = await title();
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
    const ch2 = await title();
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
    const cb2 = await readPass(P);
    rec.ok('6b. the Bow door opens the Bow\'s page; Back returns to Combat\'s hub, then to the passport', cw.title === 'broBow' && cw.weapon === 'bow' && ch2.title === 'broCombat' && ch2.hub && !!cb2, { cw, hub: ch2, back: cb2 && cb2.title });
    /* 8. the title, changed from the passport: Titles, Blooded, Equip, the pending mark, the worker's word */
    await tap(P, '[data-char-door="titles"]', 900);
    const T0 = await P.page.evaluate(() => ({ title: (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'), rows: Array.from(document.querySelectorAll('[data-title-row]')).map((e) => e.getAttribute('data-title-row')), t: window.__btTitles }));
    await tap(P, '[data-title-row="combat_10"]', 500);
    await bandShot(P, 'ui2-bro-titles.png');
    await tap(P, '[data-u2-action="equip"] button', 1500);
    const T1 = await P.page.evaluate(() => ({ t: window.__btTitles, worn: (document.querySelector('[data-titles-worn]') || { getAttribute: () => null }).getAttribute('data-titles-worn') }));
    rec.ok('8a. Titles lists the earned title; Equip marks itself pending, and the worker\'s answer settles it (never "done" before)',
      T0.title === 'broTitles' && T0.rows.indexOf('combat_10') >= 0 && T1.t && T1.t.seen.indexOf('out') >= 0 && T1.t.mark === 'free' && T1.worn === 'combat_10',
      { T0: { title: T0.title, rows: T0.rows }, seen: T1.t && T1.t.seen, mark: T1.t && T1.t.mark, worn: T1.worn });
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    const Q2 = await readPass(P);
    rec.ok('8b. Back: the passport reads the new title, "Blooded"', !!Q2 && Q2.tline === 'Blooded' && Q2.titleId === 'combat_10', Q2 && { tline: Q2.tline, id: Q2.titleId });
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
    /* v2.3.6684: the passport in each shape (667 x 375 the narrowest sideways page) */
    for (const s of [{ w: 375, h: 667, shape: 'upright', tag: '375x667' }, { w: 844, h: 390, shape: 'short', tag: '844x390' }, { w: 667, h: 375, shape: 'narrow', tag: '667x375' }]) {
      await P.page.setViewportSize({ width: s.w, height: s.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'broCharacter');
      await P.page.waitForTimeout(900);
      const C = await readPass(P);
      rec.ok(`7c. ${s.tag}: the passport (${s.shape}): combat level beside the face, every door 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px`,
        !!C && C.shape === s.shape && passOk(C) && lvOf(C.combatText) === (k3 && k3.charLevel), passBrief(C));
      await bandShot(P, `ui2-bro-character-${s.tag}.png`);
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
      await H.dashOpen(D, 'broCharacter');
      await D.page.waitForTimeout(900);
      const C = await readPass(D);
      rec.ok('7d. a computer: the passport upright in the band, every door 44 x 44 or more, nothing clipped, no scroll', !!C && C.shape === 'upright' && passOk(C), passBrief(C));
      await bandShot(D, 'ui2-bro-character-computer.png');
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
