/** Tiện ích cho việc tải và xử lý nhiều chứng từ cùng lúc ở trang Trợ lý AI. */

export const MAX_FILES = 20;
export const MAX_FILE_MB = 20;
export const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

/** Chạy `worker` cho từng phần tử với tối đa `limit` tác vụ song song; kết quả giữ đúng thứ tự đầu vào. */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, lane));
  return results;
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** Lọc các file được thêm vào: đúng định dạng, không quá lớn, không trùng, không vượt số lượng tối đa. */
export function acceptFiles(incoming: File[], existing: File[]): { accepted: File[]; rejected: string[] } {
  const accepted: File[] = [];
  const rejected: string[] = [];
  for (const file of incoming) {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      rejected.push(`${file.name}: định dạng không hỗ trợ`);
    } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
      rejected.push(`${file.name}: lớn hơn ${MAX_FILE_MB}MB`);
    } else if ([...existing, ...accepted].some((f) => sameFile(f, file))) {
      rejected.push(`${file.name}: đã được chọn`);
    } else if (existing.length + accepted.length >= MAX_FILES) {
      rejected.push(`${file.name}: vượt quá ${MAX_FILES} chứng từ mỗi lần`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

const REVIEW_FIELD_LABELS: Record<string, string> = {
  distance_km: "quãng đường",
  weight_kg: "khối lượng",
  quantity: "số lượng",
  unit: "đơn vị",
  invoice_date: "ngày lập",
  factor_code: "mã hệ số",
  activity_type: "loại chứng từ",
  origin: "nơi đi",
  destination: "nơi đến",
  transport_mode: "phương thức vận chuyển",
  material_type: "loại nguyên liệu",
};

export const reviewFieldLabel = (field: string) => REVIEW_FIELD_LABELS[field] ?? field;

/** Hiển thị lượng phát thải: dưới 1.000 kg thì kg, còn lại thì tấn. */
export function formatEmission(kg: number): string {
  if (Math.abs(kg) >= 1000) {
    return `${(kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tCO₂e`;
  }
  return `${kg.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kgCO₂e`;
}
