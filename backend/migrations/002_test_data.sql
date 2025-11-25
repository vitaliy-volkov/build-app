-- Тестовые данные для Строительная система управления
-- Вставляем только данные, которые нужны для демонстрации и тестирования

-- Вставляем тестовую компанию
INSERT INTO companies (id, name, legal_name, inn, address, email, phone, website) 
VALUES (
    uuid_generate_v4(),
    'ООО "Строй-Мастер"',
    'Общество с ограниченной ответственностью "Строй-Мастер"',
    '1234567890',
    'г. Москва, ул. Строительная, д. 15, офис 101',
    'info@stroy-master.ru',
    '+7 (495) 123-45-67',
    'https://stroy-master.ru'
);

-- Получаем ID созданной компании
DO $$
DECLARE
    company_uuid UUID;
    admin_user_uuid UUID;
    manager_user_uuid UUID;
    client_counterparty_uuid UUID;
    contractor_counterparty_uuid UUID;
    project_uuid UUID;
BEGIN
    -- Получаем UUID компании
    SELECT id INTO company_uuid FROM companies WHERE inn = '1234567890' LIMIT 1;

    -- Создаем тестовых пользователей
    INSERT INTO users (id, email, password_hash, name, role, phone) 
    VALUES 
        (
            uuid_generate_v4(),
            'admin@stroy-master.ru',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8jJLx1X4uK', -- password: admin123
            'Администратор Системы',
            'admin',
            '+7 (495) 111-11-11'
        ),
        (
            uuid_generate_v4(),
            'manager@stroy-master.ru',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8jJLx1X4uK', -- password: manager123
            'Иван Петров',
            'project_manager',
            '+7 (495) 222-22-22'
        );
    
    -- Получаем UUID пользователей
    SELECT id INTO admin_user_uuid FROM users WHERE email = 'admin@stroy-master.ru';
    SELECT id INTO manager_user_uuid FROM users WHERE email = 'manager@stroy-master.ru';

    -- Связываем пользователей с компанией
    INSERT INTO user_companies (user_id, company_id, role, is_primary) 
    VALUES 
        (admin_user_uuid, company_uuid, 'admin', true),
        (manager_user_uuid, company_uuid, 'project_manager', true);

    -- Создаем тестовых контрагентов
    INSERT INTO counterparties (company_id, full_name, type, inn, address, phone, email, contact_person) 
    VALUES 
        (
            company_uuid,
            'ЗАО "ЖилСтрой"',
            'client',
            '9876543210',
            'г. Москва, ул. Жилстрой, д. 25',
            '+7 (495) 333-33-33',
            'client@zhilstroy.ru',
            'Александр Смирнов'
        ),
        (
            company_uuid,
            'ООО "Генподрядчик"',
            'contractor',
            '5555666677',
            'г. Москва, ул. Подрядная, д. 40',
            '+7 (495) 444-44-44',
            'info@genpodryad.ru',
            'Дмитрий Козлов'
        );
    
    -- Получаем UUID контрагентов
    SELECT id INTO client_counterparty_uuid FROM counterparties WHERE inn = '9876543210';
    SELECT id INTO contractor_counterparty_uuid FROM counterparties WHERE inn = '5555666677';

    -- Создаем тестовый проект
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
    
    SELECT id INTO project_uuid FROM projects WHERE contract_number = 'КН-2024-001';

    -- Добавляем пользователей в команду проекта
    INSERT INTO project_teams (project_id, user_id, role)
    VALUES 
        (project_uuid, manager_user_uuid, 'Проектный менеджер'),
        (project_uuid, admin_user_uuid, 'Администратор');

    -- Создаем тестовую смету
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

    -- Создаем категории цен
    INSERT INTO price_categories (company_id, name, code, description) VALUES
        (company_uuid, 'Земляные работы', 'EARTH', 'Работы по разработке грунта'),
        (company_uuid, 'Бетонные работы', 'CONCRETE', 'Работы по устройству бетонных конструкций'),
        (company_uuid, 'Кирпичная кладка', 'BRICK', 'Работы по кладке кирпича'),
        (company_uuid, 'Кровельные работы', 'ROOF', 'Работы по устройству кровли'),
        (company_uuid, 'Отделочные работы', 'FINISH', 'Финишные отделочные работы');

    -- Создаем позиции прайс-листа
    INSERT INTO price_items (category_id, name, unit, cost_price, markup) 
    SELECT 
        pc.id,
        item.name,
        item.unit,
        item.cost_price,
        item.markup
    FROM price_categories pc
    CROSS JOIN (
        VALUES 
            ('Разработка грунта вручную', 'м3', 800.00, 25),
            ('Разработка грунта механизированная', 'м3', 400.00, 25),
            ('Засыпка и уплотнение', 'м3', 300.00, 25)
    ) AS item(name, unit, cost_price, markup)
    WHERE pc.code = 'EARTH'

    UNION ALL

    SELECT 
        pc.id,
        item.name,
        item.unit,
        item.cost_price,
        item.markup
    FROM price_categories pc
    CROSS JOIN (
        VALUES 
            ('Устройство бетонной подготовки', 'м2', 1200.00, 30),
            ('Монолитная железобетонная плита', 'м3', 8500.00, 30),
            ('Монолитные стены', 'м3', 9200.00, 30),
            ('Монолитные колонны', 'м3', 9800.00, 30)
    ) AS item(name, unit, cost_price, markup)
    WHERE pc.code = 'CONCRETE'

    UNION ALL

    SELECT 
        pc.id,
        item.name,
        item.unit,
        item.cost_price,
        item.markup
    FROM price_categories pc
    CROSS JOIN (
        VALUES 
            ('Кирпичная кладка наружных стен', 'м2', 2800.00, 35),
            ('Кирпичная кладка внутренних стен', 'м2', 2200.00, 35),
            ('Теплоизоляция стен', 'м2', 600.00, 30),
            ('Штукатурка стен', 'м2', 800.00, 30)
    ) AS item(name, unit, cost_price, markup)
    WHERE pc.code = 'BRICK';

    -- Создаем тестовые платежи
    INSERT INTO payments (
        project_id, amount, payment_date, description, 
        status, created_by, approved_by, approved_at
    ) VALUES 
        (project_uuid, 10000000.00, '2024-02-01', 'Авансовый платеж по договору', 'paid', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 15000000.00, '2024-05-01', 'Промежуточный платеж за выполненные работы', 'paid', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 20000000.00, '2024-08-01', 'Оплата за фундамент и несущие конструкции', 'approved', manager_user_uuid, admin_user_uuid, CURRENT_TIMESTAMP),
        (project_uuid, 5000000.00, '2024-11-01', 'Оплата за кровельные работы', 'pending', manager_user_uuid, NULL, NULL);

    -- Создаем тестовые события проекта
    INSERT INTO project_events (project_id, user_id, type, title, description) VALUES
        (project_uuid, manager_user_uuid, 'milestone', 'Начало строительства', 'Официальная дата начала строительных работ'),
        (project_uuid, manager_user_uuid, 'status_changed', 'Переход к основному этапу', 'Завершена подготовка площадки, начаты основные строительные работы'),
        (project_uuid, admin_user_uuid, 'payment_received', 'Получен авансовый платеж', 'На расчет поступил авансовый платеж в размере 10 млн рублей');

END $$;