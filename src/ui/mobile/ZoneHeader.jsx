import { coinArtFor } from '@/game/coinArt.js';   /* v2.3.3734: the owner's coin piles */
import React, { useEffect, useRef, useState } from 'react';
import { COL, getState } from './dash/common.js';
import { rosterCount } from '../../networking/charRoster.js'; /* v2.3.2421 */
import { calm as lifeCalm } from './dash/bagLife.js'; /* v2.3.2815: the purse's coin flip */
import { placeName } from './placeName.js'; /* v2.3.3974: the land you stand in, or BroTown (was the Wheel's name, v2.3.3009) */
import { testModeOn } from '../../game/testMode.js'; /* v2.3.3430: the owner's test mode tag */
import { achvLive, achvApTotal } from '../../game/achievements.js';   /* v2.3.3553: your AP on the bar */
import { ACHV_MEDAL_SRC } from '../../data/achievements.js';         /* v2.3.3553: the owner's medal */
import { apRise, apWords, apGainWords } from '../../game/apChip.js';  /* v2.3.3553 */
import { dashboardPanelBus } from './dashboardPanelBus.js';            /* v2.3.3553: the AP opens its page */
import { onXpBar, xpBarShown, xpGainWords, xpToNextWords } from '../../game/xpBar.js'; /* v2.3.3695: the XP bar */
import { XpTrack } from './XpTrack.jsx';                                  /* v2.3.3739: its white gain bar and "45 / 120" */
import { XP_BAR_ICONS, XP_BAR_LABELS } from './xpBarArt.js';           /* v2.3.3695: its skill pictures */
import { PlaceChip } from './NmlBadge.jsx';                             /* v2.3.3765: No man's land's pill, right of the title; v2.3.3974: the place chip, always */
import { barNarrow, barNumber, BAR_GOLD_SHORT, BAR_AP_SHORT } from '../../game/barNumbers.js';   /* v2.3.3765: big numbers short on a narrow bar */

/* ═══ v2.3.2892 -> v2.3.3974: THE HOUR'S ICON IS GONE ═══
   v2.3.2892 put a day/night icon beside the zone name (the owner: "Add a time
   of day icon next to current map name").  Night is off and the icon took no
   tap, so it said nothing a player could use; v2.3.3974 gives its room to
   the place chip (NmlBadge.jsx PlaceChip). */

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
  /* v2.3.2421: does this device actually hold more than one bro?  Guarded
     because charRoster reads localStorage, which throws in a private window
     rather than returning empty -- and a header that throws takes the whole
     world chrome with it. */
  let _many = false;
  try { _many = rosterCount() > 1; } catch (e) { _many = false; }
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
  const goldSeen = useRef(null);   /* v2.3.2815: the purse's coin flip */
  const goldFlips = useRef(0);
  /* v2.3.3553: the AP's rise, as the purse's (game/apChip.js) */
  const apSeen = useRef(null);
  const apRises = useRef(0);
  const apGain = useRef(0);
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

  /* v2.3.2320: the same field, read the same way as every other readout in
     the game — `S.rpg.coins`, live, never cached here.  Under protocol v2
     `coins` arrives only in the ticks where it CHANGED (wsClient's
     present-gated write), so a component that kept its own copy would show a
     stale purse forever.  The 500ms force-render above already repaints this
     rail, so the number is at most half a second behind settlement. */
  const gold = (S.rpg && (S.rpg.coins || 0)) || 0;
  /* v2.3.2815: gold landing spins the coin and bumps the number, once per
     rise (the key change below remounts both, which replays the one-shot).
     Transform only -- this rail is over the WebGL canvas (see below). */
  /* (not in the first seconds: that rise is the purse loading, not a payday) */
  if (goldSeen.current != null && gold > goldSeen.current && !lifeCalm()
    && Date.now() - mountedAt.current > 2500) goldFlips.current++;
  goldSeen.current = gold;
  const flip = goldFlips.current;

  /* ═══ v2.3.3553: YOUR ACHIEVEMENT POINTS, ALWAYS IN SIGHT ═══
     The owner: "Achievement points should be a prominent part of the
     experience in brotown."  The medal and your AP ride the bar, left of the
     zone name, opposite the gold -- the WORKER's number (achvApTotal), only
     against a worker that grants achievements (caps.achievements).  A rise
     flies a "+N" up into it and bumps the number (game/apChip.js), never in
     the first moments (the record loading) or under calm motion.  A tap
     opens the Achievements page under More, as every other way to it does
     (SkillsPanel's AP, a card's title). */
  const apOn = achvLive(S);
  const ap = apOn ? achvApTotal(S) : 0;
  /* a rise counts only once the worker's record has come (achv_state): the
     number that arrives with it is where you stand, never "+1,240" at login */
  if (apOn && S._achv && S._achv.known) {
    const g = apRise(apSeen.current, ap, Date.now() - mountedAt.current);
    if (g > 0 && !lifeCalm()) { apRises.current++; apGain.current = g; }
    apSeen.current = ap;
  }
  const apBump = apRises.current;
  /* v2.3.3765: on a narrow bar (an upright phone) a big number is said short,
     so the larger bar still holds the title (game/barNumbers.js) */
  const narrow = barNarrow(typeof window !== 'undefined' ? window.innerWidth : 0);
  /* v2.3.3695: the XP bar -- the skill that last earned, while it is up */
  const xb = S._xpBar || null;
  /* (QA only: `window.__btXpHold` keeps it up while a slow box takes its
     picture, as __btLevelUpFreeze pins the level-up burst; mp-xpbar) */
  const xpOn = xpBarShown(xb, Date.now()) || (!!xb && typeof window !== 'undefined' && window.__btXpHold === true);
  const openAchievements = (e) => {
    if (e) e.stopPropagation();
    /* no focus ring left on it once the page is open (a key pressed next
       would draw one) */
    try { if (e && e.currentTarget && e.currentTarget.blur) e.currentTarget.blur(); } catch (_e) { /* fine */ }
    try { dashboardPanelBus.open('more'); dashboardPanelBus.push('achievements'); } catch (_e) { /* no dashboard */ }
  };

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
    /* v2.3.2447: the door no longer opens the character list by itself
       (owner: "Player should need to tap continue or create a character").
       This button, when it reads "Switch Bro", promises "You'll go to your
       list of bros" -- and the tap on it IS the tap.  So it hands the door a
       one-shot note to open the list; "Log Out" (one bro, nothing to switch
       to) lands on the plain door.  LoginScreen consumes the note on mount. */
    if (_many) { try { sessionStorage.setItem('bt_open_list', '1'); } catch (e) {} }
    requestAnimationFrame(() => setTimeout(onExit, 30));
  };

  return (
    <>
      <header className="bt-zone-header" aria-label="Current zone">
        <div className="bt-zone-header__left">
        <button
          type="button"
          className="bt-chisel bt-chisel--chip bt-zone-header__logout"
          aria-label={_many ? 'Switch bro, or log out' : 'Log out to the character screen'}
          onClick={() => setConfirming(true)}
        >
          <img src={`/icons/ui/logout-door-icon.svg${V}`} alt="" draggable={false} />
        </button>
        {/* v2.3.3553: your AP, the owner's medal before it; a tap opens the
            Achievements page.  A flat fill and text-shadow only: the rail is
            over the WebGL canvas (TRAPS section 42). */}
        {apOn && (
          <button type="button" className="bt-zone-header__ap" data-ap-chip="1" data-ap={ap}
            aria-label={`${apWords(ap)} achievement points. Open Achievements`}
            onClick={openAchievements}>
            <img key={'m' + apBump} className={apBump ? 'bt-purse-flip' : undefined}
              src={ACHV_MEDAL_SRC} alt="" draggable={false} />
            <span key={'a' + apBump} className={apBump ? 'bt-purse-bump' : undefined}>{narrow ? barNumber(ap, true, BAR_AP_SHORT) : apWords(ap)}</span>
            {apBump && apGain.current > 0 ? (
              <span key={'g' + apBump} className="bt-ap-gain" data-ap-gain={apGain.current} aria-hidden="true">
                {apGainWords(apGain.current)}
              </span>
            ) : null}
          </button>
        )}
        </div>
        <div className={'bt-zone-header__mid' + (xpOn ? ' bt-zone-header__mid--xp' : '')}>
        <div
          className="bt-zone-header__title"
          /* v2.3.2596: the zone-entry banner's DOCK TARGET.  A data hook rather
             than the class name because the class is a style handle that a
             restyle is free to rename, and the banner measures this box from
             outside React (the same arrangement `data-purse` already gives the
             trade receipt's gold toss one rail over). */
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
        {/* ═══ v2.3.3765: NO MAN'S LAND, JUST RIGHT OF THE TITLE ═══
            The owner: "I think the no man's land pill would work better just to
            the right of the Brotown name at the top (you can cut it away same as
            when earning xp in a weapon)".  Beside the title, never inside it
            ([data-zone-title] is the banner's dock target); cut away with the
            title while the XP bar is up (game.css bt-zone-header__mid--xp).  Its
            own 250 ms clock (NmlBadge.jsx NmlPill). */}
        {/* ═══ v2.3.3974: ...AND IT IS THE PLACE CHIP NOW, ALWAYS UP ═══
            Safe / PvP · Lv 6-8 / Outlaw (NmlBadge.jsx PlaceChip); a tap
            opens the window with your own numbers. */}
        <PlaceChip getS={getState} />
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
        {/* ═══ v2.3.2320: THE PURSE LIVES HERE NOW ═══
            Owner: "Move gold amount display to very top right on the top bar
            that lists the zone name."

            This column was an EMPTY 38px spacer whose only job was optical —
            match the logout chip so the title centred on the SCREEN rather
            than in the leftover (the v2.3.1333 note above).  It is named
            `__balance` because a balance is what it was always for; it just
            never held one.  Now it does, and the symmetry it was protecting
            is spent on the thing it was reserved for.

            THIS IS A MOVE, NOT A COPY.  The band purse (IdentityStrip) and
            the landscape chip (BottomDashboard's LandGoldChip) both retire in
            the same change — the one-count rule that killed the v2.3.1563
            floating chip ("two live gold counts on one screen disagree the
            moment one of them lags") applies to this one exactly as hard, and
            it is why the readout could not simply be added here.

            NO `.bt-coin-glimmer` ON THIS COPY.  The band's number wore it and
            the Hero strip still names it, and it is `background-clip:text` +
            `-webkit-text-fill-color: transparent` under a 2.8s infinite
            animation.  That was written for an opaque surface (the character
            card), and every surface it has run on since has been opaque too.
            This rail is `position:fixed` directly over the live WebGL canvas,
            which is the compositing arrangement TRAPS §42 records as the iOS
            grain hazard (the v2.3.948 charge pie, the v2.3.1236 joystick
            bases).  A flat gold fill costs one shimmer and buys the primary
            platform out of a known trap.

            `data-purse` travels with the number, so the trade receipt's gold
            toss still finds it (TradeWindowPanel's landingRect).  It flies UP
            to the rail now instead of down into the band — the coins go to
            where the coins are, which is the promise that animation makes.

            pointer-events stays inherited-`none` from the rail: this is a
            readout over the world, and anything here that took a touch would
            steal it from the game underneath. */}
        <div className="bt-zone-header__balance" data-purse="1"
          aria-label={`${gold} gold`}>
          <img key={'c' + flip} className={flip ? 'bt-purse-flip' : undefined}
            src={coinArtFor(gold)} alt="" draggable={false} />{/* v2.3.3734: the owner's pile for your gold */}
          <span key={'n' + flip} className={flip ? 'bt-purse-bump' : undefined}>{narrow ? barNumber(gold, true, BAR_GOLD_SHORT) : Number(gold).toLocaleString()}</span>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: COL.text }}>{_many ? 'Switch bro?' : 'Leave the world?'}</div>
            <div style={{ fontSize: 12, color: COL.text2, marginTop: 4 }}>
              {_many
                ? 'You\u2019ll go to your list of bros. This one is saved.'
                : 'You\u2019ll return to the character screen.'}
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
                /* v2.3.2421: --danger only when it reads as an exit.  That red
                   is the game's destroy colour (forge salvage, Leave Clan);
                   on a switch nothing is destroyed and the bro is saved, so
                   wearing it here is the control lying twice. */
                className={_many ? 'bt-chisel bt-chisel--chip' : 'bt-chisel bt-chisel--danger'}
                style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 800,
                  color: _many ? COL.text : undefined }}
                onClick={doExit}
              >
                {_many ? 'Switch Bro' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
