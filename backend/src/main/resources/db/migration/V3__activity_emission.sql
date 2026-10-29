-- V3__activity_emission.sql
CREATE TABLE emission_factor (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code             VARCHAR(64)    NOT NULL,
    category         VARCHAR(32)    NOT NULL,
    sub_category     VARCHAR(64),
    region           VARCHAR(16)    NOT NULL DEFAULT 'GLOBAL',
    value            NUMERIC(18,8)  NOT NULL,
    unit_numerator   VARCHAR(16)    NOT NULL,   -- kgCO2e
    unit_denominator VARCHAR(16)    NOT NULL,   -- kWh, litre, kg, tkm
    gas              VARCHAR(16)    NOT NULL DEFAULT 'CO2e',
    source           TEXT           NOT NULL,
    source_year      INT            NOT NULL,
    valid_from       DATE           NOT NULL,
    valid_to         DATE,
    version          INT            NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (code, version)
);
CREATE INDEX idx_ef_lookup ON emission_factor(category, sub_category, region, valid_from);

CREATE TABLE supplier (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organization(id),
    name            VARCHAR(255) NOT NULL,
    country         CHAR(2),
    material        VARCHAR(128),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE activity_data (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID          NOT NULL REFERENCES organization(id),
    period_id          UUID          NOT NULL REFERENCES reporting_period(id),
    facility_id        UUID          NOT NULL REFERENCES facility(id),
    source_document_id UUID REFERENCES document(id),
    import_batch_id    UUID REFERENCES import_batch(id) ON DELETE CASCADE,
    entry_method       VARCHAR(16)   NOT NULL CHECK (entry_method IN ('DOCUMENT','IMPORT','MANUAL')),
    created_by         UUID REFERENCES app_user(id),
    category           VARCHAR(32)   NOT NULL,
    sub_category       VARCHAR(64),
    quantity           NUMERIC(18,6) NOT NULL CHECK (quantity >= 0),
    unit               VARCHAR(16)   NOT NULL,
    activity_date      DATE          NOT NULL,
    supplier_id        UUID REFERENCES supplier(id),
    metadata           JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_period ON activity_data(period_id, category);

CREATE TABLE emission_record (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_data_id   UUID          NOT NULL REFERENCES activity_data(id) ON DELETE CASCADE,
    emission_factor_id UUID          NOT NULL REFERENCES emission_factor(id),
    scope              SMALLINT      NOT NULL CHECK (scope IN (1,2,3)),
    scope3_category    SMALLINT,
    co2e_kg            NUMERIC(18,6) NOT NULL,
    method             VARCHAR(32)   NOT NULL,
    calc_version       VARCHAR(16)   NOT NULL,
    calculated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_emission_activity ON emission_record(activity_data_id);
