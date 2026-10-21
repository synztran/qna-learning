'use client';

import React, { useState } from 'react';
import type { Question, UserProfile, OptionKey } from '@qna/types';
import {
  createStudentUser,
  toggleSoftBan,
  updateUserPassword,
  uploadQuestionsToStorageAndSync,
  seedDefaultSc5Data,
  saveQuestion,
  deleteQuestion,
} from '../app/actions/admin';
import { ThemeToggle } from '@qna/ui';
import {
  Users,
  Database,
  FileQuestion,
  Plus,
  Search,
  Lock,
  Key,
  Shield,
  ShieldAlert,
  Upload,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  BookOpen,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  initialUsers: UserProfile[];
  initialQuestions: Question[];
  hasEnv: boolean;
}

export function AdminDashboard({ initialUsers, initialQuestions, hasEnv }: AdminDashboardProps) {
  const [tab, setTab] = useState<'users' | 'upload' | 'questions'>('users');
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  // User Filter & Search
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Password Modal
  const [pwdModalUser, setPwdModalUser] = useState<UserProfile | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  // Upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Question Editor state
  const [qSearch, setQSearch] = useState('');
  const [qLessonFilter, setQLessonFilter] = useState<number | 'all'>('all');
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
  });

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchLesson = qLessonFilter === 'all' || q.lesson === qLessonFilter;
    const matchSearch =
      qSearch === '' ||
      q.q.toLowerCase().includes(qSearch.toLowerCase()) ||
      Object.values(q.opts).some((opt) => opt.toLowerCase().includes(qSearch.toLowerCase()));
    return matchLesson && matchSearch;
  });

  // Unique Lessons
  const lessonList = Array.from(new Set(questions.map((q) => q.lesson))).sort((a, b) => a - b);

  // Handler: Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);
    const fd = new FormData();
    fd.append('email', newEmail);
    fd.append('password', newPassword);
    fd.append('displayName', newDisplayName);
    fd.append('role', 'student');

    const res = await createStudentUser(fd);
    if (res.success && res.user) {
      setUsers((prev) => [
        {
          id: res.user.id,
          email: newEmail,
          displayName: newDisplayName || newEmail.split('@')[0],
          isBanned: false,
          role: 'student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowAddUserModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setUserActionMsg({ type: 'ok', text: `Tạo tài khoản ${newEmail} thành công!` });
    } else {
      setUserActionMsg({ type: 'err', text: res.error || 'Lỗi tạo tài khoản' });
    }
  };

  // Handler: Soft-ban toggle
  const handleToggleBan = async (user: UserProfile) => {
    const nextBan = !user.isBanned;
    const res = await toggleSoftBan(user.id, nextBan);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBanned: nextBan } : u))
      );
      setUserActionMsg({
        type: 'ok',
        text: `Đã ${nextBan ? 'tạm khóa (banned)' : 'mở khóa'} học viên ${user.email}`,
      });
    } else {
      setUserActionMsg({ type: 'err', text: res.error || 'Lỗi cập nhật' });
    }
  };

  // Handler: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdModalUser) return;
    const res = await updateUserPassword(pwdModalUser.id, resetPwdValue);
    if (res.success) {
      setUserActionMsg({ type: 'ok', text: `Đã đổi mật khẩu cho ${pwdModalUser.email} thành công!` });
      setPwdModalUser(null);
      setResetPwdValue('');
    } else {
      setUserActionMsg({ type: 'err', text: res.error || 'Lỗi đổi mật khẩu' });
    }
  };

  // Handler: Upload File
  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await uploadQuestionsToStorageAndSync(fd);
    setUploadLoading(false);
    if (res.success) {
      setUploadMsg({ type: 'ok', text: res.message || 'Đồng bộ câu hỏi thành công!' });
    } else {
      setUploadMsg({ type: 'err', text: res.error || 'Lỗi tải lên và đồng bộ' });
    }
  };

  // Handler: Seed Default
  const handleSeedDefault = async () => {
    if (!confirm('Bạn có muốn khởi tạo ngân hàng 90 câu mẫu SC5 - MĐ1 vào Supabase không?')) return;
    setUploadLoading(true);
    const res = await seedDefaultSc5Data();
    setUploadLoading(false);
    if (res.success) {
      setUploadMsg({ type: 'ok', text: `Đã nạp thành công 90 câu hỏi SC5 - MĐ1 vào database!` });
    } else {
      setUploadMsg({ type: 'err', text: res.error || 'Lỗi nạp dữ liệu' });
    }
  };

  // Handler: Save Edited Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    const res = await saveQuestion(editingQuestion);
    if (res.success) {
      if (editingQuestion.id) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? ({ ...q, ...editingQuestion } as Question) : q))
        );
      } else {
        setQuestions((prev) => [editingQuestion as Question, ...prev]);
      }
      setEditingQuestion(null);
    } else {
      alert('Lỗi lưu câu hỏi: ' + res.error);
    }
  };

  // Handler: Delete Question
  const handleDeleteQuestion = async (id?: string) => {
    if (!id || !confirm('Bạn chắc chắn muốn xóa câu hỏi này?')) return;
    const res = await deleteQuestion(id);
    if (res.success) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } else {
      alert('Lỗi xóa câu hỏi: ' + res.error);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-base-200/60 backdrop-blur-md border-b border-base-300 sticky top-0 z-30 px-4 sm:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg leading-tight">Admin Portal</h1>
              <span className="badge badge-primary badge-sm text-[10px] font-bold">Local Host</span>
            </div>
            <p className="text-[11px] text-base-content/60 font-medium">
              Quản lý học viên, Soft-ban & Ngân hàng câu hỏi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="tabs tabs-boxed bg-base-200/80 p-1.5 rounded-2xl inline-flex border border-base-300">
          <button
            onClick={() => setTab('users')}
            className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
              tab === 'users' ? 'tab-active !bg-primary !text-white' : ''
            }`}
          >
            <Users className="w-4 h-4" />
            Học viên & Soft-ban ({users.length})
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
              tab === 'upload' ? 'tab-active !bg-primary !text-white' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File & Storage
          </button>
          <button
            onClick={() => setTab('questions')}
            className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
              tab === 'questions' ? 'tab-active !bg-primary !text-white' : ''
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            Biên tập câu hỏi ({questions.length})
          </button>
        </div>

        {/* Notice if env is not configured yet */}
        {!hasEnv && (
          <div className="alert alert-warning text-xs rounded-2xl shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>
              Chưa tìm thấy <b>SUPABASE_SERVICE_ROLE_KEY</b> trong file <code>.env</code> của app Admin.
              Vui lòng cung cấp key vào <code>apps/admin/.env.local</code> để kết nối trực tiếp với Supabase.
            </span>
          </div>
        )}

        {/* Global Feedback Banner */}
        {userActionMsg && (
          <div
            className={`alert ${
              userActionMsg.type === 'ok' ? 'alert-success text-white' : 'alert-error text-white'
            } text-xs py-2.5 rounded-2xl shadow-sm flex items-center justify-between`}
          >
            <span>{userActionMsg.text}</span>
            <button onClick={() => setUserActionMsg(null)} className="btn btn-ghost btn-circle btn-xs">
              ✕
            </button>
          </div>
        )}

        {/* ==============================================================
            TAB 1: USERS & SOFT-BAN
            ============================================================== */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Tìm email hoặc tên học viên..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input input-sm input-bordered w-full pl-9 rounded-xl text-xs"
                />
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Thêm tài khoản học viên
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto bg-base-200/50 border border-base-300 rounded-3xl shadow-sm">
              <table className="table table-sm">
                <thead>
                  <tr className="border-b border-base-300 text-xs text-base-content/70">
                    <th>Học viên</th>
                    <th>Vai trò</th>
                    <th>Trạng thái (Soft-ban)</th>
                    <th>Ngày tạo</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-xs text-base-content/50">
                        Chưa có học viên nào hoặc không tìm thấy kết quả.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-base-100/50 border-b border-base-300/50 text-xs">
                        <td>
                          <div className="font-bold text-base-content">{u.displayName || '—'}</div>
                          <div className="text-[11px] text-base-content/60">{u.email}</div>
                        </td>
                        <td>
                          <span
                            className={`badge badge-xs font-semibold ${
                              u.role === 'admin' ? 'badge-primary text-white' : 'badge-ghost'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          {u.isBanned ? (
                            <span className="badge badge-error badge-sm text-white font-bold gap-1">
                              <ShieldAlert className="w-3 h-3" /> Tạm khóa (Banned)
                            </span>
                          ) : (
                            <span className="badge badge-success badge-sm text-white font-bold gap-1">
                              <CheckCircle className="w-3 h-3" /> Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="text-base-content/60 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="text-right space-x-2">
                          {/* Toggle Soft-ban button */}
                          <button
                            type="button"
                            onClick={() => handleToggleBan(u)}
                            className={`btn btn-xs rounded-xl font-display font-bold ${
                              u.isBanned ? 'btn-success text-white' : 'btn-outline btn-error'
                            }`}
                          >
                            {u.isBanned ? 'Mở khóa' : 'Tạm khóa'}
                          </button>

                          {/* Reset Password button */}
                          <button
                            type="button"
                            onClick={() => {
                              setPwdModalUser(u);
                              setResetPwdValue('');
                            }}
                            className="btn btn-xs btn-ghost border border-base-300 rounded-xl"
                            title="Đổi mật khẩu"
                          >
                            <Key className="w-3.5 h-3.5 mr-1" />
                            Đổi MK
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 2: UPLOAD & STORAGE SYNC
            ============================================================== */}
        {tab === 'upload' && (
          <div className="max-w-2xl space-y-6">
            <div className="card bg-base-200/50 border border-base-300 p-6 rounded-3xl shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-bold text-base">Tải lên file câu hỏi vào Storage</h3>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Lưu file trực tiếp vào Supabase Storage (bucket <code>quiz-files</code>) và tự động đồng bộ bài học & câu hỏi vào database.
                </p>
              </div>

              {uploadMsg && (
                <div
                  className={`alert ${
                    uploadMsg.type === 'ok' ? 'alert-success text-white' : 'alert-error text-white'
                  } text-xs py-2.5 rounded-2xl shadow-sm`}
                >
                  <span>{uploadMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs font-semibold">Tên bộ đề (Title)</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      defaultValue="SC5 - MĐ1"
                      required
                      className="input input-sm input-bordered bg-base-100 rounded-xl text-xs"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs font-semibold">Mã định danh (Slug)</span>
                    </label>
                    <input
                      type="text"
                      name="slug"
                      defaultValue="sc5-mon-md1"
                      required
                      className="input input-sm input-bordered bg-base-100 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs font-semibold">File JSON câu hỏi</span>
                  </label>
                  <input
                    type="file"
                    name="file"
                    accept=".json"
                    required
                    className="file-input file-input-bordered file-input-sm bg-base-100 rounded-xl text-xs w-full"
                  />
                  <label className="label py-1">
                    <span className="label-text-alt text-[11px] text-base-content/50">
                      Cấu trúc JSON chuẩn: <code>&#123; lessons: [...], qs: [...] &#125;</code>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm w-full"
                >
                  {uploadLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" />
                      Lưu vào Storage & Đồng bộ Database
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick 1-click default seed */}
            <div className="card bg-base-200/30 border border-dashed border-base-300 p-5 rounded-3xl flex flex-row items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-sm">Nạp sẵn bộ câu hỏi SC5 - MĐ1 gốc</h4>
                <p className="text-xs text-base-content/60">
                  Khởi tạo 90 câu trắc nghiệm chính thức từ tài liệu vào cơ sở dữ liệu Supabase chỉ với 1 click.
                </p>
              </div>
              <button
                type="button"
                disabled={uploadLoading}
                onClick={handleSeedDefault}
                className="btn btn-outline btn-sm rounded-xl font-display shrink-0 ml-4"
              >
                <Sparkles className="w-4 h-4 text-primary mr-1" />
                Nạp 90 câu mẫu
              </button>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 3: QUESTION EDITOR
            ============================================================== */}
        {tab === 'questions' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <input
                    type="text"
                    placeholder="Tìm nội dung câu hỏi..."
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    className="input input-sm input-bordered w-full pl-9 rounded-xl text-xs"
                  />
                </div>

                <select
                  value={qLessonFilter}
                  onChange={(e) =>
                    setQLessonFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
                  }
                  className="select select-sm select-bordered rounded-xl text-xs"
                >
                  <option value="all">Tất cả bài học</option>
                  {lessonList.map((num) => (
                    <option key={num} value={num}>
                      Bài {num}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingQuestion({
                    lesson: 1,
                    n: questions.length + 1,
                    q: '',
                    opts: { A: '', B: '', C: '', D: '' },
                    ans: 'A',
                    exp: '',
                    src: '',
                    isActive: true,
                  });
                  setIsEditingNew(true);
                }}
                className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Thêm câu hỏi mới
              </button>
            </div>

            {/* Questions Table / List */}
            <div className="space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-base-200/50 rounded-3xl border border-base-300 text-xs text-base-content/50">
                  Không tìm thấy câu hỏi nào phù hợp bộ lọc.
                </div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 bg-base-200/40 rounded-2xl border border-base-300 text-xs space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-primary">
                          Bài {q.lesson} · Câu {q.n}
                        </span>
                        <span className="badge badge-success badge-xs text-white font-bold">
                          Đáp án đúng: {q.ans}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsEditingNew(false);
                          }}
                          className="btn btn-ghost btn-circle btn-xs text-primary"
                          title="Sửa câu hỏi"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="btn btn-ghost btn-circle btn-xs text-error"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="font-semibold text-base-content text-sm select-text">{q.q}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
                      {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
                        <div
                          key={key}
                          className={`p-1.5 px-2.5 rounded-lg border flex items-center gap-2 ${
                            key === q.ans
                              ? 'bg-success/10 border-success/40 text-success-content font-bold'
                              : 'bg-base-100 border-base-300/60'
                          }`}
                        >
                          <span className="font-display font-bold w-4">{key}.</span>
                          <span className="truncate">{q.opts[key]}</span>
                        </div>
                      ))}
                    </div>

                    {q.exp && (
                      <div className="text-[11px] text-base-content/70 italic border-t border-base-300/60 pt-1.5">
                        <b>Giải thích:</b> {q.exp}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==============================================================
          MODAL: ADD STUDENT USER
          ============================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-base-100 rounded-3xl p-6 border border-base-300 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-base-300">
              <h3 className="font-display font-bold text-base">Thêm tài khoản học viên mới</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="btn btn-circle btn-xs btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Tên học viên</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="input input-sm input-bordered rounded-xl text-xs"
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Email đăng nhập *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="student1@studywithmsnhung.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input input-sm input-bordered rounded-xl text-xs"
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Mật khẩu ban đầu *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tối thiểu 6 ký tự..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input input-sm input-bordered rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="btn btn-ghost btn-sm flex-1 rounded-xl font-display"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex-1 rounded-xl font-display font-bold text-white shadow-sm"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: RESET PASSWORD
          ============================================================== */}
      {pwdModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-base-100 rounded-3xl p-6 border border-base-300 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-base-300">
              <h3 className="font-display font-bold text-base">Đổi mật khẩu học viên</h3>
              <button onClick={() => setPwdModalUser(null)} className="btn btn-circle btn-xs btn-ghost">
                ✕
              </button>
            </div>

            <p className="text-xs text-base-content/70">
              Cập nhật mật khẩu mới cho tài khoản: <b>{pwdModalUser.email}</b>
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Mật khẩu mới</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập mật khẩu mới..."
                  value={resetPwdValue}
                  onChange={(e) => setResetPwdValue(e.target.value)}
                  className="input input-sm input-bordered rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPwdModalUser(null)}
                  className="btn btn-ghost btn-sm flex-1 rounded-xl font-display"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex-1 rounded-xl font-display font-bold text-white"
                >
                  Lưu mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: EDIT QUESTION
          ============================================================== */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-base-100 rounded-3xl p-6 border border-base-300 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-base-300">
              <h3 className="font-display font-bold text-base">
                {isEditingNew ? 'Thêm câu hỏi mới' : 'Chỉnh sửa câu hỏi'}
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="btn btn-circle btn-xs btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs font-semibold">Bài số (Lesson)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingQuestion.lesson || 1}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, lesson: parseInt(e.target.value, 10) })
                    }
                    className="input input-sm input-bordered rounded-xl text-xs"
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs font-semibold">Số thứ tự câu (n)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingQuestion.n || 1}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, n: parseInt(e.target.value, 10) })
                    }
                    className="input input-sm input-bordered rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Nội dung câu hỏi *</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion.q || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, q: e.target.value })}
                  className="textarea textarea-bordered rounded-xl text-xs"
                  placeholder="Nhập đề bài câu hỏi trắc nghiệm..."
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="label py-0">
                  <span className="label-text text-xs font-semibold">4 Phương án & Đáp án đúng</span>
                </label>
                {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_ans"
                      checked={editingQuestion.ans === key}
                      onChange={() => setEditingQuestion({ ...editingQuestion, ans: key })}
                      className="radio radio-primary radio-sm"
                      title="Chọn làm đáp án đúng"
                    />
                    <span className="font-display font-bold text-xs w-4">{key}:</span>
                    <input
                      type="text"
                      required
                      value={editingQuestion.opts?.[key] || ''}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          opts: {
                            ...(editingQuestion.opts || { A: '', B: '', C: '', D: '' }),
                            [key]: e.target.value,
                          },
                        })
                      }
                      className="input input-sm input-bordered rounded-xl text-xs flex-1"
                      placeholder={`Nội dung phương án ${key}...`}
                    />
                  </div>
                ))}
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Lời giải thích chi tiết</span>
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.exp || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, exp: e.target.value })}
                  className="textarea textarea-bordered rounded-xl text-xs"
                  placeholder="Giải thích vì sao phương án trên đúng..."
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Nguồn trích dẫn (Document source)</span>
                </label>
                <input
                  type="text"
                  value={editingQuestion.src || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, src: e.target.value })}
                  className="input input-sm input-bordered rounded-xl text-xs"
                  placeholder="Ví dụ: ANSC 1.1, trang 15..."
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="btn btn-ghost btn-sm flex-1 rounded-xl font-display"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex-1 rounded-xl font-display font-bold text-white shadow-sm"
                >
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
