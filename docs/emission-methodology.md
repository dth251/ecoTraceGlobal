# Phương pháp tính phát thải – EcoTrace Global

Tài liệu chi tiết toàn hệ thống nằm ở [`../EcoTrace_Global.md`](../EcoTrace_Global.md) (mục 8: Engine tính phát thải, mục 9: Mô phỏng kịch bản, mục 10: Hộ chiếu xanh số).

## Tóm tắt công thức

1. **Dữ liệu hoạt động** được chuẩn hóa đơn vị qua `UnitConverter` (`MWh → kWh`, `t → kg`, `m³ → litre`, `tkm`).
2. **Phát thải (kg CO₂e) = Dữ liệu hoạt động đã chuẩn hóa × Hệ số phát thải (`emission_factor`)** — toàn bộ tính bằng `BigDecimal`.
3. **Phân bổ về sản phẩm (CBAM):**
   - Phát thải trực tiếp / tấn SP = Scope 1 phân bổ cho SP / Sản lượng SP
   - Phát thải gián tiếp / tấn SP = Điện tiêu thụ cho SP × EF lưới / Sản lượng SP
   - Phát thải tiền chất / tấn SP = Σ (khối lượng tiền chất / tấn SP × phát thải nhúng tiền chất)
   - Tổng phát thải nhúng = trực tiếp + gián tiếp + tiền chất.

