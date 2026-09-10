/* ═══ v2.3.2444: READY-MADE DESIGNS ═══
 *
 * Owner: "Can you make some pre-done tattoo designs to choose from?", and,
 * when the three design SLOTS were mistaken for this: "Like I'm looking for a
 * catalog of pre done designs to choose from not 4 loadout slots".
 *
 * That distinction is the whole point of this file and is worth stating.  The
 * slots (playerArt's getSlots/setSlot, UI removed at v2.3.2416) stash the
 * PLAYER'S OWN drawing.  This is the opposite direction: art that ships WITH
 * the game, that nobody has to draw, picked from a gallery.  Neither one
 * replaces the other and neither is a "save".
 *
 * ── WHY THE ROWS ARE SIXTEEN STRINGS AND NOT ONE ──
 * The wire and every renderer want the flat 256-character form (playerArt.js).
 * Source does not: a design is a PICTURE, and a reviewer has to be able to see
 * that it is a skull without running anything.  So the rows are authored one
 * per grid line and joined once at load — the same trade patternCatalog makes
 * for its tiles, for the same reason.
 *
 * ── EVERY DESIGN WAS LOOKED AT, AT THE SIZE IT IS WORN ──
 * A 16x16 design renders about 20 device pixels across in play (that number is
 * why the grid is 16x16 at all — see playerArt.js).  That is ~1.25 pixels per
 * cell, so interior detail does not read SMALL, it does not read AT ALL, and a
 * design can only be judged by rendering it at that size and looking.  Doing
 * that culled a spider (legs are one cell wide, and one cell is invisible), a
 * chain, a web and an axe, and caught two designs whose left half did not
 * reach the centre column — mirroring had quietly made one rose into two.
 *
 * The rule that predicts which designs survive is INTERNAL CONTRAST, not
 * boldness: skin runs from #f9ece2 to #50382a (SKIN_CATALOG), so a design in
 * one dark value disappears on dark skin and one light value disappears on
 * pale skin.  The ones that work everywhere carry a light AND a dark value —
 * which is why so many of these are a bright fill inside a near-black outline.
 *
 * Most of this catalogue was commissioned by the owner against the written
 * spec (docs/DESIGN-CATALOGUE-SPEC.md) and validated here before it landed;
 * the rest was drawn in-house to cover subjects the commission had no answer
 * for.  Provenance is not tracked per entry on purpose — once a design passes
 * the same checks as every other, where it came from stops mattering.
 */

import { ART_W, ART_H, ART_LEN, ART_PALETTE, isValidArt, artHasInk } from './playerArt.js';

/** The filter row in the gallery, in the order it is shown. */
export const DESIGN_CATEGORIES = [
  { id: 'skull',  name: 'Skulls' },
  { id: 'blade',  name: 'Blades' },
  { id: 'beast',  name: 'Beasts' },
  { id: 'fire',   name: 'Fire' },
  { id: 'flora',  name: 'Hearts & Flowers' },
  { id: 'sky',    name: 'Sky' },
  { id: 'symbol', name: 'Symbols' },
  { id: 'tribal', name: 'Tribal' },
];

/* One entry per design.  `rows` is the picture; `art` is derived below. */
const CATALOG = [
  {
    id: 'ribcage', name: 'Ribcage', cat: 'skull',
    rows: [
    '0000000000000000',
    '0000002222000000',
    '0022220220222200',
    '0000002222000000',
    '0222220220222220',
    '0000002222000000',
    '0222220220222220',
    '0000002222000000',
    '0022220220222200',
    '0000002222000000',
    '0002220220222000',
    '0000002222000000',
    '0000002222000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'skull', name: 'Skull', cat: 'skull',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000001111000000',
    '0000112222110000',
    '0000122222210000',
    '0001222222221000',
    '0001111221111000',
    '0001111221111000',
    '0001111221111000',
    '0000122112210000',
    '0000012112100000',
    '00000dddddd00000',
    '0000012112100000',
    '0000011111100000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'skull-crossbones', name: 'Skull & Crossbones', cat: 'skull',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0011100000011100',
    '001d10111101d100',
    '0011112222111100',
    '0000112222110000',
    '0000011221100000',
    '0000012222100000',
    '0000011221100000',
    '0000011221100000',
    '00001d1111d10000',
    '0011110000111100',
    '001d10000001d100',
    '0011100000011100',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'sugar-skull', name: 'Sugar Skull', cat: 'skull',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000001111000000',
    '0000112552110000',
    '0000bb2552bb0000',
    '0001bb2552bb1000',
    '0001111221111000',
    '0001111221111000',
    '0001111221111000',
    '0000aa2112aa0000',
    '0000aa2112aa0000',
    '00000dddddd00000',
    '0000012112100000',
    '0000011111100000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'anchor', name: 'Anchor', cat: 'blade',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000001111000000',
    '0000001001000000',
    '0000001001000000',
    '00001dddddd10000',
    '0000111dd1110000',
    '0000000dd0000000',
    '0000000dd0000000',
    '0001110dd0111000',
    '0001dd0dd0dd1000',
    '00011d1111d11000',
    '000111d11d111000',
    '0000001111000000',
    '0000001111000000',
    '0000000000000000',
    ],
  },
  {
    id: 'crossed-swords', name: 'Crossed Swords', cat: 'blade',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0001000000001000',
    '001d10000001d100',
    '0001d100001d1000',
    '00001d1001d10000',
    '000001d11d100000',
    '0000001dd1000000',
    '0000001dd1000000',
    '000001d11d100000',
    '0015551001555100',
    '0011111001111100',
    '00001c0000c10000',
    '0000110000110000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'crown', name: 'Crown', cat: 'blade',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000001001000000',
    '0000001001000000',
    '0001001111001000',
    '0001115115111000',
    '0001555555551000',
    '0001555555551000',
    '0000155555510000',
    '0000333333330000',
    '0000333333330000',
    '0000111111110000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'gem', name: 'Gem', cat: 'blade',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0011111111111100',
    '01f8888888888f10',
    '01f8888888888f10',
    '01f8888888888f10',
    '001f88888888f100',
    '0001f888888f1000',
    '00001f8888f10000',
    '000001f88f100000',
    '0000001ff1000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'shield', name: 'Shield', cat: 'blade',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000111111110000',
    '0000155335510000',
    '0001555335551000',
    '0001555335551000',
    '0001555335551000',
    '0001555335551000',
    '0001555335551000',
    '0000155335510000',
    '0000015335100000',
    '0000001551000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'sword', name: 'Sword', cat: 'blade',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000110000000',
    '0000000dd0000000',
    '000000dddd000000',
    '000000dddd000000',
    '0000001dd1000000',
    '0000001dd1000000',
    '0000001dd1000000',
    '0000001dd1000000',
    '0000155555510000',
    '0000155555510000',
    '0000111cc1110000',
    '0000001cc1000000',
    '0000001111000000',
    '0000000000000000',
    ],
  },
  {
    id: 'bat', name: 'Bat', cat: 'beast',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000001001000000',
    '0001111111111000',
    '001aaa1111aaa100',
    '001aaa1111aaa100',
    '000aaa1111aaa000',
    '0001a111111a1000',
    '0000101111010000',
    '0000000110000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'paw-print', name: 'Paw Print', cat: 'beast',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000001111000000',
    '0000001111000000',
    '0001111111111000',
    '0001c111111c1000',
    '0001110000111000',
    '0000000110000000',
    '0000011cc1100000',
    '000001cccc100000',
    '00001cccccc10000',
    '000011cccc110000',
    '000001cccc100000',
    '0000011111100000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'scorpion', name: 'Scorpion', cat: 'beast',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0011110000111100',
    '0014441000144100',
    '0014411111144410',
    '0001114444111100',
    '0000014444114100',
    '0000001441111100',
    '0000001441141000',
    '0000000411111000',
    '0000000114410000',
    '0000000011110000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'snake', name: 'Snake', cat: 'beast',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000001110000',
    '0000000016610000',
    '0000000116600000',
    '0000011166100000',
    '0000016666100000',
    '0000016610000000',
    '0000166610000000',
    '0000166110000000',
    '0000016610000000',
    '0000016611100000',
    '0000011166100000',
    '0000000111000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'flame', name: 'Flame', cat: 'fire',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000100000000',
    '0000000110000000',
    '0000010110010000',
    '0000011431110000',
    '0000013443410000',
    '0000134544410000',
    '0001334554431100',
    '0001335555433100',
    '0001345555441000',
    '0001134555431000',
    '0000014544310000',
    '0000001111100000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'lightning-bolt', name: 'Lightning Bolt', cat: 'fire',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000011111000',
    '0000000155510000',
    '0000000155510000',
    '0000001555100000',
    '0000001555100000',
    '0000015555511000',
    '0000015555510000',
    '0000111555100000',
    '0000000151000000',
    '0000000151000000',
    '0000001510000000',
    '0000001100000000',
    '0000001000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'storm-bolt', name: 'Storm Bolt', cat: 'fire',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000011110000000',
    '0000199991110000',
    '0001999999991000',
    '0001999999991000',
    '0001999999991000',
    '0001111111111000',
    '00000001ff100000',
    '00000001ff100000',
    '0000001ffff10000',
    '0000011ff1100000',
    '0000000110000000',
    '0000001100000000',
    '0000001000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'broken-heart', name: 'Broken Heart', cat: 'flora',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000111001110000',
    '0000133113310000',
    '0001333113331000',
    '0001333103331000',
    '0013333113333100',
    '0001333013331000',
    '0001333113331000',
    '0000133103310000',
    '0000013133100000',
    '0000001031000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'four-leaf-clover', name: 'Four-Leaf Clover', cat: 'flora',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000111001110000',
    '0001666116661000',
    '0001666116661000',
    '0001666116661000',
    '0000111111110000',
    '0000111661110000',
    '0001666116661000',
    '0001666116661000',
    '0001666116661000',
    '0000111111110000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'heart', name: 'Heart', cat: 'flora',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000111001110000',
    '0000133113310000',
    '0001333333331000',
    '0001333333331000',
    '0013333333333100',
    '0001333333331000',
    '0001333333331000',
    '0000133333310000',
    '0000013333100000',
    '0000001331000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'rose', name: 'Rose', cat: 'flora',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000011111100000',
    '0000133333310000',
    '0001333333331000',
    '0001311111331000',
    '0001333444431000',
    '0001333333431000',
    '0000133333110000',
    '0000011111100000',
    '0000111160010000',
    '0001166111611000',
    '0000111116110000',
    '0000010111100000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'comet', name: 'Comet', cat: 'sky',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000111000',
    '0000000001555100',
    '0000000015522510',
    '0000000115522510',
    '0000001115522510',
    '0000144441555100',
    '0001144110111000',
    '0001441000000000',
    '0011440000000000',
    '0001400000000000',
    '0001000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'crescent-moon', name: 'Crescent Moon', cat: 'sky',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000100000000',
    '0000011501100000',
    '0000155550000000',
    '0000155550001000',
    '0001555550000000',
    '0001555550000100',
    '0001555550000100',
    '0001555500000100',
    '0001550000001000',
    '0000155000051000',
    '0000115055510000',
    '0000001511100000',
    '0000000100000000',
    '0000000000000000',
    ],
  },
  {
    id: 'star', name: 'Star', cat: 'sky',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000110000000',
    '0000000110000000',
    '0000001551000000',
    '0011115555111100',
    '0001555555551000',
    '0000155555510000',
    '0000015555100000',
    '0000015555100000',
    '0000015115100000',
    '0000111001110000',
    '0000100000010000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'sun', name: 'Sun', cat: 'sky',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000440000000',
    '0004400440044000',
    '0004400000044000',
    '0000001111000000',
    '0000015555100000',
    '0440155555510440',
    '0440155555510440',
    '0000155555510000',
    '0000015555100000',
    '0004401111044000',
    '0004400000044000',
    '0000000440000000',
    '0000000440000000',
    '0000000000000000',
    ],
  },
  {
    id: 'arrow', name: 'Arrow', cat: 'symbol',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000110000000',
    '0000001111000000',
    '0000011551100000',
    '0000111551110000',
    '0001115555111000',
    '0011151551511100',
    '0000011551100000',
    '0000011551100000',
    '0000011551100000',
    '0000011551100000',
    '0000011551100000',
    '0000011111100000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'cross', name: 'Cross', cat: 'symbol',
    rows: [
    '0000000000000000',
    '0000001111000000',
    '0000012222100000',
    '0000012222100000',
    '0000012222100000',
    '1111112222111111',
    '1222222222222221',
    '1222222222222221',
    '1222222222222221',
    '1111112222111111',
    '0000012222100000',
    '0000012222100000',
    '0000012222100000',
    '0000012222100000',
    '0000001111000000',
    '0000000000000000',
    ],
  },
  {
    id: 'diamond', name: 'Diamond', cat: 'symbol',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000011111100000',
    '0000122222210000',
    '0000122222210000',
    '0001222ff2221000',
    '00001f7777f10000',
    '00001f7777f10000',
    '000001f77f100000',
    '0000001771000000',
    '0000001ff1000000',
    '0000000110000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'dice', name: 'Dice', cat: 'symbol',
    rows: [
    '0000000000000000',
    '0011111111111100',
    '0122222222222210',
    '1222222222222221',
    '1221122222211221',
    '1221122222211221',
    '1222222222222221',
    '1222222222222221',
    '1222222222222221',
    '1221122222211221',
    '1221122222211221',
    '1222222222222221',
    '0122222222222210',
    '0011111111111100',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'eye', name: 'Eye', cat: 'symbol',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000011111100000',
    '0000119999110000',
    '0001129999211000',
    '0011229999221100',
    '0001129999211000',
    '0000119999110000',
    '0000011111100000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'music-note', name: 'Music Note', cat: 'symbol',
    rows: [
    '0000000000000000',
    '0000000011111100',
    '0000000011111100',
    '0000000011000100',
    '0000000011000100',
    '0000000011000100',
    '0000000011000100',
    '0000000011000100',
    '0000000011000100',
    '0000111100000100',
    '0001111110001110',
    '0011111111011110',
    '0011111111011110',
    '0001111110001110',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'yin-yang', name: 'Yin Yang', cat: 'symbol',
    rows: [
    '0000000220000000',
    '0000222222210000',
    '0002222222211000',
    '0022222112221100',
    '0222222112221110',
    '0222222112221110',
    '0222222222211110',
    '2222222222111111',
    '2222221111111111',
    '0222211111111110',
    '0222111221111110',
    '0222111221111110',
    '0022111221111100',
    '0002211111111000',
    '0000211111110000',
    '0000000110000000',
    ],
  },
  {
    id: 'barbed-wire', name: 'Barbed Wire', cat: 'tribal',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0100000000000010',
    '0010001111000100',
    '1111111111111111',
    '1111111111111111',
    '0010001111000100',
    '0100000000000010',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'chevron-band', name: 'Chevron Band', cat: 'tribal',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0011000000001100',
    '0151500000051510',
    '0015150000515100',
    '0001515005151000',
    '0000151111510000',
    '0000015115100000',
    '0000001551000000',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'tribal-band', name: 'Tribal Band', cat: 'tribal',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
    '1111111111111111',
    '0110011001100110',
    '0000000000000000',
    '1111111111111111',
    '1111111111111111',
    '1111111111111111',
    '1111111111111111',
    '0000000000000000',
    '0110011001100110',
    '1111111111111111',
    '1111111111111111',
    '0000000000000000',
    '0000000000000000',
    ],
  },
  {
    id: 'tribal-wings', name: 'Tribal Wings', cat: 'tribal',
    rows: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000100000010000',
    '00111a1001a11100',
    '001aaaa11aaaa100',
    '001aaa1001aaa100',
    '000aa110011aa000',
    '000a11000011a000',
    '001a10000001a100',
    '0011100000011100',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    ],
  },];

/* ── the derived flat form, and the gate ──
   Every entry is CHECKED and then joined, with anything malformed left out
   rather than shipped: a design whose rows are the wrong length would put an
   invalid 256-char string on a character and onto the wire, which is the one
   thing playerArt's codec is written to make impossible.

   ── WHY THE SHAPE CHECK COMES BEFORE THE JOIN ──
   v2.3.2445, from a pre-merge review.  This used to `.map()` the join and
   then `.filter()` the result -- the same two steps in the one order that
   cannot work.  `d.rows.join('')` ran on EVERY authored entry before anything
   was validated, so `rows` missing, null, or pasted back as one flat
   256-character string threw a TypeError; and this module is a static import
   all the way up to main.jsx, so that throw is a BLANK SCREEN AT BOOT for
   every player -- the precise opposite of what the paragraph above promises.
   Not an exotic mistake either: the spec asks a commissioner for "16 strings"
   and prints its own worked example as a bare indented block, so handing one
   back as anything but an array of 16 is the likely slip.

   The gate checks the fields AROUND the picture too, because a malformed one
   is silent in ways that bite later: a `cat` outside DESIGN_CATEGORIES leaves
   a design no filter chip can reach (it still shows under All, so nothing
   looks wrong); a duplicate `id` is a duplicate React key, which makes
   reconciliation unreliable across a filter change; a duplicate `name` makes
   the QA scenario -- which picks its tile by visible text -- assert against
   the wrong design. */
/* How many designs were AUTHORED, before the validity gate below.  Exported
   for one reason: the gate drops a malformed entry silently, and a test that
   only ever sees the filtered list cannot tell a drop from a catalogue that
   was always that size -- both sides shrink together and it stays green.
   Comparing the two counts is what makes a drop fail a test instead of
   quietly shipping 36 designs where 37 were written. */
export const DESIGN_COUNT_AUTHORED = CATALOG.length;

const CAT_IDS = DESIGN_CATEGORIES.map((c) => c.id);
const _seenId = new Set();      /* CLAUDE.md rule 4: a Set, never a plain {} */
const _seenName = new Set();

export const DESIGN_CATALOG = CATALOG
  .filter((d) => {
    if (!d || typeof d.id !== 'string' || !d.id) return false;
    if (typeof d.name !== 'string' || !d.name) return false;
    if (CAT_IDS.indexOf(d.cat) < 0) return false;
    if (!Array.isArray(d.rows) || d.rows.length !== ART_H) return false;
    if (!d.rows.every((r) => typeof r === 'string' && r.length === ART_W)) return false;
    const a = d.rows.join('');
    if (!isValidArt(a) || !artHasInk(a)) return false;
    if (_seenId.has(d.id) || _seenName.has(d.name)) return false;
    _seenId.add(d.id); _seenName.add(d.name);
    return true;
  })
  /* Frozen on the way out, for the reason artOps copies its op arrays out:
     these are the module's own data, and a consumer that reversed `rows` for
     a flip preview would corrupt the catalogue for the rest of the session
     and leave `rows` disagreeing with `art`. */
  .map((d) => Object.freeze({
    id: d.id, name: d.name, cat: d.cat,
    rows: Object.freeze(d.rows.slice()), art: d.rows.join(''),
  }));

/** A design by id, or null. */
export function designById(id) {
  for (let i = 0; i < DESIGN_CATALOG.length; i++) {
    if (DESIGN_CATALOG[i].id === id) return DESIGN_CATALOG[i];
  }
  return null;
}

/* ═══ WHY A DESIGN ARRIVES AS ONE OP PER COLOUR ═══
 *
 * artOps replays a drawing as {base, ops}, and every op paints ONE ink across
 * its cells (`artWithCells(a, cells, ops[i].i)`).  A ready-made design is
 * multi-colour, so it cannot be a single op -- which leaves two ways in.
 *
 * The flat way is to make the design the BASE with no ops.  It works, and it
 * throws away the thing the owner asked for one round earlier ("You should be
 * able to select something and recolor it"): a flat base has no pieces, so
 * Select finds nothing and a preset is the one drawing on the grid you cannot
 * adjust.
 *
 * So a design lands as one freehand op PER COLOUR on an empty base.  That is
 * entirely within the existing vocabulary -- no new op kind, no change to
 * replay or to sanitizeOp -- and it means tapping the red of a heart picks up
 * the red and repaints it.  Cost is bounded and small: ops equal the design's
 * distinct colours (two to six here, against MAX_OPS of 120), the cells of a
 * design cannot overlap so their order never changes the picture, and the
 * whole thing is banked as ONE undo entry by the panel, because pushHist
 * snapshots the doc rather than counting ops.
 */
export function designOps(art) {
  if (!isValidArt(art)) return [];
  /* Keyed by a palette index that comes off a design string -- a Map, never a
     plain object (CLAUDE.md rule 4). */
  const byInk = new Map();
  for (let i = 0; i < ART_LEN; i++) {
    const v = parseInt(art[i], 16);
    /* index 0 is transparent and index 15 was a well-formed digit with no
       colour behind it until v2.3.1950 -- artHasInk's rule, applied here so a
       design can never make an op that paints nothing. */
    if (!(v > 0 && v < ART_PALETTE.length)) continue;
    let cells = byInk.get(v);
    if (!cells) byInk.set(v, (cells = []));
    cells.push(i);
  }
  const ops = [];
  byInk.forEach((cells, ink) => { ops.push({ k: 'c', c: cells, i: ink }); });
  return ops;
}
