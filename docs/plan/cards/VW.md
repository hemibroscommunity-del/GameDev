# Card VW: the default view, 0.77 -> 0.79 (part 1, one PR)

Model and effort: the strong model, high. Tags: 6580 to 6599 (a new block, in `tools/dev/tag-blocks.json`), one a PR; this part has one: 6580.

The owner tried the view at several zooms on their iPhone (`?zoom=0.926`, 0.85, 0.81, 0.88 against 0.77) and said: *"I think the sweet spot might be between that zoom you just had me test and the more zoomed out default"*, *"In terms of seeing player detail vs world around you for just general play"*, then *"Ok I like 0.79"*.

PURPOSE: 0.79 is everyone's default view (CLAUDE.md part 7: a trial the owner likes becomes the default, with its switch). The off-ramp is `?zoom=0.77` (`?zoom=k` already exists; no new switch).

1. **(6580) The default is 0.79.** `src/game/worldViewport.js` `VIEW_OUT_DEFAULT`; what pins or cites 0.77 as today's view is mended (mp-zoomout, mp-landscape-view, the view-cap spec, UI-DESIGN-NOTES); history is left alone.
   Done when: the suites that read the view are green; `npm run build` and one `questline` run pass; one screenshot of BroTown at the new view; `node tools/dev/precheck.mjs` passes.

Not this card's: `src/ui/BroTown.jsx` and the two renderers in `src/rendering/systems/` (card CT is alone in them). The memory law: a closer view draws slightly less; `mp-membudget` runs on the PR; no line is raised.
