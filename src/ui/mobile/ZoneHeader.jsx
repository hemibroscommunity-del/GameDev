import React, { useEffect, useRef, useState } from 'react';
import { loginSpinBus, loginSpinNextWords } from '@/game/loginSpinWheel.js'; /* v2.3.4295: the free daily spin's button */
import { LOGIN_SPIN_URLS } from '@/rendering/loginSpinPreload.js';
import { COL, getState } from './dash/common.js';
import { placeName } from './placeName.js'; /* v2.3.3974: the land you stand in, or BroTown (was the Wheel's name, v2.3.3009) */
import { testModeOn } from '../../game/testMode.js'; /* v2.3.3430: the owner's test mode tag */
import { achvLive, achvApTotal } from '../../game/achievements.js';   /* v2.3.3553: your AP on the bar */
import { apRise } from '../../game/apChip.js';  /* v2.3.3553; v2.3.4183: a rise is a word now */
import { pushHudPopup } from '../XpFlyOverlay.jsx';  /* v2.3.4183: "+12 gold" / "+5 AP" under the bar */
import { onXpBar, xpBarShown, xpGainWords, xpToNextWords } from '../../game/xpBar.js'; /* v2.3.3695: the XP bar */
import { XpTrack } from './XpTrack.jsx';                                  /* v2.3.3739: its white gain bar and "45 / 120" */
import { XP_BAR_ICONS, XP_BAR_LABELS, TOPBAR_LOGO } from './xpBarArt.js';           /* v2.3.3695: its skill pictures */

/* ═══ v2.3.2892 -> v2.3.3974: THE HOUR'S ICON IS GONE ═══
   v2.3.2892 put a day/night icon beside the zone name (the owner: "Add a time
   of day icon next to current map name").  Night is off and the icon took no
   tap, so it said nothing a player could use; v2.3.3974 gave its room to
   the place chip, which itself left for the minimap's plate in v2.3.4113. */

/* v2.3.1333: zone header rail (owner + ChatGPT spec).  The floating
   zone label kept getting lost against bright world art, and the
   circular back-arrow FAB read as navigation, not logout.  One slim
   recessed rail replaces both: raised logout chip (door + outward
   arrow, CONFIRMATION required) on the left, zone name centered, an
   empty right column the same width as the chip so the title is
   optically centered on the SCREEN, not in the leftover space.
   Deliberately shallower than the dashboard band — a header rail, not
   another panel.  Assets: zone-header-bar.svg (9-slice, styled in
   game.css .bt-zone-header) + logout-door-icon.svg. */

const V = '?v=2.3.1333c'; /* v2.3.1333c: bigger logout glyph */

/* ═══ v2.3.2421: THIS DOOR IS ALSO THE BRO SWITCHER, AND IT NEVER SAID SO ═══
 * Owner: "the level 0 I saw when I logged in was from an old save that somehow
 * was the DEFAULT I logged into (it was an old character I'd made that I
 * tattooed at one point)."
 *
 * Nothing is broken underneath.  A plain load reads bt_passphrase, asks the
 * worker whether that key has a character, and on yes joins straight in
 * (BroTown.jsx, __btBootRoute = 'resume').  Whichever key is stored IS who you
 * are.  The device's other characters are all still there, in charRoster, and
 * LoginScreen AUTO-OPENS the CharacterPicker whenever the roster is non-empty
 * -- so the road to "play a different bro" already exists and is exactly one
 * tap: this chip.
 *
 * The reason nobody finds it is that all three signals on the control say the
 * opposite of what it does.  It is a DOOR glyph, it is labelled LOG OUT, and
 * its confirm button wears bt-chisel--danger, which is the same red the game
 * uses for salvaging an item and leaving a clan.  A player holding four bros
 * reads "log out" as "end my session", not "show me my bros" -- so they never
 * press it, and they stay on whichever character the key happens to name.
 *
 * So the fix is the WORDS, not the road.  Changing the boot route to open the
 * picker would be a behaviour change for every returning player -- including
 * everyone with exactly one character, who would gain a screen that asks them
 * a question with one answer.  This tells the truth instead, and only when
 * there is a truth to tell: the switch wording appears when the device
 * actually holds more than one bro, and a single-character device keeps the
 * old copy exactly.
 *
 * Read at RENDER rather than at module load: forgetChar and the create road
 * both change the count while the game is running, and a value captured at
 * import would go stale in the direction that matters (a player who just made
 * their second bro is precisely the one who needs the new wording).
 */

/* v2.3.2596: zoneTitle moved to ./zoneTitle.js — VERBATIM, and only so the
   zone-entry banner can print the same string on its way here.  The banner's
   whole promise is "this wide thing becomes that small label", and two copies
   of "how a zone is named" is exactly the pair that stays identical for a year
   and then diverges, at which point the flourish turns into different words. */

/* ═══ v2.3.3009 -> v2.3.3108: WHERE YOU ARE IN THE WHEEL ═══
   From v2.3.3009 this bar said it, two lines: the land (its icon and colour,
   v2.3.3024) over its stage and levels, or No man's land in red (v2.3.3058).
   v2.3.3108 moved them back under the minimap, on its name plate -- the owner:
   "move the zone name and level band beneath the minimap" -- so in the Wheel
   the bar names the world, "BroTown", and a land's banner docks into the plate
   (rendering/systems/wheelMinimap.js, zoneBannerOverlay.js titleRect). */

export const ZoneHeader = ({ onExit }) => {
  const [, force] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [spinSt, setSpinSt] = useState(loginSpinBus.get());   /* v2.3.4295 */
  useEffect(() => loginSpinBus.subscribe(setSpinSt), []);
  const spinNote = spinSt.note ? spinSt.note.text : '';
  /* ═══ v2.3.4123: THE DOOR ALWAYS LOGS OUT ═══
     The owner, 2026-11-03: "Change just the exit door icon on top left to
     "logout" (bring to splash screen) not switch character".  v2.3.2421 made
     this chip read "Switch Bro" (and open the list of bros) whenever the
     device held more than one; now it always logs out to the splash screen,
     however many bros the device holds, behind the same confirm.  A device
     with several bros still picks another there: the splash screen's
     Continue opens the list (LoginScreen.jsx, v2.3.2447). */
  /* v2.3.2240: the owner's test panel opens on a 1.2s press of the zone
     name (src/ui/panels/DevPanel.jsx).  Here rather than in a HUD button
     because the header is always on screen in the world and nobody
     press-and-holds a title by accident — and the owner has asked more than
     once to keep the HUD clear.  Lazily imported so the panel's code is not
     in the bundle every player downloads on the critical path.
     It is not a secret door: without the ADMIN_KEY the panel can do
     nothing, because every action it offers is an authenticated HTTP call
     (server/src/devtools.js). */
  const [showDev, setShowDev] = useState(false);
  const goldSeen = useRef(null);   /* v2.3.2815: the purse's coin flip; v2.3.4183: the gain's word */
  /* v2.3.3553: the AP's rise, as the purse's (game/apChip.js) */
  const apSeen = useRef(null);
  const mountedAt = useRef(Date.now());
  const [DevPanelC, setDevPanelC] = useState(null);
  const holdRef = useRef(null);
  const openDev = () => {
    import('../panels/DevPanel.jsx')
      .then((m) => { setDevPanelC(() => m.DevPanel); setShowDev(true); })
      .catch(() => {});
  };
  const holdStart = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = setTimeout(openDev, 1200);
  };
  const holdEnd = () => {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  };
  useEffect(() => holdEnd, []);
  /* v2.3.3695: the XP bar shows the moment XP lands (game/xpBar.js tells
     us), not on the next 500 ms beat below */
  useEffect(() => onXpBar(() => force((v) => v + 1)), []);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 500);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  if (!S) return null;

  /* ═══ v2.3.4183: THE GOLD AND THE ACHIEVEMENT POINTS LEAVE THE BAR ═══
     The owner, 2026-11-02: "I don't like the placement of where the gold count
     is (top right) and the placement of the achievement points (top left)".
     The purse (v2.3.2320) and the medal with your AP (v2.3.3553) are gone from
     the bar: the gold shows in the Gear tab's header (dash/GearTab.jsx, the
     coins beside the filter), the points on the Bro card (sheet/BroCard.jsx).
     What earning shows here now is a word: "+12 gold" or "+5 AP", rising and
     fading just under the bar's right end, where the purse was (ui/
     XpFlyOverlay.jsx HudPopup, the "+N G" a pickup already put there).  Read
     the same way as before -- `S.rpg.coins` live, the WORKER's AP once its
     record has come -- and never in the first moments (the record loading,
     not a payday).  A pickup that already said "+N G" in the last 1.5 s is
     not said twice. */
  const gold = (S.rpg && (S.rpg.coins || 0)) || 0;
  if (goldSeen.current != null && gold > goldSeen.current && Date.now() - mountedAt.current > 2500) {
    const now = Date.now();
    const said = (S._hudPopups || []).some((p) => p && p.target === 'goldIcon' && /G$|gold$/.test(p.text || '') && now - (p.ts || 0) < 1500);
    if (!said) {
      try { pushHudPopup(S, { target: 'goldIcon', text: '+' + (gold - goldSeen.current).toLocaleString('en-US') + ' gold', color: '#D8A94D' }); } catch (e) { /* feedback only */ }
    }
  }
  goldSeen.current = gold;
  /* the points: the worker's number, only against a worker that grants them */
  const apOn = achvLive(S);
  const ap = apOn ? achvApTotal(S) : 0;
  if (apOn && S._achv && S._achv.known) {
    const g = apRise(apSeen.current, ap, Date.now() - mountedAt.current);
    if (g > 0) {
      try { pushHudPopup(S, { target: 'goldIcon', text: '+' + g.toLocaleString('en-US') + ' AP', color: '#F2D58C' }); } catch (e) { /* feedback only */ }
    }
    apSeen.current = ap;
  }
  /* v2.3.3695: the XP bar -- the skill that last earned, while it is up */
  const xb = S._xpBar || null;
  /* (QA only: `window.__btXpHold` keeps it up while a slow box takes its
     picture, as __btLevelUpFreeze pins the level-up burst; mp-xpbar) */
  const xpOn = xpBarShown(xb, Date.now()) || (!!xb && typeof window !== 'undefined' && window.__btXpHold === true);

  const doExit = () => {
    /* v2.3.785/786 lineage (moved from the retired bt-exit-fab):
       full-screen dim + spinner appended OUTSIDE the React tree so
       teardown can't remove it; navigate on the next frame so it
       paints first. */
    try {
      const dim = document.createElement('div');
      dim.className = 'bt-exit-dim';
      const sp = document.createElement('div');
      sp.className = 'bt-exit-loading';
      const lbl = document.createElement('div');
      lbl.className = 'bt-exit-label';
      lbl.textContent = 'Reloading…';
      dim.appendChild(sp);
      dim.appendChild(lbl);
      document.body.appendChild(dim);
    } catch (e) {}
    /* v2.3.2447 handed the splash screen a one-shot note to open the list
       when this read "Switch Bro"; since v2.3.4123 it always logs out, so it
       lands on the plain splash screen (Continue / Create) every time. */
    requestAnimationFrame(() => setTimeout(onExit, 30));
  };

  return (
    <>
      <header className="bt-zone-header" aria-label="Current zone">
        <div className="bt-zone-header__left">
        <button
          type="button"
          className="bt-chisel bt-chisel--chip bt-zone-header__logout"
          aria-label="Log out"
          style={{ touchAction: 'manipulation' }}  /* v2.3.4221: a pill of words, as the dashboard's CLOSE */
          title="Log out"   /* v2.3.4123: always (the owner: "logout ... not switch character") */
          onClick={() => setConfirming(true)}
        >
          LOGOUT
        </button>
        {/* v2.3.3553-v2.3.4183: your AP and the owner's medal stood here; they
            are on the Bro card now, and a rise is a "+5 AP" word under the
            bar's right end (above) */}
        </div>
        <div className={'bt-zone-header__mid' + (xpOn ? ' bt-zone-header__mid--xp' : '')}>
        {/* ═══ v2.3.4113: IN THE WORLD THE NAME IS NOT DRAWN HERE ═══
            The owner, 2026-11-03: "Remove name of town and "safe" or other
            designation from top bar (currently centered). The minimap label
            area already does this."  In the Wheel the title is drawn clear
            (game.css bt-zone-header__title--clear) but stays in the page with
            its words: the owner's 1.2 s hold on the bar's centre still opens
            the Test panel there (an invisible hit area where the name was),
            and every scenario that knows the live world by "BroTown" (TRAPS
            §244) still reads it.  A land's banner docks into the minimap's
            plate there (zoneBannerOverlay.js titleRect, since v2.3.3108).
            Off the Wheel -- a dungeon, a room -- there is no plate, so the
            zone's name is still drawn here, and its banner docks here. */}
        <div
          className={'bt-zone-header__title' + (S.currentZone === 'wheel' ? ' bt-zone-header__title--clear' : '')}
          /* v2.3.2596: the zone-entry banner's DOCK TARGET.  A data hook rather
             than the class name because the class is a style handle that a
             restyle is free to rename, and the banner measures this box from
             outside React. */
          data-zone-title="1"
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerLeave={holdEnd}
          onPointerCancel={holdEnd}
          /* iOS Safari raises the callout/selection menu on a long press over
             text, which would cover the panel the moment it opened. */
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        >{placeName(S) /* v2.3.3974: the land, or BroTown (v2.3.3039: never "The Wheel") */}</div>
        {/* v2.3.4263, the owner: "Add the BroTown logo centered on the top bar".
            In the world (where the name is drawn clear) the title screen's
            lockup stands in the middle, over the invisible hold area (it takes
            no touch: the 1.2 s hold still reaches the title under it); the XP
            bar takes the centre while you earn and the logo fades back after
            (game.css .bt-zone-header__logo).  Off the Wheel the zone's name
            is drawn there, so no logo. */}
        {S.currentZone === 'wheel' ? (
          <img className="bt-zone-header__logo" data-topbar-logo="1" src={TOPBAR_LOGO} alt="" draggable={false} />
        ) : null}
        {/* v2.3.3765-v2.3.3974: No man's land's pill, then the place chip
            (Safe / PvP / Outlaw), stood here; since v2.3.4113 the minimap's
            plate says it (game/plateSafety.js) and takes the tap
            (NmlBadge.jsx PlateTap). */}
        {/* ═══ v2.3.3430: TEST MODE, SAID WHERE IT IS ALWAYS SEEN ═══
            The owner's switch (Test panel; server/src/testmode.js): while the
            worker has the honesty checks off for this character, the top bar
            says so, so a test character is never taken for a real one.
            BESIDE the title, never inside it -- [data-zone-title] is the zone
            banner's dock target and its text is read exactly.  A flat fill:
            this rail is over the WebGL canvas (TRAPS section 42). */}
        {testModeOn(S) && (
          <span className="bt-zone-header__test" data-test-mode-tag="1"
            aria-label="Test mode: the anti-cheat is off for this character">TEST MODE</span>
        )}
        {/* ═══ v2.3.3695: THE XP BAR, IN THE TITLE'S PLACE WHILE YOU EARN ═══
            The owner: "an XP Popup and an Xp bar to appear with the icon of
            whatever primary combat skill you're earning Xp in ... Then
            disappears again."  The gain, the skill's picture, its level, a bar
            filled to the next level (v2.3.3739: the gain left of the picture,
            a white bar ahead of the gold, "45 / 120" on it) -- the worker's
            numbers (game/xpBar.js), here for XP_BAR_SHOW_MS after the last
            gain.  OVER the title, which stays in the page under it (the zone
            banner's dock target, read exactly; the long press to the test
            panel still reaches it), only faded.  Transform and opacity only:
            this rail is over the WebGL canvas (TRAPS section 42). */}
        {xb ? (
          <div className={'bt-xp-bar' + (xpOn ? ' is-on' : '') + (xb.up ? ' is-up' : '')} data-xp-bar={xb.cat}
            data-xp-level={xb.level} data-xp-frac={xb.frac.toFixed(3)} data-xp-shown={xpOn ? '1' : '0'}
            role="img" aria-hidden={xpOn ? undefined : true}
            aria-label={`${XP_BAR_LABELS[xb.cat] || 'Skill'} level ${xb.level}, ${xpToNextWords(xb.xp, xb.need)} XP to the next`}>
            {/* v2.3.3739: the "+3 XP" pops LEFT of the picture, in its own
                slot, so it never covers the bar (the owner: "put the plus xp
                to the left of the weapon icon so you can still see the bar") */}
            <span className="bt-xp-bar__gainslot">
              {xpOn && xb.gain > 0 ? (
                <span key={'g' + xb.seq} className="bt-xp-gain" data-xp-gain={xb.gain}>{xpGainWords(xb.gain)}</span>
              ) : null}
            </span>
            <img className="bt-xp-bar__icon" src={XP_BAR_ICONS[xb.cat]} alt="" draggable={false} />
            <span className="bt-xp-bar__lv">Lv {xb.level}</span>
            <XpTrack bar={xb} />
          </div>
        ) : null}
        </div>
        {/* v2.3.2320 put the purse here (the owner: "Move gold amount display to
            very top right"); v2.3.4183 took it away again (the owner: "I don't
            like the placement of where the gold count is (top right)").  The
            long note on it is in git history (docs/specs/ap-on-the-bar.md). */}
        {/* v2.3.4183: the purse is gone (the gold is in the Gear tab's header);
            this column stays, empty, as wide as the door's, so the bar's
            centre (the XP bar, TEST MODE, the owner's hold) stays centred on
            the SCREEN -- what it was first made for (v2.3.1333) */}
        {/* ═══ v2.3.4295: THE FREE DAILY SPIN, ON THE RIGHT OF THE BAR ═══
            The owner: "Put free daily spin button on top bar ... only allow the
            wheel to spin if you're in a safe area."  The title plate of the
            wheel's window, scaled to the bar, glowing gently while today's spin
            is unused; here only while the account has today's spin and the
            window is closed (a spin taken, or a pot held, shows nothing).  It
            opens the window anywhere; the SPIN button there says "Spin in a
            safe area" where it cannot turn.  Transform and opacity only (this
            rail is over the WebGL canvas, TRAPS section 42). */}
        <div className="bt-zone-header__balance">
          {spinSt.known && !spinSt.open && S._serverCaps && S._serverCaps.loginspin ? (
            <button type="button" className={'bt-zone-header__spin' + (spinSt.avail ? '' : ' is-spent')} data-login-spin-btn={spinSt.avail ? 'ready' : 'spent'}
              aria-label={spinSt.avail ? 'Free daily spin' : 'Free daily spin, already spun today'}
              style={{ touchAction: 'manipulation' }}
              onClick={() => { if (spinSt.avail) loginSpinBus.open(); else loginSpinBus.note(loginSpinNextWords()); }}>
              <img src={LOGIN_SPIN_URLS[2]} alt="" draggable={false} />
            </button>
          ) : null}
          {spinNote ? <span className="bt-zone-header__spinnote" data-login-spin-note="1" role="status">{spinNote}</span> : null}
        </div>
      </header>

      {showDev && DevPanelC && <DevPanelC onClose={() => setShowDev(false)} />}

      {confirming && (
        <div
          onPointerDown={() => setConfirming(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: 'rgba(5, 9, 12, 0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: 'min(280px, calc(100vw - 48px))',
              background: COL.bg,
              border: `1px solid ${COL.borderStrong}`,
              borderRadius: 12,
              padding: '14px 14px 12px',
              boxShadow: '0 14px 30px rgba(4,7,9,.38)',
              fontFamily: 'Source Sans 3, sans-serif',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: COL.text }}>Leave the world?</div>
            <div style={{ fontSize: 12, color: COL.text2, marginTop: 4 }}>
              {'You\u2019ll log out to the title screen. Your bro is saved.'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="bt-chisel bt-chisel--chip"
                style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 700, color: COL.text2 }}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                /* v2.3.2421: --danger because it reads as an exit (since
                   v2.3.4123 it always is one) */
                className="bt-chisel bt-chisel--danger"
                style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 800 }}
                onClick={doExit}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
