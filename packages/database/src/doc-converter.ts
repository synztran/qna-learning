import mammoth from 'mammoth';
import type { QuizRawData } from '@qna/types';

export interface ConvertDocOptions {
  fileName?: string;
  defaultTitle?: string;
  defaultLessonTitle?: string;
}

export interface ConvertDocResult {
  success: boolean;
  data?: QuizRawData;
  rawText?: string;
  totalQuestions: number;
  warnings: string[];
  error?: string;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50);
}

export async function convertDocxBufferToQuizData(
  buffer: Buffer,
  options: ConvertDocOptions = {}
): Promise<ConvertDocResult> {
  try {
    const mammothRes = await mammoth.extractRawText({ buffer });
    const rawText = mammothRes.value || '';
    return parseTextToQuizData(rawText, options);
  } catch (err: any) {
    return {
      success: false,
      totalQuestions: 0,
      warnings: [],
      error: `Lỗi đọc file DOCX: ${err.message}`,
    };
  }
}

export function parseTextToQuizData(
  text: string,
  options: ConvertDocOptions = {}
): ConvertDocResult {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      success: false,
      totalQuestions: 0,
      warnings: ['Tài liệu trống, không có nội dung.'],
      error: 'Tài liệu trống',
    };
  }

  // 1. Detect Title
  let docTitle = options.defaultTitle || '';
  if (!docTitle) {
    // Scan first 10 lines for title-like uppercase / header lines
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (/^(câu|\d+[\.:]|mã đề|họ và tên|thời gian|điểm|hướng dẫn)/i.test(line)) {
        continue;
      }
      if (line.length > 5 && line.length < 150) {
        docTitle = line.replace(/^[#\*\s\-_=]+|[#\*\s\-_=]+$/g, '').trim();
        break;
      }
    }
  }

  if (!docTitle) {
    docTitle = options.fileName
      ? options.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      : 'Bộ đề trắc nghiệm';
  }

  const slug = slugify(docTitle) || 'bo-de-trac-nghiem';

  // Only whole answer-key lines count; never search for answer-like fragments in prose.
  const errors: string[] = [];
  const keyLines = new Set<number>();
  const bottomAnswers = new Map<number, { ans: 'A' | 'B' | 'C' | 'D'; exp?: string }>();
  const addKey = (num: number, ans: 'A' | 'B' | 'C' | 'D', exp = '') => {
    const previous = bottomAnswers.get(num);
    if (previous && previous.ans !== ans) errors.push(`Câu ${num}: đáp án mâu thuẫn.`);
    bottomAnswers.set(num, { ans, exp: exp || previous?.exp });
  };

  // Check for lines like:
  // "Câu 1: A - giải thích..." or "Câu 1. A" or "1: A" or "1. A"
  let inKeySection = false;
  for (const [index, line] of lines.entries()) {
    if (/^(?:(?:BẢNG\s+)?ĐÁP ÁN(?:\s+(?:BỘ ĐỀ|VÀ GIẢI THÍCH|CHI TIẾT(?: ĐỐI CHIẾU)?))?|ANSWER KEY)\s*[:.]?$/i.test(line)) {
      inKeySection = true;
      keyLines.add(index);
      continue;
    }
    if (inKeySection) {
      keyLines.add(index);
      // Mammoth flattens table cells to separate lines: number, then answer.
      if (/^\d+$/.test(line) && /^[A-D]$/i.test(lines[index + 1] || '')) {
        addKey(Number(line), lines[index + 1].toUpperCase() as 'A' | 'B' | 'C' | 'D');
      }
    }
    const m = line.match(/^(?:Câu\s+)?(\d+)\s*[:\.]\s*([A-D])\s*(?:[-–—:]\s*(.*))?$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      const ans = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const exp = m[3] ? m[3].trim() : '';
      addKey(num, ans, exp);
      keyLines.add(index);
      continue;
    }

    // Grid answer table like "1.A  2.B  3.C  4.D" or "1A 2B 3C"
    // Compact grids require an explicit heading and must consume the entire line.
    if (!inKeySection || !/^(?:\d+\s*[.:\-–]?\s*[A-D](?:\s*[,;|]\s*|\s+|$))+$/i.test(line)) continue;
    keyLines.add(index);
    for (const gm of line.matchAll(/(\d+)\s*[.:\-–]?\s*([A-D])/gi)) {
      const num = parseInt(gm[1], 10);
      const ans = gm[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      addKey(num, ans);
    }
  }

  // 3. Scan Questions and Options
  interface TempQ {
    lesson: number;
    n: number;
    q: string;
    opts: Record<'A' | 'B' | 'C' | 'D', string>;
    ans?: 'A' | 'B' | 'C' | 'D';
    ansText?: string;
    exp: string;
    src?: string;
  }

  const questions: TempQ[] = [];
  let currentQ: TempQ | null = null;
  let currentLesson = 1;
  let continuation: 'question' | 'explanation' | 'none' | 'A' | 'B' | 'C' | 'D' = 'question';
  const seenNumbers = new Set<number>();
  const lessonTitles = new Map<number, string>();
  lessonTitles.set(1, options.defaultLessonTitle || `BÀI 1. ${docTitle.toUpperCase()}`);

  const finalizeCurrentQ = () => {
    if (!currentQ) return;
    const optKeys = (Object.keys(currentQ.opts) as ('A' | 'B' | 'C' | 'D')[]).filter(key => currentQ!.opts[key].trim());
    if (optKeys.length < 2) {
      errors.push(`Câu ${currentQ.n} có ít hơn 2 phương án trả lời.`);
    }

    // Fill ansText if not present
    if (!currentQ.ans) {
      errors.push(`Câu ${currentQ.n}: thiếu đáp án rõ ràng (không suy đoán từ định dạng DOCX).`);
    } else if (!currentQ.opts[currentQ.ans]?.trim()) {
      errors.push(`Câu ${currentQ.n}: đáp án trỏ đến phương án trống.`);
    } else {
      currentQ.ansText = currentQ.opts[currentQ.ans];
    }

    questions.push(currentQ);
    currentQ = null;
  };

  const setAnswer = (ans: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQ) return;
    if (currentQ.ans && currentQ.ans !== ans) errors.push(`Câu ${currentQ.n}: đáp án mâu thuẫn.`);
    currentQ.ans = ans;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (keyLines.has(i)) {
      continuation = 'none';
      continue;
    }

    // Detect Lesson header
    const lessonMatch = line.match(/^(?:BÀI|CHƯƠNG|PHẦN)\s+(\d+)[\.:\-–—]?\s*(.*)/i);
    if (lessonMatch) {
      finalizeCurrentQ();
      currentLesson = parseInt(lessonMatch[1], 10);
      const lTitle = lessonMatch[2] ? lessonMatch[2].trim() : `BÀI ${currentLesson}`;
      lessonTitles.set(currentLesson, `${lessonMatch[0].toUpperCase()}`);
      continue;
    }

    // Detect Question header: "Câu 1.", "Câu 1:", "1.", "1:"
    // Avoid mistaking bottom answers "Câu 1: A" as a question
    const isAnswerKeyLine = /^(?:Câu\s+)?\d+\s*[:\.]\s*[A-D](?:\s*[-–—:]|$)/i.test(line);
    const qMatch = !isAnswerKeyLine && line.match(/^(?:Câu\s+)?(\d+)\s*[\.:\-–—]\s*(.+)/i);

    if (qMatch && !/^[A-D]\s*[\.:]/i.test(line)) {
      finalizeCurrentQ();
      const qNum = parseInt(qMatch[1], 10);
      if (seenNumbers.has(qNum)) errors.push(`Câu ${qNum}: số câu bị trùng, không thể ghép đáp án an toàn.`);
      seenNumbers.add(qNum);
      const qText = qMatch[2].trim();

      const lookupAns = bottomAnswers.get(qNum);
      currentQ = {
        lesson: currentLesson,
        n: qNum,
        q: qText,
        opts: { A: '', B: '', C: '', D: '' },
        ans: lookupAns?.ans,
        exp: lookupAns?.exp || '',
        src: docTitle,
      };
      continuation = 'question';
      continue;
    }

    // Detect Option line: "A. ...", "B. ...", "C) ...", "*A. ...", "(A) ..."
    const optMatch = line.match(/^(\*)?\s*(?:\(([A-D])\)[.:]?|([A-D])[.:)\-–—])\s*(.*)$/i);
    if (optMatch && currentQ) {
      const isStarred = Boolean(optMatch[1]);
      const optKey = (optMatch[2] || optMatch[3]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const optVal = optMatch[4].trim();

      if (currentQ.opts[optKey]) errors.push(`Câu ${currentQ.n}: phương án ${optKey} bị trùng.`);
      currentQ.opts[optKey] = optVal;
      continuation = optKey;
      if (isStarred) {
        setAnswer(optKey);
      }
      continue;
    }

    // Inline explanation or answer label under question
    if (currentQ) {
      const ansLabelMatch = line.match(/^(?:Đáp án|Đ\/A|Answer)\s*[:\.]\s*([A-D])(?:\s*[-–—:]\s*(.*))?\s*$/i);
      if (ansLabelMatch) {
        setAnswer(ansLabelMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D');
        if (ansLabelMatch[2]) currentQ.exp = ansLabelMatch[2];
        continuation = ansLabelMatch[2] ? 'explanation' : 'none';
        continue;
      }

      const expLabelMatch = line.match(/^(?:Giải thích|Hướng dẫn|Exp)\s*[:\.]\s*(.+)/i);
      if (expLabelMatch) {
        currentQ.exp = expLabelMatch[1].trim();
        continuation = 'explanation';
        continue;
      }

      // If line is continuation of question text or previous option
      // If we don't have option A yet, append to question
      if (continuation === 'question') {
        currentQ.q += ' ' + line;
      } else if (continuation === 'explanation') {
        currentQ.exp += ' ' + line;
      } else if (continuation !== 'none') {
        currentQ.opts[continuation] += ' ' + line;
      }
    }
  }

  finalizeCurrentQ();

  for (const num of bottomAnswers.keys()) {
    if (!seenNumbers.has(num)) errors.push(`Đáp án câu ${num}: không tìm thấy câu hỏi tương ứng.`);
  }
  if (errors.length) return {
    success: false, totalQuestions: questions.length, rawText: text,
    warnings: [...warnings, ...errors],
    error: `Không thể chuyển đổi an toàn: ${errors.join(' ')}`,
  };

  if (questions.length === 0) {
    return {
      success: false,
      totalQuestions: 0,
      warnings,
      error: 'Không tìm thấy câu hỏi trắc nghiệm nào trong tài liệu.',
    };
  }

  // Deduplicate and re-index questions
  const sortedLessons = Array.from(lessonTitles.entries()).map(([num, title]) => ({
    n: num,
    title,
    src: docTitle,
  }));

  const resultData: QuizRawData = {
    title: docTitle,
    slug,
    lessons: sortedLessons,
    qs: questions.map((q, idx) => ({
      lesson: q.lesson,
      n: idx + 1,
      q: q.q,
      opts: q.opts,
      ans: q.ans!,
      ansText: q.ansText || q.opts[q.ans!] || '',
      exp: q.exp || '',
      src: q.src || docTitle,
    })),
  };

  return {
    success: true,
    data: resultData,
    rawText: text,
    totalQuestions: resultData.qs.length,
    warnings,
  };
}
