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
});
