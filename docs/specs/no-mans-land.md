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

Each land's rings of five levels, from Lv 6–10 outward:

| Ring (monster levels) | No man's land |
|---|---|
| the commons and Brotown | never |
| Lv 1–5 | no |
| Lv 6–10 | **1** |
| Lv 11–15 | **2** |
| … | … |
| Lv 76–80 (the last ring before the gates) | **15** |

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
  lose your bag; attack one and you carry a red skull for 20 minutes."* After
  that the line is shorter.
- **A new ring:** a line in the chat with the new number.
- **Leaving:** *"You left No man's land. Players can no longer attack you."*
- **The top bar:** its second line turns red and reads "☠ No man's land 1 · Lv
  6–10", in place of the stage's name. The minimap and the world map still name
  the stage.
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

- **Tap** the other player: the tap **aims** at them, shows "TARGET", and opens
  no card (a card mid-fight would cover the screen).
- Your swings, arrows and bolts at them then reach the worker as attacks on a
  player, and **the worker decides every one**.
- Tapping them **again keeps** the aim. On a computer the attack *is* a click, and
  a toggle made every other swing a plain one.
- Tap empty ground to let go, as with any target.
- The aim lets go by itself the moment the rule stops allowing the fight:
  either of you leaves, the levels drift apart, or you join one party.

## The skulls

- **Red:** you landed a hit on a player under the rule. It lasts 20 minutes,
  and every new hit resets it to 20.
- **White:** a player landed a hit on you. It lasts 20 minutes, reset by every
  hit, and remembers who gave it.
- **Hitting back is not attacking.** Hitting the player who gave you your white
  skull gives you no red one (as long as you have none of your own). The player
  who started the fight keeps resetting theirs.
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

**Killed by a player under the rule** (the killing blow came through it in the
last 5 seconds):

| What | Where it goes |
|---|---|
| the bag's items | the usual death pile, but the **killer's** for its owner window ("Raider's loot" to everyone else), then anyone's |
| spare weapons | to the killer (mail if they are offline or full) |
| spare **armour and legs** | to the killer, each with its provenance row, so it stays a provable piece in their hands |
| spare **shields** (since v2.3.3091) | to the killer the same way, once your game has told the worker which shield is on your arm (see below) |
| everything worn | **kept** |
| the gathering tools, the quest's own items | kept (the death's usual carve-outs) |
| outfit pieces | kept (see below) |
| gold | kept |

**A red-skulled player who dies** loses all of the above **and** everything
worn (weapons, armour, legs, shield, amulet), every shield, and their gold.

- Killed by a player, that player gets it.
- Killed by anything else, the items fall in a pile anyone may take at once,
  and the rest is gone.
- Outfit pieces still stay.

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
- **Armour granted during this session.** A quest's armour reward goes to your
  game's bag first, and the worker adopts it at your next join. Until then it is
  not in the worker's list, so a death does not take it.
- **Gold nuggets and bars** (the amulet forge's ingredients). They have no credit
  kind to carry them to a killer, so they stay.

Each of these closes when the worker learns the slot. Shields have closed
(v2.3.3091).

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

## Wire, storage and switches

- **Client → worker:** attacks are the existing `player_attack`;
  `_pvpAllowed` asks `_nmlAllowed` before the `OPEN_PVP` master switch.
  Since v2.3.3091, `shield_wear` `{gid | sig | none}` (server/src/shieldwear.js,
  client src/game/shieldWear.js), sent only against a worker advertising
  `caps.shieldwear`.
- **Worker → client:** `nml_skull` `{red, white}` (ms left) and `nml_loss`
  `{by, red, weapons, gear: [{field, gid | sig}], worn, coins, bag}`. Both are in
  `PRIVILEGED_EVENTS`. The tick's player wire carries `sk`, absent with no skull.
- **Storage:** `nml_state:<pid>` `{red, white, whiteBy, forfeit}`. It is written
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
- **The shield's switch:** `shieldwear: false` (v2.3.3091) un-advertises
  `caps.shieldwear`, ignores every report, and an ordinary loss takes no shield
  again.
- **Dev tool:** `/api/admin/dev/vitals` takes `hp` (at least 1, at most max), as
  it takes `stamina`. It makes a test's killing blow one hit.

## Tests

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
- `mp-nomansland` (16 checks), two real players against a real worker:
  - the wanderer's game tells the worker its arm is bare, and the worker
    holds the quest's Pine Shield as a spare;
  - both told (banner, chat, the red top-bar line);
  - the tap aims and opens no card;
  - a hit lands, with the red and white skulls, each seen by the other;
  - the killing blow: the wanderer told, their spare greatsword and spare
    shield in the raider's bag, the minnows in the raider's pile;
  - no page errors.
  - Pictures: `nomansland-*.png`.
- `mp-wheelmap`: on Frost Ridge's Lv 6–10 ring the top bar's second line is the
  No man's land line.

## Decisions for the owner

- **The level rule.** It is read as "within N levels, N being the lower of the
  two rings". Ring 1 is within 1 level; ring 5 is within 5.
- **Shields and outfits** -- decided, *"Yes"* (2026-10-06): spare shields go
  since v2.3.3091. Outfit pieces stay because there is nothing in them to take
  yet (see "What the worker cannot take yet").
- **Party members** cannot fight each other here, and the safe commons and
  Brotown stay safe.
