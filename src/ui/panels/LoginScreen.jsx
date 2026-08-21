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
      <div className="bt-login-shell">
        <img
          src={'/ui/hemi-bros-logo.webp?v=' + BUILD_INFO.version}
          alt="Hemi Bros"
          draggable={false}
          className="bt-login-logo"
        />

        <div className="bt-login-actions">
          {/* The one gold primary on this surface — Lantern Slate allows
              exactly one, and coming back is the common path. */}
          <button
            type="button"
            className="button-primary bt-login-btn"
            data-tut="login-key"
            disabled={checking}
            onClick={() => setShowAccount(true)}
          >
            <img
              src={'/ui/welcome/cc/cc-login-key.webp?v=' + BUILD_INFO.version}
              alt="" draggable={false}
              className="bt-login-keyicon"
            />
            Log in with your Key
          </button>

          <button
            type="button"
            className="bt-cc-btn bt-login-btn"
            data-tut="login-create"
            disabled={checking}
            onClick={onCreateNew}
          >
            Create a new character
          </button>
        </div>

        {/* Said once, HERE, rather than after the fact: the key is the
            account, and a player who does not know that loses a character
            to a cleared browser.  The creator never had a good place for
            it — by then you are already halfway through making someone. */}
        <div className="bt-login-note">
          {checking
            ? 'Checking for your character…'
            : 'Your Login Key is how you reach your character from any device. You can copy it any time from the Account panel.'}
        </div>
      </div>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
    </div>
  );
};
