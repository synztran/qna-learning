'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';

export function InstallApp() {
  const [visible, setVisible] = useState(false);
  const [safari, setSafari] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const nav = navigator as Navigator & { standalone?: boolean };
    const ios = /iPad|iPhone|iPod/.test(nav.userAgent) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    setSafari(/Safari/.test(nav.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(nav.userAgent));
    const update = () => setVisible(ios && !nav.standalone && !displayMode.matches);
    update();
    displayMode.addEventListener('change', update);
    return () => displayMode.removeEventListener('change', update);
  }, []);

  if (!visible) return null;

  return (
    <details className="rounded-xl border border-base-300 bg-base-200/50 text-sm">
      <summary className="cursor-pointer p-3 font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-xl">
        <span className="inline-flex items-center gap-2"><Download aria-hidden="true" className="h-4 w-4" />Cài ứng dụng trên iPhone / iPad</span>
      </summary>
      <div className="px-4 pb-4 space-y-3 text-base-content">
        {!safari && <p>Mở trang này bằng Safari trước, rồi thực hiện các bước bên dưới.</p>}
        <ol className="list-decimal pl-5 space-y-2">
          <li>Trong Safari, mở menu và chọn <span className="inline-flex items-center gap-1 font-semibold"><Share aria-hidden="true" className="h-4 w-4" />Chia sẻ</span>.</li>
          <li>Cuộn xuống, chọn <span className="inline-flex items-center gap-1 font-semibold"><SquarePlus aria-hidden="true" className="h-4 w-4" />Thêm vào Màn hình chính</span>.</li>
          <li>Nếu có, bật <b>Mở dưới dạng ứng dụng web</b>, sau đó nhấn <b>Thêm</b>.</li>
        </ol>
        <p className="text-xs text-base-content/70">Mở biểu tượng QnA Learning trên Màn hình chính để học. Ứng dụng vẫn cần mạng để đăng nhập, tải bộ đề và lưu kết quả. iOS không cho trang web tự cài đặt bằng một lần nhấn.</p>
      </div>
    </details>
  );
}
