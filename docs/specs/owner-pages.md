# The owner's reads, a page at a time (v2.3.5607, card OPS PR 8)

Red team RT-2, F9 (`docs/security/rt2-findings.md` on `claude/red-team-rt2`).

## Why

Five of the owner's own reads listed a whole table in one request: the bot
flags (`/dev/botflags` and `/api/botstat?flagged=1`, every `botstat:` row),
the drawings (`/dev/looks`) and a name's AP (`/dev/apinfo`, up to 20,000
`char:` records each), and the economy (`/economy`, every `rpg:`,
`mkt_order:` and `inbox:` page in one request). After a viral week that is
~20,000 rows of 1-2 KB read into the room at once, beside the 45-80 MB a full
room holds, against its 128 MB: the owner's first "are there bots?" tap
could reset the room and drop everyone.

## What

Each reads at most 200 rows a request (`liveops.js` `OWNER_PAGE`,
`_ownerPage`), resumed after `after` (the `next` the page before gave);
`next` is `null` on the last page. No `after` reads the first page, so an
older panel still gets an answer.

| read | a page | in its answer | the panel |
|---|---|---|---|
| `/dev/botflags` | 200 `botstat:` records; a record in memory on the page whose ids hold it | `flagged`, newest flag first within the page; `next` | "More" reads the next page; the list is sorted again |
| `/api/botstat?flagged=1` | 200 records | `flagged`, `next` | (curl; OPERATIONS) |
| `/dev/looks` | `limit` characters, at most 60 (a drawn row is ~5 KB) | the ones that drew, newest first within the page; `total` and `fresh` count the page; `next` | adds the pages up; reads on past empty pages (12 a tap at most) until it has some to show; "Show more" |
| `/dev/apinfo` | 200 characters | the ones of the name; `next`; "no character named" only when one page was the whole list | follows `next` itself: the name is typed once |
| `/economy` | one page of one table: players, then the market's orders, then the mail | that page's sums in the old fields, `part` naming which; `next` (the last key, or the next table) | (curl; OPERATIONS) |

What changes for the owner: the bot flags and the drawings were newest first
over everyone; now newest first over what has been read (a date order over
everyone needs everyone read). `before` on `/dev/looks` is no longer read.
The daily economy record (`metrics:`) is still the whole sum, made by the
tick's job a page a slot.

No switch: nothing here is a player's, and nothing writes.

## Tests

`server/test/owner-pages.test.mjs`: 1,000 rows each, read through the routes
a page at a time: every list at most 200 and with a limit; every flagged
player, drawer and name exactly once over the pages; the economy's pages add
up to the whole; a bad economy cursor a 400. `bot-flags`, `charwatch`,
`liveops` (7b walks the economy's pages), `admin` and `admin-lock` unchanged
in what they hold.
