# Precheck's checks, one a file (v2.3.5022)

`node tools/dev/precheck.mjs` loads every `*.mjs` in this folder by its file
name and runs it. **A new check is a new file here and no edit to
`precheck.mjs`.** The checks written inside `precheck.mjs` before this
stay where they are.

Precheck is the fast local copy. A rule that must hold on GitHub is ALSO a
guard (`tools/guards/`) or a server suite: the plan's rule 1.

## How to write one

The file's name is the check's name (`plan-status.mjs` reports as
`[plan-status]`). It may not take the name of a check `precheck.mjs`
already has.

```js
export default async function check({ root, read, exists, changed, changedCode, git, baseRef, mergeBase, pass, fail, warn }) {
  // read('docs/x.md')   a file's text, by its path from the repository's root
  // exists('docs/x.md') is it there?
  // changed             the files this branch changes (and uncommitted edits)
  // changedCode         those that are .js .mjs .cjs .jsx
  // git(['log', ...])   git's output as text
  if (somethingWrong) fail('what is wrong, and the fix, in one or two lines');
  else pass('what was checked, with a count');
}
```

- `fail` blocks the push; `warn` does not; `pass` says what was checked.
- A check that says nothing is reported as a PASS. One that throws, or has
  no default export, is a FAIL.
- Keep it fast and offline: precheck runs before every push. A check that
  only matters when some files change should look at `changed` first and
  `pass('... skipped')`.

`plan-status.mjs` is the example.
