import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { convertDocxBufferToQuizData } from '@qna/database/src/doc-converter';
import type { QuizRawData } from '@qna/types';

export function sourcePath(folder: string, fileName: string) {
  if (!fileName || path.basename(fileName) !== fileName || !/\.(json|docx)$/i.test(fileName)) {
    throw new Error('Tên nguồn không hợp lệ.');
  }
  return path.join(folder, fileName);
}

export async function readSource(folder: string, fileName: string) {
  const fullPath = sourcePath(folder, fileName);
  const buffer = await fs.readFile(fullPath);
  const version = createHash('sha256').update(buffer).digest('hex');
  let data: QuizRawData;
  if (/\.docx$/i.test(fileName)) {
    const result = await convertDocxBufferToQuizData(buffer, { fileName });
    if (!result.success || !result.data) throw new Error(result.error || 'Không thể đọc DOCX.');
    data = result.data;
  } else {
    data = JSON.parse(buffer.toString('utf8'));
  }
  if (!Array.isArray(data.lessons) || !Array.isArray(data.qs)) throw new Error('Nguồn không hợp lệ.');
  return { data, version };
}

export function validateSource(data: QuizRawData) {
  if (!data || !Array.isArray(data.lessons) || !Array.isArray(data.qs)) throw new Error('Nguồn không hợp lệ.');
  for (const q of data.qs) {
    if (!q.q?.trim() || !Number.isInteger(q.lesson) || q.lesson < 1 ||
      !Number.isInteger(q.n) || q.n < 1 || !['A', 'B', 'C', 'D'].includes(q.ans) ||
      !['A', 'B', 'C', 'D'].every(key => typeof q.opts?.[key] === 'string' && q.opts[key].trim())) {
      throw new Error('Mỗi câu cần nội dung, số bài/câu, đủ A–D và đáp án hợp lệ.');
    }
  }
}

export async function writeSource(folder: string, fileName: string, data: QuizRawData, version: string) {
  validateSource(data);
  const current = await readSource(folder, fileName);
  if (current.version !== version) throw new Error('Nguồn đã thay đổi. Vui lòng tải lại trước khi lưu.');
  const jsonFileName = fileName.replace(/\.docx$/i, '.json');
  const destination = sourcePath(folder, jsonFileName);
  const text = JSON.stringify(data, null, 2) + '\n';
  if (/\.docx$/i.test(fileName)) {
    // Never overwrite an existing edited JSON counterpart.
    await fs.writeFile(destination, text, { flag: 'wx' });
  } else {
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, text, { flag: 'wx' });
      await fs.rename(temporary, destination);
    } finally {
      await fs.unlink(temporary).catch(() => {});
    }
  }
  return { fileName: jsonFileName, version: createHash('sha256').update(text).digest('hex') };
}
