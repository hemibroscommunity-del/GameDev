/* v2.3.6550: the words of the button under the thing (card CT part 17; game/contextButton.js,
   ui/panels/ContextButton.jsx; docs/specs/player-words.md) */
export const SAY = Object.freeze({
  'contextButton.chop': 'CHOP',
  'contextButton.mine': 'MINE',
  'contextButton.fish': 'FISH',
  'contextButton.cook': 'COOK',
  'contextButton.talk': 'TALK',
  'contextButton.pump': 'PUMP',
  'contextButton.reel': 'REEL',
  'contextButton.flip': 'FLIP',
  'contextButton.wait': 'WAIT',
  'contextButton.go': 'GO',
  'contextButton.label': 'Do this here',
  /* v2.3.6552: TALK draws the owner's pill and no word (card CT part 19):
     its name for a screen reader, never drawn */
  'contextButton.talkLabel': 'Talk',
  /* v2.3.6553 (part 22): the button's two dresses, read by ContextButton.jsx's
     PLATE_CLASS / PIC_CLASS (the words guard counts a page's string in place) */
  'contextButton.plateClass': 'bt-chisel bt-chisel--brass bt-ctx-btn bt-desktop-hide',
  'contextButton.picClass': 'bt-ctx-btn bt-ctx-btn--pic bt-desktop-hide',
});
