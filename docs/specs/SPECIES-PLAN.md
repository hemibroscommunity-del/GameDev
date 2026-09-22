# Playable species — what it costs, what shipped (v2.3.2642)

Owner ask: *"What's the feasibility of adding new species to play as? I'm
wanting to add alien and monkey"*, with a reference sprite for each.

This is the costed answer, written against the code rather than against the
GDD (which is stale — see CLAUDE.md). **Stage 1 has shipped**; stages 2 and 3
are scoped here so the next session does not re-derive any of it.

## The finding that makes this cheap

Both reference sprites are the **same body**: identical pose, identical olive
trousers, identical grey boots, identical proportions, identical outline. The
only differences are:

| | alien | monkey |
|---|---|---|
| skin | cyan, measured lit (207,250,250) | dark warm fur, measured lit (85,56,23) |
| face | thin mouth, black almond eyes | lighter muzzle (measured #91765e, lum 123) |
| ears | pointed, outside the head silhouette | round, outside the head silhouette |
| body | unchanged | unchanged |

The renderer is already built around exactly that split — skin is a
recolourable region, the face is an addressable region, and head-attached
sprites are a trait category. So the expensive thing (a new body rig) is not
what these two references need.

## Stage 1 — SHIPPED in v2.3.2642

Two `SKIN_CATALOG` rows in `src/rendering/playerSkins.js`, measured off the
owner's own reference art, plus a `species: true` flag that keeps them out of
the creator's dice roll (`SKIN_ROLL_CATALOG`, read by `randomizeAppearance` in
`BroTown.jsx`). No new art, no wire change, no server change.

They are named for a **colour**, not a species, deliberately: a saved
appearance stores the catalog id, so these ids are permanent, and when the
Stage 2 species axis lands it should select a tone from this catalog rather
than duplicate one.

The recolour propagates for free to all 82 body sheets including the armoured
and bow/sword variants, the head-overlay sheets, the creator portrait, the
inspect card and every remote player — it is keyed
`(skin, pants, shoes)` and nothing needed touching per-sheet.

**Verified**, not reasoned about:

- `node tools/skin_clip.mjs` — Alien Cyan clips 0.38% of skin pixels against
  Alabaster's shipping 11.81%. The raw reference value would have clipped
  13.40%, i.e. worse than anything in the list; see TRAPS §89 for why the
  measurement off the art is not the catalog target.
- `QA_WS=ws://127.0.0.1:8787 node tools/qa/qa-skin-tone.mjs` — real client,
  real worker, creator + town for each tone.
- Rendered torso pixels land at ratio 0.964-0.971 of target for both new
  tones, the same ratio the shipping `default` lands at (0.971). That equality
  is the proof the targets land where intended rather than reading
  bright or muddy.

### What Stage 1 deliberately does NOT do

At play scale the monkey reads as a **dark-skinned bro, not a monkey** — the
muzzle and the ears are what make it a monkey, and neither is a colour. The
alien is closer to its reference because more of what makes it alien *is* the
hide colour, but it is still a bald human silhouette. This is expected and is
the honest state of Stage 1: it proves the colour half and the pipeline, and it
is the cheap half.

## Stage 2 — the face and the ears (~1-2 weeks, no new body animation)

This is where it stops being a recolour and becomes a species.

**Ears** are the cheaper half despite being outside the silhouette.
`TRAIT_CATEGORIES` (`src/rendering/traitCategories.js`) already attaches
sprites at `head.center` / `head.eyes` with a `widthRatio`, and
`body-tops.json` carries a per-frame head-crown pin — **231 frames** today
(`stand-east-0`, `jog-southwest-5`, …), which is the poses the trait system
already sticks to, not all 823. It is **auto-derived** by
`tools/derive_body_tops.py`, so extending the coverage to a pose the ears must
also appear on (bow, sword, the armoured variants) is a tool run against the
sheets, not hand work — but it IS a step, so budget it rather than assuming
the pins are already there. `body-anchors.json` (306 entries) and
`tools/fit-headwear-scale.mjs` cover the rest of the placement. Cost is the
art (one small sprite per source direction) plus one new category row.

**Muzzle / brow** rides the face-decal path that already exists:
`playerDecal.js` has `FACE_BOX`, `stampRegion` and `splitSkinRegions`, and
`playerArt.js` already does *direction-aware* face decals — v2.3.2042
specifically taught it that "a face tattoo does not revolve to the back of a
head", which is the hard part of this problem and is already solved. The
species face layer is built-in art on that path rather than a player drawing.

**Eyes** need nothing new: `eyeMask.json` pre-masks the eye pixels across 32
sheets / 417 frames and `eyeColorCatalog` picks the colour. The monkey's white
sclera is the existing `white` option (v2.3.1929); the alien's black eyes are
the art's own default.

### Stage 2's three plumbing traps

1. **BOTH wire gates, in the same change.** A species id must go in
   `JOIN_COSMETIC_KEYS` (`server/src/join.js`) *and* `TRACK_COSMETIC_KEYS`
   (`server/src/index.js`). The code flags this shape three separate times:
   v2.3.1939 put a drawing key on one gate only and the result was a print
   that "appeared on join and vanished on the first two-second relay". For a
   species that means the player joins as an alien and turns human to
   everyone two seconds later.
2. **The two-letter key space is nearly full.** Taken: `bt bl hw fh hr sk hc
   htc fhc st stc ec ew ewc sa sb pa pb ta tf tm tb tr sp pp fp hg fr`. Note
   `sp` is the shirt *pattern*, not species. `rc` and `sc` are free.
3. **A new appearance key is NOT permanent for an existing character.** See
   below — this one is load-bearing and is not a species problem.

## The permanence hole (pre-existing, affects Stage 2)

`_loadOrCreateCharacter` (`server/src/join.js`) opens with:

```js
const stored = await this.state.storage.get('char:' + id);
if (stored && stored.look) return stored;
```

The character record is written **once, at creation, and never updated** —
there is one `put` and no key-level backfill anywhere in `server/src`. That is
correct for its purpose (v2.3.1814, "first-write-wins, because permanent has
to mean permanent"), but it means an appearance axis added *after* a character
was created is never stored for that character. The client's restore loop
(`applyCharacterRecord`) skips absent keys, so the pick survives in that
browser's localStorage and is re-sent on every join — visible to peers, and
**gone on a new device**, which is exactly the pre-v2.3.1814 condition the
owner asked to end.

Stage 2 needs a record-backfill path before a species key can honestly be
called permanent.

**This already affects shipped features.** `ew` / `ewc` (eyewear, v2.3.2361 /
v2.3.2424) landed after v2.3.1814, so for every character created before those
versions the eyewear is device-local rather than identity-bound. The
`look-parity` precheck gate does not catch it: that gate asks whether a stored
key is *restored*, not whether an existing record can ever *acquire* a new key.
Worth confirming and fixing on its own, separately from species.

Also note `char:<pid>.look` is snapshotted into the Ace hall-of-fame board
(`server/src/gamble.js`), so rows recorded before a species key exists will
render species-less. That is correct there by design — "the face that took the
bet" — but it is a second reader to keep in mind.

## Stage 3 — a real body rig (NOT recommended for these two)

82 distinct sheets / **823 frames** (stand, jog, hit, attack, pickup, mine,
fish, dodge, plus 25 bow and 15 sword variants), re-deriving
`anchors.json` / `body-anchors.json` / `body-tops.json` / `eyeMask.json`, plus
~13MB of gear art baked against the human silhouette. That is the whole
character pipeline again, per species. Justified only for a species that needs
a tail, digitigrade legs or different proportions — none of which the alien or
the monkey do.

**Precedent against faking it with scale:** v2.3.2268 removed the tall/short
build tab on the owner's own instruction — *"I changed my mind on the build
sizes during the create a character. It looks bad. Use the medium (default)
character only."* `kind: 'build'` and `_buildTile` are still in `NameModal.jsx`
unreached, which is what a future height axis would switch back on. A species
that is a scaled body should be expected to get the same verdict: species has
to be art, not scale.
