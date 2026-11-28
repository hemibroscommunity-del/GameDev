/* ═══ v2.3.6869: SETTINGS' RULES (card MN step 12; src/game/menus3Settings.js) ═══
 *
 * The owner's Settings in the new panel, the rail of five, its rules played
 * on the module itself.  This suite imports nothing from server/src: it tests
 * the page's own rules (as menus3-quests.test does) and does not deploy.
 *
 *   1. THE RAIL: Sound, Screen, Alerts, Account, Help in the owner's order;
 *      a forged rail (or none) is Sound, what the gear always opens;
 *   2. NOTHING LOST: every row of today's Settings page (read from
 *      SettingsPanel.jsx's own words, so a row added there without a home
 *      fails here) and every page of today's Settings hub (dashDests.js) has
 *      a row of the rail; the pages a row opens are today's hub's pages and
 *      nothing else (Settings opens only what today's opens); Log out is in
 *      Account;
 *   3. THE DEVICE: Play full screen only in iPhone Safari's browser, the
 *      quest path only with ?questpath, the debug overlay only with ?dev=1,
 *      as today's page shows them;
 *   4. THE ROAD: the gear opens the new panel on Settings (built), no dock
 *      menu's;
 *   5. ONE WRITER: today's page and the new one call the same writers
 *      (dash/settingsParts.jsx): today's page no longer writes the sound's
 *      keys or sends the restart itself. */
import { readFileSync } from 'node:fs';
import { SETTINGS_RAIL, SETTINGS_ROWS, SETTINGS_TODAY, SETTINGS_PAGES, settingsRailId, settingsRows, settingsRailOf } from '../../src/game/menus3Settings.js';
import { MENUS3_BUILT, menus3Route } from '../../src/game/menus3Router.js';
import { DASH_HUBS } from '../../src/game/dashDests.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* ── 1. the rail ── */
check('1a the rail of five, the owner\'s order', SETTINGS_RAIL.join() === 'sound,screen,alerts,account,help');
check('1b a forged rail is Sound', settingsRailId('__proto__') === 'sound' && settingsRailId(null) === 'sound' && settingsRailId('help') === 'help');
check('1c every rail has rows', SETTINGS_RAIL.every((r) => SETTINGS_ROWS[r].length > 0));
check('1d a row lives in one rail', (() => { const all = [].concat(...SETTINGS_RAIL.map((r) => SETTINGS_ROWS[r])); return all.length === new Set(all).size; })());

/* ── 2. nothing lost ── */
{
  /* today's page's rows, by the words it draws (settingsPanel.js keys) */
  const page = src('src/ui/mobile/dash/SettingsPanel.jsx');
  const KEY_TO_TODAY = {
    'settingsPanel.audio': 'settings.audio', 'settingsPanel.music': 'settings.music', 'settingsPanel.effects': 'settings.effects',
    'settingsPanel.questPath': 'settings.questPath', 'settingsPanel.menuSide': 'settings.menuSide',
    'settingsPanel.notifSilence': 'settings.notifSilence', 'settingsPanel.notifSilenced': 'settings.notifSilence',
    'settingsPanel.loginKey': 'settings.loginKey', 'settingsPanel.controls': 'settings.controls', 'settingsPanel.fullScreen': 'settings.fullScreen',
    'settingsPanel.feedback': 'settings.feedback', 'settingsPanel.about': 'settings.about', 'settingsPanel.restartRow': 'settings.restart',
  };
  const used = Array.from(new Set((page.match(/'settingsPanel\.[A-Za-z]+'/g) || []).map((s) => s.slice(1, -1))));
  const unknown = used.filter((k) => !Object.prototype.hasOwnProperty.call(KEY_TO_TODAY, k));
  check('2a every row of today\'s Settings page is known here', used.length >= 12 && unknown.length === 0, unknown);
  check('2b ...and each has a home on the rail', Object.values(KEY_TO_TODAY).every((t) => settingsRailOf(SETTINGS_TODAY[t])), Object.values(KEY_TO_TODAY).filter((t) => !settingsRailOf(SETTINGS_TODAY[t])));
  check('2c the debug overlay too', /Debug overlay/.test(page) && settingsRailOf(SETTINGS_TODAY['settings.debug']) === 'screen');
  check('2d every thing of today\'s has a row', Object.keys(SETTINGS_TODAY).every((k) => settingsRailOf(SETTINGS_TODAY[k])), Object.keys(SETTINGS_TODAY).filter((k) => !settingsRailOf(SETTINGS_TODAY[k])));
  /* today's Settings hub's five pages */
  const hub = DASH_HUBS.settingsHub.map((d) => d.page);
  check('2e today\'s hub is the five pages', hub.join() === 'settings,notifications,account,feedback,about', hub);
  const reached = new Set(['settings', 'account'].concat(Object.values(SETTINGS_PAGES)));   /* settings: the rail; account: its rail whole */
  check('2f every page of today\'s hub is reached', hub.every((p) => reached.has(p)), hub.filter((p) => !reached.has(p)));
  check('2g a row opens only a page of today\'s hub', Object.values(SETTINGS_PAGES).every((p) => hub.indexOf(p) >= 0));
  check('2h Log out is in Account (decided 9)', settingsRailOf(SETTINGS_TODAY['account.leave']) === 'account');
  check('2i Feedback and About in Help, the news in Alerts', settingsRailOf('feedback') === 'help' && settingsRailOf('about') === 'help' && settingsRailOf('news') === 'alerts');
  check('2j the sound\'s three in Sound', SETTINGS_ROWS.sound.join() === 'audio,music,effects');
  check('2k the restart in Account', settingsRailOf(SETTINGS_TODAY['settings.restart']) === 'account');
}

/* ── 3. the device ── */
check('3a a phone, no switches: no full screen, no quest path, no debug', settingsRows('screen', {}).join() === 'menuSide,controls', settingsRows('screen', {}));
check('3b iPhone Safari in the browser: Play full screen', settingsRows('screen', { iosBrowser: true }).indexOf('fullScreen') >= 0);
check('3c ?questpath and ?dev=1: their rows', settingsRows('screen', { groundPath: true, dev: true }).join() === 'menuSide,controls,questPath,debug');
check('3d the other rails show all', settingsRows('alerts', {}).join() === 'silence,onScreen,news' && settingsRows('help').join() === 'feedback,about');

/* ── 4. the road ── */
{
  check('4a Settings is built', MENUS3_BUILT.indexOf('settings') >= 0);
  const r = menus3Route('hud.gear', { built: MENUS3_BUILT });
  check('4b the gear opens the panel on Settings, no dock menu\'s', r && r.road === 'panel' && r.section === 'settings' && r.menu === null, r);
  const old = menus3Route('hud.gear', { built: [] });
  check('4c not built: today\'s hub (the road kept)', old && old.road === 'page' && old.page === 'settingsHub', old);
}

/* ── 5. one writer ── */
{
  const page = src('src/ui/mobile/dash/SettingsPanel.jsx');
  const parts = src('src/ui/mobile/dash/settingsParts.jsx');
  const mine = src('src/ui/menus3/Menus3Settings.jsx');
  check('5a the sound\'s keys are written in settingsParts only', /brotown_vol_music/.test(parts) && /brotown_audio_off/.test(parts) && !/brotown_vol_music|brotown_audio_off/.test(page + mine));
  check('5b the restart\'s request is settingsParts\'', /act\('character_reset'/.test(parts) && !/character_reset/.test(page + mine));
  check('5c both pages call the shared writers', /from '\.\/settingsParts\.jsx'/.test(page) && /settingsParts\.jsx'/.test(mine));
  check('5d Account is today\'s page whole (its log out, key, login)', /<AccountPanel \/>/.test(mine) && !/loginkeys|devicelock|verify\.js/.test(mine));
}

console.log(`menus3-settings: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
