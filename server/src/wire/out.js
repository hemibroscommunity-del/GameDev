/* THE WIRE TABLE: every type the worker sends, worker to phone (the census's order) -- v2.3.5061 (grand plan step 4.1, step 1; card N).
 *
 * 164 rows, made from card C's census (docs/plan/census/wire.md), its prose
 * turned into docs/SHAPES.md part 5's closed values.  How each column reads:
 * README.md beside this file; the closed lists: columns.js.  A row says what
 * the code does today.  A leaf (no imports, plain data).
 * tools/guards/wire-table.test.mjs holds it to the code, and wire-audit.test
 * to every type the worker sends.
 *
 * v2.3.5181 (card K, step 4.1 step 2): PRIVILEGED_EVENTS is MADE from these
 * rows (lists.js): every one but the row marked `privileged: 'echo'`
 * (clan_war_declare, sent by the worker and kept off the list, as the 8 relay
 * echoes are: relays.js).  A type the worker starts sending is a row here,
 * and is privileged with no other edit.  The comment above a row says why a
 * phone must never send it: moved here from index.js's old literal list,
 * word for word.  A new row's why goes above it. */

export const WIRE_OUT = [
  /* v2.3.3430: test mode on or off for this phone's own character
     (testmode.js).  Forged into a relay, it would paint the TEST MODE tag on
     another player's screen. */
  { name: 'test_mode', dir: 'out',
    at: 'testmode.js _testModeTell, testmode.js _testModeSet; phone: wsClient direct', wayIn: 'admin',
    envelope: 'direct', phase: ['none checked'], mayStart: 'owner', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no payload, or on not exactly true, is off', bad: ['clamped'],
    answer: 'none' },
  /* v2.3.3355: a new Login Key, handed to one phone (loginkeys.js).  Forged
     into a relay, it would hand a player a key that is not theirs -- their
     phone would switch to it and be refused. */
  { name: 'key_new', dir: 'out', at: 'loginkeys.js _keysAfterJoinNow; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no key or no id keeps the old key working, and the next join is handed another',
    bad: ['dropped:shape'], answer: 'none' },
  { name: 'join_rejected', dir: 'out',
    at: 'join.js _handleJoin, verify.js _verifyRefuse, devicelock.js _authPutOut, and 1 more; phone: wsClient direct',
    wayIn: ['socket', 'http', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'default: no reason reads as \'auth\'',
    bad: ['clamped'], answer: 'none',
    note: ['v2.3.5621: `frozen` from silence.js _frozenDeviceRefuse (a frozen character\'s phone); v2.3.5622: `name` {why} from charname.js _charNameRefuse (a new name the rule refuses: the page\'s name box says why first; an older phone reads an unknown reason as fail-safe, no new character)'] },
  /* v2.3.1982: the room-full refusal (join.js _roomFullRefusal).  Server-
     emitted only -- a forged one would put "the world is full" in front of
     every other player in the room, which is a one-message denial of
     service on a demo day.  It rides its own socket and is closed
     immediately after, so it never reaches the rebroadcast branch from the
     server side; the deny-list is what stops a CLIENT sending it. */
  { name: 'room_full', dir: 'out', at: 'join.js _roomFullRefusal; phone: wsClient direct', wayIn: 'http',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: a missing number reads as 0, and the phone waits its own time',
    bad: ['taken'], answer: 'none' },
  /* v2.3.3260: the refusal of a join while your body lingers in a fight
     (linger.js) -- server-emitted only; a forged one would tell every phone
     in the room to wait out a countdown it never earned. */
  { name: 'linger_wait', dir: 'out',
    at: 'join.js _handleJoin, bodytake.js _bodyTakeFail; phone: wsClient direct', wayIn: ['socket', 'room'],
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no ms waits LG_WAIT_DEFAULT (5 s)', bad: ['clamped'], answer: 'join' },
  /* v2.3.4455: where a kept body stands, after a takeover mid-fight (bodytake.js) */
  { name: 'body_place', dir: 'out', at: 'bodytake.js _bodyTakeSend; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'dropped: no payload places nothing, and the worker\'s wait runs out into linger_wait',
    bad: ['dropped:shape'], answer: 'none' },
  // World state fan-outs
  { name: 'zone_monsters', dir: 'out',
    at: 'movement.js _handleMove, dungeon.js _dungeonPushZoneState, spawnscale.js _pushZoneRoster; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: ['direct', 'group'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no monsters list changes nothing; default: no zone is applied as the current one; default: an empty list hands the zone to the phone\'s own monsters',
    bad: ['dropped:gone'], answer: 'none' },
  // World state fan-outs
  { name: 'zone_nodes', dir: 'out',
    at: 'movement.js _handleMove, spawnscale.js _pushZoneRoster; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {},
    absent: 'dropped: no nodes list changes nothing; default: no zone is the phone\'s current one; default: no respawnAt is 0',
    bad: ['taken'], answer: 'none' },
  // World state fan-outs
  { name: 'zone_loot', dir: 'out', at: 'movement.js _handleMove; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { killerName: 'words' },
    absent: 'dropped: no loot list changes nothing; default: no killerName is \'Player\', no ts is now, no share shows 0 coins',
    bad: ['dropped:gone', 'clamped'], answer: 'none' },
  // World state fan-outs
  { name: 'zone_state', dir: 'out',
    at: 'movement.js _handleMove, dungeon.js _dungeonPushZoneState, spawnscale.js _pushZoneRoster; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: ['direct', 'group'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { killerName: 'words' },
    absent: 'dropped: a missing part (monsters, nodes or loot) is skipped; default: no zone is applied; default: an empty monster list without mnear hands the zone to the phone\'s own monsters',
    bad: ['dropped:gone'], answer: 'none' },
  // Bootstrap + protocol
  { name: 'state_sync', dir: 'out',
    at: 'join.js _handleJoin, index.js getAllPlayerData, nearjoin.js _nearJoinPlayers; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { players: 'look', 'players.name': 'words', killerName: 'words' },
    absent: 'default: no caps reads as {} (not ready), and the phone joins again; dropped: no players throws, and nothing after it is applied; default: an empty monster list without monstersNear hands the zone to the phone\'s own monsters',
    bad: ['clamped', 'dropped:gone'], answer: 'join' },
  // Bootstrap + protocol
  { name: 'tick', dir: 'out', at: 'tick.js buildFor, tick.js buildShared; phone: wsClient direct',
    wayIn: 'room', envelope: 'tick', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays', 'speaks'], reqId: 'none',
    trust: { 'players.d': 'look', 'players.f': 'look', 'players.vx': 'look', 'players.vy': 'look',
         'players.ex': 'look', 'players.eqc': 'look', 'players.eql': 'look', 'players.eqs': 'look',
         pl: 'look', 'pl.name': 'words' },
    absent: 'default: a part not sent is skipped (a tick carries what changed); default: spr, brd, sk, pw, eqg or po absent is off; default: a slim entry leaves pose and bro as they were',
    bad: ['clamped', 'dropped:shape', 'dropped:gone', 'taken'], answer: 'none' },
  // Pool / progression mirrors
  { name: 'player_state', dir: 'out',
    at: 'persistence.js _sendPlayerState, persistence.js _flushPendingPlayerStates, persistence.js _resendPlayerState; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: an absent field is unchanged (a v2 delta); default: cape null is taken off',
    bad: ['clamped', 'dropped:shape'], answer: ['set_active_slot', 'shield_wear'] },
  // Pool / progression mirrors
  { name: 'player_died', dir: 'out',
    at: 'index.js _handlePlayerDeath, join.js _handleJoin; phone: wsClient direct', wayIn: ['socket', 'room'],
    envelope: 'direct', phase: ['life:!dying'], mayStart: 'system', doesWhat: ['reads', 'plays'],
    reqId: 'none', trust: {},
    absent: 'default: no payload still plays the death, with no killer and the card\'s own hold; default: no keptBag promises nothing',
    bad: ['clamped'], answer: ['move', 'player_died_to_monster'] },
  // v2.3.1117: inbox/mail delivery notification -- forging it wouldn't
  // grant anything (credits are server-persisted before it's sent) but
  // it drives "you received X" UI, so don't let clients spoof it.
  { name: 'inbox_delivered', dir: 'out',
    at: 'inbox.js _sendInboxDelivered, inbox.js _creditPlayerOnce, inbox.js _creditWith, and 2 more; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'http', 'admin', 'room'], envelope: 'direct', phase: ['none checked'],
    mayStart: 'system', doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'entries[].note': 'words', 'entries[].noteT.p': 'words' },
    absent: 'default: no entries shows nothing; default: an unknown kind reads \'a delivery\'; default: a missing amount or count is 0 or 1; default: no note, no brackets; default: no noteT (or one this page\'s table lacks) reads the note (v2.3.5197, the words rule)',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  // Bootstrap + protocol
  { name: 'ping', dir: 'out', at: 'tick.js _tickPingAndAfk; phone: wsClient direct', wayIn: 'room',
    envelope: 'room', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'ts',
    trust: {}, absent: 'default: no ts takes no clock sample, and the pong still goes back',
    bad: ['dropped:shape'], answer: 'pong' },
  // Bootstrap + protocol
  { name: 'player_count', dir: 'out', at: 'join.js _handleJoin, leave.js _leaveRun; phone: wsClient direct',
    wayIn: ['socket', 'room', 'admin'], envelope: 'room', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'default: no count sets the pip to undefined',
    bad: ['taken'], answer: 'none' },
  // Bootstrap + protocol
  { name: 'player_join', dir: 'out',
    at: 'join.js _handleJoin, nearjoin.js _nearJoinJoinBroadcast, spar.js _sparSpawn; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'room', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { name: 'words', 'data.name': 'words', 'data.x': 'look', 'data.y': 'look', 'data.z': 'look',
         'data.d': 'look', 'data.rpgLv': 'look', 'data.color': 'look', 'data.avatar': 'look',
         'data.bt': 'look', 'data.bl': 'look', 'data.hg': 'look', 'data.fr': 'look', 'data.bs': 'look',
         'data.eqc': 'look', 'data.eql': 'look', 'data.eqs': 'look', 'data.eqst': 'look',
         'data.wpnMat': 'look', 'data.rpgHp': 'look', 'data.rpgMaxHp': 'look', 'data.rpgData': 'look' },
    absent: 'default: no data makes a peer at 0,0 in \'town\' with default colours, level 1 and 50/50 health; default: a falsy name is \'Anon\'; default: a missing look key takes the table\'s fallback',
    bad: ['taken'], answer: 'none',
    note: ['data.rpgLv: the worker\'s own for a prog3 character, else as the joiner wrote it'] },
  // Bootstrap + protocol
  { name: 'player_leave', dir: 'out',
    at: 'leave.js _leaveRun, linger.js _lingerEnd, spar.js _sparRemove; phone: wsClient direct',
    wayIn: ['socket', 'room', 'admin'], envelope: 'room', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'default: no id deletes nothing, and the count still goes down by one',
    bad: ['dropped:gone', 'taken'], answer: 'none' },
  // Bootstrap + protocol
  { name: 'player_update', dir: 'out',
    at: 'lookrelay.js _lookRelay, alliance.js _allySetTag, clans.js _clanUntag, and 3 more; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'room', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { 'data.name': 'words', 'data.x': 'look', 'data.y': 'look', 'data.dir': 'look', 'data.zone': 'look',
         'data.rpgLv': 'look', 'data.rpgHp': 'look', 'data.rpgMaxHp': 'look', 'data.rpgData': 'look',
         'data.color': 'look', 'data.avatar': 'look', 'data.aw': 'look', 'data.bt': 'look', 'data.bl': 'look',
         'data.hw': 'look', 'data.fh': 'look', 'data.hr': 'look', 'data.sk': 'look', 'data.hc': 'look',
         'data.htc': 'look', 'data.fhc': 'look', 'data.st': 'look', 'data.stc': 'look', 'data.ec': 'look',
         'data.ew': 'look', 'data.ewc': 'look', 'data.es': 'look', 'data.sc': 'look', 'data.hg': 'look',
         'data.fr': 'look', 'data.pt': 'look', 'data.sh': 'look', 'data.bs': 'look', 'data.mask': 'look',
         'data.pet': 'look', 'data.eqc': 'look', 'data.eql': 'look', 'data.eqs': 'look', 'data.eqst': 'look',
         'data.wpnType': 'look', 'data.wpnMat': 'look', 'data.wpnE1': 'look', 'data.wpnE2': 'look',
         'data.rep': 'look' },
    absent: 'default: a key the data lacks is kept (a delta); default: no data with a known id resets the peer\'s height and frame to average; dropped: no data with an unknown id does nothing',
    bad: ['taken'], answer: 'none',
    note: ['data.rpgLv: the worker\'s own for a prog3 character, else as that phone wrote it'] },
  /* v2.3.3393: a roll or flip the WORKER made (dice.js).  Forged, one would
     put any number in any player's name in everyone's chat. */
  /* placed: v2.3.3393: a /roll or /flip (dice.js): where the room has the roller,
     who hears their own anywhere.  Words in the chat, kept as nothing but a
     line, so a phone that walks up later misses nothing it would draw */
  { name: 'dice_roll', dir: 'out', at: 'dice.js _handleDice; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { name: 'words' },
    absent: 'dropped: no id ignores it', bad: ['dropped:shape', 'dropped:mute'], answer: 'none',
    placed: { p: 'id', who: ['id'] }, muted: 'mutable' },
  /* v2.3.3525: Lil Bro's race (race.js) -- the course and the gun, a flag
     touched, the result.  Forged into a relay, one would start or win a race
     on another player's screen that the worker never ran. */
  { name: 'race_state', dir: 'out', at: 'race.js _handleRaceStart; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {},
    absent: 'dropped: no payload is ignored, and the phone\'s own ask times out; default: no speed, lilMs or flagR takes the phone\'s defaults',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* why: the comment on race_state's row (one comment of the old list, v2.3.5181) */
  { name: 'race_cp', dir: 'out', at: 'race.js _raceOnMove; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['race:in'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no i is ignored', bad: ['dropped:shape', 'dropped:noop'], answer: 'none' },
  /* why: the comment on race_state's row (one comment of the old list, v2.3.5181) */
  { name: 'race_end', dir: 'out', at: 'race.js _raceEnd, race.js _handleRaceStart; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no payload reads as {}, a loss with no err, counted as lost',
    bad: ['clamped'], answer: 'none' },
  /* v2.3.3776: the skateboard (ride.js): on, off and why */
  { name: 'ride_state', dir: 'out', at: 'ride.js _rideSend; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no on is off', bad: ['clamped'], answer: 'none' },
  /* v2.3.4545: your own accuracy (accuracy.js), to you only.  Forged, it
     would write another player's numbers on your Journey page. */
  { name: 'acc_state', dir: 'out', at: 'accuracy.js _handleAccRequest; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: a missing weapon or number is 0', bad: ['clamped'],
    answer: 'none' },
  // v2.3.1347: character-restart ack (persistence.js) -- the client
  // handler wipes localStorage and reloads; a forged one would wipe
  // another player's local caches (their server blob would survive,
  // but the grief is real).  Server-emitted only.
  { name: 'character_reset_done', dir: 'out',
    at: 'persistence.js _resetCharacterData; phone: wsClient direct', wayIn: ['socket', 'http'],
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'nothing', bad: [], answer: 'none' },
  // v2.3.4627: ...and its refusal during a player fight in No man's land
  // (persistence.js, fightlock.js `fightlockreset`)
  { name: 'character_reset_refused', dir: 'out',
    at: 'persistence.js _handleCharacterReset; phone: wsClient direct', wayIn: 'socket', envelope: 'direct',
    phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'default: no payload takes the phone\'s own sentence and reason \'fight\'', bad: ['clamped'],
    answer: 'none' },
  // v2.3.1664: the on-chain checkpoint receipt (chainscore.js).  Server-sent
  // only -- a forged one would paint a fake block-explorer link.
  { name: 'chain_score_recorded', dir: 'out',
    at: 'chainscore.js _chainScoreCheckpoint; phone: wsClient direct', wayIn: ['socket', 'admin'],
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'dropped: no payload or no txHash is ignored', bad: ['taken'], answer: 'none' },
  /* v2.3.1576: Hemi Bro ownership. Both are server-emitted only -- a forged
     bro_verify_result would let a client show peers a badge it never earned,
     and a forged bro_nonce would let it choose the text it 'signed'. */
  { name: 'bro_nonce', dir: 'out', at: 'broverify.js _handleBroNonce; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'default: message goes to the wallet unchecked; dropped: a wallet that refuses ends the verify, and nothing is sent',
    bad: ['taken'], answer: 'bro_verify',
    note: ['phase: taken only while a verify is running on this phone (broWallet.js _pending)'] },
  /* why: the comment on bro_nonce's row (one comment of the old list, v2.3.5181) */
  { name: 'bro_verify_result', dir: 'out',
    at: 'broverify.js _handleBroVerify, broverify.js _broVerifyWallet, broverify.js _broRefresh; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'default: ok with no count leaves the count as it was; default: with no verify running only the Bro and the count are set',
    bad: ['taken'], answer: 'none' },
  // v2.3.1127: dungeon instance lifecycle (server-spawned waves,
  // server-settled completion rewards -- see dungeon.js).
  { name: 'dungeon_started', dir: 'out', at: 'dungeon.js _dungeonSend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'cfg.name': 'words' },
    absent: 'dropped: no payload or no zone is ignored; default: no cfg is a 25x20 \'Dungeon\' of 3 waves; default: home with no back is entered at once',
    bad: ['clamped'], answer: 'move' },
  /* why: the comment on dungeon_started's row (one comment of the old list, v2.3.5181) */
  { name: 'dungeon_wave', dir: 'out', at: 'dungeon.js _dungeonSend; phone: gameEvents processGameEvent',
    wayIn: 'room', envelope: 'group', phase: ['zone:dungeon'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no wave is 1, no total the phone\'s own count',
    bad: ['dropped:gone'], answer: 'none' },
  /* why: the comment on dungeon_started's row (one comment of the old list, v2.3.5181) */
  { name: 'dungeon_boss', dir: 'out', at: 'dungeon.js _dungeonSend; phone: gameEvents processGameEvent',
    wayIn: 'room', envelope: 'group', phase: ['zone:dungeon'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no payload is ignored', bad: ['dropped:gone'], answer: 'none' },
  /* why: the comment on dungeon_started's row (one comment of the old list, v2.3.5181) */
  { name: 'dungeon_complete', dir: 'out', at: 'dungeon.js _dungeonSend; phone: gameEvents processGameEvent',
    wayIn: 'room', envelope: 'group', phase: ['zone:dungeon'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no gold shows \'+0G\'; default: no chest or skillXp, the card goes without them',
    bad: ['dropped:gone'], answer: 'none' },
  /* why: the comment on dungeon_started's row (one comment of the old list, v2.3.5181) */
  { name: 'dungeon_error', dir: 'out',
    at: 'dungeon.js _dungeonSend, fightlock.js _dungeonError; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no payload or no message shows \'Dungeon unavailable\'',
    bad: ['taken'], answer: 'none' },
  // v2.3.1194: boss ability telegraphs/executions are server-scripted
  // (dungeon.js _dungeonTickBossAbilities); the client handler is
  // display-only, but a forged one would paint fake warnings/rings.
  { name: 'dungeon_boss_ability', dir: 'out',
    at: 'dungeon.js _dungeonBossAbilityEvent; phone: gameEvents processGameEvent', wayIn: 'room',
    envelope: 'group', phase: ['zone:dungeon'], mayStart: 'system', doesWhat: ['reads', 'plays'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no x or y is the player\'s own place',
    bad: ['dropped:gone', 'dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.3265: the sparring clones of the test panel (spar.js), to their
     owner only.  Forged, it would make a phone take any player for a clone
     it may aim at -- the worker still refuses every such hit (_sparPair) --
     and paint a knockout that never happened. */
  { name: 'spar_state', dir: 'out', at: 'spar.js _sparTell; phone: wsClient direct',
    wayIn: ['admin', 'socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'owner',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no clones is an empty list, and a lock on a clone gone is dropped',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  // v2.3.1150: operator announcements -- deliberately NOT riding the
  // un-privileged 'chat' relay (any client could impersonate the
  // server there); this type is forgeable only by the worker.
  { name: 'server_announce', dir: 'out',
    at: 'liveops.js _announce, join.js _handleJoin; phone: gameEvents processGameEvent',
    wayIn: ['admin', 'socket'], envelope: ['room', 'direct'], phase: ['none checked'], mayStart: 'owner',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'dropped: no payload or an empty text is ignored',
    bad: ['clamped'], answer: 'none',
    note: ['text: the owner\'s words, from the owner\'s route; the game\'s own voice, never a player\'s'] },
  // v2.3.3732: the message diet's switches, live (movepath.js
  // _movePathFlagChanged) -- forged, it would put a phone on the path with
  // no glide behind it, or take one off
  { name: 'move_path', dir: 'out', at: 'movepath.js _movePathFlagChanged; phone: wsClient direct',
    wayIn: 'admin', envelope: 'room', phase: ['none checked'], mayStart: 'owner', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: a missing field reads as false (the path off)',
    bad: ['taken'], answer: 'none' },
  // v2.3.3755: the memory savers turned off for every phone (clientoff.js) --
  // forged, it would switch a phone's savers off or on
  { name: 'client_off', dir: 'out', at: 'clientoff.js _clientOffChanged; phone: wsClient direct',
    wayIn: 'admin', envelope: 'room', phase: ['none checked'], mayStart: 'owner', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no off reads as \'\' (every saver on)', bad: ['clamped'],
    answer: 'none' },
  // v2.3.4520: the free-swing trial's switch, live (freeswing.js
  // _freeSwingFlagChanged) -- forged, it would put a phone's sword back on
  // the untried swipes, or take it off them with no worker behind it
  { name: 'free_swing', dir: 'out', at: 'freeswing.js _freeSwingFlagChanged; phone: wsClient direct',
    wayIn: 'admin', envelope: 'room', phase: ['none checked'], mayStart: 'owner', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no on reads as 0 (off)', bad: ['taken'], answer: 'none' },
  // v2.3.4799: the bow's draw and the staff's gather switched live
  // (drawgather.js _drawGatherFlagChanged) -- forged, it would take a phone's
  // drawn bow or gathered staff away, or give it one with no worker counting
  { name: 'draw_gather', dir: 'out', at: 'drawgather.js _drawGatherFlagChanged; phone: wsClient direct',
    wayIn: 'admin', envelope: 'room', phase: ['none checked'], mayStart: 'owner', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: a missing field reads as off', bad: ['taken'], answer: 'none' },
  /* v2.3.3058: No man's land (nomansland.js) -- your own skulls' time left,
     and what a death there took.  Forged, one would paint a red skull on an
     innocent player's own screen and the other would make a game clear its
     bag of things the worker never took. */
  { name: 'nml_skull', dir: 'out', at: 'nomansland.js _nmlSend; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'dropped: no payload is ignored',
    bad: ['clamped', 'dropped:shape'], answer: 'none' },
  /* why: the comment on nml_skull's row (one comment of the old list, v2.3.5181) */
  { name: 'nml_loss', dir: 'out', at: 'nomansland.js _nmlOnDeath; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { by: 'words' },
    absent: 'dropped: no payload is ignored; default: no named clears a red skull\'s lists whole',
    bad: ['dropped:shape'], answer: 'none' },
  /* v2.3.3770: the lock after a red skull's death (nomansland.js) */
  { name: 'nml_lock', dir: 'out',
    at: 'nomansland.js _nmlLockSend, nomansland.js _nmlLockSet, nomansland.js _nmlLockLift, and 1 more; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: ['group', 'direct'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: a missing list is empty',
    bad: ['clamped', 'dropped:shape'], answer: 'none' },
  /* v2.3.3770: the lock after a red skull's death (nomansland.js) */
  { name: 'nml_lock_ask', dir: 'out', at: 'nomansland.js _handleNmlLockAsk; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: {},
    absent: 'dropped: no payload or no from is ignored', bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.3316: and what a kill there took, told to the killer.  Forged, it
     would point a player at a pile that is not theirs. */
  { name: 'nml_take', dir: 'out', at: 'nomansland.js _nmlTellKiller; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { from: 'words' },
    absent: 'dropped: no payload is ignored; default: no from is \'a player\'', bad: ['clamped'],
    answer: 'none' },
  /* v2.3.2824: a windup ability's ring (abilities.js) -- names a caster and a
     circle, so a forged one would draw a fake whirlwind over another player. */
  { name: 'ability_windup', dir: 'out', at: 'abilities.js _handleAbility; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'dropped: no playerId draws nothing; default: no radius is 240', bad: ['clamped', 'dropped:gone'],
    answer: 'none',
    placed: { p: 'playerId', who: ['playerId'] } },
  { name: 'ability_rejected', dir: 'out',
    at: 'index.js _handleAbilityUse, abilities.js _handleAbility, abilities.js _abilityResolve, and 1 more; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no reason reads \'Ability failed\'', bad: ['clamped'],
    answer: 'none' },
  /* v2.3.1734: Element Burst's nova (burst.js).  Display-only — every
     point of its damage rides monster_hit — but a forged one would let a
     client paint fake elemental statuses onto every monster on every
     screen in the zone, which is exactly the class of thing this list
     exists for.  NOTE the client->server half is named `element_burst`
     and has its own switch case, so it never reaches this deny-list. */
  { name: 'element_nova', dir: 'out', at: 'burst.js _handleElementBurst; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no r is 70', bad: ['dropped:shape', 'dropped:gone'],
    answer: 'none',
    placed: { xy: ['x', 'y'], who: ['id'] } },
  /* v2.3.2279: the bow special's blast finale.  Server-emitted and purely
     cosmetic -- every point of its damage rode monster_hit -- but forgeable
     it would let one client paint a 220px fireball on every screen in the
     zone, which is the class of thing this list exists for.  Its
     client->server half is named `arrow_blast` and has its own switch case,
     so it never reaches this deny-list (the element_burst/element_nova
     arrangement, for the same reason). */
  { name: 'arrow_boom', dir: 'out', at: 'arrowblast.js _handleArrowBlast; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'dropped: no payload, or no x or y, draws nothing',
    bad: ['dropped:shape', 'dropped:gone', 'clamped'], answer: 'none',
    placed: { xy: ['x', 'y'], who: ['id'] } },
  /* v2.3.3473: the worker's answer to a drop (itemdrop.js).  Forged, one
     would tell a phone an item left its bag that never did. */
  { name: 'item_drop_result', dir: 'out', at: 'itemdrop.js _dropReply; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no payload is ignored', bad: ['clamped'], answer: 'none' },
  // Pool / progression mirrors
  { name: 'combat_credit', dir: 'out', at: 'combat.js _resolveMonsterKill; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no pet, cx, roll or rh skips that part', bad: ['taken'],
    answer: 'none' },
  // Pool / progression mirrors
  { name: 'loot_credit', dir: 'out',
    at: 'index.js _handleLootPickup, revealbag.js _revealBagDev; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'lootId', trust: {},
    absent: 'dropped: no payload is ignored; default: a piece with no name is \'Armor\', with no tierMult 1',
    bad: ['dropped:noop', 'clamped'], answer: 'none' },
  // Pool / progression mirrors
  { name: 'lifesteal_credit', dir: 'out',
    at: 'combat.js _resolveMonsterKill, pvpextras.js _pvpKillHeal; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload, or a refund of 0, shows nothing', bad: ['taken'], answer: 'none' },
  // Pool / progression mirrors
  { name: 'loot_pickup_rejected', dir: 'out', at: 'index.js _handleLootPickup; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'lootId', trust: {}, absent: 'dropped: no payload is ignored; dropped: no lootId re-arms nothing',
    bad: ['dropped:shape'], answer: 'none' },
  // Combat resolution
  { name: 'monster_attack', dir: 'out',
    at: 'hits.js _monsterHit, hits.js _hitStopped; phone: gameEvents processGameEvent', wayIn: 'room',
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'plays'],
    reqId: 'none', trust: {},
    absent: 'default: no dmgTaken, the phone works a figure out itself (dmg, default 5, less its own defence)',
    bad: ['clamped', 'dropped:shape', 'dropped:gone', 'dropped:fight'], answer: 'none',
    placed: { m: 'monsterId', xy: ['attackerX', 'attackerY'], who: ['targetId'] } },
  // Combat resolution
  { name: 'monster_hit', dir: 'out',
    at: 'combat.js _handleMonsterDamage, index.js _applyMonsterDot, abilities.js _abilityStrikeMonster, and 1 more; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'default: no hpPct is taken as it is, so the phone\'s copy of the health goes NaN',
    bad: ['taken', 'dropped:gone'], answer: 'none',
    placed: { m: 'monsterId', who: ['attackerId'] } },
  // Combat resolution
  { name: 'monster_kill', dir: 'out', at: 'combat.js _resolveMonsterKill; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'default: no recipients, nobody is a recipient; default: no share for me reads as 1',
    bad: ['dropped:gone', 'taken'], answer: 'build_point_earned' },
  // Combat resolution
  { name: 'pvp_hit', dir: 'out',
    at: 'combat.js _resolvePvPAttack, pvpextras.js _strikePlayer; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays', 'speaks'], reqId: 'none', trust: { attackerName: 'words' },
    absent: 'default: no dmgTaken, the target\'s phone works a figure out from dmgBase; default: no died, the phone guesses from its own health; default: no attackerName is \'???\'',
    bad: ['taken'], answer: 'pvp_confirmed' },
  /* v2.3.1640: display-only snowball. Carries no damage (the authoritative
     hit rides monster_attack on the impact tick), but a forged one would
     let a client paint fake incoming projectiles on every screen in the
     zone, so it is server-emitted only like the rest of this family. */
  { name: 'monster_projectile', dir: 'out',
    at: 'telegraph.js _resolveBasicWindup; phone: gameEvents processGameEvent', wayIn: 'room',
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'plays'],
    reqId: 'none', trust: {},
    absent: 'default: no travelMs is 900, no kind slime; default: a missing x, y, tx or ty is 0',
    bad: ['dropped:gone'], answer: 'none',
    placed: { m: 'monsterId', xy: ['x', 'y'] } },
  /* v2.3.1730: telegraph/execute notice for standard-zone monster abilities.
     Display-only (damage rides monster_attack), but server-emitted, so it
     belongs here or a client could forge a fake wind-up. */
  { name: 'monster_ability', dir: 'out',
    at: 'telegraph.js _monsterAbilityEvent; phone: gameEvents processGameEvent', wayIn: 'room',
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'plays'],
    reqId: 'none', trust: {},
    absent: 'default: no x or y draws at the phone\'s own player; default: no ms, radius, scale or dazeMs takes the phone\'s default',
    bad: ['clamped', 'dropped:shape', 'dropped:gone'], answer: 'none',
    placed: { m: 'monsterId', xy: ['x', 'y'], who: ['targetId'] } },
  /* v2.3.2238: the fire goblin's burning ground (firetrail.js).
     Display-only on the same terms as monster_projectile above -- every
     point of its damage rides monster_attack -- but a forged one would let
     a client paint fire onto ground that is not alight on every screen in
     the zone, which is a convincing way to make people walk into a real
     patch or refuse to walk through open floor. */
  { name: 'fire_trail', dir: 'out',
    at: 'firetrail.js _maybeDropFirePatch, firetrail.js _sendFireTrailSnapshot; phone: gameEvents processGameEvent',
    wayIn: ['room', 'socket'], envelope: ['event', 'direct'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'default: no ms is 4000; default: no r is 26', bad: ['dropped:gone', 'clamped'], answer: 'none',
    placed: { xy: ['x', 'y'], m: 'monsterId' } },
  /* v2.3.1731: parry notice — display-only, but server-emitted. */
  /* placed: v2.3.3264: a player's parry (pvpextras.js _pvpParry) also names the
     player it staggers, who must hear it wherever the room has them */
  { name: 'parry', dir: 'out',
    at: 'index.js _applyParry, pvpextras.js _pvpParry; phone: gameEvents processGameEvent',
    wayIn: ['room', 'socket'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {},
    absent: 'default: no ms is 1500; default: no x or y puts the ring at the phone\'s own player',
    bad: ['clamped'], answer: 'none',
    placed: { xy: ['x', 'y'], m: 'monsterId', who: ['targetId', 'attackerId'] } },
  // v2.3.1147: server-emitted since the mummy->skeleton transform moved
  // server-side (v2.3.856 era) but never deny-listed -- a client could
  // forge cosmetic transforms on everyone's screen.  Closed.
  { name: 'monster_transform', dir: 'out', at: 'index.js _tickMonsters; phone: gameEvents processGameEvent',
    wayIn: 'room', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'plays'], reqId: 'none', trust: {}, absent: 'dropped: no payload is ignored',
    bad: ['dropped:gone'], answer: 'none' },
  // World state fan-outs
  { name: 'loot_drop', dir: 'out',
    at: 'combat.js _resolveMonsterKill, index.js _spawnDeathPile, itemdrop.js _handleItemDrop, and 2 more; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room', 'admin'], envelope: ['event', 'direct'], phase: ['none checked'],
    mayStart: 'system', doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'pile.killerName': 'words' },
    absent: 'dropped: no pile is ignored; default: no zone is applied; default: no share for me shows 0 coins',
    bad: ['clamped', 'dropped:gone'], answer: 'none' },
  // World state fan-outs
  { name: 'loot_claimed', dir: 'out', at: 'index.js _handleLootPickup; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no lootId is ignored', bad: ['dropped:gone'], answer: 'none' },
  // World state fan-outs
  { name: 'loot_despawn', dir: 'out',
    at: 'index.js _despawnLoot, index.js _tickLoot; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'dropped: no lootId is ignored',
    bad: ['dropped:gone'], answer: 'none' },
  /* v2.3.3541: the worker's answer to a points reset (pointsreset.js).
     Forged, one would tell a phone its points came back when they did not. */
  { name: 'points_reset_result', dir: 'out', at: 'pointsreset.js _pointsResetSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no payload is ignored', bad: ['clamped'], answer: 'none' },
  /* v2.3.3539: a rest's answer (rest.js) -- forged into a relay, it would
     tell another player they had rested and were Well Rested when the worker
     rested nobody. */
  { name: 'rest_result', dir: 'out', at: 'rest.js _restSend; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no payload reads as off; default: no ms shows the phone\'s own 30 minutes',
    bad: ['clamped'], answer: 'none' },
  { name: 'stat_allocated', dir: 'out', at: 'grids.js _handleStatAllocate; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no payload or no stat is ignored', bad: ['dropped:shape'],
    answer: 'none' },
  // v2.3.1659: prog3 combat-rebuild emissions (prog3.js) — the trained
  // level-up celebration and the allocation ack are both server-truth;
  // forging either would paint fake levels/points on the client.
  { name: 'prog3_level', dir: 'out', at: 'prog3.js _prog3AwardXp; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: a missing pool, poolBy or shared is left as it was; default: no charLevel shows the phone\'s own level',
    bad: ['taken'], answer: 'none' },
  /* why: the comment on prog3_level's row (one comment of the old list, v2.3.5181) */
  { name: 'prog3_allocated', dir: 'out', at: 'prog3.js _handleProg3Allocate; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload or no stat is ignored; default: a missing pool field is left as it was',
    bad: ['dropped:shape'], answer: 'none' },
  // v2.3.1687: a quest reward handed to the client's own stash because the
  // worn slot was full (quests.js).  Server truth about a real grant — a
  // forged one would mint free armour on the client, so it is denied like
  // every other server-EMITTED type.
  { name: 'quest_reward_stashed', dir: 'out',
    at: 'quests.js _handleQuestTurnIn, devtools.js _devKit; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'item.gid', trust: {},
    absent: 'dropped: no payload or no item is ignored; default: no name reads \'Quest Armor\', no tierMult 1',
    bad: ['clamped', 'dropped:noop'], answer: 'none' },
  /* why: the comment on arena_stake_placed's row (one comment of the old list, v2.3.5181) */
  { name: 'guild_quest_result', dir: 'out',
    at: 'guilds.js _handleGuildTurnIn; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {},
    absent: 'dropped: no payload or no skill is ignored; default: a missing index, gold or ap reads 0',
    bad: ['taken'], answer: 'none' },
  /* why: the comment on arena_stake_placed's row (one comment of the old list, v2.3.5181) */
  { name: 'guild_quest_error', dir: 'out',
    at: 'guilds.js _handleGuildTurnIn; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no payload or no message shows \'Turn-in rejected\'', bad: ['taken'],
    answer: 'none' },
  /* v2.3.3209: the monster codex's counts (codex.js), server-sent and private.
     Forged, it would paint facts the player never earned on their Codex page. */
  { name: 'codex_state', dir: 'out', at: 'codex.js _codexSend; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'dropped: no payload is ignored',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.3527: the achievements (achievements.js), server-sent and private.
     Forged, it would paint achievements never earned and play their banner. */
  { name: 'achv_state', dir: 'out', at: 'achievements.js _achvSend; phone: wsClient direct',
    wayIn: ['socket', 'room', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'default: no title or rarest reads as none',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.3133: a bite held back by the one-bite rule (cooking.js
     _pvpHealHeld) -- a forged one would tell another player to wait to eat. */
  { name: 'eat_refused', dir: 'out', at: 'cooking.js _pvpHealHeld; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no payload or no wait reads as 0 (the wait over, the line says 1 s)',
    bad: ['clamped'], answer: 'none' },
  // Pool / progression mirrors
  { name: 'harvest_credit', dir: 'out', at: 'gathering.js _handleNodeStrike; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'nodeId', trust: {}, absent: 'dropped: no payload is ignored; default: no newLevel shows \'?\'',
    bad: ['clamped'], answer: 'none' },
  // v2.3.2956: the server-rolled gathering hits (gathering.js
  // _sendGatherHits).  A forged plan relayed to a harvester would paint
  // numbers the worker never rolled and open their gesture window early.
  { name: 'gather_hits', dir: 'out',
    at: 'gathering.js _sendGatherHits, gathering.js _planGatherHits, gathering.js _planCookHits; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['harvest:in'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'seq', trust: {}, absent: 'dropped: no payload is ignored', bad: ['dropped:gone', 'dropped:shape'],
    answer: 'extraction_start' },
  /* v2.3.4036: a weigh-in and the biggest-fish boards (fishlog.js),
     server-sent and private.  Forged, `fish_weight` would show a weight the
     worker never rolled and `fish_board` names and kilos on a public record. */
  { name: 'fish_weight', dir: 'out', at: 'fishlog.js _fishSend; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'key',
    trust: {}, absent: 'dropped: no payload is ignored, and the card stays on \'Weighing\'',
    bad: ['dropped:shape'], answer: 'none' },
  /* why: the comment on fish_weight's row (one comment of the old list, v2.3.5181) */
  { name: 'fish_board', dir: 'out', at: 'fishlog.js _fishSend; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { name: 'words', look: 'look' }, absent: 'dropped: no payload is ignored',
    bad: ['dropped:shape'], answer: 'none' },
  // v2.3.4886: a fire refused for its log (cooking.js): a forged one would
  // put out another player's campfire
  { name: 'firemaking_refused', dir: 'out', at: 'cooking.js _handleFiremakingRequest; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'nothing', bad: [], answer: 'campfire_out' },
  /* v2.3.3127: the farm (farm.js) -- the beds, what grows in them and when it
     is ready, and what an action paid.  A forged one would paint ripe crops
     and harvests the worker never settled on another player's screen. */
  { name: 'farm_state', dir: 'out',
    at: 'farm.js _farmSend, farm.js _farmOnJoin, devtools.js _devFarmRipe; phone: wsClient direct',
    wayIn: ['socket', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: no orders key leaves the board as it was; default: no did shows only an err',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  // v2.3.1130: pet-capture outcomes are server-rolled + private.
  { name: 'pet_capture_result', dir: 'out',
    at: 'pets.js _handlePetCapture, pets.js _petSend; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {},
    absent: 'dropped: no payload is ignored; dropped: neither an error nor a capture shows nothing',
    bad: ['clamped'], answer: 'none' },
  /* v2.3.3120: pet trapping (trapping.js) and the pets record (petbook.js).
     All four server-sent and private.  Forged, `trap_result` would show
     another player a catch the worker never rolled, `pets_state` would paint
     pets they do not own on their Pets page, `trap_armed` a mark and odds the
     worker never set, and `make_traps_result` traps that never reached a bag. */
  { name: 'make_traps_result', dir: 'out', at: 'trapping.js _handleMakeTraps; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no payload is ignored; default: made 0 or absent shows nothing', bad: ['clamped'],
    answer: 'none' },
  /* why: the comment on make_traps_result's row (one comment of the old list, v2.3.5181) */
  { name: 'trap_armed', dir: 'out', at: 'trapping.js _handleTrapArm; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'monsterId',
    trust: {},
    absent: 'dropped: no payload is ignored; default: no ms is the phone\'s own TRAPPING.MARK_MS; default: no chance is 0',
    bad: ['clamped'], answer: 'none' },
  /* why: the comment on make_traps_result's row (one comment of the old list, v2.3.5181) */
  { name: 'trap_result', dir: 'out', at: 'trapping.js _trapRollOnKill; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'monsterId', trust: {},
    absent: 'dropped: no payload is ignored; default: sprung false or absent shows \'Trap kept\'',
    bad: ['clamped'], answer: 'none' },
  /* why: the comment on make_traps_result's row (one comment of the old list, v2.3.5181) */
  { name: 'pets_state', dir: 'out',
    at: 'petbook.js _petbookSend, petbook.js _petbookAct, petbook.js _petbookTake, and 1 more; phone: wsClient direct',
    wayIn: ['socket', 'http', 'admin'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'op+id', trust: { 'list[].name': 'words' },
    absent: 'dropped: no payload is ignored; default: a missing list or journal is empty',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.2822: the smelt's receipt (smelting.js) -- bars made and XP paid. */
  { name: 'smelt_result', dir: 'out', at: 'smelting.js _handleSmeltBar; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no body draws nothing', bad: ['dropped:noop', 'clamped'],
    answer: 'none' },
  /* v2.3.3092: the armour forge's receipt (armorforge.js) -- it names a minted
     piece with its id, so a forged one would put a fake plate in another
     player's bag. */
  { name: 'forge_armor_result', dir: 'out', at: 'armorforge.js _handleForgeArmor; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body or no piece adds nothing, and the next join adopts the piece',
    bad: ['dropped:shape'], answer: 'none' },
  /* v2.3.2101: the contest's public state (is it running, how many of the
     three are left, the rate the worker will actually roll). Server-EMITTED,
     so it MUST be here or a client could forge it -- and a forged "0 left"
     would be a convincing way to stop people hunting. */
  { name: 'cape_status', dir: 'out', at: 'join.js _handleJoin; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body reads as not running', bad: [], answer: 'none' },
  // v2.3.1129: threat-machine emissions (guard fines, lock notices).
  { name: 'gear_locked', dir: 'out', at: 'threat.js _threatGearLocked; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body or no until shows 30 minutes', bad: [],
    answer: 'none' },
  // v2.3.1131: hardening rolls are server-side + private.
  { name: 'harden_result', dir: 'out', at: 'hardening.js _hardenSend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body draws nothing; default: a refusal with no message reads Cannot harden', bad: [],
    answer: 'none' },
  /* v2.3.4012: the worker's answer to a reveal (revealbag.js) -- the opened
     piece and the ladder the overlay plays.  Forged, one would play a Godly
     ceremony on any phone, and tell it a piece in its bag is a grade it is
     not. */
  { name: 'item_reveal', dir: 'out',
    at: 'revealbag.js _revealBagSend, revealbag.js _revealBagSendJoin; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body; default: no reveals or no ladder skips the ceremony and runs the waiting step at once',
    bad: ['clamped'], answer: 'none' },
  /* v2.3.3139: its twin at the Woodworker (hardenedwood.js) -- hardened wood
     made and XP paid; a forged one would show wood that never reached a bag. */
  { name: 'hardened_wood_result', dir: 'out',
    at: 'hardenedwood.js _handleMakeHardenedWood; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {},
    absent: 'default: no body is counted and shows nothing; dropped: a receipt with no count shows nothing',
    bad: ['clamped', 'dropped:noop'], answer: 'none' },
  /* v2.3.3141: salvage's two receipts (salvage.js) -- bars and an essence
     paid, a piece's new grade.  Forgeable, either would put a fake payout or
     a fake rare piece on another player's screen. */
  { name: 'smith_salvage_result', dir: 'out', at: 'salvage.js _salvageSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no body', bad: ['dropped:shape', 'clamped', 'dropped:gone'],
    answer: 'none' },
  /* why: the comment on smith_salvage_result's row (one comment of the old list, v2.3.5181) */
  { name: 'essence_result', dir: 'out', at: 'salvage.js _salvageSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no body', bad: ['dropped:shape', 'clamped', 'dropped:gone'],
    answer: 'none' },
  /* v2.3.3187: the shield gem's receipt (shieldgem.js) -- it says a gem went
     into a shield and names the shield.  Forgeable, it would put a gem in
     another player's shield on their screen that the worker never put there. */
  { name: 'shield_gem_result', dir: 'out', at: 'shieldgem.js _shieldGemSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body; dropped: a success with no gem or no name applies nothing',
    bad: ['dropped:shape', 'dropped:gone', 'clamped'], answer: 'none' },
  /* v2.3.3513: the weapon gem's receipt (weapongem.js) -- it says a gem went
     into a weapon and what XP it paid.  Forgeable, it would put a gem in
     another player's weapon on their screen that the worker never put there. */
  { name: 'weapon_gem_result', dir: 'out', at: 'weapongem.js _weaponGemSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body; default: a level-up with no newLevel skips the celebration',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.3516: the crack's and the combine's receipts (shardcrack.js) -- each
     says what was found or made.  Forgeable, they would put gems that do not
     exist on another player's screen. */
  { name: 'shard_crack_result', dir: 'out', at: 'shardcrack.js _shardCrackSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no body', bad: ['dropped:shape'], answer: 'none' },
  /* why: the comment on shard_crack_result's row (one comment of the old list, v2.3.5181) */
  { name: 'gem_combine_result', dir: 'out', at: 'shardcrack.js _shardCrackSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body; default: a short refusal with no need reads No shards of that land left',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  // v2.3.1198: gem-cut outcomes are server-rolled + private (amulet.js
  // _handleGemCut); forging one is fake-popup grief surface.
  { name: 'gem_cut_result', dir: 'out', at: 'amulet.js _handleGemCut; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body, or no character loaded on the phone; default: a level-up with no newLevel shows a plain level popup',
    bad: ['clamped'], answer: 'none',
    note: ['not sent under today\'s flags: the cut is refused before its roll while `shardcrack` is on'] },
  /* v2.3.3785: the Bank's vault (bank.js) */
  { name: 'bank_state', dir: 'out', at: 'bank.js _bankSend; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'last.reqId+last.opId',
    trust: {}, absent: 'dropped: no body; default: no ok or on reads true; default: no items reads none',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* v2.3.2047: the shopkeeper's two answers. Both are SERVER-EMITTED and
     both carry money -- `shop_result` names coins paid and `shop_state` is
     the public pile every client prices against. Forgeable, they would let
     one player fake a sale receipt on another's screen or advertise a pile
     that is not there, so they are denied on the relay like every other
     server-emitted type (CLAUDE.md wire section). */
  { name: 'shop_state', dir: 'out', at: 'index.js _onMessage; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: ['direct', 'room'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {},
    absent: 'default: no body or no items reads an empty list, keeping the old quote rows',
    bad: ['dropped:shape'], answer: 'none' },
  /* why: the comment on shop_state's row (one comment of the old list, v2.3.5181) */
  { name: 'shop_result', dir: 'out', at: 'index.js _onMessage; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    /* v2.3.6800 (card SHOP): a buy of Diego's Pine Shield carries `shield`,
       the piece put in the bag (its gid included: the phone adds it to its
       copy of the bag once, only with caps.shieldshop), and a refusal of it
       `why` ('have', 'quest', 'off', 'coins'); docs/specs/shop-shield.md */
    absent: 'default: no body shows a refusal; default: a missing count or price is drawn as undefined; default: no `shield` adds nothing to the bag',
    bad: ['clamped'], answer: 'none' },
  /* why: the comment on shop_state's row (one comment of the old list, v2.3.5181) */
  { name: 'shop_quoted', dir: 'out', at: 'index.js _onMessage; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body clears the quote', bad: ['dropped:gone'],
    answer: 'none' },
  /* v2.3.2621: the auction house's message threads (storechat.js).  All
     three are SERVER-EMITTED.  Unlisted, a client could forge a line
     from a seller (`store_dm`), hand a buyer a whole fabricated
     conversation (`store_dm_thread`), or fake a refusal to make the
     real seller look unreachable (`store_dm_error`). */
  { name: 'store_dm', dir: 'out', at: 'storechat.js _handleStoreDm; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'msg.fromName': 'words', 'msg.text': 'words' },
    absent: 'dropped: no body, no listingId or no msg; default: no fromName reads Someone', bad: [],
    answer: 'none' },
  /* why: the comment on store_dm's row (one comment of the old list, v2.3.5181) */
  { name: 'store_dm_thread', dir: 'out',
    at: 'storechat.js _handleStoreDmOpen; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none',
    trust: { sellerName: 'words', 'threads[].buyerName': 'words', 'offers[].buyerName': 'words',
         'threads[].msgs[].fromName': 'words', sellerLook: 'look', 'threads[].msgs[].text': 'words',
         'item.name': 'words' },
    absent: 'dropped: no body matches no listing', bad: ['dropped:shape', 'dropped:gone'], answer: 'none',
    note: ['item: the listing\'s display; its name is a pet\'s own name on a pet listing: words'] },
  /* why: the comment on store_dm's row (one comment of the old list, v2.3.5181) */
  { name: 'store_dm_error', dir: 'out', at: 'storechat.js _handleStoreDm; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body shows the store\'s general line', bad: ['clamped'],
    answer: 'none' },
  /* v2.3.2623: the escrowed-offer answers (storeoffer.js).  Both are
     SERVER-EMITTED and both are about MONEY.  Unlisted, a client could
     forge a `store_offer_state` showing a seller gold that was never
     escrowed, or a fake acceptance on a buyer's screen. */
  { name: 'store_offer_state', dir: 'out',
    at: 'storeoffer.js _soNotify, storeoffer.js _handleStoreOffer, storeoffer.js _handleStoreOfferCancel, and 1 more; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'reqId', trust: { 'offers[].buyerName': 'words' },
    absent: 'dropped: no body; default: no offers reads none', bad: ['dropped:shape', 'dropped:gone'],
    answer: 'none' },
  /* why: the comment on store_offer_state's row (one comment of the old list, v2.3.5181) */
  { name: 'store_offer_error', dir: 'out',
    at: 'storeoffer.js _handleStoreOffer, storeoffer.js _handleStoreOfferCancel, storeoffer.js _handleStoreOfferReply, and 1 more; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'reqId', trust: {}, absent: 'dropped: no body; default: no error shows the store\'s general line',
    bad: ['dropped:gone'], answer: 'none' },
  // v2.3.1124: gamble outcomes are server-rolled + privately sent;
  // forging one at the room is pure grief-popup surface.
  { name: 'gamble_result', dir: 'out',
    at: 'gamble.js _handleGambleRequest; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: a missing number reads 0; dropped: no character loaded on the phone',
    bad: [], answer: 'none' },
  // v2.3.2618: Ace's coin flip, same reasoning -- and worse if relayed,
  // because the panel animates a WIN off it and a forged one would show
  // the whole room a payout the coins echo never backs.
  { name: 'ace_flip_result', dir: 'out',
    at: 'gamble.js _handleAceFlipRequest; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: a missing number reads 0; dropped: no character loaded on the phone',
    bad: [], answer: 'none' },
  // v2.3.2619: the item wager's outcome and the hall-of-fame board.  Both
  // server-emitted only -- a forged ace_board would let any client write the
  // names, faces and numbers on a public record.
  { name: 'ace_item_flip_result', dir: 'out',
    at: 'gamble.js _handleAceItemFlipRequest; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no total reads 0', bad: [], answer: 'none' },
  /* why: the comment on ace_item_flip_result's row (one comment of the old list, v2.3.5181) */
  { name: 'ace_board', dir: 'out', at: 'gamble.js _aceBoardSend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'row.name': 'words', 'row.look': 'look' },
    absent: 'default: the worker sends empty lists when its record is missing', bad: ['taken'],
    answer: 'none' },
  // v2.3.1126: arena referee emissions (results are server-observed
  // duel outcomes; the old client-claimed /result was the forgery).
  { name: 'arena_match_start', dir: 'out',
    at: 'gladiator.js _arenaTryActivate, gladiator.js _arenaOnRejoin; phone: gameEvents processGameEvent',
    wayIn: ['room', 'socket'], envelope: ['group', 'direct'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { opponentName: 'words' },
    absent: 'default: no opponentId shows the popup without a duel; default: no opponentName reads ???; default: no round reads 1',
    bad: [], answer: 'none' },
  /* why: the comment on arena_match_start's row (one comment of the old list, v2.3.5181) */
  { name: 'arena_match_result', dir: 'out',
    at: 'gladiator.js _arenaOnMatchResolved; phone: gameEvents processGameEvent', wayIn: ['socket', 'room'],
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no how reads kill', bad: [], answer: 'none' },
  /* why: the comment on arena_match_start's row (one comment of the old list, v2.3.5181) */
  { name: 'arena_tournament_complete', dir: 'out',
    at: 'gladiator.js _arenaCrown; phone: gameEvents processGameEvent', wayIn: ['socket', 'room'],
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { 'champion.playerName': 'words' },
    absent: 'default: no champion clears the board and shows nothing', bad: [], answer: 'none' },
  // v2.3.1128: sponsorship stakes settle off SERVER-observed match
  // results; guild quests verify against server-owned skill levels.
  { name: 'arena_stake_placed', dir: 'out',
    at: 'gladiator.js _handleArenaSponsor; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { targetName: 'words' },
    absent: 'dropped: no body; default: no targetName reads a gladiator', bad: [], answer: 'none' },
  /* why: the comment on arena_stake_placed's row (one comment of the old list, v2.3.5181) */
  { name: 'arena_stake_error', dir: 'out',
    at: 'gladiator.js _handleArenaSponsor, fightlock.js FIGHT_LOCK; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'default: no message reads Stake rejected; default: no body shows the popup only', bad: [],
    answer: 'none' },
  /* why: the comment on arena_stake_placed's row (one comment of the old list, v2.3.5181) */
  { name: 'arena_stake_result', dir: 'out',
    at: 'gladiator.js _arenaSettleStakes; phone: gameEvents processGameEvent', wayIn: ['socket', 'room'],
    envelope: 'group', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'dropped: no body; default: a missing number reads 0', bad: [], answer: 'none' },
  // v2.3.1210: server-summed spectator stake board (display-only)
  { name: 'arena_stake_board', dir: 'out',
    at: 'gladiator.js _arenaBroadcastStakeBoard; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'row.aName': 'words', 'row.bName': 'words' },
    absent: 'default: no board reads an empty board', bad: ['dropped:shape'], answer: 'none' },
  // v2.3.1149: jackpot pool state is private; the draw result is a
  // server-only broadcast (forging it would announce fake winners).
  { name: 'jackpot_state', dir: 'out', at: 'cadence.js _jackpotSend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'default: a missing pool or ticket count reads 0; default: no deposited shows no popup', bad: [],
    answer: 'none' },
  /* why: the comment on jackpot_state's row (one comment of the old list, v2.3.5181) */
  { name: 'jackpot_result', dir: 'out',
    at: 'cadence.js _jackpotMaybeResolve; phone: gameEvents processGameEvent', wayIn: ['socket', 'room'],
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { winnerName: 'words' },
    absent: 'default: no winnerName reads Someone; default: no amount reads 0', bad: [], answer: 'none' },
  /* v2.3.2820: the daily chest's result (dailychest.js) -- it names a prize,
     so a forged one would put a fake jackpot on another player's screen. */
  { name: 'chest_opened', dir: 'out', at: 'dailychest.js _handleChestOpen; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'reqId', trust: {},
    absent: 'dropped: no prize draws nothing, and the window offers the chest again after 8 s', bad: [],
    answer: 'none' },
  /* v2.3.4295: the login wheel (loginspin.js) -- its answer names a prize, so a
     forged one would paint a won 10K on another player's screen. */
  { name: 'loginspin_state', dir: 'out', at: 'loginspin.js _loginSpinSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body or a missing field reads false', bad: [],
    answer: 'none' },
  /* why: the comment on loginspin_state's row (one comment of the old list, v2.3.5181) */
  { name: 'loginspin_result', dir: 'out', at: 'loginspin.js _handleLoginSpinGo; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'dropped: no body; default: a missing field other than idx reads 0 or false',
    bad: ['dropped:shape'], answer: 'none' },
  /* why: the comment on loginspin_state's row (one comment of the old list, v2.3.5181) */
  { name: 'loginspin_round', dir: 'out', at: 'loginspin.js _handleLoginSpinRound; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'k', trust: {}, absent: 'dropped: no body', bad: ['dropped:shape'], answer: 'none' },
  /* v2.3.3140: the daily rewards (dailyrewards.js) -- the spin's result, the
     day's quests and the season, and a quest's count going up.  Forged, one
     would paint a won jackpot or a finished quest on another player's screen. */
  { name: 'rewards_state', dir: 'out', at: 'dailyrewards.js _drSendState; phone: wsClient direct',
    wayIn: ['socket', 'room'], envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'news.reqId', trust: {}, absent: 'dropped: no body, and the last state stands',
    bad: ['dropped:shape'], answer: 'none' },
  /* why: the comment on rewards_state's row (one comment of the old list, v2.3.5181) */
  { name: 'daily_progress', dir: 'out', at: 'dailyrewards.js _drSendProgress; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no rewards state on the phone yet',
    bad: ['dropped:shape', 'dropped:gone', 'clamped'], answer: 'none',
    note: ['only with `dailyquests: true`, off today'] },
  /* v2.3.4393: the daily spin's biggest wins and losses (boards.js) -- names
     and gold on a public record, so a forged one would write the board a
     phone shows. */
  { name: 'spin_board', dir: 'out', at: 'boards.js _boardSend; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { 'row.name': 'words', 'row.look': 'look' }, absent: 'dropped: no body',
    bad: ['dropped:shape'], answer: 'none' },
  /* v2.3.4453: the chest's answer (risechest.js) */
  { name: 'rise_chest', dir: 'out', at: 'risechest.js _riseChestSend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no body; default: no id takes the phone\'s own pending ask',
    bad: ['clamped'], answer: 'none' },
  // v2.3.1132: two-sided trade session echoes (server-truth renderer).
  { name: 'trade2_state', dir: 'out',
    at: 'trade2.js _t2Broadcast, trade2.js _t2ClearInvites, rejoinresend.js _t2Resend, and 5 more; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: ['group', 'direct'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'id',
    trust: { aName: 'words', bName: 'words', offers: 'words', 'pets.id[].name': 'words' },
    absent: 'dropped: no body; default: an empty done shows an empty receipt', bad: ['clamped'],
    answer: 'none',
    note: ['phase: a \'busy\' refusal is ignored while a live window shows; a late \'declined\' or \'gone\' after the phone\'s own leave is hushed',
         'offers: an echo of each side\'s staged {itemKey: qty} as cleaned, not yet held to its bag; a key may be any text of 32',
         'reqId: id is echoed only on the \'gone\' answer to a trade2_cancel that named a trade'] },
  // v2.3.1132: two-sided trade session echoes (server-truth renderer).
  { name: 'trade2_invite', dir: 'out',
    at: 'trade2.js _handleTrade2Open, rejoinresend.js _t2Resend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { fromName: 'words' },
    absent: 'dropped: no body or no from; default: no fromName reads Someone', bad: [], answer: 'none' },
  // v2.3.1121: duel resolution is server-emitted only.
  { name: 'duel_end', dir: 'out', at: 'duel.js _resolveDuel; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads'], reqId: 'none', trust: {}, absent: 'default: no wager shows no gold in the line',
    bad: ['clamped'], answer: 'none' },
  // v2.3.1129: threat-machine emissions (guard fines, lock notices).
  { name: 'threat_penalty', dir: 'out', at: 'threat.js _threatSend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'dropped: no body; default: no levy shows the lock line alone', bad: [],
    answer: 'none', note: ['never today: no threat can be recorded while OPEN_PVP is false'] },
  // v2.3.1129: threat-machine emissions (guard fines, lock notices).
  { name: 'threat_expired', dir: 'out', at: 'threat.js _threatSend; phone: gameEvents processGameEvent',
    wayIn: 'room', envelope: 'group', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body shows the popup alone', bad: [], answer: 'none',
    note: ['never today: no threat can be recorded while OPEN_PVP is false'] },
  // v2.3.4382: a rejoin's live duel, said again (rejoinresend.js) -- forged,
  // it would put a phone in a duel that is not on
  { name: 'duel_resume', dir: 'out', at: 'rejoinresend.js _duelResend; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { foeName: 'words' },
    absent: 'dropped: no body or no foe; default: no foeName reads empty; default: no wager reads 0', bad: [],
    answer: 'none' },
  // v2.3.1185: party roster echoes (server-truth HUD renderer) + the
  // private invite/error notices.  Forging party_state would paint fake
  // rosters; forging party_invited is popup-spam surface.
  { name: 'party_state', dir: 'out',
    at: 'party.js _partyBroadcast, party.js _partyRemoveMember; phone: gameEvents processGameEvent',
    wayIn: ['socket', 'room'], envelope: ['group', 'direct'], phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { 'members[].name': 'words', 'ally.name': 'words', 'ally.tag': 'words', 'ally.war.them.tag': 'words',
         'ally.war.them.name': 'words', 'ally.war.kills[].k': 'words', 'ally.war.kills[].v': 'words' },
    absent: 'dropped: no body; default: no ally draws no alliance part', bad: ['clamped'], answer: 'none' },
  /* why: the comment on party_state's row (one comment of the old list, v2.3.5181) */
  { name: 'party_invited', dir: 'out', at: 'party.js _handlePartyInvite; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { fromName: 'words' },
    absent: 'dropped: no body or no from; default: no fromName reads Someone; default: no partySize reads 1',
    bad: [], answer: 'none' },
  /* why: the comment on party_state's row (one comment of the old list, v2.3.5181) */
  { name: 'party_error', dir: 'out',
    at: 'party.js _handlePartyInvite, party.js _handlePartyAccept, party.js _handlePartyDecline; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { name: 'words' },
    absent: 'dropped: no body; default: no name reads They', bad: ['clamped'], answer: 'none' },
  // v2.3.1212: server-relayed party-only chat (party.js)
  { name: 'party_chat', dir: 'out', at: 'party.js _handlePartyChat; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { fromName: 'words', text: 'words' },
    absent: 'dropped: no body or no from; dropped: an empty text after the phone\'s clamp', bad: ['clamped'],
    answer: 'none' },
  /* v2.3.3313: the alliance's answers (alliance.js) -- the board, a refusal,
     and a war's end with what it paid you; forged, each would tell a player
     something untrue about their alliance or their gold */
  { name: 'alliance_rows', dir: 'out', at: 'alliance.js _handleAllianceBoard; phone: wsClient direct',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { 'rows[].name': 'words', 'rows[].tag': 'words', 'mine.name': 'words', 'mine.tag': 'words' },
    absent: 'default: no body or no rows draws an empty board; default: no n reads 0; default: no mine reads null',
    bad: ['dropped:shape'], answer: 'none' },
  /* why: the comment on alliance_rows's row (one comment of the old list, v2.3.5181) */
  { name: 'alliance_error', dir: 'out', at: 'alliance.js _allyError; phone: wsClient direct', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'], reqId: 'none',
    trust: {}, absent: 'default: no tag reads [?]', bad: ['clamped'], answer: 'none' },
  /* why: the comment on alliance_rows's row (one comment of the old list, v2.3.5181) */
  { name: 'alliance_war_end', dir: 'out', at: 'alliance.js _allyResolveWar; phone: wsClient direct',
    wayIn: ['room', 'socket'], envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { vs: 'words' },
    absent: 'default: no body shows an empty line; default: no paid shows no gold', bad: ['clamped'],
    answer: 'none' },
  // v2.3.1125: clan registry echoes + war referee emissions.  NOTE
  // deny-listing clan_war_kill/end breaks OLD-client peer-scored wars
  // against this worker -- accepted, that relay was pure forgery
  // surface (each client scored its own kills and paid itself).
  { name: 'clan_state', dir: 'out', at: 'clans.js _clanSendState; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { 'clan.name': 'words', 'clan.tag': 'words', 'clan.color1': 'look', 'clan.color2': 'look',
         'clan.logo': 'look' },
    absent: 'default: no clan reads as no clan', bad: [], answer: 'none',
    note: ['TODAY nearly every one is {clan: null}: clans are parties'] },
  /* why: the comment on clan_state's row (one comment of the old list, v2.3.5181) */
  { name: 'clan_error', dir: 'out', at: 'clans.js _clanError; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { text: 'words' },
    absent: 'dropped: no text shows nothing', bad: [], answer: 'none',
    note: ['text: the worker\'s own sentence; three carry a tag: the asker\'s own typed tag or another clan\'s',
         'TODAY the one text players meet is CLAN_PARTY.REFUSE'] },
  /* why: the comment on clan_state's row (one comment of the old list, v2.3.5181) */
  { name: 'clan_war_kill', dir: 'out', at: 'clans.js _warOnDeath; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { 'kill.killer': 'words', 'kill.victim': 'words' },
    absent: 'dropped: no kill throws in the tick\'s loop and is lost', bad: [], answer: 'none',
    note: ['phase: the phone holds an active war with this warId (else ignored)'] },
  /* why: the comment on clan_state's row (one comment of the old list, v2.3.5181) */
  { name: 'clan_war_end', dir: 'out', at: 'clans.js _resolveClanWar; phone: gameEvents processGameEvent',
    wayIn: 'room', envelope: 'event', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { winner: 'words' },
    absent: 'default: no paid list counts this phone as paid (an older worker\'s shape); default: a null winner reads lost',
    bad: [], answer: 'none',
    note: ['phase: the phone holds a war with this warId (its status is not checked)'] },
  // v2.3.1323: friends system emissions (friends.js) -- the graph sync,
  // request/accept notifications, error channel, and DMs (live +
  // join-time backlog) are all server-authored; a forged friend_sync
  // could paint a fake roster and a forged friend_dm a fake message.
  { name: 'friend_sync', dir: 'out',
    at: 'friends.js _friendsSyncTo, friends.js _friendsOnJoin; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { 'list.id.name': 'words', 'reqIn.id.name': 'words', 'reqOut.id.name': 'words' },
    absent: 'default: a missing part reads empty', bad: [], answer: 'friend_request' },
  /* why: the comment on friend_sync's row (one comment of the old list, v2.3.5181) */
  { name: 'friend_request_in', dir: 'out',
    at: 'friends.js _handleFriendRequest; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { fromName: 'words' }, absent: 'nothing', bad: [], answer: 'none' },
  /* why: the comment on friend_sync's row (one comment of the old list, v2.3.5181) */
  { name: 'friend_accepted', dir: 'out',
    at: 'friends.js _friendAcceptCore; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none', trust: { byName: 'words' }, absent: 'nothing', bad: [], answer: 'none' },
  /* why: the comment on friend_sync's row (one comment of the old list, v2.3.5181) */
  { name: 'friend_error', dir: 'out',
    at: 'friends.js _handleFriendRequest, friends.js _handleFriendDm; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {},
    absent: 'default: no reason shows the fallback sentence; default: no target reads That player',
    bad: ['clamped'], answer: 'none' },
  /* why: the comment on friend_sync's row (one comment of the old list, v2.3.5181) */
  { name: 'friend_dm', dir: 'out', at: 'friends.js _handleFriendDm; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { fromName: 'words', text: 'words' },
    absent: 'dropped: no from; default: no ts takes the phone\'s clock', bad: [], answer: 'none' },
  /* why: the comment on friend_sync's row (one comment of the old list, v2.3.5181) */
  { name: 'friend_dm_backlog', dir: 'out',
    at: 'friends.js _friendsOnJoin; phone: gameEvents processGameEvent', wayIn: 'socket', envelope: 'direct',
    phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'], reqId: 'none',
    trust: { 'messages[].fromName': 'words', 'messages[].text': 'words' },
    absent: 'dropped: no messages draws nothing; dropped: a row with no from is skipped', bad: [],
    answer: 'none' },
  { name: 'clan_war_declare', dir: 'out',
    at: 'clans.js _handleClanWarDeclare; phone: gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'event', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads', 'speaks'],
    reqId: 'none',
    trust: { 'war.challenger.tag': 'words', 'war.challenger.name': 'words', 'war.defender.tag': 'words',
         'war.defender.name': 'words', challengerTag: 'words', defenderTag: 'words' },
    absent: 'dropped: no war; dropped: a war with no defender throws in the tick\'s loop', bad: [],
    answer: 'none',
    privileged: 'echo',
    note: ['echo: the server echoes the declare in the exact shape the client relay already renders (clans.js); the legacy client->client declare must keep relaying against old workers.',
         'phase: needs a clan on the phone; acts only when its clan\'s tag is the war\'s defender or challenger',
         'TODAY never sent: clanparty refuses the declare'] },
  /* v2.3.2136: the two new chat lanes (chatlanes.js).  PRIVILEGED for the
     same reason party_chat is -- these carry a server-stamped `from`, and a
     client able to inject them could forge who said a thing in a lane the
     room never sees.  whisper_error is only ever sent back to the asker. */
  { name: 'area_chat', dir: 'out', at: 'chatlanes.js _handleAreaChat; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'group', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { fromName: 'words', text: 'words' },
    absent: 'dropped: no body, no from, or an empty text after the phone\'s clamp', bad: ['clamped'],
    answer: 'none' },
  /* why: the comment on area_chat's row (one comment of the old list, v2.3.5181) */
  { name: 'whisper', dir: 'out', at: 'chatlanes.js _handleWhisper; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system',
    doesWhat: ['reads', 'speaks'], reqId: 'none', trust: { fromName: 'words', text: 'words' },
    absent: 'dropped: no body, no from, or an empty text', bad: ['clamped'], answer: 'none' },
  /* why: the comment on area_chat's row (one comment of the old list, v2.3.5181) */
  { name: 'whisper_error', dir: 'out', at: 'chatlanes.js _handleWhisper; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: {}, absent: 'default: no body shows the no-such-player line with no name',
    bad: ['clamped'], answer: 'none' },
  /* v2.3.1981: chat-moderation emissions (chatmod.js).  chat_mute_list is
     the server's copy of who you have muted -- a forged one would let a
     modified client paint (or silently EMPTY) somebody's mute list in
     their own UI while the server kept enforcing something else, which is
     the most confusing possible failure for a safety control.  A forged
     chat_report_ack would tell a harassed player their report was filed
     when nothing was written. */
  { name: 'chat_mute_list', dir: 'out',
    at: 'chatmod.js _chatModOnJoin, chatmod.js _chatModSendList; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'none', trust: { 'list[].name': 'words' },
    absent: 'default: no body or no list reads an empty list, clearing the phone\'s own',
    bad: ['dropped:shape'], answer: 'chat_mute',
    note: ['list[].name: the worker\'s own when the target was connected at the mute, else the muter\'s own label, clamped'] },
  /* why: the comment on chat_mute_list's row (one comment of the old list, v2.3.5181) */
  { name: 'chat_report_ack', dir: 'out',
    at: 'chatmod.js _handleChatReport, chatmod.js _chatModSend; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'direct', phase: ['none checked'], mayStart: 'system', doesWhat: ['reads'],
    reqId: 'id', trust: {}, absent: 'default: no body shows Report failed', bad: [], answer: 'none' },
];
