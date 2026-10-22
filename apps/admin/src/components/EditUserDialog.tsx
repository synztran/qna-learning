'use client';

import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '@qna/types';
import { updateStudentInformation } from '../app/actions/admin';

export function EditUserDialog({ user, onClose, onSaved }: {
  user: UserProfile;
  onClose: () => void;
  onSaved: (user: Pick<UserProfile, 'id' | 'email' | 'userName' | 'displayName'>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    data.set('id', user.id);
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await updateStudentInformation(data);
      if (result.success && result.updated) onSaved(result.updated);
      else setError(result.error || 'Không thể cập nhật tài khoản.');
    } catch {
      setError('Mất kết nối. Làm mới danh sách để kiểm tra trước khi thử lại.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return <dialog ref={dialog} className="modal" aria-labelledby="edit-user-title"
    onClose={onClose} onCancel={event => { if (saving) event.preventDefault(); }}>
    <form onSubmit={submit} className="modal-box max-w-md space-y-4">
      <h2 id="edit-user-title" className="font-display text-lg font-bold">Sửa thông tin học viên</h2>
      <fieldset disabled={saving} className="space-y-3">
        <label className="form-control gap-1 text-sm">Tên học viên
          <input autoFocus name="displayName" maxLength={100} defaultValue={user.displayName || ''} className="input input-bordered input-sm" />
        </label>
        <label className="form-control gap-1 text-sm">Tên đăng nhập *
          <input name="userName" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}"
            autoCapitalize="none" autoComplete="off" defaultValue={user.userName || ''} className="input input-bordered input-sm" />
        </label>
        <label className="form-control gap-1 text-sm">Email *
          <input name="email" type="email" required maxLength={254} defaultValue={user.email} className="input input-bordered input-sm" />
        </label>
        <p className="text-xs text-base-content/70">Vai trò: {user.role} (không thay đổi). Đổi email không thực hiện quy trình xác minh email mới.</p>
      </fieldset>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="modal-action">
        <button type="button" disabled={saving} onClick={() => dialog.current?.close()} className="btn btn-ghost btn-sm">Hủy</button>
        <button type="submit" disabled={saving} aria-busy={saving} className="btn btn-primary btn-sm">{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  </dialog>;
}
