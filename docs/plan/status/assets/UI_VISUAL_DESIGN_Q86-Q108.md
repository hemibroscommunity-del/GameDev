# BroTown — Visual Design Handoff (Q86–108)

**Date:** November 25, 2026  
**Status:** Foundational visual direction approved; production screen mockups, asset audit and implementation approval still pending.  
**Prior specifications:** Q1–35, Q36–72 and Q73–85 architecture handoffs.

Merge into the canonical UI specification (`docs/design/UI_ARCHITECTURE_V2.md` if that is the established location), retaining architecture decisions. This is an incremental design record, not authorization to implement or replace existing art. The actual repository has not been audited. Preserve the existing mobile dashboard height, gameplay viewport and art. Do not add game mechanics, change formulas, or implement future features on the basis of illustrative mockups.

## Approved decisions

| Question | Owner decision | Design rule |
|---|---|---|
| 86 | B | Polished Lantern Slate, retain existing game artwork and aesthetic. |
| 87 | C | Strong visual distinction: recessed information, raised navigation, clearly differentiated action buttons. Action color refinements below supersede gold-only treatment. |
| 88 | A | Smooth rounded metallic geometry, no chamfered corners. |
| 89 | A | Restrained gold: outer frame and intentional accents, not gold outlines around every destination. |
| 90 | B | Fine brushed slate, low-contrast directional texture. |
| 91 | C | Classic RPG serif typography; exact font not yet approved. |
| 92 | A+B | Artwork directly on raised navigation surfaces; recessed item/equipment sockets. |
| 93 | D+A | Rarity expressed primarily through outlines, with graduated prestige. |
| 94 | B, stronger | Pronounced physical depression for active selection; stable component footprint. |
| 95 | A | Continuous metallic progress fills in recessed tracks. |
| 96 | A | Neutral ordinary information, selective semantic colors for meaningful states. |
| 97 | A | Balanced headline/supporting numerical hierarchy, no oversized scoreboard treatment. |
| 98 | Recommended C | Adaptive information density, strongly minimalist; deeper supporting details belong in their own destinations. |
| 99 | A | Integrated header on slate surface, raised navigation controls. |
| 100 | A+C | Full-width single action or contextual bottom row with relevant decision information. |
| 101 | C | Context-specific action colors. |
| 102 | Revised B | Polished metallic gradient fills and broad reflected light across face and bevel, not thin solid-color highlight lines. |
| 103 | A | Shallow dashboard framing; reserve pronounced physical depth for controls. |
| 104 | C | Adaptive button proportions; illustrated large primary tiles, compact deeper/secondary navigation. |
| 105 | Recommended C+B | Artwork dominant on primary destinations; balanced art/label on secondary destinations. Full-color art, not monochrome line icons. |
| 106 | A | Desaturated locked/unearned artwork; restore original color when unlocked; remain inspectable. |
| 107 | D | Count badges for countable events, dots for general updates, rare warm illumination for exceptional opportunities. |
| 108 | B | Light metallic action gradients with one consistent dark text color; prioritize legibility. |

## Material and component rules

- Use the existing Lantern Slate identity, not a new brown/wood, generic fantasy, or black-and-gold theme. Earlier illustrative palette references include slate #26383E, panel #1E2E34, raised #293B41, recessed #111E23, deep #0B161B, brass #D8AA58, highlight #EAC675, light text #F4F0E7. These are working references, not a verified audit of repository tokens.
- Shallow frame, thin restrained gold rim, fine low-contrast brushed texture. Rounded metallic buttons have broad continuous gradient surfaces and graduated bevels. Avoid flat outlines, thin decorative shine lines, screws and heavy ornamental framing.
- Raised navigation destinations use slate-metal surfaces and light readable labels. Recessed information and item sockets remain visibly distinct. Light action faces use dark labels consistently across the entire semantic action palette. Do not switch action text from black to white between colors. Use smooth, light-enough gradients behind lettering, with reflections concentrated away from text as necessary. Target at least 4.5:1 contrast for normal-sized text throughout its occupied gradient area; verify actual implementation states, including pressed states.
- Working action palette: gold = routine actions (Equip, Purchase, Craft); green = acceptance/confirmation/claim; blue = guidance/movement (Track, Locate, Travel); red = destructive actions (Discard, Abandon, Delete); silver = neutral/dismissive (Cancel, Decline). The owner selected the light/dark-letter treatment from this proposed five-color palette. Exact hues and context-specific edge cases remain subject to screen review. Back/Menu/Close retain the approved navigation semantics; do not mistake a silver navigation control for a gameplay commitment. Red is reserved for genuinely destructive consequences, not ordinary cancel.
- A selected control looks deeply pushed into the dashboard, using inverted depth, shadow and changed surface lighting, not just a subtle tint. Preserve touch footprint, surrounding layout, labels and rarity outline. Differentiate momentary press from persistent selected state according to actual control semantics.
- Inventory rarity uses clean border treatment: common neutral, rare blue, epic orange with more pronounced metallic finish, Godly prismatic with restrained glints/animation. Preserve existing actual rarity definitions, colors and artwork; no invented tiers or probabilities. Keep dark recessed interiors. Provide non-color cues where relevant. Respect reduced-motion settings.
- Continuous progress fills with recessed track; retain existing gameplay-specific health/mana conventions. Ordinary stats use ivory/white values and muted readable labels; meaningful changes, warnings, rarity, rewards and actions can use semantic color. Do not make ordinary metrics rainbow-colored.
- Classic RPG serif direction approved, but choose and test an actual licensed font for mobile legibility, numeral alignment, and performance before locking it. Keep headings and body readable; exact type scale remains a production decision.
- Existing sprites, items, characters, NPCs, monsters, buildings and world artwork are authoritative. No generated replacement art. Reuse colorful existing icons where appropriate. Only create new full-color matching navigation artwork for genuine missing assets after auditing existing assets. Placeholder vector icons shown in the design discussion are not production art.
- Use adaptive proportions and artwork prominence according to established subject hierarchy. Primary tiles may be larger, secondary tiles more compact. Keep explicit readable text labels; never rely solely on icon interpretation. Universal directory remains equal-weight as previously decided.
- Use integrated titles with Back/Menu/Close where applicable, no raised decorative title plates. Contextual action bar only when needed; full-width for a single simple action, price/requirements alongside where decision-relevant. Do not add a separate confirmation to routine actions contrary to earlier architecture rules.
- Maintain one meaningful information question per screen. Show headline metrics and essential context; branch to deeper calculations, factors and attributes rather than displaying all at once. Denser screens are allowed only where simultaneous comparison or management has clear utility (inventory, comparisons, specialized analysis).
- Locked artwork desaturated, with understandable status and requirements; inspection remains available. Disabled action reason visible as previously specified. Count indicators for real countable outstanding items, dots for general updates, rare warm gradient illumination for exceptional events. No perpetual competing glows.

## Next phase: real screen mockups

Prototype the Bro/character landing screen first, then Universal Menu and representative deeper screens and workspaces. Use actual screenshot proportions, actual game data where known, and actual art assets. The first static screenshot composition uses the existing gameplay screenshot as its background and cropped existing icons; small screenshot crops are low-resolution placeholders until original transparent source sprites are retrieved. Do not treat prototype geometry, typography, exact colors or crop quality as approved production assets. Do not change the gameplay controls or viewport merely to accommodate menu design.

Validate against actual mobile layout constraints and safe areas, navigation history, full-size touch targets, keyboard/accessibility where relevant, long names/labels, rarity/selection states, readable text contrast, and the child-discoverability benchmark. Audit repository component structure and actual asset paths before implementation. No implementation until the owner approves production visual direction and screen mockups.
