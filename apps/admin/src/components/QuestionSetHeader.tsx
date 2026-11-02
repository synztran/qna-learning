"use client";

import { useState } from "react";
import { Edit } from "lucide-react";
import { renameQuizSet } from "../app/actions/admin";

export function QuestionSetHeader({ id, title, count, active, disabled, onRenamed, onActive }: {
	id: string;
	title: string;
	count: string;
	active: boolean;
	disabled: boolean;
	onRenamed: (title: string) => void;
	onActive: (active: boolean) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(title);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	return <div className="flex flex-wrap items-center gap-3 min-w-0">
		{editing ? <form className="flex-1 min-w-0" onSubmit={async event => {
			event.preventDefault();
			if (saving) return;
			setSaving(true);
			setError("");
			try {
				const result = await renameQuizSet(id, draft);
				if (!result.success || !result.title) {
					setError(result.error || "Không thể đổi tên bộ đề.");
					return;
				}
				onRenamed(result.title);
				setEditing(false);
			} catch {
				setError("Không thể đổi tên bộ đề. Kiểm tra kết nối và thử lại.");
			} finally { setSaving(false); }
		}}>
			<div className="flex flex-wrap items-center gap-2">
				<input autoFocus required maxLength={200} aria-label="Tên bộ đề" aria-invalid={Boolean(error)} aria-describedby={error ? `rename-error-${id}` : undefined}
					value={draft} onChange={event => setDraft(event.target.value)} disabled={saving} className="input input-sm input-bordered min-w-0 flex-1" />
				<button type="submit" disabled={saving || !draft.trim()} className="btn btn-primary btn-sm">{saving ? "Đang lưu…" : "Lưu"}</button>
				<button type="button" disabled={saving} onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">Hủy</button>
			</div>
			{error && <p id={`rename-error-${id}`} role="alert" className="text-xs text-error">{error}</p>}
		</form> : <span className="flex-1 min-w-0 font-display font-bold text-sm">{title} · {count} câu</span>}
		{id !== "preview" && <>
			{!editing && <button type="button" onClick={() => { setDraft(title); setError(""); setEditing(true); }} className="btn btn-ghost btn-sm gap-2"><Edit aria-hidden="true" className="h-3.5 w-3.5" />Đổi tên</button>}
			<label className="inline-flex items-center gap-2 text-xs font-semibold">
				<input type="checkbox" role="switch" className="toggle toggle-success toggle-sm" checked={active} disabled={disabled || saving}
					aria-label={`Kích hoạt bộ đề ${title}`} onChange={async event => {
						setSaving(true);
						try { await onActive(event.target.checked); } finally { setSaving(false); }
					}} />{active ? "Active" : "Inactive"}
			</label>
		</>}
	</div>;
}
