/* ═══ THE SHIELD AGAINST A PLAYER, ON TWO PHONES (v2.3.3258) ═══
 *
 * Owner, on No man's land: "Also just wanted to confirm that the shield button
 * does become available the moment you're in combat for any weapon type
 * (melee, bow, staff)".
 *
 * It does (src/game/shieldToggle.js shieldButtonLive: a lock, a blow taken in
 * the last 5 s, or a monster in reach, for a sword, a bow or a staff alike) --
 * but with no lock a guard raised against a PLAYER pointed at the nearest
 * MONSTER (or a stale angle), and the worker measures a block's arc (+/-60
 * degrees) at impact.  So the arrow that lit the button walked past the shield
 * it lit.  v2.3.3258: a pvp_hit remembers who threw it, and for 3 s the guard
 * faces them (shieldAimAngle, noteShieldThreat).
 *
 * Two phones, a real duel in town (the consent that lets the hits land; the
 * rule is the same as No man's land's), the defender holding NO lock:
 *   1. for each of the defender's weapons -- the sword, the bow, the staff --
 *      no shield button before the fight (no lock, no blow, nothing near),
 *      and the moment a blow from the attacker lands, the button is there;
 *   2. with a monster planted on the defender's OTHER side (100 px behind,
 *      inside the 220 px the ladder looks in), a tap on the button raises the
 *      guard facing the ATTACKER, not the monster;
 *   3. the attacker's next blow is BLOCKED by the worker (no HP lost);
 *   4. (the ladder, for the record) with the threat forgotten the guard swings
 *      to the monster -- the rung this version added is what turns it;
 *   5. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

async function closeIn(A, wsPort, aId, bId, want = 40) {
  for (let i = 0; i < 20; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    const tol = Math.max(8, want * 0.25);
    if (Math.abs(d - want) <= tol) return { ok: true, d: Math.round(d) };
    const away = d < want;
    const sx = away ? -dx : dx, sy = away ? -dy : dy;
    const key = Math.abs(dx) > Math.abs(dy) ? (sx > 0 ? 'd' : 'a') : (sy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, Math.abs(d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

async function equipFromStash(P, wantType, slot, activeSlot) {
  return P.page.evaluate(({ wantType, slot, activeSlot }) => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return { ok: false, why: 'no state' };
    if (R[slot] && R[slot].type === wantType) {
      S.channel.send({ type: 'set_active_slot', payload: { slot: activeSlot } });
      R.activeSlot = activeSlot; S._userCycledSlot = true;
      return { ok: true, worn: true };
    }
    const i = (R.weaponStash || []).findIndex((w) => w && w.type === wantType);
    if (i < 0) return { ok: false, why: 'not in stash', stash: (R.weaponStash || []).map((w) => w && w.type) };
    S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot } });
    S.channel.send({ type: 'set_active_slot', payload: { slot: activeSlot } });
    R.activeSlot = activeSlot;
    S._userCycledSlot = true;
    return { ok: true, idx: i };
  }, { wantType, slot, activeSlot });
}

/* the block control as a thumb sees it */
const shieldBtn = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-shield]');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
  return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width),
    onScreen: r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < innerHeight,
    hitsSelf: !!(hit && (hit === el || el.contains(hit))) };
});

/* the attacker's blow, as its page puts a sword hit on the wire (the claim's
   number is ignored by the worker, which rolls its own) */
const swingAt = (A, bId, sw) => A.page.evaluate(({ bId, sw }) => {
  const S = window._gameState.current;
  const o = S.others && S.others[bId];
  if (!o || !S.channel) return false;
  const ang = Math.atan2((o.y != null ? o.y : o.renderY) - S.player.y, (o.x != null ? o.x : o.renderX) - S.player.x);
  /* the page's own shape (monsterCombat.js): a broadcast the worker settles */
  S.channel.send({ type: 'broadcast', event: 'player_attack', payload: { id: S.myId, x: S.player.x, y: S.player.y,
    angle: ang, dmgBase: 10, critChance: 0, range: 140, arc: 2.6, ts: Date.now(), inDuel: !!S._inDuel, sw, kind: 'melee', target: bId } });
  return true;
}, { bId, sw });

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Guard', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  const errors = [];
  B.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B);
  let alive = true;
  const keep = (async () => { while (alive) { for (const P of [A, B]) await P.page.keyboard.press('Control').catch(() => {}); await B.page.waitForTimeout(15000).catch(() => {}); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); };

  /* Arm both with every weapon and a shield: tut_1 pays the sword and shield on
     accept, the bow and staff on turn-in (mp-duelfeel's road). */
  for (const P of [A, B]) {
    await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  }
  await A.page.waitForTimeout(1500);
  for (const [P, id] of [[A, aId], [B, bId]]) {
    await H.grant(wsPort, id, 'item', { invKey: 'snowman', count: 4 });
    await P.page.waitForTimeout(700);
    await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'sword' } }); });
  }
  await A.page.waitForTimeout(1800);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState.current; const R = S.rpg;
      if (!R.shield && (R.shieldStash || []).length) R.shield = R.shieldStash[0];
      if (R._quests) R._quests.tut_4 = 'turnedIn';   /* the onboarding coach covers the band (mp-duelblock) */
    });
  }
  const swordA = await equipFromStash(A, 'greatsword', 'weapon', 'melee');
  rec.ok('the raider holds a sword (guard)', swordA.ok, swordA);
  const shieldB = await H.readState(B, (S) => !!(S.rpg && S.rpg.shield));
  rec.ok('the guard wears a shield (guard)', shieldB);

  /* the duel: A challenges, B accepts, through the real cards */
  await H.openInspect(A, bId);
  const canDuel = (await H.buttonTexts(A)).some((t) => /duel/i.test(t));
  rec.ok('the inspect card offers a Duel (guard)', canDuel, await H.buttonTexts(A));
  if (!canDuel) { await done(); return; }
  await H.clickText(A, 'Duel');
  const gotReq = await H.waitUi(B, () => [...document.querySelectorAll('button')].some((b) => /accept/i.test(b.textContent || '')),
    { label: 'duel request', timeout: 20000 }).then(() => true).catch(() => false);
  if (!gotReq) { rec.ok('B is asked to accept the duel (guard)', false); await done(); return; }
  await H.clickText(B, 'Accept');
  await A.page.waitForTimeout(2000);
  const inDuel = await H.readState(B, (S) => !!(S._inDuel || S._activeDuel));
  rec.ok('a duel is running (guard)', inDuel);
  if (!inDuel) { await done(); return; }
  const near = await closeIn(A, wsPort, aId, bId, 40);
  rec.ok(`the raider stands in a sword's reach (guard: ${near.d} px)`, near.ok, near);

  /* ── 1. every weapon: no button before the blow, a button at once after ── */
  let sw = 7000;
  const W = [['greatsword', 'weapon', 'melee', 'sword'], ['bow', 'rangedWeapon', 'ranged', 'bow'], ['staff', 'staffWeapon', 'staff', 'staff']];
  for (const [type, slot, active, label] of W) {
    const eq = await equipFromStash(B, type, slot, active);
    await B.page.waitForTimeout(900);
    await B.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S.lastDamageTaken = 0; S._shieldThreat = null; });
    /* the button is a React child redrawn on the HUD's beat: wait for it to go */
    await H.waitUi(B, () => !document.querySelector('[data-shield]'), { label: 'the button gone', timeout: 4000 }).catch(() => {});
    const before = await shieldBtn(B);
    const why = await H.readState(B, (S) => ({ up: !!S._shieldUp, lock: !!(S.lockedTarget && S.lockedTarget.ref),
      hitAgo: S.lastDamageTaken ? Date.now() - S.lastDamageTaken : null,
      near: (S.monsters || []).filter((m) => m && m.alive && Math.hypot(m.x - S.player.x, m.y - S.player.y) <= 220).map((m) => m.id) }));
    const slotNow = await H.readState(B, (S) => S.rpg.activeSlot);
    await swingAt(A, bId, ++sw);
    const lit = await H.waitUi(B, () => {
      const el = document.querySelector('[data-shield]');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 20;
    }, { label: 'the shield button', timeout: 5000 }).then(() => true).catch(() => false);
    const after = await shieldBtn(B);
    rec.ok(`1. ${label}: no shield button before the fight (no lock, no blow, nothing near) -- equipped ${eq.ok}, active ${slotNow}`,
      eq.ok && slotNow === active && !(before.found && before.onScreen), { eq, before, why });
    rec.ok(`1. ${label}: the moment a player's blow lands, the shield button is on screen and under the thumb`,
      lit && after.found && after.onScreen && after.hitsSelf, after);
    await A.page.waitForTimeout(500);
  }

  /* ── 2. a monster planted on the far side: the guard faces the RAIDER ── */
  await equipFromStash(B, 'bow', 'rangedWeapon', 'ranged');
  await B.page.waitForTimeout(700);
  await B.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S._shieldUp = false; S._shieldThreat = null; });
  const plant = await B.page.evaluate((aid) => {
    const S = window._gameState.current;
    const o = S.others[aid];
    const ax = o.x != null ? o.x : o.renderX, ay = o.y != null ? o.y : o.renderY;
    const toA = Math.atan2(ay - S.player.y, ax - S.player.x);
    const dA = Math.hypot(ax - S.player.x, ay - S.player.y);
    /* straight behind the guard, well inside the 220 px the shield's ladder
       looks in -- and far enough that its body-centre offset (lockAimPoint)
       cannot tip the aim back over the guard's head toward the raider */
    const d = 100;
    const mx = S.player.x - Math.cos(toA) * d, my = S.player.y - Math.sin(toA) * d;
    const m = { id: 'qa-decoy', archetype: 'fodder', level: 1, alive: true, hp: 999, maxHp: 999, curHp: 999,
      x: mx, y: my, renderX: mx, renderY: my, targetX: mx, targetY: my, spawnX: mx, spawnY: my, statuses: {} };
    /* the town's own monster list (none) replaces S.monsters as it syncs, and
       the page's monster movement would walk a stranger off its spot: keep the
       decoy in the list, and where it was put, every few ms for the steps below */
    const keepIn = () => {
      if (!(S.monsters || []).some((x) => x && x.id === 'qa-decoy')) S.monsters = (S.monsters || []).concat([m]);
      m.x = m.renderX = m.targetX = mx; m.y = m.renderY = m.targetY = my; m.alive = true; m.curHp = 999;
    };
    keepIn();
    window.__qaDecoy = setInterval(keepIn, 4);
    return { toA, dA, dM: d };
  }, aId);
  await swingAt(A, bId, ++sw);
  await H.waitUi(B, () => !!document.querySelector('[data-shield]'), { label: 'the shield button', timeout: 5000 }).catch(() => {});
  const decoyIn = await H.readState(B, (S) => (S.monsters || []).some((x) => x && x.id === 'qa-decoy'));
  rec.ok('2. (guard) the decoy monster stands 100 px behind the guard, inside the shield\'s reach', decoyIn);
  const btn = await shieldBtn(B);
  if (btn.found) await B.page.touchscreen.tap(btn.x, btn.y);
  await B.page.waitForTimeout(400);
  const aim = await H.readState(B, (S) => ({ up: !!S._shieldUp, ang: S._shieldAngle, threat: S._shieldThreat ? S._shieldThreat.id : null }));
  const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  rec.ok(`2. a tap raises the guard facing the RAIDER (${aim.ang != null ? (off(aim.ang, plant.toA) * 180 / Math.PI).toFixed(0) : '?'} degrees off), not the monster ${Math.round(plant.dM)} px behind`,
    aim.up && typeof aim.ang === 'number' && off(aim.ang, plant.toA) < 0.35 && aim.threat === aId, { aim, plant });

  /* ── 3. the next blow is blocked by the worker ── */
  await B.page.waitForTimeout(500);   /* the guard's facing reaches the worker on the next move */
  const hp0 = (await H.serverPlayer(wsPort, bId) || {}).hp;
  const t3 = Date.now();
  await swingAt(A, bId, ++sw);
  await A.page.waitForTimeout(900);
  const hp1 = (await H.serverPlayer(wsPort, bId) || {}).hp;
  const hit3 = await H.readState(B, (S) => { const q = window.__btFightFood; return q && q.hits.length ? q.hits[q.hits.length - 1] : null; });
  rec.ok(`3. the raider's next blow is BLOCKED by the worker (pvp_hit blocked, HP ${hp0} -> ${hp1})`,
    !!hit3 && hit3.at >= t3 - 2000 && hit3.blocked === true && typeof hp0 === 'number' && hp1 === hp0, { hp0, hp1, hit3 });

  /* ── 4. the ladder, for the record: forget the threat and the guard turns to the monster ── */
  /* lowered, the blow forgotten, raised again with a real tap: the tap sets
     the angle itself (raiseShieldToggle), so this does not wait on this box's
     slow frames */
  await B.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; S._shieldCdUntil = 0; S._shieldThreat = null; S.lockedTarget = null; });
  await B.page.waitForTimeout(250);
  const btn2 = await shieldBtn(B);
  if (btn2.found) await B.page.touchscreen.tap(btn2.x, btn2.y);
  await B.page.waitForTimeout(150);
  const aim2 = await H.readState(B, (S) => {
    const d = (S.monsters || []).find((x) => x && x.id === 'qa-decoy');
    return { up: !!S._shieldUp, ang: S._shieldAngle, threat: S._shieldThreat, raisedAgo: Date.now() - (S.shieldActive || 0),
      lock: S.lockedTarget ? { type: S.lockedTarget.type, id: S.lockedTarget.id } : null,
      decoy: d ? { dx: Math.round(d.x - S.player.x), dy: Math.round(d.y - S.player.y), alive: d.alive } : null,
      kb: !!S._shieldKb, nMon: (S.monsters || []).length };
  });
  rec.ok('4. (the ladder) with the blow forgotten, the guard turns to the nearest monster -- the rung this version added is what faced the raider',
    aim2.up && typeof aim2.ang === 'number' && off(aim2.ang, plant.toA + Math.PI) < 0.5, { aim2, btn2, toMonster: plant.toA + Math.PI });

  await B.page.evaluate(() => { clearInterval(window.__qaDecoy); const S = window._gameState.current; S.monsters = (S.monsters || []).filter((x) => x.id !== 'qa-decoy'); });
  rec.ok('5. no page errors', errors.length === 0, errors);
  await done();
}
