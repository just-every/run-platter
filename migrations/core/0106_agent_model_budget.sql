-- Limits are installation authority. Unknown external model spend is never treated as zero.
ALTER TABLE p_agent_keys ADD COLUMN monthly_model_budget_cents INTEGER CHECK(monthly_model_budget_cents IS NULL OR monthly_model_budget_cents BETWEEN 0 AND 1000000000);
