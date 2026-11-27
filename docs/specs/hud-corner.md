# The top-left corner: the character HUD alone (tag 6790, card UI3 PR 10)

The owner, 2026-11-27, about 04:36 UTC: *"When is the character hud going in
top left? Also move stuff out of the way. Maybe just keep quests in quest area
for now. Leave only character hud in top left corner."*

In play, with the character HUD up (`src/ui/hud/CharacterHud.jsx`, its rules
`src/game/charHud.js`), the top-left corner holds the HUD and nothing else that
is always there. The quest card (`src/ui/QuestCard.jsx`) draws nothing: the
tracked quest, its steps and its "ready" are on the Quests page, and a quest
ready to hand in lights the Quests door's dot and the Menu button's, which
were already there (`BottomDashboard.jsx` `dots.quests`, `dashDests.js`
`frameMarks`), so no new mark was added. The things that show only at times
take the line's place: the status column (the element chips, the buffs, the
trap's button) 4 px under the HUD, the party chip under the column's two rows
(48 px), and sideways beside the HUD under the top bar, as before. The coach
keeps its cards clear of the HUD's own box (`cornerBox`, `cornerSpan`), never
of a line that is not there. `?questline=1` (remembered under `bt_questline`;
`?questline=0` forgets) brings back UI3-hud's one line under the HUD, with
the column under it; `?hud=0` gives main's full quest card, whatever
`?questline` says. The rule is `src/game/hudCorner.js` (`hudCorner`,
`cornerQuest`); `src/styles/game.css` draws its numbers
(`html[data-charhud="1"]`, and `html[data-questline="1"]`, written by the
quest card while the line is drawn); `tools/guards/hud-corner.test.mjs` holds
the rule, the CSS's cascade, the quest card's gate and the coach's box, with
the dodges planted; `tools/qa/mp/mp-charhud.mjs` steps 4 and 5 hold the
running page (upright and sideways). Pictures: `docs/shots/ui3-corner-*.png`.
No server file, cap or live flag: the change deploys nothing.
