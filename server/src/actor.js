/* ═══ v2.3.6480: THE ACTOR, MADE ONCE (grand plan steps 10.1 and 11.2 as code; card WHO PR 1) ═══
 *
 * Who is acting.  Designed once in docs/SHAPES.md part 1 ("The actor"): this
 * file builds that shape and no twin of it.  Until now nothing written
 * anywhere said what kind of hand did a thing, by which way in: a gold move
 * named its road, a ledger row the player whose tap settled it, and the
 * owner's own test play was mixed into the day's book and the ledger as a
 * player's.
 *
 * THE SHAPE, frozen as it is made and changed by nothing after:
 *   kind       `person`, `qa`, `owner`, `system`, `helper` (ACTOR.KINDS).
 *              BUILT: `person` (a joined socket), `system` (the room).
 *              `owner` is made here (actorOwner) for the admin routes'
 *              door, which does not call it yet: no row reads it.  `qa` is
 *              NOT BUILT: the server holds no proof of QA today (a join
 *              carries no key; the admin key is HTTP's alone), and a field a
 *              phone sends is never a proof (SHAPES part 1: a claimed `qa`
 *              would hide a bot from every record that leaves QA out).  The
 *              card's question 1, in docs/plan/status/WHO.md.  `helper` is
 *              a kind nothing makes (step 11.7).
 *   pid        the character it acts as; null for `owner` and `system`.
 *   principal  the account above the character: null on every actor until
 *              the owner's call 14 is answered (SHAPES part 2).
 *   stint      the sitting's id: the WORKER's own clock in ms at the join
 *              that made it (never a phone's), one a room's join at most a
 *              ms (stintNext), so unique with `pid`.  null where there is no
 *              sitting (`owner`, `system`).  v2.3.6481 (this card's PR 2):
 *              carried across a reconnect and a deploy inside the gap, by the
 *              sitting's card (sitting.js sitOpen; `sitting: false`, one a
 *              socket again).
 *   wayIn      `socket`, `http`, `admin`, `room` (ACTOR.WAYS).
 *   permit     the grant a `helper` acts under: null (step 11.7).
 *
 * MADE AT THE WAYS IN, and nowhere else:
 *   1. the socket: actorSocket(room, session, pid), once, where the join
 *      has the character's record (join.js; v2.3.6481: moved below the
 *      record's load, from beside `session.phase = 'joined'`, so the sitting
 *      it goes on with names its stint).  A
 *      second join on a socket is closed with 4011 before it gets there, and
 *      a session that has one keeps it (the maker refuses to make another).
 *   2. HTTP: a call that passed _httpAuthCheck acts AS the live session it
 *      matched (SHAPES part 1, "Where it would be set", 2): actorOf(room,
 *      pid) hands back that session's actor, so the HTTP roads (the market,
 *      the auction house) are its person's.  The admin routes' owner is
 *      actorOwner().
 *   3. the room: ROOM_ACTOR, one constant, for what settles with no tap
 *      behind it (a duel's forfeit or clock, an arena's stakes).
 *
 * TEST MODE MARKS A CHARACTER, NOT A HAND (testmode.js).  The owner's test
 * play is a `person`'s, and the actor never holds test mode (the owner turns
 * it on and off while the session lives; the actor is never changed).  A
 * RECORD that keeps who acted takes the character's test mode AT ITS WRITE,
 * beside the kind: actorRow() adds `test: true`.  So the owner's test play
 * can be told apart for ever after, and the actor stays one thing.
 *
 * WRITTEN UNDER ONE KEY on rows that are written already (SHAPES part 1:
 * "a record that keeps who acted keeps the actor under one key, never its
 * fields flat beside the record's own"): an `xfer:` row's `actor` (xfer.js),
 * and the day's book's parts, test play under its own key `test`
 * (daybook.js bookAddBy).  No new row, no new put.
 *
 * THE KILL SWITCH `actor: false` in the live flags (actorOff): no row takes
 * an actor, the day's book adds test play with play as before, and the cap
 * `actor` is not advertised -- every row exactly as before.  The actor is
 * still made on the session (memory only, read by nothing else yet), so the
 * switch thrown back on needs no rejoin.
 *
 * Suite: server/test/actor.test.mjs.  The spec is this header and SHAPES
 * part 1.  Imports nothing (daybook.js and xfer.js import it). */

export const ACTOR = Object.freeze({
  V: 1,
  KINDS: Object.freeze(['person', 'qa', 'owner', 'system', 'helper']),
  WAYS: Object.freeze(['socket', 'http', 'admin', 'room']),
  /* the kinds a way in makes today (the header): `qa` and `helper` none */
  BUILT: Object.freeze(['person', 'owner', 'system']),
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** `actor: false` in the live flags. */
export function actorOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && own(f, 'actor') && f.actor === false);
}

/* The one maker: every field, frozen.  Not exported: an actor is made only
   at a way in (the three below). */
function make(kind, pid, stint, wayIn) {
  return Object.freeze({
    kind,
    pid: typeof pid === 'string' && pid ? pid : null,
    principal: null,
    stint: typeof stint === 'number' && Number.isFinite(stint) ? stint : null,
    wayIn,
    permit: null,
  });
}

/** 3. The room: what settles with no hand behind it. */
export const ROOM_ACTOR = make('system', null, null, 'room');

/** 2. The admin routes' owner (admin.js _adminAuth's yes).  Made here so
 *  there is one maker; no row reads it yet. */
export function actorOwner() {
  return make('owner', null, null, 'admin');
}

/** The sitting's id: the worker's clock, one a room at most a ms (two joins
 *  in one ms -- a takeover -- never share one). */
export function stintNext(room, now) {
  const t = Math.floor(typeof now === 'number' && Number.isFinite(now) ? now : Date.now());
  const last = room && typeof room._stintLast === 'number' ? room._stintLast : 0;
  const s = t > last ? t : last + 1;
  if (room) room._stintLast = s;
  return s;
}

/** 1. The socket: made once, where the join names the character.  A session
 *  that has an actor keeps it (returns it unchanged). */
export function actorSocket(room, session, pid, now, stint) {
  if (!session || typeof session !== 'object') return null;
  if (session.actor) return session.actor;
  if (typeof pid !== 'string' || !pid) return null;
  /* v2.3.6481 (card WHO PR 2): the sitting's stint when the join carried one
     on (sitting.js sitOpen: a reconnect or a deploy inside the gap), else a
     new one of this socket's */
  const a = make('person', pid, typeof stint === 'number' && Number.isFinite(stint) && stint > 0 ? stint : stintNext(room, now), 'socket');
  try { Object.defineProperty(session, 'actor', { value: a, enumerable: true, writable: false, configurable: false }); }
  catch (e) { return null; }
  return a;
}

/** The actor of `pid`'s live session (the socket's), or null.  An HTTP call
 *  that passed _httpAuthCheck acts as this (the header, 2). */
export function actorOf(room, pid) {
  if (!room || typeof pid !== 'string' || !pid || !room.sessions) return null;
  for (const s of room.sessions.values()) {
    if (s && s.id === pid && s.phase !== 'gone' && s.actor) return s.actor;
  }
  return null;
}

/** Is `rec` (a live player's state) in test mode now?  The room's own
 *  question (testmode.js _testMode: the record's mark and the `testmode`
 *  switch), else the mark alone. */
export function actorTest(room, rec) {
  if (!rec || typeof rec !== 'object') return false;
  if (room && typeof room._testMode === 'function') return room._testMode(rec);
  return rec._testMode === true;
}

/** What a row keeps of an actor, under its one key: the fields that are not
 *  empty, and `test: true` beside the kind when its character is in test
 *  mode at the write.  null for no actor. */
export function actorRow(room, actor) {
  if (!actor || typeof actor !== 'object' || ACTOR.KINDS.indexOf(actor.kind) < 0) return null;
  const out = { kind: actor.kind };
  if (actor.pid) {
    const ps = room && room.playerState ? room.playerState[actor.pid] : null;
    if (actorTest(room, ps)) out.test = true;
    out.pid = actor.pid;
  }
  if (actor.principal) out.principal = actor.principal;
  if (actor.stint !== null && actor.stint !== undefined) out.stint = actor.stint;
  out.wayIn = actor.wayIn;
  if (actor.permit) out.permit = actor.permit;
  return out;
}
