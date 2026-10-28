# OPERATIONS — running your game (plain language)

This is your owner's manual for the admin tools shipped in v2.3.1148. You
don't need a terminal for setup — just the Cloudflare dashboard and, for the
commands, any terminal (Mac: Terminal app) to paste one-line `curl` commands
into. Nothing here can be used by players: every command needs your secret
key, and without the key the endpoints don't even appear to exist.

## One-time setup: create your admin key

1. Think of a long random password (a password manager's 30+ character
   generate button is perfect). This is your ADMIN KEY — treat it like a
   bank password. Anyone who has it can grant gold and freeze players.
2. Cloudflare dashboard → **Workers & Pages** → **brotown-server** →
   **Settings** → **Variables and Secrets** → **Add** →
   Type: **Secret**, Name: `ADMIN_KEY`, Value: *your password* → **Deploy**.
3. Done. The secret survives every future deploy (the GitHub auto-deploy
   never touches secrets). Until you do this, the admin endpoints are OFF.

In the commands below, replace `YOUR_KEY` with that password and
`WORKER` with your worker's URL host (the same host the game's WebSocket
uses — e.g. `brotown-server.<your-subdomain>.workers.dev`).

## Testing your own game without playing through it (v2.3.2240)

You don't need the commands below for this — it's built into the game.

**Press and hold the zone name** at the top of the screen for about a second.
A "Test panel" opens. Paste your admin key once (the same one from the setup
above) and it's remembered on that device.

From there you can:

- **Unlock every gated zone** — opens Frost Ridge, Verdant Wilds, Wind Dunes
  and the Flame Fields without playing the tutorial chain. It marks those
  quests as *started*, not finished, so your save still looks like a real
  player's.
- **Warp** — tap a zone name and you'll be taken there, from wherever you're
  standing. It walks you out through the ordinary doors (town → World View →
  the zone), so each zone still loads its art properly on the way in and you
  see the usual loading spinner for a moment. If a zone won't open, it stops
  and tells you — usually the fix is **Finish all quests** first.
- **Give weapons + levels** — the three starter weapons and a chunk of levels,
  so a high-level zone isn't instant death.
- **Heal / refill** and **God mode** — top your bars up, or stop taking damage
  while you watch a mechanic play out. God mode switches itself off after 20
  minutes, so you can't leave it on by accident.
- **Bot flags** — who the game has flagged as a possible script, and why
  (v2.3.3323; "Bot flags" below).
- **Hidden settings** — the anti-bot's numbers and the hourly harvest and
  cook caps, kept in the server instead of the public code (v2.3.3723;
  "Hidden settings" below).
- **Test mode** — turn the anti-cheat off for the character you're playing,
  so testing never trips it; a TEST MODE tag shows on the top bar while it is
  on (v2.3.3430; "Test mode" below).
- **Player logins** — let a player's character onto a new device, or lock out
  someone who got into a character (v2.3.3344; "Player logins" below).
- **Chat reports** — what players reported, with what was said, and Kick,
  Freeze, Unfreeze and Dismiss buttons (v2.3.3398; "Dealing with a griefer or
  cheater" below).

Nobody else can use any of this: every button asks the worker for permission
with your key, and without the key the buttons do nothing at all. "Forget key
on this device" removes it if you're ever on a shared phone.


## Seeing what's happening

Who's online, is the world ticking:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/overview"
```

The economy — total gold in the world, richest players, market escrow
(the gold waiting in the market's buy orders; it read 0 by mistake until
v2.3.3368, so older daily snapshots show 0 there).
Since v2.3.1150 this also shows `history` (the last week of daily
snapshots), `delta` (how much total gold moved since yesterday), and
`alert: true` if gold jumped more than 25% in a day — that's the
signature of a duplication exploit, so if you ever see it, look at the
`top10` list and the admin log next:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/economy"
```

Everything about one player (their save, whether they're online, their
backup list). Player ids are the `bp_...` strings:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/player?id=bp_XXXX"
```

What admin actions have been taken recently:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/log"
```

## Helping a player (grant)

Give gold (e.g. compensation after a bug). It works even if they're offline —
the gold waits in their in-game mailbox:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"playerId":"bp_XXXX","kind":"gold","payload":{"amount":500},"note":"Sorry about the bug!"}' \
  "https://WORKER/api/admin/grant"
```
Give an item (inventory keys look like `ore_iron_ore`, `fish_minnow`):
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"playerId":"bp_XXXX","kind":"item","payload":{"invKey":"ore_iron_ore","count":10}}' \
  "https://WORKER/api/admin/grant"
```
If a grant command times out and you're not sure it went through: the
response includes an `opId` — run the exact command again with
`"opId":"<that value>"` added and the server guarantees it pays at most once.

## Player logins: moving a character to a new device (v2.3.3344)

A character's Login Key works only on the phones and computers it has been
played on. When a player opens it somewhere new, they see **"This character is
played on another device"** and a code (`bp_...`). That happens on:
- a new phone;
- a cleared browser;
- a private window;
- the iPhone home-screen app after playing in Safari (they keep separate
  storage);
- a friend's phone.

**To let them in:**
1. They send you the code. Let a device in only when you're sure the message
   comes from that character's own player: someone else who has the key and
   asks you is exactly who this keeps out.
2. Open the Test panel. Under **Player logins**, paste the code and tap **Let
   one new device in (30 min)**.
3. Tell them to tap **Try again** within 30 minutes. That device is theirs from
   then on.

**New Login Keys (v2.3.3355).** Players now get a new, longer key made by
the server: eight short words, shown on their Account card. A new key works on
**any** phone or computer, typed at the start screen's Login Key, with no pass
from you. Most players moving devices won't need you any more.

**If someone else got into a character** (its player says it was stolen):
1. Paste its code and tap **Give it a new key**, then tap again to confirm.
   - Whoever is playing it is put out.
   - Every device and every old key stops working.
   - The panel shows a new key, **once**.
2. Send that key to the real player (only when you're sure it's them). They
   tap **Use a Login Key** on their screen and type it.

**Forget all its devices** still exists: it puts the player out, takes back
every new key and forgets every device, and **Let one new device in** then
lets the real player back in with the old key. For a character whose old key
is retired (one made since v2.3.3355), use **Give it a new key** instead.

From a computer:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"playerId":"bp_XXXX"}' "https://WORKER/api/admin/device-pass"
curl -X POST -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"playerId":"bp_XXXX"}' "https://WORKER/api/admin/device-forget"
curl -X POST -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"playerId":"bp_XXXX"}' "https://WORKER/api/admin/key-new"
```
`/api/admin/overview`'s `deviceLock` counts logins let in, refused, and
passes used, and `loginKeys` the new keys made and used. If the device lock
ever gets in honest players' way, the live flag `devicelock: false` turns it
off (docs/specs/device-lock.md); `keys2: false` stops new keys being handed
out, while keys already made keep working (docs/specs/login-keys.md).

## Hidden settings: the numbers a copier must not read (v2.3.3723)

The code is public, so every number in it is readable by anyone, a bot maker
included. The anti-bot's thresholds and scores, and the hourly harvest and
cook caps, can now be kept **in the server's own storage** instead: the code
holds only a public **placeholder** for each (today's value), and yours
replaces it.

**On your phone:** Test panel, **Hidden settings**, **Show hidden settings**.
Each row says what the number does, the value in force, its placeholder and
the range the server accepts. Type a new value and tap **Save**: it is in
force at once, no deploy. **Reset** puts the placeholder back. A value
outside the range is refused with the reason (the harvest and cook caps can
never go under the fastest an honest player can play).

Your values are never sent to any phone. If a change goes wrong, the live
flag **hidden_off** (Live flags) puts every one back to its placeholder at
once without forgetting them; clear the flag and they come back. The spec is
`docs/specs/hidden-settings.md`.

## Bot flags: who looks like a script (v2.3.3323)

The game watches how each player harvests, and raises a **flag** when
something looks scripted. A flag is **evidence only**: it changes nothing in
the game. What to do about a flagged player is your call (kick or freeze,
below).

**On your phone:** open the Test panel (hold the zone name at the top of the
screen for about a second), then under **Bot flags** tap **Show flagged
players**. Each row shows:
- who it is, and whether they're online;
- what was seen, in words, and when;
- the counts behind it;
- their player id (`bp_...`), which is what kick and freeze take.

What each flag means:
- **Harvest gestures look scripted:** the harvest gestures added up to a high
  score: paths replayed exactly, or too straight and too even to be a thumb.
- **Every harvest gesture nearly the same:** dozens of gestures in a row with
  almost no variation.
- **Many accounts harvesting on one device:** four or more accounts from one
  phone, harvesting hard in the same hour.
- **Harvests sent without starting them:** 20 or more harvests sent without
  the "started" message a real phone always sends first. These are refused,
  and this flag means someone is trying (v2.3.3322).
- **A test flag:** planted by the Test panel's own check, not evidence.

The same list from a computer, most recent first (both commands take the same
key):
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/dev/botflags"
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/botstat?flagged=1"
```
Everything recorded for one player:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/botstat?id=bp_XXXX"
```

## Test mode: the anti-cheat off for your own characters (v2.3.3430)

The server checks that every player does only what an honest phone can do:
not moving faster than the fastest player, not harvesting or cooking faster
than the hands can, not hitting a monster from too far away, taking the first
quests in order. Testing trips those checks — a warp from the Test panel, a
page reloaded in the middle of a harvest, a quest finished out of order to see
the next one all look like a script to the server.

**Test mode** turns those checks off for one character: yours.

**On your phone:** open the Test panel (hold the zone name at the top of the
screen for about a second), then under **Test mode** tap **Test mode
(anti-cheat off for this character)**. A small **TEST MODE** tag appears next
to the zone name on the top bar, and stays there while it is on. Tap the same
button (it now says **Test mode ON (tap to turn off)**) to turn it off.

What it turns off, for that character only:
- the speed limits on moving (including after a reconnect);
- the timing checks on harvesting and cooking, and the bot scoring;
- the limits on how fast and how far your hits on **monsters** land;
- the order of the first quests;
- the dodge-roll check.

What stays on, for everyone including you: everything that protects other
players and the server — message limits, the login key and its lockouts,
only your site connecting, saves and payments, every check on a fight
**between players**, loot belonging to whoever earned it, zone locks, needing
the right tool and level to harvest.

Good to know:
- It is **stored on the character**: it stays on through reconnects, worker
  deploys and launch, until you turn it off. Restarting the character turns
  it off.
- Anything the character earns while it is on **stays** with it. The plan is
  to start players fresh at launch, so use it on your own test characters.
- The game's automated checks run with test mode off, so they keep testing
  the real anti-cheat.
- **Emergency switch:** the live flag `testmode` set to `false` turns every
  character's test mode off at once (see "Live switches" below); clear the
  flag to bring it back.

Who has it on, from a computer:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/dev/testmodes"
```

## Dealing with a griefer or cheater

**On your phone (v2.3.3398):** players report someone from that player's card
(Report, then a reason). Open the Test panel (hold the zone name at the top
for about a second) and under **Chat reports** tap **Show chat reports**. Each
report shows:
- who was reported, and whether they're **online**, **offline** or **frozen**
  right now;
- the reason, who reported them, and when;
- what they said in the 15 minutes before, the server's own copy (a report
  can't put words in anyone's mouth);
- their player id (`bp_...`).

And four buttons:
- **Kick**: disconnects them, and they leave the world as anyone who closes
  the game does (saved, gone from everyone's screen). They can come straight
  back, so it's a warning shot.
- **Freeze**: takes two taps (it asks "Sure? Freeze"). They can't log in at
  all until you unfreeze them, and the row says **frozen**.
- **Unfreeze**: lets them back.
- **Dismiss**: you've dealt with it, so the report goes away.

Everything you do here is written to the admin log.

The same, from a computer:

Kick (disconnects them; they can reconnect — a warning shot). Since
v2.3.3356 a kicked or frozen player leaves the world the way anyone who closes
the game does: saved, and gone from everyone else's screen.
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"playerId":"bp_XXXX","reason":"stop spamming"}' "https://WORKER/api/admin/kick"
```
Freeze (they cannot log in at all until you unfreeze — the real lever):
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"playerId":"bp_XXXX","note":"dupe exploit, investigating"}' "https://WORKER/api/admin/freeze"
```
Unfreeze:
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/freeze?id=bp_XXXX"
```
Note: players running an old cached version of the game may end up on a
fresh blank character instead of seeing the freeze message. If that happens,
just freeze the new id too — their real character stays locked either way.

## Fixing a broken save (restore from backup)

The server now automatically keeps ~7 daily backups per player (taken at
their first login each day). If a bug corrupts a save or an exploit drains
someone:

1. List their backups: the `player?id=` command above shows `snapshots`
   (names like `rpgsnap:bp_XXXX:20260703`).
2. Make sure they're offline (kick them if needed — a live game session
   would overwrite the restore).
3. Restore:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"playerId":"bp_XXXX","snapKey":"rpgsnap:bp_XXXX:20260703"}' \
  "https://WORKER/api/admin/restore"
```
Restores are themselves safe: the current (broken) save is stashed as a
`prerestore-` backup first, so you can always restore the restore.

## Talking to your players (announcements)

Send a message every online player sees instantly (a gold "📢" banner):
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"text":"Server restarting in 2 minutes!"}' "https://WORKER/api/admin/announce"
```
Make it sticky (a message of the day — everyone also sees it when they
log in, until you clear it):
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"text":"Double XP weekend is ON!","sticky":true}' "https://WORKER/api/admin/announce"
```
Clear the sticky message:
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/announce"
```

## The account check (v2.3.3275)

New characters can be asked to pass Cloudflare's Turnstile check (usually a
tick that appears by itself, no puzzle) before the game makes them. It costs a
real player one tap, once. It costs anyone running a fleet of free accounts
one check per account, which is why it exists. Players who already have a
character are never asked. Full write-up: `docs/specs/account-check.md`.

It is **off until you turn it on**, in this order:

1. Cloudflare dashboard → **Turnstile** → **Add widget**. Name it anything,
   add the game's hostnames (your domain, and the `pages.dev` site if you
   test there), widget mode **Managed**. You get a **Site Key** and a
   **Secret Key**.
2. Put the Site Key in `server/wrangler.toml` as `TURNSTILE_SITEKEY = "..."`
   and merge. (This one is public by nature.)
3. Only after the game has deployed: Cloudflare dashboard → **Workers &
   Pages** → **brotown-server** → **Settings** → **Variables and Secrets** →
   **Add** → Type **Secret**, Name `TURNSTILE_SECRET`, Value the Secret Key →
   **Deploy**. From that moment new characters see the check.

Why that order: a page from before this version does not know the check
exists and would stop at the door. The secret is the switch, so it goes in
last.

To turn it off without a deploy:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"disable_verify","value":true}' "https://WORKER/api/admin/flags"
```

## Only your site can use your server (v2.3.3312)

The server lets in pages from **brotown.net** (and any address under it), the
**gamedev-aix.pages.dev** previews, and your own computer. A copy of the game
on any other site cannot connect: its players see "This isn't the official
BroTown" with a button to brotown.net. Full write-up:
`docs/specs/origin-lock.md`.

- **Moving to, or adding, another domain:** put it in `server/wrangler.toml`
  as `ORIGINS = "newdomain.com"` (comma separated for more) and merge,
  **before** players use it.
- **Emergency off:** `ORIGIN_LOCK = "off"` in the same file, merged. Quicker:
  Cloudflare dashboard → **Workers & Pages** → **brotown-server** →
  **Settings** → **Variables and Secrets** → set `ORIGIN_LOCK` to `off` →
  **Deploy** (lasts until the next deploy, so change the file too).
- **Seeing which sites tried:** **Workers & Pages** → **brotown-server** →
  **Logs** → **Begin log stream**, and look for `origin refused`.

## Live switches (flags) — change the game without a deploy

Flags take effect immediately for everyone, survive deploys, and are
yours to flip on and off. See what's currently set:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/flags"
```

**Run an XP event** (1 = normal, up to 4 = quadruple XP from monsters):
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"xp_mult","value":2}' "https://WORKER/api/admin/flags"
```

**Turn a broken system off** while you investigate (players stay
connected; only that feature stops). The switches that exist today:
`disable_jackpot`, `disable_weapon_drops`, `disable_dungeons`,
`disable_threats`, `disable_event_capes`:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"disable_dungeons","value":true}' "https://WORKER/api/admin/flags"
```

**Let more players in from one internet address** (v2.3.3274). The game
lets one address (one home's Wi-Fi, say) hold 16 places and open 20
connections a minute, so one script cannot take every place. If a whole
class or a mobile network ever shares one address, raise the limit or set
it to 0 for none:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"ip_sockets","value":0}' "https://WORKER/api/admin/flags"
```
(`ip_joins_min` is the other one, the connections a minute.)

**A private room** for a playtest: the game only makes the rooms it is told
to. Add the name to `ROOMS` in `server/wrangler.toml` (comma separated,
`"brotown-1, playtest-2"`), merge, and `?room=playtest-2` on the game's
address reaches it. Any other name answers "no such room".

**Turn any flag back off** (this also ends an XP event):
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/flags?name=xp_mult"
```

One caution: flag names that match a *capability* name (like `jackpot`,
`market`, `trade`, `weaponDrops`) also override what the server tells
clients it supports — that's an emergency lever with side effects (old
client fallbacks can wake up). Stick to the `disable_*` switches and
`xp_mult` unless a PR tells you otherwise.

Since v2.3.3295 five switches with a capital letter in them can be thrown
too, when a PR or spec names them as the way to turn a system off:
`storeGear` (gear in the auction house), `dailyChest`, `zoneDepth`,
`whirlWindup` and `broCount`. Before, the server refused those names.
`weaponDrops` is still refused on purpose.

## Running the cape contest (v2.3.2029)

**The contest is currently OFF, and starting it is not your job — it is a code
change.** Ask in a session for the cape event to be switched on; that ships a
one-line change (`EVENT_LIVE` in `server/src/eventcapes.js`) and merging it
starts the contest. No terminal, no admin key, nothing for you to run.

One thing to plan around: merging deploys the worker, which briefly
disconnects everyone online and cold-starts the room. **Switch it on before
players gather**, not while they are standing around waiting for it. Fifteen
minutes of margin is plenty.

Once it is running, it ends by itself when the third ticket is found. You do
not have to switch it off.

Everything below is optional and needs the admin key. Skip it unless something
needs changing mid-event.

**See who has won, and how many tickets are left.** This is the ledger — the
one record that decides the contest — and it also tells you whether the drop is
running right now:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/capes"
```
Worth running once BEFORE the event starts, to confirm all three are still
available. If `issued` is not empty and the contest has not started, a ticket
leaked (v2.3.2028 briefly ran the contest in production on 2026-08-27, between
17:33 and 17:44 UTC) — clear it with the reset below.

**Clear the ledger** — only for that situation, before a contest starts. It
voids tickets people may legitimately hold, so it makes you name the cape and
say `confirm=yes`:
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" \
  "https://WORKER/api/admin/capes?cape=crimson&confirm=yes"
```

**Change the drop rate.** The default is 1 in 100 kills (`0.01`). Set it as a
chance per kill, so `0.02` is 1 in 50:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"event_cape_rate","value":0.02}' "https://WORKER/api/admin/flags"
```
Conversions: `0.01` = 1 in 100, `0.02` = 1 in 50, `0.05` = 1 in 20. Takes
effect immediately, no deploy. Only three tickets exist however easy you make
them, so a higher rate does not make the prize less rare — it just means the
contest actually finishes inside your session.

**Stop the contest early**, before all three tickets are found:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"disable_event_capes","value":true}' "https://WORKER/api/admin/flags"
```
This is the emergency stop — it works without a deploy, so it does not
disconnect anyone. Undo it by deleting the flag:
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/flags?name=disable_event_capes"
```

Three things worth knowing so nothing surprises you mid-event:

* **Stopping the contest does not take anyone's ticket away.** The switch stops
  the *drop*. A ticket already won can still be opened for its cape a week
  later, which is deliberate — a winner who happens to be offline must not
  lose their prize.
* **Tickets can be traded** between players in the trade window. They cannot be
  sold on the marketplace (that is weapons-only). If someone ends up holding
  two, they still only get one cape, and the spare stays in their bag to trade
  on rather than being eaten.
* **One cape per account.** A player who has already redeemed cannot win a
  second ticket, so the three winners are three different people.

## Testing safely

Add `&room=qa1` (or `?room=qa1` if it's the first parameter) to any command
to aim it at a private test room instead of the live world — pair it with
opening the game with `?room=qa1` in the URL. Granting yourself test gold in
qa1 touches nothing in production.
