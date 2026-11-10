/* ═══ WHAT PLAYERS DREW, AND HOW WELL THEY AIM: THE OWNER'S TWO NEW VIEWS (v2.3.4495) ═══
 *
 * The owner, 2026-11-10: "I also need profile pic and character images of
 * other players saved somewhere so I can monitor for anything inappropriate
 * that they drew in the custom character creator", and "I want somewhere
 * that stats keep track of 'accuracy' (maybe for all 3 weapon types)".
 *
 * Two phones in BroTown:
 *   THE DRAWINGS.  An artist joins with a face tattoo drawn in the creator.
 *   The owner sees it on the artist in the world, opens the Test panel, and
 *   "Show player drawings" lists the artist with the drawing itself, drawn
 *   from the worker's stored record (every inked cell of it).  "Mark all
 *   seen" clears the NEW mark.  "Remove drawings" (two taps) takes it off the
 *   record and off the artist on the owner's own screen, there and then.
 *   ACCURACY.  The owner's character swings at empty air (misses), then
 *   fights at the edge of the Flame Fields (hits).  The worker's day totals
 *   count the swings and the hits it accepted; the Journey page (More,
 *   Journey) shows the character's own sword accuracy.
 *
 *   node tools/qa/mp/run.mjs ownerwatch
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
const INK = '0'.repeat(100) + '3'.repeat(56) + '0'.repeat(100);
const COACH = `const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true; localStorage.setItem('bt_coach_v1', JSON.stringify(d));`;
const ARTIST = `try { ${COACH} localStorage.setItem('bt-facetattoo', ${JSON.stringify(INK)}); } catch (e) {}`;
const OWNER = `try { ${COACH} } catch (e) {}`;

const adminGet = async (wsPort, path) => (await fetch('http://127.0.0.1:' + wsPort + '/api/admin' + path, { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json();
const tapText = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, text);
async function openTestPanel(P) {
  const up = () => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
  for (let k = 0; k < 3 && !(await up()); k++) {
    await P.page.evaluate(async () => {
      const el = document.querySelector('.bt-zone-header__title');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      await new Promise((res) => setTimeout(res, 1500));
      el.dispatchEvent(new PointerEvent('pointerup', o));
    });
    for (let i = 0; i < 40 && !(await up()); i++) await P.page.waitForTimeout(250);
  }
  if (!(await up())) return false;
  await P.page.waitForFunction(() => !!document.querySelector('input[type="password"]')
    || Array.from(document.querySelectorAll('button')).some((n) => (n.textContent || '').indexOf('Show player drawings') >= 0), null, { timeout: 10000 }).catch(() => {});
  const keyed = await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return false;
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, H.ADMIN_KEY);
  if (keyed) { await tapText(P, 'Save key on this device'); await P.page.waitForTimeout(1500); }
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Artist', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, init: ARTIST });
  let B = null, stopA = null, stopB = null;
  try {
    stopA = H.keepAlive(A, 15000);
    await H.enterWorld(A);
    const inA = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'the artist into the world' }).then(() => true).catch(() => false);
    B = await H.newPlayer(browser, { name: 'Owner', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, init: OWNER, query: 'manual=0' });
    stopB = H.keepAlive(B, 15000);
    await H.enterWorld(B);
    const inB = await H.waitFor(B, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'the owner into the world' }).then(() => true).catch(() => false);
    rec.ok('both phones are in BroTown (guard)', inA && inB);
    if (!inA || !inB) return;
    const aId = await H.readState(A, (S) => S.myId), bId = await H.readState(B, (S) => S.myId);

    /* ── the drawings ── */
    const tattooOf = () => B.page.evaluate((id) => { const S = window._gameState.current; const o = S.others && S.others[id]; return o ? (o.faceTattooArt || '') : null; }, aId);
    const until = async (pred, ms) => { const t0 = Date.now(); let v = null; while (Date.now() - t0 < ms) { v = await tattooOf().catch(() => null); if (pred(v)) return true; await B.page.waitForTimeout(300); } return false; };
    const seen = await until((v) => typeof v === 'string' && v.length === 256, 30000);
    const before = await B.page.evaluate((id) => { const o = window._gameState.current.others[id]; return o ? o.faceTattooArt : null; }, aId);
    rec.ok('the owner\'s phone sees the artist wearing the drawing (guard)', before === INK, { len: before && before.length, seen: !!seen });
    const stored = await adminGet(wsPort, '/dev/looks');
    const srow = (stored.rows || []).find((r) => r.id === aId);
    rec.ok('the worker has the drawing in the character\'s own record, as drawn', !!srow && srow.art && srow.art.tf === INK && srow.name === 'Artist' && srow.fresh === true, srow && { name: srow.name, keys: Object.keys(srow.art || {}) });

    const panel = await openTestPanel(B);
    rec.ok('the Test panel opens with the owner\'s key (guard)', panel);
    await tapText(B, 'Show player drawings');
    const shown = await B.page.waitForFunction((id) => {
      const row = document.querySelector('[data-watch-row="' + id + '"]');
      const cv = row && row.querySelector('[data-watch-art="tf"] canvas');
      if (!cv) return null;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let ink = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++;
      if (!ink) return null;   /* (the picture is painted a moment after its row is laid out) */
      const name = row.querySelector('[data-watch-name]');
      return { ink, w: cv.width, h: cv.height, name: name ? name.textContent : '', fresh: !!row.querySelector('[data-watch-new]'), tiles: row.querySelectorAll('[data-watch-art]').length };
    }, aId, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
    rec.ok(`"Show player drawings" lists the artist with the drawing itself, cell for cell (${shown ? shown.ink : 0} inked cells of 56, a 16 x 16 picture), marked NEW`,
      !!shown && shown.ink === 56 && shown.w === 16 && shown.h === 16 && shown.name === 'Artist' && shown.fresh === true && shown.tiles >= 1, shown);

    await tapText(B, 'Mark all seen');
    /* (the page redraws when the worker has answered: waited for, not timed -- this box draws a few frames a second) */
    await B.page.waitForFunction((id) => { const row = document.querySelector('[data-watch-row="' + id + '"]'); return row && !row.querySelector('[data-watch-new]'); }, aId, { timeout: 15000 }).catch(() => null);
    const afterSeen = await adminGet(wsPort, '/dev/looks');
    const stillNew = await B.page.evaluate((id) => { const row = document.querySelector('[data-watch-row="' + id + '"]'); return row ? !!row.querySelector('[data-watch-new]') : null; }, aId);
    rec.ok('"Mark all seen": nothing is NEW any more, on the worker and on the page', afterSeen.seenAt > 0 && afterSeen.fresh === 0 && stillNew === false, { seenAt: afterSeen.seenAt, fresh: afterSeen.fresh, stillNew });

    const press = () => B.page.evaluate((id) => { const b = document.querySelector('[data-watch-row="' + id + '"] [data-watch-act="wipe"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const t = b.textContent; b.click(); return t; }, aId);
    const first = await press();
    await B.page.waitForTimeout(400);
    const armed = await B.page.evaluate((id) => { const b = document.querySelector('[data-watch-row="' + id + '"] [data-watch-act="wipe"]'); return b ? b.textContent : null; }, aId);
    const mid = await adminGet(wsPort, '/dev/looks');
    rec.ok('"Remove drawings" asks first: one tap removes nothing', first === 'Remove drawings' && armed === 'Sure? Remove' && (mid.rows || []).some((r) => r.id === aId), { first, armed });
    await press();
    const gone = await B.page.waitForFunction((id) => !document.querySelector('[data-watch-row="' + id + '"]'), aId, { timeout: 15000 }).then(() => true).catch(() => false);
    const after = await adminGet(wsPort, '/dev/looks');
    rec.ok('the second tap takes them off the record for good, and the row goes', gone && !(after.rows || []).some((r) => r.id === aId), { gone, rows: (after.rows || []).map((r) => r.id) });
    const cleared = await until((v) => v === '', 15000);
    rec.ok('...and off the artist on the owner\'s own screen, there and then (no rejoin)', cleared);
    await B.page.evaluate(() => { const x = document.querySelector('[data-dev-close]'); if (x) x.click(); });
    await B.page.waitForTimeout(800);

    /* ── accuracy ── */
    await H.devOp(wsPort, 'kit', bId, { what: 'weapons' }).catch(() => null);
    await H.devOp(wsPort, 'vitals', bId, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
    /* a new character holds nothing: the kit's sword out of the bag and into the hand, the way a player equips it */
    let sword = null;
    for (let i = 0; i < 40; i++) {
      sword = await H.equipWeapon(B, 'greatsword', 'weapon', 'melee').catch(() => null);
      if (sword && sword.ok) break;
      await B.page.waitForTimeout(300);
    }
    const inHand = await H.waitFor(B, (S) => !!(S.rpg && S.rpg.weapon), (v) => v === true, { timeout: 15000, label: 'a sword in hand' }).then(() => true).catch(() => false);
    rec.ok('the owner\'s character holds a sword (guard)', inHand, sword);
    await B.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; }).catch(() => {});
    await B.page.waitForTimeout(2500);
    const capOn = await H.readState(B, (S) => !!(S._serverCaps && S._serverCaps.accuracy));
    rec.ok('the worker says it counts accuracy (guard)', capOn);
    const today = async () => { const j = await adminGet(wsPort, '/dev/accuracy?days=3'); return (j.days && j.days[0]) || { melee: [0, 0], ranged: [0, 0], staff: [0, 0] }; };
    const d0 = await today();
    let swung = 0;
    /* the game's own swing (what a tap on the attack side ends in: BroTown _gameFns.swingAttack) */
    const swing = () => B.page.evaluate(() => { try { window._gameFns.swingAttack(); return true; } catch (e) { return false; } });
    for (let i = 0; i < 5; i++) { if (await swing()) swung++; await B.page.waitForTimeout(1100); }
    const counted = await H.readState(B, (S) => (S._acc ? S._acc.melee : -1));
    rec.ok(`the phone numbers its swings at empty air (${counted} of ${swung} taps were swings)`, counted >= 3 && counted <= swung, { counted, swung });
    /* the counts ride the phone's next track: at once if something of the look changed, else within the quiet 30 s */
    let d1 = d0;
    for (let i = 0; i < 45; i++) { d1 = await today(); if (d1.melee[0] - d0.melee[0] >= counted) break; await B.page.waitForTimeout(1000); }
    rec.ok(`the worker's day counts them as shots, and none as a hit (${d1.melee[0] - d0.melee[0]} shots, ${d1.melee[1] - d0.melee[1]} hits)`,
      d1.melee[0] - d0.melee[0] === counted && d1.melee[1] - d0.melee[1] === 0, { d0: d0.melee, d1: d1.melee });

    const G = await H.wheelGeom();
    const to = G.along('ember', 1);
    await H.glideTo(B, to.x, to.y, { speed: 700, timeoutMs: 90000 });
    const near = () => B.page.evaluate(() => {
      const S = window._gameState.current;
      let m = null, d = Infinity;
      for (const x of S.monsters || []) { if (!x || x.alive === false || x.dead) continue; const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y); if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; } }
      return { px: S.player.x, py: S.player.y, m };
    });
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const s = await near().catch(() => null);
      if (!s || !s.m || s.m.d > 1200) { await B.page.waitForTimeout(300); continue; }
      if (s.m.d > 70) {
        const keys = [];
        if (s.m.y - s.py < -12) keys.push('w'); else if (s.m.y - s.py > 12) keys.push('s');
        if (s.m.x - s.px < -12) keys.push('a'); else if (s.m.x - s.px > 12) keys.push('d');
        for (const k of keys) await B.page.keyboard.down(k);
        await B.page.waitForTimeout(Math.min(450, 60 + s.m.d * 1.2));
        for (const k of keys) await B.page.keyboard.up(k);
      } else { await swing(); await B.page.waitForTimeout(240); }
    }
    const fought = await H.readState(B, (S) => (S._acc ? S._acc.melee : -1));
    let d2 = d1;
    for (let i = 0; i < 45; i++) { d2 = await today(); if (d2.melee[0] - d0.melee[0] >= fought && d2.melee[1] > d1.melee[1]) break; await B.page.waitForTimeout(1000); }
    const shots = d2.melee[0] - d0.melee[0], hits = d2.melee[1] - d0.melee[1];
    rec.ok(`a fight: the worker counts the hits it accepted, once a swing, never more than the swings (${hits} hits of ${shots} swings; the phone swung ${fought})`,
      hits >= 1 && hits <= shots && shots === fought && hits <= fought - counted, { shots, hits, fought, counted });

    await H.unfoldBand(B).catch(() => null);
    const opened = await H.openDest(B, 'Journey', { timeout: 6000 }).then(() => true).catch(() => false);
    const cell = await B.page.waitForFunction(() => {
      const c = document.querySelector('[data-journey-acc-cell="melee"]');
      return c && /%/.test(c.textContent) ? c.textContent : null;
    }, null, { timeout: 25000 }).then((h) => h.jsonValue()).catch(() => null);
    const mine = await H.readState(B, (S) => (S._accState ? S._accState.w.melee : null));
    const pct = mine && mine.s > 0 ? Math.round(100 * mine.h / mine.s) + '%' : null;
    rec.ok(`the Journey page shows the character's own sword accuracy (${cell ? cell.replace(/\s+/g, ' ') : 'nothing'}): the worker's ${mine ? mine.h + ' of ' + mine.s : '?'}`,
      opened && !!cell && !!mine && mine.s === fought && mine.h === hits && cell.indexOf(pct) >= 0 && cell.indexOf('Sword') >= 0, { cell, mine, opened });
  } finally {
    if (stopA) stopA();
    if (stopB) stopB();
    await A.ctx.close().catch(() => {});
    if (B) await B.ctx.close().catch(() => {});
  }
}
