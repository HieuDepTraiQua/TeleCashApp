import { useState } from "react";
import { useCategoriesFull, useKeywordMutations } from "../hooks";

export function Keywords() {
  const cats = useCategoriesFull();
  const m = useKeywordMutations();
  const [draft, setDraft] = useState<Record<string, string>>({});

  function add(categoryId: string) {
    const text = (draft[categoryId] ?? "").trim();
    if (!text) return;
    m.addKeyword.mutate({ categoryId, text });
    setDraft((d) => ({ ...d, [categoryId]: "" }));
  }

  const list = cats.data?.categories ?? [];

  return (
    <div className="p-3 space-y-3">
      <div className="text-center font-bold text-blue-600">🏷️ TỪ KHÓA & DANH MỤC</div>
      <div className="text-xs text-slate-400 text-center">Thêm từ khóa để bot tự phân loại chính xác hơn.</div>
      {cats.isError && <div className="text-center text-red-400 py-4 text-sm">Mở app từ trong Telegram.</div>}

      {list.map((c) => (
        <div key={c.id} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="font-semibold text-sm mb-2">
            {c.icon} {c.name} <span className="text-[10px] text-slate-400">({c.type === "INCOME" ? "thu" : "chi"})</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {c.keywords.map((k) => (
              <span key={k.id} className="bg-slate-100 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                {k.text}
                <button onClick={() => m.deleteKeyword.mutate(k.id)} className="text-slate-400 leading-none">
                  ×
                </button>
              </span>
            ))}
            {c.keywords.length === 0 && <span className="text-xs text-slate-300">chưa có từ khóa</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={draft[c.id] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") add(c.id);
              }}
              placeholder="thêm từ khóa…"
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            />
            <button onClick={() => add(c.id)} className="bg-blue-600 text-white rounded-lg px-3 text-sm">
              Thêm
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
