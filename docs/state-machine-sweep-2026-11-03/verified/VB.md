# VB-1 · The phone's fight control (target lock, aim, engagement, swing, bow gate, Special button, computer weapon keys, predicted statuses)
- Verdict: needs-thought
- Severity: medium (a parried PvP player keeps swinging; peers never see a tapped swing; a computer player who presses 2 with no bow is stuck unable to attack; a queued bow special often never fires; the rest is visual or wasted messages)
- Who can trigger it: honest player (steps in each concern below); nothing needs a modified phone
- Summary: Fighting on the phone is not one machine but about ten small ones sharing a few loose fields: who you target, where you aim, whether you are "in a fight", whether you may swing, and how a swing or arrow lives. Each piece mostly works, but the same question ("may I attack now?", "who am I fighting?") is answered in several places that have drifted. Real misses: staggered players keep swinging, a tap swing is never shown to others, the 2 key equips a bow you do not own, and a queued bow special needs the attack held.
- Key files: src/game/monsterCombat.js:1610, src/game/playerActions.js:25-101, src/game/targeting.js:469-495, src/game/desktopControls.js:407-410, src/game/projectiles.js:1862

## The machine
- Entity, and where its state lives: the local player's fight state, all on the shared game object S (stateRef.current): S.lockedTarget, S._aimAngle/_aimSrc/_aiming, S._engaged/_engagedId, S.autoAttack, S.isSwinging/swingTimer/_swingBcastPending, S._bowSight/_bowSpecialQueued, S.arrows, and m.statuses on each monster object.
- States: no lock / auto lock / tap lock (on the way in, latched) / duel, spar, NML, npc lock; engaged / grace / out of combat; idle / held / engaged-swing / tap-attack / refused; wind / contact / recovering swing; line empty / line on target / special queued; arrow flying / stuck / planted / spent.
- Moves:
  - attack press: auto lock -> tap lock latched, S.autoAttack true, one tapped swing (BroTown.jsx:10215, 11479-11480, playerActions.js:84-101)
  - monster dies: lock nulled with no aim clear (monsterCombat.js:1322); targeting.js's own drops clear aim (targeting.js:88-93)
  - tap lock on a sword monster: engaged until that monster dies or leaves S.monsters, however far (targeting.js:471-494)
  - held attack / engaged / tap-attack at cooldown: swing or shot, gate at monsterCombat.js:1610 (no stagger test)
  - press: swing starts WITHOUT the relay flag (playerActions.js:84-101); loop swing raises it (monsterCombat.js:1919, 1964)
  - bow special, line empty: queued (playerActions.js:148-149); consumed only inside the held gate (monsterCombat.js:1756-1764); lapses at 2.5 s
  - key 2: slot set to 'ranged' with no ownership test (desktopControls.js:407, BroTown.jsx:9901-9915)
  - weapon hit with gem: local status applied by the phone's own clock (monsterCombat.js:2150-2157, gameSystems.js:4541)
- Diagram edges:
  - `AutoLock --attack press--> TapLockLatched`
  - `TapLock --monster killed (monsterCombat:1322)--> NoLock !! aim not cleared`
  - `TapLock --sword tap--> Engaged`
  - `Engaged --chosen monster far away, alive--> Engaged !! never ends`
  - `Held --parry stagger--> Held !! loop has no stagger test`
  - `Idle --attack press--> Swing (no peer relay) !!`
  - `BowLineEmpty --special pressed--> Queued`
  - `Queued --line lands, attack not held--> Queued !! never consumed, lapses`
  - `Queued --line lands inside the 1.5 s cooldown--> Lost !! silently`
  - `SwordOnly --key 2--> EmptyBowSlot !!`
  - `StatusNone --own gem hit--> StatusApplied (phone clock 16.7 ms a pass)`
  - `StatusApplied --plain collision--> ManaPopup !! worker pays only on resonating`

## Concerns, verified
- [CONFIRMED] G1-1: the lock has 38 writers in 12 files, only the 9 in targeting.js do the drop bookkeeping, and clearLockAim is not exported so the others cannot. Evidence: grep count 38 of `lockedTarget =` in src; targeting.js:88 (`function clearLockAim`, no export); monsterCombat.js:1322. How checked: grep and read. Docs: v2.3.2261 comment says it is "called from every site that drops a monster lock", which is false today.
- [REFUTED] G1-1 (dead-test written three ways): they agree today, no divergence found. Evidence: targeting.js:51-73, monsterCombat.js:1322. How checked: read all. Docs: none.
- [CONFIRMED] G1-2 (a): after a kill the aim keeps the dead monster's bearing under `_aimSrc 'lock'`; during the 1.5 s engagement grace the engaged auto-swing at a new auto lock is hit along the lock but drawn along the stale aim. Evidence: monsterCombat.js:1322 vs 1400 (aim written only for autoAttack or a TAP lock, engagedStance targeting.js:729-734), 1943-1947, entityRenderer.js:13945; engagement keeps `_engaged` true during grace (targeting.js:491-494). How checked: traced. Docs: v2.3.2261 note. Visual only, up to about 1.5 s.
- [PLAUSIBLE] G1-2 (b): bow pose turned to stale aim while the arrow flies along `_lastAimAngle`. One link unproven: a path where a bow shot fires with no thumb and a stale lock aim (only the right-stick tap path, tapJump).
- [CONFIRMED] G1-2 (click/Q race): desktop click and Q write `_aimAngle` and never stamp `_aimSrc`, so the next lock drop wipes the player's own mouse aim. Evidence: BroTown.jsx:13002, desktopControls.js:390, targeting.js:89. How checked: read. Docs: targeting.js:83-85 promises the opposite. Low.
- [CONFIRMED] G1-3: engagement has no distance or "no lock for N s" end; a tapped sword monster that is out of the worker's interest keeps a live frozen copy, so `_engaged` stays true and `_engSwing` swings at whatever auto lock you later walk up to, with no press. Evidence: targeting.js:477-494, monsterCombat.js:1480-1495, targeting.js:356-359 (the ghost copy is the owner's own measured case), server/src/wheelnear.js:28-31 (a far death is still told to all). How checked: traced; the ghost copy relies on the v2.3.3499 comment. Docs: two comments at targeting.js:449-453 and 458-467 disagree; the later says "however far away" on purpose. A design question.
- [CONFIRMED] G1-4 (stagger): the held loop never asks isStaggered; the press does. A staggered holder keeps swinging and shooting, each swing played and sent, the worker refuses. Evidence: monsterCombat.js:1610-1616 (no stagger in file; imports :45, :61), playerActions.js:34, gameEvents.js:1122-1131, server/src/pvpextras.js:272-280. How checked: grep of "stagger" in monsterCombat.js and projectiles.js (only unrelated hits). Docs: gameEvents.js says "this page sends none". Only in PvP (parry), so No Man's Land or duels.
- [PLAUSIBLE] G1-4 (extraction/climb): an engaged player harvesting beside the tapped monster can start engaged swings, because the loop's other drivers are not gated and the harvest only clears autoAttack. Evidence: BroTown.jsx:5506, 5576, monsterCombat.js:1480-1482. Unproven link: whether `_engaged` is still true and the locked monster in reach while a harvest runs.
- [CONFIRMED] G1-4 (two cooldowns): loop divides by the amulet and floors at 200 ms, the press does neither. Evidence: monsterCombat.js:1335 vs playerActions.js:59. Low.
- [CONFIRMED] G1-5: the first swing of every press is never relayed to peers. swingAttack sets no `_swingBcastPending`; its only writer is the loop. A quick tap shows peers no swing at all; they see damage only. Evidence: playerActions.js:84-101, monsterCombat.js:1919, 1964-1971; grep shows `_swingBcastPending` has no other writer and no other sender of player_swing. How checked: grep. Docs: v2.3.1011; mp-animparity hand-sends the event (mp-animparity.mjs:201), so no test covers a real press.
- [PLAUSIBLE] G1-5 (`_hitThisSwing` lost on a list replace): bounded by the worker's per-monster cadence. [PLAUSIBLE] G1-5 (cancel leaves `_swingBcastPending`): not traced to a visible effect.
- [CONFIRMED] G1-6: the queued bow special is consumed only inside the held-attack gate; a flick releases attack at touchend and the Special button never holds it, so the queue lapses after 2.5 s unless attack is also held. Evidence: monsterCombat.js:1610, 1756-1764; playerActions.js:148-150; BroTown.jsx:11626-11630; only consumers of `_bowSpecialQueued` listed by grep. How checked: grep and read. Docs: SpecialButton/playerActions promise "fires the first frame the line lands"; mp-bowgate step D sets autoAttack true (mp-bowgate.mjs:361).
- [CONFIRMED] G1-6 (NML ask): the "Attack <name>?" window treats a queued special as wanting to shoot, the gate does not. Evidence: monsterCombat.js:1574 vs 1610. Low.
- [CONFIRMED] G1-7 (element): the ranged special reads `element2` only, the sword (v2.3.3513) and the worker read `element2 || element1`. A one-gem bow or staff special shows no local status or collision. Evidence: projectiles.js:1862, monsterCombat.js:2150, server/src/weapongem.js:155-158. Visual only; the worker applies it.
- [PLAUSIBLE] G1-7 (stuck special holds a monster object): a dungeon list re-push inside the 4 s burn leaves it on the old copy. carryMonsterState carries `_stuckArrows` but not `a.stuckIn` (monsterCarry.js:23-26). Cost: stale draw position, some refused monster_damage. Unproven: how often a re-push lands inside a burn.
- [PLAUSIBLE] G1-7 (weapon swap mid-flight reports the new weapon), [PLAUSIBLE] G1-7 (death does not clear S.arrows on the live respawn path: respawn.js has no `arrows` clear; the later zone change into the Wheel clears them, and the 4 s burn is shorter than the respawn), [PLAUSIBLE] G1-7 (branch order is the state machine): all low, not traced to harm.
- [CONFIRMED] G2-17: key 2 selects the bow slot with no ownership test; key 3 and the bar and cycle all check. A fresh character (rangedWeapon starts null, gameSystems.js:6110) presses 2: empty slot, the loop's `_eqWpn` gate refuses every attack, the popup says "undefined", and set_active_slot 'ranged' is sent and saved. Out by 1 or Tab. Evidence: desktopControls.js:407-410 vs 411, BroTown.jsx:9901-9915, weaponSlots.js:16-25, server/src/gear.js:779-790. How checked: read all. Docs: weaponSlots.js header. Matters because judges play on computers.
- [REFUTED] G2-17 (Escape reads stale chatOpen): documented kept staleness, closed by its own X. Evidence: desktopControls.js:9-13.
- [CONFIRMED] P3-6 (race): a second bow special inside the 1.5 s cooldown with the line empty is queued, the button shows the lit AIM face (queued outranks cooldown, SpecialButton.jsx:250), then when the line lands the queue is cleared and the special is dropped silently by the 1500 test; that beat's arrow is held back one frame only (swingTimer is not stamped, so it looses next frame). Evidence: playerActions.js:148-149, 190; monsterCombat.js:1761-1764. Needs attack held (G1-6). Low.
- [CONFIRMED] P3-6 (cooldown written three times): literal 1500 at playerActions.js:190, SPECIAL_CD_MS at SpecialButton.jsx:113, SWIPE_CD_MS at server/src/data.js:592; no row in mirror-audit.test.mjs (grep found none). Low.
- [CONFIRMED] D1-1 (mana): the phone pays 4% mana on any collision every 3 s and floats "+N MP" even in a server zone; the worker pays only on a resonating one. Evidence: gameSystems.js:5070-5076, monsterCombat.js:2463, server/src/combat.js:1744-1760. Docs: combat.js:1739-1741 says the client copy is stomped by the echo. Cosmetic, corrects at the next mana update.
- [CONFIRMED] D1-1 (clock): tickStatuses gets a fixed 16.7 ms per pass, not the frame time, so statuses last longer on screen at low fps. Evidence: monsterCombat.js:233. Cosmetic: the number waits for the worker (v2.3.2350).
- [CONFIRMED] D1-1 (certs earned off the prediction): monsterCombat.js:2400. Low.
- [REFUTED] D1-1 (unguarded STATUS_DEFS tick): every writer checks the id first (gameSystems.js:4485); no live trigger.

## What needs further thought
- Should the "fight" be one declared thing? Today "may I attack now" is written twice (press vs held loop) and has already drifted: stagger, harvest, climb, cooldown. Which refusals must both share?
- Should an engagement have an end (distance or idle time), or is "stays engaged however far" what the owner wants?
- Should a queued bow special fire without the attack held, or should the button say the attack must be held?
- Making it explicit: one `attackRefusal(S, now)` returning the first reason, called by both the press and the loop; one `startSwing(S, {special})` that raises the relay flag; one `setLock`/`dropLock(S, why)` in targeting.js that every writer uses and that clears a lock-born aim; one `pickSlot(rpg, slot)` in weaponSlots.js.
- Quick fixes vs design work: quick: add `isStaggered` to the loop gate (G1-4), `||element1` at projectiles.js:1862 (G1-7), an ownership check on key 2 (G2-17), set `_swingBcastPending` in swingAttack (G1-5), gate the mana popup on `resonating`. Needs a decision: engagement end (G1-3), the queued special (G1-6/P3-6), the lock-writer refactor (G1-1/G1-2).

# VB-2 · Sound: the AudioContext's life, the watchdog and what a rebuild restores
- Verdict: needs-thought
- Severity: medium (iPhone players after any app switch of 2 s or more: the slime hum is gone for the page's life, Wheel ground steps fall back to dirt until they leave and re-enter the Wheel, and after a death the wrong land's music can start in BroTown for a few seconds)
- Who can trigger it: honest player on iPhone: switch to another app for 2 s or more, come back, tap (that tap rebuilds the audio context)
- Summary: When the phone's audio engine is rebuilt (every iPhone app switch), the code resets a hand-kept list of fields and replays only some of what was loaded. Things that live outside that list, the slime hum and the Wheel's ground-step clips, are not told and stay broken. Zone music itself recovers, because a watchdog restarts it every second. A separate "forget this visit" reset for the Wheel's land music can never run.
- Key files: src/data/gameDisplay.js:2136-2175, src/data/gameDisplay.js:4576-4597, src/game/slimeAudio.js:25-39, src/game/wheelMusic.js:78-90, src/data/gameDisplay.js:2176-2252

## The machine
- Entity, and where its state lives: BT_AUDIO, the page's one audio object (src/data/gameDisplay.js): ctx and buses, `_unlocked`, `_fadeUntil`, `_analyser`, `_silentTicks`/`_asleepTicks`, the zone and global music sources and wants, `_samples`, the deck (`_deck`), and latches kept outside it (`_groundStepsWanted`, `_loadedCriticalSfx`). The slime hum's nodes live in a React ref in BroTown (BroTown.jsx:1022).
- States: no context; asleep (suspended or interrupted); running healthy; running silent; fading in; closed; rebuilding.
- Moves:
  - first tap: no context -> running, fade in, watchdog starts (gameDisplay.js:5426-5466)
  - watchdog each second: closed -> rebuild (2179); 30 asleep ticks while visible -> rebuild (2194-2195); 3 silent ticks -> music teardown and restart (2240-2250)
  - app switch of 2 s or more then a tap: reclaim, which rebuilds (2039, 2125-2134)
  - rebuild: ctx replaced, music, deck, `_samples` emptied, manifest re-asked (2136-2175); zone and session music come back through the watchdog
  - deck: 5 s with no sound at the tap, a media error or a refusal -> streaming off for the session, decode instead (5344, 5352-5373)
- Diagram edges:
  - `NoContext --first tap--> Running`
  - `Running --iOS interrupts--> Asleep`
  - `Asleep --30 s visible--> Rebuilding`
  - `Closed --watchdog--> Rebuilding`
  - `Running --app switch 2 s + tap--> Rebuilding`
  - `Rebuilding --init + manifest--> Running (zone/session music via watchdog)`
  - `Rebuilding --slime hum--> Dead !! node left on closed ctx`
  - `Rebuilding --Wheel ground steps--> Lost !! never re-asked`
  - `Wheel --leave to town (death)--> LandMusic !! reset unreachable`
  - `Deck --silent 5 s once--> StreamingOff !! whole session`

## Concerns, verified
- [CONFIRMED] U1-28 (and G5's slime idle loop, the same finding): wireSlimeAudio keeps source and gain in a BroTown ref; after `_rebuildContext` they point at the closed context, `ensureSource` returns at its first test (`slot.source` is set), and the tick writes gain into a dead node. The hum is gone until the page reloads. Evidence: slimeAudio.js:26, 25-39, 56-66; gameDisplay.js:2136-2175 (no mention of the slot); BroTown.jsx:3188-3190. How checked: read both; the rebuild trigger is `_needsSessionReclaim` armed by `noteVisible` at >= 2000 ms away (gameDisplay.js:2039) and run on the next tap (GameApp.jsx:255-257). Docs: none. Medium.
- [CONFIRMED] D2-11: `_rebuildContext` empties `_samples` and replays only the manifest; loadGroundSteps runs only from preloadWheel and the once-a-page unlock, and its latch is never reset. After a rebuild in the Wheel, every grass, snow, mud or stone step plays dirt and the material hit voices use their fallbacks, until the player leaves the Wheel for more than 5 s and re-enters. Evidence: gameDisplay.js:2161, 2173, 4576-4597, 5457; worldTrial.js:387, 482-487; footstep fallback at gameDisplay.js:2395-2425. How checked: grep shows no other caller of loadGroundSteps. Docs: none.
- [REFUTED] D2-11 (critical-sfx latch never reset): harmless, the manifest replay re-decodes the same keys (the finding itself says so).
- [CONFIRMED] D2-11 (rebuild loads the manifest before the loading gate asked): `_rebuildContext` calls loadSfxManifest unconditionally (gameDisplay.js:2173). Low, only a rebuild before PLAY.
- [CONFIRMED] D2-1 (reset list is hand-kept and incomplete): the rebuild leaves `_analyserProven`, `_danceWant`, `_tagLoads`/`_sampleTag`/`_sampleLoadP`, `_gateLoops` behind (grep of those fields; none appear in 2136-2168). The ground steps and the slime hum are two real losses from the same cause.
- [CONFIRMED] D2-1 (listener pile): every play() on a non-running context calls fadeIn(0.6), and each fadeIn parks a statechange listener through _whenRunning; they all fire together on wake and re-ramp the master. Evidence: gameDisplay.js:5849-5854, 1859-1885. Low: harmless garbage and a repeated identical ramp.
- [PLAUSIBLE] D2-1 (stale callbacks run on the new context): `_whenRunning` registers on the old context but re-checks `self.ctx`; closing the old one fires statechange. Evidence: gameDisplay.js:1859-1867, 2169. The callbacks mostly re-check (url, source, token), so I could not show harm.
- [PLAUSIBLE] D2-1 (`_analyserProven` never cleared): it stays true across a rebuild, so a new tap WebKit never pulls would read as provable silence and tear the music down every ~3 s. Evidence: gameDisplay.js:1959-1963. Unproven link: that WebKit would treat the second context's tap differently from the first.
- [CONFIRMED] D2-3 (restart has no entry point): five callers null `_currentZoneAmbient` to beat the same-zone return (gameDisplay.js:1820, 2236, 2247, 5371, 5571, MayorGreeting.jsx:81), so each also runs the leave-side effects (stopAmbient, ambience buffer deleted and decoded again, gameDisplay.js:2680-2690). Zone music itself does come back after a rebuild: watchdog at 2235-2238 re-asks. Low; a re-decode of the dunes' wind (about 11 MB of PCM) is the cost.
- [CONFIRMED] D2-3 (muted zone change leaves the old zone recorded): `if (!this.ctx || this.muted) return` precedes the write (gameDisplay.js:2642); unmute re-asks (1814-1822). Harmless.
- [REFUTED] D2-3 (Mayor greeting stuck): the greeting is unreachable in play (BroTown.jsx:155-163, 2311-2316).
- [CONFIRMED] D2-6 (streaming turned off for the whole session on one silent 5 s window): `_deckFail` sets `_deckFailed` for the session and falls back to decoded tracks (+23-40 MB). Evidence: gameDisplay.js:5333-5373, 5097. This is the deliberate v2.3.3073 design ("never leaves the game silent"), so it is a watch item for the memory budget, not a bug. A rebuild does not reset `_deckFailed` (2136-2168), so one false verdict stays for the session.
- [PLAUSIBLE] D2-6 (`_danceWant` survives a rebuild): setDanceMusic(true) then no-ops until a zone or session start remakes the deck. The frame loop (moveSounds.js:137-145) compares `on` to `_danceWant`, and the watchdog's zone restart remakes the deck, where the dance takes precedence. Harmless while dancing.
- [CONFIRMED] R5-12 (resetWheelMusic unreachable): its only caller is noteWheelMusic's not-in-the-Wheel branch (wheelMusic.js:90), and noteWheelMusic is called only from the Wheel minimap (wheelMinimap.js:1119), which runs only when the zone is the Wheel (minimapRenderer.js:794-797). A death moves currentZone to 'town' first (respawn.js:60-61), so `_m.settled` stays true. Effect: PLAUSIBLE, not proven: the worker's last `where` answer lingers 5 s after you leave (worldTrial.js:95, 529; wheelTrial.js:565 nulls it only then), so a return inside 5 s can read the old land as the answer and start its music in BroTown until the fresh answer; the mp-landmusic death test waits up to 15 s for the town track and would pass either way (mp-landmusic.mjs:296-314).
- [CONFIRMED] P1-9 (music part): the Land Office's Travel to Farm calls `BT_AUDIO.startZoneAmbient('town')` after holdFarmUntilReady asked for 'farm_home', so that door plays BroTown's village track on the farm while Feed and Seed plays Homestead Morning. Evidence: BroTown.jsx:13555, 13567; farmTrip.js:36-47; gameDisplay.js:1425. mp-farmmusic covers one door only.

## What needs further thought
- Who owns "everything made against this audio context"? Today a rebuild resets a hand-written list, and anything outside it (slime hum, ground steps, dance want) is forgotten. Should every context-bound thing register itself so a rebuild replays it?
- Is "streaming off for the session after one silent 5 s window" what the owner wants on a phone with an app switch in the middle? It costs +23-40 MB on a phone that crashes near 250 MB.
- Making it explicit: one `AUDIO_PHASE` field written by a single `_setPhase`; `_rebuildContext` resets a declared `_perCtx` object; a `_ctxAsks` list (manifest, critical, ground steps, slime loop) that `init()` replays on every new context, not only on the first tap; one `restartZoneMusic()` that re-asks without leave side effects; wheelMusic's `resetWheelMusic` also called from the zone change.
- Quick fixes vs design work: quick: call loadGroundSteps in `_rebuildContext` when `_groundStepsWanted` is set (D2-11); make the slime loop check `slot.source.context !== BT_AUDIO.ctx` and rebuild (U1-28); remove the `startZoneAmbient('town')` at BroTown.jsx:13567 (P1-9); call `resetWheelMusic` from respawn and zone changes (R5-12). Needs a decision: the deck's one-strike verdict and the restart entry point.
