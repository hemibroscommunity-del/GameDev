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
 *   held    a door: { suite } -- the door's own suite fails a second writer,
 *           and the guard only checks it names the field and the function --
 *           or { scan, born, besides } where nothing else holds it: every
 *           write the scan's pattern finds is in one of its places
 *   today   a todo: today's fields.  A page field is `S.<name>` or a variable
 *           and its file: a ledger row, whose writers are the ledger's own
 *           (`writers`, held to the code by state-ledger.test; by function:
 *           `node tools/dev/state-census.mjs --dossier`).  A worker field has
 *           its file and writers, "<file> <function>", read from the code
 *           2026-11-14 (the worker's state has no ledger)
 *   note    where a row needs words
 */

const W = (field, file, writers) => ({ field, file, writers });

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
      scan: [{ write: '\\.phase\\s*=(?!=)', at: ['server/src/join.js _handleJoin', 'server/src/leave.js _leaveRun'] }],
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
    field: 'm.life', states: ['alive', 'dead'],
    fn: '_monsterNewLife', file: 'server/src/monsterlife.js',
    clears: [{ edge: 'end', at: 'server/src/monsterlife.js _monsterNewLife' }],
    rejoin: 'none: a monster is the room\'s, sent in every tick',
    held: {
      scan: [
        { write: '\\b(?:m|mn)\\.life\\s*(?:=(?!=)|\\+=|\\+\\+)', at: ['server/src/monsterlife.js _monsterNewLife'] },
        { write: '\\b(?:m|mn)\\.alive\\s*=\\s*true', at: ['server/src/monsterlife.js _monsterNewLife'] },
      ],
    },
    note: 'The door is the new-life edge: m.life counts lives and m.alive comes back true only in _monsterNewLife. The kill (m.alive = false: combat.js, devtools.js, slimeboss.js) is the death edge, not the door. monster-newlife.test fails a per-monster field in no reset list; this scan fails a second new life.',
  },
  {
    name: 'monster', side: 'page', status: 'door',
    what: 'A monster\'s life on the phone: alive, dead, then a new life of the same object.',
    field: 'm.alive', states: ['alive', 'dead'],
    fn: 'monsterNewLife', file: 'src/game/monsterCarry.js',
    clears: [{ edge: 'end', at: 'src/game/monsterCarry.js monsterNewLife' }],
    rejoin: 'none: the worker\'s monsters come back in its zone state at every state_sync',
    held: {
      scan: [{ write: '\\.alive\\s*=\\s*true', at: ['src/game/monsterCarry.js monsterNewLife'] }],
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
    name: 'zone', side: 'worker', status: 'todo',
    what: 'A player\'s place on the worker, judged at a change (zonejudge.js) and written by hand where the worker moves them.',
    field: null, states: ['wheel', 'town', 'farm_home', 'dungeon:<id>'], fn: null, file: null,
    clears: [{ edge: 'death', at: 'server/src/index.js _tickPlayerRespawn' }],
    rejoin: 'none: the join writes the place afresh (join.js _handleJoin)',
    today: [
      W('ps.z', 'server/src/movement.js', ['server/src/movement.js _handleMove', 'server/src/join.js _handleJoin', 'server/src/index.js _tickPlayerRespawn']),
    ],
    note: 'Three functions, five places (the join\'s three: the fresh body, the stand-up, a kept body). A sparring clone copies its owner\'s (spar.js), not a player\'s place. The leave remembers it (lastplace.js) with the body.',
  },
  {
    name: 'fight', side: 'worker', status: 'todo',
    what: 'A player fighting another player: a clock, not a field; the fight lock derives it at each ask.',
    field: null, states: ['free', 'fighting', 'locked'], fn: null, file: null,
    clears: [{ edge: 'never', at: 'server/src/cooking.js _pvpHealPrune' }],
    rejoin: 'none: the clock is the room\'s and survives a rejoin on purpose (cooking.js); refusals say it per action',
    today: [
      W('this._pvpHealClocks', 'server/src/cooking.js', ['server/src/cooking.js _pvpHealClock', 'server/src/cooking.js _notePvpExchange', 'server/src/cooking.js _pvpHealPrune', 'server/src/spar.js _sparRemove']),
      W('ps.lastDamageAt', 'server/src/combat.js', ['server/src/combat.js _applyDamage', 'server/src/join.js _handleJoin', 'server/src/index.js _tickPlayerRespawn']),
    ],
    note: 'fightlock.js _fightLockHolds reads the duel, this clock (10 s), the red skull (ps._nml.red with ps.lastDamageAt) and the place (No man\'s land).',
  },
  {
    name: 'duel', side: 'worker', status: 'todo',
    what: 'A duel: challenged, active (away for a while), resolved.',
    field: null, states: ['challenge', 'active', 'away', 'resolved'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/duel.js _resolveDuel' },
      { edge: 'death', at: 'server/src/duel.js _duelOnDeath' },
      { edge: 'leave', at: 'server/src/duel.js _duelOnDisconnect' },
    ],
    rejoin: ['duel'],
    today: [
      W('this._duelChallenges', 'server/src/duel.js', ['server/src/duel.js _interceptDuel', 'server/src/duel.js _tickDuels']),
      W('this._duels', 'server/src/duel.js', ['server/src/duel.js _interceptDuel', 'server/src/duel.js _resolveDuel', 'server/src/gladiator.js _arenaTryActivate']),
      W('d.away', 'server/src/duel.js', ['server/src/duel.js _duelOnDisconnect', 'server/src/duel.js _duelOnRejoin', 'server/src/duel.js _duelZoneMoved']),
    ],
    note: 'The record\'s status is the natural one field (_duelFor reads `active`); the leave starts a 15 s away clock, not an end.',
  },
  {
    name: 'trade', side: 'worker', status: 'todo',
    what: 'A trade window: invited, open (offer, review, confirmed), done or cancelled.',
    field: null, states: ['invited', 'open', 'done', 'cancelled'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/trade2.js _t2Cancel' },
      { edge: 'leave', at: 'server/src/trade2.js _trade2OnDisconnect' },
    ],
    rejoin: ['trade', 'trade-invite'],
    today: [
      W('this._t2Invites', 'server/src/trade2.js', ['server/src/trade2.js _handleTrade2Open', 'server/src/trade2.js _t2ClearInvites', 'server/src/trade2.js _tickTrades2']),
      W('this._trades2', 'server/src/trade2.js', ['server/src/trade2.js _handleTrade2Open', 'server/src/trade2.js _t2Cancel', 'server/src/trade2.js _handleTrade2Confirm']),
    ],
    note: 'A death does not cancel the window (fightlock.js); the takeover way skips the leave\'s cancel on purpose (TRAPS §162).',
  },
  {
    name: 'party', side: 'worker', status: 'todo',
    what: 'A party and its leader: invited, a member (away, offline), none.',
    field: null, states: ['invited', 'member', 'leader', 'away', 'none'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/party.js _partyRemoveMember' },
      { edge: 'leave', at: 'server/src/party.js _partyOnDisconnect' },
    ],
    rejoin: ['party'],
    today: [
      W('this._partyInvites', 'server/src/party.js', ['server/src/party.js _handlePartyInvite', 'server/src/party.js _handlePartyAccept', 'server/src/party.js _handlePartyDecline', 'server/src/party.js _tickParties']),
      W('this._partyByPlayer', 'server/src/party.js', ['server/src/party.js _handlePartyAccept', 'server/src/party.js _partyLoad', 'server/src/party.js _partyRemoveMember', 'server/src/clanparty.js _clanToParty']),
      W('p.leader', 'server/src/party.js', ['server/src/party.js _handlePartyAccept', 'server/src/party.js _partyLoad', 'server/src/party.js _partyRemoveMember', 'server/src/party.js _partyOnRejoin', 'server/src/clanparty.js _clanToParty']),
    ],
    note: 'The leave marks the member away, it does not remove them (partykeep). A rejoin re-sends the roster (join.js _partyOnRejoin, before rejoinresend.js existed).',
  },
  {
    name: 'ride', side: 'worker', status: 'todo',
    what: 'The skateboard: on or off, ended for a reason (RIDE.WHY).',
    field: null, states: ['off', 'on'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/ride.js _rideEnd' },
      { edge: 'death', at: 'server/src/index.js _handlePlayerDeath' },
    ],
    rejoin: 'none: the worker stores nothing and a join is off the board (the ride slot\'s why: the phone clears its own)',
    today: [
      W('ps._ride', 'server/src/ride.js', ['server/src/ride.js _handleRide', 'server/src/ride.js _rideEnd']),
    ],
    note: 'Nearly a door already: every end goes through _rideEnd, and _handleRide is the start. The worker stores nothing, so a join is off the board (the slot\'s why).',
  },
  {
    name: 'harvest', side: 'worker', status: 'todo',
    what: 'Gathering a node: started, its window open, struck (paid, missed, refused).',
    field: null, states: ['idle', 'started', 'open', 'struck'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/gathering.js _handleNodeStrike' },
      { edge: 'end', at: 'server/src/gathering.js _endExtraction' },
    ],
    rejoin: 'none: the record outlives the socket on purpose (leave.js, v2.3.3322) and the phone replays a strike its dropped socket ate',
    today: [
      W('this.extractions', 'server/src/gathering.js', ['server/src/gathering.js _handleExtractionStart', 'server/src/gathering.js _handleNodeStrike', 'server/src/gathering.js _endExtraction', 'server/src/gathering.js _sweepStaleExtractions']),
      W('ps.ex', 'server/src/movement.js', ['server/src/movement.js _handleMove', 'server/src/linger.js _lingerOnClose', 'server/src/bodytake.js _bodyTakeStart']),
    ],
    note: 'ps.ex is the phone\'s claim on its moves (mine, chop, fish, cook, fire), shared with fishing and cooking.',
  },
  {
    name: 'cook', side: 'worker', status: 'todo',
    what: 'Cooking at a fire: no fire, a fire lit, cooking, cooked or burnt.',
    field: null, states: ['none', 'lit', 'cooking'], fn: null, file: null,
    clears: [{ edge: 'end', at: 'server/src/cooking.js _handleCookRequest' }],
    rejoin: 'none: a fresh body has no fire or plan; only the rate\'s history is stored',
    today: [
      W('ps.ex', 'server/src/movement.js', ['server/src/movement.js _handleMove', 'server/src/linger.js _lingerOnClose', 'server/src/bodytake.js _bodyTakeStart']),
      W('ps._fireLit', 'server/src/moveclaims.js', ['server/src/moveclaims.js _fireLitNote']),
      W('ps._cookHits', 'server/src/gathering.js', ['server/src/gathering.js _planCookHits', 'server/src/cooking.js _handleCookRequest']),
    ],
    note: 'No record is held to a cook on purpose (gathering.js): ps.ex === \'cook\' is the only "is cooking", the phone\'s claim.',
  },
  {
    name: 'guard', side: 'worker', status: 'todo',
    what: 'The shield: down, raised with its parry window, holding, broken for 3 s.',
    field: null, states: ['down', 'parry', 'raised', 'broken'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/hits.js _hitStopped' },
      { edge: 'leave', at: 'server/src/linger.js _lingerOnClose' },
    ],
    rejoin: 'none: the phone says `blocking` again on every move',
    today: [
      W('ps.blocking', 'server/src/movement.js', ['server/src/join.js _handleJoin', 'server/src/movement.js _handleMove', 'server/src/moveclaims.js _swingDropsGuard', 'server/src/combat.js _resolvePvPAttack', 'server/src/pvpextras.js _strikePlayer', 'server/src/hits.js _hitStopped', 'server/src/index.js _tickPlayerRegen', 'server/src/linger.js _lingerOnClose', 'server/src/bodytake.js _bodyTakeStart']),
      W('ps._guardBrokenUntil', 'server/src/hits.js', ['server/src/combat.js _resolvePvPAttack', 'server/src/pvpextras.js _strikePlayer', 'server/src/hits.js _hitStopped', 'server/src/index.js _tickPlayerRegen']),
    ],
    note: 'ps.blocking has nine writers in seven files (and five more for the sparring clone in spar.js); a death touches none of it.',
  },
  {
    name: 'pose', side: 'worker', status: 'todo',
    what: 'A held pose: standing, or one of POSE.IDS.',
    field: null, states: ['standing', 'posing'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/poses.js _handlePose' },
      { edge: 'end', at: 'server/src/movement.js _handleMove' },
    ],
    rejoin: 'none: every join makes the body afresh with no po (the pose slot\'s why: the phone stands up too)',
    today: [
      W('ps.po', 'server/src/poses.js', ['server/src/poses.js _handlePose', 'server/src/movement.js _handleMove', 'server/src/bodytake.js _bodyTakeStart']),
    ],
    note: 'Memory only ("a deploy stands everyone up"); the join makes the body afresh with none.',
  },
  {
    name: 'race', side: 'worker', status: 'todo',
    what: 'Lil Bro\'s race round the square: the countdown, running, ended.',
    field: null, states: ['none', 'countdown', 'running', 'ended'], fn: null, file: null,
    clears: [{ edge: 'end', at: 'server/src/race.js _raceEnd' }],
    rejoin: 'none: "a race lost to a reconnect is a race run again" (race.js); the join makes the body afresh',
    today: [
      W('ps._race', 'server/src/race.js', ['server/src/race.js _handleRaceStart', 'server/src/race.js _raceEnd']),
    ],
    note: 'Nearly a door: two writers, one file. A death or a leave of the Wheel ends it at the next move (_raceOnMove, \'left\').',
  },
  {
    name: 'arena', side: 'worker', status: 'todo',
    what: 'The Gladiator tournament (gathering, running, complete) and a player\'s match in it.',
    field: null, states: ['gathering', 'running', 'complete', 'queued', 'fighting', 'eliminated'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/gladiator.js _arenaOnMatchResolved' },
      { edge: 'death', at: 'server/src/duel.js _duelOnDeath' },
    ],
    rejoin: ['arena'],
    today: [
      W('this._arena', 'server/src/gladiator.js', ['server/src/gladiator.js _arenaJoin', 'server/src/gladiator.js _arenaLeave', 'server/src/gladiator.js _arenaLazyTick', 'server/src/gladiator.js _tickArena']),
      W('ps._arenaMatch', 'server/src/gladiator.js', ['server/src/gladiator.js _arenaTryActivate', 'server/src/gladiator.js _arenaOnMatchResolved']),
    ],
    note: 'A match is a wager-0 duel (this._duels, arenaMatch); _arenaInMatch reads the duel as the truth. arena.js is the retired class, kept for its binding.',
  },
  {
    name: 'fishing', side: 'worker', status: 'todo',
    what: 'Fishing: a gather extraction on a fishing spot, with no field of its own.',
    field: null, states: ['idle', 'started', 'open', 'struck'], fn: null, file: null,
    clears: [{ edge: 'end', at: 'server/src/gathering.js _handleNodeStrike' }],
    rejoin: 'none: the extraction record outlives the socket (harvest\'s)',
    today: [
      W('this.extractions', 'server/src/gathering.js', ['server/src/gathering.js _handleExtractionStart', 'server/src/gathering.js _handleNodeStrike', 'server/src/gathering.js _endExtraction', 'server/src/gathering.js _sweepStaleExtractions']),
    ],
    note: 'harvest\'s record with skill \'fishing\'; a door for harvest is fishing\'s too.',
  },

  {
    name: 'dungeon', side: 'worker', status: 'todo',
    what: 'A dungeon run: active (its waves), its boss, done; a player is in it by their place.',
    field: null, states: ['active', 'boss', 'done'], fn: null, file: null,
    clears: [
      { edge: 'end', at: 'server/src/dungeon.js _dungeonCleanup' },
      { edge: 'death', at: 'server/src/index.js _tickPlayerRespawn' },
    ],
    rejoin: 'none: the join lands back in its run by its place (ps.z dungeon:<id>), and the pass lives on the run (zonejudge.js R1)',
    today: [
      W('this._dungeons', 'server/src/dungeon.js', ['server/src/dungeon.js _handleDungeonStart', 'server/src/dungeon.js _dungeonCleanup']),
      W('inst.state', 'server/src/dungeon.js', ['server/src/dungeon.js _handleDungeonStart', 'server/src/dungeon.js _dungeonComplete']),
    ],
    note: 'No field on the player: membership is the place (dungeon.js _dungeonZonePlayers). A death sends them to town at the respawn and the run empties; a leave deletes the body.',
  },

  /* ═══ TO DO, THE PAGE (card L PR 5: then connection, loading, window) ═══ */
  {
    name: 'life', side: 'page', status: 'todo',
    what: 'Your own dying seconds on the phone, from the death to the respawn.',
    field: null, states: ['alive', 'dying'], fn: null, file: null,
    clears: [{ edge: 'death', at: 'src/game/respawn.js applyLocalRespawn' }],
    rejoin: 'none: the worker\'s life note sends the same death back at the join',
    today: [{ field: 'S._dying' }, { field: 'S._deathStart' }, { field: 'S._deathCard' }, { field: 'S.respawnTimer' }],
    note: 'S._dying is written from five files (the ledger\'s writers).',
  },
  {
    name: 'fight', side: 'page', status: 'todo',
    what: 'The phone\'s own note of a fight with a player, and the skull it shows.',
    field: null, states: ['free', 'fighting', 'red', 'white'], fn: null, file: null,
    clears: [{ edge: 'never', at: 'src/game/fightFood.js notePvpHit' }],
    rejoin: 'none: a clock that runs out by itself',
    today: [{ field: 'S._pvpAt' }, { field: 'S._pvpSkullType' }, { field: 'S._pvpSkullUntil' }],
  },
  {
    name: 'duel', side: 'page', status: 'todo',
    what: 'The phone\'s copy of a duel: pending, on, over.',
    field: null, states: ['none', 'pending', 'on'], fn: null, file: null,
    clears: [
      { edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' },
      { edge: 'end', at: 'src/networking/gameEvents.js processGameEvent' },
    ],
    rejoin: ['duel'],
    today: [{ field: 'S._inDuel' }, { field: 'S._activeDuel' }],
  },
  {
    name: 'trade', side: 'page', status: 'todo',
    what: 'The phone\'s trade window and invite card.',
    field: null, states: ['none', 'invited', 'open', 'leaving'], fn: null, file: null,
    clears: [
      { edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' },
      { edge: 'end', at: 'src/networking/gameEvents.js processGameEvent' },
    ],
    rejoin: ['trade', 'trade-invite'],
    today: [{ field: 'S._t2Live' }, { field: 'S._t2Leave' }, { field: 'S._t2QuietUntil' }, { field: 'S._t2DoneWatch' }, { field: 'S._t2LocalEnd' }],
  },
  {
    name: 'party', side: 'page', status: 'todo',
    what: 'The phone\'s party roster.',
    field: null, states: ['none', 'member'], fn: null, file: null,
    clears: [{ edge: 'rejoin', at: 'src/networking/wsClient.js onmessage' }],
    rejoin: ['party'],
    today: [{ field: 'S._party' }],
  },
  {
    name: 'ride', side: 'page', status: 'todo',
    what: 'Your skateboard on the phone.',
    field: null, states: ['off', 'on'], fn: null, file: null,
    clears: [{ edge: 'rejoin', at: 'src/game/ride.js clearRide' }],
    rejoin: ['ride'],
    today: [{ field: 'S._ride' }],
  },
  {
    name: 'harvest', side: 'page', status: 'todo',
    what: 'A gathering swing on the phone: waiting for the window, ready to strike.',
    field: null, states: ['none', 'waiting', 'ready'], fn: null, file: null,
    clears: [
      { edge: 'zone', at: 'src/game/zoneTransitions.js clearZoneLocalFx' },
      { edge: 'end', at: 'src/game/lifeSkillRewards.js succeedExtraction' },
    ],
    rejoin: 'none: the worker keeps the record, and the phone replays a strike (wsClient.js _holdForRejoin)',
    today: [{ field: 'S._extraction' }, { field: 'S._nearNode' }, { field: 'S._proxNode' }],
    note: 'One field, S._extraction, carries mining, woodcutting, fishing and cooking (its `skill`).',
  },
  {
    name: 'cook', side: 'page', status: 'todo',
    what: 'Cooking on the phone: S._extraction with skill cooking, at a fire you lit.',
    field: null, states: ['none', 'waiting', 'ready'], fn: null, file: null,
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js clearZoneLocalFx' }],
    rejoin: 'none: the worker holds no cook either',
    today: [{ field: 'S._extraction' }, { field: 'S._campfire' }, { field: 'S._firemaking' }],
  },
  {
    name: 'fishing', side: 'page', status: 'todo',
    what: 'Fishing on the phone: S._extraction with skill fishing.',
    field: null, states: ['none', 'waiting', 'ready'], fn: null, file: null,
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js clearZoneLocalFx' }],
    rejoin: 'none: harvest\'s',
    today: [{ field: 'S._extraction' }, { field: 'S.fishTimer' }],
    note: 'S.fishTimer is made in the state\'s first object and never read (the ledger\'s noRead): a leftover.',
  },
  {
    name: 'guard', side: 'page', status: 'todo',
    what: 'Your shield on the phone: raised, by key, mouse or button, dropped.',
    field: null, states: ['down', 'up'], fn: null, file: null,
    clears: [{ edge: 'end', at: 'src/game/shieldToggle.js dropShield' }],
    rejoin: 'none: the phone sends its guard on every move; the worker keeps none across a join',
    today: [
      { field: 'S._shieldUp' }, { field: 'S._shieldKb' }, { field: 'S._shieldMouse' }, { field: 'S._shieldAutoReleased' },
      { field: 'S._shieldCdUntil' }, { field: 'S.shieldActive' }, { field: 'S.shieldEnd' }, { field: 'S._blockPose' },
      { variable: 'state', file: 'src/ui/mobile/blockRingBus.js' },
    ],
  },
  {
    name: 'pose', side: 'page', status: 'todo',
    what: 'Your own held pose on the phone.',
    field: null, states: ['standing', 'posing'], fn: null, file: null,
    clears: [
      { edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' },
      { edge: 'end', at: 'src/game/interactions.js endOwnPose' },
    ],
    rejoin: ['pose'],
    today: [{ field: 'S._pose' }],
  },
  {
    name: 'race', side: 'page', status: 'todo',
    what: 'The race on the phone: asked, the countdown, running, its end card.',
    field: null, states: ['none', 'countdown', 'running', 'ended'], fn: null, file: null,
    clears: [{ edge: 'end', at: 'src/game/race.js dismissRace' }],
    rejoin: 'none: not cleared at state_sync; the worker forgets a race at a join (its row)',
    today: [{ field: 'S._race' }, { field: 'S._raceLil' }],
  },
  {
    name: 'arena', side: 'page', status: 'todo',
    what: 'The phone\'s view of the tournament and its own match.',
    field: null, states: ['none', 'involved', 'fighting'], fn: null, file: null,
    clears: [{ edge: 'rejoin', at: 'src/game/rejoinSlots.js rejoinClear' }],
    rejoin: ['arena'],
    today: [{ field: 'S._arenaMatch' }, { field: 'S._arenaInvolved' }, { field: 'S._arenaTournamentId' }, { field: 'S._arenaStakeBoard' }],
    note: 'A match rides S._inDuel (the duel\'s row): the rejoin clears it with the duel.',
  },
  {
    name: 'dungeon', side: 'page', status: 'todo',
    what: 'A dungeon run on the phone: opening, in it, its waves, cleared, complete, back out.',
    field: null, states: ['none', 'opening', 'in', 'clear', 'complete'], fn: null, file: null,
    clears: [
      { edge: 'death', at: 'src/game/respawn.js applyLocalRespawn' },
      { edge: 'zone', at: 'src/game/wheelDungeons.js leaveWheelDungeon' },
    ],
    rejoin: 'none: the worker\'s run keeps the pass across a reconnect behind the loading screen (zonejudge.js R1)',
    today: [
      { field: 'S._inDungeon' }, { field: 'S._serverDungeon' }, { field: 'S._dungeonZone' }, { field: 'S._dungeonWave' },
      { field: 'S._dungeonClear' }, { field: 'S._dungeonComplete' }, { field: 'S._inCustomDungeon' }, { field: 'S._dungeonBack' },
      { field: 'S._wheelDungeonOpening' }, { field: 'S._dungeonEnteredAt' },
    ],
    note: 'S._inDungeon is written from six files (the ledger\'s writers).',
  },
  {
    name: 'connection', side: 'page', status: 'todo',
    what: 'The phone\'s socket: connecting, connected, idle, and each refusal\'s screen.',
    field: null, states: ['connecting', 'connected', 'disconnected', 'idle', 'linger', 'full', 'device', 'key', 'locked', 'origin', 'rejected', 'superseded', 'verify', 'frozen'], fn: null, file: null,
    clears: [{ edge: 'rejoin', at: 'src/networking/wsClient.js onmessage' }],
    rejoin: 'none: it is the rejoin',
    today: [
      { field: 'S._realtimeStatus' }, { field: 'S._joinRejectedFatal' }, { field: 'S._netHold' }, { field: 'S._tabMoved' }, { field: 'S._frozenByAdmin' },
      { variable: '_state', file: 'src/networking/serverReady.js' }, { variable: '_veil', file: 'src/networking/serverReady.js' },
    ],
    note: 'S._realtimeStatus is set in eleven functions of wsClient.js (card K\'s file: this door goes before K starts, or after it).',
  },
  {
    name: 'loading', side: 'page', status: 'todo',
    what: 'The loading screen and the veils: the world not in yet, a zone loading, a trip veiled.',
    field: null, states: ['up', 'waiting', 'world-in', 'zone-loading', 'veiled'], fn: null, file: null,
    clears: [{ edge: 'zone', at: 'src/game/zoneTransitions.js handleZoneTransitions' }],
    rejoin: 'none: the page\'s own',
    today: [
      { field: 'S._zoneLoading' }, { field: 'S._wheelTripVeil' },
      { variable: '_up', file: 'src/ui/loadingGate.js' }, { variable: '_waiting', file: 'src/ui/loadingGate.js' }, { variable: '_worldIn', file: 'src/ui/loadingGate.js' },
    ],
  },
  {
    name: 'window', side: 'page', status: 'todo',
    what: 'The open window: a panel, a sheet or a card over the world, and the busy latch.',
    field: null, states: ['none', 'open'], fn: null, file: null,
    clears: [{ edge: 'end', at: 'src/ui/mobile/modalGuardBus.js guardPush' }],
    rejoin: 'none: the page\'s own',
    today: [
      { field: 'S._uiBusy' }, { field: 'S._npcProxLatch' },
      { variable: '_depth', file: 'src/ui/mobile/modalGuardBus.js' }, { variable: 'state', file: 'src/ui/mobile/inventoryBus.js' },
      { variable: '_state', file: 'src/ui/mobile/ChestReveal.jsx' }, { variable: 'state', file: 'src/ui/mobile/wheelBus.js' },
    ],
    note: 'A bus a window (inventoryBus, wheelBus, ChestReveal, ...): no one field says which is open. The guard\'s depth (modalGuardBus.js guardPush, and the release it hands back) counts the open ones; S._uiBusy is BroTown\'s copy of "any panel open".',
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
