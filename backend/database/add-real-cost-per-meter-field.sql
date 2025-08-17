-- Add real cost per meter field for accurate profit calculations
-- This script adds the missing field needed for proper profit calculation

DO $$ 
BEGIN
    -- Add real_cost_per_meter column to projects table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'real_cost_per_meter') THEN
        ALTER TABLE projects ADD COLUMN real_cost_per_meter DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.real_cost_per_meter IS 'Actual cost per square meter for construction (our expenses)';
        RAISE NOTICE 'Added real_cost_per_meter column';
    ELSE
        RAISE NOTICE 'real_cost_per_meter column already exists';
    END IF;
    
    -- Update existing projects with default value (can be updated later by admin)
    UPDATE projects 
    SET real_cost_per_meter = 0 
    WHERE real_cost_per_meter IS NULL;
    
END $$;

-- Create function to calculate accurate project financials
CREATE OR REPLACE FUNCTION calculate_project_profit_metrics(
    p_area DECIMAL(10,2),
    p_price_per_meter DECIMAL(15,2),  -- Deal price per meter (what we charge)
    p_real_cost_per_meter DECIMAL(15,2), -- Real cost per meter (what it costs us)
    p_owner_deal_price DECIMAL(15,2)
) RETURNS TABLE (
    construction_cost DECIMAL(15,2),
    real_construction_cost DECIMAL(15,2),
    gross_profit DECIMAL(15,2),
    profit_margin DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY SELECT
        -- What we charge for construction (deal price)
        (p_area * p_price_per_meter) as construction_cost,
        -- What it actually costs us
        (p_area * p_real_cost_per_meter) as real_construction_cost,
        -- Real profit = what we charge - what it costs us
        ((p_area * p_price_per_meter) - (p_area * p_real_cost_per_meter)) as gross_profit,
        -- Profit margin percentage
        CASE 
            WHEN p_price_per_meter > 0 THEN 
                (((p_price_per_meter - p_real_cost_per_meter) / p_price_per_meter) * 100)::DECIMAL(5,2)
            ELSE 0
        END as profit_margin;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM calculate_project_profit_metrics(1000, 500000, 400000, 60000000);

-- Add comments for clarity
COMMENT ON COLUMN projects.price_per_meter IS 'Deal price per square meter (what we charge the client)';
COMMENT ON COLUMN projects.real_cost_per_meter IS 'Actual cost per square meter (our expenses for materials, labor, etc.)';
COMMENT ON COLUMN projects.construction_cost IS 'Total construction revenue (area * price_per_meter)';
COMMENT ON COLUMN projects.profit_margin IS 'Profit margin percentage based on real costs';

-- Display updated table structure
\d projects;

