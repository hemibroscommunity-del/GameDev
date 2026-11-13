card: C
branch: claude/plan-c-wire
prs: none yet (PR 1, tag 5029, opens when its line of the card is done)
state: working

## Done

- Nothing merged or ready yet.

## Next

- PR 1 (tag 5029): `docs/plan/census/wire.md`. The keys are counted from
  the code by a script; readers are on the handlers, a family each (they
  only read).

## Found

- The card's guide count is low for one list: `PRIVILEGED_EVENTS` holds
  163 types, not about 96 (`server/src/index.js:524`). The router has 139
  cases, `RELAY.TYPES` 26, the phone's direct switch 87 and its default.
- Precheck's `version-tag` fails a card's own tag written in full in a
  file (the cards on `main` already write it; cards F and I found the
  same). This card's files write the tag as a bare number; the commit's
  title carries it in full.

## Needs

- Nothing yet.
