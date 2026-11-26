# docs/archive: history, never a blueprint

v2.3.6703 (card TD PR 4, 2026-11-26). Papers that no longer describe the game,
kept for their history. Nothing here is current: the code is the truth
(CLAUDE.md §2). Never build from these papers, and never "restore" or "fix"
the game to match them.

- `root/`: the old design specs that sat at the top of the repository
  (`server-computed-damage-spec.md`, `damage-normalization-spec.md`,
  `gear-layer-spec.md`, `gear-armor-separation-recipe.md`,
  `ARMOR_SCALING_NOTES.md`, `creative-reference.md`). `README.md` and `gdd.md`
  at the root still name `creative-reference.md` by its bare name: it is
  here.
- `triage-2026-09-14` to `triage-2026-09-18`: the September backlog triage,
  its research and its pictures. Two of these folders also hold originals the
  asset door names as sources (the zone banners' ornament sheets and two music
  masters in `triage-2026-09-17`; `tools/assets/families.mjs`).

**Comments that name the old paths.** A comment in the code that names
`docs/triage-2026-09-14` to `-18` means the folder of that name here, in
`docs/archive/`. Four such comments were left as they were, because their files
belonged to other cards when these papers moved: `src/ui/panels/PlayerPaint.jsx`,
`src/ui/mobile/sheet/HeroExpanded.jsx`,
`src/rendering/systems/entityRenderer.js` and `effectsRenderer.js`.

**Searching here on purpose.** The repository's `/.ignore` keeps this folder
out of the sessions' search tool, so an everyday search never offers these
papers as current. To search them on purpose, name the folder
(`rg <phrase> docs/archive`) or turn ignoring off (`rg --no-ignore <phrase>`).
A plain `grep -r` in a shell still reads it.
