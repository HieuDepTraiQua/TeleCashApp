import { useState } from "react";
import { BottomNav, type TabKey } from "./components/BottomNav";
import { Transactions } from "./pages/Transactions";
import { Reports } from "./pages/Reports";
import { Search } from "./pages/Search";
import { Keywords } from "./pages/Keywords";
import { About } from "./pages/About";
import { isTelegram } from "./lib/telegram";

export default function App() {
  const [tab, setTab] = useState<TabKey>("tx");

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto overflow-x-hidden">
      {!isTelegram && (
        <div className="bg-amber-100 text-amber-800 text-xs text-center p-2">
          ⚠️ Mở app này từ trong Telegram (@hettienbot) để có dữ liệu của bạn.
        </div>
      )}

      {tab === "tx" && <Transactions />}
      {tab === "report" && <Reports />}
      {tab === "search" && <Search />}
      {tab === "keywords" && <Keywords />}
      {tab === "about" && <About />}

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
