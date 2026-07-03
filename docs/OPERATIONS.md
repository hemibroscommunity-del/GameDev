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

The economy — total gold in the world, richest players, market escrow:
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

## Testing safely

Add `&room=qa1` (or `?room=qa1` if it's the first parameter) to any command
to aim it at a private test room instead of the live world — pair it with
opening the game with `?room=qa1` in the URL. Granting yourself test gold in
qa1 touches nothing in production.
