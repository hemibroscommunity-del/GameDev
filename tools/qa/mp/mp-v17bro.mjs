/* ═══ v2.3.6843: BRO LEADS WITH THE THREE WEAPONS, PLAYED (card UI4 PR 4, the owner's V17) ═══
 *
 * The owner's V17 (docs/design/v17/MASTER-IMPLEMENTATION.md line 55): "Bro
 * presents recognizable Sword/Bow/Staff artwork, levels/progress and
 * available points first, then Character stats and Pets, with active weapon
 * damage and health afterward. Distinguish equipped weapon from in-hand
 * weapon."  A real worker and a phone in the world (world: 'wheel'), every
 * step a player's tap:
 *   1. the Menu's Bro opens V17's page by default (`?v17bro`): Sword, Bow,
 *      Staff, each the game's picture, its level and XP the worker's, its
 *      points drawn ONLY while it has some, no "+" anywhere; then the Shared
 *      door (its points by the same rule) and Pets; the held weapon's DPS
 *      and Max HP flat (no button form); no portrait, name or combat level;
 *   2. the weapon in hand framed AND named ("In hand"), exactly one; the
 *      others "Worn" or "Not worn";
 *   3. one tap opens a weapon's page; its Back returns to Bro;
 *   4. NOTHING LOST: each of Equipment, Life Skills, Feats, Journey, Pets,
 *      AP, Quests, Clan, Guilds reached from the page (the strip's "more"
 *      where it pages), each opening its page; the Combat hub reached by its
 *      old road (the HUD's weapon bar, then Back);
 *   5. it FITS: at 390 x 844, 375 x 667, 844 x 390 (one row) and a computer
 *      (1440 x 900, `?v17wide`'s 840 block): every control 44 x 44, the
 *      weapons and the two doors whole in view unscrolled, no word cut,
 *      nothing scrolled; the computer's row holds more entries than the
 *      phone's (V17:31), its words no larger;
 *   6. `?v17bro=0` gives the six tiles and the strip (BroLanding), remembered
 *      on the phone; `?v17bro=1` forgets.
 * Pictures (deviceScaleFactor 2) of the band, new and `=0`, at the four
 * sizes: docs/shots/v17bro-<size>.png, v17bro-<size>-off.png (BT_V17BRO_SHOTS=0:
 * none).  With QA_DIST pointing at the base build, the `=0` pictures are
 * taken as v17bro-<size>-base.png instead: the PR compares them to the pixel.
 */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const SHOOT = process.env.BT_V17BRO_SHOTS !== '0';
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
  const r = await P.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return { weapon: !!R.weapon, slot: R.activeSlot, lv: R.prog3 && R.prog3.sk ? R.prog3.sk.sword.level : null }; });
  rec.ok(`${tag}: seeded (a weapon in hand, Sword 12)`, r.weapon && r.lv === 12, r);
}

/* what the page shows, read from outside the game */
function readBro() {
  const root = document.querySelector('[data-bro-v17]');
  const band = document.querySelector('[data-band-box="page"]') || document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const whole = (e) => { const r = e.getBoundingClientRect(); return !!B && r.left >= B.left - 1 && r.right <= B.right + 1 && r.top >= B.top - 1 && r.bottom <= B.bottom + 1; };
  const onTop = (e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !!t && (t === e || e.contains(t)); };
  if (!root) return { v17: false, landing: !!document.querySelector('[data-dash-grid="bro"]'), strip: !!document.querySelector('[data-bro-strip]') };
  const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const weapons = Array.from(root.querySelectorAll('[data-bro-weapon]')).map((e) => ({
    cat: e.getAttribute('data-bro-weapon'), hand: e.getAttribute('data-bro-hand'), points: +e.getAttribute('data-bro-points'), lv: e.getAttribute('data-bro-lv'),
    art: !!(e.querySelector('img') && e.querySelector('img').naturalWidth > 0), cue: !!e.querySelector('.u2-lt-cue'), mark: (e.querySelector('.u2-lt-mark') || {}).textContent || '',
    framed: e.classList.contains('is-hand'), role: e.getAttribute('data-u2-role'), box: box(e), whole: whole(e), top: onTop(e), y: Math.round(e.getBoundingClientRect().top),
  }));
  const doors = Array.from(root.querySelectorAll('[data-bro-door]')).map((e) => ({ id: e.getAttribute('data-bro-door'), points: e.getAttribute('data-bro-points'), cue: !!e.querySelector('.u2-bv-pts'), box: box(e), whole: whole(e), top: onTop(e), y: Math.round(e.getBoundingClientRect().top) }));
  const facts = Array.from(root.querySelectorAll('[data-bro-quiet]')).map((e) => ({ id: e.getAttribute('data-bro-quiet'), tag: e.tagName, role: e.getAttribute('data-u2-role'), words: e.textContent }));
  const controls = Array.from(root.querySelectorAll('button, [role="button"]')).filter(vis).map((e) => ({ w: box(e), label: e.getAttribute('aria-label') || e.textContent.slice(0, 20) }));
  let scrolled = false;
  for (let a = root; a && a !== document.body; a = a.parentElement) if (a.scrollTop > 0 || a.scrollLeft > 0) scrolled = true;
  const sizes = Array.from(root.querySelectorAll('*')).filter((e) => vis(e) && Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize));
  return {
    v17: true, shape: root.getAttribute('data-bro-v17'), weapons, doors, facts, controls, scrolled,
    small: controls.filter((c) => c.w[0] < 44 || c.w[1] < 44),
    plus: /\+/.test(root.textContent), face: !!root.querySelector('[data-char-portrait], [data-char-name], [data-char-combat]'),
    strip: Array.from(root.querySelectorAll('[data-bro-strip] [data-dest], [data-bro-strip] [data-bro-fact], [data-bro-strip] [data-bro-quiet]')).map((e) => e.getAttribute('data-dest') || e.getAttribute('data-bro-fact') || e.getAttribute('data-bro-quiet')),
    more: (root.querySelector('[data-u2-strip-more]') || { getAttribute: () => null }).getAttribute('data-u2-strip-more'),
    minFont: Math.min(...sizes), maxFont: Math.max(...sizes),
  };
}
const read = (P) => P.page.evaluate(readBro);
const openBro = async (P) => { await H.dashOpen(P, 'hero'); await P.page.waitForTimeout(700); };

async function checks(P, rec, size, form) {
  await openBro(P);
  const L = await read(P);
  const tag = `${size}`;
  rec.ok(`1. ${tag}: the Menu's Bro opens V17's page (${L.shape})`, L.v17 === true, L);
  if (!L.v17) return L;
  rec.ok(`1. ${tag}: Sword, Bow, Staff first, each the game's picture, its level, the go role`,
    L.weapons.map((w) => w.cat).join(',') === 'sword,bow,staff' && L.weapons.every((w) => w.art && w.lv && w.role === 'go'), L.weapons);
  rec.ok(`1. ${tag}: a weapon's points drawn exactly while it has some (${L.weapons.map((w) => w.cat + ' ' + w.points).join(', ')})`, L.weapons.every((w) => w.cue === (w.points > 0)), L.weapons);
  rec.ok(`1. ${tag}: Shared then Pets, Shared's points by the same rule`, L.doors.map((d) => d.id).join(',') === 'shared,pets' && L.doors[0].cue === (+L.doors[0].points > 0), L.doors);
  rec.ok(`1. ${tag}: the held weapon's DPS and Max HP, flat facts (no button form)`, L.facts.length === 2 && L.facts.every((f) => f.tag !== 'BUTTON' && f.role === 'info'), L.facts);
  rec.ok(`1. ${tag}: no "+" anywhere, no portrait, name or combat level`, !L.plus && !L.face, { plus: L.plus, face: L.face });
  const held = L.weapons.filter((w) => w.hand === 'held');
  rec.ok(`2. ${tag}: exactly one weapon in hand, framed AND named "In hand"; the others named Worn or Not worn, not framed`,
    held.length === 1 && held[0].framed && held[0].mark === 'In hand' && L.weapons.filter((w) => w.hand !== 'held').every((w) => !w.framed && /^(Worn|Not worn)$/.test(w.mark)), L.weapons);
  rec.ok(`5. ${tag}: every control 44 x 44 or more`, L.small.length === 0, L.small);
  rec.ok(`5. ${tag}: the weapons and the two doors whole in view, on top, nothing scrolled`, L.weapons.concat(L.doors).every((x) => x.whole && x.top) && !L.scrolled, { w: L.weapons.map((w) => [w.cat, w.whole, w.top]), d: L.doors.map((d) => [d.id, d.whole, d.top]) });
  if (form === 'side') rec.ok(`5. ${tag}: sideways ONE row (the weapons and the doors on one line)`, new Set(L.weapons.concat(L.doors).map((x) => x.y)).size === 1, L.weapons.concat(L.doors).map((x) => x.y));
  if (form === 'computer') rec.ok(`5. ${tag}: a computer's row holds the weapons AND the doors (more entries, V17:31)`, L.doors.every((d) => d.y >= L.weapons[0].y - 1 && d.y < L.weapons[0].y + L.weapons[0].box[1]), { w: L.weapons[0], d: L.doors });
  rec.ok(`5. ${tag}: the smallest word 11 px or more (Bro keeps 11)`, L.minFont >= 11, L.minFont);
  return L;
}

/* 4: every door of the page reached, each its page; the strip pages where it must */
async function nothingLost(P, rec, tag) {
  const want = [['equipment', 'broEquip'], ['skills', 'skills'], ['feats', 'achievements'], ['journey', 'journey'], ['pets', 'pets']];
  for (const [dest, page] of want) {
    await openBro(P);
    let found = false;
    for (let i = 0; i < 6; i++) {
      found = (await P.page.locator(`[data-bro-v17] [data-dest="${dest}"]`).count()) > 0;
      if (found) break;
      await tap(P, '[data-bro-v17] [data-u2-strip-more]', 300);
    }
    if (found) await tap(P, `[data-bro-v17] [data-dest="${dest}"]`, 900);
    const t = await title(P);
    rec.ok(`4. ${tag}: ${dest} on the page and it opens its page (${t})`, found && t === page, { found, t });
  }
  for (const [fact, page] of [['ap', 'achievements'], ['quests', null], ['clan', null], ['guilds', null]]) {
    await openBro(P);
    let found = false;
    for (let i = 0; i < 6; i++) {
      found = (await P.page.locator(`[data-bro-v17] [data-bro-fact="${fact}"]`).count()) > 0;
      if (found) break;
      await tap(P, '[data-bro-v17] [data-u2-strip-more]', 300);
    }
    const t0 = await title(P);
    const door = found && (await P.page.locator(`[data-bro-v17] [data-bro-fact="${fact}"]`).first().evaluate((e) => e.tagName === 'BUTTON'));
    if (door) await tap(P, `[data-bro-v17] [data-bro-fact="${fact}"]`, 900);
    const t = await title(P);
    rec.ok(`4. ${tag}: the strip's ${fact} on the page${door ? ', a door that opens its page (' + t + ')' : ''}`, found && (!door || (t !== t0 && (!page || t === page))), { found, door, t0, t });
  }
  /* the Combat hub by its old road: the HUD's weapon bar (Bro, the hub, the held weapon), then Back */
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(500);
  const bar = await P.page.locator('[data-hudart-bar]').count();
  if (bar) {
    await tap(P, '[data-hudart-bar]', 900);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
  }
  const hub = await P.page.evaluate(() => !!document.querySelector('[data-combat-hub]'));
  rec.ok(`4. ${tag}: the Combat hub reached by its old road (the HUD's weapon bar, then Back)`, bar > 0 && hub, { bar, hub });
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* 1. a phone, upright then on its side (one phone turned: TRAPS 175) */
  const P = await H.newPlayer(browser, { name: 'Brophone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (await inWorld(P, rec, 'phone')) {
      await seed(P, wsPort, rec, 'phone');
      await H.unfoldBand(P).catch(() => null);
      if (!BASE) {
        await checks(P, rec, '390x844', 'upright');
        await shot(P, 'v17bro-390x844.png');
        /* 3. one tap to a weapon's page, and Back */
        await tap(P, '[data-bro-weapon="bow"]', 900);
        const t1 = await title(P);
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
        const back = await read(P);
        rec.ok(`3. one tap opens the Bow's page (${t1}); its Back returns to Bro`, t1 === 'broBow' && back.v17, { t1, back: back.v17 });
        await nothingLost(P, rec, '390x844');
        for (const [s, form] of [['375x667', 'upright'], ['844x390', 'side']]) {
          const [w, h] = s.split('x').map(Number);
          await P.page.setViewportSize({ width: w, height: h });
          await P.page.waitForTimeout(1800);
          await checks(P, rec, s, form);
          await shot(P, `v17bro-${s}.png`);
        }
        await nothingLost(P, rec, '844x390');
      }
      /* 6. =0: the six tiles and the strip, remembered; =1 forgets */
      await P.page.setViewportSize({ width: 390, height: 844 });
      await P.page.goto(P.page.url().replace(/([?&])v17bro=[^&]*/, '$1').replace(/[?&]$/, '') + (P.page.url().includes('?') ? '&' : '?') + 'v17bro=0', { waitUntil: 'domcontentloaded' });
      if (await inWorld(P, rec, 'phone, ?v17bro=0')) {
        await H.unfoldBand(P).catch(() => null);
        for (const [s] of [['390x844'], ['375x667'], ['844x390']]) {
          const [w, h] = s.split('x').map(Number);
          await P.page.setViewportSize({ width: w, height: h });
          await P.page.waitForTimeout(1800);
          await openBro(P);
          const L = await read(P);
          rec.ok(`6. ${s}: ?v17bro=0 gives the six tiles and the strip`, !L.v17 && L.landing && L.strip, L);
          await shot(P, `v17bro-${s}-${BASE ? 'base' : 'off'}.png`);
        }
        const stored = await P.page.evaluate(() => { try { return localStorage.getItem('bt_v17bro'); } catch (e) { return 'x'; } });
        if (!BASE) rec.ok('6. ?v17bro=0 remembered on the phone (bt_v17bro "0")', stored === '0', stored);
        if (!BASE) {
          await P.page.goto(P.page.url().replace('v17bro=0', 'v17bro=1'), { waitUntil: 'domcontentloaded' });
          await P.page.waitForTimeout(1500);
          const after = await P.page.evaluate(() => { try { return localStorage.getItem('bt_v17bro'); } catch (e) { return 'x'; } });
          rec.ok('6. ?v17bro=1 forgets the stored off', after === null, after);
        }
      }
    }
  } finally { await P.ctx?.close?.().catch(() => {}); }

  /* 2. a computer, ?v17wide on (the default): 840 centred; then =0 for its picture */
  for (const off of BASE ? [true] : [false, true]) {
    const C = await H.newPlayer(browser, { name: off ? 'Brodesk0' : 'Brodesk', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true, dpr: 2, query: off ? 'v17bro=0' : '' });
    try {
      if (await inWorld(C, rec, off ? 'computer, ?v17bro=0' : 'computer')) {
        await seed(C, wsPort, rec, off ? 'computer, ?v17bro=0' : 'computer');
        await H.unfoldBand(C).catch(() => null);
        if (!off) {
          const L = await checks(C, rec, '1440x900', 'computer');
          await shot(C, 'v17bro-1440x900.png');
          rec.ok('5. 1440x900: the strip whole (no "more": every entry in one row)', L.v17 && !L.more && L.strip.length >= 8, { more: L.more, strip: L.strip });
        } else {
          await openBro(C);
          const L = await read(C);
          rec.ok('6. 1440x900: ?v17bro=0 gives the six tiles and the strip', !L.v17 && L.landing && L.strip, L);
          await shot(C, `v17bro-1440x900-${BASE ? 'base' : 'off'}.png`);
        }
      }
    } finally { await C.ctx?.close?.().catch(() => {}); }
  }
}
