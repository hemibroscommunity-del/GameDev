# Bot flags in the Test panel (v2.3.3323)

> The owner, 2026-10-17, to "Want me to merge #948 and then start on the bot
> farming holes?": *"Yes"*.

This is fix 9 of the anti-bot review (docs/specs/antibot-review.md §3: "Nobody
sees the flags, and a flag changes nothing").

## What was wrong

`botfp.js` has scored every harvest gesture and written flags to `botstat:`
since v2.3.1146. The only way to read them was this command:

```
curl -H "x-admin-key: KEY" ".../api/botstat?flagged=1"
```

- It used the one header no other admin command uses (they all take
  `Authorization: Bearer`).
- It wasn't in OPERATIONS.md.
- The owner runs the game from a phone.

So nobody ever saw a flag.

## What it does now

- **The Test panel's Bot flags section** (DevPanel.jsx): **Show flagged
  players** lists every flagged player, newest flag first. Each row shows:
  - the name, and online or offline;
  - the last flag in words, and when;
  - how many flags;
  - the counts behind it;
  - the `bp_` id, to kick or freeze by.

  With nobody flagged, it says so. The list loads on demand only, like the
  live flags.
- **GET `/api/admin/dev/botflags`** (devtools.js) answers it, behind the admin
  key like every dev route. It's read-only.
  - It calls `botfp.js _botfpFlaggedList`: the stored records and the ones in
    memory, the live record winning, at most 50.
  - A name only for a player who is here: botstat keeps none, and the
    character record has none.
- **`/api/botstat` takes `Authorization: Bearer` too.** It still takes
  `x-admin-key`, and it's still a 404 to anyone without the key.
- **POST `/api/admin/dev/botflag {playerId}`** plants a **test** flag on a
  player who is here. It's for the panel's phone check, and for seeing what a
  flag looks like.
  - Its detail says it is not evidence.
  - It never moves the hour's gap a real flag waits for.
  - A player who isn't here gets none: a fresh record would be written over
    their stored one.
- **OPERATIONS.md, "Bot flags"**: how to read the list, what each flag means,
  and the same list from a computer.

A flag still changes nothing in the game: the owner's 2026-07-03 "flag, never
act". Acting on one is the review's points 10-13, the owner's call.

## The flags, in words

| Kind | Shown as | Raised by |
|---|---|---|
| `suspicion-threshold` | Harvest gestures look scripted | the score reaching `BOTFP.FLAG_AT` 10 |
| `variance-collapse` | Every harvest gesture nearly the same | 48+ gestures with almost no variation |
| `device-fleet` | Many accounts harvesting on one device | 4+ accounts on a device, harvesting hard in one hour |
| `strikes-without-start` | Harvests sent without starting them | 20 strikes refused for want of a start (v2.3.3322, harvest-proof.md) |
| `server-signals` | Plays like a script (measured by the server): *its reasons in words* | the server's own signals reaching `SIG_FLAG_AT` (v2.3.3731, server-botsig.md); the detail carries `reasons` |
| `test` | A test flag, planted from this panel (not evidence) | `/dev/botflag` |

## Tests

- `server/test/bot-flags.test.mjs` (29 checks):
  - the list: only the flagged, the live record winning, names, newest first,
    the cap;
  - the route's key: 404 with none set, 401 with a wrong one;
  - the route is read-only;
  - the test flag, its gap, and that a player who isn't here gets none;
  - `/api/botstat` takes either header;
  - no websocket message reaches any of it.
- Eight deliberate bugs, each caught by the suite.
- `mp-botflags` (14, a phone): the panel opened by a real press, the empty
  list said in words, a flagged player listed by name with the flag in words
  and their id, `/api/botstat` with the Bearer key, no sideways scroll, and a
  picture.
