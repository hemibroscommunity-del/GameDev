/* ═══ THE WHEEL'S DOORS, ON A PHONE (v2.3.3032) ═══
 *
 * Owner, 2026-10-04: "Push to main. Then after that add doors."  One real
 * player against a real worker, in the Wheel's Brotown, on a phone:
 *   1. the client knows the town's seventeen doors from the worker's answer:
 *      twelve that open a building, the Wheel's four halls (v2.3.3066:
 *      mp-wheelhalls walks them; v2.3.3142: the Town Hall is the fourth) and
 *      one shut one;
 *   2. walked to each of the twelve (boots at the foot of its steps), the
 *      Enter button comes up with the NAME ON ITS SIGN ("Enter SALOON"), and a
 *      tap opens that building's panel -- the forge's, the bank's, the
 *      market's and so on, the old town's own;
 *   3. not a step before: far off there is no button, and the reach is the
 *      reach (inside 120 px, out at 175);
 *   4. a shut door (the hotel; until v2.3.3066 the sheriff's, the post
 *      office and the guild hall too) shows its name and "Shut for now" and
 *      is not a button;
 *   5. twelve buildings visited are twelve visits (mayor_1's "visit 3");
 *   6. Diego keeps the General Store: drawn, beside its steps, his window shut
 *      while you stand at the door and open when you walk up to him;
 *   7. the Land Office sends you to your farm and the farm's gate leads back
 *      out to the Wheel, at the door you left by (never through the town, and
 *      the same from Feed & Seed's "Visit Your Farm");
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/wheeldoors-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_GATE } from '../../../src/data/farmLayout.js';   /* v2.3.3136: the farm you walk */

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheeldoors-${name}.png`) }).catch(() => {});
  const { TOWN_BUILDINGS } = await import(H.REPO + '/src/data/buildings.js');
  const { WHEEL_BUILDING_DOORS, WHEEL_SHUT_DOORS, WHEEL_DOOR_REACH, WHEEL_TOWNSFOLK } = await import(H.REPO + '/src/data/wheelBuildingDoors.js');
  const actionOf = Object.fromEntries(TOWN_BUILDINGS.map((b, i) => [i, b.action || b.id]));

  const P = await H.newPlayer(browser, { name: 'Doorman', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  await H.enterWorld(P);
  const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
  const waitZone = async (pred, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const z = await zoneNow();
      if (z && pred(z)) return z;
      await P.page.waitForTimeout(400);
    }
    return await zoneNow();
  };
  const z0 = await waitZone((z) => z === 'wheel');
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id);
  await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
  /* a phone has no keyboard: the harness's keep-alive key (Control) makes the
     game think there is one and draw the "E" hint on the Enter button, which
     is not what a player sees -- so, as a phone does, none */
  await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  /* where the boots go: S.player is the body's centre, ~feetDy above them */
  const standAt = async (x, bootsY) => {
    for (let k = 0; k < 4; k++) {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
      await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(800);
      const g = await P.page.evaluate(() => window.__btPlayerGround());
      if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;   /* the server did not pull us back */
    }
    return false;
  };
  /* what the prompt (or the shut-door caption) lies over: every other visible
     button its box overlaps, by class -- the controls of the band, the bell */
  const overlaps = (el) => {
    const r = el.getBoundingClientRect(), out = [];
    for (const q of document.querySelectorAll('button, [role="button"]')) {
      if (q === el || el.contains(q) || q.contains(el)) continue;
      const c = q.getBoundingClientRect();
      if (c.width < 4 || c.height < 4) continue;
      const cs = getComputedStyle(q);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      if (Math.min(r.right, c.right) - Math.max(r.left, c.left) > 2 && Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top) > 2) out.push((q.className && q.className.baseVal === undefined ? String(q.className) : q.tagName).slice(0, 40));
    }
    return out;
  };
  const prompt = () => P.page.evaluate((ovSrc) => {
    const overlapsOf = new Function('el', 'return (' + ovSrc + ')(el)');
    const S = window._gameState.current;
    const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || ''));
    const shut = document.querySelector('[data-wheel-shut-door]');
    const box = (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
    return {
      nb: S.nearBuilding, wb: S._nearWheelBuilding ? S._nearWheelBuilding.id : null,
      at: window.__btWheelTownDoors.at(), btn: b ? (b.textContent || '').trim() : null,
      btnBox: b ? box(b) : null, btnOver: b ? overlapsOf(b) : [],
      vw: window.innerWidth,
      shut: shut ? { id: shut.getAttribute('data-wheel-shut-door'), text: (shut.textContent || '').trim(), pe: getComputedStyle(shut).pointerEvents, tag: shut.tagName, box: box(shut), over: overlapsOf(shut) } : null,
    };
  }, overlaps.toString());
  const settle = async (want, ms = 4000) => {
    let r = null;
    for (let t0 = Date.now(); Date.now() - t0 < ms;) {
      r = await prompt();
      if (want(r)) return r;
      await P.page.waitForTimeout(250);
    }
    return r;
  };
  /* out by the farm's gate (v2.3.3136: the farm you walk, data/farmLayout.js
     FARM_GATE -- the exit tiles under its gate in the bottom row of 32 x 44):
     hop toward it and STOP the moment the zone is not the farm -- a hop loop
     that carried on into the next zone walked the player off toward the
     farm's coordinates */
  const leaveFarm = async () => {
    for (let i = 0; i < 90; i++) {
      const moved = await P.page.evaluate((g) => {
        const S = window._gameState.current;
        if (S.currentZone !== 'farm_home' || S._zoneLoading) return false;
        const dx = g.x - S.player.x, dy = g.y - S.player.y, d = Math.hypot(dx, dy);
        if (d > 6) { const k = Math.min(60, d); S.player.x += (dx / d) * k; S.player.y += (dy / d) * k; }
        return true;
      }, { x: FARM_GATE.x, y: 1376 - 52 });
      if (!moved) return;
      await P.page.waitForTimeout(260);
    }
  };
  const panelKey = () => P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
  const closePanel = async () => {
    await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await P.page.waitForTimeout(350);
  };

  /* ── 1. the doors ── */
  let doors = [];
  for (let i = 0; i < 40 && doors.length < 17; i++) {
    doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    if (doors.length < 17) await P.page.waitForTimeout(500);
  }
  const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
  const open = doors.filter((d) => d.index >= 0), shut = doors.filter((d) => d.index < 0 && d.closed), plain = doors.filter((d) => d.index < 0 && !d.closed && !d.hall);
  const halls = doors.filter((d) => d.hall);   /* v2.3.3066: the Wheel's own (mp-wheelhalls) */
  rec.ok(`the client knows the town's doors from the worker's answer: ${open.length} that open a building, ${halls.length} halls of the Wheel's own, ${shut.length} shut, and ${plain.map((d) => d.name).join(', ')}`,
    z0 === 'wheel' && doors.length === 17 && open.length === 12 && halls.length === 4 && shut.length === 1 && plain.length === 0 && halls.some((d) => d.id === 'townhall')
      && Object.keys(WHEEL_BUILDING_DOORS).every((k) => byId[k] && byId[k].index >= 0 && actionOf[byId[k].index] === TOWN_BUILDINGS.find((b) => b.id === WHEEL_BUILDING_DOORS[k]).action)
      && WHEEL_SHUT_DOORS.every((k) => byId[k] && byId[k].closed === true && byId[k].index < 0),
    { z0, doors: doors.map((d) => [d.id, d.index]) });

  /* ── 2. each of the twelve ── */
  const visited = [];
  const failures = [];
  for (const d of open) {
    const okStand = await standAt(d.x, d.y + 30);
    const r = await settle((q) => q.at === d.id && q.btn);
    if (d.id === 'store' || d.id === 'auction' || d.id === 'assay') await shot(P, 'enter-' + d.id);
    const want = 'Enter ' + d.label;
    let opened = null;
    if (r && r.btn) {
      await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      for (let i = 0; i < 12 && !opened; i++) { await P.page.waitForTimeout(250); opened = await panelKey(); }
    }
    const clear = !!r && !!r.btnBox && r.btnOver.length === 0 && r.btnBox.l >= 4 && r.btnBox.r <= r.vw - 4;
    const good = okStand && r && r.at === d.id && r.nb === d.index && r.wb === d.id && (r.btn || '').includes(want) && opened === actionOf[d.index] && clear;
    if (d.id === 'bank' || d.id === 'saloon') await shot(P, 'open-' + d.id);
    visited.push({ id: d.id, label: d.label, opened });
    if (!good) failures.push({ id: d.id, okStand, r, opened, want: actionOf[d.index], clear });
    await closePanel();
  }
  rec.ok(`standing at the foot of each building's steps the button says "Enter" and the name on the sign -- lying over no other button, inside the screen -- and a tap opens the old town's own panel: ${visited.map((v) => v.label + '→' + v.opened).join(', ')}`,
    visited.length === 12 && failures.length === 0, failures);

  /* ── 3. not a step before ── */
  const bank = byId.bank;
  await standAt(bank.x, bank.y + 30 + 330);
  const far = await settle((q) => !q.btn, 3000);
  await standAt(bank.x + 120, bank.y + 30);
  const inside = await settle((q) => q.btn, 3000);
  await standAt(bank.x - 175, bank.y + 30);
  const outside = await settle((q) => !q.btn, 3000);
  rec.ok(`...and not a step before: 330 px in front of the bank there is no button, 120 px to its side there is, 175 px (past the ${WHEEL_DOOR_REACH} px reach) there is not`,
    !!far && !far.btn && far.nb === null && !!inside && /Enter BANK/.test(inside.btn || '') && !!outside && !outside.btn && outside.nb === null,
    { far, inside, outside });

  /* ── 4. the shut ones (the Town Hall is a hall since v2.3.3142: mp-wheelhalls) ── */
  const shutSeen = [];
  for (const d of shut) {
    await standAt(d.x, d.y + 30);
    const r = await settle((q) => q.shut && q.shut.id === d.id, 3000);
    shutSeen.push({ id: d.id, r });
    if (d.id === 'hotel') await shot(P, 'shut-hotel');
  }
  rec.ok(`a shut door says so and is not a button: ${shutSeen.map((s) => s.id).join(', ')} each show their name and "Shut for now", with no Enter`,
    shutSeen.length === 1 && shutSeen.every((s) => {
      const q = s.r, door = byId[s.id];
      return q && q.shut && q.shut.id === s.id && q.shut.tag === 'DIV' && q.shut.pe === 'none' && q.btn === null && q.nb === null
        && q.shut.text.includes(door.name) && q.shut.text.includes('Shut for now')
        && q.shut.over.length === 0 && q.shut.box.l >= 4 && q.shut.box.r <= q.vw - 4;
    }),
    { shutSeen: shutSeen.map((s) => [s.id, s.r && s.r.shut, s.r && s.r.btn]) });
  rec.ok('...and its caption lies over no button either', shutSeen.every((s) => s.r && s.r.shut && s.r.shut.over.length === 0), shutSeen.map((s) => [s.id, s.r && s.r.shut && s.r.shut.over]));

  /* ── 5. twelve visits ── */
  const stats = await H.readState(P, (S) => {
    const v = S.stats && S.stats.visitedBuildings;
    return { n: v ? (v.size != null ? v.size : Object.keys(v).length) : 0, count: S.stats ? S.stats.buildingsVisited : null };
  });
  rec.ok(`twelve buildings entered are twelve visits (${stats.n}): the "visit 3 buildings" errand can be done in the Wheel`, stats.n === 12 && stats.count === 12, stats);

  /* ── 6. Diego ── */
  const store = byId.store, sk = WHEEL_TOWNSFOLK.find((f) => f.name === 'Diego');
  await standAt(store.x, store.y + 30);
  await P.page.waitForTimeout(1500);
  const dg = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const d = (S.npcs || []).find((n) => n.name === 'Diego');
    const drawn = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.name === 'Diego');
    return { npc: d ? { x: d.x, y: d.y, r: d.pathRadius } : null, drawn: drawn ? { h: Math.round(drawn.height), w: Math.round(drawn.width), dir: drawn.walkDir } : null,
      names: (S.npcs || []).map((n) => n.name), shop: !!document.querySelector('[data-shop-panel]'), player: { x: S.player.x, y: S.player.y } };
  });
  await shot(P, 'diego-store');
  rec.ok(`Diego keeps the General Store: standing beside its steps (${dg.npc ? Math.round(dg.npc.x - store.x) : '?'}, ${dg.npc ? Math.round(dg.npc.y - store.y) : '?'} px from its door), drawn ${dg.drawn ? dg.drawn.h + ' px tall' : 'NOT DRAWN'}, still; his window stays shut while you stand at the door`,
    !!dg.npc && Math.abs(dg.npc.x - (store.x + sk.dx)) < 1 && Math.abs(dg.npc.y - (store.y + sk.dy)) < 1 && dg.npc.r === 0
      && !!dg.drawn && dg.drawn.h > 100 && dg.drawn.h < 220 && dg.names.length === 1 + WHEEL_TOWNSFOLK.length && !dg.shop,
    dg);
  await standAt(store.x + sk.dx + 30, store.y + sk.dy + 10);
  let shopOpen = false;
  for (let i = 0; i < 12 && !shopOpen; i++) { await P.page.waitForTimeout(300); shopOpen = await P.page.evaluate(() => !!document.querySelector('[data-shop-panel]')); }
  await shot(P, 'diego-shop');
  rec.ok('...and walking up to him opens it, as in the old town', shopOpen, {});
  await P.page.evaluate(() => { const b = document.querySelector('[data-shop-close]'); if (b) b.click(); });
  await P.page.waitForTimeout(500);

  /* ── 7. the farm, and back ── */
  const loa = byId.landoffice;
  await standAt(loa.x, loa.y + 30);
  await settle((q) => q.at === 'landoffice' && q.btn, 4000);
  await P.page.evaluate(() => {
    window.__zoneLog = [];
    let last = null;
    window.__zoneLogT = setInterval(() => { const S = window._gameState.current; if (S && S.currentZone !== last) { last = S.currentZone; window.__zoneLog.push(S.currentZone); } }, 60);
  });
  const farmBackExpect = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /Travel to Farm/.test(q.textContent || '')); if (b) b.click(); });
  const inFarm = await waitZone((z) => z === 'farm_home', 15000);
  const fb = await P.page.evaluate(() => { const S = window._gameState.current; return S._farmBack ? { x: S._farmBack.x, y: S._farmBack.y } : null; });
  await P.page.waitForTimeout(800);
  await shot(P, 'farm');
  await leaveFarm();
  const back = await waitZone((z) => z === 'wheel', 60000);
  await P.page.waitForTimeout(1500);
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    clearInterval(window.__zoneLogT);
    return { log: window.__zoneLog, x: S.player.x, y: S.player.y, farmBack: S._farmBack || null, veil: !!document.querySelector('.bt-zone-loading, [data-zone-loading]') };
  });
  const dist = Math.hypot(after.x - farmBackExpect.x, after.y - farmBackExpect.y);
  rec.ok(`the Land Office sends you to your farm (${inFarm}), and the farm's gate leads back out to the Wheel (${back}) by way of town's stairs only as a stop (${after.log.join(' → ')}), ${Math.round(dist)} px from where you stood at the door, the memory cleared`,
    inFarm === 'farm_home' && !!fb && Math.hypot(fb.x - farmBackExpect.x, fb.y - farmBackExpect.y) < 2 && back === 'wheel'
      && after.log.join() === ['wheel', 'farm_home', 'town', 'wheel'].join() && dist < 80 && after.farmBack === null,
    { inFarm, fb, farmBackExpect, back, after, dist });

  /* the other way into the farm: Feed & Seed's panel */
  const fs = byId.feedseed;
  await standAt(fs.x, fs.y + 30);
  await settle((q) => q.at === 'feedseed' && q.btn, 4000);
  const fsFrom = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
  await P.page.evaluate(() => { window.__zoneLog = []; let last = null; window.__zoneLogT = setInterval(() => { const S = window._gameState.current; if (S && S.currentZone !== last) { last = S.currentZone; window.__zoneLog.push(S.currentZone); } }, 60); });
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /Visit Your Farm/.test(q.textContent || '')); if (b) b.click(); });
  const inFarm2 = await waitZone((z) => z === 'farm_home', 15000);
  await leaveFarm();
  const back2 = await waitZone((z) => z === 'wheel', 60000);
  await P.page.waitForTimeout(1500);
  const after2 = await P.page.evaluate(() => { const S = window._gameState.current; clearInterval(window.__zoneLogT); return { log: window.__zoneLog, x: S.player.x, y: S.player.y }; });
  rec.ok(`...and the same from Feed & Seed's "Visit Your Farm" (${after2.log.join(' → ')}, ${Math.round(Math.hypot(after2.x - fsFrom.x, after2.y - fsFrom.y))} px from its door)`,
    inFarm2 === 'farm_home' && back2 === 'wheel' && after2.log.join() === ['wheel', 'farm_home', 'town', 'wheel'].join() && Math.hypot(after2.x - fsFrom.x, after2.y - fsFrom.y) < 80,
    { inFarm2, back2, after2, fsFrom });
  await shot(P, 'farm-back');

  /* ── 8. clean ── */
  stopAlive = true;
  const errs = (P.logs || []).filter((l) => /pageerror|app\.render threw/.test(l));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
}
