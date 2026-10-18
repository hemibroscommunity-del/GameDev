# New Login Keys, made by the server (v2.3.3355)

> The owner, 2026-10-18, choosing the key: "8 short words"; recovery, their
> own tool only; a short note to players. Step 2 of the login plan; step 1 is
> docs/specs/device-lock.md.

## What changes

A Login Key used to be short, and each phone made its own. Now the server
makes them: **eight short words**, like `crowd-crate-yoga-eagle-rule-agony-mop-grove`.

- **The words:** 1,422 of them, the EFF Long Wordlist's words of five letters
  or fewer, less 55 taken out (brand names, illness and body words, insults,
  and one with a dash). Eight drawn at random: 83.8 bits, far past any guessing.
  `server/src/keywords.js`; credited in CREDITS.md.
- **Kept only as a fingerprint:** the server never stores a key, only its
  SHA-256 (`btk2|` + the key), so it can never show a key twice.
- **Good from any device.** A new key is strong enough that it needs no device
  lock: type it at the door on a new phone and you play.

## Who gets one, and when

- **A character an older phone made**, played on one of its own devices (the
  old key and the device lock let it in): once its join is in, the server hands
  that phone a new key (`key_new {key, id}`).
  - The phone keeps the old key beside it (`bt_passphrase_old`) until a join
    with the new key gets in, so a lost message or a rolled-back server loses
    nothing.
  - **Each device gets its own key**, since the server keeps none to hand out
    twice. Any of a character's keys works on any device.
  - The old key keeps working on the character's own devices (the device lock
    holds it), so its other devices come in with it and are handed theirs.
- **A new character:** its phone makes a first key as before, its first join
  registers it, and the server hands it a new key at once. The first key is
  **retired** the first time the new one is used: no device holds it any more.
- Not again within 10 minutes for the same device, so a phone that cannot keep
  one doesn't cost a write every join.

## Refusals

| Reason | Close | When |
|---|---|---|
| `key` | 4017 | a new-shaped key that isn't this character's (taken back, or never made by the server), or an old key that was retired. A new-shaped key with no character is never registered from a phone. |
| `locked` | 4018 | five wrong keys for this id within a minute (anyone's). It used to answer `auth`, which makes a phone throw its key away for a fresh character, so anyone could cost a player their character on that phone. A matching **new** key goes through a lockout. |
| `device` | 4016 | unchanged (step 1): the right old key from a device the character was never played on. |

Never `auth` for any of them. The phone:
- `key`: first, if it holds a new key, it asks the door once whose key it is.
  A phone that never heard the key's id (a key put on it by hand, its kept id
  lost) joined as the wrong character, so it takes the id the door names and
  joins again. Then it goes back to the old key it kept, once, if a new one
  never got in. Otherwise it shows the key screen: "This Login Key no longer
  works", the code, and **Use a Login Key**, which opens the door's key form.
- `locked`: waits the minute and joins again.
- `auth` with a new key (a server from before new keys): treated as `key`,
  never a fresh character.

## The door and the restart

`/api/account/login {phrase}` takes a new key in any spelling (capitals,
spaces): it finds the character through `keyidx:<fingerprint>`, answers its
`id` and `kv: 2` (the phone keeps the id, as it is not made from the key) and
`device: 'ok'`. An old key whose character's first key was retired answers
`reason: 'keychanged'`. `/api/account/reset` takes a new key from any device.
Neither writes anything.

## The owner's tools

In the Test panel's **Player logins**:
- **Forget all its devices** now also takes back every new key: whoever got in
  may hold one.
- **Give it a new key** (two taps) is the full reset for a stolen character,
  or for a player who lost every device:
  - whoever plays it is put out with the key screen;
  - every device is forgotten and every key taken back;
  - the old key is retired;
  - one new key is shown in the panel, once, for the owner to send its player.

  The route is `POST /api/admin/key-new {playerId}`, which answers `key`. The
  admin log never has it.
- **Let one new device in** is unchanged. It works for the old key.

## Storage

`auth:<id>` gains:
- `keys: [{h, d, at, ok}]`: up to 12, one a device;
- `fresh: 1`: a new character's first key, retired at its new key's first use;
- `oldGone: 1`: the old key retired.

`keyidx:<h>` `{id, at}`: a key's character, for the door. Written in the same
put as the record that holds the key; deleted when the key is taken back. A
stale one finds nothing, because the record decides.

## The phone

- `src/networking/index.js`:
  - `isNewKey`, `normalizeNewKey`;
  - `idForKey`: an old key's id is worked out as ever; a new key's comes from
    `bt_key_ids`, then the roster's row;
  - `setActiveKey`;
  - `getBtPlayerId` and BroTown's start-up use `idForKey`;
  - a new device token's random part comes from `crypto`.
- `charRoster.js`: rows keep a new key's id (`_idOf`); `swapKey` gives a row
  its new key and tombstones the old one in the cross-site mirror, which
  carries a new key's id (`i`).
- `wsClient.js`:
  - the join sends `kv: 2`, and, for a new key, the id kept beside it (the
    start-up check at the door tells a page that started before it knew);
  - `key_new` is handled in the direct switch, never from a relay or for
    another id;
  - the refusals above.
- **Account card:** a new key as eight numbered words, "works on any phone or
  computer".
- **The door:** takes a new key typed any way, and keeps its id.

## The switch

`keys2: false`: no key is handed out. Keys already made still work, because a
switch that locked out every holder would be worse than what it switches off.

## Tests

- `login-keys` suite (73 checks): the real join, door, restart and admin
  routes, and the phone's own copy of a key's shape and spelling
  (networking/index.js, rosterCookie.js) held to the worker's.
  - Its checks include that the key is never in storage, that the record and
    its index go in one write, and that nothing is written on a later join.
  - The owner's tools write the record before they take keys out of the
    index, so a failure between the two leaves no taken key working; a stale
    index entry finds nothing.
  - 45 deliberate breaks of the code, each caught.
- `mp-newkey`, on phone-sized pages, nothing stubbed:
  - an older phone's character is handed eight words, which the Account card
    shows;
  - the new key plays from a new phone's door with no pass, while the old key
    there is still refused;
  - a new character's first key is retired;
  - the owner's Give it a new key, through the real Test panel.

## Files

- `server/src/keywords.js`, `server/src/loginkeys.js` (new);
- `server/src/join.js`, `account.js`, `devicelock.js`, `index.js`, `admin.js`;
- `src/networking/index.js`, `charRoster.js`, `rosterCookie.js`, `wsClient.js`;
- `src/ui/BroTown.jsx`, `account/AccountLoginForm.jsx`,
  `account/AccountKeyCard.jsx`, `DeviceScreen.js`,
  `panels/CharacterPicker.jsx`, `panels/DevPanel.jsx`.
