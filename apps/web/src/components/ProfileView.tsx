'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Lock, CheckCircle2, ShieldAlert, HeartHandshake, Sparkles } from 'lucide-react';
import { ThemeToggle, DonorBadge } from '@qna/ui';
import { getDonorTierByLevel, getDonorTierBySlug } from '@qna/types';
import { updatePassword } from '@/app/actions/auth';
import { LogoutButton } from './LogoutButton';

interface ProfileViewProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    userName?: string;
    donorLevel?: number;
    donorTier?: string | null;
    donorSince?: string | null;
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
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xl shadow-inner shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl truncate">{user.displayName}</h1>
                <DonorBadge level={user.donorLevel} tier={user.donorTier} compact />
              </div>
              <p className="text-xs text-base-content/60 truncate">@{user.userName || 'student'}</p>
            </div>
          </div>

          <div className="divider my-4"></div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-base-content/60">Tên đăng nhập</span>
              <span className="font-semibold text-base-content font-mono">{user.userName || 'Chưa thiết lập'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-base-content/60">Cấp bậc học viên</span>
              {user.donorLevel && user.donorLevel > 0 ? (
                <DonorBadge level={user.donorLevel} tier={user.donorTier} />
              ) : (
                <span className="font-medium text-base-content/80">Học viên tiêu chuẩn</span>
              )}
            </div>
          </div>
        </section>

        {/* Donor Recognition Card */}
        {user.donorLevel && user.donorLevel > 0 ? (() => {
          const config = getDonorTierBySlug(user.donorTier) || getDonorTierByLevel(user.donorLevel);
          if (!config) return null;
          return (
            <section className="card bg-gradient-to-br from-amber-500/10 via-base-200/80 to-base-200/50 backdrop-blur-sm border border-amber-500/30 shadow-md p-6 rounded-3xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-base-content">Huy hiệu Tri ân & Bảo trợ</h2>
                  <p className="text-xs text-base-content/70">Ghi nhận đóng góp cho cộng đồng học tập</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-base-100/70 border border-base-300/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-base-content/70">Danh hiệu vinh danh:</span>
                  <DonorBadge level={user.donorLevel} tier={user.donorTier} />
                </div>
                <p className="text-xs text-base-content/80 italic leading-relaxed">
                  &ldquo;{config.description}. Chân thành cảm ơn bạn đã đồng hành và tiếp sức cho nền tảng!&rdquo;
                </p>
                {user.donorSince && (
                  <p className="text-[11px] text-base-content/60 pt-1 border-t border-base-300/40">
                    Đồng hành từ ngày: {new Date(user.donorSince).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </section>
          );
        })() : null}

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
