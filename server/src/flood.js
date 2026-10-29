/* ═══ v2.3.3274: ONE SOCKET CANNOT STOP THE GAME ═══
 *
 * The owner, 2026-10-16, after the anti-bot review (docs/specs/antibot-review.md,
 * "Part 2: bots that attack the game itself"): "start on the urgent five".
 * Each of the five let ONE person, with one script, stop the game for everyone
 * on the free plan's daily limits (100,000 rows written, 13,000 GB-s awake), or
 * run up the paid plan's bill.  Measured in the bot lab
 * (tools/qa/load/bot-lab.mjs `writes`, `roomfill`):
 *
 *   1. A ROW WRITTEN PER MESSAGE, with no limit on how often: 1,000
 *      `chat_mute` (un-muting someone never muted), `stats_update` (a defence
 *      of 10, 11, 10 ...) or `friend_dm` (to a friend who is offline) wrote
 *      1,000 rows each -- 24 to a frame, the day's rows in about 80 s.
 *      Now: nothing is written when nothing changed, and what a player's own
 *      taps may write is PACED (`_paceTake` below): a burst of PACE.RPG.BURST
 *      saves at once, then one every REFILL_MS.  A save past the burst is not
 *      lost -- it is marked `_regenDirty`, and the regen tick's drain arm
 *      (index.js _tickPlayerRegen, REGEN_SAVE_MS) or the close flush writes it,
 *      the same 10 s window the owner already accepted for the pools
 *      (v2.3.1619).  Honest play never meets the burst: thirty equips, stat
 *      changes or cape toggles in five minutes.
 *   2. ANY ROOM NAME MADE A ROOM (`?room=<anything>` on every route), awake and
 *      billed from its first socket.  Now the worker makes only the rooms it is
 *      told to (`roomNameFor`): the main room, plus any name in the `ROOMS`
 *      var -- and anything at all on a local host, so every QA tool and the
 *      owner's `cd server && npx wrangler dev` keep their `?room=qa1`.
 *      (v2.3.3280: the host is request.url's, and with wrangler.toml's
 *      custom-domain route local mode reports the route's, api.brotown.net,
 *      unless wrangler is started with `--local-upstream 127.0.0.1:<port>` --
 *      as harness.mjs and load.mjs now are: TRAPS §181.)
 *   3. NO LIMIT ON MESSAGES PER SOCKET.  Now a budget per socket (FLOOD.MSG_*):
 *      a bucket far above the busiest phone (the quiet phone sends ~30 frames
 *      a second fighting beside someone, docs/specs/quiet-phone.md), a message
 *      past it dropped, and a socket that keeps going closed with CLOSE_FLOOD.
 *   4. THE ROOM'S PLACES HELD BY SOCKETS THAT NEVER JOIN (the cap counts
 *      sockets, and one word every 90 s kept the AFK sweep off), A SECOND JOIN
 *      ON A SOCKET ADDING A PLAYER EACH TIME (the first was never removed), and
 *      SOCKETS PER ADDRESS UNBOUNDED.  Now a socket must join within
 *      JOIN_WINDOW_MS or the sweep closes it; nothing but `join` and `pong` is
 *      taken from a socket that has not joined; a second `join` on a socket
 *      closes it; and one address holds at most IP_SOCKETS places and is let
 *      in at most IP_JOINS_PER_MIN times a minute (CF-Connecting-IP, which
 *      only Cloudflare's edge sets -- a local test has none and is not
 *      counted).  Both address limits are live flags (`ip_sockets`,
 *      `ip_joins_min`; 0 switches one off) for the day a school or a carrier
 *      puts more real players than that behind one address.
 *   5. A FRAME THAT IS JUST `null` threw in the handler (logged by the runtime,
 *      the room carrying on).  Now it is dropped like any other junk.
 *
 * What this does NOT bound, said plainly: a patient attacker with many
 * addresses and free accounts can still spend the free plan's rows at the
 * paced rate (PACE.RPG: ~8,600 a day an account).  The paid plan turns that
 * into a cent; the account check (the Turnstile PR) turns the accounts into
 * work.  Both are the owner's call, written up in the review.
 *
 * In memory only (ARCHITECTURE-HANDOFF rule 11): a deploy resets every
 * bucket, which is right for limits on ephemeral traffic.  Maps keyed by
 * client-chosen strings (CLAUDE.md rule 4).  No new wire event: a refusal is
 * a close code or a silent drop, the v2.3.1134 posture.
 */

export const FLOOD = Object.freeze({
  /* messages a socket may send back-to-back, and the sustained rate after:
     ~4x the busiest honest phone (fighting beside someone, ~30 frames a
     second, a bundle carrying a move, a hit and a pong) */
  MSG_BURST: 300,
  MSG_PER_S: 120,
  /* dropped messages within DROP_WINDOW_MS before the socket is closed --
     a sustained 60 a second past the budget */
  MSG_CLOSE_AFTER: 600,
  DROP_WINDOW_MS: 10000,
  /* a socket that has not sent its join by then is closed by the AFK sweep */
  JOIN_WINDOW_MS: 15000,
  /* places one address may hold, and sockets it may open a minute
     (live flags `ip_sockets` / `ip_joins_min`; 0 = off) */
  IP_SOCKETS: 16,
  IP_JOINS_PER_MIN: 20,
  IP_MAP_CAP: 1024,
  /* close codes: the game's client knows 4003-4010; an unknown code is an
     ordinary reconnect on its backoff, which the address limits then bound */
  CLOSE_JOIN: 4011,    /* a second join on the socket, or none in time */
  CLOSE_FLOOD: 4012,   /* too many messages */
});

export const PACE = Object.freeze({
  /* a player's own taps that save the whole record: equip, unequip, the
     active slot, a stat change, a cape toggle */
  RPG: { BURST: 30, REFILL_MS: 10000 },
  /* the mute list */
  MUTE: { BURST: 10, REFILL_MS: 10000 },
  /* an offer's "let me think" mark */
  THINK: { BURST: 10, REFILL_MS: 10000 },
  /* v2.3.3293: putting a weapon into a trade window, or taking it back out.
     Each is value at rest and stays a durable write (its escrow record, the
     stash, the refund's stamp: ~2.5 rows a message), so it is the messages
     that are paced, not the writes: past the burst a stage or unstage is
     refused.  A trade holds at most TRADE2.WEAPON_MAX (4) a side, so twelve
     covers any real one with room to change your mind (trade2.js). */
  T2WPN: { BURST: 12, REFILL_MS: 20000 },
  /* v2.3.3527: the title on your card (achievements.js _achvTitle): one row
     a change; past the burst a change is refused and the page told what
     stands */
  ACHVT: { BURST: 10, REFILL_MS: 10000 },
  /* v2.3.3785: a move in or out of the Bank's vault (bank.js): two rows a
     move (the bag or purse, and the vault).  Thirty covers emptying a full
     bag into it in one go; past that a move is refused 'busy' and the window
     says so */
  BANK: { BURST: 30, REFILL_MS: 20000 },
  /* unread messages one sender may leave in an offline friend's box; past
     that a line is dropped, not written (the box keeps the last
     FRIENDS.DM_BACKLOG_MAX in all) */
  DM_PER_SENDER_BOX: 20,
  MAP_CAP: 2048,
});

export const ROOMS = Object.freeze({
  MAIN: 'brotown-1',
  LOCAL_HOSTS: new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']),
});

/** The room a request may reach, or null for one the worker does not make.
 *  `?room=` names it, the main room when absent (it used to be a stray
 *  'brotown', which no client ever asked for); on a local host any name,
 *  elsewhere only the main room and the names `env.ROOMS` lists
 *  (comma-separated, wrangler.toml [vars]). */
export function roomNameFor(url, env) {
  const asked = String(url.searchParams.get('room') || '').trim();
  const name = asked || ROOMS.MAIN;
  if (ROOMS.LOCAL_HOSTS.has(url.hostname)) return name;
  if (name === ROOMS.MAIN) return name;
  const listed = String((env && env.ROOMS) || '').split(',').map((s) => s.trim()).filter(Boolean);
  return listed.includes(name) ? name : null;
}

/** The address Cloudflare's edge stamped on the request, or null: absent
 *  locally (wrangler dev adds none), and loopback is never counted. */
export function requestIp(request) {
  let ip = null;
  try { ip = request && request.headers && request.headers.get('CF-Connecting-IP'); } catch (e) { ip = null; }
  if (!ip || typeof ip !== 'string') return null;
  ip = ip.trim();
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  return ip.slice(0, 64);
}

export const floodMethods = {
  /* ── 3. the budget per socket ── */
  /** 'ok' to take the message, 'drop' to ignore it, 'close' to end the socket. */
  _floodMsgOk(session, now) {
    if (session.msgTokens === undefined) { session.msgTokens = FLOOD.MSG_BURST; session.msgAt = now; }
    session.msgTokens = Math.min(FLOOD.MSG_BURST,
      session.msgTokens + Math.max(0, now - session.msgAt) / 1000 * FLOOD.MSG_PER_S);
    session.msgAt = now;
    if (session.msgTokens >= 1) { session.msgTokens -= 1; return 'ok'; }
    if (!session.msgDropAt || now - session.msgDropAt > FLOOD.DROP_WINDOW_MS) { session.msgDropAt = now; session.msgDropped = 0; }
    session.msgDropped = (session.msgDropped || 0) + 1;
    return session.msgDropped > FLOOD.MSG_CLOSE_AFTER ? 'close' : 'drop';
  },

  /** Close a socket the room is done with: the AFK sweep's own three steps
   *  (tick.js), so the session is gone whatever the runtime does next. */
  _floodClose(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) {}
    try {
      const p = this.webSocketClose(ws);
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
    this.sessions.delete(ws);
  },

  /* ── 4. the door ── */
  /** A socket that never joined, past its window?  (Sessions a test makes by
   *  hand carry no `openedAt` and are never swept by this.) */
  _floodNoJoin(session, now) {
    return !session.id && typeof session.openedAt === 'number' && now - session.openedAt > FLOOD.JOIN_WINDOW_MS;
  },

  /** May this address open one more socket now?  Counts the sockets it
   *  holds and the ones it opened in the last minute. */
  _floodIpOk(ip, now) {
    if (!ip) return true;
    const maxSockets = this._flagNum ? this._flagNum('ip_sockets', FLOOD.IP_SOCKETS, 0, 1000) : FLOOD.IP_SOCKETS;
    if (maxSockets > 0) {
      let held = 0;
      for (const [, s] of this.sessions) if (s.ip === ip) held++;
      if (held >= maxSockets) return false;
    }
    const maxJoins = this._flagNum ? this._flagNum('ip_joins_min', FLOOD.IP_JOINS_PER_MIN, 0, 10000) : FLOOD.IP_JOINS_PER_MIN;
    if (maxJoins > 0) {
      if (!this._ipOpens) this._ipOpens = new Map();
      let list = this._ipOpens.get(ip);
      if (list) {
        list = list.filter((t) => now - t < 60000);
        if (list.length >= maxJoins) { this._ipOpens.set(ip, list); return false; }
      } else {
        list = [];
        if (this._ipOpens.size >= FLOOD.IP_MAP_CAP) {
          for (const [k, v] of this._ipOpens) {
            if (!v.length || now - v[v.length - 1] >= 60000) this._ipOpens.delete(k);
            if (this._ipOpens.size < FLOOD.IP_MAP_CAP) break;
          }
          if (this._ipOpens.size >= FLOOD.IP_MAP_CAP) this._ipOpens.delete(this._ipOpens.keys().next().value);
        }
      }
      list.push(now);
      this._ipOpens.set(ip, list);
    }
    return true;
  },

  /* ── 1. pacing what a player's own taps may write ── */
  _paceMap() {
    if (!this._paceBuckets) this._paceBuckets = new Map();
    return this._paceBuckets;
  },
  _paceBucket(lane, pid, cfg, now) {
    const map = this._paceMap();
    const key = lane + ':' + pid;
    let b = map.get(key);
    if (!b) {
      if (map.size >= PACE.MAP_CAP) {
        for (const [k, v] of map) { if (!v.pending) { map.delete(k); break; } }
        if (map.size >= PACE.MAP_CAP) map.delete(map.keys().next().value);
      }
      b = { tokens: cfg.BURST, at: now, pending: null, timer: null };
      map.set(key, b);
    }
    const gained = Math.floor((now - b.at) / cfg.REFILL_MS);
    if (gained > 0) {
      b.tokens = Math.min(cfg.BURST, b.tokens + gained);
      b.at = b.tokens >= cfg.BURST ? now : b.at + gained * cfg.REFILL_MS;
    }
    return b;
  },
  /** Take one token from the lane's bucket: true to go now, false to wait. */
  _paceTake(lane, pid, cfg) {
    const b = this._paceBucket(lane, pid, cfg, Date.now());
    if (b.tokens >= 1) { b.tokens -= 1; return true; }
    return false;
  },
  /** Run `run` now if the lane has a token, else hold it (the LATEST held
   *  run wins -- each writes the whole current document) and run it when the
   *  next token comes, or at `_paceFlush`.  Returns whether it ran now. */
  _paced(lane, pid, cfg, run) {
    const now = Date.now();
    const b = this._paceBucket(lane, pid, cfg, now);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      b.pending = null;
      if (b.timer) { clearTimeout(b.timer); b.timer = null; }
      try { run(); } catch (e) {}
      return true;
    }
    b.pending = run;
    if (!b.timer) {
      const wait = Math.max(50, cfg.REFILL_MS - (now - b.at));
      b.timer = setTimeout(() => {
        b.timer = null;
        b.at = Date.now();
        const held = b.pending;
        b.pending = null;
        if (held) { try { held(); } catch (e) {} }
      }, wait);
    }
    return false;
  },
  /** A player is leaving: whatever is held for them is written now. */
  _paceFlush(pid) {
    if (!this._paceBuckets || !pid) return;
    const suffix = ':' + pid;
    for (const [k, b] of this._paceBuckets) {
      if (!k.endsWith(suffix)) continue;
      if (b.timer) { clearTimeout(b.timer); b.timer = null; }
      const held = b.pending;
      b.pending = null;
      if (held) { try { held(); } catch (e) {} }
      this._paceBuckets.delete(k);
    }
  },
  /** The record save a player's own tap asks for (equip, a stat, a cape):
   *  now while the burst lasts, else within REGEN_SAVE_MS through the regen
   *  tick's drain arm (or the close flush) -- `_regenDirty` is how both
   *  know there is something to write. */
  _saveRpgPaced(playerId, ps) {
    if (!playerId || !ps) return false;
    if (this._paceTake('rpg', playerId, PACE.RPG)) { this._saveRpg(playerId, ps); return true; }
    ps._regenDirty = true;
    return false;
  },
};
