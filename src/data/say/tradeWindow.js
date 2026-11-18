/* v2.3.6323: the trade window's words (src/ui/panels/TradeWindowPanel.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* the drawer's ✕ */
  'tradeWindow.close': 'Close',

  /* a staged row's steppers (read aloud, the item's name in the hole) */
  'tradeWindow.oneFewer': 'One fewer {name}',
  'tradeWindow.oneMore': 'One more {name}',
  'tradeWindow.remove': 'Remove {name}',

  /* an offer well's rows */
  'tradeWindow.petGone': 'A pet no longer offered',
  'tradeWindow.petLevel': 'Lv {lv}',
  'tradeWindow.petGoldenTail': ' · Golden',
  'tradeWindow.goldRow': 'Gold',
  'tradeWindow.weaponFallback': 'Weapon',

  /* the receipt */
  'tradeWindow.receiptThey': 'They',
  'tradeWindow.receiptGaveYou': '{name} gave you',
  'tradeWindow.receiptTitle': 'Trade complete ✓',
  'tradeWindow.received': 'You received',
  'tradeWindow.nothing': 'Nothing',
  'tradeWindow.goldSuffix': 'G',
  'tradeWindow.you': 'You',
  'tradeWindow.sent': 'You sent',
  'tradeWindow.balance': 'Balance',

  /* a failed trade */
  'tradeWindow.title': 'Trade',
  'tradeWindow.failed': 'Trade failed — nothing was exchanged',
  'tradeWindow.failedPetGone': 'A pet in it could no longer be traded.',
  'tradeWindow.failedPetsFull': 'There was no room in a collection for the pets.',

  /* the request: theirs to you, then yours waiting */
  'tradeWindow.inviteTitle': '{name} wants to trade',
  'tradeWindow.open': 'Open trade',
  'tradeWindow.decline': 'Decline',
  'tradeWindow.requestSent': 'Trade request sent — waiting…',
  'tradeWindow.cancel': 'Cancel',

  /* the review (anti-scam) screen */
  'tradeWindow.reviewItem': '{name} x{qty}',
  'tradeWindow.reviewPetNamed': '{name} ({kind}, Lv {lv}{golden})',
  'tradeWindow.reviewPet': '{kind}, Lv {lv}{golden}',
  'tradeWindow.reviewPetGolden': ', Golden',
  'tradeWindow.reviewGold': '{n} gold',
  'tradeWindow.reviewCount': { one: '{n} item', other: '{n} items' },
  'tradeWindow.reviewTitle': 'Confirm with {name}',
  'tradeWindow.youGive': 'YOU GIVE',
  'tradeWindow.youReceive': 'YOU RECEIVE',
  'tradeWindow.bigGold': 'That is a large amount of gold. Check the numbers, then tap Accept twice.',
  'tradeWindow.theyAccepted': '{name} has accepted — waiting on you.',
  'tradeWindow.leaveAsk': 'Leave this trade?',
  'tradeWindow.keepTrading': 'Keep Trading',
  'tradeWindow.leave': 'Leave Trade',
  'tradeWindow.accepted': 'Accepted ✓ — waiting',
  'tradeWindow.wait': 'Wait {s}s…',
  'tradeWindow.acceptLarge': 'Accept (large trade)',
  'tradeWindow.accept': 'Accept',
  'tradeWindow.back': 'Back',
  'tradeWindow.fight': 'Not while one of you is fighting a player. Try again in a few seconds.',
  'tradeWindow.paused': 'Saving is paused for a moment, try again.',

  /* the live window: your lane */
  'tradeWindow.tradingWith': 'Trading with {name}',
  'tradeWindow.youOffer': 'You offer',
  'tradeWindow.confirmed': 'Confirmed ✓',
  'tradeWindow.bagEmpty': 'Your bag is empty',
  'tradeWindow.nothingStaged': 'Nothing staged yet',
  'tradeWindow.yourWeapons': 'Your weapons',
  'tradeWindow.atMax': '· max {n}',
  'tradeWindow.yourPets': 'Your pets',
  'tradeWindow.petChip': '{name} · Lv {lv}',

  /* the live window: your gold */
  'tradeWindow.goldHeader': 'Gold',
  'tradeWindow.ofCoins': 'of {n}',
  'tradeWindow.presetsSubtract': 'Presets subtract gold. Tap to make them add again.',
  'tradeWindow.presetsAdd': 'Presets add gold. Tap to make them subtract.',
  'tradeWindow.offerNoGold': 'Offer no gold',
  'tradeWindow.clear': 'Clear',
  'tradeWindow.takeBack': 'Take back {n} gold from your offer',
  'tradeWindow.offerMore': 'Offer {n} more gold',

  /* the live window: their lane */
  'tradeWindow.theyOffer': '{name} offers',
  'tradeWindow.theyConfirmed': 'confirmed ✓',
  'tradeWindow.theyReady': 'ready ✓',

  /* the live window: notices and buttons */
  'tradeWindow.offerChanged': 'Offer changed — review and confirm again',
  'tradeWindow.addSomething': 'Add an item or gold',
  'tradeWindow.readyWaiting': 'Ready ✓ — waiting',
  'tradeWindow.ready': 'Ready to trade',
  'tradeWindow.confirmTrade': 'Confirm trade',
  'tradeWindow.waitingFor': 'Waiting for {name}…',
});
