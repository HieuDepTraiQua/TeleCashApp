// Hằng số + kiểu dùng chung giữa bot, api, miniapp.
// SQLite không có enum nên ta dùng union string + validate bằng Zod ở tầng app.

export const TX_TYPES = ["INCOME", "EXPENSE"] as const;
export type TxType = (typeof TX_TYPES)[number];

export const TX_SOURCES = ["BOT", "MINIAPP"] as const;
export type TxSource = (typeof TX_SOURCES)[number];
