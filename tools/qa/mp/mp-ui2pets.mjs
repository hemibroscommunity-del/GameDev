/* ═══ PETS UNDER THE NEW DASHBOARD (v2.3.6696, card UI2-pets, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 4.6: "Active companion
 * dominates the overview, with actual appearance, identity and relevant
 * supported stats. Secondary destinations: Owned Pets and All Pets ... No
 * active companion produces an informative empty state."  Its task (part 16):
 * "Find a lifetime record and the active pet".
 *
 * A real phone (upright, touch, deviceScaleFactor 2) against a real worker, in
 * the world's BroTown:
 *   1. no pets: Bro's Pets door lands on the how-to-catch state, both doors there;
 *   2. two pets (a Snowling out, a Gobling above your Trapping level): the
 *      companion large, its level, XP and ward;
 *   3. the task's pet half, from Bro's landing: Journey (a lifetime record),
 *      Back, Pets: the companion, in two taps each;
 *   4. Owned: two cards, "With you" on one; the other's page: Take out (its
 *      pending mark, then the companion changes), Rename, Release asks once
 *      and Keep keeps it; Sell off on the pet out with its reason;
 *   5. All: 18 cells, the caught ones named, a stage at a time;
 *   6. Put away: "No pet out with you", the doors still there;
 *   7. Back to where it came from at each page; Close, then Menu, resumes it;
 *   8. 390 x 844, 844 x 390 (sideways) and a computer (1280 x 800, `wide`):
 *      the companion fits, nothing under 44 px or 11 px; `?ui2=0` gives
 *      today's page (data-pets-panel);
 *   9. no page errors.
 * Pictures: docs/shots/ui2-pets-*.png (the band, at deviceScaleFactor 2).
 */
import path from 'node:path';
import * as H from './harness.mjs';

export const lane = 'full';

const SHOTS = path.join(H.REPO, 'docs', 'shots');
const PHONE = { width: 375, height: 667 };

async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
const settle = (P) => H.waitFor(P, () => !document.querySelector('[data-dash-grow]'), (v) => v === true, { timeout: 15000, label: 'the growing motion ends' }).catch(() => null);
const tap = async (P, sel, ms = 700) => { await P.page.locator(sel).first().click({ timeout: 15000 }); await P.page.waitForTimeout(ms); await settle(P); };
const back = (P) => tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);

/* what is up: the header, the page box, and what Pets draws in it */
function look() {
  const txt = (el) => (el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const box = document.querySelector('[data-band-box="page"]');
  const B = box ? box.getBoundingClientRect() : null;
  const root = document.querySelector('[data-pets-page]');
  let minFont = 99;
  const clipped = [];
  const small = [];
  if (root) {
    for (const e of root.querySelectorAll('*')) {
      if (!Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = e.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      minFont = Math.min(minFont, parseFloat(getComputedStyle(e).fontSize) || 99);
      if (B && (r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5 || r.left < B.left - 0.5 || r.right > B.right + 0.5)) {
        let sc = e.parentElement, inScroller = false;
        while (sc && sc !== document.body) { const cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflowX)) { inScroller = true; break; } sc = sc.parentElement; }
        if (!inScroller) clipped.push(e.textContent.trim().slice(0, 30));
      }
    }
    for (const b of root.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && (r.width < 43.5 || r.height < 43.5)) small.push((b.getAttribute('data-pets-card') || b.getAttribute('data-pets-door') || b.getAttribute('data-u2-shelf') || b.className).slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  const fig = root && root.querySelector('[data-pets-figure] canvas, .u2-pets-figure canvas');
  return {
    title: txt(document.querySelector('[data-dash-frame] [data-u2="title"]')),
    back: txt(document.querySelector('[data-dash-frame] [data-dash-ctl="back"]')),
    page: root ? root.getAttribute('data-pets-page') : null,
    state: root ? root.getAttribute('data-pets-state') : null,
    one: root ? root.getAttribute('data-pets-one') : null,
    figure: (() => { const f = root && root.querySelector('[data-pets-figure]'); return f ? f.getAttribute('data-pets-figure') : null; })(),
    figPx: fig ? Math.round(fig.getBoundingClientRect().height) : 0,
    name: txt(root && root.querySelector('[data-pets-name]')),
    tags: txt(root && root.querySelector('[data-pets-tags]')),
    facts: Array.from((root || document).querySelectorAll('[data-u2-show-fact]')).map((f) => ({ id: f.getAttribute('data-u2-show-fact'), text: txt(f) })),
    doors: Array.from((root || document).querySelectorAll('[data-pets-door]')).map((d) => ({ id: d.getAttribute('data-pets-door'), text: txt(d) })),
    empty: txt(root && root.querySelector('[data-u2-empty]')),
    cards: Array.from((root || document).querySelectorAll('[data-pets-card]')).map((c) => ({ id: c.getAttribute('data-pets-card'), out: c.getAttribute('data-pets-out') === '1', text: txt(c) })),
    cells: Array.from((root || document).querySelectorAll('[data-pets-cell]')).map((c) => ({ k: c.getAttribute('data-pets-cell'), caught: c.getAttribute('data-pets-caught') === '1', text: txt(c) })),
    head: txt(root && root.querySelector('.u2-coll-head')),
    actions: Array.from((root || document).querySelectorAll('[data-u2-action]')).map((a) => ({ id: a.getAttribute('data-u2-action'), mark: a.getAttribute('data-u2-mark'), text: txt(a), off: !!a.querySelector('button[disabled]'), why: txt(a.querySelector('[data-u2-why]')) })),
    confirm: txt(root && root.querySelector('[data-u2-confirm]')),
    notes: txt(root && root.querySelector('.u2-pets-notes')),
    rootText: txt(root),
    oldPage: !!document.querySelector('[data-pets-panel]'),
    minFont, clipped, small,
  };
}
const L = (P) => P.page.evaluate(look);
const fits = (v) => v.clipped.length === 0 && v.small.length === 0 && v.minFont >= 11;
const fitWhy = (v) => ({ clipped: v.clipped, small: v.small, minFont: v.minFont, page: v.page });
const book = (P) => H.readState(P, (S) => (S._petBook ? { active: S._petBook.active, cap: S._petBook.cap, list: S._petBook.list.map((p) => ({ id: p.id, kind: p.kind, name: p.name, lv: p.lv, stage: p.stage })) } : null));

async function inWorld(P, rec, label) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, b: !!S._petBook }), (v) => v.z === 'wheel' && !v.l && v.b, { timeout: 90000, label: 'into the world' }).catch(() => null);
  rec.ok(`${label}: in the world, the pets record here (guard)`, !!w, w);
  return !!w;
}
/* two pets: a Lv 20 Snowling (out, Trapping 30) and a Lv 35 Gobling (above your Trapping level: held at 30) */
async function seedTwo(P, wsPort, me) {
  const a = await H.devOp(wsPort, 'trapping', me, { level: 30, pet: { home: 'frost', level: 20 } }).catch(() => null);
  const b = await H.devOp(wsPort, 'trapping', me, { pet: { home: 'ember', level: 35 } }).catch(() => null);
  await H.devOp(wsPort, 'trapping', me, { level: 30 }).catch(() => null);
  await H.waitFor(P, (S) => (S._petBook ? S._petBook.list.length : 0), (v) => v >= 2, { timeout: 10000, label: 'two pets' }).catch(() => null);
  return { a: a && a.pet, b: b && b.pet };
}
async function openPets(P) {
  await H.dashOpen(P, 'pets').catch(() => null);
  await P.page.waitForSelector('[data-pets-page="pets"]', { timeout: 15000 }).catch(() => null);
  await P.page.waitForTimeout(500);
  await settle(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Petsbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    if (!(await inWorld(P, rec, '375 x 667'))) return;
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1. no pets ── */
    await openPets(P);
    const v1 = await L(P);
    rec.ok(`1. no pets: the how-to-catch state ("${v1.empty.slice(0, 70)}"), Owned and All still there`,
      v1.page === 'pets' && v1.state === 'empty' && /No pets yet/.test(v1.empty) && /box traps/.test(v1.empty)
        && v1.doors.map((d) => d.id).join() === 'owned,all' && /0 of 30/.test(v1.doors[0].text) && /0 of 18 caught/.test(v1.doors[1].text) && v1.title === 'Pets', v1);
    rec.ok('1b. it fits (nothing under 44 px or 11 px, nothing cut)', fits(v1), fitWhy(v1));
    await bandShot(P, 'ui2-pets-empty.png');

    /* ── 2. two pets, one out ── */
    const ids = await seedTwo(P, wsPort, me);
    await P.page.waitForTimeout(900);
    const v2 = await L(P);
    const fact = (v, id) => (v.facts.find((f) => f.id === id) || { text: '' }).text;
    rec.ok(`2. the companion large (${v2.figPx} px): "${v2.name}", ${fact(v2, 'level')}, ${fact(v2, 'xp')}, ${fact(v2, 'ward')}`,
      v2.state === 'pet' && v2.figure === ids.a && v2.figPx >= 56 && /Snowling/.test(v2.name) && /Lv 20/.test(fact(v2, 'level'))
        && /XP/.test(fact(v2, 'xp')) && /Softens chills 34%/.test(fact(v2, 'ward')) && /2 of 30/.test(v2.doors[0].text) && /2 of 18 caught/.test(v2.doors[1].text)
        && v2.actions.length === 1 && v2.actions[0].id === 'away' && !/rarity|attack|health|ability/i.test(v2.rootText), { v2, ids });
    rec.ok('2b. it fits', fits(v2), fitWhy(v2));
    await bandShot(P, 'ui2-pets-companion.png');

    /* ── 3. the task's pet half, from Bro's landing ── */
    await H.dashMenuRoot(P).catch(() => null);
    await tap(P, '[data-dash-grid="menu"] [data-dest="hero"]', 600);
    await tap(P, '[data-dash-grid="bro"] [data-dest="journey"]', 800);
    const journey = await P.page.evaluate(() => (document.querySelector('[data-dash-frame] [data-u2="title"]') || {}).innerText || '');
    await back(P);
    await tap(P, '[data-dash-grid="bro"] [data-dest="pets"]', 800);
    const v3 = await L(P);
    rec.ok(`3. Bro: Journey ("${journey.trim()}"), Back, Pets: the companion ("${v3.name}"), Back says ${v3.back}`,
      /journey/i.test(journey) && v3.page === 'pets' && v3.state === 'pet' && v3.figure === ids.a && /Bro/.test(v3.back), { journey, v3 });

    /* ── 4. Owned and a pet's page ── */
    await tap(P, '[data-pets-door="owned"]', 800);
    const v4 = await L(P);
    const outCards = v4.cards.filter((c) => c.out);
    rec.ok(`4. Owned: two cards, "With you" on one ("${outCards[0] && outCards[0].text}"); the head "${v4.head}", More room`,
      v4.page === 'petsOwned' && v4.cards.length === 2 && outCards.length === 1 && outCards[0].id === ids.a && /With you/.test(outCards[0].text)
        && /Lv 30 \(35\)/.test((v4.cards.find((c) => c.id === ids.b) || {}).text || '') && /2 of 30/.test(v4.head) && v4.title === 'Owned', v4);
    rec.ok('4b. Owned fits', fits(v4), fitWhy(v4));
    await bandShot(P, 'ui2-pets-owned.png');
    /* the companion's own page first: Sell off with its reason (or, where the store sells no pets, the trade rule's words) */
    await tap(P, `[data-pets-card="${ids.a}"]`, 800);
    const vA = await L(P);
    const sell = vA.actions.find((a) => a.id === 'sell');
    rec.ok(`4c. the pet out: Sell off with its reason ("${sell ? sell.why : vA.notes}")`,
      vA.page === 'petsOne' && vA.one === ids.a && (sell ? sell.off && /Put it away to trade or sell it/.test(sell.why) : /Put it away to trade or sell it/.test(vA.notes)), vA);
    await back(P);
    await tap(P, `[data-pets-card="${ids.b}"]`, 800);
    const v4d = await L(P);
    rec.ok(`4d. the Gobling's page: "${v4d.title}", held "${(v4d.notes || '').slice(0, 60)}", Take out, Rename, Release`,
      v4d.one === ids.b && /Gobling/.test(v4d.title) && /Works at Lv 30 until your Trapping reaches 35/.test(v4d.notes)
        && v4d.actions.map((a) => a.id).slice(0, 3).join() === 'active,rename,release' && /Take out/.test(v4d.actions[0].text), v4d);
    await bandShot(P, 'ui2-pets-one.png');
    /* Take out: the pending mark on the control, then the companion changes */
    await P.page.evaluate(() => {
      window.__qaMarks = [];
      const mo = new MutationObserver(() => { const a = document.querySelector('[data-u2-action="active"]'); if (a) window.__qaMarks.push(a.getAttribute('data-u2-mark')); });
      mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-u2-mark'], childList: true });
      window.__qaMo = mo;
    });
    await P.page.locator('[data-pets-one] [data-u2-action="active"] button').first().click({ timeout: 15000 });
    await H.waitFor(P, (S) => (S._petBook ? S._petBook.active : null), (v) => v === ids.b, { timeout: 8000, label: 'the Gobling out' }).catch(() => null);
    await P.page.waitForTimeout(900);
    const marks = await P.page.evaluate(() => { try { window.__qaMo.disconnect(); } catch (e) { /* gone */ } return window.__qaMarks || []; });
    const v4e = await L(P);
    rec.ok(`4e. Take out: pending (${marks.join(' > ')}), then Put away on it; the record says it is out`,
      marks.includes('out') && v4e.actions[0] && /Put away/.test(v4e.actions[0].text) && v4e.actions[0].mark === 'free', { marks, v4e: v4e.actions });
    /* Rename: routine, no question */
    await tap(P, '[data-pets-one] [data-u2-action="rename"] button', 500);
    await P.page.fill(`[data-pet-name-input="${ids.b}"]`, 'Ember');
    await tap(P, `[data-pet-name-save="${ids.b}"]`, 600);
    const named = await H.waitFor(P, (S) => { const p = S._petBook && S._petBook.list.find((q) => q.name === 'Ember'); return p ? p.id : null; }, (v) => !!v, { timeout: 8000, label: 'the name kept' }).catch(() => null);
    await P.page.waitForTimeout(900);
    const v4f = await L(P);
    rec.ok(`4f. Rename: "${v4f.name}" (its kind "${v4f.tags}"), no question asked`, named === ids.b && v4f.name === 'Ember' && /Cinder Gobling|Gobling/.test(v4f.tags) && !v4f.confirm, v4f);
    /* Release asks once; Keep keeps it */
    await tap(P, '[data-pets-one] [data-u2-action="release"] button', 500);
    const v4g = await L(P);
    await tap(P, '[data-pets-one] [data-u2-confirm="release"] [data-esc]', 600);
    const kept = await book(P);
    const v4h = await L(P);
    rec.ok(`4g. Release asks once ("${v4g.confirm}"), Keep keeps it (${kept && kept.list.length} pets)`,
      /Release Ember for good\?/.test(v4g.confirm) && kept && kept.list.length === 2 && !v4h.confirm && v4h.actions.length >= 3, { confirm: v4g.confirm, kept });

    /* ── 5. All ── */
    await back(P);
    const vBack = await L(P);
    await back(P);
    const vLand = await L(P);
    rec.ok(`7a. Back from a pet's page to Owned ("${vBack.title}"), Back again to Pets: the Gobling the companion now ("${vLand.name}")`,
      vBack.page === 'petsOwned' && vLand.page === 'pets' && vLand.figure === ids.b && vLand.name === 'Ember', { vBack: vBack.page, vLand: { page: vLand.page, figure: vLand.figure, name: vLand.name } });
    await tap(P, '[data-pets-door="all"]', 800);
    const v5 = await L(P);
    await bandShot(P, 'ui2-pets-all.png');
    await tap(P, '[data-pets-page="petsAll"] [data-u2-shelf="2"]', 600);
    const v5b = await L(P);
    const all = v5.cells.concat(v5b.cells);
    const caught = all.filter((c) => c.caught).map((c) => c.k).sort();
    rec.ok(`5. All: ${all.length} cells, "${v5.head}", caught ${caught.join(' and ')} named ("${(all.find((c) => c.k === 'snowling.1') || {}).text}")`,
      v5.page === 'petsAll' && all.length === 18 && new Set(all.map((c) => c.k)).size === 18 && caught.join() === 'gobling.2,snowling.1'
        && /2 of 18 caught/.test(v5.head) && /Snowling/.test((all.find((c) => c.k === 'snowling.1') || {}).text || '') && v5.title === 'All', { v5: v5.cells, v5b: v5b.cells, head: v5.head });
    rec.ok('5b. All fits (its cards scroll inside it)', fits(v5), fitWhy(v5));
    /* Close, then Menu: the page resumes */
    await tap(P, '[data-dash-frame] [data-dash-ctl="close"]', 800);
    await tap(P, '[data-dash-ctl="menu"]', 900);
    const v7 = await L(P);
    rec.ok(`7b. Close, then Menu: All resumes ("${v7.title}")`, v7.page === 'petsAll', { page: v7.page, title: v7.title });
    await back(P);

    /* ── 6. Put away ── */
    await tap(P, '[data-pets-page="pets"] [data-u2-action="away"] button', 600);
    await H.waitFor(P, (S) => (S._petBook ? S._petBook.active : 'x'), (v) => v === null, { timeout: 8000, label: 'put away' }).catch(() => null);
    await P.page.waitForTimeout(900);
    const v6 = await L(P);
    rec.ok(`6. Put away: "${v6.empty}", Owned and All still there`, v6.state === 'none' && /No pet out with you/.test(v6.empty) && v6.doors.length === 2 && !/No pets yet/.test(v6.rootText), v6);
    /* back out again for the other sizes' companion */
    await tap(P, '[data-pets-door="owned"]', 700);
    await tap(P, `[data-pets-card="${ids.a}"]`, 700);
    await tap(P, '[data-pets-one] [data-u2-action="active"] button', 600);
    await H.waitFor(P, (S) => (S._petBook ? S._petBook.active : null), (v) => v === ids.a, { timeout: 8000, label: 'the Snowling out again' }).catch(() => null);
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── 8. the other sizes ── */
  for (const [label, opts, file] of [
    ['390 x 844', { viewport: { width: 390, height: 844 }, touch: true }, null],
    ['844 x 390 (sideways)', { viewport: { width: 844, height: 390 }, touch: true }, 'ui2-pets-companion-844x390.png'],
    ['a computer (1280 x 800)', { viewport: { width: 1280, height: 800 }, wide: true }, 'ui2-pets-companion-computer.png'],
  ]) {
    const nm = 'Petsize' + label.slice(0, 3).trim();
    const Q = opts.wide
      ? await H.newPlayer(browser, { name: nm, wsPort, webPort, dpr: 2, world: 'wheel', viewport: opts.viewport, wide: true })
      : await H.newPlayer(browser, { name: nm, wsPort, webPort, dpr: 2, world: 'wheel', viewport: opts.viewport, touch: true });
    Q.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
    try {
      if (!(await inWorld(Q, rec, label))) continue;
      const q = await H.readState(Q, (S) => S.myId);
      await seedTwo(Q, wsPort, q);
      await openPets(Q);
      await Q.page.waitForTimeout(700);
      const v = await L(Q);
      rec.ok(`8. ${label}: the companion with its level and both doors (${v.figPx} px)`, v.state === 'pet' && /Lv 20/.test(fact0(v)) && v.doors.length === 2, v);
      rec.ok(`8b. ${label}: it fits`, fits(v), fitWhy(v));
      if (file) await bandShot(Q, file);
    } finally {
      await Q.ctx.close().catch(() => {});
    }
  }

  /* ── 8c. ?ui2=0: today's page ── */
  const O = await H.newPlayer(browser, { name: 'Petsold', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel', query: 'ui2=0' });
  O.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    if (await inWorld(O, rec, '?ui2=0')) {
      await H.dashOpen(O, 'pets').catch(() => null);
      const old = await O.page.waitForSelector('[data-pets-panel]', { timeout: 15000 }).then(() => true).catch(() => false);
      const neu = await O.page.evaluate(() => !!document.querySelector('[data-pets-page]'));
      rec.ok('8c. ?ui2=0: today\'s Pets page, not the new one', old && !neu, { old, neu });
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }

  rec.ok('9. no page errors', errors.length === 0, errors.slice(0, 5));
}
function fact0(v) { return (v.facts.find((f) => f.id === 'level') || { text: '' }).text; }
