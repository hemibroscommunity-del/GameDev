/* THE WIRE TABLE: RELAY.TYPES (server/src/relay.js), phone to worker to phones: one row for both ways -- v2.3.5061 (grand plan step 4.1, step 1; card N).
 *
 * 26 rows, made from card C's census (docs/plan/census/wire.md), its prose
 * turned into docs/SHAPES.md part 5's closed values.  How each column reads:
 * README.md beside this file; the closed lists: columns.js.  A row says what
 * the code does today.  A leaf (no imports, plain data).
 * tools/guards/wire-table.test.mjs holds it to the code.
 *
 * v2.3.5181 (card K, step 4.1 step 2): RELAY.TYPES is MADE from these rows
 * (lists.js): a new relay is a row here and nothing in relay.js.  The comment
 * above a row says which page sends it (moved here from relay.js's old
 * literal list).  A row marked `privileged: 'echo'` is one the worker sends
 * too (a sparring clone's, a settlement's), its why in its `echo:` note: the
 * rows of wire-audit.test's echo list. */

export const WIRE_RELAY = [
  /* IncomingTradePanel: _interceptTrade settles it */
  { name: 'trade_accept', dir: 'relay',
    at: 'index.js _onMessage default > trade.js _interceptTrade; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['value-out', 'final', 'speaks'], reqId: 'state', trust: { target: 'request' },
    absent: 'dropped: no target', bad: ['dropped:shape', 'dropped:gone', 'refused'],
    answer: ['trade_reject', 'inbox_delivered', 'player_state'],
    note: ['value-out: the OFFERER\'s gold and goods, as the worker kept them, move to the accepter'] },
  /* TradePanel: _interceptTrade records it */
  { name: 'trade_offer', dir: 'relay',
    at: 'index.js _onMessage default > trade.js _interceptTrade; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined', 'fight:!in'], mayStart: 'never-helper',
    doesWhat: ['own', 'speaks'], reqId: 'none', trust: { target: 'request', offer: 'request' },
    absent: 'dropped: no target, no offer, or nothing left of it', bad: ['dropped:shape', 'clamped'],
    answer: 'trade_reject' },
  /* IncomingTradePanel */
  { name: 'trade_reject', dir: 'relay',
    at: 'index.js _onMessage default > trade.js _interceptTrade; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['own', 'speaks'], reqId: 'none', trust: { target: 'request' }, absent: 'dropped: no target',
    bad: ['dropped:shape'], answer: 'none',
    privileged: 'echo', note: ['echo: client-initiated relay (rejecting a trade offer); the server also emits it as its validation-failure answer (trade.js).'] },
  /* InspectPlayerPanel: _observeClanInvite records it */
  { name: 'clan_invite', dir: 'relay',
    at: 'index.js _onMessage default > index.js _observeClanInvite, clans.js _observeClanInvite; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'person',
    doesWhat: ['own', 'speaks'], reqId: 'none',
    trust: { target: 'request', clanName: 'words', clanTag: 'words' },
    absent: 'dropped: every one while clans are parties; default: no target records nothing and still relays',
    bad: ['taken'], answer: 'none',
    note: ['today nothing delivers it: dropped before the fan-out while clans are parties (clanparty on by default)'] },
  /* DuelRequestPanel: _interceptDuel settles it */
  { name: 'duel_accept', dir: 'relay',
    at: 'index.js _onMessage default > index.js _interceptDuel, duel.js _interceptDuel; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined', 'duel:!in', 'life:alive', 'fight:!in'],
    mayStart: 'never-helper', doesWhat: ['value-out', 'final', 'plays'], reqId: 'state',
    trust: { target: 'request', wager: 'request' },
    absent: 'dropped: no target; default: no wager is 0, so only a stake-0 challenge passes',
    bad: ['dropped:shape', 'refused'], answer: ['duel_accept', 'duel_decline'] },
  /* DuelRequestPanel: _interceptDuel */
  { name: 'duel_decline', dir: 'relay',
    at: 'index.js _onMessage default > index.js _interceptDuel, duel.js _interceptDuel; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['own', 'speaks'], reqId: 'none', trust: { target: 'request' }, absent: 'dropped: no target',
    bad: ['dropped:shape'], answer: 'none',
    privileged: 'echo', note: ['echo: client-initiated relay (declining a duel); the server also synthesizes both halves when it cancels a duel (duel.js). Deny-listing breaks the client decline.'] },
  /* an older phone's plain duel: _interceptDuel settles it */
  { name: 'duel_request', dir: 'relay',
    at: 'index.js _onMessage default > index.js _interceptDuel, duel.js _interceptDuel; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['own', 'speaks'], reqId: 'none', trust: { target: 'request' },
    absent: 'dropped: no body or no target', bad: ['dropped:shape'], answer: 'none' },
  /* InspectPlayerPanel: _interceptDuel */
  { name: 'duel_wager_request', dir: 'relay',
    at: 'index.js _onMessage default > index.js _interceptDuel, duel.js _interceptDuel; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['own', 'speaks'], reqId: 'none', trust: { target: 'request', wager: 'request' },
    absent: 'dropped: no target; default: no wager is 0', bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* InspectPlayerPanel: _interceptThreat settles it */
  { name: 'pvp_threat', dir: 'relay',
    at: 'index.js _onMessage default > index.js _interceptThreat, threat.js _interceptThreat; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined', 'life:alive'], mayStart: 'never-helper',
    doesWhat: ['speaks', 'plays'], reqId: 'none', trust: { target: 'request', fromLevel: 'look' },
    absent: 'dropped: no target; dropped: every one today', bad: ['dropped:shape'], answer: 'none',
    note: ['none of it today: OPEN_PVP is the constant false, so every one is dropped (threat.js _interceptThreat); a repeat is dropped by the sender\'s THREAT.COOLDOWN_MS (in memory)'] },
  /* ThreatIncomingPanel: _interceptThreat */
  { name: 'threat_response', dir: 'relay',
    at: 'index.js _onMessage default > index.js _interceptThreat, threat.js _interceptThreat; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['value-out', 'final', 'plays', 'others'], reqId: 'state',
    trust: { target: 'request', action: 'request' },
    absent: 'dropped: no target; default: no action is ignore',
    bad: ['dropped:shape', 'dropped:gone', 'clamped'], answer: 'none',
    note: ['value-out: ANOTHER player\'s (THREAT.LEVY_PCT of the threatener\'s gold into escrow bounty:<threatener>), and a gear lock on the threatener; nothing of the sender\'s moves; today every one is dropped: no threat can be live while OPEN_PVP is false'] },
  /* chat.js, ChatBubble: room chat (_sanitizeChatRelay) */
  { name: 'chat', dir: 'relay',
    at: 'index.js _onMessage default > index.js _sanitizeChatRelay; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['speaks'], reqId: 'none', trust: { text: 'words', color: 'look' },
    absent: 'dropped: no body or no text, or nothing visible left; default: no color is empty',
    bad: ['dropped:shape', 'clamped'], answer: 'none' },
  /* interactions.js */
  { name: 'emote', dir: 'relay',
    at: 'index.js _onMessage default > emotes.js _sanitizeEmoteRelay; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['speaks', 'plays'], reqId: 'none', trust: { emoji: 'request', move: 'request' },
    absent: 'dropped: no body, or neither a listed emoji nor a listed move', bad: ['dropped:shape'],
    answer: 'none' },
  /* v2.3.4911: 'arena_bet' is gone: the page-only bet that sent it went
     (PartyPanel), every phone already ignored it (gameEvents.js), and a
     stake is the worker's own (arena_sponsor) */
  /* BroTown: a fire you lit, drawn where it burns */
  { name: 'campfire_lit', dir: 'relay', at: 'index.js _onMessage default; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'person', doesWhat: ['plays'],
    reqId: 'harmless', trust: { x: 'look', y: 'look', zone: 'look', expiresAt: 'look' },
    absent: 'default: no body relays the id alone, which the phone drops', bad: ['taken'], answer: 'none' },
  /* v2.3.4942: wsClient: that fire, refused by the worker, put out (fireRefuse.js) */
  { name: 'campfire_out', dir: 'relay', at: 'index.js _onMessage default; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'person', doesWhat: ['plays'],
    reqId: 'state', trust: {}, absent: 'default: no body relays the id alone, all the phone needs', bad: [],
    answer: 'none' },
  /* BroTown: the tree you chop, for a watcher */
  { name: 'gather_node', dir: 'relay', at: 'index.js _onMessage default; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['plays'], reqId: 'harmless', trust: { node: 'look', x: 'look', y: 'look', zone: 'look' },
    absent: 'default: no body relays the id alone, which the phone drops', bad: ['taken'], answer: 'none' },
  /* monsterCombat/projectiles: a local monster's number (no worker monsters) */
  { name: 'monster_dmg_at', dir: 'relay',
    at: 'index.js _onMessage default; phone: gameEvents processGameEvent', wayIn: 'socket', envelope: 'relay',
    phase: ['session:joined'], mayStart: 'never-helper', doesWhat: ['plays'], reqId: 'none',
    trust: { x: 'look', y: 'look', dmg: 'look', isCrit: 'look' },
    absent: 'default: no body relays the id alone, and the phone draws -0', bad: ['taken'], answer: 'none' },
  /* your knockout, drawn on the others' screens */
  { name: 'player_died_to_monster', dir: 'relay',
    at: 'index.js _onMessage default; phone: gameEvents processGameEvent', wayIn: 'socket', envelope: 'relay',
    phase: ['session:joined'], mayStart: 'never-helper', doesWhat: ['plays'], reqId: 'none',
    trust: { x: 'look', y: 'look' },
    absent: 'default: no body relays the id alone, and the phone still marks the sender dead', bad: ['taken'],
    answer: 'none',
    privileged: 'echo',
    note: ['echo: a sparring clone knocked out (spar.js); the client relay a player\'s page sends when it dies, drawn as their knockout.',
         'trust: the event itself is a claim: the receiving phone marks its copy of the sender dead on the sender\'s word alone'] },
  /* dodge.js, abilities.js: a roll, a lunge, a dash */
  { name: 'player_dodge', dir: 'relay',
    at: 'index.js _onMessage default > spar.js _sparSeen; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['plays'], reqId: 'none', trust: { kind: 'look', angle: 'look', dur: 'look', walk: 'look' },
    absent: 'default: no body relays the id alone, and the phone draws a plain roll', bad: ['taken'],
    answer: 'none',
    privileged: 'echo', note: ['echo: a sparring clone\'s roll or sword dash (spar.js); the client relay every player\'s roll and dash ride (dodge.js, abilities.js).'] },
  /* monsterCombat/projectiles: a local monster's hit (no worker monsters) */
  { name: 'player_hurt_by_monster', dir: 'relay',
    at: 'index.js _onMessage default; phone: gameEvents processGameEvent', wayIn: 'socket', envelope: 'relay',
    phase: ['session:joined'], mayStart: 'never-helper', doesWhat: ['plays'], reqId: 'none',
    trust: { dmg: 'look' },
    absent: 'default: no body relays the id alone, and the phone flashes the sender and draws -0',
    bad: ['taken'], answer: 'none' },
  /* jumpActions.js */
  { name: 'player_jump', dir: 'relay', at: 'index.js _onMessage default; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['plays'], reqId: 'none',
    trust: { dur: 'look', peak: 'look', flip: 'look', h0: 'look', v: 'look', g: 'look', ang: 'look' },
    absent: 'default: no body relays the id alone, and the phone draws the game\'s own jump', bad: ['taken'],
    answer: 'none' },
  /* monsterCombat, dodge, playerActions: an arrow or bolt */
  { name: 'player_projectile', dir: 'relay',
    at: 'index.js _onMessage default > drawgather.js _dgShot, freeswing.js _pfBowShot, spar.js _sparSeen; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['own', 'plays'], reqId: 'ts',
    trust: { ts: 'bounded:_dgShot', isStaff: 'request', isSpecial: 'claim', retreat: 'claim',
         dr: 'bounded:_dgShot', ga: 'bounded:_dgShot', big: 'look', x: 'look', y: 'look', ang: 'look',
         el: 'look', life: 'look', speedPx: 'look', delayMs: 'look', volley: 'look', pc: 'look', tg: 'look',
         lp: 'look', gf: 'look' },
    absent: 'default: no body relays the id alone and stamps nothing; default: no dr or ga charges a whole build; default: no finite ts keeps no build',
    bad: ['clamped', 'taken'], answer: 'none',
    privileged: 'echo',
    note: ['echo: a sparring clone\'s arrow or bolt (spar.js); the client relay every player\'s shot rides (monsterCombat.js, playerActions.js).',
         'phase: the stamp alone asks the sender has state, is not dead and holds that weapon in the worker\'s own slot (_hitWeaponOk); the relay goes either way',
         'reqId: ts stops a second stamp only; a repeat is still relayed and drawn twice, and the free-swing bow\'s clock restarts'] },
  // 'player_respawned' intentionally OMITTED: the client broadcasts it
  // to peers as a visual signal (clears _isDead on remote entries so
  // the corpse stops rendering).  Blocking it here leaves other clients
  // showing the respawned player as a corpse forever.  The server's
  // own server->self player_respawned still fires (direct ws.send,
  // doesn't route through this deny-list).  Forgery risk is purely
  // visual -- a cheater can clear their own corpse on others' screens
  // but can't actually revive themselves server-side.
  /* your corpse cleared */
  { name: 'player_respawned', dir: 'relay',
    at: 'index.js _onMessage default; phone: wsClient direct, gameEvents processGameEvent', wayIn: 'socket',
    envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper', doesWhat: ['plays'],
    reqId: 'harmless', trust: {}, absent: 'default: no body relays the id alone, all the phone needs',
    bad: [], answer: 'none',
    privileged: 'echo', note: ['echo: clients broadcast it to peers to clear the corpse sprite; blocking it would leave respawned players rendered dead forever. Forgery is purely visual (the comment above this row).'] },
  /* shieldToggle, playerActions: your guard up or down */
  { name: 'player_shield', dir: 'relay',
    at: 'index.js _onMessage default; phone: gameEvents processGameEvent', wayIn: 'socket', envelope: 'relay',
    phase: ['session:joined'], mayStart: 'never-helper', doesWhat: ['plays'], reqId: 'harmless',
    trust: { up: 'look' },
    absent: 'default: no body relays the id alone, and the phone draws the shield down', bad: ['taken'],
    answer: 'none',
    privileged: 'echo', note: ['echo: a sparring clone\'s raised and lowered guard (spar.js); the client relay every player\'s guard rides.'] },
  /* monsterCombat, abilities, playerActions: a swing */
  /* v2.3.3265: a sparring clone of the test panel (spar.js) has no page, so
     the worker sends what a player's page relays about its own fight -- the
     same types, the same shapes, drawn by the same code.  Each is a live
     client->client relay that every player's page sends; deny-listing one
     would stop every player's swings, shots, rolls, guard or knockout being
     drawn on anyone else's screen.  Forgery is what it always was: visual. */
  { name: 'player_swing', dir: 'relay',
    at: 'index.js _onMessage default > spar.js _sparSeen; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['plays'], reqId: 'none',
    trust: { special: 'look', bash: 'look', whirl: 'look', r: 'look', wpn: 'look', ang: 'look' },
    absent: 'default: no body relays the id alone, and the phone draws a plain swing', bad: ['taken'],
    answer: 'none',
    privileged: 'echo', note: ['echo: a sparring clone\'s swing (spar.js); the client relay every player\'s swing rides (monsterCombat.js, abilities.js).'] },
  /* gameEvents: a hit between players, confirmed to the attacker */
  { name: 'pvp_confirmed', dir: 'relay',
    at: 'index.js _onMessage default; phone: gameEvents processGameEvent', wayIn: 'socket', envelope: 'relay',
    phase: ['session:joined'], mayStart: 'never-helper', doesWhat: ['plays'], reqId: 'none',
    trust: { target: 'claim', died: 'claim', dmg: 'look', srv: 'claim' },
    absent: 'default: no body relays the id alone, and no phone is the target', bad: ['taken'],
    answer: 'none' },
  /* gameEvents: a stun, told to the one who caused it */
  { name: 'stunned', dir: 'relay', at: 'index.js _onMessage default; phone: gameEvents processGameEvent',
    wayIn: 'socket', envelope: 'relay', phase: ['session:joined'], mayStart: 'never-helper',
    doesWhat: ['plays'], reqId: 'harmless', trust: { target: 'claim', duration: 'claim' },
    absent: 'default: no body relays the id alone, and no phone is the target', bad: ['taken'],
    answer: 'none',
    note: ['meant to stun the player it names; today it changes nothing: the receiving phone writes S._stunEnd, which nothing reads, and no reachable phone code sends it'] },
];
