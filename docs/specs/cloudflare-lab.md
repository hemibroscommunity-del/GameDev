# The Cloudflare lab (v2.3.3247)

> Owner, 2026-10-13, on the server split plan (`docs/SERVER-SPLIT-PLAN.md`):
> *"Go recommended"*, which said yes to the lab: "The Cloudflare lab: yes,
> after Phase 0".

## v2.3.3252: the account is on the free plan

The first run (2026-10-14) never started. Cloudflare refused the deploy: "In
order to use Durable Objects with a free plan, you must create a namespace
using a `new_sqlite_classes` migration" (code 10097). So the account, and the
game's `brotown-server` on it, is on the Workers **free** plan. Nothing was
left behind (the delete step found no worker).

That matters for the lab, and much more for the game:

- **The free plan has daily limits for the whole account**, reset at 00:00
  UTC. Durable Objects get 100,000 requests a day (a web request, a call or
  an alarm is one, and so are 20 incoming socket messages) and 13,000 GB-s
  of time awake. Past either, Cloudflare refuses that kind of work until
  midnight, **the game's included**.
- **The old lab would have used a quarter of a day.** Its call flood alone
  was 20,000 calls, each a billed request, and the Door looked for a flood's
  end every 5 ms, one call a look: about 25,000 requests a run.
- **The game's own room is the bigger story.** A playing phone sends about
  10-30 messages a second, so 100,000 requests is about 20-55 player-hours of
  play a day in all (*estimate*). SERVER-SPLIT-PLAN risk 8 has the rest.

What changed in the lab:

- **Its objects are SQLite ones** (`tools/lab/wrangler.toml`), the only kind
  the free plan takes. They store nothing, so the kind changes nothing the lab
  measures.
- **A run is sized for the free plan: about 2,700 billed requests**, under 3%
  of a day. Round trips 200 (were 400). Floods of 10,000 socket messages each
  way (were 20,000), 1,000 calls (were 20,000) and 2,000 messages of 2 KB
  (were 4,000). The Door looks for a flood's end every 50 ms, for at most
  30 s. The workflow's **big** box runs the old sizes, for the paid plan only.
- **0. The day so far.** Before anything else, the run reads the account's
  requests so far today. If this run could take them past 90% of the day's
  100,000, it stops there and says so: run it after 00:00 UTC.
- **4. The game's own days.** After the bill, the run reads the last 7 days of
  `brotown-server`'s Durable Objects from the account's own figures, day by
  day, against the free plan's limits:
  - requests (calls and web requests, and socket messages in at 20 to one);
  - time awake (GB-s);
  - CPU;
  - rows read and written.

  It is read only, and best effort like the bill. If the token may not read
  the figures, the report says where they are in the Cloudflare dashboard.
- **The report is written even when the run stops early**, and its figures are
  saved before the page is drawn.
- **The data centre lookup** (each object asks Cloudflare's trace page where
  it runs) gives up after 3 s, and is skipped on a local dry run.
- **A brand-new address is not everywhere at once.** The second run deployed
  and timed 1 and 2 objects. Then one request met Cloudflare's own "not
  found" page, seconds after the address had answered, and the run ended
  with nothing written. Now:
  - the run waits for 20 answers in a row, half a second apart;
  - a request that meets Cloudflare's own page is tried again, up to 5
    times. It never reached the lab, so trying again costs nothing;
  - a lost connection is tried again too, but only for the cheap requests;
  - whatever goes wrong, what was measured before it is written, with the
    error.

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
   - **The delay between two servers.** A "Door" object times 200 round trips
       (400 with "big") to a "World" object, one at a time, three ways:
     - a call (JS RPC);
     - a socket the World takes the plain way;
     - a socket the World takes with the hibernation API, the way the game's
       room takes phones.
   - **Floods.** 10,000 socket messages one way each way, 1,000 calls, then
     2,000 of 2 KB (a door's batch), to time each message on Cloudflare's
     machines (with "big": 20,000, 20,000 and 4,000).
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

**What it costs:** on the free plan, nothing in money, but about 2,700 of the
account's 100,000 Durable Object requests that day, which the game shares (the
run stops first if the day is already near the limit). On the paid plan, about
a cent. That is a few seconds of work in 16 small objects and about 23,000
messages.

## How to run it

**Actions** tab, then **Cloudflare lab**, then **Run workflow**. Leave
"rounds" at 5 and "big" unticked (tick it only on the paid plan). It takes
about 5-10 minutes; soon after 00:00 UTC is the safest time, when the day's
requests have just reset. The results are on the run's page
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

Again on 2026-10-14 with the free plan's sizes (v2.3.3252), the lab's own
wrangler (4.96.0, its package.json): 1, 2 and 4 objects as before (306, 605,
1,263 ms), and the floods 7.3 µs, 10.2 µs, 39 µs and 27 µs a message. But 8
objects at once never all came back: the third waited out the runner's 300 s.
That is the local runtime's limit, so a local dry run now stops at 4; the run
on Cloudflare still does 8 and 16.

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
- **Never more than a sliver of the day** (v2.3.3252): about 2,700 billed
  requests on the free plan, and none at all if the day is already near its
  limit.

## Not in this lab yet

The game's own room on Cloudflare, filled with the load test's bots from
GitHub's machines. That would answer "how many players does the real room
hold?", which has only been estimated on this machine (about 105-145). It
would need:

- a copy of `server/` deployed under another name, without its routes (the
  live `api.brotown.net` domain must never move);
- the load test allowed to reach that copy.

It is the natural next lab, after this one's answers.
