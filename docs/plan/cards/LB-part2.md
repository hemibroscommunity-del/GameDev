# Card LB, part 2: the Ranks page in the owner's new style (one PR)

Model and effort: the strong model, high. Tag: 5503 (card LB's block, 5500 to 5519; `v2.3.5503`). Branch `claude/plan-lb-2-ranks`, from `main`. Part 1 of this card (`docs/plan/cards/LB.md` on main) built today's look from the owner's 2026-11-14 mockups: read it and the section "The Leaderboards" of `docs/UI-DESIGN-NOTES.md` (about line 1130) first, by range.

The owner, 2026-11-25, with one mockup (made with ChatGPT; on the branch `claude/plan-orc`: `docs/plan/status/assets/ranks-mock-2026-11-25.jpg`), right after asking for the Bro and Quests tabs in pages ("all related information is shown at once ... Players see the big picture first and can investigate the details whenever they want"): *"Also I prefer changing the leaderboard style to something like this"*.

PURPOSE: the Ranks page reads as ONE board at a glance: which kind of board (four tabs), which board (one picker), who leads (gold, silver, bronze), and where YOU stand (always in view at the foot), with nothing to hunt for down a side list.

## What the mockup shows, and how it maps

- **Four tabs across the top**, each its picture and word, the open one gold: **Power** (crossed swords), **Stats** (a shield), **Records** (a trophy), **Skills** (a pickaxe). Every board today's page has goes under one of them and none is dropped: Power = Overall, Melee, Bow, Magic, Level; Stats = today's Stats group (Defense, Max HP, Dodge, Stamina, Resist, Max Mana, Speed, Damage); Records = Kills, AP, Daily spin, Coin flip, Biggest fish; Skills = the ten life skills. (A worker without `caps.power` shows no Overall, as today.)
- **Under them, one row**: at the left a picker (the mockup's "Overall" with its crown and arrow) that names the open board and opens the list of that tab's boards; in the middle "RANKS" between laurels; at the right a quiet tag for the board's span ("All-time leaderboard"; a daily board says what today's page says for it).
- **The column heads**: #, Player, a "?" (it opens what today's page explains about the board's number, where today has such words; no words, no "?"), Lv, and the board's own value word (Power, Kills, ...).
- **The rows**: 1, 2 and 3 are full-width bars in gold, silver and bronze with a laurel medal round the number, a crown by the leader's name; 4 and below plain with the number. Each row: the player's portrait, name, an "Lv N" chip, the value at the right in the big numerals.
- **Your row is pinned at the foot**, framed in gold: your portrait, "<name> · You", "Rank #N", your Lv chip and your value; unranked, the dashes of the mockup ("Rank #—").

Rules:
- **Every row and number is what the worker already sends** for that board. No server file, no cap. Where the board's rows do not carry what the mockup draws (a player's portrait, a level on a board that has none), draw what the client can honestly know (your own portrait; the game's plain badge for others; no Lv chip on a board without levels) and LIST the gap in the PR body as a follow-up for the worker. Never an invented value.
- **What scrolls**: only the list of rows between the heads and your pinned row. The tabs, the picker row, the heads and your row are always in view at an upright iPhone's page (390 x 844 and 375 x 667 as the phone tests size them) with at least five rows showing, and sideways with at least three. The band's height stays today's.
- **Wide** (a phone on its side, a computer's band): the same page in the band's centred box; the tabs never stretch past the box.
- No new art file: the pictures are the game's (part 1's sheet under `assets/ui/leaderboard/` and what it cut from it, the Bro tab's stat icons, the skills' icons); a laurel or medal the game lacks is CSS, or the row's colour alone.

## How it is built (finish.md part 5, rule 5; CLAUDE.md)

- The rules are a module under `src/game/` (`ranksPage.js`: the tab and the board are ONE state with one transition function; which board sits under which tab; what your row says; a row's medal), with a suite that tests what it does and kills every mutant of its lines or lists the survivor with why. `src/ui/mobile/dash/LeaderboardPanel.jsx` and `BoardRow.jsx` gain calls and lose lines. The other leaderboard screens (`src/ui/panels/LeaderboardPanel.jsx`, the Town Board, the Wheel Hall, `FishBoard.jsx`) are NOT this part's: they keep today's look unless they share `BoardRow.jsx`, and then they must look as they did (say how you kept them).
- `?rankstyle=0` gives back today's page: its row in the switch table (`tools/guards/lib/switches.mjs`, `--write`).
- The same-change rows that apply: a screen (the `leaderboard*` states of `tools/qa/ui-review/states.mjs` updated; the notes' section rewritten for the new page with the owner's words); a phone test (`tools/qa/mp/mp-ranksstyle.mjs`, `world: 'wheel'`, its `lane`: the four tabs, the picker opens each board, your row in view while the list scrolls, medals on 1 to 3, the switch gives the old page back), `mp-boards`, `mp-boardslook` and `mp-boardwheels` mended where the shape changed; layout reads only through `docs/specs/layout-reads.md`'s ways; `touch-action: manipulation`; the picker's list closes with `data-esc` and `swallowTapClick` where it closes on `pointerup`; words a computer reads through `deskWords()`.
- **Beside you**: cards BRO, QP and CT are open and share `docs/UI-DESIGN-NOTES.md`, `states.mjs`, the switch table and its generated documents: keep your lines few and in your own section; merge `main` ONCE just before your one push and write the generated tables again (`--write`).

Done when: `mp-ranksstyle` passes once on your box (a repeat is a helper's); the node suites and `node tools/dev/precheck.mjs` pass; pictures at deviceScaleFactor 2 in `docs/shots/` (each tab upright, the picker open, sideways, a computer) described in the PR body in plain words for the owner, with the preview address `https://claude-plan-lb-2-ranks.gamedev-aix.pages.dev/`; `docs/plan/status/LB.md` true, riding the work's commit; ONE push.

Not this card's: `src/ui/BroTown.jsx` and the two renderers (card CT is alone in them; ask first if ONE line cannot be avoided); the worker and the Leaderboard object; the other tabs.
