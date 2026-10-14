/* ═══ v2.3.3194: A GROUP OF FAKE PLAYERS, ONE PROCESS ═══
 *
 * Forked by load.mjs (the conductor), never run by hand.  Each bot is a guest
 * who does what a phone does on the wire, and nothing a phone does not:
 *
 *   - joins with protocolVersion 2 (a guest id, no passphrase: join.js lets
 *     those through as throwaways, exactly like a phone with no key yet);
 *   - answers every `ping` with a `pong` (tick.js _tickPingAndAfk, ~3 s);
 *   - goes down to the Wheel a beat after state_sync, with the same zone
 *     change the client's wheelHome trip makes (a `move` carrying z:'wheel'
 *     at the town square, worldTrial.js WHEEL.arrival);
 *   - walks at a phone's pace (150-180 px/s, under movement.js's 500 px/s
 *     bound) and sends its position every 33 ms while it moves -- the
 *     client's MOVE_GAP_SEEN_MS, the rate whenever anyone else is in the
 *     zone, which in the Wheel is always -- and once a second standing
 *     still (the client's idle keepalive);
 *   - a FIGHTER walks out to its land's first stretch and swings at the
 *     nearest monster every ~0.7 s with the client's own `monster_damage`
 *     (monsterCombat.js: no damage number, the worker rolls it); when it
 *     dies it waits for `player_respawned` and walks back in, as the
 *     client's applyLocalRespawn does;
 *   - v2.3.3245: with --relays, each swing also sends what a phone tells the
 *     others about it (`player_swing`, or an archer's `player_projectile`),
 *     which the room relays to every phone.
 *
 * What it measures, reported to the conductor once a second:
 *   - bytes and messages received, by kind (tick / zone_state / other);
 *   - for two PROBE bots per process, every tick parsed: how long after the
 *     tick's own server timestamp it arrived (`ts`, same machine clock), the
 *     server's real tick rate (seq / ts), and how long after a bot in this
 *     process SENT a position some other bot SAW it in a tick -- the delay a
 *     player feels as "the others lag";
 *   - joins, zone entries, deaths, closes, and this process's own CPU and
 *     event-loop delay, so a run where the BOTS were the bottleneck can be
 *     told apart from one where the server was.
 */
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { PlainWS } from './plainws.mjs';
import { MOVE_DIET, dietMayWait } from '../../../src/game/moveDiet.js';   /* v2.3.3204: --diet, the phone's own rule */
import { readFileSync } from 'node:fs';

/* ═══ v2.3.3240: --track, THE LOOK EVERY PHONE SENDS EVERY 2 s ═══
   BroTown.jsx sends `track` every 2 s whatever changed: the whole look (hair,
   clothes, gear, drawings), level, HP, weapon and the inspect card's stats.
   The worker relays each one to EVERY other player in the room as a message of
   its own (index.js case 'track', broadcastExcept).  The bots never sent it,
   so every capacity number before v2.3.3240 left it out.  The payload is a
   real phone's (track-sample.json, captured from the game by
   mp-trackcapture), each bot's own name, place and zone put in. */
const TRACK_MS = 2000;
let TRACK_SAMPLE = null;
function trackSample() {
  if (TRACK_SAMPLE) return TRACK_SAMPLE;
  try { TRACK_SAMPLE = JSON.parse(readFileSync(new URL('./track-sample.json', import.meta.url), 'utf8')); } catch { TRACK_SAMPLE = {}; }
  return TRACK_SAMPLE;
}

/* v2.3.3199: --no-deflate's WebSocket (plainws.mjs) */

/* worldTrial.js WHEEL.arrival -- the Wheel's town square */
const ARRIVAL = { x: 21504, y: 21792 };
const MOVE_GAP_MS = 33;          /* wsClient.js MOVE_GAP_SEEN_MS */
const IDLE_KEEPALIVE_MS = 1000;  /* the client's standing-still keepalive */
/* v2.3.3199: --move-ms N (load.mjs): a walker's move every N ms instead of
   the phone's 33, to measure what the room's incoming moves cost it */
/* v2.3.3203: --town-move-ms N, the town walkers' alone (a phone on safe ground) */
const moveGap = (bot) => (bot && !bot.fighter && CFG && CFG.townMoveMs > 0 ? CFG.townMoveMs
  : (CFG && CFG.moveGapMs > 0 ? CFG.moveGapMs : MOVE_GAP_MS));
const WALK_R = 1400;             /* walkers stay in the town and its commons (WHEEL_SAFE_R 2937) */
const DIET_CENTRE = [21504, 21504], DIET_SAFE_R = 2937;   /* v2.3.3204: the safe ground (wheelspawns.js) */
const FIGHT_R = 350;
const SWING_MS = 700;
const REACH_PX = 70;
const SAMPLE_CAP = 4000;         /* per report: samples beyond this are thinned */
/* v2.3.3194: "the others' moves seen" counts only a sender this near the probe
   when it arrives -- the players on a phone's screen, whose lag a player
   feels (the worker's FAR_PLAYERS.NEAR_R, server/src/tick.js) */
const SEEN_NEAR_R_DEFAULT = 2400;
/* v2.3.3199: --seen-r N (load.mjs), for a server whose near circle is not 2,400 */
const seenNearR = () => (CFG && CFG.seenR > 0 ? CFG.seenR : SEEN_NEAR_R_DEFAULT);
/* the client's 8-way facing names (BroTown.jsx S._renderFacing) */
const FACE8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

let CFG = null;
const bots = [];
const byId = new Map();
let seq = 0;
let stopping = false;
let M = fresh();
const loopDelay = monitorEventLoopDelay({ resolution: 10 });
loopDelay.enable();
let cpu0 = process.cpuUsage();
let wall0 = performance.now();

function fresh() {
  return {
    rxBytes: 0, rxMsgs: 0, rxTickBytes: 0, rxTicks: 0, rxZoneStateBytes: 0, rxOtherBytes: 0,
    wireRx: 0,   /* v2.3.3199: what the WIRE bot was sent, unzipped (load.mjs wireProxy) */
    txMsgs: 0, txBytes: 0, moves: 0, swings: 0, tracks: 0, rxUpdates: 0, rxUpdateBytes: 0,
    joins: [], entries: [], deliver: [], seen: [], tickRates: [],
    closes: {}, rejects: {}, errors: 0, deaths: 0, respawns: 0, roomFull: 0,
  };
}
function push(arr, v) {
  if (arr.length < SAMPLE_CAP) arr.push(v);
  else arr[(Math.random() * SAMPLE_CAP) | 0] = v;   /* keep a fair sample */
}
const rand = (a, b) => a + Math.random() * (b - a);

function send(bot, obj) {
  if (!bot.ws || bot.ws.readyState !== 1) return false;
  const s = JSON.stringify(obj);
  try { bot.ws.send(s); } catch { return false; }
  M.txMsgs++; M.txBytes += s.length;
  return true;
}

function newBot(k) {
  const fighter = Math.random() < CFG.fighters;
  /* v2.3.3194: as long as a real id ('bp_' + a hash + '_' + two words,
     about 22 characters, src/networking/index.js), since every player's
     entry in every tick carries it; 'lt', not 'bp_', so no character record
     is made for a bot */
  const id = ('lt' + CFG.tag + (seq++).toString(36) + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 22);
  const bot = {
    id, k, fighter, probe: bots.length < 2,
    /* v2.3.3199: the first bot of the process given a `wireUrl` goes through
       load.mjs's byte-counting proxy, so a step knows what a phone is sent ON
       THE WIRE (compressed, permessage-deflate) beside what it unzips */
    wire: !!CFG.wireUrl && bots.length === 0,
    ws: null, state: 'off', x: ARRIVAL.x + rand(-60, 60), y: ARRIVAL.y + rand(-40, 40),
    tx: 0, ty: 0, speed: rand(150, 180), standUntil: 0, lastSent: 0, timer: null,
    home: fighter ? CFG.homes[k % CFG.homes.length] : null, anchor: null,
    monsters: new Map(), lastSwing: 0, tickN: 0,
    sentAt: new Map(), openedAt: 0, enterAt: 0, firstSeq: null, lastSeq: null,
  };
  bots.push(bot);
  byId.set(id, bot);
  return bot;
}

function connect(bot) {
  bot.state = 'connecting';
  bot.openedAt = performance.now();
  let ws;
  const url = bot.wire ? CFG.wireUrl : CFG.url;
  try { ws = CFG.noDeflate ? new PlainWS(url) : new WebSocket(url); } catch { M.errors++; retry(bot); return; }
  bot.ws = ws;
  ws.onopen = () => {
    bot.state = 'joining';
    send(bot, {
      type: 'join', id: bot.id, name: 'Load' + bot.k, protocolVersion: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'south', z: 'town', name: 'Load' + bot.k },
    });
  };
  ws.onmessage = (ev) => onMessage(bot, ev.data);
  ws.onerror = () => { M.errors++; };
  ws.onclose = (ev) => {
    M.closes[ev.code] = (M.closes[ev.code] || 0) + 1;
    clearInterval(bot.timer); bot.timer = null;
    clearInterval(bot.pongTimer); bot.pongTimer = null;
    clearInterval(bot.trackTimer); bot.trackTimer = null;
    bot.ws = null;
    bot.state = 'off';
    if (!stopping) retry(bot);
  };
}

/* A phone reconnects after a drop (wsClient's backoff starts at 1 s); so does
   a bot, so a run that knocks players off also pays for their way back in. */
function retry(bot) {
  setTimeout(() => { if (!stopping && !bot.retired && bot.state === 'off') connect(bot); }, rand(1000, 3000));
}

function onMessage(bot, data) {
  if (typeof data !== 'string') return;
  const len = data.length;
  M.rxBytes += len; M.rxMsgs++;
  if (bot.wire) M.wireRx += len;
  if (data.startsWith('{"type":"tick"')) {
    M.rxTicks++; M.rxTickBytes += len;
    if (bot.probe) probeTick(bot, data);
    else if (bot.fighter && bot.state === 'walking' && (++bot.tickN % 4) === 0) fighterTick(bot, data);
    return;
  }
  /* v2.3.3240: the worker's relay of another player's 2 s look (--track):
     counted, not parsed -- a bot has no use for it, and parsing N/2 of them a
     second each would make the BOTS the bottleneck */
  if (data.startsWith('{"type":"player_update"')) {
    M.rxOtherBytes += len; M.rxUpdates++; M.rxUpdateBytes += len;
    return;
  }
  if (data.startsWith('{"type":"ping"')) {
    M.rxOtherBytes += len;
    let ts = 0;
    try { ts = JSON.parse(data).ts; } catch { /* malformed: answer anyway */ }
    send(bot, { type: 'pong', ts });
    return;
  }
  let msg;
  try { msg = JSON.parse(data); } catch { return; }
  if (msg.type === 'zone_state') M.rxZoneStateBytes += len; else M.rxOtherBytes += len;
  switch (msg.type) {
    case 'state_sync':
      if (bot.state !== 'joining') break;
      push(M.joins, performance.now() - bot.openedAt);
      bot.state = 'synced';
      /* wheelHome.js: "a beat in the world before the trip" */
      setTimeout(() => enterWheel(bot), rand(500, 1500));
      break;
    case 'zone_state':
      if (msg.zone !== 'wheel') break;
      if (bot.enterAt) push(M.entries, performance.now() - bot.enterAt);
      bot.enterAt = 0;
      if (bot.fighter) {
        bot.monsters.clear();
        /* its own land's first stretch only: ids wm-<home>-<k> (wheelzone.js;
           the deeper stretches are wm-<home>-t<tier>-<k>) */
        const own = new RegExp('^wm-' + bot.home + '-\\d+$');
        for (const m of msg.monsters || []) if (m && typeof m.id === 'string' && own.test(m.id)) bot.monsters.set(m.id, m);
        bot.anchor = pickAnchor(bot);
      }
      startWalking(bot);
      break;
    case 'player_died':
      M.deaths++;
      bot.state = 'dead';
      clearInterval(bot.timer); bot.timer = null;
      break;
    case 'player_respawned':
      M.respawns++;
      bot.state = 'synced';
      bot.x = ARRIVAL.x + rand(-60, 60); bot.y = ARRIVAL.y + rand(-40, 40);
      setTimeout(() => enterWheel(bot), rand(500, 1500));
      break;
    case 'room_full':
      M.roomFull++;
      break;
    case 'join_rejected':
      M.rejects[msg.reason || '?'] = (M.rejects[msg.reason || '?'] || 0) + 1;
      break;
    default:
      break;
  }
}

function enterWheel(bot) {
  if (stopping || bot.state !== 'synced') return;
  bot.state = 'entering';
  bot.enterAt = performance.now();
  sendMove(bot, true);
}

function pickAnchor(bot) {
  /* the monsters of its own land, nearest the middle: the first stretch,
     where a new character's fights are (wheelzone.js, levels 1-5) */
  let best = null, bestD = Infinity;
  for (const m of bot.monsters.values()) {
    const d = Math.hypot(m.x - ARRIVAL.x, m.y - ARRIVAL.y);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best ? { x: best.x, y: best.y } : { x: ARRIVAL.x, y: ARRIVAL.y };
}

function startWalking(bot) {
  bot.state = 'walking';
  newTarget(bot);
  clearInterval(bot.timer);
  /* --idle: everyone stands still (the client's 1 s keepalive only), the
     town square on a quiet evening */
  if (CFG.idle) bot.standUntil = Infinity;
  /* --pong N: N extra `pong`s a second from each player.  The worker's pong
     case only folds a number into session.rtt (index.js), so the difference
     these make in the server's CPU is the RUNTIME's cost of taking one
     message in, apart from anything the game does with it. */
  if (CFG.pongHz > 0 && !bot.pongTimer) {
    bot.pongTimer = setInterval(() => { if (bot.state === 'walking') send(bot, { type: 'pong', ts: 0 }); }, 1000 / CFG.pongHz);
  }
  /* each bot on its own clock, so the room hears a crowd, not a drum */
  setTimeout(() => {
    if (bot.state !== 'walking') return;
    bot.timer = setInterval(() => step(bot), moveGap(bot));
  }, rand(0, moveGap(bot)));
  /* v2.3.3240: --track, the phone's 2 s look (above) */
  if (CFG.track && !bot.trackTimer) {
    setTimeout(() => {
      if (bot.trackTimer || bot.retired) return;
      bot.trackTimer = setInterval(() => {
        if (bot.state !== 'walking' && bot.state !== 'dead') return;
        const data = Object.assign({}, trackSample(), {
          x: Math.round(bot.x * 10) / 10, y: Math.round(bot.y * 10) / 10,
          name: 'Load' + bot.k, zone: 'wheel', dir: 'down',
        });
        /* a fighter's HP and kill count move as a real one's do in a fight
           (the walkers' looks stay as they are, as a real walker's do) */
        if (bot.fighter && data.rpgMaxHp) {
          data.rpgHp = 1 + Math.floor(Math.random() * data.rpgMaxHp);
          bot.kills = (bot.kills || 0) + (Math.random() < 0.3 ? 1 : 0);
          if (data.rpgData) data.rpgData = Object.assign({}, data.rpgData, { kills: bot.kills });
        }
        if (send(bot, { type: 'track', data })) M.tracks++;
      }, TRACK_MS);
    }, rand(0, TRACK_MS));
  }
}

function newTarget(bot) {
  const c = bot.fighter && bot.anchor ? bot.anchor : ARRIVAL;
  /* v2.3.3208: CFG.walkR -- walkers kept closer to the square (the phone
     crowd test, mp-crowdbots.mjs, wants them on its screen) */
  const r = (bot.fighter ? FIGHT_R : (CFG && CFG.walkR > 0 ? CFG.walkR : WALK_R)) * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  bot.tx = c.x + Math.cos(a) * r;
  bot.ty = c.y + Math.sin(a) * r;
}

function nearestMonster(bot) {
  let best = null, bestD = Infinity;
  for (const m of bot.monsters.values()) {
    if (m.alive === false) continue;
    const d = Math.hypot(m.x - bot.x, m.y - bot.y);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best && bestD < 600 ? { m: best, d: bestD } : null;
}

function step(bot) {
  if (bot.state !== 'walking') return;
  const now = performance.now();
  /* v2.3.3203: a step is the time that really passed since the last one, as
     a phone moves by its frame's dt -- a late timer (a busy bot process) used
     to move the bot a whole step anyway, so the speed it reported was not the
     speed it moved at */
  const elapsed = bot.lastStepAt ? Math.min(200, Math.max(1, now - bot.lastStepAt)) : moveGap(bot);
  bot.lastStepAt = now;
  if (bot.fighter) {
    const near = nearestMonster(bot);
    if (near) {
      bot.tx = near.m.x; bot.ty = near.m.y;
      if (near.d <= REACH_PX && now - bot.lastSwing >= SWING_MS) {
        bot.lastSwing = now + rand(0, 100);
        /* v2.3.3245: --relays: what a phone tells the others about each blow
           (monsterCombat.js): the swing it draws for them, or the arrow it
           looses for them -- relayed by the room to every phone (index.js's
           default branch, the eventBuffer).  Half the fighters are archers. */
        const archer = !!(CFG && CFG.relays) && (bot.k % 2) === 1;
        if (CFG && CFG.relays) {
          const ang = Math.round(Math.atan2(near.m.y - bot.y, near.m.x - bot.x) * 1000) / 1000;
          const relay = archer
            ? { type: 'player_projectile', payload: { id: bot.id, x: Math.round(bot.x), y: Math.round(bot.y), ang, isStaff: false, ts: Date.now(), life: 90 } }
            : { type: 'player_swing', payload: { id: bot.id, ts: Date.now(), wpn: 'sword', ang } };
          if (send(bot, relay)) M.relays = (M.relays || 0) + 1;
        }
        if (send(bot, { type: 'monster_damage', payload: { monsterId: near.m.id, zone: 'wheel', element: null, slot: archer ? 'ranged' : 'melee', special: false } })) M.swings++;
      }
    }
  }
  if (now < bot.standUntil) {
    if (now - bot.lastSent >= IDLE_KEEPALIVE_MS) sendMove(bot, false, 0, 0);
    return;
  }
  const dx = bot.tx - bot.x, dy = bot.ty - bot.y;
  const dist = Math.hypot(dx, dy);
  const stepPx = bot.speed * (elapsed / 1000);
  const stopAt = bot.fighter && nearestMonster(bot) ? REACH_PX - 20 : 0;
  if (dist <= Math.max(stepPx, stopAt)) {
    if (!bot.fighter && Math.random() < 0.3) bot.standUntil = now + rand(1000, 4000);
    newTarget(bot);
    if (now - bot.lastSent >= IDLE_KEEPALIVE_MS) sendMove(bot, false, 0, 0);
    return;
  }
  const vx = dx / dist, vy = dy / dist;
  bot.x += vx * stepPx; bot.y += vy * stepPx;
  sendMove(bot, false, vx, vy);
}

function sendMove(bot, entering, vx = 0, vy = 0) {
  /* v2.3.3194: what a phone sends (BroTown.jsx's move broadcast through the
     shim, wsClient.js _pendingMove): positions to a tenth of a pixel,
     velocities as whole hundredths of a pixel a 60 Hz frame, the 4-way `d`
     and 8-way `f` the client uses, and its worn gear */
  const x = Math.round(bot.x * 10) / 10, y = Math.round(bot.y * 10) / 10;
  const moving = !!(vx || vy);
  const ang = Math.atan2(vy, vx);
  const d = moving ? (Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up')) : 'down';
  const f = moving ? FACE8[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8] : (bot.face || 'south');
  bot.face = f;
  const perFrame = bot.speed / 60;
  const m = {
    type: 'move', x, y, d, f, eqc: 'none', eql: 'none', eqs: 'none', ex: null, z: 'wheel',
    vx: Math.round(vx * perFrame * 100), vy: Math.round(vy * perFrame * 100),
    dodging: false, blocking: false, ba: null, dead: false,
  };
  /* v2.3.3204: --diet, as a phone on the Wheel's safe ground does it
     (src/game/moveDiet.js, wsClient.js moveDietOn): a move on the line the
     last one drew waits until GAP_MS after it -- this bot's next step makes
     a fresher one */
  const now = performance.now();
  if (CFG.diet && !entering && now - bot.lastSent < MOVE_DIET.GAP_MS
      && dietMayWait(!bot.fighter, m, now, bot.lastMove, bot.lastMoveAt, DIET_CENTRE, DIET_SAFE_R)) { M.dieted = (M.dieted || 0) + 1; return; }
  const ok = send(bot, m);
  if (!ok) return;
  M.moves++;
  bot.lastMove = m; bot.lastMoveAt = now;
  bot.lastSent = performance.now();
  if (!entering) {
    /* keyed in whole pixels: a worker with #886 (docs/specs/far-players.md) sends them so */
    bot.sentAt.set(Math.round(x) + ',' + Math.round(y), bot.lastSent);
    if (bot.sentAt.size > 64) bot.sentAt.delete(bot.sentAt.keys().next().value);
  }
}

/* A probe parses every tick it gets. */
function probeTick(bot, data) {
  let d;
  try { d = JSON.parse(data); } catch { return; }
  probeTickObj(bot, d);
}
/* v2.3.3245: --events (load.mjs): what the probes' ticks carry in `events`,
   by type -- how many, and their bytes as JSON (unzipped) */
function countEvents(d) {
  if (!Array.isArray(d.events)) return;
  const t = M.evTypes || (M.evTypes = Object.create(null));
  for (const e of d.events) {
    const k = e && typeof e.type === 'string' ? e.type : '?';
    const c = t[k] || (t[k] = [0, 0]);
    c[0]++; c[1] += JSON.stringify(e).length;
  }
}
function probeTickObj(bot, d) {
  const now = performance.now();
  if (!d || typeof d !== 'object') return;
  if (CFG && CFG.events) countEvents(d);
  if (typeof d.ts === 'number') push(M.deliver, Date.now() - d.ts);
  if (typeof d.seq === 'number' && typeof d.ts === 'number') {
    if (bot.firstSeq === null) bot.firstSeq = [d.seq, d.ts];
    bot.lastSeq = [d.seq, d.ts];
  }
  if (d.players) {
    for (const id in d.players) {
      const sender = byId.get(id);
      if (!sender || sender === bot) continue;
      const p = d.players[id];
      if (typeof p.x !== 'number' || typeof p.y !== 'number') continue;
      const key = Math.round(p.x) + ',' + Math.round(p.y);
      const t = sender.sentAt.get(key);
      if (t === undefined) continue;
      sender.sentAt.delete(key);
      /* only the ones near enough to be on this probe's screen */
      if (Math.hypot(p.x - bot.x, p.y - bot.y) <= seenNearR()) push(M.seen, now - t);
    }
  }
  if (bot.fighter) updateMonsters(bot, d);
}

/* A fighter reads every fourth tick: enough to find a monster to hit. */
function fighterTick(bot, data) {
  let d;
  try { d = JSON.parse(data); } catch { return; }
  updateMonsters(bot, d);
}
function updateMonsters(bot, d) {
  const list = d.monsters && d.monsters.wheel;
  if (!Array.isArray(list)) return;
  for (const w of list) {
    const m = bot.monsters.get(w.id);
    if (m) { m.x = w.x; m.y = w.y; m.alive = w.alive; }
  }
}

function report() {
  const cpu = process.cpuUsage(cpu0);
  const wall = performance.now() - wall0;
  cpu0 = process.cpuUsage(); wall0 = performance.now();
  /* the server's own tick rate, from each probe's first and last tick */
  for (const b of bots) {
    if (b.probe && b.firstSeq && b.lastSeq && b.lastSeq[1] > b.firstSeq[1]) {
      M.tickRates.push(((b.lastSeq[0] - b.firstSeq[0]) / (b.lastSeq[1] - b.firstSeq[1])) * 1000);
    }
    b.firstSeq = b.lastSeq;
  }
  const states = {};
  for (const b of bots) states[b.state] = (states[b.state] || 0) + 1;
  const out = Object.assign(M, {
    bots: bots.length, states,
    probesIn: bots.filter((b) => b.probe && b.state === 'walking').length,   /* v2.3.3245: --events' per-probe rate */
    cpuPct: ((cpu.user + cpu.system) / 1000 / wall) * 100,
    loopP99: loopDelay.percentile(99) / 1e6,
    loopMax: loopDelay.max / 1e6,
    wallMs: wall,
  });
  loopDelay.reset();
  M = fresh();
  process.send({ type: 'report', data: out });
}

process.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.cmd === 'config') {
    CFG = msg.cfg;
    setInterval(report, 1000);
  } else if (msg.cmd === 'add') {
    /* joins spread over the given time, the way people arrive */
    const n = msg.n | 0, every = msg.spreadMs ? msg.spreadMs / Math.max(1, n) : 0;
    for (let i = 0; i < n; i++) {
      const bot = newBot(bots.length);
      setTimeout(() => connect(bot), i * every);
    }
  } else if (msg.cmd === 'remove') {
    /* players leave: the newest first, for good (a closed tab, not a drop) */
    let n = msg.n | 0;
    for (let i = bots.length - 1; i >= 0 && n > 0; i--) {
      const b = bots[i];
      if (b.retired) continue;
      b.retired = true; n--;
      clearInterval(b.timer); clearInterval(b.pongTimer); clearInterval(b.trackTimer);
      b.state = 'gone';
      try { if (b.ws) { b.ws.onclose = null; b.ws.close(1000, 'left'); } } catch { /* already gone */ }
      b.ws = null;
    }
  } else if (msg.cmd === 'stop') {
    stopping = true;
    for (const b of bots) {
      clearInterval(b.timer); clearInterval(b.pongTimer); clearInterval(b.trackTimer);
      try { if (b.ws) b.ws.close(1000, 'load test over'); } catch { /* already gone */ }
    }
    setTimeout(() => process.exit(0), 500);
  }
});
process.on('disconnect', () => process.exit(0));
