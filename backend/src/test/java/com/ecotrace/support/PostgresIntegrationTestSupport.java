package com.ecotrace.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Lớp cha cho Integration Test (*IT.java) dùng PostgreSQL thật qua Testcontainers (mục 14).
 * Chạy bằng {@code ./mvnw verify} khi có Docker.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
public abstract class PostgresIntegrationTestSupport {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
}

