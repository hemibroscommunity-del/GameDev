# Card UI3, PR 6: the menus wear the game's own letters (one PR)

Model and effort: the strong model, high. Tag: 6785, block UI3. Branch `claude/plan-ui3-6-type`, STACKED on `claude/plan-ui3-1-kit` (base that branch; rebase on `main` once PR 1 merges). ONE draft PR, ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No server file, no cap, no live flag. It runs BESIDE UI3's PRs 3, 4 and 5 (they never edit `src/ui/kit/*` or `ui2Tokens.js`; you edit nothing else of a screen but a font's name); a sitting lists it right after the kit.

## Purpose

The owner, 2026-11-26, in the orchestrator's session: *"Also swap out the typography (font style) on all menus to be same as the 'logout' font."* The Log Out button and the top bar wear the game's own sans-serif, `'Source Sans 3', sans-serif` (`src/ui/mobile/dash/AccountPanel.jsx`:72, :94-100; `ZoneHeader.jsx`:350; `dash/common.js`:130; game.css :2295-2347, weight 800 asked, 700 the heaviest the page loads). The NEW menus wear a serif, Merriweather (`src/ui/kit/ui2.css`:125 `--ui2-font`, :151, :526; `src/game/ui2Tokens.js`:133-135 `UI2_FONT`, weights 400 and 700; and a bare `Georgia, serif` at ui2.css:480). It is the owner's later word over the master specification's type. After this PR every word of the new dashboard, its pages and the kit is Source Sans 3; no serif is left in a menu.

## The readings, chosen so you do not guess

1. **One token**: `UI2_FONT.fontFamily` becomes `'Source Sans 3', sans-serif` (the game's own spelling, with a system fallback after it if the kit's guard asks one) and `--ui2-font` follows it; ui2.css:480's Georgia goes through the token. Every `font-family` in `src/ui/kit/`, `src/ui/mobile/dash/*.css` and `src/ui/mobile/sheet/*.css` is the token or `inherit`: a guard (below) says so.
2. **Weights**: the kit's regular stays 400; its bold is 700 (the heaviest loaded: `src/index.html`:69 asks Source Sans 3 at 400, 600, 700). The kit's three weights of PR 1 (read `UI3-kit.md` and what the kit's branch built) keep their meaning; if PR 1 used a weight Source Sans 3 is not loaded at, use the nearest loaded one and SAY it. Never a weight the browser has to fake.
3. **Sizes are PR 1's**: `--ui2-fs-*` unchanged. A sans-serif at the same px reads a little smaller than Merriweather: do NOT raise a size to answer that; put two pictures in your message (before and after) and let the owner say.
4. **Merriweather leaves the page** if nothing else reads it (grep found only ui2.css, ui2Tokens.js and index.html): drop it from BOTH links of `src/index.html`:69-70, so a phone fetches one family fewer. If the canvas (Pixi text) or anything else names it, keep the link and say what.
5. **The words the kit draws on a canvas, if any** (a Pixi Text styled from `UI2_FONT`): the same family; derive a style with `.clone()`, never a spread (TRAPS §254).
6. `?ui2=0` (the old dashboard) is already Source Sans 3: untouched. No new switch (it is a token; `?ui2look=0` is PR 1's way back for the look, and the letters are not part of it unless PR 1 made them so: say).

## How it is built (finish.md part 5)

- The kit's token guard (PR 1's, or `tools/guards/ui2-tokens.test.mjs`) pins the new family. A guard `tools/guards/menu-font.test.mjs` reads the style sheets with a CSS parser (postcss is in the tree if the kit's guards use it; else a declaration walk, never a line pattern): under the kit's roots, `dash/*.css`, `sheet/*.css` and inline `fontFamily` in `src/ui/kit/*.jsx`, a `font-family` is `var(--ui2-font)`, `inherit` or on a SHRINKING allow list with why (a number face, if the kit has one). THE DODGES, each planted and seen red: a `font:` shorthand naming Georgia; `font-family: serif` in a screen's own sheet; an inline `fontFamily: 'Merriweather'` in a kit component; the token's fallback left as `serif`.
- A phone step in `tools/qa/mp/mp-ui3type.mjs` (`world: 'wheel'`, its `lane`; a computer run `wide: true`): on Menu, Bro, Gear, an item page, Combat and the Account page, the COMPUTED family of every text node under the dashboard starts with Source Sans 3, the face is loaded (`document.fonts.check`), no word is clipped by its box, none under 11 px; `?ui2=0` unchanged. Move in this PR, or name as your base's own reds, any step that pins the serif.

## Files

Yours: `src/game/ui2Tokens.js` (the font block), `src/ui/kit/ui2.css` (the font lines only), `src/index.html` (the two links), a family's name wherever reading 1 finds one in `src/ui/kit/*`, `dash/*.css`, `sheet/*.css`; the guards; `mp-ui3type.mjs`; `src/ui/kit/UiKitPage.jsx` if it names the face; `docs/LANTERN-SLATE-SPEC.md` or `docs/design/UI_MASTER_SPEC_NOTES.md` (one line: the owner's words, the date, what they overrule) and the decision log's line; `docs/UI-DESIGN-NOTES.md` where it names the serif. NOT yours: any layout, size, colour or component of a screen; `MenuGrid.jsx`, `GearPanels.jsx`, Bro's and Combat's pages (PRs 3 to 5); `src/ui/BroTown.jsx`; a renderer.

## Done when

Precheck 0 FAIL; the guards green and each dodge seen red and back; `mp-ui3type` green on the final code; the kit's own phone tests as green as on your base; `playable` and `memory-budget` green on the PR. Your ONE message: the PR, its full head, the preview's address, before-and-after pictures of the Menu and of Gear at 390 x 844 (deviceScaleFactor 2), whether Merriweather left the page, and any place a word no longer fits.
