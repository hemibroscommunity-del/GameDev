/* ═══ v2.3.6869: THE NEW MENUS' SETTINGS -- THE RAIL OF FIVE (card MN step 12) ═══
 *
 * The gear left of the minimap (Menus3Gear.jsx) opens the new panel on
 * Settings, always on Sound (the owner's rule 1).  The wireframe v4.4's
 * Settings (docs/design/menus3/WIREFRAME.html): the header's title and X, a
 * rail of five pills under it (Sound, Screen, Alerts, Account, Help), rows of
 * a name and a line under it on the left, the control on the right; its
 * sliders at 16 px MENDED to 44 (decided 10), its On/Off a 44 button.
 *
 * Every control is today's (src/game/menus3Settings.js SETTINGS_TODAY says
 * where each went): the ones that write go through today's own writers
 * (dash/settingsParts.jsx: the sound and its levels, the debug overlay, the
 * restart and its confirm screen; questTrailStyle.js, dashSidePref.js,
 * modalGuardBus.js's silence, notifBus.js's feed on screen; the controls
 * lesson and the install hint's own buses).  Account is today's Account page
 * whole (AccountPanel.jsx: Log out / Switch Bro with its confirm, the Login
 * Key, continue another character), the login code untouched; Restart under
 * it.  Feedback, About and the chat and news lines open TODAY's pages
 * (menus3Away: their Back gives the panel back on the same rail).
 *
 * Its own script (lazyPanels.js Menus3SettingsLazy): loaded the first time
 * the gear opens it, with today's Settings page's shared part. */
import { useEffect, useState } from 'react';
import { menus3Bus, menus3Away, menus3Close } from './menus3Wire.js';
import { SETTINGS_RAIL, settingsRailId, settingsRows, SETTINGS_PAGES } from '@/game/menus3Settings.js';
import { SAY } from '@/data/say/menus3Settings.js';
import { say } from '@/game/say.js';
import { useSoundSettings, useDebugSetting, useRestart, RestartScreen, DEV_MODE } from '../mobile/dash/settingsParts.jsx';
import { AccountPanel } from '../mobile/dash/AccountPanel.jsx';
import { notificationsMuted, setNotificationsMuted } from '../mobile/modalGuardBus.js';
import { notifBus, notifUnread } from '../mobile/notifBus.js';
import { controlsTutorialBus } from '../mobile/controlsTutorialBus.js';
import { installHintBus } from '../mobile/installHintBus.js';
import { dashboardPanelBus } from '../mobile/dashboardPanelBus.js';
import { TRAIL_STYLES, getTrailStyle, setTrailStyle, GROUND_PATH } from '@/game/questTrailStyle.js';
import { DASH_SIDES, getDashSidePref, setDashSidePref } from '@/game/dashSidePref.js';
import { onIOS } from '@/game/deviceProfile.js';

const RAIL_WORD = {
  sound: () => say(SAY, 'menus3Settings.sound'), screen: () => say(SAY, 'menus3Settings.screen'),
  alerts: () => say(SAY, 'menus3Settings.alerts'), account: () => say(SAY, 'menus3Settings.account'),
  help: () => say(SAY, 'menus3Settings.help'),
};

/* today's page's own test for the full-screen row (SettingsPanel.jsx v2.3.2159) */
function iosBrowser() {
  try {
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    return onIOS() && !standalone;
  } catch (e) { return false; }
}

/* ── the pieces of a row ── */
function Row({ name, sub, hook, children }) {
  return (
    <div className="m3-set-row" data-m3-set={hook}>
      <div className="m3-set-words">
        <span className="m3-set-name">{name}</span>
        {sub ? <span className="m3-set-sub">{sub}</span> : null}
      </div>
      {children}
    </div>
  );
}
function OnOff({ on, onTap, hook, disabled }) {
  return (
    <button type="button" className={'u2-raised u2-ctl m3-set-btn' + (on ? ' is-selected' : '')} aria-pressed={!!on}
      data-m3-set-ctl={hook} disabled={disabled} onClick={onTap}>
      {say(SAY, on ? 'menus3Settings.on' : 'menus3Settings.off')}
    </button>
  );
}
function Go({ word, onTap, hook, danger }) {
  return (
    <button type="button" className={'u2-raised u2-ctl m3-set-btn' + (danger ? ' is-danger' : '')} data-m3-set-ctl={hook} onClick={onTap}>
      {word}
    </button>
  );
}
/* the wireframe's slider, 16 px tall there, 44 here (decided 10) */
function Level({ name, value, onChange, hook, disabled }) {
  return (
    <div className={'m3-set-row m3-set-level' + (disabled ? ' is-off' : '')} data-m3-set={hook}>
      <span className="m3-set-name">{name}</span>
      <input type="range" min={0} max={100} step={5} value={Math.round(value * 100)} disabled={disabled}
        data-vol={hook} data-m3-set-ctl={hook} aria-label={name}
        onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <span className="m3-set-pct">{Math.round(value * 100)}%</span>
    </div>
  );
}
function Chips({ name, options, value, onPick, hook }) {
  const sel = options.find((o) => o.id === value) || null;
  return (
    <div className="m3-set-chips" data-m3-set={hook}>
      <span className="m3-set-name">{name}</span>
      <div className="m3-set-chiprow">
        {options.map((o) => (
          <button key={o.id} type="button" className={'u2-raised u2-ctl m3-set-chip' + (o.id === value ? ' is-selected' : '')}
            aria-pressed={o.id === value} data-m3-set-ctl={hook} data-m3-set-val={o.id} onClick={() => onPick(o.id)}>{o.label}</button>
        ))}
      </div>
      {sel && sel.hint ? <span className="m3-set-sub">{sel.hint}</span> : null}
    </div>
  );
}

/* a row's page of today's, its Back the panel on this rail */
function openToday(row) {
  const page = SETTINGS_PAGES[row];
  if (page) menus3Away(() => dashboardPanelBus.open(page));
}

/* ── the five rails ── */
function Sound() {
  const s = useSoundSettings();
  return (
    <>
      <Row name={say(SAY, 'menus3Settings.audio')} sub={say(SAY, 'menus3Settings.audioSub')} hook="audio">
        <OnOff on={s.audio} onTap={s.toggleAudio} hook="audio" />
      </Row>
      <Level name={say(SAY, 'menus3Settings.music')} hook="music" value={s.musicVol} disabled={!s.audio} onChange={(v) => s.setVol('music', v)} />
      <Level name={say(SAY, 'menus3Settings.effects')} hook="sfx" value={s.sfxVol} disabled={!s.audio} onChange={(v) => s.setVol('sfx', v)} />
    </>
  );
}

function Screen({ rows }) {
  const [side, setSide] = useState(() => getDashSidePref());
  const [trail, setTrail] = useState(() => getTrailStyle());
  const dbg = useDebugSetting();
  return rows.map((r) => {
    if (r === 'menuSide') return <Chips key={r} name={say(SAY, 'menus3Settings.menuSide')} hook="dashside" options={DASH_SIDES} value={side} onPick={(id) => setSide(setDashSidePref(id))} />;
    if (r === 'fullScreen') return (
      <Row key={r} name={say(SAY, 'menus3Settings.fullScreen')} sub={say(SAY, 'menus3Settings.fullScreenSub')} hook={r}>
        <Go word={say(SAY, 'menus3Settings.open')} hook={r} onTap={() => { menus3Close('row'); installHintBus.open(); }} />
      </Row>
    );
    /* the lesson teaches the fight controls, which an open panel hides upright: the panel shuts first */
    if (r === 'controls') return (
      <Row key={r} name={say(SAY, 'menus3Settings.controls')} sub={say(SAY, 'menus3Settings.controlsSub')} hook={r}>
        <Go word={say(SAY, 'menus3Settings.replay')} hook={r} onTap={() => { menus3Close('row'); controlsTutorialBus.open(); }} />
      </Row>
    );
    if (r === 'questPath') return <Chips key={r} name={say(SAY, 'menus3Settings.questPath')} hook="trailstyle" options={TRAIL_STYLES} value={trail} onPick={(id) => setTrail(setTrailStyle(id))} />;
    if (r === 'debug') return (
      <Row key={r} name={say(SAY, 'menus3Settings.debug')} hook={r}><OnOff on={dbg.debug} onTap={dbg.toggleDebug} hook={r} /></Row>
    );
    return null;
  });
}

function Alerts({ getS }) {
  const [, force] = useState(0);
  useEffect(() => notifBus.subscribe(() => force((n) => n + 1)), []);
  const on = !notificationsMuted();
  const feed = !notifBus.shut;
  const unread = notifUnread(getS());
  return (
    <>
      <Row name={say(SAY, 'menus3Settings.silence')} sub={say(SAY, on ? 'menus3Settings.silenceOnSub' : 'menus3Settings.silenceOffSub')} hook="silence">
        <OnOff on={on} hook="silence" onTap={() => { setNotificationsMuted(on); force((n) => n + 1); }} />
      </Row>
      <Row name={say(SAY, 'menus3Settings.onScreen')} sub={say(SAY, 'menus3Settings.onScreenSub')} hook="onScreen">
        <OnOff on={feed} hook="onScreen" onTap={() => notifBus.setShut(feed)} />
      </Row>
      <Row name={say(SAY, 'menus3Settings.news')} sub={unread ? say(SAY, 'menus3Settings.newsUnread', { n: unread }) : say(SAY, 'menus3Settings.newsSub')} hook="news">
        <Go word={say(SAY, 'menus3Settings.open')} hook="news" onTap={() => openToday('news')} />
      </Row>
    </>
  );
}

function Account() {
  const restart = useRestart();
  if (restart.showing) return <div className="m3-set-restart" data-m3-set="restartScreen"><RestartScreen r={restart} /></div>;
  return (
    <>
      <div className="m3-set-account" data-m3-set="account"><AccountPanel /></div>
      <Row name={say(SAY, 'menus3Settings.restart')} sub={say(SAY, 'menus3Settings.restartSub')} hook="restart">
        <Go word={say(SAY, 'menus3Settings.restartGo')} hook="restart" danger onTap={() => restart.setResetStage('confirm')} />
      </Row>
    </>
  );
}

function Help() {
  return (
    <>
      <Row name={say(SAY, 'menus3Settings.feedback')} sub={say(SAY, 'menus3Settings.feedbackSub')} hook="feedback">
        <Go word={say(SAY, 'menus3Settings.open')} hook="feedback" onTap={() => openToday('feedback')} />
      </Row>
      <Row name={say(SAY, 'menus3Settings.about')} sub={say(SAY, 'menus3Settings.aboutSub')} hook="about">
        <Go word={say(SAY, 'menus3Settings.open')} hook="about" onTap={() => openToday('about')} />
      </Row>
    </>
  );
}

export function Menus3Settings({ getS, top }) {
  const rail = settingsRailId(top && top.rail);
  const ctx = { iosBrowser: iosBrowser(), groundPath: !!GROUND_PATH, dev: !!DEV_MODE };
  const rows = settingsRows(rail, ctx);
  const pick = (id) => { menus3Bus.keep({ rail: id, scroll: 0 }); menus3Bus.bump(); };
  try { window.__btMenus3Settings = { rail, rows }; } catch (e) { /* no window */ }
  return (
    <div className="m3-settings" data-m3-settings={rail}>
      <div className="m3-rail" role="group" aria-label={say(SAY, 'menus3Settings.railAria')}>
        {SETTINGS_RAIL.map((id) => (
          <button key={id} type="button" className={'u2-raised u2-ctl m3-pill' + (id === rail ? ' is-selected' : '')} data-m3-srail={id}
            aria-pressed={id === rail} onClick={() => pick(id)}>{RAIL_WORD[id]()}</button>
        ))}
      </div>
      <div className="m3-set-list" data-m3-set-list={rail}>
        {rail === 'sound' ? <Sound /> : null}
        {rail === 'screen' ? <Screen rows={rows} /> : null}
        {rail === 'alerts' ? <Alerts getS={getS} /> : null}
        {rail === 'account' ? <Account /> : null}
        {rail === 'help' ? <Help /> : null}
      </div>
    </div>
  );
}
