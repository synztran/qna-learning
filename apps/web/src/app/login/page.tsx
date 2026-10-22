'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from '../actions/auth';
import { ThemeToggle } from '@qna/ui';
import { InstallApp } from '@/components/InstallApp';
import { Lock, User, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    errorParam === 'banned'
      ? 'Tài khoản của bạn đã bị tạm khoá. Vui lòng liên hệ quản trị viên.'
      : errorParam === 'session_replaced'
        ? 'Tài khoản đã đăng nhập trên thiết bị khác hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.'
        : errorParam === 'session_unavailable'
          ? 'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.'
          : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    const res = await signIn(formData);
    if (res?.error) {
      setErrorMessage(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-200/60 backdrop-blur-sm border border-base-300 shadow-xl p-6 sm:p-8 rounded-3xl">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-3">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Đăng nhập ôn tập</h2>
        <p className="text-xs text-base-content/70 mt-1">
          Hệ thống dành riêng cho học viên đã được cấp tài khoản
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs py-2.5 px-3.5 mb-5 rounded-2xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text text-xs font-semibold">Tên đăng nhập hoặc email</span>
          </label>
          <label className="input input-bordered flex items-center gap-3 bg-base-100 rounded-2xl focus-within:border-primary">
            <User className="w-4 h-4 text-base-content/50" />
            <input
              type="text"
              required
              placeholder="student hoặc student@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="grow text-sm"
              autoCapitalize="none"
              autoComplete="username"
            />
          </label>
        </div>

        <div className="form-control">
          <label className="label py-1">
            <span className="label-text text-xs font-semibold">Mật khẩu</span>
          </label>
          <label className="input input-bordered flex items-center gap-3 bg-base-100 rounded-2xl focus-within:border-primary">
            <Lock className="w-4 h-4 text-base-content/50" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="grow text-sm"
              autoComplete="current-password"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full rounded-2xl mt-4 font-display font-bold shadow-md shadow-primary/20 text-primary-content"
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            'Vào bài ôn tập'
          )}
        </button>
      </form>
      <div className="mt-4"><InstallApp /></div>

      <div className="divider my-4 text-[11px] text-base-content/40">LƯU Ý</div>

      <div className="p-3 bg-base-100/70 rounded-2xl border border-base-300 text-[11px] text-base-content/70 leading-relaxed text-center">
        Học viên không cần đăng ký. Tài khoản và mật khẩu được tạo bởi giáo viên hoặc admin qua trang quản trị nội bộ.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      safe_top=""
      safe_bot=""
      className="min-h-[100dvh] flex flex-col justify-between items-center p-4 sm:p-6 bg-base-100"
    >
      {/* Top Header */}
      <div className="w-full max-w-md flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-tight">Phần mềm hỗ trợ học thuật</h1>
            <p className="text-[11px] text-base-content/60 font-medium">Study with QNA Learning</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md my-auto py-6">
        <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md text-center py-2 text-xs text-base-content/50">
        be your knowledge partner · Study With QNA Learning
      </footer>
    </div>
  );
}
