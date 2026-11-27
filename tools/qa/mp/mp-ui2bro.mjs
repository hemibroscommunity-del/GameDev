/* ═══ v2.3.6683: BRO'S LANDING, SIX DOORS (card UI2-bro, the build's step 3, PR 1) ═══
 *
 * v2.3.6782 (card UI3-bro): BRO AND CHARACTER ARE ONE PAGE FOR YOURSELF.  The
 * owner, 2026-11-26: "I don't think you need separate Bro and Character
 * landing menus anymore ... I'd turn the Bro menu into a unified character
 * management dashboard."  A phone in the world (upright 390 x 844, then
 * 375 x 667 and sideways 844 x 390 and 667 x 375), a computer playing wide,
 * and a phone with `?ui2=0`:
 *   1. Bro (by the Menu's tile) is six equal tiles in the order Combat,
 *      Equipment, Life Skills / Feats, Pets, Journey, three by two upright
 *      and on a computer, one row sideways; and ONE flat strip under them
 *      (beside them sideways): AP, Quests done, Clan, Guilds (v2.3.6695: the title is Feats').  No
 *      portrait, no name, no combat level, no weapon door; every tap 44 x 44
 *      or more, inside the band, nothing clipped, nothing to scroll, no text
 *      under 11 px;
 *   2. every tile opens its page under its name and Back (saying Bro)
 *      returns to Bro (Journey's included); Combat its hub; Equipment its
 *      showcase (v2.3.6689, Gear's PR 3: broEquip, no longer Gear);
 *   3. Combat's Points (the hub's Shared door) and the glow while points wait;
 *   4. each of today's eight Progress doors still has its road (titles through
 *      Feats, clan through the strip);
 *   5. `?ui2=0` gives today's Bro (its pages, no landing);
 *   6. the acceptance task: the Bow level on Combat's hub in two taps from
 *      Bro (the combat level is the HUD's, card UI3-hud: NOT on this base, so
 *      not read here); Bro, Combat, Bow, Back to the hub, Back to Bro;
 *   7. the strip's values on a character seeded on the worker: AP and Quests
 *      as numbers, "No clan", "Skill guilds"; nothing
 *      still loading;
 *   8. Titles from Feats' Titles door (v2.3.6695): pick Blooded, Equip pending then
 *      settled by the worker's answer; Back: Feats' door reads "Wearing: Blooded";
 *   9. another player's Character page (a push of broCharacter with a
 *      `who`): their name and face, no Equip, no Journey;
 *  10. a push of broCharacter with no `who` lands on the one Bro page.
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-bro-*.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const SIX = ['combat', 'equipment', 'skills', 'feats', 'pets', 'journey'];
const STRIP = ['ap', 'quests', 'clan', 'guilds'];   /* v2.3.6782: src/game/broHub.js BRO_STRIP; v2.3.6695 (card UI2-feats): the title left for Feats */

/* the landing's reading, in the page: the six tiles and the strip */
function landing() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const outOf = (r) => !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5);
  const g = document.querySelector('[data-dash-grid="bro"]');
  const land = g ? g.closest('[data-bro-landing]') : null;
  const tiles = g ? Array.from(g.querySelectorAll('[data-dest]')).map((e) => {
    const r = e.getBoundingClientRect();
    const lab = e.querySelector('.u2-tile-label');
    const art = e.querySelector('.u2-tile-art');
    return {
      k: e.getAttribute('data-dest'), w: Math.round(r.width), h: Math.round(r.height), word: lab ? lab.textContent.trim() : '',
      out: outOf(r), clip: !!lab && lab.scrollWidth > lab.clientWidth + 1, art: art ? Math.round(art.getBoundingClientRect().height) : 0,
      glow: e.classList.contains('is-glow'), badge: (e.querySelector('[data-u2-badge], .u2-badge') || {}).textContent || '',
    };
  }) : [];
  const st = land ? land.querySelector('[data-bro-strip]') : null;
  const sr = st ? st.getBoundingClientRect() : null;
  const gr = g ? g.getBoundingClientRect() : null;
  const strip = st ? Array.from(st.querySelectorAll('[data-bro-fact]')).map((e) => {
    const r = e.getBoundingClientRect();
    const k = e.querySelector('.u2-fact-k'), v = e.querySelector('.u2-fact-v');
    return {
      id: e.getAttribute('data-bro-fact'), w: Math.round(r.width), h: Math.round(r.height), out: outOf(r), v: e.getAttribute('data-bro-v'),
      shown: v ? v.textContent.trim() : '', icon: e.classList.contains('is-icon'), door: e.tagName === 'BUTTON', chev: !!e.querySelector('.u2-chev'),
      loading: e.hasAttribute('data-bro-loading'),
      clip: (!!k && k.textContent.trim() && k.scrollWidth > k.clientWidth + 1) || (!!v && (v.scrollHeight > v.clientHeight + 1 || v.scrollWidth > v.clientWidth + 1)),
      raised: e.classList.contains('u2-raised'),
    };
  }) : [];
  let scroll = false;
  if (land) for (const e of [land, ...land.querySelectorAll('*')]) {
    const cs = getComputedStyle(e);
    if ((cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1) || (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1)) { scroll = true; break; }
  }
  for (let el = land && land.parentElement; el && el !== band; el = el.parentElement) if (el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible') { scroll = true; break; }
  let minFont = 99;
  if (land) for (const e of land.querySelectorAll('*')) {
    if (!Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    minFont = Math.min(minFont, parseFloat(getComputedStyle(e).fontSize) || 99);
  }
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
    who: land ? land.getAttribute('data-bro-landing') : null, shape: land ? land.getAttribute('data-bro-shape') : null,
    tiles, strip,
    /* the strip under the grid upright, beside it sideways */
    under: !!(sr && gr) && sr.top >= gr.bottom - 0.5, beside: !!(sr && gr) && sr.left >= gr.right - 0.5,
    extra: land ? land.querySelectorAll('img').length - tiles.length - strip.filter((x) => x.icon).length : -1,
    hud: land ? land.querySelectorAll('[data-char-portrait], [data-char-name], [data-char-combat], [data-char-door^="weapon"], [data-combat-door]').length : -1,
    marks: document.querySelectorAll('[data-bro-mark]').length,
    banner: !!(land && land.querySelector('[data-bro-whose]')) || document.querySelectorAll('[data-bro-card] .bt-bro3-who, [data-bro-progress]').length > 0,
    scroll, minFont,
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    pages: document.querySelector('[data-bro-card="pages"]') ? 1 : 0,
    /* v2.3.6685 (card UI2-combat): Combat is its hub; the shared count's door opens the Points window */
    combatPoints: (() => { const e = document.querySelector('[data-bro-door-page="combat"] [data-combat-hub] [data-combat-door="shared"]'); return e ? { n: +e.getAttribute('data-combat-points'), live: e.classList.contains('is-glow') } : null; })(),
    hub: document.querySelector('[data-bro-door-page="combat"] [data-combat-hub]') ? 1 : 0,
    bowLv: (() => { const e = document.querySelector('[data-combat-hub] [data-combat-door="bow"]'); return e ? e.getAttribute('data-combat-lv') : null; })(),
    showcase: document.querySelector('[data-bro-door-page="equip"]') ? 1 : 0,
    char: (() => {
      const c = document.querySelector('[data-char-page]');
      if (!c) return null;
      const w = c.querySelector('[data-bro-whose]');
      return { who: c.getAttribute('data-char-page'), whose: w ? w.textContent.trim() : null, face: !!c.querySelector('[data-char-portrait] img'),
        journey: !!c.querySelector('[data-char-door="journey"]'), equip: !!document.querySelector('[data-u2-action="equip"]') };
    })(),
    nav: nv ? { ws: nv.ws, shown: nv.shown, menu: nv.menu.map((e) => e.id) } : null,
  };
}
const read = (P) => P.page.evaluate(landing);
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
/* the six and the strip: in order, equal, every tap 44 x 44 or more, inside the band, nothing clipped,
   no scroll, no text under 11 px, nothing of the HUD's, the strip flat and in its place */
function pageOk(L, rows) {
  const sizes = new Set(L.tiles.map((t) => t.w + 'x' + t.h));
  const side = rows === 1;
  return L.tiles.map((t) => t.k).join(',') === SIX.join(',') && L.rows === rows && sizes.size === 1
    && L.tiles.every((t) => t.w >= 44 && t.h >= 44 && !t.out && !t.clip) && !L.scroll && L.marks === 0 && !L.banner && L.extra === 0 && L.hud === 0
    && L.strip.map((x) => x.id).join(',') === STRIP.join(',') && L.strip.every((x) => x.w >= 44 && x.h >= 44 && !x.out && !x.clip && !x.raised && x.door && x.chev)
    && (side ? L.beside : L.under) && L.minFont >= 11;
}
const brief = (L) => ({ shape: L.shape, tiles: L.tiles.map((t) => `${t.k}:${t.w}x${t.h} art ${t.art}${t.out ? ' out' : ''}${t.clip ? ' clip' : ''}`), rows: L.rows,
  strip: L.strip.map((x) => `${x.id}:${x.w}x${x.h}${x.icon ? ' icon' : ''}${x.out ? ' out' : ''}${x.clip ? ' clip' : ''}${x.door ? '' : ' fact'}`),
  under: L.under, beside: L.beside, scroll: L.scroll, minFont: L.minFont, marks: L.marks, banner: L.banner, extra: L.extra, hud: L.hud, band: L.band });
const valOf = (L, id) => (L.strip.find((x) => x.id === id) || {}).v;

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Landbro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'phone'))) return;
    /* the character seeded on the worker first (its levels by /dev/combat, Blooded earned by /dev/achv: the
       record on file the strip reads) */
    const myId = await H.readState(P, (S) => S.myId);
    const k1 = await H.devOp(wsPort, 'combat', myId, { skill: 'sword', level: 12 }).catch(() => null);
    await H.devOp(wsPort, 'combat', myId, { skill: 'staff', level: 5 }).catch(() => null);
    const k3 = await H.devOp(wsPort, 'combat', myId, { skill: 'bow', level: 9 }).catch(() => null);
    const gr = await H.devOp(wsPort, 'achv', myId, { id: 'combat_10' }).catch(() => null);
    rec.ok('6z. the character seeded on the worker (levels 12 / 9 / 5, Blooded earned)', !!(k1 && k1.ok && k3 && k3.ok && gr && gr.ok !== false), { k1, k3, gr });
    await P.page.waitForTimeout(1200);
    /* 1. the one page */
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(900);
    let L = await read(P);
    rec.ok('1a. 390 x 844: Bro is six equal tiles three by two in the order Combat, Equipment, Life Skills / Feats, Pets, Journey, and the strip under them (AP, Quests, Clan, Guilds, title); no portrait, name, combat level or weapon door; every tap 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px',
      L.title === 'hero' && L.who === 'self' && pageOk(L, 2), brief(L));
    rec.ok('1b. the words: Combat, Equipment, Life Skills, Feats, Pets, Journey', L.tiles.map((t) => t.word).join('|') === 'Combat|Equipment|Life Skills|Feats|Pets|Journey', L.tiles.map((t) => t.word));
    rec.ok('1c. the band at 390 x 844 is 390 x 243, as today', L.band && L.band[0] === 390 && L.band[1] === 243, L.band);
    /* 7. the strip's values */
    rec.ok('7a. the strip: AP and Quests done as numbers, "No clan", "Skill guilds"; nothing still loading (v2.3.6695: the title is Feats\')',
      /^\d[\d,]*$/.test(valOf(L, 'ap') || '') && /^\d[\d,]*$/.test(valOf(L, 'quests') || '') && valOf(L, 'clan') === 'No clan' && valOf(L, 'guilds') === 'Skill guilds'
        && L.strip.every((x) => !x.loading), L.strip.map((x) => `${x.id}=${x.v}${x.loading ? ' loading' : ''}`));
    rec.ok('7b. 390 x 844: each strip entry a flat door (its chevron, no raised face), 44 px tall or more', L.strip.length === 4 && L.strip.every((x) => x.door && x.chev && !x.raised && x.h >= 44), brief(L).strip);
    await bandShot(P, 'ui2-bro-landing.png');
    /* 3. the glow: Combat's tile carries the points waiting, as the Menu button does */
    const cmb = L.tiles.find((t) => t.k === 'combat') || {};
    rec.ok('3a. Combat\'s tile glows exactly when it carries a count of points waiting', !!cmb.glow === !!String(cmb.badge).trim(), cmb);
    /* 2. every tile opens its page; Back says Bro and returns */
    const PAGES = { combat: 'broCombat', equipment: 'broEquip', skills: 'skills', feats: 'achievements', pets: 'pets', journey: 'journey' };
    const seen = [];
    for (const k of SIX) {
      await tap(P, `[data-dash-grid="bro"] [data-dest="${k}"]`, 900);
      const G = await read(P);
      seen.push({ k, title: G.title, back: G.back, combatPoints: G.combatPoints, hub: G.hub, pages: G.pages, marks: G.marks, showcase: G.showcase, bowLv: G.bowLv });
      if (k === 'combat') {
        await bandShot(P, 'ui2-bro-combat.png');
        /* 3b. Points from Combat: v2.3.6686 the Shared page, Back returning to Combat */
        await tap(P, '[data-bro-door-page="combat"] [data-combat-door="shared"]', 1000);
        const Pp = await read(P);
        const sharedUp = await P.page.evaluate(() => !!document.querySelector('[data-shared-page] [data-shared-attr]'));
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
        const Pb = await read(P);
        rec.ok('3b. Combat\'s Points (its Shared door) opens the Shared page (v2.3.6686); Back returns to Combat', Pp.title === 'broShared' && sharedUp && Pb.title === 'broCombat', { open: Pp.title, sharedUp, back: Pb.title });
      }
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
      const A = await read(P);
      seen[seen.length - 1].after = A.title;
      if (k === 'combat' && !A.tiles.length) { rec.ok('2z. after Combat, Bro is back', false, { title: A.title }); return; }
    }
    rec.ok('2a. each tile opens its page under its name (Journey\'s included), Back saying Bro and returning to Bro',
      seen.every((x) => x.title === PAGES[x.k] && /Bro/.test(x.back || '') && x.after === 'hero'), seen.map((x) => ({ k: x.k, title: x.title, back: x.back, after: x.after })));
    const cb = seen.find((x) => x.k === 'combat') || {};
    rec.ok('2b. Combat opens its hub (v2.3.6685), not today\'s pages, no marks, with Points (its Shared door)', !cb.pages && cb.hub && cb.marks === 0 && !!cb.combatPoints, { cb: [cb.pages, cb.hub, cb.marks, cb.combatPoints] });
    const eq = seen.find((x) => x.k === 'equipment') || {};
    rec.ok('2c. Equipment opens its showcase (broEquip, v2.3.6689: Gear\'s PR 3), Back to Bro', eq.title === 'broEquip' && eq.showcase === 1 && eq.after === 'hero', eq);
    /* 4. today's eight Progress doors: their roads */
    await H.dashMenuRoot(P);
    const menuHas = await P.page.evaluate(() => !!document.querySelector('[data-dash-grid="menu"] [data-dest="homestead"]'));
    const sd = L.strip.filter((x) => x.door).map((x) => x.id);
    const roads = {
      skills: true, pet: true, achievements: true, equipment: true,   /* Bro's own tiles (1a) */
      points: !!cb.combatPoints,                                       /* Combat's Points (3b) */
      titles: L.tiles.some((t) => t.k === 'feats'),                     /* v2.3.6695 (card UI2-feats): Feats' Titles door (8a opens it) */
      clan: sd.indexOf('clan') >= 0,                                   /* v2.3.6782: the strip's Clan entry, a door */
      homestead: menuHas,                                              /* the Menu's Homestead tile */
    };
    rec.ok('4. each of today\'s eight Progress doors still has its road (titles through Feats, clan through the strip)', Object.values(roads).every(Boolean), { roads, strip: sd });
    /* 6. the acceptance task: the Bow level in two taps from Bro (Bro, Combat) */
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(700);
    await tap(P, '[data-dash-grid="bro"] [data-dest="combat"]', 900);
    const C6 = await read(P);
    rec.ok('6. "Find your Bow level": on Combat\'s hub in two taps from Bro (Menu\'s Bro, then Combat), the seeded 9 (the combat level is the HUD\'s: card UI3-hud, not on this base)',
      C6.title === 'broCombat' && +C6.bowLv === 9, { title: C6.title, bow: C6.bowLv });
    /* 6b. Bro, Combat, Bow, Back to the hub, Back to Bro */
    await tap(P, '[data-combat-hub] [data-combat-door="bow"]', 900);
    const where = () => P.page.evaluate(() => { const e = document.querySelector('[data-weapon-page]'); const t = document.querySelector('[data-dash-title]'); return { title: t && t.getAttribute('data-dash-title'), weapon: e && e.getAttribute('data-weapon-page'), hub: !!document.querySelector('[data-combat-hub]') }; });
    const cw = await where();
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
    const ch2 = await where();
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
    const cb2 = await read(P);
    rec.ok('6b. Bro, Combat, Bow: the Bow\'s page; Back to Combat\'s hub, Back to Bro', cw.title === 'broBow' && cw.weapon === 'bow' && ch2.title === 'broCombat' && ch2.hub && cb2.title === 'hero' && cb2.tiles.length === 6, { cw, hub: ch2, back: cb2.title });
    /* 8. the title, changed from Feats (v2.3.6695, card UI2-feats: "Titles could live within Feats"): Feats' Titles
       door, Blooded, Equip, the pending mark, the worker's word */
    await tap(P, '[data-dash-grid="bro"] [data-dest="feats"]', 900);
    await P.page.waitForSelector('[data-feats-page] [data-feats-door="titles"]', { timeout: 15000 }).catch(() => {});
    await tap(P, '[data-feats-page] [data-feats-door="titles"]', 900);
    const T0 = await P.page.evaluate(() => ({ title: (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'), back: ((document.querySelector('[data-dash-frame] [data-dash-ctl="back"]') || {}).textContent || '').trim(), rows: Array.from(document.querySelectorAll('[data-title-row]')).map((e) => e.getAttribute('data-title-row')) }));
    await tap(P, '[data-title-row="combat_10"]', 500);
    await bandShot(P, 'ui2-bro-titles.png');
    await tap(P, '[data-u2-action="equip"] button', 1500);
    const T1 = await P.page.evaluate(() => ({ t: window.__btTitles, worn: (document.querySelector('[data-titles-worn]') || { getAttribute: () => null }).getAttribute('data-titles-worn') }));
    rec.ok('8a. Feats\' Titles door opens Titles (Back saying Feats); it lists the earned title; Equip marks itself pending, and the worker\'s answer settles it (never "done" before)',
      T0.title === 'broTitles' && /Feats/.test(T0.back) && T0.rows.indexOf('combat_10') >= 0 && T1.t && T1.t.seen.indexOf('out') >= 0 && T1.t.mark === 'free' && T1.worn === 'combat_10',
      { T0, seen: T1.t && T1.t.seen, mark: T1.t && T1.t.mark, worn: T1.worn });
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 1200);
    const L8 = await P.page.evaluate(() => ({ title: (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'),
      worn: ((document.querySelector('[data-feats-door="titles"] .u2-tile-sub') || {}).textContent || '').trim() }));
    rec.ok('8b. Back: Feats\' Titles door reads the new title, "Wearing: Blooded"', L8.title === 'achievements' && L8.worn === 'Wearing: Blooded', L8);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 1200);
    /* 9. another player's Character page (Ranks' tap, step 9: nothing opens it yet, so the bus's own push) */
    await P.page.evaluate(() => window.__broDashPanelBus.go({ type: 'push', id: 'broCharacter', who: { name: 'Sunburn', portrait: '/icons/ui/panel-self.webp' } }));
    await P.page.waitForTimeout(1000);
    const O9 = await read(P);
    await bandShot(P, 'ui2-bro-other.png');
    rec.ok('9. another player\'s Character (a push of broCharacter with a who): their name and face, no Equip, no Journey',
      O9.title === 'broCharacter' && !!O9.char && O9.char.who === 'other' && O9.char.whose === 'Sunburn' && O9.char.face && !O9.char.journey && !O9.char.equip && O9.tiles.length === 0, O9.char);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    /* 10. a push of broCharacter with no who: the one Bro page, never the old passport */
    await P.page.evaluate(() => window.__broDashPanelBus.go({ type: 'push', id: 'broCharacter' }));
    await P.page.waitForTimeout(1000);
    const S10 = await read(P);
    rec.ok('10. a push of broCharacter with no who lands on the one Bro page (the six and the strip), not the passport', S10.title === 'broCharacter' && S10.who === 'self' && !S10.char && S10.tiles.length === 6 && S10.strip.length === 4, { title: S10.title, who: S10.who, char: S10.char, tiles: S10.tiles.length });
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    /* 1d. the other shapes (667 x 375 the narrowest sideways page: the entries their pictures' doors) */
    for (const sh of [{ w: 375, h: 667, rows: 2, tag: '375x667' }, { w: 844, h: 390, rows: 1, tag: '844x390' }, { w: 667, h: 375, rows: 1, tag: '667x375' }]) {
      await P.page.setViewportSize({ width: sh.w, height: sh.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'hero');
      await P.page.waitForTimeout(900);
      const M = await read(P);
      rec.ok(`1d. ${sh.tag}: the six ${sh.rows === 1 ? 'in one row, the strip beside them' : 'three by two, the strip under them'}, every tap 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px`,
        M.title === 'hero' && pageOk(M, sh.rows), brief(M));
      await bandShot(P, `ui2-bro-landing-${sh.tag}.png`);
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }
  /* a computer */
  const D = await H.newPlayer(browser, { name: 'Landdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await H.dashOpen(D, 'hero');
      await D.page.waitForTimeout(900);
      const M = await read(D);
      rec.ok('1e. a computer: the six three by two and the strip under them, every tap 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', M.title === 'hero' && pageOk(M, 2), brief(M));
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
