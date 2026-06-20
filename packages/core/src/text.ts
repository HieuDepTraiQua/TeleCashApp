/** Bỏ dấu tiếng Việt: "Gửi Xe Ô Tô" -> "Gui Xe O To" (đ/Đ xử lý riêng vì NFD không tách). */
export function removeDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Chuẩn hóa để so khớp: thường + bỏ dấu + gộp khoảng trắng. "Ăn  Uống" -> "an uong". */
export function normalize(s: string): string {
  return removeDiacritics(s.toLowerCase()).replace(/\s+/g, " ").trim();
}
