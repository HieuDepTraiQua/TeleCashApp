import { useState } from "react";
import { useDaySummary, useTransactions, useCategories, useTxMutations } from "../hooks";
import { formatVND, todayStr, shiftDay, displayDate } from "../lib/format";
import { TransactionModal } from "../components/TransactionModal";
import type { Tx } from "../types";

export function Transactions() {
  const [date, setDate] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);

  const summary = useDaySummary(date);
  const txs = useTransactions(date);
  const cats = useCategories();
  const m = useTxMutations(date);

  const list: Tx[] = txs.data?.transactions ?? [];
  const s = summary.data;

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: Tx) {
    setEditing(t);
    setModalOpen(true);
  }
  function submit(body: Record<string, unknown>, id?: string) {
    const opts = { onSuccess: () => setModalOpen(false) };
    if (id) m.update.mutate({ id, body }, opts);
    else m.create.mutate(body, opts);
  }

  return (
    <div className="p-3">
      {/* Thẻ chi tiêu trong ngày */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between text-sm opacity-90">
          <button onClick={() => setDate(shiftDay(date, -1))} className="px-2 py-1 text-lg">
            ‹
          </button>
          <span>{displayDate(date)}</span>
          <button onClick={() => setDate(shiftDay(date, 1))} className="px-2 py-1 text-lg">
            ›
          </button>
        </div>
        <div className="mt-2 text-xs opacity-80">CHI TIÊU TRONG NGÀY</div>
        <div className="text-3xl font-bold">{formatVND(s?.expense ?? 0)}</div>
        {s && s.expenseDiff !== 0 && (
          <div className="text-xs mt-1 opacity-90">
            {s.expenseDiff < 0 ? "↓ Giảm " : "↑ Tăng "}
            {formatVND(Math.abs(s.expenseDiff))} so với hôm trước
          </div>
        )}
        <div className="flex justify-between mt-3 text-sm">
          <div>
            <div className="opacity-80 text-xs">Thu nhập</div>
            <div className="font-semibold">{formatVND(s?.income ?? 0)}</div>
          </div>
          <div className="text-right">
            <div className="opacity-80 text-xs">Số dư</div>
            <div className="font-semibold">{formatVND(s?.balance ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* Hành động */}
      <div className="flex gap-2 my-3">
        <button onClick={() => setDate(todayStr())} className="flex-1 bg-white rounded-xl py-2 text-sm shadow-sm">
          📅 Hôm nay
        </button>
        <button
          onClick={openAdd}
          className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm shadow-sm font-semibold"
        >
          + Thêm mới
        </button>
      </div>

      {/* Danh sách */}
      <div className="text-sm font-semibold text-slate-500 mb-2">
        GIAO DỊCH TRONG NGÀY (Tổng: {list.length})
      </div>
      {txs.isLoading && <div className="text-center text-slate-400 py-6">Đang tải…</div>}
      {txs.isError && (
        <div className="text-center text-red-400 py-6 text-sm">Lỗi tải dữ liệu. Mở app từ trong Telegram nhé.</div>
      )}
      {!txs.isLoading && !txs.isError && list.length === 0 && (
        <div className="text-center text-slate-400 py-6">Chưa có giao dịch nào trong ngày.</div>
      )}

      <div className="space-y-2">
        {list.map((t, i) => (
          <div key={t.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="text-xl">{t.category?.icon ?? "📦"}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{t.content || "(không nội dung)"}</div>
              <div className="text-xs text-slate-400">
                {t.category?.name ?? "Khác"} • STT {i + 1} • #{t.code}
              </div>
              {t.categorySource === "FALLBACK" && (
                <button
                  onClick={() => openEdit(t)}
                  className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                >
                  Chọn danh mục
                </button>
              )}
            </div>
            <div className={`font-semibold whitespace-nowrap ${t.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
              {t.type === "INCOME" ? "+" : "-"}
              {formatVND(t.amount)}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => openEdit(t)} className="text-sm">
                ✏️
              </button>
              <button
                onClick={() => {
                  if (confirm("Xóa giao dịch này?")) m.remove.mutate(t.id);
                }}
                className="text-sm"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <TransactionModal
          date={date}
          categories={cats.data?.categories ?? []}
          editing={editing}
          submitting={m.create.isPending || m.update.isPending}
          onClose={() => setModalOpen(false)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
