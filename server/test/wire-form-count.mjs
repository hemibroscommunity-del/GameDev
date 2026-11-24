/* ═══ v2.3.6443: THE WIRE DOOR'S FORMS, COUNTED OVER A WHOLE RUN (card DG PR 4) ═══
 *
 * The card's "first as a count": every room of a run judges in count mode
 * (`wireform: 'count'`, unless a suite sets the flag itself) and what it
 * would refuse is written, by test file, type and field, with a few of the
 * values that met it.  A preload, so it reaches every room in the process
 * however the suite makes it (testroom.mjs or `new GameRoom` of its own),
 * and the bot lab's too (tools/qa/load/bot-lab.mjs: a real room in node):
 *
 *   cd server && BT_WIREFORM_COUNT=/tmp/forms.jsonl \
 *     NODE_OPTIONS="--import ./test/wire-form-count.mjs" npm test
 *
 * One JSON line a process that counted anything: { file, counts: { '<type>
 * <field>': n }, samples: { '<type> <field>': ['<value>', ...] } }.  Not a
 * suite (no `.test.`): run.mjs never runs it on its own.  Under it,
 * wire-form.test's refusals fail (they are what count mode does not do). */
import { appendFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';

const OUT = process.env.BT_WIREFORM_COUNT;
if (OUT) {
  const P = GameRoom.prototype;
  const mode = P._wireFormMode;
  const note = P._wireFormNote;
  const door = P._wireDoor;
  const counts = Object.create(null);
  const samples = Object.create(null);
  let last = null;
  P._wireFormMode = function () {
    const f = this._liveFlags;
    return f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'wireform') ? mode.call(this) : 'count';
  };
  P._wireDoor = function (session, msg, ws) { last = msg; return door.call(this, session, msg, ws); };
  P._wireFormNote = function (type, path, m) {
    const key = type + ' ' + path;
    counts[key] = (counts[key] || 0) + 1;
    const top = path.split('.')[0].replace('[]', '');
    const from = last && last.payload && typeof last.payload === 'object' && top in last.payload ? last.payload : last;
    const s = samples[key] || (samples[key] = []);
    if (s.length < 3) { try { s.push(String(JSON.stringify(from && from[top])).slice(0, 48)); } catch (e) { s.push('?'); } }
    return note.call(this, type, path, m);
  };
  process.on('exit', () => {
    if (!Object.keys(counts).length) return;
    try { appendFileSync(OUT, JSON.stringify({ file: String(process.argv[1] || '').split('/').pop(), counts, samples }) + '\n'); } catch (e) { /* the run stands */ }
  });
}
