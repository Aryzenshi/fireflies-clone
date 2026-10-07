import { test, expect } from "@playwright/test";

test.describe("Dark Mode", () => {
  test("persists theme preference across navigation and reload", async ({ page }) => {
    // 1. Open the application (start at Settings to find the toggle)
    await page.goto("/settings");

    // Default theme should be light (or system, but our default is light)
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // 2. Switch to dark mode
    const darkToggle = page.getByRole("button", { name: /^Dark$/ });
    await expect(darkToggle).toBeVisible();
    await darkToggle.click();

    // 3. Verify the dark theme is active
    await expect(page.locator("html")).toHaveClass(/dark/);
    
    // Check local storage via evaluation
    const storedTheme = await page.evaluate(() => localStorage.getItem("theme") || localStorage.getItem("app-theme"));
    expect(storedTheme).toBe("dark");

    // 4. Navigate to another route
    await page.getByRole("button", { name: "Back to meetings" }).click();
    await expect(page.getByRole("heading", { name: "Meetings" })).toBeVisible();

    // 5. Verify dark mode remains active
    await expect(page.locator("html")).toHaveClass(/dark/);

    // 6. Reload the page
    await page.reload();
    await expect(page.getByRole("heading", { name: "Meetings" })).toBeVisible();

    // 7. Verify the preference persists
    await expect(page.locator("html")).toHaveClass(/dark/);

    // 8. Switch back to light mode
    await page.goto("/settings");
    const lightToggle = page.getByRole("button", { name: /^Light$/ });
    await expect(lightToggle).toBeVisible();
    await lightToggle.click();

    // 9. Verify light mode is restored
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
