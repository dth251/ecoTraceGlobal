-- V1__init_core.sql
-- Lõi: doanh nghiệp, người dùng, nhà máy, kỳ báo cáo, nhật ký
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organization (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    tax_code    VARCHAR(32),
    country     CHAR(2)      NOT NULL DEFAULT 'VN',
    plan        VARCHAR(32)  NOT NULL DEFAULT 'TRIAL',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE app_user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organization(id),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(100) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(32)  NOT NULL CHECK (role IN ('OWNER','EDITOR','VIEWER','SYSTEM_ADMIN')),
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_org ON app_user(organization_id);

CREATE TABLE facility (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organization(id),
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    country         CHAR(2)      NOT NULL DEFAULT 'VN',
    grid_region     VARCHAR(32)  NOT NULL DEFAULT 'VN',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_facility_org ON facility(organization_id);

CREATE TABLE reporting_period (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organization(id),
    facility_id     UUID        NOT NULL REFERENCES facility(id),
    name            VARCHAR(64) NOT NULL,              -- ví dụ: Q3/2026
    start_date      DATE        NOT NULL,
    end_date        DATE        NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','LOCKED')),
    locked_at       TIMESTAMPTZ,
    locked_by       UUID REFERENCES app_user(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
CREATE INDEX idx_period_org ON reporting_period(organization_id);

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    organization_id UUID,
    user_id         UUID,
    action          VARCHAR(64)  NOT NULL,
    entity          VARCHAR(64)  NOT NULL,
    entity_id       VARCHAR(64),
    before_data     JSONB,
    after_data      JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org_time ON audit_log(organization_id, created_at DESC);
