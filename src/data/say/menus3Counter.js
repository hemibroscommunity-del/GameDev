/* v2.3.6872: the Counter in the new panel, its own words (card MN step 13;
   docs/design/menus3/SPEC.md "Counter"; docs/specs/player-words.md).  The
   Blacksmith's own words -- its tabs, its buttons, every refusal and result --
   are today's Blacksmith's (data/say/smithy.js), read from there. */
export const SAY = Object.freeze({
  'menus3Counter.make': 'Make',
  'menus3Counter.title': '{station} · {mode}',
  'menus3Counter.gold': '{n} gold',
  'menus3Counter.tabsAria': 'Show the bench\'s recipes',
  'menus3Counter.pick': 'Tap a recipe to make it.',
  'menus3Counter.qtyAria': 'How many',
  'menus3Counter.minus': 'One fewer',
  'menus3Counter.plus': 'One more',
  'menus3Counter.max': 'Max',
  'menus3Counter.maxAria': 'As many as you can make ({n})',
  'menus3Counter.go': '{verb} {n}',
  'menus3Counter.working': 'Working… {made} of {n}',
  'menus3Counter.made': 'Made {made} of {n}.',
  'menus3Counter.stopped': '{fail}. Made {made} of {n}; the rest was not sent.',
  'menus3Counter.one': 'One at a time',
  /* v2.3.6873 (card MN step 13b): the Woodworker's and the Cookhouse's words that today's windows
     wrote in place (TrapsTab.jsx, CookPanel.jsx), the same words; the rest are theirs
     (data/say/woodwork.js) */
  'menus3Counter.station.woodworker': 'Woodworker',
  'menus3Counter.station.cookhouse': 'Cookhouse',
  'menus3Counter.trapName': 'Box Trap ×{n}',
  'menus3Counter.trapHow': 'One log of any kind each. A trap is used every time it springs.',
  'menus3Counter.trapNoLogs': 'You have no logs. Chop any tree out in the lands, then come back.',
  'menus3Counter.trapXp': '+{xp} XP each',
  'menus3Counter.cookLevel': 'Cooking Lv {lvl}',
  'menus3Counter.cookIntro': 'Cook what your farm grows into meals and brews.',
  'menus3Counter.cookFish': 'Raw fish are cooked at a campfire, not here: tap a log in your bag, choose Light fire, then tap the fire.',
  'menus3Counter.cookHerbs': 'Herbs',
  'menus3Counter.cookMealsHead': 'Meals & Brews — Herbs',
  'menus3Counter.cookMealsHow': 'Cook farmed herbs into meals and brews to carry. One meal and one brew can run at once.',
  'menus3Counter.cookBuffsHead': 'Buff Recipes — Herbs',
  'menus3Counter.cookBuffsHow': 'Combine farmed herbs into combat buff meals. No timing needed — just ingredients.',
  'menus3Counter.cookTier': 'T{t}',
  'menus3Counter.cookCarry': 'you carry {n}',
  'menus3Counter.cookMin': '{n}min',
  'menus3Counter.cookHeals': 'Heals {n} HP',
  'menus3Counter.cookAll': '+{pct}% all stats',
  'menus3Counter.cookBuff': '+{pct}% {buff}',
  'menus3Counter.cookLock': 'Unlocks at Cooking Lv{lvl}',
  'menus3Counter.cook': 'Cook',
  'menus3Counter.cookFail': 'Could not cook it',
});
