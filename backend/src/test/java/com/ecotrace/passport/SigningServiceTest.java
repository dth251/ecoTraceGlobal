package com.ecotrace.passport;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SigningServiceTest {

    @Test
    void signsAndVerifiesCanonicalPayloadAndDetectsTampering() {
        SigningService signing = new SigningService();
        String payload = "{\"company\":\"ABC\",\"period\":\"Q3/2026\",\"total\":2.17}";
        String sig = signing.sign(payload);

        assertThat(signing.sha256Hex(payload)).hasSize(64);
        assertThat(signing.verify(payload, sig)).isTrue();
        assertThat(signing.verify(payload.replace("2.17", "1.17"), sig)).isFalse();
    }
}

