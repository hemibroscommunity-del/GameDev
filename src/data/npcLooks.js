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
  /* ═══ v2.3.3833: THE NEW CAST (docs/specs/npc-cast-draft.md) ═══
     The owner, of the draft: "Keep all as you have them for now (NPCs)".  A
     keeper at each of the ten buildings that had nobody at the door, and three
     locals.  Each stands still facing the street, so one picture each
     (`still`); P5's live townsfolk (v2.3.3809) can draw them from these same
     rows instead. */
  banker: {
    name: 'Sterling', why: 'crypto bro running a bank: laser-eyes visor, pinstripes',
    skin: 'ivory', hair: 'split-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'laser-glasses', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'navy', pants: 'black', shoes: 'black',
    patterns: { shirt: 'stripe-v:2' },
    still: 'sterling',
  },
  barkeep: {
    name: 'Slim', why: 'craft mixologist: the beard, the checked shirt, the attitude',
    skin: 'deep', hair: 'wavy', hairColor: 'black', beard: 'beard', beardColor: 'black',
    hat: 'none', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'black', pants: 'gray', shoes: 'brown',
    patterns: { shirt: 'check:5' },
    still: 'slim',
  },
  chef: {
    name: 'Chef Blaze', why: 'shouting TV chef: spiky blonde flat-top, white shades, flame tee',
    skin: 'rosy', hair: 'flat-top', hairColor: 'blonde', beard: 'beard', beardColor: 'blonde',
    hat: 'none', hatColor: 'default', eyewear: 'white-glass', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'red', pants: 'black', shoes: 'white',
    patterns: { shirt: 'chevron:11' },
    still: 'chef-blaze',
  },
  gemguru: {
    name: 'Glint', why: 'crystal-healing influencer: long hair, a halo, polka purple',
    skin: 'porcelain', hair: 'long', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'halo', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'purple', pants: 'white', shoes: 'white',
    patterns: { shirt: 'dots:9' },
    still: 'glint',
  },
  postman: {
    name: 'Postmaster Pete', why: 'the slowest clerk alive: postal cap, grey beard, striped blue',
    skin: 'fair', hair: 'none', hairColor: 'default', beard: 'beard', beardColor: 'gray',
    hat: 'red-cap', hatColor: 'blue', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'blue', pants: 'navy', shoes: 'black',
    patterns: { shirt: 'stripe-h:2' },
    still: 'postmaster-pete',
  },
  realtor: {
    name: 'Deed Dave', why: 'swamp-selling realtor: a little hat over a loud teal shirt',
    skin: 'tan', hair: 'none', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'gray-hat', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'teal', pants: 'white', shoes: 'brown',
    patterns: { shirt: 'diamond:5' },
    still: 'deed-dave',
  },
  bellhop: {
    name: 'Benny', why: 'upselling bellhop: the fez, a red windowpane jacket',
    skin: 'brown', hair: 'none', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'fez-hat', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'red', pants: 'black', shoes: 'black',
    patterns: { shirt: 'grid:9' },
    still: 'benny',
  },
  guildmaster: {
    name: 'Guildmaster Gary', why: 'raid leader who takes it too seriously: the headband',
    skin: 'pale', hair: 'blonde-hair', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'naruto-headband', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'black', pants: 'navy', shoes: 'red',
    patterns: { shirt: 'diamond:5' },
    still: 'guildmaster-gary',
  },
  sheriff: {
    name: 'Sheriff Buck', why: 'mall cop with a bought badge: black cowboy hat, aviators',
    skin: 'sand', hair: 'none', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'cowboy-hat-2', hatColor: 'black', eyewear: 'thug-life', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'yellow', pants: 'brown', shoes: 'black',
    patterns: { shirt: 'stripe-v:2' },
    still: 'sheriff-buck',
  },
  auctioneer: {
    name: 'Gavel Greg', why: 'auctioneer who never stops: a crown, a gold-striped tee',
    skin: 'ebony', hair: 'none', hairColor: 'default', beard: 'beard', beardColor: 'black',
    hat: 'crown', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'yellow', pants: 'black', shoes: 'white',
    patterns: { shirt: 'diag:5' },
    still: 'gavel-greg',
  },
  fisher: {
    name: 'Old Man Reel', why: 'fisherman whose fish grow every telling: beanie, white beard, a slicker',
    skin: 'alabaster', hair: 'none', hairColor: 'default', beard: 'beard', beardColor: 'white',
    hat: 'beanie', hatColor: 'gray', eyewear: 'none', eyes: 'sleepy',
    shirt: 'tshirt', shirtColor: 'yellow', pants: 'navy', shoes: 'black',
    patterns: {  },
    still: 'old-man-reel',
  },
  streamer: {
    name: 'Bean', why: 'kid streamer with no viewers: cat ears, pink everything (a child: NPC_DATA figureSize 0.8)',
    skin: 'honey', hair: 'split-hair', hairColor: 'pink', beard: 'none', beardColor: 'default',
    hat: 'cat-ears', hatColor: 'pink', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'pink', pants: 'gray', shoes: 'white',
    patterns: { shirt: 'dots:9' },
    still: 'bean',
  },
  tourist: {
    name: 'Tourist Terry', why: 'lost tourist: a souvenir sombrero, a monocle, orange shorts',
    skin: 'porcelain', hair: 'none', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'sombrero', hatColor: 'default', eyewear: 'golden-monocle', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'white', pants: 'orange', shoes: 'white',
    patterns: { shirt: 'dots:5' },
    still: 'tourist-terry',
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
