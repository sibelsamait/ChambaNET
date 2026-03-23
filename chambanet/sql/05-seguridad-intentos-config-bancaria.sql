-- ============================================================================
-- 05 - Seguridad de intentos para configuracion bancaria empresarial
-- ============================================================================

CREATE TABLE IF NOT EXISTS seguridad_intentos_config_bancaria (
  user_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  failed_attempts INT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  last_failed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seguridad_intentos_config_bancaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seguridad_intentos_select_self" ON seguridad_intentos_config_bancaria;
CREATE POLICY "seguridad_intentos_select_self" ON seguridad_intentos_config_bancaria
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seguridad_intentos_insert_self" ON seguridad_intentos_config_bancaria;
CREATE POLICY "seguridad_intentos_insert_self" ON seguridad_intentos_config_bancaria
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "seguridad_intentos_update_self" ON seguridad_intentos_config_bancaria;
CREATE POLICY "seguridad_intentos_update_self" ON seguridad_intentos_config_bancaria
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION trigger_update_seguridad_intentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_seguridad_intentos_updated_at ON seguridad_intentos_config_bancaria;
CREATE TRIGGER trigger_seguridad_intentos_updated_at
BEFORE UPDATE ON seguridad_intentos_config_bancaria
FOR EACH ROW
EXECUTE FUNCTION trigger_update_seguridad_intentos_updated_at();
