# Evaluation ledger (main session) — implicit state machine sweep

Doc: https://claude.ai/artifact/PrspeJRdJWG6ciAYtRspen  (project b91fd0a8-77d6-4fdc-accd-15ef8172499b, tab body 3e889647-d6a7)
Pending blocks: lead mhvwtrs9ecc.41 · needs-thought mhvwtrs9ecc.43 · diagrams mhvwtrs9ecc.44 · catalogue mhvwtrs9ecc.45 (definition .42 is FILLED)
Sweep: 42 slices (sm/slices), 20 concurrent max; queue in sm/queue.txt, done in sm/done.txt, agents in sm/agents.tsv
Collector: node sm/collect.mjs [--verdict needs-thought] [--slices S1,S2] [--full]

## Emerging clusters (from U3 S6 S8 S2 S5 S7 needs-thought)

A. PLAYER SESSION LIFECYCLE (join / joined / linger / evicted / reconnect / gone) — per-session state on `ps`
   rebuilt at join; some exit paths skip the normal close. S2-1 (second-login eviction skips webSocketClose:
   escapes NML fight), S2-13 (eviction drops dirty coalesced save: 10 s rollback), S5-3 (ps._arenaMatch lost on
   reconnect: heal mid-match), S2-2 (owed respawn replay is dead code), S2-21 (admin restore vs lingering body).
F. PLAYER ACTIVITY LOCKS (free / fighting / duel / arena / dungeon / trading / dead / lingering) — guards scattered.
   S6-1 (gift trade lacks trade2's fight lock), S5-13 (dungeon start/pull ignores duel/arena), S5-2 (duel never
   ends on zone change). Likely merge with A into the top item, or keep as #2.
B. ECONOMY CRASH WINDOWS (multi-batch writes with awaits between) — S5-4 stake, S6-2 trade2 weapon delivery,
   S6-3 order book crossing placement, S6-5 AH listing. Check vs CLAUDE.md "one write" rule + TRAPS §184/§146.
C. STUCK STORED STATES (no exit / no expiry) — S6-6 offer expiry pass stops at 20 (no cursor), S8-11 friend
   requests never expire, S8-2 party 'away' forever when partykeep off, S8-3 leader never hands on (seen 0).
D. COLD-WORKER LIVE FLAGS (unloaded cache read as defaults) — S2-17 kill switches untouched on /api/account,
   /api/admin; S2-6 devicelock:false ignored at the login door on a cold worker.
E. CLIENT CONNECTION MACHINE — U3-20 Try-now during in-flight handshake: overlapping sockets, onclose lacks
   this===ws. (N1 covers wsClient.)
G. small: U3-12 level-up bursts bypass the loading gate; S8-21 botfp eviction overwrites stored flags.
A+ (from S1): S1-4 same-id takeover skips the linger and reloads HP up to 10 s stale (escape + heal) = S2-1/S2-13;
   S1-3 a join that throws closes with 4010 (linger's code): phone shows linger countdown, retries every 5 s forever.
I. PHONE-WRITTEN AUTHORITY FLAGS (server takes phase flags from the phone's move messages)
   S1-2 ps.dead written by the phone on every move: monster aggro / PvP / NML skip ps.dead → modified phone untouchable.
   S1-10 shield raise from moves: nothing separates two raises → toggling every ~240 ms parries every blow.
   (S7-12: fight-locked forge/harden/equip are open.)
   CORROBORATED by S3 independently: S3-3 (= S1-2 dead:true god mode), S3-4 (= S1-10 parry re-arm), plus
   S3-15 zone-entry grace re-armed by a wheel→dungeon:x→wheel bundle (permanent immunity),
   S3-19 a phone declaring ws:[1] or none is never targeted but may attack (wheelzone.js:274, join.js:848),
   S3-24 stats_update legacy skill level +1 = full heal (~400 per character under prog3) (grids.js:823),
   S3-26 ex:null→ex:'cook' in one bundle re-arms the cook/fire shield (gathering.js:931).
   => TOP CANDIDATE: "the player's combat phases are partly written by the phone" (move message flags).
H+ (P1): P1-4 cook predicted with k.includes(type) vs worker exact key (predicted cook + level-up taken back);
   P1-6 amulet gem predicted with no gate: double tap burns two gems, refusals silent; P1-12 kill-switch fallback
   counts the retired gem pouch ("No raw gems yet" over a full bag); P1-13 refused stake still reads "Bet placed".
B+ (P1): P1-7 General Store order book over HTTP: no in-flight guard or opId; a second Place Sell tap escrows the
   next weapon at the same stash index under the first one's kind (ExchangePanel.jsx:618, market.js:268).
M. ZONE ENTRY COPIES (P1-9): the trip onto your farm exists in three copies (FeedSeedPanel/BroTown/FarmPanel); the
   Land Office copy plays BroTown's music. Likely joins G3's zone-transition findings.
L. CLIENT FIGHT CONTROL (G1): G1-1 target lock S.lockedTarget: 38 writers in 12 files, only targeting.js's 8 drops
   clear the lock's aim (OPACITY candidate); G1-2 aim provenance stale after a kill; G1-3 engagement never ends for a
   far Wheel copy; G1-4 held-attack loop ignores isStaggered (breaks v2.3.3264 parry contract); G1-5 tapped first
   swing never broadcast to peers; G1-6 queued bow special lapses without a held thumb; G1-7 stuck special holds a
   frozen monster object after a list replace; G1-9 phantom claimable remnant pile on swelling slimes (verify claim).
K. UI door / boot (U2): U2-2 bootPhase + auto-join latch: creator ENTER runs joinTown twice; Login-Key reload drops
   ?guest=1; U2-3 resume snapshot: another character's key clears only bt_rpg/bt_stats → previous character's look
   replayed; U2-18 touchstart+click double-fire closes Dungeon Workshop (TRAPS §131).
J. small: S1-1 a monster's ball in the air when its thrower dies lands after the respawn (index.js _tickMonsters).
H. PREDICTION WITHOUT ROLLBACK (phone predicts a transition; the worker refuses SILENTLY; phone's mirror diverges)
   G4-1 quest hand-in (4 of 6 refusals silent: phone keeps gold/XP/AP/next step), G4-10 + S7-8 harvest strike
   (silent node_strike refusals: node invisible in v2, phantom XP; gesture finishes while dead), S7-12 weapon
   slots (client and worker reorder the bag differently; fight-locked forge/harden/equip open).
N. small, concrete (G5): slime idle loop silent for good after any audio-context rebuild (slimeAudio.js:26);
   _zoneWipe written as a number but read/expired as an object: zone wipe never draws, never clears
   (stateCleanup.js:19 / effectsRenderer.js:6731); a mute tapped during a reconnect is dropped, then wiped by the
   join's server list (chatMute.js:171 / wsClient.js:5522).
O. DUEL across the wire: S5-2 (server: zone change never ends a duel; 10 min no regen, hider wins on hp fraction) +
   N2-18 (phone: optimistic accept enters the duel before the worker answers; stale/busy challenge dropped silently →
   phone stuck in a duel) + S5-13 (dungeon start ignores duels). Strong cross-wire candidate.
M+ (N2-10): dungeon run on the phone: ~15 S fields + a synthetic zone; three hand-written exits reset different
   subsets (Workshop exit skips lock clear, zone fx, art release, delayed zone drop). Join with P1-9 farm-trip copies.
P. SLIME SWELL: N2-11 _burstUntil is a truthy flag not a clock: a missed execute leaves a slime swollen and
   untouchable into its next life; G1-9 phantom remnant pile on swelling slimes. Monster visual phases from 4 writers.
N2-1 small but operational: crash-ring upload dedupes on ring length; once the 16-entry ring is full no later crash
   in that page is uploaded (crashTrap.js:57/137/269) — the owner loses crash reports.
N2-14 display: the fallback block re-judges worker-landed blows while the shield is up (number hidden, HP drops).
Q. DEATH AND RESPAWN (cross-wire) — server dying 5 s → respawn in town; phone writes ps.dead on every move (S1-2,
   S3-3 god mode); owed-respawn replay is dead code (S2-2); the phone keeps three hand-copied respawn sequences
   beside respawn.js's "ONE copy", skipping art release, npc reset, Wheel trip, still docking gold locally (U1-2,
   BroTown.jsx:4881-5014). => TOP CANDIDATE (likely #1 or #2 with I).
H+ S9-1 corroborates G4-1 from the server side (unmet-objective/not-active hand-ins refused silently on v2;
   mayor_3 still paid on the game's word).
B+ S9-8 daily spin: pay closes the pot in memory, saved two awaits later; restart → stays open, after the 48 h
   prune it pays again (dailyrewards.js:583-674).
K+ U1-4 corroborates U2-2: the creator road runs joinTown twice (_autoJoined set only inside joinTown).
R. RENDERER LIFE (U1-3): async Pixi init has no superseded check; an epoch bump mid-init can leave pixiRef on a
   detached canvas and leak a WebGL context (BroTown.jsx:4001-4215, 8401-8422). Memory law relevance. R5 may add.
U1-1 concrete bug: petFetchStep gets a hoisted still-undefined `now` → give-up/way-back/skip/look timers never fire.
U1-28 corroborates G5 slime hum dead after AudioContext rebuild.
P (renamed). A MONSTER'S LIFE ACROSS RESPAWNS — per-life sub-state survives death/swell/respawn because the id and
   object are reused: S1-1 + S4-3 (ball in the air lands ~19 s later from the respawned monster), S4-1 (kit cast runs
   on from a 0-HP swelling corpse), S4-2 (death swell clears only the basic wind-up), S4-4 (melee lifesteal ledger
   keyed by monster id, cleared only on zone change/death; the Wheel is one zone → previous-life damage refunded),
   N2-11 (phone: _burstUntil truthy flag → slime swollen/untouchable into its next life), G1-9 (phone: remnant flag
   never reset by worker respawn). => TOP CANDIDATE (server + phone, high confidence, several agents).
S4-28: late stuck-arrow chip claims (2.5-4 s after a bow special) delete a harvest begun meanwhile.
S. THE SHIELD (cross-wire): S1-10 + S3-4 (worker: toggling blocking re-arms the 250 ms parry window endlessly),
   G2-4 (phone: BLOCK_COSTS_STAMINA=false, the phone never learns the worker's 3 s guard break: draws a raised
   shield, walks at half speed, takes full hits), G2-2 (shield raised mid-lunge not refused, strike lands with
   blocking:true, the overlap v2.3.2246 forbids), N2-14 (fallback block re-judges landed blows). => TOP CANDIDATE.
G2-17 DESKTOP (judges play on computers): key 2 selects the bow slot with no bow owned (key 3 checks the staff):
   empty slot, no attacks, persisted on the worker (desktopControls.js:407-411).
E+ CLIENT CONNECTION (N1, corroborating U3-20 and S1-3):
   N1-2 one closure `ws` shared by every socket, 15-value status shadow; undetached orphan sockets (Retry now, lockout
   timer, cleanup) reconnect over the live one → tab reads 'superseded' while joined, watchdog off (wsClient 481-518,
   4468-4663, 6203-6222). N1-3 = S1-3 from the client side: 4010 means both linger and a thrown join; every 4010 read
   as linger (wrong screen, 5 s retry forever). N1-4 a drop during the loading screen skips the veil, never re-arms.
   N1-6 tab-return recovery excludes only superseded/idle → rejoins origin/device/key/frozen/fatal-rejected tabs.
   => TOP CANDIDATE: "the game socket's life" (client) + close-code protocol (server).
T. IDENTITY ON THIS DEVICE (N1-7, N1-9, U2-3): N1-7 the join pairs the tab's in-memory id with the SHARED stored key;
   after another tab switches character, a reconnect gets 'auth' and MINTS NEW IDENTITIES (CLAUDE.md: never 'auth',
   it makes a phone throw its key away) — VERIFY FIRST, potentially severe. N1-9 roster cookie tombstones: the 30 s
   heartbeat re-adds deleted rows, resurrecting rotated-out keys. U2-3 another character's key replays the previous
   character's resume snapshot.
H/P+ N1-18 the tick's death edge pushes a client-rolled loot pile ungated by _serverLoot; slime-boss pops leave phantom
   piles credited locally (wsClient 1158-1377, gameEvents 2972-3040).
M (confirmed by 3 agents). THE ZONE CHANGE ON THE PHONE: G3-6 S.currentZone flipped by ~11 paths, each with its own
   wipe list; respawn, arena entry and dungeon-to-farm skip clearZoneLocalFx despite its "every clear block" contract
   (zoneTransitions.js:392-425, 851-1181, 1208-1316); + P1-9 farm trip in three copies; + N2-10 dungeon exits reset
   different subsets; + G3-9 a second E during the 8 s dungeon opening replaces the run and the first unloads the
   shared floor. => TOP CANDIDATE.
U. THE ONE LOADING VEIL (G3-2): one DOM veil shared by hub gate, town art hold, Wheel trip, dungeon opening, farm hold;
   each hide checks different owners → a dungeon opening's late hide lifts the death trip's veil (unloaded town shown).
   + N1-4 (drop during loading screen skips the connect veil). + G3-4 Wheel ground worker: a stale preload sets _ready
   after leaving; a failed worker start is cached (sea, no doors, no Mayor).

## STATE @ sweep 41/42 (T1 left). Round 2 = adversarial verifiers, brief sm/ROUND2.md, outputs sm/round2/<V>.md
Running: V1 flags · V5 identity · V3 session · V2 death · V7 monster life (+R2-5) · V8a market · V8b trades/stakes
 · V6 duel · V4 socket · V11 zone change · V9a quests/harvest (+D1-3, D1-5) · V9b gear/panels · V10 shield · V18 look
 · V12 social · V13 cold flags · V17a renderer life · V9c phone-side spending · V15 door/first steps
Queued (sm/round2/QUEUE.txt): V14 fight control · V16 small bugs · V17b art lifecycles · V19 sound · V20 studios
Raw machine count so far ≈ 951 (+T1). Plan: chat list = verified needs-thought clusters ranked; doc = lead, definition
 (done), needs-thought sections from round2 files, 3-4 drawn diagrams (guide topic.diagram), catalogue (2nd tab?).
Queue now V14 V16 V19 V20 V21(fight windows/lock) V22(loot piles) V23(load-once latches) V24(pictures kept = memory).
Watch-item scan done (server/wire all; client/ui/rendering by keyword). Extra adds sent: S9-2/S9-3/S9-11 → V8b,
S6-4 → V8a, R2-5 → V7, D1-3/D1-5 → V9a, T1-9/T1-12 → V11.
## ROUND 2 RESULTS (headline per verifier; full text in sm/round2/<V>.md)
V3 session life: needs-thought, MEDIUM, 14C/6P/1R. Second-tab takeover skips the linger (NML loser escapes with bag,
   no modified phone needed) + drops up to 10 s unsaved damage (join.js:757-772 vs index.js:6370/6385); arena no-heal
   flag lost on rejoin (gladiator.js:389 only write); owner restore overwritten by lingering body (admin.js:407);
   4010 = linger AND join-failed (index.js:5160); phantom "joined BroTown!" chat line per socket open; Turnstile
   ghost-body race latent (check off). Explicit: session.phase + one _playerLeaves(id, why) + close-code table.
V5 identity: needs-thought, MEDIUM, 9C/3P/6R. Two tabs on two characters: shared Login Key slot vs each tab's page-start
   id → on any reconnect the first tab silently BECOMES the other character (kicks the other tab) or, for a pre-v2.3.3355
   character, gets 'auth' and mints a level-1 copy with the same name/look (reads as a wipe). Honest player. Heartbeat
   stamps this tab's name/level onto the shared key's row; "clear caches" list exists 5x; roster tombstone undone by
   heartbeat; resume snapshot replays previous character's look. Docs still say two tabs share one identity by design.
   Explicit: per-page {key,id} identity record + one switchCharacter(). Key: wsClient.js:578-599,1475-1496; join.js:541-553.
