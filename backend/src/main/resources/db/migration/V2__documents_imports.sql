-- V2__documents_imports.sql
-- Chứng từ (bằng chứng) và lô nhập file Excel
CREATE TABLE document (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organization(id),
    facility_id     UUID         NOT NULL REFERENCES facility(id),
    period_id       UUID         NOT NULL REFERENCES reporting_period(id),
    doc_type        VARCHAR(32)  NOT NULL CHECK (doc_type IN ('ELECTRICITY_BILL','FUEL_INVOICE','MATERIAL_INVOICE','BILL_OF_LADING','OTHER')),
    storage_key     VARCHAR(512) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      BIGINT       NOT NULL,
    sha256          CHAR(64)     NOT NULL,
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING_ENTRY' CHECK (status IN ('PENDING_ENTRY','ENTERED','REJECTED')),
    reject_reason   VARCHAR(255),
    uploaded_by     UUID REFERENCES app_user(id),
    entered_by      UUID REFERENCES app_user(id),
    entered_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (organization_id, sha256)
);
CREATE INDEX idx_document_period ON document(period_id, status);

CREATE TABLE import_batch (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organization(id),
    period_id       UUID         NOT NULL REFERENCES reporting_period(id),
    template_type   VARCHAR(32)  NOT NULL CHECK (template_type IN ('ELECTRICITY','FUEL','MATERIAL','TRANSPORT','PRODUCTION')),
    file_name       VARCHAR(255) NOT NULL,
    storage_key     VARCHAR(512) NOT NULL,
    total_rows      INT          NOT NULL DEFAULT 0,
    valid_rows      INT          NOT NULL DEFAULT 0,
    error_rows      INT          NOT NULL DEFAULT 0,
    errors          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    status          VARCHAR(16)  NOT NULL DEFAULT 'VALIDATED' CHECK (status IN ('VALIDATED','COMMITTED','CANCELLED')),
    created_by      UUID REFERENCES app_user(id),
    committed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_import_period ON import_batch(period_id);
