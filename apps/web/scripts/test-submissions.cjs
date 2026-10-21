const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/submissions.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(output, context);
const { validSubmission, historyPage, accuracy } = context.exports;
const id = '10000000-0000-4000-8000-000000000001';
const record = { submissionId: id, setId: id, durationMs: 1000, isRetry: false,
  answers: [{ questionId: id, first: 'B' }] };
assert.equal(validSubmission(record), true);
for (const invalid of [null, {}, { ...record, answers: [] }, { ...record, durationMs: -1 },
  { ...record, durationMs: 86400001 }, { ...record, isRetry: 'false' },
  { ...record, answers: [{ questionId: id, first: 'E' }] },
  { ...record, answers: [record.answers[0], record.answers[0]] },
  { ...record, setId: 'bad' }, { ...record, answers: [{ questionId: id, first: null }] }]) {
  assert.equal(validSubmission(invalid), false);
}
assert.equal(historyPage('2'), 2);
for (const value of ['0', '-1', 'NaN', '1.5', '10001', undefined]) assert.equal(historyPage(value), 1);
assert.equal(accuracy(2, 3), '66.7%');
assert.equal(accuracy(0, 0), '0.0%');
console.log('PASS: submission validation, duplicates, duration bounds, pagination, accuracy.');
