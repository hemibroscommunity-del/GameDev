card: PW
branch: claude/plan-pw-1-power
prs: PR 1 (5480, working)
state: working

## Done

- PR 1 (5480): `server/src/power.js` (the control, the fight on averages,
  `powerOf`), `server/test/power.test.mjs` + `power-sim.mjs` (51 checks: the
  control 1,000, the dice against the door, never lowers, the prediction,
  six break proofs), `docs/specs/power-index.md`, this card, the PW tag
  block (nextBlock 5520). Within five levels the index names the winner
  84% of the time, today's sum 64%, the plain level 82%.

## Next

- PR 1 up for the gatekeeper; then PR 2 (5481), the boards.

## Found

- The card's five stat names (Might, Fortitude, Vitality, Agility, Mind)
  are nowhere in the worker: the old tier-1 stats were retired
  (src/ui/panels/StatScreenPanel.jsx v2.3.1236 note). What the worker
  stores is prog3's `alloc` (hp, def, dodge, stam, mana, eres, move) and a
  lane each (dmg, luck, aspd, special, range, elem): server/src/prog3.js.
- The level edge (prog3.js prog3Edge) takes all of a weaker player's
  points away five levels down, so the plain level alone calls 99.7% of
  fights four or more levels apart (spec "How well it predicts").

## Needs

- (planning session / owner) The scale: the fitted exponent 2 makes the
  scores the odds, so the median character reads 1 up to level 15 and
  millions from level 25. Keep it, or a narrower scale (exponent 0.5: about
  17 at level 1, 1,000 the control, 11,000 at level 40; the order is the
  same)? It is what a player sees.
- (planning session) PR 2's five stat boards: which stored allocation each
  of might / fortitude / vitality / agility / mind reads (Found, first line).
