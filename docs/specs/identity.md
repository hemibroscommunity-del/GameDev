# Persistent Identity (v2.3.1116) — spec + attach points

PR1 of the heavy-systems architecture plan. Silent passphrase identity:
every browser gets a stable player id that survives reloads, so the
server's per-player storage (`rpg:<id>`) finally accumulates instead of
orphaning on every page load. Also ships the PvP lawless-zone consent
gate (the prerequisite safety fix for the PR6 duel machine).

## How identity works

1. **First boot**: the client silently generates a 4-word passphrase
   (`generatePassphrase()`, `src/networking/index.js`), stores it in
   `localStorage.bt_passphrase`, and derives the player id from it
   (`passphraseToId()` → `bp_...`). No login UI; zero friction.
2. **Every join**: the client sends `{ id, phrase }` in the `join`
   message (`src/networking/wsClient.js`). The phrase rides the wss
   connection only — it is never broadcast.
3. **Magic-id gate** (v2.3.1202, `_handleJoin`, `server/src/join.js`):
   a join id that is exactly `__proto__`, `constructor`, or `prototype`
   is rejected outright (`join_rejected` reason `auth` + close `4003`)
   BEFORE the auth verify below, so a magic id can never mint an
   `auth:<id>` storage record either. The join id keys plain-object maps
   across the room (`playerState`, `stateHistory`, `extractions`,
   per-monster `dmgByPlayer`) and `__proto__` would write through
   `Object.prototype` — the bug family fixed three times downstream
   (duel.away v2.3.1175, party meta v2.3.1185, amulet tiers v2.3.1192).
   Those four maps are also `Object.create(null)` as of v2.3.1202
   (defense-in-depth); the gate protects the plain-object maps nobody
   audited yet. No real client generates these names (`bp_` ids /
   legacy randoms), so `reason: 'auth'` — which makes the client
   regenerate its passphrase once — is the correct client behavior.
   Legacy phraseless joins on ordinary ids are unaffected.
4. **Server verify** (`_verifyJoinAuth`, `server/src/index.js`), BEFORE
   the same-id session eviction:
   - `auth:<id>` storage record exists → the phrase must SHA-256-match
     (`btv1|<phrase>` domain-separated). Mismatch or missing phrase →
     `join_rejected` + socket close `4003`; the existing session and
     player state are untouched.
   - No record → join allowed; if a phrase was provided, the record is
     stamped (first join locks the id). Phraseless joins (legacy/v1
     clients, `?guest=1` tabs) stay allowed as unregistered throwaways —
     this is the deploy-order safety property.
   - Brute-force lockout: 5 failed verifies on an id → 60s lockout
     (in-memory, per-GameRoom).
5. **Client `join_rejected` handler**: regenerates the passphrase ONCE
   (also self-heals the rare 31-bit id collision) and lets the normal
   reconnect rejoin under the new identity; a second rejection stops and
   logs.

The `auth:<id>` record lives in its own storage key on purpose:
`_saveRpg` rewrites the rpg blob from a fixed field list and would drop
any foreign field. Follow this rule for all future per-player metadata
(inbox, escrow journal, duel wagers).

## PvP consent gate

> **⚠ Partially superseded (v2.3.1121):** the duel half of this section
> describes the PR1 interim observer. Duel consent now lives in the duel
> machine (`server/src/duel.js`, spec `docs/specs/duels.md`) — the
> observer described below handles ONLY the threat handshake
> (`pvp_threat`/`threat_response`). The lawless-zone gate and
> fail-closed default are unchanged and still live here.

`_resolvePvPAttack` now skips any target unless:

- the zone has `lawless: true` in `server/src/data.js` ZONES (all nine
  wilderness zones are flagged, preserving shipped free-fire behavior;
  town/farm_home/unknown zones fail CLOSED — this kills unconsented town
  ganking with death-pile drops), or
- the attacker↔target pair holds a live consent: the server observed
  `duel_request` (A→B) then `duel_accept` (B→A) — or `pvp_threat` +
  accepted `threat_response` — each half arriving on its own sender's
  session, so neither side can forge the other's. Consent lasts 10 min
  and clears on death or disconnect.

This is the interim machine; PR6 replaces it with a real duel state
machine (wagers, no-drop deaths, reconnect grace).

## Wire surface (for future UI)

| Message | Direction | Payload | Notes |
|---|---|---|---|
| `join` | c→s | `{ id, phrase?, name, data, protocolVersion }` | `phrase` only for `bp_` ids |
| `join_rejected` | s→c | `{ reason: 'auth' }` | followed by close code 4003 |

Client knobs:

- `?guest=1` — throwaway random id for this tab (test multiplayer with
  two tabs in one browser; two tabs on the same identity evict each
  other by design — the second tab shows the "Play here instead" bar).
- The passphrase in `localStorage.bt_passphrase` IS the account
  credential. The "transfer to new device" UI shipped in v2.3.1143 as
  the **Login Key** account panel — see `docs/specs/account-login.md`
  (it pre-flight-validates the typed key server-side before switching,
  instead of the blind write+reload this bullet originally sketched).
  Losing it = losing the character; there is no server-side recovery by
  design (no PII).
- `MenuBar.jsx`'s reset path still removes `bt_passphrase`/`bt_rpg` —
  that is now "delete character", which is what an explicit reset means.

## The roster mirror (v2.3.2110)

The device's character roster (`src/networking/charRoster.js`) lives in
`localStorage`, which is **per origin** — and a Cloudflare Pages deploy
gives every build its own hostname (`<hash>.<project>.pages.dev`) beside
the project's stable one. So opening the newest build meant opening a
different origin: the roster read empty, the boot initialiser minted a
fresh passphrase, and the player was shown the login door.

Owner: *"People don't remember their key or know they have one. The
continue button should allow them to continue their character from
previous builds. Right now it shows empty each time an update is
pushed."*

`src/networking/rosterCookie.js` keeps a compact mirror of the roster in
a cookie scoped to the **registrable domain**, which every deploy
hostname of the same site shares. `localStorage` stays the working copy;
the cookie exists so a first read on a new origin has something to
restore from.

- **Domain**: found by probing (2 labels, then 3, then 4) and using the
  first the browser accepts — a public suffix like `pages.dev` fails the
  probe by definition, so no Public Suffix List is shipped, and the rule
  is self-correcting on a custom domain, on pages.dev and on localhost
  (host-only cookie, harmless).
- **Payload**: `{v, l:[{p,a,n,lv}], x:[phrase]}`, URL-encoded, capped at
  3400 bytes (tombstones shed first, then the oldest rows).
- **Tombstones** (`x`): a deleted phrase travels too, or the next build
  would restore the character just removed. A phrase that comes back
  (re-entered by key) drops out of them on the next write.
- **Writes**: `charRoster._write` is the single funnel, so no mutation
  can update one store and not the other. A device with a roster and no
  mirror backfills once per page load.
- **Boot**: `adoptSharedPhrase()` runs inside the `myId` initialiser,
  *before* a key is minted. If this origin has never had a roster and the
  mirror holds one, the most recent non-provisional character becomes the
  device's key and the player walks straight in. It returns null when a
  key is already held, when the origin has its own roster (an absent key
  there means the player *deleted* the active character and the door is
  correct), or when the only rows are provisional.
- **Cost, written down**: the phrase is the credential and a cookie is
  sent to the page host on every request, which `localStorage` is not.
  `Secure` + `SameSite=Lax` on https; the same phrase already crosses the
  wire to the worker on every join.
- **Limit**: this crosses hostnames of one site, not separate sites. A
  custom domain and `*.pages.dev` are different registrable domains and
  do not share the mirror — the Login Key is still the road between
  those.
- **Test**: `node tools/qa/roster-mirror.test.mjs` (zero-dependency, off
  the PR path) stubs the two stores with the property that matters — a
  fresh `localStorage` per origin, one shared cookie jar that enforces
  the public-suffix and host-scope rules.

## The empty-list bug (v2.3.2112)

Owner: *"I've been able to continue playing characters from earlier
builds before. The main site is always Brotown.net. I think all
characters are in local storage so can't they be retrieved from there?"*

They can, and they were not. `readRoster`'s migration treated the stored
list as authoritative whenever it **parsed** — and an empty array parses.
So the first read on a device whose `bt_player` had not landed yet
(a Login-Key sign-in, whose reload lands before anything is played; the
boot check's `ensureChar`; the login screen's own roster count) seeded
nothing, wrote `{"v":1,"list":[]}`, and every later read trusted it. The
character was never lost — `bt_passphrase` still named it and the boot
check still walked straight into it, which is why *continuing* kept
working — but Continue's list stayed empty for good.

- Only a **non-empty** stored list is an answer now; an empty one falls
  through and seeds again. The "already migrated" flag existed to stop a
  player who deleted everything being handed it back, and that job now
  belongs to the **tombstones** (v2.3.2110), which both seed roads
  honour. One bit was answering two questions.
- Evidence for seeding the active key widens: `bt_player` with a name
  gives a labelled row as before; failing that, a `bt_rpg` blob (saved
  progress — unmistakable evidence of play) gives a **provisional** row,
  which `CharacterPicker` finishes against the worker and drops if there
  is no character behind the key. A bare minted key with neither still
  seeds nothing.
- `rosterCookie._domainFor` memoizes on the **hostname**, not on a bare
  "probed" flag — a stale domain makes every write a silent no-op.
- Regression cases in `tools/qa/roster-mirror.test.mjs`.

**Scope, stated plainly**: before the roster shipped (v2.3.1923) a device
held at most **two** passphrases — `bt_passphrase` and one spare in
`bt_passphrase_prev`. So "all characters are in local storage" was never
true for characters made before that; at most two per device can be
recovered this way, and the rest were overwritten. And on iOS Safari,
ITP evicts all script-writable storage (localStorage **and** JS-set
cookies) after ~7 days without a visit — which no client-side store can
survive. The Login Key remains the only recovery across those two gaps.

## The list is the door (v2.3.2111)

Owner: *"Can you actually provide a list of characters like you did
before when people try to join the game and sort by highest level
character on top? People will probably have a bunch of them."*

- **Order** — `charRoster._sorted` is level-descending, last-played as
  the tiebreak, insertion order on a full tie. This **supersedes** the
  v2.3.1923 "most recent at the top". Level `0` means *unknown* (nobody
  has looked the row up) and sorts last; `CharacterPicker`'s lookup pass
  now asks for any row missing a name **or** a level, so an unknown row
  is placed after the one request it takes.
- **The picker opens itself** — `LoginScreen` mounts with the list open
  whenever `rosterCount() > 0`. Standing on that screen at all means the
  key this device holds has no character behind it (the boot check goes
  straight into the world when it does), so the three ways to be there —
  a restored origin, a logout, a delete of the active character — all
  want the list. Not while `bootPhase === 'checking'`: it opens on the
  checking→login edge, and only once, so tapping Back is respected.
  Create Character is one Back away.
- **Auto-adopt is now single-character only** — `adoptSharedPhrase`
  returns null when the mirror restores two or more, so the door (and
  the list) decides. One row is not a choice and still walks straight in.
- **The row shows the level** in its own right-hand column, tabular, gold
  when known and `· ·` while the lookup is in flight — a sort you cannot
  see is indistinguishable from no sort. `data-char-level` carries it for
  QA.
- **Over the cap is possible and deliberate**: merging a mirror into a
  device that already has characters can exceed `ROSTER_MAX`, so the
  picker may read `12 / 10` and Create refuses until one is deleted.
  Dropping restored rows to fit would lose characters, which is worse.
- **Tests** — `tools/qa/mp/run.mjs roster` (28 assertions: auto-open,
  strongest-first against a fixture seeded out of order on both keys, the
  tie-break, rendered levels descending, delete, the cap at 10 and 9).
  Two harness helpers, `H.openPicker` / `H.uncoverDoor`, are how every
  scenario gets to or past the door now — the list is a scrim over both
  door buttons, so a bare `click('[data-tut="login-create"]')` clicks
  into the overlay.

## Tests

`server/test/identity.test.mjs` (in `npm test`):
registration, wrong-phrase reject without eviction, bare-id replay
reject, correct-phrase reconnect + eviction, legacy phraseless join,
magic-id gate (v2.3.1202: `__proto__`/`constructor`/`prototype` each
rejected with reason `auth`, no auth record, no playerState key, no
`Object.prototype` pollution; a normal join still works after),
lockout + expiry, town gate, forged-accept rejection, duel handshake,
lawless zone, death-clears-consent.
