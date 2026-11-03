# Round 2 brief: verify one cluster of implicit state machines

42 sweep agents read BroTown's code (repo `/home/user/GameDev`) and reported implicit state
machines. Their definitions and failure modes are in
`/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad/sm/BRIEF.md`.
Read its "What counts" and "Failure modes" sections first.

The main session grouped the findings into clusters. You own ONE cluster. Your job is to decide,
with evidence, what is real, and to describe the machine end to end so the owner can decide
what to do. The owner is new to coding: write the summary in plain words.

Below, `SM` = `/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad/sm`.

## Rules

- **The repo is READ-ONLY.**
  - Do not edit, create or delete anything under /home/user/GameDev.
  - No git commands that change anything.
  - No npm, test suites, builds, browsers, wrangler or network.
  - You may run a small node script from `SM/round2/` that imports a pure module to confirm a
    behaviour.
- Do not spawn subagents.
- **Write as you go.** Agents on this box die silently. Write to `SM/round2/<CLUSTER>.md` early
  and update it as you verify.
- **Your final reply is ONE line:**
  `DONE <CLUSTER>: <verdict>, severity <high|medium|low>; <c> confirmed, <p> plausible, <r> refuted`.

## Inputs

- The findings you were given are blocks in `SM/out/<SLICE>.md`. Each block starts with
  `## <ID> · <title>`; for example S1-2 is in `SM/out/S1.md`. Grep for `^## <ID> ` to find each
  one.
- Read every block you were given, then go to the code.

## Verify adversarially

For every concern in your findings:

1. **Try to REFUTE it.** Look for the things that would make it false:
   - a guard elsewhere: in the router, the tick, the join or the client;
   - a later reset;
   - a test in `server/test` or `tools/qa` that pins the behaviour;
   - a kill switch that is off;
   - a retired or dormant path;
   - a deliberate design. Grep `docs/TRAPS.md`, `docs/CLAUDE-HISTORY.md`, `docs/specs/`,
     `docs/GDD-AS-BUILT.md` and the `v2.3.NNNN:` comments.
2. **For a server race:** apply the Durable Object input gate from
   `docs/ARCHITECTURE-HANDOFF.md`. One event runs at a time, and storage awaits keep others
   out. A fetch or a timer await does not.
3. **For a crash window:** say exactly which writes land before the gap, and what the next wake
   or join does about it.
4. **Classify the concern:**
   - CONFIRMED: you traced the path, it is reachable on a live path, and nothing stops it.
   - PLAUSIBLE: likely, but one link is unproven. Say which link.
   - REFUTED: say what stops it.
5. **Say who can trigger it:**
   - an honest player (with the exact steps);
   - only a modified phone;
   - only deploy or restart timing;
   - only the owner (admin tools).

## Output: `SM/round2/<CLUSTER>.md`, exactly this shape

```
# <CLUSTER> · <plain-words title of the machine>
- Verdict: needs-thought | watch | fine
- Severity: high | medium | low (<who is hurt and how: items or gold lost, cheating, a player stuck, a visual glitch>)
- Who can trigger it: <honest player: how | modified phone only | deploy/restart timing | owner only>
- Summary: <at most 90 words, plain English for a non-coder: what the machine is, what goes wrong, why it matters>
- Key files: <path:line>, ... (3-6, most important first)

## The machine
- Entity, and where its state lives: ...
- States: <name>: <what it means> (one line each)
- Moves: <trigger>: <from> → <to> (<path:line>) (the real ones, including the missing or wrong ones)
- Diagram edges (at most 14, one per line, for a drawing): `<From> --<trigger>--> <To>`, and mark a broken or missing edge with `!!`

## Concerns, verified
- [CONFIRMED|PLAUSIBLE|REFUTED] <finding id>: <claim in one line>. Evidence: <path:line>. How checked: <one line>. Docs: <what the docs say, or none>.

## What needs further thought
- <1-3 design questions for the owner, in plain words>
- Making it explicit: <one short paragraph: what a declared version would look like (one state field, one transition function, which messages)>
- Quick fixes vs design work: <which concerns are one-line fixes, which need a decision>
```

**Verdict after verification:**

- **needs-thought:** at least one CONFIRMED concern with real impact, or a machine so scattered
  that the next change is likely to break it.
- **watch:** only plausible concerns.
- **fine:** everything refuted.

Be precise. Every claim gets a path:line. Prefer fewer, solid claims over many weak ones.
