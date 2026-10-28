/* THE GAME'S SCRIPT, ALL ASCII -- v2.3.3703 (docs/specs/ascii-script.md).
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game.  Getting that to run as low as possible
 * without sacrificing performance is the goal."  A browser keeps a page's
 * script as text while the page lives, and ONE character past Latin-1 in it
 * makes Chrome keep all of it two bytes a character (and Safari decode a
 * second copy): the game's 3.8 million characters held 1,589 such ("—", "·",
 * "→", emoji), 7.6 MB of the memory check's `buffers` line.  vite.config.js
 * asks esbuild for ASCII output and escapes what esbuild leaves
 * (tools/dev/ascii-only.mjs).  Here:
 *   1. ASCII code is left as it is;
 *   2. everywhere a minified script can hold such a character, the escaped
 *      code means the same: strings, templates, regular expressions with and
 *      without `u` (an emoji in a class, a range, a lone surrogate), a name,
 *      a comment -- each run before and after and compared;
 *   3. an identity escape ("\é", /\é/) loses its backslash; an escaped
 *      backslash before the character keeps both;
 *   4. what comes out is ASCII;
 *   5. the wiring: vite.config.js asks esbuild for ASCII and runs the net
 *      after the minifier, and no regular expression in src/ is written with
 *      a character past ASCII (esbuild leaves those; the net would escape
 *      them, but the source should say it). */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { asciiOnly, nonAsciiBytes } from '../../tools/dev/ascii-only.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const ROOT = new URL('../../', import.meta.url).pathname;
const run = (code) => vm.runInNewContext(`(${code})`, {});
const isAscii = (s) => [...s].every((ch) => ch.charCodeAt(0) < 0x80);

/* 1. ASCII stays as it is */
{
  const code = 'function f(a){return a.replace(/[a-z]+/g,"x")+`t${1}`}/* plain */';
  const r = asciiOnly(code);
  check('1. ASCII code comes back the same, nothing escaped', r.code === code && r.n === 0, r);
}

/* 2-3. the same meaning, escaped */
const CASES = [
  ['a string with a dash, a middle dot and an emoji', '"Brotown \u00b7 safe \u2014 \ud83c\udf89"'],
  ['an untagged template', '`Lv 1\u201340 ${2 + 3} \ud83d\udee1`'],
  ['a regex with an en dash in a class (the minimap\'s)', '/Lv \\d+[\u2013-]\\d+/.exec("Frost Ridge \u00b7 Lv 6\u201310")[0]'],
  ['the same regex on a hyphen', '/Lv \\d+[\u2013-]\\d+/.exec("Lv 1-5")[0]'],
  ['a regex with u: an emoji in a class is one code point', '"x\ud83c\udf89y".match(/[\ud83c\udf89]/u)[0]'],
  ['a regex with u: a lone surrogate is not in that class', '/[\ud83c\udf89]/u.test("\ud83c")'],
  ['a regex without u: the class is two code units', '/[\ud83c\udf89]/.test("\ud83c")'],
  ['a regex range past ASCII', '/[\u00e0-\u00fc]+/.exec("\u00e7\u00e0\u00fcz")[0]'],
  ['a regex test of the chat lanes\' marks', '/^(\ud83d\udee1|\ud83d\udccd|\u2709)/.test("\ud83d\udccd Ace")'],
  ['a name past ASCII', '(() => { const caf\u00e9 = 2; return caf\u00e9 * 3; })()'],
  ['a comment past ASCII', '/* \u2014 \ud83c\udf89 */ 7'],
  ['an identity escape in a string', '"\\\u00e9"'],
  ['an identity escape in a regex', '/\\\u00e9/.test("\u00e9")'],
  ['an escaped backslash, then the character', '"\\\\\u00e9"'],
  ['three backslashes: an escaped backslash, then an identity escape', '"\\\\\\\u00e9"'],
  ['a split on a middle dot', '"a \u00b7 b \u00b7 c".split(/ \u00b7 /).length'],
];
let vFlag = true;
try { new RegExp('[a]', 'v'); } catch (e) { vFlag = false; }
if (vFlag) CASES.push(['a regex with v: an emoji in a class is one code point', '"\ud83c\udf89".match(/[\ud83c\udf89]/v)[0]']);
for (const [what, code] of CASES) {
  let before, after, err = null;
  const r = asciiOnly(code);
  try { before = run(code); after = run(r.code); } catch (e) { err = String(e); }
  check(`2. ${what}: the same after escaping (${JSON.stringify(before)})`, !err && before === after && r.n > 0, { code, escaped: r.code, before, after, err });
  check(`4. ${what}: ASCII out`, isAscii(r.code), r.code);
}

/* 3. the backslashes, read directly */
{
  const id = asciiOnly('"\\\u00e9"').code;
  check('3a. an identity escape loses its backslash: "\\é" is written "\\u00e9"', id === '"\\u00e9"', id);
  const both = asciiOnly('"\\\\\u00e9"').code;
  check('3b. an escaped backslash keeps both: "\\\\é" is written "\\\\\\u00e9"', both === '"\\\\\\u00e9"', both);
  const astral = asciiOnly('"\ud83c\udf89"');
  check('3c. an emoji is its two surrogates, two escapes', astral.code === '"\\ud83c\\udf89"' && astral.n === 2, astral);
}

/* 4b. the byte counter the spec's measurements use */
check('4b. nonAsciiBytes counts the UTF-8 bytes past ASCII', nonAsciiBytes(Buffer.from('a\u2013b\ud83c\udf89', 'utf8')) === 7 && nonAsciiBytes(Buffer.from('plain')) === 0);

/* 5. the wiring */
{
  const vc = readFileSync(join(ROOT, 'vite.config.js'), 'utf8');
  check('5a. vite.config.js asks esbuild for ASCII output', /esbuild:\s*\{\s*charset:\s*'ascii'\s*\}/.test(vc));
  check('5b. vite.config.js runs the net after the minifier (generateBundle, every chunk, asciiOnly)',
    /import \{ asciiOnly \} from '\.\/tools\/dev\/ascii-only\.mjs'/.test(vc)
    && /name:\s*'ascii-only-bundle'[\s\S]{0,200}apply:\s*'build'[\s\S]{0,120}generateBundle\(_, bundle\)[\s\S]{0,200}asciiOnly\(f\.code\)/.test(vc));
  const mm = readFileSync(join(ROOT, 'src/rendering/systems/wheelMinimap.js'), 'utf8');
  check('5c. the minimap\'s level band regex is written \\u2013', /\/Lv \\d\+\[\\u2013-\]\\d\+\/\.exec\(sub\)/.test(mm));
  /* every regular expression literal used as one in src/ (.exec, .test, or the
     first argument of replace, match, split, search), its characters ASCII */
  const RE = /(?:\.(?:replace|replaceAll|match|matchAll|split|search)\(\s*)\/((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\n\\[])+)\/[dgimsuyv]*|\/((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\n\\[])+)\/[dgimsuyv]*\.(?:exec|test)\(/g;
  const bad = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(m?js|jsx)$/.test(name)) continue;
      const src = readFileSync(p, 'utf8');
      if (isAscii(src)) continue;
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (isAscii(line)) return;
        for (const m of line.matchAll(RE)) {
          const body = m[1] || m[2] || '';
          if (!isAscii(body)) bad.push(`${p.slice(ROOT.length)}:${i + 1} /${body}/`);
        }
      });
    }
  };
  walk(join(ROOT, 'src'));
  check('5d. no regular expression in src/ is written with a character past ASCII (write \\uXXXX)', bad.length === 0, bad.slice(0, 8));
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nascii-only: all pass');
