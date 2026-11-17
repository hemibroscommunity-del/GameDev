# The words rule (v2.3.5197)

Grand plan step 11.4; card K PR 12. Text a player wrote (a name, a clan's
tag) must never be read as the game's own words. Before this, the worker
glued a player's name into the game's sentences ("Mythic Axe sold to Bro99
for 120") and sent the whole string: a name like "{price} (admin)" or one
that reads as a game message was part of the game's sentence.

## What it does

- **The game's sentences are one table** (`server/src/words.js` `WORDS`, and
  its mirror `src/data/words.js`, held equal by the guard): `sold_to`,
  `trade_from`, `clan_war`.
- **A sentence around a player's words goes out as a template and its
  parts**: a mail entry carries `noteT: { t, p }` beside its `note`. Both are
  made in ONE function, `wordsNote`; the parts are put in as text, never
  filled again.
- **The page fills it** from its table (`src/game/postOffice.js` `mailLine`),
  the player's words put in as text. **What a player reads stays word for
  word the same.**
- **Either side ships first**: the `note` stays for an older phone, and a
  template the page's table lacks keeps the worker's own sentence.
- A note merged into "merged payouts" drops its template (`inbox.js`).

Converted: the store's "sold to" mail (`store.js`), the trade's "trade
from" (`trade.js`), the clan war's (`clans.js`).

## The census

`server/test/words-rule.test.mjs` §5 counts server strings joined with a name
or a tag outside `words.js`; its line only falls (rule 3). Today 3: the clan
refusals that say back the tag the player asked for (`clan_error`). Not a
player's words, listed in `KNOWN`: `gold.js`'s road names, the rise chest's
place name.

## What holds it

`server/test/words-rule.test.mjs` (its break proof in its header).
