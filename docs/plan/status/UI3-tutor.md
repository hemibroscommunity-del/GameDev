card: UI3-tutor
branch: claude/plan-ui3-11-tutor
prs: (opening: draft, base main)
state: working

## Done
- Tag 6791. FIND first (mp-tutorclear on main's build): sideways the coach's TALK TO MAYOR BRO card (hung below him) on the right lobe; sideways the big arrow's "Tap to open" on the rail; the "Next: ..." toast and the Add to Home Screen card 12 to 14 px over the band, inside the shell, upright and sideways; the controls tour's card sideways. Upright 375 x 667 the coach and the arrow were already clear.
- The rule `src/game/tutorClear.js` (housings from padLayout + the tier; up AIR over the highest housing spanned, or a slide into the open middle; never over the ceiling: cut), its glue `src/ui/tutorSpot.js`, and the five messages asking it (QuestCoach, StoreToast, InstallHint, guideArrow, ControlsTutorial).
- `tools/guards/tutor-clear.test.mjs` (the rule's cases, the messages ask it by their syntax tree, a census of band-hung messages that only falls; plants T1 to T6 red); `tools/qa/mp/mp-tutorclear.mjs` (lane full).
- UI-DESIGN-NOTES (Arriving in BroTown; The controller) and docs/specs/control-redesign.md: the rule in one paragraph.

## Next
- The phone run on the final code; pictures in docs/shots/; the draft PR; one message to the orchestrator.

## Found (outside the card, not mended)
- The welcome tour's step banners and its "Start tour" prompt (BroTown.jsx) are dormant since v2.3.1593 (`_tourPromptInit = false`): never shown, so not moved (TRAPS 305).
- Other things hung from the band at a fixed bottom, not tutorial messages (the census in tutor-clear.test 8): FarmBedPrompt, WorldChatFeed, ChatBubble, EmotePanel, NmlBadge, ItemDetailPopup, InfoPanel, ShopkeeperPanel, TradeWindowPanel, BottomDashboard, ten in BroTown.jsx (most of these in the retired old lands).

## Needs
- Nothing.
