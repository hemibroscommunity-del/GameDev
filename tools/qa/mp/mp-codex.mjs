/* ═══ THE MONSTER CODEX, ON A PHONE (v2.3.3196) ═══
 *
 * Owner, 2026-10-12: "Begin working on the monster section of the codex.
 * After you kill a monster you learn more about it, what it does, where it's
 * from, elemental type, special attack, (make up a backstory) etc. it'll be
 * another dashboard section that just displays information.  Maybe an
 * animation similar to how the skills preview window currently works."
 *
 * And then, with a mockup: "I want all the facts revealed after just 1 kill.
 * I also want to change the structure of each monster entry to look like
 * this."
 *
 * A real player in the Wheel, a real worker, real kills (the test kit's
 * `kill`, which kills through _resolveMonsterKill, the path every kill takes):
 *   1. the worker says it counts (caps.codex) and sends the codex at join;
 *      More -> Codex opens on Monsters: nine cards, every one a shape;
 *   2. a snowman's kill: counted (snowling 1), said over your head, its card
 *      known and NEW;
 *   3. its page, as the mockup lays it out, on the sheet's own short height
 *      (the owner: "Stay short and scroll"), scrolling in it from its top: the
 *      header (name, Lv / element / kind badges -- the kind by its body, the
 *      owner's "humanoid, beast, ..."), the Drops / Info / Locations tabs, and
 *      the drop table -- ITEM, TYPE, CHANCE -- every pile drop with its
 *      percentage;
 *   4. scrolled to the table's end, a tap on the Iron Great Sword opens its
 *      card from its top: Weapon, Common, FOUND FROM the Snowman, a 0.2% BASE
 *      DROP CHANCE and the four grades it can roll with their shares; its X
 *      comes back to the list with the row marked and in view; a Frost
 *      Shard's card has no grades;
 *      A tap on a tab, the open one's too, puts what it opened at the top of
 *      the sheet;
 *   5. Info, from that one kill: its stage at the top of the sheet, all of
 *      it in view, every fact open, the stage loading and playing its throw
 *      AND its special (the burrow), its hit saying "Chill", your character
 *      and the snowman standing ON its ground strip and never past its frame,
 *      the elder toggle naming it a Glacier Snowman;
 *   6. Locations: Frost Ridge, both stages' levels, the way there from
 *      BroTown; back to the list, the sheet never grew, the Codex's tabs back;
 *   7. every one of the nine pages, each opening at its top however far the
 *      list was scrolled, its kind's badge its body's (Humanoid, Beast,
 *      Aquatic, Ooze), and back the card it came from in view: its stage
 *      plays its own special (lunge,
 *      slam, unwrap, burst, burrow), what it throws in before its first
 *      flight, nothing standing over your character, a slam's or lunge's
 *      warning circle, its own drop table (remnants only from the six kinds
 *      that leave them, a raw gem from every land but the Verdant Wilds) and
 *      its dungeon on Locations where it has one -- pictures in
 *      tools/qa/mp/out/codex-<kind>.png;
 *   8. closed, nothing is left behind: every picture a stage baked revoked;
 *   9. a reload: the counts come back from the worker;
 *  10. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const KINDS = ['snowling', 'gobling', 'mumling', 'pebbling', 'sparklet', 'finling', 'wisplet', 'lurkling', 'dewdrop'];
/* the phase each kind's special shows on its stage (CodexStage planFor) */
const DUNGEONS = { pebbling: ['the Great Cave', 'Lv 26–30'], sparklet: ['the Foundry Dome', 'Lv 26–30'], mumling: ['the Buried City', 'Lv 41–45'] };
const SPECIAL_PHASE = { snowling: 'pile', gobling: 'dash', mumling: 'unwrap', pebbling: 'slam', sparklet: 'dash', finling: 'slam', wisplet: 'dash', lurkling: 'slam', dewdrop: 'swell' };
/* each kind's badge, by its body (src/data/monsterCodex.js CODEX_TYPES) */
const TYPES = { snowling: 'Humanoid', gobling: 'Humanoid', mumling: 'Humanoid', pebbling: 'Beast', sparklet: 'Ooze', finling: 'Aquatic', wisplet: 'Ooze', lurkling: 'Aquatic', dewdrop: 'Ooze' };

/* every blob picture made and let go, counted from the page's start */
const BLOB_INIT = () => {
  const made = new Set();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (o) { const u = c(o); try { made.add(u); } catch (e) { /* count only */ } return u; };
  URL.revokeObjectURL = function (u) { try { made.delete(u); } catch (e) { /* count only */ } return r(u); };
  window.__qaBlobs = () => made.size;
};

const codex = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, c = S._codex;
  return { caps: !!(S._serverCaps && S._serverCaps.codex), known: !!(c && c.known), k: c ? JSON.parse(JSON.stringify(c.k)) : null,
    fresh: c ? JSON.parse(JSON.stringify(c.fresh)) : null };
});
const said = (P, re) => P.page.evaluate((src) => {
  const S = window._gameState.current;
  const rx = new RegExp(src);
  return (S.dmgNumbers || []).map((d) => d && (d.text || d.str || d.label)).filter((t) => typeof t === 'string' && rx.test(t));
}, re.source);
const kill = async (wsPort, me, id) => H.devOp(wsPort, 'trapping', me, { kill: id });
const openCodex = async (P) => {
  await H.openDest(P, 'More').catch(() => {});
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="encyclopedia"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  return P.page.waitForSelector('[data-cx-grid]', { timeout: 6000 }).then(() => true).catch(() => false);
};
const cards = (P) => P.page.evaluate(() => [...document.querySelectorAll('[data-cx-card]')].map((b) => ({ kind: b.dataset.cxCard, known: b.dataset.cxKnown === '1', fresh: b.dataset.cxFresh === '1', text: b.innerText.replace(/\s+/g, ' ') })));
const openPage = async (P, kind) => {
  await P.page.evaluate((k) => { const b = document.querySelector(`[data-cx-card="${k}"]`); if (b) b.click(); }, kind);
  return P.page.waitForSelector(`[data-cx-page="${kind}"]`, { timeout: 4000 }).then(() => true).catch(() => false);
};
const back = (P) => P.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /All monsters/.test(x.innerText)); if (b) b.click(); });
const facts = (P) => P.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-cx-fact]')].map((f) => [f.dataset.cxFact, f.dataset.cxOpen === '1'])));
/* the page's drop table: { id: [its chance as printed, its type] } */
const drops = (P) => P.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-cx-drop]')].map((r) => {
  const o = r.querySelector('[data-cx-pct]'), t = r.querySelector('[data-cx-type]');
  return [r.dataset.cxDrop, [o ? o.innerText.trim() : '', t ? t.innerText.trim() : '']];
})));
const tab = async (P, id) => {
  await P.page.evaluate((i) => { const b = document.querySelector(`[data-cx-tab="${i}"]`); if (b) b.click(); }, id);
  await P.page.waitForTimeout(250);
  /* the Info tab's stage loads its strips when it opens: the watch below
     times its loop, not this box's picture decoding */
  if (id === 'info') await P.page.waitForSelector('[data-cx-stage][data-cx-ready="1"]', { timeout: 15000 }).catch(() => {});
};
/* where the sheet and its row sit, and what the header says */
const sheetLook = (P) => P.page.evaluate(() => {
  const d = document.querySelector('.bt-dashboard');
  const c = [...document.querySelectorAll('button')].find((b) => /^(CLOSE|OPEN)$/.test(b.innerText.trim()));
  const r = d ? d.getBoundingClientRect() : null, cr = c ? c.getBoundingClientRect() : null;
  const pill = (a) => { const e = document.querySelector(`[data-cx-pill="${a}"]`); return e ? e.innerText.trim() : null; };
  const chips = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Materials');
  return { top: r ? Math.round(r.top) : null, h: r ? Math.round(r.height) : null, closeTop: cr ? Math.round(cr.top) : null,
    level: pill('level'), element: pill('element'), type: pill('type'),
    tabs: [...document.querySelectorAll('[data-cx-tab]')].map((t) => t.dataset.cxTab + (t.dataset.cxOn === '1' ? '*' : '')),
    chips: !!(chips && chips.offsetParent) };
});
/* the box the codex scrolls in (EncyclopediaPanel's), how far it is
   scrolled, and whether `sel` is wholly in its view, clear of its 18 px
   bottom fade */
const boxLook = (P, sel) => P.page.evaluate((sel) => {
  const inner = document.querySelector('[data-cx-page]') || document.querySelector('[data-cx-grid]');
  let box = inner ? inner.parentElement : null;
  while (box && !/^(auto|scroll)$/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (!box) return null;
  const br = box.getBoundingClientRect();
  const el = sel ? document.querySelector(sel) : null;
  const er = el ? el.getBoundingClientRect() : null;
  return { top: Math.round(box.scrollTop), h: box.clientHeight, sh: box.scrollHeight,
    seen: er ? er.top >= br.top - 1 && er.bottom <= br.bottom - 18 + 1 : null,
    at: er ? Math.round(er.top - br.top) : null, end: er ? Math.round(er.bottom - br.top) : null };
}, sel || null);
const scrollTo = (P, y) => P.page.evaluate((y) => {
  const inner = document.querySelector('[data-cx-page]') || document.querySelector('[data-cx-grid]');
  let box = inner ? inner.parentElement : null;
  while (box && !/^(auto|scroll)$/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (box) box.scrollTop = y < 0 ? box.scrollHeight : y;
  return box ? Math.round(box.scrollTop) : null;
}, y);
const cardLook = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-cx-item]');
  if (!c) return null;
  const tier = c.querySelector('[data-cx-tier]'), base = c.querySelector('[data-cx-base]'), found = c.querySelector('[data-cx-found]');
  return { id: c.dataset.cxItem, text: c.innerText.replace(/\s+/g, ' '), tier: tier ? tier.innerText.trim() : null, base: base ? base.innerText.trim() : null,
    found: found ? found.innerText.replace(/\s+/g, ' ') : '',
    grades: [...c.querySelectorAll('[data-cx-grade]')].map((g) => g.dataset.cxGrade + ' ' + ((g.querySelector('[data-cx-grade-pct]') || {}).innerText || '').trim()) };
});
const locations = (P) => P.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-cx-loc]')].map((r) => [r.dataset.cxLoc, r.innerText.replace(/\s+/g, ' ')])));
/* every phase the stage passes through in `ms` -- watched as it changes (a
   MutationObserver), so a 0.2 s dash on a page drawing a few frames a second
   is never missed between two looks.  Also:
     shots  each throw's picture as its flight BEGINS: in and decoded ('in'),
            not yet ('late': it would cross the gap undrawn), or a drawn ball;
     gap    the nearest the monster's art ever came to your character's
            middle, px (sampled every 50 ms: a swelling slime or the mummy's
            bigger bones standing over you reads below 0) */
/*   out    how far your figure's painted pixels and the monster's art ever
            got past the stage's frame, px (v2.3.3196: the owner saw them
            "in a layer above the container ... the bottom of the characters
            ... visible on the dashboard container"); 0 is inside, always
     feet   at rest, how far above the ground strip's edge your boots and the
            monster's feet are, px (0: standing on it) */
const watchStage = (P, ms) => P.page.evaluate((ms) => new Promise((resolve) => {
  const seen = new Set(); const pops = new Set(); const labels = new Set(); const zones = new Set();
  const shots = [];
  let ready = false, lastPhase = null, gap = Infinity, gapAt = null;
  let heroOut = 0, monOut = 0, heroFeet = null, monFeet = null, fig = null, outAt = null;
  /* the hero canvas's painted box, as shares of the canvas */
  const figOf = (cv) => {
    try {
      const w = cv.width, h = cv.height;
      if (!w || !h) return null;
      const d = cv.getContext('2d').getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return x1 < 0 ? null : { x0: x0 / w, x1: (x1 + 1) / w, y0: y0 / h, y1: (y1 + 1) / h };
    } catch (e) { return null; }
  };
  const look = () => {
    const st = document.querySelector('[data-cx-stage]');
    if (!st) return;
    const ph = st.dataset.cxPhase;
    seen.add(ph);
    if (st.dataset.cxReady === '1') ready = true;
    if (ph === 'fly' && lastPhase !== 'fly') {
      const sh = st.querySelector('.bt-cx-shot');
      shots.push(!sh ? 'none' : sh.tagName !== 'IMG' ? 'ball' : (sh.complete && sh.naturalWidth > 0 ? 'in' : 'late'));
    }
    lastPhase = ph;
    for (const p of st.querySelectorAll('[data-cx-pop]')) pops.add(p.dataset.cxPop + ':' + p.innerText.trim());
    for (const l of st.querySelectorAll('[data-cx-label]')) labels.add(l.innerText.trim());
    for (const z of st.querySelectorAll('[data-cx-zone]')) zones.add(z.dataset.cxZone);
  };
  const measure = () => {
    const st = document.querySelector('[data-cx-stage]');
    if (!st || st.dataset.cxReady !== '1') return;
    const hero = st.querySelector('.bt-cx-hero');
    /* inside the frame: the stage's box less its border */
    const so = st.getBoundingClientRect();
    const box = { l: so.left + st.clientLeft, t: so.top + st.clientTop };
    box.r = box.l + st.clientWidth; box.b = box.t + st.clientHeight;
    const ground = box.b - (parseFloat(st.style.getPropertyValue('--cx-ground')) || 0);
    const past = (R) => Math.max(0, box.l - R.l, R.r - box.r, box.t - R.t, R.b - box.b);
    const ph = st.dataset.cxPhase;
    const cv = hero && hero.querySelector('canvas');
    if (cv && !fig) fig = figOf(cv);
    if (cv && fig) {
      const cr = cv.getBoundingClientRect(), wr = cv.parentElement.getBoundingClientRect();
      const R = { l: Math.max(wr.left, cr.left + fig.x0 * cr.width), r: Math.min(wr.right, cr.left + fig.x1 * cr.width),
        t: Math.max(wr.top, cr.top + fig.y0 * cr.height), b: Math.min(wr.bottom, cr.top + fig.y1 * cr.height) };
      const o = past(R);
      if (o > heroOut) { heroOut = o; outAt = 'hero ' + ph; }
      if (ph === 'idle') heroFeet = Math.round((ground - R.b) * 10) / 10;
    }
    for (const sp of st.querySelectorAll('.bt-cx-mon .bt-cx-strip')) {
      const r = sp.getBoundingClientRect();
      const R = { l: r.left + (+sp.dataset.cxX0 || 0) * r.width, r: r.left + (+sp.dataset.cxX1 || 1) * r.width, t: r.top + (+sp.dataset.cxTop || 0) * r.height, b: r.bottom };
      const o = past(R);
      if (o > monOut) { monOut = o; outAt = 'monster ' + ph; }
      if (ph === 'idle') monFeet = Math.round((ground - R.b) * 10) / 10;
    }
    const strip = st.querySelector('.bt-cx-mon .bt-cx-strip');
    if (!hero || !strip) return;
    const hr = hero.getBoundingClientRect(), sr = strip.getBoundingClientRect();
    const g = (sr.left + (+strip.dataset.cxX0 || 0) * sr.width) - (hr.left + hr.width / 2);
    if (g < gap) { gap = g; gapAt = st.dataset.cxPhase; }
  };
  const mo = new MutationObserver(look);
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cx-phase', 'data-cx-ready'] });
  const iv = setInterval(measure, 50);
  look();
  setTimeout(() => {
    mo.disconnect(); clearInterval(iv); look();
    const st = document.querySelector('[data-cx-stage]');
    resolve({ phases: [...seen], ready, pops: [...pops], labels: [...labels], zones: [...zones], strips: st ? st.querySelectorAll('.bt-cx-strip').length : 0,
      shots, gap: Number.isFinite(gap) ? Math.round(gap) : null, gapAt,
      out: Math.round(Math.max(heroOut, monOut) * 10) / 10, outAt, heroFeet, monFeet, fig: !!fig });
  }, ms);
}), ms);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Codexbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: '(' + BLOB_INIT.toString() + ')();' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 60 }).catch(() => {});
    await P.page.waitForTimeout(3000);

    /* ── 1 ── */
    const c0 = await codex(P);
    rec.ok('the worker counts (caps.codex) and sent the codex at join, empty', c0.caps && c0.known && c0.k && Object.keys(c0.k).length === 0, c0);
    /* the blob pictures alive before any codex page opens: the stat preview's
       baked blue slime (statDemoPreload, kept for the session) and whatever
       else the game made -- what the codex leaves is counted against this */
    const blobs0 = await P.page.evaluate(() => (window.__qaBlobs ? window.__qaBlobs() : null));
    const opened = await openCodex(P);
    const cs0 = await cards(P);
    rec.ok(`More -> Codex opens on Monsters: nine cards, every one a shape (${cs0.filter((c) => !c.known).length} unknown)`,
      opened && cs0.length === 9 && cs0.every((c) => !c.known) && KINDS.every((k) => cs0.some((c) => c.kind === k)), cs0);
    await P.page.screenshot({ path: join(OUT, 'codex-0-grid.png') });

    /* ── 2 ── */
    const k1 = await kill(wsPort, me, 'wm-frost-0');
    await H.waitFor(P, (S) => (S._codex && S._codex.k.snowling ? S._codex.k.snowling[0] : 0), (v) => v >= 1, { timeout: 8000, label: 'the first kill counted' }).catch(() => null);
    const c1 = await codex(P);
    const s1 = await said(P, /New in the Codex: Snowman/);
    rec.ok(`a snowman's kill is counted (snowling ${c1.k && c1.k.snowling ? c1.k.snowling.join('/') : '-'}) and said over your head ("${s1[0] || '?'}")`,
      k1 && k1.ok && c1.k && c1.k.snowling && c1.k.snowling[0] === 1 && s1.length >= 1, { k1, c1, s1 });
    await P.page.waitForTimeout(700);
    const cs1 = await cards(P);
    const snowCard = cs1.find((c) => c.kind === 'snowling');
    rec.ok(`...its card is known and NEW ("${snowCard && snowCard.text}")`, !!snowCard && snowCard.known && snowCard.fresh && /Snowman/.test(snowCard.text) && /1 defeated/.test(snowCard.text), snowCard);
    /* ── 3 ── */
    const sl0 = await sheetLook(P);
    await scrollTo(P, -1);
    const pg1 = await openPage(P, 'snowling');
    await P.page.waitForTimeout(600);
    const sl = await sheetLook(P);
    const bx = await boxLook(P, '[data-cx-page] > button');
    const d1 = await drops(P);
    rec.ok(`...its page keeps the sheet's own height (${sl0.h} px on the list, ${sl.h} on the page) and scrolls in it (${bx && bx.h} px of ${bx && bx.sh}), opened at its top though the list was scrolled down, the Codex's own tabs put away`,
      pg1 && sl0.h > 0 && Math.abs(sl.h - sl0.h) <= 1 && !!bx && bx.sh > bx.h + 100 && bx.top === 0 && bx.seen && !sl.chips, { sl0, sl, bx });
    rec.ok(`...its header says ${sl.level} / ${sl.element} / ${sl.type}, its tabs ${sl.tabs.join(' ')}`,
      sl.level === 'Lv 1–40' && sl.element === 'Frost' && sl.type === 'Humanoid' && sl.tabs.join(' ') === 'drops* info locations', sl);
    const want = { gold: ['100%', 'Currency'], remnant: ['100%', 'Material'], shard: ['10%', 'Material'], rawgem: ['5%', 'Gem'], raregem: ['0.5%', 'Gem'],
      irontorso: ['0.2%', 'Armor'], irongreaves: ['0.2%', 'Armor'], irongreatsword: ['0.2%', 'Weapon'], weapon: ['0.05–0.24%', 'Weapon'], nugget: ['0.01%', 'Craft'] };
    const dOff = Object.keys(want).filter((k) => !d1[k] || d1[k][0] !== want[k][0] || d1[k][1] !== want[k][1]);
    rec.ok(`...and its drop table from the first kill -- ITEM, TYPE, CHANCE: ${Object.keys(d1).map((k) => k + ' ' + d1[k][0]).join(', ')}`,
      Object.keys(d1).length === 10 && dOff.length === 0, { d1, dOff });
    /* the owner: "The drops table needs a different background so the
       information can stand out more from the dashboard background. Maybe
       black?" -- its panel is near-black, well darker than the sheet */
    const wells = await P.page.evaluate(() => {
      const lum = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return null; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]); };
      const p = document.querySelector('[data-cx-drops-panel]'), d = document.querySelector('.bt-dashboard');
      let sheet = null;
      for (let e = p && p.parentElement; e && !sheet; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) sheet = bg; }
      return { panel: p ? getComputedStyle(p).backgroundColor : null, sheet: sheet || (d ? getComputedStyle(d).backgroundColor : null),
        lp: p ? lum(getComputedStyle(p).backgroundColor) : null, ls: lum(sheet || (d ? getComputedStyle(d).backgroundColor : '')) };
    });
    rec.ok(`...on a near-black panel of its own (${wells.panel}, the sheet behind it ${wells.sheet})`,
      wells.lp != null && wells.ls != null && wells.lp < 0.006 && (wells.ls + 0.05) / (wells.lp + 0.05) >= 1.3, wells);
    /* the owner: "Make the codex section that has the table more readable with
       the background" -- every other row shaded, the headings on a band of
       their own, no name cut short, and each bar how common its drop is
       (powers of ten: every kill full, 1 in 10,000 a stub) */
    const legible = await P.page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-cx-drop]')];
      const bg = rows.map((r) => getComputedStyle(r).backgroundColor);
      const head = document.querySelector('[data-cx-drops-head]');
      const names = [...document.querySelectorAll('[data-cx-name-cell]')];
      return { bg, head: head ? getComputedStyle(head).backgroundColor : null,
        cut: names.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText),
        tall: names.filter((e) => e.getBoundingClientRect().height > 2.4 * 13.5 * 1.15).map((e) => e.innerText),
        bars: Object.fromEntries(rows.map((r) => [r.dataset.cxDrop, +r.dataset.cxBar])) };
    });
    const striped = legible.bg.length > 2 && legible.bg[0] !== legible.bg[1] && legible.bg.every((c, i) => c === legible.bg[i % 2]);
    rec.ok(`...readable on its black: every other row shaded, the headings on their own band (${legible.head}), no name cut short, the bars by how common (${Object.entries(legible.bars).map(([k, v]) => k + ' ' + v).join(', ')})`,
      striped && legible.head === 'rgb(16, 26, 31)' && legible.cut.length === 0 && legible.tall.length === 0
        && legible.bars.gold === 100 && legible.bars.shard === 77 && legible.bars.rawgem === 70 && legible.bars.raregem === 47
        && legible.bars.irongreatsword === 38 && legible.bars.weapon === 40 && legible.bars.nugget === 8, { striped, ...legible });
    await P.page.screenshot({ path: join(OUT, 'codex-1-snowman.png') });
    const fr1 = await codex(P);
    rec.ok('...and opening it clears its NEW', !(fr1.fresh && fr1.fresh.snowling), fr1.fresh);

    /* ── 4 ── */
    const deep = await scrollTo(P, -1);
    await P.page.screenshot({ path: join(OUT, 'codex-1b-scrolled.png') });
    await P.page.evaluate(() => { const b = document.querySelector('[data-cx-drop="irongreatsword"]'); if (b) b.click(); });
    await P.page.waitForSelector('[data-cx-item="irongreatsword"]', { timeout: 3000 }).catch(() => {});
    const ic = await cardLook(P);
    const icBox = await boxLook(P, '[data-cx-item-close]');
    rec.ok(`scrolled ${deep} px down the table, a tap on the Iron Great Sword opens its card at its top (its X in view): ${ic && ic.tier}, base ${ic && ic.base}, grades ${ic && ic.grades.join(' / ')}`,
      !!ic && deep > 0 && !!icBox && icBox.top === 0 && icBox.seen && /Iron Great Sword/.test(ic.text) && /Weapon/.test(ic.text) && ic.tier === 'Common' && ic.base === '0.2%' && /Snowman/.test(ic.found) && /Lv 1–40/.test(ic.found)
        && ic.grades.join('|') === 'normal 90.09995%|rare 9%|elite 0.9%|godly 0.00005%' && /does not change the 0.2% drop chance/.test(ic.text), { ic, icBox, deep });
    await P.page.screenshot({ path: join(OUT, 'codex-2-card.png') });
    await scrollTo(P, -1);
    await P.page.screenshot({ path: join(OUT, 'codex-2b-card-end.png') });
    await P.page.evaluate(() => { const b = document.querySelector('[data-cx-item-close]'); if (b) b.click(); });
    await P.page.waitForTimeout(300);
    const selNow = await P.page.evaluate(() => [...document.querySelectorAll('[data-cx-drop][data-cx-sel="1"]')].map((r) => r.dataset.cxDrop));
    const selBox = await boxLook(P, '[data-cx-drop="irongreatsword"]');
    await P.page.evaluate(() => { const b = document.querySelector('[data-cx-drop="shard"]'); if (b) b.click(); });
    await P.page.waitForSelector('[data-cx-item="shard"]', { timeout: 3000 }).catch(() => {});
    const sc = await cardLook(P);
    await P.page.evaluate(() => { const b = document.querySelector('[data-cx-item-close]'); if (b) b.click(); });
    await P.page.waitForTimeout(300);
    rec.ok(`...its X comes back to the list with that row marked (${selNow.join(',')}) and in view (${selBox && selBox.at} px down the box); a Frost Shard's card is 10% with no grades to roll`,
      selNow.join(',') === 'irongreatsword' && !!selBox && selBox.seen && !!sc && sc.base === '10%' && sc.grades.length === 0 && sc.tier === null && /Frost Shard/.test(sc.text), { selNow, selBox, sc });
    /* the open tab tapped again (the list scrolled down to the shard's row) */
    await scrollTo(P, 0);
    await tab(P, 'drops');
    const dTop = await boxLook(P, '[data-cx-drops]');
    rec.ok(`a tap on the open Drops tab puts its table at the top of the sheet (${dTop && dTop.at} px down, the box at ${dTop && dTop.top})`,
      !!dTop && dTop.at >= 0 && dTop.at <= 8 && dTop.top > 0, dTop);

    /* ── 5 ── */
    await tab(P, 'info');
    const stTop = await boxLook(P, '[data-cx-stage]');
    rec.ok(`a tap on Info puts its stage at the top of the sheet, all of it in view (${stTop && stTop.at}-${stTop && stTop.end} px of ${stTop && stTop.h})`,
      !!stTop && stTop.at >= 0 && stTop.at <= 8 && stTop.end <= stTop.h, stTop);
    const f1 = await facts(P);
    const w1 = await watchStage(P, 16000);
    rec.ok('Info, from the one kill: what it does, its element, its special attack, its story and its elder form all open', f1.page && f1.element && f1.special && f1.story && f1.elder, f1);
    rec.ok(`...its stage loads and plays its throw AND its special: ${w1.labels.join(', ') || 'no word'} (${w1.phases.join(' > ')}), its hit saying ${w1.pops.join(', ')}`,
      w1.ready && ['throw', 'fly', 'impact', 'burrow', 'pile', 'touch', 'emerge'].every((p) => w1.phases.includes(p)) && w1.labels.includes('BURROW!') && w1.pops.some((p) => /^frost:.*Chill/.test(p)), w1);
    /* the owner: "the animation shows the player and monster in a layer above
       the container they're supposed to be in and the bottom of the characters
       are visible on the dashboard container" -- both stand ON the stage's
       ground strip and never get past its frame; and the causes: the stage is
       its own stacking context and nothing in it asks for a layer of its own */
    const causes = await P.page.evaluate(() => {
      const st = document.querySelector('[data-cx-stage]');
      const cs = (sel) => { const e = st && st.querySelector(sel); return e ? getComputedStyle(e).willChange : null; };
      return { isolation: st ? getComputedStyle(st).isolation : null, overflow: st ? getComputedStyle(st).overflow : null, hero: cs('.bt-cx-hero'), mon: cs('.bt-cx-mon'),
        border: st ? getComputedStyle(st).borderTopColor : null };
    });
    rec.ok(`...your character and the snowman stand on its ground strip (boots ${w1.heroFeet} px, its feet ${w1.monFeet} px above it) and never get past its frame (${w1.out} px at most)`,
      w1.fig && w1.heroFeet != null && Math.abs(w1.heroFeet) <= 1.5 && w1.monFeet != null && Math.abs(w1.monFeet) <= 1.5 && w1.out <= 0.5
        && causes.isolation === 'isolate' && causes.overflow === 'hidden' && causes.hero === 'auto' && causes.mon === 'auto', { w1: { heroFeet: w1.heroFeet, monFeet: w1.monFeet, out: w1.out, outAt: w1.outAt, fig: w1.fig }, causes });
    await P.page.evaluate(() => { const b = document.querySelector('[data-cx-elder-toggle="1"]'); if (b) b.click(); });
    await P.page.waitForTimeout(400);
    const elderName = await P.page.evaluate(() => { const n = document.querySelector('[data-cx-name]'); return n ? n.innerText : ''; });
    const w1b = await watchStage(P, 5000);
    rec.ok(`...the elder toggle names it "${elderName}", its stage re-coloured and playing`, elderName === 'Glacier Snowman' && w1b.ready, { elderName, w1b });
    await P.page.screenshot({ path: join(OUT, 'codex-3-info.png') });

    /* ── 6 ── */
    await tab(P, 'locations');
    const loc = await locations(P);
    const lTop = await boxLook(P, '[data-cx-locations]');
    rec.ok(`Locations at the top of the sheet (${lTop && lTop.at} px down): its land, both stages, the way there (${loc.road || '?'})`,
      !!lTop && lTop.at >= 0 && lTop.at <= 8 &&
      /Frost Ridge/.test(loc.land || '') && /Lv 1–20/.test(loc.levels || '') && /Glacier Snowman/.test(loc.elder || '') && /Lv 21–40/.test(loc.elder || '')
        && /north gate/.test(loc.road || '') && /Frost Trail/.test(loc.road || '') && !loc.dungeon, { loc, lTop });
    await P.page.screenshot({ path: join(OUT, 'codex-4-locations.png') });
    await scrollTo(P, -1);
    await P.page.screenshot({ path: join(OUT, 'codex-4b-locations-end.png') });
    await back(P);
    await P.page.waitForTimeout(300);
    const sl2 = await sheetLook(P);
    const bk = await boxLook(P, '[data-cx-card="snowling"]');
    rec.ok(`...and back on the list the sheet never grew (${sl2.h} px), the Codex's tabs back and the Snowman's card in view`,
      Math.abs(sl2.h - sl0.h) <= 1 && sl2.chips && !!bk && bk.seen, { sl2, bk });

    /* ── 7 ── */
    await H.devOp(wsPort, 'codex', me, { all: true, n: 25, n2: 1 });
    await P.page.waitForTimeout(700);
    const every = [];
    for (const kind of KINDS) {
      const listTop = (await boxLook(P)).top;
      const ok = await openPage(P, kind);
      const opened = await boxLook(P);
      const type = await P.page.evaluate(() => { const e = document.querySelector('[data-cx-pill="type"]'); return e ? e.innerText.trim() : null; });
      const dr = await drops(P);
      const cut = await P.page.evaluate(() => [...document.querySelectorAll('[data-cx-name-cell]')]
        .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().height > 2.4 * 13.5 * 1.15).map((e) => e.innerText));
      await tab(P, 'info');
      const w = await watchStage(P, kind === 'snowling' ? 15000 : 12000);
      await P.page.screenshot({ path: join(OUT, 'codex-' + kind + '.png') });
      await tab(P, 'locations');
      const lc = await locations(P);
      await scrollTo(P, -1);
      await back(P);
      await P.page.waitForTimeout(300);
      const backAt = await boxLook(P, `[data-cx-card="${kind}"]`);
      every.push({ kind, ok, ready: w.ready, special: w.phases.includes(SPECIAL_PHASE[kind]), phases: w.phases, labels: w.labels, pops: w.pops,
        zones: w.zones, shots: w.shots, gap: w.gap, gapAt: w.gapAt, drops: dr, loc: lc, type, listTop, openTop: opened && opened.top, backSeen: backAt && backAt.seen, backTop: backAt && backAt.top,
        out: w.out, outAt: w.outAt, heroFeet: w.heroFeet, monFeet: w.monFeet, cut });
    }
    rec.ok(`every page's kind is its body's: ${every.map((e) => e.kind + ' ' + e.type).join(', ')}`,
      every.every((e) => e.type === TYPES[e.kind]), every.map((e) => ({ kind: e.kind, type: e.type, want: TYPES[e.kind] })));
    /* the list scrolled down by the last trip back (the Blue Slime is on its
       third row): every page opens at its top all the same, and back on the
       list its card is in view */
    rec.ok(`...each opens at its top however far the list was scrolled (the list at ${every.map((e) => e.listTop).join('/')} px), and back on the list its card is in view (the list at ${every.map((e) => e.backTop).join('/')} px)`,
      every.every((e) => e.openTop === 0 && e.backSeen) && every.some((e) => e.listTop > 0) && every.some((e) => e.backTop > 0), every.map((e) => ({ kind: e.kind, listTop: e.listTop, openTop: e.openTop, backSeen: e.backSeen, backTop: e.backTop })));
    const bad = every.filter((e) => !e.ok || !e.ready || !e.special);
    rec.ok(`every page's stage loads and plays its own special (${every.filter((e) => e.special).length}/9)`, bad.length === 0, bad.length ? bad : every.map((e) => e.kind + ':' + e.labels.join('/')));
    rec.ok('...and every hit there says its element', every.every((e) => e.pops.length >= 1), every.map((e) => e.kind + ' ' + e.pops.join(',')));
    /* a throw's picture is in before its first flight (it loads with the
       strips), and nothing ever stands over your character -- the swelling
       slime backs off as it grows, the mummy's bones keep their own reach */
    /* a slam or a lunge marks the ground under you as it winds up, the
       world's own warning circle; nothing else draws one */
    const ZONED = { gobling: 'lunge', pebbling: 'slam', sparklet: 'lunge', finling: 'slam', wisplet: 'lunge', lurkling: 'slam' };
    rec.ok(`...a slam or a lunge marks the ground under you as it winds up (${every.filter((e) => e.zones.length).map((e) => e.kind + ':' + e.zones.join('/')).join(', ')})`,
      every.every((e) => (ZONED[e.kind] ? e.zones.length === 1 && e.zones[0] === ZONED[e.kind] : e.zones.length === 0)), every.map((e) => e.kind + ' ' + e.zones.join('/')));
    /* the drop tables: every pile drop on every page; remnants from the six
       kinds that leave them (the rock monster, the fishman and the bog lurker
       leave none, index.js _isRemnantSkullArch); a raw gem from every land
       but the Verdant Wilds (Flora is not a Gem Cutter element) */
    const NO_REMNANT = ['pebbling', 'finling', 'lurkling'], NO_GEM = ['dewdrop'];
    const dropOff = every.filter((e) => {
      const d = e.drops || {};
      if (!['gold', 'shard', 'raregem', 'irontorso', 'irongreaves', 'irongreatsword', 'weapon', 'nugget'].every((id) => d[id])) return true;
      if (!!d.remnant === NO_REMNANT.includes(e.kind)) return true;
      if (!!d.rawgem === NO_GEM.includes(e.kind)) return true;
      return d.shard[0] !== '10%';
    });
    rec.ok(`...and every page's drop table is its own (${every.map((e) => e.kind + ' ' + Object.keys(e.drops || {}).length).join(', ')})`,
      dropOff.length === 0, dropOff.map((e) => ({ kind: e.kind, drops: e.drops })));
    rec.ok('...and no drop\'s name is cut short on any of them ("Fire Goblin Remnants" in two lines at most)',
      every.every((e) => e.cut && e.cut.length === 0), every.filter((e) => !e.cut || e.cut.length).map((e) => ({ kind: e.kind, cut: e.cut })));
    /* Locations: the way there for all nine, and the three lands' dungeons
       with their own levels (WHEEL_DOORS) */
    const locOff = every.filter((e) => {
      const l = e.loc || {};
      if (!l.land || !l.road || !/gate/.test(l.road)) return true;
      const dg = DUNGEONS[e.kind];
      return dg ? !(l.dungeon && l.dungeon.includes(dg[0].replace(/^the /, '')) && l.dungeon.includes(dg[1])) : !!l.dungeon;
    });
    rec.ok(`...every page's Locations says the way there, and the Great Cave, the Foundry Dome and the Buried City where they are (${every.filter((e) => e.loc && e.loc.dungeon).map((e) => e.kind).join(', ')})`,
      locOff.length === 0, locOff.map((e) => ({ kind: e.kind, loc: e.loc })));
    const thrown = every.filter((e) => e.shots.length);
    rec.ok(`...every thrown picture is in as its first flight begins (${thrown.map((e) => e.kind + ' ' + e.shots.join('/')).join(', ')})`,
      thrown.length >= 5 && thrown.every((e) => e.shots.every((x) => x === 'in' || x === 'ball')), thrown.map((e) => ({ kind: e.kind, shots: e.shots })));
    rec.ok(`...and no monster ever stands over your character (nearest ${Math.min(...every.map((e) => (e.gap == null ? 99 : e.gap)))} px from its middle)`,
      every.every((e) => e.gap != null && e.gap >= 0), every.map((e) => e.kind + ' ' + e.gap + ' at ' + e.gapAt));
    rec.ok(`...on every stage both stand on the ground strip and nothing gets past the frame (${every.map((e) => e.kind + ' ' + e.out + (e.outAt ? ' (' + e.outAt + ')' : '')).join(', ')})`,
      every.every((e) => e.out != null && e.out <= 0.5 && e.heroFeet != null && Math.abs(e.heroFeet) <= 1.5 && e.monFeet != null && Math.abs(e.monFeet) <= 1.5),
      every.map((e) => ({ kind: e.kind, out: e.out, outAt: e.outAt, heroFeet: e.heroFeet, monFeet: e.monFeet })));

    /* ── 8 ── */
    await H.closeDest(P).catch(() => {});
    await P.page.waitForTimeout(800);
    const left = await P.page.evaluate(() => ({ blobs: window.__qaBlobs ? window.__qaBlobs() : null, stage: !!document.querySelector('[data-cx-stage]') }));
    rec.ok(`closed, nothing is left behind: no stage, and every picture the stages baked revoked (${left.blobs} blob(s) alive, ${blobs0} before the codex opened)`,
      !left.stage && left.blobs != null && blobs0 != null && left.blobs <= blobs0, { left, blobs0 });

    /* ── 9 ── */
    await P.page.reload();
    await H.enterWorld(P).catch(() => {});
    const back7 = await H.waitFor(P, (S) => (S._codex && S._codex.known ? S._codex.k : null), (v) => !!v && v.snowling && v.snowling[0] === 25, { timeout: 90000, label: 'the codex after a reload' }).catch(() => null);
    rec.ok('a reload: the counts come back from the worker', !!back7 && KINDS.every((k) => back7[k] && back7[k][0] === 25 && back7[k][1] === 1), back7);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
