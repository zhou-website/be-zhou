-- Enforcement Log Audit (Append-Only) di Level Database
-- Sesuai PRD Zhou Consulting v2 Revisi - Requirement #14

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log bersifat append-only: operasi % tidak diizinkan pada tabel %',
  TG_OP, TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_audit_log_update ON audit_logs;
CREATE TRIGGER trg_block_audit_log_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_block_audit_log_delete ON audit_logs;
CREATE TRIGGER trg_block_audit_log_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
