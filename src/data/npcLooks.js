/* ═══ v2.3.3809: EVERY TOWNSPERSON'S LOOK, FOR THE GAME AND THE BAKE ═══
 *
 * Moved here from tools/qa/npc-looks.mjs (v2.3.3580), which photographed each
 * townsperson in it, so the GAME can read it too: with the look palette on
 * (rendering/lookPalette.js), a townsperson is drawn live from his look, as
 * another player is, instead of from his photographs (entityRenderer
 * _updateNPCs, `?lookfolk=0` / the Test panel's "Townsfolk drawn live" off).
 * One table: npc-looks.mjs (the photographs, the switch's way back) and
 * tools/qa/nft_portraits.py (the dialogue portraits, which reads this text)
 * both read it.
 *
 * No imports: node reads it. */

/* The looks.  Ids are the creator's catalogs (src/rendering/traits/*,
   playerSkins.js).  `why` is the joke each look tells, from the satire
   pass's stereotype line.  `still` / `walk` name the files NPC_DATA already
   points at (a standing townsperson's one picture, a walker's strip base). */
export const NPC_LOOKS = {
  mayor: {
    name: 'Mayor Bro', why: 'small-town politician: top hat, monocle, the grey beard he always had',
    skin: 'fair', hair: 'slick-back-hair', hairColor: 'gray', beard: 'beard', beardColor: 'gray',
    hat: 'top-hat', hatColor: 'black', eyewear: 'golden-monocle', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'navy', pants: 'black', shoes: 'black',
    patterns: { shirt: 'stripe-v:2' },
    still: 'mayor-bro',
  },
  blacksmith: {
    name: 'Blacksmith Bro', why: 'gym bro: shirtless, sweatband, flat-top, grey sweatpants',
    skin: 'tan', hair: 'flat-top', hairColor: 'black', beard: 'beard', beardColor: 'black',
    hat: 'bandana-2', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'none', shirtColor: 'default', pants: 'gray', shoes: 'white',
    patterns: { pants: 'stripe-v:2' },
    still: 'blacksmith-bro',
  },
  diego: {
    name: 'Diego', why: 'hustle guy: slicked hair, gold glasses, loud purple tee, white kicks',
    skin: 'brown', hair: 'slick-back-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'golden-glasses', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'purple', pants: 'white', shoes: 'white',
    patterns: { shirt: 'diag:5' },
    walk: 'shopkeeper-bro-walk-',
  },
  farmer: {
    name: 'Farmer Bro', why: 'paranoid dirt hippie: bucket hat, scraggly beard, wide eyes, earth tones',
    skin: 'sand', hair: 'dirty-blonde', hairColor: 'default', beard: 'beard', beardColor: 'brown',
    hat: 'bucket-hat', hatColor: 'green', eyewear: 'none', eyes: 'wtf',
    shirt: 'tshirt', shirtColor: 'yellow', pants: 'brown', shoes: 'brown',
    patterns: { shirt: 'chevron:11' },
    still: 'farmer-bro',
  },
  woodworker: {
    /* v2.3.3587: the game's own Afro, grey (was 'wavy', which the owner calls
       the shaggy hair): the Hemi Bros collection's Afro is his portrait's, and
       the owner chose "Game matches collection". */
    name: 'Woodworker Bro', why: 'overthinking genius: workshop goggles, a wild grey afro, graph-paper tee',
    skin: 'pale', hair: 'afro', hairColor: 'gray', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'goggles', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'white', pants: 'navy', shoes: 'brown',
    patterns: { shirt: 'grid:9' },
    still: 'woodworker-bro',
  },
  beastmaster: {
    name: 'Beastmaster Bro', why: 'survival-show host: brown hat, beard, camo, sleepless eyes',
    skin: 'olive', hair: 'none', hairColor: 'default', beard: 'beard', beardColor: 'brown',
    hat: 'cowboy-hat', hatColor: 'default', eyewear: 'none', eyes: 'sleepy',
    shirt: 'tshirt', shirtColor: 'green', pants: 'brown', shoes: 'black',
    patterns: { shirt: 'camo:12' },
    still: 'beastmaster-bro',
  },
  lilbro: {
    name: 'Lil Bro', why: 'iPad kid: gamer headphones, bright tee, red sneakers (a child: NPC_DATA figureSize 0.8)',
    skin: 'honey', hair: 'blonde-hair', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'headphones', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'orange', pants: 'blue', shoes: 'red',
    patterns: { shirt: 'stripe-h:2' },
    walk: 'lil-bro-walk-',
  },
  ace: {
    name: 'Ace', why: 'back-alley bookie: derby, slicked hair, green felt-table tee, black',
    skin: 'rosy', hair: 'slick-back-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'fedora', hatColor: 'black', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'green', pants: 'black', shoes: 'black',
    patterns: { shirt: 'diamond:5' },
    walk: 'cardsharp-bro-walk-',
  },
};

/* v2.3.3809: a look's fields under the names the renderer reads off another
   player (peerCosmetics.js's long names), so a townsperson is dressed by the
   same calls as a peer.  'none' and 'default' kept as the creator writes them:
   the renderer reads both as "not worn" / "as drawn", as it does a peer's. */
export function npcLookAsPeer(L) {
  if (!L) return null;
  const p = L.patterns || {};
  return {
    skin: L.skin, pants: L.pants, shoes: L.shoes,
    hair: L.hair, hairColor: L.hairColor,
    headwear: L.hat, hatColor: L.hatColor,
    facialhair: L.beard, facialHairColor: L.beardColor,
    eyewear: L.eyewear, eyewearColor: 'default',
    eyeStyle: L.eyes, eyeColor: 'default',
    shirt: L.shirt, shirtColor: L.shirtColor,
    shirtPattern: p.shirt || null, pantsPattern: p.pants || null, shoesPattern: p.shoes || null,
    species: null, cape: false,
    equip: { shirt: L.shirt === 'none' ? 'none' : 'tshirt', chest: 'none', legs: 'none', shoulders: 'none' },
  };
}

/** The look of the townsperson with this NPC_DATA name, or null. */
export function npcLookByName(name) {
  for (const k in NPC_LOOKS) if (NPC_LOOKS[k].name === name) return NPC_LOOKS[k];
  return null;
}
