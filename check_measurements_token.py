from playwright.sync_api import sync_playwright
import requests

URL = 'http://localhost:3001'
API = 'http://localhost:8080/api/v1'
EMAIL = 'admin@demo.com'
PASSWORD = 'Admin12345'

login = requests.post(f'{API}/auth/login', json={'email': EMAIL, 'password': PASSWORD}).json()
access = login['data']['tokens']['access_token']
refresh = login['data']['tokens'].get('refresh_token', '')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    logs = []
    errors = []
    page.on('console', lambda msg: logs.append(f'{msg.type}: {msg.text}'))
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.goto(URL, wait_until='networkidle')
    page.evaluate("""([access, refresh]) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }""", [access, refresh])

    page.goto(URL + '/#/measurements', wait_until='networkidle')
    page.wait_for_timeout(3000)
    body = page.locator('body').inner_text()
    screenshot = 'f:/Code/build-app/measurements-check-token.png'
    page.screenshot(path=screenshot, full_page=True)

    print('Measurements URL:', page.url)
    print('HAS_INIT_TEXT:', 'Инициализация модуля замеров' in body)
    print('HAS_NO_PROJECTS_TEXT:', 'Нет доступных проектов' in body)
    print('HAS_MEASUREMENTS_TITLE:', 'Замеры' in body)
    print('HAS_DRAWING_TAB:', 'Чертеж' in body)
    print('HAS_ROOM_TEXT:', 'Помещение' in body)
    print('BODY_SNIPPET:', body[:2000].replace('\n', ' | '))
    print('SCREENSHOT:', screenshot)
    print('PAGE_ERRORS:', errors)
    print('CONSOLE_LOGS:')
    for log in logs[-80:]:
        print(log)
    browser.close()
