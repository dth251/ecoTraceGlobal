-- Hệ số lưới điện Việt Nam theo số công bố (phiên bản 2, thay giá trị làm tròn 0.66 của V6 từ 2025-01-01).
-- Bộ chọn hệ số ưu tiên phiên bản mới nhất còn hiệu lực tại ngày hoạt động.
INSERT INTO emission_factor (code, category, sub_category, region, value, unit_numerator, unit_denominator,
                             gas, source, source_year, valid_from, valid_to, version)
VALUES ('ELEC_GRID_VN', 'ELECTRICITY', 'GRID', 'VN', 0.65920000, 'kgCO2e', 'kWh', 'CO2e',
        'Hệ số phát thải lưới điện Việt Nam (Cục Biến đổi khí hậu công bố – cần đối chiếu số chính thức từng năm)',
        2025, DATE '2025-01-01', NULL, 2)
ON CONFLICT (code, version) DO NOTHING;
