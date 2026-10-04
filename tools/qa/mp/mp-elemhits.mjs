/* ═══ A MONSTER'S HIT CARRIES ITS ELEMENT (v2.3.2996) ═══
 *
 * Owner, 2026-10-03: "using a snowflake icon for instance when hit by a
 * snowman's snowball and slowing down for a second or having burning tick
 * damage from a fire goblin with a fire icon as the damage type.  From desert
 * winds mummy an air icon that blows the character back", and "slime for
 * floral damage ... a brief held in place effect".
 *
 * On a phone viewport, against a real worker, in the Wheel:
 *   A. THE CLIENT'S HALF, each status handed to the game's own dispatcher
 *      exactly as the worker sends it (server/src/monsterstatus.js):
 *      1. a chill walks you at about half pace for its second, then not;
 *      2. the slime's hold stops your walk AND your roll ("Stuck!"), then lets go;
 *      3. a gust shoves you its length, the way it says, over its few frames;
 *      4. a burn's tick draws its number with the flame, no flinch, no shove
 *         of the camera;
 *      5. every hit's number carries its element's icon -- the snowflake, the
 *         flame, the wind, the slime -- and the heart where there is none;
 *      6. each look is drawn round you (pictures).
 *   B. THE REAL THING: walk up to each land's monsters and be hit --
 *      a snowman chills, a fire goblin burns (its ticks come, with the flame),
 *      a mummy blows you back (and the worker agrees where you landed: no
 *      snap-back), a blue slime holds you.
 *   C. No page errors.
 * Pictures in tools/qa/mp/out/elemhits-*.png.
 *
 * v2.3.3014, the other four ("stone stuns briefly; storm shocks nearby
 * players; water slows stamina refill; venom poisons over time" -- the owner:
 * "Yes continue working on those items"):
 *   A. the daze stops your walk, your roll and your swing ("Dazed!"), then
 *      lets go; a storm's crackle on you, and its arc from someone near you
 *      drawn from them, with no flinch and its own crackle; a poison's tick
 *      with the venom icon and no flinch; the soak's, the daze's and the
 *      poison's chips; the four icons on their numbers; the four looks;
 *   B. a rock monster dazes you, a Storm Peaks slime crackles on you, a
 *      fishman soaks you -- and the worker refills your stamina at under 60%
 *      of its dry pace while you are -- and a wisp poisons you, its ticks
 *      coming with the venom icon.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* One monster_attack on you, through the game's own dispatcher, shaped as the
   worker sends it.  `ability` makes it one the worker resolved, so the number
   is drawn whatever the attacker (gameEvents.js v2.3.2235). */
const hitMe = (P, p) => P.page.evaluate((p) => {
  const S = window._gameState.current;
  window.__btDispatch({ type: 'monster_attack', payload: Object.assign({
    monsterId: 'qa-elem', targetId: S.myId, dmg: 4, dmgTaken: 4, zone: S.currentZone,
    attackerX: S.player.x + 24, attackerY: S.player.y, ability: 'qa' }, p) });
  return { chill: S._chillUntil || 0, stuck: S._stuckUntil || 0, burn: S._burnUntil || 0, gust: !!S._gust, now: Date.now() };
}, p);

/* Walk with the stick for `ms`; how far you went. */
const walk = (P, ms, sx = 1, sy = 0) => P.page.evaluate(({ ms, sx, sy }) => new Promise((res) => {
  const S = window._gameState.current;
  const x0 = S.player.x, y0 = S.player.y;
  S.stickX = sx; S.stickY = sy;
  setTimeout(() => { S.stickX = 0; S.stickY = 0; res({ dx: S.player.x - x0, dy: S.player.y - y0, d: Math.hypot(S.player.x - x0, S.player.y - y0) }); }, ms);
}), { ms, sx, sy });

/* v2.3.2999: room round you, by the game's own answers -- no footprint
   (wheelObjects' walk-test boxes) within r of your boots, and open ground at
   16 points r round your body.  "Every walk moved 3 px" passed a spot behind
   the 1.15x town's Hotel (v2.3.2997) with its back wall 3.6 px from the
   boots, and the gust's 5 px south ran into the wall. */
const roomy = (P, r) => P.page.evaluate((r) => {
  const S = window._gameState.current, W = window.__btWheelObjects, g = window.__btPlayerGround ? window.__btPlayerGround() : null;
  const fx = S.player.x, fy = g ? g.y : S.player.y + 52;
  const near = (W && W.blockers ? W.blockers() : []).filter((b) => b.x1 > fx - r && b.x0 < fx + r && b.y1 > fy - r && b.y0 < fy + r).length;
  let solid = 0;
  for (let a = 0; a < 16; a++) if (window.__btIsSolid(S.player.x + Math.cos(a * Math.PI / 8) * r, S.player.y + Math.sin(a * Math.PI / 8) * r)) solid++;
  return { near, solid };
}, r);
const icons = (P) => P.page.evaluate(() => Object.assign({}, window.__btPopupIconsDrawn || {}));
const elemLog = (P) => P.page.evaluate(() => (window.__btElemLog || []).slice());
const clearStatuses = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  S._chillUntil = 0; S._stuckUntil = 0; S._burnUntil = 0; S._gust = null; S._gustAt = 0;
  S._dazeUntil = 0; S._shockUntil = 0; S._shockFrom = null; S._soakUntil = 0; S._poisonUntil = 0;   /* v2.3.3014 */
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `elemhits-${name}.png`) });
  const P = await H.newPlayer(browser, { name: 'Weathered', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);
  const probes = await P.page.evaluate(() => ({ dispatch: typeof window.__btDispatch === 'function', audio: !!(window.BT_AUDIO && window.BT_AUDIO.elemHit) }));
  rec.ok(`setup: in the Wheel (${zone}), the dispatcher and the element sounds there`, zone === 'wheel' && probes.dispatch && probes.audio, probes);
  /* A real keystroke on a loop (mp-hitreal's remedy): the page logs itself
     out after two minutes without REAL input (wsClient idleLogout), and a
     scenario driven through page.evaluate makes none however busy it looks.
     Control: real input to the window, nothing in the game (Shift was, until
     v2.3.3006 made it the sprint). */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* past the Mayor's gate, so the lands are open (wheelCommonsGate) */
  await H.devOp(wsPort, 'quests', myId);
  await P.page.waitForTimeout(1200);

  /* ── A. the client's half ── */
  /* Open ground for the walks, AWAY from the stairs back to town: the arrival
     is beside them (S.map's tile 8), and a test walk or a shove that touches
     them takes you out of the Wheel.  Tried along the line away from them,
     then round it, until a step every way goes somewhere. */
  const geo = await P.page.evaluate(() => {
    const S = window._gameState.current;
    let ex = null;
    for (let y = 0; y < (S.map || []).length && !ex; y++) { const x = S.map[y].indexOf(8); if (x >= 0) ex = { x: x * 32 + 16, y: y * 32 + 16 }; }
    return { ex, me: { x: S.player.x, y: S.player.y } };
  });
  const away = geo.ex ? Math.atan2(geo.me.y - geo.ex.y, geo.me.x - geo.ex.x) : Math.PI / 2;
  let home0 = null;
  const tried = [];
  for (const r of [420, 640, 300, 860]) {
    for (const da of [0, 0.6, -0.6, 1.2, -1.2, 2]) {
      const spot = { x: geo.me.x + Math.cos(away + da) * r, y: geo.me.y + Math.sin(away + da) * r };
      await H.hopTo(P, spot.x, spot.y, { step: 100, gap: 260, tries: 20 });
      await P.page.waitForTimeout(300);
      const z = await H.readState(P, (S) => S.currentZone);
      const e1 = await walk(P, 300, 1, 0), w1 = await walk(P, 300, -1, 0);
      const n1 = await walk(P, 300, 0, -1), s1 = await walk(P, 300, 0, 1);
      /* room for the 48 px gust and the walks, and a margin (v2.3.2999) */
      const room = await roomy(P, 72);
      const ok = z === 'wheel' && [e1, w1, n1, s1].every((m) => m.d > 3) && !room.near && !room.solid;
      tried.push({ r, da, z, ok, room, d: [e1, w1, n1, s1].map((m) => Math.round(m.d)) });
      if (ok) { home0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y })); break; }
    }
    if (home0) break;
  }
  rec.ok('setup: open ground away from the stairs back to town', !!home0, { geo, tried });
  if (!home0) return;

  /* 1. the chill -- read as the walk's own speed this frame (S.player.vx, the
     px per 60fps-frame the loop moves you), not as distance over wall-clock
     time: a headless page's frame rate wanders far more than 45%. */
  const pace = (sx) => P.page.evaluate((sx) => new Promise((res) => {
    const S = window._gameState.current;
    S.stickX = sx; S.stickY = 0;
    setTimeout(() => { const v = Math.abs(S.player.vx || 0); S.stickX = 0; S.stickY = 0; res(v); }, 250);
  }), sx);
  await clearStatuses(P);
  const base = await pace(1);
  await pace(-1);
  const c0 = await hitMe(P, { elem: 'frost', st: 'chill', stMs: 5000 });
  const chilled = await pace(1);
  await shot(P, 'a1-chill');
  await H.waitFor(P, (S) => (S._chillUntil || 0) - Date.now(), (v) => v < 0, { timeout: 9000, label: 'the chill to end' });
  const after = await pace(-1);
  const ratio = chilled / Math.max(0.0001, base);
  rec.ok(`chill: about half pace while it lasts (${base.toFixed(3)} -> ${chilled.toFixed(3)} px a frame, x${ratio.toFixed(2)}), full pace after (${after.toFixed(3)})`,
    c0.chill > c0.now && base > 0.05 && ratio > 0.5 && ratio < 0.6 && Math.abs(after - base) < base * 0.02, { base, chilled, after, c0 });

  /* 2. the hold */
  await clearStatuses(P);
  /* held long enough that a slow page cannot outlast it mid-check; the roll
     in the same breath as the hit */
  const roll = await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-elem', targetId: S.myId, dmg: 4, dmgTaken: 4, zone: S.currentZone,
      attackerX: S.player.x + 24, attackerY: S.player.y, ability: 'qa', elem: 'flora', st: 'stuck', stMs: 4000 } });
    const st0 = S.rpg ? S.rpg.stamina : null;
    const left = (S._stuckUntil || 0) - Date.now();
    window._gameFns.contextualDodge(0);
    const pops = (S.dmgNumbers || []).filter((d) => d.text === 'Stuck!').length;
    return { left, rolled: !!S._dodgeRoll, stamina: [st0, S.rpg ? S.rpg.stamina : null], pops, now: Date.now(), stuck: S._stuckUntil };
  });
  const s0 = { stuck: roll.stuck, now: roll.now };
  const held = await walk(P, 500, 1, 0);
  await shot(P, 'a2-stuck');
  await H.waitFor(P, (S) => (S._stuckUntil || 0) - Date.now(), (v) => v < 0, { timeout: 8000, label: 'the hold to end' });
  const free = await walk(P, 500, -1, 0);
  rec.ok(`stuck: held where you stand (${Math.round(held.d)} px in half a second), then free (${Math.round(free.d)} px)`,
    s0.stuck > s0.now && held.d < 1 && free.d > 10, { held, free, s0 });
  rec.ok('stuck: ...and no roll out of it: it says "Stuck!" and spends nothing', roll.left > 0 && !roll.rolled && roll.pops >= 1 && roll.stamina[0] === roll.stamina[1], roll);
  /* ...and once it has let go, the roll is yours again */
  const roll2 = await P.page.evaluate(() => { const S = window._gameState.current; window._gameFns.contextualDodge(Math.PI / 2); return !!S._dodgeRoll; });
  rec.ok('stuck: once it lets go, you can roll again', roll2, roll2);
  await P.page.waitForTimeout(900);
  await H.hopTo(P, home0.x, home0.y, { step: 60, gap: 260, tries: 10 });

  /* 3. the gust */
  await clearStatuses(P);
  const g0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  /* the shove away from the stairs, like every walk here */
  const kb = [Math.round(Math.cos(away) * 48), Math.round(Math.sin(away) * 48)];
  await hitMe(P, { elem: 'wind', st: 'gust', stMs: 240, kb });
  await P.page.waitForTimeout(90);
  await shot(P, 'a3-gust');
  await P.page.waitForTimeout(400);
  const g1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, gust: !!S._gust }));
  rec.ok(`gust: shoved its length the way it said (${Math.round(g1.x - g0.x)}, ${Math.round(g1.y - g0.y)} px for ${JSON.stringify(kb)}) and done`,
    Math.abs((g1.x - g0.x) - kb[0]) < 4 && Math.abs((g1.y - g0.y) - kb[1]) < 4 && !g1.gust, { g0, g1, kb });
  await H.hopTo(P, home0.x, home0.y, { step: 60, gap: 260, tries: 10 });
  const bad = await hitMe(P, { elem: 'wind', st: 'gust', stMs: 240, kb: [9000, 0] });
  const nan = await hitMe(P, { elem: 'wind', st: 'gust', stMs: 240, kb: ['x', 1] });
  rec.ok('gust: a shove the wire could not mean is ignored (9,000 px, not a number)', !bad.gust && !nan.gust, { bad, nan });

  /* 4. a burn's tick */
  await clearStatuses(P);
  const before = await H.readState(P, (S) => ({ flash: S._hitFlash || 0, punch: S._camPunch ? S._camPunch.ts : 0, icons: Object.assign({}, window.__btPopupIconsDrawn || {}) }));
  const blow = await hitMe(P, { elem: 'flame', st: 'burn', stMs: 3000, dmgTaken: 3 });
  await P.page.waitForTimeout(150);
  const mid = await H.readState(P, (S) => ({ flash: S._hitFlash || 0, punch: S._camPunch ? S._camPunch.ts : 0 }));
  await P.page.evaluate(() => { const S = window._gameState.current; S._hitFlash = 0; S._camPunch = null; });
  await hitMe(P, { ability: 'burn', elem: 'flame', dmg: 3, dmgTaken: 3 });
  await P.page.waitForTimeout(250);
  await shot(P, 'a4-burn');
  const tick = await H.readState(P, (S) => ({ flash: S._hitFlash || 0, punch: S._camPunch ? S._camPunch.ts : 0, burn: S._burnUntil || 0,
    sound: window.BT_AUDIO && window.BT_AUDIO._lastElemSound, icons: Object.assign({}, window.__btPopupIconsDrawn || {}) }));
  rec.ok('burn: the goblin\'s blow sets you burning (a blow still flinches)', mid.flash > before.flash && blow.burn > blow.now + 2500, { before, mid, blow });
  rec.ok(`burn: a tick's number carries the flame (${(tick.icons['elem-flame'] || 0) - (before.icons['elem-flame'] || 0)} drawn), with no flinch and no shove of the camera, and sizzles (${tick.sound})`,
    (tick.icons['elem-flame'] || 0) >= (before.icons['elem-flame'] || 0) + 2 && !tick.flash && !tick.punch && tick.sound === 'burnTick', tick);

  /* ── v2.3.3014: the other four, through the same dispatcher ── */
  /* 4b. the daze: no walk, no roll, no swing -- "Dazed!" -- then free */
  await clearStatuses(P);
  const dz = await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-elem', targetId: S.myId, dmg: 4, dmgTaken: 4, zone: S.currentZone,
      attackerX: S.player.x + 24, attackerY: S.player.y, ability: 'qa', elem: 'stone', st: 'daze', stMs: 4000 } });
    const st0 = S.rpg ? S.rpg.stamina : null;
    const pops0 = (S.dmgNumbers || []).filter((d) => d.text === 'Dazed!').length;
    S._dazeNoteAt = 0;
    window._gameFns.contextualDodge(0);
    const popsRoll = (S.dmgNumbers || []).filter((d) => d.text === 'Dazed!').length;
    S._dazeNoteAt = 0;
    const sw0 = S.swingTimer;
    window._gameFns.swingAttack();
    const popsSwing = (S.dmgNumbers || []).filter((d) => d.text === 'Dazed!').length;
    return { left: (S._dazeUntil || 0) - Date.now(), rolled: !!S._dodgeRoll, swung: S.swingTimer !== sw0,
      stamina: [st0, S.rpg ? S.rpg.stamina : null], pops: [pops0, popsRoll, popsSwing] };
  });
  const dHeld = await walk(P, 500, 1, 0);
  await H.waitFor(P, (S) => (S._dazeUntil || 0) - Date.now(), (v) => v < 0, { timeout: 8000, label: 'the daze to end' });
  const dFree = await walk(P, 500, -1, 0);
  rec.ok(`daze: no walk while it lasts (${Math.round(dHeld.d)} px in half a second), then free (${Math.round(dFree.d)} px)`,
    dz.left > 0 && dHeld.d < 1 && dFree.d > 10, { dz, dHeld, dFree });
  rec.ok('daze: ...no roll and no swing either: each says "Dazed!" and spends nothing',
    !dz.rolled && !dz.swung && dz.pops[1] === dz.pops[0] + 1 && dz.pops[2] === dz.pops[1] + 1 && dz.stamina[0] === dz.stamina[1], dz);
  await H.hopTo(P, home0.x, home0.y, { step: 60, gap: 260, tries: 10 });

  /* 4c. the storm: its crackle on you (a blow), and an arc off someone near
     you (a tick: no flinch), drawn from them */
  await clearStatuses(P);
  const sk = await hitMe(P, { elem: 'storm', st: 'shock', stMs: 2000 });
  const sk1 = await H.readState(P, (S) => ({ until: S._shockUntil || 0, from: S._shockFrom || null }));
  await P.page.evaluate(() => { const S = window._gameState.current; S._hitFlash = 0; S._camPunch = null; });
  const fromX = await H.readState(P, (S) => S.player.x + 110);
  await hitMe(P, { ability: 'shock', elem: 'storm', st: 'shock', stMs: 2000, dmg: 3, dmgTaken: 3, attackerX: fromX });
  await P.page.waitForTimeout(200);
  const arc = await H.readState(P, (S) => ({ flash: S._hitFlash || 0, punch: S._camPunch ? S._camPunch.ts : 0, from: S._shockFrom || null,
    sound: window.BT_AUDIO && window.BT_AUDIO._lastElemSound, drawn: Object.assign({}, window.__btElemFxDrawn || {}) }));
  rec.ok(`shock: the crackle on you when it struck you (no arc to draw: it started with you)`, sk1.until > sk.now + 1500 && !sk1.from, sk1);
  rec.ok(`shock: an arc off someone near you is drawn from where they stand (${arc.from && Math.round(arc.from.x - fromX)} px off), with no flinch and no shove of the camera, and crackles (${arc.sound})`,
    !!arc.from && Math.abs(arc.from.x - fromX) < 1 && !arc.flash && !arc.punch && arc.sound === 'shockTick' && (arc.drawn.arc || 0) > 0, arc);

  /* 4d. the venom: a blow that poisons, then a tick with the venom icon */
  await clearStatuses(P);
  const pv0 = await H.readState(P, (S) => ({ icons: Object.assign({}, window.__btPopupIconsDrawn || {}) }));
  const pz = await hitMe(P, { elem: 'venom', st: 'poison', stMs: 5000 });
  await P.page.evaluate(() => { const S = window._gameState.current; S._hitFlash = 0; S._camPunch = null; });
  await hitMe(P, { ability: 'poison', elem: 'venom', dmg: 2, dmgTaken: 2 });
  await P.page.waitForTimeout(250);
  const ptk = await H.readState(P, (S) => ({ flash: S._hitFlash || 0, punch: S._camPunch ? S._camPunch.ts : 0, until: S._poisonUntil || 0,
    sound: window.BT_AUDIO && window.BT_AUDIO._lastElemSound, icons: Object.assign({}, window.__btPopupIconsDrawn || {}) }));
  rec.ok(`poison: the blow poisons you, and a tick's number carries the venom (${(ptk.icons['elem-venom'] || 0) - (pv0.icons['elem-venom'] || 0)} drawn), with no flinch, bubbling (${ptk.sound})`,
    pz.now && ptk.until > pz.now + 4000 && (ptk.icons['elem-venom'] || 0) >= (pv0.icons['elem-venom'] || 0) + 2 && !ptk.flash && !ptk.punch && ptk.sound === 'poisonTick', ptk);

  /* 5. every element's icon on its number */
  await clearStatuses(P);
  const i0 = await icons(P);
  await hitMe(P, { elem: 'frost' });
  await P.page.waitForTimeout(120);
  await hitMe(P, { elem: 'wind' });
  await P.page.waitForTimeout(120);
  await hitMe(P, { elem: 'flora' });
  await P.page.waitForTimeout(120);
  for (const e of ['stone', 'storm', 'water', 'venom']) {   /* v2.3.3014 */
    await hitMe(P, { elem: e });
    await P.page.waitForTimeout(120);
  }
  await hitMe(P, {});
  await P.page.waitForTimeout(250);
  const i1 = await icons(P);
  const more = (k) => (i1[k] || 0) - (i0[k] || 0);
  rec.ok(`icons: the snowflake (${more('elem-frost')}), the wind (${more('elem-wind')}) and the slime (${more('slime')}) on their numbers, the heart on a plain one (${more('heart')})`,
    more('elem-frost') >= 1 && more('elem-wind') >= 1 && more('slime') >= 1 && more('heart') >= 1, { i0, i1 });
  rec.ok(`icons: ...and the stone (${more('elem-stone')}), the storm (${more('elem-storm')}), the water (${more('elem-water')}) and the venom (${more('elem-venom')}) on theirs (v2.3.3014)`,
    ['elem-stone', 'elem-storm', 'elem-water', 'elem-venom'].every((k) => more(k) >= 1), { i0, i1 });
  /* v2.3.3026, owner: "when monsters damage you I want the damage numbers as
     large as they usually are and with the elemental icon after the damage
     number similar to how the sword has sword icon if melee damage, arrow
     icon if bow damage" -- each mark cut to its own opaque box and drawn as
     tall as the number, as the sword is (the badges' margins had drawn the
     snowflake about 14 px beside the sword's 20), the slime's splat no wider
     than 1.5x that; and the number spawned over your head's band, as a number
     you deal is over the monster's bar -- not on your face (it was y - 20) */
  {
    const taken = await P.page.evaluate(() => (window.__btTakenPops ? JSON.parse(JSON.stringify(window.__btTakenPops)) : null)) || {};
    const MARKS = ['elem-frost', 'elem-flame', 'elem-wind', 'elem-stone', 'elem-storm', 'elem-water', 'elem-venom', 'heart'];
    const tall = (t) => !!t && !!t.tight && Math.abs(t.h - Math.min(t.font, 22)) < 0.6;
    const sl = taken.slime;
    const slimeOk = !!sl && !!sl.tight && sl.w <= 1.5 * Math.min(sl.font, 22) + 0.6;
    const overHead = MARKS.every((k) => taken[k] && taken[k].band != null && taken[k].y < taken[k].band);
    const fr = taken['elem-frost'] || {};
    rec.ok(`numbers taken: every element's mark is cut to its own size and drawn as tall as the number (the snowflake ${fr.h} px for a ${fr.font} px number, the slime's splat ${sl ? sl.w : '?'} px wide), and each number spawned over your head (${fr.band != null ? Math.round(fr.band - fr.y) : '?'} world px over the band's top), not on your face`,
      MARKS.every((k) => tall(taken[k])) && slimeOk && overHead, taken);
  }

  /* 6. the chips */
  await clearStatuses(P);
  await hitMe(P, { elem: 'frost', st: 'chill', stMs: 5000 });
  await hitMe(P, { elem: 'flame', st: 'burn', stMs: 5000 });
  await hitMe(P, { elem: 'flora', st: 'stuck', stMs: 5000 });
  /* v2.3.3014 */
  await hitMe(P, { elem: 'stone', st: 'daze', stMs: 5000 });
  await hitMe(P, { elem: 'water', st: 'soak', stMs: 5000 });
  await hitMe(P, { elem: 'venom', st: 'poison', stMs: 5000 });
  /* any player_state re-renders the HUD; nudge one */
  await walk(P, 120, 0, 1);
  await P.page.waitForTimeout(400);
  const chips = await P.page.evaluate(() => Array.from(document.querySelectorAll('img')).filter((im) => /elem-frost|elem-flame|slime-remnants|elem-stone|elem-water|elem-venom/.test(im.getAttribute('src') || '')).map((im) => {
    const r = im.getBoundingClientRect();
    return { alt: im.alt, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), visible: r.width > 0 && r.height > 0 };
  }));
  await shot(P, 'a6-all');
  rec.ok(`chips: the chill, the burn and the hold each show in the HUD with its icon (${chips.map((c) => c.alt).join(', ')})`,
    ['Chilled', 'Burning', 'Stuck'].every((a) => chips.some((c) => c.alt === a && c.visible)), chips);
  rec.ok('chips: ...and the daze, the soak and the poison (v2.3.3014)',
    ['Dazed', 'Soaked', 'Poisoned'].every((a) => chips.some((c) => c.alt === a && c.visible)), chips);
  await clearStatuses(P);
  await H.devOp(wsPort, 'vitals', myId, { heal: true });

  /* 7. the looks, on open ground: the commons, nothing standing within
     220 px (no roof over you, no trunk in front), each status held long
     enough for a picture */
  const open = await P.page.evaluate(() => {
    const W = window.__btWheelObjects;
    /* nothing within 110 px, and nothing tall in front of you (south, where
       a crown would hide you) within 260 */
    for (let r = 1700; r <= 2850; r += 75) {
      for (let a = 0; a < 360; a += 6) {
        const x = 21504 + Math.cos(a * Math.PI / 180) * r, y = 21504 + Math.sin(a * Math.PI / 180) * r;
        if (W.near(x, y, 110).length) continue;
        if (W.near(x, y + 130, 130).some((o) => o.h > 60)) continue;
        return { x, y, a, r };
      }
    }
    return null;
  });
  rec.ok('looks: a clear patch of the commons to stand on', !!open, open);
  if (open) {
    await H.hopTo(P, open.x, open.y, { step: 100, gap: 260, tries: 40 });
    await P.page.waitForTimeout(1500);
    const look = async (name, p, wait) => {
      await clearStatuses(P);
      await P.page.waitForTimeout(150);
      await hitMe(P, p);
      await P.page.waitForTimeout(wait);
      await shot(P, 'look-' + name);
    };
    await look('chill', { elem: 'frost', st: 'chill', stMs: 4000 }, 400);
    await look('stuck', { elem: 'flora', st: 'stuck', stMs: 4000 }, 400);
    await look('burn', { elem: 'flame', st: 'burn', stMs: 4000 }, 600);
    /* the streaks last 650 ms of the clock, and a headless page draws a few
       frames a second: the picture holds the shove's look a moment into its
       sweep while it is taken (the shove itself was checked above) */
    await look('gust', { elem: 'wind', st: 'gust', stMs: 240, kb: [48, 0] }, 60);
    await P.page.evaluate(() => { const S = window._gameState.current; window.__qaGustHold = setInterval(() => { S._gustAt = Date.now() - 200; S._gustDustAt = S._gustAt; }, 20); });
    await P.page.waitForTimeout(500);
    await shot(P, 'look-gust');
    await P.page.evaluate(() => clearInterval(window.__qaGustHold));
    /* v2.3.3014: the other four */
    await look('daze', { elem: 'stone', st: 'daze', stMs: 4000 }, 400);
    await look('shock', { elem: 'storm', st: 'shock', stMs: 4000 }, 300);
    await look('soak', { elem: 'water', st: 'soak', stMs: 4000 }, 700);
    await look('poison', { elem: 'venom', st: 'poison', stMs: 4000 }, 700);
    await clearStatuses(P);
    const drawn = await P.page.evaluate(() => Object.assign({}, window.__btElemFxDrawn || {}));
    rec.ok(`looks: each is drawn round you (frames: chill ${drawn.chill || 0}, stuck ${drawn.stuck || 0}, burn ${drawn.burn || 0}, gust ${drawn.gust || 0}) -- pictures look-*.png`,
      drawn.chill > 0 && drawn.stuck > 0 && drawn.burn > 0 && drawn.gust > 0, drawn);
    rec.ok(`looks: ...and the daze's stars, the storm's crackle, the soak's drips, the poison's bubbles (frames: ${drawn.daze || 0}, ${drawn.shock || 0}, ${drawn.soak || 0}, ${drawn.poison || 0})`,
      drawn.daze > 0 && drawn.shock > 0 && drawn.soak > 0 && drawn.poison > 0, drawn);
  }

  /* ── B. the real thing ── */
  /* Round the lands next door to each other (sky, ember, frost, verdant are
     the north-east, north, north-west and west spokes), stepping back onto
     the commons -- safe ground, nothing lands there -- after each.  Before
     each, the worker must have you in the Wheel: under load this sandbox can
     stall the page past the client's 5 s freeze check, and the client then
     rejoins on purpose (wsClient _resumeRecover). */
  const lands = [
    { home: 'sky', st: 'gust', name: 'a mummy' },
    { home: 'ember', st: 'burn', name: 'a fire goblin' },
    { home: 'frost', st: 'chill', name: 'a snowman' },
    { home: 'verdant', st: 'stuck', name: 'a blue slime' },
    /* v2.3.3014: on round the wheel, south-west to east */
    { home: 'mist', st: 'poison', name: 'a wisp' },
    { home: 'tidal', st: 'soak', name: 'a fishman' },
    { home: 'thunder', st: 'shock', name: 'a Storm Peaks slime' },
    { home: 'hollows', st: 'daze', name: 'a rock monster' },
  ];
  const CENTRE = [21504, 21504];
  const settle = async () => {
    let sv = null, cz = null;
    for (let i = 0; i < 60; i++) {
      cz = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      sv = await H.serverPlayer(wsPort, myId).catch(() => null);
      if (cz === 'wheel' && sv && sv.zone === 'wheel' && !sv.dead) return { ok: true, sv };
      await P.page.waitForTimeout(500);
    }
    const net = await P.page.evaluate(() => {
      const S = window._gameState.current;
      let crash = null;
      try { crash = JSON.parse(localStorage.getItem('bt-crashlog') || '[]').slice(-6); } catch (e) { crash = String(e); }
      return { status: S._realtimeStatus, netHold: !!S._netHold, crash };
    });
    return { ok: false, cz, sv, net };
  };
  for (const L of lands) {
    const st0 = await settle();
    if (!st0.ok) { rec.ok(`real: in the Wheel on both sides before ${L.name}`, false, st0); continue; }
    await H.devOp(wsPort, 'vitals', myId, { heal: true });
    const target = await P.page.evaluate((home) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).filter((x) => x && x.home === home && x.alive !== false && x.hp > 0)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      return m ? { id: m.id, x: m.x, y: m.y } : null;
    }, L.home);
    if (!target) { rec.ok(`real: ${L.name} to meet`, false, { home: L.home }); continue; }
    /* v2.3.3014: what came in since now, by the time on each entry -- the
       log keeps its last 60, so by the fifth land an index into it no longer
       moves (it read the Tidal Coast's hits as none) */
    const n0 = await P.page.evaluate(() => Date.now());
    const since = (log) => log.filter((e) => e.at >= n0);
    await H.hopTo(P, target.x, target.y + 36, { step: 100, gap: 260, tries: 90 });
    let got = null;
    for (let i = 0; i < 80 && !got; i++) {
      /* keep beside it: it chases, it is pushed, it backs off to throw */
      const m = await P.page.evaluate((id) => {
        const S = window._gameState.current;
        const x = (S.monsters || []).find((q) => q.id === id);
        return x ? { x: x.x, y: x.y, alive: x.alive !== false && x.hp > 0 } : null;
      }, target.id);
      if (m && m.alive && i % 4 === 3) await H.hopTo(P, m.x, m.y + 36, { step: 60, gap: 200, tries: 4 });
      const log = since(await elemLog(P));
      got = log.find((e) => e.st === L.st && String(e.monsterId).indexOf('wm-' + L.home) === 0) || null;
      if (!got) await P.page.waitForTimeout(250);
    }
    if (got && L.st === 'gust') {
      /* where the shove left you, on both sides, once it has been walked out */
      await shot(P, 'b-' + L.st);
      /* not mid-shove (the mummy keeps swinging, and another gust may be
         under way): sampled until one lands between them */
      let cl = null, sv = null, off = null;
      for (let i = 0; i < 12; i++) {
        await P.page.waitForTimeout(250);
        cl = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y), mid: !!S._gust }));
        sv = await H.serverPlayer(wsPort, myId).catch(() => null);
        off = sv && typeof sv.x === 'number' ? Math.hypot(sv.x - cl.x, sv.y - cl.y) : null;
        if (!cl.mid && off != null && off < 24) break;
      }
      rec.ok(`real: ${L.name} blows you back ${JSON.stringify(got.kb)} -- and the worker agrees where you landed (${off == null ? '?' : Math.round(off)} px apart)`,
        Array.isArray(got.kb) && Math.abs(Math.hypot(got.kb[0], got.kb[1]) - 48) <= 2 && off != null && off < 24, { got, cl, sv: sv && { x: sv.x, y: sv.y, z: sv.zone } });
    } else if (got && L.st === 'burn') {
      await shot(P, 'b-' + L.st);
      let ticks = [];
      for (let i = 0; i < 16 && ticks.length < 1; i++) {
        await P.page.waitForTimeout(250);
        ticks = since(await elemLog(P)).filter((e) => e.ability === 'burn' && e.elem === 'flame');
      }
      rec.ok(`real: ${L.name} sets you burning (${got.stMs} ms), and its ticks come with the flame (${ticks.length} so far, ${ticks.map((t) => t.dmgTaken).join('/')} hp)`,
        got.stMs === 3000 && ticks.length >= 1 && ticks.every((t) => t.dmgTaken > 0), { got, ticks });
    } else if (got && L.st === 'poison') {
      /* v2.3.3014: its ticks, as the burn's */
      await shot(P, 'b-' + L.st);
      let ticks = [];
      for (let i = 0; i < 16 && ticks.length < 1; i++) {
        await P.page.waitForTimeout(250);
        ticks = since(await elemLog(P)).filter((e) => e.ability === 'poison' && e.elem === 'venom');
      }
      rec.ok(`real: ${L.name} poisons you (${got.stMs} ms), and its ticks come with the venom (${ticks.length} so far)`,
        got.stMs === 5000 && ticks.length >= 1 && ticks.every((t) => typeof t.dmgTaken === 'number'), { got, ticks });
    } else if (got && L.st === 'soak') {
      /* v2.3.3014: soaked, the worker refills your stamina slower -- read off
         its own echoes, from 20 (the dev op heals you too): first where you
         stand, the fishmen's next hits keeping you soaked; then dry, out of
         their reach on the commons' safe ground once the soak has run out */
      await shot(P, 'b-' + L.st);
      const refill = async () => {
        await H.devOp(wsPort, 'vitals', myId, { stamina: 20 });
        await P.page.waitForTimeout(400);
        const a = await H.readState(P, (S) => (S.rpg ? S.rpg.stamina : null));
        await P.page.waitForTimeout(2000);
        const b = await H.readState(P, (S) => ({ st: S.rpg ? S.rpg.stamina : null, wet: (S._soakUntil || 0) > Date.now() }));
        return { a, b: b.st, wet: b.wet, gain: b.st - a };
      };
      const soaked = await refill();
      const here0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const ux0 = here0.x - CENTRE[0], uy0 = here0.y - CENTRE[1], ul0 = Math.hypot(ux0, uy0) || 1;
      await H.hopTo(P, CENTRE[0] + ux0 / ul0 * 2700, CENTRE[1] + uy0 / ul0 * 2700, { step: 100, gap: 260, tries: 20 });
      const wet = await H.readState(P, (S) => (S._soakUntil || 0) - Date.now());
      await P.page.waitForTimeout(Math.max(0, wet + 300));
      const dry = await refill();
      rec.ok(`real: ${L.name} soaks you (${got.stMs} ms), and soaked the worker refills your stamina slower (+${soaked.gain} in 2 s soaked, +${dry.gain} dry)`,
        got.stMs === 4000 && soaked.wet && !dry.wet && dry.gain > 0 && soaked.gain >= 0 && soaked.gain < dry.gain * 0.6, { got, soaked, dry });
    } else if (got && (L.st === 'shock' || L.st === 'daze')) {
      /* v2.3.3014: the crackle (alone, nobody to arc to) and the daze */
      const now2 = await H.readState(P, (S) => ({ shock: S._shockUntil || 0, daze: S._dazeUntil || 0, from: S._shockFrom || null, t: Date.now() }));
      await shot(P, 'b-' + L.st);
      const until = L.st === 'shock' ? now2.shock : now2.daze;
      rec.ok(`real: ${L.name}'s hit ${L.st === 'shock' ? 'crackles on you (alone: nobody near to arc to)' : 'dazes you'} (${got.stMs} ms, the ${got.elem} icon)`,
        got.stMs === (L.st === 'shock' ? 450 : 500) && until >= got.at + got.stMs - 50 && (L.st !== 'shock' || !now2.from), { got, now2 });
    } else if (got) {
      const now = await H.readState(P, (S) => ({ chill: S._chillUntil || 0, stuck: S._stuckUntil || 0, t: Date.now() }));
      await shot(P, 'b-' + L.st);
      const until = L.st === 'chill' ? now.chill : now.stuck;
      rec.ok(`real: ${L.name}'s hit ${L.st === 'chill' ? 'chills you' : 'holds you in place'} (${got.stMs} ms, the ${got.elem} icon)`,
        got.stMs === (L.st === 'chill' ? 1000 : 700) && until >= got.at + got.stMs - 50, { got, now });
    } else {
      const log = since(await elemLog(P));
      const me = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y), hp: S.rpg && S.rpg.hp, zone: S.currentZone }));
      const sv = await H.serverPlayer(wsPort, myId).catch((e) => ({ err: String(e) }));
      const net = await P.page.evaluate(() => {
        const S = window._gameState.current;
        let crash = null;
        try { crash = JSON.parse(localStorage.getItem('bt-crashlog') || '[]').slice(-6); } catch (e) { crash = String(e); }
        return { status: S._realtimeStatus, netHold: !!S._netHold, crash };
      });
      rec.ok(`real: ${L.name} hits you and ${L.st}s you`, false, { log: log.slice(-6), me, target, sv, net });
    }
    /* out of its reach: onto the commons' edge, safe ground */
    await clearStatuses(P);
    const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const ux = here.x - CENTRE[0], uy = here.y - CENTRE[1], ul = Math.hypot(ux, uy) || 1;
    await H.hopTo(P, CENTRE[0] + ux / ul * 2700, CENTRE[1] + uy / ul * 2700, { step: 100, gap: 260, tries: 20 });
  }

  stopAlive = true;
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
}
