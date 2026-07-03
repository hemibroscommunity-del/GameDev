# Account Login — "Login Key" (v2.3.1143)

Lets a player continue their character on a new device (or a cleared
browser). The credential already existed — the silent passphrase from
`docs/specs/identity.md` — so this slice is the missing UI plus ONE
read-only server endpoint. No email, no OAuth, no PII, unchanged join
semantics.

## Why a server pre-flight (the two footguns)

The naive transfer flow ("write the typed phrase to localStorage,
reload") sketched in identity.md is unsafe in exactly two ways:

1. **Wrong key destroys the current one.** A reload with a mismatched
   phrase gets `join_rejected`, and the client's self-heal regenerates
   `bt_passphrase` — the previous key on THIS device is gone.
2. **Typo'd key silently mints a fresh character.** An unregistered
   phrase derives an unregistered id; the first join stamps `auth:<id>`
   (first-join-locks-the-id) and the player is now Lv 1 with no error.

So the client validates the typed key with the server FIRST, shows a
"Continue as your Lv N character?" preview, and only switches after
explicit confirmation. `applyAccountLogin` also stashes the outgoing
key in `bt_passphrase_prev` before overwriting.

## Wire surface

| Endpoint | Method | Request | Response | Notes |
|---|---|---|---|---|
| `/api/account/login` | POST | `{phrase}` | `{ok:true, settled:true, exists:true, id, preview:{level, createdAt}}` | phrase matches a registered account |
| | | | `{ok:true, settled:true, exists:false}` | unregistered — **nothing stamped** |
| | | | `{ok:false, settled:true, reason:'auth'\|'locked'\|'rate'\|'bad_request'}` | all HTTP 200 (market convention) |
| `/api/account/*` other | any | — | 404 `{ok:false, error}` | |
| (old worker, any path) | | | 200 text/plain | client maps to `'unavailable'`, never switches |

`?room=X` honored like `/api/market` (default `brotown-1`). No WS
messages, no caps flag (HTTP-only → per-response `settled: true`,
Rule 19), no PRIVILEGED_EVENTS change, no new storage prefixes.

Deploy-order note: an old worker answers unknown paths with **HTTP 200
text/plain**, so the client's capability check is "parses as JSON AND
`settled === true`" — never status-based. Anything else (network error,
non-JSON, missing flag) → the UI says login is unavailable and refuses
to touch the stored key. Both deploy orders are safe.

## Server (`server/src/account.js`)

- `accountPassphraseToId(phrase)` — verbatim port of the client's
  `passphraseToId`. Parity locked by literal fixtures in
  `test/account.test.mjs`; change both copies or neither.
- `_accountLogin(phrase, ip)` — the check. **Read-only: never writes
  storage.** Registration stays exclusively in `_verifyJoinAuth`, so
  probing this endpoint can never claim an id.
- Brute-force posture: shares the join gate's `_authFails` map (HTTP
  probes and join spam draw from the SAME 5-fails/60s per-id budget —
  the endpoint is never a weaker oracle than the join gate), plus a
  per-IP throttle (20/min via `CF-Connecting-IP`, in-memory; a deploy
  wipe loses nothing).
- The preview carries `level` only — the rpg blob has no name field
  (fixed field list, identity.md storage rule) and we don't add one.

## Client

- Helpers in `src/networking/index.js`: `normalizeLoginKey` (trim,
  lowercase, whitespace/underscores → `-`; runs before BOTH check and
  store — `passphraseToId` is char-exact), `checkAccountLogin`
  (pre-flight fetch, 'unavailable' on anything non-settled),
  `applyAccountLogin` (stash prev key → write → drop `bt_rpg`/`bt_stats`
  caches, keep `bt_device` → reload).
- Shared UI in `src/ui/account/`: `AccountKeyCard` (key + copy +
  "only way back" warning), `AccountLoginForm` (idle → checking →
  confirm | error → switching), `AccountModal` (overlay composing both).
- Entry points:
  - **In game:** More → **Account** tile → `AccountPanel`
    (`src/ui/mobile/dash/AccountPanel.jsx`; the BottomDashboard is
    mounted on all platforms, so this covers desktop too).
  - **Welcome screen:** "Already have a character? Log in with your
    Login Key" link under PLAY in `NameModal.jsx` → `AccountModal`.
    This is the path a returning player on a NEW device actually hits.
  - The legacy `MenuBar.jsx` 🔑/🚪 toolbar was NOT touched — it is
    `display:none` (replaced by the utility wheel) and editing dead UI
    would only add noise.
- Hardening: the `join_rejected` auto-regen in `wsClient.js` now
  stashes the phrase it is about to destroy in `bt_passphrase_prev`.

## localStorage keys

| Key | Change |
|---|---|
| `bt_passphrase` | unchanged — the credential |
| `bt_passphrase_prev` | NEW — safety stash, written on account switch and on join_rejected regen |
| `bt_rpg`, `bt_stats` | cleared on account switch (stale caches) |
| `bt_device` | kept on switch (per-device nonce, not per-account) |

Two tabs sharing localStorage: after a switch+reload, an already-open
second tab still holds the old identity until ITS next reload — the
same-id eviction semantics are unchanged; no code needed.

## Tests

`server/test/account.test.mjs` (20 assertions, in `npm test`):
passphraseToId parity fixtures, registered-key found + preview from the
rpg blob, unregistered key → `exists:false` with **no record stamped**
(the read-only invariant), mismatch → 'auth' → 5 fails → 'locked' →
the same lockout blocks a JOIN (shared budget) → expiry restores,
per-IP throttle, and the fetch surface (bad JSON, 404, CORS header,
round-trip).
