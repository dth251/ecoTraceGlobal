package com.ecotrace.common.audit;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** Lỗi gốc: truyền DTO vào cột JSON kiểu Object làm Hibernate ném ClassCastException, mọi thao tác ghi có audit trả 500. */
class AuditServiceTest {

    record Sample(String name, LocalDate date) {
    }

    @Test
    void dtoIsSerialisedToJsonStringBeforeSaving() {
        AuditLogRepository repository = mock(AuditLogRepository.class);
        AuditService service = new AuditService(repository);

        service.record(UUID.randomUUID(), UUID.randomUUID(), AuditService.CREATE, "facility", UUID.randomUUID(),
                null, new Sample("Nhà máy 1", LocalDate.of(2026, 7, 1)));

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(saved.capture());
        assertThat(ReflectionTestUtils.getField(saved.getValue(), "beforeData")).isNull();
        Object after = ReflectionTestUtils.getField(saved.getValue(), "afterData");
        assertThat(after).isInstanceOf(String.class);
        assertThat((String) after).contains("\"name\":\"Nhà máy 1\"").contains("2026-07-01");
    }

    @Test
    void nullAndStringPassThrough() {
        assertThat(AuditService.toJson(null)).isNull();
        assertThat(AuditService.toJson("{\"a\":1}")).isEqualTo("{\"a\":1}");
    }
}
