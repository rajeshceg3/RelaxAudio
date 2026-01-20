from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        page = browser.new_page(viewport={"width": 375, "height": 667})

        try:
            print("Navigating...")
            page.goto("http://localhost:3001")

            # Wait for player
            print("Waiting for player...")
            player = page.locator("soundscape-player")
            expect(player).to_be_visible()

            # Allow audio config to load
            page.wait_for_timeout(1000)

            # 1. Verify Volume Tooltip
            print("Verifying Tooltip...")
            # We target the volume slider.
            # Note: Playwright pierces open shadow roots by default with CSS selectors.
            # But volume-slider is inside soundscape-player shadow, and tooltip inside volume-slider shadow.
            # Nested shadow roots can be tricky.

            # Let's try direct selector path
            slider = page.locator("volume-slider")
            slider.scroll_into_view_if_needed()
            slider.hover()

            # Tooltip check
            # We might need to go step by step if deep piercing fails
            tooltip = slider.locator("#tooltip")
            # If explicit access needed:
            # tooltip = page.evaluate_handle('document.querySelector("soundscape-player").shadowRoot.querySelector("volume-slider").shadowRoot.querySelector("#tooltip")')

            # Try playwright locator first
            expect(tooltip).to_have_text("50%")
            print("Tooltip verified.")

            # 2. Verify Help Modal & Backdrop Click
            print("Verifying Modal...")
            help_btn = page.locator("#help-button")
            help_btn.click()

            modal = page.locator("#help-modal")
            expect(modal).to_be_visible()

            # Click backdrop (top left)
            print("Clicking backdrop...")
            # We click coordinates relative to the element box
            modal.click(position={"x": 10, "y": 10})

            # Should be hidden
            expect(modal).not_to_be_visible()
            print("Modal backdrop verify success.")

            # Take final screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/verification.png")
            print("Verification successful!")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
