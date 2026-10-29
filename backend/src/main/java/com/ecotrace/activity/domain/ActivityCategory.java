package com.ecotrace.activity.domain;

/**
 * Hạng mục dữ liệu hoạt động và ánh xạ sang Scope / đơn vị chuẩn (mục 6.4).
 */
public enum ActivityCategory {
    ELECTRICITY(2, null, "kWh"),
    STATIONARY_FUEL(1, null, "litre"),
    MOBILE_FUEL(1, null, "litre"),
    PROCESS(1, null, "kg"),
    PURCHASED_MATERIAL(3, (short) 1, "kg"),
    UPSTREAM_TRANSPORT(3, (short) 4, "tkm"),
    DOWNSTREAM_TRANSPORT(3, (short) 9, "tkm"),
    WASTE(3, (short) 5, "kg");

    private final short scope;
    private final Short scope3Category;
    private final String standardUnit;

    ActivityCategory(int scope, Short scope3Category, String standardUnit) {
        this.scope = (short) scope;
        this.scope3Category = scope3Category;
        this.standardUnit = standardUnit;
    }

    public short getScope() {
        return scope;
    }

    public Short getScope3Category() {
        return scope3Category;
    }

    public String getStandardUnit() {
        return standardUnit;
    }
}

