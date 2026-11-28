/* v2.3.6843: Bro, the three weapons first (card UI4 PR 4, the owner's V17:
   src/ui/mobile/sheet/BroV17.jsx; the rules src/game/broV17.js;
   docs/specs/player-words.md).  The game's own words stay (Sword, Bow, Staff,
   Lv, Shared Attributes, DPS, Max HP: the Combat hub's and the Shared page's
   tables); these are only the new ones: a weapon's state in words (V17:55
   "Distinguish equipped weapon from in-hand weapon"; never colour alone), the
   held weapon's DPS line, and the strip's "more". */
export const SAY = Object.freeze({
  'broV17.inHand': 'In hand',
  'broV17.worn': 'Worn',
  'broV17.notWorn': 'Not worn',
  'broV17.heldDps': '{w} DPS',
  'broV17.weaponAria': '{w}, Lv {n}, {state}{pts}: open the {w} page',
  'broV17.weaponOther': '{w}, Lv {n}: open the {w} page',
  'broV17.ptsAria': ', {pts} to spend',
  'broV17.sharedAria': 'Shared Attributes{pts}: open them',
  'broV17.factAria': '{k} {v}',
  'broV17.more': 'More: page {i} of {n}',
  'broV17.pageN': '{i}/{n}',
});
