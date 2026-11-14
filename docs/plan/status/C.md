card: C
branch: claude/plan-c-wire
prs: PR 1, from this branch (ready)
state: ready

## Done

- PR 1 (tag 5029): `docs/plan/census/wire.md`. 436 rows: the router's
  139 cases, the 26 relays, 164 worker-to-phone types (the 163 privileged
  and `clan_war_declare`), 107 HTTP routes. 209 findings and one question
  in its part 7; its part 8 has the counts and how each was counted.

## Next

- Nothing: the card stops here. Card N starts from the page.

## Found

- The card's guide counts are low for two lists: `PRIVILEGED_EVENTS` holds
  163 types, not about 96 (`server/src/index.js:524`); the HTTP routes are
  107, not about 47, counting each handler's fall-through and the owner's
  34 test levers (`server/src/devtools.js`).
- `clan_war_declare` is sent by the worker and is on neither list (it is
  on `server/test/wire-audit.test.mjs`'s allowlist): it has a row of its own.
- Precheck's `version-tag` fails a card's own tag written in full (cards
  F and I found the same), and also a diff whose only tags are old ones.
  So this card's files write every tag as a bare number ("tag 4850").
- The page is 754 KB (rows of about 1,700 bytes): read it by grep, a row
  at a time, as its part 1 says.

## Needs

- From the owner, asked once: 91 rows say "a person". The card neither
  grants them to a helper nor forbids them (crafting, gear, the farm,
  quests, the bank, pets, party and friend asks). Leave them open for step
  11.7 to decide, or decide now?
