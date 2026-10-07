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
 * a player to wonder whether the door is broken.
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
  gemcutter: 'gemcutter',
  saloon: 'party',              /* the tavern's party panel */
  gambling: 'gambler',
  cookhouse: 'cooking',
  feedseed: 'farm',             /* Feed & Seed: the farm panel */
  landoffice: 'farmhome',       /* Land Office: travel to your own farm */
  bank: 'bank',
  assay: 'enchanting',          /* Assay Office: the enchanter */
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
};

/* What each hall is called and wears: its window's header and the Enter
   button's picture (icons the clan, guild, mail and duel windows use). */
export const WHEEL_HALLS = {
  guildhall: { title: 'Guild Hall', sub: 'Clans and guilds', icon: '/icons/ui/panel-guild.webp', emoji: '🏰' },
  post: { title: 'Post Office', sub: 'Your mail and messages', icon: '/icons/ui/evt-mail.webp', emoji: '📫' },
  sheriff: { title: "Sheriff's Office", sub: 'Duels and the arena', icon: '/icons/ui/evt-duel.webp', emoji: '⚔️' },
};

/* The plot with nothing to open yet: the Hotel ("(new: rest, respawn)") --
   its rest is the farm bed's, on this device only (no message, nothing the
   worker settles: the HP it restores is the worker's to give), so it stays
   shut until the worker can pay it.  Stood at, it shows its name and "Shut
   for now" (BroTown.jsx) instead of leaving a player to wonder whether the
   door is broken.  The Town Hall is in no list: Mayor Bro stands on its
   steps.  MIRROR: plan.js's own `today` words -- test-world-core checks the
   halls and the shut ones are the four "(new: ...)" plots. */
export const WHEEL_SHUT_DOORS = ['hotel'];

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
          each 193 px out) -- scenery with a hammer, as in today's town;
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
  { name: 'Beastmaster Bro', door: 'woodworker', dx: 105, dy: 34, cap: 'beastmaster' },
];
