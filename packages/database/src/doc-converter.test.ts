import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { convertDocxBufferToQuizData, parseTextToQuizData } from './doc-converter';

const question = 'Câu 1. Chọn phương án đúng?\nA. Một\nB. Hai\nC. Ba\nD. Bốn';

test('missing answers fail instead of defaulting to A (including formatting-only answers)', () => {
  const result = parseTextToQuizData(question);
  assert.equal(result.success, false);
  assert.equal(result.data, undefined);
  assert.match(result.error!, /1/);
});

test('numbers in prose cannot supply an answer key', () => {
  assert.equal(parseTextToQuizData(question.replace('Một', 'Quy định 1B áp dụng')).success, false);
});

test('strict standalone keys and explicit key grids work', () => {
  for (const key of ['Câu 1: B - Mô tả', '1. B', 'ĐÁP ÁN\n1B']) {
    const result = parseTextToQuizData(`${question}\n${key}`);
    assert.equal(result.success, true);
    assert.equal(result.data!.qs[0].ans, 'B');
    assert.equal(result.data!.qs[0].opts.D, 'Bốn');
  }
});

test('conflicting keys, inline labels and starred answers fail', () => {
  for (const text of [
    `${question}\n1: A\n1: B`,
    `${question.replace('A. Một', '*A. Một')}\n1: B`,
    `${question}\nĐáp án: A\nĐáp án: B`,
  ]) assert.equal(parseTextToQuizData(text).success, false);
});

test('flattened DOCX table keys are parsed and checked against detailed keys', () => {
  const table = `${question}\nĐÁP ÁN BỘ ĐỀ\nCâu\nĐáp án\n1\nB`;
  const result = parseTextToQuizData(table);
  assert.equal(result.success, true);
  assert.equal(result.data!.qs[0].ans, 'B');
  assert.equal(result.data!.qs[0].opts.D, 'Bốn');
  assert.equal(parseTextToQuizData(`${table}\nĐáp án chi tiết đối chiếu:\nCâu 1: C - Mâu thuẫn`).success, false);
});

test('malformed and orphan answer keys fail safely', () => {
  assert.equal(parseTextToQuizData(`${question}\nĐáp án: Banana`).success, false);
  assert.equal(parseTextToQuizData(`${question}\n1: B\n2: A`).success, false);
});

test('multiline options, parenthesized labels and explanations retain text', () => {
  const result = parseTextToQuizData('Câu 1. Nội dung\ntiếp tục\n(A) Một\ndòng hai\n*(B) Hai\nGiải thích: Vì vậy\nthêm lý do');
  assert.equal(result.success, true);
  assert.equal(result.data!.qs[0].q, 'Nội dung tiếp tục');
  assert.equal(result.data!.qs[0].opts.A, 'Một dòng hai');
  assert.equal(result.data!.qs[0].ans, 'B');
  assert.equal(result.data!.qs[0].exp, 'Vì vậy thêm lý do');
});

test('invalid answer option and duplicate question numbers fail', () => {
  assert.equal(parseTextToQuizData('Câu 1. Nội dung\n*A.\nB. Hai').success, false);
  assert.equal(parseTextToQuizData(`${question}\n${question}\n1: B`).success, false);
});

test('supplied DOCX matches all 53 reference questions, options and answers', async () => {
  const docDir = new URL('../../../wrong_docx/', import.meta.url);
  const jsonDir = new URL('../../../correct_json/', import.meta.url);
  const doc = readdirSync(docDir).find(name => name.endsWith('.docx'))!;
  const json = readdirSync(jsonDir).find(name => name.endsWith('.json'))!;
  const reference = JSON.parse(readFileSync(new URL(json, jsonDir), 'utf8'));
  const result = await convertDocxBufferToQuizData(readFileSync(new URL(doc, docDir)));
  assert.equal(result.success, true, result.error);
  assert.equal(result.totalQuestions, 53);
  for (const [index, expected] of reference.qs.entries()) {
    const actual = result.data!.qs[index];
    for (const field of ['q', 'opts', 'ans', 'ansText'] as const) {
      assert.deepEqual(actual[field], expected[field], `Question ${index + 1}: ${field}`);
    }
  }
});
