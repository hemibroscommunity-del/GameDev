/* ═══ v2.3.4510: ONE FIGHT-LOCK TABLE ═══
 *
 * In No man's land a player killed by another player loses what they carry
 * to the killer (nomansland.js _nmlOnDeath): the whole bag, the gold, the
 * spare weapons, armour, legs, shields and amulets -- never what they wear
 * (unless they are a red skull), the Bank, the pets, a cape, the XP, a gold
 * bar or nugget, or anything already credited to someone else.  The fight
 * lock (nomansland.js _bagLockedByFight, v2.3.3183) stops a losing player
 * emptying the bag first -- but it guarded six roads, and the state-machine
 * sweep (2026-11-03, V21) found at least seven more open: forging armour,
 * crafting an amulet, the jackpot, a duel's stake, an arena stake, the three
 * gambles, and a dungeon mouth an honest tap walks through with the bag.
 *
 * THIS FILE IS THE ONE PLACE TO READ.  Every message (and HTTP road) that
 * moves gold or bag goods out of what the loss takes, turns them into
 * something it does not take, gives them to anyone, or wagers them, has a
 * row in FIGHT_LOCK naming its gate; every other message the router takes is
 * in FIGHT_OPEN with the reason it moves nothing the loss would take.
 * server/test/fight-lock.test.mjs fails a router case or a relayed type that
 * is in neither, so a new handler that spends gold or goods cannot be added
 * without a row (as hit-door.test does for _applyDamage).
 *
 * A ROW:
 *   sw      the live flag that switches it off.  `fightlock` rows are the
 *           v2.3.3183 roads, guarded inside their own handlers and listed
 *           here only to be read in one place; `fightlock: false` still
 *           opens everything, as it always did.  The new rows answer to
 *             fightlocktable  the counters in town, where a fight is not
 *                             (a modified phone's road), and a duel's
 *                             accept or a trade's staging, which go nowhere
 *                             mid-fight anyway -- false: today's six roads;
 *             fightlockdoor   the dungeon mouth, which an honest tap meets;
 *             fightlockequip  putting on a spare weapon, which an honest
 *                             player can meet too (and a forged shield
 *                             report).
 *             fightlockreset  (v2.3.4627) restarting the character, from
 *                             Settings or from the character picker.
 *             fightlockarmor  (v2.3.4626) putting on spare armour or legs,
 *                             or taking off armour, legs, the shield or the
 *                             amulet.
 *   refuse  the router answers the message with its HANDLER'S OWN refusal --
 *           the same type and shape (no new message), or, where the handler
 *           refuses in silence, silence plus a re-send of what the phone may
 *           have drawn (persistence.js _resendPlayerState, the silent-
 *           refusals way, #1500), so its screen is never left showing a
 *           success the worker refused.
 *   at      instead of `refuse`: asked inside the handler, at its own refusal
 *           (the duel's needs its live challenge, the gift's and the six
 *           roads' already were, the shield's is one outcome of its report).
 *   when    the row holds only for these payloads (the amulet forge's craft
 *           and gem; its smelt and extract bring things INTO the bag).
 *
 * THE GATE (_fightLockHolds): the existing lock, unchanged -- a duel, or a
 * hit between players in the last PVP_HEAL.WINDOW_MS (10 s, cooking.js's
 * clock; no new clock) -- AND the player standing in No man's land, where
 * the loss applies.  A duel in town and the Arena keep their own rules, and
 * the Bank, on the safe ground where no rule blow lands, stays open.  A
 * check that protects the killer: never `_testMode`.
 *
 * Synchronous on purpose: the router asks it before its switch and nothing
 * here awaits, so a bundle's parts still finish in order (TRAPS §182).  One
 * Set lookup a message (FIGHT_GATED) is all the hot path pays. */
import { WEAPON_GEM } from './weapongem.js';
import { SHARD_CRACK } from './shardcrack.js';
import { WEAPON_GEMS, AMULET_GEMS } from './data.js';
import { GEM_ELEMENTS } from './gems.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* the six roads' own words (shop.js, store.js, market.js) */
export const FIGHT_WORDS = 'Not while you are fighting a player';

/* a silent handler's refusal: silence, and what the phone may have drawn
   sent again from the worker's own values */
const resend = (fields) => (room, pid) => {
  const ws = room._wsBySessionId(pid);
  if (ws) room._resendPlayerState(ws, pid, fields);
};
const WEAPON_FIELDS = ['weapon', 'rangedWeapon', 'staffWeapon', 'weaponStash', 'activeSlot'];

export const FIGHT_LOCK = Object.freeze({
  /* ── the v2.3.3183 roads (and v2.3.4375's gift), inside their handlers ── */
  shop_sell: { sw: 'fightlock', at: 'shop.js _shopSell' },
  farm_act: { sw: 'fightlock', at: 'farm.js _handleFarmAct' },                 /* plant, feed */
  farm_order: { sw: 'fightlock', at: 'farmorders.js _handleFarmOrder' },       /* 'order-fight', its own test */
  item_drop: { sw: 'fightlock', at: 'itemdrop.js _handleItemDrop' },
  trade2_confirm: { sw: 'fightlock', at: 'trade2.js _handleTrade2Confirm' },
  trade_offer: { sw: 'fightlock', at: 'trade.js _interceptTrade' },
  trade_accept: { sw: 'fightlock', at: 'trade.js _interceptTrade' },
  'http:/api/store/list': { sw: 'fightlock', at: 'store.js _stCreateListing' },
  'http:/api/store/buy': { sw: 'fightlock', at: 'store.js _storeFetch' },
  'http:/api/store/bid': { sw: 'fightlock', at: 'store.js _storeFetch' },
  'http:/api/market/place': { sw: 'fightlock', at: 'market.js _mktPlaceOrder' },

  /* ── v2.3.4510: turned into what the loss does not take ── */
  /* bars into a piece in the ledger, which the loss cannot reach (V21 S7-23);
     armorforge.js answers nothing ("Could not forge" when no receipt comes) */
  forge_armor: { sw: 'fightlocktable', refuse: resend(['inventory']) },
  /* ore, bars or wood and gold into a blade in your hand (S7-12) */
  forge_weapon: { sw: 'fightlocktable', refuse: resend(['inventory', 'coins', 'lifeSkills', ...WEAPON_FIELDS]) },
  /* gold and bars into the hardness of the blade you hold (S7-12) */
  harden_weapon: {
    sw: 'fightlocktable',
    refuse: (room, pid) => room._hardenSend(pid, { success: false, error: 'not-now', message: 'Cannot harden right now' }),
  },
  /* gold and gold bars into the amulet you wear; a bag gem onto it (S7-15) */
  amulet_forge_request: {
    sw: 'fightlocktable',
    when: (p) => !!p && (p.op === 'craft' || p.op === 'gem'),
    refuse: resend(['coins', 'goldBars', 'amulet', 'inventory', 'lifeSkills']),
  },
  /* a bag gem into the weapon or the shield you wear: the guard lock's word */
  weapon_gem: {
    sw: 'fightlocktable',
    refuse: (room, pid, p) => room._weaponGemSend(pid, {
      ok: false,
      slot: p && typeof p.slot === 'string' && WEAPON_GEM.SLOTS.indexOf(p.slot) >= 0 ? p.slot : null,
      gem: p && typeof p.gem === 'string' && WEAPON_GEMS.has(p.gem) ? p.gem : null,
      reason: 'locked',
    }, false),
  },
  shield_gem: {
    sw: 'fightlocktable',
    refuse: (room, pid, p) => room._shieldGemSend(pid, {
      ok: false, reason: 'locked',
      gem: p && typeof p.gem === 'string' && AMULET_GEMS.has(p.gem) ? p.gem : null,
    }, false),
  },
  /* crafting gems (the Gem Works): a failed cut or crack destroys what the
     killer would take, as a gamble does */
  gem_cut_request: { sw: 'fightlocktable', refuse: resend(['inventory', 'lifeSkills']) },
  shard_crack: {
    sw: 'fightlocktable',
    refuse: (room, pid, p) => room._shardCrackSend(pid, 'shard_crack_result', {
      ok: false, land: p && typeof p.land === 'string' && own(SHARD_CRACK.LANDS, p.land) ? p.land : null, reason: 'fight',
    }, false),
  },
  gem_combine: {
    sw: 'fightlocktable',
    refuse: (room, pid, p) => {
      const rare = !!p && p.rare === true;
      const el = p && typeof p.element === 'string' && (rare ? WEAPON_GEMS.has(p.element) : GEM_ELEMENTS.has(p.element)) ? p.element : null;
      room._shardCrackSend(pid, 'gem_combine_result', { ok: false, element: el, rare, reason: 'fight' }, false);
    },
  },
  /* a golden ticket from the bag into a cape the ledger keeps */
  cape_redeem: { sw: 'fightlocktable', refuse: resend(['inventory', 'cape']) },
  /* gold into room in the Pet House */
  pet_house_buy: { sw: 'fightlocktable', refuse: (room, pid) => room._petbookSend(pid, { op: 'house', error: 'not-now' }) },

  /* ── v2.3.4510: given away, held in an escrow, or wagered ── */
  /* gold into this week's tickets, which no death touches (V21-new-1) */
  jackpot_deposit: { sw: 'fightlocktable', refuse: resend(['coins']) },
  /* the Hall's roll, Ace's coin flip and item wager: spite only, the stake
     is the victim's either way (S6-10) -- all silent in gamble.js */
  gamble_request: { sw: 'fightlocktable', refuse: resend(['coins']) },
  ace_flip_request: { sw: 'fightlocktable', refuse: resend(['coins']) },
  ace_item_flip_request: { sw: 'fightlocktable', refuse: resend(['inventory']) },
  /* gold into an escrowed arena stake (V21-new-3) */
  arena_sponsor: {
    sw: 'fightlocktable',
    refuse: (room, pid, p) => {
      const ws = room._wsBySessionId(pid);
      const out = { code: 'fight', message: FIGHT_WORDS };
      if (p && typeof p.targetId === 'string' && p.targetId.length <= 64) out.targetId = p.targetId;
      if (ws) { try { ws.send(JSON.stringify({ type: 'arena_stake_error', payload: out })); } catch (e) { /* nothing moved */ } }
    },
  },
  /* the 100 g entry into the queue's escrow, refunded on a leave */
  'http:/api/arena/join': { sw: 'fightlocktable', at: 'gladiator.js _arenaFetch' },
  /* gold into an offer's escrow on someone's listing (the auction house's
     buy and bid were guarded, this road was not) */
  store_offer: {
    sw: 'fightlocktable',
    refuse: (room, pid, p) => {
      const listingId = room._scListingId(p && p.listingId);
      if (listingId) room._soSend(pid, 'store_offer_error', { listingId, error: FIGHT_WORDS });
    },
  },
  /* a spare weapon into the trade window's escrow -- a death does not cancel
     the window, and the refund brings it back after */
  trade2_stage_weapon: { sw: 'fightlocktable', refuse: resend(['weaponStash']) },
  /* a duel's stake into its escrow, paid to the partner on ANY death; and a
     duel kill skips the No man's land loss altogether (index.js
     _handlePlayerDeath), so a friend's duel could end a losing fight with
     the bag kept (V21-new-2) -- declined to both, as duel.js refuses */
  duel_accept: { sw: 'fightlocktable', at: 'duel.js _interceptDuel' },

  /* ── v2.3.4510: leaving with the bag ── */
  /* the dungeon mouth, and the leader's party pull through it (V21-new-4) */
  dungeon_start: {
    sw: 'fightlockdoor',
    at: 'dungeon.js _dungeonPullPartyMembers',
    refuse: (room, pid) => room._dungeonError(pid, 'not-now', 'Cannot start a dungeon right now'),
  },

  /* ── v2.3.4510: a spare put on (worn gear stays with a white skull) ── */
  /* a spare blade into the hand; the phone takes the worker's weapon fields
     back (gear.js refuseWeapons) */
  equip_request: { sw: 'fightlockequip', refuse: resend(WEAPON_FIELDS) },
  /* only a report naming a shield the worker does not hold, which cleared
     the arm and so kept EVERY spare shield from the killer: the phone owns
     which shield is on the arm (wsClient.js), so a held spare put on is not
     refused -- the phone could not be told to take it off */
  shield_wear: { sw: 'fightlockequip', at: 'shieldwear.js _handleShieldWear' },

  /* ── v2.3.4627: the character wiped (STATE-MACHINES.md "what is left", from #1523) ── */
  /* A restart deletes the whole character -- the bag, the gold, the stashes --
     and the state goes BEFORE the socket closes (persistence.js
     _resetCharacterData), so the body that would linger and the loss that
     would follow find nothing: a losing player could take it all from the
     killer, out of spite.  Refused while the lock holds, on both roads: the
     Settings button over the socket (its own refusal, `character_reset_refused`,
     a new message: the restart had no refusal before), and the picker's HTTP
     restart (account.js: `reason: 'fight'`), which reaches a bro being played
     on another device. */
  character_reset: { sw: 'fightlockreset', at: 'persistence.js _handleCharacterReset' },
  'http:/api/account/reset': { sw: 'fightlockreset', at: 'account.js _accountReset' },

  /* ── v2.3.4626: armour put on or taken off (STATE-MACHINES.md, from #1523) ── */
  /* Armour and legs are put on through stats_update (the phone moves them
     between its own bag and the slot); the loss leaves what you wear and takes
     the spares the worker holds, so a spare put on mid-fight was saved, and the
     piece it replaced went where the worker does not look until the next join.
     Taking a piece off sent it there too: a red skull's worn armour, shield or
     amulet left the worker's view.  The rest of stats_update moves no goods. */
  stats_update: { sw: 'fightlockarmor', at: 'grids.js _gridsApplyArmor' },
  unequip_request: { sw: 'fightlockarmor', at: 'gear.js _handleUnequipRequest' },
});

/* What the router may refuse itself: the rows with a `refuse` */
export const FIGHT_GATED = new Set(Object.keys(FIGHT_LOCK).filter((k) => typeof FIGHT_LOCK[k].refuse === 'function'));

/* EVERY OTHER MESSAGE THE ROUTER TAKES, and why the loss loses nothing by
   it.  A new case in index.js _onMessage, or a new type in relay.js
   RELAY.TYPES, goes here or in FIGHT_LOCK (fight-lock.test). */
const OPEN_GROUPS = [
  ['moves no goods', [
    'join', 'pose', 'ride', 'dice', 'move', 'pong', 'track', 'map_watch', 'achv_title', 'points_reset',
    'stat_allocate', 'prog3_allocate', 'build_point_earned', 'set_active_slot', 'rest_request',
    'race_start', 'heap_burn', 'reveal_item', 'feedback', 'shop_list', 'shop_quote', 'farm_open', 'bank_open',
    'cape_equip', 'pet_active', 'pet_name', 'pet_release', 'pet_capture', 'trap_arm', 'fish_inspect',
    'fish_board_request', 'spin_board_request', 'ace_board_request',
    'acc_request',   /* v2.3.4545: your own accuracy, read (accuracy.js) */
  ]],
  ['the fight itself', [
    'player_attack', 'monster_damage', 'extraction_start', 'arrow_blast', 'node_strike', 'ability_use', 'ability',
    'element_burst', 'nml_attack', 'nml_lock_ask', 'nml_lock_allow',
  ]],
  ['talk, parties, friends, clans', [
    'party_invite', 'party_accept', 'party_decline', 'party_leave', 'party_kick', 'party_chat', 'alliance_name',
    'alliance_war', 'alliance_board', 'area_chat', 'whisper', 'store_dm', 'store_dm_open', 'bro_nonce', 'bro_verify',
    'friend_request', 'friend_accept', 'friend_decline', 'friend_remove', 'friend_dm', 'chat_mute', 'chat_report',
    'clan_join_accept', 'clan_leave', 'clan_kick', 'clan_war_declare',
  ]],
  /* the window's staging moves nothing; its confirm is a `fightlock` row */
  ['the trade window before its confirm', ['trade2_open', 'trade2_set', 'trade2_ready', 'trade2_pets']],
  ['brings things in', [
    'loot_pickup', 'loginspin_ask', 'loginspin_go', 'loginspin_double', 'loginspin_collect', 'chest_open',
    'rewards_get', 'daily_spin', 'daily_reroll', 'season_claim', 'bank_withdraw', 'guild_quest_turn_in',
    'quest_accept', 'quest_turn_in', 'rise_chest_open', 'trade2_cancel', 'trade2_unstage_weapon',
    'store_offer_cancel', 'store_offer_reply',
  ]],
  /* the 2026-10 rule: what only rearranges the bag stays open (no-mans-
     land.md); the loss takes what comes out, and the XP is the craft's */
  ['rearranges the bag', [
    'shop_buy', 'farm_buy', 'smelt_bar', 'cook_request', 'cook_recipe', 'smith_salvage', 'essence_apply',
    'make_traps', 'make_hardened_wood', 'sell_weapon',
  ]],
  ['eaten or burnt in a fight, by design', ['eat_request', 'potion_drink', 'firemaking_request']],
  /* the Bank's door is on the safe ground, where no rule blow lands
     (bank.js _bankPlaceOk) */
  ['sound by place', ['bank_deposit']],
  /* DIEGO_SHELF is empty; clans are parties (clanparty.js) */
  ['dormant', ['shop_purchase', 'clan_create']],
  /* relay.js RELAY.TYPES: drawn by the other phones only, or a handshake
     whose accept is the row (duel_accept; the gift's trade_offer/accept) */
  ['a relay', [
    'campfire_lit', 'chat', 'clan_invite', 'duel_decline', 'duel_request', 'duel_wager_request',
    'emote', 'gather_node', 'monster_dmg_at', 'player_died_to_monster', 'player_dodge', 'player_hurt_by_monster',
    'player_jump', 'player_projectile', 'player_respawned', 'player_shield', 'player_swing', 'pvp_confirmed',
    'pvp_threat', 'stunned', 'trade_reject',
  ]],
  /* the guards' fine is the THREATENER's, into a bounty paid to whoever
     kills them (threat.js) -- nothing of the sender's moves */
  ['another player\'s fine', ['threat_response']],
];
export const FIGHT_OPEN = Object.freeze(Object.fromEntries(OPEN_GROUPS.flatMap(([why, types]) => types.map((t) => [t, why]))));

export const fightLockMethods = {
  /* a row's switch, written false in the live flags */
  _fightLockSwitchOff(sw) {
    const f = this._liveFlags;
    return !!(sw && f && typeof f === 'object' && own(f, sw) && !f[sw]);
  },

  /* Does the lock hold for `pid`, for a row under switch `sw`?  The existing
     lock (a duel, or a hit between players in the last 10 s; `fightlock:
     false` opens it) while standing where the loss applies. */
  _fightLockHolds(pid, sw, now) {
    if (!pid || typeof pid !== 'string') return false;
    if (this._fightLockSwitchOff(sw)) return false;
    if (typeof this._nmlOff === 'function' && this._nmlOff()) return false;
    if (typeof this._bagLockedByFight !== 'function' || !this._bagLockedByFight(pid, now)) return false;
    const ps = this.playerState[pid];
    return !!ps && this._nmlLevelOf(ps) >= 1;
  },

  /* The router's gate, before its switch: true when the message was refused
     here (answered with its handler's own refusal) and must go no further. */
  _fightLockGate(session, msg) {
    const row = own(FIGHT_LOCK, msg.type) ? FIGHT_LOCK[msg.type] : null;
    if (!row || typeof row.refuse !== 'function') return false;
    const p = msg.payload || msg;
    if (row.when && !row.when(p)) return false;
    if (!this._fightLockHolds(session.id, row.sw)) return false;
    try { row.refuse(this, session.id, p); } catch (e) { /* refused all the same: nothing moved */ }
    return true;
  },
};
