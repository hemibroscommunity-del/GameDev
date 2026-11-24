# Card LF: the leftovers of cards RR, HB2 and EN (paused 2026-11-19)

**Purpose:** the work that was built and proved, or nearly, when the
owner's usage ran out lands, and three status files say what is true.
Nothing new is built.

**Tags:** RR's and HB2's own, as the branches already carry them (6309,
6310; 6291, 6292). No new block.
**Model and effort:** the middle model, high. Helpers (the cheapest model, low) for runs.
**Read:** `CLAUDE.md`; `docs/plan/finish.md` part 6 (it binds you); cards
RR and HB2; the status files ON THE BRANCHES below (they are newer than
`main`'s).
**You hold:** only the four branches' own files, and
`docs/plan/status/RR.md`, `HB2.md`, `EN.md`.
**Browser:** heavy for lines 1 to 3: runs go to helpers, one browser job at
a time on each box.

## The lines, in order

1. **RR, PR #2273 (6309), the rejoin loop: a slow page is no longer
   rejoined over and over. DEPLOYS (a server test).** Branch
   `claude/plan-rr-11-rejoinloop`; its head was pushed unproven. Merge
   `main` in; run `mp-comeback` twice and `node tools/dev/precheck.mjs` on
   that head; make its status true; mark the PR ready.
   If `comeback` is red twice, stop and tell the orchestrator: do not
   rework the fix.
2. **RR, 6310, `mp-quietphone`'s own mend** (branch
   `claude/plan-rr-10-quietphone`, no PR yet; 4 of 5 runs green): one more
   run, precheck, open its PR.
3. **HB2, 6291, the band's key list only on a computer's band** (branch
   `claude/plan-hb2-12-narrowkeys`, no PR yet; precheck, `playable` and
   `membudget` were green): run `mp-oneband` and `mp-deskkeys` (its 8f is
   red on `main` too: not this line's), open its PR.
4. **HB2, 6292, the owner's rule for ground swatches** (branch
   `claude/plan-hb2-13-groundrule`, one commit of 2026-11-20, tools only:
   `public/tools/ground/prompts.js`, `public/tools/style/bible.js`):
   precheck, open its PR.
5. **The status files**: EN is `done` (#2274 merged at sitting 55); HB2 and
   RR say what is merged, what is ready and what is left, each on its own
   PR's branch (never a status-only push to an open PR).

## Not yours

- `mp-deskkeys` 8f and `mp-desklunge` (a computer's lock and lunge): they
  wait for the owner's verdict on the controls trial (card CT).
- `mp-headframes`, `mp-hairstencil`, `mp-geartab`, `mp-brocard`: a later
  card, after the owner's choice of a full sweep (`finish.md` part 9).
- `tools/dev/precheck.mjs` and `gatekeeper.mjs` are card CK's now.
