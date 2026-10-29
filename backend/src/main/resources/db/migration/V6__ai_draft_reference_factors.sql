-- Bản nháp AI bóc tách của chứng từ: chỉ là gợi ý, chưa tính vào kiểm kê cho tới khi người dùng xác nhận (lưu nhập liệu)
ALTER TABLE document ADD COLUMN ai_extraction JSONB;

-- Hệ số phát thải THAM KHẢO cho bản demo (cùng giá trị với ai-service/app/demo/demo_factors.py).
-- Chưa phải bộ hệ số chính thức: khi có bộ hệ số có trích dẫn (MONRE, IPCC, DEFRA...) thì nhập phiên bản mới (version 2).
-- GENERIC là giá trị mặc định khi không xác định được loại nguyên liệu, được tính là "dữ liệu mặc định" chứ không phải dữ liệu thực tế.
INSERT INTO emission_factor (code, category, sub_category, region, value, unit_numerator, unit_denominator, source, source_year, valid_from) VALUES
  ('ELEC_GRID_VN',          'ELECTRICITY',          'GRID',      'VN',     0.66,  'kgCO2e', 'kWh',   'Hệ số lưới điện Việt Nam (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FUEL_DIESEL_STAT',      'STATIONARY_FUEL',      'DIESEL',    'GLOBAL', 2.68,  'kgCO2e', 'litre', 'IPCC 2006 (tham khảo, bản demo)', 2006, '2020-01-01'),
  ('FUEL_PETROL_STAT',      'STATIONARY_FUEL',      'PETROL',    'GLOBAL', 2.31,  'kgCO2e', 'litre', 'IPCC 2006 (tham khảo, bản demo)', 2006, '2020-01-01'),
  ('FUEL_LPG_STAT',         'STATIONARY_FUEL',      'LPG',       'GLOBAL', 2.94,  'kgCO2e', 'kg',    'DEFRA (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FUEL_NATGAS_STAT',      'STATIONARY_FUEL',      'NATGAS',    'GLOBAL', 2.02,  'kgCO2e', 'm3',    'DEFRA (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FUEL_COAL_STAT',        'STATIONARY_FUEL',      'COAL',      'GLOBAL', 2.42,  'kgCO2e', 'kg',    'IPCC 2006 (tham khảo, bản demo)', 2006, '2020-01-01'),
  ('FUEL_DIESEL_MOB',       'MOBILE_FUEL',          'DIESEL',    'GLOBAL', 2.68,  'kgCO2e', 'litre', 'IPCC 2006 (tham khảo, bản demo)', 2006, '2020-01-01'),
  ('FUEL_PETROL_MOB',       'MOBILE_FUEL',          'PETROL',    'GLOBAL', 2.31,  'kgCO2e', 'litre', 'IPCC 2006 (tham khảo, bản demo)', 2006, '2020-01-01'),
  ('MAT_STEEL',             'PURCHASED_MATERIAL',   'STEEL',     'GLOBAL', 1.9,   'kgCO2e', 'kg',    'Tham khảo ngành thép (bản demo)', 2023, '2020-01-01'),
  ('MAT_PLASTIC',           'PURCHASED_MATERIAL',   'PLASTIC',   'GLOBAL', 2.5,   'kgCO2e', 'kg',    'Tham khảo nhựa nguyên sinh (bản demo)', 2023, '2020-01-01'),
  ('MAT_PAPER',             'PURCHASED_MATERIAL',   'PAPER',     'GLOBAL', 1.1,   'kgCO2e', 'kg',    'Tham khảo giấy/carton (bản demo)', 2023, '2020-01-01'),
  ('MAT_COTTON',            'PURCHASED_MATERIAL',   'COTTON',    'GLOBAL', 5.9,   'kgCO2e', 'kg',    'Tham khảo sợi bông (bản demo)', 2023, '2020-01-01'),
  ('MAT_GENERIC',           'PURCHASED_MATERIAL',   'GENERIC',   'GLOBAL', 2.0,   'kgCO2e', 'kg',    'Giá trị mặc định (bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_SEA_UP',        'UPSTREAM_TRANSPORT',   'SEA',       'GLOBAL', 0.016, 'kgCO2e', 'tkm',   'DEFRA container (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_ROAD_UP',       'UPSTREAM_TRANSPORT',   'ROAD',      'GLOBAL', 0.107, 'kgCO2e', 'tkm',   'DEFRA HGV (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_AIR_UP',        'UPSTREAM_TRANSPORT',   'AIR',       'GLOBAL', 1.13,  'kgCO2e', 'tkm',   'DEFRA air freight (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_RAIL_UP',       'UPSTREAM_TRANSPORT',   'RAIL',      'GLOBAL', 0.028, 'kgCO2e', 'tkm',   'DEFRA rail (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_SEA_DOWN',      'DOWNSTREAM_TRANSPORT', 'SEA',       'GLOBAL', 0.016, 'kgCO2e', 'tkm',   'DEFRA container (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_ROAD_DOWN',     'DOWNSTREAM_TRANSPORT', 'ROAD',      'GLOBAL', 0.107, 'kgCO2e', 'tkm',   'DEFRA HGV (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_AIR_DOWN',      'DOWNSTREAM_TRANSPORT', 'AIR',       'GLOBAL', 1.13,  'kgCO2e', 'tkm',   'DEFRA air freight (tham khảo, bản demo)', 2023, '2020-01-01'),
  ('FREIGHT_RAIL_DOWN',     'DOWNSTREAM_TRANSPORT', 'RAIL',      'GLOBAL', 0.028, 'kgCO2e', 'tkm',   'DEFRA rail (tham khảo, bản demo)', 2023, '2020-01-01')
ON CONFLICT (code, version) DO NOTHING;
