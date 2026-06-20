import { useState } from "react";
import { parseAmount } from "@telecash/core";
import { useSearch } from "../hooks";
import { formatVND } from "../lib/format";
import type { Tx } from "../types";

export function Search() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [qs, setQs] = useState<string | null>(null);

  function doSearch() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (type) p.set("type", type);
    const mn = parseAmount(min);
    const mx = parseAmount(max);
    if (mn) p.set("min", String(mn));
    if (mx) p.set("max", String(mx));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    setQs(p.toString());
  }

  const res = useSearch(qs ?? "", qs !== null);
  const list: Tx[] = res.data?.transactions ?? [];

  const inputCls = "min-w-0 w-full border border-slate-200 rounded-lg px-2 py-2 text-sm";

  return (
    <div className="p-3 space-y-3">
      <div className="text-center font-bold text-blue-600">🔍 TÌM KIẾM</div>

      <div className="bg-white rounded-xl p-3 shadow-sm space-y-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nội dung (vd: ăn, xăng…)" className={inputCls} />

        <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} bg-white`}>
          <option value="">Tất cả thu &amp; chi</option>
          <option value="EXPENSE">Chỉ chi tiêu</option>
          <option value="INCOME">Chỉ thu nhập</option>
        </select>

        <div className="flex gap-2">
          <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="Từ (50k)" className={`${inputCls} flex-1`} />
          <input value={max} onChange={(e) => setMax(e.target.value)} placeholder="Đến (1m)" className={`${inputCls} flex-1`} />
        </div>

        <div className="flex gap-2 items-center">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} flex-1`} />
          <span className="text-slate-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} flex-1`} />
        </div>

        <button onClick={doSearch} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">
          Tìm
        </button>
      </div>

      {qs !== null && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">KẾT QUẢ ({list.length})</div>
          {res.isLoading && <div className="text-center text-slate-400 py-4">Đang tìm…</div>}
          {!res.isLoading && list.length === 0 && <div className="text-center text-slate-400 py-4">Không có kết quả.</div>}
          <div className="space-y-2">
            {list.map((t) => (
              <div key={t.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="text-xl">{t.category?.icon ?? "📦"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.content || "(không nội dung)"}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {t.category?.name ?? "Khác"} • {t.date.slice(0, 10)} • #{t.code}
                  </div>
                </div>
                <div className={`font-semibold whitespace-nowrap ${t.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatVND(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
