/* ═══ v2.3.4364: A LOOT PILE IS READ ON THE WORKER'S CLOCK ═══
 *
 * The state-machine sweep (2026-11-03, V22; reviews R1/R2/R3 W1.8): the
 * worker stamps a pile with its own clock and the phone judged the stamps on
 * its own Date.now().  A phone clock a fraction of a second fast asked for a
 * death pile just before its minute opened, was told 'not-recipient' and hid
 * the pile (in No man's land the player's own bag); two minutes fast, it cut
 * its own death pile on its first frame.  And the pet's vacuum asked while
 * its player was dying, and RARE DROP! was hidden, never destroyed.
 *   1. workerClock: the offset from the ping's ts, phone clock ahead and behind;
 *   2. rebasePiles: a pile built before the first ping moves onto the estimate;
 *   3. lootAsk: mayAsk (dying, recipients, the minute's end) and the one retry;
 *   4. the wiring, wsClient's own code run here: _buildServerPile converts the
 *      worker's times once, the ping feeds the clock, the refusal handler
 *      retries a death pile once and drops it on the second no;
 *   5. the hand and the pet ask through the one rule (source);
 *   6. RARE DROP!, effectsRenderer's own _renderRareItems run here: destroyed
 *      when it is done (CLAUDE.md §7, TRAPS §192).
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
/* a missing module is FAIL lines, not a crash */
async function load(p) { try { return await import('../../' + p); } catch (e) { return {}; } }
const C = await load('src/game/workerClock.js');
const A = await load('src/game/lootAsk.js');
const hasClock = typeof C.makeWorkerClock === 'function' && typeof C.rebasePiles === 'function';
const hasAsk = typeof A.mayAsk === 'function' && typeof A.notRecipientRetry === 'function' && typeof A.amLootRecipient === 'function';
check('0a the two helpers exist (game/workerClock.js, game/lootAsk.js)', hasClock && hasAsk, { hasClock, hasAsk });

const W0 = 1_800_000_000_000;      /* the worker's clock, now */
const TRIP = 40;                   /* a ping's trip, ms */

/* ── 1. the clock ── */
if (hasClock) {
  for (const [label, skew] of [['ahead 2 min', 120000], ['ahead 0.3 s', 300], ['behind 2 min', -120000], ['level', 0]]) {
    const k = C.makeWorkerClock();
    /* the phone's clock = worker + skew; a ping sent at W arrives TRIP later */
    const phoneAt = (w) => w + skew;
    check('1a ' + label + ': unknown before a ping (offset 0, times as sent)', !k.known() && k.offset() === 0 && k.toPhone(W0) === W0);
    k.sample(W0, phoneAt(W0 + TRIP + 200));   /* a slow one */
    k.sample(W0 + 3000, phoneAt(W0 + 3000 + TRIP));
    const est = k.offset();
    check('1b ' + label + ': the offset is the true one less the shortest trip, never more',
      est === -skew - TRIP && est <= -skew, { est, truth: -skew });
    /* a death pile's minute ends at worker W0+60000: by this phone's clock */
    const end = k.toPhone(W0 + 60000);
    check('1c ' + label + ': the minute ends on this phone no earlier than on the worker',
      end >= phoneAt(W0 + 60000) && end - phoneAt(W0 + 60000) <= TRIP, { end, workerEndOnPhone: phoneAt(W0 + 60000) });
    check('1d ' + label + ': now() reads the worker\'s clock', Math.abs(k.now(phoneAt(W0 + 9000)) - (W0 + 9000)) <= TRIP);
  }
  const k = C.makeWorkerClock();
  check('1e a bad stamp is no sample', !k.sample(undefined, 5) && !k.sample('x', 5) && !k.sample(0, 5) && !k.known());
  check('1f toPhone: no time is null', k.toPhone(null) === null && k.toPhone(0) === null && k.toPhone(undefined) === null);
  for (let i = 0; i < 6; i++) k.sample(W0 + i, W0 + i + 5000);   /* clock 5 s ahead */
  k.sample(W0 + 10, W0 + 10 + 100000);                             /* one late sample */
  check('1g a phone corrected forward is forgotten after KEEP samples',
    (() => { for (let i = 0; i < C.WORKER_CLOCK.KEEP; i++) k.sample(W0 + 20 + i, W0 + 20 + i + 1000); return k.offset() === -1000; })(), k.offset());
}

/* ── 2. rebase ── */
if (hasClock) {
  const k = C.makeWorkerClock();
  /* built before the first ping: worker times as sent, on a phone 2 min ahead */
  const death = { lootId: 'a', isDeathDrop: true, ts: W0, ownerOnlyUntil: W0 + 60000, expiry: W0 + 120000, _wOff: 0 };
  const drop = { lootId: 'b', dropped: true, isDeathDrop: true, ts: W0, ownerOnlyUntil: 111, expiry: 222, _wOff: 0 };
  const local = { ts: 5 };   /* a pile the phone made: no _wOff, never moved */
  check('2a nothing moves before the clock is known', C.rebasePiles([death], k) === 0 && death.expiry === W0 + 120000);
  k.sample(W0, W0 + 120000 + TRIP);
  const n = C.rebasePiles([death, drop, local], k);
  check('2b a pile built on 0 moves onto the estimate: ts, minute and end',
    n === 2 && death.ts === W0 + 120000 + TRIP && death.ownerOnlyUntil === W0 + 180000 + TRIP && death.expiry === W0 + 240000 + TRIP, death);
  check('2c a dropped item: only its ts (its windows came as time left)', drop.ts === W0 + 120000 + TRIP && drop.ownerOnlyUntil === 111 && drop.expiry === 222, drop);
  check('2d a phone-made pile is left alone', local.ts === 5);
  check('2e a second rebase on the same estimate moves nothing', C.rebasePiles([death, drop], k) === 0);
}

/* ── 3. may I ask ── */
if (hasAsk) {
  const me = 'bp_me', other = 'bp_x', now = 1000;
  const kill = { _serverLoot: true, lootId: 'k', recipients: [me] };
  check('3a my kill pile: yes', A.mayAsk(kill, me, now, {}));
  check('3b ...not while I am dying (the pet asked; review R2)', !A.mayAsk(kill, me, now, { dying: true }));
  check('3c ...not collected, expired, phone-made or id-less',
    !A.mayAsk({ ...kill, _collected: true }, me, now) && !A.mayAsk({ ...kill, _expired: true }, me, now)
    && !A.mayAsk({ ...kill, _serverLoot: false }, me, now) && !A.mayAsk({ ...kill, lootId: null }, me, now));
  check('3d a stranger\'s kill pile: no', !A.mayAsk({ ...kill, recipients: [other] }, me, now));
  const bag = { _serverLoot: true, lootId: 'd', isDeathDrop: true, recipients: [other], ownerOnlyUntil: 5000, expiry: 65000 };
  check('3e a stranger\'s bag in its minute: no; after it: yes', !A.mayAsk(bag, me, 4999) && A.mayAsk(bag, me, 5001));
  /* the one retry */
  const p = { ...bag, _pickupPending: true, _petPickupPending: true };
  const first = A.notRecipientRetry(p, 5100);
  check('3f an early not-recipient on a death pile: one retry, just after the minute, flags cleared',
    first === true && p._askAgainAt === Math.max(5000, 5100) + A.LOOT_ASK.NR_RETRY_PAD_MS && !p._pickupPending && !p._petPickupPending, p);
  check('3g ...and no ask until then', !A.mayAsk(p, me, 6099) && A.mayAsk(p, me, 6100));
  check('3h a second not-recipient: no second retry (never a loop)', A.notRecipientRetry(p, 6200) === false);
  check('3i a kill pile\'s not-recipient: no retry (it was never ours)', A.notRecipientRetry({ ...kill, recipients: [other] }, 10) === false);
}

/* ── 4. the wiring, wsClient's own code ── */
const ws = src('src/networking/wsClient.js');
function cut(text, from, to) {
  const i = text.indexOf(from);
  if (i < 0) return null;
  const j = text.indexOf(to, i + from.length);
  return j < 0 ? null : text.slice(i, j);
}
const buildSrc = cut(ws, '      function _dropAt(p, field) {', '      /* Server-issued loot_credit handler.');
check('4a _dropAt and _buildServerPile cut from wsClient.js', !!buildSrc);
const PHONE_AHEAD = 120000;
function runBuild(pile, clock, phoneNow) {
  try {
    const ctx = {
      RARITY_TIERS: {}, workerClock: clock, isFinite, Number, Math, Array,
      Date: { now: () => phoneNow },
    };
    return vm.runInNewContext(buildSrc + '; _buildServerPile', ctx)(pile, 'bp_me');
  } catch (e) { return { error: String(e).slice(0, 200) }; }
}
if (buildSrc && hasClock) {
  const k = C.makeWorkerClock();
  k.sample(W0, W0 + PHONE_AHEAD + TRIP);    /* a phone 2 min ahead */
  const phoneNow = W0 + 1000 + PHONE_AHEAD;
  const wire = { lootId: 'L1', zone: 'wheel', x: 1, y: 2, isDeathDrop: true, recipients: ['bp_me'],
    ts: W0 + 1000, ownerOnlyUntil: W0 + 61000, expiry: W0 + 121000, deathItems: [] };
  const b = runBuild(wire, k, phoneNow);
  check('4b a phone 2 min ahead: its own new death pile has not ended on this phone (the bag was cut on its first frame)',
    b && !b.error && b.expiry > phoneNow && b.expiry - phoneNow >= 119000, b && (b.error || { expiry: b.expiry, phoneNow }));
  check('4c ...its minute ends a minute from now on this phone, and its age is about 0',
    b && Math.abs(b.ownerOnlyUntil - phoneNow - 60000) <= TRIP && Math.abs(phoneNow - b.ts) <= TRIP, b && { ts: b.ts, o: b.ownerOnlyUntil });
  check('4d ...and it marks the estimate it was built on (for the rebase)', b && b._wOff === k.offset());
  const k2 = C.makeWorkerClock();
  k2.sample(W0, W0 - PHONE_AHEAD + TRIP);   /* a phone 2 min behind */
  const kb = runBuild({ ...wire, isDeathDrop: false, ownerOnlyUntil: undefined, expiry: undefined }, k2, W0 + 1000 - PHONE_AHEAD);
  check('4e a phone 2 min behind: a fresh monster pile is about 0 s old (it lasted 2.5 min on screen)',
    kb && !kb.error && Math.abs((W0 + 1000 - PHONE_AHEAD) - kb.ts) <= TRIP, kb && (kb.error || kb.ts));
  const kd = runBuild({ ...wire, dropped: true, left: 50000, openLeft: 10000, flashLeft: 40000 }, k, phoneNow);
  check('4f a dropped item\'s windows stay time left on this phone (v2.3.3473)',
    kd && kd.expiry === phoneNow + 50000 && kd.ownerOnlyUntil === phoneNow + 10000 && kd.flashAt === phoneNow + 40000, kd);
}
const pingCase = cut(ws, "          case 'ping':", "          default:");
check('4g the ping feeds the clock and moves the piles',
  !!pingCase && /workerClock\.sample\(msg\.ts, Date\.now\(\)\)/.test(pingCase) && /rebasePiles\(S\.groundLoot, workerClock\)/.test(pingCase));
check('4h workerClock and rebasePiles imported from game/workerClock.js',
  /import \{[^}]*\bworkerClock\b[^}]*\brebasePiles\b[^}]*\} from '@\/game\/workerClock\.js';/.test(ws));

const rjSrc = cut(ws, "          case 'loot_pickup_rejected':", "          case 'player_state':");
check('4i the refusal handler cut from wsClient.js', !!rjSrc);
function runReject(pile, reason, now) {
  const S = { player: {}, groundLoot: [pile] };
  try {
    const body = rjSrc.replace("case 'loot_pickup_rejected':", '').replace(/\bbreak;/g, 'return;');
    vm.runInNewContext('(function () {' + body + '})', {
      msg: { payload: { lootId: pile.lootId, reason } }, S, console: { log() {} },
      notRecipientRetry: A.notRecipientRetry || (() => false),
      Date: { now: () => now },
    })();
  } catch (e) { return { error: String(e).slice(0, 200) }; }
  return pile;
}
if (rjSrc) {
  const bag = { lootId: 'D', _serverLoot: true, isDeathDrop: true, recipients: ['bp_x'], ownerOnlyUntil: 5000, expiry: 65000, _pickupPending: true };
  const r1 = runReject(bag, 'not-recipient', 4990);
  check('4j an early not-recipient on a death pile: the pile STAYS (it hid the pile, in No man\'s land your own bag)',
    r1 && !r1.error && !bag._expired && bag._askAgainAt > 5000 && !bag._pickupPending, r1);
  const r2 = runReject(bag, 'not-recipient', 6100);
  check('4k ...a second not-recipient: dropped as before (one retry, never a loop)', r2 && !r2.error && bag._expired === true, r2);
  const kp = { lootId: 'K', _serverLoot: true, recipients: ['bp_x'] };
  runReject(kp, 'not-recipient', 10);
  check('4l a kill pile\'s not-recipient: dropped at once, as before', kp._expired === true);
  check('4m notRecipientRetry imported from game/lootAsk.js', /import \{[^}]*\bnotRecipientRetry\b[^}]*\} from '@\/game\/lootAsk\.js';/.test(ws));
}

/* ── 5. the hand and the pet ask through the one rule ── */
const gl = src('src/game/groundLoot.js');
const bt = src('src/ui/BroTown.jsx');
const petBlock = cut(bt, '/* AUTO-LOOT — pet collects nearby ground loot */', 'return true; /* keep pile until the loot_credit despawns it */');
check('5a the pet vacuum asks mayAsk, with the player\'s dying (it asked through the five seconds of dying)',
  !!petBlock && /mayAsk\(loot, S\.myId, Date\.now\(\), \{ dying: !!S\._dying \}\)/.test(petBlock));
check('5b ...and keeps no copy of the recipient gate', !!petBlock && !/_petFFA/.test(petBlock) && !/recipients\.includes/.test(petBlock));
check('5c the hand asks mayAsk before it sends', /mayAsk\(loot, S\.myId, Date\.now\(\), \{ dying: !!S\._dying \}\)/.test(gl)
  && gl.indexOf('mayAsk(loot, S.myId') < gl.indexOf("type: 'loot_pickup'"));
check('5d ...and reads whose pile it is from the same rule', /amLootRecipient\(loot, S\.myId, Date\.now\(\)\)/.test(gl) && !/var _deathFFA/.test(gl));
check('5e both import game/lootAsk.js', /from '@\/game\/lootAsk\.js'/.test(gl) && /from '@\/game\/lootAsk\.js'/.test(bt));

/* ── 6. RARE DROP!, effectsRenderer's own code ── */
const fx = src('src/rendering/systems/effectsRenderer.js');
const rareSrc = cut(fx, '  _renderRareItems(l, age, bob, alpha, now) {', '\n  }\n') ;
check('6a _renderRareItems cut from effectsRenderer.js', !!rareSrc);
if (rareSrc) {
  class Node { constructor() { this.destroyed = false; this.visible = true; this.parent = null; this.scale = { set() {} }; this.anchor = { set() {} }; } destroy() { this.destroyed = true; } }
  class Text extends Node {}
  class Sprite extends Node {}
  const layer = { children: [], addChild(c) { c.parent = layer; layer.children.push(c); }, removeChild(c) { c.parent = null; layer.children = layer.children.filter((x) => x !== c); } };
  const self = { lootLayer: layer };
  let fn = null;
  try {
    fn = vm.runInNewContext('(function ' + rareSrc.trim().replace(/^_renderRareItems/, '') + '\n  })', {
      Text, Sprite, Texture: { EMPTY: {} }, LOOT_ICONS: { gem: { width: 64 } }, LOOT_Z: { gem: 1, beam: 0, rareText: 9 },
      LOOT_SCALE: 1, _AT_MIDDLE: { ox: 0, oy: 0 }, lootBeamTexture: () => ({}), lootHop: () => ({ out: 0, dy: 0, sq: 1, rot: 0 }),
      landAgeOf: (l, now, age) => age, applySquash() {}, weaponIconKey: () => 'w', armorIconKey: () => 'a', Math, Array,
    });
  } catch (e) { fn = null; check('6b the method runs', false, String(e).slice(0, 200)); }
  if (fn) {
    const l = { x: 0, y: 0, gem: { id: 'g' } };
    try {
      fn.call(self, l, 0, 0, 1, 1000);
      const t = l._pixiRareDrop;
      check('6b a fresh rare pile says RARE DROP!', !!t && !t.destroyed && t.visible && layer.children.includes(t));
      fn.call(self, l, 2.5, 0, 1, 1000 + 2500);
      check('6c ...and when it is done the Text is destroyed and let go of, not hidden (TRAPS §192)',
        !!t && t.destroyed && !layer.children.includes(t) && !l._pixiRareDrop, { destroyed: t && t.destroyed, kept: !!l._pixiRareDrop });
      fn.call(self, l, 3, 0, 1, 1000 + 3000);
      check('6d ...and is not made again', !l._pixiRareDrop && layer.children.filter((c) => c instanceof Text).length === 0);
    } catch (e) { check('6b the method runs', false, String(e).slice(0, 200)); }
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
