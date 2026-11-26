card: SHOP
branch: claude/plan-shop-1-shield
prs: (draft, opening; tag 6800)
state: working

## Done
- Diego sells the Pine Shield (100 coins, burnt) as a replacement to a player
  tut_1 gave one who owns none: shop.js (rule `shieldWhyNot`, pure), the mint
  lifted (quests.js `questShieldMint`), gold road and stash road
  `shop_shield`, cap `shieldshop` on its own line, kill switch `shieldshop`,
  the panel's row, the phone's bag copy (gameEvents.js), the spec
  docs/specs/shop-shield.md. shop.test's section saw every planted mistake red.

## Next
- mp-shieldshop on the final code, precheck, the whole server suite, push.

## Found
- gearstash.js:294-295: the join cuts a shield list over the cap (48/32)
  without the player choosing; it can never take the last one (cap >= 1).
- gearprov.js:154-163: a worn shield can be listed off the arm (the
  player's choice, but they may not notice it is the worn one).
- devtools.js:177 writes the Pine Shield's row by hand
  (`{kind: 'shield', ...}`), not from data.js's tut_1 row.

## Needs
- The orchestrator's word on where the shield lands (asked once, 11-26). Built
  on my pick: the bag, through the stashes' door. Also took
  src/networking/gameEvents.js (the phone's bag copy), outside the card.
