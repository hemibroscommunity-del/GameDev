# TRAPS — plausible-but-wrong moves (v2.3.1204)

A registry of changes that look obviously right and are known to be
wrong. Each was attempted, or nearly attempted, by a competent session.
Read before "fixing" anything old; cite entries by name in reviews
(`/repo-review` does this automatically). Format: the tempting move →
why it looks right → why it's wrong → the receipt.

## 1. Reviving the arena_bet display handler

**Tempting:** the gameEvents switch had a shadowed `case 'arena_bet'`
feeding the betting UI — un-shadow it and remote bets "just work"
(#217 and #219 both tried exactly this). **Wrong:** the UI's consumers
predate remote delivery — Active Bets crashes on bettorId-shaped bets,
"Your Bets" has no ownership filter, the sender's own echo
double-counts, and on `!caps.sponsor` workers the legacy pot-split
mint counts FORGED remote amounts into `S.rpg.coins`. **Receipt:**
#220's adversarial review; the explicit-ignore case + `no-duplicate-
case` lint; handoff item L. A real stake board is item A's caps-gated
follow-up.

## 2. Adding a field to the rpg blob ad hoc

**Tempting:** the blob is right there — stick the new counter on `ps`
and it persists. **Wrong:** `_saveRpg` rewrites `rpg:<id>` from a
FIXED field list; a foreign field survives until the next save, then
silently vanishes — the bug ships green and eats data later.
**Receipt:** handoff rule 1. The sanctioned ways: a new storage key
registered in the rule-2 table, or add to the fixed list + delta-emit
list the way goldNuggets/goldBars did (v2.3.1192,
`server/src/persistence.js`).

## 3. Building a party XP-sharing system

**Tempting:** parties shipped (v2.3.1185) with no XP split — obvious
gap, obvious feature. **Wrong:** kill credit is ALREADY
damage-contribution (GDD §7, `xpRecipients` in the kill path); a
roster-based split double-pays or re-derives what combat already
settles. Item D's danger note pinned this: UI + roster only, do NOT
touch the §7 share math. **Receipt:** `docs/specs/party.md`,
`server/src/party.js` header, handoff item D.

## 4. Server-rolling the cook minigame outcome

**Tempting:** rule zero says migrate client logic server-side, and the
client-reported `kind` looks like a trust hole. **Wrong:** the outcome
is player TIMING, not a skill roll — a server roll would burn
correctly-timed flips and punish skilled play. The documented posture
is client-reported outcome + server physics floor (sub-window
`cook_request` bursts dropped, v2.3.1167) + rate limit (v2.3.1104).
**Receipt:** handoff item L (resolved as documented trust posture);
`docs/specs/cooking.md`.

## 5. Single-slot disconnect/away state

**Tempting:** one `awayId` + one `graceUntil` per duel — simple, and
covers the common case. **Wrong:** both players dropping (routine on
iOS tab suspend) makes the second disconnect erase the first's clock;
a lone rejoin left the duel 'active' forever and blocked BOTH players
from any new duel. Anything per-participant needs a per-player map.
**Receipt:** duel `away` map, v2.3.1175 (#220); `docs/specs/duels.md`.

## 6. Plain `{}` keyed by client-supplied ids

**Tempting:** `const clocks = {}` is idiomatic JS. **Wrong:** a
client-supplied key of `'__proto__'` makes the assignment a silent
no-op — the entry never exists and whatever it guarded never fires.
Recurred THREE times in one day: duel.away v2.3.1175, party meta
v2.3.1185, amulet tiers v2.3.1192 (table lookups need
`hasOwnProperty.call`, not truthiness). Use `Object.create(null)` or
`Map`; `tools/dev/precheck.mjs` check 6 warns on the pattern.
**Receipt:** CLAUDE.md AI-session protocol; `docs/DEV-TOOLS.md`.

## 7. Treating the GDD / ARCHITECTURE.md as build specs

**Tempting:** they're detailed, authoritative-looking design docs —
"restore" the code to match them. **Wrong:** both are STALE early
design thinking (owner directive 2026-06-13): they describe systems
never built and miss systems that shipped. Code is truth; the
precedent library is `docs/specs/*.md` + `docs/ARCHITECTURE-HANDOFF.md`
(whose "GDD contradictions" section lists known clashes, all resolved
code-side). **Receipt:** CLAUDE.md doc-trust section.

## 8. Deploying the worker from a local machine

**Tempting:** `wrangler deploy` is one command and CI is slow.
**Wrong:** a laptop deploy of a stale clone on 2026-06-10 rolled back
three weeks of server work and broke combat in production — the
incident that forced this monorepo. Server deploys happen ONLY via
merge to main touching `server/**` (`.github/workflows/
deploy-worker.yml`). **Receipt:** CLAUDE.md deployment section.

## 9. Extending a legacy caps fallback

**Tempting:** the `!caps.X` branch already handles old workers — add
the new behavior there too so it "works everywhere". **Wrong:**
fallbacks are legacy remnants that exist to be DELETED once production
workers advertise the capability (rule zero), and every line added to
one widens the self-credit/forgery surface on exactly the workers that
can't validate it. New behavior goes server-side behind a NEW caps
flag — one that means precisely the op it gates (the `caps.gems`
lesson: a v2.3.1192 worker advertises `amuletForge` but denies the
gem-cut op, so gems needed their own flag). **Receipt:** handoff rule
zero + rule 19; `server/src/join.js` caps comment.

## 10. Un-scoped "fix the docs" edits

**Tempting:** a stale line in ARCHITECTURE-HANDOFF — rewrite the whole
section while you're there. **Wrong:** parallel sessions edit the same
living docs; broad rewrites overwrite NEWER truth from work you
haven't seen and manufacture merge conflicts. On 2026-07-07, #217,
#219, #220, and #223 all refreshed the same handoff items and claimed
overlapping version tags; the consolidation had to three-way merge doc
conflicts and renumber tags (commits a9f8f51b, bd31c60c). Edit only
the lines your change makes true, tagged with your version.
**Receipt:** the 2026-07-07 post-mortem (`docs/DEV-TOOLS.md`).

## 11. Styling or demoing the wheel-gated inventory surface

**Tempting:** `src/ui/mobile/InventorySurface.jsx` / `EquippedTab.jsx`
/ `InventoryTile.jsx` + `inventoryBus`/`mockItems` look like THE
inventory — they're polished, mock-seeded, and wired in GameApp.
**Wrong:** their only entry points are the utility wheel
(`wheelBus.onActivate('inventory')`) and the debug console (`inv
open`), and the wheel trigger is not rendered anywhere — dead code,
owner-confirmed 2026-07-11. Players use the DASHBOARD Bag panel
(`dash/InventoryPanel.jsx`) and Loadout slots. On v2.3.1228 the
Lantern Slate rarity system initially landed on the unreachable
surface and had to be re-applied to the live loadout weapon slot.
Check reachability (who renders the trigger?) before styling or
demoing any surface. **Receipt:** PR #259; `src/ui/GameApp.jsx`
wheelBus wiring.

## 12. Lazy "load on first sighting" for a new animation

**Tempting:** a new monster/skill/FX sheet is big, town sessions never
see it — copy the v2.3.1119 variant pattern and load it lazily on
first render; the loading screen stays fast. **Wrong:** the owner has
repeatedly reported first-use hitches and issued a standing directive
(2026-07-19, CLAUDE.md "Animation preloading is LAW"): EVERY animation
loads during the loading screen, which is explicitly allowed to take
longer. First-use texture loads are regressions, not optimizations.
**Receipt:** v2.3.1358 — the central manifest
`src/rendering/preloadAnimations.js` (awaited by the intro gate) plus
`window.__btPreloadReport` for verification; the v2.3.1119 lazy
variant loading it retired is the pattern NOT to copy.

## 13. Trusting a message because it's named like telemetry

**Tempting:** `track` is analytics — cosmetics, appearance, an inspect
card. It has been there since the prototype, every client sends it every
2 seconds, and the trust-boundary work (rules 13–21) audited the
*gameplay* handlers. **Wrong:** its handler ran
`Object.assign(this.playerState[session.id], msg.data)` with no
allowlist, so it was one of the most powerful write primitives in the
room. A single crafted `track` set coins to 999999999, power to 99999,
level to 500, minted `weapon.tierMult: 99` (legit ceiling ≈ 2.6, so it
walked past `_sanitizeWeapon`), and teleported the sender — while the
identical jump sent as `move` was correctly rejected by the 500 px/s
cap. `_saveRpg` then persisted all of it. The v2.3.1125 clan-tag fix had
already touched this exact line and hardened only `clanTag`. **The
lesson:** audit a handler by what it WRITES, not by what it is named or
by which era it came from; and prefer an allowlist, so the next
unreviewed field is dropped instead of trusted. **Receipt:** v2.3.1465 —
`TRACK_COSMETIC_KEYS` / `TRACK_STATE_EXCLUDED` in `server/src/index.js`,
handoff rule 16, `anticheat.test.mjs` §7, WIRE-PROTOCOL "track is
cosmetics-only".

**Second receipt, v2.3.1627 — `join` was the same primitive, bigger, and
survived the v2.3.1465 pass by four months.** `_handleJoin` spread the
raw blob into authoritative `playerState` AND into `session.data`, which
`getAllPlayerData()` spreads LAST over `playerState` — so a forged field
also overrode real state in the `state_sync` every other player got. One
join carrying `_zoneEntryGraceUntil` bought permanent immunity to
monsters, all PvP, duels, arena and dungeon bosses, on an id that needs
no passphrase. **The compounding lesson:** fixing the handler you were
looking at is not fixing the CLASS. After closing a trust hole, grep for
every other handler with the same write shape — `...msg.data`,
`Object.assign(ps, …)`, a spread into authoritative state — and close
them in the same pass, or the next audit finds the one you walked past.
Closed with `_sanitizeJoinData` (join.js), same allowlist shape;
`anticheat.test.mjs` §8.

## 14. Switching `clipsHair` on because a hat has a mask folder

**Tempting:** `make_hairmask.py --all-with-masks` treats the presence of a
`hairmask/` folder as the record that a hat was judged to cover the skull,
so rebuilding every mask and setting the flag looks like a pure no-op
cleanup. **Wrong:** a mask CUTS hair everywhere it is transparent, so the
flag is only safe on a hat that actually covers the crown. The Naruto
Headband, Red Bandana and Blue Bandana are bands across the forehead —
clipping to them left a bare skin dome above the band (owner: "on some
angles the hair is bald"). Measured exposed scalp: 603 / 393 / 380px,
against 65px for the worst real cap, so the shapes separate cleanly.
**Receipt:** v2.3.1532 — `bald_px()` in `tools/make_hairmask.py` now
REFUSES to set the flag above `BALD_T`, and those three ship
`clipsHair: false` with their mask folders DELETED (a folder left behind
is exactly what `--all-with-masks` would use to turn it back on).

## 15. Changing stored art size without auditing every placement path

**Tempting:** `_placeTrait` normalises by texture size (v2.3.1526), so
halving trait art to 128 is transparent to the renderer. **Wrong:** there
are TWO placement paths. `_placeStandaloneTrait` — the one that composites
hat/hair/beard onto the pre-drawn stand-in bodies for sword swing, bow
shot, chopping, cooking and firemaking — divided the anchor by the
TEXTURE's own width, so a 128 texture doubled the anchor fraction: the
pivot ran off the end of the sprite and the trait flew off the head at
half size (owner: "during the attack animations for bow and sword the head
customization flies off the head"). It shipped green because nothing on
the login screen or the idle/jog body goes through that path.
**Receipt:** v2.3.1532 — the same `W = 256` / `norm = W / tex.width`
normalisation, and `grep -n 'anchor.set('` over `src/rendering/` as the
audit that finds every path at once.

## 16. Trusting the session brief's version high-water

**Tempting:** the SessionStart brief prints "version high-water on
origin/main" and the next free tag — claim it and go. **Wrong:** that
scan reads COMMIT MESSAGES, and a squash-merged PR whose message states a
RANGE ("v2.3.1576–1587") hides every individual tag inside it. On
2026-07-29 the brief reported high-water 1580 while the tree already
contained 1587, so a parallel session claimed 1576–1580 — every one of
them a duplicate of #336's range — and only noticed AFTER both merges.
`grep -rhoE 'v2\.3\.1[0-9]{3}' src/ server/src/ tools/ | sort -t. -k3 -n
| tail -1` is the honest high-water: the tree, not the log.

`precheck.mjs` gets this RIGHT — it reads the tree and would have failed
the push. The real hole is TIMING, not tooling: #336 merged after that
session branched and before it merged, so every local gate it ran was
honestly green against the base it started from. The lesson is to
re-check the high-water immediately BEFORE merging, not only before
branching — precheck's verdict expires the moment anything else lands.
**Receipt:** v2.3.1588 — the collision itself; #336 vs #337 both
shipping a v2.3.1579, and both independently diagnosing the same login
trait-resolution problem because neither could see the other in flight.

## 17. Sharpening art that is about to be minified

**Tempting:** downscaled art looks soft where it is enlarged, and
downsample-then-sharpen is standard practice — so bake a mild unsharp
into the smaller frames. **Wrong** once anything else supplies real
resolution: v2.3.1579 (#336) restored 256px `hi/` art for the portrait,
which is the only surface that MAGNIFIES traits. The 128px frames are
consumed solely by the Pixi world path, where traits are MINIFIED, and a
pre-sharpened texture carries its halos into the downscale as edge crunch
while buying no detail. Sharpening is a function of the DISPLAY size, so
it stops being valid the moment a different tier serves the magnifying
surface. Check who actually consumes the file before baking display
compensation into it. **Receipt:** v2.3.1588 — `tools/rebake_traits.py`
`--amount` defaulted back to 0, keeping only the premultiplied-alpha
correctness fix; the strength sweep is preserved in its docstring as the
evidence if the `hi/` tier is ever removed.

## 18. Assuming a new client→server message reaches the worker

**Tempting:** you add a `case 'my_request'` to the switch in
`server/src/index.js`, call `S.channel.send({ type: 'my_request', … })`
from the client, and the round trip is done — that is how every other
handler in the file looks. **Wrong:** `channelShim.send` in
`src/networking/wsClient.js` is an ALLOWLIST, not a transport. It is a
ladder of `if (msg.type === '…') { ws.send(…); return; }` passthroughs,
and anything that falls off the bottom is treated as a broadcast (or
dropped). A type with no line there never leaves the browser, and the
failure is silent in both directions: the client's send returns
normally, the worker simply never hears it, and a client-side assertion
on the local prediction passes happily. So a new client→server type
needs THREE things, not two — the server `case`, the handler, and a
passthrough line in the shim.

The tell is a headless check that reads the WORKER (`H.adminPlayer`) and
disagrees with the client's own copy of the same fact. That is also why
`H.instrumentWire` counts what the client *tried* to send: a wire count
of 1 with an unchanged server blob localises the break to the shim
immediately.

**Receipt:** v2.3.1702 — `firemaking_request` shipped with a server case,
a tested handler (`_handleFiremakingRequest`, green in
`lifeskills-economy.test.mjs` against mocked storage) and a client send,
and consumed nothing: the worker's blob still read `{ wood_oak: 2 }`
after the fire was lit. The unit suite could not see it, because the
missing piece was between the two things it mocks. Caught by
`tools/qa/mp/mp-authority.mjs`, which asks the worker.

## 19. Reading "PvP is opt-in" as "PvP hits who you aimed at"

**Tempting:** the PvP path looks target-shaped from the client. You lock
one player, the swing carries an angle to that player, and the whole gate
reads as a per-target decision — so a friendly-fire report sounds like a
targeting bug, and the fix sounds like "stop targeting the friend".
**Wrong on both halves:**

1. **Melee PvP is a CONE, not a target.** `_resolvePvPAttack`
   (`server/src/combat.js`) walks EVERY player in the zone and hits each
   one inside the arc. The `payload.target` single-target hint (v2.3.1306)
   is sent by the PROJECTILE path only — melee has never carried it. So
   one deliberate lock on an enemy turns every subsequent swing into an
   area attack against everybody standing in front of you, teammates
   included.
2. **`lawless` is not a rare, marked-off mode.** Every wilderness zone in
   `server/src/data.js` carries `lawless: true` — meadow included. The
   "open PvP zone" is the whole game outside town, so any two players
   grinding together were free-fire on each other by default.

The consequence is that anything you want to be safe from PvP must be
refused in `_pvpAllowed` itself, and its ORDER is load-bearing: consent
(duel / arena / answered threat) is checked FIRST, so a deliberate duel
between two teammates still works, and only the lawless free-fire branch
below it is shielded.

Client-side gates are a picture, never a rule. `monsterCombat.js` decides
what is worth SENDING and what to paint; the worker decides what lands.
Fix both or you fix neither — gate only the client and an old build still
kills your teammate; gate only the server and the game still shows blood,
plays the hit sound and shakes the screen over a friend taking no damage.

**Receipt:** v2.3.1742 — owner: "party mode looks like it needs fixed. It
auto targeted my teammate and looked like my attacks were damaging them."
They were. `_pvpAllowed` had no party test anywhere in it, and the
optimistic hit visual had no gate at all — it painted a HIT popup, blood
and screen shake over every nearby player on every swing, in every zone,
duel or not. Pinned by `server/test/party.test.mjs` §11 and
`tools/qa/mp/mp-party.mjs` (whose control taps the SAME player after the
party breaks up, so a lock-free pass cannot be a missed click).

## 20. Fixing an invisible overlay by raising its z-index

**Tempting:** your new overlay measured onto the right control, at the
right size, at opacity 1 — and it is not on screen. Something with a
higher z-index must be on top of it, so raise yours. **Wrong:**
`.brotown-wrap` is `position:fixed`, which Chrome treats as its own
stacking context, so EVERY element inside the wrap is flattened onto one
rung of the root stack. Nothing inside can outrank anything outside it —
the dashboard band, the HUD player chip, the keyboard-hints strip — no
matter what number you write. A v2.3.1796 coach mark was still invisible
at `z-index: 99999`; the same box appended to `<body>` painted
immediately, which is the two-minute experiment that settles it.

**The fix is where the element lives, not what number it carries:**
render it as a SIBLING of the wrap (BroTown.jsx renders
`KeyboardHintsPanel`, `UpdateBanner`, `ChatPanel` and `QuestCoach`
there). Being outside then puts you ABOVE the in-wrap modals, which is
its own hazard — solve that by hit-testing what you point at
(`elementFromPoint` on the control's centre; if a scrim answers, stand
down) rather than by enumerating modal classes, which goes stale.

**Receipt:** the third sighting of the same trap — the HUD player chip
(v2.3.1235) and the keyboard hints (v2.3.1728), both documented in
game.css, each needed a NON-z-index fix (geometric clearance and a
`.bt-inspect`-keyed hide). `src/ui/mobile/QuestCoach.jsx` header;
`tools/qa/mp/mp-questcoach.mjs`.

## 21. Trusting a loose pixel-classifier over a look at the crop

**Tempting:** you cannot see your change in a screenshot, so you count
pixels instead — `r>150 && g>110 && b<130` is "brass", and 688 of them
inside the card's box says the card is painting. **Wrong:** that filter
also passes the coin counter, the brass chip borders, the level-up ring
and a good deal of town cobble. The count "confirmed" a card that a
cropped screenshot then showed was not there at all, and nearly ended
the investigation on the wrong answer. The same error is on record for
skin measurement (v2.3.1788: town cobble reads as skin, ~51,000 "skin"
pixels in an 80x90 crop, before and after identical).

**The rule:** a colour count is evidence only against a CONTROL — the
same crop with the feature off — or when the classifier is tight enough
that nothing else in frame can pass it. Otherwise crop the region and
look at it. `H.screenshotPixels` supports both; only one of them is an
argument.

**Receipt:** v2.3.1796 session log; v2.3.1788's stand-in skin work.

## 22. Transcribing an orchestral track into chiptune

**Tempting:** the owner wants NES-style music and already has seven
orchestral tracks. A bit-crush obviously won't do it (that is a damaged
recording, not chiptune), but *transcription* looks like the real answer:
pull the melody and bass out with an STFT, quantise to a grid, replay on
pulse/triangle/noise. The pipeline works, the numbers look right, and
each track compresses to under a kilobyte of note data — which also
happens to solve the 40–56 MiB resident-PCM problem in one move.
**Wrong:** it does not sound like the song. Orchestral texture is dense
polyphony; monophonic pitch tracking has to pick ONE line out of it, and
what it picks wanders between instruments even after a Viterbi path
constraint and a key snap. Owner's verdict on the result: *"It doesn't
sound anything like the original song and not very good. I'd rather find
chiptune music someone already made."*

**What was actually true along the way, and is worth keeping:** the first
render sounded like isolated notes and the fix was the ENVELOPE, not the
transcription (v2.3.1806 — held segments instead of per-step strikes;
near-silent windows 36.9% → 0%). So "it sounds wrong" and "the notes are
wrong" are separate diagnoses, and the voicing is the cheaper one to check
first. The note-data-instead-of-audio argument also still stands on its
own merits for any chiptune source, however the music is obtained.

**Receipt:** `tools/audio_to_chiptune.mjs` (kept, with this verdict in its
header); v2.3.1804 and v2.3.1806; the comparison artifact built for the
owner to judge by ear rather than by my description. If music like this is
wanted, SOURCE it — the sourcing constraint is short, looping, MONO,
because resident memory is duration × rate × channels regardless of what
is on the track.

---

## §23 — An alignment score with no control is a random number generator (v2.3.1813)

**The move that looks right:** two painted map halves need stitching, so
write a scorer that slides one over the other and picks the offset with the
lowest pixel difference. Report the winner. Build the map from it.

**Why it is wrong:** every scorer tried on this pair was junk, and each one
was *confidently* junk — it returned a specific "best" answer with a
plausible-looking margin.

1. A per-pixel overlap search returned its best at the **smallest overlap
   offered**, with the vertical offset pinned at the **edge of the search
   range**. Both are the signature of a metric that is not measuring
   alignment: fewer sampled pixels means a lower mean error, so an
   unnormalised score always prefers less overlap.
2. A structural (downsampled, cobble-vs-cliff classified) search looked much
   better — until its control was checked. Matching an image **against
   itself**, which must score 0, scored **0.29**. The control was comparing
   two different parts of the same image, so the metric was measuring
   nothing at all, and its "winner" was noise wearing a decimal point.

**What was actually true**, once controls existed to make numbers mean
something: adjacent columns *inside* one half differ by ~12/channel
(the texture's own noise floor), the best cross-piece join by ~34, and two
unrelated columns by ~65. The halves are independently generated, so their
cobble **cannot** align pixel-wise at any offset — a seam hunt was never
going to converge, and every score above was ranking noise.

**What worked:** looking at them. Rendering each half on its own answered
the ordering question in seconds (one is bounded by cliff on the left and
opens right; the other is the mirror), and it agreed with the *one*
automated result that had survived.

**The second half of the trap:** having established the textures cannot
match, the reflex fix is a wide cross-fade. That is also wrong, and
measurably so. Across a 240px fade the brightness was *flatter than the
surrounding cobble* (max column step 3.98 vs 4.81) — and it still looked
wrong, because **averaging two uncorrelated textures produces low-contrast
mush**, a blurred bar the eye finds instantly even though no edge exists.
Widening the fade widens the mush; 240 looked worse than 100, not smoother.
The fix is an **irregular hard cut** — full contrast on both sides, the
boundary wandering on a low-frequency wobble so there is no straight line to
find. After it, seam-band contrast is *statistically indistinguishable* from
the cobble beside it (4.72/1.28 vs 4.69/1.34), which is the number to aim
for: not "smoother than its surroundings" (that is blur) but "the same".

**Rules this leaves:**
- A similarity score without a control that must return a known value is not
  evidence. Include a self-match and a deliberately-wrong match, every time.
- A "best" sitting at the edge of the search range means the range is wrong
  or the metric is.
- Normalise for sample size, or the scorer just picks the smallest sample.
- When the thing being measured is visual and cheap to render, render it.
- Flat brightness across a seam does not mean an invisible seam. Contrast
  matching the neighbourhood does.

**Receipt:** `tools/maps/build-town-v17.mjs` and its header.

## §24 — Reading a timeout's constant instead of its clock (v2.3.1913)

**Tempting:** the owner reports characters idling in the world for
hours, so go looking for the AFK timeout. You find it immediately —
`IDLE_TIMEOUT_MS = 120000`, "2 minutes", right there in the GameRoom
constructor — with a sweep beside it that closes the socket, calls
`webSocketClose`, releases `playerState` and deletes the session. It is
correct, it is thorough, it has a 20-line comment explaining the four
things it fixed (v2.3.1621). The obvious readings are that the value is
too high, that the sweep needs a re-audit, or that Durable Object
hibernation is eating the tick.

**Wrong:** all three. The sweep was flawless and had never run once.
What decides whether it runs is not the constant and not the sweep — it
is the ONE line that stamps the clock, `if (msg.type !== 'pong')
session.lastRecv = Date.now()`, whose comment carefully explains why
pongs are excluded and takes for granted that everything else is a
player doing something. It isn't. The client sends a `move` at >=1 Hz
standing still (the keepalive the peer ghost-sweep depends on,
v2.3.1107) and a `track` every 2 s on a bare timer. Both are
`!== 'pong'`. An abandoned tab therefore refreshed its own AFK clock
twice a second, forever, and no amount of staring at the eviction code
would ever have shown it.

**The second half of the trap:** having fixed the clock, the sweep
starts firing — and the ghost still comes back, because `onclose`
auto-reconnects on any close code it doesn't recognise. Sweep and
reconnect then trade the same corpse every two minutes and the symptom
is unchanged. An eviction is only an eviction if the far end agrees to
stay evicted (close 4006 → banner, no reconnect).

**Rules this leaves:**
- A timeout has two halves: the deadline and the thing that resets it.
  The bug is in the reset far more often than in the deadline, and the
  reset is usually one line somewhere else with no comment on it.
- "Is this handler correct?" is the wrong question. "Has this handler
  ever run?" is the one that finds it — and it is answerable by a test
  that drives real traffic at it, which is why `test/afk.test.mjs`
  replays two minutes of genuine keepalive rather than asserting on the
  constant.
- A heartbeat is not evidence of a human. Anything sent on a timer —
  ping, pong, keepalive, telemetry — must be excluded from every
  liveness judgement by name, not by "it isn't a pong".
- Server-side liveness cannot see a thumb. A player reading a panel
  sends nothing; the page knows they are there and the worker cannot.
  Where both can act, let the page decide and keep the worker as the
  backstop for a page that is frozen, old, or lying.

**Receipt:** `server/src/index.js` `_moveActivitySig`,
`server/src/tick.js` `_tickPingAndAfk`, `test/afk.test.mjs`,
`tools/qa/mp/mp-afk.mjs`.

---

## §25 — `node --check` on a `.js` server file proves nothing (v2.3.1925)

**The trap:** you add a method to the `GameRoom` class in
`server/src/index.js`, write it in the object-literal style the mixin
modules use — trailing comma between methods — and reach for the fast
local check:

```
$ node --check server/src/index.js
$            # silence. ship it.
```

It is not valid. A class body takes no commas between members, and the
module fails to load at all. `node --check` said nothing because the
file has a `.js` extension and `server/package.json` declares no
`"type": "module"`, so **Node parsed it as a CommonJS script** — a
grammar in which the same text is legal enough to get past a syntax
check.

Reproduced deliberately:

```
$ printf 'export class A {\n  foo() { return 1; },\n  bar() {}\n}\n' > t.mjs
$ node --check t.mjs
t.mjs:2
  foo() { return 1; },
                     ^        # caught
$ cp t.mjs t.js && node --check t.js
$                             # silent
```

**This bit twice in one day** — once on `OPEN_PVP: false` written into
the class body (v2.3.1917) and once on the reveal helpers (v2.3.1925).
Both times the "check" passed and `npm test` caught it, which is the
right outcome by the slowest road available.

**The repo's own gate was never the problem.** `tools/dev/precheck.mjs`
copies every changed source to a temp **`.mjs`** before checking it,
precisely so ESM parses as ESM regardless of the nearest
`package.json` — it would have caught both. The weak step was the
*ad-hoc* command typed in between.

**Rules this leaves:**
- Never `node --check` a server file by its own path. Either run
  `node tools/dev/precheck.mjs`, or `cp` it to `.mjs` first — the same
  thing precheck does, for the same reason.
- A cheaper and stronger one-liner for a server module, because it
  proves the thing you actually care about (it loads):
  `node -e "import('./src/index.js').then(()=>console.log('OK')).catch(e=>console.log('FAIL:',e.message))"`
- Extension and `package.json` decide the GRAMMAR, not the syntax you
  wrote. A tool that reports "parses fine" has told you it parses under
  *some* grammar, and silence from a linter you pointed at the wrong
  dialect is not evidence.
- Watch for it specifically when moving code between `server/src/*.js`
  mixin modules (object literals, commas required) and the `GameRoom`
  class body in `index.js` (class members, commas forbidden). The two
  styles sit feet apart and look identical at a glance.

**Receipt:** `server/src/index.js` `_isMysteryGrade` / `_revealLadder`
/ `_revealsFor`, `tools/dev/precheck.mjs` (the temp-`.mjs` copy).

---

## A skin blob on a character sheet is NOT the body part you think it is
*(v2.3.1990, after shipping v2.3.1986 and having the owner catch it in play)*

**The trap.** Wanting to find "the arm that crosses the chest" on
`jog-east`, I isolated skin-coloured pixels, cut away everything above a
neck line (the tee's top row + 8), took connected components of what was
left, and picked the blob that sat inside the shirt's x-span. That reads
as careful. It is wrong, and the way it is wrong is silent.

**Why.** The head, the neck, the torso and both arms are ONE connected
skin region. Cutting horizontally above a neck line does not sever the
head from the body — it removes the top of the skull and leaves the JAW
still joined to the neck and the torso. On frames 9, 10 and 11 the blob
my rule selected as "the crossing arm" was therefore the jaw-and-neck
mass, and painting its top rows shirt-coloured put a white blob **on the
character's face**. Measured after the report: 7, 23 and 37 pixels of
head-connected skin painted over, worst on frame 11 across the chin.

**Why the verification missed it.** Two ways, both instructive:
- The before/after contact sheet was cropped to the torso (y 40-76) to
  make the sleeve legible. The blob landed at y 53-57 — inside the crop,
  but read as "sleeve" because that is what I was looking for.
- The in-game stride strip DID contain it, at roughly two screen pixels.
  A 37-pixel artifact on a 128-pixel frame is invisible at game size in a
  strip and obvious to a player watching one character run.

**Rules this leaves:**
- Never identify a body part by connectivity alone on a sheet where the
  skin is one region. Anchor to something that actually marks the part:
  the head sheet (`jog-<dir>-head.png`), the measured crown, or an
  explicit per-frame region — and then ASSERT the result does not
  intersect the head before writing a pixel.
- Any tool that recolours body pixels must state, as an assertion and not
  a comment, which regions it is forbidden to touch. "It looked right in
  the preview" is not that assertion.
- Verify art changes against the WHOLE figure, not a crop chosen to make
  the change legible. The crop that proves your fix is the crop that
  hides your side effect.
- An in-game screenshot at game size is necessary but not sufficient for
  a change measured in tens of pixels. Diff the sheets and report where
  the changed pixels landed relative to named regions.

**Receipt:** `public/sprites/gear/shirt/tshirt/jog-east.png` (reverted to
its pre-v2.3.1986 bytes), `tools/gear/sleeve_crossing_arm.py` (deleted).
The underlying defect it tried to fix — the tee has no sleeve on the arm
that crosses the chest, frames 8-11 — is REAL and still open; see
`tools/qa/mp/mp-shirtarm.mjs`.

---

## §26 — A histogram index is not a sheet coordinate (v2.3.1992)

*(the vanishing face tattoo, after three wrong readings and one right
measurement)*

**The report.** "The face tattoo only shows on idle and disappears
during jog but then pops up on one frame."

**The tempting readings, in the order they were tried and dropped:**
the shirt bake is painting over the face; the hair is covering it; the
face REGION collapses on run frames (it is defined as "skin above the
torso band", so a band that starts too high would eat the head). All
three are plausible and all three are wrong — the region mask, dumped
painted red over the baked sheet, is exactly the head on all 28 run
frames and a consistent size.

**The fourth reading, which was closer and still wrong:** the fit's
column-keep rule (`REGION_KEEP`, "a column counts at 15% of the peak")
collapses on a narrow profile head, because a profile's column
histogram is a spike where a front-on torso's is a plateau. That story
fits the symptom exactly. It is testable in one line, and it is false:
on the frame that fails, the kept columns are the same healthy 36-wide
run as on the frame that works.

**What it actually was.** One line, and a units error:

```js
const rowN = new Int32Array(h), colN = new Int32Array(x1 - x0);
...
if (++colN[x - x0] > peakCol) ...              // colN is indexed FROM THE FRAME
...
for (let x = 0; x < colN.length; x++) if (colN[x] >= colMin) {
  if (x < lx) lx = x + x0;                     // lx is a coordinate ON THE SHEET
  if (x + x0 > rx) rx = x + x0;
}
```

`x` counts from the frame's left edge; `lx` holds a sheet coordinate.
On **frame 0** the two spaces coincide (`x0` is 0) and the loop is
correct. On every later frame `lx` is already ~256 or more while `x` is
still counting from 0, so every kept column tests "further left than
the last" and **both ends of the extent walk to the last kept column**:
`lx 419 -> rx 419`, a one-pixel-wide box.

**Why nothing ever threw, and why it read as "sometimes".**
`gridFit` clamps the box back up (`Math.max(ART_W, ...)`), so a
1px extent still produced a valid 16px grid — rendered and looked at,
the face band on frame 1 is a narrow sliver jammed against the leading
edge of the face, half of it off the head and clipped away by the mask. Valid arithmetic on a wrong
measurement paints something plausible somewhere wrong, which is much
harder to see than a crash. And the two "works" cases in the report are
the two cases where `x0` is 0: **a standing sheet is ONE frame**, and
the frame that "pops up" is **frame 0 of the run strip**.

The same fit serves the chest tattoo, the arm tattoo and the trouser
print, and all four were broken on every jog, hit, mine and pickup
frame. Nobody had reported the other three: a print on a moving thigh
is a smaller thing to notice losing than a mark on a face.

**Rules this leaves:**
- A per-frame histogram and a per-sheet coordinate must never meet in a
  comparison. Walk the histogram entirely in its own space and convert
  ONCE at the end — which is also the shape that makes the mistake
  impossible to write, rather than merely absent today.
- "It works on the first frame / the first item / the first tab" is not
  a hint about timing. It is very often a hint that an offset is zero
  there, and that the code has two coordinate spaces in it.
- A clamp downstream of a measurement (`Math.max(MIN, measured)`) turns
  a degenerate measurement into a plausible output. Any such clamp is a
  place where a bug will be silent, so the assertion belongs UPSTREAM
  of it, on the measurement.
- Do not gate a geometric fit on the box's SIZE — a chest legitimately
  narrows to 39% of its widest mid-stride. Gate it on MASS: what share
  of the region's own pixels does the fitted box span? Measured on the
  shipped art that is 0.003-0.006 when broken and 0.82-1.00 when right,
  and there is nothing to tune between those two numbers.
- A theory that explains the symptom perfectly is worth exactly one
  measurement, and the measurement is cheaper than the theory.

**Receipt:** `src/rendering/playerDecal.js` `stampRegion` (the column
extent), `tools/qa/mp/mp-facetat.mjs` (the mass gate, on all four
regions across every sheet the game bakes).

---

## §27 — A run clipped by the scan window is not a sliver (v2.3.1995)

Owner, on the character preview: *"The shirt neckline south view has too
large of a black outline. Northeast there's a big black outline where
the shirt meets the waistline. Minor but Southwest his shoulders have a
pretty big black outline too."*

All three were manufactured by our own tool, and the tempting reading —
"the artist drew a heavy keyline" — is wrong. `seal-shirt-edges.mjs`
(v2.3.1873) fills gaps of bare skin showing through the tee's edges. Its
one safety rule is a SIZE test: a gap at most 2px wide is a sliver and
gets filled; anything wider is art the artist meant (the neck, the
forearms, the bare belly, the cut-out crossing arm) and is left alone.
That rule is sound. What broke it is that the tool **measured the gaps
inside the shirt's own bounding box.**

A garment OPENING is body that runs *out* of that box. The neck hole
continues up into the head; the belly continues down into the trousers;
the shoulder line continues out past the sleeve. Clipping the scan at
the box turned each of those long runs into a 1-2px stub, the stub
passed the sliver test, and the pixel it copied its colour from — at an
opening — is the tee's own black keyline. So it filled them BLACK.
Measured: **4176 of the 6267 pixels that pass wrote were near-black**
(59-86% per sheet), and on `stand-south` it closed the top two rows of
an 8px-wide neck hole outright.

The fix is one line of intent: **measure the run across the whole frame,
write only inside the bounding box.** A real sliver is bounded within
MAXW px however far the window reaches, so it still measures short. An
opening measures its true length and is refused.

**Rules this leaves:**
- A threshold is only as honest as the window the measurement was taken
  in. If a scan is clipped by a region, every length it reports is a
  LOWER BOUND — and a rule of the form "short means X" will fire on
  anything the clip truncated. Measure in the largest space available
  and restrict the WRITE, not the measurement.
- When a tool fills from a neighbouring pixel, ask what that neighbour
  is at the boundary the rule is most likely to misfire on. Here the
  donor at every opening was the keyline, so the failure mode was not
  "a few stray pixels" but "a black bar", which is why it was visible
  from across the room and still survived three sessions.
- A one-pass art tool that reads its own output is a footgun with a
  comment taped to it. v2.3.1873 had to warn in capitals never to run
  it twice. The tool now reads its source from a pinned git rev, so
  running it ten times produces the same ten files — the warning became
  unnecessary rather than louder.
- Prefer a fix that can only REMOVE. The new art is a strict subset of
  the old (measured: **0 adds, 2583 drops** across ten sheets), so it is
  structurally incapable of putting a pixel somewhere new. That is the
  property v2.3.1986 lacked when it painted the character's face, and
  it is worth choosing the shape of a fix to get it.
- A stale cache-bust hides a whole class of art bug. `characterPortrait`
  requested the tee at a hardcoded `?v=2.3.760`, so every re-bake since
  — including the one that CAUSED this report — could serve a cached
  older sheet to the preview. If art changes and one surface disagrees
  with another, check the version strings before the pixels.

**Receipt:** `tools/gear/seal-shirt-edges.mjs` (the whole-frame scan and
the pinned source rev), `tools/qa/mp/mp-shirtkeyline.mjs` (per-column
outline widths and a near-black budget per sheet),
`src/rendering/characterPortrait.js` (`SHIRT_ART_VER`).

---

## §28 — A test that reports "not found" is worse than no test (v2.3.2000)

Found by sweeping ~59 scenarios in one night: **three were dead.** Not
failing — *dead*. They ran, they reported, and what they reported was
that they could not find the thing they were written to measure. From
the outside that looks identical to coverage.

The three:

| scenario | asserts | what happened |
|---|---|---|
| `layer` | quest turn-in is legible (owner: "all faded like you can barely see it") | v2.3.1827 split the turn-in into two screens; the strings it matched — "Redeem Reward", "Choose a skill to train" — exist nowhere in the codebase now |
| `hudface` | the HUD portrait matches the character | the owner deliberately REMOVED that portrait at v2.3.1848-1850 ("the band is a summary, not a head") |
| `statpeek` | what a stat point buys | the Build section still exists; the scenario cannot open it |

**Why none of them was noticed.** CI's `playable` job runs `questline`
and nothing else (owner directive, 2026-07-16 — no live players, CI
speed wins). The other ~133 scenarios run only when somebody types
their name. So a scenario can rot for months and the only signal is
that nobody has looked.

**The mechanism is almost always the same: selecting UI by LABEL.**
Labels are owner-facing copy and change constantly; a rename turns
every `:has-text("...")` and every `/Redeem Reward/` into a silent
miss. The codebase already knew this and said so — QuestOfferPanel.jsx
keeps `bt-quest-turnin` on the confirm button explicitly *"because that
class is what the QA harnesses click by: renaming the LABEL in
v2.3.1764 broke three scenarios at once, each swallowing the miss with
.catch()"*. `layer` was one of the three that never got the memo.

**Rules this leaves:**
- Select by a STABLE CLASS or a data attribute, never by label text.
  If a control has no stable hook, add one — that is cheaper than the
  test quietly dying.
- A "cannot find it" result must fail LOUDLY and distinctly from "found
  it and it is wrong". Guard assertions that name the thing they could
  not find (`{err: 'no claim panel', buttons: [...]}`) turn a mystery
  into a diagnosis.
- **Prove a new scenario is non-vacuous.** Run it against the broken
  state and require it to FAIL there, on the specific cases reported.
  v2.3.1993's hair scenario did this properly (fails on exactly the
  four reported hat/facings against the old masks); it is the only
  thing that separates a real test from one that passes because it
  measured nothing.
- Assert the PRECONDITIONS a measurement depends on, not just the
  measurement. v2.3.2001's camera-framing assertions exist because a
  pinning assumption stopped holding and the scenario went on
  confidently reporting nonsense (a mask untouched in months read as
  "45% bare scalp").
- **Sweep periodically.** These three cost one night of wall-clock to
  find and would not have surfaced any other way. Yield is not uniform:
  all three were UI-surface scenarios reaching into the DOM. The
  multiplayer and economy scenarios (117 assertions across trade,
  party, social, friends, chat, clan, market, arena) were perfect,
  because they assert against game state and the wire, which a UI
  redesign cannot silently blind.
- Distinguish dead from FLAKY before acting, and the suite is MORE
  load-sensitive than it looks. Four separate scares traced to batch
  size alone, every one of them passing in isolation:

  | scenario | in a batch | alone |
  |---|---|---|
  | `peershield` | 3 fail (batch of 14) | 9/9 |
  | `freshquest` | TypeError (batch of 13) | pass |
  | `zonechurn` | frame cost 94 -> 136 | pass |
  | `questkill` | died mid-quest, 3 of 4 kills (batch of 8) | 11/11 |

  `questkill` is the one to remember, because it does not read like
  flake — it reads like a BALANCE bug ("the character survived the
  errand: died true"). A saturated machine starves the combat loop, so
  the player takes hits without landing them and dies doing the first
  kill quest. Anything measuring TIME (frame cost), a RACE (a boot
  route, a relay) or a FIGHT is suspect in a large batch. One isolated
  re-run costs a minute and separates them; keep combat and multi-client
  scenarios in batches of ~4.

**Receipt:** `tools/qa/mp/mp-layer.mjs` (rewritten to select by class),
`tools/qa/mp/mp-hairmask.mjs` (asserts its own framing),
`tools/qa/mp/run.mjs` (warns when dist/ is stale — a different way to
measure the wrong thing confidently).

---

## §29 — A scenario that selects UI by its LABEL is a test with an expiry date (v2.3.2013)

§28 recorded three dead tests found in one sweep. Chasing the rest
turned up the mechanism they share, and it is narrow enough to state as
a rule: **every one of them reached for a string the owner is entitled
to change.**

Four scenarios, four renames, none of which was a mistake by the person
who made it:

| scenario | what it selected | what changed | cost |
|---|---|---|---|
| `layer` | `/Redeem Reward\|Choose a skill to train/` | v2.3.1827 split the turn-in into two screens | 4 assertions, silent for months |
| `zonefx` | `clickText(A, 'Accept')` | same v2.3.1827 split — Accept moved to screen two | 4 assertions, **and it invented two bugs** |
| `townlock` | `clickText(P, 'Accept')` | latent: same flow, different door | would have broken next |
| `statpeek` | `[role="button"][title="Build"]` | v2.3.1849 renamed the tab to "Points" | 5 assertions |

**The worst outcome is not the silence.** `zonefx` arms its tester by
accepting a quest, because the town gate refuses an unarmed character.
The accept matched nothing and was wrapped in `.catch(() => {})`, so the
run continued with an unarmed player who never left town — and then four
assertions reported that "an emote from another zone appears over your
map" and "a chat bubble from another zone is drawn over your ground".
Both players were in the SAME zone. The renderer was correct. A test
that cannot reach its own precondition does not go quiet; it starts
describing a world that does not exist, in the confident language of a
bug report.

**Rules this leaves:**
- Select by a STABLE HOOK — a class or a `data-` attribute carrying an
  ID, never `title`, `aria-label`, or button text. Where none exists,
  ADD one: `bt-quest-turnin` exists on the claim button for exactly this
  reason, and v2.3.2013 added `data-section` to the hero tabs after
  `title="Build"` became `title="Points"`.
- An ID and a LABEL are different things and the label is display copy.
  `SECTION_LABEL` in HeroExpanded.jsx says so in its own comment — "the
  label is a display concern and lives in a display table" — and the
  test was reaching for the display concern.
- **Never `.catch(() => {})` a setup step.** A guard that cannot fail is
  not a guard. Two of the four swallowed their miss, and those two are
  the ones that produced false accusations rather than plain failures.
  If a step is genuinely optional, assert which branch you took.
- A GUARD failing invalidates everything after it. When triaging, read
  the failures in order and stop at the first guard: the four scary
  zonefx failures were downstream of two boring ones.
- Fix the flow in the HARNESS, not in each scenario. `acceptQuestFromGiver`
  exists because this flow's labels have now moved twice and broken five
  scenarios between them.
- ...but scope the helper to the path it actually drives. Applying
  `acceptQuestFromGiver` to `townlock` — which accepts from the QUESTS
  DASH, a different door with no dialogue — took it from 27/27 to 22/27.
  Check its prior state before "fixing" a test: a failing test is not
  proof it was already failing.

**Receipt:** `tools/qa/mp/harness.mjs` (`acceptQuestFromGiver`, and why
it throws), `tools/qa/mp/mp-statpeek.mjs` + `HeroExpanded.jsx`
(`data-section`), `tools/qa/mp/mp-layer.mjs`, `tools/qa/mp/mp-zonefx.mjs`.

## §30 — A generated sleeve for the bare trailing arm looks worse than the bare arm (v2.3.2016; CLOSED v2.3.2066)

**The plausible-but-wrong move:** the owner has reported the bare arm on
jog-east three times, `mp-shirtarm.mjs` diagnoses it correctly (frames 0-6,
the TRAILING arm, and the fix has to ADD art because most of the bare arm
lies outside the shirt's own bounding box), and the obvious next step is to
generate the sleeve — grow a cap from the shirt's shoulder along the arm,
fill it, hem it in black. It is easy to build in an hour and it passes
every safety test this repo knows how to write.

**Why it fails, and it is not a safety failure.** It was built at depth 4
and depth 5, with preserved ink both at every dark body pixel and limited to
the true outer silhouette. All three satisfy the two invariants v2.3.1986
lacked — never write above the shirt's top row, never write on a column with
body pixels above that row — and satisfy them by construction, so nothing
goes near the face this time. It also leaves the body's own black keyline
alone, so the arm keeps its outline. It is simply BAD ART: a ragged spiky
left edge on the shirt with detached white pips out on the arm's antialiased
fringe.

The geometry is the lesson. A sleeve on an arm swung back-and-down is a band
running PERPENDICULAR TO THE ARM'S AXIS. Every cheap rule available — dilate
the shirt sideways, grow a geodesic cap from the shoulder — produces a band
that is roughly vertical instead. On the frames where the arm is near
vertical the same rule looks fine, which is exactly the trap: tune on those
frames and the rule flatters itself, then falls apart on the frames that
actually needed it.

**What this leaves.** Closing this needs the arm's AXIS, not just its
silhouette — or seven hand-drawn frames on one facing, which is probably the
cheaper honest answer. Until one of those happens the bare arm STAYS (it did, until v2.3.2066 —
see below). It is
at least a coherent silhouette; the generated sleeve is not. Shipping a
worse-looking fix to close a cosmetic report is a net loss, and this
subsystem has already had one fix reverted in play (v2.3.1986's shirt blob
on the character's face).

**CLOSED in v2.3.2066, by taking the two conditions above literally.**
`tools/gear/draw-trailing-sleeve.mjs` cuts the sleeve along the LIMB'S OWN
PRINCIPAL AXIS rather than along the shirt's edge, so the hem runs
perpendicular to the arm the way the paragraph above demands; and every written
pixel takes THE BODY'S OWN ALPHA, which is what kills the pips — a sleeve pixel
at the body's coverage composites to exactly the body's coverage in a different
colour, so the figure's silhouette does not change and the antialiased fringe
stays a fringe instead of becoming hard dots and holes. Bare shoulder over one
jog-east cycle: 176 px to 19. Rendered at 20x on all 14 frames before shipping,
which is what the note above was really asking for.

Two things it left that are worth keeping:
- The sleeve's own attempt at a FRAME GATE was wrong and the measurement killed
  it. The first run of the tool painted a white slab across the middle of the
  forearm on frames 11-13, and the obvious reading — "those frames are
  different, gate them out" — does not survive the numbers: every shape
  statistic tried separates frames 1 and 13 by less than it separates frame 1
  from frame 2. The real fault was the ANCHOR. On those frames the trailing arm
  hangs parallel to the shirt's back edge and touches it for its whole length,
  so the seam is the entire arm and its centroid is halfway down the limb.
  Anchoring on the seam's TOP rows fixed all three with no frame list at all.
- The number is only "bare shoulder" ON A PROFILE. Run over the other jog
  facings it reports northeast 100 and southwest 130, and southwest rendered at
  14x is FINE — on a three-quarter view the window also catches the raised
  fist, which a tee is supposed to leave bare. `mp-shirtarm` prints those as an
  audit and gates on none of them.

**Receipt:** `tools/gear/draw-trailing-sleeve.mjs` header;
`tools/qa/mp/mp-shirtarm.mjs` header, section "v2.3.2066: CLOSED, AND NOW
MEASURED RATHER THAN PHOTOGRAPHED".

## §31 — `continue-on-error` turns a FAILED CI step green in the Actions UI (v2.3.2067)

Handoff backlog item F says to promote the report-only CI trio "once a step
holds green for ~10 consecutive CI runs" and to "check the Actions history per
harness". Both halves of that instruction are traps, and the first one is the
dangerous one, because following it produces a confident wrong answer rather
than no answer.

**A `continue-on-error: true` step that fails reports `conclusion: success`.**
Not "failure, ignored" — success, in the web UI and in the REST/MCP job data.
The most recent completed dispatch of the `smoke` job at the time of writing
(run 1435 cancelled, run 1431 on 2026-08-26) shows every step green,
including all three report-only steps. Its LOG says:

```
FAIL  A reached worldview  {"x":784,"y":1424,"zone":"town","hp":118}
...
6 GEAR-SMOKE CHECK(S) FAILED
```

Two of the three had never passed a single assertion of their own subject
matter, and the history said ten-for-ten. Anyone counting green ticks would
have promoted a check that cannot pass — and a BLOCKING step that always
fails also SKIPS the steps after it, so promoting the middle one of three
would have silently removed the third from the run.

**The rule:** the pass/fail state of a report-only step lives ONLY in its
output. Read the log (or the uploaded `qa-*.json` artifacts), or run the
harness locally against a real worker — `cd server && npx wrangler dev --port
8787 --local`, `npm run build`, `npx vite preview --port 4173`, then
`QA_WS_URL=ws://127.0.0.1:8787 node tools/qa/<harness>.mjs`. All three of the
trio reproduce their CI result locally, line for line.

**Second half of the trap:** the `smoke` job left the PR path in v2.3.1333 and
has been dispatched 7 times in total. "10 consecutive CI runs" is not a bar
these checks can clear at that rate; whoever promotes one is making a
judgement on locally gathered evidence, and should write down which.

**Receipt:** handoff item F (rewritten v2.3.2067) and the report-only block in
`.github/workflows/client-ci.yml`.

## §32 — `S._serverMonsters` is FALSE in town, so a send gated on it never happens there (v2.3.2077)

`S._serverMonsters` reads like "am I in multiplayer" and is not. It means
**this zone has server-managed monsters**, and `wsClient.js` sets it false
whenever the zone's monster list comes back empty — its own comment spells out
which zones those are: *"Empty list means the server has no monsters for this
zone (town, or a dungeon the server doesn't model)"*.

So `if (S._serverMonsters && S.channel) channel.send(...)` is a send that
**cannot happen in town** — and town is where the shops, the forge, the
woodworker, the campfire and the vendor all are.

**The failure is silent in both directions**, exactly as TRAPS §18 describes
for the shim allowlist. The client predicts locally, decrements the bag, writes
`localStorage`, and the screen looks correct. The worker — which owns
inventory, coins and HP — never hears, and reconciles the whole thing away on
the next `player_state`. Nothing throws, and any assertion written against
client state passes throughout.

**It has shipped four times:**

| version | message | what was actually broken |
|---|---|---|
| v2.3.1702 | `ability_use` | specials did nothing server-side |
| v2.3.2063 | `shop_purchase` | no purchase in the game's history had reached the worker — the vendor stands in town |
| v2.3.2077 | `eat_request` ×3, `cook_recipe` ×2 | eating and cooking in town did not stick |
| v2.3.2077 | `forge_weapon` ×2 | **forging had never reached the worker at all** — blacksmith and woodworker are both town buildings |

**The rule:** the precondition for a client→server send is "am I connected",
which is `S.channel`. The one legitimate use of the flag is a message that is
*about* a server monster — you cannot damage one in a zone that has none — and
`monster_damage` is allowlisted by name.

**Do not trust a reading of this gate that assumes the message is sent.**
Handoff item N called it "symmetry polish, not a hole" on the grounds that
"the local heal is prediction, the echo is the tiebreaker". Sound reasoning,
wrong premise: there is no echo when nothing is sent.

**Mechanised.** `tools/dev/precheck.mjs` §8b (`town-gate`) FAILs on any
client→server send gated on `_serverMonsters` outside the allowlist. It scans a
seven-line window after each `.send(`, because two of the game's sends put the
type several lines below the call and a single-line regex skips them.

**Receipt:** `tools/dev/precheck.mjs` §8b; the note at the eatBus handler in
`src/ui/BroTown.jsx`; `tools/qa/mp/mp-townmeal.mjs`, which asserts on the
WORKER'S blob through the admin API rather than on client state — a test that
checked the client would have passed throughout the bug.

---

## §33 — A test that reads a field the game does not have asserts nothing (v2.3.2078)

**The move that looks right:** write the state read the way you remember the
field being called — `S.lockedMonster`, `S.playerCount`, `S._dead`,
`S.nodes` — inside `page.evaluate`, wrap it in `|| null`, and read the number
back out.

**Why it is wrong:** `page.evaluate` runs in the browser. A property that
does not exist is `undefined`, not an error, and every idiom the suite uses
to be defensive turns that `undefined` into a pass:

| written as | with the field missing | what the assertion then means |
|---|---|---|
| `S.playerCount \|\| null` then `count == null \|\| count >= 2` | `null` | passes with the room reporting an empty world |
| `S._dead` reported as `dead: !!S._dead` | `false` | a corpse is described as alive in the payload that exists to explain a refusal |
| `S.lockedMonster = null` | writes a new property | the lock the next line depends on is never cleared |
| `Object.values(S.nodes \|\| S.zoneNodes \|\| {})` | `[]` | "the zone has resource nodes" fails forever, for a reason no payload names |
| `window.__btGear.setEquip(...)` inside `try {}` | TypeError, swallowed | the scenario about a character wearing a tee never puts one on |

The audit that found these compared every `S.<field>` read in
`tools/qa/mp/*.mjs` against every field `src/` ever touches. Eight scenarios
were clearing `lockedMonster`; `grep -rn lockedMonster src/` returns 0 and
`lockedTarget` returns 48.

**What to do instead:** the field name is not a memory, it is a lookup.
Before writing a state read, `grep` it in `src/`. If nothing writes it, it
does not exist — find the one that does.

**Mechanised, partly:** precheck §8c (`qa-handles`) FAILs on any
`window.__X` a scenario reads that neither the shipped client (`src/`,
`public/`) nor that same scenario defines. Self-assigned scratch pins
(`__pin`, `__fa`, `__qRaf`) are exempt because they are assigned in the file
that reads them, and comments are stripped first so a note recording a
retired handle does not re-flag the fix that removed it. The `S.<field>`
half is NOT mechanised — the state object is built at runtime and half the
short names (`S.c`, `S.w`, `S.page`) are shadowed locals in the harness, so
a static rule there is mostly noise. That half is still a `grep` you owe.

**Related:** §18 (a client→server message with no shim passthrough never
reaches the worker — the same "looks fine, does nothing" shape),
§28 (a test that reports "not found" is worse than no test),
§29 (selecting UI by its label is a test with an expiry date).

---

## §34 — Moving the scenery invalidates every colour probe near it (v2.3.2078)

**The move that looks right:** measure a character's tattoo by counting
coloured pixels in a box around them, anchored on the player's world
position and the camera rather than a guessed fraction of the screen. That
much is correct, and TRAPS §21 already requires the CONTROL frame that goes
with it.

**Why it broke anyway:** the box was about twice the figure, and what filled
the rest was the town. v2.3.2069 moved the fountain into the plaza, the
plaza is where the spawn is, and three scenarios each carrying their own
copy of an `88 x 104` crop suddenly had running water in frame. The control
— a character with no drawings on him at all — read **4455 blue** and
**205 pink** pixels, and ten assertions failed naming shirt prints and face
tattoos that had nothing to do with it.

Two separate faults, and both matter:

1. **The box was too generous.** A crop derived from the player's position
   is only as honest as its size. `H.figureBox` is the one copy now, cut to
   numbers measured off a real control render and anchored on
   `window.__btPlayerDrawn` so the mining lift and the build scale are
   included rather than approximated.

2. **The classifier was too loose, in two of the three files.**
   `b > g + 24 && r > 110` accepts a lit blue like `(150,160,200)`.
   mp-facingside had already learned this in v2.3.2043 and added `r >= b`;
   mp-cosmpose and mp-skinworld had not, and mp-skinworld's comment still
   claimed "every OTHER thing on screen has more green in it than blue",
   which the fountain made false. That one comparison takes the water from
   205 matches to 0.

**What to do instead:** when you move a prop, grep the QA suite for anything
that counts pixels near where it landed. And when a control frame goes from
0 to non-zero without the art changing, believe the control — it is doing
exactly the job §21 gave it, and the failing assertions downstream are
collateral, not the finding.

`H.TOWN_CLEAN_SPOT` is a patch of town measured walkable, 110px clear of all
twelve props, and zero pixels matching any of the four probe colours; reach
it with `H.hopTo`, never a teleport (v2.3.1706: movement.js refuses the jump
and, once refused, stays refused).

**Related:** §21 (a colour count is evidence only against a control),
§30 (a measure that clips the thing it measures).

---

## §35 — A test that COPIES a value out of the game stops testing the game (v2.3.2078)

**The move that looks right:** you need the forge's position, or the shirt
sheet's cache-bust, or a lane to walk down, or a flag saying whether the town
draws props. All four are right there in `src/`. Copy the number into the
scenario with a comment saying where it came from.

**Why it is wrong:** the copy has no link back. Everything below was correct
when written and silently wrong later, and none of them announced it:

| the copy | what changed | what the test then reported |
|---|---|---|
| `const FORGE = { x: 1480, y: 545 }` | the forge moved to (480,900) and grew ~3× | a smith standing at his forge, 960px from it, FAIL |
| `const BLACKSMITH = { x: 1400, y: 640 }` | same town re-fuse | never fired — the file was skipping itself |
| `gearVer: '2.3.2066'` hand-copied | any re-bake | the sheet still fetched (the `?v=` is only a cache-bust on a static file), so the test kept measuring art while claiming to prove the bust shipped |
| the sprint lane `(1000, 1600)` | v2.3.2073 made props solid | passed with COLLISION OFF — isSolid's never-trap hatch lets a player in a solid cell move, and the lane's start is grid-unwalkable |
| the walk lane, east from spawn | same | 129px on one sample and 0 on the next: the player was standing against a bench |
| `if (!TOWN_PROPS_ENABLED) skip` | v2.3.2061 made the flag mean "the v16 set only" | the whole scenario reported "switched off by directive — skipped" while twelve props were on screen and two other files were measuring them |

The last one is the worst of the six, because a skip is not a failure. It had
been dark for weeks and the sweep's summary counted it as a green line.

**What to do instead:** ask the game. Every one of those values has a live
handle — `window.__btWorldProps()`, `__btGearVersion()`, `__btNpcSprites()`,
`propsForZone('town')` — and where a scenario needs geometry it does not
have a handle for, add the probe rather than the constant. Where a lane is
genuinely a choice, `node tools/dev/town-lanes.mjs` re-derives it from the
walk grid and the placed footprints, and `node tools/dev/town-lanes.mjs X Y`
answers whether one spot is clear.

**And measure against the SHAPE, not the centre.** A distance to a
building's centre is meaningless once the building is 470px wide: the centre
is 235px from its own doorway, so the check either fails someone at the door
or gets loosened until it passes someone across the plaza. Distance to the
footprint box is what "standing at it" means.

**A skip must name a condition that is still real.** Gate a skip on the thing
the file is about — "are there props drawn" — not on a flag that happens to
correlate with it today. And keep the two apart: "off by directive" and
"stopped working" look identical from outside, which is the whole reason
v2.3.1813 chose the flag in the first place; the answer is to require BOTH
(the directive AND an empty list), not to pick one.

**Related:** §29 (selecting UI by its label), §33 (reading a field the game
does not have), §34 (moving the scenery under a colour probe).

---

## §36 — A spawn point has three constraints, and fixing one breaks another (v2.3.2078)

**The move that looks right:** TOWN_SPAWN is inside the fountain's collision
cell, so move it somewhere clear. Check the prop footprints, confirm the new
spot is walkable, done.

**Why it is wrong:** "clear" is three separate questions, and this version
got each one wrong in turn while satisfying the previous ones.

| attempt | clear of props? | can you walk out? | clear of the townsfolk? | what shipped |
|---|---|---|---|---|
| (815, 1010) | **no** — shares a 16px cell with the fountain | yes, by accident | yes | collision OFF for every player (the never-trap hatch), so you walked through everything |
| (815, 975) | yes | **no** — 23px of corridor, then the basin | yes | boxed in against the fountain |
| (815, 1140) | yes | yes | **no** — 99px from Diego | the shop drawer open on arrival, covering three of the inspect card's four actions |
| (910, 1130) | yes | yes | yes — 170px | — |

The three are genuinely independent:

1. **Props.** The grid is stamped in 16px cells with `floor()` on both ends,
   so a footprint that starts 2px into a cell blocks the whole cell. The
   fountain's box starts at y 1018 and that is enough to poison y 1010.
   And being *in* a blocked cell does not stop you — the never-trap hatch
   lets you out, and takes the whole town's collision with it while you are
   standing there.
2. **A route.** Clear to stand on is not the same as clear to leave. North of
   the basin the plaza is a 33px corridor for a 24px body.
3. **The townsfolk.** Within `NPC_PROX_OPEN` (90px) a shopkeeper's drawer
   opens by itself, and it stays open until `NPC_PROX_CLEAR` (125px). The
   drawer is `position: fixed` at the bottom of the screen, where the inspect
   card's pinned action row also lives, so a spawn inside that ring hands
   every new player a card whose Trade, Duel and Add Friend cannot be
   pressed.

**What to do instead:** check all three, by walking. `node
tools/dev/town-lanes.mjs X Y` answers the first; mp-townexit walks the other
two and asserts the NPC gap (>125px) and that no shop drawer is up on
arrival. A spawn is not a coordinate, it is the first ten seconds of the
game.

**And the third one is a live bug in its own right,** not only a spawn
constraint: walking up to the shop and then tapping a player hits it too.
Fixed by closing the drawer when the inspect card opens — one panel at a
time, which is the rule the proximity gate already applies in the other
direction.

**Related:** §20 (a fixed wrap is its own stacking context — a control the
dashboard paints over), §34 (moving the scenery under a probe), §35 (copying
a value out of the game).

---

## §37 — Measuring a drawing against the box that defines it tests the arithmetic, not the art (v2.3.2082)

**The move that looks right.** The owner asks whether tattoos land in the
same place through an animation. The bake already publishes, per frame, the
region box it measured and the grid it fitted into that box
(`window.__btGridProbe` → `__btGridsByTag['<pose>-<dir>']`, from
`stampRegion` in `src/rendering/playerDecal.js`). So: express the grid's
origin as a fraction of the region box, take the spread across the frames of
a sheet, and gate on it. Every number is real, every number comes from the
running game, and the check passes on a sheet whose tattoo crawls all over
the chest.

**Why it cannot fail.** `gridFit` *centres* the grid on the box it was
handed:

```js
const dw = Math.max(ART_W, Math.round(bw * box.fillW));
const ox = Math.round((lx + rx + 1) / 2 - dw / 2);
const oy = Math.round(ty + bh * box.cy - dh / 2);
```

so `(ox - lx) / bw` is `(1 - fillW) / 2` on every frame of every sheet, for
every drawing, forever. The metric is a restatement of two lines of
arithmetic. A region box that has wandered off the chest and onto the armpit
carries its perfectly-centred grid along with it and reports no drift at all.

**The rule.** A placement is only measurable against something that did not
help place it. Two things placed the ink — the region mask and `gridFit` —
so the reference has to be a third: the FIGURE. `stampRegion` reports each
frame's own opaque extent under the probe (`fx0, fx1, fy0, fy1`), and
`mp-inkplace` measures the ink's centre as a fraction of *that*, which is
what a player is actually looking at.

**The same trap, elsewhere in this repo.** §35 is its sibling — a test that
copies a value out of the game and compares it to itself. This one does not
copy anything; it derives both sides of the comparison from the same
function. Ask of any placement check: *what would have to be broken for this
number to move?* If the answer is "nothing that could plausibly break", the
reference is wrong, not the threshold.

**A corollary worth keeping.** The reference does not have to be perfect to
be valid, only independent. The figure box wobbles too — arms swing out
through a stride and widen it — so a correctly-placed tattoo still moves a
few percent, and the gate sits above that wobble rather than at zero. An
imperfect independent reference beats a perfect dependent one.

**Related:** §33 (a test that reads a field the game does not have), §35 (a
test that copies a value out of the game), §34 (moving the scenery under a
colour probe).

---

## §38 — A sub-test that injects over the previous one's live state blames the wrong feature (v2.3.2083)

**The symptom, and how convincing it was.** `mp-cosmpose` works the player on
an ore vein and then on a fishing spot, by the same recipe: put the tool in
the bag, inject a node under the player's feet, set `S._tapNode`, press the
prompt. The ore vein worked every time. The fishing spot never did. The
scenario wrote the conclusion into its own source — *"an injected fishSpot
does not become workable the way an ore vein does — the recipe is identical
and the rod is in the bag, so something else about fishing refuses it"* — and
downgraded the assertion to a `skip`. That reasoning is airtight and the
conclusion is wrong.

**What was actually happening.** `BroTown.jsx`'s node-proximity block ends:

```js
S._nearNode = _tapN;
/* v2.3.1432 (owner: "the contextual menu for cooking didn't go away") */
if (S._extraction) S._nearNode = null;
```

A live harvest attempt suppresses the interact prompt **on purpose** — you are
already doing the thing it offers. The ore sub-test soaks for six seconds with
an extraction running, and the fishing spot was injected immediately after it.
`_nearNode` was nulled by the *mining* attempt that had not finished. Nothing
about fishing refused anything: ore passed because it ran first and fish
failed because it ran second. **Swapping the two would have swapped the
result** — which is the check that would have caught this in one run.

**The rule.** Two sub-tests that write the same game state are one test unless
the first is torn down and the teardown is *confirmed*. Injecting into a live
state machine does not overwrite it; it queues behind it. Cancel, then read
back that the cancel took, then inject.

**And make the diagnostic name the state, not the feature.** The old failure
message read `hasGatherTool or nodeReachDist refused it` — it named the two
gates the author had in mind and never mentioned `S._extraction`, so every run
pointed at gathering. A `why` that can only accuse the suspects you already
thought of will keep accusing them. The replacement reports which of
`_extraction` / `gatherNodes` / `_tapNode` actually differs, so the state says
what happened instead of the author's prior.

**Related:** §33 (a test that reads a field the game does not have), §37
(measuring a drawing against the box that defines it).

---

## §39 — "Element is visible, enabled and stable" is what a COVERED button looks like (v2.3.2085)

**The message that means the opposite of what it says.** A Playwright click
on a control something else is sitting on top of reports this and then times
out:

```
locator resolved to <button class="bt-inspect-tp">Trade</button>
attempting click action
  2 x waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
Timeout 30000ms exceeded
```

Every line is true. The button *is* visible, enabled and stable — it is
simply not what the pointer would land on. Read as written it says "the
button is fine and the click did nothing", which sends you to the handler,
the event wiring, the disabled state: everywhere except the one place the
answer is. mp-trade sat on this for weeks.

**The browser will name the culprit for the asking.**
`document.elementFromPoint` at the control's own centre. `H.clickText` does
it now (v2.3.2084) and answered mp-trade in a single run. Three things had to
be right before it said anything useful, and each wrong version *looked* like
it worked:

1. **Sample BEFORE the click.** In the catch block you are thirty seconds
   late; the panel has moved on and `boundingBox()` answers null.
2. **Put it FIRST in the message.** The runner truncates a failure at a couple
   of hundred characters and Playwright's own call log is longer than that, so
   an appended line is cut off before anyone reads it.
3. **Say whether it is an ANCESTOR.** An element that *contains* the button is
   not covering it — the click lands and bubbles. Naming which of the two it
   is saves the reader the wrong half of the search.

**And the fix is usually not a z-index.** The inspect card claims z 99800
against the chat feed's 25 and loses anyway, because the feed's shell is
styled `left: 8px` and *renders at x=295*: its `position: fixed` is captured
by a transformed ancestor, which also scopes its z-index inside that
ancestor's stacking context (§20). When two elements are in different
stacking contexts, no number either side picks decides the argument. What
decides it is one of them declining the tap.

**The general shape, which this repo has now hit three times.** A control the
player must press, with something invisible over it: the dashboard over the
tutorial banner (v2.3.1205), the shop drawer over the inspect card's actions
(v2.3.2078), the chat log over Trade (v2.3.2085). All three were reported as
"the button does nothing". When a button does nothing, ask what is on top of
it *before* you read its handler.

**Related:** §20 (a fixed wrap is its own stacking context), §38 (a
diagnostic that can only accuse the suspects you thought of).

## §40 — A screenshot is not in CSS pixels, so a rect offset samples the wrong place (v2.3.2090)

**The move that looks right.** You want to prove a control is actually
visible rather than merely styled visible, so you read its box from the
page, screenshot a strip across it, and sample a pixel "6px inside the left
edge":

```js
const r = await rect('.bt-cc-defcolor');           // CSS pixels
const px = await H.screenshotPixels(P, { x: r.x - 20, y: ..., width: r.w + 40, height: 3 });
const fill = px.at(20 + 6, 1);                     // WRONG
```

**Why it is wrong.** `getBoundingClientRect` speaks CSS pixels. The returned
image is `devicePixelRatio` times that in each axis — 2× on every harness
that passes a `dpr`, and 2× by default on some of them. Indexing the image
with a CSS offset therefore lands at *half* the intended distance in. The
clip is right; the sampling is not.

**What it looks like when it bites.** `mp-ccsize` sampled 6px into a
near-white button on a dark panel and read `[29,45,51]` — the panel. Both
samples fell outside the button, so the assertion reported a contrast of
**1** for a control that measures **184**. That is the dangerous failure
shape: not an obviously broken number, but a plausible one that says the
change did not work, sending you back to the stylesheet to fix code that was
already correct.

**The fix is a ratio, not a constant.** Do not hard-code 2 — a scenario that
sets `dpr: 1` or runs on a different viewport would then be wrong in the
other direction. Derive it from the image the browser actually returned:

```js
const k = px.width / clipW;                        // whatever ratio was used
const fill = px.at(Math.round((20 + 6) * k), Math.floor(px.height / 2));
```

**Where this does NOT apply.** Counting pixels that match a predicate inside
a region (the brass-ring count in the same file) is scale-free — every pixel
is still inside the same region, only more of them. It is *indexing* a
specific coordinate that needs the ratio. Thresholds tuned against a count,
though, are not portable across dpr: state the viewport the number came from.

**Related:** §34 (a colour probe is only as good as what is behind it), §37
(measuring a drawing against the box that defines it).
