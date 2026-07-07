# Server Amulet Forge — v2.3.1192 (handoff item I follow-up)

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

## Trust posture / deliberately still client-side

- **Polished-gem economy**: raw gem drops (client-rolled at 35%/harvest
  and on kills into `lifeSkills.gems`) and GemcutPanel polishing are
  still client-local mutations of the opaque `lifeSkills` blob.  The
  server's `gems` map is whatever the join bootstrap captured, so the
  `gem` op's deny-by-default consume can deny a legitimately-polished
  gem the server never saw.  Accepted: the alternative (trust the
  claim) re-opens a free-gem forge.  Migrating gem income server-side
  is the natural successor slice — it would also fix the pre-existing
  lifeSkills-echo stomp of client-earned gems.
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
