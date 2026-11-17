/* v2.3.5820 (card SEC2): the built page's HTML comments taken out
 * (vite.config.js `strip-html-comments`, build only; why there).
 *
 * A comment and the blanks around it on its line go, with its line's end, so
 * a note on lines of its own leaves no empty lines behind.  A plain pattern
 * is safe only while the page has no inline <script> and no "<!--" inside an
 * attribute or a <style>: tools/guards/site-headers.test.mjs holds that for
 * src/index.html, and runs this function on it.
 */
export function stripHtmlComments(html) {
  return String(html).replace(/[ \t]*<!--[\s\S]*?-->[ \t]*(\r?\n)?/g, '');
}
