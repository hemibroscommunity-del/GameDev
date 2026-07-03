# Persistent Identity (v2.3.1116) — spec + attach points

PR1 of the heavy-systems architecture plan. Silent passphrase identity:
every browser gets a stable player id that survives reloads, so the
server's per-player storage (`rpg:<id>`) finally accumulates instead of
orphaning on every page load. Also ships the PvP lawless-zone consent
gate (the prerequisite safety fix for the PR6 duel machine).

## How identity works

1. **First boot**: the client silently generates a 4-word passphrase
   (`generatePassphrase()`, `src/networking/index.js`), stores it in
   `localStorage.bt_passphrase`, and derives the player id from it
   (`passphraseToId()` → `bp_...`). No login UI; zero friction.
2. **Every join**: the client sends `{ id, phrase }` in the `join`
   message (`src/networking/wsClient.js`). The phrase rides the wss
   connection only — it is never broadcast.
3. **Server verify** (`_verifyJoinAuth`, `server/src/index.js`), BEFORE
   the same-id session eviction:
   - `auth:<id>` storage record exists → the phrase must SHA-256-match
     (`btv1|<phrase>` domain-separated). Mismatch or missing phrase →
     `join_rejected` + socket close `4003`; the existing session and
     player state are untouched.
   - No record → join allowed; if a phrase was provided, the record is
     stamped (first join locks the id). Phraseless joins (legacy/v1
     clients, `?guest=1` tabs) stay allowed as unregistered throwaways —
     this is the deploy-order safety property.
   - Brute-force lockout: 5 failed verifies on an id → 60s lockout
     (in-memory, per-GameRoom).
4. **Client `join_rejected` handler**: regenerates the passphrase ONCE
   (also self-heals the rare 31-bit id collision) and lets the normal
   reconnect rejoin under the new identity; a second rejection stops and
   logs.

The `auth:<id>` record lives in its own storage key on purpose:
`_saveRpg` rewrites the rpg blob from a fixed field list and would drop
any foreign field. Follow this rule for all future per-player metadata
(inbox, escrow journal, duel wagers).

## PvP consent gate

> **⚠ Partially superseded (v2.3.1121):** the duel half of this section
> describes the PR1 interim observer. Duel consent now lives in the duel
> machine (`server/src/duel.js`, spec `docs/specs/duels.md`) — the
> observer described below handles ONLY the threat handshake
> (`pvp_threat`/`threat_response`). The lawless-zone gate and
> fail-closed default are unchanged and still live here.

`_resolvePvPAttack` now skips any target unless:

- the zone has `lawless: true` in `server/src/data.js` ZONES (all nine
  wilderness zones are flagged, preserving shipped free-fire behavior;
  town/farm_home/unknown zones fail CLOSED — this kills unconsented town
  ganking with death-pile drops), or
- the attacker↔target pair holds a live consent: the server observed
  `duel_request` (A→B) then `duel_accept` (B→A) — or `pvp_threat` +
  accepted `threat_response` — each half arriving on its own sender's
  session, so neither side can forge the other's. Consent lasts 10 min
  and clears on death or disconnect.

This is the interim machine; PR6 replaces it with a real duel state
machine (wagers, no-drop deaths, reconnect grace).

## Wire surface (for future UI)

| Message | Direction | Payload | Notes |
|---|---|---|---|
| `join` | c→s | `{ id, phrase?, name, data, protocolVersion }` | `phrase` only for `bp_` ids |
| `join_rejected` | s→c | `{ reason: 'auth' }` | followed by close code 4003 |

Client knobs:

- `?guest=1` — throwaway random id for this tab (test multiplayer with
  two tabs in one browser; two tabs on the same identity evict each
  other by design — the second tab shows the "Play here instead" bar).
- The passphrase in `localStorage.bt_passphrase` IS the account
  credential. The "transfer to new device" UI shipped in v2.3.1143 as
  the **Login Key** account panel — see `docs/specs/account-login.md`
  (it pre-flight-validates the typed key server-side before switching,
  instead of the blind write+reload this bullet originally sketched).
  Losing it = losing the character; there is no server-side recovery by
  design (no PII).
- `MenuBar.jsx`'s reset path still removes `bt_passphrase`/`bt_rpg` —
  that is now "delete character", which is what an explicit reset means.

## Tests

`server/test/identity.test.mjs` (20 assertions, in `npm test`):
registration, wrong-phrase reject without eviction, bare-id replay
reject, correct-phrase reconnect + eviction, legacy phraseless join,
lockout + expiry, town gate, forged-accept rejection, duel handshake,
lawless zone, death-clears-consent.
