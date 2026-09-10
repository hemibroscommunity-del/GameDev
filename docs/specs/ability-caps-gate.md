# The lunge, and the one flag that kills it

**v2.3.2418.** Diagnosis + pin. No product code changes.

> Owner, 2026-09-09: *"The dash to enemy for melee isn't working anymore."*

## The short version

The lunge is not broken. It is **switched off**, by the same mechanism that put
the combat levels back to 0 (v2.3.2414): a **liveops flag named after a
capability**, overriding the capability the worker bakes in as `true`.

The capability is `abil`. With it off, the press is still felt, the ordinary
swing still goes out, the lock still forms — and the lunge does not happen,
with nothing on screen to say why.

## The gate, exactly

`src/networking/wsClient.js:1055`

```js
setAbilitiesEnabled(!!(S._serverCaps && S._serverCaps.abil));
```

`src/data/abilities.js`

```js
var _enabled = false;
export function isAbilitiesEnabled() { return _enabled; }
export function abilityUnlocked(charLevel, kind) {
  var cfg = abilityCfg(kind);
  if (!cfg || !_enabled) return false;      // <- here
  return (charLevel || 0) >= cfg.minLevel;
}
```

`src/game/abilities.js`

```js
export function castAbility(S, kind) {
  ...
  if (!isAbilitiesEnabled()) return false;   // <- and here
```

So one flag closes **two** doors, and closing the second one is what makes the
failure silent: `abilityStatus.visible` is false, so there is no disabled
button, no greyed icon and no rejection popup. A player sees an ordinary swing
where a lunge should have been.

### How it goes false in production

`server/src/join.js:1240` spreads `..._liveFlags` **last** over the caps
literal, so a flag whose name matches a capability wins over the baked-in
`true`. `liveops.js`'s own header warns about exactly this: *"overriding a cap
to false … can re-enable legacy client-side fallback paths."*

The worker built from `server/` at HEAD advertises **42** capabilities with
`abil: true`. Nothing in the client's git history explains the report — which is
the point: the change is in **live worker state**, not in the code.

## What else the same flag takes with it

Everything routed through `abilityStatus`:

| | |
|---|---|
| the sword lunge | silent, as above |
| **Shield Bash** button | gone from the screen |
| **Whirlwind** button | gone from the screen |
| every ability cooldown pie | nothing to draw |

**This is the cheap way to confirm it from a phone**, with no console and no
admin key: if Shield Bash and Whirlwind are missing while a shield is held,
`abil` is off. If they are present, the cause is something else and this
document is the wrong lead.

The named flag itself is readable in-game: long-press the zone name for 2s →
admin key → **Live flags** (v2.3.2412), which banners in amber any flag that is
overriding a capability.

## The pin

`tools/qa/mp/mp-dashreal.mjs`, **12 assertions**, two rounds against a real
worker at 390×844 with a real touchscreen.

**Round 1 — the whole chain, no crutches.** `mp-dashhit` (18/18, and green)
never covered this: it fires the lunge by calling `window.__btMaybeSwordDash()`
and hands itself the lock by writing `S.lockedTarget` into state. Both are parts
a player never touches — TRAPS §67. Round 1 removes both: a real finger on the
disc's real screen coordinates, with the lock left to the game's own targeting.
It also asserts `document.elementFromPoint` at the disc centre actually reaches
the disc, so "nothing is painted on top of it" is measured rather than assumed.

Round 1 **passes**, which is the finding: the code is fine.

**Round 2 — the same press, one capability short.** `caps.abil` is deleted from
`state_sync` in an init script — a real deploy state, not a poked client field.
Two guards run first (the capability really is absent while the other 41 landed;
the lock still forms), so the round cannot pass by measuring a broken fixture.
Then: `dash: false`, `swung: true`, `visible: false`. The owner's report,
reproduced.

## Two things this does NOT do

- **It does not fix anything.** The repair is the capability coming back, and
  that is a live-worker change, not a deploy. Shipping code here would mean
  removing a deploy-order gate that exists for a good reason (rule 19): against
  a worker with no `case 'ability'`, an ungated cast spends a predicted stamina
  bar on a message that gets relayed as a broadcast and never settled.
- **It says nothing about the snowmen.** Monster attacks come from
  `server/src/telegraph.js` and are not routed through `abilityStatus`. That is
  a separate report and a separate hunt.
