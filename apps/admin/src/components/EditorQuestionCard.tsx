import { memo } from "react";
import { Edit, Trash2 } from "lucide-react";
import type { Question, OptionKey } from "@qna/types";

export const EditorQuestionCard = memo(function EditorQuestionCard({ question: q, onEdit, onDelete }: {
	question: Question;
	onEdit: (question: Question) => void;
	onDelete: (id?: string) => void;
}) {
	return <div className="p-4 bg-base-200/40 rounded-2xl border border-base-300 text-xs space-y-2 hover:border-primary/40 transition-colors">
		<div className="flex justify-between items-start gap-2">
			<div className="flex items-center gap-2">
				<span className="font-display font-bold text-primary">Bài {q.lesson} · Câu {q.n}</span>
				<span className="badge badge-success badge-xs text-white font-bold py-2">Đáp án đúng: {q.ans}</span>
			</div>
			<div className="flex items-center gap-1">
				<button type="button" onClick={() => onEdit(q)} className="btn btn-ghost btn-circle btn-xs text-primary" title="Sửa câu hỏi" aria-label="Sửa câu hỏi"><Edit className="w-3.5 h-3.5" /></button>
				<button type="button" onClick={() => onDelete(q.id)} className="btn btn-ghost btn-circle btn-xs text-error" title="Xóa câu hỏi" aria-label="Xóa câu hỏi"><Trash2 className="w-3.5 h-3.5" /></button>
			</div>
		</div>
		<p className="font-semibold text-base-content text-sm select-text">{q.q}</p>
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
			{(["A", "B", "C", "D"] as OptionKey[]).map(key => <div key={key} className={`p-1.5 px-2.5 rounded-lg border flex items-center gap-2 ${key === q.ans ? "bg-success/80 border-success/40 text-success-content font-bold" : "bg-base-100 border-base-300/60"}`}>
				<span className="font-display font-bold w-4">{key}.</span><span className="truncate">{q.opts[key]}</span>
			</div>)}
		</div>
		{q.exp && <div className="text-[11px] text-base-content/70 italic border-t border-base-300/60 pt-1.5"><b>Giải thích:</b> {q.exp}</div>}
	</div>;
});
