'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallApp() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [safari, setSafari] = useState(false);
  const [android, setAndroid] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const nav = navigator as Navigator & { standalone?: boolean };
    const ios = /iPad|iPhone|iPod/.test(nav.userAgent) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(nav.userAgent);
    let installed = false;
    setAndroid(isAndroid);
    setSafari(/Safari/.test(nav.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(nav.userAgent));
    const update = () => setVisible((ios || isAndroid) && !installed && !nav.standalone && !displayMode.matches);
    const beforeInstall = (event: Event) => {
      if (!isAndroid) return;
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      installed = true;
      setInstallPrompt(null);
      update();
    };
    update();
    displayMode.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      displayMode.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt || installing) return;
    setInstalling(true);
    setInstallError('');
    // Each browser event can only be prompted once, including after dismissal.
    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setVisible(false);
    } catch {
      setInstallError('Không thể mở cửa sổ cài đặt. Hãy dùng menu Chrome theo hướng dẫn bên dưới.');
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  return <>
    <div className="flex justify-center">
      <button type="button" onClick={() => dialog.current?.showModal()}
        aria-label="Hướng dẫn cài ứng dụng" aria-haspopup="dialog" title="Cài ứng dụng"
        className="btn btn-ghost btn-circle btn-sm text-primary">
        <Download aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
    <dialog ref={dialog} className="modal" aria-labelledby="install-guide-title">
      <div className="modal-box max-w-md space-y-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 id="install-guide-title" className="font-display text-lg font-bold">
            {android ? 'Cài ứng dụng trên Android' : 'Cài ứng dụng trên iPhone / iPad'}
          </h2>
          <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Đóng hướng dẫn cài đặt"
            className="btn btn-ghost btn-circle btn-sm shrink-0"><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>
        {android ? <div className="space-y-3">
      {(installPrompt || installing) && (
        <button type="button" onClick={install} disabled={installing} aria-busy={installing}
          className="btn btn-ghost w-full justify-start gap-2 text-primary normal-case">
          <Download aria-hidden="true" className="h-4 w-4" />
          {installing ? 'Đang mở cài đặt…' : 'Cài ứng dụng trên Android'}
        </button>
      )}
      {installError && <p role="alert" className="px-4 pt-3 text-error">{installError}</p>}
        <div className="space-y-3 text-base-content">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Mở trang này bằng Chrome trên Android.</li>
            <li>Nhấn menu <b>⋮</b>, chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.</li>
            <li>Làm theo hướng dẫn của trình duyệt để xác nhận cài đặt.</li>
          </ol>
          <p className="text-xs text-base-content/70">Nếu chưa thấy tùy chọn cài đặt, hãy thử lại bằng Chrome ngoài trình duyệt trong ứng dụng. Ứng dụng vẫn cần mạng để đăng nhập, tải bộ đề và lưu kết quả.</p>
        </div>
        </div> : <div className="space-y-3 text-base-content">
        {!safari && <p>Mở trang này bằng Safari trước, rồi thực hiện các bước bên dưới.</p>}
        <ol className="list-decimal pl-5 space-y-2">
          <li>Trong Safari, mở menu và chọn <span className="inline-flex items-center gap-1 font-semibold"><Share aria-hidden="true" className="h-4 w-4" />Chia sẻ</span>.</li>
          <li>Cuộn xuống, chọn <span className="inline-flex items-center gap-1 font-semibold"><SquarePlus aria-hidden="true" className="h-4 w-4" />Thêm vào Màn hình chính</span>.</li>
          <li>Nếu có, bật <b>Mở dưới dạng ứng dụng web</b>, sau đó nhấn <b>Thêm</b>.</li>
        </ol>
        <p className="text-xs text-base-content/70">Mở biểu tượng QnA Learning trên Màn hình chính để học. Ứng dụng vẫn cần mạng để đăng nhập, tải bộ đề và lưu kết quả.</p>
        </div>}
        <div className="modal-action">
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-primary btn-sm">Đã hiểu</button>
        </div>
      </div>
    </dialog>
  </>;
}
