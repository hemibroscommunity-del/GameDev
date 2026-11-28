import React, { useState } from 'react';
import { SAY } from '@/data/say/settingsPanel.js';   /* v2.3.6344: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';   /* v2.3.6344: a plain row goes through deskWords (v2.3.3615: "tap" reads "click" on a computer) */
import { notificationsMuted, setNotificationsMuted } from '../modalGuardBus.js'; /* v2.3.2147 */
import { COL, panelStyle } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { controlsTutorialBus } from '../controlsTutorialBus.js';
import { installHintBus } from '../installHintBus.js'; /* v2.3.2159 */
import { TRAIL_STYLES, getTrailStyle, setTrailStyle, GROUND_PATH } from '@/game/questTrailStyle.js'; /* v2.3.2992 GROUND_PATH */
import { DASH_SIDES, getDashSidePref, setDashSidePref } from '@/game/dashSidePref.js'; /* v2.3.2177 */
import { onIOS } from '../../../game/deviceProfile.js';   /* v2.3.4804: the device profile */
import { DEV_MODE, useSoundSettings, useDebugSetting, useRestart, RestartScreen } from './settingsParts.jsx';   /* v2.3.6869 (card MN step 12): the controls that write, shared */

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — 44px
   setting rows, and the switch grows to a 46×26 touchable pill: track
   is the #121B20 well when off, brass when on (brass = active state,
   the one accent in this region).  Toggle handlers and localStorage
   keys are unchanged. */
/* v2.3.1235: batch-1 rollout — two corrections against the locked
   token sheet: (1) the real hit target was the 46×26 pill (<44px
   tall), so the <button> is now an invisible 56×44 target and the
   pill is a nested visual span; (2) toggle states follow the contract
   exactly — ON = brass-soft fill + brass border + brass knob (a full
   brass fill would compete with the surface's single gold action),
   OFF = raised/neutral with a muted knob.  Click handler unchanged. */
const Toggle = ({ label, value, onChange }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    padding: '0 8px',
    borderBottom: `1px solid ${COL.divider}`,
  }}>
    <span style={{ fontSize: 13.5, color: COL.text }}>{label}</span>
    <button
      onClick={onChange}
      style={{
        width: 56, height: 44,
        flex: '0 0 auto',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        cursor: 'pointer',
        padding: 0,
        touchAction: 'manipulation',
      }}
    >
      <span style={{
        display: 'block',
        width: 46, height: 26,
        borderRadius: 999,
        background: value ? COL.accentFill : COL.raised,
        border: `1px solid ${value ? COL.accent : COL.borderStrong}`,
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 2, left: value ? 22 : 2,
          width: 20, height: 20,
          borderRadius: '50%',
          background: value ? COL.accent : COL.muted,
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
          transition: 'left .15s',
        }} />
      </span>
    </button>
  </div>
);

/* ═══ v2.3.2820: A VOLUME ROW ═══
   The demo audit's first Settings gap: one Audio on/off, no levels.  A
   native range input -- the phone draws its own thumb, which is the one
   control iOS users already know how to drag -- in a 44px row, brass track
   via accent-color (LANTERN-SLATE-SPEC: brass is the active state).  0..100
   on screen, 0..1 in storage and on BT_AUDIO.setLevels. */
const VolumeRow = ({ label, value, onChange, disabled, hook }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    minHeight: 44, padding: '0 8px',
    borderBottom: `1px solid ${COL.divider}`,
    opacity: disabled ? 0.45 : 1,
  }}>
    <span style={{ fontSize: 13.5, color: COL.text, flex: '0 0 92px' }}>{label}</span>
    <input type="range" min={0} max={100} step={5}
      value={Math.round(value * 100)}
      disabled={disabled}
      data-vol={hook}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      style={{ flex: 1, minWidth: 0, height: 44, accentColor: COL.accent, touchAction: 'manipulation' }} />
    <span style={{ fontSize: 12, fontWeight: 700, color: COL.text2, flex: '0 0 34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
      {Math.round(value * 100)}%
    </span>
  </div>
);
export const SettingsPanel = () => {
  const [, force] = useState(0);
  /* v2.3.6869 (card MN step 12): the sound, the debug switch and the restart are settingsParts.jsx's,
     shared with the new menus' Settings (one writer of each stored value) */
  const { musicVol, sfxVol, setVol, audio, toggleAudio } = useSoundSettings();
  const { debug, toggleDebug } = useDebugSetting();
  /* v2.3.2141: the quest path guide -- shape, or off.  The module owns the
     value and the storage; this row only names it, the same way the audio
     toggle owns nothing but the label. */
  const [trail, setTrail] = useState(() => getTrailStyle());
  const [dashSide, setDashSide] = useState(() => getDashSidePref());
  const restart = useRestart();
  const { setResetStage } = restart;

  if (restart.showing) return <RestartScreen r={restart} />;

  return (
    <div style={panelStyle}>
      <Toggle label={say(SAY, 'settingsPanel.audio')} value={audio} onChange={toggleAudio} />
      <VolumeRow label={say(SAY, 'settingsPanel.music')} hook="music" value={musicVol} disabled={!audio} onChange={(v) => setVol('music', v)} />
      <VolumeRow label={say(SAY, 'settingsPanel.effects')} hook="sfx" value={sfxVol} disabled={!audio} onChange={(v) => setVol('sfx', v)} />
      {DEV_MODE && <Toggle label="Debug overlay (D)" value={debug} onChange={toggleDebug} />}
      {/* ═══ v2.3.2141: THE QUEST PATH ═══
          Owner: "Add an option to turn off the path guide for the quest.
          Also explore different options than the bead snake."
          ONE row, not a toggle plus a picker: a player who wants it gone and
          a player who wants it different are reaching for the same control,
          and Off as a fourth chip is one tap from either. */}
      {/* v2.3.2992: put away with the road it chose the look of -- the
          way is on the minimap now (questTrailStyle.js GROUND_PATH); back
          with `?questpath` */}
      {GROUND_PATH && (
        <ChoiceRow
          label={say(SAY, 'settingsPanel.questPath')}
          options={TRAIL_STYLES}
          value={trail}
          onChange={(id) => { setTrail(setTrailStyle(id)); }}
        />
      )}
      {/* ═══ v2.3.2177: WHICH SIDE THE SIDEWAYS MENUS SIT ON ═══
          Owner, after v2.3.2176 shipped: the dashboard "always displays on
          the left" instead of dodging the Dynamic Island.  The cause and the
          new rule are in dashSidePref.js; this row is the escape hatch for
          the half of that rule this repo cannot test -- there is no iPhone
          here to check the rotation mapping against, and a player who finds
          Auto reading the wrong way round should not have to wait for
          another build.  It is also just a preference worth having: some
          people want their menus under one particular thumb.
          Landscape-only, and it says so rather than appearing inert to
          somebody reading Settings in portrait. */}
      <ChoiceRow
        label={say(SAY, 'settingsPanel.menuSide')}
        hook="dashside"
        minW={56}
        options={DASH_SIDES}
        value={dashSide}
        onChange={(id) => { setDashSide(setDashSidePref(id)); }}
      />
      {/* v2.3.1291 (ChatGPT round-3 §1): Account, Controls and Feedback
          fold in here as drill rows — they left the More launcher.  The
          panels themselves are unchanged (PANELS registry push). */}
      {/* v2.3.2038: renamed with the tile and the panel header. This row stays
          -- it is where the path has lived since v2.3.1291 and anyone who
          learned it here should still find it. */}
      {/* ═══ v2.3.2147: SILENCE ALL NOTIFICATIONS ═══
          Owner: "give options to silence all notifications (on bottom left
          above dashboard of screen)."

          IT IS NOT ON THE BOTTOM LEFT, and that is a deliberate departure from
          what was asked, not an oversight. That corner of the play area is the
          movement thumbstick: `data-joyzone="L"` (TouchControls) is a fixed,
          invisible pad covering the whole LEFT HALF of the screen that
          receives every movement drag, and TouchControls says so where the
          visible disc is kept pointerEvents:'none' -- "this corner box must
          not intercept them".

          Three placements were tried there and each broke a control that has
          nothing to do with notifications:
            - floating above the dashboard: ate movement drags outright; two
              duellists could not walk to each other (mp-duelfeel).
            - inside the chat feed's shell, under its fold header: sat where
              QuestCoach's reachable() hit-tests the joystick, so the coach
              silently dropped its opening "drag to move" lesson
              (mp-coachearly).
            - in the fold header's own row: pushed the row past the feed's box
              and back over the pad (mp-duelfeel again).

          A mute switch is worth less than being able to walk. So it lives here
          with the other session settings, one tap from More, where it cannot
          take a gesture from anything. */}
      <LinkRow label={say(SAY, notificationsMuted()
        ? 'settingsPanel.notifSilenced'
        : 'settingsPanel.notifSilence')}
        onTap={() => { setNotificationsMuted(!notificationsMuted()); force((n) => n + 1); }} />
      <LinkRow label={say(SAY, 'settingsPanel.loginKey')}
        onTap={() => dashboardPanelBus.push('account')} />
      <LinkRow label={say(SAY, 'settingsPanel.controls')}
        onTap={() => controlsTutorialBus.open()} />
      {/* v2.3.2159: the way back to a dismissed install hint — everything
          cut is one tap away.  iOS Safari in the browser only: launched
          from the home screen there is nothing to teach, and elsewhere the
          instruction would be wrong. */}
      {(() => {
        try {
          const ios = onIOS();   /* v2.3.4804: the device profile */
          const standalone = window.navigator.standalone === true
            || window.matchMedia('(display-mode: standalone)').matches;
          if (!ios || standalone) return null;
        } catch (e) { return null; }
        return (
          <LinkRow label={say(SAY, 'settingsPanel.fullScreen')}
            onTap={() => { installHintBus.open(); dashboardPanelBus.toBar(); }} />
        );
      })()}
      <LinkRow label={say(SAY, 'settingsPanel.feedback')}
        onTap={() => dashboardPanelBus.push('feedback')} />
      {/* v2.3.2820: privacy, rules and credits, one tap from Settings. */}
      <LinkRow label={say(SAY, 'settingsPanel.about')}
        onTap={() => dashboardPanelBus.push('about')} />
      {/* v2.3.1347: destructive row — red label, drills into the
          in-panel confirmation screen above (owner playtest request). */}
      <LinkRow label={say(SAY, 'settingsPanel.restartRow')}
        danger
        onTap={() => setResetStage('confirm')} />
      {DEV_MODE && (
        <div style={{ marginTop: 10, padding: '0 8px', fontSize: 13, color: COL.muted, lineHeight: 1.4 }}>
          Tap the floating <b>D</b> button for the full devtools console.
        </div>
      )}
    </div>
  );
};

/* ═══ v2.3.2141: A SETTING WITH MORE THAN TWO STATES ═══
 * The panel had exactly one control shape -- the on/off Toggle -- and "which
 * shape should the quest path be" is not a yes/no.  A dropdown was the other
 * option and is the wrong one on a phone: it hides every value but the current
 * one behind a tap, so a player who does not already know what "Ribbon" looks
 * like cannot discover it, and discovery is most of what this row is for.
 *
 * So: chips, all values visible, with the selected one carrying the brass
 * fill the Toggle's ON state uses (LANTERN-SLATE-SPEC: brass is the active
 * state, and this row's chips are the only active thing in it).  The hint line
 * under them describes the SELECTED value, because that is the one the player
 * is deciding whether to keep.
 *
 * 44px chips, deliberately, unlike the 32px chat lane chips (v2.3.2139, sized
 * down to keep a composer clear of the iOS keyboard).  A settings row has no
 * keyboard to make room for, so there is no reason to spend the touch floor
 * here. */
/* v2.3.2177: `hook` names the data-* attribute the buttons carry, so a
   second row can be selected by tests without inheriting the trail row's
   name.  Defaulted, so the original row is untouched. */
/* v2.3.3481: the 2026-10-19 UI review -- `minW` is a chip's narrowest.  In
   the sideways column a row has ~194 px inside, and three 68 px chips and
   their gaps need 216, so "Landscape menu side" wrapped two and one: Auto and
   Left on a row, Right alone across the next, looking like the bigger choice.
   That row asks for 56 (three ~60 px chips in one row, "Right" ~35 px of
   it); the Quest path row's five chips ("Footprints") keep 68. */
const ChoiceRow = ({ label, options, value, onChange, hook = 'trailstyle', minW = 68 }) => {
  const sel = options.find((o) => o.id === value) || null;
  return (
    <div style={{ padding: '10px 8px', borderBottom: `1px solid ${COL.divider}` }}>
      <div style={{ fontSize: 13.5, color: COL.text, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              {...{ [`data-${hook}`]: o.id }}
              aria-pressed={on}
              onPointerUp={(e) => { e.stopPropagation(); onChange(o.id); }}
              style={{
                flex: '1 1 0',
                minWidth: minW,
                minHeight: 44,
                borderRadius: 8,
                cursor: 'pointer',
                background: on ? COL.accentFill : COL.raised,
                border: `1px solid ${on ? COL.accent : COL.borderStrong}`,
                color: on ? COL.accent : COL.text,
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: on ? 700 : 500,
                touchAction: 'manipulation',
              }}
            >{o.label}</button>
          );
        })}
      </div>
      {sel && sel.hint ? (
        <div style={{ marginTop: 8, fontSize: 12.5, color: COL.muted, lineHeight: 1.4 }}>
          {sel.hint}
        </div>
      ) : null}
    </div>
  );
};

/* v2.3.1291: 44px drill row — label left, ▸ affordance right.
   v2.3.1347: `danger` tints the label for destructive rows. */
const LinkRow = ({ label, onTap, danger }) => (
  <button
    onPointerUp={(e) => { e.stopPropagation(); onTap(); }}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      minHeight: 44,
      padding: '0 8px',
      background: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${COL.divider}`,
      color: danger ? COL.danger : COL.text,
      fontFamily: 'inherit',
      fontSize: 13.5,
      textAlign: 'left',
      cursor: 'pointer',
      touchAction: 'manipulation',
    }}
  >
    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    <span aria-hidden="true" style={{ color: COL.muted, fontSize: 15 }}>▸</span>
  </button>
);
