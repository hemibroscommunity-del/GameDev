/* v2.3.2442: PROBE THE LIVE ROOM.  Run by .github/workflows/probe-room.yml.
 *
 * Owner, 2026-09-10, after two production fixes: "Seems like a persistent
 * issue connecting to the server."  Every diagnosis of production that day
 * had been made from a sandbox whose proxy denies the worker -- inference
 * from code, never a measurement.  A GitHub runner can reach the worker, so
 * this does what a phone does, step by step, and prints what came back and
 * how long it took:
 *
 *   1. the worker alone            /health, /api/lobby       (no Durable Object)
 *   2. the room object over HTTP   /api/admin/overview WITHOUT a key -> a 401/404
 *                                  IS an answer: the object is alive.  A timeout
 *                                  is the finding.  Then /api/account/login with
 *                                  a phrase that cannot exist, same reasoning.
 *   3. a real WebSocket join       the client's own join frame, a fixed
 *                                  throwaway id, every message type logged with
 *                                  its timing, until state_sync or the deadline,
 *                                  then the close code.
 *
 * Read-only in effect: no key, no economy call, a guest id that is the same
 * every run (so it mints one throwaway record, not one per run), and the
 * socket is closed the moment state_sync lands.  Exit code is always 0 --
 * the VERDICT block at the end is the result; a red run would only hide it.
 *
 *   PROBE_BASE     worker origin (default: production)
 *   PROBE_SECONDS  how long to wait for the join to be answered (default 30)
 */
const BASE = (process.env.PROBE_BASE || 'https://api.brotown.net').replace(/\/$/, '');
const WS_BASE = BASE.replace(/^http/, 'ws');
const SECS = Math.max(5, Number(process.env.PROBE_SECONDS) || 30);
const ID = 'probe_gh_actions';

const t0 = Date.now();
const ms = () => (String(Date.now() - t0) + 'ms').padStart(8, ' ');
const log = (...a) => console.log(ms(), ...a);
const verdict = [];

async function http(label, path, init, timeoutMs = 15000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const s = Date.now();
  try {
    const r = await fetch(BASE + path, { ...(init || {}), signal: ac.signal });
    const body = (await r.text()).replace(/\s+/g, ' ').slice(0, 160);
    log(`${label}: HTTP ${r.status} in ${Date.now() - s}ms  ${body}`);
    return { status: r.status, ms: Date.now() - s };
  } catch (e) {
    const why = e && e.name === 'AbortError' ? `NO ANSWER after ${timeoutMs}ms` : `ERROR ${e && e.message}`;
    log(`${label}: ${why}`);
    return { status: null, ms: Date.now() - s, why };
  } finally { clearTimeout(timer); }
}

function joinFrame() {
  return {
    type: 'join', id: ID, protocolVersion: 2, httpAuth: true,
    data: {
      x: 640, y: 640, d: 'south', z: 'town', name: 'Probe', color: '#888888', avatar: 'bro',
      bt: '#2563eb', bl: '#1e3a5f',
    },
  };
}

function probeJoin() {
  return new Promise((resolve) => {
    const url = WS_BASE + '/ws?room=brotown-1&rf=1';
    log(`join: connecting ${url}`);
    const s = Date.now();
    let opened = false, synced = false, closed = false, n = 0;
    const types = {};
    let ws;
    try { ws = new WebSocket(url); } catch (e) { log(`join: constructor threw ${e.message}`); return resolve({ opened, synced }); }
    const deadline = setTimeout(() => {
      if (closed) return;
      log(`join: DEADLINE ${SECS}s -- opened=${opened} synced=${synced} messages=${n} types=${JSON.stringify(types)}`);
      try { ws.close(1000, 'probe deadline'); } catch {}
      resolve({ opened, synced, n, types, timedOut: true });
    }, SECS * 1000);
    ws.onopen = () => {
      opened = true;
      log(`join: socket OPEN in ${Date.now() - s}ms, sending join frame`);
      try { ws.send(JSON.stringify(joinFrame())); } catch (e) { log('join: send threw ' + e.message); }
    };
    ws.onmessage = (ev) => {
      n++;
      let m = null;
      try { m = JSON.parse(ev.data); } catch { /* binary or junk */ }
      const t = (m && m.type) || '(unparsed)';
      types[t] = (types[t] || 0) + 1;
      if (n <= 12) log(`join: message #${n} ${t}${t === 'join_rejected' ? ' reason=' + m.reason : ''}${t === 'room_full' ? ' ' + JSON.stringify(m) : ''}`);
      if (m && m.type === 'state_sync') {
        synced = true;
        const caps = m.caps || {};
        log(`join: STATE_SYNC in ${Date.now() - s}ms -- caps=${Object.keys(caps).length} prog3=${!!caps.prog3} abil=${!!caps.abil} players=${m.playerCount} zone=${m.zone || m.currentZone || '?'}`);
        clearTimeout(deadline);
        try { ws.close(1000, 'probe done'); } catch {}
        resolve({ opened, synced, n, types, syncMs: Date.now() - s, caps: Object.keys(caps).length, prog3: !!caps.prog3 });
      }
    };
    ws.onerror = (e) => { log(`join: socket ERROR ${(e && e.message) || ''}`); };
    ws.onclose = (ev) => {
      closed = true;
      log(`join: socket CLOSED code=${ev.code} reason="${ev.reason}" after ${Date.now() - s}ms (opened=${opened} synced=${synced})`);
      clearTimeout(deadline);
      resolve({ opened, synced, n, types, closeCode: ev.code, closeReason: ev.reason });
    };
  });
}

(async () => {
  log(`probe against ${BASE}  (deadline ${SECS}s)`);
  const a = await http('worker /health', '/health');
  const b = await http('worker /api/lobby', '/api/lobby');
  const c = await http('room object: /api/admin/overview (no key; 401/404 = alive)', '/api/admin/overview', { headers: { Authorization: 'Bearer probe-no-such-key' } }, 20000);
  const d = await http('room object: /api/account/login (bogus phrase)', '/api/account/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phrase: 'probe-not-a-real-phrase' }),
  }, 20000);
  const j = await probeJoin();

  console.log('\n══════════ VERDICT ══════════');
  if (a.status !== 200) verdict.push(`WORKER: /health did not answer 200 (${a.why || a.status}). The worker itself is down or rate-limited -- nothing below can work.`);
  else verdict.push(`WORKER: alive (/health ${a.ms}ms, /api/lobby ${b.status} ${b.ms}ms).`);
  if (c.status === null && d.status === null) verdict.push(`ROOM OBJECT: does NOT answer HTTP (admin: ${c.why}; login: ${d.why}). The Durable Object is stalled -- every request through it hangs.`);
  else verdict.push(`ROOM OBJECT: answers HTTP (admin ${c.status} in ${c.ms}ms, login ${d.status} in ${d.ms}ms).`);
  if (j.synced) verdict.push(`JOIN: ANSWERED -- state_sync in ${j.syncMs}ms, ${j.caps} caps, prog3=${j.prog3}. The room is serving joins.`);
  else if (!j.opened && j.closeCode) verdict.push(`JOIN: REFUSED before open -- close ${j.closeCode} "${j.closeReason}". The upgrade is being rejected (room full uses 4009; a worker error shows as 1006).`);
  else if (!j.opened) verdict.push(`JOIN: the WebSocket never opened within ${SECS}s. The upgrade itself hangs -- the object is not taking new connections.`);
  else if (j.closeCode) verdict.push(`JOIN: socket opened, then CLOSED ${j.closeCode} "${j.closeReason}" with no state_sync (${j.n} messages: ${JSON.stringify(j.types)}). Look at the close reason.`);
  else verdict.push(`JOIN: socket opened but NO state_sync in ${SECS}s (${j.n || 0} messages: ${JSON.stringify(j.types || {})}). The join handler is not completing -- this is the stall.`);
  for (const v of verdict) console.log('  ' + v);
  console.log('═════════════════════════════\n');
  process.exit(0);
})();
