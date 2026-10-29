// BẢN DỰNG LẠI TẠM THỜI (không phải bản gốc của tác giả frontend).
// Thư mục src/lib/ từng bị .gitignore ("lib/") loại khỏi repo nên CI không build được. Dựng lại từ cách các trang dùng
// và src/test/format.test.ts để CI chạy được. Tác giả frontend: hãy thay bằng bản gốc của bạn.
import { BASE, authHeaders } from "@/api/client";

export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await fetch(BASE + path, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Tải file thất bại (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
