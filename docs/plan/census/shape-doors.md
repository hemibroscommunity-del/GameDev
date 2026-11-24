# review-doors.md  (audit of "one way in" on the server: the doors and the wire)
worktree: /home/user/GameDev/.claude/worktrees/agent-ad20b6efc1dcab48e   HEAD 0aec6482
started 2026-11-23. Findings appended as found.

## log

## 1. How the door tests are built (read: gold-door, bag-door, life-door, xp-door, quest-door, skillpoints-door, stash-door, hit-door, send-door)
- NONE parses code. No acorn/AST import in any door test. Every "ONE DOOR" section is a regular expression over comment-stripped text
  (server/test/src-walk.mjs lists the files, in depth, vendor/ left out).
- gold-door.test.mjs:202  WRITE = /(?:\.coins|\[\s*['"]coins['"]\s*\])\s*(?:[-+*/%]?=(?!=)|\+\+|--)|(?:\+\+|--)\s*[\w$.]*\.coins\b/g
  -> only `<x>.coins =`, `+=`, `++`; no alias tracking, no Object.assign, no `||=`/`??=`, no key-in-a-variable.
- life-door.test.mjs:169/173 same operator class; receiver named `m` or `mn` is EXEMPT in every file (MONSTER_NAMES) ; :198 literal check covers only `dying|life: true|false|'alive'|'dying'` (not `dead:`, not `hp:`).
- bag-door.test.mjs:213-224 alias only by `const|let|var NAME = ...inventory...`; a destructure, a parameter, Object.assign are not aliases.
- quest-door (hardened at v2.3.5291 "sitting 20 review": `||=`, Object.assign(x._quests, array methods) -- but alias still only const/let/var NAME = x._quests.
- callers census: gold-door "by any name" (v2.3.5285); life-door.test.mjs:52 still `this\.` + name only; hit-door.test.mjs:628 `this\._applyDamage\(` by FILE (3 files allowed whole).

## 2. BREAK PROOFS, batch 1 (2026-11-23). One line planted at server/src/quests.js:426 (after `this._goldGive(ps, reward.gold || 0, 'quest_reward');`), door's own suite run, file restored.
CONTROL  `ps.coins = (ps.coins || 0) + (reward.bonusGold || 0);`                               gold-door RED (harness works)
GOLD-1   `Object.assign(ps, { coins: (ps.coins || 0) + (reward.bonusGold || 0) });`             gold-door GREEN (missed)
GOLD-2   `ps.coins ||= reward.gold || 0;`                                                       gold-door GREEN (missed)
GOLD-3   `for (const k of ['coins', 'goldNuggets']) ps[k] = (ps[k] || 0) + (reward[k] || 0);`   gold-door GREEN (missed)
GOLD-4   `this._applyCreditToPs(ps, { kind: 'gold', payload: { amount: reward.bonusGold || 0 } }, session.id);`  gold-door GREEN (a 2nd caller of the mail's landing, no opId, no class)
XP-1     `Object.assign(ps, { xp: (ps.xp || 0) + (reward.xp || 0), level: Math.max(ps.level || 1, reward.minLevel || 1) });`  xp-door GREEN
XP-2     `ps.level ||= reward.minLevel || 1; ps.xp ??= reward.xp;`                              xp-door GREEN
XP-3     `{ const { lifeSkills } = ps; const t = lifeSkills.mining; if (t) [t.xp, t.level] = [0, t.level + 1]; }`  xp-door GREEN
HP-1     `Object.assign(ps, { hp: ps.maxHp, dead: false });`                                    life-door GREEN
HP-2     `for (const id of (reward.partyIds || [])) { const m = this.playerState[id]; if (m) { m.hp = m.maxHp; m.dead = false; } }`  life-door GREEN (the `m` exemption)
HP-3     `delete ps.dying; delete ps.dead;`                                                     life-door GREEN
HP-4     `ps.hp ||= ps.maxHp;`                                                                  life-door GREEN
BAG-1    `{ const { inventory } = ps; inventory[reward.item] = (inventory[reward.item] || 0) + 1; }`  bag-door GREEN
BAG-2    `Object.assign(ps.inventory, { [reward.item]: (ps.inventory[reward.item] || 0) + 1 });`       bag-door GREEN
BAG-3    `function addTo(items, k, n) { items[k] = (items[k] || 0) + n; } addTo(ps.inventory, reward.item, 1);`  bag-door GREEN
BAG-4    `ps.inventory[reward.item] ||= 1;`                                                     bag-door GREEN
QUEST-1  `{ const { _quests: qs } = ps; qs[reward.next] = 'active'; }`                          quest-door GREEN
QUEST-2  `function mark(q, id, st) { q[id] = st; } mark(ps._quests, reward.next, 'active');`    quest-door GREEN
QUEST-3  `Object.assign(ps, { _quests: { ...ps._quests, [reward.next]: 'active' } });`          quest-door GREEN
POINTS-1 `{ const { prog3 } = ps; if (prog3) Object.assign(prog3, { pool: (prog3.pool || 0) + 1 }); }`  skillpoints-door GREEN
POINTS-2 `if (ps.prog3) ps.prog3.shared ||= 3;`                                                 skillpoints-door GREEN
STASH-1  `{ const { weaponStash } = ps; if (reward.weapon) weaponStash.push(reward.weapon); }`  stash-door GREEN
STASH-2  `Object.assign(ps, { weaponStash: [...(ps.weaponStash || []), reward.weapon] });`      stash-door GREEN
=> 22 of 22 non-obvious spellings walked past 7 doors. (command: cd server && node tools/dev/plants/batch.mjs tools/dev/plants/plants1.json)

## 3. Wire door (server/src/wire/door.js) -- what "held to its form" is
- door.js:244-249 fieldWhy: a named field is refused ONLY if it holds a non-finite number (1e999) or, for trust `words`, is not a string / > 2000 chars.
  No type check for request/claim/bounded/look fields: a string for a number, an object for a string, a negative, a fraction all reach the handler.
- a field the row does not name passes untouched (door.js:25); null passes.
- tools/guards/wire-table.test.mjs:230-231 checks only that trust VALUES are from the closed list; nothing checks that a field a handler reads is NAMED.
- trustscan.mjs (mine, text heuristic, one function deep, 138 of 140 in-rows): handlers reading a field their row does not name:
  move: msg.dead (movement.js:996, read when `serverdead` is off)        player_attack: payload.dmgBase, payload.critChance (combat.js:2445-2446; the census docs/plan/census/wire.md:521-522 HAD them as bounded claims; in.js dropped them)
  trade2_cancel: payload.id (trade2.js:571; trust is {})                   ride: msg.data (ride.js:153, an envelope)   ability_use: payload.tier (comment only: false lead)  monster_damage: element (false lead)

## 4. BREAK PROOFS, batch 2 (plants2.json; each file restored after)
SUM-1  shop.js:679 `Object.assign(ps, { coins: (ps.coins || 0) + 5 });` after the shop_sell give   gold-door GREEN, world-sum RED ("unexplained gold 5")  => the RUNTIME net holds on a path it plays
SUM-2  quests.js:426 the same line                                                                  world-sum GREEN, storm GREEN; quest-echo RED only because it pins the exact purse (coins 112)
        => world-sum plays bank, gamble, shop, trade2, grant, daily quest, duel, arena, mail; a road it does not play (quest turn-in, farm, pets, harden, forge...) is seen only by a suite that pins the number.
HIT-1  monstermoves.js:504 `{ const room = this; ... room._applyDamage(tps, 5, { monster: true }); }`   hit-door RED but by the measured rows (combo/charge), not by 10d  (re-run in an unplayed path: batch 3)
HIT-2  combat.js:2435 `this._applyDamage(attackerPs, 3, { thorns: true });`                          hit-door GREEN (10d allows combat.js whole: 2 callers there today, a 3rd is unseen)
HIT-3  monstermoves.js:504 `this._hpSet(tps, Math.max(0, tps.hp - 5), 'hit');`                        hit-door RED, life-door RED (text for text + row's file)  => HOLDS
HIT-4  monstermoves.js:504 `{ const room = this; ... room._hpSet(tps, Math.max(0, tps.hp - 5), 'hit'); }`  life-door GREEN (its caller census reads `this.` only: life-door.test.mjs:52); hit-door RED by the measured row only
SEND-0 quests.js:426 `ws.send(JSON.stringify({ type: 'player_state', payload: {} }));`                send-door RED (control)
SEND-1 `{ const out = ws.send.bind(ws); out(JSON.stringify({ type: 'player_state', payload: {} })); }` send-door GREEN, wire-audit GREEN
SEND-2 `import { sendOutside } from './send.js';` + `sendOutside(this._wsBySessionId(session.id), { type: 'player_state', payload: {} });`  send-door GREEN, wire-audit GREEN (the door's own uncounted export, callable from any room file)
SEND-3 `{ const T = 'quest_' + 'bonus'; this._send(ws, { type: T, payload: { gold: 5 } }); }`          send-door, wire-audit, wire-table all GREEN (a type the worker sends with no `out` row; spar.js:233 already uses this spelling on purpose to dodge wire-audit)
WIRE-2 index.js:5451 `case 'bank_tip': ...`                                                           wire-table RED (control: "every in key has a row")
WIRE-1 bank.js:282 `const tip = Math.floor(p.tip) || 0;` inside _handleBankMove                       wire-table, wire-door, wire-audit, wire-hostile ALL GREEN
WIRE-3 wire/in.js:613 bank_deposit trust `{ reqId, kind, id, n, opId }` -> `{ reqId, kind, opId }`     wire-table, wire-door, wire-hostile ALL GREEN
        => nothing holds the trust column to what a handler reads, either way.
ACT-0  src/ui/BroTown.jsx:8200 `S.channel.send({ type: 'bank_deposit', ... });`                       action-door RED (control)
ACT-1  `S.channel?.send({ type: 'bank_deposit', payload: { kind: 'gold', n: 1 } });`                  action-door GREEN
ACT-2  `{ const ch = S.channel; const m = { type: 'bank_tip', payload: { n: 1 } }; ch.send(m); }`      action-door GREEN (a type with no row at all)
ACT-3  `{ const u = (window.BT_API_BASE || '') + '/api/store/buy?room=brotown-1'; fetch(u, { method: 'POST', body: '{}' }); }`  action-door GREEN

## 5. BREAK PROOFS, batch 3 (plants3.json) -- all at server/src/farm.js:629 (after `this._goldTake(ps, cost, 'farm_buy');`)
HIT-1b  `{ const room = this; room._applyDamage(ps, 5, { monster: 'scarecrow' }); }`                           hit-door GREEN (10d reads `this\._applyDamage\(` only)
HP-5    `{ const room = this; room._hpSet(ps, ps.maxHp, 'rest'); room._lifeTo(ps, 'alive', 'respawn'); }`      life-door GREEN (a 2nd caller of two legal roads, unseen)
LEAVE-1 `this.sessions.clear();`                                                                              session-door GREEN
LEAVE-2 `delete this.playerState[session.id]; session.id = null;`                                             session-door GREEN
LEAVE-3 `this.sessions = new Map([...this.sessions].filter(([w]) => w !== ws));`                              session-door GREEN

## 6. The wire door, measured (judge.mjs: wireDoorJudge called directly)
bank_deposit (row names reqId, kind, id, n, opId, all `request`):  n: "5" / -5 / 1.5 / 1e308 / true / {} / [1,2]  -> LET IN ;  n: 1e999 -> refused "number n"
bank_deposit kind: {a:1} LET IN; opId: array of 1000 LET IN; id: 15,000-char string LET IN
area_chat text (words): 2001 chars refused; {a:1} refused
player_attack dmgBase: 1e999 (not named) LET IN; range: 1e999 (named) refused; move dead: true (not named) LET IN
=> 756 fields have rows; 34 (the `words`) are held to a type; the other 722 get one check: no number that is not finite.
   request 515, bounded 94, look 71, claim 43 (in+relay+http, 757 by my count of the tables) are told apart by NOTHING at the door.

## 7. The hostile suite's reach, measured (REACH plant: a Proxy on msg and msg.payload after the door, wire-hostile run once, suite stayed green = 1 failing, its line)
socket in-rows 140; 119 passed the door at least once in the run.
fields the rows name (top level, less type/payload/reqId): 306; read by ANY code after the door in the whole run: 202 (66%).
rows where every named field was read: 72; some: 28; NONE: 18; (22 rows name no field).
NONE: pong bro_verify ability_use cape_equip gem_cut_request daily_reroll season_claim trade2_set trade2_ready trade2_stage_weapon trade2_unstage_weapon trade2_pets party_chat alliance_name alliance_war clan_create clan_join_accept clan_war_declare
SOME (unread): report 18 of 20; monster_damage special,orbs,part,sw,noKb,sn; player_attack sw,orbs,part,sn; stats_update power,vitality,endurance,agility,mind,armor,legsArmor,defenseSkill;
  amulet_forge_request tierKey,gem,target,stashIdx,gid; essence_apply gid,idx,sig; smith_salvage gid,idx,sig; shield_gem gid,sig; arena_sponsor matchId,amount; bank_deposit/withdraw id;
  farm_act beds,crop; farm_buy count; farm_order id; make_traps/smelt_bar/shard_crack/make_hardened_wood count; item_drop qty; prog3_allocate cat; pet_name name; pet_release confirm; store_dm to; dice max; cook_request swipeFp; extraction_start fishKey; ability targetId,pid; join nj
=> for 104 of 306 named fields the suite's "hostile value" never met a line that reads the field (the sender is not in the row's phase: the suite's own header says so, wire-hostile.test.mjs "HOW FAR A CASE REACHES", but gives no number).
fields READ at run time that the row does not name: move dead; player_attack dmgBase, critChance; monster_damage element; ability_use tier; pet_house_buy id
  (statically pinned: movement.js:996, combat.js:2445-2446, trade2.js:571 payload.id with trust {}; the other three come from code before the handler, e.g. fightlock.js:143 reads p.element)
dmgBase as "abc" on the old path (`pvpbalance: false`): Math.max(1, Math.min(cap, 'abc')) = NaN, but combat.js:431 `Math.max(1, Math.round(rawDmg || 0))` makes it 1: no HP harm. Not a bug; an unnamed claim.

## 8. Other notes
- no door test parses code, though the repo has a parser in use for other guards (tools/guards/state-ledger.test.mjs, phase-table.test.mjs, lib/renderTables.mjs).
- eslint.config.js has no rule about these fields (grep for no-restricted / coins / inventory / .send: nothing).
- send.js:61 counts `s.length` (UTF-16 units), not bytes: the plan's 4.1b says "counting bytes by type".
- send-door §8 reads `.js` only (send-door.test.mjs:202), not `.mjs` (src-walk reads both); none exist today.

## 9. BREAK PROOFS, batches 4 and 5 (plants4.json, plants5.json)
PAY2-0  shop.js:679 a second plain `this._goldGive(ps, paid, 'shop_sell');`                                   gold-door RED (control: "no road has two callers")
PAY2-1  shop.js:679 `{ const give = this._goldGive.bind(this); give(ps, paid, 'shop_sell'); }`                 gold-door GREEN, world-sum GREEN (a mint is "explained"); shop.test RED (coins 908, paid 454)
        => world-sum.test.mjs:241's recorded proof doubles `bank_withdraw` (an escrow road). A double pay through a MINT road is invisible to the sum.
BAG-5   quests.js:426 `ps.inventory = {};`                                                                     bag-door GREEN (WHOLE_BAG '*' row, bag-door.test.mjs:205), world-sum GREEN
BAG-6   quests.js:426 `ps.inventory = { ...ps.inventory, [reward.item]: 99 };`                                 bag-door RED (control)
XP-5    quests.js:426 `ps.lifeSkills = {};`                                                                    xp-door GREEN (LISTED '*' row, xp-door.test.mjs:121)
OUT-0   quests.js:426 `this._send(ws, { type: 'quest_bonus', payload: { gold: 5 } });`                         wire-audit RED (control), wire-table green
RELAY-1 relay.js:185 `if (['tip_jar', 'party_ping'].includes(type)) return true;`                              wire-table, wire-audit, all 6 relay suites GREEN
PRIV-1  index.js:6136 `if (msg.type === 'player_state' && session.gm) { this.broadcastExcept(ws, msg); break; }`  wire-table, wire-audit, relay suites GREEN
ROUTE-0 index.js:4625 `if (url.pathname === '/api/tip') return new Response('{"ok":true}');`                   wire-table RED (control)
ROUTE-1 index.js:4625 `{ const { pathname } = url; if (pathname === '/api/tip') { const b = await request.json(); return new Response(...); } }`  wire-table, wire-door, wire-hostile GREEN (no row, before the routes' door)

## 10. Today's code (greps with -P over server/src, 2026-11-23)
no logical assignment (`||=` `??=` `&&=`) on a guarded field; no Object.assign with a guarded key (spar.js:395's keys are place and pose only; SPAR_NOT_COPIED keeps coins, bag, xp, hp out of a clone);
no `delete` of a guarded field; no destructured guarded map; the only non-`this` door calls are playerrestore.js:276 and :288 (`room._goldSet`, which gold-door reads "by any name").
=> the "one writer" claims are TRUE of the code as it stands; the guards are what is weak.
_onMessage callers: index.js:4842 (a bundle's part), 4852 (a frame); the door at 4878. _wireDoorHttp: one caller, index.js:4626 (GameRoom.fetch); feedback.js and leaderboard.js have their own fetch and do not call it.
The repo already loads a parser for other guards: @babel/parser and @babel/traverse (tools/guards/phase-table.test.mjs:475, tools/guards/lib/renderTables.mjs:71). No door test uses it.
Recorded break proofs (rule 8): gold 1 (the count, section 9 of that test), bag 1 (the count), stash 2, life 0, session 0, points 1, quest 1, xp 1, hit 0, send 1, wire-door 1 (five lines), hostile 1, wire-audit 0, action-door 2, wire-table 1.
  Those for the ONE DOOR scans are the old line put back: quest-door.test.mjs:23, xp-door.test.mjs:24, stash-door.test.mjs:33.
Allow-lists: gold NOT_A_PURSE 1, NOT_LITERAL 1 (EXPECT 40 give/take lines for 47 roads); bag WHOLE_BAG 5; life NOT_A_PLAYER 4 + MONSTER_NAMES m, mn; xp LISTED 24 (7 shapers, 8 whole, 9 not-xp);
  points WHOLE 2 + 6 functions exempt by name + NOT_POINTS 6; stash 0; send 0 (strict); action-door LINE 0/0 with 4 named exceptions; hit-door 3 files.
  Real writers listed, not moved: bag death_wipe and respawn_wipe (index.js:4080-4102 builds `keep[k] = ...` outside the door; classed in BAG_WHOLE, bag.js:229-230);
  xp grids.js:902 and :914 (a phone's report writes the old weapon and defence tracks, "never lower"); join.js:1339 (a first join's life skills: its own comment says no claim reaches it since v2.3.3138).
Road counts: gold 47, bag 71 (+5 whole), stash 36, hp 39, life 8, points 26 (+2 whole), quest 19, xp 22, leave 12, monster hits 15. Wire rows: in 140, out 164, relay 26, http 120.

## 11. TOTALS
55 plants; 8 controls, all RED. 47 realistic: 44 passed the door's own suite (seen: HIT-1, HIT-3, HIT-4, by hit-door's measured rows and life-door's text-for-text check).
For 3 of the 44 I also ran the system's behaviour suite or the world's sum; each was caught there by a pinned number (world-sum for SUM-1, quest-echo for SUM-2, shop for PAY2-1).
The worktree was restored at the end and its status showed 0 changed lines.

## 12. NOT CHECKED
the request-once door (reqonce.js); 4.2's gain bench; the 120 route rows against what each route reads; the Feedback and Leaderboard objects' own routes;
devtools.js and admin.js beyond greps; the page's direct switch (wsClient.js); the full suite; any browser run; stash, quest, points and xp caller-census plants beyond those listed.
