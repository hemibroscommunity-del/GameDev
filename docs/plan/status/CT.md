card: CT
branch: claude/plan-ct-8-freefire (item 8, stacked on claude/plan-ct-7-mends)
prs: #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, at the gate), item 8 (6547, draft: its number in the PR's words)
state: ready

## Done
- PRs 1-2 (6540 #2282, 6541 #2293) merged; 3-5 (6542-6544) in via #2330.
- Item 6 (6545): sprint past the stick's rim (`?rimsprint=0`).
- Item 7 (6546): the line only in combat (`?sightline=1`); the plain sword.
- Item 8 (6547): the free arrow (a press with nothing sighted looses on the
  body's facing; game/freeAttack.js freeArrowGo; `?freefire=0`); the sword
  stays (`?meleestay=0`: the dash lunges at the lock, latchLungeGo). No
  server line; tools/guards/free-attack.test.mjs (no deploy); mp-twobuttons
  2c's stay step, part 7.

## Next
- Three CT parts from claude/plan-ct-8-freefire: tap-and-hold auto-attack;
  Block, Charge (the dash's button), the thumb's layout; node and townsfolk.

## Found
- Item 8's repro (430x775 @3x, a greatsword, one press, 5 s): the body
  moved 0 px; nothing on mode 5's press reaches maybeSwordDash. Main from
  #2293 to #2330 (11-24 06:56-10:24 -0800) ran it as mode 4's press: the lunge.
- 3c/3d sideways: Block/Special flip in the DOM while their probes say
  shown and the phase holds (part 12's; seen again in item 8's run).
- Turn band at 430x775: dead 4.5, TURN 11.25, rim 37.5 px.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
