/* ═══ zLayers.js — the client z-index registry ═══ */
/* v2.3.1205: created after the 2026-07-07 owner report that the
   onboarding tutorial banner was invisible on iPhone: it rendered at
   `bottom:180, zIndex:20` while the opaque BottomDashboard is
   `position:fixed, bottom:0, height:var(--dash-h)` (28vh ≈ 225px on an
   ~800px-tall iPhone) at zIndex 30 — the banner sat INSIDE the
   dashboard band and BELOW it in the stack.  Nothing enforced the
   ladder; this file is now the place to look before picking a z.

   THE TWO RULES
   1. Anything the player must be able to READ or TAP while the
      dashboard is visible goes ABOVE Z_DASHBOARD (30).  Player-decision
      prompts must never render under chrome.
   2. Bottom-anchored elements must also clear the dashboard BAND
      geometrically: offset with `bottom: calc(var(--dash-h) + Npx)`
      (the CSS var in src/styles/game.css is the single source of truth
      for the band height) — a high z alone would float the element ON
      TOP of the dashboard, covering it.

   OBSERVED LADDER (survey of src/ui + src/styles/game.css, v2.3.1205 —
   update this table when adding a layer; partial older note at
   src/ui/mobile/BlockRing.jsx):

       6      joystick touch zones (TouchControls lZone/rZone; canvas below)
      10      in-ring HUD (BlockRing shield — deliberately under prompts)
      16      party roster (PartyHUD side list)
      17-19   inline info panels in BroTown.jsx (quest tracker, zone
              title, death-drop notice, status effects — top-anchored)
      20-22   banners + toasts (farm/sleep/rested banners, achievement,
              level-up overlay, ActiveWarBanner)
      25      topbar / chat strip; WorldChatFeed (v2.3.2037 -- the lower-left
              World Chat section.  It sits at 25 rather than above the
              dashboard because it CLEARS the band geometrically with
              `bottom: calc(var(--dash-h) + 8px)`, which is rule 2: a higher z
              would float it ON TOP of the dashboard controls instead.)
      28      ping readout; EndedWarBanner (pre-v2.3.1205)
      30      DASHBOARD (BottomDashboard, joystick visuals,
              top-right player card)
      31      special charge pie (SpecialChargePie); onboarding tutorial
              banner (v2.3.1234: was 34 — must yield to modals)
      32      .bt-inspect decision modals + building panels (v2.3.1234:
              was 30 — shared the rung with joystick visuals and DOM
              order painted the joysticks OVER open panels)
      34      Z_ABOVE_DASH_PROMPT — prompts/banners that must beat the
              dashboard but stay under .bt-interact-prompt
      35-36   contextual prompts (.bt-interact-prompt, ChatLauncher,
              dashboard Tooltip)

   BOTTOM-BAND SLOTS (v2.3.1234) — centered, bottom-anchored elements
   above the dashboard band each own a vertical slot so they never
   stack on one another:
       +24    .bt-interact-prompt (z35)
       +64    .bt-emote-bar (z34; was +12, under the prompt)
   The onboarding tutorial banner LEFT this band entirely (was +16,
   fighting the prompt and the joystick ring tops): it now sits
   top-center at top:128 — below the zone title (~26) and the
   top-right player card (~10-125), a strip owned by nothing else.
      40      InfoPanel
      50-60   popups (ItemDetailPopup 50, SpendPointConfirm 60)
      90      XP fly overlay
      95      chat bubbles (ChatBubble)
     100      minigames (Fishing/Cooking/WoodChop/Mining)
    9000      chat panel (ChatPanel)
    9200      MoreOverlay
    9300      ControlsTutorial, MasteryNotification
    9400      InfoPopup (v2.3.2131) -- opened from panels inside
              MoreOverlay, so it has to clear 9200, and it is an aside
              rather than a flow, so it stays under the modals
    9999      name modal (.bt-name-modal)
   10000      account modal (AccountModal)
   99000+     inventory surface (InventorySurface 99000/99500,
              InspectCard 99800)
   99999+     debug / exit dim (.bt-exit-dim)
  100030+     item tooltips (ItemTooltip)

   Export constants ONLY for layers this registry's adopters actually
   use — grow the exports as call sites migrate, don't pre-mint the
   whole table. */

/* The opaque bottom dashboard band (BottomDashboard.jsx). */
export const Z_DASHBOARD = 30;

/* Player-facing prompts/banners that must render above the dashboard
   (rule 1) but below the contextual .bt-interact-prompt layer (35). */
export const Z_ABOVE_DASH_PROMPT = 34;
