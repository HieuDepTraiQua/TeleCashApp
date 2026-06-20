import { createHmac } from "node:crypto";

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface VerifiedInitData {
  user: TgUser;
  authDate: number;
}

/**
 * Xác thực Telegram Mini App initData bằng HMAC (bot token).
 * Thuật toán: data_check_string = các cặp (trừ hash) sort theo key nối bằng \n;
 * secret = HMAC_SHA256(key="WebAppData", msg=botToken);
 * hợp lệ khi hex(HMAC_SHA256(key=secret, msg=data_check_string)) === hash.
 * Trả user nếu hợp lệ, null nếu sai chữ ký / quá hạn / thiếu user.
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86400,
): VerifiedInitData | null {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.keys()]
    .sort()
    .map((k) => `${k}=${params.get(k)}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computed !== hash) return null;

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Number.isNaN(authDate)) return null;
  if (maxAgeSec > 0 && Date.now() / 1000 - authDate > maxAgeSec) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as TgUser;
    if (typeof user.id !== "number") return null;
    return { user, authDate };
  } catch {
    return null;
  }
}

/** Tạo initData hợp lệ — CHỈ dùng cho test/smoke. */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.keys()]
    .sort()
    .map((k) => `${k}=${params.get(k)}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.append("hash", hash);
  return params.toString();
}
