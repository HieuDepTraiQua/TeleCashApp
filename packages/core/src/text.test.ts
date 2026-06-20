import { describe, it, expect } from "vitest";
import { normalize, removeDiacritics } from "./text";

describe("removeDiacritics / normalize", () => {
  it("bỏ dấu tiếng Việt + đ", () => {
    expect(removeDiacritics("đồ ăn")).toBe("do an");
    expect(removeDiacritics("Gửi Xe Ô Tô")).toBe("Gui Xe O To");
  });
  it("normalize: thường + bỏ dấu + gộp space", () => {
    expect(normalize("Ăn  Uống")).toBe("an uong");
    expect(normalize("  Trà Sữa ")).toBe("tra sua");
  });
});
