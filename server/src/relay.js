/* ═══ v2.3.3304: THE RELAY IS AN ALLOWLIST, AND IT SAYS WHO SENT IT ═══
 *
 * Found by the architecture review (2026-10-17).  The router's default
 * branch (index.js _onMessage) relays a phone's message to the others in the
 * room: chat, an emote, a swing, an arrow, a roll, a trade, duel or threat
 * handshake.  Two things were wrong with it:
 *
 *   1. It relayed ANY type that was not in PRIVILEGED_EVENTS -- a deny-list.
 *      Every type the worker sends itself is on it (wire-audit holds that),
 *      but a type the phone HANDLES that no worker and no phone sends -- an
 *      old handler, a dormant one -- could be sent by anyone, and junk of any
 *      type went out to every socket within the relay budget.  Now only the
 *      types an honest phone relays go through (RELAY.TYPES); the rest are
 *      dropped, silently, as a privileged type always was.
 *
 *   2. The worker stamped the sender on the message (`from`), but the phone
 *      read the PAYLOAD's `id` first (wsClient.js: `payload.id || from`), and
 *      several of its handlers read the payload's own `from` and `fromName`
 *      (a clan invite, a duel request, a threat, a trade's note).  So a
 *      script could relay "Bob died", "Bob rolled", "Bob invites you to his
 *      clan" in Bob's name.  Now every relay is REBUILT -- {type, payload}
 *      and nothing else, the payload a copy whose sender fields are the
 *      worker's: `id` always, and `from` / `playerId` (the id) and
 *      `fromName` / `playerName` / `name` (the name) wherever the phone put
 *      one.  Chat has worked that way since v2.3.1970 (_sanitizeChatRelay);
 *      now every relay does.  An honest phone already sends its own id and
 *      name in each, so nothing it sends reads differently.
 *
 * `relaylist: false` in the live flags relays every type that is not
 * privileged again (the old deny-list); the rebuild stays, as it changes
 * nothing an honest phone sends.  relay.test.mjs holds the list to the
 * phone's own code: every broadcast in src/ is a router case, a relay, or a
 * privileged type the worker drops on purpose.
 */

export const RELAY = Object.freeze({
  /* The broadcasts an honest phone sends that the router has no case for,
     so they reach the default branch -- each drawn by the others' pages
     (gameEvents.js processGameEvent) and several settled on the way through
     (the trade, duel and threat intercepts, the clan invite's record). */
  TYPES: Object.freeze(new Set([
    'arena_bet',              /* PartyPanel: a bet on an arena fighter, shown to the others */
    'campfire_lit',           /* BroTown: a fire you lit, drawn where it burns */
    'chat',                   /* chat.js, ChatBubble: room chat (_sanitizeChatRelay) */
    'clan_invite',            /* InspectPlayerPanel: _observeClanInvite records it */
    'duel_accept',            /* DuelRequestPanel: _interceptDuel settles it */
    'duel_decline',           /* DuelRequestPanel: _interceptDuel */
    'duel_request',           /* an older phone's plain duel: _interceptDuel settles it */
    'duel_wager_request',     /* InspectPlayerPanel: _interceptDuel */
    'emote',                  /* interactions.js */
    'gather_node',            /* BroTown: the tree you chop, for a watcher */
    'monster_dmg_at',         /* monsterCombat/projectiles: a local monster's number (no worker monsters) */
    'player_died_to_monster', /* your knockout, drawn on the others' screens */
    'player_dodge',           /* dodge.js, abilities.js: a roll, a lunge, a dash */
    'player_hurt_by_monster', /* monsterCombat/projectiles: a local monster's hit (no worker monsters) */
    'player_jump',            /* jumpActions.js */
    'player_projectile',      /* monsterCombat, dodge, playerActions: an arrow or bolt */
    'player_respawned',       /* your corpse cleared */
    'player_shield',          /* shieldToggle, playerActions: your guard up or down */
    'player_swing',           /* monsterCombat, abilities, playerActions: a swing */
    'pvp_confirmed',          /* gameEvents: a hit between players, confirmed to the attacker */
    'pvp_threat',             /* InspectPlayerPanel: _interceptThreat settles it */
    'stunned',                /* gameEvents: a stun, told to the one who caused it */
    'threat_response',        /* ThreatIncomingPanel: _interceptThreat */
    'trade_accept',           /* IncomingTradePanel: _interceptTrade settles it */
    'trade_offer',            /* TradePanel: _interceptTrade records it */
    'trade_reject',           /* IncomingTradePanel */
  ])),
  /* the payload's own names for the sender's id, and for the sender's name */
  ID_KEYS: Object.freeze(['from', 'playerId']),
  NAME_KEYS: Object.freeze(['fromName', 'playerName', 'name']),
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const relayMethods = {
  /* May a phone relay a message of this type to the others? */
  _relayAllowed(type) {
    if (RELAY.TYPES.has(type)) return true;
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'relaylist') && !f.relaylist);
  },

  /* The relay as it goes out: a new message, its payload a copy in the
     sender's name.  Anything else the phone put on the message is left
     behind (an honest phone sends {type, payload} and nothing else:
     wsClient.js channelShim). */
  _relayBuild(session, msg) {
    const src = msg && msg.payload;
    const p = (src && typeof src === 'object' && !Array.isArray(src)) ? { ...src } : {};
    p.id = session.id;
    for (const k of RELAY.ID_KEYS) if (own(p, k)) p[k] = session.id;
    const name = this._relayName(session);
    for (const k of RELAY.NAME_KEYS) if (own(p, k)) p[k] = name;
    return { type: msg.type, payload: p };
  },

  /* The worker's own copy of who this is -- chat's (_sanitizeChatRelay):
     the stored character name where there is one, else the name the join
     sanitised (join.js sanitizeDisplayName). */
  _relayName(session) {
    const ps = this.playerState[session.id];
    return (ps && typeof ps.name === 'string' && ps.name) || session.name || 'Bro';
  },
};
