-- =============================================================================
-- Row-Level Security (RLS) Policies for KosKita Multi-Tenant Isolation
-- =============================================================================
-- Applied to all tenant-scoped tables. The session variable
-- `app.current_tenant_id` must be set before any query executes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on all tenant-scoped tables
-- ---------------------------------------------------------------------------
ALTER TABLE user_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE property ENABLE ROW LEVEL SECURITY;
ALTER TABLE room ENABLE ROW LEVEL SECURITY;
ALTER TABLE kos_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_channel ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_component ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_reading ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Tenant isolation SELECT policies
--    Only rows matching the current tenant session variable are visible.
-- ---------------------------------------------------------------------------
CREATE POLICY tenant_isolation_select ON user_account
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON property
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON room
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON kos_tenant
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON contract
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON invoice
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON invoice_line
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON payment
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON gateway_config
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON payment_channel
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON subscription
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON billing_component
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON audit_log
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON maintenance_request
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_select ON meter_reading
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---------------------------------------------------------------------------
-- 3. Tenant isolation INSERT policies
--    Ensures new rows can only be inserted with the current tenant_id.
-- ---------------------------------------------------------------------------
CREATE POLICY tenant_isolation_insert ON user_account
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON property
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON room
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON kos_tenant
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON contract
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON invoice
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON invoice_line
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON payment
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON gateway_config
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON payment_channel
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON subscription
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON billing_component
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON audit_log
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON maintenance_request
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON meter_reading
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---------------------------------------------------------------------------
-- 4. Tenant isolation UPDATE policies
--    Prevents updating rows belonging to other tenants.
-- ---------------------------------------------------------------------------
CREATE POLICY tenant_isolation_update ON user_account
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON property
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON room
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON kos_tenant
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON contract
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON invoice
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON invoice_line
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON payment
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON gateway_config
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON payment_channel
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON subscription
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON billing_component
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON maintenance_request
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON meter_reading
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- NOTE: audit_log does NOT get an UPDATE policy (append-only, immutable)

-- ---------------------------------------------------------------------------
-- 5. Tenant isolation DELETE policies
--    Prevents deleting rows belonging to other tenants.
-- ---------------------------------------------------------------------------
CREATE POLICY tenant_isolation_delete ON user_account
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON property
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON room
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON kos_tenant
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON contract
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON invoice
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON invoice_line
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON payment
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON gateway_config
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON payment_channel
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON subscription
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON billing_component
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON maintenance_request
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON meter_reading
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- NOTE: audit_log does NOT get a DELETE policy (append-only, immutable)

-- ---------------------------------------------------------------------------
-- 6. Super-admin bypass policy (optional)
--    The `koskita_admin` role bypasses RLS for platform operations.
-- ---------------------------------------------------------------------------
-- Create the admin role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'koskita_admin') THEN
    CREATE ROLE koskita_admin;
  END IF;
END
$$;

-- Grant bypass to the admin role on all tenant-scoped tables
ALTER TABLE user_account FORCE ROW LEVEL SECURITY;
ALTER TABLE property FORCE ROW LEVEL SECURITY;
ALTER TABLE room FORCE ROW LEVEL SECURITY;
ALTER TABLE kos_tenant FORCE ROW LEVEL SECURITY;
ALTER TABLE contract FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_line FORCE ROW LEVEL SECURITY;
ALTER TABLE payment FORCE ROW LEVEL SECURITY;
ALTER TABLE gateway_config FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_channel FORCE ROW LEVEL SECURITY;
ALTER TABLE subscription FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_component FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE maintenance_request FORCE ROW LEVEL SECURITY;
ALTER TABLE meter_reading FORCE ROW LEVEL SECURITY;

-- Super-admin bypass: allow all operations for koskita_admin role
CREATE POLICY admin_bypass ON user_account FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON property FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON room FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON kos_tenant FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON contract FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON invoice FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON invoice_line FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON payment FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON gateway_config FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON payment_channel FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON subscription FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON billing_component FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON audit_log FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON maintenance_request FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_bypass ON meter_reading FOR ALL TO koskita_admin USING (true) WITH CHECK (true);
