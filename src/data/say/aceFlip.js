/* v2.3.6352: Ace's coin flip's words (src/ui/panels/AceFlipPanel.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* the verdict, and what moved */
  'aceFlip.youWon': 'YOU WON!',
  'aceFlip.youLost': 'YOU LOST!',
  'aceFlip.goldWon': '+{amount} gold',
  'aceFlip.goldLost': '−{amount} gold',
  'aceFlip.itemsWon': '+{count} items',
  'aceFlip.itemsLost': '−{count} items',
  /* Ace's notes */
  'aceFlip.noteRefused': 'Ace shakes his head. "You don\'t have enough gold for that bet, friend. Try a smaller stake."',
  'aceFlip.noteClosed': 'Ace puts his coin away. "No coin flips right now, friend. Come back later."',
  'aceFlip.noteGoldOnly': 'Ace shakes his head. "Gold only today, friend. Keep your items in your Bag."',
  /* the header and the tabs */
  'aceFlip.name': 'Ace',
  'aceFlip.role': 'Gambler',
  'aceFlip.close': 'Close',
  'aceFlip.tabGold': 'Gold',
  'aceFlip.tabItems': 'Items',
  'aceFlip.tabRecords': 'Records',
  /* the record book */
  'aceFlip.recordsIntro': 'My record book: the biggest win and the biggest loss on my coin, one line for each player.',
  'aceFlip.biggestWins': 'Biggest wins',
  'aceFlip.biggestLosses': 'Biggest losses',
  'aceFlip.bookEmpty': 'Nothing in the book yet. Be the first name in it. I\'m not saying which column.',
  'aceFlip.noName': 'Bro',
  /* the item wager */
  'aceFlip.itemsIntro': 'Bet items from your Bag. If you win, you get double. If you lose, I keep them. I win {acePct}% of flips, and you win {youPct}%.',
  'aceFlip.have': 'have {held}',
  'aceFlip.all': 'All',
  'aceFlip.bagEmpty': 'Your Bag is empty. Go find some loot first, then come back.',
  'aceFlip.staked': { one: 'Staked: {count} item', other: 'Staked: {count} items' },
  'aceFlip.clear': 'Clear',
  'aceFlip.flipping': 'Flipping…',
  'aceFlip.itemsGo': 'Double or nothing · {total}',
  'aceFlip.stakeSomething': 'Stake something',
  /* the gold wager */
  'aceFlip.goldIntro': 'I\'m Ace, and I flip coins for gold. Pick your stake. If you win, I pay you {mult} times your stake. If you lose, you pay me {mult} times your stake. I win {acePct}% of flips, and you win {youPct}%.',
  'aceFlip.yourStake': 'Your stake',
  'aceFlip.bag': 'Bag {gold}',
  'aceFlip.max': 'Max {stake}',
  'aceFlip.winOdds': 'Win ({pct}%)',
  'aceFlip.loseOdds': 'Lose ({pct}%)',
  'aceFlip.needGold': 'You need {gold} in the bag to cover his smallest bet.',
  'aceFlip.pickStake': 'Pick a stake',
  'aceFlip.flipFor': 'Flip for {risk}g',
});
