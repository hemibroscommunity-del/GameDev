/* ═══ v2.3.5782: THE PAGE'S ✕ BUTTONS, AND WHETHER ESC PRESSES THEM (card U2 PR 3; CLAUDE.md §8 row "a screen or window") ═══
 *
 * CLAUDE.md §7 (Desktop): "a new window's ✕ takes `data-esc`" -- the Esc key
 * presses the control that wears it, or the class `bt-inspect-close`
 * (src/game/deskKeys.js ESC_SEL).  This finds every ✕ the page draws and says
 * whether Esc presses it.
 *
 * A ✕ is an element whose only content is a close glyph (✕ U+2715, ✖ U+2716
 * or × U+00D7, written as the character or its \u escape), in either form the
 * page's files hold:
 *   - compiled, `React.createElement("button", { ...props }, "✕")`: the
 *     props are the text from the last `createElement(` before the glyph;
 *   - JSX, `<button ... >✕</button>` or `>{'×'}<`: the props are the text
 *     from the last `<tag` before it.
 * A glyph in any other place (a variable, a comment, a DOM `textContent`, an
 * SVG cross) is not read: those are not counted, so a census of what IS read.
 *
 * Node only (the guards run on GitHub with server/'s packages).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const G = '(?:✕|✖|×|\\\\u2715|\\\\u2716|\\\\u00[dD]7|\\\\xD7|\\\\xd7)';
const COMPILED = new RegExp(`(["'])${G}\\1(?=\\s*[),])`, 'g');
const JSX = new RegExp(`>\\s*(?:${G}|\\{\\s*(["'])${G}\\1\\s*\\})\\s*</`, 'g');
/* deskKeys.js ESC_SEL: `[data-esc], .bt-inspect-close` -- what Esc presses */
const ESC = /["']?data-esc["']?\s*[:=]|\bbt-inspect-close\b/;
const lineOf = (t, i) => t.slice(0, i).split('\n').length;

/** Every ✕ in one file's source: [{ line, esc }]. */
export function closeButtonsIn(src) {
  const out = [];
  for (const m of src.matchAll(COMPILED)) {
    const before = src.slice(Math.max(0, m.index - 4000), m.index);
    const k = before.lastIndexOf('createElement(');
    if (k < 0) continue;
    out.push({ line: lineOf(src, m.index), esc: ESC.test(before.slice(k)) });
  }
  for (const m of src.matchAll(JSX)) {
    const before = src.slice(Math.max(0, m.index - 4000), m.index + 1);
    const k = before.search(/<[A-Za-z][\w.]*(?![\s\S]*<[A-Za-z])/);
    if (k < 0) continue;
    out.push({ line: lineOf(src, m.index), esc: ESC.test(before.slice(k)) });
  }
  return out.sort((a, b) => a.line - b.line);
}

/** Every ✕ under src/: { all: [{ file, line, esc }], bare: [...without data-esc] }. */
export function closeButtons(root = ROOT) {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel);
      else if (/\.(js|jsx)$/.test(e.name)) files.push(rel);
    }
  };
  walk('src');
  const all = [];
  for (const f of files.sort()) for (const c of closeButtonsIn(readFileSync(join(root, f), 'utf8'))) all.push({ file: f, ...c });
  return { all, bare: all.filter((c) => !c.esc) };
}
