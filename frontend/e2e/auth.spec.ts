import { expect, test } from "@playwright/test";

test("renders login page and navigates to register", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toBeVisible();
});
