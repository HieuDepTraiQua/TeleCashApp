import { describe, it, expect } from "vitest";
import { categorize, type KeywordEntry } from "./categorizer";

const KW: KeywordEntry[] = [
  { categoryId: "food", normalized: "an", type: "EXPENSE" },
  { categoryId: "food", normalized: "uong", type: "EXPENSE" },
  { categoryId: "food", normalized: "tra sua", type: "EXPENSE" },
  { categoryId: "move", normalized: "gui xe", type: "EXPENSE" },
  { categoryId: "health", normalized: "thuoc", type: "EXPENSE" },
  { categoryId: "shop", normalized: "mua", type: "EXPENSE" },
  { categoryId: "salary", normalized: "luong", type: "INCOME" },
];

describe("categorize", () => {
  it("3 ví dụ của user đều vào Ăn uống", () => {
    expect(categorize("an uong", KW, "EXPENSE")).toBe("food");
    expect(categorize("ăn gà", KW, "EXPENSE")).toBe("food");
    expect(categorize("uống trà sữa", KW, "EXPENSE")).toBe("food");
  });
  it("khớp từ khóa nhiều từ", () => {
    expect(categorize("gửi xe ô tô Mỹ Đình", KW, "EXPENSE")).toBe("move");
  });
  it("ưu tiên từ khóa dài hơn: 'mua thuốc' -> Y tế chứ không phải Mua sắm", () => {
    expect(categorize("mua thuốc cảm", KW, "EXPENSE")).toBe("health");
  });
  it("lọc theo loại: nội dung INCOME không dính từ khóa EXPENSE", () => {
    expect(categorize("lương tháng", KW, "INCOME")).toBe("salary");
    expect(categorize("ăn", KW, "INCOME")).toBeNull();
  });
  it("không khớp -> null", () => {
    expect(categorize("xyz không có gì", KW, "EXPENSE")).toBeNull();
  });
  it("không match nhầm chuỗi con: 'bàn làm việc' không phải Ăn uống", () => {
    expect(categorize("bàn làm việc", KW, "EXPENSE")).toBeNull();
  });
});
