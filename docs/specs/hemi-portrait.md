# Your portrait is a Hemi Bro (v2.3.3999)

> *"For profile picture art I want it in the style of the original hemi bro
> NFT's as much as possible with the custom stuff added on to it. Is that
> feasible?"* -- the owner, 2026-11-03

Hemi Bros, the NFT collection the game is named for, is 3,333 busts of
32 x 32 pixels turned to the viewer's left on a flat background. The
townsfolk's dialogue heads have been such busts since v2.3.3580, stacked from
the collection's own trait layers by `tools/qa/nft_portraits.py`
(docs/specs/npc-creator-looks.md, "The dialogue portraits are Hemi Bros").
Now the player's portrait is one too: the Character button's icon, the
identity strip, the level-up medallion, and every other player's portrait
(the inspect card, the trade window, the character list, Ace's table, the
friends list) -- everything `portraitDataUrl(opts, true)` serves.

## How it is made

```
your look -> hemiLook.js hemiRecipe -> hemiBustCore.js composeBust -> 32 x 32
          -> 6 x 6 blocks, nearest neighbour -> a 192 x 192 PNG data URL
```

- `src/rendering/hemiBustCore.js`: the Python bake PORTED, rule for rule, and
  nothing new: the skin recoloured from the orange bro by brightness; a
  recoloured trait keeps the collection's outline colour and puts every other
  colour on a ramp in its own order of brightness; an eyewear's glass a
  see-through tint over what is under it; the plain tee in the shirt colour,
  its outline and light kept, the pattern's ink where the game's own tile
  inks it; the jaw beard grown long. Pure (pixel arrays in, a pixel array
  out), so node runs it. Numpy's rounding (half to even) and its truncation
  into bytes are copied, so the busts come out to the pixel.
- `src/rendering/hemiLook.js`: the one table from the game's catalogs to the
  collection's traits (below), and the recipe.
- `src/rendering/hemiBust.js`: the page's half. It loads the atlas, makes the
  picture on a 192 px canvas it lets go at once, keeps the last 24 pictures
  (a cache has a cap), and answers `''` when it cannot (off, the monkey, a
  failure): `portraitDataUrl` then draws the game's own headshot, as before.
- The layers ship as ONE picture, `public/portrait/hemi-bros-atlas.png`:
  59 layers of 32 x 32, 8 a row, a palette PNG on 256 colours (6 KB),
  loaded behind the loading screen (`preloadAnimations.js`, `hemiBust`) and
  read as its colour numbers (`png8Decode.js`), never drawn. The page holds
  the 59 layers, 236 KB.
- Every picture ends `#hemi` (a data URL's fragment is not part of its
  picture), and one rule, written once by hemiBust.js, shows each crisp
  wherever it is put: `img[src$="#hemi"] { image-rendering: pixelated }`.
  Smoothed, a 32 px bust shrunk into a 40 px chip blurs every pixel edge.

## The background

One of the collection's seven (`backgrounds.json`), picked from the look:
the one furthest from your shirt colour (the skin on a bare chest), by RGB
distance weighted 2, 4, 3; a tie goes to the first by name. The same look
always gets the same background.

## The mapping

| The game's | The collection's | Rule |
| --- | --- | --- |
| skin tone | the bro, recoloured by brightness | the default keeps his orange |
| hair: Afro, Blonde Hair, Dirty Blonde, Flat Top, Slick Back Hair, Split Hair | afro, blondehair, lightbrownhair (the sheet's "Blond Hair"), flattophairstyle, slickbackhair, splithair | your hair colour ramps it; the default keeps the collection's |
| hair: Wavy, Long | lightbrownhair, splithair (nearest) | in the game's default brown unless you chose one |
| any hat | the collection's hat (below) | bald under it, the ear below the brim; your hat colour ramps it |
| a band or a perch: Bandana, Red Bandana, Blue Bandana, Naruto Headband, Headphones, Halo, Cat Ears, Mickey Ears, Devil Horns, Crown, Evil Crown, Axe On Head, New Idea | purplebandana, redbandana, headband, naruto, headphones, halo, catears, mickeyears, devilhorns, crown, evilcrown, axehead, halo | worn on the hair |
| beard | the collection's beard grown long, as the world's | your beard colour ramps it |
| eyes: Normal, Sleepy, WTF | normaleyes, sleepyeyes, wtfeyes | the collection's pupils are its outline colour: the eye colour has no pixel to paint at 32 px |
| eyewear | the collection's (below) | your eyewear colour ramps it (glass stays glass) |
| T-shirt | the collection's plain tee | your colour, your pattern at one bust pixel a tile cell; the default is the game's blue; a drawn print is left out |
| no shirt | the bro's own chest | |
| species: Alien | the bro on the alien's cyan skin | |
| species: Monkey | none | keeps the game's own portrait |
| worn armour, capes, weapons | left out | |

The hats: Old School Helmet oldschoolhelmet, Top Hat tophat, Purple Hat
bluecap (the lavender cap), Beanie redbeanie, Red Cap backwardshat (its brim
to the right, as the game's), Shark Hat sharkhat, Sombrero mexicanhat,
Bucket Hat buckethat (its logo painted out, as on the Farmer's bust: the
game's has none), Derby derbyhat, Wizard Hat wizardhat, Barbarian Helmet
vikinghelm, Army Helmet armhelm, Golden Bucket goldenbucket, Arabian Robe
arabianrobe, Dark Bucket Hat brownhat, Asian Hat buckethat (logo and all,
as the game's), Fez Hat fez, Russian Hat russianhat, Brown Cowboy Hat
cowboyhat, Folded Brim foldedbrim, Gray Hat oldbuckethat (the grey flat cap),
Safety Helmet hardhat, Sheriff Hat sheriffhat, Chinese Hat chinesehat,
Spartan Helmet spartanhelm, Kermit Hat kermithat.

The eyewear: Goggles goggles, Laser Glasses laserglass, Thug Life
thuglifeglasses, Golden Monocle goldenmonocle, Golden Glasses goldenglasses,
Eye Patch eyepatch.

## Looks with no match yet

Each wears the nearest trait today. The brief for each is a 32 x 32 trait in
the collection's style (its outline colour, lit from the front-left, on the
bust's grid), placed as the others are:

- `hair:wavy` (lightbrownhair): wavy hair to the collar, parted, in loose
  S-shaped locks; three shades and the outline.
- `hair:long` (splithair): hair past the shoulders, falling behind the ear
  and down the nape over the collar; three shades and the outline.
- `headwear:new-idea` (halo): the light bulb floating above the head, a
  yellow glass bulb with a grey screw base, two white glints.
- `eyewear:3d-glasses` (laserglass): white card frames, a red lens on the
  viewer's left eye, a blue one on the right, both see-through tints.
- `eyewear:white-glass` (nerdglasses): the nerd glasses' shape in white
  frames, clear see-through lenses.
- `eyeStyle:one-eye` (normaleyes): one large eye in the middle of the face,
  white with a round black pupil.
- `eyeStyle:demon` (wtfeyes): both eyes lit orange, a flame licking up from
  each.
- `eyeStyle:alien` (suseyes): the collection's Alien Bro's eyes (the game
  has used them since v2.3.3590, but the extract placed no Alien Bro layer).
- `species:alien` (bro): the Alien Bro himself, if the catalogue has his
  layer: the extract read only the two skins of the plain bro.
- `species:monkey` (none): a monkey bust on the bro's grid, ears and muzzle,
  its fur taking the player's skin.

## How to add a trait

1. Its 32 x 32 picture goes in `assets/portrait-source/hemi-bros/<name>.png`,
   on the busts' grid (`python3 tools/qa/nft_portraits.py extract
   <catalogue>` makes the collection's; a new one is drawn in its style).
2. Name it in `hemiLook.js` for the catalog item it is (`HEMI_HAIR`,
   `HEMI_HEADWEAR`, ...; `onHair: true` for a band or a perch; `near: true`
   while it is the nearest, with a line above).
3. `node tools/portrait/make-hemi-atlas.mjs` re-makes the atlas, its index
   (`src/rendering/hemiAtlasIndex.js`, generated) and the townsfolk's
   fixture. A new catalog item with no row fails `hemi-portrait` 3.

## Off

- `?hemiface=0` brings back the game's own headshot for one tab
  (`?hemiface=1` forces it on).
- The Test panel's "Memory savers" row "Your portrait as a Hemi Bro" turns it
  off for every phone from its next load (`off_hemiface`, clientOff.js).

## Tests

- `server/test/hemi-portrait.test.mjs`: the compositor rebuilds all 21
  townsfolk's baked busts from the source layers pixel for pixel; from the
  shipped atlas, within the Python tool's own tolerance (none of them has a
  pixel off by more than 50; the mean difference is under 1 level); every
  item of every look catalog, every colour and every pattern builds a bust;
  the collection's rules; the background; the 6 x 6 blocks; the switch; the
  atlas is the tool's.
- `tools/qa/ui-review/states.mjs`: `character-hemi`, `character-hemi-hat`,
  `character-hemi-off` (the Character page with the portrait).
