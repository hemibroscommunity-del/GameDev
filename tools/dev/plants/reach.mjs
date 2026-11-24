// Reads reads.json (made by the REACH plant while wire-hostile ran) and says, for every socket `in` row,
// which of the fields its trust names any code read off the message AFTER the wire door, in the whole run.
import { readFileSync } from 'node:fs';
const ROOT = process.cwd().replace(/\/server$/, '') + '/server/src/';
const { WIRE_IN } = await import(ROOT + 'wire/in.js');
const R = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const reads = new Set(R.reads), seen = new Set(R.seen);
const SKIP = new Set(['type', 'payload', 'reqId']);
let rows = 0, rowsSeen = 0, fields = 0, fieldsRead = 0, rowsNoneRead = [], rowsPartial = [], rowsAll = 0, rowsNoFields = 0;
const unnamedRead = [];
for (const r of WIRE_IN) {
  if (r.wayIn && r.wayIn !== 'socket') continue;
  rows++;
  if (seen.has(r.name)) rowsSeen++;
  const named = [...new Set(Object.keys(r.trust || {}).map((k) => k.split('.')[0].replace(/\[\]$/, '')))].filter((k) => !SKIP.has(k));
  const got = named.filter((k) => reads.has(r.name + ' ' + k));
  fields += named.length; fieldsRead += got.length;
  if (!named.length) rowsNoFields++;
  else if (!got.length) rowsNoneRead.push(r.name + '(' + named.length + ')');
  else if (got.length < named.length) rowsPartial.push(r.name + ' ' + got.length + '/' + named.length + ' unread: ' + named.filter((k) => !got.includes(k)).join(','));
  else rowsAll++;
  const extra = [...reads].filter((x) => x.startsWith(r.name + ' ')).map((x) => x.slice(r.name.length + 1)).filter((k) => !SKIP.has(k) && !named.includes(k) && !/^(then|toJSON|constructor|length|valueOf|toString)$/.test(k));
  if (extra.length) unnamedRead.push(r.name + ': ' + extra.join(','));
}
console.log('socket in-rows ' + rows + '; reached the router past the door at least once: ' + rowsSeen);
console.log('fields the rows name (top level, less type/payload/reqId): ' + fields + '; read by ANY code after the door during the whole hostile run: ' + fieldsRead + ' (' + Math.round(100 * fieldsRead / fields) + '%)');
console.log('rows with no named field: ' + rowsNoFields + '; rows where EVERY named field was read: ' + rowsAll + '; SOME: ' + rowsPartial.length + '; NONE: ' + rowsNoneRead.length);
console.log('NONE read (the hostile values of these rows never met a line that reads them): ' + rowsNoneRead.join(' '));
console.log('SOME read:'); for (const x of rowsPartial) console.log('   ' + x);
console.log('fields READ that the row does not name (' + unnamedRead.length + ' rows):'); for (const x of unnamedRead) console.log('   ' + x);
