/* ═══ v2.3.6681: THE DASHBOARD'S DESTINATIONS (card UI2-frame, the build's step 2) ═══
 *
 * One table: the Menu's eight doors (the specification's 4 x 2 directory,
 * "an equal-weight directory, not a prioritized list"), the small hubs two of
 * them open, and the page each door reaches.  Later steps add rows here; the
 * frame (src/ui/mobile/dash/MenuGrid.jsx, DashHeader.jsx) and the way round
 * (src/game/dashNav.js) read it.
 *
 * Each picture is the one the game's door has today (the master notes, part
 * 4, "Pictures, by door"); each word is a key of src/data/say/dashFrame.js.
 * A row:
 *   id    the door's own id (a QA handle: data-dest);
 *   word  its say key;
 *   art   its picture (public/);
 *   page  the page it opens (BottomDashboard's PANELS, or the frame's own:
 *         'homestead', 'socialHub', 'settingsHub');
 *   opens instead of a page: 'worldMap', the World map over the game (More's
 *         Map tile, the minimap and M already open it);
 *   key   a computer's letter (src/game/deskKeys.js NAV_KEYS), worn by the tile.
 *
 * EVERY PAGE MORE REACHED IS REACHED (the card's reading 4; More's fifteen,
 * dash/MorePanel.jsx TILES): Quests, Codex, Map and Settings are doors here;
 * Life Skills, Achievements and Pets are Bro's own doors, as today; Social,
 * Party and Guilds are the Social hub's; Settings, Account, Notifications,
 * Feedback and About the Settings hub's; Journey (lifetime records) is a door
 * of Bro's Character page, the passport (v2.3.6684: it left the Settings hub).
 *
 * NO IMPORTS: node reads it (tools/guards/dash-nav.test.mjs). */

export const MENU_DESTS = Object.freeze([
  Object.freeze({ id: 'hero', word: 'dashFrame.bro', art: '/icons/ui/panel-self.webp', page: 'hero', key: 'P' }),
  Object.freeze({ id: 'quests', word: 'dashFrame.quests', art: '/icons/ui/panel-quests.webp', page: 'quests', key: 'J' }),
  Object.freeze({ id: 'social', word: 'dashFrame.social', art: '/icons/ui/nav-friends.webp', page: 'socialHub' }),
  Object.freeze({ id: 'leaderboard', word: 'dashFrame.ranks', art: '/icons/ui/panel-leaderboard.webp', page: 'leaderboard', key: 'U' }),
  Object.freeze({ id: 'encyclopedia', word: 'dashFrame.codex', art: '/icons/ui/panel-encyclopedia.webp', page: 'encyclopedia', key: 'K' }),
  Object.freeze({ id: 'homestead', word: 'dashFrame.homestead', art: '/icons/ui/bldg-farm.webp', page: 'homestead' }),
  Object.freeze({ id: 'map', word: 'dashFrame.map', art: '/icons/ui/nav-map.webp', opens: 'worldMap', key: 'M' }),
  Object.freeze({ id: 'settings', word: 'dashFrame.settings', art: '/icons/ui/panel-settings.webp', page: 'settingsHub' }),
]);

/** The small hubs: equal tiles, each today's page.  `art: null` is a door with
    no picture of its own yet (Notifications, About: the master notes' part 4,
    "What is missing"). */
export const DASH_HUBS = Object.freeze({
  socialHub: Object.freeze([
    Object.freeze({ id: 'social', word: 'dashFrame.friends', art: '/icons/ui/nav-friends.webp', page: 'social' }),
    Object.freeze({ id: 'clan', word: 'dashFrame.party', wordClan: 'dashFrame.clan', art: '/icons/ui/panel-clan.webp', page: 'clan' }),
    Object.freeze({ id: 'guild', word: 'dashFrame.guilds', art: '/icons/ui/panel-guild.webp', page: 'guild' }),
  ]),
  settingsHub: Object.freeze([
    Object.freeze({ id: 'settings', word: 'dashFrame.settings', art: '/icons/ui/panel-settings.webp', page: 'settings' }),
    Object.freeze({ id: 'notifications', word: 'dashFrame.notifications', art: null, page: 'notifications' }),
    Object.freeze({ id: 'account', word: 'dashFrame.account', art: '/icons/ui/panel-account.webp', page: 'account' }),
    Object.freeze({ id: 'feedback', word: 'dashFrame.feedback', art: '/icons/ui/panel-feedback.webp', page: 'feedback' }),
    Object.freeze({ id: 'about', word: 'dashFrame.about', art: null, page: 'about' }),
  ]),
});

/** The frame's own pages' titles (the header's word for each). */
export const FRAME_PAGES = Object.freeze({
  homestead: 'dashFrame.homestead',
  socialHub: 'dashFrame.social',
  settingsHub: 'dashFrame.settings',
  /* v2.3.6683 (card UI2-bro): Bro's Character and Combat doors (src/game/broHub.js
     BRO_HUB_PAGES): today's pages under the header until their own steps */
  broCharacter: 'dashFrame.character',
  broCombat: 'dashFrame.combat',
  broTitles: 'dashFrame.titles',   /* v2.3.6684: the passport's Titles door (the title's Equip) */
  /* v2.3.6685 (card UI2-combat): a weapon's page under Combat's hub; Back returns to the hub */
  broSword: 'dashFrame.sword',
  broBow: 'dashFrame.bow',
  broStaff: 'dashFrame.staff',
  /* v2.3.6686 (card UI2-combat PR 2): the Shared page under the hub; the stat tree's layers, one a
     depth (src/game/combatHub.js TREE_PAGES), each titled DPS: Back returns layer by layer */
  broShared: 'dashFrame.sharedAttributes',
  broEquip: 'dashFrame.equipment',   /* v2.3.6689 (card UI2-gear PR 3): Bro's Equipment showcase; Back returns to Bro */
  broTree0: 'dashFrame.dps', broTree1: 'dashFrame.dps', broTree2: 'dashFrame.dps', broTree3: 'dashFrame.dps',
  broTree4: 'dashFrame.dps', broTree5: 'dashFrame.dps', broTree6: 'dashFrame.dps',
  /* v2.3.6691 (card UI2-quests): the Quests pages beside a quest's own (src/game/questPages.js
     QUEST_FRAME_PAGES): a quest's Rewards, and the landing's Daily, Completed and On offer doors */
  questRewards: 'dashFrame.questRewards',
  questsDaily: 'dashFrame.questsDaily',
  questsDone: 'dashFrame.questsDone',
  questsOffers: 'dashFrame.questsOffers',
});

/** More's fifteen (dash/MorePanel.jsx TILES) and the road each takes now:
    'menu:<door>', 'hub:<hub>' or 'bro' (one of Bro's own doors). */
export const MORE_ROADS = Object.freeze({
  quests: 'menu:quests',
  skills: 'bro',
  journey: 'bro:character',   /* v2.3.6684: the passport's Journey door (it left the Settings hub) */
  achievements: 'bro',
  encyclopedia: 'menu:encyclopedia',
  pets: 'bro',
  social: 'hub:socialHub',
  clan: 'hub:socialHub',
  guild: 'hub:socialHub',
  settings: 'hub:settingsHub',
  account: 'hub:settingsHub',
  map: 'menu:map',
  notifications: 'hub:settingsHub',
  feedback: 'hub:settingsHub',
  about: 'hub:settingsHub',
});

/** The door of the Menu (or of a hub) whose page this is, or null. */
export function destOfPage(page) {
  const p = String(page || '');
  for (const d of MENU_DESTS) if (d.page === p) return d;
  for (const h of Object.keys(DASH_HUBS)) for (const d of DASH_HUBS[h]) if (d.page === p) return d;
  return null;
}

/** The Menu's grid: four across and two down upright and on a computer; one
    row of eight sideways (82 px of page: the master notes' part 3). */
export function menuGridShape(n, sideways) {
  const count = Math.max(1, n | 0);
  if (sideways) return { cols: count, rows: 1 };
  if (count <= 4) return { cols: count, rows: 1 };
  if (count <= 6) return { cols: 3, rows: 2 };
  return { cols: Math.ceil(count / 2), rows: 2 };
}

/** The doors' marks (BottomDashboard's `dots`, the old row's badges, on the
    doors that lead to them now): points to spend glow on Bro's tile and climb
    to the Menu button as a count (the audit's part 2, BUILD 6); a ready quest
    on Quests; the codex's new pages on Codex; requests on Social; the bell's
    unread on Settings and its Notifications; anything else waiting a dot on
    the Menu. */
export function frameMarks(dots, pts, skillsNew) {
  const d = dots || {};
  const p = Number(pts) > 0 ? Number(pts) : 0;
  const soc = typeof d.social === 'number' ? d.social : 0;
  const bell = typeof d.more === 'number' ? d.more : (d.more ? 1 : 0);
  const codex = Number(d.encyclopedia) > 0 ? Number(d.encyclopedia) : 0;
  const other = !!d.quests || !!skillsNew || codex > 0 || soc > 0 || bell > 0;
  return {
    doors: {
      hero: { count: p, glow: p > 0, dot: !p && !!skillsNew },
      quests: { dot: !!d.quests },
      encyclopedia: { count: codex },
      social: { count: soc },
      settings: { count: bell },
      notifications: { count: bell },
    },
    menu: { count: p, glow: p > 0, dot: !p && other },
  };
}
