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

  /* ── the room's own ── */
  'shop_stock':       M('goods', 'room', 'Diego\'s pile: what he bought, sold on to the next'),
  'oplog:':           M('none', 'room', 'the stamps'),
  'mkt_hist:':        M('none', 'room', 'prices'),
  'devlock:filled':   M('none', 'room', 'a one-time fill'),
  'arena_house':      M('none', 'room', 'the house\'s gold this hour, a count (the gold is minted when paid)'),
  'harden_h5_log':    M('none', 'room', 'a mint log'),
  'device:':          M('none', 'room', 'a device\'s characters'),
  'admin_log':        M('none', 'room', 'the operator\'s log'),
  'liveflags':        M('none', 'room', 'the live flags'),
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
