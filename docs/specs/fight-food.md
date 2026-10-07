# Food that counts in a fight (v2.3.3133)

The owner, on what farming is for: *"Farming needs a purpose. I think the best
purpose it can serve are temporary buffs (boss fights, PvP, dueling, etc) and
source of income."*

The farm's meals and brews (docs/specs/meals.md) were real buffs against
monsters. In a fight with another player, or in a big boss burst, they did
less than they said, or nothing. They also had one hole: in a duel, whoever
carried more food won. This change fixes all of that. It adds no new food;
the meals and brews you can make already cover the fight roles. See "Not in
this change" at the end.

## What was wrong

| What | Before | Why |
| --- | --- | --- |
| A damage brew (Fury Tonic x2, Firebloom Tea x1.2) in a duel | Only the plain swing and the plain shot got it. The bow volley and the staff special never did. A big brewed hit could be clipped. | A duel hit is a number the page claims, which the worker clamps. Only some of the page's claims had the brew folded in, and the clamp was never sized for a brew. |
| Element Burst under a Fury Tonic | Clipped by up to a quarter | The burst's ceiling was worked out for the cooked food's x1.2, not a brew's x2. |
| The Root Stew (5% less damage taken) | Did nothing to any hit under 20, which is most monster hits and every duel hit | It was `ceil(hit x 0.95)`: 19 x 0.95 = 18.05 rounds back up to 19. |
| Eating in a duel | Three Garden Stews in three taps put you back at full | Nothing limited a heal you eat at once. The duel's own rule (no healing over time in a duel) meant nothing. |
| A special's number on your screen under a brew | Half the real hit under a Fury Tonic | The worker's roll had the brew; the page's own number for a special never did. |

## What it does now

### 1. A brew is the worker's, in a duel too

- The damage brew's multiplier is read in **one place**, `combat.js _brewMul`:
  - 1 with no brew;
  - the cooked food's 1.2 when the brew has no number of its own;
  - otherwise the brew's own number (bounded 1 to 4).

  The monster roll, the duel lane and the burst's ceiling all read it.
- Against a worker that advertises **`caps.pvpbrew`**, the page claims every
  duel hit **without** its brew and marks it **`nb: 1`**.
  - The worker clamps the claim as always, then multiplies it by the brew
    *it* holds (`_resolvePvPAttack`).
  - So every attack gets the brew: swing, shot, bow volley, staff special and
    retreat shot.
  - It counts only while the worker's own timer runs.
  - It is applied *after* the clamp, so a Fury Tonic is never clipped.
- **How the page claims it.** Every shot remembers the brew it was fired
  with, as `brew` on the projectile. `src/game/fightFood.js pvpClaim` takes
  it back out only when the worker will put it back. Against an older worker
  the page folds the brew in, as it always did.
- The page's own numbers for a special carry the brew now (the specials'
  shots, and the melee special's popup), as the worker's roll always did.
- **What a forged claim can reach.** The ceiling is now the clamp times the
  worker's own brew: twice the old forged ceiling under a Fury Tonic. It is
  still bounded by a brew the player really drank.

### 2. Element Burst has room for a brew

- The burst's ceiling is now the ordinary ceiling x the brew (`burst.js`).
- This is the same reasoning as fracture: the ceiling bounds what the
  attacker *claims*, and the brew is the worker's own timer.

### 3. The Root Stew cuts small hits too

- The 5% is now a chance on the fraction.
  - Example: a 19-damage hit is 18 nineteen times in twenty and 19 once.
  - So every hit loses exactly 5% on average, at any size.
- It is applied **after** the other percentage cuts (Defense or Elem Resist,
  then armour).
  - Each of those rounds again. Applied first, a torso's x0.7 turned both 18
    and 19 into 13, so the 5% was lost a second time for anyone in armour
    (review).
  - Cuts that multiply give the same expected hit in any order; only the
    rounding moved.
- The floor is still 1.

### 4. One bite at a time in a fight with a player

- A heal you eat at once is limited to one every 15 s (`PVP_HEAL.GAP_MS`).
  The heals are the Garden Stew, a cooked fish and the old minnow bottle.
- The limit applies while you are:
  - in a duel, or
  - within 10 s (`PVP_HEAL.WINDOW_MS`) of a hit between you and another
    player, either way.
- The 15 s count from your last such heal, wherever you ate it.
- Never limited:
  - fighting monsters;
  - the half-hour meals and brews, which are not heals.
- **The worker decides** (`cooking.js _pvpHealWait`). Every road to a heal
  eaten at once is held:
  - Eat on a stew or a fish;
  - Drink on the minnow bottle;
  - the old-style cook that eats its dish at once. Only a forged message
    sends that today; its stew lands in the bag instead.
- **What the worker does with a refused bite:**
  - It sends the usual resend, so the bag and HP go back on the phone.
  - It sends **`eat_refused {wait}`**. The phone shows "Eat again in Ns" and
    takes the worker's clock as its own.
- **The clock is the room's**, a map keyed by player id (`_pvpHealClocks`):
  - `pvpAt` is stamped by combat.js on every exchange that sends a
    `pvp_hit`.
  - `healAt` is stamped by every heal.
  - It survives a reconnect (the review found every rejoin handed out a
    bite).
  - It is sent to nobody: player state, by contrast, is copied into every
    joiner's view of the room.
  - It lives in memory only (rule 11): a deploy lets one extra bite through.
  - It is pruned once it passes 512 players.
- **What the phone does.** It holds its own bite back and says "Eat again in
  Ns" only against a worker that advertises **`caps.pvpheal`**. Its guess
  reads only the hits it has seen (`S._pvpAt`, from `pvp_hit`), never the
  duel flag. That flag can outlive its duel (a dropped or declined accept, a
  restart, a long disconnect) and would have held bites back against
  monsters. A duel's lull is the worker's to call, and its reply corrects
  the phone. Wired at every eat button: the bag, the Cookhouse, the old bag
  panel and Drink on the minnow bottle.

## Deploy order (rule 19)

| | Old worker | New worker |
| --- | --- | --- |
| **Old page** | as before | Claims carry the brew and no `nb`, so the worker never multiplies them. The worker's eating rule applies; refused bites are resent, and the old page ignores `eat_refused`. |
| **New page** | No `caps.pvpbrew`, so claims carry the brew as before (now on the specials too). No `caps.pvpheal`, so the page never holds a bite back. | As described above |

Nothing is ever multiplied twice: `nb: 1` is sent only with a brew-free
claim. The phone test checks that each hit is exactly 2x a claim *and* that
the claims did not double.

## Kill switches

- **`pvpbrew: false`**
  - The cap reads false, so pages that join afterwards claim the old way.
  - The worker stops multiplying `nb: 1` claims.
  - A page already playing keeps sending brew-free claims until it reloads,
    so its duel hits get no brew. That is acceptable for an emergency
    switch.
- **`pvpheal: false`**
  - Un-advertises the cap.
  - Lifts the worker's rule.

## Tests

- **`server/test/fightfood.test.mjs`** (97 checks) covers:
  - the multiplier's every case;
  - `nb` multiplied after the clamp, and only `nb === 1`;
  - the worker's clock, not the page's;
  - the kill switch;
  - both sides stamped;
  - the stew's split at 10, 19, 1 and 100. At 19 the 18s and 19s are
    counted, so a floor or a ceil fails. In a 0.7 armour the 19 still loses
    its 5%;
  - the eating rule: stew, fish, bottle, meal, brew, each refusal resent, the
    window, a duel, monsters, the kill switch and a real hit;
  - `eat_refused` and its wait, and only for this rule;
  - the forged old-style cook held (its stews to the bag);
  - the clock across a rejoin, absent from player state and from what
    joiners are sent, and pruned;
  - the caps;
  - the page's half (`fightFood.js`): its multiplier agrees with the
    worker's in every case, a claim taken apart and put back is the brewed
    hit exactly once, the bite timer ignores a stale duel flag, and the
    worker's reply sets its clock.
- Each of the worker's new rules fails the suite when broken (mutations).
- **`burst.test.mjs`**:
  - Its "every multiplier on" stack never had its damage buff switched on
    (`ps.buffs` instead of `ps._buffs`) or its strongest amulet. It does now.
  - A Fury Tonic burst is driven through the real cast. It must land past
    the ordinary ceiling.
  - A roll past every ceiling must come out at exactly the ceiling x the
    brew, and at exactly the ceiling without one. The first version's upper
    bound could not fail (review).
- **mirror-audit**: `PVP_HEAL` on both sides.
- **`tools/qa/mp/mp-fightfood.mjs`** (21 checks) runs two players in a real
  duel:
  - every hit is exactly 1x a claim with no brew, and exactly 2x under a Fury
    Tonic, with the claims the same size;
  - a special swing carries no special flag and lands at most two hits;
  - the first stew heals, the second is held back with "Eat again in Ns", and
    the worker never eats it;
  - a page that eats anyway is refused and told why, and its stew is put
    back.

## Found, not changed

- **Duel crits are about 100x too rare, and ranged duel hits never crit.**
  - The swing sends `critChance` as a fraction (0.08 means 8%). The worker
    reads it as a percent (`Math.random() * 100 < critChance`), which makes
    it 0.08%.
  - Shots send 0.
  - Fixing it changes duel balance, so it is the owner's call. The fix is
    small: send percent, or read a fraction under a new cap.
- **A melee special in a duel is held to the plain swing's ceiling.**
  - The swing reports its hit on every frame of its 400 ms sweep. The
    worker's lanes turn that into hits: an ordinary claim one per 300 ms
    (two a swing), a special three per 1.2 s.
  - Marking the special swing as special (this change's first version) gave
    it three hits at the special's ceiling, up to 4.5x the swing before. The
    review caught it, and it was taken back out.
  - A real fix sends one claim per swing at contact. That changes melee duel
    damage as a whole, so it is a balance call for the owner.
- **Two older ways a modified client heals in a duel**, found by the review
  on `main`; each needs its own fix:
  - **`stats_update` restores full HP whenever it claims a weapon-skill level
    up**, and the claimed levels only have to grow, one per message, up to
    100. That is hundreds of full heals per character.
  - **Re-joining from a second socket restores the HP last saved.** Saves are
    at most every 10 s above 25% HP, so up to 10 s of damage is undone.
- **The phone's own bite stamp is made before the worker rules.** A bite the
  worker refuses for another reason (dead, an arena match, a bag the phone
  had wrong) leaves the phone holding the next one in a fight, up to 15 s
  longer than the worker would. The worker's own refusals by this rule
  correct it (`eat_refused`).
- The Pumpkin Pie's +10% is on combat XP from damage (prog3), as written.
- `_buffs.hp` is written by an old recipe path and never read.

## Not in this change

Two new fight meals were considered:

- an elemental-resist meal: shorter chills, burns and poisons in boss fights;
- a stamina meal: faster stamina for blocking and sprinting in duels.

Each needs a crop or herb, a recipe, art and the owner's numbers, so they are
offered rather than built.
