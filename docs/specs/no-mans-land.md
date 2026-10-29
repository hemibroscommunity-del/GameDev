# No man's land (v2.3.3058)

> Owner, 2026-10-05: *"Add a new 'No man's land' notification when you cross
> into zones with lvl 6+ monsters. It'll start at 1. This means any other
> player 1 level above or below you can attack you. If you die by another
> player you lose all the things in your inventory except what you have
> actively equipped. The player who attacks you gets a red skull above their
> head for 20 minutes based on time in the game and the timer resets each time
> they attack a player. Players who get attacked have a white skull above
> their head. If the red skull player dies they lose everything (all
> equipment, gold, etc)."*

The Wheel was safe everywhere until now. Fighting other players has been off
since v2.3.1917 ("remove the option to kill other players for now"), and it
stays off everywhere except No man's land. Duels work as before.

## Where it is

> v2.3.3690, the owner, 2026-10-28: *"Also what happened to the skull for the
> no man's land? No man's land should begin just outside of town where you
> can fight the lvl 1 monsters"*

Each land's rings of five levels, from the safe ground's edge outward (since
v2.3.3690; from v2.3.3058 it started at the Lv 6–10 ring, and the old column
is what an older worker, or the `nmlnear: false` switch, still plays):

| Ring (monster levels) | No man's land | Before v2.3.3690 |
|---|---|---|
| the commons and Brotown (the safe ground, 2,937 px round the centre) | never | never |
| Lv 1–5 | **1** | no |
| Lv 6–10 | **2** | **1** |
| Lv 11–15 | **3** | **2** |
| … | … | … |
| Lv 76–80 (the last ring before the gates) | **16** | **15** |

- The first ring begins at 2,765 px, a little inside the safe ground's
  2,937 px, so No man's land 1 starts at the safe ground's edge: nobody on the
  safe ground is ever under the rule (`NML.SAFE_R`, the bake's
  `WHEEL_SAFE_R`, held equal by the nomansland suite).
- "What happened to the skull": it showed only from the Lv 6–10 ring, so a
  player fighting the Lv 1 monsters never saw it. Now it shows the moment you
  step off the safe ground.
- What it means for a new player: the Mayor's first quest sends them to the
  Lv 1–5 monsters, which are in No man's land 1 now. Another player within 1
  level can choose to attack them there (the window always asks first), and a
  death to a player there takes everything they carry.
- The phone counts the rings from the first tier only against a worker that
  says `caps.nmlnear`; against an older one it counts from the Lv 6–10 ring as
  before, so it never shows a badge or offers an Attack the worker refuses
  (`nmlFirst`, src/game/noMansLand.js).
- Kill switch: `nmlnear: false` in the live flags puts the old start back on
  the worker and takes `caps.nmlnear` away from the phones.

## A step a monster level (v2.3.3767)

> The owner, 2026-10-28: *"also the no mans land level should raise at the
> same rate you see other monster levels increasing"*

The number used to be the ring's (above): one step every five monster levels.
Against a worker that says `caps.nmlsteps`, it is now **the level of the
monsters where you stand**:

| Where | Monsters there | No man's land |
|---|---|---|
| just off the safe ground | Lv 1 | **1** |
| the middle of the Lv 1–5 ring | Lv 3 | **3** |
| the Lv 6–10 ring, inner end to outer | Lv 6 … 10 | **6 … 10** |
| the last ring before the gates | Lv 76 … 80 | **76 … 80** |

- **The same arithmetic as the monsters** (`server/src/wheelzone.js`): a
  ring's monsters stand in its band, the ring less the bake's `clearTier`
  (120 px, `NML.BAND_CLEAR`) at either end. A monster's level is the ring's
  lowest + its depth across the band × 4, rounded. No man's land's number at a
  spot is the same, the radius standing for the distance along the spoke. At
  the 3,840 baked monster places, 97% stand in exactly their own level and the
  rest within one (`nomansland.test` §12).
- **On the plan's rings**, never a Wheel coordinate: `nmlStepLevelAt` in
  `server/src/nomansland.js` and `src/data/noMansLandRings.js`, held equal by
  mirror-audit on both Wheels.
- **The rule is unchanged, so its range grows five times as fast**: two
  players may fight when their character levels are at most N apart, N the
  LOWER of the two numbers they stand in. In the Lv 6–10 ring that is now 6 to
  10 levels, where it was 2.
- **`nmlnear: false`** (No man's land from the Lv 6–10 ring) still starts at
  1 where No man's land starts: the monster level less five.
- **The chat stays quiet**: the banner on the way in and a line on the way out
  as before, and a line only when you cross into another ring (every five
  levels), not at every step. The badge shows every step live (`nmlHere`).
- **Either side ships first**: the phone counts this way only against a
  worker that says `caps.nmlsteps` (`nmlLevelFor`, src/game/noMansLand.js).
  **Kill switch:** `nmlsteps: false` in the live flags puts the ring's number
  back on the worker and takes the cap from the phones, so both sides count
  alike again at once.
- The short Wheel (`wheel5x: false`, the rollback) counts the same way on its
  own rings, though its first ring's monsters there stay Lv 1–2.

- The rings are the plan's own: the hub is 2.7 zones of 1,024 px, then a ring
  every 1,024 px (`public/tools/world/plan.js`).
- The worker and the game measure them with the same arithmetic, from the same
  centre, with no wobble, so they never disagree about a line:
  `server/src/nomansland.js` and `src/data/noMansLandRings.js`, kept equal by
  mirror-audit.
- Dungeons are their own zones and are never No man's land.

## What the player sees

- **Crossing in:** the land banner's red plaque, "No man's land 1", and a line
  in the chat. The first time it says what the place means: *"☠ No man's land
  1: players within 1 level of yours can attack you here. Killed by one, you
  lose everything you carry (not what you wear); attack one and you carry a
  red skull for 20 minutes."* (v2.3.3316; it said "you lose your bag" before.)
  After that the line is shorter.
- **A new ring:** a line in the chat with the new number.
- **Leaving:** *"You left No man's land. Players can no longer attack you."*
- **The badge (v2.3.3107):** a red skull and the number, centred at the bottom
  of the play area just above the dashboard. The owner: *"make the skull level
  (no mans land) appear above the center of the dashboard (should be bottom
  center of playable screen area) instead of the top bar. If you tap it it
  gives you info on what it means"*.
  - It rides the dashboard's height (`--sheet-h`) like the controls, and is a
    44 px tap target. It is the skull and the number only: on a 390 px phone
    the words ran toward the bell and the jump button beside it.
  - Since v2.3.3268 it sits just LEFT of the middle: centred, it covered the
    shield button. See "The choice lasts, and the shield is there".
  - A tap opens the game's explainer (InfoPopup): who can attack you, what a
    death here costs, the red and white skulls, and how to leave. If you carry
    a skull, its minutes of play left; the badge wears a small one too.
  - While it is up it sets `--nml-lift` on the page, and the interact prompts
    above the band (a dungeon's mouth stands in No man's land) step up over it.
  - `src/ui/mobile/NmlBadge.jsx`, polled every 250 ms like ElemStatusChips.
- **The top bar** names the stage again. From v2.3.3058 to v2.3.3107 its
  second line turned red and read "☠ No man's land 1 · Lv 6–10".
- A banner waits until you have stood 0.6 s in a new ring, so walking along a
  line does not flicker.

## Who may attack whom

Two players may fight when:
- **both** stand in No man's land; and
- their character levels differ by **at most N**, where N is the **lower** of
  the two players' No man's land numbers; and
- they are not in one party.

"Any other player 1 level above or below you" is read from both sides at once.
A player standing in ring 3 cannot reach into ring 1 and attack someone 3
levels apart. Both rules have to allow it.

The level is the character level the worker keeps (`ps.level`, the one on your
name plate).

## How to attack

- **Tap** the other player: since v2.3.3253 the tap **asks first** in a small
  window (see "Attacking is a choice" below). Its **Attack** aims at them,
  shows "TARGET", and opens no player card. Before v2.3.3253 the tap aimed
  straight away.
- Your swings, arrows and bolts at them then reach the worker as attacks on a
  player, and **the worker decides every one**.
- Tapping them **again keeps** the aim. On a computer the attack *is* a click, and
  a toggle made every other swing a plain one.
- Tap empty ground to let go, as with any target.
- The aim lets go by itself the moment the rule stops allowing the fight:
  either of you leaves, the levels drift apart, or you join one party.

## Attacking is a choice (v2.3.3253)

> Owner, 2026-10-14: *"I don't necessarily want stray projectiles to hit
> another player and have a red skull appear above the player just for that.
> I want attacking other players to be intentional. Maybe if a stray
> projectile hits a player a one time window pops up asking if you want to
> attack the player with a red skull appearing on the window and a tiny
> information icon next to it. I want the window itself to be small. The
> window can say attack, party, or ignore. The window won't pop up again.
> Tapping on the player while they're in the no man's land can still have the
> party and attack (with red skull) options there."*

**A stray shot never hurt anyone.** Since v2.3.1302/v2.3.1306 only the player
you aim at (or duel) is ever sent to the worker as an attack, by both the shot's
hit test (`projectiles.js`) and the swing's (`monsterCombat.js`), and the worker
skips everyone but the declared `target`. What was not a choice was the aim: a
tap within 25 px of a player aimed at them at once. So a tap meant for the
monster beside them started a fight, and the first hit gave you a red skull.

**The window.** "Attack <name>?" with their level, the red skull with a tiny (i)
on its corner, and three buttons:

- **Attack** aims at them: No man's land's lock and "TARGET", exactly what the
  old tap did. The red skull comes with the first hit that lands, as before.
- **Party** sends the party invite the player card sends.
- **Ignore**, or 10 seconds untouched, lets it go.

The (i) opens the badge's explainer, which now also says *"How: tap a player, or
swing or shoot at them, and choose Attack. Until you do, your blows never hurt
them."* (v2.3.3316's words; v2.3.3253 said "tap a player and choose Attack. A
stray shot never hurts anyone.") The window closes by itself the
moment they can no longer be fought: either of you leaves, the levels drift
apart, a party, or they are gone.

**What raises it:**

| Trigger | When |
|---|---|
| **A stray shot** | One of *your* arrows, bolts or specials passes through a player you could fight who is not your aim. It uses the real hit test's capsule and radius, and never counts through a rock. The shot flies on and does them nothing. **Once per player** (the owner's "won't pop up again"), never over an open window, never in a duel. |
| **A swing** (v2.3.3316) | Your sword's (or greatsword's) swing reaches such a player, by the reach and arc the swing's own claims use. The swing does them nothing. The same rules as a shot. Before v2.3.3316 a swing asked nothing at all, which is what the owner found: "Attacks without locking on target did not pop up the window". |
| **The bow's line** (v2.3.3528) | You hold the attack (or a special waits for its line) with a bow whose line is on such a player and nothing else. The bow looses only at something, so it never shot through them to ask. It fires nothing at them. The same rules as a shot. |
| **A tap** | On such a player you are not already aiming at. Every time; it replaces a window about someone else. A tap on the one you aim at keeps the aim. |

**"Once" means once per answer (v2.3.3316).** Attack, Party and Ignore are
answers, and after one a shot or a swing never asks about that player again.
A window that goes with no answer (its 10 seconds ran out, or they stopped
being someone you could fight) is not an answer: a shot or swing may ask about
them again 15 seconds after it went (`NML_ASK_AGAIN_MS`). Before, a window that
timed out unseen in the middle of a fight was the only one that player would
ever raise until the page was reloaded.

**Hitting back stayed one tap (until v2.3.3528).** If the player gave you
your white skull and you carried no red one, a tap on them aimed at once, with
no window, and a stray shot or a swing through them asked nothing. Since
v2.3.3528 hitting back goes through the window like everything else: see
"Hitting back goes through the window too" below. The worker says who attacked
you: `nml_skull`'s `by`, the retaliation rule's own `whiteBy`, sent only while
a white skull runs. Against an older worker there is no `by`, and the window
always says "Attack".

**Where it sits: at the top, out of the thumbs' way.** The first cut sat just
above the No man's land badge. On a 390 px phone that put Attack exactly where a
left thumb comes down to steer, and Ignore over the attack disc. Now it sits:

- under the Wheel's minimap, centred, on a phone held upright;
- beside the minimap, in the strip to its left, when there is room (a phone held
  sideways, a computer);
- under the party invite card if one is up (`data-party-invite`), never over it.

It is portalled to the page body at the prompt layer the party invite uses
(`Z_ABOVE_DASH_PROMPT`), so its numbers are the screen's own. Inside the game's
wrapper a computer's shell and a sideways phone are their own frames, and on a
computer it landed on the minimap. It has no scrim: it can come up in the middle
of a fight with the monsters, and it takes only its own taps.

**A player beside you can be tapped.** On a phone a tap within 52 px of your own
body opens chat (v2.3.1287), and two players at a sword's reach stand inside that
circle. In No man's land, a player you could fight under the finger now takes the
tap, as an NPC and a resource already do: within the world tap's 25 px of them,
and nearer them than your own body. Everywhere else your own circle still opens
chat.

**Code:**

- `src/game/nmlAsk.js`: the rules, the store, Attack/Party/Ignore, `nmlHitBack`.
- `src/ui/mobile/NmlAskCard.jsx`: the window and `cardPlace`.
- `projectiles.js` `_nmlStrayShot`: the stray shot.
- `BroTown.jsx`: the tap, `nmlPlayerAtClient`.
- `server/src/nomansland.js` `_nmlSend`: `by`.

**Switches:**

- `?nmlask=0` is the game as it was: the tap aims at once, and a stray shot asks
  nothing.
- `window.__btNmlAsk` is the QA handle: `current`, `asked`, `setMs`.

## The choice lasts, and the shield is there (v2.3.3268)

> Owner, 2026-10-16: *"I want attacks against real players to hit them even
> when not locked on target but only if you select the attack option that pops
> up on the window. I also want to be able to use shield for when battles
> happen against real players in no mans land"*

**What was wrong.** Your weapons tried a real player only while you were
*locked* on them. The window's Attack locks, but tap a monster, or the ground,
and the lock went, and with it every hit on them: the bow would not fire at
them, and arrows, bolts and swings went straight through. And the No man's land
badge, centred on the screen, sat on top of the shield button (the badge is
drawn over it). A tap on the middle of the shield opened the badge's rules
instead.

**Attack is a choice that lasts.** Choosing Attack in the window, or tapping
the player who attacked you (hitting back needs no window), records them as a
**foe** (`src/game/sparTargets.js` `chooseFoe`, called by `nmlAsk.js` `nmlAim`).
To your weapons a foe is what a sparring clone is (v2.3.3267):

- the **sword's automatic target** takes the nearest foe as it takes the
  nearest monster (No man's land's lock, `src: 'auto'`);
- the **bow** fires when a foe is on its line;
- an **arrow or a bolt** that reaches a foe hits them;
- a **swing** lands on every foe in its arc.

Every blow still names the foe as its `target`, so nobody else is touched by
it. The worker is unchanged: it judged these hits by No man's land's rule all
along; only the page never sent them.

**For as long as the fight lasts.** The choice lapses (the foe is forgotten,
and a tap asks again) when:

- No man's land's rule no longer lets you fight them (either of you out of it,
  the levels drift apart, a party);
- they leave or are no longer drawn;
- **a minute passes with no blow between you, either way** (`FIGHT_QUIET_MS`,
  each `pvp_hit` to or from them restarting it: `notePvpBlow`). A stray shot an
  hour later is not the choice you made, the reason for the window in the
  first place. Being locked on them by your own hand keeps the choice; the
  sword's automatic lock does not.

**A player you have not chosen is untouched**, as before: a stray shot through
them does nothing, and asks once. A tap on a foe you already chose aims at
once, with no second window (a window in the middle of that fight would cost
it).

**The shield.** The shield button (and the Special button) now stays up for
every weapon while a fight with a player is on:

- a foe you chose is within about a screen (`FIGHT_R` 900 px), before the first
  blow;
- a player who hit you, or whom you hit, in the last minute is within that
  reach and No man's land still lets you fight (`fightingNow`): between their
  blows, and long after the old five-second rule let it go.

With nothing locked, a raised guard faces the nearest of them.

**The badge moved off the shield.** It now sits just left of the middle and of
the shield button, whichever is further left (`NmlBadge.jsx`, from
`blockAnchor`), 8 px clear of the shield where there is room and never less
than 2. It is also narrower, so it fits between the shield and the notification
bell on a 360 px phone. It still shows the skull and the number, and your own
skull is now a small mark on its top corner, the way a count sits on the bell,
instead of a third thing in the row. Measured at 360, 375, 390 and 430 px and
sideways: clear of the shield, the bell, the weapon button and the attack disc.
At 320 px (a 2016 iPhone SE) there is no room between the bell and the shield;
the badge keeps clear of the shield and lies over the bell's right half.

**Code:** `src/game/sparTargets.js` (foes, blows, `fightingNow`, `chosenNear`,
`fightersNear`), `nmlAsk.js` `nmlAim`, `noMansLand.js` (hands its rule in:
`setFoeRule`), `targeting.js` (the sword's automatic target), `projectiles.js`
(the hit test and `_nmlStrayShot`), `monsterCombat.js` (the swing's claims),
`gameEvents.js` `pvp_hit` (`notePvpBlow`), `shieldToggle.js`,
`SpecialButton.jsx`, `NmlBadge.jsx`, `BroTown.jsx` (the tap).

**Tests:** `spar` suite §16 (the rules: choose, lapse, a minute's quiet, a lock,
blows, the fight round you), `mp-nmlfoe` (three phones).

## Hitting back goes through the window too (v2.3.3528)

> Owner, 2026-10-20: *"If a red skull player (first to attack in wilderness)
> attacks, the other player can't attack back unless they lock on target (tap
> thr enemy player). You recently made a fix where registering hits doesn't
> require the lock on target (wanted behavior). Apply that there too. But keep
> the behavior of needing to confirm the "attack" button that pops up in the
> window first before any damage is registered to either player in the
> wilderness."*

**What was wrong.** The player who attacked you was the window's one
exception (v2.3.3253's "hitting back stays one tap"):

- a **sword swing** or a **staff bolt** at them asked nothing, and, as they
  were no foe of yours, did nothing;
- a **bow** held at them looses only at something on its line, and they were
  nothing to it, so it simply waited;
- a **tap** on them aimed at once, with **no window at all**.

So the one being attacked could fight back only by tapping their attacker,
and when they did, they never chose through the window the way their attacker
had to.

**Now there is no exception.** For both players the window's **Attack** comes
before any blow:

- A swing, a shot, the bow's line or a tap at the player who attacked you
  raises the window, the same as for anyone.
- The window says so: **"Hit back <name>?"**, with the **white skull** you
  carry (the badge's own white), not the red one. Hitting back the player who
  hit you gives you no red skull (the worker's retaliation rule, unchanged),
  so the red skull's warning would be wrong. The buttons are the same three,
  and Attack still says Attack. The window checks this on its own clock: a
  window that came up about a passer-by who then attacks you turns into "Hit
  back".
- Its Attack makes them your foe (v2.3.3268's choice). From then on every blow
  of yours lands on them whether you are locked on or not: the sword's
  automatic target takes them, the bow looses at them, bolts and arrows hit
  them.
- Until you answer, nothing you do hurts them.

**Their attack re-opens the question, once a bout.** An answer is normally
final for shots and swings (Ignore means never again). But the player who
attacked you is a new question if that attack began after your last answer
about them. A **bout** is a run of blows between you, either way, with no gap
of a minute (`FIGHT_QUIET_MS`, the same gap a choice to fight lapses by).
`sparTargets.js` `pvpBoutAt` keeps when each bout began, and `nmlAsk.js`
`nmlAttackedSince` asks whether their bout of attacking you began after the
window last came up about them. If it did:

- an Ignore given before it (say, a stray shot's window about a passer-by),
- a window that went unanswered before it,
- or an Attack whose fight has since gone quiet for a minute

does not hold, and your next swing, shot or bow line at them asks again.
Without this, a player who had once waved someone off could only answer that
player's attack with a tap, which is the owner's very complaint. An answer
given during a bout holds for the rest of that bout.

**The worker's half: area moves wait for your own first blow.** An area move
(the whirlwind, the element burst, a staff splash, the big bolt's blast, a
bash with nothing named) reaches only players you are "already fighting". That
used to mean a blow between the two of you **either way** in the last 10 s, so
the moment the attacker hit you, your whirlwind or splash could hit them
before you ever chose to fight back. Now it means a blow **you** landed on them
(`server/src/pvpextras.js` `_notePvpEngage` / `_pvpEngaged`, each pair keeping
both directions), or a duel, arena or sparring partner as before. The game
sends your blow on a player only after you chose them, so this is that choice
as the worker can see it.

One thing to know: a whirlwind (or burst) thrown after you choose Attack but
before your first ordinary blow lands still passes them by, because the worker
cannot see the window. That has always been true for the attacker too. Your
first swing, arrow or bolt is what opens area moves on them. (Since v2.3.3530 the
window's Attack itself tells the worker, and opens them at once: "You are
white the moment they choose".)

**Code:**

- `src/game/nmlAsk.js`: the hit-back exception gone from `nmlAsk`, `back` on the
  window, `nmlAttackedSince`, the `'aim'` trigger.
- `src/game/sparTargets.js`: `notePvpBlow` starts a bout, `pvpBoutAt`.
- `src/game/projectiles.js` `nmlSightAsk`: the bow's empty line.
- `src/game/monsterCombat.js`: the bow's sight calls it while you hold the
  attack.
- `src/ui/mobile/NmlAskCard.jsx`: "Hit back", the white skull.
- `src/ui/BroTown.jsx`: the tap on your attacker asks.
- `src/ui/mobile/NmlBadge.jsx`: the explainer's "Get attacked" line.
- `server/src/pvpextras.js`: the direction of a pair.

**Switches:**

- `areachoice: false` in the live flags: area moves count a blow either way
  again, as before v2.3.3528.
- `?nmlask=0` is still the game before v2.3.3253 (a tap aims at once, nothing
  asks).

**Tests:** `pvp-extras` suite §1b (the direction, the kill switch, a real claim
then a real whirlwind, the old rule as a mutation), `spar` suite §16q (the
bout), `mp-nmlask` step 7 (the attacked player's sword swing asks "Hit back",
does nothing until Attack, then lands with no lock and no red skull),
`mp-nmlfoe` step 8 (the attacked player's bow looses nothing and asks; a tap
asks too; Attack; the arrows land with no lock).

## A group attacks you: one window (v2.3.3530)

> Owner, 2026-10-20: *"If you get attacked simultaneously by a group of people
> you don't need additional windows to approve. If the 2nd, 3rd, etc people
> already approved "attack" at you you can immediately hit back at each of
> them after that."*

**The first window stays.** No blow of yours lands on anyone in No man's land
before a window's Attack, as v2.3.3528 made it. But once you have chosen a
fight (you have a live foe), everyone attacking you **joins it with no window
of their own**. Their attack was their own choice: a blow of theirs lands only
after their own window's Attack. So they become your foes too, and every swing,
shot and bow line of yours lands on each of them, locked or not.

- **When you choose.** The window's Attack (`nmlAsk.js` `nmlAim`) joins
  everyone who struck you in the last minute (`FIGHT_QUIET_MS`;
  `sparTargets.js` `attackersNow`, from each `pvp_hit` on you).
- **While you fight.** A blow that lands on you from someone who is not yet
  your foe makes them one as it lands (`gameEvents.js` `pvp_hit` →
  `nmlJoinFight`). A window that happened to be up about them goes, since they
  are your foe now.
- **Without a fight of your choosing, nobody joins.** A group that hits you
  while you have chosen no one still meets the window first.
- **An earlier Ignore or Party does not hold one of them out.** They are
  attacking you, and you have chosen to fight. (Ignore still means "leave me
  alone" before you choose any fight.)

**No red skull for hitting back any of them.** This was the worker's bug,
found here. A white skull remembered **one** giver, `whiteBy`: the **last**
player to hit you. With two attackers, hitting back the first, once the second
had hit you, read as an attack and gave you a red skull. Killed by a player
with a red skull, you lose everything you wear. Now the worker keeps each
attacker's own right to be hit back (`nml_state`'s `from`: id → ms left, 20
minutes from their last blow on you, counted down with the skulls). Hitting
back **any** of them gives no red skull (`nomansland.js` `_nmlHitsBack`). The
game is told them all (`nml_skull`'s `bys`), so the window says "Hit back" for
each of them (`nmlAsk.js` `nmlHitBack`).

**Area moves reach the group once you fight.** Under v2.3.3528's rule an area
move waited for a blow of yours on each player, so a whirlwind into the group
that attacked you hit only the one you had already struck. Now an area move
also reaches a player who struck you in the last 10 s, while you have struck
someone under No man's land's rule in the last 10 s (`pvpextras.js`
`_pvpEngaged`, `_pvpNmlStruck`). A blow on a duel, arena or sparring partner
does not count. Before your first blow it still reaches nobody who attacked
you.

**Code:**

- `src/game/nmlAsk.js`: `nmlJoinFight`, the join on Attack in `nmlAim`,
  `nmlHitBack` reading `bys`.
- `src/game/sparTargets.js`: `notePvpBlow` keeps who struck you (`hitMeAt`,
  `attackersNow`).
- `src/networking/gameEvents.js`: a blow on you calls `nmlJoinFight`.
- `src/game/noMansLand.js`: `applyNmlSkull` reads `bys`.
- `server/src/nomansland.js`: `from`, `_nmlHitsBack`, `bys`, stored and read
  back on join.
- `server/src/pvpextras.js`: the group's area rule.

**Switches:**

- `nmlgroup: false` in the live flags: the last attacker's right alone (the
  old rule), no `bys`, area moves wait for a blow of yours on each, and
  `caps.nmlgroup` false at each phone's next join (no attacker joins without
  their own window).
- The game joins attackers only against a worker that says `caps.nmlgroup`.
  An older worker would give a red skull for hitting back any attacker but the
  last.

**Tests:** `nomansland` suite §12 (both attackers' rights, `bys`, no red
skull for hitting back the first of two, a bystander still an attack, the
switch as a mutation, each right counting down on its own and going with the
skull, stored and back on join, an older record, the cap of 16, the caps);
`pvp-extras` §1c (no area move before your first blow, then the whole group,
never a bystander, ENGAGE_MS on both sides, a duel's blow not counted, the
switch, a real claim and whirlwind end to end); `spar` §16r (who struck you);
`mp-nmlfoe` step 8 (the bystander attacks the wanderer too through its own
window; the wanderer's one window for the raider joins the bystander; its
arrows land on the bystander with nothing locked and nothing asked, and no red
skull though the bystander hit it last).

## You are white the moment they choose (v2.3.3530)

> Owner, 2026-10-20: *"Another change too. Whenever someone attacks you in no
> man's land you always get a white skull above your head. You only keep what
> you have equipped. Doesn't matter if you attack back or not"*

**What was wrong.** The skulls started with the first blow the worker
resolved. But an attacker's opening shots can all **miss** (the worker never
hears of a miss) or be **rolled through** (a blow in a roll's i-frames is
skipped). Then the one attacked carried no white skull, and their hitting back
was, to the worker, the first attack: **they** took the red skull, the one a
player kill takes everything worn for, and the one who started it took a
white one and could fight on as "hitting back".

**Now the window's Attack is the attack.** The game tells the worker the
choice itself (`nml_attack {target}`, sent by `nmlAsk.js` `nmlAim`: the
window's Attack, or a tap that aims at a chosen player). Both skulls start at
once, before any arrow flies (`nomansland.js` `_handleNmlAttack` →
`_nmlSkulls`):

- the attacker **red** (unless they are hitting back someone whose right
  still runs);
- the one attacked **white**, with the attacker's right to be hit back (the
  group section's `from`).

So whoever chooses to attack you, you are white, and hitting them back
(through your own window's Attack, a swing, a shot) keeps you white. Killed by
a player, a white skull keeps what it wears and loses what it carries (the
death rules below, unchanged); only a red skull loses what it wears.

**What a choice is not.**

- **No kill is stamped by it.** It leaves `_nmlLastHitBy` alone, so a death
  in the next few seconds is a No man's land kill only by a real blow
  (`_nmlOnDeath`). A choice can never be used to claim the bag of someone a
  monster is killing.
- **No blow** for the fight-food clock or the linger.
- **It counts as the chooser's engagement** (`pvpextras.js`
  `_notePvpEngage`): their area moves reach the one they chose, as their
  first blow would have let them. So the hitting-back window's Attack now opens
  your whirlwind on them at once: v2.3.3528's "one thing to know" (a whirlwind
  thrown right after Attack passing them by) is gone against this worker.

**Checked as a hit is:** No man's land's rule between the two
(`_nmlAllowed`: both in it, levels within it, not one party), no duel or arena
pair, both alive and in the Wheel, within `NML.CHOOSE_R` (2,400 px), one choice
a player every `NML.CHOOSE_GAP_MS` (300 ms). Anything else is ignored.

**And the group joins on the choice too.** A player who chose to attack you is
in `bys` before their first blow. While you fight one you chose, they join
your fight with no window (`nmlAsk.js` `nmlJoinFromBys`, `attackedMeAt`: a
right's time left dates their choice or blow). That is the owner's "already
approved 'attack' at you", exactly.

**A red skull of your own still shows.** If you attacked someone earlier and
still carry red, being attacked does not wash it white: the red was earned
elsewhere.

**Switches:** `nmlchoice: false` in the live flags: the choice is ignored,
the skulls wait for the first blow as before, and `caps.nmlchoice` is false at
each phone's next join. An older game sends no choice.

**Tests:** `nomansland` §13 (both skulls at the choice, before any blow; no
kill stamped; the chooser's engagement; the one attacked hitting first stays
white and the one who started it stays red; `nmlchoice: false` as the
mutation, the old inversion; refused at yourself, nobody, `__proto__`, out of
No man's land, levels too far apart, past `CHOOSE_R`, a duel pair, a dying
player; the rate; the caps; never relayed); `mp-nmlask` step 6 (the raider red
and the wanderer white at the raider's Attack, the wanderer's HP untouched);
`mp-nmlfoe` step 8 (the bystander's Attack whitens the wanderer by the
bystander before any bolt).

## The skulls

- **Red:** you landed a hit on a player under the rule (since v2.3.3530, from
  the moment you choose Attack on them). It lasts 20 minutes, and every new
  hit resets it to 20.
- **White:** a player landed a hit on you (since v2.3.3530, from the moment
  they choose to attack you). It lasts 20 minutes, reset by every hit, and
  remembers who gave it.
- **Hitting back is not attacking.** Hitting the player who gave you your white
  skull gives you no red one (as long as you have none of your own). The player
  who started the fight keeps resetting theirs. Since v2.3.3530 that is any
  player who hit you in the last 20 minutes, each on their own clock, not only
  the last (a group: "A group attacks you: one window").
- **Time in the game:** a skull only counts down while you are connected.
  Logging out does not wait it out.
- Each skull is drawn **above the name plate** (or the HP bar in its place), at
  18 px:
  - your own from `nml_skull` (ms left);
  - everyone else's from the tick (`sk: 'r' | 'w'`, sent with every player
    entry, so an idle one stays drawn).

  The threat skull of v2.3.1193 was drawn at a fixed height from before the
  plates moved over the head, half hidden behind the name. It moved up too.

## What a death costs

**Killed by a player under the rule** (the killing blow, or since v2.3.3316 a
tick of a burn or poison that player set, came through it in the last 5
seconds). Since v2.3.3316 that is **everything you carry** (see "Everything but
what you wear" below):

| What | Where it goes |
|---|---|
| the **whole bag**: every item, the gathering tools, every ore, every cooked fish and the quest's remains too (since v2.3.3316) | the usual death pile, but the **killer's** for its owner window ("Raider's loot" to everyone else), then anyone's |
| your **gold** (since v2.3.3316) | to the killer |
| spare weapons | to the killer (mail if they are offline or full) |
| spare **armour and legs** | to the killer, each with its provenance row, so it stays a provable piece in their hands |
| spare **shields** (since v2.3.3091) | to the killer the same way, once your game has told the worker which shield is on your arm (see below) |
| spare **amulets** (since v2.3.3316) | to the killer the same way |
| everything worn | **kept** |
| outfit pieces | kept (see below) |

**A red-skulled player killed by a player** loses all of the above **and**
everything worn (weapons, armour, legs, shield, amulet) and every shield, to
that player. Outfit pieces still stay.

**A red-skulled player killed by anything else** (a monster, a fall) loses
everything carried, to nobody: the bag falls in a pile anyone may take at once,
and the gold and the spares are gone. **What they wear stays** (since
v2.3.3316; before, that went too).

The dead player's game is told exactly what went (`nml_loss`) and removes just
those pieces from its own copy of the bag. The gear lists are also kept by the
game and offered again on every join (gearstash.js). Every piece the worker
took has its id written down (`nml_state:<pid>`'s `forfeit`) and is refused
if it is offered again.

### What the worker cannot take yet, and why

The worker only takes what it can tell apart from what you wear.

- **A stash copy of the armour you wear.** The armour and legs lists are
  merged from your game at each join. A piece put on since can still sit in
  the list under the same id (`storegear.js` §2). That copy is the piece on
  your body, so it is never taken or forfeited. A copy with no id that matches
  what you wear is left alone too. Taking a real spare is a loss for you;
  giving a stale copy away would be a second piece for the killer.
- **Shields, until your game says which one you wear.** See "The shield on
  your arm" below. A game too old to say, or a report naming a shield the
  worker does not hold for you, leaves every shield where it is.
- **Outfit pieces.** Nothing tells the worker which outfit pieces you wear, and
  today there is nothing in them to take:
  - the wardrobe is the T-shirt, which every player can pick;
  - and the plate's look, which follows the armour piece itself. The armour
    piece is already taken as armour.

  An outfit that can be *earned* would join the spares the same way, with its
  own wear report.
- **Amulets** were a red skull's only until v2.3.3316; the spare ones (the
  amulet stash) go in every loss now. The amulet you wear stays unless a player
  killed you with a red skull.
- **Armour granted during this session.** A quest's armour reward goes to your
  game's bag first, and the worker adopts it at your next join. Until then it is
  not in the worker's list, so a death does not take it.
- **Gold nuggets and bars** (the amulet forge's ingredients). They have no credit
  kind to carry them to a killer, so they stay.

Each of these closes when the worker learns the slot. Shields have closed
(v2.3.3091).

## Everything but what you wear (v2.3.3316)

> Owner, 2026-10-17: *"Opponents do not drop all of their items except what
> they have equipped if they die in no mans land. This should also be fixed.
> Additionally make sure red skulls (players who attack another person) lose
> all their stuff if killed by another player. If they're killed by a monster
> then make it so they just lose everything except their equipped items"*

Asked two follow-up questions, the owner answered:

- the gathering tools: *"Drop them, sell replacements"*;
- the gold of a player with no skull: *"Lose their gold too"*.

**What a death kept that it should not have.** Every death keeps its
*carve-outs* (`_keptThroughDeath`, gathering.js), and a death here kept them
too:

- the **gathering tools** (the axe, the rod, the pickaxe), so a lost fight
  would not end a skill for good;
- every **quest objective's family**, which reaches much further than it
  sounds: the first quests ask for cooked fish and ore, so **every `ore_` and
  every `cooked_fish_`** was kept, and four monsters' remains. A gatherer
  killed with a bag of iron ore and their tools dropped nothing at all (a bag
  holding only those made no pile).

And the gold of a player with no skull, and the spare amulets, stayed too.

**Now** a loss here takes the whole bag with no carve-out (the death pile's
`all`, and the wipe beside it keeps nothing but the half-second pickup's own
part), and the gold and the spare amulets go to the killer with the rest. An
ordinary death (a monster, no skull) is unchanged: its carve-outs stay.

**A red skull a monster kills keeps what it wears.** Its game is told so
(`keepWorn`), and clears only what the worker took.

**A burn or poison's tick keeps the kill its setter's.** A tick never resets a
skull, but it now refreshes the kill's 5 seconds (`_nmlTouch`): a poison's last
tick a little after its blow used to kill with nothing taken, as if a monster
had.

**The killer is told what they took** (`nml_take`): *"☠ You took Wanderer's
things: 12 things lie where they fell, yours for a minute; 170 gold and 2
pieces of gear are yours."* The pile was the part nothing pointed at.

**A lost tool, bought back.** Diego keeps the General Store's counter, and his
window opens as you walk up to the store. He now sells the axe, the rod and the
pickaxe at **100 gold** each (`TOOL_SHELF`, server/src/shop.js):

- only to a player a quest **gave** that tool: the axe and the rod once Mayor
  Bro's trade quest (life_1) is accepted, the pickaxe once it is turned in. So
  gathering is still behind the Mayor's quest;
- only to one who holds **none** in the bag (a replacement, never a second),
  one at a time;
- and he never buys one back, so a tool taken from the dead is no gold at his
  counter.

His window says why it will not sell you one: *"You have one"*, or *"Mayor
Bro's quest gives the first"*. The rows carry `tool: true` and no count; an
older game does not show them. Kill switch: `toolshop: false`.

**What a player sees.** The first line on entering No man's land, the red
skull's line and the badge's explainer all say it: killed by a player you lose
everything you carry (not what you wear); with a red skull, killed by a player
everything, killed by a monster everything but what you wear. The victim's line
is now *"☠ Raider took everything you carried in No man's land: your bag and
your gold, and your spare weapons, armour and shields. What you wear is still
yours."*

## The shield on your arm (v2.3.3091)

> Asked *"Shields and outfits in no man's land?"*, the owner said *"Yes"*.

Putting a shield on was a purely local move in the game, so the worker could not
tell the shield on your arm from a spare. Now the game tells it:

- **When.** Whenever the shield on your arm changes (the bag's equip and unequip,
  the Shield picker), once on every join, and when a new shield lands in your
  bag (a quest's).
- **What it says.** `shield_wear` with one of:
  - `{gid}`: a recorded piece, by its id;
  - `{sig}`: a piece from before the ledger, by the signature both sides
    already use (name | gearBase | tierMult | tier);
  - `{none: true}`: nothing on the arm.
- **What the worker keeps.** `ps.shield` is now the shield you **wear** and
  `ps.shieldStash` the ones you carry, as for armour.
  - The piece you put on leaves the bag list (one copy).
  - The one you took off goes into it, unless a copy is already there. One
    too few is made up at the next join's merge; one too many would be a
    second shield for whoever takes your bag.
  - Nothing is ever deleted or described: the named piece must be one the
    worker already holds for you (on your arm, in its copy of your bag, or by
    id in your ledger).
- **A shield it does not hold** changes nothing, and marks the arm unknown for
  the session.
- **The loss.** An ordinary loss in No man's land takes the spare shields with
  the armour's rule:
  - a stash copy of the shield you wear (the same id, or the same signature for
    a piece with none) is that shield, and stays;
  - each spare goes to the killer with its provenance row, and its id is
    forfeited;
  - `nml_loss` names it, and your game takes it out of its bag.
- **Only once the arm is known.** The worker holds `ps._shieldKnown` for the
  session; it is never saved. Without a report every shield stays, as before.
- **No gates.** Blocking is the game's own sum, and the worker never refused a
  shield. Refusing one now would only make the two disagree about which shield
  is the spare, the one thing this report settles.
- **Side effects that are fixes.** Two things that read `ps.shield` now read
  the shield you actually wear:
  - the shield ability's "no shield" refusal;
  - the auction house's "worn: take it off first".

  Before, both read the shield you were first given.

## Nothing leaves the bag in a fight (v2.3.3183)

A death to a player drops the bag in a pile that is the killer's (and a red
skull's gold). A modified game could empty a losing bag in the fight's last
seconds -- sell it to Diego, list it on the auction house, put it in a market
order or a trade to a friend, plant the seeds -- so the pile was empty, and
cancel the orders afterwards (overnight economy review, decision 7). The
order board already refused this (`order-fight`, farmorders.js). Now every
road out of the bag does, on the same test: **in a duel, or a hit between
players in the last 10 s** (`PVP_HEAL.WINDOW_MS`, cooking.js's clock), in
`_bagLockedByFight(pid)`:

| Road | Refusal |
|---|---|
| Diego buys (`_shopSell`) | "Not while you are fighting a player" |
| Auction house: list, buy, bid (`_stCreateListing`, `/buy`, `/bid`) | the same, `settled: true` |
| Market order, buy or sell (`_mktPlaceOrder`) | the same |
| Trade confirm (`trade2_confirm`, either side in a fight) | the window stays open, `reason: 'fight'` |
| Farm plant, compost (`farm_act` plant / feed) | `farm_state {err: 'fight'}` |

Honest players never meet it: the shops are in town and a fight is not, and
the window is ten seconds after the last hit. What only rearranges the bag
(cooking, smelting, salvage, forging) or brings things in is untouched, and
cancelling an order or a listing stays open (the escrow is yours). The game
says "Not while fighting a player" on the farm and "Not while one of you is
fighting a player. Try again in a few seconds." in the trade window. Kill
switch: the live flag `fightlock: false`. Tests: `nomansland` suite §10.

## Wire, storage and switches

- **Client → worker:** attacks are the existing `player_attack`;
  `_pvpAllowed` asks `_nmlAllowed` before the `OPEN_PVP` master switch.
  Since v2.3.3530, `nml_attack {target}`: the window's Attack, which starts
  both skulls at once (`_handleNmlAttack`), sent only against a worker
  advertising `caps.nmlchoice`.
  Since v2.3.3091, `shield_wear` `{gid | sig | none}` (server/src/shieldwear.js,
  client src/game/shieldWear.js), sent only against a worker advertising
  `caps.shieldwear`.
- **Worker → client:** `nml_skull` `{red, white, by?, bys?}` (ms left; since
  v2.3.3253 `by` is who gave you the white skull, only while it runs; since
  v2.3.3530 `bys` is every player whose right to be hit back still runs, as
  `[[id, ms left], ...]`, most time first, 16 at most) and
  `nml_loss` `{by, red, weapons, gear: [{field, gid | sig}], worn, coins, bag}`
  -- since v2.3.3316 also `named: true` (the gear list names every piece
  taken, a red skull's too: the game takes out exactly those) and `keepWorn`
  (a red skull no player killed keeps its worn slots); `coins` is every loss's
  now. And since v2.3.3316 `nml_take` `{from, items, lootId, coins, weapons,
  gear, worn}` to the killer. All three are in `PRIVILEGED_EVENTS`.
- **Diego's shelf** (v2.3.3316): `shop_state`'s items gain the three tools,
  `{key, qty: null, tool: true, sell: 100}`; `shop_quoted` for one carries
  `tool: true` and, when he will not sell it to you, `qty: 0` and `why`
  (`'have'`, `'quest'`, `'off'`); `shop_buy` of one buys one. The tick's player wire carries `sk`, absent
  with no skull.
- **Storage:** `nml_state:<pid>` `{red, white, whiteBy, forfeit, from?}`
  (`from` since v2.3.3530: `[[id, ms left], ...]`, each attacker's right to be
  hit back; an older worker ignores it and a record without it keeps
  `whiteBy`). It is written
  when a skull starts, changes colour or ends, and every 30 s while one runs (not
  on every hit). It is read back on join before the gear stashes are adopted,
  and deleted when empty. Registered in ARCHITECTURE-HANDOFF.
- **Payouts:** `_creditPlayer` with `opId: 'nmlloot:<victim>:<death ms>:<n>'`,
  one per piece of one death.
- **Caps:** `caps.nomansland`. The game shows nothing and aims at nobody against
  a worker without it.
- **Kill switch:** `nomansland: false` (lower case) un-advertises it, refuses
  every hit, starts no skull and takes nothing on a death. That is the safe
  Wheel exactly.
- **The tool shelf's switch:** `toolshop: false` (v2.3.3316) takes the tools
  off Diego's shelf and refuses every buy of one. (The death still takes the
  tools; set `nomansland: false` to stop that.)
- **The area moves' switch:** `areachoice: false` (v2.3.3528): an area move
  reaches a player after a blow between you either way, as before, instead of
  only after a blow you landed.
- **The group's switch:** `nmlgroup: false` (v2.3.3530): only the last
  attacker's right to be hit back, no `bys`, area moves wait for a blow of
  yours on each, and `caps.nmlgroup` false (no attacker joins your fight
  without a window of their own).
- **The choice's switch:** `nmlchoice: false` (v2.3.3530): `nml_attack` is
  ignored and the skulls wait for the first blow; `caps.nmlchoice` false.
- **The shield's switch:** `shieldwear: false` (v2.3.3091) un-advertises
  `caps.shieldwear`, ignores every report, and an ordinary loss takes no shield
  again.
- **Dev tool:** `/api/admin/dev/vitals` takes `hp` (at least 1, at most max), as
  it takes `stamina`. It makes a test's killing blow one hit.

## Tests

- v2.3.3316:
  - `server/test/nomansland.test.mjs` (100 checks; 68 before): §5 a kill
    takes the whole bag (the pickaxe, the remains, the ore, the cooked fish)
    into the killer's pile, the gold to the killer, `nml_loss`'s `coins`,
    `named` and `keepWorn`, and `nml_take`; §6 a red skull a player killed
    loses the axe and the ore too, one a monster killed keeps both weapons in
    hand and its plate and loses the spare staff, the spare plate, the rod,
    the cooked fish and the gold; an ordinary death keeps its carve-outs; §11
    the spare amulet to the killer, the respawn gives nothing back, a poison
    tick 6.5 s after its blow is still the poisoner's kill and starts no skull,
    and a red skull a monster kills keeps the shield on its arm (the spare
    goes) or, the arm unknown, every shield;
  - `server/test/shop.test.mjs` "a lost tool, bought back": the shelf, who has
    earned which tool, refused with no quest, refused holding one, one at a
    time, saved, the pickaxe after the turn-in and the gold, never bought
    back, not by the dying, the kill switch;
  - `tools/qa/mp/mp-nmlask.mjs` step 0 (two phones): a sword swing with
    nothing locked asks ("swing"), and does nothing; unanswered, it may ask
    again after the quiet; Ignore ends it. On main's build the same step
    swung for 5 s and nothing asked;
  - `tools/qa/mp/mp-nomansland.mjs` 4b: the wanderer carries iron ore, cooked
    fish, all three tools and 170 gold, and holds a greatsword; after the
    kill the bag and purse are empty, the greatsword still in hand, all of it
    in the raider's pile, the gold the raider's, and the raider told;
  - `tools/qa/mp/mp-toolshelf.mjs` (two phones): Diego's shelf shows the tools
    at 100g; one bought back (bag, purse and the worker's saved copy), "You
    have one" after, the pickaxe too; a player no quest gave one is told so,
    and a buy sent anyway is refused.
- v2.3.3268: `server/test/spar.test.mjs` §16 (the page's foe rules) and
  `tools/qa/mp/mp-nmlfoe.mjs` (three phones: the choice, every weapon with
  nothing locked, a bystander untouched, the defender's shield up and
  blocking, hitting back, the quiet minute, the badge at five widths and
  sideways, leaving).
- `server/test/nomansland.test.mjs` (68 checks; 51 before v2.3.3091):
  - the rings against the plan;
  - the level rule from both sides, the party rule, and the master switch
    elsewhere;
  - skulls, retaliation, resets, stored without a write a hit, and online time
    only;
  - back on join;
  - a death under the rule: the killer's pile, the carve-outs, the spare weapon
    and armour to the killer with the row, the worn plate's stash copy kept,
    the shield and outfit kept (that game never said which shield it wears),
    `nml_loss` exact, the forfeit refused on the next join;
  - a red skull's death, to a player and to a monster, with each piece once;
  - an ordinary death unchanged;
  - the kill switch, and caps;
  - v2.3.3091, the shield on the arm (17 checks):
    - caps;
    - the moves: by id, by signature, none, a copy already in the bag;
    - refusals: a shield it does not hold, junk names, another player's, and
      a ledger piece no list holds;
    - the loss with the arm known: both spares to the killer (one with its
      row), the worn one and its stale copy kept, `nml_loss` naming both;
    - `shieldwear: false`.
- `mirror-audit`: the rings and the centre. Since v2.3.3091 they run: a merge
  had left them after the suite's `process.exit`.
- `nomansland` §3-4 (v2.3.3253): `nml_skull` names who gave the white skull
  (`by`), the attacker is told who hit them back, no `by` once the white skull
  is gone, and `by` comes back on join.
- `mp-nmlask` (v2.3.3253), two real players: the raider on a 390 px touch
  phone, the wanderer on a computer:
  - the raider's real staff bolts through the wanderer do nothing (no
    `player_attack`, the worker's HP unchanged, no skull) and ask once;
  - the window is small, under the minimap, clear of the attack disc, the
    sprint button and the badge, and nothing covers its buttons;
  - Ignore, then more bolts ask nothing;
  - a tap asks, and the (i) explains;
  - Party sends the invite, and the wanderer is asked to join;
  - on the computer a click asks too, beside the minimap and under the party
    invite card;
  - at a sword's reach (30 px) a tap asks, and does not open your chat;
  - Attack aims, the swing lands, the red skull comes with it, and the
    wanderer is told `by`;
  - the wanderer taps back: no window, aimed at once, the swing lands, no red
    skull;
  - a window left alone goes, and goes when its player walks out;
  - held sideways it sits beside the minimap, clear of the controls and of you;
  - pictures: `nmlask-*.png`.
- `mp-nomansland` (16 checks), two real players against a real worker:
  - the wanderer's game tells the worker its arm is bare, and the worker
    holds the quest's Pine Shield as a spare;
  - both told (banner, chat, the red top-bar line);
  - the tap asks (since v2.3.3253), and the window's Attack aims; no player
    card;
  - a hit lands, with the red and white skulls, each seen by the other;
  - the killing blow: the wanderer told, their spare greatsword and spare
    shield in the raider's bag, the minnows in the raider's pile;
  - no page errors.
  - Pictures: `nomansland-*.png`.
- `mp-wheelmap`: on Frost Ridge's Lv 6–10 ring the top bar's second line is the
  No man's land line.

## Beside the minimap's name plate (v2.3.3629)

The owner, 2026-10-27: "I think I'd rather have the no man's land skull and
level just beside the minimap where it lists the zone and level range".

- **Where it was.** The badge (a red skull and the ring number, your own skull
  a mark on its corner) stood at the bottom of the screen, just over the band.
  It had to step aside for the shield button in a fight (v2.3.3268,
  v2.3.3608), and it pushed the interact prompts up while it held the band's
  middle (`--nml-lift`).
- **Where it is now.** Just left of the minimap's box, 6 px from it, its middle
  level with the minimap's name plate. The plate shows the land's name over its
  level band, so the place, its levels and the skull now read together.
  - It is as tall as the plate: the pill is 37 px, with a 27 px skull and a
    23 px number, inside the same 44 px tap target.
  - The size and place come from the box the minimap publishes for its plate
    (`window.__btWheelPlate`, wheelMinimap.js), turned into the badge's own
    containing block's numbers (`nmlBadgeSpot`), so it is right on a phone, a
    sideways phone and a computer.
  - **Sideways** the sprint button and Special stand left of the name plate
    (ShieldButton.jsx `sprintAnchor`) and the attack disc reaches up under the
    minimap's box. So the badge keeps the same right edge but sits level with
    the box's TOP. On a screen too short for that (under about 340 px tall the
    sprint button reaches up beside the box's top), it goes up into the top
    bar's row above the box. `nmlBadgeSpot` decides from the sprint's and the
    fight buttons' boxes. mp-nmlfoe's sideways rows caught the first cut behind
    the sprint button and the second (just under the box) on the attack disc.
  - In the top bar's row it is mounted on the page's body, as the "Attack
    <name>?" window is. The top bar is outside the game's wrapper, so there a
    badge inside the wrapper was drawn under the bar, in place but unseen.
    Its other places keep it in the wrapper, layered as before (under a
    level-up's celebration, for one). mp-nmlfoe now also checks the badge is
    the thing on top at its middle.
- **What went with the move.**
  - The stepping aside for the shield button (`nmlBadgePlace` and its game.css
    rules): nothing of the bottom's lies near it now.
  - `--nml-lift`.
- **What stays.**
  - A tap still opens the rules.
  - The slowly blinking red line along the band's top (v2.3.3600).
- **The "Attack <name>?" window.** On a wide screen it sits beside the minimap,
  so it now counts the badge among the cards it must not cover, and moves down
  under the badge where it would.

Tests:
- `mp-nomansland` step 1: the badge's right edge is just left of the minimap's
  box, its middle within the plate, a 44 px target.
- `mp-nmlfoe` step 10: the same at 320, 360, 375, 390 and 430 px; sideways at
  844 x 390 level with the box's top, and at 667 x 320 in the top bar's row.
  At every width it is clear of the shield,
  the bell, the weapon button, the disc, the sprint button and the fight's
  buttons. The one exception before this, the 320 px phone's bell, is gone.

## Beaten by them, not again for half an hour (v2.3.3770)

The owner, 2026-10-28: *"I think another rule I want is that a player attacks
you (and gets red skulled) but you kill him, he can't attack you for at least
30 minutes unless you approve of letting him have another attack. A red skull
disappears after dying but the game should remember if the red skull player
was killed by you. This prevents griefing where the player keeps coming back
with cheap weapons to attack you over and over again"*, and then: *"...instead
of the player that was red skulled and killed who comes back a second time to
attack again can't push an attack notification to you, they can only pop up
with a sword clash icon and question mark above their head (once per
minute)"*.

**When.** A attacks V (A takes a red skull, V a white one), and V kills A
under No man's land's rule (`_nmlOnDeath`'s own attribution). A must be V's
attacker: V's `whiteBy`, or a right to hit back still running in V's `from`.
A's red skull goes at the death (any death, while the switch is on).

**Then, for 30 minutes of wall clock** (`NML.LOCK_MS`), A may not attack V.
The rule from A toward V is false (`_nmlAllowed`), so every blow and stray
shot of A's at V is refused by the worker. Nothing changes from V toward A.
The lock is per pair: V's party is not covered. It is stored in A's own record
(`nml_state:<A>` `lock`, `[[V, until]]`, 16 at most, the soonest to end giving
way), so a restart or A's rejoin keeps it. On load, an `until` further away
than 30 minutes is cut back to 30.

**It ends** at its time; when V attacks A (V started a new fight:
`_nmlSkulls`); or when V lets A at them again.

**What each one sees.**
- A's tap on V opens No man's land's small window, which says
  **"V beat you. You can't attack them for N more minutes."** with one button,
  **"Ask for a rematch"**. A cannot reach V any other way: no card, no line,
  no sound.
- The button pops the duel's sword clash with a **"?"** over A's own head,
  for about 5 seconds, seen by V alone (`nml_lock_ask` both ways). The worker
  passes it on once a minute for a pair and refuses it faster; the phone
  holds its own button to the same minute.
- V's window on A, while the lock runs, adds **"Let A attack you again"**
  (`nml_lock_allow`): the lock lifts at once.
- The icon is `public/icons/ui/nml-ask-duel.webp`, the duel's
  `soc-duel.webp` at 64 x 64 (`SMALL_ICON.nmlAskDuel`, canvas only, loaded
  with the small icons behind the loading screen). It is drawn only while it
  shows, and destroyed after (`entityRenderer`, probe
  `__btPeerBadge[id].nmlAsk`).

**Wire, storage and switches.**
- c→s `nml_lock_ask {target}` and `nml_lock_allow {target}`, each its own
  router case, never relayed.
- s→c (PRIVILEGED, private) `nml_lock {out: [[id, ms left]], in: [[id, ms
  left]]}`, sent to both players when a lock is set or lifted, and at a join
  only to a player with a lock (each player online that the joiner is locked
  out from hears it too). Also `nml_lock_ask {from}`, to V only.
- Storage: `nml_state:<pid>` gains `lock`; a record with only a lock stays
  on file.
- Cap `caps.nmllock`; kill switch `nmllock: false` in the live flags. With
  the switch off, no lock is set or enforced, no ask is passed on, and the
  red skull stays at a death as before.
- It never asks test mode: it protects another player.
- An older phone sends neither message and draws nothing, but the worker's
  refusal still holds. A new phone against an older worker shows nothing
  (no cap).

**Tests.** `server/test/nml-lock.test.mjs` checks:
- the lock is set only for the attacker V killed;
- it refuses at 29 minutes and allows at 31;
- the red skull goes at the death;
- V attacking A lifts it, and so does V's allow;
- a second ask at 30 s is refused and goes at 61 s, and reaches V alone;
- a restart keeps the lock, and the join messages are right;
- the kill switch;
- an old phone.

The phone scenario `mp-nmllock` plays it with two browsers.

## Decisions for the owner

- **v2.3.3316, decided:** the tools drop and Diego sells them back; a player
  with no skull loses their gold to the killer too. Two numbers chosen for
  the owner, each one line to change: a tool costs **100 gold**
  (`TOOL_SHELF`), and an unanswered window may come back after **15 seconds**
  (`NML_ASK_AGAIN_MS`).

- **The level rule.** It is read as "within N levels, N being the lower of the
  two rings". Ring 1 is within 1 level; ring 5 is within 5.
- **Shields and outfits** -- decided, *"Yes"* (2026-10-06): spare shields go
  since v2.3.3091. Outfit pieces stay because there is nothing in them to take
  yet (see "What the worker cannot take yet").
- **Party members** cannot fight each other here, and the safe commons and
  Brotown stay safe.
- **The window's "once"** (v2.3.3253): a stray shot asks about each player
  once until the game is reloaded; a tap always asks. Two other choices were
  made for the owner, each a line to change:
  - the window closes by itself after 10 seconds (`NML_ASK_MS`);
  - the player who attacked you is aimed at by a tap, with no window.
