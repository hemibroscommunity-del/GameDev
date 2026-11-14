card: Z
branch: claude/plan-z-sitting-6
prs: this PR, tag 5362, the last line of the list (ready)
state: ready

## Done
- Sitting 6, `main` at f2351ab (sitting 5's sixteen merged). Rehearsed the
  17 below in this order (tree 38fe6233): precheck, build, questline
  187/187; all 19 with card A's (6f9fadb4): green too. Review:
  `census/review-z6.md`. Ticked 1.1, 2.2a, 9.1, 9.2. Lines lowered:
  `entityRenderer.js` 8968 -> 8961, `gameDisplay.js` 4270 -> 4268.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1718 P4 · 2 #1721 U1 · 3 #1722 U2 · 4 #1723 U3 · 5 #1725 U4 ·
6 #1727 U5 · 7 #1728 U6 · 8 #1730 U7 · 9 #1732 U8 · 10 #1734 U9 ·
11 #1697 N3 · 12 #1733 H8 · 13 #1739 Y2 · 14 #1731 V4 · 15 #1735 V5 ·
16 #1737 V6 · 17 #1740 V7 · 18 this PR. Stacked: no squash. One touches
`server/**` (#1697: deploys). No cap, no flag, no shape.

## Held (expires at sitting 7)
- A #1708, #1711: a save refused as `newer` (at the join) never reaches
  the book: `roomrow.js` `_roomRowRefused` sets no `owed`. Mend: `m.owed =
  true` there; roomrow §3 reading the stored book alone.
- P #1719, #1736: CONFLICT with the mended #1718 (`shipped.json`): merge
  `claude/plan-p-4-gate` in, `shipped.mjs --write`. #1736 not reviewed.

## Stalled
- None. (T: PR 1 may open now, #1684 is on `main`.)

## Found
- No card: `ps.capeOff` not in `_saveRpg`'s list (card V's Found, §2).
- No card: red on `main`, `mp-wheelmap`'s Frost Ridge plate (card Y's
  Found) and `mp-npclooks` 2, 2b (card P's): questions about the TESTS.
- No card: nothing runs `state-census --check`; on GitHub the ledger
  guard reads the census page, not the code (card U's Found).
- P: the bot's twins held by nothing; a PR changing `families.mjs` is
  listed alone (review-z6). E PR 5 and #1708 share the last one out.
- The owner's call: card V's question (§2 and §1 moved in a PR 8, or
  left to the next card).
