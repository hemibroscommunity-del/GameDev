# Sweep brief: implicit state machines in BroTown

You are one of 42 sweep agents working in parallel. Each agent owns one slice of the game's
source. Together you must find EVERY implicit state machine in the game code: the client
(`src/`), the server (`server/src/`) and the studios (`public/tools/`). The repo is at
`/home/user/GameDev`. Your slice manifest is
`/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad/sm/slices/<ID>.txt`.
A `path:A-B` entry means only lines A-B of that file are yours. Read past the edges when a
function crosses them.

Below, `OUT` = `/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad/sm/out`.

## Rules

- **The repo is READ-ONLY.** Do not edit, create or delete anything under /home/user/GameDev.
  - No git commands that change anything (checkout, stash, commit, reset).
  - No npm, build or test runs, no browsers, no wrangler, no network.
  - The only place you write is `OUT/`.
- Do not spawn subagents.
- **Write findings AS YOU GO.** Agents on this box die silently; a file written as you go
  survives.
  - Append each machine to `OUT/<ID>.md` as soon as you have traced it, e.g.
    `cat >> OUT/<ID>.md <<'EOF' ... EOF` with the full path.
  - At the end, write `OUT/<ID>.json`.
- **Your final reply is ONE line:**
  `DONE <ID>: <n> machines (<k> needs-thought); <one-line note on anything you could not cover>`.
  Put everything else in the files.

## What counts as an implicit state machine

Something that lives through distinct phases over time, where what it may do next (or how it
reacts to an event) depends on its current phase, but the phases are never declared in one
place. Instead, the phase is encoded in ordinary variables, and the transitions are scattered
across handlers, ticks, timers, awaits and UI callbacks.

Usually several of these encodings sit on one entity:

1. **Flag clusters:** booleans or fields on one object that are only valid in some
   combinations (`dead` + `attacking`; `inDuel` + `inArena`; `loading` + `ready`).
2. **Mode strings or numbers:** `state`, `phase`, `mode`, `status`, `stage`, `step`, `kind`,
   assigned in more than one place and compared in scattered `if`s and switches.
3. **Time-gated phases:** `*At`, `*Until`, `expires*`, `deadline`, cooldowns, grace windows,
   "since" stamps. A phase that ends when `now > t`.
4. **Nullable in-progress holders:** `pending*`, `current*`, `active*`, open-window ids, target
   ids, timer and interval handles, promises stored to dedupe (`this._loading = p`).
5. **Timers and alarms:** setTimeout, setInterval and rAF chains, Durable Object alarms, tick
   countdowns that move something along.
6. **Async gaps:** an `await` between a check and the action that relies on it; re-entrancy;
   callbacks that can arrive after the phase has moved on.
7. **Lifecycles:**
   - connect, reconnect, close
   - load, ready, destroy; mount, unmount
   - open, close
   - enter, exit (zones, dungeons, arena, buildings)
   - spawn, despawn; equip, unequip
8. **Multi-step wire protocols:** request, offer, accept, confirm, then commit or cancel; opIds,
   acks and idempotency stamps; caps negotiation.
9. **Stored progress:** records with shape numbers, migration stamps, "done" and "seen" flags,
   quest steps, unlocks, streaks.
10. **Mirrors:** the same machine kept in two places that must agree:
    - client and server (prediction vs authority);
    - the v1 and v2 protocol paths;
    - the two tick builders.
11. **Behaviour loops:**
    - monsters: idle, aggro, chase, attack, leash, return, dead, respawn;
    - townsfolk routines;
    - pets.
12. **Visual and animation phases:**
    - idle, walk, attack, hurt, die;
    - an effect's start, loop and end; fades;
    - a texture's loading, ready and freed.
13. **Input:** pressed, held, dragging, long-press; joystick; tap vs swing; modal stacks and
    focus.

**Not a state machine on its own:** a pure function, a static table, a single on/off setting
with no transition logic, or a cache with no lifecycle. A static table that DRIVES a machine
(quest step definitions, for example) is worth noting as the explicit half of that machine.

## Your job

1. **Read your whole slice.** Chunk large files. Use grep to find state-like fields fast, but
   read the logic around them too. Data tables can be skimmed.
2. **Trace each machine end to end.** This means each machine whose state lives in your slice,
   or is mainly driven from it.
   - Grep the WHOLE repo for every write of its state variables: `src/`, `server/src/` and
     `public/tools/`, plus the tests under `server/test` and `tools/qa` as evidence of intent.
     Your transition list must be complete even when the writers are outside your slice.
   - Note the machine's client or server counterpart, if it has one.
3. **Hunt for the failure modes below.** Be concrete: give a scenario, with path:line evidence.
4. **Check that it is not deliberate** before calling anything a bug.
   - Grep `docs/TRAPS.md`, `docs/CLAUDE-HISTORY.md`, `docs/specs/`, `docs/GDD-AS-BUILT.md`
     and the code's own `v2.3.NNNN:` comments for the system's name. Cite what you find.
   - For any server-side race, first read the Durable Object concurrency part of
     `docs/ARCHITECTURE-HANDOFF.md`. A Durable Object runs one event at a time, and its storage
     awaits are covered by the input gate. Other awaits, such as fetch, can let other events
     in. Do not report a race that the input gate prevents.
5. **Know the context.**
   - The server is the authority: client game logic is a leftover to move to the server.
   - Both wire protocol versions (v1 and v2) are live.
   - The old map is RETIRED: "Town" on the top bar, World View, the old lands. A machine that
     only runs on retired paths is "retired", not a live risk.
   - Some systems are dormant. Say so when a machine is unreachable.

## Failure modes (the reasons a machine needs further thought)

- **combo:** an impossible combination of flags or fields becomes reachable.
- **stuck:** an exit path is missing, leaving a phase set forever or a player locked out. Exit
  paths to check: death, disconnect, reconnect, zone change, deploy or restart, error, timeout,
  hidden tab, second tab.
- **race:** a timer, callback or await acts after the phase has moved on; a double-submit;
  re-entrancy; two events arriving in an order nobody handled.
- **divergence:** two copies of the machine disagree on the phase or on the legal moves (client
  and server, v1 and v2, or two copies of the logic).
- **leak:** a timer, listener, texture, map entry or pool slot is kept after its phase ends.
  Memory is budgeted: iPhone Safari dies at about 250 MB.
- **persistence:** one of these:
  - a phase held only in memory is lost on a reconnect or deploy;
  - it is saved but not restored;
  - it is restored into an illegal combination;
  - a stored shape has no version.
- **guard-drift:** the same "may I do X now?" check is written in several places, and they
  disagree.
- **authority:** the client decides a phase that the server should own (cheating, desync).
- **opacity:** no bug found, but the machine is large and scattered enough (many flags, many
  writers) that changing it is risky.

## Output

### OUT/<ID>.md: append one block per machine, in exactly this shape

```
## <ID>-<n> · <plain-words title>
- Area: server | client | wire (both) | rendering | ui | tools
- Verdict: needs-thought | watch | fine | retired
- Why: <one sentence>
- Key files: <path:line>, <path:line> (2-5, most important first)
- Entity: <whose state it is>
- State lives in: `<field>` (<path:line>), ...
- States: <A>, <B>, <C>, ... (inferred names)
- Transitions:
  - <trigger>: <from> → <to> (<path:line>)
- Guards that read it: <where "may I do X now?" is decided> (<path:line>, ...)
- Counterpart/linked: <client/server mirror, related machines, other slices>
- Concerns:
  - [<mode>] (<high|medium|low> confidence) <concrete scenario>. Evidence: <path:line>. Docs: <TRAPS §N / spec / HISTORY / none found>.
- Making it explicit: <one line: what a declared version would look like, or "not worth it">
```

Choose the verdict as follows:

- **needs-thought:** a concern has real evidence of a live risk, or the machine is opaque enough
  that changing it is dangerous.
- **watch:** a plausible risk you could not confirm.
- **fine:** an implicit machine, but well contained.
- **retired:** a retired or dormant path.

### OUT/<ID>.json: at the end, an array with one object per machine

```
{"id":"<ID>-<n>","title":"...","area":"...","verdict":"...","oneLine":"<what it tracks, at most 20 words>","topConcern":"<at most 25 words, or empty>","modes":["race","stuck"],"confidence":"high|medium|low","files":["path:line"],"linked":["<other machine names or files>"]}
```

Be exhaustive within your slice: small machines count too (a 2-flag toggle with a timer is a
machine). Expect 5-20 per slice. Merge duplicates within your slice. Precision matters more
than prose: every claim gets a path:line.
