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
