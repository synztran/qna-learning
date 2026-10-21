import { accuracy, type AttemptSummary } from '@/lib/submissions';

export function AttemptInfo({ attempt }: { attempt: AttemptSummary }) {
  return <div className="space-y-2 text-sm">
    <h2 className="font-semibold">{attempt.set_title || 'Bộ đề trước đây'}</h2>
    <p className="text-base-content/70"><time dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time> · Giờ Việt Nam</p>
    <p className="tabular-nums">{attempt.correct_count}/{attempt.total_questions} câu đúng · {accuracy(attempt.correct_count, attempt.total_questions)} · {Number(attempt.score).toFixed(2)}/10 điểm</p>
    <p className="text-base-content/70">Thời gian: {Math.floor(attempt.duration_ms / 60000)} phút {Math.floor(attempt.duration_ms / 1000) % 60} giây</p>
    {attempt.is_retry && <p className="text-xs text-base-content/70">Làm lại câu sai · Không tính xếp hạng</p>}
    {!attempt.server_verified && <p className="text-xs text-base-content/70">Bài nộp cũ · Chỉ có kết quả tổng hợp, không tính xếp hạng</p>}
  </div>;
}
