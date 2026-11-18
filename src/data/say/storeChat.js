/* v2.3.6348: the Auction House's chat with a seller (src/ui/panels/buildings/StoreChatPanel.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* the buyer's three canned lines, and the seller's one (sent as typed text) */
  'storeChat.quickAvailable': 'Still available?',
  'storeChat.quickLess': 'Would you take less?',
  'storeChat.quickQuestion': 'I have a question',
  'storeChat.quickOffer': 'What\'s your offer?',
  /* the seller's three answers to an offer */
  'storeChat.accept': 'Accept {gold}g',
  'storeChat.think': 'I\'ll think about it',
  'storeChat.no': 'No',
  /* how long the listing has left */
  'storeChat.expired': 'expired',
  'storeChat.inMins': 'in {mins}m',
  'storeChat.inHours': 'in {hours}h',
  'storeChat.inDays': 'in {days}d',
  /* the header */
  'storeChat.yourListing': 'Your listing',
  'storeChat.chatWith': 'Chat with {name}',
  'storeChat.theSeller': 'the seller',
  'storeChat.subtitle': 'Discuss this item directly',
  /* the item's card */
  'storeChat.item': 'Item',
  'storeChat.expires': '\u{1F551} Listing expires {when}',
  'storeChat.price': '{price}g',
  /* the bubbles */
  'storeChat.opening': 'Opening…',
  'storeChat.emptySeller': 'Nobody has asked about this listing yet.',
  'storeChat.emptyBuyer': 'Say hello — the seller sees this next time they are online.',
  'storeChat.you': 'You',
  /* the buyer's offer */
  'storeChat.offerHeld': 'Your offer of {gold} is being held{thinking}',
  'storeChat.offerGold': '{gold}g',
  'storeChat.offerThinking': ' — the seller is thinking about it',
  'storeChat.takeBack': 'Take it back',
  'storeChat.offerLabel': 'Offer gold',
  'storeChat.offer': 'Offer',
  'storeChat.offerHow': 'Your gold is held while the seller decides, and comes straight back if they say no, if you take it back, or if nobody answers in two days.',
  /* the seller's offers */
  'storeChat.offersHead': 'Offers on this listing',
  'storeChat.offerRow': '{name} offers {gold}',
  /* the composer */
  'storeChat.typeHere': 'Type a message...',
  'storeChat.send': 'Send',
});
