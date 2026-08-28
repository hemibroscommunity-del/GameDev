# The cape, and the contest that awards it (v2.3.2022)

Owner: *"a contest for the first 3 people to get a rare drop for a limited time
(maybe 1 in 200 chance from any monster) can get a special cosmetic. I'm
thinking a cape. You get this ticket that can be exchanged or consumed for a
cape."*

Two systems that ship separately and are testable separately. **Build them in
that order** — a cape with no contest is a cosmetic you can hand out by hand; a
contest with no cape awards nothing.

---

## 1. Why a cape is five pictures and not five hundred

This is the decision the whole spec rests on, so it is measured rather than
asserted. A t-shirt — a garment that deforms with the body — is **41 sheets and
512 frames**:

| sheet | frames |
|---|---|
| jog × 5 facings | 121 |
| swing × 3 | 92 |
| pickup-south | 58 |
| fish-south | 32 |
| hit × 5 | 30 |
| dodge × 2, fire, mine, stand × 5, … | the rest |

No generator draws 512 frames of anything coherently, and the repo has the
receipts for trying: `tools/qa/mp/mp-shirtarm.mjs` documents three separate
attempts to fix **one arm on one facing** by rule, all abandoned, and TRAPS §30
records the fourth.

So a cape is built like **headwear** (5 stills + a `meta.json`) and the
**sheathed shield** (`src/rendering/backShield.js` — one texture, placed by
shared geometry, drawn behind the body). Five pictures. It will not flap, and
that is the trade being made deliberately.

**One body size, not nine.** `_applyBuildScale` (`entityRenderer.js`) scales the
entire player container, so anything parented to it rides the height builds for
free. Art is drawn once.

**Five directions, not eight.** `west` / `northwest` / `southeast` are mirrored
at runtime (`resolveDirection`, `playerSprites.js`) and **must not be drawn** —
drawing them produces two sources of truth for one facing.

---

## 2. The art pipeline

Already built, and reused rather than reinvented:

    tools/make_cape_mannequin.py   ->  the reference sheet (5 figures, magenta)
    <image generator>              ->  cape drawn on it, person flattened green
    tools/import_cape_green.py     ->  5 PNGs + meta.json          (BUILT, v2.3.2022)

**Phase 1 is done.** The first real cape (`crimson`) is imported and sits
correctly on the body in all five facings. What the first pass through the
pipeline taught, recorded because every one of these cost a debugging round:

* **The generator does not return your sheet.** It came back 1853x849 for a
  2798x1130 reference — resized, and resized NON-UNIFORMLY (0.662 across,
  0.751 down), with the cell outlines only partly redrawn. The mannequin's JSON
  sidecar is therefore a convenience when the generator behaves and never a
  correctness dependency: the importer finds the cells and fits each one.
* **A cape hides the body it has to be registered against.** Fitting the green
  silhouette works for a hat because green is nearly the whole body. On north a
  cape leaves only the shins, so scaling the green's bounding box to the body's
  height blew that cell up to 201x102 with 81% hanging outside. **Scale comes
  from the stance** — the horizontal spread of the lowest quarter — because the
  legs are drawn on every facing whatever the cape covers.
* **Fit on the green, but crop the BLOB.** The transform is fitted on the green
  because that is what can be matched; it must be applied to the whole
  cape+person blob. Cropping the source to the green threw away everything
  above the shins on north and wrote a 265px cape — a hem and nothing else.
* **The generator outlines the person.** That outline is neither key colour, so
  it survives keying as a dark ring tracing the face, shin and boot: 718 stray
  pixels on east. It cannot be removed by darkness, because the cape's own
  outline is also black and removing that is the pine-bow defect (v2.3.2010).
  What separates them is what they sit between — only the person's ring has a
  key colour within reach on BOTH sides.
* **Reach across the whole transition.** That ring runs 3-4px wide, so dilating
  each key by 2 gives two disjoint halves whose intersection is empty; it
  dropped 18 pixels of 718. Radius 4 reaches across and takes it to 14.
* **Scale from the figure's HEIGHT, not from a limb.** v2.3.2022b seeded the
  scale from the stance — the spread of the lowest quarter — on the reasoning
  that legs are drawn on every facing however much the cape hides. True, but it
  assumes the generator kept the figure's PROPORTIONS. A re-generated northeast
  came back with boots 94px wide against the body's 57, seeding 0.61 while the
  same cell's height said 0.28; the cape rendered at over twice size and filled
  the frame. Height cannot be thrown off by one limb being drawn fat.
* **Re-generate one cell, import one cell.** A second sheet is usually a fix for
  a single facing, and its other four cells are a *different generation* — same
  prompt, different proportions. `--only northeast` replaces that frame and
  merges the existing meta forward, so four verified frames are not swapped for
  four unverified ones. This is how the owner's northeast correction (hood up,
  no face — right for a figure turned away) was taken without disturbing the
  rest.

The **green-screen key** is the load-bearing part. The generator paints the
person flat `#00FF00` and leaves the cape alone, so the import is a fact rather
than a guess:

> cape = every pixel that is neither the magenta backdrop nor the green person

`tools/import_headwear_green.py`'s header records what the guessing version
did: it inferred which pixels were hat by subtracting a rebuilt mannequin and
rescuing the result with colour tests and connectivity rules, and *"the whole
batch shipped with the drawn head still inside each hat frame, and the erase
written to remove it tore holes in the hats instead."*

The green silhouette also gives **registration** — the importer fits each cell's
silhouette against the real body, so the fit score doubles as a fidelity check
on how faithfully the generator redrew the figure.

### Measured advice, carried over from 15 headwear sheets (v2.3.1506)

These are about the generator, not about hats, so they apply unchanged:

* **One at a time beats batching.** Ten sheets in one go came back with east
  fits of 0.767–0.880. Sent individually, three of four landed 0.947–0.967.
* **East is always the weakest cell**, however the sheet was produced. Check it
  first.
* **A sheet drawn narrow and tall is the failure that matters.** The fitter
  scales it up to match the shoulders, and everything bottom-anchored lifts
  off. On hats that put them 7–9px above the skull; on a cape it will float the
  collar off the shoulders. Sheets scoring 0.95+ land within 2px.

### The prompt

> Here is a reference sheet with five pixel-art characters on a magenta
> background, each facing a different direction.
>
> Draw the same **hooded cape** on all five figures, matching each figure's
> facing and perspective. The cape hangs from the shoulders to about mid-calf.
> Colours: deep crimson outer, gold trim, a gold clasp at the throat.
>
> Rules:
> 1. Paint every character **flat pure green (#00FF00)** — no shading, no
>    outline, no skin, no clothing detail. The person becomes a solid green
>    silhouette.
> 2. The **cape** stays in full colour with its own black outline, in the same
>    chunky pixel-art style as the reference.
> 3. Keep the **magenta background exactly as it is** (#FF00FF).
> 4. Do **not** move, resize, re-pose or re-draw the figures. Same position,
>    same proportions, same cell.
> 5. Keep all five cells, in the same order and layout. Do not add directions.
> 6. On NORTH (back turned) the cape covers most of the body — that is correct.
>    On EAST (profile) it should read as a side-on drape, not a flat rectangle.
>
> Output one image the same size as the reference.

**Do this once per cape design, not batched**, per the measured note above.

---

## 3. Rendering: what is actually hard

Not the art. Three things, and the second has already bitten this repo once.

### 3.1 A cape draws BEHIND the body

The pattern exists. `backShield.js` keeps a **LOW clone below the body and a
HIGH clone above it**, and picking a facing only toggles `visible`. No renderer
computes a child index, which is *"the property that keeps the armour combos
working — a plate, greaves and a helmet all sit between the two clones by
construction, whatever order the gear layers are added in."*

A cape needs the same two-clone treatment: behind on south/southwest/east,
in front on north (you are looking at the back of the cape, and it covers the
body).

### 3.2 ⚠ Attack animations hide the real body

**This is the trap.** From `backShield.js`:

> During a sword swing or a bow shot the player's real body is HIDDEN
> (`entityRenderer._updatePlayer`) and the whole figure is redrawn by a stand-in
> in a different layer (`effectsRenderer`, `nodeLayer`) — but `pose` stays
> 'stand' or 'jog' throughout, so the v2.3.1782 back shield kept drawing in the
> player container against a body that was no longer there. **A shield hanging
> in the air beside a swing is the bug the owner is describing.**

A cape drawn only in the walking render will do exactly this. It must be drawn
in the walking render *and* in each attack stand-in, and — the lesson the
shield paid for — **the geometry lives in one module that both callers ask**,
because *"the moment a value is copied into two renderers it starts to drift."*

**Cheaper alternative worth an owner decision:** hide the cape during attack
poses. One `visible = false`, no stand-in work, and in a game where swings last
a few frames it may not read as missing. Recommended for v1.

### 3.3 The rest

* **Preloading is LAW** (CLAUDE.md). The cape is a global asset, so it
  registers in `preloadWorldAnimations()` — not per-zone, not lazy.
* **Remote players.** Headwear already does per-player textures cached by id;
  a cape follows that path, and the cosmetic must ride the wire so other
  players see it. New server-emitted fields need the `PRIVILEGED_EVENTS`
  treatment (`server/src/index.js`).
* **The creator preview** composites through `drawCharacterPortrait`, which is
  a separate path from the world renderer. A cape that renders in-world and not
  in the preview is a half-shipped cosmetic.

---

## 4. The contest

Server work. Read `docs/ARCHITECTURE-HANDOFF.md` first — this touches loot,
storage keys and idempotency, all of which it governs.

### 4.1 The drop

The server is authoritative for loot, so the 1-in-200 roll happens there and
nowhere else.

**A source constant to start, a live-ops flag to stop (v2.3.2029).** Three
versions; the argument is recorded because the obvious answer was wrong twice.

`CONTEST_START` / `CONTEST_END` constants (the original spec) would have meant
a worker deploy to start, extend or shut the event, and a deploy disconnects
every live player (`CLAUDE.md`, Deployment).

v2.3.2026 made it an opt-in live-ops flag, `_flagOn('event_capes')`. Wrong:
flipping it needs the `ADMIN_KEY` secret and a curl command against the
production worker. That is a fine trade for a large live game and a real
barrier for this owner, who does not work in a terminal.

v2.3.2028 made it live-by-default with a `disable_event_capes` kill switch,
matching `disable_jackpot` / `disable_dungeons` / `disable_threats` /
`disable_weapon_drops`. Wrong only in timing — it meant the contest began the
moment it merged, and the owner wants to pick the moment.

v2.3.2029 stops conflating two different questions:

| question | mechanism | who | needs a deploy |
|---|---|---|---|
| does the contest run at all? | `EVENT_LIVE` constant | owner, by merging a PR | yes — that IS the switch |
| stop it early once running? | `disable_event_capes` flag | operator with the key | no |

The deploy is not a cost here, it is the mechanism: the owner's start button
is a merge, which is a thing they already do comfortably. The one real
consequence — a deploy briefly disconnects everyone — is handled by merging
the enable *before* players gather, and that instruction lives in
`docs/OPERATIONS.md` rather than only here.

**v2.3.2097: the default is now `1/5` (owner's call, mid-demo: "Just update
it to a 1 in 5 chance. First 3 get it").** The cap of three is what ends the
contest -- it is checked before the roll -- so a generous rate changes how
FAST the three are found, not how many exist. The paragraph below describes
the 1/100 reasoning it replaced.

The rate stays `_flagNum('event_cape_rate', 1/100, 0, 1)`: adjustable
mid-event without a deploy, which is genuinely where that property earns its
keep. **Default raised from 1/200 to 1/100 (owner's call, 2026-08-27)** —
sized to the session rather than to forever. Five players need roughly 300
kills between them for three winners at 1/100; the cap of three is what
guarantees scarcity, so a rate nobody hits during the demo just means the
announced hook never lands.

### 4.2 ⚠ "First 3" must be an atomic server-side claim

**The part to get right.** A naive implementation reads a counter, sees `2`,
and grants. Two players who kill at the same tick both read `2` and both
become the third winner — and you have four capes and an unhappy thread.

The claim must be a single atomic read-modify-write in Durable Object storage,
in the same code path that grants the ticket. The GameRoom is a single-threaded
DO, which makes this straightforward *provided the whole claim sits inside one
uninterrupted block* — an `await` in the middle of it reintroduces exactly the
race it exists to prevent. (`ARCHITECTURE-HANDOFF.md`, DO concurrency rules.)

The counter is also the thing to **test adversarially**: a suite that fires N
simultaneous claims and asserts exactly 3 succeed.

### 4.3 The ticket, and redemption

* The ticket is a normal inventory item, so it survives logout via the existing
  persistence and can be seen, and (owner's ask) **exchanged or consumed**.
* Redemption is an `opId`-idempotent endpoint: a double-tap or a retry on a
  flaky phone connection must not consume two tickets or grant two capes.
  This is a convention the handoff doc already sets; follow it rather than
  inventing one.
* **The ticket is TRADEABLE** (owner decision, 2026-08-27 — overriding this
  spec's earlier recommendation). This needed *checking* rather than
  implementing, and the answer is that it already was: `market.js` is
  weapons-only (`kind:'weapon'` throughout), so a ticket cannot be listed on
  the order book, but the player-to-player **trade window** moves arbitrary
  inventory keys — `_sanitizeTradeOffer` accepts any string key under 32
  characters that is not an `Object.prototype` member, and
  `goldticket_crimson` is 18. **No code change was required.** What the
  decision did require is a test, because tradability is now a property a
  future tightening of that sanitizer could silently remove from a live prize.
  `eventcapes.test.mjs` pins it.
* **The ticket never expires** (owner decision, 2026-08-27). The event flag
  gates the *drop*, not the *redeem*: `_handleCapeRedeem` deliberately does
  not call `_capeEventOpen()`, so a winner who is offline when the window
  closes — or who is traded a ticket a month later — can still open it. Pinned
  by a test that closes the flag and redeems anyway.
* Tradability's real risk is **two tickets in one pair of hands**. That must
  not mint two capes (the ledger's one-per-account rule handles it) *and* must
  not burn the spare, or a player who bought one is out of pocket for nothing.
  Both halves are asserted.

### 4.4 What a winner keeps

The cosmetic is granted to the persistent `bp_` identity, not the session, so
it survives a device change.

**Not the same store the wardrobe uses**, though — that line was wrong, and
following it would have shipped a cape that vanished. Rule 1 of
`ARCHITECTURE-HANDOFF.md`: `_saveRpg` rewrites `rpg:<playerId>` from a fixed
field list and silently drops anything foreign, so a `ps._capes` array would
have looked correct for exactly one session. Ownership lives in the ledger
(`capegrant:<capeId>`), which already had to record who redeemed — one record,
so the count and the owners cannot disagree.

### 4.5 The merch draw has no level threshold

Owner decision, 2026-08-27. Everyone seen during the event window is an entry;
there is no minimum level to qualify. (Part C of the parallel session's brief —
the static `public/tools/draw.html` — is not built yet.)

---

## 5. Suggested order

| phase | what | testable by |
|---|---|---|
| 1 | Cape art: mannequin → generate → import → 5 PNGs + meta | the importer's own fit score |
| 2 | Cape renders in-world (behind body, hidden during attacks) + creator preview | a new `mp-cape` scenario, the four-render method `mp-hairmask` uses |
| 3 | Contest: window, roll, atomic claim, ticket item | a server suite firing simultaneous claims |
| 4 | Redemption: consume ticket → grant cosmetic, opId-idempotent | extend the nearest existing suite |

Phases 1–2 ship a cape you can grant by hand, which is worth having on its own
and de-risks the contest entirely.
