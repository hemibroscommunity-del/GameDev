/* ═══ v2.3.6860: THE NEW MENUS' ROUTER -- EVERY ENTRY, AND WHERE IT ALWAYS OPENS (card MN step 1) ═══
 *
 * The owner's rule 1 (docs/design/menus3/SPEC.md, "Deterministic Entry
 * Points"): every dock button and HUD shortcut ALWAYS opens the same place,
 * never "where you left it".  The three menus: Bro (Bag, Power, Skills),
 * World (Quests, Codex, Feats), People (Roster, Chat, Ranks); the Map from
 * the minimap; Settings from the gear.  Each dock button opens its FIRST
 * section; a press of the button whose menu is showing closes it (the
 * wireframe's dock()).
 *
 * THE ROAD.  Until a section is rebuilt (the card's steps 4 to 12) its entry
 * opens TODAY's screen in TODAY's window -- never an old screen squeezed into
 * the new panel -- so `today` names that road: a dashboard page by its id
 * (src/ui/mobile/BottomDashboard.jsx PANELS, src/game/dashDests.js
 * FRAME_PAGES), the bag (Gear's root), the world map, the chat box, the
 * weapon in hand's page.  `built` lists the sections whose new page exists:
 * none in step 1, so every entry goes the old road and nothing a player could
 * reach yesterday is lost (the Menu's eight doors stay inside the band).
 *
 * THE KEYS (the owner's list).  A key the game already gives to something
 * else is NOT taken (card MN: "a flag, not a change"): F is the Element
 * Burst (desktopControls.js, with G), R is Whirlwind.  The others are the
 * band's own keys today (deskKeys.js NAV_KEYS, MAP_KEY; C opens the chat box,
 * B the emotes), so step 1 adds no key.  No imports: node's suite reads it. */

export const MENUS3 = Object.freeze({
  bro: Object.freeze(['bag', 'power', 'skills']),
  world: Object.freeze(['quests', 'codex', 'feats']),
  people: Object.freeze(['roster', 'chat', 'ranks']),
});
export const MENUS3_DOCK = Object.freeze(['bro', 'world', 'people']);

/* Today's road for every section and overlay (step 1). */
export const MENUS3_TODAY = Object.freeze({
  bag: Object.freeze({ road: 'gear' }),
  power: Object.freeze({ road: 'page', page: 'hero' }),
  skills: Object.freeze({ road: 'page', page: 'skills' }),
  quests: Object.freeze({ road: 'page', page: 'quests' }),
  codex: Object.freeze({ road: 'page', page: 'encyclopedia' }),
  feats: Object.freeze({ road: 'page', page: 'achievements' }),
  roster: Object.freeze({ road: 'page', page: 'socialHub' }),
  chat: Object.freeze({ road: 'chat' }),
  ranks: Object.freeze({ road: 'page', page: 'leaderboard' }),
  map: Object.freeze({ road: 'map' }),
  settings: Object.freeze({ road: 'page', page: 'settingsHub' }),
});

/* v2.3.6861 (card MN step 4): the sections whose new page exists, the page's
   `ctx.built` (menus3Wire.js menus3Go): the Bag first.  Power and Skills,
   tabs of the same panel, still open today's screens until their steps.
   v2.3.6863 (card MN step 7): + World's Quests (Codex and Feats still today's).
   v2.3.6864 (card MN step 10): + People's Roster (Chat and Ranks still today's). */
export const MENUS3_BUILT = Object.freeze(['bag',
  'quests',
  'power',   /* v2.3.6862 (card MN step 5): + Power */
  'settings',   /* v2.3.6869 (card MN step 12): + Settings, from the gear (no menu of the dock's) */
  'roster',
]);

/* Every entry: the dock's three, the five shortcuts on the play screen. */
export const MENUS3_ENTRIES = Object.freeze({
  'dock.bro': Object.freeze({ menu: 'bro', section: 'bag' }),
  'dock.world': Object.freeze({ menu: 'world', section: 'quests' }),
  'dock.people': Object.freeze({ menu: 'people', section: 'roster' }),
  'hud.face': Object.freeze({ menu: 'bro', section: 'power' }),
  'hud.weaponBar': Object.freeze({ menu: 'bro', section: 'power', lane: 'held' }),
  'hud.minimap': Object.freeze({ menu: null, section: 'map' }),
  'hud.gear': Object.freeze({ menu: null, section: 'settings' }),
  'hud.questLine': Object.freeze({ menu: 'world', section: 'quests', quest: 'line' }),
  'hud.chatLines': Object.freeze({ menu: 'people', section: 'chat' }),
  /* v2.3.6864 (card MN step 10): the party chip (SPEC "HUD party chip opens it"), and every door
     that opened the old top-left player list (the Saloon's "Invite a player", the Sheriff's "Duel a
     player", the Party page's button: BroTown's playersOpen) -- People · Roster on Nearby */
  'hud.partyChip': Object.freeze({ menu: 'people', section: 'roster' }),
  'game.players': Object.freeze({ menu: 'people', section: 'roster', seg: 'nearby' }),
});

/* The owner's keys: what each opens, and whether the game already uses it. */
export const MENUS3_KEYS = Object.freeze({
  I: Object.freeze({ section: 'bag', today: 'dashboard' }),
  P: Object.freeze({ section: 'power', today: 'hero' }),
  L: Object.freeze({ section: 'skills', today: 'skills' }),
  J: Object.freeze({ section: 'quests', today: 'quests' }),
  M: Object.freeze({ section: 'map', today: 'map' }),
  K: Object.freeze({ section: 'codex', today: 'encyclopedia' }),
  F: Object.freeze({ section: 'feats', taken: 'the Element Burst (desktopControls.js, F or G)' }),
  R: Object.freeze({ section: 'roster', taken: 'Whirlwind (desktopControls.js)' }),
  U: Object.freeze({ section: 'ranks', today: 'leaderboard' }),
  C: Object.freeze({ section: 'chat', today: 'chat' }),
  B: Object.freeze({ section: 'emotes', today: 'emotes' }),
});

/* The weapon in hand's page under today's Bro (src/game/dashDests.js FRAME_PAGES) */
const WEAPON_PAGE = Object.freeze({ melee: 'broSword', sword: 'broSword', ranged: 'broBow', bow: 'broBow', staff: 'broStaff' });
/* v2.3.6862: ...and its lane in the new Power (src/game/menus3Power.js POWER_LANES) */
const WEAPON_LANE = Object.freeze({ melee: 'sword', sword: 'sword', ranged: 'bow', bow: 'bow', staff: 'staff' });

/** Where an entry opens: { entry, menu, section, road, page?, built }, or
 *  null for an id that is no entry.  `ctx.held` the weapon in hand (melee,
 *  ranged, staff); `ctx.built` the sections rebuilt so far (a Set or array). */
export function menus3Route(entry, ctx) {
  const e = typeof entry === 'string' && Object.prototype.hasOwnProperty.call(MENUS3_ENTRIES, entry) ? MENUS3_ENTRIES[entry] : null;
  if (!e) return null;
  const c = ctx || {};
  const built = c.built ? (Array.isArray(c.built) ? c.built.indexOf(e.section) >= 0 : !!(c.built.has && c.built.has(e.section))) : false;
  if (built) {
    const o = { entry, menu: e.menu, section: e.section, road: 'panel', built: true };
    /* v2.3.6862 (card MN step 5): the weapon bar opens Power on the weapon in hand's lane (decided 3) */
    if (e.lane === 'held') o.lane = Object.prototype.hasOwnProperty.call(WEAPON_LANE, c.held) ? WEAPON_LANE[c.held] : 'sword';
    if (e.seg) o.seg = e.seg;   /* v2.3.6864 (card MN step 10): the Roster's segment an entry names */
    return o;
  }
  const t = MENUS3_TODAY[e.section];
  const out = { entry, menu: e.menu, section: e.section, road: t.road, built: false };
  if (t.page) out.page = t.page;
  if (e.lane === 'held') {
    const p = WEAPON_PAGE[c.held];
    if (p) { out.road = 'weapon'; out.page = p; }
  }
  if (e.quest) out.road = 'quest';
  return out;
}

/** A dock button's press: 'open' its menu's first section, or 'close' when
 *  that menu is the one showing.  `showing` the menu open now (or null). */
export function menus3DockPress(id, showing) {
  if (MENUS3_DOCK.indexOf(id) < 0) return null;
  return showing === id ? 'close' : 'open';
}

/** Which menu a page of today's dashboard belongs to (the dock's lit
 *  button), or null.  Gear's root is the Bag. */
export function menus3MenuOf(pageId) {
  if (pageId == null || pageId === 'gear' || pageId === 'dashboard' || pageId === 'bag') return 'bro';
  for (const s of Object.keys(MENUS3_TODAY)) {
    const t = MENUS3_TODAY[s];
    if (t.page === pageId) {
      for (const m of MENUS3_DOCK) if (MENUS3[m].indexOf(s) >= 0) return m;
    }
  }
  return null;
}
