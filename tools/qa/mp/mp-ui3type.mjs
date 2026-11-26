/* ═══ v2.3.6785 (card UI3-type): EVERY MENU WEARS THE GAME'S OWN LETTERS ═══
 *
 * The owner, 2026-11-26: "Also swap out the typography (font style) on all
 * menus to be same as the 'logout' font".  The kit's one token
 * (src/game/ui2Tokens.js UI2_FONT, the sheet's --ui2-font) is now the Log Out
 * button's 'Source Sans 3', sans-serif; Merriweather left the page's font
 * links (tools/guards/menu-font.test.mjs holds the sheets).  In the Wheel's
 * BroTown, a character with the dev kit's weapons:
 *
 *   upright phone (390 x 844, touch), the words of the dashboard's frame (on a
 *   computer the band also holds the controls' key caps: not a menu), on the Menu, Bro, Character, Combat, a
 *   weapon page (the sword's), Gear, an item page (the worn sword's) and the
 *   Account page:
 *     1. the COMPUTED family of every word under the band starts with
 *        Source Sans 3 (no serif anywhere);
 *     2. no word is cut by its box (its scroll width within its box);
 *     3. no word under 11 px (the kit's count badge and a slot's stars, 10 by
 *        the kit's own law, are not words);
 *   and, once: the face is loaded at 400 and 700 (document.fonts.check), and
 *   the page fetched no Merriweather;
 *   a computer (1280 x 800, wide): the Menu and Gear, the same three;
 *   `?ui2=0` (the old dashboard): its band still wears Source Sans 3, as
 *   before;
 *   `?ui2look=0` (yesterday's colours): the letters are today's.
 *
 * Pictures for the owner (deviceScaleFactor 2), each BEFORE and AFTER, the
 * band only: the Menu, Gear, Bro and the sword's page at 375 x 667 upright
 * and 667 x 375 sideways, and the Menu and Gear at 390 x 844, in docs/shots/
 * ui3type-<page>-<w>x<h>-<before|after>.png.  BEFORE is this build with
 * yesterday's two font lines put back in the page (the token as
 * Merriweather, its link added, the stars' Georgia): the only change of
 * this PR, so the two pictures differ in their letters alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';

export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');

/* where a thing is, waited for (the page held seconds at a time on this box) */
const centre = async (P, sel) => {
  let at = null;
  for (const t0 = Date.now(); !at && Date.now() - t0 < 15000;) {
    at = await P.page.evaluate((q) => { const el = document.querySelector(q); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel).catch(() => null);
    if (!at) await P.page.waitForTimeout(250);
  }
  if (!at) throw new Error('no ' + sel);
  return at;
};
const tap = async (P, sel, ms = 700) => { const at = await centre(P, sel); await P.page.touchscreen.tap(at.x, at.y); await P.page.waitForTimeout(ms); };
const click = async (P, sel, ms = 700) => { const at = await centre(P, sel); await P.page.mouse.click(at.x, at.y); await P.page.waitForTimeout(ms); };

async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
async function seed(P, wsPort) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  await P.page.waitForTimeout(1500);
}

/* the pages, each by the harness's own road (dashOpen) */
const PAGES = {
  menu: (P) => H.dashOpen(P, 'menu'),
  bro: (P) => H.dashOpen(P, 'hero'),
  character: (P) => H.dashOpen(P, 'broCharacter'),
  combat: (P) => H.dashOpen(P, 'broCombat'),
  sword: (P) => H.dashOpen(P, 'broSword'),
  gear: async (P) => {
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); }).catch(() => null);
    await P.page.waitForTimeout(500);
    await H.dashOpen(P, 'dashboard');
    await P.page.evaluate(() => { const g = window.__btGearTab; if (g && g.bus && g.bus.deselect) g.bus.deselect(); }).catch(() => null);
  },
  item: async (P, press) => {
    await PAGES.gear(P);
    await P.page.waitForTimeout(500);
    await press(P, '[data-gear-cell="sword"] [role="button"]');
    await press(P, '[data-gear-summary] [data-gear-details]', 900);
  },
  account: (P) => H.dashOpen(P, 'account'),
};

/* every word under the band, read in the page */
function wordsRead() {
  const band = document.querySelector('.bt-dashboard');
  if (!band) return { band: false };
  const B = band.getBoundingClientRect();
  const out = { band: true, frame: (document.querySelector('[data-dash-frame]') || { getAttribute: () => null }).getAttribute('data-dash-frame'),
    title: ((document.querySelector('[data-dash-frame] [data-u2="title"]') || {}).textContent || '').trim(), n: 0, fams: {}, wrong: [], cut: [], small: [] };
  const seen = new Set();
  /* the menu itself: the new frame (on a computer the band also holds the controls' key caps, 10 px
     by their own design and not a menu); the band where there is no frame */
  const root = document.querySelector('[data-dash-frame]') || band;
  out.root = root === band ? 'band' : 'frame';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.trim();
    if (!text || !/[A-Za-z0-9]/.test(text)) continue;   /* a word: an icon's glyph alone is not one */
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom <= B.top || r.top >= B.bottom || r.right <= B.left || r.left >= B.right) continue;   /* scrolled out of the band */
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    out.n++;
    const fam = cs.fontFamily;
    out.fams[fam] = (out.fams[fam] || 0) + 1;
    const first = fam.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    const say = text.slice(0, 24);
    if (first !== 'Source Sans 3') out.wrong.push(`${say} [${fam}]`);
    const fs = parseFloat(cs.fontSize);
    const notWord = el.closest('.u2-badge, .u2-stars');
    if (fs < 11 && !notWord) out.small.push(`${say} ${fs}px`);
    /* cut: its words wider than its box, where the box does not let them out */
    const clips = cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis';
    if (clips && el.scrollWidth > el.clientWidth + 1) out.cut.push(`${say} ${el.scrollWidth}>${el.clientWidth}`);
  }
  return out;
}
const words = (P) => P.page.evaluate(wordsRead);
const wordsOk = (w) => w.band && w.root === 'frame' && w.n >= 3 && w.wrong.length === 0 && w.cut.length === 0 && w.small.length === 0;
const wordsWhy = (w) => ({ root: w.root, frame: w.frame, title: w.title, n: w.n, fams: w.fams, wrong: (w.wrong || []).slice(0, 8), cut: (w.cut || []).slice(0, 8), small: (w.small || []).slice(0, 8) });

/* yesterday's letters, put back in the page (for the BEFORE pictures only) */
async function lettersWas(P, on) {
  await P.page.evaluate(async (want) => {
    let s = document.getElementById('u3t-was');
    if (!s) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap';
      document.head.appendChild(l);
      await new Promise((res) => { l.onload = res; l.onerror = res; setTimeout(res, 8000); });
      s = document.createElement('style');
      s.id = 'u3t-was';
      s.textContent = ".ui2 { --ui2-font: 'Merriweather', Georgia, 'Times New Roman', serif !important; } .ui2 .u2-stars { font-family: Georgia, serif !important; }";
      document.head.appendChild(s);
      try { await Promise.all([document.fonts.load('400 16px Merriweather'), document.fonts.load('700 16px Merriweather')]); } catch (e) { /* the fallback serif */ }
    }
    s.disabled = !want;
  }, on);
  await P.page.waitForTimeout(700);
}
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: Math.max(0, b.left), y: Math.max(0, b.top - 60), w: Math.min(innerWidth, b.right) - Math.max(0, b.left), h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top - 60) }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });

  /* ══ the upright phone ══ */
  const P = await H.newPlayer(browser, { name: 'Typebro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, '390x844'))) return;
    await seed(P, wsPort);
    await H.unfoldBand(P).catch(() => null);
    await PAGES.menu(P).catch(() => null);
    await P.page.waitForTimeout(900);
    const face = await P.page.evaluate(async () => {
      try { await Promise.all([document.fonts.load('400 16px "Source Sans 3"'), document.fonts.load('700 16px "Source Sans 3"')]); } catch (e) { /* read below */ }
      const res = performance.getEntriesByType('resource').map((e) => e.name);
      return { r400: document.fonts.check('400 16px "Source Sans 3"'), r700: document.fonts.check('700 16px "Source Sans 3"'),
        faces: [...document.fonts].filter((f) => /Source Sans 3/.test(f.family) && f.status === 'loaded').map((f) => f.weight + (f.style === 'italic' ? 'i' : '')),
        merri: res.filter((n) => /Merriweather/i.test(n)) };
    });
    rec.ok('0. the face is loaded at 400 and 700 (Source Sans 3), and the page fetched no Merriweather',
      face.r400 && face.r700 && face.faces.length > 0 && face.merri.length === 0, face);

    let n = 1;
    for (const id of ['menu', 'bro', 'character', 'combat', 'sword', 'gear', 'item', 'account']) {
      let err = null;
      try { await PAGES[id](P, tap); } catch (e) { err = String(e.message || e); }
      await P.page.waitForTimeout(900);
      const w = await words(P);
      rec.ok(`${n}. 390x844 ${id}: every word is Source Sans 3, none cut by its box, none under 11 px`, !err && wordsOk(w), { err, ...wordsWhy(w) });
      n++;
    }

    /* the pictures: before and after, the band only */
    const shots = [];
    const SIZES = [[375, 667, ['menu', 'gear', 'bro', 'sword']], [667, 375, ['menu', 'gear', 'bro', 'sword']], [390, 844, ['menu', 'gear']]];
    for (const [w, h, ids] of SIZES) {
      await P.page.setViewportSize({ width: w, height: h });
      await P.page.waitForTimeout(1200);
      await H.unfoldBand(P).catch(() => null);
      for (const id of ids) {
        try { await PAGES[id](P, tap); } catch (e) { /* the picture says what it shows */ }
        await P.page.waitForTimeout(900);
        await lettersWas(P, true);
        const b = await bandShot(P, `ui3type-${id}-${w}x${h}-before.png`);
        await lettersWas(P, false);
        const a = await bandShot(P, `ui3type-${id}-${w}x${h}-after.png`);
        if (a && b) shots.push(`${id}-${w}x${h}`);
      }
    }
    rec.ok('10. the owner\'s pictures, before and after (10 pairs)', shots.length === 10, shots);
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ══ ?ui2look=0 (yesterday's colours): the letters are today's (the serif is not loaded) ══ */
  const L = await H.newPlayer(browser, { name: 'Typelook', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2look=0' });
  try {
    if (!(await inWorld(L, rec, 'ui2look=0'))) return;
    await H.unfoldBand(L).catch(() => null);
    await PAGES.menu(L).catch(() => null);
    await L.page.waitForTimeout(900);
    const was = await L.page.evaluate(() => !!document.querySelector('.ui2.ui2-was'));
    const w = await words(L);
    rec.ok('9. ?ui2look=0 (yesterday\'s colours): the Menu\'s words are still Source Sans 3', was && wordsOk(w), { was, ...wordsWhy(w) });
  } finally {
    await L.ctx.close().catch(() => {});
  }

  /* ══ a computer ══ */
  const D = await H.newPlayer(browser, { name: 'Typedesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true });
  try {
    if (!(await inWorld(D, rec, 'computer'))) return;
    await seed(D, wsPort);
    for (const id of ['menu', 'gear']) {
      let err = null;
      try { await PAGES[id](D, click); } catch (e) { err = String(e.message || e); }
      await D.page.waitForTimeout(900);
      const w = await words(D);
      rec.ok(`11. a computer ${id}: every word is Source Sans 3, none cut, none under 11 px`, !err && wordsOk(w), { err, ...wordsWhy(w) });
    }
  } finally {
    await D.ctx.close().catch(() => {});
  }

  /* ══ ?ui2=0: the old dashboard, its letters as before ══ */
  const O = await H.newPlayer(browser, { name: 'Typeold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  try {
    if (!(await inWorld(O, rec, 'ui2=0'))) return;
    await H.unfoldBand(O).catch(() => null);
    await H.dashOpen(O, 'dashboard').catch(() => null);
    await O.page.waitForTimeout(900);
    const o = await O.page.evaluate(() => {
      const band = document.querySelector('.bt-dashboard');
      const fam = band ? getComputedStyle(band).fontFamily : null;
      const serif = [...(band ? band.querySelectorAll('*') : [])].filter((e) => /Merriweather|Georgia/i.test(getComputedStyle(e).fontFamily)).length;
      return { frame: !!document.querySelector('[data-dash-frame]'), fam, serif };
    });
    rec.ok('12. ?ui2=0: the old dashboard (no new frame) wears Source Sans 3, no Merriweather in it', !o.frame && /^["']?Source Sans 3/.test(o.fam || '') && o.serif === 0, o);
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
