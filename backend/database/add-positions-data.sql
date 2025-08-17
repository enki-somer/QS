-- ========================================
-- ADD CONSTRUCTION COMPANY POSITIONS
-- قصر الشام للمقاولات العامة والإنشاءات
-- 
-- Adding Arabic positions for construction company
-- ========================================

-- Create positions table if it doesn't exist
CREATE TABLE IF NOT EXISTS employee_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_name VARCHAR(100) NOT NULL UNIQUE,
    position_name_ar VARCHAR(100) NOT NULL UNIQUE,
    description_ar TEXT,
    base_salary_range_min DECIMAL(15,2) DEFAULT 0,
    base_salary_range_max DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert construction company positions in Arabic
INSERT INTO employee_positions (position_name, position_name_ar, description_ar, base_salary_range_min, base_salary_range_max) VALUES
('Civil Engineer', 'مهندس مدني', 'مهندس متخصص في الأعمال المدنية والإنشائية', 600000, 1000000),
('Electrical Engineer', 'مهندس كهربائي', 'مهندس متخصص في الأعمال الكهربائية', 600000, 900000),
('Mechanical Engineer', 'مهندس ميكانيكي', 'مهندس متخصص في الأعمال الميكانيكية', 600000, 900000),
('Architect', 'مهندس معماري', 'مهندس متخصص في التصميم المعماري', 700000, 1200000),
('Accountant', 'محاسب', 'مسؤول عن الحسابات والأمور المالية للشركة', 400000, 700000),
('Legal Advisor', 'مستشار قانوني', 'مستشار قانوني للشركة والمشاريع', 500000, 800000),
('Services', 'خدمات', 'موظف خدمات عامة (تنظيف، صيانة، إلخ)', 200000, 350000),
('Secretary', 'سكرتير', 'سكرتير إداري للشركة', 300000, 500000),
('Data Entry', 'مدخل بيانات', 'موظف إدخال البيانات والأعمال المكتبية', 250000, 400000),
('Designer', 'مصمم', 'مصمم جرافيك أو مصمم معماري', 400000, 700000),
('Project Manager', 'مدير مشروع', 'مدير مسؤول عن إدارة المشاريع', 800000, 1500000),
('Site Supervisor', 'مشرف موقع', 'مشرف على أعمال الموقع', 400000, 600000),
('Foreman', 'رئيس عمال', 'رئيس العمال في الموقع', 350000, 550000),
('Safety Officer', 'مسؤول السلامة', 'مسؤول عن السلامة المهنية في الموقع', 400000, 600000)
ON CONFLICT (position_name) DO NOTHING;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Construction company positions added successfully!';
    RAISE NOTICE '📋 Available positions: مهندسين، محاسب، مستشار قانوني، خدمات، سكرتير، مدخل بيانات، مصمم، مدير مشروع';
END $$;
