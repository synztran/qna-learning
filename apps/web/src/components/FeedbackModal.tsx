'use client';

import { useRef, useState } from 'react';
import { MessageSquarePlus, Bug, Sparkles, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { submitFeedback } from '@/app/actions/feedback';
import type { FeedbackType } from '@qna/types';

export function FeedbackModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<FeedbackType>('issue');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setContent('');
    setError('');
    setSuccess(false);
    setType('issue');
  };

  const handleOpen = () => {
    resetForm();
    dialog.current?.showModal();
  };

  const handleClose = () => {
    dialog.current?.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (content.trim().length < 5) {
      setError('Vui lòng nhập nội dung chi tiết hơn (tối thiểu 5 ký tự).');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('type', type);
    formData.append('content', content.trim());

    try {
      const res = await submitFeedback(formData);
      if (!res.success) {
        setError(res.error || 'Không thể gửi phản hồi.');
      } else {
        setSuccess(true);
        setContent('');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Góp ý hoặc báo lỗi"
        title="Góp ý & Báo lỗi"
        className="btn btn-ghost btn-circle btn-sm text-base-content/75 hover:text-primary"
        onClick={handleOpen}
      >
        <MessageSquarePlus aria-hidden="true" className="h-5 w-5" />
      </button>

      <dialog ref={dialog} aria-labelledby="feedback-dialog-title" className="modal">
        <div className="modal-box w-[calc(100%-2rem)] max-w-md space-y-4 rounded-3xl p-6">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <div>
                <h2 id="feedback-dialog-title" className="font-display text-base sm:text-lg font-bold">
                  Góp ý & Báo lỗi
                </h2>
                <p className="text-xs text-base-content/60">Gửi trực tiếp đến quản trị viên</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng"
              onClick={handleClose}
              className="btn btn-ghost btn-circle btn-sm"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-base text-base-content">Cảm ơn bạn đã phản hồi!</h3>
              <p className="text-xs text-base-content/70">
                Ý kiến của bạn đã được chuyển đến quản trị viên để xem xét và xử lý.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-primary btn-sm rounded-xl px-5 text-primary-content"
                >
                  Xong
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="alert alert-error text-xs py-2 px-3 rounded-2xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-base-200 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('issue')}
                  className={`btn btn-sm rounded-xl font-display text-xs border-0 gap-1.5 ${
                    type === 'issue'
                      ? 'bg-error text-error-content shadow-sm'
                      : 'btn-ghost text-base-content/70'
                  }`}
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Báo lỗi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('feature')}
                  className={`btn btn-sm rounded-xl font-display text-xs border-0 gap-1.5 ${
                    type === 'feature'
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'btn-ghost text-base-content/70'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Góp ý tính năng</span>
                </button>
              </div>

              {/* Content Textarea */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">
                    {type === 'issue' ? 'Mô tả chi tiết sự cố gặp phải' : 'Nội dung ý kiến hoặc đề xuất'}
                  </span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    type === 'issue'
                      ? 'Ví dụ: Câu 5 bài 2 đáp án C hiển thị bị lỗi font, hoặc khi ấn nộp bài bị treo...'
                      : 'Ví dụ: Nên thêm tính năng xem lại các câu làm sai sau khi kết thúc lượt thi...'
                  }
                  className="textarea textarea-bordered w-full rounded-2xl text-sm bg-base-100 focus:border-primary resize-none"
                  maxLength={2000}
                />
                <div className="label py-0.5 justify-end">
                  <span className="label-text-alt text-[10px] text-base-content/40">
                    {content.length}/2000
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost btn-sm rounded-xl"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || content.trim().length < 5}
                  className="btn btn-primary btn-sm rounded-xl px-5 text-primary-content font-display font-bold shadow-md shadow-primary/20"
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Gửi góp ý'}
                </button>
              </div>
            </form>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Đóng">Đóng</button>
        </form>
      </dialog>
    </>
  );
}
