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

Nobody else can use any of this: every button asks the worker for permission
with your key, and without the key the buttons do nothing at all. "Forget key
on this device" removes it if you're ever on a shared phone.


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
`disable_threats`, `disable_event_capes`:
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
