-- V4__product_footprint.sql
CREATE TABLE product (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organization(id),
    name            VARCHAR(255) NOT NULL,
    hs_code         VARCHAR(16),
    cn_code         VARCHAR(16),
    unit            VARCHAR(16)  NOT NULL DEFAULT 't',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE production_output (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id  UUID          NOT NULL REFERENCES reporting_period(id),
    product_id UUID          NOT NULL REFERENCES product(id),
    quantity   NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
    unit       VARCHAR(16)   NOT NULL DEFAULT 't',
    UNIQUE (period_id, product_id)
);

CREATE TABLE product_footprint (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id                 UUID          NOT NULL REFERENCES reporting_period(id),
    product_id                UUID          NOT NULL REFERENCES product(id),
    direct_co2e_per_unit      NUMERIC(18,6) NOT NULL,
    indirect_co2e_per_unit    NUMERIC(18,6) NOT NULL,
    precursor_co2e_per_unit   NUMERIC(18,6) NOT NULL,
    total_co2e_per_unit       NUMERIC(18,6) NOT NULL,
    actual_data_share         NUMERIC(5,4),   -- tỷ lệ dữ liệu thực tế so với mặc định
    allocation_method         VARCHAR(32)   NOT NULL DEFAULT 'MASS',
    calculated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (period_id, product_id)
);
