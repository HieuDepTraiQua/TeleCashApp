import { describe, it, expect } from "vitest";
import { verifyInitData, signInitData } from "./verifyInitData";

const TOKEN = "123456:TEST-TOKEN";
const now = Math.floor(Date.now() / 1000);
const user = JSON.stringify({ id: 42, first_name: "Hieu", username: "hieu" });

describe("verifyInitData", () => {
  it("chấp nhận initData ký đúng token", () => {
    const initData = signInitData({ user, auth_date: String(now), query_id: "abc" }, TOKEN);
    expect(verifyInitData(initData, TOKEN)?.user.id).toBe(42);
  });
  it("từ chối khi sai token", () => {
    const initData = signInitData({ user, auth_date: String(now) }, TOKEN);
    expect(verifyInitData(initData, "wrong:token")).toBeNull();
  });
  it("từ chối khi quá hạn", () => {
    const initData = signInitData({ user, auth_date: String(now - 100000) }, TOKEN);
    expect(verifyInitData(initData, TOKEN, 3600)).toBeNull();
  });
  it("từ chối khi thiếu hash / rỗng", () => {
    expect(verifyInitData("user=x&auth_date=1", TOKEN)).toBeNull();
    expect(verifyInitData("", TOKEN)).toBeNull();
  });
});
