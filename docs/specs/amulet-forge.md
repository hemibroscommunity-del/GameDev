# Server Amulet Forge — v2.3.1192 (handoff item I follow-up)

> **v2.3.1198 addendum:** the polished-gem economy this spec's trust
> posture flagged as "deliberately still client-side" is now migrated —
> see the "Gem income (v2.3.1198)" section below.

Amulets were the last client-crafted equipment blob.  The v2.3.1180
join sanitizer (`_sanitizeAmulet`, gear.js) bounded the SHAPE, but with
no server mint the residual forgery ceiling was a free legit mythic
flame amulet (+10.5% on the authoritative damage roll,
`_computeAttackDamage`) — and legit play was quietly broken too: a
mid-session craft or gem slot never reached the worker at all, so the
elemDmg bonus never applied server-side and every reconnect stomped the
client's crafted amulet back to the stale stored copy.

`server/src/amulet.js` (mixin, rule 22) is now the mint, on the
`forge_weapon` pattern: validate from SERVER state, consume, mint into
`ps`, `_saveRpg`, echo `player_state`.  Tests:
`server/test/amulet.test.mjs`; mirror pins in
`test/mirror-audit.test.mjs` §8c.

## Wire surface

| Direction | Message | Payload | Behavior |
|---|---|---|---|
| C→S | `amulet_forge_request` | `{op:'smelt'}` | `NUGGETS_PER_BAR` (5) `goldNuggets` → +1 `goldBars` |
| C→S | `amulet_forge_request` | `{op:'craft', tierKey}` | gates: gear lock, `AMULET_FORGE_TIERS[tierKey]` (own-property — see Hardening), blacksmithing level ≥ `minLvl`, `goldBars ≥ bars`, `coins ≥ goldCost`; consumes both, mints `ps.amulet = {tier, gem:null, name:'<Label> Gold Amulet'}`, blacksmithing XP `minLvl*3` |
| C→S | `amulet_forge_request` | `{op:'gem', gem}` | gates: gear lock, equipped amulet with a known tier, `gem` ∈ `AMULET_GEMS`, one `lifeSkills.gems['polished_<gem>']` held SERVER-side; consumes it, sets `gem` + `'<Label> <Gem> Amulet'`, enchanting XP 20 |
| S→C | `player_state` | `goldNuggets`, `goldBars` (new fields), `amulet`, `coins`, `lifeSkills` | the only echo — **no new server-emitted event type**, so `PRIVILEGED_EVENTS` is untouched |
| S→C | `state_sync` | `caps.amuletForge: true` | deploy-order gate (rule 19) |

Denials are SILENT (no reject event), matching `forge_weapon`; the
client's local prediction may briefly diverge and the next echo /
reconnect heals it (rule 20).

## Data mirrors (server/src/data.js, pinned by mirror-audit §8c)

| Server | Client |
|---|---|
| `AMULET_FORGE_TIERS` (minLvl/label/bars/goldCost) | `src/data/items.js AMULET_TIERS` |
| `NUGGETS_PER_BAR` | `src/data/items.js NUGGETS_PER_BAR` |
| `GOLD_NUGGET_MONSTER_DROP` | `src/data/items.js GOLD_NUGGET_DROP.monsterKill` |

`basePower` stays in the pre-existing `AMULET_TIER_POWER` mirror
(v2.3.1139); `GOLD_NUGGET_DROP.lifeSkill` has NO live client roll site
(dead data) and is deliberately not mirrored.

## The ingredient ledger (goldNuggets / goldBars)

Previously client-local (localStorage only — the server never saw
them).  Now server-owned rpg-blob fields:

- **Persistence**: two new fields in the `_saveRpg` fixed list +
  `player_state` full snapshot (persistence.js).  No migration needed:
  an absent field on an old record deliberately reads as "not captured
  yet" (`typeof` check in join.js).
- **Join ingestion** (join.js): stored wins; a stored record that
  predates the ledger falls back to the join payload's
  `rpgGoldNuggets`/`rpgGoldBars` ONCE, clamped (nuggets ≤ 250, bars ≤
  50 — `amulet.js` bootstrap caps; honest hoards are tiny at a
  1-in-10k-kills drop rate).  Same posture as the v2.3.1021
  weaponSkills capture.
- **Income**: the monster-kill nugget roll moved server-side —
  `_amuletNuggetOnKill` in `_resolveMonsterKill` (combat.js),
  killer-only, client rate.  The client's legacy roll
  (monsterCombat.js) is gated on `!caps.amuletForge`; the client fires
  the "Gold Nugget!" popup off a goldNuggets INCREASE in its
  player_state handler instead of a private credit event.

## Client changes (all prediction-keeping, caps-gated sends)

- `ForgePanel.jsx` smelt + craft: send `amulet_forge_request` when
  `caps.amuletForge`; the local mutation stays as prediction (echo
  overwrites).  Old workers: legacy local-only path unchanged.
- `EnchantPanel.jsx` amulet gem slot: same shape, `op:'gem'`.
- `wsClient.js`: join payload carries `rpgGoldNuggets`/`rpgGoldBars`;
  player_state handler adopts `goldNuggets`/`goldBars` present-gated.
- `monsterCombat.js`: local nugget roll gated on `!caps.amuletForge`.

## Hardening

`tierKey: '__proto__'` (or `'constructor'`) resolves
`AMULET_FORGE_TIERS[tierKey]` to a truthy INHERITED object whose
undefined `.bars`/`.goldCost` pass every `<` gate and NaN-poison
`coins` — the same prototype-key hazard the duel `away`-map fix
documented (handoff item L).  The craft/gem tier lookups use an
own-property check; pinned by a test.  NOTE for successors:
`_handleForgeWeapon` (gear.js) has the same lookup shape on
`BLACKSMITH_TIERS`/`WOODWORKING_TIERS` — those tables' entries carry
numeric costs so the damage is bounded differently, but it deserves the
same guard in its own slice.

## Gem income (v2.3.1198, the successor slice)

The v2.3.1192 gem op consumed from a `lifeSkills.gems` map the server
only ever saw at the join bootstrap, so a legitimately-earned gem was
denied at the amulet slot (deny-by-default, documented below).  This
slice moves gem INCOME server-side on the same adoption pattern.

What the exploration found (code is truth): the live income flows were
(a) the monster-kill raw-gem roll (5%, zone element only —
`monsterCombat.js`) and (b) GemcutPanel cutting (raw → polished,
success rate from the `GEM_CUT_TIERS` ladder by gemCutting level).
The "35%/harvest" rates this spec originally cited
(`GEM_DROP_RATES.woodcutting/fishing/mining`) are **dead data** — no
roll site has ever read them, all the way back to the original
`index.html`; deliberately not mirrored (the `GOLD_NUGGET_DROP.lifeSkill`
precedent).  Cutting is NOT a timing minigame (one tap + pure RNG), so
it did not adopt the cook posture (client-reported outcome +
rate-limit): the server rolls it outright, and every attempt consumes a
server-held raw gem, which is the spam bound — no rate limit needed.

### Wire surface (additions)

| Direction | Message | Payload | Behavior |
|---|---|---|---|
| C→S | `gem_cut_request` | `{gem}` | gates: alive, `gem` ∈ `AMULET_GEMS`, one server-held `raw_<gem>`; consumes it, rolls success from the SERVER-held gemCutting level (`GEM_CUT_TIERS` mirror), mints `polished_<gem>` on success, gemCutting XP 15 either way (client parity).  No gear mutation → no gear lock.  Denies silently. |
| S→C | `gem_cut_result` | `{gem, success, leveled, newLevel}` | private outcome feedback (the `harvest_credit` precedent: server-owned RNG the client can't predict) — **new server-emitted type, added to `PRIVILEGED_EVENTS`**, pinned by wire-audit |
| S→C | `player_state` | `lifeSkills.gems` | the authoritative counts; a `raw_<elem>` INCREASE is the server-rolled kill drop landing (client fires the "Raw X Gem!" popup off it — the goldNuggets-popup pattern) |
| S→C | `state_sync` | `caps.gems: true` | deploy-order gate (rule 19).  Narrow flag, deliberately NOT `caps.amuletForge`: a v2.3.1192 worker advertises amuletForge but silently denies the unknown cut request, which would break cutting for a new client against it. |

### Income + adoption

- **Kill drop**: `_gemRawOnKill` rides `_resolveMonsterKill`
  (combat.js) beside the nugget roll — killer-only, zone-element only,
  client rate (`GEM_RAW_MONSTER_DROP` = 0.05).  Dungeon instances have
  no zone config → no roll (instances pay via their own tables).  The
  client's legacy roll (monsterCombat.js) is gated on `!caps.gems`.
- **Cutting**: GemcutPanel sends `gem_cut_request` under `caps.gems`;
  the raw-gem consume stays as local prediction, but the success roll,
  popups and XP wait for `gem_cut_result` + the `player_state` echo.
  Old workers: legacy local-only cut unchanged.
- **Persistence**: gems already live inside the `lifeSkills` blob field
  (no new storage key).  ONE new `_saveRpg` fixed-list field,
  `gemsCaptured` (the sanctioned extension amulet.js used for
  nuggets/bars): the one-time-capture stamp, server-internal,
  deliberately not echoed in `player_state`.
- **Join adoption** (`_gemsAdoptOnJoin`, called for both join
  branches): always whitelist+clamp whatever gems map the server holds
  (keys = `raw_`/`polished_` × the nine `AMULET_GEMS`; values 1..200
  per key — the first-connect bootstrap used to ingest gems UNCLAMPED
  inside the wholesale lifeSkills capture).  If the stored record has
  no `gemsCaptured` stamp, the client's claimed counts are folded in
  ONCE, per-key **max-merge** (max, not add — the stored map already
  contains what the original bootstrap captured; adding would
  double-count).  Stored wins forever after.

### Data mirrors (pinned by mirror-audit §8d)

| Server | Client |
|---|---|
| `GEM_CUT_TIERS` (minLvl/successRate) | `src/data/gameSystems.js GEM_CUT_TIERS` |
| `GEM_RAW_MONSTER_DROP` | `src/data/items.js GEM_DROP_RATES.monsterKill` |

Gem-cut XP (15/cut, success or shatter) is a literal at the client call
site — no constant to mirror; the server carries it as `GEM_CUT_XP`.

### Gem extraction (v2.3.1209, the successor slice §4's Residuals named)

ForgePanel's two Extract buttons — equipped weapon/shield/amulet, and
weapon-stash weapons — were the last client-local gem mutations: the
client stripped the SERVER-held gear blob and self-credited polished
gems, and since the `player_state` echo carries all four blobs
(weapon/shield/amulet/weaponStash, persistence.js) it stomped both the
strip and the credit right back — a broken settlement, no regression.
Now the worker owns it, on the forge pattern (validate from server
state, charge, mint, `_saveRpg`, echo).

| Direction | Message | Payload | Behavior |
|---|---|---|---|
| C→S | `amulet_forge_request` | `{op:'extract', target}` | `target` ∈ the four gearBase-bearing equipped slots (`weapon`/`rangedWeapon`/`staffWeapon` elements, `shield` gem) or `stash` (a `weaponStash` entry by `stashIdx`); gates: alive, something socketed (shield `.gem`, weapon `element1`/`element2`), `coins ≥ ceil(GEM_EXTRACT_BASE_COST × (item.tierMult‖1))`; equipped targets also gear-lock (threat.js). Mints one `polished_<elem>` per real element, strips the blob (weapons reset `tier→common`, clear `isVolatile`), rebuilds the display name from the label mirrors. Denies silently. The **amulet is NOT a target**: its Extract button never renders (the list filters on `s.item.gearBase`, which amulets lack — dead code, per the trust-posture note below), so no server support is built for the dormant flow. |
| S→C | `player_state` | `coins`, `lifeSkills.gems`, the stripped `weapon`/`rangedWeapon`/`staffWeapon`/`shield`/`weaponStash` | the only echo — **no new server-emitted event type**, `PRIVILEGED_EVENTS` untouched |
| S→C | `state_sync` | `caps.gemExtract: true` | deploy-order gate (rule 19). Narrow flag, NOT reused: a v2.3.1192/1198 worker advertises `amuletForge`/`gems` but denies the unknown `extract` op, which would strip the client's gear locally and echo-restore it (the caps.gems lesson, TRAPS #9). |

Cost parity note: ForgePanel calls `gemExtractCost(item)` with NO
tier-table args, so its live cost is `ceil(base × (item.tierMult‖1))`
(the BLACKSMITH/WOODWORKING fallbacks in that fn are always undefined
at those call sites — an amulet, with no `tierMult`, pays the flat
base). `_gemExtractCost` mirrors that exactly so the coin gate matches
the button the player tapped. Data mirrors (pinned by mirror-audit
§8e): `GEM_EXTRACT_BASE_COST`, and the `BLACKSMITH_TIER_LABELS` /
`WOODWORKING_TIER_LABELS` / `WEAPON_TYPE_LABELS` name-rebuild tables
(compact server side tables mirroring the client tier/weapon `.label`
fields — the client wholesale-replaces the blob name from the echo, so
a drifted label would flip every extracted item's name).

### Residuals (still client-side, documented)

- **Shield/weapon gem-slot consumption** (EnchantPanel non-amulet
  slots): client-local consume, echo restores the gem. Non-flame gem
  bonuses are client-side point-of-use effects (v2.3.1139 posture), so
  the server has nothing to validate yet; migrate alongside the slots'
  stat migration.

## Trust posture / deliberately still client-side

- **Polished-gem economy**: ~~raw gem drops and GemcutPanel polishing
  are still client-local mutations of the opaque `lifeSkills` blob~~ —
  MIGRATED v2.3.1198, see "Gem income" above.  The `gem` op's
  deny-by-default consume stands, and now sees legitimately-earned
  gems.
- **First-connect amulet bootstrap** (`_sanitizeAmulet` ingestion of
  `rpgAmulet`) stays as the legacy-player migration path.  Residual: a
  FRESH identity can still bootstrap a legit-shaped amulet once, for
  free — but it starts with a fresh identity's nothing-else, and every
  established identity's amulet is now server-minted (stored wins on
  reconnect).  Dropping the bootstrap entirely would wipe legit legacy
  players' amulets; owner call, not taken here.
- **Amulet extract/salvage** (ForgePanel): DEAD CODE client-side — the
  salvage list filters on `s.item.gearBase`, which amulets don't have,
  so the amulet branch is unreachable.  No server support built for a
  dormant flow (CLAUDE.md dormant-content rule); if the client ever
  fixes the filter, add `op:'extract'`/`op:'salvage'` here first.
- Non-flame gem stat bonuses remain client-side point-of-use effects
  (v2.3.1139 posture unchanged).
