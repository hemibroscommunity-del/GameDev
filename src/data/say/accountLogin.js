/* v2.3.6354: the Login Key form's words (src/ui/account/AccountLoginForm.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* why a key was not taken, by the worker's refusal code (the `device` one stays in the form: device-words.test reads it there) */
  'accountLogin.errNotFound': 'No character found with that key — check for typos.',
  'accountLogin.errAuth': "That key doesn't match. Check for typos.",
  'accountLogin.errLocked': 'Too many attempts — wait a minute and try again.',
  'accountLogin.errRate': 'Too many attempts — wait a minute and try again.',
  'accountLogin.errUnavailable': "Login isn't available right now — try again later.",
  'accountLogin.errBadRequest': 'That doesn’t look like a Login Key.',
  'accountLogin.errSame': "You're already playing as this character.",
  'accountLogin.errKeyChanged': 'This character has a new Login Key now. Use the new one: it’s on the Account card of a device you play it on, or the game’s owner can give you one.',
  /* the confirm view */
  'accountLogin.found': 'Found it!',
  'accountLogin.continueAs': 'Continue as your {level} character{created}?',
  'accountLogin.level': 'Lv {lvl}',
  'accountLogin.created': ' (created {date})',
  'accountLogin.signOutWarn': 'The character currently on this device will be signed out. Its Login Key is {key} — save it first if you ever want to come back to it.',
  'accountLogin.switching': 'Switching…',
  'accountLogin.continue': 'Continue',
  'accountLogin.cancel': 'Cancel',
  /* the form */
  'accountLogin.head': 'Continue a character from another device',
  'accountLogin.placeholder': 'type your Login Key…',
  'accountLogin.joining': 'Joining…',
  'accountLogin.checking': 'Checking…',
  'accountLogin.logIn': 'Log in',
});
