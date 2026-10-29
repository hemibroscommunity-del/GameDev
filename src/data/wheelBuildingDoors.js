/* ═══ v2.3.3032: THE WHEEL'S BUILDINGS HAVE DOORS ═══
 *
 * Owner, 2026-10-04: "Push to main. Then after that add doors."  With the
 * portal to today's town gone (v2.3.3025) the forge, the bank, the shops and
 * the auction house could not be reached at all; the Wheel's own Brotown had
 * seventeen buildings with pictures and footprints and nothing behind them.
 *
 * Where each door is: the ground worker's `objects.doors` (public/tools/world/
 * core/placing.js doorSpots -- a building's foot, the bottom of its steps).
 * WHICH of today's buildings opens there is this table, plot id (plan.js) ->
 * the TOWN_BUILDINGS id (src/data/buildings.js) whose panel opens, so a door
 * is today's own forge, bank, store and so on -- the panels and everything
 * the server settles behind them are not new.  No imports, so
 * tools/world/test-world-core.mjs can read it: it checks every key is a plot
 * of the plan and every value is that plot's own `today`.
 *
 * Five plots have nothing of today's town to open.  The Town Hall has Mayor
 * Bro on its steps.  The other four are the plan's "(new: ...)" buildings:
 * since v2.3.3066 three of them open halls of their own (WHEEL_HALL_DOORS),
 * and the Hotel stands shut, saying so (WHEEL_SHUT_DOORS) instead of leaving
 * a player to wonder whether the door is broken.  Since v2.3.3258 the Town
 * Hall is a fourth hall (Mayor Bro still stands on its steps), so only the
 * Hotel was shut -- and since v2.3.3539 it is a fifth, open against a worker
 * that pays its rest (WHEEL_HALL_CAPS).
 */

/* How near a door (game px) the Enter button comes up: from your BOOTS to the
   foot of its steps -- the ground you stand on is what you stand at a door
   with, not your waist.  The doors on a street are 600+ px apart, so the
   nearest simply wins; ~1.5 steps wide of the porch is where it feels like
   "at the door" (mp-wheeldoors walks it both ways). */
export const WHEEL_DOOR_REACH = 140;

/* plot id -> TOWN_BUILDINGS id.  MIRROR: plan.js town.lots (id, today) --
   test-world-core checks it. */
export const WHEEL_BUILDING_DOORS = {
  blacksmith: 'blacksmith',     /* the forge */
  woodworker: 'woodworker',
  gemcutter: 'gemcutter',       /* v2.3.3259: the Gem Works -- its window has the Enchanter on a second tab (GemWorksPanel) */
  saloon: 'party',              /* the tavern's party panel */
  gambling: 'gambler',
  cookhouse: 'cooking',
  feedseed: 'farm',             /* Feed & Seed: the farm panel */
  landoffice: 'farmhome',       /* Land Office: travel to your own farm */
  bank: 'bank',
  store: 'marketplace',         /* General Store: the market */
  auction: 'auctionhouse',
};

/* ═══ v2.3.3066: THREE OF THE NEW BUILDINGS OPEN ═══
   Asked to "keep going with pragmatic enhancements", the plan's "(new: ...)"
   buildings were looked at for systems the game ALREADY has to put behind
   them -- and three had them, one of which was out of reach altogether:

     guildhall  the clan and guild panels (ui/panels/ClanPanel.jsx,
                GuildPanel.jsx), whole and server-backed, which nothing in
                play opened any more (MenuBar is hidden, and the wheel menu
                that called them was replaced): no clan could be made,
                managed or joined;
     post       your mail -- every delivery the worker settles (a sale, a
                refund, a trade's payout, a reward, and all that came while
                you were away, which drains at your join) -- and messages
                from friends (the Social panel);
     sheriff    a duel (the player list: pick someone, then Duel on their
                card) and the arena's sign-up (the Saloon's panel).

   plot id -> the hall it opens: a `buildingPanel` value of its own, drawn by
   ui/panels/buildings/WheelHallPanel.jsx.  Not TOWN_BUILDINGS entries --
   those are today's town's buildings, and a hall is the Wheel's only. */
export const WHEEL_HALL_DOORS = {
  guildhall: 'guildhall',
  post: 'post',
  sheriff: 'sheriff',
  townhall: 'townhall',     /* v2.3.3258, below */
  hotel: 'hotel',           /* v2.3.3539, below: a rest the worker pays, against a worker that says so (WHEEL_HALL_CAPS) */
};

/* ═══ v2.3.3539: THE HOTEL OPENS ═══
   The owner, 2026-10-21: "I value SIMPLICITY and INTELLIGIBILITY" -- the
   after-review list's fifth item.  The Hotel stood shut because its rest
   would have been the farm bed's, which only the phone believed (it set its
   own bars, which the worker's next echo put back, and a +10% XP the worker
   never paid).  The worker pays a rest now (server/src/rest.js): full health,
   stamina and mana, and Well Rested, +10% of a fight's XP for 30 minutes.
   A hall in this table opens only against a worker that says its cap
   (caps.rest); against one that does not, the door stands shut and says so,
   as the Hotel's always did (game/wheelTownDoors.js). */
export const WHEEL_HALL_CAPS = {
  hotel: 'rest',
};

/* What each hall is called and wears: its window's header and the Enter
   button's picture (icons the clan, guild, mail and duel windows use). */
export const WHEEL_HALLS = {
  guildhall: { title: 'Guild Hall', sub: 'Clans and guilds', icon: '/icons/ui/panel-guild.webp', emoji: '🏰' },
  post: { title: 'Post Office', sub: 'Your mail and messages', icon: '/icons/ui/evt-mail.webp', emoji: '📫' },
  sheriff: { title: "Sheriff's Office", sub: 'Duels and the arena', icon: '/icons/ui/evt-duel.webp', emoji: '⚔️' },
  /* ═══ v2.3.3258: THE TOWN HALL IS A HALL TOO ═══
     The owner sent the picture of its inside (data/buildingRooms.js) and, asked
     what the Town Hall should do, chose "a Town Hall window": your picture on
     top, then two things the game already has, set where the room's own props
     are -- the trophy case is the LEADERBOARD (a ranking for every combat and
     life skill) and the painted map on the wall is the WORLD MAP (the Wheel's
     labelled map, opened from the minimap until now).  Mayor Bro still stands on
     its steps, east of the door; his dialogue window is above the Enter button
     (z 44 against 35), so talking to him is not touched.  The way you arrive is
     108 px south of the door's foot, and the button comes up 140 px from your
     BOOTS (a body's middle is ~52 px above them), so a new character does not
     start with it showing -- it comes as you walk up to the Mayor. */
  /* v2.3.3766: the board of everything to do (ui/panels/buildings/TownBoard.jsx),
     the leaderboard and the world map at its foot */
  townhall: { title: 'Town Hall', sub: 'Everything to do, and where', icon: '/icons/ui/bldg-townhall.webp', emoji: '🏛' },
  /* v2.3.3539: the Hotel, a rest the worker pays (WHEEL_HALL_CAPS above); its
     picture the owner's bed, the right stick's sleep picture at its address
     (ui/panels/controlSkin.jsx), so the browser holds one copy */
  hotel: { title: 'Hotel', sub: 'A bed for the night', icon: '/ui/controls/sleep.webp?v=2.3.3526', emoji: '🛏' },
};

/* The plots with nothing to open: none since v2.3.3539.  The Hotel ("(new:
   rest, respawn)") stood here, shut because its rest was the farm bed's, on
   the phone alone; the worker pays a rest now and the Hotel is a hall
   (WHEEL_HALL_DOORS), shut only against a worker that does not
   (WHEEL_HALL_CAPS) -- stood at, a shut door shows its name and "Shut for
   now" (BroTown.jsx) instead of leaving a player to wonder whether it is
   broken.  (The Town Hall was in no list until v2.3.3258: Mayor Bro stands
   on its steps; it is a hall too.)  Kept, empty, for a plot that may stand
   shut again.  MIRROR: plan.js's own `today` words -- test-world-core checks
   the halls and any shut one are the "(new: ...)" plots and the Town Hall. */
export const WHEEL_SHUT_DOORS = [];

/* Who stands at which door, besides Mayor Bro (who has the Town Hall's steps,
   placing.js mayorSpot): `dx`, `dy` game px from the door's foot (+x east, +y
   south, in front of the porch).  Diego keeps the General Store's counter,
   WEST of its steps -- the east end has its barrel, the west its crate, and
   the steps (~70 px a side) stay clear -- far enough that standing at the
   door does not open his shop on its own (it opens within 90 px of HIM, from
   your middle), near enough to be the store's man.  He stands still here:
   a walker in town, but only his south strip is loaded (npcSprites.js
   wheelWalkSources).  mp-wheeldoors checks the clearances. */
export const WHEEL_TOWNSFOLK = [
  { name: 'Diego', door: 'store', dx: -105, dy: 34 },
  /* ═══ v2.3.3067: THE REST OF TOWN'S CAST ═══
     Asked to "keep going with pragmatic enhancements": the three townsfolk
     v2.3.3032 left in today's town, which nobody walks any more -- and one of
     them was a game.  Ace's coin flip (v2.3.2618, the owner's "triple your
     money or lose 3x") opens only on a TAP ON ACE (BroTown.jsx tapNpcAtCss,
     `flip`), so since the Wheel became the world it could not be played at
     all.  The worker's flip asks nothing about where you are (gamble.js
     _handleAceFlipRequest), so he only had to stand somewhere.

     Ace: beside the Gambling Den, WEST of its steps, where Diego stands at
          the store -- the den's barrel and trough are on its east;
     Blacksmith Bro: EAST of the forge's steps (a barrel west, a crate east,
          each 193 px out) -- scenery with a hammer, as in today's town
          (since v2.3.3258 he opens the forge: WHEEL_KEEPERS, below);
     Lil Bro: on the square, 260 px WEST of where you arrive (the Town Hall's
          door + (0, 108)), on the side away from Mayor Bro, so a new player
          meets him, as in today's town: 282 px from the hall's door (the
          nearest), 410 from the Mayor, 110 clear of any footprint.
     All stand still and face the street (their one strip loaded, south);
     none opens anything by proximity (only Diego has a proximity window,
     and only a tap opens Ace's flip).  test-world-core checks each spot's
     ground; mp-wheelfolk walks to them on a phone. */
  { name: 'Ace', door: 'gambling', dx: -105, dy: 34 },
  { name: 'Blacksmith Bro', door: 'blacksmith', dx: 105, dy: 34 },
  { name: 'Lil Bro', door: 'townhall', dx: -260, dy: 110 },
  /* ═══ v2.3.3121: BEASTMASTER BRO, EAST OF THE WOODWORKER'S STEPS ═══
     docs/PET-TRAPPING-PLAN.md, Phase 2: "A Beastmaster beside the Woodworker"
     -- where the box traps his first quest asks for are made.  EAST, as the
     blacksmith stands at the forge: the Woodworker's crate is 193 px west of
     its steps and its barrel 197 px east, and the Snowling drawn at his side
     (tools/make_beastmaster.py) stands ~24 px east of him, clear of both and
     of the steps.  From the door's foot he is 110 px; from a player standing
     at the door 119 px, past the 90 px his quest opens at by itself.  Only
     against a worker that knows his quests (caps.beastmaster; BroTown.jsx
     _spawnWheelNpcs). */
  /* v2.3.3599: 130 px either side of the steps and 46 further south, 260 apart (were 105
     and 210, the crate and barrel blocking wider;
     the owner: "more distance between them"). */
  { name: 'Beastmaster Bro', door: 'woodworker', dx: 130, dy: 80, cap: 'beastmaster' },
  /* ═══ v2.3.3525: THE TOUR'S TWO NEW GIVERS ═══
     Woodworker Bro WEST of his own steps (the Beastmaster has the east, his
     Snowling beside him; the bench's crate is 193 px west, so -105 is clear
     of it and of the steps), and Farmer Bro by the Feed & Seed's, each the
     keeper of his building (WHEEL_KEEPERS below).  Only against a worker that
     knows the tour (caps.tour).  The two at the Woodworker are 210 px apart
     (a tap finds one within 44 CSS px, ~73 world px at the Wheel's zoom), and
     a player at the door is ~119 px from each, past the 90 a quest opens at
     by itself.  test-world-core checks each spot's ground. */
  { name: 'Woodworker Bro', door: 'woodworker', dx: -130, dy: 80, cap: 'tour' },
  { name: 'Farmer Bro', door: 'feedseed', dx: -105, dy: 34, cap: 'tour' },  /* ═══ v2.3.3833: THE NEW CAST (docs/specs/npc-cast.md) ═══
     The owner: "Keep all as you have them for now (NPCs)".  A keeper at each
     of the ten doors that had nobody, WEST of its steps as Diego and Ace
     stand (-105; the Post Office's and the Guild Hall's porches reach further
     south, so their two stand 40 px nearer the wall, clear of the props
     either side).  Each is the keeper of his building (WHEEL_KEEPERS below).
     The three locals: Bean on the square, EAST of where you arrive (Lil Bro
     has the west); Old Man Reel at the town's south-west edge, past the
     store (the plan: "no pond in the town", and a townsperson stands on
     the town's ground, so he stands at its rim -- beside the river that runs
     along it there);
     Tourist Terry on the square below the Town Hall's steps, where P5's
     walking will start him off (below the Bank he stood behind its belt of
     trees, only his head showing: mp-npccast's picture).  Every spot is checked by test-world-core: town ground,
     24 px clear of any footprint, within 160 px of his own door and clear
     of its steps, 200+ px from any other townsperson. */
  { name: 'Sterling', door: 'bank', dx: -105, dy: 100 },
  { name: 'Slim', door: 'saloon', dx: -105, dy: 100 },
  { name: 'Chef Blaze', door: 'cookhouse', dx: -105, dy: 100 },
  { name: 'Glint', door: 'gemcutter', dx: -105, dy: 100 },
  { name: 'Postmaster Pete', door: 'post', dx: -105, dy: 60 },
  { name: 'Deed Dave', door: 'landoffice', dx: -105, dy: 100 },
  { name: 'Benny', door: 'hotel', dx: -105, dy: 100 },
  { name: 'Guildmaster Gary', door: 'guildhall', dx: -105, dy: 60 },
  { name: 'Sheriff Buck', door: 'sheriff', dx: -105, dy: 100 },
  { name: 'Gavel Greg', door: 'auction', dx: -105, dy: 100 },
  { name: 'Bean', door: 'townhall', dx: 320, dy: 180 },
  { name: 'Old Man Reel', door: 'store', dx: -300, dy: 200 },
  { name: 'Tourist Terry', door: 'townhall', dx: 60, dy: 400 },
];

/* ═══ v2.3.3258: THE KEEPERS -- TALK TO HIM, AND HIS BUILDING OPENS ═══
   The owner, asked whether players should walk into the buildings, see a
   still picture of a shopkeeper or meet the shopkeeper outside: "Yes I like
   your idea of interacting with the building's NPC instead of having the
   building interiors.  Have it open up as backgrounds behind the different
   buildings menus instead of literally going into a building".
   Townsperson NAME -> the plot whose window he opens when you talk to him (a
   tap, E or the right stick's tap): the same window, the same visit counted,
   as its door (game/interactions.js enterWheelDoor), with the room's picture
   behind its menu (BuildingRoom.jsx).  A quest of his comes first: Mayor Bro
   opens the Town Hall only when he has nothing to offer, ask about or pay
   for.  Only the keepers whose picture exists: the other buildings keep their
   door until the owner's keeper is made (docs/ART-WISHLIST.md "The keepers"),
   and then a keeper is a row here and in WHEEL_TOWNSFOLK.  Diego (his shop)
   and Ace (his coin flip) keep their own windows.  Each door still opens too.
   MIRROR: every value is a plot of the town -- test-world-core checks it. */
export const WHEEL_KEEPERS = {
  'Blacksmith Bro': 'blacksmith',   /* the forge, at whose steps he stands */
  'Mayor Bro': 'townhall',          /* the Town Hall: its leaderboard and the world map */
  'Woodworker Bro': 'woodworker',   /* v2.3.3525: the bench (bows, staffs, traps, hardened wood) */
  'Farmer Bro': 'feedseed',         /* v2.3.3525: the Feed & Seed (seeds, your farm, the orders) */  /* v2.3.3833: the new cast's ten keepers (docs/specs/npc-cast.md) */
  'Sterling': 'bank',
  'Slim': 'saloon',
  'Chef Blaze': 'cookhouse',
  'Glint': 'gemcutter',
  'Postmaster Pete': 'post',
  'Deed Dave': 'landoffice',
  'Benny': 'hotel',
  'Guildmaster Gary': 'guildhall',
  'Sheriff Buck': 'sheriff',
  'Gavel Greg': 'auction',
};

/* ═══ v2.3.3522: EACH BUILDING'S PICTURE, ON THE MAPS ═══
   The owner, playtesting: "Have icons representing each building on each
   building in the minimap/compass."  Plot id -> the picture the minimap draws
   on the building's footprint (wheelMinimap.js _buildTown) and the world map
   at its door up close (WorldMapOverlay.jsx) -- the very pictures its Enter
   button wears (TOWN_BUILDINGS' iconSrc, the halls' WHEEL_HALLS icon), the
   same files and addresses, so the browser holds one copy of each:
     the forge an anvil, the Woodworker a saw, the Gem Works a gem grinder,
     the Saloon a mug, the Gambling Den dice, the Cookhouse a pot, the Feed &
     Seed a barn, the Bank a vault, the General Store (its market) scales, the
     Auction House a stall; the halls: the Town Hall's bell tower, the Guild
     Hall's banner, the Post Office's envelope, the Sheriff's crossed swords.
   Two plots had no picture of their own:
     landoffice  its Enter button wore the Feed & Seed's barn (today's town's
                 "YOUR FARM", the same family), which would put two barns on
                 the map; the Land Office deals in deeds and maps, so it wears
                 the game's parchment map (/icons/ui/map.webp) -- on its Enter
                 button too (BroTown.jsx reads this table at a Wheel door);
     hotel       the owner's bed (the right stick's sleep picture), drawn
                 grey while it is shut (v2.3.3539: a hall against a worker
                 that rests, WHEEL_HALL_CAPS; at the right stick's address).
   No imports (test-world-core reads it): it checks every plot of the town has
   one, a file in public/, no two buildings sharing one. */
/* ═══ v2.3.3678: FOUR PICTURES THAT SAY WHAT THE BUILDING IS ═══
   The owner, of the minimap's town: "I also want to double check all the
   icons because not all of them make sense".  Checked one by one at the 20 px
   the minimap draws them; four changed, each to a picture the game already
   has (nothing new loaded):
     gemcutter   a grinding wheel, a muddle at 20 px -> the Gem Cutting skill's
                 gem and chisel (the Life Skills page's, at its address);
     feedseed    a red barn, which says "farm", not a seed shop -> the sprout in
                 its soil its own window wears (FeedSeedPanel, its address);
     landoffice  a MAP -- on the minimap, a map read as "open the world map" --
                 -> the red barn, its own window's picture (LandOfficePanel):
                 the Land Office is the way to your farm, and the barn is free
                 now the Feed & Seed wears its sprout (v2.3.3522 gave it the map
                 only so no two buildings shared one);
     store       the balance scales, which read as a court -> the shop's awning
                 and coin (the old shop panel's picture), the General Store.
   The other twelve say what they are (an anvil, a saw, crossed swords for the
   Sheriff's duels and arena, a mug, dice, a bed, a letter, a pot, a banner, a
   vault, a gavel, the Town Hall's bell).  The Enter button wears the same
   picture (BroTown's door button reads this table). */
export const WHEEL_BUILDING_ICONS = {
  townhall: '/icons/ui/bldg-townhall.webp',
  blacksmith: '/icons/ui/bldg-forge.webp?v=2.3.1224',
  woodworker: '/icons/ui/bldg-woodwork.webp?v=2.3.1224',
  gemcutter: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',
  sheriff: '/icons/ui/evt-duel.webp',
  saloon: '/icons/ui/bldg-tavern.webp?v=2.3.1224',
  gambling: '/icons/ui/bldg-gamble.webp?v=2.3.1224',
  hotel: '/ui/controls/sleep.webp?v=2.3.3526',   /* v2.3.3539: the right stick's address, so one copy (was ?v=2.3.3279, the picture before v2.3.3526) */
  post: '/icons/ui/evt-mail.webp',
  cookhouse: '/icons/ui/bldg-cook.webp?v=2.3.1224',
  feedseed: '/icons/ui/skill-farming.webp?v=2.3.1224',
  landoffice: '/icons/ui/bldg-farm.webp?v=2.3.1224',
  guildhall: '/icons/ui/panel-guild.webp',
  bank: '/icons/ui/bldg-bank.webp?v=2.3.1224',
  store: '/icons/ui/panel-shop.webp',
  /* v2.3.3546: the owner's gavel, as its Enter button wears (buildings.js
     auctionhouse, v2.3.3526: "Sheet's is clearer" -- the market stall
     "could have been any shop"); the maps kept the stall, two pictures for
     one building and two copies held.  test-world-core asks the two match. */
  auction: '/icons/ui/bldg-auction-gavel.webp?v=2.3.3526',
};
/** The picture for a plot id, or null (a plot the table does not know). */
export function wheelBuildingIcon(plot) {
  return typeof plot === 'string' && Object.prototype.hasOwnProperty.call(WHEEL_BUILDING_ICONS, plot)
    ? WHEEL_BUILDING_ICONS[plot] : null;
}
