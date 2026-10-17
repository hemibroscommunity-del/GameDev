/* ═══ v2.3.3199: WHAT A PHONE IN THE WHEEL IS SENT, BY PART ═══
 *
 * One phone-shaped player joins a LOCAL room, goes down to the Wheel's
 * BroTown and walks there (a phone's 30 moves a second), and sorts every byte
 * it is sent: each tick's players, events (by type), monsters and nodes, and
 * every other message by type.  Run it beside a load test, against the
 * load test's own worker:
 *
 *   node tools/qa/load/load.mjs --steps 100 --hold 90      # prints its port
 *   node tools/qa/load/tickmix.mjs 'ws://127.0.0.1:PORT/ws?room=loadtest&rf=1' 25
 *
 * Measured at 100 players (docs/specs/load-test.md, "What a phone really
 * downloads"): 98% of a BroTown phone's bytes were other players' entries, 55
 * a tick at 146 bytes each.  The sizes are UNZIPPED, as the phone reads them
 * (TRAPS §169): the room compresses about 13 to 1 on the wire.
 *
 * Local only, like load.mjs: anything but 127.0.0.1 / localhost is refused.
 */
const URL_ARG = process.argv[2];
const SECS = +(process.argv[3] || 20);
if (!URL_ARG || !/^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(URL_ARG)) {
  console.error('tickmix.mjs: give a LOCAL worker url (ws://127.0.0.1:PORT/ws?room=...&rf=1). Never the live game.');
  process.exit(2);
}

/* worldTrial.js WHEEL.arrival -- the Wheel's town square (v2.3.3315: the
   Wheel the room plays, the live spawn table's) */
const { WHEEL_CENTRE } = await import('../../../server/src/wheelspawns.js');
const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };
const SPEED = 165;   /* px a second, a phone's walk */
const STEP_MS = 33;  /* wsClient.js MOVE_GAP_SEEN_MS */

const id = 'tm' + Math.random().toString(36).slice(2, 12);
const ws = new WebSocket(URL_ARG);
const by = Object.create(null), evBytes = Object.create(null), evCount = Object.create(null);
let x = ARRIVAL.x + 50, y = ARRIVAL.y, t0 = 0, started = false, recording = false;
let ticks = 0, withPlayers = 0, playerEntries = 0, monsterEntries = 0;
const add = (k, n) => { by[k] = (by[k] || 0) + n; };
const send = (o) => { try { ws.send(JSON.stringify(o)); } catch { /* closed */ } };
/* a phone's move (BroTown.jsx's broadcast through the wsClient shim) */
const move = (z, dir = 0) => send({
  type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
  d: dir >= 0 ? 'right' : 'left', f: dir >= 0 ? 'east' : 'west', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
  vx: Math.round(dir * SPEED / 60 * 100), vy: 0, dodging: false, blocking: false, ba: null, dead: false,
});

ws.onopen = () => send({ type: 'join', id, name: 'Mix', protocolVersion: 2, ws: [1, 5], httpAuth: true,
  data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Mix' } });
ws.onerror = () => { console.error('tickmix.mjs: socket error'); process.exit(1); };
ws.onmessage = (e) => {
  const d = e.data;
  if (typeof d !== 'string') return;
  if (d.startsWith('{"type":"ping"')) { try { send({ type: 'pong', ts: JSON.parse(d).ts }); } catch { /* malformed */ } }
  if (!started && d.startsWith('{"type":"state_sync"')) {
    started = true;
    /* down to the Wheel (the client's wheelHome trip), then 3 s to settle */
    setTimeout(() => { move('wheel'); setTimeout(() => { recording = true; t0 = Date.now(); walk(); }, 3000); }, 500);
  }
  if (!recording) return;
  if (!d.startsWith('{"type":"tick"')) {
    const m = /^\{"type":"([a-z_0-9]+)"/.exec(d);
    add('msg:' + (m ? m[1] : '?'), d.length);
    return;
  }
  ticks++;
  const o = JSON.parse(d);
  add('tick:head', ('{"type":"tick","seq":' + o.seq + ',"ts":' + o.ts + '}').length);
  if (o.players) {
    add('tick:players', JSON.stringify(o.players).length + 11);
    withPlayers++; playerEntries += Object.keys(o.players).length;
  }
  if (o.events) {
    add('tick:events', JSON.stringify(o.events).length + 10);
    for (const ev of o.events) {
      const t = (ev && (ev.type || ev.event)) || '?';
      evBytes[t] = (evBytes[t] || 0) + JSON.stringify(ev).length;
      evCount[t] = (evCount[t] || 0) + 1;
    }
  }
  if (o.monsters) {
    add('tick:monsters', JSON.stringify(o.monsters).length + 12);
    for (const z in o.monsters) monsterEntries += o.monsters[z].length;
  }
  if (o.nodes) add('tick:nodes', JSON.stringify(o.nodes).length + 9);
};

function walk() {
  const t = Date.now() - t0;
  if (t > SECS * 1000) { report(t / 1000); process.exit(0); }
  const dir = Math.floor(t / 2000) % 2 ? -1 : 1;   /* 2 s east, 2 s back */
  x += dir * SPEED * STEP_MS / 1000;
  move('wheel', dir);
  setTimeout(walk, STEP_MS);
}

function report(s) {
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const kb = (v) => (v / s / 1024).toFixed(2).padStart(8);
  console.log(`${s.toFixed(1)} s, ${ticks} ticks (${(ticks / s).toFixed(1)} a second), ${(total / s / 1024).toFixed(1)} KB/s unzipped`);
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(26)} ${kb(v)} KB/s  ${(100 * v / total).toFixed(1).padStart(5)}%`);
  }
  console.log(`  player entries in a tick that has players: ${(playerEntries / Math.max(1, withPlayers)).toFixed(1)}`
    + `, ${(by['tick:players'] / Math.max(1, playerEntries)).toFixed(0)} bytes each; monster entries a tick: ${(monsterEntries / Math.max(1, ticks)).toFixed(1)}`);
  const evs = Object.entries(evBytes).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (evs.length) console.log('  events by type:');
  for (const [k, v] of evs) {
    console.log(`    ${k.padEnd(24)} ${kb(v)} KB/s  ${(evCount[k] / s).toFixed(1).padStart(6)} a second, ${Math.round(v / evCount[k])} bytes each`);
  }
}
