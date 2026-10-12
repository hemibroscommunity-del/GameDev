# The monster codex (v2.3.3153)

Owner, 2026-10-12: *"Begin working on the monster section of the codex. After
you kill a monster you learn more about it, what it does, where it's from,
elemental type, special attack, (make up a backstory) etc. it'll be another
dashboard section that just displays information. Maybe an animation similar
to how the skills preview window currently works."*

More → Codex → **Monsters** (the tab that used to be "Bestiary"). One card for
each of the Wheel's nine kinds of monster; killing them opens their page a fact
at a time, and each page plays the monster on a little stage the way the
Points window's stat preview plays the slime.

## What a kill teaches

| Kills of that kind | What the page shows |
|---|---|
| 0 | its shape only, "???" |
| 1 | its **name**, its picture moving, **where it is from** (land and levels) and **what it does** in a fight |
| 3 | its **element**, and what that element's hits do to you |
| 10 | its **special attack** — what it is, how long it winds up, how to get out of it — and the stage starts playing it |
| 25 | its **story** |
| 1 at level 21+ | its **elder form**: the recoloured monster past the first pass, its name and a line about it |

The thresholds are one table, `CODEX_TIERS` in `src/data/monsterCodex.js`,
held to the worker's `CODEX.TIERS` (server/src/codex.js) by mirror-audit.

A party's kill teaches every player it pays XP to, as it counts for their
quests. A monster with no land (the closed old zones) teaches nothing.

## The kinds

The pets' nine (`PET_KINDS`, server/src/petbook.js and src/data/trapping.js),
so a codex page and a pet journal page are always about the same monster: one
a land, the Poison Forest's wisps and lurkers apart. The kind of a live monster is
the worker's `petKindOf` (its land, and the look it spawned in — a mummy torn
down to its skeleton is still a mummy); its stage is `petStageOf` (2 from level
21).

## The stage

`src/ui/mobile/dash/CodexStage.jsx`, drawn from `src/data/codexStage.js`: the
Points window preview's make (`sheet/StatDemo.jsx`). Your own character on the
left (the Equipment screen's `CharacterView`), the monster on the right in its
own strips at the URLs the world loads them from, one ground line, and every
motion CSS: a beat is one `setState`, a strip steps through its cells
(`bt-sd-strip`), a walk is a transition. Nothing is drawn a frame at a time.

What it plays grows with the page:

- **1 kill**: its ordinary attack, over and over -- a snowball, a fireball or a
  glob crossing the gap, or a walk up to you and a swing.
- **3**: ...and the hit says what its element does to you (the element's icon
  and its status over your head; a gust shoves you).
- **10**: ...and every other round its special, with the world's own word for
  it (SLAM!, LUNGE!), the world's wind-up times (`CODEX_WINDUP_MS`, from
  `server/src/telegraph.js`), and for a slam or a lunge the world's own
  WARNING CIRCLE under you, filling as it winds up (effectsRenderer's
  `_telegraphZones`) -- so the page teaches the tell the fight will show. No
  ring is drawn as anything lands (the slime's burst never had one: v2.3.2226,
  "remove code drawn impact areas for slime death"); a slam or a burst kicks
  the stage, as the world kicks its camera. The blue slime backs away as it
  swells so it grows away from you, and bursts at its swelled size, as the
  world plays it (v2.3.2227). The mummy's bones are drawn bigger, as the world
  draws them, and keep their own reach.
- **elder form**: a toggle puts it in its second stage's colour and name.

Under `prefers-reduced-motion` nothing runs: the monster stands still.

**Its pictures load when the page opens and go when it closes** -- one
monster's strips at a time, and what it throws, all in before the first beat
(a fireball loading as it was thrown crossed the gap undrawn). Until they are
in, the monster stands as its portrait from the pet sheet, which the loading
screen already fetched. A recoloured monster (the wisp, the lurker, the blue
slime, every elder form) is baked onto the stage's own copies, revoked on
close. This is the OWNER'S CALL to confirm (the preloading law,
Conventions): all nine monsters' strips held for the session would be ~20 MB
of decoded pictures, most of them the very looks the Wheel loads only as you
walk toward them. Nothing loads during play, so the law's purpose -- no hitch
in a fight -- is kept; preloading them on the loading screen is a small change
in `preloadAnimations.js` if the owner wants it.

## Storage: `codex:<pid>`

`{ v, k: { <kind>: [kills, killsPastLevel20] } }` — its own key (handoff rule
1: never a new field on the rpg blob), registered in ARCHITECTURE-HANDOFF.

- One GET at join, cached for the session (`_codexLoadOnJoin`).
- A kill that crosses a threshold, or a first second-stage kill, is written at
  once. Any other kill at most once every `CODEX.SAVE_MS` (60 s), on the next
  kill after it, and on disconnect (index.js `webSocketClose`). A deploy (rule
  11) loses at most a minute of counting and never a fact.
- A record a **newer** worker wrote (`v` above `CODEX.V`) is LOCKED: never
  counted into, never overwritten (a rollback must not shrink it). So is one
  whose **read failed** — a failed read must never become a fresh record
  written over the real one. The phone is told `unavailable`.
- Deleted by `_resetCharacterData` (a restarted character has killed nothing),
  its cache dropped without a flush.

## Wire

| Message | Direction | Payload | Notes |
|---|---|---|---|
| `codex_state` | worker → phone | `{v, k}` or `{unavailable: true}` | at join, after the pets record; PRIVILEGED |
| `combat_credit.cx` | worker → phone | `{k, n, n2}` | the kill's kind and its new counts, on the credit message the recipient already gets — no new message per kill |
| `caps.codex` | worker → phone | `true` | advertised at join; `codex: false` in liveflags turns it off |

No phone → worker message: the codex is read-only.

Deploy order: an old phone ignores `cx` and `codex_state`; a new phone against
an old worker (no `caps.codex`) shows the cards with a line saying the codex
opens after the next update.

## Kill switch

`codex: false` in liveflags: the join's spread un-advertises `caps.codex`,
`_codexOff` stops the counting, and what was already learned is still sent and
shown.

## The dev lever

`POST /api/admin/dev/codex {playerId, kind | all, n, n2}` sets a kind's counts
(or every kind's), writes and tells the phone — for looking at a full page
without 25 kills of nine kinds. `n: 0` forgets a kind. Audit-logged like every
dev op.

## Tests

- `server/test/codex.test.mjs`: caps and the first look; a kill counted on its
  credit and its first kill written at once; coalesced counting and the
  thresholds; the Poison Forest's two kinds, a party's kill, the second stage, a
  monster with no land (and a land named `__proto__`); disconnect and rejoin;
  a newer record and a failed read left alone; the kill switch; a restart; the
  dev lever; `normalizeCodex`.
- `mirror-audit`: `CODEX_TIERS` and the client's nine kinds against the
  worker's.
- `mp-codex` (phone, 20 checks): the Monsters tab, a page opening fact by fact
  from real kills and the dev lever, every stage playing its own special, a
  slam's or a lunge's warning circle, what it throws in before its first
  flight, no monster ever standing over your character, nothing left behind
  on close, the counts back after a reload.
