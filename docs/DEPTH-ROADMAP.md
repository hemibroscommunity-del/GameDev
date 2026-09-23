# BroTown Depth Upgrade Roadmap — existing game (v2.3.2633)

The costed companion to `docs/WORLD-DEPTH-PLAN.md`. That document is the
world art **constitution** — what a BroTown map should feel like. This one
maps it onto the renderer that exists, in the order the work should happen.

Every item carries four things, because a principle without them is a
principle nobody schedules:

| | |
|---|---|
| **Cost** | rough size of the change |
| **Perf risk** | against iPhone Safari, the primary platform |
| **Payoff** | how much of the flat feeling it actually removes |
| **Scope** | existing maps, future maps, or both |

## The finding this roadmap is built on

**Nothing in the renderer sorted by depth.** Searched 2026-09-20:
`sortableChildren`, `sortChildren` and `zIndex` had zero matches in
`src/rendering/`. Props were added to `entityLayer` in table order and stayed
there; the player could not pass behind a tree, a building corner or a rock.

> **Fixed in v2.3.2633 — item 1 below.** The finding is kept in the past
> tense rather than deleted, because it is the reason the rest of this
> roadmap is ordered the way it is.

That reframes the whole problem. **A large part of the "painted canvas"
feeling is architectural, not artistic.** The same paintings will read
differently the moment the player starts disappearing behind things — which
means the first fix is code, and it is cheap, and it does not need one new
pixel of art.

## What already exists (foundations, not finished principles)

Worth knowing so the work is not paid for twice — and worth stating
precisely, because "done" would be wrong in all three cases:

- **Grounding (§7)** — contact shadows existed as a shared 64×32 radial
  ellipse. **Removed at v2.3.2632**: the owner reported they looked worse
  than nothing, and they did, for a structural reason (see below). §7 was
  always broader than shadows — footprints, terrain reaction, displaced
  grass, partial burial, water response are all still open, and the game now
  has *no* grounding cue at all. This foundation went backwards on purpose.
- **Atmosphere (§13/§15)** — every zone declares `atmosphere: { tint,
  vignette }`. That is a zone *mood*, not atmospheric **depth**: distant
  terrain losing contrast and detail, and particles passing both in front of
  and behind the player, are separate cues and neither exists.
- **Elevation (§5)** — the town painting has real cliff faces with visible
  vertical transitions, so the art can express height. That is not the same
  as height being used as a composition and traversal tool across all maps.

## The depth stack does not mean five full-screen plates

§3 lists far background / background / gameplay / midground / foreground /
atmosphere. Read literally on twelve zones that is 3–5× the texture memory
per zone, on the device that already forced per-zone loading because of RAM.

The principle is only that **the eye needs evidence of multiple spatial
planes.** A few canopies, an overhang, local fog, a cliff lip, a cropped
foreground rock, y-sorted props and particles all supply that evidence.

> **Rule.** Create depth with the smallest amount of additional visual
> material that will do it. Prefer reusable and local depth elements over
> additional full-map plates.

---

## The order

### 1. Dynamic spatial occlusion — walk behind and in front of things

**SHIPPED v2.3.2633.** What follows is what was asked for; the notes at the
end of this item record what it actually took.

**Cost** small · **Perf risk** low · **Payoff** very high · **Scope** every map, instantly

Turn on depth sorting for the entity layer and give every sprite a sort key.

**The sort key is the object's GROUND-CONTACT LINE, not its sprite position
or its centre.** A giant tree canopy and a pebble both sort by where they
*touch the world*. Props already declare `blockW`/`blockD` footprints
(`worldProps.js`), so the contact line is data that exists — `propFootprint`
already returns it.

Two things to get right, because both are cheap now and expensive later:

- **Tall props need a contact line separate from their art.** The mayor's
  house is 400px tall and touches the ground at its base; sorting by sprite
  Y would put the player behind the whole building from half a screen away.
- **Sorting must be stable.** Two objects on the same row should not swap
  every frame; break ties on a fixed id.

Nothing else on this list changes as many screens for as little work.

**How it shipped (v2.3.2633).** `src/rendering/depthSort.js` holds the rule;
`entities` and `gatherNodesFront` are the two sortable layers.

Two things the plan did not anticipate:

- **The local player's body is not in the entity layer.** It lives in
  `player`, above it, and a lot of code depends on that — including the
  gathering-gesture promotion of v2.3.1713. Rather than move the body,
  occluders choose which *side* of the player layer to sit on each frame
  (`wantsFront`), then sort by ground line within it. Same result, far
  smaller blast radius.
- **Trees were already pinned in front of the player** by v2.3.1500, which
  answered "walking behind a tree should hide me" by making trees occlude
  from *every* position. That is now the same ground-line test, so standing
  south of a trunk no longer paints its canopy over your head.

A 2px hysteresis band sits on the front/back decision: without it an
occluder standing exactly on the player's line flips layer on every
sub-pixel wobble of the walk and reads as a flicker. Stability inside a
layer is free — `Array.prototype.sort` has been stable since ES2019, so
equal keys keep the order they had.

`mp-townprops` asserts the rule rather than one arrangement of the town: the
entity layer is monotonic in ground line, the sort key equals that line, and
the auction house changes sides when the player walks around it. The old
"every prop draws before every NPC" assertion was the static rule this item
removes, and it was rewritten rather than deleted.

**What this item did NOT do.** Monsters and trees still sort by bucket, not
against each other: a tree is in front of the player or behind them, and the
monsters sort among themselves in the entity layer. Full tree-vs-monster
ordering needs the nodes to join the sorted layer, which is a bigger change
and was not worth bundling here.

### 2. Exploit the depth assets already in the art

**Cost** small · **Perf risk** none · **Payoff** medium-high · **Scope** existing maps

Once (1) lands, the existing paintings have cliffs, fences, terraces and
building masses the player can already move behind. This is mostly a
placement pass: put props and NPCs where the art gives them something to be
occluded by, rather than in open cobble.

### 3. Recompose maps around large forms

**Cost** medium · **Perf risk** none · **Payoff** high · **Scope** existing maps, selectively

§9, §10, §24. Fewer evenly-spaced props; more masses, clusters, passages,
clearings and framing. The town respread (v2.3.2628) is a first pass at
this and shows the method: render the live data onto the live art, look at
it, move things (`tools/maps/render-town-layout.mjs`).

### 4. Strengthen elevation as traversal, not scenery

**Cost** medium-large · **Perf risk** low · **Payoff** high · **Scope** future maps mostly

§5. Height that the player *moves through* — up a ramp, down into a basin,
along a ledge — rather than height the player looks at. On existing maps
this is limited by the paintings; on new maps it is a composition rule.

### 5. Cheap foreground depth

**Cost** medium · **Perf risk** **medium — watch this one** · **Payoff** high · **Scope** both

§8, §17. Selected canopies, cliff lips, building edges, branches — drawn in
front of the player, cropped by the screen edge. **Not** whole-screen
foreground plates (see the rule above). Each one is a small transparent PNG
that can be reused across maps, and each is another texture on the per-zone
budget, so this needs a cap per zone agreed before the art is made.

> **The cap is now set (v2.3.2649): 6.00 MB of decoded RGBA per zone —
> the cost of the zone's own map — and at most 8 decor assets, at a 512 px
> long-edge ceiling.** `docs/ART-ASSET-PHASES.md` carries it, with the size
> table and the commissioning briefs. It was set because the first frost
> batch came back at 6.00 MB *per asset* (1254², the size of a whole map)
> and three of its four pieces were edge-cropped — no ground-contact line,
> so nothing in the renderer can place them. **This item is what unblocks
> those three**; free-standing masses need no code and ship under item 1.

### 6. Atmospheric distance

**Cost** small-medium · **Perf risk** low · **Payoff** medium · **Scope** both

§13. Push the background back with contrast, detail and haze before adding
any new assets. Partly a shader/tint job over the existing painting's far
band, partly an art-direction note for new maps.

### 7. Paths that participate in terrain

**Cost** medium · **Perf risk** none · **Payoff** medium · **Scope** future maps

§11. Paths that pass between rocks, under canopies, behind buildings. Needs
(1) to be worth anything — a path "behind" a building means nothing until
the player can actually be behind it.

### 8. Environmental motion at multiple depths

**Cost** medium · **Perf risk** **high** · **Payoff** medium-high · **Scope** both

§16. Snow behind the player and flakes in front of them is one of the
strongest volumetric cues in 2D. It is also a particle system on a phone.
Needs a hard budget (particle count, one system per zone, off under a frame-
time threshold) written down *before* it is built, not tuned after.

### 9. Apply the full standard to new maps automatically

**Cost** none (process) · **Payoff** compounding · **Scope** future maps

§37's build order and §38's checklist become part of making a map, so new
maps are born with depth instead of having it retrofitted.

### 10. Retrofit old maps selectively

**Cost** open-ended · **Scope** existing maps

Only where the improvement is most visible — town first, then whichever
zones players spend real time in. Explicitly **not** a rebuild of all twelve.

---

## Polish, later: the silhouette shadow

> **BUILT BEHIND A SWITCH, v2.3.2710**: `?lightfx=1`, off by default until
> the owner has seen it on a phone. See `docs/specs/light-and-shine.md`.
> All three reasons below were answered rather than waived:
> 1. **Light direction:** every zone now has one, read off its painting
>    (`lightfx/zoneLight.js`). The sunless zones have none and cast nothing.
> 2. **Batching:** the shadow pieces share the figures' own textures, so they
>    batch with each other. One filter pass for the whole `shadows` layer
>    turns them translucent, which also keeps overlaps from darkening.
> 3. **"Reads as a person lying down":** the projection is a shear along the
>    light, not a flip. Low alpha, in the zone's own shade colour, with the
>    soft edge the CSS-resolution pass gives, reads as a shadow in the
>    pictures (`docs/specs/img/light-and-shine/`). That verdict is the owner's.
>
> It covers every figure, not just the player and bosses (NPCs, monsters,
> peers), and it follows the swing and gather stand-ins. What follows is
> the reasoning as it stood before it was built.

**Cost** medium · **Perf risk** medium · **Payoff** low-medium · **Scope** player and bosses only

Tint the character's own frame black, squash and skew it along the zone's
light direction, draw it under the body. It animates for free and matches
armour and weapons exactly, because the composited frame *is* the texture.

Three reasons it sits down here rather than up top:

1. **It needs a per-zone light direction first.** The paintings already have
   their own baked light. A shadow that disagrees with the map looks worse
   than no shadow — which is precisely what the ellipse proved.
2. **It costs the batching.** The removed ellipse was one shared texture so
   every shadow drew in one call. Per-frame silhouettes are per-entity
   textures; composited gear frames are separate render textures. Player-only
   keeps that to one extra draw call.
3. **A squashed 3/4 silhouette reads as a person lying down**, not a shadow,
   because the art shows the front of the body. It needs heavy squash, low
   alpha and a blur to work — and at that point it is close to a blob again.

**Why the ellipse was removed (v2.3.2632), and why re-adding one is not the
fix.** A symmetrical radial blob is a shadow for a scene lit from directly
above. BroTown's maps are painted with their own light and throw long
shadows to one side; a blob agreed with none of them and read as a smudge on
the ground. That is a property of the technique. Darkening it (v2.3.1300c)
and re-anchoring it (v2.3.1824) were both tried and neither could fix it.
Any future grounding cue has to agree with the map it sits on — which is
item 1 of this section, not a tuning pass.
