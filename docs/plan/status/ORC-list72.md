# Sitting 72's list, whole, as it came to part 36 at 07:58 UTC 2026-11-27

From the gatekeeper session_01LccHaiMkBzsFxjkasbcd6v (card Z, notes PR #2422, tag 5666). Saved in short in #2422's docs/plan/status/Z.md. A peer's words, not the owner's. Part 36's merge of it is in ORC.md's PART 36 lines.

NOTHING under .github/ or server/wrangler.toml in any listed PR's diff against MAIN. That was checked on each PR merged with main, #2411's too (empty). The ONLY change under server/ outside server/test is SHOP #2400's (server/src gold.js, join.js, quests.js, shop.js, stash.js, wire/out.js), as expected.

FOR THE OWNER: a bug on main today. It is NOT in any PR, and no card owns it.
The phone's gear bag (armour, legs and other gear pieces) never reads the worker's copy.
- CAUSE: the phone adds a piece only from the one reply that brought it (chest, forge, quest, loot, mail). wsClient.js:2716 never reads player_state's armorStash, legsStash or gearStash, and a rejoin's state_sync carries none of them.
- COST: if the line drops before that reply, the player has paid (5 bars, or the chest) and the worker holds the piece, but the phone never shows it, even after a reload. The player cannot wear it, yet a No man's land death can still take it.
It is the gap SHOP's shield had, now mended for the shield only. Written in docs/plan/debts.md, Found (72).

MAIN FOR THIS LIST: e27b3042b2fd70fe1629ad5be9c0a893eb5d10df, tree a9cf3520a8764481dad712066e27e4136fd008f7.
- Merged alone meanwhile: #2406 HUD, #2409 PAD part 11, #2418, #2420, #2421, #2419. I READ #2406 and #2409 (below); the other four are sitting 73's.
- If main moves again, the resolutions stand as written; only the trees change. Two of the moves tonight changed what the list could hold: #2421 is why LOAD is now held, and #2419 is why Purse's QuestCoach rule is main's whole file.

HOW TO MERGE
- Every PR is an open DRAFT: mark each ready just before merging it, use "Create a merge commit", and go BOTTOM FIRST.
- A PR whose base is not main is retargeted to main BEFORE its merge.
- Each line was counted landing with ONE merge base.
- No listed PR's title or body has a closing keyword.

ORDER
- Line 1 is unchanged.
- Lines 2-4 are ONE CHAIN of mends: each mend merges the mend before it, so all three can be built at once after line 1 lands.
- Line 5 (the notes) is unchanged.
- Line 6 is SHOP, alone and last, unchanged.
- Lines 3-4 are OPTIONAL (see below). With them left out, lines 5 and 6 land the same way; trees are given for both cases.

LINE 1: Quests #2399
- Branch claude/plan-ui2-11-quests, head 7c3c6b4a6af014dd28313a0cfdd087661daf1d29.
- Base claude/plan-ui2-grip (already on main): RETARGET to main. UNCHANGED.
- Main's tree after: 17059f49fafe209712f88e5dbc0897fd6b91d0f5.

LINE 2 (the chain begins): UI3-purse #2410
- Branch claude/plan-ui3-7-purse, head 59b965bd6028026eca0de4a563cfb02226276ee6.
- Base claude/plan-ui3-2-hud (on main): RETARGET to main.
- MEND: on the head, `git merge --no-ff origin/main` (main as it is after line 1). FOUR conflicts:
  - src/ui/mobile/QuestCoach.jsx: `git checkout --theirs` (main's whole file). The PR's only change to this file is the order of two imports, and #2419 has since replaced one of them.
  - tools/guards/lib/systems.mjs (one hunk, the `ui` system's `files:` list): take main's list, and add the head's one new entry `f('src/game', 'topGold') /* v2.3.6786: the gold on the top bar's rules (card UI3 PR 7) */` at the end of the list, after `, ` and before the closing `],`. The PR changes nothing else in this file, so this is the same as `git checkout --theirs` plus that one entry.
  - src/state/ui.js (ledger rows): keep BOTH sides, then run `node tools/dev/state-census.mjs --ledger ui --write`, which orders the rows.
  - docs/SYSTEMS.md: run `node tools/guards/systems.test.mjs --write`, after systems.mjs.
- Tree 7f022d4e77206715567a3eb17b7967214ea234d4 (= main's tree after).

LINE 3 (OPTIONAL): UI2-codex #2408
- Branch claude/plan-ui2-12-codex, head 5acd2917348e1d2ecb9a183a215c2153f46dc58a.
- Base claude/plan-ui2-11-quests (on main after line 1): RETARGET to main.
- MEND: on the head, `git merge --no-ff <LINE 2's MEND>`. THREE conflicts:
  - docs/plan/status/UI2.md: `git checkout --ours` (the head's, the later PR's).
  - tools/guards/lib/systems.mjs: the merged-in side's `ui` list, with the head's entry `f('src/game', 'codexView|entityInspect|lootRows') /* v2.3.6693: the Codex's collection, a showcase, a monster's loot rows (card UI2-codex) */` added at its end, before `],`.
  - docs/SYSTEMS.md: run `node tools/guards/systems.test.mjs --write`.
- Tree 6493d7034b7abb5db6f3ff31c34b4a1ade39348b.

LINE 4 (OPTIONAL): UI2-pets #2413
- Branch claude/plan-ui2-14-pets, head 85710851edbbcabb1f28d5d26e395d072cfdceea.
- Base claude/plan-ui2-12-codex: RETARGET to main.
- MEND: `git merge --no-ff <LINE 3's MEND>`. It merges CLEAN.
- Tree bb01008587e290beaca9c2948c135f985d11eb5f.

LINE 5: Z #2422
- Branch claude/plan-z-sitting-72, head 69a4a99379cafc40169a5952915f876b360213a9, base main, tag 5666.
- Documents only. Main 02966bcb is merged in once; precheck 0 FAIL, 1 WARN; all its checks green at a1dbf3f7, its last push before this one.
- Mark it ready. UNCHANGED.
- Main's tree after: f96510acfbdf1ae0751d6eff4d5845c219cb197a with lines 3-4, or b99527db37c1023ca427811c5473f9a0ee8ce076 without them.

LINE 6, ALONE, LAST: SHOP #2400
- Branch claude/plan-shop-1-shield, head d782aed29bbb03936a9124617403f052034faa64, base main. UNCHANGED (main e8ccff26 merged in; one merge base).
- IT RESTARTS THE GAME SERVER ONCE: the worker deploys from main once Server CI's `test` passes on the merge commit.
- CHECK its `test` before merging: it was still running at 04:34, when every other check was green.
- THE FINAL TREE: 82266bccf9e7c063ba973b70fef021496db2e564 with lines 3-4, or 471e1ccf6a6cb13bdf075cfc2240347f17f4d6b3 without them.

WHAT WAS RUN
- The rehearsal (gatekeeper.mjs) ran on main 02966bcb with Quests, LOAD, the same Purse, Codex and Pets mends, and SHOP (tree e65ad665). Every check passed: precheck; switches-thrown --whole; claims-gain --whole; build; questline 187/187; heldsweep 6/6.
- On main 2bd82b3b, the same order with the notes (tree 2592a2ad): precheck 0 FAIL, 3 WARN; without lines 3-4, precheck 0 FAIL, 5 WARN; membudget 12/12 (buffers read 25.0 against the 25.2 line).
- On main e27b3042 (this list's main): each mend conflicts only as written above, and systems, state-ledger, char-hud and four-lines are 0 FAIL on every mend and on both final trees. I did not chase main with another full rehearsal: it moved six times during this sitting. Your precheck before each mend's push, and each tree compared with the one given here, is the check.
- An earlier order had Own plate and HUD art in it (tree 33428b94). Their reds held them (below).

THE OPTIONAL LINES 3-4 (your call, by the owner's 04:49 rule as you applied it to #2406)
- Under finish.md part 8, each is HELD because a card's own dodge is green at the page.
- Neither has a bug in behaviour; both are screen files only, with no memory line raised and no new switch.
- Codex: "at most one when each rolls alone" (MonsterShowcase.jsx:161 `lootRollWords(true)`) and "the same sword, different names" (:59 `nameOf` dropped).
- Pets: "Release with no confirmation" (PetsPage.jsx ~263 sends sendPetRelease with no ask) and "a second press of Take out sent while the first is out" (no `press()`).
- If the owner's rule takes them, those dodges become their cards' next jobs (debts.md UI2 (72)) and they land here. If not, leave out lines 3-4.

HELD (finish.md part 8)
- LOAD #2401 (f56dfa3b), held by the rehearsal on main 380317e6 and on e27b3042: merged with main, `four-lines` 1b is RED.
  - src/rendering/systems/entityRenderer.js has 7985 code lines against its line of 7984. The PR adds about 40 lines, and #2421 filled the file to its line.
  - It was green on main 2bd82b3b.
  - Mend (its session's): move the worn pass's gate (`_wornPassBegin`, `_wornPass`) out of the big file (finish.md rule 5).
  - Its review LANDS: every reader sitting 71 named is RED, run on the real worker in node.
- Ranks #2412 (e08554a2): A BUG IN BEHAVIOUR, live on its head.
  - The Coin flip board says "Nobody has won a flip against Ace yet." before the answer arrives (RankStandings.jsx:106 useFlip returns `loading: false`; aceFlipBus.js:47 starts `{wins:[],losses:[]}`).
  - The card's own dodge "'nobody' shown while loading" is green (:221 `loading={false}`).
  - Its mend (the fish icon through KEEP's helper) holds: RED.
- Life #2415 (220e6140): the card's dodge "another player's XP shown" is green.
  - LifeSkillPage.jsx:47 `lifeSkillProgress(R, skill, null)` shows your XP on their page; the How it works door (:87) and page (:124) do the same.
  - It is built on Ranks, so it waits with it.
- Own plate #2411 (6b99b2df), held by the rehearsal: merged with main, `four-lines` 1 and 1b are RED.
  - entityRenderer.js has 8025 statements against its line of 8008, and 7997 code lines against 7984. The PR adds 33 lines to the big file.
  - Mend: move them into ownPlateFx.js (rule 5).
  - Its review otherwise LANDS: every card dodge is red.
- HUD art #2414 (91a7246c): three card dodges are green at the drawing, because hud-art.test reads hudArtModel only: the pill showing the combat level (HudArt.jsx:142); the badge reading the weapon's level (:135); "1" in the badge before the record (:135).
  - Also, merged with main it turns HUD's own `char-hud` 9i RED.
  - Mend: hud-art.test reads HudArt.jsx's tree.

READ, ALREADY ON MAIN (no bug in behaviour in either; their findings are next jobs)
- #2406 HUD: sitting 71's plants are RED. Its card's dodges "Lv 1 before the record" (as a placeholder span) and "a quest line that can wrap" are green: debts.md UI3 (72).
- #2409 PAD part 11: its card's dodges are RED. mp-padskin 6d is the slow box, by reading: the step waits 600 ms by the wall clock, and the held page delays the press past pressGate's window (ShieldButton.jsx:890-897). Nothing in the PR touches step 6's code.

LANDING BY REVIEW
- Quests #2399: sitting 71's dodge is RED in every spelling, and the pinned-card bug is mended (dash-nav 3i).
- SHOP #2400: sitting 71's hold is RED on all three paths: a lost shop_result, a re-sent reqId, a rejoin; the six card dodges are RED; a forged `held` is not possible: the worker never reads it; no stored shape changes.
- Purse #2410: its card's dodges are RED.

MEMORY: no line is raised in this order. BUFFERS stays at 25.2 (#2399's one line).

KNOWN REDS, MAIN'S OWN
- mp-ui2frame step 2.
- heldsweep's noise at the ride station: 2 over on 33428b94, 6/6 on e65ad665.
- contextbuttons 5.
- onboarding's flake.
- oneband's sideways fit.
- questguide 7, pointstips 1, dmgsize 4.

NEXT JOBS (not holds): docs/plan/debts.md SHOP (72), LOAD (72), UI2 (72), UI3 (72), PAD (72) and Found (72). Found includes:
- a doubled shield gid that the worker keeps on a modified join (gearstash.js mergeStashLists; not reachable by the game's own phone);
- the 42 px sideways button: it is the Quests sheet's own min-width:0, mended in #2399. Gear's summary "Eat" is about 32 px sideways, by estimate (gearPanels.css:67-70; card UI2-gear's files);
- precheck's version-tag WARN on stacked branches: precheck.mjs:437 reads the commits a branch shares with this one; the fix is `git log ref --not baseRef HEAD`.
Part 31's "storeListPet posts /list with no action row" is NOT real: it goes through act() (storeApi.js:121).

SITTING 73's: LOAD, Ranks, Life, Own plate and HUD art at their mends (and Codex and Pets if left out); #2417 Feats; #2418, #2420, #2421, #2419.
