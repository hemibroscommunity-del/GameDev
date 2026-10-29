/* ═══ "ATTACK <NAME>?" ON TWO SCREENS (v2.3.3253) ═══
 *
 * Owner, 2026-10-14: "I don't necessarily want stray projectiles to hit
 * another player and have a red skull appear above the player just for that.
 * I want attacking other players to be intentional.  Maybe if a stray
 * projectile hits a player a one time window pops up asking if you want to
 * attack the player with a red skull appearing on the window and a tiny
 * information icon next to it.  I want the window itself to be small.  The
 * window can say attack, party, or ignore.  The window won't pop up again.
 * Tapping on the player while they're in the no man's land can still have the
 * party and attack (with red skull) options there."
 *
 * Two real players against a real worker, out on a land's Lv 6-10 ring (No
 * man's land 1); the raider on a 390 px TOUCH phone (every tap a real touch),
 * the wanderer on a computer (every click a real mouse):
 *   1. the raider's REAL staff bolts fly through the wanderer (no aim): they
 *      do nothing to them (no player_attack, the worker's HP unchanged, no
 *      skull) and the small window asks: "Attack Wanderer?", the red skull
 *      with its (i), Attack / Party / Ignore;
 *   2. it is small (at most 272 px wide, its buttons 40 px tall) and sits at
 *      the TOP, under the minimap -- clear of both thumbs' controls (the
 *      attack disc, the sprint button, the badge): over the badge, its Attack
 *      sat where a left thumb comes down to steer;
 *   3. Ignore lets it go, and more bolts through the wanderer ask nothing
 *      (once per player) and still do nothing;
 *   4. a TAP on the wanderer asks again (and does not aim); the (i) opens No
 *      man's land's explainer, the window staying under it;
 *   5. Party sends the party invite, and the wanderer is asked to join;
 *   5b. on the computer too: the wanderer clicks the raider and the window
 *      asks, nothing over it (the keyboard hints step aside), Ignore works;
 *   6. a tap, then Attack: the raider AIMS (the `nml` lock, "TARGET"), and
 *      (v2.3.3530) both skulls come WITH the choice, before any blow -- the
 *      raider red, the wanderer white, told by whom (nml_skull `by`), its HP
 *      untouched; then a swing lands;
 *   7. (v2.3.3528) HITTING BACK GOES THROUGH THE WINDOW TOO -- the owner:
 *      "keep the behavior of needing to confirm the "attack" button that pops
 *      up in the window first before any damage is registered to either
 *      player".  The wanderer, attacked, swings back with nothing locked (it
 *      pressed Ignore on the raider in 5b: the raider's attack is a new
 *      question): "Hit back Raider?" with the WHITE skull, the swing doing
 *      nothing until it is answered; Attack chooses the raider, and with the
 *      lock let go the swings land, no red skull;
 *   8. a window left alone goes by itself (the QA handle's setMs), and one
 *      whose player walks out of No man's land goes at once;
 *   9. held SIDEWAYS (844 x 390) the window sits beside the minimap, inside
 *      the world's own window, clear of the thumbs' controls and of you;
 *  10. no page errors.
 *   0. (v2.3.3316, first) the owner: "Attacks without locking on target did
 *      not pop up the window for attack ignore etc."  A SWORD swing at the
 *      wanderer with nothing locked asks ("swing"), and does them nothing; left
 *      alone it goes, unanswered, and swings in the next 15 s ask nothing --
 *      then one asks again; Ignore is an answer, and no swing asks after it.
 * Pictures: tools/qa/mp/out/nmlask-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
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

/* a real touch on another player (a phone: the touch zones forward it to
   the same tap handler, mp-beastmaster's way) */
async function tapPeer(P, id) {
  const pt = await peerOnScreen(P, id);
  if (!pt) return false;
  await P.page.touchscreen.tap(pt.x, pt.y - 4);
  await P.page.waitForTimeout(450);
  return true;
}

/* what was under the finger and round it, for a tap that raised nothing (a
   wandering monster, a resource, the chat circle): the game's own tap log
   (window.__broTapLog, captured from the console), the topmost element, the
   monsters near the tap on the screen, a harvest, the lock */
const tapDiag = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return { none: true };
  const r = cv.getBoundingClientRect();
  const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  const x = r.left + ((o.renderX != null ? o.renderX : o.x) - S.camera.x) * sx, y = r.top + ((o.renderY != null ? o.renderY : o.y) - S.camera.y) * sy - 4;
  const top = document.elementFromPoint(x, y);
  const desc = (n) => (n ? n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.split(' ').join('.') : '') + Array.from(n.attributes || []).filter((a) => /^data-/.test(a.name)).map((a) => '[' + a.name + ']').join('') : null);
  const mons = (S.monsters || []).filter((m) => m && m.alive).map((m) => ({ id: m.id, d: Math.round(Math.hypot(r.left + (m.x - S.camera.x) * sx - x, r.top + (m.y - S.camera.y) * sy - y)) })).filter((m) => m.d < 160);
  return { x: Math.round(x), y: Math.round(y), top: desc(top), mons, extraction: !!S._extraction, lock: S.lockedTarget ? S.lockedTarget.type + ':' + S.lockedTarget.id : null,
    chat: !!document.querySelector('[data-chat-dismiss]'), touchAge: S._touchHandledAt ? Date.now() - S._touchHandledAt : null, inspect: !!document.querySelector('.bt-inspect'),
    me: Math.round(Math.hypot((S.player.x - o.x), (S.player.y - o.y))), tapLog: (window.__nmlTapLog || []).slice(-6) };
}, id);

/* a phone's swing at the one it aims at: the attack held (S.autoAttack, the
   game's own attack loop, mp-bowprops's way) for `ms` */
const swingLocked = (P, ms) => P.page.evaluate((ms) => new Promise((resolve) => {
  const S = window._gameState.current;
  S.autoAttack = true;
  setTimeout(() => { S.autoAttack = false; resolve(true); }, ms);
}), ms);

/* v2.3.3819: the monsters within 600 px of P, gone (the Test panel's
   /dev/hurt, mp-nmllock's): a Lv 4 wandering onto the spot took the
   wanderer's hit-back in step 7 (its sword's automatic target locked the
   monster, and no window asked) */
async function clearNear(P, wsPort, pid) {
  const ids = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - S.player.x, m.y - S.player.y) < 600).map((m) => m.id);
  });
  for (const id of ids) await H.devOp(wsPort, 'hurt', pid, { id, dmg: 10000000 });
  await P.page.evaluate(() => { const S = window._gameState.current; if (S.lockedTarget && S.lockedTarget.type === 'monster') S.lockedTarget = null; });
  return ids.length;
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
const readAsk = (P) => P.page.evaluate(() => {
  const h = window.__btNmlAsk;
  const el = document.querySelector('[data-nml-ask]');
  const r = el && el.getBoundingClientRect();
  const badge = document.querySelector('[data-nml-badge]');
  const br = badge && badge.getBoundingClientRect();
  const S = window._gameState.current, lt = S.lockedTarget;
  return {
    cur: h ? h.current() : null,
    asked: h ? h.asked() : [],
    dom: el ? {
      why: el.getAttribute('data-nml-ask'), id: el.getAttribute('data-nml-ask-id'),
      name: ((el.querySelector('[data-nml-ask-name]') || {}).textContent || '').trim(),
      l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height),
      skull: !!el.querySelector('[data-nml-ask-info] svg'), info: !!el.querySelector('[data-nml-ask-info]'),
      /* v2.3.3528: hitting back -- the attribute, and the skull's own colour */
      back: el.getAttribute('data-nml-ask-back') === '1',
      fill: ((el.querySelector('[data-nml-ask-info] svg path') || { getAttribute: () => null }).getAttribute('fill') || '').toUpperCase(),
      btns: Array.from(el.querySelectorAll('button')).filter((b) => !b.hasAttribute('data-nml-ask-info'))
        .map((b) => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: Math.round(q.width), h: Math.round(q.height), top: Math.round(q.top), bottom: Math.round(q.bottom) }; }),
    } : null,
    badge: br ? { t: Math.round(br.top), b: Math.round(br.bottom), l: Math.round(br.left), r: Math.round(br.right) } : null,
    at: el ? el.getAttribute('data-nml-ask-at') : null,
    stacked: el ? el.getAttribute('data-nml-ask-stacked') === '1' : false,
    invite: (() => { const n = document.querySelector('[data-party-invite]'); if (!n) return null; const q = n.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; })(),
    mini: window.__btWheelMini ? { t: window.__btWheelMini.top, b: window.__btWheelMini.top + window.__btWheelMini.h, l: window.__btWheelMini.left } : null,
    /* the thumbs' controls on the screen: the attack disc, the sprint button,
       the badge -- every one drawn (a hidden one has no size or is see-through) */
    controls: ['[data-ricon]', '[data-sprint]', '[data-nml-badge]'].map((sel) => {
      const n = document.querySelector(sel);
      if (!n) return null;
      const q = n.getBoundingClientRect();
      if (!(q.width > 0 && q.height > 0)) return null;
      return { sel, t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) };
    }).filter(Boolean),
    vw: innerWidth, vh: innerHeight,
    lock: lt ? { type: lt.type, id: lt.id, nml: !!lt.nml } : null,
  };
});
async function waitAsk(P, pred, ms = 6000) {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < ms) {
    v = await readAsk(P);
    if (pred(v)) return v;
    await P.page.waitForTimeout(150);
  }
  return v;
}

/* what is on top at the middle of each of the window's buttons (a real tap
   lands on the topmost element: anything over the window would eat it) */
const topAtButtons = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-nml-ask]');
  if (!el) return null;
  return Array.from(el.querySelectorAll('button')).map((b) => {
    const q = b.getBoundingClientRect();
    const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    const desc = (n) => (n ? (n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').join('.') : '')
      + Array.from(n.attributes || []).filter((x) => /^data-/.test(x.name)).map((x) => '[' + x.name + ']').join('')) : null);
    return { btn: Object.keys(b.dataset).join(','), ok: !!top && (top === b || b.contains(top)), top: desc(top), up: top && top !== b && !b.contains(top) ? desc(top.parentElement) : null };
  });
});
/* a real tap (touch) or click (mouse) on the window's button, at its middle */
async function tapAsk(P, which, mouse = false) {
  const at = await P.page.evaluate((w) => {
    const b = document.querySelector('[data-nml-ask-' + w + ']');
    if (!b) return null;
    const q = b.getBoundingClientRect();
    return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
  }, which);
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

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `nmlask-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  /* the game's own tap log (BroTown.jsx window.__broTapLog), kept on the page
     for tapDiag */
  await A.page.addInitScript(() => { window.__broTapLog = true; });
  A.page.on('console', (m) => {
    const t = m.text();
    if (/\[tap-to-lock\]/.test(t)) A.page.evaluate((line) => { (window.__nmlTapLog = window.__nmlTapLog || []).push(line.slice(0, 300)); }, t).catch(() => {});
  });
  const B = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW, guest: true });
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
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.nomansland && S._serverCaps.party));
  const handle = await A.page.evaluate(() => !!window.__btNmlAsk && !window.__btNmlAsk.off);
  rec.ok('setup: both in the Wheel, the worker advertises No man\'s land and parties, the asking is on', okA && okB && caps && handle, { okA, okB, caps, handle });
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

  /* ── 0. v2.3.3316: a SWORD swing with nothing locked asks ── */
  const eqG0 = await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1500);
  await standBeside(A, wsPort, idB, 30);
  /* this window waits 4 s, so it can be read and then go by itself */
  await A.page.evaluate(() => window.__btNmlAsk.setMs(4000));
  const hp00 = await hpB();
  const h0 = await holdAt(A, idB, 5000, true);
  const a0 = await waitAsk(A, (v) => !!v.dom, 3000);
  const hp01 = await hpB();
  const sk0 = await H.readState(A, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0 }));
  console.log('    swing: ' + JSON.stringify({ eqG0, h0, a0: a0 && a0.dom }));
  rec.ok(`0. a SWORD swing at the wanderer with nothing locked asks: "${a0 && a0.dom && a0.dom.name}" (why: ${a0 && a0.dom && a0.dom.why})`,
    eqG0.ok && !!a0 && !!a0.dom && a0.dom.why === 'swing' && a0.dom.id === idB && a0.dom.name === 'Attack Wanderer?', { eqG0, h0, a0: a0 && a0.dom });
  rec.ok('0. ...and the swing does them nothing: no player_attack sent, the worker\'s HP unchanged, no skull',
    h0.attacks === 0 && typeof hp00 === 'number' && hp01 === hp00 && !sk0.mine && !sk0.red, { h0, hp00, hp01, sk0 });
  await shot(A, '0-swing');
  const a0b = await waitAsk(A, (v) => !v.dom, 9000);
  const re0 = await A.page.evaluate((bid) => {
    const S = window._gameState.current;
    return { asked: S._nmlAsked instanceof Set && S._nmlAsked.has(bid),
      again: S._nmlAskAgain instanceof Map && S._nmlAskAgain.has(bid) ? S._nmlAskAgain.get(bid) - Date.now() : null };
  }, idB);
  rec.ok(`0. left alone it goes by itself, UNANSWERED: not counted as asked, so a later blow may ask again (in ${re0.again} ms)`,
    !!a0b && !a0b.dom && !re0.asked && typeof re0.again === 'number' && re0.again > 5000 && re0.again <= 15000, { a0b: a0b && !!a0b.dom, re0 });
  const h0b = await holdAt(A, idB, 2500, true);
  rec.ok('0. ...but not straight away: swings in the quiet that follows ask nothing, and do nothing',
    !h0b.asked && h0b.attacks === 0 && (await hpB()) === hp00, h0b);
  /* the quiet aged past (15 s of waiting is the only difference) */
  await A.page.evaluate((bid) => { const S = window._gameState.current; if (S._nmlAskAgain instanceof Map) S._nmlAskAgain.set(bid, Date.now() - 1); }, idB);
  await A.page.evaluate(() => window.__btNmlAsk.setMs(30000));
  const h0c = await holdAt(A, idB, 5000, true);
  const a0c = await waitAsk(A, (v) => !!v.dom, 3000);
  rec.ok(`0. ...after it a swing asks again (why: ${a0c && a0c.dom && a0c.dom.why})`, !!a0c && !!a0c.dom && a0c.dom.why === 'swing' && a0c.dom.id === idB && h0c.attacks === 0, { h0c, a0c: a0c && a0c.dom });
  await tapAsk(A, 'ignore');
  const a0d = await waitAsk(A, (v) => !v.dom, 6000);
  const h0d = await holdAt(A, idB, 2500, true);
  rec.ok('0. Ignore is an answer: the window goes, and more swings at the wanderer ask nothing and do nothing',
    !!a0d && !a0d.dom && !h0d.asked && h0d.attacks === 0 && (await hpB()) === hp00, { a0d: a0d && !!a0d.dom, h0d });
  /* the rest of this scenario starts from a wanderer never asked about (a
     test's reset, as step 8 ages the fight's clocks) */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._nmlAsked instanceof Set) S._nmlAsked.clear();
    if (S._nmlAskAgain instanceof Map) S._nmlAskAgain.clear();
    S.autoAttack = false; S._aiming = false;
  });
  await A.page.waitForTimeout(600);

  /* ── 1. stray bolts ask, and do nothing ── */
  const eqS = await H.equipWeapon(A, 'staff', 'staffWeapon', 'staff');
  await A.page.waitForTimeout(1500);
  const hp0 = await hpB();
  const h1 = await holdAt(A, idB, 6000, true);
  const a1 = await waitAsk(A, (v) => !!v.dom, 3000);
  await A.page.waitForTimeout(800);
  const hp1 = await hpB();
  const sk1 = await H.readState(A, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0 }));
  console.log('    stray: ' + JSON.stringify({ eqS, h1, a1: a1 && a1.dom }));
  rec.ok(`1. the raider's staff bolts fly through the wanderer, aimed at nobody (${h1.shots} fired)`, eqS.ok && h1.shots >= 1, { eqS, h1 });
  rec.ok('1. ...they do the wanderer nothing: no player_attack sent, the worker\'s HP unchanged, no skull',
    h1.attacks === 0 && typeof hp0 === 'number' && hp1 === hp0 && !sk1.mine && !sk1.red, { h1, hp0, hp1, sk1 });
  rec.ok(`1. ...and the small window asks, once: "${a1 && a1.dom && a1.dom.name}" (why: ${a1 && a1.dom && a1.dom.why})`,
    !!a1 && !!a1.dom && a1.dom.why === 'shot' && a1.dom.id === idB && a1.dom.name === 'Attack Wanderer?' && a1.asked.includes(idB), a1);
  rec.ok(`1. ...with the red skull and its tiny (i), and three buttons: ${a1 && a1.dom && a1.dom.btns.map((b) => b.t).join(' / ')}`,
    !!a1 && !!a1.dom && a1.dom.skull && a1.dom.info && a1.dom.btns.map((b) => b.t).join('|') === 'Attack|Party|Ignore', a1 && a1.dom);
  await shot(A, '1-stray');

  /* ── 2. small, at the top ── */
  const d = a1 && a1.dom, mini = a1 && a1.mini;
  const hits = (q) => !!d && !(q.r <= d.l || q.l >= d.r || q.b <= d.t || q.t >= d.b);
  rec.ok(`2. it is small: ${d && d.w} x ${d && d.h} px, on the screen`,
    !!d && d.w <= 272 && d.h <= 110 && d.l >= 8 && d.r <= a1.vw - 8 && d.t > 0, { d, vw: a1 && a1.vw });
  rec.ok(`2. ...at the top, under the minimap (${a1 && a1.at}: ${d && mini && d.t - mini.b} px below it), centred (${d && Math.round((d.l + d.r) / 2 - a1.vw / 2)} px off), above the screen's middle`,
    !!d && !!mini && a1.at === 'below' && d.t >= mini.b && d.t - mini.b <= 16 && Math.abs((d.l + d.r) / 2 - a1.vw / 2) <= 2 && d.b <= a1.vh * 0.45, { d, mini, at: a1 && a1.at, vh: a1 && a1.vh });
  rec.ok(`2. ...clear of the thumbs' controls (${a1 && a1.controls.map((q) => q.sel).join(', ')})`,
    !!a1 && a1.controls.length >= 2 && a1.controls.every((q) => !hits(q)), a1 && { d, controls: a1.controls });
  rec.ok(`2. ...its buttons a thumb's size (${d && d.btns.map((b) => b.w + 'x' + b.h).join(', ')})`,
    !!d && d.btns.length === 3 && d.btns.every((b) => b.h >= 40 && b.w >= 60), d && d.btns);

  const tops = await topAtButtons(A);
  rec.ok(`2. ...and nothing covers it: a tap on each button lands on that button (${tops && tops.map((t) => t.ok ? 'ok' : t.top).join(', ')})`,
    !!tops && tops.length >= 4 && tops.every((t) => t.ok), tops);

  /* ── 3. Ignore, and it does not ask again ── */
  await tapAsk(A, 'ignore');
  const t3 = Date.now();
  const a3 = await waitAsk(A, (v) => !v.dom, 8000);
  const gone3 = Date.now() - t3;
  rec.ok(`3. Ignore lets it go (in ${gone3} ms of a 30 s wait: no window, no aim), the wanderer remembered as asked`, gone3 < 8000 && !!a3 && !a3.dom && !a3.cur && a3.asked.includes(idB) && !(a3.lock && a3.lock.id === idB), a3);
  const h3 = await holdAt(A, idB, 2500, true);
  const a3b = await readAsk(A);
  const hp3 = await hpB();
  rec.ok(`3. ...more bolts through the wanderer (${h3.shots} fired) ask nothing -- "won't pop up again" -- and still do nothing (HP ${hp3})`,
    h3.shots >= 1 && !h3.asked && !a3b.dom && h3.attacks === 0 && hp3 === hp0, { h3, a3b, hp3 });

  /* ── 4. a tap asks, and the (i) explains ── */
  await A.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; S.arrows = []; });
  await A.page.waitForTimeout(600);
  let a4 = null;
  for (let i = 0; i < 3 && !(a4 && a4.dom); i++) {
    await tapPeer(A, idB);
    a4 = await waitAsk(A, (v) => !!v.dom, 2000);
  }
  const diag4 = a4 && a4.dom ? null : await tapDiag(A, idB);
  rec.ok(`4. a tap on the wanderer asks again (why: ${a4 && a4.dom && a4.dom.why}), and does not aim yet`,
    !!a4 && !!a4.dom && a4.dom.why === 'tap' && a4.dom.id === idB && !(a4.lock && a4.lock.id === idB), { a4, diag4 });
  await tapAsk(A, 'info');
  await A.page.waitForTimeout(500);
  await shot(A, '4-info');
  const info = await A.page.evaluate(() => {
    const cur = window.__btInfoPopup && window.__btInfoPopup.current();
    const body = document.querySelector('[data-nml-info]');
    return { title: cur && cur.title, body: body ? body.textContent : null, card: !!document.querySelector('[data-nml-ask]') };
  });
  rec.ok(`4. ...its (i) opens what No man's land means ("${info.title}"), saying how to attack, the window kept under it`,
    /No man's land [1-5]/.test(info.title || '') && /tap a player.*choose Attack/.test(info.body || '') && /red skull/.test(info.body || '') && info.card, info);
  await A.page.evaluate(() => { if (window.__btInfoPopup) window.__btInfoPopup.close(); });
  await A.page.waitForTimeout(400);

  /* ── 5. Party ── */
  await H.instrumentWire(A);
  const w5a = (await H.wireCounts(A)).party_invite || 0;
  const a5pre = await readAsk(A);
  await tapAsk(A, 'party');
  await A.page.waitForTimeout(600);
  const w5b = (await H.wireCounts(A)).party_invite || 0;
  const a5 = await readAsk(A);
  let invited = false;
  for (let i = 0; i < 12 && !invited; i++) {
    invited = await B.page.evaluate(() => /Raider invites you/.test(document.body.innerText || ''));
    if (!invited) await B.page.waitForTimeout(400);
  }
  rec.ok(`5. Party sends the party invite (${w5b - w5a} sent) and the window goes`, !!a5pre.dom && w5b - w5a === 1 && !a5.dom, { a5pre: !!a5pre.dom, w5a, w5b, a5 });
  rec.ok('5. ...and the wanderer is asked to join ("Raider invites you")', invited, { invited });
  await shot(B, '5-invited');

  /* ── 5b. on a computer: a click asks, nothing covers the window ── */
  let b5 = null;
  for (let i = 0; i < 4 && !(b5 && b5.dom); i++) {
    await clickPeer(B, idA);
    b5 = await waitAsk(B, (v) => !!v.dom, 2000);
  }
  const topsB = await topAtButtons(B);
  rec.ok(`5b. on a computer a click on the raider asks too ("${b5 && b5.dom && b5.dom.name}", ${b5 && b5.at} the minimap), and nothing covers it (${topsB && topsB.map((t) => t.ok ? 'ok' : t.top).join(', ')})`,
    !!b5 && !!b5.dom && b5.dom.why === 'tap' && b5.dom.id === idA && b5.at === 'beside' && !!b5.mini && b5.dom.r <= b5.mini.l
      && !!topsB && topsB.length >= 4 && topsB.every((t) => t.ok), { b5: b5 && b5.dom, at: b5 && b5.at, mini: b5 && b5.mini, topsB });
  /* the raider's Party left its invite card at the top of the wanderer's
     screen: the window goes under it, not over it */
  rec.ok(`5b. ...under the party invite card still up on that screen (${b5 && b5.invite && b5.dom ? b5.dom.t - b5.invite.b : '?'} px below it), not over it`,
    !!b5 && !!b5.invite && !!b5.dom && b5.stacked && b5.dom.t >= b5.invite.b, { invite: b5 && b5.invite, dom: b5 && b5.dom, stacked: b5 && b5.stacked });
  await shot(B, '5b-computer');
  const t5 = Date.now();
  await tapAsk(B, 'ignore', true);
  const b5b = await waitAsk(B, (v) => !v.dom, 8000);
  const gone5 = Date.now() - t5;
  rec.ok(`5b. ...and its Ignore takes a real click (gone in ${gone5} ms of a 30 s wait)`, !!b5b && !b5b.dom && gone5 < 8000 && !(b5b.lock && b5b.lock.id === idA), { b5b, gone5 });

  /* ── 6. a tap, then Attack ── */
  const eqG = await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1500);
  await standBeside(A, wsPort, idB, 30);
  let a6 = null;
  for (let i = 0; i < 4 && !(a6 && a6.dom); i++) {
    await tapPeer(A, idB);
    a6 = await waitAsk(A, (v) => !!v.dom, 2000);
  }
  if (a6) {
    a6.chat = await A.page.evaluate(() => !!document.querySelector('[data-chat-dismiss]'));
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, idA), H.serverPlayer(wsPort, idB)]);
    a6.gap = pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null;
  }
  /* "TARGET" floats a moment: watched from the tap on, in the page */
  await A.page.evaluate(() => {
    window.__nmlTarget = false;
    const t0 = performance.now();
    const look = () => {
      if ((window._gameState.current.dmgNumbers || []).some((n) => n && n.text === 'TARGET')) { window.__nmlTarget = true; return; }
      if (performance.now() - t0 < 3000) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  const hp6pre0 = await hpB();
  await tapAsk(A, 'attack');
  await A.page.waitForTimeout(600);
  const a6b = await readAsk(A);
  const target = await A.page.evaluate(() => !!window.__nmlTarget);
  /* v2.3.3530: the window's Attack IS the attack -- both skulls now, before
     any blow (the owner: "Whenever someone attacks you in no man's land you
     always get a white skull above your head") */
  let sk6pre = null;
  for (let i = 0; i < 16; i++) {
    sk6pre = {
      a: await H.readState(A, (S) => S._pvpSkullType || null),
      b: await H.readState(B, (S) => ({ mine: S._pvpSkullType || null, by: (S._nmlSelf && S._nmlSelf.by) || null })),
    };
    if (sk6pre.a === 'red' && sk6pre.b.mine === 'white') break;
    await A.page.waitForTimeout(250);
  }
  const hp6pre1 = await hpB();
  rec.ok(`6. ...the skulls come WITH the choice, before any blow: the raider red (${sk6pre.a}), the wanderer white (${sk6pre.b.mine}, by the raider), its HP untouched (${hp6pre0} -> ${hp6pre1})`,
    sk6pre.a === 'red' && sk6pre.b.mine === 'white' && sk6pre.b.by === idA && typeof hp6pre0 === 'number' && hp6pre1 === hp6pre0, { sk6pre, hp6pre0, hp6pre1 });
  rec.ok(`6. at a sword's reach (${a6 && a6.gap} px) a tap on the wanderer asks -- it no longer opens your own chat`,
    !!a6 && !!a6.dom && a6.dom.why === 'tap' && !a6.chat, a6 && { dom: !!a6.dom, chat: a6.chat, gap: a6.gap });
  rec.ok('6. a tap asks, and Attack AIMS at the wanderer (No man\'s land\'s lock, "TARGET"), the window gone',
    eqG.ok && !!a6 && !!a6.dom && !a6b.dom && !!a6b.lock && a6b.lock.type === 'player' && a6b.lock.id === idB && a6b.lock.nml && target, { eqG, a6: a6 && a6.dom, a6b, target });
  const hp6a = await hpB();
  let hp6b = hp6a;
  for (let i = 0; i < 8 && !(hp6b < hp6a); i++) {
    await standBeside(A, wsPort, idB, 30);
    await swingLocked(A, 900);
    await A.page.waitForTimeout(400);
    hp6b = await hpB();
  }
  await A.page.waitForTimeout(1500);
  const sk6A = await H.readState(A, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0 }));
  const sk6B = await H.readState(B, (S) => ({ mine: S._pvpSkullType || null, by: (S._nmlSelf && S._nmlSelf.by) || null }));
  rec.ok(`6. ...a swing lands (the wanderer's HP ${hp6a} -> ${hp6b}), and the raider wears the RED skull (${sk6A.mine})`,
    typeof hp6a === 'number' && hp6b < hp6a && sk6A.mine === 'red' && sk6A.red > 19 * 60000, { hp6a, hp6b, sk6A });
  rec.ok(`6. ...the wanderer's game is told who gave its white skull (by ${sk6B.by === idA ? 'the raider' : sk6B.by})`,
    sk6B.mine === 'white' && sk6B.by === idA, sk6B);
  await shot(A, '6-attack');

  /* ── 7. v2.3.3528: hitting back goes through the window too ── */
  const eqB = await H.equipWeapon(B, 'greatsword', 'weapon', 'melee');
  await B.page.waitForTimeout(1500);
  await closeIn(B, wsPort, idB, idA, 34);
  /* the wanderer pressed Ignore on the raider in 5b, before the raider's
     attack (step 6): that attack is a new question, so its swing asks */
  const hp7a = await hpA();
  let h7 = null, b7 = null;
  for (let i = 0; i < 3 && !(b7 && b7.dom); i++) {
    await closeIn(B, wsPort, idB, idA, 34);
    await clearNear(B, wsPort, idB);
    h7 = await holdAt(B, idA, 5000, true);
    b7 = await waitAsk(B, (v) => !!v.dom, 3000);
  }
  const hp7a2 = await hpA();
  console.log('    hit back: ' + JSON.stringify({ eqB, h7, b7: b7 && b7.dom }));
  rec.ok(`7. the wanderer, attacked, swings back at the raider with nothing locked: the window asks first -- "${b7 && b7.dom && b7.dom.name}" (why: ${b7 && b7.dom && b7.dom.why})`,
    eqB.ok && !!b7 && !!b7.dom && b7.dom.why === 'swing' && b7.dom.id === idA && b7.dom.name === 'Hit back Raider?' && b7.dom.back,
    { eqB, h7, b7: b7 && b7.dom });
  rec.ok(`7. ...with the WHITE skull it carries (${b7 && b7.dom && b7.dom.fill}), not the red one: hitting back gives no red skull`,
    !!b7 && !!b7.dom && b7.dom.skull && b7.dom.fill === '#F2F2F2' && b7.dom.btns.map((b) => b.t).join('|') === 'Attack|Party|Ignore', b7 && b7.dom);
  rec.ok(`7. ...and until it is answered the swing does the raider nothing: no player_attack sent (${h7 && h7.attacks}), the HP unchanged (${hp7a} -> ${hp7a2})`,
    !!h7 && h7.attacks === 0 && typeof hp7a === 'number' && hp7a2 === hp7a, { h7, hp7a, hp7a2 });
  await shot(B, '7-hitback');
  await tapAsk(B, 'attack', true);
  await B.page.waitForTimeout(600);
  const b7b = await readAsk(B);
  const foe7 = await B.page.evaluate((aid) => { const S = window._gameState.current; return S._nmlFoes instanceof Map && S._nmlFoes.has(aid); }, idA);
  rec.ok('7. its Attack (a real click) chooses the raider: aimed, and a foe of the wanderer\'s, the window gone',
    !b7b.dom && !!b7b.lock && b7b.lock.id === idA && b7b.lock.nml && foe7, { b7b, foe7 });
  /* the lock let go (holdAt starts with none): the choice lasts, and the
     swings land on the raider anyway */
  let hp7b = hp7a, w7 = 0;
  for (let i = 0; i < 8 && !(hp7b < hp7a); i++) {
    await closeIn(B, wsPort, idB, idA, 34);
    await clearNear(B, wsPort, idB);
    const h = await holdAt(B, idA, 1500, false);
    w7 += h.attacks;
    hp7b = await hpA();
  }
  await B.page.waitForTimeout(1500);
  const sk7B = await H.readState(B, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0, lock: S.lockedTarget ? (S.lockedTarget.src || 'tap') : null }));
  rec.ok(`7. ...with the lock let go the wanderer's swings land (${w7} claims, the raider's HP ${hp7a} -> ${hp7b}) and give them no red skull (${sk7B.mine})`,
    typeof hp7a === 'number' && hp7b < hp7a && w7 >= 1 && sk7B.mine === 'white' && !sk7B.red, { hp7a, hp7b, w7, sk7B });

  /* ── 8. a window goes by itself ── */
  /* v2.3.3268: the raider CHOSE the wanderer in step 6, and while that fight
     lasts a tap on them aims at once with no second window (mp-nmlfoe step
     6).  This step is about the window, so the fight is let end the real way:
     a minute with no blow between them (sparTargets.js FIGHT_QUIET_MS), the
     two clocks aged past it */
  await A.page.evaluate((bid) => {
    const S = window._gameState.current;
    S.lockedTarget = null;
    window.__btNmlAsk.setMs(1500);
    const old = Date.now() - 61000;
    if (S._nmlFoes instanceof Map && S._nmlFoes.has(bid)) S._nmlFoes.set(bid, old);
    if (S._pvpBlows instanceof Map && S._pvpBlows.has(bid)) S._pvpBlows.set(bid, old);
  }, idB);
  let a8 = null;
  for (let i = 0; i < 4 && !(a8 && a8.dom); i++) {
    await tapPeer(A, idB);
    a8 = await waitAsk(A, (v) => !!v.dom, 1200);
  }
  const t8 = Date.now();
  const a8b = await waitAsk(A, (v) => !v.dom, 5000);
  const gone8 = Date.now() - t8;
  rec.ok(`8. a window left alone goes by itself (after ${gone8} ms of a 1.5 s wait), aiming nobody`,
    !!a8 && !!a8.dom && !!a8b && !a8b.dom && gone8 <= 3500 && !(a8b.lock && a8b.lock.id === idB), { a8: a8 && a8.dom, a8b, gone8 });
  await A.page.evaluate(() => window.__btNmlAsk.setMs(30000));
  /* v2.3.3819: both to No man's land's inner edge first, the raider 500 px
     out from the safe ground and the wanderer beside them.  From the spot,
     the walk out is 3,000-odd px, and past 2,400 px the worker sends a
     player nobody's moves (tick.js FAR_PLAYERS NEAR_R): the raider's copy of
     the wanderer stayed frozen inside No man's land and the window never
     went (a run of 2026-10-29).  Here the walk out is 800 px, in view */
  const rOf = (x, y) => Math.hypot(x - WHEEL_CENTRE[0], y - WHEEL_CENTRE[1]);
  const onSpoke = (r) => { const d = rOf(spot.x, spot.y) - r; return { x: Math.round(spot.x - spot.ux * d), y: Math.round(spot.y - spot.uy * d) }; };
  const edgeA = onSpoke(NML.SAFE_R + 500), inB = onSpoke(NML.SAFE_R - 300);
  await H.hopTo(A, edgeA.x, edgeA.y, { tries: 60, step: 150 });
  await H.hopTo(B, edgeA.x + 70, edgeA.y, { tries: 60, step: 150 });
  await A.page.waitForTimeout(1500);
  await clearNear(A, wsPort, idA);
  let a8c = null;
  for (let i = 0; i < 4 && !(a8c && a8c.dom); i++) {
    await tapPeer(A, idB);
    a8c = await waitAsk(A, (v) => !!v.dom, 1200);
  }
  /* the wanderer walks back toward BroTown, out of No man's land */
  await H.hopTo(B, inB.x, inB.y, { tries: 40, step: 150 });
  const a8d = await waitAsk(A, (v) => !v.dom, 8000);
  const lvlB = await H.readState(B, (S) => S._nmlLevel || 0);
  const lvlA8 = await H.readState(A, (S) => S._nmlLevel || 0);
  rec.ok(`8. ...and one whose player walks out of No man's land (now ${lvlB}; the raider still in it, ${lvlA8}) goes at once`,
    !!a8c && !!a8c.dom && !!a8d && !a8d.dom && lvlB === 0 && lvlA8 > 0, { a8c: a8c && a8c.dom, a8d, lvlB, lvlA8, edgeA, inB });

  /* ── 9. sideways ── */
  /* v2.3.3629: the raider at the spot, healed and untouchable, first: from
     step 6 both are mortal for the fight, and the bog lurkers round the ring
     can kill him while step 8 waits out its windows -- a death sends him home
     to BroTown, where nothing asks (a run of 2026-10-27 found him there) */
  await H.devOp(wsPort, 'vitals', idA, { heal: true, god: true, godMinutes: 8 }).catch(() => {});
  const a9at = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  if (Math.hypot(a9at.x - spot.x, a9at.y - spot.y) > 300) await H.hopTo(A, spot.x, spot.y, { tries: 300, step: 150 });
  await H.hopTo(B, spot.x + 70, spot.y, { tries: 40, step: 150 });
  await A.page.setViewportSize({ width: 844, height: 390 });
  await A.page.waitForTimeout(3000);
  const orient = await A.page.evaluate(() => document.documentElement.getAttribute('data-orient'));
  let a9 = null;
  for (let i = 0; i < 4 && !(a9 && a9.dom); i++) {
    await tapPeer(A, idB);
    a9 = await waitAsk(A, (v) => !!v.dom, 1500);
  }
  const tops9 = await topAtButtons(A);
  const geo9 = await A.page.evaluate(() => {
    const w = document.querySelector('.brotown-wrap'), r = w && w.getBoundingClientRect();
    const S = window._gameState.current, cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
    const c = cv && cv.getBoundingClientRect();
    const me = S.camera && c ? { x: Math.round(c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1)), y: Math.round(c.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1)) } : null;
    return { wrap: r ? { l: Math.round(r.left), r: Math.round(r.right) } : null, me };
  });
  await shot(A, '9-sideways');
  const d9 = a9 && a9.dom, m9 = a9 && a9.mini;
  const hit9 = (q) => !!d9 && !(q.r <= d9.l || q.l >= d9.r || q.b <= d9.t || q.t >= d9.b);
  rec.ok(`9. held sideways (${orient}) a tap asks, the window beside the minimap (${a9 && a9.at}), inside the world's window, nothing over it`,
    orient === 'landscape' && !!d9 && a9.at === 'beside' && !!m9 && d9.r <= m9.l && !!geo9.wrap && d9.l >= geo9.wrap.l && d9.r <= geo9.wrap.r
      && !!tops9 && tops9.every((t) => t.ok), { orient, d9, at: a9 && a9.at, m9, wrap: geo9.wrap, tops9 });
  rec.ok(`9. ...clear of the thumbs' controls (${a9 && a9.controls.map((q) => q.sel).join(', ')}) and of you`,
    !!a9 && a9.controls.length >= 1 && a9.controls.every((q) => !hit9(q)) && !!geo9.me && !hit9({ l: geo9.me.x - 15, r: geo9.me.x + 15, t: geo9.me.y - 50, b: geo9.me.y + 10 }),
    a9 && { d9, controls: a9.controls, me: geo9.me });
  if (a9 && a9.dom) await tapAsk(A, 'ignore');

  stopAlive = true;
  const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`10. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
