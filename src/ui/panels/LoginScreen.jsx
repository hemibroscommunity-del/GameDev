import React from 'react';
import { BUILD_INFO } from '../BuildBadge.jsx';
import { AccountModal } from '../account/AccountModal.jsx';

/* ═══ v2.3.1814: THE LOGIN SCREEN ═══
 *
 * Owner: "a new login screen needs to be made (re use the same splash
 * screen).  It should have button for Login (put in key) or create new
 * character.  The button for create new character launches the splash
 * screen where you do the trait picker."
 *
 * Before this, the character creator WAS the front door: every load dropped
 * you straight into the trait picker with an "Already have a character?"
 * link tucked underneath.  That ordering only made sense while a character
 * was something you re-made every session.  Now that name and traits are
 * permanent (server/src/join.js, `char:<id>`), creating one is the rarer
 * act of the two and returning is the common one, so the two get equal
 * billing and the creator sits behind a deliberate choice.
 *
 * SAME SPLASH, deliberately.  This reuses the creator's background art and
 * the `.bt-cc-*` button system rather than introducing a second pre-game
 * look — the owner asked for the same splash screen, and a login door that
 * looks like a different app is the exact complaint that got the account
 * modal restyled in v2.3.1576.
 *
 * Note there is no third "continue as this device's character" button: when
 * this device's key already has a character, the player never reaches this
 * screen at all — they go straight into the game, which is the other half
 * of the owner's ask.
 */
export const LoginScreen = ({ onCreateNew, checking }) => {
  const [showAccount, setShowAccount] = React.useState(false);

  /* ═══ v2.3.1818: WARM THE CHARACTER WHILE NOBODY IS WAITING ═══
     Owner: "loading character assets seems slow (no char in image)."

     The creator's portrait fetches the body sheet, body-tops.json and the
     trait art on its FIRST draw, and it composites offscreen and blits at
     the end so the previous frame survives a redraw.  On the very first
     draw there is no previous frame — so the stage sits EMPTY for as long
     as those fetches take, which is exactly the blank platform in the
     owner's screenshot.

     This screen is the fix's opportunity as much as its location: until
     v2.3.1814 the creator WAS the landing screen and there was no earlier
     moment to warm anything.  Now a player sits here deciding between two
     buttons, which is dead network time by definition.

     Fire-and-forget, and deliberately not awaited: nothing on this screen
     depends on it, and a slow phone must never have its login button
     gated on prefetching art for a path it might not take.  Everything
     lands in the same image cache drawCharacterPortrait reads, so a hit
     costs nothing and a miss is what we have today. */
  React.useEffect(() => {
    let cancelled = false;
    /* Dynamic import so the portrait module is not pulled into the login
       screen's own critical path — the point is to spend IDLE time, not to
       make this screen heavier to show. */
    import('@/rendering/characterPortrait.js').then((m) => {
      if (cancelled || !m || typeof m.prewarmPortraitDirs !== 'function') return;
      /* Read the live catalogs rather than passing nothing: a returning
         player's stored look is already in them (v2.3.1814), so this warms
         the traits they will actually see instead of only the bare body. */
      Promise.all([
        import('@/rendering/traits/hairCatalog.js'),
        import('@/rendering/traits/facialHairCatalog.js'),
        import('@/rendering/traits/headwearCatalog.js'),
      ]).then(([hair, beard, hat]) => {
        if (cancelled) return;
        try {
          m.prewarmPortraitDirs({
            hair: hair.getHair(), facialHair: beard.getFacialHair(), headwear: hat.getHeadwear(),
          });
        } catch (e) { /* a cold cache is the status quo, never an error */ }
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* Cache-busted on the build version: these are new files at a new path,
     but they will be re-cut from the sheet again and a CDN edge holding the
     old crop is exactly the "it looks fine for me" report. */
  const art = (n) => `/ui/welcome/title/${n}.png?v=${BUILD_INFO.version}`;

  return (
    <div className="bt-name-modal bt-login-modal">
      {/* The SAME painted backdrop the creator uses — same element, same
          loop, same iOS inline-autoplay contract (muted + playsInline).
          The owner asked to reuse the splash screen, and reusing the class
          rather than re-describing it is what keeps that true when the art
          or the gradient is next retouched. */}
      <video
        className="bt-cc-bgvideo"
        src="/ui/welcome/bg-loop.mp4"
        poster="/ui/welcome/bg.webp"
        autoPlay muted playsInline loop preload="auto"
        aria-hidden
      />
      {/* v2.3.1823: gold motes drifting past the title.  Six empty <i>s
          because the animation is entirely CSS — this screen has no game
          loop, and a rAF here would compete with the portrait prewarm below
          for the one thing that actually matters on it. */}
      <div className="bt-login-motes" aria-hidden>
        <i /><i /><i /><i /><i /><i />
      </div>
      <div className="bt-login-shell">
        {/* v2.3.1823: the logo, its atmospheric backing and the BRO TOWN
            banner are ONE unit — the haze is sized off this box, so wrapping
            them is what keeps it tracking the logo's clamp instead of needing
            its own hand-kept numbers.  Both marks are slices of the owner's
            sheet (tools/gear/slice-splash-art.mjs). */}
        <div className="bt-login-title">
          <img
            src={art('logo')}
            alt="Hemi Bros"
            draggable={false}
            className="bt-login-logo"
          />
          {/* The shimmer uses the logo as its own mask, so the highlight can
              only ever fall on the lettering.  The URL goes in as a custom
              property because a CSS mask cannot read an <img>'s src, and the
              height is pinned to the logo so the mask does not stretch over
              the banner below it. */}
          <div
            className="bt-login-shine"
            aria-hidden
            style={{ '--lg-logo': `url("${art('logo')}")` }}
          />
          <img
            src={art('banner')}
            alt=""
            draggable={false}
            className="bt-login-banner"
          />
        </div>

        <div className="bt-login-actions">
          {/* The one gold primary on this surface — Lantern Slate allows
              exactly one, and coming back is the common path. */}
          {/* The plate art carries its own label, so the <button> keeps a
              visually-hidden text node: that is what screen readers announce
              and what the QA scenario matches on. */}
          <button
            type="button"
            className="bt-login-btn bt-login-btn--key"
            data-tut="login-key"
            disabled={checking}
            onClick={() => setShowAccount(true)}
          >
            <span>Log in with your Key</span>
          </button>

          <button
            type="button"
            className="bt-login-btn bt-login-btn--new"
            data-tut="login-create"
            disabled={checking}
            onClick={onCreateNew}
          >
            <span>Create Character</span>
          </button>
        </div>

        {/* Said once, HERE, rather than after the fact: the key is the
            account, and a player who does not know that loses a character
            to a cleared browser.  The creator never had a good place for
            it — by then you are already halfway through making someone. */}
        <div className="bt-login-note">
          {checking
            ? 'Checking for your character…'
            /* v2.3.1823: the owner's own wording, off their art sheet — the
               longer version ran to three lines at the bottom of a phone,
               which is a paragraph competing with the buttons rather than
               the "small unobtrusive text" the brief asked for. */
            : 'Your Login Key lets you access your character on any device.'}
        </div>
      </div>

      {showAccount && <AccountModal loginDoor onClose={() => setShowAccount(false)} />}
    </div>
  );
};
