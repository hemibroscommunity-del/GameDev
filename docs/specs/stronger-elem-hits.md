# The stronger element hits (v2.3.3620)

The owner's list of 2026-10-26 (docs/OWNER-LIST-2026-10-26.md, item 17), the
monsters whose element hit was too mild to notice:

| Monster | Before | Now |
|---------|--------|-----|
| Snowman | a 1 s chill | "a snowball freezes you solid for a moment, then slows you for 2 s, with ice on you": frozen 0.6 s, then the chill's slow, 2 s from the hit |
| Blue slime (Verdant Wilds) | a 0.7 s hold | "plant goo that holds you about 2 s and stings while it holds": held 2 s, four stings 0.5 s apart |
| Rock monster | a 0.5 s daze | "a bash that leaves you wobbling for a second (your steering sways)": the daze, then 1 s of your steering swaying |
| Fire goblin | three burn ticks | "you burn for 3 s with flames you can see": the same three seconds and ticks, the flames drawn half again as tall, up your body and your front |
| Mummy | a 48 px shove | the roar: its own change (a new wound-up attack) |

## What happens

**The freeze.** A snowman's hit that lands freezes you for 600 ms: no walking,
swinging, specials, abilities, rolling or shield, as the rock monster's daze.
A swing says "Frozen!". You are drawn inside a block of ice (see-through, a
white rim and shine, shards at the foot, chips flying as it closes) and the
HUD shows a Frozen chip. Then the chill's slow runs to 2 s from the hit. You
cannot be frozen again for 3 s after a freeze ends (snowmen come in sixes);
inside that window a hit only chills.

**The goo.** A blue slime's hold is 2 s (was 0.7 s), and while it holds the goo
stings four times, 0.5 s apart, each 8% of the slime's hit (a third of a hit
again in all), the leaf on each number. You can still swing while held (as
before); you cannot walk or roll. Not held again for 2.5 s after.

**The wobble.** A rock monster's daze (0.5 s, as before) is followed by 1 s in
which your steering sways: the way the stick points is turned up to 0.6 rad
(about 35 degrees) either way, a full sway every 0.46 s, easing off as it ends.
A dizzy swirl turns over your head and the HUD shows a Wobbly chip.

**The burn.** The same ticks (three, a second apart, 20% of the hit each). The
flames at your feet are half again as tall, a glow runs up your body, and
flames lick up your front. (v2.3.3878: those drawn flames are now the burning
building's own fire on you, the owner's ask: docs/specs/burn-fire.md.)

## Who decides what

- The worker decides every status (server/src/monsterstatus.js `FREEZE`,
  `GOO`, `STING`, `WOBBLE`): whether the hit landed, the freeze's window, the
  hold, the stings (damage, its own Map `_stings`, ticked with the burns and
  poisons), and how long the wobble is.
- The freeze rides the chill's own event as `fz` (its ms); the wobble rides the
  daze's as `wb`; the hold is the same `stuck` with a longer `stMs`; each sting
  is a `monster_attack` with `ability: 'sting'`, `elem: 'flora'`.
- The phone carries them out (src/game/elemHits.js): the freeze stops your walk
  and is refused like a daze (`isDazed` answers for both, `dazeRefused` says
  "Frozen!"); the wobble turns the stick's way (`wobbleTurn`, BroTown's walk);
  a sting is a tick (no flinch, the poison's sound, the leaf).
- The worker never sees which way you meant to walk, so the wobble needs nothing
  of it; the freeze and the hold are the phone's to carry out, as the daze and
  the hold always were.
- The sting goes through the poison's row of the one hit door (hits.js): the
  harvest shield and the safe ground are the tick's own, the rail is the
  poison's (8% of max HP a tick), the dice elemental.
- A player's root (pvpextras.js) is still a slime's OLD hold (`STUCK`, 0.7 s): a
  player cannot be locked down.
- The pet's land ward softens all of it as it softens the rest (the freeze and
  the chill shorter, the hold shorter, the stings lighter).

## Deploy order

Every field is additive. An older phone against this worker: a 2 s chill and a
2 s hold (it reads `stMs`), no freeze or wobble (it ignores `fz` and `wb`), and
each sting shown as an ordinary small hit. A newer phone against an older
worker never sees a new field: nothing changes.

## Kill switches

In the live flags, each puts its element back as it was:

- `freezehit: false`: the snowman's 1 s chill, no freeze.
- `goohold: false`: the slime's 0.7 s hold, no sting.
- `wobble: false`: the daze alone.

(`elemhits: false` still stops every element status.)

## Tests

- `monsterstatus` suite: the freeze (`fz` 600, the 2 s chill, not again inside
  its window, the ward), the goo (2 s, four stings of 8% in their own Map, the
  poison row's rail, put out on the safe ground, none without a hold), the
  wobble (`wb` 1000 on the daze, none with the switch off); the old chill and
  hold with each switch off; STUCK unchanged.
- `petsmatter`: the ward against the new lengths.
- `mp-elemhits` (a phone, real monsters): the freeze stops your walk and swing,
  ice on you and the Frozen chip, then the slow; after a daze a walk held due
  east sways; a sting is a tick with the leaf; and for real: a snowman freezes
  you 600 ms and chills you 2 s, a blue slime holds you 2 s and stings while it
  holds, a rock monster's daze carries the wobble.

## v2.3.3634: the freeze against players

Found by the review of v2.3.3620: the worker set `ps._freezeUntil` and read it
nowhere. An honest phone refuses a swing, roll and shield while frozen, but the
worker's own gate for fights between players (`_pvpDazed`, pvplunge.js) read
only the daze. A changed client could swing at a player, or have its roll count
as a dodge, for the freeze's 600 ms. `_pvpDazed` now reads the freeze too
(`pvp-lunge` §3b: a frozen player's swing lands nothing, and lands again once
the freeze is over).

## v2.3.3635: "Wobbly" waits for the wobble

Found by the review of v2.3.3620: the daze's hit sets both the wobble's start
and its end, so the HUD's "Wobbly 2s" chip stood beside "Dazed 1s" for the
whole daze while nothing wobbled yet. The chip now waits for `_wobbleFrom`
(ElemStatusChips.jsx `from`).

## v2.3.3675: the goo is the slime's blue

The owner: *"make the slime effect that keeps you stuck in position blue since
the slimes are blue (green slimes blend in too much with the green scenery)"*.

- The hold's look (effectsRenderer `_updateElemStatusFx`, the `stuck` branch)
  was drawn in the green slime's greens. It is the blue slime's body colour now,
  `#3a7ad0` (monsterVariants.js `recolor`), with a lighter and a pale shade of
  it: the ring on the ground, the goo over the boots, their shine and the drips
  (`GOO_HOLD`).
- The HUD's "Stuck" chip (ElemStatusChips.jsx) and the "Stuck!" popup when you
  try to roll (dodge.js) say it in the goo's light blue. The chip keeps its
  leaf icon, the owner's choice for the flora element (v2.3.3044).
- A venom gem's root on a player draws the same look, as it was built "as a
  slime's hold", so it is blue too.

Test: `mp-goohold`, in the world. Held through the game's own handler, the
picture round the boots goes from 0 to about 1,340 blue device px and no green
goo; the chip's words are `rgb(140, 196, 255)`.
