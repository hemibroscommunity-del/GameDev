/* THE THREE THINGS A COIN DOES ON ITS WAY INTO THE BAG (v2.3.2531).
 *
 * Owner, after playing the merged build, on ground loot:
 *   1. "loot no longer flashes and bobs before it disappears"
 *   2. "the coin sound lands too late when picking up coins"
 *   3. "coins sometimes magnetize toward the player without ever being
 *      picked up" -- still, after v2.3.2490 fixed the runaway half of it.
 *
 * ═══ WHAT EACH BLOCK BELOW IS FOR ═══
 *
 * BLOCK 1 -- THE LAST CALL.  Report 1 does not reproduce, and this block is
 * the receipt rather than an argument.  The bob and the pre-despawn pulse are
 * drawn in effectsRenderer's _updateGroundLoot (v2.3.2318 / v2.3.2329), and
 * that whole method is byte-identical before and after the loot lane's PRs --
 * neither of them touches the file.  So this asks the SCREEN instead of the
 * diff: it reads the pooled sprite the renderer actually wrote and watches a
 * real worker-minted pile move and fade.  It is a guard from here on, so the
 * next session that changes the pull maths finds out immediately if it has
 * taken the warning with it.
 *
 * NOT a duplicate of mp-lootbob, which is the other half of the same law:
 * that one proves the SNOWMAN's branch bobs like every other branch, in Frost.
 * This one follows ONE ordinary pile through its whole life in a spoke zone --
 * fresh, into the last-call window, and off the ground -- which is the part of
 * the behaviour the owner's report is about and the part nothing watched.
 *
 * The pile's `ts` is wound back 21 s to reach the last-call window without
 * spending 21 s of wall clock on it.  `ts` is what the renderer reads for BOTH
 * the bob phase and the fade, so winding it drives the shipped code exactly;
 * nothing is stubbed.
 *
 * BLOCK 2 -- THE ASK.  The coin sound is played from _applyLootCredit, on the
 * worker's confirmation, and it STAYS there: that is the only moment the game
 * knows the coins are yours, so it cannot ring for a pickup that did not
 * happen (BLOCK 3 holds that line).  What was late was the ASK -- the request
 * waited for the SPRITE to reach 20 px while the magnet had had hold of the
 * pile since 50 px, which at the v2.3.2490 pull floor is about half a second
 * of watching a coin fly at you with nothing happening.  So this measures the
 * pile's distance at the instant the request goes out and requires it to be
 * larger than the old 20 px trigger.
 *
 * BLOCK 3 -- THE SILENT REFUSAL.  A pile the worker has never heard of is
 * refused `no-pile`.  The coin sample must not play and the gold must not
 * move.  This is the assertion that stops a future "just play it on the
 * prediction" from shipping.
 *
 * BLOCK 4 -- THE POSITION THE PICKUP IS MEASURED FROM.  _handleLootPickup
 * range-checks against ps.x/ps.y -- the worker's copy of the player -- 160 px
 * from the pile's anchor, while the client asks from where it has walked to.
 * Those two are a throttle window apart (66 ms solo since v2.3.1767, rounded
 * up to the next 33 ms batch boundary), and through a real 900 px lunge the
 * gap was measured at up to 85 px against a pile whose anchor a dash kill
 * leaves 76-107 px away (mp-lootmagnet's own measurement).  85 + 107 is 192
 * against a budget of 160: the refusal, and why the owner sees it "mainly
 * during melee dash".  v2.3.2531 flushes the held position first, exactly as
 * v2.3.1765 did for Shield Bash, so the gap at ask time must now be ~0.
 *
 * That block asks TEN times rather than once, and the reason is a measured
 * failure of the first version of this file: a single walk-in pickup passed
 * with the flush REMOVED, because whether a move happened to have just gone
 * out is a coin toss on the 33 ms batch boundary.  One ask reports the coin
 * toss; ten cannot all land the same way.
 *
 * It measures the WAIT, not the distance.  Also measured: with the flush
 * removed the ten asks came back 43, 2, 3, 3, 48, 1, 1, 44, 2, 1 ms after the
 * last position this client had actually sent -- worst 48 -- while the gap in
 * PIXELS never exceeded 12, because a walking bro is slow.  A pixel threshold
 * would have had to sit above 12 to be safe and would then have passed the
 * broken build; the millisecond one separates cleanly (48 against 5).  The
 * pixels are what hurt -- at lunge speed the same wait is 60-85 px -- but the
 * wait is what can be measured without a lunge under the wheels of the test.
 * See TRAPS §78 for how nearly this whole block was deleted as worthless.
 *
 * ═══ THE THINGS HERE THAT ARE NOT A PLAYER'S ROAD, STATED ═══
 *   - Damage is sent as `monster_damage` on the real channel rather than by
 *     tapping the attack disc, and the killing blow is a real
 *     `window.__btMaybeSwordDash` lunge.  Same shim, same worker gates; this
 *     is mp-lootmagnet's convention and its reasons apply unchanged.
 *   - BLOCK 4's ten asks are made against piles the worker has never heard
 *     of.  Each is refused `no-pile`, which is the point: nothing is credited
 *     and nothing is left on the floor, while the REQUEST is the shipped one
 *     leaving through the shipped shim.  The send path is under test there,
 *     not the answer.
 *   - BLOCK 4's walk is driven with the KEYBOARD, not by writing S.player.
 *     That is not fussiness: a scenario that moves the bro by assignment
 *     moves him without the stick, the move-broadcast gate never fires
 *     (TRAPS §46), and the block would then be measuring the harness's own
 *     silence instead of the client's throttle.  BLOCK 2 is the other way
 *     round -- it wants a KNOWN distance, not a faithful gait, so it parks
 *     and walks with the harness's own hopTo.
 *   - A WIRE OBSERVER wraps WebSocket.prototype.send before the bundle loads.
 *     It records and forwards; it replaces nothing.  It has to be pre-load
 *     because the flush under test happens INSIDE the client's own send shim,
 *     below anything a scenario can reach afterwards -- the socket is the only
 *     place both messages are visible, in order.
 */
import * as H from './harness.mjs';

const MAGNET_RANGE = 50;          /* groundLoot.js */
const OLD_TRIGGER = 20;           /* groundLoot.js, the sprite-arrival gate */

/* Pre-load observer.  For every loot_pickup it records how far the player had
   travelled past the last position this socket actually SENT -- which is the
   error in the worker's copy at the moment the pickup is judged. */
const WIRE_INIT = () => {
  window.__btWire = { asks: [], moves: 0, last: null };
  const orig = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      if (typeof data === 'string' && data.indexOf('"type"') >= 0) {
        const m = JSON.parse(data);
        if (m && m.type === 'move' && typeof m.x === 'number') {
          window.__btWire.moves++;
          window.__btWire.last = { x: m.x, y: m.y, t: Date.now() };
        } else if (m && m.type === 'loot_pickup') {
          const S = window._gameState && window._gameState.current;
          const L = window.__btWire.last;
          window.__btWire.asks.push({
            t: Date.now(),
            lootId: m.payload && m.payload.lootId,
            viaPet: !!(m.payload && m.payload.viaPet),
            /* >= 0 means "the worker's copy is this far behind us right now". */
            stale: (S && S.player && L) ? Math.round(Math.hypot(S.player.x - L.x, S.player.y - L.y)) : null,
            staleMs: L ? Date.now() - L.t : null,
            moving: !!(S && S.player && (S.player.vx || S.player.vy)),
          });
        }
      }
    } catch (e) { /* never let the observer break a send */ }
    return orig.call(this, data);
  };
};

async function kill(P, { finishWithLunge = true, parkTo = 0 } = {}) {
  return P.page.evaluate(async ({ lunge, park }) => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y)
      - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const id = m.id;
    S.groundLoot = [];
    S.rpg.activeSlot = 'melee';
    S._shieldUp = false;
    /* The pile is captured the instant it lands: when the lunge ends close
       enough the magnet now takes it inside the same beat, so a post-hoc
       lookup can find nothing but an empty floor and more gold. */
    let seen = null;
    /* ...and the SAME watcher records the frame the request goes out.  It has
       to be this one: after a lunge that lands close the magnet takes the pile
       and the ask fires inside the same beat, so a watcher started afterwards
       finds an empty floor and reports "no request" on a pickup that already
       happened -- which is what the first run of this file did. */
    let askAt = null;
    const watcher = setInterval(() => {
      const p = (S.groundLoot || []).find((l) => l && l._serverLoot && l.lootId && l._sx !== undefined);
      if (!p) return;
      if (!seen) {
        seen = { lootId: p.lootId, ax: p._sx, ay: p._sy, coins: p.coins || 0 };
        /* Park the bro clear of his own drop in the same 16 ms beat it lands,
           so BLOCK 2 can walk back in from a known distance. */
        if (park) { S.player.x = p._sx + park; S.player.y = p._sy + park; S.player.vx = 0; S.player.vy = 0; }
      }
      if (!askAt && p._pickupSentAt) {
        askAt = {
          lDist: Math.round(Math.hypot(S.player.x - p.x, (S.player.y - 15) - p.y)),
          sDist: Math.round(Math.hypot(S.player.x - p._sx, (S.player.y - 15) - p._sy)),
          drift: Math.round(Math.hypot(p.x - p._sx, p.y - p._sy)),
        };
      }
    }, 16);
    const hit = () => {
      if (S.channel) S.channel.send({ type: 'monster_damage', payload: {
        monsterId: id, zone: S.currentZone, element: null, slot: 'melee', special: false } });
    };
    const alive = () => {
      const c = (S.monsters || []).find((x) => x.id === id);
      return c && c.alive !== false && (c.curHp == null || c.curHp > 0) ? c : null;
    };
    const maxHp = m.maxHp || m.curHp || 1;
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const c = alive();
      /* 0.5, not 0.25: an ordinary swing can take a slime from just over the
         threshold to dead, and then the "finished with a lunge" guard fails on
         a kill that was perfectly fine.  Measured -- it happened. */
      if (!c || (c.curHp != null && c.curHp <= maxHp * (lunge ? 0.5 : 0.02))) break;
      hit(); await sleep(260);
    }
    let lunges = 0;
    if (lunge) {
      const t1 = Date.now();
      while (Date.now() - t1 < 15000 && alive()) {
        const c = alive();
        S.lockedTarget = { type: 'monster', id: c.id, ref: c, src: 'tap' };
        S.rpg.stamina = S.rpg.maxStamina || 100;
        S._abilCd = null;
        if (window.__btMaybeSwordDash && window.__btMaybeSwordDash()) lunges++;
        const t2 = Date.now();
        while (Date.now() - t2 < 2700 && alive()) await sleep(100);
      }
    } else {
      /* 25 s, not 15: running alongside four other scenarios this box is slow
         enough that the finishing loop ran out and the block SKIPPED on a kill
         that was simply taking its time. */
      const t1 = Date.now();
      while (Date.now() - t1 < 25000 && alive()) { hit(); await sleep(260); }
    }
    const t3 = Date.now();
    while (Date.now() - t3 < 6000 && !seen) await sleep(50);
    /* One more beat so an ask that follows the drop inside the same breath is
       on the record before the interval is torn down. */
    const t4 = Date.now();
    while (Date.now() - t4 < 1200 && seen && !askAt) await sleep(16);
    clearInterval(watcher);
    return { lunges, dead: !alive(), seen, askAt, gold: S.rpg.coins };
  }, { lunge: finishWithLunge, park: parkTo });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'LootCue', wsPort, webPort, init: WIRE_INIT });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* A server-driven spoke.  Town monsters are client-side (TRAPS #32) and none
     of the four blocks exists on that path -- there is no worker to confirm a
     credit or to refuse a pickup. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3500);

  const myId = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, myId, 'gold', { amount: 500 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'forge_weapon',
      payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
  });
  await P.page.waitForTimeout(2500);

  const setup = await H.readState(P, (S) => ({
    zone: S.currentZone,
    serverDriven: !!S._serverMonsters,
    serverLoot: !!S._serverLoot,
    weapon: S.rpg && S.rpg.weapon ? (S.rpg.weapon.name || S.rpg.weapon.type) : null,
    monsters: (S.monsters || []).filter((m) => m && m.alive !== false).length,
    wire: !!(window.__btWire && Array.isArray(window.__btWire.asks)),
    probe: !!window.__btProbe,
  }));
  console.log('    setup: ' + JSON.stringify(setup));
  rec.ok('the bro is in a zone the WORKER drives, with monsters to kill (guard)',
    setup.serverDriven === true && setup.monsters > 0, setup);
  rec.ok('...holding a weapon the worker forged, so the lunge is castable (guard)', !!setup.weapon, setup);
  rec.ok('...with the wire observer up and the coin-sound probe armed (guard)',
    setup.wire === true && setup.probe === true, setup);
  if (!setup.serverDriven || !setup.monsters || !setup.weapon || !setup.wire || !setup.probe) {
    await P.ctx.close().catch(() => {}); return;
  }

  /* ═══ BLOCK 1 — THE LAST CALL ═══ */
  /* Parked clear on the frame the pile lands: inside the magnet range the
     pile is collected, and this block is about a pile nobody is picking up. */
  const k1 = await kill(P, { finishWithLunge: false, parkTo: 300 });
  console.log('    block 1 kill: ' + JSON.stringify(k1));
  if (k1.none || !k1.seen) {
    rec.skip('a pile on the ground bobs',
      k1.none ? 'no live monster to kill' : 'the kill dropped no server pile');
  } else {
    const sampleSprite = async (n) => P.page.evaluate(async ({ id, n: count }) => {
      const S = window._gameState.current;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const ys = []; const as = [];
      for (let i = 0; i < count; i++) {
        await sleep(110);
        const l = (S.groundLoot || []).find((x) => x && x.lootId === id);
        const sp = l && l._pixiSprite;
        if (sp && !sp.destroyed) { ys.push(sp.y); as.push(sp.alpha); }
      }
      return {
        n: ys.length,
        ySwing: ys.length ? +(Math.max(...ys) - Math.min(...ys)).toFixed(2) : 0,
        aMin: as.length ? +Math.min(...as).toFixed(3) : null,
        aMax: as.length ? +Math.max(...as).toFixed(3) : null,
      };
    }, { id: k1.seen.lootId, n });

    const fresh = await sampleSprite(16);
    console.log('    fresh pile: ' + JSON.stringify(fresh));
    rec.ok(`a pile lying on the ground BOBS (the sprite rose and fell ${fresh.ySwing}px, want >= 2)`,
      fresh.n >= 8 && fresh.ySwing >= 2, fresh);
    rec.ok('...and is drawn at full opacity while it still has time left (no early warning)',
      fresh.aMin !== null && fresh.aMin > 0.98, fresh);

    /* Wind the drop time back into the last ten seconds. */
    await P.page.evaluate(({ id }) => {
      const S = window._gameState.current;
      const l = (S.groundLoot || []).find((x) => x && x.lootId === id);
      /* Set the AGE, do not subtract from it: how long the kill took varies
         run to run, and a fixed subtraction landed the sample window anywhere
         between the middle of the warning and past the despawn. */
      if (l) l.ts = Date.now() - 21000;
    }, { id: k1.seen.lootId });

    const last = await sampleSprite(26);
    console.log('    last call: ' + JSON.stringify(last));
    rec.ok(`...and in its last ten seconds it FLASHES (alpha fell to ${last.aMin}, want <= 0.6)`,
      last.aMin !== null && last.aMin <= 0.6, last);
    rec.ok(`...coming back to full brightness instead of fading out quietly (peak ${last.aMax}, want >= 0.95)`,
      last.aMax !== null && last.aMax >= 0.95, last);
    rec.ok(`...while still bobbing (${last.ySwing}px)`, last.ySwing >= 2, last);
    rec.ok(`...and it was still on screen for the whole warning (${last.n}/26 frames read)`,
      last.n >= 24, last);

    const gone = await P.page.evaluate(async ({ id }) => {
      const S = window._gameState.current;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const t0 = Date.now();
      while (Date.now() - t0 < 14000) {
        if (!(S.groundLoot || []).find((x) => x && x.lootId === id)) return { ms: Date.now() - t0 };
        await sleep(200);
      }
      return { ms: null };
    }, { id: k1.seen.lootId });
    console.log('    despawn: ' + JSON.stringify(gone));
    rec.ok('...and then it goes', gone.ms !== null, gone);
  }

  /* ═══ BLOCK 2 — THE ASK ═══
     THE APPROACH IS STAGED, and that is a correction, not a shortcut.  The
     first version of this block finished the kill with a lunge and measured
     wherever that left the bro.  Where a lunge leaves you is not a constant:
     across runs the pile landed 17, 38, 41, 43 and 46 px away, and at 17 the
     bro is already inside the OLD 20 px trigger, so the assertion failed on a
     run in which nothing was wrong.  The dash geometry is mp-lootmagnet's
     subject anyway.  Here the bro is PARKED well clear the instant the pile
     drops and then walked back in, so the distance at which the ask goes out
     is a property of the magnet rather than of where a lunge happened to
     stop.  Parking is safe against the very thing being measured: a fodder
     pile cannot be asked for in its first 220 ms (the splat-vacuum delay,
     v2.3.948) and the watcher runs at 16 ms. */
  const coinsBefore = await H.readState(P, (S) => S.rpg.coins);
  await P.page.evaluate(() => { window.__btWire.asks.length = 0; });
  const k2 = await kill(P, { finishWithLunge: false, parkTo: 300 });
  console.log('    block 2 kill: ' + JSON.stringify(k2));
  if (k2.none || !k2.dead || !k2.seen) {
    rec.skip('the ask is made while the coin is still flying in',
      k2.none ? 'no live monster to kill'
        : !k2.dead ? 'the monster survived the budget' : 'the kill dropped no server pile');
  } else if (k2.askAt) {
    rec.skip('the ask is made while the coin is still flying in',
      'the pile was asked for before the bro could be parked clear of it');
  } else {
    await P.page.waitForTimeout(1600);   /* > the 1 Hz idle keepalive */

    const watching = P.page.evaluate(async ({ id }) => {
      const S = window._gameState.current;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let first = null;
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        const l = (S.groundLoot || []).find((x) => x && x.lootId === id);
        if (!l) break;
        if (!first && l._pickupSentAt) {
          first = {
            lDist: Math.round(Math.hypot(S.player.x - l.x, (S.player.y - 15) - l.y)),
            sDist: l._sx === undefined ? null
              : Math.round(Math.hypot(S.player.x - l._sx, (S.player.y - 15) - l._sy)),
          };
        }
        await sleep(16);
      }
      return { first, gone: !(S.groundLoot || []).find((x) => x && x.lootId === id), coins: S.rpg.coins,
        sfx: window.__btCoinSfx || 0 };
    }, { id: k2.seen.lootId });

    /* Walk back to 40 px short of the pile -- inside the magnet's 50, outside
       the old 20 -- and stop there.  Under the old code nothing would happen
       at all until the sprite had crawled the rest of the way in. */
    await H.hopTo(P, k2.seen.ax, k2.seen.ay + 55);
    const ask = await watching;
    console.log('    ask: ' + JSON.stringify(ask));

    rec.ok('the bro walked back onto his own kill and the pile was collected (guard)',
      ask.gone === true && ask.coins > coinsBefore, { ask, coinsBefore });
    if (ask.first) {
      rec.ok(`the ask goes out while the coin is still flying in, not on arrival `
        + `(the pile was ${ask.first.lDist}px away; the old trigger was ${OLD_TRIGGER}px)`,
        ask.first.lDist > OLD_TRIGGER, ask.first);
      rec.ok(`...from inside the magnet's reach, which is well inside the 160px the worker grants `
        + `(${ask.first.sDist}px from the anchor, magnet ${MAGNET_RANGE}px)`,
        ask.first.sDist !== null && ask.first.sDist <= MAGNET_RANGE + 2, ask.first);
    } else {
      rec.skip('the ask is made while the coin is still flying in', 'no request was observed on the pile');
    }
    rec.ok(`...and the coin cue fired on the credit (${ask.sfx} so far)`, ask.sfx > 0, ask);
  }

  /* ═══ BLOCK 4 — THE POSITION THE PICKUP IS MEASURED FROM ═══
     ONE dash kill is not an instrument.  Measured: a single walk-in pickup
     passes a <= 8 px gap whether the flush is in or not, because whether a
     move happened to have just gone out is a coin toss on the batch boundary
     -- so a test built on one ask reports the coin toss, not the code.  This
     block asks TEN times, back to back, while the bro is genuinely walking,
     and takes the WORST.  Ten tosses cannot all land on the same side.

     The asks are made against piles the worker has never heard of, which is
     the whole trick: each one is refused `no-pile` (so nothing is credited,
     nothing is left on the floor, and the run stays cheap), but the REQUEST
     is the shipped one, sent by the shipped shim, from a bro moving under
     real keyboard input.  The send path is what is under test, not the
     answer. */
  const flush = await (async () => {
    await P.page.evaluate(() => { window.__btWire.asks.length = 0; });
    await P.page.keyboard.down('a');
    const rows = await P.page.evaluate(async () => {
      const S = window._gameState.current;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      await sleep(400);              /* up to walking speed before we start */
      for (let i = 0; i < 10; i++) {
        S.groundLoot.push({
          lootId: 'lc-probe-' + Date.now() + '-' + i, zone: S.currentZone, _serverLoot: true,
          x: S.player.x, y: S.player.y - 15, coins: 1, xp: 0,
          skull: null, shard: null, recipients: null, ts: Date.now() - 1000,
        });
        await sleep(300);
      }
      await sleep(400);
      return window.__btWire.asks.slice();
    });
    await P.page.keyboard.up('a');
    return rows;
  })();
  const moved = flush.filter((a) => a.moving && a.stale !== null);
  const worstPx = moved.length ? Math.max(...moved.map((a) => a.stale)) : null;
  const worstMs = moved.length ? Math.max(...moved.map((a) => a.staleMs)) : null;
  console.log('    flush: ' + JSON.stringify({ asks: flush.length, moving: moved.length, worstPx, worstMs }));
  rec.ok(`ten pickup asks were sent while walking (guard -- ${moved.length})`, moved.length >= 6,
    { asks: flush.length, moving: moved.length });
  rec.ok(`...and every one of them put the bro's position on the wire first `
    + `(worst wait between that position and the ask: ${worstMs}ms, want <= 8)`,
    moved.length >= 6 && worstMs !== null && worstMs <= 8, { worstMs, worstPx, rows: moved.slice(0, 10) });

  /* ═══ BLOCK 3 — A REFUSED PICKUP MAKES NO SOUND ═══ */
  const ghost = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const before = { sfx: window.__btCoinSfx || 0, coins: S.rpg.coins };
    const id = 'lc-ghost-' + Date.now();
    S.groundLoot = [{
      lootId: id, zone: S.currentZone, _serverLoot: true,
      x: S.player.x, y: S.player.y - 15, coins: 99, xp: 0,
      skull: null, shard: null, recipients: null, ts: Date.now() - 1000,
    }];
    const t0 = Date.now();
    while (Date.now() - t0 < 6000) {
      if (!(S.groundLoot || []).find((l) => l && l.lootId === id)) break;
      await sleep(80);
    }
    await sleep(700);
    return { before, after: { sfx: window.__btCoinSfx || 0, coins: S.rpg.coins },
      stillThere: !!(S.groundLoot || []).find((l) => l && l.lootId === id) };
  });
  console.log('    ghost: ' + JSON.stringify(ghost));
  rec.ok('a pile the worker refuses is dropped from the ground (guard)', ghost.stillThere === false, ghost);
  rec.ok('...and a refused pickup makes NO coin sound', ghost.after.sfx === ghost.before.sfx, ghost);
  rec.ok('...and credits no gold', ghost.after.coins === ghost.before.coins, ghost);

  await P.ctx.close().catch(() => {});
}
