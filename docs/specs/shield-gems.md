# Shield gems, put in by the worker (v2.3.3187)

The owner, on the overnight hunt's report (2026-10-12): "Go recommended
fixes" — its decision 11. Code: `server/src/shieldgem.js`,
`src/game/shieldGem.js`, `EnchantPanel.jsx`. Tests: `shieldgem` suite,
`mp-shieldgem`.

## What was wrong

The Enchanter's "slot a gem in your shield" button was the last gem act the
game did alone (ARCHITECTURE-HANDOFF backlog A). Two things followed:

- **The gem was never spent.** The game took one off its own count, but the
  worker owns `lifeSkills.gems` (v2.3.1198) and echoes it, so the next
  `player_state` put the gem back. A shield gem cost nothing.
- **"Take out" could not work.** The Blacksmith's Take out (`amulet.js`
  `op:'extract'`, target `shield`) strips the worker's shield, which never
  had the gem, so it ended in "Could not remove the gem".

## What happens now

Against a worker that advertises `caps.shieldgem`, the Enchanter's shield
buttons ask and wait:

| Dir | Type | Payload | Notes |
|---|---|---|---|
| c→s | `shield_gem` | `{gem, gid}` or `{gem, sig}` | the shield on the arm, by its ledger id, or (no id) by its signature `name\|gearBase\|tierMult\|tier`, as `shield_wear` names it |
| s→c | `shield_gem_result` | `{ok: true, gem, name, gid, sig, worn}` | PRIVILEGED, private; `gid` for a shield the worker made, else `sig`; a `player_state` follows (the gem count, the Enchanting XP) |
| s→c | `shield_gem_result` | `{ok: false, reason, gem}` | `off`, `down`, `bad_gem`, `locked`, `bad`, `not_held`, `no_gem`; nothing changes |

The worker:

1. finds the named shield among the ones it holds for you — on the arm
   (`ps.shield`), else in its copy of your bag (`ps.shieldStash`) — and
   refuses a shield it does not hold (`not_held`). Nothing about the shield
   travels on the wire, so nothing can be inflated;
2. takes **one** `polished_<gem>` from its own count (`no_gem` when there is
   none);
3. puts the gem in. A shield the worker MADE is renamed as the game always
   named it: `<metal label> <Element> Shield` (`shieldGemName`, the label
   table mirror-audit pins to the client's; an unknown metal is "Basic"). A
   shield from before the ledger **keeps its name**: both sides know it only
   by its signature, which holds the name, so a rename the game missed (a
   lost answer, a reconnect at the wrong moment) would leave the worker
   holding a piece the game does not have -- the join's echo would hand the
   game a second copy, and the next join's bag merge would hand that back to
   the worker. Keeping the name keeps the signature;
4. lets the gear ledger's row follow (`_gearProvTouch`), so a shield the
   worker made keeps its gem through a reconnect and a rebuild from its row;
5. pays 20 Enchanting XP, saves, answers, and sends a `player_state`.

A gem already in the shield is replaced and lost, as the game's "Slot new gem
to replace" always said. The guard's gear lock refuses it (`locked`), as it
refuses the amulet's slot.

The game changes nothing until the answer: the shield it names (by id, or by
signature) takes the gem and the worker's name; a refusal says why under the
buttons. An ask in flight holds the buttons for up to 4 s, since every tap
now spends a real gem.

The `player_state`'s shield is also adopted onto the game's copy of the same
piece: by id (gem and name) for a shield the worker made, by signature (the
gem) for one from before the ledger -- the arm's copy first, else one in the
bag. That is what makes Take out show (the shield bare again), mends an
answer lost to a reconnect, and clears a gem the game once put into a shield
the worker made, alone, that the worker never took — that gem was never
spent, and the count already shows it. (A gem the game put into an OLD
shield alone renamed it, so that shield's copies already differ by name;
that is left as it was.)

## Numbers (unchanged)

One polished gem and 20 Enchanting XP a slot; the bonus each gem gives is
the game's own table (`SHIELD_GEM_STATS`), computed in the game as before
(blocking is client-side). Take out's price is unchanged
(`ceil(GEM_EXTRACT_BASE_COST × tierMult)`).

## What it does not do

- **The weapon slots** are still the game's own. They change a weapon's
  tier, `tierMult` and elements, which feed the worker's damage roll, so
  they move with that stat migration (backlog A's other half).
- **An old shield (no id)** takes a gem the same way. Whether its gem can be
  taken back out is the extract op's rule: since #866 (v2.3.3172) only a
  shield the worker made gives its gem back, because an old shield's gem
  cannot be told from one a join claimed.

## Deploy order and kill switch

The game sends `shield_gem` only when the worker advertises
`caps.shieldgem`: an older worker has no case for the type and would
rebroadcast it to the room. Against such a worker, and against a new worker
from an old game, the Enchanter keeps its old local slot. `shieldgem: false`
in liveflags (lower case, TRAPS §117) un-advertises it and refuses every ask
(`off`); the game falls back to its old slot.

QA lever (admin only, not part of the kit's "all"): `/dev/kit` with
`what: 'shield'` mints the tutorial's Pine Shield into an empty arm, and
`what: 'gems'` adds `count` (3; 1–50) polished gems of every element.
