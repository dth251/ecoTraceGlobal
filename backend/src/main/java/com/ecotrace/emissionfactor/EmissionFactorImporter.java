package com.ecotrace.emissionfactor;

import com.ecotrace.common.exception.ApiException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** Nạp hệ số phát thải từ file CSV (mục 34.2 — Sprint 2). */
@Component
public class EmissionFactorImporter {

    public Map<String, Object> importCsv(MultipartFile file) {
        throw ApiException.notImplemented("POST /admin/emission-factors/import");
    }
}

