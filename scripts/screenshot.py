import os
from playwright.sync_api import sync_playwright

url = os.environ.get("SCREENSHOT_URL", "http://localhost:4000")
output = os.environ.get("SCREENSHOT_OUTPUT", "screenshot.png")
width = int(os.environ.get("SCREENSHOT_WIDTH", "1280"))
height = int(os.environ.get("SCREENSHOT_HEIGHT", "600"))

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    page.goto(url, wait_until="networkidle")
    page.screenshot(path=output, full_page=False)
    browser.close()
    print(f"Saved screenshot to {output}")
