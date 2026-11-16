/* opId conformance audit (v2.3.1203; spec:
 * docs/specs/conformance-audit.md).
 *
 * ARCHITECTURE-HANDOFF rule: every economy credit flows through
 * _creditPlayer (inbox.js), and its opId is the idempotency wall — a
 * DO restart or lazy-resolve retry re-runs the settlement code, and
 * only a DETERMINISTIC opId (same operation -> same id, e.g.
 * 'duelpot:' + duelId) makes the retry converge as 'dup' instead of
 * paying twice.  A random or missing opId compiles, tests green, and
 * double-pays in production on the first deploy-restart retry.  Until
 * now the convention was enforced by review memory; this audit makes
 * it mechanical, copying wire-audit.test.mjs's static-extraction
 * shape.
 *
 * Extraction: every `this._creditPlayer(` call site in server/src
 * (the definition in inbox.js is `async _creditPlayer(playerId, ...` —
 * no `this.` — so the call-site regex skips it naturally; test files
 * are outside src/ and not scanned).  For each site the audit reads a
 * short forward window (calls span lines: cadence.js/clans.js put the
 * entry object on following lines) and requires the first `opId:` in
 * it to open with a deterministic single-quoted literal prefix —
 * `opId: '<word>:...'` — i.e. a stable namespace string, optionally
 * concatenated with operation-identifying parts ('daily:' + playerId +
 * ':' + today).  Shorthand `opId,` / computed ids fail unless
 * allowlisted per file.
 *
 * If extraction ever collapses (helper renamed, calls wrapped), the
 * >=20 floor fails loudly instead of the audit rotting into a vacuous
 * pass (24 call sites at ship time).
 *
 * v2.3.5291 (card R, the sitting 20 review): `this._creditWith(` too --
 * the credit that carries its caller's own writes in one run (inbox.js,
 * storeoffer.js's offer, duel.js's pot with `xferescrow` on).  It is the
 * same idempotency wall, and a later edit of its opId passed this audit
 * unseen: a double-pay the audit exists to stop.  BREAK PROOF, tried by
 * hand 2026-11-15: duel.js's `_creditWith(winnerId, { opId: potId, ...`
 * (the opId a variable) -> FAIL 2, and gold-door.test FAIL 8.          */
import { readFileSync } from 'node:fs';
import { srcFiles } from './src-walk.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* Files whose _creditPlayer sites are DELIBERATELY exempt from the
 * literal-prefix rule.  Every entry needs a WHY; an entry whose file
 * no longer contains a non-conforming site must be deleted (checked
 * below). */
const OPID_ALLOWLIST = new Map([
  ['admin.js', 'operator-supplied opId from the admin HTTP request, logged in admin_log — the operator (or the admin:<uuid> fallback echoed back for retry) owns determinism, not a source literal'],
]);

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = srcFiles();   /* v2.3.5060: in depth, a folder's files too (src-walk.mjs) */

// A deterministic opId opens with a quoted namespace literal ending in
// (or containing) a colon: opId: 'duelpot:' + ...  /  opId: 'x:y'.
const RE_OPID_OK = /\bopId:\s*'[a-z0-9_]+:/;
const CALL_WINDOW = 8; // lines: covers the multi-line entry-object style

const sites = []; // { file, line, ok, snippet, via }
/* v2.3.5291: both credits, _creditPlayer and _creditWith */
const RE_CALL = /\bthis\._credit(Player|With)\(/;
for (const f of files) {
  const lines = readFileSync(join(srcDir, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const m = RE_CALL.exec(line);
    if (!m) return;
    const windowText = lines.slice(i, i + CALL_WINDOW).join('\n');
    // Judge only up to the NEXT call site so back-to-back credits
    // (market.js settle pair) can't lend each other their opId.
    const rest = windowText.slice(m.index + m[0].length);
    const next = RE_CALL.exec(rest);
    const scope = next ? rest.slice(0, next.index) : rest;
    sites.push({
      file: f, line: i + 1, via: '_credit' + m[1],
      ok: RE_OPID_OK.test(scope),
      snippet: line.trim().slice(0, 120),
    });
  });
}

// ── 1. regex-rot floor ──
check('extraction found a plausible _creditPlayer call-site population (>=20)', sites.length >= 20, sites.length);
/* v2.3.5291: and the _creditWith ones (storeoffer.js's offer, duel.js's pot) */
check('extraction found the _creditWith call sites (>=2)', sites.filter((s) => s.via === '_creditWith').length >= 2, sites.filter((s) => s.via === '_creditWith').map((s) => s.file + ':' + s.line));

// ── 2. THE audit: every credit carries a deterministic literal-prefix opId ──
{
  const bad = sites.filter((s) => !s.ok && !OPID_ALLOWLIST.has(s.file))
    .map((s) => ({ site: s.file + ':' + s.line, snippet: s.snippet }));
  check('every _creditPlayer and _creditWith call site carries opId: \'<namespace>:\'... (a deterministic literal prefix) — a missing/random opId DOUBLE-PAYS on the first deploy-restart retry; derive it from the operation\'s own ids',
    bad.length === 0, bad);
}

// ── 3. allowlist hygiene: each excused file still has a non-conforming site ──
{
  const stale = [...OPID_ALLOWLIST.keys()]
    .filter((f) => !sites.some((s) => s.file === f && !s.ok));
  check('no stale OPID_ALLOWLIST entries (each excused file still contains the non-literal site it documents)', stale.length === 0, stale);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
