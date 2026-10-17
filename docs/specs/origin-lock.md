# Only the game's own site may play (v2.3.3312)

The owner, 2026-10-17, asked how to protect the game against people who clone
it and pass it off as their own. Asked which addresses players use, they said:
"I only use Brotown.net for this game and that's the only domain I plan to
keep using."

## The problem

The game's server, `wss://api.brotown.net`, answered **any** web page. So the
cheapest copy of BroTown needed no server at all: take the page, change the
name and the pictures, put it on another site, and its players would play in
**our** world -- with our players, on our server bill, under someone else's
name.

## What changed

Every time a web page opens a connection, the browser writes the page's own
address on it (the `Origin` header). A page cannot change or hide it. The
server now checks it before anything else (`server/src/origin.js`, called from
the worker's `/ws` route in `server/src/index.js`):

| The page is at | What happens |
|---|---|
| `brotown.net`, or any address under it (`www.`, `api.`) | let in |
| `gamedev-aix.pages.dev`, or any address under it (every pull request's preview) | let in |
| a site listed in `ORIGINS` (wrangler.toml), or any address under it | let in |
| the machine itself or the home network (`localhost`, `127.x`, `192.168.x`, `10.x`, `172.16-31.x`, `*.localhost`) | let in -- a developer's build, the test tools, a phone on the same wifi. No public website has one of these addresses. |
| no address at all | let in -- browsers always send one, so this is a program: the load test, the bot lab, `curl` |
| **anywhere else** | **refused** |

"Anywhere else" includes look-alikes (`evilbrotown.net`, `brotown.net.evil.com`,
a `brotown.net` spelled with a Cyrillic "о"), other `pages.dev` projects,
`null` (a page opened from a file or a sandboxed frame), and pages that are not
websites at all (a browser extension, an app wrapper).

A refused page gets a connection that says why and closes:
`join_rejected {reason: 'origin', home: 'https://brotown.net'}`, then close
code **4015**. The refusal happens in the worker, before any game room, so a
copy never wakes the room or costs a room request. A plain request (no
connection upgrade) gets a `403` naming the real site.

### What a copy's players see

A copy built from our code shows them this (`src/ui/OriginScreen.js`), and
never tries again:

> **This isn't the official BroTown**
> BroTown is played at brotown.net, and its world only opens there.
> [ Play at brotown.net ]
> *This page is at clone.example.*

So a lazy copy becomes an advertisement for the real game. (A careful copier
can remove the screen from their copy; they still cannot connect.) A page
from before this version reads the refusal as final and stops trying too
(wsClient.js, v2.3.1181: an unknown refusal is never retried and never makes a
new identity).

## What it does not do

- **It does not stop bots.** A program can write any `Origin` it likes,
  `https://brotown.net` included. The lock stops other **websites** -- a page
  in a browser cannot lie about where it is -- which is what a copy is. Bots
  are the job of the message limits (`docs/specs/one-socket.md`) and the
  account check (`docs/specs/account-check.md`). This is also why "no
  address" is let in: refusing it would break our own test tools and stop
  nothing (TRAPS §195).
- **It does not stop a copy that runs its own server.** The server's code is
  in this repository. A copy with its own server is a copy of the code, and
  the proofs (`docs/specs/provenance.md`) are what show it is ours.
- **It does not cover the server's other addresses** (the leaderboard, the
  market listings, the crash feed, the account check). They are plain web
  requests, open to any page as before, and none of them lets anyone play.
  They can be locked the same way if a copy ever uses them.

## The levers

Both live in `server/wrangler.toml`, `[vars]`:

- **`ORIGINS`** -- more sites to let in, comma separated, each with every
  address under it: `ORIGINS = "brotown.com, play.example.org"`. **Add a new
  domain here, and merge, BEFORE players use it.** A page on a domain the
  server does not know shows the screen above, and the small print says the
  page's own address -- the clue that the list needs it.
- **`ORIGIN_LOCK`** -- `"off"` lets every site in again. Anything else, or
  nothing at all, is on.

Merged, a change deploys in a few minutes. For an emergency, the Cloudflare
dashboard is quicker: **Workers & Pages → brotown-server → Settings →
Variables and Secrets**, set `ORIGIN_LOCK` to `off`, **Deploy**. A dashboard
value lasts only until the next deploy from GitHub (wrangler.toml wins then),
so change the file too. Rolling back the deploy (**Deployments → Rollback**)
also undoes it.

**Seeing who tried.** Each refused site is written once to the server's log:
`[bt] origin refused (elsewhere): https://clone.example`. In the dashboard:
**Workers & Pages → brotown-server → Logs → Begin log stream** shows them
live. A site that keeps appearing there is a copy using our server -- worth a
screenshot and a note of the address (the provenance page's "When you find a
copy").

## Checks

- `server/test/origin.test.mjs` (33): who is let in and who is not (look-alikes,
  previews, the home network, schemes, public addresses), the levers, the
  refusal's message, code and order, the log (each site once, at most 64),
  through the worker (a refused page never reaches a room; the game's site, a
  preview, a local page and a program do; the room rule still first; the HTTP
  routes untouched), and the page and the worker agreeing on the reason, the
  close code (no other refusal's) and the home address. Nine deliberate bugs
  (a suffix match without its dot, the lock off by default, a wider private
  range, the check removed, the close sent before the message, the page
  reconnecting, a different home, an extra hole) each fail it.
- `tools/qa/mp/mp-originlock.mjs` (10, a phone): a page at localhost plays; a
  page at `http://clone.example` -- a second browser told that name is
  127.0.0.1, so the address on its connection is the browser's own -- gets the
  screen, one connection in ten seconds, no new identity, and never appears in
  the world; the screen covers an iPhone. Picture: `tools/qa/mp/out/originlock.png`.
- On a real local worker (`wrangler dev`): a page from another site, `null` and
  a look-alike each got the message and close 4015; `brotown.net`, a preview,
  a local page and a program each reached the room.
