'use client';

import { useRef, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { HistoryModal } from './HistoryModal';
import { loadLeaderboard } from '@/app/actions/leaderboard';
import type { LeaderboardRow } from '@/lib/learning-records';

export function LearningActions() {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await loadLeaderboard();
      setRows(result.rows);
      setError(result.error || '');
    } catch {
      setError('Không thể tải bảng xếp hạng. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return <>
    <HistoryModal />
    <button type="button" aria-label="Xếp hạng" title="Xếp hạng" className="btn btn-ghost btn-circle btn-sm"
      onClick={() => { dialog.current?.showModal(); void load(); }}>
      <Trophy aria-hidden="true" className="h-4 w-4" />
    </button>
    <dialog ref={dialog} aria-labelledby="leaderboard-title" className="modal">
      <div className="modal-box w-[calc(100%-2rem)] max-w-md max-h-[80dvh] space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h2 id="leaderboard-title" className="font-display text-lg font-bold">Top 10 học viên</h2>
          <button type="button" autoFocus aria-label="Đóng xếp hạng" onClick={() => dialog.current?.close()} className="btn btn-ghost btn-circle btn-sm">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        <p className="text-xs leading-relaxed text-base-content/70">Xếp theo tỷ lệ đúng tích lũy, sau đó tổng số câu đã làm. Không tính bài nộp cũ chưa được máy chủ chấm hoặc lượt làm lại câu sai.</p>
        {loading ? <p role="status" className="text-sm">Đang tải xếp hạng…</p> : error ?
          <div className="space-y-3"><p role="alert" className="text-sm text-error">{error}</p><button type="button" onClick={() => void load()} className="btn btn-outline btn-sm">Thử lại</button></div> :
          rows.length === 0 ? <p className="text-sm">Chưa có kết quả đủ điều kiện xếp hạng.</p> :
          <ol className="divide-y divide-base-300">{rows.map(row => <li key={row.rank} className="flex items-center gap-3 py-3">
            <span className="w-7 shrink-0 text-sm font-bold tabular-nums text-primary">#{row.rank}</span>
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{row.display_name}</p><p className="text-xs tabular-nums text-base-content/70">{row.correct}/{row.total} câu đúng</p></div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{Number(row.accuracy).toFixed(1)}%</span>
          </li>)}</ol>}
      </div>
      <form method="dialog" className="modal-backdrop"><button aria-label="Đóng xếp hạng">Đóng</button></form>
    </dialog>
  </>;
}
