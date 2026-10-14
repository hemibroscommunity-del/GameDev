# The Cloudflare lab (v2.3.3227)

> Owner, 2026-10-13, on the server split plan (`docs/SERVER-SPLIT-PLAN.md`):
> *"Go recommended"*, which said yes to the lab: "The Cloudflare lab: yes,
> after Phase 0".

## What it is for

The plan to hold about 1,000 players in one world puts "front doors" in front
of the world. These are servers that hold the phones' connections and do each
phone's work, while one world server runs the game behind them (Phase 1 and
2). Everything measured so far ran on this machine, under `wrangler dev`,
which runs every server of a script on ONE thread and enforces none of
Cloudflare's limits. Three things only Cloudflare can tell, and the plan rests
on all three:

1. **Do several servers of one script really run side by side?**
   - Cloudflare's documentation says it may put several Durable Objects of one
     script in one "isolate" on one machine.
   - An isolate is one thread, so two servers sharing one would each get half.
   - If 8 doors share a thread, 8 doors are worth one.
2. **How long does a message take between two servers?** Users report "tens
   of ms" inside one data centre, with rare 3-second stalls.
3. **How does Cloudflare bill a socket message between two servers?**
   - A phone's socket message is billed at 20 to a request.
   - A call between servers is billed as one request each.
   - Doors talking to the world over a socket are not mentioned anywhere.

The lab answers them on Cloudflare itself, without touching the game.

## What a run does

`.github/workflows/lab.yml`, started by hand:

1. **It makes a key for this run alone** (masked in the logs).
2. **It deploys a tiny worker of its own, `brotown-lab`** (`tools/lab/`).
   - It is not the game. It has its own name and its own objects, it stores
     nothing, and every request but `/` needs the run's key.
   - It lives under `tools/`, so a merge never sets off the game's deploy.
3. **It times it from GitHub's machine for a few minutes** (`tools/lab/run.mjs`):
   - **Side by side.** K objects (1, 2, 4, 8, 16) each do the same fixed work
     at once.
     - "Side by side" is how many objects' work got done in the time one
       takes: K means all at once, 1 means one after another.
     - Each object also says which isolate ran it and in which Cloudflare data
       centre.
     - Workers freeze the clock while code runs, so the work is a fixed loop
       and the timing is the runner's.
   - **The delay between two servers.** A "Door" object times 400 round trips
       to a "World" object, one at a time, three ways:
     - a call (JS RPC);
     - a socket the World takes the plain way;
     - a socket the World takes with the hibernation API, the way the game's
       room takes phones.
   - **Floods.** 20,000 messages one way by each of the three ways, then 4,000
     of 2 KB (a door's batch), to time each message on Cloudflare's machines.
   - **The bill.** With the deploy token, it reads the account's own figures
     for the lab's objects through Cloudflare's GraphQL API. Cloudflare's docs
     name the two datasets:
     - `durableObjectsPeriodicGroups`, a socket's messages;
     - `durableObjectsInvocationsAdaptiveGroups`, requests, and a hibernated
       socket's incoming messages.

     The schema itself names the fields, so the run asks it rather than
     guessing them. This is best effort: if the token may not read analytics,
     the run says so and everything else still stands.
4. **It deletes the worker, whatever happened.** The last step runs even after
   a failure.

**What it costs:** about a cent a run. That is a few seconds of work in 16
small objects, and about 70,000 messages, which Cloudflare bills at 20 to a
request.

## How to run it

**Actions** tab, then **Cloudflare lab**, then **Run workflow**. Leave
"rounds" at 5. It takes about 5-10 minutes. The results are on the run's page
(its summary), and in the `lab-results` download as `.md` and `.json`.

If the delete step ever fails, delete it by hand: Cloudflare dashboard,
**Workers & Pages**, **brotown-lab**, **Settings**, **Delete**. Even left
behind, it does nothing and costs nothing: it stores nothing and answers no
one without the run's key.

## What the answers mean for the plan

- **"Side by side" near K for 8 objects:**
  - the doors can be one script, as planned;
  - the "isolates" column shows whether they were in separate isolates.
- **Near 1:** objects of one script share a thread. The plan's fallbacks
  (`SERVER-SPLIT-PLAN.md`, "Risks" 1):
  - more, smaller doors;
  - doors spread over several scripts, each of which would need its own
    deploy.
- **The delays:** the plan assumes about 10-20 ms added between a phone's move
  and the others seeing it, through a door. The p95 and the max here say
  whether that holds, and how often a stall happens.
- **The bill:** compare the counts with the messages each flood sent.
  - If a socket message between two objects is counted like a phone's (20 to
    a request), doors should talk to the world over sockets, as planned.
  - If each is a request, batch harder, or use calls.

## A dry run on this machine

`node tools/lab/run.mjs --local` runs the same tests under `wrangler dev
--local` (no Cloudflare, no key needed). On this sandbox (2026-10-13):

| objects at once | time | side by side | isolates |
|---|---|---|---|
| 1 | 303 ms | 1 | 1 |
| 2 | 618 ms | 1 | 1 |
| 4 | 1,210 ms | 1 | 1 |
| 8 | 2,467 ms | 1 | 1 |
| 16 | 4,983 ms | 1 | 1 |

That is exactly what local runs predict: one thread, one isolate, one after
another. So the test tells the two cases apart.

The floods locally:

| what | each message |
|---|---|
| a plain socket | 5.8 µs |
| a hibernation socket | 10.2 µs |
| a call | 39.9 µs |
| a hibernation socket, 2 KB | 24 µs |

Round trips were 0-1 ms.

## Safety

- **Never the game.** The lab has its own worker name, its own objects and no
  storage. It needs no game secret, and it reads no player data.
- **Locked while it is up.** It is there only while a run is, and needs the
  run's key.
- **The runner can only time the lab.** `run.mjs` refuses any address but
  `https://brotown-lab.<subdomain>.workers.dev`.
- **The token is only read with.** The deploy token is used for the lab's
  deploy and delete, and for reading the account's figures (accounts, the
  lab's object namespaces, GraphQL).
- **One run at a time** (the workflow's concurrency group).

## Not in this lab yet

The game's own room on Cloudflare, filled with the load test's bots from
GitHub's machines. That would answer "how many players does the real room
hold?", which has only been estimated on this machine (about 105-145). It
would need:

- a copy of `server/` deployed under another name, without its routes (the
  live `api.brotown.net` domain must never move);
- the load test allowed to reach that copy.

It is the natural next lab, after this one's answers.
