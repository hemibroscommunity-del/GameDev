# Brotown UI Spec Reference — Directional Block Ring + Shield Mechanics

Complete implementation spec for the directional block ring around the right joystick, the parry-on-timing mechanic integrated with it, and the shield equipment role. All dimensions assume portrait mobile per §15 (~380×760 viewport). This spec slots alongside §1.7d (utility wheel) and §1.7e (inventory surface) and extends §15 (combat HUD) with the new defensive layer.

**Unified-state model.** Brotown has no separate combat and non-combat UI states. The HUD is constant: joysticks, block ring, shortcut edges, and utility wheel trigger are all present at all times. The world never pauses — this is an MMO, and server simulation continues regardless of what menu the player has open. The block ring and all combat surfaces are therefore ambient by default and activate on input, not on state transition.

---

## Part 1: Design Philosophy

### Purpose

Brotown combat needs a defensive mechanic that expresses §1.1a's hold-over-rush thesis at the input layer. A held directional block rewards duration, positioning, and commitment — not reaction spam. The mechanic must work on mobile without adding persistent HUD buttons, must be usable by melee and ranged/mage builds alike, and must integrate the §2.3 stagger system through a perfect-timing parry subset.

### Thesis alignment

A block is a *held state*, not a button press. The player commits duration, pays continuous cost, and decides when to release. Unlike a parry-only mechanic (which is a timing spike), the block mechanic expresses §1.1a by making the *duration of defensive commitment* the primary skill axis. Timing parry exists as a reward within the held-block mechanic, not as a replacement for it.

### Zero-button design discipline

The HUD holds no persistent defensive button. The ring is an ambient guide; the shield icon is a touchable button that sits on the ring; the ring itself serves as a directional input surface during the block gesture. The ring is always present on the player's screen, but its visual weight is proximity-modulated — faint when no threats are nearby, slightly brighter when hostiles enter aggro range. A player who has never learned the mechanic sees a minimal dim affordance. A player who has learned it has reliable access without mode transitions.

---

## Part 2: The Directional Block Ring

### Structure

A ring surrounds the right joystick at a distinct visual radius. The ring serves three purposes:
1. An ambient guide track showing where block direction is indicated
2. A directional input surface during an active block (the thumb rotates along the ring to steer the shield)
3. A visual feedback surface during active block (lit segment centered on shield position)

### Ring dimensions

- **Ring band thickness:** 12px
- **Ring inner radius:** 45px from joystick center (6-8px outside joystick outer edge)
- **Ring outer radius:** 57px from joystick center
- **Total cluster footprint** (joystick + ring): 114px × 114px
- **Offset from screen corner:** minimum 16-20px inset from bottom and right screen edges to avoid conflict with iOS/Android system edge gestures

### Ring visibility — default state (not blocking)

The ring is always visible; its opacity is proximity-modulated based on hostile entity presence.

- **Baseline (no hostiles in detection range):** gold (`#F4C775`) at ~6% opacity on the 12px band
- **Hostile in aggro range (combat-imminent):** gold (`#F4C775`) at ~12% opacity on the 12px band
- **Inner edge:** 1px dashed outline (`rgba(244, 199, 117, 0.20)` at baseline, `rgba(244, 199, 117, 0.25)` with hostile present) at radius 45px
- **Outer edge:** 1px dashed outline, same opacity pattern as inner edge, at radius 57px
- **Transition between states:** 400ms ease-in-out opacity fade when a hostile enters or leaves detection range
- **Detection range:** approximately 2× the player's attack range, or as tuned per zone

The ring never disappears. Its presence is permanent; only its visual weight shifts with context. In a town or safe zone, it is essentially ambient wallpaper at 6% opacity — discoverable but not intrusive. In a dungeon, it brightens to its functional opacity.

### Ring visibility — active block state

- **Lit segment:** gold (`#F4C775`) at full opacity, 12px band thickness, ~70° arc (roughly 62 units of 360-unit circumference)
- **Lit segment center:** aligned with the shield icon position — wherever the thumb currently is on the ring
- **Soft outer glow** on lit segment: gaussian blur, stdDeviation 3, ~0.5 opacity glow layer behind
- **Unlit portions of ring:** remain at default faint opacity — do not dim further during block

### The shield icon

The shield icon is the directly-touchable button and the visual indicator of current shield direction.

- **Size:** 28×30px shield-shaped glyph
- **Position:** centered on the ring band at radius 51px from joystick center, at angular position representing current shield direction
- **Visual — default state (not blocking):** `rgba(244, 199, 117, 0.4)` fill, `rgba(244, 199, 117, 0.6)` stroke. Dim but visible.
- **Visual — active block state:** `#F4E0A8` fill (fully saturated), `#5A3A10` stroke. High contrast, clearly "on."
- **Interior glyph:** simple shield cross-guard — vertical and horizontal line intersection in the shield center
- **Directly tappable:** the icon itself is a touch target; player can press it regardless of current aim direction

### Shield icon position — how it's set

The shield icon's angular position on the ring can be controlled by three different inputs, with the most recent input winning:

1. **Direct touch on the shield icon:** the icon's position at the moment of touch is whatever it was before; the player can then drag their thumb around the ring to move the icon (and the shield) to any direction
2. **Thumb dragging on the ring during an active block:** the shield icon follows the thumb's angular position on the ring band
3. **Right joystick aim direction (passive tracking when no ring gesture is active):** when the player is aiming but not blocking, the shield icon follows aim as a convenience — so a player who was already aiming at a threat finds the icon pre-oriented toward it

The player is never required to aim first. The shield icon can be grabbed and rotated from any state. Aim-tracking is a helpful default that speeds up common cases, not a prerequisite.

---

## Part 3: The Block Action

### Activating block

The player has two primary paths to activate block:

**Path A — direct touch on shield icon, then rotate if needed:**
1. Player touches the shield icon wherever it currently sits on the ring
2. Block immediately raises in the icon's current direction
3. While holding, player can drag thumb around the ring to rotate shield direction
4. Release to drop block

**Path B — aim-then-block (convenience for players already aiming):**
1. Player is already aiming at a threat with the right joystick; shield icon follows aim to that direction
2. Player releases the joystick and presses the shield icon at its current position (which is already oriented toward the threat)
3. Block raises; subsequent rotation via ring drag as in Path A

Both paths are valid. Path B is faster when the player is already aiming; Path A is the fallback for surprise situations or when the player wants to defend a direction different from where they're attacking.

### Commitment cost — joystick release window

- **Required gap between joystick release and ring/icon press:** 50-100ms
- **Purpose:** prevents accidental block triggers from aggressive stick movement interpreted as ring taps
- **Implementation:** track last-input-touch-time on right joystick; block activation only registers if the joystick was released for at least the minimum window before the ring or icon press

### During block

- **Thumb position on ring steers shield direction:** dragging the thumb around the 12px ring band rotates the shield icon (and the character's shield) to match the thumb's angular position
- **Auto-attack is suspended:** the right joystick still controls facing/rotation but does not fire attacks; the attack-energy ring on the joystick fades to ~30% opacity to signal the suspended state
- **Stamina drain:** continuous, rate determined by equipped shield (see Part 5)
- **Chip damage from outside the shield arc still lands:** the block is directional, not omnidirectional

### Shield arc coverage

- **Arc width:** 120° centered on the shield direction
- **Damage negation:** any incoming attack whose vector intersects the arc is fully negated (subject to parry timing bonus; see Part 4)
- **Attacks outside the arc:** land normally

### Releasing block

- Thumb leaves the ring or shield icon
- Shield drops immediately — no wind-down, no delay
- Auto-attack resumes at next joystick input
- Ring returns to default faint state
- Shield icon returns to dim state

### Movement during block

- **Character movement is preserved:** left joystick continues to control movement independently
- **Block direction is decoupled from movement direction:** a player running left can block toward the upper-right by positioning the shield icon in that direction
- This is a deliberate expressiveness — players can backpedal, strafe, or reposition while maintaining directional defense

### Interaction with aim during active block

While blocking, the right joystick's relationship to the shield direction is severed. The thumb is on the ring, not the joystick. Aim direction is frozen at whatever it was when block activated. When the player releases the block, aim direction is restored and auto-attack resumes.

If a player wants to re-aim during block, they must release the block, re-aim, then re-engage.

---

## Part 4: Perfect-Timing Parry

### Parry window

A block initiated within a narrow timing window relative to an incoming attack's landing frame counts as a perfect parry with bonus effects.

- **Window width:** 0.15 seconds (150ms) before the attack's landing frame
- **Trigger:** block activation (touch on shield icon, or touch on ring at icon position) whose initiation frame falls within the parry window for an attack whose vector intersects the player's intended block arc
- **Relaxed timing option:** per §14.7's Reaction Assist framework, parry window can be extended to 0.25 seconds (250ms) as a "relaxed timing" play preference

### Parry effects on success

A successful parry delivers all of the following:

1. **Damage negation:** full (same as a non-parry block against a covered attack)
2. **Stamina cost reduction:** the parry block costs 30% of normal block cost for that initiation tick (subsequent ticks of held block return to normal rate)
3. **Attacker stagger:** the parried attacker enters a stagger state per §2.3's Poise and Stagger system
4. **Counter-attack window:** ~1.0s window following the parry where the staggered attacker takes bonus damage (tuning TBD; suggestion: 1.5× damage)

### Parry feedback

- **Visual:** brief gold burst radiating outward from the shield icon at parry moment; character shield briefly flashes brighter gold; optional subtle screen flash at very low intensity
- **Audio:** distinct high-clarity metallic clang or resonant note, different from non-parry block's softer impact
- **Haptic:** per §15.2a, a distinct haptic pattern — sharper than normal block impact

### Unparryable attacks

Some attacks cannot be parried by design (Apex monster grabs, environmental hazards, certain elemental effects). The UI signal is **absence**: the parry bonus simply does not trigger. Damage still gets negated if the attack falls in the shield arc; but stamina cost is full and no stagger/counter window opens.

Teaching is implicit. A player who attempts a parry on an unparryable attack sees the damage blocked but notices no bonus feedback. They learn by repetition which attack patterns produce parries and which don't.

---

## Part 5: Shield Equipment Role

### Shields as stat modifiers

Shields do not come in small/medium/heavy tiers. Their defensive properties derive from the existing weapon-axis dimensions (tier, rarity, Hardness, Temper, material) per §4. A higher-tier Elite shield gives more defense than a lower-tier Rare shield of the same material. Godly shields dramatically exceed normal shields by §4.1's quality multipliers.

### Shield active role — block cost reduction

Equipped shields reduce the stamina cost of holding a block.

- **Without shield equipped:** baseline block cost (significantly expensive — designed to force commitment)
- **With shield equipped:** cost reduced by a factor derived from shield stats

**Canonical formula:**

```
block_cost_per_second = base_block_cost / (1 + shield_defense_rating × 0.15)
```

where `shield_defense_rating` scales with tier, quality, Hardness, Temper, and material per existing §4 formulas. Approximate target values at representative shield tiers:

| Shield state | Cost per second |
|---|---|
| No shield | ~9 stamina/sec |
| Normal T3 shield | ~5 stamina/sec |
| Rare T6 shield | ~3 stamina/sec |
| Elite T8 shield | ~2 stamina/sec |
| Godly shield | ~0.5 stamina/sec |

### Shield passive role — damage reduction

Equipped shields also reduce damage from attacks that land *outside* the block arc (chip damage from crowds, hits during recovery frames, etc.).

**Canonical formula:**

```
shield_passive_DR = base_DR + shield_defense_rating × 0.008
```

Approximate target values:

| Shield state | Passive DR |
|---|---|
| No shield | 0% |
| Normal T3 shield | ~8% |
| Rare T6 shield | ~12% |
| Elite T8 shield | ~18% |
| Godly shield | ~30%+ |

**Stacking with armor:** passive DR stacks multiplicatively with armor DR rather than additively:

```
total_DR = 1 - (1 - armor_DR) × (1 - shield_DR)
```

This prevents runaway defense stacking at high tiers.

### Shield visual

Per §1.7a, the shield on the character renders as the actual equipped shield's visual — material, Hardness-derived wear, gem slots, crafter mark, tier-appropriate silhouette. A player blocking with a Godly shield looks different from a player blocking with a Normal shield. The shield icon on the ring is a generic shield glyph; the shield on the character is the specific object.

---

## Part 6: Teaching and Onboarding

### First-time discoverability

No tutorial panel. The ring is ambient and discoverable by curiosity. However, a single contextual prompt is permitted the first time a player's HP drops below 30% with an incoming telegraphed attack and stamina available to block.

**Prompt content:** single line, bottom-center of screen, dismissed on first successful block.

> "Touch the shield on the ring. Drag to aim it at the attack."

- Appears only once per character lifetime
- Dismissed permanently on first successful block (damage negated while blocking)
- Does not reappear if player dies before succeeding; instead reappears at next eligible low-HP moment

### Progression of visibility

Ring visibility at default state can dim slightly over time as the player demonstrates competence.

- **First ~20 blocks:** ring at default visibility (12% fill opacity)
- **20-100 blocks:** ring at 8% fill opacity
- **100+ blocks:** ring at 5% fill opacity (barely visible guide track)

The shield icon itself retains constant dim visibility regardless of progression — it is the primary affordance and must stay discoverable.

### Parry teaching

Parry is discovered organically. Players who happen to time blocks well get the bonus feedback and learn that "sometimes blocking produces extra effects." Over time they optimize for the timing.

No explicit parry tutorial. No parry meter. The feedback visual/audio/haptic is the teaching.

---

## Part 7: HUD Integration and Interaction with Existing Systems

### Coexistence with existing §15 controls

The block ring integrates with existing controls without conflict:

| Input | Action |
|---|---|
| Left joystick (drag) | Movement — unchanged |
| Right joystick (drag/hold) | Aim + auto-attack — unchanged when ring not pressed |
| Right joystick (double-tap) | Weapon swap melee/ranged — unchanged |
| Right joystick (swipe) | Special attack / elemental trigger — unchanged |
| Tap enemy | Lock on — unchanged |
| Swipe outside joystick zones | Contextual dodge — unchanged |
| **Touch shield icon** | **Activate block in icon's current direction** |
| **Drag thumb along ring band during block** | **Rotate shield direction** |

### Interaction with lock-on

When the player is locked onto an enemy, auto-attack tracks the target regardless of right joystick input. The shield icon's default aim-tracking (when no block is active) still follows the right joystick's rotation input, even though attacks are tracking the locked target. This means lock-on and shield orientation can diverge — a player can have auto-attacks tracking a locked enemy while pre-positioning their shield icon toward a different threat.

During active block, aim direction is frozen; lock-on auto-attack is suspended along with other auto-attacks.

### Interaction with shortcuts

Shortcut double-tap gestures (left edge for heal, right edge for buff) remain available during block. A player holding a block can double-tap the left edge to consume a heal without releasing the block. This intentionally supports crisis management — the player can shore up HP while defending.

### The wheel and the ring coexist

Per the unified-state model, the utility wheel (§1.7d) and the block ring are both persistent surfaces. Neither hides the other. The wheel trigger sits at a different screen location (bottom center, between the joysticks) and does not conflict spatially with the ring around the right joystick.

If a player opens the utility wheel while hostiles are nearby, the world does not pause. The wheel overlay appears on top of the HUD, but the block ring, joysticks, and all combat surfaces remain available underneath. Touching a shortcut edge while the wheel is open still fires the shortcut. The block ring's shield icon is still touchable if it is not covered by the wheel overlay.

When the wheel overlay covers part of the right joystick region, block-ring interaction is suspended for as long as the overlay is present. The player must close the wheel (or have it auto-close — see §1.7d) to regain access. This is a small but real cost of wheeling out during combat.

---

## Part 8: Color and Typography Canon

- **Ring default fill:** `rgba(244, 199, 117, 0.12)` — 12% opacity gold
- **Ring dashed edges:** `rgba(244, 199, 117, 0.25)`
- **Lit segment active fill:** `#F4C775` at full opacity
- **Lit segment glow:** `#F4C775` blurred, stdDeviation 3
- **Shield icon default:** `rgba(244, 199, 117, 0.4)` fill, `rgba(244, 199, 117, 0.6)` stroke
- **Shield icon active:** `#F4E0A8` fill, `#5A3A10` stroke
- **Stamina cost readout:** `#F4C775`, 9px monospace (SF Mono / JetBrains Mono)
- **Parry flash:** gold burst `#F4E0A8` fading to transparent, ~0.3s duration

The warm gold family is consistent with the earlier parry spec and with §1 thesis framing — gold as "opportunity/reward" color, associated with resonance windows and perfect-fifth ritual notes. Do not use red (danger) or blue (cold) for defensive feedback; those colors carry different semantic weight.

---

## Part 9: Tuning Constants

Constants for implementation tuning; final values to be set by playtesting:

| Constant | Suggested value | Purpose |
|---|---|---|
| `RING_BAND_THICKNESS` | 12px | Visual and tap zone thickness |
| `RING_INNER_RADIUS` | 45px | From joystick center |
| `RING_OUTER_RADIUS` | 57px | From joystick center |
| `SHIELD_ARC_COVERAGE` | 120° | Damage negation arc on character |
| `SHIELD_ICON_SIZE` | 28×30px | Shield glyph dimensions |
| `LIT_SEGMENT_ARC` | 70° | Visual glow arc centered on shield icon during block |
| `BLOCK_COMMITMENT_GAP` | 75ms | Required joystick-released window before ring/icon press registers |
| `PARRY_WINDOW` | 150ms | Window for perfect-timing parry bonus |
| `PARRY_WINDOW_RELAXED` | 250ms | Extended window for accessibility per §14.7 |
| `PARRY_STAMINA_DISCOUNT` | 0.30 | Multiplier on first-tick stamina cost during parry |
| `PARRY_COUNTER_WINDOW` | 1.0s | Duration after parry where counter-attack gets damage bonus |
| `PARRY_COUNTER_DAMAGE_MULT` | 1.5× | Damage multiplier during counter window |
| `SHIELD_COST_REDUCTION_COEF` | 0.15 | Coefficient in block cost formula |
| `SHIELD_DR_COEF` | 0.008 | Coefficient in passive DR formula |
| `RING_OPACITY_BASELINE` | 0.06 | Ring opacity when no hostiles in detection range |
| `RING_OPACITY_HOSTILE` | 0.12 | Ring opacity when hostile is within aggro range |
| `RING_OPACITY_TRANSITION` | 400ms | Fade duration when hostile state changes |
| `RING_DETECTION_RANGE_MULT` | 2.0 | Multiple of player attack range used for hostile detection |
| `RING_VISIBILITY_20_BLOCKS` | 0.08 | Opacity after 20 blocks (applied as cap to RING_OPACITY_HOSTILE) |
| `RING_VISIBILITY_100_BLOCKS` | 0.05 | Opacity after 100 blocks (applied as cap to RING_OPACITY_HOSTILE) |
| `AIM_TRACKING_SMOOTHING` | 50ms | Interpolation on shield icon following aim (when not blocking) |
| `RING_DRAG_SMOOTHING` | 30ms | Interpolation on shield icon following thumb drag on ring |

---

## Part 10: Implementation Checklist

### Ring visuals

- [ ] Ring renders at 12px thickness, radius 45-57px from joystick center
- [ ] Default faint state: 12% opacity gold fill with dashed inner and outer edges
- [ ] Active state: 70° lit arc centered on shield icon, full opacity with gaussian blur glow
- [ ] Lit segment center always aligns with shield icon position as it rotates
- [ ] Ring visibility reduces at block-count thresholds (20 blocks → 8%, 100 blocks → 5%)
- [ ] Ring always visible; opacity proximity-modulated (6% baseline, 12% with hostile in aggro range, 400ms transitions)

### Shield icon

- [ ] Shield icon renders at 28×30px shield-shape glyph on ring band at radius 51px
- [ ] Icon position in default state follows right joystick aim direction (50ms smoothing)
- [ ] Icon position during block follows thumb drag on ring (30ms smoothing)
- [ ] Default state: dim gold (`rgba(244, 199, 117, 0.4)` fill)
- [ ] Active state: saturated gold (`#F4E0A8` fill), high-contrast stroke
- [ ] Icon is directly tappable regardless of aim direction — touch on the icon itself activates block
- [ ] Icon remains at last-known position when joystick released and no ring interaction active

### Activation

- [ ] Player can activate block via direct touch on shield icon (Path A)
- [ ] Player can activate block via touch on the ring band at the shield icon's current position (Path B)
- [ ] Activation requires right joystick released for at least `BLOCK_COMMITMENT_GAP` before touch registers
- [ ] Block raises shield on character in shield icon's current direction immediately on activation

### During block

- [ ] Stamina drains continuously at rate determined by equipped shield (formula in Part 5)
- [ ] Auto-attack suspended during block; right-joystick attack-energy ring fades to ~30%
- [ ] Aim direction frozen during block (right joystick input does not affect aim)
- [ ] Shield direction follows thumb position on ring — dragging around the band rotates the shield
- [ ] Shield arc covers 120° centered on shield direction; damage negation inside arc only
- [ ] Chip damage from outside arc still lands (reduced by passive shield DR)
- [ ] Left-joystick movement unaffected during block

### Release

- [ ] Releasing thumb from ring/icon drops shield immediately with no wind-down
- [ ] Auto-attack resumes on next joystick input
- [ ] Ring returns to faint state; shield icon returns to dim state
- [ ] Aim direction unfrozen; subsequent right-joystick input resumes aiming

### Parry mechanic

- [ ] Parry window tracked on incoming attacks intersecting shield arc
- [ ] Block activation within 150ms of attack landing frame triggers parry bonus
- [ ] Parry: 30% stamina cost for that tick, attacker stagger per §2.3, 1.0s counter window with 1.5× damage
- [ ] Parry feedback: visual (gold burst), audio (distinct clang), haptic (sharper pattern per §15.2a)
- [ ] Relaxed timing option extends window to 250ms per §14.7

### Shield equipment effects

- [ ] Equipped shield's stats reduce per-second block stamina cost per formula
- [ ] Equipped shield provides passive DR against out-of-arc damage per formula
- [ ] Shield DR stacks multiplicatively with armor DR, not additively
- [ ] Shield on character renders as the equipped object per §1.7a (material, Hardness, Temper, gems all visible)

### Teaching

- [ ] First-time contextual prompt appears when HP <30% with incoming telegraphed attack and stamina available
- [ ] Prompt text: "Touch the shield on the ring. Drag to aim it at the attack."
- [ ] Prompt dismissed permanently on first successful block
- [ ] Block count persisted per character for visibility-fade progression
- [ ] No parry tutorial — discovered organically through feedback

### Integration

- [ ] Ring coexists with all existing §15 right-joystick inputs (drag, double-tap, swipe)
- [ ] Lock-on persists through block; auto-attack tracks locked target when block releases
- [ ] Shortcut double-taps (left/right edge) work during active block
- [ ] Ring coexists with utility wheel overlay; block-ring interaction suspended only while wheel overlay covers the right joystick region

---

## Cross-references

- **§1.1a** — Hold-over-rush thesis (mechanical foundation for the held-block design)
- **§1.7a** — Show the object (shield renders as equipped shield on character)
- **§2.3** — Poise and Stagger (parry stagger effect)
- **§4** — Equipment system (shield stats derive from existing dimensions)
- **§14.7** — Reaction Assist / relaxed timing (accessibility option for parry window)
- **§15** — Combat HUD (this spec extends §15 with the defensive layer)
- **§15.2a** — Haptic Feedback Layer (block and parry haptic patterns)
- **§1.7d** — Utility wheel (coexists with ring; world never pauses during wheel use)

---

## Design notes

The directional block ring is a deliberate alternative to a persistent shield button. It costs screen real estate for visual indication (ring, icon) but saves it on touch targets (no persistent button). The shield icon is directly touchable at any time — the player does not need to pre-orient their aim before defending. Once touched, the thumb drags along the ring band to steer the shield direction, giving players continuous directional control over their defense.

The aim-tracking of the shield icon in its default state is a convenience: players who are already aiming at a threat find the icon pre-oriented, giving them a speed advantage. But the mechanic does not require this pre-orientation. A player surprised from behind can grab the shield icon wherever it currently sits and drag it to the attack direction in a single continuous gesture.

The skill ceiling lies in accurate rotation under pressure — finding the icon, reaching it, and dragging to the correct direction all within the parry window requires deliberate practice. The skill floor is reasonable because the gesture is continuous: find, touch, drag, hold. No sequencing of unrelated inputs.

This mechanic shifts combat identity toward deliberate, positional defense — closer to Monster Hunter or Souls-like feel than to reactive parry-windows in modern action games. The held-block duration is where skill accumulates; the parry bonus is a reward for perfect reading within that duration, not a primary defense layer.

Ranged and mage builds remain viable because shield equipment is optional. A mage without a shield can still block via the ring; they just pay higher stamina costs per second. This keeps the mechanic universal while creating a meaningful role for shield equipment — not a slot that gates access to defense, but a slot that makes sustained defense affordable.
