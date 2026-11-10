/* ═══ A RELAUNCH MID-FIGHT TAKES OVER THE BODY WHERE IT STANDS (v2.3.4455) ═══
 * (server/src/bodytake.js, src/game/bodyPlace.js, docs/specs/pvp-fights.md
 * "Leaving in the middle of a fight")
 *
 * The owner: "So yes do the take over body message".  Two real players
 * against a real worker, out on No man's land's first ring (mp-linger's
 * setup):
 *   1. the raider's swing lands on the wanderer;
 *   2. with the wanderer's page STILL OPEN, the same character opens the game
 *      in a second browser (its key and its device): no "still in that fight"
 *      screen -- it lands in the world at the body, not in BroTown's square;
 *   3. the worker kept the body: where it stood, its health, its bag and gold
 *      as the phone showed them before; the phone's first move there is its
 *      answer (the wait is over);
 *   4. the first page is told another window took over;
 *   5. the raider's swing lands on the body after the takeover;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/bodytake-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 1000, height: 780 };
const RESUME_PX = 300;   /* server/src/linger.js LINGER.RESUME_PX */

const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
}, id);

async function swingAt(A, id) {
  const pt = await peerOnScreen(A, id);
  if (!pt) return false;
  await A.page.mouse.move(pt.x, pt.y - 4);
  await A.page.waitForTimeout(60);
  await A.page.mouse.down();
  await A.page.waitForTimeout(220);
  await A.page.mouse.up();
  await A.page.waitForTimeout(450);
  return true;
}

/* walk the raider until the worker has the two within reach (mp-duel's) */
async function closeIn(A, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 16; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false, why: 'no server state' };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    if (d <= want) return { ok: true, d: Math.round(d) };
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, (d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  return { ok: false };
}

const inWheel = async (P) => {
  for (let i = 0; i < 120; i++) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone)).catch(() => null);
    if (z === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
};

/* what the second browser sends and hears, in order, from before the game
   loads (the readout for a failure): its joins (did it say `tb`?), the
   worker's answers, and each close */
const RECORDER = `(() => {
  window.__btBodyLog = [];
  const W = window.WebSocket;
  const log = (o) => { const S = window._gameState && window._gameState.current; o.at = Date.now(); o.z = S && S.currentZone; window.__btBodyLog.push(o); };
  window.WebSocket = function (u, p) {
    const w = p ? new W(u, p) : new W(u);
    const send = w.send.bind(w);
    w.send = (d) => { try { const m = JSON.parse(d); if (m && m.type === 'join') log({ t: 'JOIN', tb: m.tb }); } catch (_) {} return send(d); };
    w.addEventListener('message', (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m && /^(body_place|linger_wait|state_sync|join_rejected)$/.test(m.type)) log({ t: m.type, bodyPlace: m.bodyPlace });
      } catch (_) {}
    });
    w.addEventListener('close', (e) => log({ t: 'close', code: e.code, reason: e.reason }));
    return w;
  };
  window.WebSocket.prototype = W.prototype;
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
})();`;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `bodytake-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, world: 'wheel', viewport: VIEW });
  const B = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const okA = await inWheel(A), okB = await inWheel(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  const phraseB = await B.page.evaluate(() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } });
  /* v2.3.3344: and its device -- the relaunch below is the same player on the
     same phone (a character's key works only on its devices: devicelock.js) */
  const { device: deviceB } = await H.keyAndDevice(B);
  rec.ok('setup: both in the Wheel, the wanderer\'s Login Key known (guard)', okA && okB && !!phraseB, { okA, okB, phrase: !!phraseB });
  if (!(okA && okB && phraseB)) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* real input on a loop on both: a page logs itself out after two minutes
     without any (Control does nothing in the game); B's stops when it closes */
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }
  const errorsA = A.logs, errorsBefore = A.logs.length;

  /* armed the game's way (mp-nomansland): tut_1 pays a greatsword */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await A.page.waitForTimeout(1800);
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg; if (!R || !S.channel) return;
    const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (i < 0) return;
    R.weapon = R.weaponStash[i]; R.weaponStash.splice(i, 1); R.activeSlot = 'melee';
    S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } });
  });
  await A.page.waitForTimeout(1500);
  await H.devOp(wsPort, 'quests', idA);
  await H.devOp(wsPort, 'quests', idB);

  /* ── out to a quiet spot on a Lv 6-10 ring, untouchable on the way ── */
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 6 });
  /* v2.3.3315: the Wheel the worker plays, and No man's land's rings as wide
     as its stretches (TRAPS §196; mp-nomansland's) */
  const LONG = (await H.wheelGeom()).long;
  const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
  const T = NML.TIER * LONG;
  const monsterPts = [];
  for (const k of Object.keys(WHEEL_SPAWNS)) {
    for (const p of WHEEL_SPAWNS[k].points) monsterPts.push(p);
    for (const d of Object.values(WHEEL_SPAWNS[k].deeper || {})) for (const p of d.points) monsterPts.push(p);
  }
  const cands = [];
  for (const land of Object.keys(WHEEL_SPAWNS)) {
    const a = WHEEL_SPAWNS[land].anchor;
    const L = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
    const ux = (a[0] - WHEEL_CENTRE[0]) / L, uy = (a[1] - WHEEL_CENTRE[1]) / L;
    for (let r = Math.max(NML.SAFE_R || 0, NML.HUB + (NML.FIRST_TIER - 1) * T) + 160; r <= NML.HUB + NML.FIRST_TIER * T - 160; r += 50 * LONG) {   /* v2.3.3690: No man's land 1's ring, from the safe ground's edge (the Lv 1-5 tier; it was the Lv 6-10 one) */
      for (let lat = -600; lat <= 600; lat += 50) {
        const x = WHEEL_CENTRE[0] + ux * r - uy * lat, y = WHEEL_CENTRE[1] + uy * r + ux * lat;
        let md = Infinity;
        for (const p of monsterPts) md = Math.min(md, Math.hypot(p[0] - x, p[1] - y));
        cands.push({ land, x: Math.round(x), y: Math.round(y), md: Math.round(md) });
      }
    }
  }
  cands.sort((p, q) => q.md - p.md);
  const perLand = Object.create(null), tryList = [];
  for (const c of cands) { perLand[c.land] = (perLand[c.land] || 0) + 1; if (perLand[c.land] <= 2) tryList.push(c); }
  let spot = null;
  for (const c of tryList.slice(0, 12)) {
    await H.hopTo(A, c.x, c.y, { tries: 90 });
    await A.page.waitForTimeout(1500);
    const ok = await A.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
      const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 300).length;
      return { dry: dry(x, y) && dry(x + 50, y) && dry(x + 25, y), near };
    }, c);
    if (ok.dry && ok.near === 0) { spot = c; break; }
  }
  rec.ok(`setup: a dry, quiet spot on No man's land 1's ring (${spot ? spot.land : 'none'})`, !!spot, spot);
  if (!spot) { stopAlive = true; await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  await H.hopTo(B, spot.x + 50, spot.y, { tries: 90 });
  await B.page.waitForTimeout(2500);

  /* ── 1. a swing lands ── */
  await closeIn(A, wsPort, idA, idB, 60);
  await A.page.evaluate(() => { if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
  let asked = null;
  for (let i = 0; i < 4 && !asked; i++) {
    const at = await peerOnScreen(A, idB);
    if (at) await A.page.mouse.click(at.x, at.y - 4);
    await A.page.waitForTimeout(500);
    asked = await A.page.evaluate(() => {
      const el = document.querySelector('[data-nml-ask-attack]');
      if (!el) return null;
      const q = el.getBoundingClientRect();
      return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
    });
  }
  if (asked) await A.page.mouse.click(asked.x, asked.y);
  await A.page.waitForTimeout(500);
  await closeIn(A, wsPort, idA, idB, 34);
  await H.devOp(wsPort, 'vitals', idB, { heal: true, god: false });
  const hp0 = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  let hp1 = hp0;
  for (let i = 0; i < 8 && !(hp1 < hp0); i++) { await swingAt(A, idB); hp1 = ((await H.serverPlayer(wsPort, idB)) || {}).hp; }
  rec.ok(`1. the raider's swing lands: the wanderer's HP ${hp0} -> ${hp1}`, typeof hp0 === 'number' && hp1 < hp0, { asked: !!asked, hp0, hp1 });

  /* a bag to keep (two fish, the game's own dev lever) and the health low
     enough that a rebuild in town (full on the stairs) would show */
  await H.devOp(wsPort, 'fish', idB, { give: 'fish_trout', n: 2 });
  await H.devOp(wsPort, 'vitals', idB, { heal: false, hp: 40 });
  await B.page.waitForTimeout(1500);
  const bagOf = (P) => H.readState(P, (S) => {
    const inv = (S.rpg && S.rpg.inventory) || {};
    return { items: Object.values(inv).reduce((n, v) => n + (Number(v) || 0), 0), coins: (S.rpg && S.rpg.coins) || 0 };
  }).catch(() => null);
  const bag0 = await bagOf(B);
  const body0 = await H.serverPlayer(wsPort, idB);
  /* the fight's clock is the last hit's: one more just before the relaunch */
  await closeIn(A, wsPort, idA, idB, 34);
  let hpPre = (body0 || {}).hp;
  for (let i = 0; i < 6; i++) { await swingAt(A, idB); const h = ((await H.serverPlayer(wsPort, idB)) || {}).hp; if (h < hpPre) { hpPre = h; break; } }
  const bodyAt = await H.serverPlayer(wsPort, idB);

  /* ── 2. the same character in a second browser, the first still open ── */
  /* the fight goes on while the second browser starts (a slow box takes far
     longer than the 10 s a fight's clock runs from its last hit): a swing
     every few seconds, the health kept up so the body is not killed, until
     the second browser's join is in */
  let fighting = true, joinedAt = 0;
  const keepFighting = (async () => {
    while (fighting) {
      const h = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
      if (typeof h === 'number' && h < 60) await H.devOp(wsPort, 'vitals', idB, { heal: false, hp: 90 });
      await swingAt(A, idB).catch(() => {});
      for (let i = 0; i < 6 && fighting; i++) await new Promise((r) => setTimeout(r, 500));
    }
  })();
  const firstBefore = await B.page.evaluate(() => { const S = window._gameState && window._gameState.current; return S ? S._realtimeStatus : null; }).catch(() => null);
  console.log('[bodytake] the first page before the relaunch:', firstBefore, JSON.stringify(await H.serverPlayer(wsPort, idB).then((l) => l && { lingering: l.lingering, disconnected: l.disconnected })));
  /* the worker's side of the same moments: kept (bodyWait), lingering */
  const serverSide = [];
  let watchServer = true;
  const watchS = (async () => {
    let last = '', lastHp = null;
    while (watchServer) {
      const l = await H.serverPlayer(wsPort, idB).catch(() => null);
      const k = l ? `wait=${l.bodyWait ? 1 : 0} linger=${l.lingering ? 1 : 0} disc=${l.disconnected ? 1 : 0} z=${l.zone}` : 'gone';
      if (k !== last) { serverSide.push({ at: Date.now(), k, hp: l && l.hp, before: lastHp }); last = k; }
      lastHp = l && l.hp;
      await new Promise((r) => setTimeout(r, 250));
    }
  })();
  const t0 = Date.now();
  const B2 = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW, phrase: phraseB, device: deviceB, init: RECORDER });
  (async () => {
    for (let i = 0; i < 480 && fighting; i++) {
      const j = await B2.page.evaluate(() => { const S = window._gameState && window._gameState.current; return !!(S && S._serverCaps); }).catch(() => false);
      if (j) { joinedAt = Date.now(); break; }
      await new Promise((r) => setTimeout(r, 250));
    }
    fighting = false;
  })();
  let lingerSeen = false;
  const entering = H.enterWorld(B2, 120000).then(() => true).catch((e) => String(e));
  const spy = (async () => {
    for (let i = 0; i < 240; i++) {
      const s = await B2.page.evaluate(() => !!document.getElementById('bt-linger-wait')).catch(() => false);
      if (s) { lingerSeen = true; return; }
      if (await B2.page.evaluate(() => { const S = window._gameState && window._gameState.current; return !!(S && S.currentZone === 'wheel' && !S._zoneLoading); }).catch(() => false)) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  })();
  const inAgain = await entering;
  await spy;
  fighting = false;
  await keepFighting;
  const bodyAtJoin = await H.serverPlayer(wsPort, idB);
  const inW = inAgain === true ? await inWheel(B2) : false;
  await B2.page.waitForTimeout(2500);
  const me = await H.readState(B2, (S) => ({ x: S.player.x, y: S.player.y, z: S.currentZone, placed: S._bodyPlacedAt || 0, cap: !!(S._serverCaps && S._serverCaps.bodyTake) })).catch(() => null);
  const dMe = me && bodyAt ? Math.hypot(me.x - bodyAt.x, me.y - bodyAt.y) : null;   /* the body does not walk while it waits: where it stood is where it is */
  const heard = await B2.page.evaluate(() => window.__btBodyLog || null).catch(() => null);
  watchServer = false;
  await watchS;
  console.log('[bodytake] the second browser heard:', JSON.stringify(heard));
  console.log('[bodytake] the worker had the body:', JSON.stringify(serverSide));
  rec.ok(`2. the relaunch lands in the world (${Math.round((Date.now() - t0) / 1000)} s), no "still in that fight" screen`, inAgain === true && inW && !lingerSeen, { inAgain, inW, lingerSeen });
  rec.ok(`2. ...at the body (${dMe == null ? '-' : Math.round(dMe)} px from where it stood), told by the worker (caps.bodyTake, body_place)`,
    !!me && me.z === 'wheel' && dMe != null && dMe <= RESUME_PX && me.placed > 0 && me.cap, { me, bodyAt });
  await shot(B2, '2-at-body');

  /* ── 3. the body kept, and the phone's answer ── */
  /* a step, so the phone has certainly moved from where it landed */
  await B2.page.keyboard.down('d'); await B2.page.waitForTimeout(250); await B2.page.keyboard.up('d');
  await B2.page.waitForTimeout(1500);
  const after = await H.adminPlayer(wsPort, idB);
  const live = after.live || {};
  const bag1 = await bagOf(B2);
    /* the health at the moment of the takeover: the sample before it and the
     first after (a rebuild would come back with the record's, a stop in
     town with a full bar); after that the body heals out of a fight as any */
  const kept = serverSide.find((e) => /wait=1/.test(e.k));
  const maxHp = (after.rpg && after.rpg.maxHp) || 250;
  rec.ok(`3. the worker kept the body: in the Wheel, ${Math.round(Math.hypot(live.x - bodyAt.x, live.y - bodyAt.y))} px from where it stood, HP ${kept && kept.before} -> ${kept && kept.hp} across the takeover`,
    live.zone === 'wheel' && Math.hypot(live.x - bodyAt.x, live.y - bodyAt.y) <= RESUME_PX && !!kept && typeof kept.hp === 'number' && typeof kept.before === 'number'
      && Math.abs(kept.hp - kept.before) <= Math.ceil(maxHp * 0.05),
    { live, bodyAt, bodyAtJoin, joinedS: joinedAt ? Math.round((joinedAt - t0) / 1000) : null });
  rec.ok(`3. ...its bag and gold as the phone showed them (${bag0 && bag0.items} things, ${bag0 && bag0.coins} gold)`, !!bag0 && !!bag1 && bag1.items === bag0.items && bag1.coins === bag0.coins, { bag0, bag1 });
  rec.ok('3. ...and the phone\'s first move answered: the wait is over, no linger', live.bodyWait === 0 && !live.lingering && !live.disconnected, live);

  /* ── 4. the first page ── */
  const first = await B.page.evaluate(() => { const S = window._gameState && window._gameState.current; return S ? S._realtimeStatus : null; }).catch(() => null);
  rec.ok(`4. the first page is told another window took over (${first})`, first === 'superseded', first);
  await shot(B, '4-first');

  /* ── 5. the raider's swing lands after the takeover ── */
  await closeIn(A, wsPort, idA, idB, 34);
  /* No man's land asks "attack this player?" first, and the answer lasts
     30 s (step 1's): asked again here, minutes later */
  await closeIn(A, wsPort, idA, idB, 60);
  await A.page.evaluate(() => { if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
  for (let i = 0; i < 4; i++) {
    const at = await peerOnScreen(A, idB);
    if (at) await A.page.mouse.click(at.x, at.y - 4);
    await A.page.waitForTimeout(500);
    const ask = await A.page.evaluate(() => {
      const el = document.querySelector('[data-nml-ask-attack]');
      if (!el) return null;
      const q = el.getBoundingClientRect();
      return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
    });
    if (ask) { await A.page.mouse.click(ask.x, ask.y); await A.page.waitForTimeout(500); break; }
  }
  /* a hit is a drop between two readings (the body heals between swings out
     of reach: the first and last reading alone hid one) */
  let prev = ((await H.serverPlayer(wsPort, idB)) || {}).hp, hp5 = prev, hp6 = prev, landed = false;
  for (let i = 0; i < 8 && !landed; i++) {
    const ci = await closeIn(A, wsPort, idA, idB, 34);
    const pt = await peerOnScreen(A, idB);
    const sw = await swingAt(A, idB);
    const h = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
    if (i === 0) console.log('[bodytake] step 5:', JSON.stringify({ ci, pt, sw, h, seen: await A.page.evaluate((pid) => { const S = window._gameState.current; const o = S.others && S.others[pid]; return o ? { x: o.x, y: o.y, z: o.z || o.zone } : null; }, idB).catch(() => null), srv: await H.serverPlayer(wsPort, idB).then((l) => l && { x: l.x, y: l.y, z: l.zone }) }));
    if (typeof h === 'number' && typeof prev === 'number' && h < prev) { landed = true; hp5 = prev; hp6 = h; }
    prev = h;
  }
  rec.ok(`5. the raider's swing lands on the body taken over: ${hp5} -> ${hp6}`, landed, { hp5, hp6 });
  await shot(B2, '5-fight');

  const errs = errorsA.slice(errorsBefore).filter((l) => /pageerror/.test(l)).concat(B2.logs.filter((l) => /pageerror/.test(l)));
  rec.ok('6. no page errors', errs.length === 0, errs);
  stopAlive = true;
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
  await B2.ctx.close().catch(() => {});
}
