# A new character starts from the server's defaults (v2.3.3129)

> Found by the review of the farm (PR #827) and proved on a copy of `main`.
> Owner, 2026-10-06: *"Yes fix all of your recommended fixes. Game is still a
> demo and nobody uses Diego yet."*

## What was wrong

When a player joins and the worker has no `rpg:<pid>` record for them, the
join used to **bootstrap** the character from the join payload: whatever the
browser said it had. The design reason was "migrating single-player
characters". There are none: the game has been server-only since 2026-07-02,
and every new character has started at level 1 since v2.3.1676 / v2.3.3041.

What the payload could claim:

| Field | Old bootstrap |
|---|---|
| coins | up to 2,000 |
| level, xp | up to 1,000 / 50,000 |
| inventory | any 100 keys, up to 50 each, **whatever their names** |
| life skills | **copied wholesale, uncapped** |
| weapons, armour, shield, amulet | sanitized, but taken |
| weapon / armour / shield / cosmetic stashes | sanitized, but taken |
| gold nuggets / bars, gems | capped, but taken |
| achievement points, quest state, raw stats, HP | capped, but taken |

Identities are free: a phraseless join on an unregistered id is allowed
(rule 21). So a throwaway character could:

- **claim level 150 in every life skill and collect the whole guild ladder**:
  about 50,600 coins and 17,000 achievement points, which a trade moves to a
  main character. It also skips every life-skill level lock (forge, amulet,
  hardening, smelting, armour, gathering, the farm, the Cookhouse);
- **claim 100 made-up item keys and sell them to Diego**, who prices by part of
  a key's name. `bar_00` counts as a metal bar. One throwaway made about
  392,000 coins.

Two more things the review turned up on the same path:

- **The pets ingest** took up to six level-100 pets from the payload on *every*
  join of a player with no pets, not once.
- **A read that failed passed for a new character.** `_loadRpg` answered `null`
  both for "no record" and for a storage error, and the join then **saved the
  bootstrap over the real record**.

## The fix (`server/src/join.js`)

- **When there is no record, every `rpg*` field is dropped** before anything
  reads it:
  - from the raw message, which the explicit ingest and every adoption read;
  - from the allowlisted copy already spread onto the session and
    `playerState`.

  Every claim to progress in the join payload is named `rpg*`, and nothing
  else is. So:
  - where you stand, your name and your look (`JOIN_PRESENCE_KEYS`,
    `JOIN_COSMETIC_KEYS`) are untouched;
  - every read below the drop finds nothing and lands on the default.
- **The defaults are the client's own new character** (`gameSystems.js`
  `createDefaultRpg`, `createDefaultLifeSkills`). Two of them are not zero or
  empty, so the worker states them, and mirror-audit pins each to the client's:
  - `NEW_CHARACTER_COINS` (50, `join.js`);
  - `freshLifeSkills()` (`migrations.js`): every skill at level 1, empty
    pouches, no pet.
- **A character on file is untouched.** Stored wins, exactly as before.
- **A failed read ends the join.** `_loadRpg(pid, { throwOnError: true })`.
  The socket closes (1011), nothing is written, and the client's reconnect
  asks again. Every other caller of `_loadRpg` keeps its old answer.
- **The pets ingest is gone** (`pets.js` `_petsAdoptOnJoin`). Captures have
  been the worker's since pets shipped. The join still sanitizes the pets the
  server already holds.
- **The copy without the claims has no prototype** (`_withoutRpgClaims`).
  `JSON.parse` turns a `"__proto__"` key in the frame into an ordinary key
  of the payload. The first cut of this fix copied it onto a plain `{}`,
  which made the sender's object the copy's prototype, so every dropped
  claim could be read back through it. The review proved it: 1,999 coins,
  and 392,500 from Diego for made-up bars. On an object with no prototype,
  that key is just a key nothing reads (`docs/TRAPS.md` §6).

No message or cap. An honest new client sent its default character, which is
exactly what the worker now makes, so nothing a player sees changes. The one
client change is the picker's restart (below).

## The picker's restart clears this device's copy (`CharacterPicker.jsx`)

The character picker's "Restart at level 1" wipes the record on the worker
(v2.3.2194). For the bro this device plays, it used to leave the device's own
copy in place (`bt_rpg` and the rest of `CHAR_CACHE_KEYS`). Picking the same
row then joined with it:

- before this fix, the worker took that join back as the character, so the
  restart silently did nothing;
- with only the server half of this fix, the worker takes nothing, but the old
  shield, raw stats and spare gear stayed on screen, and the next join folded
  the spare gear back into the record (the gear stashes merge on every join,
  below).

Now a successful restart of the bro this device plays clears those caches and
reloads the page, as the in-game restart already did (`character_reset_done`
in wsClient.js). The codex, bestiary and zones are read once, when the page
loads, so the reload is what clears them. Restarting another bro on the list
changes nothing on this device; it holds no copy of that one.

## What is NOT changed (reported to the owner)

- **The gear stashes still merge a claim on every later join.** These are the
  spare armour, legs, shields and cosmetics (`gearstash.js`,
  `_gearStashAdoptOnJoin`). That merge is a documented trade-off from v2.3.2527:
  a second device must not erase a wardrobe it has never seen.
  - Every piece that arrives that way is marked `legacy` (v2.3.2534). It can be
    worn, but the store will not list it.
  - This fix stops it only on the *first* join. A throwaway can still claim
    spare armour on its second join.
  - Closing it means deciding that the server's stash is the whole truth. That
    is the owner's call.
- **A character on file still reads a few fields from the payload**, as it
  did before. `stats_update` accepts every one of them at any time, with the
  same clamps, so none of them is a new way in:
  - `def` and the two amulet regen mults, on every join. They come from the
    gear you wear, which the client works out;
  - the weapon, defense, HP and endurance point tracks, on every join while
    the stored track is empty. A new character's are stored empty, so this
    covers its later joins too;
  - the raw stats, for an old record that has none.

## Tests

- `server/test/fresh-start.test.mjs` (new, in `npm test`):
  - a throwaway claiming everything comes to exactly the character that claimed
    nothing;
  - so does one hiding its claims behind a `"__proto__"` key (below);
  - the guild refuses a claimed level;
  - Diego is never offered a made-up key;
  - the place and the name still land;
  - a character on file is untouched;
  - a failed read writes nothing and the next join loads the real character.

  With the drop switched off, 13 of its checks fail; with the copy built on a
  plain `{}` again, 3 do.
- `mirror-audit`: "A NEW CHARACTER IS THE CLIENT'S OWN".
- `mp-pickerrestart` (14 checks, on a phone against a real worker): plays a
  bro, gives this device's copy a purse, a worn shield and a spare, restarts
  the bro from the picker, and checks that none of it comes back, in the
  browser, on screen, or in the record after a rejoin. Without the picker
  change, 5 fail.
- **Suites that pinned the old bootstrap**, updated to the new rule:
  - anticheat (each cap asserted as "not taken");
  - lifeskills-economy, migrations, amulet, persistence, inbox and trade (the
    new purse);
  - pets (no ingest, held list still sanitized).

  Where a check was about a mechanism a character *on file* still meets (gear
  stash merge, gear provenance, the gems' one-time capture, the amulet regen
  and raw-stat ceilings, the pets' sanitizing), the character is now put on
  file first, so the mechanism stays covered. The review found the last
  three uncovered by the first cut; each check now fails if its clamp is
  removed.
