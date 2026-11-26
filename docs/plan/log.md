# The gatekeeper's log (v2.3.6400)

One line a step a sitting, the newest first: the sitting, the step, what
merged (the PRs), what the box still waits for. The plan
(`docs/GRAND-PLAN.md`) keeps the boxes; their record from sitting 56 on is
here. Sittings 1 to 55 are in the plan's own notes and in
`docs/plan/census/review-z*.md`.

| Sitting | Step | Merged | The box waits for |
|---|---|---|---|
| 69 | (no box) | listed (main 7ec316e9), bottom first, merge commits, each mend by the orchestrator with precheck before its push, each tree checked: KEEP #2385 (76aa7e51, unchanged: tree ccb8fb0c), #2388 (a7a05195; retarget, unchanged: 9917fa87), #2389 (87b08b1b; retarget, unchanged: cf2dd98c); PAD #2387 (897f7444, unchanged: 135653da); LOAD #2386 (b29cda8a, unchanged: a4b6654d); PRT #2384 (f2e58e9c; MEND: merge main, tag-blocks.json's end `"UI2"`, `"PRT"`, `"KEEP"`, `"LOAD": [[6760, 6779]]`, `"nextBlock": 6780`; systems/switches --write change nothing: tree 9b8bbb01); TD #2380 (59033267; the owner's Approve (`.github/`); MEND: merge main, tag-blocks.json main's side plus `"TD": [[6700, 6719]],` after UI2: tree f5e82a0f), #2381 (3ae3c9ec; retarget, unchanged: d68ff229), #2382 (7dea131f: d1de14f8), #2383 (860ae830: bbc8222c, the final tree); Z #2391's notes last. No merge deploys the worker. UI2-grip #2390 came after the rehearsal began: sitting 70. | the merges |
| 69 | (no box) | rehearsed the whole order with every mend (tree bbc8222c): gatekeeper.mjs precheck 0 FAIL 2 WARN, switches-thrown --whole (94 switches, 2529 runs), claims-gain --whole, build, questline 187/187 PASS; heldsweep's sample red then 1 of 3 then 2 of 2 green on the final tree, 1 of 2 on each prefix (cf2dd98c, a4b6654d, 9b8bbb01), 2 of 2 on main: a different job just over 12 ms each red (tick2, `_sprite`, `R > J`, a note left by screen-check or server-message): the box's noise, no branch's. Review: KEEP's purpose review (every card dodge for `/sfx` RED; the named question: nothing stops a `KEEP_STAMP=0` build, nothing sets it, and the stamped build ships no bare or stale `/sfx`), PRT's (the card's break proofs RED), #2382's deletions (none acted), LOAD's read: no bug in behaviour, no hold. Next jobs: debts KEEP (69), PRT (69), LOAD (69), TD (69). | the review |
| 68 | (no box) | listed (main d42e48ac), bottom first, merge commits, each mend by the orchestrator with precheck before its push, each tree checked: PAD #2354 (8f9e2d87; mend first: merge main, tag-blocks.json and tools/guards/lib/systems.mjs as #2363's, systems/switches --write: tree 05c693a3; DEPLOYS), #2363 (d8a10178; after it, merge main, clean: tree cf31c359; DEPLOYS), #2378 (e1467159, unchanged: main's tree 11997db4; DEPLOYS); the camera #2361 (4e189702; GR (67)'s mend after #2378: tree 5ab1088e, precheck 0 FAIL); UI2 #2369 (d7703b7c; merge main after #2361, clean: tree 564a7771), #2370 (unchanged: eac520e4), #2374 (merge main, UI2.md the branch's: 988b91ac), #2376 (unchanged: f430859d; DEPLOYS), #2377 (merge main, UI2.md the branch's: e01b81e7), #2373 (merge main: systems.mjs ui row main's + itemInspect, states.mjs main's then its own, UI2.md the branch's, --write: 007eb52f), #2375 (merge main: kit ui2.css and index.js main's then its own, UiKitPage's import both, systems.mjs + compare|equipProject|workspace, UI2.md the branch's: 521a6dfb), #2371 (merge main: systems.mjs dashGrow, ui.js its _tap row and state-census --ledger ui --write, UI2.md the branch's: 0837fc09 = the final tree); this notes PR (5661). Held: none. UI2 without PAD and the camera (if they wait): tree c66e0b9e. | the owner's eye on the new dashboard (on by default; ?ui2=0 today's) |
| 68 | (no box) | rehearsed the whole order with every mend (tree 0837fc09): gatekeeper.mjs precheck 0 FAIL, switches-thrown --whole (94), claims-gain --whole, build, questline 187/187 PASS; heldsweep 5/6 then 6/6 (main's ride noise, red on main too). Phone: ui2bro 27/27, ui2combat 51/51, boards 37/37, oneband 55/56, onboarding 4/5 then 5/5 (main's flake: 2/5 on main) on 86ae15a1; twobuttons 93/112 (main's families) on e1467159; camfollow 11/11 and contextbuttons 26/27 on the final tree (5: red on main too). Bug read by three lanes: none; 67's hold mended (RideButton.jsx:101, padskin 5b/5c). | PAD (68), UI2 (68) next jobs in debts.md |
| 67 | (no box) | listed (main ac35fd67): #2368 (the kit); #2366 landing #2365, #2364, #2362 after its mend (tree b5614c3c); this notes PR (5660). Held: #2363 with #2354 (a bug: the Skate button's redraw), #2361 behind it | the owner's play; debts PAD, GR, UI2 (67) |
| 67 | (no box) | rehearsed main + #2363 + #2366 + #2368 + #2361 (tree a3993e4b, rebuilt by two helpers): precheck, switches-thrown, claims-gain, build, questline 187/187, heldsweep 6/6 all green; phone: padskin, camfollow, uikit, weaponswap, shieldtoggle, contextbuttons, membudget whole; twobuttons 102/118 (main's main run never came) | as above |
| 66 | (no box) | listed (main 739eb6a0): #2360; #2359 landing #2358; #2357 landing #2355 (deploys); #2356 after its mend (tree 4ea0075f, deploys); this notes PR (6279). #2354 withdrawn by the owner | the owner's play; debts CT, PAD and Found (66) |
| 66 | (no box) | rehearsed by hand (the generated tables met): precheck 0 FAIL, switches-thrown, claims-gain, build, questline PASS; heldsweep's sample main's own; mp-twobuttons/contextbuttons on the tree and three helpers: main's steps, and 7d on #2357's head (CT's next job) | as above |
| 65 tail | (no box) | listed at 65's tail (main 0c648ebb): #2349 landing #2346 (head 3d0846c8, base main, one merge base, draft; tree 34ffe6a6, the head's own); `test` green; this notes PR (6278) | the owner's play; the debt: `docs/plan/debts.md` CT (65 tail) |
| 65 tail | (no box) | rehearsed main + #2349: precheck (0 FAIL), build, questline 187/187; suites context-button and bro-pages green; helper on 3d0846c8: mp-contextbuttons 27/27 twice, mp-bropages 55/55 | as above |
| 65 tail | (no box) | the diff since the reviewed heads (1084cbcf, b0b912ab): main's merges, three words to SAY keys (two in `say/contextButton.js`, `broPages.achvOf`), 9c's mend, the status lines, `words.md`; no closing keyword in either body | as above |
| 65 | (no box) | listed at 65: CT's #2350 (the shield drops at the worker's guard break; Charge is for monsters), QP's #2348 (the Quests tab in pages), LB's #2351 (the Ranks page's new style); #2346 and #2349 need a merge of main (`docs/plan/status/Z.md`) | the owner's play; the debts: `docs/plan/debts.md` PH, BRO (65) |
| 65 | 5.4b, (no box) | merged before 65 (main 096d7000): sitting 64's whole list (#2345) | as at 64 |
| 64 | 5.4b | listed at 64: CT's #2345 (the join: lands #2342, the right side's buttons, and #2344, the button under things; the body faces its lock) | the owner's play (part 9 item 7); the debts: `docs/plan/debts.md` CT (64), PH (64) |
| 64 | 5.4b, (no box) | merged before 64 (main 53a5257d): sitting 63's whole list (#2341 with #2340; #2343) | as at 63 |
| 63 | 5.4b | listed at 63: CT's #2340 (free arrows, Attack's press moves nothing), #2341 (tap and hold) | `legacy` empty; the owner's play (part 9 item 7); the debts: `docs/plan/debts.md` CT (63) |
| 63 | 4.4, 4.5, 5.4b, (no box) | merged before 63 (main afc215c6): sitting 62's whole list | as at 62 |
| 62 | 4.4, 4.5 | listed at 62: BK's #2326, #2335 (61's hold mended) | (the debts: `docs/plan/debts.md` BK) |
| 62 | 5.4b | listed at 62: CT's #2336 (item 6, the 47th), #2338 (the owner's three mends) | `legacy` empty; the owner's play (part 9 item 7) |
| 62 | (no box) | listed at 62: VW's #2337 (two view tests mended) | |
| 62 | 8.1, 10.1, 11.2, 10.8, 2.3, 5.4b | merged before 62 (main 9a20b7cf): sitting 61's whole list | as at 61 |
| 61 | 8.1 | listed at 61: LF's #2273, #2320, #2329 (60's hold mended) | (the box: red on `main` zero; LF's next job, `thaw-carried` §10 on the judged path) |
| 61 | 10.1, 11.2, 10.8 | listed at 61: WHO's #2317, #2325, #2333 | (the debts: `docs/plan/debts.md` WHO) |
| 61 | 2.3 | listed at 61: PH's #2279, #2291, #2297, #2306, #2314, #2318, #2323, #2332 (60's three holds mended) | the governor at a mild heat (main's own; the owner's phone test, `finish.md` part 9 item 1) |
| 61 | 5.4b | listed at 61: CT's #2308, #2327, #2330 | CT item 6 (sprint on the stick, sitting 62); the owner's play (part 9 item 7) |
| 61 | (no box) | listed at 61: VW's #2331 (the default view 0.79, the owner's pick) | |
| 61 | 4.4, 4.5 | nothing new | BK's #2326 (held: red with PH's #2279, `road-levers` cannot place `report.js:131`'s import of `../../src/game/switches.js`) |
| 61 | (no box) | sitting 60: every one of its 17 (LF #2321; WHO #2285, #2316; WL #2286 to #2322; CT #2293; DG #2295 to #2324) | 5.2b, 5.3: the phase-table's fence made a wall (WL's next PR) |
| 60 | 8.1 | listed at 60: LF's #2321 (elemental2 pinned) | #2273, #2320 (held: red with WL's #2286, wsClient.js 2599 statements over its new line 2598; the review itself passed) |
| 60 | 10.1, 11.2 | listed at 60: WHO's #2285, #2316 (59's bug mended) | #2317 (held: red with DG's #2313, `traceNote` not a `wire-gaps` taker); #2325, WHO's mend of 59's holes (sitting 61) |
| 60 | 5.2b, 5.3 | listed at 60: WL's #2286, #2287, #2290, #2298, #2302, #2303, #2322 | the phase-table's fence made a wall (WL's next PR) |
| 60 | 5.4b | listed at 60: CT's #2293 | #2308 (held: the Attack press and `latchFrame` ask different gates) |
| 60 | 4.1 | listed at 60: DG's #2295, #2300, #2310, #2312, #2313, #2324 | (none held) |
| 60 | 2.3 | nothing new | PH's #2279 to #2323 (held: three of 59's worker `report` plants green; #2318 a governor that never climbs back after a chip-caused step, a card dodge green) |
| 60 | (no box) | sitting 59: BK's #2301, #2309 | the owner's rule of 2026-11-24 (a new hole is a card's next job) in finish.md part 8 and card Z 4b |
| 59 | 4.4, 4.5 | listed at 59: BK's #2301 (the roads' levers), #2309 (the weapon listing, pieces by id) | four contrived spellings past road-levers (BK's next PR); the gear and pet listings undriven |
| 59 | 4.1 | sitting 58: DG's #2283 | DG's #2295 (held: `S[k].send`, a stash helper, `s.id`), #2300 (on it), #2310, #2312, #2313 (held) |
| 59 | 8.1 | nothing new | LF's #2273 (held: no uncarried gap of 5 to 12 s is played) |
| 59 | 5.4b | nothing new | CT's #2293 (held: a later write to `dx`/`dy` unseen) |
| 59 | 5.2b, 5.3 | nothing merged | WL's #2286, #2287, #2298 (held); #2290, #2302, #2303 (passed, on them) |
| 59 | 10.1, 11.2 | nothing merged | WHO's #2285, #2316 (held, and a bug: a week-old card reopened), #2317 (held) |
| 59 | 2.3 | nothing merged | PH's #2279 (held), #2291, #2297 (passed, on it), #2306, #2314 (held) |
| 59 | (no box) | sitting 58: CK's #2305, #2307; LS's #2311 | elemental2.test.mjs:187 flaky, about 1 run in 1,700 (no card) |
| 58 | 8.1 | nothing new | RR's #2273 (held: an early return before `thawResume` is green in thaw-carried) |
| 58 | 4.4, 4.5 | sitting 57: BK's #2281, #2289; listed at 58: #2299 (the bar, honestly) | BK's #2301 (held: a computed key past road-levers), #2309 (passed, on #2301); the gear and pet listings undriven |
| 58 | 4.1 | listed at 58: DG's #2283 (the running room refuses) | DG's #2295 (held: a destructured `channel`, `[first]` of the stash), #2300 (on #2295), #2310 (held), #2312 |
| 58 | 5.4b | sitting 57: CT's #2282 (the rules) | CT's #2293 (held: `_in.dy \|\| S.stickY`; the idle clock's argument unread) |
| 58 | 5.2b, 5.3 | nothing merged | WL's #2286, #2287, #2298 (held); #2290, #2302, #2303 (passed, on them) |
| 58 | 10.1, 11.2 | nothing merged | WHO's #2285 (held: the actor made only while `actor` is on) |
| 58 | 2.3 | nothing merged | PH's #2279, #2291 (held); #2297 (passed, on #2291); #2306 (a re-run) |
| 58 | (no box) | sitting 57: CK's #2288, #2294, #2296; listed at 58: CK's #2305, #2307 (Server CI, the owner's words), LS's #2311 (the spin from its button, the owner's words) | card CK's last lines |
| 57 | 8.1 | sitting 56: LF's #2276 (the ground rule), #2277 (quietphone), #2280 (the band's keys, narrow): card LF's lines | RR's #2273 (held: a gap judged carried is green); deskkeys 8f (card CT) |
| 57 | 4.4, 4.5 | sitting 56: BK's #2278 (the sum plays what it sums); listed at 57: #2281, #2289 | card BK: the `store_list` row's weapon, pieces by id, #2299 |
| 57 | 4.1 | nothing merged | DG's #2283 (passed, then held at DG's word: `heap-forget` §4), #2295 (held: its `test` red), #2300 |
| 57 | 5.4b | listed at 57: CT's #2282 (the rules) | CT's #2293 (held: the input read's Y and death gates) |
| 57 | 5.2b, 5.3 | nothing merged | WL's #2286, #2287, #2298 (held); #2290 (passed, but holds #2286 and #2287) |
| 57 | 10.1, 11.2 | nothing merged | WHO's #2285 (held: test play booked with play) |
| 57 | 2.3 | nothing merged | PH's #2279, #2291 (held) |
| 57 | (no box) | sitting 56: DIR's #2275 (the direction), CK's #2284 (switches-thrown on a PR); listed at 57: CK's #2288, #2294, #2296 | card CK's last lines |
| 56 | 3.1 | ticked at sitting 54 (HB2's #2261 merged at 53: `debtOf('ours')` empty on `main` 18061bea); landed here (tag 6268) | nothing: done |
| 56 | 8.1 | sitting 53: RR's #2265, #2267, #2258, #2260; sitting 55: RR's #2269 (the slow checks), #2270 (cuelevels), #2264 (deskkeys, 8f open) | RR's #2273 (the rejoin loop: `mp-comeback` 5b red twice, being mended); deskkeys 8f (card CT's verdict) |
| 56 | (no box) | sitting 55: HB2's #2271 (the gear tab's reads), #2272 (the World map's labels), EN's #2274 (off-screen townsfolk not posed): cards HB2 and EN done | HB2's 6291 and 6292 (card LF) |
| 56 | 5.1 | the two renderers' lines lowered (the shape review's part 4): entityRenderer.js 8941 -> 7984, effectsRenderer.js 9870 -> 9450, each `main` 0aec648's count plus 25 | card WL: the count's holes |
| 56 | 5.4, 5.4b | 5.4 ticked for the instrument; 5.4b opened: `legacy` falls, the input step first | card CT |
| 56 | 5.2b | reopened: its count is the 237 of 518 suites that read the page's source by path | card WL |
| 56 | 4.1 | the shape review: the wire door's forms and the hostile suite's reach are open | card DG |
| 56 | 4.2, 4.4, 4.5 | the shape review: what each reaches (the bar gated at 1.98; six systems; six restarts) | card BK |
| 56 | 2.3 | the shape review: proved on a model that heats by the clock; not confirmed on a phone | card PH |
| 56 | 8.7 | the shape review: a table; its sums are empty | no card yet |
| 56 | 10.1, 11.2 | the shape review: a shape on paper; no code | card WHO |
