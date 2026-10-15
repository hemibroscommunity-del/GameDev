/* ═══ v2.3.3245: EVENTS BY PLACE (the split plan's Phase 0d) ═══
 *
 * Owner, 2026-10-13: "Go recommended but I want you to stress test to see
 * what can be optimized."  The plan's Phase 0d (docs/SERVER-SPLIT-PLAN.md).
 *
 * Every event the room batches into a tick (`this.eventBuffer`: a monster's
 * hit, a player's swing or arrow, a kill) went to EVERY phone in the room,
 * wherever it happened.  The load test with the swings and arrows a phone
 * really relays (load.mjs --relays --events) measured ~50 events and ~9 KB a
 * second on every phone at 120 players, nearly all of them about fights far
 * off the phone's screen.  That grows with the square of the crowd: at 1,000
 * players it would be about as much as everything else a phone is sent.
 *
 * Now an event that happens AT A PLACE says where (`placeOf` below, from the
 * event's own fields and the room's state, never from what a phone wrote),
 * and the tick sends it (tick.js `eventsFor`):
 *   - to the players it is about (`who`: the attacker, the one attacked, the
 *     sender of a relay), wherever they are -- a bow's hit can land far from
 *     the bow, and the shooter's own damage number comes only from it;
 *   - in the Wheel, to a v2 phone within R of it -- the distance it keeps
 *     hearing about a monster (wheelzone.js INTEREST_OUT), so every monster a
 *     phone still knows has all its events, and past the players it draws
 *     (FAR_PLAYERS.NEAR_R 2,400) and the hit sounds it hears (hitSounds.js
 *     EAR_FAR 1,150);
 *   - anywhere else, to the phones in the same zone (an old v1 phone in the
 *     Wheel too: its tick is shared, not built for it).
 * Every other event still goes to everyone, as before: chat and emotes, duels,
 * trades, clans, the arena, the jackpot, a hit between players, the events a
 * phone keeps (kills, loot piles, a raised shield, a mummy's change, a lit
 * campfire: below), and any type not named here.  A phone with no zone yet hears
 * everything.  So the list is an ALLOWLIST: a new event type stays room-wide
 * until it is placed here on purpose.
 *
 * Nothing about an event changes on the wire: a phone near it gets exactly
 * the bytes it got before.  A client already ignores an event about a monster
 * or a player it does not have (gameEvents.js), and the room has always sent
 * a zone's events to phones in other zones, where they did nothing.
 * Deploy-order safe both ways, no caps flag.  `eventplace: false` in the live
 * flags sends every event to everyone again from the next tick.
 */

export const EVENT_PLACE = Object.freeze({
  /* game px: wheelzone.js WHEEL.INTEREST_OUT (test/event-place.test.mjs pins
     the two together) */
  R: 2800,
});

/* the room's own events about a place.  For each type:
     m    -- the payload field naming the monster it is about (its live place,
             looked up in this.monsters[payload.zone]);
     xy   -- payload fields holding the place, used when there is no monster
             to look up (or it is gone);
     p    -- a payload field naming the PLAYER it is about, whose place is used
             when neither of the above gives one;
     who  -- payload fields naming players who always get it.
   A zone is the payload's `zone`; without one the event stays room-wide. */
const ROOM_PLACED = Object.freeze({
  monster_hit: { m: 'monsterId', who: ['attackerId'] },
  monster_attack: { m: 'monsterId', xy: ['attackerX', 'attackerY'], who: ['targetId'] },
  monster_ability: { m: 'monsterId', xy: ['x', 'y'], who: ['targetId'] },
  monster_projectile: { m: 'monsterId', xy: ['x', 'y'] },
  fire_trail: { xy: ['x', 'y'], m: 'monsterId' },
  /* v2.3.3264: a player's parry (pvpextras.js _pvpParry) also names the
     player it staggers, who must hear it wherever the room has them */
  parry: { xy: ['x', 'y'], m: 'monsterId', who: ['targetId', 'attackerId'] },
  arrow_boom: { xy: ['x', 'y'], who: ['id'] },
  element_nova: { xy: ['x', 'y'], who: ['id'] },
  ability_windup: { p: 'playerId', who: ['playerId'] },
});

/* what a phone relays about what it does where it stands (index.js's default
   branch, which stamps `from` with the sender's session id): placed where the
   ROOM has the sender, never where the payload says */
const RELAY_PLACED = new Set([
  'player_swing', 'player_projectile', 'player_dodge', 'player_jump',
  'monster_dmg_at', 'player_hurt_by_monster', 'gather_node',
]);
/* NOT placed, though they happen at a place, because a phone keeps what they
   say until the next one (a client audit of every handler, 2026-10-13): a
   phone that missed one would draw it wrong when it walked up later --
     monster_kill       a phone in the Wheel keeps a copy of EVERY monster and
                        is told of a far one's death only by this; one that
                        comes back into reach still dead (wheelzone.js
                        _wheelInterest sends it whole) would otherwise read as
                        a kill on the spot (wsClient.js, the tick's alive ->
                        dead edge): a remnant pile that never goes, and a
                        death sound;
     player_shield      the shield stays up (or down) until the next toggle;
     monster_transform  the mummy that became a skeleton, on no other wire;
     campfire_lit       sent once, and the cook stands over the fire for 45 s;
     loot_*             a pile lies there until it is taken or despawns.
   Each is rare and small; they go to everyone, as before. */

export const EVENT_PLACED_TYPES = Object.freeze([...Object.keys(ROOM_PLACED), ...RELAY_PLACED]);

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const idOk = (v) => typeof v === 'string' && v.length > 0;
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* Where `ev` happened: { z, x, y, who } (x/y null when only the zone is
   known), or null for an event that goes to everyone.  `monsterOf(zone, id)`
   finds a monster in the room; `playerOf(id)` a player's state. */
export function placeOf(ev, monsterOf, playerOf) {
  if (!ev || typeof ev !== 'object' || typeof ev.type !== 'string') return null;
  if (RELAY_PLACED.has(ev.type)) {
    if (!idOk(ev.from)) return null;
    const ps = playerOf(ev.from);
    if (!ps || !idOk(ps.z)) return null;
    return { z: ps.z, x: num(ps.x), y: num(ps.y), who: [ev.from] };
  }
  if (!own(ROOM_PLACED, ev.type)) return null;
  const rule = ROOM_PLACED[ev.type];
  const p = ev.payload;
  if (!p || typeof p !== 'object' || !idOk(p.zone)) return null;
  let x = null, y = null;
  if (rule.m && p[rule.m] !== undefined && p[rule.m] !== null) {
    const m = monsterOf(p.zone, p[rule.m]);
    if (m) { x = num(m.x); y = num(m.y); }
  }
  if ((x === null || y === null) && rule.xy) { x = num(p[rule.xy[0]]); y = num(p[rule.xy[1]]); }
  if ((x === null || y === null) && rule.p && idOk(p[rule.p])) {
    const ps = playerOf(p[rule.p]);
    if (ps && ps.z === p.zone) { x = num(ps.x); y = num(ps.y); }
  }
  if (x === null || y === null) { x = null; y = null; }
  let who = null;
  if (rule.who) for (const k of rule.who) if (idOk(p[k])) (who || (who = [])).push(p[k]);
  return { z: p.zone, x, y, who };
}

/* Whether the phone of session `sid`, whose player is `ps`, is sent an event
   placed at `place`.  `near`: the phone is told about its surroundings only
   (a v2 phone with a place in the Wheel, tick.js), so distance counts;
   otherwise its zone does. */
export function eventHeardBy(place, sid, ps, near) {
  const who = place.who;
  if (who) for (let i = 0; i < who.length; i++) if (who[i] === sid) return true;
  if (!ps || !idOk(ps.z)) return true;   /* no zone yet: everything, as before */
  if (place.z !== ps.z) return false;
  if (!near || place.x === null) return true;
  const dx = place.x - ps.x, dy = place.y - ps.y;
  return dx * dx + dy * dy <= EVENT_PLACE.R * EVENT_PLACE.R;
}

export const eventPlaceMethods = {
  /* `eventplace: false` in the live flags: every event to everyone again */
  _eventPlaceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'eventplace') && !f.eventplace);
  },

  /* The place of each of a tick's events (an array beside them, null where an
     event goes to everyone), or null when none has one -- the tick's old
     path, untouched.  A zone's monsters are indexed by id at most once a
     tick, and only for a zone an event names. */
  _eventPlaces(events) {
    if (!events || events.length === 0 || this._eventPlaceOff()) return null;
    let byZone = null;
    const monsterOf = (zone, id) => {
      if (!byZone) byZone = new Map();
      let idx = byZone.get(zone);
      if (idx === undefined) {
        const list = this.monsters && own(this.monsters, zone) ? this.monsters[zone] : null;
        idx = null;
        if (Array.isArray(list)) {
          idx = new Map();
          for (const m of list) if (m && m.id !== undefined && !idx.has(m.id)) idx.set(m.id, m);
        }
        byZone.set(zone, idx);
      }
      return idx ? idx.get(id) || null : null;
    };
    const playerOf = (id) => (this.playerState && own(this.playerState, id) ? this.playerState[id] : null);
    let out = null;
    for (let i = 0; i < events.length; i++) {
      const pl = placeOf(events[i], monsterOf, playerOf);
      if (pl) {
        if (!out) out = new Array(events.length).fill(null);
        out[i] = pl;
      }
    }
    return out;
  },
};
