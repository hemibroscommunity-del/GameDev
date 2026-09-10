# The door is the bro switcher, and it never said so

**v2.3.2421.** Copy + one class name. No change to any road.

> Owner, 2026-09-09: *"the level 0 I saw when I logged in was from an old save
> that somehow was the DEFAULT I logged into (it was an old character I'd made
> that I tattooed at one point)."*

## Nothing was broken

A plain load reads `bt_passphrase`, asks the worker whether that key has a
character, and on yes joins straight in (`BroTown.jsx`, `__btBootRoute =
'resume'`). Whichever key is stored **is** who you are. That is deliberate —
v2.3.1840 exists precisely to make logging out *stop* walking you back in.

Nothing reverts the key behind your back either. Its only two writers are
`activateChar` (the picker, a deliberate tap) and `adoptSharedPhrase`, which is
guarded three ways: no local key, no roster of its own, and exactly one
non-provisional shared row.

And the other characters were never lost. They are in `charRoster`, and
`LoginScreen` **auto-opens** the `CharacterPicker` whenever the roster is
non-empty. The road to "play a different bro" is one tap: the chip in the zone
header.

## So why does nobody find it

Every signal on that control says the opposite of what it does:

| | says | means |
|---|---|---|
| the glyph | a **door** with an outward arrow | your bro list |
| the label | **Log Out** | switch bro |
| the confirm button | `bt-chisel--danger` — the same red as forge salvage and Leave Clan | nothing is destroyed |

A player holding four bros reads that as "end my session", not "show me my
bros". So they never press it, and they keep playing whichever character the
stored key happens to name — which is exactly the report.

## The fix is the words

The wording tells the truth, and **only when there is a truth to tell**:

| device holds | title | button | red? |
|---|---|---|---|
| one bro | Leave the world? | Log Out | yes — it *is* an exit |
| two or more | Switch bro? | Switch Bro | no |

The two-bro copy also says *"This one is saved"*, because the fear the red
button creates is that switching costs you something.

`rosterCount()` is read **at render**, not at module load: `forgetChar` and the
create road both change it while the game is running, and a value captured at
import would go stale in the direction that matters — a player who just made
their second bro is exactly the one who needs the new wording.

It is wrapped in try/catch. `charRoster` reads `localStorage`, which *throws* in
a private window rather than returning empty, and a header that throws takes
the whole world chrome with it.

## What was deliberately NOT done

**The boot road is untouched.** Opening the picker on every load would be a
behaviour change for every returning player — including everyone with exactly
one character, who would gain a screen that asks a question with one answer.
That is the owner's call to make, not a relabel's.

## The pin

`tools/qa/mp/mp-switchbro.mjs`, **14 assertions**, a real browser at 390×844.

It pins **both directions**, because a relabel that fires unconditionally would
be a worse bug than the one it fixes: the one-bro rounds assert the old copy is
still *exactly* the old copy, red button included.

And it pins the **road**, not just the words — it presses Switch Bro, follows
the navigation, and asserts the character list is really open on the other
side. The claim "this is the bro switcher" is only true while that holds.

### A fixture bug worth recording

The first cut seeded **one** roster row for the one-bro case and read the
*correct* switch wording as a failure. `ensureChar` puts the live
`bt_passphrase` into the roster on every boot, so the device held **two**.
`mp-roster`'s `setCount` sidesteps this by deleting the boot key — not
available here, since the header only exists while somebody is in the world and
their key is necessarily in the list.

Every round now asserts the roster size it believes it set up, so a fixture that
drifts fails **as a fixture** rather than as a verdict on the product. That is
the same lesson as §67 and §69: the test that lies to you is the expensive one.
