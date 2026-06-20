import { describe, it, expect } from "vitest";
import { getPeriod, prevPeriod, buildBuckets, isoWeek, dateKey } from "./period";

describe("period", () => {
  it("isoWeek(15/06/2026) = 25 (khớp ảnh mẫu)", () => {
    expect(isoWeek(new Date(2026, 5, 15))).toBe(25);
  });

  it("week: Thứ 2 -> Chủ nhật, 7 cột, label đúng", () => {
    const p = getPeriod("week", new Date(2026, 5, 17)); // Thứ 4 17/06
    expect(dateKey(p.start)).toBe("2026-06-15"); // Thứ 2
    expect(dateKey(p.end)).toBe("2026-06-22");
    expect(p.label).toBe("Tuần 25, 2026");
    expect(buildBuckets(p, "day")).toHaveLength(7);
  });

  it("month: đủ tháng", () => {
    const p = getPeriod("month", new Date(2026, 5, 17));
    expect(dateKey(p.start)).toBe("2026-06-01");
    expect(dateKey(p.end)).toBe("2026-07-01");
    expect(p.label).toBe("Tháng 06/2026");
  });

  it("year: 12 cột tháng", () => {
    const p = getPeriod("year", new Date(2026, 5, 17));
    expect(dateKey(p.start)).toBe("2026-01-01");
    expect(p.label).toBe("Năm 2026");
    expect(buildBuckets(p, "month")).toHaveLength(12);
  });

  it("prevPeriod tháng = tháng trước", () => {
    const prev = prevPeriod("month", getPeriod("month", new Date(2026, 5, 17)));
    expect(dateKey(prev.start)).toBe("2026-05-01");
    expect(dateKey(prev.end)).toBe("2026-06-01");
  });
});
