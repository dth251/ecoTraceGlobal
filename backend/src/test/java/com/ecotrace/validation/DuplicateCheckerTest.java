package com.ecotrace.validation;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DuplicateCheckerTest {

    @Test
    void beanInstantiates() {
        assertThat(new DuplicateChecker()).isNotNull();
    }
}

