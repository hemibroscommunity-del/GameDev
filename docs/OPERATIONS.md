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

## Seeing what's happening

Who's online, is the world ticking:
```
curl -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/overview"
```

The economy — total gold in the world, richest players, market escrow.
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

## Dealing with a griefer or cheater

Kick (disconnects them; they can reconnect — a warning shot):
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
`disable_threats`:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"disable_dungeons","value":true}' "https://WORKER/api/admin/flags"
```

**Turn any flag back off** (this also ends an XP event):
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/flags?name=xp_mult"
```

One caution: flag names that match a *capability* name (like `jackpot`,
`market`, `trade`, `weaponDrops`) also override what the server tells
clients it supports — that's an emergency lever with side effects (old
client fallbacks can wake up). Stick to the `disable_*` switches and
`xp_mult` unless a PR tells you otherwise.

## Running the cape contest (v2.3.2026)

The contest is OFF until you switch it on, and nothing about it happens
until you do — no tickets drop, and the roll costs nothing on every kill.

**Start the event:**
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"event_capes","value":true}' "https://WORKER/api/admin/flags"
```

**End the event** (do this when the window closes — otherwise tickets keep
dropping until all three are gone):
```
curl -X DELETE -H "Authorization: Bearer YOUR_KEY" "https://WORKER/api/admin/flags?name=event_capes"
```

**Change the drop rate** while the event is running. The default is 1 in 200
(`0.005`). Set the number as a *chance per kill*, so `0.02` is 1 in 50:
```
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"name":"event_cape_rate","value":0.02}' "https://WORKER/api/admin/flags"
```
Tune this against the length of YOUR window, not against forever. Only three
tickets exist no matter what you set, so the cap already guarantees scarcity —
a rate so low that nobody finds one during the session means the thing you
announced never happens. If an hour goes by with no winners, raise it.

**See who has won so far:** the winners are in the ledger, not in a flag
listing. The simplest check is the admin log, which records every flag change,
plus watching your own chat — but if you want the authoritative list, ask in a
session and it can be read out of storage.

Three things worth knowing so nothing surprises you mid-event:

* **Ending the event does not take anyone's ticket away.** The flag stops the
  *drop*. A ticket already won can still be opened for its cape a week later,
  which is deliberate — a winner who happens to be offline when you close the
  window must not lose their prize.
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
