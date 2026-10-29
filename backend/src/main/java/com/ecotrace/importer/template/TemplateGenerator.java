package com.ecotrace.importer.template;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/** Tạo file Excel mẫu có sẵn cột theo mục 7.3. */
@Component
public class TemplateGenerator {

    private static final Map<TemplateType, List<String>> COLUMNS = Map.of(
            TemplateType.ELECTRICITY, List.of("from_date", "to_date", "kwh", "meter_code", "note"),
            TemplateType.FUEL, List.of("date", "fuel_type", "usage", "quantity", "unit", "supplier", "invoice_no"),
            TemplateType.MATERIAL, List.of("date", "material_group", "description", "quantity", "unit", "supplier", "origin_country", "invoice_no"),
            TemplateType.TRANSPORT, List.of("date", "direction", "mode", "origin", "destination", "weight_kg", "distance_km"),
            TemplateType.PRODUCTION, List.of("product_code", "quantity", "unit")
    );

    public byte[] generate(TemplateType type) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet data = wb.createSheet("Data");
            Row header = data.createRow(0);
            List<String> cols = COLUMNS.get(type);
            for (int i = 0; i < cols.size(); i++) {
                header.createCell(i).setCellValue(cols.get(i));
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot generate template " + type, e);
        }
    }

    public static void main(String[] args) throws IOException {
        java.nio.file.Path outDir = java.nio.file.Paths.get(args.length > 0 ? args[0] : "src/main/resources/import-templates");
        java.nio.file.Files.createDirectories(outDir);
        TemplateGenerator gen = new TemplateGenerator();
        for (TemplateType t : TemplateType.values()) {
            java.nio.file.Files.write(outDir.resolve(t.name().toLowerCase() + ".xlsx"), gen.generate(t));
        }
    }
}

