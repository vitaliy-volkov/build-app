-- Add missing test payments
DO $$
DECLARE
    project_uuid UUID;
    manager_user_uuid UUID;
    admin_user_uuid UUID;
BEGIN
    -- Get project and user UUIDs
    SELECT id INTO project_uuid FROM projects WHERE contract_number = 'КН-2024-001' LIMIT 1;
    SELECT id INTO manager_user_uuid FROM users WHERE email = 'manager@stroy-master.ru' LIMIT 1;
    SELECT id INTO admin_user_uuid FROM users WHERE email = 'admin@stroy-master.ru' LIMIT 1;
    
    IF project_uuid IS NULL OR manager_user_uuid IS NULL OR admin_user_uuid IS NULL THEN
        RAISE NOTICE 'Не удалось найти основные данные для платежей';
        RETURN;
    END IF;

    -- Insert missing payments with proper type column
    IF NOT EXISTS (SELECT 1 FROM payments WHERE project_id = project_uuid AND description = 'Авансовый платеж по договору') THEN
        INSERT INTO payments (
            project_id, amount, payment_date, description, 
            status, type, created_by, approved_by, approved_at
        ) VALUES 
            (project_uuid, 10000000.00, '2024-02-01', 'Авансовый платеж по договору', 'paid', 'contract_payment', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM payments WHERE project_id = project_uuid AND description = 'Промежуточный платеж за выполненные работы') THEN
        INSERT INTO payments (
            project_id, amount, payment_date, description, 
            status, type, created_by, approved_by, approved_at
        ) VALUES 
            (project_uuid, 15000000.00, '2024-05-01', 'Промежуточный платеж за выполненные работы', 'paid', 'progress_payment', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM payments WHERE project_id = project_uuid AND description = 'Оплата за фундамент и несущие конструкции') THEN
        INSERT INTO payments (
            project_id, amount, payment_date, description, 
            status, type, created_by, approved_by, approved_at
        ) VALUES 
            (project_uuid, 20000000.00, '2024-08-01', 'Оплата за фундамент и несущие конструкции', 'approved', 'milestone_payment', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM payments WHERE project_id = project_uuid AND description = 'Оплата за кровельные работы') THEN
        INSERT INTO payments (
            project_id, amount, payment_date, description, 
            status, type, created_by, approved_by, approved_at
        ) VALUES 
            (project_uuid, 5000000.00, '2024-11-01', 'Оплата за кровельные работы', 'pending', 'milestone_payment', manager_user_uuid, NULL, NULL);
    END IF;

    RAISE NOTICE 'Тестовые платежи успешно добавлены';

END $$;