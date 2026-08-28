# Event Capes + Merch Draw — build brief

**v2.3.1950** — written for a parallel session picking this up cold.
Everything below was verified against the tree at `origin/main` (high-water
v2.3.1949) on 2026-08-27; file:line references are real, not remembered.

Implementers: claim your own tag above this one, and renumber before merge
if a parallel session beat you to it.

---

## 1. What this is for

Two live events, one day apart.

| | Today (Thu 27 Aug) | Tomorrow (Fri 28 Aug) |
|---|---|---|
| Who | HAIRForce reviewers (small, invited) | Public demo (open) |
| Time | 17:00 UTC / 10:00 PT | 15:00 UTC / 08:00 PT |
| Prizes | 100k HAIR (best review) + 3 capes | 3 OG capes + Hemi merch |

Capes are earned in **two steps**: a Golden Ticket drops from a monster,
and the player **opens the ticket in their inventory** to redeem it for the
cape. Three tickets exist per event, one per account. Merch is a **random
draw** among players who hit a level bar.

The two-step is the point — the drop is the moment, the open is the reward.
Do not collapse it into a direct cape drop.

Owner decision (2026-08-27): the ticket→cape flow ships before the events
run; the session time moves if it has to. Nothing here is to be awarded
manually.

---

## 2. The cape system is dormant — read this first

`src/data/gameSystems.js` defines `ANNIVERSARY_ITEMS` and a
`checkAnniversaryDrop(rpg)` helper. **`checkAnniversaryDrop` is never
called.** Grep of `src/` and `server/src/` returns the definition and
nothing else. No code path awards a cape today.

This is the dormant-content case CLAUDE.md warns about. Do not treat the
existing helper as working machinery to hook into — treat it as a sketch.

The existing item:

```js
{ id: 'og_bro_cape', year: 1, name: 'OG Bro Cape', emoji: '🏴',
  colors: { primary:'#1a1a1a', accent:'#d4a030',
            trim:'#f5c542', glow:'rgba(212,160,48,.3)' },
  type: 'cape', rarity: 'legendary',
  dropMonth: null, dropDay: null }
```

`checkAnniversaryDrop`'s date gate is inert (`dropMonth`/`dropDay` are
`null`) and its Year-1 branch returns the cape for anyone who lacks it —
but since nothing calls it, that branch has never run in production.

---

## 3. Part A — cape identity on the wire

### The problem

`src/ui/BroTown.jsx:5614` broadcasts cape state as a **single boolean**:

```js
cape: rpg?._anniversaryItems?.find(a => a.type === 'cape') ? true : false
```

Any item of `type:'cape'` produces the same `true`. There is no cape id on
the wire, so **every cape renders identically**.

That breaks the two-tier plan directly: the HAIRForce reviewer cape and
tomorrow's OG cape would be the same cape on screen, and the two groups
meet in town.

### The fix

Carry the cape **id** instead of a boolean, and have the renderer read that
item's `colors` block. The palettes are already in the item definitions —
only the plumbing is missing.

- Keep the boolean working for old clients (see deploy-order safety below),
  or gate the id behind a caps flag and let old clients fall back to the
  single default cape.
- Add a second cape entry to `ANNIVERSARY_ITEMS` for the reviewer tier with
  its own `colors`. Distinct enough to read at sprite size — palette-swapped
  trim alone will not be legible on a phone.

### If art ships with this

**Animation preloading is LAW** (CLAUDE.md, owner directive 2026-07-19).
Any new cape animation or sprite strip must register in the central
manifest `preloadWorldAnimations()` (`src/rendering/preloadAnimations.js`)
**in the same PR**. Lazy `ensure*Loaded` guards or ctor-kicked unawaited
`Assets.load` are bugs, not shortcuts. Capes are global (not zone-specific)
so they go in the global manifest, not `preloadZoneAssets`.

---

## 4. Part B — ticket drop + cape redemption (server)

Read `docs/ARCHITECTURE-HANDOFF.md` before touching `server/`. It is
load-bearing and the conventions below come from it.

### The flow

```
monster kill → server rolls ticket → ticket lands in inventory
            → player taps "Open" in the bag
            → client sends redeem → server consumes ticket, grants cape
            → player_state echo → cape renders
```

### Step 1 — the ticket drop

- Server-rolled on a monster kill. **Never client-decided** — the server is
  authoritative for all loot.
- The ticket is an ordinary **inventory item** (an `inventory` key), so it
  persists, survives disconnect, and shows in the bag with no new storage.
- **One per account**: refuse if the player already holds a ticket or has
  already redeemed one.
- **Three in existence per event**: a persistent grant ledger, checked and
  incremented in the same DO turn as the award. The DO is single-threaded,
  so a read-modify-write inside one turn is safe — do not split it across
  an `await` boundary that could interleave.
- Tune the rate against the **event window**, not against forever. Scarcity
  is guaranteed by the cap of three; a rate so low that nobody finds one
  during the session means the announced hook never lands.

### Step 2 — the redemption

**Follow `_handleEatRequest` (`server/src/cooking.js:57`).** It is the
closest existing pattern and the shape is identical: validate ownership,
consume one, persist, echo. Read it before writing the handler.

```
_handleTicketRedeem(session, payload):
  guard session / dying / dead / disconnected
  verify ps.inventory holds the ticket   ← ownership check
  verify the cape is not already in ps._anniversaryItems
  consume the ticket (decrement, delete at 0)
  push the cape into ps._anniversaryItems
  this._saveRpg(session.id, ps)
  this._sendPlayerState(ws, session.id)
```

### The bug this flow invites — read `cooking.js:71`

The firemaking incident (v2.3.1702) is the exact failure mode waiting here.
The client deleted a log locally, sent **nothing**, the worker still held
the log, and its next `player_state` echo — inventory rides every one —
handed it straight back. One log lit unlimited campfires.

A ticket "opened" client-side with no server message does the same thing:
the player keeps the ticket and can redeem it again. That is how three
tickets become five capes, in public, during the event.

**The client must never grant the cape or delete the ticket on its own.**
It sends the redeem and waits for the echo. Everything else is the server's.

### Conventions this must satisfy

1. **Storage key** — the grant ledger needs a new prefix (suggest
   `capegrant:<capeId>` holding the grantee list, so the count and the
   winners are one record). It **must** be added to the rule-2 registry
   table in `docs/ARCHITECTURE-HANDOFF.md` (~line 52) **in the same PR** —
   `tools/dev/precheck.mjs` parses that table and fails the push otherwise.

2. **Client→server type** — the redeem is a new inbound type. Precheck
   enforces that every client→server message type has a `channelShim`
   passthrough case (`src/networking/wsClient.js:2586`); the shim is an
   **allowlist**, and a type with no case there is silently dropped. Add
   the case in the same PR. Route it in the `index.js` switch alongside
   `case 'eat_request':` (`server/src/index.js:4078`).

3. **Privileged event** — any new server-emitted type must be added to
   `PRIVILEGED_EVENTS` (`server/src/index.js:261`) or clients can forge it.

4. **Caps flag** — add one (e.g. `eventCapes`) to the `caps` object at
   `server/src/join.js:964`. Deploy-order safety, rule 19: old client + new
   worker and new client + old worker must both work. An old client must
   simply never send the redeem rather than sending something the worker
   relays as an unknown broadcast.

5. **Proto-safety** — any map keyed by a client-supplied id must be
   `Object.create(null)` or a `Map`. Plain `{}` silently no-ops on
   `'__proto__'`. This bit the repo three times in one day (v2.3.1175,
   v2.3.1185, v2.3.1192). Note `_handleEatRequest` guards this by
   validating the key prefix before touching `ps.inventory` — do the same.

6. **opId idempotency** — the redeem is economy-settlement-shaped. Follow
   the `oplog:<opId>` pattern so a retried redeem cannot grant twice.

7. **Tests** — `cd server && npm test`. Add a suite or extend the nearest.
   Cover at minimum: ticket drop respects the global cap of three; a second
   ticket is refused for an account that has one; redeem consumes the ticket
   and grants exactly one cape; a replayed redeem grants nothing; a redeem
   from a player who holds no ticket is refused.

### Conventions this must satisfy

1. **Storage key** — the grant ledger needs a new prefix (suggest
   `capegrant:<capeId>` holding the grantee list, so the count and the
   winners are one record). It **must** be added to the rule-2 registry
   table in `docs/ARCHITECTURE-HANDOFF.md` (~line 52) **in the same PR** —
   `tools/dev/precheck.mjs` parses that table and fails the push otherwise.

2. **Privileged event** — any new server-emitted type (e.g. `cape_drop`)
   must be added to `PRIVILEGED_EVENTS` (`server/src/index.js:261`) or
   clients can forge it.

3. **Caps flag** — add one (e.g. `eventCapes`) to the `caps` object at
   `server/src/join.js:964`. The client gates its new path on it. Deploy-order
   safety, rule 19: old client + new worker and new client + old worker must
   both work.

4. **Proto-safety** — any map keyed by a client-supplied id must be
   `Object.create(null)` or a `Map`. Plain `{}` silently no-ops on
   `'__proto__'`. This bit the repo three times in one day (v2.3.1175,
   v2.3.1185, v2.3.1192).

5. **opId idempotency** — grants are economy-settlement-shaped. Follow the
   `oplog:<opId>` pattern so a retry cannot double-award.

6. **Tests** — `cd server && npm test`. Add a suite or extend the nearest.
   Cover at minimum: one-per-account refusal, the global cap of three, and
   a retry not double-granting.

---

## 5. Part C — the merch draw tool

### What the leaderboard gives you

`server/src/leaderboard.js`. Rows are written by
`POST /api/leaderboard/update` under `player:<playerId>`:

```
{ id, name, color, level, lifeTotal, ap, kills, dungeons,
  goldEarned, playtime, clanTag, lastSeen, series }
```

Read via `GET /api/leaderboard/top?category=<cat>&limit=<n>`.

Two constraints that shape the design:

- **`limit` is capped at 100.** Above 100 turnout the query truncates to the
  top 100 by category, which silently converts a random draw into a skill
  contest. Under 100 it is a non-issue.
- **`getTop` applies a 7-day staleness filter** (`leaderboard.js:51`).
  Fine for a same-day draw.

**Quest completion is not a leaderboard field.** Gate eligibility on
`level`, which is present, rather than "finished the quest line", which
cannot be enumerated from this data.

### The draw

1. Announce the bar **before** anyone plays: *"Reach Level 5 during the demo
   and you're entered."* Pick the number so it takes ~15–20 min.
2. After the session, pull the level board; keep rows with `lastSeen` inside
   the event window and `level >= threshold`. That is the entry list.
3. **Publish the numbered list** (bro names, 1..N). This is the commitment —
   it locks before any randomness exists.
4. Name a **future Bitcoin block height**, ~30–60 min out.
5. When it lands: `hash mod N` → winner index. For k winners, walk to the
   next distinct index.

Modulo bias over a 256-bit hash with small N is negligible; do not
over-engineer it.

### Why a Bitcoin block

"We drew randomly, trust us" is worth little to this audience. A future
block hash cannot be known by anyone — including the organiser — when the
entry list is published, and any block explorer verifies the result
afterward. Hemi is a Bitcoin L2, so it reads as on-brand rather than
arbitrary.

### The tool

`public/tools/draw.html`, following the existing one-page pattern
(`public/tools/anchor.html`, `weapon-anchor.html`,
`public/deploy-scores.html`).

- Fetches the leaderboard from the API base, filters by level + time window.
- Renders the numbered entry list (copy-pasteable for the announcement).
- Takes a pasted block hash, computes the index, **shows the arithmetic** so
  a viewer can check it by hand.
- Supports k winners.
- Static, no secrets, no build step. Independent of the cape work — different
  files, no merge conflict.

---

## 6. Repo protocol (from CLAUDE.md / session brief)

- **One system per PR.** Cape wiring, drop mechanic, and draw tool are three
  PRs, not one.
- Claim a `v2.3.N` tag **above** the high-water (1949 at time of writing) and
  tag every change with it. Parallel sessions get the same suggestion —
  check in-flight `claude/*` branches and renumber before merge.
- Run `node tools/dev/precheck.mjs` **before every push**. It gates syntax,
  duplicate switch cases, tag collisions, the storage-key registry, and the
  server suite.
- `npm install` works in this sandbox. Client changes can be smoke-tested:
  `npm run build && npx vite preview --port 4173`, then drive it with
  `playwright-core` against the Chromium at `/opt/pw-browsers`. The open
  internet is not reachable (`*.pages.dev` is proxy-denied) — test localhost.
- Comment tags carry the version and the **why**, matching surrounding style.
- Both protocol v1 and v2 must keep working.

---

## 7. Open decisions — not for the implementer to guess

- **Is the ticket tradeable?** It is an inventory item, so unless it is
  excluded from the marketplace and from trade it can be sold. That may be
  desirable (a Golden Ticket with a market price is a story) or a disaster
  (a reviewer's prize bought by a whale). `ANNIVERSARY_ITEMS` calls capes
  "discontinued **tradeable** cosmetics", so the precedent leans tradeable —
  but the cape and the ticket can differ. Decide before launch; retrofitting
  a ban after someone has sold one is ugly.
- **Does an unopened ticket expire?** If a winner never opens it, is that
  cape burned or reclaimed?
- **Level threshold** for draw eligibility.
- **How many merch winners.** Rick401's offer ("happy to help on that end")
  is an offer, not a confirmed quantity. Merch must not appear in any
  announcement until he confirms count and who ships. International shipping
  is where these quietly die.
- **Reviewer cape name + palette.**
- **Whether both tiers ship tomorrow** or the reviewer cape waits for the
  wire work to land properly.

## 8. Messaging constraint

If both events award capes, the copy must say **"only 3 from this session"**,
not "only 3 will ever exist". Otherwise today's three winners watch three
more appear tomorrow and the word stops meaning anything.
