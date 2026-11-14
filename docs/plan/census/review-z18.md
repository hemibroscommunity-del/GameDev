# The gatekeeper's review, sitting 18 (card Z; tag 5375)

Taken 2026-11-14 to 15 on `main` at abff2ef (tree bd9e0ddc: sitting 17's
twelve PRs merged). Tags in this file are written bare. Each PR that
changes `server/` or `src/` had a finder read the code around its diff
(the angles of `/repo-review` that apply), re-try its break proofs and try
to disprove what it found; the mends of sitting 17's holds were read by
the gatekeeper. Documents, tools and tests got step 3.

VERIFIED: the story runs, on the code path named (a finder's node probe
in a throwaway copy, or a reading end to end). PLAUSIBLE: the code does
it, what sets it off is unproven. The probes are not in the repository.

@@HOW

## Card T: #1863 (PR 6, tag 5306): mended, listed first

**The page's one switch reader (`src/game/switches.js`), sitting 17's
MEDIUM mended at 8197acc (read by the gatekeeper).** The reader now reads
`location.search` at each ask and parses again only when it changed (a
string compare an ask): `create`, `login` and `noresume` dropped by
`history.replaceState`, and a test flipping a switch mid-page, are
answered for the address as it is. switch-reader check 4 holds it (the
reader made to keep its first address fails it). The seven moved reads
keep their old timing: `nmlask` and `nomapdetail` are still read once at
the module's load, `tapthrough` at the first tap, as on `main`; the
others at each ask.

- The two lows mended: guide-arrow.test ~85 and desk-teach.test ~61 look
  for `sw('guidearrow')` in the code, not the old read left in a comment.
  These two edits make it DEPLOY (`server/test/`).
- Sitting 17's other lows stand, as its words say: the four pattern reads
  differ from `URLSearchParams` on odd addresses (the name twice, `%30`,
  a `?` in a value), held equal only on the guard's fixed addresses.
- Nit: its body and commit call the medium "sitting 18's"; it was sitting
  17's.
- With `main` abff2ef in (403ea57): `harvestdoor`, `dungeondoor` and
  `?ladderpass` dated 2026-11-14, the day they merged (UTC, in git):
  sitting 17's "the next sitting sets each to its merge day", done.
- **The order:** from it on, a PR adding a PAGE switch row runs
  `switches.test.mjs --write` (check 13: the reader's forms between its
  markers). It leads this list.

## Card R: #1847 (PR 7, tag 5286): mended, listed

**The paged export (`roomexport`, ON by the owner's yes), sitting 17's
MEDIUM mended at f72a19a (read by the gatekeeper).** `EXPORT_MASKS`
(admin.js) masks a login-wheel pot's opId `loginspin:d:<device>:<day>` in
an `inbox:` row on the page's copy (`loginspin:d:masked:<day>`); the
stored opId is never changed (a pot retried after a deploy finds its
stamp by that exact id). room-export §6b holds it.

- Read for a second road out: the opId's stamp is `oplog:<opId>`, a mark
  off the allow list; nothing else stores `.opId` in an allowed record
  (bank.js, dailyrewards.js, valuepause.js keep their own ids); a device
  id holds no `:` (`cleanDevice`: `[a-z0-9_-]`), so the mask's
  `[^:]*` takes all of it. A character's `p:` pot is keyed by the
  character's own id, not secret.
- Sitting 16's two lows stand (a character's page reads about 29 keys
  whatever its limit; no byte cap); sitting 17's low (a new value-holding
  `between` or `room` mark left off the list silently, failing safe).

@@REST
