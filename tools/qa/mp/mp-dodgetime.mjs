/* ═══ v2.3.2886: A PEER'S ROLL LASTS AS LONG AS THEIRS DOES ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side so there's no discrepancies."
 *
 * Your roll is elastic -- 250 ms plus Endurance plus the Reflexes node, up to
 * 700 ms (game/dodge.js dodgeWindowMs) -- and your tumble plays its nine
 * frames across exactly that.  The player_dodge broadcast carried no
 * duration, so every watcher played every roll over a flat 300 ms and dropped
 * it at 400: a long roll finished tumbling early on their screen and slid the
 * rest of the way standing up.
 *
 * Two real clients.  B rolls, through the game's own dodge (the swipe's
 * handler, _gameFns.contextualDodge); A watches.
 *   1. The real roll's broadcast must TELL the watcher how long it lasts.
 *   2. Then, frame by frame, with both clocks pinned at the middle of each of
 *      the nine tumble frames (mp-animparity's method -- this harness draws
 *      ~9 frames a second, so a free-running roll is sampled two strip frames
 *      apart on each screen): the watcher must show the frame its owner does.
 *   3. A sword dash -- drawn as the same tumble on the dasher's own screen
 *      (v2.3.2463) -- must tumble on the watcher's too, loop as the dasher's
 *      does, and stop once the dasher arrives.
 *
 *   node tools/qa/mp/run.mjs dodgetime
 */
import * as H from './harness.mjs';

/* 250 + 200 Endurance + 2 x 50 Reflexes = 550 ms: well clear of the old
   300 ms, and inside the real 250-700 range. */
const ENDURANCE = 200, REFLEXES = 50, WINDOW_MS = 550;
/* The middle of each of the nine tumble frames of a 550 ms roll -- (k + 0.5) x
   550/9 -- so a pin that lands a few ms before the game reads the clock stays
   inside the frame on both screens. */
const SAMPLES = [31, 92, 153, 214, 275, 336, 397, 458, 519];

/* Every frame, AFTER the game has drawn it: a plain rAF loop queued after the
   game loop's (which re-queues itself first thing each frame) runs after it. */
const record = (P, peerId) => P.page.evaluate((pid) => {
  window.__dtLog = [];
  window.__dtOn = true;
  const loop = () => {
    if (!window.__dtOn) return;
    const S = window._gameState && window._gameState.current;
    const R = window._pixiRenderer;
    const d = R && (pid ? R.peerDisplayRaw(pid) : R.playerDisplayRaw());
    /* Yours: a roll is S._dodgeRoll, a sword dash is S._bashDash (drawn with
       the same tumble).  A peer's: both arrive as other._dodgeRoll. */
    const _dash = S && S._bashDash && S._bashDash.kind === 'sworddash' ? S._bashDash : null;
    const roll = S && (pid ? (S.others[pid] && S.others[pid]._dodgeRoll) : (S._dodgeRoll || _dash));
    window.__dtLog.push({
      t: Date.now(), pose: d ? d._animPose || null : null, frame: d ? d._animFrame : null,
      st: roll ? roll.startTime : null, dur: roll ? (roll.durMs || null) : null,
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return true;
}, peerId || null);
const stop = (P) => P.page.evaluate(() => { window.__dtOn = false; return window.__dtLog || []; });

/* Pose/frame at `e` ms into the roll on one screen, off its own start. */
const curve = (log) => {
  const first = log.find((r) => r.st);
  if (!first) return null;
  const st0 = first.st;
  const rows = log.map((r) => ({ e: r.t - st0, pose: r.pose, frame: r.frame, dur: r.dur }));
  const at = (e) => {
    let pick = null;
    for (const r of rows) { if (r.e <= e) pick = r; else break; }
    return pick;
  };
  const endRow = rows.find((r) => r.e > 0 && r.pose !== 'dodge');
  const durSeen = (rows.find((r) => r.dur) || {}).dur || null;
  return { at, end: endRow ? endRow.e : null, durSeen, rows };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Roller' });
  await H.waitMutualSight(A, B);
  const bId = await H.readState(B, (S) => S.myId);
  await B.page.evaluate(({ en, rf }) => {
    /* The roller's stats, held every frame ahead of the game loop (the worker's
       player_state may rewrite them): the loop reads them to size the roll. */
    const hold = () => {
      const S = window._gameState && window._gameState.current;
      if (S && S.rpg) {
        S.rpg.endurance = en;
        S.rpg.enduranceSpec = Object.assign({}, S.rpg.enduranceSpec || {}, { reflexes: rf });
        S.rpg.stamina = Math.max(S.rpg.stamina || 0, 100);
      }
    };
    const _raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => _raf((ts) => { try { hold(); } catch (e) { /* the game's frame first */ } cb(ts); });
    hold();
    const S = window._gameState.current;
    S.lockedTarget = null;   /* a plain roll, not a lunge or a retreat shot */
    if (S.player) { S.player.vx = 0; S.player.vy = 0; }
  }, { en: ENDURANCE, rf: REFLEXES });
  await B.page.waitForTimeout(800);

  /* ── 1. A REAL roll: the watcher must be told how long it lasts ── */
  const fired = await B.page.evaluate(() => {
    const f = window._gameFns && window._gameFns.contextualDodge;
    if (typeof f !== 'function') return { ok: false, why: 'no contextualDodge' };
    f(0);   /* east */
    const S = window._gameState.current;
    return { ok: !!S._dodgeRoll, kind: S._dodgeRoll && (S._dodgeRoll.kind || 'dodge') };
  });
  let told = null;
  for (let i = 0; i < 40 && !told; i++) {
    told = await A.page.evaluate((id) => {
      const o = window._gameState.current.others[id];
      const r = o && o._dodgeRoll;
      return r ? { kind: r.kind, durMs: r.durMs == null ? null : r.durMs } : null;
    }, bId);
    if (!told) await A.page.waitForTimeout(25);
  }
  const ownDur = await B.page.evaluate(() => { const r = window._gameState.current._dodgeRoll; return r ? r.durMs : null; });
  rec.ok('the roller rolled, through the game\'s own dodge (guard)', fired.ok === true && fired.kind === 'dodge', fired);
  rec.ok(`the roller's own window is the ${WINDOW_MS} ms the stats give (guard)`, ownDur === WINDOW_MS, { ownDur });
  rec.ok(`the watcher is told how long the roll lasts (told ${told && told.durMs} ms, the roller's is ${ownDur})`,
    !!told && told.durMs === ownDur, { told, ownDur });
  await B.page.waitForTimeout(1200);

  /* ── 2. Frame by frame, both clocks pinned (mp-animparity's method) ──
     At this harness's frame rate a free-running roll is sampled every ~100 ms
     on each screen, at different moments, which is two frames of this strip.
     So hold each screen's roll at the same point instead: the roller's own
     record as the game keeps it, the watcher's as the real handler above left
     it (its durMs included, or not), each re-stamped at the START of every
     frame, ahead of the game loop. */
  const install = (P, pid, dur) => P.page.evaluate(({ pid, dur }) => {
    window.__dtPin = { on: false, e: 0, x: 0, y: 0 };
    const S0 = window._gameState.current;
    if (!pid) { window.__dtPin.x = S0.player.x; window.__dtPin.y = S0.player.y; }
    const pin = () => {
      const p = window.__dtPin, S = window._gameState && window._gameState.current;
      if (!p.on || !S) return;
      if (!pid) {
        S._dodgeRoll = { angle: 0, startTime: Date.now() - p.e, kind: 'dodge', durMs: dur };
        S.player.x = p.x; S.player.y = p.y;   /* the loop steps the roll; hold the spot */
      } else if (S.others[pid]) {
        S.others[pid]._dodgeRoll = { angle: 0, kind: 'dodge', startTime: Date.now() - p.e, durMs: dur == null ? undefined : dur };
      }
    };
    const _raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => _raf((ts) => { try { pin(); } catch (e) { /* the game's frame first */ } cb(ts); });
    return true;
  }, { pid, dur });
  await install(B, null, ownDur);
  await install(A, bId, told ? told.durMs : null);
  const frameOf = (P, pid) => P.page.evaluate((id) => {
    const R = window._pixiRenderer;
    const d = R && (id ? R.peerDisplayRaw(id) : R.playerDisplayRaw());
    return d ? { pose: d._animPose || null, frame: d._animFrame } : null;
  }, pid || null);
  const rows = [];
  for (const e of SAMPLES) {
    await B.page.evaluate((v) => { window.__dtPin.e = v; window.__dtPin.on = true; }, e);
    await A.page.evaluate((v) => { window.__dtPin.e = v; window.__dtPin.on = true; }, e);
    await A.page.waitForTimeout(260);
    const o = await frameOf(B, null), p = await frameOf(A, bId);
    rows.push({ e, own: o && `${o.pose}#${o.frame}`, peer: p && `${p.pose}#${p.frame}` });
    rec.ok(`${e} ms into the roll: the watcher shows the frame its owner does (own ${o && o.pose}#${o && o.frame}, watcher ${p && p.pose}#${p && p.frame})`,
      !!(o && p && o.pose === 'dodge' && p.pose === 'dodge' && o.frame === p.frame), { own: o, peer: p });
  }
  await B.page.evaluate(() => { window.__dtPin.on = false; window._gameState.current._dodgeRoll = null; });
  await A.page.evaluate((id) => { window.__dtPin.on = false; const o = window._gameState.current.others[id]; if (o) o._dodgeRoll = null; }, bId);
  for (const r of rows) console.log(`    ${String(r.e).padStart(3)} ms  own ${String(r.own).padEnd(10)} watcher ${r.peer}`);
  console.log(`    the watcher was told ${told && told.durMs} ms; the roller's window is ${ownDur} ms`);

  /* ═══ THE SWORD DASH (v2.3.2463's tumble, "until the character reaches the
     monster") -- set up exactly as mp-dashroll fires it: a local monster on a
     clear lane, locked, and the game's own __btMaybeSwordDash. ═══ */
  await B.page.waitForTimeout(900);
  const dash = await B.page.evaluate((spot) => {
    const S = window._gameState.current, R = S.rpg;
    S.player.x = spot.x; S.player.y = spot.y;
    let lane = { a: 0, d: 0 };
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      let d = 0;
      for (; d <= 760; d += 16) {
        const x = S.player.x + Math.cos(a) * d, y = S.player.y + Math.sin(a) * d;
        if (window.__btIsSolid(x - 12, y - 12) || window.__btIsSolid(x + 12, y + 12)) break;
      }
      if (d > lane.d) lane = { a, d };
    }
    const gap = Math.max(160, Math.min(300, lane.d - 60));
    const mx = S.player.x + Math.cos(lane.a) * gap, my = S.player.y + Math.sin(lane.a) * gap;
    R.activeSlot = 'melee';
    if (!R.weapon) R.weapon = { name: 'QA Sword', type: 'sword', gearBase: 'ws_iron', quality: 'normal', tierMult: 1 };
    S._shieldUp = false; S._abilCd = null; S._serverMonsters = false;
    S.monsters = [{ id: 'qa_dash_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: mx, y: my, renderX: mx, renderY: my, hp: 9000, curHp: 9000, maxHp: 9000,
      dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0, alive: true, statuses: {},
      _hitThisSwing: false, _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, _stuckArrows: [] }];
    S.lockedTarget = { type: 'monster', id: 'qa_dash_1', ref: S.monsters[0], src: 'tap' };
    return { gap, lane };
  }, H.TOWN_CLEAN_SPOT);
  await B.page.waitForTimeout(900);   /* the watcher sees the roller at the lane's start */
  await record(B, null);
  await record(A, bId);
  const dFired = await B.page.evaluate(() => {
    const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : 'no __btMaybeSwordDash';
    const S = window._gameState.current;
    return { ok, dashing: !!(S._bashDash && S._bashDash.kind === 'sworddash') };
  });
  await B.page.waitForTimeout(1600);
  const dOwn = curve(await stop(B));
  const dPeer = curve(await stop(A));
  rec.ok('the roller sword-dashed, through the game\'s own dash (guard)', dFired.ok === true && dFired.dashing, { dFired, dash });
  rec.ok('...and the owner\'s screen tumbled for it (guard)', !!(dOwn && dOwn.at(20) && dOwn.at(20).pose === 'dodge'), { at20: dOwn && dOwn.at(20) });
  /* A dash ends on ARRIVAL, not on a clock, so it cannot be pinned the way the
     roll is; it is sampled as it happens instead, and at this harness's ~9
     frames a second that is a few samples per dash.  So what is asserted is
     what those few samples CAN say, and each is a thing main gets wrong:
     the watcher tumbles at all, it tumbles the dash's way -- a loop over the
     tumble frames, never the strip's last frame, which is the stand hand-off
     (playerSprites.js: nine frames, "frame 9 IS the stand pose") -- and it
     stops once the dasher has arrived. */
  if (dOwn && dOwn.end != null) {
    const STAND_FRAME = 8;
    const ownDash = dOwn.rows.filter((r) => r.e >= 0 && r.e < dOwn.end);
    const peerRows = dPeer ? dPeer.rows.filter((r) => r.e >= 0) : [];
    const peerDash = peerRows.filter((r) => r.pose === 'dodge');
    const lastPeerDash = peerDash.length ? peerDash[peerDash.length - 1].e : null;
    const stoppedAfter = lastPeerDash != null && peerRows.some((r) => r.e > lastPeerDash && r.pose !== 'dodge');
    console.log(`    dash: own ${ownDash.map((r) => r.e + ':' + r.frame).join(' ')} | ends ${dOwn.end} ms`);
    console.log(`    dash: watcher ${peerRows.map((r) => r.e + ':' + (r.pose === 'dodge' ? r.frame : r.pose)).join(' ')}`);
    rec.ok('dash: the owner\'s own tumble loops without the stand frame (guard: the thing being matched)',
      ownDash.length > 0 && ownDash.every((r) => r.pose === 'dodge' && r.frame !== STAND_FRAME), { ownDash });
    rec.ok(`dash: the watcher tumbles too (${peerDash.length} tumbling frame(s) seen)`, peerDash.length > 0,
      { peerRows: peerRows.slice(0, 12) });
    rec.ok('dash: ...the dash\'s way, looping, never on the stand frame', peerDash.length > 0
      && peerDash.every((r) => r.frame !== STAND_FRAME), { peerDash });
    rec.ok(`dash: ...and stops once the dasher has arrived (owner arrives at ${dOwn.end} ms, watcher's last tumbling frame ${lastPeerDash} ms)`,
      stoppedAfter && lastPeerDash <= dOwn.end + 300, { ownEnd: dOwn.end, lastPeerDash, stoppedAfter });
  }
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
