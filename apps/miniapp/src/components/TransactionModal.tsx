import { useState } from "react";
import { parseAmount, formatVND } from "@telecash/core";
import type { Category, Tx, TxType } from "../types";

interface Props {
  date: string;
  categories: Category[];
  editing: Tx | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>, id?: string) => void;
}

export function TransactionModal({ date, categories, editing, submitting, onClose, onSubmit }: Props) {
  const [type, setType] = useState<TxType>(editing?.type ?? "EXPENSE");
  const [amountRaw, setAmountRaw] = useState(editing ? String(editing.amount) : "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [dateStr, setDateStr] = useState(editing ? editing.date.slice(0, 10) : date);
  const [note, setNote] = useState(editing?.note ?? "");

  const amount = parseAmount(amountRaw) ?? 0;
  const cats = categories.filter((c) => c.type === type);
  const isFallbackEdit = editing?.categorySource === "FALLBACK";

  function submit() {
    if (amount <= 0) return;
    onSubmit(
      { type, amount, content, date: dateStr, note: note || null, categoryId: categoryId || null },
      editing?.id,
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
        <div className="text-lg font-semibold text-center">{editing ? "Sửa giao dịch" : "Thêm giao dịch"}</div>
        {isFallbackEdit && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
            Giao dịch này chưa xác định chắc danh mục. Chọn danh mục cụ thể để lần sau tự phân loại đúng hơn.
          </div>
        )}

        <div className="flex gap-2">
          {(["EXPENSE", "INCOME"] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                type === t
                  ? t === "EXPENSE"
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {t === "EXPENSE" ? "Chi tiêu" : "Thu nhập"}
            </button>
          ))}
        </div>

        <div>
          <input
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            placeholder="Số tiền (vd 50k, 1m5)"
            inputMode="text"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-lg"
          />
          {amount > 0 && <div className="text-xs text-slate-400 mt-1">= {formatVND(amount)}</div>}
        </div>

        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nội dung (vd ăn trưa)"
          className="w-full border border-slate-200 rounded-xl px-3 py-2"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="">🤖 Tự động phân loại</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2"
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú (tùy chọn)"
          className="w-full border border-slate-200 rounded-xl px-3 py-2"
        />

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-medium">
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={amount <= 0 || submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {submitting ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
