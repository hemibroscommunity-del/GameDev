# Conformance audit rail (v2.3.1151; +2 audits v2.3.1203)

Test-only suites that turn the codebase's memory-enforced conventions
into CI-enforced walls. v2.3.1151 shipped the wire + mirror audits (the
only product change was `export`ing `PRIVILEGED_EVENTS` from
`server/src/index.js` so the audit can import it); v2.3.1203 added the
caps and opId audits on the same pattern.

All suites failed-loudly-verified at ship time (a planted canary
emission / a perturbed vendor price / a fake advertised caps flag / an
opId-less `_creditPlayer` call each produced exactly one FAIL).

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

## 3. Caps audit — `server/test/caps-audit.test.mjs` (v2.3.1203)

**The rule it enforces (handoff rule 19 / deploy-order safety):** every
capability flag the server advertises in the join.js `state_sync`
`caps: {...}` literal must be gated on client-side via `_serverCaps`,
and every client `_serverCaps` gate must read a flag the server
actually advertises. An advertised-but-unread flag is a gate that gates
nothing (and misleads the next legacy-path cleanup); a
read-but-unadvertised flag leaves its feature stuck on the legacy path
against every worker.

**How it extracts:**

- Server side: the `name: true` pairs on the single-line `caps: {`
  literal in `server/src/join.js`. The trailing `..._liveFlags` spread
  is **runtime** operator live-ops state (docs/specs/liveops.md) and
  deliberately out of static-audit scope.
- Client side: `_serverCaps.<flag>` / `_serverCaps?.<flag>` /
  `_serverCaps['flag']` reads across `src/**/*.{js,jsx}`. The lone
  write site (`S._serverCaps = msg.caps` in wsClient.js) has no member
  access, so extraction skips it naturally.

**Asserts:** ≥20 advertised flags and ≥30 client gate sites (the
regex-rot floors; 21 flags / 39 sites at ship time); every advertised
flag referenced or allowlisted; every referenced flag advertised; no
stale allowlist entries; no allowlist entry that has grown a real gate.

**CAPS_ALLOWLIST:**

| Flag | Why |
|---|---|
| `httpAuth` | handshake negotiation field, not a feature gate — the client SENDS `httpAuth: true` in join (wsClient.js) rather than reading it from caps |

**When it fails on your PR:** you added a caps flag without a client
gate (add the `_serverCaps.<flag>` check the flag exists for), or a
client gate on a flag the server never advertises (add it to the
join.js caps literal with a version-tagged WHY comment).

## 4. opId audit — `server/test/opid-audit.test.mjs` (v2.3.1203)

**The rule it enforces (handoff opId idempotency):** every
`_creditPlayer` call must carry a DETERMINISTIC opId — a single-quoted
namespace literal prefix derived from the operation's own ids
(`'duelpot:' + duel.id`), so a DO-restart or lazy-resolve retry
converges as `'dup'` instead of paying twice. A random or missing opId
tests green and double-pays in production on the first retry.

**How it extracts:** every `this._creditPlayer(` call site in
`server/src/*.js` (the definition in inbox.js has no `this.` and is
skipped naturally; tests live outside src/). Each site is judged on a
short forward window (the entry object spans lines in cadence.js /
clans.js), truncated at the next call site so back-to-back credits
can't lend each other an opId. The first `opId:` must match
`opId:\s*'[a-z0-9_]+:` — a quoted literal opening with a namespace and
colon, optionally concatenated with ids.

**Asserts:** ≥20 call sites (rot floor; 24 at ship time); every site
carries a literal-prefix opId or its file is allowlisted; no stale
allowlist entries (each excused file still contains a non-literal
site).

**OPID_ALLOWLIST:**

| File | Why |
|---|---|
| `admin.js` | operator-supplied opId from the admin HTTP request, logged in `admin_log` — the operator (or the `admin:<uuid>` fallback echoed back for retry) owns determinism, not a source literal |

**When it fails on your PR:** your new credit path lacks a
deterministic opId. Build one from the operation's own stable ids
(order id, duel id, period key) with a fresh namespace prefix — never
`crypto.randomUUID()` and never a timestamp.
