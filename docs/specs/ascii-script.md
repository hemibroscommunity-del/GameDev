# The game's script, all ASCII (v2.3.3703)

The owner, 2026-10-28: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal"*, and that night: *"Keep running tests
through the night on memory fixes/improvements."*

## What it was

The memory check's `buffers` line (`mp-membudget`, a phone in BroTown, at a
Flame Fields fight and home again) read 21.8 MB on arrival on main, and up to
24.2 MB home again: at its own line of 24, so every pull request's check could
go red by luck. A heap snapshot (every ArrayBuffer by what holds it) found
13.8 MB of buffers: the Wheel's object sheets' colour numbers (7.8 MB on
arrival, 8.4 home again), the world map's overview (0.8), the props' boxes
(1.5), Pixi's own (0.8) and smaller ones. The other **8 MB was no buffer at
all**: the reading (`Runtime.getHeapUsage`'s `backingStorageSize`) counts the
text of the page's scripts too.

A browser keeps a page's script as text for as long as the page lives: a
function is compiled from it the first time it runs. Its width is set by its
widest character, and the game's main script, 3.8 million characters, held
**1,589 past Latin-1**: the "—", "·", "→" and emoji in its words. So Chrome held
all 3.8 million at two bytes each, 7.6 MB, where an all-ASCII script is one
byte each. Safari shares an all-ASCII script's bytes with its text (WebKit's
`CachedScript`), and otherwise decodes a second copy, two bytes a character.

Vite asks esbuild for `utf8` output, so every one of those characters went
through as written.

## What it does now

- **`esbuild: { charset: 'ascii' }`** (vite.config.js): esbuild writes every
  character past ASCII as an escape (`—`) in strings, templates and names.
  Every string is the same string at run time.
- **The net under it** (`ascii-only-bundle`, tools/dev/ascii-only.mjs):
  esbuild leaves a regular expression's characters as written. The build
  escapes whatever is left after the minifier and says so in the build log
  (`[plugin ascii-only-bundle] assets/index-….js: 2 character(s) past ASCII
  escaped`). Each code unit becomes `\uXXXX`, which means the same in a string,
  a template, a regular expression with or without `u` or `v` (a surrogate pair
  written as two escapes is one code point in unicode mode), a name or a
  comment; an identity escape (`\é`) loses its backslash with it.
- **The one regular expression** in the game written with such a character,
  the minimap's level band `/Lv \d+[–-]\d+/`, is written `[–-]`.

Every script the build writes has no byte past ASCII. The main script is
6.6 KB longer (3,761,067 -> 3,767,829 bytes, the escapes) and 1.6 KB smaller
to download (1,224,943 -> 1,223,291 bytes gzipped).

## Measured

`mp-membudget` (a 3x phone: BroTown, the Flame Fields' fight, home, three
times), on main with every open pull request merged in, before and after:

| | before | all ASCII |
|---|---|---|
| buffers, arriving in BroTown | 21.9 MB | 18.2 MB |
| buffers, home again (trips 1-3) | 23.5, 23.8, 24.0 MB | 20.0, 20.2, 20.4 MB |
| every other line | | the same (all within their lines) |

That is Chrome's saving: the 3.8 million characters at one byte each, not
two. On an iPhone the saving should be larger, as Safari keeps no second copy
of an all-ASCII script; it cannot be measured here.

The budget's `buffers` line comes down from 24 to 22 MB
(tools/qa/mp/memory-budget.mjs), which locks the saving in and ends the luck:
main read 23.9-24.2 against 24.

The ground worker's scripts (public/tools/world/core/, served as written, not
built) are 0.54 million characters with a few hundred past Latin-1: about
0.5 MB in the worker. Not changed: they are the studios' source too.

## Tests

- **`ascii-only` suite** (node): ASCII code untouched; a string, a template, a
  regular expression with an en dash in a class, an emoji in a class with `u`,
  with `v` and without, a lone surrogate, a range past ASCII, the chat lanes'
  marks, a name, a comment, an identity escape and escaped backslashes, each
  run before and after escaping with the same answer and ASCII out; the wiring
  (`charset: 'ascii'`, the net in `generateBundle`); and no regular expression
  in src/ written with a character past ASCII.
- **A build with two such regular expressions put in on purpose**: the net
  escaped both and said so, the script came out all ASCII, and the code gave
  the same answers.
- **`mp-membudget`**, the memory check every pull request runs.
