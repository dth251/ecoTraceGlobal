package com.ecotrace.importer;

import com.ecotrace.importer.template.TemplateGenerator;
import com.ecotrace.importer.template.TemplateType;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;

class ExcelRowReaderTest {

    @Test
    void templateGeneratorCreatesValidXlsxForAllFiveTypes() throws Exception {
        TemplateGenerator gen = new TemplateGenerator();
        for (TemplateType type : TemplateType.values()) {
            byte[] bytes = gen.generate(type);
            try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
                assertThat(wb.getSheet("Data").getRow(0).getPhysicalNumberOfCells()).isGreaterThanOrEqualTo(3);
            }
        }
    }
}

