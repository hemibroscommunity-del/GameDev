# BroTown server

Cloudflare Worker backing the multiplayer game: WebSocket rooms
(Durable Object `GameRoom`), marketplace, leaderboard, arena, and
feedback storage. Migrated from the separate `brotown-server` repo
in June 2026 so client and server ship from one source of truth.

## How deploys work

**Merging to `main` is deploying.** Any merged change that touches
`server/` triggers `.github/workflows/deploy-worker.yml`, which runs
`wrangler deploy` against this folder. Nobody deploys from a laptop.

Requires the `CLOUDFLARE_API_TOKEN` repository secret (GitHub repo →
Settings → Secrets and variables → Actions). Create the token at
dash.cloudflare.com → My Profile → API Tokens → "Edit Cloudflare
Workers" template.

**Rollback:** Cloudflare dashboard → Workers & Pages → brotown-server
→ Deployments tab → ⋯ menu on a previous deployment → Rollback.
Player data lives in Durable Object storage and is not affected by
deploys or rollbacks.

## Run locally

```
cd server
npm install
npx wrangler dev
```

## Tests

```
cd server
npm test
```

Runs `test/protocol-v2.test.mjs`: the `GameRoom` Durable Object
against mocked storage with one protocol-v1 and one protocol-v2
session (delta player_state, per-entity tick deltas, merged
zone_state, legacy fallbacks).

## Protocol versioning

Clients opt into protocol v2 by sending `protocolVersion: 2` in the
`join` message (the live client does since v2.3.694). Sessions that
don't are served the v1 wire format: full `player_state` snapshots,
full dirty-zone entity lists in ticks, and the
`zone_monsters`/`zone_nodes`/`zone_loot` trio on zone change.
