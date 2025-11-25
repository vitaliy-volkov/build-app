-- Supplemental Test Data for Строительная система управления
-- This file adds missing test data without duplicating existing records

-- Получаем существующие данные
DO $$
DECLARE
    company_uuid UUID;
    admin_user_uuid UUID;
    manager_user_uuid UUID;
    client_counterparty_uuid UUID;
    contractor_counterparty_uuid UUID;
    project_uuid UUID;
BEGIN
    -- Получаем UUID существующих данных
    SELECT id INTO company_uuid FROM companies WHERE inn = '1234567890' LIMIT 1;
    SELECT id INTO admin_user_uuid FROM users WHERE email = 'admin@stroy-master.ru' LIMIT 1;
    SELECT id INTO manager_user_uuid FROM users WHERE email = 'manager@stroy-master.ru' LIMIT 1;
    
    -- Если нет данных, выходим
    IF company_uuid IS NULL OR admin_user_uuid IS NULL OR manager_user_uuid IS NULL THEN
        RAISE NOTICE 'Основные данные не найдены. Запустите сначала migration 002_test_data.sql';
        RETURN;
    END IF;

    -- Создаем тестовых контрагентов (если не существуют)
    INSERT INTO counterparties (company_id, full_name, type, inn, address, phone, email, contact_person) 
    SELECT 
        company_uuid,
        'ЗАО "ЖилСтрой"',
        'client'::counterparty_type,
        '9876543210',
        'г. Москва, ул. Жилстрой, д. 25',
        '+7 (495) 333-33-33',
        'client@zhilstroy.ru',
        'Александр Смирнов'
    WHERE NOT EXISTS (
        SELECT 1 FROM counterparties WHERE inn = '9876543210'
    );
    
    INSERT INTO counterparties (company_id, full_name, type, inn, address, phone, email, contact_person) 
    SELECT 
        company_uuid,
        'ООО "Генподрядчик"',
        'contractor'::counterparty_type,
        '5555666677',
        'г. Москва, ул. Подрядная, д. 40',
        '+7 (495) 444-44-44',
        'info@genpodryad.ru',
        'Дмитрий Козлов'
    WHERE NOT EXISTS (
        SELECT 1 FROM counterparties WHERE inn = '5555666677'
    );
    
    -- Получаем UUID контрагентов
    SELECT id INTO client_counterparty_uuid FROM counterparties WHERE inn = '9876543210';
    SELECT id INTO contractor_counterparty_uuid FROM counterparties WHERE inn = '5555666677';
    
    IF client_counterparty_uuid IS NULL OR contractor_counterparty_uuid IS NULL THEN
        RAISE NOTICE 'Не удалось найти контрагентов';
        RETURN;
    END IF;

    -- Создаем тестовый проект (если не существует)
    INSERT INTO projects (
        id, company_id, customer_id, general_contractor_id, 
        name, address, contract_number, contract_date, description,
        status, start_date, end_date, estimated_budget
    ) VALUES (
        uuid_generate_v4(),
        company_uuid,
        client_counterparty_uuid,
        contractor_counterparty_uuid,
        'Жилой комплекс "Солнечный"',
        'г. Москва, ул. Солнечная, д. 10-15',
        'КН-2024-001',
        '2024-01-15',
        'Строительство жилого комплекса из 5 домов с подземной парковкой и социальной инфраструктурой',
        'in_progress',
        '2024-02-01',
        '2025-12-31',
        150000000.00
    )
    ON CONFLICT (contract_number) DO NOTHING;
    
    SELECT id INTO project_uuid FROM projects WHERE contract_number = 'КН-2024-001' LIMIT 1;
    
    IF project_uuid IS NULL THEN
        RAISE NOTICE 'Не удалось создать или найти проект';
        RETURN;
    END IF;

    -- Добавляем пользователей в команду проекта (если не существует)
    INSERT INTO project_teams (project_id, user_id, role)
    SELECT project_uuid, manager_user_uuid, 'Проектный менеджер'
    WHERE NOT EXISTS (
        SELECT 1 FROM project_teams WHERE project_id = project_uuid AND user_id = manager_user_uuid
    )
    UNION ALL
    SELECT project_uuid, admin_user_uuid, 'Администратор'
    WHERE NOT EXISTS (
        SELECT 1 FROM project_teams WHERE project_id = project_uuid AND user_id = admin_user_uuid
    );

    -- Создаем тестовую смету (если не существует)
    INSERT INTO estimates (
        id, project_id, name, description, status, total_amount,
        created_by, approved_by, approved_at
    ) SELECT
        uuid_generate_v4(),
        project_uuid,
        'Смета на строительство дома №1',
        'Детальная смета на строительство первого дома жилого комплекса',
        'approved',
        50000000.00,
        manager_user_uuid,
        admin_user_uuid,
        CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
        SELECT 1 FROM estimates WHERE project_id = project_uuid AND name = 'Смета на строительство дома №1'
    );

    -- Создаем категории цен (если не существуют)
    INSERT INTO price_categories (company_id, name, code, description) VALUES
        (company_uuid, 'Земляные работы', 'EARTH', 'Работы по разработке грунта'),
        (company_uuid, 'Бетонные работы', 'CONCRETE', 'Работы по устройству бетонных конструкций'),
        (company_uuid, 'Кирпичная кладка', 'BRICK', 'Работы по кладке кирпича'),
        (company_uuid, 'Кровельные работы', 'ROOF', 'Работы по устройству кровли'),
        (company_uuid, 'Отделочные работы', 'FINISH', 'Финишные отделочные работы')
    ON CONFLICT (company_id, code) DO NOTHING;

    -- Создаем позиции прайс-листа (если не существуют)
    -- Для земляных работ
    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Разработка грунта вручную',
        'м3',
        800.00,
        25
    FROM price_categories pc 
    WHERE pc.code = 'EARTH'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Разработка грунта вручную'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Разработка грунта механизированная',
        'м3',
        400.00,
        25
    FROM price_categories pc 
    WHERE pc.code = 'EARTH'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Разработка грунта механизированная'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Засыпка и уплотнение',
        'м3',
        300.00,
        25
    FROM price_categories pc 
    WHERE pc.code = 'EARTH'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Засыпка и уплотнение'
    );

    -- Для бетонных работ
    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Устройство бетонной подготовки',
        'м2',
        1200.00,
        30
    FROM price_categories pc 
    WHERE pc.code = 'CONCRETE'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Устройство бетонной подготовки'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Монолитная железобетонная плита',
        'м3',
        8500.00,
        30
    FROM price_categories pc 
    WHERE pc.code = 'CONCRETE'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Монолитная железобетонная плита'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Монолитные стены',
        'м3',
        9200.00,
        30
    FROM price_categories pc 
    WHERE pc.code = 'CONCRETE'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Монолитные стены'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Монолитные колонны',
        'м3',
        9800.00,
        30
    FROM price_categories pc 
    WHERE pc.code = 'CONCRETE'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Монолитные колонны'
    );

    -- Для кирпичной кладки
    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Кирпичная кладка наружных стен',
        'м2',
        2800.00,
        35
    FROM price_categories pc 
    WHERE pc.code = 'BRICK'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Кирпичная кладка наружных стен'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Кирпичная кладка внутренних стен',
        'м2',
        2200.00,
        35
    FROM price_categories pc 
    WHERE pc.code = 'BRICK'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Кирпичная кладка внутренних стен'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Теплоизоляция стен',
        'м2',
        600.00,
        30
    FROM price_categories pc 
    WHERE pc.code = 'BRICK'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Теплоизоляция стен'
    );

    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        'Штукатурка стен',
        'м2',
        800.00,
        30
    FROM price_categories pc 
    WHERE pc.code = 'BRICK'
    AND NOT EXISTS (
        SELECT 1 FROM price_items WHERE name = 'Штукатурка стен'
    );

    -- Создаем тестовые платежи (если не существуют)
    INSERT INTO payments (
        project_id, amount, payment_date, description, 
        status, created_by, approved_by, approved_at
    ) VALUES 
        (project_uuid, 10000000.00, '2024-02-01', 'Авансовый платеж по договору', 'paid', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 15000000.00, '2024-05-01', 'Промежуточный платеж за выполненные работы', 'paid', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 20000000.00, '2024-08-01', 'Оплата за фундамент и несущие конструкции', 'approved', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 5000000.00, '2024-11-01', 'Оплата за кровельные работы', 'pending', manager_user_uuid, NULL, NULL)
    ON CONFLICT DO NOTHING;

    -- Создаем тестовые события проекта (если не существуют)
    INSERT INTO project_events (project_id, user_id, type, title, description) VALUES
        (project_uuid, manager_user_uuid, 'milestone', 'Начало строительства', 'Официальная дата начала строительных работ'),
        (project_uuid, manager_user_uuid, 'status_changed', 'Переход к основному этапу', 'Завершена подготовка площадки, начаты основные строительные работы'),
        (project_uuid, admin_user_uuid, 'payment_received', 'Получен авансовый платеж', 'На расчет поступил авансовый платеж в размере 10 млн рублей')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Дополнительные тестовые данные успешно добавлены';

END $$;