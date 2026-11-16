# The gatekeeper's review, sitting 19 (card Z; tag 5376)

Taken 2026-11-15 on `main` at 29b1a0d (tree af06f475: sitting 18's nine
PRs merged). Tags in this file are written bare. Each PR that changes
`server/` or `src/` had a finder read the code around its own diff (the
angles of `/repo-review` that apply), re-try its break proofs, run the red
team's proof where one exists, and try to disprove what it found.
Documents, tools and tests got step 3. The red team's exploit details are
kept out of this file (its findings say "remove before the repo goes
public"): a hole is named here, not how to open it.

VERIFIED: the story runs, on the code path named (a finder's node probe
in a throwaway copy, or a reading end to end). PLAUSIBLE: the code does
it, what sets it off is unproven. The probes are not in the repository.

## How this sitting ran

This sitting is the red team's fixes. Each session merged `main` 29b1a0d
and sent its heads through the planning session. Card T's #1889 leads; the
only cross-card carry allowed is of its head (4334b6d), and RT-1's three and
RT-3's line carry it (#1878 first carried T's older 7b1141b: two merge
bases once #1889 lands, so each restacked on 4334b6d). At the planning
session's word: card OPS's line (#1874 to #1913) moved to a short sitting
19b, right after this one lands, on that `main`; MOD's #1909 and #1914 wait
for a later sitting; MOD's card #1883 sits right before #1897. A second
gatekeeper (sitting 20) reviews the feature lines (R, L, P, J2, O, K's act
family): not this file's.

The sitting paused for most of a day (the usage allowance ran out
mid-review, 2026-11-15 03:00 to 2026-11-16 21:00 UTC). On its return
`main` was still 29b1a0d and no head had moved: RT-3's and MOD's mends had
not come, so their line is held (below) and goes with sitting 19b once
mended. The planning session is now `session_01LccHai4oUbpVPTsJKxanZP`.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1923** (card K, from its words): `relaybytes` lands ON: it drops
  only what no honest phone sends. `relaybytes: false` turns it off.
- **#1882** (RT-1): an explicit empty device list (`devs: []`, written
  only by a join naming no device: bots and suites) keeps the old
  first-device rule, accepted by the planning session on the condition of
  its writer table (verified, but for one LOW: join.js ~532).
  `oldkeylock: false` turns the PR off.
- Not under the heading, the nearest: RT-1's `ip64` and `adminlock` land
  ON (`false` turns each off); T's #1889 and K's #1899 change nothing a
  player sees (no switch); MOD's #1883 is words.
- For the owner, costs (never decided this way): none on this list adds a
  write, a message or a pace. #1882 adds one `auth:` read and one hash to
  a locked old-key try; #1885 keeps at most 1,024 addresses in memory, and
  a held ask is still a billed request.
- Waiting for the owner's own words: `.github/workflows/crash-report.yml`
  (held #1878's; see below).

## Card T: #1889 (PR 7, tag 5307): step 3, listed first

**The thrown run's preload changes nothing by itself.** Tools only
(`tools/guards/lib/thrown.mjs`, the new `thrown-hooks.mjs` and
`thrown-patch.mjs`, `switches-thrown.test`, `switches.test`, the switch
table's spec, T's status): card T's files, its tag, no `server/` file (no
deploy). The preload no longer imports `server/src/index.js` itself: a
module hook appends the patch as the suite imports it, so a suite's own
globals come first (`tick-pace.test`'s `WebSocketPair`) and a room's cold
start stays cold (`cold-flags.test`); setting the flags to `null` drops
the cache again (`roomfull.test`). On every PR the two canaries run with a
flag nothing reads; `--none` runs all 400 server suites so, by hand. The
switch guard now refuses a row whose `thrownFails` names a canary suite (the
old preload's artifact): RT-1's #1885 and RT-3's #1878 dropped theirs and
carry this head (4334b6d, `main` 29b1a0d in). Done when: met.

## The red team, RT-1: #1875, #1882, #1885 (tags 5581 to 5583): reviewed, listed

One stack at the planning session's word, T's 4334b6d at its foot:
#1875 a26f901 > #1882 0bea51a > #1885 4c3507b. Drafts: the planning
session marks each ready at its merge. Each deploys (`server/src/`).
Every break proof re-tried went red; the suites flood, account,
device-lock, login-keys, admin-lock, identity, tab-identity, room-export,
cold-flags, rewind, test-mode green on the three together; each switch's
system suites thrown through the preload fail exactly its `thrownFails`.
No `.github/` or `wrangler.toml` change.

**#1875 (`ip64`): an IPv6 /64 counts as one address.**
- MEDIUM, VERIFIED (what it does not close): `flood.js` `ipKey` groups by
  one /64; home lines are often given a /60 or a /56, a free tunnel a /48.
  A probe filled the room from nine /64s of one prefix (with `ip_joins_min`
  on, in about a minute). The body's "its /64 block, which is one line"
  overclaims: the red team's other halves (a guest cap, the account check
  on) are what close the crowd's finding. Strictly better than `main`.
- LOW, PLAUSIBLE: people who share one /64 (a private relay's exit, a
  hotel's Wi-Fi) now share its sixteen places, as they share one IPv4
  today. Mobile carriers give a phone its own /64.
- NITs: `ip64`'s `thrownFails` lists flood's two, and account.test's own
  check fails too (another system's suite: the row is incomplete, not
  wrong); #1878 keeps a copy of `ipKey` that does not read `ip64`; a hex
  IPv4-mapped form groups with `::1` (Cloudflare sends dotted IPv4).
- The parser is right on every form tried (`::` anywhere, zeros, case, a
  zone, mapped dotted IPv4, garbage as written); every address limit in
  `server/src` uses the one key; OFF is `main`.

**#1882 (`oldkeylock`): an old key never takes a list-less character's
first device.** The body's table (no path empties a list that had devices
but the owner's Forget, which seals) VERIFIED by a grep of every `auth:`
writer, but for one:
- LOW, VERIFIED: join.js ~532: a character registered while `devicelock`
  was off has no `devs` at all; with the lock back on, its own phone and
  old key are refused `device` (`oldkeylock: false` lets it in). Not high:
  a current phone is handed a new key at that first join, and new keys skip
  the device lock. The owner's pass lets such a player in.
- LOW, as designed: every old-key character with no list now needs the
  owner's pass, the owner's own included; a device fill that fails refuses
  instead of letting in.
- DISPROVED: a stranger with the derivable old key gets through the
  five-wrong-keys lock by `_oldKeyHolder` (it needs a listed device or a
  live pass, which get in anyway).
- NIT, an exploit recipe: devicelock.js ~160-178 and the device-lock spec
  spell out how an old key is worked out from a public id; "derivable from
  public data (RT-1 N1)" is enough. Before the repo goes public.
- OFF is `main`; refusals stay `device` and `locked`, never `auth`.

**#1885 (`adminlock`): ten wrong admin keys in ten minutes, a 15-minute
time-out.**
- MEDIUM, inherent to a limit by address, VERIFIED: rotating /64s evades
  it (a /48 holds 65,536). The owner's long random key stays the defence.
- MEDIUM, VERIFIED, cross-PR: RT-3's #1878 checked the same key in the
  Feedback object with no count (2,000 wrong keys, then the right one let
  in): mended in #1878 (below). Every other key compare in `server/src`
  goes through admin.js's door (#1897's silence routes too).
- LOW, VERIFIED: with all 1,024 kept addresses held, a new one evicts the
  oldest held (the body: "the held one is not dropped" holds only while one
  is not held).
- LOW, PLAUSIBLE: the held check runs before the await of the key's hash
  and the miss is counted after: parallel guesses from one address pass
  the ten (200 in a probe). Cheap: check again after the hash.
- LOW: the Test panel shows a held ask as "Failed: held", not the minutes.
- DISPROVED: the owner locked out from another address (counted by the
  asker's own address; no address is never held).
- NIT: the body says its `thrownFails` hold four cold-flags lines; the row
  holds none and cold-flags passes thrown (the row is right).

## Card K: #1899 (tag 5542): reviewed, listed

**CHAT_LANES made from the wire table; wire-door.test §7.** Head 05e9f35
(`main` 29b1a0d in). Deploys (`server/src/wire/lists.js`, a test), and
nothing changes: only the test reads the list. VERIFIED clean:
`CHAT_LANES` equals #1897's own list exactly (chat, area_chat, whisper,
party_chat, friend_dm, store_dm), each a player's words to another; §7's
three measured rows hold; its break proof is red.
- LOW: chatlanes.js ~50 already exports a `CHAT_LANES` (the lanes' pace
  numbers); a second one, a Set, here invites the wrong import when #1897
  switches to it (`.has is not a function` in `_onMessage`). K renames it in
  N10, at the planning session's word.
- LOW: a lane is a row whose `text` is `words`; a future lane carrying its
  words under another field name would be missed and no guard would say.
- NITs: "a frame typed `broadcast` reaches no handler" holds with
  `relaylist` on (off, it is queued and fanned out; the phone draws
  nothing); the move's infinite x is judged at the judge, not the router;
  the header's break-proof line 5 sits inside item 4's words.

## Card K: #1923 (N10, tag 5543): reviewed (by the gatekeeper), listed

**A relay's bytes bounded (`relaybytes`, ON; RT-1 N10).** Head 0a086cc,
on #1899. Deploys. Its finder stopped at the usage limit before it
reported; the gatekeeper read the diff and the code around it.
- Three bounds on bytes beside the count's bucket (8 at once, 4 a
  second): one relay's JSON at most 4 KB; a socket's relay bytes 8 KB at
  once, then 2 KB a second; the room's queue of relays 256 KB. A drop is
  silent to its sender, as the count's always was, and counted.
- The queue's count cannot leak: nothing but the tick's drain takes from
  `eventBuffer` (tick.js ~761, read across server/src), and the drain gives
  each sent relay's bytes back (a `WeakMap`, nothing added to the wire).
- An honest player loses nothing, read: the 26 relay rows are small (an
  arrow about 300 bytes: the count's bucket binds before the bytes', 4 a
  second x 300 is 1.2 KB a second); the old trade's `offer` goes only to a
  worker without `trade2`. K's honest census (the planning session's
  word): questline 187 of 187, taptrade 9 of 9, no relay dropped.
- It renames #1899's list `CHAT_LANE_TYPES` (#1899's LOW); MOD's #1897
  does not import it yet (its own `SILENCE_LANES`).
- LOW, PLAUSIBLE: the queue's 256 KB is the room's: thirty-two sockets'
  bursts fill it at once, and an honest relay is dropped (`queue`) for the
  ticks it takes to drain.
- NIT: the spec points at "the census below", which is not in it.
- OFF (`relaybytes: false`) returns before any work: `main`.

## Card MOD: #1883 (tag 5620, the card): step 3, listed

Words only: `docs/plan/cards/MOD.md` and MOD's status file, nothing else
(no deploy). Its PRs 1 to 4 are named with their files, tags (5621 to
5624), switches and "done when"; the block is in tag-blocks.json already
(P's #1868). Its status names #1897 and #1907 ready: held this sitting
(below). From `main` abff2ef; one merge base where it stands.

## The red team, RT-3, and card MOD: #1878, #1890, #1897, #1907: HELD

One stack (#1878 > #1890 > #1897 > #1907; heads 22b8762, f1aa707,
2288737, 38d719a, each still on T's older 7b1141b). Every PR in it waits
on #1878's mends, and each has its own:

**#1878 (5593, the feedback board), held: three MEDIUMs, mends asked
2026-11-15, not come.**
- MEDIUM, VERIFIED: RT-1 N3's big rows are still open through the player
  id: `submit` and `vote` store it uncut; one anonymous vote turned a real
  report into a 1.9 MB row, and the new sweep then deleted that report.
- MEDIUM, VERIFIED (the reset), PLAUSIBLE (its timing): the paces and the
  300-rows-an-hour budget live in memory and refill each time the Feedback
  object is rebuilt (a deploy, an idle spell): "at most 7,200 a day" holds
  only while it stays awake.
- MEDIUM, VERIFIED, cross-PR: its owner routes compare the admin key in
  the Feedback object with no count: an unlimited way round #1885's
  time-out.
- LOW, VERIFIED: a vote under the id `__proto__` is never recorded
  (TRAPS §6), so one address's votes all count.
- Needs (the owner's): `.github/workflows/crash-report.yml` reads the crash
  feed with no key; after #1878 it prints a 404. Mending it is a `.github/`
  edit and an Actions secret: the owner's own words.
- Clean: the key compare by digest; the pace maps bounded; PanelGuard
  reports once an opening; old posts read as text on both screens.

**#1890 (5594, staff names), held with #1878.** MEDIUM, VERIFIED: the
look-alike folding misses easy spellings (a digit beside the word, an
accent, a dotless i, small capitals, joined words, plurals); and it
refuses some ordinary names ("Dev", "GM"). The planning session's mend
(fold accents and the rest, "Dev" dropped) was sent to RT-3, to be carried
into #1907's mirror.

**#1897 (5621, the silence), held with #1878, and its own MEDIUM.** The
silence is clean (the step after the wire door; all six lanes, v1 too; no
timer; kept through a deploy; the red team's proof closed). The device
half is not:
- MEDIUM, VERIFIED: `freezedevice` (ON) can lock the owner out: its spare
  and its list both read `auth:<pid>.devs`, which never records a device a
  character reaches with its new key; freezing a test alt on a computer
  the owner also plays on refused the owner's own character there. And
  every freeze already in production would start holding phones at the
  deploy.
- MEDIUM, VERIFIED, the same root: a freeze holds only the phone a
  character was made on.
- LOW, VERIFIED: past 128 freezes the device rule fails open (one storage
  get of every frozen id).
- The planning session's mend: `freezedevice` built OFF (a lever), the
  get batched by 128, `minutes` refused unless a positive whole number; the
  complete device source (botfp's `device:` record) is MOD's next PR.
- Its commit 2288737 adds `silenced:` to the room export's list, beside
  `frozen:` (read).
- Lows: words still reach others outside the six lanes (a market order's
  label, alliance, clan and pet names, emote and dice text); the banner
  cuts the until-time; the wire table's `flag` column not updated.

**#1907 (5622, the name rules), held with #1878, and its own HIGH.**
- HIGH, VERIFIED (not a regression; S2 not closed): the join's own name is
  never checked for a session with no record (a guest, or a key joining
  with a blank name): the red team's message still reaches every player,
  room chat and the global board. The `track` road it closes is closed.
- MEDIUM, VERIFIED by reading: `mp-ownerwatch` names its owner 'Owner',
  which the name box now refuses: the phone test turns red.
- Lows: a rename's `player_update` flattens the player's build for a
  minute; `namerules: false` does not reach the name box; invisible
  fillers pass as letters; combining marks refused; a `name` refusal shows
  no words; the arena's own name untouched.
- Clean: no existing player is refused; page and worker agree byte for
  byte; ASCII script; the rename route behind the key and logged.

## Not listed

- Card OPS's line (#1874, #1880, #1886, #1908, #1891, #1872, #1893, #1905,
  #1913): sitting 19b, at the planning session's word, on the `main` this
  list makes. Its six PRs that change the game were reviewed here; the
  findings went to the planning session on 2026-11-15 for OPS to mend
  while it restacks (the biggest: #1908's gate cannot tell a seat's holder
  from a stranger, a MEDIUM, though it lands OFF and OFF changes nothing;
  #1891's rollback case may leave the owner unable to reach the Test panel,
  a MEDIUM, PLAUSIBLE: one sentence in OPERATIONS). 19b re-reads them.
- MOD's #1909 (5623) and #1914 (5624): a later sitting, at the planning
  session's word.
- The red team's findings (#1867, #1869, #1870): drafts, words only, with
  exploit details; never merged as they are.
- Sitting 20's feature lines (R, L, P, J2, O, K's act family): the second
  gatekeeper's.

## Stalled

- RT-3 and MOD: the mends asked on 2026-11-15 (#1878, #1890, #1897, #1907)
  have not come; no commit since 02:31 that day. The sessions ran out of
  allowance with this one. Not stalled by choice: start them again, or
  send their mends with 19b.

## Found (no card's, or another card's)

- Card T: the four new switch rows on this list (`ip64`, `oldkeylock`,
  `adminlock`, `relaybytes`) carry `on: '2026-11-15'` and merge on
  2026-11-16 (the sitting's pause): a day early. Harmless (`--due` would
  name them a day sooner, and nothing is reaped by age); the next switch
  table PR sets each to its merge day.
- RT-1: devicelock.js ~160-178 and docs/specs/device-lock.md ~84-87 say how
  an old key is worked out from a public id: cut before the repo goes
  public (#1882's NIT).
- Card MOD, next: the frozen device read from botfp's `device:` record (or
  `frozendev:` marks), the owner's complete spare with it; the words that
  still pass a silence; the arena's name (a later MOD PR).
- Card OPS, PR 9: `/health/room` is a public, unpaced read (#1880's LOW):
  on PR 9's list.

## The lines

On `main` 29b1a0d the phase table's `todo` is 22 at its line 24: this PR
lowers `TODO_LINE` 24 -> 22 (break proof: 21 fails check 7). The four
lines' guard printed the room P's #1868 earned: entityRenderer.js 8941 (its
line 8953): this PR lowers it (break proof: 8940 fails check 1). Nothing on
this list touches either file; sitting 20's L PRs change
phase-table.test.mjs well away from the line (merged with this branch:
clean).

## The list

1 #1889 (T) · 2 #1875 · 3 #1882 · 4 #1885 (RT-1, drafts: ready first) ·
5 #1899 · 6 #1923 (K) · 7 #1883 (MOD's card) · 8 this PR; each "Create a
merge commit", in one sitting, before UTC midnight if it can be. Five
deploy the worker (#1875, #1882, #1885, #1899, #1923: `server/`): back to
back. #1889 is tools, #1883 and this PR words and guards: none deploys.
New live flags `ip64`, `oldkeylock`, `adminlock`, `relaybytes` (all ON);
they meet on no line (each row in its place by name; the whole merges
clean, step by step). No stored record changes its shape. No page switch.

Held: RT-3's and MOD's line (#1878, #1890, #1897, #1907), the findings
above; it goes with 19b once mended and re-read.

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` 29b1a0d:

1. T, RT-1's three and K's #1899 (tree 923518b3), on 2026-11-15:
   precheck 0 FAIL (7 WARN), 122 s.
2. **The list in its order**, seven PRs at the heads below (tree
   3540960e), on 2026-11-16: precheck 0 FAIL (7 WARN: six branches of the
   held line carry T's 5307 inside T's own head, not a clash; the 48 hours'
   branch count), build, questline 187 of 187 (463 s). ONE merge base each,
   step by step (counted by hand, the same tree).
3. **The list with this branch last**: one merge base, a clean merge (tree
   0de8046d); precheck 0 FAIL (the same 7 WARN); the four lines', the
   phase table's and the switches' guards green.

The heads: #1889 4334b6d, #1875 a26f901, #1882 0bea51a, #1885 4c3507b,
#1899 05e9f35, #1923 0a086cc, #1883 95fe266. Each base is `main`, and each
`test` check is green on its head.
