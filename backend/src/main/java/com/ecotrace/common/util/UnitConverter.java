package com.ecotrace.common.util;

import com.ecotrace.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.Locale;
import java.util.Map;

/**
 * Chuẩn hóa đơn vị về đơn vị chuẩn của từng hạng mục (mục 6.4, 8.3).
 * Sai đơn vị là lỗi phổ biến nhất nên lớp này phải có test riêng.
 * Mọi phép tính dùng {@link BigDecimal}.
 */
@Component
public class UnitConverter {

    /** Hệ số quy đổi về đơn vị gốc theo nhóm đại lượng. */
    private static final Map<String, Conversion> CONVERSIONS = Map.ofEntries(
            // Năng lượng → kWh
            Map.entry("kwh", new Conversion(Dimension.ENERGY, "1")),
            Map.entry("mwh", new Conversion(Dimension.ENERGY, "1000")),
            Map.entry("gwh", new Conversion(Dimension.ENERGY, "1000000")),
            // Khối lượng → kg
            Map.entry("g", new Conversion(Dimension.MASS, "0.001")),
            Map.entry("kg", new Conversion(Dimension.MASS, "1")),
            Map.entry("t", new Conversion(Dimension.MASS, "1000")),
            Map.entry("tonne", new Conversion(Dimension.MASS, "1000")),
            Map.entry("tấn", new Conversion(Dimension.MASS, "1000")),
            // Thể tích → litre
            Map.entry("l", new Conversion(Dimension.VOLUME, "1")),
            Map.entry("litre", new Conversion(Dimension.VOLUME, "1")),
            Map.entry("liter", new Conversion(Dimension.VOLUME, "1")),
            Map.entry("lít", new Conversion(Dimension.VOLUME, "1")),
            Map.entry("m3", new Conversion(Dimension.VOLUME, "1000")),
            Map.entry("m³", new Conversion(Dimension.VOLUME, "1000")),
            // Vận tải → tkm
            Map.entry("tkm", new Conversion(Dimension.FREIGHT, "1")),
            Map.entry("kgkm", new Conversion(Dimension.FREIGHT, "0.001"))
    );

    public enum Dimension { ENERGY, MASS, VOLUME, FREIGHT }

    private record Conversion(Dimension dimension, BigDecimal toBase) {
        Conversion(Dimension dimension, String toBase) {
            this(dimension, new BigDecimal(toBase));
        }
    }

    /**
     * Quy đổi {@code value} từ {@code fromUnit} sang {@code toUnit}.
     *
     * @throws ApiException UNIT_NOT_CONVERTIBLE nếu không cùng nhóm đại lượng hoặc đơn vị không hỗ trợ
     */
    public BigDecimal convert(BigDecimal value, String fromUnit, String toUnit) {
        Conversion from = lookup(fromUnit);
        Conversion to = lookup(toUnit);
        if (from.dimension() != to.dimension()) {
            throw notConvertible(fromUnit, toUnit);
        }
        if (from.toBase().compareTo(to.toBase()) == 0) {
            return value;
        }
        return value.multiply(from.toBase()).divide(to.toBase(), MathContext.DECIMAL128).stripTrailingZeros();
    }

    public boolean isSupported(String unit) {
        return unit != null && CONVERSIONS.containsKey(normalize(unit));
    }

    public Dimension dimensionOf(String unit) {
        return lookup(unit).dimension();
    }

    private Conversion lookup(String unit) {
        Conversion c = unit == null ? null : CONVERSIONS.get(normalize(unit));
        if (c == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNIT_NOT_SUPPORTED", "Unsupported unit: " + unit,
                    Map.of("unit", String.valueOf(unit)));
        }
        return c;
    }

    private static String normalize(String unit) {
        return unit.trim().toLowerCase(Locale.ROOT).replace("·", "").replace(" ", "");
    }

    private static ApiException notConvertible(String from, String to) {
        return new ApiException(HttpStatus.BAD_REQUEST, "UNIT_NOT_CONVERTIBLE",
                "Cannot convert " + from + " to " + to, Map.of("from", from, "to", to));
    }
}

