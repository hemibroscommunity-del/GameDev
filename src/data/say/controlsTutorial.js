/* v2.3.6353: the controls tour's words (src/ui/mobile/ControlsTutorial.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* the steps: each a label and its words */
  'controlsTutorial.moveLabel': 'Move',
  'controlsTutorial.moveBody': 'Drag the left joystick to move.',
  /* v2.3.6644: the usual controls on a touch screen sprint from the stick's edge too, the Sprint button gone (card PAD part 9; not with `?rimsprint=0`, nor on a computer) */
  'controlsTutorial.moveBodyEdge': 'Drag the left joystick to move. Push it past its edge to sprint.',
  'controlsTutorial.attackLabel': 'Attack',
  'controlsTutorial.attackBody': 'The button lights up when something is in reach. Tap it to swing, hold it to keep fighting, and flick across it for your special.',
  'controlsTutorial.targetLabel': 'Your target',
  'controlsTutorial.targetBody': 'You always aim at the closest enemy. Tap a different one to lock onto it instead, and tap it again to let go.',
  'controlsTutorial.targetBodyNoLock': 'You always aim at the closest enemy: hold the right stick toward it and keep fighting.',
  'controlsTutorial.targetLabelManual': 'Aiming and specials',
  'controlsTutorial.shieldLabel': 'Shield',
  'controlsTutorial.shieldBody': 'Tap to raise your shield. It stays up until you attack, tap again, or run out of stamina.',
  'controlsTutorial.bagLabel': 'Bag',
  'controlsTutorial.bagBody': 'Your items and gear live here. Tap one to equip it.',
  'controlsTutorial.toolbarLabel': 'Toolbar',
  'controlsTutorial.toolbarBody': 'Menus live down here. Tap your character to chat.',
  'controlsTutorial.dodgeLabel': 'Swipe / Dodge',
  'controlsTutorial.dodgeBody': 'Swipe anywhere in the world to dodge-roll.',
  /* v2.3.6544: the two buttons (`?manual=5`, card CT PR 5: a trial, a touch screen only) */
  'controlsTutorial.moveBodyTwo': 'Push the left stick a little to turn and face that way. Push it further to walk.',
  /* v2.3.6545: ...and past its edge, a sprint (card CT item 6; not with `?rimsprint=0`, where the sprint button is back) */
  'controlsTutorial.moveBodyRim': 'Push the left stick a little to turn and face that way. Push it further to walk. Push the stick past its edge to sprint.',
  'controlsTutorial.attackBodyTwo': 'Face a monster in reach and a line points to it. Tap Attack once: you lock on and keep fighting. Tap again to stop. With nothing in sight, a tap is one swing.',
  /* v2.3.6548: tap and hold (card CT part 15; not with `?holdauto=0`, where attackBodyTwo and targetBodyTwo are the rule) */
  'controlsTutorial.attackBodyHold': 'Face a monster in reach and tap Attack: you lock on, and each tap is one attack. Hold Attack until the ring round it fills to keep fighting on your own. Tap again to stop. With nothing in sight, a tap is one swing.',
  'controlsTutorial.targetBodyHold': 'The line finds the monster you face once it is in reach (a bow or a staff reaches further than a sword). While one is in sight, Block and your specials come up around Attack. When your target falls the fight stops: tap or hold again for the next.',
  'controlsTutorial.targetLabelTwo': 'Your sight line',
  'controlsTutorial.targetBodyTwo': 'The line finds the monster you face once it is in reach (a bow or a staff reaches further than a sword). While one is in sight, Block and your specials come up around Attack. When your target falls, the next one in sight is yours.',
  'controlsTutorial.shieldBodyTwo': 'It comes up beside Attack while a monster is in sight. Tap to raise your shield. It stays up until you attack, tap again, or run out of stamina.',
  /* the card */
  'controlsTutorial.close': 'Close tutorial',
  'controlsTutorial.stepOf': 'Step {step} of {total}',
  'controlsTutorial.back': 'Back',
  'controlsTutorial.next': 'Next',
  'controlsTutorial.done': 'Done',
});
