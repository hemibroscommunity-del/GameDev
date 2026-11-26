card: SHOP
branch: claude/plan-shop-1-shield
prs: the draft PR of this branch (tag 6800)
state: ready

## Done
- Diego sells the Pine Shield (100 coins, burnt) as a replacement to a player
  tut_1 gave one who owns none: shop.js (rule `shieldWhyNot`, pure), the mint
  lifted (quests.js `questShieldMint`), gold road and stash road
  `shop_shield`, cap `shieldshop` on its own line, kill switch `shieldshop`,
  the panel's row, the phone's bag copy (gameEvents.js), the spec
  docs/specs/shop-shield.md. shop.test's section saw every planted mistake red.

- Seen green on the final code: precheck 0 FAIL (the whole server suite in
  it), mp-shieldshop 12 of 12 (row, buy, bag, Equip, no row for a holder).

## Next
- Nothing: the PR waits for the gatekeeper. It deploys the worker.

## Found
- gearstash.js:294-295: the join cuts a shield list over the cap (48/32)
  without the player choosing; it can never take the last one (cap >= 1).
- gearprov.js:154-163: a worn shield can be listed off the arm (the
  player's choice, but they may not notice it is the worn one).
- devtools.js:177 writes the Pine Shield's row by hand
  (`{kind: 'shield', ...}`), not from data.js's tut_1 row.

## Needs
- Nothing. The orchestrator (part 27) chose the bag, through the stashes'
  door, and gave src/data/say/shopkeeper.js (unused: the tools' words fit)
  and docs/WIRE-PROTOCOL.md. Also taken: src/networking/gameEvents.js (the
  phone's bag copy), and docs/plan/census/caps.md (re-generated).
