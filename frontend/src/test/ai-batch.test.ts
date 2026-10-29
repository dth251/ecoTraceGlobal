import { describe, expect, it } from "vitest";
import { acceptFiles, formatEmission, MAX_FILES, reviewFieldLabel, runWithConcurrency } from "@/pages/ai/batch";

const file = (name: string, size = 1000, lastModified = 1) => new File([new Uint8Array(size)], name, { lastModified });

describe("runWithConcurrency", () => {
  it("giữ đúng thứ tự kết quả và không vượt giới hạn song song", async () => {
    let running = 0;
    let peak = 0;
    const out = await runWithConcurrency([30, 5, 20, 1, 10], 2, async (ms, i) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, ms));
      running--;
      return `#${i}`;
    });
    expect(out).toEqual(["#0", "#1", "#2", "#3", "#4"]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("xử lý danh sách rỗng", async () => {
    expect(await runWithConcurrency([], 2, async () => 1)).toEqual([]);
  });
});

describe("acceptFiles", () => {
  it("nhận ảnh và PDF hợp lệ, từ chối định dạng lạ, file quá lớn và file trùng", () => {
    const first = file("dien.png");
    const { accepted, rejected } = acceptFiles(
      [file("dien.png"), file("van-don.PDF", 10, 2), file("ghi-chu.txt"), file("to-lon.jpg", 21 * 1024 * 1024), file("a.png", 5, 3)],
      [first],
    );
    expect(accepted.map((f) => f.name)).toEqual(["van-don.PDF", "a.png"]);
    expect(rejected).toHaveLength(3);
    expect(rejected[0]).toContain("đã được chọn");
  });

  it("không vượt quá số chứng từ tối đa", () => {
    const many = Array.from({ length: MAX_FILES + 3 }, (_, i) => file(`f${i}.png`, 10, i));
    const { accepted, rejected } = acceptFiles(many, []);
    expect(accepted).toHaveLength(MAX_FILES);
    expect(rejected).toHaveLength(3);
  });
});

describe("hiển thị", () => {
  it("định dạng lượng phát thải theo ngưỡng 1.000 kg", () => {
    expect(formatEmission(500)).toContain("kgCO₂e");
    expect(formatEmission(44790)).toContain("tCO₂e");
  });

  it("dịch tên trường cần xác nhận, giữ nguyên trường lạ", () => {
    expect(reviewFieldLabel("distance_km")).toBe("quãng đường");
    expect(reviewFieldLabel("khac")).toBe("khac");
  });
});
