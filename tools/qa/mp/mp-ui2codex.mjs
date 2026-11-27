/* ═══ THE CODEX UNDER THE NEW DASHBOARD (v2.3.6693, card UI2-codex, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 8 and Q73-Q75: a complete
 * encyclopedia of illustrated cards; a monster's first screen its moving
 * sprite, its level and element and its essentials, with doors that
 * summarise what is behind them; a drop a plain row with its exact chance,
 * opening the one item page.  Its eighth task: "Open the same item via Gear,
 * another player's equipment and Codex; verify consistent facts and
 * contextual actions".
 *
 * A real phone (upright, touch, deviceScaleFactor 2) against a real worker, in
 * the world's BroTown, every kind's kills seeded but the Earth Forest's slime
 * (dewdrop: left unmet):
 *   1. the Menu's Codex door: the kinds (Monsters chosen), nine cards, the
 *      unmet one a shape ("???", "Not met yet"), the met ones named with
 *      their kills;
 *   2. an empty kind (Items) says its honest line; Pets' door opens the pets page;
 *   3. a showcase (the Mummy): its idle strip in, four doors each with its
 *      summary, the essentials, no health or damage number; Back to the
 *      collection at the same card; the unmet one's page: locked, no doors;
 *   4. Loot: rows, ONE chance each, no dice and no bar; the roll's words;
 *   5. the eighth task as far as the game has the doors: the Iron Great Sword
 *      from Loot (the one item page, "In the Codex", no action, Drops from,
 *      Found from) and a greatsword from a seeded bag (the same kind and the
 *      same reader's name, Equip); Back to Loot at the row;
 *   6. the NEW MONSTER card lands on its showcase;
 *   7. Combat's stage plays its special for every met kind, inside its frame;
 *   8. left by Back and by Close: no stage, every baked picture revoked
 *      (mp-codex's own counter, BLOB_INIT);
 *   9. 375 x 667, 844 x 390 (sideways) and a computer (1280 x 800, `wide`):
 *      the collection and a showcase fit, nothing under 44 px or 11 px;
 *  10. `?ui2=0` gives today's Codex (data-cx-grid); no page errors.
 * Pictures: docs/shots/ui2-codex-*.png (the band, at deviceScaleFactor 2).
 */
import path from 'node:path';
import * as H from './harness.mjs';
import { codexDropsFor } from '../../../src/data/codexDrops.js';

export const lane = 'full';

const SHOTS = path.join(H.REPO, 'docs', 'shots');
const PHONE = { width: 390, height: 844 };
const KINDS = ['snowling', 'gobling', 'mumling', 'pebbling', 'sparklet', 'finling', 'wisplet', 'lurkling', 'dewdrop'];
const UNMET = 'dewdrop';

const BLOB_INIT = () => {
  const made = new Set();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (o) { const u = c(o); try { made.add(u); } catch (e) { /* count only */ } return u; };
  URL.revokeObjectURL = function (u) { try { made.delete(u); } catch (e) { /* count only */ } return r(u); };
  window.__qaBlobs = () => made.size;
};

async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
/* a page grows into place (dashGrow, `data-dash-grow` until its animation's end): read it after (TRAPS §200) */
const settle = (P) => H.waitFor(P, () => !document.querySelector('[data-dash-grow]'), (v) => v === true, { timeout: 15000, label: 'the growing motion ends' }).catch(() => null);
const tap = async (P, sel, ms = 700) => { await P.page.locator(sel).first().click({ timeout: 15000 }); await P.page.waitForTimeout(ms); await settle(P); };
const back = (P) => tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);

/* what is up: the header, the page box, and what the Codex draws in it */
function look() {
  const txt = (el) => (el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const box = document.querySelector('[data-band-box="page"]');
  const B = box ? box.getBoundingClientRect() : null;
  const root = document.querySelector('[data-codex-root], [data-codex-show], [data-codex-loot], [data-codex-combat], [data-codex-habitat], [data-codex-story], [data-codex-found], [data-item-page]');
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
      if (r.width > 0 && (r.width < 43.5 || r.height < 43.5)) small.push((b.getAttribute('data-cx-card') || b.getAttribute('data-u2-shelf') || b.getAttribute('data-cx-door') || b.getAttribute('data-cx-drop') || b.className).slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  /* a card's words inside the card itself (a card squeezed to the touch size cut them off within its own face) */
  const inCard = (c) => { const R = c.getBoundingClientRect(); return Array.from(c.querySelectorAll('.u2-cc-name, .u2-cc-sub, .u2-cc-line')).every((w) => { const r = w.getBoundingClientRect(); return r.height > 0 && r.top >= R.top - 0.5 && r.bottom <= R.bottom + 0.5 && r.left >= R.left - 0.5 && r.right <= R.right + 0.5; }); };
  const card = (c) => ({ kind: c.getAttribute('data-cx-card'), known: c.getAttribute('data-cx-known') === '1', text: txt(c), whole: inCard(c) });
  return {
    title: txt(document.querySelector('[data-dash-frame] [data-u2="title"]')),
    back: txt(document.querySelector('[data-dash-frame] [data-dash-ctl="back"]')),
    root: root ? Array.from(root.attributes).map((a) => a.name).filter((n) => /^data-(codex|item-page)/.test(n)).join(' ') : null,
    shelf: (document.querySelector('[data-codex-root]') || { getAttribute: () => null }).getAttribute('data-codex-root'),
    shelves: Array.from(document.querySelectorAll('[data-u2-shelf]')).map((s) => s.getAttribute('data-u2-shelf')),
    cards: Array.from(document.querySelectorAll('[data-codex-root] [data-cx-card]')).map(card),
    empty: txt(document.querySelector('[data-codex-empty]')),
    doors: Array.from(document.querySelectorAll('[data-codex-show] [data-cx-door]')).map((d) => ({ id: d.getAttribute('data-cx-door'), text: txt(d) })),
    facts: Array.from(document.querySelectorAll('[data-codex-show] [data-u2-show-fact]')).map((f) => txt(f)),
    idle: (() => { const i = document.querySelector('[data-cx-idle]'); return i ? { kind: i.getAttribute('data-cx-idle'), ready: i.getAttribute('data-cx-ready') === '1', strip: !!i.querySelector('.bt-cx-strip') } : null; })(),
    locked: !!document.querySelector('[data-codex-show] [data-u2-empty="locked"]'),
    showText: txt(document.querySelector('[data-codex-show]')),
    rows: Array.from(document.querySelectorAll('[data-codex-loot] [data-cx-drop]')).map((r) => ({ id: r.getAttribute('data-cx-drop'), chance: r.getAttribute('data-cx-chance'), text: txt(r), sel: r.getAttribute('aria-current') === 'true' })),
    roll: txt(document.querySelector('[data-cx-roll]')),
    lootText: txt(document.querySelector('[data-codex-loot]')),
    dice: !!document.querySelector('[data-codex-loot] img[src*="bldg-gamble"], [data-codex-loot] [data-cx-bar], [data-codex-loot] [data-cx-roll-range]'),
    item: (() => { const p = document.querySelector('[data-item-page]'); if (!p) return null; return { place: p.getAttribute('data-item-place'), name: txt(p.querySelector('[data-item-name]')), where: txt(p.querySelector('[data-item-where]')), acts: (p.querySelector('[data-item-actions]') || { getAttribute: () => '' }).getAttribute('data-item-actions'), facts: Array.from(p.querySelectorAll('[data-item-fact]')).map((f) => txt(f)), doors: Array.from(p.querySelectorAll('[data-item-door]')).map((d) => d.getAttribute('data-item-door')) }; })(),
    found: Array.from(document.querySelectorAll('[data-codex-found] [data-cx-source]')).map((s) => txt(s)),
    stage: !!document.querySelector('[data-cx-stage]'),
    oldGrid: !!document.querySelector('[data-cx-grid]'),
    blobs: window.__qaBlobs ? window.__qaBlobs() : null,
    minFont, clipped, small,
  };
}
const L = (P) => P.page.evaluate(look);
const fits = (v) => v.clipped.length === 0 && v.small.length === 0 && v.minFont >= 11 && v.cards.every((c) => c.whole);
const fitWhy = (v) => ({ clipped: v.clipped, small: v.small, minFont: v.minFont, root: v.root, cut: v.cards.filter((c) => !c.whole).map((c) => c.kind) });

async function seed(P, wsPort) {
  const me = await H.readState(P, (S) => S.myId);
  for (const k of KINDS) if (k !== UNMET) await H.devOp(wsPort, 'codex', me, { kind: k, n: 3, n2: 0 }).catch(() => null);
  await H.waitFor(P, (S) => (S._codex && S._codex.k ? Object.keys(S._codex.k).length : 0), (v) => v >= 8, { timeout: 10000, label: 'the kills counted' }).catch(() => null);
  return me;
}
async function openCodex(P) {
  await H.dashOpen(P, 'encyclopedia').catch(() => null);
  await P.page.waitForSelector('[data-codex-root]', { timeout: 10000 }).catch(() => null);
  await P.page.waitForTimeout(500);
  await settle(P);
}
async function openShowcase(P, kind) {
  await tap(P, `[data-codex-root] [data-cx-card="${kind}"]`, 600);
  await P.page.waitForSelector(`[data-codex-show="${kind}"]`, { timeout: 15000 }).catch(() => null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Codexbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', init: '(' + BLOB_INIT.toString() + ')();' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await seed(P, wsPort);
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => null);
    await P.page.waitForTimeout(1500);
    const blobs0 = await P.page.evaluate(() => (window.__qaBlobs ? window.__qaBlobs() : null));
    /* the Mummy's drops on this worker (its one roll and its shard cracking, by its caps) */
    const caps = await H.readState(P, (S) => ({ shared: !!(S._serverCaps && S._serverCaps.killroll), crack: !!(S._serverCaps && S._serverCaps.shardcrack) }));
    const NDROPS = (codexDropsFor('mumling', caps) || []).length;

    /* ── 1 ── */
    await openCodex(P);
    const v1 = await L(P);
    const unmet = v1.cards.find((c) => c.kind === UNMET);
    const met = v1.cards.filter((c) => c.known);
    rec.ok(`1. the Codex door: the kinds (${v1.shelves.join(', ')}), Monsters chosen, nine cards (${met.length} met), header "${v1.title}"`,
      v1.shelf === 'monsters' && ['monsters', 'items', 'resources', 'townsfolk', 'lands', 'pets'].every((s) => v1.shelves.includes(s)) && v1.cards.length === 9 && met.length === 8 && v1.title === 'Codex', v1);
    rec.ok(`1b. the unmet one a shape: "${unmet && unmet.text}"; a met one named with its kills: "${met[2] && met[2].text}"`,
      !!unmet && !unmet.known && /\?\?\?/.test(unmet.text) && /Not met yet/.test(unmet.text) && !/Slime/i.test(unmet.text) && met.every((c) => /3 defeated/.test(c.text) && !/\?\?\?/.test(c.text)), v1.cards);
    rec.ok('1c. the collection fits the band (nothing out, no press under 44 px, no word under 11 px)', fits(v1), fitWhy(v1));
    await bandShot(P, 'ui2-codex-collection.png');

    /* ── 2 ── */
    await tap(P, '[data-u2-shelf="items"]', 500);
    const v2 = await L(P);
    rec.ok(`2. an empty kind says so: "${v2.empty}"`, v2.shelf === 'items' && /Not in the Codex yet/.test(v2.empty) && v2.cards.length === 0, v2);
    await tap(P, '[data-u2-shelf="pets"]', 500);
    const v2b = await L(P);
    await tap(P, '[data-codex-door="petsAll"]', 900);   /* v2.3.6696: the pets' journal, All (card UI2-pets) */
    const petsUp = await P.page.evaluate(() => { const b = window.__broDashPanelBus; const n = b.nav(); const t = n[n.ws][n[n.ws].length - 1]; return t ? t.id : null; });
    rec.ok(`2b. Pets: "${v2b.empty}", its door opens the pet journal (${petsUp})`, /pet journal/i.test(v2b.empty) && petsUp === 'petsAll', { v2b, petsUp });
    await back(P);
    await tap(P, '[data-u2-shelf="monsters"]', 500);

    /* ── 3 ── */
    await openShowcase(P, 'mumling');
    await P.page.waitForSelector('[data-cx-idle][data-cx-ready="1"]', { timeout: 20000 }).catch(() => null);
    await P.page.waitForTimeout(600);
    const v3 = await L(P);
    rec.ok(`3. the Mummy's showcase: header "${v3.title}", Back "${v3.back}", its idle strip in (${JSON.stringify(v3.idle)})`,
      v3.title === 'Mummy' && /Codex/.test(v3.back) && !!v3.idle && v3.idle.ready && v3.idle.strip, v3);
    rec.ok(`3b. four doors with their summaries: ${v3.doors.map((d) => d.text).join(' | ')}`,
      v3.doors.length === 4 && ['combat', 'loot', 'habitat', 'story'].every((id) => v3.doors.some((d) => d.id === id)) && v3.doors.find((d) => d.id === 'loot').text.includes(NDROPS + ' drops')
        && v3.doors.every((d) => d.text.length > d.id.length + 2), v3.doors);
    rec.ok(`3c. the essentials (${v3.facts.join(' | ')}), no health or damage number`,
      v3.facts.some((f) => /Lv 1/.test(f)) && v3.facts.some((f) => /Wind/.test(f)) && v3.facts.some((f) => /Defeated\s*3/.test(f)) && !/\bHP\b|Health \d|Damage \d|\bDMG\b/i.test(v3.showText), v3.facts);
    rec.ok('3d. the showcase fits the band upright', fits(v3), fitWhy(v3));
    await bandShot(P, 'ui2-codex-showcase.png');
    await back(P);
    const v3e = await L(P);
    rec.ok('3e. Back: the collection, Monsters, the Mummy\'s card in view', v3e.shelf === 'monsters' && v3e.cards.length === 9, v3e.shelf);
    await openShowcase(P, UNMET);
    const v3f = await L(P);
    rec.ok(`3f. the unmet one's page: "${v3f.title}", locked, no doors (${v3f.showText.slice(0, 80)})`,
      v3f.title === '???' && v3f.locked && v3f.doors.length === 0 && /Defeat one/.test(v3f.showText) && !v3f.idle, v3f);
    await back(P);

    /* ── 4 ── */
    await openShowcase(P, 'mumling');
    await tap(P, '[data-cx-door="loot"]', 900);
    await P.page.waitForSelector('[data-codex-loot]', { timeout: 10000 }).catch(() => null);
    const v4 = await L(P);
    const onePct = (t) => (t.match(/\d+(\.\d+)?%/g) || []).length + (/Every kill/.test(t) ? 1 : 0);
    rec.ok(`4. Loot: header "${v4.title}", ${v4.rows.length} rows, one chance each (${v4.rows.map((r) => r.chance).join(', ')})`,
      v4.title === 'Loot' && v4.rows.length === NDROPS && v4.rows.every((r) => r.chance && onePct(r.text) === 1) && v4.rows.some((r) => r.chance === '0.01%') && !v4.rows.some((r) => r.chance === '0%'), v4.rows);
    rec.ok(`4b. no dice, no roll range, no bar; the roll's words: "${v4.roll}"`, !v4.dice && !/\d+–\d+ out of|1 to 10,000/.test(v4.lootText) && /roll/i.test(v4.roll), { roll: v4.roll, dice: v4.dice });
    await bandShot(P, 'ui2-codex-loot.png');

    /* ── 5 ── */
    await tap(P, '[data-cx-drop="irongreatsword"]', 900);
    await P.page.waitForSelector('[data-item-page]', { timeout: 10000 }).catch(() => null);
    const v5 = await L(P);
    rec.ok(`5. the one item page from Loot: "${v5.item && v5.item.name}" (${v5.title}), ${v5.item && v5.item.where}, no action, facts ${JSON.stringify(v5.item && v5.item.facts)}`,
      !!v5.item && v5.item.place === 'codex' && /Greatsword/.test(v5.item.name) && v5.title === 'Sword' && /Codex/.test(v5.item.where) && !v5.item.acts
        && v5.item.facts.some((f) => /Drops from Mummy/.test(f) && /0\.2%/.test(f)) && v5.item.doors.includes('codexFound'), v5.item);
    await bandShot(P, 'ui2-codex-item.png');
    await tap(P, '[data-item-door="codexFound"]', 900);
    const v5b = await L(P);
    rec.ok(`5b. Found from: ${v5b.found.length} monsters (the unmet one "???"): ${v5b.found.slice(0, 3).join(' | ')}`,
      v5b.title === 'Found from' && v5b.found.length === 9 && v5b.found.some((f) => /^\?\?\?/.test(f)) && v5b.found.every((f) => /0\.2%/.test(f)), v5b.found);
    await back(P);
    await back(P);
    const v5c = await L(P);
    rec.ok('5c. Back, Back: Loot, the sword\'s row kept', v5c.title === 'Loot' && v5c.rows.some((r) => r.id === 'irongreatsword' && r.sel), v5c.rows.filter((r) => r.sel));
    /* the same kind of item from a seeded bag */
    const codexName = v5.item ? v5.item.name : '';
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
    await H.dashOpen(P, 'dashboard').catch(() => null);
    await P.page.waitForTimeout(800);
    const bagKey = await P.page.evaluate(() => {
      const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
      const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
      return i >= 0 ? 'stashWeapon-' + i : null;
    });
    let v5d = null;
    if (bagKey) {
      await P.page.evaluate((k) => { const e = document.querySelector(`[data-gear-bag] [data-bag-key="${k}"]`); if (e) e.scrollIntoView({ block: 'nearest' }); }, bagKey);
      await P.page.waitForTimeout(400);
      await tap(P, `[data-gear-bag] [data-bag-key="${bagKey}"]`, 700).catch(() => null);
      await tap(P, '[data-gear-summary] [data-gear-details]', 900).catch(() => null);
      await P.page.waitForSelector('[data-item-page]', { timeout: 8000 }).catch(() => null);
      v5d = await L(P);
    }
    const word = (n) => String(n || '').split(' ').pop();
    rec.ok(`5d. the bag's greatsword: "${v5d && v5d.item && v5d.item.name}" (${v5d && v5d.title}) beside the Codex's "${codexName}": the same kind and name word; Equip from the bag only`,
      !!v5d && !!v5d.item && v5d.item.place === 'bag' && v5d.title === 'Sword' && word(v5d.item.name) === word(codexName) && /\bequip\b/.test(v5d.item.acts || ''), v5d && v5d.item);

    /* ── 6 ── */
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'close' }); });
    await P.page.waitForTimeout(600);
    await P.page.evaluate(() => { const c = window._gameState.current._codex; if (c) c.announce = { kind: 'snowling', at: Date.now() }; });
    await P.page.waitForSelector('[data-new-monster="snowling"]', { timeout: 4000 }).catch(() => {});
    await P.page.waitForTimeout(400);
    await P.page.evaluate(() => { const el = document.querySelector('[data-new-monster="snowling"]'); if (el) el.click(); });
    await P.page.waitForTimeout(1200);
    await settle(P);
    await P.page.waitForSelector('[data-codex-show="snowling"]', { timeout: 15000 }).catch(() => null);
    const v6 = await L(P);
    const nav6 = await P.page.evaluate(() => { const b = window.__broDashPanelBus; const n = b.nav(); return { shown: n.shown, ws: n.ws, menu: n.menu.map((e) => e.id + (e.sel ? ':' + e.sel : '')), card: !!document.querySelector('[data-new-monster]') }; });
    rec.ok(`6. the NEW MONSTER card lands on the Snowman's showcase ("${v6.title}")`, v6.title === 'Snowman' && /data-codex-show/.test(v6.root || ''), { root: v6.root, nav6 });

    /* ── 7 ── */
    const specials = [];
    for (const k of KINDS.filter((x) => x !== UNMET)) {
      await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'menuRoot' }); });
      await P.page.waitForTimeout(300);
      await openCodex(P);
      await openShowcase(P, k);
      await tap(P, '[data-cx-door="combat"]', 600);
      const ok = await P.page.waitForFunction(() => {
        const st = document.querySelector('[data-cx-stage]');
        const fit = document.querySelector('[data-codex-combat] .u2-cxc-stage');
        const box = document.querySelector('[data-band-box="page"]');
        if (!st || !fit || !box) return false;
        const a = fit.getBoundingClientRect(), b = box.getBoundingClientRect();
        return !!document.querySelector('[data-cx-label]') && a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
      }, null, { timeout: 25000, polling: 250 }).then(() => true, () => false);
      specials.push(k + (ok ? '' : ':NO'));
      if (k === 'mumling') await bandShot(P, 'ui2-codex-combat.png');
    }
    rec.ok(`7. Combat's stage plays its special for every met kind, inside its frame (${specials.join(', ')})`, specials.every((s) => !/:NO$/.test(s)), specials);

    /* ── 8 ── */
    await back(P);
    await back(P);
    await P.page.waitForTimeout(1200);
    const v8 = await L(P);
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'close' }); });
    await P.page.waitForTimeout(1500);
    const v8b = await L(P);
    rec.ok(`8. left by Back and Close: no stage, every baked picture revoked (blobs ${blobs0} before, ${v8.blobs} on the collection, ${v8b.blobs} closed)`,
      !v8.stage && !v8b.stage && v8.blobs === blobs0 && v8b.blobs === blobs0, { blobs0, v8: v8.blobs, v8b: v8b.blobs });

    /* ── 9 ── */
    for (const [w, h, tag] of [[375, 667, '375x667'], [844, 390, 'sideways']]) {
      await P.page.setViewportSize({ width: w, height: h });
      await P.page.waitForTimeout(1500);
      await openCodex(P);
      const c = await L(P);
      rec.ok(`9. ${tag}: the collection fits`, c.cards.length === 9 && fits(c), fitWhy(c));
      await bandShot(P, `ui2-codex-collection-${tag}.png`);
      await openShowcase(P, 'mumling');
      await P.page.waitForSelector('[data-cx-idle][data-cx-ready="1"]', { timeout: 20000 }).catch(() => null);
      const s = await L(P);
      rec.ok(`9b. ${tag}: the showcase fits (four doors, the essentials)`, s.doors.length === 4 && s.facts.length >= 4 && fits(s), fitWhy(s));
      await bandShot(P, `ui2-codex-showcase-${tag}.png`);
      if (tag === 'sideways') {
        await tap(P, '[data-cx-door="loot"]', 900);
        const l = await L(P);
        rec.ok('9c. sideways: Loot\'s rows scroll inside the page', l.rows.length === NDROPS && l.clipped.length === 0 && l.minFont >= 11, fitWhy(l));
        await bandShot(P, 'ui2-codex-loot-sideways.png');
        await back(P);
      }
      await back(P);
      await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'close' }); });
    }
    await P.page.setViewportSize(PHONE);

    /* ── 10 ── */
    rec.ok('10. no page errors', errors.length === 0, errors);
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* a computer, and today's Codex under ?ui2=0 */
  const D = await H.newPlayer(browser, { name: 'Codexdesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, dpr: 2, world: 'wheel', wide: true });
  const errD = [];
  D.page.on('pageerror', (e) => errD.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(D);
    await H.waitFor(D, (S) => S.currentZone, (z) => z === 'wheel', { timeout: 90000, label: 'into the world' }).catch(() => null);
    await seed(D, wsPort);
    await openCodex(D);
    const c = await L(D);
    rec.ok('9d. a computer: the collection fits its column', c.cards.length === 9 && fits(c), fitWhy(c));
    await bandShot(D, 'ui2-codex-collection-computer.png');
    await openShowcase(D, 'mumling');
    await D.page.waitForSelector('[data-cx-idle][data-cx-ready="1"]', { timeout: 20000 }).catch(() => null);
    const s = await L(D);
    rec.ok('9e. a computer: the showcase fits', s.doors.length === 4 && fits(s), fitWhy(s));
    await bandShot(D, 'ui2-codex-showcase-computer.png');
    rec.ok('10b. no page errors on the computer', errD.length === 0, errD);
  } finally {
    await D.ctx.close().catch(() => {});
  }

  const O = await H.newPlayer(browser, { name: 'Codexold', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'ui2=0' });
  try {
    await H.enterWorld(O);
    await H.waitFor(O, (S) => S.currentZone, (z) => z === 'wheel', { timeout: 90000, label: 'into the world' }).catch(() => null);
    await H.dashOpen(O, 'encyclopedia').catch(() => null);
    await O.page.waitForSelector('[data-cx-grid]', { timeout: 10000 }).catch(() => null);
    const o = await L(O);
    rec.ok('10c. ?ui2=0: today\'s Codex (its grid), not the collection', o.oldGrid && !o.shelf, { oldGrid: o.oldGrid, shelf: o.shelf });
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
