import { forwardRef, type CSSProperties } from "react";
import type { ReportData } from "../types";
import { formatVND } from "../lib/format";

// Node dùng để chụp ra PDF — CHỈ inline-style (hex), tránh màu oklch của Tailwind v4
// mà html2canvas không parse được.
const cell: CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 11 };
const th: CSSProperties = { ...cell, textAlign: "left", color: "#64748b", fontWeight: 600 };

export const PrintableReport = forwardRef<HTMLDivElement, { data: ReportData }>(({ data }, ref) => {
  const cards: [string, number, string][] = [
    ["Thu nhập", data.totals.income, "#16a34a"],
    ["Chi tiêu", data.totals.expense, "#ef4444"],
    ["Số dư", data.totals.balance, "#f59e0b"],
  ];
  return (
    <div ref={ref} style={{ width: 720, padding: 24, background: "#fff", color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#2563eb" }}>BÁO CÁO TÀI CHÍNH</div>
      <div style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginBottom: 16 }}>{data.period.label}</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {cards.map(([t, v, c]) => (
          <div key={t} style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>{t}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{formatVND(v)}</div>
          </div>
        ))}
      </div>

      {data.byCategory.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Chi tiêu theo danh mục</div>
          {data.byCategory.map((c) => (
            <div key={c.name} style={{ display: "flex", fontSize: 11, padding: "2px 0" }}>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ color: "#64748b", marginRight: 8 }}>{c.percent}%</span>
              <span style={{ fontWeight: 600 }}>{formatVND(c.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Danh sách chi tiết ({data.transactions.length})</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Mã</th>
            <th style={th}>Nội dung</th>
            <th style={th}>Danh mục</th>
            <th style={{ ...th, textAlign: "right" }}>Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.map((t) => (
            <tr key={t.id}>
              <td style={cell}>{t.code}</td>
              <td style={cell}>{t.content}</td>
              <td style={cell}>{t.category?.name ?? "Khác"}</td>
              <td style={{ ...cell, textAlign: "right", color: t.type === "INCOME" ? "#16a34a" : "#ef4444" }}>
                {t.type === "INCOME" ? "+" : "-"}
                {formatVND(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", marginTop: 16 }}>
        Ứng dụng Quản lý chi tiêu @hettienbot
      </div>
    </div>
  );
});
PrintableReport.displayName = "PrintableReport";
