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
 *      down one, Bow's and Shared's unchanged); then Shared (today's Points
 *      window on its Shared column), Max HP, + and Spend (the shared pool
 *      down one, the weapons' unchanged);
 *   4. `?ui2=0`: today's Bro, its pages; no hub.
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
  const presses = Array.from(root.querySelectorAll(pressSel)).map((e) => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-combat-door') || e.getAttribute('data-weapon-attr') || (e.hasAttribute('data-weapon-dps') ? 'dps' : e.hasAttribute('data-weapon-allstats') ? 'allstats' : '?'), w: Math.round(r.width), h: Math.round(r.height), out: out(r) }; });
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
const hubDoors = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-combat-door]')).map((e) => ({ id: e.getAttribute('data-combat-door'), pts: e.getAttribute('data-combat-points'), lv: e.getAttribute('data-combat-lv'), text: e.textContent.trim() })));
const tap = async (P, sel, ms = 700) => { await P.page.locator(sel).first().tap({ timeout: 15000 }); await P.page.waitForTimeout(ms); };
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
    rec.ok('1b. each count is the worker\'s pool ("n points"), each weapon its level', +by.sword.pts === W0.sword && +by.bow.pts === W0.bow && +by.staff.pts === W0.staff && +by.shared.pts === W0.shared
      && by.sword.lv === '12' && by.bow.lv === '5' && by.staff.lv === '1' && by.sword.text.includes(W0.sword + ' points') && by.shared.text.includes(W0.shared + ' points'), { D, W0 });
    const Hb = await readRoom(P, HUB);
    rec.ok('1c. 390 x 844: every door 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', Hb && Hb.title === 'broCombat' && roomOk(Hb, 4), roomBrief(Hb));
    rec.ok('1d. no effective-health number on the hub', !!Hb && !/effective health|\bEHP\b/i.test(Hb.text), Hb && Hb.text.slice(0, 120));
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
      };
    });
    rec.ok('2a. Sword\'s page: level 12 and its XP (now / needed), DPS the headline, Damage, Attack speed, Crit chance, Range (no Element), the six attributes',
      !!S1 && S1.cat === 'sword' && S1.lv === '12' && /^\d+\/\d+$/.test(S1.xp || '') && (S1.xpText || '').includes(S1.xp.replace('/', ' / ') + ' XP')
      && /^\d+(\.\d+)?$/.test(S1.dps || '') && S1.support.join(',') === 'damage,aspd,crit,range' && S1.attrs.join(',') === 'range,dmg,aspd,luck,special,elem', S1);
    rec.ok('2b. "Attributes" names the Sword pool, the worker\'s count', !!S1 && +S1.pool === W0.sword && S1.poolText.includes(W0.sword + ' Sword points to spend'), S1 && { pool: S1.pool, text: S1.poolText, want: W0.sword });
    const Wp = await readRoom(P, PAGE);
    rec.ok('2c. 390 x 844: level, DPS and the six in view; every press 44 x 44 or more, inside the band, nothing clipped, no scroll, no text under 11 px', Wp && Wp.title === 'broSword' && roomOk(Wp, 7), roomBrief(Wp));
    rec.ok('2d. no effective-health number on the page', !!Wp && !/effective health|\bEHP\b/i.test(Wp.text));
    await bandShot(P, 'ui2-combat-sword.png');

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
    /* Back to the hub; Shared: today's Points window, Max HP */
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    const T1 = await P.page.evaluate(() => (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'));
    rec.ok('3g. Back from a weapon\'s page returns to the hub', T1 === 'broCombat', T1);
    await tap(P, '[data-combat-door="shared"]', 1200);
    await tap(P, '[data-stat-info="hp"]', 900);
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
      await bandShot(P, `ui2-combat-hub-${s.tag}.png`);
      await tap(P, '[data-combat-door="sword"]', 900);
      const Ws = await readRoom(P, PAGE);
      rec.ok(`4b. ${s.tag}: Sword's page: level, DPS and the six in view, every press 44 x 44 or more, nothing clipped, no scroll, no text under 11 px`, Ws && Ws.title === 'broSword' && roomOk(Ws, 7), roomBrief(Ws));
      await bandShot(P, `ui2-combat-sword-${s.tag}.png`);
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
