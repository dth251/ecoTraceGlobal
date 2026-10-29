package com.ecotrace.importer;

import com.ecotrace.support.PostgresIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class ImportServiceIT extends PostgresIntegrationTestSupport {

    @Autowired
    private ImportService importService;

    @Test
    void contextLoads() {
        assertThat(importService).isNotNull();
    }
}

