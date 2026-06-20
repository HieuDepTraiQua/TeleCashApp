import { describe, it, expect } from "vitest";
import { formatVND } from "./index";

describe("formatVND", () => {
  it("định dạng có dấu chấm ngăn cách nghìn + hậu tố đ", () => {
    expect(formatVND(1500000)).toBe("1.500.000đ");
    expect(formatVND(50000)).toBe("50.000đ");
    expect(formatVND(0)).toBe("0đ");
  });
});
