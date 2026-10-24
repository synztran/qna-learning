'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, History, X } from 'lucide-react';
import { loadHistory, loadHistoryAttempt } from '@/app/actions/history';
import { AttemptInfo } from './AttemptInfo';
import type { AnswerSnapshot, AttemptSummary } from '@/lib/submissions';
import type { OptionKey } from '@qna/types';

type Detail = AttemptSummary & { answers: AnswerSnapshot[] | null };

export function HistoryModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef(0);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (nextPage: number, id: string | null = null) => {
    const token = ++request.current;
    setLoading(true);
    setError('');
    setDetail(null);
    setDetailId(id);
    setPage(nextPage);
    content.current?.scrollTo({ top: 0 });
    try {
      if (id) {
        const result = await loadHistoryAttempt(id);
        if (token !== request.current) return;
        setDetail(result.attempt);
        setError(result.error || (!result.attempt ? 'Không tìm thấy bài nộp.' : ''));
      } else {
        const result = await loadHistory(nextPage);
        if (token !== request.current) return;
        setAttempts(result.attempts);
        setHasNext(result.hasNext);
        setError(result.error || '');
      }
    } catch {
      if (token === request.current) setError('Không thể tải lịch sử. Kiểm tra kết nối và thử lại.');
    } finally {
      if (token === request.current) {
        setLoading(false);
        // Restore focus after replacing list/detail controls inside the dialog.
        heading.current?.focus();
      }
    }
  };

  return <>
    <button type="button" aria-label="Lịch sử làm bài" title="Lịch sử làm bài" className="btn btn-ghost btn-circle btn-xs"
      onClick={() => { dialog.current?.showModal(); void load(1); }}>
      <History aria-hidden="true" className="h-5 w-5" />
    </button>
    <dialog ref={dialog} aria-labelledby="history-title" className="modal" onClose={() => { request.current++; }}>
      <div ref={content} className="modal-box w-[calc(100%-2rem)] max-w-md max-h-[80dvh] space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h2 ref={heading} tabIndex={-1} id="history-title" className="font-display text-lg font-bold">{detailId ? 'Xem lại bài nộp' : 'Lịch sử làm bài'}</h2>
          <button type="button" autoFocus aria-label="Đóng lịch sử" onClick={() => dialog.current?.close()} className="btn btn-ghost btn-circle btn-sm">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        {detailId && <button type="button" onClick={() => void load(page)} className="btn btn-ghost btn-sm gap-2"><ArrowLeft aria-hidden="true" className="h-5 w-5" />Về danh sách</button>}
        {loading ? <p role="status" className="text-sm">Đang tải lịch sử…</p> : error ?
          <div className="space-y-3"><p role="alert" className="text-sm text-error">{error}</p><button type="button" onClick={() => void load(page, detailId)} className="btn btn-outline btn-sm">Thử lại</button></div> : detail ? <>
            <AttemptInfo attempt={detail} />
            {!detail.answers?.length ? <p className="text-sm">Bài nộp cũ chưa lưu chi tiết câu trả lời.</p> : <>
              <p className="text-xs leading-relaxed text-base-content/70">Kết quả tính theo câu trả lời đầu tiên. Nội dung được lưu tại thời điểm nộp bài.</p>
              <ol className="space-y-5">{detail.answers.map((answer, index) => <li key={answer.questionId} className="space-y-3 border-t border-base-300 pt-4">
                <h3 className="text-sm font-semibold">Câu {index + 1} · Bài {answer.lesson}</h3>
                <p className="text-sm whitespace-pre-wrap break-words">{answer.question}</p>
                <p className={`text-sm font-semibold ${answer.first === answer.correct ? 'text-primary' : 'text-error'}`}>
                  {answer.first === answer.correct ? 'Đúng' : 'Sai'} · Bạn chọn: {answer.first} · Đáp án đúng: {answer.correct}
                </p>
                <ul className="space-y-2">{(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => <li key={key}
                  className={`rounded-lg border p-3 text-sm whitespace-pre-wrap break-words ${key === answer.correct ? 'border-primary bg-primary/10' : 'border-base-300'}`}>
                  <b>{key}.</b> {answer.options[key]}{key === answer.first && <b> · Bạn chọn</b>}{key === answer.correct && <b> · Đáp án đúng</b>}
                </li>)}</ul>
                {answer.explanation && <p className="text-sm whitespace-pre-wrap break-words"><b>Giải thích:</b> {answer.explanation}</p>}
              </li>)}</ol>
            </>}
          </> : <>
            {attempts.length === 0 ? <p className="text-sm text-base-content/70">Chưa có bài nộp ở trang này. Hoàn thành và lưu bài làm để xem lịch sử.</p> :
              <ul className="divide-y divide-base-300">{attempts.map(attempt => <li key={attempt.id} className="py-4 first:pt-0 space-y-3">
                <AttemptInfo attempt={attempt} />
                <button type="button" onClick={() => void load(page, attempt.id)} className="btn btn-outline btn-sm">Xem bài nộp</button>
              </li>)}</ul>}
            <nav aria-label="Phân trang lịch sử" className="flex items-center justify-between gap-2 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => void load(page - 1)} className="btn btn-outline btn-sm">Trang trước</button>
              <span>Trang {page}</span>
              <button type="button" disabled={!hasNext || page >= 10000} onClick={() => void load(page + 1)} className="btn btn-outline btn-sm">Trang sau</button>
            </nav>
          </>}
      </div>
      <form method="dialog" className="modal-backdrop"><button aria-label="Đóng lịch sử">Đóng</button></form>
    </dialog>
  </>;
}
