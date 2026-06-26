-- Enum for the finite-state application lifecycle.
-- A Postgres enum keeps the set of valid statuses closed and explicit.
CREATE TYPE application_status AS ENUM (
  'queued',
  'parsing',
  'scoring',
  'analyzing_bias',
  'explaining',
  'complete',
  'failed'
);

-- Stores raw input and lifecycle state.
-- input_hash is SHA-256 of raw_text and powers cache lookup.
CREATE TABLE applications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash     TEXT        NOT NULL,
  applicant_name TEXT,
  input_type     TEXT        NOT NULL CHECK (input_type IN ('pdf', 'form')),
  raw_text       TEXT        NOT NULL,
  file_url       TEXT,
  status         application_status NOT NULL DEFAULT 'queued',
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_hash ON applications(input_hash);
CREATE INDEX idx_applications_created ON applications(created_at DESC);

-- One-to-one with applications. Created only when status reaches complete.
-- Tradeoffs:
--   bias_factors -> JSONB: read as one object, not queried by sub-field.
--   key_factors  -> text[]: ordered, homogeneous list.
--   base_score and llm_delta are separate for auditability.
CREATE TABLE analysis_results (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID    NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  risk_score      INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_category   TEXT    NOT NULL CHECK (risk_category IN ('Low', 'Medium', 'High')),
  recommendation  TEXT    NOT NULL CHECK (recommendation IN ('Approve', 'Review', 'Decline')),
  confidence      TEXT    NOT NULL CHECK (confidence IN ('High', 'Medium', 'Low')),
  base_score      INTEGER NOT NULL,
  llm_delta       INTEGER NOT NULL,
  key_factors     TEXT[]  NOT NULL,
  explanation     TEXT    NOT NULL,
  bias_factors    JSONB   NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

-- Audit log of every stage start, completion, or failure.
CREATE TABLE pipeline_stage_logs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID    NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  stage_name      TEXT    NOT NULL,
  status          TEXT    NOT NULL CHECK (status IN ('started', 'complete', 'failed')),
  duration_ms     INTEGER,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_logs_app ON pipeline_stage_logs(application_id, created_at ASC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Public app, no auth in this version. RLS remains enabled so policies can
-- later become user-scoped without changing the table design.
ALTER TABLE applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_applications"        ON applications        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_results"             ON analysis_results    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_logs"                ON pipeline_stage_logs FOR ALL USING (true) WITH CHECK (true);
