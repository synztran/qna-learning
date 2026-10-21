"use client";

import React, { useState } from "react";
import type { Question, UserProfile, OptionKey, Lesson, QuizRawData } from "@qna/types";
import {
	createStudentUser,
	toggleSoftBan,
	updateUserPassword,
	uploadQuestionsToStorageAndSync,
	seedDefaultSc5Data,
	saveQuestion,
	deleteQuestion,
	listQuestionSourcesFromFolder,
	buildSetFromFolderSource,
	setActiveQuizSet,
	previewFolderSource,
	listUsers,
	listQuestions,
	listQuestionSets,
	renameQuizSet,
	type AdminQuizSet,
	convertUploadedDocAction,
	type FolderQuestionSource,
} from "../app/actions/admin";
import { ThemeToggle } from "@qna/ui";
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
	FolderOpen,
	Eye,
	Check,
	FolderSync,
	FileText,
	Download,
	AlertTriangle,
	FileCode,
} from "lucide-react";

interface AdminDashboardProps {
	initialUsers: UserProfile[];
	initialQuestions: Question[];
	initialSets: AdminQuizSet[];
	initialFolderSources: FolderQuestionSource[];
	initialFolderPath: string;
	hasEnv: boolean;
}

export function AdminDashboard({
	initialUsers,
	initialQuestions,
	initialSets,
	initialFolderSources,
	initialFolderPath,
	hasEnv,
}: AdminDashboardProps) {
	const [tab, setTab] = useState<
		"users" | "folderSources" | "converter" | "upload" | "questions"
	>("folderSources");
	const [users, setUsers] = useState<UserProfile[]>(initialUsers);
	const [questions, setQuestions] = useState<Question[]>(initialQuestions);
	const [sets, setSets] = useState(initialSets);
	const [questionsLoading, setQuestionsLoading] = useState(false);
	const [qSetFilter, setQSetFilter] = useState('all');
	const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
	const [setTitleDraft, setSetTitleDraft] = useState('');
	const [renameLoading, setRenameLoading] = useState(false);
	const [renameError, setRenameError] = useState('');

	// Folder Sources State
	const [folderPath, setFolderPath] = useState(initialFolderPath);
	const [folderSources, setFolderSources] =
		useState<FolderQuestionSource[]>(initialFolderSources);
	const [folderLoading, setFolderLoading] = useState(false);
	const [previewData, setPreviewData] = useState<{
		fileName: string;
		lessons: Lesson[];
		questions: Question[];
	} | null>(null);

	// Converter Tool State
	const [converterFile, setConverterFile] = useState<File | null>(null);
	const [converting, setConverting] = useState(false);
	const [convertedResult, setConvertedResult] = useState<QuizRawData | null>(null);
	const [converterMsg, setConverterMsg] = useState<{
		type: "ok" | "err";
		text: string;
	} | null>(null);
	const [converterWarnings, setConverterWarnings] = useState<string[]>([]);
	const [userLoading, setUserLoading] = useState(false);

	// User Filter & Search
	const [userSearch, setUserSearch] = useState("");
	const [showAddUserModal, setShowAddUserModal] = useState(false);
	const [newEmail, setNewEmail] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newDisplayName, setNewDisplayName] = useState("");
	const [userActionMsg, setUserActionMsg] = useState<{
		type: "ok" | "err";
		text: string;
	} | null>(null);

	// Password Modal
	const [pwdModalUser, setPwdModalUser] = useState<UserProfile | null>(null);
	const [resetPwdValue, setResetPwdValue] = useState("");

	// Upload state
	const [uploadLoading, setUploadLoading] = useState(false);
	const [uploadMsg, setUploadMsg] = useState<{
		type: "ok" | "err";
		text: string;
	} | null>(null);

	// Question Editor state
	const [qSearch, setQSearch] = useState("");
	const [qLessonFilter, setQLessonFilter] = useState<number | "all">("all");
	const [editingQuestion, setEditingQuestion] =
		useState<Partial<Question> | null>(null);
	const [isEditingNew, setIsEditingNew] = useState(false);

	// Filtered Users
	const filteredUsers = users.filter((u) => {
		const q = userSearch.toLowerCase();
		return (
			u.email.toLowerCase().includes(q) ||
			(u.displayName || "").toLowerCase().includes(q)
		);
	});

	// Filtered Questions
	const activeSets = sets.filter(set => set.isActive);
	const activeQuestions = questions.filter(q => q.setId
		? activeSets.some(set => set.id === q.setId)
		: !hasEnv);
	const filteredQuestions = activeQuestions.filter((q) => {
		const matchLesson =
			qLessonFilter === "all" || q.lesson === qLessonFilter;
		const matchSearch =
			qSearch === "" ||
			q.q.toLowerCase().includes(qSearch.toLowerCase()) ||
			Object.values(q.opts).some((opt) =>
				opt.toLowerCase().includes(qSearch.toLowerCase()),
			);
		return matchLesson && matchSearch && (qSetFilter === 'all' || q.setId === qSetFilter);
	});

	// Unique Lessons
	const lessonList = Array.from(new Set(activeQuestions.filter(q => qSetFilter === 'all' || q.setId === qSetFilter).map((q) => q.lesson))).sort(
		(a, b) => a - b,
	);

	// Handler: Add User
	const handleAddUser = async (e: React.FormEvent) => {
		e.preventDefault();
		setUserActionMsg(null);
		const fd = new FormData();
		fd.append("email", newEmail);
		fd.append("password", newPassword);
		fd.append("displayName", newDisplayName);
		fd.append("role", "student");

		const res = await createStudentUser(fd);
		if (res.success && res.user) {
			setUsers((prev) => [
				{
					id: res.user.id,
					email: newEmail,
					displayName: newDisplayName || newEmail.split("@")[0],
					isBanned: false,
					role: "student",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				...prev,
			]);
			setShowAddUserModal(false);
			setNewEmail("");
			setNewPassword("");
			setNewDisplayName("");
			setUserActionMsg({
				type: "ok",
				text: `Tạo tài khoản ${newEmail} thành công!`,
			});
		} else {
			setUserActionMsg({
				type: "err",
				text: res.error || "Lỗi tạo tài khoản",
			});
		}
	};

	// Handler: Soft-ban toggle
	const handleToggleBan = async (user: UserProfile) => {
		const nextBan = !user.isBanned;
		const res = await toggleSoftBan(user.id, nextBan);
		if (res.success) {
			setUsers((prev) =>
				prev.map((u) =>
					u.id === user.id ? { ...u, isBanned: nextBan } : u,
				),
			);
			setUserActionMsg({
				type: "ok",
				text: `Đã ${nextBan ? "tạm khóa (banned)" : "mở khóa"} học viên ${user.email}`,
			});
		} else {
			setUserActionMsg({
				type: "err",
				text: res.error || "Lỗi cập nhật",
			});
		}
	};

	// Handler: Update Password
	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!pwdModalUser) return;
		const res = await updateUserPassword(pwdModalUser.id, resetPwdValue);
		if (res.success) {
			setUserActionMsg({
				type: "ok",
				text: `Đã đổi mật khẩu cho ${pwdModalUser.email} thành công!`,
			});
			setPwdModalUser(null);
			setResetPwdValue("");
		} else {
			setUserActionMsg({
				type: "err",
				text: res.error || "Lỗi đổi mật khẩu",
			});
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
			setUploadMsg({
				type: "ok",
				text: res.message || "Đồng bộ câu hỏi thành công!",
			});
		} else {
			setUploadMsg({
				type: "err",
				text: res.error || "Lỗi tải lên và đồng bộ",
			});
		}
	};

	// Handler: Seed Default
	const handleSeedDefault = async () => {
		if (
			!confirm(
				"Bạn có muốn khởi tạo ngân hàng 90 câu mẫu QNA Learning vào Supabase không?",
			)
		)
			return;
		setUploadLoading(true);
		const res = await seedDefaultSc5Data();
		setUploadLoading(false);
		if (res.success) {
			setUploadMsg({
				type: "ok",
				text: `Đã nạp thành công 90 câu hỏi QNA Learning vào database!`,
			});
		} else {
			setUploadMsg({ type: "err", text: res.error || "Lỗi nạp dữ liệu" });
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
					prev.map((q) =>
						q.id === editingQuestion.id
							? ({ ...q, ...editingQuestion } as Question)
							: q,
					),
				);
			} else {
				setQuestions((prev) => [editingQuestion as Question, ...prev]);
			}
			setEditingQuestion(null);
		} else {
			alert("Lỗi lưu câu hỏi: " + res.error);
		}
	};

	// Handler: Delete Question
	const handleDeleteQuestion = async (id?: string) => {
		if (!id || !confirm("Bạn chắc chắn muốn xóa câu hỏi này?")) return;
		const res = await deleteQuestion(id);
		if (res.success) {
			setQuestions((prev) => prev.filter((q) => q.id !== id));
		} else {
			alert("Lỗi xóa câu hỏi: " + res.error);
		}
	};

	// Handler: Scan Folder
	const handleScanFolder = async () => {
		setFolderLoading(true);
		const res = await listQuestionSourcesFromFolder(folderPath);
		setFolderLoading(false);
		if (res.error) {
			setUserActionMsg({ type: "err", text: res.error });
		} else {
			setFolderSources(res.sources);
			setFolderPath(res.folderPath);
			setUserActionMsg({
				type: "ok",
				text: `Đã quét thấy ${res.sources.length} file nguồn câu hỏi!`,
			});
		}
	};

	// Handler: Build Set from Folder Source
	const handleBuildFolderSet = async (fileName: string) => {
		setFolderLoading(true);
		const res = await buildSetFromFolderSource(fileName, folderPath);
		setFolderLoading(false);
		if (res.success) {
			setUserActionMsg({
				type: "ok",
				text: res.message || "Build bộ đề thành công!",
			});
			const scanRes = await listQuestionSourcesFromFolder(folderPath);
			if (scanRes.sources) setFolderSources(scanRes.sources);
		} else {
			setUserActionMsg({
				type: "err",
				text: res.error || "Lỗi build bộ đề",
			});
		}
	};

	// Handler: Set Active Set for Students
	const handleSetActive = async (setId: string, title: string, isActive: boolean) => {
		setFolderLoading(true);
		const res = await setActiveQuizSet(setId, isActive);
		setFolderLoading(false);
		if (res.success) {
			setUserActionMsg({
				type: "ok",
				text: `Đã ${isActive ? 'kích hoạt' : 'tạm ẩn'} bộ đề "${title}".`,
			});
			const scanRes = await listQuestionSourcesFromFolder(folderPath);
			if (scanRes.sources) setFolderSources(scanRes.sources);
			setSets(previous => previous.map(set => set.id === setId ? { ...set, isActive } : set));
		} else {
			setUserActionMsg({
				type: "err",
				text: res.error || "Lỗi kích hoạt bộ đề",
			});
		}
	};

	const handleRenameSet = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!renamingSetId || renameLoading) return;
		setRenameLoading(true);
		setRenameError('');
		try {
			const result = await renameQuizSet(renamingSetId, setTitleDraft);
			if (!result.success || !result.title) {
				setRenameError(result.error || 'Không thể đổi tên bộ đề.');
				return;
			}
			setSets(previous => previous.map(set => set.id === renamingSetId ? { ...set, title: result.title! } : set));
			setRenamingSetId(null);
			setUserActionMsg({ type: 'ok', text: `Đã đổi tên bộ đề thành "${result.title}".` });
		} catch {
			setRenameError('Không thể đổi tên bộ đề. Kiểm tra kết nối và thử lại.');
		} finally {
			setRenameLoading(false);
		}
	};

	const handleRefreshQuestions = async () => {
		setQuestionsLoading(true);
		try {
			const [questionResult, setResult, sourceResult] = await Promise.all([
				listQuestions(), listQuestionSets(), listQuestionSourcesFromFolder(folderPath),
			]);
			if (questionResult.error || setResult.error || sourceResult.error) {
				throw new Error(questionResult.error || setResult.error || sourceResult.error);
			}
			setQuestions(questionResult.questions);
			setSets(setResult.sets);
			setFolderSources(sourceResult.sources);
			setQLessonFilter('all');
			if (!setResult.sets.some(set => set.id === qSetFilter)) setQSetFilter('all');
			setUserActionMsg({ type: 'ok', text: `Đã tải ${setResult.sets.length} bộ đề, ${questionResult.questions.length} câu hỏi từ Supabase.` });
		} catch (error) {
			setUserActionMsg({ type: 'err', text: error instanceof Error ? error.message : 'Không thể tải câu hỏi.' });
		} finally {
			setQuestionsLoading(false);
		}
	};

	// Handler: Preview Source
	const handlePreview = async (fileName: string) => {
		setFolderLoading(true);
		const res = await previewFolderSource(fileName, folderPath);
		setFolderLoading(false);
		if (res.success && res.lessons && res.questions) {
			setPreviewData({
				fileName,
				lessons: res.lessons,
				questions: res.questions,
			});
		} else {
			setUserActionMsg({
				type: "err",
				text: res.error || "Lỗi đọc file xem trước",
			});
		}
	};

	// Handler: Convert Doc Tool
	const handleConvertDoc = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!converterFile) return;
		setConverting(true);
		setConverterMsg(null);
		setConverterWarnings([]);
		setConvertedResult(null);

		const fd = new FormData();
		fd.append("file", converterFile);
		fd.append("folderPath", folderPath);

		try {
		const res = await convertUploadedDocAction(fd);
		if (res.success && res.data) {
			setConvertedResult(res.data);
			setConverterWarnings(res.warnings || []);
			setConverterMsg({
				type: "ok",
				text: `Chuyển đổi thành công! Trích xuất được ${res.totalQuestions} câu hỏi và đã tự động lưu file JSON.`,
			});
			await handleScanFolder();
		} else {
			setConverterMsg({
				type: "err",
				text: res.error || "Không thể chuyển đổi tài liệu",
			});
			if (res.warnings?.length) {
				setConverterWarnings(res.warnings);
			}
		}
		} catch (error) {
			setConverterMsg({ type: "err", text: error instanceof Error ? error.message : "Không thể chuyển đổi tài liệu. Vui lòng thử lại." });
		} finally {
			setConverting(false);
		}
	};

	// Handler: Download JSON
	const handleDownloadJson = () => {
		if (!convertedResult) return;
		const blob = new Blob([JSON.stringify(convertedResult, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${convertedResult.slug || "question_source"}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Handler: Refresh Users from Auth & Database
	const handleRefreshUsers = async () => {
		setUserLoading(true);
		setUserActionMsg(null);
		const res = await listUsers();
		setUserLoading(false);
		if (res.users) {
			setUsers(res.users);
			setUserActionMsg({
				type: "ok",
				text: `Đã làm mới danh sách: ${res.users.length} học viên từ hệ thống.`,
			});
		} else if (res.error) {
			setUserActionMsg({
				type: "err",
				text: res.error,
			});
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
							<h1 className="font-display font-bold text-lg leading-tight">
								Admin Portal
							</h1>
							<span className="badge badge-primary badge-sm text-[10px] font-bold">
								Local Host
							</span>
						</div>
						<p className="text-[11px] text-base-content/60 font-medium">
							Quản lý học viên & Ngân hàng câu hỏi
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
				<div className="tabs tabs-boxed bg-base-200/80 p-1.5 rounded-2xl inline-flex flex-wrap gap-1 border border-base-300">
					<button
						onClick={() => setTab("folderSources")}
						className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
							tab === "folderSources"
								? "tab-active !bg-primary !text-white"
								: ""
						}`}>
						<FolderOpen className="w-4 h-4" />
						Nguồn đề từ Thư mục ({folderSources.length})
					</button>
					<button
						onClick={() => setTab("converter")}
						className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
							tab === "converter"
								? "tab-active !bg-primary !text-white"
								: ""
						}`}>
						<FileText className="w-4 h-4" />
						Chuyển đổi Docs sang Bộ đề
					</button>
					<button
						onClick={() => setTab("users")}
						className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
							tab === "users"
								? "tab-active !bg-primary !text-white"
								: ""
						}`}>
						<Users className="w-4 h-4" />
						Học viên ({users.length})
					</button>
					<button
						onClick={() => setTab("upload")}
						className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
							tab === "upload"
								? "tab-active !bg-primary !text-white"
								: ""
						}`}>
						<Upload className="w-4 h-4" />
						Upload File Storage
					</button>
					<button
						onClick={() => setTab("questions")}
						className={`tab gap-2 text-xs font-display font-bold rounded-xl transition-all ${
							tab === "questions"
								? "tab-active !bg-primary !text-white"
								: ""
						}`}>
						<FileQuestion className="w-4 h-4" />
						Biên tập câu hỏi ({activeQuestions.length})
					</button>
				</div>

				{/* Notice if env is not configured yet */}
				{!hasEnv && (
					<div className="alert alert-warning text-xs rounded-2xl shadow-sm">
						<ShieldAlert className="w-4 h-4" />
						<span>
							Chưa tìm thấy <b>SUPABASE_SERVICE_ROLE_KEY</b> trong
							file <code>.env</code> của app Admin. Vui lòng cung
							cấp key vào <code>apps/admin/.env.local</code> để
							kết nối trực tiếp với Supabase.
						</span>
					</div>
				)}

				{/* Global Feedback Banner */}
				{userActionMsg && (
					<div
						className={`alert ${
							userActionMsg.type === "ok"
								? "alert-success text-white"
								: "alert-error text-white"
						} text-xs py-2.5 rounded-2xl shadow-sm flex items-center justify-between`}>
						<span>{userActionMsg.text}</span>
						<button
							onClick={() => setUserActionMsg(null)}
							className="btn btn-ghost btn-circle btn-xs">
							✕
						</button>
					</div>
				)}

				{/* ==============================================================
            TAB: FOLDER SOURCES & SET BUILDER
            ============================================================== */}
				{tab === "folderSources" && (
					<div className="space-y-6">
						{/* Folder path bar */}
						<div className="card bg-base-200/50 border border-base-300 p-4 sm:p-5 rounded-3xl shadow-sm space-y-3">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div className="flex-1 w-full">
									<label className="label py-1">
										<span className="label-text text-xs font-bold font-display flex items-center gap-1.5">
											<FolderOpen className="w-4 h-4 text-primary" />
											Đường dẫn thư mục nguồn câu hỏi
											(JSON)
										</span>
									</label>
									<div className="flex gap-2">
										<input
											type="text"
											value={folderPath}
											onChange={(e) =>
												setFolderPath(e.target.value)
											}
											placeholder="/Users/.../data/question-sources"
											className="input input-sm input-bordered flex-1 rounded-xl text-xs font-mono bg-base-100"
										/>
										<button
											type="button"
											disabled={folderLoading}
											onClick={handleScanFolder}
											className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm shrink-0">
											{folderLoading ? (
												<span className="loading loading-spinner loading-xs" />
											) : (
												<>
													<RefreshCw className="w-3.5 h-3.5 mr-1" />
													Quét lại thư mục
												</>
											)}
										</button>
									</div>
								</div>
							</div>

							<p className="text-[11px] text-base-content/60 leading-relaxed">
								Tự động phát hiện các file <code>.json</code>{" "}
								trong thư mục. Bạn có thể xem trước nội dung,
								nhấn <b>Build vào Database</b> để đồng bộ lên
								Supabase, và bấm <b>Kích hoạt</b> để chọn bộ đề
								đang hiển thị cho học viên trên ứng dụng Web.
							</p>
						</div>

						{/* List of Detected Sources */}
						<div className="space-y-3">
							<h3 className="font-display font-bold text-sm text-base-content/80 flex items-center gap-2">
								Danh sách bộ đề được phát hiện trong thư mục (
								{folderSources.length})
							</h3>

							{folderSources.length === 0 ? (
								<div className="text-center py-12 bg-base-200/50 rounded-3xl border border-dashed border-base-300 text-xs text-base-content/60">
									Không tìm thấy file <code>.json</code> nào
									trong thư mục được chọn.
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{folderSources.map((source, idx) => {
										const isSynced = Boolean(
											source.syncedSet,
										);
										const isActive = Boolean(
											source.syncedSet?.isActive,
										);

										return (
											<div
												key={source.fileName || idx}
												className={`card bg-base-100 border p-5 rounded-3xl transition-all shadow-sm space-y-3 ${
													isActive
														? "border-primary shadow-md shadow-primary/10"
														: isSynced
															? "border-base-300"
															: "border-dashed border-base-300/80 bg-base-200/30"
												}`}>
												{/* Source Header */}
												<div className="flex justify-between items-start gap-2">
													<div className="min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<span
																className={`badge badge-sm text-[10px] font-bold ${
																	source.fileType === "docx"
																		? "badge-info text-white"
																		: "badge-ghost"
																}`}>
																{source.fileType
																	? source.fileType.toUpperCase()
																	: "JSON"}
															</span>
															<h4 className="font-display font-bold text-base text-base-content truncate">
																{source.title}
															</h4>
															{isActive ? (
																<span className="badge badge-primary badge-sm text-[10px] font-bold gap-1 text-white">
																	<Sparkles className="w-3 h-3" />{" "}
																	Đang kích
																	hoạt
																</span>
															) : isSynced ? (
																<span className="badge badge-success badge-sm text-[10px] font-bold text-white gap-1">
																	<Check className="w-3 h-3" />{" "}
																	Đã nạp DB
																</span>
															) : (
																<span className="badge badge-ghost badge-sm text-[10px] text-base-content/60">
																	Chưa nạp DB
																</span>
															)}
														</div>
														<div className="text-[11px] font-mono text-base-content/50 mt-0.5 truncate">
															File:{" "}
															{source.fileName} (
															{Math.round(
																source.fileSizeBytes /
																	1024,
															)}{" "}
															KB)
														</div>
													</div>
												</div>

												{/* Meta stats */}
												<div className="flex items-center gap-3 text-xs bg-base-200/60 p-2.5 rounded-2xl">
													<div>
														<span className="text-base-content/60 text-[11px]">
															Bài học:{" "}
														</span>
														<b className="font-display text-primary">
															{
																source.lessonsCount
															}{" "}
															bài
														</b>
													</div>
													<span className="text-base-content/30">
														•
													</span>
													<div>
														<span className="text-base-content/60 text-[11px]">
															Tổng số câu:{" "}
														</span>
														<b className="font-display text-primary">
															{
																source.questionsCount
															}{" "}
															câu
														</b>
													</div>
													<span className="text-base-content/30">
														•
													</span>
													<div>
														<span className="text-base-content/60 text-[11px]">
															Mã slug:{" "}
														</span>
														<code className="text-[10px] font-bold">
															{source.slug}
														</code>
													</div>
												</div>

												{/* Actions */}
												<div className="flex items-center justify-between gap-2 pt-2 border-t border-base-300/60">
													<button
														type="button"
														onClick={() =>
															handlePreview(
																source.fileName,
															)
														}
														className="btn btn-ghost btn-xs rounded-xl font-display">
														<Eye className="w-3.5 h-3.5 mr-1" />
														Xem trước (
														{source.questionsCount}{" "}
														câu)
													</button>

													<div className="flex items-center gap-2">
														{isSynced &&
															source.syncedSet
																?.id && (
																<button
																	type="button"
																	disabled={
																		folderLoading
																	}
																	onClick={() =>
																		handleSetActive(
																			source
																				.syncedSet!
																				.id,
																				source.title,
																				!isActive,
																		)
																	}
																	role="switch"
																	aria-checked={isActive}
																	className="btn btn-outline btn-xs rounded-xl font-display font-bold">
																	{isActive ? 'Active · Tắt' : 'Inactive · Bật'}
																</button>
															)}

														<button
															type="button"
															disabled={
																folderLoading ||
																!source.isValid
															}
															onClick={() =>
																handleBuildFolderSet(
																	source.fileName,
																)
															}
															className={`btn btn-xs rounded-xl font-display font-bold text-white shadow-sm ${
																isActive
																	? "btn-neutral"
																	: "btn-primary"
															}`}>
															{isSynced
																? "Re-build lại set"
																: "Build vào Database"}
														</button>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}

				{tab === "converter" && (
					<section className="max-w-3xl space-y-6" aria-labelledby="converter-heading">
						<div>
							<h2 id="converter-heading" className="font-display font-bold text-xl">Chuyển đổi tài liệu sang bộ đề</h2>
							<p className="text-sm text-base-content/70 mt-2">Chọn tài liệu, kiểm tra câu hỏi được trích xuất rồi tải JSON. File nguồn được lưu trong thư mục đang chọn; chưa xuất bản lên Supabase.</p>
						</div>
						<form onSubmit={handleConvertDoc} className="space-y-4 p-5 bg-base-200/50 border border-base-300 rounded-2xl">
							<div className="space-y-2">
								<label htmlFor="converter-file" className="block text-sm font-semibold">Tài liệu câu hỏi</label>
								<input id="converter-file" type="file" accept=".docx,.txt,.md" disabled={converting} required
									className="file-input file-input-bordered w-full" aria-describedby="converter-help"
									onChange={(event) => {
										setConverterFile(event.target.files?.[0] || null);
										setConvertedResult(null);
										setConverterMsg(null);
										setConverterWarnings([]);
									}} />
								<p id="converter-help" className="text-xs text-base-content/70">DOCX, TXT hoặc Markdown · tối đa 5 MB. File .doc cũ cần lưu lại thành .docx.</p>
							</div>
							<p className="text-xs text-base-content/70">Định dạng: Câu 1. …, các phương án A. … đến D. … và đáp án ở cuối tài liệu hoặc dòng “Đáp án: B”. Kiểm tra đáp án trước khi xuất bản.</p>
							<p className="text-xs break-all"><b>Thư mục lưu:</b> {folderPath || "Thư mục nguồn mặc định"}</p>
							<button type="submit" disabled={!converterFile || converting} className="btn btn-primary btn-sm">
								{converting ? <span className="loading loading-spinner loading-xs" /> : <FileText className="w-4 h-4" />}
								{converting ? "Đang chuyển đổi…" : "Chuyển đổi sang JSON"}
							</button>
						</form>
						<div aria-live="polite" aria-busy={converting}>
							{converterMsg && <div role={converterMsg.type === "err" ? "alert" : "status"} className={`alert text-sm ${converterMsg.type === "ok" ? "alert-success" : "alert-error"}`}>{converterMsg.text}</div>}
							{converterWarnings.length > 0 && <div className="mt-3 p-4 bg-warning/10 rounded-xl text-sm"><h3 className="font-bold">Cần kiểm tra</h3><ul className="list-disc pl-5 mt-2">{converterWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
						</div>
						{convertedResult && <div className="space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div><h3 className="font-display font-bold">{convertedResult.title}</h3><p className="text-sm text-base-content/70">{convertedResult.lessons.length} bài · {convertedResult.qs.length} câu hỏi</p></div>
								<button type="button" onClick={handleDownloadJson} className="btn btn-outline btn-sm"><Download className="w-4 h-4" />Tải JSON</button>
							</div>
							<details open className="space-y-3"><summary className="cursor-pointer font-semibold text-sm">Xem trước câu hỏi</summary>
								<div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">{convertedResult.qs.map((question, index) => <article key={index} className="border-b border-base-300 pb-4 text-sm">
									<h4 className="font-semibold">Câu {question.n}. {question.q}</h4>
									<ul className="mt-2 space-y-1">{(["A", "B", "C", "D"] as const).map(key => <li key={key}><b>{key}.</b> {question.opts[key]} {key === question.ans && <span className="font-bold text-primary">(Đáp án)</span>}</li>)}</ul>
									{question.exp && <p className="mt-2 text-base-content/70">Giải thích: {question.exp}</p>}
								</article>)}</div>
							</details>
							<button type="button" onClick={() => setTab("folderSources")} className="btn btn-ghost btn-sm">Mở nguồn đề để kiểm tra và xuất bản</button>
						</div>}
					</section>
				)}

				{/* ==============================================================
            TAB 1: USERS
            ============================================================== */}
				{tab === "users" && (
					<div className="space-y-4">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
							<div className="relative w-full sm:w-72">
								<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
								<input
									type="text"
									placeholder="Tìm email hoặc tên học viên..."
									value={userSearch}
									onChange={(e) =>
										setUserSearch(e.target.value)
									}
									className="input input-sm input-bordered w-full pl-9 rounded-xl text-xs"
								/>
							</div>

							<button
								onClick={() => setShowAddUserModal(true)}
								className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm">
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
										<th>Trạng thái</th>
										<th>Ngày tạo</th>
										<th className="text-right">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{filteredUsers.length === 0 ? (
										<tr>
											<td
												colSpan={5}
												className="text-center py-8 text-xs text-base-content/50">
												Chưa có học viên nào hoặc không
												tìm thấy kết quả.
											</td>
										</tr>
									) : (
										filteredUsers.map((u) => (
											<tr
												key={u.id}
												className="hover:bg-base-100/50 border-b border-base-300/50 text-xs">
												<td>
													<div className="font-bold text-base-content">
														{u.displayName || "—"}
													</div>
													<div className="text-[11px] text-base-content/60">
														{u.email}
													</div>
												</td>
												<td>
													<span
														className={`badge badge-xs font-semibold ${
															u.role === "admin"
																? "badge-primary text-white"
																: "badge-ghost"
														}`}>
														{u.role}
													</span>
												</td>
												<td>
													{u.isBanned ? (
														<span className="badge badge-error badge-sm text-white font-bold gap-1">
															<ShieldAlert className="w-3 h-3" />{" "}
															Tạm khóa (Banned)
														</span>
													) : (
														<span className="badge badge-success badge-sm text-white font-bold gap-1">
															<CheckCircle className="w-3 h-3" />{" "}
															Hoạt động
														</span>
													)}
												</td>
												<td className="text-base-content/60 text-[11px]">
													{new Date(
														u.createdAt,
													).toLocaleDateString(
														"vi-VN",
													)}
												</td>
												<td className="text-right space-x-2">
													<button
														type="button"
														onClick={() =>
															handleToggleBan(u)
														}
														className={`btn btn-xs rounded-xl font-display font-bold ${
															u.isBanned
																? "btn-success text-white"
																: "btn-outline btn-error"
														}`}>
														{u.isBanned
															? "Mở khóa"
															: "Tạm khóa"}
													</button>

													{/* Reset Password button */}
													<button
														type="button"
														onClick={() => {
															setPwdModalUser(u);
															setResetPwdValue(
																"",
															);
														}}
														className="btn btn-xs btn-ghost border border-base-300 rounded-xl"
														title="Đổi mật khẩu">
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
				{tab === "upload" && (
					<div className="max-w-2xl space-y-6">
						<div className="card bg-base-200/50 border border-base-300 p-6 rounded-3xl shadow-sm space-y-4">
							<div>
								<h3 className="font-display font-bold text-base">
									Tải lên file câu hỏi vào Storage
								</h3>
								<p className="text-xs text-base-content/60 mt-0.5">
									Lưu file trực tiếp vào Supabase Storage
									(bucket <code>quiz-files</code>) và tự động
									đồng bộ bài học & câu hỏi vào database.
								</p>
							</div>

							{uploadMsg && (
								<div
									className={`alert ${
										uploadMsg.type === "ok"
											? "alert-success text-white"
											: "alert-error text-white"
									} text-xs py-2.5 rounded-2xl shadow-sm`}>
									<span>{uploadMsg.text}</span>
								</div>
							)}

							<form
								onSubmit={handleUploadSubmit}
								className="space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<div className="form-control">
										<label className="label py-1">
											<span className="label-text text-xs font-semibold">
												Tên bộ đề (Title)
											</span>
										</label>
										<input
											type="text"
											name="title"
											defaultValue="QNA Learning"
											required
											className="input input-sm input-bordered bg-base-100 rounded-xl text-xs"
										/>
									</div>
									<div className="form-control">
										<label className="label py-1">
											<span className="label-text text-xs font-semibold">
												Mã định danh (Slug)
											</span>
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
										<span className="label-text text-xs font-semibold">
											File JSON câu hỏi
										</span>
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
											Cấu trúc JSON chuẩn:{" "}
											<code>
												&#123; lessons: [...], qs: [...]
												&#125;
											</code>
										</span>
									</label>
								</div>

								<button
									type="submit"
									disabled={uploadLoading}
									className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm w-full">
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
								<h4 className="font-display font-bold text-sm">
									Nạp sẵn bộ câu hỏi QNA Learning gốc
								</h4>
								<p className="text-xs text-base-content/60">
									Khởi tạo 90 câu trắc nghiệm chính thức từ
									tài liệu vào cơ sở dữ liệu Supabase chỉ với
									1 click.
								</p>
							</div>
							<button
								type="button"
								disabled={uploadLoading}
								onClick={handleSeedDefault}
								className="btn btn-outline btn-sm rounded-xl font-display shrink-0 ml-4">
								<Sparkles className="w-4 h-4 text-primary mr-1" />
								Nạp 90 câu mẫu
							</button>
						</div>
					</div>
				)}

				{/* ==============================================================
            TAB 3: QUESTION EDITOR
            ============================================================== */}
				{tab === "questions" && (
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-3">
							<label className="text-sm font-semibold" htmlFor="question-set-filter">Bộ đề</label>
							<select id="question-set-filter" value={qSetFilter} onChange={event => { setQSetFilter(event.target.value); setQLessonFilter('all'); }} className="select select-sm select-bordered max-w-full">
								<option value="all">Tất cả bộ đề</option>
								{activeSets.map(set => <option key={set.id} value={set.id}>{set.title}</option>)}
							</select>
              <p role="status" className="text-xs text-base-content/70 ml-auto">Hiển thị {filteredQuestions.length}/{activeQuestions.length} câu hỏi</p>
							<button type="button" disabled={questionsLoading} onClick={handleRefreshQuestions} className="btn btn-outline btn-sm " style={{marginLeft: "auto"}}>
								<RefreshCw className={`w-4 h-4 ${questionsLoading ? 'animate-spin' : ''}`} />
								{questionsLoading ? 'Đang tải…' : 'Nạp lại dữ liệu'}
							</button>

						</div>
						{/* Filter toolbar */}
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
							<div className="flex items-center gap-2 w-full sm:w-auto">
								<div className="relative flex-1 sm:w-64">
									<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
									<input
										type="text"
										placeholder="Tìm nội dung câu hỏi..."
										value={qSearch}
										onChange={(e) =>
											setQSearch(e.target.value)
										}
										className="input input-sm input-bordered w-full pl-9 rounded-xl text-xs"
									/>
								</div>

								<select
									value={qLessonFilter}
									onChange={(e) =>
										setQLessonFilter(
											e.target.value === "all"
												? "all"
												: parseInt(e.target.value, 10),
										)
									}
									className="select select-sm select-bordered rounded-xl text-xs">
									<option value="all">Tất cả bài học</option>
									{lessonList.map((num) => (
										<option key={num} value={num}>
											Bài {num}
										</option>
									))}
								</select>
							</div>

							<button
								disabled={qSetFilter === 'all'}
								onClick={() => {
									setEditingQuestion({
										setId: qSetFilter,
										lesson: 1,
										n: questions.length + 1,
										q: "",
										opts: { A: "", B: "", C: "", D: "" },
										ans: "A",
										exp: "",
										src: "",
										isActive: true,
									});
									setIsEditingNew(true);
								}}
								className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm">
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
								Array.from(new Set(filteredQuestions.map(q => q.setId || 'preview'))).map(groupId => (
									<details key={groupId} open className="rounded-2xl border border-base-300 p-4">
										<summary className="cursor-pointer font-display font-bold text-sm">
											{sets.find(set => set.id === groupId)?.title || (groupId === 'preview' ? 'Bộ đề xem trước' : `Bộ đề ${groupId}`)}
											{' · '}{filteredQuestions.filter(q => (q.setId || 'preview') === groupId).length}/{questions.filter(q => (q.setId || 'preview') === groupId).length} câu
										</summary>
										<div className="mt-4 space-y-3">
											{groupId !== 'preview' && (renamingSetId === groupId ? (
												<form onSubmit={handleRenameSet} className="space-y-2">
													<label htmlFor={`set-title-${groupId}`} className="block text-xs font-semibold">Tên bộ đề</label>
													<div className="flex flex-wrap items-center gap-2">
														<input id={`set-title-${groupId}`} autoFocus required maxLength={200}
															value={setTitleDraft} onChange={event => setSetTitleDraft(event.target.value)}
															disabled={renameLoading} aria-invalid={Boolean(renameError)} aria-describedby={renameError ? `set-title-error-${groupId}` : undefined}
															className="input input-sm input-bordered min-w-0 flex-1" />
														<button type="submit" disabled={renameLoading || !setTitleDraft.trim()} className="btn btn-primary btn-sm">{renameLoading ? 'Đang lưu…' : 'Lưu'}</button>
														<button type="button" disabled={renameLoading} onClick={() => setRenamingSetId(null)} className="btn btn-ghost btn-sm">Hủy</button>
													</div>
													{renameError && <p id={`set-title-error-${groupId}`} role="alert" className="text-xs text-error">{renameError}</p>}
												</form>
											) : (
												<button type="button" disabled={renameLoading} onClick={() => {
													setRenamingSetId(groupId);
													setSetTitleDraft(sets.find(set => set.id === groupId)?.title || '');
													setRenameError('');
												}} className="btn btn-ghost btn-sm gap-2"><Edit aria-hidden="true" className="h-3.5 w-3.5" />Đổi tên</button>
											))}
								{filteredQuestions.filter(q => (q.setId || 'preview') === groupId).map((q, idx) => (
									<div
										key={q.id || idx}
										className="p-4 bg-base-200/40 rounded-2xl border border-base-300 text-xs space-y-2 hover:border-primary/40 transition-colors">
										<div className="flex justify-between items-start gap-2">
											<div className="flex items-center gap-2">
												<span className="font-display font-bold text-primary">
													Bài {q.lesson} · Câu {q.n}
												</span>
												<span className="badge badge-success badge-xs text-white font-bold py-2">
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
													title="Sửa câu hỏi">
													<Edit className="w-3.5 h-3.5" />
												</button>
												<button
													type="button"
													onClick={() =>
														handleDeleteQuestion(
															q.id,
														)
													}
													className="btn btn-ghost btn-circle btn-xs text-error"
													title="Xóa câu hỏi">
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>

										<p className="font-semibold text-base-content text-sm select-text">
											{q.q}
										</p>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
											{(
												[
													"A",
													"B",
													"C",
													"D",
												] as OptionKey[]
											).map((key) => (
												<div
													key={key}
													className={`p-1.5 px-2.5 rounded-lg border flex items-center gap-2 ${
														key === q.ans
															? "bg-success/10 border-success/40 text-success-content font-bold"
															: "bg-base-100 border-base-300/60"
													}`}>
													<span className="font-display font-bold w-4">
														{key}.
													</span>
													<span className="truncate">
														{q.opts[key]}
													</span>
												</div>
											))}
										</div>

										{q.exp && (
											<div className="text-[11px] text-base-content/70 italic border-t border-base-300/60 pt-1.5">
												<b>Giải thích:</b> {q.exp}
											</div>
										)}
									</div>
								))}
										</div>
									</details>
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
							<h3 className="font-display font-bold text-base">
								Thêm tài khoản học viên mới
							</h3>
							<button
								onClick={() => setShowAddUserModal(false)}
								className="btn btn-circle btn-xs btn-ghost">
								✕
							</button>
						</div>

						<form onSubmit={handleAddUser} className="space-y-3">
							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Tên học viên
									</span>
								</label>
								<input
									type="text"
									placeholder="Ví dụ: Nguyễn Văn A"
									value={newDisplayName}
									onChange={(e) =>
										setNewDisplayName(e.target.value)
									}
									className="input input-sm input-bordered rounded-xl text-xs"
								/>
							</div>

							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Email đăng nhập *
									</span>
								</label>
								<input
									type="email"
									required
									placeholder="student1@studywithmsnhung.edu"
									value={newEmail}
									onChange={(e) =>
										setNewEmail(e.target.value)
									}
									className="input input-sm input-bordered rounded-xl text-xs"
								/>
							</div>

							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Mật khẩu ban đầu *
									</span>
								</label>
								<input
									type="text"
									required
									placeholder="Tối thiểu 6 ký tự..."
									value={newPassword}
									onChange={(e) =>
										setNewPassword(e.target.value)
									}
									className="input input-sm input-bordered rounded-xl text-xs"
								/>
							</div>

							<div className="pt-3 flex gap-2">
								<button
									type="button"
									onClick={() => setShowAddUserModal(false)}
									className="btn btn-ghost btn-sm flex-1 rounded-xl font-display">
									Hủy
								</button>
								<button
									type="submit"
									className="btn btn-primary btn-sm flex-1 rounded-xl font-display font-bold text-white shadow-sm">
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
							<h3 className="font-display font-bold text-base">
								Đổi mật khẩu học viên
							</h3>
							<button
								onClick={() => setPwdModalUser(null)}
								className="btn btn-circle btn-xs btn-ghost">
								✕
							</button>
						</div>

						<p className="text-xs text-base-content/70">
							Cập nhật mật khẩu mới cho tài khoản:{" "}
							<b>{pwdModalUser.email}</b>
						</p>

						<form
							onSubmit={handleUpdatePassword}
							className="space-y-3">
							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Mật khẩu mới
									</span>
								</label>
								<input
									type="text"
									required
									placeholder="Nhập mật khẩu mới..."
									value={resetPwdValue}
									onChange={(e) =>
										setResetPwdValue(e.target.value)
									}
									className="input input-sm input-bordered rounded-xl text-xs"
								/>
							</div>

							<div className="pt-2 flex gap-2">
								<button
									type="button"
									onClick={() => setPwdModalUser(null)}
									className="btn btn-ghost btn-sm flex-1 rounded-xl font-display">
									Hủy
								</button>
								<button
									type="submit"
									className="btn btn-primary btn-sm flex-1 rounded-xl font-display font-bold text-white">
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
								{isEditingNew
									? "Thêm câu hỏi mới"
									: "Chỉnh sửa câu hỏi"}
							</h3>
							<button
								onClick={() => setEditingQuestion(null)}
								className="btn btn-circle btn-xs btn-ghost">
								✕
							</button>
						</div>

						<form
							onSubmit={handleSaveQuestion}
							className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div className="form-control">
									<label className="label py-1">
										<span className="label-text text-xs font-semibold">
											Bài số (Lesson)
										</span>
									</label>
									<input
										type="number"
										min="1"
										required
										value={editingQuestion.lesson || 1}
										onChange={(e) =>
											setEditingQuestion({
												...editingQuestion,
												lesson: parseInt(
													e.target.value,
													10,
												),
											})
										}
										className="input input-sm input-bordered rounded-xl text-xs"
									/>
								</div>
								<div className="form-control">
									<label className="label py-1">
										<span className="label-text text-xs font-semibold">
											Số thứ tự câu (n)
										</span>
									</label>
									<input
										type="number"
										min="1"
										required
										value={editingQuestion.n || 1}
										onChange={(e) =>
											setEditingQuestion({
												...editingQuestion,
												n: parseInt(e.target.value, 10),
											})
										}
										className="input input-sm input-bordered rounded-xl text-xs"
									/>
								</div>
							</div>

							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Nội dung câu hỏi *
									</span>
								</label>
								<textarea
									required
									rows={3}
									value={editingQuestion.q || ""}
									onChange={(e) =>
										setEditingQuestion({
											...editingQuestion,
											q: e.target.value,
										})
									}
									className="textarea textarea-bordered rounded-xl text-xs"
									placeholder="Nhập đề bài câu hỏi trắc nghiệm..."
								/>
							</div>

							{/* 4 Options */}
							<div className="space-y-2">
								<label className="label py-0">
									<span className="label-text text-xs font-semibold">
										4 Phương án & Đáp án đúng
									</span>
								</label>
								{(["A", "B", "C", "D"] as OptionKey[]).map(
									(key) => (
										<div
											key={key}
											className="flex items-center gap-2">
											<input
												type="radio"
												name="correct_ans"
												checked={
													editingQuestion.ans === key
												}
												onChange={() =>
													setEditingQuestion({
														...editingQuestion,
														ans: key,
													})
												}
												className="radio radio-primary radio-sm"
												title="Chọn làm đáp án đúng"
											/>
											<span className="font-display font-bold text-xs w-4">
												{key}:
											</span>
											<input
												type="text"
												required
												value={
													editingQuestion.opts?.[
														key
													] || ""
												}
												onChange={(e) =>
													setEditingQuestion({
														...editingQuestion,
														opts: {
															...(editingQuestion.opts || {
																A: "",
																B: "",
																C: "",
																D: "",
															}),
															[key]: e.target
																.value,
														},
													})
												}
												className="input input-sm input-bordered rounded-xl text-xs flex-1"
												placeholder={`Nội dung phương án ${key}...`}
											/>
										</div>
									),
								)}
							</div>

							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Lời giải thích chi tiết
									</span>
								</label>
								<textarea
									rows={2}
									value={editingQuestion.exp || ""}
									onChange={(e) =>
										setEditingQuestion({
											...editingQuestion,
											exp: e.target.value,
										})
									}
									className="textarea textarea-bordered rounded-xl text-xs"
									placeholder="Giải thích vì sao phương án trên đúng..."
								/>
							</div>

							<div className="form-control">
								<label className="label py-1">
									<span className="label-text text-xs font-semibold">
										Nguồn trích dẫn (Document source)
									</span>
								</label>
								<input
									type="text"
									value={editingQuestion.src || ""}
									onChange={(e) =>
										setEditingQuestion({
											...editingQuestion,
											src: e.target.value,
										})
									}
									className="input input-sm input-bordered rounded-xl text-xs"
									placeholder="Ví dụ: ANSC 1.1, trang 15..."
								/>
							</div>

							<div className="pt-3 flex gap-2">
								<button
									type="button"
									onClick={() => setEditingQuestion(null)}
									className="btn btn-ghost btn-sm flex-1 rounded-xl font-display">
									Hủy
								</button>
								<button
									type="submit"
									className="btn btn-primary btn-sm flex-1 rounded-xl font-display font-bold text-white shadow-sm">
									Lưu câu hỏi
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ==============================================================
          MODAL: PREVIEW FOLDER SOURCE
          ============================================================== */}
			{previewData && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
					<div className="w-full max-w-3xl bg-base-100 rounded-3xl p-6 border border-base-300 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
						<div className="flex justify-between items-center pb-3 border-b border-base-300">
							<div>
								<h3 className="font-display font-bold text-base flex items-center gap-2">
									<FolderOpen className="w-5 h-5 text-primary" />
									Xem trước nội dung file:{" "}
									<span className="font-mono text-xs">
										{previewData.fileName}
									</span>
								</h3>
								<p className="text-xs text-base-content/60 mt-0.5">
									Gồm{" "}
									<b>{previewData.lessons.length} bài học</b>{" "}
									và{" "}
									<b>
										{previewData.questions.length} câu hỏi
									</b>
								</p>
							</div>
							<button
								type="button"
								onClick={() => setPreviewData(null)}
								className="btn btn-circle btn-xs btn-ghost">
								✕
							</button>
						</div>

						{/* Scrollable Questions Content */}
						<div className="flex-1 overflow-y-auto space-y-4 pr-1">
							{/* Lessons overview */}
							<div className="bg-base-200/50 p-3 rounded-2xl border border-base-300/80">
								<h5 className="font-display font-bold text-xs mb-2 text-primary">
									Các bài học có trong đề:
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
									{previewData.lessons.map((l) => (
										<div
											key={l.n}
											className="flex items-center gap-2 p-2 rounded-xl bg-base-100 border border-base-300/60">
											<span className="badge badge-sm badge-neutral font-mono font-bold text-[10px] min-w-12">
												Bài {l.n}
											</span>
											<span className="truncate font-medium">
												{l.title.replace(`BÀI ${l.n}.`, "")}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Sample questions */}
							<div className="space-y-3">
								<h5 className="font-display font-bold text-xs text-base-content/80">
									Danh sách câu hỏi mẫu (
									{previewData.questions.length} câu):
								</h5>

								{previewData.questions
									.slice(0, 30)
									.map((q, idx) => (
										<div
											key={idx}
											className="p-3.5 bg-base-200/30 rounded-2xl border border-base-300 text-xs space-y-2">
											<div className="flex justify-between items-center text-[11px]">
												<span className="font-display font-bold text-primary">
													Câu {q.n} (Bài {q.lesson})
												</span>
												<span className="badge badge-success badge-xs text-white font-bold py-2">
													Đáp án đúng: {q.ans}
												</span>
											</div>

											<p className="font-semibold text-base-content">
												{q.q}
											</p>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
												{(
													[
														"A",
														"B",
														"C",
														"D",
													] as OptionKey[]
												).map((key) => (
													<div
														key={key}
														className={`p-1.5 px-2 rounded-lg border ${
															key === q.ans
																? "bg-success/15 border-success text-success-content font-bold"
																: "bg-base-100 border-base-300/60 text-base-content/80"
														}`}>
														<span className="font-bold mr-1">
															{key}.
														</span>{" "}
														{q.opts[key]}
													</div>
												))}
											</div>

											{q.exp && (
												<div className="text-[11px] text-base-content/70 italic border-t border-base-300/50 pt-1">
													<b>Giải thích:</b> {q.exp}
												</div>
											)}
										</div>
									))}

								{previewData.questions.length > 30 && (
									<div className="text-center py-2 text-xs text-base-content/50">
										... và{" "}
										{previewData.questions.length - 30} câu
										hỏi khác
									</div>
								)}
							</div>
						</div>

						{/* Modal footer */}
						<div className="pt-3 border-t border-base-300 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setPreviewData(null)}
								className="btn btn-ghost btn-sm rounded-xl font-display">
								Đóng
							</button>
							<button
								type="button"
								onClick={() => {
									const fName = previewData.fileName;
									setPreviewData(null);
									handleBuildFolderSet(fName);
								}}
								className="btn btn-primary btn-sm rounded-xl font-display font-bold text-white shadow-sm">
								Build bộ đề này vào Database
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
