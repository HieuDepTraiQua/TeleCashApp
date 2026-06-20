export type TabKey = "tx" | "report" | "search" | "keywords" | "about";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "tx", label: "Giao dịch", icon: "🔄" },
  { key: "report", label: "Báo cáo", icon: "📊" },
  { key: "search", label: "Tìm kiếm", icon: "🔍" },
  { key: "keywords", label: "Từ khóa", icon: "🏷️" },
  { key: "about", label: "Về app", icon: "👤" },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 flex justify-around py-1.5">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex flex-col items-center text-[11px] px-2 leading-tight ${
            active === t.key ? "text-blue-600 font-semibold" : "text-slate-400"
          }`}
        >
          <span className="text-lg">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
