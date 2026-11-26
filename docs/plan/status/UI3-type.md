card: UI3-type
branch: claude/plan-ui3-6-type
prs: #2398 (draft, base claude/plan-ui3-1-kit)
state: ready

## Done
- tag 6785: every menu of the new dashboard wears the Log Out button's Source Sans 3 (the owner, 2026-11-26). The kit's token `UI2_FONT` / `--ui2-font` is `'Source Sans 3', sans-serif`, weights 400 and 700 (both loaded upright: no faked weight); the slot's stars read the token (were a bare Georgia); sizes unchanged.
- Merriweather left both font links of `src/index.html` (nothing else named it: no canvas text, no other sheet).
- `?ui2look=0` wears yesterday's colours in TODAY's letters (`UI2_WAS_UNWORN`: the serif is not loaded); ui2-tokens check 13 still rebuilds main 7ec316e9's block to the byte; check 10 reads Google's family grammar (the italic axis) and fails a Merriweather link.
- Guard `tools/guards/menu-font.test.mjs`: esbuild's CSS parser and a declaration walk over the kit's, `dash/*.css` and `sheet/*.css` sheets; esbuild-compiled kit components; a shrinking allow list (one entry: the kit page's QA probe, not a style); eight dodges planted in memory every run. Break proofs on the real tree each red and back (token fallback serif; Georgia shorthand in gearPanels.css; `font-family: serif` in characterPage.css; `fontFamily: 'Merriweather'` in Badge.jsx).
- Phone test `mp-ui3type` (lane full); mp-uikit's step 5 moved from the serif to the face.
- Pictures: `docs/shots/ui3type-*-{before,after}.png` (Menu, Gear, Bro, the sword's page at 375 x 667 and 667 x 375; Menu and Gear at 390 x 844).

## Next
- Nothing: the ready message is sent.

## Found
- `src/ui/mobile/sheet/HeroExpanded.jsx`:2856 writes `Georgia, "Times New Roman", serif` italic for a lane's info glyph (the old hero sheet, `?ui2=0`): not this card's file.
- `CREDITS.md`:27 still lists Merriweather (now unused): not this card's file.
- On a computer the band holds the controls' key hints at 10 px (not a menu): the phone test leaves them out.
- `src/ui/account/AccountKeyCard.jsx`:107 shows the eight-word login key in a monospace face (on purpose); not this card's file: counted apart in mp-ui3type, the owner's to say.

## Needs
- Nothing.
