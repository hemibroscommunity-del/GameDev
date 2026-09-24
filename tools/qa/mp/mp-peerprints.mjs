/* ═══ v2.3.2918: ANOTHER PLAYER'S WALK LEAVES PRINTS IN THE SNOW TOO ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side so there's no discrepancies."
 *
 * Walking through Frost Ridge leaves a trail of prints behind you (v2.3.2654),
 * a pair every 46 px, on your own screen.  Everybody else walked across the
 * same snow without leaving a mark on yours -- and on THEIR screen their trail
 * was there.  This walks one real client across the snow and compares the
 * trail the walker's own screen lays with the one the watcher lays for them:
 * starting in the same place, running along the same line the same way, and
 * spaced by the same rule.
 *
 * Walked through the game's own movement input, not by writing positions:
 * prints are laid only while the walker WALKS (their velocity), which a
 * scripted teleport never does on either screen.
 *
 * Then two rolls through the game's own dodge: one with a direction held,
 * which lays prints on the roller's own screen (the stick is not locked out
 * mid-roll) and must on the watcher's, and one with nothing held, which
 * lays none on either.
 *
 *   node tools/qa/mp/run.mjs peerprints
 */
import * as H from './harness.mjs';

const PRINT_GAP = 46;    /* visualSystems.js PRINT_GAP: a print every 46 px walked */
const START_TOL = 16;    /* world px: both screens lay the first print where the walk began */
const LINE_TOL = 6;      /* world px off the line the walker's own trail runs along */
const ANG_TOL = 0.35;    /* radians */

const trail = (P, peer) => P.page.evaluate((pk) => {
  const S = window._gameState.current;
  const list = pk ? (S.peerFootprints || []) : (S.footprints || []);
  return list.map((f) => ({ x: +f.x.toFixed(1), y: +f.y.toFixed(1), ang: +f.ang.toFixed(3), ts: f.ts }));
}, !!peer);
const gaps = (t) => t.slice(1).map((p, i) => Math.hypot(p.x - t[i].x, p.y - t[i].y));
const show = (t) => t.map((p) => `(${p.x},${p.y})`).join(' ');
/* What the walker is doing, for when a walk comes up short: a monster's stun
   or a loot pickup's freeze stops the stick (BroTown's movement block), and a
   run where the walker never got going says nothing about the prints. */
const where = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, now = Date.now();
  let near = null;
  for (const m of (S.monsters || [])) {
    if (!m || m.alive === false) continue;
    const d = Math.hypot((m.x || 0) - S.player.x, (m.y || 0) - S.player.y);
    if (near == null || d < near) near = d;
  }
  return {
    zone: S.currentZone, x: +S.player.x.toFixed(1), y: +S.player.y.toFixed(1),
    stunned: !!(S._playerStunUntil && now < S._playerStunUntil),
    lootFrozen: !!(S._lootFreezeUntil && now < S._lootFreezeUntil),
    held: !!(S._zoneLoading || S._netHold || S._townArtHold),
    nearestMonster: near == null ? null : Math.round(near),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Walker' });
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  /* To Frost Ridge the way the dev panel's zone chip sends you: the quest
     gates cleared through the operator surface, then the destination handed
     to the game loop (S._devWarp -> zoneTransitions.driveDevWarp), which walks
     the real doors leg by leg.  Clicking the panel itself missed for the first
     player to warp on two runs out of three; the chip only ever sets this. */
  const warp = async (P, id) => {
    await H.devOp(wsPort, 'quests', id).catch(() => null);
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._devWarp = { to: 'frost', legs: 0, t: Date.now(), nextAt: 0 };
    });
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'frost', { timeout: 90000, label: 'arrive in frost' }).catch(() => null);
    if (await H.readState(P, (S) => S.currentZone) !== 'frost') {
      await H.warpToZone(P, { wsPort, label: 'Frost Ridge', zoneId: 'frost' }).catch(() => null);
    }
    await P.page.waitForTimeout(2500);
  };
  await warp(B, bId);
  await warp(A, aId);
  for (const id of [aId, bId]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
  const zones = { A: await H.readState(A, (S) => S.currentZone), B: await H.readState(B, (S) => S.currentZone) };
  rec.ok('both players are in Frost Ridge, which leaves prints (guard)', zones.A === 'frost' && zones.B === 'frost', zones);
  if (zones.A !== 'frost' || zones.B !== 'frost') { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  await H.waitMutualSight(A, B).catch(() => null);
  const clearTrails = async () => {
    for (const P of [A, B]) {
      await P.page.evaluate(() => { const S = window._gameState.current; S.footprints = []; S.peerFootprints = []; });
    }
  };
  /* Walk for 3 s, holding the direction in S.keys -- the table the keyboard
     handler fills and the movement code reads (desktopControls.js).  Not
     page.keyboard: after the warp's dev panel the keys did not always reach
     the game.
     WHICH WAY is found by trying, not predicted.  Frost Ridge is open snow,
     but a step is refused by props (feet against their footprints) and by
     MONSTERS, which wander -- in most runs here one stood within 50 px of the
     arrival point, and a walker that walked into it went nowhere and made the
     run say nothing.  So: start clean, walk, and if the walker did
     not get ~3 prints' worth of snow behind them, clean up and try the next
     way.  Whatever blocked the failed tries blocked them on both screens. */
  const walkFor = async (k, ms) => {
    await B.page.evaluate((key) => { window._gameState.current.keys[key] = true; }, k);
    await B.page.waitForTimeout(Math.min(700, ms));
    const mid = await B.page.evaluate(() => {
      const S = window._gameState.current;
      return { vx: +(S.player.vx || 0).toFixed(2), vy: +(S.player.vy || 0).toFixed(2), keys: Object.keys(S.keys || {}).filter((q) => S.keys[q]) };
    });
    console.log(`      mid-walk '${k}': ${JSON.stringify(mid)}`);
    await B.page.waitForTimeout(Math.max(0, ms - 700));
    await B.page.evaluate((key) => { window._gameState.current.keys[key] = false; }, k);
    await B.page.waitForTimeout(900);
  };
  let lane = null, own = [], peer = [];
  for (const k of ['w', 'a', 'd', 's']) {
    await clearTrails();
    await B.page.waitForTimeout(600);
    const w0 = await where(B);
    await walkFor(k, 3000);
    const w1 = await where(B);
    const moved = Math.hypot(w1.x - w0.x, w1.y - w0.y);
    console.log(`    walk '${k}': ${JSON.stringify(w0)} -> ${JSON.stringify(w1)} (${moved.toFixed(0)} px)`);
    if (moved >= 160) {
      lane = { k, n: moved };
      own = await trail(B, false);
      peer = await trail(A, true);
      break;
    }
  }
  console.log(`    walker's own trail: ${own.length} prints; the watcher's trail for them: ${peer.length}`);
  rec.ok('the walk laid a trail on the walker\'s own screen (guard)', !!lane && own.length >= 3, { lane, own: own.length });
  if (!lane || own.length < 2) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  rec.ok(`the watcher lays a trail for them too (${peer.length} prints against the walker's ${own.length})`,
    peer.length >= own.length - 1 && peer.length <= own.length + 1, { own: own.length, peer: peer.length });
  console.log(`    own:     ${show(own)}`);
  console.log(`    watcher: ${show(peer)}`);
  /* NOT print for print.  That was the first cut of this check, and it failed
     on a working build: each screen lays a print on the first frame past the
     46 px mark, so each print lands up to one frame's travel past it, and the
     next is measured from there.  At the test machine's ~9 frames a second
     that is ~8 px a print, and two screens whose frames fall at different
     moments drift apart print by print (one run: 22 px by the third).  A phone
     at 60 frames a second drifts a pixel or two.  What must hold at any frame
     rate: the trail starts where the walk started, runs along the same line
     the same way, and is spaced by the same rule. */
  const s0 = own[0], s1 = own[own.length - 1];
  const len = Math.hypot(s1.x - s0.x, s1.y - s0.y) || 1;
  const ux = (s1.x - s0.x) / len, uy = (s1.y - s0.y) / len;
  const offLine = (p) => Math.abs((p.x - s0.x) * uy - (p.y - s0.y) * ux);
  const ownAng = Math.atan2(uy, ux);
  const angOff = (p) => Math.abs(Math.atan2(Math.sin(p.ang - ownAng), Math.cos(p.ang - ownAng)));
  const peerGaps = gaps(peer), ownGaps = gaps(own);
  rec.ok(`...starting where the walk started (first prints ${peer.length ? Math.hypot(peer[0].x - s0.x, peer[0].y - s0.y).toFixed(1) : '-'} px apart)`,
    peer.length > 0 && Math.hypot(peer[0].x - s0.x, peer[0].y - s0.y) <= START_TOL, { own0: s0, peer0: peer[0] || null });
  rec.ok('...along the same line, pointing the way they walked',
    peer.length > 0 && peer.every((p) => offLine(p) <= LINE_TOL && angOff(p) <= ANG_TOL),
    { off: peer.map((p) => ({ line: +offLine(p).toFixed(1), ang: +angOff(p).toFixed(3) })) });
  rec.ok(`...and spaced by the same rule (gaps ${peerGaps.map((g) => g.toFixed(0)).join('/')} against the walker's own ${ownGaps.map((g) => g.toFixed(0)).join('/')})`,
    peerGaps.length > 0 && peerGaps.every((g) => g >= PRINT_GAP - 0.5 && g <= Math.max(...ownGaps) + 30), { peerGaps, ownGaps });

  /* ── Rolls ──
     Your own trail has no roll rule.  Prints come from your WALK velocity,
     and the stick is not locked out mid-roll, so a roll with a direction held
     lays prints all the way through it, and a roll with nothing held lays
     none.  The watcher must do both the same.  Rolled through the game's own
     dodge (the function the swipe calls), with Endurance set for a 550 ms
     roll (mp-dodgetime's numbers) so the roll covers a few prints' worth of
     snow.  Both rolls stay on the stretch the walk above just covered. */
  const back = { d: 'a', a: 'd', s: 'w', w: 's' }[lane.k];
  const ANG = { d: 0, a: Math.PI, s: Math.PI / 2, w: -Math.PI / 2 };
  const DIR = { d: { x: 1, y: 0 }, a: { x: -1, y: 0 }, s: { x: 0, y: 1 }, w: { x: 0, y: -1 } };
  const roll = (ang) => B.page.evaluate((a) => {
    const S = window._gameState.current, R = S.rpg;
    R.endurance = 250; R.enduranceSpec = Object.assign({}, R.enduranceSpec, { reflexes: 25 });
    R.stamina = Math.max(R.stamina || 0, R.maxStamina || 0, 100);
    S.lockedTarget = null;   /* a plain roll, not a lunge or a retreat shot */
    const f = window._gameFns && window._gameFns.contextualDodge;
    if (typeof f !== 'function') return { ok: false, why: 'no contextualDodge' };
    const at = { x: S.player.x, y: S.player.y };
    f(a);
    return { ok: !!S._dodgeRoll, kind: S._dodgeRoll && (S._dodgeRoll.kind || 'dodge'), at };
  }, ang);
  /* 1. A roll with a direction held, up the lane.  Back to the foot of it
     first, so the roll has the whole walked stretch ahead of it; and a second
     try if something wandered into the way (see walkFor above).  What is
     compared is the prints laid INSIDE the stretch the roll itself covered,
     from where it started to where it ended, measured along the lane. */
  const along = (p, o) => (p.x - o.x) * DIR[lane.k].x + (p.y - o.y) * DIR[lane.k].y;
  const inside = (t, from, to) => t.filter((p) => along(p, from) >= -4 && along(p, to) <= 4);
  let r1 = null, rollEnd = null, own1 = [], peer1 = [], ownIn = [], peerIn = [];
  for (let attempt = 0; attempt < 2 && ownIn.length < 2; attempt++) {
    await walkFor(back, 3300);
    console.log(`    back at the foot of the lane: ${JSON.stringify(await where(B))}`);
    await clearTrails();
    await B.page.evaluate((k) => { window._gameState.current.keys[k] = true; }, lane.k);
    await B.page.waitForTimeout(300);
    r1 = await roll(ANG[lane.k]);
    await B.page.waitForTimeout(560);   /* the 550 ms roll, and a frame */
    rollEnd = await where(B);
    /* Walk on a print's length past it: a print is laid at the spot where the
       one before it was, once the next 46 px are walked, so the last one inside
       the roll only appears after that. */
    await B.page.waitForTimeout(700);
    await B.page.evaluate((k) => { window._gameState.current.keys[k] = false; }, lane.k);
    await B.page.waitForTimeout(900);
    own1 = await trail(B, false);
    peer1 = await trail(A, true);
    ownIn = r1 && r1.at ? inside(own1, r1.at, rollEnd) : [];
    peerIn = r1 && r1.at ? inside(peer1, r1.at, rollEnd) : [];
    console.log(`    the roll ran ${r1 && r1.at ? along(rollEnd, r1.at).toFixed(0) : '?'} px: `
      + `own ${own1.length} prints (${ownIn.length} inside the roll), watcher's ${peer1.length} (${peerIn.length} inside)`);
    console.log(`      own:     ${show(own1)}`);
    console.log(`      watcher: ${show(peer1)}`);
  }
  rec.ok('roll with a direction held: the walker rolled, through the game\'s own dodge (guard)',
    !!r1 && r1.ok === true && r1.kind === 'dodge', r1);
  rec.ok(`...and on their own screen the roll itself laid prints, ${ownIn.length} inside its stretch (guard: your trail has no roll rule)`,
    ownIn.length >= 2, { ownIn, rollFrom: r1 && r1.at, rollTo: rollEnd });
  /* NOT print for print, and not gap for gap: at the test machine's ~9 frames
     a second a rolling walker moves ~25 px a frame, and a watcher's screen
     that goes a while between two looks at them sees them far further on at
     once -- one run on a working build had a 120 px gap between two prints.
     What separates a watcher that follows the rule from one that skips the
     roll is the stretch itself: skipping leaves it with no print at all. */
  rec.ok(`...and the watcher lays prints through the roll too (${peerIn.length} inside its stretch against the roller's ${ownIn.length})`,
    peerIn.length >= 1 && peerIn.length >= ownIn.length - 2, { ownIn, peerIn });
  rec.ok(`...and about as many overall (${peer1.length} prints against the roller's ${own1.length})`,
    peer1.length >= own1.length - 2 && peer1.length <= own1.length + 2, { own: own1.length, peer: peer1.length });

  /* 2. A roll with nothing held, back down the lane. */
  await B.page.waitForTimeout(1500);
  await clearTrails();
  const q0 = await where(B);
  const r2 = await roll(ANG[back]);
  await B.page.waitForTimeout(1600);
  const q1 = await where(B);
  const rolled = Math.hypot(q1.x - q0.x, q1.y - q0.y);
  const own2 = await trail(B, false), peer2 = await trail(A, true);
  console.log(`    roll standing still (${rolled.toFixed(0)} px): own ${own2.length} prints, watcher's ${peer2.length}`);
  /* It must actually carry them over the snow, or "no prints" means nothing:
     a 550 ms roll is ~200 px at 60 frames a second, and came to ~125 px at
     this machine's ~9 (the frame step is capped). */
  rec.ok(`roll with nothing held: the walker rolled, ${rolled.toFixed(0)} px (guard)`,
    r2.ok === true && r2.kind === 'dodge' && rolled >= 80, { r2, q0, q1 });
  rec.ok('...and on their own screen it laid no prints (guard: no walk, no prints)', own2.length === 0, { own2 });
  rec.ok('...and the watcher laid none for it either', peer2.length === 0, { peer2 });
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
