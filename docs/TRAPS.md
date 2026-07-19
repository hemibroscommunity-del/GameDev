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
