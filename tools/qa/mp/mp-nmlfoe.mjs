/* ═══ A PLAYER YOU CHOSE TO ATTACK, AND THE SHIELD, ON THREE SCREENS (v2.3.3268) ═══
 *
 * The owner: "I want attacks against real players to hit them even when not
 * locked on target but only if you select the attack option that pops up on
 * the window. I also want to be able to use shield for when battles happen
 * against real players in no mans land".
 *
 * Three real players against a real worker on a land's Lv 6-10 ring (No man's
 * land 1): the raider and the wanderer on 390 px TOUCH phones (every tap a
 * real touch), a bystander who is never chosen:
 *   1. the raider taps the wanderer, the window asks, Attack: the wanderer is
 *      CHOSEN (src/game/sparTargets.js chooseFoe), and the raider's shield
 *      button is up before any blow -- with a real tap on its middle reaching
 *      it: No man's land's badge sat on it before;
 *   2. the lock let go (a tap elsewhere), the sword's automatic target takes
 *      the wanderer back (No man's land's lock, `src: 'auto'`) and the swings
 *      land, every claim naming the wanderer;
 *   3. a STAFF, nothing locked, aimed at the wanderer: the bolts land, every
 *      claim naming them, and no window asks about them (they were chosen);
 *   4. the BOW the same, arrows;
 *   5. the bystander, never chosen, steps between them: the raider's bolts at
 *      the wanderer fly through the bystander -- nothing sent at them, their
 *      HP unchanged, the window asks about them ("Attack Bystander?") -- and
 *      still land on the wanderer behind;
 *   6. a tap on the wanderer (chosen) aims at once: no second window;
 *   7. the wanderer, who chose nothing and holds no lock, with no monster near
 *      and no blow in the last 5 s: its shield button is UP -- the fight with
 *      the raider is on (a blow within the minute: sparTargets.js
 *      fightingNow) -- under the thumb; a real tap raises the guard facing the
 *      raider, and the raider's swings are BLOCKED by the worker;
 *   8. (v2.3.3528) the wanderer hits back THROUGH THE WINDOW -- the owner:
 *      "keep the behavior of needing to confirm the "attack" button that pops
 *      up in the window first before any damage is registered to either
 *      player": its BOW held at the raider, nothing chosen, looses nothing and
 *      asks "Hit back Raider?" (the bow's line, why 'aim'); Ignore, and a tap
 *      on the raider asks again; Attack chooses them, and with the lock let go
 *      its arrows land on the raider (its choice lasts too), giving it no red
 *      skull;
 *      (v2.3.3530) A GROUP: before that Attack the bystander attacks the
 *      wanderer too, through its own window -- not the wanderer's foe yet, the
 *      first window stays -- and the wanderer's ONE window for the raider
 *      joins the bystander to its fight with no window of its own (the owner:
 *      "If the 2nd, 3rd, etc people already approved "attack" at you you can
 *      immediately hit back at each of them after that"): its arrows land on
 *      the bystander, nothing locked, nothing asked, and no red skull for
 *      hitting back either of them, though the bystander hit it last;
 *   9. a quiet minute (the clocks aged, nothing else touched): the raider's
 *      choice lapses -- its bolts fly through the wanderer, nothing sent --
 *      and a tap asks again;
 *  10. the badge clear of the shield button, the bell, the weapon button and
 *      the attack disc at 320, 360, 375, 390 and 430 px, and sideways;
 *  11. the wanderer walks out of No man's land: the raider's choice and its
 *      shield button go;
 *  12. no page errors.
 * Pictures: tools/qa/mp/out/nmlfoe-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* where on a page another player stands (the tap handler's own arithmetic) */
const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
}, id);

/* a real touch on another player */
async function tapPeer(P, id) {
  const pt = await peerOnScreen(P, id);
  if (!pt) return false;
  await P.page.touchscreen.tap(pt.x, pt.y - 4);
  await P.page.waitForTimeout(450);
  return true;
}

/* the window as the page has it */
const readAsk = (P) => P.page.evaluate(() => {
  const h = window.__btNmlAsk;
  const el = document.querySelector('[data-nml-ask]');
  const S = window._gameState.current, lt = S.lockedTarget;
  return {
    cur: h ? h.current() : null,
    dom: el ? { why: el.getAttribute('data-nml-ask'), id: el.getAttribute('data-nml-ask-id'),
      name: ((el.querySelector('[data-nml-ask-name]') || {}).textContent || '').trim(),
      back: el.getAttribute('data-nml-ask-back') === '1' } : null,   /* v2.3.3528: hitting back */
    lock: lt ? { type: lt.type, id: lt.id, nml: !!lt.nml, src: lt.src || null } : null,
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
async function tapAsk(P, which) {
  const at = await P.page.evaluate((w) => {
    const b = document.querySelector('[data-nml-ask-' + w + ']');
    if (!b) return null;
    const q = b.getBoundingClientRect();
    return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
  }, which);
  if (!at) return false;
  await P.page.touchscreen.tap(at.x, at.y);
  return true;
}

/* every player_attack and player_projectile a page sends, with whom it names */
async function countWire(P) {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ch = S.channel;
    if (!ch || ch.__foeCounted) return;
    window.__foeWire = [];
    const send = ch.send.bind(ch);
    ch.send = (m) => {
      try {
        if (m && (m.event === 'player_attack' || m.event === 'player_projectile')) {
          window.__foeWire.push({ ev: m.event, target: m.payload && m.payload.target != null ? String(m.payload.target) : null,
            kind: m.payload && m.payload.kind, at: Date.now() });
          if (window.__foeWire.length > 400) window.__foeWire.shift();
        }
      } catch (e) { /* counting only */ }
      return send(m);
    };
    ch.__foeCounted = true;
  });
}
const wireSince = (P, t0) => P.page.evaluate((t0) => {
  const w = (window.__foeWire || []).filter((x) => x.at >= t0);
  const by = Object.create(null);
  for (const x of w) if (x.ev === 'player_attack') by[x.target || '(none)'] = (by[x.target || '(none)'] || 0) + 1;
  return { shots: w.filter((x) => x.ev === 'player_projectile').length, attacks: w.filter((x) => x.ev === 'player_attack').length, by };
}, t0);

/* HOLD the attack aimed at another player for `ms`, NOTHING locked (the right
   stick's aim, S._aiming / _aimAngle, and the game's own fire -- mp-nmlask's
   way); `keepLock` leaves a lock alone (the sword's automatic one) */
const holdAt = (P, pid, ms, keepLock) => P.page.evaluate(({ pid, ms, keepLock }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const t0 = performance.now();
  if (!keepLock) S.lockedTarget = null;
  S.swingTimer = 0;
  let locks = 0, frames = 0;
  const aim = () => {
    const o = S.others && S.others[pid];
    if (!o) return;
    const tx = o.renderX != null ? o.renderX : o.x, ty = (o.renderY != null ? o.renderY : o.y) - 24;
    const a = Math.atan2(ty - S.player.y, tx - S.player.x);
    S._aimAngle = a; S._lastAimAngle = a; S._aiming = true; S.autoAttack = true;
  };
  const tick = () => {
    aim();
    frames++;
    if (S.lockedTarget) locks++;
    const t = performance.now() - t0;
    if (t >= ms) {
      S.autoAttack = false; S._aiming = false;
      setTimeout(() => resolve({ ms: Math.round(t), frames, lockedFrames: locks }), 900);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { pid, ms, keepLock: !!keepLock });

/* the attack held (the game's own attack loop) for `ms`, the lock as it is */
const swingHeld = (P, ms) => P.page.evaluate((ms) => new Promise((resolve) => {
  const S = window._gameState.current;
  S.autoAttack = true;
  setTimeout(() => { S.autoAttack = false; resolve(true); }, ms);
}), ms);

/* until every shot a page has in the air has landed or gone (this box's
   slow frames: a bolt can fly for seconds), at most `ms` */
async function settleShots(P, ms = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const n = await H.readState(P, (S) => (S.arrows || []).length);
    if (!n) break;
    await P.page.waitForTimeout(250);
  }
  await P.page.waitForTimeout(700);   /* the worker's answer */
}
/* a player's HP on the worker, waited on until `pred` holds, at most `ms` */
async function hpWhen(wsPort, id, pred, ms = 6000) {
  const t0 = Date.now();
  let hp = null;
  while (Date.now() - t0 < ms) {
    hp = ((await H.serverPlayer(wsPort, id)) || {}).hp;
    if (pred(hp)) return hp;
    await new Promise((r) => setTimeout(r, 300));
  }
  return hp;
}

/* the bottom of the screen: the badge, the shield button and their
   neighbours, each as drawn, and what a tap on the shield's middle reaches */
const layout = (P) => P.page.evaluate(() => {
  const box = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const q = n.getBoundingClientRect();
    if (!(q.width > 0 && q.height > 0)) return null;
    return { sel, l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), b: Math.round(q.bottom) };
  };
  const shield = box('[data-shield]');
  let top = null;
  if (shield) {
    const el = document.elementFromPoint((shield.l + shield.r) / 2, (shield.t + shield.b) / 2);
    const sh = document.querySelector('[data-shield]');
    top = el && sh && (el === sh || sh.contains(el)) ? 'shield'
      : (el ? el.tagName.toLowerCase() + Array.from(el.attributes || []).filter((a) => /^data-/.test(a.name)).map((a) => '[' + a.name + ']').join('') : null);
  }
  return {
    vw: innerWidth, vh: innerHeight, orient: document.documentElement.getAttribute('data-orient'),
    badge: box('[data-nml-badge]'), shield, top,
    others: ['[data-world-chat-toggle]', '[data-weapon-chip]', '[data-ricon]', '[data-sprint]', '[data-quickeat]'].map(box).filter(Boolean),
  };
});
const overlaps = (a, b) => !!a && !!b && !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `nmlfoe-${name}.png`) }).catch(() => {});
  /* dpr 1: three game pages at a phone's dpr 2 drew about a frame a second
     on this box's software GL (a bolt then outlived the step that fired it);
     every number here is in CSS px, the same either way */
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1 });
  const B = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, guest: true });
  /* v2.3.3530: a touch phone too -- in step 8 the bystander joins the attack
     on the wanderer, choosing them by a real tap on its own window */
  const C = await H.newPlayer(browser, { name: 'Bystander', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await H.enterWorld(C);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B), okC = await inWheel(C);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  const idC = await H.readState(C, (S) => S.myId);
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.nomansland && S._serverCaps.pvpbalance));
  rec.ok('setup: all three in the Wheel, the worker advertises No man\'s land', okA && okB && okC && caps, { okA, okB, okC, caps });
  const close = async () => { for (const P of [A, B, C]) await P.ctx.close().catch(() => {}); };
  if (!(okA && okB && okC && caps)) { await close(); return; }

  /* real input on a loop: a page logs itself out after two minutes without
     any (Control does nothing in the game) */
  let stopAlive = false;
  for (const P of [A, B, C]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }

  /* past the Mayor's gate, every weapon, and a shield on the raider's and the
     wanderer's arm (tut_1 hands one over; the dev kit's if not) */
  for (const P of [A, B, C]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
  }
  await A.page.waitForTimeout(1800);
  for (const id of [idA, idB, idC]) {
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'kit', id, { what: 'weapons' });
  }
  for (const id of [idA, idB]) await H.devOp(wsPort, 'kit', id, { what: 'shield' });
  await A.page.waitForTimeout(2000);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg;
      if (!R.shield && (R.shieldStash || []).length) R.shield = R.shieldStash[0];
      if (R._quests) R._quests.tut_4 = 'turnedIn';   /* the onboarding coach covers the band (mp-duelblock) */
    });
  }
  const shields = [await H.readState(A, (S) => !!(S.rpg && S.rpg.shield)), await H.readState(B, (S) => !!(S.rpg && S.rpg.shield))];
  const lvls = [];
  for (const id of [idA, idB, idC]) lvls.push(((await H.serverPlayer(wsPort, id)) || {}).level);
  rec.ok(`setup: the raider and the wanderer carry a shield (${shields.join(' / ')}), levels ${lvls.join(' / ')}, within one`,
    shields[0] && shields[1] && lvls.every((l) => typeof l === 'number') && Math.max(...lvls) - Math.min(...lvls) <= 1, { shields, lvls });

  /* ── the walk out, untouchable ── */
  for (const id of [idA, idB, idC]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 10 });
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
  /* places on the Lv 6-10 ring (No man's land 1), inside a spoke, furthest
     from any monster's place first (mp-nmlask's) */
  const cands = [];
  for (const land of Object.keys(WHEEL_SPAWNS)) {
    const a = WHEEL_SPAWNS[land].anchor;
    const L = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
    const ux = (a[0] - WHEEL_CENTRE[0]) / L, uy = (a[1] - WHEEL_CENTRE[1]) / L;
    for (let r = NML.HUB + T + 160; r <= NML.HUB + 2 * T - 160; r += 50 * LONG) {
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
  /* the line: the raider at the spot, the bystander 70 px east (parked 130 px
     south of the line until step 5), the wanderer 140 px east */
  let spot = null;
  for (const c of tryList.slice(0, 14)) {
    await H.hopTo(A, c.x, c.y, { tries: 90 });
    await A.page.waitForTimeout(1500);
    const ok = await A.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
      const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 340).length;
      let clear = true;
      for (let k = 0; k <= 170; k += 10) clear = clear && dry(x + k, y);
      for (let k = 0; k <= 130; k += 10) clear = clear && dry(x + 70, y + k);
      return { dry: clear, near };
    }, c);
    if (ok.dry && ok.near === 0) { spot = c; break; }
    console.log('    spot refused: ' + JSON.stringify({ c, ok }));
  }
  rec.ok(`setup: a dry, quiet spot on a Lv 6-10 ring (${spot ? `${spot.land} ${spot.x},${spot.y}` : 'none'})`, !!spot, spot);
  if (!spot) { stopAlive = true; await close(); return; }
  const PARK_C = { x: spot.x + 70, y: spot.y + 130 };
  await H.hopTo(B, spot.x + 140, spot.y, { tries: 90 });
  await H.hopTo(C, PARK_C.x, PARK_C.y, { tries: 90 });
  await B.page.waitForTimeout(2500);
  const lv = [];
  for (const P of [A, B, C]) lv.push(await H.readState(P, (S) => S._nmlLevel || 0));
  rec.ok(`setup: all three stand in No man's land 1 (${lv.join(' / ')})`, lv.every((n) => n === 1), lv);
  for (const id of [idA, idB, idC]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: false });
  for (const P of [A, B, C]) {
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate(() => window.__btNmlAsk && window.__btNmlAsk.setMs(30000));
  }
  await countWire(A);
  await countWire(B);
  const hpOf = async (id) => ((await H.serverPlayer(wsPort, id)) || {}).hp;
  const heal = async (id) => { await H.devOp(wsPort, 'vitals', id, { heal: true }); await A.page.waitForTimeout(400); };
  const foes = (P) => H.readState(P, (S) => (S._nmlFoes instanceof Map ? Array.from(S._nmlFoes.keys()) : []));

  /* ── 1. the window's Attack: chosen, and the shield is up before any blow ── */
  const eqG = await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1500);
  const pre1 = await layout(A);
  let a1 = null;
  for (let i = 0; i < 4 && !(a1 && a1.dom); i++) {
    await tapPeer(A, idB);
    a1 = await waitAsk(A, (v) => !!v.dom, 2000);
  }
  await tapAsk(A, 'attack');
  await A.page.waitForTimeout(800);
  const a1b = await readAsk(A);
  const foes1 = await foes(A);
  const lay1 = await layout(A);
  await shot(A, '1-chosen');
  rec.ok('1. a tap on the wanderer asks, and Attack aims at them (No man\'s land\'s lock) -- and CHOOSES them',
    eqG.ok && !!a1 && !!a1.dom && a1.dom.id === idB && !a1b.dom && !!a1b.lock && a1b.lock.id === idB && a1b.lock.nml && foes1.includes(idB),
    { eqG, a1: a1 && a1.dom, a1b, foes1 });
  rec.ok('1. ...no shield button before the window (no lock, no blow, nothing near), and the moment they are chosen it is up, before any blow',
    !pre1.shield && !!lay1.shield, { pre: pre1.shield, after: lay1.shield });
  rec.ok(`1. ...a tap on its middle reaches it (${lay1.top}), the No man's land badge beside it, not over it`,
    lay1.top === 'shield' && !!lay1.badge && !overlaps(lay1.badge, lay1.shield), { badge: lay1.badge, shield: lay1.shield, top: lay1.top });

  /* ── 2. the lock let go: the sword takes them back by itself, and lands ── */
  await heal(idB);
  const hp2a = await hpOf(idB);
  /* at a sword's reach: 30 px west of the wanderer (the first run swung from
     140 px, where a sword reaches nobody) */
  await H.hopTo(A, spot.x + 110, spot.y, { tries: 30, step: 40 });
  await A.page.waitForTimeout(900);
  await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; });
  await A.page.waitForTimeout(800);
  const lock2 = (await readAsk(A)).lock;
  const t2 = Date.now();
  let hp2b = hp2a;
  for (let i = 0; i < 6 && !(hp2b < hp2a); i++) {
    await swingHeld(A, 900);
    hp2b = await hpWhen(wsPort, idB, (h) => h < hp2a, 1500);
  }
  const w2 = await wireSince(A, t2);
  await H.hopTo(A, spot.x, spot.y, { tries: 30, step: 60 });
  await A.page.waitForTimeout(800);
  rec.ok(`2. the lock let go, the sword's automatic target takes the wanderer back (${lock2 && lock2.type}:${lock2 && lock2.src}, nml ${lock2 && lock2.nml})`,
    !!lock2 && lock2.type === 'player' && lock2.id === idB && lock2.nml && lock2.src === 'auto', lock2);
  rec.ok(`2. ...and the swings land: the wanderer's HP ${hp2a} -> ${hp2b}, ${w2.attacks} claims, every one naming them`,
    typeof hp2a === 'number' && hp2b < hp2a && w2.attacks >= 1 && (w2.by[idB] || 0) === w2.attacks, { hp2a, hp2b, w2 });

  /* ── 3. the staff, nothing locked ── */
  const eqS = await H.equipWeapon(A, 'staff', 'staffWeapon', 'staff');
  await A.page.waitForTimeout(1500);
  /* the raider's own shield button, with the lock gone (a staff takes no
     automatic one) and no blow ever taken: the chosen wanderer near is the
     whole reason it stays */
  await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; });
  await A.page.waitForTimeout(700);
  const st3 = await H.readState(A, (S) => ({ lock: !!S.lockedTarget, hitAgo: S.lastDamageTaken ? Date.now() - S.lastDamageTaken : null,
    near: (S.monsters || []).filter((m) => m && m.alive && Math.hypot(m.x - S.player.x, m.y - S.player.y) <= 220).length }));
  const lay3 = await layout(A);
  rec.ok(`3. the staff drawn, nothing locked, no blow ever taken, no monster near: the raider's shield button stays up (the wanderer is chosen)`,
    eqS.ok && !st3.lock && (st3.hitAgo == null || st3.hitAgo > 5000) && st3.near === 0 && !!lay3.shield && lay3.top === 'shield', { st3, shield: lay3.shield, top: lay3.top });
  await heal(idB);
  const hp3a = await hpOf(idB);
  const t3 = Date.now();
  const h3 = await holdAt(A, idB, 3500);
  await settleShots(A);
  const hp3b = await hpWhen(wsPort, idB, (h) => h < hp3a);
  const w3 = await wireSince(A, t3);
  const a3 = await readAsk(A);
  rec.ok(`3. a staff with NOTHING locked (${h3.lockedFrames} of ${h3.frames} frames locked), aimed at the wanderer: ${w3.shots} bolts, the HP ${hp3a} -> ${hp3b}`,
    eqS.ok && h3.lockedFrames === 0 && w3.shots >= 1 && typeof hp3a === 'number' && hp3b < hp3a, { eqS, h3, w3, hp3a, hp3b });
  rec.ok(`3. ...every claim naming the wanderer (${JSON.stringify(w3.by)}), and no window asks about them`,
    w3.attacks >= 1 && (w3.by[idB] || 0) === w3.attacks && !a3.dom, { w3, a3 });

  /* ── 4. the bow the same ── */
  const eqB = await H.equipWeapon(A, 'bow', 'rangedWeapon', 'ranged');
  await A.page.waitForTimeout(1500);
  await heal(idB);
  const hp4a = await hpOf(idB);
  const t4 = Date.now();
  const h4 = await holdAt(A, idB, 3500);
  await settleShots(A);
  const hp4b = await hpWhen(wsPort, idB, (h) => h < hp4a);
  const w4 = await wireSince(A, t4);
  rec.ok(`4. the BOW with nothing locked: ${w4.shots} arrows, the wanderer's HP ${hp4a} -> ${hp4b}, every claim naming them (${JSON.stringify(w4.by)})`,
    eqB.ok && h4.lockedFrames === 0 && w4.shots >= 1 && typeof hp4a === 'number' && hp4b < hp4a && w4.attacks >= 1 && (w4.by[idB] || 0) === w4.attacks,
    { eqB, h4, w4, hp4a, hp4b });

  /* ── 5. the bystander, never chosen, between them ── */
  await H.equipWeapon(A, 'staff', 'staffWeapon', 'staff');
  await H.hopTo(C, spot.x + 70, spot.y, { tries: 30, step: 60 });
  await C.page.waitForTimeout(1500);
  await heal(idB);
  const hp5c0 = await hpOf(idC), hp5b0 = await hpOf(idB);
  const t5 = Date.now();
  const h5 = await holdAt(A, idB, 4000);
  await settleShots(A);
  const hp5b1 = await hpWhen(wsPort, idB, (h) => h < hp5b0);
  const hp5c1 = await hpOf(idC);
  const w5 = await wireSince(A, t5);
  const a5 = await waitAsk(A, (v) => !!v.dom, 2000);
  await shot(A, '5-bystander');
  rec.ok(`5. bolts at the wanderer through the bystander (${w5.shots} fired): nothing sent at the bystander, their HP unchanged (${hp5c0} -> ${hp5c1})`,
    w5.shots >= 1 && !(w5.by[idC] > 0) && typeof hp5c0 === 'number' && hp5c1 === hp5c0, { h5, w5, hp5c0, hp5c1 });
  rec.ok(`5. ...the window asks about the bystander ("${a5 && a5.dom && a5.dom.name}"), not the wanderer`,
    !!a5 && !!a5.dom && a5.dom.id === idC && a5.dom.why === 'shot', a5);
  rec.ok(`5. ...and the bolts still land on the wanderer behind them (${hp5b0} -> ${hp5b1})`,
    typeof hp5b0 === 'number' && hp5b1 < hp5b0 && (w5.by[idB] || 0) >= 1, { hp5b0, hp5b1, w5 });
  if (a5 && a5.dom) await tapAsk(A, 'ignore');
  await H.hopTo(C, PARK_C.x, PARK_C.y, { tries: 30, step: 60 });
  await A.page.waitForTimeout(800);

  /* ── 6. a tap on the chosen wanderer aims at once ── */
  await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S.autoAttack = false; S._aiming = false; S.arrows = []; });
  await A.page.waitForTimeout(500);
  let a6 = null;
  for (let i = 0; i < 4 && !(a6 && a6.lock && a6.lock.id === idB); i++) {
    await tapPeer(A, idB);
    a6 = await readAsk(A);
  }
  rec.ok('6. a tap on the wanderer, already chosen, aims at once: no second window',
    !!a6 && !a6.dom && !a6.cur && !!a6.lock && a6.lock.id === idB && a6.lock.nml, a6);
  await A.page.evaluate(() => { window._gameState.current.lockedTarget = null; });

  /* ── 7. the wanderer's shield: up with nothing locked, and it blocks ── */
  await heal(idB);
  await B.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S._shieldThreat = null; });
  /* past the 5 s rule a blow keeps the button up by (shieldButtonLive), with
     nothing locked and no monster near: only the fight with the raider */
  await B.page.waitForTimeout(6000);
  const st7 = await H.readState(B, (S) => ({
    lock: !!S.lockedTarget, hitAgo: S.lastDamageTaken ? Date.now() - S.lastDamageTaken : null,
    near: (S.monsters || []).filter((m) => m && m.alive && Math.hypot(m.x - S.player.x, m.y - S.player.y) <= 220).length,
    blows: S._pvpBlows instanceof Map ? Array.from(S._pvpBlows.keys()) : [], chose: S._nmlFoes instanceof Map ? Array.from(S._nmlFoes.keys()) : [],
  }));
  const lay7 = await layout(B);
  rec.ok(`7. the wanderer chose nothing and holds no lock, no monster near, its last blow ${st7.hitAgo} ms ago -- and its shield button is UP (the fight with the raider)`,
    !st7.lock && st7.near === 0 && (st7.hitAgo == null || st7.hitAgo > 5000) && st7.blows.includes(idA) && !st7.chose.includes(idA) && !!lay7.shield,
    { st7, shield: lay7.shield });
  rec.ok(`7. ...under the thumb (${lay7.top}), the badge clear of it`, lay7.top === 'shield' && !overlaps(lay7.badge, lay7.shield), { badge: lay7.badge, shield: lay7.shield, top: lay7.top });
  /* the raider walks up with the sword (its automatic target is the wanderer) */
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1200);
  await H.hopTo(A, spot.x + 110, spot.y, { tries: 30, step: 40 });
  await A.page.waitForTimeout(1200);
  const toA = await B.page.evaluate((aid) => {
    const S = window._gameState.current, o = S.others[aid];
    return o ? Math.atan2((o.renderY != null ? o.renderY : o.y) - S.player.y, (o.renderX != null ? o.renderX : o.x) - S.player.x) : null;
  }, idA);
  const sb = lay7.shield;
  if (sb) await B.page.touchscreen.tap((sb.l + sb.r) / 2, (sb.t + sb.b) / 2);
  await B.page.waitForTimeout(700);
  const g7 = await H.readState(B, (S) => ({ up: !!S._shieldUp, ang: S._shieldAngle }));
  const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  rec.ok(`7. ...a real tap raises the guard facing the raider (${g7.ang != null && toA != null ? Math.round(off(g7.ang, toA) * 180 / Math.PI) : '?'} degrees off)`,
    g7.up && typeof g7.ang === 'number' && typeof toA === 'number' && off(g7.ang, toA) < 0.4, { g7, toA });
  /* v2.3.3474: and the WORKER has it -- the raised guard rides the next move
     packet (BroTown's _blockChanged), the next frame on a phone, but on this
     box that frame can be 600 ms off: in the sweep of 2026-10-18 the first
     of the raider's two blows reached the worker before the guard did (12
     taken), the second was blocked */
  for (let t0 = Date.now(); Date.now() - t0 < 6000;) {
    if (((await H.serverPlayer(wsPort, idB)) || {}).blocking) break;
    await B.page.waitForTimeout(150);
  }
  const hp7a = await hpOf(idB);
  const t7 = Date.now();
  await swingHeld(A, 1400);
  await A.page.waitForTimeout(900);
  const hp7b = await hpOf(idB);
  const hits7 = await B.page.evaluate((t0) => {
    const q = window.__btFightFood;
    return q ? q.hits.filter((h) => h.at >= t0 - 300 && h.target === window._gameState.current.myId) : [];
  }, t7);
  await shot(B, '7-blocked');
  rec.ok(`7. ...and the raider's swings are BLOCKED by the worker (${hits7.length} blows, ${hits7.filter((h) => h.blocked).length} blocked, HP ${hp7a} -> ${hp7b})`,
    hits7.length >= 1 && hits7.every((h) => h.blocked) && typeof hp7a === 'number' && hp7b === hp7a, { hits7, hp7a, hp7b });
  await B.page.evaluate(() => { const S = window._gameState.current; if (S._shieldUp) { S._shieldUp = false; } });
  await H.hopTo(A, spot.x, spot.y, { tries: 30, step: 60 });

  /* ── 8. v2.3.3528: the wanderer hits back, through the window, and the choice lasts ── */
  await heal(idA);
  const eqB8 = await H.equipWeapon(B, 'bow', 'rangedWeapon', 'ranged');
  await B.page.waitForTimeout(1500);
  /* the BOW held at the raider, nothing chosen: it looses nothing, and asks */
  const hp8o = await hpOf(idA);
  const t8o = Date.now();
  let b8a = null;
  for (let i = 0; i < 3 && !(b8a && b8a.dom); i++) {
    await holdAt(B, idA, 2500);
    b8a = await waitAsk(B, (v) => !!v.dom, 2000);
  }
  await settleShots(B);
  const w8o = await wireSince(B, t8o);
  const hp8o2 = await hpOf(idA);
  rec.ok(`8. the wanderer's BOW held at the raider who attacked it, nothing chosen: no arrow (${w8o.shots}), nothing sent (${w8o.attacks}), the HP unchanged (${hp8o} -> ${hp8o2}) -- and the window asks: "${b8a && b8a.dom && b8a.dom.name}" (why: ${b8a && b8a.dom && b8a.dom.why})`,
    eqB8.ok && !!b8a && !!b8a.dom && b8a.dom.id === idA && b8a.dom.why === 'aim' && b8a.dom.back && b8a.dom.name === 'Hit back Raider?'
      && w8o.shots === 0 && w8o.attacks === 0 && typeof hp8o === 'number' && hp8o2 === hp8o,
    { eqB8, b8a: b8a && b8a.dom, w8o, hp8o, hp8o2 });
  await shot(B, '8-hitback');
  await tapAsk(B, 'ignore');
  await B.page.waitForTimeout(600);
  /* v2.3.3530: A GROUP -- the bystander attacks the wanderer too, choosing
     them through its OWN window (a real tap, Attack), its staff's bolts
     landing on them.  The wanderer has chosen nobody yet (it ignored the
     raider's window), so the bystander is NOT its foe: the first window
     stays */
  const eqC8 = await H.equipWeapon(C, 'staff', 'staffWeapon', 'staff');
  await C.page.waitForTimeout(1200);
  let c8 = null;
  for (let i = 0; i < 4 && !(c8 && c8.dom); i++) {
    await tapPeer(C, idB);
    c8 = await waitAsk(C, (v) => !!v.dom, 2000);
  }
  await tapAsk(C, 'attack');
  await C.page.waitForTimeout(800);
  await heal(idB);
  const hp8g0 = await hpOf(idB);
  let hp8g1 = hp8g0;
  for (let i = 0; i < 3 && !(hp8g1 < hp8g0); i++) {
    await holdAt(C, idB, 2500);
    await settleShots(C);
    hp8g1 = await hpWhen(wsPort, idB, (h) => h < hp8g0, 3000);
  }
  await B.page.waitForTimeout(800);
  const g8 = await H.readState(B, (S) => ({
    foes: S._nmlFoes instanceof Map ? Array.from(S._nmlFoes.keys()) : [],
    bys: S._nmlSelf && S._nmlSelf.bys instanceof Map ? Array.from(S._nmlSelf.bys.keys()) : [],
    by: (S._nmlSelf && S._nmlSelf.by) || null,
    joins: window.__btNmlAsk && window.__btNmlAsk.joins ? window.__btNmlAsk.joins().map((j) => j.id) : null,
  }));
  rec.ok(`8. a group: the bystander attacks the wanderer too, through its own window ("${c8 && c8.dom && c8.dom.name}"), its bolts landing (HP ${hp8g0} -> ${hp8g1})`,
    eqC8.ok && !!c8 && !!c8.dom && c8.dom.id === idB && typeof hp8g0 === 'number' && hp8g1 < hp8g0, { eqC8, c8: c8 && c8.dom, hp8g0, hp8g1 });
  rec.ok(`8. ...the wanderer is told BOTH attackers (bys ${JSON.stringify(g8.bys.length)} ids, by the bystander, the last), and with no fight of its own chosen yet the bystander is no foe of its: the first window stays`,
    g8.bys.includes(idA) && g8.bys.includes(idC) && g8.by === idC && !g8.foes.includes(idC) && !g8.foes.includes(idA) && Array.isArray(g8.joins) && !g8.joins.includes(idC),
    g8);
  /* a tap asks every time, the one who attacked you as anyone */
  let b8 = null;
  for (let i = 0; i < 4 && !(b8 && b8.dom); i++) {
    await tapPeer(B, idA);
    b8 = await waitAsk(B, (v) => !!v.dom, 2000);
  }
  const lock8pre = b8 && b8.lock;
  await tapAsk(B, 'attack');
  await B.page.waitForTimeout(800);
  const b8b = await readAsk(B);
  const foes8 = await foes(B);
  rec.ok('8. ...a tap on the raider asks too ("Hit back", not aimed until answered), and its Attack aims and CHOOSES them',
    !!b8 && !!b8.dom && b8.dom.why === 'tap' && b8.dom.back && b8.dom.id === idA && !(lock8pre && lock8pre.id === idA)
      && !b8b.dom && !!b8b.lock && b8b.lock.id === idA && b8b.lock.nml && foes8.includes(idA),
    { b8: b8 && b8.dom, lock8pre, b8b, foes8 });
  /* v2.3.3530: that ONE window joined the whole group -- the owner: "If the
     2nd, 3rd, etc people already approved "attack" at you you can
     immediately hit back at each of them after that" */
  const asked8 = await B.page.evaluate(() => (window.__btNmlAsk ? window.__btNmlAsk.asked() : []));
  const joins8 = await B.page.evaluate(() => (window.__btNmlAsk && window.__btNmlAsk.joins ? window.__btNmlAsk.joins().map((j) => j.id) : []));
  rec.ok('8. ...and that ONE window joins the whole group: the bystander, who attacked the wanderer too, is its foe now with no window of its own',
    foes8.includes(idC) && joins8.includes(idC) && !asked8.includes(idC) && !b8b.dom, { foes8, joins8, asked8 });
  const hp8a = await hpOf(idA);
  const t8 = Date.now();
  const h8 = await holdAt(B, idA, 3500);
  await settleShots(B);
  const hp8b = await hpWhen(wsPort, idA, (h) => h < hp8a);
  const w8 = await wireSince(B, t8);
  const sk8 = await H.readState(B, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0 }));
  rec.ok(`8. ...the lock let go, its arrows still land on the raider (${w8.shots} fired, HP ${hp8a} -> ${hp8b}), naming them, and no red skull (${sk8.mine})`,
    eqB8.ok && h8.lockedFrames === 0 && w8.shots >= 1 && typeof hp8a === 'number' && hp8b < hp8a && (w8.by[idA] || 0) >= 1 && !sk8.red,
    { eqB8, h8, w8, hp8a, hp8b, sk8 });
  /* v2.3.3530: ...and the bystander, the group's second, is hit back at once:
     the wanderer's bow held at them, nothing locked, no window -- and the
     raider's no red skull above held though the bystander, not the raider,
     was the LAST to hit the wanderer (the worker kept both rights:
     nomansland.js _nmlHitsBack; it gave a red one before) */
  await heal(idC);
  const hp8c0 = await hpOf(idC);
  const t8c = Date.now();
  const h8c = await holdAt(B, idC, 3500);
  await settleShots(B);
  const hp8c1 = await hpWhen(wsPort, idC, (h) => h < hp8c0);
  const w8c = await wireSince(B, t8c);
  const a8c = await readAsk(B);
  const asked8c = await B.page.evaluate(() => (window.__btNmlAsk ? window.__btNmlAsk.asked() : []));
  const sk8c = await H.readState(B, (S) => ({ mine: S._pvpSkullType || null, red: (S._nmlSelf && S._nmlSelf.red) || 0 }));
  await shot(B, '8-group');
  rec.ok(`8. ...the group's second hit back at once: the bow held at the bystander, nothing locked (${h8c.lockedFrames} frames), ${w8c.shots} arrows, HP ${hp8c0} -> ${hp8c1}, every claim naming them -- no window ever asked`,
    h8c.lockedFrames === 0 && w8c.shots >= 1 && typeof hp8c0 === 'number' && hp8c1 < hp8c0 && (w8c.by[idC] || 0) >= 1 && !a8c.dom && !asked8c.includes(idC),
    { h8c, w8c, hp8c0, hp8c1, a8c: a8c.dom, asked8c });
  rec.ok(`8. ...and still no red skull for the wanderer (${sk8c.mine}): hitting back any of the group is hitting back`,
    !sk8c.red && sk8c.mine !== 'red', sk8c);

  /* ── 9. a quiet minute: the choice lapses ── */
  await H.equipWeapon(A, 'staff', 'staffWeapon', 'staff');
  await A.page.waitForTimeout(1500);
  await heal(idB);
  await A.page.evaluate((bid) => {
    const S = window._gameState.current;
    S.lockedTarget = null;
    const old = Date.now() - 61000;
    if (S._nmlFoes instanceof Map && S._nmlFoes.has(bid)) S._nmlFoes.set(bid, old);
    if (S._pvpBlows instanceof Map && S._pvpBlows.has(bid)) S._pvpBlows.set(bid, old);
  }, idB);
  /* and the wanderer's own blows on the raider, which would keep the raider's
     fight on, stopped: its page holds still */
  const hp9a = await hpOf(idB);
  const t9 = Date.now();
  const h9 = await holdAt(A, idB, 3000);
  await settleShots(A);
  const hp9b = await hpOf(idB);
  const w9 = await wireSince(A, t9);
  const foes9 = await foes(A);
  rec.ok(`9. a minute with no blow (the clocks aged): the choice lapses -- ${w9.shots} bolts fly through the wanderer, nothing sent (${w9.attacks}), HP ${hp9a} -> ${hp9b}`,
    w9.shots >= 1 && w9.attacks === 0 && typeof hp9a === 'number' && hp9b === hp9a && !foes9.includes(idB), { h9, w9, hp9a, hp9b, foes9 });
  await A.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; S.arrows = []; S.lockedTarget = null; });
  await A.page.waitForTimeout(500);
  let a9 = null;
  for (let i = 0; i < 4 && !(a9 && a9.dom); i++) {
    await tapPeer(A, idB);
    a9 = await waitAsk(A, (v) => !!v.dom, 2000);
  }
  rec.ok('9. ...and a tap on them asks again', !!a9 && !!a9.dom && a9.dom.id === idB && a9.dom.why === 'tap' && !(a9.lock && a9.lock.id === idB), a9);
  if (a9 && a9.dom) await tapAsk(A, 'attack');
  await A.page.waitForTimeout(600);

  /* ── 10. the badge clear of the shield and its neighbours, at every width ── */
  const widths = [[320, 640], [360, 780], [375, 812], [390, 844], [430, 932], [844, 390]];
  const rows = [];
  for (const [w, h] of widths) {
    await A.page.setViewportSize({ width: w, height: h });
    await A.page.waitForTimeout(2200);
    await A.page.evaluate(() => { const S = window._gameState.current; S.lastDamageTaken = Date.now(); });
    await A.page.waitForTimeout(500);
    const L = await layout(A);
    const hitShield = overlaps(L.badge, L.shield);
    const hitOthers = L.others.filter((q) => overlaps(L.badge, q)).map((q) => q.sel);
    rows.push({ w, h, orient: L.orient, badge: L.badge, shield: L.shield, top: L.top, hitShield, hitOthers });
    if (w === 360 || w === 844) await shot(A, `10-${w}`);
  }
  await A.page.setViewportSize(PHONE);
  await A.page.waitForTimeout(2000);
  console.log('    layout: ' + JSON.stringify(rows.map((r) => ({ w: r.w, b: r.badge && [r.badge.l, r.badge.r], s: r.shield && [r.shield.l, r.shield.r], top: r.top, o: r.hitOthers }))));
  for (const r of rows) {
    /* at 320 px there is no room between the bell (66-110) and the shield
       (from 126): the badge keeps clear of the shield and lies over the bell's
       right half -- an iPhone SE of 2016, the one width this is so */
    const allowBell = r.w <= 320;
    const over = r.hitOthers.filter((sel) => !(allowBell && sel === '[data-world-chat-toggle]'));
    rec.ok(`10. ${r.w} x ${r.h}${r.orient === 'landscape' ? ' (sideways)' : ''}: the badge (${r.badge ? r.badge.l + '-' + r.badge.r : 'none'}) clear of the shield (${r.shield ? r.shield.l + '-' + r.shield.r : 'none'}), a tap on the shield's middle reaching it (${r.top})${r.hitOthers.length ? ', over ' + r.hitOthers.join(', ') + (over.length ? '' : ' (no room at this width)') : ', and of the bell, the weapon button and the disc'}`,
      !!r.badge && !!r.shield && !r.hitShield && r.top === 'shield' && !over.length, r);
  }

  /* ── 11. out of No man's land, the choice and the button go ── */
  const sbx = await H.serverPlayer(wsPort, idB);
  const out = sbx ? { x: Math.round(sbx.x - spot.ux * 1300 * LONG), y: Math.round(sbx.y - spot.uy * 1300 * LONG) } : null;
  if (out) await H.hopTo(B, out.x, out.y, { tries: 40, step: 150 });
  await A.page.waitForTimeout(2500);
  await A.page.evaluate(() => { const S = window._gameState.current; S.lastDamageTaken = 0; });
  await A.page.waitForTimeout(1200);
  const s11 = await H.readState(A, (S) => ({ foes: S._nmlFoes instanceof Map ? Array.from(S._nmlFoes.keys()) : [], lock: S.lockedTarget ? S.lockedTarget.id : null }));
  const lvlB = await H.readState(B, (S) => S._nmlLevel || 0);
  const L11 = await layout(A);
  rec.ok(`11. the wanderer walks out of No man's land (now ${lvlB}): the raider's choice lapses, its lock goes, and its shield button with them`,
    lvlB === 0 && !s11.foes.includes(idB) && s11.lock !== idB && !L11.shield, { s11, lvlB, shield: L11.shield });

  stopAlive = true;
  const errs = [...A.logs, ...B.logs, ...C.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`12. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await close();
}
