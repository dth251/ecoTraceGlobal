-- V6__seed_emission_factors.sql
-- Hệ số phát thải tham chiếu ban đầu, lấy từ data/emission_factors_sample.csv (có ghi nguồn công bố).
-- Cần rà soát và cập nhật số chính thức hằng năm qua POST /admin/emission-factors/import.
INSERT INTO emission_factor (code, category, sub_category, region, value, unit_numerator, unit_denominator,
                             gas, source, source_year, valid_from, valid_to, version)
VALUES
    ('VN_GRID_2025', 'ELECTRICITY', 'GRID', 'VN', 0.65920000, 'kgCO2', 'kWh', 'CO2',
     'Hệ số phát thải lưới điện Việt Nam (Cục Biến đổi khí hậu công bố – cần đối chiếu số chính thức từng năm)',
     2025, DATE '2025-01-01', NULL, 1),
    ('DIESEL_STATIONARY', 'STATIONARY_FUEL', 'DIESEL', 'GLOBAL', 2.68000000, 'kgCO2e', 'litre', 'CO2e',
     'IPCC 2006 Guidelines Vol.2 Stationary Combustion', 2006, DATE '2000-01-01', NULL, 1),
    ('LPG_STATIONARY', 'STATIONARY_FUEL', 'LPG', 'GLOBAL', 1.51000000, 'kgCO2e', 'litre', 'CO2e',
     'IPCC 2006 Guidelines Vol.2 Stationary Combustion', 2006, DATE '2000-01-01', NULL, 1),
    ('DIESEL_MOBILE', 'MOBILE_FUEL', 'DIESEL', 'GLOBAL', 2.68000000, 'kgCO2e', 'litre', 'CO2e',
     'IPCC 2006 Guidelines Vol.2 Mobile Combustion', 2006, DATE '2000-01-01', NULL, 1),
    ('STEEL_HOT_ROLLED_DEFAULT', 'PURCHASED_MATERIAL', 'STEEL', 'GLOBAL', 1.90000000, 'kgCO2e', 'kg', 'CO2e',
     'EU CBAM transitional default values (minh họa – cần cập nhật theo phụ lục EU)', 2024, DATE '2024-01-01', NULL, 1),
    ('ROAD_FREIGHT_HGV', 'UPSTREAM_TRANSPORT', 'ROAD', 'GLOBAL', 0.09600000, 'kgCO2e', 'tkm', 'CO2e',
     'GLEC Framework / DEFRA average HGV', 2024, DATE '2024-01-01', NULL, 1),
    ('SEA_CONTAINER', 'DOWNSTREAM_TRANSPORT', 'SEA', 'GLOBAL', 0.01600000, 'kgCO2e', 'tkm', 'CO2e',
     'GLEC Framework container ship', 2024, DATE '2024-01-01', NULL, 1)
ON CONFLICT (code, version) DO NOTHING;
