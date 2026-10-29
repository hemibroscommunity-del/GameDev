# The hidden settings (v2.3.3723)

The owner, 2026-10-28: *"Just hiding what you can in the server code (like
anti bot, tuning, maybe other things that would be valuable to a copier)
seems like the only necessary step."* The plan is `docs/HIDDEN-SERVER-PLAN.md`;
this is the first step of its order: the record, with the anti-bot's numbers
and the hour caps moved in.

## What it is

- **One stored record**, `hidden_settings` in the GameRoom's storage
  (ARCHITECTURE-HANDOFF rule 2): `{v: 1, s: {NAME: number}, at}`.
- **Public placeholders.** Every hidden setting keeps a placeholder in the
  code: the value it had before this change, which is in the public history
  already. `server/src/hidden.js` `HIDDEN_SPEC` lists each one with its group,
  its placeholder (read from the table that always held it, `botfp.js`
  `BOTFP`), its range, whether it is a whole number, and its words for the
  Test panel.
- **Merged when the room starts.** `_hiddenEnsure` reads the record once a
  worker's life, before its first socket (`index.js` fetch, beside
  `_liveFlagsEnsure`), and before any admin read. The room reads the merged
  table synchronously with `this._hid()`; `botfp.js` reads it through its
  local `hid(this)` (a stub that is not a room reads the placeholders). A
  failed read keeps the placeholders and is tried again next time.
- **An empty record changes nothing**, so deploying this changed no number.

## What is hidden

| Group | Settings |
|---|---|
| anti-bot, per harvest | `ENT_FLOOR`, `TV_FLOOR`, `VC_FLOOR`, `SYNTH_MIN_FLOORS` |
| anti-bot, over many | `EVAL_EVERY`, `COLLAPSE_MIN_N`, `ENT_VAR_FLOOR`, `VC_VAR_FLOOR`, `INTERVAL_MAX_MS`, `INTERVAL_MIN_N`, `INTERVAL_CV_FLOOR` |
| anti-bot, the score | `SCORE_SYNTH`, `SCORE_REPLAY`, `SCORE_COLLAPSE`, `SCORE_INTERVAL`, `SCORE_HALF_LIFE_MS` |
| anti-bot, the flag | `FLAG_AT`, `FLAG_MIN_GAP_MS`, `STARTLESS_FLAG_AT` |
| anti-bot, the fleet | `FLEET_MIN_IDS`, `FLEET_ACTIVE_MIN`, `FLEET_ACTIVE_STRIKES` |
| the hour caps | `HARVEST_HOUR_CAP`, `COOK_HOUR_CAP` |

**Not hidden:** `BOTFP`'s plumbing (ring sizes, map caps, `PUT_MIN_MS`, the
device id lengths). They are memory and cost, not a line a bot could aim at,
and `cost-guard.test` pins `PUT_MIN_MS`.

## Validation

- **On read** (`cleanHidden`): a name this worker does not know, a value that
  is not a finite number, one outside its range, a fraction where a whole
  number belongs: DROPPED, its placeholder holds. `__proto__` reaches nothing.
  A record with `v` above `HIDDEN.V` (a newer worker's) reads as empty.
- **On write** (`hiddenRefusal`): the same rules REFUSE the write (400, with
  the reason). A newer worker's record is never written over (409).
- **The ranges are safety rails, not secrets.** They keep a typo on a phone
  from flagging every player. The two hour caps' floors are the honest bound
  (`gathering.js` `HONEST_CYCLE_MIN_MS`: 2,384 an hour), the property
  `node-respawn` §3c holds the placeholder to, so no storable cap can fire on
  an honest player. What that costs: the owner can raise those caps
  privately, not lower them under 2,385.

## Editing (the owner)

The Test panel's **Hidden settings** section (DevPanel.jsx), behind the admin
key, through `devtools.js` `/dev/hidden` (so admin.js's auth, its fail-closed
404 and its audit log are inherited):

- `GET /api/admin/dev/hidden`: every setting, its words, range, placeholder,
  stored value (or null) and the value in force; `off` when the kill switch is
  thrown; `newer` when a newer worker wrote the record.
- `POST /api/admin/dev/hidden {name, value}`: store one; `value: null` puts
  its placeholder back. Live at once: the table is rebuilt in the same run as
  the write.
- `DELETE /api/admin/dev/hidden?name=<NAME>`: the same as null; with no name,
  clears all.
- The audit log (`admin_log`) records the setting's NAME, never its value.

## Never sent to a phone

The live flags (`liveflags`) are spread over every phone's `state_sync` caps,
which is why this is its own record and not a flag. No message a phone gets
carries a hidden value, a setting's name or the record's key:
`hidden-settings.test` §6 sets every setting to a marker, plays a room
(joins, scripted harvests up to a flag and the hour cap, an honest harvester,
a cook, chat, the kill switch, a late join) and reads every message every
phone got. A mutation that put one value in the caps fails it.

## The kill switch

`hidden_off` (lower case, a live flag) makes `_hid()` read every placeholder,
leaving the record alone; clearing the flag brings the private values back.
The flag's name is visible in the caps like every flag; no value is.

## Tests

`server/test/hidden-settings.test.mjs`: the table (§1), overrides in the
anti-bot itself (§2), broken values (§3), the admin route (§4), the kill
switch (§5), nothing reaching a phone (§6). `botfp`, `bot-flags`,
`node-respawn`, `cost-guard`, `test-mode`, `liveops`, `achievements` and
`devtools` run on the placeholders unchanged.

## Honest limits

From the plan: today's values are public in the history (hiding protects the
values from the first change on); statistics can rebuild some values by
playing; the server code itself stays public.

## Next

A new server-only number a copier would value starts life as a row in
`HIDDEN_SPEC` with a public placeholder (CLAUDE.md §8). The plan's next rows:
the server-side bot signals (botsig.js, server-botsig.md), spawn and respawn timing and
population scaling (`spawnscale.js`).
