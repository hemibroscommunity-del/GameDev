/* ═══ v2.3.6869: THE NEW MENUS' SETTINGS -- THE RAIL OF FIVE, AND WHERE EVERYTHING WENT (card MN step 12) ═══
 *
 * The owner's decided 9 (docs/design/menus3/DECISIONS.md): "The wireframe's
 * rail of five (Sound, Screen, Alerts, Account, Help). Log out lives in
 * Account."  The placement map (SPEC.md, "The Game Itself") says what goes
 * in each:
 *   Sound    mute, music, effects;
 *   Screen   the landscape menu side, full screen, replay the controls
 *            lesson (and, only where today's page shows them, the quest
 *            path's look and the debug overlay);
 *   Alerts   silence the alerts, show the play-screen chat feed (and the
 *            chat and news lines the Notifications page held);
 *   Account  the Login Key, Log out / switch bro, continue another
 *            character, Restart character;
 *   Help     Feedback, About (privacy, rules, credits, smoothness reports).
 *
 * NOTHING LOST.  `SETTINGS_TODAY` names every control and door of today's
 * Settings hub's five pages (src/game/dashDests.js DASH_HUBS.settingsHub:
 * settings, notifications, account, feedback, about) and the row of the new
 * rail that holds it; the suite fails a row with no home.  A row that opens
 * a whole page of today's (Feedback, About, the news lines) opens THAT page
 * (Settings may only open what today's Settings opens), its Back the panel
 * again on the same rail (menus3Wire.js menus3Away).
 *
 * The rows a device or a switch hides today stay hidden the same way
 * (`settingsRows` ctx): Play full screen only in iPhone Safari's browser,
 * the quest path only with `?questpath` (questTrailStyle.js GROUND_PATH),
 * the debug overlay only with `?dev=1`.  No imports: node's suite reads it
 * (server/test/menus3-settings.test.mjs). */

export const SETTINGS_RAIL = Object.freeze(['sound', 'screen', 'alerts', 'account', 'help']);

/* each rail's rows, top to bottom */
export const SETTINGS_ROWS = Object.freeze({
  sound: Object.freeze(['audio', 'music', 'effects']),
  screen: Object.freeze(['menuSide', 'fullScreen', 'controls', 'questPath', 'debug']),
  alerts: Object.freeze(['silence', 'onScreen', 'news']),
  account: Object.freeze(['account', 'restart']),
  help: Object.freeze(['feedback', 'about']),
});

/* rows a device or a switch shows (today's page's own tests, the same) */
const ROW_IF = Object.freeze({
  fullScreen: 'iosBrowser',
  questPath: 'groundPath',
  debug: 'dev',
});

/* every control and door of today's five pages -> its row here */
export const SETTINGS_TODAY = Object.freeze({
  'settings.audio': 'audio',
  'settings.music': 'music',
  'settings.effects': 'effects',
  'settings.debug': 'debug',
  'settings.questPath': 'questPath',
  'settings.menuSide': 'menuSide',
  'settings.notifSilence': 'silence',
  'settings.loginKey': 'account',      /* the Login Key row opened Account: its page is the rail's Account */
  'settings.controls': 'controls',
  'settings.fullScreen': 'fullScreen',
  'settings.feedback': 'feedback',
  'settings.about': 'about',
  'settings.restart': 'restart',
  'notifications.onScreen': 'onScreen',
  'notifications.lines': 'news',
  'account.leave': 'account',          /* Log out / Switch Bro, today's door and its confirm */
  'account.key': 'account',            /* the Login Key card */
  'account.login': 'account',          /* continue another character with its key */
  'feedback.page': 'feedback',
  'about.page': 'about',
});

/* a row that opens one of today's pages, and which */
export const SETTINGS_PAGES = Object.freeze({
  news: 'notifications',
  feedback: 'feedback',
  about: 'about',
});

/** The rail a page asks for, or the first (Sound): what the gear always opens. */
export function settingsRailId(id) {
  return SETTINGS_RAIL.indexOf(id) >= 0 ? id : SETTINGS_RAIL[0];
}

/** The rows a rail shows on this device: `ctx` { iosBrowser, groundPath, dev }. */
export function settingsRows(rail, ctx) {
  const c = ctx || {};
  const rows = SETTINGS_ROWS[settingsRailId(rail)];
  return rows.filter((r) => !Object.prototype.hasOwnProperty.call(ROW_IF, r) || !!c[ROW_IF[r]]);
}

/** The rail that holds a row (every row has one). */
export function settingsRailOf(row) {
  for (const r of SETTINGS_RAIL) if (SETTINGS_ROWS[r].indexOf(row) >= 0) return r;
  return null;
}
