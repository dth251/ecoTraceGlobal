import { expect, test } from "@playwright/test";

test("public passport verification route is accessible without login", async ({ page }) => {
  await page.goto("/verify/ET-7KQ2-9XMA");
  await expect(page).toHaveURL(/\/verify\/ET-7KQ2-9XMA/);
});
