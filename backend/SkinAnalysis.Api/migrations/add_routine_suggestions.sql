CREATE TABLE IF NOT EXISTS routine_change_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_id uuid NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE,
    suggestion_type text NOT NULL CHECK (suggestion_type IN ('add_step', 'remove_step', 'swap_product')),
    step_type_key text NOT NULL,
    step_period text CHECK (step_period IN ('morning', 'night', 'both')),
    current_product_name text,
    suggested_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    suggested_product_name text,
    suggested_image_url text,
    reason text NOT NULL,
    priority smallint NOT NULL DEFAULT 5,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_pending ON routine_change_suggestions(user_id, status);
ALTER TABLE routine_change_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY suggestions_all ON routine_change_suggestions FOR ALL USING (user_id = auth.uid());
