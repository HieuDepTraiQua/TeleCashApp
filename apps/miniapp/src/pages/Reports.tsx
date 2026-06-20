import { useRef, useState } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useReport } from "../hooks";
import { apiClient } from "../lib/api";
import { notify } from "../lib/telegram";
import { formatVND, todayStr, shiftDay } from "../lib/format";
import { PrintableReport } from "../components/PrintableReport";

const RANGES = [
  { key: "week", label: "Theo tuần" },
  { key: "month", label: "Theo tháng" },
  { key: "year", label: "Cả năm" },
  { key: "custom", label: "Tùy chọn" },
];
const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

function Card({ title, value, color, sub }: { title: string; value: number; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm text-center">
      <div className="text-[10px] text-slate-400">{title}</div>
      <div className={`text-sm font-bold ${color}`}>{formatVND(value)}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function Reports() {
  const [kind, setKind] = useState("month");
  const [ref, setRef] = useState(todayStr());
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const q = useReport(kind, ref, from, to);
  const d = q.data;

  function exportQs() {
    const p = new URLSearchParams({ range: kind });
    if (kind === "custom") {
      p.set("from", from);
      p.set("to", to);
    } else {
      p.set("ref", ref);
    }
    return p.toString();
  }

  async function exportCsv() {
    try {
      setBusy(true);
      const r = await apiClient.exportCsv(exportQs());
      notify(`📄 Đã gửi file CSV (${r.count} giao dịch) vào chat Telegram của bạn!`);
    } catch {
      notify("Lỗi xuất CSV — hãy mở app từ trong Telegram.");
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    if (!printRef.current || !d) return;
    try {
      setBusy(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const w = canvas.width;
      const h = canvas.height;
      const pdf = new jsPDF({ unit: "px", format: [w, h], orientation: w > h ? "landscape" : "portrait" });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
      pdf.save(`baocao-${d.period.label.replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf`);
    } catch {
      notify("Lỗi xuất PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-center font-bold text-blue-600">📊 BÁO CÁO TÀI CHÍNH</div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setKind(r.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
              kind === r.key ? "bg-blue-600 text-white" : "text-slate-500"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {kind === "custom" ? (
        <div className="flex gap-2 items-center text-sm">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-0 flex-1 border border-slate-200 rounded-lg px-2 py-1.5" />
          <span className="text-slate-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-0 flex-1 border border-slate-200 rounded-lg px-2 py-1.5" />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm">
          <button onClick={() => d && setRef(shiftDay(d.period.start, -1))} className="text-lg px-2">‹</button>
          <span className="font-semibold">{d?.period.label ?? "…"}</span>
          <button onClick={() => d && setRef(d.period.end)} className="text-lg px-2">›</button>
        </div>
      )}

      {q.isLoading && <div className="text-center text-slate-400 py-6">Đang tải…</div>}
      {q.isError && <div className="text-center text-red-400 py-6 text-sm">Mở app từ trong Telegram để xem báo cáo.</div>}

      {d && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Card title="Thu nhập" value={d.totals.income} color="text-green-600" />
            <Card
              title="Chi tiêu"
              value={d.totals.expense}
              color="text-red-500"
              sub={d.expenseDiff !== 0 ? `${d.expenseDiff < 0 ? "↓" : "↑"} ${formatVND(Math.abs(d.expenseDiff))}` : undefined}
            />
            <Card title="Số dư" value={d.totals.balance} color={d.totals.balance < 0 ? "text-red-500" : "text-amber-500"} />
          </div>

          <div className="flex gap-2">
            <button onClick={exportCsv} disabled={busy} className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              📄 Xuất CSV
            </button>
            <button onClick={exportPdf} disabled={busy} className="flex-1 bg-rose-600 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              📕 Xuất PDF
            </button>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-2">THU NHẬP & CHI TIÊU</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.series}>
                <XAxis dataKey="label" fontSize={9} interval="preserveStartEnd" />
                <Tooltip formatter={(v: number | string) => formatVND(Number(v))} />
                <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {d.byCategory.length > 0 && (
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-2">CHI TIÊU THEO DANH MỤC</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={d.byCategory} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {d.byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | string) => formatVND(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {d.byCategory.map((c, i) => (
                  <div key={c.name} className="flex items-center text-xs">
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex-1">
                      {c.icon} {c.name}
                    </span>
                    <span className="text-slate-400 mr-2">{c.percent}%</span>
                    <span className="font-medium">{formatVND(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 shadow-sm overflow-x-auto">
            <div className="text-xs font-semibold text-slate-500 mb-2">DANH SÁCH CHI TIẾT ({d.transactions.length})</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th className="py-1 pr-2">Mã</th>
                  <th className="pr-2">Nội dung</th>
                  <th className="pr-2">Danh mục</th>
                  <th className="text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {d.transactions.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2">{t.code}</td>
                    <td className="pr-2 truncate max-w-[90px]">{t.content}</td>
                    <td className="pr-2">
                      {t.category?.icon} {t.category?.name ?? "Khác"}
                    </td>
                    <td className={`text-right ${t.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatVND(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Node off-screen để chụp PDF */}
          <div style={{ position: "absolute", left: -99999, top: 0 }} aria-hidden>
            <PrintableReport ref={printRef} data={d} />
          </div>
        </>
      )}
    </div>
  );
}
