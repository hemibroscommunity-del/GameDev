/* ═══ v2.3.5202: THE PHASE TABLE (grand plan step 5.3b; card L PR 2) ═══
 *
 * The owner, 2026-11-13: every implicit state machine explicit, through one
 * door.  One row a state machine a side (`worker`, `page`): its one field,
 * its states, its one transition function, what clears it, what a rejoin
 * re-sends, and whether it is a `door` today or still `todo`.  The spec is
 * docs/specs/phase-table.md; tools/guards/phase-table.test.mjs holds it.
 *
 * Plain data, no imports, and nothing in the game imports it: it moves no
 * behaviour.  It is not a ledger (src/state/README.md): the one file in
 * src/state/ that is not.
 *
 * THE COLUMNS (every row has each):
 *   name    the machine: SHAPES part 5's (`session`, `life`, `zone`, `fight`,
 *           `duel`, `trade`, `party`, `ride`, `harvest`, `cook`, `guard`,
 *           `pose`, `race`, `arena`, `fishing`) and the plan's (`dungeon`,
 *           `connection`, `loading`, `window`, and `monster`, a monster's life)
 *   side    `worker` (server/src) or `page` (src): a row a side
 *   status  `door`: one field, one transition function, and something that
 *           fails a second writer; `todo`: not one field yet
 *   what    one sentence
 *   field   the one field (a door), or null (todo)
 *   states  its states, in the code's own words where it has them
 *   fn, file  the one transition function and its file (a door), or null
 *   clears  [{ edge, at }]: what ends it, on which edge -- `zone`, `death`,
 *           `rejoin` (card D's three), `leave` (the worker's session door),
 *           `end` (its own end), `never` -- and the function, "<file> <fn>"
 *   rejoin  the slots of REJOIN_SLOTS (src/game/rejoinSlots.js) a rejoin
 *           clears and the worker says again, or 'none: <why>'
 *   held    a door: { suite } -- a suite on the guard's closed DOOR_SUITES
 *           list, which fails a second writer of the field today -- or, for a
 *           row on its SCAN_DOORS list, { scan: [{ prop, value?, at }], born,
 *           besides }: every write of `.prop` the syntax tree finds (of
 *           `value`, when given) is in one of the `at` places, "<file> <fn>"
 *           (v2.3.5203: the gatekeeper's sitting 8)
 *   today   a todo: today's fields.  A page field is `S.<name>` or a variable
 *           and its file: a ledger row, whose writers are the ledger's own
 *           (`writers`, held to the code by state-ledger.test; by function:
 *           `node tools/dev/state-census.mjs --dossier`).  A worker field has
 *           its file and writers, "<file> <function>", read from the code
 *           2026-11-14 (the worker's state has no ledger)
 *   note    where a row needs words
 */


export const PHASES = [
  /* ═══ THE DOORS (step 5.3b: "Has one today") ═══ */
  {
    name: 'session', side: 'worker', status: 'door',
    what: 'A socket\'s life: accepted, the join named its character, the door ran for it.',
    field: 'session.phase', states: ['open', 'joined', 'gone'],
    fn: '_playerLeaves', file: 'server/src/leave.js',
    clears: [{ edge: 'leave', at: 'server/src/leave.js _playerLeaves' }],
    rejoin: 'none: a rejoin is a new socket, born open (index.js fetch)',
    held: {
      scan: [{ prop: 'phase', at: ['server/src/join.js _handleJoin', 'server/src/leave.js _leaveRun'] }],
      born: [{ at: 'server/src/index.js fetch', text: 'phase: \'open\'' }],
    },
    note: 'Three edges, three places: born open in fetch, joined in _handleJoin, gone in _leaveRun (inside the door _playerLeaves). session-door.test plays the phases but fails no second writer of the field, so this table\'s scan does.',
  },
  {
    name: 'life', side: 'worker', status: 'door',
    what: 'A player\'s life phase: alive, or in the dying seconds before the respawn.',
    field: 'ps.life', states: ['alive', 'dying'],
    fn: '_lifeTo', file: 'server/src/life.js',
    clears: [{ edge: 'death', at: 'server/src/life.js _lifeTo' }],
    rejoin: 'none: the death\'s own note life:<pid> brings the same death back at the join (life.js, v2.3.4902), no slot',
    held: { suite: 'server/test/life-door.test.mjs' },
  },
  {
    name: 'monster', side: 'worker', status: 'door',
    what: 'A world monster\'s life: alive, dead until its respawn, then a new life of the same object.',
    field: 'm.alive', states: ['alive', 'dead'],
    fn: '_monsterNewLife', file: 'server/src/monsterlife.js',
    clears: [{ edge: 'end', at: 'server/src/monsterlife.js _monsterNewLife' }],
    rejoin: 'none: a monster is the room\'s, sent in every tick',
    held: {
      scan: [{ prop: 'alive', value: true, at: ['server/src/monsterlife.js _monsterNewLife'] }],
      besides: [
        { file: 'server/src/gathering.js', text: 'n.alive = true', why: 'a gather node coming back, not a monster' },
      ],
    },
    note: 'The door is the new-life edge: m.alive comes back true only in _monsterNewLife (which also counts the lives, m.life). The kill (m.alive = false: combat.js, devtools.js, slimeboss.js) is the death edge, not the door. monster-newlife.test fails a per-monster field in no reset list; this scan fails a second new life, under any name (v2.3.5203, the gatekeeper\'s sitting 8).',
  },
  {
    name: 'monster', side: 'page', status: 'door',
    what: 'A monster\'s life on the phone: alive, dead, then a new life of the same object.',
    field: 'm.alive', states: ['alive', 'dead'],
    fn: 'monsterNewLife', file: 'src/game/monsterCarry.js',
    clears: [{ edge: 'end', at: 'src/game/monsterCarry.js monsterNewLife' }],
    rejoin: 'none: the worker\'s monsters come back in its zone state at every state_sync',
    held: {
      scan: [{ prop: 'alive', value: true, at: ['src/game/monsterCarry.js monsterNewLife'] }],
      besides: [
        { file: 'src/ui/BroTown.jsx', text: '_gn.alive = true', why: 'a gather node coming back, not a monster' },
        { file: 'src/ui/BroTown.jsx', text: 'npc.alive = true', why: 'a townsperson, not a monster' },
      ],
    },
    note: 'monster-life.test §6 holds that both edges (the worker\'s tick, the phone\'s own respawn) call the one reset; this scan fails a new life made anywhere else.',
  },
  {
    name: 'zone', side: 'page', status: 'door',
    what: 'The game\'s place on the phone: the Wheel, today\'s town, the farm, a dungeon.',
    field: 'S.currentZone', states: ['wheel', 'town', 'farm_home', 'dungeon:<id>'],
    fn: 'changeZone', file: 'src/game/zoneTransitions.js',
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js changeZone' }],
    rejoin: 'none: the join places the player again (state_sync, body_place)',
    held: { suite: 'server/test/zone-leftovers.test.mjs' },
  },
  /* v2.3.5222 (card O PR 2): the governor's ladder, a row of its own */
  {
    name: 'ladder', side: 'page', status: 'door',
    what: 'Where the governor (the frame pacer, grown) stands on the ladder below the lane\'s row: rungs taken on each axis.',
    field: '_rung', states: ['row', 'below'],
    fn: 'setRung', file: 'src/game/drawLanes.js',
    clears: [{ edge: 'never', at: 'src/game/drawLanes.js setRung' }],
    rejoin: 'none: the device\'s own, kept by lane in localStorage for the next sitting (framePacer.js makeGovernor)',
    held: { suite: 'server/test/frame-pacer.test.mjs' },
    note: 'Kept: the device\'s, not the zone\'s (card L\'s `reset` column, when it lands: kept). setRung is called by the governor alone (framePacer.js); frame-pacer.test §17 fails a second caller and a second write of _rung.',
  },

  /* ═══ TO DO, THE WORKER (card L PR 5: trade, duel, party, cook, harvest,
     fishing, dungeon, guard, ride, pose, race, arena) ═══ */
  {
    name: 'zone', side: 'worker', status: 'door',
    what: 'A player\'s place on the worker, judged at a change (zonejudge.js) and written by hand where the worker moves them.',
    field: 'ps.z', states: ['wheel', 'town', 'farm_home', 'dungeon:<id>'],
    fn: '_zoneTo', file: 'server/src/zonejudge.js',
    clears: [{ edge: 'death', at: 'server/src/index.js _tickPlayerRespawn' }],
    rejoin: 'none: the join writes the place afresh (join.js _handleJoin)',
    held: { suite: 'server/test/zone-door.test.mjs' },
    note: 'v2.3.5537: the door (ZONE_WAYS move, respawn, standup, spar; a place that is no zone, movement.js _validZone, is refused; live flag zonedoor). The fresh body\'s place is its birth (join.js, the guard\'s besides); a kept body keeps its own. Each caller still asks the duel after (_duelZoneMoved). The leave remembers it (lastplace.js) with the body.',
  },
  {
    name: 'fight', side: 'worker', status: 'door',
    what: 'A player fighting another player: a clock, not a field; the fight lock derives it at each ask.',
    field: 'this._pvpHealClocks', states: ['free', 'fighting', 'locked'],
    fn: '_fightTo', file: 'server/src/cooking.js',
    clears: [{ edge: 'never', at: 'server/src/cooking.js _pvpHealPrune' }],
    rejoin: 'none: the clock is the room\'s and survives a rejoin on purpose (cooking.js); refusals say it per action',
    held: { suite: 'server/test/fight-door.test.mjs' },
    note: 'v2.3.5538: the door (FIGHT_WAYS open, exchange, heal, prune, forget; an id that is no string is refused; live flag fightdoor). The clock\'s one store, id -> { pvpAt, healAt }; fightlock.js _fightLockHolds reads the duel, this clock (10 s), the red skull (ps._nml.red with ps.lastDamageAt) and the place (No man\'s land). ps.lastDamageAt is every blow\'s stamp (combat.js _applyDamage), not this machine\'s field: a note it reads.',
  },
  {
    name: 'duel', side: 'worker', status: 'door',
    what: 'A duel: active, then resolved; a challenge is not yet a duel (a key of _duelChallenges with its own TTL), and away is a per-player clock on an active one.',
    field: 'd.status', states: ['active', 'resolved'],
    fn: '_duelTo', file: 'server/src/duel.js',
    clears: [
      { edge: 'end', at: 'server/src/duel.js _resolveDuel' },
      { edge: 'death', at: 'server/src/duel.js _duelOnDeath' },
      { edge: 'leave', at: 'server/src/duel.js _duelOnDisconnect' },
    ],
    rejoin: ['duel'],
    held: { suite: 'server/test/duel-door.test.mjs' },
    note: 'v2.3.5211: the door (DUEL_WAYS resolve; the end final; live flag dueldoor). The record\'s status was the natural one field (_duelFor reads `active`); the leave starts a 15 s away clock, not an end.',
  },
  {
    name: 'trade', side: 'worker', status: 'door',
    what: 'A trade session: open (offer, review, confirmed), then done or cancelled; an invite is not yet a session but a key of _t2Invites with its own TTL.',
    field: 's.state', states: ['open', 'done', 'cancelled'],
    fn: '_t2To', file: 'server/src/trade2.js',
    clears: [
      { edge: 'end', at: 'server/src/trade2.js _t2Cancel' },
      { edge: 'leave', at: 'server/src/trade2.js _trade2OnDisconnect' },
    ],
    rejoin: ['trade', 'trade-invite'],
    held: { suite: 'server/test/trade-door.test.mjs' },
    note: 'v2.3.5210: the door (TRADE_WAYS cancel, swap; both ends final; live flag tradedoor). A death does not cancel the window (fightlock.js); the takeover way skips the leave\'s cancel on purpose (TRAPS §162).',
  },
  {
    name: 'party', side: 'worker', status: 'door',
    what: 'A player\'s place in a party: a member, or none; an invite is a key of _partyInvites, the leader is the party record\'s own pointer, and away is a member whose body is offline.',
    field: 'this._partyByPlayer', states: ['member', 'none'],
    fn: '_partyIn', file: 'server/src/party.js',
    clears: [
      { edge: 'end', at: 'server/src/party.js _partyRemoveMember' },
      { edge: 'leave', at: 'server/src/party.js _partyOnDisconnect' },
    ],
    rejoin: ['party'],
    held: { suite: 'server/test/party-door.test.mjs' },
    note: 'v2.3.5212: the door (PARTY_WAYS load, join, clan, leave, disband; a member stands in the party\'s own list; live flag partydoor). The leave marks the member away, it does not remove them (partykeep). A rejoin re-sends the roster (join.js _partyOnRejoin, before rejoinresend.js existed).',
  },
  {
    name: 'ride', side: 'worker', status: 'door',
    what: 'The skateboard: on or off, ended for a reason (RIDE.WHY).',
    field: 'ps._ride', states: ['off', 'on'],
    fn: '_rideTo', file: 'server/src/ride.js',
    clears: [
      { edge: 'end', at: 'server/src/ride.js _rideEnd' },
      { edge: 'death', at: 'server/src/index.js _handlePlayerDeath' },
    ],
    rejoin: 'none: the worker stores nothing and a join is off the board (the ride slot\'s why: the phone clears its own)',
    held: { suite: 'server/test/ride-door.test.mjs' },
    note: 'v2.3.5523: the door (RIDE_WAYS board, end; a board is the living\'s alone and tells a session, ps._ridePid written beside it; an end only of a ride that is on; live flag ridedoor). Every end goes through _rideEnd, the start through _handleRide. The worker stores nothing, so a join is off the board (the slot\'s why).',
  },
  {
    name: 'harvest', side: 'worker', status: 'door',
    what: 'Gathering a node: a player\'s gather record, none or started (its window opening is a time on it; a strike ends it, paid or not).',
    field: 'this.extractions', states: ['none', 'started'],
    fn: '_harvestTo', file: 'server/src/gathering.js',
    clears: [
      { edge: 'end', at: 'server/src/gathering.js _handleNodeStrike' },
      { edge: 'end', at: 'server/src/gathering.js _endExtraction' },
    ],
    rejoin: 'none: the record outlives the socket on purpose (leave.js, v2.3.3322) and the phone replays a strike its dropped socket ate',
    held: { suite: 'server/test/harvest-door.test.mjs' },
    note: 'v2.3.5214: the door (HARVEST_WAYS start, strike, end, sweep; a started record carries its start, so the sweep can always end it; live flag harvestdoor). Mining, woodcutting and fishing share it (fishing\'s row is this door). ps.ex, the phone\'s claim, is the cook row\'s door (v2.3.5213, movement.js _exTo).',
  },
  {
    name: 'cook', side: 'worker', status: 'door',
    what: 'The phone\'s claim on its moves, cooking\'s only phase on the worker: none, or what it is at (cook, fire, mine, chop, fish, a step on a farm bed).',
    field: 'ps.ex', states: ['none', 'cook', 'fire', 'mine', 'chop', 'fish', 'farm'],
    fn: '_exTo', file: 'server/src/movement.js',
    clears: [
      { edge: 'end', at: 'server/src/movement.js _handleMove' },
      { edge: 'leave', at: 'server/src/linger.js _lingerOnClose' },
      { edge: 'leave', at: 'server/src/bodytake.js _bodyTakeStart' },
    ],
    rejoin: 'none: a fresh body has no fire or plan; only the rate\'s history is stored',
    held: { suite: 'server/test/cook-door.test.mjs' },
    note: 'v2.3.5213: the door (EX_WAYS move, linger, take; a claim is a string of 32 characters at most, or nothing; the edge stamps _exAt, _exX, _exY; live flag exdoor). Notes beside it, not phases: ps._fireLit (moveclaims.js _fireLitNote) and ps._cookHits (gathering.js _planCookHits, cooking.js _handleCookRequest). No record is held to a cook on purpose (gathering.js): ps.ex === \'cook\' is the only "is cooking".',
  },
  {
    name: 'guard', side: 'worker', status: 'door',
    what: 'The shield: down, raised with its parry window, holding, broken for 3 s.',
    field: 'ps.blocking', states: ['down', 'parry', 'raised', 'broken'],
    fn: '_guardTo', file: 'server/src/moveclaims.js',
    clears: [
      { edge: 'end', at: 'server/src/hits.js _hitStopped' },
      { edge: 'leave', at: 'server/src/linger.js _lingerOnClose' },
    ],
    rejoin: 'none: the phone says `blocking` again on every move',
    held: { suite: 'server/test/guard-door.test.mjs' },
    note: 'v2.3.5536: the door (GUARD_WAYS raise, lower, break; the parry stamp ps.blockStartT and the break latch ps._guardBrokenUntil written beside it, never alone; a raise is refused while the latch is live; live flag guarddoor). Its callers: movement.js _handleMove, moveclaims.js _swingDropsGuard, combat.js _resolvePvPAttack, pvpextras.js _strikePlayer, hits.js _hitStopped, index.js _tickPlayerRegen, linger.js, bodytake.js, and the sparring clone (spar.js). The phase is guardStateOf (moveclaims.js); a death touches none of it.',
  },
  {
    name: 'pose', side: 'worker', status: 'door',
    what: 'A held pose: standing, or one of POSE.IDS.',
    field: 'ps.po', states: ['standing', 'posing'],
    fn: '_poseTo', file: 'server/src/poses.js',
    clears: [
      { edge: 'end', at: 'server/src/poses.js _handlePose' },
      { edge: 'end', at: 'server/src/movement.js _handleMove' },
      { edge: 'leave', at: 'server/src/bodytake.js _bodyTakeStart' },
    ],
    rejoin: 'none: every join makes the body afresh with no po (the pose slot\'s why: the phone stands up too)',
    held: { suite: 'server/test/pose-door.test.mjs' },
    note: 'v2.3.5216: the door (POSE_WAYS hold, stand, move, take; a pose held is one of POSE.IDS and never by the dead or the dying; live flag posedoor). posing: one of POSE.IDS. The spacing (POSE.MIN_GAP_MS) and the switches (emotes, emotemoves) stay the handler\'s. Memory only ("a deploy stands everyone up").',
  },
  {
    name: 'race', side: 'worker', status: 'door',
    what: 'Lil Bro\'s race round the square: on (its countdown and its running, times on the record), or none.',
    field: 'ps._race', states: ['none', 'on'],
    fn: '_raceTo', file: 'server/src/race.js',
    clears: [{ edge: 'end', at: 'server/src/race.js _raceEnd' }],
    rejoin: 'none: "a race lost to a reconnect is a race run again" (race.js); the join makes the body afresh',
    held: { suite: 'server/test/race-door.test.mjs' },
    note: 'v2.3.5217: the door (RACE_WAYS start, end; a race on carries its gun t0 and its deadline endBy after it, so the next move can always end it; live flag racedoor). The countdown (now < t0) and the running are times, not phases. A death or a leave of the Wheel ends it at the next move (_raceOnMove, \'left\').',
  },
  {
    name: 'arena', side: 'worker', status: 'door',
    what: 'The Gladiator tournament (gathering, running, complete) and a player\'s match in it.',
    field: 'this._arena', states: ['none', 'gathering', 'running', 'complete'],
    fn: '_arenaTo', file: 'server/src/gladiator.js',
    clears: [
      { edge: 'end', at: 'server/src/gladiator.js _arenaOnMatchResolved' },
      { edge: 'death', at: 'server/src/duel.js _duelOnDeath' },
    ],
    rejoin: ['arena'],
    held: { suite: 'server/test/arena-door.test.mjs' },
    note: 'v2.3.5522: the door (ARENA_WAYS open, start, crown, empty, cancel, clear; the rules are the callers\' own checks; live flag arenadoor). The phase is the record\'s own status; start and crown turn it in place. A player\'s place in it (queued, fighting, eliminated) is read off the record (_arenaStatusFor); ps._arenaMatch, the healing gates\' marker, is a note beside it, held by the suite to its two writers (_arenaTryActivate, _arenaOnMatchResolved). A match is a wager-0 duel (this._duels, arenaMatch); _arenaInMatch reads the duel as the truth. arena.js is the retired class, kept for its binding.',
  },
  {
    name: 'fishing', side: 'worker', status: 'door',
    what: 'Fishing: a gather record on a fishing spot, with no field of its own.',
    field: 'this.extractions', states: ['none', 'started'],
    fn: '_harvestTo', file: 'server/src/gathering.js',
    clears: [{ edge: 'end', at: 'server/src/gathering.js _handleNodeStrike' }],
    rejoin: 'none: the extraction record outlives the socket (harvest\'s)',
    held: { suite: 'server/test/harvest-door.test.mjs' },
    note: 'v2.3.5214: harvest\'s record with skill \'fishing\', through harvest\'s door (harvest-door.test §3 plays a fishing start and its paid strike).',
  },

  {
    name: 'dungeon', side: 'worker', status: 'door',
    what: 'A dungeon run: active (its waves), its boss, done; a player is in it by their place.',
    field: 'inst.runPhase', states: ['active', 'boss', 'done'],
    fn: '_dungeonTo', file: 'server/src/dungeon.js',
    clears: [
      { edge: 'end', at: 'server/src/dungeon.js _dungeonCleanup' },
      { edge: 'death', at: 'server/src/index.js _tickPlayerRespawn' },
    ],
    rejoin: 'none: the join lands back in its run by its place (ps.z dungeon:<id>), and the pass lives on the run (zonejudge.js R1)',
    held: { suite: 'server/test/dungeon-door.test.mjs' },
    note: 'v2.3.5215: the door (DUNGEON_WAYS boss, clear; the end final, one boss after the waves; live flag dungeondoor). It writes the old pair for their readers: inst.state \'done\' at the end (\'active\' all through the boss), inst.bossSpawned at the boss. Not phases: the wave (a count), emptySince, the run\'s place in this._dungeons (born at the start, gone at _dungeonCleanup). No field on the player: membership is the place (dungeon.js _dungeonZonePlayers).',
  },

  /* ═══ TO DO, THE PAGE (card L PR 5: then connection, loading, window) ═══ */
  {
    name: 'life', side: 'page', status: 'door',
    what: 'Your own dying seconds on the phone, from the death to the respawn.',
    field: 'S._dying', states: ['alive', 'dying'],
    fn: 'dyingTo', file: 'src/game/dyingDoor.js',
    clears: [{ edge: 'death', at: 'src/game/respawn.js applyLocalRespawn' }],
    rejoin: 'none: the worker\'s life note sends the same death back at the join',
    held: { suite: 'server/test/life-page-door.test.mjs' },
    notes: ['S._deathStart'],   /* v2.3.5534: written beside the field by the same call */
    note: 'v2.3.5534: the door (DYING_WAYS die, seed, respawn; switch ?dyingdoor), in place of fourteen writes in six files. Beside it: S.respawnTimer (also a dodge\'s short hold, dodge.js), the death card (S._deathCard, deathCard.js). The worker\'s half is the life door (_lifeTo, ps.life).',
  },
  {
    name: 'fight', side: 'page', status: 'door',
    what: 'The phone\'s own note of a fight with a player, and the skull it shows.',
    field: 'S._pvpSkullType', states: ['free', 'red', 'white'],
    fn: 'skullTo', file: 'src/game/skullDoor.js',
    clears: [{ edge: 'never', at: 'src/game/fightFood.js notePvpHit' }],
    rejoin: 'none: a clock that runs out by itself',
    held: { suite: 'server/test/fight-page-door.test.mjs' },
    notes: ['S._pvpSkullUntil'],   /* v2.3.5533: written beside the skull by the same call */
    note: 'v2.3.5533: the door (SKULL_WAYS threat, issue, nml; switch ?skulldoor): the skull and its time. Beside it: the fight\'s own clock (S._pvpAt, fightFood.js: the last blow, read as fighting by the fight lock), the threat\'s record (S.rpg._threatState) and cooldown (S._pvpThreatCdUntil), No man\'s land\'s record (S._nmlSelf).',
  },
  {
    name: 'duel', side: 'page', status: 'door',
    what: 'The phone\'s copy of a duel: pending, on, over.',
    field: 'S._inDuel', states: ['none', 'pending', 'on'],
    fn: 'duelTo', file: 'src/game/duelDoor.js',
    clears: [
      { edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' },
      { edge: 'end', at: 'src/networking/gameEvents.js processGameEvent' },
    ],
    rejoin: ['duel'],
    held: { suite: 'server/test/duel-page-door.test.mjs' },
    notes: ['S._activeDuel'],   /* v2.3.5529: a field the door writes beside its own, by the same call */
    note: 'v2.3.5529: the door (DUEL_PAGE_WAYS start, resume, pending, drop, end, rejoin; switch ?dueldoor). Its note S._activeDuel is written beside it by the same call. The record\'s own marks (settleBy, prev) are duelPending.js\'s.',
  },
  {
    name: 'trade', side: 'page', status: 'door',
    what: 'The phone\'s trade window and invite card.',
    field: 'S._t2Live', states: ['none', 'open'],
    fn: 't2LiveTo', file: 'src/game/tradeSlot.js',
    clears: [
      { edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' },
      { edge: 'end', at: 'src/networking/gameEvents.js processGameEvent' },
    ],
    rejoin: ['trade', 'trade-invite'],
    held: { suite: 'server/test/trade-page-door.test.mjs' },
    note: 'v2.3.5530: the door (TRADE_PAGE_WAYS open, close, rejoin; switch ?tradedoor). The invite card and a leave under way are notes beside it (the invite: React state and REJOIN_SLOTS trade-invite; the leave: S._t2Leave and its hush S._t2QuietUntil, t2Leave), as are S._t2DoneWatch and S._t2LocalEnd.',
  },
  {
    name: 'party', side: 'page', status: 'door',
    what: 'The phone\'s party roster.',
    field: 'S._party', states: ['none', 'member'],
    fn: 'partyTo', file: 'src/game/partyDoor.js',
    clears: [{ edge: 'rejoin', at: 'src/networking/wsClient.js onmessage' }],
    rejoin: ['party'],
    held: { suite: 'server/test/party-page-door.test.mjs' },
    note: 'v2.3.5529: the door (PARTY_PAGE_WAYS state, gone, rejoin; switch ?partydoor). The HUD (setParty, React state) is the callers\'.',
  },
  {
    name: 'ride', side: 'page', status: 'door',
    what: 'Your skateboard on the phone.',
    field: 'S._ride', states: ['off', 'on'],
    fn: 'rideTo', file: 'src/game/ride.js',
    clears: [{ edge: 'rejoin', at: 'src/game/ride.js clearRide' }],
    rejoin: ['ride'],
    held: { suite: 'server/test/ride-page-door.test.mjs' },
    note: 'v2.3.5530: the door (RIDE_PAGE_WAYS make, apply, forget; the phase is the record\'s own on; switch ?ridedoor). The record\'s other numbers (the ask, the speed, the last step) are notes on it, written by their own steps.',
  },
  {
    name: 'harvest', side: 'page', status: 'door',
    what: 'A gathering swing on the phone: waiting for the window, ready to strike.',
    field: 'S._extraction', states: ['none', 'waiting', 'ready'],
    fn: 'harvestTo', file: 'src/game/harvestDoor.js',
    clears: [
      { edge: 'zone', at: 'src/game/zoneTransitions.js clearZoneLocalFx' },
      { edge: 'end', at: 'src/game/lifeSkillRewards.js succeedExtraction' },
    ],
    rejoin: 'none: the worker keeps the record, and the phone replays a strike (wsClient.js _holdForRejoin)',
    held: { suite: 'server/test/harvest-page-door.test.mjs' },
    note: 'v2.3.5219: the page door (HARVEST_PAGE_WAYS start, try, open, strike, lost, walk, tried, again, zone; the rules are the callers\' own checks; ?harvestdoor=0). One field, S._extraction, carries mining, woodcutting, fishing and cooking (its `skill`); the phase is its `status`, and the window opens in place. S._nearNode and S._proxNode (the node you stand by, for the prompt) are notes beside it, fields of their own.',
  },
  {
    name: 'cook', side: 'page', status: 'door',
    what: 'Cooking on the phone: S._extraction with skill cooking, at a fire you lit.',
    field: 'S._extraction', states: ['none', 'waiting', 'ready'],
    fn: 'harvestTo', file: 'src/game/harvestDoor.js',
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js clearZoneLocalFx' }],
    rejoin: 'none: the worker holds no cook either',
    held: { suite: 'server/test/harvest-page-door.test.mjs' },
    note: 'v2.3.5219: harvest\'s record with skill \'cooking\', through harvest\'s page door (harvest-page-door.test §3 plays a cook\'s start and its strike). The fire (S._campfire) and its lighting (S._firemaking) are notes beside it, fields of their own.',
  },
  {
    name: 'fishing', side: 'page', status: 'door',
    what: 'Fishing on the phone: S._extraction with skill fishing.',
    field: 'S._extraction', states: ['none', 'waiting', 'ready'],
    fn: 'harvestTo', file: 'src/game/harvestDoor.js',
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js clearZoneLocalFx' }],
    rejoin: 'none: harvest\'s',
    held: { suite: 'server/test/harvest-page-door.test.mjs' },
    note: 'v2.3.5219: harvest\'s record with skill \'fishing\', through harvest\'s page door. S.fishTimer is made in the state\'s first object and never read (the ledger\'s noRead): a leftover, a note beside it.',
  },
  {
    name: 'guard', side: 'page', status: 'door',
    what: 'Your shield on the phone: raised, by key, mouse or button, dropped.',
    field: 'S._shieldUp', states: ['down', 'up'],
    fn: 'guardTo', file: 'src/game/guardDoor.js',
    clears: [{ edge: 'end', at: 'src/game/shieldToggle.js dropShield' }],
    rejoin: 'none: the phone sends its guard on every move; the worker keeps none across a join',
    held: { suite: 'server/test/guard-page-door.test.mjs' },
    note: 'v2.3.5521: the page door (GUARD_PAGE_WAYS raise, drop; the rules are raiseShieldToggle\'s and dropShield\'s own checks: up only from down, with a shield in hand and out of the cooldown, down only from up; ?guarddoor=0). The phase is the boolean every reader reads. Notes beside it: which input holds it (S._shieldKb, S._shieldMouse), the cooldown (S._shieldCdUntil, S._shieldAutoReleased, S.shieldEnd), the raise\'s stamp (S.shieldActive), the renderer\'s pose (S._blockPose) and blockRingBus.js\'s state. The worker\'s half waits for card K.',
  },
  {
    name: 'pose', side: 'page', status: 'door',
    what: 'Your own held pose on the phone.',
    field: 'S._pose', states: ['standing', 'posing'],
    fn: 'poseTo', file: 'src/game/poseDoor.js',
    clears: [
      { edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' },
      { edge: 'end', at: 'src/game/interactions.js endOwnPose' },
    ],
    rejoin: ['pose'],
    held: { suite: 'server/test/pose-page-door.test.mjs' },
    note: 'v2.3.5520: the page door (POSE_PAGE_WAYS hold, stand, forget; the rules are sendMove\'s and endOwnPose\'s own checks; ?posedoor=0). The zone\'s reset is endOwnPose (resetOn), the rejoin\'s rejoinClear, both asking the door. Its emoji\'s beat (popAt) is a count on the record; a moment\'s move (S._emoteMove) is no pose.',
  },
  {
    name: 'race', side: 'page', status: 'door',
    what: 'The race on the phone: asked, the countdown, running, its end card.',
    field: 'S._race', states: ['none', 'asked', 'count', 'run', 'done'],
    fn: 'raceTo', file: 'src/game/raceDoor.js',
    clears: [
      { edge: 'end', at: 'src/game/race.js dismissRace' },
      { edge: 'rejoin', at: 'src/game/race.js forgetRace' },
    ],
    rejoin: 'none: not a REJOIN_SLOTS row; the worker forgets a race at a join (its row), and the rejoin\'s resetOn forgets the phone\'s (forgetRace)',
    held: { suite: 'server/test/race-page-door.test.mjs' },
    note: 'v2.3.5218: the page door (RACE_PAGE_WAYS ask, fail, state, gun, end, dismiss, timeout, forget; the rules are race.js\'s own checks; ?racedoor=0). The phase is the record\'s own `phase`; the gun turns it in place. S._raceLil (Lil Bro\'s run, drawn) is a note beside it: it outlives the race until he is home.',
  },
  {
    name: 'arena', side: 'page', status: 'door',
    what: 'The phone\'s view of the tournament and its own match.',
    field: 'S._arenaMatch', states: ['none', 'involved', 'fighting'],
    fn: 'arenaTo', file: 'src/game/arenaDoor.js',
    clears: [{ edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' }],
    rejoin: ['arena'],
    held: { suite: 'server/test/arena-page-door.test.mjs' },
    notes: ['S._arenaInvolved', 'S._arenaTournamentId'],   /* v2.3.5531: written beside the field by the same call */
    note: 'v2.3.5531: the door (ARENA_PAGE_WAYS poll; switch ?arenadoor). Its notes S._arenaInvolved and S._arenaTournamentId by the same call; beside it: the stake board (S._arenaStakeBoard, gameEvents.js) and the popup mark (S._arenaNotified). A match rides S._inDuel (the duel\'s row): the rejoin clears it with the duel.',
  },
  {
    name: 'dungeon', side: 'page', status: 'door',
    what: 'A dungeon run on the phone: opening, in it, its waves, cleared, complete, back out.',
    field: 'S._inDungeon', states: ['none', 'in', 'complete'],
    fn: 'dungeonTo', file: 'src/game/dungeonDoor.js',
    clears: [
      { edge: 'death', at: 'src/game/respawn.js applyLocalRespawn' },
      { edge: 'zone', at: 'src/game/wheelDungeons.js leaveWheelDungeon' },
    ],
    rejoin: 'none: the worker\'s run keeps the pass across a reconnect behind the loading screen (zonejudge.js R1)',
    held: { suite: 'server/test/dungeon-page-door.test.mjs' },
    notes: ['S._inCustomDungeon', 'S._dungeonComplete'],   /* v2.3.5535: written beside the field by the same call */
    note: 'v2.3.5535: the door (DUNGEON_PAGE_WAYS enter, complete, leave; each call names the fields its site wrote, and only those; switch ?dungeondoor), in place of twenty-four writes in seven files. The opening (S._wheelDungeonOpening) and the clear (S._dungeonClear) are their own notes beside it, with the run\'s place and number (S._serverDungeon, S._dungeonZone, S._dungeonWave, S._dungeonBack) and the entry time (S._dungeonEnteredAt).',
  },
  {
    name: 'connection', side: 'page', status: 'door',
    what: 'The phone\'s socket: connecting, connected, idle, and each refusal\'s screen.',
    field: 'S._realtimeStatus', states: ['connecting', 'connected', 'disconnected', 'idle', 'linger', 'full', 'device', 'key', 'locked', 'origin', 'rejected', 'superseded', 'verify', 'frozen'],
    fn: 'connTo', file: 'src/game/connectionDoor.js',
    clears: [{ edge: 'rejoin', at: 'src/networking/wsClient.js onmessage' }],
    rejoin: 'none: it is the rejoin',
    held: { suite: 'server/test/connection-door.test.mjs' },
    note: 'v2.3.5528: the door (CONN_PHASES, the one rule the callers\' own: a word of the list; switch ?conndoor), once card K freed wsClient.js, which wrote it in 21 places. Beside it: the refusals\' own marks (S._joinRejectedFatal, S._tabMoved, S._frozenByAdmin), the server\'s veil (S._netHold, the loading door\'s net), serverReady.js\'s _state and _veil.',
  },
  {
    name: 'loading', side: 'page', status: 'door',
    what: 'The world\'s veils: a zone loading, a trip veiled, the town\'s, your farm\'s or your bro\'s art being made.',
    field: 'S._veils', states: ['in', 'veiled'],
    fn: 'veilTo', file: 'src/game/veilDoor.js',
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js handleZoneTransitions' }],
    rejoin: 'none: the page\'s own',
    held: { suite: 'server/test/loading-door.test.mjs' },
    note: 'v2.3.5525: the door (the planner\'s reading: one field, the set of reasons; S._veils a Map from VEIL_WHYS zone, trip, town, farm, avatar (and net, v2.3.5527) to its hold; veilTo writes each reason\'s old field, S._zoneLoading, S._wheelTripVeil, S._townArtHold, S._farmArtHold, S._avatarArtHold, for its readers; switch ?veildoor). v2.3.5527: + net, S._netHold (wsClient.js, serverReady.js), once card K freed wsClient.js. Beside it: the dungeon\'s opening (the dungeon row), and the first loading screen\'s gate (ui/loadingGate.js _up, _worldIn, _waiting: its own read of the overlay).',
  },
  {
    name: 'window', side: 'page', status: 'door',
    what: 'What is open over the world: a panel, a sheet or a card of BroTown\'s, and the townsperson whose prompt is up.',
    field: 'S._windows', states: ['none', 'open'],
    fn: 'windowTo', file: 'src/game/windowDoor.js',
    clears: [{ edge: 'end', at: 'src/ui/BroTown.jsx BroTown' }, { edge: 'end', at: 'src/ui/mobile/modalGuardBus.js guardPush' }],
    rejoin: 'none: the page\'s own',
    held: { suite: 'server/test/window-door.test.mjs' },
    note: 'v2.3.5526: the door (the planner\'s reading: one field, the set of reasons; S._windows a Map from WINDOW_WHYS panel, npc to its hold; windowTo writes each reason\'s old field, S._uiBusy (a lift is false) and S._npcProxLatch (a lift is null), for its readers; switch ?windowdoor). Beside it: the decision panels\' count (modalGuardBus.js _depth, module state with no S, guardPush and the release it hands back) and each window\'s own bus record (inventoryBus, wheelBus, ChestReveal): what is in a window, not whether the world is covered.',
  },
  /* ═══ v2.3.6540: THE TWO BUTTONS' THREE PHASES (card CT PR 1; `?manual=5`, a trial) ═══
     Each one field and one function from its first line (CLAUDE.md section
     5); nothing calls them until the card's PR 2 (the stick) and PR 3 (the
     sight and the latch), so a write found anywhere but the door fails today. */
  {
    name: 'stick', side: 'page', status: 'door',
    what: 'The left stick in the two buttons: at rest, turning the body in place, or walking.',
    field: 'S._stickPhase', states: ['rest', 'turn', 'walk'],
    fn: 'stickTo', file: 'src/game/stickZones.js',
    clears: [{ edge: 'end', at: 'src/game/stickZones.js stickTo' }],
    rejoin: 'none: the page\'s own, a thumb on the glass',
    held: { suite: 'server/test/stick-zones.test.mjs' },
    note: 'v2.3.6540: the zones by the thumb\'s share of the disc\'s drawn radius (STICK_ZONES; `?turnzone`). A lifted thumb is rest (the release, PR 2).',
  },
  {
    name: 'sight', side: 'page', status: 'door',
    what: 'Whether a monster is in your sight in the two buttons: alive, in the weapon\'s range and the faced cone.',
    field: 'S._sightPhase', states: ['none', 'sighted'],
    fn: 'sightTo', file: 'src/game/sight.js',
    clears: [
      { edge: 'end', at: 'src/game/sight.js sightStep' },
      { edge: 'zone', at: 'src/game/sight.js sightClear' },
      { edge: 'death', at: 'src/game/sight.js sightClear' },
    ],
    rejoin: 'none: the page\'s own, made again each frame from the monsters it holds',
    held: { suite: 'server/test/sight.test.mjs' },
    notes: ['S._sightId', 'S._sightAt'],
    note: 'v2.3.6540: its notes, the sighted id and the last sighting\'s moment, written beside it in sightStep and sightClear; the phase falls to none only SIGHT.HOLD_MS after the last sighting (no flicker at the edge: TRAPS 218).',
  },
  {
    name: 'latch', side: 'page', status: 'door',
    what: 'The Attack latch in the two buttons: idle, active (a target locked: a tap strikes it), or auto (locked, the held attack on: a hold past the ring\'s fill).',
    field: 'S._latchPhase', states: ['idle', 'active', 'auto'],
    fn: 'latchTo', file: 'src/game/latch.js',
    clears: [
      { edge: 'end', at: 'src/game/latch.js latchCheck' },
      { edge: 'death', at: 'src/game/latch.js latchClear' },
      { edge: 'zone', at: 'src/game/latch.js latchClear' },
    ],
    rejoin: 'none: the page\'s own; the worker keeps no lock (nothing on the worker changes in card CT)',
    held: { suite: 'server/test/latch.test.mjs' },
    notes: ['S._latchId', 'S._latchEnd'],
    note: 'v2.3.6540: the five ends (LATCH_ENDS press, range, killed, death, zone) and the one move (the target dead, another in sight: the nearest, no new press). Its notes, the locked id and the last end, written by latchTo with it. v2.3.6548 (card CT part 15): auto is a phase, not a boolean beside it (S.autoAttack derived from it, latchHolds); active to auto at the hold\'s fill (latchFill: the press\'s start time S._latchHoldAt, not a phase); with the hold\'s rule a kill lets go (no move); `?holdauto=0` the old press (a lock is auto at once, the move kept).',
  },
  {
    name: 'thumb', side: 'page', status: 'door',
    what: 'The two buttons\' right side: calm (Attack and Jump), threat (Block: a monster in sight or locked, or a monster\'s hit in the last 3 s) or reach (Block and the specials: a monster where an attack connects).',
    field: 'S._thumbPhase', states: ['calm', 'threat', 'reach'],
    fn: 'thumbTo', file: 'src/game/thumbSide.js',
    clears: [
      { edge: 'end', at: 'src/game/thumbSide.js thumbStep' },
      { edge: 'death', at: 'src/game/thumbSide.js thumbClear' },
      { edge: 'zone', at: 'src/game/thumbSide.js thumbClear' },
    ],
    rejoin: 'none: the page\'s own, made again each frame from the monsters, the sight and the latch it holds',
    held: { suite: 'server/test/thumb-side.test.mjs' },
    notes: ['S._thumbAt'],
    note: 'v2.3.6549 (card CT part 16): its note, the last frame in reach, written beside it in thumbStep and thumbClear; reach has an in line and a wider out line (1.25) and holds THUMB.HOLD_MS past the last frame in it (no flicker at the edge: TRAPS 218). Block, the specials and Charge each ask it through controlVisibility.js; `?reachspecials=0` and `?threatblock=0` the sighting, as before.',
  },
];

/* Ledger rows D's census marks `phase` (a field set to, or compared with, two
   or more words) that are NOT a state machine's field, each with why.  The
   rest of the marked rows are fields of a row above (`S.currentZone`, the
   zone's door; `S._realtimeStatus`, connection's; `S._pvpSkullType`,
   fight's). */
export const NOT_A_MACHINE = [
  { field: '_lockDroppedWhy', why: 'the reason the last lock dropped, a word kept for QA (targeting.js); nothing moves on it' },
  { field: '_facingSrc', why: 'which input decided the facing this frame, for QA (entityRenderer.js); recomputed every frame' },
  { field: '_aimSrc', why: 'the input the aim came from (lock, mouse, stick, tap): a source, not a step' },
  { field: '_facing', why: 'up or down, a direction the body faces, not a step anything goes through' },
  { variable: '_mode', file: 'src/game/chatChannel.js', why: 'the chat lane chosen (area, party, whisper): a setting the player picks' },
  { variable: '_bakeTag', file: 'src/rendering/bodyRecolor.js', why: 'a QA tag naming the bake under test (\'\', jog-east)' },
  { variable: '_portraitForce', file: 'src/rendering/characterPortrait.js', why: 'a QA switch forcing the portrait\'s path (every, fresh)' },
  { variable: '_tradeSide', file: 'src/ui/panels/TradeWindowPanel.jsx', why: 'which side of the trade window the narrow layout shows (0, 1): a view, not the trade\'s step' },
];
