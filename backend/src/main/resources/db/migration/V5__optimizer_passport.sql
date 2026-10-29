-- V5__optimizer_passport.sql
CREATE TABLE scenario (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id      UUID          NOT NULL REFERENCES reporting_period(id),
    type           VARCHAR(32)   NOT NULL CHECK (type IN ('SOLAR_ROOFTOP','FUEL_SWITCH','SUPPLIER_SWITCH','TRANSPORT_MODE_SHIFT','ENERGY_EFFICIENCY')),
    parameters     JSONB         NOT NULL,
    baseline_co2e  NUMERIC(18,6) NOT NULL,
    projected_co2e NUMERIC(18,6) NOT NULL,
    cost_delta_usd NUMERIC(18,2),
    payback_years  NUMERIC(6,2),
    created_by     VARCHAR(8)    NOT NULL CHECK (created_by IN ('USER','SYSTEM')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE recommendation (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id   UUID         NOT NULL REFERENCES reporting_period(id),
    scenario_id UUID REFERENCES scenario(id),
    rule_code   VARCHAR(64)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    explanation TEXT         NOT NULL,
    priority    SMALLINT     NOT NULL DEFAULT 2,
    status      VARCHAR(16)  NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','ACCEPTED','DISMISSED')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE passport (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organization(id),
    period_id       UUID        NOT NULL REFERENCES reporting_period(id),
    product_id      UUID        NOT NULL REFERENCES product(id),
    payload         JSONB       NOT NULL,
    payload_hash    CHAR(64)    NOT NULL,
    signature       TEXT        NOT NULL,
    public_code     VARCHAR(16) NOT NULL UNIQUE,
    verification    VARCHAR(16) NOT NULL DEFAULT 'SELF_DECLARED' CHECK (verification IN ('SELF_DECLARED','VERIFIED')),
    verifier_name   VARCHAR(255),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);
