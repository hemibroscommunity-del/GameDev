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
      25      topbar / chat strip
      28      ping readout; EndedWarBanner (pre-v2.3.1205)
      30      DASHBOARD (BottomDashboard, joystick visuals,
              .bt-inspect decision modals, top-right player card)
      31      special charge pie (SpecialChargePie)
      34      Z_ABOVE_DASH_PROMPT — prompts/banners that must beat the
              dashboard but stay under .bt-interact-prompt
      35-36   contextual prompts (.bt-interact-prompt, ChatLauncher,
              dashboard Tooltip)
      40      InfoPanel
      50-60   popups (ItemDetailPopup 50, SpendPointConfirm 60)
      90      XP fly overlay
      95      chat bubbles (ChatBubble)
     100      minigames (Fishing/Cooking/WoodChop/Mining)
    9000      chat panel (ChatPanel)
    9200      MoreOverlay
    9300      ControlsTutorial, MasteryNotification
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
