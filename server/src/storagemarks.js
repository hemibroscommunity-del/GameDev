/* ═══ v2.3.5082: THE STORAGE REGISTRY'S MARKS -- what each record holds, and whose it is ═══
 *
 * Steps 4.4 and 4.7 of docs/GRAND-PLAN.md (card E, PR 3; the shape:
 * docs/SHAPES.md part 3, "The mark on a record that holds value").  The
 * registry itself is the table in ARCHITECTURE-HANDOFF rule 2, and precheck's
 * `storage-keys` PARSES that markdown, so it gets no new column: the marks
 * are this table in code, and tools/guards/storage-marks.test.mjs fails a
 * prefix in one and not the other.  Its key is the registry's own spelling:
 * a prefix up to its first `<` (`rpg:` for `rpg:<playerId>`), or a single
 * key whole (`shop_stock`, `jackpot:draw`).
 *
 *   value   what the record HOLDS of the world's value (SHAPES part 3, "What
 *           is summed"): `gold`, `goods` (bag counts, gear, weapons, pets),
 *           `both`, or `none`.  The world's sum (step 4.4) counts every record
 *           not `none`; its suite fails a record marked here that it does not
 *           count.  A COPY of value is `none` (a snapshot, the provenance
 *           ledger's copy of a piece): counting it would count twice.
 *   whose   `player` (keyed by one character: restored with them), `between`
 *           (held between two or more: an escrow, a listing, a pot, a group's
 *           record), or `room` (the room's own: a board, Diego's pile, a flag).
 *           Read by the restore and the paged export (card R, step 4.7).
 *
 * Every place an escrow road names (gold.js ESCROW_PLACES) is marked as
 * holding value; the guard holds that too.  No imports. */

export const MARK_VALUES = Object.freeze(['gold', 'goods', 'both', 'none']);
export const MARK_WHOSE = Object.freeze(['player', 'between', 'room']);

const M = (value, whose, why) => Object.freeze({ value, whose, why });
export const STORAGE_MARKS = Object.freeze({
  /* ── a character's own ── */
  'rpg:':             M('both', 'player', 'the purse, the bag, the gear and weapons worn and stashed'),
  'bank:':            M('both', 'player', 'the vault: gold and stacks out of a death\'s reach'),
  'inbox:':           M('both', 'player', 'mail waiting: credits already theirs, gold, goods, weapons, gear, pets'),
  'pets:':            M('goods', 'player', 'the pets themselves (their only proof)'),
  'gear_prov:':       M('none', 'player', 'a COPY of each piece minted (the ownership proof); the piece is in rpg: or a listing'),
  'auth:':            M('none', 'player', 'the login'),
  'keyidx:':          M('none', 'player', 'a login key\'s character'),
  'codex:':           M('none', 'player', 'kills counted'),
  'fishlog:':         M('none', 'player', 'catches to weigh, a count (the fish are in the bag)'),
  'achv:':            M('none', 'player', 'achievements (the points ride rpg:)'),
  'life:':            M('none', 'player', 'a death\'s notes'),
  'aponce:':          M('none', 'player', 'points paid once'),
  'char:':            M('none', 'player', 'the name and look'),
  'guild_claims:':    M('none', 'player', 'quest-ladder claims'),
  'gearlock:':        M('none', 'player', 'a guard\'s gear lock'),
  'nml_state:':       M('none', 'player', 'skulls and locks'),
  'farm:':            M('none', 'player', 'beds and what grows (a crop is made at its harvest; the seed was spent)'),
  'farmorders:':      M('none', 'player', 'the day\'s orders'),
  'harden_ledger:':   M('none', 'player', 'hardening tries'),
  'botstat:':         M('none', 'player', 'anti-bot evidence'),
  'frozen:':          M('none', 'player', 'an operator freeze'),
  'silenced:':        M('none', 'player', 'the owner\'s silence (v2.3.5621, silence.js)'),
  'testmode:':        M('none', 'player', 'test mode'),
  'rpgsnap:':         M('none', 'player', 'a COPY of the record (daily, and before a restart or a restore)'),
  'rpgsnap_at:':      M('none', 'player', 'the snapshot\'s clock'),
  'lspin:':           M('none', 'player', 'the login wheel\'s stamp (its gold goes by the mail)'),
  'cadence:':         M('none', 'player', 'the login streak (the one scope today)'),
  /* the daily spin's open pot is a stake in a game still being played (double
     or nothing can end it), paid by `spinpot:` as a mint (gold.js MAIL_CLASSES) */
  'daily_rewards:':   M('none', 'player', 'the spin\'s open pot (a stake until paid), the day\'s quests, the season'),
  'acc:':             M('none', 'player', 'accuracy'),
  'friends:':         M('none', 'player', 'friends'),
  'friend_msg:':      M('none', 'player', 'messages waiting'),
  'chat_mute:':       M('none', 'player', 'a mute list'),
  'bro_link:':        M('none', 'player', 'a wallet link'),
  'chain_score:':     M('none', 'player', 'a score written on the chain'),
  'clan_by_player:':  M('none', 'player', 'which clan'),
  'party_by_player:': M('none', 'player', 'which party'),

  /* ── held between players: escrows, listings, pots, groups ── */
  'mkt_order:':       M('both', 'between', 'a resting order: a buy\'s gold, a sell\'s weapon'),
  'store_listing:':   M('both', 'between', 'a listing\'s goods, its live bid\'s and offers\' gold'),
  'duelEscrow:':      M('gold', 'between', 'both wagers'),
  'arena_entry:':     M('gold', 'between', 'an entry fee held'),
  'arena_stake:':     M('gold', 'between', 'a sponsorship stake held'),
  'arena_settle:':    M('none', 'between', 'an arena match\'s settlement plan (the gold is in its stakes until paid)'),   /* v2.3.5089 */
  'bounty:':          M('gold', 'between', 'a fine on a head, paid to the killer'),
  'jackpot:draw':     M('gold', 'between', 'the weekly pool'),
  'trade2wpn:':       M('goods', 'between', 'a weapon in a trade window, or owed after it'),
  'death_pile:':      M('goods', 'between', 'a dead player\'s pile on the ground'),
  'store_thread:':    M('none', 'between', 'messages on a listing'),
  'clan:':            M('none', 'between', 'a clan (retiring)'),
  'clan_war:':        M('none', 'between', 'a clan war'),
  'party:':           M('none', 'between', 'a party that lasts'),
  'ally:':            M('none', 'between', 'an alliance'),
  'ally_war:':        M('none', 'between', 'an alliance war (its pay is a mint, by the mail)'),
  /* v2.3.5092: what moved between two players, kept to be read (xfer.js); the value is in the purses */
  'xfer:':            M('none', 'between', 'the transfer ledger (a record of what moved, not what is held)'),
  'play_trace:':      M('none', 'player', 'a recording of the owner\'s play, labelled human (v2.3.6482, playtrace.js): a sample, not value'),

  /* ── the room's own ── */
  'shop_stock':       M('goods', 'room', 'Diego\'s pile: what he bought, sold on to the next'),
  'oplog:':           M('none', 'room', 'the stamps'),
  'mkt_hist:':        M('none', 'room', 'prices'),
  'devlock:filled':   M('none', 'room', 'a one-time fill'),
  'arena_house':      M('none', 'room', 'the house\'s gold this hour, a count (the gold is minted when paid)'),
  'harden_h5_log':    M('none', 'room', 'a mint log'),
  'device:':          M('none', 'room', 'a device\'s characters'),
  'ownerdev:':        M('none', 'room', 'a device the owner\'s own characters joined from (v2.3.5627, silence.js): a freeze never holds it'),
  'admin_log':        M('none', 'room', 'the operator\'s log'),
  'liveflags':        M('none', 'room', 'the live flags'),
  'seats':            M('none', 'room', 'who was in, for a restart\'s held seats (v2.3.5606, seathold.js)'),
  'hidden_settings':  M('none', 'room', 'the hidden settings'),
  'ace_board':        M('none', 'room', 'a board'),
  'fish_board':       M('none', 'room', 'a board'),
  'spin_board':       M('none', 'room', 'a board'),
  'accday:':          M('none', 'room', 'a day\'s accuracy'),
  'daybook:':         M('none', 'room', 'the day\'s book (a count of what moved, not what is held)'),
  'artwatch_seen':    M('none', 'room', 'the owner\'s mark'),
  'motd':             M('none', 'room', 'the announcement'),
  'metrics:':         M('none', 'room', 'a day\'s economy snapshot (a count)'),
  'capegrant:':       M('none', 'room', 'a cape\'s tickets (the cape itself is a bag item)'),
  'cape_start_id':    M('none', 'room', 'a contest\'s start'),
  'chat_report:':     M('none', 'room', 'a report'),
  /* v2.3.5285 (card R PR 6): a character deleted by its restart is booked
     here, what it held burned and its own count kept; the world's sum reads
     its net (worldsum.js NET_READERS).  It holds no value itself */
  'econ_gone':        M('none', 'room', 'the count of every character a restart deleted (what each held, booked burned)'),
});

/** The marks of a storage key (`rpg:bp_x`, `shop_stock`), or null: the
 *  longest marked prefix it starts with, or the key itself. */
export function marksOf(key) {
  if (typeof key !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(STORAGE_MARKS, key)) return STORAGE_MARKS[key];
  let best = null;
  for (const p of Object.keys(STORAGE_MARKS)) if (p.endsWith(':') && key.startsWith(p) && (!best || p.length > best.length)) best = p;
  return best ? STORAGE_MARKS[best] : null;
}

/* ═══ v2.3.5285: A PLAYER'S RESTORE, MADE FROM THE REGISTRY (grand plan step 4.7, card R PR 6) ═══
 * (spec docs/specs/restore.md, "One player's restore"; restore.js playerRestore)
 *
 * Every record the marks call `whose: 'player'` is placed here: RESTORED (a
 * restore puts it back from the snapshot, when the snapshot holds it) or LEFT
 * (a restore never touches it), with why.  restore.test fails a player
 * record this table does not place, a place for a record that is not a
 * player's, and a restored one that is not one key a player (`<prefix><pid>`).
 * Records held between players (`whose: 'between'`) are never rewound: they
 * are the other side's too; the restore says what of theirs it found there.
 *
 * What is restored is what holds a character's VALUE, theirs alone: the
 * character, the vault, the pets.  Everything else is a count, a claim, a
 * login, a lever or a copy: rewinding it fixes no broken save, and for a
 * claim (a prize paid once, a day's spin) rewinding it would pay twice. */
const W = (way, why) => Object.freeze({ way, why });
export const RESTORE_WAYS = Object.freeze({
  'rpg:':             W('restored', 'the character: purse, bag, gear, levels, quests (its gold, bag and stashes through their doors, the difference booked)'),
  'bank:':            W('restored', 'the vault, theirs alone (its difference booked on the character\'s count)'),
  'pets:':            W('restored', 'the pets: their only proof'),
  'inbox:':           W('left', 'mail waiting: credits others\' roads sent, each stamped once -- rewound, one claimed since would be paid again, one sent since lost'),
  'gear_prov:':       W('left', 'the ownership ledger: it grows with each mint and gives a row to a listing; a restored piece whose row is gone loads as `legacy` (kept, not sellable), never sellable twice'),
  'auth:':            W('left', 'the login: an old key must never come back'),
  'keyidx:':          W('left', 'a login key\'s character: the same'),
  'codex:':           W('left', 'kills counted: a count, not value'),
  'fishlog:':         W('left', 'catches to weigh: a count (the fish are in the bag)'),
  'achv:':            W('left', 'achievements earned stay earned: one is never paid twice'),
  'life:':            W('left', 'a death\'s notes: that moment\'s'),
  'aponce:':          W('left', 'points paid once stay paid'),
  'char:':            W('left', 'the name and look: theirs now'),
  'guild_claims:':    W('left', 'quest-ladder claims stay made: a rung is never paid twice'),
  'gearlock:':        W('left', 'a guard\'s gear lock: that moment\'s'),
  'nml_state:':       W('left', 'skulls and locks: No man\'s land\'s justice is not undone by a restore'),
  'farm:':            W('left', 'beds and what grows: time, not value the sum counts'),
  'farmorders:':      W('left', 'the day\'s orders: the day\'s limit'),
  'harden_ledger:':   W('left', 'hardening tries: a count'),
  'botstat:':         W('left', 'anti-bot evidence: never rewound'),
  'play_trace:':      W('left', 'a recording of play (v2.3.6482): what happened, never rewound'),
  'frozen:':          W('left', 'the owner\'s lever'),
  'silenced:':        W('left', 'the owner\'s silence (v2.3.5621): a restore never lifts one'),
  'testmode:':        W('left', 'the owner\'s lever'),
  'rpgsnap:':         W('left', 'the snapshots themselves'),
  'rpgsnap_at:':      W('left', 'the snapshot\'s clock'),
  'lspin:':           W('left', 'the login wheel\'s stamp: a day\'s spin is never paid twice'),
  'cadence:':         W('left', 'the login streak: days logged in stay logged'),
  'daily_rewards:':   W('left', 'the spin\'s open pot and the day\'s quests: the day\'s limit'),
  'acc:':             W('left', 'accuracy: a count'),
  'friends:':         W('left', 'friends: the other side\'s too'),
  'friend_msg:':      W('left', 'messages waiting: others\' words'),
  'chat_mute:':       W('left', 'a mute list: theirs now'),
  'bro_link:':        W('left', 'a wallet link: theirs now'),
  'chain_score:':     W('left', 'a score written on the chain: the chain is not rewound'),
  'clan_by_player:':  W('left', 'which clan: the clan\'s record is between players'),
  'party_by_player:': W('left', 'which party: the party\'s record is between players'),
});
export const RESTORE_WAY_NAMES = Object.freeze(['restored', 'left']);

/** The prefixes a player's restore puts back, `rpg:` first. */
export function restoredPrefixes() {
  return Object.keys(RESTORE_WAYS).filter((p) => RESTORE_WAYS[p].way === 'restored');
}
