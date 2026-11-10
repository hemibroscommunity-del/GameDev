# Which character a tab plays (v2.3.4560)

The 2026-11-03 state-machine sweep's V5. The owner's decision (2026-11-10,
OWNER-LIST section 10): **one character per browser; a second tab takes the
session over.**

## What a player met

A browser keeps the character it plays in ONE slot every tab of the game
shares: `localStorage.bt_passphrase`, the Login Key. Each tab fixed its player
id when it started, but every join read the slot afresh. So with character A
in tab 1, and B chosen in tab 2 (Continue, Create, or B's Login Key typed),
tab 1's next join -- coming back to it after 5 s, a dropped line, a deploy,
the idle logout's "I'm back" -- went wrong:

- **new keys** (eight words): the join's id was re-targeted from the slot, so
  tab 1 became B, put tab 2 out, and folded A's spare armour (the join's stash
  seeds) into B's record as copies;
- **older keys** (a character made before v2.3.3355): tab 1 sent A's id with
  B's key, was refused `'auth'`, threw the key away and joined as a brand-new
  level-1 A with the same name and look: a wipe to the eye (TRAPS 209 names
  the harm of `'auth'`).

The list rows took the wrong name and level (the 30 s heartbeat stamped the
slot's row), a key handed to tab 1 (`key_new`) renamed the slot's row (B's),
and a reload could start from the other character's `bt_rpg` or resume
snapshot. Nothing was deleted on the server.

## What it does now

The rules are `src/game/tabIdentity.js` (no imports; node tests them).

| | |
|---|---|
| The tab's key | `S._tabKey`, read with the slot at the tab's first render (BroTown's state, just after the `myId` initialiser). It changes only by this tab's own key events: `key_new`, the old-key fallback, Play here. A guest (`?guest=1`) has none and sends none, as before. |
| Every join | `joinIdentity`: the tab's own key and its id (a new key's id from THIS key, the v2.3.3355 re-target kept); the slot's newer key of the SAME character is taken (another tab on it was handed a new key). |
| The slot moved | Another character's key in the slot, or none: no join. The takeover's own banner, `This account connected from another window.` / `Play here instead` (status `superseded`; a tab return does not rejoin behind it). Decided before a line opens and again at the open. |
| Play here | The player choosing this tab: it joins as this tab's character and writes its key back into the slot (`setActiveKey`). The other tab's next join shows the banner. |
| `'auth'` | Never a new character: the key road (`_kyPending`): this character's old key kept beside a new one, or the key screen ("This Login Key no longer works", Use a Login Key -> the door, where Create is). |
| `key_new` | `keyNewPlan`: the tab plays the new key; the slot takes it only while it still names this character; the roster renames this tab's own row (`swapKey` from the tab's key, never the slot's). |
| The fallback | `fallbackKey`: an old key of THIS character only (the tab's memory, or the shared `bt_passphrase_old` when its id is this tab's). |
| List rows | `rowKey`: the heartbeat and joinTown stamp the tab's own key's row, and only while that row is on the device (the slot, or the list): a row another tab removed is not put back. |
| Caches | `bt_rpg` and the resume snapshot (`bt_resume`) carry `_owner`, the id they belong to (`stampOwner`); their readers (BroTown's state start, joinTown, the heartbeat, the resume effect) refuse another character's (`ownedBy`). One written before v2.3.4560 has no stamp and is read as before. |
| A typed key | Clears the same per-character list the picker clears (`CHAR_CACHE_KEYS`, one list now, and the tab's session copies). |
| The picker | A row the slot already names, picked in a page that started on another key, reloads like a switch. |

`?tabid=0` (one phone, kept through the door by `keepSwitches.js`): the old
road everywhere above -- the slot at every join, the mint on `'auth'`, the
slot's row.

Phone-only: the worker, the device lock (`devicelock.js`) and the login keys
(`loginkeys.js`) are unchanged, and their refusals stay `device`, `key`,
`locked` (never `auth`).

## Not done here

- Two tabs on two characters at the same moment still happen until the first
  tab's next join (no cross-tab message tells it at once).
- The roster across two addresses of the site (the sweep's N1-9: a tombstone
  from another address, the stores' `v: 1`), and the look stores other than
  the resume snapshot (the worker's stored look wins at `state_sync`).

## Tests

- `server/test/tab-identity.test.mjs`: the rules on the real identity helpers
  (`src/networking/index.js`) over one stand-in localStorage two "tabs" share,
  and the client's wiring.
- `tools/qa/mp/mp-tabidentity.mjs`: two pages of one browser, iPhone sized,
  in the world: an older key with tab 2 in the creator (the wipe road), and
  new keys with B's key typed at tab 2's door.
