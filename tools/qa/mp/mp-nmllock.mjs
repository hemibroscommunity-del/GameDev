/* ═══ BEATEN BY THEM, NOT AGAIN FOR HALF AN HOUR, ON TWO SCREENS (v2.3.3770) ═══
 *
 * The owner, 2026-10-28: "a player attacks you (and gets red skulled) but you
 * kill him, he can't attack you for at least 30 minutes unless you approve of
 * letting him have another attack. A red skull disappears after dying but
 * the game should remember if the red skull player was killed by you", and
 * "...they can only pop up with a sword clash icon and question mark above
 * their head (once per minute)".
 *
 * Two real players on computers (wide) against a real worker, on No man's
 * land's first ring (mp-nmlask's quiet spot):
 *   1. the raider clicks the wanderer and the window's Attack chooses them:
 *      the raider red, the wanderer white;
 *   2. the wanderer hits back through its own window and kills the raider;
 *   3. the raider is locked out from the wanderer for about 30 minutes (both
 *      games told, nml_lock), and the raider's red skull went with the death;
 *   4. back beside the wanderer, the raider's click opens the window that
 *      says why ("Wanderer beat you." / "You can't attack them for N more
 *      minutes.") with ONE button, "Ask for a rematch"; the raider's swings
 *      do the wanderer nothing (the worker's HP);
 *   5. "Ask for a rematch": the sword clash and "?" over the raider's head on
 *      the WANDERER's screen alone, for about 5 s;
 *   6. asked again inside the minute: the button sends nothing, and an ask
 *      forged on the wire is refused by the worker (no new icon);
 *   7. the wanderer's window on the raider offers "Let Raider attack you
 *      again"; it lifts the lock on both screens, and the raider's click asks
 *      "Attack Wanderer?" again;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/nmllock-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 1000, height: 780 };

/* where on a page another player stands (the tap handler's own arithmetic,
   mp-nomansland's) */
const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
}, id);

/* a click on another player: on a computer the attack is a click, and the
   tap handler is the same one a phone's tap reaches */
async function clickPeer(P, id, holdMs = 60) {
  const pt = await peerOnScreen(P, id);
  if (!pt) return false;
  await P.page.mouse.move(pt.x, pt.y - 4);
  await P.page.waitForTimeout(60);
  await P.page.mouse.down();
  await P.page.waitForTimeout(holdMs);
  await P.page.mouse.up();
  await P.page.waitForTimeout(450);
  return true;
}

/* put P's boots `gap` px west of where the WORKER has `otherId` */
async function standBeside(P, wsPort, otherId, gap = 30) {
  const o = await H.serverPlayer(wsPort, otherId);
  if (!o) return false;
  await H.hopTo(P, o.x - gap, o.y, { tries: 30, step: 60 });
  await P.page.waitForTimeout(700);
  return true;
}

/* walk P until the WORKER has the two within `want` px (mp-nomansland's) */
async function closeIn(P, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 16; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false, why: 'no server state' };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    if (d <= want) return { ok: true, d: Math.round(d) };
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await P.page.keyboard.down(key);
    await P.page.waitForTimeout(Math.min(500, Math.max(90, (d - want) * 2.2)));
    await P.page.keyboard.up(key);
    await P.page.waitForTimeout(320);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

/* the window as the page has it: the store and the DOM, and the badge under it */
/* a real tap (touch) or click (mouse) on the window's button, at its middle */
async function tapAsk(P, which, mouse = false) {
  /* v2.3.3770: waits (up to 8 s) for the button to be the top thing at its
     middle -- the codex's "New monster" banner (the monsters clearNear
     takes) came down over the window and took the click */
  let at = null;
  for (let i = 0; i < 40; i++) {
    at = await P.page.evaluate((w) => {
      const b = document.querySelector('[data-nml-ask-' + w + ']');
      if (!b) return null;
      const q = b.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, t = document.elementFromPoint(x, y);
      return { x, y, clear: !!t && (t === b || b.contains(t)) };
    }, which);
    if (!at || at.clear) break;
    await P.page.waitForTimeout(200);
  }
  if (!at) return false;
  if (mouse) await P.page.mouse.click(at.x, at.y);
  else await P.page.touchscreen.tap(at.x, at.y);
  return true;
}

/* HOLD the attack aimed at another player for up to `ms` (mp-bowprops's way:
   the right stick's aim, S._aiming / _aimAngle, and the game's own fire),
   letting go as soon as `stopWhen()` says so -- every shot the game fires
   counted (its player_projectile relay), and every player_attack it sends */
const holdAt = (P, pid, ms, stopOnAsk) => P.page.evaluate(({ pid, ms, stopOnAsk }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const ch = S.channel;
  if (ch && !ch.__nmlCounted) {
    const send = ch.send.bind(ch);
    ch.send = (m) => {
      try {
        if (m && m.event === 'player_projectile') window.__nmlShots = (window.__nmlShots || 0) + 1;
        if (m && m.event === 'player_attack') window.__nmlAttacks = (window.__nmlAttacks || 0) + 1;
      } catch (e) { /* counting only */ }
      return send(m);
    };
    ch.__nmlCounted = true;
  }
  const shots0 = window.__nmlShots || 0, atk0 = window.__nmlAttacks || 0;
  const t0 = performance.now();
  S.lockedTarget = null; S.swingTimer = 0;
  const aim = () => {
    const o = S.others && S.others[pid];
    if (!o) return;
    const tx = o.renderX != null ? o.renderX : o.x, ty = (o.renderY != null ? o.renderY : o.y) - 24;
    const a = Math.atan2(ty - S.player.y, tx - S.player.x);
    S._aimAngle = a; S._lastAimAngle = a; S._aiming = true; S.autoAttack = true;
  };
  const tick = () => {
    aim();
    const t = performance.now() - t0;
    const asked = !!(window.__btNmlAsk && window.__btNmlAsk.current());
    if (t >= ms || (stopOnAsk && asked)) {
      S.autoAttack = false; S._aiming = false;
      /* the bolts already in the air fly on: give them a moment, counted */
      setTimeout(() => resolve({ ms: Math.round(t), shots: (window.__nmlShots || 0) - shots0, attacks: (window.__nmlAttacks || 0) - atk0, asked }), 900);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { pid, ms, stopOnAsk });


/* the window as the page has it (mp-nmlask's readAsk, the parts read here) */
const askNow = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-nml-ask]');
  if (!el) return null;
  const txt = (sel) => { const n = el.querySelector(sel); return n ? n.textContent.trim() : null; };
  return {
    why: el.getAttribute('data-nml-ask'), id: el.getAttribute('data-nml-ask-id'),
    name: txt('[data-nml-ask-name]'), locked: txt('[data-nml-ask-locked]'), text: el.textContent.replace(/\s+/g, ' ').trim(),
    btns: Array.from(el.querySelectorAll('button')).filter((b) => !b.hasAttribute('data-nml-ask-info')).map((b) => b.textContent.trim()),
  };
});
async function waitFor(P, fn, arg, ms = 6000) {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < ms) {
    v = await P.page.evaluate(fn, arg).catch(() => null);
    if (v && v.ok) return v;
    await P.page.waitForTimeout(200);
  }
  return v;
}
/* open the window about `id` with real clicks on them (up to 4 tries) */
async function clickAsk(P, id, wsPort, pid) {
  let a = null;
  for (let i = 0; i < 4 && !a; i++) {
    if (wsPort) await clearNear(P, wsPort, pid);
    const pt = await peerOnScreen(P, id);
    const diag = await P.page.evaluate(([pid, pt]) => {
      const S = window._gameState.current, o = S.others && S.others[pid];
      const top = pt ? document.elementFromPoint(pt.x, pt.y - 4) : null;
      return { pt, top: top ? top.tagName + '.' + (typeof top.className === 'string' ? top.className.split(' ')[0] : '') : null,
        d: o ? Math.round(Math.hypot(o.x - S.player.x, o.y - S.player.y)) : null, lock: S.lockedTarget ? S.lockedTarget.type + ':' + S.lockedTarget.id : null,
        vw: innerWidth, vh: innerHeight };
    }, [id, pt]);
    await clickPeer(P, id);
    for (let k = 0; k < 10 && !a; k++) { a = await askNow(P); if (!a) await P.page.waitForTimeout(150); }
    if (!a) console.log('    click raised nothing: ' + JSON.stringify(diag));
  }
  return a;
}
/* the monsters within 600 px of P, gone (the Test panel's /dev/hurt): a
   wandering Lv 4 drifting onto the spot took the first click (a computer's
   click on a player is a swing, and the swing locked the monster) */
async function clearNear(P, wsPort, pid) {
  const ids = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - S.player.x, m.y - S.player.y) < 600).map((m) => m.id);
  });
  for (const id of ids) await H.devOp(wsPort, 'hurt', pid, { id, dmg: 10000000 });
  await P.page.evaluate(() => { const S = window._gameState.current; if (S.lockedTarget && S.lockedTarget.type === 'monster') S.lockedTarget = null; });
  return ids.length;
}
/* the locks a game holds: [[id, ms left]] each way (noMansLand.js applyNmlLock) */
const locksOf = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, L = S._nmlLocks, now = Date.now();
  const rows = (m) => (m instanceof Map ? Array.from(m.entries()).filter(([, t]) => t > now).map(([k, t]) => [k, t - now]) : []);
  return { out: L ? rows(L.out) : [], in: L ? rows(L.in) : [] };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `nmllock-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, world: 'wheel', viewport: VIEW, wide: true });
  const B = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW, wide: true, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.nomansland && S._serverCaps.party && S._serverCaps.nmllock));
  const handle = await A.page.evaluate(() => !!window.__btNmlAsk && !window.__btNmlAsk.off);
  rec.ok('setup: both in the Wheel, the worker advertises No man\'s land, parties and the lock (caps.nmllock), the asking is on', okA && okB && caps && handle, { okA, okB, caps, handle });
  if (!(okA && okB && caps && handle)) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* real input on a loop on both: a page logs itself out after two minutes
     without any (Control does nothing in the game) */
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }

  /* past the Mayor's gate, the same for both (mp-nomansland's way), and a
     staff and a greatsword for each (the dev kit) */
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
  }
  await A.page.waitForTimeout(1800);
  await H.devOp(wsPort, 'quests', idA);
  await H.devOp(wsPort, 'quests', idB);
  const kitA = await H.devOp(wsPort, 'kit', idA, { what: 'weapons' });
  const kitB = await H.devOp(wsPort, 'kit', idB, { what: 'weapons' });
  await A.page.waitForTimeout(2000);
  const lv = async () => [((await H.serverPlayer(wsPort, idA)) || {}).level, ((await H.serverPlayer(wsPort, idB)) || {}).level];
  const lvls = await lv();
  rec.ok(`setup: the dev kit armed both, and their levels are within one (${lvls.join(' / ')})`,
    !!kitA && kitA.ok && !!kitB && kitB.ok && typeof lvls[0] === 'number' && Math.abs(lvls[0] - lvls[1]) <= 1, { kitA, kitB, lvls });

  /* ── the walk out, untouchable ── */
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 8 });
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
  /* places on the Lv 6-10 ring (No man's land 1: 3,789 to 4,813 px out),
     inside a spoke, furthest from any monster's place first */
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
        cands.push({ land, x: Math.round(x), y: Math.round(y), md: Math.round(md), ux, uy });
      }
    }
  }
  cands.sort((p, q) => q.md - p.md);
  const perLand = Object.create(null), tryList = [];
  for (const c of cands) {
    perLand[c.land] = (perLand[c.land] || 0) + 1;
    if (perLand[c.land] <= 2) tryList.push(c);
  }
  let spot = null;
  for (const c of tryList.slice(0, 12)) {
    await H.hopTo(A, c.x, c.y, { tries: 90 });
    await A.page.waitForTimeout(1500);
    /* dry, clear, and no monster near, for the raider AND the wanderer 70 px east */
    const ok = await A.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
      const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 300).length;
      let clear = true;
      for (let k = 0; k <= 70; k += 10) clear = clear && dry(x + k, y);
      return { dry: clear, near };
    }, c);
    if (ok.dry && ok.near === 0) { spot = c; break; }
    console.log('    spot refused: ' + JSON.stringify({ c, ok }));
  }
  rec.ok(`setup: a dry, quiet spot on No man's land 1's ring (${spot ? `${spot.land} ${spot.x},${spot.y}` : 'none'})`, !!spot, spot);
  if (!spot) { stopAlive = true; await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  await H.hopTo(B, spot.x + 70, spot.y, { tries: 90 });
  await B.page.waitForTimeout(2500);
  const here = await H.readState(A, (S) => S._nmlLevel || 0);
  const hereB = await H.readState(B, (S) => S._nmlLevel || 0);
  /* v2.3.3767: the number is the step (Lv 1-5 on the first ring), not 1 */
  rec.ok(`setup: both stand on No man's land's first ring (${here} / ${hereB})`, here >= 1 && here <= 5 && hereB >= 1 && hereB <= 5, { here, hereB });
  /* the wanderer can be hurt again (the HP the worker keeps is the proof) */
  await H.devOp(wsPort, 'vitals', idB, { heal: true, god: false });
  await H.devOp(wsPort, 'vitals', idA, { heal: true, god: false });
  await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  /* every window here waits 30 s, so one that goes quickly went by a button
     (step 8 shortens it on purpose) */
  for (const P of [A, B]) await P.page.evaluate(() => window.__btNmlAsk.setMs(30000));
  const hpB = async () => ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  const hpA = async () => ((await H.serverPlayer(wsPort, idA)) || {}).hp;


  /* ── 1. the raider chooses the wanderer ── */
  const eqA = await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  const eqB = await H.equipWeapon(B, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1500);
  await standBeside(A, wsPort, idB, 30);
  const a1 = await clickAsk(A, idB, wsPort, idA);
  const at1 = await tapAsk(A, 'attack', true);
  const sk1 = await waitFor(B, (aid) => { const S = window._gameState.current;
    return { ok: S._pvpSkullType === 'white' && !!S._nmlSelf && S._nmlSelf.by === aid, mine: S._pvpSkullType || null }; }, idA);
  const skA1 = await H.readState(A, (S) => S._pvpSkullType || null);
  rec.ok(`1. the raider's click asks ("${a1 && a1.name}") and its Attack chooses the wanderer: the raider ${skA1}, the wanderer ${sk1 && sk1.mine}`,
    eqA.ok && eqB.ok && !!a1 && (a1.why === 'tap' || a1.why === 'swing') && a1.id === idB && at1 && skA1 === 'red' && !!sk1 && sk1.ok, { eqA, eqB, a1, at1, skA1, sk1 });

  /* ── 2. the wanderer hits back, and kills the raider ── */
  /* on a computer a click on a player is a swing: the first asks (its window
     "Hit back"), and once chosen each click swings at them (mp-nomansland's
     swingAt, the real mouse) */
  await closeIn(B, wsPort, idB, idA, 34);
  const b2 = await clickAsk(B, idA, wsPort, idB);
  if (b2) await tapAsk(B, 'attack', true);
  await B.page.waitForTimeout(600);
  await H.instrumentWire(B);
  let dead = false;
  const trail = [];
  for (let i = 0; i < 10 && !dead; i++) {
    await H.devOp(wsPort, 'vitals', idA, { heal: true, hp: 1 });
    await closeIn(B, wsPort, idB, idA, 34);
    await clearNear(B, wsPort, idB);
    await clickPeer(B, idA, 220);
    await B.page.waitForTimeout(300);
    const sa = await H.serverPlayer(wsPort, idA);
    const st = await B.page.evaluate((aid) => { const S = window._gameState.current, o = S.others && S.others[aid];
      return { lock: S.lockedTarget ? S.lockedTarget.type + ':' + (S.lockedTarget.id === aid) : null, d: o ? Math.round(Math.hypot(o.x - S.player.x, o.y - S.player.y)) : null,
        w: S.rpg && S.rpg.equipment ? S.rpg.equipment.weapon : null, foe: S._nmlFoes instanceof Map && S._nmlFoes.has(aid), god: !!S._god }; }, idA);
    trail.push({ i, st, attacks: (await H.wireCounts(B)).player_attack || 0, hp: sa && sa.hp, dead: sa && sa.dead });
    dead = !!(sa && (sa.dead || sa.hp <= 0));
  }
  rec.ok(`2. the wanderer's window asks "${b2 && b2.name}", its Attack chooses the raider, and the swings kill them (the worker's)`,
    !!b2 && b2.id === idA && dead, { b2, trail });
  if (!dead) { stopAlive = true; await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* ── 3. the lock, and the red skull gone ── */
  const l3A = await waitFor(A, (bid) => { const S = window._gameState.current, L = S._nmlLocks, t = L && L.out instanceof Map ? (L.out.get(bid) || 0) - Date.now() : 0;
    return { ok: t > 0, t }; }, idB, 8000);
  const l3B = await waitFor(B, (aid) => { const S = window._gameState.current, L = S._nmlLocks, t = L && L.in instanceof Map ? (L.in.get(aid) || 0) - Date.now() : 0;
    return { ok: t > 0, t }; }, idA, 8000);
  rec.ok(`3. the raider is locked out from the wanderer for ${l3A && Math.round(l3A.t / 60000)} min, and the wanderer's game knows it (${l3B && Math.round(l3B.t / 60000)} min)`,
    !!l3A && l3A.ok && l3A.t > 29 * 60000 && l3A.t <= 30 * 60000 && !!l3B && l3B.ok && l3B.t > 29 * 60000, { l3A, l3B });
  /* back on their feet in BroTown (the world's respawn) */
  let alive = null;
  for (let i = 0; i < 40; i++) {
    const sa = await H.serverPlayer(wsPort, idA);
    const cl = await H.readState(A, (S) => !S._dying && !!S.player && S.currentZone === 'wheel');
    if (sa && !sa.dead && sa.hp > 0 && cl) { alive = sa; break; }
    await A.page.waitForTimeout(500);
  }
  const red3 = await H.readState(A, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0 }));
  rec.ok(`3. the raider is back on their feet, and the red skull went with the death (${red3.mine}, ${red3.red} ms)`,
    !!alive && red3.mine !== 'red' && !red3.red, { alive: !!alive, red3 });

  /* ── 4. back beside them: the window says why ── */
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 4 });
  await H.hopTo(A, spot.x, spot.y, { tries: 90 });
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: false });
  await A.page.waitForTimeout(1500);
  await standBeside(A, wsPort, idB, 30);
  const a4 = await clickAsk(A, idB, wsPort, idA);
  await shot(A, '4-locked');
  rec.ok(`4. the raider's click on the wanderer says why: "${a4 && a4.text}"`,
    !!a4 && a4.why === 'locked' && a4.id === idB && /Wanderer beat you\./.test(a4.text) && /You can't attack them for (29|30) more minutes\./.test(a4.locked || '')
      && a4.btns.length === 1 && a4.btns[0] === 'Ask for a rematch', a4);
  /* its swings do nothing (the window held, the swings counted) */
  const hp4a = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; });
  await clearNear(A, wsPort, idA);
  const h4 = await holdAt(A, idB, 2500, false);
  await A.page.waitForTimeout(800);
  const hp4b = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  const lt4 = await H.readState(A, (S) => (S.lockedTarget ? S.lockedTarget.type + ':' + S.lockedTarget.id : null));
  rec.ok(`4. ...and the raider's swings at the wanderer do nothing: their HP ${hp4a} -> ${hp4b} (the worker's), nothing aimed at them`,
    typeof hp4a === 'number' && hp4b === hp4a && lt4 !== 'player:' + idB, { hp4a, hp4b, h4, lt4 });

  /* ── 5. the rematch's "?" on the wanderer's screen alone ── */
  await H.instrumentWire(A);
  let a5 = await askNow(A);
  if (!a5 || a5.why !== 'locked') a5 = await clickAsk(A, idB, wsPort, idA);
  const at5 = await tapAsk(A, 'rematch', true);
  const seen5 = await waitFor(B, (aid) => { const b = window.__btPeerBadge && window.__btPeerBadge[aid]; return { ok: !!(b && b.nmlAsk), b: b ? b.nmlAsk : null }; }, idA, 4000);
  await shot(B, '5-rematch');
  const w5 = (await H.wireCounts(A)).nml_lock_ask || 0;
  const self5 = await H.readState(A, (S) => (S._nmlAskMarks instanceof Map ? S._nmlAskMarks.size : 0));
  rec.ok(`5. "Ask for a rematch" (sent ${w5}): the sword clash and "?" over the raider's head on the wanderer's screen (${seen5 && seen5.b}), nothing on the raider's own (${self5})`,
    at5 && w5 === 1 && !!seen5 && seen5.ok && self5 === 0, { a5, at5, w5, seen5, self5 });
  const gone5 = await waitFor(B, (aid) => { const b = window.__btPeerBadge && window.__btPeerBadge[aid]; return { ok: !!b && !b.nmlAsk }; }, idA, 9000);
  rec.ok('5. ...and it goes by itself after a few seconds (the picture destroyed)', !!gone5 && gone5.ok, gone5);

  /* ── 6. inside the minute: nothing more ── */
  const a6 = await clickAsk(A, idB, wsPort, idA);
  await tapAsk(A, 'rematch', true);
  await A.page.waitForTimeout(800);
  const w6 = (await H.wireCounts(A)).nml_lock_ask || 0;
  /* a forged ask, straight on the wire: the worker holds the minute */
  await A.page.evaluate((bid) => { const S = window._gameState.current; S.channel.send({ type: 'nml_lock_ask', payload: { target: bid } }); }, idB);
  await B.page.waitForTimeout(2500);
  const m6 = await H.readState(B, (S) => (S._nmlAskMarks instanceof Map ? S._nmlAskMarks.size : 0));
  const b6 = await B.page.evaluate((aid) => { const b = window.__btPeerBadge && window.__btPeerBadge[aid]; return b ? b.nmlAsk : null; }, idA);
  rec.ok(`6. asked again inside the minute, the button sends nothing (${w6 - 1} more), and an ask forged on the wire shows the wanderer nothing (${b6})`,
    !!a6 && a6.why === 'locked' && w6 === 1 && m6 === 0 && b6 === false, { a6, w6, m6, b6 });

  /* ── 7. the wanderer lets them ── */
  /* the wanderer's fight with the raider (step 2) let end the real way, a
     quiet minute (mp-nmlask step 8's): a click on a live foe aims at once,
     with no window */
  await B.page.evaluate((aid) => {
    const S = window._gameState.current, old = Date.now() - 61000;
    S.lockedTarget = null;
    if (S._nmlFoes instanceof Map && S._nmlFoes.has(aid)) S._nmlFoes.set(aid, old);
    if (S._pvpBlows instanceof Map && S._pvpBlows.has(aid)) S._pvpBlows.set(aid, old);
  }, idA);
  await standBeside(B, wsPort, idA, 30);
  const b7 = await clickAsk(B, idA, wsPort, idB);
  await shot(B, '7-allow');
  const at7 = await tapAsk(B, 'allow', true);

  const l7A = await waitFor(A, (bid) => { const S = window._gameState.current, L = S._nmlLocks; return { ok: !(L && L.out instanceof Map && (L.out.get(bid) || 0) > Date.now()) }; }, idB, 5000);
  const l7B = await locksOf(B);
  rec.ok(`7. the wanderer's window on the raider offers "${b7 && b7.btns.find((t) => /attack you again/.test(t))}", and it lifts the lock on both screens`,
    !!b7 && b7.id === idA && b7.btns.includes('Let Raider attack you again') && at7 && !!l7A && l7A.ok && !l7B.in.some(([k]) => k === idA), { b7, at7, l7A, l7B });
  await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; });
  await standBeside(A, wsPort, idB, 30);
  const a7 = await clickAsk(A, idB, wsPort, idA);
  rec.ok(`7. ...and the raider's click asks "${a7 && a7.name}" again, with Attack`,
    !!a7 && a7.why === 'tap' && a7.id === idB && a7.btns[0] === 'Attack', a7);

  stopAlive = true;
  const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`8. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
