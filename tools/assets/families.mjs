/* v2.3.5241: THE FAMILY TABLE (grand plan step 9.1, card P; docs/specs/asset-door.md).
 *
 * DATA: no I/O, no imports.  tools/assets/shipped.mjs reads it, matches every
 * file in reach to one row, and writes tools/assets/shipped.json.
 *
 * A FAMILY IS A PATH PATTERN, NEVER A FOLDER.  One folder holds all three
 * kinds side by side: public/sprites/player/ has the bro's sheets (supplied),
 * their .webp twins (made, by the bot) and anchors.json (data).  Each file in
 * reach matches exactly one row; a file no row matches is `unsorted` (a
 * census: its count only falls).  A pattern is a glob over the path from the
 * repository's root: `**` any run of folders, `*` within one name, `?` one
 * character, `{a,b}` either.  Where a wider row would also match a narrower
 * row's files (the `.p256.png` twins beside the `.png` files they are made
 * from), the wider row names them in its `not`.
 *
 * THE ASSET_KINDS:
 *   supplied  came from outside the repository: a ChatGPT sheet, an upload, a
 *             recording, the owner's own art.  THE DOOR FINISHES ONLY THESE
 *             (tools/assets/finish.mjs, PR 3).
 *   made      written by a tool in the repository from named sources.  It
 *             changes when its source or its tool changes, re-made by that
 *             tool: the door never rewrites it.  In doubt, a family is made
 *             with its tool 'unknown', never supplied.
 *   data      bytes the game reads as numbers, not colours: the look sheets
 *             (colour NUMBERS in red and green, lookUnpack.js: put on 256
 *             colours, every body would be scrambled), anchors, maps, the
 *             Wheel's bakes, the portrait atlas.  The door never rewrites it.
 *
 * A ROW:
 *   name     the family's one name (shipped.json's `family`)
 *   pattern  a glob, or a list of globs
 *   not      globs the pattern would match that belong to another row
 *   kind     supplied | made | data
 *   tool     made (and data a tool writes): the tool's path, or 'unknown';
 *            supplied: null
 *   sources  made: what the tool reads (paths or globs; under assets/, by
 *            path, as tools/assets/sources.json names them by hash), or
 *            'beside' (the file of the same name beside it); else null
 *   draw     the draw path today, every switch at its default (ASSET_DRAWS below)
 *   loader   the module that loads it (null for `none`)
 *   bundle   the bundle of colours: the group that shares one row of the
 *            palette atlas (picsNumbers.js rowFor), or null
 *   px       the pixel-size rule: 'art law' (2 px a game px,
 *            public/tools/style/bible.js) or the frame size its loader
 *            assumes ('frame 128x128'), or null
 *   bar      what the game's reader must read: 256 colours at most, the
 *            size of `px`, read back by src/rendering/png8Decode.js.  Every
 *            picture family has it; held by the gate (PR 4) for supplied
 *            families only.  A family over it today is counted, not failed.
 *            null: not a picture the bar holds (sound, data, a vector).
 *   note     a few words
 *
 * The census (docs/plan/census/assets.md, PR 2) measures each family by the
 * MB it holds at the memory check's fight, not by its bytes on disk.
 */

/* what the door reaches: every file git tracks under public/ that is a
   picture, a sound, a video or data.  Code is out (.js, .html, the Tiled
   tile sets' .tsx, _headers, the manifest).  `jpg` is the one JPEG not
   spelled `jpeg` (public/intro/mayor-welcome-poster.jpg). */
export const ASSET_REACH = Object.freeze({
  under: 'public/',
  ext: Object.freeze(['png', 'webp', 'jpeg', 'jpg', 'svg', 'mp3', 'm4a', 'mp4', 'json', 'bin', 'tmx']),
});

export const ASSET_KINDS = Object.freeze(['supplied', 'made', 'data']);

/* THE DRAW PATHS: a closed list taken from the code, each naming its module */
export const ASSET_DRAWS = Object.freeze({
  file: 'a picture on its own colours: a Pixi texture from the file (Assets.load, a sheet .json); src/rendering/pixiApp.js counts it',
  numbers: 'colour numbers on the palette atlas: src/rendering/paletteTex.js, picsNumbers.js',
  strip: 'a strip loaded as you walk: src/rendering/zoneTextures.js loadTrackedStrip (stripRead.js reads its numbers off the page)',
  look: 'a look sheet: src/rendering/lookPalette.js (lookUnpack.js, lookSets/)',
  wheel: 'the Wheel\'s ground and objects: src/rendering/paletteLoad.js and the wheel modules',
  dom: 'a picture in the page (an <img>, a CSS background)',
  sfx: 'a sound decoded on play: src/data/gameDisplay.js SFX_MANIFEST, src/data/sfxCache.js',
  music: 'music streamed by the music deck: src/data/gameDisplay.js',
  data: 'read as numbers: fetched and parsed, never drawn',
  none: 'nothing loads it today',
});

/* the bar every picture family records (the readings: card P): 256 colours
   at most, the size of its pixel rule, read back by the game's own reader.
   A family that is data (look sheets: colour NUMBERS), a sound, a video or a
   vector has none. */
const PICTURE = /\.(png|webp|jpe?g)$/i;
function fam(name, kind, pattern, o = {}) {
  const pats = Array.isArray(pattern) ? pattern : [pattern];
  const picture = kind !== 'data' && pats.every((p) => PICTURE.test(p));
  return Object.freeze({
    name, kind, pattern, not: o.not || null,
    tool: o.tool || null, sources: o.sources || null,
    draw: o.draw, loader: o.loader || null, bundle: o.bundle || null,
    px: o.px || null,
    bar: picture ? Object.freeze({ colours: 256, size: o.px || null, reader: 'src/rendering/png8Decode.js' }) : null,
    note: o.note || '',
  });
}
const ER = 'src/rendering/systems/effectsRenderer.js';
const TWIN = 'tools/optimize-sprites.mjs';   /* the bot's .webp twins (.github/workflows/optimize-assets.yml) */
const FALLBACK = 'fetched only if its .webp twin fails (webpImage.js loadWebpOrPng): the twin is what is drawn';

export const ASSET_FAMILIES = Object.freeze([
  /* ── the bro: public/sprites/player/ ── */
  fam('player-sheets', 'supplied', 'public/sprites/player/{stand,jog,hit,dodge,mine,fish,pickup,attack}-{east,north,northeast,south,southwest}.png',
    { draw: 'none', px: 'frame 256x256', note: `the bro's sheets (attack-* via tools/build_player_attack_sheets.py, dodge-* via tools/repack-dodge-grid.mjs, from uploads not kept); ${FALLBACK}; the source of look/*.png` }),
  fam('player-sheet-twins', 'made', 'public/sprites/player/{stand,jog,hit,dodge,mine,fish,pickup,attack}-{east,north,northeast,south,southwest}.webp',
    { tool: TWIN, sources: 'beside', draw: 'file', loader: 'src/rendering/playerSprites.js', px: 'frame 256x256', note: 'lossless twins; the default-coloured body; a chosen look draws look/*.png; attack-* fetched, not drawn' }),
  fam('player-heads', 'made', 'public/sprites/player/*-head.png',
    { tool: ['tools/make_pose_head_sheets.py', 'tools/make_jog_head_sheets.py', 'tools/extract-pickup-head.mjs'], sources: 'public/sprites/player/<pose>-<dir>.png', draw: 'none', px: 'frame 256x256', note: `${FALLBACK}; the source of look/bodyheads` }),
  fam('player-head-twins', 'made', 'public/sprites/player/*-head.webp',
    { tool: TWIN, sources: 'beside', draw: 'file', loader: 'src/rendering/playerSkins.js', px: 'frame 256x256' }),
  fam('player-standin-bodies', 'supplied', 'public/sprites/player/{sword,bow}-*-body.png',
    { draw: 'none', note: `the owner's swing and bow art (bow keyed by tools/build_bow_sheet.mjs from uploads); ${FALLBACK}; the source of look/standin` }),
  fam('player-standin-parts', 'made', ['public/sprites/player/{sword,bow}-*-torso.png', 'public/sprites/player/jog-*-legs.png'],
    { tool: ['tools/build_attack_torso.mjs', 'tools/build_jog_legs.mjs'], sources: 'public/sprites/player/{sword,bow}-<dir>-body.png, jog-<dir>.png', draw: 'none', note: `${FALLBACK}; build_jog_legs.mjs says do not re-run as it is` }),
  fam('player-standin-twins', 'made', 'public/sprites/player/*-{legs,body,torso}.webp',
    { tool: TWIN, sources: 'beside', draw: 'file', loader: ER, note: 'the stand-ins\' bodies (_loadRecoloredBody); phones draw look/standin' }),
  fam('player-sword-weapon', 'supplied', 'public/sprites/player/sword-*-weapon.png',
    { draw: 'none', note: `tools/repack-swing-grid.mjs from the owner's grid upload; ${FALLBACK}` }),
  fam('player-sword-weapon-twins', 'made', 'public/sprites/player/sword-*-weapon.webp',
    { tool: TWIN, sources: 'beside', draw: 'file', loader: ER, note: 'computers only (Windows, Mac: src/game/lookPaletteChoice.js); phones draw look/weapons' }),
  fam('player-bow-weapon', 'made', 'public/sprites/player/bow-*-weapon.png',
    { tool: 'tools/gear/make-pine-wood.mjs', sources: 'tools/gear/src-art/player/bow-*-weapon.png', draw: 'file', loader: ER, note: 'loaded as the .png itself (_loadBowStrip); computers only; phones draw look/weapons' }),
  fam('player-bow-weapon-twins', 'made', 'public/sprites/player/bow-*-weapon.webp',
    { tool: TWIN, sources: 'beside', draw: 'none', note: 'the .png is loaded, never the twin' }),
  fam('player-retired', 'supplied', 'public/sprites/player/{sword-east,sword-north,sword-south,bow-east,bow-north,bow-northwest,bow-south,bow-southwest,welcome-bro}{,-armored}.png',
    { draw: 'none', note: 'the old bald and armoured stand-ins (their fallbacks gated off) and welcome-bro' }),
  fam('player-retired-twins', 'made', 'public/sprites/player/{sword-east,sword-north,sword-south,bow-east,bow-north,bow-northwest,bow-south,bow-southwest,welcome-bro}{,-armored}.webp',
    { tool: TWIN, sources: 'beside', draw: 'none' }),
  fam('player-renders', 'supplied', 'public/sprites/player/*.jpeg', { draw: 'none', note: '1024 px renders behind stand-*.png (TRAPS)' }),
  fam('player-anchors', 'data', 'public/sprites/player/anchors.json',
    { tool: ['public/tools/anchor-v2.html', 'tools/art/fit-fist-anchors.mjs', 'tools/add_attack_anchors.py'], draw: 'data', loader: 'src/rendering/playerAnchors.js', note: 'hand taps, then the tools' }),
  fam('player-body-anchors', 'data', 'public/sprites/player/body-anchors.json',
    { tool: 'tools/derive_body_anchors.py', sources: 'public/sprites/player/<pose>-<dir>.png', draw: 'data', loader: 'src/rendering/systems/entityRenderer.js' }),
  fam('player-body-tops', 'data', 'public/sprites/player/body-tops.json',
    { tool: 'tools/derive_body_tops.py', sources: 'public/sprites/player/<pose>-<dir>.png', draw: 'data', loader: 'src/rendering/systems/entityRenderer.js' }),
  fam('player-handles-stale', 'data', 'public/sprites/player/handles.json',
    { tool: 'public/tools/weapon-anchor.html', draw: 'none', note: 'a stale copy: the game reads weapons/handles.json' }),
  fam('player-naked', 'supplied', 'public/sprites/player-naked/*.png',
    { draw: 'file', loader: 'src/rendering/systems/entityRenderer.js', px: 'frame 256x256', note: 'loaded behind the loading screen; nothing reads the texture' }),
  fam('player-death', 'supplied', 'public/sprites/players/*.png',
    { draw: 'file', loader: 'src/rendering/playerDeathSprites.js', px: 'frame 128x128', note: 'only when deathCrumble has no corpse' }),

  /* ── armour and clothes: public/sprites/gear/ ── */
  fam('gear-belt', 'made', 'public/sprites/gear/belt/*/*.png',
    { tool: 'tools/gen_jog_belt_table.py', sources: 'tools/posesheets/chainbelt.png, public/sprites/player/jog-<dir>.png, gear/chest/steelplate/jog-<dir>.png', draw: 'none', note: FALLBACK }),
  fam('gear-walk-made', 'made', 'public/sprites/gear/{chest,legs}/*/{stand,jog}-*.png',
    { tool: 'tools/import_gear_from_sheet.py', sources: 'tools/posesheets/{stand,jog}-<dir>-mannequin-armored.png', draw: 'none', note: `${FALLBACK}; many passes in place since` }),
  fam('gear-walk-supplied', 'supplied', ['public/sprites/gear/{chest,legs}/*/{hit,mine,pickup,fish}-*.png', 'public/sprites/gear/{shirt,fullset}/*/{stand,jog,hit,mine,pickup,fish}-*.png'],
    { draw: 'none', note: `tools/fit_hit_armor_art.py, fit_mine_armor_art.py, fit_shirt_art.py, import_fullset_board.py from the owner's art, not kept; ${FALLBACK}` }),
  fam('gear-dodge', 'made', 'public/sprites/gear/*/*/dodge-*.png',
    { tool: 'tools/build-dodge-gear.mjs', sources: 'tools/dodge-src/dodge-<dir>-{armored,tshirt}.png, public/sprites/player/dodge-<dir>.png', draw: 'none', note: FALLBACK }),
  fam('gear-walk-twins', 'made', 'public/sprites/gear/{belt,chest,legs,shirt,fullset}/*/{stand,jog,hit,mine,pickup,fish,dodge}-*.webp',
    { tool: TWIN, sources: 'beside', draw: 'file', loader: 'src/rendering/gearSheets.js', px: 'frame 256x256 (128 on disk)', note: 'packed on the page (pack-page, card H\'s Found); phones draw chest, legs and fullset from look/gearwalk' }),
  fam('gear-combat-supplied', 'supplied', ['public/sprites/gear/{chest,legs,shirt}/*/{swing,cook,fire}-*.png', 'public/sprites/gear/{chest,legs}/*/bowshot-*.png'],
    { draw: 'file', loader: ER, note: 'the .png itself (_gearStripFrame); computers only: phones draw look/gear' }),
  fam('gear-chop-originals', 'supplied', 'public/sprites/gear/*/*/chop-west.png',
    { draw: 'none', note: 'read only to make chop-west-220.png' }),
  fam('gear-combat-made', 'made', ['public/sprites/gear/shirt/*/bowshot-*.png', 'public/sprites/gear/*/*/farm*-*.png', 'public/sprites/gear/*/*/chop-west-220.png'],
    { tool: ['tools/build_shirt_bow.mjs', 'tools/make_farm_anims.py', 'tools/build_chop_half.mjs'], sources: 'tools/bowshirt_src/*.png, tools/farm_anim_src/*.png, public/sprites/gear/<slot>/<item>/chop-west.png', draw: 'file', loader: ER, note: 'the .png itself; computers only: phones draw look/gear' }),
  fam('gear-combat-twins', 'made', 'public/sprites/gear/*/*/{swing,bowshot,cook,fire,farm,chop}*.webp',
    { tool: TWIN, sources: 'beside', draw: 'none', note: 'the .png is read, never the twin' }),
  fam('gear-icons', 'made', 'public/sprites/gear/icons/*.webp', { tool: 'unknown', draw: 'none' }),

  /* ── the look sheets: colour NUMBERS in red and green, DATA ── */
  fam('look-body', 'data', 'public/sprites/look/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/player/{stand,jog,hit,dodge,mine,fish,pickup}-<dir>', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set body' }),
  fam('look-bodyheads', 'data', 'public/sprites/look/bodyheads/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/player/*-head', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set bodyheads' }),
  fam('look-gear', 'data', 'public/sprites/look/gear/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/gear/{chest,legs,shirt}/*/{swing,bowshot,chop-west-220,cook,fire,farm*}-*.png', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set gear' }),
  fam('look-gearwalk', 'data', 'public/sprites/look/gearwalk/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/gear/{chest,legs,fullset}/*/{stand,jog,hit,dodge,fish,mine,pickup}-*', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set gearwalk' }),
  fam('look-heads', 'data', 'public/sprites/look/heads/*.png',
    { tool: 'tools/art/head-bake.mjs', sources: 'public/sprites/traits/{hair,headwear,facialhair,eyewear,eyestyle}/*/<dir>.png', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set heads' }),
  fam('look-shirt', 'data', 'public/sprites/look/shirt/*.png',
    { tool: 'tools/art/shirt-bake.mjs', sources: 'public/sprites/gear/shirt/tshirt/{stand,jog}-<dir>.png', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set shirt' }),
  fam('look-standin', 'data', 'public/sprites/look/standin/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/player/{sword,bow}-*-{body,torso}, jog-*-legs', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set standin' }),
  fam('look-standinlegs', 'data', 'public/sprites/look/standinlegs/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/player/{sword,bow}-*-body, gear/legs/steelgreaves/{swing,bowshot}-*', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set standinlegs' }),
  fam('look-weapons', 'data', 'public/sprites/look/weapons/*.png',
    { tool: 'tools/art/role-bake.mjs', sources: 'public/sprites/player/{sword,bow}-*-weapon.png', draw: 'look', loader: 'src/rendering/lookPalette.js', bundle: 'look set weapons' }),
  fam('look-manifests', 'data', 'public/sprites/look/**/roles.json',
    { tool: ['tools/art/role-bake.mjs', 'tools/art/head-bake.mjs', 'tools/art/shirt-bake.mjs'], sources: 'each set\'s sheets', draw: 'data', loader: 'src/rendering/lookPalette.js' }),

  /* ── head pieces, species, capes: public/sprites/traits/ ── */
  fam('traits-hi', 'supplied', 'public/sprites/traits/{hair/*,headwear/*,facialhair/*,eyewear/{3d-glasses,eye-patch,goggles,laser-glasses,thug-life,white-glass},eyestyle/{demon,one-eye,sleepy,wtf}}/hi/*.png',
    { draw: 'dom', loader: 'src/rendering/characterPortrait.js', px: 'frame 256x256', note: 'the 256 px originals (tools/import_headwear_green.py from AI sheets not kept); the Equipment screen\'s figure; the source of the 128 px frames' }),
  fam('traits-hi-made', 'made', 'public/sprites/traits/{eyewear,eyestyle}/{golden-glasses,golden-monocle,alien}/hi/*.png',
    { tool: ['tools/ui/make_collection_eyewear.py', 'tools/species_alien.py'], sources: 'assets/portrait-source/hemi-bros/*.png', draw: 'dom', loader: 'src/rendering/characterPortrait.js', px: 'frame 256x256' }),
  fam('traits-frames', 'made', 'public/sprites/traits/{hair,headwear,facialhair,eyewear,eyestyle}/*/{east,north,northeast,south,southwest}.png',
    { tool: ['tools/downscale_traits.py', 'tools/ui/make_collection_eyewear.py', 'tools/species_alien.py'], sources: '<piece>/hi/<dir>.png', draw: 'file', loader: 'src/rendering/systems/entityRenderer.js', px: 'frame 128x128', note: 'a coloured piece draws look/heads' }),
  fam('traits-hairmasks', 'made', 'public/sprites/traits/headwear/*/hairmask/*.png',
    { tool: 'tools/make_hairmask.py', sources: 'public/sprites/traits/headwear/<id>/<dir>.png, the player\'s stand and jog sheets', draw: 'file', loader: 'src/rendering/systems/entityRenderer.js', px: 'frame 128x128' }),
  fam('traits-meta', 'data', 'public/sprites/traits/{hair,headwear,facialhair,eyewear,eyestyle}/*/meta.json',
    { tool: ['tools/import_headwear_green.py', 'tools/ui/make_collection_eyewear.py', 'tools/species_alien.py'], draw: 'data', loader: 'src/rendering/systems/entityRenderer.js' }),
  fam('traits-thumbs', 'supplied', 'public/sprites/traits/{hair,headwear,facialhair}/*/thumb.png',
    { draw: 'dom', loader: 'src/rendering/traitThumbs.js', note: 'cropped by tools/import_headwear_green.py from sheets not kept' }),
  fam('traits-thumbs-made', 'made', ['public/sprites/traits/{hair,headwear,facialhair,shirt}/*/thumb-sw.png', 'public/sprites/traits/{eyewear,eyestyle,species}/*/thumb*.png'],
    { tool: ['tools/ui/make-southwest-thumbs.mjs', 'tools/ui/slice_eyewear_thumbs.py', 'tools/ui/make_eyestyle_thumbs.py', 'tools/ui/make_species_thumbs.py'], sources: '<piece>/hi/southwest.png, assets/icons-source/sheet-eyewear-icons.png, the species\' frames', draw: 'dom', loader: 'src/rendering/traitThumbs.js' }),
  fam('traits-shirt-thumb', 'made', 'public/sprites/traits/shirt/*/thumb.png', { tool: 'unknown', draw: 'dom', loader: 'src/rendering/traitThumbs.js' }),
  fam('traits-shirt', 'supplied', 'public/sprites/traits/shirt/*/{east,north,northeast,south,southwest}.png',
    { draw: 'none', note: 'halved in place by tools/downscale_traits.py, no hi/ kept; the tee worn is gear/shirt/tshirt' }),
  fam('traits-shirt-meta', 'data', 'public/sprites/traits/shirt/*/meta.json', { tool: 'unknown', draw: 'none' }),
  fam('traits-nft', 'supplied', 'public/sprites/traits/nft/*/*.png',
    { draw: 'file', loader: 'src/rendering/systems/entityRenderer.js', px: 'frame 256x256', note: 'loaded behind the loading screen; nothing reads the texture' }),
  fam('traits-nft-meta', 'data', 'public/sprites/traits/nft/*/meta.json', { tool: 'unknown', draw: 'data', loader: 'src/rendering/systems/entityRenderer.js' }),
  fam('species-monkey', 'supplied', 'public/sprites/traits/species/monkey/{east,north,northeast,south,southwest}.png',
    { draw: 'file', loader: 'src/rendering/traits/speciesArt.js', px: 'frame 256x256', note: 'imported from a sheet not kept' }),
  fam('species-alien', 'made', 'public/sprites/traits/species/alien/{east,north,northeast,south,southwest}.png',
    { tool: 'tools/species_alien.py', sources: 'public/sprites/traits/species/monkey/<dir>.png', draw: 'file', loader: 'src/rendering/traits/speciesArt.js', px: 'frame 256x256' }),
  fam('species-frames', 'made', 'public/sprites/traits/species/*/{*.fur,frames/*}.png',
    { tool: 'tools/species_frames.py', sources: 'public/sprites/traits/species/<id>/<dir>.png, tools/species-fixes/<id>.json', draw: 'file', loader: 'src/rendering/traits/speciesArt.js', px: 'frame 256x256' }),
  fam('species-meta', 'data', 'public/sprites/traits/species/*/meta.json',
    { tool: ['tools/species_frames.py', 'tools/species_alien.py'], sources: 'tools/species-fixes/<id>.json', draw: 'data', loader: 'src/rendering/traits/speciesArt.js' }),
  fam('cape', 'supplied', 'public/sprites/traits/cape/*/{east,north,northeast,south,southwest}.png',
    { draw: 'file', loader: 'src/rendering/capeSprites.js', px: 'frame 256x256', note: 'tools/import_cape_green.py from an AI sheet not kept' }),
  fam('cape-hood', 'made', 'public/sprites/traits/cape/*/hood/*.png',
    { tool: 'tools/cape/split-cape-hood.py', sources: 'public/sprites/traits/cape/<id>/<dir>.png', draw: 'file', loader: 'src/rendering/capeSprites.js', px: 'frame 256x256' }),
  fam('cape-meta', 'data', 'public/sprites/traits/cape/*/meta.json', { tool: 'tools/import_cape_green.py', draw: 'none' }),

  /* ── townsfolk: public/sprites/npc/ ── */
  fam('npc-heads', 'made', 'public/sprites/npc/{bean,beastmaster-bro,benny,blacksmith-bro,cardsharp-bro,chef-blaze,deed-dave,farmer-bro,gavel-greg,glint,guildmaster-gary,lil-bro,mayor-bro,old-man-reel,postmaster-pete,sheriff-buck,shopkeeper-bro,slim,sterling,tourist-terry,woodworker-bro}-head.webp',
    { tool: 'tools/qa/nft_portraits.py', sources: 'assets/portrait-source/hemi-bros/*.png, src/data/npcLooks.js', draw: 'dom', loader: 'src/data/gameDisplay.js', px: 'picture 192x192' }),
  fam('npc-bakes', 'made', 'public/sprites/npc/{bean,beastmaster-bro,benny,blacksmith-bro,chef-blaze,deed-dave,farmer-bro,gavel-greg,glint,guildmaster-gary,mayor-bro,old-man-reel,postmaster-pete,sheriff-buck,slim,sterling,tourist-terry,woodworker-bro,*-walk-*}.webp',
    { tool: ['tools/qa/npc-looks.mjs', 'tools/qa/npc_looks_bake.py', 'tools/art/npc256.mjs'], sources: 'src/data/npcLooks.js and the player and trait sheets', draw: 'file', loader: 'src/rendering/npcSprites.js', px: 'cells 256x256', note: 'computers; phones draw townsfolk live (lookFolk.js)' }),
  fam('npc-storekeeper', 'supplied', 'public/sprites/npc/storekeeper-bro-idle.png',
    { draw: 'dom', loader: 'src/ui/panels/buildings/BuildingRoom.jsx', px: 'cells 362x724' }),
  fam('npc-retired', 'supplied', ['public/sprites/npc/storekeeper-bro{,-head}.webp', 'public/sprites/npc/{blacksmith-bro,mayor-bro,storekeeper-bro}.png'],
    { draw: 'none', note: 'townsfolk load the .webp bakes; mayor-bro.png is the art from before the hat fix' }),

  /* ── pets, shields, projectiles, gathering tools, weapons ── */
  fam('pets', 'made', 'public/sprites/pets/*.png',
    { tool: 'tools/make_pet_sheet.py', sources: 'public/sprites/monsters/** walk strips', draw: 'file', loader: 'src/rendering/petSprites.js', px: 'art law' }),
  fam('shields', 'made', 'public/sprites/shields/*.png',
    { tool: 'tools/gear/make-pine-wood.mjs', sources: 'tools/gear/src-art/shields/*.webp', draw: 'file', loader: 'src/rendering/shieldSprites.js' }),
  fam('weapons-wood', 'made', 'public/sprites/weapons/{bows,staffs}/*.png',
    { tool: 'tools/gear/make-pine-wood.mjs', sources: 'tools/gear/src-art/{bows,staffs}/*.webp', draw: 'file', loader: 'src/rendering/weaponSprites.js' }),
  fam('projectile-arrow', 'made', 'public/sprites/projectiles/arrow-pine.png',
    { tool: 'tools/gear/make-pine-arrow.mjs', sources: 'tools/gear/src-art/arrow-pine.png', draw: 'file', loader: ER }),
  fam('projectile-sheets', 'made', 'public/sprites/projectiles/{magic-bolt,magic-special,sword-slash}-v1.webp',
    { tool: ['tools/process_magic_bolt_sheet.py', 'tools/process_special_sheets.py'], sources: 'assets/icons-source/sheet-{magic-bolt,magic-special,sword-slash}.png', draw: 'file', loader: ER, px: 'frames 4 across' }),
  fam('projectile-arrow-special', 'made', 'public/sprites/projectiles/arrow-special-v1.webp',
    { tool: 'tools/process_special_sheets.py', sources: 'assets/icons-source/sheet-arrow-special.png', draw: 'none', note: 'the hot arrow is drawn instead' }),
  fam('tool-gestures', 'made', 'public/sprites/tools/{axe,pickaxe,reel}-gesture-v1.webp',
    { tool: 'tools/process_gesture_sheets.py', sources: 'assets/icons-source/sheet-gesture-{axe,pickaxe,reel}.png', draw: 'file', loader: ER, px: 'cells 256x256' }),
  fam('tool-pan-v1', 'made', 'public/sprites/tools/pan-gesture-v1.webp',
    { tool: 'tools/process_gesture_sheets.py', sources: 'assets/icons-source/sheet-gesture-pan.png', draw: 'none', note: 'replaced by pan-gesture-v2' }),
  fam('tool-pan', 'supplied', 'public/sprites/tools/pan-gesture-v2.webp',
    { draw: 'file', loader: ER, px: 'cells 256x256', note: 'tools/process_pan_food_sheet.py from an upload not kept' }),
  fam('weapons-sword-256', 'made', 'public/sprites/weapons/swords/*-256.webp',
    { tool: 'unknown', sources: 'public/sprites/weapons/swords/{Sword1,Bamboo}.webp', draw: 'file', loader: 'src/rendering/weaponSprites.js' }),
  fam('weapons-greatsword', 'supplied', 'public/sprites/weapons/swords/greatsword-*.webp',
    { draw: 'file', loader: 'src/rendering/weaponSprites.js', note: 'tools/import-metal-sword.mjs from uploads; widened in place by tools/art/widen_greatsword.py' }),
  fam('weapons-sword-originals', 'supplied', 'public/sprites/weapons/swords/{Sword1,Bamboo,steel-sword-east}.webp',
    { draw: 'none', note: 'the 1254 px originals of the -256 twins; steel-sword-east unreferenced' }),
  fam('weapons-handles', 'data', 'public/sprites/weapons/handles.json',
    { tool: ['public/tools/weapon-anchor.html', 'tools/import-metal-sword.mjs', 'tools/art/widen_greatsword.py'], draw: 'data', loader: 'src/rendering/playerAnchors.js' }),

  /* ── monsters: public/sprites/monsters/ (their strips load as you walk) ── */
  fam('monster-fire-goblin', 'made', 'public/sprites/monsters/fire-goblin/{attack-*,hit-*,walk-*,death}.png',
    { tool: 'unknown', draw: 'strip', loader: 'src/rendering/fireGoblinSprites.js', bundle: 'fireGoblin', px: 'frame 256x256', note: 'no cutter in the repository; put on 256 colours in place' }),
  fam('monster-skeleton', 'made', 'public/sprites/monsters/skeleton/{run-*,death}.png',
    { tool: 'unknown', draw: 'strip', loader: 'src/rendering/skeletonSprites.js', bundle: 'skeleton', px: 'frame 256x256', note: 'the owner\'s strips, put on 256 colours in place' }),
  fam('monster-mummy', 'made', 'public/sprites/monsters/mummy/*.png',
    { tool: 'unknown', draw: 'strip', loader: 'src/rendering/mummySprites.js', bundle: 'mummy', px: 'frame 256x256' }),
  fam('monster-snowman', 'made', 'public/sprites/monsters/{snowman/snowman-*,snowman-death,snowman-hit}.png',
    { tool: 'unknown', sources: 'assets/monster animations/snowman/*', draw: 'strip', loader: 'src/rendering/snowmanSprites.js', bundle: 'snowman', px: 'frame 128x128' }),
  fam('monster-water-frog', 'made', 'public/sprites/monsters/water-frog/*.png',
    { tool: 'tools/art/cut_water_frog.py', sources: 'assets/monster animations/water-frog/*', draw: 'strip', loader: 'src/rendering/waterFrogSprites.js', bundle: 'waterFrog', px: 'frame 256x256', note: 'cut, then tools/art/strip256.mjs --shared' }),
  fam('monster-rock-golem', 'made', 'public/sprites/monsters/rock-golem/{walk,death}.png',
    { tool: 'tools/art/cut_rock_golem.py', sources: 'assets/monster animations/rock-golem/rock-golem-sheet.png', draw: 'strip', loader: 'src/rendering/rockGolemSprites.js', bundle: 'rockGolem', px: 'frame 256x256', note: 'cut (sheet_rows.py), then strip256.mjs --shared' }),
  fam('monster-rotcap', 'made', 'public/sprites/monsters/rotcap/{walk,death}.png',
    { tool: 'tools/art/cut_rotcap.py', sources: 'assets/monster animations/rotcap/rotcap-sheet.png', draw: 'strip', loader: 'src/rendering/rotcapSprites.js', bundle: 'rotcap', px: 'frame 256x256', note: 'cut (sheet_rows.py), then strip256.mjs --shared' }),
  fam('monster-storm-eye', 'made', 'public/sprites/monsters/storm-eye/{views,death}.png',
    { tool: 'tools/art/cut_storm_eye.py', sources: 'assets/monster animations/storm-eye/storm-eye-sheet.png', draw: 'strip', loader: 'src/rendering/stormEyeSprites.js', bundle: 'stormEye', px: 'frame 256x256' }),
  fam('monster-stills', 'made', ['public/sprites/monsters/fire-goblin/{fireball,remnants}.png', 'public/sprites/monsters/skeleton/remnants.png', 'public/sprites/monsters/{snowman/snowball,snowman-remnants}.png'],
    { tool: 'unknown', draw: 'file', loader: 'src/rendering/zoneTextures.js', px: 'frame 256x256 (the snowman\'s 128)', note: 'one picture each (loadTracked: a file, freed with its bundle); snowball is frame 5 of snowman-attack-s' }),
  fam('monster-slime', 'made', 'public/sprites/monsters/slime-*.png',
    { tool: 'unknown', sources: 'assets/monster animations/slime-*', draw: 'file', loader: 'src/rendering/slimeSprites.js', px: 'frame 128x128', note: 'cut from videos; mended in place by tools/mend_slime_shine.py; a coloured slime goes through the strip door retinted' }),
  fam('monster-codex', 'made', 'public/sprites/monsters/{rock-golem/codex-walk,rotcap/codex-walk,storm-eye/codex-idle}.png',
    { tool: ['tools/art/cut_rock_golem.py', 'tools/art/cut_rotcap.py', 'tools/art/cut_storm_eye.py'], sources: 'assets/monster animations/<kind>/<kind>-sheet.png', draw: 'dom', loader: 'src/ui/mobile/dash/CodexStage.jsx', px: 'cells 256x256' }),
  fam('monster-retired', 'made', ['public/sprites/monsters/fire-goblin/fire-goblin-*.png', 'public/sprites/monsters/snowman/impact.png'],
    { tool: 'unknown', draw: 'none', note: 'the fire goblin\'s 1254 px direction views (reduced in place) and the snowman\'s retired impact' }),

  /* ── effects: public/sprites/fx/, effects/, skills/ ── */
  fam('fx-sheets-supplied', 'supplied', ['public/sprites/fx/{stun-stars-v1,whirl-vortex-v1}.png', 'public/sprites/effects/{grease,woodchips,rocks,splash}-burst-v1.webp'],
    { draw: 'file', loader: ER, px: 'cells 256x256', note: 'tools/import_fx_sheet.mjs, process_effect_sheets.py, import_rocks_burst.py from the owner\'s sheets, not kept' }),
  fam('fx-made', 'made', ['public/sprites/fx/{fire-trail-v1.png,portal-beam.webp,smith-anvil.webp,snow-footprints.webp}', 'public/sprites/effects/{arrow-blast-v1.webp,jet-stream-v1.png,snowball-burst-v1.png}'],
    { tool: ['tools/import_fire_trail.mjs', 'tools/import_portal_beam.py', 'tools/make_smith_anvil.py', 'unknown'], sources: 'assets/fx-source/{fire-trail-grid.png,portal-beam-source.jpg,snow-footprints-strip.png}, public/sprites/props/anvil.png, assets/icons-source/jet-stream-*.png', draw: 'file', loader: ER, note: 'the arrow blast\'s and the snowball burst\'s makers are not known' }),
  fam('fx-coinflip', 'supplied', 'public/sprites/fx/coinflip-*.webp',
    { draw: 'dom', loader: 'src/ui/panels/AceFlipPanel.jsx', px: 'cells 128x192', note: 'tools/import_coin_flip.py from the owner\'s sheets, not kept' }),
  fam('fx-zonebanners', 'made', 'public/sprites/fx/zonebanner-*-v1.webp',
    { tool: 'tools/process_zone_banner_sheets.py', sources: 'docs/triage-2026-09-17/assets/zonebanner-*-ornament.png', draw: 'dom', loader: 'src/ui/zoneBannerOverlay.js' }),
  fam('fx-levelup-strip', 'made', 'public/sprites/fx/levelup-burst-v1.webp',
    { tool: 'unknown', draw: 'none', note: 'a WebP of the owner\'s strip; warmed only where its numbers cannot be drawn or fail (?burstnumbers=0)' }),
  fam('fx-levelup-numbers', 'made', 'public/sprites/fx/levelup-burst-v1-f*.p256.png',
    { tool: 'tools/art/levelup-numbers.mjs', sources: 'public/sprites/fx/levelup-burst-v1.webp', draw: 'dom', loader: 'src/rendering/levelUpBurstNumbers.js', note: 'colour numbers held packed and opened on the reader\'s worker, turned into colours on a canvas in the page (not the atlas)' }),
  fam('p256-twins', 'made', ['public/sprites/{fx,effects,tools}/*.p256.png'],
    { not: 'public/sprites/fx/levelup-burst-*.p256.png', tool: 'tools/art/reduce256.mjs', sources: 'beside', draw: 'none', note: 'read only with ?p256=1 (off: TRAPS §305); listed in src/data/p256Files.js' }),
  fam('skills-strips', 'made', 'public/sprites/skills/{chop,cook}-strip.webp',
    { tool: 'unknown', draw: 'file', loader: ER, note: 'the stand-ins\' drawn chop and cook; chop mended in place by tools/fill_chop_eyes.py' }),
  fam('skills-strips-made', 'made', 'public/sprites/skills/{chop-strip-legless,cook-strip-legless,firemaking-strip}.webp',
    { tool: ['tools/make_chop_legless.py', 'tools/build_cook_legless.mjs', 'tools/build_fire_clean.py'], sources: 'public/sprites/skills/{chop,cook}-strip.webp, assets/skill-anim-src/firemaking-strip-painted.webp', draw: 'file', loader: ER }),
  fam('skills-farm', 'made', 'public/sprites/skills/farm-*.png',
    { tool: 'tools/make_farm_anims.py', sources: 'tools/farm_anim_src/*.png', draw: 'file', loader: ER }),
  fam('skills-crowns', 'data', 'public/sprites/skills/crowns.json',
    { tool: 'tools/build_fire_8f.mjs', draw: 'data', loader: ER, note: 'its fire entry from the tool, the rest by hand' }),

  /* ── things in the world: ore, trees, props, the skateboard ── */
  fam('ore-tiers', 'made', 'public/sprites/ore/ore-*.png',
    { tool: 'tools/world/add-ore-art.mjs', sources: 'assets/prop-source/ore/ore.png', draw: 'file', loader: ER, px: 'art law' }),
  fam('tree-tiers', 'made', 'public/sprites/trees/wood-*.png',
    { tool: 'tools/world/add-tree-art.mjs', sources: 'assets/prop-source/trees/trees-{a,b}.png', draw: 'file', loader: ER, px: 'art law' }),
  fam('world-fish-spot', 'made', 'public/sprites/world/fish-spot-627.webp',
    { tool: 'unknown', sources: 'public/sprites/world/fish-spot.webp', draw: 'file', loader: ER, note: 'a sharp lanczos3 twin' }),
  fam('world-sprites-retired', 'made', ['public/sprites/trees/tree-{flame,frost,stone,storm,venom,water,wind,pine-940}.webp', 'public/sprites/world/{ore-vein-627,ore-vein-break}.webp', 'public/sprites/world/ore-vein-*-418.webp', 'public/sprites/{cook,fish,joystick,wood}/*.webp', 'public/sprite-preview-candidates/*.png'],
    { tool: ['unknown', 'tools/make_tier_art.py'], draw: 'none', note: 'unloaded twins and strips: elemental trees, ore veins, the cook, fish, axe and tree strips, the joystick\'s metal, a preview candidate' }),
  fam('world-originals', 'supplied', ['public/sprites/trees/tree-pine.webp', 'public/sprites/world/{fish-spot,ore-vein}.webp'],
    { draw: 'none', note: 'the 1254 px originals of the twins drawn' }),
  fam('tiles-retired', 'made', ['public/sprites/tiles/*.tmx', 'public/sprites/tiles/tileset-*.webp'],
    { tool: 'unknown', draw: 'none', note: 'Tiled maps and their tile sets; the game reads /maps, never /sprites/tiles' }),
  fam('props-town', 'made', ['public/sprites/props/frost-*.png', 'public/sprites/props/{bench,lamp-post,fence-banner,fountain}.webp', 'public/sprites/props/*-still.png'],
    { tool: ['tools/import-decor-art.mjs', 'tools/import_town_props.py', 'tools/import_fountain.py', 'tools/cut_prop_parts.py'], sources: 'assets/prop-source/{decor-frost/frost-*.png,town-props-sheet.png,fountain-sheet.png}, public/sprites/props/{forge,auction-house,bank,mayor-house}.png', draw: 'none', note: 'the old town\'s props: loaded only on the way to the retired town (?nospawn, ?wayback)' }),
  fam('props-buildings', 'supplied', 'public/sprites/props/{auction-house,bank,mayor-house}.png',
    { draw: 'none', note: 'tools/import-building-art.mjs from the owner\'s exports, not kept; the source of the -still pictures and the parts' }),
  fam('props-other', 'made', 'public/sprites/props/{forge,enchanter,market-stall,anvil}.png',
    { tool: 'unknown', draw: 'none', note: 'anvil.png is the source of fx/smith-anvil.webp, forge.png of forge-still' }),
  fam('props-parts', 'made', 'public/sprites/props/{prop-swing@2x,prop-flags}.png',
    { tool: 'tools/cut_prop_parts.py', sources: 'public/sprites/props/{forge,auction-house,bank,mayor-house}.png', draw: 'file', loader: 'src/rendering/worldLife.js', note: 'loaded every session behind the gate; drawn only on the old town\'s buildings' }),
  fam('ride', 'made', 'public/sprites/ride/*.png',
    { tool: 'tools/art/cut-skateboard.mjs', sources: 'assets/prop-source/skateboard/skateboard-views.png', draw: 'file', loader: 'src/rendering/rideFx.js', px: 'art law' }),
  fam('timingbar', 'supplied', 'public/sprites/timingbar/*.png', { draw: 'none', note: 'not loaded since v2.3.4800; the owner\'s file stays' }),

  /* ── the world: public/world/, public/maps/, the portrait atlas ── */
  fam('world-farm', 'supplied', 'public/world/farm/*.png',
    { not: 'public/world/farm/sale-sign.png', draw: 'wheel', loader: 'src/rendering/paletteLoad.js', bundle: 'a row a picture', px: 'art law', note: 'tools/world/add-farm-art.mjs from the owner\'s ChatGPT sheets, not kept; palette PNGs; the ripe crops also <img>' }),
  fam('world-farm-sale-sign', 'supplied', 'public/world/farm/sale-sign.png', { draw: 'none', px: 'art law', note: 'cut with the farm; never placed' }),
  fam('world-farm-manifest', 'data', 'public/world/farm/manifest.json',
    { tool: 'tools/world/add-farm-art.mjs', draw: 'none', note: 'the game reads src/data/farmArt.js, which the same tool writes' }),
  fam('world-ground', 'supplied', 'public/world/ground/*.png',
    { draw: 'wheel', loader: 'public/tools/world/core/ground-worker.js', bundle: 'a row a ground piece', px: 'art law (a 1024 px swatch is 512 game px)', note: 'the Ground Studio\'s download (tools/world/add-ground-pictures.mjs), the owner\'s swatches kept only in the studio; the -A floors also load as pictures in dungeons' }),
  fam('world-ground-manifest', 'data', 'public/world/ground/manifest.json',
    { tool: 'tools/world/add-ground-pictures.mjs', draw: 'data', loader: 'public/tools/world/core/ground-worker.js' }),
  fam('world-objects', 'made', 'public/world/objects/*.png',
    { tool: 'tools/world/repack-objects.mjs', sources: 'public/world/objects/* and the Object Studio\'s download', draw: 'wheel', loader: 'src/rendering/wheelObjects.js', bundle: 'a row a page', px: 'art law' }),
  fam('world-objects-data', 'data', ['public/world/objects/*-*.json', 'public/world/objects/manifest.json'],
    { tool: 'tools/world/repack-objects.mjs', draw: 'data', loader: 'src/rendering/wheelObjects.js', note: 'each page\'s frames, and which object is on which page' }),
  fam('world-interiors', 'supplied', 'public/world/interiors/*.webp',
    { draw: 'dom', loader: 'src/ui/panels/buildings/BuildingRoom.jsx', px: 'picture 1152x768', note: 'tools/ui/make-room-pictures.py from the owner\'s ChatGPT pictures, not kept' }),
  fam('world-dungeons', 'made', 'public/world/dungeons/*.png',
    { tool: 'tools/world/add-dungeon-art.mjs', sources: 'assets/prop-source/dungeons/*.png', draw: 'file', loader: 'src/game/dungeonArt.js', px: 'art law', note: 'palette PNGs loaded as pictures (paletteLoad.js reads the farm only)' }),
  fam('world-arena', 'made', 'public/world/arena/*.png',
    { tool: 'tools/world/add-arena-art.mjs', sources: 'assets/prop-source/arena/*.png', draw: 'none', px: 'art law', note: 'listed in src/data/arenaArt.js, which nothing imports' }),
  fam('wheel-placed', 'data', 'public/world/placed5/{objects.bin,lands.png}',
    { tool: 'tools/world/bake-wheel-world.mjs', sources: 'public/tools/world/plan.js, public/tools/world/core/*, public/tools/objects/catalog.js', draw: 'data', loader: 'public/tools/world/core/ground-worker.js', note: 'the live long Wheel\'s placed objects; lands.png\'s red is a land\'s number' }),
  fam('wheel-overview', 'made', 'public/world/placed5/overview.png',
    { tool: 'tools/world/bake-wheel-world.mjs', sources: 'public/tools/world/plan.js, public/tools/world/core/*', draw: 'wheel', loader: 'src/rendering/wheelGround.js', px: 'picture 454x454', note: 'the underlay and the minimap' }),
  fam('wheel-detail', 'made', 'public/world/placed5/detail/*.png',
    { tool: 'tools/world/bake-wheel-world.mjs', sources: 'public/tools/world/plan.js, src/data/wheelLands.js', draw: 'dom', loader: 'src/ui/worldMapDetail.js', px: 'tile 256x256', note: 'the world map zoomed in' }),
  fam('wheel-short', 'made', ['public/world/placed/{objects.bin,lands.png}', 'public/world/placed/overview.png'],
    { tool: 'tools/world/bake-wheel-world.mjs', sources: 'public/tools/world/plan.js (the short Wheel)', draw: 'none', note: 'read only with the live flag wheel5x off; the previews' }),
  fam('maps-farm', 'made', 'public/maps/farm_v2.png',
    { tool: 'tools/world/bake_farm_ground.py', sources: 'public/world/ground/{commons-A,commons-B,town-yard-A,street-A}.png, src/data/farmLayout.js', draw: 'wheel', loader: 'src/rendering/paletteLoad.js', bundle: 'its own row', px: 'art law', note: 'read in place of farm_v2.webp where colour numbers are drawn' }),
  fam('maps-farm-webp', 'made', 'public/maps/farm_v2.webp',
    { tool: 'tools/world/bake_farm_ground.py', sources: 'as farm_v2.png', draw: 'none', note: 'fetched only where colour numbers cannot be drawn' }),
  fam('maps-retired', 'made', ['public/maps/{town_v17,town_v16,worldview_v4,worldview_v2,meadow_v6,farm_v1}.webp', 'public/maps/{town_v17,town_v16,farm_v1}.walk.json'],
    { tool: ['tools/maps/build-town-v17.mjs', 'tools/maps/build-town-v16.mjs', 'tools/maps/build_worldview_v4.py', 'tools/mask-to-walkable.mjs', 'unknown'], sources: 'tools/maps/src-art/*, assets/map-source/worldview-v4-source.png', draw: 'none', note: 'the old maps: town_v17 only with ?nospawn, ?wayback or a failed trip to the Wheel; tools read some' }),
  fam('portrait-atlas', 'data', 'public/portrait/hemi-bros-atlas.png',
    { tool: 'tools/portrait/make-hemi-atlas.mjs', sources: 'assets/portrait-source/hemi-bros/*.png', draw: 'none', note: 'read as colour numbers (hemiBust.js, png8Decode.js) only with ?hemiface=1' }),
  fam('minigame-mining', 'supplied', 'public/minigames/mining/*.mp4', { draw: 'none', note: 'AI clips; extract-success.mp4 is the source of a mining sound' }),
  fam('minigame-mining-pictures', 'made', 'public/minigames/mining/*.webp', { tool: 'unknown', draw: 'none' }),
  fam('intro-clip', 'supplied', 'public/intro/loading-ashore.mp4', { draw: 'dom', loader: 'src/ui/IntroVideo.jsx', note: 'the loading screen\'s clip' }),
  fam('intro-poster', 'made', 'public/intro/loading-ashore-poster.webp',
    { tool: 'unknown', sources: 'public/intro/loading-ashore.mp4', draw: 'dom', loader: 'src/ui/IntroVideo.jsx' }),
  fam('intro-retired', 'supplied', 'public/intro/{loading-reef,mayor-welcome}.mp4', { draw: 'none', note: 'MayorGreeting.jsx is unreachable' }),
  fam('intro-retired-poster', 'made', 'public/intro/mayor-welcome-poster.jpg', { tool: 'unknown', sources: 'public/intro/mayor-welcome.mp4', draw: 'none' }),
]);
