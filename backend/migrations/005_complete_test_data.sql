-- Complete Test Data Migration for Строительная система управления
-- Final corrected version

DO $$
DECLARE
    company_uuid UUID;
    admin_user_uuid UUID;
    manager_user_uuid UUID;
    client_counterparty_uuid UUID;
    contractor_counterparty_uuid UUID;
    project_uuid UUID;
    estimate_uuid UUID;
BEGIN
    RAISE NOTICE 'Начинаем создание тестовых данных...';
    
    -- Get company and user UUIDs
    SELECT id INTO company_uuid FROM companies WHERE inn = '1234567890' LIMIT 1;
    SELECT id INTO admin_user_uuid FROM users WHERE email = 'admin@stroy-master.ru' LIMIT 1;
    SELECT id INTO manager_user_uuid FROM users WHERE email = 'manager@stroy-master.ru' LIMIT 1;
    
    -- If basic data doesn't exist, exit
    IF company_uuid IS NULL OR admin_user_uuid IS NULL OR manager_user_uuid IS NULL THEN
        RAISE NOTICE 'Основные данные не найдены';
        RETURN;
    END IF;

    RAISE NOTICE 'Основные данные найдены: компания=%, админ=%, менеджер=%', company_uuid, admin_user_uuid, manager_user_uuid;
    
    -- Create user-company relationships
    INSERT INTO user_companies (user_id, company_id, role, is_primary) VALUES
        (admin_user_uuid, company_uuid, 'admin', true),
        (manager_user_uuid, company_uuid, 'project_manager', true)
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    RAISE NOTICE 'Связи пользователь-компания созданы';

    -- Create counterparties with conditional checks
    IF NOT EXISTS (SELECT 1 FROM counterparties WHERE inn = '9876543210') THEN
        INSERT INTO counterparties (company_id, full_name, type, inn, address, phone, email, contact_person) VALUES
            (company_uuid, 'ЗАО "ЖилСтрой"', 'client', '9876543210', 'г. Москва, ул. Жилстрой, д. 25', '+7 (495) 333-33-33', 'client@zhilstroy.ru', 'Александр Смирнов');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM counterparties WHERE inn = '5555666677') THEN
        INSERT INTO counterparties (company_id, full_name, type, inn, address, phone, email, contact_person) VALUES
            (company_uuid, 'ООО "Генподрядчик"', 'contractor', '5555666677', 'г. Москва, ул. Подрядная, д. 40', '+7 (495) 444-44-44', 'info@genpodryad.ru', 'Дмитрий Козлов');
    END IF;
    
    -- Get counterparty UUIDs
    SELECT id INTO client_counterparty_uuid FROM counterparties WHERE inn = '9876543210' LIMIT 1;
    SELECT id INTO contractor_counterparty_uuid FROM counterparties WHERE inn = '5555666677' LIMIT 1;
    
    RAISE NOTICE 'Контрагенты созданы: клиент=%, подрядчик=%', client_counterparty_uuid, contractor_counterparty_uuid;

    -- Create project
    IF NOT EXISTS (SELECT 1 FROM projects WHERE contract_number = 'КН-2024-001') THEN
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
        );
    END IF;
    
    SELECT id INTO project_uuid FROM projects WHERE contract_number = 'КН-2024-001' LIMIT 1;
    
    RAISE NOTICE 'Проект создан: %', project_uuid;

    -- Create project teams
    IF NOT EXISTS (SELECT 1 FROM project_teams WHERE project_id = project_uuid AND user_id = manager_user_uuid) THEN
        INSERT INTO project_teams (project_id, user_id, role) VALUES
            (project_uuid, manager_user_uuid, 'Проектный менеджер');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM project_teams WHERE project_id = project_uuid AND user_id = admin_user_uuid) THEN
        INSERT INTO project_teams (project_id, user_id, role) VALUES
            (project_uuid, admin_user_uuid, 'Администратор');
    END IF;
    
    RAISE NOTICE 'Команды проекта созданы';

    -- Create estimate
    IF NOT EXISTS (SELECT 1 FROM estimates WHERE project_id = project_uuid AND name = 'Смета на строительство дома №1') THEN
        INSERT INTO estimates (
            id, project_id, name, description, status, total_amount,
            created_by, approved_by, approved_at
        ) VALUES (
            uuid_generate_v4(),
            project_uuid,
            'Смета на строительство дома №1',
            'Детальная смета на строительство первого дома жилого комплекса',
            'approved',
            50000000.00,
            manager_user_uuid,
            admin_user_uuid,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    SELECT id INTO estimate_uuid FROM estimates WHERE project_id = project_uuid AND name = 'Смета на строительство дома №1' LIMIT 1;
    
    RAISE NOTICE 'Смета создана: %', estimate_uuid;

    -- Create price categories
    IF NOT EXISTS (SELECT 1 FROM price_categories WHERE code = 'EARTH') THEN
        INSERT INTO price_categories (company_id, name, code, description) VALUES
            (company_uuid, 'Земляные работы', 'EARTH', 'Работы по разработке грунта'),
            (company_uuid, 'Бетонные работы', 'CONCRETE', 'Работы по устройству бетонных конструкций'),
            (company_uuid, 'Кирпичная кладка', 'BRICK', 'Работы по кладке кирпича'),
            (company_uuid, 'Кровельные работы', 'ROOF', 'Работы по устройству кровли'),
            (company_uuid, 'Отделочные работы', 'FINISH', 'Финишные отделочные работы');
    END IF;
    
    RAISE NOTICE 'Категории цен созданы';

    -- Create price items
    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT pc.id, item.name, item.unit, item.cost_price, item.markup
    FROM price_categories pc
    CROSS JOIN (
        VALUES 
            ('Разработка грунта вручную', 'м3', 800.00, 25),
            ('Разработка грунта механизированная', 'м3', 400.00, 25),
            ('Засыпка и уплотнение', 'м3', 300.00, 25),
            ('Устройство бетонной подготовки', 'м2', 1200.00, 30),
            ('Монолитная железобетонная плита', 'м3', 8500.00, 30),
            ('Монолитные стены', 'м3', 9200.00, 30),
            ('Монолитные колонны', 'м3', 9800.00, 30),
            ('Кирпичная кладка наружных стен', 'м2', 2800.00, 35),
            ('Кирпичная кладка внутренних стен', 'м2', 2200.00, 35),
            ('Теплоизоляция стен', 'м2', 600.00, 30),
            ('Штукатурка стен', 'м2', 800.00, 30)
    ) AS item(name, unit, cost_price, markup)
    WHERE (pc.code = 'EARTH' AND item.name IN ('Разработка грунта вручную', 'Разработка грунта механизированная', 'Засыпка и уплотнение'))
       OR (pc.code = 'CONCRETE' AND item.name IN ('Устройство бетонной подготовки', 'Монолитная железобетонная плита', 'Монолитные стены', 'Монолитные колонны'))
       OR (pc.code = 'BRICK' AND item.name IN ('Кирпичная кладка наружных стен', 'Кирпичная кладка внутренних стен', 'Теплоизоляция стен', 'Штукатурка стен'))
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Позиции прайс-листа созданы';

    -- Create payments
    INSERT INTO payments (
        project_id, amount, payment_date, description, 
        status, type, created_by, approved_by, approved_at
    ) VALUES 
        (project_uuid, 10000000.00, '2024-02-01', 'Авансовый платеж по договору', 'paid', 'contract_payment', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 15000000.00, '2024-05-01', 'Промежуточный платеж за выполненные работы', 'paid', 'progress_payment', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 20000000.00, '2024-08-01', 'Оплата за фундамент и несущие конструкции', 'approved', 'milestone_payment', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 5000000.00, '2024-11-01', 'Оплата за кровельные работы', 'pending', 'milestone_payment', manager_user_uuid, NULL, NULL)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Платежи созданы';

    -- Create project events
    INSERT INTO project_events (project_id, user_id, type, title, description) VALUES
        (project_uuid, manager_user_uuid, 'milestone', 'Начало строительства', 'Официальная дата начала строительных работ'),
        (project_uuid, manager_user_uuid, 'status_changed', 'Переход к основному этапу', 'Завершена подготовка площадки, начаты основные строительные работы'),
        (project_uuid, admin_user_uuid, 'payment_received', 'Получен авансовый платеж', 'На расчет поступил авансовый платеж в размере 10 млн рублей')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Все тестовые данные успешно созданы!';
    RAISE NOTICE 'Финальная проверка: проектов=%, платежей=%', 
        (SELECT COUNT(*) FROM projects), 
        (SELECT COUNT(*) FROM payments);

END $$;