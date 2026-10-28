/* ═══ THE GAME'S SCRIPT, ALL ASCII (v2.3.3703) ═══
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game.  Getting that to run as low as possible
 * without sacrificing performance is the goal."
 *
 * A browser keeps a page's script as text for as long as the page lives (a
 * function is compiled from it the first time it runs).  The game's main
 * script is 3.8 million characters, and 1,589 of them were past Latin-1 -- the
 * "—", "·", "→" and emoji in its words -- so Chrome held all of it at two bytes
 * a character (7.6 MB, of the memory check's `buffers` line), and Safari, which
 * shares an all-ASCII script's bytes with its text, decoded a second copy at
 * two bytes a character.  Written all in ASCII, the same script is one byte a
 * character, and Safari keeps no second copy (docs/specs/ascii-script.md).
 *
 * vite.config.js sets esbuild's `charset: 'ascii'`, which writes every such
 * character as an escape (`—`) in strings, templates and names.  esbuild
 * leaves a regular expression's characters as written, so this is the net
 * under it: `asciiOnly(code)` escapes whatever non-ASCII character is still in
 * the built code, and the build says so (vite.config.js `ascii-only-bundle`).
 *
 * Each UTF-16 code unit past 0x7F becomes `\uXXXX`, an astral character its
 * two surrogates.  That means the same thing everywhere a minified bundle can
 * hold one:
 *   - a string or an untagged template: the same characters (a tagged
 *     template's `raw` would change: the game has none);
 *   - a regular expression without `u`: the same code units, as the source
 *     was read anyway; with `u` or `v`, a surrogate pair written as two
 *     `\u` escapes is ONE code point (the spec's RegExpUnicodeEscapeSequence);
 *   - a name (`café`): a `\u` escape is part of the name;
 *   - a comment: nothing.
 * An identity escape -- a backslash before the character ("\é", /\é/), which
 * means the character itself -- loses its backslash with it: kept, the
 * backslash would escape the new escape's own backslash.  Whitespace past
 * ASCII outside a literal could not be escaped, but a minifier never writes
 * any.
 *
 * No imports: the server's suites test it in node (ascii-only.test.mjs). */

export function asciiOnly(code) {
  let out = '', from = 0, n = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    if (c < 0x80) continue;
    let k = i;
    while (k > from && code.charCodeAt(k - 1) === 92) k--;   /* the backslashes before it */
    const identity = (i - k) % 2 === 1;
    out += code.slice(from, identity ? i - 1 : i) + '\\u' + c.toString(16).padStart(4, '0');
    from = i + 1;
    n++;
  }
  return n ? { code: out + code.slice(from), n } : { code, n: 0 };
}

/* how many bytes of a file are past ASCII (the suite reads the built chunks
   with it when there is a dist/) */
export function nonAsciiBytes(buf) {
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] > 0x7f) n++;
  return n;
}
