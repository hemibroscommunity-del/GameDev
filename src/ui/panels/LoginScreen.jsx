import React from 'react';
import { BUILD_INFO } from '../BuildBadge.jsx';
import { CharacterPicker } from './CharacterPicker.jsx';                 /* v2.3.1923 */
import { rosterFull, rosterCount, ROSTER_MAX } from '@/networking/charRoster.js';  /* v2.3.1923, v2.3.2111 */

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
 *
 * ═══ v2.3.1861: ...EXCEPT AFTER A LOGOUT ═══
 * That note was true of every road here but one.  Logging out (v2.3.1840)
 * lands on this screen deliberately, and it KEEPS the key — the passphrase
 * is the character.  So there is exactly one way to stand here holding a
 * character, and from there "Create Character" was a promise the game could
 * not keep: the creator ran, and the worker handed back the stored record
 * anyway (charLock).  The player got their old character wearing a new
 * character's ceremony — which is how a "brand new" character turns up with
 * combat points already on it (mp-freshpoints).
 *
 * Owner: "when you try to create a new character and there's already one
 * just have a pop up notification appear that you already have a character
 * and ask to continue otherwise it'll be overwritten with the new
 * character."  So the button asks first, and both answers now do what they
 * say.
 *
 * ═══ v2.3.1923: ...AND THEN THERE WAS NO OVERWRITING LEFT TO WARN ABOUT ═══
 * Owner: "'Continue' is a better button for launching a window that allows
 * you to enter your passkey if you have a specific character you want to play
 * on another device.  Otherwise it makes sense to just present you with a
 * list of characters you've made (in order of most recent at the top) to
 * choose from to continue playing. ... Up to 10 characters per device.
 * Otherwise it won't let you create new ones."
 *
 * Two things change on this screen, and the second is a consequence of the
 * first.
 *
 * THE KEY BUTTON BECOMES "CONTINUE".  It was named after its mechanism
 * because its mechanism was all it had: the only way back in was to type a
 * Login Key.  Now the device keeps a roster of the characters it has made
 * (src/networking/charRoster.js), so the common road back is picking one off
 * a list and the key box is the road for a character that lives somewhere
 * else.  "Continue" is the name of the thing the player wants; the window
 * behind it holds both ways to get it.
 *
 * THE v2.3.1861 OVERWRITE WARNING IS RETIRED.  It existed because a device
 * held exactly one character and making another replaced it — the dialog was
 * honest about a genuinely destructive act.  With up to ten per device,
 * creating a character no longer costs you one, so the warning would be
 * describing something that does not happen.  What replaces it is the cap:
 * at ten, Create says why it cannot and points at the picker, where deleting
 * a character is how a slot is freed.
 */
export const LoginScreen = ({ onCreateNew, onPlay, checking }) => {
  /* ═══ v2.3.2111: IF THIS DEVICE HAS CHARACTERS, THE LIST IS THE DOOR ═══
     Owner: "Can you actually provide a list of characters like you did before
     when people try to join the game ... People will probably have a bunch of
     them."

     Standing on this screen at all means the key this device holds has no
     character behind it — the boot check routes straight into the world when
     it does (BroTown.jsx).  So there are exactly three ways to be here, and
     the list is the right answer to all of them: a build whose origin restored
     a roster it cannot auto-adopt (v2.3.2110/2111), a logout, and a delete of
     the character that was active.  In every one the player is looking for a
     character they already have, and making them find the button that reveals
     the list first was a tap spent on the only thing they came to do.

     NOT WHILE `checking`, and that is not a nicety.  This screen is also what
     renders during the boot check, whose usual answer is "straight into the
     world" — opening the list under it would flash a list at someone who is
     already on their way in, and hand them a row to tap in the window before
     that resolves.  So the list waits for the check to settle into a real
     door, and opens on that edge.

     Once, tracked on a ref: a player who taps Back wanted this screen, and
     re-opening the list under them on the next render would be the screen
     arguing with them. */
  const [showPicker, setShowPicker] = React.useState(function () {
    try { return !checking && rosterCount() > 0; } catch (e) { return false; }
  });
  const autoOpened = React.useRef(!checking);
  React.useEffect(function () {
    if (checking || autoOpened.current) return;
    autoOpened.current = true;
    try { if (rosterCount() > 0) setShowPicker(true); } catch (e) {}
  }, [checking]);
  /* v2.3.1923: the "this device is full" gate — see the Create button. */
  const [warnFull, setWarnFull] = React.useState(false);
  /* No roster count is held here on purpose.  The picker owns the list while
     it is open and mutates it (delete); a second copy on this screen would
     only exist to go stale.  The one question this screen asks — is the
     device full — is asked at the moment Create is pressed. */

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
  /* v2.3.2207 (owner: "there's still a static shine on the Hemi bros logo and
     diamonds framing 'bro town' that I want gone"). The marks were painted
     into the sheet, so the page loads CLEANED cuts -- logo-plain / banner-plain,
     built by tools/ui/clean-title-marks.mjs from the slicer's own output. The
     original names stay free for the slicer; see that tool's header. */
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
          {/* v2.3.2206: the shimmer lives INSIDE a wrapper that shrink-wraps
              the logo, so `inset:0` gives it the image's own box. It used to
              be a sibling sized against .bt-login-title -- logo plus gap plus
              banner -- and swept a mask 22px lower than the lettering. */}
          <span className="bt-login-logowrap">
            <img
              src={art('logo-plain')}
              alt="Hemi Bros"
              draggable={false}
              className="bt-login-logo"
            />
            {/* The shimmer uses the logo as its own mask, so the highlight
                can only ever fall on the lettering.  The URL goes in as a
                custom property because a CSS mask cannot read an <img>'s
                src; the BOX now comes from the wrapper above. */}
            <div
              className="bt-login-shine"
              aria-hidden
              style={{ '--lg-logo': `url("${art('logo-plain')}")` }}
            />
          </span>
          <img
            src={art('banner-plain')}
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
          {/* v2.3.1923: "Continue" (was "Log in with your Key").  Same plate
              art, same single-gold-primary slot; what changed is what is
              behind it — the character list first, the key box under it. */}
          {/* v2.3.1954: ...and the PLATE says it too now.  v2.3.1923 renamed
              only this hidden text node, so for a whole version the screen
              reader said "Continue" while the button still read LOG IN WITH
              YOUR KEY — the owner's report.  The word is painted into the
              artwork (btn-continue.png, recomposed from the plate's own
              lettering by tools/ui/relabel-login-plate.mjs), so the two have
              to be changed together; mp-keylogin asserts the pair. */}
          <button
            type="button"
            className="bt-login-btn bt-login-btn--key"
            data-tut="login-key"
            disabled={checking}
            onClick={() => setShowPicker(true)}
          >
            <span>Continue</span>
          </button>

          <button
            type="button"
            className="bt-login-btn bt-login-btn--new"
            data-tut="login-create"
            disabled={checking}
            /* v2.3.1923: the cap, not the overwrite warning.  Creating a
               character costs nothing you already have until the tenth one,
               and at that point the answer is a real refusal with a way
               out — not a dialog asking permission to destroy something. */
            onClick={() => { if (rosterFull()) setWarnFull(true); else onCreateNew(); }}
          >
            <span>Create Character</span>
          </button>
        </div>

        {warnFull && (
          <div
            className="bt-login-warn-scrim"
            data-tut="login-full-warn"
            onPointerDown={() => setWarnFull(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9600,
              background: 'rgba(5, 9, 12, 0.62)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: 'min(320px, 100%)',
                background: '#1E2E34',
                border: '1px solid rgba(229, 237, 233, 0.16)',
                borderRadius: 12,
                padding: '16px 16px 14px',
                boxShadow: '0 16px 34px rgba(4,7,9,.45)',
                fontFamily: 'Source Sans 3, sans-serif',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F4F0E7' }}>
                This device is full
              </div>
              <div style={{ fontSize: 13, color: '#B6C1BE', marginTop: 6, lineHeight: 1.35 }}>
                {/* v2.3.2193b: this used to say "Delete one under Continue to
                    make room", and the owner has since removed delete from that
                    window ("Remove the delete character button from this
                    menu").  Nothing else in the game deletes a character, so
                    the sentence was pointing at a control that no longer
                    exists — the one thing a dead end must not do is give
                    directions.  Says the cap plainly instead, until delete has
                    a home again. */}
                You have all <b style={{ color: '#F4F0E7' }}>{ROSTER_MAX}</b> characters
                this device can hold. Play one of them instead.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {/* Somewhere to GO, not just a refusal.  It used to say
                    "Manage characters", because the picker was where a slot got
                    freed; since v2.3.2193b it cannot free one, so the button
                    offers the thing that screen CAN still do.  Same target, an
                    honest label. */}
                <button
                  type="button"
                  data-tut="login-full-manage"
                  className="bt-chisel bt-chisel--chip"
                  style={{ minHeight: 44, fontSize: 14, fontWeight: 800, color: '#F4F0E7' }}
                  onClick={() => { setWarnFull(false); setShowPicker(true); }}
                >
                  Choose a bro
                </button>
                <button
                  type="button"
                  className="bt-chisel bt-chisel--chip"
                  style={{ minHeight: 40, fontSize: 13, fontWeight: 800, color: '#B6C1BE' }}
                  onClick={() => setWarnFull(false)}
                >
                  Never mind
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* v2.3.2185 (owner: "add the version back to the home splash screen
            somewhere").  It was not deleted — v2.3.221 gated BuildBadge behind
            ?dev=1 so the player-facing build would not carry a debug HUD, and
            the version went with it.  That gate is right for the in-game badge
            and wrong for this screen: the splash is the one surface where
            "which build am I on?" is a QUESTION A PLAYER ASKS, because the
            home-screen icon can hand them a cached bundle (see buildWatch.js —
            a tab left open across a deploy keeps running the old code).
            The SHA, not the version, is what actually identifies a build:
            package.json's number moves by hand and had sat at 2.3.1201 for ~900
            tags, whereas __BUILD_SHA__ comes from `git rev-parse` in the same
            build that emits version.json, so it is the same string buildWatch
            compares.  Both are shown; the sha is the one to read out. */}
        <div className="bt-login-ver" title={BUILD_INFO.time ? `Built ${BUILD_INFO.time}` : undefined}>
          v{BUILD_INFO.version} · {BUILD_INFO.sha}
        </div>
      </div>

      {showPicker && (
        <CharacterPicker
          onPlay={onPlay}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};
