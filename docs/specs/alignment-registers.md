# Alignment Registers — moral-progression foundation (v2.3.1218)

## What this is

The first slice of BroTown's moral-progression system: four independent
**alignment registers** a player accrues by choosing a **path** at each NPC
chain's **capstone** quest, plus the pure resolvers that eventually decide the
five endings. Shipped alongside the first re-introduced NPC, **Mayor Bro**,
whose capstone (`mayor_3`) is the first place a choice can be made.

This is deliberately a foundation: the endings themselves fire at the far-off
True Guardian achievement (not built), but the counters + resolver are shipped
and test-locked now so the endings drop on unchanged later.

## The four registers

`responsible`, `mischievous`, `cool`, `ruthless` — "voice categories, not moral
categories" (design: none is good/bad, none is ranked). Source: `gdd.md`
§33.3–33.4 (data model), §25.1 (capstone branches), §53.4 (endings);
`creative-reference.md` §0.1 (register voices), §8.9 (endings).

> **Doc-trust note:** `gdd.md` is marked stale by `CLAUDE.md`. It is trusted here
> only for the *content/data model*. Its "save alignment to localStorage"
> instruction is **overridden** by the architecture rule that the server is
> authoritative for quest progress — the counters are written server-side.

## Data model

Per-player persistent state, stored on the rpg blob under `_alignment`:

```js
_alignment = {
  responsibleCount, mischievousCount, coolCount, ruthlessCount, // ints 0..8
  choices: {},        // { questId: '<register>' } — permanent per chain (null-proto map)
  titlesEarned: [],   // path titles awarded (cap 16)
}
```

- **counterKey** for a path is `<path>Count`.
- `dominantRegister(a)` — pure: `'untested'` (all zero), a single strict-max
  register, or `'balanced'` on any top-tie.
- `resolveEnding(a)` — pure: `null` when untested; `hero | trickster | arbiter |
  sovereign` for a strict-max register; **`weaver`** on ANY top-tie (2/3/4-way,
  incl. 1/1/1/1). Strict-max rule, deliberately no tiebreaker (`gdd.md` §33.4).

Pure module: `server/src/alignment.js` (`REGISTERS`, `REGISTER_ENDING`,
`isRegister`, `counterKeyFor`, `defaultAlignment`, `sanitizeAlignment`,
`dominantRegister`, `resolveEnding`, `REGISTER_COUNT_CAP`).

## Capstone quests

A capstone is a quest whose `QUEST_REWARDS` entry carries a `capstone` branch
table (server) mirrored by a `capstone.branches` array (client `QUEST_CHAINS`).
Mayor Bro's `mayor_3`:

| path          | register    | title      |
|---------------|-------------|------------|
| `responsible` | Responsible | Protector  |
| `mischievous` | Mischievous | Jester     |
| `cool`        | Cool        | Uninvolved |
| `ruthless`    | Ruthless    | Lone Wolf  |

gold/xp are identical across paths — no path is mechanically better (design:
none ranked). The base `check` (cleared a dungeon) still gates turn-in; the path
records *how*. Per-branch conditions (no-death / emote / solo) are self-reported
flavour for now; enforcing them server-side is future scope. Aura rewards
(Protector +party XP, Lone Wolf +solo XP) are also future scope — no aura system
is wired yet.

## Server flow (authoritative)

`quests.js` `_handleQuestTurnIn`:
1. Existing gates: reward exists (own-property guard vs `__proto__` keys), quest
   is `active`, declarative objective (if any) met.
2. **Capstone gate:** if `reward.capstone`, require a legal `path`
   (`isRegister(path)` + own-property on the branch table) that is **not already
   recorded** in `_alignment.choices[questId]` (permanent per chain). Reject and
   pay nothing otherwise — the quest stays active.
3. After paying the base reward, increment `_alignment[<path>Count]` (capped),
   set `choices[questId] = path`, push the branch title.

The server is the **sole writer** of the counters (they gate titles + endings).
Persistence: `_alignment` is in the `_saveRpg` fixed field list (rule 1),
sanitized on save; echoed in `_sendPlayerState`; restored in `join.js` (stored
branch → `sanitizeAlignment`; fresh connect → `defaultAlignment`, never trusting
a client-supplied count).

No new wire event type — `quest_turn_in` (already client→server) just gained an
optional `path` field, so no `PRIVILEGED_EVENTS` change.

**Deploy-order gate (rule 19):** the worker advertises `caps.questCapstone: true`
in `state_sync` (`join.js`). The client only offers the capstone choice when that
flag is present. Against an old worker (no capstone gate) the `path` would be
ignored, the quest marked `turnedIn`, the reward paid, but no register recorded —
and since the quest can never be re-turned-in, the player's one-per-chain moral
choice would be silently burned. So the client holds the choice back ("check back
after the update") until a capable worker is live. `caps-audit.test.mjs` enforces
the advertise↔read pairing.

## Client flow

- `QuestPanel.jsx` renders the four register-flavoured branch buttons instead of
  the single "Turn In Quest" button when the active, completable quest has a
  `capstone`.
- `game/quests.js` `turnInQuest(S, questPanel, deps, path)` threads the chosen
  `path` onto the `quest_turn_in` payload and mirrors the choice optimistically
  onto `R._alignment` (permanent-per-chain guarded); the authoritative counts
  arrive via the `player_state` echo, adopted in `wsClient.js` next to `_quests`.
- A "Title earned" popup is the immediate payoff.

The persistent alignment/title surface (inspect card, reveal-gated chrome per
`gdd.md` §0.2) is the next slice — this PR ships the choice + the counters only.

## Tests

`server/test/alignment.test.mjs` (wired into `npm test`):
- Pure: `dominantRegister`/`resolveEnding` across untested, each strict-max, and
  every Weaver-tie shape (2/3/4-way, 1/1/1/1); `sanitizeAlignment` clamping.
- Integration: capstone turn-in increments the right counter, records the
  permanent choice, awards the title, pays base gold; replay + re-pick rejected;
  missing/invalid path pays nothing and leaves the quest active; save→load
  round-trip carries `_alignment`.

The existing `quests.test.mjs` still passes (the shared handler gained the
capstone branch without changing non-capstone behaviour).

## Adding the next NPC / capstone

1. Add the NPC actor to `NPC_DATA` (`src/data/gameDisplay.js`) — `name` MUST equal
   `QUEST_CHAINS[*].npc`.
2. Give its final chain quest a `capstone` in BOTH `server/src/data.js`
   `QUEST_REWARDS` and client `QUEST_CHAINS` (paths must match register keys).
3. No handler change needed — the capstone gate is generic over `reward.capstone`.
