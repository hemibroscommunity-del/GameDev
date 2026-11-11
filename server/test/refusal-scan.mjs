/* THE REFUSAL DOOR'S READER -- v2.3.4791 (refusal-door.test.mjs).
 *
 * Finds every place a handler of a phone's message stops early WITHOUT
 * putting a frame on any socket: a `return` (or, in the message switch
 * itself, a `break`) under a guard whose block sends nothing.  It reads the
 * room's own code as node loaded it (Function.prototype.toString on
 * GameRoom.prototype), so a mixin, a hoisted handler or a renamed file is
 * read where it really is.
 *
 * What counts as an answer, in the guard (its condition included) or the
 * exit's own expression:
 *   - a `.send(` on anything, or a `.close(` (a socket closed is an answer
 *     the phone acts on), or a room event (`this.eventBuffer.push`: the tick
 *     fans it out, the sender's own socket included);
 *   - a call to a room method that can send on SOME path: one whose code has
 *     a `.send(`, closed under calls (`_farmSend`, `_bankSend`, `_shopSend`,
 *     `_strikeRefused`, ...), plus `_resendPlayerState`;
 *   - a call to a local function of the handler that does one of those.
 * What does NOT: `_sendPlayerState` alone.  On protocol v2 it sends only the
 * fields that CHANGED since the last one, and a refusal changed nothing, so
 * it sends nothing at all (TRAPS §284, the bug this door exists for).  A
 * refusal snaps the phone back with `_resendPlayerState(ws, id, fields)`.
 *
 * It is a net, generous on purpose: a helper that sends on any path counts
 * as an answer, so a miss is possible and a false alarm is rare.  The
 * exits it finds are the bare ones -- `if (x) return;`. */

const CTL = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);

/* The code with every comment, string, template and regex blanked to the same
   length (so an offset in it is the same offset in the source), leaving only
   the structure to read. */
export function blank(src) {
  let out = '';
  let i = 0;
  let lastSig = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && c2 === '*') {
      out += '  '; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      out += '  '; i += 2; continue;
    }
    if (c === '"' || c === "'") {
      out += c; i++;
      while (i < n && src[i] !== c) { if (src[i] === '\\') { out += '  '; i += 2; continue; } out += src[i] === '\n' ? '\n' : 'x'; i++; }
      out += c; i++; lastSig = 'x'; continue;
    }
    if (c === '`') {
      out += '`'; i++;
      let depth = 0;
      while (i < n) {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        if (depth === 0 && src[i] === '`') break;
        if (src[i] === '$' && src[i + 1] === '{') { depth++; out += '  '; i += 2; continue; }
        if (depth > 0 && src[i] === '}') { depth--; out += ' '; i++; continue; }
        out += src[i] === '\n' ? '\n' : 'x'; i++;
      }
      out += '`'; i++; lastSig = 'x'; continue;
    }
    if (c === '/') {
      const prevWord = out.replace(/\s+$/, '').match(/[A-Za-z_$][\w$]*$/);
      const kwBefore = prevWord && /^(return|typeof|case|in|of|void|delete|throw|new|else|do)$/.test(prevWord[0]);
      if (lastSig === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(lastSig) || kwBefore) {
        out += '/'; i++;
        let cls = false;
        while (i < n && src[i] !== '\n') {
          if (src[i] === '\\') { out += '  '; i += 2; continue; }
          if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false;
          else if (src[i] === '/' && !cls) break;
          out += 'x'; i++;
        }
        out += '/'; i++; lastSig = 'x'; continue;
      }
    }
    out += c;
    if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  return out;
}

function wordBefore(s, i) {
  let j = i - 1; while (j >= 0 && /\s/.test(s[j])) j--;
  const e = j + 1; while (j >= 0 && /[\w$]/.test(s[j])) j--;
  return { word: s.slice(j + 1, e), at: j + 1 };
}
function prevNonSpace(s, i) { let j = i - 1; while (j >= 0 && /\s/.test(s[j])) j--; return j; }
function matchBack(s, close) {
  let d = 0;
  for (let j = close; j >= 0; j--) { if (s[j] === ')') d++; else if (s[j] === '(') { d--; if (d === 0) return j; } }
  return -1;
}
function matchFwd(s, open, a, b) {
  let d = 0;
  for (let j = open; j < s.length; j++) { if (s[j] === a) d++; else if (s[j] === b) { d--; if (d === 0) return j; } }
  return s.length;
}
function exprEnd(s, at) {
  let d = 0;
  for (let j = at; j < s.length; j++) {
    const c = s[j];
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) { if (d === 0) return j; d--; }
    else if (d === 0 && (c === ';' || c === ',' || c === '\n')) return j;
  }
  return s.length;
}
const isKw = (s, i, w) => s.startsWith(w, i) && !/[\w$]/.test(s[i - 1] || '') && !/[\w$]/.test(s[i + w.length] || '');

/* The room's methods (own and mixed in), their blanked code, and which of them
   can send. */
export function readRoom(GameRoom) {
  const P = GameRoom.prototype;
  const src = Object.create(null);
  for (const k of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    if (d && typeof d.value === 'function') src[k] = d.value.toString();
  }
  const bl = Object.create(null);
  for (const k in src) bl[k] = blank(src[k]);
  const senders = senderSet(bl);
  return { src, bl, senders };
}

/* the v2 delta: it sends nothing when nothing changed, so it is never an answer */
export const DELTA = new Set(['_sendPlayerState']);

export function senderSet(bl) {
  const senders = new Set(['_resendPlayerState']);
  for (const k in bl) if (!DELTA.has(k) && /\.send\s*\(|this\.eventBuffer\.push\s*\(/.test(bl[k])) senders.add(k);
  let grew = true;
  while (grew) {
    grew = false;
    for (const k in bl) {
      if (senders.has(k) || DELTA.has(k)) continue;
      for (const m of bl[k].matchAll(/this\.([\w$]+)\s*\(/g)) {
        if (senders.has(m[1])) { senders.add(k); grew = true; break; }
      }
    }
  }
  return senders;
}

function answers(text, senders, locals) {
  if (/\.send\s*\(/.test(text) || /\.close\s*\(/.test(text) || /this\.eventBuffer\.push\s*\(/.test(text)) return true;
  for (const m of text.matchAll(/this\.([\w$]+)\s*\(/g)) if (senders.has(m[1])) return true;
  /* a local answer called, or handed on to be called (`..., reply)`) */
  for (const m of text.matchAll(/(?<![\w$.])([\w$]+)(?![\w$])/g)) if (locals.has(m[1])) return true;
  return false;
}

function localSenders(s, senders) {
  const defs = [];
  for (const m of s.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\([^()]*\)|[\w$]+)\s*=>\s*/g)) {
    const at = m.index + m[0].length;
    defs.push({ name: m[1], body: s.slice(at, s[at] === '{' ? matchFwd(s, at, '{', '}') : exprEnd(s, at)) });
  }
  for (const m of s.matchAll(/function\s+([\w$]+)\s*\([^()]*\)\s*\{/g)) {
    const at = m.index + m[0].length - 1;
    defs.push({ name: m[1], body: s.slice(at, matchFwd(s, at, '{', '}')) });
  }
  const set = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of defs) if (!set.has(d.name) && answers(d.body, senders, set)) { set.add(d.name); grew = true; }
  }
  return set;
}

/* Every exit of one body that answers nothing.  `bl` is the blanked body,
   `raw` the source at the same offsets.  `base` is how many function frames
   make the body's top: 1 for a method (its own braces), 0 for a case of the
   switch, read on its own.  In a method a `break` only leaves a loop, so only
   a case's `break` is an exit.  `valueRule`: for a method whose RESULT the
   switch reads (an intercept returns the message to relay, or null to drop
   it), only an exit returning nothing, null or false is a drop. */
export function silentExits(bl, raw, base, senders, valueRule = false) {
  const locals = localSenders(bl, senders);
  const stack = [];
  const out = [];
  for (let i = 0; i < bl.length; i++) {
    const c = bl[i];
    if (c === '{') {
      const pj = prevNonSpace(bl, i);
      let kind = 'block', ctl = '', ctlAt = i;
      if (pj >= 1 && bl[pj] === '>' && bl[pj - 1] === '=') kind = 'fn';
      else if (pj >= 0 && bl[pj] === ')') {
        const w = wordBefore(bl, matchBack(bl, pj));
        if (CTL.has(w.word)) { ctl = w.word; ctlAt = w.at; } else kind = 'fn';
      } else {
        const w = wordBefore(bl, i);
        if (['else', 'try', 'finally', 'do'].includes(w.word)) { ctl = w.word; ctlAt = w.at; }
      }
      stack.push({ kind, ctl, at: i, ctlAt });
      continue;
    }
    if (c === '}') { stack.pop(); continue; }
    const kw = isKw(bl, i, 'return') ? 'return' : (base === 0 && isKw(bl, i, 'break')) ? 'break' : null;
    if (!kw) continue;
    let fns = 0, baseIdx = -1;
    for (let k = 0; k < stack.length; k++) if (stack[k].kind === 'fn') { fns++; if (fns === base) baseIdx = k; }
    if (fns > base) continue;                       /* a nested function's own return */
    const inner = stack.slice(baseIdx + 1);
    if (kw === 'break' && inner.some((f) => ['for', 'while', 'switch', 'do'].includes(f.ctl))) continue;
    let start = -1, guard = null;
    const pj = prevNonSpace(bl, i);
    if (pj >= 0 && bl[pj] === ')') {
      const w = wordBefore(bl, matchBack(bl, pj));
      if (w.word === 'if') { start = w.at; guard = raw.slice(w.at, pj + 1); }
    } else if (wordBefore(bl, i).word === 'else') { start = wordBefore(bl, i).at; guard = 'else'; }
    if (start < 0) {
      if (!inner.length) continue;                  /* unconditional, at the top: the handler's end */
      const f = inner[inner.length - 1];
      if (f.ctl === 'if') {
        start = f.ctlAt;
        guard = raw.slice(f.ctlAt, matchFwd(bl, bl.indexOf('(', f.ctlAt), '(', ')') + 1);
      } else {
        start = f.at;
        const nl = raw.indexOf('\n', i);
        guard = (f.ctl || 'block') + ' { ' + raw.slice(i, nl < 0 ? undefined : nl).trim();
      }
    }
    let e = i, d = 0;
    for (; e < bl.length; e++) {
      const ch = bl[e];
      if ('([{'.includes(ch)) d++;
      else if (')]}'.includes(ch)) { if (d === 0) break; d--; }
      else if (ch === ';' && d === 0) break;
    }
    if (valueRule && kw === 'return' && !/^(|null|false|undefined|void 0)$/.test(bl.slice(i + 6, e).trim())) continue;
    if (answers(bl.slice(start, e + 1), senders, locals)) continue;
    out.push({ kw, guard: guard.replace(/\s+/g, ' ').trim().slice(0, 160), line: raw.slice(0, i).split('\n').length });
  }
  return out;
}

/* The message switch of _onMessage, one segment per case (labels with no
   code between them share one), and the `default:` relay as its own. */
export function switchCases(room) {
  const bl = room.bl._onMessage, raw = room.src._onMessage;
  const sw = bl.indexOf('switch (msg.type)');
  const open = bl.indexOf('{', sw);
  const close = matchFwd(bl, open, '{', '}');
  /* labels at the switch's own depth only */
  const marks = [];
  let d = 0;
  for (let i = open; i < close; i++) {
    const c = bl[i];
    if (c === '{') d++; else if (c === '}') d--;
    else if (d === 1 && isKw(bl, i, 'case')) {
      const m = /^case\s+'([^']+)'\s*:/.exec(raw.slice(i));
      if (m) marks.push({ at: i, type: m[1], body: i + m[0].length });
    } else if (d === 1 && isKw(bl, i, 'default') && /^default\s*:/.test(bl.slice(i))) {
      marks.push({ at: i, type: '(default)', body: bl.indexOf(':', i) + 1 });
    }
  }
  const cases = [];
  for (let k = 0; k < marks.length; k++) {
    const end = k + 1 < marks.length ? marks[k + 1].at : close;
    const text = bl.slice(marks[k].body, end);
    const prev = cases[cases.length - 1];
    if (prev && !prev.bl.trim()) { prev.types.push(marks[k].type); prev.bl = text; prev.raw = raw.slice(marks[k].body, end); prev.at = marks[k].body; continue; }
    cases.push({ types: [marks[k].type], bl: text, raw: raw.slice(marks[k].body, end), at: marks[k].body });
  }
  return cases;
}

/* Where a method's line is on disk: `file:line` under server/src, for the
   failure message (the method's source is found whole in its file). */
export function locate(files, methodSrc, lineInMethod) {
  for (const [name, text] of files) {
    const at = text.indexOf(methodSrc);
    if (at >= 0) return name + ':' + (text.slice(0, at).split('\n').length + lineInMethod - 1);
  }
  return '?';
}

export const callsOf =(bl) => [...new Set([...bl.matchAll(/this\.(_[\w$]+)\s*\(/g)].map((m) => m[1]))];
