import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("escape dấu phẩy / nháy kép + BOM + CRLF", () => {
    const out = toCsv(["A", "B"], [["x", "y,z"], ['a"b', 1]], { bom: true });
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain('"y,z"');
    expect(out).toContain('"a""b"');
    expect(out.replace("﻿", "").split("\r\n")).toHaveLength(3);
  });
});
