import { authHeaders, BASE } from "@/api/client";
import { toast } from "sonner";

/** Tải file có kèm token (không thể dùng thẻ <a> trực tiếp vì cần header Authorization) */
export async function downloadFile(path: string, filename: string): Promise<void> {
  try {
    const res = await fetch(BASE + path, { headers: authHeaders() });
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error(filename);
  }
}
