# UI review screenshots (v2.3.3407, design notes v2.3.3451)

The owner, 2026-10-18: "I'll also want screenshots labelled and bundled for
all UI elements in each view (portrait, landscape, desktop, etc) so I can have
chatGPT analyze them for improvements."

## How to get a bundle

**On GitHub (no terminal):** Actions -> "UI review screenshots" -> Run
workflow. It takes one to two hours. On the finished run's page, under
"Artifacts", download `ui-review-for-chatgpt` (the words and the contact
sheets, ~17 MB), `ui-review-all` (everything) or one view
(`ui-review-portrait`, `ui-review-landscape`, `ui-review-desktop`). Give
ChatGPT README.md, DESIGN-NOTES.md and the pictures (a view's contact sheets
are the fewest uploads) with the prompt in the README.

**Here:** `npm run build`, then `node tools/qa/ui-review/capture.mjs`.
`--views=portrait,landscape,desktop` (any of them), `--only=hud,world-map`
(screen ids), `--png` (lossless pictures), `--no-zip`, `--no-sheets`,
`--out=<dir>`; `--report-only` makes the words, the contact sheets and the zips
again from pictures already taken; `--check-notes` says which screens have no
design notes (no build needed).
Everything lands in `tools/qa/out/ui-review/` (git-ignored), and beside it a
zip per view, `ui-review-all.zip` and `ui-review-for-chatgpt.zip` (the words
and the contact sheets).

## What is in a bundle

```
README.md       what each screen is, its numbered controls, its design notes,
                a ChatGPT prompt
FINDINGS.md     every control the automatic check found a problem with
DESIGN-NOTES.md why each screen is the way it is (docs/UI-DESIGN-NOTES.md)
index.html      a contact sheet to look through (click a picture: numbered)
manifest.json   all of it as data
portrait/       NN-<screen>.jpg and NN-<screen>.labels.jpg
landscape/      the same, a phone held sideways
desktop/        the same, a computer (cropped to the game's column), plus
                00-desktop-window.jpg, the whole window
sheets/         contact sheets: a section's screens several to one picture,
                each under its title (6-8 a sheet, at most ~2000 px a side) --
                a whole section in one upload to ChatGPT
```

The three views:

| view      | size          | input           | what it is                                   |
|-----------|---------------|-----------------|----------------------------------------------|
| portrait  | 390 x 844 @2x | touch           | an iPhone upright, the main platform         |
| landscape | 844 x 390 @2x | touch           | the same phone sideways                      |
| desktop   | 1440 x 900 @2x| mouse, keyboard | a computer: the game in its centred column   |
| tablet    | 820 x 1180 @2x| touch           | an iPad upright (only with `--views=tablet`) |
| laptop    | 1366 x 768 @2x| mouse, keyboard | the commonest laptop window (only with `--views=laptop`): the column 419 px wide, where the creator's ENTER BRO TOWN was off the screen (TRAPS §214) |

## The screens (tools/qa/ui-review/states.mjs)

One real player per view, against a private copy of the server, walked
through: the login door; the creator and each of its tabs and the drawing
editor; the welcome; the HUD (nothing open, the band open, the controls in
use); Mayor Bro (beside him, talking, the quest offered and accepted); the
dashboard's pages (Character and its Points, Quests and a quest, Life Skills
and a skill, the Codex and a monster, More and each of its pages, the bag and
an item card); a building's door and every building's window (and the daily
rewards, Diego's shop, Ace's flip); the world map and chat; the player list,
another player's card (a sparring clone), an Inspect card (your own), a trade
request and a duel challenge (stand-in players); a
harvest (beside the tree, the hits landing, the gesture asked for); and a
fight (a sparring clone).

A screen that cannot be reached in a view is listed as "not captured" with
the reason, never silently missing. A new screen or window goes in states.mjs.

## The numbered pictures (tools/qa/ui-review/audit.mjs)

Every control a player could press -- a button, a tab, a link, a field, a
`role="button"` -- that is on the screen is boxed and numbered:

- **green**: fine;
- **amber**: small (under 32 CSS px on a touch screen, 16 with a mouse) or its
  words are cut off;
- **red**: cut off by the edge of the screen (or of the game's column on a
  computer), or covered -- the middle of it answers as something else, so a
  tap there reaches that instead.

A control inside a list that scrolls is only "cut off" when the list itself
runs past the screen (its end can never be scrolled into view); one scrolled
part-way out of its list is judged by the part that shows, boxed with a dashed
line. Controls behind a whole screen in front (a modal, a window) are left out
of that screen's list. What the game draws itself (the world, the minimap, name
plates, bars, damage numbers, speech bubbles) is in the pictures but not in the
lists.

On a computer the pictures are cropped to the game's column, except while a
window drawn outside the column is up (the NPC dialogue, the quest offer, the
world map are portalled to the page and centred on the whole window): then the
picture is the whole window, as the player sees it, and those windows are
judged against it, not the column.

What the first run found, and what was done about it: docs/specs/reach-every-button.md.

## The design notes (v2.3.3451, tools/qa/ui-review/notes.mjs)

The owner, sending the first bundle to ChatGPT: "I'd also like it if you had
included all of the design rationale behind the iterations I've made in each
menu", then "Yes go ahead, and add it to the screenshot tool". Shown only the
pictures, a reviewer suggests what was tried and turned down (a gold road on
the ground, the back arrow in the dashboard's button row, potions on Diego's
shelf...).

`docs/UI-DESIGN-NOTES.md` has the reasons, a section ("topic") for each part
of the game: what it is for, the owner's decisions and why, what was tried
before and changed, what not to suggest, and what is still open. It is a
digest of the specs, the UI law (UI-BIBLE, LANTERN-SLATE-SPEC), TRAPS and the
owner's words as the code and CLAUDE.md record them; where it and a spec
differ, the spec (and the code) win.

A topic is a `## ` heading with a `Screens:` line under it naming the
states.mjs ids it is about (`dash-*` any id starting so, `all` every screen):

```
## The bag and item cards
Screens: dash-bag, item-card
```

Every bundle carries the file as `DESIGN-NOTES.md`; under each screen the
README says "Design notes:" and links its topics (the `all` ones are named once,
at the top), manifest.json gives each shot its `notes`, index.html links them,
and the ChatGPT prompt asks for a screen's notes to be read before it is judged
and for a note to be named, with a reason, when a suggestion goes against it.
A screen no topic names is listed at the end of the README and in the run's
log; `--check-notes` lists those and any topic naming a screen that is gone,
and fails if there are any. **A new screen in states.mjs gets a topic, or its
id on one; a new decision about a screen gets a line in its topic.**

### What the research found in the review itself (v2.3.3451)

Writing the notes meant checking each screen against the code, which found
pictures that showed a player something they never see:

- **A trade request** was the one-way "gift" card kept only for an old
  worker; it is the drawer today's worker raises ("Rival Bro wants to
  trade", Open trade / Decline: `trade2`'s invite).
- **Chat on a phone** was opened the computer's way (the bar at the top);
  the phones now open the box over your bro, as a tap on yourself does.
- **A duel challenge** carried a 500-gold wager no challenge sends (the one
  sender, a player's card, sends 0).
- **Daily rewards: the season** was the Today page again since the season
  was put away (v2.3.3400): taken out.
- **The band open, sideways** was never taken: the hidden upright chip was
  pressed instead of the ▴ that shows.
- **Another player's card** -- the most-used social window -- was not in
  the review at all: `player-card` opens it on a sparring clone of you.
- **BroTown, nothing open** wore a QUEST REWARD banner: the setup's armour
  raises one, queued behind the welcome plate. The welcome step now waits
  until BroTown says the last banner is gone (`window.__btQuestMsgUntil`),
  and a `--only` retake runs the welcome step unphotographed, as it runs the
  creator -- a retake's first screens had worn the welcome plate.
- **The fight** was never aimed: it looked for a `.spar` flag no player entry
  carries and called a `_gameFns.sparAim` that does not exist; the clones are
  the ids the worker's `spar_state` named (`S._spar.ids`).
- Four captions said what a screen no longer shows (the bank "stores items",
  the auction house "listings", the guild hall "your clan", the harvest
  button "HARVEST").

A screen's number is its place in states.mjs, so after a screen is added or
taken away there, `--only` and `--report-only` rename the pictures they keep
to their new numbers, drop those of a screen that is gone, and take every
title and caption from states.mjs as it is now (`tidyShots`).
