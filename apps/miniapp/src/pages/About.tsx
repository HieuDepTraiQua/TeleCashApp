import { useMe } from "../hooks";

export function About() {
  const me = useMe();
  const u = me.data?.user;

  return (
    <div className="p-3 space-y-3">
      <div className="text-center font-bold text-blue-600">ℹ️ VỀ ỨNG DỤNG</div>

      <div className="bg-white rounded-xl p-4 shadow-sm text-center">
        <div className="text-4xl">🐷</div>
        <div className="font-semibold mt-1">TeleCashApp</div>
        <div className="text-xs text-slate-400">Quản lý chi tiêu qua Telegram · @hettienbot</div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm text-sm space-y-1">
        <div className="font-semibold text-slate-500 text-xs mb-1">TÀI KHOẢN</div>
        <div>
          Tên: {u?.firstName ?? "—"} {u?.username ? `(@${u.username})` : ""}
        </div>
        <div>Google Drive: {u?.googleConnected ? "✅ Đã kết nối" : "❌ Chưa kết nối — gõ /ketnoi trong bot"}</div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm text-sm">
        <div className="font-semibold text-slate-500 text-xs mb-2">CÚ PHÁP NHẬP NHANH (qua bot)</div>
        <ul className="space-y-1 text-xs text-slate-600">
          <li>
            • <code className="bg-slate-100 px-1 rounded">50k ăn trưa</code> — chi tiêu hôm nay
          </li>
          <li>
            • <code className="bg-slate-100 px-1 rounded">12/06 1m5 tiền nhà</code> — theo ngày
          </li>
          <li>
            • <code className="bg-slate-100 px-1 rounded">500k chợ (cả tuần)</code> — kèm ghi chú
          </li>
          <li>
            • <code className="bg-slate-100 px-1 rounded">+10m lương</code> — thu nhập
          </li>
          <li>
            • <code className="bg-slate-100 px-1 rounded">k</code> = nghìn, <code className="bg-slate-100 px-1 rounded">m</code> = triệu
          </li>
        </ul>
      </div>
    </div>
  );
}
