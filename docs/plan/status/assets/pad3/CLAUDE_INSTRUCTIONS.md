# BroTown — unified retro controller implementation

## Goal
Replace the existing separate controller structures with one seamless navy-and-gold virtual controller attached to the top of the existing dashboard. `approved_mockup.png` is the visual target; `preview_town.png` and `preview_combat.png` show the actual supplied PNG assets assembled. These are closely matched assets, not pixel-identical extractions of the mockup. Use `layout.json` as the initial coordinate contract and tune only if necessary to preserve clearances. Do not redesign the dashboard, world, menus, or combat mechanics.

## Assembly
- Use `assets/housing.png` as the only controller shell. No extra backing plates, borders, screws, chat button, separate weapon selector pill, or standalone controller wings.
- Layout reference is 920 x 280 units, bottom anchored immediately above the existing dashboard tab strip. Each entry in layout.json is [centerX, centerY, width, height]. Scale all positions and sizes together to fit available width; preserve the overall aspect ratio. The housing fills the reference rectangle (its raw PNG is wider in aspect ratio than the layout, so set its drawn width/height explicitly). Keep this reference aspect ratio on mobile; on desktop retain the existing responsive behavior or cap the controller width and center it. Do not increase dashboard height; the controller occupies the playfield overlay above it, and follows the dashboard top when opened/closed.
- All controls are independent interactive layers above the shell. No button may cover the perimeter, its neighbor, or the dashboard. The upper three action slots use equal dimensions and center spacing; the lower two large buttons use equal dimensions and are horizontally aligned. Keep the large jump button comparable to attack because it is frequently used.
- Left: joystick_base.png is stationary; joystick_thumb.png moves continuously with the touch vector. Clamp movement to the existing joystick radius/deadzone and return to center on release. Use pointer capture and handle touch cancel; do not change movement semantics.
- Center: three independent weapon_slot.png circles with weapon_slot_selected.png for selected slot. Render sword/bow/staff icons independently, using included weapon_icon PNGs or existing higher quality in-game weapon icons. No shared pill. Preserve current selection logic and ordering.
- Right top (left-to-right): shared mobility, shield, special. Right bottom: jump, attack. Map each to the existing game action handlers. Attack art swaps between attack_sword.png, attack_bow.png, and attack_staff.png with equipped weapon. In town, use attack_sword_disabled.png for disabled sword attack or apply equivalent disabled shader to other weapon versions if needed; preserve existing safe-zone restrictions.

## Fixed shared mobility slot — skateboard OR charge
Exactly ONE hit target and ONE visual slot, at `mobility` in layout.json. In town when skateboard is available, show mobility_skateboard.png and route input to existing skateboard toggle; show an active rim while mounted. Outside town, when existing charge attack eligibility is met, show mobility_charge.png and route input to existing charge action. They must never be displayed together or create extra buttons. When neither applies, render action_socket.png and disable input. Use existing eligibility logic rather than inventing charge distance, duration or cooldown. If both flags ever arrive erroneously, town/skateboard mode wins in town and charge wins outside town, while server-side validation remains authoritative. Update icon, handler, enabled state and accessibility label atomically; cancel a held interaction on mode switch. Never move any neighboring button.

## Gameplay states
- Town: skateboard where available, jump green, attack disabled when current rules require it, shield/special empty if unavailable.
- Exploration: jump and attack; contextual slots show empty wells where not applicable.
- Active combat: shield and special appear in their fixed wells as permitted by existing logic; charge only occupies shared mobility when eligible.
- Keep an already relevant action visible but dimmed when on cooldown or lacking resources; empty wells are for actions that are contextually absent. Do not alter combat rules or server-authoritative validation.

## Button phases (runtime, not baked animation frames)
- Idle/ready: full-color cap, unchanged gold rim.
- Pressed/held: scale cap/whole sprite approximately 0.96 around center or darken it slightly, with fast 80–120 ms transition; maintain static hitbox. Shield remains visually held while input is held.
- Active/mounted: draw a subtle color-matched outer ring; animate only opacity, no geometry or layout changes.
- Cooldown: use a clipped dark radial sector over the interior face with dynamic progress and optional remaining time. No pre-rendered cooldown wedges or static text. Avoid covering rim or adjacent controls.
- Disabled: dim/desaturate button face; retain gold rim when possible. Keep inactive state non-interactive where appropriate. Empty socket is a separate supplied asset. Special-ready glow should be subtle, not perpetual flashing.
- For CSS or Pixi, use normal PNG sprites plus native runtime tint, radial mask, scale and ring overlays. Use current rendering stack and avoid per-frame DOM layout or unnecessary textures. Load textures once, cache them, and use existing state signals. Multi-touch must support moving and attacking/jumping simultaneously. Only actual hit regions intercept gameplay touch; transparent shell space should not prevent relevant world input.

## Acceptance checks
1. Compare to approved_mockup.png at matching portrait viewport; unified outline is smooth and continuous, no screws/chat/extra structure.
2. Open and close the dashboard: controller remains immediately above it, no overlap or layout jumps, dashboard height unchanged.
3. Validate town, wilderness, active combat and charge-ready states; mobility occupies the same exact position and only one handler is active.
4. Check all three weapons, press/hold/release, cooldown, mounted, disabled and empty phases, including touch cancel and multi-touch.
5. Verify on a narrow portrait phone and desktop. All buttons remain clear of the shell outline and each other; no distortion or clipping. Keep existing server-authoritative game behavior unchanged.
