# Conformance audit rail (v2.3.1151)

Two test-only suites that turn the codebase's two memory-enforced
conventions into CI-enforced walls. The only product change in this PR is
`export`ing `PRIVILEGED_EVENTS` from `server/src/index.js` so the audit
can import it.

Both suites failed-loudly-verified at ship time (a planted canary
emission / a perturbed vendor price each produced exactly one FAIL).

## 1. Wire audit — `server/test/wire-audit.test.mjs`

**The rule it enforces (handoff rule 13):** every server-emitted event
type must be in `PRIVILEGED_EVENTS`, or any client can forge it through
the default-branch rebroadcast in `webSocketMessage`. This rule failed
silently at least once — `monster_transform` shipped server-emitted around
v2.3.856 and wasn't deny-listed until v2.3.1147.

**How it extracts:** reads every `server/src/*.js` EXCEPT `data.js`
(whose `type: 'kill'` etc. are quest-objective *data* with zero emission
sites) and applies two regexes per line:

- **A** `\btype:\s*'([a-z_0-9]+)'` — object-literal emissions
  (`ws.send`, `broadcastAll`, `eventBuffer.push`, and the
  `_dungeonSend`/`_hardenSend` wrappers that take a whole
  `{type, payload}` object).
- **B** `_[A-Za-z0-9]+Send\([^,)]+,\s*'([a-z_0-9]+)'` — the send-helper
  family that takes the type as its second argument (`_threatSend`,
  `_t2Send`, `_guildSend`, `_petSend`).

**Asserts:**
1. ≥ 40 types extracted — the regex-rot floor. If someone renames the
   helpers or switches quote style, extraction collapses and this fails
   loudly instead of the audit passing vacuously (63 types at ship time).
2. Every extracted type ∈ `PRIVILEGED_EVENTS` ∪ allowlist. **The audit.**
3. No dead `PRIVILEGED_EVENTS` entries (each is emitted somewhere).
4. Allowlist ∩ `PRIVILEGED_EVENTS` = ∅ (privileging a relay type breaks
   the live client relay it documents).
5. No stale allowlist entries.

**RELAY_ECHO_ALLOWLIST** — server-emitted types that are deliberately NOT
privileged because each is also a legitimate client→client relay half;
deny-listing would break the handshake:

| Type | Why |
|---|---|
| `player_respawned` | clients broadcast it to clear peers' corpse sprites; forgery is purely visual |
| `duel_decline` | client declines relay through it; server also synthesizes both halves on cancel |
| `trade_reject` | client rejects relay; server also emits it as its validation-failure answer |
| `clan_war_declare` | server echoes the declare in the shape the client relay already renders |

Grow the allowlist only when a new server emission must mirror an
existing client relay — prefer fresh server-only type names.

**When it fails on your PR:** you emitted a new type without registering
it. Add it to `PRIVILEGED_EVENTS` in `server/src/index.js` with a
version-tagged comment. That is almost always the right fix — the
allowlist is the exception, not the escape hatch.

## 2. Mirror audit — `server/test/mirror-audit.test.mjs`

**The rule it enforces:** the "keep in sync with the client" obligations
listed at the top of `server/src/data.js`. Drift is invisible until
damage prediction desyncs or a vendor charges the wrong price (the sky
spawn-table drift fixed in v2.3.1147 motivated making this mechanical).

Imports both sides directly (all client data modules are plain-node
importable) and compares **load-bearing fields only** — server fields are
the authoritative subset; client entries may carry extra presentation
(label/color/desc) that is not compared.

Covered: `ARCHETYPES` (hp/dmg/spd mults), `MONSTER_HP_CURVE` (exact),
`FISH_TIERS` (lvl + lowercased name), `COOKING_RECIPES` (per-index — the
wire sends recipe indexes), `QUEST_REWARDS`↔`QUEST_CHAINS` (gold/xp/next,
both directions), `BLACKSMITH_TIERS`/`WOODWORKING_TIERS` (key order +
every server field), `GUILD_SKILLS`↔`SKILL_GUILDS` keys, `GUILD_QUESTS`
(per-index — the index is the `guild_claims` ladder; never reorder),
`QUALITY_GRADES`↔`QUALITY_MULTS`, `AMULET_TIER_POWER`↔`AMULET_TIERS`
basePower, `RARITY_TIERS` mults, `ZONE_VARIANT_MAP`↔
`_variantForArchInZone`, variant speeds↔`_variantSpeed`, and
`SHOP_ITEMS`↔the VendorPanel item array (regex extraction from
`src/ui/panels/buildings/VendorPanel.jsx`, hard-failing if extraction
finds nothing).

**Not here:** the `ZONES` level-band/spawn lockstep lives in
`test/tick.test.mjs` (its depth-lerp checks already import both sides).

**Self-pruning exemptions** — each documented divergence *asserts the
divergence still exists*, so closing it server-side makes the exemption
fail and forces its deletion instead of letting it rot:

| Exemption | Divergence |
|---|---|
| `tidal.brute`, `hollows.brute` | client maps them to fishman/rockmonster; server has no entry (legacy zones predate server-side variant resolution) |
| `fishman`, `rockmonster` speeds | client cfg says 0.5; server has no entry so they move at brute base 0.35 — left alone to preserve shipped feel |

**How to add a new mirrored table:** put the server copy in
`server/src/data.js` with a `<->` pointer comment, add a numbered section
to mirror-audit comparing the server's load-bearing fields, and if the
client side is inline JSX rather than a data module, extract by regex
with a non-zero floor check (the VendorPanel pattern).
