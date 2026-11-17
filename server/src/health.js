/* ═══ v2.3.5601: THE ROOM'S OWN HEALTH (card OPS PR 2; red team RT-2, F3 and F4) ═══
 *
 * `/health` answers from the outer worker and never asks the room: a room
 * that is stuck, crash-looping or refusing every save still read "ok" there,
 * so an uptime monitor pointed at it could never fire (RT-2 F3,
 * docs/security/rt2-findings.md).  And a dashboard rollback past a change
 * to how characters are stored shuts out every player the newer worker
 * saved (the join closes 1011, migrations.md), with no word anywhere (F4).
 *
 * `GET /health/room` asks the room, 3 s at most, and answers with numbers
 * only (no id, no name, no address):
 *
 *   players        joined players;   sockets   every socket, the door's count
 *   ticking        the tick loop runs (it runs while anyone is connected)
 *   tickAgeMs      since the last tick began (roomrow.js `lastTick`), or null
 *   savesRefused   { put, newer } since the worker started (roomrow.js
 *                  `_savesRefused`: a put the storage threw, and a character
 *                  a newer worker saved, refused at the join -- F4's count)
 *   problems       what is wrong, in words: 'no tick' (sockets but no tick
 *                  loop), 'tick late' (the loop runs, its last tick older
 *                  than TICK_LATE_MS), 'save refused' (the storage refused a
 *                  put in the last PUT_WINDOW_MS), 'newer saves refused' (a
 *                  join was refused as newer in the last PUT_WINDOW_MS: a
 *                  rollback is shutting players out -- OPERATIONS "Rolling
 *                  back": `newersave` false)
 *
 * 200 when there is no problem, 503 when there is, 503
 * `{ ok: false, room: 'no answer' }` when the room does not answer in
 * TIMEOUT_MS.
 *
 * v2.3.5601 (mended for sitting 19b, its gatekeeper's review): THE PUBLIC
 * ANSWER IS UP OR DOWN ONLY, `{ ok }` with its 200 or 503 -- all a monitor
 * reads.  The numbers above (players, sockets, savesRefused, and above all
 * "newer saves refused", which told a stranger a rollback had happened) only
 * with the owner's key (`Authorization: Bearer`, the room's own admin check
 * and its lockout: admin.js _adminAuth).  The outer route passes the room
 * only that header and the address, nothing else of the request.  An empty room with no tick loop is healthy: the loop stops
 * when the last socket goes (leave.js) and starts with the first.
 *
 * The room's answer is the internal `/_room_health` (index.js
 * GameRoom.fetch, after the switches load): the outer worker forwards no
 * outside path to it, as with `/_room_count`.  Asking it wakes an idle room
 * (one cold start a check): at a monitor's 5 minutes, ~9,000 requests a
 * month, and it writes nothing.
 *
 * Kill switch `roomhealth: false` in the live flags: the room answers 404 and
 * the route passes the 404 on (the outer worker cannot read the room's
 * switches without asking it).  `/health` is unchanged either way.
 */

export const HEALTH = Object.freeze({
  PATH: '/health/room',
  ROOM_PATH: '/_room_health',
  TIMEOUT_MS: 3000,
  /* the tick is set for every 22 ms and slows to ~30 a second under a full
     room (cap-120.md); 5 s without one is a stopped room, never a slow one */
  TICK_LATE_MS: 5000,
  /* a refused put or a newer-save refusal this recent is a problem now */
  PUT_WINDOW_MS: 60000,
  FLAG: 'roomhealth',
});

/** `roomhealth: false` in the live flags (read the lower-case way). */
export function roomHealthOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, HEALTH.FLAG) && !f[HEALTH.FLAG]);
}

/** The room's numbers and what is wrong.  Reads memory only. */
export function roomHealth(room, now) {
  const t = typeof now === 'number' ? now : Date.now();
  let players = 0;
  try { players = typeof room.getPlayerCount === 'function' ? room.getPlayerCount() : 0; } catch (e) { players = 0; }
  const sockets = room.sessions && typeof room.sessions.size === 'number' ? room.sessions.size : 0;
  const ticking = !!room.tickInterval;
  const m = typeof room._roomRowMem === 'function' ? room._roomRowMem() : null;
  const lastTick = m && typeof m.lastTick === 'number' ? m.lastTick : 0;
  const tickAgeMs = lastTick ? Math.max(0, t - lastTick) : null;
  const r = typeof room._savesRefused === 'function' ? room._savesRefused() : { put: 0, newer: 0 };
  const refused = (m && m.refused) || {};
  const recent = (at) => typeof at === 'number' && at > 0 && t - at < HEALTH.PUT_WINDOW_MS;
  const problems = [];
  if (sockets > 0 && !ticking) problems.push('no tick');
  if (ticking && (tickAgeMs === null || tickAgeMs > HEALTH.TICK_LATE_MS)) problems.push('tick late');
  if (recent(refused.putAt)) problems.push('save refused');
  if (recent(refused.newerAt)) problems.push('newer saves refused');
  return {
    ok: problems.length === 0, problems, players, sockets, ticking, tickAgeMs,
    savesRefused: { put: r.put || 0, newer: r.newer || 0 },
  };
}

export const healthMethods = {
  /** GameRoom.fetch's `/_room_health`: up or down, the numbers with the
   *  owner's key, or 404 with the switch thrown. */
  async _roomHealthFetch(request) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    if (roomHealthOff(this)) return new Response(JSON.stringify({ ok: false, error: 'off' }), { status: 404, headers });
    const h = roomHealth(this, Date.now());
    /* v2.3.5601 (mend): the numbers only for the owner's key; a monitor reads up or down */
    let owner = false;
    try {
      owner = !!(request && request.headers && request.headers.get('Authorization') && typeof this._adminAuth === 'function'
        && (await this._adminAuth(request)) === 'ok');
    } catch (e) { owner = false; }
    return new Response(JSON.stringify(owner ? h : { ok: h.ok }), { status: h.ok ? 200 : 503, headers });
  },
};

/** The outer worker's `GET /health/room`: asks the room, TIMEOUT_MS at most.
 *  `request`: the caller's, whose key and address alone go on to the room. */
export async function routeRoomHealth(env, roomName, corsHeaders, request) {
  const headers = Object.assign({}, corsHeaders, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  const say = (status, body) => new Response(JSON.stringify(body), { status, headers });
  let timer = null;
  const late = new Promise((res) => { timer = setTimeout(() => res(null), HEALTH.TIMEOUT_MS); });
  let res = null;
  try {
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomName));
    /* v2.3.5601 (mend): the key (the owner's numbers) and the address (the
       key's lockout; the pace of public reads) -- nothing else of the request */
    const fwd = {};
    for (const k of ['Authorization', 'CF-Connecting-IP']) {
      const v = request && request.headers ? request.headers.get(k) : null;
      if (v) fwd[k] = v;
    }
    res = await Promise.race([stub.fetch(new Request('https://room' + HEALTH.ROOM_PATH, { headers: fwd })), late]);
  } catch (e) {
    res = null;
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res) return say(503, { ok: false, room: 'no answer' });
  if (res.status === 404) return say(404, { ok: false, error: 'off' });
  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }
  if (!body || typeof body !== 'object') return say(503, { ok: false, room: 'no answer' });
  return say(body.ok ? 200 : 503, body);
}
