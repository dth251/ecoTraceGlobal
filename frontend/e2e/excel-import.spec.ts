import { expect, test } from "@playwright/test";

test("redirects unauthenticated user from imports to login", async ({ page }) => {
  await page.goto("/imports");
  await expect(page).toHaveURL(/\/login/);
});
