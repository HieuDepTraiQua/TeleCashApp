import { describe, it, expect } from "vitest";
import { parseMessage, parseAmount } from "./parser";

const NOW = new Date(2026, 5, 15); // 15/06/2026 (local)
const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe("parseAmount", () => {
  const cases: [string, number | null][] = [
    ["50k", 50000],
    ["500k", 500000],
    ["1m", 1000000],
    ["1tr", 1000000],
    ["1m5", 1500000],
    ["1.5m", 1500000],
    ["1tr5", 1500000],
    ["10m", 10000000],
    ["1k5", 1500],
    ["35.000", 35000],
    ["35000", 35000],
    ["1.500.000", 1500000],
    ["abc", null],
    ["", null],
  ];
  it.each(cases)("parseAmount(%j) -> %j", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe("parseMessage", () => {
  it("chi tiêu cơ bản: 50k ăn trưa", () => {
    const r = parseMessage("50k ăn trưa", NOW)!;
    expect(r.type).toBe("EXPENSE");
    expect(r.amount).toBe(50000);
    expect(r.content).toBe("ăn trưa");
    expect(ymd(r.date)).toEqual(ymd(NOW));
    expect(r.note).toBeNull();
  });

  it("thu nhập: +10m lương tháng", () => {
    const r = parseMessage("+10m lương tháng", NOW)!;
    expect(r.type).toBe("INCOME");
    expect(r.amount).toBe(10000000);
    expect(r.content).toBe("lương tháng");
  });

  it("ngày cụ thể: 12/06 1m5 đóng tiền nhà", () => {
    const r = parseMessage("12/06 1m5 đóng tiền nhà", NOW)!;
    expect(r.amount).toBe(1500000);
    expect(ymd(r.date)).toEqual([2026, 6, 12]);
    expect(r.content).toBe("đóng tiền nhà");
  });

  it("ghi chú trong ngoặc: 500k siêu thị (mua đồ cả tuần)", () => {
    const r = parseMessage("500k siêu thị (mua đồ cả tuần)", NOW)!;
    expect(r.amount).toBe(500000);
    expect(r.content).toBe("siêu thị");
    expect(r.note).toBe("mua đồ cả tuần");
  });

  it("nội dung nhiều từ: 35k gửi xe ô tô Mỹ Đình", () => {
    const r = parseMessage("35k gửi xe ô tô Mỹ Đình", NOW)!;
    expect(r.amount).toBe(35000);
    expect(r.content).toBe("gửi xe ô tô Mỹ Đình");
  });

  it("số thuần có dấu chấm: 1.500.000 tiền học", () => {
    const r = parseMessage("1.500.000 tiền học", NOW)!;
    expect(r.amount).toBe(1500000);
    expect(r.content).toBe("tiền học");
  });

  it("1k5 trà đá", () => {
    const r = parseMessage("1k5 trà đá", NOW)!;
    expect(r.amount).toBe(1500);
    expect(r.content).toBe("trà đá");
  });

  it("không có số tiền -> null", () => {
    expect(parseMessage("ăn trưa ngon", NOW)).toBeNull();
    expect(parseMessage("", NOW)).toBeNull();
  });
});
