/* ═══ v2.3.6685: COMBAT'S HUB AND A WEAPON'S PAGE (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * The owner, 2026-11-25: "Combat: Three independent weapon channels plus
 * shared attributes. Dedicated weapon screen with level/XP, DPS, supporting
 * stats and six attributes ... Existing allocation preview opens on
 * selection, not a permanent panel."  A character seeded on the worker
 * (/dev/combat: Sword 12, Bow 5, Staff 1, its points dealt by the worker's
 * own deal: unspent points in the Sword, Bow and Shared pools), in the world:
 *   1. Combat (H.dashOpen 'broCombat') is four doors, Sword, Bow, Staff over
 *      Shared Attributes; each weapon's level, its XP bar and its count; the
 *      shared count; every count the WORKER's pools (poolBy + the free ones;
 *      shared + the free ones), never worked out; each door 44 x 44 or more,
 *      inside the band, nothing clipped, nothing to scroll, no text under
 *      11 px;
 *   2. Sword's page: its level 12 and XP (now / needed), DPS the headline
 *      (the game's own string), Damage, Attack speed, Crit chance, Range
 *      under it, "Attributes" with the Sword count, the six tiles; all in
 *      view at 390 x 844, 375 x 667, 844 x 390, 667 x 375 and on a
 *      computer, nothing clipped, no scroll, no text under 11 px; no
 *      effective-health number; Back goes to the hub;
 *   3. the specification's third acceptance task: "Find and tentatively spend
 *      a weapon point; see the impact; cancel without changing data; confirm
 *      through the existing flow. Repeat for shared points and check pool
 *      isolation": Power opens today's preview (stepper at 0, the lane tab
 *      naming Sword and its count), + shows the after rows, the ✕ cancels
 *      (the worker's record unchanged), + and Spend place it (the Sword pool
 *      down one, Bow's and Shared's unchanged); then Shared (v2.3.6686: the
 *      Shared page, Max HP leading, Defense beside it, the seven, no
 *      effective-health number), Max HP, + and Spend (the shared pool down
 *      one, the weapons' unchanged);
 *   7. (v2.3.6686, PR 2) the specification's second acceptance task: "Find
 *      the Sword DPS and explain where its damage comes from by navigating to
 *      details": DPS opens the stat tree's layer 0 (its number the page's,
 *      the tree's root the game's calcDisplayDps, every layer joining), then
 *      Damage a swing, Average hit, Least hit, Hit base: its reasons name
 *      their sources (the worn sword a door to its card); Back from the
 *      deepest returns layer by layer to the Sword page; each layer in the
 *      room at every size;
 *   4. `?ui2=0`: today's Bro, its pages; no hub.
 * v2.3.6783 (card UI3-combat; the owner, 2026-11-26: "Make the weapons
 * visually dominant, enlarge the level numbers and only show available points
 * prominently when there are points to spend"; "Eliminate the left-side
 * Attributes column, consolidate the combat statistics into one summary
 * strip, and give the six attributes a full-width three-by-two grid ... with
 * Bow and Staff following the identical template"): REWRITTEN where the one
 * template changed what is drawn -- 1b a count drawn only while > 0 (the
 * dealt Staff is 0: no count); 1e the hub's picture 44 px or more upright
 * (40 sideways) and its level 24 px; 2a DPS the kit's sunk stat and the four
 * facts in ONE container; 2b the full-width line ABOVE the six, gold, a "+"
 * on each; 2e Bow's page the same template, mark for mark; 2f Staff's page
 * at 0 points (the deal gives it none, and a weapon's points cannot all be
 * Spent: each attribute has its cap), the line muted, no "+"; 4a1 the
 * pictures at every size; 4b1-4b2 the fold by the page's own height (and at
 * the 168 px the master notes measured, the page held to it); 4f Bow's page
 * at 375 x 667 with its points.
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-combat-*.png.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');

/* the room's reading: every press and word of the page inside the band, its size, clipping, scroll, fonts */
function room(sel, pressSel) {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const root = document.querySelector(sel);
  if (!root) return null;
  const out = (r) => !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5);
  const presses = Array.from(root.querySelectorAll(pressSel)).map((e) => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-combat-door') || e.getAttribute('data-weapon-attr') || e.getAttribute('data-stat-tree-row') || e.getAttribute('data-shared-attr') || (e.hasAttribute('data-shared-hp') ? 'hp' : null) || (e.hasAttribute('data-weapon-dps') ? 'dps' : e.hasAttribute('data-weapon-allstats') ? 'allstats' : '?'), w: Math.round(r.width), h: Math.round(r.height), out: out(r) }; });
  const clipped = [];
  let minFont = 99;
  for (const e of root.querySelectorAll('span, b, button')) {
    if (!e.textContent.trim() || e.children.length) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1) continue;
    minFont = Math.min(minFont, parseFloat(cs.fontSize));
    if (e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible') clipped.push(e.textContent.trim().slice(0, 24));
    if (out(r)) clipped.push('out:' + e.textContent.trim().slice(0, 24));
  }
  let scroll = false;
  for (let el = root; el && el !== band; el = el.parentElement) if (el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible') { scroll = true; break; }
  const t = document.querySelector('[data-dash-title]');
  return { title: t ? t.getAttribute('data-dash-title') : null, presses, clipped, minFont, scroll, text: root.textContent };
}
const roomOk = (Q, n) => !!Q && Q.presses.length >= n && Q.presses.every((p) => p.w >= 44 && p.h >= 44 && !p.out) && Q.clipped.length === 0 && !Q.scroll && Q.minFont >= 11;
const roomBrief = (Q) => (Q ? { title: Q.title, presses: Q.presses.map((p) => `${p.id}:${p.w}x${p.h}${p.out ? ' out' : ''}`), clipped: Q.clipped, minFont: Q.minFont, scroll: Q.scroll } : null);
const HUB = ['[data-combat-hub]', '[data-combat-door]'];
const PAGE = ['[data-weapon-page]', '[data-weapon-attr], [data-weapon-dps], [data-weapon-allstats]'];
/* v2.3.6686: the stat tree's layer and the Shared page */
const TREE = ['[data-stat-tree]', '[data-stat-tree-row]'];
const SHARED = ['[data-shared-page]', '[data-shared-attr], [data-shared-hp]'];
const treeAt = (P) => P.page.evaluate(() => {
  const e = document.querySelector('[data-stat-tree]');
  const t = document.querySelector('[data-dash-title]');
  const q = window.__btStatTree;
  return e && {
    cat: e.getAttribute('data-stat-tree'), depth: +e.getAttribute('data-stat-tree-depth'), title: t ? t.getAttribute('data-dash-title') : null, head: t ? t.textContent.trim() : '',
    node: (e.querySelector('[data-stat-tree-node]') || { getAttribute: () => null }).getAttribute('data-stat-tree-node'),
    value: (e.querySelector('[data-stat-tree-node]') || { getAttribute: () => null }).getAttribute('data-stat-tree-value'),
    how: (e.querySelector('[data-stat-tree-how]') || {}).textContent || '',
    rows: Array.from(e.querySelectorAll('[data-stat-tree-row]')).map((r) => ({ id: r.getAttribute('data-stat-tree-row'), opens: r.hasAttribute('data-stat-tree-opens'), src: r.getAttribute('data-stat-tree-source'), text: r.textContent.trim(), btn: r.tagName === 'BUTTON' })),
    text: e.textContent, q: q ? { root: q.root, game: q.game, mismatches: q.mismatches, path: q.path } : null,
  };
});
const readRoom = (P, [a, b]) => P.page.evaluate(([x, y]) => window.__u2room(x, y), [a, b]);
async function plant(P) { await P.page.evaluate(`window.__u2room = ${room.toString()}`); }

/* the worker's pools as the phone holds them (the record the worker sent) */
const pools = (P) => H.readState(P, (S) => {
  const p = (S.rpg && S.rpg.prog3) || {};
  const by = p.poolBy || {};
  const free = Math.max(0, (p.pool || 0) - (by.sword || 0) - (by.bow || 0) - (by.staff || 0));
  const atk = p.atk || {};
  return { sword: (by.sword || 0) + free, bow: (by.bow || 0) + free, staff: (by.staff || 0) + free, shared: (p.shared || 0) + free, free,
    dmg: (atk.sword && atk.sword.dmg) || 0, hp: (p.alloc && p.alloc.hp) || 0, lv: p.sk ? [p.sk.sword.level, p.sk.bow.level, p.sk.staff.level] : null };
});
const hubDoors = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-combat-door]')).map((e) => {
  const c = e.querySelector('.u2-cb-pts');
  const img = e.querySelector('.u2-cb-art');
  const lv = e.querySelector('.u2-cb-lv');
  return { id: e.getAttribute('data-combat-door'), pts: e.getAttribute('data-combat-points'), lv: e.getAttribute('data-combat-lv'), text: e.textContent.trim(),
    /* v2.3.6783: the count as drawn (none at 0), its gold, the glow, the picture's size, the level's text size */
    drawn: c ? c.textContent.trim() : null, gold: !!(c && c.classList.contains('is-on')), glow: e.classList.contains('is-glow'),
    art: img ? Math.round(img.getBoundingClientRect().width) : 0, lvPx: lv ? parseFloat(getComputedStyle(lv).fontSize) : 0 };
}));
/* v2.3.6783: a weapon's (or Shared's) page as the one template draws it */
const pageMarks = (P) => P.page.evaluate(() => {
  const e = document.querySelector('[data-weapon-page], [data-shared-page]');
  if (!e) return null;
  const st = e.querySelector('[data-weapon-dps], [data-shared-hp]');
  const facts = Array.from(e.querySelectorAll('[data-weapon-stat], [data-shared-def]'));
  const boxes = new Set(facts.map((f) => f.closest('.u2-facts')));
  const line = e.querySelector('[data-weapon-pool], [data-shared-pool]');
  const grid = e.querySelector('.u2-at-grid');
  const lr = line ? line.getBoundingClientRect() : null;
  const gr = grid ? grid.getBoundingClientRect() : null;
  const v = line ? line.querySelector('.u2-at-line-v') : null;
  const lvRow = e.querySelector('[data-weapon-level]');
  const tiles = Array.from(e.querySelectorAll('[data-weapon-attr], [data-shared-attr]'));
  /* the template's shape: each element's classes in order (the numbers and words left out) */
  const sig = Array.from(e.querySelectorAll('*')).filter((x) => !x.classList.contains('u2-at-plus'))
    .map((x) => x.tagName + '.' + Array.from(x.classList).filter((c) => !/^is-(glow|gold|quiet)$/.test(c)).sort().join('.')).join(' ');
  return {
    statSunk: !!st && st.classList.contains('u2-stat') && !st.classList.contains('u2-raised'), statChev: !!(st && st.querySelector('.u2-chev')), statBtn: !!st && st.tagName === 'BUTTON',
    facts: facts.map((f) => f.getAttribute('data-weapon-stat') || 'def'), oneBox: boxes.size === 1 && !boxes.has(null), factFaces: facts.filter((f) => /u2-group|u2-raised/.test(f.className)).length,
    lineText: line ? line.textContent.trim() : '', lineGold: !!(v && v.classList.contains('is-gold')), lineQuiet: !!(v && v.classList.contains('is-quiet')),
    lineAbove: !!(lr && gr && lr.bottom <= gr.top + 0.5), lineFull: !!(lr && gr && lr.width >= gr.width - 2 && lr.left <= gr.left + 4),
    folded: e.getAttribute('data-weapon-fold') === '1', lineInLevel: !!(lvRow && line && lvRow.contains(line)),
    plus: tiles.filter((t) => t.querySelector('.u2-at-plus')).length, tiles: tiles.length, sig, h: Math.round(e.getBoundingClientRect().height),
  };
});

/* a finger on a phone, a click on a computer (its page has no touch) */
const tap = async (P, sel, ms = 700) => {
  const el = P.page.locator(sel).first();
  const touch = await P.page.evaluate(() => navigator.maxTouchPoints > 0).catch(() => false);
  if (touch) await el.tap({ timeout: 15000 }); else await el.click({ timeout: 15000 });
  await P.page.waitForTimeout(ms);
};
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  } catch (e) { /* no picture */ }
}
async function shot(P, file) { try { await P.page.screenshot({ path: path.join(SHOTS, file) }); } catch (e) { /* no picture */ } }
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  if (w) await plant(P);
  return !!w;
}
const popup = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-infopopup-card]');
  if (!c) return null;
  const lane = c.querySelector('[data-infopopup-lane][aria-pressed="true"]');
  return {
    title: (c.querySelector('[data-infopopup-title]') || {}).textContent || '',
    stepper: !!c.querySelector('[data-infopopup-stepper]'),
    count: +((c.querySelector('[data-infopopup-count]') || { getAttribute: () => -1 }).getAttribute('data-infopopup-count')),
    lane: lane ? lane.getAttribute('data-infopopup-lane') : null, laneText: lane ? lane.textContent.trim() : null,
    rows: Array.from(c.querySelectorAll('[data-infopopup-row]')).map((r) => r.textContent.trim()),
    spent: !!c.querySelector('[data-infopopup-spent]'),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Combathub', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'phone'))) return;
    const myId = await H.readState(P, (S) => S.myId);
    const a = await H.devOp(wsPort, 'combat', myId, { skill: 'sword', level: 12 }).catch(() => null);
    const b = await H.devOp(wsPort, 'combat', myId, { skill: 'bow', level: 5, deal: true }).catch(() => null);
    /* a sword in hand (a fresh character holds none: its DPS reads the game's "—"): the dev kit's, worn the way a player wears one */
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => null);
    let melee = null;
    for (let i = 0; i < 40 && !melee; i++) {
      melee = await H.readState(P, (S) => { const w = ((S.rpg && S.rpg.weaponStash) || []).find((x) => x && x.type && x.type !== 'bow' && x.type !== 'staff'); return w ? w.type : null; });
      if (!melee) await P.page.waitForTimeout(250);
    }
    if (melee) await H.equipWeapon(P, melee, 'weapon', 'melee');
    await P.page.waitForTimeout(1500);
    const W0 = await pools(P);
    rec.ok('0. the character seeded on the worker: Sword 12, Bow 5, Staff 1, points waiting in the Sword, Bow and Shared pools',
      !!(a && a.ok && b && b.ok) && W0.lv && W0.lv.join(',') === '12,5,1' && W0.sword > 0 && W0.bow > 0 && W0.shared > 0, { a, b, W0 });

    /* 1. the hub */
    await H.dashOpen(P, 'broCombat');
    await P.page.waitForTimeout(900);
    const D = await hubDoors(P);
    const by = Object.fromEntries(D.map((d) => [d.id, d]));
    rec.ok('1a. Combat is four doors: Sword, Bow, Staff, then Shared Attributes', D.map((d) => d.id).join(',') === 'sword,bow,staff,shared'
      && /^Sword/.test(by.sword.text) && /^Bow/.test(by.bow.text) && /^Staff/.test(by.staff.text) && /^Shared Attributes/.test(by.shared.text), D);
    /* v2.3.6783: a count DRAWN only while > 0, in gold; at 0 nothing drawn (the dealt Staff: no points of its own, none free) */
    const shownOk = (d, n) => (n > 0 ? d.drawn === n + ' points' && d.gold && d.glow : d.drawn === null && !d.glow && !/\bpoints?\b/.test(d.text));
    rec.ok('1b. each count is the worker\'s pool, drawn ("n points", gold) only while > 0; each weapon its level', +by.sword.pts === W0.sword && +by.bow.pts === W0.bow && +by.staff.pts === W0.staff && +by.shared.pts === W0.shared
      && by.sword.lv === '12' && by.bow.lv === '5' && by.staff.lv === '1' && W0.sword > 0 && W0.bow > 0 && W0.shared > 0
      && ['sword', 'bow', 'staff', 'shared'].every((c) => shownOk(by[c], W0[c])), { D, W0 });
    rec.ok('1b0. the dealt Staff has no points: its door draws no count, its data says 0', W0.staff === 0 && by.staff.pts === '0' && by.staff.drawn === null, by.staff);
    const Hb = await readRoom(P, HUB);
    rec.ok('1c. 390 x 844: every door 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', Hb && Hb.title === 'broCombat' && roomOk(Hb, 4), roomBrief(Hb));
    rec.ok('1d. no effective-health number on the hub', !!Hb && !/effective health|\bEHP\b/i.test(Hb.text), Hb && Hb.text.slice(0, 120));
    rec.ok('1e. 390 x 844: each weapon\'s picture 44 px or more (32 before), its level 24 px', ['sword', 'bow', 'staff'].every((c) => by[c].art >= 44 && by[c].lvPx === 24), D.map((d) => `${d.id}:${d.art}px lv ${d.lvPx}px`));
    await bandShot(P, 'ui2-combat-hub.png');

    /* 2. Sword's page */
    await tap(P, '[data-combat-door="sword"]', 900);
    const S1 = await P.page.evaluate(() => {
      const e = document.querySelector('[data-weapon-page]');
      const lv = document.querySelector('[data-weapon-level]');
      return e && {
        cat: e.getAttribute('data-weapon-page'), lv: lv && lv.getAttribute('data-weapon-level'), xp: lv && lv.getAttribute('data-weapon-xp'), xpText: lv && lv.textContent,
        dps: (document.querySelector('[data-weapon-dps]') || { getAttribute: () => null }).getAttribute('data-weapon-dps'),
        support: Array.from(document.querySelectorAll('[data-weapon-stat]')).map((s) => s.getAttribute('data-weapon-stat')),
        attrs: Array.from(document.querySelectorAll('[data-weapon-attr]')).map((s) => s.getAttribute('data-weapon-attr')),
        pool: (document.querySelector('[data-weapon-pool]') || { getAttribute: () => null }).getAttribute('data-weapon-pool'),
        poolText: (document.querySelector('[data-weapon-pool]') || {}).textContent || '',
        q: window.__btWeaponPage,
        head: (document.querySelector('[data-dash-title]') || {}).textContent || '',
      };
    });
    rec.ok('2a. Sword\'s page (its header "Sword"): level 12 and its XP (now / needed), DPS the headline, Damage, Attack speed, Crit chance, Range (no Element), the six attributes',
      !!S1 && S1.cat === 'sword' && S1.head.trim() === 'Sword' && S1.lv === '12' && /^\d+\/\d+$/.test(S1.xp || '') && (S1.xpText || '').includes(S1.xp.replace('/', ' / ') + ' XP')
      && /^\d+(\.\d+)?$/.test(S1.dps || '') && S1.support.join(',') === 'damage,aspd,crit,range' && S1.attrs.join(',') === 'range,dmg,aspd,luck,special,elem', S1);
    const M1 = await pageMarks(P);
    rec.ok('2a1. DPS the kit\'s stat (sunk, not raised; a button with its chevron); Damage, Attack speed, Crit chance, Range facts in ONE container, none a box of its own',
      !!M1 && M1.statSunk && M1.statBtn && M1.statChev && M1.facts.join(',') === 'damage,aspd,crit,range' && M1.oneBox && M1.factFaces === 0, M1 && { ...M1, sig: undefined });
    rec.ok('2b. the full-width line ABOVE the six: "Attributes", the worker\'s count "N Sword points to spend" in gold; each of the six with its "+"',
      !!S1 && +S1.pool === W0.sword && S1.poolText.includes(W0.sword + ' Sword points to spend') && !!M1 && M1.lineAbove && M1.lineFull && M1.lineGold && /^Attributes/.test(M1.lineText)
      && M1.tiles === 6 && M1.plus === 6 && !M1.folded, S1 && { pool: S1.pool, text: S1.poolText, want: W0.sword, line: M1 && { above: M1.lineAbove, full: M1.lineFull, gold: M1.lineGold, plus: M1.plus } });
    const Wp = await readRoom(P, PAGE);
    rec.ok('2c. 390 x 844: level, DPS and the six in view; every press 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', Wp && Wp.title === 'broSword' && roomOk(Wp, 7), { ...roomBrief(Wp), h: M1 && M1.h });
    rec.ok('2d. no effective-health number on the page, and no storage bound (999) shown as a cap', !!Wp && !/effective health|\bEHP\b/i.test(Wp.text) && !/\/ ?999/.test(Wp.text));
    await bandShot(P, 'ui2-combat-sword.png');
    /* 2e. (v2.3.6783) Bow's page: the one template, mark for mark */
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    await tap(P, '[data-combat-door="bow"]', 900);
    const Mb = await pageMarks(P);
    const Bt = await P.page.evaluate(() => (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'));
    rec.ok('2e. Bow\'s page is the same template: the same marks in the same order, its line gold with "N Bow points to spend", its six each a "+"',
      Bt === 'broBow' && !!Mb && Mb.sig === M1.sig && Mb.lineGold && Mb.lineText.includes(W0.bow + ' Bow points to spend') && Mb.plus === 6, Mb && { title: Bt, same: Mb.sig === M1.sig, line: Mb.lineText, plus: Mb.plus });
    await bandShot(P, 'ui2-combat-bow.png');
    /* 2f. the dealt Staff has no points (none of its own, none free): the same template, the line muted, no "+" */
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    await tap(P, '[data-combat-door="staff"]', 900);
    const Mt = await pageMarks(P);
    rec.ok('2f. Staff\'s page at 0 points: the same template, its line "0 Staff points to spend" muted, no attribute wears a "+"',
      W0.staff === 0 && !!Mt && Mt.sig === M1.sig && Mt.lineQuiet && !Mt.lineGold && Mt.lineText.includes('0 Staff points to spend') && Mt.plus === 0 && Mt.tiles === 6,
      Mt && { same: Mt.sig === M1.sig, line: Mt.lineText, quiet: Mt.lineQuiet, plus: Mt.plus });
    await bandShot(P, 'ui2-combat-staff-nopoints.png');
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    await tap(P, '[data-combat-door="sword"]', 900);

    /* 3. the acceptance task: a weapon point, tentatively; cancel; confirm; pool isolation */
    await tap(P, '[data-weapon-attr="dmg"]', 900);
    const Q0 = await popup(P);
    rec.ok('3a. Power opens today\'s preview: the stepper at 0, the lane tab naming Sword and its count', !!Q0 && Q0.stepper && Q0.count === 0 && Q0.lane === 'sword' && (Q0.laneText || '').includes(String(W0.sword)), Q0);
    await tap(P, '[data-infopopup-card] [data-infopopup-step="up"]', 600);
    const Q1 = await popup(P);
    rec.ok('3b. + shows the impact: the count 1 and the before and after rows', !!Q1 && Q1.count === 1 && Q1.rows.length >= 2, Q1);
    await shot(P, 'ui2-combat-preview.png');
    await tap(P, '[data-infopopup-card] [data-infopopup-x]', 1500);
    const W1 = await pools(P);
    rec.ok('3c. the ✕ cancels: the window shut, the worker\'s record unchanged', !(await popup(P)) && W1.sword === W0.sword && W1.dmg === W0.dmg && W1.shared === W0.shared, { W0, W1 });
    await tap(P, '[data-weapon-attr="dmg"]', 900);
    await tap(P, '[data-infopopup-card] [data-infopopup-step="up"]', 500);
    await tap(P, '[data-infopopup-card] [data-infopopup-action]', 2500);
    const W2 = await pools(P);
    const Q2 = await popup(P);
    rec.ok('3d. Spend through the existing flow: Power +1, the Sword pool down one; Bow\'s and Shared\'s unchanged (the pools isolated)',
      /* the worker draws the named weapon's own points first (server/src/prog3.js _handleProg3Allocate) */
      W2.dmg === W0.dmg + 1 && W2.sword === W0.sword - 1 && W2.bow === W0.bow && W2.staff === W0.staff && W2.shared === W0.shared,
      { W0, W2 });
    rec.ok('3e. the window stays after Spend and says what was spent', !!Q2 && Q2.spent, Q2);
    const S2 = await P.page.evaluate(() => (document.querySelector('[data-weapon-pool]') || { getAttribute: () => null }).getAttribute('data-weapon-pool'));
    await tap(P, '[data-infopopup-card] [data-infopopup-x]', 700);
    rec.ok('3f. the page shows the worker\'s count after its word', +S2 === W2.sword, { page: S2, worker: W2.sword });
    /* 7. (v2.3.6686) the second acceptance task: the Sword DPS, down to where its damage comes from */
    const dpsShown = await P.page.evaluate(() => (document.querySelector('[data-weapon-dps]') || { getAttribute: () => null }).getAttribute('data-weapon-dps'));
    await tap(P, '[data-weapon-dps]', 900);
    const L0 = await treeAt(P);
    rec.ok('7a. DPS opens the stat tree (its header "DPS"): "Sword DPS", the page\'s number, its rows Damage a swing and Seconds a swing (each opens) and the display scale (a rule)',
      !!L0 && L0.cat === 'sword' && L0.depth === 0 && L0.title === 'broTree0' && L0.head === 'DPS' && L0.node === 'dps' && L0.value === dpsShown && /Sword DPS/.test(L0.text)
      && L0.rows.map((r) => r.id + (r.opens ? '>' : '')).join(',') === 'perSwing>,secs>,scale' && L0.rows[2].src === 'base' && /÷/.test(L0.how), L0);
    rec.ok('7b. the tree is the game\'s own number: its root is calcDisplayDps to the last bit and every layer joins (no Element row)',
      !!L0 && L0.q && L0.q.root === L0.q.game && L0.q.mismatches === 0 && !/element/i.test(L0.text), L0 && L0.q);
    const Rt = await readRoom(P, TREE);
    rec.ok('7c. 390 x 844: the layer in the room: every row 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', Rt && roomOk(Rt, 3), roomBrief(Rt));
    await bandShot(P, 'ui2-combat-tree.png');
    const walk = ['perSwing', 'avg', 'least', 'hitBase'];
    const seen = [];
    for (const id of walk) { await tap(P, `[data-stat-tree-row="${id}"]`, 800); const L = await treeAt(P); seen.push(L && (L.depth + ':' + L.node + ':' + L.title)); }
    rec.ok('7d. Damage a swing, Average hit, Least hit, Hit base: one layer a page, each deeper', seen.join(',') === '1:perSwing:broTree1,2:avg:broTree2,3:least:broTree3,4:hitBase:broTree4', seen);
    const L4 = await treeAt(P);
    const by4 = Object.create(null);
    for (const r of (L4 && L4.rows) || []) by4[r.id] = r;
    rec.ok('7e. the hit base\'s reasons name their sources: the worn sword (a door), the Sword level, the Power points, the weapon\'s tier and grade',
      !!L4 && L4.rows.map((r) => r.id).join(',') === 'weaponBase,levelDmg,power,tier,grade' && by4.weaponBase.src === 'item' && by4.weaponBase.btn
      && by4.levelDmg.src === 'level' && /Sword level 12/.test(by4.levelDmg.text) && by4.power.src === 'points' && /\d+ Power points?/.test(by4.power.text)
      && by4.tier.src === 'item' && /×/.test(L4.how), L4 && L4.rows);
    const Rd = await readRoom(P, TREE);
    rec.ok('7f. 390 x 844: the deepest layer in the room (five rows), nothing clipped, no scroll, no text under 11 px', Rd && roomOk(Rd, 5), roomBrief(Rd));
    await bandShot(P, 'ui2-combat-tree-hitbase.png');
    await tap(P, '[data-stat-tree-row="weaponBase"]', 900);
    const card = await P.page.evaluate(() => !!document.querySelector('[data-item-card]'));
    rec.ok('7g. the worn sword\'s row opens that item\'s card', card, card);
    await P.page.keyboard.press('Escape').catch(() => {});
    await P.page.evaluate(() => { try { window._itemDetailBus.close(); } catch (e) { /* none */ } });
    await P.page.waitForTimeout(500);
    const back = [];
    for (let i = 0; i < 5; i++) {
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
      back.push(await P.page.evaluate(() => (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title')));
    }
    rec.ok('7h. Back from the deepest layer returns layer by layer to the Sword page', back.join(',') === 'broTree3,broTree2,broTree1,broTree0,broSword', back);

    /* Back to the hub; Shared: the Shared page (v2.3.6686), Max HP */
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    const T1 = await P.page.evaluate(() => (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'));
    rec.ok('3g. Back from a weapon\'s page returns to the hub', T1 === 'broCombat', T1);
    await tap(P, '[data-combat-door="shared"]', 1200);
    const Sh = await P.page.evaluate(() => {
      const e = document.querySelector('[data-shared-page]');
      const t = document.querySelector('[data-dash-title]');
      const sum = e && e.querySelector('.u2-at-strip');
      return e && {
        title: t ? t.getAttribute('data-dash-title') : null, head: t ? t.textContent.trim() : '',
        first: sum && sum.firstElementChild ? (sum.firstElementChild.hasAttribute('data-shared-hp') ? 'hp' : 'other') : null,
        hp: (e.querySelector('[data-shared-hp]') || { getAttribute: () => null }).getAttribute('data-shared-hp'),
        def: (e.querySelector('[data-shared-def]') || { getAttribute: () => null }).getAttribute('data-shared-def'),
        pool: (e.querySelector('[data-shared-pool]') || { getAttribute: () => null }).getAttribute('data-shared-pool'),
        attrs: Array.from(e.querySelectorAll('[data-shared-attr]')).map((x) => x.getAttribute('data-shared-attr')),
        text: e.textContent,
      };
    });
    rec.ok('3h0. Shared opens the Shared page: Max HP leading, Defense beside it, the shared count, the seven; no effective-health number',
      !!Sh && Sh.title === 'broShared' && Sh.head === 'Shared Attributes' && Sh.first === 'hp' && /^\d+$/.test(Sh.hp || '') && /%$/.test(Sh.def || '') && +Sh.pool === W2.shared
      && Sh.attrs.join(',') === 'hp,def,mana,stam,dodge,move,eres' && Sh.text.includes(W2.shared + ' shared points to spend') && !/effective health|\bEHP\b/i.test(Sh.text), Sh);
    const Rs = await readRoom(P, SHARED);
    rec.ok('3h1. 390 x 844: the Shared page in the room: Max HP and the seven, 44 x 44 or more, nothing clipped, no scroll, no text under 11 px', Rs && roomOk(Rs, 8), roomBrief(Rs));
    const Ms = await pageMarks(P);
    rec.ok('3h2. Shared in the same form: Max HP the sunk stat, Defense a fact in its container, the line above the seven in gold, each with its "+"',
      !!Ms && Ms.statSunk && Ms.statChev && Ms.facts.join(',') === 'def' && Ms.oneBox && Ms.factFaces === 0 && Ms.lineAbove && Ms.lineFull && Ms.lineGold && Ms.tiles === 7 && Ms.plus === 7, Ms && { ...Ms, sig: undefined });
    await bandShot(P, 'ui2-combat-shared.png');
    await tap(P, '[data-shared-attr="hp"]', 900);
    const Q3 = await popup(P);
    rec.ok('3h. Shared: Max HP opens the same preview, its lane the shared pool', !!Q3 && Q3.stepper && Q3.lane === 'shared' && (Q3.laneText || '').includes(String(W2.shared)), Q3);
    await tap(P, '[data-infopopup-card] [data-infopopup-step="up"]', 500);
    await tap(P, '[data-infopopup-card] [data-infopopup-action]', 2500);
    const W3 = await pools(P);
    rec.ok('3i. a shared point placed: Max HP +1, the shared pool down one; the weapons\' unchanged (isolated)',
      W3.hp === W2.hp + 1 && W3.shared === W2.shared - 1 && W3.sword === W2.sword && W3.bow === W2.bow && W3.staff === W2.staff, { W2, W3 });
    await tap(P, '[data-infopopup-card] [data-infopopup-x]', 700);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);

    /* the other shapes: the hub and Sword's page */
    for (const s of [{ w: 375, h: 667, tag: '375x667' }, { w: 844, h: 390, tag: '844x390' }, { w: 667, h: 375, tag: '667x375' }]) {
      await P.page.setViewportSize({ width: s.w, height: s.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'broCombat');
      await P.page.waitForTimeout(900);
      const Hs = await readRoom(P, HUB);
      rec.ok(`4a. ${s.tag}: the hub's four doors, each 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px`, Hs && roomOk(Hs, 4), roomBrief(Hs));
      const Ds = await hubDoors(P);
      const want = s.h > s.w ? 44 : 40;
      rec.ok(`4a1. ${s.tag}: each weapon's picture ${want} px or more`, Ds.filter((d) => d.id !== 'shared').every((d) => d.art >= want), Ds.map((d) => `${d.id}:${d.art}px lv ${d.lvPx}px`));
      await bandShot(P, `ui2-combat-hub-${s.tag}.png`);
      await tap(P, '[data-combat-door="sword"]', 900);
      const Ws = await readRoom(P, PAGE);
      rec.ok(`4b. ${s.tag}: Sword's page: level, DPS and the six in view, every press 44 x 44 or more, nothing clipped, no scroll, no text under 11 px`, Ws && Ws.title === 'broSword' && roomOk(Ws, 7), roomBrief(Ws));
      await bandShot(P, `ui2-combat-sword-${s.tag}.png`);
      if (s.tag === '375x667') {
        /* v2.3.6783: 375 x 667 (168 px) cannot hold the four bands: the line folds onto the level row */
        const Mf = await pageMarks(P);
        rec.ok('4b1. 375 x 667: the fold follows the page\'s own height (under 172 px the line folds onto the level row; at 172 or more the four bands)',
          !!Mf && Mf.h > 0 && Mf.folded === (Mf.h < 172) && (Mf.folded ? Mf.lineInLevel : Mf.lineAbove && !Mf.lineInLevel) && Mf.lineText.includes('Sword points to spend'), Mf && { h: Mf.h, folded: Mf.folded, inLevel: Mf.lineInLevel, line: Mf.lineText });
        /* the fold itself, at the 168 px the master notes measured for 375 x 667: the page held to that height */
        await P.page.evaluate(() => { const e = document.querySelector('[data-weapon-page]'); if (e) e.style.height = '168px'; });
        await P.page.waitForTimeout(900);
        const Ff = await readRoom(P, PAGE);
        const Mh = await pageMarks(P);
        rec.ok('4b2. a page of 168 px (375 x 667 as the master notes measured it): the line on the level row\'s right end, its words whole, nothing clipped, no scroll, no text under 11 px',
          !!Mh && Mh.h === 168 && Mh.folded && Mh.lineInLevel && Mh.lineText.includes('Sword points to spend') && Ff && roomOk(Ff, 7), { h: Mh && Mh.h, folded: Mh && Mh.folded, line: Mh && Mh.lineText, room: roomBrief(Ff) });
        await bandShot(P, 'ui2-combat-sword-fold-168.png');
        await P.page.evaluate(() => { const e = document.querySelector('[data-weapon-page]'); if (e) e.style.height = ''; });
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
        await tap(P, '[data-combat-door="bow"]', 900);
        const Wf = await readRoom(P, PAGE);
        const Mg = await pageMarks(P);
        rec.ok('4f. 375 x 667: Bow\'s page with its points: the line gold, the six each a "+", nothing clipped, no scroll, no text under 11 px',
          Wf && Wf.title === 'broBow' && roomOk(Wf, 7) && !!Mg && Mg.lineGold && Mg.plus === 6, { room: roomBrief(Wf), h: Mg && Mg.h, line: Mg && Mg.lineText, plus: Mg && Mg.plus });
        await bandShot(P, 'ui2-combat-bow-375x667.png');
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
        await tap(P, '[data-combat-door="sword"]', 900);
      }
      /* v2.3.6686: the tree's first and deepest layers, and the Shared page, at this size */
      await tap(P, '[data-weapon-dps]', 900);
      const T0 = await readRoom(P, TREE);
      rec.ok(`4c. ${s.tag}: the stat tree's first layer in the room, nothing clipped, no scroll, no text under 11 px`, T0 && T0.title === 'broTree0' && roomOk(T0, 3), roomBrief(T0));
      await bandShot(P, `ui2-combat-tree-${s.tag}.png`);
      for (const id of ['perSwing', 'avg', 'least', 'hitBase']) await tap(P, `[data-stat-tree-row="${id}"]`, 700);
      const T4 = await readRoom(P, TREE);
      rec.ok(`4d. ${s.tag}: the hit base's five reasons in the room, nothing clipped, no scroll, no text under 11 px`, T4 && T4.title === 'broTree4' && roomOk(T4, 5), roomBrief(T4));
      for (let i = 0; i < 6; i++) await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 500);
      await tap(P, '[data-combat-door="shared"]', 900);
      const Ss = await readRoom(P, SHARED);
      rec.ok(`4e. ${s.tag}: the Shared page in the room: Max HP and the seven, nothing clipped, no scroll, no text under 11 px`, Ss && Ss.title === 'broShared' && roomOk(Ss, 8), roomBrief(Ss));
      await bandShot(P, `ui2-combat-shared-${s.tag}.png`);
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }
  /* a computer */
  const C = await H.newPlayer(browser, { name: 'Combatdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (await inWorld(C, rec, 'computer')) {
      await H.dashOpen(C, 'broCombat');
      await C.page.waitForTimeout(900);
      const Hc = await readRoom(C, HUB);
      rec.ok('5a. a computer: the hub\'s four doors, nothing clipped, no scroll', Hc && roomOk(Hc, 4), roomBrief(Hc));
      await bandShot(C, 'ui2-combat-hub-computer.png');
      await tap(C, '[data-combat-door="bow"]', 900);
      const Wc = await readRoom(C, PAGE);
      rec.ok('5b. a computer: Bow\'s page, nothing clipped, no scroll', Wc && Wc.title === 'broBow' && roomOk(Wc, 7), roomBrief(Wc));
      await bandShot(C, 'ui2-combat-bow-computer.png');
      /* v2.3.6686: the tree's first layer and the Shared page on a computer */
      await tap(C, '[data-weapon-dps]', 900);
      const Tc = await readRoom(C, TREE);
      /* a fresh character holds no bow: the layer says so plainly, nothing invented */
      const none = await C.page.evaluate(() => (document.querySelector('[data-stat-tree-none]') || {}).textContent || '');
      rec.ok('5c. a computer, no bow in hand: the Bow DPS tree says "No Bow in hand", no rows, nothing clipped, no scroll', Tc && Tc.title === 'broTree0' && /No Bow in hand/.test(none)
        && Tc.presses.length === 0 && Tc.clipped.length === 0 && !Tc.scroll, { none, room: roomBrief(Tc) });
      await bandShot(C, 'ui2-combat-tree-computer.png');
      await tap(C, '[data-dash-frame] [data-dash-ctl="back"]', 600);
      await tap(C, '[data-dash-frame] [data-dash-ctl="back"]', 600);
      await tap(C, '[data-combat-door="shared"]', 900);
      const Sc = await readRoom(C, SHARED);
      rec.ok('5d. a computer: the Shared page, nothing clipped, no scroll', Sc && Sc.title === 'broShared' && roomOk(Sc, 8), roomBrief(Sc));
      await bandShot(C, 'ui2-combat-shared-computer.png');
    }
  } finally {
    await C.ctx.close().catch(() => {});
  }
  /* ?ui2=0: today's Bro and its Combat page, no hub */
  const O = await H.newPlayer(browser, { name: 'Combatold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  try {
    if (await inWorld(O, rec, 'ui2=0')) {
      await H.dashOpen(O, 'hero');
      await O.page.waitForTimeout(900);
      const M = await O.page.evaluate(() => ({ pages: !!document.querySelector('[data-bro-card="pages"]'), hub: !!document.querySelector('[data-combat-hub], [data-weapon-page]') }));
      rec.ok('6. ?ui2=0: today\'s Bro (its pages, its Combat page), no hub', M.pages && !M.hub, M);
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
