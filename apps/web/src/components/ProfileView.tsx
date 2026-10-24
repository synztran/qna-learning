'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@qna/ui';
import { updatePassword } from '@/app/actions/auth';
import { LogoutButton } from './LogoutButton';

interface ProfileViewProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    userName?: string;
  };
}

export function ProfileView({ user }: ProfileViewProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('oldPassword', oldPassword);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    try {
      const res = await updatePassword(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Không thể cập nhật mật khẩu. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-3 border-b border-base-300/80 pb-4">
        <Link
          href="/"
          className="btn btn-ghost btn-sm gap-2 rounded-xl text-base-content/80 hover:text-base-content"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại ôn tập</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-lg space-y-6">
        {/* Profile Info Card */}
        <section className="card bg-base-200/60 backdrop-blur-sm border border-base-300 shadow-md p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xl shadow-inner">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-xl truncate">{user.displayName}</h1>
              <p className="text-xs text-base-content/60 truncate">@{user.userName || 'student'}</p>
            </div>
          </div>

          <div className="divider my-4"></div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-base-content/60">Tên đăng nhập</span>
              <span className="font-semibold text-base-content font-mono">{user.userName || 'Chưa thiết lập'}</span>
            </div>
          </div>
        </section>

        {/* Password Update Card */}
        <section className="card bg-base-200/60 backdrop-blur-sm border border-base-300 shadow-md p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-base">Đổi mật khẩu nhanh</h2>
          </div>

          {error && (
            <div className="alert alert-error text-xs py-2.5 px-3.5 mb-4 rounded-2xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success text-xs py-2.5 px-3.5 mb-4 rounded-2xl flex items-center gap-2 text-success-content">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đã đổi mật khẩu thành công!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label htmlFor="old-password" className="label py-1">
                <span className="label-text text-xs font-semibold">Mật khẩu hiện tại</span>
              </label>
              <div className="input input-bordered flex items-center gap-3 bg-base-100 rounded-2xl focus-within:border-primary">
                <Lock aria-hidden="true" className="w-4 h-4 text-base-content/50" />
                <input id="old-password" type="password" required disabled={loading}
                  value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" className="grow text-sm" />
              </div>
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold">Mật khẩu mới</span>
              </label>
              <label className="input input-bordered flex items-center gap-3 bg-base-100 rounded-2xl focus-within:border-primary">
                <Lock className="w-4 h-4 text-base-content/50" />
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  disabled={loading}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="grow text-sm"
                  autoComplete="new-password"
                  minLength={6}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold">Xác nhận mật khẩu mới</span>
              </label>
              <label className="input input-bordered flex items-center gap-3 bg-base-100 rounded-2xl focus-within:border-primary">
                <Lock className="w-4 h-4 text-base-content/50" />
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  disabled={loading}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="grow text-sm"
                  autoComplete="new-password"
                  minLength={6}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full rounded-2xl mt-3 font-display font-bold shadow-md shadow-primary/20 text-primary-content"
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Lưu mật khẩu mới'}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
