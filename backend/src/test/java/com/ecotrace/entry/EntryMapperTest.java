package com.ecotrace.entry;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.document.domain.Document.DocType;
import com.ecotrace.validation.ElectricityRules;
import com.ecotrace.validation.FuelRules;
import com.ecotrace.validation.ValidationIssue;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EntryMapperTest {

    private final EntryMapper mapper = new EntryMapper(new ElectricityRules(), new FuelRules());
    private final LocalDate start = LocalDate.of(2026, 7, 1);
    private final LocalDate end = LocalDate.of(2026, 9, 30);

    private static boolean hasError(List<ValidationIssue> issues, String code) {
        return issues.stream().anyMatch(i -> i.level() == ValidationIssue.Level.ERROR && i.code().equals(code));
    }

    @Test
    void prefillsElectricityFormFromAiDraftAndMapsReviewFields() {
        Map<String, Object> ai = Map.of("doc_type", "ELECTRICITY_BILL", "data", Map.of(
                "supplier", "EVN HCMC", "invoice_date", "2026-08-05", "quantity", 12500, "unit", "kWh",
                "review_fields", List.of("quantity")));
        Map<String, Object> form = mapper.formFromAi(DocType.ELECTRICITY_BILL, ai);

        assertThat(form).containsEntry("supplierName", "EVN HCMC").containsEntry("startDate", "2026-08-01")
                .containsEntry("endDate", "2026-08-05");
        assertThat((BigDecimal) form.get("totalKwh")).isEqualByComparingTo("12500");
        assertThat(mapper.aiReviewFields(ai)).containsExactly("quantity");
        assertThat(EntryMapper.docTypeOf(ai)).isEqualTo(DocType.ELECTRICITY_BILL);
    }

    @Test
    void electricityEntryBecomesKwhActivityOnTheBillEndDate() {
        Map<String, Object> form = Map.of("startDate", "2026-08-01", "endDate", "2026-08-31", "totalKwh", 12500);
        assertThat(mapper.validate(DocType.ELECTRICITY_BILL, form, start, end)).isEmpty();
        var a = mapper.toActivity(DocType.ELECTRICITY_BILL, form);
        assertThat(a.category()).isEqualTo(ActivityCategory.ELECTRICITY);
        assertThat(a.unit()).isEqualTo("kWh");
        assertThat(a.activityDate()).isEqualTo(LocalDate.of(2026, 8, 31));
    }

    @Test
    void rejectsDatesOutsideThePeriodAndNonPositiveQuantities() {
        Map<String, Object> form = Map.of("supplier", "Petrolimex", "date", "2026-10-02", "fuelType", "DIESEL", "quantity", 0);
        List<ValidationIssue> issues = mapper.validate(DocType.FUEL_INVOICE, form, start, end);
        assertThat(hasError(issues, "OUTSIDE_PERIOD")).isTrue();
        assertThat(hasError(issues, "NON_POSITIVE")).isTrue();
    }

    @Test
    void billOfLadingNeedsDistanceAndBecomesTonneKm() {
        Map<String, Object> form = new HashMap<>(Map.of("mode", "SEA", "weightKg", 12000, "date", "2026-09-10"));
        assertThat(hasError(mapper.validate(DocType.BILL_OF_LADING, form, start, end), "NON_POSITIVE")).isTrue();

        form.put("distanceKm", 17000);
        assertThat(mapper.validate(DocType.BILL_OF_LADING, form, start, end)).isEmpty();
        var a = mapper.toActivity(DocType.BILL_OF_LADING, form);
        assertThat(a.category()).isEqualTo(ActivityCategory.UPSTREAM_TRANSPORT);
        assertThat(a.quantity()).isEqualByComparingTo("204000"); // 12 tấn × 17.000 km
        assertThat(a.unit()).isEqualTo("tkm");
    }

    @Test
    void unknownMaterialUsesDefaultFactorWithAWarning() {
        Map<String, Object> form = Map.of("materialGroup", "Phụ kiện đóng gói", "quantityKg", 500, "date", "2026-07-20");
        List<ValidationIssue> issues = mapper.validate(DocType.MATERIAL_INVOICE, form, start, end);
        assertThat(issues).singleElement().satisfies(i -> {
            assertThat(i.level()).isEqualTo(ValidationIssue.Level.WARNING);
            assertThat(i.code()).isEqualTo("DEFAULT_FACTOR");
        });
        assertThat(EntryMapper.materialOf("Thép cuộn cán nóng")).isEqualTo("STEEL");
        assertThat(EntryMapper.materialOf("PAPER")).isEqualTo("PAPER");
        assertThat(EntryMapper.materialOf("MAT_PAPER Thùng carton")).isEqualTo("PAPER"); // "paper" chứa "pe" nhưng không phải nhựa
        assertThat(EntryMapper.materialOf("Hạt PE tái sinh")).isEqualTo("PLASTIC");
        assertThat(mapper.toActivity(DocType.MATERIAL_INVOICE, form).subCategory()).isEqualTo("GENERIC");
    }

    @Test
    void otherDocumentTypeCannotBeEntered() {
        assertThat(hasError(mapper.validate(DocType.OTHER, Map.of(), start, end), "UNSUPPORTED_DOC_TYPE")).isTrue();
    }

    @Test
    void readsVietnameseDayMonthYearDates() {
        assertThat(EntryMapper.parseDate("05/08/2026")).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(EntryMapper.parseDate("not a date")).isNull();
    }
}
