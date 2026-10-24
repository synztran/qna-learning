'use client';

import { useId, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { setNavigationPending } from './NavigationOverlay';

export function LogoutButton({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (!submitting.current) dialog.current?.close();
  };

  const confirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    dialog.current?.close();
    setNavigationPending(true);
    try {
      await signOut();
    } catch {
      setNavigationPending(false);
      setError('Không thể đăng xuất. Vui lòng thử lại.');
      dialog.current?.showModal();
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return <>
    <button type="button" aria-label="Đăng xuất" title="Đăng xuất"
      onClick={() => { setError(''); dialog.current?.showModal(); }}
      className={`btn btn-ghost btn-circle ${size === 'xs' ? 'btn-xs' : 'btn-sm'} text-base-content/60 hover:text-error`}>
      <LogOut aria-hidden="true" className={size === 'xs' ? 'w-5 h-5' : 'w-4 h-4'} />
    </button>
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} className="modal"
      onCancel={event => { if (submitting.current) event.preventDefault(); }}>
      <div className="modal-box max-w-sm space-y-4" aria-busy={pending}>
        <h2 id={titleId} className="font-display text-lg font-bold">Đăng xuất?</h2>
        <p id={descriptionId} className="text-sm text-base-content/80">Bạn có chắc muốn đăng xuất khỏi tài khoản?</p>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="modal-action">
          <button type="button" autoFocus disabled={pending} onClick={close} className="btn btn-ghost">Hủy</button>
          <button type="button" disabled={pending} onClick={() => void confirm()} className="btn btn-error">
            {pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      </div>
      <div className="modal-backdrop"><button type="button" disabled={pending} onClick={close} aria-label="Hủy đăng xuất">Hủy</button></div>
    </dialog>
  </>;
}
