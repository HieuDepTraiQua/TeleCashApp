import { normalize } from "@telecash/core";
import { prisma } from "./index";

interface SeedCat {
  name: string;
  icon: string;
  type: "INCOME" | "EXPENSE";
  keywords: string[];
}

// Danh mục + từ khóa mặc định (user có thể sửa/thêm ở tab Từ khóa - P7).
// "Khác" / "Thu nhập khác" là fallback (không có từ khóa).
const DEFAULTS: SeedCat[] = [
  {
    name: "Ăn uống", icon: "🍴", type: "EXPENSE",
    keywords: ["ăn", "uống", "ăn sáng", "ăn trưa", "ăn tối", "ăn vặt", "cơm", "phở", "bún", "mì", "cháo", "cà phê", "cafe", "trà sữa", "trà đá", "nước ép", "nước ngọt", "bia", "nhậu", "quán ăn", "nhà hàng", "đồ ăn", "lẩu", "nướng", "buffet", "bánh"],
  },
  {
    name: "Đi lại", icon: "🚗", type: "EXPENSE",
    keywords: ["gửi xe", "đổ xăng", "xăng", "dầu", "grab", "be", "taxi", "xe ôm", "xe bus", "xe buýt", "vé xe", "rửa xe", "bến xe", "đi lại", "gọi xe", "vé tàu", "vé máy bay"],
  },
  {
    name: "Mua sắm", icon: "🛒", type: "EXPENSE",
    keywords: ["mua", "siêu thị", "quần áo", "giày", "dép", "túi", "shopee", "lazada", "tiki", "đồ dùng", "mỹ phẩm", "đồ gia dụng"],
  },
  {
    name: "Hóa đơn & Tiện ích", icon: "🧾", type: "EXPENSE",
    keywords: ["tiền điện", "tiền nước", "điện", "hóa đơn", "internet", "wifi", "mạng", "cước", "điện thoại", "gas", "truyền hình"],
  },
  {
    name: "Nhà cửa", icon: "🏠", type: "EXPENSE",
    keywords: ["tiền nhà", "thuê nhà", "thuê phòng", "sửa nhà", "nội thất"],
  },
  {
    name: "Y tế", icon: "💊", type: "EXPENSE",
    keywords: ["thuốc", "khám", "bệnh viện", "viện phí", "bác sĩ", "nha khoa", "răng", "xét nghiệm"],
  },
  {
    name: "Bảo hiểm", icon: "🛡️", type: "EXPENSE",
    keywords: ["bảo hiểm", "bhxh", "bhyt", "bhtn"],
  },
  {
    name: "Sức khỏe & Thể thao", icon: "🏃", type: "EXPENSE",
    keywords: ["gym", "yoga", "thể thao", "vitamin", "cầu lông", "bơi", "chạy bộ", "pt"],
  },
  {
    name: "Giáo dục", icon: "📚", type: "EXPENSE",
    keywords: ["học phí", "khóa học", "sách", "gia sư", "tiền học", "đi học"],
  },
  {
    name: "Giải trí", icon: "🎮", type: "EXPENSE",
    keywords: ["phim", "xem phim", "game", "du lịch", "netflix", "spotify", "karaoke", "vé xem"],
  },
  {
    name: "Gia đình", icon: "👨‍👩‍👧", type: "EXPENSE",
    keywords: ["sinh hoạt phí", "biếu", "hiếu hỉ", "ma chay", "cưới", "con cái"],
  },
  { name: "Khác", icon: "📦", type: "EXPENSE", keywords: [] },
  {
    name: "Lương", icon: "💰", type: "INCOME",
    keywords: ["lương", "tiền lương", "thưởng", "lương tháng"],
  },
  {
    name: "Thu nhập khác", icon: "➕", type: "INCOME",
    keywords: ["lãi", "tiền lãi", "lì xì", "bán", "hoàn tiền", "hoa hồng", "thưởng tết"],
  },
];

/** Seed danh mục + từ khóa mặc định cho 1 user (gọi 1 lần khi user mới). */
export async function seedDefaultCategories(userId: string): Promise<void> {
  for (const c of DEFAULTS) {
    await prisma.category.create({
      data: {
        userId,
        name: c.name,
        icon: c.icon,
        type: c.type,
        keywords: { create: c.keywords.map((t) => ({ text: t, normalized: normalize(t) })) },
      },
    });
  }
}
