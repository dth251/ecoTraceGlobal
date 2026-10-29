import { expect, test } from "@playwright/test";

test("redirects unauthenticated user from documents to login", async ({ page }) => {
  await page.goto("/documents");
  await expect(page).toHaveURL(/\/login/);
});
