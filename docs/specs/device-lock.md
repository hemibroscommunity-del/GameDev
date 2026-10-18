# A character's login key works on the devices it is played on (v2.3.3344)

> The owner, 2026-10-18, choosing how: on at once; the owner's own tool the way
> onto a new device for now; a short note to players.

## What changes

A Login Key used to be enough to play a character from anywhere. A key is a few
words: it can be written down, shared, seen over a shoulder or guessed at, and
the server had nothing else to go on.

Now the server also asks which **device** the key comes from. Every browser the
game runs in keeps a random token of its own (`bt_device`), sent with each join.
The bot checks already read it.

- **Its own devices.** A character keeps the devices its key has been used from,
  up to 12. On one of those, nothing changes.
- **Any other device** is refused. The player sees a screen, "This character is
  played on another device", with a code to give the game's owner: the
  character's player id.
- **The owner lets one new device in** from the Test panel's **Player logins**
  section, with the code. For 30 minutes, one new device may join that
  character, and it's remembered from then on. The player taps **Try again**.
- **A character no device is known for yet** takes its next device. This is how
  it was for everyone before.
- **The devices the server already knew** are filled in once, the first time the
  rule needs them, from the bot checks' records:
  - each device's characters;
  - each gatherer's last device.
- **The login door** checks first. Typing a key on a new device says the same as
  the screen, with the code, and switches nothing.
- **The character list's restart** works only from one of the character's own
  devices.
- **Forget all its devices** is for a character someone else got into. Whoever is
  playing it is put out and leaves the world, its list is cleared and sealed,
  and nobody can play it until the owner lets one device in.

## For players

- **Most players notice nothing.** They play on their own phone or computer, as
  before.
- **Some players see the screen with the code:**
  - a new phone;
  - a cleared browser;
  - a private window (which forgets its token each time);
  - the iPhone home-screen app after playing in Safari (the two keep separate
    storage);
  - a key shared with a friend.

  They ask the owner, who lets one device in -- only for a request the owner
  knows comes from that character's own player (docs/OPERATIONS.md).

## The wire

| What | Who | Meaning |
|---|---|---|
| `join_rejected {reason: 'device'}`, close **4016** | server -> phone | the right key from a device this character was never played on. Never `auth`: that makes the phone throw its key away for a fresh character. An older phone treats a reason it does not know as final (no new character, no retries). |
| `POST /api/account/login {phrase, device}` | phone -> server | the door's check. A matching key still answers `exists: true`, so an older phone's start-up still finds its character. `device: 'unknown'` means this device could not play it, `'ok'` that it could. |
| `POST /api/account/reset {phrase, confirm, device}` | phone -> server | the character list's restart; `reason: 'device'` from a device it could not play on, and nothing is wiped. |
| `POST /api/admin/device-pass {playerId}` | owner (admin key) | one new device may join this character within 30 minutes. |
| `POST /api/admin/device-forget {playerId}` | owner (admin key) | its devices cleared and sealed, whoever plays it put out; no pass of its own (whoever was put out could take it first). |

`/api/admin/overview`'s `deviceLock` counts:
- logins let in on a known device (`known`);
- first devices taken (`first`);
- passes used (`pass`);
- refusals (`refused`);
- login checks (`checks`);
- whether the one-time fill has run, and what it filled.

## Storage

`auth:<id>` (docs/ARCHITECTURE-HANDOFF.md, the registry) gains:
- `devs: [{d, at}]`: the devices, the oldest added dropped past 12. Written
  only when one is added, never on a join from a known device.
- `pass: {until, at}`: the owner's one-time pass.
- `sealed: true`: after a forget, until a pass breaks it.

`devlock:filled {at, chars, devices}` marks the one-time fill done, so a later
worker never scans again.

## What it doesn't cover

- **The fill misses some devices.** On a device with several characters, the
  bot checks' record forgets a character 30 days after first listing it. That
  character can be refused on a device it really uses. The owner's pass lets it
  back in, once.
- **Someone already in.** If someone got into a character before this, their
  device may be on its list, and the server can't tell them from its player.
  Forget all its devices, then let its player's device in.
- **The key itself.** It stays the same for now. New, longer keys made by the
  server come next.

## The switch

`devicelock: false` in the live flags puts back the join, the login check and
the restart as they were. Nothing is read or written for this.

## Tests

- `device-lock` suite (67 checks): the real join, the account requests and the
  admin routes.
  - I broke the code on purpose in 24 different ways and the suite caught
    every one.
- `mp-devicelock`, on a phone-sized page, nothing stubbed:
  - a character made on its phone plays;
  - its key on a new phone: the screen with the code, one socket, the key kept,
    the phone at home still playing;
  - the owner's pass and Try again: in; the pass spent, a third phone refused;
  - forget all its devices: its player put out with the screen and gone from an
    onlooker's world, refused again, back in with a pass.
- Phone tests: the scenarios that bring a character back in a second browser are
  given that character's device (tools/qa/mp/harness.mjs `newPlayer`'s
  `device`). The ones that type a key on a new device expect the new screen, or
  get the owner's pass first.

## Files

- `server/src/devicelock.js` (new);
- `server/src/join.js`: the join's key check, and a new character's device;
- `server/src/account.js`: the login check and the restart;
- `server/src/admin.js`: the routes and the overview;
- `src/ui/DeviceScreen.js` (new), `src/networking/wsClient.js`: the screen;
- `src/networking/index.js`: the account requests send the device;
- `src/ui/account/AccountLoginForm.jsx`, `src/ui/panels/CharacterPicker.jsx`:
  their messages;
- `src/ui/panels/DevPanel.jsx`: Player logins.
