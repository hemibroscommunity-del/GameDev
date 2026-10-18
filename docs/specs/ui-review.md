# UI review screenshots (v2.3.3350)

The owner, 2026-10-18: "I'll also want screenshots labelled and bundled for
all UI elements in each view (portrait, landscape, desktop, etc) so I can have
chatGPT analyze them for improvements."

## How to get a bundle

**On GitHub (no terminal):** Actions -> "UI review screenshots" -> Run
workflow. It takes one to two hours. On the finished run's page, under
"Artifacts", download `ui-review-all` (or one view: `ui-review-portrait`,
`ui-review-landscape`, `ui-review-desktop`). Unzip it and upload the pictures
and README.md to ChatGPT with the prompt in the README.

**Here:** `npm run build`, then `node tools/qa/ui-review/capture.mjs`.
`--views=portrait,landscape,desktop` (any of them), `--only=hud,world-map`
(screen ids), `--png` (lossless pictures), `--no-zip`, `--no-sheets`,
`--out=<dir>`; `--report-only` makes the words, the contact sheets and the zips
again from pictures already taken.
Everything lands in `tools/qa/out/ui-review/` (git-ignored), and a zip per
view beside it.

## What is in a bundle

```
README.md       what each screen is, its numbered controls, a ChatGPT prompt
FINDINGS.md     every control the automatic check found a problem with
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

## The screens (tools/qa/ui-review/states.mjs)

One real player per view, against a private copy of the server, walked
through: the login door; the creator and each of its tabs and the drawing
editor; the welcome; the HUD (nothing open, the band open, the controls in
use); Mayor Bro (beside him, talking, the quest offered and accepted); the
dashboard's pages (Character and its Points, Quests and a quest, Life Skills
and a skill, the Codex and a monster, More and each of its pages, the bag and
an item card); a building's door and every building's window (and the daily
rewards, Diego's shop, Ace's flip); the world map and chat; the player list,
a player's card, a trade request and a duel challenge (stand-in players); a
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
