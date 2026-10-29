package com.ecotrace.emissionfactor;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.emissionfactor.domain.EmissionFactor;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Tag(name = "Emission Factors")
@RestController
public class EmissionFactorController {

    private final EmissionFactorRepository repository;
    private final EmissionFactorImporter importer;

    public EmissionFactorController(EmissionFactorRepository repository, EmissionFactorImporter importer) {
        this.repository = repository;
        this.importer = importer;
    }

    @GetMapping("/emission-factors")
    public List<EmissionFactor> list(@RequestParam(required = false) ActivityCategory category,
                                     @RequestParam(required = false) String region,
                                     @RequestParam(required = false) Integer year) {
        return repository.findAll().stream()
                .filter(ef -> category == null || ef.getCategory() == category)
                .filter(ef -> region == null || ef.getRegion().equalsIgnoreCase(region))
                .filter(ef -> year == null || ef.getSourceYear() == year)
                .toList();
    }

    @PostMapping(path = "/admin/emission-factors/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public Map<String, Object> importCsv(@RequestPart("file") MultipartFile file) {
        return importer.importCsv(file);
    }
}

