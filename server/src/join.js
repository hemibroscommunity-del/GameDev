/* ═══ v2.3.1173 (P4 decomposition): JOIN BOOTSTRAP extracted from
 * index.js ═══
 *
 * Behavior-frozen hoist of the webSocketMessage `case 'join'` body --
 * the largest single block left in the router -- plus the v2.3.1116
 * persistent-identity pair it gates on (_phraseHash /
 * _verifyJoinAuth; auth records live in their own 'auth:<id>' key,
 * never inside the rpg blob).  Everything verbatim: the auth +
 * operator-freeze gates, the v2.3.702 same-id session eviction, the
 * stored-wins/bootstrap-caps rpg load (strict weapon sanitize on
 * client blobs), the v2.3.1152 boundary heal, inbox drain, dungeon
 * re-attach, and the state_sync/zone snapshot + caps advertisement
 * (the deploy-order safety surface -- see docs/WIRE-PROTOCOL.md).
 * The switch case now delegates: `await this._handleJoin(...)`. */

import { healLifeSkills } from './migrations.js';
import { t2ReplayFlat } from './data.js';
import { prog3FromLegacy } from './prog3.js';

/* ═══ v2.3.1627: the JOIN DATA ALLOWLIST ═══
 *
 * `_handleJoin` used to build authoritative state as
 * `{ ...defaults, ...msg.data }` and set `session.data = msg.data`.
 * The explicit ingest below re-assigns only the rpg*-derived keys, so
 * EVERY other field a client invented survived verbatim into
 * `playerState` -- and, because `getAllPlayerData()` (index.js) spreads
 * `...s.data` LAST, into the state_sync every other player receives,
 * where it shadowed the server's own values.
 *
 * That made `join` a bigger write primitive than `track` ever was.  The
 * worst instance: `_zoneEntryGraceUntil`, which `_applyDamage`
 * (combat.js -- "the ONE place player hp goes down") reads to
 * short-circuit damage to zero.  A single join carrying a far-future
 * stamp bought PERMANENT immunity to monsters, all PvP, duels, arena
 * matches and dungeon bosses, on an id needing no passphrase (rule 21's
 * legacy-client path).  It also forged `ps.bro`, the Hemi Bro ownership
 * badge that broverify.js documents in three places as server-owned.
 *
 * This is v2.3.1465's `track` remedy applied one message earlier, and
 * deliberately in the same SHAPE: an ALLOWLIST, iterated as a fixed set
 * rather than over the client's own keys.  An unreviewed field is
 * DROPPED, not trusted -- and '__proto__' can never be written, because
 * we never iterate a client-chosen key (TRAPS #6 avoided structurally,
 * not by a guard someone can forget).
 *
 * A denylist of today's known internals was rejected: it closes the
 * instances we happen to know about and re-opens the moment anyone adds
 * a new `ps` field, which is exactly the failure mode TRAPS #13 records.
 *
 * Contents mirror what the live client actually sends in join.data
 * (wsClient.js): presence + the cosmetic block.  The bootstrap values
 * all use the `rpg*` prefix and are admitted by pattern below -- that
 * namespace is DISJOINT from the authoritative one on purpose (the same
 * disjointness TRACK_COSMETIC_KEYS relies on: `rpgLv`/`rpgHp`, never
 * `level`/`hp`), so no rpg* key can collide with a real ps field.
 * Cosmetics overlap TRACK_COSMETIC_KEYS in index.js; join carries
 * `eqst` in addition, and does not carry mask/cape/pet. */
const JOIN_PRESENCE_KEYS = ['x', 'y', 'd', 'z'];
const JOIN_COSMETIC_KEYS = [
  'name', 'color', 'avatar',
  'bt', 'bl', 'hw', 'fh', 'hr', 'sk', 'hc', 'htc', 'fhc', 'st', 'stc',
  'ec',   /* v2.3.1930: eye colour -- see the note in index.js */
  /* v2.3.1939: the player's drawn shirt, front and back.  Exactly 256 hex
     characters each (16x16, one char per cell) -- see the cap below, which has
     to admit them: the flat 64 would truncate a drawing into an invalid string
     and the print would silently never appear. */
  /* v2.3.1940: the drawn pants print (`pa`) and the chest tattoo (`ta`).  Same
     shape, same cap, same reasoning. */
  /* v2.3.1949: the face (`tf`) and arm (`tm`) tattoos.  Same shape and cap
     again.  `tm` rather than `ta`+suffix because these are two-letter keys by
     convention and `ta` was taken by the chest. */
  /* v2.3.2043: `tb` is the BACK OF THE HEAD -- the face canvas's other side,
     matching what `sb` is to `sa`. Same 256-char shape, same cap. */
  /* v2.3.2148: `tr` is the BACK OF THE BODY -- the chest/torso canvas's other
     side, exactly as `sb` is to `sa` and `tb` is to `tf`. NOT `tb`: that is
     already the back of the HEAD (v2.3.2043), so the obvious letter was taken
     and `tr` (tattoo, rear) is the next unambiguous one. Same 256-char shape,
     same cap, and added to BOTH gates and DRAWING_KEYS in this one change --
     v2.3.1939 put a drawing key in one gate and not the other and the print
     appeared on join then vanished on the first relay. */
  'sa', 'sb', 'pa', 'ta', 'tf', 'tm', 'tb', 'tr',
  /* v2.3.1941: clothing patterns -- a tile id and a palette index, e.g.
     "stripe-v:3".  Short, so unlike the drawings above they sit inside the flat
     64-char cap with room to spare and need no special case. */
  'sp', 'pp', 'fp',
  /* v2.3.1953: height and frame -- short catalog ids, well inside the flat cap.
     See the note in index.js's TRACK_COSMETIC_KEYS for why a forged value is
     inert. */
  'hg', 'fr',
  'eqc', 'eql', 'eqs', 'eqst', 'pt', 'sh', 'bs', 'wpnMat', /* v2.3.1760 */
];
/* v2.3.1940: THE DRAWING KEYS, IN ONE PLACE.  These are the cosmetics whose
   value is a fixed 256-character grid rather than a short id, so they need the
   larger cap in BOTH gates -- the join sanitiser here and the `track` handler in
   index.js.  v2.3.1939 shipped with those two caps spelled out separately and
   the second one was missed, which truncated every drawing to 64 characters on
   the live-update path: the client's sanitiser rejects anything that is not
   exactly 256 hex characters, so peers saw the print appear on join and vanish
   two seconds later.  index.js imports this rather than repeating it. */
export const DRAWING_KEYS = new Set(['sa', 'sb', 'pa', 'ta', 'tf', 'tm', 'tb', 'tr']);   /* v2.3.2043: +tb; v2.3.2148: +tr, the back of the body */
/** Cap for one cosmetic key: drawings and avatars get the large bound. */
export function cosmeticCap(k) { return (k === 'avatar' || DRAWING_KEYS.has(k)) ? 512 : 64; }
/* ═══ v2.3.1970: THE TOP-LEVEL `name` WAS THE ONE THAT GOT AWAY ═══
 *
 * A join carries the display name TWICE: `msg.data.name`, which goes
 * through _sanitizeJoinData and is capped at cosmeticCap('name') = 64,
 * and the top-level `msg.name`, which went straight into
 * `session.name = msg.name || 'Anon'` with no type check, no cap and no
 * control-char strip.  That is the copy the room actually publishes:
 *   - getAllPlayerData() (index.js) builds every state_sync entry as
 *     `{...playerState, name: s.name, ...s.data}`, so an attacker who
 *     simply OMITS data.name leaves the raw one standing;
 *   - _reportToLeaderboard PREFERS it (`session.name || session.data?.name`),
 *     so it is the name on the global hiscores board unconditionally;
 *   - the death-drop pile's ownerName and the party/friends name
 *     fallbacks read it too.
 * The client renders a peer's name into a PIXI Text nameplate with no
 * wrap and no clamp (entityRenderer `display._nameText.text = nextName`),
 * so an unbounded name is not cosmetic: it is a texture wider than any
 * iOS GPU will allocate, painted over that player's head on EVERY other
 * screen in the room, and it persists — unlike a chat bubble it does not
 * age out after 5 s.  The creator's own input has maxLength 20, so
 * nothing honest is anywhere near this bound; the gap was purely that
 * the wire field nobody re-read was trusted (TRAPS #13: audit by what a
 * handler WRITES, not by which era it came from).
 *
 * Same shape as every other text lane in this server — clamp the RAW
 * length first so padding cannot smuggle a long line past the trim,
 * strip control chars (a newline in a name breaks the leaderboard row
 * and the nameplate alike), and fall back rather than admit empty. */
export function sanitizeDisplayName(v) {
  if (typeof v !== 'string') return 'Anon';
  const s = v.slice(0, cosmeticCap('name')).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
  return s || 'Anon';
}
/* rpg* bootstrap seeds: admitted by prefix, then re-read and clamped by
 * the explicit ingest in _handleJoin (stored-wins on every reconnect).
 * Anchored + capitalised so a crafted 'rpg' or 'rpgo' can't sneak in. */
const JOIN_RPG_PREFIX_RE = /^rpg[A-Z][A-Za-z0-9]*$/;
/* v2.3.1629: ceiling on a single rpg* container value.
 * SIZED AGAINST THE FRAME GATE, deliberately.  v2.3.1618 caps the whole
 * inbound frame at MAX_INBOUND_BYTES = 16 KB (index.js), which is the
 * primary bound and already makes a megabyte-scale join impossible --
 * this guard was first written at 64 KB, which no frame can ever reach,
 * i.e. dead code.  At 8 KB it actually binds: it stops ONE rpg* key
 * eating the entire frame budget, and it is still generous next to the
 * real payloads (a full weaponStash at cap plus inventory plus the quest
 * maps sit in the low kilobytes).  Defence in depth, not the main gate:
 * if MAX_INBOUND_BYTES is ever raised, this keeps a single value from
 * scaling with it. */
const JOIN_RPG_MAX_BYTES = 8 * 1024;

/* ═══ v2.3.1982: THE ROOM-FULL REFUSAL ═══
 *
 * Measured by the headless capacity campaign and left unfixed: at the
 * MAX_PLAYERS ceiling the 61st player's socket got a bare `503 Room
 * full` from the DO's fetch(), BEFORE the WebSocket upgrade.  A failed
 * handshake carries no body a browser will show and no close code, so
 * wsClient saw it as an ordinary connection failure, fell into the
 * generic reconnect backoff, and retried every 10s forever behind a
 * loading screen that never said why.  The player cannot tell a full
 * world from a broken game, and cannot tell whether waiting helps.
 *
 * So the refusal becomes a real answer on the wire, in the same shape
 * every other join refusal already uses (`join_rejected` + a 4xxx close
 * code, below): a `room_full` message carrying the numbers, then close
 * 4009.  BOTH halves are the signal on purpose -- if the message is lost
 * the close code alone still says "full", and if the close code is
 * mangled the message alone does.
 *
 * DEPLOY-ORDER SAFETY (handoff rule 19), and why the gate is a QUERY
 * PARAM rather than a caps flag.  caps ride in `state_sync`, which a
 * refused joiner by definition never receives -- there is no session to
 * advertise into.  The client therefore opts IN on the URL (`?rf=1`,
 * wsClient.js) and the two directions come out safe:
 *   - NEW client + OLD worker: the param is ignored, the handshake fails
 *     as it always did, and the client falls back to today's silent
 *     retry (it only paints the screen on an explicit signal).
 *   - OLD client + NEW worker: no `rf=1`, so it gets the byte-identical
 *     503 it got before.  This half is not cosmetic: an old client that
 *     received `join_rejected` with an unknown reason would set
 *     `_joinRejectedFatal` and stop retrying ALTOGETHER (v2.3.1181),
 *     which is strictly worse than the silent loop.  That is exactly why
 *     this is a NEW type on an opt-in channel and not a new
 *     `join_rejected` reason.
 *
 * The cap is not raised here and should not be: 60 players cost the
 * worker 0.16ms of a 22ms tick, so nothing on the server is straining.
 * The binding constraint is the RECEIVER -- ~4KB/s of download per
 * co-located moving peer on a phone.  Sixty is a bandwidth number.     */
const ROOM_FULL = {
  /* What we ask the client to wait between attempts.  Sent on the wire so
     a future worker can slow the herd down without a client deploy; the
     client clamps it (never trust a wire number).  FIXED, not exponential
     -- see the client's _roomFullRetry for the reasoning. */
  RETRY_MS: 5000,
  CLOSE_CODE: 4009,
};

export const joinMethods = {
  /* v2.3.1982: the live admission ceiling.  `max_players` is a live-ops
     value flag (liveops.js), clamped [1, MAX_PLAYERS] at READ time, so
     the operator can throttle a room DOWN for a demo -- or a headless
     test can drive it to 1 -- without ever being able to push it ABOVE
     the bandwidth-derived ceiling.  Synchronous like every other
     _flagNum read; fetch() awaits _liveFlagsEnsure before calling it. */
  _roomCap() {
    return this._flagNum('max_players', this.MAX_PLAYERS, 1, this.MAX_PLAYERS);
  },

  /* The answer to a joiner we have no room for.  Returns a Response; the
     caller returns it straight out of fetch().  NOTE what it does NOT do:
     it never touches this.sessions, so a refused socket cannot itself
     push the room over the cap, and the DO's hibernation handlers
     (webSocketMessage/Close) are never wired to it -- `accept()` rather
     than `state.acceptWebSocket()` keeps this socket outside the room's
     bookkeeping entirely. */
  _roomFullRefusal(url) {
    const cap = this._roomCap();
    /* Old clients (and anything that isn't our client) keep the exact
       refusal they have always had. */
    if (!url || url.searchParams.get('rf') !== '1') {
      return new Response('Room full', { status: 503 });
    }
    const payload = {
      type: 'room_full',
      /* `reason` mirrors join_rejected's field so the client's refusal
         handling reads the same way for both. */
      reason: 'full',
      /* SOCKETS, not getPlayerCount().  The cap counts sockets, and a
         connection that has not sent its `join` yet is a player walking
         through the door — it is holding the seat this joiner wants.
         getPlayerCount() (joined players only) would tell someone we
         just turned away that the world has 59 of 60 people in it, which
         reads as a bug in the refusal rather than as a full world. */
      count: this.sessions.size,
      cap,
      retryMs: ROOM_FULL.RETRY_MS,
    };
    const [client, server] = Object.values(new WebSocketPair());
    try {
      server.accept();
      server.send(JSON.stringify(payload));
      server.close(ROOM_FULL.CLOSE_CODE, 'room full');
    } catch (e) {
      /* If the upgrade could not be completed there is nothing to say on
         it; the 503 is still a truthful answer. */
      return new Response('Room full', { status: 503 });
    }
    return new Response(null, { status: 101, webSocket: client });
  },

  /* v2.3.1627: build a clean copy of join.data.  Never mutates the
     caller's object, never iterates client keys, and drops anything not
     named above.  `z` is additionally validated against the zone
     allowlist (_validZone, movement.js) -- an unlisted zone id here
     reaches _ensureZoneMonsters exactly as it does from `move`, so the
     room-wide monster-AI outage (v2.3.1625) is joinable too. */
  _sanitizeJoinData(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const k of JOIN_PRESENCE_KEYS) {
      const v = raw[k];
      if (v === undefined || v === null) continue;
      if (k === 'x' || k === 'y') {
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      } else if (k === 'z') {
        if (this._validZone(v)) out.z = v;
      } else if (typeof v === 'string' && v.length <= 16) {
        out[k] = v;
      }
    }
    for (const k of JOIN_COSMETIC_KEYS) {
      const v = raw[k];
      if (v === undefined || v === null) continue;
      /* Cosmetics are strings the client renders back at peers; cap the
         length so one join can't push an unbounded blob into every
         other player's state_sync.
         v2.3.1629: TRUNCATE, never drop -- and `avatar` gets its own
         much larger bound.  The flat 64-char DROP silently removed the
         avatar of every verified Hemi Bro holder, because S.myAvatar is
         a wsrv.nl proxy URL whose prefix and suffix alone are ~52 chars
         and which runs 150-250 in practice: they rendered as a generic
         body in the state_sync every joiner receives, until their first
         2 s `track` relay healed it.  A silent drop is the wrong shape
         for a cosmetic anyway -- a truncated string degrades visibly,
         a missing one looks like the feature is broken. */
      /* v2.3.1939: the drawings join `avatar` above the flat 64.  They are a
         fixed 256 chars and a truncated one is not a shorter drawing, it is an
         invalid one -- the client's sanitiser rejects any string that is not
         exactly 256 hex characters, so a 64-char cut means no print at all
         rather than a degraded one.  512 keeps them inside the same bound
         `avatar` already established. */
      const _cap = cosmeticCap(k);
      if (typeof v === 'string') out[k] = v.length > _cap ? v.slice(0, _cap) : v;
      else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    /* rpg* seeds: copy by pattern from the client's OWN keys, but only
       own properties, and never the magic names (belt to the regex's
       braces -- '__proto__' cannot match JOIN_RPG_PREFIX_RE anyway). */
    for (const k of Object.getOwnPropertyNames(raw)) {
      if (!JOIN_RPG_PREFIX_RE.test(k)) continue;
      const v = raw[k];
      if (v === undefined) continue;
      /* v2.3.1629: bound the VALUE, not just the key.  The pattern
         branch used to copy whatever the client sent, so a phraseless
         join (rule 21's legacy path, no passphrase) could park a
         multi-megabyte array on playerState under e.g. rpgWeaponStash
         -- and playerState is spread into the state_sync EVERY
         subsequent joiner receives, which is exactly the blob channel
         the cosmetic cap above exists to close.  The explicit ingest
         below re-reads and clamps each of these properly; this is only
         the size guard that stops the raw copy being a weapon.
         Cheap structural bound: scalars pass, containers are capped by
         serialized size. */
      const t = typeof v;
      if (v === null || t === 'number' || t === 'string' || t === 'boolean') {
        if (t === 'string' && v.length > 4096) continue;
        out[k] = v;
        continue;
      }
      if (t !== 'object') continue;             // functions/symbols: drop
      let approx = 0;
      try { approx = JSON.stringify(v).length; } catch { continue; } // cyclic: drop
      if (approx > JOIN_RPG_MAX_BYTES) continue;
      out[k] = v;
    }
    return out;
  },

  /* ═══ v2.3.1116: PERSISTENT IDENTITY (PR1 of the heavy-systems plan) ═══
   * The auth record lives in its OWN storage key ('auth:<id>'), NOT inside
   * the rpg blob -- _saveRpg rewrites the blob from a fixed field list and
   * would silently drop any extra field on the next save. */

  // SHA-256 hex of the passphrase, domain-separated with a version prefix
  // so the scheme can rotate ('btv2|...') without ambiguity.  The digest
  // is compared with === : a timing leak on a hash comparison doesn't help
  // recover a preimage, and the real online risk (join-spam brute force of
  // the ~6x10^8 phrase space) is handled by the lockout below.
  async _phraseHash(phrase) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('btv1|' + phrase));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  async _verifyJoinAuth(id, phrase) {
    const now = Date.now();
    if (!this._authFails) this._authFails = new Map(); // in-memory: a deploy reset just clears lockouts
    const rec = this._authFails.get(id);
    if (rec && rec.until > now) return false; // lockout window active
    const auth = await this.state.storage.get('auth:' + id);
    if (!auth) {
      // Unregistered id.  Register when the client proves it owns a
      // phrase; otherwise allow as a legacy/guest throwaway.  Ids that
      // predate this slice (random per-pageload) are unknowable and
      // valueless, so grandfathering them unauthenticated is safe --
      // and every post-slice client sends a phrase, so real characters
      // get locked at their first join.
      if (phrase) {
        await this.state.storage.put('auth:' + id, { pfHash: await this._phraseHash(phrase), createdAt: now });
      }
      return true;
    }
    if (phrase && (await this._phraseHash(phrase)) === auth.pfHash) {
      this._authFails.delete(id);
      return true;
    }
    // Failed verify: count toward the brute-force lockout (5 fails ->
    // 60s).  Keyed by target id, so an attacker hammering someone's id
    // locks the ATTACK out; the owner's correct phrase clears it.
    const f = this._authFails.get(id) || { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= 5) { f.until = now + 60000; f.count = 0; }
    this._authFails.set(id, f);
    return false;
  },

  /* v2.3.1814: read the character record, or write it on first join.
     Split out as the test seam (the join handler is not callable in
     isolation), and deliberately tiny: this is the only place that decides
     whether a look is yours already or is being claimed now.

     Returns the record, or null when there is nothing to store — a join
     carrying no cosmetics at all (a v1/legacy client, or a reconnect that
     dropped them) must NOT lock an empty look in, because that would make a
     blank character permanent and there is no way back from permanent. */
  async _loadOrCreateCharacter(id, cleanJoinData) {
    const stored = await this.state.storage.get('char:' + id);
    if (stored && stored.look) return stored;
    const look = Object.create(null);   /* proto-safe: keys are OURS (the allowlist), but the map is id-adjacent */
    let any = false;
    for (const k of JOIN_COSMETIC_KEYS) {
      if (k === 'name') continue;       /* name is a top-level field, not part of the look */
      if (cleanJoinData[k] === undefined) continue;
      look[k] = cleanJoinData[k]; any = true;
    }
    if (!any) return null;
    /* v2.3.1814: A NAMELESS JOIN NEVER CREATES A CHARACTER.
       The `any` check above is not enough on its own and the reason is
       worth keeping: body colours are sent on every join, including one
       made before the player has chosen anything, so `any` is true for a
       connection that opened behind a pre-game screen.  The client no
       longer opens one (wsClient gates on `preGame`), and this is the
       second lock on the same door — because the failure it prevents is
       a blank character made permanent, and permanent means there is no
       way back from it.  Every real creation passes a name: joinTown
       falls back to 'Anon' rather than to empty. */
    const name = typeof cleanJoinData.name === 'string' ? cleanJoinData.name.trim() : '';
    if (!name) return null;
    const rec = { name, look, createdAt: Date.now() };
    await this.state.storage.put('char:' + id, rec);
    return rec;
  },

  async _handleJoin(session, ws, msg) {
    // v2.3.1202: prototype-pollution join-id gate.  session.id below is
    // CLIENT-CHOSEN, and it keys plain-object maps all over the room
    // (playerState, stateHistory, extractions, per-monster dmgByPlayer).
    // A join id of '__proto__' writes through Object.prototype and
    // corrupts the root player map -- the same bug family already fixed
    // three times downstream (duel.away v2.3.1175, party meta
    // v2.3.1185, amulet tiers v2.3.1192).  Kill it at the SOURCE: the
    // three magic own-property names are rejected outright, BEFORE the
    // auth gate so a magic id can never mint an 'auth:' storage record
    // either.  Legit ids are 'bp_<hash>' or legacy randoms -- no real
    // client ever generates these names, so reason:'auth' (which makes
    // the client regenerate its passphrase once) is the right answer.
    // Legacy phraseless joins on OTHER ids stay allowed (handoff rule
    // 21).  The maps themselves are Object.create(null) as of this
    // version too (defense-in-depth), but new plain-object maps keep
    // appearing -- the gate is what protects the ones nobody audited.
    if (msg.id === '__proto__' || msg.id === 'constructor' || msg.id === 'prototype') {
      try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'auth' })); } catch {}
      try { ws.close(4003, 'auth'); } catch {}
      this.sessions.delete(ws);
      return;
    }
    // v2.3.1116: identity auth gate.  Runs BEFORE the eviction loop
    // below on purpose -- player ids are broadcast to the whole room
    // (player_join / state_sync), so before this gate existed anyone
    // could read a victim's id off the wire, join with it, evict
    // their live session, AND own their stored progress.  Rules:
    //   - id with a stored auth record: the join must carry the
    //     matching passphrase or it's rejected without touching the
    //     existing session or playerState.
    //   - unregistered id: allowed through (v1 / legacy clients never
    //     send a phrase -- the deploy-order safety property), and the
    //     auth record is stamped when a phrase IS provided, locking
    //     the id from then on.
    if (msg.id) {
      const _authOk = await this._verifyJoinAuth(msg.id, typeof msg.phrase === 'string' ? msg.phrase : null);
      if (!_authOk) {
        try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'auth' })); } catch {}
        try { ws.close(4003, 'auth'); } catch {}
        this.sessions.delete(ws);
        return;
      }
      // v2.3.1148: operator freeze gate.  Storage await keeps the
      // input gate closed (rule 9).  reason:'frozen' is load-bearing
      // on the client: 'auth' mints a fresh identity, 'frozen' must
      // NOT (wsClient.js join_rejected handler) or freezing would
      // just push the player onto a new character.
      const _frozen = await this.state.storage.get('frozen:' + msg.id);
      if (_frozen) {
        try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'frozen' })); } catch {}
        try { ws.close(4004, 'frozen'); } catch {}
        this.sessions.delete(ws);
        return;
      }
    }
    // v2.3.702: EVICT any lingering session with the same player id.
    // A reconnect (worker-deploy bounce, iOS tab suspend/resume)
    // re-joins with the same stable passphrase id while the old
    // socket can sit in this.sessions until TCP close or the 2-min
    // AFK sweep.  _wsBySessionId returned the FIRST match -- the
    // corpse -- so every direct-to-player send (lifesteal_credit,
    // combat_credit, harvest_credit, and the synchronous post-heal
    // player_state push) black-holed for up to two minutes.  This
    // is the thrice-recurring "lifesteal broke client-side /
    // missing id" incident (v2.3.462, v2.3.25x, v2.3.701).
    if (msg.id) {
      for (const [oldWs, oldS] of this.sessions) {
        if (oldS.id === msg.id && oldWs !== ws) {
          this.sessions.delete(oldWs);
          try { oldWs.close(1000, 'superseded by reconnect'); } catch {}
        }
      }
    }
    session.id = msg.id;
    /* v2.3.1970: see sanitizeDisplayName above -- this is the copy the
       state_sync nameplate and the hiscores row are built from. */
    session.name = sanitizeDisplayName(msg.name);
    /* v2.3.1627: sanitize ONCE, here, and use the clean copy for both
       consumers.  session.data must be the filtered object too, not
       just the playerState spread below: getAllPlayerData() (index.js)
       spreads `...s.data` LAST over playerState, so a field left in
       session.data would still override authoritative values in the
       state_sync every joiner receives -- the same three-consumer shape
       the v2.3.1465 `track` comment documents. */
    const cleanJoinData = this._sanitizeJoinData(msg.data);
    /* ═══ v2.3.1814: THE CHARACTER RECORD — NAME AND LOOK ARE PERMANENT ═══
       Owner: "character selections in terms of names and traits picked
       during login should be permanent.  When you load a character using the
       key it should just bring you into the game."

       Until now a character's appearance lived only in the CLIENT's trait
       catalogs and was re-sent on every join.  Two things followed from
       that, both of which the owner is asking to end: the look was reset by
       a reload (which is why the creator ran every single time), and it was
       never yours in any durable sense — the key restored your progress and
       left your face behind on the old device.

       So the look is stored server-side against the identity, exactly like
       `auth:`, and with the same first-write-wins posture:
         - a stored record WINS over whatever the client sends, which is
           what "permanent" has to mean on an authoritative server.  A hand-
           edited join payload cannot restyle a character.
         - no record yet means this join is the character's creation, and
           what it carries is locked in.
       Both branches go through the SAME allowlisted copy the wire already
       produces, so nothing new is trusted.

       Guests (no phrase, no bp_ id) are skipped: they are throwaways by
       definition and have nothing to make permanent. */
    const _charId = (typeof msg.id === 'string' && msg.id.indexOf('bp_') === 0) ? msg.id : null;
    if (_charId) {
      session.char = await this._loadOrCreateCharacter(_charId, cleanJoinData);
      if (session.char) {
        /* Stored look wins.  Applied onto the sanitized copy so every
           downstream reader — playerState, peer broadcast, state_sync —
           sees one consistent character with no second code path. */
        for (const k of JOIN_COSMETIC_KEYS) {
          if (session.char.look[k] !== undefined) cleanJoinData[k] = session.char.look[k];
        }
        if (session.char.name) {
          cleanJoinData.name = session.char.name;
          /* v2.3.1970: and the SESSION name follows the record too.  The
             stored name already won for the nameplate (getAllPlayerData
             spreads `...s.data` last), but session.name is a separate
             copy and _reportToLeaderboard prefers it -- so a hand-edited
             join could stand on the board under one name while its
             nameplate showed the permanent one.  "Names are permanent"
             (v2.3.1814, owner directive) has to mean everywhere the name
             is published, not just the one reader that happened to be
             ordered correctly. */
          session.name = sanitizeDisplayName(session.char.name);
        }
      }
    }
    session.data = cleanJoinData;
    // Protocol v2 opt-in.  v2 sessions get delta player_state emits,
    // per-entity monster/node tick deltas, and the merged zone_state
    // message on zone change.  Anything else (older clients) stays
    // on v1 full payloads.
    session.protocolVersion = msg.protocolVersion === 2 ? 2 : 1;
    session.lastPlayerStateSent = {};
    // v2.3.1178: mint this session's HTTP economy-endpoint token
    // (delivered in state_sync below; validated by _httpAuthCheck --
    // see httpauth.js).  After the eviction loop above so exactly one
    // live token exists per player id.
    this._httpAuthMint(session, msg);
    this.playerState[msg.id] = {
      x: 0, y: 0, d: 'down', z: 'town', vx: 0, vy: 0,
      dodging: false, blocking: false, dead: false, disconnected: false,
      /* v2.3.1627: the ALLOWLISTED copy, never the raw wire blob. */
      ...cleanJoinData
    };
    this.stateHistory[msg.id] = [];
    // v2.3.1146: capture join.device (sent by clients since v2.3.694,
    // never read until now) + hydrate the durable anti-bot summary so
    // reconnect-cycling resets neither the hour caps nor the replay
    // ring.  Await is input-gate-safe (rule 9).
    await this._botfpOnJoin(session, msg);
    /* Load (or bootstrap) the player's server-authoritative
       coins + inventory.  Stored entry wins; if there's no
       record yet, fall back to the values the client sent in
       the join payload (one-time trust at first connection)
       and persist them so subsequent connects use the stored
       value. */
    {
      const stored = await this._loadRpg(msg.id);
      // v2.3.1148: lazy daily snapshot of the PRE-join blob (the
      // state the player last logged out with) -- the rollback
      // parachute that never existed.  Throttled to one per ~20h
      // inside; never blocks the join (see admin.js).
      if (stored) await this._rpgSnapshotMaybe(msg.id, stored);
      /* v2.3.1576: restore a still-fresh Hemi Bro ownership link so a
         reconnect does not re-prompt the wallet.  Never re-checks the chain
         here — join is latency-sensitive and must not wait on an RPC; a link
         past RECHECK_MS is simply dropped and the player re-verifies when
         they next want the badge (broverify.js). */
      try { await this._restoreBroLink(msg.id); } catch { /* badge is cosmetic — never block a join */ }
      if (stored) {
        this.playerState[msg.id].coins = stored.coins || 0;
        this.playerState[msg.id].inventory = stored.inventory || {};
        this.playerState[msg.id].lifeSkills = stored.lifeSkills || {};
        this.playerState[msg.id].level = stored.level || 1;
        this.playerState[msg.id].xp = stored.xp || 0;
        this.playerState[msg.id].unspentT2 = stored.unspentT2 || 0;
        this.playerState[msg.id].buildPointsThisLvl = stored.buildPointsThisLvl || 0;
        this.playerState[msg.id].hp = typeof stored.hp === 'number' ? stored.hp : 100;
        this.playerState[msg.id].maxHp = typeof stored.maxHp === 'number' ? stored.maxHp : 100;
        this.playerState[msg.id].stamina = typeof stored.stamina === 'number' ? stored.stamina : 100;
        this.playerState[msg.id].maxStamina = typeof stored.maxStamina === 'number' ? stored.maxStamina : 100;
        this.playerState[msg.id].mana = typeof stored.mana === 'number' ? stored.mana : 100;
        this.playerState[msg.id].maxMana = typeof stored.maxMana === 'number' ? stored.maxMana : 100;
        this.playerState[msg.id]._buffs = (stored._buffs && typeof stored._buffs === 'object') ? { ...stored._buffs } : {};
        // Equipment from stored.  v2.3.1104: weapon blobs are
        // re-sanitized on load too -- records persisted before the
        // bootstrap clamp existed may carry forged tierMult values;
        // this heals them on the next reconnect.  Stash truncated
        // to cap.
        this.playerState[msg.id].weapon = this._sanitizeWeapon(stored.weapon);
        this.playerState[msg.id].rangedWeapon = this._sanitizeWeapon(stored.rangedWeapon);
        this.playerState[msg.id].staffWeapon = this._sanitizeWeapon(stored.staffWeapon);
        this.playerState[msg.id].activeSlot = stored.activeSlot || 'melee';
        // v2.3.249: Leather Armor removed from the game.
        // v2.3.1152: the every-load strip moved to migration v2
        // (migrations.js) -- `stored` arrived here through _loadRpg,
        // so it is already migrated.  The bootstrap branch below
        // KEEPS its strip (client payloads are unmigrated writers).
        this.playerState[msg.id].armor = stored.armor || null;
        /* v2.3.1679: the legs piece restores alongside the chest one.  Absent
           on every pre-v2.3.1679 record, which is correct — nobody had one. */
        this.playerState[msg.id].legsArmor = stored.legsArmor || null;
        this.playerState[msg.id].shield = stored.shield || null;
        // v2.3.1180: amulet gem/tier feed the authoritative damage roll
        // (_computeAttackDamage) -- whitelist even the stored blob, so a
        // pre-slice forged amulet heals on this reconnect (gear.js).
        this.playerState[msg.id].amulet = this._sanitizeAmulet(stored.amulet);
        this.playerState[msg.id].weaponStash = this._sanitizeWeaponList(stored.weaponStash);
        // v2.3.1192 (amulet forge): gold nugget/bar ledger.  Stored
        // wins; a record that predates the server ledger falls back to
        // the join payload ONCE (clamped -- the v2.3.1021 weaponSkills
        // capture posture) so legit legacy hoards migrate instead of
        // zeroing.  After that first save the typeof check always hits
        // the stored branch and the claim is ignored forever.
        this.playerState[msg.id].goldNuggets = (typeof stored.goldNuggets === 'number')
          ? Math.max(0, Math.floor(stored.goldNuggets))
          : this._amuletClampNuggets(msg.data && msg.data.rpgGoldNuggets);
        this.playerState[msg.id].goldBars = (typeof stored.goldBars === 'number')
          ? Math.max(0, Math.floor(stored.goldBars))
          : this._amuletClampBars(msg.data && msg.data.rpgGoldBars);
        this.playerState[msg.id]._quests = (stored._quests && typeof stored._quests === 'object') ? { ...stored._quests } : {};
        this.playerState[msg.id]._questFlags = (stored._questFlags && typeof stored._questFlags === 'object') ? { ...stored._questFlags } : {};
        this.playerState[msg.id]._questKills = (stored._questKills && typeof stored._questKills === 'object') ? { ...stored._questKills } : {};
        this.playerState[msg.id].achievementPoints = stored.achievementPoints || 0;
        /* v2.3.1664: server-verified kills.  MUST be restored here or a
           reconnect resets the counter to 0 and the next on-chain
           attestation would report fewer kills than the last one — which
           the contract's monotonic guard rejects, silently costing gas. */
        this.playerState[msg.id].svKills = Math.max(0, Math.floor(stored.svKills || 0));
        // Restore the perfect-claim history so the rate-limit
        // window survives reconnects.  Stale entries (>60s old)
        // get pruned on the next _ratedHarvestAccuracy call.
        this.playerState[msg.id]._perfectHistory = Array.isArray(stored._perfectHistory) ? stored._perfectHistory : [];
        this.playerState[msg.id]._cookHistory = Array.isArray(stored._cookHistory) ? stored._cookHistory : [];
        // v2.3.1021: weapon/defense skill track.  These were never
        // persisted before this slice, so an existing player's stored
        // record has none -- fall back to the join payload (their current
        // localStorage copy) the first time, so the migration CAPTURES
        // their trained levels instead of zeroing them.  Once stored, the
        // stored copy wins on every later reconnect.
        const _md = msg.data || {};
        this.playerState[msg.id].weaponSkills = (stored.weaponSkills && Object.keys(stored.weaponSkills).length)
          ? this._sanitizeWeaponSkills(stored.weaponSkills) : this._sanitizeWeaponSkills(_md.rpgWeaponSkills);
        this.playerState[msg.id].weaponUnspent = (stored.weaponUnspent && Object.keys(stored.weaponUnspent).length)
          ? this._sanitizeWeaponUnspent(stored.weaponUnspent) : this._sanitizeWeaponUnspent(_md.rpgWeaponUnspent);
        this.playerState[msg.id].weaponSpecs = (stored.weaponSpecs && Object.keys(stored.weaponSpecs).length)
          ? this._sanitizeWeaponSpecs(stored.weaponSpecs) : this._sanitizeWeaponSpecs(_md.rpgWeaponSpecs);
        this.playerState[msg.id].defenseSkill = (stored.defenseSkill && typeof stored.defenseSkill === 'object')
          ? this._sanitizeDefenseSkill(stored.defenseSkill) : this._sanitizeDefenseSkill(_md.rpgDefenseSkill);
        this.playerState[msg.id].defenseUnspent = (typeof stored.defenseUnspent === 'number')
          ? Math.max(0, Math.min(999, Math.floor(stored.defenseUnspent)))
          : Math.max(0, Math.min(999, Math.floor(Number(_md.rpgDefenseUnspent) || 0)));
        this.playerState[msg.id].defenseSpec = (stored.defenseSpec && Object.keys(stored.defenseSpec).length)
          ? this._sanitizeDefenseSpec(stored.defenseSpec) : this._sanitizeDefenseSpec(_md.rpgDefenseSpec);
      } else {
        // First-connect bootstrap caps.  Stored values (the
        // branch above) win on reconnect; this branch only runs
        // when a player has no DO storage entry yet.  Cheaters
        // who localStorage-tamper before their first ever connect
        // would otherwise inject huge values that then persist
        // forever.  Cap each field at "reasonable migrated SP
        // character" thresholds; legit new players are unaffected
        // (their values are tiny), legit veteran SP players see
        // some progression capped (acceptable trade — the user
        // can raise these caps if they hear complaints).
        // v2.3.910: combat level is now the sum of the build-skill levels
        // (up to 500), so the first-connect cap rises to match.  The level
        // is re-derived from the stat sum on the next stats_update anyway.
        // v2.3.1342: level = T2 points placed, cap 1000 (owner directive
        // 2026-07-16); still re-derived by _recomputeMaxes regardless of
        // what the bootstrap payload claims.
        const BOOTSTRAP_LEVEL_CAP = 1000;
        const BOOTSTRAP_XP_CAP = 50000;
        const BOOTSTRAP_UT2_CAP = 75;
        const BOOTSTRAP_COINS_CAP = 2000;
        const BOOTSTRAP_INV_PER_ITEM_CAP = 50;
        const BOOTSTRAP_INV_KEY_COUNT_CAP = 100;

        const _rawInv = (msg.data && msg.data.rpgInventory && typeof msg.data.rpgInventory === 'object') ? msg.data.rpgInventory : {};
        const _cappedInv = {};
        let _kc = 0;
        for (const [k, v] of Object.entries(_rawInv)) {
          if (_kc >= BOOTSTRAP_INV_KEY_COUNT_CAP) break;
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) continue;
          _cappedInv[k] = Math.min(BOOTSTRAP_INV_PER_ITEM_CAP, Math.floor(n));
          _kc++;
        }

        this.playerState[msg.id].coins = Math.max(0, Math.min(BOOTSTRAP_COINS_CAP,
          (msg.data && typeof msg.data.rpgCoins === 'number') ? Math.floor(msg.data.rpgCoins) : 0));
        this.playerState[msg.id].inventory = _cappedInv;
        this.playerState[msg.id].lifeSkills = (msg.data && msg.data.rpgLifeSkills && typeof msg.data.rpgLifeSkills === 'object') ? { ...msg.data.rpgLifeSkills } : {};
        // v2.3.1152: boundary heal.  Migration v1 fixes STORED
        // blobs once, but a pre-v2.3.769 client can hand us a
        // freshly re-corrupted lifeSkills payload right here --
        // without this, the corruption gets saved into a blob
        // that is already stamped past migration v1 and never
        // heals.  healLifeSkills mutates in place; cheap no-op
        // on clean payloads.
        healLifeSkills(this.playerState[msg.id]);
        this.playerState[msg.id].level = Math.max(1, Math.min(BOOTSTRAP_LEVEL_CAP,
          (msg.data && typeof msg.data.rpgLevel === 'number') ? Math.floor(msg.data.rpgLevel) : 1));
        this.playerState[msg.id].xp = Math.max(0, Math.min(BOOTSTRAP_XP_CAP,
          (msg.data && typeof msg.data.rpgXp === 'number') ? Math.floor(msg.data.rpgXp) : 0));
        this.playerState[msg.id].unspentT2 = Math.max(0, Math.min(BOOTSTRAP_UT2_CAP,
          (msg.data && typeof msg.data.rpgUnspentT2 === 'number') ? Math.floor(msg.data.rpgUnspentT2) : 0));
        // build_point_earned dispatches own up to 4 in a flurry on
        // a multi-stat-threshold crossing -- cap at 4 on bootstrap
        // so a cheater can't seed a huge BP carry-over.
        this.playerState[msg.id].buildPointsThisLvl = Math.max(0, Math.min(4,
          (msg.data && typeof msg.data.rpgBuildPointsThisLvl === 'number') ? Math.floor(msg.data.rpgBuildPointsThisLvl) : 0));
        this.playerState[msg.id].hp = (msg.data && typeof msg.data.rpgHp === 'number') ? msg.data.rpgHp : 100;
        this.playerState[msg.id].maxHp = (msg.data && typeof msg.data.rpgMaxHp === 'number') ? msg.data.rpgMaxHp : 100;
        this.playerState[msg.id].stamina = (msg.data && typeof msg.data.rpgStamina === 'number') ? msg.data.rpgStamina : 100;
        this.playerState[msg.id].maxStamina = (msg.data && typeof msg.data.rpgMaxStamina === 'number') ? msg.data.rpgMaxStamina : 100;
        this.playerState[msg.id].mana = (msg.data && typeof msg.data.rpgMana === 'number') ? msg.data.rpgMana : 100;
        this.playerState[msg.id].maxMana = (msg.data && typeof msg.data.rpgMaxMana === 'number') ? msg.data.rpgMaxMana : 100;
        this.playerState[msg.id]._buffs = {};
        // Equipment bootstrap.  v2.3.1104: weapon blobs are now
        // SANITIZED on entry (tierMult clamped to the legit forge
        // range) because server-computed damage (v2.3.912) and
        // sell value both multiply by tierMult -- the old "opaque
        // blobs are harmless" posture stopped being true.
        // Stash truncated to cap to prevent join-time inflation.
        // v2.3.1131: strict=true -- client-supplied blobs are
        // STRIPPED of quality/hardness/temper (they multiply the
        // anti-cheat damage ceiling; a forged godly would raise
        // its own cap).  Stored-blob loads keep the default clamp.
        this.playerState[msg.id].weapon = this._sanitizeWeapon(msg.data && msg.data.rpgWeapon, true);
        this.playerState[msg.id].rangedWeapon = this._sanitizeWeapon(msg.data && msg.data.rpgRangedWeapon, true);
        this.playerState[msg.id].staffWeapon = this._sanitizeWeapon(msg.data && msg.data.rpgStaffWeapon, true);
        this.playerState[msg.id].activeSlot = (msg.data && typeof msg.data.rpgActiveSlot === 'string') ? msg.data.rpgActiveSlot : 'melee';
        // v2.3.249: drop leather armor from the first-connect bootstrap too.
        {
          const _bootArmor = (msg.data && msg.data.rpgArmor && typeof msg.data.rpgArmor === 'object') ? msg.data.rpgArmor : null;
          this.playerState[msg.id].armor = (_bootArmor && _bootArmor.name === 'Leather Armor') ? null : (_bootArmor ? { ..._bootArmor } : null);
        }
        this.playerState[msg.id].shield = (msg.data && msg.data.rpgShield && typeof msg.data.rpgShield === 'object') ? { ...msg.data.rpgShield } : null;
        // v2.3.1180: whitelist the client-supplied amulet (gem/tier feed
        // the authoritative damage roll -- gear.js _sanitizeAmulet).
        this.playerState[msg.id].amulet = this._sanitizeAmulet(msg.data && msg.data.rpgAmulet);
        // v2.3.1192 (amulet forge): first-connect capture of the
        // previously client-local nugget/bar ledger, clamped (amulet.js
        // bootstrap caps -- same rationale as BOOTSTRAP_COINS_CAP).
        this.playerState[msg.id].goldNuggets = this._amuletClampNuggets(msg.data && msg.data.rpgGoldNuggets);
        this.playerState[msg.id].goldBars = this._amuletClampBars(msg.data && msg.data.rpgGoldBars);
        this.playerState[msg.id].weaponStash = this._sanitizeWeaponList(msg.data && msg.data.rpgWeaponStash, true);
        // Quest state bootstrap (slice 17).  Trust shape but not
        // size -- a cheater could pass a 10000-entry _questKills
        // map to inflate storage.  Strip non-numeric values and
        // cap key count.
        const _qK = (msg.data && msg.data.rpgQuestKills && typeof msg.data.rpgQuestKills === 'object') ? msg.data.rpgQuestKills : {};
        const _qKclean = {};
        let _qKc = 0;
        for (const [k, v] of Object.entries(_qK)) {
          if (_qKc >= 50) break;
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) {
            _qKclean[k] = Math.min(99999, Math.floor(n));
            _qKc++;
          }
        }
        // Cap _quests + _questFlags key counts so a cheater
        // can't fill storage with a 100k-entry map at first
        // connect.  100 keys is well above the known
        // QUEST_CHAINS table size (25 quests) + a generous
        // buffer for flags + future expansion.
        const _capObjKeys = (src) => {
          const out = {};
          if (!src || typeof src !== 'object') return out;
          let n = 0;
          for (const [k, v] of Object.entries(src)) {
            if (n >= 100) break;
            out[k] = v;
            n++;
          }
          return out;
        };
        this.playerState[msg.id]._quests = _capObjKeys((msg.data && msg.data.rpgQuests) || null);
        this.playerState[msg.id]._questFlags = _capObjKeys((msg.data && msg.data.rpgQuestFlags) || null);
        this.playerState[msg.id]._questKills = _qKclean;
        this.playerState[msg.id].achievementPoints = Math.max(0, Math.min(99999,
          (msg.data && typeof msg.data.rpgAchievementPoints === 'number') ? Math.floor(msg.data.rpgAchievementPoints) : 0));
        this.playerState[msg.id]._perfectHistory = [];
        this.playerState[msg.id]._cookHistory = [];
        // v2.3.1021: weapon/defense skill track -- bootstrap from the join
        // payload on first connect (sanitized), then persisted below.
        {
          const _md = msg.data || {};
          this.playerState[msg.id].weaponSkills = this._sanitizeWeaponSkills(_md.rpgWeaponSkills);
          this.playerState[msg.id].weaponUnspent = this._sanitizeWeaponUnspent(_md.rpgWeaponUnspent);
          this.playerState[msg.id].weaponSpecs = this._sanitizeWeaponSpecs(_md.rpgWeaponSpecs);
          this.playerState[msg.id].defenseSkill = this._sanitizeDefenseSkill(_md.rpgDefenseSkill);
          this.playerState[msg.id].defenseUnspent = Math.max(0, Math.min(999, Math.floor(Number(_md.rpgDefenseUnspent) || 0)));
          this.playerState[msg.id].defenseSpec = this._sanitizeDefenseSpec(_md.rpgDefenseSpec);
        }
        await this._saveRpg(msg.id, this.playerState[msg.id]);
      }
      // v2.3.1198 (gem income): adopt the previously client-local gem
      // economy.  Heals/clamps whatever gems map landed above (stored
      // blob, or the wholesale lifeSkills bootstrap capture -- which
      // used to ingest gems UNCLAMPED) and, when the stored record
      // predates the slice (no gemsCaptured stamp), max-merges the
      // client's claimed counts ONCE so legit mined+cut hoards migrate
      // instead of being deny-by-default'd at the amulet gem op
      // forever.  Stamp persists via the _saveRpg at the end of the
      // stats block below; stored wins on every later reconnect.
      this._gemsAdoptOnJoin(this.playerState[msg.id], stored,
        (msg.data && msg.data.rpgLifeSkills) || null);
      // Session-only equipment-derived values.  Always read from join
      // — recomputed client-side on every recalcDerived.
      // v2.3.1306: upper-bound def at ingest too (2100 = the grids.js
      // stats_update defCap at level 100).  This path had NO cap, which
      // was harmless while def was inert (Phase 1) but became a live
      // PvP mitigation input at v2.3.1302 — the consumption-side
      // PVP_TUNING.DEF_CAP in combat.js is the real bound; this is
      // belt-and-braces so no unbounded number sits in playerState.
      this.playerState[msg.id].def = (msg.data && typeof msg.data.rpgDef === 'number') ? Math.max(0, Math.min(2100, msg.data.rpgDef)) : 0;
      this.playerState[msg.id].amuletHpRegen = (msg.data && typeof msg.data.rpgAmuletHpRegen === 'number') ? Math.max(0, msg.data.rpgAmuletHpRegen) : 0;
      this.playerState[msg.id].amuletStaminaRegen = (msg.data && typeof msg.data.rpgAmuletStaminaRegen === 'number') ? Math.max(0, msg.data.rpgAmuletStaminaRegen) : 0;
      this.playerState[msg.id].lastDamageAt = 0;
      this.playerState[msg.id].dying = false;
      this.playerState[msg.id].respawnAt = 0;

      // Raw stats: prefer stored (already-clamped) values; bootstrap
      // from join payload otherwise, clamped to the per-level cap.
      // Cheater spoofing rpgVitality: 99999 on join gets clamped to
      // level * 10 + 20 -- bounded forever after, even on reconnect.
      {
        const _ps = this.playerState[msg.id];
        const _lvl = _ps.level || 1;
        // v2.3.1155: T1 only.  The five retired T2 stats are gone
        // from this fallback — this line was the re-injection path
        // migrations.md warned about (a spoofed rpgFerocity in the
        // join payload used to persist forever).
        const RAW_STATS = ['power', 'vitality', 'endurance', 'agility', 'mind'];
        const _storedHasStats = stored && typeof stored.vitality === 'number';
        for (const s of RAW_STATS) {
          if (_storedHasStats && typeof stored[s] === 'number') {
            _ps[s] = stored[s];
          } else {
            const joinKey = 'rpg' + s.charAt(0).toUpperCase() + s.slice(1);
            const joinVal = (msg.data && typeof msg.data[joinKey] === 'number') ? msg.data[joinKey] : 0;
            _ps[s] = this._clampStat(joinVal, _lvl);
          }
        }
        // v2.3.1154: HP/Endurance grid track -- ingested HERE (after
        // the raw-stat loop above) because the budget clamp in
        // _sanitizeGridSpec reads the final clamped vitality/
        // endurance.  Stored wins; else the join payload seeds
        // (first connect / pre-grid stored records).  Absent unspent
        // pools BACKFILL to stat-level minus points-already-spent --
        // the boundary heal twin of the backfill-grid-points
        // migration (client payloads are unmigrated writers).
        {
          const _md2 = msg.data || {};
          _ps.hpSpec = (stored && stored.hpSpec && Object.keys(stored.hpSpec).length)
            ? this._sanitizeHpSpec(stored.hpSpec, _ps) : this._sanitizeHpSpec(_md2.rpgHpSpec, _ps);
          _ps.enduranceSpec = (stored && stored.enduranceSpec && Object.keys(stored.enduranceSpec).length)
            ? this._sanitizeEnduranceSpec(stored.enduranceSpec, _ps) : this._sanitizeEnduranceSpec(_md2.rpgEnduranceSpec, _ps);
          const _sumSpec = (o) => Object.values(o || {}).reduce((a, v) => a + (v || 0), 0);
          // v2.3.1157: backfill at the doubled earn rate (2/level,
          // 200 lifetime per skill) — mirror of the uniform-t2-pools
          // migration formula.
          _ps.hpUnspent = (stored && typeof stored.hpUnspent === 'number')
            ? Math.max(0, Math.min(999, Math.floor(stored.hpUnspent)))
            : (typeof _md2.rpgHpUnspent === 'number')
              ? Math.max(0, Math.min(999, Math.floor(_md2.rpgHpUnspent)))
              : Math.max(0, Math.min(200, 2 * (_ps.vitality || 0)) - _sumSpec(_ps.hpSpec));
          _ps.enduranceUnspent = (stored && typeof stored.enduranceUnspent === 'number')
            ? Math.max(0, Math.min(999, Math.floor(stored.enduranceUnspent)))
            : (typeof _md2.rpgEnduranceUnspent === 'number')
              ? Math.max(0, Math.min(999, Math.floor(_md2.rpgEnduranceUnspent)))
              : Math.max(0, Math.min(200, 2 * (_ps.endurance || 0)) - _sumSpec(_ps.enduranceSpec));
          // v2.3.1157: the 1000-point combat ceiling holds on the
          // join path too (a forged payload could otherwise seed
          // over-ceiling specs on first connect).
          this._clampBuildTotal(_ps);
          // v2.3.1451: bench-locked T2 accumulator.  Stored wins —
          // it was priced live at spend time (grids.js) or replayed
          // once by migration v9, and re-replaying would overwrite
          // the truth with an estimate.  Everything else (first
          // connect, pre-v9 blob whose migration fail-opened) gets
          // the boundary heal: replay the POST-CLAMP specs ingested
          // above.  The join payload itself is NEVER a source —
          // client-supplied flat values are ignored by construction
          // (the accumulator feeds the authoritative damage roll and
          // the anticheat ceiling; trusting it would let a forged
          // payload raise its own cap, the v2.3.1131 lesson).
          _ps.t2Flat = (stored && stored.t2Flat && typeof stored.t2Flat === 'object')
            ? this._sanitizeT2Flat(stored.t2Flat)
            : t2ReplayFlat(_ps);
          // v2.3.1659: prog3 trained-skill track.  Stored wins (the
          // v10 migration respecced it once; live trained levels are
          // the truth).  Everything else — first connect, pre-v10 blob
          // whose migration fail-opened — gets the boundary heal:
          // respec from the legacy tracks ingested above
          // (prog3FromLegacy, the same computation migration v10
          // runs).  The join payload is NEVER a source: prog3 feeds
          // the authoritative damage roll and the anticheat ceiling,
          // so a client-supplied copy would raise its own cap (the
          // t2Flat/v2.3.1131 rule).
          const _p3Adopted = !!(stored && stored.prog3 && typeof stored.prog3 === 'object');
          _ps.prog3 = _p3Adopted
            ? this._sanitizeProg3(stored.prog3)
            : prog3FromLegacy(_ps);
          // A freshly-derived respec tops off every pool after the
          // recompute below: the announced "full respec" moment, and
          // the pool formulas just changed under the player (a
          // carried hp of 100 against a prog3 maxHp of 106 would
          // otherwise leave every fresh character permanently
          // part-damaged until their first level-up).
          _ps._p3FreshRespec = !_p3Adopted;
        }
        // Server-owned max values: compute from clamped raw stats
        // (v2.3.1154: and the grid specs ingested just above --
        // vigor/stamina feed the pool formulas).
        // Persisted hp / stamina / mana already loaded above; clamp
        // them to the recomputed maxes here.
        this._recomputeMaxes(_ps);
        /* v2.3.1733: pay any MILESTONE rung this character already earned
           but was never granted (abilities.js).  It belongs here as well as
           on the level-up path because the ladder ships AFTER thousands of
           levels were earned — without a join-time settle, a level-40
           veteran would never receive the level-5 bonus point, and the
           level-10 stamina bonus would not appear until their next level-up.
           Idempotent: prog3.ms records the highest level already paid, and
           it survives _sanitizeProg3 (a sanitizer that dropped it would turn
           a one-off grant into one per join).  Runs BEFORE the fresh-respec
           top-off below so the restore hands over the bigger bar. */
        if (_ps.prog3) this._prog3GrantMilestones(msg.id, _ps);
        // v2.3.1659: see _p3FreshRespec above — first prog3 adoption
        // restores the pools to the new maxes (in-memory flag only,
        // consumed here; never persisted — _saveRpg's field list
        // drops it by construction).
        if (_ps._p3FreshRespec) {
          delete _ps._p3FreshRespec;
          if (typeof _ps.maxHp === 'number') _ps.hp = _ps.maxHp;
          if (typeof _ps.maxStamina === 'number') _ps.stamina = _ps.maxStamina;
          if (typeof _ps.maxMana === 'number') _ps.mana = _ps.maxMana;
        }
        this._saveRpg(msg.id, _ps);
      }
    }
    // v2.3.1117: drain offline mail (market refunds, trade payouts,
    // wager returns) into the freshly loaded state BEFORE state_sync
    // below, so the first snapshot the client renders already
    // includes the credits.
    await this._drainInbox(msg.id, ws);
    // v2.3.1323: friends -- deliver the friend doc (list/requests) and
    // any offline DM backlog (friends.js _friendsOnJoin; backlog is
    // delivered-once, cleared after send).  After the inbox drain so
    // credit lines land first, before social chatter.
    await this._friendsOnJoin(msg.id, ws);
    /* v2.3.1981: load this player's chat-mute list into memory and echo
       it (chatmod.js _chatModOnJoin).  AWAITED and placed BEFORE the
       state_sync below on purpose -- the tick fan-out consults the
       in-memory Set synchronously, so a mute that loaded late would let
       the first lines after a reconnect through, which is exactly the
       moment a harassed player is most likely to be watching. */
    await this._chatModOnJoin(msg.id, ws);
    // v2.3.1149: cadence hooks -- daily login reward (per-player
    // lazy settlement) + the weekly jackpot's lazy draw resolution
    // (rule 12: a week that ended in an empty room settles on the
    // next join).  Both after the drain so the reward's own
    // inbox_delivered arrives as its own line.
    await this._cadenceLoginReward(msg.id);
    await this._jackpotMaybeResolve();
    this._jackpotSend(msg.id, { playerId: msg.id });
    // v2.3.1150: sticky MOTD delivery + the lazy daily economy
    // snapshot (fire-and-forget; also runs from the tick slot so a
    // room that stays occupied across midnight still records).
    {
      const _motd = await this.state.storage.get('motd');
      if (_motd && _motd.text) {
        try { ws.send(JSON.stringify({ type: 'server_announce', payload: { text: _motd.text, motd: true, ts: _motd.ts } })); } catch (e) {}
      }
      this._metricsMaybe(Date.now()).catch(() => {});
    }
    // v2.3.1121: duel bookkeeping on (re)join -- clear a reconnect
    // grace window if this player dropped mid-duel, and kick the
    // rate-limited orphaned-wager sweep (fire-and-forget; refunds
    // land via the inbox path above on the NEXT join).
    this._duelOnRejoin(msg.id);
    this._duelEscrowSweep();
    this._arenaEntrySweep(); // v2.3.1126: refund entries orphaned by a deploy
    this._arenaStakeSweep(); // v2.3.1128: same contract for sponsorship stakes
    this._bountySweep();     // v2.3.1211: delete orphaned guard-fine bounties (item C)
    this._trade2WpnSweep();  // v2.3.1213: refund weapons escrowed in a deploy-voided trade (item E)
    // v2.3.1129: load a surviving guard gear lock -- storage-backed
    // so relogging can't shed the punishment (threat.js).
    {
      const _gl = await this.state.storage.get('gearlock:' + msg.id);
      if (_gl && _gl > Date.now() && this.playerState[msg.id]) {
        this.playerState[msg.id]._gearLockUntil = _gl;
      }
    }
    // v2.3.1130: sanitize server-held pets + one-time adoption of
    // legacy client-side captures (see pets.js header).
    this._petsAdoptOnJoin(this.playerState[msg.id], msg.data);
    // v2.3.1125: authoritative clan tag -- the registry overrides
    // whatever the client stuffed in its cosmetics (msg.data is the
    // same object session.data / playerState spread / player_join
    // broadcast all read).  Also the lazy war-resolve hook, and the
    // clan snapshot echo so the client's panel has server truth.
    await this._clansEnsure();
    /* v2.3.1629: stamp the SANITIZED copy -- it is the object that now
       feeds both session.data and the player_join relay below. */
    this._clanStampTag(msg.id, cleanJoinData);
    this._clanStampTag(msg.id, this.playerState[msg.id]);
    this._clanSendState(msg.id);
    /* v2.3.1629: the THIRD consumer.  v2.3.1627 claimed msg.data was
       "filtered once and used for BOTH consumers" -- it was three.  This
       relay still shipped the raw client blob to every peer, so a forged
       field reached other players' S.others[] even though playerState
       and session.data were clean (e.g. a z the server itself rejected,
       which peers would then use to filter that player out of the zone
       they are actually standing in).  No live exploit today -- the peer
       handler picks fields by name -- but it is the same shape as the
       one the allowlist exists to close, and it re-opens the moment any
       client merges player_join data wholesale, the way player_update
       already does for track relays. */
    this.broadcastExcept(ws, { type: 'player_join', id: msg.id, name: msg.name, data: cleanJoinData });
    // Send current state + monsters for player's zone
    /* v2.3.1627: read the zone off the SANITIZED state, not the raw
       wire blob -- _sanitizeJoinData already dropped an unlisted id, so
       this can no longer hand _ensureZoneMonsters a forged zone. */
    const joinZone = this.playerState[msg.id]?.z || 'town';
    const _joinInWorld = (joinZone !== 'town' && joinZone !== 'farm_home');
    if (_joinInWorld) {
      this._ensureZoneMonsters(joinZone);
      this._ensureZoneNodes(joinZone);
      /* v2.3.1983: this player is already in playerState, so scaling here
         counts them — their own state_sync below then carries the world
         their arrival just grew, and everyone else in the zone gets the
         roster push from inside (this socket is excluded; it is about to
         receive the same lists in state_sync). */
      this._spawnScaleZone(joinZone, Date.now(), undefined, ws);
    }
    const zoneMonsters = _joinInWorld ? (this.monsters[joinZone] || []) : [];
    const zoneNodes = _joinInWorld ? (this.nodes[joinZone] || []) : [];
    const zoneLootForJoin = _joinInWorld ? this._zoneLootForWire(joinZone) : [];
    // v2.3.1150: warm the live-ops flag cache before anything gated
    // can run, and let operator flags OVERRIDE the baked caps
    // (spread last).  Empty flags = identity, so deploy-order
    // safety (rule 19) is untouched.  WARNING: forcing a cap to
    // false re-enables legacy client fallbacks for some systems --
    // the disable_* server switches are the normal kill lever
    // (docs/specs/liveops.md safety table).
    const _liveFlags = await this._liveFlagsEnsure();
    /* v2.3.2026: warm the cape ledgers on the same await the flags use.  The
       ticket claim is deliberately SYNCHRONOUS (eventcapes.js), which means it
       cannot load its own ledger -- it refuses rather than guess when one is
       missing, so a cold ledger would silently award nothing all event. */
    /* ═══ v2.3.2026: WARM THE CAPE LEDGERS, BUT DO NOT AWAIT THEM HERE ═══
     * The ticket claim is deliberately SYNCHRONOUS (eventcapes.js) and refuses
     * rather than guess when its ledger is cold, so the ledger has to be warm
     * before the first kill -- which is a long way after this line.
     *
     * It is warmed UNAWAITED because awaiting it here breaks the join.
     * Measured, not assumed: with `await this._capeLedgersLoad()` on this line
     * the chainscore suite fails "svKills survives a reconnect" and echoes
     * svKills 0 -- a reconnecting player's kill count reset, which is exactly
     * the monotonicity that suite exists to protect. A bare
     * `await Promise.resolve()` in the same place is harmless, so it is not
     * yielding that does it; it is the extra STORAGE round-trip landing
     * between this handler's own load and save of the rpg blob.
     *
     * Unawaited, the warm completes in a microtask, long before any monster
     * dies, and the join path keeps exactly the storage ordering it had. */
    try {
      const _capeWarm = this._capeLedgersLoad();
      if (_capeWarm && _capeWarm.catch) _capeWarm.catch(() => {});
      /* v2.3.2101: and TELL THE PLAYER where the contest stands, once the warm
         lands. Sent as its own message rather than folded into state_sync
         below, because state_sync goes out now and the ledger is deliberately
         not awaited here (see above) -- a count read before the warm would be
         `null` on the join that matters most, the first one after a deploy.
         Chained off the warm instead, so it carries a real number. */
      if (_capeWarm && _capeWarm.then) {
        _capeWarm.then(() => {
          try {
            const w = this._wsBySessionId(session.id);
            if (w) w.send(JSON.stringify({ type: 'cape_status', payload: this._capePublicStatus() }));
          } catch (e) { /* the player is gone; nothing to tell */ }
        }).catch(() => {});
      }
    } catch (e) { /* never block a join on a cosmetic */ }
    ws.send(JSON.stringify({
      type: 'state_sync',
      // v2.3.1119: capability advertisement.  Clients gate their
      // legacy client-side settlement paths on these flags so old
      // workers keep old behavior (deploy-order safety).  WS-flow
      // capabilities go here; HTTP flows use per-response flags
      // (marketplace settled:true, v2.3.1118).
      // v2.3.1154: hpEndGrids -- the client gates HP/Endurance grid
      // spending AND its local vigor/stamina pool multipliers on this
      // flag, so a new client against an old worker shows the grids
      // as "Soon" instead of computing pools the worker's
      // player_state echo would stomp every flush (deploy-order
      // safety, the v2.3.1119 caps pattern).
      // v2.3.1156: t2uniform -- the client gates its 100-pt caps and
      // the build meter on this flag (an old worker clamps weapon
      // specs at 99 / defense+grid specs at 50, so spending past the
      // legacy caps against it would truncate on echo).
      // v2.3.1178: httpAuth -- the client attaches httpToken (below) to
      // mutating economy POSTs (market place/cancel, arena join/leave)
      // as the x-bt-auth header.  Old clients ignore both fields and
      // ride the enforcement grace window (httpauth.js).
      // v2.3.1185: party -- the client shows its party-invite surface
      // only when the worker owns the roster (old workers would
      // rebroadcast party_* commands as unknown types).
      // v2.3.1192: amuletForge -- the client sends amulet_forge_request
      // (smelt/craft/gem) and suppresses its local gold-nugget kill
      // roll only when the worker owns the amulet mint + nugget ledger
      // (amulet.js); old workers keep the legacy client-local flows.
      // v2.3.1200: petLoot -- the client routes the pet loot vacuum
      // through loot_pickup {viaPet:true} only when the worker
      // understands the flag (an old worker would reject the wider
      // vacuum range as out-of-range and the pile would sit unlootable
      // by the pet); absent, the legacy client-side self-credit vacuum
      // stays (harmless theatre -- the echo stomps it, as ever).
      // v2.3.1198: gems -- the client sends gem_cut_request and
      // suppresses its local raw-gem kill roll + local cut roll only
      // when the worker owns gem income (amulet.js _gemRawOnKill /
      // _handleGemCut).  Deliberately NOT folded into amuletForge: a
      // v2.3.1192 worker advertises amuletForge but silently denies
      // the unknown cut op, which would break cutting for new clients
      // against it (deploy-order safety, rule 19).
      // v2.3.1209: gemExtract -- the client sends amulet_forge_request
      // {op:'extract'} for the two ForgePanel Extract buttons only when
      // the worker owns extraction settlement (amulet.js).  A NARROW
      // flag, NOT folded into amuletForge or gems: a v2.3.1192/1198
      // worker advertises those but denies the unknown extract op, which
      // would strip the client's gear locally and stomp it right back on
      // the echo (the caps.gems lesson, TRAPS #9).  Absent, the legacy
      // client-local Extract path stays (broken settlement, no
      // regression -- echo-stomped as before).
      // v2.3.1451: t2bench -- the client gates ALL bench-locked reads
      // (its t2Flat adoption, the spend-time prediction, the 10 flat
      // channels' combat/pool/display mirrors) on this flag.  Against
      // an old worker the client keeps the full legacy t2Accel math so
      // its numbers keep matching that worker's authoritative rolls
      // and echoes (deploy-order safety, rule 19).
      /* v2.3.1814: the character record, echoed so a client that just logged
         in with a key on a NEW DEVICE can wear its own face.  The look lives
         nowhere on that device — that is the whole point of the key — so
         without this the character would arrive correct on every OTHER
         screen in the room and wrong on its own.
         Also the signal the pre-game screen needs: `char` present means this
         identity already has a character, so the creator must not run. */
      char: (session.char
        ? { name: session.char.name, look: session.char.look, createdAt: session.char.createdAt }
        : null),
      caps: { charLock: true /* v2.3.1814: name+look are stored server-side and a stored record WINS over the join payload.  The client gates BOTH halves of the permanent-character flow on this — skipping the creator, and trusting state_sync.char over its local trait catalogs.  Against an OLD worker the flag is absent, no record is ever stored, and the client keeps its old behaviour of picking a look every session; against a NEW worker an old client simply sends a look and has it locked in on first join, which is the intended migration either way (deploy-order safety, rule 19). */, trade: true, questTrack: true, gamble: true, clans: true, arena: true, dungeon: true, sponsor: true, guilds: true, pets: true, harden: true, trade2: true, weaponDrops: true, botfp: true, jackpot: true, hpEndGrids: true, t2uniform: true, httpAuth: true, party: true, amuletForge: true, gems: true, petLoot: true, gemExtract: true, partyChat: true, trade2Weapons: true, trade2Review: true /* v2.3.1754: the two-stage trade (ready -> review -> accept), its server-enforced accept cooldown, and the trade2_ready type.  The client gates its Ready button and its trade2_ready send on this: against an OLD worker the flag is absent, the window keeps the single-stage Confirm it has always had, and nothing is sent that the worker would relay as an unknown broadcast.  Against a NEW worker an old client simply never readies — and _handleTrade2Confirm would refuse it, so the pairing must be advertised (deploy-order safety, rule 19). */, laststand: true, friends: true /* v2.3.1323 */, t2simple: true /* v2.3.1342: level = T2 points placed (cap 1000); client gates its level derivation + spend celebration on this so an old worker's player_state echo can't stomp the new formula */, t2bench: true, broVerify: true /* v2.3.1576: Hemi Bro ownership. Gates the client's wallet control (broWallet.broVerifySupported) so it only appears against a worker that can settle it; an old client never sends the types. Safe in either deploy order (rule 19). */, prog3Chan: true /* v2.3.2176: points remember the combat skill that earned them (prog3.js poolBy).  The client gates its per-lane point counts AND its "you cannot buy Bow crit with a Melee point" affordance on this: against an OLD worker there is no poolBy, so the client shows the single shared total it always did and lets the server judge every spend as before.  Against a NEW worker an old client simply sends spends without naming a lane for body stats, and the worker picks the largest channel -- which is why that fallback exists (deploy-order safety, rule 19). */, prog3: true /* v2.3.1659: the trained-skill combat rebuild (prog3.js). The client gates its new Build UI, prog3_allocate sends, trained-level readouts, and the retirement of its local _buildProg/weapon-XP accrual on this flag — an old worker would relay prog3_allocate as an unknown type and its player_state echoes would stomp prog3-derived pools (deploy-order safety, rule 19). */, prog3x: true /* v2.3.2199: the 3-points economy expansion — POINTS_PER_LEVEL 3, the two new spendable stats (ATK dmg, BODY elem), and critDmg's flat→percent semantics.  The client gates DISPLAY on this, not sends: the new stat rows, the "+3 points" level banner, and the percent critDmg readout/DPS math.  Against an OLD worker the flag is absent, the rows hide, the banner says +1 and the DPS math predicts the flat +2 crits that worker actually rolls — nothing new is ever sent that it would drop.  Against a NEW worker an old client simply doesn't show the new rows; its prog3_allocate sends are unchanged and the worker accepts them (deploy-order safety, rule 19). */, abil: true /* v2.3.1733: stamina abilities + the milestone unlock ladder (abilities.js). The client gates its ability BUTTONS and its `ability` sends on this, so against an old worker (which would relay the unknown type as a broadcast and never settle it) no button appears and nothing is sent — deploy-order safe in either order (rule 19). */, elemBurst: true /* v2.3.1734: Element Burst (burst.js). Gates the client's burst button, its desktop key and its element_burst send — against an old worker the button never appears and nothing is sent, and against a new worker an old client simply never casts it. ALSO gates the client's FLAT special-attack mana cost: the cost is charged by the worker (_abilityCost), so a new client against an old worker must keep predicting floor(maxMana/5) or its charge pie promises casts that worker will refuse (deploy-order safety, rule 19). */, areaChat: true /* v2.3.2136: zone-scoped chat (chatlanes.js).  The client gates its /a send on THIS narrow flag, not on any broader one: an older worker has no case for area_chat, so it would fall through to the default branch and REBROADCAST the line to the whole room -- the quiet lane made loud.  Against a NEW worker an old client simply never sends it (deploy-order safety, rule 19). */, whisper: true /* v2.3.2136: whisper-by-name (chatlanes.js).  Gated on its own flag for the same reason as areaChat and with worse stakes -- an un-upgraded worker would relay a PRIVATE line to everyone in the room.  So the client must never send /w to a worker that has not advertised this. */, chatMute: true /* v2.3.1981: server-side chat mute + reports (chatmod.js). The client gates its chat_mute/chat_report sends AND its "muted lines still arrive, shown as [muted]" fallback on this: against an OLD worker the flag is absent, nothing is sent (an unknown type would be REBROADCAST to the room -- a mute telling everyone who you muted), and the localStorage list keeps doing the filtering it always did. Against a NEW worker an old client simply keeps filtering locally over a stream the worker is already filtering, which is harmless (deploy-order safety, rule 19). */, potionBag: true /* v2.3.2127: potions are bought INTO the bag and drunk from it (shop.js _shopBuy staple branch, cooking.js _handleDrinkRequest). The client gates its Drink button and its potion_drink send on this: against an OLD worker a staple purchase still applies its effect on the spot, no bottle can be in the bag, and nothing is sent that the worker would relay to the room as an unknown broadcast. Against a NEW worker an old client simply buys a bottle it never learns to drink (deploy-order safety, rule 19). */, eventCapes: true /* v2.3.2026: the golden-ticket drop and cape_redeem (eventcapes.js). The client gates its Open button and its cape_redeem send on this: against an OLD worker the flag is absent, no ticket can exist to open, and nothing is sent that the worker would relay to the room as an unknown broadcast. Against a NEW worker an old client simply never opens a ticket it cannot have been given -- the drop is gated on the same event flag (deploy-order safety, rule 19). */, ..._liveFlags },
      // v2.3.1178: this session's private economy-endpoint token.
      // state_sync goes to the joining socket ONLY -- never broadcast.
      httpToken: session.httpToken,
      /* v2.3.1576: this player's verified Hemi Bro, restored above if the
         link is still fresh.  Sent on the joining socket so the badge
         survives a reconnect without re-prompting the wallet; peers learn it
         from the tick's playerWire instead.  ADDITIVE — an old client ignores
         the field. */
      bro: (this.playerState[session.id] && this.playerState[session.id].bro) || null,
      players: this.getAllPlayerData(),
      playerCount: this.getPlayerCount(),
      monsters: zoneMonsters.map(m => ({
        id: m.id, arch: m.arch, level: m.level, element: m.element,
        x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
        xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
        alive: m.alive,
        /* v2.3.2295: who it is chasing at the moment you join -- the baseline
           the notice cue needs. Without it every monster already aggroed on
           you would read as having JUST noticed you the first time it moves.
           See tick.js. */
        tg: m.targetId || null,
        /* v2.3.1535: the variant this monster actually spawned as.  Until now
           the client re-derived it from ZONE_VARIANT_MAP, which maps a whole
           ARCHETYPE and so cannot express "7 green slimes and 1 blue one".
           The server already picks the variant per spawn, so it just says so.
           ADDITIVE and deploy-order safe both ways: an old client ignores the
           field, and a new client against an old worker sees it undefined and
           falls back to the archetype map exactly as before (every slime
           green -- degraded, never broken). */
        variant: m.variant || null,
      })),
      nodes: zoneNodes.map(n => ({
        id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
        tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
      })),
      loot: zoneLootForJoin,
      monsterZone: joinZone,
    }));
    /* Authoritative rpg state sync -- the client overwrites its
       local R.coins / R.inventory with whatever's on the worker.
       Bootstrap-from-join (above) means this matches what the
       client just sent on the first connect, and matches the
       stored value on subsequent connects. */
    this._sendPlayerState(ws, msg.id);
    /* v2.3.1822: replay a respawn the player was never told about.  See
       _tickPlayerRespawn (index.js) for the incident — a tab backgrounded at
       the moment of death has no socket to receive `player_respawned`, and
       the client's death state is cleared by nothing else.  Sent AFTER
       state_sync + player_state so it lands on a client that already has the
       world, and carries the zone so the client teleports home rather than
       standing up wherever it died.
       Cleared before the send, not after, so a throw here cannot leave the
       debt to be replayed on every future join. */
    const _ps = this.playerState[msg.id];
    if (_ps && _ps._respawnOwed) {
      delete _ps._respawnOwed;
      try {
        ws.send(JSON.stringify({
          type: 'player_respawned',
          payload: { zone: _ps.z || 'town' },
        }));
      } catch (e) {}
    }
    // v2.3.1185: party roster re-send -- MUST stay after the state_sync
    // send above: clients clear their party HUD on every state_sync
    // (deploys wipe the in-memory roster; stale HUDs must not survive a
    // reconnect), so this echo is what restores a roster that DID
    // survive.  Also clears this member's 'away' grace flag.
    this._partyOnRejoin(msg.id);
    this.broadcastAll({ type: 'player_count', count: this.getPlayerCount() });
    /* v2.3.1620: force=true.  The `track` path is throttled now, so this
       is what guarantees a joining player shows on the board at once
       instead of waiting out the first interval -- and it primes
       session._lbSig, so the next track only writes if something really
       moved. */
    this.reportToLeaderboard(session, true);
  },
};
