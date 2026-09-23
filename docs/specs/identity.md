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

## One device, many characters, one set of looks (v2.3.2690)

Owner: *"Looks like there's a bug where every saved character has same
face tattoo as one."*

A device holds up to ten characters (the roster, v2.3.1923), but every
look store is ONE per device in `localStorage`: the drawing canvases
(`playerArt.js`, `bt-facetattoo` and friends), the garment patterns
(`patternCatalog.js`), and every trait (`bt-species`, the eye style, the
hair...). Three roads let one character's look show up on the others,
each with its own cause:

1. **The picker's faces.** A saved character's portrait is drawn from its
   stored look (`portraitOptsFromPeer`). `drawCharacterPortrait` reads a
   drawing the caller leaves out as "use this device's own". The recipe
   never listed the face or arm tattoo, which have existed since v2.3.1949.
   So every row showed whatever face tattoo the device held. The same was
   true of the inspect card, the trade window, Ace's table and the profile
   icon. The friends list had its own hand-written copy of the recipe with
   the same gap, and now uses the shared one. Its cache key is the
   recipe's output, so a field added to the recipe is in the key the same
   day.
2. **Switching characters.** Applying a stored record
   (`characterRecord.js`) only set the keys the record HAS, and left every
   other store as the device had it. A record lacks a key in two ways,
   and both mean "blank":
   - **A drawing or pattern the character doesn't have.** The join frame
     and the relay omit a blank drawing, so a plain character has no `tf`
     at all. Switching from a tattooed character to a plain one kept the
     tattoo.
   - **A trait newer than the character.** A record is written once, at
     creation, from the keys the join carried then. A character made
     before eye colour (v2.3.1930), eyewear (2361), its colour (2424), eye
     styles (2643) or species (2682) has no such key. On a device that has
     since made a monkey, every older character walked in as a monkey.

   Either way the leak showed on the player's own screen and, through the
   join frame and the 2-second `track` relay, on everyone else's.
3. **A new character.** Create opened the creator on the previous
   character's canvases. The creator's join is what writes the permanent
   record, so the new character was saved wearing the old one's drawings.
   (Its traits are left as they were. The creator shows them on its
   pickers and they are the player's to change. A drawing sits hidden
   behind the designer.)

**The rule:** the stored record is the whole look. If it has a key, that's
the value. If it lacks one, the value is blank.

This is safe because the look is made only in the creator (`PlayerPaint` /
`BodyInk` inside `NameModal` for the drawings), the creator only makes new
characters, and the creator's join is exactly what writes the record. So a
record holds everything its character has.

- **Client, apply:** `applyCharacterRecord` sets a key the record lacks to
  its `LOOK_BLANK`. That is the value the creator's own Reset writes:
  'none' for a thing you wear, 'default' for a colour, an empty canvas or
  no pattern for a drawing. Blanking is not counted in the apply's return
  value, which callers use to tell a real record from an empty one.
- **Client, leaving:** playing another row from the picker (`onPlay`) and
  Create (`onCreateNew`) both clear the canvases and patterns before the
  reload. The next join then carries no drawing it should not, and a new
  character's drawings start blank. The design slots are untouched, the
  same as the creator's own Reset.
- **Worker:** `RECORD_LOOK_KEYS` (join.js) is the creator's look.
  `_stampRecordLook` runs on the join's sanitized copy and on every `track`
  relay:
  - A look key the record lacks is dropped.
  - A drawing or pattern the record has (`RECORD_OWNED_KEYS`) is forced to
    the record's value, only when the frame carries it (the relay is a
    delta).
  - A trait the record has is NOT forced on the relay. The shirt (`st`)
    can be taken off and put back mid-session (`ItemDetailPopup`), and the
    relay is how other players see that.
  - A session with no record (a guest) is left as it was.
- **The lists agree:** precheck's `look-blank` check holds `LOOK_BLANK`,
  `LOOK_SETTERS` and the worker's `RECORD_LOOK_KEYS` to the same keys. A
  new trait added to one and not the others fails the push. If it didn't,
  the character would look right on one screen and wrong on the rest.
- **Deploy order:**
  - Old client, new worker: other players never see the leak, because the
    worker strips it from the join and the relay. The old client still
    shows it on its own screen until it updates.
  - New client, old worker: a switch made on the new client sends no
    leaked drawing. A leaked trait rides the first join and is corrected
    by the first relay, two seconds later.
- **What it does not undo:** a character created while another character's
  drawings were on the device has those drawings genuinely in its record.
  As far as the worker can tell, that is its look, and a permanent look is
  not rewritten by this change.
- **What it costs:** the back tattoo (`tr`, v2.3.2148) was not on the join
  frame until v2.3.2431, before mid-September (wsClient's "third sender"
  note). The trouser back (`pb`, v2.3.2428) was briefly the same. So a
  character created in that window who drew one has it on the device but
  not in the record. The rule reads that as blank and clears it: locally on
  the next join, and on the relay for everyone else. It was never saved and
  never reached a second device, and nothing can tell it apart from another
  character's drawing. Keeping it would mean keeping the leak, so it goes.

## Tests

`tools/qa/mp/run.mjs rosterink` (off the PR path) runs the three roads
through a real client, a real worker and a second player's screen. Plainy
stands in for a character made before species: its creation join goes out
without eyewear, eye style or species, the way an older client sent it.
Inky is a tattooed monkey on the device under test.

- A row's portrait does not change when the device's own drawing does.
- Plainy, played after Inky, wears neither the tattoo nor the monkey,
  locally and on the onlooker's screen.
- Switching back brings both back.
- A new character's creator opens with no drawing.

Unfixed, it fails seven checks. Fixed, all 21 pass.

`server/test/identity.test.mjs` (in `npm test`):
registration, wrong-phrase reject without eviction, bare-id replay
reject, correct-phrase reconnect + eviction, legacy phraseless join,
magic-id gate (v2.3.1202: `__proto__`/`constructor`/`prototype` each
rejected with reason `auth`, no auth record, no playerState key, no
`Object.prototype` pollution; a normal join still works after),
lockout + expiry, town gate, forged-accept rejection, duel handshake,
lawless zone, death-clears-consent, and the record as the whole look
(v2.3.2690): a plain character's leaked face tattoo and a monkey newer than
the character are dropped at join and on the relay, a shirt put on
mid-session still reaches peers, a tattooed character's own drawing is
stamped back over a different one, a character that IS a monkey stays one,
and a guest keeps its look.
