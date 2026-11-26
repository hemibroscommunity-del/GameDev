> **Evidence appendix for `docs/BACKLOG-TRIAGE-2026-09-14.md` (v2.3.2471).** Raw checkpoint log of a read-only research pass against `main` 8f74d42 (v2.3.2470). Line numbers are as of that commit — grep the quoted identifier if they drift. `TODO` lines are the researcher's own open threads at the time of writing, not work items. KNOWN = read in code; INFERRED = the reading the code most directly supports.

# General Store triage research (READ-ONLY)
Started 2026-09-14T21:16:34Z

## Q1 — WHAT EXISTS (server side) — KNOWN unless marked

### market.js (order book in GameRoom) — server/src/market.js
- Mixed into GameRoom: server/src/index.js:5143 `Object.assign(GameRoom.prototype, marketMethods);`
- Routing: outer worker index.js:221-224 `/api/market*` -> `env.GAME_ROOM.get(idFromName(room||'brotown-1')).fetch`; DO fetch index.js:4014-4016 `_marketFetch`.
- Constants market.js:33-38 ORDER_EXPIRY 24h, MAX_ORDERS_PER_PLAYER 10, SWEEP_INTERVAL 60s, PRICE_HIST_CAP 50.
- Storage keys (market.js:24-26): `mkt_order:<orderId>` (escrowed order incl. weapon blob), `mkt_hist:<indexKey>`.
- Index key market.js:78-80: `${category}:${subtype}:${tierKey}:${element1||'none'}:${element2||'none'}`; buys sorted desc, sells asc (108-120).
- **Listable item kinds TODAY: WEAPONS FROM `ps.weaponStash` ONLY.** market.js:247-254:
  `if (type === 'sell') { const idx = Math.floor(body.stashIndex); ... item = this._sanitizeWeapon(ps.weaponStash[idx]); ... ps.weaponStash.splice(idx, 1); }`
  No inventory (stackable) items, no equipped weapon, no gear/armor/amulet path. Buy orders escrow gold only (256-258).
- Taxonomy fields client-supplied and only charset/length-bounded (_mktField 71-76); comment 66-69: "nothing checks the listed taxonomy against the escrowed weapon, so a modified client can advertise a copper blade as godly" (KNOWN open hole).
- Matching market.js:278-287: taker vs opposite-bucket head; a RESTING BUY ORDER **IS** a bid (gold escrowed at placement, price = max willing). Match fires when buy.price >= sell.price; **resting order sets the exec price** (291); taker-buy overpay refunded as `settle:<maker.id>:diff` (313-315). NOT an auction: no "highest bid wins at close" — first crossing order executes immediately, price-time priority within an index bucket. Bids and asks only meet if all 5 taxonomy fields are identical (bucket key), so a bid is per-taxonomy, not per-listing.
- Settlement 311-317: credit-first (`_creditPlayer` buyer kind:'weapon' opId `settle:<maker.id>:item`, seller kind:'gold' `settle:<maker.id>:gold`), delete `mkt_order:` LAST, then `_mktRecordPrice`.
- Cancel 370-385 / expiry sweep 405-421 both refund via `_mktRefund` (392-403, opId `refund:<id>`, never over a settle stamp).
- Placement requires online (`this.playerState[playerId]` 238-239 -> 'Not in game'); HTTP auth via `_httpAuthCheck` (171, 181; httpauth.js).
- Rebuild `_mktEnsureIndex` 85-106 converges crash leftovers by stamp check.
- Failed-put unwind 339-366 (v2.3.1971).
- Responses carry `settled: true` (172,182,318,367,384) = deploy-order flag.

### marketplace.js (old global DO) — DEAD for routing (KNOWN)
- server/src/marketplace.js still exports class Marketplace (line 13); index.js:18 re-exports it; wrangler.toml:58-59 binding MARKETPLACE class_name Marketplace, line 76 in new_sqlite_classes.
- No route reaches it: index.js:219-224 sends `/api/market` to GAME_ROOM; grep for `env.MARKETPLACE` usage -> (checked below).
- Old DO stored `order:<id>` as JSON strings, 1h expiry, no escrow, no settlement (marketplace.js:139-185).

### inbox.js (_creditPlayer) — server/src/inbox.js
- `_creditPlayer(playerId, entry)` 152-164: opId dedupe, online -> `_applyCreditToPs` + `_sendInboxDelivered` (event `inbox_delivered`), else `_inboxAppend` -> `inbox:<playerId>`. Returns 'delivered'|'inboxed'|'dup'.
- **Supported kinds (171-199): 'gold' {amount}, 'item' {invKey,count} (stackable inventory map), 'weapon' {weapon} (blob, re-sanitized, respects WEAPON_STASH_CAP=8 index.js:757). NO 'gear'/'armor'/'amulet' kind.**
- Escrow debits: `_escrowDebitGold` 283-302, `_escrowTakeItem(playerId, invKey, count, opId)` 304-328 — works online (live ps) AND offline (stored blob). No `_escrowTakeWeapon` primitive — market.js and trade2.js each splice weaponStash inline.
- `inbox_delivered` payload 268-274: `{entries:[{kind,payload,note,source}], queued}`; client placeholder = system chat (spec inbox-escrow.md:60-64).

### Q1 client — ExchangePanel (src/ui/panels/buildings/ExchangePanel.jsx, 1154 lines) — KNOWN
- Opened by the town building `marketplace` (src/data/buildings.js:11 `action: 'exchange'`) -> BroTown.jsx:10839 `buildingPanel === 'exchange'` renders ExchangePanel. No NPC; it is a building tap.
- Tabs Buy / Sell / My Orders (line 172). Category chips from MKT_CATEGORIES (src/data/gameSystems.js:5715: weapon[greatsword,sword,bow,staff], armor[armor], shield[shield], amulet[amulet]) + tier + element filters — a TAXONOMY browser, not a per-listing browser.
- Sell tab lists ONLY `rpgState.weaponStash` (line 536 `(rpgState.weaponStash || []).map(...)`, 565 empty-state); sends `stashIndex: mktSellItem` (637) to POST /api/market/place (614). So armor/shield/amulet categories exist in the chips but NOTHING can be listed for them client-side either (server only takes weaponStash).
- Legacy self-credit path still present, gated on `!data.settled` (664-678, 1104-1110) = deploy-order fallback (TRAPS #9 territory: do not extend).
- Uses HTTP (BT_API_BASE) not WS; `?room=` passthrough (43-49).
- NOT gated on any caps flag — grep of `caps.` in src shows trade/trade2/trade2Weapons/hpEndGrids/etc. but NO market cap; the Exchange relies on the HTTP `settled: true` response flag only.
- gameEvents.js:2437 comment `/* mkt_order removed — marketplace uses server API now */` -> the old WS `mkt_order` event is gone.

### Item containers on the server (KNOWN, persistence.js _saveRpg ~170-260)
- `inventory` = stackable map {invKey: count} (line ~171), `weaponStash` array (cap 8), single equipped slots weapon/rangedWeapon/staffWeapon/armor/legsArmor/shield/amulet. NO server armorStash/shieldStash/gearStash: grids.js:860 "armor lives in a client-only armorStash"; quests.js:451 "the client's `shieldStash`". => non-weapon gear stashes are CLIENT-LOCAL (legacy remnant) — a server-settled store cannot escrow them without first migrating them server-side.

### trade2 weapon lane (server/src/trade2.js:380-504) — KNOWN reusable pattern
- Escrow: take by index from SERVER stash (`_sanitizeWeapon(ps.weaponStash[idx])`, splice), put `trade2wpn:<pid>:<seq>` {pid,sid,seq,weapon,ts}; deliver/refund via `_creditPlayer(kind:'weapon')` with deterministic opIds; `_trade2WpnSweep` refunds orphans checking deliver stamp first (rule 6). Same shape as market.js — there is NO shared `_escrowTakeWeapon` primitive; both splice inline.

## Q2 — GAP ANALYSIS (partial checkpoint) — KNOWN unless marked
(a) Arbitrary item listing:
 - Server item kinds: `inventory` {key:count} stackables, `weaponStash` [blob] (cap 8), equipped slots (weapon/rangedWeapon/staffWeapon/armor/legsArmor/shield/amulet). Non-weapon stashes (armorStash/shieldStash/legsStash/gearStash) are CLIENT-LOCAL: src/data/gameSystems.js:5358-5364 defaults them in the client rpg; wsClient.js:1695/1741 `_rescueDisplacedArmor(S,'armor','armorStash',...)` pushes server-displaced armor into the CLIENT stash; grids.js:860 (server) "armor lives in a client-only armorStash". => "ANY item" needs: stackables via `_escrowTakeItem` (exists, inbox.js:304) + `_creditPlayer(kind:'item')` (exists); weapons via stash-index splice (exists, market.js:247-254); armor/shield/legs/gear/amulet: NO server-side unequipped container => cannot be escrowed server-side without first migrating those stashes to the server (rule 16 forbids taking the client's blob). INFERRED: this is the single biggest hidden cost of "ANY item".
 - `_creditPlayer` kinds: gold, item, weapon only (inbox.js:171-199). A 'gear' kind + a server gear stash would be new.
 - trade2 weapon lane (trade2.js:380-504) is the reusable escrow shape (record in storage, deliver/refund via _creditPlayer, deliver-stamp-checked sweep) — same shape market.js already uses. No shared `_escrowTakeWeapon` primitive exists.
(b) Bid semantics: a resting BUY order IS a bid, but per-TAXONOMY-BUCKET (5-field index key), not per-listing; match = immediate crossing at the resting price. Owner's "bid or buy" on a specific listing = per-listing bids (auction) => NEW: bid record keyed by orderId, gold escrowed per bid, outbid refund, seller accept / expiry-resolve. Existing matcher cannot express "bid on THIS sword". INFERRED design fork: (1) keep order-book and label 'buy order'='bid'; (2) real per-listing auction.
(c) Sold notification: on settle, seller gets `_creditPlayer(kind:'gold', note:'<label> sold')` -> online: `inbox_delivered` WS event (inbox.js:264-276, PRIVILEGED_EVENTS index.js ~line 384 'inbox_delivered'); offline: parked in `inbox:<pid>` and drained at next join BEFORE state_sync (join handler). Client renders it ONLY as a system chat line (gameEvents.js:1220-1250; `source==='daily'` filtered). No toast/mail panel; no dedicated `market_sold` event. `source:'market'` + note already distinguish it => a store toast can key off `source==='market'` with zero server change (KNOWN).
(d) Anchor button: ItemDetailPopup.jsx:1367-1369 `<button onClick={onToggleLock}>{locked ? '⚓ Unanchor' : '⚓ Anchor'}</button>`; `locked = itemIsLocked(lockKey)` (line 1064, from ./inventoryLocks.js); bagModel.js:19-21/131-142 "anchored (locked) entries first, in anchor-order (oldest anchor top-left)". => It is a client-local BAG PIN (sort-to-front lock), NOT an on-chain anchor (onchain.js = Hemi Bro ownership read-only verify; chainscore.js = score attestation) and NOT a shortcut slot. Header row to host the tiny icon: ItemDetailPopup.jsx:845-855 (title span + ✕ close chip) for the loadout card; main card header at ~1296-1310 (⚓ glyph already drawn on the portrait at 1302).
(e) Inventory filters: src/ui/mobile/dash/bagFilterBus.js:46-52 CATEGORIES = all, weapon, armor, potion, crafting (in that order); classification by `classify(key)` regex (InventoryPanel.jsx:34-59) + stash entries get cat 'weapon'/'armor' (bagModel.js:122-127). Filter applied InventoryPanel.jsx:600-602.

## Q3 — CAPS / DEPLOY ORDER / REGISTRY — KNOWN
- join.js:1256 caps literal: NO market cap at all (trade, trade2, trade2Weapons, ...). Market is HTTP and uses per-response `settled: true` (handoff rule 19: "HTTP flows use a per-response settled: true").
- Client cap registry: src/ui/panels/DevPanel.jsx:150-157 CAP_GATES (precheck check 12 fails if client reads `_serverCaps.<name>` not listed). serverReady.js:32 SERVER_READY_CAPS=['prog3'].
- Storage-key registry: docs/ARCHITECTURE-HANDOFF.md:52-92 table; `mkt_order:`/`mkt_hist:` at lines 62-63, `trade2wpn:` line 71; precheck check 5 (tools/dev/precheck.mjs:439-462) FAILS on any literal `storage.put/get('<prefix>:` not in that table. Naming: lowercase_snake prefixes.
- PRIVILEGED_EVENTS index.js:352+; wire-audit.test.mjs enforces emission sites. New server-emitted `store_*` events must be added.
- Client->server WS types need a channelShim passthrough line (TRAPS #18) — but market is HTTP today (no shim needed if the store stays HTTP).
- HTTP auth: httpauth.js `_httpAuthCheck` (x-bt-auth token from state_sync; ExchangePanel.jsx:619-624 sends `S._httpToken`).

## Q2 addenda — KNOWN
- Stackable key sanitizer exists: trade.js:76-96 `_sanitizeTradeOffer` (Object.create(null), <=20 keys, len<=32, Object.prototype gate, qty<=9999) — reusable for listing inventory items by key.
- Amulet: client-crafted blob, `_sanitizeAmulet` gear.js:158-172 whitelists {tier,gem,name}; no server armor/shield sanitizer beyond equip paths (equip_request gear.js:530 only swaps WEAPON stash by index).
- wsClient.js ~1708-1712 comment: "there is no server-side shield stash (handoff rule 1 forbids a new [field])" — confirms the gear-stash gap is a known, deliberate state.
- Bag-tap precedents: src/ui/mobile/shopBus.js (v2.3.2059 "Tap my inventory -> sell it") and src/ui/mobile/tradeBagBus.js (v2.3.2149) — InventoryPanel.jsx:381/388 route tile taps into an open panel; popup actions map ItemDetailPopup.jsx:161-170 gates server-settled actions (`open`, `capeOn`) directly on `_serverCaps.eventCapes` (audit-visible pattern for a `list` action).
- GameApp.jsx:354 wheel tool 'market' is a placeholder (console.log) — TRAPS #11 wheel-gated surface; not a store.
- inventory.md spec:267-276 already imagines a tooltip "MARKET … List ↗" block and a 2x2 action grid (Wear / Keep safe / Add shortcut / Salvage) — stale-ish design doc, not built.
- gearStash = cosmetic gear {slot, gearId, name} (ItemDetailPopup.jsx:682) — client-only cosmetics.

## Q4 — SIZE + DANGERS
Reusable: market.js escrow/settle/refund/sweep/rebuild skeleton; inbox.js primitives; _sanitizeWeapon; _httpAuthCheck; market.test.mjs harness (386 lines, ~60 checks, makeState/fakeWs/join helpers lines 32-88); ExchangePanel fetch+settled plumbing; bagFilterBus CATEGORIES + classify; shopBus/tradeBagBus tap pattern; inbox_delivered (+ source:'market').
New (INFERRED): per-LISTING model (not taxonomy bucket) w/ item kinds item|weapon; optional bid records + outbid refunds + lazy resolution; 2-3 storage prefixes registered in handoff rule-2 table; new narrow cap in join.js + DevPanel CAP_GATES; store panel grouped by CATEGORIES; popup `list` action; sold toast; anchor->header icon; server gear stash migration IF armor/shield/amulet must be listable (own PR: persistence fixed list + migrations.js + join load + wsClient adoption).
Dangers: (1) rule 16 + client-local gear stashes; (2) credit-first/opId/rule 3 cap/rule 12 no-alarms/rule 9 unbounded list on browse; (3) TRAPS #6 proto maps, #9 narrow cap, #18 shim, market.js:66-69 taxonomy mislabel hole.
