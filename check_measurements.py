from playwright.sync_api import sync_playwright

URL = 'http://localhost:3001'
EMAIL = 'admin@demo.com'
PASSWORD = 'Admin12345'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    logs = []
    page.on('console', lambda msg: logs.append(f'{msg.type}: {msg.text}'))
    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(500)

    if page.locator('text=Войти').count() > 0:
        page.locator('text=Войти').first.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(500)

    print('After login click URL:', page.url)
    print('Inputs:', page.locator('input').count())
    print('Buttons:', [page.locator('button').nth(i).inner_text() for i in range(min(page.locator('button').count(), 10))])

    inputs = page.locator('input')
    if inputs.count() >= 2:
        inputs.nth(0).fill(EMAIL)
        inputs.nth(1).fill(PASSWORD)
        page.locator('button').filter(has_text='Войти').first.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)

    print('After submit URL:', page.url)
    print('After submit body:', page.locator('body').inner_text()[:500].replace('\n',' | '))

    page.goto(URL + '/#/measurements', wait_until='networkidle')
    page.wait_for_timeout(2500)
    body = page.locator('body').inner_text()
    screenshot = 'f:/Code/build-app/measurements-check-auth.png'
    page.screenshot(path=screenshot, full_page=True)

    print('Measurements URL:', page.url)
    print('HAS_INIT_TEXT:', 'Инициализация модуля замеров' in body)
    print('HAS_NO_PROJECTS_TEXT:', 'Нет доступных проектов' in body)
    print('HAS_MEASUREMENTS_TITLE:', 'Замеры' in body)
    print('HAS_DRAWING_TAB:', 'Чертеж' in body)
    print('HAS_ROOM_TEXT:', 'Помещение' in body)
    print('BODY_SNIPPET:', body[:1500].replace('\n', ' | '))
    print('SCREENSHOT:', screenshot)
    print('CONSOLE_LOGS:')
    for log in logs[-50:]:
        print(log)
    browser.close()
